// SARnik core, part 10 of 32: map: Leaflet layer handles, building decisions (WUiA), overlays, canvas and pixel layers.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= map ================= */
  let map, borderLayer, labelLayer, choroLayer, pinMarker, nisarLayer, selLayer, baseGL, labelGL, floodLayer;
  let wuiaLayer = null; // building permits and applications of the Poznań planning office (GEOPOZ), added by Szymon
  let wuiaPending = null;
  // 2.6 MB of decisions: fetched the first time the layer is switched on, so a visit that never shows it does not pay for it
  function loadWuia() {
    if (wuiaLayer || wuiaPending) return;
    wuiaPending = fetch(`data/wuia_decyzje.geojson?v=${DATA_V}`).then((r) => r.json()).then((data) => {
      // own pane above the border and selection canvases: they covered the "land" pane and swallowed every click, so no popup ever opened
      if (!map.getPane("wuia")) { map.createPane("wuia"); map.getPane("wuia").style.zIndex = 670; }
      wuiaLayer = L.geoJSON(data, {
        pane: "wuia", bubblingMouseEvents: false, // a click on a decision opens its popup and does not also select a place
        style: (f) => {
          const kat = (f.properties.kategoria || "").toLowerCase();
          const col = kat.includes("nowa") ? "#E5602A" : (kat.includes("rozbudowa") ? "#7357E8" : "#F2A31B");
          return { color: col, weight: 1.5, opacity: 0.9, fillColor: col, fillOpacity: state.lyr.wuia.op };
        },
        onEachFeature: (f, lyr) => {
          const p = f.properties;
          lyr.bindPopup(`<div style="font-size:13px;font-family:inherit"><strong>${esc(p.kategoria || "Decyzja")}</strong><br><span style="color:var(--ink-2)">${esc(p.OPIS || "")}</span><br><small style="color:var(--ink-3)">${esc(p.DATA || "")}, ${esc(p.NR_SPRAWY || "")}</small></div>`);
        },
      });
      redraw();
    }).catch((e) => console.warn("wuia load skipped", e)).finally(() => { wuiaPending = null; });
  }
  const geoCache = new Map();
  const bases = {}, overlays = {}, pixelLayers = {};
  // Canvas and map layer of one data layer, made the first time that layer is drawn (its pixel buffers follow in
  // renderLand / renderLandHi). Making all twelve at start-up took about 80 MB that most visits never use.
  function overlay(k) {
    if (!overlays[k]) {
      const c = document.createElement("canvas"); c.width = land.width; c.height = land.height;
      overlays[k] = { canvas: c, ctx: c.getContext("2d"), img: null, layer: new CanvasOverlay(c, land.bounds, { opacity: state.lyr[k].op, interactive: false, pane: "land", zIndex: LAND_KEYS.indexOf(k) * 10 }) };
    }
    return overlays[k];
  }
  const dark = () => { const t = document.documentElement.getAttribute("data-theme"); return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };

  const CanvasOverlay = L.ImageOverlay.extend({
    _initImage() {
      const el = (this._image = this._url);
      L.DomUtil.addClass(el, "leaflet-image-layer");
      L.DomUtil.addClass(el, "land-canvas");
      if (this.options.zIndex != null) el.style.zIndex = this.options.zIndex;
      if (this._zoomAnimated) L.DomUtil.addClass(el, "leaflet-zoom-animated");
      el.onselectstart = L.Util.falseFn; el.onmousemove = L.Util.falseFn;
    },
  });

  // MODIS footprints in their true sinusoidal shape, clipped to the 18 municipalities
  const PixelLayer = L.GridLayer.extend({
    initialize(key, opts) { this._key = key; L.GridLayer.prototype.initialize.call(this, opts); },
    createTile(coords) {
      const t = document.createElement("canvas"), size = this.getTileSize(), dpr = window.devicePixelRatio || 1;
      t.width = size.x * dpr; t.height = size.y * dpr; t.style.width = size.x + "px"; t.style.height = size.y + "px";
      this._paint(t, coords);
      return t;
    },
    repaint() { Object.values(this._tiles || {}).forEach((tile) => this._paint(tile.el, tile.coords)); },
    _paint(canvas, coords) {
      const ctx = canvas.getContext("2d"), size = this.getTileSize(), dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.x, size.y);
      const key = this._key, P = PIXEL[key], g = P.grid === "N" ? gN : gL, G = P.grid === "N" ? geo.N : geo.L, m = this._map, z = coords.z;
      const nw = coords.scaleBy(size), nwLL = m.unproject(nw, z), seLL = m.unproject(nw.add(size), z);
      ctx.save();
      ctx.beginPath();
      areas.features.forEach((f) => rings(f.geometry).forEach((poly) => poly.forEach((ring) => ring.forEach(([lo, la], k) => {
        const p = m.project([la, lo], z).subtract(nw);
        k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }))));
      ctx.clip();
      for (let i = 0, n = g.rows * g.cols; i < n; i++) {
        const b = i * 4;
        if (G.bb[b + 1] < seLL.lat || G.bb[b] > nwLL.lat || G.bb[b + 3] < nwLL.lng || G.bb[b + 2] > seLL.lng) continue;
        const { v, p } = pixelValue(key, i), col = pixelColour(key, v, p);
        if (!col) continue;
        const k = i * 8;
        ctx.beginPath();
        for (let q = 0; q < 4; q++) {
          const pt = m.project([G.corners[k + q * 2], G.corners[k + q * 2 + 1]], z).subtract(nw);
          q ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y);
        }
        ctx.closePath(); ctx.fillStyle = col; ctx.fill();
        if (z <= 11) { ctx.strokeStyle = col; ctx.lineWidth = 0.6; ctx.stroke(); }
      }
      ctx.restore();
    },
  });
  function pixelValue(key, i) {
    const P = PIXEL[key], g = P.grid === "N" ? gN : gL;
    if (key === "nightyear") return { v: gL.layers.night_years[i][heatYear() - 2000], p: null };
    return { v: g.layers[P.value][i], p: P.p ? g.layers[P.p][i] : null };
  }
  function pixelColour(key, v, p) {
    const P = PIXEL[key];
    if (v == null || !isFinite(v)) return null;
    if (P.seq) return ramp(P.stops, (v - P.min) / (P.max - P.min));
    if (p == null || p >= 0.05) return css("--ns");
    return ramp(v >= 0 ? P.pos : P.neg, Math.abs(v) / P.max);
  }

