"""Radar layers for SARnik (v2), all readable without a login.

  * Sentinel-1 RTC (C-band, VV + VH, 10 m), every pass of relative orbit 73 (ascending) over the whole study
    area, June-November 2026: the same season NISAR has flown over Poznań (Microsoft Planetary Computer).
  * NASA POWER daily precipitation at Poznań for the same period (to see how the ground reacts to rain).
  * EGMS vertical ground motion 2016-2020 (Copernicus, Sentinel-1 persistent-scatterer InSAR), as served by
    PIG-PIB (geozagrozenia/egms_2016_2020_pion).
  * ALOS-2 PALSAR-2 yearly mosaics 2015-2021 (L-band HH + HV, 25 m), the same band and polarisations as NISAR
    (Planetary Computer).

Everything is resampled to the app's 120 m Web Mercator grid (fetch_urban.TR). Linear power is averaged
before conversion to dB.

Output: data/raw/sar_s1_2026.npz, data/raw/power_rain_2026.json, data/raw/egms.npz, data/raw/alos.npz
Usage: python fetch_sar.py [s1] [rain] [egms] [alos]   (no argument = all)
"""
import json
import subprocess
import sys
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import planetary_computer as pc
import pystac_client
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT

from common import BBOX, RAW, USER_AGENT
from fetch_urban import TR, W, H, warp

S1_ORBIT = 73  # ascending; 27 passes covering the whole study area between 3 Jun and 13 Nov 2026
PERIOD = "2026-06-01/2026-11-14"
POZNAN = (16.93, 52.41)


def stac():
    # unsigned search; each asset is signed right before it is read, so long runs never hit an expired token
    return pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")


def warp_ovr(href, level=2, nodata=0):
    """Read a COG through its internal overview (Sentinel-1 RTC level 2 = 8x = 80 m) and average onto the 120 m grid.
    About 60x less data than the full 10 m image, and the same result on our coarser grid."""
    with rasterio.open(href, overview_level=level) as src:
        with WarpedVRT(src, crs="EPSG:3857", transform=TR, width=W, height=H,
                       resampling=Resampling.average, src_nodata=nodata) as vrt:
            return vrt.read(1).astype(np.float32)


def retry(fn, tries=3):
    for a in range(tries):
        try:
            return fn()
        except Exception as e:  # network hiccups on large COG reads
            err = e
            time.sleep(4 * (a + 1))
    raise err


def fetch_s1_series(period=PERIOD, out="sar_s1_2026.npz"):
    items = [i for i in stac().search(collections=["sentinel-1-rtc"], bbox=list(BBOX), datetime=period).items()
             if i.properties.get("sat:relative_orbit") == S1_ORBIT]
    by_date = defaultdict(list)
    for i in items:
        by_date[i.datetime.date().isoformat()].append(i)
    dates = sorted(by_date)
    platforms = {d: sorted({i.properties.get("platform") for i in by_date[d]}) for d in dates}
    print("S1 orbit", S1_ORBIT, len(items), "scenes on", len(dates), "dates", flush=True)

    def one(job):
        d, pol = job
        acc, n = np.zeros((H, W)), np.zeros((H, W))
        for it in by_date[d]:
            href = pc.sign(it.assets[pol].href)
            try:
                v = retry(lambda: warp_ovr(href, level=2, nodata=0))
            except Exception as e:
                print("  failed", d, pol, str(e)[:80], flush=True)
                continue
            ok = np.isfinite(v) & (v > 0)
            acc[ok] += v[ok]
            n[ok] += 1
        with np.errstate(all="ignore"):
            return d, pol, np.where(n > 0, acc / n, np.nan).astype(np.float32)

    stack = {p: np.full((len(dates), H, W), np.nan, np.float32) for p in ("vv", "vh")}
    with ThreadPoolExecutor(6) as ex:
        for d, pol, arr in ex.map(one, [(d, p) for d in dates for p in ("vv", "vh")]):
            stack[pol][dates.index(d)] = arr
            print("  ", d, pol, f"{np.isfinite(arr).mean():.2f} valid", flush=True)
    np.savez_compressed(RAW / out, dates=np.array(dates), vv=stack["vv"], vh=stack["vh"],
                        orbit=S1_ORBIT, platforms=json.dumps(platforms))
    print("saved S1 series", out, stack["vv"].shape, flush=True)


def fetch_s1_lastyear():
    """Same orbit, autumn 2025: a year-on-year comparison cancels the farming season (harvest, ploughing, rain)
    that dominates any June -> November change, and leaves what really changed: new walls, cleared land."""
    fetch_s1_series("2025-09-01/2025-11-14", "sar_s1_2025autumn.npz")


