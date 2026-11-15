// SARnik core, part 26 of 32: place card: pros and cons, place score 0-100.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  function computeProsAndCons(sel, items) {
    const u = U(), pros = [], cons = [];
    const wf = waterFacts(sel);
    const s = sar && L8.sar_change ? sarStats(sel.cells) : null;
    const rk = riskOf(sel.cells);
    const ff = mean(sel.cells.map((i) => (L8.forest2000_frac ? L8.forest2000_frac[i] : 0))) / 2.55; // 0..100%
    const lost = forestLost(sel.cells, 2024);

    // 1. CONS / ALARMS (Najbardziej niepokojące fakty na pierwszy rzut oka)
    if (wf.floodShare > 0) {
      cons.push({
        lvl: "risk",
        t: lang === "pl" ? "Wysokie ryzyko podtopień (woda gruntowa)" : "High groundwater flood risk",
        d: lang === "pl" ? "Działka leży w strefie zagrożonej podtopieniami wg PIG-PIB. Ryzyko zalewania piwnic i fundamentów na wiosnę." : "Plot is in a groundwater flood zone (PIG-PIB). Risk of basement and foundation flooding in spring."
      });
    } else if (wf.hollow) {
      cons.push({
        lvl: "warn",
        t: lang === "pl" ? `Zagłębienie terenu (−${num(wf.depth, 1)} m)` : `Terrain depression (−${num(wf.depth, 1)} m)`,
        d: lang === "pl" ? "Teren leży niżej niż okolica – woda opadowa po ulewach spływa i może tworzyć zastoiska." : "Ground sits lower than surroundings – stormwater drains here after downpours."
      });
    }

    if (s && (s.egMed <= -3 || s.egMin <= -5)) {
      cons.push({
        lvl: "risk",
        t: lang === "pl" ? `Osiadanie gruntu (${sgn(s.egMin || s.egMed, 0)} mm/rok)` : `Ground sinking (${sgn(s.egMin || s.egMed, 0)} mm/yr)`,
        d: lang === "pl" ? "Satelitarny radar interferometryczny (InSAR) wykrywa opadanie podłoża. Ryzyko pękania murów." : "Interferometric radar (InSAR) detects ground subsidence. Risk of wall cracks."
      });
    }

    if (s && s.walls > 0.02) {
      cons.push({
        lvl: "warn",
        t: lang === "pl" ? "Ślad nowych murów w radarze (SAR 2026)" : "New walls detected by radar (SAR 2026)",
        d: lang === "pl" ? `Radar Sentinel-1 widzi nowe konstrukcje obok (${num(s.walls * 100, 0)}% terenu). Aktywny plac budowy tuż obok.` : `Sentinel-1 radar detects new structures next door (${num(s.walls * 100, 0)}% of land). Active building site.`
      });
    }

    if (rk && rk.level >= 4) {
      cons.push({
        lvl: "warn",
        t: lang === "pl" ? `Wysokie ryzyko gęstej zabudowy sąsiedztwa (${num(rk.chance * 100, 0)}%)` : `High risk of nearby development (${num(rk.chance * 100, 0)}%)`,
        d: lang === "pl" ? "Model AI przewiduje, że wolny teren obok ma ponadprzeciętną szansę zabudowy w 5 lat. Możliwa utrata widoku." : "AI model forecasts very high chance of nearby open land being built up within 5 years."
      });
    }

    if (lost >= 1.5) {
      cons.push({
        lvl: "warn",
        t: lang === "pl" ? `Ubytek drzew w okolicy (−${num(lost, 1)} ha)` : `Tree loss in area (−${num(lost, 1)} ha)`,
        d: lang === "pl" ? "Zdjęcia Landsat pokazują postępującą wycinkę lasu/zadrzewień od 2001 r." : "Landsat imagery shows progressive forest clearing since 2001."
      });
    }

    if (sel.sq.length) {
      const r = testSeries(heatSeries("day", sel.sq), HEAT_YEARS), pc = percentile(rankPool.day, r.perDec);
      if (r.p < 0.05 && pc >= 70) {
        cons.push({
          lvl: "warn",
          t: lang === "pl" ? `Miejska wyspa ciepła (+${num(r.perDec, 1)} °C/dekadę)` : `Urban heat island (+${num(r.perDec, 1)} °C/dec)`,
          d: lang === "pl" ? "Powierzchnia dachów i gruntu nagrzewa się latem znacznie szybciej niż reszta aglomeracji." : "Surfaces warm up significantly faster during summer than surrounding area."
        });
      }
    }

    items.filter((it) => it.module && (it.lvl === "warn" || it.lvl === "risk")).forEach((it) => {
      cons.push({ lvl: it.lvl, t: esc(it.t), d: it.v }); // v is HTML already (module rows escape their own text), as in the row list
    });

    // 2. PROS (Zalety na zielono)
    if (ff >= 15) {
      pros.push({
        t: lang === "pl" ? `Bliskość zieleni i lasu (ok. ${num(ff, 0)}% otoczenia)` : `Close to forest & greenery (~${num(ff, 0)}%)`,
        d: lang === "pl" ? "Duży udział koron drzew i roślinności. Czyste powietrze i naturalny mikroklimat." : "High tree canopy and vegetation share. Fresh air and natural microclimate."
      });
    }
    if (wf.floodShare === 0 && !wf.hollow) {
      pros.push({
        t: lang === "pl" ? "Bezpiecznie od podtopień" : "Safe from flooding",
        d: lang === "pl" ? "Brak stref podtopień PIG-PIB i brak niecek terenowych. Woda opadowa swobodnie odpływa." : "No PIG-PIB flood zones or hollows. Stormwater drains naturally."
      });
    }
    if (!s || (s.egMed >= -1.5 && s.egMin >= -3)) {
      pros.push({
        t: lang === "pl" ? "Stabilne podłoże (brak osiadania)" : "Stable ground (no sinking)",
        d: lang === "pl" ? "Radar satelitarny nie rejestruje niebezpiecznych ruchów pionowych gruntu." : "Satellite radar records no hazardous ground motion."
      });
    }
    const fy = radarFirst(), newHa = fy ? sel.cells.filter((i) => fy[i] > LAST_OBS() - 2000).length * cellHa() : 0, haS = num(newHa, newHa < 10 ? 1 : 0);
    if (rlQ75 != null && newHa > rlQ75) cons.push({ lvl: "info", t: u.radarNewT(haS), d: u.radarNewD }); // a neutral point to check, not a flaw
    else if (!s || (s.walls <= 0.01 && s.up <= 0.04)) {
      pros.push({
        t: lang === "pl" ? "Spokój w radarze (brak uciążliwych budów)" : "Quiet radar signature (no intrusive building)",
        d: lang === "pl" ? "Brak gwałtownych pojaśnień i nowych hal przemysłowych w ostatnim roku." : "No abrupt brightening or industrial sheds constructed in the past year."
      });
    }
    if (rk && rk.level <= 2 && rk.level > 0) {
      pros.push({
        t: lang === "pl" ? "Umiarkowana presja deweloperska" : "Low development pressure",
        d: lang === "pl" ? "Niska szansa na chaotyczną lub nagłą gęstą zabudowę sąsiedztwa w 5 lat." : "Low probability of abrupt dense development nearby within 5 years."
      });
    }

    // Overall Score (0-100)
    let score = 70;
    if (ff >= 20) score += 15;
    else if (ff >= 10) score += 8;
    if (wf.floodShare === 0 && !wf.hollow) score += 10;
    if (!s || (s.egMed >= -1 && s.egMin >= -2)) score += 5;
    if (wf.floodShare > 0) score -= 35;
    if (wf.hollow) score -= 15;
    if (s && s.egMed <= -3) score -= 25;
    if (s && s.walls > 0.02) score -= 12;
    if (rk && rk.level >= 4) score -= 14;
    if (lost >= 2) score -= 10;
    score = clamp(Math.round(score), 10, 98);

    let tierClass = "tier-great", tierLabel = u.tierGreat || "Bardzo korzystna";
    if (score < 45) { tierClass = "tier-risk"; tierLabel = u.tierRisk || "Podwyższone ryzyko"; }
    else if (score < 65) { tierClass = "tier-warn"; tierLabel = u.tierWarn || "Umiarkowana"; }
    else if (score < 80) { tierClass = "tier-good"; tierLabel = u.tierGood || "Dobra (w normie)"; }

    // What radar sees here (2026), from measured radar only: the radar first-year layer (Sentinel-1 yearly, NISAR confirms
    // 2025-2026), Sentinel-1 walls (autumn 2025 -> 2026), NISAR's June -> August change on open land. isNisar: the sentence is NISAR's.
    let nisarStatus = u.radarNone, isNisar = false;
    if (newHa > 0) nisarStatus = u.radarNewHa(haS);
    else if (s && s.walls > 0.02) nisarStatus = u.radarWalls(num(s.walls * 100, 0));
    else if (fy && sel.cells.some((i) => fy[i] >= 15)) nisarStatus = u.radarBuiltOld;
    else if (s && s.nisarOpen) { nisarStatus = u.radarOpenNisar(num(s.nisarWetUp * 100, 0)); isNisar = true; }
    else if (fy && sel.cells.some((i) => fy[i] === 1)) nisarStatus = u.radarOpen;

    return { score, tierClass, tierLabel, pros, cons, nisarStatus, isNisar };
  }

