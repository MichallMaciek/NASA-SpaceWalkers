"""NISAR 2026 features on the app's 120 m grid, for the yearly radar built-up map (sarnik_radar_lata.py).

Reads the hand-downloaded NISAR cut-outs (read-only):
  <sar>/nisar_gcov/*_057_A_*_P05023_*_gamma0_20m.tif   GCOV track 57, provisional processing only (versions are
                                                        never mixed), band 1 HHHH, band 2 HVHV (linear power, 20 m)
  <sar>/nisar_gunw/*_coherence_20m.tif                  GUNW track 158, 12-day coherence (0-1, 20 m)

Everything is computed at 20 m on the coherence grid (EPSG:32633) and then averaged into the app cells (EPSG:3857),
in linear power for backscatter. Output: data/raw/radar/nisar_features.npz with
  hh_mean, hv_mean        season mean of HH and HV (linear power)
  hh_std_db               spread of HH over the season (dB)
  hh_e/hh_l, hv_e/hv_l    mean of the first and last three passes (linear power)
  coh_mean, coh_min       mean and minimum 12-day coherence; coh_e/coh_l early and late season; coh_l_max (20 m max)
  f_*, dhh_max            within-season change flags (kept for reference; they did NOT validate, see RADAR_LATA.md)
  dates, pairs            GCOV dates and GUNW pairs used

Run with an isolated interpreter (the inputs are downloaded files):
  .venv/bin/python -I pipeline/sarnik_radar_lata_nisar.py [sar_folder]      (default data/raw/sar)
First written in the night of 14/15 Nov 2026 for the tests in tests/nauka/nisar_*.py; same numbers.
"""
import glob
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # -I drops the script folder from the path

import numpy as np  # noqa: E402
import rasterio  # noqa: E402
from affine import Affine  # noqa: E402
from rasterio.enums import Resampling  # noqa: E402
from rasterio.vrt import WarpedVRT  # noqa: E402
from rasterio.warp import reproject  # noqa: E402

from common import RAW, WEB_DATA  # noqa: E402

