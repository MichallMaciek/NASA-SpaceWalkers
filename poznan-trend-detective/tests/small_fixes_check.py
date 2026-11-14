#!/usr/bin/env python3
"""Browser checks for the small fixes of 14 Nov 2026 (review findings A2/A56, A5, A6, A31/A60, A44, A46, A59, A18, A45).

No web server: every request to http://sarnik.local/ is answered from poznan-trend-detective/web on disk by
Playwright routing. External services are blocked (OpenFreeMap can be delayed with --ofm-delay to test A46),
Nominatim is stubbed. Exit code 0 when every check passed.

  .venv/bin/python poznan-trend-detective/tests/small_fixes_check.py [--ofm-delay 25]
"""
import argparse, asyncio, json, mimetypes, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

WEB = Path(os.environ.get("SARNIK_WEB") or Path(__file__).resolve().parent.parent / "web")  # SARNIK_WEB: test another copy
BASE = "http://sarnik.local/"
HOOK = """(() => { let _L; Object.defineProperty(window, 'L', { configurable: true, get() { return _L; },
  set(v) { _L = v; try { v.Map.addInitHook(function () { window.__map = this; }); } catch (e) {} } }); })();"""
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))


async def new_page(b, lang, expert=False, hash_="", fail=None, ofm_delay=None):
    ctx = await b.new_context(viewport={"width": 1440, "height": 900}, locale="pl-PL" if lang == "pl" else "en-GB")
    await ctx.add_init_script(HOOK)
    await ctx.add_init_script(f"try {{ localStorage.setItem('ptd-lang', '{lang}'); localStorage.setItem('ptd-expert', '{1 if expert else 0}'); }} catch (e) {{}}")
    state = {"fail": set(fail or [])}

    async def local(route):
        path = route.request.url[len(BASE):].split("?")[0].split("#")[0] or "index.html"
        if any(path.endswith(f) for f in state["fail"]):
            return await route.fulfill(status=503, body="unavailable")
        f = WEB / path
        if not f.is_file():
            return await route.fulfill(status=404, body="not found")
        await route.fulfill(status=200, body=f.read_bytes(), content_type=mimetypes.guess_type(str(f))[0] or "application/octet-stream")

    async def nominatim(route):
        body = [] if "/search" in route.request.url else {"address": {"road": "ul. Testowa", "house_number": "1", "city": "Poznań"}}
        await route.fulfill(status=200, content_type="application/json", body=json.dumps(body))

    async def ofm(route):
        if ofm_delay is None:
            return await route.abort()
        await asyncio.sleep(ofm_delay)
        try:
            await route.abort()
        except Exception:
            pass

    await ctx.route(BASE + "**", local)
    await ctx.route("**/nominatim.openstreetmap.org/**", nominatim)
    await ctx.route("**/tiles.openfreemap.org/**", ofm)
    for host in ["server.arcgisonline.com", "gibs.earthdata.nasa.gov", "wms2.geopoz.poznan.pl", "mapy.geoportal.gov.pl"]:
        await ctx.route(f"**/{host}/**", lambda r: r.abort())
    pg = await ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    await pg.goto(BASE + "index.html" + hash_, wait_until="load")
    return ctx, pg, errs, state


async def ready(pg, timeout=60000):
    await pg.wait_for_function("window.__map && document.querySelectorAll('#lenses [data-lens]').length > 0", timeout=timeout)
    await pg.wait_for_timeout(1500)


async def tl(pg):
    return await pg.evaluate("""() => ({ year: document.querySelector('#tl-year').textContent.trim(), kind: document.querySelector('#tl-kind').textContent.trim(),
      radar: document.querySelector('#timeline').classList.contains('radar'), future: document.querySelector('#timeline').classList.contains('future'),
      lenses: [...document.querySelectorAll('#lenses [aria-pressed=true]')].map((b) => b.dataset.lens) })""")


