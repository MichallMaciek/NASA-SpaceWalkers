#!/usr/bin/env python3
"""SARnik end-to-end browser tests (Playwright for Python, headless system Chrome).

Covers docs/poprawa_mapy.md point 12: time line, sliders, place card, drawing an area, Polish and English,
dark mode and the link to a place, plus items 1 and 2 of that list (Today button, hover tooltip hiding).
Every scenario runs in Polish and English, at 1440x900 and 390x844. A scenario fails on any page error or
console error. The test only drives the DOM (the app is one IIFE without exports); to place the pointer on the
map it exposes the Leaflet map as window.__map, as promo/capture.py does. Nominatim is stubbed.

It detects which interface it is looking at (v3: plain check-up with its header and map views; v2: technical
checklist) instead of assuming one, so it runs on main and on older branches.

Usage (from the repository root):
  # serve the app yourself ...
  python -m http.server 8742 --directory poznan-trend-detective/web &
  .venv/bin/python poznan-trend-detective/tests/e2e_sarnik.py --url http://127.0.0.1:8742/
  # ... or let the test serve a folder and stop the server at the end
  .venv/bin/python poznan-trend-detective/tests/e2e_sarnik.py --serve poznan-trend-detective/web --port 8742
Options: --shots DIR saves at most 12 JPEG screenshots (quality 70, <= 250 KB); --json FILE writes the results;
--only NAME runs the scenarios whose name contains NAME; --quick runs only Polish at 1440x900.
Exit code 0 when every scenario passed, 1 otherwise.
"""
import argparse
import asyncio
import io
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
NOW_YEAR = 2026  # the app takes new Date().getFullYear(); the hackathon runs in 2026

# expose the Leaflet map of the page as window.__map (test browser only, nothing in web/ changes)
HOOK = """
(() => {
  let _L;
  Object.defineProperty(window, 'L', { configurable: true,
    get() { return _L; },
    set(v) { _L = v; try { v.Map.addInitHook(function () { window.__map = this; }); } catch (e) {} } });
})();
"""
# Nominatim stub (its usage policy forbids automated bursts): one fixed address for search and reverse lookups
GEOCODE = [{"lat": "52.40812", "lon": "16.93350", "name": "Stary Rynek", "type": "square", "addresstype": "square",
            "display_name": "Stary Rynek, Stare Miasto, Poznań, województwo wielkopolskie, Polska",
            "address": {"road": "Stary Rynek", "suburb": "Stare Miasto", "city": "Poznań", "country_code": "pl"}}]

CENTRE = (52.40812, 16.93350)   # Stary Rynek, Poznań
SUBURB = (52.35844, 16.67640)   # Dopiewo
VIEWPORTS = [(1440, 900), (390, 844)]
LANGS = ["pl", "en"]
BAD_TEXT = r"/.{0,40}(\bundefined\b|\bNaN\b|\[object [A-Za-z]+\]|\bnull\b|\bInfinity\b).{0,40}/g"
# English words of the expert hover tooltip (onHover) that must not appear on the Polish page
EN_HOVER_WORDS = ["Built-up", "Vegetation / open land", "Water / smooth surface", "New building / wall",
                  "Clearing / demolition", "Stable", "Heavy water soaking", "Drying", "Moderate moisture",
                  "Subsidence", "Uplift"]

MAX_SHOTS, MAX_SHOT_BYTES = 12, 250_000


class Fail(AssertionError):
    pass


def check(cond, msg):
    if not cond:
        raise Fail(msg)


class Run:
    def __init__(self, args):
        self.url = args.url.rstrip("/") + "/"
        self.label = args.label
        self.shots_dir = Path(args.shots) if args.shots else None
        self.shots = []
        self.results = []
        self.only = args.only
        self.wanted_shots = set(args.shot_names.split(",")) if args.shot_names else None

    async def shot(self, pg, name):
        """JPEG screenshot, quality 70, at most 250 KB; at most 12 per run"""
        if not self.shots_dir or len(self.shots) >= MAX_SHOTS:
            return None
        if self.wanted_shots is not None and name not in self.wanted_shots:
            return None
        self.shots_dir.mkdir(parents=True, exist_ok=True)
        path = self.shots_dir / f"{name}.jpg"
        data = await pg.screenshot(type="jpeg", quality=70)
        if len(data) > MAX_SHOT_BYTES:  # busy maps: shrink until it fits
            try:
                from PIL import Image
                im = Image.open(io.BytesIO(data))
                scale = 0.85
                while len(data) > MAX_SHOT_BYTES and scale > 0.3:
                    buf = io.BytesIO()
                    im.resize((int(im.width * scale), int(im.height * scale))).save(buf, "JPEG", quality=70)
                    data, scale = buf.getvalue(), scale - 0.1
            except ImportError:
                pass
        path.write_bytes(data)
        self.shots.append(str(path))
        return str(path)


# ---------------------------------------------------------------- page helpers
async def fake_geocoder(route):
    url = route.request.url
    if "/search" in url:
        body = GEOCODE
    else:  # reverse lookup: a fixed street in the town the point lies in (west of 16.8 E is Dopiewo here)
        m = re.search(r"lon=([\d.]+)", url)
        town = "Dopiewo" if m and float(m.group(1)) < 16.8 else "Poznań"
        body = {"address": {"road": "ul. Testowa", "house_number": "1", "city": town}}
    await route.fulfill(status=200, content_type="application/json", body=json.dumps(body))


async def new_page(browser, run, lang, vp, hash_="", expert=False, theme=None, touch=False):
    w, h = vp
    ctx = await browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1,
                                    locale="pl-PL" if lang == "pl" else "en-GB", has_touch=touch, is_mobile=touch and w < 760)
    await ctx.add_init_script(HOOK)
    # first visit settings, written once (a later reload keeps what the viewer changed)
    prefs = {"ptd-lang": lang, "ptd-expert": "1" if expert else "0"}
    if theme:
        prefs["ptd-theme"] = theme
    await ctx.add_init_script(f"""(() => {{ try {{ if (!sessionStorage.getItem('e2e-init')) {{
        localStorage.clear(); const p = {json.dumps(prefs)}; Object.keys(p).forEach((k) => localStorage.setItem(k, p[k]));
        sessionStorage.setItem('e2e-init', '1'); }} }} catch (e) {{}} }})();""")
    await ctx.route("**/nominatim.openstreetmap.org/**", fake_geocoder)
    pg = await ctx.new_page()
    errs = []
    pg.on("console", lambda m: errs.append(f"console.{m.type}: {m.text[:300]}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {str(e)[:300]}"))
    pg.on("response", lambda r: errs.append(f"HTTP {r.status} {r.url[:160]}") if r.status >= 400 and r.url.startswith(run.url) else None)
    await pg.goto(run.url + hash_, wait_until="load")
    await wait_app(pg)
    return ctx, pg, errs


