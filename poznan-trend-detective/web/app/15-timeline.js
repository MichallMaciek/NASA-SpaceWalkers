// SARnik core, part 15 of 32: time line: years, radar axis, play.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= timeline ================= */
  const TL_MIN = 1975;
  const TL_TREES_MIN = 2001;
  const TL_TREES_MAX = 2024;
  const pos = (y) => ((y - TL_MIN) / (horizonEnd() - TL_MIN)) * 100;
  const posTrees = (y) => ((y - TL_TREES_MIN) / (TL_TREES_MAX - TL_TREES_MIN)) * 100;

  function renderTimeline() {
    // The time line shows where time is the content: built-up history and forecast, tree loss, and the radar view
    // (radar years 2015-2021 from ALOS-2 and 2026 from NISAR, plus the single NISAR passes of summer 2026).
    const hasTimeline = state.lens === "history" || state.lens === "trees" || radarTL();
    document.body.classList.toggle("no-tl", !hasTimeline);
    if (!hasTimeline) {
      if (playing) stopPlay();
      return;
    }
    const u = U(), inp = $("#year");
    $("#timeline").classList.toggle("radar", radarTL());
    let pb = $("#tl-pass"); // opens the single NISAR passes of the 2026 step (radar view only, when anim/meta.json loaded)
    if (!pb && anim) { pb = document.createElement("button"); pb.type = "button"; pb.id = "tl-pass"; pb.className = "linkish"; $(".tl-year").appendChild(pb); pb.addEventListener("click", togglePasses); }
    if (pb) { pb.hidden = !(anim && radarTL() && state.lens === "radar" && state.ryear === 2026); const ph = passOn() ? [u.passClose, u.passCloseShort] : [u.passOpen, u.passOpenShort]; pb.textContent = innerWidth < 760 ? ph[1] : ph[0]; pb.setAttribute("aria-label", ph[0]); pb.setAttribute("aria-pressed", String(passOn())); }
    if (passOn()) { // the radar view, passes open: one step per NISAR pass of summer 2026
      const fs = anim.frames, n = fs.length, f = fs[pass], rp = (k) => (k / (n - 1)) * 100;
      inp.min = 0; inp.max = n - 1; inp.step = 1;
      if (document.activeElement !== inp || playing) inp.value = pass;
      $("#tl-fill").style.width = `${rp(pass)}%`;
      $("#tl-future").style.left = "100%"; $("#tl-future").innerHTML = "";
      $("#tl-now").style.left = "100%";
      $("#tl-real").textContent = u.passesLabel; $("#tl-real").style.left = "50%";
      $("#tl-pred").textContent = "";
      $("#tl-year").textContent = passDate(f.date);
      const kind = u.passKind(passDate(f.date, true), !f.hv);
      $("#tl-kind").textContent = innerWidth < 760 ? u.passKindShort(!f.hv) : kind; // phones: the date is already the big label
      inp.setAttribute("aria-valuetext", kind);
      $("#timeline").classList.remove("future");
      const ticks = fs.map((_, k) => k).filter((k) => (innerWidth < 760 ? k === 0 : k % 3 === 0) || k === n - 1);
      $("#tl-ticks").innerHTML = ticks.map((k) => `<span class="${k === 0 ? "first" : k === n - 1 ? "last" : ""}${k === pass ? " now" : ""}" style="left:${rp(k)}%">${passDate(fs[k].date)}</span>`).join("");
      return;
    }
    if (radarTL()) { // the radar view: the years radar has a picture for (ALOS-2 2015-2021, a gap, NISAR 2026)
      const ys = RY(), a = ys[0], b = ys[ys.length - 1], arch = ys[ys.length - 2], rp = (y) => ((y - a) / (b - a)) * 100;
      inp.min = a; inp.max = b; inp.step = 1;
      if (document.activeElement !== inp || playing) inp.value = state.ryear;
      $("#tl-fill").style.width = `${rp(Math.min(state.ryear, arch))}%`;
      $("#tl-future").style.left = `${rp(arch)}%`; $("#tl-future").innerHTML = "";
      $("#tl-now").style.left = "100%";
      $("#tl-real").textContent = u.radarYears;
      $("#tl-real").style.left = `${rp(arch) / 2}%`;
      $("#tl-pred").textContent = u.noRadarData;
      $("#tl-pred").style.left = `${(rp(arch) + 100) / 2}%`;
      $("#tl-year").textContent = state.ryear;
      $("#tl-kind").textContent = state.ryear < 2026 ? u.tlKind.archive : u.tlKind[state.lens];
      inp.setAttribute("aria-valuetext", `${state.ryear}, ${$("#tl-kind").textContent}`);
      $("#timeline").classList.remove("future");
      const ticks = innerWidth < 760 ? [a, arch] : ys.slice(0, -1).filter((y, i, arr) => i % 2 === 0 || i === arr.length - 1);
      $("#tl-ticks").innerHTML = ticks.map((y, i) => `<span class="${i === 0 ? "first" : ""}${y === state.ryear ? " now" : ""}" style="left:${rp(y)}%">${y}</span>`).join("") +
        `<span class="last${state.ryear === b ? " now" : ""}" style="left:100%">${b}</span>`;
      return;
    }

    if (state.lens === "trees") {
      $("#timeline").classList.remove("radar", "future");
      inp.step = 0.1;
      inp.min = TL_TREES_MIN;
      inp.max = TL_TREES_MAX;
      if (state.year > TL_TREES_MAX) state.year = TL_TREES_MAX;
      if (state.year < TL_TREES_MIN) state.year = TL_TREES_MIN;
      if (document.activeElement !== inp || playing) inp.value = state.yearF;
      const curP = posTrees(state.yearF);
      $("#tl-fill").style.width = `${curP}%`;
      $("#tl-future").style.left = "100%";
      $("#tl-future").innerHTML = "";
      $("#tl-now").style.left = "100%";
      $("#tl-real").textContent = lang === "pl" ? "Obserwacje satelitarne (Hansen GFC)" : "Satellite observations (Hansen GFC)";
      $("#tl-real").style.left = "50%";
      $("#tl-pred").textContent = "";
      $("#tl-year").textContent = state.year;
      $("#tl-kind").textContent = lang === "pl"
        ? "Ubytek drzew i lasów (Hansen GFC) · historia od 2001 do 2024 r."
        : "Tree canopy loss (Hansen GFC) · observed from 2001 to 2024";
      inp.setAttribute("aria-valuetext", `${state.year}, ${$("#tl-kind").textContent}`);
      const ticks = innerWidth < 760 ? [2001, 2010, 2020, 2024] : [2001, 2005, 2010, 2015, 2020, 2024];
      $("#tl-ticks").innerHTML = ticks.map((y, i) =>
        `<span class="${i === 0 ? "first" : i === ticks.length - 1 ? "last" : ""}" style="left:${posTrees(y)}%">${y}</span>`
      ).join("");
      return;
    }

    // state.lens === "history": 1975 to horizonEnd() (2035)
    const end = horizonEnd();
    $("#timeline").classList.remove("radar");
    inp.step = 0.1;
    inp.min = TL_MIN;
    inp.max = end;
    if (state.year > end) state.year = end;
    if (state.year < TL_MIN) state.year = TL_MIN;
    if (document.activeElement !== inp || playing) inp.value = state.yearF;
    const nowP = pos(Math.min(NOW_YEAR, end)), curP = pos(state.yearF);
    $("#tl-fill").style.width = `${Math.min(curP, nowP)}%`;
    $("#tl-future").style.left = `${nowP}%`;
    $("#tl-future").innerHTML = state.yearF > NOW_YEAR ? `<span class="on" style="width:${((curP - nowP) / (100 - nowP)) * 100}%"></span>` : "";
    $("#tl-now").style.left = `${nowP}%`;
    $("#tl-real").textContent = u.measured;
    $("#tl-real").style.left = `${nowP / 2}%`;
    $("#tl-pred").textContent = u.predicted;
    $("#tl-pred").style.left = `${(nowP + 100) / 2}%`;
    $("#tl-year").textContent = state.year;
    $("#tl-kind").textContent = isFuture() ? u.modelForecast : state.lyr.built.on && radarFirst() && state.year > LAST_OBS() ? u.fromRadar : u.fromMeasurements;
    inp.setAttribute("aria-valuetext", `${state.year}, ${$("#tl-kind").textContent}`);
    $("#timeline").classList.toggle("future", isFuture());
    const ticks = innerWidth < 760 ? [1975, 2000] : [1975, 1985, 1995, 2005, 2015];
    const gap = ((100 - nowP) / 100) * ($("#tl-ticks").offsetWidth || innerWidth);
    const nowTxt = gap < 120 ? u.today : `${u.today} · ${NOW_YEAR}`;
    $("#tl-ticks").innerHTML = ticks.map((y, i) => `<span class="${i === 0 ? "first" : ""}" style="left:${pos(y)}%">${y}</span>`).join("") +
      `<span class="now" role="button" tabindex="0" title="${u.today}" style="left:${nowP}%">${nowTxt}</span>${gap < 64 ? "" : `<span class="last" style="left:100%">${end}</span>`}`;
  }
  let cardT = null, playing = false, playRaf = 0, playLast = 0, playTimer = 0, playTok = 0;
  function setYear(y, opts = {}) {
    if (state.lens === "trees") {
      state.yearF = clamp(y, TL_TREES_MIN, TL_TREES_MAX);
    } else {
      state.yearF = clamp(y, TL_MIN, horizonEnd());
    }
    const prev = state.year;
    state.year = Math.round(state.yearF);
    renderTimeline();
    redraw();
    if (state.year !== prev) renderLegend(); // the built-up key changes after 2020 and after today
    // the side card is heavier: refresh it once the year settles (or every whole year while playing)
    if (state.sel && state.sel.ready && (state.year !== prev || opts.now)) {
      const run = () => { cardT = null; if (state.sel && state.sel.ready) renderCard(); };
      if (playing) { if (!cardT) cardT = setTimeout(run, 500); }
      else { clearTimeout(cardT); cardT = setTimeout(run, 180); }
    }
  }
  const PLAY_SPEED = 7; // years per second: 1975 -> 2035 in about 9 s
  function stopPlay() {
    playing = false; cancelAnimationFrame(playRaf); clearTimeout(playTimer);
    $("#play").classList.remove("on"); $("#play").setAttribute("aria-label", U().play);
  }
  function togglePlay() {
    if (playing) { stopPlay(); return; }
    if (radarTL()) { // radar view: one radar year after another (or one NISAR pass after another, when the passes are open)
      const P = passOn(), ys = P ? anim.frames.map((_, k) => k) : RY();
      let i = ys.indexOf(P ? pass : state.ryear);
      if (i >= ys.length - 1) i = -1;
      playing = true;
      const my = ++playTok; // a chain left over from an earlier Play stops as soon as a newer one exists
      $("#play").classList.add("on"); $("#play").setAttribute("aria-label", U().pause);
      const tick = async () => {
        if (!playing || my !== playTok) return;
        i += 1;
        await (P ? setPass(ys[i]) : setRYear(ys[i]));
        if (!playing || my !== playTok) return;
        if (i >= ys.length - 1) { stopPlay(); return; }
        playTimer = setTimeout(tick, 900);
      };
      tick();
      return;
    }
    if (state.lens === "trees") {
      if (state.yearF >= TL_TREES_MAX - 0.01) setYear(TL_TREES_MIN);
      playing = true; playLast = performance.now();
      $("#play").classList.add("on"); $("#play").setAttribute("aria-label", U().pause);
      const step = (now) => {
        if (!playing) return;
        const dt = Math.min(0.1, (now - playLast) / 1000); playLast = now;
        const next = state.yearF + dt * 3.5;
        if (next >= TL_TREES_MAX) { setYear(TL_TREES_MAX); stopPlay(); return; }
        setYear(next);
        playRaf = requestAnimationFrame(step);
      };
      playRaf = requestAnimationFrame(step);
      return;
    }
    if (state.yearF >= horizonEnd() - 0.01) setYear(TL_MIN);
    playing = true; playLast = performance.now();
    $("#play").classList.add("on"); $("#play").setAttribute("aria-label", U().pause);
    const step = (now) => {
      if (!playing) return;
      const dt = Math.min(0.1, (now - playLast) / 1000); playLast = now;
      const next = state.yearF + dt * PLAY_SPEED;
      if (next >= horizonEnd()) { setYear(horizonEnd()); stopPlay(); return; }
      setYear(next);
      playRaf = requestAnimationFrame(step);
    };
    playRaf = requestAnimationFrame(step);
  }
