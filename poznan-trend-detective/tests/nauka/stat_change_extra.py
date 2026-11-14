"""Statistics review: what the year-on-year change layer contains beyond buildings (darkening, walls on old built land,
model check within the distance band next to existing buildings)."""
import numpy as np
from scipy import stats, ndimage
from common_layers import layers, sar, THR, CELL_HA, block_ids, cluster_boot_ratio

L = layers()
st, ok, up, walls, ch, dr = L["study"], L["ok"], L["up"], L["walls"], L["change"], L["dratio"]
b20, b25 = L["built_2020"] >= THR, L["built_2025"] >= THR
forest = L["forest"] > 200
open_ = st & ok & ~b25 & (L["forest"] < 0.3 * 255)
print("platforms:", sar["s1"]["platforms"])
print("median yoy change (dB): open", round(np.nanmedian(ch[open_]), 2), " forest", round(np.nanmedian(ch[forest & st & ok]), 2),
      " built2020", round(np.nanmedian(ch[b20 & st & ok]), 2))
dn = (ch <= -3) & st & ok
print("darker <= -3 dB: cells", dn.sum(), "=", round(dn.sum() * CELL_HA), "ha; share on open land", round((dn & open_).sum() / dn.sum(), 3),
      "; share of open land darker", round((dn & open_).sum() / open_.sum(), 3))
print("walls cells by class: built 2020", (walls & b20 & st).sum(), " built 2025 not 2020", (walls & b25 & ~b20 & st).sum(),
      " open 2025", (walls & ~b25 & st).sum(), " total", (walls & st).sum())
print("up cells by class: built 2020", (up & b20 & st).sum(), " built 2025 not 2020", (up & b25 & ~b20 & st).sum(), " open 2025", (up & ~b25 & st).sum())
# model check inside the 0-150 m band where 90% of top cells lie
cand = ~b25 & st & ok
top = cand & (L["p30"] >= np.quantile(L["p30"][cand], 0.95))
rest = cand & ~top
dist = ndimage.distance_transform_edt(~b25) * 73.2
band = dist <= 150
for nm, hit in (("up", up), ("walls", walls)):
    a, n1, c, n0 = (hit & top & band).sum(), (top & band).sum(), (hit & rest & band).sum(), (rest & band).sum()
    print(f"model {nm} within 150 m of built land: {a}/{n1} vs {c}/{n0}  RR {(a/n1)/(c/n0):.2f}  Fisher p(one-sided) {stats.fisher_exact([[a,n1-a],[c,n0-c]],alternative='greater')[1]:.3f}")
    r0, ci, ple1, nb = cluster_boot_ratio(hit, top & band, rest & band, block_ids(st.shape, 8))
    print(f"   block bootstrap (584 m): RR {r0:.2f} 95% CI {ci[0]:.2f}-{ci[1]:.2f}")
# share of top cells within 150 m
print("share of top-5% cells within 150 m of built-2025 land:", round((top & band).sum() / top.sum(), 3), "; of rest:", round((rest & band).sum() / rest.sum(), 3))
