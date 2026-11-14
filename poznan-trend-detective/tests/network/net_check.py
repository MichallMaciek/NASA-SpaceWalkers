"""Loading, network and failure checks for SARnik (web/), driven in headless system Chrome.

Usage (serve web/ first, e.g. `cd web && python3 -m http.server 8744`):
    .venv/bin/python tests/network/net_check.py [check ...]      (no argument = all checks)
Env: APP_URL (default http://localhost:8744/), OUT (folder for screenshots and results.json),
     REMOTE_URL (a Firebase address used only by the 'mobile' timing check).

The app code is not changed: checks only observe requests and use page.route to stub, abort or delay them.
The public Nominatim geocoder is always answered from a fixed copy (as in promo/capture.py), except in the
check that makes it fail.
"""
import asyncio, json, os, sys, time
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

APP = os.environ.get("APP_URL", "http://localhost:8744/")
REMOTE = os.environ.get("REMOTE_URL", "https://poznan-trend-detective--v3-5tz04dp8.web.app/")
OUT = Path(os.environ.get("OUT", Path(__file__).parent / "out"))
OUT.mkdir(parents=True, exist_ok=True)
RES = {}

GEOCODE = [{"lat": "52.335", "lon": "16.895", "name": "", "type": "house", "addresstype": "building",
            "display_name": "49c, Armii Poznań, Stary Luboń, Luboń, powiat poznański, wielkopolskie, 62-030, Polska",
            "address": {"house_number": "49c", "road": "Armii Poznań", "suburb": "Stary Luboń", "town": "Luboń",
                        "country_code": "pl"}}]
READY = "() => { const c = document.querySelector('#sidecard'); return c && c.innerHTML.length > 50; }"
CARD_DONE = "() => !!document.querySelector('#sidecard details.tech')"


async def fake_geocoder(route):
    body = GEOCODE if "/search" in route.request.url else GEOCODE[0]
    await route.fulfill(status=200, content_type="application/json", body=json.dumps(body))


def delayed(sec):
    async def h(route):
        await asyncio.sleep(sec)
        try:
            await route.continue_()
        except Exception:
            pass
    return h


async def abort(route):
    await route.abort("failed")


