"""NISAR pass animation for the map: one frame per pass of the summer 2026 on the app grid (docs/planwyd_sar/sar-3-mapa.js, item 3).

Reads the hand-downloaded NISAR GCOV cut-outs (read-only):
  <gcov>/*_057_A_*_P05023_*_gamma0_20m.tif   track 57, provisional processing only (the validated P05036 files are
                                              never mixed in); band 1 HHHH, band 2 HVHV (linear power, 20 m, EPSG:32634)
  <gcov>/..._mask_20m.tif                     same name with _mask_: 0 = invalid, 255 = fill, other values = valid
One file per date. On a date with two files (22 Sep 2026: a dual-pol one and an HH-only one) the dual-pol file is used;
an HH-only date (29 Aug 2026) gets HH only.

Each pass is averaged in linear power into the app's 120 m cells (land.json), then again in linear power into 2 x 2 blocks
(240 m), and stored as dB in 8-bit grey with the app's radar decode (v/6 - 30 = dB, 0 = no data; outside the study area 0).
Full-grid frames would be about 12 MB; one half-resolution sheet keeps the folder under 3 MB.

Output: web/data/sarnik/anim/nisar_t57.png (the sheet) and meta.json (layout, decode, frames {date, hh, hv}).
Run with an isolated interpreter (the inputs are downloaded files):
  .venv/bin/python -I pipeline/sar_animacja.py [gcov_folder]      (default data/raw/sar/nisar_gcov)
"""
import glob
import json
import math
import re
import sys
import warnings
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # -I drops the script folder from the path

import numpy as np  # noqa: E402
import rasterio  # noqa: E402
from affine import Affine  # noqa: E402
from PIL import Image  # noqa: E402
from rasterio.enums import Resampling  # noqa: E402
from rasterio.warp import reproject  # noqa: E402

from common import RAW, WEB_DATA  # noqa: E402

DEFAULT_GCOV = RAW / "sar" / "nisar_gcov"
OUT = WEB_DATA / "sarnik" / "anim"
SHEET = "nisar_t57.png"
BLOCK = 2           # 2 x 120 m = 240 m cells in the sheet
PATTERN = "*_057_A_*_P05023_*_gamma0_20m.tif"


