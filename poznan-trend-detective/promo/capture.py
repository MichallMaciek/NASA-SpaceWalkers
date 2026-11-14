"""Capture real footage of the running app (http://localhost:8742) as 1920x1080 PNG frames.

Usage:  .venv/bin/python capture.py [shot ...]      (no argument = all shots)
Output: capture/<shot>/NNN.png plus capture/<shot>/meta.json (click points, timings)

Nothing in web/ is changed: the script only drives the page in headless Chrome. To control the
map view it registers a Leaflet init hook in the capture browser (window.__map).
"""
import asyncio, json, sys, os
from pathlib import Path
from playwright.async_api import async_playwright

APP = os.environ.get("APP_URL", "http://localhost:8742/")
OUT = Path(__file__).parent / "capture"
W, H = 1920, 1080
DSF = float(os.environ.get("DSF", "2"))  # 2 = 3840x2160 frames, sharp when the edit zooms in

# expose the Leaflet map of the page as window.__map (capture browser only)
HOOK = """
(() => {
  let _L;
  Object.defineProperty(window, 'L', { configurable: true,
    get() { return _L; },
    set(v) { _L = v; try { v.Map.addInitHook(function () { window.__map = this; }); } catch (e) {} } });
})();
"""
# The app geocodes with the public Nominatim service. Capture runs would send it many requests, against its usage
# policy, so the capture browser answers from this fixed copy of the real result for the demo address instead.
GEOCODE = [{"lat": "52.335", "lon": "16.895", "name": "", "type": "house", "addresstype": "building",
            "display_name": "49c, Armii Poznań, Stary Luboń, Luboń, powiat poznański, województwo wielkopolskie, 62-030, Polska",
            "address": {"house_number": "49c", "road": "Armii Poznań", "suburb": "Stary Luboń", "town": "Luboń",
                        "county": "powiat poznański", "state": "województwo wielkopolskie", "postcode": "62-030",
                        "country": "Polska", "country_code": "pl"}}]


async def fake_geocoder(route):
    url = route.request.url
    body = GEOCODE if "/search" in url else GEOCODE[0]
    await route.fulfill(status=200, content_type="application/json", body=json.dumps(body))


# hide the blinking caret so typed frames look the same every run
CSS = "input { caret-color: transparent !important; }"


