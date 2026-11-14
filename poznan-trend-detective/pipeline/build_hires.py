"""Sharp radar pictures for the map: the same products as build_sar.py, on a grid 3x finer than the app grid.

The app grid is 120 m in Web Mercator (about 73 m on the ground), which is right for statistics but blurs the
picture: NISAR GCOV is 20 m, Sentinel-1 RTC 10 m, ALOS-2 mosaics 25 m. Here every display product is rebuilt at
40 m Web Mercator (about 24 m on the ground, close to the native NISAR and ALOS-2 pixel). The numbers in the card
still come from the 120 m products; these files only replace what is drawn.

To stay inside the hosting budget (tests/data_contract.py: web/data under 40 MB) the sharp pictures cover a window
only: Poznan city and about 0.9 km around it, where people zoom in to street level. Outside it the app draws the
120 m grid. Grey levels are rounded before PNG compression (display only): dB layers and the change to 4 levels,
the wall test to two levels (wall / no wall). The app fetches a sharp file only when the map is zoomed in on the window.

Products (grey-level PNGs in web/data/land/, same encodings as build_sar.py, prefix "hr_"):
  hr_sar_change, hr_sar_dratio     Sentinel-1 VV change autumn 2026 vs autumn 2025 and its co/cross ratio change
  hr_alos_hh_<y>, hr_alos_hv_<y>   ALOS-2 L-band yearly mosaics
  hr_nisar_hh_med, hr_nisar_hv_med, hr_nisar_wetdry   NISAR GCOV, needs a NASA Earthdata login (~/.netrc)
web/data/land/hires.json lists what exists, so the app can fall back to the 120 m picture.

Usage: python build_hires.py [s1] [alos] [nisar]     (no argument = all three)
"""
import json
import sys
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import rasterio
from affine import Affine
from PIL import Image
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT

from common import BBOX, RAW, WEB_DATA

OUT = WEB_DATA / "land"
SCALE = 3
MARGIN = 12        # cells of the 120 m grid kept around the city (about 0.9 km)
WALL_DB = 1.5      # as in build_sar.py: co/cross ratio rise that marks a double-bounce change
land = json.load(open(OUT / "land.json"))
t = land["transform3857"]


