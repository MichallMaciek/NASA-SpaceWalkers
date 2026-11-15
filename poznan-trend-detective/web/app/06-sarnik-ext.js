// SARnik core, part 6 of 32: SARnik extension modules: window.SARNIK, ctx, the module loader (docs/planwyd/KONTRAKT.md).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= SARnik extensions (docs/planwyd/KONTRAKT.md, version 1) ================= */
  // Modules live in web/sarnik/<name>.js and are switched on in web/sarnik/manifest.js.
  // With an empty list nothing here changes the card.
  const skList = (Array.isArray(window.SARNIK_MODULES) ? window.SARNIK_MODULES : [])
    .map((m) => (typeof m === "string" ? { name: m, css: false } : m && m.name ? { name: String(m.name), css: !!m.css } : null)).filter(Boolean);
  const skJSON = new Map();
  const skGuard = (name, what, fn) => { try { return fn(); } catch (e) { console.warn(`SARnik module ${name}.${what}:`, e); return null; } };
  const skShown = (sel) => !!(sel && sel.ready && sel.area && sel.cells && sel.cells.length); // the check-up is on screen
  const SK = {
    version: 1,
    modules: {},
    register(name, def) {
      if (typeof name !== "string" || !name) { console.warn("SARnik: register() needs a module name"); return; }
      SK.modules[name] = def || {};
      skOverlay(name);
      const sel = state.sel; // a module that loads after a place was picked still gets its onSelect
      if (!skShown(sel)) return;
      if (SK.modules[name].onSelect) skGuard(name, "onSelect", () => SK.modules[name].onSelect(sel, skCtx));
      renderCard();
    },
  };
  // card order = manifest order, then modules registered without a manifest entry
  const skOrder = () => { const names = skList.map((m) => m.name); Object.keys(SK.modules).forEach((n) => { if (!names.includes(n)) names.push(n); }); return names.filter((n) => SK.modules[n]); };
  const skCtx = {
    lang: () => lang,
    t: (name) => ((SK.modules[name] || {}).i18n || {})[lang] || {},
    esc, num, sgn, fmtInt,
    get land() { return land; },
    get sar() { return sar; },
    L8,
    landCell: (la, lo) => landCell(la, lo),
    cellCentre(i) { const w = land.width, [a, , c, , e, f] = land.transform3857; return mercToLatLng(c + ((i % w) + 0.5) * a, f + (Math.floor(i / w) + 0.5) * e); },
    inFlood: (la, lo) => inFlood(la, lo),
    distM(lat1, lng1, lat2, lng2) {
      const R = 6371008.8, r = Math.PI / 180;
      const h = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    },
    loadGray: (name, dir) => loadGray(dir ? `${dir}/${name}` : name), // contract 1.1: data/<dir>/<name>.png, cached as L8[dir + "/" + name]
    loadJSON(path) {
      if (!skJSON.has(path)) {
        const p = fetch(`data/${path}?v=${DATA_V}`).then((r) => { if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`); return r.json(); });
        p.catch(() => skJSON.delete(path)); // a failed load may be tried again
        skJSON.set(path, p);
      }
      return skJSON.get(path);
    },
    // one request per place and key; the card is redrawn only if the same place is still selected
    fetchOnce(sel, key, fn, ms = 6000) {
      sel.ext = sel.ext || {};
      if (sel.ext[key]) return;
      sel.ext[key] = { st: "loading" };
      const ac = new AbortController();
      let timer;
      const timeout = new Promise((res) => { timer = setTimeout(() => { ac.abort(); res({ st: "timeout" }); }, ms); });
      const work = Promise.resolve().then(() => fn(ac.signal))
        .then((data) => ({ st: "ok", data }), (error) => ({ st: "error", error: String((error && error.message) || error) }));
      Promise.race([work, timeout]).then((res) => { clearTimeout(timer); sel.ext[key] = res; if (state.sel === sel) skCtx.rerender(); });
    },
    rerender() { if (state.sel && state.sel.ready) renderCard(); },
    // plots from ULDK (GUGiK) through the core's one parser and cache (21a-parcels.js): a plot or null when there is none
    uldk: { byXY: (lat, lng, signal) => parcelLookup(lat, lng, signal), byId: (id, signal) => parcelLookupId(id, signal) },
    // outline of a plot (a ring of [lat, lng]) for this selection, under the pin; the next pick clears it
    outline(sel, ring) {
      if (state.sel !== sel || !selLayer || !Array.isArray(ring) || ring.length < 3) return;
      L.polygon(ring, { pane: "sel", interactive: false, color: HALO(), weight: 5, fill: false, lineJoin: "round" }).addTo(selLayer);
      L.polygon(ring, { pane: "sel", interactive: false, color: css("--area"), weight: 2, fillColor: css("--area"), fillOpacity: 0.14, lineJoin: "round" }).addTo(selLayer);
    },
  };
  // def.overlay = { wms, layers, minZoom, attribution }: a transparent WMS layer of the module, shown only from minZoom
  const skOverlays = {};
  function skOverlay(name) {
    const o = (SK.modules[name] || {}).overlay;
    if (!map || !o || typeof o.wms !== "string" || !/^https:\/\//.test(o.wms) || skOverlays[name]) return;
    if (!map.getPane("skOverlay")) { map.createPane("skOverlay"); map.getPane("skOverlay").style.zIndex = 640; map.getPane("skOverlay").style.pointerEvents = "none"; }
    skOverlays[name] = L.tileLayer.wms(o.wms, { layers: String(o.layers || ""), styles: "", format: "image/png", transparent: true, version: "1.3.0",
      minZoom: o.minZoom || 16, maxZoom: 19, opacity: 0.75, pane: "skOverlay", attribution: o.attribution || "" }).addTo(map);
  }
  function skSelect(sel) {
    sel.ext = sel.ext || {};
    skOrder().forEach((name) => { const d = SK.modules[name]; if (d.onSelect) skGuard(name, "onSelect", () => d.onSelect(sel, skCtx)); });
  }
  // rows for the plain check-up: id prefixed with the module, pending rows are "info", sar defaults to "no"
  function skItems(sel) {
    const out = [];
    skOrder().forEach((name) => {
      const d = SK.modules[name];
      if (!d.checks) return;
      const r = skGuard(name, "checks", () => d.checks(sel, skCtx));
      (r == null ? [] : Array.isArray(r) ? r : [r]).forEach((it) => {
        if (!it || typeof it !== "object") return;
        const row = Object.assign({ sar: "no" }, it, { id: `${name}:${it.id || "row"}`, module: name });
        if (row.pending || !["ok", "warn", "risk", "info"].includes(row.lvl)) row.lvl = "info";
        if (!["yes", "part", "no"].includes(row.sar)) row.sar = "no";
        out.push(row);
      });
    });
    return out;
  }
  const skCardTop = (sel) => skOrder().map((name) => { const d = SK.modules[name]; return d.cardTop ? skGuard(name, "cardTop", () => d.cardTop(sel, skCtx)) || "" : ""; }).join("");
  window.SARNIK = SK;
  $("#sidecard").addEventListener("click", (e) => { // data-sk="<module>:<action>" in a module's HTML
    const el = e.target.closest && e.target.closest("[data-sk]");
    if (!el || !state.sel) return;
    const [name, action] = String(el.dataset.sk).split(":");
    const d = SK.modules[name];
    if (d && d.onAction) skGuard(name, "onAction", () => d.onAction(action, state.sel, skCtx, el));
  });
  // Called from 32-main.js once every core part has run: a script added here runs as soon as it arrives, so starting the
  // modules while the later parts are still loading could run a module before the code it needs (map, renderCard).
  function skLoadModules() {
    skList.forEach(({ name, css: withCss }) => {
      if (!/^[a-z0-9_-]+$/i.test(name)) { console.warn("SARnik: bad module name", name); return; }
      if (withCss) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = `sarnik/${name}.css?v=${DATA_V}`; document.head.appendChild(l); }
      const s = document.createElement("script");
      s.src = `sarnik/${name}.js?v=${DATA_V}`; s.async = false; // keep the manifest order
      s.onerror = () => console.warn(`SARnik: module ${name} did not load`);
      document.body.appendChild(s);
    });
  }

