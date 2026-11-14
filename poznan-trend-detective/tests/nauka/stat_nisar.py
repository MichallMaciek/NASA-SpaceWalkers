"""Statistics review: NISAR 'wet minus dry' (checks.nisar.wetdry) and the soil-wetness numbers quoted with it.
Uses nisar_series.png (HH/HV of each pass on 480 m blocks), nisar_wetdry.png (120 m) and the team's pass list."""
import csv
import numpy as np
from scipy import stats
from pathlib import Path
from common_layers import layers, sar, png, THR, block_ids, cluster_boot_ratio, ROOT

L = layers()
N = sar["nisar"]
nd = N["dates"]
rows = list(csv.DictReader(open(ROOT.parent / "progres/p1/dane/nisar_poznan_przeloty.csv", encoding="utf-8")))
sm = {}
rain = {}
for r in rows:
    if r["produkt"] == "GCOV" and r["wilgotnosc_gleby_m3m3"]:
        sm[r["data"]] = float(r["wilgotnosc_gleby_m3m3"]); rain[r["data"]] = float(r["deszcz_3dni_mm"])
print("track-158 passes used:", [(d, sm.get(d), rain.get(d)) for d in nd])
gaps = np.diff([np.datetime64(d) for d in nd]).astype(int)
print("gaps between used passes (days):", gaps.tolist())

# the two 'soil wetness' sources: ERA5 0-7 cm (pass list) vs NASA POWER GWETTOP (sar.json) on days within 1 day
s1 = sar["s1"]
pairs = []
for d, w in zip(s1["dates"], s1["soil_wetness"]):
    if w is None:
        continue
    for off in (0, 1, -1):
        dd = str(np.datetime64(d) + np.timedelta64(off, "D"))
        if dd in sm:
            pairs.append((d, w, dd, sm[dd])); break
print("GWETTOP vs ERA5 on matching days (+-1 d):", pairs)
if len(pairs) > 3:
    print("  Spearman:", [round(x, 3) for x in stats.spearmanr([p[1] for p in pairs], [p[3] for p in pairs])])
print("GWETTOP on S1 days around 25 Jun:", [(d, w) for d, w in zip(s1["dates"], s1["soil_wetness"]) if "2026-06-16" <= d <= "2026-07-10"])
print("GWETTOP on S1 days around 24 Aug:", [(d, w) for d, w in zip(s1["dates"], s1["soil_wetness"]) if "2026-08-15" <= d <= "2026-09-02"])

# 120 m layer check
wd = L["nisar_wetdry"]
okw = np.isfinite(wd)
print("\n120 m open cells:", okw.sum(), " share HH wet-dry >= 2 dB:", round((wd[okw] >= 2).mean(), 4), "(json", N["checks"]["wetdry"]["share_study"], ")",
      " <= -2 dB:", round((wd[okw] <= -2).mean(), 4), " median", round(np.median(wd[okw]), 2))

ser = N["series"]
bw, bh, n = ser["bw"], ser["bh"], ser["n"]
sh = png("nisar_series")
db = np.where(sh > 0, sh / 6 - 30, np.nan)
HH = np.stack([db[k * bh:(k + 1) * bh, :bw] for k in range(n)])
HV = np.stack([db[k * bh:(k + 1) * bh, bw:2 * bw] for k in range(n)])
def frac(m):
    pad = np.zeros((bh * 4, bw * 4), bool); pad[:m.shape[0], :m.shape[1]] = m
    return pad.reshape(bh, 4, bw, 4).mean((1, 3))
st = L["study"]
om = frac(L["open_land"]) >= 0.9
fm = frac(st & (L["forest"] > 200)) >= 0.9
bm = frac(st & (L["built_2020"] >= THR)) >= 0.9
print("\n480 m blocks: open", om.sum(), "forest", fm.sum(), "built", bm.sum())
print("pair (a -> b): dSM(ERA5) | open: median dHH, share dHH>=2 | forest median dHH | built median dHH | open median dHV")
res = []
ks = list(range(n))
pairs_ = [(0, nd.index("2026-08-24"))] + [(k, k + 1) for k in range(n - 1)] + [(0, k) for k in range(1, n)]
seen = set()
for a, b in pairs_:
    if (a, b) in seen: continue
    seen.add((a, b))
    d = HH[b] - HH[a]
    v = d[om & np.isfinite(d)]
    dS = sm[nd[b]] - sm[nd[a]]
    res.append((a, b, dS, np.median(v)))
    print(f"  {nd[a]} -> {nd[b]}: dSM {dS:+.3f} | open {np.median(v):+.2f} dB, {100*(v>=2).mean():4.1f}% | forest {np.nanmedian(d[fm]):+.2f} | built {np.nanmedian(d[bm]):+.2f} | HV {np.nanmedian((HV[b]-HV[a])[om]):+.2f}")
cons = [(r[2], r[3]) for r in res if r[1] == r[0] + 1]
print("consecutive pairs: Spearman(dSM, open median dHH) =", [round(x, 3) for x in stats.spearmanr(*zip(*cons))])
# per-pass: open-block mean HH vs ERA5 SM (n = 9)
om_hh = [10 * np.log10(np.nanmean(10 ** (HH[k][om] / 10))) for k in range(n)]
print("open-block mean HH per pass:", np.round(om_hh, 2).tolist())
print("Spearman(open mean HH, ERA5 SM) over 9 passes:", [round(x, 3) for x in stats.spearmanr(om_hh, [sm[d] for d in nd])])
print("Spearman(study mean HH, ERA5 SM):", [round(x, 3) for x in stats.spearmanr(N["aoi_hh_db"], [sm[d] for d in nd])])

# flood vs outside on 120 m with cluster bootstrap
fl = L["flood"]
hit = (wd >= 2) & okw
for b in (4, 8, 16):
    r0, ci, ple1, nb = cluster_boot_ratio(hit, okw & fl, okw & ~fl, block_ids(st.shape, b))
    print(f"wet-dry flood vs outside, blocks {b*73} m: ratio {r0:.2f} 95% CI {ci[0]:.2f}-{ci[1]:.2f}; blocks in flood {nb}")
print("open cells in flood areas:", (okw & fl).sum())
# land-cover mix of open land in vs out of flood areas: share of 2000 tree cover 10-30% (shrubs, meadows by rivers)
fr = L["forest"] / 255
print("mean 2000 tree-cover fraction on open land: flood", round(fr[okw & fl].mean(), 3), " outside", round(fr[okw & ~fl].mean(), 3))
