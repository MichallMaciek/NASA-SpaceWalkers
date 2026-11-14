"""Statistics review: building-permit check (checks.wuia, wuia_walls), projection check (checks.model, model_walls),
693 ha / 358 ha. Rebuilds the masks from the published layers and compares with sar.json first."""
import numpy as np
from scipy import stats, ndimage

from common_layers import layers, sar, wilson, block_ids, cluster_boot_ratio, THR, CELL_HA

L = layers()
st, ok, up, walls, ch = L["study"], L["ok"], L["up"], L["walls"], L["change"]
k = sar["checks"]

print("=== 0. reconstruction vs sar.json ===")
sel = L["new_dec"] & ok
ref = L["city"] & ok & ~L["any_case"]
print("wuia: cells", sel.sum(), "(json", k["wuia"]["cells"], ") hits", (up & sel).sum(), "(json", k["wuia"]["hits"], ")",
      "ref cells", ref.sum(), "ref hits", (up & ref).sum(), "share_b", round((up & ref).sum() / ref.sum(), 4), "(json", k["wuia"]["share_b"], ")")
print("walls in sel", (walls & sel).sum(), "(json", k["wuia_walls"]["hits"], ") ref walls", (walls & ref).sum(), round((walls & ref).sum() / ref.sum(), 4))
print("up ha", round((up & st).sum() * CELL_HA), "(json", sar["s1"]["up3db_ha"], ") walls ha", round((walls & st).sum() * CELL_HA), "(json", sar["s1"]["walls_ha"], ")")
cand = (L["built_2025"] < THR) & st & ok
top = cand & (L["p30"] >= np.quantile(L["p30"][cand], 0.95))
rest = cand & ~top
print("model: top", top.sum(), "(json", k["model"]["cells"], ") hits", (up & top).sum(), "(json", k["model"]["hits"], ")",
      "rest", rest.sum(), "rest hits", (up & rest).sum(), "walls top", (walls & top).sum(), "rest walls", (walls & rest).sum())


def fisher_line(name, ka, na, kb, nb):
    t = stats.contingency.odds_ratio([[ka, na - ka], [kb, nb - kb]], kind="conditional")
    ci = t.confidence_interval(0.95)
    p = stats.fisher_exact([[ka, na - ka], [kb, nb - kb]], alternative="greater")[1]
    wa, wb = wilson(ka, na), wilson(kb, nb)
    # ratio-of-proportions CI (Katz log method)
    rr = (ka / na) / (kb / nb)
    se = np.sqrt(1 / ka - 1 / na + 1 / kb - 1 / nb) if ka else np.nan
    print(f"{name}: {ka}/{na} = {100*ka/na:.2f}% [{100*wa[0]:.2f}-{100*wa[1]:.2f}]  vs  {kb}/{nb} = {100*kb/nb:.3f}% "
          f"[{100*wb[0]:.3f}-{100*wb[1]:.3f}]  RR {rr:.2f} (Katz 95% {rr*np.exp(-1.96*se):.2f}-{rr*np.exp(1.96*se):.2f})  "
          f"OR {t.statistic:.2f} [{ci.low:.2f}-{ci.high:.2f}]  Fisher one-sided p={p:.2e}")


print("\n=== 1. naive cell-level CIs (cells treated as independent) ===")
fisher_line("wuia up   ", (up & sel).sum(), sel.sum(), (up & ref).sum(), ref.sum())
fisher_line("wuia walls", (walls & sel).sum(), sel.sum(), (walls & ref).sum(), ref.sum())
fisher_line("model up  ", (up & top).sum(), top.sum(), (up & rest).sum(), rest.sum())
fisher_line("model wall", (walls & top).sum(), top.sum(), (walls & rest).sum(), rest.sum())

print("\n=== 2. how many separate decisions / places carry the 12 hits ===")
ids = L["new_dec_id"]
hit_ids = ids[up & sel]
print("decision ids of hit cells:", sorted(hit_ids.tolist()))
lab, nlab = ndimage.label(up & sel, structure=np.ones((3, 3)))
print("connected clusters of hit cells (8-neighbour):", nlab, "sizes", sorted(np.bincount(lab.ravel())[1:].tolist(), reverse=True))
lab2, n2 = ndimage.label(sel, structure=np.ones((3, 3)))
print("connected patches of decision cells:", n2, "; decisions rasterised to >=1 cell:", len(np.unique(ids[sel])) - (0 in ids[sel]))
for i in sorted(set(hit_ids.tolist())):
    p = L["new_dec_features"][i - 1]["properties"]
    print("  ", i, p.get("DATA"), p.get("NR_DZIALKI"), (p.get("OPIS") or "")[:110], "| cells", int((ids == i).sum()), "hits", int(((ids == i) & up & sel).sum()))

print("\n=== 3. spatial dependence: lag-1 correlation of the 'up' indicator and of the change itself ===")
m = st & ok
x = ch.copy()
a, b = x[:, :-1], x[:, 1:]
mm = m[:, :-1] & m[:, 1:]
print("corr(change, right neighbour) =", round(np.corrcoef(a[mm], b[mm])[0, 1], 3))
u = up.astype(float)
print("P(neighbour up | cell up) =", round((u[:, :-1][mm] * u[:, 1:][mm]).sum() / u[:, :-1][mm].sum(), 3), " base rate", round(u[m].mean(), 4))

