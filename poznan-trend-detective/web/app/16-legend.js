// SARnik core, part 16 of 32: legend.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= legend ================= */
  function renderLegend() {
    const u = U(), blocks = [];
    const ramp_ = (stops, lo, hi) => `<div class="ramp" style="background:${gradient(stops)}"></div><div class="ticks"><span>${lo}</span><span>${hi}</span></div>`;
    // a layer that failed to load is left out of the colour keys below and gets its own block at the end
    const L_ = layerFailed.size ? Object.fromEntries(Object.entries(state.lyr).map(([k, v]) => [k, layerFailed.has(k) ? { ...v, on: false } : v])) : state.lyr;
    if (sar) {
      const lg = state.expert ? u.lg : { ...u.lg, ...u.lgPlain };
      const sw = (c, t) => `<div class="lrow"><span class="sw" style="background:${c}"></span>${t}</div>`;
      if (L_.sarchange.on) blocks.push(`<div class="lt">${lg.sarchange}</div>${sw(RAMPS.up[1], lg.wallsNow)}${sw(RAMPS.upSoft[2], lg.brighterNow)}${sw(RAMPS.down[2], lg.darkerNow)}`);
      if (L_.nisarwet.on && sar.nisar) blocks.push(`<div class="lt">${lg.nisarwet}</div>${sw(RAMPS.wet[2], lg.wetter)}${sw(RAMPS.brown[2], lg.drier)}`);
      if (L_.sarwet.on) blocks.push(`<div class="lt">${lg.sarwet}</div>${ramp_(RAMPS.wet, lg.weak, lg.strong)}`);
      if (L_.sarwater.on) blocks.push(`<div class="lt">${lg.sarwater}</div>${ramp_(RAMPS.water, `${L_.sarwater.min}%`, "100%")}`);
      if (L_.egms.on) blocks.push(`<div class="lt">${lg.egms}</div>${sw(RAMPS.sink[2], lg.sinks)}${sw(RAMPS.cool[2], lg.rises)}`);
      if (L_.s1rgb.on || L_.alos.on) {
        const kk = L_.alos.on && !L_.s1rgb.on ? (L_.alos.y === 2026 ? "nisar" : "alos") : "s1rgb";
        const pf = L_.alos.on && passOn() ? anim.frames[pass] : null; // a single NISAR pass: its date, and grey for an HH-only pass
        blocks.push(`<div class="lt">${pf ? u.lg.nisarPass(passDate(pf.date, true)) : kk === "nisar" ? lg.nisarL : kk === "alos" ? lg.alos(L_.alos.y) : lg.s1rgb}</div>` +
          (pf && !pf.hv ? sw("linear-gradient(90deg,#000,#fff)", u.lg.passHH) : RADAR_LEGEND[kk].map(([lab, co, cx]) => sw(`rgb(${radarRgb(kk, co, cx).join(",")})`, u.lg[lab])).join("")) +
          (pf ? `<div class="lrow">${u.lg.passNote}</div>` : ""));
      }
    }
    if (L_.built.on) blocks.push(`<div class="lt">${u.lg.built}</div>${ramp_(RAMPS.built, u.lg.low, u.lg.high)}${radarFirst() && state.year > LAST_OBS() ? `<div class="lrow"><span class="sw" style="background:${css("--c-radar")}"></span>${u.lg.radarNew(LAST_OBS() + 1, Math.min(state.year, rlLast))}</div>` : ""}${state.lens === "history" && isFuture() ? `<div class="lrow"><span class="sw" style="background:${css("--pred")}"></span>${u.lg.projected}</div>` : ""}`);
    if (L_.forest.on) blocks.push(`<div class="lt">${u.lg.forest}</div>${ramp_(RAMPS.loss, "2001", String(Math.min(state.year, 2024)))}<div class="lrow"><span class="sw" style="background:${css("--c-forest")};opacity:.5"></span>${u.lg.forestLeft}</div>`);
    if (L_.price.on) blocks.push(`<div class="lt">${u.lg.price(clamp(state.year, 2010, 2025))}</div>${ramp_(RAMPS.price, "3 500 zł", "12 500 zł")}`);
    if (sar && sar.zips) {
      const z = sar.zips, lz = u.lg;
      if (L_.nisarcoh.on && z.coh) blocks.push(`<div class="lt">${lz.nisarcoh}</div>${ramp_(RAMPS.coh, lz.cohLow, lz.cohHigh)}<div class="lrow">${lz.cohNote(z.coh.pairs.length)}</div>`);
      if (L_.nisarsm.on && z.sme) blocks.push(`<div class="lt">${lz.nisarsm(L_.nisarsm.d === "0625" ? "25.06" : "24.08")}</div>${ramp_(RAMPS.wet, "0,10", "0,40 m³/m³")}<div class="lrow">${lz.smNote}</div>`);
      if (L_.dist.on && z.dist) blocks.push(`<div class="lt">${lz.dist}</div><div class="lrow"><span class="sw" style="background:${RAMPS.dist[1]}"></span>${lz.distHi}</div><div class="lrow"><span class="sw" style="background:${RAMPS.dist[0]}"></span>${lz.distLo}</div><div class="lrow">${lz.distNote}</div>`);
    }
    if (L_.flood.on) blocks.push(`<div class="lt">${u.lg.flood}</div><div class="lrow"><span class="sw" style="background:#3B8FE0"></span>${u.lg.floodNote}</div>`);
    if (L_.wuia.on) blocks.push(`<div class="lt">${u.L.wuia}</div>` + [["#E5602A", u.lg.wuiaNew], ["#7357E8", u.lg.wuiaExt], ["#F2A31B", u.lg.wuiaOther]].map(([c, t]) => `<div class="lrow"><span class="sw" style="background:${c}"></span>${t}</div>`).join(""));
    if (L_.activity.on) blocks.push(`<div class="lt">${u.lg.activity}</div><div class="lrow"><span class="sw" style="background:${css("--c-terrain")}"></span>${u.lg.brighter}</div><div class="lrow"><span class="sw" style="background:#7A6FB0"></span>${u.lg.darker}</div>`);
    if (L_.dem.on) blocks.push(`<div class="lt">${u.lg.dem}</div>${ramp_(RAMPS.terrain, `${L_.dem.lo} m`, `${L_.dem.hi} m`)}`);
    if (L_.radar.on) blocks.push(`<div class="lt">${u.lg.radar(s1Year())}</div>${ramp_(RAMPS.radar, `${L_.radar.lo} dB`, `${L_.radar.hi} dB`)}`);
    if (L_.nisar.on) blocks.push(`<div class="lt">${u.lg.nisar(NISAR_DATES[L_.nisar.i] || "")}</div><div class="lrow">${u.lg.nisarNote}</div>`);
    ["night", "day", "ndvi"].forEach((k) => { if (L_[k].on) { const P = PIXEL[k]; blocks.push(`<div class="lt">${u.L[k]}</div>${ramp_([...P.neg].reverse().concat([css("--ns")], P.pos), sgn(-P.max, P.max < 1 ? 2 : 1), sgn(P.max, P.max < 1 ? 2 : 1))}<div class="lrow"><span class="sw" style="background:${css("--ns")}"></span>${T().notSig}</div>`); } });
    if (L_.nightyear.on) blocks.push(`<div class="lt">${u.lg.nightyear(heatYear())}</div>${ramp_(RAMPS.heat, "10 °C", "20 °C")}`);
    if (L_.score && L_.score.on) blocks.push(`<div class="lt">${u.lgScore || "Ocena działki"}</div>${ramp_(RAMPS.score, u.lgScoreRisk || "Ryzyko", u.lgScoreGood || "Zalety")}${u.lgScoreNote ? `<div class="lrow">${u.lgScoreNote}</div>` : ""}`);
    const boot = BOOT[lang] || BOOT.pl;
    layerFailed.forEach((k) => { if (state.lyr[k] && state.lyr[k].on) blocks.push(`<div class="lt">${u.L[k] || k}</div><div class="lrow">${boot.layerFail}</div><button type="button" class="linkish" data-retry-layer="${k}">${boot.retry}</button>`); });
    $("#legend").innerHTML = blocks.map((b) => `<div class="lblock">${b}</div>`).join("");
    $("#legend").hidden = !blocks.length; // no layer on: no legend
    $("#legend").querySelectorAll("[data-retry-layer]").forEach((b) => b.addEventListener("click", () => ensure(b.dataset.retryLayer).then(redraw)));
    // the side card above it shrinks so the legend is never covered
    document.documentElement.style.setProperty("--legend-h", `${blocks.length ? $("#legend").offsetHeight + 8 : 0}px`);
  }

