// SARnik core, part 21a: plots from the land register (ULDK, GUGiK): one lookup with a cache, the grey highlight under
// the cursor, a click that picks the plot, #dz= links, and the radius of the circle tool.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= plots (ULDK) ================= */
  // ULDK is a public service (CORS open): ask only when needed. A click asks once; the hover uses the KIEG bitmap below
  // (ULDK only without it, after a 600 ms rest); a plot already fetched answers from memory (point in polygon), and at
  // most one hover or click request runs at a time.
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

  /* ================= plot boundaries as one bitmap per view (KIEG WMS, GUGiK) ================= */
  // The hover highlight needs no request per plot: when the map settles at zoom 16+, one transparent PNG of the plot
  // boundaries (1 px lines) for the view plus a margin comes from KIEG; under the cursor a flood fill finds the plot's
  // pixels and their outline becomes the grey polygon. ULDK is asked on a click (exact geometry and id), and on hover only
  // while there is no bitmap (it failed, or the cursor is outside it).
  const KIEG_URL = "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=dzialki&STYLES=&SRS=EPSG:2180&FORMAT=image/png&TRANSPARENT=TRUE";
  // EPSG:2180 (PUWG 1992), the only system KIEG serves: transverse Mercator on GRS80, lon0 19°, k0 0.9993 (Snyder's
  // series). fwd(lat, lng) -> [x east, y north] in metres; inv(x, y) -> [lat, lng], refined against fwd (round trip < 1e-12°)
  const PUWG = (() => {
    const a = 6378137, f = 1 / 298.257222101, e2 = f * (2 - f), ep2 = e2 / (1 - e2), k0 = 0.9993, L0 = (19 * Math.PI) / 180, D = Math.PI / 180;
    const e4 = e2 * e2, e6 = e4 * e2, m0 = 1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256, s1 = Math.sqrt(1 - e2), e1 = (1 - s1) / (1 + s1);
    const arc = (p) => a * (m0 * p - ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * p) + ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * p) - ((35 * e6) / 3072) * Math.sin(6 * p));
    function fwd(lat, lng) {
      const p = lat * D, s = Math.sin(p), c = Math.cos(p), t = Math.tan(p), N = a / Math.sqrt(1 - e2 * s * s), T = t * t, C = ep2 * c * c, A = (lng * D - L0) * c;
      const x = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120);
      const y = k0 * (arc(p) + N * t * ((A * A) / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
      return [500000 + x, y - 5300000];
    }
    function inv0(X, Y) {
      const mu = (Y + 5300000) / k0 / (a * m0), x = X - 500000;
      const p1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
      const s = Math.sin(p1), c = Math.cos(p1), t = Math.tan(p1), C = ep2 * c * c, T = t * t, q = 1 - e2 * s * s, N = a / Math.sqrt(q), R = (a * (1 - e2)) / (q * Math.sqrt(q)), d = x / (N * k0);
      const lat = p1 - ((N * t) / R) * ((d * d) / 2 - ((5 + 3 * T + 10 * C - 4 * C * C - 9 * ep2) * d ** 4) / 24 + ((61 + 90 * T + 298 * C + 45 * T * T - 252 * ep2 - 3 * C * C) * d ** 6) / 720);
      const lng = L0 + (d - ((1 + 2 * T + C) * d ** 3) / 6 + ((5 - 2 * C + 28 * T - 3 * C * C + 8 * ep2 + 24 * T * T) * d ** 5) / 120) / c;
      return [lat / D, lng / D];
    }
    function inv(X, Y) {
      const g = inv0(X, Y);
      let [la, lo] = g;
      for (let k = 0; k < 2; k++) { const r = inv0(...fwd(la, lo)); la += g[0] - r[0]; lo += g[1] - r[1]; }
      return [la, lo];
    }
    return { fwd, inv };
  })();
  // bm: { w, h, minx, maxx, miny, maxy, rx, ry (metres per pixel), line: 1 = boundary pixel, mark: fill generation }
  const pbm = { bm: null, ac: null, t: 0, busy: false, gen: 0, regions: new Map(), dead: null };
  const PBM_CAP = 300000; // pixels: a bigger fill is not one plot (or the lines have a gap)
  function pbmSchedule() { // after the map settles: one bitmap for the view, 300 ms later
    clearTimeout(pbm.t);
    if (pbm.ac) { pbm.ac.abort(); pbm.ac = null; }
    pbm.busy = canHover() && map.getZoom() >= PARCEL_ZOOM;
    if (pbm.busy) pbm.t = setTimeout(pbmLoad, 300);
  }
  async function pbmLoad() {
    if (hov.moving || map.getZoom() < PARCEL_ZOOM) { pbm.busy = false; return; }
    const sz = map.getSize(), b = map.getBounds(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cs = [b.getSouthWest(), b.getNorthWest(), b.getNorthEast(), b.getSouthEast()].map((c) => PUWG.fwd(c.lat, c.lng));
    const xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]);
    const v = { minx: Math.min(...xs), maxx: Math.max(...xs), miny: Math.min(...ys), maxy: Math.max(...ys) };
    const mx = (v.maxx - v.minx) * 0.125, my = (v.maxy - v.miny) * 0.125, k = Math.min(1, 2048 / (1.25 * dpr * Math.max(sz.x, sz.y)));
    const w = Math.max(1, Math.round(sz.x * 1.25 * dpr * k)), h = Math.max(1, Math.round(sz.y * 1.25 * dpr * k));
    const q = { minx: v.minx - mx, maxx: v.maxx + mx, miny: v.miny - my, maxy: v.maxy + my }, res = (q.maxx - q.minx) / w, old = pbm.bm;
    // the bitmap we have already covers the view at a similar resolution
    if (old && v.minx >= old.minx && v.maxx <= old.maxx && v.miny >= old.miny && v.maxy <= old.maxy && old.rx / res > 0.7 && old.rx / res < 1.4) { pbm.busy = false; return; }
    // KIEG redirects some counties to their own server without CORS (powiat poznański): do not ask again for that area
    const cx = (v.minx + v.maxx) / 2, cy = (v.miny + v.maxy) / 2, dead = pbm.dead;
    if (dead && cx > dead.minx && cx < dead.maxx && cy > dead.miny && cy < dead.maxy) { pbm.busy = false; return; }
    const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 8000);
    pbm.ac = ac;
    try {
      const url = `${KIEG_URL}&BBOX=${[q.minx, q.miny, q.maxx, q.maxy].map((n) => n.toFixed(1)).join(",")}&WIDTH=${w}&HEIGHT=${h}`;
      const r = await fetch(url, { signal: ac.signal });
      if (!r.ok || !/^image\//.test(r.headers.get("content-type") || "")) throw new Error("KIEG " + r.status); // a ServiceException comes as XML
      const img = await createImageBitmap(await r.blob());
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const g = cv.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, w, h);
      if (img.close) img.close();
      const px = g.getImageData(0, 0, w, h).data, line = new Uint8Array(w * h);
      for (let i = 0; i < line.length; i++) line[i] = px[i * 4 + 3] >= 60 ? 1 : 0;
      if (pbm.ac !== ac) return;
      pbm.bm = { w, h, ...q, rx: res, ry: (q.maxy - q.miny) / h, line, mark: new Uint32Array(w * h) };
      pbm.regions.clear();
    } catch (e) { if (e instanceof TypeError && pbm.ac === ac) pbm.dead = q; /* else aborted, timed out or not an image */ } finally { // no bitmap: the hover falls back to ULDK
      clearTimeout(timer);
      if (pbm.ac === ac) {
        pbm.ac = null; pbm.busy = false;
        if (hov.ll && hov.ev) parcelHoverMove({ latlng: hov.ll, originalEvent: hov.ev }); // the cursor rests: highlight now
      }
    }
  }
  // the plot under a point from the bitmap: { region, ring } | null (on a line, or not one plot) | undefined (no bitmap here)
  function pbmAt(lat, lng) {
    const bm = pbm.bm;
    if (!bm) return undefined;
    const [x, y] = PUWG.fwd(lat, lng), px = Math.floor((x - bm.minx) / bm.rx), py = Math.floor((bm.maxy - y) / bm.ry);
    if (px < 0 || py < 0 || px >= bm.w || py >= bm.h) return undefined;
    const i = py * bm.w + px;
    if (bm.line[i]) return null;
    if (bm.mark[i] && pbm.regions.has(bm.mark[i])) return pbm.regions.get(bm.mark[i]); // filled before: same region
    const reg = pbmFill(bm, px, py);
    pbm.regions.set(reg.gen, reg.ring ? reg : null);
    while (pbm.regions.size > 200) pbm.regions.delete(pbm.regions.keys().next().value);
    return pbm.regions.get(reg.gen);
  }
  // scanline flood fill (4-connected) over non-boundary pixels, then the outer contour, simplified, in lat/lng
  function pbmFill(bm, sx, sy) {
    const { w, h, line, mark } = bm, gen = ++pbm.gen, stack = [sx, sy];
    const free = (j) => !line[j] && mark[j] !== gen;
    let n = 0, ty = sy, tx = sx;
    while (stack.length) {
      const y = stack.pop(), x = stack.pop(), row = y * w;
      if (!free(row + x)) continue;
      let l = x, r = x;
      while (l > 0 && free(row + l - 1)) l--;
      while (r < w - 1 && free(row + r + 1)) r++;
      for (let k = l; k <= r; k++) mark[row + k] = gen;
      n += r - l + 1;
      if (n > PBM_CAP) return { gen, ring: null };
      if (y < ty || (y === ty && l < tx)) { ty = y; tx = l; }
      for (const ny of [y - 1, y + 1]) {
        if (ny < 0 || ny >= h) continue;
        const nr = ny * w;
        for (let k = l; k <= r; k++) {
          if (!free(nr + k)) continue;
          stack.push(k, ny);
          while (k <= r && free(nr + k)) k++;
        }
      }
    }
    // walk the pixel edges with the region on the right, from the top-left corner of its top-left pixel (E S W N)
    const ins = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mark[y * w + x] === gen;
    const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
    const AL = [[0, -1], [0, 0], [-1, 0], [-1, -1]], AR = [[0, 0], [-1, 0], [-1, -1], [0, -1]]; // pixels ahead, left and right
    const pts = [[tx, ty]];
    let x = tx, y = ty, d = 0;
    for (let guard = 0; guard < 4 * PBM_CAP; guard++) {
      const nd = !ins(x + AR[d][0], y + AR[d][1]) ? (d + 1) % 4 : ins(x + AL[d][0], y + AL[d][1]) ? (d + 3) % 4 : d;
      if (nd !== d && (x !== tx || y !== ty)) pts.push([x, y]);
      d = nd; x += DX[d]; y += DY[d];
      if (x === tx && y === ty) break;
    }
    const ring = pbmSimplify(pts, 0.75).map(([px, py]) => PUWG.inv(bm.minx + px * bm.rx, bm.maxy - py * bm.ry));
    return { gen, region: true, ring: ring.length >= 3 ? ring : null };
  }
  function pbmSimplify(pts, tol) { // Douglas-Peucker on a closed ring of pixel corners
    if (pts.length < 4) return pts;
    const keep = new Uint8Array(pts.length + 1), P = [...pts, pts[0]];
    // a closed ring: split at the corner farthest from the start so the two halves are open lines
    let far = 0, fd = -1;
    P.forEach((p, i) => { const dd = (p[0] - P[0][0]) ** 2 + (p[1] - P[0][1]) ** 2; if (dd > fd) { fd = dd; far = i; } });
    keep[0] = keep[far] = 1;
    const st = [[0, far], [far, P.length - 1]];
    while (st.length) {
      const [i0, i1] = st.pop(), [ax, ay] = P[i0], [bx, by] = P[i1], L2 = Math.hypot(bx - ax, by - ay) || 1;
      let mi = -1, md = tol;
      for (let i = i0 + 1; i < i1; i++) {
        const dd = Math.abs((bx - ax) * (ay - P[i][1]) - (ax - P[i][0]) * (by - ay)) / L2;
        if (dd > md) { md = dd; mi = i; }
      }
      if (mi > 0) { keep[mi] = 1; st.push([i0, mi], [mi, i1]); }
    }
    return P.filter((p, i) => keep[i] && i < P.length - 1);
  }

  /* ================= grey highlight under the cursor (mouse only, from zoom 16) ================= */
  const hov = { t: 0, layer: null, p: null, ll: null, ev: null, moving: false };
  const canHover = () => matchMedia("(hover: hover)").matches;
  function parcelHoverOff() { if (hov.layer) { map.removeLayer(hov.layer); hov.layer = null; } hov.p = null; }
  function parcelHoverHide() {
    clearTimeout(hov.t);
    if (parcelReq.ac && parcelReq.kind === "hover") parcelReq.ac.abort();
    parcelHoverOff();
    hov.ll = null;
  }
  // p: a ULDK plot, or a bitmap region { region, ring } (same look)
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
    const reg = pbmAt(lat, lng); // instant, no request
    if (reg !== undefined) { clearTimeout(hov.t); if (reg) parcelHoverShow(reg); else parcelHoverOff(); return; }
    // no bitmap here: ULDK after a 600 ms rest (a plot already fetched answers from memory)
    if (hov.p && !hov.p.region && inParcel(hov.p, lat, lng)) return; // still on the same plot
    clearTimeout(hov.t);
    const hit = parcelCached(lat, lng);
    if (hit) { parcelHoverShow(hit); return; }
    parcelHoverOff();
    hov.t = setTimeout(() => {
      if (hov.moving || draw.mode || map.getZoom() < PARCEL_ZOOM || pbm.busy) return; // a bitmap on its way re-runs the hover
      parcelAt(lat, lng, "hover").then((p) => {
        if (p && hov.ll && !hov.moving && !draw.mode && map.getZoom() >= PARCEL_ZOOM && inParcel(p, hov.ll.lat, hov.ll.lng)) parcelHoverShow(p);
      }, () => {}); // an error or no answer: simply no highlight
    }, 600);
  }
  // first line of the hover tip while a plot is highlighted; a bitmap region has a number only when ULDK answered before
  const parcelTipLine = (lat, lng) => {
    if (!hov.p) return null;
    const p = hov.p.region ? parcelCached(lat, lng) : inParcel(hov.p, lat, lng) ? hov.p : null;
    return p ? esc(U().parcelTip(p)) : null;
  };
  // a thin bar along the top of the map while the base map's tiles load
  function tileBar() {
    const busy = new Set(), upd = () => $("#map").classList.toggle("tiles-loading", busy.size > 0);
    const hook = (l) => {
      if (!l || l.skTileBar || !(l instanceof L.GridLayer)) return;
      l.skTileBar = true;
      l.on("loading", () => { busy.add(l); upd(); });
      l.on("load remove", () => { busy.delete(l); upd(); });
      if (l.isLoading && l.isLoading()) { busy.add(l); upd(); }
    };
    Object.values(bases).forEach((l) => l && map.hasLayer(l) && hook(l));
    map.on("layeradd", (e) => { if (Object.values(bases).includes(e.layer)) hook(e.layer); });
  }
  function initParcels() {
    map.createPane("parcelHover"); map.getPane("parcelHover").style.zIndex = 655; map.getPane("parcelHover").style.pointerEvents = "none";
    map.on("mousemove", parcelHoverMove);
    map.on("mouseout", parcelHoverHide);
    document.addEventListener("mouseleave", parcelHoverHide);
    // no requests while the map is dragged or zoomed; the highlight stays where it is until the cursor moves again
    map.on("movestart zoomstart", () => {
      hov.moving = true; clearTimeout(hov.t); clearTimeout(pbm.t);
      if (parcelReq.ac && parcelReq.kind === "hover") parcelReq.ac.abort();
      if (pbm.ac) { pbm.ac.abort(); pbm.ac = null; }
      pbm.busy = false;
    });
    map.on("moveend zoomend", () => { hov.moving = false; if (map.getZoom() < PARCEL_ZOOM) parcelHoverHide(); pbmSchedule(); });
    tileBar();
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
  // feedback at once, before the land register answers: a dot at the click point and the card in its loading state
  let pickDot = null;
  function parcelPickShow(lat, lng) {
    if (pickDot) map.removeLayer(pickDot);
    pickDot = L.circleMarker([lat, lng], { pane: "parcelHover", interactive: false, radius: 6, color: "#fff", weight: 2,
      fillColor: css("--ink"), fillOpacity: 0.85, className: "parcel-pick-dot" }).addTo(map);
    const box = $("#sidecard");
    if (box.querySelector(".findings")) findingsTop = box.scrollTop;
    box.classList.remove("min");
    box.scrollTop = 0;
    box.innerHTML = `<h2>${esc(U().selectedPlace)}</h2><p class="sub">${U().loading}</p>`;
  }
  async function selectParcelAt(lat, lng, opts = {}) {
    const seq = ++pickSeq;
    let p = null;
    $("#map").classList.add("picking");
    parcelPickShow(lat, lng);
    try { p = await parcelAt(lat, lng, "pick"); } catch (err) { p = null; }
    $("#map").classList.remove("picking");
    if (seq === pickSeq && pickDot) { map.removeLayer(pickDot); pickDot = null; } // the outline or the circle is drawn next
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
