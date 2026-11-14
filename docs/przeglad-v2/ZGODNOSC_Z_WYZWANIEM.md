# Czy SARnik odpowiada na wyzwanie i czy SAR jest fundamentem

Stan: gałąź `main` w commicie `d3b80e5`, sprawdzona w przeglądarce (wersja angielska, 0 błędów strony) w sobotę 14 listopada 2026 ok. 22:50.
Uwaga: `origin/main` jest już 7 commitów dalej (`d07c4da`). Z tych zmian audyt sprawdził tylko README.

## Werdykt

- **Czy aplikacja odpowiada na wyzwanie: tak, w większości.** 10 z 15 wymagań jest spełnionych, 5 częściowo, żadnego nie brakuje.
- **Czy SAR jest fundamentem: częściowo.** Mapy i ekranu startowego tak. Karty miejsca, czyli głównej odpowiedzi dla użytkownika, nie: NISAR ma w niej 0 z 7 wierszy.
- **Najmocniejszy punkt:** prawdziwe dane NISAR (9 przelotów orbity 158, polaryzacje HH i HV, czytane z plików GCOV z ASF) otwierają domyślny widok. Odpowiedzi na pytania wyzwania są spisane konkretnie dla Poznania.
- **Największe ryzyko:** publiczny link z README pokazuje starą aplikację „Poznań Trend Detective” bez NISAR, a demo SARnika nie istnieje. Juror, który zobaczy tylko to, uzna projekt za niezwiązany z wyzwaniem.

## Czy SAR jest fundamentem

Słowniczek: **SAR** to radar satelitarny. Sam wysyła falę i mierzy jej echo, także w nocy i przez chmury. **GCOV** to produkt NISAR z siłą echa w kilku **polaryzacjach** (HH: fala wysłana i odebrana poziomo; HV: wysłana poziomo, odebrana pionowo). **EGMS** to europejska mapa ruchu gruntu z Sentinel-1 (metoda InSAR, lata 2016–2020). **DEM** to model wysokości terenu.

Pomiary w trybie prostym (Stary Rynek, Dopiewo, punkt pod Kórnikiem):

| Element aplikacji | Z SAR | Z NISAR |
|---|---|---|
| Widok domyślny | 1 z 1 | 1 z 1 (soczewka Radar, rok 2026) |
| Soczewki mapy | 4 z 6 | 2 z 6 (Radar, Woda) |
| Odkrycia na karcie startowej | 3 z 6 | 1 z 6 (nr 1, „37% pól”) |
| Wiersze karty miejsca | 2 z 7 to pomiar radarowy (Sentinel-1, EGMS); 3 z 7 stoją pod nagłówkiem „From SAR radar” | 0 z 7 we wszystkich 3 miejscach |
| Flagi „warto sprawdzić” (3 miejsca razem) | 1 z 5 (EGMS) | 0 z 5 |
| Szczegóły techniczne, część radarowa | 6 z 6 wierszy | 1 z 6 wierszy i wykres 340×92 px |
| Oś czasu (Play) | 8 kroków: ALOS-2 2015–2021, potem 2026 | 1 krok; 9 przelotów NISAR nie jest animowanych |

- Wiersz „Woda” stoi pod nagłówkiem „From SAR radar”, ale bierze dane z mapy podtopień PIG-PIB i z modelu terenu Copernicus DEM. Ten model powstał z radaru TanDEM-X, ale daje wysokość, a nie echo radaru ani zmianę (`app.js:1731–1734`).
- Pozostałe 4 flagi dały: DEM (1), model zabudowy (1), dane o lasach Hansena (1) i temperatura z MODIS (1).
- Moduły z `web/sarnik/` (strefa zalewowa, osuwiska, decyzje budowlane) są w `main`, ale `sarnik/manifest.js` ma pustą listę. Dają 0 wierszy.

**Test usunięcia (a), bez żadnych danych SAR** (`sar.json` zwraca 404). Aplikacja działa bez błędów jako dawny „Poznań Trend Detective”: 2 soczewki (Trees, History), 7 odkryć o rozlewaniu się miasta, prognozie, cenach, lasach i upale, oś czasu 1975–2035. Wstęp dalej mówi „Satellite radar and maps tell you…”. Wniosek: radar jest warstwą na starszym, samodzielnym produkcie, a nie jego podstawą. Tego nie da się przebudować przed terminem.

