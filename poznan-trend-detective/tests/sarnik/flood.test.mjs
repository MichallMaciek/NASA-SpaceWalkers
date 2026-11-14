// Test modułu flood (ISOK - strefa powodziowa)
// Uruchomienie: node poznan-trend-detective/tests/sarnik/flood.test.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCore, loadModule } from "../../../docs/planwyd/kontrakt/fake_core.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleFile = path.resolve(here, "../../web/sarnik/flood.js");
const fixturesDir = path.resolve(here, "fixtures");

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log((ok ? "OK   " : "BŁĄD ") + name + (ok ? "" : " -> " + detail));
  if (!ok) failed++;
};

const point = (lat = 52.4022, lng = 16.9453) => ({
  kind: "point",
  lat,
  lng,
  ring: [],
  area: "Poznań",
  cells: [1, 2, 3],
});

const area = (lat = 52.4022, lng = 16.9453) => ({
  kind: "area",
  lat,
  lng,
  ring: [
    [52.401, 16.944],
    [52.403, 16.944],
    [52.403, 16.946],
    [52.401, 16.946],
  ],
  area: "Poznań",
  cells: [1, 2, 3],
});

const fixtureRocha = fs.readFileSync(path.join(fixturesDir, "isok_rocha.txt"), "utf8");
const fixtureQ02 = fs.readFileSync(path.join(fixturesDir, "isok_q02.txt"), "utf8");
const fixtureNoFeatures = fs.readFileSync(path.join(fixturesDir, "isok_nofeatures.txt"), "utf8");

console.log("=== TESTY MODUŁU FLOOD ===");

// 1. Czyste funkcje: parse i buildUrl
{
  const core = createCore();
  loadModule(moduleFile, core);
  const pure = core.SARNIK.modules.flood.pure;
  check("pure.buildUrl zwraca poprawny WMS GetFeatureInfo URL", typeof pure.buildUrl === "function");
  const url = pure.buildUrl(52.4022, 16.9453);
  check("URL zawiera warstwę NZ.Fluvial", url.includes("LAYERS=NZ.Fluvial"));
  check("URL zawiera format text/plain", url.includes("INFO_FORMAT=text%2Fplain") || url.includes("INFO_FORMAT=text/plain"));
  check("URL zawiera CRS:84", url.includes("CRS=CRS%3A84") || url.includes("CRS=CRS:84"));

  const parseRocha = pure.parse(fixtureRocha);
  check("parse fixture Rocha -> level risk", parseRocha.level === "risk");
  check("parse fixture Rocha -> hasQ10 i hasQ1", parseRocha.hasQ10 && parseRocha.hasQ1);

  const parseQ02 = pure.parse(fixtureQ02);
  check("parse fixture Q02 -> level warn", parseQ02.level === "warn");
  check("parse fixture Q02 -> hasQ02", parseQ02.hasQ02 && !parseQ02.hasQ10);

  const parseEmpty = pure.parse(fixtureNoFeatures);
  check("parse fixture nofeatures -> level ok", parseEmpty.level === "ok" && !parseEmpty.found);

  const parseError = pure.parse("Random error text or empty");
  check("parse invalid text -> level info", parseError.level === "info");
}

// 2. Sukces dla Most Rocha (strefa powodziowa Q 10% / Q 1% -> risk)
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, {
    fetch: async () => ({ ok: true, status: 200, text: async () => fixtureRocha }),
  });

  const sel = core.select(point());
  const before = core.items(sel);
  check("wiersz w toku ma pending: true i lvl: info", before.length === 1 && before[0].pending && before[0].lvl === "info");

  await core.settle();
  const after = core.items(sel);
  check("po odpowiedzi wiersz ma lvl: risk", after.length === 1 && after[0].lvl === "risk" && !after[0].pending);
  check("wiersz wskazuje grupę sar: 'no'", after[0].sar === "no");
  check("wiersz zawiera opis Q 10% i Q 1%", after[0].v.includes("Q 10%") && after[0].v.includes("Q 1%"));
  check("id wiersza to flood:hazard", after[0].id === "flood:hazard");
  check("brak naruszeń kontraktu", core.problems(before.concat(after)).length === 0, core.problems(before.concat(after)).join("; "));
  check("nagłówek ostrzeżeń liczy 1", core.flags(after) === 1);

  // Zmiana języka na angielski
  core.setLang("en");
  const enItems = core.items(sel);
  check("wersja angielska ma tytuł po angielsku", enItems[0].t.includes("Flood hazard zone"));
  check("brak naruszeń kontraktu w wersji angielskiej", core.problems(enItems).length === 0, core.problems(enItems).join("; "));
}

