// SARnik core, part 12 of 32: map start (initMap), place names, base switch, radar colour stretch.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  let baseDead = false; // neither the vector base map nor its raster stand-in answered: only the plain background is left
  async function initMap(baseP) {
    // The wheel and the trackpad zoom smoothly (smoothWheel below), not through Leaflet's wheel handler, which waits
    // for the wheel to pause and then jumps; the + and - buttons still move one level.
    map = L.map("map", { zoomControl: false, minZoom: 8, maxZoom: 18, preferCanvas: true, attributionControl: true,
      zoomSnap: 0.25, zoomDelta: 1, scrollWheelZoom: false }).setView(OLD_MARKET, 11);
    smoothWheel(map);
    map.createPane("land"); map.getPane("land").style.zIndex = 390;
    map.createPane("labels"); map.getPane("labels").style.zIndex = 650; map.getPane("labels").style.pointerEvents = "none";
    map.createPane("sel"); map.getPane("sel").style.zIndex = 660;
    try { const v = await (baseP || makeVectorBase()); bases.map = v.base; bases.mapLabels = v.labels; } // main() asks for it alongside the data
    catch (e) { // fallback: Esri light grey raster
      console.warn("vector base failed, using raster", e);
      bases.map = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", { maxNativeZoom: 16, maxZoom: 19, attribution: "Esri" });
      bases.mapLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxNativeZoom: 16, maxZoom: 19, pane: "labels" });
      // If this host is silent too, the plain background stays and our own municipality names are the only orientation:
      // show them until a tile does arrive.
      const names = (dead) => { if (baseDead === dead) return; baseDead = dead; if (dead) console.warn("no base map tiles: showing municipality names on the plain background"); syncNames(); };
      let got = false;
      bases.map.on("tileload", () => { got = true; names(false); });
      bases.map.on("tileerror", () => { if (!got) names(true); });
    }
    bases.photoLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxNativeZoom: 16, maxZoom: 19, pane: "labels", attribution: "Esri" });
    bases.orto = L.tileLayer.wms("https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution", { layers: "Raster", format: "image/jpeg", version: "1.3.0", maxZoom: 19, attribution: "Ortofotomapa &copy; GUGiK" });
    const geopozWms = (layer) => L.tileLayer.wms("https://wms2.geopoz.poznan.pl/geoserver/wms", { layers: layer, styles: "", format: "image/png", transparent: false, version: "1.1.1", maxZoom: 19, attribution: "Ortofotomapa &copy; GEOPOZ" });
    bases.poz2025 = geopozWms("ortogpkg:orto2025");
    bases.poz1940 = geopozWms("ortogpkg:ortofotomapa_2001");

    // the canvases of the data layers are made on first use, see overlay()
    Object.keys(PIXEL).forEach((k) => { pixelLayers[k] = new PixelLayer(k, { opacity: state.lyr[k].op, zIndex: 395, updateWhenZooming: false }); });

    borderLayer = L.geoJSON(areas, { interactive: false, style: (f) => ({ color: css("--ink-2"), weight: f.properties.role === "city" ? 1.8 : 0.8, opacity: 0.55, fill: false, dashArray: f.properties.role === "city" ? null : "3 4" }) }).addTo(map);
    labelLayer = L.layerGroup(areas.features.map((f) => {
      const c = L.geoJSON(f).getBounds().getCenter();
      const nudge = { "Poznań": [0.012, 0], "Luboń": [-0.004, 0.012], "Puszczykowo": [0, 0.02] }[f.properties.name] || [0, 0];
      return L.marker([c.lat + nudge[0], c.lng + nudge[1]], { interactive: false, keyboard: false, pane: "labels",
        icon: L.divIcon({ className: "mlabel" + (f.properties.role === "city" ? " city" : ""), html: `<span>${esc(f.properties.name)}</span>`, iconSize: null }) });
    }));
    choroLayer = L.geoJSON(areas, { interactive: false, pane: "land", style: () => ({ stroke: false, fillOpacity: state.lyr.price.op, fillColor: "#ccc" }) });
    nisarLayer = L.tileLayer("", { maxZoom: 19, maxNativeZoom: 13, opacity: state.lyr.nisar.op, pane: "land", attribution: "NISAR GCOV: NASA-ISRO via NASA GIBS" });
    selLayer = L.layerGroup().addTo(map);
    Object.keys(SK.modules).forEach(skOverlay); // modules that registered before the map existed
    floodLayer = L.geoJSON(flood, { interactive: false, pane: "land", style: () => ({ color: "#1F6FBF", weight: 1, opacity: 0.8, fillColor: "#3B8FE0", fillOpacity: state.lyr.flood.op }) });
    // fit the 18 municipalities first, without animation, and only then add the base map: it then asks for the tiles of
    // the opening view only (an animated fit made it fetch the tiles of the provisional view as well)
    map.fitBounds(borderLayer.getBounds(), { ...fitPad(), animate: false });
    setBase(state.base);
    const hideTip = () => { $("#hovertip").hidden = true; };
    map.on("mousemove", onHover);
    map.on("mouseout", hideTip);
    map.on("movestart", hideTip);
    map.on("zoomstart", hideTip);
    map.on("dragstart", hideTip);
    document.addEventListener("mouseleave", hideTip);
    window.addEventListener("blur", hideTip);
    ["#sidecard", "#drawer", "#timeline", ".topbar", ".topright", "#legend"].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.addEventListener("mouseenter", hideTip);
      });
    });
    map.on("click", (e) => { if (!draw.mode && performance.now() > draw.suppressUntil) selectPoint(e.latlng.lat, e.latlng.lng, null); });
    map.on("zoomend", () => $("#map").classList.toggle("far", map.getZoom() < 10));
  }

  // the vector base already names towns; our municipality labels are needed on aerial photos and when no base map loaded
  function syncNames() {
    if (!labelLayer || !map) return;
    const show = (state.base !== "map" || baseDead) && (!$("#borders") || $("#borders").checked);
    if (show) labelLayer.addTo(map); else map.removeLayer(labelLayer);
  }
  function setBase(key) {
    state.base = key;
    ["map", "mapLabels", "photoLabels", "orto", "poz2025", "poz1940"].forEach((k) => bases[k] && map.hasLayer(bases[k]) && map.removeLayer(bases[k]));
    if (key === "map") { bases.map.addTo(map); bases.mapLabels.addTo(map); }
    else {
      if (key !== "orto") bases.map.addTo(map);
      bases[key].addTo(map); bases.photoLabels.addTo(map);
    }
    syncNames();
    document.documentElement.classList.toggle("on-photo", key !== "map");
  }

  // radar colour composite, shared by the map and its legend so they always agree.
  // Stretches from the 2nd-98th percentiles in the study area: 120 m cells mix surfaces, so contrast is narrower
  // than in single 10-20 m pixels. R = co-pol (VV/HH), G = cross-pol (VH/HV), B = co/cross ratio.
  // NISAR (provisional) is about 3 dB brighter than the ALOS-2 mosaics, so it gets its own stretch, fitted so that the
  // same share of the study area falls below each bound as for ALOS-2 2021 (percentile matching): classes stay comparable
  const RGB_STRETCH = { s1rgb: [-13, -3, -19, -10, 4, 10], alos: [-16, -1, -26, -10, 4, 12], nisar: [-11.8, 2.2, -19.3, -9, 4.7, 9.8] };
  function radarRgb(k, co, cx) {
    const [c0, c1, x0, x1, r0, r1] = RGB_STRETCH[k], sc = (v, a, b) => clamp(((v - a) / (b - a)) * 255, 0, 255) | 0;
    return [sc(co, c0, c1), sc(cx, x0, x1), sc(co - cx, r0, r1)];
  }
  // typical values (dB, co / cross) of each surface in the study area, measured by build_sar.py
  const RADAR_LEGEND = {
    s1rgb: [["rgbBuilt", -5.8, -12.3], ["rgbStrong", -3, -13], ["rgbVeg", -8.2, -13.3], ["rgbBare", -9.5, -17], ["rgbWater", -20, -27]],
    alos: [["rgbBuilt", -6.8, -13.7], ["rgbStrong", -2, -12], ["rgbVeg", -6.3, -11.5], ["rgbBare", -13.8, -22.5], ["rgbWater", -24, -30]],
    nisar: [["rgbBuiltVeg", -4.6, -10.6], ["rgbStrong", 5.3, -10.3], ["rgbBare", -9.9, -16.7], ["rgbWater", -15.5, -19.8]], // in L-band built-up land and forest look alike (strong HV): one entry
  };

