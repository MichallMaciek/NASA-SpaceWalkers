// Test modułu radar_lata (zabudowa wokół wg radaru rok po roku + prognoza od stanu z radaru 2026)
// Uruchomienie: node poznan-trend-detective/tests/sarnik/radar_lata.test.mjs
// Dane są sztuczne (mała siatka w kodzie testu); prawdziwe pliki w web/data/sarnik/ nie są potrzebne.
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { createCore, loadModule } from "../../../docs/planwyd/kontrakt/fake_core.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleFile = path.resolve(here, "../../web/sarnik/radar_lata.js");
const NAME = "radar_lata";
const KEY_FY = "sarnik/radar_lata/first_year", KEY_P5 = "sarnik/radar_prognoza/prob_5y";
const META = "sarnik/radar_lata/meta.json", PMETA = "sarnik/radar_prognoza/meta.json";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log((ok ? "OK   " : "BŁĄD ") + name + (ok ? "" : " -> " + detail));
  if (!ok) failed++;
};

// --- sztuczna siatka 10 x 8 komórek
const W = 10, H = 8, N = W * H;
const land = { width: W, height: H, cell_m_ground: 73.2 };
// wypełnia komórki po kolei: [[wartość, ile], ...]; reszta = 0 (brak danych)
const grid = (spec, fill = 0) => {
  const a = new Uint8Array(N).fill(fill);
  let i = 0;
  for (const [v, n] of spec) for (let k = 0; k < n; k++) a[i++] = v;
  return a;
};
const range = (a, b) => Array.from({ length: b - a }, (_, k) => a + k);

const YEARS_07 = [2007, 2008, 2010, ...range(2015, 2027)];
const YEARS_15 = range(2015, 2027);
const Q = { 50: 0.5, 75: 1, 90: 2, 95: 3, 99: 5 };
const mkMeta = (o = {}) => Object.assign({
  source: "Sentinel-1 RTC (ESA, Microsoft Planetary Computer); ALOS PALSAR (JAXA, ASF DAAC); NISAR GCOV i GUNW (NASA-ISRO, ASF DAAC)",
  years: YEARS_07, start_year: 2007, last_optical_year: 2020,
  passes: { total: 400, by_year: { 2015: 30 } },
  cell_ha: 0.5,
  study: { built_share_pct: { 2015: 20 }, new_ha_since_2020: 900 },
  near_1km: { new_ha_since_2020_quantiles: { ...Q } },
  layers: [{ name: "first_year", file: "first_year.png", decode: { scale: 1, offset: 2000, unit: "rok" } }],
  checks: { zmiana_po_2020: { what: "…", cells: 1000, ratio: 2.1, ci95: [1.5, 2.8], passed: true } },
  prognoza: { set: "sarnik/radar_prognoza", row: true }, // wiersz prognozy włączony; w danych z repo jest wyłączony
}, o);
const PQ = { 50: 0.005, 75: 0.01, 90: 0.02, 95: 0.03, 99: 0.08 };
const mkPMeta = (o = {}) => Object.assign({
  source: "Prognoza zespołu", start_year: 2026, horizon_years: 5,
  checks: { prognoza_a_radar: { what: "…", passed: true }, prognoza_a_radar_brzeg: { what: "…", passed: true } }, quantiles_open: { ...PQ },
}, o);

// wzrost: 8 komórek zabudowanych w 2007, 2 w 2015, po 2020: 2021 × 1, 2023 × 4, 2024 × 1, 4 wolne -> 20 komórek
const GROW = grid([[7, 8], [15, 2], [21, 1], [23, 4], [24, 1], [1, 4]]);
const ALL20 = range(0, 20);
const v4pct = 51; // (51/255)^2 = 0.04 -> 4%

const point = (cells = ALL20) => ({ kind: "point", lat: 52.4, lng: 16.9, ring: [], area: "Poznań", cells });
const areaSel = (cells = ALL20) => ({ kind: "area", lat: 52.4, lng: 16.9, ring: [], area: "Poznań", cells });
const words = (items) => items.map((it) => [it.t, it.word, it.v, it.src].join(" ")).join(" ");

function setup({ meta = mkMeta(), noMeta = false, pmeta = null, fy = GROW, p5 = null, lang = "pl", fetchImpl, globals = {}, L8 } = {}) {
  const json = {};
  if (!noMeta) json[META] = meta;
  if (pmeta) json[PMETA] = pmeta;
  const l8 = L8 || {};
  if (!L8 && fy) l8[KEY_FY] = fy;
  if (!L8 && p5) l8[KEY_P5] = p5;
  const core = createCore({ lang, land, L8: l8, json });
  const warns = [];
  const cons = { log: console.log, error: console.error, warn: (...a) => warns.push(a.join(" ")) };
  const calls = [];
  loadModule(moduleFile, core, Object.assign({
    console: cons,
    fetch: fetchImpl ? (url, o) => { calls.push(url); return fetchImpl(url, o); } : async (url) => { calls.push(url); throw new Error("brak sieci w teście"); },
  }, globals));
  return { core, warns, calls, mod: core.SARNIK.modules[NAME] };
}
async function run(opts = {}, sel = point()) {
  const t = setup(opts);
  const s = t.core.select(sel);
  const before = t.core.items(s);
  await t.core.settle();
  const items = t.core.items(s);
  const hist = items.find((it) => it.id === `${NAME}:historia`), prog = items.find((it) => it.id === `${NAME}:prognoza`);
  return { ...t, sel: s, before, items, hist, prog };
}

