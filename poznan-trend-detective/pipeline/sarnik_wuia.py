#!/usr/bin/env python3
"""Dane modułu SARnik „Plany budowlane obok” (wuia; w planie „Co tam powstanie”).

Czyta rejestr decyzji i wniosków budowlanych Wydziału Urbanistyki i Architektury
(progres/p1/dane/wuia_decyzje.geojson, GEOPOZ, tylko miasto Poznań) i zapisuje
poznan-trend-detective/web/data/sarnik/wuia/wuia.json: jeden wiersz na NOWY budynek
albo drogę. Sieci, przyłącza, instalacje, przebudowy, remonty, rozbudowy, zmiany
sposobu użytkowania, drobne i tymczasowe obiekty (garaże, wiaty, reklamy, ogrodzenia) oraz
zmiany pozwoleń wydanych ponad 2 lata wcześniej („stara”) odpadają. Opis wprost nazywający
nowy budynek główny wygrywa z rozbiórką, zbiornikiem tymczasowym czy instalacją wymienionymi obok.
Opis w pliku jest bez numerów spraw i bez nazwy procedury na początku („budowa budynku…”).

Uruchomienie (z dowolnego katalogu):
    python3 poznan-trend-detective/pipeline/sarnik_wuia.py [--built RRRR-MM-DD]

Tylko biblioteka standardowa.
"""
import json
import math
import os
import re
import sys

# ---------------------------------------------------------------------------
# Klasyfikator opisu decyzji. Wzorce są celowo proste; kolejność ma znaczenie.
# Uwaga: słowo „budowa” jest w prawie każdym tytule („Pozwolenie na budowę
# przebudowy…”), więc nie jest dowodem nowego budynku.
# ---------------------------------------------------------------------------
I = re.I

# 0. sprawy czysto formalne (wznowienie, wstrzymanie, przedłużenie, wygaśnięcie…): bez nowego obiektu
RE_PROCEDURAL = re.compile(
    r"wznowieni|wstrzymani|przedłużeni\w*\s+(decyzji|ważności|termin|pozwoleni)|wygaśnię|uchyleni|stwierdzeni"
    r"|przeniesieni|nadanie|legalizacj", I)

# zmiana pozwolenia albo decyzji: rok zmienianej decyzji lub sprawy (…/2015, ….2020) mówi, jak stary jest projekt
RE_AMEND = re.compile(r"^\s*(wydanie\s+decyzji\s+o\s+)?zmian\w*\s+(decyzji|pozw)", I)
RE_YEAR = re.compile(r"[./]((?:19|20)\d{2})\b")
OLD_YEARS = 2  # zmiana decyzji starszej niż tyle lat przed datą wpisu: stary projekt, nie nowy plan

# nazwa procedury, w której „budowę” nie jest czynnością („Pozwolenie na budowę - przebudowa…”,
# „Pozwolenie na budowę przebudowy…”); w „Pozwolenie na budowę trzech budynków…” jest czynnością
RE_PROC_BUDOWA = re.compile(
    r"pozw\w*\s+na\s+budow\w*(?=\s*(?:[-–:(,]|w\s+zakresie|dla\b|dot|na\b|przebudow|rozbudow|nadbudow|remont"
    r"|modernizacj|termomodernizacj|adaptacj|docieplen|zmian|wykonani|budow|rozbiórk|$))", I)
# pierwsza czynność w opisie; jeśli to przebudowa, rozbudowa itp., to sprawa dotyczy istniejącego budynku
RE_ACTION = re.compile(
    r"\b(przebudow|rozbudow|nadbudow|dobudow|odbudow|remont|modernizacj|termomodernizacj|adaptacj|docieplen"
    r"|zmian\w*\s+(?:sposobu|spos\.|funkcji)|wykonani\w*\s+otwor|budow|rozbiórk)", I)
REBUILD_FIRST = ("przebudow", "rozbudow", "nadbudow", "dobudow", "odbudow", "remont", "modernizacj",
                 "termomodernizacj", "adaptacj", "docieplen", "zmian", "wykonani")

