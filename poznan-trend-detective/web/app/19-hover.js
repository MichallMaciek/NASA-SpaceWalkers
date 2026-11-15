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
    const lines = [], u = U(), c = land && landCell(lat, lng);
    if (sar && c && state.expert) { // radar pictures (raster): the value of the 120 m cell
      const Ly = state.lyr;
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
    }
    // rating and quantity layers: the values of the hexagon under the pointer (part 13a)
    lines.push(...hexHover(lat, lng));
    if (state.lyr.dem.on && ready("dem") && c) lines.push(`${num(L8.dem[c.i] / 2 + land.dem_offset, 0)} m ${u.asl}`);
    if (state.lyr.radar.on && ready("radar") && c) { const a = L8[`s1_${s1Year()}`][c.i]; if (a) lines.push(`${num(a / 6 - 30, 1)} dB (${s1Year()})`); }
    if (state.lyr.activity.on && ready("activity") && c) { const a = L8.s1_2017[c.i], b = L8.s1_2024[c.i]; if (a && b) lines.push(`${u.L.activity}: ${sgn((b - a) / 6, 1)} dB`); }
    ["night", "day", "ndvi", "nightyear"].forEach((k) => {
      if (!state.lyr[k].on || !gridsOK()) return;
      const P = PIXEL[k], g = P.grid === "N" ? gN : gL, i = cellAt(g, lat, lng);
      if (i < 0) return;
      const { v, p } = pixelValue(k, i);
      if (v == null) return;
      lines.push(P.seq ? `${num(v, 1)} °C (${heatYear()})` : `${u.L[k]}: ${sgn(v, P.d)} ${P.unit}/${u.dec}${p < 0.05 ? "" : ` (${T().place.notProven.toLowerCase()})`}`);
    });
    if (state.lyr.price.on) { const v = priceSeries(f.properties.role === "city" ? "Poznań (city)" : "Powiat poznański", "633677")[clamp(state.year, 2010, 2025)]; if (v) lines.push(`${fmtInt(v)} zł/m²`); }
    if (!lines.length) { tip.hidden = true; return; }
    tip.innerHTML = `<b>${esc(f.properties.name)}</b><br>${lines.join("<br>")}`;
    tip.hidden = false;
    const x = e.originalEvent.clientX, y = e.originalEvent.clientY;
    tip.style.left = `${Math.min(x + 14, innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${Math.min(y + 14, innerHeight - tip.offsetHeight - 8)}px`;
  }

