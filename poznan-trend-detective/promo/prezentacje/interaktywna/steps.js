/*
  SARnik: interaktywny pitch na 3 minuty. TU edytujesz treść; silnik jest w index.html.

  Każdy krok to jeden wpis w STEPS. Spacja przechodzi do następnego.
  Rodzaje kroków (kind):
    "text"   duży tekst na pustym tle: lines = [linia1, linia2]
    "shot"   zrzut aplikacji z kamerą: img, layout, view, opcjonalnie focus
    "stat"   wielka liczba na przyciemnionej mapie: img, view, big
    "bounce" schemat podwójnego odbicia (rysunek w index.html)
    "close"  zakończenie z kodem QR
  Pola kamery:
    img     klucz z IMAGES poniżej
    layout  "full" (obraz u góry, podpis na dole), "side" (podpis z lewej, obraz z prawej), "cover" (obraz na cały ekran)
    view    [x, y, szer, wys] w pikselach CSS aplikacji (1920 x 1080) albo karty (szerokość 380): ten fragment kamera mieści na ekranie
    focus   [x, y, szer, wys] fragment do podświetlenia (reszta przygaszona); round: true robi koło
  Tekst: kicker (mała linia nad tytułem), title, sub. note = co mówi prelegent (klawisz N pokazuje notatki).

  Zasady: liczby tylko z danych aplikacji i README repo (Dowody), bez zmyślania. Bez wersalików, bez monospace.
*/

window.IMAGES = {
  app:      { src: "img/app.jpg",           base: 1920 },  // aplikacja, adres w Luboniu, zakładka Radar (NISAR 2026)
  card:     { src: "img/card.jpg",          base: 380 },   // cała karta adresu (szerokość karty 380 px)
  woda:     { src: "img/addr_woda.jpg",     base: 1920 },  // zakładka Woda przy adresie
  historia: { src: "img/addr_historia.jpg", base: 1920 },  // zakładka Historia: zabudowa i prognoza
  nowe:     { src: "img/city_nowe.jpg",     base: 1920 },  // Nowe budowy, cała aglomeracja
  grunt:    { src: "img/city_grunt.jpg",    base: 1920 },  // Grunt (EGMS), cała aglomeracja
  wodaCity: { src: "img/city_woda.jpg",     base: 1920 },  // Woda, cała aglomeracja
  qr:       { src: "img/qr.png",            base: 1 },
};