# słowa między „budowa” a jej przedmiotem (liczebniki, przymiotniki); przyimki i spójniki kończą przedmiot
_FILL = r"(?:(?!budyn|bud\.|dom|zespo|segment|hal|z\b|ze\b|wraz|oraz|i\b|przy\b|na\b|do\b|w\b|o\b|dla\b" \
        r"|przebudow|rozbudow|nadbudow|tymczasow)\S+\s+)"

# drobny albo tymczasowy obiekt jako przedmiot „budowy” (do „inne”, czyli poza danymi)
RE_SMALL_DIRECT = re.compile(
    r"\bbudow\w*\s+" + _FILL + r"{0,2}?(garaż|garaz|wiat|budynk\w*\s+gospodar|altan|szyld|reklam|pylon|oznakowani"
    r"|billboard|citylight|ogrodzeni|taras|oranżer|ogrod\w*\s+zimow|szklarni|domku|zadaszeni|tymczasow)", I)

# B0. budowa sieci albo urządzenia technicznego jako głównego obiektu (przed typami budynków);
# „budow[aęy]|budowie” jako całe słowo, żeby „urządzeniami budowlanymi… instalacją” nie pasowało
RE_TECH = re.compile(
    r"\b(?:budow[aęy]|budowie)\b\s+(?:(?!budyn|bud\.|hal|dom|z\b|ze\b|wraz)\S+\s+){0,2}?(sieci|sieć|przyłącz|pzryłącz"
    r"|instal|elektroenerget|kanalizacj|wodociąg|gazociąg|ciepłociąg|kabl|lini|konstrukcji\s+podporow)"
    r"|magazyn\w*\s+energii|fotowolt|zbiornik\w*\s+magazynow|stacj\w*\s+ładowani|carport", I)

# wprost nazwany nowy budynek główny: „budowa (2-ch) budynków mieszkalnych…”, „budowa hotelu”,
# „zabudowy mieszkaniowej”. Ma pierwszeństwo przed rozbiórką, zbiornikami tymczasowymi, instalacją
# wewnętrzną czy pylonem wymienionymi dalej w tym samym opisie.
_MAIN_TYPE = (r"(mieszk|jednorodzinn|wielorodzinn|handlow|usługow|biurow|hotel|produkcyjn|magazyn(?!\w*\s+energii)|szkoł|przedszkol"
              r"|dydaktyczn|szpital|przychodn|opiek)")
RE_NEW_MAIN = re.compile(
    r"\bbudow\w*\s+" + _FILL + r"{0,3}?(?:budyn\w*|bud\.|zespo\w*|dom\w*|segment\w*)(?:\s+\S+){0,4}?\s+\S*" + _MAIN_TYPE + r"\w*"
    + r"|\bbudow\w*\s+" + _FILL + r"{0,2}?(?:hotel\w*|biurowc\w*|blok\w*\s+mieszk)"
    + r"|\bzabudow\w*\s+mieszkaniow", I)

RE_PHRASE_END = re.compile(r"\s*,(?!\s*(?:wielorodzinn|jednorodzinn|wolnostoj|dwulokal|mieszkaln|usługow|handlow|biurow))|;|\s\+\s|\s(?:wraz|oraz|i|lub|a\s+także)\s", I)

# A. nie nowy budynek (gdy opis nie nazywa wprost nowego budynku głównego)
RE_NOT_NEW = re.compile(
    r"przebudow|remont|rozbudow|nadbudow|zmian[aęy]\s+(sposobu|spos\.|funkcji|użytkowania)|adaptacj|wymian"
    r"|modernizacj|rewaloryzacj|docieplen|rozbiórk|dobudow|odbudow|renowacj|tymczasow"
    r"|wewnętrzn\w*\s+instal|instal\w*\s+(gazow\w*\s+)?w\s+(lokal|bud)"
    r"|na\s+istniejąc|istniejąc\w*\s+(domu|budynk)|przy\s+budynku|\bwjazd\b"
    r"|wybici\w*\s+otwor|wykonani\w*\s+otwor|powiększeni\w*\s+otwor|zabudow\w*\s+podcieni", I)