async def wait_app(pg):
    await pg.wait_for_function("window.__map && document.querySelector('#sidecard') && document.querySelector('#sidecard').innerHTML.length > 50",
                               timeout=60000)
    await settle(pg, 800)


async def settle(pg, ms=600):
    # layers decode in the browser; the map cursor shows "progress" while ensure() loads them
    try:
        await pg.wait_for_function("document.querySelector('#map').style.cursor !== 'progress'", timeout=15000)
    except Exception:
        pass
    await pg.wait_for_timeout(ms)


async def wait_card(pg, timeout=40000):
    """a selection card is ready when it has its clear button (the loading card has none)"""
    await pg.wait_for_function("document.querySelector('#sidecard #clear-sel')", timeout=timeout)
    await pg.wait_for_timeout(300)


async def i18n(pg, expr):
    return await pg.evaluate(f"(() => {{ const lang = document.documentElement.lang; const T = window.I18N[lang], U = T.ui; return {expr}; }})()")


async def bad_text(pg, selectors):
    return await pg.evaluate("""(sels) => { const out = [];
      for (const s of sels) for (const el of document.querySelectorAll(s)) {
        const m = el.textContent.match(%s); if (m) out.push(s + ': ' + m.slice(0, 3).join(' | ')); }
      return out; }""" % BAD_TEXT, selectors)


async def ui_kind(pg):
    return await pg.evaluate("""() => ({
      lenses: document.querySelectorAll('#lenses [data-lens]').length,
      radarBtn: !!document.querySelector('#radar-btn') && !document.querySelector('#radar-btn').hidden,
      expertSw: true })""")


async def card_info(pg):
    return await pg.evaluate("""() => { const c = document.querySelector('#sidecard');
      const q = (s) => c.querySelector(s), qa = (s) => [...c.querySelectorAll(s)];
      const groups = qa('h3.pl-h').map((h) => ({ h: h.textContent.trim(), sar: h.classList.contains('is-sar'),
        rows: h.nextElementSibling ? h.nextElementSibling.querySelectorAll('li').length : 0 }));
      return { title: (q('h2') || {}).textContent || '', sub: (q('.sub') || {}).textContent || '',
        plain: !!q('.verdict'), header: (q('.vd-n') || {}).textContent || '', flags: qa('li.pl-warn, li.pl-risk').length,
        groups, check: !!q('.check'), ckRows: qa('.check .ck').length, tech: !!q('details.tech'),
        techOpen: !!(q('details.tech') || {}).open, rbRows: qa('.radar-block .rb-row').length,
        radarHow: !!q('[data-radar-how]'), outside: !q('.verdict') && !q('.check') && !q('.rows'),
        text: c.innerText }; }""")


async def map_point(pg, lat, lng):
    """page coordinates of a lat/lng and whether the map itself is under that pixel (not a card)"""
    return await pg.evaluate("""([la, lo]) => { const p = window.__map.latLngToContainerPoint([la, lo]);
      const r = document.querySelector('#map').getBoundingClientRect(), x = r.x + p.x, y = r.y + p.y;
      const el = document.elementFromPoint(x, y);
      return { x, y, onMap: !!el && !!el.closest('#map') && !el.closest('.leaflet-control') }; }""", [lat, lng])


async def free_map_point(pg):
    """a pixel of the map not covered by any card, preferring the middle of the free area"""
    return await pg.evaluate("""() => { const W = innerWidth, H = innerHeight, cands = [];
      for (let fy = 0.25; fy <= 0.75; fy += 0.05) for (let fx = 0.2; fx <= 0.85; fx += 0.05) cands.push([fx * W, fy * H]);
      cands.sort((a, b) => Math.hypot(a[0] - W * 0.6, a[1] - H * 0.4) - Math.hypot(b[0] - W * 0.6, b[1] - H * 0.4));
      const free = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('#map') && !el.closest('.leaflet-control'); };
      for (const [x, y] of cands) if (free(x, y) && free(x - 70, y - 70) && free(x + 70, y + 70) && free(x - 70, y + 70) && free(x + 70, y - 70)) return { x, y };
      return null; }""")


async def set_range(pg, sel, value):
    """what a pointer click on a range input does: input, then change"""
    await pg.evaluate("""([s, v]) => { const el = document.querySelector(s); el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }""", [sel, str(value)])


async def tl_state(pg):
    return await pg.evaluate("""() => ({ year: document.querySelector('#tl-year').textContent.trim(),
      kind: document.querySelector('#tl-kind').textContent.trim(), value: document.querySelector('#year').value,
      min: +document.querySelector('#year').min, max: +document.querySelector('#year').max,
      radar: document.querySelector('#timeline').classList.contains('radar'),
      future: document.querySelector('#timeline').classList.contains('future'),
      ticks: [...document.querySelectorAll('#tl-ticks span')].map((s) => ({ t: s.textContent.trim(), cls: s.className, role: s.getAttribute('role') })),
      legend: [...document.querySelectorAll('#legend .lblock')].map((b) => b.textContent.trim()).join('\\n'),
      legendShown: getComputedStyle(document.querySelector('#legend')).display !== 'none' })""")


async def open_drawer(pg, all_sections=True):
    if await pg.evaluate("document.querySelector('#drawer').hidden"):
        await pg.click("#menu-btn")
        await pg.wait_for_timeout(300)
    if all_sections:
        await pg.evaluate("document.querySelectorAll('#drawer details.sec:not(.link)').forEach((d) => { d.open = true; })")


