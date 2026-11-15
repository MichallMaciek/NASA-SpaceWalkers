/* SARnik (v2): texts for the radar part. Numbers are passed in from data/land/sar.json, never typed here. */
(() => {
  const SAT = '<g class="rh-sat"><rect x="168" y="8" width="16" height="9" rx="2"/><path d="M160 12.5h8M184 12.5h8"/></g>';
  const FIG = {
    surface: `<svg viewBox="0 0 200 120" aria-hidden="true">${SAT}
      <path class="rh-ray" d="M170 20L100 96"/><path class="rh-ray rh-away" d="M100 96L28 22"/><path class="rh-head" d="M28 22l2 9M28 22l9 2"/>
      <path class="rh-water" d="M14 100q8-5 16 0t16 0 16 0 16 0 16 0 16 0 16 0 16 0 16 0 16 0 16 0"/></svg>`,
    double: `<svg viewBox="0 0 200 120" aria-hidden="true">${SAT}
      <rect class="rh-house" x="38" y="44" width="40" height="56"/><path class="rh-roof" d="M34 46l24-18 24 18"/>
      <path class="rh-ground" d="M10 100h180"/>
      <path class="rh-ray" d="M170 20L112 100"/><path class="rh-ray" d="M112 100L78 76"/><path class="rh-ray rh-back" d="M78 76L160 22"/><path class="rh-head" d="M160 22l-9 1M160 22l-3 8"/></svg>`,
    volume: `<svg viewBox="0 0 200 120" aria-hidden="true">${SAT}
      <path class="rh-ground" d="M10 100h180"/><path class="rh-trunk" d="M92 100V72"/>
      <circle class="rh-crown" cx="92" cy="54" r="27"/>
      <path class="rh-ray" d="M170 20L110 48"/><path class="rh-ray" d="M110 48l-14 10 8 8-16 4"/>
      <path class="rh-ray rh-back" d="M110 48L158 24"/><path class="rh-head" d="M158 24l-9 0M158 24l-4 8"/>
      <path class="rh-scatter" d="M88 70l-22 10M96 58l-28-14M86 46l-6-26M104 66l20 18"/></svg>`,
  };
  const fig = (k, title, text) => `<figure class="rh-fig">${FIG[k]}<figcaption><b>${title}</b>${text}</figcaption></figure>`;

  const PL = {
    appName: "SARnik",
    docTitle: "SARnik: radarowy przegląd terenu", radarBtn: "Jak działa radar",
    nisarLine: "Korzysta z nowego radaru NISAR (NASA i ISRO, pasmo L), który od czerwca 2026 r. co 12 dni przelatuje nad Poznaniem, oraz z Sentinel-1.",
    radarHow: "Jak widzi radar",
    radarHtml: (m) => `
      <p class="rh-lead">Radar sam wysyła falę mikrofalową i mierzy, ile jej wraca. Działa w nocy i przez chmury. Jasność piksela zależy od kształtu i szorstkości powierzchni, od tego, ile jest w niej wody, i od kąta, pod jakim patrzy radar.</p>
      <div class="rh-grid">
        ${fig("surface", "Gładko: odbicie w bok", "Spokojna woda i gładki asfalt odbijają falę jak lustro, z dala od satelity. Na obrazie są ciemne.")}
        ${fig("double", "Narożnik: podwójne odbicie", "Ściana i ziemia odsyłają falę prosto do satelity. Budynki świecą najjaśniej w VV i HH, zwłaszcza gdy ściany stoją równolegle do toru satelity.")}
        ${fig("volume", "Korona: rozproszenie", "Liście i gałęzie rozpraszają falę we wszystkie strony i obracają jej drganie. Polaryzacje krzyżowe (VH, HV) najbardziej podnosi roślinność.")}
      </div>
      <h3>Polaryzacje</h3>
      <p><b>VV i HH</b>: fala wraca w tym samym ułożeniu, w jakim wyszła. Widać w nich powierzchnię gruntu, budynki i wilgoć. <b>VH i HV</b>: fala wraca obrócona, co dzieje się głównie w koronach drzew i w uprawach, ale też przy budynkach ustawionych ukośnie do toru satelity.</p>
      <h3>Pasma</h3>
      <p><b>Pasmo C</b> (Sentinel-1, fala 5,6 cm) rozprasza się głównie w górnej części koron; przez trawę i niskie uprawy dociera jednak do gleby. Nad Poznaniem przelatuje co kilka dni. <b>Pasmo L</b> (NISAR i ALOS-2, fala 24 cm) przechodzi przez liście do gałęzi, pni i gleby, więc lepiej widzi las i glebę pod roślinnością. Oba pasma czują tylko kilka centymetrów gleby. Nad Poznaniem przelatują cztery orbity NISAR; używamy jednej (orbita 158), która wraca co 12 dni, z pikselem 20 m.</p>
      <h3>Co widzimy wokół Poznania i dlaczego</h3>
      <ul>
        <li><b>Nowe budynki jaśnieją</b>, bo ściany dodają podwójne odbicie. Jesienią 2026 sygnał VV był o co najmniej 3 dB wyższy niż jesienią 2025 na ${m.upHa} ha (każda przyczyna, także pola).</li>
        <li><b>Pola żyją z porami roku.</b> Po żniwach VH spada, bo znikają łodygi i liście. Po orce i jesiennych deszczach VV rośnie, bo gleba jest szorstka i mokra. Dlatego zmianę liczymy rok do roku: jesień do jesieni, ta sama orbita. Usuwa to większość sezonu rolnego, ale nie różnice wilgotności i upraw między latami, więc wiele pól jest dziś ciemniejszych niż rok temu (prawdopodobnie suchsza jesień 2026).</li>
        <li><b>Mokra ziemia odbija silniej</b>, bo woda podnosi stałą dielektryczną gleby. Na ${m.wetShare}% otwartego terenu VV istotnie rośnie razem z wilgotnością gleby NASA POWER (jedna seria dla całego obszaru, ok. 50 km). To reakcja powierzchni na mokrą pogodę, a nie to, jak grunt przepuszcza wodę; zabudowa reaguje prawie tak samo często. W strefach podtopień PIG-PIB reakcja jest prawie taka sama jak poza nimi.</li>
        <li><b>Spokojna otwarta woda jest ciemna.</b> Zalana łąka z trawą lub trzciną bywa jaśniejsza (podwójne odbicie), a wiatr rozjaśnia jeziora.</li>
      </ul>
      <h3>Czego radar tu nie pokaże</h3>
      <p>Pojedynczych domów (komórka ma w terenie ok. 73 m; Sentinel-1 czytamy z podglądu 80 m, NISAR z pikseli 20 m). Nad rzekami i stawami zmiana poziomu wody też zmienia odbicie, więc „nowe ściany” na brzegu Warty to często odsłonięty brzeg, nie budowa. Osiadania z NISAR: używamy jasności echa (GCOV), nie fazy. Interferometria NISAR wykryje szybki ruch (centymetry na rok) już po kilku miesiącach, a ruch rzędu milimetrów na rok wymaga lat; dlatego ruch gruntu pokazujemy z EGMS za lata 2016–2020.</p>
      <h3>Co NISAR da w przyszłości</h3>
      <p>Gmina co 12 dni zobaczy, gdzie ruszają budowy, także pod chmurami. Mieszkańcy sprawdzą, który grunt jest już nasiąknięty przed ulewą. Wycinkę będzie widać także pod liśćmi. Po kilku latach danych pasmo L zmierzy osiadanie budynków i nasypów również tam, gdzie rośnie zieleń.</p>`,
  };

  const EN = {
    appName: "SARnik",
    docTitle: "SARnik: a radar check-up of land", radarBtn: "How radar works",
    nisarLine: "It uses the new NISAR radar (NASA and ISRO, L-band), which has passed over Poznań every 12 days since June 2026, together with Sentinel-1.",
    radarHow: "How radar sees the ground",
    radarHtml: (m) => `
      <p class="rh-lead">Radar sends its own microwave pulse and measures how much comes back. It works at night and through clouds. A pixel's brightness depends on the shape and roughness of the surface, on how much water it holds, and on the angle the radar looks from.</p>
      <div class="rh-grid">
        ${fig("surface", "Smooth: mirror bounce", "Calm water and smooth asphalt reflect the pulse away from the satellite, like a mirror. They look dark.")}
        ${fig("double", "Corner: double bounce", "A wall and the ground send the pulse straight back. Buildings are the brightest in VV and HH, especially when their walls run parallel to the satellite track.")}
        ${fig("volume", "Canopy: volume scattering", "Leaves and branches scatter the pulse in all directions and turn its polarisation. Cross-pol (VH, HV) is raised most by vegetation.")}
      </div>
      <h3>Polarisations</h3>
      <p><b>VV and HH</b>: the pulse returns in the same orientation it was sent. They show the ground surface, buildings and moisture. <b>VH and HV</b>: the pulse returns turned, which happens mostly in tree crowns and crops, but also at buildings set at an angle to the satellite track.</p>
      <h3>Bands</h3>
      <p><b>C-band</b> (Sentinel-1, 5.6 cm wave) is scattered mostly in the upper canopy, but through grass and low crops it still reaches the soil. It passes over Poznań every few days. <b>L-band</b> (NISAR and ALOS-2, 24 cm wave) goes through leaves to branches, trunks and soil, so it sees forests and the soil under vegetation better. Both bands sense only the top few centimetres of soil. NISAR covers Poznań from four tracks; we use one (track 158), which repeats every 12 days, with 20 m pixels.</p>
      <h3>What we see around Poznań, and why</h3>
      <ul>
        <li><b>New buildings brighten</b>, because walls add a double bounce. In autumn 2026, VV was at least 3 dB higher than in autumn 2025 on ${m.upHa} ha (any cause, fields included).</li>
        <li><b>Fields follow the seasons.</b> After harvest VH drops as stalks and leaves disappear. After ploughing and autumn rain VV rises: the soil is rough and wet. That is why we measure change year on year: autumn against autumn, same orbit. This removes most of the farming season, but not year-to-year differences in soil moisture and crops, so many fields are darker than a year ago (probably a drier autumn in 2026).</li>
        <li><b>Wet ground is brighter</b>, because water raises the soil's dielectric constant. On ${m.wetShare}% of open land VV rises significantly with NASA POWER soil wetness (one series for the whole area, about 50 km across). This is the surface responding to wet weather, not how well the soil drains; built-up land reacts almost as often. Inside PIG-PIB groundwater-flood areas the response is about the same as outside.</li>
        <li><b>Calm open water is dark.</b> A flooded meadow with grass or reeds above the water is often brighter (double bounce), and wind brightens lakes.</li>
      </ul>
      <h3>What radar cannot show here</h3>
      <p>Single houses (a cell is about 73 m on the ground; Sentinel-1 is read from its 80 m overview, NISAR from 20 m pixels). Along rivers and ponds a change in water level also changes the echo, so “new walls” on the Warta bank are often an exposed bank, not a building. Subsidence from NISAR: we use the echo brightness (GCOV), not the phase. NISAR interferometry can detect fast motion (centimetres a year) within months, while millimetres a year need years; that is why ground motion comes from EGMS for 2016–2020.</p>
      <h3>What NISAR will make possible</h3>
      <p>A municipality will see every 12 days where building starts, even under clouds. Residents could check which ground is already waterlogged before a storm. Tree felling will show even under leaves. After a few years of data, L-band will measure how buildings and embankments settle, also where vegetation grows.</p>`,
  };
  Object.assign(window.I18N.pl.ui, PL);
  Object.assign(window.I18N.en.ui, EN);
})();