class Run:
    """one browser context with a request log"""

    def __init__(self, p, name, routes=(), viewport=(1440, 900), stub_geo=True, url=None, locale="pl-PL"):
        self.p, self.name, self.routes, self.viewport, self.stub_geo = p, name, routes, viewport, stub_geo
        self.url, self.locale = url or APP, locale
        self.log, self.failed, self.console = [], [], []

    async def __aenter__(self):
        self.b = await self.p.chromium.launch(channel="chrome", headless=True,
                                              args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        self.ctx = await self.b.new_context(viewport={"width": self.viewport[0], "height": self.viewport[1]},
                                            locale=self.locale)
        if self.stub_geo:
            await self.ctx.route("**/nominatim.openstreetmap.org/**", fake_geocoder)
        for pat, h in self.routes:
            await self.ctx.route(pat, h)
        self.pg = await self.ctx.new_page()
        self.t0 = time.time()
        self.pg.on("requestfinished", lambda r: asyncio.ensure_future(self._done(r)))
        self.pg.on("requestfailed", lambda r: self.failed.append({"url": r.url, "err": r.failure}))
        self.pg.on("console", lambda m: self.console.append(f"{m.type}: {m.text}"[:300]) if m.type in ("error", "warning") else None)
        self.pg.on("pageerror", lambda e: self.console.append(f"pageerror: {e}"[:300]))
        return self

    async def _done(self, r):
        try:
            s = await r.sizes()
            size = s["responseBodySize"]
        except Exception:
            size = -1
        self.log.append({"url": r.url, "type": r.resource_type, "bytes": size, "t": round(time.time() - self.t0, 2)})

    async def __aexit__(self, *a):
        await self.b.close()

    async def goto(self, wait_ready=True, timeout=30000):
        self.t0 = time.time()
        await self.pg.goto(self.url, wait_until="domcontentloaded")
        if wait_ready:
            await self.pg.wait_for_function(READY, timeout=timeout)
        return round(time.time() - self.t0, 2)

    async def idle(self, ms=1500, timeout=15000):
        try:
            await self.pg.wait_for_load_state("networkidle", timeout=timeout)
        except Exception:
            pass
        await self.pg.wait_for_timeout(ms)

    async def shot(self, tag):
        path = OUT / f"{self.name}_{tag}.png"
        await self.pg.screenshot(path=str(path))
        return str(path)

    async def card(self):
        return (await self.pg.inner_text("#sidecard"))[:400]

    def mark(self):
        return len(self.log)


def summarise(entries):
    local = [e for e in entries if urlparse(e["url"]).hostname in ("localhost", "127.0.0.1")
             or "web.app" in (urlparse(e["url"]).hostname or "")]
    ext = [e for e in entries if e not in local]
    by_host = {}
    for e in ext:
        h = urlparse(e["url"]).hostname
        by_host.setdefault(h, [0, 0])
        by_host[h][0] += 1
        by_host[h][1] += max(e["bytes"], 0)
    top = sorted(entries, key=lambda e: -e["bytes"])[:12]
    return {"requests": len(entries), "bytes_total": sum(max(e["bytes"], 0) for e in entries),
            "bytes_app": sum(max(e["bytes"], 0) for e in local), "requests_app": len(local),
            "bytes_external": sum(max(e["bytes"], 0) for e in ext),
            "external_by_host": {h: {"req": v[0], "bytes": v[1]} for h, v in sorted(by_host.items(), key=lambda x: -x[1][1])},
            "largest": [{"path": urlparse(e["url"]).path if e in local else e["url"][:110], "bytes": e["bytes"], "t": e["t"]} for e in top]}


async def measure(p):
    """(a) first load, (b) select a place, (c) each radar view, each radar year and each radar layer of the drawer"""
    out = {}
    async with Run(p, "measure") as r:
        t_ready = await r.goto()
        n_ready = r.mark()
        await r.idle(3000, 30000)
        out["a_ready_s"] = t_ready
        out["a_until_ready"] = summarise(r.log[:n_ready])
        out["a_first_load"] = summarise(r.log)
        out["a_shot"] = await r.shot("a_first_load")
        m = r.mark()
        t = time.time()
        await r.pg.mouse.click(1000, 450)
        await r.pg.wait_for_function(CARD_DONE, timeout=30000)
        out["b_card_s"] = round(time.time() - t, 2)
        await r.idle(1500)
        out["b_select_place"] = summarise(r.log[m:])
        out["b_shot"] = await r.shot("b_place")
        out["c"] = {}
        for k in ["radar", "build", "water", "ground"]:
            m = r.mark()
            await r.pg.click(f"#lenses [data-lens={k}]")
            await r.idle(1000)
            out["c"][f"lens_{k}"] = summarise(r.log[m:])
        # radar view: walk the L-band years on the time line
        await r.pg.click("#lenses [data-lens=radar]")
        await r.idle(500)
        years = await r.pg.evaluate("() => [...document.querySelectorAll('#tl-ticks [data-y], #tl-ticks span')].map(e => e.textContent.trim())")
        out["c"]["timeline_ticks"] = years
        for y in [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2026]:
            m = r.mark()
            await r.pg.evaluate("(y) => { const s = document.querySelector('#year'); s.value = y; s.dispatchEvent(new Event('input', {bubbles:true})); s.dispatchEvent(new Event('change', {bubbles:true})); }", y)
            await r.idle(800)
            out["c"][f"radar_year_{y}"] = summarise(r.log[m:])
        # expert drawer: switch on each radar layer one by one
        await r.pg.click("#menu-btn")
        await r.pg.wait_for_timeout(300)
        await r.pg.locator("#expert-sw").evaluate("(el) => el.click()")
        await r.pg.wait_for_timeout(300)
        for k in ["s1rgb", "sarchange", "sarwet", "sarwater", "nisarwet", "nisar", "egms", "alos", "dem", "radar", "activity", "wuia"]:
            loc = r.pg.locator(f"#sw-{k}")
            if not await loc.count():
                out["c"][f"layer_{k}"] = "missing"
                continue
            m = r.mark()
            await loc.evaluate("(el) => { if (!el.checked) el.click(); }")
            await r.idle(1500)
            out["c"][f"layer_{k}"] = summarise(r.log[m:])
        out["c_shot"] = await r.shot("c_all_layers")
        out["session_total"] = summarise(r.log)
        out["failed"] = r.failed[:20]
        out["console"] = r.console[:20]
    RES["measure"] = out


async def mobile(p):
    """phone on throttled mobile data against the real Firebase hosting (brotli): time to first card, to a place card"""
    out = {}
    for label, down_mbps, lat_ms in [("fast4g_9mbps", 9, 60), ("slow4g_1.6mbps", 1.6, 150)]:
        async with Run(p, f"mobile_{label}", viewport=(390, 844), url=REMOTE) as r:
            cdp = await r.ctx.new_cdp_session(r.pg)
            await cdp.send("Network.enable")
            await cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": lat_ms,
                           "downloadThroughput": down_mbps * 1e6 / 8, "uploadThroughput": 0.75e6 / 8})
            enc = {"total": 0}
            cdp.on("Network.loadingFinished", lambda e: enc.__setitem__("total", enc["total"] + e.get("encodedDataLength", 0)))
            try:
                t_ready = await r.goto(timeout=180000)
            except Exception as e:
                t_ready = f"timeout {e.__class__.__name__}"
            shot1 = await r.shot("ready")
            t = time.time()
            try:
                await r.pg.mouse.click(195, 300)
                await r.pg.wait_for_function(CARD_DONE, timeout=180000)
                t_card = round(time.time() - t, 2)
            except Exception as e:
                t_card = f"timeout {e.__class__.__name__}"
            shot2 = await r.shot("card")
            out[label] = {"ready_s": t_ready, "card_after_tap_s": t_card, "encoded_bytes_session": enc["total"],
                          "requests": len(r.log), "shots": [shot1, shot2]}
    RES["mobile"] = out