def city_window():
    """Bounding box of the city of Poznan plus MARGIN, in cells of the app grid: column, row, width, height."""
    import math
    R = 6378137.0
    merc = lambda lat, lon: (R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))
    city = [f for f in json.load(open(WEB_DATA / "areas.geojson"))["features"] if f["properties"].get("role") == "city"][0]
    g = city["geometry"]
    pts = [p for ring in g["coordinates"] for p in ring] if g["type"] == "Polygon" else [p for poly in g["coordinates"] for ring in poly for p in ring]
    x0, y1 = merc(max(p[1] for p in pts), min(p[0] for p in pts))
    x1, y0 = merc(min(p[1] for p in pts), max(p[0] for p in pts))
    c0 = max(0, int((x0 - t[2]) // t[0]) - MARGIN); c1 = min(land["width"], int(math.ceil((x1 - t[2]) / t[0])) + MARGIN)
    r0 = max(0, int((y1 - t[5]) // t[4]) - MARGIN); r1 = min(land["height"], int(math.ceil((y0 - t[5]) / t[4])) + MARGIN)
    return [c0, r0, c1 - c0, r1 - r0]


WINDOW = city_window()
W, H = WINDOW[2] * SCALE, WINDOW[3] * SCALE
TR = Affine(t[0] / SCALE, 0.0, t[2] + WINDOW[0] * t[0], 0.0, t[4] / SCALE, t[5] + WINDOW[1] * t[4])
S1_ORBIT = 73
Image.MAX_IMAGE_PIXELS = None


def study_hr():
    st = np.array(Image.open(OUT / "study.png")) > 0
    c0, r0, cw, ch = WINDOW
    return np.repeat(np.repeat(st[r0:r0 + ch, c0:c0 + cw], SCALE, 0), SCALE, 1)


def quant(a, q=4):
    """Round grey levels to steps of q (0 stays 'no data'): the noisy radar texture then compresses about a third better."""
    return np.where(a > 0, np.clip(np.round(a / q) * q, q, 255 - (255 % q)), 0)


def png(name, arr):
    a = np.clip(np.nan_to_num(arr, nan=0), 0, 255).round().astype(np.uint8)
    Image.fromarray(a, mode="L").save(OUT / f"hr_{name}.png", optimize=True)
    print("  wrote", f"hr_{name}.png", a.shape, f"{(OUT / f'hr_{name}.png').stat().st_size / 1e6:.1f} MB", flush=True)


def enc_db(db):  # -30..12.5 dB in 1/6 dB steps; 0 = no data
    return np.where(np.isfinite(db), np.clip((db + 30) * 6, 1, 255), 0)


def enc_change(d):  # -10..+10 dB; 0 = no data
    return np.where(np.isfinite(d), np.clip((d + 10) * 12.75, 1, 255), 0)


def retry(fn, tries=4):
    for a in range(tries):
        try:
            return fn()
        except Exception as e:  # network hiccups on large COG reads
            err = e
            time.sleep(5 * (a + 1))
    raise err


def warp(href, resampling, level=None, nodata=0):
    kw = {"overview_level": level} if level is not None else {}
    with rasterio.open(href, **kw) as src:
        with WarpedVRT(src, crs="EPSG:3857", transform=TR, width=W, height=H, resampling=resampling, src_nodata=nodata) as vrt:
            return vrt.read(1).astype(np.float32)


def stac():
    import pystac_client
    return pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")


def s1_median(period, study):
    """Median dB of every pass of the orbit in the period, VV and VH, read at 20 m (overview 1) and power-averaged."""
    import planetary_computer as pc
    items = [i for i in stac().search(collections=["sentinel-1-rtc"], bbox=list(BBOX), datetime=period).items()
             if i.properties.get("sat:relative_orbit") == S1_ORBIT]
    by_date = defaultdict(list)
    for i in items:
        by_date[i.datetime.date().isoformat()].append(i)
    dates = sorted(by_date)
    print("S1", period, len(items), "scenes on", len(dates), "dates", flush=True)

    def one(job):
        d, pol = job
        acc, n = np.zeros((H, W), np.float32), np.zeros((H, W), np.uint8)
        for it in by_date[d]:
            try:
                v = retry(lambda: warp(pc.sign(it.assets[pol].href), Resampling.average, level=0))
            except Exception as e:
                print("  failed", d, pol, str(e)[:80], flush=True)
                continue
            ok = np.isfinite(v) & (v > 0)
            acc[ok] += v[ok]
            n[ok] += 1
        with np.errstate(all="ignore"):
            db = np.where(n > 0, 10 * np.log10(acc / np.maximum(n, 1)), np.nan).astype(np.float32)
        cover = float(np.isfinite(db[study]).mean())
        print("  ", d, pol, f"{cover:.2f} valid", flush=True)
        return d, pol, db, cover

    out = {}
    for pol in ("vv", "vh"):
        with ThreadPoolExecutor(4) as ex:
            res = [r for r in ex.map(one, [(d, pol) for d in dates]) if r[3] > 0.9]
        used = [r[0] for r in res]
        with np.errstate(all="ignore"):
            out[pol] = np.nanmedian(np.stack([r[2] for r in res]), 0)
        out["dates"] = used
        del res
    return out


def do_s1(study, meta):
    now = s1_median("2026-09-01/2026-11-14", study)
    prev = s1_median("2025-09-01/2025-11-14", study)
    change = now["vv"] - prev["vv"]
    dratio = change - (now["vh"] - prev["vh"])
    png("sar_change", quant(np.where(study, enc_change(change), 0)))
    # the app only asks "wall or not" of this layer: two levels (200 = wall, 100 = no wall) compress to a tenth
    png("sar_dratio", np.where(study & np.isfinite(dratio), np.where(dratio >= WALL_DB, 200, 100), 0))
    meta["layers"] += ["sar_change", "sar_dratio"]
    meta["s1"] = {"now": now["dates"], "before": prev["dates"], "read": "RTC overview 0 (20 m), power-averaged to the grid"}


def do_alos(study, meta):
    import planetary_computer as pc
    rs = getattr(Resampling, "rms", Resampling.average)
    for year in range(2015, 2022):
        items = list(stac().search(collections=["alos-palsar-mosaic"], bbox=list(BBOX), datetime=f"{year}").items())
        for pol in ("HH", "HV"):
            acc = np.full((H, W), np.nan, np.float32)
            for it in items:
                try:
                    v = retry(lambda: warp(pc.sign(it.assets[pol].href), rs))
                except Exception as e:
                    print("  failed", year, pol, str(e)[:80], flush=True)
                    continue
                v[v <= 0] = np.nan
                acc = np.where(np.isnan(acc), v, acc)
            with np.errstate(all="ignore"):
                db = 20 * np.log10(acc) - 83.0
            name = f"alos_{pol.lower()}_{year}"
            png(name, quant(np.where(study, enc_db(db), 0)))
            meta["layers"].append(name)


def do_nisar(study, meta):
    """NISAR GCOV HH/HV at 20 m on the fine grid. Same pass list and reader as fetch_nisar.py."""
    import fetch_nisar as fn
    import h5py
    rows = fn.passes(158, "provisional")
    hh, hv, dates = [], [], []
    for r in rows:
        try:
            a, b = retry(lambda: fn.read_hires(r, TR, W, H), tries=2)
        except Exception as e:
            print("  failed", r["data"], str(e)[:120], flush=True)
            continue
        hh.append(a); hv.append(b); dates.append(r["data"])
        print("  NISAR", r["data"], f"{np.isfinite(a[study]).mean():.2f} valid", flush=True)
    if not dates:
        raise SystemExit("no NISAR pass could be read; check ~/.netrc (machine urs.earthdata.nasa.gov)")
    nd = sorted(set(dates))
    with np.errstate(all="ignore"):
        mh = np.stack([np.nanmean(np.stack([hh[k] for k, d in enumerate(dates) if d == x]), 0) for x in nd])
        mv = np.stack([np.nanmean(np.stack([hv[k] for k, d in enumerate(dates) if d == x]), 0) for x in nd])
        dbh, dbv = 10 * np.log10(mh), 10 * np.log10(mv)
        png("nisar_hh_med", quant(np.where(study, enc_db(np.nanmedian(dbh, 0)), 0)))
        png("nisar_hv_med", quant(np.where(study, enc_db(np.nanmedian(dbv, 0)), 0)))
    meta["layers"] += ["nisar_hh_med", "nisar_hv_med"]
    dry_d, wet_d = "2026-06-25", "2026-08-24"
    if dry_d in nd and wet_d in nd:
        # open land = where the 120 m product has a value (built-up, forest and water were masked there)
        lo = np.array(Image.open(OUT / "nisar_wetdry.png")) > 0
        c0, r0, cw, ch = WINDOW
        open_land = np.repeat(np.repeat(lo[r0:r0 + ch, c0:c0 + cw], SCALE, 0), SCALE, 1)
        dwet = dbh[nd.index(wet_d)] - dbh[nd.index(dry_d)]
        png("nisar_wetdry", quant(np.where(open_land & study, enc_change(dwet), 0)))
        meta["layers"].append("nisar_wetdry")
    meta["nisar"] = {"dates": nd, "track": 158, "version": "provisional"}


def main():
    what = set(sys.argv[1:]) or {"s1", "alos", "nisar"}
    mp = OUT / "hires.json"
    meta = json.load(open(mp)) if mp.exists() else {"layers": []}
    meta.update({"scale": SCALE, "window": WINDOW, "width": W, "height": H, "cell_m_ground": round(land["cell_m_ground"] / SCALE, 1),
                 "note": "sharp pictures cover the window only (Poznan city and about 0.9 km around it, in cells of the 120 m grid: "
                         "column, row, width, height); outside it the app draws the 120 m grid",
                 "quant": {"alos": 4, "nisar": 4, "sar_change": 4, "sar_dratio": "two levels: 200 = wall (ratio change >= 1.5 dB), 100 = no wall",
                           "why": "grey levels rounded before PNG compression: display only"}})
    study = study_hr()
    for k, fn in (("alos", do_alos), ("s1", do_s1), ("nisar", do_nisar)):
        if k in what:
            fn(study, meta)
            meta["layers"] = sorted(set(meta["layers"]))
            json.dump(meta, open(mp, "w"), indent=1)
    print("hires.json", meta["layers"])


if __name__ == "__main__":
    main()
