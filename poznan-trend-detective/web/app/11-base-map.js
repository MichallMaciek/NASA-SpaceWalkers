// SARnik core, part 11 of 32: base map (OpenFreeMap vector tiles), theme, smooth wheel zoom.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ---- base map: OpenFreeMap vector tiles, recoloured to the prototype palette; labels drawn above the data ---- */
  let styleJSON = null, themeTok = 0;
  // MapLibre draws with WebGL. Where the browser gives none (blocked driver, hardened settings, some remote desktops)
  // it throws only later, while its layer is being added to the map, past the point where a raster stand-in is chosen.
  let glOK = null;
  function hasWebGL() {
    if (glOK === null) {
      try {
        const c = document.createElement("canvas"), gl = c.getContext("webgl2") || c.getContext("webgl");
        glOK = !!gl;
        const lose = gl && gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext(); // do not keep a context just for this test: a page may hold only a few
      } catch (e) { glOK = false; }
    }
    return glOK;
  }
  async function makeVectorBase() {
    if (!window.maplibregl || !L.maplibreGL || !hasWebGL()) throw new Error("no MapLibre or no WebGL");
    if (!styleJSON) styleJSON = await Promise.race([fetch("https://tiles.openfreemap.org/styles/positron").then((r) => r.json()),
      new Promise((_, no) => setTimeout(() => no(new Error("OpenFreeMap style timeout")), 4000))]); // a failure is not cached
    const style = JSON.parse(JSON.stringify(styleJSON)); // each theme recolours its own copy
    const dk = dark();
    const C = dk
      ? { bg: "#1A1D20", water: "#24394A", park: "#1F2B22", wood: "#22302A", resid: "#1D2023", building: "#2A2E33", road: "#30353A", casing: "#262A2E", text: "#A5ABB1", halo: "#1A1D20" }
      : { bg: "#F1F0EB", water: "#CFE0EC", park: "#DFE8D5", wood: "#D9E5CF", resid: "#ECEBE5", building: "#E3E1DA", road: "#FFFFFF", casing: "#E4E2DB", text: "#6B6F74", halo: "#F1F0EB" };
    const paint = (l) => {
      const id = l.id, p = (l.paint = l.paint || {});
      if (l.type === "background") p["background-color"] = C.bg;
      else if (id === "water") p["fill-color"] = C.water;
      else if (id === "waterway") p["line-color"] = C.water;
      else if (id === "park") p["fill-color"] = C.park;
      else if (id === "landcover_wood") { p["fill-color"] = C.wood; p["fill-opacity"] = 0.9; }
      else if (id === "landuse_residential") p["fill-color"] = C.resid;
      else if (id === "building") { p["fill-color"] = C.building; p["fill-outline-color"] = C.building; }
      else if (l.type === "line" && /casing/.test(id)) p["line-color"] = C.casing;
      else if (l.type === "line" && /highway|road/.test(id)) p["line-color"] = C.road;
      // the style's own light greys for rails, tunnels and runways glare on the dark map: there they follow the road palette
      // (rails keep their sleeper pattern: road-coloured line, background-coloured dashes); the light theme stays as it is
      else if (dk && l.type === "line" && /dashline/.test(id)) p["line-color"] = C.bg;
      else if (dk && l.type === "line" && /railway|tunnel|aeroway/.test(id)) p["line-color"] = C.road;
      else if (l.type === "symbol") { p["text-color"] = C.text; p["text-halo-color"] = C.halo; }
      return l;
    };
    const baseStyle = { ...style, layers: style.layers.filter((l) => l.type !== "symbol").map(paint) };
    const labelStyle = { ...style, layers: style.layers.filter((l) => l.type === "symbol" && !/shield|country|state/.test(l.id)).map(paint) };
    return {
      base: L.maplibreGL({ style: baseStyle, interactive: false, attribution: '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }),
      labels: L.maplibreGL({ style: labelStyle, interactive: false, pane: "labels" }),
    };
  }

  async function setTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.content = mode === "dark" ? "#1A1D20" : "#F1F0EB"; });
    try { localStorage.setItem("ptd-theme", mode); } catch (e) { /* ignore */ }
    // rebuild the vector base map in the matching palette; if the toggle is clicked again meanwhile, only the
    // newest result is used, and the old maps are removed only now (each one holds a WebGL context)
    const tok = ++themeTok;
    let v = null;
    try { v = await makeVectorBase(); } catch (e) { console.warn(e); }
    if (tok !== themeTok) return;
    if (v) {
      ["map", "mapLabels"].forEach((k) => bases[k] && map.hasLayer(bases[k]) && map.removeLayer(bases[k]));
      bases.map = v.base; bases.mapLabels = v.labels;
    }
    setBase(state.base);
    borderLayer.setStyle((f) => ({ color: css("--ink-2"), weight: f.properties.role === "city" ? 1.8 : 0.8, opacity: 0.55, fill: false, dashArray: f.properties.role === "city" ? null : "3 4" }));
    Object.values(pixelLayers).forEach((pl) => map.hasLayer(pl) && pl.repaint());
    redraw(); renderTimeline(); renderDrawer();
    if (state.sel && state.sel.ready) renderCard(); else if (!state.sel) renderFindings();
  }

  // Smooth zoom with the wheel and the trackpad. Every frame the map eases towards the zoom the wheel asks for, around
  // the point under the pointer, the way Leaflet zooms during a pinch on a phone (tiles and canvases are only scaled);
  // when the wheel has been still for 160 ms the layers redraw once, sharp, at the new zoom.
  function smoothWheel(m) {
    let active = false, goal = 0, z = 0, at = null, anchor = null, raf = 0, idle = 0;
    const lim = (v) => Math.max(m.getMinZoom(), Math.min(m.getMaxZoom(), v));
    const centreFor = (zoom) => m.unproject(m.project(anchor, zoom).subtract(at.subtract(m.getSize().divideBy(2))), zoom);
    const frame = () => {
      raf = 0;
      if (!active) return;
      const d = goal - z;
      z = Math.abs(d) < 0.004 ? goal : z + d * 0.3;
      m._move(centreFor(z), z, { pinch: true, round: false });
      if (z !== goal) raf = requestAnimationFrame(frame);
    };
    const end = () => {
      if (!active) return;
      if (raf) { idle = setTimeout(end, 60); return; } // still easing: finish the motion first
      active = false;
      m.fire("zoom"); // a zoom event without the pinch flag: tile layers and canvases switch to this zoom and redraw
      m._moveEnd(true);
    };
    m.getContainer().addEventListener("wheel", (e) => {
      e.preventDefault();
      if (m._animatingZoom) return; // a button or flyTo zoom is running; it ends in a quarter of a second
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      at = m.mouseEventToContainerPoint(e);
      if (!active) { m._stop(); active = true; z = goal = m.getZoom(); m._moveStart(true, false); }
      anchor = m.containerPointToLatLng(at); // the place under the pointer stays under it
      goal = lim(goal - dy * (e.ctrlKey ? 0.012 : 0.0032)); // ctrlKey: a pinch on the trackpad sends small steps
      if (!raf) raf = requestAnimationFrame(frame);
      clearTimeout(idle); idle = setTimeout(end, 160);
    }, { passive: false });
    m.on("dragstart", () => { if (active) { clearTimeout(idle); if (raf) { cancelAnimationFrame(raf); raf = 0; } end(); } });
  }