// --- PNG 8-bit szarości w Node (zlib), wiersze z wybranymi filtrami 0-4
function crc32(buf) {
  if (zlib.crc32) return zlib.crc32(buf) >>> 0;
  let c = ~0;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length), t = Buffer.from(type, "ascii");
  out.writeUInt32BE(data.length, 0); t.copy(out, 4); data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length);
  return out;
}
function makePNG(pix, w, h, filters, { colour = 0, splitIdat = false } = {}) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    const f = filters[y % filters.length], s = y * (w + 1);
    raw[s] = f;
    for (let x = 0; x < w; x++) {
      const v = pix[y * w + x], a = x ? pix[y * w + x - 1] : 0, b = y ? pix[(y - 1) * w + x] : 0, c = x && y ? pix[(y - 1) * w + x - 1] : 0;
      let pred = 0;
      if (f === 1) pred = a;
      else if (f === 2) pred = b;
      else if (f === 3) pred = (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      raw[s + 1 + x] = (v - pred) & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = colour; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const z = zlib.deflateSync(raw);
  const idats = splitIdat ? [z.subarray(0, 7), z.subarray(7)] : [z];
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), ...idats.map((d) => chunk("IDAT", d)), chunk("IEND", Buffer.alloc(0))]);
}
const webGlobals = { Response, Blob, DecompressionStream, DataView, Uint8Array };
const pngFetch = (files) => async (url) => {
  const name = Object.keys(files).find((f) => url.startsWith(`data/${f}?`));
  if (!name) return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
  const b = files[name];
  return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
};

console.log("=== TESTY MODUŁU RADAR_LATA ===");

// 1. Stan "wczytuję" i wzrost po 2020 r. (punkt, test zmiany przeszedł)
{
  const r = await run();
  const b = r.before[0];
  check("przed wczytaniem: jeden wiersz w toku (info, pending)", r.before.length === 1 && b.pending === true && b.lvl === "info" && b.id === `${NAME}:historia`, JSON.stringify(r.before));
  check("wiersz w toku należy do grupy radarowej", b.sar === "yes");
  check("po wczytaniu: jeden wiersz historii, bez prognozy (brak drugiego zestawu)", r.items.length === 1 && r.hist && !r.prog, JSON.stringify(r.items.map((i) => i.id)));
  const h = r.hist;
  check("tytuł wiersza", h.t === "Zabudowa wokół wg radaru, rok po roku", h.t);
  check("po 2020: ok. 3,0 ha, najwięcej w 2023, ponad 90% miejsc; od 2007 łącznie 4,0 ha", h.v === "Po 2020 r., gdzie kończy się mapa optyczna, radar widzi w promieniu 1 km ok. 3,0 ha nowej i gęstszej zabudowy (najwięcej w 2023 r.), więcej niż w 90% miejsc wokół Poznania. Od 2007 r. łącznie ok. 4,0 ha.", h.v);
  check("bez udziału zabudowy w procentach", !/%\s+terenu|zabudowę na/.test(h.v), h.v);
  check("słowo statusu: +3,0 ha od 2020", h.word === "+3,0 ha od 2020", h.word);
  check("3,0 ha >= kwantyl 90% i test przeszedł -> warn", h.lvl === "warn", h.lvl);
  check("źródło z lat w meta: S1 2015–2026, ALOS 2007–2010, NISAR 2026", h.src === "Radar Sentinel-1 2015–2026, ALOS PALSAR 2007–2010, NISAR 2026", h.src);
  check("brak naruszeń kontraktu", r.core.problems(r.before.concat(r.items)).length === 0, r.core.problems(r.items).join("; "));
  check("rdzeń nie złapał wyjątku", r.core.warnings.length === 0, r.core.warnings.join("; "));
  check("bez fetch: warstwy wzięte z ctx.L8", r.calls.length === 0, r.calls.join(", "));
  check("brak zestawu prognozy: dokładnie jedno console.warn", r.warns.length === 1 && /radar_prognoza/.test(r.warns[0]), r.warns.join(" | "));
  check("nagłówek liczy 1 rzecz do sprawdzenia", r.core.flags(r.items) === 1);

  // drugi wybór: wszystko już w pamięci, bez nowego wczytywania i bez wiersza w toku
  const s2 = r.core.select(point(range(0, 10)));
  const it2 = r.core.items(s2);
  check("drugi wybór: wynik od razu, bez fetchOnce", !it2[0].pending && !(NAME in s2.ext), JSON.stringify(s2.ext));
  check("drugi wybór: nadal jedno console.warn", r.warns.length === 1);

  r.core.setLang("en");
  const en = r.core.items(r.sel)[0];
  check("EN: tytuł", en.t === "Buildings around, by radar, year by year", en.t);
  check("EN: kropka dziesiętna i treść", en.v === "After 2020, where the optical map ends, the radar sees about 3.0 ha of new and denser building within 1 km (most in 2023), more than in 90% of places around Poznań. Since 2007, about 4.0 ha in all.", en.v);
  check("EN: słowo statusu", en.word === "+3.0 ha since 2020", en.word);
  check("EN: bez naruszeń kontraktu", r.core.problems([en]).length === 0);
}

