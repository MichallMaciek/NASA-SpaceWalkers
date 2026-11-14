"""Radar products for SARnik (v2) on the app's 120 m grid, plus the checks that tell whether they mean anything.

Inputs (fetch_sar.py): sar_s1_2026.npz, power_rain_2026.json, egms.npz, alos.npz; model layers from model_urban.py;
building decisions of the Poznań architecture office (WUIA, GEOPOZ layer decyzje:v_decyzje_wuia_group_mapa_sql,
June-November 2026, prepared by the team: data/raw/wuia_decyzje.geojson).

Products (grey-level PNGs in web/data/land/, decoded in the browser; formulas in sar.json "decode"):
  sar_vv_med / sar_vh_med   median Sentinel-1 backscatter of all 2026 passes (dB)
  sar_change                VV change, median of the last 6 passes minus median of the first 6 (dB)
  sar_water                 share of passes in which the cell is as dark as open water (VV < -17 dB)
  sar_wet                   how strongly VV follows surface soil wetness from pass to pass (Spearman r)
  sar_egms                  EGMS vertical ground motion 2016-2020 (mm/year)
  alos_hh_<y>, alos_hv_<y>  ALOS-2 L-band yearly mosaics 2015-2021 (dB)
  sar_series                VV and VH of every pass on a 480 m grid, one sheet, for the time-series chart
"""
import json
import math

import numpy as np
import rasterio.features
from affine import Affine
from PIL import Image
from rasterio.warp import transform_geom
from scipy import stats

from common import RAW, WEB_DATA

OUT = WEB_DATA / "land"
WATER_DB = -17.0
EDGE = 6          # passes at each end of the season for the change map
BLOCK = 4         # 4 x 120 m = 480 m blocks for the time-series sheet


def png(name, arr):
    Image.fromarray(np.clip(np.nan_to_num(arr, nan=0), 0, 255).round().astype(np.uint8), mode="L").save(OUT / f"{name}.png", optimize=True)


def enc_db(db):  # -30..12.5 dB in 1/6 dB steps; 0 = no data
    return np.where(np.isfinite(db), np.clip((db + 30) * 6, 1, 255), 0)