**Test usunięcia (b), bez samego NISAR** (sprawdzony w kodzie, nie uruchomiony). Znika obraz startowy, warstwa Woda, odkrycie nr 1, jeden wiersz szczegółów i linie wykresu. Nie znika żaden werdykt, flaga ani rada dla użytkownika.

**Rola NISAR dziś: ilustracja, nie podstawa wniosków.** Przetwarzanie jest prawdziwe, i to jest mocny dowód dla Validity. Jedyny test statystyczny na NISAR (zmiana czerwiec→sierpień w strefach podtopień PIG-PIB i poza nimi) nie wykazał związku: stosunek 0,49, p = 1,0. Dlatego kod celowo trzyma NISAR poza werdyktami (komentarz w `app.js:1729`). To uczciwe, ale żaden wniosek użytkownika nie zależy od NISAR. Opowieść NISAR („37% pól pojaśniało: deszcz razem ze żniwami i orką”) i opowieść produktu (przegląd działki przed zakupem) się nie spotykają.

## Wymagania wyzwania

| Wymaganie | Status | Dowód | Co widzi juror |
|---|---|---|---|
| R1 aplikacja z NISAR śledzi zmianę | spełnione | Domyślna soczewka Radar 2026, legenda „How the NISAR radar sees the area (2026)”; odkrycie nr 1 przełącza na zmianę NISAR czerwiec→sierpień | Mapę radarową z NISAR w legendzie i na osi czasu |
| R2 prawdziwe dane NISAR w obliczeniach | spełnione | `pipeline/fetch_nisar.py` czyta pliki GCOV orbity 158; `build_sar.py:227–298` buduje warstwy `nisar_*`; obraz GIBS opisany jako „a picture only”. Drobne: 3 pliki JPG w `web/data/nisar/` nieużywane | Liczby NISAR z numerem orbity i liczbą przelotów |
| R3 intuicyjne narzędzia | spełnione | 6 soczewek, Play, wykres szeregu czasowego, wyszukiwanie adresu, rysowanie obszaru | Czystą aplikację mapową z kartą |
| R4 NISAR dla szerokiego grona | częściowo | Prosty język, ale NISAR nie ma w karcie; w legendzie NISAR zabudowa i las mają prawie ten sam zielony (`app.js:658`); adresat to kupujący, nie gmina czy nauczyciel | Centrum Poznania zielone jak las |
| R5 open source, praktyczne wnioski | częściowo | Brak pliku `LICENSE` (GitHub: licenseInfo null); rady „co sprawdzić” pochodzą z Sentinel-1, DEM, EGMS i modelu, nie z NISAR | Publiczne repo bez licencji, czyli formalnie nie open source |
| R6 obszar i powód wyboru | spełnione | about.html sekcja 8 „Study area, and why it is ours”, 18 gmin; odkrycie o odpływie mieszkańców | Rodzinne miasto z historią rozlewania się |
| R7 dane pomocnicze dają kontekst | częściowo | Opisane uczciwie jako „no radar”, ale 4 z 7 wierszy karty to nie radar, a wiersz Woda zastępuje radar; soczewki Trees i History bez SAR | Większość werdyktów karty z danych pomocniczych |
| R8 interaktywne medium | spełnione | Aplikacja i about.html (10 sekcji) z linkiem w oknie „About the data” | Mapę i długą stronę objaśniającą |
| R9 hipotezy o przyczynach fizycznych | spełnione | Okno „How radar sees the ground” i About sekcja 8: podwójne odbicie, stała dielektryczna, orka, rośliny, „czego nie widać”. Słabość: hipoteza NISAR miesza deszcz z żniwami | Jedno kliknięcie w ikonę radaru; nie na karcie startowej |
| R10 które polaryzacje i dlaczego | spełnione | About: las vs teren otwarty 6,6 dB w L-HV i 2,8 dB w C-VH. Ale warstwa zmiany NISAR jest tylko HH, a związek HV z uprawami jest tylko na About | Konkretną odpowiedź dopiero na stronie About |
| R11 przyszłe zastosowania NISAR | spełnione | „What NISAR will make possible” (okno radaru), „Future uses of NISAR” (About). Drobne: „every 12 days” zamiast „co kilka dni (4 orbity)” | Konkretne zastosowania dla Poznania |
| R12 różne kroki czasowe | częściowo | Play: ALOS-2 2015–2021, przerwa „no data”, jedna klatka NISAR 2026; 9 przelotów NISAR nie ma na mapie | Historię roczną i jedną różnicę NISAR |
| R13 polaryzacje, pasma, szereg czasowy | spełnione | HH/HV (NISAR, ALOS-2), VV/VH (Sentinel-1), pasmo L vs C, 9 przelotów NISAR i 27 Sentinel-1, ERA5, GHSL, Hansen, MODIS, GUS | Wiele sensorów, głównie w szczegółach i na About |
| R14 czynniki ludzkie | spełnione | Zabudowa 5,5% → 11,8% (1990–2020), wycinka 6218 ha, żniwa i orka w NISAR; większość z GHSL i Hansena, nie z SAR | Rozlewanie się miasta, rolnictwo, wycinkę |
| R15 opowieść, suwaki, mapy | częściowo | Odkrycia sterują mapą; brak suwaka przed/po. W `d3b80e5` README główne po polsku z „p = 0.000” (README.md:64, 75); w `d07c4da` te liczby usunięto, ale README.md:5 dalej linkuje do v1 | Dobrą opowieść w aplikacji, polską stronę GitHuba |

