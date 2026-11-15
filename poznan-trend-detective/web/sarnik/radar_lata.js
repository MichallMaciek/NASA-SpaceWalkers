// Moduł SARnik: zabudowa wokół według radaru, rok po roku (2007–2026), i prognoza startująca ze stanu z radaru
// Kontrakt: docs/planwyd/KONTRAKT.md; dane i zasady: docs/planwyd_sar/sar-5-radar-lata.md
//
// Mapa optyczna zabudowy kończy się na 2020 r. Radar (Sentinel-1 2015–2026, ALOS PALSAR 2007–2010, NISAR 2026)
// mówi, co powstało później, i to co rok. Dwa wiersze karty:
//   1. "historia": udział zabudowy dziś i na początku zapisu, hektary nowej zabudowy po 2020 r., rok największego przyrostu,
//   2. "prognoza": średnia szansa zabudowy wolnego terenu w 5 lat, licząc od stanu z radaru w 2026 r. (tylko gdy jest
//      drugi zestaw danych; bez niego wiersza nie ma).
// Warstwy PNG moduł czyta sam z bajtów pliku (jak decodeGrayPNG w web/app.js), bo ctx.loadGray rdzenia wersji 1 czyta
// tylko data/land/. Jeśli przyszły rdzeń wczyta je wcześniej do ctx.L8 pod kluczami KEY_*, moduł bierze je stamtąd.
(function () {
  const SK = window.SARNIK;
  if (!SK) return; // bez rdzenia moduł jest bezczynny

  const NAME = "radar_lata";
  const SETS = {
    lata: { meta: "sarnik/radar_lata/meta.json", png: "sarnik/radar_lata/first_year.png", key: "sarnik/radar_lata/first_year" },
    prog: { meta: "sarnik/radar_prognoza/meta.json", png: "sarnik/radar_prognoza/prob_5y.png", key: "sarnik/radar_prognoza/prob_5y" },
  };
  const OPT = 2020; // ostatni rok mapy optycznej; kwantyle w meta.json nazywają się new_ha_since_2020
  const QK = ["99", "95", "90", "75", "50"]; // od najwyższego
  const FULL = 0.9; // poziom "ok" tylko, gdy radar mierzy co najmniej 90% wybranego terenu

  // ---------- PNG 8-bit w odcieniach szarości, z bajtów pliku (bez canvas; patrz komentarz przy decodeGrayPNG w app.js)
  async function decodeGrayPNG(buf) {
    const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (b.length < 45 || dv.getUint32(0) !== 0x89504e47 || dv.getUint32(4) !== 0x0d0a1a0a) throw new Error("not a PNG");
    let w = 0, h = 0;
    const idat = [];
    for (let p = 8; p + 12 <= b.length;) {
      const len = dv.getUint32(p), type = dv.getUint32(p + 4);
      if (type === 0x49484452) { // IHDR
        w = dv.getUint32(p + 8); h = dv.getUint32(p + 12);
        if (b[p + 16] !== 8 || b[p + 17] !== 0 || b[p + 20] !== 0) throw new Error("PNG is not 8-bit greyscale, non-interlaced");
      } else if (type === 0x49444154) idat.push(b.subarray(p + 8, p + 8 + len)); // IDAT
      else if (type === 0x49454e44) break; // IEND
      p += 12 + len;
    }
    if (!w || !h || !idat.length) throw new Error("PNG without a picture");
    const raw = new Uint8Array(await new Response(new Blob(idat).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer());
    if (raw.length !== (w + 1) * h) throw new Error("PNG rows do not match its size");
    const out = new Uint8Array(w * h);
    for (let y = 0, s = 0, o = 0; y < h; y++, s += w, o += w) {
      const f = raw[s++], up = o - w;
      if (f === 0) out.set(raw.subarray(s, s + w), o);
      else if (f === 1) { let a = 0; for (let x = 0; x < w; x++) a = out[o + x] = (raw[s + x] + a) & 255; }
      else if (f === 2) { for (let x = 0; x < w; x++) out[o + x] = (raw[s + x] + (y ? out[up + x] : 0)) & 255; }
      else if (f === 3) { let a = 0; for (let x = 0; x < w; x++) a = out[o + x] = (raw[s + x] + ((a + (y ? out[up + x] : 0)) >> 1)) & 255; }
      else if (f === 4) {
        let a = 0, c = 0;
        for (let x = 0; x < w; x++) {
          const bb = y ? out[up + x] : 0, pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
          c = bb; a = out[o + x] = (raw[s + x] + pred) & 255;
        }
      } else throw new Error("PNG row filter");
    }
    return { w, h, data: out };
  }

  // ---------- wczytywanie: raz na stronę, wspólne dla wszystkich wyborów miejsca
  const S = { lata: { st: "idle" }, prog: { st: "idle" } };
  const warned = {};
  const isObj = (o) => !!o && typeof o === "object" && !Array.isArray(o);
  const fin = (v) => typeof v === "number" && isFinite(v);
  // krótki skrót meta.json do adresu PNG: nowe dane = nowy meta.json = nowy adres (bez dotykania DOM po wersję rdzenia)
  const tag = (o) => { let h = 2166136261; const s = JSON.stringify(o) || ""; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
  const gridOk = (arr, ctx) => {
    const L = ctx.land;
    return !!arr && typeof arr.length === "number" && (!L || !fin(L.width) || !fin(L.height) || arr.length === L.width * L.height);
  };
  function loadSet(k, ctx) {
    const set = SETS[k], st = S[k];
    if (st.st === "ok" || st.st === "loading" || (st.st === "error" && k === "prog")) return st.p || Promise.resolve();
    const p = ctx.loadJSON(set.meta)
      .then((meta) => {
        if (!isObj(meta)) throw new Error("meta.json is not an object");
        const pre = ctx.L8 && ctx.L8[set.key];
        if (pre) return { meta, arr: pre };
        return fetch(`data/${set.png}?v=${tag(meta)}`)
          .then((r) => { if (!r.ok) throw new Error(`${set.png}: HTTP ${r.status}`); return r.arrayBuffer(); })
          .then(decodeGrayPNG)
          .then((png) => ({ meta, arr: png.data }));
      })
      .then(({ meta, arr }) => {
        if (!gridOk(arr, ctx)) throw new Error(`${set.png}: size differs from the grid`);
        S[k] = { st: "ok", meta, arr };
      })
      .catch((e) => {
        S[k] = { st: "error", error: String((e && e.message) || e) };
        if (!warned[k]) { warned[k] = true; console.warn(`SARnik ${NAME}: ${set.meta} / ${set.png}:`, S[k].error); }
      });
    S[k] = { st: "loading", p };
    return p;
  }
  const arrOf = (k, ctx) => (ctx.L8 && ctx.L8[SETS[k].key]) || (S[k].st === "ok" ? S[k].arr : null);
  // The forecast row is off unless the history set asks for it (meta.prognoza.row === true). The app already has a
  // forecast row; two rows with two numbers would confuse a buyer, so the app's author switches this one on only
  // together with switching the old one off. While it is off the forecast set is not downloaded at all.
  const wantProg = () => S.lata.st === "ok" && isObj(S.lata.meta) && isObj(S.lata.meta.prognoza) && S.lata.meta.prognoza.row === true;

  // ---------- liczenie
  const yearsOf = (meta) => (Array.isArray(meta.years) ? meta.years : []).filter((y) => Number.isInteger(y) && y > 2000 && y < 2100).sort((a, b) => a - b);
  // poprawny meta.json zestawu "lata": rok początku zapisu i pole komórki; inaczej null
  function metaLata(meta) {
    if (!isObj(meta)) return null;
    const sy = meta.start_year, ha = meta.cell_ha;
    if (!Number.isInteger(sy) || sy < 2007 || sy > 2026 || !fin(ha) || ha <= 0) return null;
    const ys = yearsOf(meta);
    return { sy, ha, end: ys.length ? Math.max(...ys) : 2026, ys };
  }
  // kwantyle {"50": x, ...}; null, gdy brakuje któregoś klucza albo liczby
  function quants(q) {
    if (!isObj(q)) return null;
    const out = {};
    for (const k of QK) { if (!fin(q[k])) return null; out[k] = q[k]; }
    return out;
  }
  // najwyższy kwantyl, który wartość przekracza; null poniżej mediany
  const above = (v, q) => (q ? QK.find((k) => v > q[k]) || null : null);
  const passed = (meta, test) => !!(isObj(meta.checks) && isObj(meta.checks[test]) && meta.checks[test].passed === true);

  // tylko zmiana: komórki zabudowane pierwszy raz po roku początku zapisu, osobno do 2020 r. i po nim
  // (udziału zabudowy wiersz nie podaje: karta ma go już w wierszu "Zabudowa", liczonym z mapy optycznej)
  function history(cells, fy, m) {
    const s0 = m.sy - 2000, perYear = {};
    let valid = 0, old = 0, fresh = 0;
    for (const i of cells) {
      const v = fy[i];
      if (!v) continue;
      valid++;
      if (v <= s0 || v > 26) continue;
      if (v > OPT - 2000) { fresh++; perYear[2000 + v] = (perYear[2000 + v] || 0) + 1; } else old++;
    }
    let peak = null, peakN = 0, tie = false;
    for (const y of Object.keys(perYear).map(Number).sort((a, b) => a - b)) {
      if (perYear[y] > peakN) { peak = y; peakN = perYear[y]; tie = false; } else if (perYear[y] === peakN) tie = true;
    }
    const nYears = Object.keys(perYear).length;
    return {
      cells: cells.length, valid, fresh, old,
      newHa: fresh * m.ha, oldHa: old * m.ha, totalHa: (fresh + old) * m.ha, peak: tie ? null : peak, only: nYears === 1,
    };
  }

  function forecast(cells, fy, p5) {
    let n = 0, s = 0;
    for (const i of cells) {
      if (fy[i] !== 1 || !p5[i]) continue;
      const c = p5[i] / 255;
      s += c * c; n++;
    }
    return { open: n, mean: n ? s / n : NaN };
  }

  // ---------- teksty: ha i procenty przez ctx.num (przecinek po polsku)
  const haTxt = (ha, ctx) => { const d = ha >= 10 ? 0 : 1, t = ctx.num(ha, d); return ha > 0 && /^0([.,]0)?$/.test(t) ? ctx.num(ha, 2) : t; };
  const pctTxt = (p, ctx) => (p > 0 && p < 1 ? ctx.num(p, 1) : ctx.num(p, 0)) + "%";
  const dot = (t) => (t.endsWith(".") ? t : t + "."); // "w 2023 r." nie dostaje drugiej kropki
  const span = (ys) => (ys.length ? (ys[0] === ys[ys.length - 1] ? String(ys[0]) : `${ys[0]}–${ys[ys.length - 1]}`) : "");
  // tekst z pliku danych do pola src (rdzeń wstawia src jako zwykły tekst): bez znaków HTML, krótki
  const plain = (s) => String(s).replace(/[<>&"]/g, "").replace(/\s+/g, " ").trim().slice(0, 140);

  function srcLata(s, m, meta) {
    const ys = m.ys.length ? m.ys : [m.sy, 2026];
    const s1 = ys.filter((y) => y >= 2014), alos = ys.filter((y) => y <= 2011);
    const nisar = typeof meta.source === "string" && /NISAR/i.test(meta.source) && m.end >= 2025;
    return s.src({ s1: span(s1), alos: span(alos), nisar: nisar ? String(m.end) : "" }) + (meta.provisional === true ? s.prov : "");
  }
  // opis treningu prognozy: meta.trained_on (lista okresów, np. ["2005-2010", "2015-2020"]) albo meta.training
  function training(meta) {
    if (Array.isArray(meta.trained_on)) {
      const ys = meta.trained_on.join(" ").match(/\b(19|20)\d\d\b/g);
      if (ys) return { what: "", years: span(ys.map(Number).sort((a, b) => a - b)) };
    }
    const t = meta.training;
    if (typeof t === "string" && t.trim()) return { what: plain(t) };
    if (!isObj(t)) return null;
    const ys = Array.isArray(t.years) ? t.years.filter(Number.isInteger).sort((a, b) => a - b) : [];
    const what = typeof t.what === "string" && t.what.trim() ? plain(t.what) : "";
    return what || ys.length ? { what, years: span(ys) } : null;
  }

  SK.register(NAME, {
    pure: { decodeGrayPNG, history, forecast, metaLata, quants, above, state: S },
    i18n: {
      pl: {
        title: "Zabudowa wokół wg radaru, rok po roku",
        loading_word: "wczytuję…",
        loading: "Wczytuję roczny zapis zabudowy z radaru…",
        timeout_word: "brak odpowiedzi",
        timeout: "Zapis radaru nie wczytał się na czas. Wybierz miejsce jeszcze raz.",
        nodata_word: "brak danych radaru",
        nodata: "Radar nie ma tu pomiaru zabudowy.",
        fail: "Nie udało się wczytać zapisu zabudowy z radaru.",
        bad_word: "brak danych",
        bad: "Plik z zapisem radaru jest niepełny, więc nie liczę tu zabudowy.",
        where: (area) => (area ? "na tym obszarze" : "w promieniu 1 km"),
        grew: (d) => dot(`Po 2020 r., gdzie kończy się mapa optyczna, radar widzi ${d.where} ok. ${d.ha} ha nowej zabudowy` +
          (d.peak ? (d.q ? ` (${d.only ? "wszystko" : "najwięcej"} w ${d.peak} r.)` : `, ${d.only ? "wszystko" : "najwięcej"} w ${d.peak} r.`) : "") +
          (d.q ? `, więcej niż w ${d.q}% miejsc wokół Poznania` : "")),
        total: (d) => `Od ${d.start} r. łącznie ok. ${d.ha} ha.`,
        quiet: (d) => `Po 2020 r., gdzie kończy się mapa optyczna, radar nie widzi ${d.where} nowej zabudowy.`,
        before: (d) => `${d.from === d.to ? `W ${d.to} r.` : `W latach ${d.from}–${d.to}`} przybyło ok. ${d.ha} ha.`,
        none: (d) => `Od ${d.start} r. radar nie widzi ${d.where} nowej zabudowy.`,
        part: (p) => `Radar mierzy tylko ${p} tego terenu.`,
        word_new: (ha) => `+${ha} ha od 2020`,
        word_same: "bez zmian od 2020",
        src_base: "Radar Sentinel-1, ALOS PALSAR i NISAR",
        prov: "; dane wstępne",
        src: (d) => ["Radar" + (d.s1 ? ` Sentinel-1 ${d.s1}` : ""), d.alos ? `ALOS PALSAR ${d.alos}` : "", d.nisar ? `NISAR ${d.nisar}` : ""].filter(Boolean).join(", "),
        // prognoza
        p_title: "Co może powstać obok, licząc od stanu z radaru",
        p_lead: (area) => (area ? "Wolny teren na tym obszarze" : "Wolny teren obok"),
        p_chance: (d) => dot(`${d.lead} ma ${d.chance} szans na zabudowę w ciągu ${d.h === 1 ? "1 roku" : `${d.h} lat`}, licząc od tego, co radar widzi w ${d.start} r.` +
          (d.q ? `; to więcej niż w ${d.q}% wolnych miejsc wokół Poznania` : "")),
        p_approx: (p) => `ok. ${p}`,
        p_tiny: "mniej niż 0,1%",
        p_word: (p) => `szansa ${p}`,
        p_none_word: "brak wolnego terenu",
        p_none: (area) => `Radar nie widzi tu wolnego terenu: ${area ? "na tym obszarze" : "w promieniu 1 km"} wszystko jest już zabudowane albo poza zasięgiem prognozy.`,
        p_src: (d) => `Prognoza zespołu: start ze stanu z radaru w ${d.start} r.` +
          (d.tr ? `; uczona ${[d.tr.what, d.tr.years ? `na latach ${d.tr.years}` : ""].filter(Boolean).join(", ")}` : ""),
      },
      en: {
        title: "Buildings around, by radar, year by year",
        loading_word: "loading…",
        loading: "Loading the year-by-year radar record of buildings…",
        timeout_word: "no response",
        timeout: "The radar record did not load in time. Pick the place again.",
        nodata_word: "no radar data",
        nodata: "The radar has no measurement of buildings here.",
        fail: "Could not load the radar record of buildings.",
        bad_word: "no data",
        bad: "The radar record file is incomplete, so buildings are not counted here.",
        where: (area) => (area ? "in this area" : "within 1 km"),
        grew: (d) => `After 2020, where the optical map ends, the radar sees about ${d.ha} ha of new buildings ${d.where}` +
          (d.peak ? (d.q ? ` (${d.only ? "all" : "most"} in ${d.peak})` : `, ${d.only ? "all" : "most"} in ${d.peak}`) : "") +
          (d.q ? `, more than in ${d.q}% of places around Poznań.` : "."),
        total: (d) => `Since ${d.start}, about ${d.ha} ha in all.`,
        quiet: (d) => `After 2020, where the optical map ends, the radar sees no new buildings ${d.where}.`,
        before: (d) => `${d.from === d.to ? `In ${d.to}` : `In ${d.from}–${d.to}`} about ${d.ha} ha were added.`,
        none: (d) => `Since ${d.start} the radar sees no new buildings ${d.where}.`,
        part: (p) => `The radar measures only ${p} of this land.`,
        word_new: (ha) => `+${ha} ha since 2020`,
        word_same: "no change since 2020",
        src_base: "Sentinel-1, ALOS PALSAR and NISAR radar",
        prov: "; provisional data",
        src: (d) => ["Radar" + (d.s1 ? ` Sentinel-1 ${d.s1}` : ""), d.alos ? `ALOS PALSAR ${d.alos}` : "", d.nisar ? `NISAR ${d.nisar}` : ""].filter(Boolean).join(", "),
        p_title: "What may be built nearby, starting from the radar picture",
        p_lead: (area) => (area ? "Open land in this area" : "Open land nearby"),
        p_chance: (d) => `${d.lead} has ${d.chance} chance of being built on within ${d.h === 1 ? "1 year" : `${d.h} years`}, counting from what the radar sees in ${d.start}` +
          (d.q ? `; that is more than for ${d.q}% of open places around Poznań.` : "."),
        p_approx: (p) => `about ${p}`,
        p_tiny: "less than 0.1%",
        p_word: (p) => `chance ${p}`,
        p_none_word: "no open land",
        p_none: (area) => `The radar sees no open land here: ${area ? "in this area" : "within 1 km"} everything is already built or outside the forecast.`,
        p_src: (d) => `Team forecast: starts from the radar picture of ${d.start}` +
          (d.tr ? `; trained ${[d.tr.what, d.tr.years ? `on ${d.tr.years}` : ""].filter(Boolean).join(", ")}` : ""),
      },
    },

    onSelect(sel, ctx) {
      if (!sel || !Array.isArray(sel.cells)) return;
      const done = (k) => S[k].st === "ok" || (S[k].st === "error" && k === "prog");
      if (done("lata") && (!wantProg() || done("prog"))) return; // wszystko już w pamięci: bez zbędnego przerysowania
      // fetchOnce: jedno przerysowanie po wczytaniu, tylko jeśli to miejsce jest nadal wybrane;
      // zestaw prognozy dopiero po zestawie "lata" i tylko wtedy, gdy jego meta.json o to prosi
      ctx.fetchOnce(sel, NAME, () => loadSet("lata", ctx).then(() => (wantProg() ? loadSet("prog", ctx) : undefined)), 60000);
    },

    checks(sel, ctx) {
      if (!sel || !Array.isArray(sel.cells)) return null;
      const s = ctx.t(NAME), area = sel.kind === "area", point = sel.kind === "point";
      const base = { id: "historia", t: s.title, sar: "yes", lvl: "info", src: s.src_base };
      const L = S.lata, r = sel.ext && sel.ext[NAME];
      const fy = arrOf("lata", ctx);
      if (L.st !== "ok" || !fy) {
        if (L.st === "error" || L.st === "ok") return { ...base, word: s.nodata_word, v: s.fail };
        if (r && r.st === "timeout") return { ...base, word: s.timeout_word, v: s.timeout };
        return { ...base, pending: true, word: s.loading_word, v: s.loading };
      }
      const meta = L.meta, m = metaLata(meta);
      if (!m) return { ...base, word: s.bad_word, v: s.bad };
      const src = srcLata(s, m, meta);
      const h = history(sel.cells, fy, m);
      if (!h.valid) return { ...base, src, word: s.nodata_word, v: s.nodata };

      const nearQ = isObj(meta.near_1km) ? quants(meta.near_1km.new_ha_since_2020_quantiles) : null;
      const q = point && h.newHa > 0 ? above(h.newHa, nearQ) : null;
      const ha = haTxt(h.newHa, ctx);
      const where = s.where(area), parts = [];
      if (h.fresh) {
        parts.push(s.grew({ where, ha, peak: h.peak, only: h.only, q }));
        if (h.old) parts.push(s.total({ start: m.sy, ha: haTxt(h.totalHa, ctx) }));
      } else if (h.old) parts.push(s.quiet({ where }), s.before({ from: m.sy + 1, to: OPT, ha: haTxt(h.oldHa, ctx) }));
      else parts.push(s.none({ start: m.sy, where }));
      const cover = h.cells ? h.valid / h.cells : 0;
      if (cover < FULL) parts.push(s.part(pctTxt(100 * cover, ctx)));
      let lvl = "info";
      if (point && nearQ && passed(meta, "zmiana_po_2020")) {
        if (h.newHa >= nearQ["90"]) lvl = "warn";
        else if (h.newHa < nearQ["75"] && cover >= FULL) lvl = "ok";
      }
      const rows = [{ ...base, src, lvl, word: h.fresh ? s.word_new(ha) : s.word_same, v: ctx.esc(parts.join(" ")) }];

      // prognoza: tylko z wczytanym drugim zestawem
      const P = S.prog, p5 = arrOf("prog", ctx);
      if (wantProg() && P.st === "ok" && p5) {
        const pm = P.meta;
        const start = Number.isInteger(pm.start_year) ? pm.start_year : 2026;
        const hz = Number.isInteger(pm.horizon_years) && pm.horizon_years > 0 ? pm.horizon_years : 5;
        const pb = { id: "prognoza", t: s.p_title, sar: "part", lvl: "info", src: s.p_src({ start, tr: training(pm) }) + (pm.provisional === true ? s.prov : "") };
        const f = forecast(sel.cells, fy, p5);
        if (!f.open) rows.push({ ...pb, word: s.p_none_word, v: ctx.esc(s.p_none(area)) });
        else {
          const pq = quants(pm.quantiles_open), pc = 100 * f.mean;
          const qq = above(f.mean, pq);
          const chance = pc < 0.1 ? s.p_tiny : s.p_approx(pctTxt(pc, ctx));
          // a warning needs both tests of the forecast set: the model against radar on all open land, and the stricter
          // one on open land next to existing buildings (where a buyer actually looks)
          const lv = pq && passed(pm, "prognoza_a_radar") && passed(pm, "prognoza_a_radar_brzeg") && f.mean >= pq["95"] ? "warn" : "info";
          rows.push({
            ...pb, lvl: lv, word: s.p_word(pc < 0.1 ? s.p_tiny : pctTxt(pc, ctx)),
            v: ctx.esc(s.p_chance({ lead: s.p_lead(area), chance, h: hz, start, q: qq })),
          });
        }
      }
      return rows;
    },
  });
})();
