// Moduł SARnik: Rejestr osuwisk i terenów zagrożonych SOPO (PIG-PIB)
// Kontrakt: docs/planwyd/KONTRAKT.md
(function () {
  const SK = window.SARNIK;
  if (!SK) return; // bez rdzenia moduł jest bezczynny

  // Progi odległości w metrach
  const RISK_DISTANCE_M = 100;
  const WARN_DISTANCE_M = 300;

  // Odległość geodezyjna Haversine w metrach
  const distM = (lat1, lng1, lat2, lng2) => {
    const R = 6371008.8;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // Test punktu wewnątrz wielokąta (pierścienia)
  const pointInRing = (ptLat, ptLng, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      const intersect =
        yi > ptLat !== yj > ptLat &&
        ptLng < ((xj - xi) * (ptLat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Obliczenie minimalnej odległości od punktu do geometrii pierścieni
  const calcMinDist = (lat, lng, rings) => {
    if (!rings || !rings.length) return null;
    let minDist = Infinity;
    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      if (pointInRing(lat, lng, ring)) return 0;
      for (let p = 0; p < ring.length; p++) {
        const vLng = ring[p][0];
        const vLat = ring[p][1];
        const d = distM(lat, lng, vLat, vLng);
        if (d < minDist) minDist = d;
      }
    }
    return minDist === Infinity ? null : minDist;
  };

  // Konstrukcja zapytania ArcGIS REST identify do serwisu SOPO
  // Okno mapExtent i tolerance 270 px odpowiadają promieniowi ~300 m na poziomie gruntu
  const buildUrl = (lat, lng) => {
    const dLat = 0.005;
    const dLng = 0.008;
    const minLng = (lng - dLng).toFixed(5);
    const minLat = (lat - dLat).toFixed(5);
    const maxLng = (lng + dLng).toFixed(5);
    const maxLat = (lat + dLat).toFixed(5);
    const mapExtent = `${minLng},${minLat},${maxLng},${maxLat}`;
    const geom = JSON.stringify({
      x: lng,
      y: lat,
      spatialReference: { wkid: 4326 },
    });
    return (
      "https://cbdgmapa.pgi.gov.pl/arcgis/rest/services/geozagrozenia/sopo_obszary/MapServer/identify?" +
      "f=json&geometryType=esriGeometryPoint" +
      "&geometry=" + encodeURIComponent(geom) +
      "&sr=4326&layers=all&tolerance=270" +
      "&mapExtent=" + encodeURIComponent(mapExtent) +
      "&imageDisplay=1000%2C1000%2C96&returnGeometry=true"
    );
  };

  // Czysta funkcja interpretatora odpowiedzi serwisu SOPO
  // data: obiekt parsed JSON lub string; pointLat, pointLng: koordynaty zapytania; distOverride: opcjonalna odległość do testów
  const interpret = (data, pointLat, pointLng, distOverride) => {
    let parsed = data;
    if (typeof data === "string") {
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        return { level: "info", error: true };
      }
    }
    if (!parsed || parsed.error || !Array.isArray(parsed.results)) {
      return { level: "info", error: true };
    }

    const results = parsed.results;
    if (results.length === 0) {
      return { level: "ok", count: 0 };
    }

    // Przetworzenie obiektów: layerId 14 (osuwiska) oraz layerId 12 (tereny zagrożone)
    const candidates = [];
    for (let i = 0; i < results.length; i++) {
      const it = results[i];
      const layerId = it.layerId;
      const isLandslide = layerId === 14 || /osuwisk/i.test(it.layerName || "");
      const isRiskArea = layerId === 12 || /zagrożon/i.test(it.layerName || "");

      if (!isLandslide && !isRiskArea) continue;

      const attrs = it.attributes || {};
      const id = attrs["Numer identyfikacyjny"] || attrs["ID"] || it.value || "–";
      const activity = attrs["Stopień aktywności"] || null;
      const dateStr = attrs["Data wypelnienia"] || attrs["Data ustalenia"] || attrs["Wersja karty"] || "2017";
      const yearMatch = /(\b20\d\d\b)/.exec(String(dateStr));
      const year = yearMatch ? yearMatch[1] : "2017";

      let dist = null;
      if (distOverride != null) {
        dist = Number(distOverride);
      } else if (it.geometry && it.geometry.rings && pointLat != null && pointLng != null) {
        dist = calcMinDist(pointLat, pointLng, it.geometry.rings);
      } else if (typeof it.distance === "number") {
        dist = it.distance;
      } else {
        // Fallback przy braku geometrii w odpowiedzi
        dist = isLandslide ? 50 : 150;
      }

      candidates.push({
        layerId,
        isLandslide,
        isRiskArea,
        id,
        activity,
        year,
        dist,
      });
    }

    if (candidates.length === 0) {
      // Znaleziono obiekty innych warstw morfologicznych bez głównego obrysu w zasięgu
      return { level: "ok", count: 0 };
    }

    // Sortowanie według odległości
    candidates.sort((a, b) => (a.dist ?? 999) - (b.dist ?? 999));

    // 1. Sprawdzenie osuwisk (layer 14)
    const landslides = candidates.filter((c) => c.isLandslide);
    if (landslides.length > 0) {
      const closest = landslides[0];
      const d = closest.dist != null ? closest.dist : 50;
      if (d <= RISK_DISTANCE_M) {
        return {
          level: "risk",
          feature: closest,
          distanceBand: "< 100 m",
        };
      }
      if (d <= WARN_DISTANCE_M) {
        return {
          level: "warn",
          feature: closest,
          distanceBand: "100–300 m",
        };
      }
    }

    // 2. Sprawdzenie terenów zagrożonych (layer 12)
    const riskAreas = candidates.filter((c) => c.isRiskArea);
    if (riskAreas.length > 0) {
      const closest = riskAreas[0];
      const d = closest.dist != null ? closest.dist : 150;
      if (d <= WARN_DISTANCE_M) {
        return {
          level: "warn",
          feature: closest,
          distanceBand: "< 300 m",
        };
      }
    }

    // Wszystkie obiekty są dalej niż 300 m
    return { level: "ok", count: candidates.length };
  };

  SK.register("landslide", {
    pure: { interpret, buildUrl, distM, RISK_DISTANCE_M, WARN_DISTANCE_M },
    i18n: {
      pl: {
        title: "Osuwiska i ruchy masowe (SOPO)",
        checking_word: "sprawdzam…",
        checking: "Sprawdzam urzędowy rejestr osuwisk SOPO (PIG-PIB)…",
        timeout_word: "brak odpowiedzi",
        timeout_msg: "Usługa rejestru osuwisk SOPO nie odpowiedziała w limicie 6 sekund. Sprawdź portal <a href='https://osuwiska.pgi.gov.pl/' target='_blank' rel='noopener'>PIG-PIB SOPO</a>.",
        error_word: "błąd usługi",
        error_msg: "Nie udało się połączyć z bazą SOPO PIG-PIB. To nie dowodzi braku zagrożenia. Sprawdź portal <a href='https://osuwiska.pgi.gov.pl/' target='_blank' rel='noopener'>osuwiska.pgi.gov.pl</a>.",
        nodata_word: "brak danych",
        nodata_msg: "Brak danych o osuwiskach w rejestrze dla tego obszaru.",
        risk_word: "osuwisko",
        risk_msg: (id, act, dist) => `W odległości ${dist} od punktu znajduje się zarejestrowane osuwisko (nr ${id}${act}). Ryzyko niestabilności skarp i deformacji podłoża.`,
        warn_landslide_word: "osuwisko w pobliżu",
        warn_landslide_msg: (id, act, dist) => `W odległości ${dist} od punktu znajduje się zarejestrowane osuwisko (nr ${id}${act}). Wskazana ostrożność i opinia geotechniczna stoku.`,
        warn_risk_word: "teren zagrożony",
        warn_risk_msg: (id, dist) => `Działka leży w rejonie terenu zagrożonego ruchami masowymi (nr ${id}) w rejestrze SOPO. Wymaga uwagi przy posadowieniu i pracach ziemnych.`,
        ok_word: "brak w rejestrze",
        ok_msg: "Brak zarejestrowanych osuwisk i terenów zagrożonych w promieniu 300 m. Rejestr nie dowodzi, że każdy nieobjęty nim stok jest w pełni stateczny.",
        areaCentre: " (analiza dla środka wyznaczonego obszaru)",
        src_short: "SOPO, PIG-PIB",
        src_year: (yr) => `SOPO, Państwowy Instytut Geologiczny – PIB (inwentaryzacja ${yr})`,
        src_full: "SOPO, Państwowy Instytut Geologiczny – PIB (rejestr osuwisk i terenów zagrożonych)",
      },
      en: {
        title: "Landslides and mass movements (SOPO)",
        checking_word: "checking…",
        checking: "Checking the official SOPO landslide registry (PIG-PIB)…",
        timeout_word: "no response",
        timeout_msg: "The SOPO landslide registry timed out after 6 seconds. Check the official portal at <a href='https://osuwiska.pgi.gov.pl/' target='_blank' rel='noopener'>PIG-PIB SOPO</a>.",
        error_word: "service error",
        error_msg: "Could not connect to the SOPO database. This does not prove the absence of hazards. Check <a href='https://osuwiska.pgi.gov.pl/' target='_blank' rel='noopener'>osuwiska.pgi.gov.pl</a>.",
        nodata_word: "no data",
        nodata_msg: "No landslide registry data returned for this area.",
        risk_word: "landslide",
        risk_msg: (id, act, dist) => `A registered landslide is located ${dist} from the location (ID ${id}${act}). Risk of slope instability and ground movement.`,
        warn_landslide_word: "landslide nearby",
        warn_landslide_msg: (id, act, dist) => `A registered landslide is located ${dist} from the location (ID ${id}${act}). Geotechnical slope evaluation advised.`,
        warn_risk_word: "area at risk",
        warn_risk_msg: (id, dist) => `Location is near an area at risk of mass movements (ID ${id}) in the SOPO registry. Caution advised during earthworks.`,
        ok_word: "none registered",
        ok_msg: "No registered landslides or risk areas within 300 m. The registry does not prove that unmapped slopes are fully stable.",
        areaCentre: " (analyzed for centre of drawn area)",
        src_short: "SOPO, PGI-NRI",
        src_year: (yr) => `SOPO, Polish Geological Institute – NRI (inventory ${yr})`,
        src_full: "SOPO, Polish Geological Institute – NRI (registry of landslides and risk areas)",
      },
    },
    onSelect(sel, ctx) {
      if (!sel || sel.lat == null || sel.lng == null) return;
      const url = buildUrl(sel.lat, sel.lng);
      ctx.fetchOnce(
        sel,
        "landslide",
        (signal) =>
          fetch(url, { signal }).then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.text().then((t) => {
              try {
                return JSON.parse(t);
              } catch (e) {
                throw new Error("Niepoprawny JSON z serwisu SOPO");
              }
            });
          }),
        6000
      );
    },
    checks(sel, ctx) {
      const s = ctx.t("landslide");
      const r = sel.ext && sel.ext.landslide;
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

      if (r.st !== "ok" || !r.data) {
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

      const interpreted = interpret(r.data, sel.lat, sel.lng);
      if (!interpreted || interpreted.level === "info") {
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

      if (interpreted.level === "risk") {
        const feat = interpreted.feature || {};
        const nr = ctx.esc(feat.id || "–");
        const act = feat.activity ? ` (${ctx.esc(feat.activity)})` : "";
        const yr = ctx.esc(feat.year || "2017");
        const dist = feat.dist != null ? `${ctx.esc(ctx.num(feat.dist, 0))} m` : "< 100 m";
        return {
          id: "hazard",
          lvl: "risk",
          t: s.title,
          word: s.risk_word,
          v: s.risk_msg(nr, act, dist) + locNote,
          src: s.src_year(yr),
          sar: "no",
        };
      }

      if (interpreted.level === "warn") {
        const feat = interpreted.feature || {};
        const nr = ctx.esc(feat.id || "–");
        const yr = ctx.esc(feat.year || "2017");
        if (feat.isLandslide) {
          const act = feat.activity ? ` (${ctx.esc(feat.activity)})` : "";
          const dist = feat.dist != null ? `${ctx.esc(ctx.num(feat.dist, 0))} m` : "100–300 m";
          return {
            id: "hazard",
            lvl: "warn",
            t: s.title,
            word: s.warn_landslide_word,
            v: s.warn_landslide_msg(nr, act, dist) + locNote,
            src: s.src_year(yr),
            sar: "no",
          };
        } else {
          const dist = feat.dist != null ? `ok. ${ctx.esc(ctx.num(feat.dist, 0))} m` : "< 300 m";
          return {
            id: "hazard",
            lvl: "warn",
            t: s.title,
            word: s.warn_risk_word,
            v: s.warn_risk_msg(nr, dist) + locNote,
            src: s.src_year(yr),
            sar: "no",
          };
        }
      }

      // interpreted.level === "ok"
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