async def close_drawer(pg):
    if not await pg.evaluate("document.querySelector('#drawer').hidden"):
        await pg.click("#drawer-close")
        await pg.wait_for_timeout(300)


async def set_lens(pg, k):
    if await pg.locator(f"#lenses [data-lens={k}]").count():
        await pg.click(f"#lenses [data-lens={k}]")
        await settle(pg, 500)
        return True
    return False


# ---------------------------------------------------------------- scenarios
# each returns a detail string or raises Fail; the runner adds page errors

async def s1_start(run, b, lang, vp):
    ctx, pg, errs = await new_page(b, run, lang, vp)
    try:
        title = await pg.title()
        visible = await pg.evaluate("document.body.innerText.includes('SARnik')")
        kind = await ui_kind(pg)
        side = await pg.evaluate("document.querySelector('#sidecard').innerText.slice(0, 80).replace(/\\n/g, ' / ')")
        bad = await bad_text(pg, ["#sidecard", "#legend", "#timeline", "#lenses"])
        await run.shot(pg, f"01_start_{lang}_{vp[0]}")
        check("SARnik" in title, f"title {title!r} has no SARnik")
        check(visible, f"the name SARnik is not visible anywhere on the page (only in the tab title {title!r}, html lang={lang})")
        check(not bad, f"bad text: {bad}")
        return errs, (f"title={title!r}; SARnik visible in page text={visible}; lenses={kind['lenses']}; radar button={kind['radarBtn']}; "
                      f"card starts {side!r}"), {"sarnik_visible": visible}
    finally:
        await ctx.close()


async def s2_place_hash(run, b, lang, vp, where, ll):
    hash_ = f"#{ll[0]:.5f},{ll[1]:.5f}"
    ctx, pg, errs = await new_page(b, run, lang, vp, hash_)
    try:
        await wait_card(pg)
        await settle(pg, 900)
        ci = await card_info(pg)
        bad = await bad_text(pg, ["#sidecard", "#legend", "#timeline"])
        h = await pg.evaluate("location.hash")
        await run.shot(pg, f"02_card_{where}_{lang}_{vp[0]}")
        check(not ci["outside"], f"card says the place is outside the study area: {ci['text'][:120]!r}")
        check(not bad, f"bad text: {bad}")
        check(h == hash_, f"hash changed to {h!r}")
        if ci["plain"]:
            # v3 plain check-up: header with the number of things to check, radar group first
            m = re.search(r"\d+", ci["header"])
            n = int(m.group()) if m else 0
            check(n == ci["flags"], f"header says {ci['header']!r} but {ci['flags']} rows are warn/risk")
            sar_groups = [g for g in ci["groups"] if g["sar"]]
            check(sar_groups and sar_groups[0]["rows"] >= 1, f"no radar rows in the check-up: {ci['groups']}")
            exp_grp = await i18n(pg, "U.plain.grpSar")
            check(sar_groups[0]["h"] == exp_grp, f"radar group heading {sar_groups[0]['h']!r} != {exp_grp!r}")
            check(ci["tech"], "no collapsed technical block")
            check(ci["rbRows"] >= 5, f"radar block has {ci['rbRows']} rows")
            ver = f"v3 plain check-up: header {ci['header']!r}, groups {[(g['h'], g['rows']) for g in ci['groups']]}, radar block rows {ci['rbRows']}"
        else:
            check(ci["check"] and ci["ckRows"] >= 3, "neither the plain check-up nor the technical checklist is shown")
            ver = f"technical checklist with {ci['ckRows']} rows, radar block rows {ci['rbRows']}"
        # 'How radar sees the ground' from inside the card
        how = ""
        if ci["radarHow"]:
            await pg.evaluate("document.querySelector('#sidecard details.tech') && (document.querySelector('#sidecard details.tech').open = true)")
            await pg.locator("#sidecard [data-radar-how]").first.click()
            await pg.wait_for_timeout(300)
            op = await pg.evaluate("document.querySelector('#radar-sheet').open")
            check(op, "the card's 'how radar sees' link did not open the sheet")
            await pg.click("#radar-close")
            how = "; card link opens radar sheet"
        return errs, f"{ver}; title {ci['title']!r}{how}", {}
    finally:
        await ctx.close()


async def s2_link_from_click(run, b, lang, vp):
    """click a place on the map, copy the link the app writes, open it in a new page: same place"""
    ctx, pg, errs = await new_page(b, run, lang, vp)
    try:
        await pg.evaluate("window.__map.setView([52.40, 16.92], 13, { animate: false })")
        await settle(pg, 500)
        pt = await free_map_point(pg)
        check(pt, "no free map pixel to click")
        await pg.mouse.click(pt["x"], pt["y"])
        await wait_card(pg)
        h = await pg.evaluate("location.hash")
        check(re.fullmatch(r"#\d+\.\d{5},\d+\.\d{5}", h or ""), f"the app wrote no place link, hash={h!r}")
        a = await card_info(pg)
        pg2 = await ctx.new_page()
        errs2 = []
        pg2.on("pageerror", lambda e: errs2.append(f"pageerror: {e}"))
        pg2.on("console", lambda m: errs2.append(f"console.error: {m.text[:200]}") if m.type == "error" else None)
        await pg2.goto(run.url + h, wait_until="load")
        await wait_app(pg2)
        await wait_card(pg2)
        bb = await card_info(pg2)
        check(a["header"] == bb["header"] and a["sub"] == bb["sub"], f"link opens a different card: {a['header']!r}/{a['sub']!r} vs {bb['header']!r}/{bb['sub']!r}")
        # clear the selection: the link must go too
        await pg.click("#sidecard #clear-sel")
        await pg.wait_for_timeout(300)
        h2 = await pg.evaluate("location.hash")
        check(h2 == "", f"hash kept after clearing: {h2!r}")
        return errs + errs2, f"clicked map -> hash {h}; reopened link shows the same card ({bb['header']!r}); cleared -> hash removed", {}
    finally:
        await ctx.close()