// 2. Błąd wczytania: brak meta.json, potem brak pliku PNG
{
  const r = await run({ noMeta: true });
  check("brak meta.json -> info 'brak danych radaru'", r.items.length === 1 && r.hist.lvl === "info" && r.hist.word === "brak danych radaru" && /Nie udało się wczytać/.test(r.hist.v), JSON.stringify(r.items));
  check("brak meta.json: nigdy 'w normie', bez wyjątku", !/w normie/.test(words(r.items)) && r.core.warnings.length === 0);
  const r2 = await run({ fy: null });
  check("brak first_year.png (fetch nie działa) -> info 'brak danych radaru'", r2.hist.lvl === "info" && r2.hist.word === "brak danych radaru", JSON.stringify(r2.hist));
  check("moduł próbował pobrać PNG z data/sarnik/radar_lata/", r2.calls.some((u) => u.startsWith("data/sarnik/radar_lata/first_year.png?v=")), r2.calls.join(", "));
  check("błąd wczytania: jeden console.warn (bez zestawu 'lata' prognoza nie jest pobierana)", r2.warns.length === 1 && !r2.calls.some((u) => u.includes("radar_prognoza")), r2.warns.join(" | "));
  // następny wybór próbuje jeszcze raz (zestaw 'lata'), prognozy już nie
  const s = r2.core.select(point());
  await r2.core.settle();
  check("po błędzie następny wybór próbuje wczytać PNG jeszcze raz (prognoza bez meta: bez pobierania PNG)", r2.calls.filter((u) => u.includes("first_year")).length === 2 && !r2.calls.some((u) => u.includes("prob_5y")), r2.calls.join(", "));
  check("ponowna próba nie dokłada console.warn", r2.warns.length === 1, r2.warns.join(" | "));
  check("po ponownym błędzie nadal info", r2.core.items(s)[0].lvl === "info");
}

// 3. Brak odpowiedzi: wczytywanie wisi, fetchOnce skończył się limitem czasu
{
  const t = setup({ fy: null, fetchImpl: () => new Promise(() => {}) });
  const s = t.core.select(point());
  await new Promise((res) => setTimeout(res, 10));
  s.ext[NAME] = { st: "timeout" };
  const it = t.core.items(s)[0];
  check("limit czasu -> info 'brak odpowiedzi'", it.lvl === "info" && it.word === "brak odpowiedzi" && !it.pending, JSON.stringify(it));
}

// 4. Brak ważnych komórek (poza obszarem)
{
  const r = await run({ fy: new Uint8Array(N) });
  check("same zera -> info 'brak danych radaru'", r.hist.lvl === "info" && r.hist.word === "brak danych radaru" && r.hist.v === "Radar nie ma tu pomiaru zabudowy.", JSON.stringify(r.hist));
  check("pusta lista komórek -> też brak danych", (await run({}, point([]))).hist.word === "brak danych radaru");
}

