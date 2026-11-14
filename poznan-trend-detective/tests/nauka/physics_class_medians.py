"""Physics review: cell size, EGMS coverage by land class, NISAR minus ALOS-2 offset by class, class medians.
Usage: python -I physics_class_medians.py <path to poznan-trend-detective>  (reads web/data/land PNGs only)"""
import json, sys, math
import numpy as np
from PIL import Image
from scipy import stats
D = sys.argv[1] + "/web/data/land/"
L = lambda n: np.array(Image.open(D + n + ".png")).astype(float)
s = json.load(open(D + "sar.json")); land = json.load(open(D + "land.json"))
study = L("study") > 0
thr = round(land["threshold"] * 255)
built = L("built_2020"); forest = L("forest2000_frac")
water = np.where(L("sar_water") > 0, (L("sar_water") - 1) / 254, np.nan)
open_land = study & (built < thr) & (forest < 0.3 * 255) & (np.nan_to_num(water) < 0.2)
# cell size
lat = 52.415
print("cell ground m at lat %.2f: %.1f (land.json %.1f)" % (lat, 120 * math.cos(math.radians(lat)), land["cell_m_ground"]))
# EGMS: share of measured cells that are built-up
eg = L("sar_egms"); egm = (eg > 0) & study
print("EGMS cells", egm.sum(), "share of study", round(egm.sum() / study.sum(), 3))
print("EGMS cells built_2020>=thr share", round((egm & (built >= thr)).sum() / egm.sum(), 3),
      "| built share of study", round((study & (built >= thr)).sum() / study.sum(), 3),
      "| EGMS cells that are open_land", round((egm & open_land).sum() / egm.sum(), 3),
      "| EGMS coverage of built", round((egm & (built >= thr)).sum() / (study & (built >= thr)).sum(), 3),
      "| EGMS coverage of open", round((egm & open_land).sum() / open_land.sum(), 3))
v = eg[egm] - 100
print("EGMS unique values (first 15)", np.unique(v)[:15], "fraction == 0:", round((v == 0).mean(), 3), "| |v|<=1:", round((abs(v) <= 1).mean(), 3))
# ALOS vs NISAR offset by class
db = lambda a: np.where(a > 0, a / 6 - 30, np.nan)
hh_n, hv_n = db(L("nisar_hh_med")), db(L("nisar_hv_med"))
fo = forest > 200
cls = {"built": study & (built >= thr), "forest": study & fo, "open": open_land, "study": study}
for y in (2015, 2019, 2020, 2021):
    hh_a, hv_a = db(L(f"alos_hh_{y}")), db(L(f"alos_hv_{y}"))
    out = []
    for c, m in cls.items():
        out.append(f"{c}: dHH {np.nanmedian(hh_n[m]-hh_a[m]):+.2f} dHV {np.nanmedian(hv_n[m]-hv_a[m]):+.2f}")
    print("NISAR-ALOS", y, " | ".join(out))
for y in (2015, 2021):
    hh_a, hv_a = db(L(f"alos_hh_{y}")), db(L(f"alos_hv_{y}"))
    print("ALOS", y, {c: (round(float(np.nanmedian(hh_a[m])), 2), round(float(np.nanmedian(hv_a[m])), 2)) for c, m in cls.items()})
print("NISAR med", {c: (round(float(np.nanmedian(hh_n[m])), 2), round(float(np.nanmedian(hv_n[m])), 2)) for c, m in cls.items()})
# C-band VH built vs forest, VV
vv, vh = db(L("sar_vv_med")), db(L("sar_vh_med"))
print("S1 med", {c: (round(float(np.nanmedian(vv[m])), 2), round(float(np.nanmedian(vh[m])), 2)) for c, m in cls.items()})
