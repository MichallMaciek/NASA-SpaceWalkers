// SARnik core, part 2 of 32: data: grid geometry, projections, cells, municipalities and flood polygons.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= data ================= */
  let study, gL, gN, areas, land, flood;
  // gL and gN (the two MODIS grids: summer heat and greenness, 5 MB of JSON) are not needed for the first view.
  // They arrive later through loadGrids(); until then gL, gN, geo.L and geo.N are undefined, and gridsOK() says so.
  const geo = {};
  const L8 = {};
  const smooth = {}; // smoothed built-up intensity per epoch (Float32Array)

  function sinuToLatLng(x, y) { const lat = y / R_SIN; return [lat * 180 / Math.PI, (x / (R_SIN * Math.cos(lat))) * 180 / Math.PI]; }
  function latLngToSinu(lat, lng) { const la = lat * Math.PI / 180; return [R_SIN * (lng * Math.PI / 180) * Math.cos(la), R_SIN * la]; }
  function latLngToMerc(lat, lng) { return [R_MERC * lng * Math.PI / 180, R_MERC * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2))]; }
  function mercToLatLng(x, y) { return [(2 * Math.atan(Math.exp(y / R_MERC)) - Math.PI / 2) * 180 / Math.PI, (x / R_MERC) * 180 / Math.PI]; }

  function buildGeometry(g) {
    const [a, b, c, d, e, f] = g.transform, n = g.rows * g.cols;
    const corners = new Float64Array(n * 8), bb = new Float64Array(n * 4), centre = new Float64Array(n * 2);
    for (let r = 0; r < g.rows; r++) for (let col = 0; col < g.cols; col++) {
      const i = r * g.cols + col;
      let a0 = 90, a1 = -90, o0 = 180, o1 = -180;
      [[col, r], [col + 1, r], [col + 1, r + 1], [col, r + 1]].forEach(([cc, rr], k) => {
        const [la, lo] = sinuToLatLng(a * cc + b * rr + c, d * cc + e * rr + f);
        corners[i * 8 + k * 2] = la; corners[i * 8 + k * 2 + 1] = lo;
        a0 = Math.min(a0, la); a1 = Math.max(a1, la); o0 = Math.min(o0, lo); o1 = Math.max(o1, lo);
      });
      bb[i * 4] = a0; bb[i * 4 + 1] = a1; bb[i * 4 + 2] = o0; bb[i * 4 + 3] = o1;
      const [cla, clo] = sinuToLatLng(a * (col + 0.5) + b * (r + 0.5) + c, d * (col + 0.5) + e * (r + 0.5) + f);
      centre[i * 2] = cla; centre[i * 2 + 1] = clo;
    }
    return { corners, bb, centre };
  }
  function cellAt(g, lat, lng) {
    const [x, y] = latLngToSinu(lat, lng), [a, , c, , e, f] = g.transform;
    const col = Math.floor((x - c) / a), row = Math.floor((y - f) / e);
    return row < 0 || col < 0 || row >= g.rows || col >= g.cols ? -1 : row * g.cols + col;
  }
  function landCell(lat, lng) {
    const [x, y] = latLngToMerc(lat, lng), [a, , c, , e, f] = land.transform3857;
    const col = Math.floor((x - c) / a), row = Math.floor((y - f) / e);
    return row < 0 || col < 0 || row >= land.height || col >= land.width ? null : { row, col, i: row * land.width + col };
  }
  const rings = (geom) => (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates);
  function pointInRing(ring, lat, lng) { // ring as [[lng, lat], ...]
    let ins = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) ins = !ins;
    }
    return ins;
  }
  // Bounding box of each municipality, worked out once. A point outside the box cannot be inside the outline, so the
  // box test spares the walk along thousands of border points for most point/area pairs; the answer does not change.
  const areaBox = new WeakMap();
  function boxOf(f) {
    let b = areaBox.get(f);
    if (!b) {
      b = [Infinity, Infinity, -Infinity, -Infinity]; // west, south, east, north
      rings(f.geometry).forEach((poly) => poly[0].forEach(([x, y]) => { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }));
      areaBox.set(f, b);
    }
    return b;
  }
  const inArea = (f, lat, lng) => {
    const b = boxOf(f);
    return lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3] && rings(f.geometry).some((poly) => pointInRing(poly[0], lat, lng));
  };
  // official groundwater-flood areas (PIG-PIB): inside an outer ring and not inside one of its holes (with fast bbox filter)
  const inFlood = (lat, lng) => !!(flood && flood.features && flood.features.some((f) => {
    const b = boxOf(f);
    if (lng < b[0] || lng > b[2] || lat < b[1] || lat > b[3]) return false;
    return rings(f.geometry).some((poly) => pointInRing(poly[0], lat, lng) && !poly.slice(1).some((h) => pointInRing(h, lat, lng)));
  }));
  const areaAt = (lat, lng) => areas.features.find((f) => inArea(f, lat, lng)) || null;
  const areaStats = (name) => study.areas.find((a) => a.name === name);

