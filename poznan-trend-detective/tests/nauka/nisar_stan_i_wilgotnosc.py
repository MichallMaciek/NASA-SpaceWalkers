"""Night test 2 (15 Nov 2026): three other uses of NISAR.

(1) NISAR as a map of today's built-up state (works: AUC 0.95 against the optical map of 2020),
(2) L-band change ALOS-2 2021 -> NISAR 2026 (too noisy, not specific),
(3) NISAR soil moisture (SME2) against flood-prone areas (no signal).
The p values here treat cells as independent. Method note: docs/przeglad-v2/RADAR_LATA.md.

Run from poznan-trend-detective/ (the third argument is the folder with the downloaded NISAR files):
  .venv/bin/python -I tests/nauka/nisar_stan_i_wilgotnosc.py web data/raw/radar/nisar_features.npz <sar folder>
"""
import sys, json, glob, re
import numpy as np, rasterio, rasterio.features
from affine import Affine
from PIL import Image
from rasterio.enums import Resampling
from rasterio.warp import transform_geom, reproject
from scipy import stats, ndimage
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

web, feats, root = sys.argv[1:4]
L = web + "/data/land/"
land = json.load(open(L + "land.json"))
W, H = land["width"], land["height"]; TR = Affine(*land["transform3857"][:6]); THR = land["threshold"]
png = lambda n: np.array(Image.open(L + n + ".png")).astype(float)
def db(n):
    v = png(n); return np.where(v > 0, v / 6 - 30, np.nan)
v = png("sar_change"); s1_change = np.where(v > 0, v / 12.75 - 10, np.nan)
v = png("sar_dratio"); s1_dratio = np.where(v > 0, v / 12.75 - 10, np.nan)
ok = np.isfinite(s1_change) & np.isfinite(s1_dratio)
s1_walls = ok & (s1_change >= 3) & (s1_dratio >= 1.5)
p30 = (png("prob_2030") / 255) ** 2
b20, b25, b15 = png("built_2020") / 255, png("built_2025") / 255, png("built_2015") / 255
tree = png("treecover2000") / 255
study = png("study") > 0
N = dict(np.load(feats, allow_pickle=True))
with np.errstate(all="ignore"):
    hh, hv = 10 * np.log10(N["hh_mean"]), 10 * np.log10(N["hv_mean"])
wuia = json.load(open(web + "/data/wuia_decyzje.geojson", encoding="utf-8"))
def mask(pred):
    shapes = [(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1) for f in wuia["features"] if pred(f["properties"])]
    return rasterio.features.rasterize(shapes, out_shape=(H, W), transform=TR, all_touched=False).astype(bool)
new_dec = mask(lambda p: p.get("kategoria") == "nowa budowa" and p.get("status") == "decyzja" and str(p.get("DATA", "")) <= "2026-08-31")
any_case = mask(lambda p: True)
city = np.zeros((H, W), bool)
for f in json.load(open(web + "/data/areas.geojson", encoding="utf-8"))["features"]:
    if f["properties"].get("role") == "city":
        city |= rasterio.features.rasterize([(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1)], out_shape=(H, W), transform=TR).astype(bool)
def compare(a, b, hit):
    ka, na, pb = int(hit[a].sum()), int(a.sum()), float(hit[b].mean())
    p = float(stats.binomtest(ka, na, pb, alternative="greater").pvalue) if na and 0 < pb < 1 else float("nan")
    return f"cells {na:6d} hits {ka:5d} | {ka/max(na,1):.4f} vs {pb:.4f} | ratio {(ka/max(na,1))/max(pb,1e-9):5.2f} | p {p:.3g}"
rr, cc = np.indices((H, W)); block = (rr // 16) * 1000 + (cc // 16)

print("=== (1) NISAR as today's built-up map ===")
F = np.column_stack([a[study] for a in (hh, hv, hh - hv, N["coh_mean"], N["coh_min"], N["hh_std_db"], N["coh_l_max"])])
y = (b20[study] >= THR).astype(int); g = block[study]
oof = np.zeros(len(y))
for tr, te in GroupKFold(5).split(F, y, g):
    mdl = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000)); mdl.fit(F[tr], y[tr]); oof[te] = mdl.predict_proba(F[te])[:, 1]
