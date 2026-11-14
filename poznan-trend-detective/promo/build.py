"""Build the promo videos from the narration, the captured app footage and the HTML stage.

Usage:
  .venv/bin/python build.py pl_long            -> out/reklama_pl_16x9.mp4   (Polish, ~85 s, Polish subtitles)
  .venv/bin/python build.py en_30s             -> out/submission_30s_en.mp4 (English, <= 30 s, English subtitles)
  .venv/bin/python build.py pl_long --stills 3,12.5,40   PNG stills at those seconds (build/<cut>/still_*.png), no video
  .venv/bin/python build.py pl_long --no-music           voice only

Steps: check every number against the app's data -> lay the voice-over out on a timeline (pauses between
scenes) -> place scenes and subtitles on the voice timing -> draw each frame in headless Chrome (stage/index.html)
-> encode H.264 1920x1080 30 fps -> mix voice + quiet generated pad + click sounds -> mux.
Needs: build/tts/<lang>.json + .mp3 (tts.py) and capture/* (capture.py).
"""
import asyncio, json, math, subprocess, sys, wave
from pathlib import Path
import numpy as np
import imageio_ffmpeg
from playwright.async_api import async_playwright

HERE = Path(__file__).parent
WEB = HERE.parent / "web"
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS, SR = 30, 48000

# ------------------------------------------------------------------ numbers, read from the app's data
LAND = json.loads((WEB / "data/land/land.json").read_text(encoding="utf-8"))
STUDY = json.loads((WEB / "data/study.json").read_text(encoding="utf-8"))


def theil_sen(x, y):
    s = sorted((y[j] - y[i]) / (x[j] - x[i]) for i in range(len(x)) for j in range(i + 1, len(x)))
    b = float(np.median(s))
    return b, float(np.median([yy - b * xx for xx, yy in zip(x, y)]))


def numbers():
    B = LAND["study_built_share_pct"]
    M = LAND["model"]
    px = STUDY["pixel_summary"]
    day = STUDY["growth_correlation"]["day_lst"]
    P = LAND["prices"]["data"]["Poznań (city)"]
    F = LAND["forest_loss_trend"]
    b, a = theil_sen(F["years"], F["ha"])
    n = {
        "b1990": B["1990"], "b2020": B["2020"], "b2035": B["2035"],
        "hit": M["top_n_hit_rate"], "tested": M["tested_on"],
        "night": px["night_sig_warming_share"], "cool": px["night_sig_cooling_share"], "lst_px": px["lst_pixels"],
        "day_r": day["spearman_r"], "day_p": day["p"], "day_n": day["n"],
        "price2024": P["633677"]["2024"], "wage2024": P["64428"]["2024"],
        "nisar_n": len(LAND["nisar_dates"]), "nisar_first": LAND["nisar_dates"][0],
        "forest": {"years": F["years"], "ha": F["ha"], "slope_dec": F["slope_ha_per_decade"], "p": F["p"],
                   "line": [a + b * F["years"][0], a + b * F["years"][-1]]},
        "forest_total": round(sum(m["forest_loss_total_ha"] for m in LAND["municipalities"].values())),
        "heat_years": [min(STUDY["years"]), max(y for y in STUDY["years"] if y not in STUDY["missing_years"]["night_lst"])],
    }
    # CHECKS: every claim the voice makes in words must still hold for the current data
    checks = [
        (n["b2020"] / n["b1990"] > 2, "built-up land more than doubled 1990-2020 ('ponad dwukrotnie', 'more than doubled')"),
        (round(n["hit"] * 100) == 56, "model hit rate rounds to 56 % (spoken '56 procent')"),
        (n["tested"] == "2015-2020", "model tested on 2015-2020"),
        (n["night"] >= 90, "summer nights warmed significantly 'prawie wszędzie' (>= 90 % of squares)"),
        (n["cool"] == 0, "no square cooled ('żaden kwadrat się nie ochłodził')"),
        (n["day_r"] > 0 and n["day_p"] < 0.05, "faster-growing municipalities warm faster by day (r > 0, p < 0.05)"),
        (abs(b * 10 - F["slope_ha_per_decade"]) < 0.1, "Theil-Sen slope of forest loss matches land.json"),
        (F["p"] < 0.05, "forest-loss trend significant"),
        (abs(sum(F["ha"]) - n["forest_total"]) < 10, "forest-loss series covers the 18 municipalities"),
    ]
    bad = [m for ok, m in checks if not ok]
    if bad:
        sys.exit("Data changed, the narration no longer matches:\n  " + "\n  ".join(bad))
    return n


