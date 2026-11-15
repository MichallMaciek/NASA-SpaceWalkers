// SARnik core, part 20 of 32: drawing an area (polygon, freehand).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= drawing an area ================= */
  // Pointer events on the map container: works with mouse, pen and touch, keeps tracking when the pointer
  // leaves the map (pointer capture), and never lets the click that ends a drawing select a point instead.
  const draw = { mode: null, pts: [], shape: null, guide: null, vtx: null, down: false, suppressUntil: 0, pointerId: null };
  // selection drawn like a surveyor's mark: thin ink line over a light halo, readable on the map and on radar colours
  const AREA_STYLE = () => ({ color: css("--ink"), weight: 2, fillColor: css("--ink"), fillOpacity: 0.04, lineJoin: "round", pane: "sel" });
  const HALO = () => (dark() ? "rgba(0,0,0,.6)" : "rgba(255,255,255,.92)");
  function selOutline(ring, dashed) {
    L.polygon(ring, { pane: "sel", interactive: false, color: HALO(), weight: 5.5, fill: false, lineJoin: "round" }).addTo(selLayer);
    L.polygon(ring, { ...AREA_STYLE(), interactive: false, dashArray: dashed ? "1 6" : null, lineCap: "round", weight: dashed ? 2.6 : 2 }).addTo(selLayer);
  }
  const drawHint = (txt) => { $("#drawhint").hidden = !txt; $("#drawhint-text").textContent = txt || ""; };
  function startDraw(mode) {
    stopDraw();
    clearTimeout(draw.hintT);
    draw.mode = mode; draw.pts = [];
    $("#tool-free").setAttribute("aria-pressed", String(mode === "free"));
    $("#tool-poly").setAttribute("aria-pressed", String(mode === "poly"));
    $("#tool-circle").setAttribute("aria-pressed", String(mode === "circle"));
    $("#map").classList.add("drawing");
    $("#drawhint").classList.remove("note");
    drawHint(mode === "free" ? U().hintFree : mode === "circle" ? U().hintCircle(radiusLabel(circleKm())) : U().hintPoly);
    // the circle tool is one click, so the map stays movable; drawing an outline holds the map still
    if (mode !== "circle") { map.dragging.disable(); map.doubleClickZoom.disable(); map.touchZoom.disable(); map.boxZoom.disable(); }
    draw.vtx = L.layerGroup().addTo(map);
  }
  function stopDraw() {
    draw.mode = null; draw.pts = []; draw.down = false;
    [draw.shape, draw.guide, draw.vtx].forEach((l) => l && map.removeLayer(l));
    draw.shape = draw.guide = draw.vtx = null;
    $("#tool-free").setAttribute("aria-pressed", "false"); $("#tool-poly").setAttribute("aria-pressed", "false"); $("#tool-circle").setAttribute("aria-pressed", "false");
    $("#map").classList.remove("drawing"); drawHint("");
    map.dragging.enable(); map.doubleClickZoom.enable(); map.touchZoom.enable(); map.boxZoom.enable();
  }
  // while drawing only the open outline shows: no fill and no closing segment; the filled area appears once the shape
  // is closed (selectArea draws it)
  function updateShape() {
    if (!draw.shape) draw.shape = L.polyline(draw.pts, { ...AREA_STYLE(), interactive: false, fill: false, dashArray: null }).addTo(map);
    else draw.shape.setLatLngs(draw.pts);
  }
  function redrawVertices(hoverFirst) {
    if (!draw.vtx) return;
    draw.vtx.clearLayers();
    draw.pts.forEach((p, k) => L.circleMarker(p, {
      pane: "sel", interactive: false, radius: k === 0 ? (hoverFirst ? 8 : 6) : 4.5, weight: 2,
      color: css("--ink"), fillColor: k === 0 && hoverFirst ? css("--ink") : "#fff", fillOpacity: 1,
    }).addTo(draw.vtx));
  }
  // Douglas-Peucker in screen pixels, so long freehand strokes become light, clean polygons
  function simplify(latlngs, tolPx) {
    const pts = latlngs.map((ll) => map.latLngToContainerPoint(ll));
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop(); let idx = -1, dmax = tolPx;
      for (let i = a + 1; i < b; i++) {
        const A = pts[a], B = pts[b], P = pts[i], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
        // a closed freehand loop ends where it started: then measure from the start point, not from a line
        const d = len < 1 ? Math.hypot(P.x - A.x, P.y - A.y) : Math.abs(dy * P.x - dx * P.y + B.x * A.y - B.y * A.x) / len;
        if (d > dmax) { dmax = d; idx = i; }
      }
      if (idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    return latlngs.filter((_, i) => keep[i]);
  }
  function areaPx(latlngs) {
    const p = latlngs.map((ll) => map.latLngToContainerPoint(ll));
    let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j].x + p[i].x) * (p[j].y - p[i].y);
    return Math.abs(a / 2);
  }
  function hullAreaPx(latlngs) { // area of the convex hull in screen pixels (monotone chain)
    const p = latlngs.map((ll) => map.latLngToContainerPoint(ll)).sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const half = (pts) => { const hl = []; for (const q of pts) { while (hl.length >= 2 && cross(hl[hl.length - 2], hl[hl.length - 1], q) <= 0) hl.pop(); hl.push(q); } hl.pop(); return hl; };
    const hl = [...half(p), ...half([...p].reverse())];
    let a = 0; for (let i = 0, j = hl.length - 1; i < hl.length; j = i++) a += (hl[j].x + hl[i].x) * (hl[j].y - hl[i].y);
    return Math.abs(a / 2);
  }
  function finishDraw() {
    let pts = draw.pts.slice();
    if (draw.mode === "free") pts = simplify(pts, 2);
    stopDraw();
    draw.suppressUntil = performance.now() + 450; // swallow the click that follows the last pointer-up
    // a figure-eight has a signed area near zero, so its convex hull decides too (a big crossed shape is not "too small")
    if (pts.length < 3 || Math.max(areaPx(pts), hullAreaPx(pts) / 4) < 150) {
      drawHint(U().drawTooSmall);
      clearTimeout(draw.hintT);
      draw.hintT = setTimeout(() => { if (!draw.mode) drawHint(""); }, 2200); // never wipes the hint of a drawing started meanwhile
      return;
    }
    selectArea(pts);
  }
  const nearFirst = (pt) => draw.pts.length >= 3 && map.latLngToContainerPoint(draw.pts[0]).distanceTo(pt) < 14;
  function initDraw() {
    $("#tool-free").addEventListener("click", () => (draw.mode === "free" ? stopDraw() : startDraw("free")));
    $("#tool-poly").addEventListener("click", () => (draw.mode === "poly" ? stopDraw() : startDraw("poly")));
    $("#tool-circle").addEventListener("click", () => (draw.mode === "circle" ? stopDraw() : startDraw("circle")));
    // circle tool: its radius follows the zoom (circleKm, 21a-parcels.js); the dashed preview follows the mouse
    map.on("zoomend", () => {
      if (draw.mode !== "circle") return;
      drawHint(U().hintCircle(radiusLabel(circleKm())));
      if (draw.guide) draw.guide.setRadius(circleKm() * 1000);
    });
    $("#tool-clear").addEventListener("click", () => { stopDraw(); clearSelection(); });
    const el = map.getContainer();
    const llOf = (e) => map.mouseEventToLatLng(e);
    const ptOf = (e) => map.mouseEventToContainerPoint(e);
    el.addEventListener("pointerdown", (e) => {
      if (draw.mode !== "free" || (e.pointerType === "mouse" && e.button !== 0)) return;
      if (e.target.closest(".leaflet-control")) return;
      e.preventDefault(); e.stopPropagation();
      draw.down = true; draw.pointerId = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      draw.pts = [llOf(e)];
      updateShape(false);
    }, true);
    el.addEventListener("pointermove", (e) => {
      if (draw.mode === "free" && draw.down && e.pointerId === draw.pointerId) {
        const last = map.latLngToContainerPoint(draw.pts[draw.pts.length - 1]);
        if (last.distanceTo(ptOf(e)) > 3) { draw.pts.push(llOf(e)); updateShape(draw.pts.length > 2); }
      } else if (draw.mode === "poly" && draw.pts.length) {
        const ll = llOf(e), hover = nearFirst(ptOf(e));
        const tail = [draw.pts[draw.pts.length - 1], hover ? draw.pts[0] : ll];
        if (!draw.guide) draw.guide = L.polyline(tail, { color: css("--area"), weight: 2, dashArray: "4 6", pane: "sel", interactive: false }).addTo(map);
        else draw.guide.setLatLngs(tail);
        if (hover !== draw.hoverFirst) { draw.hoverFirst = hover; redrawVertices(hover); }
      } else if (draw.mode === "circle" && e.pointerType === "mouse") {
        const ll = llOf(e), rm = circleKm() * 1000;
        if (!draw.guide) draw.guide = L.circle(ll, { radius: rm, pane: "sel", interactive: false, color: css("--ink"), weight: 1.5, dashArray: "4 6", fill: false }).addTo(map);
        else { draw.guide.setLatLng(ll); draw.guide.setRadius(rm); }
      }
    }, true);
    const endFree = (e) => {
      if (draw.mode !== "free" || !draw.down || e.pointerId !== draw.pointerId) return;
      draw.down = false;
      try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      finishDraw();
    };
    el.addEventListener("pointerup", endFree, true);
    el.addEventListener("pointercancel", endFree, true);
    map.on("click", (e) => {
      if (draw.mode !== "poly") return;
      if (nearFirst(e.containerPoint)) { finishDraw(); return; }
      const last = draw.pts[draw.pts.length - 1];
      if (last && map.latLngToContainerPoint(last).distanceTo(e.containerPoint) < 3) return; // second click of a double-click
      draw.pts.push(e.latlng);
      updateShape(draw.pts.length > 2); redrawVertices(false);
      drawHint(draw.pts.length < 3 ? U().hintPoly : U().hintPolyClose);
    });
    map.on("dblclick", () => { if (draw.mode === "poly" && draw.pts.length >= 3) finishDraw(); });
    document.addEventListener("keydown", (e) => {
      if (!draw.mode) return;
      if (e.key === "Escape") stopDraw();
      else if (e.key === "Enter" && draw.mode === "poly" && draw.pts.length >= 3) { e.preventDefault(); finishDraw(); }
      // a click on the map leaves the focus on the map, so only typing in a text field keeps Backspace for itself
      else if (e.key === "Backspace" && draw.mode === "poly" && draw.pts.length && !e.target.closest("input, textarea, select, [contenteditable]")) {
        e.preventDefault(); draw.pts.pop(); updateShape(draw.pts.length > 2); redrawVertices(false);
        if (draw.guide && !draw.pts.length) { map.removeLayer(draw.guide); draw.guide = null; }
        else if (draw.guide) draw.guide.setLatLngs([draw.pts[draw.pts.length - 1], draw.guide.getLatLngs()[1]]);
        drawHint(draw.pts.length < 3 ? U().hintPoly : U().hintPolyClose);
      }
    });
  }