# drobne obiekty gdziekolwiek w opisie (po typach budynków; do „inne”)
RE_SMALL = re.compile(
    r"(budow\w*|zgłoszenie\s+zamiaru\s+budowy)\s+(?:\S+\s+){0,3}?(garaż|garaz|wiat|budynk\w*\s+gospodar|altan|szyld"
    r"|reklam|pylon|oznakowani|billboard|citylight|ogrodzeni|taras|oranżer|ogrod\w*\s+zimow|szklarni|domku)", I)

# B–E. typy w kolejności sprawdzania; pierwszy pasujący wygrywa
TYPE_RULES = [
    ("uslugi", r"łuczni|strzelni|hal\w*\s+sportow|hal\w*\s+widowisk|hal\w*\s+targow"),
    ("hala", r"hal[aię]\b(?!\s+garaż)|hali\b(?!\s+garaż)|magaz|produkcyjn|przemysł|logistyczn"
             r"|centrum\s+dystrybucyjn|warsztat"),
    ("wielorodzinny", r"wielorodzinn|blok\w*\s+mieszkaln|apartamentow|aparatamentow"),
    ("jednorodzinny", r"jednorodzinn|dwurodzinn|bliźniacz|szeregow|dwulokalow|dom\w*\s+mieszkaln"
                      r"|budyn\w+\s+mieszkaln|mieszkaln\w+\s+budyn|budowy\s+domu\b|zabudow\w*\s+mieszkaniow"),
    ("SMALL", None),
    ("sieci", r"sieć|sieci|przyłącz|kanalizacj|gazociąg|wodociąg|ciepłociąg|instal|linia\s+kablow|lini+\s+kablow"
              r"|oświetleni|światłow|kabl|transformator|elektroenerget|elektorenerget|\bGPZ\b|rozdzielni|cieplne"
              r"|ciepłown|gazow|zbiornik|szambo|oczyszczaln|hydrant|przepompown|studni|ujęci|kolektor"
              r"|pomp[ay]\s+ciepła|telekomunik|maszt|wieża|słup|stacj\w*\s+bazow|tłoczni"),
    ("uslugi", r"usług|handlow|biurow|szkoł|przedszkol|hotel|stacj[aię]\s+paliw|sklep|market|galeri|centrum|żłob"
               r"|kości[oó]ł|kaplic|przychodni|apteka|restaurac|gastronom|pensjonat|parking|boisk|basen"
               r"|obiekt\w*\s+sportow|myjni|dom\w*\s+studenta|zamieszkania\s+zbiorowego|onkolog|szpital"
               r"|naukow|dydaktyczn|kulturaln|przesiadkow|stacj\w*\s+obsługi|dom\w*\s+opieki|rehabilit"),
    ("droga", r"\bdrog(?!ow)|budow\w*\s+(odcinka\s+)?(ul\.|ulic)|\bulic[ayę]\s+[A-ZŁŚŻ]|rondo|\bmost|wiadukt"
              r"|torowisk|chodnik|ścieżk\w+\s+rowerow|skrzyżowan|tramwaj|zjazd|przejści\w*\s+dla\s+pieszych"),
]
TYPE_RULES = [(n, re.compile(p, I) if p else None) for n, p in TYPE_RULES]
BUILDING_RULES = [(n, rx) for n, rx in TYPE_RULES if n not in ("SMALL", "sieci", "droga")]

# typy, które trafiają do pliku (te same nazwy czyta web/sarnik/wuia.js)
KEEP_TYPES = ("jednorodzinny", "wielorodzinny", "uslugi", "hala", "droga")
# kategorie z geopoz_wuia.py, które w ogóle bierzemy pod uwagę
KEEP_KATEGORIA = ("nowa budowa",)
STATUS_CODE = {"decyzja": "dec", "wniosek": "wni", "sprzeciw/odmowa": "odm"}


def old_amendment(opis, date):
    """Zmiana pozwolenia wydanego dawno (rok decyzji lub sprawy > OLD_YEARS lat przed datą wpisu)."""
    if not date or not RE_AMEND.search(opis):
        return False
    years = [int(y) for y in RE_YEAR.findall(opis)]
    return bool(years) and int(date[:4]) - max(years) > OLD_YEARS


