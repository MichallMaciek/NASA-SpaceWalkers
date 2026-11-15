// SARnik core, part 9 of 32: map padding, pixel layers and the data each layer needs (PIXEL, NEEDS), decoders, year helpers.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
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
    score: () => ["study", "prob_2030", "forest2000_frac", "built_2025", "dem", ...(sar ? ["sar_egms", "sar_change"] : [])],
    nisarcoh: () => ["nisar_coh", "study"],
    nisarsm: () => [state.lyr.nisarsm.d === "0625" ? "nisar_sm_0625" : "nisar_sm_0824", "study"],
    dist: () => ["dist_forest", "study"],
  };
  const ready = (k) => ((SAR_KEYS.includes(k) && !sar) || (k === "nisarwet" && !(sar && sar.nisar)) || (ZIP_OF[k] && !zipOk(k)) ? false : !NEEDS[k] || NEEDS[k]().every((n) => L8[n]));
  const SAR_PLACE = () => (sar ? ["sar_change", "sar_dratio", "sar_wet", "sar_water", "sar_egms", "sar_series",
    `alos_hv_${sar.alos.years[0]}`, `alos_hv_${sar.alos.years[sar.alos.years.length - 1]}`, ...(sar.nisar ? ["nisar_wetdry", "nisar_series"] : []),
    ...(sar.zips && sar.zips.sme ? ["nisar_sm_0625", "nisar_sm_0824"] : [])] : []); // soil moisture for the card's own-place row
  // decoders (sar.json "decode")
  const dbOf = (v) => (v ? v / 6 - 30 : NaN);
  const changeOf = (v) => (v ? v / 12.75 - 10 : NaN);
  const wetOf = (v) => (v ? (v - 1) / 127 - 1 : NaN);
  const waterOf = (v) => (v ? (v - 1) / 254 : NaN);
  const egmsOf = (v) => (v ? v - 100 : NaN);
  const horizonEnd = () => (state.horizon === 5 ? 2030 : 2035);
  const isFuture = () => state.year > NOW_YEAR;
  const s1Year = () => (state.year <= 2018 ? 2017 : state.year <= 2022 ? 2020 : 2024);
  const heatYear = () => clamp(state.year, 2000, 2024);

