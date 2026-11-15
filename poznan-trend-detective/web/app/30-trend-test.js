// SARnik core, part 30 of 32: full trend test dialog.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= full trend test ================= */
  const NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (parent) parent.appendChild(e); return e; }
  function niceTicks(lo, hi, n) {
    const span = hi - lo || 1, m = Math.pow(10, Math.floor(Math.log10(span / n)));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * m).find((s) => span / s <= n) || 10 * m;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function trendChart(host, vals, years, r, colour, d, unit) {
    host.innerHTML = "";
    const W = Math.max(300, host.clientWidth || 680), H = 260, m = { l: 52, r: 12, t: 10, b: 26 };
    const ok = vals.filter((v) => v != null && isFinite(v));
    let lo = Math.min(...ok), hi = Math.max(...ok); const pad = (hi - lo) * 0.15 || 1; lo -= pad; hi += pad;
    const y0 = years[0], y1 = years[years.length - 1];
    const x = (yr) => m.l + ((yr - y0) / (y1 - y0)) * (W - m.l - m.r), y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }); host.appendChild(svg);
    const gg = svgEl("g", { class: "grid" }, svg), ax = svgEl("g", { class: "axis" }, svg);
    niceTicks(lo, hi, 4).forEach((v) => {
      svgEl("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, gg);
      svgEl("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, ax).textContent = d === 0 ? fmtInt(v) : num(v, d > 2 ? 2 : d);
    });
    const step = y1 - y0 > 30 ? 10 : 5;
    years.filter((yr) => yr % step === 0 || yr === y1).forEach((yr) => { svgEl("text", { x: x(yr), y: H - 6, "text-anchor": "middle" }, ax).textContent = yr; });
    if (isFinite(r.slope)) svgEl("line", { x1: x(y0), x2: x(y1), y1: y(r.icpt + r.slope * y0), y2: y(r.icpt + r.slope * y1), stroke: colour, "stroke-width": 2, "stroke-dasharray": "6 4", fill: "none" }, svg);
    let dd = "", pen = false;
    vals.forEach((v, k) => { if (v == null || !isFinite(v)) { pen = false; return; } dd += `${pen ? "L" : "M"}${x(years[k])},${y(v)}`; pen = true; });
    svgEl("path", { d: dd, fill: "none", stroke: css("--ink-2"), "stroke-width": 1.5 }, svg);
    const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    vals.forEach((v, k) => {
      if (v == null || !isFinite(v)) return;
      const cc = svgEl("circle", { cx: x(years[k]), cy: y(v), r: 4, fill: css("--ink"), stroke: css("--card"), "stroke-width": 2 }, svg);
      const hit = svgEl("circle", { cx: x(years[k]), cy: y(v), r: 11, fill: "transparent" }, svg);
      hit.addEventListener("mouseenter", () => {
        tip.textContent = `${years[k]}: ${d === 0 ? fmtInt(v) : num(v, d)} ${unit}`; tip.hidden = false;
        const bb = svg.getBoundingClientRect();
        tip.style.left = `${Math.min((x(years[k]) / W) * bb.width + 8, bb.width - tip.offsetWidth)}px`;
        tip.style.top = `${(y(v) / H) * bb.height - 34}px`; cc.setAttribute("r", 6);
      });
      hit.addEventListener("mouseleave", () => { tip.hidden = true; cc.setAttribute("r", 4); });
    });
  }
  function renderTest() {
    const t = T(), tp = t.place, tt = t.test, u = U(), sel = state.sel;
    $("#test-title").textContent = tt.title(sel.kind === "area" ? u.selectedArea : (sel.label || sel.area));
    const vars = [["built", tt.builtVar, "%", 1, "#E0332F"]];
    if (sel.sq.length) vars.push(["night", tp.night, "°C", 2, RAMPS.warm[2]], ["day", tp.day, "°C", 2, RAMPS.warm[2]], ["ndvi", tp.ndvi, "NDVI", 3, RAMPS.green[2]]);
    vars.push(["price", u.rowPrice, "zł/m²", 0, css("--c-price")]);
    if (!vars.some((v) => v[0] === state.testVar)) state.testVar = "built";
    const tabs = $("#vartabs"), hadFocus = tabs.contains(document.activeElement);
    tabs.innerHTML = vars.map(([k, l]) => `<button type="button" role="tab" data-v="${k}" aria-selected="${state.testVar === k}" tabindex="${state.testVar === k ? 0 : -1}">${l}</button>`).join("");
    if (hadFocus) tabs.querySelector('[aria-selected="true"]').focus({ preventScroll: true });
    tabs.querySelectorAll("button").forEach((b, i, all) => {
      b.addEventListener("click", () => { state.testVar = b.dataset.v; renderTest(); });
      b.addEventListener("keydown", (e) => {
        const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 }[e.key];
        if (to == null) return;
        e.preventDefault(); b.focus(); // keeps the focus inside the tab list for the re-render
        state.testVar = all[(to + all.length) % all.length].dataset.v; renderTest();
      });
    });
    const [, label, unit, d, colour] = vars.find((v) => v[0] === state.testVar);
    let years, vals;
    if (state.testVar === "built") { years = land.epochs; vals = builtSeriesAll(sel.cells).slice(0, land.epochs.length); }
    else if (state.testVar === "price") { const ps = priceSeries(unitFor(sel), "633677"); years = Object.keys(ps).map(Number).filter((y) => ps[y] != null).sort((a, b) => a - b); vals = years.map((y) => ps[y]); }
    else { years = HEAT_YEARS; vals = heatSeries(state.testVar, sel.sq); }
    const r = testSeries(vals, years);
    trendChart($("#test-chart"), vals, years, r, colour, d, unit);
    const uDec = `${unit} ${tt.perDecade}`, dd = d === 0 ? 0 : d;
    const fmtV = (v) => (dd === 0 ? fmtInt(Math.abs(v)) : num(Math.abs(v), dd));
    $("#test-verdict").textContent = !isFinite(r.p) ? tt.few
      : r.p < 0.05 ? (r.perDec > 0 ? tt.rising(label, fmtV(r.perDec), uDec) : tt.falling(label, fmtV(r.perDec), uDec))
        : tt.none(label, (r.perDec >= 0 ? "+" : "−") + fmtV(r.perDec), uDec);
    $("#test-stats").innerHTML =
      `<dt>${tt.slope}</dt><dd>${isFinite(r.perDec) ? `${r.perDec >= 0 ? "+" : "−"}${fmtV(r.perDec)} ${uDec}` : "–"}</dd>` +
      `<dt>${tt.n}</dt><dd>${r.n} / ${years.length}</dd>` +
      `<dt>${tt.S}</dt><dd>${r.s}</dd><dt>${tt.z}</dt><dd>${isFinite(r.z) ? num(r.z, 2) : "–"}</dd>` +
      `<dt>${tt.p}</dt><dd>${isFinite(r.p) ? fmtP(r.p).replace("p = ", "").replace("p < ", "< ") : "–"}</dd>`;
    $("#test-table").innerHTML = `<table><thead><tr><th>${tt.year}</th><th>${tt.value} (${unit})</th><th>${tt.trend}</th></tr></thead><tbody>` +
      years.map((yr, k) => `<tr><td>${yr}</td><td>${vals[k] == null || !isFinite(vals[k]) ? "–" : (dd === 0 ? fmtInt(vals[k]) : num(vals[k], dd))}</td><td>${isFinite(r.slope) ? (dd === 0 ? fmtInt(r.icpt + r.slope * yr) : num(r.icpt + r.slope * yr, dd)) : "–"}</td></tr>`).join("") +
      `</tbody></table>`;
  }