def classify(opis, date=None):
    """Typ nowego obiektu z opisu decyzji albo 'nienowa' / 'stara' / 'sieci' / 'inne'."""
    o = " ".join((opis or "").split())
    if RE_PROCEDURAL.search(o):
        return "nienowa"
    if old_amendment(o, date):
        return "stara"
    first = RE_ACTION.search(RE_PROC_BUDOWA.sub(" ", o))
    if first and first.group(1).lower().startswith(REBUILD_FIRST):
        return "nienowa"
    m = RE_NEW_MAIN.search(o)
    if m:  # typ z przedmiotu budowy (do „wraz”, „oraz”, przecinka…), potem z dalszej części opisu
        rest = o[m.start():]
        phrase = RE_PHRASE_END.split(rest, 1)[0]
        for part in (phrase, rest, o):
            for name, rx in BUILDING_RULES:
                if rx.search(part):
                    return name
    if RE_SMALL_DIRECT.search(o):
        return "inne"
    if RE_TECH.search(o):
        return "sieci"
    if RE_NOT_NEW.search(o):
        return "nienowa"
    for name, rx in TYPE_RULES:
        if name == "SMALL":
            if RE_SMALL.search(o):
                return "inne"
            continue
        if rx.search(o):
            return name
    return "inne"


# ---------------------------------------------------------------------------
# Opis do pokazania: bez numerów spraw i decyzji, bez numerów działek, krótko.
# ---------------------------------------------------------------------------
DESC_MAX = 90
RE_CASE = [
    re.compile(r"\(?\b[A-ZŁ]{1,5}(?:-[A-Z0-9]+)*[-.][IVX]+[\w.\-/]*\)?"),  # UA-VII.6740.1138.2022, WUA-PM-7351/...
    re.compile(r"\(?\b\d+/[IVX]+/\d{4}\b\)?"),                              # (782/VII/2017)
    re.compile(r"\b\d+[\d./-]*/\d{2,4}\b"),                                 # 1130/2022, 227/76, 782/VII/2017
    re.compile(r"\b(?:nr|numer)\.?\s*(?:dec\.?|decyzji|sprawy|działki|działek)?\s*\S*\d\S*", I),
    re.compile(r"\bDEC\s+\S*\d\S*"),
    re.compile(r"\b(?:ark\.|arkusz)\s*\d+\S*", I),
    re.compile(r"\bobręb\w*\s+\S+", I),
    # zwroty grzecznościowe z nazwiskiem albo wskazanie inwestora z imienia
    re.compile(r"\b(?:Pan|Pani|Państwa|Państwo|inwestor\w*:?)\s+[A-ZŁŚŻŹĆŃÓ]\S*(?:\s+[A-ZŁŚŻŹĆŃÓ]\S*)?"),
]


# zwroty urzędowe, które po wycięciu numerów nic nie znaczą
RE_JUNK = [
    (re.compile(r"budow([ęe])(?=nr|bud\.)", I), r"budow\1 "),
    (re.compile(r"\bZmiana\s+PnB\b"), "Zmiana pozwolenia na budowę"),
    (re.compile(r"\bzmieniającej\s+decyzję(?:\s+PnB)?", I), " "),
    (re.compile(r"\b(?:o\s+|na\s+)?nr\.?(?:\s+dec\.?|\s+decyzji)?(?=[\s,;)\-–]|$)", I), " "),
    (re.compile(r"\(?\bdec\.(?=[\s,;)\-–]|$)", I), " "),
    (re.compile(r"\b(?:w\s+sprawie|sprawa|ws\.|ds\.?|DEC|PnB|PNB|pd)(?=[\s,;)\-–]|$)"), " "),
    (re.compile(r"\(PB-\d+\)"), " "),
    (re.compile(r"\bdot\.\s*", I), " "),
    (re.compile(r"(?:Wydanie|Wniosek\s+o\s+wydanie)\s+decyzji\s+o\s+zezwoleniu\s+na\s+realizację\s+inwestycji\s+drogowej"
                r"\s*(?:\(ZRID\))?\s*[-–]?\s*(?:polegającej\s+na\s+budowie\s*)?", I), "Inwestycja drogowa (ZRID): budowa "),
    (re.compile(r"\b(budow[aęy])\s*[-–:]?\s*budow[aęy](?=\s)", I), r"\1"),
]