async def fail_sar(p):
    out = {}
    async with Run(p, "fail_sar_abort", routes=[("**/data/land/sar.json*", abort)]) as r:
        out["abort_ready_s"] = await r.goto()
        await r.idle(1500)
        out["abort_lenses"] = await r.pg.eval_on_selector_all("#lenses [data-lens]", "els => els.map(e => e.dataset.lens)")
        out["abort_radar_btn_hidden"] = await r.pg.eval_on_selector("#radar-btn", "e => e.hidden")
        out["abort_card"] = await r.card()
        out["abort_shot"] = await r.shot("abort")
        out["console"] = r.console[:8]
    async with Run(p, "fail_sar_delay8s", routes=[("**/data/land/sar.json*", delayed(8))]) as r:
        await r.pg.goto(APP, wait_until="domcontentloaded")
        await r.pg.wait_for_timeout(3000)
        out["delay_at3s_card"] = await r.card()
        out["delay_at3s_shot"] = await r.shot("at3s")
        t = time.time()
        await r.pg.wait_for_function(READY, timeout=30000)
        out["delay_ready_after_3s_plus"] = round(time.time() - t, 2)
    RES["fail_sar"] = out


async def fail_png(p):
    out = {}
    async with Run(p, "fail_png_abort", routes=[("**/data/land/sar_change.png*", abort)]) as r:
        await r.goto()
        await r.idle(1500)
        await r.pg.click("#lenses [data-lens=build]")
        await r.idle(1500)
        out["build_lens_legend"] = (await r.pg.inner_text("#legend"))[:300]
        out["build_lens_shot"] = await r.shot("build_lens")
        await r.pg.mouse.click(1000, 450)
        await r.pg.wait_for_timeout(12000)
        out["card_after_12s"] = await r.card()
        out["card_done"] = await r.pg.evaluate(CARD_DONE)
        out["card_shot"] = await r.shot("card_12s")
        out["console"] = r.console[:8]
    async with Run(p, "fail_png_delay", routes=[("**/data/land/sar_series.png*", delayed(10))]) as r:
        await r.goto()
        await r.pg.mouse.click(1000, 450)
        t = time.time()
        await r.pg.wait_for_timeout(4000)
        out["delay_card_at4s"] = await r.card()
        await r.pg.wait_for_function(CARD_DONE, timeout=30000)
        out["delay_card_ready_s"] = round(time.time() - t, 2)
    RES["fail_png"] = out


