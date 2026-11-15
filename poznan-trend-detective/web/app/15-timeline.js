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
    const hasTimeline = state.lens === "history" || state.lens === "trees";
    document.body.classList.toggle("no-tl", !hasTimeline);
    if (!hasTimeline) {
      if (playing) stopPlay();
      return;
    }
    const u = U(), inp = $("#year");
    let pb = $("#tl-pass");
    if (pb) pb.hidden = true;

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
