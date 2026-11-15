// SARnik core, part 21a: plots from the land register (ULDK, GUGiK): one lookup with a cache, the grey highlight under
// the cursor, a click that picks the plot, #dz= links, and the radius of the circle tool.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= plots (ULDK) ================= */
  // ULDK is a public service (CORS open): ask only when needed. The cursor must rest for 200 ms, a plot already fetched
  // answers from memory (point in polygon), and at most one hover or click request runs at a time.
  const ULDK_URL = "https://uldk.gugik.gov.pl/";
  const ULDK_RESULT = "&result=teryt,commune,region,parcel,geom_wkt&srid=4326";
  const PARCEL_ZOOM = 16; // plots are picked and highlighted from this zoom
  const uldkByXY = (lat, lng) => `${ULDK_URL}?request=GetParcelByXY&xy=${Number(lng).toFixed(6)},${Number(lat).toFixed(6)},4326${ULDK_RESULT}`;
  const uldkById = (id) => `${ULDK_URL}?request=GetParcelById&id=${encodeURIComponent(id)}${ULDK_RESULT}`;
  function ringAreaM2(ring) { // shoelace in local metres; ring: [[lat, lng], ...]
    const lat0 = mean(ring.map((p) => p[0])) * (Math.PI / 180), kx = 111320 * Math.cos(lat0), ky = 110540;
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][1] * kx * ring[i][0] * ky - ring[i][1] * kx * ring[j][0] * ky;
    return Math.abs(a / 2);
  }
  // ULDK answer "0\n<teryt>|<gmina>|<obręb>|<numer>|SRID=4326;POLYGON((lng lat,...))" -> plot, or null when there is none
  function uldkParse(text) {
    if (typeof text !== "string") return null;
    const lines = text.trim().split("\n");
    if (lines.length < 2 || lines[0].trim() !== "0") return null;
    const f = lines[1].split("|");
    if (f.length < 5) return null;
    const [id, gmina, obreb, number] = f.map((s) => s.trim());
    const m = /\(\(([^()]+)\)/.exec(f.slice(4).join("|")); // outer ring (POLYGON and MULTIPOLYGON)
    if (!m) return null;
    const ring = m[1].split(",").map((p) => p.trim().split(/\s+/).map(Number))
      .filter((p) => p.length >= 2 && isFinite(p[0]) && isFinite(p[1])).map(([x, y]) => [y, x]);
    const parts = id.split(".");
    if (ring.length < 3 || parts.length < 3) return null;
    let s = 90, n = -90, w = 180, e = -180;
    ring.forEach(([la, lo]) => { s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, lo); e = Math.max(e, lo); });
    return { id, number: number || parts[parts.length - 1], obreb, gmina, unit: parts[0], obrebNo: parts[1], ring,
      lngLat: ring.map(([la, lo]) => [lo, la]), bb: { s, n, w, e }, areaM2: ringAreaM2(ring) };
  }
  const parcelCache = new Map(); // id -> plot, oldest first, at most 300
  function parcelKeep(p) {
    parcelCache.delete(p.id); parcelCache.set(p.id, p);
    while (parcelCache.size > 300) parcelCache.delete(parcelCache.keys().next().value);
    return p;
  }
  const inParcel = (p, lat, lng) => lat >= p.bb.s && lat <= p.bb.n && lng >= p.bb.w && lng <= p.bb.e && pointInRing(p.lngLat, lat, lng);
  function parcelCached(lat, lng) {
    for (const p of parcelCache.values()) if (inParcel(p, lat, lng)) return p;
    return null;
  }
  async function uldkFetch(url, signal) {
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error("ULDK HTTP " + r.status);
    const p = uldkParse(await r.text());
    return p ? parcelKeep(p) : null;
  }
  // hover and click share one request slot: a newer request aborts the older one, but a hover never aborts a click
  const parcelReq = { ac: null, kind: null };
  function parcelAt(lat, lng, kind) {
    const hit = parcelCached(lat, lng);
    if (hit) return Promise.resolve(hit);
    if (parcelReq.ac) {
      if (kind === "hover" && parcelReq.kind === "pick") return Promise.resolve(undefined); // skipped, not "no plot"
      parcelReq.ac.abort();
    }
    const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 8000);
    parcelReq.ac = ac; parcelReq.kind = kind;
    return uldkFetch(uldkByXY(lat, lng), ac.signal).finally(() => { clearTimeout(timer); if (parcelReq.ac === ac) parcelReq.ac = null; });
  }
  // for extension modules (skCtx.uldk): the same parser and cache, with the module's own abort signal
  const parcelLookup = (lat, lng, signal) => { const hit = parcelCached(lat, lng); return hit ? Promise.resolve(hit) : uldkFetch(uldkByXY(lat, lng), signal); };
  const parcelLookupId = (id, signal) => (parcelCache.has(id) ? Promise.resolve(parcelCache.get(id)) : uldkFetch(uldkById(id), signal));
  // a plot in the shape the selection keeps (sel.parcel)
  const parcelOfSel = (p) => ({ id: p.id, number: p.number, obreb: p.obreb, gmina: p.gmina, unit: p.unit, obrebNo: p.obrebNo, ring: p.ring, areaM2: p.areaM2 });
  function ringCentre(ring) { // area centroid; the mean of the corners when the ring is degenerate
    let a = 0, x = 0, y = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const k = ring[j][1] * ring[i][0] - ring[i][1] * ring[j][0];
      a += k; x += (ring[j][1] + ring[i][1]) * k; y += (ring[j][0] + ring[i][0]) * k;
    }
    return Math.abs(a) > 1e-14 ? [y / (3 * a), x / (3 * a)] : [mean(ring.map((p) => p[0])), mean(ring.map((p) => p[1]))];
  }
  // grid cells a small ring touches: under its corners and under its centre (a plot can be smaller than one 73 m cell)
  function cellsTouching(ring) {
    const out = new Set();
    [...ring, ringCentre(ring)].forEach(([la, lo]) => { const c = landCell(la, lo); if (c) out.add(c.i); });
    return [...out];
  }

  /* ================= grey highlight under the cursor (mouse only, from zoom 16) ================= */
  const hov = { t: 0, layer: null, p: null, ll: null, ev: null, moving: false };
  const canHover = () => matchMedia("(hover: hover)").matches;
  function parcelHoverHide() {
    clearTimeout(hov.t);
    if (parcelReq.ac && parcelReq.kind === "hover") parcelReq.ac.abort();
    if (hov.layer) { map.removeLayer(hov.layer); hov.layer = null; }
    hov.p = null;
  }
  function parcelHoverShow(p) {
    if (hov.p === p) return;
    if (hov.layer) map.removeLayer(hov.layer);
    hov.p = p;
    hov.layer = L.polygon(p.ring, { pane: "parcelHover", interactive: false, color: "#3c4043", weight: 1.5, opacity: 0.9,
      fillColor: "#9aa0a6", fillOpacity: 0.18, lineJoin: "round" }).addTo(map);
    if (hov.ll && hov.ev) onHover({ latlng: hov.ll, originalEvent: hov.ev }); // the tip gets the plot's number
  }
  function parcelHoverMove(e) {
    if (!canHover() || draw.mode || hov.moving || map.getZoom() < PARCEL_ZOOM) { parcelHoverHide(); return; }
    hov.ll = e.latlng; hov.ev = e.originalEvent;
    const { lat, lng } = e.latlng;
    if (hov.p && inParcel(hov.p, lat, lng)) return; // still on the same plot
    clearTimeout(hov.t);
    const hit = parcelCached(lat, lng);
    if (hit) { parcelHoverShow(hit); return; }
    if (hov.layer) { map.removeLayer(hov.layer); hov.layer = null; hov.p = null; }
    hov.t = setTimeout(() => {
      if (hov.moving || draw.mode || map.getZoom() < PARCEL_ZOOM) return;
      parcelAt(lat, lng, "hover").then((p) => {
        if (p && hov.ll && !hov.moving && !draw.mode && map.getZoom() >= PARCEL_ZOOM && inParcel(p, hov.ll.lat, hov.ll.lng)) parcelHoverShow(p);
      }, () => {}); // an error or no answer: simply no highlight
    }, 200);
  }
  // first line of the hover tip while a plot is highlighted
  const parcelTipLine = (lat, lng) => (hov.p && inParcel(hov.p, lat, lng) ? esc(U().parcelTip(hov.p)) : null);
  function initParcels() {
    map.createPane("parcelHover"); map.getPane("parcelHover").style.zIndex = 655; map.getPane("parcelHover").style.pointerEvents = "none";
    map.on("mousemove", parcelHoverMove);
    map.on("mouseout", parcelHoverHide);
    document.addEventListener("mouseleave", parcelHoverHide);
    // no requests while the map is dragged or zoomed; the highlight stays where it is until the cursor moves again
    map.on("movestart zoomstart", () => { hov.moving = true; clearTimeout(hov.t); if (parcelReq.ac && parcelReq.kind === "hover") parcelReq.ac.abort(); });
    map.on("moveend zoomend", () => { hov.moving = false; if (map.getZoom() < PARCEL_ZOOM) parcelHoverHide(); });
  }

  /* ================= click: pick the plot ================= */
  let hintTimer = 0;
  function flashHint(txt) { // a short note in the drawing-hint box, without its Esc key
    if (draw.mode) return;
    $("#drawhint").classList.add("note");
    drawHint(txt);
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { if (!draw.mode) { drawHint(""); $("#drawhint").classList.remove("note"); } }, 2600);
  }
  let pickSeq = 0;
  function mapPick(e) {
    if (performance.now() <= draw.suppressUntil) return;
    const { lat, lng } = e.latlng;
    if (draw.mode === "circle") { const r = circleKm(); stopDraw(); selectPoint(lat, lng, null, { r }); return; }
    if (draw.mode) return; // the polygon tool handles its own clicks
    if (map.getZoom() < PARCEL_ZOOM) { map.flyTo(e.latlng, 17, { duration: 0.6 }); flashHint(U().zoomForParcel); return; }
    selectParcelAt(lat, lng);
  }
  // the plot at a point; when ULDK has none (road, water) or fails: the 1 km circle with a short note
  async function selectParcelAt(lat, lng, opts = {}) {
    const seq = ++pickSeq;
    let p = null;
    $("#map").classList.add("picking");
    try { p = await parcelAt(lat, lng, "pick"); } catch (err) { p = null; }
    $("#map").classList.remove("picking");
    if (seq !== pickSeq) return; // a newer click won
    if (p) await selectParcel(p, opts);
    else await selectPoint(lat, lng, opts.label || null, { note: "noParcel", zoom: opts.zoom ? 14 : 0 });
  }
  async function selectParcel(p, opts = {}) {
    state.finding = null;
    parcelHoverHide();
    selLayer.clearLayers();
    selOutline(p.ring, false);
    $("#tool-clear").disabled = false;
    const [cLat, cLng] = ringCentre(p.ring), f = areaAt(cLat, cLng);
    state.sel = { kind: "parcel", lat: cLat, lng: cLng, ring: p.ring, parcel: parcelOfSel(p), label: null, addr: opts.label || null,
      area: f ? f.properties.name : null, sq: [], ready: false };
    try { history.replaceState(null, "", `#dz=${p.id}`); } catch (e) { /* ignore */ } // shareable link to this plot
    if (opts.zoom) map.flyToBounds(L.latLngBounds(p.ring), { ...selPad(), maxZoom: opts.zoom, duration: 0.8 });
    await finishSelection(state.sel);
  }
  // #dz=<id> link: the plot by its land-register id
  async function openParcelId(id) {
    let p = null;
    try { p = await parcelLookupId(id); } catch (e) { p = null; }
    if (p) await selectParcel(p, { zoom: 18 });
    else flashHint(U().parcelNotFound);
  }

  /* ================= circle tool: radius from the zoom ================= */
  // about 0.17 of the map's shorter side (60-170 px), snapped to the nearest step on a log scale
  function circleKm() {
    const s = map.getSize(), px = clamp(0.17 * Math.min(s.x, s.y), 60, 170), c = map.getCenter();
    const mpp = (40075016.686 * Math.cos((c.lat * Math.PI) / 180)) / (256 * 2 ** map.getZoom());
    const km = (px * mpp) / 1000;
    return CIRCLE_KM.reduce((b, v) => (Math.abs(Math.log(v / km)) < Math.abs(Math.log(b / km)) ? v : b), 1);
  }
  const radiusLabel = (r) => (r < 1 ? `${Math.round(r * 1000)} m` : `${r} km`);
