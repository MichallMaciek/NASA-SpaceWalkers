// SARnik core, part 32 of 32: language, wiring of the controls, main(): start of the app (runs last).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= i18n & wiring ================= */
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = U().docTitle;
    const t = T(), u = U();
    document.querySelectorAll("[data-i18n]").forEach((el) => { const v = u[el.dataset.i18n] ?? t[el.dataset.i18n]; if (typeof v === "string") el.textContent = v; });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = u[el.dataset.i18nPh] ?? t[el.dataset.i18nPh]; });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = u[el.dataset.i18nTitle]; el.setAttribute("aria-label", u[el.dataset.i18nTitle]); });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", u[el.dataset.i18nAria] ?? t[el.dataset.i18nAria] ?? ""); });
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    $("#about-body").innerHTML = (u.aboutLink || "") + t.aboutHtml + (sar && u.aboutSar ? u.aboutSar : "");
    $("#radar-btn").hidden = !sar;
    if (sar) $("#radar-body").innerHTML = u.radarHtml({ upHa: fmtInt(sar.s1.up3db_ha), wetShare: num(sar.checks.wet.share_sig_study * 100, 0),
      bands: sar.nisar ? sar.nisar.checks.bands : null, fmt: (v) => num(v, 1) });
    stopPlay();
    renderLenses(); renderDrawer(); renderTimeline(); renderLegend(); renderCard();
    if ($("#test-sheet").open) renderTest();
  }
  function wire() {
    document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => {
      lang = b.dataset.lang;
      try { localStorage.setItem("ptd-lang", lang); } catch (e) { /* ignore */ }
      applyLang();
    }));
    $("#menu-btn").addEventListener("click", () => openDrawer($("#drawer").hidden));
    // phones: the legend is a small key under the map views; a tap opens and closes it (styles.css, max-width 760px)
    $("#legend").addEventListener("click", (e) => { if (innerWidth <= 760 && !e.target.closest("button")) $("#legend").classList.toggle("open"); });
    $("#theme-btn").addEventListener("click", () => setTheme(dark() ? "light" : "dark"));
    $("#mode-hex").addEventListener("click", () => setHexMode(true));
    $("#mode-heat").addEventListener("click", () => setHexMode(false));
    setHexMode(state.hex);
    $("#drawer-close").addEventListener("click", () => openDrawer(false));
    $("#zoom-in").addEventListener("click", () => map.zoomIn());
    $("#zoom-out").addEventListener("click", () => map.zoomOut());
    // the zoom buttons show when the limit is reached
    const zoomState = () => { $("#zoom-in").disabled = map.getZoom() >= map.getMaxZoom(); $("#zoom-out").disabled = map.getZoom() <= map.getMinZoom(); };
    map.on("zoomend", zoomState); zoomState();
    map.on("moveend", hiresPoke); // the sharp radar picture is fetched once the map is zoomed in on the city
    // a pointer drag snaps to the nearest radar year; arrow keys step to the next year with data
    let yearDrag = false;
    $("#year").addEventListener("pointerdown", () => { yearDrag = true; });
    ["pointerup", "pointercancel", "blur"].forEach((ev) => window.addEventListener(ev, () => { yearDrag = false; }));
    $("#year").addEventListener("input", (e) => { stopPlay(); if (passOn()) setPass(+e.target.value); else if (radarTL()) setRYear(+e.target.value, yearDrag); else setYear(+e.target.value); });
    $("#year").addEventListener("change", (e) => {
      if (radarTL()) {
        e.target.value = passOn() ? pass : state.ryear; // the input event already moved to the year with data
      } else {
        let y = +e.target.value;
        if (state.lens === "history" && Math.abs(y - NOW_YEAR) <= 0.5) y = NOW_YEAR;
        else y = Math.round(y);
        setYear(y, { now: true });
      }
    });
    $("#year").addEventListener("keydown", (e) => {
      if (radarTL()) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault(); stopPlay(); setYear(Math.round(state.yearF - 1), { now: true });
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault(); stopPlay(); setYear(Math.round(state.yearF + 1), { now: true });
      } else if (e.key === "PageDown") {
        e.preventDefault(); stopPlay(); setYear(Math.round(state.yearF - 5), { now: true });
      } else if (e.key === "PageUp") {
        e.preventDefault(); stopPlay(); setYear(Math.round(state.yearF + 5), { now: true });
      }
    });
    // "Today" on the time line; on the radar time line the class "now" only marks the selected year
    $("#tl-ticks").addEventListener("click", (e) => {
      const nowEl = e.target.closest(".now");
      if (nowEl && state.lens === "history") { stopPlay(); setYear(NOW_YEAR, { now: true }); return; }
      const span = e.target.closest("span");
      if (span && !nowEl) {
        const y = parseInt(span.textContent, 10);
        if (y && !isNaN(y)) { stopPlay(); setYear(y, { now: true }); }
      }
    });
    $("#tl-ticks").addEventListener("keydown", (e) => {
      if (state.lens === "history" && (e.key === "Enter" || e.key === " ") && e.target.closest(".now")) {
        e.preventDefault(); stopPlay(); setYear(NOW_YEAR, { now: true });
      }
    });
    $("#play").addEventListener("click", togglePlay);
    $("#test-close").addEventListener("click", () => $("#test-sheet").close());
    $("#about-close").addEventListener("click", () => $("#about-sheet").close());
    $("#radar-btn").addEventListener("click", () => $("#radar-sheet").showModal());
    $("#radar-close").addEventListener("click", () => $("#radar-sheet").close());
    document.addEventListener("click", (e) => { if (e.target.closest("[data-radar-how]")) { e.preventDefault(); $("#radar-sheet").showModal(); } });
    // a click on the dimmed backdrop closes a dialog (the click lands on the <dialog> itself, outside its box)
    document.querySelectorAll("dialog.sheet").forEach((d) => d.addEventListener("click", (e) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    }));
    // Escape closes the settings drawer (dialogs, drawing and the search list handle their own Escape first)
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || e.defaultPrevented || draw.mode || $("#drawer").hidden) return;
      if (document.querySelector("dialog[open]") || (e.target.id === "q" && !$("#suggest").hidden)) return;
      openDrawer(false);
    });
    // map credits open in a new tab instead of replacing the app
    document.addEventListener("click", (e) => { const a = e.target.closest(".leaflet-control-attribution a"); if (a) { a.target = "_blank"; a.rel = "noopener"; } }, true);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { redraw(); renderTimeline(); });
    window.addEventListener("resize", () => { map.invalidateSize(); renderTimeline(); });
  }

  // The place card needs the two MODIS grids and about 10 MB of rasters on top of the first view. They are fetched when
  // a place is picked (finishSelection), so a visit that only looks at the map does not pay for them. Opening the search
  // box or a drawing tool says a place is about to be picked: the download then starts a few seconds early, at low
  // priority. On a data-saving or slow connection nothing is fetched ahead.
  let warmed = false;
  function warmUp() {
    if (warmed) return;
    warmed = true;
    const c = navigator.connection;
    if (c && (c.saveData || /^(slow-2g|2g|3g)$/.test(c.effectiveType || ""))) return;
    loadGrids().catch(() => {});
    const names = PLACE_LAYERS(); // four at a time, so map tiles and anything the visitor asks for directly go first
    let i = 0;
    const next = () => { while (i < names.length && L8[names[i]]) i++; if (i < names.length) loadGray(names[i++], true).then(next, next); };
    for (let k = 0; k < 4; k++) next();
  }

  // Settings the team changes on the server without a new version of the app: web/ustawienia.json (served with
  // Cache-Control: no-cache, so a redeploy of that one file is seen on the next visit). Today one key: defaultBase,
  // "map" (the plain map) or "orto" (the aerial photo). ?mapa=map|orto in the address wins. A missing or slow file
  // (1.5 s) keeps the default from part 05.
  async function loadSettings() {
    const ok = (v) => (v === "map" || v === "orto" ? v : null);
    const fromUrl = ok(new URLSearchParams(location.search).get("mapa"));
    if (fromUrl) { state.base = fromUrl; return; }
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 1500);
      const r = await fetch("ustawienia.json", { cache: "no-cache", signal: ctl.signal });
      clearTimeout(timer);
      if (!r.ok) return;
      const s = await r.json(), b = ok(s && s.defaultBase);
      if (b) state.base = b;
    } catch (e) { /* no settings: keep the default */ }
  }

  async function main() {
    // Everything the first view needs is asked for at once; nothing waits for anything else.
    const baseP = makeVectorBase(); // the base map style (4 s limit); initMap awaits it and falls back to a raster
    baseP.catch(() => {});
    const settingsP = loadSettings();
    // The finer radar pictures are optional. The radar products are optional only where they were never built (404):
    // the app then uses the v1 layout. If sar.json exists but cannot be reached, start-up fails with the retry message
    // instead of quietly showing a visitor the layout without radar.
    [study, areas, land, flood, hires, sar] = await Promise.all([get("study.json"), get("areas.geojson"), get("land/land.json"),
      get("podtopienia.geojson"), get("land/hires.json").catch(() => null), get("land/sar.json").catch((e) => { if (e.status === 404) return null; throw e; })]);
    NISAR_DATES = land.nisar_dates || [];
    state.lyr.nisar.i = Math.max(0, NISAR_DATES.length - 1);
    if (!sar) { SAR_KEYS.forEach((k) => { state.lyr[k].on = false; }); state.lyr.built.on = true; }
    if (sar) state.lyr.alos.y = LBAND_YEARS()[LBAND_YEARS().length - 1];
    // start on the radar view: NISAR 2026 at the end of the L-band time line. Its rasters download while the map is set up.
    const firstP = sar ? applyLens() : Promise.resolve();
    await settingsP;
    await initMap(baseP);
    initDraw();
    initParcels();
    initSearch();
    wire();
    document.body.classList.toggle("expert", state.expert);
    applyLang(); // texts and controls are on screen from here; the radar picture follows as soon as its rasters land
    await firstP;
    loadAnim(); // the NISAR passes of 2026: only their small meta.json now, the frames when the viewer opens them
    await Promise.all(Object.keys(NEEDS).filter((k) => state.lyr[k] && state.lyr[k].on).map(ensure));
    redraw();
    try { performance.mark("sarnik-first-view"); } catch (e) { /* ignore */ }
    // The place-card layers (about 10 MB) and the MODIS grids are not preloaded: finishSelection loads and awaits them on
    // the first selection, so a visit that only looks at the map downloads about 2 MB instead of 14 MB.
    $("#q").addEventListener("focus", warmUp, { once: true });
    ["#tool-free", "#tool-poly", "#tool-circle"].forEach((sel) => $(sel).addEventListener("click", warmUp, { once: true }));
    // open a shared place link: #52.40812,16.93350, now and whenever the address changes in this tab. Chat apps encode
    // the comma or glue a full stop to the end, so the pattern is forgiving; a point outside the map is ignored.
    const openHash = () => {
      let h = location.hash;
      try { h = decodeURIComponent(h); } catch (e) { /* keep it as typed */ }
      // a plot: #dz=<land-register id>, opened through ULDK GetParcelById
      const dz = h.match(/^#\s*dz=([^\s]+?)[.,;)\s]*$/);
      if (dz) {
        if (!(state.sel && state.sel.kind === "parcel" && state.sel.parcel.id === dz[1])) openParcelId(dz[1]);
        return;
      }
      // a circle: #lat,lng (1 km) or #lat,lng,r with r in km (0.25, 0.5, 2, 3)
      const m = h.match(/^#\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)(?:\s*[,;\s]\s*(\d+(?:\.\d+)?)(?=[.,;)\s]*$))?[.,;)\s]*$/);
      if (!m) return;
      const lat = +m[1], lng = +m[2], r = CIRCLE_KM.includes(+m[3]) ? +m[3] : 1, [[south, west], [north, east]] = land.bounds;
      if (lat < south || lat > north || lng < west || lng > east) return;
      const same = state.sel && state.sel.kind === "point" && state.sel.r === r && state.sel.lat.toFixed(5) === lat.toFixed(5) && state.sel.lng.toFixed(5) === lng.toFixed(5);
      if (!same) selectPoint(lat, lng, null, { zoom: r <= 0.5 ? 16 : 14, r }); // the place already on screen is not picked a second time
    };
    window.addEventListener("hashchange", openHash);
    openHash();
  }
  skLoadModules(); // the extension modules (web/sarnik/) start after every core part has run, as with the single app.js
  main().catch((e) => {
    console.error(e); // the technical detail stays in the console
    if (location.protocol === "file:") {
      $("#sidecard").innerHTML = `<p>The data did not load (${esc(e.message)}). Serve the <code>web</code> folder over HTTP, for example: <code>python3 -m http.server</code>.</p>`;
      return;
    }
    renderLoadError();
  });
