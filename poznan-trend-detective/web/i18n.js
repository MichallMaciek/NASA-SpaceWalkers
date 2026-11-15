/* UI text in English and Polish. Functions receive numbers already formatted for the language. */
// Polish plural: plForm(n, "komórka", "komórki", "komórek") -> 1 komórka, 2 komórki, 5 komórek, 12 komórek, 22 komórki
function plForm(n, one, few, many) {
  const k = typeof n === "number" ? Math.abs(Math.round(n)) : +String(n).replace(/\D/g, "");
  return k === 1 ? one : k % 10 >= 2 && k % 10 <= 4 && (k % 100 < 12 || k % 100 > 14) ? few : many;
}
window.I18N = {
  en: {
    about: "About the data",
    searchLabel: "Search an address",
    searchPh: "Search an address or click a plot on the map…",
    layers: "Layers",
    opacity: "Opacity",
    borders: "Municipal borders and names",
    baseLayer: "Background",
    close: "Close",
    play: "Play", pause: "Pause",
    projection: "projection",
    howTitle: "How to read this test",
    how1: "The dashed line is the Theil-Sen trend: the median of the slopes between every pair of years, so one odd year cannot drag it around.",
    how2: "The Mann-Kendall test counts how often a later value is higher than an earlier one. The p-value is the chance of a pattern this consistent if there were no trend at all. Below 0.05 we call the trend significant.",
    numbers: "Show the numbers",
    groups: { growth: "City growth", forest: "Forest", heat: "Heat and greenness (NASA MODIS)", radar: "Terrain and radar", people: "People" },
    L: {
      built: "Built-up area, 1975–2035", prob: "Where the city grows next", forest: "Forest loss, 2001–2024",
      night: "Summer nights: trend", day: "Summer days: trend", ndvi: "Greenness: trend",
      year: "Summer nights, year by year", mean: "Summer nights: average",
      nisar: "NISAR radar passes (NASA-ISRO)", wuia: "Building permits (WUIA)", radar: "Radar brightness (Sentinel-1)", radarchange: "Radar change 2017–2024",
      dem: "Terrain height (TanDEM-X radar)", growthpop: "Population change", none: "Nothing",
    },
    Lsub: {
      built: "Landsat-based GHSL + our projection", prob: "chance of becoming built in 5 years", forest: "Landsat, 30 m, by year",
      night: "°C per decade, 2000–2024", day: "°C per decade, 2000–2024", ndvi: "NDVI per decade, 250 m",
      year: "°C, with a time slider", mean: "°C, 2000–2024, heat island",
      nisar: "NASA GIBS picture, all tracks; not used in the numbers", wuia: "2,420 building cases (GEOPOZ)", radar: "summer median, 2017–2024", radarchange: "new structures and clearings",
      dem: "with a water-level slider", growthpop: "% since 2000, GUS", none: "",
    },
    B: { map: "Map", streets: "Street map", orto: "Aerial photo, Poland (Geoportal)", poz2025: "Poznań 2025 aerial (GEOPOZ)", poz1940: "Poznań 2001 aerial (GEOPOZ)" },
    C: {
      year: "Year", since: "Show as new from", thr: "Counts as built from", horizon: "Five years starting", minProb: "Show chances above",
      from: "Cut from", to: "Cut until", minTree: "Forest means tree cover above", date: "Pass", rYear: "Summer",
      minDb: "Show surfaces brighter than", minChange: "Show changes larger than", water: "Water level", relief: "Relief shading",
    },
    legend: {
      builtOld: (y) => `Built before ${y}`, builtNew: "New, by period", builtProj: "Projected",
      prob: "Chance of turning built", forestLoss: "Year of loss", forestLeft: "Forest still standing",
      radar: "Backscatter (dB)", radarUp: "Brighter: new roofs, steel, concrete", radarDown: "Darker: cleared, flooded, removed",
      dem: "Metres above sea level", water: (m) => `Below ${m} m`, nisar: "Green: vegetation. Yellow/orange: buildings. Dark/blue: water, smooth ground.",
    },
    notSig: "No significant trend (p ≥ 0.05)",
    noData: "No data",
    caseTitle: "What the data shows",
    caseIntro: "Satellite data from NASA and partners, turned into numbers for every place around Poznań. Pick a finding, or search any address.",
    f: {
      sprawl: (d) => ({ t: "The city is spilling outwards", b: `Built-up land in the 18 municipalities grew from ${d.b1990}% to ${d.b2020}% of the area between 1990 and 2020. Poznań has lost ${d.pozLoss}% of its residents since 2000; ${d.top} gained over 200%.` }),
      forecast: (d) => ({ t: "Where the next estates will go", b: `Our model, tested on 2015–2020 data it never saw, ranks future building sites well (AUC ${d.auc}). At the recent pace, about ${d.ha} ha more will be built every 5 years.` }),
      prices: (d) => ({ t: "Flats got dearer, wages faster", b: `In Poznań the median price of a square metre rose ${d.pUp}% from 2015 to 2024 (GUS), while the average wage rose ${d.wUp}%. One month's pay bought ${d.r15} m² in 2015 and ${d.r24} m² in 2024.` }),
      forest: (d) => ({ t: "Where the trees fell", b: `About ${d.ha} ha of tree cover was lost across the area since 2001, most of it in ${d.top}.${d.trend}` }),
      nights: (d) => ({ t: "Every night is getting warmer", b: `Summer nights warmed significantly in ${d.share}% of ${d.n} one-kilometre squares. Not one cooled. Poznań: ${d.city} °C per decade.` }),
      days: (d) => ({ t: "By day, the heat follows the people", b: `The faster a municipality grew, the faster its summer days warmed (Spearman r = ${d.r}, ${d.p}, 18 municipalities).` }),
      station: (d) => ({ t: "The satellite agrees with the thermometer", b: `Above the Ławica weather station, summer nights from space and the station's minimum move together: r = ${d.r} over ${d.n} summers.` }),
    },
    place: {
      back: "Back to findings", in: "in", perDec: "per decade",
      sig: "Significant", notProven: "Not proven",
      faster: (p) => `Faster than ${p}% of squares in the area`, slower: (p) => `Slower than ${p}% of squares in the area`,
      greener: (p) => `Greening more than ${p}% of squares`, browner: (p) => `Losing green faster than ${p}% of squares`,
      outside: "Outside the 18 study municipalities. Click inside the outlined area.",
      growthH: "Building within 1 km", growthNow: (a, b) => `${a}% of the land in 1990, ${b}% in 2020`,
      growthProj: (c) => `Projected for 2030: ${c}%`, chance: (p) => `This 120 m square: ${p}% chance of being built up in 2025–2030`,
      alreadyBuilt: "This 120 m square is already built up.",
      projBuilt: "This 120 m square is among the first the model expects to be built up (2020–2025).",
      forestH: "Trees within 1 km", forestNone: "No forest here in 2000.",
      forestTxt: (a, b, yrs) => `${a} ha of forest in 2000; ${b} ha cut since${yrs ? `, mostly in ${yrs}` : ""}.`,
      heatH: "Heat and greenness, 1 km satellite square", night: "Summer nights", day: "Summer days", ndvi: "Greenness",
      terrainH: "Terrain and radar", elev: (m) => `${m} m above sea level`,
      radarTxt: (d) => `Radar brightness 2017 → 2024: ${d} dB`, radarUp: "brighter, typical of new buildings", radarDown: "darker, typical of clearing or water",
      pricesH: "Flat prices (GUS, median per m²)", priceNote: (u) => `Data for ${u}; GUS publishes prices per county, not per street.`,
      perWage: (a, b) => `One month's average pay buys ${a} m² (2015: ${b} m²)`,
      fullTest: "Open the full trend test", muni: "Municipality", pop: "Residents", built: "New dwellings 2000–2024",
    },
    test: {
      title: (where) => `Trend test: ${where}`,
      rising: (what, v, u) => `${what} is rising by ${v} ${u}. The trend is significant.`,
      falling: (what, v, u) => `${what} is falling by ${v} ${u}. The trend is significant.`,
      none: (what, v, u) => `No significant trend in ${what.toLowerCase()}. Best-fit change ${v} ${u}, but this could be chance.`,
      few: "Not enough years with data here to test.",
      slope: "Theil-Sen slope", S: "Mann-Kendall S", z: "z", p: "p-value", n: "Years used",
      year: "Year", value: "Value", trend: "Trend line", builtVar: "Built-up land within 1 km", perDecade: "per decade",
    },
    yearNote: "June–August mean of night overpasses",
    aboutHtml: `
      <p>Pick any place around Poznań and get a land check-up from space. SAR radar (NISAR, Sentinel-1, ALOS-2, EGMS) shows signs of new walls, how the surface responds to rain and harvest, and ground motion; satellite history adds building, forest, heat, greenness and terrain, each with a proper trend test.</p>
      <h3>NASA data</h3>
      <ul>
        <li>NISAR (NASA-ISRO) L-band radar: GCOV pixels of track 158 (provisional release) read from the HDF5 files; NASA GIBS mosaics only as a preview.</li>
        <li>MODIS Terra MOD11A2 v061 (surface temperature, 1 km) and MOD13Q1 v061 (NDVI, 250 m), 2000–2024.</li>
        <li>Landsat (NASA/USGS) is the source behind the built-up history (JRC GHSL) and the forest loss data (University of Maryland Global Forest Change v1.12).</li>
        <li>NASA POWER (MERRA-2) air temperature, as a cross-check.</li>
      </ul>
      <h3>Partner and local data</h3>
      <ul>
        <li>Sentinel-1 radar (ESA/Copernicus), summer medians 2017, 2020, 2024; Copernicus DEM GLO-30 (from the TanDEM-X radar mission).</li>
        <li>IMGW-PIB Poznań-Ławica station; GUS Bank Danych Lokalnych: residents, dwellings, flat prices per m², average wages.</li>
        <li>Aerial photos: Geoportal.gov.pl (GUGiK), GEOPOZ Poznań (2025, 2001). Roads and borders: OpenStreetMap (ODbL). Base map: OpenFreeMap (OpenStreetMap data).</li>
      </ul>
      <h3>Method</h3>
      <p>Trends: Theil-Sen slope; significance: two-sided Mann-Kendall test, α = 0.05. Growth projection: logistic regression on 120 m cells (nearby building, distance to main roads and to the Old Market, terrain, tree cover), trained on 2005–2015, tested on 2015–2020, then rolled forward in 5-year steps at the 2010–2020 pace.</p>
      <h3>Limits</h3>
      <ul>
        <li>Map cells are about 73 m on the ground (120 m in Web Mercator): they show estates and streets, not single houses.</li>
        <li>The projection assumes the next years look like 2010–2020: no new roads, plans or crises are known to the model.</li>
        <li>Flat prices exist only per county (Poznań city, Poznań county), not per address.</li>
        <li>Surface temperature is roofs and ground, not air. Mann-Kendall assumes independent years.</li>
      </ul>
      <h3>Use of AI tools</h3>
      <p>The team used Claude (an AI assistant) to write the data pipeline and this app and to draft text. Every number is computed by the pipeline from the sources above; the statistics were checked against SciPy.</p>`,
  },

  pl: {
    about: "O danych",
    searchLabel: "Szukaj adresu",
    searchPh: "Szukaj adresu lub kliknij działkę na mapie…",
    layers: "Warstwy",
    opacity: "Krycie",
    borders: "Granice i nazwy gmin",
    baseLayer: "Podkład",
    close: "Zamknij",
    play: "Odtwórz", pause: "Pauza",
    projection: "prognoza",
    howTitle: "Jak czytać ten test",
    how1: "Przerywana linia to trend Theila-Sena: mediana nachyleń między każdą parą lat, więc jeden nietypowy rok jej nie przesunie.",
    how2: "Test Manna-Kendalla liczy, jak często późniejsza wartość jest wyższa od wcześniejszej. Wartość p to szansa na tak spójny wzór, gdyby trendu nie było. Poniżej 0,05 uznajemy trend za istotny.",
    numbers: "Pokaż liczby",
    groups: { growth: "Rozwój miasta", forest: "Las", heat: "Ciepło i zieleń (NASA MODIS)", radar: "Teren i radar", people: "Ludzie" },
    L: {
      built: "Zabudowa 1975–2035", prob: "Gdzie miasto urośnie", forest: "Wycinka lasu 2001–2024",
      night: "Letnie noce: trend", day: "Letnie dni: trend", ndvi: "Zieleń: trend",
      year: "Letnie noce rok po roku", mean: "Letnie noce: średnia",
      nisar: "Przeloty radaru NISAR (NASA-ISRO)", wuia: "Decyzje budowlane (WUIA)", radar: "Jasność radaru (Sentinel-1)", radarchange: "Zmiana radaru 2017–2024",
      dem: "Wysokość terenu (radar TanDEM-X)", growthpop: "Zmiana liczby mieszkańców", none: "Nic",
    },
    Lsub: {
      built: "GHSL z Landsata + nasza prognoza", prob: "szansa zabudowy w 5 lat", forest: "Landsat, 30 m, rok po roku",
      night: "°C na dekadę, 2000–2024", day: "°C na dekadę, 2000–2024", ndvi: "NDVI na dekadę, 250 m",
      year: "°C, z suwakiem czasu", mean: "°C, 2000–2024, wyspa ciepła",
      nisar: "obraz NASA GIBS, wszystkie orbity; nie do liczb", wuia: "2 420 spraw budowlanych (GEOPOZ)", radar: "mediana z lata, 2017–2024", radarchange: "nowe budynki i wycinki",
      dem: "z suwakiem poziomu wody", growthpop: "% od 2000, GUS", none: "",
    },
    B: { map: "Mapa", streets: "Mapa ulic", orto: "Ortofotomapa Polski (Geoportal)", poz2025: "Poznań 2025, ortofoto (GEOPOZ)", poz1940: "Poznań 2001, ortofoto (GEOPOZ)" },
    C: {
      year: "Rok", since: "Pokaż jako nowe od", thr: "Zabudowa od", horizon: "Pięciolecie od", minProb: "Pokaż szanse powyżej",
      from: "Wycięte od", to: "Wycięte do", minTree: "Las to pokrycie drzewami od", date: "Przelot", rYear: "Lato",
      minDb: "Pokaż jaśniejsze niż", minChange: "Pokaż zmiany większe niż", water: "Poziom wody", relief: "Cieniowanie rzeźby",
    },
    legend: {
      builtOld: (y) => `Zabudowane przed ${y}`, builtNew: "Nowe, według okresu", builtProj: "Prognoza",
      prob: "Szansa zabudowy", forestLoss: "Rok wycinki", forestLeft: "Las, który stoi",
      radar: "Odbicie radaru (dB)", radarUp: "Jaśniej: nowe dachy, stal, beton", radarDown: "Ciemniej: wycinka, woda, rozbiórka",
      dem: "Metry n.p.m.", water: (m) => `Poniżej ${m} m`, nisar: "Zielony: roślinność. Żółty/pomarańczowy: zabudowa. Ciemny/niebieski: woda, gładki grunt.",
    },
    notSig: "Brak istotnego trendu (p ≥ 0,05)",
    noData: "Brak danych",
    caseTitle: "Co pokazują dane",
    caseIntro: "Dane satelitarne NASA i partnerów zamienione na liczby dla każdego miejsca wokół Poznania. Wybierz ustalenie albo wyszukaj adres.",
    f: {
      sprawl: (d) => ({ t: "Miasto rozlewa się na zewnątrz", b: `Zabudowa w 18 gminach urosła z ${d.b1990}% do ${d.b2020}% powierzchni w latach 1990–2020. Poznań stracił od 2000 r. ${d.pozLoss}% mieszkańców, a ${d.top} zyskały ponad 200%.` }),
      forecast: (d) => ({ t: "Gdzie staną kolejne osiedla", b: `Nasz model, sprawdzony na danych 2015–2020, których nie widział, dobrze wskazuje przyszłe miejsca zabudowy (AUC ${d.auc}). W ostatnim tempie przybywa ok. ${d.ha} ha zabudowy co 5 lat.` }),
      prices: (d) => ({ t: "Mieszkania drożeją, pensje szybciej", b: `W Poznaniu mediana ceny m² wzrosła o ${d.pUp}% w latach 2015–2024 (GUS), a przeciętna pensja o ${d.wUp}%. Za miesięczną pensję można było kupić ${d.r15} m² w 2015 r. i ${d.r24} m² w 2024 r.` }),
      forest: (d) => ({ t: "Gdzie ubyło drzew", b: `Od 2001 r. w okolicy zniknęło ok. ${d.ha} ha pokrycia drzewami, najwięcej w gminach: ${d.top}.${d.trend}` }),
      nights: (d) => ({ t: "Każda noc jest coraz cieplejsza", b: `Letnie noce ociepliły się istotnie w ${d.share}% z ${d.n} ${plForm(d.n, "kwadratu kilometrowego", "kwadratów kilometrowych", "kwadratów kilometrowych")}. Żaden się nie ochłodził. Poznań: ${d.city} °C na dekadę.` }),
      days: (d) => ({ t: "W dzień ciepło idzie za ludźmi", b: `Im szybciej rosła gmina, tym szybciej ocieplały się jej letnie dni (Spearman r = ${d.r}, ${d.p}, 18 gmin).` }),
      station: (d) => ({ t: "Satelita zgadza się z termometrem", b: `Nad stacją Ławica letnie noce mierzone z kosmosu i minimum na stacji idą w parze: r = ${d.r} w ${d.n} latach.` }),
    },
    place: {
      back: "Wróć do ustaleń", in: "w gminie", perDec: "na dekadę",
      sig: "Istotny", notProven: "Nieudowodniony",
      faster: (p) => `Szybciej niż ${p}% kwadratów w okolicy`, slower: (p) => `Wolniej niż ${p}% kwadratów w okolicy`,
      greener: (p) => `Zieleni się bardziej niż ${p}% kwadratów`, browner: (p) => `Traci zieleń szybciej niż ${p}% kwadratów`,
      outside: "Poza 18 badanymi gminami. Kliknij w obrębie zaznaczonego obszaru.",
      growthH: "Zabudowa w promieniu 1 km", growthNow: (a, b) => `${a}% terenu w 1990 r., ${b}% w 2020 r.`,
      growthProj: (c) => `Prognoza na 2030: ${c}%`, chance: (p) => `Ten kwadrat 120 m: ${p}% szans na zabudowę w latach 2025–2030`,
      alreadyBuilt: "Ten kwadrat 120 m jest już zabudowany.",
      projBuilt: "Ten kwadrat 120 m jest wśród pierwszych, które model widzi jako zabudowane (2020–2025).",
      forestH: "Drzewa w promieniu 1 km", forestNone: "W 2000 r. nie było tu lasu.",
      forestTxt: (a, b, yrs) => `${a} ha lasu w 2000 r.; od tego czasu wycięto ${b} ha${yrs ? `, najwięcej w latach ${yrs}` : ""}.`,
      heatH: "Ciepło i zieleń, kwadrat satelitarny 1 km", night: "Letnie noce", day: "Letnie dni", ndvi: "Zieleń",
      terrainH: "Teren i radar", elev: (m) => `${m} m n.p.m.`,
      radarTxt: (d) => `Jasność radaru 2017 → 2024: ${d} dB`, radarUp: "jaśniej, typowe dla nowej zabudowy", radarDown: "ciemniej, typowe dla wycinki lub wody",
      pricesH: "Ceny mieszkań (GUS, mediana za m²)", priceNote: (u) => `Dane dla: ${u}. GUS podaje ceny dla powiatów, nie ulic.`,
      perWage: (a, b) => `Za przeciętną pensję: ${a} m² (2015: ${b} m²)`,
      fullTest: "Otwórz pełny test trendu", muni: "Gmina", pop: "Mieszkańcy", built: "Nowe mieszkania 2000–2024",
    },
    test: {
      title: (where) => `Test trendu: ${where}`,
      rising: (what, v, u) => `${what}: wzrost o ${v} ${u}. Trend jest istotny.`,
      falling: (what, v, u) => `${what}: spadek o ${v} ${u}. Trend jest istotny.`,
      none: (what, v, u) => `${what}: brak istotnego trendu. Dopasowana zmiana ${v} ${u}, ale może to być przypadek.`,
      few: "Za mało lat z danymi, żeby wykonać test.",
      slope: "Nachylenie Theila-Sena", S: "S Manna-Kendalla", z: "z", p: "Wartość p", n: "Użyte lata",
      year: "Rok", value: "Wartość", trend: "Linia trendu", builtVar: "Zabudowa w promieniu 1 km", perDecade: "na dekadę",
    },
    yearNote: "Średnia z nocnych przelotów, czerwiec–sierpień",
    aboutHtml: `
      <p>Wybierz dowolne miejsce wokół Poznania i zrób mu przegląd z kosmosu. Radar SAR (NISAR, Sentinel-1, ALOS-2, EGMS) pokazuje ślady nowych ścian, reakcję powierzchni na deszcz i żniwa oraz ruch gruntu; historia z satelitów dodaje zabudowę, las, ciepło, zieleń i teren, każde z rzetelnym testem trendu.</p>
      <h3>Dane NASA</h3>
      <ul>
        <li>NISAR (NASA-ISRO), radar w paśmie L: piksele GCOV orbity 158 (wersja provisional) czytane z plików HDF5; mozaiki NASA GIBS tylko do podglądu.</li>
        <li>MODIS Terra MOD11A2 v061 (temperatura powierzchni, 1 km) i MOD13Q1 v061 (NDVI, 250 m), 2000–2024.</li>
        <li>Landsat (NASA/USGS) to źródło historii zabudowy (JRC GHSL) i danych o wycince (University of Maryland, Global Forest Change v1.12).</li>
        <li>NASA POWER (MERRA-2): temperatura powietrza, do porównania.</li>
      </ul>
      <h3>Dane partnerów i lokalne</h3>
      <ul>
        <li>Radar Sentinel-1 (ESA/Copernicus), mediany z lata 2017, 2020, 2024; Copernicus DEM GLO-30 (z misji radarowej TanDEM-X).</li>
        <li>Stacja IMGW-PIB Poznań-Ławica; GUS Bank Danych Lokalnych: mieszkańcy, mieszkania, ceny m², przeciętne płace.</li>
        <li>Ortofotomapy: Geoportal.gov.pl (GUGiK), GEOPOZ Poznań (2025, 2001). Drogi i granice: OpenStreetMap (ODbL). Podkład: OpenFreeMap (dane OpenStreetMap).</li>
      </ul>
      <h3>Metoda</h3>
      <p>Trendy: nachylenie Theila-Sena; istotność: dwustronny test Manna-Kendalla, α = 0,05. Prognoza zabudowy: regresja logistyczna na komórkach 120 m (zabudowa w pobliżu, odległość od głównych dróg i od Starego Rynku, rzeźba terenu, pokrycie drzewami), uczona na latach 2005–2015, sprawdzona na 2015–2020, potem rzutowana co 5 lat w tempie z lat 2010–2020.</p>
      <h3>Ograniczenia</h3>
      <ul>
        <li>Komórki mapy mają w terenie ok. 73 m (120 m w odwzorowaniu Web Mercator): pokazują osiedla i ulice, nie pojedyncze domy.</li>
        <li>Prognoza zakłada, że kolejne lata będą jak 2010–2020: model nie zna nowych dróg, planów ani kryzysów.</li>
        <li>Ceny mieszkań są tylko dla powiatów (Poznań, powiat poznański), nie dla adresów.</li>
        <li>Temperatura powierzchni to dachy i grunt, nie powietrze. Test Manna-Kendalla zakłada niezależne lata.</li>
      </ul>
      <h3>Użycie narzędzi SI</h3>
      <p>Zespół użył Claude (asystenta SI) do napisania przetwarzania danych i tej aplikacji oraz do szkiców tekstu. Każda liczba jest liczona przez skrypty z powyższych źródeł; statystyka została sprawdzona z biblioteką SciPy.</p>`,
  },
};