// 5. Bez zmian po 2020 r.
{
  const r = await run({ fy: grid([[7, 5], [18, 5], [1, 10]]) });
  check("bez nowej zabudowy: 'bez zmian od 2020'", r.hist.word === "bez zmian od 2020", r.hist.word);
  check("nic po 2020, coś przed: zdanie o latach 2008–2020", r.hist.v === "Po 2020 r., gdzie kończy się mapa optyczna, radar nie widzi w promieniu 1 km nowej zabudowy. W latach 2008–2020 przybyło ok. 2,5 ha.", r.hist.v);
  check("0 ha < kwantyl 75% przy pełnym pomiarze i teście -> ok", r.hist.lvl === "ok", r.hist.lvl);
  r.core.setLang("en");
  check("EN: nic po 2020, coś przed", r.core.items(r.sel)[0].v === "After 2020, where the optical map ends, the radar sees no new buildings within 1 km. In 2008–2020 about 2.5 ha were added.", r.core.items(r.sel)[0].v);
  const ra = await run({ fy: grid([[7, 5], [18, 5], [1, 10]]) }, areaSel());
  check("obszar: nic po 2020, coś przed", ra.hist.v === "Po 2020 r., gdzie kończy się mapa optyczna, radar nie widzi na tym obszarze nowej zabudowy. W latach 2008–2020 przybyło ok. 2,5 ha.", ra.hist.v);
  ra.core.setLang("en");
  check("EN obszar: nic po 2020, coś przed", ra.core.items(ra.sel)[0].v === "After 2020, where the optical map ends, the radar sees no new buildings in this area. In 2008–2020 about 2.5 ha were added.", ra.core.items(ra.sel)[0].v);

  // nic nowego od początku zapisu
  const z = await run({ fy: grid([[7, 10], [1, 10]]) });
  check("nic od 2007: jedno zdanie", z.hist.v === "Od 2007 r. radar nie widzi w promieniu 1 km nowej zabudowy." && z.hist.word === "bez zmian od 2020", z.hist.v);
  z.core.setLang("en");
  check("EN: nic od 2007", z.core.items(z.sel)[0].v === "Since 2007 the radar sees no new buildings within 1 km.", z.core.items(z.sel)[0].v);
  const za = await run({ fy: grid([[7, 10], [1, 10]]) }, areaSel());
  check("obszar: nic od 2007", za.hist.v === "Od 2007 r. radar nie widzi na tym obszarze nowej zabudowy.", za.hist.v);
  za.core.setLang("en");
  check("EN obszar: nic od 2007", za.core.items(za.sel)[0].v === "Since 2007 the radar sees no new buildings in this area.", za.core.items(za.sel)[0].v);

  // zapis od 2019 r.: przed 2020 r. zostaje jeden rok
  const y1 = await run({ fy: grid([[19, 5], [20, 2], [1, 13]]), meta: mkMeta({ years: range(2019, 2027), start_year: 2019 }) });
  check("jeden rok przed 2020: 'W 2020 r. przybyło'", y1.hist.v.endsWith("nowej zabudowy. W 2020 r. przybyło ok. 1,0 ha."), y1.hist.v);
  check("hektary 10 i więcej bez części dziesiętnej", (await run({ meta: mkMeta({ cell_ha: 3.5 }) })).hist.v.includes("ok. 21 ha nowej i gęstszej zabudowy"));
}

// 6. Progi kwantyli (punkt): ściśle powyżej kwantyla, poniżej mediany bez zdania
{
  const fyN = (n) => grid([[7, 10], [22, n], [1, 20 - 10 - n]]);
  const one = (await run({ fy: fyN(1) })).hist; // 0,5 ha = mediana
  check("0,5 ha (równe medianie): bez zdania o miejscach", !/więcej niż/.test(one.v) && /radar widzi w promieniu 1 km ok\. 0,5 ha nowej i gęstszej zabudowy, wszystko w 2022 r\.$/.test(one.v) && !/\.\.$/.test(one.v), one.v);
  check("0,5 ha < kwantyl 75% -> ok", one.lvl === "ok", one.lvl);
  const two = (await run({ fy: fyN(2) })).hist; // 1,0 ha
  check("1,0 ha: 'więcej niż w 50% miejsc'", /więcej niż w 50% miejsc wokół Poznania/.test(two.v), two.v);
  check("1,0 ha (= kwantyl 75%, < 90%) -> info", two.lvl === "info", two.lvl);
  const four = (await run({ fy: fyN(4) })).hist; // 2,0 ha = kwantyl 90%
  check("2,0 ha (= kwantyl 90%): zdanie '75%', poziom warn", /więcej niż w 75% miejsc/.test(four.v) && four.lvl === "warn", four.lvl + " / " + four.v);
  const ten = (await run({ fy: grid([[22, 10], [24, 2], [1, 8]]) })).hist; // 6,0 ha > kwantyl 99%
  check("6,0 ha: 'więcej niż w 99% miejsc', najwięcej w 2022", /\(najwięcej w 2022 r\.\), więcej niż w 99% miejsc/.test(ten.v), ten.v);
  const tie = (await run({ fy: grid([[7, 10], [21, 2], [25, 2], [1, 6]]) })).hist;
  check("remis lat: bez 'najwięcej w'", !/najwięcej|wszystko w/.test(tie.v) && /ok\. 2,0 ha nowej i gęstszej zabudowy, więcej niż w 75%/.test(tie.v), tie.v);
  const pure = setup().mod.pure;
  const q = pure.quants(Q);
  check("above(): progi 50/75/90/95/99", pure.above(0.4, q) === null && pure.above(0.6, q) === "50" && pure.above(2.5, q) === "90" && pure.above(3.1, q) === "95" && pure.above(9, q) === "99");
  check("quants(): brak klucza -> null", pure.quants({ 50: 1, 75: 2, 90: 3, 95: 4 }) === null && pure.quants("x") === null);
}