# nazwa procedury na początku opisu („Ustalenie warunków zabudowy”, „Pozwolenie na budowę”…): w karcie
# status („decyzja”, „wniosek”) mówi już, jaki to papier, a „wniosek: Pozwolenie na budowę…” brzmi jak wydane pozwolenie
RE_AMEND_LEAD = re.compile(
    r"^\s*(?:wydanie\s+decyzji\s+o\s+)?zmian\w*(?:\s+(?:decyzj\w*|dec\.|poz\w*|na|budow\w*|o)(?=[\s,:\-–]|$))*", I)
RE_PROC_LEAD = re.compile(
    r"^\s*(?:ustal\w*\s+w\w*\s+z\w*(?=[\s,:\-–])|(?:wydanie\s+)?poz\w*\s+na\s+budow\w*|inwestycja\s+drogowa\s*\(ZRID\)"
    r"|ustal\w*\s+lokalizacji\s+inwestycji\s+celu\s+publicznego|zgłoszenie(?:\s+zamiaru)?(?=\s+budow))", I)
RE_LEAD_SEP = re.compile(r"^(\s*[-–:,]\s*|\s+)(?:(?:dla|w\s+zakresie|dot\.?|dotycząc\w*|obejmując\w*)\s+)*", I)
RE_ACTION_START = re.compile(r"(?:projekt\s+)?(?:budow|przebudow|rozbudow|nadbudow|rozbiórk|remont|zmian|wykonan|instal)", I)
RE_ABBR = [
    (re.compile(r"\bbud\.\s*"), "budynku "),
    (re.compile(r"\bzabud\.\s*"), "zabudowie "),
    (re.compile(r"\bmiesz\.\s*"), "mieszkalnych "),
    (re.compile(r"\bist\.\s*"), "istniejących "),
]


def strip_lead(s):
    """Bez nazwy procedury na początku; zostaje sam przedmiot sprawy, zwykle od „budowa…”."""
    rest, budowa = s, False
    for rx in (RE_AMEND_LEAD, RE_PROC_LEAD):
        m = rx.match(rest)
        if not m or not m.group(0).strip():
            continue
        budowa = bool(re.search(r"budow\w*$", m.group(0), I))
        rest = rest[m.end():]
        sep = RE_LEAD_SEP.match(rest)
        if sep:
            if sep.group(1).strip():
                budowa = False  # „Pozwolenie na budowę - budynek…”: po myślniku zaczyna się nowy człon
            rest = rest[sep.end():]
    rest = rest.lstrip(" -–:,")
    if not rest:
        rest = s
    if budowa and not RE_ACTION_START.match(rest):
        rest = "budowa " + rest  # „Pozwolenie na budowę budynku…” -> „budowa budynku…”
    rest = re.sub(r"^budow(?:y|ę|e|ie)\b", "budowa", rest, flags=I)
    if RE_ACTION_START.match(rest):
        rest = rest[0].lower() + rest[1:]
    return rest


def clean_desc(opis, limit=DESC_MAX):
    s = " ".join((opis or "").split())
    for rx in RE_CASE:
        s = rx.sub(" ", s)
    for rx, rep in RE_JUNK:
        s = rx.sub(rep, s)
    # sprzątanie po wycięciach: puste nawiasy, podwójne przecinki, wiszące łączniki
    for _ in range(3):
        s = re.sub(r"\(\s*[,;.\-–]*\s*\)", " ", s)
        s = re.sub(r"\(\s*([,;]\s*)?(?=[-–])", " ", s)
        s = re.sub(r"\s+([,;.)])", r"\1", s)
        s = re.sub(r"([,;(])\s*[,;]+", r"\1", s)
        s = re.sub(r"[,;]\s*(?=[-–]\s)", " ", s)
        s = re.sub(r"(\s[-–])(\s*[-–,;])+", r"\1", s)
        s = " ".join(s.split())
    s = s.strip(" ,;-–")
    s = strip_lead(s)
    for rx, rep in RE_ABBR:
        s = rx.sub(rep, s)
    s = " ".join(s.split()).strip(" ,;-–")
    if len(s) > limit:
        cut = s[: limit - 1]
        sp = cut.rfind(" ")
        if sp > limit * 0.6:
            cut = cut[:sp]
        s = cut.rstrip(" ,;-–(") + "…"
    return s