// 3. Poziom warn (tylko scenariusz Q 0,2%)
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, {
    fetch: async () => ({ ok: true, status: 200, text: async () => fixtureQ02 }),
  });

  const sel = core.select(point());
  await core.settle();
  const items = core.items(sel);
  check("scenariusz Q 0,2% daje lvl: warn", items.length === 1 && items[0].lvl === "warn");
  check("nagłówek ostrzeżeń liczy 1 dla warn", core.flags(items) === 1);
  check("treść wymienia Q 0,2%", items[0].v.includes("Q 0,2%"));
  check("brak naruszeń kontraktu", core.problems(items).length === 0);
}

// 4. Poziom ok (brak strefy - no features were found)
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, {
    fetch: async () => ({ ok: true, status: 200, text: async () => fixtureNoFeatures }),
  });

  const sel = core.select(point(52.4083, 16.9340));
  await core.settle();
  const items = core.items(sel);
  check("brak cech daje lvl: ok", items.length === 1 && items[0].lvl === "ok");
  check("nagłówek ostrzeżeń liczy 0 dla ok", core.flags(items) === 0);
  check("brak naruszeń kontraktu", core.problems(items).length === 0);
}

// 5. Błąd usługi (network error / HTTP 500) -> lvl: info
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, {
    fetch: async () => {
      throw new Error("Błąd sieci WMS");
    },
  });

  const sel = core.select(point());
  await core.settle();
  const items = core.items(sel);
  check("błąd usługi daje lvl: info", items.length === 1 && items[0].lvl === "info");
  check("wiersz zawiera link do Hydroportalu", items[0].v.includes("Hydroportal"));
  check("nagłówek ostrzeżeń liczy 0 dla info", core.flags(items) === 0);
  check("brak naruszeń kontraktu", core.problems(items).length === 0);
}

// 6. Timeout zapytania (> 6000 ms)
{
  const core = createCore({ lang: "pl" });
  let aborted = false;
  loadModule(moduleFile, core, {
    fetch: (url, o) =>
      new Promise((resolve, reject) => {
        o.signal.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("aborted"));
        });
      }),
  });

  const sel = core.select(point());
  // Wymuszenie fetchOnce z krótkim timeoutem dla celów testu jednostkowego
  delete sel.ext.flood;
  core.ctx.fetchOnce(
    sel,
    "flood",
    (signal) =>
      new Promise((resolve, reject) =>
        signal.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("abort"));
        })
      ),
    30
  );

  await core.settle();
  const items = core.items(sel);
  check("po przekroczeniu czasu stan to timeout", sel.ext.flood.st === "timeout" && aborted);
  check("po przekroczeniu czasu lvl to info", items[0].lvl === "info");
  check("brak naruszeń kontraktu", core.problems(items).length === 0);
}

// 7. Zaznaczony obszar (kind: 'area')
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, {
    fetch: async () => ({ ok: true, status: 200, text: async () => fixtureRocha }),
  });

  const sel = core.select(area());
  await core.settle();
  const items = core.items(sel);
  check("dla obszaru treść zawiera adnotację o środku", items[0].v.includes("środka"));
  check("brak naruszeń kontraktu", core.problems(items).length === 0);
}

// 8. Test żywego zapytania sieciowego dla Most Rocha
{
  const core = createCore({ lang: "pl" });
  // Używamy globalnego fetch ze środowiska Node (dostępny od Node 18+)
  loadModule(moduleFile, core, { fetch: globalThis.fetch });
  const pure = core.SARNIK.modules.flood.pure;
  const rochaUrl = pure.buildUrl(52.4022, 16.9453);
  try {
    const resp = await globalThis.fetch(rochaUrl, {
      headers: { Origin: "https://poznan-trend-detective.web.app" },
    });
    check("żywe zapytanie ISOK status 200", resp.status === 200);
    const body = await resp.text();
    const parsed = pure.parse(body);
    check("żywe zapytanie ISOK dla Most Rocha rozpoznaje strefę powodziową", parsed.level === "risk");
  } catch (e) {
    console.warn("Uwaga: test żywej sieci pominięty lub nieudany:", e.message);
  }
}

console.log(failed ? `\nFLOOD TESTY: NIE PRZESZŁO ${failed}` : "\nWszystkie testy modułu flood przeszły pomyślnie.");
process.exitCode = failed ? 1 : 0;