// 7. warn i ok tylko, gdy test zmiana_po_2020 przeszedł
{
  const noPass = await run({ meta: mkMeta({ checks: { zmiana_po_2020: { passed: false } } }) });
  check("test nie przeszedł: duży przyrost -> info", noPass.hist.lvl === "info" && /więcej niż w 90%/.test(noPass.hist.v), noPass.hist.lvl);
  const noChecks = await run({ meta: mkMeta({ checks: undefined }) });
  check("brak checks: info", noChecks.hist.lvl === "info");
  const truthy = await run({ meta: mkMeta({ checks: { zmiana_po_2020: { passed: "true" } } }) });
  check("passed: \"true\" (tekst) się nie liczy -> info", truthy.hist.lvl === "info");
  const calm = await run({ fy: grid([[7, 10], [1, 10]]), meta: mkMeta({ checks: { zmiana_po_2020: { passed: false } } }) });
  check("test nie przeszedł: bez zmian -> info, nie ok", calm.hist.lvl === "info", calm.hist.lvl);
  const part = await run({ fy: grid([[7, 5], [1, 5]]) }, point(ALL20)); // 10 z 20 komórek bez danych
  check("pomiar tylko połowy terenu: zdanie o zasięgu, bez 'ok'", part.hist.lvl === "info" && /Radar mierzy tylko 50% tego terenu\./.test(part.hist.v), part.hist.lvl + " / " + part.hist.v);
}

// 8. Obszar narysowany przez użytkownika
{
  const r = await run({}, areaSel());
  check("obszar: 'na tym obszarze', nie 'w promieniu 1 km'", r.hist.v === "Po 2020 r., gdzie kończy się mapa optyczna, radar widzi na tym obszarze ok. 3,0 ha nowej i gęstszej zabudowy, najwięcej w 2023 r. Od 2007 r. łącznie ok. 4,0 ha.", r.hist.v);
  check("obszar: bez porównania z miejscami wokół Poznania", !/więcej niż/.test(r.hist.v), r.hist.v);
  check("obszar: poziom info mimo dużego przyrostu", r.hist.lvl === "info", r.hist.lvl);
  r.core.setLang("en");
  check("EN obszar: 'in this area'", r.core.items(r.sel)[0].v === "After 2020, where the optical map ends, the radar sees about 3.0 ha of new and denser building in this area, most in 2023. Since 2007, about 4.0 ha in all.", r.core.items(r.sel)[0].v);
}

// 9. Zapis od 2015 r. (bez ALOS) a od 2007 r.
{
  const fy15 = grid([[15, 6], [17, 2], [23, 2], [1, 10]]);
  const r = await run({ fy: fy15, meta: mkMeta({ years: YEARS_15, start_year: 2015, source: "Sentinel-1 RTC; NISAR GCOV" }) });
  check("od 2015: źródło bez ALOS", r.hist.src === "Radar Sentinel-1 2015–2026, NISAR 2026", r.hist.src);
  check("od 2015: 'Od 2015 r. łącznie'", r.hist.v === "Po 2020 r., gdzie kończy się mapa optyczna, radar widzi w promieniu 1 km ok. 1,0 ha nowej i gęstszej zabudowy (wszystko w 2023 r.), więcej niż w 50% miejsc wokół Poznania. Od 2015 r. łącznie ok. 2,0 ha.", r.hist.v);
  const q15 = await run({ fy: grid([[15, 6], [17, 2], [1, 12]]), meta: mkMeta({ years: YEARS_15, start_year: 2015 }) });
  check("od 2015, nic po 2020: 'W latach 2016–2020'", q15.hist.v === "Po 2020 r., gdzie kończy się mapa optyczna, radar nie widzi w promieniu 1 km nowej zabudowy. W latach 2016–2020 przybyło ok. 1,0 ha.", q15.hist.v);
  const n15 = await run({ fy: grid([[15, 6], [1, 14]]), meta: mkMeta({ years: YEARS_15, start_year: 2015 }) });
  check("od 2015, nic nowego: 'Od 2015 r. radar nie widzi'", n15.hist.v === "Od 2015 r. radar nie widzi w promieniu 1 km nowej zabudowy.", n15.hist.v);
  const g7 = await run({ fy: grid([[7, 6], [17, 2], [23, 2], [1, 10]]) });
  check("ta sama zabudowa przy zapisie od 2007: 'Od 2007 r. łącznie'", g7.hist.v.endsWith("Od 2007 r. łącznie ok. 2,0 ha."), g7.hist.v);
  const r2 = await run({ fy: fy15, meta: mkMeta({ years: YEARS_15, start_year: 2015, source: "Sentinel-1 RTC" }) });
  check("bez NISAR w meta.source: źródło bez NISAR", r2.hist.src === "Radar Sentinel-1 2015–2026", r2.hist.src);
  const r3 = await run({ meta: mkMeta({ years: undefined }) });
  check("bez meta.years: źródło od start_year do 2026", r3.hist.src === "Radar Sentinel-1 2026, ALOS PALSAR 2007, NISAR 2026" && r3.hist.lvl === "warn", r3.hist.src);
  r.core.setLang("en");
  check("EN od 2015: 'Since 2015' i źródło", r.core.items(r.sel)[0].v.endsWith("Since 2015, about 2.0 ha in all.") && r.core.items(r.sel)[0].src === "Radar Sentinel-1 2015–2026, NISAR 2026", r.core.items(r.sel)[0].v);
  q15.core.setLang("en");
  check("EN od 2015, nic po 2020: 'In 2016–2020'", q15.core.items(q15.sel)[0].v.endsWith("In 2016–2020 about 1.0 ha were added."), q15.core.items(q15.sel)[0].v);
}

