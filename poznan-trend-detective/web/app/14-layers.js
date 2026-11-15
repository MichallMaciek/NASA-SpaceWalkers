// SARnik core, part 14 of 32: data layers, part 2: renderLand, choropleth, redraw, ensure.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  function renderLand(k) {
    const hi = k === "alos" && passOn() ? null : hiresArrays(k);
    if (hi) return renderLandHi(k, hi);
    const o = overlay(k);
    if (!o.img) o.img = o.ctx.createImageData(land.width, land.height);
    const px = o.img.data, n = land.width * land.height, st = L8.study, s = state.lyr[k];
    if (o.canvas.width !== land.width) { o.canvas.width = land.width; o.canvas.height = land.height; }
    o.hiKey = null;
    px.fill(0);
    const put = (i, c, a) => { const q = i * 4; px[q] = c[0]; px[q + 1] = c[1]; px[q + 2] = c[2]; px[q + 3] = a; };
    if (k === "activity") {
      const a = L8.s1_2017, b = L8.s1_2024, up = hexRgb(css("--c-terrain")), down = hexRgb("#7A6FB0");
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i] || !b[i]) continue;
        const d = (b[i] - a[i]) / 6;
        if (Math.abs(d) < s.min) continue;
        put(i, d > 0 ? up : down, Math.round(clamp(120 + (Math.abs(d) - s.min) * 30, 0, 240)));
      }
    } else if (k === "dem") {
      const d = L8.dem, off = land.dem_offset;
      for (let i = 0; i < n; i++) {
        if (!st[i]) continue;
        const m = d[i] / 2 + off;
        if (m < s.lo || m > s.hi) continue;
        put(i, rampRgb(RAMPS.terrain, (m - s.lo) / Math.max(1, s.hi - s.lo)), 200);
      }
    } else if (k === "radar") {
      const a = L8[`s1_${s1Year()}`];
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const db = a[i] / 6 - 30;
        if (db < s.lo || db > s.hi) continue;
        put(i, rampRgb(RAMPS.radar, (db - s.lo) / Math.max(1, s.hi - s.lo)), 215);
      }
    } else if (k === "alos" && passOn()) { // one NISAR pass: the composite of the 2026 median, or grey HH when the pass has no HV
      const [c0, c1] = RGB_STRETCH.nisar;
      for (let i = 0; i < n; i++) {
        if (!st[i]) continue;
        const [a, b] = passAt(i), q = i * 4;
        if (!a || (anim.frames[pass].hv && !b)) continue;
        const c = b ? radarRgb("nisar", dbOf(a), dbOf(b)) : Array(3).fill(clamp(((dbOf(a) - c0) / (c1 - c0)) * 255, 0, 255) | 0);
        px[q] = c[0]; px[q + 1] = c[1]; px[q + 2] = c[2]; px[q + 3] = 235;
      }
    } else if (k === "s1rgb" || k === "alos") {
      // classic radar colour composite: R = co-pol (VV/HH), G = cross-pol (VH/HV), B = co/cross ratio
      const [hn, vn] = k === "alos" ? lbandNames(s.y) : ["sar_vv_med", "sar_vh_med"], co = L8[hn], cx = L8[vn];
      const sk = k === "alos" && s.y === 2026 ? "nisar" : k;
      for (let i = 0; i < n; i++) {
        if (!st[i] || !co[i] || !cx[i]) continue;
        const c = radarRgb(sk, dbOf(co[i]), dbOf(cx[i])), q = i * 4;
        px[q] = c[0]; px[q + 1] = c[1]; px[q + 2] = c[2]; px[q + 3] = 235;
      }
    } else if (k === "nisarcoh") {
      // NISAR coherence, median of the 12-day pairs: low = the surface changed between passes (fields, earthworks, water,
      // vegetation), high = it stayed the same (buildings, roads, bare hard ground)
      const a = L8.nisar_coh, L = lutFor(RAMPS.coh);
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const t = clamp((a[i] / 250 - 0.2) / 0.6, 0, 1), j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], 200);
      }
    } else if (k === "nisarsm") {
      // NISAR L3 soil moisture (provisional, not calibrated yet), m3/m3
      const a = L8[NEEDS.nisarsm()[0]], L = lutFor(RAMPS.wet);
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const t = clamp((a[i] / 500 - 0.1) / 0.3, 0, 1), j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], 120 + t * 110);
      }
    }
    o.ctx.putImageData(o.img, 0, 0);
  }

  function renderChoro() {
    const y = clamp(state.year, 2010, 2025);
    const pz = priceSeries("Poznań (city)", "633677"), pp = priceSeries("Powiat poznański", "633677");
    choroLayer.setStyle((f) => {
      const v = (f.properties.role === "city" ? pz : pp)[y];
      return { stroke: false, fillOpacity: state.lyr.price.op, fillColor: v ? ramp(RAMPS.price, (v - 3500) / 9000) : css("--ns") };
    });
  }

  let queued = false;
  function redraw() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      LAND_KEYS.forEach((k) => {
        const on = state.lyr[k].on && ready(k);
        if (on) { renderLand(k); const lyr = overlay(k).layer; if (!map.hasLayer(lyr)) lyr.addTo(map); lyr.setOpacity(state.lyr[k].op); lyr.sharpen(); }
        else if (overlays[k] && map.hasLayer(overlays[k].layer)) map.removeLayer(overlays[k].layer);
      });
      Object.keys(PIXEL).forEach((k) => {
        const pl = pixelLayers[k];
        // a heat or greenness layer switched on before its grid has arrived is drawn as soon as the grid lands
        if (state.lyr[k].on && !gridsOK()) loadGrids().then(redraw, (e) => console.error(e));
        if (state.lyr[k].on && gridsOK()) { if (!map.hasLayer(pl)) pl.addTo(map); else if (k === "nightyear") pl.repaint(); pl.setOpacity(state.lyr[k].op); }
        else if (map.hasLayer(pl)) map.removeLayer(pl);
      });
      hexSync(); // rating and quantity layers, flood areas included: hexagons (part 13a)
      if (state.lyr.price.on) { renderChoro(); if (!map.hasLayer(choroLayer)) choroLayer.addTo(map); } else if (map.hasLayer(choroLayer)) map.removeLayer(choroLayer);
      if (state.lyr.nisar.on && NISAR_DATES.length) {
        const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/NISAR_L2_Geocoded_Polarimetric_Covariance/default/${NISAR_DATES[state.lyr.nisar.i]}/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`;
        const fresh = nisarLayer._url !== url; // GIBS sends no-store: redrawing re-downloads every tile
        if (fresh) nisarLayer.setUrl(url, true);
        nisarLayer.setOpacity(state.lyr.nisar.op);
        if (!map.hasLayer(nisarLayer)) nisarLayer.addTo(map); else if (fresh) nisarLayer.redraw();
      } else if (map.hasLayer(nisarLayer)) map.removeLayer(nisarLayer);
      if (state.lyr.wuia.on && !wuiaLayer) loadWuia();
      if (wuiaLayer) {
        if (state.lyr.wuia.on) { wuiaLayer.setStyle({ fillOpacity: state.lyr.wuia.op }); if (!map.hasLayer(wuiaLayer)) wuiaLayer.addTo(map); }
        else if (map.hasLayer(wuiaLayer)) map.removeLayer(wuiaLayer);
      }
      renderLegend();
    });
  }
  // Layers that are switched on but whose data did not arrive (after the quiet retries). The map then shows nothing for
  // them, so the legend says so and offers another try instead of describing colours that are not there (renderLegend).
  const layerFailed = new Set();
  async function ensure(k) {
    if (k === "built") loadRadarYears(); // small, never rejects; the map is redrawn when it lands
    if (PIXEL[k]) { // heat and greenness layers are drawn from the MODIS grids
      if (gridsOK()) return;
      $("#map").style.cursor = "progress";
      layerFailed.delete(k);
      try { await loadGrids(); } catch (e) { console.error(e); layerFailed.add(k); }
      $("#map").style.cursor = "";
      return;
    }
    if (!NEEDS[k] || ready(k)) return;
    $("#map").style.cursor = "progress";
    layerFailed.delete(k);
    try { await Promise.all(NEEDS[k]().map(loadGray)); } catch (e) { console.error(e); layerFailed.add(k); }
    $("#map").style.cursor = "";
  }

