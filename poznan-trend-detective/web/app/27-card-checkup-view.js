// SARnik core, part 27 of 32: place card: HTML of the plain check-up (plainHTML, riskHTML).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  function plainHTML(sel) {
    const u = U(), p = u.plain, items = plainChecks(sel);
    const { score, tierClass, tierLabel, pros, cons, nisarStatus, isNisar } = computeProsAndCons(sel, items);

    const nisarBanner = `
      <div class="nisar-banner">
        <div class="nisar-banner-head">
          <span class="nisar-pill">${SAR_ICON()} ${isNisar ? "NISAR · 2026" : u.sarPill}</span>
          ${isNisar ? `<span class="nisar-orbit">${u.nisarOrbit}</span>` : ""}
        </div>
        <p class="nisar-quote">${u.nisarQuote}</p>
        <div class="nisar-state"><b>${u.nisarGround}</b> ${nisarStatus}</div>
      </div>`;

    const scoreCard = `
      <div class="spot-score-card">
        <div class="score-badge ${tierClass}">${score}</div>
        <div class="score-info">
          <div class="score-title">${u.scoreTitle || "Ogólna ocena działki"}: ${score}/100</div>
          <div class="score-sub">${tierLabel}</div>
        </div>
      </div>`;

    const consHTML = `
      <div class="pc-section">
        <div class="pc-head cons-head">⚠️ ${u.conHeader || "Wady i punkty do sprawdzenia"} (${cons.length})</div>
        ${cons.length ? `<ul class="pc-list">${cons.map((c) => `
          <li class="pc-item con-item ${c.lvl === "warn" ? "warn-item" : c.lvl === "info" ? "info-item" : ""}">
            <div><b>${c.t}</b><br><small>${c.d}</small></div>
          </li>`).join("")}</ul>` : `<div class="pc-empty">✅ ${u.noCons || "Brak krytycznych ostrzeżeń na tym terenie."}</div>`}
      </div>`;

    const prosHTML = `
      <div class="pc-section">
        <div class="pc-head pros-head">🌿 ${u.proHeader || "Zalety i atuty lokalizacji"} (${pros.length})</div>
        ${pros.length ? `<ul class="pc-list">${pros.map((p) => `
          <li class="pc-item pro-item">
            <div><b>${p.t}</b><br><small>${p.d}</small></div>
          </li>`).join("")}</ul>` : ""}
      </div>`;

    // every row of the check-up (module rows included), grouped as before, one click away: nothing the card knows is hidden
    const word = (it) => (it.word ? esc(it.word) : it.pending ? p.checking : p.lvl[it.lvl]);
    const txt = (it, x) => (it.module ? esc(x) : x);
    const mark = { ok: "ok", info: "info", warn: "warn", risk: "risk", price: "info" };
    const allHTML = `<details class="pc-all"><summary>${u.allPoints(items.length, items.filter((it) => it.sar !== "no").length)}</summary>
      ${[[p.grpSar, items.filter((it) => it.sar !== "no"), true], [p.grpOther, items.filter((it) => it.sar === "no"), false]].filter(([, list]) => list.length).map(([h, list, isSar]) => `
      <h3 class="pl-h${isSar ? " is-sar" : ""}">${isSar ? SAR_ICON() : ""}${h}</h3>
      <ul class="plain">${list.map((it) => `<li class="pl pl-${mark[it.lvl]}${it.pending ? " pl-pending" : ""}"><span class="pl-dot" aria-hidden="true"></span><div>
        <div class="pl-t"><span>${txt(it, it.t)}${it.sar === "part" ? sarMark("part") : ""}</span><span class="pl-l">${word(it)}</span></div><div class="pl-v">${it.v}</div>${it.src ? `<div class="pl-src">${txt(it, it.src)}</div>` : ""}</div></li>`).join("")}</ul>`).join("")}</details>`;

    return nisarBanner + scoreCard + consHTML + prosHTML + allHTML;
  }
  function riskHTML(rk, sel) {
    const u = U(), s = rk.score;
    const word = [null, u.risk1, u.risk2, u.risk3, u.risk4, u.risk5][rk.level];
    return `<div class="risk"><div class="risk-head"><span class="rl">${u.riskTitle}</span><span class="risk-word">${word}</span></div>
      <div class="risk-head" style="margin-top:6px"><span class="risk-score">${s}<small> / 100</small></span></div>
      <div class="risk-bar"><i style="left:${s}%"></i></div>
      <p>${u.riskText(num(rk.chance * 100, rk.chance < 0.01 ? 2 : 1), rk.pct, sel.kind === "area" ? num(rk.openShare * 100, 0) : null)}</p>
      <p style="margin-top:4px">${u.riskScale}</p></div>`;
  }
