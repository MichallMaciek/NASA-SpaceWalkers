"""Teren odniesienia tylko z komórek bez drzew i bez gęstej zabudowy (model wysokości to model powierzchni)."""
import json, math, sys
import numpy as np
from PIL import Image
W, OUT = sys.argv[1], sys.argv[2]
L = json.load(open(f"{W}/data/land/land.json")); w, h = L["width"], L["height"]; T = L["transform3857"]
g = lambda n: np.asarray(Image.open(f"{W}/data/land/{n}.png").convert("L"), dtype=np.float64)
st = g("study") > 0; n = st.sum()
dem, ff, b20, eg = g("dem"), g("forest2000_frac"), g("built_2020") / 255, g("sar_egms")
flood = np.load(OUT + "/flood.npy")
def shifted(a, dr, dc):
    out = np.full(a.shape, np.nan)
    r0, r1 = max(0, -dr), min(h, h - dr); c0, c1 = max(0, -dc), min(w, w - dc)
    out[r0:r1, c0:c1] = a[r0 + dr:r1 + dr, c0 + dc:c1 + dc]
    return out
r = round(500 / L["cell_m_ground"])
offs = [(dr, dc) for dr in range(-r, r + 1, 2) for dc in range(-r, r + 1, 2) if dr * dr + dc * dc <= r * r]
def cell(lat, lon):
    R = 6378137.0; x = math.radians(lon) * R; y = R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    return int((y - T[5]) / T[4]), int((x - T[2]) / T[0])
spots = {"Morasko": (52.4833, 16.8992), "Dolina Warty": (52.4042, 16.9458), "Naramowice": (52.4485, 16.9550), "Stary Rynek": (52.4083, 16.9335)}
def run(name, ground):
    s = np.zeros((h, w)); c = np.zeros((h, w))
    for dr, dc in offs:
        a = shifted(dem, dr, dc); m = np.isfinite(a) & (np.nan_to_num(shifted(ground.astype(float), dr, dc)) > 0)
        s += np.where(m, a, 0); c += m
    rel = (dem - s / np.maximum(c, 1)) / 2
    known = ground & (c >= 8) & st
    low, high = known & (rel <= -1.5), known & (rel >= 1.0)
    a, b = (low & flood).sum() / max((known & flood).sum(), 1), (low & ~flood).sum() / max((known & ~flood).sum(), 1)
    print(f"--- {name}: werdykt na {known.sum()/n:.1%} obszaru | zagłębienie {low.sum()/known.sum():.1%} z werdyktem ({low.sum()/n:.1%} obszaru) | „wyniesiony” (>= +1 m) {high.sum()/known.sum():.1%} | strefy podtopień: {a:.1%} wobec {b:.1%} = {a/max(b,1e-9):.1f} razy")
    built = st & (b20 >= 0.15)
    print(f"    zabudowa (>=15%): werdykt na {(known&built).sum()/built.sum():.0%}, zagłębienie {(low&built).sum()/max((known&built).sum(),1):.1%}")
    for k, (la, lo) in spots.items():
        rr, cc = cell(la, lo)
        print(f"    {k}: las {ff[rr,cc]/255:.0%}, zabudowa {b20[rr,cc]:.0%}, próbek {int(c[rr,cc])}, " + (f"względem otoczenia {rel[rr,cc]:+.1f} m" if known[rr, cc] else "bez werdyktu"))
    return rel, known
allc = np.ones((h, w), bool)
run("dziś (wszystkie komórki)", allc)
run("bez drzew (las 2000 <= 2%)", ff <= 5)
run("bez drzew i bez zabudowy > 30%", (ff <= 5) & (b20 <= 0.30))
run("bez drzew i bez zabudowy > 15%", (ff <= 5) & (b20 <= 0.15))
# osiadanie w czterech miejscach: własna komórka i najgorsza w kole 1 km
v = np.where(eg > 0, eg - 100, np.nan); R1 = 1000 / L["cell_m_ground"]
for k, (la, lo) in spots.items():
    rr, cc = cell(la, lo); best = (0, None)
    for dr in range(-14, 15):
        for dc in range(-14, 15):
            if dr * dr + dc * dc > R1 * R1: continue
            x = v[rr + dr, cc + dc]
            if np.isfinite(x) and x < best[0]: best = (x, round(math.hypot(dr, dc) * L["cell_m_ground"]))
    print(f"osiadanie {k}: własna komórka {v[rr,cc]} mm/rok; najgorsza w kole 1 km {best[0]} mm/rok w odległości {best[1]} m")
