"""Contract test of the SARnik extension core in a real browser (docs/planwyd/KONTRAKT.md, section 9).

The example module (docs/planwyd/kontrakt/example_module.js) is served as sarnik/example.js and switched on
through a stubbed manifest; its service (https://example.invalid/) is stubbed per scenario.

Run from the repository root:
    poznan-trend-detective/.venv/bin/python poznan-trend-detective/tests/sarnik/core_contract.py
Needs the Python package playwright and Google Chrome (or CHANNEL= with `python -m playwright install chromium`).
"""
import asyncio
import json
import os
import re
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]          # poznan-trend-detective/
WEB = ROOT / "web"
EXAMPLE = (ROOT.parent / "docs" / "planwyd" / "kontrakt" / "example_module.js").read_text(encoding="utf-8")
PORT = int(os.environ.get("PORT", "8761"))
BASE = f"http://127.0.0.1:{PORT}/"
PLACE = "#52.40220,16.94530"                       # central Poznań
CHANNEL = os.environ.get("CHANNEL", "chrome") or None
TITLE_PL, TITLE_EN = "Przykład (test kontraktu)", "Example (contract test)"
MANIFEST_EXAMPLE = 'window.SARNIK_MODULES = ["example"];'
THROWING = """(function () { const SK = window.SARNIK; if (!SK) return;
  SK.register("example", { checks() { throw new Error("test: checks throws"); }, cardTop() { throw new Error("test: cardTop throws"); } });
})();"""
GEOCODE = {"display_name": "Plac testowy, Poznań", "address": {"road": "Plac testowy", "house_number": "1", "city": "Poznań"}}

failed = 0


def check(name, ok, detail=""):
    global failed
    print(("OK   " if ok else "BŁĄD ") + name + ("" if ok else f" -> {detail}"))
    if not ok:
        failed += 1


def start_server():
    proc = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=WEB,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", PORT)) == 0:
                return proc
        time.sleep(0.1)
    proc.terminate()
    raise RuntimeError(f"port {PORT} did not open")


async def open_page(browser, manifest=None, module=EXAMPLE, service="ok", expert=False, lang="pl"):
    """New page with the place card open. service: ok (answers after 1.5 s), fail, hang."""
    ctx = await browser.new_context(viewport={"width": 1440, "height": 900}, locale="pl-PL")
    await ctx.add_init_script(f"try {{ localStorage.setItem('ptd-lang', '{lang}'); localStorage.setItem('ptd-expert', '{'1' if expert else '0'}'); }} catch (e) {{}}")
    page = await ctx.new_page()
    log = {"warn": [], "error": [], "pageerror": [], "service": 0}
    def on_console(m):
        if m.type == "warning":
            log["warn"].append(m.text)
        elif m.type == "error":
            log["error"].append(m.text)

    page.on("console", on_console)
    page.on("pageerror", lambda e: log["pageerror"].append(str(e)))

    async def geocoder(route):
        await route.fulfill(status=200, content_type="application/json", body=json.dumps(GEOCODE))

    async def svc(route):
        log["service"] += 1
        if service == "ok":
            await asyncio.sleep(1.5)
            await route.fulfill(status=200, content_type="text/plain", body="value=7.25",
                                headers={"Access-Control-Allow-Origin": "*"})
        elif service == "fail":
            await route.abort()
        # "hang": never answer; the core's timeout must end the wait

    await page.route("**/nominatim.openstreetmap.org/**", geocoder)
    await page.route("https://example.invalid/**", svc)
    if manifest is not None:
        await page.route("**/sarnik/manifest.js*", lambda r: r.fulfill(status=200, content_type="text/javascript", body=manifest))
        await page.route("**/sarnik/example.js*", lambda r: r.fulfill(status=200, content_type="text/javascript", body=module))
    await page.goto(BASE + PLACE)
    await page.wait_for_selector("#sidecard .verdict", timeout=90000)
    return ctx, page, log


async def count_flags(page):
    txt = await page.locator("#sidecard .vd-n").inner_text()
    m = re.search(r"\d+", txt)
    return int(m.group()) if m else 0


async def row(page, title):
    return page.locator("#sidecard li.pl", has_text=title)


