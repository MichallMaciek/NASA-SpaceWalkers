"""Browser test of plots on the map: clean start, hover highlight, click to pick a plot, circle tool, links, drawing.

ULDK (GUGiK) is replaced by page.route with a fake grid of small plots, and the KIEG WMS bitmap of plot boundaries by
a fake PNG with a grid of lines (or a non-image answer, so the hover falls back to ULDK), so the test does not depend on
either service.
Run against a local server of web/ (python3 -m http.server -d poznan-trend-detective/web 8771):

    python3 poznan-trend-detective/tests/e2e_dzialki.py http://localhost:8771

Needs Playwright for Python (pip install playwright) and Google Chrome (channel "chrome"), or Chromium installed by
`playwright install chromium` (set E2E_CHANNEL=chromium).
"""
import math
import os
import re
import struct
import sys
import zlib
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8771").rstrip("/")
CHANNEL = os.environ.get("E2E_CHANNEL", "chrome")
D_LAT, D_LNG = 0.0003, 0.0005  # fake plots: about 33 x 34 m, smaller than one 73 m radar cell
failed = 0


def check(name, ok, detail=""):
    global failed
    print(("OK   " if ok else "BŁĄD ") + name + ("" if ok else f" -> {detail}"))
    if not ok:
        failed += 1


def fake_plot(i, j):
    if j % 13 == 0:  # a "road": no plot here
        return "-1 brak wyników\n"
    s, w = i * D_LAT, j * D_LNG
    ring = [(w, s), (w + D_LNG, s), (w + D_LNG, s + D_LAT), (w, s + D_LAT), (w, s)]
    wkt = "SRID=4326;POLYGON((" + ",".join(f"{x:.7f} {y:.7f}" for x, y in ring) + "))"
    return f"0\n306401_1.0051.{i}_{j}|Poznań|Junikowo|{i % 1000}/{j % 1000}|{wkt}\n"


def uldk_handler(calls):
    def handle(route):
        q = parse_qs(urlparse(route.request.url).query)
        calls.append(q.get("request", [""])[0])
        if q.get("request") == ["GetParcelById"]:
            m = re.search(r"\.(\d+)_(\d+)$", q.get("id", [""])[0])
            body = fake_plot(int(m.group(1)), int(m.group(2))) if m else "-1 brak wyników\n"
        else:
            lng, lat = (float(v) for v in q["xy"][0].split(",")[:2])
            body = fake_plot(math.floor(lat / D_LAT), math.floor(lng / D_LNG))
        route.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*", "Content-Type": "text/plain; charset=utf-8"}, body=body)
    return handle


def grid_png(w, h, step=40):
    """A transparent RGBA PNG with 1 px opaque blue lines every `step` pixels (like KIEG's plot boundaries)."""
    on, off = bytes((40, 120, 255, 255)), bytes(4)
    plain = b"".join(on if x % step == 0 else off for x in range(w))
    rows = b"".join(b"\0" + (on * w if y % step == 0 else plain) for y in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows, 1)) + chunk(b"IEND", b"")


def kieg_handler(kieg):
    def handle(route):
        kieg["calls"] += 1
        if not kieg["ok"]:  # not an image (like a ServiceException): no bitmap, the hover asks ULDK
            route.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*", "Content-Type": "text/plain"}, body="no")
            return
        q = {k.upper(): v for k, v in parse_qs(urlparse(route.request.url).query).items()}
        body = grid_png(int(q["WIDTH"][0]), int(q["HEIGHT"][0]))
        route.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*", "Content-Type": "image/png"}, body=body)
    return handle


def open_page(browser, lang, mobile, hash_=""):
    ctx = browser.new_context(viewport={"width": 390, "height": 844} if mobile else {"width": 1440, "height": 900},
                              is_mobile=mobile, has_touch=mobile, locale="pl-PL" if lang == "pl" else "en-GB")
    page = ctx.new_page()
    errors, calls = [], []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.route("https://uldk.gugik.gov.pl/**", uldk_handler(calls))
    page.kieg = {"ok": False, "calls": 0}
    page.route("https://integracja.gugik.gov.pl/**", kieg_handler(page.kieg))
    page.goto(f"{BASE}/?lang={lang}{hash_}")
    page.wait_for_function("typeof map !== 'undefined' && map && document.querySelectorAll('#lenses button').length > 0", timeout=30000)
    page.wait_for_timeout(800)
    return ctx, page, errors, calls