print(f"  NISAR (HH, HV, coherence) vs GHSL built 2020: AUC {roc_auc_score(y, oof):.3f}; built share of study {y.mean():.3f}")
for name, a in (("HH level", hh), ("HV level", hv), ("coherence mean", N["coh_mean"]), ("coherence min", N["coh_min"])):
    print(f"    single: {name:15s} AUC {roc_auc_score(y, a[study]):.3f}")
pn = np.zeros((H, W)); pn[study] = oof
cut = np.quantile(oof, 1 - y.mean())            # same built area as GHSL 2020
nb = pn >= cut
print(f"  agreement at equal area: {((nb[study]) == (y == 1)).mean():.3f}; of GHSL-built cells NISAR also says built: {nb[study][y == 1].mean():.3f}")
open20 = study & (b20 < THR)
cand = open20 & nb                                # NISAR says built, the 2020 map says open
strong = open20 & (pn >= np.quantile(oof, 1 - y.mean() / 2))
print(f"  cells NISAR calls built that were open in 2020: {int(cand.sum())} ({cand.sum() * 0.53:.0f} ha); strong ones: {int(strong.sum())}")
rest = open20 & ~cand
print("  ...do they carry Sentinel-1 new walls?     ", compare(cand & ok, rest & ok, s1_walls))
print("  ...did GHSL built share grow 2015->2020?    ", compare(cand, rest, (b20 - b15) >= 0.03))
top = open20 & (p30 >= np.quantile(p30[open20], 0.95))
print("  ...are they where the forecast is highest?  ", compare(cand, rest, top))
print("  decision cells vs rest of city (open in 2020 only):", compare(new_dec & open20, city & open20 & ~any_case, cand))
print("  decision cells vs rest of city (all cells): NISAR-built", compare(new_dec, city & ~any_case, nb))
print("  decision cells vs rest of city (all cells): GHSL-built ", compare(new_dec, city & ~any_case, b20 >= THR))

print("\n=== (2) L-band change: ALOS-2 mosaic 2021 -> NISAR 2026 (same band, HH and HV) ===")
a_hh, a_hv = db("alos_hh_2021"), db("alos_hv_2021"); a19 = db("alos_hh_2019")
stable = study & (b15 >= 0.5) & np.isfinite(a_hh)
off_hh = float(np.nanmedian((hh - a_hh)[stable])); off_hv = float(np.nanmedian((hv - a_hv)[stable]))
print(f"  offset on long-built cells: HH {off_hh:+.2f} dB, HV {off_hv:+.2f} dB (removed)")
d_hh = hh - a_hh - off_hh; d_hv = hv - a_hv - off_hv; okL = np.isfinite(d_hh) & np.isfinite(d_hv)
print(f"  spread of the difference on long-built cells: {np.nanstd(d_hh[stable]):.2f} dB; on open land: {np.nanstd(d_hh[open20 & okL]):.2f} dB")
ctrl = a_hh - a19                                  # ALOS-2 against itself, 2019 -> 2021
for thr in (3, 4, 5):
    up = okL & (d_hh >= thr); walls = up & ((d_hh - d_hv) >= 1.5)
    print(f"  HH up >= {thr} dB: share of open land {up[open20].mean():.4f}")
    print("     decisions vs rest of city     ", compare(new_dec & okL, city & okL & ~any_case, up))
    print("     ...with ratio rise (walls)    ", compare(new_dec & okL, city & okL & ~any_case, walls))
    print("     forecast top 5% vs other open ", compare(top & okL, open20 & ~top & okL, up))
    print("     Sentinel-1 walls there?       ", compare(up & open20 & ok, open20 & ~up & ok & okL, s1_walls))