// 10. Prognoza: obecna, ostrzeżenie, brak wolnego terenu
{
  const p5 = new Uint8Array(N); for (let i = 16; i < 20; i++) p5[i] = v4pct; // 4 wolne komórki GROW
  const r = await run({ pmeta: mkPMeta(), p5 });
  check("z drugim zestawem: dwa wiersze", r.items.length === 2 && r.prog, JSON.stringify(r.items.map((i) => i.id)));
  check("tytuł i grupa prognozy (sar: part)", r.prog.t === "Co może powstać obok, licząc od stanu z radaru" && r.prog.sar === "part");
  check("treść prognozy: ok. 4%, 5 lat, 2026, ponad 95%", r.prog.v === "Wolny teren obok ma ok. 4% szans na zabudowę w ciągu 5 lat, licząc od tego, co radar widzi w 2026 r.; to więcej niż w 95% wolnych miejsc wokół Poznania.", r.prog.v);
  check("4% >= kwantyl 95% i test przeszedł -> warn", r.prog.lvl === "warn", r.prog.lvl);
  check("słowo statusu prognozy", r.prog.word === "szansa 4%", r.prog.word);
  check("źródło prognozy", r.prog.src === "Prognoza zespołu: start ze stanu z radaru w 2026 r.", r.prog.src);
  check("prognoza: bez console.warn", r.warns.length === 0, r.warns.join(" | "));
  check("prognoza: bez naruszeń kontraktu", r.core.problems(r.items).length === 0, r.core.problems(r.items).join("; "));
  r.core.setLang("en");
  const en = r.core.items(r.sel)[1];
  check("EN prognoza", en.v === "Open land nearby has about 4% chance of being built on within 5 years, counting from what the radar sees in 2026; that is more than for 95% of open places around Poznań." && en.word === "chance 4%", en.v + " / " + en.word);

  const np = await run({ pmeta: mkPMeta({ checks: { prognoza_a_radar: { passed: false } } }), p5 });
  check("test prognozy nie przeszedł -> info", np.prog.lvl === "info" && /więcej niż w 95%/.test(np.prog.v));
  const off = await run({ meta: mkMeta({ prognoza: { set: "sarnik/radar_prognoza", row: false } }), pmeta: mkPMeta(), p5 });
  check("wiersz prognozy wyłączony w meta -> brak wiersza, historia jest, bez console.warn", off.prog === undefined && !!off.hist && off.hist.pending !== true && off.warns.length === 0, off.warns.join(" | "));
  const noFlag = await run({ meta: mkMeta({ prognoza: undefined }), pmeta: mkPMeta(), p5 });
  check("brak pola prognoza w meta -> brak wiersza prognozy", noFlag.prog === undefined && !!noFlag.hist);
  const offNoSet = await run({ meta: mkMeta({ prognoza: { row: false } }) });
  check("wyłączony wiersz i brak zestawu prognozy -> nic nie jest pobierane (bez console.warn)", offNoSet.prog === undefined && offNoSet.warns.length === 0, offNoSet.warns.join(" | "));
  const nf = await run({ pmeta: mkPMeta({ checks: { prognoza_a_radar: { passed: true }, prognoza_a_radar_brzeg: { passed: false } } }), p5 });
  check("test na skraju zabudowy nie przeszedł -> info", nf.prog.lvl === "info" && /więcej niż w 95%/.test(nf.prog.v));
  const nb = await run({ pmeta: mkPMeta({ checks: { prognoza_a_radar: { passed: true } } }), p5 });
  check("brak testu na skraju zabudowy -> info", nb.prog.lvl === "info");
  const low = new Uint8Array(N); for (let i = 16; i < 20; i++) low[i] = 15; // (15/255)^2 = 0,35%
  const lo = await run({ pmeta: mkPMeta(), p5: low });
  check("mała szansa: '0,3%', bez zdania o miejscach, info", /ma ok\. 0,3% szans/.test(lo.prog.v) && !/więcej niż/.test(lo.prog.v) && lo.prog.lvl === "info", lo.prog.v);
  const tiny = new Uint8Array(N); for (let i = 16; i < 20; i++) tiny[i] = 1;
  const ti = await run({ pmeta: mkPMeta(), p5: tiny });
  check("szansa prawie zero: 'mniej niż 0,1%'", /ma mniej niż 0,1% szans/.test(ti.prog.v) && ti.prog.word === "szansa mniej niż 0,1%", ti.prog.v);

  const built = await run({ pmeta: mkPMeta(), p5, fy: grid([[7, 20]]) });
  check("bez wolnego terenu: wiersz 'brak wolnego terenu' (info)", built.prog && built.prog.lvl === "info" && built.prog.word === "brak wolnego terenu" && /w promieniu 1 km wszystko jest już zabudowane/.test(built.prog.v), JSON.stringify(built.prog));
  const ar = await run({ pmeta: mkPMeta(), p5 }, areaSel());
  check("obszar: 'Wolny teren na tym obszarze'", /^Wolny teren na tym obszarze ma ok\. 4%/.test(ar.prog.v), ar.prog.v);
  const h3 = await run({ pmeta: mkPMeta({ horizon_years: 1, quantiles_open: undefined }), p5 });
  check("horyzont 1 rok, bez kwantyli: 'w ciągu 1 roku', info", /w ciągu 1 roku/.test(h3.prog.v) && !/więcej niż/.test(h3.prog.v) && h3.prog.lvl === "info", h3.prog.v);
  const nod = await run({ pmeta: mkPMeta(), p5, fy: new Uint8Array(N) });
  check("bez danych radaru: tylko wiersz 'brak danych', bez prognozy", nod.items.length === 1 && nod.hist.word === "brak danych radaru");
  const miss = await run({ pmeta: mkPMeta() }); // meta prognozy jest, PNG nie
  check("brak prob_5y.png: bez wiersza prognozy i jedno console.warn", miss.items.length === 1 && miss.warns.length === 1, miss.warns.join(" | "));
}