## Ocena w pięciu kryteriach

To szacunki audytorów, nie jurorów. Większość soczewek dała 3. Soczewka nauki dała 3,5 w czterech kryteriach, soczewka wymagań 3,5 w Relevance, soczewka zgłoszenia 2 w Presentation.

| Kryterium | Ocena | Co podnosi o 1 punkt |
|---|---|---|
| Impact | 3 | Wynik NISAR dla jednego adresu, na który kupujący by zareagował, pokazany na prawdziwym miejscu w demo. |
| Creativity | 3 | Jeden zapamiętywalny obraz NISAR: suwak przed/po (25 czerwca, 24 sierpnia) albo animacja 9 przelotów. |
| Validity | 3 | Każda etykieta radaru dosłownie prawdziwa: Woda poza grupą SAR, legenda odróżnia miasto od lasu, poprawiony tryb eksperta, bez „4.3×” w pitchu. |
| Relevance | 3 | Wiersz NISAR na górze karty miejsca i Play przez przeloty NISAR. |
| Presentation | 3 za aplikację, 2 za zgłoszenie wysłane dziś | Wdrożony `main` pod publicznym linkiem, demo SARnika, nazwa i zdanie o NISAR na ekranie, angielski tytuł i README. |

## Co zrobić przed niedzielą 14:00

Kolejność według wartości dla oceny. Kolejność pracy: najpierw kod (3, 6, 7, 8), potem wdrożenie (1), potem demo (2) z wdrożonej wersji; teksty (4, 5) równolegle. Ostatnia zmiana i ostatnie wdrożenie przed 16:00.

1. **Wdrożyć `main` pod publiczny adres.** Dziś https://poznan-trend-detective.web.app pokazuje starą aplikację, a `sar.json` i `about.html` dają 404. Żaden podgląd (v2, v3) nie ma kodu z `main`.
   Gdzie: `poznan-trend-detective/` (`firebase.json`, public=`web`). Sprawdzić curl: `sar.json` i `about.html` dają 200, md5 `app.js` równe temu z `main`. Wszystkie linki (README.md:5, pitch, kod QR) na ten jeden adres.
   Wysiłek: mała. Kryteria: wszystkie, najbardziej Presentation i Relevance. Kto: właściciel projektu Firebase.
2. **Nagrać demo SARnika** (wideo do 30 s albo do 7 slajdów) według DEEP_PITCH sekcja 7, z wdrożonego `main`. Pokazać kartę z wierszem NISAR (pkt 3) i wykres 9 przelotów ze szczegółów technicznych. Oznaczyć `poznan-trend-detective/docs/VIDEO_30S.md`, `docs/PITCH.md` i `promo/` jako nieaktualne. Stary film dotyczy innego wyzwania i ma głos AI z ElevenLabs.
   Wysiłek: średnia. Kryteria: Presentation (element obowiązkowy), Relevance. Kto: jedna osoba nagrywa; głos członka zespołu albo ujawniony głos AI.
3. **Dodać wiersz NISAR do karty miejsca i poprawić wiersz Woda.** Wiersz informacyjny, bez flagi, w grupie „From SAR radar”, np. „What NISAR saw this summer”: zmiana HH czerwiec→sierpień w dB i odsetek terenu jaśniejszego o 2 dB lub więcej. Opisać to jako obserwację („rain, harvest and tillage together”), nie werdykt. Źródło: „NISAR L-band, track 158, 9 passes Jun–Oct 2026”. Wiersz Woda przenieść do „Background” albo oznaczyć `sar:'no'` ze źródłem „terrain model + PIG-PIB”.
   Gdzie: `app.js` plainChecks (1717–1760, Woda 1729–1734); dane liczy już radarBlock (`sarStats` nisarWet/nisarWetUp, ok. 1591); teksty PL i EN w `i18n_sar.js`, bo CI sprawdza ich zgodność.
   Wysiłek: średnia. Kryteria: Relevance, Validity, Impact. Kto: każdy, kto zna `app.js`.