/* layers, legend, card, checklist (v2) */
(() => {
  const pl = window.I18N.pl.ui, en = window.I18N.en.ui;
  Object.assign(pl, {
    secRadar: "RADAR 2026 (NISAR, SENTINEL-1)", secGround: "GRUNT I PASMO L", secHistory: "HISTORIA I PROGNOZA",
    minDb: "Minimalna zmiana", minWater: "Minimum przelotów „jak woda”", minMove: "Minimalny ruch", alosYear: "Rok", yr: "rok",
    noPoints: "brak punktów pomiarowych", histHead: "Historia i prognoza (Landsat, model)", histHeadRadar: "Historia i prognoza (Landsat, radar od 2021 r., model)",
    rawRadarData: "Surowe dane radarowe i przeloty NISAR (dla ekspertów)",
  });
  Object.assign(en, {
    secRadar: "RADAR 2026 (NISAR, SENTINEL-1)", secGround: "GROUND AND L-BAND", secHistory: "HISTORY AND PROJECTION",
    minDb: "Minimum change", minWater: "Minimum passes “like water”", minMove: "Minimum motion", alosYear: "Year", yr: "yr",
    noPoints: "no measurement points", histHead: "History and projection (Landsat, model)", histHeadRadar: "History and projection (Landsat, radar from 2021, model)",
    rawRadarData: "Raw radar measurements and NISAR passes (expert view)",
  });
  Object.assign(pl.L, { s1rgb: "Radar 2026: obraz", sarchange: "Radar 2026: zmiana", sarwet: "Reakcja na wilgoć", sarwater: "Woda w radarze", egms: "Ruch gruntu (InSAR)", alos: "Pasmo L: ALOS-2" });
  Object.assign(en.L, { s1rgb: "Radar 2026: picture", sarchange: "Radar 2026: change", sarwet: "Response to moisture", sarwater: "Water seen by radar", egms: "Ground motion (InSAR)", alos: "L-band: ALOS-2" });
  Object.assign(pl.Lsub, {
    s1rgb: "Sentinel-1, mediana przelotów VI–XI; R = VV, G = VH, B = VV/VH",
    sarchange: "Sentinel-1 VV: jesień 2026 wobec jesieni 2025",
    sarwet: "otwarty teren: VV rośnie z wilgotnością gleby (NASA POWER)",
    sarwater: "spokojna otwarta woda (VV poniżej −17 dB)",
    egms: "EGMS 2016–2020, Sentinel-1 InSAR, przez PIG-PIB",
    alos: "mozaiki roczne 2015–2021; R = HH, G = HV, B = HH/HV",
  });
  Object.assign(en.Lsub, {
    s1rgb: "Sentinel-1, median of June–November passes; R = VV, G = VH, B = VV/VH",
    sarchange: "Sentinel-1 VV: autumn 2026 against autumn 2025",
    sarwet: "open land: VV rises with soil wetness (NASA POWER)",
    sarwater: "calm open water (VV below −17 dB)",
    egms: "EGMS 2016–2020, Sentinel-1 InSAR, via PIG-PIB",
    alos: "yearly mosaics 2015–2021; R = HH, G = HV, B = HH/HV",
  });
  Object.assign(pl.lg, {
    sarchange: "Zmiana VV, jesień 2025 → 2026", wallsNow: "jaśniej z podwójnym odbiciem: sygnał jak od nowych ścian", brighterNow: "jaśniej bez podwójnego odbicia: pola, prace ziemne, też budynki ukośne do orbity", darkerNow: "ciemniej niż rok temu: na polach zwykle inna uprawa, orka albo suchsza gleba",
    sarwet: "Jak mocno radar reaguje na wilgoć", weak: "słabo", strong: "silnie",
    sarwater: "Przeloty, w których piksel wyglądał jak woda", egms: "Ruch gruntu 2016–2020", sinks: "osiada", rises: "podnosi się",
    s1rgb: "Radar Sentinel-1, sezon 2026", alos: (y) => `Radar ALOS-2, pasmo L, ${y}`,
    rgbBuilt: "zabudowa", rgbStrong: "hale i ściany zwrócone do radaru", rgbVeg: "las i zadrzewienia", rgbBuiltVeg: "zabudowa albo las (silne HV)", rgbBare: "pola i łąki", rgbWater: "woda i gładki asfalt",
  });
  Object.assign(en.lg, {
    sarchange: "VV change, autumn 2025 → 2026", wallsNow: "brighter with double bounce: a signal like new walls", brighterNow: "brighter without double bounce: fields, earthworks, also buildings at an angle to the orbit", darkerNow: "darker than last autumn: on fields usually a different crop, tillage or drier soil",
    sarwet: "How strongly radar follows moisture", weak: "weak", strong: "strong",
    sarwater: "Passes in which the pixel looked like water", egms: "Ground motion 2016–2020", sinks: "sinking", rises: "rising",
    s1rgb: "Sentinel-1 radar, 2026 season", alos: (y) => `ALOS-2 radar, L-band, ${y}`,
    rgbBuilt: "built-up land", rgbStrong: "halls and walls facing the radar", rgbVeg: "forest and trees", rgbBuiltVeg: "built-up land or forest (strong HV)", rgbBare: "fields and meadows", rgbWater: "water and smooth asphalt",
  });
  pl.rb = {
    title: "Radar · 2026", how: "Jak widzi radar?",
    src: (n, a, b) => `Sentinel-1 (pasmo C), ${n} ${plForm(n, "przelot", "przeloty", "przelotów")}, ${a}–${b}`,
    change: "Ślad nowych ścian w radarze", changeV: (u, d) => `terenu z podwójnym odbiciem, jesień 2025 → 2026; razem ${u} jaśniej i ${d} ciemniej o 3 dB+`,
    wet: "Reakcja na wilgoć", wetV: "otwartego terenu reaguje na wilgoć",
    water: "Woda w radarze", waterV: "terenu wygląda jak woda w ≥ 20% przelotów",
    egms: "Ruch gruntu", egmsV: (n) => `EGMS 2016–2020, ${n} ${plForm(n, "komórka", "komórki", "komórek")} z pomiarem`, egmsNone: "brak punktów EGMS",
    lband: "Pasmo L (HV)", lbandV: (a, b) => `ALOS-2, ${a} → ${b}`,
    lgWet: "wilgotność gleby (NASA POWER)", lgNisar: "przeloty NISAR",
    nisar: (n, a, b) => `<b>NISAR</b> (pasmo L, 20 m) przeleciał nad Poznaniem ${n} razy, ${a}–${b}. Obraz jest w warstwie „NISAR”; liczby z plików GCOV dojdą po pobraniu danych.`,
    months: ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"],
  };
  en.rb = {
    title: "Radar · 2026", how: "How does radar see?",
    src: (n, a, b) => `Sentinel-1 (C-band), ${n} passes, ${a}–${b}`,
    change: "Signs of new walls in radar", changeV: (u, d) => `of the land with a double bounce, autumn 2025 → 2026; in all ${u} brighter and ${d} darker by 3 dB+`,
    wet: "Response to moisture", wetV: "of open land follows moisture",
    water: "Water seen by radar", waterV: "of the land looks like water in ≥ 20% of passes",
    egms: "Ground motion", egmsV: (n) => `EGMS 2016–2020, ${n} cells measured`, egmsNone: "no EGMS points",
    lband: "L-band (HV)", lbandV: (a, b) => `ALOS-2, ${a} → ${b}`,
    lgWet: "soil wetness (NASA POWER)", lgNisar: "NISAR passes",
    nisar: (n, a, b) => `<b>NISAR</b> (L-band, 20 m) passed over Poznań ${n} times, ${a}–${b}. The picture is in the “NISAR” layer; numbers from the GCOV files will follow once the data is downloaded.`,
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  };
  Object.assign(pl.chk, {
    radar26: "Radar 2026: co się zmienia",
    radar26Busy: (p) => `Na ${p}% terenu radar widzi sygnał jak od nowych ścian: wyższy o 3 dB lub więcej niż rok temu, z podwójnym odbiciem. Sprawdź w urzędzie, co tu powstaje.`,
    radar26Soft: (p) => `Na ${p}% terenu sygnał wzrósł o 3 dB lub więcej, ale bez podwójnego odbicia: raczej prace polowe lub ziemne.`,
    radar26Quiet: "Bez wyraźnych zmian względem jesieni 2025.",
    wetT: "Wilgoć w radarze",
    wetHigh: (p) => `Na ${p}% otwartego terenu sygnał radaru rośnie razem z wilgotnością gleby: to reakcja powierzchni na mokrą pogodę, nie przepuszczalność gruntu ani pomiar wód gruntowych.`,
    wetLow: (p) => `Otwarty teren słabo reaguje na wilgoć (${p}%).`,
    egmsT: "Ruch gruntu (InSAR)",
    egmsV: (m, n, worst) => `Typowo ${m} mm/rok w latach 2016–2020 (EGMS, ${n} ${plForm(n, "komórka", "komórki", "komórek")})${worst ? `; najszybciej ${worst} mm/rok` : ""}.`,
    egmsSink: (m) => `Grunt osiada o ${m} mm/rok (EGMS 2016–2020). Sprawdź fundamenty i nasypy.`,
    egmsNone: "Brak punktów pomiarowych EGMS w tym miejscu, co jest typowe dla pól i lasów.",
  });
  Object.assign(en.chk, {
    radar26: "Radar 2026: what is changing",
    radar26Busy: (p) => `On ${p}% of the land radar sees a signal like new walls: 3 dB or more above last year's, with a double bounce. Ask the planning office what is going up here.`,
    radar26Soft: (p) => `On ${p}% of the land the signal rose by 3 dB or more, but without a double bounce: more likely field work or earthworks.`,
    radar26Quiet: "No clear change against autumn 2025.",
    wetT: "Moisture seen by radar",
    wetHigh: (p) => `On ${p}% of open land the radar signal rises with soil wetness: the surface responds to wet weather; this is not soil drainage or a groundwater measurement.`,
    wetLow: (p) => `Open land reacts little to moisture (${p}%).`,
    egmsT: "Ground motion (InSAR)",
    egmsV: (m, n, worst) => `Typically ${m} mm/year in 2016–2020 (EGMS, ${n} cells)${worst ? `; fastest ${worst} mm/year` : ""}.`,
    egmsSink: (m) => `The ground sinks by ${m} mm/year (EGMS 2016–2020). Check foundations and embankments.`,
    egmsNone: "No EGMS measurement points here, which is typical for fields and forests.",
  });
})();

