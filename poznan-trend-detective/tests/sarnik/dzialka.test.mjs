// Test modułu dzialka (ULDK GUGiK + próg zagrożenia gruntu z radaru + rejestr GUNB RWDZ)
// Uruchomienie: node poznan-trend-detective/tests/sarnik/dzialka.test.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCore, loadModule } from "../../../docs/planwyd/kontrakt/fake_core.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleFile = path.resolve(here, "../../web/sarnik/dzialka.js");
const fx = (n) => fs.readFileSync(path.resolve(here, "fixtures", n), "utf8");

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log((ok ? "OK   " : "BŁĄD ") + name + (ok ? "" : " -> " + detail));
  if (!ok) failed++;
};

// --- sztuczna siatka 10 x 10 komórek po 120 m (Web Mercator), jak data/land w aplikacji
const R = 6378137;
const merc = (lat, lng) => [R * lng * Math.PI / 180, R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];
const unmerc = (x, y) => [(2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI, (x / R) * 180 / Math.PI];
const [X0, Y0] = merc(52.45, 16.85);
const W = 10, A = 120;
const land = { width: W, height: W, cell_m_ground: 73.2, transform3857: [A, 0, X0, 0, -A, Y0] };
const landCell = (lat, lng) => {
  const [x, y] = merc(lat, lng), col = Math.floor((x - X0) / A), row = Math.floor((y - Y0) / -A);
  return row < 0 || col < 0 || row >= W || col >= W ? null : { row, col, i: row * W + col };
};
const cellCentre = (i) => unmerc(X0 + ((i % W) + 0.5) * A, Y0 - (Math.floor(i / W) + 0.5) * A);
const at = (col, row) => unmerc(X0 + col * A, Y0 - row * A); // narożnik siatki -> [lat, lng]

// działka: kwadrat od narożnika (2,2) do (5,5) -> 9 środków komórek w środku
const bigRing = [at(2, 2), at(5, 2), at(5, 5), at(2, 5), at(2, 2)];
// mała działka 30 x 30 m wewnątrz komórki (7,7), bez środka komórki w środku
const smallRing = [at(7.1, 7.1), at(7.35, 7.1), at(7.35, 7.35), at(7.1, 7.35), at(7.1, 7.1)];
const wkt = (ring) => "SRID=4326;POLYGON((" + ring.map(([la, lo]) => `${lo} ${la}`).join(",") + "))";
const uldk = (id, number, ring, region = "Poznań") => `0\n${id}|Poznań (miasto)|${region}|${number}|${wkt(ring)}\n`;

const enc = {
  db: (d) => Math.round((d + 30) * 6),
  water: (s) => Math.round(s * 254 + 1),
  wet: (r) => Math.round((r + 1) * 127 + 1),
  egms: (v) => Math.round(v + 100),
  change: (d) => Math.round((d + 10) * 12.75),
};
const layers = ({ nisar = -9, water = 0, wet = 0.1, egms = -1, rise = 0, dratio = 0 } = {}) => {
  const f = (v) => new Uint8Array(W * W).fill(v);
  return {
    nisar_hh_med: f(enc.db(nisar)), sar_water: f(enc.water(water)), sar_wet: f(enc.wet(wet)),
    sar_egms: f(enc.egms(egms)), sar_change: f(enc.change(rise)), sar_dratio: f(enc.change(dratio)),
  };
};
const sar = { s1: { r_crit: 0.388, wall_db: 1.5 } };
const json = {
  "sarnik/dzialka/meta.json": { files: ["306401_1_0051"] },
  "sarnik/dzialka/306401_1_0051.json": { rows: "3,7,,1,26\n33,1,,,20\n72/2,,2,,24" },
};
const point = (lat = 52.4022, lng = 16.9453) => ({ kind: "point", lat, lng, ring: [], area: "Poznań", cells: [1, 2, 3] });
const words = (items) => items.map((it) => [it.t, it.word, it.v, it.src].join(" ")).join(" ");
const setup = ({ text, L8 = layers(), lang = "pl", hires = null, fetchImpl } = {}) => {
  const j = Object.assign({}, json, hires ? { "land/hires.json": hires } : {});
  const core = createCore({ lang, land, sar, L8, landCell, cellCentre, json: j });
  const calls = [];
  loadModule(moduleFile, core, {
    fetch: fetchImpl || (async (url) => { calls.push(url); return { ok: true, status: 200, text: async () => text }; }),
  });
  return { core, calls };
};

console.log("=== TESTY MODUŁU DZIALKA ===");

// 1. Czyste funkcje
{
  const { core } = setup({ text: "" });
  const pure = core.SARNIK.modules.dzialka.pure;
  const url = pure.buildUrl(52.4083, 16.9335);
  check("URL: GetParcelByXY w kolejności lng,lat i EPSG:4326", url.includes("request=GetParcelByXY") && url.includes("xy=16.933500,52.408300,4326"));
  check("URL: prosi o teryt, obręb, numer i granicę", /result=teryt,commune,region,parcel,geom_wkt/.test(url));

  const p = pure.parse(fx("uldk_poznan.txt"));
  check("parse: prawdziwa odpowiedź ULDK (Poznań, 72/2)", p && p.id === "306401_1.0051.AR_17.72/2" && p.number === "72/2" && p.region === "Poznań");
  check("parse: jednostka i obręb do nazwy pliku rejestru", p && pure.districtKey(p) === "306401_1_0051");
  check("parse: pierścień jako [lat, lng]", p && p.ring.length >= 4 && p.ring.every(([la, lo]) => la > 52 && la < 53 && lo > 16 && lo < 17));
  const a = p ? pure.areaM2(p.ring) : 0;
  check("pole działki 72/2 jest rozsądne (100 - 20 000 m²)", a > 100 && a < 20000, String(a));
  check("parse: punkt bez działki (-1 brak wyników) -> null", pure.parse(fx("uldk_none.txt")) === null);
  check("parse: śmieci -> null", pure.parse("<html>502</html>") === null && pure.parse(null) === null);
  const mp = pure.parse("0\n302101_1.0001.5|Gmina|Obręb|5|SRID=4326;MULTIPOLYGON(((16.9 52.4,16.91 52.4,16.91 52.41,16.9 52.4)))");
  check("parse: MULTIPOLYGON bierze zewnętrzny pierścień", mp && mp.ring.length === 4 && mp.number === "5");

  const rows = "3,7,,1,26\n33,1,,,20\n72/2,,2,,24";
  const r3 = pure.findPermits(rows, "3");
  check("findPermits: 3 -> 7 nowych, 1 rozbiórka, ostatnia 2026", r3 && r3.new === 7 && r3.ext === 0 && r3.demol === 1 && r3.year === 2026 && r3.total === 8);
  check("findPermits: 33 nie myli się z 3", pure.findPermits(rows, "33").new === 1 && pure.findPermits(rows, "333") === null);
  check("findPermits: 72/2 -> 2 rozbudowy", pure.findPermits(rows, "72/2").ext === 2);

  const g = (m) => pure.grade(Object.assign({ nisar: NaN, water: NaN, wet: NaN, egms: NaN }, m), 0.388).lvl;
  check("grade: brak pomiarów -> info", g({}) === "info");
  check("grade: wszystko w normie -> ok", g({ nisar: -9, water: 0, wet: 0.1, egms: 0 }) === "ok");
  check("grade: jeden sygnał -> warn", g({ nisar: -9, water: 0, wet: 0.5, egms: 0 }) === "warn");
  check("grade: dwa sygnały -> risk", g({ nisar: -16, water: 0.3, wet: 0.1, egms: 0 }) === "risk");
  check("grade: progi na granicy (−15 dB, 20%, −2 mm) liczą się", g({ nisar: -15, water: 0.2, egms: -2 }) === "risk");
  check("grade: r równe progowi się nie liczy", g({ wet: 0.388 }) === "ok");
}

// 2. Działka z dwoma sygnałami (NISAR i Sentinel-1 widzą wodę) i z decyzjami w rejestrze
{
  const ring = bigRing;
  const { core, calls } = setup({ text: uldk("306401_1.0051.AR_17.72/2", "72/2", ring), L8: layers({ nisar: -16, water: 0.3 }) });
  const sel = core.select(point(...ring[0]));
  const before = core.items(sel);
  check("przed odpowiedzią: jeden wiersz w toku", before.length === 1 && before[0].pending && before[0].lvl === "info");
  await core.settle();
  const items = core.items(sel);
  const prog = items.find((it) => it.id === "dzialka:prog"), rw = items.find((it) => it.id === "dzialka:rwdz");
  check("zapytanie poszło do ULDK", calls.length === 1 && calls[0].startsWith("https://uldk.gugik.gov.pl/"));
  check("dwa wiersze: próg i rejestr", items.length === 2 && prog && rw, JSON.stringify(items.map((i) => i.id)));
  check("dwa sygnały -> próg wysoki (risk)", prog && prog.lvl === "risk" && prog.word === "próg: wysoki", prog && prog.word);
  check("wiersz progu należy do grupy radarowej (sar: yes)", prog && prog.sar === "yes");
  check("treść podaje NISAR, wodę i progi", prog && /NISAR, pasmo L: HH −16,0 dB \(próg −15/.test(prog.v) && /w 30% przelotów \(próg 20%\)/.test(prog.v), prog && prog.v);
  check("nagłówek treści: numer, gmina, obręb, pole", prog && /^Działka 72\/2, Poznań \(miasto\), obręb Poznań, [\d\s]+ m²\./.test(prog.v), prog && prog.v);
  check("treść mówi, z ilu komórek liczono (9)", prog && /Średnia z 9 komórek 73 m/.test(prog.v) && /Pozostałe poniżej progu: Sentinel-1: odbicie/.test(prog.v), prog && prog.v);
  check("rejestr: 2 × rozbudowa, ostatnia 2024", rw && rw.word === "2 decyzje" && /2 × rozbudowa; ostatnia w 2024/.test(rw.v), rw && rw.v);
  check("obrys działki przekazany do mapy", core.outlines.length === 1 && core.outlines[0].ring.length === 5);
  check("brak naruszeń kontraktu", core.problems(before.concat(items)).length === 0, core.problems(items).join("; "));
  check("nagłówek liczy 1 ostrzeżenie", core.flags(items) === 1);
  check("bez 'undefined' i 'NaN' w tekstach", !/undefined|NaN/.test(words(items)), words(items));

  core.setLang("en");
  const en = core.items(sel);
  check("EN: tytuł i poziom po angielsku", en[0].t === "Plot 72/2: ground from radar" && en[0].word === "level: high", en[0].t + " / " + en[0].word);
  check("EN: bez 'undefined' i 'NaN'", !/undefined|NaN/.test(words(en)), words(en));
  check("EN: brak naruszeń kontraktu", core.problems(en).length === 0);
}

// 3. Spokojna działka: wszystko poniżej progów, rejestr pusty dla tego numeru
{
  const { core } = setup({ text: uldk("306401_1.0051.AR_17.99", "99", bigRing) });
  const sel = core.select(point());
  await core.settle();
  const items = core.items(sel);
  check("bez sygnałów -> próg niski (ok)", items[0].lvl === "ok" && items[0].word === "próg: niski");
  check("treść wymienia progi wszystkich 4 sygnałów", /Wszystkie sygnały poniżej progu/.test(items[0].v) && /EGMS: ruch −1,0 mm\/rok/.test(items[0].v), items[0].v);
  check("rejestr: brak decyzji (info)", items[1].lvl === "info" && items[1].word === "brak decyzji");
  check("nagłówek liczy 0 ostrzeżeń", core.flags(items) === 0);
}

// 4. Mała działka: wynik z komórki pod środkiem, z uwagą o skali
{
  const { core } = setup({ text: uldk("306401_1.0051.AR_17.5", "5", smallRing), L8: layers({ wet: 0.6 }) });
  const sel = core.select(point());
  await core.settle();
  const items = core.items(sel);
  check("jeden sygnał (wilgoć) -> próg podwyższony (warn)", items[0].lvl === "warn" && /r 0,60 \(próg 0,39\)/.test(items[0].v), items[0].v);
  check("uwaga: działka mniejsza niż komórka radaru", /mniejsza niż komórka radaru \(73 m\)/.test(items[0].v), items[0].v);
}

// 5. Zmiana z radaru bez decyzji w rejestrze -> do sprawdzenia
{
  const { core } = setup({ text: uldk("306401_1.0051.AR_17.77", "77", bigRing), L8: layers({ rise: 4, dratio: 2 }) });
  const sel = core.select(point());
  await core.settle();
  const rw = core.items(sel).find((it) => it.id === "dzialka:rwdz");
  check("radar +4 dB, brak decyzji -> warn 'zmiana bez decyzji'", rw.lvl === "warn" && rw.word === "zmiana bez decyzji", rw.word);
  check("treść: ściany i ostrożne sformułowanie", /\+4,0 dB z odbiciem od nowych ścian/.test(rw.v) && /Warto sprawdzić/.test(rw.v), rw.v);
  check("wiersz łączy rejestr z radarem (sar: part)", rw.sar === "part");
}

// 6. Decyzja i radar się zgadzają
{
  const { core } = setup({ text: uldk("306401_1.0051.AR_17.3", "3", bigRing), L8: layers({ rise: 4 }) });
  const sel = core.select(point());
  await core.settle();
  const rw = core.items(sel).find((it) => it.id === "dzialka:rwdz");
  check("8 decyzji i potwierdzenie radaru", rw.lvl === "info" && rw.word === "8 decyzji" && /7 × nowy budynek, 1 × rozbiórka; ostatnia w 2026\. Radar/.test(rw.v), rw.word + " / " + rw.v);
}

// 7. Działka poza zasięgiem rejestru (Wolsztyn) i obręb bez pliku
{
  const { core } = setup({ text: uldk("302903_5.0015.174", "174", bigRing, "Rudno") });
  const sel = core.select(point());
  await core.settle();
  const rw = core.items(sel).find((it) => it.id === "dzialka:rwdz");
  check("poza Poznaniem i powiatem: 'poza zasięgiem'", rw.word === "poza zasięgiem");
  const s2 = setup({ text: uldk("306401_1.0099.12", "12", bigRing) });
  const sel2 = s2.core.select(point());
  await s2.core.settle();
  const rw2 = s2.core.items(sel2).find((it) => it.id === "dzialka:rwdz");
  check("obręb bez pliku w rejestrze: 'brak decyzji'", rw2.word === "brak decyzji");
}

// 8. Ostry NISAR z hires.json (24 m) w oknie miasta
{
  const hires = { layers: ["nisar_hh_med", "nisar_hv_med"], scale: 3, window: [0, 0, W, W] };
  const L8 = layers({ nisar: -9 });
  L8.hr_nisar_hh_med = new Uint8Array(W * 3 * W * 3).fill(enc.db(-17));
  const { core } = setup({ text: uldk("306401_1.0051.AR_17.99", "99", bigRing), L8, hires });
  const sel = core.select(point(...at(3, 3)));
  await core.settle();
  const it = core.items(sel)[0];
  check("w oknie miasta NISAR liczony z pikseli 24 m (−17 dB)", /HH −17,0 dB/.test(it.v) && /NISAR z 81 pikseli 24 m/.test(it.v), it.v);
}

// 9. Błędy usługi, brak działki, obszar zamiast punktu, HTML w danych
{
  const s1 = setup({ fetchImpl: async () => ({ ok: false, status: 503, text: async () => "" }) });
  const sel1 = s1.core.select(point());
  await s1.core.settle();
  const e = s1.core.items(sel1);
  check("HTTP 503 -> jeden wiersz 'błąd usługi' (info)", e.length === 1 && e[0].lvl === "info" && e[0].word === "błąd usługi");

  const s2 = setup({ text: fx("uldk_none.txt") });
  const sel2 = s2.core.select(point());
  await s2.core.settle();
  const n = s2.core.items(sel2);
  check("brak działki -> 'brak działki' (info)", n.length === 1 && n[0].word === "brak działki");

  const s3 = setup({ text: "" });
  const sel3 = s3.core.select({ kind: "area", lat: 52.4, lng: 16.9, ring: [], cells: [1] });
  await s3.core.settle();
  check("obszar zamiast punktu: moduł milczy", s3.core.items(sel3).length === 0);

  const s4 = setup({ text: uldk("306401_1.0051.<b>1", "<b>1", bigRing, "<img src=x onerror=alert(1)>") });
  const sel4 = s4.core.select(point());
  await s4.core.settle();
  const x = s4.core.items(sel4)[0];
  check("HTML z usługi jest uciekany w treści", !/<img|<b>/.test(x.v) && /&lt;img/.test(x.v), x.v);

  const s5 = setup({ fetchImpl: (url, { signal }) => new Promise((res, rej) => signal.addEventListener("abort", () => rej(new Error("abort")))) });
  const sel5 = s5.core.select(point());
  await s5.core.settle();
  const t = s5.core.items(sel5);
  check("brak odpowiedzi w 8 s -> 'brak odpowiedzi' (info)", t.length === 1 && t[0].word === "brak odpowiedzi", JSON.stringify(t));
}

console.log(failed ? `\n${failed} BŁĘDÓW` : "\nWszystko OK");
process.exit(failed ? 1 : 0);
