"""Odtwarza warstwę „Ocena działki” (web/app/14-layers.js, k === "score") i sprawdza, co ją barwi na zielono."""
import json, math, sys
import numpy as np
from PIL import Image, ImageDraw

W = sys.argv[1]
L = json.load(open(f"{W}/data/land/land.json"))
w, h = L["width"], L["height"]
g = lambda n: np.asarray(Image.open(f"{W}/data/land/{n}.png").convert("L"), dtype=np.float64)
st = g("study") > 0
ff, p30, b25, eg, sc, loss = g("forest2000_frac"), g("prob_2030"), g("built_2025"), g("sar_egms"), g("sar_change"), g("loss_frac")

s = np.full((h, w), 68.0)
s += np.where(ff > 0, ff / 255 * 25, 0)
s -= np.where(p30 > 15, p30 / 255 * 20, 0)
s -= np.where(b25 > 120, 6, 0)
v = eg - 100
has = eg > 0
s -= np.where(has & (v <= -2), np.minimum(30, np.abs(v) * 6), 0)
s += np.where(has & (v >= -0.5) & (v <= 1), 5, 0)
ch = sc / 12.75 - 10
s -= np.where((sc > 0) & (ch >= 3), 15, 0)

# strefy podtopień PIG-PIB na siatce
T = L["transform3857"]
print("transform3857", T)
fl = json.load(open(f"{W}/data/podtopienia.geojson"))
R = 6378137.0
def px(lon, lat):
    x = math.radians(lon) * R; y = R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    return ((x - T[2]) / T[0], (y - T[5]) / T[4]) if abs(T[0]) > 1 and len(T) == 6 and abs(T[1]) < 1e-9 else None
img = Image.new("L", (w, h), 0); d = ImageDraw.Draw(img)
for f in fl["features"]:
    geom = f["geometry"]; polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    for poly in polys:
        d.polygon([px(*pt[:2]) for pt in poly[0]], fill=1)
        for hole in poly[1:]: d.polygon([px(*pt[:2]) for pt in hole], fill=0)
flood = (np.asarray(img) > 0) & st
s = np.clip(s - np.where(flood, 28, 0), 5, 95)
np.save(sys.argv[2] + "/flood.npy", flood); np.save(sys.argv[2] + "/score.npy", s)

n = st.sum(); forest = (ff / 255 >= 0.5) & st; built = (b25 > 120) & st
print(f"komórek w obszarze: {n}, las (>=50% w 2000): {forest.sum()} ({forest.sum()/n:.1%}), zabudowa 2025: {built.sum()} ({built.sum()/n:.1%}), strefy podtopień: {flood.sum()} ({flood.sum()/n:.1%}), pomiar EGMS: {(has&st).sum()} ({(has&st).sum()/n:.1%})")
print("ocena: percentyle 5/25/50/75/95:", np.percentile(s[st], [5, 25, 50, 75, 95]).round(1))
for lo, hi, nm in [(5, 41, "czerwono-pomarańczowe (<41)"), (41, 59, "żółte (41-59)"), (59, 77, "jasnozielone (59-77)"), (77, 96, "ciemnozielone (>=77)")]:
    m = st & (s >= lo) & (s < hi)
    if m.sum() == 0: print(nm, "0"); continue
    print(f"{nm}: {m.sum()/n:.1%} obszaru | las>=50%: {(m&forest).sum()/m.sum():.0%} | średni udział lasu: {(ff[m]/255).mean():.0%} | zabudowa: {(m&built).sum()/m.sum():.0%} | w strefie podtopień: {(m&flood).sum()/m.sum():.1%}")
dg = st & (s >= 77)
print(f"z lasu (>=50%): ciemnozielone {(forest&dg).sum()/forest.sum():.0%}")
print(f"strefy podtopień: ciemnozielone {(flood&dg).sum()/flood.sum():.0%}, jasnozielone lub lepiej (>=59) {(flood&(s>=59)).sum()/flood.sum():.0%}, średnia ocena {s[flood].mean():.1f} wobec {s[st&~flood].mean():.1f} poza strefami")
print("korelacja oceny z udziałem lasu:", np.corrcoef(s[st], ff[st])[0, 1].round(2), "| z szansą zabudowy:", np.corrcoef(s[st], p30[st])[0, 1].round(2))
# las, który już wycięto: forest2000 wysokie, strata wysoka
cut = st & (ff / 255 >= 0.5) & (loss / 255 >= 0.5)
print(f"las z 2000 r., w którym ubyło >=50% drzew: {cut.sum()} komórek, ciemnozielone: {(cut&dg).sum()/max(cut.sum(),1):.0%}")
# co obniża ocenę
for nm, m in [("osiadanie <= -2 mm/rok", has & (v <= -2)), ("zmiana radaru >= 3 dB", (sc > 0) & (ch >= 3)), ("szansa zabudowy (p30>15)", p30 > 15), ("zabudowa 2025", b25 > 120)]:
    print(f"kara: {nm}: {(m&st).sum()} komórek ({(m&st).sum()/n:.2%})")