// 11. Zły meta.json: bez wyjątku, wiersz info 'brak danych'
{
  for (const [name, meta] of [["{}", {}], ["start_year jako tekst", mkMeta({ start_year: "2007" })], ["cell_ha = 0", mkMeta({ cell_ha: 0 })], ["null", null], ["tablica", []]]) {
    const r = await run({ meta });
    check(`zły meta (${name}) -> info, bez wyjątku`, r.items.length === 1 && r.hist.lvl === "info" && /brak danych/.test(r.hist.word) && r.core.warnings.length === 0 && r.core.problems(r.items).length === 0, JSON.stringify(r.items) + r.core.warnings.join(";"));
  }
  const odd = await run({ meta: mkMeta({ near_1km: { new_ha_since_2020_quantiles: { 50: "x" } }, checks: "tak", years: "2007-2026" }) });
  check("złe kwantyle i checks: bez zdania o miejscach, info", odd.hist.lvl === "info" && !/więcej niż/.test(odd.hist.v) && /ok\. 3,0 ha nowej i gęstszej zabudowy, najwięcej w 2023 r\. Od 2007/.test(odd.hist.v) && odd.core.warnings.length === 0, odd.hist.v);
  const p5 = new Uint8Array(N).fill(60);
  const badP = await run({ pmeta: { checks: null, quantiles_open: [], start_year: "x", horizon_years: -2, training: 7 }, p5 });
  check("zły meta prognozy: wartości domyślne (5 lat, 2026), info", badP.prog && badP.prog.lvl === "info" && /w ciągu 5 lat, licząc od tego, co radar widzi w 2026 r\.$/.test(badP.prog.v) && badP.core.warnings.length === 0, badP.prog && badP.prog.v);
  const arrP = await run({ pmeta: ["x"], p5 });
  check("meta prognozy nie jest obiektem: bez wiersza prognozy", arrP.items.length === 1 && arrP.warns.length === 1);
}