DEFAULT_SAR = RAW / "sar"   # the team's place for the radar downloads (docs/planwyd_sar/PLAN.md), git-ignored
OUT = RAW / "radar" / "nisar_features.npz"


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SAR)
    gcov = sorted(glob.glob(str(root / "nisar_gcov" / "*_057_A_*_P05023_*_gamma0_20m.tif")))
    coh_files = sorted(glob.glob(str(root / "nisar_gunw" / "*_coherence_20m.tif")))
    if not root.is_dir() or not gcov or not coh_files:
        print(f"sarnik_radar_lata_nisar: no NISAR input in {root} (need nisar_gcov/*_057_A_*_P05023_*_gamma0_20m.tif "
              "and nisar_gunw/*_coherence_20m.tif). Nothing written. Pass the SAR folder as the first argument.")
        sys.exit(0)

    land = json.load(open(WEB_DATA / "land" / "land.json"))
    W, H = land["width"], land["height"]
    TR = Affine(*land["transform3857"][:6])
    with rasterio.open(coh_files[0]) as s:
        CRS, T20, W20, H20 = s.crs, s.transform, s.width, s.height
    print("20 m grid", CRS, W20, H20)

    def to20(path, band):
        with rasterio.open(path) as s, WarpedVRT(s, crs=CRS, transform=T20, width=W20, height=H20,
                                                 resampling=Resampling.bilinear) as v:
            a = v.read(band).astype(np.float32)
        a[~np.isfinite(a) | (a <= 0)] = np.nan
        return a

    def agg(a, how=Resampling.average):
        dst = np.full((H, W), np.nan, np.float32)
        reproject(a.astype(np.float32), dst, src_transform=T20, src_crs=CRS, dst_transform=TR, dst_crs="EPSG:3857",
                  resampling=how, src_nodata=np.nan, dst_nodata=np.nan)
        return dst

    # ---- GCOV track 57, provisional: one file per date, keep the one with both polarisations
    files = {}
    for p in gcov:
        d = re.search(r"_(\d{8})T", p).group(1)
        with rasterio.open(p) as s:
            nb = s.count
        if d not in files or nb > files[d][1]:
            files[d] = (p, nb)
    dates = sorted(files)
    early, late = dates[:3], dates[-3:]
    print("GCOV track 57 dates", [(d, files[d][1]) for d in dates])
    acc = {k: np.zeros((H20, W20), np.float32) for k in ("hh_e", "hh_l", "hv_e", "hv_l", "hh_all", "hv_all", "s1", "s2")}
    n_all = n_hv = 0
    for d in dates:
        p, nb = files[d]
        hh = to20(p, 1)
        acc["hh_all"] += np.nan_to_num(hh)
        n_all += 1
        with np.errstate(all="ignore"):
            db = 10 * np.log10(hh)
        acc["s1"] += np.nan_to_num(db)
        acc["s2"] += np.nan_to_num(db) ** 2
        if d in early:
            acc["hh_e"] += hh / 3
        if d in late:
            acc["hh_l"] += hh / 3
        if nb >= 2:
            hv = to20(p, 2)
            acc["hv_all"] += np.nan_to_num(hv)
            n_hv += 1
            if d in early:
                acc["hv_e"] += hv / 3
            if d in late:
                acc["hv_l"] += hv / 3
        print(" read", d, nb, flush=True)
    hh_mean, hv_mean = acc["hh_all"] / n_all, acc["hv_all"] / max(n_hv, 1)
    hh_std = np.sqrt(np.maximum(acc["s2"] / n_all - (acc["s1"] / n_all) ** 2, 0))
    with np.errstate(all="ignore"):
        dhh20 = 10 * np.log10(acc["hh_l"] / acc["hh_e"])
        dhv20 = 10 * np.log10(acc["hv_l"] / acc["hv_e"])
        hh_l_db20 = 10 * np.log10(acc["hh_l"])

    # ---- 12-day coherence, track 158
    coh, pairs = [], []
    for p in coh_files:
        with rasterio.open(p) as s:
            coh.append(s.read(1).astype(np.float32))
        m = re.search(r"_(\d{8})T\d+_\d{8}T\d+_(\d{8})T", p)
        pairs.append(m.group(1) + ">" + m.group(2))
    coh = np.stack(coh)
    print("coherence pairs", pairs)
    with np.errstate(all="ignore"):
        coh_e, coh_l = np.nanmean(coh[:3], 0), np.nanmean(coh[-3:], 0)
        coh_m, coh_min = np.nanmean(coh, 0), np.nanmin(coh, 0)

    # ---- 20 m within-season change flags (reference only)
    new_bright20 = ((dhh20 >= 3) & (hh_l_db20 >= -7) & ((dhh20 - dhv20) >= 1.5)).astype(np.float32)
    up3_20 = (dhh20 >= 3).astype(np.float32)
    stable_new20 = ((coh_l >= 0.6) & (coh_e < 0.4)).astype(np.float32)
    lost_stab20 = ((coh_e >= 0.6) & (coh_l < 0.4)).astype(np.float32)

    res = {k: agg(acc[k]) for k in ("hh_e", "hh_l", "hv_e", "hv_l")}
    res["hh_mean"], res["hv_mean"], res["hh_std_db"] = agg(hh_mean), agg(hv_mean), agg(hh_std)
    res["coh_e"], res["coh_l"], res["coh_mean"], res["coh_min"] = agg(coh_e), agg(coh_l), agg(coh_m), agg(coh_min)
    res["f_new_bright"], res["f_up3"] = agg(new_bright20), agg(up3_20)
    res["f_stable_new"], res["f_lost_stab"] = agg(stable_new20), agg(lost_stab20)
    res["dhh_max"] = agg(np.where(np.isfinite(dhh20), dhh20, np.nan), Resampling.max)
    res["coh_l_max"] = agg(coh_l, Resampling.max)
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else OUT
    out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(out, **res, dates=np.array(dates), pairs=np.array(pairs))
    for k, v in res.items():
        print(f"{k:14s} valid {np.isfinite(v).mean():.3f} p2/p50/p98 {np.round(np.nanpercentile(v, [2, 50, 98]), 4).tolist()}")
    print("wrote", out)


if __name__ == "__main__":
    main()
