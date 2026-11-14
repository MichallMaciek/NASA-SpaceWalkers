"""Download MODIS Terra time series for the Poznan study area.

Data are read anonymously from Microsoft Planetary Computer, which mirrors
NASA LP DAAC MODIS Collection 6.1 products as Cloud-Optimized GeoTIFFs.
Only the small window covering the study area is read from each file.

Products (Terra only, so the overpass time stays constant for 2000-2025):
  * MOD11A2 v061  - 8-day land surface temperature, 1 km (day ~10:30, night ~22:30)
  * MOD13Q1 v061  - 16-day NDVI, 250 m (summer composites only)

Usage:
  python fetch_modis.py lst
  python fetch_modis.py ndvi
Output: data/raw/modis_<name>.npz  (stack, dates, transform, crs)
"""
import sys
import warnings
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import planetary_computer as pc
import pystac_client
import rasterio
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds

from common import BBOX, RAW, YEARS

warnings.filterwarnings("ignore")

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
TILE = "h19v03"

PRODUCTS = {
    "lst": {
        "collection": "modis-11A2-061",
        "prefix": "MOD11A2",
        "assets": ["LST_Day_1km", "LST_Night_1km"],
        "months": range(1, 13),
    },
    "ndvi": {
        "collection": "modis-13Q1-061",
        "prefix": "MOD13Q1",
        "assets": ["250m_16_days_NDVI", "250m_16_days_pixel_reliability"],
        "months": range(5, 10),  # May-September, growing season
    },
}


def search(cfg):
    cat = pystac_client.Client.open(STAC, modifier=pc.sign_inplace)
    items = []
    for year in YEARS:
        s = cat.search(collections=[cfg["collection"]], bbox=list(BBOX),
                       datetime=f"{year}-01-01/{year}-12-31")
        for it in s.items():
            if not it.id.startswith(cfg["prefix"]) or TILE not in it.id:
                continue
            if it.datetime is None:
                start = it.properties.get("start_datetime")
                month = int(start[5:7])
            else:
                month = it.datetime.month
            if month in cfg["months"]:
                items.append(it)
        print(year, len(items), flush=True)
    items.sort(key=lambda i: i.properties.get("start_datetime") or i.datetime.isoformat())
    return items


def read_window(href):
    for attempt in range(4):
        try:
            with rasterio.open(href) as ds:
                b = transform_bounds("EPSG:4326", ds.crs, *BBOX)
                w = from_bounds(*b, transform=ds.transform).round_offsets().round_lengths()
                fill = ds.nodata if ds.nodata is not None else 0
                arr = ds.read(1, window=w, boundless=True, fill_value=fill)
                return arr, ds.window_transform(w), ds.crs.to_wkt()
        except Exception as e:  # network hiccups
            err = e
    raise err


def main(name):
    cfg = PRODUCTS[name]
    items = search(cfg)
    print(f"{len(items)} items, reading windows ...", flush=True)

    def job(it):
        out = {}
        for a in cfg["assets"]:
            out[a], tr, crs = read_window(it.assets[a].href)
        start = it.properties.get("start_datetime") or it.datetime.isoformat()
        return start[:10], out, tr, crs

    with ThreadPoolExecutor(max_workers=16) as ex:
        results = list(ex.map(job, items))

    dates = np.array([r[0] for r in results])
    stacks = {a: np.stack([r[1][a] for r in results]) for a in cfg["assets"]}
    tr, crs = results[0][2], results[0][3]
    np.savez_compressed(RAW / f"modis_{name}.npz", dates=dates, transform=np.array(tr)[:6],
                        crs=crs, **stacks)
    print("saved", name, {k: v.shape for k, v in stacks.items()}, dates[0], dates[-1])


if __name__ == "__main__":
    main(sys.argv[1])