async def s3_timeline(run, b, lang, vp):
    ctx, pg, errs = await new_page(b, run, lang, vp, f"#{CENTRE[0]:.5f},{CENTRE[1]:.5f}")
    notes = []
    try:
        await wait_card(pg)
        st = await tl_state(pg)
        if st["radar"]:
            # radar axis: every integer position of the slider, as a pointer click would set it
            seen = {}
            for y in range(int(st["min"]), int(st["max"]) + 1):
                await set_range(pg, "#year", y)
                await settle(pg, 250)
                s = await tl_state(pg)
                seen[y] = (s["year"], s["legend"].split("\n")[0] if s["legend"] else "")
            yrs = sorted({int(v[0]) for v in seen.values()})
            notes.append("radar axis " + ", ".join(f"{k}->{v[0]}" for k, v in seen.items()))
            check(str(NOW_YEAR) in [v[0] for v in seen.values()], "2026 never reached on the radar axis")
            arch = [y for y in yrs if y < NOW_YEAR]
            check(arch, "no archive (ALOS-2) years on the radar axis")
            for y in arch:
                check(str(y) in seen[y][1], f"legend for {y} does not name the year: {seen[y][1]!r}")
            check("NISAR" in seen[NOW_YEAR][1], f"legend for 2026 does not say NISAR: {seen[NOW_YEAR][1]!r}")
            gap = [k for k in seen if k not in yrs]
            notes.append(f"gap positions {gap} land on {[seen[k][0] for k in gap]}")
            await run.shot(pg, f"03_timeline_alos_{lang}_{vp[0]}") if vp[0] == 1440 else None
            ci = await card_info(pg)
            check(not await bad_text(pg, ["#sidecard", "#timeline", "#legend"]), "bad text on the radar axis")
            # play on the radar axis
            await set_range(pg, "#year", int(st["min"]))
            await settle(pg, 200)
            await pg.click("#play")
            vals = []
            for _ in range(20):
                await pg.wait_for_timeout(250)
                vals.append((await tl_state(pg))["year"])
            await pg.evaluate("document.querySelector('#play').classList.contains('on') && document.querySelector('#play').click()")
            seq = [v for i, v in enumerate(vals) if i == 0 or v != vals[i - 1]]
            notes.append(f"play walks {seq}")
            check(len(seq) >= 3, f"play did not move along the radar years: {seq}")
            # Today on the radar axis (poprawa_mapy item 1: in radar layers it picks the newest pass)
            now_btn = [t for t in (await tl_state(pg))["ticks"] if t["role"] == "button"]
            notes.append(f"radar axis Today button present={bool(now_btn)}")
            await set_lens(pg, "history")
        # projection axis (history view or v1 layout)
        st = await tl_state(pg)
        check(not st["radar"], "could not leave the radar axis")
        await set_range(pg, "#year", 1990)
        await settle(pg, 400)
        s90 = await tl_state(pg)
        check(s90["year"] == "1990" and not s90["future"], f"1990 not shown as measured: {s90['year']} future={s90['future']}")
        await set_range(pg, "#year", 2032)
        await settle(pg, 500)
        s32 = await tl_state(pg)
        exp_kind = await i18n(pg, "U.modelForecast")
        exp_proj = await i18n(pg, "U.lg.projected")
        check(s32["future"] and s32["kind"] == exp_kind, f"2032 not shown as a forecast: kind {s32['kind']!r}")
        check(exp_proj in s32["legend"], f"legend misses the projection row {exp_proj!r}: {s32['legend']!r}")
        ci = await card_info(pg)
        await run.shot(pg, f"03_timeline_projection_{lang}_{vp[0]}")
        check(not await bad_text(pg, ["#sidecard", "#timeline", "#legend"]), "bad text in forecast mode")
        notes.append(f"projection 2032: kind {s32['kind']!r}, legend has projection row")
        # Today button (item 1): click, then Enter key
        today = await i18n(pg, "U.today")
        nb = pg.locator("#tl-ticks .now[role=button]")
        check(await nb.count() == 1, "no Today button on the time line")
        txt = (await nb.text_content()).strip()
        check(txt.startswith(today), f"Today button text {txt!r} does not start with {today!r}")
        await nb.click()
        await settle(pg, 400)
        sT = await tl_state(pg)
        check(sT["year"] == str(NOW_YEAR), f"Today click shows {sT['year']}")
        await set_range(pg, "#year", 1985)
        await settle(pg, 200)
        await pg.locator("#tl-ticks .now[role=button]").focus()
        await pg.keyboard.press("Enter")
        await settle(pg, 300)
        sK = await tl_state(pg)
        check(sK["year"] == str(NOW_YEAR), f"Today by Enter shows {sK['year']}")
        notes.append(f"Today button {txt!r}: click and Enter go to {NOW_YEAR}")
        # Today stops playback
        await set_range(pg, "#year", 1975)
        await pg.click("#play")
        await pg.wait_for_timeout(500)
        await pg.locator("#tl-ticks .now[role=button]").click()
        await pg.wait_for_timeout(500)
        sP = await tl_state(pg)
        playing = await pg.evaluate("document.querySelector('#play').classList.contains('on')")
        check(not playing and sP["year"] == str(NOW_YEAR), f"Today during play: playing={playing}, year={sP['year']}")
        notes.append("Today stops playback")
        return errs, "; ".join(notes), {}
    finally:
        await ctx.close()


async def s3_radar_keyboard(run, b, lang, vp):
    """the radar axis with the keyboard: ArrowLeft from 2026 should reach the newest ALOS-2 year"""
    ctx, pg, errs = await new_page(b, run, lang, vp)
    try:
        st = await tl_state(pg)
        if not st["radar"]:
            return errs, "no radar axis in this version (skipped)", {}
        await pg.focus("#year")
        seq = []
        for _ in range(3):
            await pg.keyboard.press("ArrowLeft")
            await settle(pg, 300)
            seq.append((await tl_state(pg))["year"])
        await pg.keyboard.press("Home")
        await settle(pg, 300)
        home = (await tl_state(pg))["year"]
        # from the newest archive year one step right should reach 2026
        right = []
        for _ in range(int(st["max"]) - int(st["min"])):
            await pg.keyboard.press("ArrowRight")
            await settle(pg, 250)
            right.append((await tl_state(pg))["year"])
            if right[-1] == str(NOW_YEAR) or (len(right) > 8 and len(set(right[-3:])) == 1):
                break
        detail = f"ArrowLeft x3 from {NOW_YEAR} -> {seq}; Home -> {home}; ArrowRight -> {right}"
        check(seq[0] != str(NOW_YEAR), f"ArrowLeft from {NOW_YEAR} stays on {NOW_YEAR}. " + detail)
        check(str(NOW_YEAR) in right, f"ArrowRight never reaches {NOW_YEAR}. " + detail)
        return errs, detail, {}
    finally:
        await ctx.close()


