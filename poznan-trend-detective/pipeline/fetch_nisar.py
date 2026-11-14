"""NISAR GCOV (L-band, HH + HV) over Poznań, needs a free NASA Earthdata login.

Reads only the study-area window from each GCOV file with HDF5 range requests, never the whole ~2 GB file,
and resamples HH and HV (gamma0, linear power) onto the app's 120 m grid (fetch_urban.TR), power-averaged.

Login: earthaccess looks for it in ~/.netrc (machine urs.earthdata.nasa.gov login ... password ...) or in the
environment (EARTHDATA_USERNAME + EARTHDATA_PASSWORD, or EARTHDATA_TOKEN). Set it up yourself; this script
never asks for, prints or stores it.

Pass list: the team's progres/p1/dane/nisar_poznan_przeloty.csv (ASF search with weather on each pass day),
copied to data/raw/nisar_passes.csv. By default one track (158, ascending) and one product version
(provisional, 17 Jun - 23 Oct 2026), so geometry and calibration stay comparable (ASF advises not to mix
versions in one analysis).

Output: data/raw/nisar_gcov.npz  (dates, hh, hv on the 120 m grid, track, version)
Usage:  python fetch_nisar.py [--track 158] [--version provisional] [--inspect] [--limit N]
"""
import argparse
import csv
import sys

import numpy as np
from affine import Affine
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.warp import reproject, transform_bounds

from common import RAW
from fetch_urban import TR, W, H

GRID = "/science/LSAR/GCOV/grids/frequencyA"


def passes(track, version):
    rows = list(csv.DictReader(open(RAW / "nisar_passes.csv", encoding="utf-8")))
    sel = [r for r in rows if r["produkt"] == "GCOV" and r["orbita"] == str(track) and r["wersja"] == version]
    return sorted(sel, key=lambda r: r["data"])


def login():
    import earthaccess
    for strategy in ("environment", "netrc"):
        try:
            auth = earthaccess.login(strategy=strategy)
            if auth and auth.authenticated:
                print("Earthdata login OK via", strategy, flush=True)
                return earthaccess
        except Exception:
            pass
    sys.exit("No Earthdata login found. Create a free account at https://urs.earthdata.nasa.gov, then put it in "
             "~/.netrc or EARTHDATA_USERNAME/EARTHDATA_PASSWORD (see the docstring).")


def epsg_of(f):
    for path in (f"{GRID}/projection", "/science/LSAR/GCOV/grids/projection"):
        if path in f:
            ds = f[path]
            for key in ("epsg_code", "epsg"):
                if key in ds.attrs:
                    return int(np.array(ds.attrs[key]).ravel()[0])
            try:
                return int(np.array(ds[()]).ravel()[0])
            except Exception:
                pass
    raise KeyError("projection / EPSG not found in GCOV file; run with --inspect")


def read_window(f):
    """HH and HV on our grid from one open GCOV file."""
    g = f[GRID]
    epsg = epsg_of(f)
    xs, ys = g["xCoordinates"][()], g["yCoordinates"][()]
    dx, dy = float(xs[1] - xs[0]), float(ys[1] - ys[0])           # dy < 0 (north up)
    x0, y0, x1, y1 = transform_bounds("EPSG:3857", f"EPSG:{epsg}", TR.c, TR.f + TR.e * H, TR.c + TR.a * W, TR.f)
    pad = 200
    c0 = max(0, int(np.floor((x0 - pad - xs[0]) / dx))); c1 = min(len(xs), int(np.ceil((x1 + pad - xs[0]) / dx)))
    r0 = max(0, int(np.floor((y1 + pad - ys[0]) / dy))); r1 = min(len(ys), int(np.ceil((y0 - pad - ys[0]) / dy)))
    if c1 <= c0 or r1 <= r0:
        return None
    src_tr = Affine(dx, 0, xs[c0] - dx / 2, 0, dy, ys[r0] - dy / 2)
    out = {}
    for pol in ("HHHH", "HVHV"):
        a = g[pol][r0:r1, c0:c1].astype(np.float32)
        a[~np.isfinite(a) | (a <= 0)] = np.nan
        dst = np.full((H, W), np.nan, np.float32)
        reproject(a, dst, src_transform=src_tr, src_crs=CRS.from_epsg(epsg), src_nodata=np.nan,
                  dst_transform=TR, dst_crs="EPSG:3857", dst_nodata=np.nan, resampling=Resampling.average)
        out[pol] = dst
    return out


def inspect(f, depth=4):
    def show(name, obj):
        if name.count("/") <= depth:
            shape = getattr(obj, "shape", "")
            print(" ", name, shape, dict(list(obj.attrs.items())[:3]) if hasattr(obj, "attrs") else "")
    f.visititems(show)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--track", type=int, default=158)
    ap.add_argument("--version", default="provisional")
    ap.add_argument("--inspect", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    import h5py
    rows = passes(a.track, a.version)
    if a.limit:
        rows = rows[: a.limit]
    print(len(rows), "GCOV passes, track", a.track, a.version, [r["data"] for r in rows], flush=True)
    ea = login()
    files = ea.open([r["url_h5"] for r in rows])
    dates, hh, hv = [], [], []
    for r, fo in zip(rows, files):
        with h5py.File(fo, "r") as f:
            if a.inspect:
                inspect(f)
                return
            w = read_window(f)
        if w is None:
            print("  ", r["data"], "does not cover the study area", flush=True)
            continue
        dates.append(r["data"]); hh.append(w["HHHH"]); hv.append(w["HVHV"])
        print("  ", r["data"], f"{np.isfinite(w['HHHH']).mean():.2f} of the grid covered", flush=True)
    np.savez_compressed(RAW / "nisar_gcov.npz", dates=np.array(dates), hh=np.array(hh), hv=np.array(hv),
                        track=a.track, version=a.version)
    print("saved NISAR GCOV", len(dates), "passes", flush=True)


if __name__ == "__main__":
    main()
