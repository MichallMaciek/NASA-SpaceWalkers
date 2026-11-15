"""ALOS PALSAR (L band, HH and HV) pictures of 2007, 2008 and 2010 on the app grid.

Source: JAXA ALOS PALSAR level 2.2 (product H2.2_UA, fine beam dual polarisation, ortho-rectified and
slope-corrected with the AW3D30 DEM, UTM 33N, 12.5 m), from the JAXA archive via ASF DAAC. Six scenes of
path/frame 1040 sit in one folder as the original ZIP files; the GeoTIFFs are read straight from the archives.

Steps:
  1. calibration: backscatter in dB = 10*log10(DN^2) + CF, with CF read from summary.txt
     (Pds_CalibrationFactor, -83.0 for every scene); DN 0 = no data, MASK 1 = outside the image,
     MASK 3/150/255 = pixels the product flags (layover/shadow class; under 255 the DN values are smoothly
     interpolated, not measured), dropped; they are about 0.5 % of pixels, equally in built-up and forest cells;
  2. each scene is averaged onto the app grid (956 x 898, EPSG:3857, 120 m, web/data/land/land.json)
     in LINEAR POWER; a cell needs at least half of its area covered by valid pixels;
  3. one picture per year: 2007 and 2010 one scene each, 2008 four scenes averaged in power;
  4. checks: median offsets to ALOS-2 2015 (web/data/land/alos_*_2015.png) and NISAR 2026
     (data/raw/radar/nisar_features.npz) on stable built-up cells and on forest; how well HH, HV and HH-HV
     separate optically built cells (logistic regression, 5-fold CV grouped by 16 x 16 cell blocks, AUC).

Output (git-ignored): data/raw/radar/alos1_<year>.npz with hh_db, hv_db (float32, 898 x 956, NaN = no data),
dates (ISO dates used), scenes, n (scenes per cell); data/raw/radar/alos1_checks.json with the check numbers.

Run with an isolated interpreter, because the ZIPs are downloaded data:
  .venv/bin/python -I pipeline/sarnik_radar_lata_alos.py [/path/to/alos_palsar]      (default data/raw/sar/alos_palsar)
"""
import argparse
import json
import re
import sys
import warnings
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # -I drops the script folder from the path

import numpy as np  # noqa: E402

from common import RAW, WEB_DATA  # noqa: E402

DEFAULT_DIR = RAW / "sar" / "alos_palsar"   # the team's place for the radar downloads (docs/planwyd_sar/PLAN.md), git-ignored
OUT = RAW / "radar"
LAND = WEB_DATA / "land"
YEARS = (2007, 2008, 2010)
MIN_VALID = 0.5       # share of a 120 m cell that must be covered by valid pixels
BLOCK = 16            # cells per side of a cross-validation block (about 2 km)


def read_summary(zf):
    """summary.txt is KEY="value" per line."""
    name = next(n for n in zf.namelist() if n.endswith("summary.txt"))
    out = {}
    for line in zf.read(name).decode("ascii", "replace").splitlines():
        m = re.match(r'\s*(\w+)\s*=\s*"(.*)"\s*$', line)
        if m:
            out[m.group(1)] = m.group(2)
    return out


def scene_to_grid(zpath, grid, w, h):
    """One ZIP -> (hh, hv) linear power on the app grid (NaN = no data) and scene facts."""
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.warp import reproject

    with zipfile.ZipFile(zpath) as zf:
        meta = read_summary(zf)
        names = zf.namelist()
    sid = meta.get("Scs_SceneID", zpath.stem.split("-")[0])
    cf = float(meta.get("Pds_CalibrationFactor", "-83.0"))
    if "Pds_CalibrationFactor" not in meta:
        print(f"  {sid}: no calibration factor in summary.txt, using -83.0", flush=True)
    d = meta["Img_SceneCenterDateTime"][:8]
    date = f"{d[:4]}-{d[4:6]}-{d[6:8]}"

    def tif(prefix):
        n = next(n for n in names if n.startswith(prefix + "-") and n.endswith(".tif"))
        return f"/vsizip/{zpath}/{n}"

    with rasterio.open(tif("HH")) as src:
        hh_dn = src.read(1)
        tr = src.transform
    with rasterio.open(tif("HV")) as src:
        hv_dn = src.read(1)
    with rasterio.open(tif("MASK")) as src:
        mask = src.read(1)
    with rasterio.open(tif("INC")) as src:
        inc = src.read(1)

    valid = (hh_dn > 0) & (hv_dn > 0) & (mask == 0) & (inc > 0)
    flagged = np.isin(mask, (3, 150, 255))
    k = 10 ** (cf / 10)
    facts = {"scene": sid, "date": date, "cf_db": cf, "product": meta.get("Pds_ProductID"),
             "dem": meta.get("Pds_DigitalElevationModel"), "off_nadir_deg": meta.get("Img_OffNadirAngle"),
             "flagged_share_pct": round(100 * float(flagged.sum()) / max(1, int((mask != 1).sum())), 2)}

    out = []
    for dn in (hh_dn, hv_dn):
        p = np.where(valid, dn.astype(np.float32) ** 2 * k, np.nan).astype(np.float32)
        dst = np.full((h, w), np.nan, np.float32)
        # The ALOS GeoTIFFs carry a rotated geotransform and an ITRF97 datum label; ITRF97 and WGS 84
        # differ by centimetres, so the plain UTM 33N code is used to avoid a datum shift lookup.
        reproject(p, dst, src_transform=tr, src_crs="EPSG:32633", src_nodata=np.nan,
                  dst_transform=grid, dst_crs="EPSG:3857", dst_nodata=np.nan, resampling=Resampling.average)
        out.append(dst)
    cov = np.zeros((h, w), np.float32)
    reproject(valid.astype(np.float32), cov, src_transform=tr, src_crs="EPSG:32633",
              dst_transform=grid, dst_crs="EPSG:3857", resampling=Resampling.average)
    flag_grid = np.zeros((h, w), np.float32)
    reproject(flagged.astype(np.float32), flag_grid, src_transform=tr, src_crs="EPSG:32633",
              dst_transform=grid, dst_crs="EPSG:3857", resampling=Resampling.average)
    keep = cov >= MIN_VALID
    hh, hv = (np.where(keep, a, np.nan).astype(np.float32) for a in out)
    return hh, hv, facts, flag_grid