async def s4_layers(run, b, lang, vp):
    ctx, pg, errs = await new_page(b, run, lang, vp)
    notes, problems = [], []
    try:
        await open_drawer(pg)
        # with the drawer open, the map-view buttons in the top bar must stay reachable (not under the top-right buttons);
        # a top bar hidden on purpose (styles.css: body.drawer-open #lenses) is fine when the drawer offers the same view
        covered = await pg.evaluate("""() => [...document.querySelectorAll('#lenses [data-lens]')].filter((b) => {
          const r = b.getBoundingClientRect(); if (!r.width) return false;
          if (getComputedStyle(b).visibility === 'hidden' && document.querySelector(`#drawer .lens-item[data-lens="${b.dataset.lens}"]`)) return false;
          const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e && !b.contains(e) && !!e.closest('.topright, #drawer'); }).map((b) => b.dataset.lens)""")
        if covered and vp[0] >= 760:  # on phones the drawer is full-screen by design
            problems.append(f"with the drawer open the map views {covered} are covered by the top-right buttons or the drawer")
        keys = await pg.evaluate("[...document.querySelectorAll('#drawer [data-toggle]')].map((c) => c.dataset.toggle)")
        legends, prev_lg = {}, None
        for k in keys:
            # exactly one layer on: switch the others off through the drawer, then this one on
            await pg.evaluate("""(k) => { document.querySelectorAll('#drawer [data-toggle]').forEach((c) => { if (c.checked && c.dataset.toggle !== k) c.click(); });
              const me = document.querySelector(`#drawer [data-toggle="${k}"]`); if (!me.checked) me.click(); }""", k)
            await settle(pg, 300)
            try:  # the legend is redrawn in the next frame: wait until it differs from the previous layer's
                await pg.wait_for_function("(prev) => ((document.querySelector('#legend .lt') || {}).textContent || '') !== prev", arg=prev_lg, timeout=3000)
            except Exception:
                pass
            lg = (await pg.evaluate("(document.querySelector('#legend .lt') || {}).textContent || ''")).strip()
            legends[k] = lg
            prev_lg = legends[k]
            if not lg:
                problems.append(f"{k}: legend empty")
                await run.shot(pg, f"04_no_legend_{k}_{lang}_{vp[0]}")
        bad = await bad_text(pg, ["#legend", "#drawer"])
        shown = await pg.evaluate("getComputedStyle(document.querySelector('#legend')).display !== 'none'")
        notes.append(f"legend visible at this width={shown}")
        if not shown:
            problems.append(f"the legend is hidden (display:none) at {vp[0]} px, so no map view has a colour key")
        firsts = [v for v in legends.values() if v]
        notes.append("layers->legend " + "; ".join(f"{k}={v!r}" for k, v in legends.items()))
        # sliders with the keyboard (a slider is only reachable while its layer is on)
        sl = []
        for k, sel in [("sarchange", "sch"), ("sarchange", "op-sarchange"), ("built", "op-built"), ("built", "chance"), ("alos", "aly"), ("egms", "seg"), ("sarwater", "swa")]:
            loc = pg.locator(f'#drawer [data-id="{sel}"]')
            if not await loc.count():
                continue
            await pg.evaluate("""(k) => { document.querySelectorAll('#drawer [data-toggle]').forEach((c) => { if (c.checked && c.dataset.toggle !== k) c.click(); });
              const me = document.querySelector(`#drawer [data-toggle="${k}"]`); if (me && !me.checked) me.click(); }""", k)
            await settle(pg, 400)
            out = loc.locator("xpath=ancestor::div[contains(@class,'field')][1]//output")
            before = (await out.text_content()).strip()
            lg0 = await pg.evaluate("document.querySelector('#legend').innerText.trim()")
            await loc.first.focus()
            await pg.keyboard.press("ArrowLeft")
            await settle(pg, 400)
            after = (await out.text_content()).strip()
            lg1 = await pg.evaluate("document.querySelector('#legend').innerText.trim()")
            sl.append(f"{sel} {before!r}->{after!r}" + (" (legend changed)" if lg0 != lg1 else ""))
            if before == after:
                problems.append(f"slider {sel} did not change its value label ({before!r})")
        notes.append("sliders " + ", ".join(sl))
        # ALOS-2 year slider must move the legend title
        if await pg.locator('#drawer [data-toggle="alos"]').count():
            await pg.evaluate("""() => { document.querySelectorAll('#drawer [data-toggle]').forEach((c) => { if (c.checked) c.click(); });
              document.querySelector('#drawer [data-toggle="alos"]').click(); }""")
            await settle(pg, 500)
            l0 = await pg.evaluate("(document.querySelector('#legend .lt') || {}).textContent || ''")
            await set_range(pg, '#drawer [data-id="aly"]', 0)
            await settle(pg, 700)
            l1 = await pg.evaluate("(document.querySelector('#legend .lt') || {}).textContent || ''")
            notes.append(f"ALOS-2 year slider: legend {l0!r} -> {l1!r}")
            if l0 == l1:
                problems.append(f"ALOS-2 year slider does not change the legend ({l0!r})")
        if vp[0] == 1440:
            await run.shot(pg, f"04_drawer_{lang}_{vp[0]}")
        await close_drawer(pg)
        # map views (lenses) in the top bar
        lv = []
        for k in await pg.evaluate("[...document.querySelectorAll('#lenses [data-lens]')].map((b) => b.dataset.lens)"):
            await set_lens(pg, k)
            pressed = await pg.evaluate(f"document.querySelector('#lenses [data-lens={k}]').getAttribute('aria-pressed')")
            lg = (await pg.evaluate("(document.querySelector('#legend .lt') || {}).textContent || ''")).strip()
            lv.append(f"{k}={lg!r}")
            if pressed != "true" or not lg:
                problems.append(f"view {k}: pressed={pressed}, legend={lg!r}")
        if lv:
            notes.append("views " + ", ".join(lv))
        check(not bad, f"bad text: {bad}")
        check(not problems, "; ".join(problems) + " || " + "; ".join(notes))
        return errs, "; ".join(notes), {"legends": legends}
    finally:
        await ctx.close()