4. **Poprawić tekst strony projektu i pitch** (`docs/deep-pitch/DEEP_PITCH.md`). Usunąć nagłówek slajdu 6 „4.3× as often” i akapit „Clear direction” (NAUKA.md:132 mówi, by tego nie cytować). Usunąć zdanie, że NISAR wchodzi do wiersza Woda. Zaktualizować commit (jest 0cdedf1), statusy (strona About działa; moduły połączone, ale wyłączone) i tytuł odkrycia („The projection and the radar”). Z sekcji 8 zrobić czystą kopię bez 29 znaczników `[src:…]` i bez `[ZAŁOŻENIE]`, z licencją i adresem wdrożenia.
   Wysiłek: średnia. Kryteria: Validity, Presentation. Kto: każdy.
5. **Licencja, README po angielsku, ujawnienie AI, kroki odtworzenia.** Dodać `LICENSE` w katalogu głównym (np. MIT lub Apache-2.0 dla kodu; dane na licencjach źródeł, wypisanych już w `about.js`). W `README.md` dać angielskie streszczenie na górze, poza `<details>`, albo odesłać do `poznan-trend-detective/README.md`. Sprawdzić, że porządki z `d07c4da` (bez „p = 0.000”, 2.13×, 4.30×, 4.46×) są w `main`. Jedno zdanie o AI (Claude; Google Antigravity i ElevenLabs tylko jeśli naprawdę użyte) w obu README, `about.js`/`i18n.js` i na stronie projektu. Do `pipeline/requirements.txt` dodać `earthaccess` i `h5py`. W README podać kolejność: skopiować 2 pliki z `progres/p1/dane/` do `data/raw/`, potem `fetch_nisar.py`, `fetch_sar.py`, `build_sar.py`.
   Wysiłek: mała. Kryteria: Relevance (open source to wymóg), Validity, Presentation. Kto: zespół wybiera licencję, commit może zrobić każdy.
6. **Poprawić mylące etykiety.** W legendzie NISAR połączyć „built-up land” i „forest and trees” w jeden wpis (np. „built-up land or forest: strong HV”) albo zmienić rozciągnięcie kolorów (`app.js:649–658`). Pokazać „SARnik” i jedno zdanie o NISAR w nagłówku karty startowej (`appName` z `i18n_sar.js:22/49` nie jest używany). Ustawiać `document.title` według języka (`index.html:6` jest po polsku). Dać widoczny napis „How radar works” przy `#radar-btn` (`index.html:59`).
   Wysiłek: mała. Kryteria: Presentation, Validity. Kto: każdy.
7. **Usunąć przesadne twierdzenia z trybu eksperta.** `app.js:1203–1212` ma na sztywno „New building / wall”, „Clearing / demolition”, „Heavy water soaking”, „Drying”. Zamienić na teksty `u.hov.*` i tę samą regułę ścian co w trybie prostym. W `i18n_sar.js:164` (radar26Busy) napisać „a signal like new walls”.
   Wysiłek: mała. Kryterium: Validity. Kto: każdy.
8. **NISAR w czasie i w polaryzacjach.** Minimum: w oknie radaru, w części „What we see around Poznań, and why” (`i18n_sar.js`, radarHtml, PL i EN), dodać punkt o NISAR. HH wzrosło od czerwca do sierpnia; tam, gdzie razem z nim rosło HV, wskazuje to na zmianę upraw (rozpraszanie w roślinach), nie tylko na wilgoć. To samo jedno zdanie dodać do odkrycia nr 1. Jeśli zostanie czas: suwak przed/po z nieużywanych `web/data/nisar/*.jpg` albo Play przez 9 przelotów NISAR w roku 2026 (`app.js:399–401`, setRYear ok. 1010).
   Wysiłek: mała (minimum), średnia (suwak lub animacja). Kryteria: Relevance (R10, R12), Creativity. Kto: każdy.

## Czego nie ruszać

