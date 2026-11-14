"""Turn raw downloads into the evidence files the web app reads.

Inputs (from fetch_modis.py, fetch_ground.py, build_areas.py):
  data/raw/modis_lst.npz, data/raw/modis_ndvi.npz, data/raw/power_t2m.json,
  data/raw/imgw_poznan.json, data/raw/gus.json, data/processed/areas.geojson
Outputs:
  web/data/study.json      - per-area series, trend tests, validation, correlations
  web/data/grid_lst.json   - 1 km pixel trends (night/day summer LST) + yearly values
  web/data/grid_ndvi.json  - 250 m pixel trends of summer NDVI

Method summary
  * Summer = June-August. For each year 2000-2025 and each pixel we average all valid
    8-day (LST) or 16-day (NDVI) composites that start in June-August.
    LST needs >= 6 of ~12 composites, NDVI >= 3 of ~6 with pixel reliability 0 or 1.
  * Trend = Theil-Sen slope (reported per decade); significance = Mann-Kendall test,
    two-sided, alpha 0.05. Serial correlation is not corrected (stated in the app).
  * Area value = mean over pixels whose centre falls inside the OSM boundary.
"""
import json
import math
from datetime import date

import numpy as np
import rasterio.features
from affine import Affine
from rasterio.warp import transform_geom

from common import PROCESSED, RAW, WEB_DATA, YEARS
from trend import mann_kendall, pearson, sen_intercept, sen_slope, spearman

YEARS_A = np.array(YEARS, dtype=float)
CENTRE = (16.9335, 52.4083)  # Stary Rynek, Poznan
LAWICA = (16.8264, 52.4167)  # IMGW Poznan-Lawica station
R_SPHERE = 6371007.181


def load_npz(name):
    d = np.load(RAW / f"modis_{name}.npz", allow_pickle=False)
    tr = Affine(*d["transform"][:6])
    return d, tr, str(d["crs"])


def summer_stack(values, dates, valid, min_count):
    """Yearly June-August mean per pixel -> array (years, rows, cols)."""
    months = np.array([int(s[5:7]) for s in dates])
    years = np.array([int(s[:4]) for s in dates])
    out = np.full((len(YEARS),) + values.shape[1:], np.nan)
    for k, y in enumerate(YEARS):
        sel = (years == y) & np.isin(months, (6, 7, 8))
        v = np.where(valid[sel], values[sel], np.nan)
        cnt = np.sum(~np.isnan(v), axis=0)
        with np.errstate(all="ignore"):
            m = np.nanmean(v, axis=0)
        out[k] = np.where(cnt >= min_count, m, np.nan)
    return out


def pixel_trends(stack):
    y = np.moveaxis(stack, 0, -1)  # rows, cols, years
    slope = sen_slope(y, YEARS_A) * 10.0  # per decade
    mk = mann_kendall(y)
    return slope, mk["p"]


def lonlat_to_sinu(lon, lat):
    x = R_SPHERE * math.radians(lon) * math.cos(math.radians(lat))
    return x, R_SPHERE * math.radians(lat)


def pixel_centres_lonlat(tr, shape):
    rows, cols = np.mgrid[0:shape[0], 0:shape[1]]
    xs, ys = tr * (cols + 0.5, rows + 0.5)
    lat = np.degrees(ys / R_SPHERE)
    lon = np.degrees(xs / (R_SPHERE * np.cos(np.radians(lat))))
    return lon, lat


def area_masks(areas, tr, crs, shape):
    masks = {}
    for f in areas["features"]:
        g = transform_geom("EPSG:4326", crs, f["geometry"])
        masks[f["properties"]["name"]] = rasterio.features.rasterize(
            [(g, 1)], out_shape=shape, transform=tr, fill=0, all_touched=False).astype(bool)
    return masks


def area_series(stack, mask):
    with np.errstate(all="ignore"):
        return np.nanmean(stack[:, mask], axis=1)


def test(series, scale=10.0):
    s = np.asarray(series, float)
    sl = float(sen_slope(s, YEARS_A[: len(s)]) * scale)
    mk = mann_kendall(s)
    return {"slope_per_decade": round(sl, 4), "p": round(float(mk["p"]), 4),
            "z": round(float(mk["z"]), 3), "n": int(mk["n"]),
            "significant": bool(mk["p"] < 0.05)}


