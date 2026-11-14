"""Statistics review: 'ground soaks up water' (checks.wet). Per-cell Spearman of VV with NASA POWER GWETTOP over 26 passes.
Uses sar_wet.png (r per 120 m open cell) and sar_series.png (VV of every pass on 480 m blocks) for field-significance and
confounding tests that the pipeline does not run."""
import math
import numpy as np
from scipy import stats
from common_layers import layers, sar, png, THR, block_ids, cluster_boot_ratio

L = layers()
s1 = sar["s1"]
wet = s1["soil_wetness"]
kw = [k for k, w in enumerate(wet) if w is not None]
nw = len(kw)
drv = np.array([wet[k] for k in kw])
print("passes", len(s1["dates"]), "with GWETTOP", nw, "; GWETTOP range", drv.min(), drv.max(), "; distinct values", len(set(drv)), "(ties)")
t = stats.t.ppf(0.975, nw - 2)
rc = t / math.sqrt(nw - 2 + t * t)
print("r_crit (two-sided 0.05, t approx) =", round(rc, 3), "; one-sided test r > r_crit has nominal false-positive rate 2.5% per cell")
# exact-ish null of Spearman for n=26 by permutation
rng = np.random.default_rng(0)
rd = stats.rankdata(drv)
null = np.array([stats.spearmanr(rd, rng.permutation(nw))[0] for _ in range(20000)])
print("permutation P(r > r_crit) for one cell:", round((null > rc).mean(), 4))

wr = L["wet_r"]
okr = np.isfinite(wr)
print("open cells with r:", okr.sum(), " share r > r_crit:", round((wr[okr] > rc).mean(), 4), "(json", sar["checks"]["wet"]["share_sig_study"], ")",
      " share r < -r_crit:", round((wr[okr] < -rc).mean(), 4), " median r", round(np.median(wr[okr]), 3))

# ---------- block series (480 m) ----------
ser = s1["series"]
bw, bh, n = ser["bw"], ser["bh"], ser["n"]
sheet = png("sar_series")
db = np.where(sheet > 0, sheet / 6 - 30, np.nan)
VV = np.stack([db[k * bh:(k + 1) * bh, :bw] for k in range(n)])
VH = np.stack([db[k * bh:(k + 1) * bh, bw:2 * bw] for k in range(n)])
# class fraction per 480 m block
def frac(m):
    Hh, Ww = m.shape
    pad = np.zeros((bh * 4, bw * 4), bool)
    pad[:Hh, :Ww] = m
    return pad.reshape(bh, 4, bw, 4).mean((1, 3))
st = L["study"]
fo, fb, ff = frac(L["open_land"]), frac(st & (L["built_2020"] >= THR)), frac(st & (L["forest"] > 200))
fs = frac(st)
cls = {"open (>=90% open land)": (fo >= 0.9), "built (>=90% built 2020)": (fb >= 0.9), "forest (>=90% dense forest)": (ff >= 0.9)}

def spear_blocks(X, d, idx):
    Y = X[idx]  # passes x blocks
    good = np.isfinite(Y).all(0)
    R = np.argsort(np.argsort(Y, 0), 0).astype(float)
    Rc = R - R.mean(0)
    dd = stats.rankdata(d)
    dc = (dd - dd.mean())[:, None, None]
    r = (Rc * dc).sum(0) / np.sqrt((Rc ** 2).sum(0) * (dc ** 2).sum())
    return np.where(good, r, np.nan)

r_vv = spear_blocks(VV, drv, kw)
r_vh = spear_blocks(VH, drv, kw)
print("\n480 m blocks, share with r > r_crit (VV | VH), and median r:")
for nm, m in cls.items():
    v, h = r_vv[m & np.isfinite(r_vv)], r_vh[m & np.isfinite(r_vh)]
    print(f"  {nm:28s} n={v.size:5d}  VV {100*(v>rc).mean():5.1f}%  (median r {np.median(v):+.2f})   VH {100*(h>rc).mean():5.1f}%  (median r {np.median(h):+.2f})")

