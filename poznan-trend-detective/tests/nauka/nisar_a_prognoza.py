"""Night test 3 (15 Nov 2026): does NISAR's picture of 2026 confirm the forecast the app made from the 2020 map?

Cells the model projected as built by 2025 versus the others: share that NISAR calls built, also restricted to
cells touching 2020 built-up (the fair comparison). Method note: docs/przeglad-v2/RADAR_LATA.md.

Run from poznan-trend-detective/:
  .venv/bin/python -I tests/nauka/nisar_a_prognoza.py web data/raw/radar/nisar_features.npz
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import stats
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
web, feats = sys.argv[1:3]
L = web + "/data/land/"; land = json.load(open(L + "land.json")); W, H, THR = land["width"], land["height"], land["threshold"]
png = lambda n: np.array(Image.open(L + n + ".png")).astype(float)
b20, b25 = png("built_2020") / 255, png("built_2025") / 255
p25 = (png("prob_2025") / 255) ** 2
study = png("study") > 0
N = dict(np.load(feats, allow_pickle=True))
with np.errstate(all="ignore"):
    hh, hv = 10 * np.log10(N["hh_mean"]), 10 * np.log10(N["hv_mean"])
rr, cc = np.indices((H, W)); block = (rr // 16) * 1000 + (cc // 16)
F = np.column_stack([a[study] for a in (hh, hv, hh - hv, N["coh_mean"], N["coh_min"], N["hh_std_db"], N["coh_l_max"])])
y = (b20[study] >= THR).astype(int); oof = np.zeros(len(y))
for tr, te in GroupKFold(5).split(F, y, block[study]):
    m = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000)); m.fit(F[tr], y[tr]); oof[te] = m.predict_proba(F[te])[:, 1]
pn = np.zeros((H, W)); pn[study] = oof
def cmp(a, b, hit):
    ka, na, pb = int(hit[a].sum()), int(a.sum()), float(hit[b].mean())
    p = float(stats.binomtest(ka, na, pb, alternative="greater").pvalue)
    return f"cells {na:6d} hits {ka:5d} | {ka/na:.3f} vs {pb:.3f} | ratio {(ka/na)/pb:5.2f} | p {p:.3g}"
open20 = study & (b20 < THR)
proj_new = open20 & (b25 >= THR); stay = open20 & ~proj_new
print("cells open in 2020:", int(open20.sum()), "| forecast says built by 2025:", int(proj_new.sum()))
for q, label in ((1 - y.mean(), "NISAR built (same area as the 2020 map)"), (1 - y.mean() / 2, "NISAR clearly built (half that area)")):
    nb = pn >= np.quantile(oof, q)
    print(f"  {label:40s}", cmp(proj_new, stay, nb))
# the forecast ranked: deciles of prob_2025 among open cells
pr = p25[open20]; nb = (pn >= np.quantile(oof, 1 - y.mean()))[open20]
edges = np.quantile(pr, [0, .5, .8, .9, .95, .99, 1])
print("  share NISAR calls built, by forecast rank (open cells in 2020):")
for lo, hi, lab in zip(edges[:-1], edges[1:], ("bottom 50%", "50-80%", "80-90%", "90-95%", "95-99%", "top 1%")):
    s = (pr >= lo) & (pr <= hi if lab == "top 1%" else pr < hi)
    print(f"     {lab:10s} {nb[s].mean():.3f}  (n={int(s.sum())})")
# control: the simplest rule "next to built-up in 2020" (cells within one cell of a built cell)
from scipy import ndimage
near = open20 & ndimage.binary_dilation(b20 >= THR, iterations=1)
nbm = pn >= np.quantile(oof, 1 - y.mean())
print("  control, just 'touches a built cell in 2020':", cmp(near, open20 & ~near, nbm))
print("  forecast-new vs other cells that also touch built-up:", cmp(proj_new & near, near & ~proj_new, nbm))