def to_db(p):
    with np.errstate(divide="ignore", invalid="ignore"):
        return (10 * np.log10(p)).astype(np.float32)


def gray(name):
    from PIL import Image
    return np.array(Image.open(LAND / f"{name}.png")).astype(np.float32)


def block_auc(X, y, groups, folds=5, seed=0):
    """Out-of-fold AUC of a logistic regression, folds grouped by spatial blocks."""
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import roc_auc_score
    from sklearn.model_selection import GroupKFold
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    # Shuffle block ids so GroupKFold does not slice the map into stripes of neighbouring blocks.
    rng = np.random.default_rng(seed)
    ug, inv = np.unique(groups, return_inverse=True)
    g = rng.permutation(len(ug))[inv]
    pred = np.zeros(len(y))
    per_fold = []
    for tr_i, te_i in GroupKFold(n_splits=folds).split(X, y, g):
        m = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)).fit(X[tr_i], y[tr_i])
        pred[te_i] = m.predict_proba(X[te_i])[:, 1]
        per_fold.append(roc_auc_score(y[te_i], pred[te_i]))
    return {"auc": round(float(roc_auc_score(y, pred)), 3),
            "auc_folds": [round(float(a), 3) for a in per_fold],
            "cells": int(len(y)), "built_cells": int(y.sum()), "blocks": int(len(ug))}


