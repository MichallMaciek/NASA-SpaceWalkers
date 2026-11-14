"""NISAR and OPERA products downloaded by hand (ASF Vertex) and unpacked to data/raw/zips/<name>/, turned into map layers.

The team cut each product to the study area and saved it as GeoTIFF (band names in Polish) in four zip files:
  nisar_gcov/        NISAR L2 GCOV, gamma0 in linear power, bands HHHH and HVHV, 20 m (tracks 057, 158, 008, 080)
  nisar_gunw/        NISAR L2 GUNW, track 158: coherence 20 m; unwrapped phase, coherence and ionosphere 80 m
  nisar_sme2/        NISAR L3 SME2, track 158: soil moisture, its uncertainty and water fraction, 200 m
  opera_dist_alert/  OPERA L3 DIST-ALERT-S1 (Sentinel-1), status and first date of a vegetation disturbance, 30 m

Run with an isolated interpreter, from anywhere:   .venv/bin/python -I pipeline/build_from_zips.py [nisar] [coh] [sme] [dist]
(no argument = all). Unpack first:  mkdir -p data/raw/zips/<name> && unzip -j <name>.zip -d data/raw/zips/<name>

Outputs (web/data/land/, the same grey-level encodings as build_sar.py; written down in sar.json "zips"):
  hr_nisar_hh_med, hr_nisar_hv_med   sharp NISAR picture of 2026 (track 057, provisional, 9 dual-pol passes),
                                    window of build_hires.py; added to hires.json, display only
  nisar_coh                         median 12-day coherence of track 158 (7 pairs, 25 Jun - 11 Oct 2026): v/250
  nisar_sm_0625, nisar_sm_0824      NISAR soil moisture on 25 Jun and 24 Aug, the pair of the app's NISAR change map, on the
                                    120 m grid: v/500 m3/m3; medians of all 9 dates in sar.json (SME2 is not calibrated yet)
  dist_forest                       OPERA disturbance on land that was forest in 2000 (Hansen, >= 50% cover):
                                    200 = high confidence, 100 = low confidence
web/data must stay under 40 MB (tests/data_contract.py), so the new layers are 120 m only and grey levels are rounded.
"""
import glob
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # -I drops the script folder from the path

import numpy as np
import rasterio
from affine import Affine
from PIL import Image
from rasterio.enums import Resampling
from rasterio.warp import reproject

from common import RAW, WEB_DATA

OUT = WEB_DATA / "land"
ZIPS = RAW / "zips"
land = json.load(open(OUT / "land.json"))
GW, GH = land["width"], land["height"]
t = land["transform3857"]
GRID = Affine(t[0], 0.0, t[2], 0.0, t[4], t[5])
STUDY = np.array(Image.open(OUT / "study.png")) > 0


def png(name, arr):
    a = np.clip(np.nan_to_num(arr, nan=0), 0, 255).round().astype(np.uint8)
    Image.fromarray(a, mode="L").save(OUT / f"{name}.png", optimize=True)
    print(f"  wrote {name}.png {a.shape[1]}x{a.shape[0]} {(OUT / f'{name}.png').stat().st_size / 1e6:.2f} MB", flush=True)


def enc_db(db):  # -30..12.5 dB in 1/6 dB steps; 0 = no data
    return np.where(np.isfinite(db), np.clip((db + 30) * 6, 1, 255), 0)


def quant(a, q=4):
    return np.where(a > 0, np.clip(np.round(a / q) * q, q, 255 - (255 % q)), 0)


def warp(path, band, transform, w, h, resampling=Resampling.average):
    with rasterio.open(path) as src:
        a = src.read(band).astype(np.float32)
        nod = src.nodata
        if nod is not None and np.isfinite(nod):
            a[a == nod] = np.nan
        dst = np.full((h, w), np.nan, np.float32)
        reproject(a, dst, src_transform=src.transform, src_crs=src.crs, src_nodata=np.nan,
                  dst_transform=transform, dst_crs="EPSG:3857", dst_nodata=np.nan, resampling=resampling)
    return dst


def parse(name):
    """track, direction, polarisation mode, start date, product version (P05023 provisional, P05036 validated)."""
    # NISAR_L2_PR_GCOV_<cycle>_<track>_<dir>_<frame>_<mode>_<pol>_<x>_<start>_<end>_<Pversion>_N_F_J_<counter>_...
    f = os.path.basename(name).split("_")
    return {"track": f[5], "dir": f[6], "pol": f[9], "date": f[11][:8],
            "version": next((x for x in f if re.fullmatch(r"P\d{5}", x)), ""),
            "counter": (re.search(r"_J_(\d{3})_", os.path.basename(name)) or [None, "000"])[1]}


def meta_update(key, value, decode=None):
    p = OUT / "sar.json"
    d = json.load(open(p))
    d.setdefault("zips", {})[key] = value
    if decode:
        d.setdefault("decode", {}).update(decode)
    json.dump(d, open(p, "w"), ensure_ascii=False, separators=(",", ":"))


