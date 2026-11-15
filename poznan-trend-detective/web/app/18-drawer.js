// SARnik core, part 18 of 32: drawer: map settings, layer switches, sliders.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= drawer (map settings) ================= */
  const DOT = { s1rgb: "--c-radar", sarchange: "--c-built", sarwet: "--c-radar", sarwater: "--area", egms: "--c-heat", alos: "--c-green", nisarwet: "--c-nisar", nisarcoh: "--c-nisar", nisarsm: "--c-nisar", dist: "--c-forest", wuia: "--c-built", flood: "--area", built: "--c-built", forest: "--c-forest", price: "--c-price", activity: "--c-terrain", dem: "--c-terrain", radar: "--ink-2", nisar: "--c-nisar", night: "--c-heat", day: "--c-heat", ndvi: "--c-green", nightyear: "--c-heat" };
  function rangeHTML(id, min, max, step, lo, hi, cls = "") {
    const a = ((lo - min) / (max - min)) * 100, b = hi == null ? a : ((hi - min) / (max - min)) * 100;
    return `<div class="rng ${cls}" data-rng="${id}"><div class="rail"></div><div class="fill" style="left:${hi == null ? 0 : a}%;width:${hi == null ? a : b - a}%"></div>
      <input type="range" data-id="${id}" data-end="lo" min="${min}" max="${max}" step="${step}" value="${lo}">
      ${hi == null ? "" : `<input type="range" data-id="${id}" data-end="hi" min="${min}" max="${max}" step="${step}" value="${hi}">`}</div>`;
  }
  function layerRow(k, extra = "") {
    const u = U(), s = state.lyr[k];
    return `<div class="lyr${s.on ? "" : " off"}" data-k="${k}">
      <div class="lyr-head"><label class="lyr-name" for="sw-${k}"><span class="dot" style="background:${css(DOT[k])}"></span><span>${u.L[k]}<small>${u.Lsub[k]}</small></span></label>
        <span class="switch"><input type="checkbox" id="sw-${k}" data-toggle="${k}" ${s.on ? "checked" : ""}><span></span></span></div>
      <div class="lyr-ctrl">${extra}<div class="field"><div class="field-head"><span class="fl" style="font-size:13px;color:var(--ink-2)">${u.opacity}</span><output>${Math.round(s.op * 100)}%</output></div>${rangeHTML(`op-${k}`, 20, 100, 5, Math.round(s.op * 100))}</div></div>
    </div>`;
  }
  const lbLabel = (y) => (y === 2026 ? "2026 (NISAR)" : `${y} (ALOS-2)`);
  function renderDrawer() {
    const u = U(), L_ = state.lyr;
    const demMax = Math.ceil(Math.max(...Object.values(land.municipalities).map((m) => m.elev_max))); // 164 m: the hills too
    const dem = `<div class="field"><div class="field-head"><span class="fl">${u.demRange}</span><output>${L_.dem.lo}–${L_.dem.hi} m ${u.asl}</output></div>${rangeHTML("dem", Math.floor(land.dem_offset), demMax, 1, L_.dem.lo, L_.dem.hi)}</div>`;
    const radar = `<div class="field"><div class="field-head"><span class="fl">${u.radarRange}</span><output>${L_.radar.lo} ${u.to} ${L_.radar.hi} dB</output></div>${rangeHTML("radar", -25, 5, 1, L_.radar.lo, L_.radar.hi)}<div class="hint">${u.radarHint(s1Year())}</div></div>`;
    const act = `<div class="field"><div class="field-head"><span class="fl">${u.minChange}</span><output>${num(L_.activity.min, 1)} dB</output></div>${rangeHTML("act", 1, 8, 0.5, L_.activity.min)}</div>`;
    const nis = NISAR_DATES.length ? `<div class="field"><div class="field-head"><span class="fl">${u.pass}</span><output>${NISAR_DATES[L_.nisar.i]}</output></div>${rangeHTML("nisar", 0, NISAR_DATES.length - 1, 1, L_.nisar.i)}</div>` : "";
    const field = (label, out, rng) => `<div class="field"><div class="field-head"><span class="fl">${label}</span><output>${out}</output></div>${rng}</div>`;
    const radarSecs = sar ? `
      <details class="sec" data-sec="radar"><summary>${u.secRadar}</summary><div class="sec-body">
        ${layerRow("s1rgb")}
        ${layerRow("sarchange", field(u.minDb, `${num(L_.sarchange.min, 1)} dB`, rangeHTML("sch", 1, 8, 0.5, L_.sarchange.min)))}
        ${layerRow("sarwet")}
        ${layerRow("sarwater", field(u.minWater, `${L_.sarwater.min}%`, rangeHTML("swa", 10, 90, 5, L_.sarwater.min)))}
        ${sar.nisar ? layerRow("nisarwet", field(u.minDb, `${num(L_.nisarwet.min, 1)} dB`, rangeHTML("nwm", 1, 6, 0.5, L_.nisarwet.min))) : ""}
        ${zipOk("nisarsm") ? layerRow("nisarsm", `<div class="field"><div class="field-head"><span class="fl">${u.passDate}</span></div><div class="seg" role="group">${[["0625", "25.06"], ["0824", "24.08"]].map(([d, t]) => `<button type="button" data-smd="${d}" aria-pressed="${L_.nisarsm.d === d}">${t}</button>`).join("")}</div></div>`) : ""}
        ${zipOk("nisarcoh") ? layerRow("nisarcoh") : ""}
        ${layerRow("nisar", nis)}
      </div></details>
      <details class="sec" data-sec="ground"><summary>${u.secGround}</summary><div class="sec-body">
        ${layerRow("egms", field(u.minMove, `${L_.egms.min} mm/${u.yr}`, rangeHTML("seg", 1, 10, 1, L_.egms.min)))}
        ${layerRow("alos", field(u.alosYear, lbLabel(L_.alos.y), rangeHTML("aly", 0, LBAND_YEARS().length - 1, 1, Math.max(0, LBAND_YEARS().indexOf(L_.alos.y)))))}
        ${layerRow("dem", dem)}${layerRow("radar", radar)}${layerRow("activity", act)}
      </div></details>` : `
      <details class="sec" data-sec="sar"><summary>${u.secSar}</summary><div class="sec-body">
        ${layerRow("dem", dem)}${layerRow("radar", radar)}${layerRow("nisar", nis)}${layerRow("activity", act)}
      </div></details>`;
    const full = `
      <details class="sec" data-sec="history" open><summary>${sar ? u.secHistory : u.secLayers}</summary><div class="sec-body">
        ${layerRow("built")}${layerRow("wuia")}${layerRow("flood")}${layerRow("forest")}${sar && zipOk("dist") ? layerRow("dist") : ""}${layerRow("price")}
      </div></details>
      ${radarSecs}
      <details class="sec" data-sec="pred" open><summary>${u.secPred}</summary><div class="sec-body">
        <div class="field"><div class="field-head"><span class="fl">${u.horizon}</span></div>
          <div class="seg" role="group"><button type="button" data-hz="5" aria-pressed="${state.horizon === 5}">${u.years5}</button><button type="button" data-hz="10" aria-pressed="${state.horizon === 10}">${u.years10}</button></div></div>
        <div class="field"><div class="field-head"><span class="fl">${u.minChance}</span><output>${state.minChance}%</output></div>${rangeHTML("chance", 1, 40, 1, state.minChance, null, "pred")}
          <div class="hint">${u.chanceHint(num(land.model.top_n_hit_rate * 100, 0), num(land.model.open_land_auc, 2))}</div></div>
      </div></details>
      <details class="sec" data-sec="nasa"><summary>${u.secNasa}</summary><div class="sec-body">
        ${layerRow("night")}${layerRow("day")}${layerRow("ndvi")}${layerRow("nightyear")}
      </div></details>
      <div class="checkrow"><span>${T().borders}</span><span class="switch"><input type="checkbox" id="borders" aria-label="${T().borders}" ${map.hasLayer(borderLayer) ? "checked" : ""}><span></span></span></div>`;
    // v3: plain choices first (one map question at a time, background, expert switch); every layer and slider below
    const simpleTop = `
      <section class="simple-sec"><h3 class="sh">${u.showOnMap}</h3>
        <div class="lens-list">${LENSES().map((l) => `<button type="button" class="lens-item" data-lens="${l.k}" aria-pressed="${state.lens === l.k}"><b>${u.lens[l.k]}${sarMark(lensSar(l.k))}</b><span>${u.lensTip[l.k]}</span></button>`).join("")}</div></section>
      <section class="simple-sec"><h3 class="sh">${u.baseT}</h3>
        <div class="basegrid">${["map", "orto", "poz2025", "poz1940"].map((k) => `<button type="button" data-base="${k}" aria-pressed="${state.base === k}">${T().B[k] || u.baseMap}</button>`).join("")}</div></section>
      <div class="checkrow expert-row"><label for="expert-sw"><b>${u.expertT}</b><small>${u.expertSub}</small></label><span class="switch"><input type="checkbox" id="expert-sw" ${state.expert ? "checked" : ""}><span></span></span></div>`;
    // a re-render (language, view, year, expert mode) keeps the sections the user opened, the scroll position and the focus
    const body = $("#drawer-body"), keep = {}, top = body.scrollTop;
    body.querySelectorAll("details[data-sec]").forEach((d) => { keep[d.dataset.sec] = d.open; });
    keepFocus(body, () => {
      body.innerHTML = simpleTop +
        (state.expert ? full : `<details class="sec adv" data-sec="adv"><summary>${u.allLayers}</summary><div class="sec-body">${full}</div></details>`) +
        `<details class="sec link" id="sources-link"><summary>${u.sourcesT}</summary></details>`;
      body.querySelectorAll("details[data-sec]").forEach((d) => { if (d.dataset.sec in keep) d.open = keep[d.dataset.sec]; });
    });
    body.scrollTop = top;
    $("#drawer-foot").textContent = u.footer;
    wireDrawer();
  }
  function syncRange(el) {
    const box = el.closest(".rng"), ins = box.querySelectorAll("input"), fill = box.querySelector(".fill");
    const min = +ins[0].min, max = +ins[0].max, p = (v) => ((v - min) / (max - min)) * 100;
    if (ins.length === 2) {
      let lo = +ins[0].value, hi = +ins[1].value;
      const step = +ins[0].step || 1;
      // keep one step between the handles: when they met, the upper one covered the lower and neither could be dragged apart
      if (lo > hi - step) {
        if (el === ins[0]) lo = Math.max(min, hi - step); else hi = Math.min(max, lo + step);
        if (lo > hi - step) { lo = hi - step; }
        ins[0].value = lo; ins[1].value = hi;
      }
      fill.style.left = `${p(lo)}%`; fill.style.width = `${p(hi) - p(lo)}%`;
      return [lo, hi];
    }
    fill.style.left = "0"; fill.style.width = `${p(+ins[0].value)}%`;
    return [+ins[0].value];
  }
  function wireDrawer() {
    const body = $("#drawer-body"), u = U();
    body.querySelectorAll("[data-toggle]").forEach((cb) => cb.addEventListener("change", async () => {
      const k = cb.dataset.toggle;
      state.lyr[k].on = cb.checked;
      cb.closest(".lyr").classList.toggle("off", !cb.checked);
      if (cb.checked) await ensure(k);
      // a lens stays highlighted only while the map shows exactly its layers
      const match = LENSES().find((l) => Object.keys(state.lyr).every((key) => ["wuia", "nisar"].includes(key) || state.lyr[key].on === lensLayers(l).includes(key)));
      state.lens = match ? match.k : null;
      renderLenses(); renderTimeline();
      body.querySelectorAll(".lens-item").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lens === state.lens)));
      redraw();
    }));
    body.querySelectorAll(".rng input").forEach((inp) => { // accessible name = the visible label (plus the layer name for opacity)
      const fl = inp.closest(".field") && inp.closest(".field").querySelector(".fl"), id = inp.dataset.id;
      const name = `${id.startsWith("op-") ? `${u.L[id.slice(3)]}: ` : ""}${fl ? fl.textContent.trim() : ""}`;
      const two = inp.parentElement.querySelectorAll("input").length === 2;
      inp.setAttribute("aria-label", two ? `${name} (${inp.dataset.end === "lo" ? "min" : "max"})` : name);
    });
    body.querySelectorAll(".rng input").forEach((inp) => inp.addEventListener("input", () => {
      const vals = syncRange(inp), id = inp.dataset.id, out = inp.closest(".field").querySelector("output");
      if (id.startsWith("op-")) { const k = id.slice(3); state.lyr[k].op = vals[0] / 100; out.textContent = `${vals[0]}%`; }
      else if (id === "dem") { [state.lyr.dem.lo, state.lyr.dem.hi] = vals; out.textContent = `${vals[0]}–${vals[1]} m ${u.asl}`; }
      else if (id === "radar") { [state.lyr.radar.lo, state.lyr.radar.hi] = vals; out.textContent = `${vals[0]} ${u.to} ${vals[1]} dB`; }
      else if (id === "act") { state.lyr.activity.min = vals[0]; out.textContent = `${num(vals[0], 1)} dB`; }
      else if (id === "nisar") { state.lyr.nisar.i = vals[0]; out.textContent = NISAR_DATES[vals[0]]; }
      else if (id === "chance") { state.minChance = vals[0]; out.textContent = `${vals[0]}%`; }
      else if (id === "sch") { state.lyr.sarchange.min = vals[0]; out.textContent = `${num(vals[0], 1)} dB`; }
      else if (id === "swa") { state.lyr.sarwater.min = vals[0]; out.textContent = `${vals[0]}%`; }
      else if (id === "seg") { state.lyr.egms.min = vals[0]; out.textContent = `${vals[0]} mm/${u.yr}`; }
      else if (id === "aly") { state.lyr.alos.y = LBAND_YEARS()[vals[0]]; out.textContent = lbLabel(state.lyr.alos.y); if (radarTL()) { state.ryear = state.lyr.alos.y; renderTimeline(); } if (state.lyr.alos.on) { ensure("alos").then(redraw); return; } }
      else if (id === "nwm") { state.lyr.nisarwet.min = vals[0]; out.textContent = `${num(vals[0], 1)} dB`; }
      redraw();
    }));
    body.querySelectorAll("[data-hz]").forEach((b) => b.addEventListener("click", () => {
      state.horizon = +b.dataset.hz;
      body.querySelectorAll("[data-hz]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      setYear(state.yearF, { now: true }); // clamps the year to the new horizon and keeps slider, label and bar in step
      if (state.sel && state.sel.ready) renderCard();
    }));
    body.querySelectorAll("[data-smd]").forEach((b) => b.addEventListener("click", async () => {
      state.lyr.nisarsm.d = b.dataset.smd;
      body.querySelectorAll("[data-smd]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      if (state.lyr.nisarsm.on) await ensure("nisarsm");
      redraw();
    }));
    body.querySelectorAll("[data-base]").forEach((b) => b.addEventListener("click", () => {
      setBase(b.dataset.base);
      body.querySelectorAll("[data-base]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    body.querySelectorAll("[data-lens]").forEach((b) => b.addEventListener("click", () => pickLens(b.dataset.lens)));
    const ex = $("#expert-sw");
    if (ex) ex.addEventListener("change", () => setExpert(ex.checked));
    const bd = $("#borders");
    if (bd) bd.addEventListener("change", () => {
      if (bd.checked) borderLayer.addTo(map); else map.removeLayer(borderLayer);
      syncNames();
    });
    $("#sources-link").addEventListener("click", (e) => { e.preventDefault(); $("#about-sheet").showModal(); });
  }
  function openDrawer(open) {
    const was = !$("#drawer").hidden, inside = $("#drawer").contains(document.activeElement);
    $("#drawer").hidden = !open;
    document.body.classList.toggle("drawer-open", open);
    $("#menu-btn").setAttribute("aria-expanded", String(open));
    // keyboard: the focus moves into the drawer when it opens and returns to the menu button when it closes
    if (open && !was) $("#drawer-close").focus({ preventScroll: true });
    else if (!open && was && (inside || document.activeElement === document.body)) $("#menu-btn").focus({ preventScroll: true });
    setTimeout(() => map.invalidateSize(), 50);
  }