/* start screen findings (v2): wording adapts to what the checks found */
(() => {
  Object.assign(window.I18N.pl.f, {
    radar: (d) => ({ t: "Radar widzi ślad nowych ścian",
      b: `Jesień 2026 wobec jesieni 2025, ta sama orbita Sentinel-1: ${d.ha} ha pojaśniało o 3 dB lub więcej (każda przyczyna, także pola), z czego ${d.wha} ha z podwójnym odbiciem, typowym dla nowych ścian (to górna granica).` +
        (d.ratio == null ? "" : d.sig
          ? ` Na działkach z decyzją o nowej budowie (czerwiec–sierpień 2026) silne pojaśnienie jest ok. ${d.ratio} razy częstsze niż w reszcie Poznania (${d.dec}% wobec ${d.rest}%), ale trafienia pochodzą z kilku budów, więc krotność jest niepewna. Sąsiednie komórki nie są niezależne, dlatego nie podajemy p.` + (d.wallsSig ? "" : " Sam ślad ścian nie jest tam jeszcze wyraźnie częstszy.")
          : ` Na działkach z decyzją o nowej budowie nie zdarza się to wyraźnie częściej (${d.dec}% wobec ${d.rest}%): decyzja to jeszcze nie budowa.`) }),
    wet: (d) => ({ t: "Powierzchnia reaguje na mokrą pogodę",
      b: `Na ${d.share}% otwartego terenu VV z Sentinel-1 rośnie razem z wilgotnością gleby NASA POWER (jedna seria dla całego obszaru, ok. 50 km). To reakcja powierzchni na mokrą pogodę, a nie to, jak grunt przepuszcza wodę.` +
        (d.flood == null ? "" : d.fsig
          ? ` W strefach podtopień PIG-PIB częściej: ${d.flood}% wobec ${d.out}%.`
          : ` W strefach podtopień PIG-PIB prawie tyle samo (${d.flood}% wobec ${d.out}%).`) }),
    ground: (d) => ({ t: "Tam, gdzie EGMS mierzy, grunt jest stabilny",
      b: `Interferometria radarowa EGMS (2016–2020) mierzy ${d.share}% obszaru: prawie całą zabudowę, a pól i lasów niewiele. Typowy ruch to ${d.med} mm/rok; ${d.n} ${plForm(d.n, "komórka osiada", "komórki osiadają", "komórek osiada")} o 5 mm/rok lub szybciej, najszybciej ${d.min} mm/rok.` }),
    lband: (d) => ({ t: "Pasmo L: wehikuł czasu przed NISAR",
      b: `Mozaiki ALOS-2 z lat ${d.y0}–${d.y1} mają to samo pasmo i te same polaryzacje co NISAR. Las wyróżnia się w HV, a pola są najciemniejsze w HH; duży spadek HV nad lasem oznacza utratę drzew.` }),
    modelRadar: (d) => ({ t: "Prognoza a radar",
      b: d.sig
        ? `Na wolnym terenie, który prognoza stawia najwyżej, radar widzi w 2026 więcej pojaśnień niż na pozostałym (${d.top}% wobec ${d.rest}%), ale to głównie skraj istniejących osiedli: ułożenie wolnego terenu po prostu według udziału zabudowy daje to samo. Test nie pokazuje, że prognoza coś dodaje, więc nie podajemy krotności.`
        : `Na wolnym terenie najbardziej zagrożonym według prognozy radar nie widzi w 2026 wyraźnie więcej zmian (${d.top}% wobec ${d.rest}%). Rok to za mało, by budowa się pokazała.` }),
  });
  Object.assign(window.I18N.en.f, {
    radar: (d) => ({ t: "Radar sees signs of new walls",
      b: `Autumn 2026 against autumn 2025, same Sentinel-1 orbit: ${d.ha} ha brightened by 3 dB or more (any cause, fields included), ${d.wha} ha of it with the double bounce typical of new walls (an upper bound).` +
        (d.ratio == null ? "" : d.sig
          ? ` On plots with a new-building decision (June–August 2026) strong brightening is about ${d.ratio} times as common as in the rest of Poznań (${d.dec}% vs ${d.rest}%), but the hits come from a few building sites, so the ratio is uncertain. Neighbouring cells are not independent, so we give no p-value.` + (d.wallsSig ? "" : " The wall signature alone is not yet clearly more common there.")
          : ` On plots with a new-building decision it is not clearly more common (${d.dec}% vs ${d.rest}%): a decision is not yet a building site.`) }),
    wet: (d) => ({ t: "The surface responds to wet weather",
      b: `On ${d.share}% of open land Sentinel-1 VV rises with NASA POWER soil wetness (one series for the whole area, about 50 km across). This is the surface responding to wet weather, not how well the soil drains.` +
        (d.flood == null ? "" : d.fsig
          ? ` More often in PIG-PIB groundwater-flood areas: ${d.flood}% vs ${d.out}%.`
          : ` In PIG-PIB groundwater-flood areas almost the same (${d.flood}% vs ${d.out}%).`) }),
    ground: (d) => ({ t: "Where EGMS measures, the ground is stable",
      b: `Radar interferometry from EGMS (2016–2020) measures ${d.share}% of the area: almost all built-up land, but little of the fields and forests. Typical motion is ${d.med} mm/year; ${d.n} cells sink by 5 mm/year or faster, the fastest by ${d.min} mm/year.` }),
    lband: (d) => ({ t: "L-band: a time machine before NISAR",
      b: `ALOS-2 mosaics from ${d.y0}–${d.y1} use the same band and polarisations as NISAR. Forest stands out in HV and fields are the darkest class in HH; a large HV drop over forest means trees were lost.` }),
    modelRadar: (d) => ({ t: "The projection and the radar",
      b: d.sig
        ? `On the open land the projection ranks highest, radar sees more brightening in 2026 than on other open land (${d.top}% vs ${d.rest}%), but mostly at the edge of existing estates: ranking open land simply by its existing built-up share gives the same result. The test does not show that the projection adds skill, so we quote no ratio.`
        : `On the open land the model ranks highest, radar does not see clearly more change in 2026 (${d.top}% vs ${d.rest}%). One year is too short for building to show.` }),
  });
  window.I18N.pl.ui.caseIntro = "Radar NISAR i Sentinel-1 zamieniony na liczby dla każdego miejsca wokół Poznania. Wybierz ustalenie, wyszukaj adres albo obrysuj działkę.";
  window.I18N.en.ui.caseIntro = "NISAR and Sentinel-1 radar turned into numbers for every place around Poznań. Pick a finding, search an address, or draw a plot.";
  window.I18N.pl.caseTitle = "Co widzi radar";
  window.I18N.en.caseTitle = "What the radar sees";
})();