async def main():
    server = start_server()
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(channel=CHANNEL, headless=True,
                                              args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])

            # 1. success: pending row first, then a warning; header counts it only once it is a warning
            ctx, page, log = await open_page(browser, manifest=MANIFEST_EXAMPLE)
            r = await row(page, TITLE_PL)
            await r.wait_for(timeout=5000)
            cls = await r.get_attribute("class")
            n0 = await count_flags(page)
            check("wiersz modułu najpierw w toku (info, „sprawdzam…”)", "pl-pending" in cls and "pl-info" in cls
                  and "sprawdzam" in (await r.inner_text()), cls)
            await page.locator("#sidecard li.pl.pl-warn", has_text=TITLE_PL).wait_for(timeout=8000)
            r = await row(page, TITLE_PL)
            n1 = await count_flags(page)
            check("po odpowiedzi wiersz ma poziom warn i liczbę z przecinkiem", re.search(r"7,[23]", await r.inner_text()) is not None,
                  await r.inner_text())
            check("nagłówek nie liczy wiersza w toku, a liczy ostrzeżenie", n1 == n0 + 1, f"{n0} -> {n1}")
            in_other = await r.evaluate("li => !li.closest('ul').previousElementSibling.classList.contains('is-sar')")
            check("wiersz w grupie „tło z innych źródeł” (sar = no)", in_other)
            check("źródło wiersza w osobnej linii", (await r.locator(".pl-src").inner_text()).strip() == "usługa przykładowa")
            await page.wait_for_timeout(2500)  # reverse geocoding and other redraws must not repeat the request
            check("jedno zapytanie na wybór miejsca", log["service"] == 1, str(log["service"]))
            # the language switch sits in a collapsed menu at this size, so press it the way the app wires it
            await page.evaluate("document.querySelector('.lang button[data-lang=\"en\"]').click()")
            await page.wait_for_timeout(300)
            check("po zmianie języka tekst wiersza po angielsku", await (await row(page, TITLE_EN)).count() == 1)
            check("brak błędów strony", not log["pageerror"], "; ".join(log["pageerror"]))
            await ctx.close()

            # 2. expert mode: the plain check-up and the module row stay visible
            ctx, page, log = await open_page(browser, manifest=MANIFEST_EXAMPLE, expert=True)
            await page.locator("#sidecard li.pl.pl-warn", has_text=TITLE_PL).wait_for(timeout=8000)
            check("tryb ekspercki: wiersz modułu widoczny", await (await row(page, TITLE_PL)).is_visible())
            await ctx.close()

            # 3. service error: info row, the card still renders
            ctx, page, log = await open_page(browser, manifest=MANIFEST_EXAMPLE, service="fail")
            await page.locator("#sidecard li.pl.pl-info:not(.pl-pending)", has_text=TITLE_PL).wait_for(timeout=8000)
            check("błąd usługi: wiersz info z uczciwym tekstem", "nie odpowiedziała" in await (await row(page, TITLE_PL)).inner_text())
            check("błąd usługi: reszta karty działa", await page.locator("#sidecard li.pl").count() > 1)
            await ctx.close()

            # 4. service never answers: info row after the module's 6 s timeout
            ctx, page, log = await open_page(browser, manifest=MANIFEST_EXAMPLE, service="hang")
            t0 = time.time()
            await page.locator("#sidecard li.pl.pl-info:not(.pl-pending)", has_text=TITLE_PL).wait_for(timeout=12000)
            check("brak odpowiedzi: po limicie czasu wiersz info", "nie odpowiedziała" in await (await row(page, TITLE_PL)).inner_text(),
                  f"{time.time() - t0:.1f} s")
            await ctx.close()

            # 5. a module that throws: the card renders, a warning is logged
            ctx, page, log = await open_page(browser, manifest=MANIFEST_EXAMPLE, module=THROWING)
            await page.wait_for_timeout(1500)
            check("wyjątek w module nie psuje karty", await page.locator("#sidecard li.pl").count() > 1 and not log["pageerror"],
                  "; ".join(log["pageerror"]))
            check("wyjątek w module trafia do console.warn", any("SARnik module example" in w for w in log["warn"]), "; ".join(log["warn"]))
            await ctx.close()

            # 6. the real (empty) manifest: no module rows, no errors
            ctx, page, log = await open_page(browser)
            await page.wait_for_timeout(1500)
            state = await page.evaluate("({ v: window.SARNIK && window.SARNIK.version, n: Object.keys(window.SARNIK.modules).length, list: window.SARNIK_MODULES })")
            check("pusty manifest: rdzeń istnieje, brak modułów", state["v"] == 1 and state["n"] == 0 and state["list"] == [], json.dumps(state))
            check("pusty manifest: brak wiersza przykładowego", await (await row(page, TITLE_PL)).count() == 0)
            card = await page.locator("#sidecard").inner_text()
            check("pusty manifest: w karcie nie ma undefined/NaN", re.search(r"undefined|NaN|\[object", card) is None)
            check("pusty manifest: brak błędów strony", not log["pageerror"], "; ".join(log["pageerror"]))
            await ctx.close()
            await browser.close()
    finally:
        server.terminate()
    print("\nNIE PRZESZŁO: %d" % failed if failed else "\nWszystkie testy rdzenia przeszły.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