async def fail_core(p):
    out = {}
    async with Run(p, "fail_study_404", routes=[("**/data/study.json*", lambda r: asyncio.ensure_future(r.fulfill(status=404, body="nf")))]) as r:
        await r.goto(wait_ready=False)
        await r.pg.wait_for_timeout(4000)
        out["study_404_card"] = await r.card()
        out["study_404_lang"] = await r.pg.evaluate("document.documentElement.lang")
        out["study_404_shot"] = await r.shot("card")
    async with Run(p, "fail_leaflet_cdn", routes=[("**/cdnjs.cloudflare.com/ajax/libs/leaflet/**", abort)]) as r:
        await r.goto(wait_ready=False)
        await r.pg.wait_for_timeout(4000)
        out["leaflet_card"] = await r.card()
        out["leaflet_console"] = r.console[:5]
        out["leaflet_shot"] = await r.shot("page")
    async with Run(p, "fail_maplibre_cdn", routes=[("**/cdn.jsdelivr.net/npm/**", abort)]) as r:
        try:
            out["maplibre_ready_s"] = await r.goto(timeout=15000)
        except Exception as e:
            out["maplibre_ready_s"] = f"timeout {e.__class__.__name__}"
        await r.idle(2000)
        out["maplibre_hosts"] = list(summarise(r.log)["external_by_host"].keys())
        out["maplibre_console"] = r.console[:5]
        out["maplibre_shot"] = await r.shot("page")
    async with Run(p, "fail_wuia", routes=[("**/data/wuia_decyzje.geojson*", abort)]) as r:
        await r.goto()
        await r.pg.click("#menu-btn")
        await r.pg.locator("#expert-sw").evaluate("(el) => el.click()")
        await r.pg.wait_for_timeout(300)
        await r.pg.locator("#sw-wuia").evaluate("(el) => el.click()")
        await r.pg.wait_for_timeout(1500)
        out["wuia_checked"] = await r.pg.eval_on_selector("#sw-wuia", "e => e.checked")
        out["wuia_legend"] = (await r.pg.inner_text("#legend"))[:300]
        out["wuia_console"] = r.console[:5]
        out["wuia_shot"] = await r.shot("drawer")
    RES["fail_core"] = out