/* "About the data": radar sources (v2) */
(() => {
  window.I18N.pl.ui.aboutSar = `
    <h3>Radar SAR: źródła i metoda</h3>
    <ul>
      <li><b>NISAR GCOV</b> (NASA-ISRO, pasmo L, HH i HV, 20 m): przeloty orbity 158 (wznoszącej) z 25.06–11.10.2026, wersja provisional. Z każdego pliku HDF5 czytamy tylko okno Poznania i uśredniamy moc w komórkach 120 m. Para 25.06 i 24.08 daje warstwę „zmiana od czerwca do sierpnia” na otwartym terenie: to deszcz razem ze żniwami i uprawą pól. Wilgotność gleby 0–7 cm wg ERA5 (Open-Meteo): 0,09 m³/m³ 25.06 i 0,30 m³/m³ 24.08; 23,5 mm deszczu w 3 dni przed 24.08 (wartości dobowe). Obraz NASA GIBS (wszystkie orbity) służy tylko do podglądu, nie do liczb.</li>
      <li><b>Sentinel-1 RTC</b> (ESA/Copernicus, pasmo C, VV i VH): wszystkie przeloty orbity 73 (wznoszącej) od czerwca do listopada 2026 i jesienią 2025, przez Microsoft Planetary Computer, czytane z podglądu 80 m. Moc sygnału uśredniamy w komórkach 120 m (ok. 73 m w terenie).</li>
      <li><b>Zmiana rok do roku</b>: mediana 12 przelotów jesieni 2026 minus mediana 12 przelotów jesieni 2025, ta sama orbita (VV, dB). Usuwa to większość sezonu rolnego, ale nie różnice wilgotności i upraw między latami. <b>Woda</b>: udział przelotów z VV poniżej −17 dB. <b>Reakcja na wilgoć</b>: tylko otwarty teren (bez zabudowy, lasu i wody); korelacja rang Spearmana między VV a wilgotnością gleby z NASA POWER (GWETTOP, jedna wartość dla całego obszaru, ok. 50 km) w dniach przelotów; pokazujemy tylko wartości istotne (p < 0,05).</li>
      <li><b>EGMS</b> (Copernicus, interferometria Sentinel-1 2016–2020, ruch pionowy) przez usługę PIG-PIB.</li>
      <li><b>ALOS-2 PALSAR-2</b> (JAXA, pasmo L, HH i HV, 25 m): roczne mozaiki 2015–2021 przez Planetary Computer.</li>
      <li><b>Weryfikacja</b>: decyzje o nowej budowie Wydziału Urbanistyki i Architektury z czerwca–sierpnia 2026 (pozwolenia, zgłoszenia, warunki zabudowy, decyzje lokalizacyjne; GEOPOZ), obszary zagrożone podtopieniami PIG-PIB i model prognozy zabudowy.</li>
      <li><b>Pogoda w dni przelotów NISAR</b>: ERA5 (Copernicus C3S) przez Open-Meteo, licencja CC BY 4.0 (Weather data by Open-Meteo.com).</li>
    </ul>`;
  window.I18N.en.ui.aboutSar = `
    <h3>SAR radar: sources and method</h3>
    <ul>
      <li><b>NISAR GCOV</b> (NASA-ISRO, L-band, HH and HV, 20 m): passes of track 158 (ascending), 25 Jun – 11 Oct 2026, provisional release. From each HDF5 file we read only the Poznań window and average power in 120 m cells. The pair 25 Jun and 24 Aug gives the “change from June to August” layer on open land: rain together with harvest and tillage. ERA5 0–7 cm soil moisture (Open-Meteo): 0.09 m³/m³ on 25 Jun and 0.30 m³/m³ on 24 Aug; 23.5 mm of rain in the 3 days before 24 Aug (daily values). The NASA GIBS picture (all tracks) is only a preview, not used in the numbers.</li>
      <li><b>Sentinel-1 RTC</b> (ESA/Copernicus, C-band, VV and VH): every pass of relative orbit 73 (ascending), June to November 2026 and autumn 2025, via Microsoft Planetary Computer, read from the 80 m overview. Power is averaged in 120 m cells (about 73 m on the ground).</li>
      <li><b>Year-on-year change</b>: median of 12 passes in autumn 2026 minus median of 12 passes in autumn 2025, same orbit (VV, dB). This removes most of the farming season, but not year-to-year differences in soil moisture and crops. <b>Water</b>: share of passes with VV below −17 dB. <b>Moisture response</b>: open land only (no buildings, forest or water); Spearman rank correlation between VV and NASA POWER soil wetness (GWETTOP, one value for the whole area, about 50 km across) on the pass days; only significant values are shown (p < 0.05).</li>
      <li><b>EGMS</b> (Copernicus, Sentinel-1 interferometry 2016–2020, vertical motion) via the PIG-PIB service.</li>
      <li><b>ALOS-2 PALSAR-2</b> (JAXA, L-band, HH and HV, 25 m): yearly mosaics 2015–2021 via Planetary Computer.</li>
      <li><b>Checks</b>: new-building decisions of the Poznań planning office dated June–August 2026 (building permits, notifications, zoning and location decisions; GEOPOZ), PIG-PIB groundwater-flood areas and our building projection.</li>
      <li><b>Weather on NISAR pass days</b>: ERA5 (Copernicus C3S) via Open-Meteo, licence CC BY 4.0 (Weather data by Open-Meteo.com).</li>
    </ul>`;
})();

