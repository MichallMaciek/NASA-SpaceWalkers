"""Yearly Sentinel-1 radar composites on the app grid (EPSG:3857, 120 m cells), summers 2015-2026.

Source: Sentinel-1 RTC (radiometrically terrain corrected gamma-0, VV and VH) from Microsoft Planetary
Computer, read anonymously. Four relative orbits cover the study area every year (ascending 73 and 175,
descending 22 and 124). For each summer (June-August) and each orbit we take up to DATES_PER_ORBIT dates
spread over the season, build a per-orbit median, then average the four orbits. The same orbit mix every
year keeps the viewing geometry comparable between years, which matters for buildings (double bounce
depends on the look direction).

Reads use the 40 m overview of each 10 m COG: about 20x faster than full resolution and still finer than
the 120 m Web Mercator cell (about 73 m on the ground at 52.4 N).

Output: data/raw/radar/s1_<year>.npz with vv_db, vh_db (summer composites), vv_std_db (spread of single
dates) and n (number of dates per cell). Consumed by sarnik_radar_lata.py.

Run:  .venv/bin/python pipeline/sarnik_radar_lata_s1.py [year ...]   (all years 2015-2026 when none given; about one
minute per year; sends only the bounding box to the STAC search). Formerly pipeline/fetch_radar.py.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # works with -I too
import time
import warnings
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import planetary_computer as pc
import pystac_client
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT

from common import BBOX, RAW
from fetch_urban import TR, W, H

warnings.filterwarnings("ignore")

YEARS = list(range(2015, 2027))
ORBITS = (22, 73, 124, 175)
DATES_PER_ORBIT = 5
OVERVIEW = 1  # 0 = 20 m, 1 = 40 m, 2 = 80 m
OUT = RAW / "radar"
OUT.mkdir(parents=True, exist_ok=True)


def catalog():
    return pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1",
                                     modifier=pc.sign_inplace)


def read(href):
    """Linear gamma-0 on the app grid, NaN where the scene has no data."""
    for attempt in range(3):
        try:
            with rasterio.open(href, overview_level=OVERVIEW) as src:
                nod = src.nodata if src.nodata is not None else -32768
                with WarpedVRT(src, crs="EPSG:3857", transform=TR, width=W, height=H,
                               resampling=Resampling.average, src_nodata=nod) as vrt:
                    a = vrt.read(1).astype(np.float32)
            a[(a <= 0) | ~np.isfinite(a)] = np.nan
            return a
        except Exception as e:  # signed URLs or the network occasionally fail
            err = e
            time.sleep(2 + 3 * attempt)
    print("  read failed:", str(err)[:120], flush=True)
    return None


def pick_dates(items):
    """Group slices by acquisition date and keep up to DATES_PER_ORBIT dates spread over the summer."""
    by_date = defaultdict(list)
    for it in items:
        by_date[it.datetime.date()].append(it)
    dates = sorted(by_date)
    if len(dates) > DATES_PER_ORBIT:
        idx = np.linspace(0, len(dates) - 1, DATES_PER_ORBIT).round().astype(int)
        dates = [dates[i] for i in sorted(set(idx))]
    return [(d, by_date[d]) for d in dates]


def mosaic(slices, pol):
    """One date can be split into consecutive slices: merge them into one image."""
    out = None
    for it in slices:
        a = read(it.assets[pol].href)
        if a is None:
            continue
        out = a if out is None else np.where(np.isnan(out), a, out)
    return out


def composite(year, cat):
    items = list(cat.search(collections=["sentinel-1-rtc"], bbox=list(BBOX),
                            datetime=f"{year}-06-01/{year}-08-31").items())
    per_orbit = {o: [] for o in ORBITS}
    for it in items:
        o = it.properties.get("sat:relative_orbit")
        if o in per_orbit:
            per_orbit[o].append(it)
    jobs = [(o, d, s) for o in ORBITS for d, s in pick_dates(per_orbit[o])]

    def one(job):
        o, d, slices = job
        return o, d, mosaic(slices, "vv"), mosaic(slices, "vh")

    with ThreadPoolExecutor(8) as ex:
        results = list(ex.map(one, jobs))

    vv_orbit, vh_orbit, singles = [], [], []
    for o in ORBITS:
        vv = [r[2] for r in results if r[0] == o and r[2] is not None]
        vh = [r[3] for r in results if r[0] == o and r[3] is not None]
        if not vv or not vh:
            continue
        with np.errstate(all="ignore"):
            vv_orbit.append(np.nanmedian(np.stack(vv), axis=0))
            vh_orbit.append(np.nanmedian(np.stack(vh), axis=0))
        singles += vv
    with np.errstate(all="ignore"):
        vv_lin = np.nanmean(np.stack(vv_orbit), axis=0)
        vh_lin = np.nanmean(np.stack(vh_orbit), axis=0)
        single_db = 10 * np.log10(np.stack(singles))
        vv_std = np.nanstd(single_db, axis=0)
        n = np.isfinite(single_db).sum(0).astype(np.uint8)
    vv_db = 10 * np.log10(vv_lin)
    vh_db = 10 * np.log10(vh_lin)
    np.savez_compressed(OUT / f"s1_{year}.npz", vv_db=vv_db.astype(np.float32), vh_db=vh_db.astype(np.float32),
                        vv_std_db=vv_std.astype(np.float32), n=n, dates=np.array([str(r[1]) for r in results]),
                        orbits=np.array([r[0] for r in results]))
    print(f"S1 {year}: {len(items)} slices, {len(jobs)} dates used, orbits {len(vv_orbit)}, "
          f"valid {np.isfinite(vv_db).mean():.3f}, VV median {np.nanmedian(vv_db):.2f} dB, "
          f"VH median {np.nanmedian(vh_db):.2f} dB", flush=True)


def main():
    years = [int(y) for y in sys.argv[1:]] or YEARS
    try:
        cat = catalog()
    except Exception as e:  # no network (CI): say so and stop
        print("sarnik_radar_lata_s1: cannot reach Microsoft Planetary Computer:", str(e)[:160], "- nothing written.")
        sys.exit(0)
    for y in years:
        t = time.time()
        composite(y, cat)
        print(f"  {time.time() - t:.0f} s", flush=True)


if __name__ == "__main__":
    main()
