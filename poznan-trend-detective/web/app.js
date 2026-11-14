/* Poznań Trend Detective — interactive map following the team's UI prototype.
   Every number shown is read from data/ (built by the pipeline) or computed here with the same
   Theil-Sen / Mann-Kendall method as pipeline/trend.py. */
(() => {
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

  // light / dark: the viewer's choice wins over the system setting and is remembered
  try { const th = localStorage.getItem("ptd-theme"); if (th) document.documentElement.setAttribute("data-theme", th); } catch (e) { /* ignore */ }
  let lang = (navigator.language || "pl").toLowerCase().startsWith("en") ? "en" : "pl";
  try { lang = localStorage.getItem("ptd-lang") || lang; } catch (e) { /* storage blocked */ }
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
    radar: ["#3B3F45", "#7B8087", "#C9B98F", "#F2C14E", "#FFF1B8"],
    terrain: ["#BFE6E2", "#7FD0C9", "#2FB3AA", "#17A2A0", "#0E6F6D"],
    // radar (v2)
    up: ["#F07A3A", "#E2551C", "#C2300F", "#8F1A08"],        // new walls: brighter with double bounce
    upSoft: ["#F6DDB0", "#F2C987", "#EDB566", "#E5A04A"],    // brighter without double bounce: fields, earthworks
    down: ["#C9C3F2", "#8E80E3", "#5B47C9", "#33238F"],      // darker: harvest, felling, water
    wet: ["#CFE3F5", "#8CBDE8", "#3F8FD6", "#155FA8"],
    water: ["#9ED0F5", "#4AA3E8", "#1C73C9", "#0B4A8C"],
    sink: ["#F7C3B0", "#EB7E5B", "#CC3B24", "#8C1A10"],
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

  /* ================= data ================= */
  let study, gL, gN, areas, land, flood;
  const geo = {};
  const L8 = {};
  const smooth = {}; // smoothed built-up intensity per epoch (Float32Array)

  function sinuToLatLng(x, y) { const lat = y / R_SIN; return [lat * 180 / Math.PI, (x / (R_SIN * Math.cos(lat))) * 180 / Math.PI]; }
  function latLngToSinu(lat, lng) { const la = lat * Math.PI / 180; return [R_SIN * (lng * Math.PI / 180) * Math.cos(la), R_SIN * la]; }
  function latLngToMerc(lat, lng) { return [R_MERC * lng * Math.PI / 180, R_MERC * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2))]; }
  function mercToLatLng(x, y) { return [(2 * Math.atan(Math.exp(y / R_MERC)) - Math.PI / 2) * 180 / Math.PI, (x / R_MERC) * 180 / Math.PI]; }

  function buildGeometry(g) {
    const [a, b, c, d, e, f] = g.transform, n = g.rows * g.cols;
    const corners = new Float64Array(n * 8), bb = new Float64Array(n * 4), centre = new Float64Array(n * 2);
    for (let r = 0; r < g.rows; r++) for (let col = 0; col < g.cols; col++) {
      const i = r * g.cols + col;
      let a0 = 90, a1 = -90, o0 = 180, o1 = -180;
      [[col, r], [col + 1, r], [col + 1, r + 1], [col, r + 1]].forEach(([cc, rr], k) => {
        const [la, lo] = sinuToLatLng(a * cc + b * rr + c, d * cc + e * rr + f);
        corners[i * 8 + k * 2] = la; corners[i * 8 + k * 2 + 1] = lo;
        a0 = Math.min(a0, la); a1 = Math.max(a1, la); o0 = Math.min(o0, lo); o1 = Math.max(o1, lo);
      });
      bb[i * 4] = a0; bb[i * 4 + 1] = a1; bb[i * 4 + 2] = o0; bb[i * 4 + 3] = o1;
      const [cla, clo] = sinuToLatLng(a * (col + 0.5) + b * (r + 0.5) + c, d * (col + 0.5) + e * (r + 0.5) + f);
      centre[i * 2] = cla; centre[i * 2 + 1] = clo;
    }
    return { corners, bb, centre };
  }
  function cellAt(g, lat, lng) {
    const [x, y] = latLngToSinu(lat, lng), [a, , c, , e, f] = g.transform;
    const col = Math.floor((x - c) / a), row = Math.floor((y - f) / e);
    return row < 0 || col < 0 || row >= g.rows || col >= g.cols ? -1 : row * g.cols + col;
  }
  function landCell(lat, lng) {
    const [x, y] = latLngToMerc(lat, lng), [a, , c, , e, f] = land.transform3857;
    const col = Math.floor((x - c) / a), row = Math.floor((y - f) / e);
    return row < 0 || col < 0 || row >= land.height || col >= land.width ? null : { row, col, i: row * land.width + col };
  }
  const rings = (geom) => (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates);
  function pointInRing(ring, lat, lng) { // ring as [[lng, lat], ...]
    let ins = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) ins = !ins;
    }
    return ins;
  }
  const inArea = (f, lat, lng) => rings(f.geometry).some((poly) => pointInRing(poly[0], lat, lng));
  // official groundwater-flood areas (PIG-PIB): inside an outer ring and not inside one of its holes
  const inFlood = (lat, lng) => flood.features.some((f) => rings(f.geometry).some((poly) => pointInRing(poly[0], lat, lng) && !poly.slice(1).some((h) => pointInRing(h, lat, lng))));
  const areaAt = (lat, lng) => areas.features.find((f) => inArea(f, lat, lng)) || null;
  const areaStats = (name) => study.areas.find((a) => a.name === name);

  const grayLoading = {}; // in-flight loads, so a click during start-up does not decode the same PNG twice
  function loadGray(name) {
    if (L8[name]) return Promise.resolve(L8[name]);
    if (grayLoading[name]) return grayLoading[name];
    const pr = new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
        const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, img.width, img.height).data, out = new Uint8Array(img.width * img.height);
        for (let i = 0; i < out.length; i++) out[i] = d[i * 4];
        L8[name] = out; res(out);
      };
      img.onerror = () => rej(new Error(name));
      img.src = `data/land/${name}.png?v=${DATA_V}`;
    });
    grayLoading[name] = pr;
    pr.then(() => delete grayLoading[name], () => delete grayLoading[name]);
    return pr;
  }
  // any year 1975-2035 lies between two 5-year epochs (observed to 2020, projected after)
  function epochPair(y) {
    const ep = EPOCHS(), i = clamp(Math.floor((y - ep[0]) / 5), 0, ep.length - 2);
    return { e0: ep[i], e1: ep[i + 1], t: clamp((y - ep[i]) / 5, 0, 1) };
  }
  const EPOCHS = () => land.epochs.concat(land.projected);           // 1975..2020, 2025, 2030, 2035
  const LAST_OBS = () => land.epochs[land.epochs.length - 1];         // 2020
  const builtNames = () => EPOCHS().map((y) => `built_${y}`);
  const THR = () => Math.round(land.threshold * 255);

  function smoothed(year) { // 3x3 box blur of built-up share, for the heat-map look of the prototype
    if (smooth[year]) return smooth[year];
    const a = L8[`built_${year}`], w = land.width, h = land.height, out = new Float32Array(w * h);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      let s = 0, n = 0;
      for (let dr = -1; dr <= 1; dr++) { const rr = r + dr; if (rr < 0 || rr >= h) continue;
        for (let dc = -1; dc <= 1; dc++) { const cc = c + dc; if (cc < 0 || cc >= w) continue; s += a[rr * w + cc]; n++; } }
      out[r * w + c] = s / n / 255;
    }
    smooth[year] = out;
    return out;
  }

  // cumulative projected-new-building mask up to a projection year, filtered by the minimum chance, 3x3 smoothed
  let projCache = {}, projChance = null; // one entry per projection year (3.4 MB each), reset when the chance slider moves
  function projSmoothed(year) {
    if (projChance !== state.minChance) { projCache = {}; projChance = state.minChance; }
    const key = year;
    if (projCache[key]) return projCache[key];
    const n = land.width * land.height, w = land.width, thr = THR(), tmin = state.minChance / 100, raw = new Uint8Array(n);
    land.projected.filter((y) => y <= year).forEach((y) => {
      const b = L8[`built_${y}`], prev = y === land.projected[0] ? L8[`built_${LAST_OBS()}`] : L8[`built_${y - 5}`], p = L8[`prob_${y}`];
      for (let i = 0; i < n; i++) if (b[i] >= thr && prev[i] < thr && (p[i] / 255) ** 2 >= tmin) raw[i] = 1;
    });
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s2 = 0, c2 = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const j = i + dr * w + dc; if (j >= 0 && j < n) { s2 += raw[j]; c2++; } }
      out[i] = s2 / c2;
    }
    return (projCache[key] = out);
  }

  // distributions for percentile ranks
  const rankPool = {};
  function prepareHeatRanks() {
    rankPool.night = []; rankPool.day = []; rankPool.ndvi = [];
    for (let i = 0; i < gL.rows * gL.cols; i++) {
      if (!areaAt(geo.L.centre[i * 2], geo.L.centre[i * 2 + 1])) continue;
      if (gL.layers.night_slope[i] != null) rankPool.night.push(gL.layers.night_slope[i]);
      if (gL.layers.day_slope[i] != null) rankPool.day.push(gL.layers.day_slope[i]);
      const s = senSlope(gL.layers.ndvi_years[i].slice(0, 25), HEAT_YEARS) * 10;
      if (isFinite(s)) rankPool.ndvi.push(s);
    }
    Object.values(rankPool).forEach((a) => a.sort((x, y) => x - y));
  }
  function prepareRiskPool() { // 5-year chance (2025-2030) of every not-yet-built cell in the 18 municipalities
    const p = L8.prob_2030, st = L8.study, b25 = L8.built_2025, thr = THR(), pool = [];
    for (let i = 0; i < p.length; i++) if (st[i] && b25[i] < thr) pool.push((p[i] / 255) ** 2);
    pool.sort((x, y) => x - y);
    rankPool.risk = pool;
  }
  function percentile(pool, v) {
    let lo = 0, hi = pool.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (pool[m] < v) lo = m + 1; else hi = m; }
    return Math.round((lo / pool.length) * 100);
  }

  /* ================= state ================= */
  const state = {
    year: 2020, yearF: 2020, horizon: 10, minChance: 5, base: "map",
    lyr: {
      // radar first (SARnik v2): Sentinel-1 2026 picture and change, wet ground, water, ground motion, L-band history
      s1rgb: { on: true, op: 0.8 },
      sarchange: { on: false, op: 0.9, min: 3 },
      sarwet: { on: false, op: 0.85 },
      sarwater: { on: false, op: 0.85, min: 20 },
      egms: { on: false, op: 0.95, min: 2 },
      alos: { on: false, op: 0.85, y: 2021 },
      nisarwet: { on: false, op: 0.9, min: 2 },
      built: { on: false, op: 0.85 },
      forest: { on: false, op: 0.85 },
      price: { on: false, op: 0.55 },
      activity: { on: false, op: 0.9, min: 3 },
      flood: { on: false, op: 0.55 },
      dem: { on: false, op: 0.75, lo: 50, hi: 110 },
      radar: { on: false, op: 0.85, lo: -18, hi: -4 },
      nisar: { on: false, op: 0.85, i: 0 },
      night: { on: false, op: 0.8 }, day: { on: false, op: 0.8 }, ndvi: { on: false, op: 0.8 }, nightyear: { on: false, op: 0.8 },
    },
    sel: null, // {kind: 'point'|'area', lat, lng, ring:[[lat,lng]...], label, cells, sq}
    findingsOpen: innerWidth >= 760, finding: null, testVar: "built",
  };
  let NISAR_DATES = [];
  let sar = null; // data/land/sar.json (radar products of SARnik v2); null if not built
  const LAND_KEYS = ["dem", "alos", "s1rgb", "radar", "forest", "activity", "sarwater", "sarwet", "nisarwet", "sarchange", "egms", "built"]; // draw order, bottom to top
  const SAR_KEYS = ["s1rgb", "sarchange", "sarwet", "sarwater", "egms", "alos", "nisarwet"];
  // L-band time line: ALOS-2 yearly mosaics, then NISAR 2026 (median of its passes)
  const LBAND_YEARS = () => (sar ? sar.alos.years.concat(sar.nisar ? [2026] : []) : []);
  const lbandNames = (y) => (y === 2026 ? ["nisar_hh_med", "nisar_hv_med"] : [`alos_hh_${y}`, `alos_hv_${y}`]);
  // keep the area clear of the floating cards: side card on the left (desktop) or at the bottom (phone)
  const fitPad = () => (innerWidth < 760 ? { paddingTopLeft: [12, 70], paddingBottomRight: [12, 130] } : { paddingTopLeft: [420, 80], paddingBottomRight: [80, 150] });
  const selPad = () => (innerWidth < 760 ? { paddingTopLeft: [12, 70], paddingBottomRight: [12, Math.round(innerHeight * 0.42 + 120)] } : fitPad());
  const PIXEL = {
    night: { grid: "L", value: "night_slope", p: "night_p", pos: RAMPS.warm, neg: RAMPS.cool, max: 1.5, unit: "°C", d: 2 },
    day: { grid: "L", value: "day_slope", p: "day_p", pos: RAMPS.warm, neg: RAMPS.cool, max: 1.5, unit: "°C", d: 2 },
    ndvi: { grid: "N", value: "ndvi_slope", p: "ndvi_p", pos: RAMPS.green, neg: RAMPS.brown, max: 0.04, unit: "NDVI", d: 3 },
    nightyear: { grid: "L", seq: true, stops: RAMPS.heat, min: 10, max: 20, unit: "°C", d: 1 },
  };
  const NEEDS = {
    built: () => builtNames().concat(["study", "prob_2025", "prob_2030", "prob_2035"]),
    forest: () => ["forest_loss", "loss_frac", "forest2000_frac", "study"],
    activity: () => ["s1_2017", "s1_2024", "study"],
    dem: () => ["dem", "study"],
    radar: () => ["s1_2017", "s1_2020", "s1_2024", "study"],
    s1rgb: () => ["sar_vv_med", "sar_vh_med", "study"],
    sarchange: () => ["sar_change", "sar_dratio", "study"],
    sarwet: () => ["sar_wet", "study"],
    sarwater: () => ["sar_water", "study"],
    egms: () => ["sar_egms", "study"],
    alos: () => [...lbandNames(state.lyr.alos.y), "study"],
    nisarwet: () => ["nisar_wetdry", "study"],
  };
  const ready = (k) => ((SAR_KEYS.includes(k) && !sar) || (k === "nisarwet" && !(sar && sar.nisar)) ? false : !NEEDS[k] || NEEDS[k]().every((n) => L8[n]));
  const SAR_PLACE = () => (sar ? ["sar_change", "sar_dratio", "sar_wet", "sar_water", "sar_egms", "sar_series",
    `alos_hv_${sar.alos.years[0]}`, `alos_hv_${sar.alos.years[sar.alos.years.length - 1]}`, ...(sar.nisar ? ["nisar_wetdry", "nisar_series"] : [])] : []);
  // decoders (sar.json "decode")
  const dbOf = (v) => (v ? v / 6 - 30 : NaN);
  const changeOf = (v) => (v ? v / 12.75 - 10 : NaN);
  const wetOf = (v) => (v ? (v - 1) / 127 - 1 : NaN);
  const waterOf = (v) => (v ? (v - 1) / 254 : NaN);
  const egmsOf = (v) => (v ? v - 100 : NaN);
  const horizonEnd = () => (state.horizon === 5 ? 2030 : 2035);
  const isFuture = () => state.year > LAST_OBS();
  const s1Year = () => (state.year <= 2018 ? 2017 : state.year <= 2022 ? 2020 : 2024);
  const heatYear = () => clamp(state.year, 2000, 2024);

  /* ================= map ================= */
  let map, borderLayer, labelLayer, choroLayer, pinMarker, nisarLayer, selLayer, baseGL, labelGL, floodLayer;
  const bases = {}, overlays = {}, pixelLayers = {};
  const dark = () => { const t = document.documentElement.getAttribute("data-theme"); return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };

  const CanvasOverlay = L.ImageOverlay.extend({
    _initImage() {
      const el = (this._image = this._url);
      L.DomUtil.addClass(el, "leaflet-image-layer");
      L.DomUtil.addClass(el, "land-canvas");
      if (this._zoomAnimated) L.DomUtil.addClass(el, "leaflet-zoom-animated");
      el.onselectstart = L.Util.falseFn; el.onmousemove = L.Util.falseFn;
    },
  });

  // MODIS footprints in their true sinusoidal shape, clipped to the 18 municipalities
  const PixelLayer = L.GridLayer.extend({
    initialize(key, opts) { this._key = key; L.GridLayer.prototype.initialize.call(this, opts); },
    createTile(coords) {
      const t = document.createElement("canvas"), size = this.getTileSize(), dpr = window.devicePixelRatio || 1;
      t.width = size.x * dpr; t.height = size.y * dpr; t.style.width = size.x + "px"; t.style.height = size.y + "px";
      this._paint(t, coords);
      return t;
    },
    repaint() { Object.values(this._tiles || {}).forEach((tile) => this._paint(tile.el, tile.coords)); },
    _paint(canvas, coords) {
      const ctx = canvas.getContext("2d"), size = this.getTileSize(), dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.x, size.y);
      const key = this._key, P = PIXEL[key], g = P.grid === "N" ? gN : gL, G = P.grid === "N" ? geo.N : geo.L, m = this._map, z = coords.z;
      const nw = coords.scaleBy(size), nwLL = m.unproject(nw, z), seLL = m.unproject(nw.add(size), z);
      ctx.save();
      ctx.beginPath();
      areas.features.forEach((f) => rings(f.geometry).forEach((poly) => poly.forEach((ring) => ring.forEach(([lo, la], k) => {
        const p = m.project([la, lo], z).subtract(nw);
        k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }))));
      ctx.clip();
      for (let i = 0, n = g.rows * g.cols; i < n; i++) {
        const b = i * 4;
        if (G.bb[b + 1] < seLL.lat || G.bb[b] > nwLL.lat || G.bb[b + 3] < nwLL.lng || G.bb[b + 2] > seLL.lng) continue;
        const { v, p } = pixelValue(key, i), col = pixelColour(key, v, p);
        if (!col) continue;
        const k = i * 8;
        ctx.beginPath();
        for (let q = 0; q < 4; q++) {
          const pt = m.project([G.corners[k + q * 2], G.corners[k + q * 2 + 1]], z).subtract(nw);
          q ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y);
        }
        ctx.closePath(); ctx.fillStyle = col; ctx.fill();
        if (z <= 11) { ctx.strokeStyle = col; ctx.lineWidth = 0.6; ctx.stroke(); }
      }
      ctx.restore();
    },
  });
  function pixelValue(key, i) {
    const P = PIXEL[key], g = P.grid === "N" ? gN : gL;
    if (key === "nightyear") return { v: gL.layers.night_years[i][heatYear() - 2000], p: null };
    return { v: g.layers[P.value][i], p: P.p ? g.layers[P.p][i] : null };
  }
  function pixelColour(key, v, p) {
    const P = PIXEL[key];
    if (v == null || !isFinite(v)) return null;
    if (P.seq) return ramp(P.stops, (v - P.min) / (P.max - P.min));
    if (p == null || p >= 0.05) return css("--ns");
    return ramp(v >= 0 ? P.pos : P.neg, Math.abs(v) / P.max);
  }

  /* ---- base map: OpenFreeMap vector tiles, recoloured to the prototype palette; labels drawn above the data ---- */
  let styleJSON = null, themeTok = 0;
  async function makeVectorBase() {
    if (!styleJSON) styleJSON = await fetch("https://tiles.openfreemap.org/styles/positron").then((r) => r.json());
    const style = JSON.parse(JSON.stringify(styleJSON)); // each theme recolours its own copy
    const dk = dark();
    const C = dk
      ? { bg: "#1A1D20", water: "#24394A", park: "#1F2B22", wood: "#22302A", resid: "#1D2023", building: "#2A2E33", road: "#30353A", casing: "#262A2E", text: "#A5ABB1", halo: "#1A1D20" }
      : { bg: "#F1F0EB", water: "#CFE0EC", park: "#DFE8D5", wood: "#D9E5CF", resid: "#ECEBE5", building: "#E3E1DA", road: "#FFFFFF", casing: "#E4E2DB", text: "#6B6F74", halo: "#F1F0EB" };
    const paint = (l) => {
      const id = l.id, p = (l.paint = l.paint || {});
      if (l.type === "background") p["background-color"] = C.bg;
      else if (id === "water") p["fill-color"] = C.water;
      else if (id === "waterway") p["line-color"] = C.water;
      else if (id === "park") p["fill-color"] = C.park;
      else if (id === "landcover_wood") { p["fill-color"] = C.wood; p["fill-opacity"] = 0.9; }
      else if (id === "landuse_residential") p["fill-color"] = C.resid;
      else if (id === "building") { p["fill-color"] = C.building; p["fill-outline-color"] = C.building; }
      else if (l.type === "line" && /casing/.test(id)) p["line-color"] = C.casing;
      else if (l.type === "line" && /highway|road/.test(id)) p["line-color"] = C.road;
      else if (l.type === "symbol") { p["text-color"] = C.text; p["text-halo-color"] = C.halo; }
      return l;
    };
    const baseStyle = { ...style, layers: style.layers.filter((l) => l.type !== "symbol").map(paint) };
    const labelStyle = { ...style, layers: style.layers.filter((l) => l.type === "symbol" && !/shield|country|state/.test(l.id)).map(paint) };
    return {
      base: L.maplibreGL({ style: baseStyle, interactive: false, attribution: '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }),
      labels: L.maplibreGL({ style: labelStyle, interactive: false, pane: "labels" }),
    };
  }

  async function setTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem("ptd-theme", mode); } catch (e) { /* ignore */ }
    // rebuild the vector base map in the matching palette; if the toggle is clicked again meanwhile, only the
    // newest result is used, and the old maps are removed only now (each one holds a WebGL context)
    const tok = ++themeTok;
    let v = null;
    try { v = await makeVectorBase(); } catch (e) { console.warn(e); }
    if (tok !== themeTok) return;
    if (v) {
      ["map", "mapLabels"].forEach((k) => bases[k] && map.hasLayer(bases[k]) && map.removeLayer(bases[k]));
      bases.map = v.base; bases.mapLabels = v.labels;
    }
    setBase(state.base);
    borderLayer.setStyle((f) => ({ color: css("--ink-2"), weight: f.properties.role === "city" ? 1.8 : 0.8, opacity: 0.55, fill: false, dashArray: f.properties.role === "city" ? null : "3 4" }));
    Object.values(pixelLayers).forEach((pl) => map.hasLayer(pl) && pl.repaint());
    redraw(); renderTimeline(); renderDrawer();
    if (state.sel && state.sel.ready) renderCard(); else if (!state.sel) renderFindings();
  }

  async function initMap() {
    map = L.map("map", { zoomControl: false, minZoom: 8, maxZoom: 18, preferCanvas: true, attributionControl: true }).setView(OLD_MARKET, 11);
    map.createPane("land"); map.getPane("land").style.zIndex = 390;
    map.createPane("labels"); map.getPane("labels").style.zIndex = 650; map.getPane("labels").style.pointerEvents = "none";
    map.createPane("sel"); map.getPane("sel").style.zIndex = 660;
    try { const v = await makeVectorBase(); bases.map = v.base; bases.mapLabels = v.labels; }
    catch (e) { // fallback: Esri light grey raster
      console.warn("vector base failed, using raster", e);
      bases.map = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", { maxNativeZoom: 16, maxZoom: 19, attribution: "Esri" });
      bases.mapLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxNativeZoom: 16, maxZoom: 19, pane: "labels" });
    }
    bases.photoLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxNativeZoom: 16, maxZoom: 19, pane: "labels", attribution: "Esri" });
    bases.orto = L.tileLayer.wms("https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution", { layers: "Raster", format: "image/jpeg", version: "1.3.0", maxZoom: 19, attribution: "Ortofotomapa &copy; GUGiK" });
    const geopoz = (svc, layer) => L.tileLayer.wms(`https://wms1.geopoz.poznan.pl:6443/arcgis/services/SIPII/${svc}/MapServer/WMSServer`, { layers: layer, format: "image/png", version: "1.3.0", maxZoom: 19, attribution: "Ortofotomapa &copy; GEOPOZ" });
    bases.poz2025 = geopoz("ortofotomapy", "3");
    bases.poz1940 = geopoz("ortofotomapa_1940", "1");

    LAND_KEYS.forEach((k) => {
      const c = document.createElement("canvas"); c.width = land.width; c.height = land.height;
      overlays[k] = { canvas: c, ctx: c.getContext("2d"), img: null, layer: new CanvasOverlay(c, land.bounds, { opacity: state.lyr[k].op, interactive: false, pane: "land" }) };
      overlays[k].img = overlays[k].ctx.createImageData(land.width, land.height);
    });
    Object.keys(PIXEL).forEach((k) => { pixelLayers[k] = new PixelLayer(k, { opacity: state.lyr[k].op, zIndex: 395, updateWhenZooming: false }); });

    borderLayer = L.geoJSON(areas, { interactive: false, style: (f) => ({ color: css("--ink-2"), weight: f.properties.role === "city" ? 1.8 : 0.8, opacity: 0.55, fill: false, dashArray: f.properties.role === "city" ? null : "3 4" }) }).addTo(map);
    labelLayer = L.layerGroup(areas.features.map((f) => {
      const c = L.geoJSON(f).getBounds().getCenter();
      const nudge = { "Poznań": [0.012, 0], "Luboń": [-0.004, 0.012], "Puszczykowo": [0, 0.02] }[f.properties.name] || [0, 0];
      return L.marker([c.lat + nudge[0], c.lng + nudge[1]], { interactive: false, keyboard: false, pane: "labels",
        icon: L.divIcon({ className: "mlabel" + (f.properties.role === "city" ? " city" : ""), html: `<span>${esc(f.properties.name)}</span>`, iconSize: null }) });
    }));
    choroLayer = L.geoJSON(areas, { interactive: false, pane: "land", style: () => ({ stroke: false, fillOpacity: state.lyr.price.op, fillColor: "#ccc" }) });
    nisarLayer = L.tileLayer("", { maxZoom: 19, maxNativeZoom: 13, opacity: state.lyr.nisar.op, pane: "land", attribution: "NISAR GCOV: NASA-ISRO via NASA GIBS" });
    selLayer = L.layerGroup().addTo(map);
    floodLayer = L.geoJSON(flood, { interactive: false, pane: "land", style: () => ({ color: "#1F6FBF", weight: 1, opacity: 0.8, fillColor: "#3B8FE0", fillOpacity: state.lyr.flood.op }) });
    setBase(state.base);
    map.fitBounds(borderLayer.getBounds(), fitPad());
    map.on("mousemove", onHover);
    map.on("mouseout", () => { $("#hovertip").hidden = true; });
    map.on("click", (e) => { if (!draw.mode && performance.now() > draw.suppressUntil) selectPoint(e.latlng.lat, e.latlng.lng, null); });
    map.on("zoomend", () => $("#map").classList.toggle("far", map.getZoom() < 10));
  }

  function setBase(key) {
    state.base = key;
    ["map", "mapLabels", "photoLabels", "orto", "poz2025", "poz1940"].forEach((k) => bases[k] && map.hasLayer(bases[k]) && map.removeLayer(bases[k]));
    if (key === "map") { bases.map.addTo(map); bases.mapLabels.addTo(map); }
    else {
      if (key !== "orto") bases.map.addTo(map);
      bases[key].addTo(map); bases.photoLabels.addTo(map);
    }
    // the vector base already names towns; our municipality labels are only needed on aerial photos
    const showLabels = key !== "map" && (!$("#borders") || $("#borders").checked);
    if (labelLayer) { if (showLabels) labelLayer.addTo(map); else map.removeLayer(labelLayer); }
    document.documentElement.classList.toggle("on-photo", key !== "map");
  }

  // radar colour composite, shared by the map and its legend so they always agree.
  // Stretches from the 2nd-98th percentiles in the study area: 120 m cells mix surfaces, so contrast is narrower
  // than in single 10-20 m pixels. R = co-pol (VV/HH), G = cross-pol (VH/HV), B = co/cross ratio.
  const RGB_STRETCH = { s1rgb: [-13, -3, -19, -10, 4, 10], alos: [-16, -1, -26, -10, 4, 12] };
  function radarRgb(k, co, cx) {
    const [c0, c1, x0, x1, r0, r1] = RGB_STRETCH[k], sc = (v, a, b) => clamp(((v - a) / (b - a)) * 255, 0, 255) | 0;
    return [sc(co, c0, c1), sc(cx, x0, x1), sc(co - cx, r0, r1)];
  }
  // typical values (dB, co / cross) of each surface in the study area, measured by build_sar.py
  const RADAR_LEGEND = {
    s1rgb: [["rgbBuilt", -5.8, -12.3], ["rgbStrong", -3, -13], ["rgbVeg", -8.2, -13.3], ["rgbBare", -9.5, -17], ["rgbWater", -20, -27]],
    alos: [["rgbBuilt", -6.8, -13.7], ["rgbStrong", -2, -12], ["rgbVeg", -6.3, -11.5], ["rgbBare", -13.8, -22.5], ["rgbWater", -24, -30]],
  };

  /* ================= rendering of the data layers ================= */
  function renderLand(k) {
    const o = overlays[k], px = o.img.data, n = land.width * land.height, st = L8.study, s = state.lyr[k];
    px.fill(0);
    const put = (i, c, a) => { const q = i * 4; px[q] = c[0]; px[q + 1] = c[1]; px[q + 2] = c[2]; px[q + 3] = a; };
    if (k === "built") {
      // Smooth time: blend the two surrounding 5-year epochs, so dragging or playing the timeline flows year by year.
      const yf = clamp(state.yearF, land.epochs[0], horizonEnd()), last = LAST_OBS();
      const yo = Math.min(yf, last), e0 = Math.min(last, land.epochs[0] + Math.floor((yo - land.epochs[0]) / 5) * 5), e1 = Math.min(last, e0 + 5);
      const t = e1 > e0 ? (yo - e0) / 5 : 0, a0 = smoothed(e0), a1 = smoothed(e1), lut = lutFor(RAMPS.built);
      for (let i = 0; i < n; i++) {
        if (!st[i]) continue;
        const v = a0[i] + (a1[i] - a0[i]) * t;
        if (v < 0.04) continue;
        const k = (Math.sqrt(v) * 255) | 0, q = i * 4, a = 60 + v * 520;
        px[q] = lut[k * 3]; px[q + 1] = lut[k * 3 + 1]; px[q + 2] = lut[k * 3 + 2]; px[q + 3] = a > 235 ? 235 : a;
      }
      if (yf > last) { // projected new building (filtered by the model's chance) fades in between projection steps
        const purple = hexRgb(css("--pred"));
        const p0y = Math.max(last, last + Math.floor((yf - last) / 5) * 5), p1y = Math.min(horizonEnd(), p0y + 5), tp = p1y > p0y ? (yf - p0y) / 5 : 0;
        const P0 = p0y === last ? null : projSmoothed(p0y), P1 = projSmoothed(p1y);
        for (let i = 0; i < n; i++) {
          if (!st[i]) continue;
          const v0 = P0 ? P0[i] : 0, v = v0 + (P1[i] - v0) * tp;
          if (v > 0.05) { const q = i * 4; px[q] = purple[0]; px[q + 1] = purple[1]; px[q + 2] = purple[2]; px[q + 3] = 70 + v * 170; }
        }
      }
    } else if (k === "forest") {
      const loss = L8.forest_loss, lf = L8.loss_frac, ff = L8.forest2000_frac, green = hexRgb(css("--c-forest"));
      const upTo = Math.min(state.year, 2024);
      for (let i = 0; i < n; i++) {
        if (!st[i]) continue;
        const y = loss[i] ? 2000 + loss[i] : 0;
        if (y && y <= upTo && lf[i] > 0) { const k = (((y - 2001) / 23) * 255) | 0, L = lutFor(RAMPS.loss); put(i, [L[k * 3], L[k * 3 + 1], L[k * 3 + 2]], Math.min(240, 110 + (lf[i] / 255) * 400)); }
        else if (ff[i] > 60) put(i, green, Math.round((ff[i] / 255) * 90));
      }
    } else if (k === "activity") {
      const a = L8.s1_2017, b = L8.s1_2024, up = hexRgb(css("--c-terrain")), down = hexRgb("#7A6FB0");
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i] || !b[i]) continue;
        const d = (b[i] - a[i]) / 6;
        if (Math.abs(d) < s.min) continue;
        put(i, d > 0 ? up : down, Math.round(clamp(120 + (Math.abs(d) - s.min) * 30, 0, 240)));
      }
    } else if (k === "dem") {
      const d = L8.dem, off = land.dem_offset;
      for (let i = 0; i < n; i++) {
        if (!st[i]) continue;
        const m = d[i] / 2 + off;
        if (m < s.lo || m > s.hi) continue;
        put(i, rampRgb(RAMPS.terrain, (m - s.lo) / Math.max(1, s.hi - s.lo)), 200);
      }
    } else if (k === "radar") {
      const a = L8[`s1_${s1Year()}`];
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const db = a[i] / 6 - 30;
        if (db < s.lo || db > s.hi) continue;
        put(i, rampRgb(RAMPS.radar, (db - s.lo) / Math.max(1, s.hi - s.lo)), 215);
      }
    } else if (k === "s1rgb" || k === "alos") {
      // classic radar colour composite: R = co-pol (VV/HH), G = cross-pol (VH/HV), B = co/cross ratio
      const [hn, vn] = k === "alos" ? lbandNames(s.y) : ["sar_vv_med", "sar_vh_med"], co = L8[hn], cx = L8[vn];
      for (let i = 0; i < n; i++) {
        if (!st[i] || !co[i] || !cx[i]) continue;
        const c = radarRgb(k, dbOf(co[i]), dbOf(cx[i])), q = i * 4;
        px[q] = c[0]; px[q + 1] = c[1]; px[q + 2] = c[2]; px[q + 3] = 235;
      }
    } else if (k === "sarchange") {
      const a = L8.sar_change, r = L8.sar_dratio, wall = lutFor(RAMPS.up), soft = lutFor(RAMPS.upSoft), dn = lutFor(RAMPS.down), wd = sar.s1.wall_db || 1.5;
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const d = changeOf(a[i]);
        if (Math.abs(d) < s.min) continue;
        const isWall = d > 0 && r[i] && changeOf(r[i]) >= wd;
        const t = clamp((Math.abs(d) - s.min) / 6, 0, 1), L = d < 0 ? dn : isWall ? wall : soft, j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], (isWall ? 190 : 130) + t * 60);
      }
    } else if (k === "nisarwet") {
      // NISAR HH, wet pass (24 Aug) minus dry pass (25 Jun), open land only
      const a = L8.nisar_wetdry, wet = lutFor(RAMPS.wet), dry = lutFor(RAMPS.brown);
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const d = changeOf(a[i]);
        if (Math.abs(d) < s.min) continue;
        const t = clamp((Math.abs(d) - s.min) / 6, 0, 1), L = d > 0 ? wet : dry, j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], 140 + t * 100);
      }
    } else if (k === "sarwet") {
      const a = L8.sar_wet, rc = sar.s1.r_crit, L = lutFor(RAMPS.wet);
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const r = wetOf(a[i]);
        if (r < rc) continue;
        const t = clamp((r - rc) / (0.85 - rc), 0, 1), j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], 120 + t * 120);
      }
    } else if (k === "sarwater") {
      const a = L8.sar_water, L = lutFor(RAMPS.water), m = s.min / 100;
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const w = waterOf(a[i]);
        if (w < m) continue;
        const t = clamp((w - m) / Math.max(0.05, 1 - m), 0, 1), j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], 140 + t * 110);
      }
    } else if (k === "egms") {
      const a = L8.sar_egms, sub = lutFor(RAMPS.sink), upl = lutFor(RAMPS.cool);
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const v = egmsOf(a[i]);
        if (Math.abs(v) < s.min) continue;
        const t = clamp((Math.abs(v) - s.min) / 8, 0, 1), L = v < 0 ? sub : upl, j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], 170 + t * 80);
      }
    }
    o.ctx.putImageData(o.img, 0, 0);
  }

  function renderChoro() {
    const y = clamp(state.year, 2010, 2025);
    const pz = priceSeries("Poznań (city)", "633677"), pp = priceSeries("Powiat poznański", "633677");
    choroLayer.setStyle((f) => {
      const v = (f.properties.role === "city" ? pz : pp)[y];
      return { stroke: false, fillOpacity: state.lyr.price.op, fillColor: v ? ramp(RAMPS.price, (v - 3500) / 9000) : css("--ns") };
    });
  }

  let queued = false;
  function redraw() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      LAND_KEYS.forEach((k) => {
        const on = state.lyr[k].on && ready(k);
        if (on) { renderLand(k); if (!map.hasLayer(overlays[k].layer)) overlays[k].layer.addTo(map); overlays[k].layer.setOpacity(state.lyr[k].op); }
        else if (map.hasLayer(overlays[k].layer)) map.removeLayer(overlays[k].layer);
      });
      Object.keys(PIXEL).forEach((k) => {
        const pl = pixelLayers[k];
        if (state.lyr[k].on) { if (!map.hasLayer(pl)) pl.addTo(map); else if (k === "nightyear") pl.repaint(); pl.setOpacity(state.lyr[k].op); }
        else if (map.hasLayer(pl)) map.removeLayer(pl);
      });
      if (state.lyr.flood.on) { floodLayer.setStyle({ fillOpacity: state.lyr.flood.op }); if (!map.hasLayer(floodLayer)) floodLayer.addTo(map); } else if (map.hasLayer(floodLayer)) map.removeLayer(floodLayer);
      if (state.lyr.price.on) { renderChoro(); if (!map.hasLayer(choroLayer)) choroLayer.addTo(map); } else if (map.hasLayer(choroLayer)) map.removeLayer(choroLayer);
      if (state.lyr.nisar.on && NISAR_DATES.length) {
        nisarLayer.setUrl(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/NISAR_L2_Geocoded_Polarimetric_Covariance/default/${NISAR_DATES[state.lyr.nisar.i]}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`, true);
        nisarLayer.setOpacity(state.lyr.nisar.op);
        if (!map.hasLayer(nisarLayer)) nisarLayer.addTo(map); else nisarLayer.redraw();
      } else if (map.hasLayer(nisarLayer)) map.removeLayer(nisarLayer);
      renderLegend();
    });
  }
  async function ensure(k) {
    if (!NEEDS[k] || ready(k)) return;
    $("#map").style.cursor = "progress";
    try { await Promise.all(NEEDS[k]().map(loadGray)); } catch (e) { console.error(e); }
    $("#map").style.cursor = "";
  }

  /* ================= timeline ================= */
  const TL_MIN = 1975;
  const pos = (y) => ((y - TL_MIN) / (horizonEnd() - TL_MIN)) * 100;
  function renderTimeline() {
    const u = U(), inp = $("#year"), end = horizonEnd();
    inp.max = end; inp.min = TL_MIN;
    if (state.year > end) state.year = end;
    if (document.activeElement !== inp || playing) inp.value = state.yearF;
    const nowP = pos(Math.min(NOW_YEAR, end)), obsP = pos(LAST_OBS()), curP = pos(state.yearF);
    $("#tl-fill").style.width = `${Math.min(curP, obsP)}%`;
    $("#tl-future").style.left = `${obsP}%`;
    $("#tl-future").innerHTML = state.yearF > LAST_OBS() ? `<span class="on" style="width:${((curP - obsP) / (100 - obsP)) * 100}%"></span>` : "";
    $("#tl-now").style.left = `${nowP}%`;
    $("#tl-real").textContent = u.measured;
    $("#tl-pred").textContent = u.predicted;
    $("#tl-pred").style.left = `${obsP + 1}%`;
    $("#tl-year").textContent = state.year;
    $("#tl-kind").textContent = isFuture() ? u.modelForecast : u.fromMeasurements;
    $("#timeline").classList.toggle("future", isFuture());
    const ticks = innerWidth < 760 ? [1975, 2000] : [1975, 1985, 1995, 2005, 2015];
    // keep "Today" and the end year apart on narrow tracks: shorten the label, then drop the end year
    const gap = ((100 - nowP) / 100) * ($("#tl-ticks").offsetWidth || innerWidth);
    const nowTxt = gap < 120 ? u.today : `${u.today} · ${NOW_YEAR}`;
    $("#tl-ticks").innerHTML = ticks.map((y, i) => `<span class="${i === 0 ? "first" : ""}" style="left:${pos(y)}%">${y}</span>`).join("") +
      `<span class="now" style="left:${nowP}%">${nowTxt}</span>${gap < 64 ? "" : `<span class="last" style="left:100%">${end}</span>`}`;
  }
  let cardT = null, playing = false, playRaf = 0, playLast = 0;
  function setYear(y, opts = {}) {
    state.yearF = clamp(y, TL_MIN, horizonEnd());
    const prev = state.year;
    state.year = Math.round(state.yearF);
    renderTimeline();
    redraw();
    // the side card is heavier: refresh it once the year settles (or every whole year while playing)
    if (state.sel && state.sel.ready && (state.year !== prev || opts.now)) {
      clearTimeout(cardT);
      cardT = setTimeout(renderCard, playing ? 0 : 180);
    }
  }
  const PLAY_SPEED = 7; // years per second: 1975 -> 2035 in about 9 s
  function stopPlay() {
    playing = false; cancelAnimationFrame(playRaf);
    $("#play").classList.remove("on"); $("#play").setAttribute("aria-label", U().play);
  }
  function togglePlay() {
    if (playing) { stopPlay(); return; }
    if (state.yearF >= horizonEnd() - 0.01) setYear(TL_MIN);
    playing = true; playLast = performance.now();
    $("#play").classList.add("on"); $("#play").setAttribute("aria-label", U().pause);
    const step = (now) => {
      if (!playing) return;
      const dt = Math.min(0.1, (now - playLast) / 1000); playLast = now;
      const next = state.yearF + dt * PLAY_SPEED;
      if (next >= horizonEnd()) { setYear(horizonEnd()); stopPlay(); return; }
      setYear(next);
      playRaf = requestAnimationFrame(step);
    };
    playRaf = requestAnimationFrame(step);
  }

  /* ================= legend ================= */
  function renderLegend() {
    const u = U(), blocks = [];
    const ramp_ = (stops, lo, hi) => `<div class="ramp" style="background:${gradient(stops)}"></div><div class="ticks"><span>${lo}</span><span>${hi}</span></div>`;
    const L_ = state.lyr;
    if (sar) {
      const sw = (c, t) => `<div class="lrow"><span class="sw" style="background:${c}"></span>${t}</div>`;
      if (L_.sarchange.on) blocks.push(`<div class="lt">${u.lg.sarchange}</div>${sw(RAMPS.up[1], u.lg.wallsNow)}${sw(RAMPS.upSoft[2], u.lg.brighterNow)}${sw(RAMPS.down[2], u.lg.darkerNow)}`);
      if (L_.nisarwet.on && sar.nisar) blocks.push(`<div class="lt">${u.lg.nisarwet}</div>${sw(RAMPS.wet[2], u.lg.wetter)}${sw(RAMPS.brown[2], u.lg.drier)}`);
      if (L_.sarwet.on) blocks.push(`<div class="lt">${u.lg.sarwet}</div>${ramp_(RAMPS.wet, u.lg.weak, u.lg.strong)}`);
      if (L_.sarwater.on) blocks.push(`<div class="lt">${u.lg.sarwater}</div>${ramp_(RAMPS.water, `${L_.sarwater.min}%`, "100%")}`);
      if (L_.egms.on) blocks.push(`<div class="lt">${u.lg.egms}</div>${sw(RAMPS.sink[2], u.lg.sinks)}${sw(RAMPS.cool[2], u.lg.rises)}`);
      if (L_.s1rgb.on || L_.alos.on) {
        const kk = L_.alos.on && !L_.s1rgb.on ? "alos" : "s1rgb";
        blocks.push(`<div class="lt">${kk === "alos" ? (L_.alos.y === 2026 ? u.lg.nisarL : u.lg.alos(L_.alos.y)) : u.lg.s1rgb}</div>` +
          RADAR_LEGEND[kk].map(([lab, co, cx]) => sw(`rgb(${radarRgb(kk, co, cx).join(",")})`, u.lg[lab])).join(""));
      }
    }
    if (L_.built.on) blocks.push(`<div class="lt">${u.lg.built}</div>${ramp_(RAMPS.built, u.lg.low, u.lg.high)}${isFuture() ? `<div class="lrow"><span class="sw" style="background:${css("--pred")}"></span>${u.lg.projected}</div>` : ""}`);
    if (L_.forest.on) blocks.push(`<div class="lt">${u.lg.forest}</div>${ramp_(RAMPS.loss, "2001", String(Math.min(state.year, 2024)))}<div class="lrow"><span class="sw" style="background:${css("--c-forest")};opacity:.5"></span>${u.lg.forestLeft}</div>`);
    if (L_.price.on) blocks.push(`<div class="lt">${u.lg.price(clamp(state.year, 2010, 2025))}</div>${ramp_(RAMPS.price, "3 500 zł", "12 500 zł")}`);
    if (L_.flood.on) blocks.push(`<div class="lt">${u.lg.flood}</div><div class="lrow"><span class="sw" style="background:#3B8FE0"></span>${u.lg.floodNote}</div>`);
    if (L_.activity.on) blocks.push(`<div class="lt">${u.lg.activity}</div><div class="lrow"><span class="sw" style="background:${css("--c-terrain")}"></span>${u.lg.brighter}</div><div class="lrow"><span class="sw" style="background:#7A6FB0"></span>${u.lg.darker}</div>`);
    if (L_.dem.on) blocks.push(`<div class="lt">${u.lg.dem}</div>${ramp_(RAMPS.terrain, `${L_.dem.lo} m`, `${L_.dem.hi} m`)}`);
    if (L_.radar.on) blocks.push(`<div class="lt">${u.lg.radar(s1Year())}</div>${ramp_(RAMPS.radar, `${L_.radar.lo} dB`, `${L_.radar.hi} dB`)}`);
    if (L_.nisar.on) blocks.push(`<div class="lt">${u.lg.nisar(NISAR_DATES[L_.nisar.i] || "")}</div><div class="lrow">${u.lg.nisarNote}</div>`);
    ["night", "day", "ndvi"].forEach((k) => { if (L_[k].on) { const P = PIXEL[k]; blocks.push(`<div class="lt">${u.L[k]}</div>${ramp_([...P.neg].reverse().concat([css("--ns")], P.pos), sgn(-P.max, P.max < 1 ? 2 : 1), sgn(P.max, P.max < 1 ? 2 : 1))}<div class="lrow"><span class="sw" style="background:${css("--ns")}"></span>${T().notSig}</div>`); } });
    if (L_.nightyear.on) blocks.push(`<div class="lt">${u.lg.nightyear(heatYear())}</div>${ramp_(RAMPS.heat, "10 °C", "20 °C")}`);
    $("#legend").innerHTML = blocks.map((b) => `<div class="lblock">${b}</div>`).join("");
    // the side card above it shrinks so the legend is never covered
    document.documentElement.style.setProperty("--legend-h", `${blocks.length ? $("#legend").offsetHeight + 8 : 0}px`);
  }

  /* ================= drawer (map settings) ================= */
  const DOT = { s1rgb: "--c-radar", sarchange: "--c-built", sarwet: "--c-radar", sarwater: "--area", egms: "--c-heat", alos: "--c-green", nisarwet: "--c-nisar", flood: "--area", built: "--c-built", forest: "--c-forest", price: "--c-price", activity: "--c-terrain", dem: "--c-terrain", radar: "--ink-2", nisar: "--c-nisar", night: "--c-heat", day: "--c-heat", ndvi: "--c-green", nightyear: "--c-heat" };
  function rangeHTML(id, min, max, step, lo, hi, cls = "") {
    const a = ((lo - min) / (max - min)) * 100, b = hi == null ? a : ((hi - min) / (max - min)) * 100;
    return `<div class="rng ${cls}" data-rng="${id}"><div class="rail"></div><div class="fill" style="left:${hi == null ? 0 : a}%;width:${hi == null ? a : b - a}%"></div>
      <input type="range" data-id="${id}" data-end="lo" min="${min}" max="${max}" step="${step}" value="${lo}">
      ${hi == null ? "" : `<input type="range" data-id="${id}" data-end="hi" min="${min}" max="${max}" step="${step}" value="${hi}">`}</div>`;
  }
  function layerRow(k, extra = "") {
    const u = U(), s = state.lyr[k];
    return `<div class="lyr${s.on ? "" : " off"}" data-k="${k}">
      <div class="lyr-head"><label class="lyr-name" for="sw-${k}"><span class="dot" style="background:${css(DOT[k])}"></span><span>${u.L[k]}<small>${u.Lsub[k]}</small></span></label>
        <span class="switch"><input type="checkbox" id="sw-${k}" data-toggle="${k}" ${s.on ? "checked" : ""}><span></span></span></div>
      <div class="lyr-ctrl">${extra}<div class="field"><div class="field-head"><span class="fl" style="font-size:13px;color:var(--ink-2)">${u.opacity}</span><output>${Math.round(s.op * 100)}%</output></div>${rangeHTML(`op-${k}`, 20, 100, 5, Math.round(s.op * 100))}</div></div>
    </div>`;
  }
  const lbLabel = (y) => (y === 2026 ? "2026 (NISAR)" : `${y} (ALOS-2)`);
  function renderDrawer() {
    const u = U(), L_ = state.lyr;
    const demMax = Math.ceil(Math.max(...Object.values(land.municipalities).map((m) => m.elev_max))); // 164 m: the hills too
    const dem = `<div class="field"><div class="field-head"><span class="fl">${u.demRange}</span><output>${L_.dem.lo}–${L_.dem.hi} m ${u.asl}</output></div>${rangeHTML("dem", Math.floor(land.dem_offset), demMax, 1, L_.dem.lo, L_.dem.hi)}</div>`;
    const radar = `<div class="field"><div class="field-head"><span class="fl">${u.radarRange}</span><output>${L_.radar.lo} ${u.to} ${L_.radar.hi} dB</output></div>${rangeHTML("radar", -25, 5, 1, L_.radar.lo, L_.radar.hi)}<div class="hint">${u.radarHint(s1Year())}</div></div>`;
    const act = `<div class="field"><div class="field-head"><span class="fl">${u.minChange}</span><output>${num(L_.activity.min, 1)} dB</output></div>${rangeHTML("act", 1, 8, 0.5, L_.activity.min)}</div>`;
    const nis = NISAR_DATES.length ? `<div class="field"><div class="field-head"><span class="fl">${u.pass}</span><output>${NISAR_DATES[L_.nisar.i]}</output></div>${rangeHTML("nisar", 0, NISAR_DATES.length - 1, 1, L_.nisar.i)}</div>` : "";
    const field = (label, out, rng) => `<div class="field"><div class="field-head"><span class="fl">${label}</span><output>${out}</output></div>${rng}</div>`;
    const radarSecs = sar ? `
      <details class="sec" open><summary>${u.secRadar}</summary><div class="sec-body">
        ${layerRow("s1rgb")}
        ${layerRow("sarchange", field(u.minDb, `${num(L_.sarchange.min, 1)} dB`, rangeHTML("sch", 1, 8, 0.5, L_.sarchange.min)))}
        ${layerRow("sarwet")}
        ${layerRow("sarwater", field(u.minWater, `${L_.sarwater.min}%`, rangeHTML("swa", 10, 90, 5, L_.sarwater.min)))}
        ${sar.nisar ? layerRow("nisarwet", field(u.minDb, `${num(L_.nisarwet.min, 1)} dB`, rangeHTML("nwm", 1, 6, 0.5, L_.nisarwet.min))) : ""}
        ${layerRow("nisar", nis)}
      </div></details>
      <details class="sec" open><summary>${u.secGround}</summary><div class="sec-body">
        ${layerRow("egms", field(u.minMove, `${L_.egms.min} mm/${u.yr}`, rangeHTML("seg", 1, 10, 1, L_.egms.min)))}
        ${layerRow("alos", field(u.alosYear, lbLabel(L_.alos.y), rangeHTML("aly", 0, LBAND_YEARS().length - 1, 1, Math.max(0, LBAND_YEARS().indexOf(L_.alos.y)))))}
        ${layerRow("dem", dem)}${layerRow("radar", radar)}${layerRow("activity", act)}
      </div></details>` : `
      <details class="sec" open><summary>${u.secSar}</summary><div class="sec-body">
        ${layerRow("dem", dem)}${layerRow("radar", radar)}${layerRow("nisar", nis)}${layerRow("activity", act)}
      </div></details>`;
    $("#drawer-body").innerHTML = `${radarSecs}
      <details class="sec" ${sar ? "" : "open"}><summary>${sar ? u.secHistory : u.secLayers}</summary><div class="sec-body">
        ${layerRow("built")}${layerRow("forest")}${layerRow("price")}${layerRow("flood")}
      </div></details>
      <details class="sec" open><summary>${u.secPred}</summary><div class="sec-body">
        <div class="field"><div class="field-head"><span class="fl">${u.horizon}</span></div>
          <div class="seg" role="group"><button type="button" data-hz="5" aria-pressed="${state.horizon === 5}">${u.years5}</button><button type="button" data-hz="10" aria-pressed="${state.horizon === 10}">${u.years10}</button></div></div>
        <div class="field"><div class="field-head"><span class="fl">${u.minChance}</span><output>${state.minChance}%</output></div>${rangeHTML("chance", 1, 40, 1, state.minChance, null, "pred")}
          <div class="hint">${u.chanceHint(num(land.model.top_n_hit_rate * 100, 0), num(land.model.open_land_auc, 2))}</div></div>
      </div></details>
      <details class="sec"><summary>${u.secNasa}</summary><div class="sec-body">
        ${layerRow("night")}${layerRow("day")}${layerRow("ndvi")}${layerRow("nightyear")}
      </div></details>
      <details class="sec"><summary>${u.secBase}</summary><div class="sec-body">
        <div class="basegrid">${["map", "orto", "poz2025", "poz1940"].map((k) => `<button type="button" data-base="${k}" aria-pressed="${state.base === k}">${T().B[k] || u.baseMap}</button>`).join("")}</div>
        <div class="checkrow"><span>${T().borders}</span><span class="switch"><input type="checkbox" id="borders" ${map.hasLayer(borderLayer) ? "checked" : ""}><span></span></span></div>
      </div></details>
      <details class="sec link" id="sources-link"><summary>${u.secSources}</summary></details>`;
    $("#drawer-foot").textContent = u.footer;
    wireDrawer();
  }
  function syncRange(el) {
    const box = el.closest(".rng"), ins = box.querySelectorAll("input"), fill = box.querySelector(".fill");
    const min = +ins[0].min, max = +ins[0].max, p = (v) => ((v - min) / (max - min)) * 100;
    if (ins.length === 2) {
      let lo = +ins[0].value, hi = +ins[1].value;
      if (lo > hi) { if (el === ins[0]) { lo = hi; ins[0].value = lo; } else { hi = lo; ins[1].value = hi; } }
      fill.style.left = `${p(lo)}%`; fill.style.width = `${p(hi) - p(lo)}%`;
      return [lo, hi];
    }
    fill.style.left = "0"; fill.style.width = `${p(+ins[0].value)}%`;
    return [+ins[0].value];
  }
  function wireDrawer() {
    const body = $("#drawer-body"), u = U();
    body.querySelectorAll("[data-toggle]").forEach((cb) => cb.addEventListener("change", async () => {
      const k = cb.dataset.toggle;
      state.lyr[k].on = cb.checked;
      cb.closest(".lyr").classList.toggle("off", !cb.checked);
      if (cb.checked) await ensure(k);
      redraw();
    }));
    body.querySelectorAll(".rng input").forEach((inp) => inp.addEventListener("input", () => {
      const vals = syncRange(inp), id = inp.dataset.id, out = inp.closest(".field").querySelector("output");
      if (id.startsWith("op-")) { const k = id.slice(3); state.lyr[k].op = vals[0] / 100; out.textContent = `${vals[0]}%`; }
      else if (id === "dem") { [state.lyr.dem.lo, state.lyr.dem.hi] = vals; out.textContent = `${vals[0]}–${vals[1]} m ${u.asl}`; }
      else if (id === "radar") { [state.lyr.radar.lo, state.lyr.radar.hi] = vals; out.textContent = `${vals[0]} ${u.to} ${vals[1]} dB`; }
      else if (id === "act") { state.lyr.activity.min = vals[0]; out.textContent = `${num(vals[0], 1)} dB`; }
      else if (id === "nisar") { state.lyr.nisar.i = vals[0]; out.textContent = NISAR_DATES[vals[0]]; }
      else if (id === "chance") { state.minChance = vals[0]; out.textContent = `${vals[0]}%`; }
      else if (id === "sch") { state.lyr.sarchange.min = vals[0]; out.textContent = `${num(vals[0], 1)} dB`; }
      else if (id === "swa") { state.lyr.sarwater.min = vals[0]; out.textContent = `${vals[0]}%`; }
      else if (id === "seg") { state.lyr.egms.min = vals[0]; out.textContent = `${vals[0]} mm/${u.yr}`; }
      else if (id === "aly") { state.lyr.alos.y = LBAND_YEARS()[vals[0]]; out.textContent = lbLabel(state.lyr.alos.y); if (state.lyr.alos.on) { ensure("alos").then(redraw); return; } }
      else if (id === "nwm") { state.lyr.nisarwet.min = vals[0]; out.textContent = `${num(vals[0], 1)} dB`; }
      redraw();
    }));
    body.querySelectorAll("[data-hz]").forEach((b) => b.addEventListener("click", () => {
      state.horizon = +b.dataset.hz;
      body.querySelectorAll("[data-hz]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      setYear(state.yearF, { now: true }); // clamps the year to the new horizon and keeps slider, label and bar in step
      if (state.sel && state.sel.ready) renderCard();
    }));
    body.querySelectorAll("[data-base]").forEach((b) => b.addEventListener("click", () => {
      setBase(b.dataset.base);
      body.querySelectorAll("[data-base]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    const bd = $("#borders");
    if (bd) bd.addEventListener("change", () => {
      if (bd.checked) borderLayer.addTo(map); else map.removeLayer(borderLayer);
      if (bd.checked && state.base !== "map") labelLayer.addTo(map); else map.removeLayer(labelLayer);
    });
    $("#sources-link").addEventListener("click", (e) => { e.preventDefault(); $("#about-sheet").showModal(); });
  }
  function openDrawer(open) {
    $("#drawer").hidden = !open;
    document.body.classList.toggle("drawer-open", open);
    $("#menu-btn").setAttribute("aria-expanded", String(open));
    setTimeout(() => map.invalidateSize(), 50);
  }

  /* ================= hover ================= */
  function onHover(e) {
    const tip = $("#hovertip");
    if (draw.mode) { tip.hidden = true; return; }
    const { lat, lng } = e.latlng, f = areaAt(lat, lng);
    if (!f) { tip.hidden = true; return; }
    const lines = [], u = U(), c = land && landCell(lat, lng);
    if (sar && c) {
      const Ly = state.lyr;
      if ((Ly.s1rgb.on && ready("s1rgb")) || (Ly.alos.on && ready("alos"))) {
        const [hn, vn] = lbandNames(Ly.alos.y);
        const [a, b, tag] = Ly.s1rgb.on ? [L8.sar_vv_med[c.i], L8.sar_vh_med[c.i], "VV/VH"] : [L8[hn][c.i], L8[vn][c.i], "HH/HV"];
        if (a && b) lines.push(`${tag}: ${num(dbOf(a), 1)} / ${num(dbOf(b), 1)} dB`);
      }
      if (Ly.sarchange.on && ready("sarchange") && L8.sar_change[c.i]) lines.push(`${u.L.sarchange}: ${sgn(changeOf(L8.sar_change[c.i]), 1)} dB`);
      if (Ly.nisarwet.on && ready("nisarwet") && L8.nisar_wetdry[c.i]) lines.push(`${u.L.nisarwet}: ${sgn(changeOf(L8.nisar_wetdry[c.i]), 1)} dB`);
      if (Ly.sarwet.on && ready("sarwet") && L8.sar_wet[c.i]) lines.push(`${u.L.sarwet}: r = ${num(wetOf(L8.sar_wet[c.i]), 2)}`);
      if (Ly.sarwater.on && ready("sarwater") && L8.sar_water[c.i]) lines.push(`${u.L.sarwater}: ${num(waterOf(L8.sar_water[c.i]) * 100, 0)}%`);
      if (Ly.egms.on && ready("egms")) lines.push(L8.sar_egms[c.i] ? `${u.L.egms}: ${sgn(egmsOf(L8.sar_egms[c.i]), 0)} mm/${u.yr}` : `${u.L.egms}: ${u.noPoints}`);
    }
    if (state.lyr.built.on && ready("built") && c) {
      const { e0, e1, t } = epochPair(state.year), a = L8[`built_${e0}`][c.i], b = L8[`built_${e1}`][c.i];
      const v = (a + (b - a) * t) / 255;
      lines.push(`${u.L.built}: ${num(v * 100, 0)}%`);
    }
    if (state.lyr.forest.on && ready("forest") && c) {
      const y = L8.forest_loss[c.i];
      if (y && L8.loss_frac[c.i]) lines.push(`${u.lossYear}: ${2000 + y}`);
    }
    if (state.lyr.dem.on && ready("dem") && c) lines.push(`${num(L8.dem[c.i] / 2 + land.dem_offset, 0)} m ${u.asl}`);
    if (state.lyr.radar.on && ready("radar") && c) { const a = L8[`s1_${s1Year()}`][c.i]; if (a) lines.push(`${num(a / 6 - 30, 1)} dB (${s1Year()})`); }
    if (state.lyr.activity.on && ready("activity") && c) { const a = L8.s1_2017[c.i], b = L8.s1_2024[c.i]; if (a && b) lines.push(`${u.L.activity}: ${sgn((b - a) / 6, 1)} dB`); }
    ["night", "day", "ndvi", "nightyear"].forEach((k) => {
      if (!state.lyr[k].on) return;
      const P = PIXEL[k], g = P.grid === "N" ? gN : gL, i = cellAt(g, lat, lng);
      if (i < 0) return;
      const { v, p } = pixelValue(k, i);
      if (v == null) return;
      lines.push(P.seq ? `${num(v, 1)} °C (${heatYear()})` : `${u.L[k]}: ${sgn(v, P.d)} ${P.unit}/${u.dec}${p < 0.05 ? "" : ` (${T().place.notProven.toLowerCase()})`}`);
    });
    if (state.lyr.flood.on && inFlood(lat, lng)) lines.push(u.lg.flood);
    if (state.lyr.price.on) { const v = priceSeries(f.properties.role === "city" ? "Poznań (city)" : "Powiat poznański", "633677")[clamp(state.year, 2010, 2025)]; if (v) lines.push(`${fmtInt(v)} zł/m²`); }
    if (!lines.length) { tip.hidden = true; return; }
    tip.innerHTML = `<b>${esc(f.properties.name)}</b><br>${lines.join("<br>")}`;
    tip.hidden = false;
    const x = e.originalEvent.clientX, y = e.originalEvent.clientY;
    tip.style.left = `${Math.min(x + 14, innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${Math.min(y + 14, innerHeight - tip.offsetHeight - 8)}px`;
  }

  /* ================= drawing an area ================= */
  // Pointer events on the map container: works with mouse, pen and touch, keeps tracking when the pointer
  // leaves the map (pointer capture), and never lets the click that ends a drawing select a point instead.
  const draw = { mode: null, pts: [], shape: null, guide: null, vtx: null, down: false, suppressUntil: 0, pointerId: null };
  // selection drawn like a surveyor's mark: thin ink line over a light halo, readable on the map and on radar colours
  const AREA_STYLE = () => ({ color: css("--ink"), weight: 2, fillColor: css("--ink"), fillOpacity: 0.04, lineJoin: "round", pane: "sel" });
  const HALO = () => (dark() ? "rgba(0,0,0,.6)" : "rgba(255,255,255,.92)");
  function selOutline(ring, dashed) {
    L.polygon(ring, { pane: "sel", interactive: false, color: HALO(), weight: 5.5, fill: false, lineJoin: "round" }).addTo(selLayer);
    L.polygon(ring, { ...AREA_STYLE(), interactive: false, dashArray: dashed ? "1 6" : null, lineCap: "round", weight: dashed ? 2.6 : 2 }).addTo(selLayer);
  }
  const drawHint = (txt) => { $("#drawhint").hidden = !txt; $("#drawhint-text").textContent = txt || ""; };
  function startDraw(mode) {
    stopDraw();
    draw.mode = mode; draw.pts = [];
    $("#tool-free").setAttribute("aria-pressed", String(mode === "free"));
    $("#tool-poly").setAttribute("aria-pressed", String(mode === "poly"));
    $("#map").classList.add("drawing");
    drawHint(mode === "free" ? U().hintFree : U().hintPoly);
    map.dragging.disable(); map.doubleClickZoom.disable(); map.touchZoom.disable(); map.boxZoom.disable();
    draw.vtx = L.layerGroup().addTo(map);
  }
  function stopDraw() {
    draw.mode = null; draw.pts = []; draw.down = false;
    [draw.shape, draw.guide, draw.vtx].forEach((l) => l && map.removeLayer(l));
    draw.shape = draw.guide = draw.vtx = null;
    $("#tool-free").setAttribute("aria-pressed", "false"); $("#tool-poly").setAttribute("aria-pressed", "false");
    $("#map").classList.remove("drawing"); drawHint("");
    map.dragging.enable(); map.doubleClickZoom.enable(); map.touchZoom.enable(); map.boxZoom.enable();
  }
  function updateShape(closed) {
    const style = { ...AREA_STYLE(), interactive: false, fillOpacity: closed ? 0.12 : 0, dashArray: closed ? null : "6 5" };
    if (!draw.shape) draw.shape = L.polygon(draw.pts, style).addTo(map);
    else { draw.shape.setLatLngs(draw.pts); draw.shape.setStyle(style); }
  }
  function redrawVertices(hoverFirst) {
    if (!draw.vtx) return;
    draw.vtx.clearLayers();
    draw.pts.forEach((p, k) => L.circleMarker(p, {
      pane: "sel", interactive: false, radius: k === 0 ? (hoverFirst ? 8 : 6) : 4.5, weight: 2,
      color: css("--ink"), fillColor: k === 0 && hoverFirst ? css("--ink") : "#fff", fillOpacity: 1,
    }).addTo(draw.vtx));
  }
  // Douglas-Peucker in screen pixels, so long freehand strokes become light, clean polygons
  function simplify(latlngs, tolPx) {
    const pts = latlngs.map((ll) => map.latLngToContainerPoint(ll));
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop(); let idx = -1, dmax = tolPx;
      for (let i = a + 1; i < b; i++) {
        const A = pts[a], B = pts[b], P = pts[i], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
        // a closed freehand loop ends where it started: then measure from the start point, not from a line
        const d = len < 1 ? Math.hypot(P.x - A.x, P.y - A.y) : Math.abs(dy * P.x - dx * P.y + B.x * A.y - B.y * A.x) / len;
        if (d > dmax) { dmax = d; idx = i; }
      }
      if (idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    return latlngs.filter((_, i) => keep[i]);
  }
  function areaPx(latlngs) {
    const p = latlngs.map((ll) => map.latLngToContainerPoint(ll));
    let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j].x + p[i].x) * (p[j].y - p[i].y);
    return Math.abs(a / 2);
  }
  function finishDraw() {
    let pts = draw.pts.slice();
    if (draw.mode === "free") pts = simplify(pts, 2);
    stopDraw();
    draw.suppressUntil = performance.now() + 450; // swallow the click that follows the last pointer-up
    if (pts.length < 3 || areaPx(pts) < 150) { drawHint(U().drawTooSmall); setTimeout(() => drawHint(""), 2200); return; }
    selectArea(pts);
  }
  const nearFirst = (pt) => draw.pts.length >= 3 && map.latLngToContainerPoint(draw.pts[0]).distanceTo(pt) < 14;
  function initDraw() {
    $("#tool-free").addEventListener("click", () => (draw.mode === "free" ? stopDraw() : startDraw("free")));
    $("#tool-poly").addEventListener("click", () => (draw.mode === "poly" ? stopDraw() : startDraw("poly")));
    $("#tool-clear").addEventListener("click", () => { stopDraw(); clearSelection(); });
    const el = map.getContainer();
    const llOf = (e) => map.mouseEventToLatLng(e);
    const ptOf = (e) => map.mouseEventToContainerPoint(e);
    el.addEventListener("pointerdown", (e) => {
      if (draw.mode !== "free" || (e.pointerType === "mouse" && e.button !== 0)) return;
      if (e.target.closest(".leaflet-control")) return;
      e.preventDefault(); e.stopPropagation();
      draw.down = true; draw.pointerId = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      draw.pts = [llOf(e)];
      updateShape(false);
    }, true);
    el.addEventListener("pointermove", (e) => {
      if (draw.mode === "free" && draw.down && e.pointerId === draw.pointerId) {
        const last = map.latLngToContainerPoint(draw.pts[draw.pts.length - 1]);
        if (last.distanceTo(ptOf(e)) > 3) { draw.pts.push(llOf(e)); updateShape(draw.pts.length > 2); }
      } else if (draw.mode === "poly" && draw.pts.length) {
        const ll = llOf(e), hover = nearFirst(ptOf(e));
        const tail = [draw.pts[draw.pts.length - 1], hover ? draw.pts[0] : ll];
        if (!draw.guide) draw.guide = L.polyline(tail, { color: css("--area"), weight: 2, dashArray: "4 6", pane: "sel", interactive: false }).addTo(map);
        else draw.guide.setLatLngs(tail);
        if (hover !== draw.hoverFirst) { draw.hoverFirst = hover; redrawVertices(hover); }
      }
    }, true);
    const endFree = (e) => {
      if (draw.mode !== "free" || !draw.down || e.pointerId !== draw.pointerId) return;
      draw.down = false;
      try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      finishDraw();
    };
    el.addEventListener("pointerup", endFree, true);
    el.addEventListener("pointercancel", endFree, true);
    map.on("click", (e) => {
      if (draw.mode !== "poly") return;
      if (nearFirst(e.containerPoint)) { finishDraw(); return; }
      const last = draw.pts[draw.pts.length - 1];
      if (last && map.latLngToContainerPoint(last).distanceTo(e.containerPoint) < 3) return; // second click of a double-click
      draw.pts.push(e.latlng);
      updateShape(draw.pts.length > 2); redrawVertices(false);
      drawHint(draw.pts.length < 3 ? U().hintPoly : U().hintPolyClose);
    });
    map.on("dblclick", () => { if (draw.mode === "poly" && draw.pts.length >= 3) finishDraw(); });
    document.addEventListener("keydown", (e) => {
      if (!draw.mode) return;
      if (e.key === "Escape") stopDraw();
      else if (e.key === "Enter" && draw.mode === "poly" && draw.pts.length >= 3) { e.preventDefault(); finishDraw(); }
      else if (e.key === "Backspace" && draw.mode === "poly" && draw.pts.length && document.activeElement === document.body) {
        e.preventDefault(); draw.pts.pop(); updateShape(draw.pts.length > 2); redrawVertices(false);
        if (draw.guide && !draw.pts.length) { map.removeLayer(draw.guide); draw.guide = null; }
      }
    });
  }

  /* ================= selection: a point (1 km circle) or a drawn area ================= */
  const PLACE_LAYERS = () => [...builtNames(), "prob_2025", "prob_2030", "prob_2035", "study", "forest_loss", "forest2000_frac", "loss_frac",
    "loss_cum_2005", "loss_cum_2010", "loss_cum_2015", "loss_cum_2020", "dem", "s1_2017", "s1_2024", ...SAR_PLACE()];
  function clearSelection() {
    state.sel = null;
    selLayer.clearLayers();
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
    $("#tool-clear").disabled = true;
    renderCard();
  }
  function cellsInRing(ringLatLng) {
    let a0 = 90, a1 = -90, o0 = 180, o1 = -180;
    ringLatLng.forEach(([la, lo]) => { a0 = Math.min(a0, la); a1 = Math.max(a1, la); o0 = Math.min(o0, lo); o1 = Math.max(o1, lo); });
    const ring = ringLatLng.map(([la, lo]) => [lo, la]);
    const [a, , c, , e, f] = land.transform3857;
    const [x0, y1] = latLngToMerc(a1, o0), [x1, y0] = latLngToMerc(a0, o1);
    const c0 = clamp(Math.floor((x0 - c) / a), 0, land.width - 1), c1 = clamp(Math.floor((x1 - c) / a), 0, land.width - 1);
    const r0 = clamp(Math.floor((y1 - f) / e), 0, land.height - 1), r1 = clamp(Math.floor((y0 - f) / e), 0, land.height - 1);
    const out = [];
    for (let r = r0; r <= r1; r++) for (let col = c0; col <= c1; col++) {
      const [la, lo] = mercToLatLng(c + (col + 0.5) * a, f + (r + 0.5) * e);
      if (pointInRing(ring, la, lo)) out.push(r * land.width + col);
    }
    return out;
  }
  function squaresInRing(ringLatLng) {
    const ring = ringLatLng.map(([la, lo]) => [lo, la]), out = [];
    for (let i = 0; i < gL.rows * gL.cols; i++) if (pointInRing(ring, geo.L.centre[i * 2], geo.L.centre[i * 2 + 1])) out.push(i);
    return out;
  }
  function circleRing(lat, lng, km, n = 64) {
    const out = [], dLat = km / 110.574, dLng = km / (111.32 * Math.cos(lat * Math.PI / 180));
    for (let k = 0; k < n; k++) { const t = (k / n) * 2 * Math.PI; out.push([lat + dLat * Math.sin(t), lng + dLng * Math.cos(t)]); }
    return out;
  }
  async function selectPoint(lat, lng, label, opts = {}) {
    if (!opts.keep) state.finding = null;
    const f = areaAt(lat, lng);
    const ring = circleRing(lat, lng, 1);
    selLayer.clearLayers();
    selOutline(ring, true);
    pinMarker = L.marker([lat, lng], { pane: "sel", icon: L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), keyboard: false }).addTo(selLayer);
    $("#tool-clear").disabled = false;
    const sq = cellAt(gL, lat, lng);
    state.sel = { kind: "point", lat, lng, ring, label: label || null, area: f ? f.properties.name : null, sq: sq >= 0 ? [sq] : [], ready: false };
    try { history.replaceState(null, "", `#${lat.toFixed(5)},${lng.toFixed(5)}`); } catch (e) { /* ignore */ } // shareable link to this place
    // fit the 1 km circle into the part of the screen the card leaves free (on phones the card sits at the bottom)
    if (opts.zoom) map.flyToBounds(L.latLngBounds(ring), { ...selPad(), maxZoom: opts.zoom, duration: 0.8 });
    await finishSelection(state.sel);
    if (!label && state.sel && state.sel.kind === "point" && state.sel.lat === lat) {
      const name = await reverseGeocode(lat, lng);
      if (state.sel && state.sel.lat === lat && name) { state.sel.label = name; renderCard(); }
    }
  }
  async function selectArea(pts) {
    state.finding = null;
    const ring = pts.map((p) => [p.lat, p.lng]);
    selLayer.clearLayers();
    selOutline(ring, false);
    $("#tool-clear").disabled = false;
    // a drawn area has no point link: drop the previous point's #lat,lng so a shared link does not open the wrong place
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
    const cLat = mean(ring.map((p) => p[0])), cLng = mean(ring.map((p) => p[1])), f = areaAt(cLat, cLng);
    state.sel = { kind: "area", lat: cLat, lng: cLng, ring, label: null, area: f ? f.properties.name : null, sq: squaresInRing(ring), ready: false };
    if (!state.sel.sq.length) { const s = cellAt(gL, cLat, cLng); if (s >= 0) state.sel.sq = [s]; }
    await finishSelection(state.sel);
  }
  async function finishSelection(sel) {
    renderCardLoading();
    try { await Promise.all(PLACE_LAYERS().map(loadGray)); } catch (e) { console.error(e); return; }
    if (state.sel !== sel) return;
    if (!rankPool.risk) prepareRiskPool();
    sel.cells = cellsInRing(sel.ring).filter((i) => L8.study[i]);
    sel.ready = true;
    renderCard();
  }

  /* ---- numbers for the selection ---- */
  const cellHa = () => (land.cell_m_ground ** 2) / 1e4;
  function builtShare(cells, year) { const a = L8[`built_${year}`], t = THR(); return cells.length ? (cells.filter((i) => a[i] >= t).length / cells.length) * 100 : NaN; }
  function builtSeriesAll(cells) { return EPOCHS().map((y) => builtShare(cells, y)); }
  // forest lost 2001..upTo: cumulative loss shares exported for 2005/2010/2015/2020/2024, linear in between
  const LOSS_CUM = [2000, 2005, 2010, 2015, 2020, 2024];
  const lossCum = (y) => (y === 2000 ? null : y === 2024 ? L8.loss_frac : L8[`loss_cum_${y}`]);
  function forestLost(cells, upTo) {
    const Y = clamp(upTo, 2000, 2024), k = Math.max(1, LOSS_CUM.findIndex((y) => y >= Y));
    const y0 = LOSS_CUM[k - 1], y1 = LOSS_CUM[k], t = (Y - y0) / (y1 - y0), A = lossCum(y0), B = lossCum(y1);
    let s = 0;
    cells.forEach((i) => { const a = A ? A[i] : 0; s += a + (B[i] - a) * t; });
    return (s / 255) * cellHa();
  }
  function forestAtRisk(cells, toYear) { // forest (2000) share of cells the model turns built between 2020 and toYear
    const thr = THR(), b20 = L8[`built_${LAST_OBS()}`], bt = L8[`built_${toYear}`];
    let ha = 0;
    cells.forEach((i) => { if (bt[i] >= thr && b20[i] < thr) ha += (L8.forest2000_frac[i] / 255) * cellHa() * (1 - L8.loss_frac[i] / 255); });
    return ha;
  }
  function riskOf(cells) {
    const thr = THR(), p = L8.prob_2030, b25 = L8.built_2025;
    const open = cells.filter((i) => b25[i] < thr);
    if (!open.length) return null;
    const chance = mean(open.map((i) => (p[i] / 255) ** 2));
    // Score on an absolute, logarithmic scale of the 5-year chance: 0.1 % -> 0, 30 % -> 100.
    // (A pure percentile would call a 0.5 % chance "very high", because most open land is near 0.)
    const score = Math.round(clamp((Math.log10(Math.max(chance, 1e-4)) + 3) / (Math.log10(0.3) + 3), 0, 1) * 100);
    const level = chance >= 0.15 ? 5 : chance >= 0.05 ? 4 : chance >= 0.02 ? 3 : chance >= 0.005 ? 2 : 1;
    return { chance, score, level, pct: percentile(rankPool.risk, chance), openShare: open.length / cells.length };
  }
  function priceSeries(unit, vid) { return (land.prices.data[unit] || {})[vid] || {}; }
  function unitFor(sel) { return sel.area === "Poznań" ? "Poznań (city)" : "Powiat poznański"; }
  function priceAt(sel, year) {
    const ps = priceSeries(unitFor(sel), "633677");
    const years = Object.keys(ps).map(Number).filter((y) => ps[y] != null).sort((a, b) => a - b);
    if (!years.length) return null;
    if (year <= years[years.length - 1] && year >= years[0]) return { v: ps[year], kind: "obs", year };
    if (year < years[0]) return { v: null, kind: "none", first: years[0] };
    const fit = years.filter((y) => y >= 2015), vals = fit.map((y) => ps[y]), sl = senSlope(vals, fit), ic = senIntercept(vals, fit, sl);
    return { v: ic + sl * year, kind: "trend", year, from: fit[0], to: fit[fit.length - 1] };
  }
  const heatSeries = (key, sq) => {
    const name = key === "night" ? "night_years" : key === "day" ? "day_years" : "ndvi_years";
    return HEAT_YEARS.map((_, k) => mean(sq.map((i) => gL.layers[name][i][k])));
  };

  /* ================= radar numbers for a selection (v2) ================= */
  const pw10 = (db) => 10 ** (db / 10);
  function sarStats(cells) {
    const ch = L8.sar_change, dr = L8.sar_dratio, we = L8.sar_wet, wa = L8.sar_water, eg = L8.sar_egms, rc = sar.s1.r_crit, wd = sar.s1.wall_db || 1.5;
    let nCh = 0, sCh = 0, up = 0, dn = 0, wl = 0, nW = 0, wetN = 0, nWa = 0, waN = 0;
    const egv = [];
    for (const i of cells) {
      if (ch[i]) { const d = changeOf(ch[i]); nCh++; sCh += d; if (d >= 3) { up++; if (dr[i] && changeOf(dr[i]) >= wd) wl++; } else if (d <= -3) dn++; }
      if (we[i]) { nW++; if (wetOf(we[i]) > rc) wetN++; }
      if (wa[i]) { nWa++; if (waterOf(wa[i]) >= 0.2) waN++; }
      if (eg[i]) egv.push(egmsOf(eg[i]));
    }
    egv.sort((a, b) => a - b);
    const ys = sar.alos.years, y0 = ys[0], y1 = ys[ys.length - 1], h0 = L8[`alos_hv_${y0}`], h1 = L8[`alos_hv_${y1}`];
    let p0 = 0, p1 = 0, nA = 0;
    for (const i of cells) if (h0[i] && h1[i]) { p0 += pw10(dbOf(h0[i])); p1 += pw10(dbOf(h1[i])); nA++; }
    let nN = 0, sN = 0, upN = 0;
    if (sar.nisar && L8.nisar_wetdry) for (const i of cells) { const v = L8.nisar_wetdry[i]; if (v) { const d = changeOf(v); nN++; sN += d; if (d >= 2) upN++; } }
    return {
      nisarWet: nN ? sN / nN : NaN, nisarWetUp: nN ? upN / nN : NaN, nisarOpen: nN,
      meanCh: nCh ? sCh / nCh : NaN, up: nCh ? up / nCh : NaN, dn: nCh ? dn / nCh : NaN, walls: nCh ? wl / nCh : NaN,
      wet: nW ? wetN / nW : NaN, water: nWa ? waN / nWa : NaN,
      egMed: egv.length ? egv[egv.length >> 1] : NaN, egMin: egv.length ? egv[0] : NaN, egN: egv.length,
      dHV: nA ? 10 * Math.log10(p1 / nA) - 10 * Math.log10(p0 / nA) : NaN, y0, y1,
    };
  }
  // VV and VH of every pass for the selection, from the 480 m sheet (power-averaged)
  function sarSeries(cells, which = "s1") {
    const S = which === "nisar" ? sar.nisar.series : sar.s1.series, sh = which === "nisar" ? L8.nisar_series : L8.sar_series;
    const W2 = 2 * S.bw, w = land.width, blocks = new Set();
    for (const i of cells) blocks.add(((Math.floor(i / w) / S.block) | 0) * S.bw + (((i % w) / S.block) | 0));
    const vv = [], vh = [];
    for (let k = 0; k < S.n; k++) {
      let a = 0, b = 0, na = 0, nb = 0;
      for (const bi of blocks) {
        const row = (k * S.bh + ((bi / S.bw) | 0)) * W2, c = bi % S.bw, x = sh[row + c], y = sh[row + S.bw + c];
        if (x) { a += pw10(dbOf(x)); na++; }
        if (y) { b += pw10(dbOf(y)); nb++; }
      }
      vv.push(na ? 10 * Math.log10(a / na) : NaN); vh.push(nb ? 10 * Math.log10(b / nb) : NaN);
    }
    return { vv, vh };
  }
  const dayNum = (d) => Date.parse(`${d}T12:00:00Z`) / 864e5;
  function radarChart(ser, nser) {
    const u = U(), W = 340, H = 92, top = 4, lineH = 58, barTop = 66, barH = 16;
    const dates = sar.s1.dates, t0 = dayNum(dates[0]) - 2, t1 = dayNum(dates[dates.length - 1]) + 2;
    const GX = 34; // left gutter for the dB labels
    const x = (d) => GX + ((dayNum(d) - t0) / (t1 - t0)) * (W - GX);
    const nd = nser ? sar.nisar.dates : [];
    const ok = ser.vv.concat(ser.vh, nser ? nser.vv.concat(nser.vh) : []).filter(isFinite);
    if (!ok.length) return "";
    const lo = Math.min(...ok) - 0.5, hi = Math.max(...ok) + 0.5, y = (v) => top + (1 - (v - lo) / (hi - lo)) * lineH;
    const path = (vals, ds = dates) => vals.map((v, k) => (isFinite(v) ? `${k && isFinite(vals[k - 1]) ? "L" : "M"}${x(ds[k]).toFixed(1)},${y(v).toFixed(1)}` : "")).join("");
    const wet = sar.s1.soil_wetness || [], bw = Math.max(3, (W / dates.length) * 0.5);
    const bars = wet.map((w, k) => (w == null ? "" : `<rect x="${(x(dates[k]) - bw / 2).toFixed(1)}" y="${(barTop + barH * (1 - w)).toFixed(1)}" width="${bw.toFixed(1)}" height="${(barH * w).toFixed(1)}" rx="1" fill="var(--c-wet)"/>`)).join("");
    const nis = NISAR_DATES.filter((d) => dayNum(d) >= t0 && dayNum(d) <= t1).map((d) => `<line x1="${x(d).toFixed(1)}" x2="${x(d).toFixed(1)}" y1="${barTop + barH + 2}" y2="${barTop + barH + 7}" stroke="${css("--c-nisar")}" stroke-width="1.6"/>`).join("");
    const months = [];
    for (let m = 6; m <= 11; m++) { const d = `2026-${String(m).padStart(2, "0")}-01`; if (dayNum(d) >= t0) months.push(`<text x="${x(d).toFixed(1)}" y="${H + 10}" font-size="10" fill="${css("--ink-3")}">${u.rb.months[m - 1]}</text>`); }
    const dots = (vals, col, ds = dates, rr = 2.2) => vals.map((v, k) => (isFinite(v) ? `<circle cx="${x(ds[k]).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${rr}" fill="${col}"/>` : "")).join("");
    const nc = css("--c-nisar");
    const nis2 = nser ? `<path d="${path(nser.vv, nd)}" fill="none" stroke="${nc}" stroke-width="1.8"/>${dots(nser.vv, nc, nd, 2.6)}
      <path d="${path(nser.vh, nd)}" fill="none" stroke="${nc}" stroke-width="1.6" stroke-dasharray="4 3"/>${dots(nser.vh, nc, nd, 2.6)}` : "";
    return `<div class="rb-chart"><svg viewBox="0 0 ${W} ${H + 12}" aria-hidden="true">
      <text x="0" y="${top + 8}" font-size="10" fill="${css("--ink-3")}">${num(hi, 0)} dB</text><text x="0" y="${top + lineH}" font-size="10" fill="${css("--ink-3")}">${num(lo, 0)} dB</text>
      <line x1="${GX - 4}" x2="${W}" y1="${top + lineH + 2}" y2="${top + lineH + 2}" stroke="${css("--line")}" stroke-width="1"/>
      <path d="${path(ser.vv)}" fill="none" stroke="${css("--ink")}" stroke-width="1.8"/>${dots(ser.vv, css("--ink"))}
      <path d="${path(ser.vh)}" fill="none" stroke="${css("--c-green")}" stroke-width="1.8"/>${dots(ser.vh, css("--c-green"))}
      ${nis2}${bars}${nis}${months.join("")}</svg>
      <div class="lg"><span><i style="background:${css("--ink")}"></i>VV</span><span><i style="background:${css("--c-green")}"></i>VH</span>
        ${nser ? `<span><i style="background:${nc}"></i>HH</span><span><i style="background:repeating-linear-gradient(90deg,${nc} 0 4px,transparent 4px 7px)"></i>HV (NISAR)</span>` : ""}
        <span><i class="bar" style="background:var(--c-wet)"></i>${u.rb.lgWet}</span><span><i style="background:${nc};width:2px;height:9px"></i>${u.rb.lgNisar}</span></div></div>`;
  }
  function radarBlock(sel) {
    const u = U(), rb = u.rb, s = sarStats(sel.cells), ser = sarSeries(sel.cells), d = sar.s1.dates;
    const nser = sar.nisar && L8.nisar_series ? sarSeries(sel.cells, "nisar") : null;
    const pct = (v) => (isFinite(v) ? `${num(v * 100, 0)}%` : "—");
    const fmtD = (x) => { const [, m, dd] = x.split("-"); return `${+dd}.${m}`; };
    const row = (dot, k, v, note) => `<div class="rb-row"><span class="k"><span class="dot" style="background:${dot}"></span>${k}</span><span class="v">${v}</span><span class="note">${note}</span></div>`;
    const nd = NISAR_DATES;
    return `<div class="radar-block">
      <div class="rb-head"><div><div class="rb-title">${rb.title}</div><div class="rb-src">${rb.src(d.length, fmtD(d[0]), fmtD(d[d.length - 1]))}${sar.nisar ? `; ${rb.srcN(sar.nisar.dates.length)}` : ""}</div></div>
        <button type="button" class="linkish" data-radar-how>${rb.how}</button></div>
      ${radarChart(ser, nser)}
      <div class="rows">
        ${row(RAMPS.up[1], rb.change, pct(s.walls), rb.changeV(pct(s.up), pct(s.dn)))}
        ${sar.nisar ? row(css("--c-nisar"), rb.nisarWet, s.nisarOpen ? `${sgn(s.nisarWet, 1)} dB` : "—", s.nisarOpen ? rb.nisarWetV(pct(s.nisarWetUp)) : rb.nisarNoOpen) : ""}
        ${row(RAMPS.wet[2], rb.wet, pct(s.wet), rb.wetV)}
        ${row(RAMPS.water[2], rb.water, pct(s.water), rb.waterV)}
        ${row(RAMPS.sink[2], rb.egms, s.egN ? `${sgn(s.egMed, 0)} mm/${u.yr}` : "—", s.egN ? rb.egmsV(s.egN) : rb.egmsNone)}
        ${row(css("--c-green"), rb.lband, isFinite(s.dHV) ? `${sgn(s.dHV, 1)} dB` : "—", rb.lbandV(s.y0, s.y1))}
      </div>
      ${sar.nisar ? `<p class="rb-nisar">${rb.nisarUsed(sar.nisar.dates.length, sar.nisar.track, fmtD(sar.nisar.dates[0]), fmtD(sar.nisar.dates[sar.nisar.dates.length - 1]), nd.length)}</p>`
        : nd.length ? `<p class="rb-nisar">${rb.nisar(nd.length, fmtD(nd[0]), fmtD(nd[nd.length - 1]))}</p>` : ""}
    </div>`;
  }

  /* ================= side card ================= */
  function renderCardLoading() {
    $("#sidecard").classList.remove("min");
    $("#sidecard").innerHTML = `<h2>${esc(state.sel.label || (state.sel.kind === "area" ? U().selectedArea : U().selectedPlace))}</h2><p class="sub">${U().loading}</p>`;
  }
  function renderCard() {
    const card = $("#sidecard");
    if (!state.sel) { renderFindings(); return; }
    const sel = state.sel, u = U(), t = T(), tp = t.place;
    if (!sel.ready) { renderCardLoading(); return; }
    card.classList.remove("min");
    const title = sel.kind === "area" ? u.selectedArea : esc(sel.label || u.selectedPlace);
    if (!sel.area || !sel.cells.length) {
      card.innerHTML = `<h2>${title}</h2><p class="sub">${tp.outside}</p><button type="button" class="linkish" id="clear-sel">${u.clear}</button>`;
      $("#clear-sel").addEventListener("click", clearSelection);
      return;
    }
    const km2 = (sel.cells.length * cellHa()) / 100;
    const fut = isFuture(), Y = state.year, end = horizonEnd();
    const sub = sel.kind === "area" ? `${num(km2, 1)} km²` : u.radius1km;
    const range = fut ? u.forecastFor(Y) : `${land.epochs[0]}–${Y}`;
    // building
    const series = builtSeriesAll(sel.cells), ep = EPOCHS();
    // any year: blend the two surrounding 5-year epochs (the timeline moves year by year)
    const share = (y) => { const { e0, e1, t } = epochPair(y), a = series[ep.indexOf(e0)], b = series[ep.indexOf(e1)]; return a + (b - a) * t; };
    const base = 1990;
    // change in percentage points: a relative change explodes from small bases (one built cell -> "+5000%")
    let builtV, builtNote;
    if (fut) { const a = share(LAST_OBS()), b = share(Y); builtV = `${sgn(b - a, 0)} ${u.pp}`; builtNote = u.untilYear(Y); }
    else if (Y > base) { const a = share(base), b = share(Y); builtV = `${sgn(b - a, 0)} ${u.pp}`; builtNote = u.sinceYear(base, num(b, 0)); }
    else { builtV = `${num(share(Y), 0)}%`; builtNote = u.shareOfLand; }
    // forest
    let forestV, forestNote;
    if (fut) {
      const last = LAST_OBS(), y0 = last + Math.floor((Y - last) / 5) * 5, y1 = Math.min(end, y0 + 5);
      const f0 = forestAtRisk(sel.cells, y0), f1 = y1 > y0 ? forestAtRisk(sel.cells, y1) : f0;
      const ha = f0 + (f1 - f0) * (y1 > y0 ? (Y - y0) / 5 : 0);
      forestV = ha >= 0.5 ? `−${num(ha, ha < 10 ? 1 : 0)} ha` : "0 ha"; forestNote = u.forestAtRisk;
    }
    else if (Y < 2001) { forestV = "—"; forestNote = u.forestFrom2001; }
    else { const ha = forestLost(sel.cells, Y); forestV = ha >= 0.05 ? `−${num(ha, ha < 10 ? 1 : 0)} ha` : "0 ha"; forestNote = `2001–${Math.min(Y, 2024)}`; }
    // price
    const pr = priceAt(sel, Y);
    let priceV, priceNote;
    if (!pr || pr.kind === "none") { priceV = "—"; priceNote = u.priceFrom(pr ? pr.first : 2010); }
    else if (pr.kind === "trend") { priceV = `${u.approx} ${fmtInt(Math.round(pr.v / 100) * 100)} zł`; priceNote = u.priceTrend(pr.from, pr.to); }
    else { priceV = `${fmtInt(pr.v)} zł`; priceNote = `${pr.year}, ${sel.area === "Poznań" ? u.cityUnit : u.countyUnit}`; }
    // chip in forecast mode
    const chip = fut ? `<span class="chip">${u.chip(num(land.model.top_n_hit_rate * 100, 0))}</span>` : "";
    // chart
    const chart = miniChart(series, ep, Y);
    // wage ratio footnote
    const wage = priceSeries(unitFor(sel), "64428"), pz = priceSeries(unitFor(sel), "633677");
    const wy = [2024, 2023].find((y) => wage[y] && pz[y]);
    const foot = fut ? u.forecastNote : (wy ? u.wageNote(num(pz[wy] / wage[wy], 1), wy) : "");
    // risk
    const rk = riskOf(sel.cells);
    const risk = rk ? riskHTML(rk, sel) : `<div class="risk"><div class="risk-head"><span class="rl">${u.riskTitle}</span></div><p>${u.riskBuilt}</p></div>`;
    // technical inspection checklist
    const check = inspectionHTML(sel, rk);
    // more data
    const more = moreHTML(sel);
    const moreOpen = !!(card.querySelector("details.more") || {}).open; // keep "More data" open while the year changes
    card.innerHTML = `<div class="collapse-head"><h2>${title}</h2></div>
      <p class="sub">${sub} · ${range}${sel.area ? ` · ${esc(sel.area)}` : ""}</p>
      ${sar && L8.sar_series ? radarBlock(sel) : ""}
      ${sar ? `<div class="hist-h">${u.histHead}</div>` : ""}${chip}
      <div class="rows">
        <div class="row"><span class="k"><span class="dot" style="background:${css("--c-built")}"></span>${u.rowBuilt}</span><span class="v">${builtV}<small>${builtNote}</small></span></div>
        <div class="row"><span class="k"><span class="dot" style="background:${css("--c-forest")}"></span>${u.rowForest}</span><span class="v">${forestV}<small>${forestNote}</small></span></div>
        <div class="row"><span class="k"><span class="dot" style="background:${css("--c-price")}"></span>${u.rowPrice}</span><span class="v">${priceV}<small>${priceNote}</small></span></div>
      </div>
      <div class="minichart"><div class="mh"><span>${u.builtShare}</span><span>${land.epochs[0]}–${end}</span></div>${chart}</div>
      ${foot ? `<p class="foot">${foot}</p>` : ""}
      ${risk}
      ${check}
      ${more}
      <button type="button" class="btn-primary" id="open-test">${tp.fullTest}</button>
      <p class="foot"><button type="button" class="linkish" id="clear-sel">${u.clear}</button></p>`;
    if (moreOpen && card.querySelector("details.more")) card.querySelector("details.more").open = true;
    // open the dialog first, so the chart measures its real width (on phones it would otherwise draw at 680 px)
    $("#open-test").addEventListener("click", () => { $("#test-sheet").showModal(); renderTest(); });
    $("#clear-sel").addEventListener("click", clearSelection);
  }
  function riskHTML(rk, sel) {
    const u = U(), s = rk.score;
    const word = [null, u.risk1, u.risk2, u.risk3, u.risk4, u.risk5][rk.level];
    return `<div class="risk"><div class="risk-head"><span class="rl">${u.riskTitle}</span><span class="risk-word">${word}</span></div>
      <div class="risk-head" style="margin-top:6px"><span class="risk-score">${s}<small> / 100</small></span></div>
      <div class="risk-bar"><i style="left:${s}%"></i></div>
      <p>${u.riskText(num(rk.chance * 100, rk.chance < 0.01 ? 2 : 1), rk.pct, sel.kind === "area" ? num(rk.openShare * 100, 0) : null)}</p>
      <p style="margin-top:4px">${u.riskScale}</p></div>`;
  }
  /* ---- "technical inspection" of the land, like a car check before buying ---- */
  function localRelief(cells) { // metres above (+) or below (−) the mean terrain within ~500 m
    const w = land.width, h = land.height, r = Math.round(500 / land.cell_m_ground), d = L8.dem;
    const stride = Math.max(1, Math.ceil(cells.length / 4000)); // sample across the whole area, not its northern strip
    const vals = cells.filter((_, k) => k % stride === 0).map((i) => {
      const row = Math.floor(i / w), col = i % w;
      let s = 0, n = 0;
      for (let dr = -r; dr <= r; dr += 2) for (let dc = -r; dc <= r; dc += 2) {
        const rr = row + dr, cc = col + dc;
        if (rr < 0 || cc < 0 || rr >= h || cc >= w || dr * dr + dc * dc > r * r) continue;
        s += d[rr * w + cc]; n++;
      }
      return (d[i] - s / n) / 2;
    });
    return { mean: mean(vals), lowShare: vals.filter((v) => v <= -1.5).length / vals.length };
  }
  function inspectionHTML(sel, rk) {
    const u = U(), c = u.chk, items = [];
    const st = (lvl) => ({ ok: ["#4E9F3D", c.ok], warn: ["#F2A31B", c.warn], risk: ["#E5602A", c.risk], info: [css("--ink-3"), c.info] }[lvl]);
    // 1. building around
    const s05 = builtShare(sel.cells, 2005), s20 = builtShare(sel.cells, 2020), s30 = builtShare(sel.cells, 2030);
    const grow = s05 > 0 ? (s20 / s05 - 1) * 100 : NaN;
    items.push({ lvl: grow > 50 ? "warn" : "ok", t: c.built, v: isFinite(grow) ? c.builtV(num(s05, 0), num(s20, 0), num(s30, 0)) : c.builtNew(num(s20, 0), num(s30, 0)) });
    // 2. chance that the open land nearby gets built (the risk score above)
    if (rk) items.push({ lvl: rk.level >= 4 ? "risk" : rk.level >= 2 ? "warn" : "ok", word: [null, u.risk1, u.risk2, u.risk3, u.risk4, u.risk5][rk.level], t: c.next, v: c.nextV(num(rk.chance * 100, rk.chance < 0.01 ? 2 : 1)) });
    // 3. trees cut
    const lost = forestLost(sel.cells, 2024), perKm2 = lost / ((sel.cells.length * cellHa()) / 100);
    items.push({ lvl: perKm2 > 2 ? "warn" : "ok", t: c.trees, v: c.treesV(num(lost, lost < 10 ? 1 : 0)) });
    // 4. summer heat by day (MODIS)
    if (sel.sq.length) {
      const r = testSeries(heatSeries("day", sel.sq), HEAT_YEARS), pc = percentile(rankPool.day, r.perDec);
      items.push({ lvl: r.p < 0.05 && pc >= 60 ? "warn" : "ok", t: c.heat, v: r.p < 0.05 ? c.heatV(sgn(r.perDec, 2), pc) : c.heatNs });
    }
    // 5. terrain: hollows where water can gather (Copernicus DEM); the official flood map is linked
    // a point is judged by its own cell; an area by the share of its cells lying in hollows
    const own = sel.kind === "point" ? landCell(sel.lat, sel.lng) : null;
    const rel = own ? localRelief([own.i]) : localRelief(sel.cells);
    if (!own) rel.mean = rel.lowShare > 0.3 ? -2 : 0; // for areas the share decides; mean over an area is ~0 by construction
    // official PIG-PIB groundwater-flood areas: the point itself, or the share of the area's cells inside them
    const floodShare = own ? (inFlood(sel.lat, sel.lng) ? 1 : 0)
      : (() => { const sample = sel.cells.filter((_, k) => k % Math.max(1, Math.floor(sel.cells.length / 1500)) === 0);
        const w = land.width, [a, , c, , e, f] = land.transform3857;
        const hit = sample.filter((i) => { const [la, lo] = mercToLatLng(c + ((i % w) + 0.5) * a, f + (Math.floor(i / w) + 0.5) * e); return inFlood(la, lo); }).length;
        return sample.length ? hit / sample.length : 0; })();
    items.push({ lvl: floodShare > (own ? 0 : 0.05) ? "risk" : "ok", t: c.flood, link: false,
      v: own ? (floodShare ? c.floodIn : c.floodOut) : (floodShare > 0.005 ? c.floodArea(num(floodShare * 100, 0)) : c.floodOut) });
    const hollow = own ? rel.mean <= -1.5 : rel.lowShare > 0.3;
    items.push({ lvl: hollow ? "warn" : "ok", t: c.water, link: true,
      v: own ? (hollow ? c.waterLow(num(Math.abs(rel.mean), 1)) : c.waterOk(sgn(rel.mean, 1))) : (hollow ? c.waterAreaLow(num(rel.lowShare * 100, 0)) : c.waterAreaOk(num(rel.lowShare * 100, 0))) });
    // 6. radar: is something being built right now?
    if (sar && L8.sar_change) {
      // v2: this season's passes (June-November 2026), plus wet ground and ground motion (InSAR)
      const s = sarStats(sel.cells);
      items.push(s.walls > 0.02 ? { lvl: "warn", t: c.radar26, v: c.radar26Busy(num(s.walls * 100, 0)) }
        : s.up > 0.05 ? { lvl: "info", t: c.radar26, v: c.radar26Soft(num(s.up * 100, 0)) } : { lvl: "ok", t: c.radar26, v: c.radar26Quiet });
      items.push({ lvl: s.wet > 0.3 ? "warn" : "ok", t: c.wetT, v: s.wet > 0.3 ? c.wetHigh(num(s.wet * 100, 0)) : c.wetLow(num((s.wet || 0) * 100, 0)) });
      items.push(!s.egN ? { lvl: "info", t: c.egmsT, v: c.egmsNone }
        : { lvl: s.egMed <= -3 ? "risk" : s.egMin <= -5 ? "warn" : "ok", t: c.egmsT, v: s.egMed <= -3 ? c.egmsSink(sgn(s.egMed, 0)) : c.egmsV(sgn(s.egMed, 0), s.egN, s.egMin <= -5 ? sgn(s.egMin, 0) : null) });
    } else {
      const rc = sel.cells.filter((i) => L8.s1_2017[i] && L8.s1_2024[i]).map((i) => (L8.s1_2024[i] - L8.s1_2017[i]) / 6);
      const busy = rc.length ? rc.filter((d) => d >= 3).length / rc.length : 0;
      items.push({ lvl: busy > 0.05 ? "warn" : "ok", t: c.radar, v: busy > 0.05 ? c.radarBusy(num(busy * 100, 0)) : c.radarQuiet });
    }
    return `<div class="check"><div class="check-h">${c.title}</div>${items.map((it) => {
      const [col, w0] = st(it.lvl), word = it.word || w0;
      return `<div class="ck"><span class="ck-dot" style="background:${col}"></span><div><div class="ck-t">${it.t} <span class="ck-s" style="color:${col}">${word}</span></div>
        <div class="ck-v">${it.v}${it.link ? ` <a href="https://wody.isok.gov.pl/imap_kzgw/?gpmap=gpMZP" target="_blank" rel="noopener">${c.isok}</a>` : ""}</div></div></div>`;
    }).join("")}<p class="ck-note">${c.note}</p></div>`;
  }

  function miniChart(series, years, cur) {
    const W = 340, H = 64, ok = series.filter((v) => isFinite(v));
    const lo = Math.min(...ok), hi = Math.max(...ok), pad = (hi - lo) * 0.15 || 1;
    const x = (y) => ((y - years[0]) / (years[years.length - 1] - years[0])) * W, y = (v) => H - ((v - lo + pad) / (hi - lo + 2 * pad)) * H;
    const obsN = land.epochs.length, end = horizonEnd();
    let d1 = "", d2 = "";
    years.forEach((yr, k) => { if (!isFinite(series[k]) || yr > end) return; if (k < obsN) d1 += `${d1 ? "L" : "M"}${x(yr).toFixed(1)},${y(series[k]).toFixed(1)}`; });
    d2 = `M${x(years[obsN - 1]).toFixed(1)},${y(series[obsN - 1]).toFixed(1)}`;
    years.forEach((yr, k) => { if (k >= obsN && yr <= end) d2 += `L${x(yr).toFixed(1)},${y(series[k]).toFixed(1)}`; });
    const { e0, e1, t } = epochPair(cur), k0 = years.indexOf(e0), k1 = years.indexOf(e1);
    const cv = k0 >= 0 && k1 >= 0 ? series[k0] + (series[k1] - series[k0]) * t : NaN, cy = isFinite(cv) ? y(cv) : null, pred = css("--pred");
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <line x1="${x(land.epochs[obsN - 1])}" x2="${x(land.epochs[obsN - 1])}" y1="0" y2="${H}" stroke="${css("--line")}" stroke-width="1"/>
      <path d="${d1}" fill="none" stroke="${css("--ink")}" stroke-width="2"/>
      <path d="${d2}" fill="none" stroke="${pred}" stroke-width="2" stroke-dasharray="4 4"/>
      ${cy != null ? `<circle cx="${x(cur)}" cy="${cy}" r="4.5" fill="${css("--card")}" stroke="${cur > LAST_OBS() ? pred : css("--ink")}" stroke-width="2"/>` : ""}
    </svg>`;
  }
  function sparkline(vals, years, colour, r) {
    const W = 108, H = 36, ok = vals.filter((v) => v != null && isFinite(v));
    if (!ok.length) return "";
    const lo = Math.min(...ok), hi = Math.max(...ok), pad = (hi - lo) * 0.12 || 0.5;
    const y0 = years[0], y1 = years[years.length - 1];
    const x = (yr) => ((yr - y0) / (y1 - y0)) * W, y = (v) => H - ((v - lo + pad) / (hi - lo + 2 * pad)) * H;
    let d = "", pen = false;
    vals.forEach((v, k) => { if (v == null || !isFinite(v)) { pen = false; return; } d += `${pen ? "L" : "M"}${x(years[k]).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
    const tl = r && isFinite(r.slope) ? `<line x1="0" x2="${W}" y1="${y(r.icpt + r.slope * y0)}" y2="${y(r.icpt + r.slope * y1)}" stroke="${colour}" stroke-width="2" stroke-dasharray="4 3"/>` : "";
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}" fill="none" stroke="${css("--ink-3")}" stroke-width="1.5"/>${tl}</svg>`;
  }
  function moreHTML(sel) {
    const u = U(), t = T(), tp = t.place;
    let heat = "";
    if (sel.sq.length) {
      heat = `<div class="mh3">${u.heatH(sel.sq.length)}</div>` + [
        { k: "night", lbl: tp.night, unit: "°C", d: 2, colour: RAMPS.warm[2] },
        { k: "day", lbl: tp.day, unit: "°C", d: 2, colour: RAMPS.warm[2] },
        { k: "ndvi", lbl: tp.ndvi, unit: "NDVI", d: 3, colour: RAMPS.green[2] },
      ].map((m) => {
        const vals = heatSeries(m.k, sel.sq), r = testSeries(vals, HEAT_YEARS);
        if (!isFinite(r.p)) return "";
        const sig = r.p < 0.05, pc = percentile(rankPool[m.k], r.perDec);
        const rank = m.k === "ndvi" ? (r.perDec >= 0 ? tp.greener(pc) : tp.browner(100 - pc)) : (pc >= 50 ? tp.faster(pc) : tp.slower(100 - pc));
        return `<div class="mrow"><div><div class="lbl">${m.lbl}</div><div class="val">${sgn(r.perDec, m.d)} <small>${m.unit}/${u.dec}</small></div>
          <div class="sig">${sig ? tp.sig : tp.notProven}, ${fmtP(r.p)} · ${rank}</div></div>${sparkline(vals, HEAT_YEARS, m.colour, r)}</div>`;
      }).join("");
    }
    const elev = mean(sel.cells.map((i) => L8.dem[i] / 2 + land.dem_offset));
    const rc = mean(sel.cells.filter((i) => L8.s1_2017[i] && L8.s1_2024[i]).map((i) => (L8.s1_2024[i] - L8.s1_2017[i]) / 6));
    const a = sel.area ? areaStats(sel.area) : null;
    const muni = a ? `<div class="mh3">${tp.muni}: ${esc(sel.area)}</div><dl class="kv">
      <dt>${tp.pop} 2000 → 2024</dt><dd>${fmtInt(a.population["2000"])} → ${fmtInt(a.population["2024"])} (${sgn(a.pop_change_pct_2000_2024, 0)}%)</dd>
      <dt>${tp.built}</dt><dd>${fmtInt(a.dwellings_2000_2024)}</dd></dl>` : "";
    return `<details class="more"><summary>${u.moreData}</summary>
      ${heat}
      <div class="mh3">${u.terrainH}</div><dl class="kv">
        <dt>${u.elevMean}</dt><dd>${num(elev, 0)} m ${u.asl}</dd>
        ${isFinite(rc) ? `<dt>${u.radarChange}</dt><dd>${sgn(rc, 1)} dB</dd>` : ""}</dl>
      ${muni}</details>`;
  }

  /* ================= findings ================= */
  function findingData() {
    const s = study, ms = s.ground.modis_vs_station, px = s.pixel_summary, cor = s.growth_correlation, c = areaStats("Poznań");
    const big = s.areas.filter((a) => a.role !== "city" && a.pop_change_pct_2000_2024 > 200).sort((a, b) => b.pop_change_pct_2000_2024 - a.pop_change_pct_2000_2024);
    const P = priceSeries("Poznań (city)", "633677"), Wg = priceSeries("Poznań (city)", "64428");
    const muni = Object.entries(land.municipalities).sort((a, b) => b[1].forest_loss_total_ha - a[1].forest_loss_total_ha);
    const totLoss = muni.reduce((x, [, m]) => x + m.forest_loss_total_ha, 0), lt = land.forest_loss_trend;
    const trendTxt = lt.p < 0.05 ? (lang === "pl" ? ` Tempo ${lt.slope_ha_per_decade > 0 ? "rośnie" : "spada"} istotnie (${fmtP(lt.p)}).` : ` The pace is ${lt.slope_ha_per_decade > 0 ? "rising" : "falling"} significantly (${fmtP(lt.p)}).`) : "";
    const k = sar && sar.checks;
    const radarD = k ? {
      radar: { n: sar.s1.dates.length, ha: fmtInt(sar.s1.up3db_ha), wha: fmtInt(sar.s1.walls_ha || 0), ratio: k.wuia.ratio != null ? num(k.wuia.ratio, 1) : null, dec: num(k.wuia.share_decision * 100, 2), rest: num(k.wuia.share_rest * 100, 2),
        sig: k.wuia.p != null && k.wuia.p < 0.05 && k.wuia.ratio >= 1.3, p: k.wuia.p != null ? fmtP(k.wuia.p) : "" },
      wet: { share: num(k.wet.share_sig_study * 100, 0), flood: k.wet.share_sig_flood != null ? num(k.wet.share_sig_flood * 100, 0) : null, out: num(k.wet.share_sig_outside * 100, 0),
        fsig: k.wet.p_flood_higher != null && k.wet.p_flood_higher < 0.05 },
      ground: { med: sgn(k.egms.median, 0), n: fmtInt(k.egms.cells_le_minus5), min: sgn(k.egms.min, 0), share: num(k.egms.share_of_study * 100, 0) },
      lband: { y0: sar.alos.years[0], y1: sar.alos.years[sar.alos.years.length - 1], nisar: !!sar.nisar,
        n: sar.nisar ? sar.nisar.dates.length : 0, wd: sar.nisar && sar.nisar.checks.wetdry ? {
          share: num(sar.nisar.checks.wetdry.share_study * 100, 0), flood: sar.nisar.checks.wetdry.share_flood != null ? num(sar.nisar.checks.wetdry.share_flood * 100, 0) : null,
          out: num(sar.nisar.checks.wetdry.share_outside * 100, 0), ratio: sar.nisar.checks.wetdry.ratio != null ? num(sar.nisar.checks.wetdry.ratio, 1) : null,
          sig: sar.nisar.checks.wetdry.p != null && sar.nisar.checks.wetdry.p < 0.05 && sar.nisar.checks.wetdry.ratio >= 1.2,
          p: sar.nisar.checks.wetdry.p != null ? fmtP(sar.nisar.checks.wetdry.p) : "" } : null },
      modelRadar: { ratio: num(k.model.ratio, 1), top: num(k.model.share_top5 * 100, 2), rest: num(k.model.share_rest * 100, 2), raw: k.model.ratio,
        sig: k.model.p != null && k.model.p < 0.05 && k.model.ratio >= 1.3, p: k.model.p != null ? fmtP(k.model.p) : "",
        wRatio: k.model_walls ? num(k.model_walls.ratio, 1) : null, wSig: !!(k.model_walls && k.model_walls.p < 0.05 && k.model_walls.ratio >= 1.3) },
    } : {};
    return {
      ...radarD,
      sprawl: { b1990: num(land.study_built_share_pct["1990"], 1), b2020: num(land.study_built_share_pct["2020"], 1), pozLoss: num(Math.abs(c.pop_change_pct_2000_2024), 0), top: big.map((a) => a.name).join(", ") },
      forecast: { hit: num(land.model.top_n_hit_rate * 100, 0), ha: fmtInt(land.model.demand_ha_per_5y) },
      prices: { pUp: num((P["2024"] / P["2015"] - 1) * 100, 0), wUp: num((Wg["2024"] / Wg["2015"] - 1) * 100, 0), r15: num(Wg["2015"] / P["2015"], 2), r24: num(Wg["2024"] / P["2024"], 2) },
      forest: { ha: fmtInt(totLoss), top: muni.slice(0, 3).map(([n]) => n).join(", "), trend: trendTxt },
      nights: { share: num(px.night_sig_warming_share, 0), n: fmtInt(px.lst_pixels), city: sgn(c.trend.night_lst.slope_per_decade, 2) },
      days: { r: num(cor.day_lst.spearman_r, 2), p: fmtP(cor.day_lst.p) },
      station: { r: num(ms.night_vs_tmin.r, 2), n: ms.night_vs_tmin.n },
    };
  }
  const only = (...ks) => { Object.keys(state.lyr).forEach((k) => { state.lyr[k].on = ks.includes(k); }); };
  const fitAll = () => map.flyToBounds(borderLayer.getBounds(), { ...fitPad(), duration: 0.8 });
  const showOnly = async (...ks) => { only(...ks); await Promise.all(ks.map(ensure)); };
  const SAR_FINDINGS = {
    radar: async () => { await showOnly("sarchange"); clearSelection(); map.flyTo(OLD_MARKET, 12, { duration: 0.8 }); },
    wet: async () => { await showOnly("sarwet", "flood"); clearSelection(); fitAll(); },
    ground: async () => { await showOnly("egms"); clearSelection(); map.flyTo(OLD_MARKET, 12, { duration: 0.8 }); },
    lband: async () => { if (sar.nisar) { state.lyr.alos.y = 2026; await showOnly("alos", "nisarwet"); } else await showOnly("alos"); clearSelection(); fitAll(); renderDrawer(); },
    modelRadar: async () => { await showOnly("built", "sarchange"); state.horizon = 10; setYear(2030); clearSelection(); map.flyTo(OLD_MARKET, 11, { duration: 0.8 }); },
  };
  const V1_FINDINGS = {
    sprawl: async () => { only("built"); await ensure("built"); setYear(2020); clearSelection(); fitAll(); },
    forecast: async () => { only("built"); await ensure("built"); state.horizon = 10; setYear(2035); fitAll(); },
    prices: async () => { only("built", "price"); await ensure("built"); setYear(2020); selectPoint(OLD_MARKET[0], OLD_MARKET[1], lang === "pl" ? "Stary Rynek, Poznań" : "Old Market, Poznań", { keep: true, zoom: 12 }); },
    forest: async () => { only("forest"); await ensure("forest"); setYear(2020); clearSelection(); fitAll(); },
    nights: async () => { only("night"); setYear(2020); clearSelection(); fitAll(); },
    days: async () => { only("day"); setYear(2020); clearSelection(); fitAll(); },
    station: async () => { only("night"); setYear(2020); selectPoint(LAWICA[0], LAWICA[1], "Poznań-Ławica (IMGW)", { keep: true, zoom: 12 }); },
  };
  // v2: radar findings first, then the strongest history findings
  const FIND = () => {
    if (!sar) return V1_FINDINGS;
    const F = SAR_FINDINGS, hist = { sprawl: V1_FINDINGS.sprawl, forecast: V1_FINDINGS.forecast, forest: V1_FINDINGS.forest };
    // with NISAR pixels in, the NISAR finding leads (the challenge is about NISAR)
    return sar.nisar ? { lband: F.lband, radar: F.radar, modelRadar: F.modelRadar, wet: F.wet, ground: F.ground, ...hist } : { ...F, ...hist };
  };
  function renderFindings() {
    const t = T(), u = U(), d = findingData(), card = $("#sidecard");
    card.classList.toggle("min", !state.findingsOpen);
    card.innerHTML = `<div class="collapse-head"><h2>${t.caseTitle}</h2>
        <button type="button" class="linkish" id="fold">${state.findingsOpen ? u.hide : u.show}</button></div>
      <p class="sub">${u.caseIntro}</p>
      <ol class="findings">${Object.keys(FIND()).map((k, i) => { const x = t.f[k](d[k]); return `<li><button type="button" data-f="${k}" ${state.finding === k ? 'aria-current="true"' : ""}>
        <span class="n">${i + 1}</span><span class="t">${x.t}</span><span class="b">${x.b}</span></button></li>`; }).join("")}</ol>`;
    $("#fold").addEventListener("click", () => { state.findingsOpen = !state.findingsOpen; renderFindings(); });
    card.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", async () => {
      state.finding = b.dataset.f;
      await FIND()[state.finding]();
      renderDrawer(); redraw();
      if (!state.sel) renderFindings();
    }));
  }

  /* ================= full trend test ================= */
  const NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (parent) parent.appendChild(e); return e; }
  function niceTicks(lo, hi, n) {
    const span = hi - lo || 1, m = Math.pow(10, Math.floor(Math.log10(span / n)));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * m).find((s) => span / s <= n) || 10 * m;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function trendChart(host, vals, years, r, colour, d, unit) {
    host.innerHTML = "";
    const W = Math.max(300, host.clientWidth || 680), H = 260, m = { l: 52, r: 12, t: 10, b: 26 };
    const ok = vals.filter((v) => v != null && isFinite(v));
    let lo = Math.min(...ok), hi = Math.max(...ok); const pad = (hi - lo) * 0.15 || 1; lo -= pad; hi += pad;
    const y0 = years[0], y1 = years[years.length - 1];
    const x = (yr) => m.l + ((yr - y0) / (y1 - y0)) * (W - m.l - m.r), y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }); host.appendChild(svg);
    const gg = svgEl("g", { class: "grid" }, svg), ax = svgEl("g", { class: "axis" }, svg);
    niceTicks(lo, hi, 4).forEach((v) => {
      svgEl("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, gg);
      svgEl("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, ax).textContent = d === 0 ? fmtInt(v) : num(v, d > 2 ? 2 : d);
    });
    const step = y1 - y0 > 30 ? 10 : 5;
    years.filter((yr) => yr % step === 0 || yr === y1).forEach((yr) => { svgEl("text", { x: x(yr), y: H - 6, "text-anchor": "middle" }, ax).textContent = yr; });
    if (isFinite(r.slope)) svgEl("line", { x1: x(y0), x2: x(y1), y1: y(r.icpt + r.slope * y0), y2: y(r.icpt + r.slope * y1), stroke: colour, "stroke-width": 2, "stroke-dasharray": "6 4", fill: "none" }, svg);
    let dd = "", pen = false;
    vals.forEach((v, k) => { if (v == null || !isFinite(v)) { pen = false; return; } dd += `${pen ? "L" : "M"}${x(years[k])},${y(v)}`; pen = true; });
    svgEl("path", { d: dd, fill: "none", stroke: css("--ink-2"), "stroke-width": 1.5 }, svg);
    const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    vals.forEach((v, k) => {
      if (v == null || !isFinite(v)) return;
      const cc = svgEl("circle", { cx: x(years[k]), cy: y(v), r: 4, fill: css("--ink"), stroke: css("--card"), "stroke-width": 2 }, svg);
      const hit = svgEl("circle", { cx: x(years[k]), cy: y(v), r: 11, fill: "transparent" }, svg);
      hit.addEventListener("mouseenter", () => {
        tip.textContent = `${years[k]}: ${d === 0 ? fmtInt(v) : num(v, d)} ${unit}`; tip.hidden = false;
        const bb = svg.getBoundingClientRect();
        tip.style.left = `${Math.min((x(years[k]) / W) * bb.width + 8, bb.width - tip.offsetWidth)}px`;
        tip.style.top = `${(y(v) / H) * bb.height - 34}px`; cc.setAttribute("r", 6);
      });
      hit.addEventListener("mouseleave", () => { tip.hidden = true; cc.setAttribute("r", 4); });
    });
  }
  function renderTest() {
    const t = T(), tp = t.place, tt = t.test, u = U(), sel = state.sel;
    $("#test-title").textContent = tt.title(sel.kind === "area" ? u.selectedArea : (sel.label || sel.area));
    const vars = [["built", tt.builtVar, "%", 1, "#E0332F"]];
    if (sel.sq.length) vars.push(["night", tp.night, "°C", 2, RAMPS.warm[2]], ["day", tp.day, "°C", 2, RAMPS.warm[2]], ["ndvi", tp.ndvi, "NDVI", 3, RAMPS.green[2]]);
    vars.push(["price", u.rowPrice, "zł/m²", 0, css("--c-price")]);
    if (!vars.some((v) => v[0] === state.testVar)) state.testVar = "built";
    $("#vartabs").innerHTML = vars.map(([k, l]) => `<button type="button" role="tab" data-v="${k}" aria-selected="${state.testVar === k}">${l}</button>`).join("");
    $("#vartabs").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { state.testVar = b.dataset.v; renderTest(); }));
    const [, label, unit, d, colour] = vars.find((v) => v[0] === state.testVar);
    let years, vals;
    if (state.testVar === "built") { years = land.epochs; vals = builtSeriesAll(sel.cells).slice(0, land.epochs.length); }
    else if (state.testVar === "price") { const ps = priceSeries(unitFor(sel), "633677"); years = Object.keys(ps).map(Number).filter((y) => ps[y] != null).sort((a, b) => a - b); vals = years.map((y) => ps[y]); }
    else { years = HEAT_YEARS; vals = heatSeries(state.testVar, sel.sq); }
    const r = testSeries(vals, years);
    trendChart($("#test-chart"), vals, years, r, colour, d, unit);
    const uDec = `${unit} ${tt.perDecade}`, dd = d === 0 ? 0 : d;
    const fmtV = (v) => (dd === 0 ? fmtInt(Math.abs(v)) : num(Math.abs(v), dd));
    $("#test-verdict").textContent = !isFinite(r.p) ? tt.few
      : r.p < 0.05 ? (r.perDec > 0 ? tt.rising(label, fmtV(r.perDec), uDec) : tt.falling(label, fmtV(r.perDec), uDec))
        : tt.none(label, (r.perDec >= 0 ? "+" : "−") + fmtV(r.perDec), uDec);
    $("#test-stats").innerHTML =
      `<dt>${tt.slope}</dt><dd>${isFinite(r.perDec) ? `${r.perDec >= 0 ? "+" : "−"}${fmtV(r.perDec)} ${uDec}` : "–"}</dd>` +
      `<dt>${tt.n}</dt><dd>${r.n} / ${years.length}</dd>` +
      `<dt>${tt.S}</dt><dd>${r.s}</dd><dt>${tt.z}</dt><dd>${isFinite(r.z) ? num(r.z, 2) : "–"}</dd>` +
      `<dt>${tt.p}</dt><dd>${isFinite(r.p) ? fmtP(r.p).replace("p = ", "").replace("p < ", "< ") : "–"}</dd>`;
    $("#test-table").innerHTML = `<table><thead><tr><th>${tt.year}</th><th>${tt.value} (${unit})</th><th>${tt.trend}</th></tr></thead><tbody>` +
      years.map((yr, k) => `<tr><td>${yr}</td><td>${vals[k] == null || !isFinite(vals[k]) ? "–" : (dd === 0 ? fmtInt(vals[k]) : num(vals[k], dd))}</td><td>${isFinite(r.slope) ? (dd === 0 ? fmtInt(r.icpt + r.slope * yr) : num(r.icpt + r.slope * yr, dd)) : "–"}</td></tr>`).join("") +
      `</tbody></table>`;
  }

  /* ================= search ================= */
  let searchT = null, results = [], active = -1;
  const VIEWBOX = "16.42,52.71,17.45,52.12";
  async function geocode(q) {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=pl&viewbox=${VIEWBOX}&bounded=1&accept-language=${lang}&q=${encodeURIComponent(q)}`);
    return r.ok ? r.json() : [];
  }
  async function reverseGeocode(lat, lng) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=${lang}&lat=${lat}&lon=${lng}`);
      if (!r.ok) return null;
      const a = (await r.json()).address || {};
      const street = [a.road || a.pedestrian || a.hamlet || a.suburb, a.house_number].filter(Boolean).join(" ");
      return [street, a.city || a.town || a.village || a.municipality || ""].filter(Boolean).join(", ") || null;
    } catch (e) { return null; }
  }
  function shortName(r) {
    const a = r.address || {};
    const main = [a.road || r.name, a.house_number].filter(Boolean).join(" ") || r.name || r.display_name.split(",")[0];
    return { main, sub: [a.suburb, a.city || a.town || a.village || a.municipality || ""].filter(Boolean).join(", ") };
  }
  function renderSuggest() {
    const ul = $("#suggest");
    if (!results.length) { ul.hidden = true; return; }
    ul.innerHTML = results.map((r, k) => { const n = shortName(r); return `<li role="option" data-k="${k}" aria-selected="${k === active}">${esc(n.main)}<small>${esc(n.sub)}</small></li>`; }).join("");
    ul.hidden = false;
    ul.querySelectorAll("li").forEach((li) => li.addEventListener("mousedown", (e) => { e.preventDefault(); pickResult(+li.dataset.k); }));
  }
  function pickResult(k) {
    const r = results[k]; if (!r) return;
    const n = shortName(r), label = n.main + (n.sub ? `, ${n.sub}` : "");
    $("#q").value = label; results = []; renderSuggest();
    selectPoint(+r.lat, +r.lon, label, { zoom: 14 });
  }
  function initSearch() {
    const q = $("#q");
    q.addEventListener("input", () => {
      clearTimeout(searchT);
      const v = q.value.trim();
      if (v.length < 3) { results = []; renderSuggest(); return; }
      searchT = setTimeout(async () => { try { results = await geocode(v); } catch (e) { results = []; } active = -1; renderSuggest(); }, 450);
    });
    q.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { active = Math.min(results.length - 1, active + 1); renderSuggest(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { active = Math.max(0, active - 1); renderSuggest(); e.preventDefault(); }
      else if (e.key === "Enter") { if (results.length) pickResult(active < 0 ? 0 : active); e.preventDefault(); }
      else if (e.key === "Escape") { results = []; renderSuggest(); }
    });
    q.addEventListener("blur", () => setTimeout(() => { results = []; renderSuggest(); }, 150));
  }

  /* ================= i18n & wiring ================= */
  function applyLang() {
    document.documentElement.lang = lang;
    const t = T(), u = U();
    document.querySelectorAll("[data-i18n]").forEach((el) => { const v = u[el.dataset.i18n] ?? t[el.dataset.i18n]; if (typeof v === "string") el.textContent = v; });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = u[el.dataset.i18nPh] ?? t[el.dataset.i18nPh]; });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = u[el.dataset.i18nTitle]; el.setAttribute("aria-label", u[el.dataset.i18nTitle]); });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", u[el.dataset.i18nAria] ?? t[el.dataset.i18nAria] ?? ""); });
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    $("#about-body").innerHTML = t.aboutHtml + (sar && u.aboutSar ? u.aboutSar : "");
    $("#radar-btn").hidden = !sar;
    if (sar) $("#radar-body").innerHTML = u.radarHtml({ upHa: fmtInt(sar.s1.up3db_ha), wetShare: num(sar.checks.wet.share_sig_study * 100, 0),
      bands: sar.nisar ? sar.nisar.checks.bands : null, fmt: (v) => num(v, 1) });
    stopPlay();
    renderDrawer(); renderTimeline(); renderLegend(); renderCard();
    if ($("#test-sheet").open) renderTest();
  }
  function wire() {
    document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => {
      lang = b.dataset.lang;
      try { localStorage.setItem("ptd-lang", lang); } catch (e) { /* ignore */ }
      applyLang();
    }));
    $("#menu-btn").addEventListener("click", () => openDrawer($("#drawer").hidden));
    $("#theme-btn").addEventListener("click", () => setTheme(dark() ? "light" : "dark"));
    $("#drawer-close").addEventListener("click", () => openDrawer(false));
    $("#zoom-in").addEventListener("click", () => map.zoomIn());
    $("#zoom-out").addEventListener("click", () => map.zoomOut());
    $("#year").addEventListener("input", (e) => { stopPlay(); setYear(+e.target.value); });
    $("#year").addEventListener("change", (e) => setYear(+e.target.value, { now: true }));
    $("#play").addEventListener("click", togglePlay);
    $("#test-close").addEventListener("click", () => $("#test-sheet").close());
    $("#about-close").addEventListener("click", () => $("#about-sheet").close());
    $("#radar-btn").addEventListener("click", () => $("#radar-sheet").showModal());
    $("#radar-close").addEventListener("click", () => $("#radar-sheet").close());
    document.addEventListener("click", (e) => { if (e.target.closest("[data-radar-how]")) { e.preventDefault(); $("#radar-sheet").showModal(); } });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { redraw(); renderTimeline(); });
    window.addEventListener("resize", () => { map.invalidateSize(); renderTimeline(); });
  }

  async function main() {
    const get = (f) => fetch(`data/${f}?v=${DATA_V}`).then((r) => { if (!r.ok) throw new Error(f); return r.json(); });
    [study, gL, gN, areas, land, flood] = await Promise.all([get("study.json"), get("grid_lst.json"), get("grid_ndvi.json"), get("areas.geojson"), get("land/land.json"), get("podtopienia.geojson")]);
    NISAR_DATES = land.nisar_dates || [];
    state.lyr.nisar.i = Math.max(0, NISAR_DATES.length - 1);
    // radar products (v2); without them the app falls back to the v1 layout
    try { sar = await get("land/sar.json"); } catch (e) { sar = null; SAR_KEYS.forEach((k) => { state.lyr[k].on = false; }); state.lyr.built.on = true; }
    if (sar) state.lyr.alos.y = LBAND_YEARS()[LBAND_YEARS().length - 1];
    gL.layers.night_mean = gL.layers.night_years.map((ys) => { const m = mean(ys.slice(0, 25)); return isFinite(m) ? m : null; });
    geo.L = buildGeometry(gL); geo.N = buildGeometry(gN);
    prepareHeatRanks();
    await initMap();
    initDraw();
    initSearch();
    wire();
    applyLang();
    await Promise.all(Object.keys(NEEDS).filter((k) => state.lyr[k] && state.lyr[k].on).map(ensure));
    redraw();
    PLACE_LAYERS().forEach((n) => loadGray(n).catch(() => {}));
    // open a shared place link: #52.40812,16.93350
    const m = location.hash.match(/^#(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    if (m) selectPoint(+m[1], +m[2], null, { zoom: 14 });
  }
  main().catch((e) => {
    $("#sidecard").innerHTML = `<p>The data did not load (${esc(e.message)}). Serve the <code>web</code> folder over HTTP, for example: <code>python3 -m http.server</code>.</p>`;
    console.error(e);
  });
})();
