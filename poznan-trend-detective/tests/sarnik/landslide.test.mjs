// Test modułu landslide (SOPO - osuwiska i tereny zagrożone)
// Uruchomienie: node poznan-trend-detective/tests/sarnik/landslide.test.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCore, loadModule } from "../../../docs/planwyd/kontrakt/fake_core.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleFile = path.resolve(here, "../../web/sarnik/landslide.js");
const fixturesDir = path.resolve(here, "fixtures");

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log((ok ? "OK   " : "BŁĄD ") + name + (ok ? "" : " -> " + detail));
  if (!ok) failed++;
};

const point = (lat = 52.36144, lng = 16.92582) => ({
  kind: "point",
  lat,
  lng,
  ring: [],
  area: "Poznań",
  cells: [1, 2, 3],
});

const area = (lat = 52.36144, lng = 16.92582) => ({
  kind: "area",
  lat,
  lng,
  ring: [
    [52.360, 16.924],
    [52.362, 16.924],
    [52.362, 16.927],
    [52.360, 16.927],
  ],
  area: "Poznań",
  cells: [1, 2, 3],
});

const fixtureLandslide = fs.readFileSync(path.join(fixturesDir, "sopo_landslide.json"), "utf8");
const fixtureRisk = fs.readFileSync(path.join(fixturesDir, "sopo_risk.json"), "utf8");
const fixtureEmpty = fs.readFileSync(path.join(fixturesDir, "sopo_empty.json"), "utf8");

console.log("=== TESTY MODUŁU LANDSLIDE ===");

// 1. Czyste funkcje: interpret, buildUrl, progi
{
  const core = createCore();
  loadModule(moduleFile, core);
  const pure = core.SARNIK.modules.landslide.pure;

  check("pure.buildUrl zwraca poprawny URL ArcGIS identify", typeof pure.buildUrl === "function");
  const url = pure.buildUrl(52.4022, 16.9453);
  check("URL zawiera layers=all", url.includes("layers=all"));
  check("URL zawiera tolerance=270", url.includes("tolerance=270"));
  check("URL zawiera f=json", url.includes("f=json"));
  check("URL zawiera returnGeometry=true", url.includes("returnGeometry=true"));

  check("progi odległości są zdefiniowane", pure.RISK_DISTANCE_M === 100 && pure.WARN_DISTANCE_M === 300);

  // Interpretacja fixtury osuwiska z domyślną odległością (<100m)
  const interpLandslide = pure.interpret(fixtureLandslide, 52.36144, 16.92582);
  check("interpretacja osuwiska (< 100m) daje level risk", interpLandslide.level === "risk");
  check("obiekt zawiera numer identyfikacyjny 84299", interpLandslide.feature && interpLandslide.feature.id === "84299");
  check("obiekt zawiera stopień aktywności", interpLandslide.feature && typeof interpLandslide.feature.activity === "string");

  // Interpretacja osuwiska w strefie 100-300m (distOverride = 200)
  const interpLandslideWarn = pure.interpret(fixtureLandslide, 52.36144, 16.92582, 200);
  check("interpretacja osuwiska (200m) daje level warn", interpLandslideWarn.level === "warn");
  check("pasmo odległości to 100–300 m", interpLandslideWarn.distanceBand === "100–300 m");

  // Interpretacja osuwiska poza 300m (distOverride = 450)
  const interpLandslideOk = pure.interpret(fixtureLandslide, 52.36144, 16.92582, 450);
  check("interpretacja osuwiska (> 300m) daje level ok", interpLandslideOk.level === "ok");

  // Interpretacja terenu zagrożonego (layer 12)
  const interpRisk = pure.interpret(fixtureRisk, 52.38624, 16.93919);
  check("interpretacja terenu zagrożonego daje level warn", interpRisk.level === "warn");
  check("obiekt terenu zagrożonego ma ID 11192", interpRisk.feature && interpRisk.feature.id === "11192");

  // Pusty wynik
  const interpEmpty = pure.interpret(fixtureEmpty, 52.4022, 16.9453);
  check("pusta odpowiedź daje level ok", interpEmpty.level === "ok");

  // Błędny format lub error API
  const interpError = pure.interpret('{"error": {"code": 400}}');
  check("odpowiedź z błędem daje level info", interpError.level === "info");
}