# area-mean series
aoi = np.array(s1["aoi_vv_db"])[kw]
print("\nstudy-area mean VV vs GWETTOP: Spearman", [round(x, 3) for x in stats.spearmanr(aoi, drv)])
openmean = np.array([np.nanmean(10 ** (VV[k][cls["open (>=90% open land)"]] / 10)) for k in kw])
print("open-block mean VV vs GWETTOP: Spearman", [round(x, 3) for x in stats.spearmanr(10 * np.log10(openmean), drv)])

# field significance: permute the pass order of the driver (the same permutation for every block keeps spatial correlation)
om = cls["open (>=90% open land)"] & np.isfinite(r_vv)
obs = (r_vv[om] > rc).mean()
perm = []
for _ in range(500):
    d2 = rng.permutation(drv)
    perm.append((spear_blocks(VV, d2, kw)[om] > rc).mean())
perm = np.array(perm)
print(f"\nfield significance on open blocks: observed share {obs:.3f}; permutation null mean {perm.mean():.3f}, 95th pct {np.percentile(perm,95):.3f}, "
      f"99th {np.percentile(perm,99):.3f}, max {perm.max():.3f}; P(null >= observed) = {(perm>=obs).mean():.3f}")
# time-structure-preserving null: circular shifts of the driver
circ = np.array([(spear_blocks(VV, np.roll(drv, s), kw)[om] > rc).mean() for s in range(1, nw)])
print("circular-shift null (25 shifts): shares", np.round(np.sort(circ), 3), " observed", round(obs, 3))

# confounding: season trend and platform
dates = [s1["dates"][k] for k in kw]
doy = np.array([np.datetime64(d).astype("datetime64[D]").astype(int) for d in dates])
plat = np.array([1.0 if s1["platforms"][d] == ["sentinel-1d"] else 0.0 for d in dates])
print("\nGWETTOP vs time: Spearman", [round(x, 3) for x in stats.spearmanr(doy, drv)])
print("GWETTOP vs platform (1 = S1D):", [round(x, 3) for x in stats.pointbiserialr(plat, drv)], " platforms:", dict(zip(*np.unique([s1['platforms'][d][0] for d in dates], return_counts=True))))
print("open-block mean VV vs platform:", [round(x, 3) for x in stats.pointbiserialr(plat, 10 * np.log10(openmean))])
# first differences: pass-to-pass change of VV vs change of wetness (removes slow seasonal trends)
dV = np.diff(VV[kw], axis=0)
dW = np.diff(drv)
Y = dV[:, om]
rr = np.array([stats.spearmanr(Y[:, j], dW)[0] for j in range(Y.shape[1])])
m2 = len(dW)
t2 = stats.t.ppf(0.975, m2 - 2); rc2 = t2 / math.sqrt(m2 - 2 + t2 * t2)
print(f"first differences ({m2} pairs, r_crit {rc2:.3f}): open blocks with r > r_crit {100*(rr>rc2).mean():.1f}%, median r {np.median(rr):+.2f}")
# partial out a smooth seasonal trend (quadratic in time) from both, per block
X = np.vstack([np.ones(nw), doy - doy.mean(), (doy - doy.mean()) ** 2]).T
res_d = drv - X @ np.linalg.lstsq(X, drv, rcond=None)[0]
Yv = VV[kw][:, om]
res_v = Yv - X @ np.linalg.lstsq(X, Yv, rcond=None)[0]
rp = np.array([stats.spearmanr(res_v[:, j], res_d)[0] for j in range(res_v.shape[1])])
t3 = stats.t.ppf(0.975, nw - 5); rc3 = t3 / math.sqrt(nw - 5 + t3 * t3)
print(f"after removing a quadratic seasonal trend (r_crit {rc3:.3f}): open blocks r > r_crit {100*(rp>rc3).mean():.1f}%, median r {np.median(rp):+.2f}")

# inside vs outside flood areas, cluster bootstrap on 120 m cells
fl = L["flood"]
sig = (wr > rc) & okr
for b in (4, 8, 16):
    r0, ci, ple1, nb = cluster_boot_ratio(sig, okr & fl, okr & ~fl, block_ids(st.shape, b))
    print(f"flood vs outside, block {b*73} m: ratio {r0:.3f}, 95% CI {ci[0]:.2f}-{ci[1]:.2f}, blocks in flood areas {nb}")
print("open cells in flood areas:", (okr & fl).sum(), " outside:", (okr & ~fl).sum())
