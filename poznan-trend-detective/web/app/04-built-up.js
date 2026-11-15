// SARnik core, part 4 of 32: built-up epochs: radar first year, epochs, heat ranks, grids, risk pool.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  // The first year radar sees each cell built (data/sarnik/radar_lata; 21..26 = 2021..2026), under the L8 key the card
  // module radar_lata also reads. The history view draws it for the years after the optical map. Loaded once; if it is
  // missing or broken the view stays as it was, with one warning in the console.
  const RL = "sarnik/radar_lata/first_year";
  let rlLast = 0, rlP = null, rlQ75 = null; // last radar year, once the layer is usable; 75% quantile of new ha within 1 km
  const radarFirst = () => (rlLast && L8[RL]) || null;
  function loadRadarYears() {
    if (rlP) return rlP;
    rlP = skCtx.loadJSON("sarnik/radar_lata/meta.json").then((meta) => {
      if (!meta || !Array.isArray(meta.years) || !meta.years.length) throw new Error("meta.json without years");
      const q = meta.near_1km && meta.near_1km.new_ha_since_2020_quantiles; rlQ75 = q && typeof q["75"] === "number" ? q["75"] : null;
      return loadGray(RL).then((arr) => { if (arr.length !== land.width * land.height) throw new Error("size differs from the grid"); rlLast = Math.max(...meta.years); });
    }).then(() => {
      if (map) { renderTimeline(); renderLegend(); redraw(); }
    }).catch((e) => { delete L8[RL]; console.warn(`SARnik: ${RL} not used:`, (e && e.message) || e); });
    return rlP;
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
  // The two MODIS grids, fetched once and indexed. Nothing in the first view needs them: they feed the summer-heat and
  // greenness layers and the heat rows of the place card, so they load with the first place that is picked (or a little
  // earlier, see warmUp) or when one of those layers is switched on. Call only after `areas` has loaded.
  let gridsP = null;
  const gridsOK = () => !!geo.L;
  function loadGrids() {
    if (!gridsP) {
      gridsP = Promise.all([get("grid_lst.json"), get("grid_ndvi.json")]).then(([a, b]) => {
        a.layers.night_mean = a.layers.night_years.map((ys) => { const m = mean(ys.slice(0, 25)); return isFinite(m) ? m : null; });
        gL = a; gN = b; geo.N = buildGeometry(b); geo.L = buildGeometry(a);
        try { prepareHeatRanks(); } catch (e) { delete geo.L; throw e; } // gridsOK() stays false unless everything is in place
      });
      gridsP.catch(() => { gridsP = null; }); // a failed load may be tried again
    }
    return gridsP;
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

