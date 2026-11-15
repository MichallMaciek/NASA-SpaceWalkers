"""Night test 1 (15 Nov 2026): does NISAR seasonal change (June -> October 2026) mark building activity?

Same test the app uses for Sentinel-1 (pipeline/build_sar.py): cells with a "new building" decision of the city of
Poznan versus the rest of the city, plus single-feature AUCs and small models with block cross-validation.
Result: it does not (ratio 1.27). The p values here treat cells as independent; read them as an upper bound on
significance. Method note: docs/przeglad-v2/RADAR_LATA.md, section "Testy NISAR z nocy 14/15.11".

Run from poznan-trend-detective/:
  .venv/bin/python -I tests/nauka/nisar_zmiana_sezonowa.py web data/raw/radar/nisar_features.npz
"""
import sys, json
import numpy as np, rasterio.features
from affine import Affine
from PIL import Image
from rasterio.warp import transform_geom
from scipy import stats
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

web, feats = sys.argv[1:3]
L = web + "/data/land/"
land = json.load(open(L + "land.json"))
W, H = land["width"], land["height"]; TR = Affine(*land["transform3857"][:6])
png = lambda n: np.array(Image.open(L + n + ".png")).astype(float)
v = png("sar_change"); s1_change = np.where(v > 0, v / 12.75 - 10, np.nan)
v = png("sar_dratio"); s1_dratio = np.where(v > 0, v / 12.75 - 10, np.nan)
p30 = (png("prob_2030") / 255) ** 2
built25 = png("built_2025") / 255
study = png("study") > 0
N = dict(np.load(feats, allow_pickle=True))

wuia = json.load(open(web + "/data/wuia_decyzje.geojson", encoding="utf-8"))
def mask(pred):
    shapes = [(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1) for f in wuia["features"] if pred(f["properties"])]
    return rasterio.features.rasterize(shapes, out_shape=(H, W), transform=TR, all_touched=False).astype(bool)
new_dec = mask(lambda p: p.get("kategoria") == "nowa budowa" and p.get("status") == "decyzja" and str(p.get("DATA", "")) <= "2026-08-31")
any_case = mask(lambda p: True)
late_new = mask(lambda p: p.get("kategoria") == "nowa budowa" and str(p.get("DATA", "")) >= "2026-09-01")
early_any = mask(lambda p: str(p.get("DATA", "")) < "2026-09-01")
city = np.zeros((H, W), bool)
for f in json.load(open(web + "/data/areas.geojson", encoding="utf-8"))["features"]:
    if f["properties"].get("role") == "city":
        city |= rasterio.features.rasterize([(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1)], out_shape=(H, W), transform=TR).astype(bool)

def compare(a, b, hit):
    ka, na, pb = int(hit[a].sum()), int(a.sum()), float(hit[b].mean())
    p = float(stats.binomtest(ka, na, pb, alternative="greater").pvalue) if na and 0 < pb < 1 else float("nan")
    return f"cells {na:5d} hits {ka:4d} | decision {ka/na:.4f} vs rest {pb:.4f} | ratio {(ka/na)/max(pb,1e-9):5.2f} | p {p:.4g}"

ok = np.isfinite(s1_change) & np.isfinite(s1_dratio)
sel, ref = new_dec & ok, city & ok & ~any_case
print("city cells", int(city.sum()), "| decision cells", int(sel.sum()), "| reference cells", int(ref.sum()))
print("\n[A] Same test as the app, Sentinel-1 (autumn 2025 -> autumn 2026)")
s1_up = (s1_change >= 3) & ok; s1_walls = s1_up & (s1_dratio >= 1.5)
print("  VV up >= 3 dB          ", compare(sel, ref, s1_up))
print("  new walls (ratio>=1.5) ", compare(sel, ref, s1_walls))

with np.errstate(all="ignore"):
    dhh = 10 * np.log10(N["hh_l"] / N["hh_e"]); dhv = 10 * np.log10(N["hv_l"] / N["hv_e"])
    hh_db = 10 * np.log10(N["hh_mean"]); hv_db = 10 * np.log10(N["hv_mean"]); hhl_db = 10 * np.log10(N["hh_l"])
dr = dhh - dhv
med = float(np.nanmedian(dhh[study])); print(f"\nNISAR HH season change (Jun->Oct), study median {med:+.2f} dB, city median {np.nanmedian(dhh[city]):+.2f} dB")
print("[B] Same thresholds, NISAR track 57 (mid-June -> mid-October 2026)")
n_up = dhh >= 3; n_walls = n_up & (dr >= 1.5)
print("  HH up >= 3 dB          ", compare(sel, ref, n_up))
print("  new walls (ratio>=1.5) ", compare(sel, ref, n_walls))
print("  HH up >= 3 dB above the study median", compare(sel, ref, (dhh - med) >= 3))
print("[C] NISAR flags built at 20 m (share of the cell's 20 m pixels)")
for name, thr in (("f_new_bright", 0.15), ("f_new_bright", 0.3), ("f_up3", 0.3), ("f_stable_new", 0.15), ("f_lost_stab", 0.15)):
    print(f"  {name:13s} >= {thr:<4}  ", compare(sel, ref, N[name] >= thr))
