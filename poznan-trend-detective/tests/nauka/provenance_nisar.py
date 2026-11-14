"""Provenance checks for the NISAR part of SARnik (review only; changes nothing).

1. Versions: every NISAR date used in sar.json and every date offered by the GIBS slider (land.json nisar_dates)
   is looked up in the team's ASF pass list (progres/p1/dane/nisar_poznan_przeloty.csv).
2. Duplicates: same-date GCOV files on track 158 (B:231 merges them by nanmean).
3. Soil-wetness sources: the dry/wet pair values (Open-Meteo ERA5, m3/m3) next to NASA POWER GWETTOP on the
   bracketing Sentinel-1 days (sar.json s1.soil_wetness).
4. How often the plain card's only NISAR line ("ground soaks up a lot", A:1609-1612, nw > 0.5) can fire:
   share of 1 km x 1 km windows (14 x 14 cells of ~73 m) whose open cells have HH wet-dry >= 2 dB on more than
   half of them, compared with windows where the Sentinel-1 "new buildings" line fires (walls share > 2 %).

Run: python tests/nauka/provenance_nisar.py   (from poznan-trend-detective/)
"""
import csv
import json
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parents[2]          # poznan-trend-detective/
REPO = HERE.parent
LAND = HERE / "web" / "data" / "land"

rows = list(csv.DictReader(open(REPO / "progres/p1/dane/nisar_poznan_przeloty.csv", encoding="utf-8")))
gcov = [r for r in rows if r["produkt"] == "GCOV"]
ver = {}
for r in gcov:
    ver.setdefault(r["data"], set()).add((r["orbita"], r["kierunek"], r["wersja"]))
sar = json.load(open(LAND / "sar.json"))
land = json.load(open(LAND / "land.json"))

print("== 1. versions")
used = sar["nisar"]["dates"]
print("sar.json NISAR dates:", len(used), "versions:", sorted({v for d in used for _, _, v in ver[d]}),
      "tracks:", sorted({t for d in used for t, _, _ in ver[d]}))
nd = land["nisar_dates"]
bad = [(d, sorted(ver[d])) for d in nd if any(v != "provisional" for _, _, v in ver[d])]
print("land.json nisar_dates:", len(nd), "| tracks:", sorted({t for d in nd for t, _, _ in ver[d]}),
      "| non-provisional:", bad)
print("default GIBS slider date (last):", nd[-1], sorted(ver[nd[-1]]))
t158 = sorted({r["data"] for r in gcov if r["orbita"] == "158" and r["wersja"] == "provisional"})
gaps = [(a, b, (np.datetime64(b) - np.datetime64(a)).astype(int)) for a, b in zip(t158, t158[1:])]
print("track 158 provisional gaps (days):", [g[2] for g in gaps])

print("== 2. same-date files on track 158")
for d in t158:
    names = [r["nazwa"] for r in gcov if r["orbita"] == "158" and r["data"] == d]
    if len(names) > 1:
        print(d, [n[-48:] for n in names])

print("== 3. soil wetness sources")
csvw = {r["data"]: (r["wilgotnosc_gleby_m3m3"], r["deszcz_3dni_mm"]) for r in gcov if r["orbita"] == "158"}
print("pass list (Open-Meteo ERA5, soil_moisture_0_to_7cm m3/m3, rain 3 d):",
      {d: csvw[d] for d in ("2026-06-25", "2026-08-24")})
s1d, s1w, s1r = sar["s1"]["dates"], sar["s1"]["soil_wetness"], sar["s1"]["rain3_mm"]
for d in ("2026-06-21", "2026-06-28", "2026-08-21", "2026-08-27"):
    k = s1d.index(d)
    print("NASA POWER GWETTOP (0-1) on S1 day", d, s1w[k], "rain3 POWER", s1r[k])

print("== 4. how often the plain card shows a NISAR line")
W, H = land["width"], land["height"]
study = np.array(Image.open(LAND / "study.png")) > 0
wd = np.array(Image.open(LAND / "nisar_wetdry.png")).astype(float)
ch = np.array(Image.open(LAND / "sar_change.png")).astype(float)
dr = np.array(Image.open(LAND / "sar_dratio.png")).astype(float)
dwet = np.where(wd > 0, wd / 12.75 - 10, np.nan)
chg = np.where(ch > 0, ch / 12.75 - 10, np.nan)
drt = np.where(dr > 0, dr / 12.75 - 10, np.nan)
B = 14
nis, s1walls, s1up, n = 0, 0, 0, 0
for y in range(0, H - B, B):
    for x in range(0, W - B, B):
        if study[y:y + B, x:x + B].mean() < 0.9:
            continue
        n += 1
        w = dwet[y:y + B, x:x + B]
        ok = np.isfinite(w)
        if ok.any() and (w[ok] >= 2).mean() > 0.5:
            nis += 1
        c, r = chg[y:y + B, x:x + B], drt[y:y + B, x:x + B]
        okc = np.isfinite(c)
        if okc.any():
            walls = ((c >= 3) & (r >= 1.5)).sum() / okc.sum()
            up = (c >= 3).sum() / okc.sum()
            s1walls += walls > 0.02
            s1up += (walls <= 0.02) and (up > 0.05)
print(f"1 km windows: {n}; NISAR 'soaks' line possible in {nis / n:.1%}; "
      f"Sentinel-1 'new buildings' warn in {s1walls / n:.1%}, 'other change' info in {s1up / n:.1%}")

print("== 5. README 'NISAR about 3 dB brighter than ALOS-2' (median of NISAR median minus ALOS-2 year, study area)")
dbp = lambda name: (lambda a: np.where(a > 0, a / 6 - 30, np.nan))(np.array(Image.open(LAND / f"{name}.png")).astype(float))
for pol in ("hh", "hv"):
    nn = dbp(f"nisar_{pol}_med")
    out = []
    for yr in sar["alos"]["years"]:
        aa = dbp(f"alos_{pol}_{yr}")
        m = study & np.isfinite(nn) & np.isfinite(aa)
        out.append(round(float(np.median(nn[m] - aa[m])), 2))
    print(pol.upper(), dict(zip(sar["alos"]["years"], out)))
