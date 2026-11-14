"""Do the 12 'VV up >= 3 dB' hits on new-building plots come from many plots or a few? (read-only, PIL rasteriser)
Approximates rasterio.features.rasterize(all_touched=False) by filling polygons at cell centres."""
import json, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
LAND = ROOT / "web" / "data" / "land"
L = json.load(open(LAND / "land.json"))
W, H = L["width"], L["height"]
a, _, c, _, e, f = L["transform3857"][:6]
R = 6378137.0


K = 5  # supersampling: a cell counts when its centre sub-pixel is inside (like all_touched=False)


def to_px(lon, lat):
    x = math.radians(lon) * R
    y = math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * R
    return ((x - c) / a * K, (y - f) / e * K)


def raster(feats):
    out = np.zeros((H, W), np.int32)
    for idx, ft in enumerate(feats, 1):
        img = Image.new("I", (W * K, H * K), 0)
        d = ImageDraw.Draw(img)
        for poly in ft["geometry"]["coordinates"]:
            d.polygon([to_px(*p[:2]) for p in poly[0]], fill=idx)
            for hole in poly[1:]:
                d.polygon([to_px(*p[:2]) for p in hole], fill=0)
        m = np.array(img)[K // 2::K, K // 2::K]
        out = np.where(m > 0, m, out)
    return out


g = json.load(open(ROOT / "web" / "data" / "wuia_decyzje.geojson", encoding="utf-8"))["features"]
sel = [ft for ft in g if ft["properties"].get("kategoria") == "nowa budowa" and ft["properties"].get("status") == "decyzja"
       and str(ft["properties"].get("DATA", "")) <= "2026-08-31"]
lab = raster(sel)
ch = np.array(Image.open(LAND / "sar_change.png")).astype(float)
dr = np.array(Image.open(LAND / "sar_dratio.png")).astype(float)
change = np.where(ch > 0, ch / 12.75 - 10, np.nan)
dratio = np.where(dr > 0, dr / 12.75 - 10, np.nan)
up = change >= 3
walls = up & (dratio >= 1.5)
m = lab > 0
print("decisions", len(sel), "cells", int(m.sum()), "hits up", int((up & m).sum()), "walls", int((walls & m).sum()))
plots = sorted(set(lab[up & m].tolist()))
print("distinct decision polygons with an 'up' hit:", len(plots))
lab_cc, ncc = ndimage.label(up & m)
print("connected clusters of hit cells:", ncc, "sizes", sorted(np.bincount(lab_cc.ravel())[1:].tolist(), reverse=True))
for p in plots:
    pr = sel[p - 1]["properties"]
    print("  ", pr["DATA"], pr["NR_DZIALKI"], "|", pr["OPIS"][:90], "| hits", int((up & (lab == p)).sum()), "of", int((lab == p).sum()))