def card_ready(page, pattern, timeout=30000):
    page.wait_for_function(f"(() => {{ const t = document.querySelector('#sidecard h2'); return t && /{pattern}/.test(t.textContent) && state.sel && state.sel.ready; }})()", timeout=timeout)


def visible_text_ok(page, name):
    txt = page.evaluate("document.body.innerText")
    bad = [w for w in ("undefined", "NaN", "[object") if w in txt]
    check(f"{name}: bez undefined / NaN / [object w tekście", not bad, bad)


def set_view(page, lat, lng, z):
    page.evaluate(f"map.setView([{lat}, {lng}], {z}, {{ animate: false }})")
    page.wait_for_timeout(500)


def desktop(browser, lang):
    pl = lang == "pl"
    ctx, page, errors, calls = open_page(browser, lang, mobile=False)
    tag = f"1440 {lang.upper()}"
    st = page.evaluate("({ base: state.base, lens: state.lens, on: Object.keys(state.lyr).filter((k) => state.lyr[k].on), legend: document.querySelector('#legend').hidden })")
    check(f"{tag} start: ortofotomapa", st["base"] == "orto", st)
    check(f"{tag} start: żaden widok i żadna warstwa", st["lens"] is None and not st["on"], st)
    check(f"{tag} start: bez legendy", st["legend"] is True, st)
    page.wait_for_function("[...document.querySelectorAll('img.leaflet-tile')].some((i) => /geoportal/.test(i.src) && i.complete && i.naturalWidth > 0)", timeout=20000)
    check(f"{tag} start: kafle ortofotomapy GUGiK się ładują", True)
    check(f"{tag} start: bez niebieskich granic działek (KIEG WMS)", page.evaluate("![...document.querySelectorAll('img')].some((i) => /KrajowaIntegracja/.test(i.src))"))

    # zoom 17: hover highlight, one request per plot, drag, click
    set_view(page, 52.3900, 16.9030, 17)
    x, y = 1000, 450
    page.mouse.move(x, y)
    page.wait_for_timeout(900)
    has_hover = page.evaluate("!!hov.layer && map.hasLayer(hov.layer) && hov.layer.options.fillColor === '#9aa0a6'")
    check(f"{tag} zoom 17: szare podświetlenie działki po zatrzymaniu kursora", has_hover)
    tip = page.evaluate("document.querySelector('#hovertip').hidden ? '' : document.querySelector('#hovertip').innerText")
    check(f"{tag} zoom 17: dymek z numerem działki", ("Działka" if pl else "Plot") in tip, tip)
    n = len(calls)
    page.mouse.move(x + 3, y + 2)
    page.wait_for_timeout(600)
    check(f"{tag} ta sama działka: bez nowego zapytania (pamięć)", len(calls) == n, calls)
    c0 = page.evaluate("map.getCenter().lng")
    n = len(calls)
    page.mouse.down()
    for k in range(1, 11):
        page.mouse.move(x - 20 * k, y, steps=2)
    during = len(calls) - n
    page.mouse.up()
    c1 = page.evaluate("map.getCenter().lng")
    check(f"{tag} przeciąganie mapy działa", abs(c1 - c0) > 1e-5, (c0, c1))
    check(f"{tag} w trakcie przeciągania brak zapytań", during == 0, during)
    page.wait_for_timeout(400)
    page.mouse.click(x, y)
    card_ready(page, "Działka" if pl else "Plot")
    head = page.evaluate("document.querySelector('#sidecard h2').textContent + ' | ' + document.querySelector('#sidecard .sub').textContent")
    check(f"{tag} kliknięcie: karta działki z numerem, obrębem i gminą", re.search(r"(Działka|Plot) \d+/\d+, (obręb|precinct) Junikowo, Poznań", head) is not None, head)
    check(f"{tag} kliknięcie: powierzchnia w m²", "m²" in head, head)
    check(f"{tag} kliknięcie: link #dz=", page.evaluate("location.hash").startswith("#dz="), page.evaluate("location.hash"))
    cells = page.evaluate("state.sel.cells.length")
    check(f"{tag} mała działka (33 m): karta liczona z komórek, które dotyka ({cells})", cells >= 1, cells)
    rows = page.evaluate("document.querySelectorAll('#sidecard li, #sidecard .row, #sidecard .chk').length")
    check(f"{tag} mała działka: karta nie jest pusta ({rows} wierszy)", rows > 0 and "outside" not in page.evaluate("document.querySelector('#sidecard').className"), rows)
    visible_text_ok(page, f"{tag} karta działki")

    # the KIEG bitmap of plot boundaries (fake: lines every 40 px): the highlight at once, no ULDK request on hover
    page.kieg["ok"] = True
    k0 = page.kieg["calls"]
    set_view(page, 52.3950, 16.9100, 17)
    page.wait_for_function("!!pbm.bm && !pbm.busy", timeout=10000)
    n = len(calls)
    page.mouse.move(1010, 470)
    page.wait_for_timeout(50)
    box = page.evaluate("""(() => { if (!hov.layer || !hov.p || !hov.p.region) return null;
      const b = hov.layer.getBounds(), a = map.latLngToContainerPoint(b.getNorthWest()), c = map.latLngToContainerPoint(b.getSouthEast());
      return [c.x - a.x, c.y - a.y, hov.p.ring.length]; })()""")
    check(f"{tag} bitmapa KIEG: podświetlenie od razu, z bitmapy", box is not None and 30 < box[0] < 50 and 30 < box[1] < 50, box)
    for k in range(12):
        page.mouse.move(600 + 41 * k, 300 + 27 * k)
        page.wait_for_timeout(60)
    page.wait_for_timeout(700)
    check(f"{tag} bitmapa KIEG: najechanie bez zapytań ULDK", len(calls) == n, calls[n:])
    check(f"{tag} bitmapa KIEG: jedno pobranie na widok", page.kieg["calls"] - k0 == 1, page.kieg["calls"] - k0)
    page.kieg["ok"] = False

    # no plot (a "road" in the fake register): 1 km circle with a short note
    j = 13 * math.ceil(16.9030 / D_LNG / 13)
    page.evaluate(f"selectParcelAt(52.3901, {(j + 0.5) * D_LNG})")
    card_ready(page, ".")
    sub = page.evaluate("document.querySelector('#sidecard .sub').textContent")
    check(f"{tag} brak działki: koło 1 km z informacją", ("1 km" in sub) and (("nie znaleziono" in sub) if pl else ("no plot" in sub)), sub)

    # below zoom 16 a click zooms in to 17 with a hint
    set_view(page, 52.3900, 16.9030, 13)
    page.mouse.click(x, y)
    page.wait_for_timeout(1500)
    hint = page.evaluate("document.querySelector('#drawhint').hidden ? '' : document.querySelector('#drawhint-text').textContent")
    check(f"{tag} zoom 13: kliknięcie przybliża do 17", abs(page.evaluate("map.getZoom()") - 17) < 0.3, page.evaluate("map.getZoom()"))
    check(f"{tag} zoom 13: podpowiedź „Przybliż…”", ("Przybliż" if pl else "Zoom in") in hint, hint)

    # circle tool: the radius follows the zoom
    radii = []
    for z in (12, 14, 16):
        set_view(page, 52.3900, 16.9030, z)
        page.click("#tool-circle")
        check(f"{tag} koło: przycisk wciśnięty (zoom {z})", page.get_attribute("#tool-circle", "aria-pressed") == "true")
        page.mouse.move(x, y)
        page.wait_for_timeout(200)
        page.mouse.click(x, y)
        card_ready(page, ".")
        sub = page.evaluate("document.querySelector('#sidecard .sub').textContent")
        m = re.search(r"(\d+ (?:m|km)) (wokół punktu|around the point)", sub)
        radii.append(m.group(1) if m else sub)
        check(f"{tag} koło (zoom {z}): po kliknięciu wraca tryb działki", page.get_attribute("#tool-circle", "aria-pressed") == "false" and page.evaluate("draw.mode") is None)
    check(f"{tag} koło: różne promienie przy zoomie 12, 14, 16 ({', '.join(radii)})", len(set(radii)) == 3, radii)
    check(f"{tag} koło: link #lat,lng,r przy promieniu ≠ 1 km", page.evaluate("location.hash").count(",") == 2, page.evaluate("location.hash"))
    page.click("#tool-circle")
    page.keyboard.press("Escape")
    check(f"{tag} koło: Escape wyłącza narzędzie", page.get_attribute("#tool-circle", "aria-pressed") == "false")

    # drawing: only the open outline while drawing, the filled area after closing
    set_view(page, 52.3900, 16.9030, 15)
    page.click("#tool-free")
    page.mouse.move(800, 300)
    page.mouse.down()
    for (px, py) in ((950, 300), (1000, 420), (900, 520), (800, 450)):
        page.mouse.move(px, py, steps=6)
    line = page.evaluate("!!draw.shape && draw.shape instanceof L.Polyline && !(draw.shape instanceof L.Polygon) && !draw.shape.options.fill")
    page.mouse.move(805, 305, steps=6)
    page.mouse.up()
    page.wait_for_timeout(500)
    check(f"{tag} ołówek: w trakcie tylko linia, bez wypełnienia i domknięcia", line)
    check(f"{tag} ołówek: po puszczeniu zaznaczony obszar", page.evaluate("state.sel && state.sel.kind") == "area")
    page.click("#tool-poly")
    for (px, py) in ((800, 300), (950, 320), (900, 480)):
        page.mouse.click(px, py)
        page.wait_for_timeout(150)
    page.mouse.move(820, 420)
    poly_line = page.evaluate("!!draw.shape && !(draw.shape instanceof L.Polygon) && !!draw.guide")
    check(f"{tag} wielokąt: linia między punktami i przerywana do kursora, bez pola", poly_line)
    page.mouse.click(800, 300)  # close on the first corner
    page.wait_for_timeout(500)
    check(f"{tag} wielokąt: po domknięciu zaznaczony obszar", page.evaluate("state.sel && state.sel.kind") == "area" and page.evaluate("draw.mode") is None)

    # links
    for h, want in (("#dz=306401_1.0051.174633_33806", "Działka|Plot"), ("#52.40000,16.90000", "."), ("#52.40000,16.90000,0.5", ".")):
        page.goto(f"{BASE}/?lang={lang}{h}")
        page.wait_for_function("typeof map !== 'undefined' && map", timeout=30000)
        card_ready(page, want)
        sub = page.evaluate("document.querySelector('#sidecard .sub').textContent")
        if h.startswith("#dz"):
            check(f"{tag} link {h}: karta działki", "m²" in sub, sub)
        else:
            want_r = "500 m" if h.endswith("0.5") else "1 km"
            check(f"{tag} link {h}: {want_r}", want_r in sub, sub)
    visible_text_ok(page, f"{tag} po linkach")
    check(f"{tag} brak błędów w konsoli", not errors, errors[:5])
    ctx.close()