def enc_db(db):  # -30..12.5 dB in 1/6 dB steps; 0 = no data (same as build_sar.py)
    return np.where(np.isfinite(db), np.clip((db + 30) * 6, 1, 255), 0)


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_GCOV)
    files = sorted(glob.glob(str(root / PATTERN))) if root.is_dir() else []
    if not files:
        print(f"sar_animacja: no NISAR GCOV input in {root} (need {PATTERN}). Nothing written. "
              "Pass the folder with the GCOV cut-outs as the first argument.")
        sys.exit(0)

    land = json.load(open(WEB_DATA / "land" / "land.json"))
    W, H = land["width"], land["height"]
    TR = Affine(*land["transform3857"][:6])
    study = np.array(Image.open(WEB_DATA / "land" / "study.png")) > 0

    # one file per date: the one with more bands (dual-pol) wins
    pick = {}
    for p in files:
        d = re.search(r"_(\d{8})T", Path(p).name).group(1)
        with rasterio.open(p) as s:
            nb = s.count
        if d not in pick or nb > pick[d][1]:
            pick[d] = (p, nb)
    dates = sorted(pick)
    print("track 57 provisional dates", [(d, pick[d][1]) for d in dates])

    def to_grid(path, band, valid):
        with rasterio.open(path) as s:
            a = s.read(band).astype(np.float32)
            a[~valid | ~np.isfinite(a) | (a <= 0)] = np.nan
            dst = np.full((H, W), np.nan, np.float32)
            reproject(a, dst, src_transform=s.transform, src_crs=s.crs, dst_transform=TR, dst_crs="EPSG:3857",
                      resampling=Resampling.average, src_nodata=np.nan, dst_nodata=np.nan)
        return dst

    bw, bh = math.ceil(W / BLOCK), math.ceil(H / BLOCK)
    pad = lambda a: np.pad(a, ((0, bh * BLOCK - H), (0, bw * BLOCK - W)), constant_values=np.nan)
    sblock = pad(study.astype(np.float32)).reshape(bh, BLOCK, bw, BLOCK)
    sblock = np.nan_to_num(sblock).max(axis=(1, 3)) > 0          # a block is kept if any of its cells is in the study area
    sheet = np.zeros((len(dates) * bh, 2 * bw), np.uint8)
    frames, check = [], {}
    med_db = {}                                                     # track 158 medians of the app, same decode
    for pol in ("hh", "hv"):
        med = np.array(Image.open(WEB_DATA / "land" / f"nisar_{pol}_med.png")).astype(np.float32)
        med_db[pol] = np.where(med > 0, med / 6 - 30, np.nan)
    for k, d in enumerate(dates):
        p, nb = pick[d]
        with rasterio.open(p.replace("_gamma0_", "_mask_")) as m:
            mk = m.read(1)
        valid = (mk > 0) & (mk < 255)
        fr = {"date": f"{d[:4]}-{d[4:6]}-{d[6:]}", "file": Path(p).name, "hh": [0, k * bh], "hv": None}
        for j, band in enumerate((1, 2)[:nb]):
            g = to_grid(p, band, valid)                              # 120 m, linear power
            pol = ("hh", "hv")[j]
            with np.errstate(all="ignore"), warnings.catch_warnings():
                warnings.simplefilter("ignore", RuntimeWarning)          # blocks without any valid cell stay no data
                db120 = 10 * np.log10(g)
                ok = study & np.isfinite(db120) & np.isfinite(med_db[pol])
                check.setdefault(fr["date"], {})[f"{pol}_minus_t158_median_db"] = round(float(np.median(db120[ok] - med_db[pol][ok])), 2)
                check[fr["date"]][f"{pol}_covered_share"] = round(float(np.isfinite(db120[study]).mean()), 3)
                db = 10 * np.log10(np.nanmean(pad(g).reshape(bh, BLOCK, bw, BLOCK), axis=(1, 3)))
            sheet[k * bh:(k + 1) * bh, j * bw:(j + 1) * bw] = np.where(sblock, enc_db(db), 0).round().astype(np.uint8)
            if j == 1:
                fr["hv"] = [bw, k * bh]
        frames.append(fr)
        print(" ", fr["date"], "bands", nb, check[fr["date"]], flush=True)

    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(sheet, mode="L").save(OUT / SHEET, optimize=True)
    meta = {
        "source": "NASA-ISRO NISAR L2 GCOV gamma0 (ASF DAAC), L-band 1.26 GHz, cut-outs at 20 m",
        "track": 57, "direction": "ascending", "version": "provisional (P05023); validated P05036 files not used",
        "note": "single passes of one summer, not a median; 22 Sep 2026 uses the dual-pol file (partial coverage), "
                "29 Aug 2026 is HH only",
        "layout": {"file": SHEET, "kind": "sheet", "block": BLOCK, "cell_m": 120 * BLOCK, "bw": bw, "bh": bh,
                   "grid": [W, H], "n": len(frames),
                   "how": "half resolution: each value is a 2 x 2 block of the 120 m app grid (block row r, column c covers "
                          "grid rows 2r..2r+1, columns 2c..2c+1); frame k occupies sheet rows k*bh..(k+1)*bh-1; "
                          "HH in columns 0..bw-1, HV in columns bw..2bw-1; frames[k].hh / .hv give [x, y] of the top-left "
                          "corner, hv null when the pass has no HV"},
        "decode": {"formula": "v/6 - 30 = dB (0 = no data or outside the study area)", "scale": 1 / 6, "offset": -30,
                   "unit": "dB", "nodata": 0},
        "averaging": "linear power, 20 m -> 120 m app cell -> 2 x 2 block",
        "frames": frames,
        "checks": {"vs_track158_median": {"what": "median over the study area of this pass minus the app's nisar_hh_med / "
                                                  "nisar_hv_med (track 158, median of 9 passes), dB", "by_date": check}},
    }
    json.dump(meta, open(OUT / "meta.json", "w"), ensure_ascii=False, indent=1)
    print("wrote", OUT / SHEET, (OUT / SHEET).stat().st_size, "bytes;", OUT / "meta.json", (OUT / "meta.json").stat().st_size, "bytes")


if __name__ == "__main__":
    main()
