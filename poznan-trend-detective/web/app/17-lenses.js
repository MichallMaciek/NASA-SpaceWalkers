// SARnik core, part 17 of 32: SAR mark and the map views (lenses).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= SAR mark (v3): what comes from radar and what does not ================= */
  const SAR_ICON = (part) => `<svg class="sar-i${part ? " part" : ""}" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 13.5a11 11 0 0 1 11-11"/><path d="M5.5 13.5a8 8 0 0 1 8-8"/><path d="M8.5 13.5a5 5 0 0 1 5-5"/><circle cx="13" cy="13" r="1.2"/></svg>`;
  function sarMark(lvl) {
    if (lvl !== "yes" && lvl !== "part") return "";
    const t = lvl === "yes" ? U().sarYes : U().sarPart;
    return `<span class="sar-tag" role="img" aria-label="${t}" title="${t}">${SAR_ICON(lvl === "part")}</span>`;
  }
  const LENS_SAR = { score: "part", history: "no", build: "yes", water: "part", ground: "yes", trees: "no", radar: "yes" };
  const lensSar = (k) => (k === "trees" && sar && sar.zips && sar.zips.dist ? "part" : LENS_SAR[k]); // OPERA (Sentinel-1) in the trees view
  const FIND_SAR = { lband: "yes", radar: "yes", wet: "yes", ground: "yes", modelRadar: "part" };

  /* ================= lenses (v3): one plain question per map view ================= */
  const LENSES = () => {
    const all = [
      { k: "score", layers: ["score"] },
      { k: "history", layers: ["built"] },
      { k: "build", layers: ["sarchange"] },
      { k: "water", layers: sar && sar.nisar ? ["flood", "nisarwet", "sarwater"] : ["flood", "sarwet", "sarwater"] },
      { k: "ground", layers: ["egms"] },
      { k: "trees", layers: sar && sar.zips && sar.zips.dist ? ["forest", "dist"] : ["forest"] },
      { k: "radar", layers: sar && sar.nisar ? ["alos"] : ["s1rgb"] },
    ];
    return sar ? all : all.filter((l) => l.k === "score" || l.k === "trees" || l.k === "history");
  };
  // past radar years show the L-band archive (ALOS-2); 2026 shows each view's own radar product
  const lensLayers = (l) => (sar && RADAR_LENSES.includes(l.k) && state.ryear < 2026 ? ["alos"] : l.layers);
  async function applyLens() {
    const lens = LENSES().find((l) => l.k === state.lens);
    if (!lens) return;
    const layers = lensLayers(lens);
    if (layers.includes("alos")) state.lyr.alos.y = state.ryear;
    Object.keys(state.lyr).forEach((key) => { state.lyr[key].on = layers.includes(key); });
    await Promise.all(layers.map(ensure));
  }
  async function setLens(k) {
    if (k !== null && !LENSES().some((l) => l.k === k)) return;
    stopPlay();
    state.lens = k; pass = -1;
    if (k === null) Object.keys(state.lyr).forEach((key) => { state.lyr[key].on = false; }); // back to the clean map
    else if (k === "trees") setYear(2024);
    else if (k === "history") {
      if (state.year < TL_MIN || state.year > horizonEnd()) setYear(NOW_YEAR);
    } else if (state.year > NOW_YEAR) setYear(NOW_YEAR);
    await applyLens();
    renderLenses(); renderDrawer(); renderTimeline(); renderLegend(); redraw();
  }
  // moving right picks the next year with data, moving left the previous one (keyboard arrows cross the 2022-2025 gap);
  // a mouse or touch drag (nearest = true) snaps to the closest year with data, so the view does not flip while the handle crosses the gap
  async function setRYear(y, nearest) {
    const ys = RY(), cur = state.ryear;
    const next = nearest ? ys.reduce((best, v) => (Math.abs(v - y) < Math.abs(best - y) ? v : best), cur)
      : y >= cur ? (ys.find((v) => v >= y) ?? ys[ys.length - 1]) : ([...ys].reverse().find((v) => v <= y) ?? ys[0]);
    if (next === cur) { renderTimeline(); return; }
    state.ryear = next;
    renderTimeline();
    setBusy(1); // the caption under the year pulses while that year's picture loads
    try { await applyLens(); } finally { setBusy(-1); }
    if (!$("#drawer").hidden) renderDrawer();
    renderLegend(); redraw();
  }
  // Re-rendering with innerHTML destroys the focused control. keepFocus puts the focus back on the same control in the new markup,
  // so keyboard users do not fall back to the top of the page after every button press.
  const focusKey = (el) => {
    if (!el || !el.dataset) return null;
    if (el.id) return `#${el.id}`;
    const hit = ["lens", "base", "hz", "toggle", "f", "v", "lang"].find((k) => el.dataset[k] != null);
    if (hit) return `[data-${hit}="${el.dataset[hit]}"]`;
    return el.dataset.id ? `[data-id="${el.dataset.id}"][data-end="${el.dataset.end}"]` : null;
  };
  function keepFocus(root, render) {
    const a = document.activeElement, key = root && root.contains(a) ? focusKey(a) : null;
    render();
    if (key) { const n = root.querySelector(key); if (n && n !== document.activeElement) n.focus({ preventScroll: true }); }
  }
  // a view picked by hand ends the highlighted finding (the finding no longer describes what the map shows)
  async function pickLens(k) {
    const had = state.finding;
    state.finding = null;
    await setLens(state.lens === k ? null : k); // a second click on the active view switches it off
    if (had && !state.sel) renderFindings();
  }
  // The views bar is one button, "View: Plot score ▾", that opens the list of views under it. The first entry, "Default
  // view", switches every thematic view off. Esc, a click outside the list or the button again close it. Whether a view
  // uses radar is said in its tooltip only (the drawer's list keeps the SAR marks).
  let lensMenuOpen = false;
  function setLensMenu(open) {
    lensMenuOpen = open;
    const box = $("#lenses"), btn = box && box.querySelector("#lens-toggle"), list = box && box.querySelector("#lens-menu");
    if (btn) btn.setAttribute("aria-expanded", String(open));
    if (list) list.hidden = !open;
    if (box) box.classList.toggle("open", open);
  }
  async function pickFromMenu(k) {
    setLensMenu(false);
    const btn = $("#lens-toggle");
    if (btn) btn.focus({ preventScroll: true }); // the list closes, so the focus goes back to its button
    if (k === state.lens) return; // picking the view already on keeps it (a second click in the old bar switched it off)
    if (k) { await pickLens(k); return; }
    const had = state.finding;
    state.finding = null;
    await setLens(null);
    if (had && !state.sel) renderFindings();
  }
  function renderLenses() {
    const box = $("#lenses"), u = U();
    if (!box) return;
    const tip = (k) => `${u.lensTip[k]}${lensSar(k) === "no" ? "" : ` (${lensSar(k) === "yes" ? u.sarYes : u.sarPart})`}`;
    keepFocus(box, () => {
      box.innerHTML = `<button type="button" class="lens-toggle" id="lens-toggle" aria-expanded="${lensMenuOpen}" aria-controls="lens-menu">${esc(u.lensView)}: ${esc(state.lens ? u.lens[state.lens] : u.lensDefaultShort)}<span class="lens-caret" aria-hidden="true">▾</span></button>` +
        `<div class="lens-menu card" id="lens-menu"${lensMenuOpen ? "" : " hidden"}>` +
        `<button type="button" data-lens="" aria-pressed="${!state.lens}" title="${esc(u.lensDefaultTip)}">${esc(u.lensDefault)}</button><span class="lens-sep" aria-hidden="true"></span>` +
        LENSES().map((l) => `<button type="button" data-lens="${l.k}" aria-pressed="${state.lens === l.k}" title="${esc(tip(l.k))}">${esc(u.lens[l.k])}</button>`).join("") +
        "</div>";
    });
    box.classList.toggle("open", lensMenuOpen);
    box.querySelector("#lens-toggle").addEventListener("click", () => setLensMenu(!lensMenuOpen));
    box.querySelectorAll("[data-lens]").forEach((b) => b.addEventListener("click", () => pickFromMenu(b.dataset.lens || null)));
    if (box.dataset.wired) return;
    box.dataset.wired = "1";
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !lensMenuOpen) return;
      e.preventDefault(); // the drawer's own Escape handler skips a handled key
      setLensMenu(false);
      const btn = $("#lens-toggle");
      if (btn) btn.focus({ preventScroll: true });
    });
    document.addEventListener("click", (e) => { if (lensMenuOpen && !box.contains(e.target)) setLensMenu(false); });
  }
  function setExpert(on) {
    state.expert = on;
    try { localStorage.setItem("ptd-expert", on ? "1" : "0"); } catch (e) { /* ignore */ }
    document.body.classList.toggle("expert", on);
    renderDrawer(); renderLegend(); renderTimeline(); redraw();
    if (state.sel && state.sel.ready) renderCard(); else if (!state.sel) renderFindings();
  }