def fetch_rain():
    url = ("https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,GWETTOP&community=AG"
           f"&longitude={POZNAN[0]}&latitude={POZNAN[1]}&start=20260520&end=20261114&format=JSON")
    raw = subprocess.run(["curl", "-s", "--max-time", "120", "-A", USER_AGENT, url], capture_output=True, check=True).stdout
    p = json.loads(raw)["properties"]["parameter"]
    out = {"source": "NASA POWER daily, PRECTOTCORR (mm/day) and GWETTOP (surface soil wetness 0-1)",
           "point": POZNAN, "rain": {}, "wet": {}}
    for k, v in p["PRECTOTCORR"].items():
        if v is not None and v > -900:
            out["rain"][f"{k[:4]}-{k[4:6]}-{k[6:]}"] = v
    for k, v in p.get("GWETTOP", {}).items():
        if v is not None and v > -900:
            out["wet"][f"{k[:4]}-{k[4:6]}-{k[6:]}"] = v
    json.dump(out, open(RAW / "power_rain_2026.json", "w"))
    days = sorted(out["rain"])
    print("POWER rain", len(days), days[:1], days[-1:], flush=True)


def fetch_egms():
    """EGMS 2016-2020 vertical velocity from the PIG-PIB image service, exported straight onto our grid."""
    svc = "https://cbdgmapa.pgi.gov.pl/arcgis/rest/services/geozagrozenia/egms_2016_2020_pion/ImageServer"
    info = json.loads(subprocess.run(["curl", "-s", "--max-time", "60", f"{svc}?f=json"], capture_output=True, check=True).stdout)
    print("EGMS service", info.get("pixelType"), info.get("minValues"), info.get("maxValues"), info.get("noDataValue"), flush=True)
    x0, y1 = TR.c, TR.f
    x1, y0 = x0 + TR.a * W, y1 + TR.e * H
    # raw values (signed 8-bit, mm/year; service range -109..29), not the stretched picture the service draws by default
    url = (f"{svc}/exportImage?bbox={x0},{y0},{x1},{y1}&bboxSR=3857&imageSR=3857&size={W},{H}"
           "&format=tiff&pixelType=S8&noData=-128&interpolation=RSP_NearestNeighbor"
           "&renderingRule=%7B%22rasterFunction%22%3A%22None%22%7D&f=image")
    path = RAW / "egms_export.tif"
    subprocess.run(["curl", "-s", "--max-time", "300", "-o", str(path), url], check=True)
    with rasterio.open(path) as src:
        raw = src.read(1)
        print("EGMS export", src.width, src.height, src.dtypes, "nodata", src.nodata, flush=True)
    # the file is tagged uint8 but holds signed bytes: 238 = -18 mm/year; -128 (byte 128) = no data
    a = (raw.astype(np.uint8).view(np.int8) if raw.dtype == np.uint8 else raw).astype(np.float32)
    a[a == -128] = np.nan
    np.savez_compressed(RAW / "egms.npz", v=a, info=json.dumps({k: info.get(k) for k in ("name", "description", "pixelType", "minValues", "maxValues", "noDataValue")}))
    v = a[np.isfinite(a)]
    print("EGMS values", v.size, np.percentile(v, [1, 50, 99]) if v.size else None, flush=True)


def fetch_alos():
    """ALOS-2 PALSAR-2 yearly mosaics: gamma0 dB = 10 log10(DN^2) - 83 (JAXA). RMS resampling averages power."""
    rs = getattr(Resampling, "rms", Resampling.average)
    out = {}
    for year in range(2015, 2022):
        items = list(stac().search(collections=["alos-palsar-mosaic"], bbox=list(BBOX), datetime=f"{year}").items())
        for pol in ("HH", "HV"):
            acc = np.full((H, W), np.nan, np.float32)
            for it in items:
                href = pc.sign(it.assets[pol].href)
                try:
                    v = retry(lambda: warp(href, rs, nodata=0))
                except Exception as e:
                    print("  failed", year, pol, str(e)[:80], flush=True)
                    continue
                v[v <= 0] = np.nan
                acc = np.where(np.isnan(acc), v, acc)
            with np.errstate(all="ignore"):
                out[f"{pol.lower()}_{year}"] = (20 * np.log10(acc) - 83.0).astype(np.float32)
            print("  ALOS", year, pol, len(items), "tiles", f"{np.isfinite(acc).mean():.2f} valid", flush=True)
    np.savez_compressed(RAW / "alos.npz", resampling=rs.name, **out)
    print("saved ALOS", sorted(out), flush=True)


if __name__ == "__main__":
    parts = sys.argv[1:] or ["rain", "egms", "alos", "s1", "s1prev"]
    for p in parts:
        {"s1": fetch_s1_series, "s1prev": fetch_s1_lastyear, "rain": fetch_rain, "egms": fetch_egms, "alos": fetch_alos}[p]()
