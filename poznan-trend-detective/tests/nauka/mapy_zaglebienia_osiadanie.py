"""Czy „zagłębienie terenu” i „osiadanie gruntu” z karty są wiarygodne? Liczone tak jak w aplikacji."""
import json, sys
import numpy as np
from PIL import Image

W, OUT = sys.argv[1], sys.argv[2]
L = json.load(open(f"{W}/data/land/land.json")); w, h = L["width"], L["height"]
g = lambda n: np.asarray(Image.open(f"{W}/data/land/{n}.png").convert("L"), dtype=np.float64)
st = g("study") > 0; n = st.sum()
dem, ff, loss, b20, eg = g("dem"), g("forest2000_frac") / 255, g("loss_frac") / 255, g("built_2020") / 255, g("sar_egms")
flood = np.load(OUT + "/flood.npy")
forest_now = ff * (1 - loss)

def shifted(a, dr, dc, fill=np.nan):
    out = np.full(a.shape, fill)
    r0, r1 = max(0, -dr), min(h, h - dr); c0, c1 = max(0, -dc), min(w, w - dc)
    out[r0:r1, c0:c1] = a[r0 + dr:r1 + dr, c0 + dc:c1 + dc]
    return out

# ---- 1. zagłębienia: localRelief z 28-card-technical.js (koło ok. 500 m, co drugi krok) ----
r = round(500 / L["cell_m_ground"])
offs = [(dr, dc) for dr in range(-r, r + 1, 2) for dc in range(-r, r + 1, 2) if dr * dr + dc * dc <= r * r]
s = np.zeros((h, w)); k = np.zeros((h, w)); fs = np.zeros((h, w)); bs = np.zeros((h, w))
for dr, dc in offs:
    a = shifted(dem, dr, dc); m = np.isfinite(a); s += np.where(m, a, 0); k += m
    fs += np.nan_to_num(shifted(forest_now, dr, dc)); bs += np.nan_to_num(shifted(b20, dr, dc))
rel = (dem - s / k) / 2; fn = fs / k; bn = bs / k
hol = st & (rel <= -1.5)
print(f"promień {r} komórek, {len(offs)} próbek w kole")
print(f"1. ZAGŁĘBIENIA: komórek z flagą: {hol.sum()} = {hol.sum()/n:.1%} obszaru badań")
own_open = st & (forest_now < 0.1) & (b20 < 0.15)
print(f"   teren otwarty (bez lasu i zabudowy w samej komórce): {own_open.sum()} komórek, z flagą {(hol&own_open).sum()/own_open.sum():.1%}")
for lo, hi in [(0, 0.02), (0.02, 0.1), (0.1, 0.25), (0.25, 0.5), (0.5, 1.01)]:
    m = own_open & (fn >= lo) & (fn < hi)
    print(f"   las w kole 500 m {lo:.0%}–{min(hi,1):.0%}: {m.sum():6d} komórek otwartych, z flagą zagłębienia {(hol&m).sum()/max(m.sum(),1):.1%}, mediana „głębokości” wśród flagowanych {np.median(-rel[hol&m]) if (hol&m).sum() else float('nan'):.1f} m")
hf = hol & own_open
print(f"   z flagowanych komórek otwartych: {(hf&(fn>=0.1)).sum()/hf.sum():.0%} ma w kole 500 m co najmniej 10% lasu, {(hf&(fn>=0.25)).sum()/hf.sum():.0%} co najmniej 25%")
print(f"   strefy podtopień PIG-PIB: flaga zagłębienia na {(hol&flood).sum()/flood.sum():.1%} komórek stref wobec {(hol&st&~flood).sum()/(st&~flood).sum():.1%} poza strefami")
far = own_open & (fn < 0.02) & (bn < 0.05)
print(f"   daleko od lasu i zabudowy: flaga na {(hol&far).sum()/far.sum():.1%} z {far.sum()} komórek")

# ---- 2. osiadanie: EGMS ----
has = (eg > 0) & st; v = np.where(has, eg - 100, np.nan)
print(f"2. OSIADANIE: pomiar w {has.sum()} komórkach ({has.sum()/n:.1%} obszaru); <= -2: {(v<=-2).sum()}, <= -3: {(v<=-3).sum()}, <= -5: {(v<=-5).sum()}, minimum {np.nanmin(v):.0f} mm/rok")
# czy komórki <= -5 mają sąsiada, który też osiada (<= -2), czy stoją same wśród stabilnych
nb_sink = np.zeros((h, w)); nb_meas = np.zeros((h, w))
for dr in (-1, 0, 1):
    for dc in (-1, 0, 1):
        if dr == 0 and dc == 0: continue
        a = shifted(v, dr, dc); nb_meas += np.isfinite(a); nb_sink += np.nan_to_num(a <= -2)
s5 = v <= -5
print(f"   z {s5.sum()} komórek <= -5 mm/rok: {(s5&(nb_sink>=1)).sum()} ma sąsiada, który też osiada (<= -2); {(s5&(nb_sink==0)&(nb_meas>=3)).sum()} stoi samotnie wśród co najmniej 3 zmierzonych stabilnych sąsiadów; {(s5&(nb_meas<3)).sum()} ma mniej niż 3 zmierzonych sąsiadów (skraj danych)")
print(f"   komórki <= -5: w zabudowie 2020 (>=15%): {(s5&(b20>=0.15)).sum()}, na terenie otwartym: {(s5&(b20<0.15)).sum()}")
# wada w karcie: mediana w kole 1 km <= -3 albo minimum <= -5  (26-card-pros-cons.js)
R = 1000 / L["cell_m_ground"]; rr = int(np.ceil(R))
cnt = np.zeros((h, w)); c3 = np.zeros((h, w)); mn = np.full((h, w), np.inf)
for dr in range(-rr, rr + 1):
    for dc in range(-rr, rr + 1):
        if dr * dr + dc * dc > R * R: continue
        a = shifted(v, dr, dc); m = np.isfinite(a)
        cnt += m; c3 += np.nan_to_num(a <= -3); mn = np.minimum(mn, np.where(m, a, np.inf))
med_le3 = (cnt > 0) & (c3 >= (cnt // 2) + 1)
con = st & (med_le3 | (mn <= -5)); only_min = st & (mn <= -5) & ~med_le3
print(f"   wada „Osiadanie gruntu” pojawi się dla punktu w {con.sum()/n:.1%} obszaru badań; w {only_min.sum()/max(con.sum(),1):.0%} tych miejsc tylko dlatego, że gdzieś w kole 1 km jest jedna komórka <= -5")
city = st & (b20 >= 0.15)
print(f"   w zabudowie (>=15% w 2020): wada w {(con&city).sum()/city.sum():.1%} komórek")
own3 = np.zeros((h, w), bool)
for dr in (-1, 0, 1):
    for dc in (-1, 0, 1):
        own3 |= np.nan_to_num(shifted(v, dr, dc) <= -3).astype(bool)
print(f"   z miejsc z wadą: własna komórka albo jej 8 sąsiadów osiada (<= -3) tylko w {(con&own3).sum()/con.sum():.1%}; mediana w kole 1 km <= -3 w {(con&med_le3).sum()/con.sum():.1%}")
print(f"   kara -25 pkt do oceny (mediana <= -3): {(st&med_le3).sum()/n:.2%} obszaru")
np.save(OUT + "/rel.npy", rel)
