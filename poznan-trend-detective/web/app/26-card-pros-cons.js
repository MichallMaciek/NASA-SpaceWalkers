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
    // the hectare limits below were set for the 1 km circle: a circle of r km scales them by r², a plot by the area of the
    // cells it covers (a drawn area keeps them)
    const kHa = sel.kind === "point" ? (sel.r || 1) ** 2 : sel.kind === "parcel" ? Math.min(1, (sel.cells.length * cellHa()) / (Math.PI * 100)) : 1;
    const bu = typeof builtShare === "function" ? (builtShare(sel.cells, 2025) || 0) : 0;
    const own = sel.kind === "point" ? landCell(sel.lat, sel.lng) : null;
    const isWater = !!(own && L8.sar_water && waterOf(L8.sar_water[own.i]) >= 0.20);
    const isForestReserve = ff >= 70 && bu < 20;
    // the place's own hazards, from the same layers and thresholds as the score on the map (part 13a); null = not loaded
    const hz = placeHazards(sel);
    const here = sel.kind === "point" ? (lang === "pl" ? "To miejsce" : "This spot") : (lang === "pl" ? "Co najmniej piąta część tego terenu" : "At least a fifth of this land");

    // 1. CONS / ALARMS (Najbardziej niepokojące fakty na pierwszy rzut oka)
    if (isWater) {
      cons.push({
        lvl: "info",
        t: lang === "pl" ? "Teren wód powierzchniowych" : "Surface water body",
        d: lang === "pl" ? "Punkt znajduje się w korycie rzeki lub czaszy zbiornika wodnego (radar SAR). Brak możliwości lokalizacji działki lądowej." : "Point is inside a river channel or open water body (SAR radar). Not a buildable land parcel."
      });
    } else if (hz) {
      if (hz.flood) {
        cons.push({
          lvl: "risk",
          t: lang === "pl" ? "Strefa podtopień (PIG-PIB)" : "Groundwater-flood area (PIG-PIB)",
          d: lang === "pl" ? `${here} leży w strefie zagrożonej podtopieniami według mapy PIG-PIB. Woda gruntowa może podchodzić pod fundamenty i piwnice: zapytaj o poziom wód i izolację.` : `${here} lies in a groundwater-flood area on the PIG-PIB map. Groundwater can rise to foundations and basements: ask about the water table and insulation.`
        });
      } else if (hz.floodNear > 0) {
        cons.push({
          lvl: "info",
          t: lang === "pl" ? `Strefa podtopień w okolicy (${num(Math.max(1, hz.floodNear * 100), 0)}% terenu wokół)` : `Flood area nearby (${num(Math.max(1, hz.floodNear * 100), 0)}% of the land around)`,
          d: lang === "pl" ? "Samo miejsce leży poza strefą podtopień PIG-PIB, ale strefa zaczyna się niedaleko. Sprawdź jej granicę w widoku wody." : "The spot itself is outside the PIG-PIB flood area, but the area begins close by. Check its edge in the water view."
        });
      }
      if (!hz.flood && hz.relief <= -1.5) {
        const deep = hz.relief <= -4, mid = hz.relief <= -2.5, times = deep ? 5 : mid ? 4 : 3, dm = num(-hz.relief, 1);
        cons.push({
          lvl: deep ? "risk" : "warn",
          t: lang === "pl" ? `${deep ? "Głębokie zagłębienie" : "Zagłębienie"} terenu (−${dm} m)` : `${deep ? "Deep hollow" : "Hollow"} in the terrain (−${dm} m)`,
          d: lang === "pl" ? `Grunt leży tu ok. ${dm} m niżej niż grunt w promieniu pół kilometra. W tak głębokich zagłębieniach strefy podtopień są ok. ${times} razy częstsze niż gdzie indziej; po ulewach może się tu zbierać woda.` : `The ground here lies about ${dm} m lower than the ground within half a kilometre. In hollows this deep flood areas are about ${times} times as common as elsewhere; water can gather here after downpours.`
        });
      }
    } else if (wf.floodShare > 0) {
      if (bu >= 20 || wf.reliefMean >= 0.5) {
        cons.push({
          lvl: "info",
          t: lang === "pl" ? "Sąsiedztwo doliny Warty" : "Warta valley corridor",
          d: lang === "pl" ? "Działka leży w korytarzu doliny Warty wg PIG-PIB. Teren jest ukształtowany i wyniesiony ponad koryto rzeki (sprawdź poziom wód gruntowych przy fundamentach)." : "Plot lies in the Warta river corridor (PIG-PIB). Ground is elevated above river channel."
        });
      } else {
        cons.push({
          lvl: "risk",
          t: lang === "pl" ? "Wysokie ryzyko podtopień (woda gruntowa)" : "High groundwater flood risk",
          d: lang === "pl" ? "Działka leży w strefie zagrożonej podtopieniami wg PIG-PIB na otwartym/niskim terenie. Ryzyko zalewania piwnic i fundamentów na wiosnę." : "Plot is in a groundwater flood zone (PIG-PIB) on open/low ground. Risk of basement and foundation flooding in spring."
        });
      }
    } else if (wf.hollow) {
      cons.push({
        lvl: "warn",
        t: lang === "pl" ? `Zagłębienie terenu (−${num(wf.depth, 1)} m)` : `Terrain depression (−${num(wf.depth, 1)} m)`,
        d: lang === "pl" ? "Teren leży niżej niż okolica – woda opadowa po ulewach spływa i może tworzyć lokalne zastoiska." : "Ground sits lower than surroundings – stormwater drains here after downpours."
      });
    }

    if (hz && hz.sink <= -1.2) {
      const fast = hz.sink <= -5, mid = hz.sink <= -2.5, mm = sgn(hz.sink, 0);
      cons.push({
        lvl: fast ? "risk" : "warn",
        t: lang === "pl" ? `${mid ? "Grunt osiada" : "Lekkie osiadanie gruntu"} (${mm} mm/rok)` : `${mid ? "The ground is sinking" : "Slight ground sinking"} (${mm} mm/yr)`,
        d: lang === "pl" ? (fast ? "Radar (InSAR, pomiary EGMS 2016–2020) mierzy tu szybkie osiadanie gruntu. Ryzyko pękania murów: zleć badanie gruntu przed zakupem." : "Radar (InSAR, pomiary EGMS 2016–2020) mierzy tu osiadanie gruntu. Sprawdź fundamenty i ściany istniejących budynków.")
          : (fast ? "Radar (InSAR, EGMS measurements 2016–2020) measures fast ground sinking here. Risk of cracked walls: order a ground survey before buying." : "Radar (InSAR, EGMS measurements 2016–2020) measures ground sinking here. Check the foundations and walls of the buildings that stand.")
      });
    } else if (!hz && s && s.egMed <= -3) {
      cons.push({
        lvl: "risk",
        t: lang === "pl" ? `Osiadanie gruntu (${sgn(s.egMin || s.egMed, 0)} mm/rok)` : `Ground sinking (${sgn(s.egMin || s.egMed, 0)} mm/yr)`,
        d: lang === "pl" ? "Satelitarny radar interferometryczny (InSAR) wykrywa opadanie podłoża. Ryzyko pękania murów." : "Interferometric radar (InSAR) detects ground subsidence. Risk of wall cracks."
      });
    } else if (s && s.egMin <= -5) {
      // the typical cell here is stable and one or more cells in the circle sink: in 95% of such places the sinking cell is
      // not the plot or its neighbour, so this is a spot to check on the map, not a verdict on the plot (same split as the
      // technical row: risk for the median, warn for the minimum)
      cons.push({
        lvl: "warn",
        t: lang === "pl" ? `Osiadające miejsca w okolicy (do ${sgn(s.egMin, 0)} mm/rok)` : `Sinking spots nearby (down to ${sgn(s.egMin, 0)} mm/yr)`,
        d: lang === "pl" ? `Grunt jest tu w większości stabilny, ale radar (InSAR) mierzy w tej okolicy miejsca, które osiadają. Sprawdź w widoku „${u.lens.ground}”, czy to Twoja działka.` : `The ground here is mostly stable, but radar (InSAR) measures spots in this area that are sinking. Check in the “${u.lens.ground}” view whether it is your plot.`
      });
    }

    if (s && s.walls > 0.02) {
      cons.push({
        lvl: "warn",
        // a lead, not a verdict: on plots with a granted new-building decision the signal is about 3 times as common as
        // elsewhere in Poznań (2.8, interval 1.4-5.0), and more than half of the flagged cells lie on land no map sees built
        t: lang === "pl" ? "Ślad nowych murów w radarze (SAR 2026)" : "Signature of new walls in radar (SAR 2026)",
        d: lang === "pl" ? `Radar Sentinel-1 widzi obok sygnał jak od nowych ścian (${num(s.walls * 100, 0)}% terenu, jesień 2025 → jesień 2026). To sygnał do sprawdzenia, nie potwierdzona budowa: zapytaj w urzędzie, co tu powstaje.` : `Sentinel-1 radar sees a signal like new walls next door (${num(s.walls * 100, 0)}% of the land, autumn 2025 → autumn 2026). A lead to check, not a confirmed building: ask the planning office what is going up.`
      });
    }

    if (rk && (rk.chance >= 0.16 || rk.level >= 5) && wf.floodShare === 0) {
      cons.push({
        lvl: "warn",
        t: lang === "pl" ? `Wysoka presja deweloperska (${num(rk.chance * 100, 0)}%)` : `High development pressure (${num(rk.chance * 100, 0)}%)`,
        d: lang === "pl" ? "Model AI przewiduje bardzo wysokie prawdopodobieństwo ekspansji zabudowy w 5 lat. Ryzyko utraty otwartego krajobrazu." : "AI model forecasts very high chance of nearby open land being built up within 5 years."
      });
    }

    if (lost >= 1.5 * kHa) {
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

    // 2. PROS (Zalety na zielono - co jest bezpieczne i stabilne)
    if (!isWater && (hz ? !hz.flood && hz.floodNear > 0 : wf.floodShare > 0 && (bu >= 20 || wf.reliefMean >= 0.5))) {
      pros.push({
        t: lang === "pl" ? "Atrakcyjne sąsiedztwo nadrzeczne" : "Attractive riverside proximity",
        d: lang === "pl" ? "Bliskość nadrzecznego korytarza rekreacyjnego (Wartostrada, tereny spacerowe) i naturalna cyrkulacja powietrza." : "Proximity to the riverside recreation corridor (Wartostrada, walking trails) and fresh air flow."
      });
    }

    if (ff >= 10 && ff <= 65) {
      pros.push({
        t: lang === "pl" ? `Bliskość zieleni i ogrodów (ok. ${num(ff, 0)}% otoczenia)` : `Close to greenery & gardens (~${num(ff, 0)}%)`,
        d: lang === "pl" ? "Wysoki udział koron drzew i roślinności. Czyste powietrze, cień latem i naturalny mikroklimat." : "High tree canopy and vegetation share. Clean air, summer shade, and pleasant microclimate."
      });
    } else if (ff > 65) {
      pros.push({
        t: lang === "pl" ? `Zwarta strefa leśna (ok. ${num(ff, 0)}% koron drzew)` : `Dense forest zone (~${num(ff, 0)}% canopy)`,
        d: lang === "pl" ? "Kompleks leśny / rezerwat przyrody. Wybitny mikroklimat leśny, lecz rygorystyczne ograniczenia prawne dla zabudowy mieszkaniowej." : "Dense forest complex / nature reserve. Outstanding microclimate, but strict statutory restrictions on residential building."
      });
    }

    if (!isWater && hz) {
      if (!hz.flood && !(hz.relief <= -1.5)) {
        pros.push(hz.reliefKnown ? {
          t: lang === "pl" ? "Poza strefą podtopień i poza zagłębieniem" : "Outside the flood area and not in a hollow",
          d: lang === "pl" ? "Miejsce leży poza strefami podtopień PIG-PIB, a grunt nie jest tu niżej niż w okolicy." : "The place is outside the PIG-PIB flood areas and the ground here is not lower than around it."
        } : {
          t: lang === "pl" ? "Poza strefą podtopień (PIG-PIB)" : "Outside the flood area (PIG-PIB)",
          d: lang === "pl" ? "Miejsce leży poza strefami podtopień PIG-PIB. Rzeźby terenu tu nie oceniamy: rosną drzewa albo gęsto stoją budynki, a model wysokości mierzy ich wierzchołki." : "The place is outside the PIG-PIB flood areas. The lie of the land is not judged here: trees or dense buildings stand on it and the height model measures their tops."
        });
      }
    } else if (!isWater && wf.floodShare === 0 && !wf.hollow) {
      if (wf.reliefMean >= 1.0) {
        pros.push({
          t: lang === "pl" ? `Wyniesiony teren (+${num(wf.reliefMean, 1)} m) i naturalny drenaż` : `Elevated terrain (+${num(wf.reliefMean, 1)} m) & natural drainage`,
          d: lang === "pl" ? "Działka leży wyżej niż otoczenie. Woda opadowa grawitacyjnie odpływa, zerowe ryzyko gromadzenia wody." : "Plot sits higher than surroundings. Rainwater drains naturally, zero ponding risk."
        });
      } else {
        pros.push({
          t: lang === "pl" ? "Bezpiecznie od podtopień" : "Safe from flooding",
          d: lang === "pl" ? "Brak stref podtopień PIG-PIB i brak niecek terenowych. Woda opadowa swobodnie odpływa." : "No PIG-PIB flood zones or hollows. Stormwater drains naturally."
        });
      }
    }
    // Summer soil drying from NISAR soil moisture (SME2, 200 m, provisional) on this place's own cells, 25 June and
    // 24 August 2026. An observation of one summer, with no verdict about water: land inside the flood areas dried just as
    // much (-25% against -24%), and paved land has no value at all, so the row appears only where the place was measured.
    const sm0 = L8.nisar_sm_0625, sm1 = L8.nisar_sm_0824;
    if (sm0 && sm1 && wf.floodShare === 0) {
      const a = [], b = [];
      sel.cells.forEach((i) => { if (sm0[i] && sm1[i]) { a.push(sm0[i] / 500); b.push(sm1[i] / 500); } });
      a.sort((x, y) => x - y); b.sort((x, y) => x - y);
      const m0 = a[a.length >> 1], m1 = b[b.length >> 1];
      if (a.length >= 10 && m1 <= m0 * 0.9) {
        pros.push({
          t: lang === "pl" ? `Gleba latem wyschła (NISAR: ${num(m0, 2)} → ${num(m1, 2)} m³/m³)` : `Soil dried over the summer (NISAR: ${num(m0, 2)} → ${num(m1, 2)} m³/m³)`,
          d: lang === "pl" ? "Wilgotność gleby wokół tego miejsca z pomiarów NISAR 25.06 i 24.08.2026 (siatka 200 m, produkt wstępny). To obserwacja z jednego lata, a nie ocena ryzyka podtopień." : "Soil moisture around this place measured by NISAR on 25 June and 24 August 2026 (200 m grid, provisional product). An observation of one summer, not a flood-risk verdict."
        });
      }
    }
    if (hz ? (hz.measured ? hz.sink > -1.2 : !!(s && s.egN && s.egMed >= -1 && s.egMin > -5)) : (!s || (s.egMed >= -1.5 && s.egMin >= -3))) {
      pros.push({
        t: lang === "pl" ? (hz && !hz.measured ? "Stabilne podłoże w okolicy (pomiar radarowy)" : "Stabilne podłoże (pomiar radarowy)") : (hz && !hz.measured ? "Stable ground around (radar measurement)" : "Stable ground (radar measurement)"),
        d: lang === "pl" ? "Radar satelitarny InSAR nie rejestruje niebezpiecznych ruchów pionowych gruntu." : "InSAR satellite radar records no hazardous ground motion."
      });
    }
    const fy = radarFirst(), newHa = fy ? sel.cells.filter((i) => fy[i] > LAST_OBS() - 2000).length * cellHa() : 0, haS = num(newHa, newHa < 10 ? 1 : 0);
    if (rlQ75 != null && newHa > rlQ75 * kHa) cons.push({ lvl: "info", t: u.radarNewT(haS), d: u.radarNewD }); // a neutral point to check, not a flaw
    else if (!s || (s.walls <= 0.01 && s.up <= 0.04)) {
      pros.push({
        t: lang === "pl" ? "Spokój w radarze (brak uciążliwych budów)" : "Quiet radar signature (no intrusive building)",
        d: lang === "pl" ? "Brak gwałtownych pojaśnień i nowych hal przemysłowych w ostatnim roku." : "No abrupt brightening or industrial sheds constructed in the past year."
      });
    }
    if (!rk && bu >= 35) {
      pros.push({
        t: lang === "pl" ? "W pełni ukształtowana tkanka miejska" : "Established urban fabric",
        d: lang === "pl" ? "Okolica jest w 100% zurbanizowana. Brak wolnych gruntów pod nagłą, niekontrolowaną ekspansję." : "Area is 100% built-up. No open land for sudden uncontrolled expansion."
      });
    } else if (rk && rk.chance < 0.08 && !isForestReserve) {
      pros.push({
        t: lang === "pl" ? "Spokojna okolica (niska presja zabudowy)" : "Peaceful area (low development pressure)",
        d: lang === "pl" ? `Niskie ryzyko nowej zabudowy (${num(rk.chance * 100, 1)}% w 5 lat). Krajobraz i zieleń pozostają stabilne.` : `Low development risk (${num(rk.chance * 100, 1)}% in 5 yrs). Stable landscape.`
      });
    }

    // Overall Score (0-100)
    let score = 70; // baseline for solid, standard land in the agglomeration (neutral 70)

    // Greenery balance: optimal 10% to 65% canopy in the neighborhood
    if (ff >= 10 && ff <= 65) score += Math.round((ff / 65) * 14);
    else if (ff > 65) score += 5; // dense woodland: safe nature
    else if (bu > 60 && ff < 5) score -= 16; // heavily sealed urban core / heat island

    // River corridor & drainage
    if (isWater) {
      score = 25; // open water is not a plot
    } else if (wf.floodShare > 0) {
      if (bu >= 20 || wf.reliefMean >= 0.5) {
        score += 2; // managed, elevated riverside urban fabric
      } else {
        score -= 38; // unpaved low-lying floodplain meadow (active water hazard -> RED!)
      }
    } else {
      if (!wf.hollow) score += 3;
      if (wf.reliefMean >= 1.0) score += 2;
    }

    if (!isWater && wf.hollow) score -= 14;

    // Ground stability (InSAR / EGMS) - real satellite value!
    if (!s || (s.egMed >= -1 && s.egMin >= -2)) score += 3;
    else if (s && s.egMed <= -2.5) score -= 40; // dangerous subsidence -> RED!
    else if (s && s.egMin <= -4) score -= 20; // localized settlement -> WARN!

    // Sprawl pressure vs established fabric
    if (bu >= 35) score += 3; // established urban fabric
    else if (rk && rk.chance < 0.08) score += 3; // peaceful stable suburb
    else if (rk && (rk.chance >= 0.16 || rk.level >= 5) && wf.floodShare === 0 && bu < 35) score -= 12;

    // Active SAR construction (walls in 2026)
    if (s && s.walls > 0.02) score -= 16;

    // Tree loss
    if (lost >= 2 * kHa) score -= 16;

    score = clamp(Math.round(score), 15, 95);
    // The number shown is the map's own risk-first score (selectionScore, part 13a), so the card and the map agree.
    // The weights above stay as the fallback for when the map layers are not loaded or the point is open water.
    const riskScore = selectionScore(sel);
    if (riskScore != null) score = riskScore;

    let tierClass = "tier-great", tierLabel = u.tierGreat || "Bardzo korzystna";
    if (score < 45) { tierClass = "tier-risk"; tierLabel = u.tierRisk || "Podwyższone ryzyko"; }
    else if (score < 62) { tierClass = "tier-warn"; tierLabel = u.tierWarn || "Umiarkowana (uwagi)"; }
    else if (score < 76) { tierClass = "tier-neutral"; tierLabel = u.tierNeutral || "Standardowa (w normie)"; }
    else if (score < 84) { tierClass = "tier-good"; tierLabel = u.tierGood || "Dobra (zielona)"; }

    // What radar sees here (2026), from measured radar only: the radar first-year layer (Sentinel-1 yearly, NISAR confirms
    // 2025-2026), Sentinel-1 walls (autumn 2025 -> 2026), NISAR's June -> August change on open land. isNisar: the sentence is NISAR's.
    let nisarStatus = u.radarNone, isNisar = false;
    if (newHa > 0) nisarStatus = u.radarNewHa(haS);
    else if (s && s.walls > 0.02) nisarStatus = u.radarWalls(num(s.walls * 100, 0));
    else if (fy && sel.cells.some((i) => fy[i] >= 15)) nisarStatus = u.radarBuiltOld;
    // "open land" is only said when the radar layer is loaded and shows no built-up here; without that layer the
    // sentence keeps to what NISAR measured on the fields around (a dense city centre also has fields in its 1 km circle)
    else if (s && s.nisarOpen) { nisarStatus = (fy ? u.radarOpenNisar : u.radarNisarOnly)(num(s.nisarWetUp * 100, 0)); isNisar = true; }
    else if (fy && sel.cells.some((i) => fy[i] === 1)) nisarStatus = u.radarOpen;

    return { score, tierClass, tierLabel, pros, cons, nisarStatus, isNisar };
  }