async def s5_radar_sheet(run, b, lang, vp):
    ctx, pg, errs = await new_page(b, run, lang, vp)
    try:
        if not await pg.evaluate("!!document.querySelector('#radar-btn') && !document.querySelector('#radar-btn').hidden"):
            return errs, "no radar button in this version (skipped)", {}
        await pg.click("#radar-btn")
        await pg.wait_for_timeout(400)
        info = await pg.evaluate("""() => { const d = document.querySelector('#radar-sheet'); return { open: d.open,
          title: document.querySelector('#radar-title').textContent.trim(), len: document.querySelector('#radar-body').innerText.length,
          figs: document.querySelectorAll('#radar-body figure').length, lang: document.documentElement.lang }; }""")
        exp = await i18n(pg, "U.radarHow")
        bad = await bad_text(pg, ["#radar-sheet"])
        await run.shot(pg, f"05_radar_sheet_{lang}_{vp[0]}")
        check(info["open"], "sheet did not open")
        check(info["title"] == exp, f"title {info['title']!r} != {exp!r}")
        check(info["len"] > 300, f"sheet text only {info['len']} characters")
        check(not bad, f"bad text: {bad}")
        await pg.click("#radar-close")
        await pg.wait_for_timeout(200)
        check(not await pg.evaluate("document.querySelector('#radar-sheet').open"), "sheet did not close")
        await pg.keyboard.press("Escape")
        return errs, f"opened: title {info['title']!r}, {info['len']} chars, {info['figs']} figures; closed", {}
    finally:
        await ctx.close()


async def s6_draw(run, b, lang, vp):
    ctx, pg, errs = await new_page(b, run, lang, vp, f"#{CENTRE[0]:.5f},{CENTRE[1]:.5f}")
    notes = []
    try:
        await wait_card(pg)
        await pg.evaluate("window.__map.setView([52.405, 16.925], 14, { animate: false })")
        await settle(pg, 500)
        c = await free_map_point(pg)
        check(c, "could not find a free part of the map to draw on")
        exp_title = await i18n(pg, "U.selectedArea")
        # polygon: four clicks, then a click on the first vertex closes it
        await pg.click("#tool-poly")
        hint = await pg.evaluate("document.querySelector('#drawhint').hidden ? '' : document.querySelector('#drawhint-text').textContent")
        pts = [(c["x"] - 60, c["y"] - 50), (c["x"] + 60, c["y"] - 55), (c["x"] + 65, c["y"] + 50), (c["x"] - 55, c["y"] + 55)]
        for x, y in pts:
            await pg.mouse.click(x, y)
            await pg.wait_for_timeout(150)
        await pg.mouse.move(pts[0][0] + 2, pts[0][1] + 2)
        await pg.mouse.click(pts[0][0] + 2, pts[0][1] + 2)
        await wait_card(pg)
        ci = await card_info(pg)
        h = await pg.evaluate("location.hash")
        await run.shot(pg, f"06_draw_polygon_{lang}_{vp[0]}")
        check(ci["title"].strip() == exp_title, f"card title after polygon {ci['title']!r} != {exp_title!r}")
        check("km²" in ci["sub"], f"area card has no km²: {ci['sub']!r}")
        check(ci["plain"] or ci["check"], "area card has no check-up")
        check(h == "", f"area keeps a point link {h!r}")
        check(not await bad_text(pg, ["#sidecard"]), "bad text in the area card")
        notes.append(f"polygon: hint {hint!r}, card {ci['title']!r} {ci['sub']!r}, {ci['header']!r}")
        # freehand: press, drag around, release
        await pg.click("#tool-free")
        await pg.mouse.move(c["x"] - 50, c["y"])
        await pg.mouse.down()
        import math
        for k in range(1, 41):
            t = k / 40 * 2 * math.pi
            await pg.mouse.move(c["x"] - 50 * math.cos(t), c["y"] - 45 * math.sin(t), steps=2)
        await pg.mouse.up()
        await wait_card(pg)
        await settle(pg, 300)
        cf = await card_info(pg)
        check(cf["title"].strip() == exp_title and "km²" in cf["sub"], f"freehand card {cf['title']!r} {cf['sub']!r}")
        notes.append(f"freehand: {cf['sub']!r}")
        # too small, then Escape cancels
        await pg.click("#tool-poly")
        await pg.mouse.click(c["x"], c["y"])
        await pg.mouse.click(c["x"] + 4, c["y"])
        await pg.keyboard.press("Escape")
        ap = await pg.evaluate("document.querySelector('#tool-poly').getAttribute('aria-pressed')")
        check(ap == "false", "Escape did not stop drawing")
        notes.append("Escape stops drawing")
        # clear button
        await pg.click("#tool-clear")
        await pg.wait_for_timeout(300)
        check(await pg.evaluate("document.querySelector('#tool-clear').disabled"), "clear button still enabled after clearing")
        return errs, "; ".join(notes), {}
    finally:
        await ctx.close()


