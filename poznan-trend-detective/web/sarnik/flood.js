// Moduł SARnik: Strefa powodziowa ISOK (Wody Polskie)
// Kontrakt: docs/planwyd/KONTRAKT.md
(function () {
  const SK = window.SARNIK;
  if (!SK) return; // bez rdzenia moduł jest bezczynny

  // Konstrukcja zapytania WMS GetFeatureInfo do serwisu ISOK
  // Okno ~60 m (0.0006 deg lat, 0.0010 deg lng) wokół punktu
  const buildUrl = (lat, lng) => {
    const dLat = 0.0006;
    const dLng = 0.0010;
    const minLng = (lng - dLng).toFixed(5);
    const minLat = (lat - dLat).toFixed(5);
    const maxLng = (lng + dLng).toFixed(5);
    const maxLat = (lat + dLat).toFixed(5);
    const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
    return "https://wody.isok.gov.pl/wss/INSPIRE/INSPIRE_NZ_HY_MZPMRP_WMS?" +
      "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo" +
      "&LAYERS=NZ.Fluvial&QUERY_LAYERS=NZ.Fluvial" +
      "&CRS=CRS:84&BBOX=" + encodeURIComponent(bbox) +
      "&WIDTH=101&HEIGHT=101&I=50&J=50&FEATURE_COUNT=10&INFO_FORMAT=text/plain";
  };

  // Czysta funkcja parsera odpowiedzi ISOK (GetFeatureInfo w formacie text/plain)
  const parse = (text) => {
    if (!text || typeof text !== "string") {
      return { level: "info", found: false, scenarios: [] };
    }
    const clean = text.trim();
    if (clean.length === 0 || /no features were found/i.test(clean)) {
      return { level: "ok", found: false, scenarios: [] };
    }

    // Sprawdzenie scenariuszy prawdopodobieństwa powodzi
    // Q 10% (raz na 10 lat) - wysokie prawdopodobieństwo
    // Q 1% (raz na 100 lat) - średnie prawdopodobieństwo
    // Q 0,2% (raz na 500 lat) - niskie prawdopodobieństwo
    const hasQ10 = /Q\s*10\s*%/i.test(clean) || /probabilityofoccurrence\s*=\s*0\.1\b/i.test(clean) || /returnperiod\s*=\s*10\b/i.test(clean);
    const hasQ1 = /Q\s*1\s*%/i.test(clean) || /probabilityofoccurrence\s*=\s*0\.01\b/i.test(clean) || /returnperiod\s*=\s*100\b/i.test(clean);
    const hasQ02 = /Q\s*0[,.]2\s*%/i.test(clean) || /probabilityofoccurrence\s*=\s*0\.002\b/i.test(clean) || /returnperiod\s*=\s*500\b/i.test(clean);

    const scenarios = [];
    if (hasQ10) scenarios.push({ id: "Q10", name: "Q 10%", returnPeriod: 10 });
    if (hasQ1) scenarios.push({ id: "Q1", name: "Q 1%", returnPeriod: 100 });
    if (hasQ02) scenarios.push({ id: "Q02", name: "Q 0,2%", returnPeriod: 500 });

    let level = "info";
    if (hasQ10 || hasQ1) {
      level = "risk";
    } else if (hasQ02) {
      level = "warn";
    } else if (scenarios.length === 0 && (/validityperiod/i.test(clean) || /NZ\.Fluvial/i.test(clean))) {
      // Inny wpis warstwy rzecznej bez znanych scenariuszy
      level = "warn";
    }

    return {
      level,
      found: scenarios.length > 0,
      hasQ10,
      hasQ1,
      hasQ02,
      scenarios
    };
  };

  SK.register("flood", {
    pure: { parse, buildUrl },
    i18n: {
      pl: {
        title: "Strefa powodziowa (ISOK)",
        checking_word: "sprawdzam…",
        checking: "Sprawdzam mapę zagrożenia powodziowego ISOK…",
        timeout_word: "brak odpowiedzi",
        timeout_msg: "Usługa ISOK nie odpowiedziała w limicie 6 sekund. Sprawdź oficjalną mapę na <a href='https://wody.isok.gov.pl/imap_kzgw/?gpmap=gpMZP' target='_blank' rel='noopener'>Hydroportalu Wód Polskich</a>.",
        error_word: "błąd usługi",
        error_msg: "Nie udało się połączyć z mapą ISOK. To nie oznacza braku zagrożenia. Sprawdź <a href='https://wody.isok.gov.pl/imap_kzgw/?gpmap=gpMZP' target='_blank' rel='noopener'>Hydroportal</a>.",
        nodata_word: "brak danych",
        nodata_msg: "Brak danych w urzędowym rejestrze powodziowym dla tego punktu.",
        risk_word: "strefa zalewowa",
        risk_both: "Punkt leży w strefie częstych wezbrań rzecznych: scenariusz raz na 10 lat (Q 10%) oraz raz na 100 lat (Q 1%) według hydraulicznego modelu rzek.",
        risk_q10: "Punkt leży w strefie wysokiego prawdopodobieństwa powodzi: raz na 10 lat (Q 10%) według hydraulicznego modelu rzek.",
        risk_q1: "Punkt leży w strefie powodzi 100-letniej (Q 1%, woda stuletnia) według hydraulicznego modelu rzek.",
        warn_word: "strefa Q 0,2%",
        warn_q02: "Punkt leży w strefie niskiego prawdopodobieństwa powodzi: raz na 500 lat (Q 0,2%) według hydraulicznego modelu rzek.",
        ok_word: "poza strefą rzeczną",
        ok_msg: "Brak strefy zalewowej w urzędowym modelu rzek ISOK. Nie wyklucza to lokalnych podtopień opadowych ani wysokich wód gruntowych.",
        areaCentre: " (analiza dla środka wyznaczonego obszaru)",
        src_short: "ISOK, Wody Polskie",
        src_full: "ISOK, Wody Polskie (stan map: 2025-12-21; model hydrauliczny rzek)",
      },
      en: {
        title: "Flood hazard zone (ISOK)",
        checking_word: "checking…",
        checking: "Checking the official ISOK river flood hazard map…",
        timeout_word: "no response",
        timeout_msg: "The ISOK service timed out after 6 seconds. Check the official map on the <a href='https://wody.isok.gov.pl/imap_kzgw/?gpmap=gpMZP' target='_blank' rel='noopener'>Polish Waters Hydroportal</a>.",
        error_word: "service error",
        error_msg: "Could not connect to the ISOK map service. This does not mean there is no flood hazard. Check the <a href='https://wody.isok.gov.pl/imap_kzgw/?gpmap=gpMZP' target='_blank' rel='noopener'>Hydroportal</a>.",
        nodata_word: "no data",
        nodata_msg: "No official flood modeling data returned for this location.",
        risk_word: "flood zone",
        risk_both: "Location lies in a frequent river flood zone: 10-year (Q 10%) and 100-year (Q 1%) scenario from hydraulic river modeling.",
        risk_q10: "Location lies in a high-probability river flood zone: once every 10 years (Q 10%) from hydraulic river modeling.",
        risk_q1: "Location lies in a 100-year river flood zone (Q 1%, 1% annual chance) from hydraulic river modeling.",
        warn_word: "Q 0.2% zone",
        warn_q02: "Location lies in a low-probability river flood zone: once every 500 years (Q 0.2%) from hydraulic river modeling.",
        ok_word: "outside river flood zone",
        ok_msg: "Outside official ISOK river flood zones. Does not rule out local pluvial ponding or high groundwater.",
        areaCentre: " (analyzed for centre of drawn area)",
        src_short: "ISOK, Polish Waters",
        src_full: "ISOK, Polish Waters (edition 2025-12-21; hydraulic river model)",
      },
    },
    onSelect(sel, ctx) {
      if (!sel || sel.lat == null || sel.lng == null) return;
      const url = buildUrl(sel.lat, sel.lng);
      ctx.fetchOnce(
        sel,
        "flood",
        (signal) =>
          fetch(url, { signal }).then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.text();
          }),
        6000
      );
    },
    checks(sel, ctx) {
      const s = ctx.t("flood");
      const r = sel.ext && sel.ext.flood;
      const isArea = sel.kind === "area";
      const locNote = isArea ? (s.areaCentre || "") : "";

      if (!r || r.st === "loading") {
        return {
          id: "hazard",
          lvl: "info",
          pending: true,
          t: s.title,
          word: s.checking_word,
          v: s.checking,
          src: s.src_short,
          sar: "no",
        };
      }

      if (r.st === "timeout") {
        return {
          id: "hazard",
          lvl: "info",
          t: s.title,
          word: s.timeout_word,
          v: s.timeout_msg,
          src: s.src_short,
          sar: "no",
        };
      }

      if (r.st !== "ok" || typeof r.data !== "string") {
        return {
          id: "hazard",
          lvl: "info",
          t: s.title,
          word: s.error_word,
          v: s.error_msg,
          src: s.src_short,
          sar: "no",
        };
      }

      const parsed = parse(r.data);
      if (!parsed || parsed.level === "info") {
        return {
          id: "hazard",
          lvl: "info",
          t: s.title,
          word: s.nodata_word,
          v: s.nodata_msg,
          src: s.src_short,
          sar: "no",
        };
      }

      if (parsed.level === "risk") {
        const scText = parsed.hasQ10 && parsed.hasQ1
          ? s.risk_both
          : parsed.hasQ10
          ? s.risk_q10
          : s.risk_q1;
        return {
          id: "hazard",
          lvl: "risk",
          t: s.title,
          word: s.risk_word,
          v: scText + locNote,
          src: s.src_full,
          sar: "no",
        };
      }

      if (parsed.level === "warn") {
        return {
          id: "hazard",
          lvl: "warn",
          t: s.title,
          word: s.warn_word,
          v: s.warn_q02 + locNote,
          src: s.src_full,
          sar: "no",
        };
      }

      // parsed.level === "ok"
      return {
        id: "hazard",
        lvl: "ok",
        t: s.title,
        word: s.ok_word,
        v: s.ok_msg + locNote,
        src: s.src_full,
        sar: "no",
      };
    },
  });
})();
