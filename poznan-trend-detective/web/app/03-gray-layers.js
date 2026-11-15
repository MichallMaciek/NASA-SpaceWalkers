// SARnik core, part 3 of 32: grey-level PNG layers: decoding and loading (loadGray).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  const grayLoading = {}; // in-flight loads, so a click during start-up does not decode the same PNG twice
  // A grey-level PNG decoded from its own bytes, without a canvas. Brave and Firefox (private windows, strict tracking
  // protection) add noise to pixels read back from a canvas; a "no data" 0 that comes back as 1 or 2 would then count
  // as a measurement (in sar_egms: -99 mm a year). The bytes of the file are the same in every browser, and this
  // route needs no canvas memory. Every layer is 8-bit greyscale and not interlaced (tests/data_contract.py checks
  // the files); anything else throws, and loadGray falls back to the canvas.
  async function decodeGrayPNG(buf) {
    const b = new Uint8Array(buf), dv = new DataView(buf);
    if (b.length < 45 || dv.getUint32(0) !== 0x89504e47 || dv.getUint32(4) !== 0x0d0a1a0a) throw new Error("not a PNG");
    let w = 0, h = 0;
    const idat = [];
    for (let p = 8; p + 12 <= b.length;) {
      const len = dv.getUint32(p), type = dv.getUint32(p + 4);
      if (type === 0x49484452) { // IHDR: width, height, bit depth, colour type, compression, filter, interlace
        w = dv.getUint32(p + 8); h = dv.getUint32(p + 12);
        if (b[p + 16] !== 8 || b[p + 17] !== 0 || b[p + 20] !== 0) throw new Error("PNG is not 8-bit greyscale, non-interlaced");
      } else if (type === 0x49444154) idat.push(b.subarray(p + 8, p + 8 + len)); // IDAT: the compressed rows
      else if (type === 0x49454e44) break; // IEND
      p += 12 + len;
    }
    if (!w || !h || !idat.length) throw new Error("PNG without a picture");
    const raw = new Uint8Array(await new Response(new Blob(idat).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer());
    if (raw.length !== (w + 1) * h) throw new Error("PNG rows do not match its size");
    // each row: one filter byte, then w bytes that are stored as differences from the pixel to the left (a), the one
    // above (bb) and the one above-left (c), as the PNG standard defines
    const out = new Uint8Array(w * h);
    for (let y = 0, s = 0, o = 0; y < h; y++, s += w, o += w) {
      const f = raw[s++], up = o - w;
      if (f === 0) out.set(raw.subarray(s, s + w), o);
      else if (f === 1) { let a = 0; for (let x = 0; x < w; x++) a = out[o + x] = (raw[s + x] + a) & 255; }
      else if (f === 2) { for (let x = 0; x < w; x++) out[o + x] = (raw[s + x] + (y ? out[up + x] : 0)) & 255; }
      else if (f === 3) { let a = 0; for (let x = 0; x < w; x++) a = out[o + x] = (raw[s + x] + ((a + (y ? out[up + x] : 0)) >> 1)) & 255; }
      else if (f === 4) {
        let a = 0, c = 0;
        for (let x = 0; x < w; x++) {
          const bb = y ? out[up + x] : 0, pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
          c = bb; a = out[o + x] = (raw[s + x] + pred) & 255;
        }
      } else throw new Error("PNG row filter");
    }
    return out;
  }
  // One grey-level PNG of data/land as a Uint8Array (one value per cell), kept in L8[name].
  // `low === true` marks a download made ahead of need: the browser then lets the map tiles and anything asked for
  // directly go first. (Only the literal true counts: names.map(loadGray) passes the array index as second argument.)
  function loadGray(name, low) {
    if (L8[name]) return Promise.resolve(L8[name]);
    if (grayLoading[name]) return grayLoading[name];
    const url = `data/${name.includes("/") ? "" : "land/"}${name}.png?v=${DATA_V}`; // a name with a folder: data/<name>.png
    const viaBytes = () => fetch(url, low === true ? { priority: "low" } : undefined)
      .then((r) => { if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`); return r.arrayBuffer(); })
      .then((buf) => decodeGrayPNG(buf).catch((e) => { e.png = true; throw e; }));
    // the older route, for browsers without DecompressionStream: an image drawn to a canvas and read back
    const viaCanvas = () => new Promise((res, rej) => {
      const img = new Image();
      if (low === true) img.fetchPriority = "low";
      img.onload = () => {
        try {
          const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
          const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
          const d = x.getImageData(0, 0, img.width, img.height).data, out = new Uint8Array(img.width * img.height);
          for (let i = 0; i < out.length; i++) out[i] = d[i * 4];
          c.width = c.height = 0; // hand the pixel store back at once: phones cap the canvas memory of a page
          res(out);
        } catch (e) { rej(e); }
      };
      img.onerror = () => rej(new Error(name));
      img.src = url;
    });
    // a file this decoder cannot read goes to the canvas at once; a lost request gets one quiet second try, as the JSON files do
    const attempt = () => (typeof DecompressionStream === "function" ? viaBytes().catch((e) => { if (e && e.png) return viaCanvas(); throw e; }) : viaCanvas());
    const pr = attempt().catch(() => sleep(1200).then(attempt)).then((out) => (L8[name] = out));
    grayLoading[name] = pr;
    pr.then(() => delete grayLoading[name], () => delete grayLoading[name]);
    return pr;
  }