/* NISAR (L-band) texts: layer, legend, card, finding, L vs C table */
(() => {
  const pl = window.I18N.pl.ui, en = window.I18N.en.ui;
  Object.assign(pl.L, { nisarwet: "NISAR: zmiana VI → VIII", alos: "Pasmo L: ALOS-2 i NISAR" });
  Object.assign(en.L, { nisarwet: "NISAR: change Jun → Aug", alos: "L-band: ALOS-2 and NISAR" });
  Object.assign(pl.Lsub, { nisarwet: "pasmo L, HH: 24.08 minus 25.06 (po deszczu i po żniwach), otwarty teren", alos: "ALOS-2 2015–2021, NISAR 2026; R = HH, G = HV, B = HH/HV" });
  Object.assign(en.Lsub, { nisarwet: "L-band HH: 24 Aug minus 25 Jun (after rain, and after harvest), open land", alos: "ALOS-2 2015–2021, NISAR 2026; R = HH, G = HV, B = HH/HV" });
  Object.assign(pl.lg, { nisarwet: "NISAR HH: 24.08 minus 25.06", wetter: "jaśniej: deszcz, żniwa i uprawa razem", drier: "ciemniej: zmiana upraw albo żniwa", nisarL: "Radar NISAR, pasmo L, 2026",
    nisarPass: (d) => `Radar NISAR, przelot ${d}`, passHH: "ten przelot ma tylko HH: jaśniej = silniejsze odbicie",
    passNote: "Pojedyncze przeloty jednego lata: pola zmieniają się z uprawą, żniwami i deszczem, budynki i las zostają." });
  Object.assign(en.lg, { nisarwet: "NISAR HH: 24 Aug minus 25 Jun", wetter: "brighter: rain, harvest and tillage together", drier: "darker: crop change or harvest", nisarL: "NISAR radar, L-band, 2026",
    nisarPass: (d) => `NISAR radar, pass of ${d}`, passHH: "this pass has HH only: brighter = stronger echo",
    passNote: "Single passes of one summer: fields change with crops, harvest and rain; buildings and forest stay." });
  Object.assign(pl.rb, {
    srcN: (n) => `NISAR (pasmo L), ${n} ${plForm(n, "przelot", "przeloty", "przelotów")}`,
    nisarWet: "NISAR: zmiana VI → VIII", nisarWetV: (p) => `HH, 25.06 → 24.08, otwarty teren; ${p} terenu jaśniej o 2 dB+`,
    nisarNoOpen: "brak otwartego terenu w zaznaczeniu",
    nisarUsed: (n, t, a, b, all) => `<b>NISAR</b> (pasmo L, 20 m): w obliczeniach ${n} ${plForm(n, "przelot", "przeloty", "przelotów")} orbity ${t} z plików GCOV (${a}–${b}, wersja provisional). Nad Poznaniem było ich razem ${all}.`,
  });
  Object.assign(en.rb, {
    srcN: (n) => `NISAR (L-band), ${n} passes`,
    nisarWet: "NISAR: change Jun → Aug", nisarWetV: (p) => `HH, 25 Jun → 24 Aug, open land; ${p} of it brighter by 2 dB+`,
    nisarNoOpen: "no open land in the selection",
    nisarUsed: (n, t, a, b, all) => `<b>NISAR</b> (L-band, 20 m): ${n} passes of track ${t} from the GCOV files are in the numbers (${a}–${b}, provisional release). ${all} passes flew over Poznań in all.`,
  });
  const fPl = window.I18N.pl.f.lband, fEn = window.I18N.en.f.lband;
  window.I18N.pl.f.lband = (d) => !d.nisar ? fPl(d) : ({ t: "NISAR: pasmo L w liczbach",
    b: `Oś czasu pasma L: ALOS-2 ${d.y0}–${d.y1}, potem NISAR 2026 (${d.n} ${plForm(d.n, "przelot", "przeloty", "przelotów")}).` + (d.wd
      ? ` Między 25.06 a 24.08 HH wzrósł o 2 dB lub więcej na ${d.wd.share}% otwartego terenu: to deszcz razem ze żniwami i uprawą.` + (d.wd.flood == null ? "" : d.wd.sig
        ? ` W strefach podtopień PIG-PIB ${d.wd.ratio} razy częściej (${d.wd.flood}% wobec ${d.wd.out}%, ${d.wd.p}).`
        : ` W strefach podtopień PIG-PIB rzadziej (${d.wd.flood}% wobec ${d.wd.out}%). To głównie łąki, gdzie mniej się żnie, i więcej tu drzew; przyczyna nie jest jeszcze znana.`) : "") });
  window.I18N.en.f.lband = (d) => !d.nisar ? fEn(d) : ({ t: "NISAR: L-band in numbers",
    b: `The L-band time line: ALOS-2 ${d.y0}–${d.y1}, then NISAR 2026 (${d.n} passes).` + (d.wd
      ? ` Between 25 Jun and 24 Aug, HH rose by 2 dB or more on ${d.wd.share}% of open land: rain together with harvest and tillage.` + (d.wd.flood == null ? "" : d.wd.sig
        ? ` In PIG-PIB groundwater-flood areas ${d.wd.ratio} times as often (${d.wd.flood}% vs ${d.wd.out}%, ${d.wd.p}).`
        : ` Less often in PIG-PIB groundwater-flood areas (${d.wd.flood}% vs ${d.wd.out}%). These areas are mostly meadows with little harvest and more trees; the cause is not yet known.`) : "") });
  // L vs C table appended to "How radar sees the ground"
  const table = (m, L) => {
    if (!m.bands) return "";
    const b = m.bands, f = m.fmt, rows = [["built", L.built], ["forest", L.forest], ["open", L.open]];
    const dL = b.forest.HV - b.open.HV, dC = b.forest.VH - b.open.VH;
    return `<h3>${L.h}</h3><div class="datatable"><table><thead><tr><th></th><th>NISAR HH</th><th>NISAR HV</th><th>Sentinel-1 VV</th><th>Sentinel-1 VH</th></tr></thead><tbody>` +
      rows.map(([k, lab]) => `<tr><td>${lab}</td><td>${f(b[k].HH)}</td><td>${f(b[k].HV)}</td><td>${f(b[k].VV)}</td><td>${f(b[k].VH)}</td></tr>`).join("") +
      `</tbody></table></div><p>${L.note(f(dL), f(dC))}</p>`;
  };
  const oPl = pl.radarHtml, oEn = en.radarHtml;
  pl.radarHtml = (m) => oPl(m) + table(m, { h: "Pasmo L obok pasma C nad Poznaniem (mediany, dB)", built: "zabudowa", forest: "las", open: "otwarty teren",
    note: (l, c) => `W obrębie każdego satelity las odróżnia się od otwartego terenu o ${l} dB w HV pasma L i o ${c} dB w VH pasma C. Dłuższa fala NISAR wnika w korony i widzi gałęzie oraz pnie. Kalibracja NISAR jest wstępna, a kąty widzenia różne: porównuj kontrasty, nie surowe wartości.` });
  en.radarHtml = (m) => oEn(m) + table(m, { h: "L-band next to C-band over Poznań (medians, dB)", built: "built-up", forest: "forest", open: "open land",
    note: (l, c) => `Within each sensor, forest differs from open land by ${l} dB in L-band HV and by ${c} dB in C-band VH. NISAR's longer wave enters the crowns and sees branches and trunks. NISAR calibration is provisional and the viewing angles differ: compare contrasts, not raw values.` });
})();

/* building permits layer (WUIA, added by Szymon on main) */
(() => {
  Object.assign(window.I18N.pl.ui.L, { wuia: "Decyzje budowlane (WUIA)" });
  Object.assign(window.I18N.en.ui.L, { wuia: "Building decisions (WUIA)" });
  Object.assign(window.I18N.pl.ui.Lsub, { wuia: "2 420 spraw budowlanych VI–XI 2026 (pozwolenia, zgłoszenia, warunki zabudowy), miasto Poznań (GEOPOZ)" });
  Object.assign(window.I18N.en.ui.Lsub, { wuia: "2,420 building cases, Jun–Nov 2026 (permits, notifications, zoning decisions), city of Poznań (GEOPOZ)" });
})();

