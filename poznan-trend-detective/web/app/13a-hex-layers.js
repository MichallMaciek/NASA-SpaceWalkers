// SARnik core, part 13a of 32: data layers, part 1a: hexagons for the rating and quantity layers.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= hexagons ================= */
  // The rating and quantity layers (plot score, built-up share with the radar years and the forecast, forest and felling,
  // water, ground motion, radar change) are drawn as hexagons, not as the 120 m grid stretched into a blurry picture.
  // A hexagon holds several 120 m cells (a cell belongs to the hexagon its centre falls in); its value is the mean of its
  // cells or the share of them past a threshold, counted only over cells of the study area that have data, and it is
  // painted in one of a few classes. Only the drawing uses this: the place card still counts every 120 m cell.
  // Geometry: pointy-top hexagons in the coordinates of the 120 m grid (EPSG:3857 metres / 120), rows offset by half a
  // hexagon. A hexagon is drawn when at least half of it lies in the study area; one whose cells have data in less than
  // half of it is not drawn (never as good or bad; the tooltip says "no data"). One cell alone never colours a hexagon (at least 2).
  const HEX_KEYS = ["built", "forest", "dist", "sarwater", "sarwet", "nisarwet", "sarchange", "egms", "score", "flood"]; // bottom to top
  const HEX_S3 = Math.sqrt(3);
  // flat-to-flat width in metres on the ground, one step per zoom level (about 1.4x), so a hexagon stays 13-125 px wide on
  // screen: from about 1650 cells of 120 m (73 m on the ground here) for the whole region to 5 at street level, never fewer
  const HEX_STEPS = [[9, 3200], [10, 2200], [11, 1400], [12, 850], [13, 500], [14, 350], [15, 250]];
  const hexSizeFor = (z) => { for (const [zz, m] of HEX_STEPS) if (z <= zz) return m; return 180; };
  const hexZoom = () => (map ? Math.round(map.getZoom()) : 11); // the zoom GridLayer draws its tiles at (11: the opening view)
  const HEX_MIN = 2; // cells: one cell alone (speckle, a stray point) never colours a hexagon
  const HEX_COVER = 0.5; // share of the hexagon with data below which it is not drawn

  const hexGrids = {};
  // cell -> hexagon index for one size, made once and kept (Int32Array, -1 = outside the study area)
  function hexGrid(m) {
    if (hexGrids[m]) { hexGrids[m].used = performance.now(); return hexGrids[m]; }
    // keep the four sizes used last (3.4 MB of index each, plus their caches); the rest are made again when needed
    const kept = Object.values(hexGrids).sort((x, y) => y.used - x.used);
    kept.slice(3).forEach((g) => delete hexGrids[g.m]);
    const w = land.width, h = land.height, st = L8.study, R = m / land.cell_m_ground / HEX_S3;
    const cols = Math.ceil(w / (R * HEX_S3)) + 3, rows = Math.ceil(h / (1.5 * R)) + 2, K = rows * cols;
    const idx = new Int32Array(w * h).fill(-1), cnt = new Uint16Array(K), ok = new Uint8Array(K);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const i = r * w + c;
      if (!st[i]) continue;
      const id = hexIdAt(R, cols, rows, c + 0.5, r + 0.5);
      if (id < 0) continue;
      idx[i] = id; cnt[id]++;
    }
    const half = 0.5 * 1.5 * HEX_S3 * R * R; // half of the hexagon's area, in cells
    for (let k = 0; k < K; k++) ok[k] = cnt[k] >= half ? 1 : 0;
    return (hexGrids[m] = { m, R, cols, rows, K, idx, cnt, ok, cache: {}, used: performance.now() });
  }
  // the hexagon holding the point (u, v) of the 120 m grid (column, row; cell centres at +0.5); -1 off the grid
  function hexIdAt(R, cols, rows, u, v) {
    const qf = ((HEX_S3 / 3) * u - v / 3) / R, rf = ((2 / 3) * v) / R, sf = -qf - rf;
    let q = Math.round(qf), r = Math.round(rf);
    const s = Math.round(sf), dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
    if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
    const col = q + (r >> 1); // offset column; its centre is at u = R·√3·(col + (r odd ? ½ : 0)), v = 1.5·R·r
    return r < 0 || r >= rows || col < -1 || col > cols - 2 ? -1 : r * cols + col + 1;
  }
  // per hexagon: the sum of f(i) over its cells (f returns a number; cells outside the study area are skipped)
  function hexSum(G, f) {
    const out = new Float32Array(G.K), idx = G.idx;
    for (let i = 0; i < idx.length; i++) { const id = idx[i]; if (id >= 0) { const x = f(i); if (x) out[id] += x; } }
    return out;
  }
  const hexCached = (G, key, make) => G.cache[key] || (G.cache[key] = make());

  /* ---- colours: a few clean classes per layer; light and dark map ---- */
  // Rating layers (score, ground sinking) use one diverging pair that colour-blind readers can tell apart: vermillion
  // (worse) and bluish green (better). Quantity layers (built-up share, water, forest) use sequential ramps with no
  // judgement. On the dark map the strongest class is the brightest one.
  const HEX_PAL = {
    light: {
      score: ["#B8400F", "#E8894A", "#C9C4B8", "#5CB89A", "#12806B"],
      built: ["#DDD8CF", "#BEB6AA", "#9A9083", "#71685D", "#4A433A"],
      forest: ["#CDE5C4", "#85BE78", "#3D8A3A"], loss: ["#F2B36B", "#E0702B", "#A8360C"], dist: ["#E9A6D2", "#D0479F", "#9C1069"],
      walls: ["#F3A257", "#E2551C", "#A3300C"], brighter: "#E3D3A0", darker: "#7C93B5",
      wet: ["#9CC6EC", "#2F7FCC"], dry: ["#EDC45A", "#B7801A"], wetS1: ["#9CC6EC", "#3F8FD6", "#155FA8"],
      water: ["#9ED0F5", "#3C93DE", "#0B4A8C"],
      sink: ["#F2A07B", "#D9572F", "#9E2A12"], stable: "#AFC2B6", rise: "#4A90D9",
      flood: "#1F6FBF", edge: "rgba(255,255,255,0.45)", fill: 0.38, tint: 0.28,
    },
    dark: {
      score: ["#F26B35", "#B87650", "#5A6066", "#3F9C80", "#4FD8AE"],
      built: ["#3C4044", "#555B60", "#767D84", "#9FA6AD", "#D0D5DA"],
      forest: ["#2E4D2B", "#3F7D39", "#6CC061"], loss: ["#9C5A2A", "#DA6A2B", "#FF8F55"], dist: ["#8A3A6E", "#D0479F", "#F58BD0"],
      walls: ["#A5562A", "#E2601F", "#FF8F55"], brighter: "#7D7150", darker: "#6F86AD",
      wet: ["#3A6E9E", "#7FC0FF"], dry: ["#8F7426", "#E5BE4E"], wetS1: ["#2F5F8F", "#3F8FD6", "#7FC0FF"],
      water: ["#24527F", "#2F7FD0", "#7CC4FF"],
      sink: ["#8C3A22", "#D9572F", "#FF7A50"], stable: "#4C5A52", rise: "#5DA8F0",
      flood: "#5FA8EE", edge: "rgba(255,255,255,0.16)", fill: 0.36, tint: 0.27,
    },
  };
  const hexPal = () => HEX_PAL[dark() ? "dark" : "light"];
  // opacity of a class: its own (the clear neutral ones), else `fill` for the grey built-up classes, `tint` for colours
  const hexAlpha = (k, j, c, P) => c.a || (k === "built" && j < 5 ? P.fill : P.tint);
  const hexPct = (x) => Math.round(x * 100);
  const hexRng = (a, b) => (b == null ? `≥ ${a}%` : `${a}–${b}%`);
  // classes from thresholds (shares 0..1): [t0, t1, ...] -> 0 below t1, 1 below t2, ...; -1 below t0
  const hexStep = (x, t) => { let c = -1; for (let j = 0; j < t.length; j++) if (x >= t[j]) c = j; return c; };
  const hexRngs = (t) => t.map((a, j) => hexRng(hexPct(a), j + 1 < t.length ? hexPct(t[j + 1]) : null));
  const hexT = () => U().hex;

  /* ---- the layers: key (what the colours depend on), calc (classes per hexagon), classes (legend), info (tooltip) ---- */
  const BUILT_T = [0.05, 0.15, 0.30, 0.45, 0.60], NEW_T = 0.15, RNB = 10; // radar first-year bins: 2021..2030
  const builtYear = () => clamp(state.yearF, land.epochs[0], horizonEnd());
  const hexMean = (G, name) => hexCached(G, `mean|${name}`, () => { const a = L8[name], s = hexSum(G, (i) => a[i]); for (let k = 0; k < G.K; k++) s[k] = G.cnt[k] ? s[k] / G.cnt[k] / 255 : 0; return s; });
  function hexRadarYears(G) { // per hexagon, how many cells radar first saw built in each year after the optical map
    const fy = radarFirst();
    return hexCached(G, `radar|${rlLast}`, () => {
      const out = new Float32Array(G.K * RNB), y0 = LAST_OBS() - 2000 + 1, idx = G.idx;
      for (let i = 0; i < idx.length; i++) { const id = idx[i], b = fy[i] - y0; if (id >= 0 && b >= 0 && b < RNB) out[b * G.K + id]++; }
      return out;
    });
  }
  function hexForecast(G) { // per hexagon, cells the model expects to turn built in 2025-2030 and 2030-2035 (minimum chance applied)
    const fy = radarFirst();
    return hexCached(G, `proj|${state.minChance}|${!!fy}|${!!L8.sar_water}`, () => {
      const n = land.width * land.height, thr = THR(), tmin = state.minChance / 100, first = new Uint16Array(n), b25 = L8.built_2025;
      land.projected.forEach((y) => {
        const b = L8[`built_${y}`], prev = y === land.projected[0] ? L8[`built_${LAST_OBS()}`] : L8[`built_${y - 5}`], p = L8[`prob_${y}`];
        for (let i = 0; i < n; i++) if (!first[i] && b[i] >= thr && prev[i] < thr && (p[i] / 255) ** 2 >= tmin) first[i] = y;
      });
      // established buildings (2025) and cells radar already sees built are never shown as forecast, nor dense forest and
      // parkland, lakes and rivers, or groundwater-flood areas (no concrete projected into parks or floodplains)
      const ff = L8.forest2000_frac, wa = L8.sar_water, fl = floodMask();
      const keep = (i) => !(b25[i] >= thr || (fy && fy[i] >= 15) || (ff && ff[i] > 90) || (wa && waterOf(wa[i]) > 0.25) || fl[i]);
      return { c30: hexSum(G, (i) => (first[i] === 2030 && keep(i) ? 1 : 0)), c35: hexSum(G, (i) => (first[i] === 2035 && keep(i) ? 1 : 0)) };
    });
  }
  const HEX = {
    built: {
      key: () => `${builtYear()}|${state.minChance}|${horizonEnd()}|${!!radarFirst()}|${!!L8.sar_water}`,
      calc(G) {
        // smooth time as before: blend the two surrounding 5-year epochs (the base stops at 2020 when radar adds the years after)
        const yf = builtYear(), fy = radarFirst(), { e0, e1, t } = epochPair(Math.min(yf, fy ? LAST_OBS() : 2025));
        const m0 = hexMean(G, `built_${e0}`), m1 = hexMean(G, `built_${e1}`), K = G.K;
        const cls = new Int8Array(K).fill(-1), v = new Float32Array(K), nw = new Float32Array(K), pr = new Float32Array(K);
        if (fy && yf > LAST_OBS()) { // radar's new building up to the timeline year; that year's cells count in as the year passes
          const H = hexRadarYears(G), yr = Math.min(yf, NOW_YEAR);
          for (let b = 0; b < RNB; b++) { const f = clamp(yr - (LAST_OBS() + 1 + b) + 1, 0, 1); if (f > 0) for (let k = 0; k < K; k++) nw[k] += H[b * K + k] * f; }
        }
        if (yf > NOW_YEAR) { // the forecast fades in after today
          const P = hexForecast(G), tp30 = clamp((yf - NOW_YEAR) / (2030 - NOW_YEAR), 0, 1), tp35 = horizonEnd() > 2030 && yf > 2030 ? clamp((yf - 2030) / 5, 0, 1) : 0;
          for (let k = 0; k < K; k++) pr[k] = P.c30[k] * tp30 + P.c35[k] * tp35;
        }
        for (let k = 0; k < K; k++) {
          if (!G.ok[k]) continue;
          const n = G.cnt[k];
          v[k] = m0[k] + (m1[k] - m0[k]) * t;
          if (nw[k] >= HEX_MIN && nw[k] / n >= NEW_T) cls[k] = 5;
          else if (pr[k] >= HEX_MIN && pr[k] / n >= NEW_T) cls[k] = 6;
          else cls[k] = hexStep(v[k], BUILT_T);
          nw[k] /= n; pr[k] /= n;
        }
        return { cls, v, nw, pr };
      },
      classes() {
        const P = hexPal(), h = hexT(), r = hexRngs(BUILT_T);
        return P.built.map((c, j) => ({ c, g: h.builtCap, lab: r[j] }))
          .concat([{ c: css("--pred-recent") || "#8B5CF6", lab: h.builtNew(U().lg.radarNew(LAST_OBS() + 1, Math.min(state.year, rlLast)), hexPct(NEW_T)), when: () => radarFirst() && state.year > LAST_OBS() },
            { c: css("--pred") || "#C084FC", lab: h.builtNew(typeof U().lg.projected === "function" ? U().lg.projected(state.year) : U().lg.projected, hexPct(NEW_T)), when: () => state.lens === "history" && isFuture() }]);
      },
      info(e, id) {
        const h = hexT(), out = [h.hovBuilt(hexPct(e.v[id]))];
        if (e.nw[id] >= 0.005) out.push(h.hovNew(hexPct(e.nw[id])));
        if (e.pr[id] >= 0.005) out.push(h.hovPred(hexPct(e.pr[id])));
        return out;
      },
    },
    forest: {
      key: () => `${Math.min(state.year, 2024)}`,
      calc(G) {
        const ff = hexMean(G, "forest2000_frac"), K = G.K, upTo = Math.min(state.year, 2024) - 2000;
        const cls = new Int8Array(K).fill(-1), lost = new Float32Array(K), left = new Float32Array(K), nl = new Float32Array(K);
        const loss = L8.forest_loss, lf = L8.loss_frac, idx = G.idx; // per hexagon: the lost share of its cells up to the year, and how many
        for (let i = 0; i < idx.length; i++) { const id = idx[i], y = loss[i]; if (id >= 0 && y && y <= upTo && lf[i]) { lost[id] += lf[i] / 255; nl[id]++; } }
        for (let k = 0; k < K; k++) {
          if (!G.ok[k]) continue;
          lost[k] /= G.cnt[k]; left[k] = Math.max(0, ff[k] - lost[k]);
          const c = nl[k] >= HEX_MIN ? hexStep(lost[k], FOREST_LOSS_T) : -1;
          cls[k] = c >= 0 ? 3 + c : hexStep(left[k], FOREST_T);
        }
        return { cls, lost, left };
      },
      classes() {
        const P = hexPal(), h = hexT(), a = hexRngs(FOREST_T), b = hexRngs(FOREST_LOSS_T);
        return P.forest.map((c, j) => ({ c, g: h.forestCap, lab: a[j] })).concat(P.loss.map((c, j) => ({ c, g: h.lossCap(Math.min(state.year, 2024)), lab: b[j] })));
      },
      info: (e, id) => [hexT().hovForest(hexPct(e.left[id]), hexPct(e.lost[id]), Math.min(state.year, 2024))],
    },
    // OPERA forest disturbance (Sentinel-1, Jan-Feb 2026; 200 = high, 100 = low confidence, forest land of 2000 only):
    // the flagged share of the hexagon's forest, high confidence first. Magenta, apart from the orange Landsat felling.
    dist: {
      key: () => "",
      calc(G) {
        const a = L8.dist_forest, ff = L8.forest2000_frac, idx = G.idx, K = G.K;
        const fo = new Float32Array(K), hi = new Float32Array(K), lo = new Float32Array(K), cls = new Int8Array(K).fill(-1);
        for (let i = 0; i < idx.length; i++) {
          const id = idx[i];
          if (id < 0 || !(a[i] || ff[i] >= 64)) continue; // forest: a quarter of the cell or more in 2000, or flagged
          fo[id]++;
          if (a[i] >= 150) hi[id]++; else if (a[i]) lo[id]++;
        }
        for (let k = 0; k < K; k++) {
          if (!G.ok[k] || fo[k] < HEX_MIN) continue;
          const h = hi[k] / fo[k], l = (hi[k] + lo[k]) / fo[k];
          cls[k] = hi[k] >= HEX_MIN && h >= 0.1 ? 1 + (h >= 0.25 ? 1 : 0) : hi[k] + lo[k] >= HEX_MIN && l >= 0.1 ? 0 : -1;
          hi[k] = h; lo[k] = l;
        }
        return { cls, hi, lo, fo };
      },
      classes() {
        const P = hexPal(), h = hexT();
        return [{ c: P.dist[0], lab: h.distLo }, { c: P.dist[1], g: h.distCap, lab: "10–25%" }, { c: P.dist[2], g: h.distCap, lab: "≥ 25%" }];
      },
      info: (e, id) => (e.fo[id] >= HEX_MIN ? [hexT().hovDist(hexPct(e.hi[id]), hexPct(e.lo[id]))] : []),
    },
    score: {
      key: () => `${!!sar}|${!!L8.sar_water}`,
      calc(G) {
        const H = hexCached(G, `score|${!!sar}|${!!L8.sar_water}`, () => { const S = cellScores(); return { sum: hexSum(G, (i) => (S[i] === S[i] ? S[i] : 0)), n: hexSum(G, (i) => (S[i] === S[i] ? 1 : 0)) }; });
        const K = G.K, cls = new Int8Array(K).fill(-1), v = new Float32Array(K);
        for (let k = 0; k < K; k++) { // a hexagon that is mostly water is not drawn
          if (!G.ok[k] || H.n[k] < HEX_COVER * G.cnt[k]) continue;
          v[k] = H.sum[k] / H.n[k]; cls[k] = Math.max(0, hexStep(v[k], SCORE_T));
        }
        return { cls, v };
      },
      classes() {
        const P = hexPal(), h = hexT();
        const t = SCORE_T.slice(1);
        return P.score.map((c, j) => ({ c, a: j === 2 ? 0.16 : null, g: h.scoreCap, lab: j === 0 ? `< ${t[0]}` : j === t.length ? `≥ ${t[j - 1]}` : `${t[j - 1]}–${t[j]}` }));
      },
      info: (e, id) => [hexT().hovScore(Math.round(e.v[id]))],
    },
    sarchange: share3({
      key: () => `${state.lyr.sarchange.min}|${sar.s1.wall_db || 1.5}`,
      data: "sar_change",
      // 0 none, 1 new walls (brighter with double bounce), 2 brighter, 3 darker; the same rule as the tooltip had
      kind() {
        const a = L8.sar_change, r = L8.sar_dratio, min = state.lyr.sarchange.min, wd = sar.s1.wall_db || 1.5;
        return (i) => { const d = changeOf(a[i]); return d >= min ? (r[i] && changeOf(r[i]) >= wd ? 1 : 2) : d <= -min ? 3 : 0; };
      },
      pick(s, n) { // walls first; plain brighter or darker land only when it covers a quarter of the hexagon
        const w = n[1] >= HEX_MIN ? hexStep(s[1], WALL_T) : -1;
        return w >= 0 ? w : n[2] >= HEX_MIN && s[2] >= 0.25 ? 3 : n[3] >= HEX_MIN && s[3] >= 0.25 ? 4 : -1;
      },
      classes() {
        const P = hexPal(), h = hexT(), r = hexRngs(WALL_T);
        return P.walls.map((c, j) => ({ c, g: h.wallsCap, lab: r[j] })).concat([{ c: P.brighter, a: 0.6, g: h.otherCap("25"), lab: h.brighter }, { c: P.darker, a: 0.6, g: h.otherCap("25"), lab: h.darker }]);
      },
      info: (s) => [hexT().hovChange(hexPct(s[1]), hexPct(s[2]), hexPct(s[3]))],
    }),
    nisarwet: share3({
      key: () => `${state.lyr.nisarwet.min}`,
      data: "nisar_wetdry", cover: true,
      kind() { const a = L8.nisar_wetdry, min = state.lyr.nisarwet.min; return (i) => { const d = changeOf(a[i]); return d >= min ? 1 : d <= -min ? 2 : 0; }; },
      pick(s, n) {
        const w = n[1] >= HEX_MIN ? hexStep(s[1], WET_T) : -1, d = n[2] >= HEX_MIN ? hexStep(s[2], WET_T) : -1;
        return w >= 0 && (d < 0 || s[1] >= s[2]) ? w : d >= 0 ? 2 + d : -1;
      },
      classes() {
        const P = hexPal(), h = hexT(), r = hexRngs(WET_T);
        return P.wet.map((c, j) => ({ c, g: h.wetCap, lab: r[j] })).concat(P.dry.map((c, j) => ({ c, g: h.dryCap, lab: r[j] })));
      },
      info: (s) => [hexT().hovWet(hexPct(s[1]), hexPct(s[2]))],
    }),
    sarwet: share3({
      key: () => "",
      data: "sar_wet", cover: true,
      kind() { const a = L8.sar_wet, rc = sar.s1.r_crit; return (i) => (wetOf(a[i]) >= rc ? 1 : 0); },
      pick: (s, n) => (n[1] >= HEX_MIN ? hexStep(s[1], WETS1_T) : -1),
      classes() { const P = hexPal(), h = hexT(), r = hexRngs(WETS1_T); return P.wetS1.map((c, j) => ({ c, g: h.wetS1Cap, lab: r[j] })); },
      info: (s) => [hexT().hovWetS1(hexPct(s[1]))],
    }),
    sarwater: share3({
      key: () => `${state.lyr.sarwater.min}`,
      data: "sar_water",
      kind() { const a = L8.sar_water, m = state.lyr.sarwater.min / 100; return (i) => (waterOf(a[i]) >= m ? 1 : 0); },
      pick: (s, n) => (n[1] >= HEX_MIN ? hexStep(s[1], WATER_T) : -1),
      classes() { const P = hexPal(), h = hexT(), r = hexRngs(WATER_T); return P.water.map((c, j) => ({ c, g: h.waterCap, lab: r[j] })); },
      info: (s) => [hexT().hovWater(hexPct(s[1]))],
    }),
    egms: share3({
      key: () => `${state.lyr.egms.min}`,
      data: "sar_egms", cover: true,
      kind() { const a = L8.sar_egms, min = state.lyr.egms.min; return (i) => { const v = egmsOf(a[i]); return v <= -min ? 1 : v >= min ? 2 : 0; }; },
      pick(s, n) { // measured and neither sinking nor rising in a tenth of the points: stable
        const k = n[1] >= HEX_MIN ? hexStep(s[1], SINK_T) : -1;
        return k >= 0 ? 1 + k : n[2] >= HEX_MIN && s[2] >= 0.1 ? 4 : 0;
      },
      classes() {
        const P = hexPal(), h = hexT(), r = hexRngs(SINK_T);
        return [{ c: P.stable, a: 0.45, lab: h.stable }].concat(P.sink.map((c, j) => ({ c, g: h.sinkCap, lab: r[j] })), [{ c: P.rise, lab: h.rises("10") }]);
      },
      info: (s) => [hexT().hovEgms(hexPct(s[1]), hexPct(s[2]))],
    }),
    flood: {
      key: () => "",
      ring: true,
      calc(G) {
        const m = floodMask(), K = G.K, f = hexCached(G, "flood", () => hexSum(G, (i) => m[i]));
        const cls = new Int8Array(K).fill(-1), v = new Float32Array(K);
        for (let k = 0; k < K; k++) { if (!G.ok[k]) continue; v[k] = f[k] / G.cnt[k]; if (f[k] >= HEX_MIN && v[k] >= FLOOD_T) cls[k] = 0; }
        return { cls, v };
      },
      classes: () => [{ c: hexPal().flood, ring: true, lab: hexT().floodRing(hexPct(FLOOD_T)) }],
      info: (e, id) => (e.v[id] >= 0.005 ? [hexT().hovFlood(hexPct(e.v[id]))] : []),
    },
  };
  const FOREST_T = [0.2, 0.5, 0.8], FOREST_LOSS_T = [0.05, 0.12, 0.25], SCORE_T = [-Infinity, 78, 81, 84, 86]; // hexagon means of the score sit between about 77 and 87 (base 82): steps inside that range
  const WALL_T = [0.02, 0.05, 0.15], WET_T = [0.2, 0.4], WETS1_T = [0.2, 0.4, 0.7], WATER_T = [0.1, 0.3, 0.6], SINK_T = [0.1, 0.25, 0.5], FLOOD_T = 0.75;
  // A layer that sorts each cell with data into a kind (0 = nothing to show, 1, 2, 3) and colours a hexagon by the shares
  // of the kinds among its cells with data. A hexagon with data in less than half of it is not drawn; for `cover` layers,
  // which measure only part of the land (EGMS points, open land), its tooltip says "no data".
  function share3(L) {
    return Object.assign(L, {
      calc(G) {
        const a = L8[L.data], kind = L.kind(), K = G.K, idx = G.idx, n = new Float32Array(K * 4);
        for (let i = 0; i < idx.length; i++) { const id = idx[i]; if (id >= 0 && a[i]) n[kind(i) * K + id]++; }
        const cls = new Int8Array(K).fill(-1), sh = new Float32Array(K * 4), cov = new Float32Array(K), s = [0, 0, 0, 0], c = [0, 0, 0, 0];
        for (let k = 0; k < K; k++) {
          if (!G.ok[k]) continue;
          const d = n[k] + n[K + k] + n[2 * K + k] + n[3 * K + k];
          cov[k] = d / G.cnt[k];
          for (let j = 0; j < 4; j++) { c[j] = n[j * K + k]; s[j] = d ? c[j] / d : 0; sh[j * K + k] = s[j]; }
          cls[k] = cov[k] < HEX_COVER ? -1 : L.pick(s, c);
        }
        return { cls, sh, cov, K };
      },
      infoAt(e, id) {
        if (e.cov[id] < HEX_COVER) return L.cover ? [hexT().hovNoData(hexPct(e.cov[id]))] : [];
        return L.info([0, 1, 2, 3].map((j) => e.sh[j * e.K + id]));
      },
    });
  }
  // the plot score of every cell, the same formula as the heat map (part 14); open water is no plot: NaN, left out
  function cellScores() {
    const n = land.width * land.height, st = L8.study, out = new Float32Array(n).fill(NaN), fl = floodMask(), demOff = land.dem_offset || 45;
    const p30 = L8.prob_2030, ff = L8.forest2000_frac, lf = L8.loss_frac, b25 = L8.built_2025, d = L8.dem;
    const eg = sar ? L8.sar_egms : null, sc = sar ? L8.sar_change : null, wat = sar ? L8.sar_water : null;
    for (let i = 0; i < n; i++) {
      if (!st[i]) continue;
      if (wat && wat[i] && waterOf(wat[i]) >= 0.20) continue; // lakes and rivers
      let s = 82; // a solid, safe plot in the agglomeration
      const treeFrac = ff && ff[i] ? Math.max(0, ff[i] - (lf ? lf[i] : 0)) / 255 : 0, built = b25 ? b25[i] : 0, elev = d && d[i] ? d[i] / 2 + demOff : 70;
      if (treeFrac >= 0.10 && treeFrac <= 0.65) s += 5; // trees around: an amenity
      else if (treeFrac > 0.65) s += 2; // deep forest
      else if (built > 100 && treeFrac < 0.05) s -= 4; // sealed urban core
      if (fl[i]) { // groundwater-flood area: only low, unbuilt flood meadow is a hazard
        if (elev < 55 && built < 20) s -= 18;
        else if (built >= 20 || elev >= 56) s += 2;
        else s -= 4;
      }
      if (eg && eg[i]) {
        const v = egmsOf(eg[i]);
        if (v <= -2) s -= Math.min(32, Math.abs(v) * 7);
        else if (v >= -0.5 && v <= 1) s += 3;
      }
      if (sc && sc[i] && changeOf(sc[i]) >= 3) s -= 12; // building work seen by radar
      if (p30 && p30[i] > 35 && built < 25) s -= Math.round((p30[i] / 255) * 12); // development pressure on open fields
      out[i] = clamp(s, 10, 95);
    }
    return out;
  }
  // groundwater-flood polygons (PIG-PIB) burnt once into the 120 m grid: 1 where most of the cell lies inside
  let floodCells = null;
  function floodMask() {
    if (floodCells) return floodCells;
    const w = land.width, h = land.height, [a, , c, , e, f] = land.transform3857, cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const g = cv.getContext("2d");
    g.fillStyle = "#000";
    flood.features.forEach((ft) => rings(ft.geometry).forEach((poly) => {
      g.beginPath();
      poly.forEach((ring) => ring.forEach(([lo, la], k) => { const [x, y] = latLngToMerc(la, lo), u = (x - c) / a, v = (y - f) / e; k ? g.lineTo(u, v) : g.moveTo(u, v); }));
      g.fill("evenodd"); // holes stay out
    }));
    const px = g.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = px[i * 4 + 3] > 127 ? 1 : 0;
    return (floodCells = out);
  }

  /* ---- drawing: one tiled canvas layer for all hexagon layers, only the hexagons in view ---- */
  // the pill above the zoom buttons: hexagons or the heat map (the raster drawing of part 14) for the same layers
  function setHexMode(on) {
    state.hex = !!on;
    try { localStorage.setItem("ptd-hex", on ? "1" : "0"); } catch (e) { /* storage blocked */ }
    $("#mode-hex").setAttribute("aria-pressed", String(state.hex)); $("#mode-heat").setAttribute("aria-pressed", String(!state.hex));
    renderLegend(); redraw();
  }
  const hexDrawn = (k) => state.hex && HEX_KEYS.includes(k); // drawn as hexagons now, so not as the heat map
  let hexOn = []; // active layers bottom to top: { k, mark: "fill" | "inset" | "ring", op }
  let hexPainted = "", hexStyle = ""; // what the tiles show (layers, inputs, theme); the same without the inputs
  function hexLayers() { return state.hex && L8.study ? HEX_KEYS.filter((k) => state.lyr[k] && state.lyr[k].on && ready(k) && !layerFailed.has(k)) : []; }
  function hexEntry(k, G) { // the classes of one layer on one hexagon size, computed once per change of its inputs
    const key = HEX[k].key(), e = G.cache[`L|${k}`];
    if (e && e.key === key) return e;
    return (G.cache[`L|${k}`] = Object.assign(HEX[k].calc(G), { key }));
  }
  function hexPaint(canvas, coords, size) {
    const ctx = canvas.getContext("2d"), dpr = canvas.width / size.x;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!hexOn.length) { ctx.clearRect(0, 0, size.x, size.y); canvas.hexSig = ""; return; }
    const z = coords.z, G = hexGrid(hexSizeFor(z)), T = land.transform3857, sc = 256 * 2 ** z, A = sc / (2 * Math.PI * 6378137);
    const ax = A * T[0], ay = -A * T[4], bx = A * T[2] + sc / 2 - coords.x * size.x, by = sc / 2 - A * T[5] - coords.y * size.y;
    const R = G.R, w = R * HEX_S3, Rp = R * ax, P = hexPal();
    const r0 = Math.max(0, Math.floor((-by / ay - R) / (1.5 * R))), r1 = Math.min(G.rows - 1, Math.ceil(((size.y - by) / ay + R) / (1.5 * R)));
    const c0 = Math.max(-1, Math.floor(-bx / ax / w) - 1), c1 = Math.min(G.cols - 2, Math.ceil((size.x - bx) / ax / w) + 1);
    const lay = hexOn.map((l) => ({ ...l, e: hexEntry(l.k, G), paths: [], r: Rp * (l.mark === "inset" ? 0.58 : l.mark === "ring" ? 0.8 : 1) }));
    // A tile whose hexagons all kept their classes is left as it is: moving the timeline then repaints (and sends to the
    // screen) only the few tiles where something changed, which is what keeps it smooth on a phone.
    let hash = 0;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const id = r * G.cols + c + 1;
      if (G.ok[id]) for (const l of lay) hash = (Math.imul(hash, 31) + l.e.cls[id] + 3) | 0;
    }
    const sig = `${hexStyle}|${G.m}|${hash}`;
    if (canvas.hexSig === sig) return;
    canvas.hexSig = sig;
    ctx.clearRect(0, 0, size.x, size.y);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const id = r * G.cols + c + 1;
      if (!G.ok[id]) continue;
      const x = ax * w * (c + 0.5 * (r & 1)) + bx, y = ay * 1.5 * R * r + by;
      for (const l of lay) {
        const k = l.e.cls[id];
        if (k === -1) continue;
        const p = l.paths[k] || (l.paths[k] = new Path2D());
        p.moveTo(x, y - l.r); p.lineTo(x + l.r * 0.866, y - l.r / 2); p.lineTo(x + l.r * 0.866, y + l.r / 2);
        p.lineTo(x, y + l.r); p.lineTo(x - l.r * 0.866, y + l.r / 2); p.lineTo(x - l.r * 0.866, y - l.r / 2); p.closePath();
      }
    }
    // hexagons narrower than about 9 px get no outline: it would be all outline
    const edges = Rp >= 5;
    ctx.lineJoin = "round";
    for (const l of lay) {
      const cl = HEX[l.k].classes();
      // a slight blend between neighbours: each hexagon's colour spills a little over its edge, faintly, under the fills
      if (l.mark !== "ring" && Rp >= 5) l.paths.forEach((p, k) => {
        if (!p || !cl[k]) return;
        ctx.globalAlpha = hexAlpha(l.k, k, cl[k], P) * l.op * 0.3; ctx.strokeStyle = cl[k].c; ctx.lineWidth = Rp * 0.35; ctx.stroke(p);
      });
      l.paths.forEach((p, k) => {
        if (!p || !cl[k]) return;
        if (l.mark === "ring") {
          ctx.globalAlpha = l.op; ctx.strokeStyle = cl[k].c; ctx.lineWidth = Math.max(1.5, Rp * 0.13); ctx.stroke(p);
          return;
        }
        ctx.globalAlpha = hexAlpha(l.k, k, cl[k], P) * l.op; ctx.fillStyle = cl[k].c; ctx.fill(p);
        if (edges) { ctx.globalAlpha = 1; ctx.strokeStyle = P.edge; ctx.lineWidth = l.mark === "inset" ? 0.6 : 0.8; ctx.stroke(p); }
      });
    }
    ctx.globalAlpha = 1;
  }
  const HexLayer = L.GridLayer.extend({
    createTile(coords) {
      const t = document.createElement("canvas"), size = this.getTileSize(), dpr = window.devicePixelRatio || 1;
      t.width = size.x * dpr; t.height = size.y * dpr;
      hexPaint(t, coords, size);
      return t;
    },
    repaint() { Object.values(this._tiles || {}).forEach((tile) => hexPaint(tile.el, tile.coords, this.getTileSize())); },
    getEvents() { // the legend names the hexagon size, which changes with the zoom
      const ev = L.GridLayer.prototype.getEvents.call(this);
      ev.zoomend = () => { const m = hexSizeFor(hexZoom()); if (m !== hexLegendSize) renderLegend(); };
      return ev;
    },
  });
  let hexLayer = null, hexLegendSize = 0;
  // called by redraw(): which hexagon layers are on, and repaint the tiles when anything they show changed
  function hexSync() {
    hexOn = [];
    hexLayers().forEach((k) => hexOn.push({ k, op: state.lyr[k].op, mark: HEX[k].ring ? "ring" : hexOn.some((l) => l.mark !== "ring") ? "inset" : "fill" }));
    // a ring under the first filled layer is still drawn last, on top
    hexOn.sort((a, b) => (a.mark === "ring") - (b.mark === "ring"));
    if (!hexLayer) hexLayer = new HexLayer({ pane: "land", zIndex: 200 });
    if (!hexOn.length) { if (map.hasLayer(hexLayer)) map.removeLayer(hexLayer); hexPainted = ""; return; }
    hexStyle = `${dark()}|` + hexOn.map((l) => `${l.k}:${l.mark}:${l.op}`).join("|");
    const sig = hexStyle + "|" + hexOn.map((l) => HEX[l.k].key()).join("|");
    if (!map.hasLayer(hexLayer)) { hexPainted = sig; hexLayer.addTo(map); return; }
    if (sig !== hexPainted) { hexPainted = sig; hexLayer.repaint(); }
  }
  // tooltip: the values of the hexagon under the pointer, for every hexagon layer that is on
  function hexHover(lat, lng) {
    if (!hexOn.length || !land) return [];
    const m = hexSizeFor(hexZoom()), G = hexGrid(m), [x, y] = latLngToMerc(lat, lng), [a, , c, , e, f] = land.transform3857;
    const id = hexIdAt(G.R, G.cols, G.rows, (x - c) / a, (y - f) / e);
    if (id < 0 || !G.ok[id]) return [];
    const lines = [];
    hexOn.slice().reverse().forEach((l) => { const H = HEX[l.k], en = hexEntry(l.k, G); lines.push(...(H.infoAt ? H.infoAt(en, id) : H.info(en, id))); });
    return lines.length ? lines.concat([`<small>${esc(hexT().hovSize(m))}</small>`]) : [];
  }
  // legend rows of one hexagon layer: its classes with their thresholds
  function hexLegend(k) {
    hexLegendSize = hexSizeFor(hexZoom());
    const H = HEX[k], h = hexT(), P = hexPal(), out = [], all = H.classes();
    const sw = (c) => (c.ring ? `<span class="sw hex ring" style="--ring:${c.c}"></span>` : `<span class="sw hex" style="background:${c.c};opacity:${Math.min(1, hexAlpha(k, all.indexOf(c), c, P) + 0.25)}"></span>`);
    // ordered classes of one group as a row of steps (swatch over its range), the rest one per row
    all.filter((c) => !c.when || c.when()).forEach((c) => {
      const last = out[out.length - 1];
      if (c.g && last && last.g === c.g) last.items.push(c); else out.push(c.g ? { g: c.g, items: [c] } : c);
    });
    return out.map((o) => (o.items ? `<div class="lrow lcap">${esc(o.g)}</div><div class="hexsteps">${o.items.map((c) => `<span class="hs">${sw(c)}<small>${esc(c.lab)}</small></span>`).join("")}</div>`
      : `<div class="lrow">${sw(o)}${esc(o.lab)}</div>`)).join("");
  }