async def fail_external(p):
    out = {}
    async with Run(p, "fail_ofm_style", routes=[("**/tiles.openfreemap.org/styles/**", abort)]) as r:
        out["style_abort_ready_s"] = await r.goto()
        await r.idle(2500)
        out["style_abort_hosts"] = list(summarise(r.log)["external_by_host"].keys())
        out["style_abort_shot"] = await r.shot("page")
    async with Run(p, "fail_ofm_hang", routes=[("**/tiles.openfreemap.org/styles/**", delayed(25))]) as r:
        await r.pg.goto(APP, wait_until="domcontentloaded")
        await r.pg.wait_for_timeout(10000)
        out["style_hang_card_at10s"] = await r.card()
        out["style_hang_lenses_at10s"] = await r.pg.eval_on_selector_all("#lenses [data-lens]", "els => els.length")
        out["style_hang_shot"] = await r.shot("at10s")
        t = time.time()
        try:
            await r.pg.wait_for_function(READY, timeout=40000)
            out["style_hang_ready_after_10s_plus"] = round(time.time() - t, 2)
        except Exception:
            out["style_hang_ready_after_10s_plus"] = "never"
    async with Run(p, "fail_ofm_tiles", routes=[("**/tiles.openfreemap.org/**", lambda rt: asyncio.ensure_future(rt.continue_() if "/styles/" in rt.request.url else rt.abort("failed")))]) as r:
        await r.goto()
        await r.idle(2500)
        out["tiles_abort_shot"] = await r.shot("page")
        out["tiles_abort_failed"] = len(r.failed)
    async with Run(p, "fail_gibs", routes=[("**/gibs.earthdata.nasa.gov/**", abort)]) as r:
        await r.goto()
        await r.pg.click("#menu-btn")
        await r.pg.locator("#expert-sw").evaluate("(el) => el.click()")
        await r.pg.wait_for_timeout(300)
        await r.pg.locator("#sw-nisar").evaluate("(el) => el.click()")
        await r.idle(2500)
        out["gibs_failed"] = len([f for f in r.failed if "gibs" in f["url"]])
        out["gibs_legend"] = (await r.pg.inner_text("#legend"))[:300]
        out["gibs_shot"] = await r.shot("nisar_on")
    async with Run(p, "fail_wms", routes=[("**/wms2.geopoz.poznan.pl/**", abort), ("**/mapy.geoportal.gov.pl/**", abort)]) as r:
        await r.goto()
        await r.pg.click("#menu-btn")
        await r.pg.click("[data-base=poz2025]")
        await r.pg.click("#drawer-close")
        await r.idle(2500)
        out["wms_failed"] = len(r.failed)
        out["wms_shot"] = await r.shot("poz2025")
    async with Run(p, "fail_nominatim", stub_geo=False, routes=[("**/nominatim.openstreetmap.org/**", abort)]) as r:
        await r.goto()
        await r.pg.fill("#q", "Półwiejska 2")
        await r.pg.wait_for_timeout(2000)
        out["nominatim_suggest_hidden"] = await r.pg.eval_on_selector("#suggest", "e => e.hidden")
        out["nominatim_search_shot"] = await r.shot("search")
        await r.pg.keyboard.press("Enter")
        await r.pg.wait_for_timeout(1000)
        out["nominatim_enter_card"] = (await r.card())[:150]
        await r.pg.mouse.click(1000, 450)
        await r.pg.wait_for_function(CARD_DONE, timeout=30000)
        await r.pg.wait_for_timeout(1500)
        out["nominatim_reverse_title"] = await r.pg.inner_text("#sidecard h2")
        out["nominatim_card_shot"] = await r.shot("card")
    async with Run(p, "fail_nominatim_slow", stub_geo=False, routes=[("**/nominatim.openstreetmap.org/**", delayed(20))]) as r:
        await r.goto()
        await r.pg.mouse.click(1000, 450)
        await r.pg.wait_for_function(CARD_DONE, timeout=30000)
        await r.pg.wait_for_timeout(1000)
        out["nominatim_slow_title_1s"] = await r.pg.inner_text("#sidecard h2")
    RES["fail_external"] = out


CHECKS = {"measure": measure, "mobile": mobile, "fail_sar": fail_sar, "fail_png": fail_png,
          "fail_core": fail_core, "fail_external": fail_external}


async def main():
    names = sys.argv[1:] or list(CHECKS)
    async with async_playwright() as p:
        for n in names:
            try:
                await CHECKS[n](p)
            except Exception as e:
                RES.setdefault(n, {})["error"] = f"{e.__class__.__name__}: {e}"[:500]
            (OUT / f"results_{n}.json").write_text(json.dumps(RES.get(n), indent=1, ensure_ascii=False))
            print(n, "done", file=sys.stderr)
    print(json.dumps(RES, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
