// SARnik core, part 15 of 32: time line: years, radar axis, play.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= timeline ================= */
  const TL_MIN = 1975;
  const pos = (y) => ((y - TL_MIN) / (horizonEnd() - TL_MIN)) * 100;
  function renderTimeline() {
    document.body.classList.remove("no-tl"); // the timeline stays in every view (team decision, 14.11)
    const u = U(), inp = $("#year"), end = horizonEnd();
    $("#timeline").classList.toggle("radar", radarTL());
    let pb = $("#tl-pass"); // opens the single NISAR passes of the 2026 step (radar view only, when anim/meta.json loaded)
    if (!pb && anim) { pb = document.createElement("button"); pb.type = "button"; pb.id = "tl-pass"; pb.className = "linkish"; $(".tl-year").appendChild(pb); pb.addEventListener("click", togglePasses); }
    if (pb) { pb.hidden = !(anim && radarTL() && state.lens === "radar" && state.ryear === 2026); const ph = passOn() ? [u.passClose, u.passCloseShort] : [u.passOpen, u.passOpenShort]; pb.textContent = innerWidth < 760 ? ph[1] : ph[0]; pb.setAttribute("aria-label", ph[0]); pb.setAttribute("aria-pressed", String(passOn())); }
    if (passOn()) {
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
    if (radarTL()) {
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
    inp.step = 0.1;
    inp.max = end; inp.min = TL_MIN;
    if (state.year > end) state.year = end;
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
    $("#tl-kind").textContent = state.lens === "water"
      ? (lang === "pl" ? "Woda i podtopienia (PIG-PIB) · zmiana echa NISAR od czerwca do sierpnia 2026 (deszcz, żniwa, uprawa)" : "Flood areas & water (PIG-PIB) · NISAR echo change June → August 2026 (rain, harvest, tillage)")
      : state.lens === "build"
      ? (lang === "pl" ? "Ślady budów w radarze (Sentinel-1) · jesień 2025 → jesień 2026, sygnał do sprawdzenia" : "Signs of construction in radar (Sentinel-1) · autumn 2025 → autumn 2026, leads to check")
      : state.lens === "ground"
      ? (lang === "pl" ? "Osiadanie podłoża (EGMS radar) · przemieszczenia pionowe w mm/rok" : "Ground subsidence (EGMS radar) · vertical displacement in mm/yr")
      : state.lens === "score"
      ? (lang === "pl" ? "Ocena działki (SARnik Score) · syntetyczny wskaźnik przydatności i ryzyka" : "Plot score (SARnik Score) · synthetic suitability & risk index")
      : state.lens === "trees"
      ? (lang === "pl" ? "Ubytek drzew i lasów (Hansen GFC) · historia od 2001 do 2024 r." : "Tree canopy loss (Hansen GFC) · observed from 2001 to 2024")
      : isFuture() ? u.modelForecast : state.lyr.built.on && radarFirst() && state.year > LAST_OBS() ? u.fromRadar : u.fromMeasurements;
    inp.setAttribute("aria-valuetext", `${state.year}, ${$("#tl-kind").textContent}`);
    $("#timeline").classList.toggle("future", state.lens === "history" && isFuture());
    const ticks = innerWidth < 760 ? [1975, 2000] : [1975, 1985, 1995, 2005, 2015];
    // keep "Today" and the end year apart on narrow tracks: shorten the label, then drop the end year
    const gap = ((100 - nowP) / 100) * ($("#tl-ticks").offsetWidth || innerWidth);
    const nowTxt = gap < 120 ? u.today : `${u.today} · ${NOW_YEAR}`;
    $("#tl-ticks").innerHTML = ticks.map((y, i) => `<span class="${i === 0 ? "first" : ""}" style="left:${pos(y)}%">${y}</span>`).join("") +
      `<span class="now" role="button" tabindex="0" title="${u.today}" style="left:${nowP}%">${nowTxt}</span>${gap < 64 ? "" : `<span class="last" style="left:100%">${end}</span>`}`;
  }
  let cardT = null, playing = false, playRaf = 0, playLast = 0, playTimer = 0, playTok = 0;
  function setYear(y, opts = {}) {
    state.yearF = clamp(y, TL_MIN, horizonEnd());
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
    if (radarTL()) { // radar views: one radar year after another (or one NISAR pass after another, when the passes are open)
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

