"""Physics review: is the radar moisture signal moisture? S1 VV vs GWETTOP with and without a seasonal curve;
NISAR HH pass by pass on open 480 m blocks against ERA5 0-7 cm soil moisture from the team pass list.
Usage: python -I physics_moisture_confound.py <path to poznan-trend-detective>"""
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
H, W = study.shape; B = 4
bh, bw = math.ceil(H / B), math.ceil(W / B)
pad = lambda a: np.pad(a, ((0, bh * B - H), (0, bw * B - W)), constant_values=0)
openfrac = pad(open_land.astype(float)).reshape(bh, B, bw, B).mean((1, 3))
ob = openfrac >= 0.99
print("open 480 m blocks (>=99% open cells):", ob.sum())
# ---- Sentinel-1 VV vs GWETTOP ----
ss = L("sar_series"); n = s["s1"]["series"]["n"]
vv = np.stack([ss[k*bh:(k+1)*bh, :bw] for k in range(n)]); vv = np.where(vv > 0, vv / 6 - 30, np.nan)
wet = s["s1"]["soil_wetness"]; kw = [k for k, w in enumerate(wet) if w is not None]
g = np.array([wet[k] for k in kw]); dates = [s["s1"]["dates"][k] for k in kw]
X = vv[kw][:, ob]  # passes x blocks
fin = np.isfinite(X).all(0); X = X[:, fin]
nw = len(kw); t = stats.t.ppf(0.975, nw - 2); rc = t / math.sqrt(nw - 2 + t * t)
def spear(X, d):
    rx = np.apply_along_axis(stats.rankdata, 0, X); rd = stats.rankdata(d)
    rx = rx - rx.mean(0); rd = rd - rd.mean()
    return (rx * rd[:, None]).sum(0) / np.sqrt((rx**2).sum(0) * (rd**2).sum())
r = spear(X, g)
print("S1 blocks", X.shape[1], "r_crit", round(rc, 3), "share r>r_crit", round((r > rc).mean(), 3), "median r", round(float(np.median(r)), 3))
# GWETTOP seasonality: correlation with a quadratic in time
doy = np.array([np.datetime64(d).astype("datetime64[D]").astype(int) for d in dates], float); doy -= doy.mean()
A = np.c_[np.ones_like(doy), doy, doy**2]
fit = A @ np.linalg.lstsq(A, g, rcond=None)[0]
print("GWETTOP R^2 explained by quadratic in time:", round(1 - ((g - fit)**2).sum() / ((g - g.mean())**2).sum(), 3))
# high-pass: GWETTOP anomaly vs VV anomaly, both minus quadratic-in-time
def resid(Y):
    c = np.linalg.lstsq(A, Y, rcond=None)[0]; return Y - A @ c
ga = resid(g); Xa = resid(X)
ra = spear(Xa, ga)
print("after removing a quadratic seasonal curve from both: share r>r_crit", round((ra > rc).mean(), 3), "median r", round(float(np.median(ra)), 3))
# by month: block median VV in Jun vs Jul-Aug vs Sep-Nov
mon = np.array([int(d[5:7]) for d in dates])
for lab, m in (("Jun", mon == 6), ("Jul-Aug", (mon == 7) | (mon == 8)), ("Sep-Nov", mon >= 9)):
    print(lab, "GWETTOP mean", round(g[m].mean(), 3), "open-block VV median", round(float(np.median(X[m])), 2))
# ---- NISAR HH on open blocks, pass by pass, vs ERA5 soil moisture of the team's pass list ----
ns = L("nisar_series"); nn = s["nisar"]["series"]["n"]
hh = np.stack([ns[k*bh:(k+1)*bh, :bw] for k in range(nn)]); hh = np.where(hh > 0, hh / 6 - 30, np.nan)
hv = np.stack([ns[k*bh:(k+1)*bh, bw:2*bw] for k in range(nn)]); hv = np.where(hv > 0, hv / 6 - 30, np.nan)
nd = s["nisar"]["dates"]
sm = {"2026-06-25": .089, "2026-07-07": .169, "2026-07-19": .293, "2026-08-12": .143, "2026-08-24": .302, "2026-09-05": .204, "2026-09-17": .272, "2026-09-29": .200, "2026-10-11": .225}
for k, d in enumerate(nd):
    print(" NISAR", d, "ERA5 sm", sm[d], "open-block median HH", round(float(np.nanmedian(hh[k][ob])), 2), "HV", round(float(np.nanmedian(hv[k][ob])), 2))
i = {d: k for k, d in enumerate(nd)}
def pair(a, b):
    d = hh[i[b]][ob] - hh[i[a]][ob]; d = d[np.isfinite(d)]
    dv = hv[i[b]][ob] - hv[i[a]][ob]; dv = dv[np.isfinite(dv)]
    return f"{a}->{b}: dsm {sm[b]-sm[a]:+.3f}; HH median {np.median(d):+.2f} dB, share>=2 dB {np.mean(d>=2):.2f}; HV median {np.median(dv):+.2f}"
for a, b in (("2026-06-25", "2026-08-24"), ("2026-06-25", "2026-07-19"), ("2026-08-12", "2026-08-24"), ("2026-07-19", "2026-08-24"), ("2026-06-25", "2026-09-17")):
    print(" ", pair(a, b))
Y = hh[:, ob]; Y = Y[:, np.isfinite(Y).all(0)]
rn = spear(Y, np.array([sm[d] for d in nd]))
t9 = stats.t.ppf(0.975, 7); rc9 = t9 / math.sqrt(7 + t9 * t9)
print(" NISAR HH vs ERA5 sm per open block: median r", round(float(np.median(rn)), 3), "share r>r_crit(", round(rc9, 3), ")", round(float((rn > rc9).mean()), 3))