upc = np.isfinite(ctrl) & (ctrl >= 3)
print("  control, ALOS-2 2019 -> 2021 >= 3 dB: decisions vs rest", compare(new_dec & np.isfinite(ctrl), city & np.isfinite(ctrl) & ~any_case, upc))

print("\n=== (3) NISAR soil moisture (SME2, 200 m) vs flood-prone areas ===")
sm = []
seen = set()
for p in sorted(glob.glob(root + "/nisar_sme2/*_soilmoisture_200m.tif")):
    d = re.search(r"_(\d{8})T", p).group(1)
    if d in seen: continue
    seen.add(d)
    with rasterio.open(p) as s:
        a = s.read(1).astype(np.float32); a[a == s.nodata] = np.nan
        dst = np.full((H, W), np.nan, np.float32)
        reproject(a, dst, src_transform=s.transform, src_crs=s.crs, dst_transform=TR, dst_crs="EPSG:3857", resampling=Resampling.bilinear, src_nodata=np.nan, dst_nodata=np.nan)
    sm.append(dst)
sm = np.stack(sm); dates = sorted(seen)
print("  dates", dates)
fl = json.load(open(web + "/data/podtopienia.geojson", encoding="utf-8"))
flood = rasterio.features.rasterize([(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1) for f in fl["features"]], out_shape=(H, W), transform=TR).astype(bool)
dem = png("dem") / 2 + land["dem_offset"]
low = dem - ndimage.uniform_filter(dem, 25)        # height relative to the ~1.8 km surroundings
valid = study & np.isfinite(sm).all(0) & (b20 < THR)
print(f"  open cells with soil moisture on all dates: {int(valid.sum())}; of them flood-prone: {int((valid & flood).sum())} ({(valid & flood).sum() / valid.sum():.3f})")
mean_sm = sm.mean(0); dry3 = np.sort(sm, 0)[:3].mean(0)
rank = np.zeros_like(sm)
for i in range(len(sm)):
    r = np.full((H, W), np.nan); r[valid] = stats.rankdata(sm[i][valid]) / valid.sum(); rank[i] = r
persist = rank.mean(0); wet_always = (rank >= 0.8).all(0)
yv = flood[valid].astype(int)
for name, a in (("mean soil moisture", mean_sm), ("mean of 3 driest dates", dry3), ("mean wetness rank", persist), ("drop after dry spell (max-min)", sm.max(0) - sm.min(0)),
                ("terrain: how low vs surroundings", -low), ("NISAR HH level", hh), ("NISAR HV level", hv)):
    print(f"    {name:34s} AUC {roc_auc_score(yv, a[valid]):.3f}")
top20 = valid & (persist >= np.nanquantile(persist[valid], 0.8))
print("  wettest 20% of open cells: flood-prone share inside vs outside", compare(top20, valid & ~top20, flood))
print("  flood-prone vs other open cells: share in the wettest 20%      ", compare(valid & flood, valid & ~flood, top20))
print("  always in the wettest 20% on all 9 dates:", int((wet_always & valid).sum()), "cells;", compare(wet_always & valid, valid & ~wet_always, flood))
notree = valid & (tree < 0.1)
yt = flood[notree].astype(int)
print(f"  without tree cover ({int(notree.sum())} cells): mean wetness rank AUC {roc_auc_score(yt, persist[notree]):.3f}; terrain AUC {roc_auc_score(yt, -low[notree]):.3f}")
X = np.column_stack([-low[notree], persist[notree]]); gg = block[notree]
for label, cols_ in (("terrain only", [0]), ("terrain + NISAR soil moisture", [0, 1])):
    o = np.zeros(len(yt))
    for tr, te in GroupKFold(5).split(X, yt, gg):
        m_ = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)); m_.fit(X[tr][:, cols_], yt[tr]); o[te] = m_.predict_proba(X[te][:, cols_])[:, 1]
    print(f"    {label:32s} block-CV AUC {roc_auc_score(yt, o):.3f}")
