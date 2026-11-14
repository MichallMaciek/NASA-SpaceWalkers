"""Sharp NISAR picture of 2026 from hand-downloaded GCOV GeoTIFFs (ASF Vertex), unpacked to data/raw/zips/nisar_gcov/.

The team cut the NISAR L2 GCOV product to the study area and saved it as GeoTIFF (bands HHHH and HVHV, gamma0 in
linear power, 20 m). Track 057 ascending, provisional (P05023), the 9 dual-pol passes 18 Jun - 16 Oct 2026, median.
Output: web/data/land/hr_nisar_hh_med.png and hr_nisar_hv_med.png on the window grid of build_hires.py (about 24 m),
shifted by the median offset to the track-158 120 m layer so both use the same colours; listed in hires.json.

Run with an isolated interpreter:  .venv/bin/python -I pipeline/build_from_zips.py
Unpack first:  mkdir -p data/raw/zips/nisar_gcov && unzip -j nisar_gcov.zip -d data/raw/zips/nisar_gcov
Coherence (GUNW), soil moisture (SME2) and OPERA disturbance belong to computers 1, 2 and 4 of docs/planwyd_sar/PLAN.md;
a worked version of them is in docs/planwyd_sar/przekazanie_design/.
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

from common import RAW, WEB_DATA  # noqa: E402

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


if __name__ == "__main__":
    do_nisar()