- Domyślny widok: soczewka Radar 2026 z obrazem NISAR HH/HV. Zmienić tylko legendę, nie widok.
- Odkrycie nr 1 i jego przejście do soczewki Woda.
- Okno „How radar sees the ground” i sekcję 8 strony About (fizyka, polaryzacje, przyszłe zastosowania).
- Uczciwe granice: „What radar cannot show here”, „What we do not promise” i opisany negatywny wynik NISAR.
- Decyzję, że NISAR nie daje werdyktu o wodzie (`app.js:1729`). Nowy wiersz NISAR ma być opisem, nie flagą.
- Podział karty na „From SAR radar” i „Background (no radar)”. Poprawić tylko przydział wiersza Woda.
- Liczby na ekranie: w `d3b80e5` wszystkie zgadzają się z `sar.json`. Nie przeliczać danych ani pipeline'u przed 16:00; braki N31, N45, N50 wpisać do granic jako pracę po hackathonie.
- Atrybucję źródeł na stronie About i zielone testy CI. Każdą zmianę tekstu robić w PL i EN naraz.
- Nie przebudowywać aplikacji wokół NISAR (test usunięcia (a) nie do naprawienia przed terminem). W pitchu powiedzieć wprost, które odpowiedzi daje radar, a które to kontekst.

## Czego nie sprawdzono

- 7 commitów na `origin/main` po `d3b80e5` (do `d07c4da`). Sprawdzono z nich tylko README. Według weryfikatora przeliczono w nich `sar.json` na Sentinel-1 10 m i zmieniono `about.js`. Liczby (358 ha, 693 ha, 37%, 26%, 147 komórek) sprawdzono tylko dla `d3b80e5`. Przed decyzją o 14:00 trzeba raz przejść aplikację na ostatecznym `main`.
- Czy CI uruchomiło się dla `d07c4da` (może filtr ścieżek).
- Test usunięcia (b) bez NISAR: tylko odczyt kodu, nie uruchomiono.
- Czy warstwa GIBS z przelotami NISAR w szufladzie rysuje kafelki.
- Demo: nie istnieje, więc nie ma czego sprawdzić. Strona projektu na spaceappschallenge.org też nie była sprawdzana.
- Testy przeglądarkowe `tests/e2e_sarnik.py`: nie są w CI i nikt ich nie uruchomił.
- Pełna wersja polska w przeglądarce (CI sprawdza tylko zgodność kluczy tekstów).
- Pipeline od początku do końca, czy odtwarza zatwierdzone PNG bajt w bajt, pliki SOPO i ISOK.
- Działanie modułów z `web/sarnik/` po włączeniu (dziś manifest jest pusty).
- Tekst „1975–2026” w szczegółach technicznych: nie znaleziono go w kodzie.
- Oficjalne zasady Space Apps co do formatu demo poza tym, co jest w `materials/`.

## Dopisek po audycie (14.11, 23:05)

Audyt zrobiło 10 agentów: 5 niezależnych przeglądów, potem 3 agentów podważało każdy z 59 statusów (2 zmienili). Poniżej to, co zmieniło się albo wyjaśniło po jego zakończeniu.

- **Stan `main`: `deec31b`, 9 commitów po audycie.** Autor aplikacji przeliczył warstwy Sentinel-1 w pełnej rozdzielczości 10 m, a warstwy karty ładują się dopiero wtedy, gdy są potrzebne. Kontrole GitHuba są na tym commicie zielone. Liczb po przeliczeniu audyt nie sprawdzał.
- **Sprostowanie do „Czego nie sprawdzono”:** testy przeglądarkowe były uruchamiane, tylko poza audytem. Pełny zestaw dał 36 z 44 na wersji sprzed 22:42. Szybki zestaw (PL, 1440×900) na `deec31b` dał 9 z 11. W obu przypadkach nie przechodzą te same dwa braki: nazwa SARnik nie jest widoczna na stronie (działanie 6) i warstwa decyzji budowlanych nie ma legendy.
- **Moduły z urządzeń 2 i 3 są w `main`, ale wyłączone.** `web/sarnik/manifest.js` ma pustą listę, więc strefa powodziowa ISOK, osuwiska i decyzje budowlane nie pokazują się w karcie. Włącza je jedna linijka: `window.SARNIK_MODULES = ["flood", "landslide", "wuia"];`. Dodadzą trzy wiersze w grupie „Tło z innych źródeł”, czyli udział radaru w karcie spadnie. Dlatego warto włączyć je razem z wierszem NISAR z działania 3, a nie przed nim.
- **Gałąź `sar-pelna-rozdzielczosc`** (ostrzejsze obrazy radarowe, ok. 40 MB nowych plików) nie jest scalona i nie ma PR-a.