print("\n=== 4. cluster (block) bootstrap of the ratios; blocks of b cells (b*73 m) ===")
for b in (4, 8, 16):
    B = block_ids(st.shape, b)
    for name, hit, A, Bm in (("wuia up", up, sel, ref), ("wuia walls", walls, sel, ref), ("model up", up, top, rest), ("model walls", walls, top, rest)):
        r0, ci, ple1, nb = cluster_boot_ratio(hit, A, Bm, B, nboot=2000)
        print(f"  block {b:2d} ({b*73:4d} m) {name:11s} ratio {r0:.2f}  95% CI {ci[0]:.2f}-{ci[1]:.2f}  P(ratio<=1) {ple1:.3f}  blocks with A cells {nb}")

print("\n=== 5. thinning: every 4th row and column (cells 290 m apart) ===")
th = np.zeros_like(st)
th[::4, ::4] = True
fisher_line("wuia up thin ", (up & sel & th).sum(), (sel & th).sum(), (up & ref & th).sum(), (ref & th).sum())
fisher_line("model up thin", (up & top & th).sum(), (top & th).sum(), (up & rest & th).sum(), (rest & th).sum())
fisher_line("model wl thin", (walls & top & th).sum(), (top & th).sum(), (walls & rest & th).sum(), (rest & th).sum())

print("\n=== 6. confounding by land cover: decision cells vs reference of the same kind ===")
open25 = L["built_2025"] < THR
for nm, msk in (("open in 2025", open25), ("built in 2025", ~open25)):
    s_, r_ = sel & msk, ref & msk
    if s_.sum():
        fisher_line(f"wuia up, {nm}", (up & s_).sum(), s_.sum(), (up & r_).sum(), r_.sum())
print("share of decision cells open in 2025:", round((sel & open25).sum() / sel.sum(), 3), "; of reference:", round((ref & open25).sum() / ref.sum(), 3))
# reference: city cells without any case but within 500 m of a case (same neighbourhoods)
near = ndimage.binary_dilation(L["any_case"], iterations=7) & ref
fisher_line("wuia up vs ref <=500 m of a case", (up & sel).sum(), sel.sum(), (up & near).sum(), near.sum())

print("\n=== 7. model check, controlling for distance to land built in 2025 ===")
dist = ndimage.distance_transform_edt(open25) * 73.2
for lo, hi in ((0, 150), (150, 300), (300, 600), (600, 1e9)):
    band = (dist > lo) & (dist <= hi)
    t_, r_ = top & band, rest & band
    if t_.sum() > 50 and r_.sum() > 50:
        print(f"  {lo:4.0f}-{hi:6.0f} m: top {t_.sum():6d} up {100*(up&t_).sum()/t_.sum():.2f}% walls {100*(walls&t_).sum()/t_.sum():.2f}% | rest {r_.sum():7d} up {100*(up&r_).sum()/r_.sum():.2f}% walls {100*(walls&r_).sum()/r_.sum():.2f}%")
print("  median distance to built-2025 land: top", np.median(dist[top]).round(), "m, rest", np.median(dist[rest]).round(), "m")
# Mantel-Haenszel pooled risk ratio across distance bands
num = den = 0.0
for lo, hi in ((0, 75), (75, 150), (150, 225), (225, 300), (300, 450), (450, 600), (600, 900), (900, 1e9)):
    band = (dist > lo) & (dist <= hi)
    a_, n1 = (walls & top & band).sum(), (top & band).sum()
    c_, n0 = (walls & rest & band).sum(), (rest & band).sum()
    T = n1 + n0
    if T:
        num += a_ * n0 / T
        den += c_ * n1 / T
print("  Mantel-Haenszel risk ratio for walls, stratified by distance:", round(num / den, 2))
num = den = 0.0
for lo, hi in ((0, 75), (75, 150), (150, 225), (225, 300), (300, 450), (450, 600), (600, 900), (900, 1e9)):
    band = (dist > lo) & (dist <= hi)
    a_, n1 = (up & top & band).sum(), (top & band).sum()
    c_, n0 = (up & rest & band).sum(), (rest & band).sum()
    T = n1 + n0
    if T:
        num += a_ * n0 / T
        den += c_ * n1 / T
print("  Mantel-Haenszel risk ratio for up>=3 dB, stratified by distance:", round(num / den, 2))

print("\n=== 8. how much of 693 ha / 358 ha could be noise: tails of the change on land that should not change ===")
b20 = L["built_2020"] >= THR
forest = L["forest"] > 200
for nm, msk in (("built 2020 (stable city)", b20 & st & ok & (L["built_2025"] >= THR)), ("forest >78%", forest & st & ok), ("open 2025", cand), ("all study", st & ok)):
    c = ch[msk]
    print(f"  {nm:26s} n={msk.sum():6d}  >=+3 dB {100*(c>=3).mean():.3f}%  <=-3 dB {100*(c<=-3).mean():.3f}%  walls {100*walls[msk].mean():.3f}%  sd {np.std(c):.2f} dB  "
          f"MAD-sd {1.4826*np.median(np.abs(c-np.median(c))):.2f} dB")
c = ch[st & ok]
print("  study: cells >=+3:", (c >= 3).sum(), " cells <=-3:", (c <= -3).sum(), " -> mirror-image estimate of excess brightening:",
      round(((c >= 3).sum() - (c <= -3).sum()) * CELL_HA), "ha")
print("  walls cells:", (walls & st).sum(), " mirror (change<=-3 & dratio<=-1.5):", ((ch <= -3) & (L["dratio"] <= -1.5) & st & ok).sum())