def fmt(v, d, lang):
    s = f"{v:,.{d}f}"
    return s.replace(",", " ").replace(".", ",") if lang == "pl" else s


def strings(lang, n):
    f = lambda v, d=0: fmt(v, d, lang)
    if lang == "pl":
        return {
            "carLabel": "Używany samochód", "carPrice": "30 000 zł", "carSub": "Stacja diagnostyczna",
            "carCardTitle": "Przegląd techniczny pojazdu",
            "carRows": [["Grubość lakieru", "w normie"], ["Geometria ramy", "w normie"], ["Wycieki oleju", "brak"]],
            "houseLabel": "Dom lub działka", "housePrice": "1 000 000 zł", "houseSub": "Ogłoszenie i zdjęcia",
            "listingTitle": "Dom z ogrodem, cicha okolica", "listingBy": "Opis dewelopera",
            "listingQuote": "„Spokojna, zielona okolica”",
            "landCardTitle": "Przegląd techniczny terenu",
            "landRows": ["Zabudowa wokół", "Woda gruntowa", "Ukształtowanie terenu", "Upał", "Wycinka drzew"],
            "titleKicker": "NASA Space Apps Challenge 2026 · Poznań", "brand": "Poznań Trend Detective",
            "titleTag": "Techniczny przegląd terenu z kosmosu",
            "builtTitle": "Zabudowa w 18 gminach, % powierzchni",
            "modelChip": f"Test {n['tested'].replace('-', '–')}: trafił {f(n['hit'] * 100, 1)}% nowej zabudowy",
            "verdict": "Ranking, nie wyrok.",
            "nightK": "Kwadraty 1 km z istotnym ociepleniem letnich nocy",
            "nightNote": f"z {f(n['lst_px'])} kwadratów; żaden się nie ochłodził. NASA MODIS, {n['heat_years'][0]}–{n['heat_years'][1]}, test Manna-Kendalla",
            "dayK": "Wzrost liczby mieszkańców gminy a ocieplenie jej letnich dni",
            "dayNote": f"Spearman, {n['day_n']} gmin, p = {f(n['day_p'], 4)}. NASA MODIS, {n['heat_years'][0]}–{n['heat_years'][1]}",
            "chartTitle": "Utrata pokrycia drzewami w 18 gminach, ha rocznie",
            "chartSrc": f"Global Forest Change v1.12 (Landsat), {n['forest']['years'][0]}–{n['forest']['years'][-1]}",
            "chipSen": f"Theil-Sen: +{f(n['forest']['slope_dec'], 1)} ha na dekadę", "chipMK": f"Mann-Kendall: p = {f(n['forest']['p'], 4)}",
            "closeTag": "Sprawdź teren, zanim podpiszesz.",
            "closeChips": ["NASA Space Apps Challenge 2026 · Poznań", "Be An Earth System Trend Detective"],
            "tiles": [("NASA MODIS", "ciepło i zieleń, 2000–2024"), ("NISAR (NASA-ISRO)", f"radar L, {n['nisar_n']} dat przelotów od 06.2026"),
                      ("Landsat", "zabudowa (GHSL) i wycinka (GFC)"), ("Sentinel-1", "jasność i zmiany radaru 2017–2024"),
                      ("Copernicus DEM", "wysokość i obniżenia terenu"), ("GUS · IMGW · PIG-PIB", "ceny, płace, stacja Ławica, podtopienia")],
            "localText": "GUS: ceny m², płace<br>IMGW: stacja Ławica<br>PIG-PIB: podtopienia",
            "dataTitle": "Otwarte dane, z których liczymy każdą kartę",
        }
    return {
        "carLabel": "Used car", "carPrice": "30,000 zł", "carSub": "Diagnostic station",
        "carCardTitle": "Vehicle inspection",
        "carRows": [["Paint thickness", "fine"], ["Frame geometry", "fine"], ["Oil leaks", "none"]],
        "houseLabel": "House or plot", "housePrice": "1,000,000 zł", "houseSub": "Listing photos",
        "listingTitle": "House with garden, quiet area", "listingBy": "Developer's description", "listingQuote": "“Calm, green neighbourhood”",
        "landCardTitle": "Technical inspection of the land",
        "landRows": ["Building around", "Groundwater", "Lie of the land", "Heat", "Trees cut"],
        "titleKicker": "NASA Space Apps Challenge 2026 · Poznań", "brand": "Poznań Trend Detective",
        "titleTag": "A technical inspection of land from space",
        "builtTitle": "Built-up land, 18 municipalities, % of area",
        "modelChip": f"Tested on {n['tested'].replace('-', '–')}: {f(n['hit'] * 100, 1)}% of top-ranked cells were built",
        "verdict": "A ranking, not a verdict.",
        "nightK": "1 km squares where summer nights warmed significantly",
        "nightNote": f"of {f(n['lst_px'])} squares; none cooled. NASA MODIS, {n['heat_years'][0]}–{n['heat_years'][1]}, Mann-Kendall test",
        "dayK": "Population growth of a municipality vs warming of its summer days",
        "dayNote": f"Spearman, {n['day_n']} municipalities, p = {f(n['day_p'], 4)}. NASA MODIS",
        "chartTitle": "Tree-cover loss in the 18 municipalities, ha per year",
        "chartSrc": f"Global Forest Change v1.12 (Landsat), {n['forest']['years'][0]}–{n['forest']['years'][-1]}",
        "chipSen": f"Theil-Sen: +{f(n['forest']['slope_dec'], 1)} ha per decade", "chipMK": f"Mann-Kendall: p = {f(n['forest']['p'], 4)}",
        "closeTag": "Check the land before you sign.",
        "closeChips": ["NASA Space Apps Challenge 2026 · Poznań", "Be An Earth System Trend Detective"],
        "trioTitle": "NASA data at the core",
        "trio": [("NASA MODIS", f"summer heat and greenness, {n['heat_years'][0]}–{n['heat_years'][1]}"),
                 ("Landsat", "building history (GHSL) and forest loss (GFC)"),
                 ("NISAR (NASA-ISRO)", f"L-band radar, {n['nisar_n']} pass dates since June 2026")],
        "tiles": [("NASA MODIS", f"heat and greenness, {n['heat_years'][0]}–{n['heat_years'][1]}"),
                  ("NISAR (NASA-ISRO)", f"L-band radar, {n['nisar_n']} pass dates since 06.2026"),
                  ("Landsat", "building (GHSL) and forest loss (GFC)"), ("Sentinel-1", "radar brightness and change 2017–2024"),
                  ("Copernicus DEM", "terrain height and hollows"), ("GUS · IMGW · PIG-PIB", "prices, wages, Ławica station, groundwater")],
        "localText": "GUS: prices per m², wages<br>IMGW: Ławica station<br>PIG-PIB: groundwater flooding",
        "dataTitle": "Open data behind every card",
    }