window.STEPS = [
  { kind: "text", lines: ["Używane auto za 30 000 zł", "jedzie na stację diagnostyczną."],
    note: "Kiedy kupujesz używane auto za 30 tysięcy, jedziesz na stację diagnostyczną: podwozie, czy nie było bite, czy nie cieknie olej." },

  { kind: "text", lines: ["Dom za 1 000 000 zł?", "Ładne zdjęcia i słowo dewelopera."], accent: 1,
    note: "A dom za milion? Oglądasz ładne zdjęcia w ogłoszeniu i wierzysz deweloperowi na słowo." },

  { kind: "shot", img: "app", layout: "cover", view: [430, 70, 1460, 860], title: "SARnik", titleClass: "brand",
    kicker: "NASA Space Apps Challenge 2026 · Dancing with the SARs",
    sub: "Deweloper ci tego nie powie. Radar tak.", scrim: "left",
    note: "Dlatego zrobiliśmy SARnika: stację diagnostyczną dla działki i domu. Patrzy na teren radarem z orbity." },

  { kind: "shot", img: "app", layout: "full", view: [0, 0, 1920, 1080],
    title: "Wpisujesz adres. Radar robi przegląd.", sub: "Armii Poznań 49c, Luboń · karta z działającej aplikacji",
    note: "Wpisujemy zwykły adres w Luboniu. (Demo na żywo: wpisz adres w aplikacji, wróć spacją.)" },

  { kind: "shot", img: "card", layout: "side", view: [0, 0, 380, 330], focus: [6, 66, 368, 88],
    title: "2 rzeczy do sprawdzenia", sub: "Zapytaj o nie sprzedającego i urząd, zanim podpiszesz umowę.",
    note: "Werdykt na górze: dwie rzeczy do sprawdzenia, zanim podpiszesz." },

  { kind: "shot", img: "card", layout: "side", view: [0, 130, 380, 330], focus: [6, 150, 368, 206],
    kicker: "Z radaru SAR", title: "Nowe budowy i ruch gruntu: w normie",
    sub: "Sentinel-1: jesień 2025 i jesień 2026. Ruch gruntu: pomiary EGMS 2016–2020.",
    note: "Najpierw to, co mówi radar: w ostatnim roku nic nowego tu nie wyrosło, a grunt jest stabilny." },

  { kind: "shot", img: "card", layout: "side", view: [0, 430, 380, 330], focus: [6, 494, 368, 108],
    title: "Woda: uwaga", sub: "Strefa zagrożona podtopieniami (PIG-PIB). Zapytaj o wody gruntowe i izolację piwnicy.",
    note: "Ale woda: uwaga. To oficjalna strefa zagrożona podtopieniami." },

  { kind: "shot", img: "woda", layout: "cover", view: [640, 120, 1000, 720], focus: [958, 333, 340, 340], round: true,
    title: "Ta sama woda na mapie",
    sub: "Niebieski pas: podtopienia wzdłuż Warty (PIG-PIB). Plamy: gdzie po deszczu ziemia nasiąka (NISAR 2026).",
    note: "Na mapie widać dlaczego: działka leży w pasie podtopień wzdłuż Warty." },

  { kind: "shot", img: "card", layout: "side", view: [0, 630, 380, 330], focus: [6, 700, 368, 108],
    title: "Upał latem: do sprawdzenia", sub: "Lato robi się tu cieplejsze szybciej niż w okolicy, o ok. 1,0 °C na 10 lat (NASA MODIS).",
    note: "I upał: lato robi się tu cieplejsze szybciej niż w okolicy." },

  { kind: "bounce", title: "Jak radar widzi nowy budynek",
    sub: "Ściana i grunt tworzą narożnik 90°. Fala odbija się dwa razy i wraca do satelity. Reguła: VV rośnie rok do roku o 3 dB, a różnica VV − VH o co najmniej 1,5 dB.",
    note: "Skąd radar wie o nowej budowie? Ściana i grunt to narożnik. Fala odbija się dwa razy i wraca prosto do satelity. Nowa ściana nagle świeci." },

  { kind: "shot", img: "nowe", layout: "cover", view: [420, 90, 1410, 840],
    title: "Nowe budowy w całej aglomeracji", sub: "Sentinel-1, jesień 2025 → jesień 2026, piksel 10 m. Czerwone: nowe budynki.",
    note: "Tak wygląda cała aglomeracja: co się zmieniło w ostatnim roku." },

  { kind: "stat", img: "nowe", view: [420, 90, 1410, 840], big: "4×",
    title: "Tyle razy częściej radar widzi silne pojaśnienie na działkach z decyzją o nowej budowie",
    sub: "2,1% komórek (16 z 766) wobec 0,5% w reszcie Poznania. Decyzje WUIA z czerwca–sierpnia 2026 (GEOPOZ). 95% przedział ok. 1,7–7.",
    note: "Sprawdziliśmy to na decyzjach budowlanych z urzędu miasta: tam, gdzie wydano pozwolenie na nową budowę, radar widzi silne pojaśnienie cztery razy częściej." },

  { kind: "shot", img: "grunt", layout: "cover", view: [760, 220, 960, 560],
    title: "Czy grunt się rusza", sub: "Tam, gdzie mierzy EGMS, typowo 0 mm na rok. 147 komórek (ok. 50 miejsc) osiada o 5 mm na rok lub szybciej.",
    note: "Radar mierzy też ruch gruntu. Zwykle zero, ale około 50 miejsc osiada o 5 milimetrów rocznie lub szybciej. Tam pękają domy." },

  { kind: "shot", img: "historia", layout: "full", view: [400, 60, 1520, 1020],
    title: "Co powstanie obok do 2035", sub: "Prognoza z 50 lat zdjęć Landsat, sprawdzona na latach 2015–2020: 56,4% trafień. To ranking, nie wyrok.",
    note: "A co powstanie obok? Prognoza z pięćdziesięciu lat zdjęć Landsat. Sprawdziliśmy ją na latach, których nie widziała: 56 procent trafień. To ranking, nie wyrok." },

  { kind: "shot", img: "app", layout: "full", view: [10, 640, 1000, 440], focus: [16, 766, 268, 172],
    title: "NISAR: nowy radar NASA i ISRO",
    sub: "Pasmo L widzi przez chmury, nocą i przez korony drzew. W strefach podtopień echo rosło dwa razy rzadziej: 19% wobec 38% (czerwiec → sierpień 2026).",
    note: "A to NISAR, nowy radar NASA i ISRO. W strefach podtopień jego echo rosło latem dwa razy rzadziej niż gdzie indziej. Dlaczego, jeszcze nie wiemy." },

  { kind: "text", lines: ["Piszemy też, co się nie potwierdziło.", "Prognoza a radar 2026: przewaga ok. 1,3 raza, to nie dowód. Pięć miesięcy NISAR to jeszcze nie porównanie rok do roku."], small: 1,
    note: "I mówimy uczciwie, co się nie potwierdziło: prognoza a radar 2026 to za mało na dowód, a NISAR ma dopiero pięć miesięcy danych." },

  { kind: "close", title: "Deweloper ci tego nie powie. Radar tak.", sub: "Zeskanuj i sprawdź swój adres",
    url: "poznan-trend-detective.web.app", foot: "SARnik · SpaceWalkers · NASA Space Apps Challenge 2026 · Poznań",
    note: "SARnik. Deweloper ci tego nie powie. Radar tak. Zeskanujcie kod i sprawdźcie swój adres." },
];
