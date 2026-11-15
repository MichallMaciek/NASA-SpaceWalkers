// SARnik core, part 21 of 32: selection: clear, cells in a ring, select a point or an area.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= selection: a plot (21a-parcels.js), a circle around a point, or a drawn area ================= */
  const CIRCLE_KM = [0.25, 0.5, 1, 2, 3]; // radii of the circle tool; a link or a click without one gets 1 km
  const PLACE_LAYERS = () => [...builtNames(), "prob_2025", "prob_2030", "prob_2035", "study", "forest_loss", "forest2000_frac", "loss_frac",
    "loss_cum_2005", "loss_cum_2010", "loss_cum_2015", "loss_cum_2020", "dem", "s1_2017", "s1_2024", ...SAR_PLACE()];
  function clearSelection() {
    if (state.sel && state.sel.label && $("#q").value === state.sel.label) $("#q").value = ""; // the search box no longer names a place that is not selected
    const had = !!state.sel;
    state.sel = null;
    selLayer.clearLayers();
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
    $("#tool-clear").disabled = true;
    renderCard();
    if (had) $("#sidecard").scrollTop = findingsTop;
  }
  function cellsInRing(ringLatLng) {
    let a0 = 90, a1 = -90, o0 = 180, o1 = -180;
    ringLatLng.forEach(([la, lo]) => { a0 = Math.min(a0, la); a1 = Math.max(a1, la); o0 = Math.min(o0, lo); o1 = Math.max(o1, lo); });
    const ring = ringLatLng.map(([la, lo]) => [lo, la]);
    const [a, , c, , e, f] = land.transform3857;
    const [x0, y1] = latLngToMerc(a1, o0), [x1, y0] = latLngToMerc(a0, o1);
    const c0 = clamp(Math.floor((x0 - c) / a), 0, land.width - 1), c1 = clamp(Math.floor((x1 - c) / a), 0, land.width - 1);
    const r0 = clamp(Math.floor((y1 - f) / e), 0, land.height - 1), r1 = clamp(Math.floor((y0 - f) / e), 0, land.height - 1);
    const out = [];
    for (let r = r0; r <= r1; r++) for (let col = c0; col <= c1; col++) {
      const [la, lo] = mercToLatLng(c + (col + 0.5) * a, f + (r + 0.5) * e);
      if (pointInRing(ring, la, lo)) out.push(r * land.width + col);
    }
    return out;
  }
  function squaresInRing(ringLatLng) {
    const ring = ringLatLng.map(([la, lo]) => [lo, la]), out = [];
    for (let i = 0; i < gL.rows * gL.cols; i++) if (pointInRing(ring, geo.L.centre[i * 2], geo.L.centre[i * 2 + 1])) out.push(i);
    return out;
  }
  function circleRing(lat, lng, km, n = 64) {
    const out = [], dLat = km / 110.574, dLng = km / (111.32 * Math.cos(lat * Math.PI / 180));
    for (let k = 0; k < n; k++) { const t = (k / n) * 2 * Math.PI; out.push([lat + dLat * Math.sin(t), lng + dLng * Math.cos(t)]); }
    return out;
  }
  async function selectPoint(lat, lng, label, opts = {}) {
    if (!opts.keep) state.finding = null;
    const f = areaAt(lat, lng), r = CIRCLE_KM.includes(opts.r) ? opts.r : 1;
    const ring = circleRing(lat, lng, r);
    selLayer.clearLayers();
    selOutline(ring, true);
    pinMarker = L.marker([lat, lng], { pane: "sel", icon: L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), keyboard: false, interactive: false }).addTo(selLayer);
    $("#tool-clear").disabled = false;
    state.sel = { kind: "point", lat, lng, r, ring, label: label || null, note: opts.note || null, area: f ? f.properties.name : null, sq: [], ready: false }; // sq is filled in finishSelection
    try { history.replaceState(null, "", `#${lat.toFixed(5)},${lng.toFixed(5)}${r !== 1 ? `,${r}` : ""}`); } catch (e) { /* ignore */ } // shareable link to this place
    // fit the 1 km circle into the part of the screen the card leaves free (on phones the card sits at the bottom)
    if (opts.zoom) map.flyToBounds(L.latLngBounds(ring), { ...selPad(), maxZoom: opts.zoom, duration: 0.8 });
    await finishSelection(state.sel);
    if (!label && state.sel && state.sel.kind === "point" && state.sel.lat === lat) {
      const name = await reverseGeocode(lat, lng);
      if (state.sel && state.sel.lat === lat && name) { state.sel.label = name; renderCard(); }
    }
  }
  async function selectArea(pts) {
    state.finding = null;
    const ring = pts.map((p) => [p.lat, p.lng]);
    selLayer.clearLayers();
    selOutline(ring, false);
    $("#tool-clear").disabled = false;
    // a drawn area has no point link: drop the previous point's #lat,lng so a shared link does not open the wrong place
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
    const cLat = mean(ring.map((p) => p[0])), cLng = mean(ring.map((p) => p[1])), f = areaAt(cLat, cLng);
    state.sel = { kind: "area", lat: cLat, lng: cLng, ring, label: null, area: f ? f.properties.name : null, sq: [], ready: false }; // sq is filled in finishSelection
    await finishSelection(state.sel);
  }
  async function finishSelection(sel) {
    sel.failed = false;
    renderCardLoading();
    // a layer failed (flaky network, missing file): renderCardLoading then says so and offers a retry
    try { await Promise.all([loadGrids(), loadRadarYears(), ...PLACE_LAYERS().map(loadGray)]); } catch (e) { console.error(e); sel.failed = true; if (state.sel === sel) renderCardLoading(); return; }
    if (state.sel !== sel) return;
    // the 1 km MODIS squares under the place (heat and greenness rows of the card): all squares whose centre lies in a
    // drawn area, otherwise the one square that holds the point (or the area's centre)
    if (sel.kind === "area") sel.sq = squaresInRing(sel.ring);
    if (!sel.sq.length) { const s = cellAt(gL, sel.lat, sel.lng); if (s >= 0) sel.sq = [s]; }
    if (!rankPool.risk) prepareRiskPool();
    sel.cells = cellsInRing(sel.ring).filter((i) => L8.study[i]);
    // a plot or a small drawn area can miss every cell centre (a cell is about 73 m): then the cells it touches count
    if (!sel.cells.length && sel.kind !== "point") sel.cells = cellsTouching(sel.ring).filter((i) => L8.study[i]);
    sel.ready = true;
    sel.ext = sel.ext || {};
    if (skShown(sel)) skSelect(sel); // extension modules start their requests once per place
    renderCard();
  }