# ---------------------------------------------------------------------------
# Geometria: środek ciężkości największego wielokąta (pole liczone płasko w stopniach
# przeskalowanych cos(lat); przy działkach to wystarcza).
# ---------------------------------------------------------------------------
def ring_centroid(ring):
    lat0 = sum(p[1] for p in ring) / len(ring)
    k = math.cos(math.radians(lat0))
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        x1, x2 = x1 * k, x2 * k
        c = x1 * y2 - x2 * y1
        a += c
        cx += (x1 + x2) * c
        cy += (y1 + y2) * c
    if abs(a) < 1e-15:  # zdegenerowany pierścień: średnia wierzchołków
        return lat0, sum(p[0] for p in ring) / len(ring), 0.0
    return cy / (3 * a), cx / (3 * a) / k, abs(a) / 2


def in_ring(x, y, ring):
    """Czy punkt (lng, lat) leży w pierścieniu [(lng, lat), …] (promień w prawo)."""
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def pull_inside(lat, lng, ring):
    """Środek ciężkości długiej albo wklęsłej działki (droga, łuk) potrafi wypaść poza nią.
    Wtedy bierzemy najbliższy punkt brzegu i przesuwamy go o metr–dwa do środka działki."""
    k = math.cos(math.radians(lat))
    best = None
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        ax, ay, bx, by = x1 * k, y1, x2 * k, y2
        dx, dy = bx - ax, by - ay
        L = dx * dx + dy * dy
        t = 0.0 if L == 0 else max(0.0, min(1.0, ((lng * k - ax) * dx + (lat - ay) * dy) / L))
        px, py = ax + t * dx, ay + t * dy
        d = (px - lng * k) ** 2 + (py - lat) ** 2
        if best is None or d < best[0]:
            best = (d, px, py)
    _, px, py = best
    vx, vy = px - lng * k, py - lat
    n = math.hypot(vx, vy) or 1.0
    for step_m in (0.5, 1.0, 2.0, 4.0):
        st = step_m / 111195.0
        qx, qy = px + vx / n * st, py + vy / n * st
        if in_ring(qx / k, qy, ring):
            return qy, qx / k
    return py, px / k  # punkt na brzegu działki


def centroid(geom):
    """Środek ciężkości największego wielokąta; jeśli wypada poza działką, punkt w działce najbliżej niego."""
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    rings = [[tuple(p[:2]) for p in poly[0]] for poly in polys if poly and poly[0]]
    lat, lng, _, ring = max((ring_centroid(r) + (r,) for r in rings), key=lambda t: t[2])
    if len(ring) >= 3 and not in_ring(lng, lat, ring):
        lat, lng = pull_inside(lat, lng, ring)
    return round(lat, 5), round(lng, 5)


def dist_m(a, b):
    R = 6371008.8
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


MERGE_M = 150  # ten sam opis, data i status na sąsiednich działkach = jedna sprawa
SPOT_DIGITS = 4  # ok. 10 m: „to samo miejsce” w kroku 3
STATUS_RANK = {"dec": 2, "odm": 1, "wni": 0}


