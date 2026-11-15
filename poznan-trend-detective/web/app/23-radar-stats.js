// SARnik core, part 23 of 32: radar numbers for a selection (sarStats, sarSeries, radarChart).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= radar numbers for a selection (v2) ================= */
  const pw10 = (db) => 10 ** (db / 10);
  function sarStats(cells) {
    const ch = L8.sar_change, dr = L8.sar_dratio, we = L8.sar_wet, wa = L8.sar_water, eg = L8.sar_egms, rc = sar.s1.r_crit, wd = sar.s1.wall_db || 1.5;
    let nCh = 0, sCh = 0, up = 0, dn = 0, wl = 0, nW = 0, wetN = 0, nWa = 0, waN = 0;
    const egv = [];
    for (const i of cells) {
      if (ch[i]) { const d = changeOf(ch[i]); nCh++; sCh += d; if (d >= 3) { up++; if (dr[i] && changeOf(dr[i]) >= wd) wl++; } else if (d <= -3) dn++; }
      if (we[i]) { nW++; if (wetOf(we[i]) > rc) wetN++; }
      if (wa[i]) { nWa++; if (waterOf(wa[i]) >= 0.2) waN++; }
      if (eg[i]) egv.push(egmsOf(eg[i]));
    }
    egv.sort((a, b) => a - b);
    const ys = sar.alos.years, y0 = ys[0], y1 = ys[ys.length - 1], h0 = L8[`alos_hv_${y0}`], h1 = L8[`alos_hv_${y1}`];
    let p0 = 0, p1 = 0, nA = 0;
    for (const i of cells) if (h0[i] && h1[i]) { p0 += pw10(dbOf(h0[i])); p1 += pw10(dbOf(h1[i])); nA++; }
    let nN = 0, sN = 0, upN = 0;
    if (sar.nisar && L8.nisar_wetdry) for (const i of cells) { const v = L8.nisar_wetdry[i]; if (v) { const d = changeOf(v); nN++; sN += d; if (d >= 2) upN++; } }
    return {
      nisarWet: nN ? sN / nN : NaN, nisarWetUp: nN ? upN / nN : NaN, nisarOpen: nN,
      meanCh: nCh ? sCh / nCh : NaN, up: nCh ? up / nCh : NaN, dn: nCh ? dn / nCh : NaN, walls: nCh ? wl / nCh : NaN,
      wet: nW ? wetN / nW : NaN, water: nWa ? waN / nWa : NaN,
      egMed: egv.length ? egv[egv.length >> 1] : NaN, egMin: egv.length ? egv[0] : NaN, egN: egv.length,
      dHV: nA ? 10 * Math.log10(p1 / nA) - 10 * Math.log10(p0 / nA) : NaN, y0, y1,
    };
  }
  // VV and VH of every pass for the selection, from the 480 m sheet (power-averaged)
  function sarSeries(cells, which = "s1") {
    const S = which === "nisar" ? sar.nisar.series : sar.s1.series, sh = which === "nisar" ? L8.nisar_series : L8.sar_series;
    const W2 = 2 * S.bw, w = land.width, blocks = new Set();
    for (const i of cells) blocks.add(((Math.floor(i / w) / S.block) | 0) * S.bw + (((i % w) / S.block) | 0));
    const vv = [], vh = [];
    for (let k = 0; k < S.n; k++) {
      let a = 0, b = 0, na = 0, nb = 0;
      for (const bi of blocks) {
        const row = (k * S.bh + ((bi / S.bw) | 0)) * W2, c = bi % S.bw, x = sh[row + c], y = sh[row + S.bw + c];
        if (x) { a += pw10(dbOf(x)); na++; }
        if (y) { b += pw10(dbOf(y)); nb++; }
      }
      vv.push(na ? 10 * Math.log10(a / na) : NaN); vh.push(nb ? 10 * Math.log10(b / nb) : NaN);
    }
    return { vv, vh };
  }
  const dayNum = (d) => Date.parse(`${d}T12:00:00Z`) / 864e5;
  function radarChart(ser, nser) {
    const u = U(), W = 340, H = 92, top = 4, lineH = 58, barTop = 66, barH = 16;
    const dates = sar.s1.dates, t0 = dayNum(dates[0]) - 2, t1 = dayNum(dates[dates.length - 1]) + 2;
    const GX = 34; // left gutter for the dB labels
    const x = (d) => GX + ((dayNum(d) - t0) / (t1 - t0)) * (W - GX);
    const nd = nser ? sar.nisar.dates : [];
    const ok = ser.vv.concat(ser.vh, nser ? nser.vv.concat(nser.vh) : []).filter(isFinite);
    if (!ok.length) return "";
    const lo = Math.min(...ok) - 0.5, hi = Math.max(...ok) + 0.5, y = (v) => top + (1 - (v - lo) / (hi - lo)) * lineH;
    const path = (vals, ds = dates) => vals.map((v, k) => (isFinite(v) ? `${k && isFinite(vals[k - 1]) ? "L" : "M"}${x(ds[k]).toFixed(1)},${y(v).toFixed(1)}` : "")).join("");
    const wet = sar.s1.soil_wetness || [], bw = Math.max(3, (W / dates.length) * 0.5);
    const bars = wet.map((w, k) => (w == null ? "" : `<rect x="${(x(dates[k]) - bw / 2).toFixed(1)}" y="${(barTop + barH * (1 - w)).toFixed(1)}" width="${bw.toFixed(1)}" height="${(barH * w).toFixed(1)}" rx="1" fill="var(--c-wet)"/>`)).join("");
    const nis = NISAR_DATES.filter((d) => dayNum(d) >= t0 && dayNum(d) <= t1).map((d) => `<line x1="${x(d).toFixed(1)}" x2="${x(d).toFixed(1)}" y1="${barTop + barH + 2}" y2="${barTop + barH + 7}" stroke="${css("--c-nisar")}" stroke-width="1.6"/>`).join("");
    const months = [];
    for (let m = 6; m <= 11; m++) { const d = `2026-${String(m).padStart(2, "0")}-01`; if (dayNum(d) >= t0) months.push(`<text x="${x(d).toFixed(1)}" y="${H + 10}" font-size="10" fill="${css("--ink-3")}">${u.rb.months[m - 1]}</text>`); }
    const dots = (vals, col, ds = dates, rr = 2.2) => vals.map((v, k) => (isFinite(v) ? `<circle cx="${x(ds[k]).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${rr}" fill="${col}"/>` : "")).join("");
    const nc = css("--c-nisar");
    const nis2 = nser ? `<path d="${path(nser.vv, nd)}" fill="none" stroke="${nc}" stroke-width="1.8"/>${dots(nser.vv, nc, nd, 2.6)}
      <path d="${path(nser.vh, nd)}" fill="none" stroke="${nc}" stroke-width="1.6" stroke-dasharray="4 3"/>${dots(nser.vh, nc, nd, 2.6)}` : "";
    return `<div class="rb-chart"><svg viewBox="0 0 ${W} ${H + 12}" aria-hidden="true">
      <text x="0" y="${top + 8}" font-size="10" fill="${css("--ink-3")}">${num(hi, 0)} dB</text><text x="0" y="${top + lineH}" font-size="10" fill="${css("--ink-3")}">${num(lo, 0)} dB</text>
      <line x1="${GX - 4}" x2="${W}" y1="${top + lineH + 2}" y2="${top + lineH + 2}" stroke="${css("--line")}" stroke-width="1"/>
      <path d="${path(ser.vv)}" fill="none" stroke="${css("--ink")}" stroke-width="1.8"/>${dots(ser.vv, css("--ink"))}
      <path d="${path(ser.vh)}" fill="none" stroke="${css("--c-green")}" stroke-width="1.8"/>${dots(ser.vh, css("--c-green"))}
      ${nis2}${bars}${nis}${months.join("")}</svg>
      <div class="lg"><span><i style="background:${css("--ink")}"></i>VV</span><span><i style="background:${css("--c-green")}"></i>VH</span>
        ${nser ? `<span><i style="background:${nc}"></i>HH</span><span><i style="background:repeating-linear-gradient(90deg,${nc} 0 4px,transparent 4px 7px)"></i>HV (NISAR)</span>` : ""}
        <span><i class="bar" style="background:var(--c-wet)"></i>${u.rb.lgWet}</span><span><i style="background:${nc};width:2px;height:9px"></i>${u.rb.lgNisar}</span></div></div>`;
  }
  function radarBlock(sel) {
    const u = U(), rb = u.rb, s = sarStats(sel.cells), ser = sarSeries(sel.cells), d = sar.s1.dates;
    const nser = sar.nisar && L8.nisar_series ? sarSeries(sel.cells, "nisar") : null;
    const pct = (v) => (isFinite(v) ? `${num(v * 100, 0)}%` : "—");
    const fmtD = (x) => { const [, m, dd] = x.split("-"); return `${+dd}.${m}`; };
    const row = (dot, k, v, note) => `<div class="rb-row"><span class="k"><span class="dot" style="background:${dot}"></span>${k}</span><span class="v">${v}</span><span class="note">${note}</span></div>`;
    const nd = NISAR_DATES;
    return `<div class="radar-block">
      <div class="rb-head"><div><div class="rb-title">${rb.title}</div><div class="rb-src">${rb.src(d.length, fmtD(d[0]), fmtD(d[d.length - 1]))}${sar.nisar ? `; ${rb.srcN(sar.nisar.dates.length)}` : ""}</div></div>
        <button type="button" class="linkish" data-radar-how>${rb.how}</button></div>
      ${radarChart(ser, nser)}
      <div class="rows">
        ${row(RAMPS.up[1], rb.change, pct(s.walls), rb.changeV(pct(s.up), pct(s.dn)))}
        ${sar.nisar ? row(css("--c-nisar"), rb.nisarWet, s.nisarOpen ? `${sgn(s.nisarWet, 1)} dB` : "—", s.nisarOpen ? rb.nisarWetV(pct(s.nisarWetUp)) : rb.nisarNoOpen) : ""}
        ${row(RAMPS.wet[2], rb.wet, pct(s.wet), rb.wetV)}
        ${row(RAMPS.water[2], rb.water, pct(s.water), rb.waterV)}
        ${row(RAMPS.sink[2], rb.egms, s.egN ? `${sgn(s.egMed, 0)} mm/${u.yr}` : "—", s.egN ? rb.egmsV(s.egN) : rb.egmsNone)}
        ${row(css("--c-green"), rb.lband, isFinite(s.dHV) ? `${sgn(s.dHV, 1)} dB` : "—", rb.lbandV(s.y0, s.y1))}
      </div>
      ${sar.nisar ? `<p class="rb-nisar">${rb.nisarUsed(sar.nisar.dates.length, sar.nisar.track, fmtD(sar.nisar.dates[0]), fmtD(sar.nisar.dates[sar.nisar.dates.length - 1]), nd.length)}</p>`
        : nd.length ? `<p class="rb-nisar">${rb.nisar(nd.length, fmtD(nd[0]), fmtD(nd[nd.length - 1]))}</p>` : ""}
    </div>`;
  }