def separation(hh_db, hv_db, built, study):
    """AUC of HH, HV, HH-HV (dB) for built (optical share >= threshold) against the rest of the study area."""
    rows, cols = np.indices(hh_db.shape)
    ok = study & np.isfinite(hh_db) & np.isfinite(hv_db)
    X = np.column_stack([hh_db[ok], hv_db[ok], hh_db[ok] - hv_db[ok]])
    y = built[ok].astype(int)
    groups = (rows[ok] // BLOCK) * 10_000 + cols[ok] // BLOCK
    res = block_auc(X, y, groups)
    single = {}
    from sklearn.metrics import roc_auc_score
    for i, name in enumerate(("hh", "hv", "hh_minus_hv")):
        a = roc_auc_score(y, X[:, i])
        single[name] = round(float(max(a, 1 - a)), 3)   # direction-free, no fitting
    res["single_feature_auc"] = single
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("folder", nargs="?", default=str(DEFAULT_DIR),
                    help=f"folder with the ALOS PALSAR ZIP files (default {DEFAULT_DIR})")
    args = ap.parse_args()
    folder = Path(args.folder).expanduser()
    zips = sorted(folder.glob("ALPSRP*.zip")) if folder.is_dir() else []
    if not zips:
        print(f"sarnik_radar_lata_alos: no ALOS PALSAR ZIP files in {folder}; nothing to do "
              "(the raw radar data is not in the repository). Pass the folder as the first argument.")
        return 0

    from affine import Affine

    land = json.load(open(LAND / "land.json"))
    w, h = land["width"], land["height"]
    t = land["transform3857"]
    grid = Affine(t[0], t[1], t[2], t[3], t[4], t[5])
    thr = float(land.get("threshold", 0.15))
    study = gray("study") > 0
    OUT.mkdir(parents=True, exist_ok=True)

    # ---- scenes -> grid
    scenes = []
    for z in zips:
        hh, hv, facts, flag = scene_to_grid(z, grid, w, h)
        facts["study_cover_pct"] = round(100 * float((np.isfinite(hh) & study).sum()) / study.sum(), 1)
        print(f"  {facts['scene']} {facts['date']}  CF {facts['cf_db']}  study covered {facts['study_cover_pct']}%"
              f"  flagged pixels {facts['flagged_share_pct']}%", flush=True)
        scenes.append((facts, hh, hv, flag))

    # ---- one picture per year, mean in linear power where scenes overlap
    checks = {"calibration": "dB = 10*log10(DN^2) + CF, CF from summary.txt Pds_CalibrationFactor",
              "scenes": [s[0] for s in scenes], "years": {}}
    pics = {}
    for year in YEARS:
        sel = [s for s in scenes if s[0]["date"].startswith(str(year))]
        if not sel:
            print(f"  {year}: no scene", flush=True)
            continue
        hh_s = np.stack([s[1] for s in sel])
        hv_s = np.stack([s[2] for s in sel])
        n = np.isfinite(hh_s).sum(0).astype(np.uint8)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)   # cells no scene covers stay NaN
            hh_db, hv_db = to_db(np.nanmean(hh_s, 0)), to_db(np.nanmean(hv_s, 0))
        hv_db[~np.isfinite(hh_db)] = np.nan
        hh_db[~np.isfinite(hv_db)] = np.nan
        dates = [s[0]["date"] for s in sel]
        ids = [s[0]["scene"] for s in sel]
        np.savez_compressed(OUT / f"alos1_{year}.npz", hh_db=hh_db, hv_db=hv_db, dates=np.array(dates),
                            scenes=np.array(ids), n=n)
        cover = round(100 * float((np.isfinite(hh_db) & study).sum()) / study.sum(), 1)
        checks["years"][str(year)] = {"dates": dates, "scenes": ids, "study_cover_pct": cover}
        pics[year] = (hh_db, hv_db)
        print(f"  wrote alos1_{year}.npz  dates {dates}  study covered {cover}%", flush=True)

    # ---- offsets to the other L-band layers on stable classes
    b05, b20 = gray("built_2005") / 255, gray("built_2020") / 255
    forest_frac = gray("forest2000_frac") / 255
    loss = gray("loss_frac") / 255
    classes = {"built": study & (b05 >= 0.5) & (b20 >= 0.5),
               "forest": study & (forest_frac >= 0.8) & (loss < 0.05) & (b20 < 0.05)}

    def l2(name):
        v = gray(name)
        return np.where(v > 0, v / 6 - 30, np.nan)

    refs = {"alos2_2015": (l2("alos_hh_2015"), l2("alos_hv_2015"))}
    nf = OUT / "nisar_features.npz"
    if nf.exists():
        d = np.load(nf)
        refs["nisar_2026"] = (to_db(d["hh_mean"]), to_db(d["hv_mean"]))
    checks["offsets_db"] = {}
    for year, (hh_db, hv_db) in pics.items():
        for rname, (rhh, rhv) in refs.items():
            for cname, cm in classes.items():
                for pol, a, r in (("hh", hh_db, rhh), ("hv", hv_db, rhv)):
                    ok = cm & np.isfinite(a) & np.isfinite(r)
                    if ok.sum() < 50:
                        continue
                    key = f"{year}_vs_{rname}_{cname}_{pol}"
                    checks["offsets_db"][key] = {
                        "alos1_median_db": round(float(np.median(a[ok])), 2),
                        "ref_median_db": round(float(np.median(r[ok])), 2),
                        "median_diff_db": round(float(np.median(a[ok] - r[ok])), 2),
                        "corr": round(float(np.corrcoef(a[ok], r[ok])[0, 1]), 3), "cells": int(ok.sum())}
    # flagged (layover/shadow class) pixel share by class, to see whether dropping them biases built-up cells
    checks["flagged_pixel_share_pct"] = {
        s[0]["scene"]: {c: round(100 * float(np.mean(s[3][cm & np.isfinite(s[1])])), 2) for c, cm in classes.items()}
        for s in scenes}

    # ---- usefulness: separation of optically built cells
    checks["separation"] = {}
    for year, ref in ((2010, "built_2010"), (2008, "built_2010"), (2007, "built_2005")):
        if year in pics:
            built = gray(ref) / 255 >= thr
            r = separation(*pics[year], built, study)
            r["optical_reference"] = ref
            checks["separation"][str(year)] = r
    # same test on the ALOS-2 2015 layer, as a yardstick for what L band can do here
    built15 = gray("built_2015") / 255 >= thr
    r = separation(*refs["alos2_2015"], built15, study)
    r["optical_reference"] = "built_2015"
    checks["separation"]["alos2_2015_reference"] = r

    json.dump(checks, open(OUT / "alos1_checks.json", "w"), indent=1)
    print("  offsets (ALOS-1 minus reference, median dB):")
    for k, v in checks["offsets_db"].items():
        print(f"    {k:42s} {v['median_diff_db']:+6.2f}  (ALOS-1 {v['alos1_median_db']:+6.2f}, ref {v['ref_median_db']:+6.2f},"
              f" r={v['corr']:.2f}, n={v['cells']})")
    print("  separation of built cells (block CV AUC):")
    for k, v in checks["separation"].items():
        print(f"    {k:22s} AUC {v['auc']:.3f} folds {v['auc_folds']} single {v['single_feature_auc']}"
              f" cells {v['cells']} built {v['built_cells']}")
    print(f"  wrote {OUT / 'alos1_checks.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