print("[D] The two radars together")
print("  S1 walls AND NISAR up   ", compare(sel, ref, s1_walls & n_up))
print("  S1 walls OR NISAR walls ", compare(sel, ref, s1_walls | n_walls))
print("  S1 up AND NISAR up      ", compare(sel, ref, s1_up & n_up))

print("\n[E] How well each single number separates decision cells from the rest of the city (AUC, 0.5 = no information)")
cols = {"S1 VV change": s1_change, "S1 VV/VH change": s1_dratio, "model prob 2030": p30, "built share 2025": built25,
        "NISAR dHH": dhh, "NISAR dHV": dhv, "NISAR dHH-dHV": dr, "NISAR HH level": hh_db, "NISAR HV level": hv_db, "NISAR HH-HV": hh_db - hv_db,
        "NISAR HH spread": N["hh_std_db"], "NISAR dHH max 20m": N["dhh_max"], "NISAR coh mean": N["coh_mean"], "NISAR coh late-early": N["coh_l"] - N["coh_e"],
        "NISAR coh min": N["coh_min"], "NISAR f_new_bright": N["f_new_bright"], "NISAR f_stable_new": N["f_stable_new"], "NISAR f_lost_stab": N["f_lost_stab"]}
m = sel | ref; y = sel[m].astype(int)
for k, a in cols.items():
    print(f"  {k:22s} {roc_auc_score(y, np.nan_to_num(a[m])):.3f}")

print("\n[F] Models, 5-fold cross-validation on ~2 km blocks (never tested on a neighbourhood it was trained on)")
rr, cc = np.indices((H, W)); groups = ((rr // 16) * 1000 + (cc // 16))[m]
base = ["model prob 2030", "built share 2025"]
s1f = ["S1 VV change", "S1 VV/VH change"]
nis = [k for k in cols if k.startswith("NISAR")]
def cv(names, kind="lr"):
    X = np.nan_to_num(np.column_stack([cols[k][m] for k in names]))
    oof = np.zeros(len(y)); aucs = []
    for tr, te in GroupKFold(5).split(X, y, groups):
        mdl = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced")) if kind == "lr" else \
              HistGradientBoostingClassifier(max_depth=3, max_iter=150, learning_rate=0.06, class_weight="balanced", random_state=0)
        mdl.fit(X[tr], y[tr]); oof[te] = mdl.predict_proba(X[te])[:, 1]; aucs.append(roc_auc_score(y[te], oof[te]))
    top = oof >= np.quantile(oof, 0.95)
    return roc_auc_score(y, oof), np.std(aucs), y[top].mean() / y.mean(), y[top].sum()
for label, names in (("model only", base), ("model + Sentinel-1", base + s1f), ("model + NISAR", base + nis), ("model + Sentinel-1 + NISAR", base + s1f + nis),
                     ("Sentinel-1 only", s1f), ("NISAR only", nis)):
    for kind in ("lr", "gb"):
        a, sd, lift, hits = cv(names, kind)
        print(f"  {label:28s} {kind}  AUC {a:.3f} (+-{sd:.3f} across folds)  top-5% lift {lift:4.2f}x  ({int(hits)} of {int(y.sum())} decision cells in top 5%)")

print("\n[G] Model meets radar on open land in the whole study area (the app's 'model' check): top 5% of the forecast vs the other 95%")
thr = land["threshold"]
cand = (built25 < thr) & study & ok
top = cand & (p30 >= np.quantile(p30[cand], 0.95)); rest = cand & ~top
print("  Sentinel-1 up           ", compare(top, rest, s1_up)); print("  Sentinel-1 walls        ", compare(top, rest, s1_walls))
print("  NISAR up                ", compare(top, rest, n_up)); print("  NISAR walls             ", compare(top, rest, n_walls))
print("  NISAR f_new_bright>=0.15", compare(top, rest, N["f_new_bright"] >= 0.15)); print("  NISAR f_stable_new>=0.15", compare(top, rest, N["f_stable_new"] >= 0.15))

print("\n[H] Looking forward: 'new building' cases filed from September on, in cells with no case before September, vs city cells with no case at all")
fut = late_new & ~early_any & ok
print("  future-case cells", int(fut.sum()))
m2 = fut | ref; y2 = fut[m2].astype(int)
for k in ("model prob 2030", "built share 2025", "S1 VV change", "NISAR dHH", "NISAR HH level", "NISAR HV level", "NISAR HH-HV", "NISAR coh mean", "NISAR HH spread", "NISAR f_new_bright"):
    print(f"  {k:22s} AUC {roc_auc_score(y2, np.nan_to_num(cols[k][m2])):.3f}")
