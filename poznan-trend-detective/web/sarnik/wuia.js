// Moduł SARnik „Plany budowlane obok” (wuia): decyzje i wnioski o nowe budynki i drogi z rejestru
// Wydziału Urbanistyki i Architektury (GEOPOZ, tylko miasto Poznań) w pobliżu wybranego miejsca.
// Kontrakt: docs/planwyd/KONTRAKT.md. Dane: web/data/sarnik/wuia/wuia.json (pipeline/sarnik_wuia.py).
// Granica miasta: web/data/areas.geojson (ten sam plik, który aplikacja już wczytuje).
// Testy: node poznan-trend-detective/tests/sarnik/wuia.test.mjs
(function () {
  const SK = window.SARNIK;
  if (!SK) return; // bez rdzenia moduł jest bezczynny

  // ---- progi i stałe ----
  const NAME = "wuia";
  const DATA_PATH = "sarnik/wuia/wuia.json";
  const AREAS_PATH = "areas.geojson";
  const CITY = "Poznań";          // rejestr obejmuje tylko miasto
  const RADIUS_M = 500;           // promień wokół punktu albo środka obszaru
  const NEAREST_N = 3;            // ile najbliższych spraw pokazać po rozwinięciu
  const DESC_MAX = 80;            // ile znaków opisu z rejestru pokazać
  const ROUND_M = 10;             // odległość zaokrąglana do tylu metrów
  const WARN_TYPES = ["hala", "droga"];                            // te podnoszą poziom do warn
  const TYPES = ["hala", "droga", "wielorodzinny", "jednorodzinny", "uslugi"]; // jak w pliku danych
  const STATUSES = ["dec", "wni", "odm"];
  const REFUSED = "odm";          // sprzeciw albo odmowa: pokazywane osobno, nigdy nie podnoszą poziomu
  const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const M_PER_DEG = 111195;

  // ---- czyste funkcje (testowane w Node) ----
  // Uszkodzony albo pusty plik to błąd (wiersz „nie udało się wczytać”), a nie „nic się nie planuje”.
  function parseData(json) {
    if (!json || json.v !== 1 || !Array.isArray(json.rows) || !Array.isArray(json.cols)) throw new Error("wuia: zły format danych");
    if (!json.rows.length) throw new Error("wuia: pusty rejestr");
    if (!Array.isArray(json.dates) || json.dates.length !== 2 || !json.dates.every((d) => RE_DATE.test(String(d)))) throw new Error("wuia: brak zakresu dat");
    const ix = {};
    ["lat", "lng", "date", "status", "type", "desc"].forEach((c) => {
      ix[c] = json.cols.indexOf(c);
      if (ix[c] < 0) throw new Error("wuia: brak kolumny " + c);
    });
    const has = (v) => v != null && v !== "" && typeof v !== "boolean";
    const rows = json.rows
      .filter((r) => Array.isArray(r) && has(r[ix.lat]) && has(r[ix.lng]))
      .map((r) => ({
        lat: +r[ix.lat], lng: +r[ix.lng], date: String(r[ix.date]), st: String(r[ix.status]),
        type: String(r[ix.type]), desc: r[ix.desc] == null ? "" : String(r[ix.desc]),
      }))
      .filter((r) => isFinite(r.lat) && isFinite(r.lng) && RE_DATE.test(r.date) && TYPES.indexOf(r.type) >= 0 && STATUSES.indexOf(r.st) >= 0);
    if (!rows.length) throw new Error("wuia: brak poprawnych wierszy");
    return { rows, dates: json.dates.map(String) };
  }

  // granica miasta z areas.geojson: lista pierścieni [[lat, lng], …] albo null
  function parseCity(geo) {
    const f = geo && Array.isArray(geo.features) && geo.features.find((x) => x && x.properties && x.properties.name === CITY);
    const g = f && f.geometry;
    if (!g) return null;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    const rings = polys.filter((p) => Array.isArray(p) && Array.isArray(p[0]) && p[0].length >= 3).map((p) => p[0].map((c) => [+c[1], +c[0]]));
    return rings.length ? { rings } : null;
  }

  // punkt w wielokącie, ring = [[lat, lng], …]
  function inRing(lat, lng, ring) {
    if (!ring || ring.length < 3) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [yi, xi] = ring[i], [yj, xj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // odległość w metrach od punktu do najbliższego brzegu pierścieni (płasko, wystarcza na kilometry)
  function distToEdge(lat, lng, rings) {
    const kx = M_PER_DEG * Math.cos((lat * Math.PI) / 180), ky = M_PER_DEG;
    let best = Infinity;
    rings.forEach((ring) => {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const ax = (ring[j][1] - lng) * kx, ay = (ring[j][0] - lat) * ky, bx = (ring[i][1] - lng) * kx, by = (ring[i][0] - lat) * ky;
        const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
        const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
        best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
      }
    });
    return best;
  }

  // czy cały sprawdzany teren (koło 500 m, a dla obszaru także obszar) leży w mieście:
  // "full" -> tak, "edge" -> część jest poza miastem, "unknown" -> granica się nie wczytała
  function coverage(sel, city, radius = RADIUS_M) {
    if (!city) return "unknown";
    const inCity = (lat, lng) => city.rings.some((r) => inRing(lat, lng, r));
    if (!inCity(sel.lat, sel.lng) || distToEdge(sel.lat, sel.lng, city.rings) < radius) return "edge";
    if (sel.kind === "area" && (sel.ring || []).some((p) => !inCity(p[0], p[1]))) return "edge";
    return "full";
  }

  // sprawy w zasięgu: punkt -> do radius od punktu; obszar -> w obszarze albo do radius od środka.
  // Wynik posortowany od najbliższej; każda sprawa ma d (metry od punktu/środka) i inside (w obszarze).
  function nearby(rows, sel, distM, radius = RADIUS_M) {
    const area = sel.kind === "area";
    const out = [];
    rows.forEach((r) => {
      const d = distM(sel.lat, sel.lng, r.lat, r.lng);
      const inside = area && inRing(r.lat, r.lng, sel.ring);
      if (d <= radius || inside) out.push(Object.assign({}, r, { d, inside }));
    });
    return out.sort((a, b) => a.d - b.d);
  }

  // ocena: odmowy i sprzeciwy osobno; poziom tylko ze spraw czynnych (decyzje i wnioski)
  function summarise(list) {
    const active = list.filter((r) => r.st !== REFUSED);
    const refused = list.filter((r) => r.st === REFUSED);
    const byType = {};
    active.forEach((r) => { byType[r.type] = (byType[r.type] || 0) + 1; });
    const nDec = active.filter((r) => r.st === "dec").length, nWni = active.length - nDec;
    const lvl = active.some((r) => WARN_TYPES.indexOf(r.type) >= 0) ? "warn" : active.length ? "info" : "ok";
    return { lvl, active, refused, byType, nDec, nWni, nearest: active.slice(0, NEAREST_N), nearestRefused: refused.slice(0, NEAREST_N) };
  }

  const shorten = (s, n = DESC_MAX) => {
    s = String(s || "").replace(/\s+/g, " ").trim();
    if (s.length <= n) return s;
    const cut = s.slice(0, n - 1), sp = cut.lastIndexOf(" ");
    return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;(–-]+$/, "") + "…";
  };

  // ---- teksty ----
  // polska liczba mnoga: 1 decyzja, 2–4 decyzje (bez 12–14), 5 decyzji
  const plIsFew = (n) => n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  const plForm = (n, one, few, many) => (n === 1 ? one : plIsFew(n) ? few : many);
  const plFew = (n, one, few, many) => `${n} ${plForm(n, one, few, many)}`;
  const MON_PL = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  const MON_PL_NOM = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
  const MON_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const ymd = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); return m ? [+m[1], +m[2], +m[3]] : null; };
  const pad = (n) => String(n).padStart(2, "0");
  // „czerwiec–listopad 2026” albo „grudzień 2025 – marzec 2026”
  const span = (dates, MON) => {
    const x = dates && ymd(dates[0]), y = dates && ymd(dates[1]);
    if (!x || !y) return "";
    return x[0] === y[0] ? `${MON[x[1] - 1]}–${MON[y[1] - 1]} ${y[0]}` : `${MON[x[1] - 1]} ${x[0]} – ${MON[y[1] - 1]} ${y[0]}`;
  };

  const pl = {
    title: "Plany budowlane obok (urząd miasta)",
    checking: "Sprawdzam decyzje budowlane urzędu miasta…",
    src: (dates) => `Rejestr Wydziału Urbanistyki i Architektury UM Poznania (GEOPOZ), ${span(dates, MON_PL_NOM) ? span(dates, MON_PL_NOM) + ", " : ""}tylko miasto Poznań`,
    outside: "Rejestr decyzji budowlanych obejmuje tylko miasto Poznań, więc nie wiemy, co się tu planuje. Zapytaj w urzędzie gminy albo w starostwie.",
    outsideNear: (area, parts, counts) => `${area ? "Ten obszar leży" : "To miejsce leży"} poza Poznaniem, a rejestr obejmuje tylko miasto, więc o plany tutaj zapytaj w urzędzie gminy. Po stronie Poznania, ${area ? `w obszarze lub do ${RADIUS_M} m od jego środka` : `do ${RADIUS_M} m stąd`}, rejestr ma ${parts}: ${counts}.`,
    unavailable: "Nie udało się wczytać rejestru decyzji budowlanych. To nie znaczy, że nic się tu nie planuje.",
    range: (a, b) => {
      const x = ymd(a), y = ymd(b);
      if (!x || !y) return "";
      return `od ${x[2]} ${MON_PL[x[1] - 1]}${x[0] !== y[0] ? " " + x[0] : ""} do ${y[2]} ${MON_PL[y[1] - 1]} ${y[0]}`;
    },
    date: (s) => { const x = ymd(s); return x ? `${pad(x[2])}.${pad(x[1])}.${x[0]}` : ""; },
    where: (area) => (area ? `W zaznaczonym obszarze lub do ${RADIUS_M} m od jego środka` : `Do ${RADIUS_M} m stąd`),
    parts: (nDec, nWni) => [nDec && plFew(nDec, "decyzję", "decyzje", "decyzji"), nWni && plFew(nWni, "wniosek", "wnioski", "wniosków")].filter(Boolean).join(" i "),
    none: (area, range) => `${pl.where(area)} rejestr miasta nie ma decyzji ani wniosków o nowe domy, bloki, hale, budynki usługowe ani drogi (${range}).`,
    anyDay: "Nowa sprawa może pojawić się w każdej chwili.",
    edge: "Część okolicy leży jednak poza Poznaniem, a tam rejestr nie sięga.",
    cityOnly: "Rejestr obejmuje tylko teren w granicach miasta.",
    some: (area, parts, counts) => `${pl.where(area)} rejestr miasta ma ${parts}: ${counts}.`,
    paper: (range, warn) => `To dokumenty z urzędu (${range}), a nie place budowy${warn ? "; zapytaj w urzędzie, co dokładnie ma tu powstać" : ": budowa mogła jeszcze nie ruszyć"}.`,
    refused: (n) => `Urząd odmówił albo wniósł sprzeciw w ${n} ${n === 1 ? "sprawie" : "sprawach"}.`,
    type: {
      hala: ["hala lub magazyn", "hale lub magazyny", "hal lub magazynów"], droga: ["droga", "drogi", "dróg"],
      wielorodzinny: ["blok mieszkalny", "bloki mieszkalne", "bloków mieszkalnych"],
      jednorodzinny: ["dom jednorodzinny", "domy jednorodzinne", "domów jednorodzinnych"],
      uslugi: ["budynek usługowy", "budynki usługowe", "budynków usługowych"],
    },
    count: (n, f) => plFew(n, f[0], f[1], f[2]),
    status: { dec: "decyzja", wni: "wniosek", odm: "sprzeciw lub odmowa" },
    dist: (m) => `ok. ${m} m`,
    inArea: "w obszarze",
    nearestH: (n) => `Najbliżej (${n})`,
    refusedH: (n) => `Odmowy i sprzeciwy (${n})`,
  };
  const en = {
    title: "Building plans nearby (city office)",
    checking: "Checking the city's building decisions…",
    src: (dates) => `Poznań City Hall planning department register (GEOPOZ), ${span(dates, MON_EN) ? span(dates, MON_EN) + ", " : ""}city of Poznań only`,
    outside: "The building-decision register covers only the city of Poznań, so we do not know what is planned here. Ask the local council or the county office.",
    outsideNear: (area, parts, counts) => `${area ? "This area lies" : "This place lies"} outside Poznań and the register covers only the city, so ask the local council about plans here. On the Poznań side, ${area ? `in the area or within ${RADIUS_M} m of its centre` : `within ${RADIUS_M} m`}, the register has ${parts}: ${counts}.`,
    unavailable: "The building-decision register could not be loaded. That does not mean nothing is planned here; try again later.",
    range: (a, b) => {
      const x = ymd(a), y = ymd(b);
      if (!x || !y) return "";
      return `${x[2]} ${MON_EN[x[1] - 1]}${x[0] !== y[0] ? " " + x[0] : ""} to ${y[2]} ${MON_EN[y[1] - 1]} ${y[0]}`;
    },
    date: (s) => { const x = ymd(s); return x ? `${x[2]} ${MON_EN[x[1] - 1].slice(0, 3)} ${x[0]}` : ""; },
    where: (area) => (area ? `In the drawn area or within ${RADIUS_M} m of its centre` : `Within ${RADIUS_M} m of this place`),
    parts: (nDec, nWni) => [nDec && (nDec === 1 ? "1 decision" : nDec + " decisions"), nWni && (nWni === 1 ? "1 application" : nWni + " applications")].filter(Boolean).join(" and "),
    none: (area, range) => `${en.where(area)}, the city register has no decisions or applications for new houses, blocks of flats, warehouses, commercial buildings or roads (${range}).`,
    anyDay: "A new one can be filed any day.",
    edge: "Part of the surroundings lies outside Poznań, though, where the register does not reach.",
    cityOnly: "The register covers only land inside the city limits.",
    some: (area, parts, counts) => `${en.where(area)}, the city register has ${parts}: ${counts}.`,
    paper: (range, warn) => `This is paperwork from the city office (${range}), not building sites${warn ? "; ask the planning office what exactly is to be built here" : ": work may not have started yet"}.`,
    refused: (n) => `The office refused or objected in ${n === 1 ? "1 case" : n + " cases"}.`,
    type: {
      hala: ["warehouse or industrial hall", "warehouses or industrial halls"], droga: ["road", "roads"],
      wielorodzinny: ["block of flats", "blocks of flats"], jednorodzinny: ["house", "houses"],
      uslugi: ["commercial building", "commercial buildings"],
    },
    count: (n, f) => `${n} ${n === 1 ? f[0] : f[1]}`,
    status: { dec: "decision", wni: "application", odm: "objection or refusal" },
    dist: (m) => `about ${m} m`,
    inArea: "in the area",
    nearestH: (n) => `Nearest (${n})`,
    refusedH: (n) => `Refusals and objections (${n})`,
  };

  // „2 drogi, 17 domów jednorodzinnych” w kolejności TYPES
  const counts = (sum, s) => TYPES.filter((t) => sum.byType[t]).map((t) => s.count(sum.byType[t], s.type[t])).join(", ");

  // lista najbliższych spraw i uwagi, zwinięte pod <details>, żeby treść wiersza miała dwa zdania
  function details(sum, s, ctx, notes) {
    const list = sum.active.length ? sum.nearest : sum.nearestRefused;
    const n = sum.active.length || sum.refused.length;
    const items = list.map((r) => {
      const where = r.inside ? s.inArea : s.dist(ctx.fmtInt(Math.max(ROUND_M, Math.round(r.d / ROUND_M) * ROUND_M)));
      const desc = r.desc ? `: <span lang="pl">${ctx.esc(shorten(r.desc))}</span>` : "";
      return `<li><b>${s.type[r.type][0]}</b>, ${where}, ${s.status[r.st]} ${s.date(r.date)}${desc}</li>`;
    }).join("");
    const extra = notes.filter(Boolean).map((t) => `<p class="sk-wuia-note">${t}</p>`).join("");
    if (!items && !extra) return "";
    const head = sum.active.length ? s.nearestH(n) : sum.refused.length ? s.refusedH(n) : "";
    return ` <details class="sk-wuia-more"><summary>${head || s.nearestH(0)}</summary>${items ? `<ul class="sk-wuia-near">${items}</ul>` : ""}${extra}</details>`;
  }

  // treść wiersza w mieście (HTML; opis z rejestru przechodzi przez esc)
  function render(sum, sel, data, s, ctx, cov) {
    const area = sel.kind === "area";
    const range = s.range(data.dates[0], data.dates[1]);
    const nr = sum.refused.length;
    if (!sum.active.length) {
      const tail = cov === "full" ? s.anyDay : cov === "edge" ? s.edge : s.cityOnly;
      return `${s.none(area, range)} ${tail}` + (nr ? details(sum, s, ctx, [s.refused(nr)]) : "");
    }
    return `${s.some(area, s.parts(sum.nDec, sum.nWni), counts(sum, s))} ${s.paper(range, sum.lvl === "warn")}` +
      details(sum, s, ctx, [nr && s.refused(nr), cov !== "full" && (cov === "edge" ? s.edge : s.cityOnly)]);
  }

  // poziom i treść dla wybranego miejsca, gdy dane są wczytane
  function assess(sel, data, s, ctx) {
    const area = sel.kind === "area";
    const sum = summarise(nearby(data.rows, sel, ctx.distM));
    if (sel.area !== CITY) {
      // poza miastem rejestr nic nie wie; sprawy z pliku leżą w Poznaniu, więc pokazujemy je tylko jako sąsiedztwo
      if (!sum.active.length) return { lvl: "info", v: s.outside };
      return { lvl: "info", v: s.outsideNear(area, s.parts(sum.nDec, sum.nWni), counts(sum, s)) + details(sum, s, ctx, [sum.refused.length && s.refused(sum.refused.length)]) };
    }
    const cov = coverage(sel, data.city);
    const lvl = sum.active.length ? sum.lvl : cov === "full" ? "ok" : "info"; // brak pełnych danych nigdy nie jest „ok”
    return { lvl, v: render(sum, sel, data, s, ctx, cov) };
  }

  const memo = (fn) => { let raw, out; return (json) => { if (json !== raw) { out = fn(json); raw = json; } return out; }; };
  const parseCached = memo(parseData);
  const cityCached = memo(parseCity);

  SK.register(NAME, {
    pure: { parseData, parseCity, inRing, distToEdge, coverage, nearby, summarise, shorten, RADIUS_M, NEAREST_N, WARN_TYPES, TYPES },
    i18n: { pl, en },
    onSelect(sel, ctx) {
      if (!sel.area) return; // poza obszarem badań nie ma czego szukać
      ctx.fetchOnce(sel, NAME, () => Promise.all([
        ctx.loadJSON(DATA_PATH).then(parseCached),
        ctx.loadJSON(AREAS_PATH).then(cityCached).catch(() => null), // bez granicy: brak „ok”, tylko info
      ]).then(([reg, city]) => ({ rows: reg.rows, dates: reg.dates, city })));
    },
    checks(sel, ctx) {
      const s = ctx.t(NAME);
      const r = sel.ext && sel.ext[NAME];
      const data = r && r.st === "ok" ? r.data : null;
      const row = (lvl, v, extra) => Object.assign({ id: "plan", lvl, t: s.title, v, src: s.src(data && data.dates), sar: "no" }, extra || {});
      if (sel.area !== CITY && !data) return row("info", s.outside); // poza miastem: od razu, bez „sprawdzam”
      if (!r || r.st === "loading") return row("info", s.checking, { pending: true });
      if (!data) return row("info", s.unavailable);
      const a = assess(sel, data, s, ctx);
      return row(a.lvl, a.v);
    },
  });
})();