# ---------------------------------------------------------------- 1. sharp NISAR picture (GCOV, track 057)
def do_nisar():
    import build_hires as bh
    files = sorted(glob.glob(str(ZIPS / "nisar_gcov" / "*gamma0_20m.tif")))
    use = [f for f in files if (lambda m: m["track"] == "057" and m["pol"] == "DHDH" and m["version"] == "P05023")(parse(f))]
    with rasterio.open(use[0]) as s:
        assert s.count == 2, s.descriptions
    dates = sorted({parse(f)["date"] for f in use})
    print("NISAR GCOV track 057, provisional, dual-pol:", len(use), "files", dates, flush=True)
    hh = np.stack([warp(f, 1, bh.TR, bh.W, bh.H) for f in use])
    hv = np.stack([warp(f, 2, bh.TR, bh.W, bh.H) for f in use])
    with np.errstate(all="ignore"):
        dh, dv = 10 * np.log10(np.nanmedian(hh, 0)), 10 * np.log10(np.nanmedian(hv, 0))
    # the 120 m picture of the app is track 158 (9 passes); match the sharp one to it inside the window, so the colours
    # (stretched for track 158) agree and there is no seam at the edge of the window: one offset per polarisation
    c0, r0, cw, ch = bh.WINDOW
    S = bh.SCALE
    off = {}
    for pol, d in (("hh", dh), ("hv", dv)):
        ref = np.array(Image.open(OUT / f"nisar_{pol}_med.png"))[r0:r0 + ch, c0:c0 + cw].astype(float)
        ref = np.where(ref > 0, ref / 6 - 30, np.nan)
        with np.errstate(all="ignore"):
            lin = 10 ** (d / 10)
            coarse = 10 * np.log10(np.nanmean(lin.reshape(ch, S, cw, S), axis=(1, 3)))
        diff = coarse - ref
        ok = np.isfinite(diff) & STUDY[r0:r0 + ch, c0:c0 + cw]
        off[pol] = round(float(np.median(diff[ok])), 2)
        print(f"  {pol}: track 057 minus track 158 on the 120 m grid: median {off[pol]:+.2f} dB, "
              f"spread (IQR) {np.subtract(*np.percentile(diff[ok], [75, 25])):.2f} dB, {ok.sum()} cells", flush=True)
    study = bh.study_hr()
    png("hr_nisar_hh_med", quant(np.where(study, enc_db(dh - off["hh"]), 0)))
    png("hr_nisar_hv_med", quant(np.where(study, enc_db(dv - off["hv"]), 0)))
    mp = OUT / "hires.json"
    hi = json.load(open(mp))
    hi["layers"] = sorted(set(hi["layers"]) | {"nisar_hh_med", "nisar_hv_med"})
    hi["nisar"] = {"source": "NISAR L2 GCOV gamma0, track 057 ascending, provisional (P05023), dual-pol, median of the passes",
                   "dates": dates, "offset_db_to_track158": off,
                   "why": "the 120 m layer is track 158; the sharp one is shifted by this offset so both use the same colours"}
    json.dump(hi, open(mp, "w"), indent=1)


# ---------------------------------------------------------------- 2. coherence (GUNW, track 158)
def do_coh():
    import build_hires as bh
    files = sorted(glob.glob(str(ZIPS / "nisar_gunw" / "*coherence_20m.tif")))
    pairs = [re.findall(r"_(\d{8})T\d{6}", os.path.basename(f)) for f in files]
    pairs = [(p[0], p[2]) for p in pairs]
    print("GUNW coherence pairs:", pairs, flush=True)
    coarse = np.stack([warp(f, 1, GRID, GW, GH) for f in files])
    with np.errstate(all="ignore"):
        c120 = np.nanmedian(coarse, 0)
    enc = lambda c: np.where(np.isfinite(c), np.clip(c * 250, 1, 250), 0)   # v / 250 = coherence 0..1
    png("nisar_coh", quant(np.where(STUDY, enc(c120), 0), 2))
    v = c120[STUDY & np.isfinite(c120)]
    meta_update("coh", {"source": "NISAR L2 GUNW coherence, track 158 ascending, provisional (P05023), 12-day pairs",
                        "pairs": [f"{a}-{b}" for a, b in pairs], "decode": "v/250", "stat": "median over the pairs",
                        "study_p10_p50_p90": [round(float(x), 3) for x in np.percentile(v, [10, 50, 90])]},
                {"nisar_coh": "v/250 = median 12-day NISAR coherence 0..1 (0 = no data)"})


