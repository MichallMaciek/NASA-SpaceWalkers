// SARnik core, part 5 of 32: state: the one state object, NISAR dates, hires and sar handles.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= state ================= */
  const state = {
    year: NOW_YEAR, yearF: NOW_YEAR, horizon: 10, minChance: 5, base: "map",
    lyr: {
      s1rgb: { on: false, op: 0.8 },
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
      wuia: { on: false, op: 0.85 },
      score: { on: true, op: 0.85 },
      night: { on: false, op: 0.8 }, day: { on: false, op: 0.8 }, ndvi: { on: false, op: 0.8 }, nightyear: { on: false, op: 0.8 },
    },
    sel: null, // {kind: 'point'|'area', lat, lng, ring:[[lat,lng]...], label, cells, sq}
    findingsOpen: (() => { try { const v = localStorage.getItem("ptd-fold"); if (v) return v === "open"; } catch (e) { /* ignore */ } return innerWidth >= 760; })(), finding: null, testVar: "built",
    expert: (() => { try { return localStorage.getItem("ptd-expert") === "1"; } catch (e) { return false; } })(),
    lens: "score",
    ryear: 2026, // radar views: the year on the radar time line
  };
  let NISAR_DATES = [];
  let hires = null; // data/land/hires.json: radar pictures on a 3x finer grid (build_hires.py); null if not built
  let sar = null; // data/land/sar.json (radar products of SARnik v2); null if not built

