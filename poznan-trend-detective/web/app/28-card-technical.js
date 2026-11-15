// SARnik core, part 28 of 32: place card: technical inspection, mini charts, 'more'.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ---- "technical inspection" of the land, like a car check before buying ---- */
  function localRelief(cells) { // metres above (+) or below (−) the mean ground within ~500 m
    // The height model is a surface model: it follows tree tops and roofs. Measured against all cells, a field beside a
    // forest or a square between tenement houses reads as a hollow several metres deep, and a forest as "elevated".
    // So only ground cells count (no forest in 2000, at most 30% built-up), on both sides of the comparison; a cell that
    // is not ground itself, or has fewer than 8 ground cells around it, gets no verdict (`known` is false).
    const w = land.width, h = land.height, r = Math.round(500 / land.cell_m_ground), d = L8.dem;
    const ff = L8.forest2000_frac, bu = L8[`built_${LAST_OBS()}`];
    const ground = (j) => !(ff && ff[j] > 5) && !(bu && bu[j] > 76); // 5/255 = 2% forest, 76/255 = 30% built-up
    const stride = Math.max(1, Math.ceil(cells.length / 4000)); // sample across the whole area, not its northern strip
    const vals = [];
    cells.filter((_, k) => k % stride === 0).forEach((i) => {
      if (!ground(i)) return;
      const row = Math.floor(i / w), col = i % w;
      let s = 0, n = 0;
      for (let dr = -r; dr <= r; dr += 2) for (let dc = -r; dc <= r; dc += 2) {
        const rr = row + dr, cc = col + dc;
        if (rr < 0 || cc < 0 || rr >= h || cc >= w || dr * dr + dc * dc > r * r || !ground(rr * w + cc)) continue;
        s += d[rr * w + cc]; n++;
      }
      if (n >= 8) vals.push((d[i] - s / n) / 2);
    });
    return { known: vals.length > 0, mean: vals.length ? mean(vals) : 0, lowShare: vals.length ? vals.filter((v) => v <= -1.5).length / vals.length : 0 };
  }
  function inspectionHTML(sel, rk) {
    const u = U(), c = u.chk, items = [];
    const st = (lvl) => ({ ok: ["#4E9F3D", c.ok], warn: ["#F2A31B", c.warn], risk: ["#E5602A", c.risk], info: [css("--ink-3"), c.info] }[lvl]);
    // 1. building around
    const s05 = builtShare(sel.cells, 2005), s20 = builtShare(sel.cells, 2020), s30 = builtShare(sel.cells, 2030);
    const grow = s05 > 0 ? (s20 / s05 - 1) * 100 : NaN;
    items.push({ lvl: grow > 50 ? "warn" : "ok", t: c.built, v: isFinite(grow) ? c.builtV(num(s05, 0), num(s20, 0), num(s30, 0)) : c.builtNew(num(s20, 0), num(s30, 0)) });
    // 2. chance that the open land nearby gets built (the risk score above)
    if (rk) items.push({ lvl: rk.level >= 4 ? "risk" : rk.level >= 2 ? "warn" : "ok", word: [null, u.risk1, u.risk2, u.risk3, u.risk4, u.risk5][rk.level], t: c.next, v: c.nextV(num(rk.chance * 100, rk.chance < 0.01 ? 2 : 1)) });
    // 3. trees cut
    const lost = forestLost(sel.cells, 2024), perKm2 = lost / ((sel.cells.length * cellHa()) / 100);
    items.push({ lvl: perKm2 > 2 ? "warn" : "ok", t: c.trees, v: c.treesV(num(lost, lost < 10 ? 1 : 0)) });
    // 4. summer heat by day (MODIS)
    if (sel.sq.length) {
      const r = testSeries(heatSeries("day", sel.sq), HEAT_YEARS), pc = percentile(rankPool.day, r.perDec);
      items.push({ lvl: r.p < 0.05 && pc >= 60 ? "warn" : "ok", t: c.heat, v: r.p < 0.05 ? c.heatV(sgn(r.perDec, 2), pc) : c.heatNs });
    }
    // 5. terrain: hollows where water can gather (Copernicus DEM); the official flood map is linked
    // a point is judged by its own cell; an area by the share of its cells lying in hollows
    const own = sel.kind !== "area" ? landCell(sel.lat, sel.lng) : null;
    const rel = own ? localRelief([own.i]) : localRelief(sel.cells);
    if (!own) rel.mean = rel.lowShare > 0.3 ? -2 : 0; // for areas the share decides; mean over an area is ~0 by construction
    // official PIG-PIB groundwater-flood areas: the point itself, or the share of the area's cells inside them
    const floodShare = own ? (inFlood(sel.lat, sel.lng) ? 1 : 0)
      : (() => { const sample = sel.cells.filter((_, k) => k % Math.max(1, Math.floor(sel.cells.length / 1500)) === 0);
        const w = land.width, [a, , c, , e, f] = land.transform3857;
        const hit = sample.filter((i) => { const [la, lo] = mercToLatLng(c + ((i % w) + 0.5) * a, f + (Math.floor(i / w) + 0.5) * e); return inFlood(la, lo); }).length;
        return sample.length ? hit / sample.length : 0; })();
    items.push({ lvl: floodShare > (own ? 0 : 0.05) ? "risk" : "ok", t: c.flood, link: false,
      v: own ? (floodShare ? c.floodIn : c.floodOut) : (floodShare > 0.005 ? c.floodArea(num(floodShare * 100, 0)) : c.floodOut) });
    const hollow = own ? rel.mean <= -1.5 : rel.lowShare > 0.3;
    items.push(!rel.known ? { lvl: "info", t: c.water, link: true, v: c.waterTrees } : { lvl: hollow ? "warn" : "ok", t: c.water, link: true,
      v: own ? (hollow ? c.waterLow(num(Math.abs(rel.mean), 1)) : c.waterOk(sgn(rel.mean, 1))) : (hollow ? c.waterAreaLow(num(rel.lowShare * 100, 0)) : c.waterAreaOk(num(rel.lowShare * 100, 0))) });
    // 6. radar: is something being built right now?
    if (sar && L8.sar_change) {
      // v2: this season's passes (June-November 2026), plus wet ground and ground motion (InSAR)
      const s = sarStats(sel.cells);
      items.push(s.walls > 0.02 ? { lvl: "warn", t: c.radar26, v: c.radar26Busy(num(s.walls * 100, 0)) }
        : s.up > 0.05 ? { lvl: "info", t: c.radar26, v: c.radar26Soft(num(s.up * 100, 0)) } : { lvl: "ok", t: c.radar26, v: c.radar26Quiet });
      items.push({ lvl: s.wet > 0.3 ? "warn" : "ok", t: c.wetT, v: s.wet > 0.3 ? c.wetHigh(num(s.wet * 100, 0)) : c.wetLow(num((s.wet || 0) * 100, 0)) });
      items.push(!s.egN ? { lvl: "info", t: c.egmsT, v: c.egmsNone }
        : { lvl: s.egMed <= -3 ? "risk" : s.egMin <= -5 ? "warn" : "ok", t: c.egmsT, v: s.egMed <= -3 ? c.egmsSink(sgn(s.egMed, 0)) : c.egmsV(sgn(s.egMed, 0), s.egN, s.egMin <= -5 ? sgn(s.egMin, 0) : null) });
    } else {
      const rc = sel.cells.filter((i) => L8.s1_2017[i] && L8.s1_2024[i]).map((i) => (L8.s1_2024[i] - L8.s1_2017[i]) / 6);
      const busy = rc.length ? rc.filter((d) => d >= 3).length / rc.length : 0;
      items.push({ lvl: busy > 0.05 ? "warn" : "ok", t: c.radar, v: busy > 0.05 ? c.radarBusy(num(busy * 100, 0)) : c.radarQuiet });
    }
    return `<div class="check"><div class="check-h">${c.title}</div>${items.map((it) => {
      const [col, w0] = st(it.lvl), word = it.word || w0;
      return `<div class="ck"><span class="ck-dot" style="background:${col}"></span><div><div class="ck-t">${it.t} <span class="ck-s" style="color:${col}">${word}</span></div>
        <div class="ck-v">${it.v}${it.link ? ` <a href="https://wody.isok.gov.pl/imap_kzgw/?gpmap=gpMZP" target="_blank" rel="noopener">${c.isok}</a>` : ""}</div></div></div>`;
    }).join("")}<p class="ck-note">${c.note}</p></div>`;
  }

  // rs: built-up share 2020..today with radar (radarShares), drawn as its own line; the forecast then starts from it; at(y): the card's share
  function miniChart(series, years, cur, rs, at) {
    const W = 340, H = 64, ok = series.filter((v, k) => isFinite(v) && !(rs && years[k] > LAST_OBS() && years[k] <= NOW_YEAR)).concat(rs || []);
    const lo = Math.min(...ok), hi = Math.max(...ok), pad = (hi - lo) * 0.15 || 1;
    const x = (y) => ((y - years[0]) / (years[years.length - 1] - years[0])) * W, y = (v) => H - ((v - lo + pad) / (hi - lo + 2 * pad)) * H;
    const obsN = land.epochs.length, end = horizonEnd();
    let d1 = "", d2 = "";
    years.forEach((yr, k) => { if (!isFinite(series[k]) || yr > end) return; if (k < obsN) d1 += `${d1 ? "L" : "M"}${x(yr).toFixed(1)},${y(series[k]).toFixed(1)}`; });
    d2 = rs ? `M${x(NOW_YEAR).toFixed(1)},${y(rs[rs.length - 1]).toFixed(1)}` : `M${x(years[obsN - 1]).toFixed(1)},${y(series[obsN - 1]).toFixed(1)}`;
    years.forEach((yr, k) => { if (k >= obsN && yr <= end && (!rs || yr > NOW_YEAR)) d2 += `L${x(yr).toFixed(1)},${y(series[k]).toFixed(1)}`; });
    const d3 = rs ? rs.map((v, k) => `${k ? "L" : "M"}${x(LAST_OBS() + k).toFixed(1)},${y(v).toFixed(1)}`).join("") : "";
    const { e0, e1, t } = epochPair(cur), k0 = years.indexOf(e0), k1 = years.indexOf(e1);
    const cv = at ? at(cur) : k0 >= 0 && k1 >= 0 ? series[k0] + (series[k1] - series[k0]) * t : NaN, cy = isFinite(cv) ? y(cv) : null, pred = css("--pred");
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <line x1="${x(land.epochs[obsN - 1])}" x2="${x(land.epochs[obsN - 1])}" y1="0" y2="${H}" stroke="${css("--line")}" stroke-width="1"/>
      <path d="${d1}" fill="none" stroke="${css("--ink")}" stroke-width="2"/>
      <path d="${d2}" fill="none" stroke="${pred}" stroke-width="2" stroke-dasharray="4 4"/>${d3 ? `<path d="${d3}" fill="none" stroke="${css("--pred-recent") || pred}" stroke-width="2"/>` : ""}
      ${cy != null ? `<circle cx="${x(cur)}" cy="${cy}" r="4.5" fill="${css("--card")}" stroke="${cur > NOW_YEAR ? pred : css("--ink")}" stroke-width="2"/>` : ""}
    </svg>`;
  }
  function sparkline(vals, years, colour, r) {
    const W = 108, H = 36, ok = vals.filter((v) => v != null && isFinite(v));
    if (!ok.length) return "";
    const lo = Math.min(...ok), hi = Math.max(...ok), pad = (hi - lo) * 0.12 || 0.5;
    const y0 = years[0], y1 = years[years.length - 1];
    const x = (yr) => ((yr - y0) / (y1 - y0)) * W, y = (v) => H - ((v - lo + pad) / (hi - lo + 2 * pad)) * H;
    let d = "", pen = false;
    vals.forEach((v, k) => { if (v == null || !isFinite(v)) { pen = false; return; } d += `${pen ? "L" : "M"}${x(years[k]).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
    const tl = r && isFinite(r.slope) ? `<line x1="0" x2="${W}" y1="${y(r.icpt + r.slope * y0)}" y2="${y(r.icpt + r.slope * y1)}" stroke="${colour}" stroke-width="2" stroke-dasharray="4 3"/>` : "";
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}" fill="none" stroke="${css("--ink-3")}" stroke-width="1.5"/>${tl}</svg>`;
  }
  function moreHTML(sel) {
    const u = U(), t = T(), tp = t.place;
    let heat = "";
    if (sel.sq.length) {
      heat = `<div class="mh3">${u.heatH(sel.sq.length)}</div>` + [
        { k: "night", lbl: tp.night, unit: "°C", d: 2, colour: RAMPS.warm[2] },
        { k: "day", lbl: tp.day, unit: "°C", d: 2, colour: RAMPS.warm[2] },
        { k: "ndvi", lbl: tp.ndvi, unit: "NDVI", d: 3, colour: RAMPS.green[2] },
      ].map((m) => {
        const vals = heatSeries(m.k, sel.sq), r = testSeries(vals, HEAT_YEARS);
        if (!isFinite(r.p)) return "";
        const sig = r.p < 0.05, pc = percentile(rankPool[m.k], r.perDec);
        const rank = m.k === "ndvi" ? (r.perDec >= 0 ? tp.greener(pc) : tp.browner(100 - pc)) : (pc >= 50 ? tp.faster(pc) : tp.slower(100 - pc));
        return `<div class="mrow"><div><div class="lbl">${m.lbl}</div><div class="val">${sgn(r.perDec, m.d)} <small>${m.unit}/${u.dec}</small></div>
          <div class="sig">${sig ? tp.sig : tp.notProven}, ${fmtP(r.p)} · ${rank}</div></div>${sparkline(vals, HEAT_YEARS, m.colour, r)}</div>`;
      }).join("");
    }
    const elev = mean(sel.cells.map((i) => L8.dem[i] / 2 + land.dem_offset));
    const rc = mean(sel.cells.filter((i) => L8.s1_2017[i] && L8.s1_2024[i]).map((i) => (L8.s1_2024[i] - L8.s1_2017[i]) / 6));
    const a = sel.area ? areaStats(sel.area) : null;
    const muni = a ? `<div class="mh3">${tp.muni}: ${esc(sel.area)}</div><dl class="kv">
      <dt>${tp.pop} 2000 → 2024</dt><dd>${fmtInt(a.population["2000"])} → ${fmtInt(a.population["2024"])} (${sgn(a.pop_change_pct_2000_2024, 0)}%)</dd>
      <dt>${tp.built}</dt><dd>${fmtInt(a.dwellings_2000_2024)}</dd></dl>` : "";
    return `<details class="more"><summary>${u.moreData}</summary>
      ${heat}
      <div class="mh3">${u.terrainH}</div><dl class="kv">
        <dt>${u.elevMean}</dt><dd>${num(elev, 0)} m ${u.asl}</dd>
        ${isFinite(rc) ? `<dt>${u.radarChange}</dt><dd>${sgn(rc, 1)} dB</dd>` : ""}</dl>
      ${muni}</details>`;
  }