def main(argv):
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.abspath(os.path.join(here, "..", ".."))
    src = os.path.join(root, "progres", "p1", "dane", "wuia_decyzje.geojson")
    out = os.path.join(root, "poznan-trend-detective", "web", "data", "sarnik", "wuia", "wuia.json")
    built = None
    if "--built" in argv:
        built = argv[argv.index("--built") + 1]
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", built):
            sys.exit("--built musi mieć postać RRRR-MM-DD")

    with open(src, encoding="utf-8") as f:
        feats = json.load(f)["features"]
    all_dates = sorted(f["properties"]["DATA"] for f in feats if f["properties"].get("DATA"))

    counts_type, counts_status = {}, {}
    cand = []
    for feat in feats:
        p = feat["properties"]
        if p.get("kategoria") not in KEEP_KATEGORIA or not feat.get("geometry"):
            continue
        t = classify(p.get("OPIS"), p.get("DATA"))
        counts_type[t] = counts_type.get(t, 0) + 1
        if t not in KEEP_TYPES:
            continue
        st = STATUS_CODE.get(p.get("status"))
        if not st:
            continue
        lat, lng = centroid(feat["geometry"])
        opis = " ".join((p.get("OPIS") or "").split())
        cand.append({"lat": lat, "lng": lng, "date": p["DATA"], "st": st, "type": t,
                     "opis": opis, "desc": clean_desc(opis), "parcel": p.get("NR_DZIALKI")})

    # 1) ta sama sprawa na tej samej działce (wniosek, potem decyzja): zostaje najnowszy wpis
    cand.sort(key=lambda r: (r["date"], STATUS_RANK[r["st"]]), reverse=True)
    seen, step1 = set(), []
    for r in cand:
        k = (r["opis"], r["parcel"])
        if k in seen:
            continue
        seen.add(k)
        step1.append(r)
    # 2) ta sama sprawa rozpisana na kilka sąsiednich działek albo na kilka budynków jednego osiedla
    #    („budynek nr 8”, „nr 9”…): porównujemy opis po wycięciu numerów, nie surowy tekst
    step2, groups = [], {}
    for r in step1:
        g = groups.setdefault((r["desc"], r["date"], r["st"]), [])
        if any(dist_m((r["lat"], r["lng"]), (q["lat"], q["lng"])) < MERGE_M for q in g):
            continue
        g.append(r)
        step2.append(r)
    # 3) kilka wpisów w tym samym miejscu, tego samego dnia, o tym samym statusie i typie (np. kilka
    #    wariantów warunków zabudowy dla jednego budynku): jeden wiersz z najdłuższym opisem
    rows, spot = [], {}
    for r in step2:
        k = (round(r["lat"], SPOT_DIGITS), round(r["lng"], SPOT_DIGITS), r["date"], r["st"], r["type"])
        if k in spot:
            if len(r["desc"]) > len(spot[k]["desc"]):
                spot[k]["desc"] = r["desc"]
            continue
        spot[k] = r
        rows.append(r)
    rows.sort(key=lambda r: (r["date"], r["lat"], r["lng"]))

    for r in rows:
        k = (r["type"], r["st"])
        counts_status[k] = counts_status.get(k, 0) + 1

    data = {
        "v": 1,
        "coverage": "Poznań (miasto)",
        "source": "GEOPOZ, WUiA",
        "dates": [all_dates[0], all_dates[-1]],
        "built": built or all_dates[-1],
        "cols": ["lat", "lng", "date", "status", "type", "desc"],
        "status": {"dec": "decyzja", "wni": "wniosek", "odm": "sprzeciw/odmowa"},
        "rows": [[r["lat"], r["lng"], r["date"], r["st"], r["type"], r["desc"]] for r in rows],
    }
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

    print("kategoria 'nowa budowa' wg klasyfikatora:")
    for t, n in sorted(counts_type.items(), key=lambda x: -x[1]):
        print(f"  {t:14s} {n:5d}{'' if t in KEEP_TYPES else '  (odpada)'}")
    print(f"kandydaci {len(cand)}, po złączeniu tej samej sprawy: {len(step2)}, po złączeniu w tym samym miejscu: {len(rows)}")
    print("w pliku, typ x status (dec / wni / odm):")
    for t in KEEP_TYPES:
        c = [counts_status.get((t, s), 0) for s in ("dec", "wni", "odm")]
        print(f"  {t:14s} {c[0]:4d} {c[1]:4d} {c[2]:4d}")
    tot = [sum(counts_status.get((t, s), 0) for t in KEEP_TYPES) for s in ("dec", "wni", "odm")]
    print(f"  {'razem':14s} {tot[0]:4d} {tot[1]:4d} {tot[2]:4d}")
    size = os.path.getsize(out)
    print(f"daty {data['dates'][0]} .. {data['dates'][1]}, zbudowano {data['built']}")
    print(f"zapisano {os.path.relpath(out, root)}: {size} B ({size / 1024:.1f} KB)")
    if size > 400 * 1024:
        sys.exit("plik większy niż 400 KB")


if __name__ == "__main__":
    main(sys.argv[1:])