def nums_display(lang, n):
    f = lambda v, d=0: fmt(v, d, lang)
    return {"nightShare": f"{f(n['night'], 1)}%", "dayR": f"r = {f(n['day_r'], 2)}"}


# ------------------------------------------------------------------ cuts
CUTS = {
    "pl_long": {"lang": "pl", "out": "reklama_pl_16x9", "lead": 0.4, "tail": 2.8, "tempo": 1.0, "max_gap": None,
                "pause": {"title": 0.3, "search": 0.45, "timeline": 0.35, "heat": 0.2, "data": 0.25, "close": 0.45, "cue:Nikt nie": 0.3}},
    "en_long": {"lang": "en", "tts": "en_long", "out": "reklama_en_16x9", "lead": 0.4, "tail": 2.8, "tempo": 1.0, "max_gap": None,
                "pause": {"title": 0.3, "search": 0.45, "timeline": 0.35, "heat": 0.2, "data": 0.25, "close": 0.45, "cue:Nobody": 0.3}},
    "en_30s": {"lang": "en", "out": "submission_30s_en", "lead": 0.25, "tail": 1.9, "tempo": 1.07, "max_gap": 0.24,
               "pause": {}, "limit": 29.9},
}


# ------------------------------------------------------------------ audio helpers
def decode(path):
    raw = subprocess.run([FF, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def silent_runs(x, thr_db=-42, hop=0.01):
    h = int(SR * hop)
    n = len(x) // h
    rms = np.sqrt(np.mean(x[: n * h].reshape(n, h) ** 2, axis=1) + 1e-12)
    sil = 20 * np.log10(rms) < thr_db
    runs, k = [], 0
    while k < n:
        if sil[k]:
            j = k
            while j < n and sil[j]:
                j += 1
            runs.append((k * hop, j * hop))
            k = j
        else:
            k += 1
    return runs


def voice_timeline(meta, cut, work):
    """cut the take at the silences between cues, shorten or lengthen those silences, return the new voice track
    and a function mapping take time -> video time"""
    al, cues, text = meta["alignment"], meta["cues"], meta["text"]
    st, en = al["character_start_times_seconds"], al["character_end_times_seconds"]
    for c in cues:
        i0 = c["char0"]
        i1 = c["char1"] - 1
        c["a"], c["b"] = st[i0], en[i1]
    x = decode(HERE / "build/tts" / f"{cut.get('tts', cut['lang'])}.mp3")
    runs = silent_runs(x)
    segs, inserts = [], []      # segs: (orig_a, orig_b); inserts[k]: silence after seg k
    cur = 0.0
    for k in range(len(cues) - 1):
        lo, hi = cues[k]["b"] - 0.15, cues[k + 1]["a"] + 0.15
        cand = [(min(b, hi) - max(a, lo), a, b) for a, b in runs if b > lo and a < hi]
        if cand:
            _, a, b = max(cand)
        else:
            a = b = (cues[k]["b"] + cues[k + 1]["a"]) / 2
        L = b - a
        keep = min(L, cut["max_gap"]) if cut["max_gap"] else L
        segs.append((cur, a + keep / 2))
        cur = b - keep / 2
        extra = 0.0
        if cues[k + 1]["scene"] != cues[k]["scene"]:
            extra += cut["pause"].get(cues[k + 1]["scene"], 0.0)
        for key, v in cut["pause"].items():
            if key.startswith("cue:") and cues[k + 1]["text"].startswith(key[4:]):
                extra += v
        inserts.append(extra)
    segs.append((cur, len(x) / SR))
    inserts.append(0.0)
    # assemble
    out, table, t_new = [], [], 0.0
    fade = int(0.008 * SR)
    for (a, b), extra in zip(segs, inserts):
        s = x[int(a * SR): int(b * SR)].copy()
        if len(s) > 2 * fade:
            s[:fade] *= np.linspace(0, 1, fade); s[-fade:] *= np.linspace(1, 0, fade)
        table.append((a, b, t_new))
        out.append(s)
        t_new += len(s) / SR
        if extra > 0:
            out.append(np.zeros(int(extra * SR), np.float32))
            t_new += int(extra * SR) / SR
    v = np.concatenate(out)
    raw = work / "voice_edit.wav"
    write_wav(raw, v)
    tempo = cut["tempo"]
    final = work / "voice.wav"
    af = f"atempo={tempo}," if abs(tempo - 1) > 1e-6 else ""
    subprocess.run([FF, "-v", "error", "-y", "-i", str(raw), "-af", f"{af}adelay={int(cut['lead'] * 1000)}", "-ar", str(SR), str(final)], check=True)

    def tmap(t):
        for a, b, n0 in table:
            if t <= b:
                return cut["lead"] + (n0 + max(0.0, t - a)) / tempo
        a, b, n0 = table[-1]
        return cut["lead"] + (n0 + (t - a)) / tempo
    return final, tmap


# ------------------------------------------------------------------ scenes
def footage(lang):
    cap = HERE / "capture"
    rel = lambda p: "../capture/" + str(Path(p).relative_to(cap))
    s = cap / f"search_{lang}"
    tl = cap / f"timeline_{lang}"
    ly = cap / f"layers_{lang}"
    lp = cap / "layers_pl"
    pick = lambda name: rel(ly / name) if (ly / name).exists() else rel(lp / name)
    return {
        "search": {"frames": [rel(p) for p in sorted(s.glob("[0-9][0-9][0-9].png"))],
                   "meta": json.loads((s / "meta.json").read_text()), "cardImg": rel(s / "card_full.png")},
        "timeline": {"frames": [rel(p) for p in sorted(tl.glob("[0-9][0-9][0-9].png"))],
                     "years": json.loads((tl / "meta.json").read_text())["years"]},
        "layers": {k: pick(f"{k}.png") for k in ("night", "day", "forest", "radar", "dem", "flood", "nisar_36")},
        "clean": {"2020": rel(cap / "clean/2020.png"), "2035": rel(cap / "clean/2035.png")},
        "draw": ({"frames": [rel(p) for p in sorted((cap / f"draw_{lang}").glob("[0-9][0-9][0-9].png"))],
                  "meta": json.loads((cap / f"draw_{lang}" / "meta.json").read_text())}
                 if (cap / f"draw_{lang}" / "meta.json").exists() else None),
    }


# words in the voice-over that start each animation in the long cut (scene -> key -> word)
KW = {
    "pl": {"hook_car": ["grubość lakieru", "geometrię ramy", "wycieki oleju"], "photos": "ładne zdjęcia", "developer": "deweloperowi",
           "nobody": "Nikt nie", "draw": "obrysuj",
           "card": ["historię", "wskaźnik ryzyka", "wycinkę", "upał", "podtopień", "obniżenia", "radar", "cenę metra"],
           "doubled": "dwukrotnie", "model": "Model", "next": "dalej", "chip": "trafił", "verdict": "To ranking", "day": "A im szybciej",
           "tiles": ["MODIS", "NISAR", "Landsat", "Sentinel", "Copernicus", "GUS"], "test": "Każdy trend", "tag": "Sprawdź"},
    "en": {"hook_car": ["paint thickness", "frame geometry", "oil leaks"], "photos": "nice photos", "developer": "developer",
           "nobody": "Nobody", "draw": "draw an area",
           "card": ["building history", "building-risk", "trees cut", "heat", "groundwater", "terrain hollows", "radar", "price per"],
           "doubled": "doubled", "model": "The model", "next": "next", "chip": "it found", "verdict": "A ranking", "day": "And the faster",
           "tiles": ["MODIS", "NISAR", "Landsat", "Sentinel", "Copernicus", "GUS"], "test": "Every trend", "tag": "Check the land"},
}


def plan(cut_name, n, meta, tmap):
    cut = CUTS[cut_name]
    lang = cut["lang"]
    cues, text = meta["cues"], meta["text"]
    st, en = meta["alignment"]["character_start_times_seconds"], meta["alignment"]["character_end_times_seconds"]
    names = []
    for c in cues:
        if c["scene"] not in names:
            names.append(c["scene"])
    first = {s: min(c["char0"] for c in cues if c["scene"] == s) for s in names}
    cue_t = [(tmap(c["a"]), tmap(c["b"])) for c in cues]
    scene_start = {}
    for i, s in enumerate(names):
        k = next(j for j, c in enumerate(cues) if c["scene"] == s)
        scene_start[s] = 0.0 if i == 0 else cue_t[k][0] - 0.3
    total = cue_t[-1][1] + cut["tail"]

    def kw(scene, word, end=False):
        i = text.find(word, first[scene])
        if i < 0:
            sys.exit(f"keyword {word!r} not found in scene {scene}")
        t = tmap(en[i + len(word) - 1]) if end else tmap(st[i])
        return t - scene_start[scene]

    STR = strings(lang, n)
    K = KW[lang]
    pred = "var(--pred)"
    f = lambda v, d=2: fmt(v, d, lang)
    scenes = []
    for i, s in enumerate(names):
        t0, t1 = scene_start[s], (scene_start[names[i + 1]] if i + 1 < len(names) else total)
        d = {"name": s, "t0": round(t0, 4), "t1": round(t1, 4), "at": {}}
        if s == "hook_car":
            d.update(type="hook_car", at={f"row{i}": kw(s, w) for i, w in enumerate(K["hook_car"])})
        elif s == "hook_house":
            d.update(type="hook_house", at={"photos": kw(s, K["photos"]), "developer": kw(s, K["developer"]), "nobody": kw(s, K["nobody"])})
        elif s == "hook":
            d.update(type="hook", at={"house": kw(s, "A million"), "photos": kw(s, "nice photos")})
        elif s == "title":
            d.update(type="title", at={"brand": kw(s, "Poznań Trend")})
        elif s == "search":
            d.update(type="search", at={"draw": kw(s, K["draw"])})
        elif s == "card":
            d.update(type="card", focus=[[kw(s, w), key] for w, key in
                                         zip(K["card"], ["history", "risk", "ck2", "ck3", "ck4", "ck5", "ck6", "price"])])
        elif s == "inspect":
            card_at = kw(s, "building")
            d.update(type="inspect", at={"card": card_at},
                     focus=[[card_at - 0.05, "top"], [kw(s, "building") + .25, "ck0"], [kw(s, "trees"), "ck2"], [kw(s, "heat"), "ck3"],
                            [kw(s, "groundwater"), "ck4"], [kw(s, "radar"), "ck6"]])
        elif s in ("timeline", "growth", "forecast"):
            if s == "timeline":
                phases = [[0.25, kw(s, K["doubled"], True), 1975, 2020], [kw(s, K["model"]), kw(s, K["next"], True), 2020, 2035]]
                rows = [["1990", f(n["b1990"]) + "%", None, 1990], ["2020", f(n["b2020"]) + "%", None, 2020],
                        ["2035 · " + ("prognoza" if lang == "pl" else "forecast"), f(n["b2035"]) + "%", pred, 2035]]
                at = {"chip": kw(s, K["chip"]), "verdict": kw(s, K["verdict"])}
            elif s == "growth":
                phases = [[0.3, kw(s, "2020", True) - 0.2, 1990, 2020]]
                rows = [["1990", f(n["b1990"]) + "%", None, 1990], ["2020", f(n["b2020"]) + "%", None, 2020]]
                at = {}
            else:
                phases = [[0.2, kw(s, "checked", True), 2020, 2035]]
                rows = [["2020", f(n["b2020"]) + "%", None, 2020], ["2035 · forecast", f(n["b2035"]) + "%", pred, 2035]]
                at = {"chip": kw(s, "the forecast"), "verdict": kw(s, "never saw")}
            # when does the moving year reach each row's year?
            def year_at(t):
                for a, b, ya, yb in phases:
                    if t < a:
                        return ya
                    if t <= b:
                        q = (t - a) / (b - a)
                        q = 4 * q ** 3 if q < .5 else 1 - (-2 * q + 2) ** 3 / 2
                        return ya + (yb - ya) * q
                return phases[-1][3]
            row_at = []
            for r in rows:
                tt = next((x / 100 for x in range(0, int((t1 - t0) * 100) + 1) if year_at(x / 100) >= r[3] - 1e-6), t1 - t0)
                row_at.append(max(0.15, tt - 0.1))
            d.update(type="timeline", phases=phases, rowsDef=rows, rowAt=row_at, at=at)
        elif s == "heat":
            d.update(type="heat", at={"day": kw(s, K["day"])})
        elif s == "nisar":
            # "NASA MODIS, Landsat and NISAR data": one tile per mission, shown as it is named
            d.update(type="data", noChart=True, y0=300, title=STR["trioTitle"],
                     tileDefs=[{"src": "night", "fx": 980, "fy": 470, "zoom": 1.7, "name": STR["trio"][0][0], "what": STR["trio"][0][1]},
                               {"src": "forest", "fx": 1000, "fy": 470, "zoom": 1.7, "name": STR["trio"][1][0], "what": STR["trio"][1][1]},
                               {"src": "nisar_36", "fx": 760, "fy": 330, "zoom": 2.0, "name": STR["trio"][2][0], "what": STR["trio"][2][1]}],
                     at={"tile0": kw(s, "MODIS"), "tile1": kw(s, "Landsat"), "tile2": kw(s, "NISAR"), "test": 99})
        elif s == "data":
            L = "layers"
            d.update(type="data", trend=n["forest"],
                     tileDefs=[{"src": ("night", 980, 470, 1.7)}, {"src": ("nisar_36", 760, 330, 2.0)}, {"src": ("forest", 1000, 470, 1.7)},
                               {"src": ("radar", 980, 470, 1.8)}, {"src": ("dem", 980, 480, 1.6)}, {"src": None}],
                     at={**{f"tile{i}": kw(s, w) for i, w in enumerate(K["tiles"])}, "test": kw(s, K["test"])})
            for k, td in enumerate(d["tileDefs"]):
                td["name"], td["what"] = STR["tiles"][k]
                if td["src"]:
                    key, fx, fy, z = td["src"]
                    td.update(src=key, fx=fx, fy=fy, zoom=z)
                else:
                    td["text"] = STR["localText"]
        elif s == "close":
            d.update(type="close", at={"tag": kw(s, K["tag"])})
        scenes.append(d)
    # subtitles: from a hair before each cue until the next cue (or half a second after it ends)
    subs = []
    for k, (c, (a, b)) in enumerate(zip(cues, cue_t)):
        show = a - 0.06
        nxt = cue_t[k + 1][0] - 0.06 if k + 1 < len(cues) else total
        subs.append({"text": c["text"], "show": round(show, 3), "hide": round(min(b + 0.6, nxt), 3)})
    return {"name": cut_name, "lang": lang, "fps": FPS, "duration": round(total, 3), "crossfade": 0.28,
            "strings": STR, "nums": nums_display(lang, n), "cues": subs, "scenes": scenes}


def resolve_footage(cutdata, ft):
    for sc in cutdata["scenes"]:
        if sc["type"] == "data":
            for td in sc["tileDefs"]:
                if td.get("src"):
                    td["src"] = ft["layers"][td["src"]]
    cutdata["footage"] = ft


# ------------------------------------------------------------------ frames
async def render(cutdata, work, stills=None, video_path=None):
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome", headless=True,
                                    args=["--allow-file-access-from-files", "--force-color-profile=srgb"])
        pg = await b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        await pg.add_init_script("window.CUT = " + json.dumps(cutdata, ensure_ascii=False) + ";")
        await pg.goto((HERE / "stage/index.html").as_uri())
        await pg.evaluate("window.stageReady")
        if errors:
            print("\n".join(errors[:10]))
        if stills:
            for t in stills:
                await pg.evaluate("(t) => renderAt(t)", t)
                await pg.screenshot(path=str(work / f"still_{t:06.2f}.png"))
            if errors:
                print("\n".join(errors[:10]))
            await b.close()
            return
        n = int(math.ceil(cutdata["duration"] * FPS))
        enc = subprocess.Popen([FF, "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-",
                                "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
                                "-profile:v", "high", "-r", str(FPS), str(video_path)], stdin=subprocess.PIPE)
        for i in range(n):
            await pg.evaluate("(t) => renderAt(t)", i / FPS)
            enc.stdin.write(await pg.screenshot(type="png"))
            if i % 150 == 0:
                print(f"  frame {i}/{n}", flush=True)
        enc.stdin.close()
        enc.wait()
        events = await pg.evaluate("window.CLICKS || []")
        await b.close()
        if errors:
            print("page errors:\n" + "\n".join(errors[:10]))
        return events


# ------------------------------------------------------------------ music bed and clicks (generated here, no samples)
def pad(duration):
    """quiet, slow chord pad: sine partials, slow attack/release, low-passed"""
    t = np.arange(int(duration * SR)) / SR
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    chords = [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]]  # D, Bm, G, A
    bar = 4.0
    y = np.zeros_like(t)
    for k in range(int(duration / bar) + 2):
        notes = chords[k % len(chords)]
        a, b = k * bar - 0.6, (k + 1) * bar + 1.2
        m = (t >= max(a, 0)) & (t < b)
        if not m.any():
            continue
        tt = t[m] - a
        env = np.minimum(1, tt / 1.6) * np.minimum(1, np.maximum(0, (b - a - tt) / 1.8))
        s = np.zeros_like(tt)
        for j, note in enumerate(notes):
            f0 = hz(note)
            for det in (-0.12, 0.12):
                s += np.sin(2 * np.pi * (f0 + det) * tt + j) * (0.9 if j < 2 else 0.55)
                s += 0.18 * np.sin(2 * np.pi * 2 * (f0 + det) * tt)
        y[m] += s * env
    # one-pole low-pass ~900 Hz, applied as a short moving average for speed
    k = int(SR / 900)
    y = np.convolve(y, np.ones(k) / k, mode="same")
    y *= np.minimum(1, t / 2.0) * np.minimum(1, (duration - t) / 2.5)
    return (y / (np.abs(y).max() + 1e-9) * 0.5).astype(np.float32)