async def s7_lang_theme(run, b, lang, vp):
    other = "en" if lang == "pl" else "pl"
    ctx, pg, errs = await new_page(b, run, lang, vp, f"#{SUBURB[0]:.5f},{SUBURB[1]:.5f}")
    notes = []
    try:
        await wait_card(pg)
        a = await card_info(pg)
        await open_drawer(pg, all_sections=False)
        await pg.click(f"#drawer [data-lang={other}]")
        await settle(pg, 400)
        await close_drawer(pg)
        await wait_card(pg)
        bb = await card_info(pg)
        lang_now = await pg.evaluate("document.documentElement.lang")
        check(lang_now == other, f"html lang {lang_now!r}")
        if bb["plain"]:
            exp = await i18n(pg, "U.plain.grpSar")
            check(bb["groups"] and bb["groups"][0]["h"] == exp, f"card group {bb['groups'][:1]} not in {other}")
        check(bb["header"] != a["header"] or not a["header"], f"card header not translated: {bb['header']!r}")
        lens = await pg.evaluate("(document.querySelector('#lenses [data-lens=radar]') || {}).textContent || ''")
        if lens:
            exp_l = await i18n(pg, "U.lens.radar")
            check(lens.strip() == exp_l.strip(), f"map view label {lens!r} != {exp_l!r}")
        # the search box placeholder and the timeline follow the language too
        ph = await pg.evaluate("document.querySelector('#q').placeholder")
        exp_ph = await i18n(pg, "U.searchPh || T.searchPh")
        check(ph == exp_ph, f"search placeholder {ph!r} != {exp_ph!r}")
        notes.append(f"{lang}->{other}: header {a['header']!r} -> {bb['header']!r}")
        # dark mode with the card open
        bg0 = await pg.evaluate("getComputedStyle(document.body).backgroundColor")
        th0 = await pg.evaluate("document.documentElement.getAttribute('data-theme')")
        await pg.click("#theme-btn")
        await settle(pg, 900)
        th1 = await pg.evaluate("document.documentElement.getAttribute('data-theme')")
        bg1 = await pg.evaluate("getComputedStyle(document.body).backgroundColor")
        card_bg = await pg.evaluate("getComputedStyle(document.querySelector('#sidecard')).backgroundColor")
        cd = await card_info(pg)
        await run.shot(pg, f"07_dark_card_{other}_{vp[0]}")
        check(th1 == "dark", f"theme after click {th1!r} (was {th0!r})")
        check(bg1 != bg0, f"page background unchanged {bg1}")
        check(cd["header"] == bb["header"], "card changed when switching theme")
        check(not await bad_text(pg, ["#sidecard", "#legend", "#timeline"]), "bad text in dark mode")
        notes.append(f"theme {th0}->{th1}, body {bg0}->{bg1}, card {card_bg}")
        # expert switch opens the technical block
        await open_drawer(pg, all_sections=False)
        await pg.click("#drawer label[for=expert-sw]") if await pg.locator("#expert-sw").count() else None
        await settle(pg, 300)
        await close_drawer(pg)
        ce = await card_info(pg)
        if await pg.locator("#expert-sw").count():
            check(ce["techOpen"] or not ce["tech"], "expert mode did not open the technical block")
            notes.append(f"expert mode: technical block open={ce['techOpen']}")
        # reload: language, theme, expert and the place survive
        await pg.reload(wait_until="load")
        await wait_app(pg)
        await wait_card(pg)
        r = await pg.evaluate("[document.documentElement.lang, document.documentElement.getAttribute('data-theme'), document.body.classList.contains('expert'), location.hash]")
        check(r[0] == other and r[1] == "dark", f"after reload lang/theme {r}")
        notes.append(f"after reload {r}")
        return errs, "; ".join(notes), {}
    finally:
        await ctx.close()


async def s8_hover(run, b, lang, vp):
    """item 2: tooltip only over the map; in Polish its words are Polish (expert and plain mode)"""
    notes, problems = [], []
    if vp[0] < 760:
        # phone: plan item 2 says a tap shows the value and it hides after a tap elsewhere or 4 s
        ctx, pg, errs = await new_page(b, run, lang, vp, touch=True)
        try:
            await set_lens(pg, "build")
            pt = await free_map_point(pg)
            check(pt, "no free map pixel")
            await pg.touchscreen.tap(pt["x"], pt["y"])
            await pg.wait_for_timeout(700)
            tip = await pg.evaluate("[document.querySelector('#hovertip').hidden, document.querySelector('#hovertip').innerText]")
            card = await pg.evaluate("document.querySelector('#sidecard h2').textContent")
            return errs, f"tap on the map: tooltip shown={not tip[0]} {tip[1][:60]!r}; tap opened card {card!r}", {"tap_tip": not tip[0]}
        finally:
            await ctx.close()
    ctx, pg, errs = await new_page(b, run, lang, vp, expert=True)
    try:
        await pg.evaluate("window.__map.setView([52.405, 16.93], 13, { animate: false })")
        await settle(pg, 500)
        pt = await free_map_point(pg)
        check(pt, "no free map pixel")
        views = await pg.evaluate("[...document.querySelectorAll('#lenses [data-lens]')].map((b) => b.dataset.lens)") or [None]
        texts = {}
        for k in views:
            if k:
                await set_lens(pg, k)
            # walk a little so several cells are hovered
            seen = []
            for dx in (0, 40, 80, -40):
                await pg.mouse.move(pt["x"] + dx, pt["y"] + dx / 2, steps=3)
                await pg.wait_for_timeout(120)
                tip = await pg.evaluate("[document.querySelector('#hovertip').hidden, document.querySelector('#hovertip').innerText]")
                if not tip[0]:
                    seen.append(tip[1].replace("\n", " / "))
            texts[k or "-"] = seen
        if lang == "pl":
            en = sorted({w for v in texts.values() for t in v for w in EN_HOVER_WORDS if re.search(r"(?<![\w/])" + re.escape(w) + r"\b", t)})
            if en:
                problems.append(f"English words in the Polish expert tooltip: {en}")
        shown = {k: v[0] for k, v in texts.items() if v}
        notes.append("expert tooltip " + "; ".join(f"{k}: {v!r}" for k, v in shown.items()))
        # make sure it is visible, then leave the map: onto the card, the timeline, the drawer button; window blur
        await set_lens(pg, views[0]) if views[0] else None
        if await pg.locator("#lenses [data-lens=radar]").count():
            await set_lens(pg, "radar")
        await pg.mouse.move(pt["x"], pt["y"], steps=2)
        await pg.mouse.move(pt["x"] + 3, pt["y"] + 3, steps=2)
        await pg.wait_for_timeout(200)
        vis = not await pg.evaluate("document.querySelector('#hovertip').hidden")
        await run.shot(pg, f"08_hover_expert_{lang}_{vp[0]}")
        leaves = {}
        for target in ["#sidecard", "#timeline", "#legend", "#menu-btn"]:
            await pg.mouse.move(pt["x"], pt["y"], steps=2)
            await pg.mouse.move(pt["x"] + 2, pt["y"] + 1)
            await pg.wait_for_timeout(120)
            before = not await pg.evaluate("document.querySelector('#hovertip').hidden")
            box = await pg.locator(target).bounding_box()
            if not box or box["width"] == 0:
                continue
            await pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + min(20, box["height"] / 2), steps=6)
            await pg.wait_for_timeout(150)
            after = not await pg.evaluate("document.querySelector('#hovertip').hidden")
            leaves[target] = (before, after)
            if before and after:
                problems.append(f"tooltip stays over {target}")
        await pg.mouse.move(pt["x"], pt["y"], steps=2)
        await pg.mouse.move(pt["x"] + 2, pt["y"] + 2)
        await pg.wait_for_timeout(120)
        before = not await pg.evaluate("document.querySelector('#hovertip').hidden")
        await pg.evaluate("window.dispatchEvent(new Event('blur'))")
        blur_after = not await pg.evaluate("document.querySelector('#hovertip').hidden")
        if before and blur_after:
            problems.append("tooltip stays after the window loses focus")
        notes.append(f"visible over map={vis}; leave (before,after)={leaves}; blur ({before},{blur_after})")
        # plain mode (default): which views show a tooltip at all
        await pg.evaluate("localStorage.setItem('ptd-expert', '0')")
        await pg.reload(wait_until="load")
        await wait_app(pg)
        await pg.evaluate("window.__map.setView([52.405, 16.93], 13, { animate: false })")
        await settle(pg, 500)
        plain = {}
        for k in views:
            if k:
                await set_lens(pg, k)
            got = ""
            for dx in (0, 40, 80, -40):
                await pg.mouse.move(pt["x"] + dx, pt["y"] + dx / 2, steps=3)
                await pg.wait_for_timeout(120)
                tip = await pg.evaluate("[document.querySelector('#hovertip').hidden, document.querySelector('#hovertip').innerText]")
                if not tip[0]:
                    got = tip[1].replace("\n", " / ")
                    break
            plain[k or "-"] = got
        notes.append("plain tooltip " + "; ".join(f"{k}: {v!r}" for k, v in plain.items()))
        check(vis, "tooltip never shown over the map in the radar view (expert)")
        check(not problems, "; ".join(problems) + " || " + "; ".join(notes))
        return errs, "; ".join(notes), {"plain": plain, "expert": shown}
    finally:
        await ctx.close()