def phone(browser, lang):
    pl = lang == "pl"
    ctx, page, errors, calls = open_page(browser, lang, mobile=True)
    tag = f"390 {lang.upper()}"
    st = page.evaluate("({ base: state.base, lens: state.lens, on: Object.keys(state.lyr).filter((k) => state.lyr[k].on).length, hover: matchMedia('(hover: hover)').matches })")
    check(f"{tag} start: ortofotomapa, bez warstw", st["base"] == "orto" and st["lens"] is None and st["on"] == 0, st)
    set_view(page, 52.3900, 16.9030, 17)
    page.touchscreen.tap(195, 330)
    card_ready(page, "Działka" if pl else "Plot")
    check(f"{tag} dotknięcie na zoomie 17: od razu karta działki", True)
    check(f"{tag} bez podświetlenia pod kursorem na dotyku", not page.evaluate("!!hov.layer"))
    visible_text_ok(page, f"{tag} karta działki")
    check(f"{tag} brak błędów w konsoli", not errors, errors[:5])
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch(channel=CHANNEL if CHANNEL != "chromium" else None, headless=True)
    for lang in ("pl", "en"):
        desktop(browser, lang)
        phone(browser, lang)
    browser.close()
print(f"\n{failed} BŁĘDÓW" if failed else "\nWszystko OK")
sys.exit(1 if failed else 0)
