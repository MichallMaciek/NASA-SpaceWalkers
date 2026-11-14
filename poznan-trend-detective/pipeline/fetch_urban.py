"""Download the land-change layers onto one Web Mercator grid (EPSG:3857, 120 m cells).

Layers (all anonymous, no login):
  * Built-up surface 1975-2020, every 5 years: JRC GHSL GHS-BUILT-S R2023A (Landsat + Sentinel-2 based),
    3 arc-second tiles.
  * Forest loss 2001-2024 and tree cover in 2000: Hansen / UMD Global Forest Change v1.12 (Landsat, 30 m).
  * Terrain height: Copernicus DEM GLO-30 (from the TanDEM-X radar mission), via Microsoft Planetary Computer.
  * Radar brightness: Sentinel-1 RTC, VV backscatter, summer median for 2017, 2020 and 2024 (Planetary Computer).
  * Major roads: OpenStreetMap via the Overpass API (motorway to secondary).
  * Housing prices and wages: GUS Bank Danych Lokalnych, powiat level.

Output: data/raw/urban_grid.npz, data/raw/roads.json, data/raw/gus_prices.json
"""
import json
import time
import urllib.parse
import urllib.request
import warnings
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import planetary_computer as pc
import pystac_client
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.vrt import WarpedVRT
from rasterio.warp import transform_bounds

from common import BBOX, RAW, USER_AGENT

warnings.filterwarnings("ignore")

RES = 120.0  # metres in EPSG:3857 (about 73 m on the ground at 52.4 N)
GHSL = ("https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_BUILT_S_GLOBE_R2023A/"
        "GHS_BUILT_S_E{y}_GLOBE_R2023A_4326_3ss/V1-0/tiles/GHS_BUILT_S_E{y}_GLOBE_R2023A_4326_3ss_V1_0_R4_C20.zip")
HANSEN = "https://storage.googleapis.com/earthenginepartners-hansen/GFC-2024-v1.12/Hansen_GFC-2024-v1.12_{k}_60N_010E.tif"
EPOCHS = list(range(1975, 2025, 5))  # observed epochs 1975-2020


def grid():
    x0, y0, x1, y1 = transform_bounds("EPSG:4326", "EPSG:3857", *BBOX)
    w, h = int(np.ceil((x1 - x0) / RES)), int(np.ceil((y1 - y0) / RES))
    return from_origin(x0, y1, RES, RES), w, h


TR, W, H = grid()


def warp(src_path, resampling, band=1, nodata=None):
    with rasterio.open(src_path) as src:
        with WarpedVRT(src, crs="EPSG:3857", transform=TR, width=W, height=H,
                       resampling=resampling, src_nodata=nodata if nodata is not None else src.nodata) as vrt:
            return vrt.read(band).astype(np.float32)


def fetch_ghsl():
    def one(y):
        url = GHSL.format(y=y)
        name = url.rsplit("/", 1)[1].replace(".zip", ".tif")
        for a in range(3):
            try:
                # GHSL value = built-up m2 in a ~92 x 57 m cell; average then convert to a fraction.
                arr = warp(f"/vsizip//vsicurl/{url}/{name}", Resampling.average)
                return y, arr
            except Exception as e:
                err = e
                time.sleep(3)
        raise err
    with ThreadPoolExecutor(4) as ex:
        res = dict(ex.map(one, EPOCHS))
    lat = np.radians(52.4)
    cell = (3 / 3600 * np.pi / 180 * 6371007) ** 2 * np.cos(lat)
    built = np.stack([np.clip(res[y] / cell, 0, 1) for y in EPOCHS])
    print("GHSL", built.shape, [round(float(b.mean()), 4) for b in built], flush=True)
    return built


def fetch_hansen():
    tc = warp(f"/vsicurl/{HANSEN.format(k='treecover2000')}", Resampling.average)
    # max on loss year = the latest year any 30 m pixel in the cell lost its trees (0 = no loss)
    lossmax = warp(f"/vsicurl/{HANSEN.format(k='lossyear')}", Resampling.max)
    print("Hansen", float((lossmax > 0).mean()), float(tc.mean()), flush=True)
    return None, lossmax, tc


def stac():
    return pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1", modifier=pc.sign_inplace)


def fetch_dem():
    items = list(stac().search(collections=["cop-dem-glo-30"], bbox=list(BBOX)).items())
    out = np.full((H, W), np.nan, np.float32)
    for it in items:
        a = warp(it.assets["data"].href, Resampling.average)
        # Outside its own 1x1 degree tile the warp returns 0, not NaN; terrain here is always 40-160 m,
        # so treat <= 0 as no data, otherwise the first tile blanks out the second (bug found 14.11).
        a[a <= 0] = np.nan
        out = np.where(np.isnan(out), a, out)
    print("DEM", len(items), float(np.nanmin(out)), float(np.nanmax(out)), flush=True)
    return out