async def open_app(p, lang="pl"):
    b = await p.chromium.launch(channel="chrome", headless=True,
                                args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = await b.new_context(viewport={"width": W, "height": H}, device_scale_factor=DSF, locale="pl-PL")
    await ctx.add_init_script(HOOK)
    await ctx.route("**/nominatim.openstreetmap.org/**", fake_geocoder)
    pg = await ctx.new_page()
    await pg.goto(APP, wait_until="networkidle")
    await pg.add_style_tag(content=CSS)
    await pg.wait_for_function("window.__map && document.querySelector('#sidecard').innerHTML.length > 50", timeout=30000)
    if lang == "en":
        await pg.click("#menu-btn")
        await pg.locator("[data-lang=en]").evaluate("(el) => el.click()")
        await pg.wait_for_timeout(300)
        await pg.click("#drawer-close")
    await settle(pg, 2500)
    return b, pg


async def settle(pg, ms=1200):
    """wait for tiles and canvases to finish drawing"""
    try:
        await pg.wait_for_load_state("networkidle", timeout=8000)
    except Exception:
        pass
    await pg.wait_for_timeout(ms)


async def view(pg, lat, lng, z):
    await pg.evaluate(f"window.__map.setView([{lat},{lng}],{z},{{animate:false}})")
    await settle(pg, 1800)


async def set_year(pg, y):
    await pg.evaluate("""(y) => { const r = document.querySelector('#year'); r.value = y;
        r.dispatchEvent(new Event('input', {bubbles:true})); r.dispatchEvent(new Event('change', {bubbles:true})); }""", y)


async def collapse_findings(pg):
    # the findings card has a "Zwiń" (collapse) button in its header
    if await pg.locator("#fold").count() and not await pg.evaluate("document.querySelector('#sidecard').classList.contains('min')"):
        await pg.click("#fold")
        await pg.wait_for_timeout(400)


async def layer(pg, key, on=True):
    """toggle a layer in the settings drawer"""
    if not await pg.locator("#drawer").is_visible():
        await pg.click("#menu-btn")
        await pg.wait_for_timeout(400)
    cb = pg.locator(f"[data-toggle={key}]")
    if (await cb.is_checked()) != on:
        await cb.evaluate("(el) => { el.checked = !el.checked; el.dispatchEvent(new Event('change', {bubbles:true})); }")
    await pg.wait_for_timeout(500)


async def base(pg, key):
    if not await pg.locator("#drawer").is_visible():
        await pg.click("#menu-btn")
        await pg.wait_for_timeout(400)
    await pg.locator(f"[data-base={key}]").evaluate("(el) => el.click()")


async def close_drawer(pg):
    if await pg.locator("#drawer").is_visible():
        await pg.click("#drawer-close")
        await pg.wait_for_timeout(400)


def shot_dir(name):
    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    for f in d.glob("*.png"):
        f.unlink()
    return d


async def snap(pg, d, i):
    await pg.screenshot(path=str(d / f"{i:03d}.png"))
    return i + 1


async def card_full(pg, path):
    """screenshot of the whole side card, unclipped, for scrolling in the edit"""
    await pg.evaluate("""() => { document.querySelectorAll('#timeline,#legend,.topright,.topbar,.hovertip').forEach(e => e.style.visibility = 'hidden');
        const c = document.querySelector('#sidecard');
        c.dataset.oldStyle = c.getAttribute('style') || '';
        c.style.maxHeight = 'none'; c.style.overflow = 'visible'; c.style.bottom = 'auto'; }""")
    await pg.wait_for_timeout(300)
    await pg.locator("#sidecard").screenshot(path=str(path))
    box = await pg.locator("#sidecard").bounding_box()
    # where each part of the card sits (CSS px from the card top), so the edit can scroll to it
    box["parts"] = await pg.evaluate("""() => { const c = document.querySelector('#sidecard'), top = c.getBoundingClientRect().top;
        const els = [...c.children, ...c.querySelectorAll('.risk, .ck, svg, .check-h, p')];
        return [...new Set(els)].map(e => { const r = e.getBoundingClientRect();
            return {tag: e.tagName.toLowerCase(), cls: e.className && e.className.baseVal === undefined ? e.className : '',
                    text: (e.innerText || '').replace(/\\s+/g, ' ').slice(0, 80), y: r.top - top, h: r.height}; }); }""")
    await pg.evaluate("""() => { const c = document.querySelector('#sidecard'); c.setAttribute('style', c.dataset.oldStyle);
        document.querySelectorAll('#timeline,#legend,.topright,.topbar,.hovertip').forEach(e => e.style.visibility = ''); }""")
    await pg.wait_for_timeout(200)
    return box


# ---------------------------------------------------------------- shots
POZNAN = (52.408, 16.93)


async def shot_timeline(p, lang="pl"):
    """built-up layer 1975 -> 2035, one frame per epoch (history, then purple projection)"""
    b, pg = await open_app(p, lang)
    d = shot_dir(f"timeline_{lang}")
    await collapse_findings(pg)
    await view(pg, 52.40, 16.92, 11)
    years = list(range(1975, 2036, 5))
    i = 0
    for y in years:
        await set_year(pg, y)
        await settle(pg, 900)
        i = await snap(pg, d, i)
    (d / "meta.json").write_text(json.dumps({"years": years}))
    await b.close()


async def shot_search(p, lang="pl", query="Armii Poznań 49c, Luboń", pick=0):
    """typing an address, picking a suggestion, the place card"""
    b, pg = await open_app(p, lang)
    d = shot_dir(f"search_{lang}")
    i = await snap(pg, d, 0)
    await pg.click("#q")
    i = await snap(pg, d, i)
    typed = []
    # typing frames: show each prefix without firing the search (one geocoder request at the end, not one per key)
    for k in range(1, len(query)):
        await pg.evaluate("(v) => { document.querySelector('#q').value = v; }", query[:k])
        i = await snap(pg, d, i)
        typed.append(i - 1)
    await pg.evaluate("(v) => { document.querySelector('#q').value = v; }", query[:-1])
    await pg.keyboard.type(query[-1])
    i = await snap(pg, d, i)
    typed.append(i - 1)
    # suggestions from Nominatim
    await pg.wait_for_selector("#suggest li", state="visible", timeout=20000)
    await pg.wait_for_timeout(700)
    sug = i
    i = await snap(pg, d, i)
    items = pg.locator("#suggest li")
    n = await items.count()
    it = items.nth(min(pick, n - 1))
    bb = await it.bounding_box()
    click = [bb["x"] + 60, bb["y"] + bb["height"] / 2]
    await it.click()
    await pg.wait_for_function("document.querySelector('#sidecard .check')", timeout=30000)
    await settle(pg, 2500)
    card = i
    i = await snap(pg, d, i)
    box = await card_full(pg, d / "card_full.png")
    (d / "meta.json").write_text(json.dumps({"query": query, "typed": typed, "suggest": sug, "card": card,
                                             "click": click, "card_box": box, "n_suggest": n}))
    await b.close()


async def shot_draw(p, lang="pl", center=(52.433, 16.785), z=14, pts=None):
    """drawing an area with the polygon tool, then the area card"""
    b, pg = await open_app(p, lang)
    d = shot_dir(f"draw_{lang}")
    await collapse_findings(pg)
    await view(pg, center[0], center[1], z)
    pts = pts or [(880, 330), (1180, 300), (1290, 560), (1110, 760), (840, 650)]
    i = await snap(pg, d, 0)
    tool = await pg.locator("#tool-poly").bounding_box()
    await pg.click("#tool-poly")
    await pg.wait_for_timeout(300)
    i = await snap(pg, d, i)
    after_click = []
    for k, (x, y) in enumerate(list(pts) + [pts[0]]):   # the last click on the first corner closes the shape
        await pg.mouse.move(x, y, steps=4)
        await pg.mouse.click(x, y)
        await pg.wait_for_timeout(450)
        i = await snap(pg, d, i)
        after_click.append(i - 1)
    await pg.wait_for_function("document.querySelector('#sidecard .check')", timeout=30000)
    await settle(pg, 2500)
    card = i
    i = await snap(pg, d, i)
    box = await card_full(pg, d / "card_full.png")
    (d / "meta.json").write_text(json.dumps({"pts": pts, "tool": [tool["x"] + tool["width"] / 2, tool["y"] + tool["height"] / 2],
                                             "after_click": after_click, "card": card, "card_box": box}))
    await b.close()


async def set_range(pg, rid, v):
    await pg.evaluate("""([rid, v]) => { const r = document.querySelector(`input[data-id=${rid}]`); r.value = v;
        r.dispatchEvent(new Event('input', {bubbles:true})); r.dispatchEvent(new Event('change', {bubbles:true})); }""", [rid, v])


async def shot_layers(p, lang="pl", only=None):
    """single frames of other layers: NISAR radar, heat trends, PIG-PIB groundwater flood, forest, 1940 photo"""
    b, pg = await open_app(p, lang)
    d = OUT / f"layers_{lang}"
    d.mkdir(parents=True, exist_ok=True)
    await collapse_findings(pg)
    want = lambda k: only is None or k in only
    await layer(pg, "built", False)
    if want("nisar"):
        # NISAR passes that cover the whole Poznań area (picked from a contact sheet of all 38 passes)
        await layer(pg, "nisar", True)
        await view(pg, 52.40, 16.92, 10)   # at zoom 11 GIBS mixes in grey single-band tiles; zoom 10 is cleaner
        for idx in (36,):
            await layer(pg, "nisar", True)
            await set_range(pg, "nisar", idx)
            await close_drawer(pg)
            await settle(pg, 5000)
            await pg.screenshot(path=str(d / f"nisar_{idx}.png"))
        await layer(pg, "nisar", False)
    for k, (lat, lng, z) in {"night": (52.40, 16.92, 11), "day": (52.40, 16.92, 11), "flood": (52.38, 16.93, 12),
                             "forest": (52.47, 16.95, 12), "activity": (52.40, 16.92, 12), "radar": (52.40, 16.92, 12),
                             "dem": (52.40, 16.92, 11)}.items():
        if not want(k):
            continue
        await layer(pg, k, True)
        await close_drawer(pg)
        await view(pg, lat, lng, z)
        await settle(pg, 2500)
        await pg.screenshot(path=str(d / f"{k}.png"))
        await layer(pg, k, False)
    if want("photo"):
        # Poznań 1940 aerial photo, then the 2025 photo, same view (Old Town and the Warta)
        await layer(pg, "built", True)
        await base(pg, "poz1940")
        await close_drawer(pg)
        await view(pg, 52.405, 16.935, 15)
        await settle(pg, 6000)
        await pg.screenshot(path=str(d / "photo1940.png"))
        await base(pg, "poz2025")
        await close_drawer(pg)
        await settle(pg, 6000)
        await pg.screenshot(path=str(d / "photo2025.png"))
    await b.close()


async def shot_clean(p, lang="pl"):
    """the built-up map without any app UI, for the title and end card backgrounds"""
    b, pg = await open_app(p, lang)
    d = OUT / "clean"
    d.mkdir(parents=True, exist_ok=True)
    await collapse_findings(pg)
    await view(pg, 52.40, 16.92, 11)
    await pg.evaluate("""() => document.querySelectorAll('.topbar,#sidecard,.topright,#legend,#timeline,.leaflet-control-container')
        .forEach(e => e.style.visibility = 'hidden')""")
    for y in (2020, 2035):
        await set_year(pg, y)
        await settle(pg, 1500)
        await pg.screenshot(path=str(d / f"{y}.png"))
    await b.close()


SHOTS = {"clean": shot_clean, "timeline": shot_timeline, "search": shot_search, "draw": shot_draw, "layers": shot_layers}


async def main(names, lang):
    async with async_playwright() as p:
        for n in names:
            print("capturing", n, lang, flush=True)
            await SHOTS[n](p, lang)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    lang = "en" if "--en" in sys.argv else "pl"
    asyncio.run(main(args or list(SHOTS), lang))
