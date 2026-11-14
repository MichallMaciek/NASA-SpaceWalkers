/* SARnik: "O projekcie" / "About the project".
   Plain JavaScript, no dependencies. Numbers in bold are read at load time from the app's own data files
   (data/land/sar.json, data/land/land.json). A few figures are fixed text: results of the team's review of
   14 Nov 2026 (site counts, block tests, sensor offsets) and ERA5 weather from the NISAR pass list. Review results
   are shown only while the data still match the build that review checked (see REV below), otherwise a neutral
   sentence replaces them. */
(() => {
  "use strict";

  /* ---------- storage: same keys as web/app.js ---------- */
  const LANG_KEY = "ptd-lang", THEME_KEY = "ptd-theme";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
  };
  let lang = (navigator.language || "pl").toLowerCase().startsWith("en") ? "en" : "pl";
  { const s = store.get(LANG_KEY); if (s === "pl" || s === "en") lang = s; }

  let sar = null, land = null, loadState = "loading";
  const failed = [];

  /* ---------- small helpers ---------- */
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const numOrNull = (v) => (isNum(v) ? v : null);
  const arr = (a) => (Array.isArray(a) ? a : []);
  const last = (a) => (a.length ? a[a.length - 1] : undefined);
  const DASH = "—";

  function fmt(lg) {
    const sep = lg === "pl" ? "," : ".";
    const loc = lg === "pl" ? "pl-PL" : "en-GB";
    const n = (v, d = 0) => {
      if (!isNum(v)) return DASH;
      const r = Number(v.toFixed(d));
      return (r < 0 ? "−" : "") + Math.abs(r).toFixed(d).replace(".", sep);
    };
    const sg = (v, d = 0) => (!isNum(v) ? DASH : (Number(v.toFixed(d)) > 0 ? "+" : "") + n(v, d));
    const pc = (v, d = 0) => (!isNum(v) ? DASH : n(v * 100, d) + "%");
    const int = (v) => (!isNum(v) ? DASH : Math.round(v).toLocaleString(loc));
    const dt = (iso, year) => {
      if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return DASH;
      const d = new Date(iso + "T00:00:00Z");
      if (isNaN(d)) return DASH;
      const o = { day: "numeric", month: "long", timeZone: "UTC" };
      if (year) o.year = "numeric";
      return d.toLocaleDateString(loc, o).replace(/\s?r\.$/, "");
    };
    return { n, sg, pc, int, dt };
  }
  const B = (s) => `<b class="num">${s}</b>`;

  /* ---------- everything the page shows from the data ---------- */
  function collect() {
    const s = sar || {}, l = land || {};
    const s1 = s.s1 || {}, ch = s.checks || {}, ni = s.nisar || {}, nc = ni.checks || {};
    const s1d = arr(s1.dates), nd = arr(ni.dates);
    const cm = ch.change_method || s1.change || {};
    const now = arr(cm.now), before = arr(cm.before);
    const wu = ch.wuia || {}, ww = ch.wuia_walls || {}, wet = ch.wet || {}, eg = ch.egms || {}, sa = ch.sanity || {};
    const wd = nc.wetdry || {}, bands = nc.bands || null;
    const bd = (c, k) => (bands && bands[c] ? numOrNull(bands[c][k]) : null);
    // longest gap between used NISAR passes
    let gap = null, gapFrom, gapTo, step = null;
    const days = [];
    for (let i = 1; i < nd.length; i++) {
      const g = Math.round((Date.parse(nd[i]) - Date.parse(nd[i - 1])) / 864e5);
      if (isNum(g)) { days.push(g); if (gap === null || g > gap) { gap = g; gapFrom = nd[i - 1]; gapTo = nd[i]; } }
    }
    if (days.length) { const c = {}; days.forEach((g) => { c[g] = (c[g] || 0) + 1; }); step = +Object.keys(c).sort((a, b) => c[b] - c[a])[0]; }
    const model = l.model || {};
    const D = {
      haveSar: !!sar, haveLand: !!land,
      s1n: s1d.length || null, s1orbit: numOrNull(s1.orbit), s1first: s1d[0], s1last: last(s1d),
      nowN: now.length || null, nowFirst: now[0], nowLast: last(now), befN: before.length || null, befFirst: before[0], befLast: last(before),
      upHa: numOrNull(s1.up3db_ha), wallsHa: numOrNull(s1.walls_ha), wallDb: numOrNull(s1.wall_db), waterDb: numOrNull(s1.water_db),
      wetPasses: numOrNull(s1.wet_passes), rcrit: numOrNull(wet.r_crit != null ? wet.r_crit : s1.r_crit),
      wu: { cells: numOrNull(wu.cells), hits: numOrNull(wu.hits), a: numOrNull(wu.share_a), b: numOrNull(wu.share_b), ratio: numOrNull(wu.ratio) },
      ww: { cells: numOrNull(ww.cells), hits: numOrNull(ww.hits), a: numOrNull(ww.share_a), b: numOrNull(ww.share_b), ratio: numOrNull(ww.ratio), p: numOrNull(ww.p) },
      wet: { share: numOrNull(wet.share_sig_study), medR: numOrNull(wet.median_r_open), open: numOrNull(wet.open_share_of_study),
        flood: numOrNull(wet.share_sig_flood), out: numOrNull(wet.share_sig_outside), driver: wet.driver },
      season: numOrNull(ch.season_change_open_up3db_share),
      eg: { cells: numOrNull(eg.cells), share: numOrNull(eg.share_of_study), med: numOrNull(eg.median), p5: numOrNull(eg.p5), min: numOrNull(eg.min), le5: numOrNull(eg.cells_le_minus5) },
      sa: { built: numOrNull(sa.vv_med_built_db), other: numOrNull(sa.vv_med_open_db), forestVH: numOrNull(sa.vh_med_forest_db) },
      nn: nd.length || null, nFirst: nd[0], nLast: last(nd), track: numOrNull(ni.track), version: typeof ni.version === "string" ? ni.version : null,
      gap, gapFrom, gapTo, step, dateA: typeof ni.dry === "string" ? ni.dry : null, dateB: typeof ni.wet === "string" ? ni.wet : null,
      wd: { share: numOrNull(wd.share_study), flood: numOrNull(wd.share_flood), out: numOrNull(wd.share_outside), ratio: numOrNull(wd.ratio), med: numOrNull(wd.median_db_open) },
      bands: !!bands, bd,
      alosFirst: arr((s.alos || {}).years)[0], alosLast: last(arr((s.alos || {}).years)),
      cellGround: numOrNull(l.cell_m_ground), cellM: Array.isArray(l.transform3857) ? numOrNull(l.transform3857[0]) : null,
      thr: numOrNull(l.threshold), nisarAll: arr(l.nisar_dates).length || null,
      munis: l.municipalities && typeof l.municipalities === "object" ? Object.keys(l.municipalities).length : null,
      bounds: Array.isArray(l.bounds) && l.bounds.length === 2 ? l.bounds : null,
      auc: numOrNull(model.open_land_auc), aucBase: numOrNull(model.open_land_baseline_auc), conv: numOrNull(model.open_land_conversions),
      trained: arr(model.trained_on), tested: typeof model.tested_on === "string" ? model.tested_on : null,
    };
    D.dL = isNum(bd("forest", "HV")) && isNum(bd("open", "HV")) ? bd("forest", "HV") - bd("open", "HV") : null;
    D.dC = isNum(bd("forest", "VH")) && isNum(bd("open", "VH")) ? bd("forest", "VH") - bd("open", "VH") : null;
    D.vhBuiltOverForest = isNum(bd("built", "VH")) && isNum(bd("forest", "VH")) && bd("built", "VH") > bd("forest", "VH");
    D.trainedSpan = D.trained.length ? String(D.trained[0]).split("-")[0] + "–" + String(last(D.trained)).split("-").pop() : null;
    // results of the team review are shown only while the data are those the review scripts checked
    // (Sentinel-1 at full 10 m resolution, rebuilt and re-checked on 14 Nov 2026 at 22:45)
    D.REV = {
      wuia: D.wu.cells === 766 && D.wu.hits === 16,
      ww: D.ww.cells === 766 && D.ww.hits === 9,
      walls: D.wallsHa === 506 && D.upHa === 1086,
      wd: D.wd.share === 0.3746,
      egms: D.eg.cells === 97567 && D.eg.le5 === 147,
      season: D.season === 0.0404,
      wet: D.wet.share === 0.2321,
      model: numOrNull((ch.model || {}).ratio) === 1.78 && numOrNull((ch.model || {}).hits) === 134,
    };
    return D;
  }

  /* ---------- three drawings (no text inside, so they serve both languages) ---------- */
  const SAT = '<rect class="f-sat" x="178" y="10" width="16" height="10" rx="2"/><path class="f-pan" d="M168 15h10M194 15h10"/>';
  const FIG = {
    surface: `<svg viewBox="0 0 220 130" aria-hidden="true">${SAT}
      <path class="f-in" d="M182 26L112 104"/><path class="f-out" d="M112 104L42 30"/><path class="f-out" d="M42 30l2 10M42 30l10 2"/>
      <path class="f-water" d="M12 108q8-5 16 0t16 0 16 0 16 0 16 0 16 0 16 0 16 0 16 0 16 0 16 0 16 0"/></svg>`,
    double: `<svg viewBox="0 0 220 130" aria-hidden="true">${SAT}
      <rect class="f-house" x="40" y="52" width="44" height="56"/><path class="f-house" d="M36 54l26-20 26 20"/>
      <path class="f-ground" d="M10 108h200"/>
      <path class="f-in" d="M182 26L126 108"/><path class="f-in" d="M126 108L84 80"/><path class="f-out" d="M84 80L174 27"/><path class="f-out" d="M174 27l-10 0M174 27l-5 8"/></svg>`,
    volume: `<svg viewBox="0 0 220 130" aria-hidden="true">${SAT}
      <path class="f-ground" d="M10 108h200"/><path class="f-trunk" d="M100 108V82"/>
      <circle class="f-crown" cx="100" cy="60" r="28"/>
      <path class="f-in" d="M182 26L120 52"/><path class="f-in" d="M120 52l-14 10 8 8-16 4"/>
      <path class="f-out" d="M120 52L172 28"/><path class="f-out" d="M172 28l-10 1M172 28l-4 8"/>
      <path class="f-weak" d="M96 74l-26 12M104 62l-30-16M92 48l-6-28M110 70l22 18"/></svg>`,
  };

  /* ================= texts ================= */
  const TXT = {};

  /* ---------------- Polish ---------------- */
  TXT.pl = {
    title: "O projekcie · SARnik",
    h1: "O projekcie SARnik",
    sub: "NASA Space Apps Challenge 2026 · Dancing with the SARs · zespół SpaceWalkers, Poznań",
    back: "Wróć do aplikacji",
    langGroup: "Język",
    themeToDark: "Włącz ciemny motyw", themeToLight: "Włącz jasny motyw",
    loading: "Wczytuję liczby z danych aplikacji…",
    ok: "Liczby pogrubione są czytane na żywo z plików danych aplikacji (data/land/sar.json i land.json). Kilka liczb z przeglądu zespołu i z listy przelotów NISAR (ERA5) jest wpisanych na stałe.",
    fail: "Nie udało się wczytać plików danych aplikacji, więc liczby są niedostępne (w ich miejscu stoi „—”). Tekst poniżej pozostaje aktualny.",
    partial: (f) => `Nie udało się wczytać pliku ${f}; brakujące liczby oznaczono „—”. Reszta strony jest aktualna.`,
    howto: "Każda część zaczyna się prostym językiem. Metodę, liczby i zastrzeżenia znajdziesz po rozwinięciu „Szczegóły”.",
    toc: "Spis treści",
    details: "Szczegóły",
    mean: "Co to znaczy", result: "Wynik", caveat: "Zastrzeżenie",
    nasa: "Dane NASA", partner: "Dane partnera", both: "Dane NASA i partnera",
    foot: "SARnik · NASA Space Apps Challenge 2026 · SpaceWalkers",
    sec: [
      { id: "czym", t: "Czym jest SARnik", body: (c) => `
        <div class="plain"><p>SARnik to radarowy przegląd techniczny terenu wokół Poznania: wpisujesz adres albo obrysowujesz działkę, a aplikacja pokazuje, co radar satelitarny (NISAR i Sentinel-1) widzi tam w 2026 roku, czy grunt się rusza i jak okolica się zabudowywała. To pierwsze spojrzenie przed zakupem ziemi, a nie zastępstwo oględzin czy badania gruntu.</p></div>
        <a class="applink" href="index.html">Otwórz aplikację</a>` },

      { id: "radar", t: "Dlaczego radar, a nie zdjęcie", body: (c) => `
        <div class="plain"><p>Aparat potrzebuje światła dziennego i bezchmurnego nieba, a widzi kolor. Radar sam wysyła impuls mikrofalowy i mierzy jego echo, więc działa w nocy i przez chmury. Echo zależy od rzeczy, których zdjęcie nie pokaże: kształtu i szorstkości powierzchni oraz tego, ile jest w niej wody. Dlatego radar może zauważyć nowe ściany, świeżo zaoraną ziemię albo mokrą wierzchnią warstwę gleby przy każdym przelocie, bez względu na pogodę.</p></div>
        ${c.more("radar", `<p>Jasność zależy też od kąta, pod jakim patrzy radar, i od długości fali w porównaniu z wielkością tego, w co trafia. Dlatego w produktach z 2026 roku porównujemy tylko przeloty z tej samej orbity, czyli z tą samą geometrią: Sentinel-1 z orbity względnej ${B(c.f.int(c.D.s1orbit))}, NISAR z orbity ${B(c.f.int(c.D.track))}. Wartości to współczynnik rozpraszania wstecznego gamma-0; moc liniową uśredniamy przed przeliczeniem na dB.</p>`)}` },

      { id: "polaryzacje", t: "Która polaryzacja co pokazuje", body: (c) => `
        <div class="plain"><p>Radar wysyła falę drgającą w jednym kierunku: poziomo (H) albo pionowo (V), a echo odbiera w obu. VV i HH znaczą, że fala wróciła ułożona tak samo, jak wyszła; VH i HV, że wróciła obrócona. O tym, która z nich się rozjaśnia, decyduje sposób, w jaki powierzchnia odsyła falę.</p></div>
        <div class="figs">
          <figure>${FIG.surface}<figcaption><b>Odbicie lustrzane</b>Spokojna woda i gładki asfalt odbijają falę w bok, z dala od satelity, więc są ciemne we wszystkich polaryzacjach. Szorstka gleba odsyła więcej.</figcaption></figure>
          <figure>${FIG.double}<figcaption><b>Podwójne odbicie</b>Ściana i ziemia tworzą narożnik, który odsyła falę prosto do satelity. Najmocniej rozjaśnia to VV i HH, zwykle bardziej HH.</figcaption></figure>
          <figure>${FIG.volume}<figcaption><b>Rozpraszanie objętościowe</b>W liściach, łodygach i gałęziach fala odbija się wiele razy i się obraca. To dodaje sygnału w VH i HV: polaryzacje krzyżowe są wszędzie słabsze, ale roślinność podnosi je najbardziej.</figcaption></figure>
        </div>
        <div class="tw"><table>
          <thead><tr><th scope="col">Co widzimy</th><th scope="col">Dlaczego</th><th scope="col">Najbardziej wyróżnia się w</th></tr></thead>
          <tbody>
            <tr><td>Spokojna woda, gładki asfalt (ciemne)</td><td>odbicie lustrzane z dala od satelity</td><td>w żadnej: ciemne we wszystkich</td></tr>
            <tr><td>Budynki</td><td>narożnik ściana–grunt: podwójne odbicie</td><td>VV, HH (ściany ukośnie do orbity: także VH, HV)</td></tr>
            <tr><td>Mokra gleba</td><td>woda podnosi stałą dielektryczną gleby</td><td>VV, HH</td></tr>
            <tr><td>Zaorana, szorstka gleba</td><td>szorstka powierzchnia odsyła więcej fali</td><td>VV, HH</td></tr>
            <tr><td>Las, uprawy</td><td>rozpraszanie objętościowe</td><td>VH, HV</td></tr>
          </tbody></table></div>
        ${c.more("polaryzacje", `<ul>
          <li><b>VH i HV to nie tylko roślinność.</b> Budynek, którego ściany są obrócone względem kierunku lotu satelity (o więcej niż ok. 20–30°), odsyła mniej w VV i HH, a więcej w VH i HV.${c.D.vhBuiltOverForest ? ` W naszych medianach Sentinel-1 zabudowa jest w VH jaśniejsza (${B(c.f.n(c.D.bd("built", "VH"), 1))} dB) niż las (${B(c.f.n(c.D.bd("forest", "VH"), 1))} dB).` : ""} Nasz test śladu nowych ścian (VV rośnie o co najmniej ${B(c.f.n(c.D.wallDb, 1))} dB bardziej niż VH) pomija więc część budynków ustawionych ukośnie.</li>
          <li><b>Ciemna jest spokojna, otwarta woda.</b> Jezioro sfalowane przez wiatr może być jaśniejsze w VV pasma C, a zalana łąka, z której wystają trawy albo trzciny, bywa jasna, bo woda i łodygi też tworzą narożnik, zwłaszcza w paśmie L. Nasza reguła wody (VV poniżej ${B(c.f.n(c.D.waterDb, 0))} dB) wskazuje tylko spokojną otwartą wodę.</li>
          <li><b>Wilgoć widać tylko przy powierzchni.</b> Oba pasma czują kilka górnych centymetrów wilgotnej gleby (ok. 1–2 cm w paśmie C, ok. 5 cm w paśmie L), więc żadne nie sięga wód gruntowych.</li>
          <li>W narożniku ściana–grunt HH jest zwykle silniejsze niż VV, bo fala spolaryzowana pionowo słabiej odbija się od gruntu i ściany.</li>
        </ul>`)}` },

      { id: "pasma", t: "Pasmo L obok pasma C", body: (c) => `
        <div class="plain"><p>Sentinel-1 działa w paśmie C, na fali 5,6 cm. Rozprasza się ona głównie w górnej części koron drzew, ale przez trawę i niskie uprawy nadal dociera do gleby. NISAR i ALOS-2 działają w paśmie L, na fali 24 cm, która wchodzi głębiej w roślinność, aż do gałęzi, pni i gleby pod nimi. Dlatego pasmo L wyraźniej odróżnia las od otwartego terenu: nad naszym obszarem las jest jaśniejszy od otwartego terenu o ${B(c.f.n(c.D.dL, 1))} dB w HV pasma L i o ${B(c.f.n(c.D.dC, 1))} dB w VH pasma C.</p></div>
        <div class="tw"><table>
          <caption>Mediany klas terenu w obszarze badań, dB (NISAR 2026, orbita ${c.f.int(c.D.track)}; Sentinel-1 2026, orbita ${c.f.int(c.D.s1orbit)})</caption>
          <thead><tr><th scope="col">Teren</th><th scope="col" class="r">L: HH</th><th scope="col" class="r">L: HV</th><th scope="col" class="r">C: VV</th><th scope="col" class="r">C: VH</th></tr></thead>
          <tbody>${[["built", "Zabudowa"], ["forest", "Las"], ["open", "Otwarty teren"]].map(([k, name]) =>
            `<tr><th scope="row">${name}</th>${["HH", "HV", "VV", "VH"].map((p) => `<td class="r">${c.f.n(c.D.bd(k, p), 1)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>
        ${c.more("pasma", `<ul>
          <li>Porównuj kontrasty w obrębie jednego satelity, nie surowe wartości między satelitami: NISAR to wersja wstępna danych (provisional), a oba satelity patrzą pod innymi kątami.</li>
          <li>${c.D.REV.wd ? "NISAR 2026 jest jaśniejszy od mozaiki ALOS-2 z 2021 roku o ok. 1,3–2,5 dB nad lasem i zabudową oraz o 4–6,5 dB nad polami (kalibracja, pora roku, uprawy i kąt patrzenia)." : "NISAR 2026 i mozaiki ALOS-2 różnią się jasnością (kalibracja, pora roku, uprawy i kąt patrzenia)."} Dlatego oś czasu pasma L w aplikacji rozciąga kolory osobno dla każdego satelity: porównuj klasy terenu, nie jasność.</li>
          <li>Klasy: zabudowa to komórki z co najmniej ${B(c.f.pc(c.D.thr, 0))} zabudowy w 2020; las to komórki zalesione w ponad 78% w 2000; otwarty teren to komórki z mniejszą zabudową, poniżej 30% lasu i nie częściej niż w 20% przelotów ciemne jak woda.</li>
          <li>NISAR: piksel 20 m, ${B(c.f.int(c.D.nn))} przelotów. ALOS-2: roczne mozaiki 25 m z lat ${B(String(c.D.alosFirst ?? DASH))}–${B(String(c.D.alosLast ?? DASH))}, składane ze scen z różnych dat, w tym samym paśmie i polaryzacjach co NISAR.</li>
        </ul>`)}` },

      { id: "produkty", t: "Co liczy aplikacja", body: (c) => {
        const f = c.f, D = c.D;
        return `
        <div class="plain"><p>Każdy widok mapy i każda liczba pochodzi z jednego z produktów poniżej. Przy każdym podajemy dane i to, czy są to dane NASA, czy partnera. Wszystkie leżą na jednej siatce komórek ${B(f.int(D.cellM))} m (w odwzorowaniu Web Mercator; w terenie przy Poznaniu to ok. ${B(f.int(D.cellGround))} m).</p></div>
        <h3>Obraz radarowy 2026</h3>
        <p>Mediana ${B(f.int(D.s1n))} przelotów Sentinel-1 z orbity względnej ${B(f.int(D.s1orbit))} (wznoszącej), ${f.dt(D.s1first)}–${f.dt(D.s1last, true)}, w trzech kolorach: czerwony to VV, zielony VH, niebieski VV/VH.</p>
        ${c.src("partner", "Sentinel-1 RTC (ESA/Copernicus), przetworzone przez Catalyst, udostępnione przez Microsoft Planetary Computer.")}
        <h3>Zmiana w ciągu roku</h3>
        <p>Mediana VV z ${B(f.int(D.nowN))} przelotów jesieni 2026 (${f.dt(D.nowFirst)}–${f.dt(D.nowLast)}) minus mediana z ${B(f.int(D.befN))} przelotów jesieni 2025 (${f.dt(D.befFirst)}–${f.dt(D.befLast)}), ta sama orbita. VV wzrosło o co najmniej 3 dB na ${B(f.int(D.upHa))} ha, z dowolnej przyczyny, także na polach. Porównanie jesieni z jesienią usuwa większość sezonu rolnego, ale nie różnice wilgotności gleby i upraw między latami: ciemniejsza komórka na polu zwykle oznacza inną uprawę, orkę albo suchszą glebę niż rok wcześniej, a nie rozbiórkę.</p>
        ${c.src("partner", "Sentinel-1 RTC (ESA/Copernicus).")}
        <h3>Ślad nowych ścian</h3>
        <p>Komórki, w których VV wzrosło o co najmniej 3 dB i o co najmniej ${B(f.n(D.wallDb, 1))} dB bardziej niż VH; taki wzór daje nowy narożnik ściana–grunt. Razem ${B(f.int(D.wallsHa))} ha. To górna granica, a nie potwierdzone budynki: ${D.REV.walls ? "ok. jedna trzecia leży na terenie zabudowanym już w 2020, " : ""}decyzje miasta jeszcze tego śladu nie potwierdzają (część 6), a ściany ustawione ukośnie do orbity mogą go nie dawać. Na brzegach rzek i stawów podobny ślad może dać zmiana poziomu wody.</p>
        ${c.src("partner", "Sentinel-1 RTC (ESA/Copernicus), VV i VH.")}
        <h3>Woda w oczach radaru</h3>
        <p>Udział przelotów, w których komórka jest ciemniejsza niż ${B(f.n(D.waterDb, 0))} dB w VV: spokojna otwarta woda.</p>
        ${c.src("partner", "Sentinel-1 RTC (ESA/Copernicus).")}
        <h3>Reakcja na mokrą pogodę</h3>
        <p>Tylko otwarty teren (bez zabudowy, lasu i wody). Korelacja rang Spearmana między VV a wilgotnością wierzchniej warstwy gleby z NASA POWER (GWETTOP) w ${B(f.int(D.wetPasses))} przelotach; pokazujemy komórki z r powyżej ${B(f.n(D.rcrit, 3))}. GWETTOP to jedna wartość dla całego obszaru (komórka siatki MERRA-2 o boku ok. 50 km), więc test pyta, czy komórka podąża za mokrymi i suchymi okresami w regionie. Pokazuje, gdzie radar widzi zmiany wilgotności przy powierzchni; nie mierzy, jak szybko woda wsiąka albo odpływa.</p>
        ${c.src("both", "Sentinel-1 RTC (ESA/Copernicus) oraz NASA POWER (NASA Langley Research Center).")}
        <h3>NISAR, pasmo L 2026</h3>
        <p>${B(f.int(D.nn))} przelotów NISAR GCOV w wersji ${D.version === "provisional" ? "wstępnej (provisional)" : (D.version || DASH)} z orbity ${B(f.int(D.track))} (wznoszącej), ${f.dt(D.nFirst)}–${f.dt(D.nLast, true)}, HH i HV, piksel 20 m. Z każdego pliku HDF5 czytamy tylko okno Poznania (zapytania o fragment pliku) i uśredniamy moc w naszych komórkach. Mediana to ostatni krok osi czasu pasma L w aplikacji.</p>
        ${c.src("nasa", "NISAR (wspólna misja NASA i ISRO), produkt GCOV z NASA ASF DAAC.")}
        <h3>NISAR: zmiana od ${f.dt(D.dateA)} do ${f.dt(D.dateB)}</h3>
        <p>HH z ${f.dt(D.dateB)} minus HH z ${f.dt(D.dateA, true)}, na otwartym terenie. Między tymi datami padało (wilgotność gleby 0–7 cm wg ERA5 wzrosła z 0,09 do 0,30 m³/m³; 23,5 mm deszczu w 3 dni), ale minęły też dwa miesiące żniw, uprawy pól i wzrostu roślin. Warstwa pokazuje oba efekty i nie potrafi ich rozdzielić.</p>
        ${c.src("nasa", "NISAR GCOV. Tło pogodowe (dane partnera): ERA5 (Copernicus C3S) przez Open-Meteo.")}
        <h3>Ruch gruntu</h3>
        <p>Pionowy ruch gruntu w latach 2016–2020 z Europejskiej Usługi Monitorowania Ruchów Ziemi (EGMS, Copernicus; interferometria Sentinel-1), przez usługę PIG-PIB, w pełnych milimetrach na rok.</p>
        ${c.src("partner", "EGMS (Copernicus Land Monitoring Service), przez PIG-PIB.")}
        <h3>Historia w paśmie L</h3>
        <p>Roczne mozaiki ALOS-2 PALSAR-2 z lat ${B(String(D.alosFirst ?? DASH))}–${B(String(D.alosLast ?? DASH))}: HH, HV i ich stosunek; to samo pasmo i te same polaryzacje co NISAR.</p>
        ${c.src("partner", "JAXA, przez Microsoft Planetary Computer.")}
        <h3>Letnie obrazy Sentinel-1 2017, 2020, 2024 i aktywność terenu 2017→2024</h3>
        <p>Warstwy „Sentinel-1, mediana z lata” i „Aktywność terenu, radar 2017–2024”: mediana VV z do 14 przelotów wznoszących z czerwca–sierpnia każdego roku, z różnych orbit względnych. To obraz zmian, nie porównanie przelotów z tej samej orbity; różnice w dB między latami mogą częściowo wynikać z innej geometrii.</p>
        ${c.src("partner", "Sentinel-1 RTC (ESA/Copernicus), przez Microsoft Planetary Computer.")}
        <h3>Obrazy wszystkich przelotów NISAR</h3>
        <p>Widok przelotów NISAR na mapie pokazuje obrazy poglądowe NASA GIBS ze wszystkich czterech orbit i obu wersji danych (${B(f.int(D.nisarAll))} dat). To tylko obraz: nie korzysta z niego żadna liczba w aplikacji ani na tej stronie.</p>
        ${c.src("nasa", "NASA GIBS (NISAR GCOV).")}
        <h3>Tło bez radaru</h3>
        <p>Zabudowa 1975–2020 (JRC GHSL, z Landsata, w późniejszych latach także z Sentinel-2) i prognoza zabudowy do 2035 (model uczony na latach ${D.trainedSpan || "2005–2015"}, sprawdzony na latach ${(D.tested || "2015-2020").replace("-", "–")}); ubytek drzew (Hansen/UMD Global Forest Change, z Landsata); letnie upały (NASA MODIS Terra); obniżenia terenu (Copernicus DEM: model powierzchni z radaru TanDEM-X, razem z drzewami i budynkami); obszary zagrożone podtopieniami (PIG-PIB); ceny mieszkań i płace (GUS BDL).</p>
        ${c.src("both", "Landsat (NASA/USGS) i NASA MODIS; od partnerów JRC, UMD, Copernicus, PIG-PIB i GUS.")}
        ${c.more("produkty", `<ul>
          <li>Sentinel-1 czytamy z podglądu (overview) produktu o pikselu 80 m, a nie w pełnej rozdzielczości 10 m, i uśredniamy go na siatkę komórek. Moc NISAR z pikseli 20 m uśredniamy bezpośrednio.</li>
          <li>Karty miejsc w aplikacji liczą komórki z zaokrąglonych warstw mapy, a sumy (np. ${B(f.int(D.upHa))} ha) pochodzą z wartości niezaokrąglonych${D.REV.walls ? "; różnica to ok. 3%" : ", więc mogą się nieco różnić"}.</li>
          <li>Wilgotność gleby 0,09 i 0,30 m³/m³ oraz deszcz to wartości dobowe ERA5 dla dnia przelotu (Open-Meteo). Przelot ${f.dt(D.dateB)} był ok. 5:39 czasu lokalnego, więc część deszczu z tego dnia mogła spaść już po nim. To inna wielkość niż GWETTOP z NASA POWER, który w obu okresach wynosi ok. 0,31–0,43.</li>
          <li>Przeloty NISAR: zwykle co ${B(f.int(D.step))} dni, z jedną ${B(f.int(D.gap))}-dniową przerwą (bez przelotu między ${f.dt(D.gapFrom)} a ${f.dt(D.gapTo)}). Dwa pliki z 5 września to dwa przetworzenia tego samego przelotu; potok je uśrednia zamiast zostawić nowsze (wpływ pomijalny, ta data nie wchodzi do żadnego testu).</li>
        </ul>`)}`;
      } },

      { id: "dowody", t: "Dowody", body: (c) => {
        const f = c.f, D = c.D, R = D.REV;
        const NA = "Wynik podajemy obok, gdy dane się wczytają.";
        const wuMore = !isNum(D.wu.ratio) ? null : D.wu.ratio > 1;
        const wwSig = !isNum(D.ww.p) ? null : D.ww.p < 0.05;
        const half = !isNum(D.wd.ratio) ? null : D.wd.ratio >= 0.4 && D.wd.ratio <= 0.6;
        const stable = isNum(D.eg.med) && Math.abs(D.eg.med) <= 1;
        return `
        <div class="plain"><p>Sprawdziliśmy na niezależnych danych, czy sygnały radaru znaczą to, co mówimy. Przy każdym teście: co znaczy prostymi słowami, wynik z danych aplikacji i zastrzeżenie. Test, którego liczba się nie broni, opisujemy bez niej i podajemy powód.</p></div>
        ${c.check("wuia", "Silne pojaśnienie na działkach z decyzją o nowej budowie",
          wuMore === null ? NA : wuMore ? "Tam, gdzie miasto zdecydowało w sprawie nowej budowy w czerwcu–sierpniu 2026, radar częściej niż w reszcie Poznania widzi silny wzrost echa." : "Na działkach z decyzją o nowej budowie radar nie widzi częściej silnego wzrostu echa niż w reszcie Poznania.",
          `${B(f.int(D.wu.hits))} z ${B(f.int(D.wu.cells))} komórek (${B(f.pc(D.wu.a, 2))}) wobec ${B(f.pc(D.wu.b, 2))} w reszcie miasta, czyli ok. ${B(f.n(D.wu.ratio, 1))} raza częściej. Liczymy wzrost VV o co najmniej 3 dB rok do roku (Sentinel-1).`,
          "„Decyzje o nowej budowie” to nie tylko pozwolenia na budowę: także zgłoszenia z projektem, decyzje o warunkach zabudowy i o lokalizacji inwestycji celu publicznego. " +
          (R.wuia ? "Trafienia pochodzą z 8 decyzji (9 osobnych skupisk komórek), w tym z trzech zmian wcześniejszych pozwoleń i dwóch budów sieci. Gdy sąsiednie komórki losujemy razem (bloki ok. 0,6 km), 95% przedział ufności krotności to ok. 1,7–7. " : "Przegląd na poziomie budów zrobiono dla danych z 14 listopada 2026 i nie powtórzono go dla obecnych danych. ") +
          "Sąsiednie komórki nie są od siebie niezależne, więc nie podajemy wartości p.")}
        ${c.check("walls", "Sam ślad nowych ścian na tych samych działkach",
          wwSig === null ? NA : wwSig ? "Ostrzejszy ślad podwójnego odbicia też jest częstszy na działkach z decyzją o nowej budowie, ale ten wynik jest na granicy." : "Ostrzejszy ślad podwójnego odbicia nie jest jeszcze potwierdzony przez decyzje miasta.",
          `${B(f.int(D.ww.hits))} z ${B(f.int(D.ww.cells))} komórek (${B(f.pc(D.ww.a, 2))}) wobec ${B(f.pc(D.ww.b, 2))}, stosunek ${B(f.n(D.ww.ratio, 1))}` + (wwSig === false ? `, p = ${B(f.n(D.ww.p, 2))}: wynik nieistotny.` : "."),
          `Przy ${f.int(D.ww.hits)} trafieniach test ma małą moc.` + (R.ww ? " Gdy sąsiednie komórki losujemy razem, przedział ufności to ok. 1,2–6,4 dla bloków 0,6 km, ale 0,7–7,1 dla bloków 1,2 km." : "") + " Ślad może być przydatny, ale nie nazywamy go „nowymi budynkami”.")}
        ${c.check("model", "Prognoza a radar",
          R.model ? "Radar częściej widzi zmiany tam, gdzie prognoza spodziewa się zabudowy, ale to głównie skraj istniejących osiedli: 90% tych miejsc leży do 150 m od zabudowy." : "Porównanie prognozy z radarem nie jest dowodem, że model coś dodaje.",
          R.model ? `<span class="nonum">Nie podajemy krotności.</span> Gdy porównujemy tylko miejsca w tej samej odległości od zabudowy, przewaga prognozy jest mała i wyraźna tylko dla śladu nowych ścian. Ten test pokazuje głównie, że zmiany dzieją się na skraju osiedli.`
            : `<span class="nonum">Nie podajemy krotności.</span> Przegląd tego testu zrobiono dla danych z 14 listopada 2026 i nie powtórzono go dla obecnych danych.`,
          `Model sprawdziliśmy osobno: na terenie wolnym w 2015 wygrywa z prostą regułą sąsiedztwa zabudowy (AUC ${B(f.n(D.auc, 2))} wobec ${B(f.n(D.aucBase, 2))}), ale na podstawie tylko ${B(f.int(D.conv))} przypadków zabudowy w latach 2015–2020.`)}
        ${c.check("season", "Rok do roku zamiast sezonu",
          "Porównanie jesieni z jesienią usuwa większość fałszywych alarmów z prac polowych.",
          `Różnica czerwiec→listopad oznaczyłaby wzrost o 3 dB lub więcej na ${B(f.pc(D.season, 1))} terenu niezabudowanego w 2025` + (R.season ? "; porównanie jesieni z jesienią: na ok. 0,5%." : "."),
          "Nie usuwa różnic między dwiema jesieniami: pola w wielu miejscach ciemnieją, bo gleba i uprawy są inne niż rok wcześniej. Ciemniejszych pól nie traktujemy jako rozbiórek.")}
        ${c.check("wet", "Radar podąża za mokrą pogodą (pasmo C)",
          `Na ${B(f.pc(D.wet.share, 0))} pól i łąk echo Sentinel-1 rośnie w dni, gdy wierzchnia warstwa gleby w regionie jest bardziej wilgotna.`,
          `${B(f.pc(D.wet.share, 0))} komórek otwartego terenu (otwarty teren to ${B(f.pc(D.wet.open, 0))} obszaru); typowe r Spearmana ${B(f.n(D.wet.medR, 2))}; próg r &gt; ${B(f.n(D.rcrit, 3))} dla ${B(f.int(D.wetPasses))} przelotów (dwustronnie p &lt; 0,05, liczymy tylko dodatnie r).`,
          "Przypadkiem przeszłoby ok. 2,5% komórek. " +
          (R.wet ? "Udział zależy od wielkości komórki, a zabudowa reaguje prawie tak samo często, więc to reakcja powierzchni na mokrą pogodę, a nie przepuszczalność gruntu. " : "To reakcja powierzchni na mokrą pogodę, a nie przepuszczalność gruntu. ") +
          "Wilgotność to jedna wartość dla całego obszaru." +
          (R.wet ? " Związek utrzymuje się po usunięciu trendu sezonowego (przegląd zespołu)." : ""))}
        ${c.check("wetflood", "Strefy podtopień w paśmie C",
          "Tam, gdzie woda gruntowa podchodzi wysoko, radar nie reaguje wyraźnie silniej.",
          `${B(f.pc(D.wet.flood, 0))} wewnątrz obszarów zagrożonych podtopieniami PIG-PIB wobec ${B(f.pc(D.wet.out, 0))} poza nimi.`,
          "Radar czuje kilka górnych centymetrów gleby, a nie wody gruntowe.")}
        ${c.check("nisar", `NISAR: HH od ${f.dt(D.dateA)} do ${f.dt(D.dateB)}`,
          "Między tymi datami padało, ale minęły też żniwa, orka i wzrost roślin; wzrost echa pokazuje wszystko naraz.",
          `HH wzrosło o 2 dB lub więcej na ${B(f.pc(D.wd.share, 0))} otwartego terenu; mediana ${B(f.sg(D.wd.med, 1))} dB.`,
          R.wd ? `W samym okresie 12–24 sierpnia (23,5 mm deszczu w ostatnich 3 dniach) taki wzrost był na ok. 15% terenu. Przelot z 19 lipca miał prawie taką samą wilgotność gleby jak 24 sierpnia, a wzrost od 25 czerwca był wtedy znacznie mniejszy, więc większość z tych ${f.pc(D.wd.share, 0)} to sezon i uprawy, a nie deszcz. W wielu miejscach razem z HH rośnie HV, co wskazuje na zmianę roślinności.`
            : "Ile z tego to deszcz, sprawdziliśmy na danych z 14 listopada 2026: większość wzrostu przypadała wtedy na sezon i uprawy. Dla obecnych danych tego nie powtórzono.")}
        ${c.check("nisarflood", "NISAR w strefach podtopień",
          half === null ? NA : D.wd.ratio < 1 ? "Strefy zagrożone podtopieniami jaśniały w tych dwóch miesiącach rzadziej niż reszta otwartego terenu." : "Strefy zagrożone podtopieniami nie jaśniały w tych dwóch miesiącach rzadziej niż reszta otwartego terenu.",
          `${B(f.pc(D.wd.flood, 0))} wewnątrz wobec ${B(f.pc(D.wd.out, 0))} poza nimi` + (half === null ? "." : half ? ", czyli ok. dwa razy rzadziej." : `, stosunek ${B(f.n(D.wd.ratio, 2))}.`),
          R.wd ? "To głównie łąki, gdzie mniej się żnie, i więcej tu drzew; przyczyna nie jest jeszcze znana. Wynik utrzymuje się, gdy sąsiednie komórki losujemy razem."
            : "Przyczyny nie znamy; sprawdzenie odporności wyniku zrobiono dla danych z 14 listopada 2026 i nie powtórzono go dla obecnych danych.")}
        ${c.check("egms", "Ruch gruntu (EGMS)",
          stable ? "Tam, gdzie jest pomiar, grunt w latach 2016–2020 prawie się nie ruszał." : "Wynik pomiaru ruchu gruntu w latach 2016–2020 podajemy obok.",
          `Pomiar na ${B(f.pc(D.eg.share, 0))} obszaru; typowy ruch ${B(f.n(D.eg.med, 0))} mm/rok; ${B(f.int(D.eg.le5))} komórek osiada o 5 mm/rok lub szybciej; najszybciej ${B(f.n(D.eg.min, 0))} mm/rok.`,
          (R.egms ? `EGMS obejmuje 95% zabudowy, ale tylko ok. 15% pozostałego terenu, więc na trzech czwartych obszaru pomiaru nie ma. Wartości są w pełnych milimetrach (95% komórek w granicach ±1 mm/rok). ${f.int(D.eg.le5)} komórek to ok. 50 miejsc; ${f.n(D.eg.min, 0)} mm/rok to jedno miejsce z dwóch komórek na skraju danych, niezweryfikowane. `
            : "Wartości są w pełnych milimetrach, a pomiar obejmuje głównie okolice zabudowy. ") + "Dane kończą się na 2020.")}
        ${c.check("sanity", "Kontrola: klasy terenu wyglądają jak trzeba",
          isNum(D.sa.built) && isNum(D.sa.other) && D.sa.built > D.sa.other ? "Zabudowa jest w VV jaśniejsza od reszty terenu, zgodnie z fizyką podwójnego odbicia." : "Mediany klas terenu podajemy obok.",
          `Mediana VV Sentinel-1: zabudowa ${B(f.n(D.sa.built, 1))} dB, pozostały teren ${B(f.n(D.sa.other, 1))} dB; las w VH ${B(f.n(D.sa.forestVH, 1))} dB.`,
          "„Pozostały teren” obejmuje też las i wodę.")}`;
      } },

      { id: "granice", t: "Czego nie obiecujemy", body: (c) => `
        <ul class="plain">
          <li><b>Nie mierzymy wody w piwnicy ani głębokości wód gruntowych.</b> Radar czuje kilka górnych centymetrów gleby; obszary zagrożone podtopieniami pochodzą z mapy PIG-PIB, nie z radaru.</li>
          <li><b>Nie oceniamy wilgoci na działkach zabudowanych</b>, tylko na otwartym terenie wokół nich.</li>
          <li><b>Nie nazywamy sygnału radaru nowym budynkiem.</b> Ślad nowych ścian to trop do sprawdzenia, nie potwierdzona budowa, a ściany ustawione ukośnie do orbity mogą go nie dawać.</li>
          <li><b>Ciemniejszych pól nie czytamy jako rozbiórek.</b> Na polach to zwykle inna uprawa, orka albo suchsza gleba niż rok wcześniej.</li>
          <li><b>Nie twierdzimy, że warstwa NISAR czerwiec–sierpień pokazuje wsiąkanie deszczu.</b> Miesza deszcz ze żniwami i wzrostem roślin.</li>
          <li><b>Nie podajemy tempa osiadania z NISAR.</b> Korzystamy z natężenia jego echa (GCOV), nie z fazy; ruch gruntu pochodzi z EGMS za lata 2016–2020.</li>
          <li><b>Nie widzimy pojedynczych domów ani materiałów budowlanych:</b> komórka ma w terenie ok. ${B(c.f.int(c.D.cellGround))} m.</li>
          <li><b>Nie mówimy, że NISAR prognozuje.</b> Radar wykrywa, prognozę liczy model zmian terenu.</li>
          <li><b>Dane NISAR to wstępna wersja z pierwszych miesięcy misji, z jednej orbity.</b> Kalibracja może się jeszcze zmienić. Nie mieszamy jej z wersją zatwierdzoną (validated), dostępną od 21 października 2026.</li>
          <li><b>Decyzja to nie plac budowy.</b> Radar widzi ściany i roboty ziemne, nie dokumenty.</li>
        </ul>` },

      { id: "wyzwanie", t: "Odpowiedzi na pytania wyzwania", body: (c) => {
        const f = c.f, D = c.D, b = D.bounds;
        const box = b ? `${f.n(b[0][0], 2)}–${f.n(b[1][0], 2)}°N, ${f.n(b[0][1], 2)}–${f.n(b[1][1], 2)}°E` : DASH;
        return `<dl class="qa">
          <dt>Obszar badań i dlaczego jest nasz</dt>
          <dd>Poznań i gminy wokół niego, razem ${B(f.int(D.munis))} gmin (prostokąt ${box}). To nasze miasto, które rozlewa się na pola i dolinę Warty. Decyzje budowlane użyte w testach obejmują tylko miasto Poznań.</dd>
          <dt>Które polaryzacje pokazują zmiany</dt>
          <dd>Nowe budowy: wzrost VV w Sentinel-1 rok do roku, a ślad nowych ścian to VV rosnące wyraźnie bardziej niż VH. Pola między czerwcem a końcem sierpnia: rośnie HH pasma L (NISAR), w wielu miejscach razem z HV, co wskazuje na zmianę upraw, nie tylko wilgoci. Las od otwartego terenu najlepiej oddziela HV pasma L (${B(f.n(D.dL, 1))} dB wobec ${B(f.n(D.dC, 1))} dB w VH pasma C). Mokra pogoda: VV na ${B(f.pc(D.wet.share, 0))} otwartego terenu.</dd>
          <dt>Fizyczne przyczyny</dt>
          <dd>Podwójne odbicie w narożniku ściana–grunt (budynki); woda, która podnosi stałą dielektryczną gleby (wilgoć przy powierzchni); szorstkość gleby po orce; rozpraszanie objętościowe w roślinach, które znika po żniwach; odbicie lustrzane od spokojnej wody; do tego kąt, pod jakim patrzy radar.</dd>
          <dt>Czego nie widać i dlaczego</dt>
          <dd>Pojedynczych domów (komórka ma w terenie ok. ${B(f.int(D.cellGround))} m). Wód gruntowych i piwnic (radar czuje kilka centymetrów gleby). Osiadania z NISAR (używamy natężenia echa, nie fazy; tempo w milimetrach na rok wymaga lat interferometrii). Części budynków ustawionych ukośnie do orbity (słaby ślad w VV). Zmian w przerwie między ${f.dt(D.gapFrom)} a ${f.dt(D.gapTo)}, kiedy nie było przelotu.</dd>
          <dt>Przyszłe zastosowania NISAR</dt>
          <dd>Nad Poznaniem przelatują cztery orbity NISAR, każda co 12 dni, więc satelita jest tu co kilka dni. Gmina może zobaczyć, gdzie ruszają budowy, także pod chmurami, a mieszkańcy, który grunt jest już nasiąknięty przed ulewą. Pasmo L pokaże wycinkę także pod liśćmi. Pełny rok danych pokaże mokradła i wiosenne wezbrania Warty, a czyste pary przelotów krótko po deszczu oddzielą deszcz od upraw. Po kilku latach interferometria NISAR zmierzy osiadanie budynków i nasypów także tam, gdzie rośnie zieleń.</dd>
        </dl>`;
      } },

      { id: "zrodla", t: "Źródła danych, licencje i uznanie autorstwa", body: (c) => `
        <div class="sources">
        <h3>Dane NASA</h3>
        <ul>
          <li>NISAR GCOV (wspólna misja NASA i ISRO), wersja wstępna, z NASA ASF DAAC (biblioteka earthaccess); obrazy poglądowe przelotów z NASA GIBS.</li>
          <li>NASA POWER (NASA Langley Research Center): wilgotność wierzchniej warstwy gleby (GWETTOP) i opad w dni przelotów Sentinel-1.</li>
          <li>NASA MODIS Terra (MOD11A2, MOD13Q1, kolekcja 6.1; LP DAAC przez Microsoft Planetary Computer).</li>
          <li>Landsat (NASA/USGS), przez JRC GHSL i Global Forest Change.</li>
        </ul>
        <h3>Dane partnerów</h3>
        <ul>
          <li>Copernicus Sentinel-1 RTC (ESA/Copernicus; przetwarzanie Catalyst; Microsoft Planetary Computer) i Copernicus DEM GLO-30.</li>
          <li>EGMS (Copernicus Land Monitoring Service), przez usługę PIG-PIB.</li>
          <li>Mozaiki ALOS-2 PALSAR-2 (JAXA).</li>
          <li>Pogoda i wilgotność gleby w dni przelotów NISAR: ERA5 (Copernicus C3S) przez Open-Meteo.</li>
          <li>JRC GHSL, Hansen/UMD Global Forest Change, IMGW-PIB, GUS BDL, obszary zagrożone podtopieniami PIG-PIB, GEOPOZ (decyzje Wydziału Urbanistyki i Architektury, ortofotomapy), Geoportal GUGiK, OpenStreetMap, OpenFreeMap.</li>
        </ul>
        <h3>Wymagane oznaczenia</h3>
        <ul>
          <li>Zawiera zmodyfikowane dane Copernicus Sentinel (2017–2026).</li>
          <li>Sentinel-1 RTC: przetwarzanie Catalyst, Microsoft Planetary Computer, licencja CC BY 4.0.</li>
          <li>ALOS-2 PALSAR-2: ©JAXA.</li>
          <li>EGMS: © Unia Europejska, Copernicus Land Monitoring Service, Europejska Agencja Środowiska (EEA).</li>
          <li>Copernicus DEM GLO-30: © DLR e.V. 2010–2014 i © Airbus Defence and Space GmbH 2014–2018, udostępnione w ramach programu COPERNICUS przez Unię Europejską i ESA.</li>
          <li>Weather data by Open-Meteo.com (ERA5, Copernicus Climate Change Service), licencja CC BY 4.0.</li>
          <li>Dane NASA POWER pochodzą z projektu POWER NASA Langley Research Center (LaRC), finansowanego z programu NASA Earth Science/Applied Science.</li>
          <li>Mapa podkładowa: © współtwórcy OpenStreetMap (ODbL), OpenFreeMap.</li>
        </ul>
        </div>` },

      { id: "si", t: "Użycie narzędzi SI", body: (c) => `
        <div class="plain"><p>Zespół użył Claude (asystenta SI) do napisania potoku danych i aplikacji oraz do szkiców tekstów, w tym tej strony. Liczby w aplikacji i na tej stronie liczą skrypty zespołu z wymienionych wyżej źródeł.</p></div>` },
    ],
  };

  /* ---------------- English ---------------- */
  TXT.en = {
    title: "About the project · SARnik",
    h1: "About SARnik",
    sub: "NASA Space Apps Challenge 2026 · Dancing with the SARs · team SpaceWalkers, Poznań",
    back: "Back to the app",
    langGroup: "Language",
    themeToDark: "Switch to dark theme", themeToLight: "Switch to light theme",
    loading: "Loading numbers from the app's data…",
    ok: "Numbers in bold are read live from the app's data files (data/land/sar.json and land.json). A few figures from the team's review and from the NISAR pass list (ERA5) are fixed text.",
    fail: "The app's data files could not be loaded, so the numbers are unavailable (shown as “—”). The text below still applies.",
    partial: (f) => `The file ${f} could not be loaded; missing numbers are shown as “—”. The rest of the page is up to date.`,
    howto: "Each section starts in plain language. Open “Details” for the method, the numbers behind it and the caveats.",
    toc: "Contents",
    details: "Details",
    mean: "What it means", result: "Result", caveat: "Caveat",
    nasa: "NASA data", partner: "Partner data", both: "NASA and partner data",
    foot: "SARnik · NASA Space Apps Challenge 2026 · SpaceWalkers",
    sec: [
      { id: "czym", t: "What SARnik is", body: (c) => `
        <div class="plain"><p>SARnik is a radar check-up for a piece of land around Poznań: search an address or draw a plot, and the app shows what satellite radar (NISAR and Sentinel-1) sees there in 2026, whether the ground moves, and how the area has been built up. It is a first look before buying land, not a replacement for a site visit or a soil survey.</p></div>
        <a class="applink" href="index.html">Open the app</a>` },

      { id: "radar", t: "Why radar and not a photo", body: (c) => `
        <div class="plain"><p>A camera needs daylight and a clear sky, and it sees colour. Radar sends its own microwave pulse and records the echo, so it works at night and through clouds. The echo depends on things a photo cannot show: the shape and roughness of the surface and how much water it holds. That is why radar can notice new walls, freshly tilled soil or wet topsoil on every pass, whatever the weather.</p></div>
        ${c.more("radar", `<p>Brightness also depends on the angle the radar looks from and on its wavelength compared with the size of what it hits. So for the 2026 products we compare only passes from the same orbit, with the same geometry: Sentinel-1 relative orbit ${B(c.f.int(c.D.s1orbit))} and NISAR track ${B(c.f.int(c.D.track))}. The values are gamma-0 backscatter; linear power is averaged before conversion to dB.</p>`)}` },

      { id: "polaryzacje", t: "Which polarisation shows what", body: (c) => `
        <div class="plain"><p>A radar pulse is sent with its wave vibrating in one direction, horizontal (H) or vertical (V), and the echo is recorded in both. VV and HH mean it came back the way it left; VH and HV mean it came back turned. How the surface sends the pulse back decides which of them lights up.</p></div>
        <div class="figs">
          <figure>${FIG.surface}<figcaption><b>Mirror reflection</b>Calm water and smooth asphalt reflect the pulse away from the satellite, so they look dark in every polarisation. Rough soil sends more back.</figcaption></figure>
          <figure>${FIG.double}<figcaption><b>Double bounce</b>A wall and the ground form a corner that sends the pulse straight back. This lights up VV and HH most, usually HH.</figcaption></figure>
          <figure>${FIG.volume}<figcaption><b>Volume scattering</b>In leaves, stalks and branches the pulse bounces many times and turns. This adds signal in VH and HV: cross-pol is weaker than co-pol everywhere, but vegetation raises it the most.</figcaption></figure>
        </div>
        <div class="tw"><table>
          <thead><tr><th scope="col">What we see</th><th scope="col">Why</th><th scope="col">Stands out most in</th></tr></thead>
          <tbody>
            <tr><td>Calm water, smooth asphalt (dark)</td><td>mirror reflection away from the satellite</td><td>none: dark in all</td></tr>
            <tr><td>Buildings</td><td>wall–ground corner: double bounce</td><td>VV, HH (walls at an angle to the track: also VH, HV)</td></tr>
            <tr><td>Wet soil</td><td>water raises the soil's dielectric constant</td><td>VV, HH</td></tr>
            <tr><td>Ploughed, rough soil</td><td>a rough surface sends more back</td><td>VV, HH</td></tr>
            <tr><td>Forest, crops</td><td>volume scattering</td><td>VH, HV</td></tr>
          </tbody></table></div>
        ${c.more("polaryzacje", `<ul>
          <li><b>VH and HV are not a vegetation-only signal.</b> A building whose walls are rotated against the satellite's track (by more than about 20–30°) returns less VV and HH and more VH and HV.${c.D.vhBuiltOverForest ? ` In our Sentinel-1 medians built-up land is brighter in VH (${B(c.f.n(c.D.bd("built", "VH"), 1))} dB) than forest (${B(c.f.n(c.D.bd("forest", "VH"), 1))} dB).` : ""} Our new-wall test (VV rising at least ${B(c.f.n(c.D.wallDb, 1))} dB more than VH) therefore misses some rotated buildings.</li>
          <li><b>Dark means calm, open water.</b> A wind-roughened lake can be brighter in C-band VV, and a flooded meadow with grass or reeds standing out of the water can be bright, because water and stems form a corner too, especially in L-band. Our water rule (VV below ${B(c.f.n(c.D.waterDb, 0))} dB) marks calm open water only.</li>
          <li><b>Moisture is seen only near the surface.</b> Both bands sense the top few centimetres of moist soil (about 1–2 cm in C-band, about 5 cm in L-band), so neither reaches groundwater.</li>
          <li>For a wall–ground corner HH is usually stronger than VV, because vertically polarised waves reflect more weakly off ground and wall.</li>
        </ul>`)}` },

      { id: "pasma", t: "L-band next to C-band", body: (c) => `
        <div class="plain"><p>Sentinel-1 uses C-band, a 5.6 cm wave. It is scattered mostly in the upper part of tree crowns, but through grass and low crops it still reaches the soil. NISAR and ALOS-2 use L-band, a 24 cm wave, which goes further into vegetation, down to branches, trunks and the soil beneath. So L-band tells forest from open land more clearly: over our area forest is ${B(c.f.n(c.D.dL, 1))} dB brighter than open land in L-band HV, and ${B(c.f.n(c.D.dC, 1))} dB in C-band VH.</p></div>
        <div class="tw"><table>
          <caption>Class medians over the study area, dB (NISAR 2026, track ${c.f.int(c.D.track)}; Sentinel-1 2026, orbit ${c.f.int(c.D.s1orbit)})</caption>
          <thead><tr><th scope="col">Land</th><th scope="col" class="r">L: HH</th><th scope="col" class="r">L: HV</th><th scope="col" class="r">C: VV</th><th scope="col" class="r">C: VH</th></tr></thead>
          <tbody>${[["built", "Built-up"], ["forest", "Forest"], ["open", "Open land"]].map(([k, name]) =>
            `<tr><th scope="row">${name}</th>${["HH", "HV", "VV", "VH"].map((p) => `<td class="r">${c.f.n(c.D.bd(k, p), 1)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>
        ${c.more("pasma", `<ul>
          <li>Compare contrasts within one satellite, not raw values between satellites: NISAR is a provisional release, and the two satellites look from different angles.</li>
          <li>${c.D.REV.wd ? "NISAR 2026 is brighter than the ALOS-2 2021 mosaic by about 1.3–2.5 dB over forest and buildings and 4–6.5 dB over fields (calibration, season, crops and viewing angle)." : "NISAR 2026 and the ALOS-2 mosaics differ in brightness (calibration, season, crops and viewing angle)."} That is why the app's L-band time line stretches the colours of each sensor separately: compare land classes, not brightness.</li>
          <li>Classes: built-up means cells with at least ${B(c.f.pc(c.D.thr, 0))} built-up area in 2020; forest means cells more than 78% forested in 2000; open land means cells with less building, under 30% forest, and dark like water on no more than 20% of passes.</li>
          <li>NISAR: 20 m pixels, ${B(c.f.int(c.D.nn))} passes. ALOS-2: yearly 25 m mosaics for ${B(String(c.D.alosFirst ?? DASH))}–${B(String(c.D.alosLast ?? DASH))}, built from scenes of different dates, in the same band and polarisations as NISAR.</li>
        </ul>`)}` },

      { id: "produkty", t: "What the app computes", body: (c) => {
        const f = c.f, D = c.D;
        return `
        <div class="plain"><p>Every map view and every number comes from one of the products below. Each names its data and whether the data are NASA's or a partner's. All of them sit on one grid of ${B(f.int(D.cellM))} m cells (in the Web Mercator projection; about ${B(f.int(D.cellGround))} m on the ground at Poznań).</p></div>
        <h3>Radar picture 2026</h3>
        <p>Median of ${B(f.int(D.s1n))} Sentinel-1 passes of relative orbit ${B(f.int(D.s1orbit))} (ascending), ${f.dt(D.s1first)} – ${f.dt(D.s1last, true)}, in three colours: red is VV, green VH, blue VV/VH.</p>
        ${c.src("partner", "Sentinel-1 RTC (ESA/Copernicus), processed by Catalyst, served by Microsoft Planetary Computer.")}
        <h3>Change in a year</h3>
        <p>Median VV of ${B(f.int(D.nowN))} passes in autumn 2026 (${f.dt(D.nowFirst)} – ${f.dt(D.nowLast)}) minus the median of ${B(f.int(D.befN))} passes in autumn 2025 (${f.dt(D.befFirst)} – ${f.dt(D.befLast)}), same orbit. VV rose by at least 3 dB on ${B(f.int(D.upHa))} ha, for any reason, fields included. Comparing autumn with autumn removes most of the farming season, but not year-to-year differences in soil moisture and crops: on a field, a darker cell usually means a different crop, tillage or drier soil than a year earlier, not demolition.</p>
        ${c.src("partner", "Sentinel-1 RTC (ESA/Copernicus).")}
        <h3>New-wall signature</h3>
        <p>Cells where VV rose by at least 3 dB and by at least ${B(f.n(D.wallDb, 1))} dB more than VH, the pattern a new wall–ground corner gives: ${B(f.int(D.wallsHa))} ha in all. This is an upper bound, not confirmed buildings: ${D.REV.walls ? "about a third lies on land already built in 2020, " : ""}the city's decisions do not yet confirm the signature (section 6), and walls set at an angle to the track may not show it. On river and pond banks a change in water level can give a similar signal.</p>
        ${c.src("partner", "Sentinel-1 RTC (ESA/Copernicus), VV and VH.")}
        <h3>Water seen by radar</h3>
        <p>Share of passes in which a cell is darker than ${B(f.n(D.waterDb, 0))} dB in VV: calm open water.</p>
        ${c.src("partner", "Sentinel-1 RTC (ESA/Copernicus).")}
        <h3>Response to wet weather</h3>
        <p>Open land only (no buildings, forest or water). Spearman rank correlation between VV and NASA POWER topsoil wetness (GWETTOP) across ${B(f.int(D.wetPasses))} passes; cells with r above ${B(f.n(D.rcrit, 3))} are shown. GWETTOP is one value for the whole area (a MERRA-2 grid cell about 50 km across), so the test asks whether a cell follows the region's wet and dry spells. It shows where radar sees surface moisture change; it does not measure how fast water soaks in or drains away.</p>
        ${c.src("both", "Sentinel-1 RTC (ESA/Copernicus) and NASA POWER (NASA Langley Research Center).")}
        <h3>NISAR L-band 2026</h3>
        <p>${B(f.int(D.nn))} NISAR GCOV passes of the ${D.version || DASH} release, track ${B(f.int(D.track))} (ascending), ${f.dt(D.nFirst)} – ${f.dt(D.nLast, true)}, HH and HV with 20 m pixels. From each HDF5 file we read only the Poznań window (range requests) and average the power in our cells. The median is the last step of the app's L-band time line.</p>
        ${c.src("nasa", "NISAR (a joint NASA and ISRO mission), GCOV product from NASA ASF DAAC.")}
        <h3>NISAR change from ${f.dt(D.dateA)} to ${f.dt(D.dateB)}</h3>
        <p>HH on ${f.dt(D.dateB)} minus HH on ${f.dt(D.dateA, true)}, on open land. Between these dates it rained (ERA5 soil moisture at 0–7 cm rose from 0.09 to 0.30 m³/m³; 23.5 mm of rain in 3 days), but two months of harvest, tillage and crop growth also passed. The layer shows both and cannot separate them.</p>
        ${c.src("nasa", "NISAR GCOV. Weather context (partner data): ERA5 (Copernicus C3S) via Open-Meteo.")}
        <h3>Ground motion</h3>
        <p>Vertical ground motion 2016–2020 from the European Ground Motion Service (EGMS, Copernicus; Sentinel-1 interferometry), via the PIG-PIB service, in whole millimetres per year.</p>
        ${c.src("partner", "EGMS (Copernicus Land Monitoring Service), via PIG-PIB.")}
        <h3>L-band history</h3>
        <p>ALOS-2 PALSAR-2 yearly mosaics ${B(String(D.alosFirst ?? DASH))}–${B(String(D.alosLast ?? DASH))}: HH, HV and their ratio, the same band and polarisations as NISAR.</p>
        ${c.src("partner", "JAXA, via Microsoft Planetary Computer.")}
        <h3>Sentinel-1 summer pictures 2017, 2020, 2024 and ground activity 2017→2024</h3>
        <p>The “Sentinel-1, summer median” and “Ground activity, radar 2017–2024” layers: median VV of up to 14 ascending passes from June–August of each year, from mixed relative orbits. They are a picture of change, not a same-orbit comparison; dB differences between years may partly come from different geometry.</p>
        ${c.src("partner", "Sentinel-1 RTC (ESA/Copernicus), via Microsoft Planetary Computer.")}
        <h3>Pictures of all NISAR passes</h3>
        <p>The map's NISAR passes view shows NASA GIBS browse pictures from all four tracks and both releases (${B(f.int(D.nisarAll))} dates). It is a picture only: no number in the app or on this page uses it.</p>
        ${c.src("nasa", "NASA GIBS (NISAR GCOV).")}
        <h3>Background without radar</h3>
        <p>Built-up land 1975–2020 (JRC GHSL, from Landsat and, in later years, Sentinel-2) and a building projection to 2035 (model trained on ${D.trainedSpan || "2005–2015"}, tested on ${(D.tested || "2015-2020").replace("-", "–")}); tree loss (Hansen/UMD Global Forest Change, from Landsat); summer heat (NASA MODIS Terra); hollows (Copernicus DEM, a surface model from the TanDEM-X radar that includes trees and buildings); groundwater-flood areas (PIG-PIB); flat prices and wages (GUS BDL).</p>
        ${c.src("both", "Landsat (NASA/USGS) and NASA MODIS; from partners JRC, UMD, Copernicus, PIG-PIB and GUS.")}
        ${c.more("produkty", `<ul>
          <li>Sentinel-1 is read from the product's 80 m overview, not at its full 10 m resolution, and averaged onto the cell grid. NISAR power from its 20 m pixels is averaged directly.</li>
          <li>The app's place cards count cells from the rounded map layers, while totals such as ${B(f.int(D.upHa))} ha come from the unrounded values${D.REV.walls ? "; the difference is about 3%" : ", so they can differ slightly"}.</li>
          <li>The soil moisture of 0.09 and 0.30 m³/m³ and the rain are ERA5 daily values for the pass day (Open-Meteo). The ${f.dt(D.dateB)} pass was at about 05:39 local time, so some of that day's rain may have fallen after it. This is a different quantity from NASA POWER GWETTOP, which is about 0.31–0.43 in both periods.</li>
          <li>NISAR passes: usually every ${B(f.int(D.step))} days, with one gap of ${B(f.int(D.gap))} days (no pass between ${f.dt(D.gapFrom)} and ${f.dt(D.gapTo)}). The two files of 5 September are two processings of the same acquisition; the pipeline averages them instead of keeping the newer one (negligible effect; that date enters no check).</li>
        </ul>`)}`;
      } },

      { id: "dowody", t: "The evidence", body: (c) => {
        const f = c.f, D = c.D, R = D.REV;
        const NA = "The result is given alongside when the data load.";
        const wuMore = !isNum(D.wu.ratio) ? null : D.wu.ratio > 1;
        const wwSig = !isNum(D.ww.p) ? null : D.ww.p < 0.05;
        const half = !isNum(D.wd.ratio) ? null : D.wd.ratio >= 0.4 && D.wd.ratio <= 0.6;
        const stable = isNum(D.eg.med) && Math.abs(D.eg.med) <= 1;
        return `
        <div class="plain"><p>We checked against independent data whether the radar signals mean what we say. For each check: what it means in plain words, the result from the app's data, and its caveat. A check whose number does not hold up is described without the number, with the reason.</p></div>
        ${c.check("wuia", "Strong brightening on plots with a new-building decision",
          wuMore === null ? NA : wuMore ? "Where the city decided a new-building case in June–August 2026, radar sees a strong rise in the echo more often than in the rest of Poznań." : "On plots with a new-building decision radar does not see strong rises in the echo more often than in the rest of Poznań.",
          `${B(f.int(D.wu.hits))} of ${B(f.int(D.wu.cells))} cells (${B(f.pc(D.wu.a, 2))}) against ${B(f.pc(D.wu.b, 2))} in the rest of the city, about ${B(f.n(D.wu.ratio, 1))} times as common. We count VV rising by at least 3 dB year on year (Sentinel-1).`,
          "“New-building decisions” are not only building permits: they also include notifications with a design, zoning decisions and location decisions for public investment. " +
          (R.wuia ? "The hits come from 8 decisions (9 separate clusters of cells), including three amendments of earlier permits and two utility networks. Resampling neighbouring cells together (blocks of about 0.6 km), the 95% interval of the ratio is about 1.7–7. " : "The site-level review was done on the data of 14 Nov 2026 and has not been repeated for the current data. ") +
          "Neighbouring cells are not independent, so we give no p-value.")}
        ${c.check("walls", "The new-wall signature alone on the same plots",
          wwSig === null ? NA : wwSig ? "The stricter double-bounce signature is also more common on plots with a new-building decision, but this result is borderline." : "The stricter double-bounce signature is not yet confirmed by the city's decisions.",
          `${B(f.int(D.ww.hits))} of ${B(f.int(D.ww.cells))} cells (${B(f.pc(D.ww.a, 2))}) against ${B(f.pc(D.ww.b, 2))}, ratio ${B(f.n(D.ww.ratio, 1))}` + (wwSig === false ? `, p = ${B(f.n(D.ww.p, 2))}: not significant.` : "."),
          `With ${f.int(D.ww.hits)} hits the test has little power.` + (R.ww ? " Resampling neighbouring cells together, the interval is about 1.2–6.4 for 0.6 km blocks but 0.7–7.1 for 1.2 km blocks." : "") + " The signature may still be useful, but we do not call it “new buildings”.")}
        ${c.check("model", "Projection meets radar",
          R.model ? "Radar sees change more often where the projection expects building, but mostly at the edge of existing estates: 90% of those places lie within 150 m of buildings." : "Comparing the projection with radar does not show that the model adds skill.",
          R.model ? `<span class="nonum">We do not quote the ratio.</span> Comparing only places at the same distance from buildings, the projection has only a small edge, clear only for the new-wall signature. So this check mainly shows that change happens at the edge of estates.`
            : `<span class="nonum">We do not quote the ratio.</span> The review of this check was done on the data of 14 Nov 2026 and has not been repeated for the current data.`,
          `We tested the model on its own: on land open in 2015 it beats a simple nearby-buildings rule (AUC ${B(f.n(D.auc, 2))} against ${B(f.n(D.aucBase, 2))}), but from only ${B(f.int(D.conv))} conversions in 2015–2020.`)}
        ${c.check("season", "Year on year instead of the season",
          "Comparing autumn with autumn removes most false alarms from field work.",
          `A June→November difference would flag a rise of 3 dB or more on ${B(f.pc(D.season, 1))} of land not built in 2025` + (R.season ? "; comparing autumn with autumn flags about 0.5%." : "."),
          "It does not remove differences between the two autumns: fields darken in many places, because soil and crops differ from a year earlier. We do not treat darker fields as demolition.")}
        ${c.check("wet", "Radar follows wet weather (C-band)",
          `On ${B(f.pc(D.wet.share, 0))} of fields and meadows the Sentinel-1 echo rises on days when the region's topsoil is wetter.`,
          `${B(f.pc(D.wet.share, 0))} of open-land cells (open land is ${B(f.pc(D.wet.open, 0))} of the area); typical Spearman r ${B(f.n(D.wet.medR, 2))}; cutoff r &gt; ${B(f.n(D.rcrit, 3))} for ${B(f.int(D.wetPasses))} passes (two-sided p &lt; 0.05, positive r only).`,
          "About 2.5% of cells would pass by chance. " +
          (R.wet ? "The share depends on cell size, and built-up land reacts almost as often, so this is the surface's response to wet weather, not how well the soil drains. " : "This is the surface's response to wet weather, not how well the soil drains. ") +
          "Wetness is one value for the whole area." +
          (R.wet ? " The link holds after removing the seasonal trend (team review)." : ""))}
        ${c.check("wetflood", "Groundwater-flood areas in C-band",
          "Where groundwater comes close to the surface, radar does not react clearly more strongly.",
          `${B(f.pc(D.wet.flood, 0))} inside PIG-PIB groundwater-flood areas against ${B(f.pc(D.wet.out, 0))} outside.`,
          "Radar senses the top few centimetres of soil, not groundwater.")}
        ${c.check("nisar", `NISAR: HH from ${f.dt(D.dateA)} to ${f.dt(D.dateB)}`,
          "Between these dates it rained, but harvest, tillage and crop growth also happened; the rise in the echo shows all of them at once.",
          `HH rose by 2 dB or more on ${B(f.pc(D.wd.share, 0))} of open land; median ${B(f.sg(D.wd.med, 1))} dB.`,
          R.wd ? `Between 12 and 24 August alone (23.5 mm of rain in the last 3 days) such a rise covered about 15% of the land. The 19 July pass had almost the same soil moisture as 24 August, yet its rise from 25 June was much smaller, so most of the ${f.pc(D.wd.share, 0)} is season and crops, not rain. In many places HV rises together with HH, which points to vegetation change.`
            : "How much of this is rain was checked on the data of 14 Nov 2026: most of the rise was then due to season and crops. It has not been repeated for the current data.")}
        ${c.check("nisarflood", "NISAR in groundwater-flood areas",
          half === null ? NA : D.wd.ratio < 1 ? "Groundwater-flood areas brightened less often over these two months than other open land." : "Groundwater-flood areas did not brighten less often over these two months than other open land.",
          `${B(f.pc(D.wd.flood, 0))} inside against ${B(f.pc(D.wd.out, 0))} outside` + (half === null ? "." : half ? ", about half as often." : `, ratio ${B(f.n(D.wd.ratio, 2))}.`),
          R.wd ? "These areas are mostly meadows with little harvest and more trees; the cause is not yet known. The result holds when neighbouring cells are resampled together."
            : "The cause is not known; the robustness check was done on the data of 14 Nov 2026 and has not been repeated for the current data.")}
        ${c.check("egms", "Ground motion (EGMS)",
          stable ? "Where it is measured, the ground barely moved in 2016–2020." : "The measured ground motion for 2016–2020 is given alongside.",
          `Measured on ${B(f.pc(D.eg.share, 0))} of the area; typical motion ${B(f.n(D.eg.med, 0))} mm/year; ${B(f.int(D.eg.le5))} cells sink by 5 mm/year or faster; the fastest ${B(f.n(D.eg.min, 0))} mm/year.`,
          (R.egms ? `EGMS covers 95% of built-up land but only about 15% of the rest, so three quarters of the area has no measurement. Values come in whole millimetres (95% of cells within ±1 mm/year). The ${f.int(D.eg.le5)} cells form about 50 places; ${f.n(D.eg.min, 0)} mm/year is one spot of two cells at the edge of the data, not verified. `
            : "Values come in whole millimetres, and the measurements lie mostly in and around built-up areas. ") + "The data end in 2020.")}
        ${c.check("sanity", "Sanity check: land classes look right",
          isNum(D.sa.built) && isNum(D.sa.other) && D.sa.built > D.sa.other ? "Built-up land is brighter in VV than the rest, as double-bounce physics expects." : "The class medians are given alongside.",
          `Median Sentinel-1 VV: built-up ${B(f.n(D.sa.built, 1))} dB, other land ${B(f.n(D.sa.other, 1))} dB; forest VH ${B(f.n(D.sa.forestVH, 1))} dB.`,
          "“Other land” includes forest and water.")}`;
      } },

      { id: "granice", t: "What we do not promise", body: (c) => `
        <ul class="plain">
          <li><b>We do not measure water in basements or the depth of groundwater.</b> Radar senses the top few centimetres of soil; the groundwater-flood areas come from the PIG-PIB map, not from radar.</li>
          <li><b>We do not judge moisture on built plots</b>, only on the open land around them.</li>
          <li><b>We do not call a radar signal a new building.</b> The new-wall signature is a lead to check, not a confirmed building, and walls at an angle to the track may not show it.</li>
          <li><b>We do not read darker fields as demolition.</b> On fields they usually mean a different crop, tillage or drier soil than a year earlier.</li>
          <li><b>We do not claim the NISAR June–August layer shows rain soaking in.</b> It mixes rain with harvest and crop growth.</li>
          <li><b>We do not give a subsidence rate from NISAR.</b> We use the strength of its echo (GCOV), not its phase; ground motion comes from EGMS for 2016–2020.</li>
          <li><b>We do not see single houses or building materials:</b> a cell is about ${B(c.f.int(c.D.cellGround))} m across on the ground.</li>
          <li><b>We do not say NISAR forecasts.</b> Radar detects; the land-change model makes the projection.</li>
          <li><b>NISAR data are a provisional release from the mission's first months, from one track.</b> Calibration may still change. We do not mix it with the validated release, available from 21 October 2026.</li>
          <li><b>A decision is not a building site.</b> Radar sees walls and earthworks, not paperwork.</li>
        </ul>` },

      { id: "wyzwanie", t: "Answers to the challenge's questions", body: (c) => {
        const f = c.f, D = c.D, b = D.bounds;
        const box = b ? `${f.n(b[0][0], 2)}–${f.n(b[1][0], 2)}°N, ${f.n(b[0][1], 2)}–${f.n(b[1][1], 2)}°E` : DASH;
        return `<dl class="qa">
          <dt>Study area, and why it is ours</dt>
          <dd>Poznań and the municipalities around it, ${B(f.int(D.munis))} municipalities in all (box ${box}). It is our city, spreading onto fields and the Warta valley. The building decisions used in the checks cover the city of Poznań only.</dd>
          <dt>Which polarisations show the changes</dt>
          <dd>New building: Sentinel-1 VV rising year on year, and the new-wall signature is VV rising clearly more than VH. Fields between June and late August: L-band HH rises (NISAR), in many places together with HV, which points to crop change, not only moisture. Forest is best told from open land by L-band HV (${B(f.n(D.dL, 1))} dB against ${B(f.n(D.dC, 1))} dB in C-band VH). Wet weather: VV on ${B(f.pc(D.wet.share, 0))} of open land.</dd>
          <dt>The physical drivers</dt>
          <dd>Double bounce in the wall–ground corner (buildings); water raising the soil's dielectric constant (moisture near the surface); soil roughness after ploughing; volume scattering in plants, which disappears at harvest; mirror reflection off calm water; and the angle the radar looks from.</dd>
          <dt>What cannot be seen, and why</dt>
          <dd>Single houses (a cell is about ${B(f.int(D.cellGround))} m on the ground). Groundwater and basements (radar senses a few centimetres of soil). Subsidence from NISAR (we use the strength of the echo, not its phase; rates in millimetres per year need years of interferometry). Some buildings set at an angle to the track (weak VV signature). Changes in the gap between ${f.dt(D.gapFrom)} and ${f.dt(D.gapTo)}, when there was no pass.</dd>
          <dt>Future uses of NISAR</dt>
          <dd>Four NISAR tracks cross Poznań, each repeating every 12 days, so the satellite is overhead every few days. A municipality can see where building starts, even under clouds, and residents can see which ground is already waterlogged before a storm. L-band will show tree felling even under leaves. A full year of data will show wetlands and the Warta's spring high water, and clean pairs of passes shortly after rain will separate rain from crops. After a few years, NISAR interferometry will measure how buildings and embankments settle, also where vegetation grows.</dd>
        </dl>`;
      } },

      { id: "zrodla", t: "Data sources, licences and attribution", body: (c) => `
        <div class="sources">
        <h3>NASA data</h3>
        <ul>
          <li>NISAR GCOV (a joint NASA and ISRO mission), provisional release, from NASA ASF DAAC (earthaccess library); browse pictures of the passes from NASA GIBS.</li>
          <li>NASA POWER (NASA Langley Research Center): topsoil wetness (GWETTOP) and rain on Sentinel-1 pass days.</li>
          <li>NASA MODIS Terra (MOD11A2, MOD13Q1, Collection 6.1; LP DAAC via Microsoft Planetary Computer).</li>
          <li>Landsat (NASA/USGS), via JRC GHSL and Global Forest Change.</li>
        </ul>
        <h3>Partner data</h3>
        <ul>
          <li>Copernicus Sentinel-1 RTC (ESA/Copernicus; processing by Catalyst; Microsoft Planetary Computer) and Copernicus DEM GLO-30.</li>
          <li>EGMS (Copernicus Land Monitoring Service), via the PIG-PIB service.</li>
          <li>ALOS-2 PALSAR-2 mosaics (JAXA).</li>
          <li>Weather and soil moisture on NISAR pass days: ERA5 (Copernicus C3S) via Open-Meteo.</li>
          <li>JRC GHSL, Hansen/UMD Global Forest Change, IMGW-PIB, GUS BDL, PIG-PIB groundwater-flood areas, GEOPOZ (Poznań planning decisions, orthophotos), GUGiK Geoportal, OpenStreetMap, OpenFreeMap.</li>
        </ul>
        <h3>Required notices</h3>
        <ul>
          <li>Contains modified Copernicus Sentinel data (2017–2026).</li>
          <li>Sentinel-1 RTC: processing by Catalyst, Microsoft Planetary Computer, licence CC BY 4.0.</li>
          <li>ALOS-2 PALSAR-2: ©JAXA.</li>
          <li>EGMS: © European Union, Copernicus Land Monitoring Service, European Environment Agency (EEA).</li>
          <li>Copernicus DEM GLO-30: © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA; all rights reserved.</li>
          <li>Weather data by Open-Meteo.com (ERA5, Copernicus Climate Change Service), licence CC BY 4.0.</li>
          <li>NASA POWER data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program.</li>
          <li>Base map: © OpenStreetMap contributors (ODbL), OpenFreeMap.</li>
        </ul>
        </div>` },

      { id: "si", t: "Use of AI tools", body: (c) => `
        <div class="plain"><p>The team used Claude (an AI assistant) to write the data pipeline and the app and to draft text, including this page. The numbers in the app and on this page are computed by the team's scripts from the sources above.</p></div>` },
    ],
  };

  /* ================= rendering ================= */
  const $ = (s) => document.querySelector(s);

  function context(lg) {
    const L = TXT[lg], f = fmt(lg), D = collect();
    return {
      f, D, L,
      more: (k, html) => `<details class="more" data-k="${k}"><summary>${L.details}</summary><div class="in">${html}</div></details>`,
      src: (kind, text) => `<p class="src"><b>${L[kind]}:</b> ${text}</p>`,
      check: (k, t, m, r, cav) => `<div class="check" id="chk-${k}"><h3>${t}</h3><dl>
        <dt>${L.mean}</dt><dd>${m}</dd><dt>${L.result}</dt><dd class="result">${r}</dd><dt>${L.caveat}</dt><dd>${cav}</dd></dl></div>`,
    };
  }

  function render() {
    const page = $("#page");
    if (!page) return;
    const L = TXT[lang];
    const open = new Set([...document.querySelectorAll("details.more[open]")].map((d) => d.dataset.k));
    const c = context(lang);
    const status = loadState === "loading" ? L.loading : loadState === "ok" ? L.ok : loadState === "fail" ? L.fail : L.partial(failed.join(", "));
    const secs = L.sec.map((s, i) => {
      let body;
      try { body = s.body(c); } catch (e) { body = `<p class="status fail">${L.fail}</p>`; }
      return `<section class="sec" id="${s.id}" aria-labelledby="h-${s.id}"><h2 id="h-${s.id}"><span class="n">${i + 1}</span><span>${s.t}</span></h2>${body}</section>`;
    }).join("");
    page.innerHTML = `
      <div class="hero"><h1>${L.h1}</h1><p class="sub">${L.sub}</p>
        <p class="status${loadState === "fail" || loadState === "partial" ? " fail" : ""}" role="status">${status}</p>
        <p class="howto">${L.howto}</p></div>
      <nav class="toc" aria-labelledby="toc-h"><h2 id="toc-h">${L.toc}</h2><ol>${L.sec.map((s) => `<li><a href="#${s.id}">${s.t}</a></li>`).join("")}</ol></nav>
      ${secs}
      <p class="foot">${L.foot} · <a href="index.html">${L.back}</a></p>`;
    page.querySelectorAll("details.more").forEach((d) => { if (open.has(d.dataset.k)) d.open = true; });
    document.documentElement.lang = lang;
    document.title = L.title;
    const lg = $("#lang-group"); if (lg) lg.setAttribute("aria-label", L.langGroup);
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    const bl = $("#back-link"); if (bl) { bl.setAttribute("title", L.back); bl.setAttribute("aria-label", "SARnik: " + L.back); }
    themeLabel();
  }

  /* ---------- theme: the app's data-theme attribute and its storage key ---------- */
  const isDark = () => {
    const a = document.documentElement.getAttribute("data-theme");
    if (a === "dark") return true;
    if (a === "light") return false;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  };
  function themeLabel() {
    const b = $("#theme-btn"); if (!b) return;
    const t = isDark() ? TXT[lang].themeToLight : TXT[lang].themeToDark;
    b.setAttribute("aria-label", t); b.title = t;
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", isDark() ? "#1A1D20" : "#F1F0EB");
  }

  function wire() {
    document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.lang !== "pl" && b.dataset.lang !== "en") return;
      lang = b.dataset.lang;
      store.set(LANG_KEY, lang);
      render();
    }));
    const tb = $("#theme-btn");
    if (tb) tb.addEventListener("click", () => {
      const mode = isDark() ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", mode);
      store.set(THEME_KEY, mode);
      themeLabel();
    });
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) mq.addEventListener("change", themeLabel);
    }
    // another tab of the app changed language or theme
    window.addEventListener("storage", (e) => {
      if (e.key === LANG_KEY && (e.newValue === "pl" || e.newValue === "en") && e.newValue !== lang) { lang = e.newValue; render(); }
      if (e.key === THEME_KEY && (e.newValue === "light" || e.newValue === "dark")) { document.documentElement.setAttribute("data-theme", e.newValue); themeLabel(); }
    });
  }

  async function getJSON(url) {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error(url + ": HTTP " + r.status);
    const j = await r.json();
    if (!j || typeof j !== "object") throw new Error(url + ": not an object");
    return j;
  }

  function load() {
    Promise.allSettled([getJSON("data/land/sar.json"), getJSON("data/land/land.json")]).then(([a, b]) => {
      if (a.status === "fulfilled") sar = a.value; else failed.push("data/land/sar.json");
      if (b.status === "fulfilled") land = b.value; else failed.push("data/land/land.json");
      loadState = failed.length === 0 ? "ok" : failed.length === 2 ? "fail" : "partial";
      render();
    });
  }

  function start() {
    wire();
    render();
    if (typeof fetch !== "function" || typeof Promise.allSettled !== "function") { failed.push("data/land/sar.json", "data/land/land.json"); loadState = "fail"; render(); return; }
    load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
