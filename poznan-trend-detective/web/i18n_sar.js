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
    radarHow: "Jak widzi radar",
    radarHtml: (m) => `
      <p class="rh-lead">Radar sam wysyła falę mikrofalową i mierzy, ile jej wraca. Działa w nocy i przez chmury. Jasność piksela zależy od dwóch rzeczy: kształtu i szorstkości powierzchni oraz tego, ile w niej wody.</p>
      <div class="rh-grid">
        ${fig("surface", "Gładko: odbicie w bok", "Woda i asfalt odbijają falę jak lustro, z dala od satelity. Na obrazie są ciemne.")}
        ${fig("double", "Narożnik: podwójne odbicie", "Ściana i ziemia odsyłają falę prosto do satelity. Budynki świecą najjaśniej, zwłaszcza w VV i HH.")}
        ${fig("volume", "Korona: rozproszenie", "Liście i gałęzie rozpraszają falę we wszystkie strony i obracają jej drganie. Roślinność widać w VH i HV.")}
      </div>
      <h3>Polaryzacje</h3>
      <p><b>VV i HH</b>: fala wraca w tym samym ułożeniu, w jakim wyszła. Widać w nich powierzchnię gruntu, budynki i wilgoć. <b>VH i HV</b>: fala wraca obrócona, co dzieje się głównie w koronach drzew i w uprawach.</p>
      <h3>Pasma</h3>
      <p><b>Pasmo C</b> (Sentinel-1, fala 5,6 cm) odbija się od liści i wierzchu upraw. Nad Poznaniem przelatuje co kilka dni. <b>Pasmo L</b> (NISAR i ALOS-2, fala 24 cm) przechodzi przez liście do gałęzi, pni i gleby, więc lepiej widzi las i wilgoć pod roślinnością. NISAR mierzy Poznań co 12 dni od czerwca 2026, z pikselem 20 m.</p>
      <h3>Co widzimy wokół Poznania i dlaczego</h3>
      <ul>
        <li><b>Nowe budynki jaśnieją</b>, bo ściany dodają podwójne odbicie. Jesienią 2026 sygnał VV był o co najmniej 3 dB wyższy niż jesienią 2025 na ${m.upHa} ha.</li>
        <li><b>Pola żyją z porami roku.</b> Po żniwach VH spada, bo znikają łodygi i liście. Po orce i jesiennych deszczach VV rośnie, bo gleba jest szorstka i mokra. Dlatego zmianę liczymy rok do roku: jesień do jesieni, ta sama orbita. Pole wraca do tego samego stanu, a nowa ściana zostaje.</li>
        <li><b>Mokra ziemia odbija silniej</b>, bo woda podnosi stałą dielektryczną gleby. Na ${m.wetShare}% otwartego terenu VV istotnie rośnie razem z wilgotnością gleby z NASA POWER. Pasmo C widzi jednak tylko wierzchnią warstwę gleby, a pod trawą i krzewami słabnie: w strefach podtopień PIG-PIB reakcja nie jest wyraźnie silniejsza. Tu ma przewagę pasmo L NISAR.</li>
        <li><b>Woda jest ciemna:</b> jeziora, Warta i rozlewiska.</li>
      </ul>
      <h3>Czego radar tu nie pokaże</h3>
      <p>Pojedynczych domów (piksel ma 10–20 m, a my liczymy w komórkach 120 m). Nad rzekami i stawami zmiana poziomu wody też zmienia odbicie, więc „nowe ściany” na brzegu Warty to często odsłonięty brzeg, nie budowa. Osiadania z kilku miesięcy, bo do tego trzeba lat interferometrii; dlatego ruch gruntu pokazujemy z EGMS za lata 2016–2020.</p>
      <h3>Co NISAR da w przyszłości</h3>
      <p>Gmina co 12 dni zobaczy, gdzie ruszają budowy, także pod chmurami. Mieszkańcy dostaną ostrzeżenie o nasiąkniętym gruncie przed ulewą. Wycinkę będzie widać także pod liśćmi. Po kilku latach danych pasmo L zmierzy osiadanie budynków i nasypów również tam, gdzie rośnie zieleń.</p>`,
  };

  const EN = {
    appName: "SARnik",
    radarHow: "How radar sees the ground",
    radarHtml: (m) => `
      <p class="rh-lead">Radar sends its own microwave pulse and measures how much comes back. It works at night and through clouds. A pixel's brightness depends on two things: the shape and roughness of the surface, and how much water it holds.</p>
      <div class="rh-grid">
        ${fig("surface", "Smooth: mirror bounce", "Water and asphalt reflect the pulse away from the satellite, like a mirror. They look dark.")}
        ${fig("double", "Corner: double bounce", "A wall and the ground send the pulse straight back. Buildings are the brightest, especially in VV and HH.")}
        ${fig("volume", "Canopy: volume scattering", "Leaves and branches scatter the pulse in all directions and turn its polarisation. Vegetation shows in VH and HV.")}
      </div>
      <h3>Polarisations</h3>
      <p><b>VV and HH</b>: the pulse returns in the same orientation it was sent. They show the ground surface, buildings and moisture. <b>VH and HV</b>: the pulse returns turned, which happens mostly in tree crowns and crops.</p>
      <h3>Bands</h3>
      <p><b>C-band</b> (Sentinel-1, 5.6 cm wave) bounces off leaves and the top of crops. It passes over Poznań every few days. <b>L-band</b> (NISAR and ALOS-2, 24 cm wave) goes through leaves to branches, trunks and soil, so it sees forests and moisture under vegetation better. NISAR has measured Poznań every 12 days since June 2026, with 20 m pixels.</p>
      <h3>What we see around Poznań, and why</h3>
      <ul>
        <li><b>New buildings brighten</b>, because walls add a double bounce. In autumn 2026, VV was at least 3 dB higher than in autumn 2025 on ${m.upHa} ha.</li>
        <li><b>Fields follow the seasons.</b> After harvest VH drops as stalks and leaves disappear. After ploughing and autumn rain VV rises: the soil is rough and wet. That is why we measure change year on year: autumn against autumn, same orbit. A field returns to the same state; a new wall stays.</li>
        <li><b>Wet ground is brighter</b>, because water raises the soil's dielectric constant. On ${m.wetShare}% of open land VV rises significantly with soil wetness from NASA POWER. C-band only sees the top of the soil and fades under grass and shrubs: inside PIG-PIB groundwater-flood areas the response is not clearly stronger. This is where NISAR's L-band has the edge.</li>
        <li><b>Water is dark:</b> lakes, the Warta river and flooded meadows.</li>
      </ul>
      <h3>What radar cannot show here</h3>
      <p>Single houses (pixels are 10–20 m and we work in 120 m cells). Along rivers and ponds a change in water level also changes the echo, so “new walls” on the Warta bank are often an exposed bank, not a building. Subsidence over a few months, which needs years of interferometry; that is why ground motion comes from EGMS for 2016–2020.</p>
      <h3>What NISAR will make possible</h3>
      <p>A municipality will see every 12 days where building starts, even under clouds. Residents can be warned about waterlogged ground before a storm. Tree felling will show even under leaves. After a few years of data, L-band will measure how buildings and embankments settle, also where vegetation grows.</p>`,
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
    noPoints: "brak punktów pomiarowych", histHead: "Historia i prognoza (Landsat, model)",
  });
  Object.assign(en, {
    secRadar: "RADAR 2026 (NISAR, SENTINEL-1)", secGround: "GROUND AND L-BAND", secHistory: "HISTORY AND PROJECTION",
    minDb: "Minimum change", minWater: "Minimum passes “like water”", minMove: "Minimum motion", alosYear: "Year", yr: "yr",
    noPoints: "no measurement points", histHead: "History and projection (Landsat, model)",
  });
  Object.assign(pl.L, { s1rgb: "Radar 2026: obraz", sarchange: "Radar 2026: zmiana", sarwet: "Grunt nasiąka wodą", sarwater: "Woda w radarze", egms: "Ruch gruntu (InSAR)", alos: "Pasmo L: ALOS-2" });
  Object.assign(en.L, { s1rgb: "Radar 2026: picture", sarchange: "Radar 2026: change", sarwet: "Ground soaks up water", sarwater: "Water seen by radar", egms: "Ground motion (InSAR)", alos: "L-band: ALOS-2" });
  Object.assign(pl.Lsub, {
    s1rgb: "Sentinel-1, mediana przelotów VI–XI; R = VV, G = VH, B = VV/VH",
    sarchange: "Sentinel-1 VV: jesień 2026 wobec jesieni 2025",
    sarwet: "otwarty teren: VV rośnie z wilgotnością gleby (NASA POWER)",
    sarwater: "piksel ciemny jak woda (VV poniżej −17 dB)",
    egms: "EGMS 2016–2020, Sentinel-1 InSAR, przez PIG-PIB",
    alos: "mozaiki roczne 2015–2021; R = HH, G = HV, B = HH/HV",
  });
  Object.assign(en.Lsub, {
    s1rgb: "Sentinel-1, median of June–November passes; R = VV, G = VH, B = VV/VH",
    sarchange: "Sentinel-1 VV: autumn 2026 against autumn 2025",
    sarwet: "open land: VV rises with soil wetness (NASA POWER)",
    sarwater: "pixel as dark as water (VV below −17 dB)",
    egms: "EGMS 2016–2020, Sentinel-1 InSAR, via PIG-PIB",
    alos: "yearly mosaics 2015–2021; R = HH, G = HV, B = HH/HV",
  });
  Object.assign(pl.lg, {
    sarchange: "Zmiana VV, jesień 2025 → 2026", wallsNow: "nowe ściany: jaśniej i podwójne odbicie", brighterNow: "jaśniej bez podwójnego odbicia: pola, prace ziemne", darkerNow: "ciemniej: rozbiórka, wycinka, nowy asfalt lub woda",
    sarwet: "Jak mocno radar reaguje na wilgoć", weak: "słabo", strong: "silnie",
    sarwater: "Przeloty, w których piksel wyglądał jak woda", egms: "Ruch gruntu 2016–2020", sinks: "osiada", rises: "podnosi się",
    s1rgb: "Radar Sentinel-1, sezon 2026", alos: (y) => `Radar ALOS-2, pasmo L, ${y}`,
    rgbBuilt: "zabudowa", rgbStrong: "hale i ściany zwrócone do radaru", rgbVeg: "las i zadrzewienia", rgbBare: "pola i łąki", rgbWater: "woda i gładki asfalt",
  });
  Object.assign(en.lg, {
    sarchange: "VV change, autumn 2025 → 2026", wallsNow: "new walls: brighter with double bounce", brighterNow: "brighter without double bounce: fields, earthworks", darkerNow: "darker: demolition, felling, new asphalt or water",
    sarwet: "How strongly radar follows moisture", weak: "weak", strong: "strong",
    sarwater: "Passes in which the pixel looked like water", egms: "Ground motion 2016–2020", sinks: "sinking", rises: "rising",
    s1rgb: "Sentinel-1 radar, 2026 season", alos: (y) => `ALOS-2 radar, L-band, ${y}`,
    rgbBuilt: "built-up land", rgbStrong: "halls and walls facing the radar", rgbVeg: "forest and trees", rgbBare: "fields and meadows", rgbWater: "water and smooth asphalt",
  });
  pl.rb = {
    title: "Radar · 2026", how: "Jak widzi radar?",
    src: (n, a, b) => `Sentinel-1 (pasmo C), ${n} przelotów, ${a}–${b}`,
    change: "Nowe ściany w radarze", changeV: (u, d) => `terenu z podwójnym odbiciem, jesień 2025 → 2026; razem ${u} jaśniej i ${d} ciemniej o 3 dB+`,
    wet: "Grunt nasiąka wodą", wetV: "otwartego terenu reaguje na wilgoć",
    water: "Woda w radarze", waterV: "terenu wygląda jak woda w ≥ 20% przelotów",
    egms: "Ruch gruntu", egmsV: (n) => `EGMS 2016–2020, ${n} komórek z pomiarem`, egmsNone: "brak punktów EGMS",
    lband: "Pasmo L (HV)", lbandV: (a, b) => `ALOS-2, ${a} → ${b}`,
    lgWet: "wilgotność gleby (NASA POWER)", lgNisar: "przeloty NISAR",
    nisar: (n, a, b) => `<b>NISAR</b> (pasmo L, 20 m) przeleciał nad Poznaniem ${n} razy, ${a}–${b}. Obraz jest w warstwie „NISAR”; liczby z plików GCOV dojdą po pobraniu danych.`,
    months: ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"],
  };
  en.rb = {
    title: "Radar · 2026", how: "How does radar see?",
    src: (n, a, b) => `Sentinel-1 (C-band), ${n} passes, ${a}–${b}`,
    change: "New walls in radar", changeV: (u, d) => `of the land with a double bounce, autumn 2025 → 2026; in all ${u} brighter and ${d} darker by 3 dB+`,
    wet: "Ground soaks up water", wetV: "of open land follows moisture",
    water: "Water seen by radar", waterV: "of the land looks like water in ≥ 20% of passes",
    egms: "Ground motion", egmsV: (n) => `EGMS 2016–2020, ${n} cells measured`, egmsNone: "no EGMS points",
    lband: "L-band (HV)", lbandV: (a, b) => `ALOS-2, ${a} → ${b}`,
    lgWet: "soil wetness (NASA POWER)", lgNisar: "NISAR passes",
    nisar: (n, a, b) => `<b>NISAR</b> (L-band, 20 m) passed over Poznań ${n} times, ${a}–${b}. The picture is in the “NISAR” layer; numbers from the GCOV files will follow once the data is downloaded.`,
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  };
  Object.assign(pl.chk, {
    radar26: "Radar 2026: co się zmienia",
    radar26Busy: (p) => `Na ${p}% terenu radar widzi nowe ściany: sygnał wyższy o 3 dB lub więcej niż rok temu, z podwójnym odbiciem. Sprawdź w urzędzie, co tu powstaje.`,
    radar26Soft: (p) => `Na ${p}% terenu sygnał wzrósł o 3 dB lub więcej, ale bez podwójnego odbicia: raczej prace polowe lub ziemne.`,
    radar26Quiet: "Bez wyraźnych zmian względem jesieni 2025.",
    wetT: "Wilgoć w radarze",
    wetHigh: (p) => `Na ${p}% otwartego terenu sygnał radaru rośnie razem z wilgotnością gleby: wierzchnia warstwa łatwo nasiąka. To nie pomiar wód gruntowych; zapytaj o drenaż i badanie gruntu.`,
    wetLow: (p) => `Otwarty teren słabo reaguje na wilgoć (${p}%).`,
    egmsT: "Ruch gruntu (InSAR)",
    egmsV: (m, n, worst) => `Typowo ${m} mm/rok w latach 2016–2020 (EGMS, ${n} komórek)${worst ? `; najszybciej ${worst} mm/rok` : ""}.`,
    egmsSink: (m) => `Grunt osiada o ${m} mm/rok (EGMS 2016–2020). Sprawdź fundamenty i nasypy.`,
    egmsNone: "Brak punktów pomiarowych EGMS w tym miejscu, co jest typowe dla pól i lasów.",
  });
  Object.assign(en.chk, {
    radar26: "Radar 2026: what is changing",
    radar26Busy: (p) => `On ${p}% of the land radar sees new walls: the signal is 3 dB or more above last year's, with a double bounce. Ask the planning office what is going up here.`,
    radar26Soft: (p) => `On ${p}% of the land the signal rose by 3 dB or more, but without a double bounce: more likely field work or earthworks.`,
    radar26Quiet: "No clear change against autumn 2025.",
    wetT: "Moisture seen by radar",
    wetHigh: (p) => `On ${p}% of open land the radar signal rises with soil wetness: the topsoil soaks up water easily. This is not a groundwater measurement; ask about drainage and a soil survey.`,
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
    radar: (d) => ({ t: "Radar widzi, gdzie ruszyły budowy",
      b: `Jesień 2026 wobec jesieni 2025, ta sama orbita Sentinel-1: ${d.ha} ha pojaśniało o 3 dB lub więcej, z czego ${d.wha} ha z podwójnym odbiciem, typowym dla nowych ścian.` +
        (d.ratio == null ? "" : d.sig
          ? ` Na działkach z decyzją o nowej budowie zdarza się to ${d.ratio} razy częściej niż w reszcie Poznania (${d.dec}% wobec ${d.rest}%, ${d.p}).`
          : ` Na działkach z decyzją o nowej budowie nie zdarza się to wyraźnie częściej (${d.dec}% wobec ${d.rest}%): decyzja to jeszcze nie budowa.`) }),
    wet: (d) => ({ t: "Ziemia oddycha z pogodą",
      b: `Na ${d.share}% otwartego terenu sygnał radaru rośnie razem z wilgotnością gleby z NASA POWER.` +
        (d.flood == null ? "" : d.fsig
          ? ` W strefach podtopień PIG-PIB częściej: ${d.flood}% wobec ${d.out}%.`
          : ` W strefach podtopień PIG-PIB prawie tyle samo (${d.flood}% wobec ${d.out}%): pasmo C widzi wierzch gleby, nie wodę pod roślinnością. To zadanie dla pasma L NISAR.`) }),
    ground: (d) => ({ t: "Grunt pod Poznaniem jest stabilny",
      b: `Interferometria radarowa EGMS (2016–2020) mierzy ${d.share}% obszaru, głównie zabudowę. Typowy ruch to ${d.med} mm/rok; ${d.n} komórek osiada o 5 mm/rok lub szybciej, najszybciej ${d.min} mm/rok.` }),
    lband: (d) => ({ t: "Pasmo L: wehikuł czasu przed NISAR",
      b: `Mozaiki ALOS-2 z lat ${d.y0}–${d.y1} mają to samo pasmo i te same polaryzacje co NISAR. Las świeci w HV, pola w HH; spadek HV oznacza utratę roślinności.` }),
    modelRadar: (d) => ({ t: "Prognoza spotyka radar",
      b: d.sig
        ? `Na wolnym terenie, który model z 50 lat Landsata uznał za najbardziej zagrożony zabudową, radar widzi w 2026 pojaśnienie ${d.ratio} razy częściej niż na pozostałym (${d.top}% wobec ${d.rest}%, ${d.p})${d.wSig ? `, a nowe ściany ${d.wRatio} razy częściej` : ""}. Model przewidział, radar widzi.`
        : `Na wolnym terenie najbardziej zagrożonym według modelu radar nie widzi w 2026 wyraźnie więcej zmian (${d.top}% wobec ${d.rest}%). Rok to za mało, by budowa się pokazała.` }),
  });
  Object.assign(window.I18N.en.f, {
    radar: (d) => ({ t: "Radar sees where building started",
      b: `Autumn 2026 against autumn 2025, same Sentinel-1 orbit: ${d.ha} ha brightened by 3 dB or more, ${d.wha} ha of it with the double bounce typical of new walls.` +
        (d.ratio == null ? "" : d.sig
          ? ` On plots with a permit for a new building this happens ${d.ratio} times as often as in the rest of Poznań (${d.dec}% vs ${d.rest}%, ${d.p}).`
          : ` On plots with a permit for a new building it is not clearly more common (${d.dec}% vs ${d.rest}%): a permit is not yet a building site.`) }),
    wet: (d) => ({ t: "The ground breathes with the weather",
      b: `On ${d.share}% of open land the radar signal rises with soil wetness from NASA POWER.` +
        (d.flood == null ? "" : d.fsig
          ? ` More often in PIG-PIB groundwater-flood areas: ${d.flood}% vs ${d.out}%.`
          : ` In PIG-PIB groundwater-flood areas almost the same (${d.flood}% vs ${d.out}%): C-band sees the topsoil, not water under vegetation. A job for NISAR's L-band.`) }),
    ground: (d) => ({ t: "The ground under Poznań is stable",
      b: `Radar interferometry from EGMS (2016–2020) measures ${d.share}% of the area, mostly built-up land. Typical motion is ${d.med} mm/year; ${d.n} cells sink by 5 mm/year or faster, the fastest by ${d.min} mm/year.` }),
    lband: (d) => ({ t: "L-band: a time machine before NISAR",
      b: `ALOS-2 mosaics from ${d.y0}–${d.y1} use the same band and polarisations as NISAR. Forest glows in HV, fields in HH; a drop in HV means vegetation was lost.` }),
    modelRadar: (d) => ({ t: "The projection meets the radar",
      b: d.sig
        ? `On open land that our model, trained on 50 years of Landsat, ranks as most likely to be built on, radar sees brightening in 2026 ${d.ratio} times as often as on other open land (${d.top}% vs ${d.rest}%, ${d.p})${d.wSig ? `, and new walls ${d.wRatio} times as often` : ""}. The model predicted, the radar sees.`
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
    <h3>Radar (SARnik v2)</h3>
    <ul>
      <li><b>NISAR GCOV</b> (NASA-ISRO, pasmo L, HH i HV, 20 m): przeloty orbity 158 (wznoszącej) z 25.06–11.10.2026, wersja provisional. Z każdego pliku HDF5 czytamy tylko okno Poznania i uśredniamy moc w komórkach 120 m. Para 25.06 (sucho) i 24.08 (po 23,5 mm deszczu) daje warstwę „mokro minus sucho” na otwartym terenie. Obraz wszystkich przelotów: NASA GIBS.</li>
      <li><b>Sentinel-1 RTC</b> (ESA/Copernicus, pasmo C, VV i VH, 10 m): wszystkie przeloty orbity 73 (wznoszącej) od czerwca do listopada 2026, przez Microsoft Planetary Computer. Moc sygnału uśredniamy w komórkach 120 m.</li>
      <li><b>Zmiana rok do roku</b>: mediana 12 przelotów jesieni 2026 minus mediana 12 przelotów jesieni 2025, ta sama orbita (VV, dB), żeby żniwa i orka się znosiły. <b>Woda</b>: udział przelotów z VV poniżej −17 dB. <b>Reakcja na wilgoć</b>: tylko otwarty teren (bez zabudowy, lasu i wody); korelacja rang Spearmana między VV a wilgotnością gleby z NASA POWER (GWETTOP) w dniach przelotów; pokazujemy tylko wartości istotne (p < 0,05).</li>
      <li><b>EGMS</b> (Copernicus, interferometria Sentinel-1 2016–2020, ruch pionowy) przez usługę PIG-PIB.</li>
      <li><b>ALOS-2 PALSAR-2</b> (JAXA, pasmo L, HH i HV, 25 m): roczne mozaiki 2015–2021 przez Planetary Computer.</li>
      <li><b>Weryfikacja</b>: decyzje i wnioski budowlane Wydziału Urbanistyki i Architektury (GEOPOZ, VI–XI 2026), obszary zagrożone podtopieniami PIG-PIB i model prognozy zabudowy.</li>
    </ul>`;
  window.I18N.en.ui.aboutSar = `
    <h3>Radar (SARnik v2)</h3>
    <ul>
      <li><b>NISAR GCOV</b> (NASA-ISRO, L-band, HH and HV, 20 m): passes of track 158 (ascending), 25 Jun – 11 Oct 2026, provisional release. From each HDF5 file we read only the Poznań window and average power in 120 m cells. The pair 25 Jun (dry) and 24 Aug (after 23.5 mm of rain) gives the “wet minus dry” layer on open land. Pictures of all passes: NASA GIBS.</li>
      <li><b>Sentinel-1 RTC</b> (ESA/Copernicus, C-band, VV and VH, 10 m): every pass of relative orbit 73 (ascending), June to November 2026, via Microsoft Planetary Computer. Power is averaged in 120 m cells.</li>
      <li><b>Year-on-year change</b>: median of 12 passes in autumn 2026 minus median of 12 passes in autumn 2025, same orbit (VV, dB), so harvest and ploughing cancel out. <b>Water</b>: share of passes with VV below −17 dB. <b>Moisture response</b>: open land only (no buildings, forest or water); Spearman rank correlation between VV and NASA POWER soil wetness (GWETTOP) on the pass days; only significant values are shown (p < 0.05).</li>
      <li><b>EGMS</b> (Copernicus, Sentinel-1 interferometry 2016–2020, vertical motion) via the PIG-PIB service.</li>
      <li><b>ALOS-2 PALSAR-2</b> (JAXA, L-band, HH and HV, 25 m): yearly mosaics 2015–2021 via Planetary Computer.</li>
      <li><b>Checks</b>: building permits and applications of the Poznań planning office (GEOPOZ, June–November 2026), PIG-PIB groundwater-flood areas and our building projection.</li>
    </ul>`;
})();

/* NISAR (L-band) texts: layer, legend, card, finding, L vs C table */
(() => {
  const pl = window.I18N.pl.ui, en = window.I18N.en.ui;
  Object.assign(pl.L, { nisarwet: "NISAR: mokro minus sucho", alos: "Pasmo L: ALOS-2 i NISAR" });
  Object.assign(en.L, { nisarwet: "NISAR: wet minus dry", alos: "L-band: ALOS-2 and NISAR" });
  Object.assign(pl.Lsub, { nisarwet: "pasmo L, HH: 24.08 (po deszczu) minus 25.06 (sucho), otwarty teren", alos: "ALOS-2 2015–2021, NISAR 2026; R = HH, G = HV, B = HH/HV" });
  Object.assign(en.Lsub, { nisarwet: "L-band HH: 24 Aug (after rain) minus 25 Jun (dry), open land", alos: "ALOS-2 2015–2021, NISAR 2026; R = HH, G = HV, B = HH/HV" });
  Object.assign(pl.lg, { nisarwet: "NISAR HH: mokro minus sucho", wetter: "jaśniej po deszczu: wilgotna gleba", drier: "ciemniej: żniwa, przesychanie", nisarL: "Radar NISAR, pasmo L, 2026" });
  Object.assign(en.lg, { nisarwet: "NISAR HH: wet minus dry", wetter: "brighter after rain: moist soil", drier: "darker: harvest, drying", nisarL: "NISAR radar, L-band, 2026" });
  Object.assign(pl.rb, {
    srcN: (n) => `NISAR (pasmo L), ${n} przelotów`,
    nisarWet: "NISAR: mokro minus sucho", nisarWetV: (p) => `HH, 25.06 → 24.08, otwarty teren; ${p} terenu jaśniej o 2 dB+`,
    nisarNoOpen: "brak otwartego terenu w zaznaczeniu",
    nisarUsed: (n, t, a, b, all) => `<b>NISAR</b> (pasmo L, 20 m): w obliczeniach ${n} przelotów orbity ${t} z plików GCOV (${a}–${b}, wersja provisional). Nad Poznaniem było ich razem ${all}.`,
  });
  Object.assign(en.rb, {
    srcN: (n) => `NISAR (L-band), ${n} passes`,
    nisarWet: "NISAR: wet minus dry", nisarWetV: (p) => `HH, 25 Jun → 24 Aug, open land; ${p} of it brighter by 2 dB+`,
    nisarNoOpen: "no open land in the selection",
    nisarUsed: (n, t, a, b, all) => `<b>NISAR</b> (L-band, 20 m): ${n} passes of track ${t} from the GCOV files are in the numbers (${a}–${b}, provisional release). ${all} passes flew over Poznań in all.`,
  });
  const fPl = window.I18N.pl.f.lband, fEn = window.I18N.en.f.lband;
  window.I18N.pl.f.lband = (d) => !d.nisar ? fPl(d) : ({ t: "NISAR: pasmo L w liczbach",
    b: `Oś czasu pasma L: ALOS-2 ${d.y0}–${d.y1}, potem NISAR 2026 (${d.n} przelotów).` + (d.wd
      ? ` Po deszczu 24.08 HH wzrósł o 2 dB lub więcej na ${d.wd.share}% otwartego terenu.` + (d.wd.flood == null ? "" : d.wd.sig
        ? ` W strefach podtopień PIG-PIB ${d.wd.ratio} razy częściej (${d.wd.flood}% wobec ${d.wd.out}%, ${d.wd.p}).`
        : ` W strefach podtopień PIG-PIB rzadziej (${d.wd.flood}% wobec ${d.wd.out}%). Nasza hipoteza: tam grunt jest wilgotny już w suchym czerwcu albo zarośnięty, więc różnica jest mniejsza; sprawdzi to pełny rok danych.`) : "") });
  window.I18N.en.f.lband = (d) => !d.nisar ? fEn(d) : ({ t: "NISAR: L-band in numbers",
    b: `The L-band time line: ALOS-2 ${d.y0}–${d.y1}, then NISAR 2026 (${d.n} passes).` + (d.wd
      ? ` After the rain of 24 Aug, HH rose by 2 dB or more on ${d.wd.share}% of open land.` + (d.wd.flood == null ? "" : d.wd.sig
        ? ` In PIG-PIB groundwater-flood areas ${d.wd.ratio} times as often (${d.wd.flood}% vs ${d.wd.out}%, ${d.wd.p}).`
        : ` Less often in PIG-PIB groundwater-flood areas (${d.wd.flood}% vs ${d.wd.out}%). Our hypothesis: the ground there is already moist in dry June or overgrown, so the difference is smaller; a full year of data will tell.`) : "") });
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
    note: (l, c) => `Las odróżnia się od otwartego terenu o ${l} dB w HV pasma L i o ${c} dB w VH pasma C. Dłuższa fala NISAR wnika w korony i widzi gałęzie oraz pnie.` });
  en.radarHtml = (m) => oEn(m) + table(m, { h: "L-band next to C-band over Poznań (medians, dB)", built: "built-up", forest: "forest", open: "open land",
    note: (l, c) => `Forest differs from open land by ${l} dB in L-band HV and by ${c} dB in C-band VH. NISAR's longer wave enters the crowns and sees branches and trunks.` });
})();
