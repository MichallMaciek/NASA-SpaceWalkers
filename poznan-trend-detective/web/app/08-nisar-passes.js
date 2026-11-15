// SARnik core, part 8 of 32: NISAR passes of summer 2026 (animation on the time line).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  // NISAR passes of summer 2026 (data/sarnik/anim, pipeline/sar_animacja.py): in the radar view the 2026 step opens into the
  // single passes, drawn as the same L-band composite. Without anim/meta.json the time line stays as it was.
  const ANIM = "sarnik/anim/";
  let anim = null, pass = -1; // pass: index of the pass on the map, -1 = the 2026 median (the default)
  const passOn = () => pass >= 0 && !!anim && radarTL() && state.lens === "radar" && state.ryear === 2026;
  const animSheet = () => ANIM + anim.layout.file.replace(/\.png$/, "");
  const passDate = (d, long) => new Date(`${d}T12:00:00Z`).toLocaleDateString(lang === "pl" ? "pl-PL" : "en-GB", long ? { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
  function passAt(i) { // HH and HV bytes of the pass on the map for a 120 m cell, from the half-resolution sheet (HV 0 when the pass has none)
    const f = anim.frames[pass], { bw, block } = anim.layout, sh = L8[animSheet()], w = land.width;
    const r = (((i / w) | 0) / block) | 0, c = ((i % w) / block) | 0, at = (xy) => sh[(xy[1] + r) * 2 * bw + xy[0] + c];
    return [at(f.hh), f.hv ? at(f.hv) : 0];
  }
  function loadAnim() {
    if (!sar || !sar.nisar) return;
    skCtx.loadJSON(`${ANIM}meta.json`).then((m) => {
      const l = m && m.layout;
      if (!l || typeof l.file !== "string" || !(l.bw > 0 && l.bh > 0 && l.block > 0) || !Array.isArray(m.frames) || m.frames.length < 2) throw new Error("no frames or layout");
      anim = m; renderTimeline();
    }).catch((e) => console.warn(`SARnik: ${ANIM}meta.json not used:`, (e && e.message) || e));
  }
  async function togglePasses() {
    stopPlay();
    if (pass >= 0) pass = -1;
    else {
      setBusy(1);
      try { await loadGray(animSheet()); pass = 0; } catch (e) { anim = null; console.warn(`SARnik: ${ANIM} sheet not used:`, (e && e.message) || e); } finally { setBusy(-1); }
    }
    renderTimeline(); renderLegend(); redraw();
  }
  function setPass(k) { pass = clamp(Math.round(k), 0, anim.frames.length - 1); renderTimeline(); renderLegend(); redraw(); }