def clicks(duration, times):
    y = np.zeros(int(duration * SR), np.float32)
    n = int(0.03 * SR)
    tt = np.arange(n) / SR
    rng = np.random.default_rng(1)
    c = (np.sin(2 * np.pi * 1900 * tt) * 0.5 + rng.standard_normal(n) * 0.25) * np.exp(-tt / 0.006)
    for t in times:
        i = int(t * SR)
        if 0 <= i < len(y) - n:
            y[i:i + n] += c.astype(np.float32)
    return y


def mix(cutdata, voice, work, out_audio, click_times, music=True):
    D = cutdata["duration"]
    pad_p, clk_p = work / "pad.wav", work / "clicks.wav"
    write_wav(pad_p, pad(D) if music else np.zeros(int(D * SR), np.float32))
    write_wav(clk_p, clicks(D, click_times))
    fc = ("[0:a]apad,atrim=0:{D},asplit=2[v][sc];"
          "[1:a]volume=0.16[p];[p][sc]sidechaincompress=threshold=0.03:ratio=5:attack=30:release=450[pd];"
          "[2:a]volume=0.35[c];"
          "[v][pd][c]amix=inputs=3:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]").format(D=D)
    subprocess.run([FF, "-v", "error", "-y", "-i", str(voice), "-i", str(pad_p), "-i", str(clk_p), "-filter_complex", fc,
                    "-map", "[out]", "-c:a", "aac", "-b:a", "192k", "-ac", "2", str(out_audio)], check=True)