/* ===== v3: plain language for everyone ("Kowalski"); the technical wording stays for expert mode ===== */
(() => {
  const pl = window.I18N.pl.ui, en = window.I18N.en.ui;
  const plRzecz = (n) => (n === 1 ? "1 rzecz do sprawdzenia" : `${n} rzeczy do sprawdzenia`);
  pl.plain = {
    lvl: { ok: "w normie", info: "informacja", warn: "do sprawdzenia", risk: "uwaga", price: "informacja" },
    checking: "sprawdzam…", // status of a row whose answer has not arrived yet (extension modules)
    flags: plRzecz, flagsSub: "Zapytaj o to sprzedającego i urząd, zanim podpiszesz umowę.",
    noFlags: "Nic niepokojącego", noFlagsSub: "Radar i mapy nie pokazują tu problemów. To nie zastępuje oględzin ani badania gruntu.",
    buildT: "Nowe budowy obok",
    buildYes: (p) => `Radar widzi tu sygnał jak od nowych ścian (${p}% terenu wokół). Sprawdź w urzędzie, co tu powstaje.`,
    buildOther: "Radar widzi tu zmiany terenu, najczęściej pola albo prace ziemne; część budów też tak wygląda.",
    buildNo: "Radar nie widzi tu w ostatnim roku śladu nowych ścian.",
    buildSrc: "Radar Sentinel-1, jesień 2025 i jesień 2026",
    nextT: "Co może powstać obok",
    nextHigh: (p, s) => `Wolny teren obok ma jedną z najwyższych szans zabudowy wokół Poznania: ok. ${p}% w ciągu 5 lat (więcej niż ${s}% wolnych miejsc). Sprawdź plan miejscowy.`,
    nextMid: (p, s) => `Wolny teren obok może zostać zabudowany: ok. ${p}% szans w ciągu 5 lat, więcej niż w ${s}% wolnych miejsc wokół Poznania.`,
    nextLow: "Raczej nic dużego tu nie powstanie w ciągu 5 lat.",
    nextBuilt: "Okolica jest już zabudowana, wolnego terenu prawie nie ma.",
    nextSrc: "Nasza prognoza (Landsat; uczona na latach 2005–2015, sprawdzona na 2015–2020)",
    nextRadar: (ha) => `Radar widzi już zabudowę po 2020 r. na ${ha} ha terenu, który prognoza liczyła jako wolny.`,
    nextSrcRadar: "; wolny teren sprawdzony radarem (Sentinel-1, NISAR, 2026)",
    nisarT: "Co NISAR widział tego lata",
    nisarV: (p) => `Radar NISAR: między czerwcem a sierpniem 2026 r. echo wyraźnie wzrosło na ${p}% pól i łąk wokół tego miejsca. To deszcz razem ze żniwami i uprawą; nie mówi nic o samej działce.`,
    nisarNone: "Radar NISAR nie ma tu pomiaru: wokół tego miejsca nie ma otwartego terenu z jego danymi.",
    nisarSrc: (t, n, a, b) => `Radar NISAR (NASA-ISRO), pasmo L, tor ${t}, przeloty lata 2026: ${n}; porównane ${a} i ${b}`,
    waterT: "Woda",
    waterFlood: "Miejsce leży w strefie zagrożonej podtopieniami. Zapytaj o wody gruntowe i izolację piwnicy.",
    waterFloodArea: (p) => `${p}% terenu leży w strefie zagrożonej podtopieniami. Zapytaj o wody gruntowe i izolację piwnicy.`,
    waterHollow: (m) => `Miejsce leży ok. ${m} m niżej niż okolica, więc po ulewie może się tu zbierać woda. Sprawdź na miejscu: model terenu obejmuje też drzewa i budynki.`,
    waterHollowArea: (p) => `${p}% terenu leży w zagłębieniach, gdzie po ulewie może się zbierać woda. Sprawdź na miejscu: model terenu obejmuje też drzewa i budynki.`,
    waterOk: "Nic nie wskazuje na problemy z wodą.",
    waterSrc: "Mapa podtopień PIG-PIB, model powierzchni z radaru TanDEM-X",
    waterSrcFlood: "Mapa obszarów zagrożonych podtopieniami PIG-PIB",
    waterSrcHollow: "Model powierzchni Copernicus DEM (radar TanDEM-X, z drzewami i budynkami)",
    grpSar: "Z radaru SAR", grpOther: "Tło z innych źródeł (bez radaru)",
    groundT: "Czy grunt się rusza",
    groundOk: "Tam, gdzie są pomiary, grunt jest stabilny.",
    groundSinks: (m) => `Grunt osiada średnio ok. ${m} mm na rok. Sprawdź fundamenty i ściany budynków.`,
    groundSpots: (m) => `Grunt jest w większości stabilny, ale są tu miejsca, które osiadają do ${m} mm na rok.`,
    groundNone: "Brak pomiarów w tym miejscu, co jest typowe dla pól i lasów.",
    groundSrc: "Radar Sentinel-1, pomiary ruchu gruntu EGMS 2016–2020",
    treesT: "Drzewa",
    treesCut: (ha) => `Od 2001 roku wycięto tu ok. ${ha} ha drzew.`,
    treesOk: (ha) => (/^0[.,]0$/.test(String(ha)) ? "Od 2001 roku nie ubyło tu drzew (mniej niż 0,1 ha)." : `Drzewa w okolicy w większości stoją (od 2001 roku ubyło ok. ${ha} ha).`),
    treesSrc: "Zdjęcia satelitarne Landsat, 2001–2024",
    heatT: "Nagrzewanie powierzchni latem",
    heatFast: (d) => `Latem dachy i grunt nagrzewają się tu z roku na rok szybciej niż w większości okolicy, o ok. ${d} °C na 10 lat.`,
    heatOk: "Latem dachy i grunt nie nagrzewają się tu szybciej niż w okolicy.",
    heatSrc: "Satelita NASA MODIS, lata 2000–2024",
    priceT: "Cena",
    priceV: (zl, w, y, city) => `Metr kwadratowy mieszkania kosztuje ${city ? "w Poznaniu" : "w powiecie poznańskim"} typowo (mediana GUS) ok. ${zl} zł, czyli ${w} przeciętnej pensji (${y}).`,
    priceSrc: "GUS",
  };
  en.plain = {
    lvl: { ok: "fine", info: "information", warn: "worth checking", risk: "warning", price: "information" },
    checking: "checking…",
    flags: (n) => (n === 1 ? "1 thing to check" : `${n} things to check`), flagsSub: "Ask the seller and the planning office about this before you sign.",
    noFlags: "Nothing worrying", noFlagsSub: "Radar and maps show no problems here. This does not replace a viewing or a soil survey.",
    buildT: "New building next door",
    buildYes: (p) => `Radar sees a signal like new walls here (${p}% of the land around). Ask the planning office what is going up.`,
    buildOther: "Radar sees the land changing here, mostly fields or earthworks; some building sites look like this too.",
    buildNo: "Radar sees no sign of new walls here in the last year.",
    buildSrc: "Sentinel-1 radar, autumn 2025 and autumn 2026",
    nextT: "What may be built next door",
    nextHigh: (p, s) => `The open land next door has one of the highest chances of being built on around Poznań: about ${p}% within 5 years (higher than ${s}% of open places). Check the local plan.`,
    nextMid: (p, s) => `The open land next door may be built on: about ${p}% chance in 5 years, more than ${s}% of open places around Poznań.`,
    nextLow: "Nothing big is likely to go up here within 5 years.",
    nextBuilt: "The area is already built up; there is hardly any open land.",
    nextSrc: "Our projection (Landsat; trained on 2005–2015, tested on 2015–2020)",
    nextRadar: (ha) => `Radar already sees building since 2020 on ${ha} ha of the land the forecast counted as open.`,
    nextSrcRadar: "; open land checked by radar (Sentinel-1, NISAR, 2026)",
    nisarT: "What NISAR saw this summer",
    nisarV: (p) => `NISAR radar: between June and August 2026 the echo rose clearly on ${p}% of the fields and meadows around this place. That is rain together with harvest and tillage; it says nothing about the plot itself.`,
    nisarNone: "NISAR has no measurement here: there is no open land with its data around this place.",
    nisarSrc: (t, n, a, b) => `NISAR radar (NASA-ISRO), L-band, track ${t}, summer 2026 passes: ${n}; compared ${a} and ${b}`,
    waterT: "Water",
    waterFlood: "This spot lies in an area at risk of groundwater flooding. Ask about groundwater and basement waterproofing.",
    waterFloodArea: (p) => `${p}% of the land lies in an area at risk of groundwater flooding. Ask about groundwater and basement waterproofing.`,
    waterHollow: (m) => `This spot lies about ${m} m lower than its surroundings, so water can gather here after a storm. Check on site: the terrain model also includes trees and buildings.`,
    waterHollowArea: (p) => `${p}% of the land lies in hollows where water can gather after a storm. Check on site: the terrain model also includes trees and buildings.`,
    waterOk: "Nothing points to water problems.",
    waterSrc: "PIG-PIB groundwater-flood map, surface model from the TanDEM-X radar",
    waterSrcFlood: "PIG-PIB map of areas at risk of groundwater flooding",
    waterSrcHollow: "Copernicus DEM surface model (TanDEM-X radar; includes trees and buildings)",
    grpSar: "From SAR radar", grpOther: "Background from other sources (no radar)",
    groundT: "Is the ground moving",
    groundOk: "Where measured, the ground is stable.",
    groundSinks: (m) => `The ground sinks by about ${m} mm a year on average. Check foundations and walls.`,
    groundSpots: (m) => `The ground is mostly stable, but some spots here sink by up to ${m} mm a year.`,
    groundNone: "No measurements here, which is typical for fields and forests.",
    groundSrc: "Sentinel-1 radar, EGMS ground-motion measurements 2016–2020",
    treesT: "Trees",
    treesCut: (ha) => `About ${ha} ha of trees have been cut here since 2001.`,
    treesOk: (ha) => (/^0[.,]0$/.test(String(ha)) ? "No tree loss here since 2001 (less than 0.1 ha)." : `Most trees around are still standing (about ${ha} ha lost since 2001).`),
    treesSrc: "Landsat satellite images, 2001–2024",
    heatT: "Summer surface heat",
    heatFast: (d) => `In summer, roofs and ground here are warming faster than most of the surrounding area, by about ${d} °C per 10 years.`,
    heatOk: "In summer, roofs and ground here are not warming faster than the surrounding area.",
    heatSrc: "NASA MODIS satellite, 2000–2024",
    priceT: "Price",
    priceV: (zl, w, y, city) => `A square metre of a flat costs typically (GUS median) about ${zl} zł ${city ? "in Poznań" : "in Poznań county"}, or ${w} times the average monthly wage (${y}).`,
    priceSrc: "Statistics Poland (GUS)",
  };
  Object.assign(pl, {
    techSummary: "Szczegóły techniczne: radar, wykresy, statystyka",
    lens: { score: "Ocena działki", history: "Prognoza 2035 (AI)", build: "Place budowy 2026 (SAR)", water: "Ryzyko zalania", ground: "Osiadanie terenu", trees: "Ubytek zieleni", radar: "Satelita NISAR" },
    lensTip: { score: "Ogólna ocena działki: zalety (zieleń, drenaż, stabilność, spokój) i wady (podtopienia, osiadanie)", history: "Długoterminowa prognoza AI rozwoju miasta do 2035 r. z ochroną lasów i dolin", build: "Gdzie radar Sentinel-1 widzi w ostatnim roku fizyczny ślad nowych ścian i budów", water: "Strefy podtopień PIG-PIB i letnie wysychanie gleby (spadek wilgoci o 40% wg NISAR 2026)", ground: "Pomiary osiadania i ruchów gruntu z satelitów radarowych (EGMS)", trees: "Gdzie od 2001 roku wycięto las", radar: "Bezpośredni obraz mikrofalowy z satelity radarowego NASA-ISRO NISAR (pasmo L, 2026)" },
    showOnMap: "Co pokazać na mapie", expertT: "Tryb ekspercki", expertSub: "dB, polaryzacje, testy statystyczne i wszystkie suwaki", allLayers: "Wszystkie warstwy i ustawienia",
    lensBar: "Co pokazać na mapie", baseT: "Podkład mapy", sourcesT: "Źródła danych",
    aboutLink: '<p class="about-more"><a href="about.html">Nauka, dowody i ograniczenia: pełna strona „O projekcie”</a></p>',
    sarYes: "z radaru SAR", sarPart: "częściowo z radaru SAR", sarKeyShort: "Ten znak oznacza dane z radaru SAR (NISAR, Sentinel-1). Bez znaku: inne źródła, np. zdjęcia optyczne Landsat.",
    passOpen: "Pokaż przeloty z lata", passClose: "Wróć do mediany 2026", passesLabel: "Pojedyncze przeloty NISAR, lato 2026",
    passKind: (d, hhOnly) => `NISAR, ${d}${hhOnly ? ", tylko HH" : ""}`, passKindShort: (hhOnly) => (hhOnly ? "NISAR, tylko HH" : "NISAR"),
    passOpenShort: "Przeloty", passCloseShort: "Wróć",
    radarYears: "Lata z danymi radaru", noRadarData: "2022–2025: brak zdjęć w paśmie L (ALOS-2 do 2021, NISAR od 2026)",
    tlKind: { score: "ocena działki", archive: "radar ALOS-2", radar: "radar NISAR", build: "radar Sentinel-1", water: "radar NISAR", ground: "pomiary 2016–2020", history: "zabudowa Poznań" },
    lgPlain: { alos: (y) => `Tak radar widział okolicę w ${y} (ALOS-2)`, nisarL: "Tak radar NISAR widzi okolicę (2026)", sarchange: "Co się zmieniło w ostatnim roku", wallsNow: "sygnał jak od nowych ścian", brighterNow: "inne zmiany: pola, prace ziemne", darkerNow: "ciemniej niż rok temu: na polach zwykle inna uprawa, orka albo suchsza gleba",
      nisarwet: "Zmiana od czerwca do sierpnia (radar NISAR)", wetter: "jaśniej: deszcz, żniwa, uprawa", drier: "ciemniej: inna uprawa albo żniwa", s1rgb: "Tak radar widzi okolicę", egms: "Ruch gruntu", sinks: "osiada", rises: "podnosi się" },
    hov: { walls: "Radar: sygnał jak od nowych ścian", brighter: "Radar: zmiana terenu (pole lub prace ziemne)", darker: "Radar: ciemniej niż rok temu (na polach zwykle inna uprawa, orka albo suchsza gleba)", noChange: "Radar: bez zmian",
      soaks: "NISAR: jaśniej w sierpniu (deszcz, żniwa, uprawa)", dries: "NISAR: ciemniej w sierpniu (inna uprawa albo żniwa)", steady: "NISAR: bez wyraźnej zmiany od czerwca",
      noPoints: "Ruch gruntu: brak pomiarów", sinks: (m) => `Grunt osiada ok. ${m} mm na rok`, rises: (m) => `Grunt podnosi się ok. ${m} mm na rok`, stable: "Grunt stabilny" },
    caseIntro: "Wpisz adres, kliknij mapę albo obrysuj działkę. Radar satelitarny i mapy powiedzą, czy obok coś się buduje, czy grozi tu woda i czy grunt się rusza.",
    nisarQuote: "„NISAR pokazuje co kilka dni, przez chmury, co stoi i co się dzieje na ziemi wokół działki w 2026 r.”",
    nisarHint: "Kliknij dowolny punkt lub działkę na mapie, aby natychmiast zobaczyć jej ocenę (0–100), zalety (na zielono) i wady (na czerwono).",
    nisarGround: "Co widzi radar (2026):", sarPill: "Radar SAR · 2026", nisarOrbit: "Pasmo L (20 m) · Orbita 158",
    radarNewHa: (ha) => `Radar widzi tu po 2020 r. ok. ${ha} ha nowej zabudowy (Sentinel-1 co roku; lata 2025–2026 potwierdza NISAR).`,
    radarWalls: (p) => `Sentinel-1 widzi na ${p}% terenu sygnał jak od nowych ścian (jesień 2025 → jesień 2026).`,
    radarBuiltOld: "Radar widzi tu zabudowę; po 2020 r. bez nowej.",
    radarOpenNisar: (p) => `Teren otwarty. Latem 2026 r. echo NISAR wyraźnie wzrosło na ${p}% pól i łąk wokół (deszcz razem ze żniwami i uprawą).`,
    radarNisarOnly: (p) => `Latem 2026 r. echo NISAR wyraźnie wzrosło na ${p}% pól i łąk wokół (deszcz razem ze żniwami i uprawą).`,
    radarOpen: "Teren otwarty: radar nie widzi tu zabudowy.", radarNone: "Radar nie ma tu pomiaru.",
    radarNewT: (ha) => `Nowa zabudowa obok wg radaru: ok. ${ha} ha od 2020 r.`,
    radarNewD: "Radar (Sentinel-1 co roku, NISAR w latach 2025–2026) widzi tu więcej nowej zabudowy niż wokół 3 na 4 miejsc pod Poznaniem. Sprawdź, co powstało obok.",
    allPoints: (n, m) => `Wszystkie punkty przeglądu (${n}) · z radaru SAR: ${m}`,
    scoreTitle: "Ogólna ocena terenu",
    proHeader: "Zalety i atuty lokalizacji",
    conHeader: "Wady i punkty do sprawdzenia",
    noCons: "Brak istotnych ostrzeżeń na tym terenie.",
    tierGreat: "Bardzo korzystna lokalizacja",
    tierGood: "Dobra lokalizacja (w normie)",
    tierWarn: "Umiarkowana (sprawdź ostrzeżenia)",
    tierRisk: "Podwyższone ryzyko (istotne wady)",
    lgScore: "Ocena działki (zielony = zalety, czerwony = wady)",
    lgScoreGood: "korzystna / bezpieczna",
    lgScoreRisk: "więcej wad / ryzyko",
    featuredHead: "Szybkie przykłady – zobacz kontrasty w terenie:",
    fMorasko: "Oaza zieleni · 92/100",
    fWarta: "Zagrożenie powodziowe · 35/100",
    fNaramowice: "Plac budowy (SAR) · 56/100",
    fRynek: "Śródmieście · 80/100",
  });
  Object.assign(en, {
    techSummary: "Technical details: radar, charts, statistics",
    lens: { score: "Plot score", history: "Forecast 2035 (AI)", build: "Active builds 2026 (SAR)", water: "Flood risk", ground: "Ground sinking", trees: "Tree loss", radar: "NISAR satellite" },
    lensTip: { score: "Overall land score: pros (greenery, drainage, stability, quiet) and cons (floods, sinking, construction)", history: "Long-term AI forecast of city expansion to 2035 with nature & floodplain preservation", build: "Where Sentinel-1 radar detects physical walls under construction in 2026", water: "PIG-PIB flood zones and summer soil drying (moisture drops 40% via NISAR 2026)", ground: "Millimeter-level ground sinking from satellite radar (EGMS)", trees: "Where forest has been cleared since 2001", radar: "Direct microwave radar imagery from NASA-ISRO NISAR (L-band, 2026)" },
    showOnMap: "What to show on the map", expertT: "Expert mode", expertSub: "dB, polarisations, statistical tests and every slider", allLayers: "All layers and settings",
    lensBar: "What to show on the map", baseT: "Map background", sourcesT: "Data sources",
    aboutLink: '<p class="about-more"><a href="about.html">The science, the evidence and the limits: the full “About the project” page</a></p>',
    sarYes: "from SAR radar", sarPart: "partly from SAR radar", sarKeyShort: "This mark means SAR radar data (NISAR, Sentinel-1). No mark: other sources, such as Landsat optical images.",
    passOpen: "Show the summer passes", passClose: "Back to the 2026 median", passesLabel: "Single NISAR passes, summer 2026",
    passKind: (d, hhOnly) => `NISAR, ${d}${hhOnly ? ", HH only" : ""}`, passKindShort: (hhOnly) => (hhOnly ? "NISAR, HH only" : "NISAR"),
    passOpenShort: "Passes", passCloseShort: "Back",
    radarYears: "Years with radar data", noRadarData: "2022–2025: no L-band images (ALOS-2 to 2021, NISAR from 2026)",
    tlKind: { score: "plot score", archive: "ALOS-2 radar", radar: "NISAR radar", build: "Sentinel-1 radar", water: "NISAR radar", ground: "measured 2016–2020", history: "Poznań development" },
    lgPlain: { alos: (y) => `How radar saw the area in ${y} (ALOS-2)`, nisarL: "How the NISAR radar sees the area (2026)", sarchange: "What changed in the last year", wallsNow: "a signal like new walls", brighterNow: "other changes: fields, earthworks", darkerNow: "darker than last autumn: on fields usually a different crop, tillage or drier soil",
      nisarwet: "Change from June to August (NISAR radar)", wetter: "brighter: rain, harvest, tillage", drier: "darker: a different crop or harvest", s1rgb: "How radar sees the area", egms: "Ground motion", sinks: "sinking", rises: "rising" },
    hov: { walls: "Radar: a signal like new walls", brighter: "Radar: land changed (field or earthworks)", darker: "Radar: darker than last autumn (on fields usually a different crop, tillage or drier soil)", noChange: "Radar: no change",
      soaks: "NISAR: brighter in August (rain, harvest, tillage)", dries: "NISAR: darker in August (a different crop or harvest)", steady: "NISAR: no clear change since June",
      noPoints: "Ground motion: no measurements", sinks: (m) => `Ground sinks about ${m} mm a year`, rises: (m) => `Ground rises about ${m} mm a year`, stable: "Ground stable" },
    caseIntro: "Search an address, click the map or draw a plot. Satellite radar and maps tell you whether building is going on next door, whether water is a risk and whether the ground moves.",
    nisarQuote: "“NISAR shows every few days, through clouds, what stands and what is happening on the ground around the plot in 2026.”",
    nisarHint: "Click any point or plot on the map to instantly reveal its score (0–100), pros (in green), and cons (in red).",
    nisarGround: "What radar sees (2026):", sarPill: "SAR radar · 2026", nisarOrbit: "L-band (20 m) · Track 158",
    radarNewHa: (ha) => `Radar sees about ${ha} ha of new building here since 2020 (Sentinel-1 every year; NISAR confirms 2025–2026).`,
    radarWalls: (p) => `Sentinel-1 sees a signal like new walls on ${p}% of the land (autumn 2025 → autumn 2026).`,
    radarBuiltOld: "Radar sees built-up land here; none new since 2020.",
    radarOpenNisar: (p) => `Open land. In summer 2026 the NISAR echo rose clearly on ${p}% of the fields and meadows around (rain together with harvest and tillage).`,
    radarNisarOnly: (p) => `In summer 2026 the NISAR echo rose clearly on ${p}% of the fields and meadows around (rain together with harvest and tillage).`,
    radarOpen: "Open land: radar sees no built-up land here.", radarNone: "There is no radar measurement here.",
    radarNewT: (ha) => `New building nearby by radar: about ${ha} ha since 2020`,
    radarNewD: "Radar (Sentinel-1 every year, NISAR in 2025–2026) sees more new building here than around 3 in 4 places near Poznań. Check what has gone up next door.",
    allPoints: (n, m) => `All check-up points (${n}) · from SAR radar: ${m}`,
    scoreTitle: "Overall land score",
    proHeader: "Location advantages",
    conHeader: "Issues and things to verify",
    noCons: "No major warnings found for this spot.",
    tierGreat: "Highly advantageous location",
    tierGood: "Good location (normal range)",
    tierWarn: "Moderate (check warnings)",
    tierRisk: "Elevated risk (critical issues)",
    lgScore: "Plot score (green = pros, red = cons)",
    lgScoreGood: "advantageous / safe",
    lgScoreRisk: "more issues / risk",
    featuredHead: "Quick demo spots – see real contrasts:",
    fMorasko: "Green sanctuary · 92/100",
    fWarta: "Flood hazard zone · 35/100",
    fNaramowice: "Active SAR building site",
    fRynek: "Downtown center · 80/100",
  });
  window.I18N.pl.caseTitle = "Przegląd działki z kosmosu";
  window.I18N.en.caseTitle = "A land check-up from space";
  // findings in plain words (numbers in ha, %, mm; no dB, no p-values)
  const fp = window.I18N.pl.f, fe = window.I18N.en.f;
  // expert mode keeps the technical wording (dB, p-values, polarisations)
  window.I18N.pl.fX = { ...fp }; window.I18N.en.fX = { ...fe };
  const oL = { pl: fp.lband, en: fe.lband };
  fp.wet = (d) => ({ t: "Powierzchnia reaguje na mokrą pogodę", b: `Na ${d.share}% pól i łąk radar widzi, jak powierzchnia jaśnieje w mokre dni i ciemnieje w suche. To nie mówi, jak grunt przepuszcza wodę.` });
  fe.wet = (d) => ({ t: "The surface responds to wet weather", b: `On ${d.share}% of fields and meadows radar sees the surface brighten on wet days and darken on dry ones. This does not show how well the soil drains.` });
  fp.lband = (d) => (!d.nisar ? oL.pl(d) : { t: "Co NISAR faktycznie widzi nad Poznaniem w 2026 r.",
    b: `NISAR odtwarza optyczną mapę zabudowy z 2020 r. z wynikiem 0,95 (0,5 to zgadywanie). Zabudowę datowaną przez Sentinel-1 na 2021–2024 widzi 22 razy częściej niż teren nigdy niezabudowany. Silna zmiana sezonowa: 6,4% terenów otwartych, 1,5% gdzie model czeka zabudowy (przyczyny nie ustalono). Wilgotność gleby spadła z ok. 0,28 do 0,17.` });
  fe.lband = (d) => (!d.nisar ? oL.en(d) : { t: "What NISAR actually sees over Poznań in 2026",
    b: `NISAR reproduces the 2020 optical built-up map with a score of 0.95 (0.5 is chance). It sees building that Sentinel-1 dates to 2021–2024 22 times more often than on land never built. Strong seasonal change: 6.4% of ordinary open land, 1.5% where the model expects building (cause not established). Soil moisture fell from about 0.28 to 0.17.` });
  fp.radar = (d) => ({ t: "Gdzie radar widzi ślad nowych ścian",
    b: `Radar Sentinel-1 porównał jesień 2026 z jesienią 2025: na ok. ${d.wha} ha sygnał wzrósł tak, jak przy nowych ścianach (to górna granica).` + (d.sig ? " Na działkach, gdzie miasto wydało decyzję o nowej budowie, radar częściej widzi silne pojaśnienie niż w reszcie miasta, ale to dopiero kilka budów." : "") });
  fe.radar = (d) => ({ t: "Where radar sees signs of new walls",
    b: `Sentinel-1 radar compared autumn 2026 with autumn 2025: on about ${d.wha} ha the signal rose the way new walls make it rise (an upper bound).` + (d.sig ? " On plots where the city issued a new-building decision, radar sees strong brightening more often than elsewhere, but that is only a few building sites so far." : "") });
  fp.modelRadar = (d) => ({ t: "Prognoza a radar",
    b: d.sig ? "Radar widzi więcej zmian tuż przy istniejących osiedlach, czyli tam, gdzie prognoza też spodziewa się zabudowy. To jeszcze nie dowód, że prognoza się sprawdza."
      : "Radar nie widzi jeszcze więcej budów tam, gdzie przewiduje je prognoza. Rok to za mało, by budowa się pokazała." });
  fe.modelRadar = (d) => ({ t: "The projection and the radar",
    b: d.sig ? "Radar sees more change right next to existing estates, where the projection also expects building. That does not yet show the projection is right."
      : "Radar does not yet see more building where the projection expects it. One year is too short for building to show." });
  fp.ground = (d) => ({ t: "Czy ziemia pod Poznaniem osiada?", b: `Tam, gdzie satelity mierzą (${d.share}% obszaru, prawie cała zabudowa), typowy ruch gruntu to ${d.med} mm na rok, a ${d.n} ${plForm(d.n, "komórka osiada", "komórki osiadają", "komórek osiada")} o 5 mm na rok lub szybciej. Dane z lat 2016–2020.` });
  fe.ground = (d) => ({ t: "Is the ground under Poznań sinking?", b: `Where satellites measure (${d.share}% of the area, almost all built-up land), typical ground motion is ${d.med} mm a year, and ${d.n} cells sink by 5 mm a year or faster. Data from 2016–2020.` });
})();