# ---------------------------------------------------------------- 3. soil moisture (SME2, track 158)
def do_sme():
    files = sorted(glob.glob(str(ZIPS / "nisar_sme2" / "*soilmoisture_200m.tif")))
    by_date = {}
    for f in files:   # one file per date: the latest product counter (…_002 over …_001)
        d, ctr = parse(f)["date"], parse(f)["counter"]
        if d not in by_date or ctr > by_date[d][0]:
            by_date[d] = (ctr, f)
    dates = sorted(by_date)
    print("SME2 dates:", dates, flush=True)
    series, dry_d, wet_d = [], "20260625", "20260824"   # the pair of the app's NISAR change map (named "dry" and "wet" by the team)
    for d in dates:
        f = by_date[d][1]
        sm = warp(f, 1, GRID, GW, GH, Resampling.bilinear)
        water = warp(f, 3, GRID, GW, GH, Resampling.bilinear)
        sm[(water > 0.5) | ~STUDY] = np.nan
        v = sm[np.isfinite(sm)]
        series.append(round(float(np.median(v)), 3))
        if d in (dry_d, wet_d):   # v / 500 = m3/m3 in 0.004 steps (display: two grey levels per step)
            png(f"nisar_sm_{d[4:]}", quant(np.where(np.isfinite(sm), np.clip(sm * 500, 1, 255), 0), 2))
    meta_update("sme", {"source": "NISAR L3 SME2 soil moisture, track 158 ascending, provisional (P05023), 200 m; "
                                  "the project says it is not fully calibrated yet",
                        "dates": [f"{d[:4]}-{d[4:6]}-{d[6:]}" for d in dates], "decode": "v/500", "unit": "m3/m3",
                        "study_median": series, "maps": {"nisar_sm_0625": "2026-06-25", "nisar_sm_0824": "2026-08-24"}},
                {f"nisar_sm_{d[4:]}": f"v/500 = NISAR soil moisture on {d[:4]}-{d[4:6]}-{d[6:]} in m3/m3 (0 = no data or open water)"
                 for d in (dry_d, wet_d)})


# ---------------------------------------------------------------- 4. OPERA disturbance on forest land
def do_dist():
    """Share of each 120 m cell where OPERA flags a disturbance, on land that was forest in 2000.
    Status codes (dist_s1 constants.DISTLABEL2VAL): 1-3 first / provisional / confirmed low confidence, 4-6 the same
    with high confidence, 7-8 confirmed and finished (low / high). First detections (1, 4) are not used: one pass only."""
    files = sorted(glob.glob(str(ZIPS / "opera_dist_alert" / "*GEN-DIST-STATUS.tif")))
    hi_f = np.zeros((GH, GW), np.float32)
    any_f = np.zeros((GH, GW), np.float32)
    for f in files:   # four MGRS tiles that overlap: the largest share per cell wins
        with rasterio.open(f) as src:
            st = src.read(1)
            valid = st != 255
            for target, codes in ((hi_f, [5, 6, 8]), (any_f, [2, 3, 5, 6, 7, 8])):
                m = np.where(valid, np.isin(st, codes).astype(np.float32), np.nan)
                dst = np.full((GH, GW), np.nan, np.float32)
                reproject(m, dst, src_transform=src.transform, src_crs=src.crs, src_nodata=np.nan,
                          dst_transform=GRID, dst_crs="EPSG:3857", dst_nodata=np.nan, resampling=Resampling.average)
                np.fmax(target, np.nan_to_num(dst, nan=0), out=target)
    tc = np.array(Image.open(OUT / "treecover2000.png")).astype(float)   # v/255 = tree cover in 2000
    forest = (tc >= 128) & STUDY
    SHARE = 0.25   # at least a quarter of the cell (about 1300 m2) flagged
    out = np.where(forest & (hi_f >= SHARE), 200, np.where(forest & (any_f >= SHARE), 100, 0))
    png("dist_forest", out)
    first = []
    for p in sorted(glob.glob(str(ZIPS / "opera_dist_alert" / "*_GEN-DIST-DATE.tif"))):
        with rasterio.open(p) as src:
            a = src.read(1).astype(np.int32)
            if (a > 0).any():
                first.append(int(a[a > 0].min()))
    import datetime as dt
    day0 = dt.date(2020, 12, 31)
    meta_update("dist", {"source": "OPERA L3 DIST-ALERT-S1 v1.0 (Sentinel-1, NASA/JPL), last acquisition 2026-02-28, 30 m",
                         "window": [str(day0 + dt.timedelta(days=min(first))), "2026-02-28"],
                         "decode": "200 = high confidence, 100 = low confidence, at least 25% of the cell; forest land (2000) only",
                         "forest_cells": int(forest.sum()), "flagged_hi": int((out == 200).sum()), "flagged_lo": int((out == 100).sum())},
                {"dist_forest": "200 = OPERA disturbance (Sentinel-1) with high confidence, 100 = low confidence, forest land only (0 = none)"})


if __name__ == "__main__":
    what = set(sys.argv[1:]) or {"nisar", "coh", "sme", "dist"}
    for k, fn in (("nisar", do_nisar), ("coh", do_coh), ("sme", do_sme), ("dist", do_dist)):
        if k in what:
            fn()