def srt(cutdata, path):
    ts = lambda t: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round((t % 1) * 1000)) % 1000:03d}"
    lines = []
    for k, c in enumerate(cutdata["cues"], 1):
        lines += [str(k), f"{ts(max(0, c['show']))} --> {ts(c['hide'])}", c["text"], ""]
    path.write_text("\n".join(lines), encoding="utf-8")


# ------------------------------------------------------------------ main
def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    name = args[0] if args else "pl_long"
    cut = CUTS[name]
    stills = None
    if "--stills" in sys.argv:
        stills = [float(x) for x in sys.argv[sys.argv.index("--stills") + 1].split(",")]
    n = numbers()
    key = cut.get("tts", cut["lang"])
    meta = json.loads((HERE / "build/tts" / f"{key}.json").read_text(encoding="utf-8"))
    from tts import parse_script, full_text
    if full_text(parse_script(HERE / f"script_{key}.md")) != meta["text"]:
        sys.exit(f"script_{key}.md changed since the voice-over was made: run tts.py {key} first")
    work = HERE / "build" / name
    work.mkdir(parents=True, exist_ok=True)
    voice, tmap = voice_timeline(meta, cut, work)
    cutdata = plan(name, n, meta, tmap)
    resolve_footage(cutdata, footage(cut["lang"]))
    (work / "cut.json").write_text(json.dumps(cutdata, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name}: {cutdata['duration']:.2f} s, {len(cutdata['scenes'])} scenes, {len(cutdata['cues'])} subtitles")
    for sc in cutdata["scenes"]:
        print(f"  {sc['t0']:6.2f}-{sc['t1']:6.2f}  {sc['name']}")
    if cut.get("limit") and cutdata["duration"] > cut["limit"]:
        sys.exit(f"too long: {cutdata['duration']:.2f} s > {cut['limit']} s")
    if stills:
        asyncio.run(render(cutdata, work, stills=stills))
        print("stills in", work)
        return
    video = work / "video.mp4"
    clicks_t = asyncio.run(render(cutdata, work, video_path=video)) or []
    audio = work / "mix.m4a"
    mix(cutdata, voice, work, audio, clicks_t, music="--no-music" not in sys.argv)
    out = HERE / "out"
    out.mkdir(exist_ok=True)
    final = out / f"{cut['out']}.mp4"
    subprocess.run([FF, "-v", "error", "-y", "-i", str(video), "-i", str(audio), "-map", "0:v", "-map", "1:a",
                    "-c", "copy", "-t", f"{cutdata['duration']:.3f}", "-movflags", "+faststart", str(final)], check=True)
    srt(cutdata, out / f"{cut['out']}.srt")
    print("wrote", final)


if __name__ == "__main__":
    main()
