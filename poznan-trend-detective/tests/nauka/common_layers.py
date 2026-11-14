"""Shared loaders for the statistics review (tests/nauka). Read-only: decodes the published PNG layers and GeoJSON
with the rules in web/data/land/sar.json "decode" and rebuilds the masks of pipeline/build_sar.py without the raw data.

Run with the review interpreter from the poznan-trend-detective folder or anywhere (paths are absolute from this file).
"""
import json
import math
from pathlib import Path

import numpy as np
import rasterio.features
from affine import Affine
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web" / "data"
LAND = WEB / "land"
R = 6378137.0

land = json.load(open(LAND / "land.json"))
sar = json.load(open(LAND / "sar.json"))
W, H = land["width"], land["height"]
TR = Affine(*land["transform3857"][:6])
THR = round(land["threshold"] * 255)
CELL_HA = land["cell_m_ground"] ** 2 / 1e4


def png(name):
    return np.array(Image.open(LAND / f"{name}.png")).astype(float)


def lin(v, scale, off):  # v/scale - off with 0 = no data
    return np.where(v > 0, v / scale - off, np.nan)


def to3857(coords):
    out = []
    for x, y in coords:
        out.append((R * math.radians(x), R * math.log(math.tan(math.pi / 4 + math.radians(y) / 2))))
    return out


def geom3857(g):
    t = g["type"]
    if t == "Polygon":
        return {"type": t, "coordinates": [to3857(r) for r in g["coordinates"]]}
    if t == "MultiPolygon":
        return {"type": t, "coordinates": [[to3857(r) for r in p] for p in g["coordinates"]]}
    raise ValueError(t)


def rasterize(geoms, all_touched=False):
    shapes = [(geom3857(g), 1) for g in geoms]
    if not shapes:
        return np.zeros((H, W), bool)
    return rasterio.features.rasterize(shapes, out_shape=(H, W), transform=TR, all_touched=all_touched).astype(bool)


def label_rasterize(geoms):
    """each feature gets its own id (1..n); later features overwrite earlier ones on shared cells"""
    shapes = [(geom3857(g), k + 1) for k, g in enumerate(geoms)]
    return rasterio.features.rasterize(shapes, out_shape=(H, W), transform=TR, dtype="int32")


def layers():
    L = {}
    L["study"] = png("study") > 0
    L["change"] = lin(png("sar_change"), 12.75, 10)
    L["dratio"] = lin(png("sar_dratio"), 12.75, 10)
    w = png("sar_water")
    L["water"] = np.where(w > 0, (w - 1) / 254, np.nan)
    r = png("sar_wet")
    L["wet_r"] = np.where(r > 0, (r - 1) / 127 - 1, np.nan)
    e = png("sar_egms")
    L["egms"] = np.where(e > 0, e - 100, np.nan)
    L["nisar_wetdry"] = lin(png("nisar_wetdry"), 12.75, 10)
    L["built_2020"] = png("built_2020")
    L["built_2025"] = png("built_2025")
    L["forest"] = png("forest2000_frac")
    L["p30"] = (png("prob_2030") / 255) ** 2
    L["ok"] = np.isfinite(L["change"]) & np.isfinite(L["dratio"])
    L["up"] = (L["change"] >= 3.0) & L["ok"]
    L["walls"] = L["up"] & (L["dratio"] >= sar["s1"]["wall_db"])
    L["open_land"] = L["study"] & (L["built_2020"] < THR) & (L["forest"] < 0.3 * 255) & (np.nan_to_num(L["water"]) < 0.2)
    wuia = json.load(open(WEB / "wuia_decyzje.geojson", encoding="utf-8"))["features"]
    L["wuia_features"] = wuia
    sel = [f for f in wuia if f["properties"].get("kategoria") == "nowa budowa" and f["properties"].get("status") == "decyzja"
           and str(f["properties"].get("DATA", "")) <= "2026-08-31"]
    L["new_dec_features"] = sel
    L["new_dec"] = rasterize([f["geometry"] for f in sel])
    L["new_dec_id"] = label_rasterize([f["geometry"] for f in sel])
    L["any_case"] = rasterize([f["geometry"] for f in wuia])
    areas = json.load(open(WEB / "areas.geojson", encoding="utf-8"))["features"]
    L["city"] = rasterize([f["geometry"] for f in areas if f["properties"].get("role") == "city"])
    fl = json.load(open(WEB / "podtopienia.geojson", encoding="utf-8"))["features"]
    L["flood"] = rasterize([f["geometry"] for f in fl])
    return L


# ---------- statistics helpers ----------
def wilson(k, n, z=1.959964):
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


def block_ids(shape, b):
    yy, xx = np.indices(shape)
    return (yy // b) * (shape[1] // b + 1) + (xx // b)


def cluster_boot_ratio(hit, a, bref, blocks, nboot=2000, seed=1):
    """ratio of hit shares (a vs bref), resampling whole spatial blocks (cluster bootstrap); returns ratio, 95% CI,
    share of bootstrap ratios <= 1 and the number of blocks with any cell of a"""
    rng = np.random.default_rng(seed)
    ids = blocks[a | bref]
    ha, aa = hit[a | bref] & a[a | bref], a[a | bref]
    hb, bb = hit[a | bref] & bref[a | bref], bref[a | bref]
    u, inv = np.unique(ids, return_inverse=True)
    S = lambda x: np.bincount(inv, weights=x.astype(float), minlength=len(u))
    HA, NA, HB, NB = S(ha), S(aa), S(hb), S(bb)
    r0 = (HA.sum() / NA.sum()) / (HB.sum() / NB.sum())
    rs = []
    for _ in range(nboot):
        k = rng.integers(0, len(u), len(u))
        na, nb = NA[k].sum(), NB[k].sum()
        if na == 0 or HB[k].sum() == 0:
            continue
        rs.append((HA[k].sum() / na) / (HB[k].sum() / nb))
    rs = np.array(rs)
    return r0, np.percentile(rs, [2.5, 97.5]), float((rs <= 1).mean()), int((NA > 0).sum())
