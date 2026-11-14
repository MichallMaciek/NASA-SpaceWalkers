"""Forest area and forest loss as true fractions of each 120 m cell.

Hansen / UMD Global Forest Change v1.12 is read at its native 30 m resolution over the study area, then:
  * forest_2000_frac  = share of 30 m pixels with tree cover >= 30 % in 2000 (the usual GFC forest definition)
  * loss_frac[k]      = share of 30 m pixels lost in year 2000 + k (k = 1..24)
Both are averaged onto the 120 m EPSG:3857 grid, so hectares are summed from fractions instead of
counting a whole cell as lost when a single 30 m pixel was cut.

Output: data/raw/forest_frac.npz
"""
import warnings

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject
from rasterio.windows import from_bounds

from common import BBOX, RAW
from fetch_urban import HANSEN, TR, W, H

warnings.filterwarnings("ignore")


def read(kind):
    with rasterio.open(f"/vsicurl/{HANSEN.format(k=kind)}") as ds:
        win = from_bounds(*BBOX, transform=ds.transform).round_offsets().round_lengths()
        return ds.read(1, window=win), ds.window_transform(win), ds.crs


def to_grid(arr, src_tr, src_crs):
    out = np.zeros((H, W), np.float32)
    reproject(arr.astype(np.float32), out, src_transform=src_tr, src_crs=src_crs,
              dst_transform=TR, dst_crs="EPSG:3857", resampling=Resampling.average)
    return out


def main():
    loss, tr, crs = read("lossyear")
    tc, tr2, _ = read("treecover2000")
    forest = to_grid((tc >= 30).astype(np.float32), tr2, crs)
    loss_frac = np.stack([to_grid((loss == k).astype(np.float32), tr, crs) for k in range(1, 25)])
    np.savez_compressed(RAW / "forest_frac.npz", forest_2000_frac=forest, loss_frac=loss_frac.astype(np.float32))
    cell_ha = (abs(TR.a) * np.cos(np.radians(52.4))) ** 2 / 1e4
    print("forest 2000 ha (bbox):", round(float(forest.sum() * cell_ha)),
          "loss ha by year:", [round(float(x.sum() * cell_ha)) for x in loss_frac])


if __name__ == "__main__":
    main()