def test_years(values, years):
    v = np.asarray(values, float)
    t = np.asarray(years, float)
    sl = float(sen_slope(v, t) * 10)
    mk = mann_kendall(v)
    return {"slope_per_decade": round(sl, 4), "p": round(float(mk["p"]), 5), "n": int(mk["n"]),
            "significant": bool(mk["p"] < 0.05), "intercept": round(float(sen_intercept(v, t, sl / 10)), 4)}


def _share(flag, mask, ref):
    m = mask & np.isfinite(ref)
    return float(flag[m].mean() * 100) if m.any() else float("nan")


def r(x, nd=2):
    if x is None or (isinstance(x, float) and not math.isfinite(x)):
        return None
    return round(float(x), nd)


def rlist(a, nd=2):
    return [r(v, nd) for v in np.asarray(a, float).tolist()]


def main():
    areas = json.load(open(PROCESSED / "areas.geojson", encoding="utf-8"))
    gus = json.load(open(RAW / "gus.json", encoding="utf-8"))
    imgw = json.load(open(RAW / "imgw_poznan.json", encoding="utf-8"))
    power = json.load(open(RAW / "power_t2m.json", encoding="utf-8"))

    # ---------- MODIS LST ----------
    d, tr_l, crs = load_npz("lst")
    dates = d["dates"]
    k2c = lambda a: np.where(a > 0, a * 0.02 - 273.15, np.nan)
    night = summer_stack(k2c(d["LST_Night_1km"]), dates, d["LST_Night_1km"] > 0, 6)
    day = summer_stack(k2c(d["LST_Day_1km"]), dates, d["LST_Day_1km"] > 0, 6)
    shape_l = night.shape[1:]
    n_slope, n_p = pixel_trends(night)
    d_slope, d_p = pixel_trends(day)
    masks_l = area_masks(areas, tr_l, crs, shape_l)

    # ---------- MODIS NDVI ----------
    dn, tr_n, crs_n = load_npz("ndvi")
    nd_raw = dn["250m_16_days_NDVI"].astype(float)
    rel = dn["250m_16_days_pixel_reliability"]
    nd_valid = (nd_raw > -3000) & (rel >= 0) & (rel <= 1)
    ndvi = summer_stack(nd_raw * 1e-4, dn["dates"], nd_valid, 3)
    shape_n = ndvi.shape[1:]
    v_slope, v_p = pixel_trends(ndvi)
    masks_n = area_masks(areas, tr_n, crs_n, shape_n)

    # ---------- Per-area evidence ----------
    out_areas = []
    for f in areas["features"]:
        name, role = f["properties"]["name"], f["properties"]["role"]
        ns = area_series(night, masks_l[name])
        ds = area_series(day, masks_l[name])
        vs = area_series(ndvi, masks_n[name])
        g = gus.get(name, {})
        pop = {int(k): v for k, v in g.get("population", {}).items()}
        dw = {int(k): v for k, v in g.get("dwellings_completed", {}).items()}
        p0, p1 = pop.get(2000), pop.get(2024)
        built = sum(v for y, v in dw.items() if 2000 <= y <= 2024 and v)
        out_areas.append({
            "name": name, "role": role,
            "pixels_1km": int(masks_l[name].sum()), "pixels_250m": int(masks_n[name].sum()),
            "night_lst": rlist(ns), "day_lst": rlist(ds), "ndvi": rlist(vs, 3),
            "trend": {"night_lst": test(ns), "day_lst": test(ds), "ndvi": test(vs)},
            "population": {str(y): pop[y] for y in sorted(pop)},
            "dwellings_completed": {str(y): dw[y] for y in sorted(dw)},
            "pop_change_pct_2000_2024": r((p1 - p0) / p0 * 100, 1) if p0 and p1 else None,
            "dwellings_2000_2024": built,
            "dwellings_per_1000_residents_2000": r(built / p0 * 1000, 1) if p0 else None,
            "ndvi_sig_loss_pct": r(_share((v_p < 0.05) & (v_slope < 0), masks_n[name], v_slope), 2),
            "ndvi_sig_gain_pct": r(_share((v_p < 0.05) & (v_slope > 0), masks_n[name], v_slope), 2),
            "day_sig_warming_pct": r(_share((d_p < 0.05) & (d_slope > 0), masks_l[name], d_slope), 1),
            "night_sig_warming_pct": r(_share((n_p < 0.05) & (n_slope > 0), masks_l[name], n_slope), 1),
        })

    # Growth classes from GUS (suburbs only): booming = population grew > 100 % 2000-2024.
    for a in out_areas:
        if a["role"] == "city":
            a["growth_class"] = "city"
        else:
            a["growth_class"] = "boom" if (a["pop_change_pct_2000_2024"] or 0) > 100 else "steady"

    def pooled(cls, stack, masks):
        m = np.zeros(stack.shape[1:], bool)
        for a in out_areas:
            if a["growth_class"] == cls:
                m |= masks[a["name"]]
        return area_series(stack, m), int(m.sum())

    groups = {}
    for cls in ("city", "boom", "steady"):
        ns, npx = pooled(cls, night, masks_l)
        ds, _ = pooled(cls, day, masks_l)
        vs, nvx = pooled(cls, ndvi, masks_n)
        groups[cls] = {"pixels_1km": npx, "pixels_250m": nvx,
                       "night_lst": rlist(ns), "day_lst": rlist(ds), "ndvi": rlist(vs, 3),
                       "trend": {"night_lst": test(ns), "day_lst": test(ds), "ndvi": test(vs)},
                       "members": [a["name"] for a in out_areas if a["growth_class"] == cls]}

    # Urban heat island intensity = city minus steady (least-built) suburbs.
    uhi = {}
    for var in ("night_lst", "day_lst"):
        diff = np.array(groups["city"][var], float) - np.array(groups["steady"][var], float)
        uhi[var] = {"series": rlist(diff), "mean": r(np.nanmean(diff)), "trend": test(diff)}
    uhi["boom_minus_steady_night"] = {
        "series": rlist(np.array(groups["boom"]["night_lst"], float) - np.array(groups["steady"]["night_lst"], float)),
    }
    uhi["boom_minus_steady_night"]["trend"] = test(uhi["boom_minus_steady_night"]["series"])
    uhi["boom_minus_steady_ndvi"] = {
        "series": rlist(np.array(groups["boom"]["ndvi"], float) - np.array(groups["steady"]["ndvi"], float), 3)}
    uhi["boom_minus_steady_ndvi"]["trend"] = test(uhi["boom_minus_steady_ndvi"]["series"])

    # ---------- Distance profile from the Old Market ----------
    lon, lat = pixel_centres_lonlat(tr_l, shape_l)
    dist = np.hypot((lon - CENTRE[0]) * 111.32 * math.cos(math.radians(CENTRE[1])), (lat - CENTRE[1]) * 110.57)
    bins = np.arange(0, 36, 2)
    profile = []
    for b0 in bins:
        m = (dist >= b0) & (dist < b0 + 2)
        if m.sum() < 5:
            continue
        profile.append({"km": int(b0 + 1), "pixels": int(m.sum()),
                        "night_slope": r(np.nanmean(n_slope[m]), 3), "day_slope": r(np.nanmean(d_slope[m]), 3),
                        "night_mean": r(np.nanmean(np.nanmean(night, axis=0)[m]), 2)})

    # ---------- Ground truth ----------
    # IMGW Lawica monthly -> summer (JJA) mean of daily minima and maxima, and annual mean.
    def imgw_year(y, key, months):
        vals = [imgw.get(f"{y}-{m:02d}", {}).get(key) for m in months]
        return float(np.mean(vals)) if all(v is not None for v in vals) else np.nan
    i_years = list(range(1966, 2024))  # 2024 incomplete in the monthly archive
    i_tmin = [imgw_year(y, "tmin_mean", (6, 7, 8)) for y in i_years]
    i_tmax = [imgw_year(y, "tmax_mean", (6, 7, 8)) for y in i_years]
    i_mean = [imgw_year(y, "tmean", range(1, 13)) for y in i_years]
    i_jja = [imgw_year(y, "tmean", (6, 7, 8)) for y in i_years]

    # MODIS pixel containing the Lawica station.
    sx, sy = lonlat_to_sinu(*LAWICA)
    col, row = ~tr_l * (sx, sy)
    row, col = int(row), int(col)
    st_night = night[:, row, col]
    st_day = day[:, row, col]
    overlap = [y for y in YEARS if y in i_years]
    a_night = [st_night[YEARS.index(y)] for y in overlap]
    a_tmin = [i_tmin[i_years.index(y)] for y in overlap]
    a_day = [st_day[YEARS.index(y)] for y in overlap]
    a_tmax = [i_tmax[i_years.index(y)] for y in overlap]
    rn = pearson(a_night, a_tmin)
    rd = pearson(a_day, a_tmax)

    p_years = list(range(1981, 2026))
    p_mean = [power["T2M"].get(f"{y}13") for y in p_years]
    p_mean = [v if v is not None and v > -900 else np.nan for v in p_mean]
    ov2 = [y for y in p_years if y in i_years]
    rp = pearson([p_mean[p_years.index(y)] for y in ov2], [i_mean[i_years.index(y)] for y in ov2])

    ground = {
        "station": "Poznań-Ławica (IMGW-PIB 12330)",
        "years": i_years,
        "annual_mean": rlist(i_mean), "summer_mean": rlist(i_jja),
        "summer_tmin": rlist(i_tmin), "summer_tmax": rlist(i_tmax),
        "trend_annual_mean": test_years(i_mean, i_years),
        "trend_summer_tmin": test_years(i_tmin, i_years),
        "trend_summer_tmax": test_years(i_tmax, i_years),
        "trend_annual_mean_2000_2023": test_years(i_mean[34:], i_years[34:]),
        "modis_vs_station": {
            "pixel_row_col": [row, col], "years": overlap,
            "modis_night": rlist(a_night), "station_tmin": rlist(a_tmin),
            "modis_day": rlist(a_day), "station_tmax": rlist(a_tmax),
            "night_vs_tmin": {"r": r(rn[0], 3), "p": r(rn[1], 5), "n": rn[2]},
            "day_vs_tmax": {"r": r(rd[0], 3), "p": r(rd[1], 5), "n": rd[2]},
        },
        "power": {"years": p_years, "annual_mean": rlist(p_mean),
                  "trend": test_years(p_mean, p_years),
                  "vs_station": {"r": r(rp[0], 3), "p": r(rp[1], 6), "n": rp[2]}},
    }

    # ---------- Does growth explain the trends? (across municipalities) ----------
    xs = [a["pop_change_pct_2000_2024"] for a in out_areas]
    corr = {}
    for var in ("night_lst", "day_lst", "ndvi"):
        ys = [a["trend"][var]["slope_per_decade"] for a in out_areas]
        rs = spearman(xs, ys)
        corr[var] = {"spearman_r": r(rs[0], 3), "p": r(rs[1], 4), "n": rs[2]}
    for key in ("ndvi_sig_loss_pct", "day_sig_warming_pct"):
        rs = spearman(xs, [a[key] for a in out_areas])
        corr[f"growth_vs_{key}"] = {"spearman_r": r(rs[0], 3), "p": r(rs[1], 4), "n": rs[2]}
    # Years with no usable summer value (e.g. Terra outage June-July 2001).
    missing = {"night_lst": [y for y, v in zip(YEARS, groups["city"]["night_lst"]) if v is None],
               "ndvi": [y for y, v in zip(YEARS, groups["city"]["ndvi"]) if v is None]}
    dws = [a["dwellings_per_1000_residents_2000"] for a in out_areas]
    for var in ("night_lst", "ndvi"):
        ys = [a["trend"][var]["slope_per_decade"] for a in out_areas]
        rs = spearman(dws, ys)
        corr[f"dwellings_vs_{var}"] = {"spearman_r": r(rs[0], 3), "p": r(rs[1], 4), "n": rs[2]}

    in_l = np.zeros(shape_l, bool)
    for m in masks_l.values():
        in_l |= m
    in_n = np.zeros(shape_n, bool)
    for m in masks_n.values():
        in_n |= m
    study = {
        "generated": date.today().isoformat(),
        "years": YEARS,
        "season": "June-August",
        "areas": out_areas,
        "groups": groups,
        "uhi": uhi,
        "distance_profile": profile,
        "ground": ground,
        "growth_correlation": corr,
        "missing_years": missing,
        # shares are computed only over squares inside the 18 municipalities
        "pixel_summary": {
            "lst_pixels": int((in_l & np.isfinite(n_slope)).sum()),
            "night_sig_warming_share": r(((n_p < 0.05) & (n_slope > 0))[in_l].mean() * 100, 1),
            "night_sig_cooling_share": r(((n_p < 0.05) & (n_slope < 0))[in_l].mean() * 100, 1),
            "day_sig_warming_share": r(((d_p < 0.05) & (d_slope > 0))[in_l].mean() * 100, 1),
            "ndvi_pixels": int((in_n & np.isfinite(v_slope)).sum()),
            "ndvi_sig_loss_share": r(((v_p < 0.05) & (v_slope < 0))[in_n & np.isfinite(v_slope)].mean() * 100, 1),
            "ndvi_sig_gain_share": r(((v_p < 0.05) & (v_slope > 0))[in_n & np.isfinite(v_slope)].mean() * 100, 1),
        },
    }
    json.dump(study, open(WEB_DATA / "study.json", "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"), allow_nan=False)

    # ---------- Pixel grids for the map ----------
    def grid(tr, shape, layers):
        return {"crs": "MODIS sinusoidal (sphere R=6371007.181 m)",
                "transform": [tr.a, tr.b, tr.c, tr.d, tr.e, tr.f], "rows": shape[0], "cols": shape[1],
                "layers": layers}

    # NDVI aggregated onto the 1 km LST grid (each 1 km square holds 4x4 NDVI squares).
    nlon, nlat = pixel_centres_lonlat(tr_n, shape_n)
    sx_n = R_SPHERE * np.radians(nlon) * np.cos(np.radians(nlat))
    sy_n = R_SPHERE * np.radians(nlat)
    inv = ~tr_l
    cc = np.floor(inv.a * sx_n + inv.b * sy_n + inv.c).astype(int)
    rr = np.floor(inv.d * sx_n + inv.e * sy_n + inv.f).astype(int)
    ok = (rr >= 0) & (rr < shape_l[0]) & (cc >= 0) & (cc < shape_l[1])
    ndvi_1km = np.full((len(YEARS),) + shape_l, np.nan)
    flat = rr[ok] * shape_l[1] + cc[ok]
    for k in range(len(YEARS)):
        v = ndvi[k][ok]
        good = np.isfinite(v)
        s = np.bincount(flat[good], weights=v[good], minlength=shape_l[0] * shape_l[1])
        c = np.bincount(flat[good], minlength=shape_l[0] * shape_l[1])
        with np.errstate(all="ignore"):
            ndvi_1km[k] = np.where(c >= 8, s / c, np.nan).reshape(shape_l)

    lst_layers = {
        "ndvi_years": [rlist(ndvi_1km[:, i, j], 3) for i in range(shape_l[0]) for j in range(shape_l[1])],
        "night_slope": rlist(n_slope.ravel(), 3), "night_p": rlist(n_p.ravel(), 4),
        "day_slope": rlist(d_slope.ravel(), 3), "day_p": rlist(d_p.ravel(), 4),
        "night_years": [rlist(night[:, i, j], 1) for i in range(shape_l[0]) for j in range(shape_l[1])],
        "day_years": [rlist(day[:, i, j], 1) for i in range(shape_l[0]) for j in range(shape_l[1])],
    }
    json.dump(grid(tr_l, shape_l, lst_layers), open(WEB_DATA / "grid_lst.json", "w"),
              separators=(",", ":"), allow_nan=False)
    nd_layers = {"ndvi_slope": rlist(v_slope.ravel(), 4), "ndvi_p": rlist(v_p.ravel(), 4),
                 "ndvi_mean": rlist(np.nanmean(ndvi, axis=0).ravel(), 3)}
    json.dump(grid(tr_n, shape_n, nd_layers), open(WEB_DATA / "grid_ndvi.json", "w"),
              separators=(",", ":"), allow_nan=False)

    # ---------- Console summary ----------
    print("LST grid", shape_l, "NDVI grid", shape_n)
    for cls, gdat in groups.items():
        print(cls, gdat["members"][:4], {k: v for k, v in gdat["trend"].items()})
    print("UHI night", uhi["night_lst"]["mean"], uhi["night_lst"]["trend"])
    print("UHI day", uhi["day_lst"]["mean"], uhi["day_lst"]["trend"])
    print("boom-steady night", uhi["boom_minus_steady_night"]["trend"])
    print("boom-steady ndvi", uhi["boom_minus_steady_ndvi"]["trend"])
    print("corr", corr)
    print("ground", ground["trend_annual_mean"], ground["trend_summer_tmin"], ground["modis_vs_station"]["night_vs_tmin"],
          ground["modis_vs_station"]["day_vs_tmax"], ground["power"]["vs_station"], ground["power"]["trend"])
    print("pixels", study["pixel_summary"])
    print("profile", [(p["km"], p["night_slope"], p["night_mean"]) for p in profile])
    for a in out_areas:
        print(f'{a["name"]:18s} pop {a["pop_change_pct_2000_2024"]:>7} night {a["trend"]["night_lst"]["slope_per_decade"]:+.2f} '
              f'(p {a["trend"]["night_lst"]["p"]:.3f}) day {a["trend"]["day_lst"]["slope_per_decade"]:+.2f} '
              f'ndvi {a["trend"]["ndvi"]["slope_per_decade"]:+.4f} (p {a["trend"]["ndvi"]["p"]:.3f})')


if __name__ == "__main__":
    main()
