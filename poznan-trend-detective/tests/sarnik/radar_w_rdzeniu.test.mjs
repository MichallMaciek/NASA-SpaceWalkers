// Strażnik: funkcje radarowe (SAR) są podpięte w rdzeniu aplikacji.
//
// Wyzwanie „Dancing with the SARs” wymaga, żeby aplikacja liczyła z radaru. Zwykłe testy nie widzą, gdy funkcja radarowa
// wypadnie przy przebudowie, bo strona nadal się ładuje. Ten test czyta pliki rdzenia i sprawdza, czy zabudowa z radaru
// rok po roku jest nadal podpięta na mapie, w karcie i w prognozie. Nie uruchamia przeglądarki; pełne sprawdzenie robi
// tests/e2e_sarnik.py.
//
// Osi lat radaru i przelotów NISAR w widoku „Satelita NISAR” ten test nie pilnuje: od 15.11 oś czasu jest tylko
// w widokach prognozy i ubytku zieleni (decyzja zespołu).
//
// Jeśli test nie przechodzi po Twojej zmianie, to znaczy, że któraś funkcja radarowa przestała być podpięta.
// Jeśli przeniosłeś ją celowo do innego pliku, popraw ścieżkę albo wzorzec w liście poniżej.
//
// Uruchomienie: node poznan-trend-detective/tests/sarnik/radar_w_rdzeniu.test.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "web");
const read = (p) => readFileSync(join(WEB, p), "utf8");
const core = () => readdirSync(join(WEB, "app")).filter((f) => f.endsWith(".js")).map((f) => read(join("app", f))).join("\n");

// wycina ciało funkcji najwyższego poziomu (rdzeń trzyma je z wcięciem dwóch spacji)
function body(src, name) {
  const m = src.match(new RegExp(`\\n  (?:async )?function ${name}\\(`));
  if (!m) return null;
  const end = src.indexOf("\n  }\n", m.index);
  return src.slice(m.index, end < 0 ? src.length : end);
}

const all = core();

const checks = [
  ["widok radaru istnieje na liście widoków (lens „radar”)", /\{\s*k:\s*"radar"/.test(read("app/17-lenses.js"))],
  // --- zabudowa z radaru rok po roku (Sentinel-1 2015–2026, NISAR 2026) ---
  ["mapa: nowa i gęstsza zabudowa z radaru 2021–2026 jest rysowana (radarFirst() w warstwie zabudowy)",
    /radarFirst\(\)/.test(read("app/14-layers.js"))],
  ["karta: baner „Co widzi radar” liczy hektary z radaru (radarFirst() i radarNewHa)",
    /radarFirst\(\)/.test(read("app/26-card-pros-cons.js")) && /radarNewHa/.test(read("app/26-card-pros-cons.js"))],
  ["prognoza: szansa zabudowy liczona tylko na terenie, który radar nadal widzi jako wolny (radarBuilt w riskOf)",
    /radarBuilt\(/.test(body(read("app/22-place-numbers.js"), "riskOf") || "")],
  ["moduł karty radar_lata jest na liście modułów", /["']radar_lata["']/.test(read("sarnik/manifest.js"))],
  ["rdzeń wczytuje zapis radaru rok po roku (sarnik/radar_lata/first_year)", /sarnik\/radar_lata\/first_year/.test(all)],
  // --- dane, bez których powyższe nie działa ---
  ["plik first_year.png (rok pierwszej zabudowy wg radaru)", existsSync(join(WEB, "data/sarnik/radar_lata/first_year.png"))],
  ["plik meta.json zapisu radaru", existsSync(join(WEB, "data/sarnik/radar_lata/meta.json"))],
];

let bad = 0;
for (const [what, ok] of checks) {
  if (!ok) { bad++; console.log(`BRAK  ${what}`); }
}
if (bad) {
  console.log(`\n${bad} z ${checks.length} funkcji radarowych nie jest podpiętych w rdzeniu. Patrz komentarz na górze tego pliku.`);
  process.exit(1);
}
console.log(`Wszystko OK: ${checks.length} funkcji radarowych podpiętych w rdzeniu.`);