async def main(args):
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome", headless=True)

        # A45: something on screen before the data arrive
        ctx, pg, errs, _ = await new_page(b, "pl")
        early = await pg.evaluate("document.querySelector('#sidecard').innerText")
        check("A45 static loading line before data", "Loading" in early or "Wczytuję" in early or len(early) > 20, early[:60])
        await ready(pg)
        # A2/A56: Polish expert-less plain page; switch expert on via storage in a new page below
        await ctx.close()

        ctx, pg, errs, _ = await new_page(b, "pl", expert=True)
        await ready(pg)
        await pg.wait_for_function("document.querySelector('#map').style.cursor !== 'progress'", timeout=30000)
        pt = await pg.evaluate("""() => { const p = window.__map.latLngToContainerPoint([52.5349, 17.1320]); return { x: p.x, y: p.y }; }""")
        await pg.mouse.move(pt["x"] - 3, pt["y"]); await pg.mouse.move(pt["x"], pt["y"]); await pg.wait_for_timeout(400)
        tip = await pg.evaluate("document.querySelector('#hovertip') ? document.querySelector('#hovertip').innerText : ''")
        en_words = [w for w in ["Built-up", "Vegetation", "Water / smooth", "Stable", "Drying", "moisture"] if w in tip]
        check("A2/A56 PL expert tooltip: no English words, no C-band class on HH/HV", "HH/HV" in tip and not en_words and "Teren zabudowany" not in tip, tip.replace("\n", " | "))

        # A31/A60: keyboard across the 2022-2025 gap
        await pg.focus("#year")
        seq = []
        for key in ["ArrowLeft", "ArrowLeft", "ArrowRight", "ArrowRight", "Home", "End"]:
            await pg.keyboard.press(key); await pg.wait_for_timeout(250)
            seq.append((await tl(pg))["year"])
        check("A31/A60 radar time line keyboard", seq == ["2021", "2020", "2021", "2026", "2015", "2026"], str(seq))
        await pg.evaluate("document.activeElement.blur()")

        # A6: ALOS-2 slider moves the radar time line (expert drawer)
        await pg.click("#menu-btn"); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelectorAll('#drawer details').forEach((d) => { d.open = true; })")
        has_aly = await pg.evaluate("!!document.querySelector('.rng input[data-id=aly]')")
        if has_aly:
            await pg.evaluate("""() => { const el = document.querySelector('.rng input[data-id=aly]'); el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true })); }""")
            await pg.wait_for_timeout(500)
            t = await tl(pg)
            check("A6 aly slider syncs the time line", t["year"] == "2016", str(t))
        else:
            check("A6 aly slider syncs the time line", False, "no aly slider in the drawer")
        await ctx.close()

        # A5: building decisions keep the radar lens
        ctx, pg, errs, _ = await new_page(b, "pl")
        await ready(pg)
        await pg.click("#menu-btn"); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelectorAll('#drawer details').forEach((d) => { d.open = true; })")
        await pg.evaluate("""() => { const cb = document.querySelector('[data-toggle=wuia]'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }""")
        await pg.wait_for_timeout(800)
        t = await tl(pg)
        check("A5 wuia on keeps the radar lens and time line", t["lenses"] == ["radar"] and t["radar"] and t["year"] == "2026", str(t))
        await pg.click("#drawer-close"); await pg.wait_for_timeout(300)

        # A59: trees lens is measured, not forecast
        await pg.click("#lenses [data-lens=trees]"); await pg.wait_for_timeout(1500)
        t = await tl(pg)
        u = await pg.evaluate("window.I18N.pl.ui.fromMeasurements")
        check("A59 trees lens labelled as measured", t["kind"] == u and not t["future"], str(t))
        await ctx.close()

        # A44: a failed layer gives an error card with a retry
        ctx, pg, errs, st = await new_page(b, "en", hash_="#52.40812,16.93350", fail=["land/sar_series.png"])
        await ready(pg)
        try:
            await pg.wait_for_function("document.querySelector('#retry-sel')", timeout=30000)
            retry = True
        except Exception:
            retry = False
        txt = await pg.evaluate("document.querySelector('#sidecard').innerText")
        check("A44 error card with retry", retry and "did not load" in txt, txt.replace("\n", " | ")[:120])
        if retry:
            st["fail"].clear()
            await pg.click("#retry-sel")
            await pg.wait_for_function("document.querySelector('#sidecard #clear-sel')", timeout=40000)
            check("A44 retry loads the card", await pg.evaluate("!!document.querySelector('#sidecard details.tech')"))
        # A18: EN About says AI
        about = await pg.evaluate("window.I18N.en.aboutHtml")
        check("A18 EN About says AI tools", "Use of AI tools" in about and "SI " not in about)
        check("no page errors", not errs, "; ".join(errs[:3]))
        await ctx.close()

        if args.ofm_delay:
            ctx, pg, errs, _ = await new_page(b, "pl", ofm_delay=args.ofm_delay)
            t0 = asyncio.get_event_loop().time()
            await ready(pg, timeout=60000)
            dt = asyncio.get_event_loop().time() - t0
            check(f"A46 app ready despite a {args.ofm_delay}s OpenFreeMap delay", dt < 12, f"{dt:.1f}s incl. 1.5s settle")
            await ctx.close()
        await b.close()
    bad = [r for r in results if not r[1]]
    print(f"{len(results) - len(bad)} passed, {len(bad)} failed")
    return 1 if bad else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--ofm-delay", type=float, default=None)
    sys.exit(asyncio.run(main(ap.parse_args())))
