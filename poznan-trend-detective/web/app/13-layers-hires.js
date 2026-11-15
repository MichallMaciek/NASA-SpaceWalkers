// SARnik core, part 13 of 32: data layers, part 1: sharp (hires) radar pictures.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= rendering of the data layers ================= */
  // Sharp radar pictures (build_hires.py): the same grey-level products on a grid `hires.scale` times finer (about 24 m on
  // the ground), cut to `hires.window` (Poznań city and about 1 km around it, in cells of the 120 m grid). Only the drawing uses
  // them; every number in the card still comes from the 120 m products. Outside the window the 120 m picture is drawn.
  const HIRES_SRC = {
    alos: () => lbandNames(state.lyr.alos.y),
    sarchange: () => ["sar_change", "sar_dratio"],
    nisarwet: () => ["nisar_wetdry"],
  };
  const HIRES_ZOOM = 12; // from this zoom a 120 m cell is wider than about 4 screen pixels, so the sharp picture starts to show
  const hiresWindow = () => hires.window || [0, 0, land.width, land.height];
  function hiresWanted() { // fetch the sharp files only when they can be seen: zoomed in, with the window on screen
    if (!map || map.getZoom() < HIRES_ZOOM) return false;
    const [a, , c, , e, f] = land.transform3857, [wc, wr, ww, wh] = hiresWindow();
    return map.getBounds().intersects(L.latLngBounds(mercToLatLng(c + wc * a, f + (wr + wh) * e), mercToLatLng(c + (wc + ww) * a, f + wr * e)));
  }
  const hiresFailed = new Set();
  let busyN = 0;
  const setBusy = (d) => { busyN = Math.max(0, busyN + d); const tl = $("#timeline"); if (tl) tl.classList.toggle("busy", busyN > 0); };
  function hiresArrays(k) {
    if (!hires || !HIRES_SRC[k]) return null;
    const names = HIRES_SRC[k]();
    if (!names.every((nm) => hires.layers.includes(nm))) return null;
    const arrs = names.map((nm) => L8[`hr_${nm}`]);
    if (arrs.every(Boolean)) return arrs;
    if (!hiresWanted() || names.some((nm) => hiresFailed.has(nm))) return null; // a file that failed once is not fetched on every redraw
    // draw the 120 m picture meanwhile; the caption under the year pulses until the sharp one arrives
    setBusy(1);
    Promise.all(names.map((nm) => loadGray(`hr_${nm}`))).then(redraw)
      .catch(() => names.forEach((nm) => hiresFailed.add(nm))).finally(() => setBusy(-1));
    return null;
  }
  // after a pan or zoom: start loading the sharp picture if it became visible
  const hiresPoke = () => {
    if (hires && hiresWanted() && Object.keys(HIRES_SRC).some((k) => state.lyr[k].on && ready(k) &&
      HIRES_SRC[k]().some((nm) => hires.layers.includes(nm) && !L8[`hr_${nm}`] && !hiresFailed.has(nm)))) redraw();
  };
  const rgba32 = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0; // canvas memory is little-endian
  // The whole grid is drawn on the fine canvas: 120 m cells as blocks, and inside the window the sharp pixels instead.
  // Table lookups and one 32-bit write per pixel keep this near 30 ms; nothing is redrawn when nothing changed.
  function renderLandHi(k, arrs) {
    const o = overlay(k), S = hires.scale, w = land.width, h = land.height, W2 = w * S, H2 = h * S, st = L8.study, s = state.lyr[k];
    const names = HIRES_SRC[k](), key = `${k}|${names.join()}|${s.min ?? ""}`;
    if (o.hiKey === key && o.canvas.width === W2) return;
    if (o.canvas.width !== W2) { o.canvas.width = W2; o.canvas.height = H2; }
    if (!o.imgHi) { o.imgHi = o.ctx.createImageData(W2, H2); o.hi32 = new Uint32Array(o.imgHi.data.buffer); }
    const out = o.hi32, [wc, wr, ww, wh] = hiresWindow(), FW = ww * S;
    const C0 = L8[names[0]], C1 = names[1] ? L8[names[1]] : null, F0 = arrs[0], F1 = arrs[1] || null;
    let px2; // (first byte, second byte) -> packed colour, 0 = transparent; the same rule for coarse cells and sharp pixels
    if (k === "alos") {
      const [c0, c1, x0, x1, r0, r1] = RGB_STRETCH[s.y === 2026 ? "nisar" : "alos"];
      const sc = (v, a, b) => clamp(((v - a) / (b - a)) * 255, 0, 255) | 0;
      const R = new Uint8Array(256), G = new Uint8Array(256), B = new Uint8Array(511);
      for (let v = 1; v < 256; v++) { R[v] = sc(dbOf(v), c0, c1); G[v] = sc(dbOf(v), x0, x1); }
      for (let d = -255; d <= 255; d++) B[d + 255] = sc(d / 6, r0, r1); // co minus cross in dB = (byte difference) / 6
      px2 = (a, b) => (a && b ? ((235 << 24) | (B[a - b + 255] << 16) | (G[b] << 8) | R[a]) >>> 0 : 0);
    } else if (k === "sarchange") {
      const wall = lutFor(RAMPS.up), soft = lutFor(RAMPS.upSoft), dn = lutFor(RAMPS.down);
      const dThr = Math.ceil(((sar.s1.wall_db || 1.5) + 10) * 12.75); // ratio byte from which the change is a wall (double bounce)
      const lutW = new Uint32Array(256), lutS = new Uint32Array(256);
      for (let v = 1; v < 256; v++) {
        const d = changeOf(v);
        if (Math.abs(d) < s.min) continue;
        const t = clamp((Math.abs(d) - s.min) / 6, 0, 1), j = ((t * 255) | 0) * 3;
        const col = (L, a) => rgba32(L[j], L[j + 1], L[j + 2], a | 0);
        if (d < 0) lutW[v] = lutS[v] = col(dn, 130 + t * 60);
        else { lutW[v] = col(wall, 190 + t * 60); lutS[v] = col(soft, 130 + t * 60); }
      }
      px2 = (a, d) => (a ? (d >= dThr ? lutW : lutS)[a] : 0);
    } else {
      const wet = lutFor(RAMPS.wet), dry = lutFor(RAMPS.brown), lut = new Uint32Array(256);
      for (let v = 1; v < 256; v++) {
        const d = changeOf(v);
        if (Math.abs(d) < s.min) continue;
        const t = clamp((Math.abs(d) - s.min) / 6, 0, 1), L = d > 0 ? wet : dry, j = ((t * 255) | 0) * 3;
        lut[v] = rgba32(L[j], L[j + 1], L[j + 2], (140 + t * 100) | 0);
      }
      px2 = (a) => lut[a];
    }
    const row = new Uint32Array(W2);
    for (let r = 0; r < h; r++) {
      const cr = r * w, inWin = r >= wr && r < wr + wh;
      for (let c = 0, x = 0; c < w; c++) { // one fine row of 120 m cells, each repeated S times
        const i = cr + c, p = st[i] ? px2(C0[i], C1 ? C1[i] : 0) : 0;
        for (let e = x + S; x < e; x++) row[x] = p;
      }
      for (let sy = 0; sy < S; sy++) {
        const base = (r * S + sy) * W2;
        out.set(row, base);
        if (!inWin) continue;
        const fb = ((r - wr) * S + sy) * FW; // sharp pixels replace the blocks inside the window
        for (let c = wc; c < wc + ww; c++) {
          if (!st[cr + c]) continue;
          for (let fx = fb + (c - wc) * S, e = fx + S, x = base + c * S; fx < e; fx++, x++) out[x] = px2(F0[fx], F1 ? F1[fx] : 0);
        }
      }
    }
    o.ctx.putImageData(o.imgHi, 0, 0);
    o.hiKey = key;
  }

