// Moduł SARnik: działka ewidencyjna i próg zagrożenia gruntu z radaru
// Kontrakt: docs/planwyd/KONTRAKT.md
//
// Po kliknięciu punktu:
//   1. ULDK (GUGiK) zwraca działkę pod punktem: numer, obręb, granicę (usługa publiczna, CORS *),
//   2. granica wyznacza komórki radaru wewnątrz działki (siatka 120 m; NISAR w mieście 24 m z hires.json),
//   3. cztery sygnały radarowe porównane z progami dają poziom: niski / podwyższony / wysoki,
//   4. rejestr GUNB RWDZ (decyzje i zgłoszenia od 2016, Poznań i powiat) mówi, co na tej działce budowano.
(function () {
  const SK = window.SARNIK;
  if (!SK) return; // bez rdzenia moduł jest bezczynny

  const ULDK = "https://uldk.gugik.gov.pl/";
  const WMS = "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow";
  // Progi. NISAR: w komórkach, które Sentinel-1 widzi jako wodę w co najmniej połowie przelotów, mediana HH z NISAR
  // wynosi -15,3 dB; tak ciemne jest tylko 1,7% obszaru badań. Woda i wilgoć: te same progi co karta miejsca.
  const LIM = { nisarDb: -15, water: 0.2, sinkMm: -2, riseDb: 3 };
  const LAYERS = ["nisar_hh_med", "sar_water", "sar_wet", "sar_egms", "sar_change", "sar_dratio"];
  const R_MERC = 6378137;

  // dekodowanie szarości (data/land/sar.json, pole decode)
  const dbOf = (v) => (v ? v / 6 - 30 : NaN);
  const changeOf = (v) => (v ? v / 12.75 - 10 : NaN);
  const wetOf = (v) => (v ? (v - 1) / 127 - 1 : NaN);
  const waterOf = (v) => (v ? (v - 1) / 254 : NaN);
  const egmsOf = (v) => (v ? v - 100 : NaN);

  const buildUrl = (lat, lng) =>
    `${ULDK}?request=GetParcelByXY&xy=${Number(lng).toFixed(6)},${Number(lat).toFixed(6)},4326` +
    "&result=teryt,commune,region,parcel,geom_wkt&srid=4326";

  // "0\n<teryt>|<gmina>|<obręb>|<numer>|SRID=4326;POLYGON((lng lat,...))"; null, gdy nie ma działki
  function parse(text) {
    if (typeof text !== "string") return null;
    const lines = text.trim().split("\n");
    if (lines.length < 2 || lines[0].trim() !== "0") return null;
    const f = lines[1].split("|");
    if (f.length < 5) return null;
    const [id, commune, region, number] = f.map((s) => s.trim());
    const m = /\(\(([^()]+)\)/.exec(f.slice(4).join("|")); // zewnętrzny pierścień (POLYGON i MULTIPOLYGON)
    if (!m) return null;
    const ring = m[1].split(",").map((p) => p.trim().split(/\s+/).map(Number))
      .filter((p) => p.length >= 2 && isFinite(p[0]) && isFinite(p[1])).map(([x, y]) => [y, x]);
    const parts = id.split(".");
    if (ring.length < 3 || parts.length < 3) return null;
    return { id, unit: parts[0], obreb: parts[1], number: number || parts[parts.length - 1], commune, region, ring };
  }

  const districtKey = (p) => `${p.unit}_${p.obreb}`;

  // wiersz rejestru: "<numer>,<nowe>,<rozbudowy>,<rozbiórki>,<rok - 2000>"
  function findPermits(rows, number) {
    if (typeof rows !== "string" || !number) return null;
    const head = number + ",";
    for (const line of rows.split("\n")) {
      if (!line.startsWith(head)) continue;
      const [, a, b, c, y] = line.split(",").map((s) => Number(s || 0));
      return { new: a, ext: b, demol: c, year: y ? 2000 + y : null, total: a + b + c };
    }
    return null;
  }

  function inRing(ring, lat, lng) { // ring: [[lat, lng], ...]
    let ins = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [yi, xi] = ring[i], [yj, xj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }
  function bbox(ring) {
    let s = 90, n = -90, w = 180, e = -180;
    for (const [la, lo] of ring) { s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, lo); e = Math.max(e, lo); }
    return { s, n, w, e };
  }
  function centroid(ring) {
    let la = 0, lo = 0;
    for (const p of ring) { la += p[0]; lo += p[1]; }
    return [la / ring.length, lo / ring.length];
  }
  function areaM2(ring) { // shoelace w metrach lokalnych
    const lat0 = centroid(ring)[0] * (Math.PI / 180), kx = 111320 * Math.cos(lat0), ky = 110540;
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][1] * kx * ring[i][0] * ky - ring[i][1] * kx * ring[j][0] * ky;
    return Math.abs(a / 2);
  }
  const merc = (lat, lng) => [R_MERC * lng * Math.PI / 180, R_MERC * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];
  const unmerc = (x, y) => [(2 * Math.atan(Math.exp(y / R_MERC)) - Math.PI / 2) * 180 / Math.PI, (x / R_MERC) * 180 / Math.PI];

  // komórki siatki 120 m, których środek leży w działce; dla małej działki komórka pod jej środkiem
  function cellsIn(ring, ctx) {
    const b = bbox(ring), tl = ctx.landCell(b.n, b.w), br = ctx.landCell(b.s, b.e), W = ctx.land.width;
    const out = [];
    if (tl && br && (br.row - tl.row + 1) * (br.col - tl.col + 1) <= 40000) {
      for (let r = tl.row; r <= br.row; r++) for (let c = tl.col; c <= br.col; c++) {
        const i = r * W + c, [la, lo] = ctx.cellCentre(i);
        if (inRing(ring, la, lo)) out.push(i);
      }
    }
    if (out.length) return { cells: out, inside: true };
    const [la, lo] = centroid(ring), c = ctx.landCell(la, lo);
    return { cells: c ? [c.i] : [], inside: false };
  }

  // piksele ostrego obrazu NISAR (hires.json: okno miasta, 3 razy gęściej); null poza oknem
  function hiresIn(ring, land, hi) {
    if (!hi || !land || !land.transform3857 || !Array.isArray(hi.window)) return null;
    const [a, , c, , e, f] = land.transform3857, S = hi.scale, [c0, r0, cw, ch] = hi.window;
    const pa = a / S, pe = e / S, x0 = c + c0 * a, y0 = f + r0 * e, w = cw * S, h = ch * S;
    const at = (lat, lng) => { const [x, y] = merc(lat, lng); return [Math.floor((x - x0) / pa), Math.floor((y - y0) / pe)]; };
    const b = bbox(ring), [cA, rA] = at(b.n, b.w), [cB, rB] = at(b.s, b.e);
    const out = [];
    if ((rB - rA + 1) * (cB - cA + 1) <= 90000) {
      for (let r = Math.max(rA, 0); r <= Math.min(rB, h - 1); r++) for (let col = Math.max(cA, 0); col <= Math.min(cB, w - 1); col++) {
        const [la, lo] = unmerc(x0 + (col + 0.5) * pa, y0 + (r + 0.5) * pe);
        if (inRing(ring, la, lo)) out.push(r * w + col);
      }
    }
    if (out.length) return out;
    const [cc, rr] = at(...centroid(ring));
    return cc >= 0 && rr >= 0 && cc < w && rr < h ? [rr * w + cc] : null;
  }

  const meanOf = (arr, idx, dec) => {
    let s = 0, n = 0;
    for (const i of idx) { const v = arr && arr[i]; if (v) { s += dec(v); n++; } }
    return n ? s / n : NaN;
  };
  const powMeanDb = (arr, idx) => { // średnia w mocy, wynik w dB
    let s = 0, n = 0;
    for (const i of idx) { const v = arr && arr[i]; if (v) { s += 10 ** (dbOf(v) / 10); n++; } }
    return n ? 10 * Math.log10(s / n) : NaN;
  };

  // pomiar radarowy działki z warstw już załadowanych do L8
  function measure(parcel, ctx, hi) {
    const L = ctx.L8, { cells, inside } = cellsIn(parcel.ring, ctx);
    const hr = L.hr_nisar_hh_med ? hiresIn(parcel.ring, ctx.land, hi) : null;
    const dr = (ctx.sar && ctx.sar.s1 && ctx.sar.s1.wall_db) || 1.5;
    let walls = false;
    for (const i of cells) if (L.sar_change && L.sar_dratio && changeOf(L.sar_change[i]) >= LIM.riseDb && changeOf(L.sar_dratio[i]) >= dr) walls = true;
    return {
      cells: cells.length, inside, nisarPx: hr ? hr.length : 0,
      nisar: hr ? powMeanDb(L.hr_nisar_hh_med, hr) : powMeanDb(L.nisar_hh_med, cells),
      water: meanOf(L.sar_water, cells, waterOf),
      wet: meanOf(L.sar_wet, cells, wetOf),
      egms: meanOf(L.sar_egms, cells, egmsOf),
      rise: meanOf(L.sar_change, cells, changeOf),
      walls,
    };
  }

  // sygnały powyżej progu i poziom: 0 = niski, 1 = podwyższony, 2 i więcej = wysoki
  function grade(m, rCrit) {
    const rc = isFinite(rCrit) ? rCrit : 0.388;
    const sig = [
      { k: "nisar", v: m.nisar, on: m.nisar <= LIM.nisarDb },
      { k: "water", v: m.water, on: m.water >= LIM.water },
      { k: "wet", v: m.wet, on: m.wet > rc },
      { k: "sink", v: m.egms, on: m.egms <= LIM.sinkMm },
    ].filter((s) => isFinite(s.v));
    const hits = sig.filter((s) => s.on);
    const lvl = !sig.length ? "info" : hits.length >= 2 ? "risk" : hits.length === 1 ? "warn" : "ok";
    return { lvl, sig, hits: hits.length, rc };
  }

  const plural = (n, one, few, many) => {
    if (n === 1) return one;
    const d = n % 10, dd = n % 100;
    return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
  };

  SK.register("dzialka", {
    pure: { parse, buildUrl, findPermits, grade, inRing, areaM2, districtKey, hiresIn, LIM },
    // granice działek z krajowej integracji ewidencji (GUGiK), tylko przy dużym przybliżeniu
    overlay: { wms: WMS, layers: "dzialki,numery_dzialek", minZoom: 16, attribution: "Działki &copy; GUGiK (KIEG)" },
    i18n: {
      pl: {
        title: "Grunt działki z radaru",
        titleP: (n) => `Działka ${n}: grunt z radaru`,
        checking_word: "szukam działki…",
        checking: "Szukam działki w ewidencji GUGiK i liczę sygnały radaru na jej obszarze…",
        timeout_word: "brak odpowiedzi",
        timeout_msg: "Usługa ULDK (GUGiK) nie odpowiedziała w 8 sekund. Spróbuj kliknąć jeszcze raz.",
        error_word: "błąd usługi",
        error_msg: "Nie udało się połączyć z usługą działek ULDK (GUGiK).",
        none_word: "brak działki",
        none_msg: "W tym punkcie ULDK nie zwraca działki ewidencyjnej.",
        radar_wait: "Ładuję warstwy radaru…",
        nodata_word: "brak danych radaru",
        nodata_msg: "Radar nie ma pomiaru na obszarze tej działki.",
        radar_fail: "Nie udało się wczytać warstw radaru.",
        lvl: { ok: "próg: niski", warn: "próg: podwyższony", risk: "próg: wysoki" },
        parcel: (p, a) => `Działka ${p.number}, ${p.commune}, obręb ${p.region}, ${a} m².`,
        hit: "Ponad progiem:",
        calm: "Wszystkie sygnały poniżej progu:",
        rest: "Pozostałe poniżej progu:",
        sig: {
          nisar: (v) => `NISAR, pasmo L: HH ${v} dB (próg −15, ciemno jak woda)`,
          water: (v) => `Sentinel-1: ciemno jak woda w ${v}% przelotów (próg 20%)`,
          wet: (v, rc) => `Sentinel-1: odbicie rośnie z wilgocią gleby, r ${v} (próg ${rc})`,
          sink: (v) => `EGMS: ruch ${v} mm/rok (próg −2)`,
        },
        small: (n) => `Działka mniejsza niż komórka radaru (73 m), więc wynik dotyczy też sąsiedztwa${n ? `; NISAR liczony z ${n} ${plural(n, "piksela", "pikseli", "pikseli")} 24 m` : ""}.`,
        cells: (n, px) => `Średnia z ${n} ${plural(n, "komórki", "komórek", "komórek")} 73 m${px ? `, NISAR z ${px} ${plural(px, "piksela", "pikseli", "pikseli")} 24 m` : ""}.`,
        src: "ULDK GUGiK; NISAR GCOV (NASA-ISRO), Sentinel-1 RTC, EGMS (Copernicus)",
        // rejestr pozwoleń
        rwdz_title: "Budowy na działce (GUNB)",
        rwdz_out_word: "poza zasięgiem",
        rwdz_out: "Rejestr pozwoleń jest wczytany dla Poznania i powiatu poznańskiego.",
        rwdz_fail_word: "brak danych",
        rwdz_fail: "Nie udało się wczytać rejestru pozwoleń dla tego obrębu.",
        rwdz_none_word: "brak decyzji",
        rwdz_none: "Rejestr GUNB nie ma dla tej działki decyzji ani zgłoszeń budowy od 2016 roku.",
        rwdz_word: (n) => `${n} ${plural(n, "decyzja", "decyzje", "decyzji")}`,
        rwdz_list: (r) => [r.new ? `${r.new} × nowy budynek` : "", r.ext ? `${r.ext} × rozbudowa` : "", r.demol ? `${r.demol} × rozbiórka` : ""]
          .filter(Boolean).join(", ") + (r.year ? `; ostatnia w ${r.year}.` : "."),
        rwdz_since: "Od 2016: ",
        radar_rise: (v, walls) => ` Radar Sentinel-1 rok do roku: ${v} dB${walls ? ", z odbiciem od nowych ścian" : ""}, coś tu stanęło.`,
        rwdz_gap_word: "zmiana bez decyzji",
        rwdz_gap: (v, walls) => `Radar Sentinel-1 widzi tu rok do roku ${v} dB${walls ? " z odbiciem od nowych ścian" : ""}, a rejestr GUNB nie ma dla tej działki decyzji. Warto sprawdzić: zgłoszenie mogło trafić pod sąsiedni numer.`,
        near: " Działka jest mniejsza niż komórka radaru, więc zmiana może być u sąsiada.",
        rwdz_src: "GUNB RWDZ (stan 14.11.2026)",
      },
      en: {
        title: "Plot ground from radar",
        titleP: (n) => `Plot ${n}: ground from radar`,
        checking_word: "finding the plot…",
        checking: "Looking up the land-register plot (GUGiK) and reading the radar signals over it…",
        timeout_word: "no response",
        timeout_msg: "The ULDK service (GUGiK) did not answer within 8 seconds. Try clicking again.",
        error_word: "service error",
        error_msg: "Could not reach the ULDK plot service (GUGiK).",
        none_word: "no plot",
        none_msg: "ULDK returns no land-register plot at this point.",
        radar_wait: "Loading the radar layers…",
        nodata_word: "no radar data",
        nodata_msg: "The radar has no measurement over this plot.",
        radar_fail: "Could not load the radar layers.",
        lvl: { ok: "level: low", warn: "level: raised", risk: "level: high" },
        parcel: (p, a) => `Plot ${p.number}, ${p.commune}, precinct ${p.region}, ${a} m².`,
        hit: "Above the threshold:",
        calm: "All signals below the threshold:",
        rest: "The rest below the threshold:",
        sig: {
          nisar: (v) => `NISAR, L-band: HH ${v} dB (threshold −15, as dark as water)`,
          water: (v) => `Sentinel-1: as dark as water in ${v}% of passes (threshold 20%)`,
          wet: (v, rc) => `Sentinel-1: backscatter rises with soil wetness, r ${v} (threshold ${rc})`,
          sink: (v) => `EGMS: motion ${v} mm/yr (threshold −2)`,
        },
        small: (n) => `The plot is smaller than a radar cell (73 m), so the result also covers its surroundings${n ? `; NISAR from ${n} pixel${n === 1 ? "" : "s"} of 24 m` : ""}.`,
        cells: (n, px) => `Mean of ${n} cell${n === 1 ? "" : "s"} of 73 m${px ? `, NISAR from ${px} pixel${px === 1 ? "" : "s"} of 24 m` : ""}.`,
        src: "ULDK GUGiK; NISAR GCOV (NASA-ISRO), Sentinel-1 RTC, EGMS (Copernicus)",
        rwdz_title: "Building work on the plot (GUNB)",
        rwdz_out_word: "outside coverage",
        rwdz_out: "The permit register is loaded for Poznań and Poznań county.",
        rwdz_fail_word: "no data",
        rwdz_fail: "Could not load the permit register for this precinct.",
        rwdz_none_word: "no decisions",
        rwdz_none: "The GUNB register has no building decision or notification for this plot since 2016.",
        rwdz_word: (n) => `${n} decision${n === 1 ? "" : "s"}`,
        rwdz_list: (r) => [r.new ? `${r.new} × new building` : "", r.ext ? `${r.ext} × extension` : "", r.demol ? `${r.demol} × demolition` : ""]
          .filter(Boolean).join(", ") + (r.year ? `; latest in ${r.year}.` : "."),
        rwdz_since: "Since 2016: ",
        radar_rise: (v, walls) => ` Sentinel-1 radar, year on year: ${v} dB${walls ? ", with a bounce off new walls" : ""}: something was built.`,
        rwdz_gap_word: "change without a decision",
        rwdz_gap: (v, walls) => `Sentinel-1 radar sees ${v} dB year on year here${walls ? ", with a bounce off new walls" : ""}, but the GUNB register has no decision for this plot. Worth checking: the case may be filed under a neighbouring number.`,
        near: " The plot is smaller than a radar cell, so the change may be next door.",
        rwdz_src: "GUNB RWDZ (as of 14 Nov 2026)",
      },
    },

    onSelect(sel, ctx) {
      if (!sel || sel.kind !== "point" || sel.lat == null || sel.lng == null) return;
      // warstwy radaru (część jest już załadowana przez kartę miejsca) i ostry NISAR, jeśli punkt leży w oknie miasta
      ctx.fetchOnce(sel, "dzialkaSar", () => Promise.all(LAYERS.map((n) => ctx.loadGray(n)))
        .then(() => ctx.loadJSON("land/hires.json").catch(() => null))
        .then((hi) => (hi && (hi.layers || []).includes("nisar_hh_med") && hiresIn([[sel.lat, sel.lng], [sel.lat, sel.lng], [sel.lat, sel.lng]], ctx.land, hi)
          ? ctx.loadGray("hr_nisar_hh_med").then(() => hi, () => null) : null)), 20000);
      ctx.fetchOnce(sel, "dzialka", (signal) => fetch(buildUrl(sel.lat, sel.lng), { signal })
        .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
        .then((text) => {
          const parcel = parse(text);
          if (!parcel) return { parcel: null };
          if (ctx.outline) ctx.outline(sel, parcel.ring);
          if (!/^(3064|3021)/.test(parcel.unit)) return { parcel, permits: { st: "out" } };
          return ctx.loadJSON("sarnik/dzialka/meta.json")
            .then((meta) => {
              const key = districtKey(parcel);
              if (!(meta.files || []).includes(key)) return { st: "ok", rec: null };
              return ctx.loadJSON(`sarnik/dzialka/${key}.json`).then((d) => ({ st: "ok", rec: findPermits(d.rows, parcel.number) }));
            })
            .catch(() => ({ st: "fail" }))
            .then((permits) => ({ parcel, permits }));
        }), 8000);
    },

    checks(sel, ctx) {
      if (!sel || sel.kind !== "point") return null;
      const s = ctx.t("dzialka"), r = sel.ext && sel.ext.dzialka, rs = sel.ext && sel.ext.dzialkaSar;
      const base = { id: "prog", t: s.title, src: "ULDK GUGiK", sar: "no" };
      if (!r || r.st === "loading") return { ...base, lvl: "info", pending: true, word: s.checking_word, v: s.checking };
      if (r.st === "timeout") return { ...base, lvl: "info", word: s.timeout_word, v: s.timeout_msg };
      if (r.st !== "ok" || !r.data) return { ...base, lvl: "info", word: s.error_word, v: s.error_msg };
      const { parcel, permits } = r.data;
      if (!parcel) return { ...base, lvl: "info", word: s.none_word, v: s.none_msg };

      const esc = ctx.esc, area = ctx.fmtInt(areaM2(parcel.ring));
      const head = esc(s.parcel(parcel, area));
      const rows = [];
      // 1. próg zagrożenia z radaru
      if (!rs || rs.st === "loading") {
        rows.push({ ...base, t: s.titleP(parcel.number), lvl: "info", pending: true, word: s.checking_word, v: `${head} ${s.radar_wait}` });
      } else {
        const m = r.calc || (rs.st === "ok" ? (r.calc = measure(parcel, ctx, rs.data)) : null);
        const g = m ? grade(m, ctx.sar && ctx.sar.s1 ? ctx.sar.s1.r_crit : NaN) : { lvl: "info", sig: [] };
        if (!g.sig.length) {
          rows.push({ ...base, t: s.titleP(parcel.number), lvl: "info", word: s.nodata_word, v: `${head} ${m ? s.nodata_msg : s.radar_fail}` });
        } else {
          const txt = (x) => (x.k === "nisar" ? s.sig.nisar(ctx.num(x.v, 1).replace("-", "−"))
            : x.k === "water" ? s.sig.water(ctx.num(x.v * 100, 0))
            : x.k === "wet" ? s.sig.wet(ctx.num(x.v, 2).replace("-", "−"), ctx.num(g.rc, 2))
            : s.sig.sink(ctx.sgn(x.v, 1)));
          const on = g.sig.filter((x) => x.on), off = g.sig.filter((x) => !x.on);
          const parts = on.length
            ? [`<b>${s.hit}</b> ${on.map(txt).join("; ")}.`, off.length ? `${s.rest} ${off.map(txt).join("; ")}.` : ""]
            : [`${s.calm} ${off.map(txt).join("; ")}.`];
          const scale = m.inside ? s.cells(m.cells, m.nisarPx) : s.small(m.nisarPx);
          rows.push({
            ...base, t: s.titleP(parcel.number), lvl: g.lvl, word: s.lvl[g.lvl],
            v: [head, ...parts.filter(Boolean), scale].join(" "), src: s.src, sar: "yes",
          });
        }
      }
      // 2. co na działce budowano (GUNB RWDZ), z potwierdzeniem radaru
      const pb = { id: "rwdz", t: s.rwdz_title, src: s.rwdz_src, sar: "no", lvl: "info" };
      const m = r.calc;
      const rise = m && isFinite(m.rise) && m.rise >= LIM.riseDb ? ctx.sgn(m.rise, 1) : null;
      if (!permits || permits.st === "out") rows.push({ ...pb, word: s.rwdz_out_word, v: s.rwdz_out });
      else if (permits.st !== "ok") rows.push({ ...pb, word: s.rwdz_fail_word, v: s.rwdz_fail });
      else if (!permits.rec || !permits.rec.total) {
        rows.push(rise
          ? { ...pb, lvl: "warn", word: s.rwdz_gap_word, v: s.rwdz_gap(rise, m.walls) + (m.inside ? "" : s.near), src: `${s.rwdz_src}; Sentinel-1 RTC`, sar: "part" }
          : { ...pb, word: s.rwdz_none_word, v: s.rwdz_none });
      } else {
        const rec = permits.rec;
        rows.push({
          ...pb, word: s.rwdz_word(rec.total), v: s.rwdz_since + s.rwdz_list(rec) + (rise ? s.radar_rise(rise, m.walls) : ""),
          src: rise ? `${s.rwdz_src}; Sentinel-1 RTC` : s.rwdz_src, sar: rise ? "part" : "no",
        });
      }
      return rows;
    },
  });
})();
