/* Poznań Trend Detective — interactive map following the team's UI prototype.
   Every number shown is read from data/ (built by the pipeline) or computed here with the same
   Theil-Sen / Mann-Kendall method as pipeline/trend.py. */
// SARnik core, part 1 of 32: helpers: DATA_V, fetchJSON, colour ramps, statistics (Theil-Sen, Mann-Kendall).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
  /* ================= helpers ================= */
  const R_SIN = 6371007.181, R_MERC = 6378137;
  const HEAT_YEARS = Array.from({ length: 25 }, (_, i) => 2000 + i);
  const NOW_YEAR = new Date().getFullYear();
  const LAWICA = [52.4167, 16.8264], OLD_MARKET = [52.4083, 16.9335];
  const $ = (s) => document.querySelector(s);
  // data files carry the page's build number, so a new deploy never mixes with cached data
  const DATA_V = ((document.currentScript && document.currentScript.src) || "").split("v=")[1] || String(Date.now());
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const mean = (a) => { const v = a.filter((x) => x != null && isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  // Our own JSON files, with quiet retries: on busy Wi-Fi one request out of dozens is easily lost.
  // A network error, a 5xx answer or a cut-off body is tried again after each wait; a 4xx answer is final.
  async function fetchJSON(url, waits = [1000, 3000]) {
    for (let i = 0; ; i++) {
      try {
        const r = await fetch(url);
        if (r.ok) return await r.json();
        const err = new Error(`HTTP ${r.status}`);
        err.status = r.status;
        err.final = r.status < 500; // the file is not there: asking again will not help
        throw err;
      } catch (e) {
        if (e.final || i >= waits.length) throw e;
      }
      await sleep(waits[i]);
    }
  }
  // every data file is asked for as get("<path under data/>"): tests/data_contract.py reads the file list from these calls
  const get = (f) => fetchJSON(`data/${f}?v=${DATA_V}`).catch((e) => { const err = new Error(`${f}: ${e.message}`); err.status = e.status; throw err; });

  // light / dark: the viewer's choice wins over the system setting and is remembered
  try { const th = localStorage.getItem("ptd-theme"); if (th) document.documentElement.setAttribute("data-theme", th); } catch (e) { /* ignore */ }
  // Polish for Polish browsers, English for everyone else (Space Apps judges included).
  // ?lang=en or ?lang=pl in a link wins and is remembered, so the About page opens in the same language.
  let lang = (navigator.language || "en").toLowerCase().startsWith("pl") ? "pl" : "en";
  try { const s = localStorage.getItem("ptd-lang"); if (s === "pl" || s === "en") lang = s; } catch (e) { /* storage blocked */ }
  { const q = new URLSearchParams(location.search).get("lang"); if (q === "pl" || q === "en") { lang = q; try { localStorage.setItem("ptd-lang", q); } catch (e) { /* ignore */ } } }
  // Texts for loading failures. They live here, not in i18n.js, and this early in the file, because they are shown when
  // the data did not load or when something the rest of this file relies on is missing.
  const BOOT = {
    pl: { failH: "Nie udało się wczytać danych", failP: "Sprawdź połączenie z internetem i spróbuj ponownie.", retry: "Spróbuj ponownie", layerFail: "Nie udało się wczytać tej warstwy." },
    en: { failH: "The data did not load", failP: "Check your internet connection and try again.", retry: "Try again", layerFail: "This layer did not load." },
  };
  function renderLoadError() {
    const b = BOOT[lang] || BOOT.pl;
    $("#sidecard").classList.remove("min");
    $("#sidecard").innerHTML = `<h2>${b.failH}</h2><p class="sub">${b.failP}</p><button type="button" class="btn-primary" id="boot-retry">${b.retry}</button>`;
    $("#boot-retry").addEventListener("click", () => location.reload());
  }
  // The map library comes from a CDN. If it did not arrive (blocked, offline), nothing below can run: say so and stop.
  if (!window.L || !window.I18N) {
    console.error("SARnik: Leaflet or the text files did not load");
    if (location.protocol !== "file:") renderLoadError();
    // stop here and in every later part (their first line tests SARNIK_STOP); reported once, by the line above
    window.SARNIK_STOP = new Error("SARnik: stopped, Leaflet or the text files did not load");
    window.addEventListener("error", (e) => { if (e.error === window.SARNIK_STOP) e.preventDefault(); });
    throw window.SARNIK_STOP;
  }

  const T = () => window.I18N[lang];
  const U = () => window.I18N[lang].ui;
  const dsep = () => (lang === "pl" ? "," : ".");
  const num = (v, d) => v.toFixed(d).replace(".", dsep());
  const sgn = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "") + num(Math.abs(v), d);
  const fmtP = (p) => (p < 0.001 ? "p < 0" + dsep() + "001" : "p = " + num(p, 3));
  const fmtInt = (n) => Math.round(n).toLocaleString(lang === "pl" ? "pl-PL" : "en-GB");

  const RAMPS = {
    warm: ["#F3D3C0", "#E4875F", "#C4442A", "#8C2416"],
    cool: ["#C9DCF2", "#6AA0DC", "#2A78D6", "#184F95"],
    green: ["#CFE6D3", "#7DBB8A", "#2F8A4F", "#1D5C33"],
    brown: ["#EADBC6", "#C49A62", "#8F6230", "#5E3D1A"],
    heat: ["#2A4D7A", "#6AA0DC", "#F3D3C0", "#E4875F", "#C4442A", "#8C2416"],
    built: ["#FBE7B5", "#F6C25B", "#F2A31B", "#EE6B2D", "#E0332F"],
    price: ["#DCE6FD", "#9DB8F7", "#5B86F0", "#2F62E9", "#1B3FA8"],
    loss: ["#F6C25B", "#E5602A", "#B8261E"],
    coh: ["#F2C35B", "#E7DCC0", "#8EA8C8", "#2F4F7F"],         // NISAR coherence: changing (warm) -> stable (deep blue)
    dist: ["#E58BC4", "#B0157A"],                             // OPERA radar disturbance (low, high): magenta, apart from the orange Landsat forest loss
    radar: ["#3B3F45", "#7B8087", "#C9B98F", "#F2C14E", "#FFF1B8"],
    terrain: ["#BFE6E2", "#7FD0C9", "#2FB3AA", "#17A2A0", "#0E6F6D"],
    // radar (v2)
    up: ["#F07A3A", "#E2551C", "#C2300F", "#8F1A08"],        // new walls: brighter with double bounce
    upSoft: ["#F6DDB0", "#F2C987", "#EDB566", "#E5A04A"],    // brighter without double bounce: fields, earthworks
    down: ["#C9C3F2", "#8E80E3", "#5B47C9", "#33238F"],      // darker: harvest, felling, water
    wet: ["#CFE3F5", "#8CBDE8", "#3F8FD6", "#155FA8"],
    water: ["#9ED0F5", "#4AA3E8", "#1C73C9", "#0B4A8C"],
    sink: ["#F7C3B0", "#EB7E5B", "#CC3B24", "#8C1A10"],
    score: ["#E0332F", "#EE6B2D", "#F2A31B", "#F6C25B", "#7DBB8A", "#2F8A4F"],
  };
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rampCache = new Map();
  function rampRgb(stops, t) {
    t = clamp(t, 0, 1);
    const key = stops.join() + Math.round(t * 255);
    let c = rampCache.get(key);
    if (!c) {
      const s = stops.map(hexRgb), x = t * (s.length - 1), i = Math.min(s.length - 2, Math.floor(x)), f = x - i;
      c = s[i].map((v, k) => Math.round(v + (s[i + 1][k] - v) * f));
      rampCache.set(key, c);
    }
    return c;
  }
  // 256-step colour lookup tables for the hot per-pixel loops (no string keys, no allocations)
  const lutCache = new Map();
  function lutFor(stops) {
    let lut = lutCache.get(stops);
    if (!lut) {
      lut = new Uint8Array(256 * 3);
      const s = stops.map(hexRgb);
      for (let k = 0; k < 256; k++) {
        const x = (k / 255) * (s.length - 1), i = Math.min(s.length - 2, Math.floor(x)), f = x - i;
        for (let c = 0; c < 3; c++) lut[k * 3 + c] = Math.round(s[i][c] + (s[i + 1][c] - s[i][c]) * f);
      }
      lutCache.set(stops, lut);
    }
    return lut;
  }
  const ramp = (stops, t) => { const c = rampRgb(stops, t); return `rgb(${c[0]},${c[1]},${c[2]})`; };
  const gradient = (stops) => `linear-gradient(90deg, ${stops.join(", ")})`;

  /* ---- statistics, identical to pipeline/trend.py ---- */
  function senSlope(vals, years) {
    const s = [];
    for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
      if (vals[i] == null || vals[j] == null || !isFinite(vals[i]) || !isFinite(vals[j])) continue;
      s.push((vals[j] - vals[i]) / (years[j] - years[i]));
    }
    if (!s.length) return NaN;
    s.sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function senIntercept(vals, years, slope) {
    const r = [];
    vals.forEach((v, i) => { if (v != null && isFinite(v)) r.push(v - slope * years[i]); });
    r.sort((a, b) => a - b);
    const m = r.length >> 1;
    return r.length % 2 ? r[m] : (r[m - 1] + r[m]) / 2;
  }
  function erfc(x) {
    const t = 1 / (1 + 0.3275911 * x);
    return t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x);
  }
  function mannKendall(vals) {
    let s = 0, n = 0;
    const ok = (v) => v != null && isFinite(v);
    vals.forEach((v) => { if (ok(v)) n++; });
    for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
      if (!ok(vals[i]) || !ok(vals[j])) continue;
      s += Math.sign(vals[j] - vals[i]);
    }
    const v = (n * (n - 1) * (2 * n + 5)) / 18;
    const z = s > 0 ? (s - 1) / Math.sqrt(v) : s < 0 ? (s + 1) / Math.sqrt(v) : 0;
    return { s, n, z, p: n >= 10 ? erfc(Math.abs(z) / Math.SQRT2) : NaN };
  }
  function testSeries(vals, years) {
    const slope = senSlope(vals, years), mk = mannKendall(vals);
    return { slope, perDec: slope * 10, icpt: isFinite(slope) ? senIntercept(vals, years, slope) : NaN, ...mk };
  }

