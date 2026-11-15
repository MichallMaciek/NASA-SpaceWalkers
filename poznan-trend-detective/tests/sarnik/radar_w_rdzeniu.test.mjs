// Strażnik: funkcje radarowe (SAR) są podpięte w rdzeniu aplikacji.
//
// Wyzwanie „Dancing with the SARs” wymaga, żeby aplikacja liczyła z radaru. Te funkcje już raz wypadły przy przebudowie
// osi czasu (15.11, 12:38: z widoku „Satelita NISAR” zniknęła oś lat radaru i przeloty NISAR), a zwykłe testy tego nie
// widzą, bo strona nadal się ładuje. Ten test czyta pliki rdzenia i sprawdza, czy każda funkcja radarowa jest nadal
// wywoływana tam, gdzie powinna. Nie uruchamia przeglądarki; pełne sprawdzenie robi tests/e2e_sarnik.py.
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
const timeline = read("app/15-timeline.js");
const renderTimeline = body(timeline, "renderTimeline") || "";
const togglePlay = body(timeline, "togglePlay") || "";

const checks = [
  // --- widok „Satelita NISAR”: wiele lat i wiele przelotów radaru ---
  ["oś lat radaru w widoku „Satelita NISAR” (ALOS-2 2015–2021, NISAR 2026): renderTimeline() rysuje ją, gdy radarTL()",
    /radarTL\(\)/.test(renderTimeline) && /state\.ryear/.test(renderTimeline) && /RY\(\)/.test(renderTimeline)],
  ["oś czasu nie jest wyłączona w widoku radaru: warunek pokazania osi obejmuje radarTL()",
    /hasTimeline\s*=[^;]*radarTL\(\)/.test(renderTimeline) || !/hasTimeline/.test(renderTimeline)],
  ["przeloty NISAR z lata 2026: renderTimeline() ma przycisk #tl-pass z togglePasses i krok po przelotach (passOn())",
    /togglePasses/.test(renderTimeline) && /passOn\(\)/.test(renderTimeline) && /anim\.frames/.test(renderTimeline)],
  ["odtwarzanie po latach radaru i po przelotach: togglePlay() ma gałąź radarTL() z setRYear i setPass",
    /radarTL\(\)/.test(togglePlay) && /setRYear\(/.test(togglePlay) && /setPass\(/.test(togglePlay)],
  ["widok radaru istnieje na liście widoków (lens „radar”)", /\{\s*k:\s*"radar"/.test(read("app/17-lenses.js"))],
  ["suwak roku w widoku radaru ustawia rok radaru (setRYear) i przelot (setPass)",
    /setRYear\(/.test(read("app/32-main.js")) && /setPass\(/.test(read("app/32-main.js"))],
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
  ["arkusz przelotów NISAR (data/sarnik/anim)", existsSync(join(WEB, "data/sarnik/anim/meta.json")) && existsSync(join(WEB, "data/sarnik/anim/nisar_t57.png"))],
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
