// SARnik core, part 19 of 32: hover tooltip.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= hover ================= */
  function onHover(e) {
    const tip = $("#hovertip");
    if (draw.mode || matchMedia("(hover: none)").matches) { tip.hidden = true; return; }
    const { lat, lng } = e.latlng, f = areaAt(lat, lng);
    if (!f) { tip.hidden = true; return; }
    // hexagon mode: those layers say what their hexagon holds (part 13a) instead of the value of one 120 m cell
    const LY = state.hex ? Object.fromEntries(Object.entries(state.lyr).map(([k, v]) => [k, HEX_KEYS.includes(k) ? { ...v, on: false } : v])) : state.lyr;
    const lines = [...hexHover(lat, lng)], u = U(), c = land && landCell(lat, lng);
    const plot = parcelTipLine(lat, lng); // the highlighted plot (21a-parcels.js)
    if (plot) lines.push(plot);
    if (sar && c && !state.expert) {
      const Ly = LY, h = u.hov;
      if (Ly.sarchange.on && ready("sarchange") && L8.sar_change[c.i]) {
        const d = changeOf(L8.sar_change[c.i]), r = L8.sar_dratio[c.i] ? changeOf(L8.sar_dratio[c.i]) : 0;
        lines.push(d >= Ly.sarchange.min ? (r >= (sar.s1.wall_db || 1.5) ? h.walls : h.brighter) : d <= -Ly.sarchange.min ? h.darker : h.noChange);
      }
      if (Ly.nisarwet.on && ready("nisarwet") && L8.nisar_wetdry[c.i]) { const d = changeOf(L8.nisar_wetdry[c.i]); lines.push(d >= 2 ? h.soaks : d <= -2 ? h.dries : h.steady); }
      if (Ly.egms.on && ready("egms")) { const v = L8.sar_egms[c.i] ? egmsOf(L8.sar_egms[c.i]) : null; lines.push(v == null ? h.noPoints : v <= -2 ? h.sinks(num(-v, 0)) : v >= 2 ? h.rises(num(v, 0)) : h.stable); }
    } else if (sar && c) {
      const Ly = LY;
      if ((Ly.s1rgb.on && ready("s1rgb")) || (Ly.alos.on && ready("alos"))) {
        const [hn, vn] = lbandNames(Ly.alos.y);
        const [a, b, tag] = Ly.s1rgb.on ? [L8.sar_vv_med[c.i], L8.sar_vh_med[c.i], "VV/VH"] : passOn() ? [...passAt(c.i), "HH/HV"] : [L8[hn][c.i], L8[vn][c.i], "HH/HV"];
        if (a && b) {
          const vv = dbOf(a);
          // the class bounds are C-band VV values; for L-band HH/HV show the dB value only (forest is as bright as buildings there)
          const type = tag === "HH/HV" ? null : vv > -6.5 ? (lang === "pl" ? "Teren zabudowany" : "Built-up")
                     : vv > -11 ? (lang === "pl" ? "Roślinność / otwarty teren" : "Vegetation / open land")
                     : (lang === "pl" ? "Woda / gładka nawierzchnia" : "Water / smooth surface");
          lines.push(type ? `${tag}: ${type} (${num(vv, 1)} dB)` : `${tag}: ${num(vv, 1)} dB`);
        }
      }
      if (Ly.sarchange.on && ready("sarchange") && L8.sar_change[c.i]) {
        const ch = changeOf(L8.sar_change[c.i]), r = L8.sar_dratio[c.i] ? changeOf(L8.sar_dratio[c.i]) : 0, h = u.hov; // same words and wall rule as the plain mode
        const chT = ch >= Ly.sarchange.min ? (r >= (sar.s1.wall_db || 1.5) ? h.walls : h.brighter) : ch <= -Ly.sarchange.min ? h.darker : h.noChange;
        lines.push(`${chT} (${sgn(ch, 1)} dB)`);
      }
      if (Ly.nisarwet.on && ready("nisarwet") && L8.nisar_wetdry[c.i]) {
        const nw = changeOf(L8.nisar_wetdry[c.i]), h = u.hov;
        lines.push(`${nw >= 2 ? h.soaks : nw <= -2 ? h.dries : h.steady} (${sgn(nw, 1)} dB)`);
      }
      if (Ly.sarwet.on && ready("sarwet") && L8.sar_wet[c.i]) lines.push(`${u.L.sarwet}: r = ${num(wetOf(L8.sar_wet[c.i]), 2)}`);
      if (Ly.sarwater.on && ready("sarwater") && L8.sar_water[c.i]) lines.push(`${u.L.sarwater}: ${num(waterOf(L8.sar_water[c.i]) * 100, 0)}%`);
      if (Ly.egms.on && ready("egms")) {
        if (L8.sar_egms[c.i]) {
          const eg = egmsOf(L8.sar_egms[c.i]);
          const egT = eg <= -3 ? (lang === "pl" ? "Osiadanie terenu" : "Subsidence")
                    : eg >= 3 ? (lang === "pl" ? "Wypiętrzanie" : "Uplift")
                    : (lang === "pl" ? "Grunt stabilny" : "Stable");
          lines.push(`${u.L.egms}: ${egT} (${sgn(eg, 0)} mm/${u.yr})`);
        } else {
          lines.push(`${u.L.egms}: ${u.noPoints}`);
        }
      }
    }
    if (LY.built.on && ready("built") && c) {
      // after the optical map (2020) and up to today, with the radar layer: the 2020 value, not a blend toward the model's 2025
      const fy = radarFirst(), rad = fy && state.year > LAST_OBS() && state.year <= NOW_YEAR;
      const { e0, e1, t } = epochPair(rad ? LAST_OBS() : state.year), a = L8[`built_${e0}`][c.i], b = L8[`built_${e1}`][c.i];
      const v = (a + (b - a) * t) / 255;
      lines.push(`${u.L.built}: ${num(v * 100, 0)}%`);
      if (rad && fy[c.i] > LAST_OBS() - 2000 && fy[c.i] <= state.year - 2000) lines.push(u.lg.radarNew(2000 + fy[c.i], 2000 + fy[c.i]));
    }
    if (LY.forest.on && ready("forest") && c) {
      const y = L8.forest_loss[c.i];
      if (y && L8.loss_frac[c.i]) lines.push(`${u.lossYear}: ${2000 + y}`);
    }
    if (LY.dem.on && ready("dem") && c) lines.push(`${num(L8.dem[c.i] / 2 + land.dem_offset, 0)} m ${u.asl}`);
    if (LY.radar.on && ready("radar") && c) { const a = L8[`s1_${s1Year()}`][c.i]; if (a) lines.push(`${num(a / 6 - 30, 1)} dB (${s1Year()})`); }
    if (LY.activity.on && ready("activity") && c) { const a = L8.s1_2017[c.i], b = L8.s1_2024[c.i]; if (a && b) lines.push(`${u.L.activity}: ${sgn((b - a) / 6, 1)} dB`); }
    ["night", "day", "ndvi", "nightyear"].forEach((k) => {
      if (!LY[k].on || !gridsOK()) return;
      const P = PIXEL[k], g = P.grid === "N" ? gN : gL, i = cellAt(g, lat, lng);
      if (i < 0) return;
      const { v, p } = pixelValue(k, i);
      if (v == null) return;
      lines.push(P.seq ? `${num(v, 1)} °C (${heatYear()})` : `${u.L[k]}: ${sgn(v, P.d)} ${P.unit}/${u.dec}${p < 0.05 ? "" : ` (${T().place.notProven.toLowerCase()})`}`);
    });
    if (LY.flood.on && inFlood(lat, lng)) lines.push(u.lg.flood);
    if (LY.price.on) { const v = priceSeries(f.properties.role === "city" ? "Poznań (city)" : "Powiat poznański", "633677")[clamp(state.year, 2010, 2025)]; if (v) lines.push(`${fmtInt(v)} zł/m²`); }
    if (!lines.length) { tip.hidden = true; return; }
    tip.innerHTML = `<b>${esc(f.properties.name)}</b><br>${lines.join("<br>")}`;
    tip.hidden = false;
    const x = e.originalEvent.clientX, y = e.originalEvent.clientY;
    tip.style.left = `${Math.min(x + 14, innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${Math.min(y + 14, innerHeight - tip.offsetHeight - 8)}px`;
  }