def main():
    land = json.load(open(OUT / "land.json"))
    W, H = land["width"], land["height"]
    tr = Affine(*land["transform3857"][:6])
    study = np.array(Image.open(OUT / "study.png")) > 0
    cell_ha = land["cell_m_ground"] ** 2 / 1e4

    # ---------- Sentinel-1 series ----------
    s1 = np.load(RAW / "sar_s1_2026.npz")
    dates = [str(d) for d in s1["dates"]]
    platforms = json.loads(str(s1["platforms"]))
    with np.errstate(all="ignore"):
        vv, vh = 10 * np.log10(s1["vv"]), 10 * np.log10(s1["vh"])
    good = [k for k in range(len(dates)) if np.isfinite(vv[k][study]).mean() > 0.9]
    dates = [dates[k] for k in good]
    vv, vh = vv[good], vh[good]
    n = len(dates)
    print("S1 passes used", n, dates[0], "->", dates[-1])

    with np.errstate(all="ignore"):
        vv_med, vh_med = np.nanmedian(vv, 0), np.nanmedian(vh, 0)
        season = np.nanmedian(vv[-EDGE:], 0) - np.nanmedian(vv[:EDGE], 0)   # June -> November, farming included
        water = np.nanmean(vv < WATER_DB, 0)
    # Year-on-year change: autumn 2026 vs autumn 2025, same orbit. Harvest, ploughing and autumn rain happen in both
    # years, so they cancel; new walls, cleared land and new hard surfaces stay. Falls back to the season change.
    prev_path = RAW / "sar_s1_2025autumn.npz"
    if prev_path.exists():
        pv = np.load(prev_path)
        with np.errstate(all="ignore"):
            vv_prev, vh_prev = 10 * np.log10(pv["vv"]), 10 * np.log10(pv["vh"])
        okp = [k for k in range(len(pv["dates"])) if np.isfinite(vv_prev[k][study]).mean() > 0.9]
        now_k = [k for k, d in enumerate(dates) if d >= "2026-09-01"]
        prev_dates = [str(pv["dates"][k]) for k in okp]
        with np.errstate(all="ignore"):
            change = np.nanmedian(vv[now_k], 0) - np.nanmedian(vv_prev[okp], 0)
            change_vh = np.nanmedian(vh[now_k], 0) - np.nanmedian(vh_prev[okp], 0)
        # a new wall raises co-pol (VV) much more than cross-pol (VH): double bounce. Ploughing and wet soil raise both.
        dratio = change - change_vh
        change_kind = {"kind": "year-on-year", "now": [dates[k] for k in now_k], "before": prev_dates}
        print("change: year-on-year,", len(now_k), "passes autumn 2026 vs", len(okp), "passes autumn 2025")
    else:
        change, change_kind = season, {"kind": "season", "now": dates[-EDGE:], "before": dates[:EDGE]}
        with np.errstate(all="ignore"):
            dratio = season - (np.nanmedian(vh[-EDGE:], 0) - np.nanmedian(vh[:EDGE], 0))
    WALL_DB = 1.5  # co/cross ratio rise that marks a double-bounce change

    # ---------- weather on the pass days (NASA POWER) ----------
    pw = json.load(open(RAW / "power_rain_2026.json"))
    rain3 = []
    for d in dates:
        days = [np.datetime64(d) - np.timedelta64(k, "D") for k in range(3)]
        rain3.append(round(sum(pw["rain"].get(str(x), 0.0) for x in days), 1))
    wet = [pw["wet"].get(d) for d in dates]
    # soil wetness (GWETTOP) is the physical driver of the dielectric constant; use the passes that have it
    kw = [k for k, w in enumerate(wet) if w is not None]
    wet_ok = len(kw) >= 10
    driver = np.array([wet[k] for k in kw] if wet_ok else rain3, float)
    kw = kw if wet_ok else list(range(n))
    nw = len(kw)
    print("weather driver", "GWETTOP" if wet_ok else "rain3", nw, "passes, range", driver.min(), driver.max())

    # per-cell Spearman correlation of VV with soil wetness, across passes (vectorised on ranks)
    vw = vv[kw]
    fin = np.isfinite(vw).all(0)
    rv = np.argsort(np.argsort(np.where(np.isfinite(vw), vw, 0), axis=0), axis=0).astype(np.float32) + 1  # ranks (no ties in floats)
    rv[:, ~fin] = np.nan
    rd = stats.rankdata(driver)
    rv_c = rv - rv.mean(0)
    rd_c = (rd - rd.mean())[:, None, None]
    with np.errstate(all="ignore"):
        wet_r = (rv_c * rd_c).sum(0) / np.sqrt((rv_c ** 2).sum(0) * (rd_c ** 2).sum())
    # two-sided p < 0.05 for Spearman with nw passes: |r| > r_crit
    t_crit = stats.t.ppf(0.975, nw - 2)
    r_crit = float(t_crit / math.sqrt(nw - 2 + t_crit ** 2))

    # ---------- EGMS and ALOS ----------
    egms = np.load(RAW / "egms.npz")["v"]
    alos = np.load(RAW / "alos.npz")
    alos_years = sorted({int(k.split("_")[1]) for k in alos.files if k.startswith("hv_")})

    # ---------- checks ----------
    checks = {}
    # (1) building decisions (Poznań city only): does radar see more change on plots with a decision for a new building?
    wuia = json.load(open(RAW / "wuia_decyzje.geojson", encoding="utf-8"))
    def mask(pred):
        shapes = [(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1) for f in wuia["features"] if pred(f["properties"])]
        return rasterio.features.rasterize(shapes, out_shape=(H, W), transform=tr, all_touched=False).astype(bool) if shapes else np.zeros((H, W), bool)
    new_dec = mask(lambda p: p.get("kategoria") == "nowa budowa" and p.get("status") == "decyzja" and str(p.get("DATA", "")) <= "2026-08-31")
    any_case = mask(lambda p: True)
    city = np.zeros((H, W), bool)
    areas = json.load(open(WEB_DATA / "areas.geojson", encoding="utf-8"))
    for f in areas["features"]:
        if f["properties"].get("role") == "city":
            city |= rasterio.features.rasterize([(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1)], out_shape=(H, W), transform=tr).astype(bool)
    ok = np.isfinite(change) & np.isfinite(dratio)
    up = (change >= 3.0) & ok
    walls = up & (dratio >= WALL_DB)

    def compare(a, b, hit=None):
        """share of hit cells in a vs b, ratio and one-sided binomial p (is a higher than b's rate?)"""
        hit = up if hit is None else hit
        ka, na, pb = int(hit[a].sum()), int(a.sum()), float(hit[b].mean())
        p = float(stats.binomtest(ka, na, pb, alternative="greater").pvalue) if na and 0 < pb < 1 else None
        return {"cells": na, "hits": ka, "share_a": round(ka / na, 4) if na else None, "share_b": round(pb, 4),
                "ratio": round((ka / na) / max(pb, 1e-9), 2) if na else None, "p": round(p, 4) if p is not None else None}

    ref = city & ok & ~any_case
    sel = new_dec & ok
    checks["wuia"] = {"what": f"share of 120 m cells whose VV rose by >= 3 dB ({change_kind['kind']}): plots with a 'new building' "
                              "decision dated Jun-Aug 2026 vs. the rest of Poznań without any case", **compare(sel, ref)}
    checks["wuia"]["share_decision"], checks["wuia"]["share_rest"] = checks["wuia"]["share_a"], checks["wuia"]["share_b"]
    # (2) model meets radar: open land the model ranked highest for 2025-2030 vs. other open land
    def dec(name):
        return np.array(Image.open(OUT / f"{name}.png")).astype(float)
    thr = round(land["threshold"] * 255)
    p30 = (dec("prob_2030") / 255) ** 2
    open25 = dec("built_2025") < thr
    cand = open25 & study & ok
    top = cand & (p30 >= np.quantile(p30[cand], 0.95))
    rest = cand & ~top
    checks["model"] = {"what": f"share of open cells (not built in 2025) whose VV rose by >= 3 dB ({change_kind['kind']}): "
                               "the 5% the model ranks highest vs. the other 95%", **compare(top, rest)}
    checks["model"]["share_top5"], checks["model"]["share_rest"] = checks["model"]["share_a"], checks["model"]["share_b"]
    # the same two checks for the stricter "new walls" signal (VV up >= 3 dB and VV/VH up >= 1.5 dB); both reported
    checks["wuia_walls"] = {"what": "as wuia, for new walls (double bounce)", **compare(sel, ref, walls)}
    checks["model_walls"] = {"what": "as model, for new walls (double bounce)", **compare(top, rest, walls)}
    # (3) wet ground, on open land only: C-band cannot see soil under buildings, forest or water
    fl = json.load(open(WEB_DATA / "podtopienia.geojson", encoding="utf-8"))
    flood = rasterio.features.rasterize([(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1) for f in fl["features"]],
                                        out_shape=(H, W), transform=tr).astype(bool)
    open_land = study & (dec("built_2020") < thr) & (dec("forest2000_frac") < 0.3 * 255) & (np.nan_to_num(water) < 0.2)
    wet_r = np.where(open_land, wet_r, np.nan)
    okr = np.isfinite(wet_r)
    sig = wet_r > r_crit
    kf, nf = int((sig & okr & flood).sum()), int((okr & flood).sum())
    po = float(sig[okr & ~flood].mean())
    checks["wet"] = {
        "what": "open land only: Spearman r between VV and surface soil wetness across passes; significant if r > r_crit",
        "driver": "NASA POWER GWETTOP" if wet_ok else "NASA POWER rain, 3 days",
        "r_crit": round(r_crit, 3), "open_share_of_study": round(float(okr.sum() / study.sum()), 3),
        "median_r_open": round(float(np.median(wet_r[okr])), 3),
        "share_sig_study": round(float(sig[okr].mean()), 4),
        "share_sig_flood": round(kf / nf, 4) if nf else None, "share_sig_outside": round(po, 4),
        "p_flood_higher": round(float(stats.binomtest(kf, nf, po, alternative="greater").pvalue), 4) if nf else None,
    }
    checks["change_method"] = change_kind
    with np.errstate(all="ignore"):
        checks["season_change_open_up3db_share"] = round(float(np.nanmean(season[cand] >= 3)), 4)
    eg = egms[study & np.isfinite(egms)]
    checks["egms"] = {"cells": int(eg.size), "share_of_study": round(float(eg.size / study.sum()), 3),
                      "median": float(np.median(eg)), "p5": float(np.percentile(eg, 5)), "min": float(eg.min()),
                      "cells_le_minus5": int((eg <= -5).sum())}
    # sanity: radar brightness of built vs. open land (double bounce)
    b20 = dec("built_2020") >= thr
    checks["sanity"] = {"vv_med_built_db": round(float(np.nanmedian(vv_med[b20 & study])), 2),
                        "vv_med_open_db": round(float(np.nanmedian(vv_med[~b20 & study])), 2),
                        "vh_med_forest_db": round(float(np.nanmedian(vh_med[(dec("forest2000_frac") > 200) & study])), 2)}
    for k, v in checks.items():
        print(k, v)

    # ---------- PNG layers ----------
    png("sar_vv_med", enc_db(vv_med))
    png("sar_vh_med", enc_db(vh_med))
    png("sar_change", np.where(np.isfinite(change), np.clip((change + 10) * 12.75, 1, 255), 0))
    png("sar_dratio", np.where(np.isfinite(dratio), np.clip((dratio + 10) * 12.75, 1, 255), 0))
    png("sar_water", np.where(np.isfinite(water), water * 254 + 1, 0))
    png("sar_wet", np.where(np.isfinite(wet_r), (wet_r + 1) * 127 + 1, 0))
    png("sar_egms", np.where(np.isfinite(egms), np.clip(egms + 100, 1, 255), 0))
    for y in alos_years:
        png(f"alos_hh_{y}", enc_db(alos[f"hh_{y}"]))
        png(f"alos_hv_{y}", enc_db(alos[f"hv_{y}"]))
    # time-series sheet: rows of blocks per pass; VV on the left half, VH on the right half (power-averaged)
    bw, bh = math.ceil(W / BLOCK), math.ceil(H / BLOCK)
    sheet = np.zeros((n * bh, 2 * bw), np.float32)
    lin = {"vv": s1["vv"][good], "vh": s1["vh"][good]}
    pad = lambda a: np.pad(a, ((0, bh * BLOCK - H), (0, bw * BLOCK - W)), constant_values=np.nan)
    for k in range(n):
        for j, pol in enumerate(("vv", "vh")):
            b = pad(lin[pol][k]).reshape(bh, BLOCK, bw, BLOCK)
            with np.errstate(all="ignore"):
                db = 10 * np.log10(np.nanmean(b, axis=(1, 3)))
            sheet[k * bh:(k + 1) * bh, j * bw:(j + 1) * bw] = enc_db(db)
    png("sar_series", sheet)

    # AOI-wide series for the start screen
    with np.errstate(all="ignore"):
        aoi_vv = [round(float(10 * np.log10(np.nanmean(s1["vv"][good][k][study]))), 2) for k in range(n)]
        aoi_vh = [round(float(10 * np.log10(np.nanmean(s1["vh"][good][k][study]))), 2) for k in range(n)]
    up_ha = float(up[study & ok].sum() * cell_ha)
    walls_ha = float(walls[study].sum() * cell_ha)
    meta = {
        "s1": {"mission": "Copernicus Sentinel-1 (C-band, 5.4 GHz, 5.6 cm)", "product": "RTC gamma0, Planetary Computer",
               "orbit": int(s1["orbit"]), "direction": "ascending", "dates": dates, "platforms": {d: platforms.get(d) for d in dates},
               "edge": EDGE, "water_db": WATER_DB, "change": change_kind, "aoi_vv_db": aoi_vv, "aoi_vh_db": aoi_vh,
               "rain3_mm": rain3, "soil_wetness": wet, "wet_passes": nw, "r_crit": round(r_crit, 3),
               "up3db_ha": round(up_ha), "walls_ha": round(walls_ha), "wall_db": WALL_DB, "series": {"block": BLOCK, "bw": bw, "bh": bh, "n": n}},
        "egms": {"source": "EGMS 2016-2020 vertical (Copernicus), PIG-PIB geozagrozenia/egms_2016_2020_pion", "unit": "mm/year"},
        "alos": {"mission": "ALOS-2 PALSAR-2 (L-band, 1.27 GHz, 23.6 cm), JAXA yearly mosaics", "years": alos_years},
        "decode": {"sar_db": "v/6 - 30 = dB (0 = no data)", "sar_change": "v/12.75 - 10 = dB change (0 = no data)", "sar_dratio": "v/12.75 - 10 = change of VV/VH in dB (0 = no data)",
                   "sar_water": "(v-1)/254 = share of passes as dark as water", "sar_wet": "(v-1)/127 - 1 = Spearman r",
                   "sar_egms": "v - 100 = mm/year (0 = no data)",
                   "sar_series": "rows: pass k occupies rows k*bh..; columns 0..bw-1 VV, bw..2bw-1 VH; v/6 - 30 = dB"},
        "checks": checks,
    }
    json.dump(meta, open(OUT / "sar.json", "w"), ensure_ascii=False, separators=(",", ":"))
    print("wrote sar.json and", 7 + 2 * len(alos_years), "PNG layers")


if __name__ == "__main__":
    main()
