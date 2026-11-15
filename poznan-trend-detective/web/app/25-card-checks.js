// SARnik core, part 25 of 32: place card: the plain check-up rows (plainChecks).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ---- plain-language check-up (default card): one traffic light and one sentence per question ---- */
  function waterFacts(sel) {
    const own = sel.kind === "point" ? landCell(sel.lat, sel.lng) : null;
    const rel = own ? localRelief([own.i]) : localRelief(sel.cells);
    const floodShare = own ? (inFlood(sel.lat, sel.lng) ? 1 : 0)
      : (() => { const sample = sel.cells.filter((_, k) => k % Math.max(1, Math.floor(sel.cells.length / 1500)) === 0);
        const w = land.width, [a, , c, , e, f] = land.transform3857;
        const hit = sample.filter((i) => { const [la, lo] = mercToLatLng(c + ((i % w) + 0.5) * a, f + (Math.floor(i / w) + 0.5) * e); return inFlood(la, lo); }).length;
        return sample.length ? hit / sample.length : 0; })();
    return { own, floodShare, hollow: own ? rel.mean <= -1.5 : rel.lowShare > 0.3, depth: Math.abs(rel.mean), lowShare: rel.lowShare, reliefMean: rel.mean };
  }
  function plainChecks(sel) {
    const p = U().plain, items = [];
    const pctS = (v) => num(Math.max(0, v) * 100, 0);
    const s = sar && L8.sar_change ? sarStats(sel.cells) : null;
    // 1. building now (radar, year on year)
    if (s) items.push(s.walls > 0.02 ? { lvl: "warn", t: p.buildT, v: p.buildYes(pctS(s.walls)), src: p.buildSrc }
      : s.up > 0.05 ? { lvl: "info", t: p.buildT, v: p.buildOther, src: p.buildSrc } : { lvl: "ok", t: p.buildT, v: p.buildNo, src: p.buildSrc });
    // 2. what may be built next door (model)
    const rk = riskOf(sel.cells);
    items.push(!rk ? { lvl: "ok", t: p.nextT, v: p.nextBuilt, src: p.nextSrc }
      : rk.level >= 4 ? { lvl: "warn", t: p.nextT, v: p.nextHigh(num(rk.chance * 100, 0), rk.pct), src: p.nextSrc }
      : rk.level === 3 ? { lvl: "info", t: p.nextT, v: p.nextMid(num(rk.chance * 100, 0), rk.pct), src: p.nextSrc } : { lvl: "ok", t: p.nextT, v: p.nextLow, src: p.nextSrc });
    const rHa = sel.cells.filter((i) => L8.built_2025[i] < THR() && radarBuilt(i)).length * cellHa(); // open for the forecast, built for radar
    if (rHa > 0) { const it = items[items.length - 1]; it.v += ` ${p.nextRadar(num(rHa, rHa < 10 ? 1 : 0))}`; it.src += p.nextSrcRadar; it.sar = "part"; }
    // 3. water: official groundwater-flood areas and hollows.
    const wf = waterFacts(sel);
    items.push(wf.floodShare > (wf.own ? 0 : 0.05) ? { lvl: "risk", t: p.waterT, v: wf.own ? p.waterFlood : p.waterFloodArea(pctS(wf.floodShare)), src: p.waterSrcFlood, sar: "no" }
      : wf.hollow ? { lvl: "warn", t: p.waterT, v: wf.own ? p.waterHollow(num(wf.depth, 0)) : p.waterHollowArea(pctS(wf.lowShare)), src: p.waterSrcHollow, sar: "yes" }
      : { lvl: "ok", t: p.waterT, v: wf.reliefMean >= 1.0 ? (lang === "pl" ? `Teren wyniesiony (+${num(wf.reliefMean, 1)} m): naturalny spływ wód, brak ryzyka podtopień.` : `Elevated ground (+${num(wf.reliefMean, 1)} m): natural drainage, safe from flood.`) : p.waterOk, src: p.waterSrc, sar: "part" });
    // 3b. what NISAR saw this summer around the place: an observation (rain, harvest and tillage together), never a flag
    if (s && sar.nisar) items.push({ lvl: "info", t: p.nisarT, v: s.nisarOpen ? p.nisarV(pctS(s.nisarWetUp)) : p.nisarNone, sar: "yes",
      src: p.nisarSrc(sar.nisar.track, sar.nisar.dates.length, passDate(sar.nisar.dry), passDate(sar.nisar.wet)) });
    // 4. ground motion (EGMS)
    if (s) items.push(!s.egN ? { lvl: "info", t: p.groundT, v: p.groundNone, src: p.groundSrc }
      : s.egMed <= -3 ? { lvl: "risk", t: p.groundT, v: p.groundSinks(num(Math.abs(s.egMed), 0)), src: p.groundSrc }
      : s.egMin <= -5 ? { lvl: "warn", t: p.groundT, v: p.groundSpots(num(Math.abs(s.egMin), 0)), src: p.groundSrc } : { lvl: "ok", t: p.groundT, v: p.groundOk, src: p.groundSrc });
    // 5. trees
    const lost = forestLost(sel.cells, 2024), perKm2 = lost / ((sel.cells.length * cellHa()) / 100);
    items.push({ lvl: perKm2 > 2 ? "warn" : "ok", t: p.treesT, v: perKm2 > 2 ? p.treesCut(num(lost, lost < 10 ? 1 : 0)) : p.treesOk(num(lost, lost < 10 ? 1 : 0)), src: p.treesSrc });
    // 6. summer heat (MODIS)
    if (sel.sq.length) {
      const r = testSeries(heatSeries("day", sel.sq), HEAT_YEARS), pc = percentile(rankPool.day, r.perDec);
      items.push(r.p < 0.05 && pc >= 60 ? { lvl: "warn", t: p.heatT, v: p.heatFast(num(r.perDec, 1)), src: p.heatSrc } : { lvl: "ok", t: p.heatT, v: p.heatOk, src: p.heatSrc });
    }
    // 7. price (information only, never a warning)
    const pz = priceSeries(unitFor(sel), "633677"), wage = priceSeries(unitFor(sel), "64428"), wy = [2024, 2023].find((y) => wage[y] && pz[y]);
    if (wy) items.push({ lvl: "price", t: p.priceT, v: p.priceV(fmtInt(Math.round(pz[wy] / 100) * 100), num(pz[wy] / wage[wy], 1), wy, sel.area === "Poznań"), src: p.priceSrc });
    const SARK = { [p.buildT]: "yes", [p.groundT]: "yes" };
    items.forEach((it) => { if (!it.sar) it.sar = SARK[it.t] || "no"; });
    return items.concat(skItems(sel)); // rows from extension modules (empty without modules)
  }