/* ---- UI v4 (layout from the team's prototype) ---- */
window.I18N.pl.ui = {
  searchLabel: "Szukaj adresu", searchPh: "Szukaj adresu lub kliknij działkę na mapie…",
  tools: "Narzędzia rysowania", drawFree: "Obrysuj obszar odręcznie", drawPoly: "Narysuj wielokąt", clearArea: "Usuń zaznaczenie",
  settings: "Ustawienia mapy", zoomIn: "Przybliż", zoomOut: "Oddal", close: "Zamknij", play: "Odtwórz", pause: "Pauza", year: "Rok",
  measured: "Dane z pomiarów", predicted: "Predykcja", modelForecast: "prognoza modelu", fromMeasurements: "dane z pomiarów", fromRadar: "dane z pomiarów radaru", today: "Dziś",
  lg: {
    built: "Intensywność zabudowy", low: "niska", high: "wysoka", projected: "Prognozowana zabudowa",
    radarNew: (a, b) => `nowa zabudowa wg radaru (Sentinel-1, NISAR), ${a === b ? a : `${a}–${b}`}`,
    forest: "Wycinka lasów (rok)", forestLeft: "Las z 2000 r., który stoi",
    price: (y) => `Cena za m² (GUS), ${y}`, activity: "Aktywność terenu, radar 2017–2024",
    brighter: "Jaśniej: nowe dachy, stal, beton", darker: "Ciemniej: wycinka, woda, rozbiórka",
    dem: "Wysokość terenu (TanDEM-X)", radar: (y) => `Jasność odbicia, Sentinel-1, lato ${y}`,
    nisar: (d) => `Radar NISAR, przelot ${d}`, nisarNote: "Zielony: roślinność. Żółty: zabudowa. Ciemny: woda, gładki grunt.",
    nightyear: (y) => `Letnie noce, ${y} (MODIS)`,
  },
  L: {
    built: "Urbanizacja", forest: "Wycinka lasów", price: "Ceny za m²", activity: "Aktywność terenu",
    dem: "Wysokość terenu", radar: "Jasność odbicia", nisar: "Radar NISAR (NASA-ISRO)", wuia: "Decyzje budowlane WUIA",
    night: "Letnie noce: trend", day: "Letnie dni: trend", ndvi: "Zieleń: trend", nightyear: "Letnie noce rok po roku",
  },
  Lsub: {
    built: "GHSL (Landsat) 1975–2020 + prognoza", forest: "Landsat, Global Forest Change", price: "GUS, powiaty, 2010–2025",
    activity: "zmiana radaru Sentinel-1 2017→2024", dem: "Copernicus DEM z radaru TanDEM-X", radar: "Sentinel-1, mediana z lata",
    nisar: "mozaiki NASA GIBS, wszystkie orbity; tylko podgląd", night: "MODIS, °C na dekadę", day: "MODIS, °C na dekadę", ndvi: "MODIS, NDVI na dekadę", nightyear: "MODIS, rok z osi czasu",
  },
  opacity: "Krycie", demRange: "Wysokość terenu", asl: "n.p.m.", radarRange: "Jasność odbicia", to: "do",
  radarHint: (y) => `Lato ${y}, najbliższe roku na osi czasu`, minChange: "Pokaż zmiany większe niż", pass: "Przelot",
  secLayers: "WARSTWY", secSar: "DANE SAR", secPred: "PREDYKCJA", secNasa: "CIEPŁO I ZIELEŃ (NASA MODIS)", secBase: "PODKŁAD", secSources: "ŹRÓDŁO DANYCH",
  horizon: "Horyzont", years5: "5 lat", years10: "10 lat", minChance: "Minimalna szansa zabudowy",
  chanceHint: (hit, oauc) => `Model sprawdzony na latach 2015–2020: trafił ${hit}% nowych miejsc zabudowy; na otwartym terenie AUC ${oauc}.`,
  baseMap: "Mapa",
  footer: "NASA MODIS, NISAR, Landsat (GHSL, GFC) · Sentinel-1 · GUS · stan danych 11.2026",
  lossYear: "Wycinka", dec: "dekadę",
  hintFree: "Obrysuj obszar na mapie. Puść, aby zamknąć kształt.", hintPoly: "Klikaj, aby dodać wierzchołki. Kliknij dwukrotnie, aby zamknąć.",
  selectedArea: "Zaznaczony obszar", selectedPlace: "Wybrane miejsce", loading: "Liczę dane dla tego miejsca…", loadFail: "Nie udało się pobrać części danych dla tego miejsca. Sprawdź połączenie i spróbuj ponownie.", retry: "Spróbuj ponownie", clear: "Wyczyść zaznaczenie",
  radius1km: "1 km wokół punktu", forecastFor: (y) => `prognoza na ${y}`, untilYear: (y) => `do ${y}`,
  sinceYear: (b, s) => `od ${b} · ${s}% terenu`, shareOfLand: "terenu zabudowane",
  forestAtRisk: "las w miejscach prognozowanej zabudowy", forestFrom2001: "dane od 2001 r.",
  priceFrom: (y) => `dane od ${y} r.`, approx: "ok.", priceTrend: (a, b) => `trend GUS ${a}–${b}`,
  cityUnit: "miasto Poznań", countyUnit: "powiat poznański",
  chip: (hit) => `Prognoza · model trafił ${hit}% w teście 2015–2020`,
  forecastNote: "Prognoza, nie pomiar. Model opiera się na sieci dróg i zabudowie z lat 2005–2020; cena to przedłużony trend GUS.",
  wageNote: (r, y) => `Cena za m² to ${r} przeciętnej miesięcznej pensji (GUS, ${y}).`,
  riskTitle: "Wskaźnik ryzyka zabudowy", riskBuilt: "To miejsce jest już zabudowane albo model widzi je jako zabudowane do 2025 r.",
  risk1: "niskie", risk2: "umiarkowane", risk3: "podwyższone", risk4: "wysokie", risk5: "bardzo wysokie",
  riskText: (c, s, open) => `${c}% szans, że wolny teren zostanie zabudowany w latach 2025–2030. To więcej niż w ${s}% wolnych miejsc w 18 gminach.${open != null ? ` Wolny teren to ${open}% zaznaczenia.` : ""} Ranking z modelu, nie wyrok.`,
  rowBuilt: "Zabudowa", rowForest: "Las", rowPrice: "Cena za m²", builtShare: "Udział zabudowy",
  heatH: (n) => `Ciepło i zieleń (${n} ${plForm(n, "kwadrat", "kwadraty", "kwadratów")} MODIS 1 km)`, moreData: "Więcej danych",
  terrainH: "Teren i radar", elevMean: "Średnia wysokość", radarChange: "Zmiana jasności radaru 2017→2024",
  hide: "Zwiń", show: "Rozwiń",
  caseIntro: "Dane satelitarne zamienione na liczby dla każdego miejsca wokół Poznania. Wyszukaj adres, kliknij mapę albo obrysuj obszar.",
};
window.I18N.en.ui = {
  searchLabel: "Search an address", searchPh: "Search an address or click a plot on the map…",
  tools: "Drawing tools", drawFree: "Draw an area freehand", drawPoly: "Draw a polygon", clearArea: "Clear selection",
  settings: "Map settings", zoomIn: "Zoom in", zoomOut: "Zoom out", close: "Close", play: "Play", pause: "Pause", year: "Year",
  measured: "Measured data", predicted: "Prediction", modelForecast: "model forecast", fromMeasurements: "measured", fromRadar: "measured by radar", today: "Today",
  lg: {
    built: "Built-up intensity", low: "low", high: "high", projected: "Projected building",
    radarNew: (a, b) => `new building seen by radar (Sentinel-1, NISAR), ${a === b ? a : `${a}–${b}`}`,
    forest: "Forest loss (year)", forestLeft: "Forest of 2000 still standing",
    price: (y) => `Price per m² (GUS), ${y}`, activity: "Ground activity, radar 2017–2024",
    brighter: "Brighter: new roofs, steel, concrete", darker: "Darker: clearing, water, demolition",
    dem: "Terrain height (TanDEM-X)", radar: (y) => `Radar brightness, Sentinel-1, summer ${y}`,
    nisar: (d) => `NISAR radar, pass of ${d}`, nisarNote: "Green: vegetation. Yellow: buildings. Dark: water, smooth ground.",
    nightyear: (y) => `Summer nights, ${y} (MODIS)`,
  },
  L: {
    built: "Urbanisation", forest: "Forest loss", price: "Prices per m²", activity: "Ground activity",
    dem: "Terrain height", radar: "Radar brightness", nisar: "NISAR radar (NASA-ISRO)",
    night: "Summer nights: trend", day: "Summer days: trend", ndvi: "Greenness: trend", nightyear: "Summer nights year by year",
  },
  Lsub: {
    built: "GHSL (Landsat) 1975–2020 + projection", forest: "Landsat, Global Forest Change", price: "GUS, counties, 2010–2025",
    activity: "Sentinel-1 radar change 2017→2024", dem: "Copernicus DEM from TanDEM-X radar", radar: "Sentinel-1, summer median",
    nisar: "NASA GIBS mosaics, all tracks; preview only", night: "MODIS, °C per decade", day: "MODIS, °C per decade", ndvi: "MODIS, NDVI per decade", nightyear: "MODIS, year from the timeline",
  },
  opacity: "Opacity", demRange: "Terrain height", asl: "a.s.l.", radarRange: "Radar brightness", to: "to",
  radarHint: (y) => `Summer ${y}, closest to the timeline year`, minChange: "Show changes larger than", pass: "Pass",
  secLayers: "LAYERS", secSar: "SAR DATA", secPred: "PREDICTION", secNasa: "HEAT AND GREENNESS (NASA MODIS)", secBase: "BACKGROUND", secSources: "DATA SOURCES",
  horizon: "Horizon", years5: "5 years", years10: "10 years", minChance: "Minimum chance of building",
  chanceHint: (hit, oauc) => `Tested on 2015–2020: the model found ${hit}% of newly built cells; on open land AUC ${oauc}.`,
  baseMap: "Map",
  footer: "NASA MODIS, NISAR, Landsat (GHSL, GFC) · Sentinel-1 · GUS · data as of 11.2026",
  lossYear: "Trees lost", dec: "decade",
  hintFree: "Trace an area on the map. Release to close the shape.", hintPoly: "Click to add corners. Double-click to close.",
  selectedArea: "Selected area", selectedPlace: "Selected place", loading: "Computing this place…", loadFail: "Some data for this place did not load. Check your connection and try again.", retry: "Try again", clear: "Clear selection",
  radius1km: "1 km around the point", forecastFor: (y) => `forecast for ${y}`, untilYear: (y) => `by ${y}`,
  sinceYear: (b, s) => `since ${b} · ${s}% of land`, shareOfLand: "of land built up",
  forestAtRisk: "forest where building is projected", forestFrom2001: "data from 2001",
  priceFrom: (y) => `data from ${y}`, approx: "about", priceTrend: (a, b) => `GUS trend ${a}–${b}`,
  cityUnit: "Poznań city", countyUnit: "Poznań county",
  chip: (hit) => `Forecast · the model found ${hit}% in the 2015–2020 test`,
  forecastNote: "A forecast, not a measurement. The model uses the road network and building from 2005–2020; the price extends the GUS trend.",
  wageNote: (r, y) => `A square metre costs ${r} average monthly wages (GUS, ${y}).`,
  riskTitle: "Building-risk score", riskBuilt: "This place is already built up, or the model sees it built by 2025.",
  risk1: "low", risk2: "moderate", risk3: "elevated", risk4: "high", risk5: "very high",
  riskText: (c, s, open) => `${c}% chance that open land here is built on in 2025–2030. That is higher than ${s}% of open places in the 18 municipalities.${open != null ? ` Open land is ${open}% of the selection.` : ""} A ranking from the model, not a verdict.`,
  rowBuilt: "Building", rowForest: "Forest", rowPrice: "Price per m²", builtShare: "Built-up share",
  heatH: (n) => `Heat and greenness (${n} MODIS 1 km square${n === 1 ? "" : "s"})`, moreData: "More data",
  terrainH: "Terrain and radar", elevMean: "Mean height", radarChange: "Radar brightness change 2017→2024",
  hide: "Collapse", show: "Expand",
  caseIntro: "Satellite data turned into numbers for every place around Poznań. Search an address, click the map, or draw an area.",
};
window.I18N.pl.f.forecast = (d) => ({ t: "Gdzie staną kolejne osiedla", b: `Model sprawdzony na latach 2015–2020, których nie widział, wskazał trafnie ${d.hit}% miejsc nowej zabudowy. W ostatnim tempie przybywa ok. ${d.ha} ha zabudowy co 5 lat.` });
window.I18N.en.f.forecast = (d) => ({ t: "Where the next estates will go", b: `Tested on 2015–2020 data it never saw, the model correctly flagged ${d.hit}% of newly built places. At the recent pace, about ${d.ha} ha more is built every 5 years.` });
window.I18N.pl.B = { map: "Mapa", orto: "Ortofotomapa (Geoportal)", poz2025: "Poznań 2025 (GEOPOZ)", poz1940: "Poznań 2001 (GEOPOZ)" };
window.I18N.en.B = { map: "Map", orto: "Aerial photo (Geoportal)", poz2025: "Poznań 2025 (GEOPOZ)", poz1940: "Poznań 2001 (GEOPOZ)" };
window.I18N.pl.ui.riskScale = "Skala: niskie poniżej 0,5%, umiarkowane do 2%, podwyższone do 5%, wysokie do 15%, bardzo wysokie powyżej 15% szans w 5 lat.";
window.I18N.en.ui.riskScale = "Scale: low below 0.5%, moderate to 2%, elevated to 5%, high to 15%, very high above 15% chance in 5 years.";
window.I18N.pl.ui.chk = {
  title: "Przegląd techniczny terenu", ok: "w normie", warn: "uwaga", risk: "ryzyko", info: "info",
  built: "Zabudowa wokół", builtV: (a, b, c) => `${a}% terenu w 2005 r. → ${b}% w 2020 r.; prognoza na 2030: ${c}%.`, builtNew: (b, c) => `${b}% terenu w 2020 r.; prognoza na 2030: ${c}%.`,
  next: "Wolny teren obok", nextV: (p) => `${p}% szans na zabudowę w latach 2025–2030 (model).`,
  trees: "Wycinka drzew", treesV: (ha) => `${ha} ha drzew wycięto tu w latach 2001–2024 (Landsat).`,
  heat: "Upał w dzień", heatV: (v, pc) => `Letnie dni ocieplają się o ${v} °C na dekadę, szybciej niż w ${pc}% okolicy (MODIS).`, heatNs: "Brak istotnego trendu letnich dni (MODIS).",
  water: "Ukształtowanie terenu", waterLow: (m) => `Miejsce leży ok. ${m} m niżej niż teren w promieniu 500 m: woda może się tu zbierać.`, waterOk: (m) => `${m} m względem terenu w promieniu 500 m: nie jest to obniżenie.`, isok: "Oficjalna mapa powodziowa ISOK",
  radar: "Zmiany na gruncie (radar)", radarBusy: (p) => `${p}% terenu wyraźnie pojaśniało w radarze 2017→2024: nowe dachy, hale lub place budowy.`, radarQuiet: "Brak wyraźnych zmian w radarze 2017→2024.",
  note: "Przegląd z danych satelitarnych, nie zastępuje planu miejscowego (MPZP), mapy ISOK ani badań geotechnicznych.",
};
window.I18N.en.ui.chk = {
  title: "Technical inspection of the land", ok: "fine", warn: "check", risk: "risk", info: "info",
  built: "Building around", builtV: (a, b, c) => `${a}% of land in 2005 → ${b}% in 2020; projected for 2030: ${c}%.`, builtNew: (b, c) => `${b}% of land in 2020; projected for 2030: ${c}%.`,
  next: "Open land next door", nextV: (p) => `${p}% chance of being built on in 2025–2030 (model).`,
  trees: "Trees cut", treesV: (ha) => `${ha} ha of trees were cut here in 2001–2024 (Landsat).`,
  heat: "Daytime heat", heatV: (v, pc) => `Summer days are warming by ${v} °C per decade, faster than ${pc}% of the area (MODIS).`, heatNs: "No significant trend in summer days (MODIS).",
  water: "Lie of the land", waterLow: (m) => `This spot sits about ${m} m below the ground within 500 m: water can gather here.`, waterOk: (m) => `${m} m relative to the ground within 500 m: not a hollow.`, isok: "Official ISOK flood map",
  radar: "Changes on the ground (radar)", radarBusy: (p) => `${p}% of the land got clearly brighter on radar 2017→2024: new roofs, sheds or building sites.`, radarQuiet: "No clear radar changes 2017→2024.",
  note: "A check from satellite data. It does not replace the local zoning plan (MPZP), the ISOK flood map or a soil survey.",
};
window.I18N.pl.ui.chk.waterAreaLow = (p) => `${p}% zaznaczenia leży w obniżeniach (1,5 m lub więcej poniżej otoczenia): tam woda może się zbierać.`;
window.I18N.pl.ui.chk.waterAreaOk = (p) => `Tylko ${p}% zaznaczenia leży w obniżeniach terenu.`;
window.I18N.en.ui.chk.waterAreaLow = (p) => `${p}% of the selection lies in hollows (1.5 m or more below the surroundings), where water can gather.`;
window.I18N.en.ui.chk.waterAreaOk = (p) => `Only ${p}% of the selection lies in hollows.`;
window.I18N.pl.ui.chk.waterTrees = "Tu rosną drzewa albo gęsto stoją budynki, a model wysokości mierzy ich wierzchołki. Nie oceniamy więc, czy teren leży w obniżeniu.";
window.I18N.en.ui.chk.waterTrees = "Trees or dense buildings stand here and the height model measures their tops, so we do not judge whether the ground lies in a hollow.";
Object.assign(window.I18N.pl.ui.L, { flood: "Podtopienia (PIG-PIB)" });
Object.assign(window.I18N.pl.ui.Lsub, { flood: "zagrożenie powodzią od wód gruntowych" });
Object.assign(window.I18N.pl.ui.lg, { flood: "Obszar zagrożony podtopieniami (PIG-PIB)", floodNote: "Woda gruntowa może podnosić się do piwnic, dane PIG-PIB" });
Object.assign(window.I18N.pl.ui.chk, {
  flood: "Woda gruntowa (podtopienia)",
  floodIn: "Miejsce leży w obszarze zagrożonym powodzią od wód gruntowych według Państwowego Instytutu Geologicznego (PIG-PIB). Sprawdź izolację piwnicy i fundamentów.",
  floodOut: "Poza obszarami zagrożonymi podtopieniami według PIG-PIB.",
  floodArea: (p) => `${p}% zaznaczenia leży w obszarze zagrożonym podtopieniami według PIG-PIB.`,
});
Object.assign(window.I18N.en.ui.L, { flood: "Groundwater flooding (PIG-PIB)" });
Object.assign(window.I18N.en.ui.Lsub, { flood: "areas at risk of groundwater flooding" });
Object.assign(window.I18N.en.ui.lg, { flood: "Area at risk of groundwater flooding (PIG-PIB)", floodNote: "Groundwater can rise into basements, Polish Geological Institute data" });
Object.assign(window.I18N.en.ui.chk, {
  flood: "Groundwater (flooding)",
  floodIn: "This spot lies in an area at risk of groundwater flooding according to the Polish Geological Institute (PIG-PIB). Check basement and foundation waterproofing.",
  floodOut: "Outside the areas at risk of groundwater flooding (PIG-PIB).",
  floodArea: (p) => `${p}% of the selection lies in an area at risk of groundwater flooding (PIG-PIB).`,
});
window.I18N.pl.ui.chk.note = "Przegląd z danych satelitarnych i PIG-PIB, nie zastępuje planu miejscowego (MPZP), mapy powodziowej ISOK ani badań gruntu.";
window.I18N.en.ui.chk.note = "A check from satellite and PIG-PIB data. It does not replace the local zoning plan (MPZP), the ISOK flood map or a soil survey.";
window.I18N.pl.ui.themeToggle = "Tryb jasny / ciemny";
window.I18N.en.ui.themeToggle = "Light / dark mode";
window.I18N.pl.ui.hintFree = "Przytrzymaj i obrysuj obszar palcem lub myszą. Puść, aby zamknąć kształt.";
window.I18N.pl.ui.hintPoly = "Klikaj, aby postawić wierzchołki obszaru.";
window.I18N.pl.ui.hintPolyClose = "Zamknij: kliknij pierwszy punkt, kliknij dwukrotnie albo Enter. Backspace cofa punkt.";
window.I18N.pl.ui.drawTooSmall = "Obszar za mały. Narysuj go jeszcze raz.";
window.I18N.en.ui.hintFree = "Press and trace an area with your finger or mouse. Release to close the shape.";
window.I18N.en.ui.hintPoly = "Click to place the corners of the area.";
window.I18N.en.ui.hintPolyClose = "Close it: click the first point, double-click or press Enter. Backspace removes a point.";
window.I18N.en.ui.drawTooSmall = "That area is too small. Draw it again.";
// built-up change on the card is in percentage points (a relative change explodes from small bases)
window.I18N.pl.ui.pp = "p.p.";
window.I18N.en.ui.pp = "pp";

// QA pass (14 Nov 2026): the search says when there is nothing to pick; building decisions explain their colours
window.I18N.pl.ui.searchNone = "Nic nie znaleziono w okolicy Poznania. Spróbuj innego adresu albo kliknij miejsce na mapie.";
window.I18N.pl.ui.searchFail = "Wyszukiwarka adresów chwilowo nie działa. Kliknij miejsce na mapie.";
window.I18N.en.ui.searchNone = "Nothing found around Poznań. Try another address or click a place on the map.";
window.I18N.en.ui.searchFail = "The address search is not available right now. Click a place on the map.";
Object.assign(window.I18N.pl.ui.lg, { wuiaNew: "nowa budowa", wuiaExt: "rozbudowa", wuiaOther: "inne decyzje" });
Object.assign(window.I18N.en.ui.lg, { wuiaNew: "new building", wuiaExt: "extension", wuiaOther: "other decisions" });
