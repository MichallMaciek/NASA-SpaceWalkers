// SARnik core, part 24 of 32: place card: renderCard, renderCardLoading.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= side card ================= */
  let findingsTop = 0; // scroll position of the findings list, restored when the selection is cleared
  function renderCardLoading() {
    const box = $("#sidecard");
    if (box.querySelector(".findings")) findingsTop = box.scrollTop;
    box.classList.remove("min");
    state.techOpen = false; // a new place opens with the plain check-up
    const sel = state.sel, u = U();
    box.scrollTop = 0; // otherwise the new card opens where the previous one was scrolled, with its title out of view
    $("#sidecard").innerHTML = `<h2>${esc(sel.kind === "parcel" ? u.parcelTitle(sel.parcel) : sel.label || (sel.kind === "area" ? u.selectedArea : u.selectedPlace))}</h2><p class="sub">${sel.failed ? u.loadFail : u.loading}</p>` +
      (sel.failed ? `<button type="button" class="linkish" id="retry-sel">${u.retry}</button>` : "");
    if (sel.failed) $("#retry-sel").addEventListener("click", () => finishSelection(sel));
  }
  function renderCard() {
    const card = $("#sidecard");
    if (!state.sel) { renderFindings(); return; }
    const sel = state.sel, u = U(), t = T(), tp = t.place;
    if (!sel.ready) { renderCardLoading(); return; }
    card.classList.remove("min");
    const title = sel.kind === "area" ? u.selectedArea : sel.kind === "parcel" ? esc(u.parcelTitle(sel.parcel)) : esc(sel.label || u.selectedPlace);
    if (!sel.area || !sel.cells.length) {
      card.innerHTML = `<h2>${title}</h2><p class="sub">${tp.outside}</p><button type="button" class="linkish" id="clear-sel">${u.clear}</button>`;
      $("#clear-sel").addEventListener("click", clearSelection);
      return;
    }
    const km2 = (sel.cells.length * cellHa()) / 100;
    const fut = isFuture(), Y = state.year, end = horizonEnd();
    const sub = sel.kind === "area" ? `${num(km2, 1)} km²` : sel.kind === "parcel" ? `${fmtInt(Math.round(sel.parcel.areaM2))} m²`
      : u.radiusAround(radiusLabel(sel.r || 1)) + (sel.note === "noParcel" ? ` · ${u.noParcel}` : "");
    const range = fut ? u.forecastFor(Y) : `${land.epochs[0]}–${Y}`;
    // building
    const series = builtSeriesAll(sel.cells), ep = EPOCHS();
    // any year: blend the two surrounding 5-year epochs (the timeline moves year by year)
    const blend = (y) => { const { e0, e1, t } = epochPair(y), a = series[ep.indexOf(e0)], b = series[ep.indexOf(e1)]; return a + (b - a) * t; };
    // with radar: 2021..today as radar saw it, later years the model's growth counted from today's radar state
    const rs = radarShares(sel.cells), off = rs ? rs[rs.length - 1] - blend(NOW_YEAR) : 0;
    const share = (y) => (!rs || y <= LAST_OBS() ? blend(y) : y <= NOW_YEAR ? rs[y - LAST_OBS()] : blend(y) + off);
    const base = 1990;
    // change in percentage points: a relative change explodes from small bases (one built cell -> "+5000%")
    let builtV, builtNote;
    if (fut) { const a = share(NOW_YEAR), b = share(Y); builtV = `${sgn(b - a, 0)} ${u.pp}`; builtNote = u.untilYear(Y); }
    else if (Y > base) { const a = share(base), b = share(Y); builtV = `${sgn(b - a, 0)} ${u.pp}`; builtNote = u.sinceYear(base, num(b, 0)); }
    else { builtV = `${num(share(Y), 0)}%`; builtNote = u.shareOfLand; }
    // forest
    let forestV, forestNote;
    if (fut) {
      const last = LAST_OBS(), y0 = last + Math.floor((Y - last) / 5) * 5, y1 = Math.min(end, y0 + 5);
      const f0 = forestAtRisk(sel.cells, y0), f1 = y1 > y0 ? forestAtRisk(sel.cells, y1) : f0;
      const ha = f0 + (f1 - f0) * (y1 > y0 ? (Y - y0) / 5 : 0);
      forestV = ha >= 0.5 ? `−${num(ha, ha < 10 ? 1 : 0)} ha` : "0 ha"; forestNote = u.forestAtRisk;
    }
    else if (Y < 2001) { forestV = "—"; forestNote = u.forestFrom2001; }
    else { const ha = forestLost(sel.cells, Y); forestV = ha >= 0.05 ? `−${num(ha, ha < 10 ? 1 : 0)} ha` : "0 ha"; forestNote = `2001–${Math.min(Y, 2024)}`; }
    // price
    const pr = priceAt(sel, Y);
    let priceV, priceNote;
    if (!pr || pr.kind === "none") { priceV = "—"; priceNote = u.priceFrom(pr ? pr.first : 2010); }
    else if (pr.kind === "trend") { priceV = `${u.approx} ${fmtInt(Math.round(pr.v / 100) * 100)} zł`; priceNote = u.priceTrend(pr.from, pr.to); }
    else { priceV = `${fmtInt(pr.v)} zł`; priceNote = `${pr.year}, ${sel.area === "Poznań" ? u.cityUnit : u.countyUnit}`; }
    // chip in forecast mode
    const chip = fut ? `<span class="chip">${u.chip(num(land.model.top_n_hit_rate * 100, 0))}</span>` : "";
    // chart
    const chart = miniChart(rs ? series.map((v, k) => (ep[k] > NOW_YEAR ? v + off : v)) : series, ep, Y, rs, share);
    // wage ratio footnote
    const wage = priceSeries(unitFor(sel), "64428"), pz = priceSeries(unitFor(sel), "633677");
    const wy = [2024, 2023].find((y) => wage[y] && pz[y]);
    const foot = fut ? u.forecastNote : (wy ? u.wageNote(num(pz[wy] / wage[wy], 1), wy) : "");
    // risk
    const rk = riskOf(sel.cells);
    const risk = rk ? riskHTML(rk, sel) : `<div class="risk"><div class="risk-head"><span class="rl">${u.riskTitle}</span></div><p>${u.riskBuilt}</p></div>`;
    // more data
    const more = moreHTML(sel);
    const moreOpen = !!(card.querySelector("details.more") || {}).open; // keep "More data" open while the year changes
    // v3: plain check-up first; every technical number (dB, statistics, model score, history) behind one disclosure
    const techOpen = state.expert || !!state.techOpen;
    const wasOpen = new Set([...card.querySelectorAll("details[open]")].map((d) => d.className).filter((c) => c && c !== "tech"));
    const focused = card.contains(document.activeElement) ? focusKey(document.activeElement) : null;
    card.innerHTML = `<div class="collapse-head"><h2>${title}</h2></div>
      <p class="sub">${sub}${sel.area ? ` · ${esc(sel.area)}` : ""}</p>
      ${plainHTML(sel)}
      <details class="tech" ${techOpen ? "open" : ""}><summary>${u.techSummary}</summary>
      <p class="sub tech-sub">${range}</p>
      ${sar && L8.sar_series ? radarBlock(sel) : ""}
      ${skCardTop(sel)}
      ${sar ? `<div class="hist-h">${rs ? u.histHeadRadar : u.histHead}</div>` : ""}${chip}
      <div class="rows">
        <div class="row"><span class="k"><span class="dot" style="background:${css("--c-built")}"></span>${u.rowBuilt}</span><span class="v">${builtV}<small>${builtNote}</small></span></div>
        <div class="row"><span class="k"><span class="dot" style="background:${css("--c-forest")}"></span>${u.rowForest}</span><span class="v">${forestV}<small>${forestNote}</small></span></div>
        <div class="row"><span class="k"><span class="dot" style="background:${css("--c-price")}"></span>${u.rowPrice}</span><span class="v">${priceV}<small>${priceNote}</small></span></div>
      </div>
      <div class="minichart"><div class="mh"><span>${u.builtShare}</span><span>${land.epochs[0]}–${end}</span></div>${chart}${rs ? `<div class="mh"><span style="color:${css("--pred-recent") || css("--pred")}">${u.lg.radarNew(LAST_OBS() + 1, NOW_YEAR)}</span></div>` : ""}</div>
      ${foot ? `<p class="foot">${foot}</p>` : ""}
      ${risk}
      ${more}
      <button type="button" class="btn-primary" id="open-test">${tp.fullTest}</button>
      </details>
      <p class="foot"><button type="button" class="linkish" id="clear-sel">${u.clear}</button></p>`;
    if (moreOpen && card.querySelector("details.more")) card.querySelector("details.more").open = true;
    card.querySelectorAll("details").forEach((d) => { if (wasOpen.has(d.className)) d.open = true; });
    card.querySelector("details.tech").addEventListener("toggle", (e) => { if (!state.expert) state.techOpen = e.target.open; });
    if (focused) { const n = card.querySelector(focused); if (n) n.focus({ preventScroll: true }); }
    // open the dialog first, so the chart measures its real width (on phones it would otherwise draw at 680 px)
    $("#open-test").addEventListener("click", () => { $("#test-sheet").showModal(); renderTest(); });
    $("#clear-sel").addEventListener("click", clearSelection);
  }