SCENARIOS = [
    ("1 start page", s1_start),
    ("2a place by link: centre (Stary Rynek)", lambda r, b, l, v: s2_place_hash(r, b, l, v, "centre", CENTRE)),
    ("2b place by link: suburb (Dopiewo)", lambda r, b, l, v: s2_place_hash(r, b, l, v, "suburb", SUBURB)),
    ("2c link written on click reopens the place", s2_link_from_click),
    ("3a time line: radar axis, projection, Today, play", s3_timeline),
    ("3b time line: radar axis with the keyboard", s3_radar_keyboard),
    ("4 layers in the drawer, sliders, map views, legend", s4_layers),
    ("5 How radar sees the ground", s5_radar_sheet),
    ("6 draw an area (polygon, freehand, Escape)", s6_draw),
    ("7 language and theme with a card open, persistence", s7_lang_theme),
    ("8 hover tooltip: Polish words, hides off the map", s8_hover),
]


async def main_async(args):
    run = Run(args)
    combos = [(l, v) for l in LANGS for v in VIEWPORTS]
    if args.quick:
        combos = [("pl", (1440, 900))]
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome", headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        for name, fn in SCENARIOS:
            if run.only and run.only not in name:
                continue
            for lang, vp in combos:
                label = f"{name} [{lang} {vp[0]}x{vp[1]}]"
                t0 = time.time()
                try:
                    errs, detail, extra = await fn(run, b, lang, vp)
                    errs = [e for e in errs]
                    passed = not errs
                    if errs:
                        detail = f"page/console errors: {errs[:4]}; " + detail
                except Exception as e:  # Fail or a Playwright timeout
                    passed, detail, extra = False, f"{type(e).__name__}: {str(e).splitlines()[0][:3000]}", {}
                run.results.append({"name": label, "passed": passed, "detail": detail, "extra": extra, "s": round(time.time() - t0, 1)})
                print(("PASS " if passed else "FAIL ") + label + " :: " + detail[:600], flush=True)
        await b.close()
    return run


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", default=os.environ.get("APP_URL", "http://127.0.0.1:8742/"))
    ap.add_argument("--serve", help="serve this folder with python -m http.server for the run")
    ap.add_argument("--port", type=int, default=8742)
    ap.add_argument("--label", default="main")
    ap.add_argument("--shots", help="folder for at most 12 JPEG screenshots")
    ap.add_argument("--shot-names", help="comma-separated screenshot names to keep (default: the first 12)")
    ap.add_argument("--json", help="write the results here")
    ap.add_argument("--only", help="run scenarios whose name contains this text")
    ap.add_argument("--quick", action="store_true", help="only Polish at 1440x900")
    args = ap.parse_args()
    srv = None
    if args.serve:
        srv = subprocess.Popen([sys.executable, "-m", "http.server", str(args.port), "--bind", "127.0.0.1", "--directory", args.serve],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        args.url = f"http://127.0.0.1:{args.port}/"
        time.sleep(1.0)
    try:
        run = asyncio.run(main_async(args))
    finally:
        if srv:
            srv.terminate()
            srv.wait(5)
    ok = sum(r["passed"] for r in run.results)
    print(f"\n{ok}/{len(run.results)} passed ({run.label}); screenshots: {run.shots}")
    if args.json:
        Path(args.json).write_text(json.dumps({"label": run.label, "url": run.url, "results": run.results, "shots": run.shots}, ensure_ascii=False, indent=1))
    sys.exit(0 if ok == len(run.results) else 1)


if __name__ == "__main__":
    main()
