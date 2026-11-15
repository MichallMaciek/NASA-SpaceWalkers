"""Alarm „nowe mury” (Sentinel-1, jesień 2025 -> jesień 2026) i warstwa OPERA: co pokazują dane aplikacji.
Użycie: python -I mapy_mury_opera.py web"""
import json, math, sys
import numpy as np
from PIL import Image, ImageDraw

W = sys.argv[1]
L = json.load(open(f"{W}/data/land/land.json")); w, h = L["width"], L["height"]; T = L["transform3857"]
S = json.load(open(f"{W}/data/land/sar.json"))
g = lambda p: np.asarray(Image.open(f"{W}/data/{p}.png").convert("L"), dtype=np.float64)
st = g("land/study") > 0; n = st.sum()
ch, dr, b20, ff = g("land/sar_change"), g("land/sar_dratio"), g("land/built_2020"), g("land/forest2000_frac")
fy = g("sarnik/radar_lata/first_year"); thr = round(L["threshold"] * 255)
wd = S["s1"].get("wall_db", 1.5)
up = (ch > 0) & (ch / 12.75 - 10 >= 3)
walls = up & (dr > 0) & (dr / 12.75 - 10 >= wd) & st
R = 6378137.0
def px(lon, lat):
    return ((math.radians(lon) * R - T[2]) / T[0], (R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) - T[5]) / T[4])
def raster(features, outline=True):
    img = Image.new("L", (w, h), 0); d = ImageDraw.Draw(img)
    for f in features:
        geom = f["geometry"]; polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        for poly in polys:
            pts = [px(*p[:2]) for p in poly[0]]
            if len(pts) >= 3: d.polygon(pts, fill=1, outline=1 if outline else None)
            for hole in poly[1:]:
                hp = [px(*p[:2]) for p in hole]
                if len(hp) >= 3: d.polygon(hp, fill=0)
    return np.asarray(img) > 0
def nb(a, r=1):  # czy w sąsiedztwie (2r+1)x(2r+1) jest prawda
    out = np.zeros_like(a, bool)
    for dr_ in range(-r, r + 1):
        for dc in range(-r, r + 1):
            s = np.zeros_like(a, bool)
            r0, r1 = max(0, -dr_), min(h, h - dr_); c0, c1 = max(0, -dc), min(w, w - dc)
            s[r0:r1, c0:c1] = a[r0 + dr_:r1 + dr_, c0 + dc:c1 + dc]; out |= s
    return out
print(f"ściany: {walls.sum()} komórek ({walls.sum()*0.5358:.0f} ha); sar.json walls_ha: {S['s1'].get('walls_ha')}")
built_any = (b20 >= thr) | (fy >= 15)
new_radar = (fy >= 21) & (fy <= 26)
print(f"  na komórkach, których żadna mapa nie widzi jako zabudowane (optyczna 2020 < 15% i radar 'bez zabudowy'): {(walls & ~built_any).sum()/walls.sum():.0%}")
print(f"  w samej komórce radar datuje nową zabudowę 2021–2026: {(walls & new_radar).sum()/walls.sum():.1%}; w komórce lub u sąsiada: {(walls & nb(new_radar)).sum()/walls.sum():.1%}")
print(f"  pojedyncze (żaden z 8 sąsiadów nie jest ścianą): {(walls & ~nb(walls & ~walls) & (np.add.reduce([np.roll(np.roll(walls, a, 0), b, 1) for a in (-1,0,1) for b in (-1,0,1)]) == 1)).sum()/walls.sum():.0%}")
gates = {"bez bramki": walls, "przy zabudowie (3x3: optyczna 2020 lub radar)": walls & nb(built_any), "przy nowej zabudowie z radaru 2021–2026 (3x3)": walls & nb(new_radar)}
# decyzje WUIA w Poznaniu
wu = json.load(open(f"{W}/data/wuia_decyzje.geojson"))["features"]
dec = raster([f for f in wu if f["properties"]["kategoria"] == "nowa budowa" and f["properties"]["status"] == "decyzja"])
anyc = raster(wu)
city = raster([f for f in json.load(open(f"{W}/data/areas.geojson"))["features"] if f["properties"].get("role") == "city"], outline=False) & st
rest = city & ~anyc; dec &= city
print(f"Poznań: {city.sum()} komórek; z decyzją 'nowa budowa': {dec.sum()}; bez żadnej sprawy: {rest.sum()}")
rng = np.random.default_rng(7); B = 16
bid = (np.arange(h)[:, None] // B) * 1000 + (np.arange(w)[None, :] // B)
def ratio_ci(sig):
    blocks = np.unique(bid[city]); idx = {b: i for i, b in enumerate(blocks)}
    lab = np.vectorize(lambda b: idx.get(b, -1))(bid)
    def sums(m): return np.bincount(lab[m & city], minlength=len(blocks)).astype(float)
    a1, a0, b1, b0 = sums(sig & dec), sums(dec), sums(sig & rest), sums(rest)
    r = (a1.sum() / a0.sum()) / max(b1.sum() / b0.sum(), 1e-12)
    out = []
    for _ in range(2000):
        k = rng.integers(0, len(blocks), len(blocks))
        x, y = a1[k].sum() / max(a0[k].sum(), 1), b1[k].sum() / max(b0[k].sum(), 1)
        if y > 0: out.append(x / y)
    return r, np.percentile(out, [2.5, 97.5]), int(a1.sum()), a1.sum() / a0.sum(), b1.sum() / b0.sum()
# alarm w karcie: ściany na > 2% koła 1 km
Rc = 1000 / L["cell_m_ground"]; rr = int(np.ceil(Rc))
def circle_share(sig):
    num = np.zeros((h, w)); den = np.zeros((h, w)); valid = (ch > 0).astype(float); s = sig.astype(float)
    for a in range(-rr, rr + 1):
        for b in range(-rr, rr + 1):
            if a * a + b * b > Rc * Rc: continue
            r0, r1 = max(0, -a), min(h, h - a); c0, c1 = max(0, -b), min(w, w - b)
            num[r0:r1, c0:c1] += s[r0 + a:r1 + a, c0 + b:c1 + b]; den[r0:r1, c0:c1] += valid[r0 + a:r1 + a, c0 + b:c1 + b]
    return num / np.maximum(den, 1)
for nm, sig in gates.items():
    r, ci, k, pa, pb = ratio_ci(sig)
    al = (circle_share(sig) > 0.02) & st
    print(f"--- {nm}: ścian {sig.sum()}; decyzje a reszta Poznania: {pa:.2%} wobec {pb:.2%} = {r:.1f} razy (95%: {ci[0]:.1f}–{ci[1]:.1f}; {k} komórek z decyzją i ścianą); alarm w karcie na {al.sum()/n:.2%} obszaru ({al.sum()} komórek)")
# OPERA: udział flag w lesie według kolumn (długości geograficznej)
di = g("land/dist_forest"); forest = (ff > 127) & st; fl = (di > 0) & forest
print(f"OPERA: las (>=50% w 2000): {forest.sum()} komórek, z flagą {fl.sum()} ({fl.sum()/forest.sum():.1%})")
for c0 in range(0, w, 120):
    m = forest[:, c0:c0 + 120]; 
    lon = math.degrees((T[2] + (c0 + 60) * T[0]) / R)
    if m.sum() > 300: print(f"   kolumny {c0:3d}–{min(c0+119, w-1):3d} (ok. {lon:.2f}°E): las {m.sum():6d}, z flagą {fl[:, c0:c0+120].sum()/m.sum():.1%}")