// 12. Teksty z plików danych bez HTML
{
  const p5 = new Uint8Array(N); for (let i = 16; i < 20; i++) p5[i] = v4pct;
  const evil = "<img src=x onerror=alert(1)> & \"dane\"";
  const r = await run({ meta: mkMeta({ source: evil + " NISAR" }), pmeta: mkPMeta({ training: { what: evil, years: [2015, 2016, 2020] } }), p5 });
  const all = words(r.items);
  check("meta z HTML: nigdzie znacznika <img ani cudzysłowu", !/<|"/.test(all), all);
  check("meta z HTML: opis treningu w źródle jako zwykły tekst", r.prog.src === "Prognoza zespołu: start ze stanu z radaru w 2026 r.; uczona img src=x onerror=alert(1) dane, na latach 2015–2020", r.prog.src);
  const r2 = await run({ pmeta: mkPMeta({ training: "na mapach 2015–2020" }), p5 });
  check("trening jako tekst", r2.prog.src.endsWith("; uczona na mapach 2015–2020"), r2.prog.src);
  const r3 = await run({ meta: mkMeta({ provisional: true }), pmeta: mkPMeta({ trained_on: ["2005-2010", "2010-2015", "2015-2020"], provisional: true }), p5 });
  check("trained_on (jak w prawdziwym meta.json) i dane wstępne", r3.prog.src === "Prognoza zespołu: start ze stanu z radaru w 2026 r.; uczona na latach 2005–2020; dane wstępne", r3.prog.src);
  check("dane wstępne także w źródle historii", r3.hist.src.endsWith("NISAR 2026; dane wstępne"), r3.hist.src);
  r3.core.setLang("en");
  check("EN: trained_on i provisional", r3.core.items(r3.sel)[1].src === "Team forecast: starts from the radar picture of 2026; trained on 2005–2020; provisional data", r3.core.items(r3.sel)[1].src);
  r2.core.setLang("en");
  check("EN źródło prognozy z treningiem", r2.core.items(r2.sel)[1].src === "Team forecast: starts from the radar picture of 2026; trained na mapach 2015–2020");
  // treść v przechodzi przez ctx.esc: podmieniony esc zostawia ślad w obu wierszach
  const esc0 = r.core.ctx.esc;
  r.core.ctx.esc = (x) => "[" + esc0(x) + "]";
  const marked = r.core.items(r.sel);
  r.core.ctx.esc = esc0;
  check("v obu wierszy przechodzi przez ctx.esc", marked.length === 2 && marked.every((it) => /^\[.*\]$/.test(it.v)), marked.map((it) => it.v).join(" | "));
}

// 13. Dekoder PNG z bajtów (filtry 0-4) i pełna ścieżka przez fetch
{
  const { mod } = setup({ globals: webGlobals });
  const w = 7, h = 6, pix = new Uint8Array(w * h);
  for (let i = 0; i < pix.length; i++) pix[i] = (i * 37 + (i % 5) * 91 + 3) & 255;
  pix[0] = 0; pix[1] = 255; pix[w] = 254; // skrajne wartości
  for (const [name, filters, opt] of [["filtr 0", [0]], ["filtr 1", [1]], ["filtr 2", [2]], ["filtr 3", [3]], ["filtr 4", [4]], ["filtry 0-4 na zmianę", [0, 1, 2, 3, 4]], ["dwa bloki IDAT", [4, 3, 1], { splitIdat: true }]]) {
    const png = makePNG(pix, w, h, filters, opt);
    let out = null, err = "";
    try { out = await mod.pure.decodeGrayPNG(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength)); } catch (e) { err = e.message; }
    check(`PNG ${name}: wartości bajt w bajt`, out && out.w === w && out.h === h && out.data.length === pix.length && out.data.every((v, i) => v === pix[i]), err || (out && Array.from(out.data).join(",")));
  }
  let rgbErr = "";
  try { await mod.pure.decodeGrayPNG(makePNG(pix, w, h, [0], { colour: 2 })); } catch (e) { rgbErr = e.message; }
  check("PNG kolorowy: odrzucony", /not 8-bit greyscale/.test(rgbErr), rgbErr);
  let junk = "";
  try { await mod.pure.decodeGrayPNG(new Uint8Array(60)); } catch (e) { junk = e.message; }
  check("nie-PNG: odrzucony", junk === "not a PNG", junk);

  // pełna ścieżka: bez ctx.L8, moduł pobiera i dekoduje oba pliki
  const p5 = new Uint8Array(N); for (let i = 16; i < 20; i++) p5[i] = v4pct;
  const files = { "sarnik/radar_lata/first_year.png": makePNG(GROW, W, H, [0, 1, 2, 3, 4]), "sarnik/radar_prognoza/prob_5y.png": makePNG(p5, W, H, [1, 0]) };
  const r = await run({ L8: {}, pmeta: mkPMeta(), fetchImpl: pngFetch(files), globals: webGlobals });
  check("fetch + dekoder: wiersz historii jak z ctx.L8", r.hist && r.hist.word === "+3,0 ha od 2020" && r.hist.lvl === "warn", JSON.stringify(r.hist));
  check("fetch + dekoder: prognoza 4%", r.prog && /ok\. 4% szans/.test(r.prog.v), JSON.stringify(r.prog));
  check("fetch: dwa pliki, adres z wersją z meta.json", r.calls.length === 2 && r.calls.every((u) => /^data\/sarnik\/radar_(lata\/first_year|prognoza\/prob_5y)\.png\?v=[0-9a-z]+$/.test(u)), r.calls.join(", "));
  check("fetch: bez console.warn i wyjątków", r.warns.length === 0 && r.core.warnings.length === 0, r.warns.join(" | "));
  check("rerender po wczytaniu", r.core.rerenders >= 1);

  const wrong = { ...files, "sarnik/radar_lata/first_year.png": makePNG(GROW.subarray(0, 70), 7, 10, [0]) };
  const rw = await run({ L8: {}, fetchImpl: pngFetch(wrong), globals: webGlobals });
  check("PNG innego rozmiaru niż siatka -> brak danych", rw.hist.word === "brak danych radaru" && rw.hist.lvl === "info", JSON.stringify(rw.hist));
}

// 14. Teksty modułu: te same klucze i liczba argumentów po polsku i angielsku, bez 'undefined'
{
  const { mod } = setup();
  const pl = mod.i18n.pl, en = mod.i18n.en;
  const kp = Object.keys(pl).sort().join(","), ke = Object.keys(en).sort().join(",");
  check("PL i EN mają te same klucze", kp === ke, kp + " / " + ke);
  const kinds = Object.keys(pl).filter((k) => typeof pl[k] !== typeof en[k] || (typeof pl[k] === "function" && pl[k].length !== en[k].length));
  check("PL i EN: te same typy i liczba argumentów", kinds.length === 0, kinds.join(", "));
  const empty = Object.keys(pl).filter((k) => typeof pl[k] === "string" && (!pl[k].trim() || !en[k].trim()));
  check("bez pustych tekstów", empty.length === 0, empty.join(", "));
}

console.log(failed ? `\n${failed} BŁĘDÓW` : "\nWszystko OK");
process.exit(failed ? 1 : 0);