// 2. Cykl w aplikacji z fixturą osuwiska (poziom risk)
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, {
    fetch: async () => ({
      ok: true,
      status: 200,
      text: async () => fixtureLandslide,
    }),
  });

  const sel = core.select(point());
  const before = core.items(sel);
  check("wiersz w toku ma pending: true i lvl: info", before.length === 1 && before[0].pending && before[0].lvl === "info");

  await core.settle();
  const after = core.items(sel);
  check("po odpowiedzi wiersz ma lvl: risk", after.length === 1 && after[0].lvl === "risk" && !after[0].pending);
  check("wiersz wskazuje grupę sar: 'no'", after[0].sar === "no");
  check("wiersz zawiera słowo 'osuwisko'", after[0].v.includes("osuwisko"));
  check("id wiersza to landslide:hazard", after[0].id === "landslide:hazard");
  check("nagłówek ostrzeżeń liczy 1", core.flags(after) === 1);
  check("brak naruszeń kontraktu", core.problems(before.concat(after)).length === 0, core.problems(before.concat(after)).join("; "));

  // Zmiana języka na angielski
  core.setLang("en");
  const enItems = core.items(sel);
  check("wersja angielska ma tytuł po angielsku", enItems[0].t.includes("Landslides"));
  check("wersja angielska zawiera 'landslide'", enItems[0].v.includes("landslide"));
  check("brak naruszeń kontraktu w wersji angielskiej", core.problems(enItems).length === 0, core.problems(enItems).join("; "));
}

// 3. Poziom warn (teren zagrożony z fixtury sopo_risk.json)
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, {
    fetch: async () => ({
      ok: true,
      status: 200,
      text: async () => fixtureRisk,
    }),
  });

  const sel = core.select(point(52.38624, 16.93919));
  await core.settle();
  const items = core.items(sel);
  check("teren zagrożony daje lvl: warn", items.length === 1 && items[0].lvl === "warn");
  check("nagłówek ostrzeżeń liczy 1 dla warn", core.flags(items) === 1);
  check("treść wymienia teren zagrożony", items[0].v.includes("teren") && items[0].v.includes("zagrożon"));
  check("brak naruszeń kontraktu", core.problems(items).length === 0);
}

// 4. Poziom ok (brak osuwisk z fixtury sopo_empty.json)
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, {
    fetch: async () => ({
      ok: true,
      status: 200,
      text: async () => fixtureEmpty,
    }),
  });

  const sel = core.select(point(52.4083, 16.9340));
  await core.settle();
  const items = core.items(sel);
  check("brak obiektów daje lvl: ok", items.length === 1 && items[0].lvl === "ok");
  check("nagłówek ostrzeżeń liczy 0 dla ok", core.flags(items) === 0);
  check("tekst zaznacza brak gwarancji stateczności stoku", items[0].v.includes("stok"));
  check("brak naruszeń kontraktu", core.problems(items).length === 0);
}

// 5. Błąd usługi -> lvl: info
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, {
    fetch: async () => {
      throw new Error("Błąd połączenia z bazą PIG-PIB");
    },
  });

  const sel = core.select(point());
  await core.settle();
  const items = core.items(sel);
  check("błąd usługi daje lvl: info", items.length === 1 && items[0].lvl === "info");
  check("wiersz zawiera link do SOPO", items[0].v.includes("osuwiska.pgi.gov.pl"));
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
  delete sel.ext.landslide;
  core.ctx.fetchOnce(
    sel,
    "landslide",
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
  check("po przekroczeniu czasu stan to timeout", sel.ext.landslide.st === "timeout" && aborted);
  check("po przekroczeniu czasu lvl to info", items[0].lvl === "info");
  check("brak naruszeń kontraktu", core.problems(items).length === 0);
}

// 7. Zaznaczony obszar (kind: 'area')
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, {
    fetch: async () => ({
      ok: true,
      status: 200,
      text: async () => fixtureLandslide,
    }),
  });

  const sel = core.select(area());
  await core.settle();
  const items = core.items(sel);
  check("dla obszaru treść zawiera adnotację o środku", items[0].v.includes("środka"));
  check("brak naruszeń kontraktu", core.problems(items).length === 0);
}

// 8. Test żywego zapytania sieciowego do serwera PIG-PIB SOPO
{
  const core = createCore({ lang: "pl" });
  loadModule(moduleFile, core, { fetch: globalThis.fetch });
  const pure = core.SARNIK.modules.landslide.pure;
  const rochaUrl = pure.buildUrl(52.4022, 16.9453);
  try {
    const resp = await globalThis.fetch(rochaUrl, {
      headers: { Origin: "https://poznan-trend-detective.web.app" },
    });
    check("żywe zapytanie SOPO status 200", resp.status === 200);
    const body = await resp.text();
    const parsed = pure.interpret(body, 52.4022, 16.9453);
    check("żywe zapytanie SOPO dla Most Rocha daje poprawną odpowiedź (ok)", parsed.level === "ok");
  } catch (e) {
    console.warn("Uwaga: test żywej sieci SOPO pominięty lub nieudany:", e.message);
  }
}

console.log(failed ? `\nLANDSLIDE TESTY: NIE PRZESZŁO ${failed}` : "\nWszystkie testy modułu landslide przeszły pomyślnie.");
process.exitCode = failed ? 1 : 0;