/* ===== NISAR and OPERA products from the hand-downloaded zips (pipeline/build_from_zips.py) ===== */
(() => {
  const pl = window.I18N.pl.ui, en = window.I18N.en.ui;
  Object.assign(pl.L, { nisarcoh: "NISAR: stabilność powierzchni", nisarsm: "NISAR: wilgotność gleby", dist: "Zaburzenia lasu z radaru (OPERA)" });
  Object.assign(en.L, { nisarcoh: "NISAR: surface stability", nisarsm: "NISAR: soil moisture", dist: "Forest disturbance from radar (OPERA)" });
  Object.assign(pl.Lsub, {
    nisarcoh: "koherencja par kolejnych przelotów, orbita 158, VI–X 2026 (GUNW)",
    nisarsm: "produkt NASA-ISRO SME2, 200 m, wersja wstępna",
    dist: "NASA OPERA z Sentinel-1, styczeń–luty 2026, tylko lasy",
  });
  Object.assign(en.Lsub, {
    nisarcoh: "coherence of consecutive pass pairs, track 158, Jun–Oct 2026 (GUNW)",
    nisarsm: "NASA-ISRO SME2 product, 200 m, provisional",
    dist: "NASA OPERA from Sentinel-1, Jan–Feb 2026, forests only",
  });
  Object.assign(pl.lg, {
    nisarcoh: "Czy powierzchnia się zmienia (NISAR)", cohLow: "zmienia się", cohHigh: "stała",
    cohNote: (n) => `Mediana z ${n} par kolejnych przelotów (co 12 dni, raz co 24). Pola, budowy i woda zmieniają się; budynki i drogi są stałe.`,
    nisarsm: (d) => `Wilgotność gleby NISAR, ${d}`,
    smNote: "Produkt wstępny, jeszcze nieskalibrowany. Mediana terenu: 0,275 m³/m³ 25.06 i 0,215 24.08, czyli w czerwcu wilgotniej. Woda i zabudowa bez wartości.",
    dist: "Zaburzenia lasu z radaru, I–II 2026", distHi: "wysoka pewność", distLo: "niska pewność",
    distNote: "Wycinka, wiatrołomy, ale też śnieg i mróz: sygnał do sprawdzenia.",
  });
  Object.assign(en.lg, {
    nisarcoh: "Is the surface changing (NISAR)", cohLow: "changing", cohHigh: "stable",
    cohNote: (n) => `Median of ${n} pairs of consecutive passes (12 days apart, once 24). Fields, building sites and water change; buildings and roads stay the same.`,
    nisarsm: (d) => `NISAR soil moisture, ${d}`,
    smNote: "Provisional product, not calibrated yet. Area median: 0.275 m³/m³ on 25 Jun and 0.215 on 24 Aug, so June was wetter. No values on water or buildings.",
    dist: "Forest disturbance from radar, Jan–Feb 2026", distHi: "high confidence", distLo: "low confidence",
    distNote: "Felling or storm damage, but also snow and frost: a sign to check.",
  });
  pl.passDate = "Przelot"; en.passDate = "Pass";
})();