def fetch_s1(year):
    items = list(stac().search(collections=["sentinel-1-rtc"], bbox=list(BBOX),
                               datetime=f"{year}-06-01/{year}-08-31").items())
    # keep one orbit direction to limit geometry differences
    asc = [i for i in items if i.properties.get("sat:orbit_state") == "ascending"]
    items = (asc if len(asc) >= 4 else items)[:14]

    def one(it):
        try:
            a = warp(it.assets["vv"].href, Resampling.average, nodata=0)
            a[a <= 0] = np.nan
            return a
        except Exception:
            return None
    with ThreadPoolExecutor(6) as ex:
        arrs = [a for a in ex.map(one, items) if a is not None]
    stack = np.stack(arrs)
    with np.errstate(all="ignore"):
        med = np.nanmedian(stack, axis=0)
    db = 10 * np.log10(med)
    print("S1", year, len(arrs), float(np.nanpercentile(db, 5)), float(np.nanpercentile(db, 95)), flush=True)
    return db


def fetch_roads():
    s, w, n, e = BBOX[1], BBOX[0], BBOX[3], BBOX[2]
    cache = RAW / "overpass_roads.json"
    if cache.exists():  # the public Overpass server rate-limits repeated queries
        d = json.load(open(cache))
    else:
        q = (f'[out:json][timeout:90];way["highway"~"^(motorway|trunk|primary)$"]({s},{w},{n},{e});'
             "out geom;")
        # curl instead of urllib: the system Python's LibreSSL cannot negotiate with overpass-api.de
        import subprocess
        raw = subprocess.run(["curl", "-s", "--max-time", "180", "-A", USER_AGENT, "--data-urlencode", f"data={q}",
                              "https://overpass-api.de/api/interpreter"], capture_output=True, check=True).stdout
        cache.write_bytes(raw)
        d = json.loads(raw)
    ways = [{"hw": el.get("tags", {}).get("highway"), "c": [[p["lon"], p["lat"]] for p in el["geometry"]]}
            for el in d["elements"] if el.get("geometry")]
    json.dump(ways, open(RAW / "roads.json", "w"))
    print("roads", len(ways), flush=True)


def bdl(path):
    req = urllib.request.Request("https://bdl.stat.gov.pl/api/v1/" + path,
                                 headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    out = json.loads(urllib.request.urlopen(req, timeout=60).read())
    time.sleep(0.7)
    return out


def fetch_prices():
    units = {"Poznań (city)": "023016264000", "Powiat poznański": "023016121000", "Polska": "000000000000"}
    out = {"units": units, "variables": {}, "data": {}}
    wanted = {}
    for subj in ("P3787", "P3891"):
        for v in bdl(f"variables?subject-id={subj}&format=json&page-size=50")["results"]:
            label = " | ".join(x for x in (v.get("n1"), v.get("n2"), v.get("n3")) if x)
            wanted[str(v["id"])] = f"{subj}: {label}"
    # average gross monthly wage, powiat level (BDL subject P2497, variable 64428)
    wanted["64428"] = "wage: przeciętne miesięczne wynagrodzenia brutto, ogółem (zł)"
    out["variables"] = wanted
    for name, uid in units.items():
        out["data"][name] = {}
        ids = list(wanted)
        for k in range(0, len(ids), 20):
            q = "&".join(f"var-id={i}" for i in ids[k:k + 20])
            try:
                d = bdl(f"data/by-unit/{uid}?{q}&format=json&page-size=100")
            except Exception as e:
                print("BDL error", name, e)
                continue
            for r in d.get("results", []):
                out["data"][name][str(r["id"])] = {v["year"]: v["val"] for v in r["values"]}
        print("prices", name, len(out["data"][name]), flush=True)
    json.dump(out, open(RAW / "gus_prices.json", "w"), ensure_ascii=False)


def fetch_nisar_dates():
    """Dates of NISAR GCOV acquisitions over Poznań (ASF archive search, no login)."""
    import subprocess
    url = ("https://api.daac.asf.alaska.edu/services/search/param?dataset=NISAR&processingLevel=GCOV"
           "&intersectsWith=POINT(16.93%2052.41)&start=2026-06-17&output=jsonlite&maxResults=500")
    r = json.loads(subprocess.run(["curl", "-s", "--max-time", "60", url], capture_output=True, check=True).stdout)["results"]
    dates = sorted({x["startTime"][:10] for x in r})
    json.dump(dates, open(RAW / "nisar_dates.json", "w"))
    print("NISAR dates", len(dates), flush=True)


def main():
    fetch_nisar_dates()
    fetch_roads()
    fetch_prices()
    built = fetch_ghsl()
    loss_mode, loss_max, tc = fetch_hansen()
    dem = fetch_dem()
    s1 = {y: fetch_s1(y) for y in (2017, 2020, 2024)}
    np.savez_compressed(RAW / "urban_grid.npz", transform=np.array(TR)[:6], width=W, height=H,
                        epochs=np.array(EPOCHS), built=built.astype(np.float32),
                        loss_year=loss_max.astype(np.uint8), treecover2000=tc.astype(np.float32),
                        dem=dem, s1_2017=s1[2017], s1_2020=s1[2020], s1_2024=s1[2024])
    print("saved urban grid", W, H)


if __name__ == "__main__":
    main()
