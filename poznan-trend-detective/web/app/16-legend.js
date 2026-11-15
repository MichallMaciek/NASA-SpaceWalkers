// SARnik core, part 16 of 32: legend.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= legend ================= */
  function renderLegend() {
    const u = U(), blocks = [];
    const ramp_ = (stops, lo, hi) => `<div class="ramp" style="background:${gradient(stops)}"></div><div class="ticks"><span>${lo}</span><span>${hi}</span></div>`;
    let lastHex = -1;
    // a hexagon layer (part 13a): its classes with their thresholds, and "no data" for layers that measure part of the land
    const hexBlock = (k, title, extra = "") => { lastHex = blocks.length; blocks.push(`<div class="lt">${title}</div>${hexLegend(k)}${extra}`); };
    // a layer that failed to load is left out of the colour keys below and gets its own block at the end
    const L_ = layerFailed.size ? Object.fromEntries(Object.entries(state.lyr).map(([k, v]) => [k, layerFailed.has(k) ? { ...v, on: false } : v])) : state.lyr;
    if (sar) {
      const lg = state.expert ? u.lg : { ...u.lg, ...u.lgPlain };
      const sw = (c, t) => `<div class="lrow"><span class="sw" style="background:${c}"></span>${t}</div>`;
      if (L_.sarchange.on) hexBlock("sarchange", lg.sarchange);
      if (L_.nisarwet.on && sar.nisar) hexBlock("nisarwet", lg.nisarwet);
      if (L_.sarwet.on) hexBlock("sarwet", lg.sarwet);
      if (L_.sarwater.on) hexBlock("sarwater", lg.sarwater);
      if (L_.egms.on) hexBlock("egms", lg.egms);
      if (L_.s1rgb.on || L_.alos.on) {
        const kk = L_.alos.on && !L_.s1rgb.on ? (L_.alos.y === 2026 ? "nisar" : "alos") : "s1rgb";
        const pf = L_.alos.on && passOn() ? anim.frames[pass] : null; // a single NISAR pass: its date, and grey for an HH-only pass
        blocks.push(`<div class="lt">${pf ? u.lg.nisarPass(passDate(pf.date, true)) : kk === "nisar" ? lg.nisarL : kk === "alos" ? lg.alos(L_.alos.y) : lg.s1rgb}</div>` +
          (pf && !pf.hv ? sw("linear-gradient(90deg,#000,#fff)", u.lg.passHH) : RADAR_LEGEND[kk].map(([lab, co, cx]) => sw(`rgb(${radarRgb(kk, co, cx).join(",")})`, u.lg[lab])).join("")) +
          (pf ? `<div class="lrow">${u.lg.passNote}</div>` : ""));
      }
    }
    if (L_.forest.on) hexBlock("forest", u.lg.forest); // the view's subject before the built-up background
    if (L_.built.on) hexBlock("built", u.lg.built);
    if (L_.price.on) blocks.push(`<div class="lt">${u.lg.price(clamp(state.year, 2010, 2025))}</div>${ramp_(RAMPS.price, "3 500 zł", "12 500 zł")}`);
    if (sar && sar.zips) {
      const z = sar.zips, lz = u.lg;
      if (L_.nisarcoh.on && z.coh) blocks.push(`<div class="lt">${lz.nisarcoh}</div>${ramp_(RAMPS.coh, lz.cohLow, lz.cohHigh)}<div class="lrow">${lz.cohNote(z.coh.pairs.length)}</div>`);
      if (L_.nisarsm.on && z.sme) blocks.push(`<div class="lt">${lz.nisarsm(L_.nisarsm.d === "0625" ? "25.06" : "24.08")}</div>${ramp_(RAMPS.wet, "0,10", "0,40 m³/m³")}<div class="lrow">${lz.smNote}</div>`);
      if (L_.dist.on && z.dist) hexBlock("dist", lz.dist, `<div class="lrow lnote">${lz.distNote}</div>`);
    }
    if (L_.flood.on) hexBlock("flood", u.lg.flood, `<div class="lrow lnote">${u.lg.floodNote}</div>`);
    if (L_.wuia.on) blocks.push(`<div class="lt">${u.L.wuia}</div>` + [["#E5602A", u.lg.wuiaNew], ["#7357E8", u.lg.wuiaExt], ["#F2A31B", u.lg.wuiaOther]].map(([c, t]) => `<div class="lrow"><span class="sw" style="background:${c}"></span>${t}</div>`).join(""));
    if (L_.activity.on) blocks.push(`<div class="lt">${u.lg.activity}</div><div class="lrow"><span class="sw" style="background:${css("--c-terrain")}"></span>${u.lg.brighter}</div><div class="lrow"><span class="sw" style="background:#7A6FB0"></span>${u.lg.darker}</div>`);
    if (L_.dem.on) blocks.push(`<div class="lt">${u.lg.dem}</div>${ramp_(RAMPS.terrain, `${L_.dem.lo} m`, `${L_.dem.hi} m`)}`);
    if (L_.radar.on) blocks.push(`<div class="lt">${u.lg.radar(s1Year())}</div>${ramp_(RAMPS.radar, `${L_.radar.lo} dB`, `${L_.radar.hi} dB`)}`);
    if (L_.nisar.on) blocks.push(`<div class="lt">${u.lg.nisar(NISAR_DATES[L_.nisar.i] || "")}</div><div class="lrow">${u.lg.nisarNote}</div>`);
    ["night", "day", "ndvi"].forEach((k) => { if (L_[k].on) { const P = PIXEL[k]; blocks.push(`<div class="lt">${u.L[k]}</div>${ramp_([...P.neg].reverse().concat([css("--ns")], P.pos), sgn(-P.max, P.max < 1 ? 2 : 1), sgn(P.max, P.max < 1 ? 2 : 1))}<div class="lrow"><span class="sw" style="background:${css("--ns")}"></span>${T().notSig}</div>`); } });
    if (L_.nightyear.on) blocks.push(`<div class="lt">${u.lg.nightyear(heatYear())}</div>${ramp_(RAMPS.heat, "10 °C", "20 °C")}`);
    if (L_.score && L_.score.on) hexBlock("score", u.lgScore, u.lgScoreNote ? `<div class="lrow lnote">${u.lgScoreNote}</div>` : "");
    // the hexagon size once, under the last hexagon block (it changes with the zoom)
    if (lastHex >= 0) blocks[lastHex] += `<div class="lrow lnote">${esc(u.hex.size(hexSizeFor(hexZoom())))}</div>`;
    const boot = BOOT[lang] || BOOT.pl;
    layerFailed.forEach((k) => { if (state.lyr[k] && state.lyr[k].on) blocks.push(`<div class="lt">${u.L[k] || k}</div><div class="lrow">${boot.layerFail}</div><button type="button" class="linkish" data-retry-layer="${k}">${boot.retry}</button>`); });
    $("#legend").innerHTML = blocks.map((b) => `<div class="lblock">${b}</div>`).join("");
    $("#legend").querySelectorAll("[data-retry-layer]").forEach((b) => b.addEventListener("click", () => ensure(b.dataset.retryLayer).then(redraw)));
    // the side card above it shrinks so the legend is never covered
    document.documentElement.style.setProperty("--legend-h", `${blocks.length ? $("#legend").offsetHeight + 8 : 0}px`);
  }

