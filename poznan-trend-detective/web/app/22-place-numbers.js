// SARnik core, part 22 of 32: numbers for the selection: built-up share, forest, risk, prices, heat.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ---- numbers for the selection ---- */
  const cellHa = () => (land.cell_m_ground ** 2) / 1e4;
  function builtShare(cells, year) { const a = L8[`built_${year}`], t = THR(); return cells.length ? (cells.filter((i) => a[i] >= t).length / cells.length) * 100 : NaN; }
  function builtSeriesAll(cells) { return EPOCHS().map((y) => builtShare(cells, y)); }
  // radar: the cell is first seen built in 2021..2026 (null-safe: false without the radar layer)
  const radarBuilt = (i) => { const fy = radarFirst(); return !!fy && fy[i] > LAST_OBS() - 2000; };
  // built-up share 2020..today with radar: built in the optical 2020 map or first seen built by radar in 2021..y; null without radar
  function radarShares(cells) {
    const fy = radarFirst(), a = L8[`built_${LAST_OBS()}`], t = THR(), out = [];
    if (!fy || !cells.length) return null;
    for (let y = LAST_OBS(); y <= NOW_YEAR; y++) out.push((cells.filter((i) => a[i] >= t || (fy[i] > LAST_OBS() - 2000 && fy[i] <= y - 2000)).length / cells.length) * 100);
    return out;
  }
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
    const open = cells.filter((i) => b25[i] < thr && !radarBuilt(i)); // with radar: land it still sees open
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

