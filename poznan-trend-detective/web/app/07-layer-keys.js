// SARnik core, part 7 of 32: layer keys, L-band years, which views use the radar time line.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  const LAND_KEYS = ["dem", "alos", "s1rgb", "radar", "activity", "nisarsm", "nisarcoh", "dist"]; // raster pictures, draw order bottom to top; the rest are hexagons (HEX_KEYS, part 13a)
  const SAR_KEYS = ["s1rgb", "sarchange", "sarwet", "sarwater", "egms", "alos", "nisarwet", "nisarcoh", "nisarsm", "dist"];
  const ZIP_OF = { nisarcoh: "coh", nisarsm: "sme", dist: "dist" }; // layer -> its entry in sar.json "zips" (absent = not built)
  const zipOk = (k) => !!(sar && sar.zips && sar.zips[ZIP_OF[k]]);
  // L-band time line: ALOS-2 yearly mosaics, then NISAR 2026 (median of its passes)
  const LBAND_YEARS = () => (sar ? sar.alos.years.concat(sar.nisar ? [2026] : []) : []);
  const lbandNames = (y) => (y === 2026 ? ["nisar_hh_med", "nisar_hv_med"] : [`alos_hh_${y}`, `alos_hv_${y}`]);
  // radar time line (v3): only raw satellite microwave views use the specialized radar archive timeline
  const RADAR_LENSES = ["radar"];
  const RY = () => (sar ? sar.alos.years.concat([2026]) : []);
  const radarTL = () => !!sar && RADAR_LENSES.includes(state.lens);
