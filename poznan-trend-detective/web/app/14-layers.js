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
    if (k === "built") {
      // Smooth time: blend the two surrounding 5-year epochs, so dragging or playing the timeline flows year by year.
      const yf = clamp(state.yearF, land.epochs[0], horizonEnd());
      // The optical map (GHSL) ends in 2020; built_2025 on are the model's projections, not measurements. With the radar
      // layer the base stops at 2020 and radar adds what it saw built after it (below). Without it the base still blends
      // 2020 -> projected 2025, capped there so it never pre-draws the 2030 projection.
      const fy = radarFirst(), yBase = Math.min(yf, fy ? LAST_OBS() : 2025);
      const { e0, e1, t } = epochPair(yBase);
      const a0 = smoothed(e0), a1 = smoothed(e1), lut = lutFor(RAMPS.built);
      const thr = THR(), b25 = L8.built_2025;
      for (let i = 0; i < n; i++) {
        if (!st[i]) continue;
        const v = a0[i] + (a1[i] - a0[i]) * t;
        if (v < 0.04) continue;
        const k = (Math.sqrt(v) * 255) | 0, q = i * 4, a = 60 + v * 520;
        px[q] = lut[k * 3]; px[q + 1] = lut[k * 3 + 1]; px[q + 2] = lut[k * 3 + 2]; px[q + 3] = a > 235 ? 235 : a;
      }
      if (fy && yf > LAST_OBS()) { // new building radar saw from 2021 to the timeline year; that year's cells fade in
        const rc = hexRgb(css("--pred-recent") || "#8B5CF6"), yr = Math.min(yf, NOW_YEAR), y0 = LAST_OBS() - 2000;
        for (let i = 0; i < n; i++) {
          if (!st[i] || fy[i] <= y0) continue;
          const f = clamp(yr - (2000 + fy[i]) + 1, 0, 1);
          if (f > 0) put(i, rc, Math.round(235 * f));
        }
      }
      if (yf > NOW_YEAR) { // projected new building (filtered by the model's chance) fades in after 2026
        const predColor = hexRgb(css("--pred") || "#C084FC");
        const P25 = projSmoothed(2025), P30 = projSmoothed(2030);
        const P35 = horizonEnd() > 2030 ? projSmoothed(2035) : P30;
        const tp30 = clamp((yf - NOW_YEAR) / (2030 - NOW_YEAR), 0, 1);
        const tp35 = yf > 2030 ? clamp((yf - 2030) / 5, 0, 1) : 0;
        const ff = L8.forest2000_frac, w = land.width, [trA, , trC, , trE, trF] = land.transform3857;
        for (let i = 0; i < n; i++) {
          if (!st[i]) continue;
          // Established existing buildings (b25 >= thr) are never changed or overwritten!
          // Only newly converted open land shows the distinct prediction color.
          if (b25[i] >= thr || (fy && fy[i] >= 15)) continue; // nor cells radar already sees built (15 = by 2015)

          // Respect protected natural zones & water (don't project concrete into parks or floodplains):
          if (ff && ff[i] > 90) continue; // protected dense forest and parkland
          if (L8.sar_water && waterOf(L8.sar_water[i]) > 0.25) continue; // lakes and rivers
          const [la, lo] = mercToLatLng(trC + ((i % w) + 0.5) * trA, trF + (Math.floor(i / w) + 0.5) * trE);
          if (inFlood(la, lo)) continue; // river floodplains (water law restriction)

          const diff30 = Math.max(0, P30[i] - P25[i]);
          const diff35 = Math.max(0, P35[i] - P30[i]);
          const v = diff30 * tp30 + diff35 * tp35;
          if (v > 0.05) {
            const q = i * 4;
            px[q] = predColor[0]; px[q + 1] = predColor[1]; px[q + 2] = predColor[2];
            px[q + 3] = Math.round(clamp(110 + v * 220, 0, 240));
          }
        }
      }
    } else if (k === "forest") {
      const loss = L8.forest_loss, lf = L8.loss_frac, ff = L8.forest2000_frac, green = hexRgb(css("--c-forest"));
      const upTo = Math.min(state.year, 2024);
      for (let i = 0; i < n; i++) {
        if (!st[i]) continue;
        const y = loss[i] ? 2000 + loss[i] : 0;
        if (y && y <= upTo && lf[i] > 0) { const k = (((y - 2001) / 23) * 255) | 0, L = lutFor(RAMPS.loss); put(i, [L[k * 3], L[k * 3 + 1], L[k * 3 + 2]], Math.min(240, 110 + (lf[i] / 255) * 400)); }
        else if (ff[i] > 60) put(i, green, Math.round((ff[i] / 255) * 90));
      }
    } else if (k === "activity") {
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
    } else if (k === "sarchange") {
      const a = L8.sar_change, r = L8.sar_dratio, wall = lutFor(RAMPS.up), soft = lutFor(RAMPS.upSoft), dn = lutFor(RAMPS.down), wd = sar.s1.wall_db || 1.5;
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const d = changeOf(a[i]);
        if (Math.abs(d) < s.min) continue;
        const isWall = d > 0 && r[i] && changeOf(r[i]) >= wd;
        const t = clamp((Math.abs(d) - s.min) / 6, 0, 1), L = d < 0 ? dn : isWall ? wall : soft, j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], (isWall ? 190 : 130) + t * 60);
      }
    } else if (k === "nisarwet") {
      // NISAR HH, wet pass (24 Aug) minus dry pass (25 Jun), open land only
      const a = L8.nisar_wetdry, wet = lutFor(RAMPS.wet), dry = lutFor(RAMPS.brown);
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const d = changeOf(a[i]);
        if (Math.abs(d) < s.min) continue;
        const t = clamp((Math.abs(d) - s.min) / 6, 0, 1), L = d > 0 ? wet : dry, j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], 140 + t * 100);
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
    } else if (k === "dist") {
      // OPERA vegetation disturbance from Sentinel-1, Jan-Feb 2026, on land that was forest in 2000
      const a = L8.dist_forest, hi = hexRgb(RAMPS.dist[1]), lo = hexRgb(RAMPS.dist[0]);
      for (let i = 0; i < n; i++) if (st[i] && a[i]) put(i, a[i] >= 150 ? hi : lo, a[i] >= 150 ? 235 : 190);
    } else if (k === "sarwet") {
      const a = L8.sar_wet, rc = sar.s1.r_crit, L = lutFor(RAMPS.wet);
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const r = wetOf(a[i]);
        if (r < rc) continue;
        const t = clamp((r - rc) / (0.85 - rc), 0, 1), j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], 120 + t * 120);
      }
    } else if (k === "sarwater") {
      const a = L8.sar_water, L = lutFor(RAMPS.water), m = s.min / 100;
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const w = waterOf(a[i]);
        if (w < m) continue;
        const t = clamp((w - m) / Math.max(0.05, 1 - m), 0, 1), j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], 140 + t * 110);
      }
    } else if (k === "egms") {
      const a = L8.sar_egms, sub = lutFor(RAMPS.sink), upl = lutFor(RAMPS.cool);
      for (let i = 0; i < n; i++) {
        if (!st[i] || !a[i]) continue;
        const v = egmsOf(a[i]);
        if (Math.abs(v) < s.min) continue;
        const t = clamp((Math.abs(v) - s.min) / 8, 0, 1), L = v < 0 ? sub : upl, j = ((t * 255) | 0) * 3;
        put(i, [L[j], L[j + 1], L[j + 2]], 170 + t * 80);
      }
    } else if (k === "score") {
      const p30 = L8.prob_2030, ff = L8.forest2000_frac, lf = L8.loss_frac, b25 = L8.built_2025;
      const eg = L8.sar_egms, sc = L8.sar_change, wat = L8.sar_water, d = L8.dem, lut = lutFor(RAMPS.score);
      const w = land.width, [trA, , trC, , trE, trF] = land.transform3857;
      const demOff = land.dem_offset || 45;

      for (let i = 0; i < n; i++) {
        if (!st[i]) continue;
        // Water bodies (rivers, lakes, reservoirs):
        // Leave transparent so the natural blue river/water shows without any orange or green overlay!
        const wFrac = wat && wat[i] ? waterOf(wat[i]) : 0;
        if (wFrac >= 0.08) continue;

        // Base score for standard, solid habitable land in the agglomeration:
        // A typical normal plot starts at a balanced neutral 70 ("Standardowa w normie")
        let s = 70;

        const treeFrac = ff && ff[i] ? Math.max(0, ff[i] - (lf ? lf[i] : 0)) / 255 : 0;
        const built = b25 ? b25[i] : 0;
        const elev = d && d[i] ? d[i] / 2 + demOff : 70;

        // 1. Greenery balance:
        // Optimal tree canopy in the neighbourhood (Sołacz, Strzeszyn, Puszczykowo) gives fresh green (+8 to +14)
        if (treeFrac >= 0.20 && treeFrac <= 0.65) {
          s += Math.round(treeFrac * 22);
        } else if (treeFrac > 0.65) {
          s += 5; // dense continuous forest: safe nature (+5)
        } else if (built > 110 && treeFrac < 0.04) {
          s -= 16; // heavily sealed urban core / heat island prone (-16 -> drops to warm yellow/amber)
        }

        // 2. River corridor & flood evaluation:
        // The river bed itself is skipped above.
        // On dry land: unpaved low-lying floodplain meadow (active water retention) gets a REAL hazard penalty (-38 -> drops to RED!)
        // Managed, elevated urban riverfront (Garbary, Chwaliszewo, Wildeckie tarasy) is safe and close to Wartostrada (+2).
        const [la, lo] = mercToLatLng(trC + ((i % w) + 0.5) * trA, trF + (Math.floor(i / w) + 0.5) * trE);
        if (inFlood(la, lo)) {
          if (elev < 55 && built < 20) {
            s -= 38; // real low-lying floodplain meadow -> RED (score 32)
          } else if (built >= 20 || elev >= 56) {
            s += 2; // managed, elevated riverside urban fabric -> neutral/safe 72
          } else {
            s -= 16; // borderline terrace -> 54 (amber)
          }
        }

        // 3. Geotechnical stability (InSAR / EGMS vertical motion) - radar differentiator!
        if (eg && eg[i]) {
          const v = egmsOf(eg[i]);
          if (v <= -2.5) s -= Math.min(42, Math.round(Math.abs(v) * 12)); // ground sinking > 2.5 mm/yr -> RED!
          else if (v <= -1.2) s -= 18; // moderate settlement -> AMBER/WARN
          else if (v >= -0.5 && v <= 0.8) s += 3; // solid stable bedrock (+3)
        }

        // 4. Active construction disturbance (SAR 2026 walls)
        if (sc && sc[i]) {
          const ch = changeOf(sc[i]);
          if (ch >= 3.5) s -= 16;
          else if (ch >= 2.0) s -= 8;
        }

        // 5. Tree loss / deforestation
        if (lf && lf[i] > 80) {
          s -= 18;
        }

        // 6. Development pressure (AI forecast on open fields)
        if (p30 && p30[i] > 40 && built < 20) {
          s -= Math.round((p30[i] / 255) * 14);
        }

        s = clamp(s, 15, 95);
        const t = (s - 15) / 80, j = ((t * 255) | 0) * 3;
        // Adaptive opacity: neutral areas (65-75) are translucent (alpha ~85) so the satellite/street map is clearly visible;
        // extreme alerts (RED risks or high GREEN prime spots) stand out with higher opacity (alpha ~140-190).
        const dev = Math.abs(s - 70) / 35;
        const alpha = Math.round(clamp(85 + dev * 95, 80, 190));
        put(i, [lut[j], lut[j + 1], lut[j + 2]], alpha);
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
        if (on) { renderLand(k); const lyr = overlay(k).layer; if (!map.hasLayer(lyr)) lyr.addTo(map); lyr.setOpacity(state.lyr[k].op); }
        else if (overlays[k] && map.hasLayer(overlays[k].layer)) map.removeLayer(overlays[k].layer);
      });
      Object.keys(PIXEL).forEach((k) => {
        const pl = pixelLayers[k];
        // a heat or greenness layer switched on before its grid has arrived is drawn as soon as the grid lands
        if (state.lyr[k].on && !gridsOK()) loadGrids().then(redraw, (e) => console.error(e));
        if (state.lyr[k].on && gridsOK()) { if (!map.hasLayer(pl)) pl.addTo(map); else if (k === "nightyear") pl.repaint(); pl.setOpacity(state.lyr[k].op); }
        else if (map.hasLayer(pl)) map.removeLayer(pl);
      });
      if (state.lyr.flood.on) { floodLayer.setStyle({ fillOpacity: state.lyr.flood.op }); if (!map.hasLayer(floodLayer)) floodLayer.addTo(map); } else if (map.hasLayer(floodLayer)) map.removeLayer(floodLayer);
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

