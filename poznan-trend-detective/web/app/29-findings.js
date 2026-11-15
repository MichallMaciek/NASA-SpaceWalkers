// SARnik core, part 29 of 32: findings list (no place selected).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= findings ================= */
  function findingData() {
    const s = study, ms = s.ground.modis_vs_station, px = s.pixel_summary, cor = s.growth_correlation, c = areaStats("Poznań");
    const big = s.areas.filter((a) => a.role !== "city" && a.pop_change_pct_2000_2024 > 200).sort((a, b) => b.pop_change_pct_2000_2024 - a.pop_change_pct_2000_2024);
    const P = priceSeries("Poznań (city)", "633677"), Wg = priceSeries("Poznań (city)", "64428");
    const muni = Object.entries(land.municipalities).sort((a, b) => b[1].forest_loss_total_ha - a[1].forest_loss_total_ha);
    const totLoss = muni.reduce((x, [, m]) => x + m.forest_loss_total_ha, 0), lt = land.forest_loss_trend;
    const trendTxt = lt.p < 0.05 ? (lang === "pl" ? ` Tempo ${lt.slope_ha_per_decade > 0 ? "rośnie" : "spada"} istotnie (${fmtP(lt.p)}).` : ` The pace is ${lt.slope_ha_per_decade > 0 ? "rising" : "falling"} significantly (${fmtP(lt.p)}).`) : "";
    const k = sar && sar.checks;
    const radarD = k ? {
      radar: { n: sar.s1.dates.length, ha: fmtInt(sar.s1.up3db_ha), wha: fmtInt(sar.s1.walls_ha || 0), ratio: k.wuia.ratio != null ? num(k.wuia.ratio, 1) : null, dec: num(k.wuia.share_decision * 100, 2), rest: num(k.wuia.share_rest * 100, 2),
        sig: k.wuia.p != null && k.wuia.p < 0.05 && k.wuia.ratio >= 1.3, p: k.wuia.p != null ? fmtP(k.wuia.p) : "",
        wallsSig: !!(k.wuia_walls && k.wuia_walls.p != null && k.wuia_walls.p < 0.05 && k.wuia_walls.ratio >= 1.3) },
      wet: { share: num(k.wet.share_sig_study * 100, 0), flood: k.wet.share_sig_flood != null ? num(k.wet.share_sig_flood * 100, 0) : null, out: num(k.wet.share_sig_outside * 100, 0),
        // like the other checks: a small effect is not "more often" (25% vs 23% has a block-bootstrap CI over 1)
        fsig: k.wet.p_flood_higher != null && k.wet.p_flood_higher < 0.05 && k.wet.share_sig_flood / k.wet.share_sig_outside >= 1.2 },
      ground: { med: sgn(k.egms.median, 0), n: fmtInt(k.egms.cells_le_minus5), min: sgn(k.egms.min, 0), share: num(k.egms.share_of_study * 100, 0) },
      lband: { y0: sar.alos.years[0], y1: sar.alos.years[sar.alos.years.length - 1], nisar: !!sar.nisar,
        n: sar.nisar ? sar.nisar.dates.length : 0, wd: sar.nisar && sar.nisar.checks.wetdry ? {
          share: num(sar.nisar.checks.wetdry.share_study * 100, 0), flood: sar.nisar.checks.wetdry.share_flood != null ? num(sar.nisar.checks.wetdry.share_flood * 100, 0) : null,
          out: num(sar.nisar.checks.wetdry.share_outside * 100, 0), ratio: sar.nisar.checks.wetdry.ratio != null ? num(sar.nisar.checks.wetdry.ratio, 1) : null,
          sig: sar.nisar.checks.wetdry.p != null && sar.nisar.checks.wetdry.p < 0.05 && sar.nisar.checks.wetdry.ratio >= 1.2,
          p: sar.nisar.checks.wetdry.p != null ? fmtP(sar.nisar.checks.wetdry.p) : "" } : null },
      modelRadar: { ratio: num(k.model.ratio, 1), top: num(k.model.share_top5 * 100, 2), rest: num(k.model.share_rest * 100, 2), raw: k.model.ratio,
        sig: k.model.p != null && k.model.p < 0.05 && k.model.ratio >= 1.3, p: k.model.p != null ? fmtP(k.model.p) : "",
        wRatio: k.model_walls ? num(k.model_walls.ratio, 1) : null, wSig: !!(k.model_walls && k.model_walls.p < 0.05 && k.model_walls.ratio >= 1.3) },
    } : {};
    return {
      ...radarD,
      sprawl: { b1990: num(land.study_built_share_pct["1990"], 1), b2020: num(land.study_built_share_pct["2020"], 1), pozLoss: num(Math.abs(c.pop_change_pct_2000_2024), 0), top: big.map((a) => a.name).join(", ") },
      forecast: { hit: num(land.model.top_n_hit_rate * 100, 0), ha: fmtInt(land.model.demand_ha_per_5y) },
      prices: { pUp: num((P["2024"] / P["2015"] - 1) * 100, 0), wUp: num((Wg["2024"] / Wg["2015"] - 1) * 100, 0), r15: num(Wg["2015"] / P["2015"], 2), r24: num(Wg["2024"] / P["2024"], 2) },
      forest: { ha: fmtInt(totLoss), top: muni.slice(0, 3).map(([n]) => n).join(", "), trend: trendTxt },
      nights: { share: num(px.night_sig_warming_share, 0), n: fmtInt(px.lst_pixels), city: sgn(c.trend.night_lst.slope_per_decade, 2) },
      days: { r: num(cor.day_lst.spearman_r, 2), p: fmtP(cor.day_lst.p) },
      station: { r: num(ms.night_vs_tmin.r, 2), n: ms.night_vs_tmin.n },
    };
  }
  const only = (...ks) => { Object.keys(state.lyr).forEach((k) => { state.lyr[k].on = ks.includes(k); }); };
  const fitAll = () => map.flyToBounds(borderLayer.getBounds(), { ...fitPad(), duration: 0.8 });
  const showOnly = async (...ks) => { only(...ks); await Promise.all(ks.map(ensure)); };
  const SAR_FINDINGS = {
    radar: async () => { await setLens("build"); clearSelection(); map.flyTo(OLD_MARKET, 12, { duration: 0.8 }); },
    wet: async () => { await setLens("water"); clearSelection(); fitAll(); },
    ground: async () => { await setLens("ground"); clearSelection(); map.flyTo(OLD_MARKET, 12, { duration: 0.8 }); },
    lband: async () => { await setLens("water"); clearSelection(); fitAll(); },
    modelRadar: async () => { await setLens("history"); state.lyr.sarchange.on = true; await ensure("sarchange"); state.horizon = 10; setYear(2030); clearSelection(); map.flyTo(OLD_MARKET, 11, { duration: 0.8 }); },
  };
  const V1_FINDINGS = {
    sprawl: async () => { only("built"); await ensure("built"); setYear(2020); clearSelection(); fitAll(); },
    forecast: async () => { only("built"); await ensure("built"); state.horizon = 10; setYear(2035); fitAll(); },
    prices: async () => { only("built", "price"); await ensure("built"); setYear(2020); selectPoint(OLD_MARKET[0], OLD_MARKET[1], lang === "pl" ? "Stary Rynek, Poznań" : "Old Market, Poznań", { keep: true, zoom: 12 }); },
    forest: async () => { only("forest"); await ensure("forest"); setYear(2020); clearSelection(); fitAll(); },
    nights: async () => { only("night"); setYear(2020); clearSelection(); fitAll(); },
    days: async () => { only("day"); setYear(2020); clearSelection(); fitAll(); },
    station: async () => { only("night"); setYear(2020); selectPoint(LAWICA[0], LAWICA[1], "Poznań-Ławica (IMGW)", { keep: true, zoom: 12 }); },
  };
  // v2: radar findings first, then the strongest history findings
  const FIND = () => {
    if (!sar) return V1_FINDINGS;
    const F = SAR_FINDINGS, hist = {
      sprawl: async () => { await setLens("history"); setYear(2020); clearSelection(); fitAll(); },
      forecast: async () => { await setLens("history"); state.horizon = 10; setYear(2035); fitAll(); },
      forest: async () => { await setLens("trees"); setYear(2020); clearSelection(); fitAll(); },
    };
    // with NISAR pixels in, the NISAR finding leads (the challenge is about NISAR)
    // plain mode skips the C-band wetness finding (NISAR already shows field change) and the projection-meets-radar
    // finding (it does not test the model: ranking open land by existing building gives the same; science review N35)
    return sar.nisar ? { lband: F.lband, radar: F.radar, ...(state.expert ? { modelRadar: F.modelRadar, wet: F.wet } : {}), ground: F.ground, ...hist } : { ...F, ...hist };
  };
  function renderFindings() {
    const t = T(), u = U(), d = findingData(), card = $("#sidecard");
    card.classList.toggle("min", !state.findingsOpen);
    const focused = card.contains(document.activeElement) ? focusKey(document.activeElement) : null;
    const nisarHero = `
      <div class="nisar-banner">
        <div class="nisar-banner-head">
          <span class="nisar-pill">${SAR_ICON()} NISAR · 2026</span>
          <span class="nisar-orbit">${u.nisarOrbit}</span>
        </div>
        <p class="nisar-quote">${u.nisarQuote}</p>
        <div class="nisar-state">💡 ${u.nisarHint || "Kliknij dowolny punkt lub działkę na mapie, aby natychmiast zobaczyć jej ocenę (0–100), zalety (na zielono) i wady (na czerwono)."}</div>
      </div>`;
    card.innerHTML = `<div class="collapse-head"><h2>${u.appName}: ${t.caseTitle}</h2>
        <button type="button" class="linkish" id="fold" aria-expanded="${state.findingsOpen}">${state.findingsOpen ? u.hide : u.show}</button></div>
      ${nisarHero}
      <p class="sub">${u.caseIntro}</p>
      ${sar ? `<p class="sar-key">${SAR_ICON()}<span>${u.sarKeyShort}</span></p>` : ""}
      <ol class="findings">${Object.keys(FIND()).map((k, i) => { const fx = state.expert && t.fX && t.fX[k] ? t.fX[k] : t.f[k], x = fx(d[k]); return `<li><button type="button" data-f="${k}" ${state.finding === k ? 'aria-current="true"' : ""}>
        <span class="n">${i + 1}</span><span class="t">${x.t}${sar ? sarMark(FIND_SAR[k]) : ""}</span><span class="b">${x.b}</span></button></li>`; }).join("")}</ol>`;
    if (focused) { const n = card.querySelector(focused); if (n) n.focus({ preventScroll: true }); }
    $("#fold").addEventListener("click", () => {
      state.findingsOpen = !state.findingsOpen;
      try { localStorage.setItem("ptd-fold", state.findingsOpen ? "open" : "closed"); } catch (e) { /* ignore */ }
      renderFindings();
    });
    card.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", async () => {
      state.finding = b.dataset.f;
      state.ryear = 2026; // findings show the current radar data
      await FIND()[state.finding]();
      renderLenses(); renderDrawer(); renderTimeline(); redraw();
      if (!state.sel) renderFindings();
    }));
  }

