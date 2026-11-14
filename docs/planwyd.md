# Plan wykonawczy na 3 urządzenia: grilling, deep pitch, aplikacja SARnik

> Stan na sobotę 14.11.2026, ok. 19:30. Trzy części uruchamiane równocześnie na trzech komputerach, łącznie ok. 56 agentów. Nie zmienia `docs/PLAN.md`, `docs/pitch.md` ani `docs/BURZA_MOZGOW.md`.

## Kontekst

- Termin: **niedziela 15.11, 23:59**, wyzwanie „Dancing with the SARs”. Bramka zespołu: niedziela 12:00.
- W repo są dwa pitche tego samego produktu: `poznan-trend-detective/docs/PITCH.md` (stara nazwa) oraz `docs/pitch.md` z `docs/pomysly-sar/` (SARnik, NISAR w centrum). Ustalone: **to jeden produkt, nazwa SARnik**.
- Aplikacja `poznan-trend-detective/web` działa, ale NISAR to w niej tylko podgląd kafli z NASA GIBS. Tabela w `docs/pitch.md` §4.1 opisuje jako „działa w demie” rzeczy, których dziś nie ma.

## Podział

| Urządzenie | Zadanie | Agenci | Pisze tylko w | Gałąź | Koniec |
|---|---|---|---|---|---|
| **1** | Grilling: pytania dla zespołu + arkusz faktów | 22 (+2) | `docs/grilling/` | `grilling` | PR + merge |
| **2** | Deep pitch (EN + PL) | 14 | `docs/deep-pitch/` | `deep-pitch` | PR + merge |
| **3** | Aplikacja SARnik | 20 | `poznan-trend-detective/` | `sarnik-app` | PR otwarty (bez merge'a) |

### Praca równoczesna: nikt na nikogo nie czeka
- **Start:** wszystkie trzy urządzenia ruszają w tej samej chwili, z aktualnego `main`. Wszystko, czego potrzebują, jest już w repo i w tym pliku.
- **Brak zależności w trakcie:** żadna faza nie wymaga wyniku innego urządzenia. Wspólne założenia i statusy funkcji są zapisane niżej, więc części 2 i 3 nie czekają na część 1.
- **Brak kolizji w gicie:** każde urządzenie ma własny folder i własną gałąź, a tego pliku nikt nie edytuje w trakcie pracy. PR-y można mergować w dowolnej kolejności.
- **Jedyny krok po kolei** to krótkie „Scalanie” na końcu (sekcja niżej), gdy wszystkie trzy części są gotowe.
- **Limity:** jeśli urządzenia korzystają z jednego konta, limity zapytań są wspólne. Przy błędach limitu zmniejsz liczbę agentów pracujących naraz; nie czekaj na pozostałe urządzenia.

**Urządzenie 3 jest już zajęte** (wajlk, sesja, która napisała ten plan). Urządzenia 1 i 2 czekają na dwie osoby; kto bierze część, niech da znać zespołowi, żeby nikt jej nie zdublował.

### Jak uruchomić (każde urządzenie)
`git pull` w repo `NASA-SpaceWalkers`, potem w Claude Code wkleić (z właściwym numerem):

```
Przeczytaj docs/planwyd.md i wykonaj część „Urządzenie N”. Użyj workflow (wielu agentów).
Agenci: Opus do analizy, pisania i kodu; Sonnet lub Haiku z niskim wysiłkiem do wyszukiwań. Bez modeli Fable.
Trzymaj się sekcji „Zasady wspólne” i pisz tylko w swoim folderze.
```

## Zasady wspólne

- **Modele:** każde wywołanie agenta ma jawnie podany model (pominięty dziedziczy model sesji). Opus z wysiłkiem `high`; `xhigh` tylko dla jednego najtrudniejszego kroku w danej części. Sonnet/Haiku z wysiłkiem `low` do wyszukiwań i sond.
- **Uczciwość:** weryfikator sieciowy zwraca dosłowny cytat i URL; bez cytatu werdykt to „nie znaleziono”. Każda liczba ma znacznik źródła (`[src:plik#klucz]` albo URL). Liczby z pikseli NISAR, których jeszcze nie ma, to `[X: po przeliczeniu NISAR]`.
- **Pliki:** agenci zwracają treść, a pliki zapisuje sesja główna po przeglądzie (wyjątek: kod w części 3). Agenci nie robią commitów.
- **Bez zmian zostają:** `docs/PLAN.md`, `docs/pitch.md`, `docs/BURZA_MOZGOW.md`, `docs/pomysly-sar/*`, `poznan-trend-detective/docs/PITCH*.md`, `promo/`, model prognozy i istniejące dane.
- **Git:** commity bez prywatnych adresów e-mail (adres noreply z GitHuba). Nikt poza właścicielem projektu nie wdraża na Firebase.

## Fakty ustalone 14.11 (nie sprawdzać ponownie)

- **Ocena:** 5 kryteriów po 1–5 pkt (Impact, Creativity, Validity, Relevance, Presentation). Demo: film ≤ 30 s **albo** ≤ 7 slajdów. Strona projektu po angielsku, z ujawnieniem użycia SI.
- **Zmiana wyzwania:** właściciel drużyny, przez „Edit Details”, do zamknięcia hackathonu.
- **NISAR nad Poznaniem:** tryb 20+5 MHz, HH + HV; GCOV 20 m, GUNW 80 m. Wersja provisional 17.06–23.10.2026, validated od 21.10 (nie mieszać). Para z orbity 158: 25.06 (sucho) i 24.08 (mokro). Lista: `progres/p1/dane/nisar_poznan_przeloty.csv`.
- **Aplikacja:** siatka 956×898; komórka 120 m w EPSG:3857, czyli 73 m w terenie. `land.nisar_dates` ma 38 dat, w tym 24–29.10 z wersji validated.
- **WUIA:** 2 420 rekordów (VI–XI 2026), tylko miasto Poznań. „751” to rekordy „nowa budowa” ze statusem „decyzja”; kategorie są zaszumione (przebudowy, przyłącza).
- **Pikseli NISAR jeszcze nie ma.** Pliki GCOV pobiera osoba z kontem Earthdata na osobnym urządzeniu.

## Założenia startowe (obowiązują wszystkich do odpowiedzi zespołu)

| Temat | Założenie |
|---|---|
| Nazwa i wyzwanie | SARnik, „Dancing with the SARs” |
| Hasło | „Deweloper ci tego nie powie. Radar tak.” / *The developer won't tell you. The radar will.* |
| Obszar | Poznań i 17 gmin powiatu, tak jak w aplikacji |
| Demo | przygotowujemy oba warianty: 7 slajdów i film 30 s; wybór należy do zespołu |
| Bramka | niedziela 12:00: bez flag z pikseli NISAR zespół rozważa plan awaryjny z `docs/BURZA_MOZGOW.md` |
| Ocena miejsca | osobne flagi (zielona / żółta / czerwona), bez jednej zbiorczej oceny 0–100 |

Urządzenie 1 może w `RUNDA_1.md` zakwestionować każde z tych założeń; zmiany wchodzą dopiero w kroku „Scalanie”.

## Statusy funkcji na start (Urządzenie 2 używa tej tabeli w pitchu)

| Status | Funkcje |
|---|---|
| **Działa dziś** (w aplikacji) | karta miejsca; zabudowa 1975–2035 z modelem sprawdzonym na latach 2015–2020; wycinka; ceny powiatowe; trendy MODIS; podtopienia PIG-PIB; zagłębienia terenu; zmiana Sentinel-1 2017→2024; podgląd przelotów NISAR z NASA GIBS |
| **W PR** (Urządzenie 3) | nazwa SARnik; sekcja „Radar NISAR” i licznik ostrzeżeń; „Co tam powstanie” (decyzje WUIA); strefa ISOK; „Jak widzi radar” (pasmo L kontra C, suchy kontra mokry, jako podgląd obrazów); ruch gruntu EGMS i osuwiska |
| **Po danych NISAR** | flagi „Mokry grunt” i „Budowa obok”; liczby z weryfikacji (radar kontra decyzje, flaga kontra strefy ISOK) |
| **Kierunek rozwoju** | ruch gruntu z NISAR, iły poznańskie, mokradła, infrastruktura, cała Polska |

## Scalanie po zakończeniu (jedyny krok po kolei, nie blokuje pracy)

| Co | Daje | Bierze | Kiedy |
|---|---|---|---|
| `docs/grilling/FAKTY.md`, `ZALOZENIA.json` | 1 | 2 i 3: krótka poprawka tam, gdzie fakty lub rekomendacje różnią się od założeń startowych | gdy część 1 jest w `main` |
| `docs/grilling/RUNDA_1.md` | 1 | cały zespół | burza mózgów |
| Link do PR aplikacji i lista statusów funkcji, które faktycznie weszły | 3 | 2: aktualizacja tabeli dowodów, jeśli coś odpadło z tabeli „Statusy funkcji na start” | gdy PR aplikacji jest otwarty |
| Odpowiedzi zespołu | zespół | 1 (runda 2), 2 (przypisy), 3 (stałe w kodzie) | po burzy mózgów |
| `nisar_*.png` + `nisar.json` | osoba z plikami GCOV (skrypt z części 3) | autor aplikacji | po uruchomieniu `process_nisar.py` |

---

## Urządzenie 1: Grilling zespołu (22 agentów, +2 przy dodatkowej rundzie)

**Wynik** w `docs/grilling/`: `RUNDA_1.md`, `FAKTY.md`, `ZALOZENIA.json`, `README.md` (jak prowadzić sesję). PR + merge od razu po zakończeniu.

| Faza | Agenci | Co robią |
|---|---|---|
| Fakty | 3 × Haiku low (repo) + 6 × Sonnet low (sieć) | Repo: liczby z tabeli na końcu `PITCH.md` kontra `web/data/land/land.json` i `study.json`; twierdzenia z `docs/pitch.md` i `pomysly-sar/`; otwarte decyzje i bramki (`docs/PLAN.md`, `docs/BURZA_MOZGOW.md`, `progres/p1/`). Sieć, po jednym na grupę z sekcji „Niepotwierdzone” w `pomysly-sar/zrodla.md`: liczby NIK; przypadek zalanego osiedla i czy kupujący wiedzieli; wymogi ustawy deweloperskiej; twierdzenia techniczne o NISAR; zasięg SOPO, licencje i aktualność map ISOK; wczesne wyniki NISAR i radar w modelach zabudowy. |
| Pytania | 7 × Opus | Role: juror każdego z 5 kryteriów (kupujący połączony z Impact), ekspert SAR, szef dostaw pilnujący zegara. Każde pytanie ma: opcje, rekomendację z uzasadnieniem z faktów, zależności, kto może odpowiedzieć (zespół / dane / agenci), domyślną odpowiedź przy braku decyzji, czy decyzja jest odwracalna, termin, na co wpływa i koszt pomyłki. |
| Drzewo decyzji | 1 × Opus (`xhigh`) | Scala duplikaty i ustala zależności; rundy liczy kod workflow (runda 1 = pytania bez nierozstrzygniętych zależności). Pytania, na które mogą odpowiedzieć agenci albo dane, trafiają do `FAKTY.md`, a nie do zespołu. |
| Sceptycy | 3 × Opus | Każda rekomendacja z rundy 1 jest podważana na podstawie faktów: utrzymać albo zmienić. |
| Krytyk kompletności | 1 × Opus | Szuka decyzji przemilczanych (kto oddaje dane NISAR i w jakim formacie, film czy slajdy, kto wypełnia stronę projektu, kto wdraża). Najwyżej jedna dodatkowa runda. |
| Redakcja | 1 × Opus | Pliki wynikowe. |

**Format `RUNDA_1.md`** (po polsku, ok. 12 pytań na 45 minut, arkusz odpowiedzi na końcu, dalsze rundy pokazane jako zablokowane):

```
❓ **Q1** - **<tytuł>**: <treść i opcje>

➡️ <rekomendowana odpowiedź>
```

Każde pytanie jest sformułowane tak, żeby „tak” przyjmowało rekomendację. `ZALOZENIA.json` zawiera rekomendację dla **każdego** pytania ze wszystkich rund. Po burzy mózgów odpowiedzi zespołu wracają na to urządzenie i z drzewa liczona jest runda 2.

**Gotowe, gdy:** każde pytanie ma rekomendację, żadne nie pyta zespołu o fakt, każdy wpis w `FAKTY.md` ma cytat i URL albo ścieżkę w repo.

---

## Urządzenie 2: Deep pitch (14 agentów)

**Wejście:** `docs/pitch.md` (źródło SARnik), `PITCH.md` (liczby i test modelu), `docs/pomysly-sar/` oraz tabele „Założenia startowe” i „Statusy funkcji na start” z tego pliku. Twierdzenia z sekcji „Niepotwierdzone” w `pomysly-sar/zrodla.md` traktuj jako niepotwierdzone, dopóki nie ma `FAKTY.md`. **Wynik:** `docs/deep-pitch/DEEP_PITCH.md` (EN) i `DEEP_PITCH_PL.md`, PR + merge.

| Faza | Agenci | Co robią |
|---|---|---|
| Szkice | 3 × Opus | Trzy niezależne wersje: problem kupującego („Deweloper ci tego nie powie. Radar tak.”); nauka NISAR (pasmo L kontra C, przyczyny fizyczne); dowód („model przewidział, NISAR widzi, urząd potwierdza”). |
| Jury | 5 × Opus | Po jurorze na kryterium, ocena 1–5. Szkice oznaczone A, B, C, żeby ocena była ślepa. |
| Synteza | 1 × Opus (`xhigh`) | Zwycięzca plus najlepsze elementy pozostałych. |
| Czerwony zespół | 3 × Opus | Fizyka SAR i nadmierne obietnice (względem `docs/pitch.md` §6); każda liczba kontra źródło (liczba bez znacznika odpada); zasady zgłoszenia. |
| Finał | 2 × Opus | Wersja EN, a po jej zamrożeniu wersja PL na event lokalny. |

**Zawartość:** jedno zdanie; problem ze źródłami; dlaczego radar; produkt; tabela dowodów ze statusem zgodnym ze stanem faktycznym (działa dziś / w PR / po danych NISAR / kierunek); 7 slajdów z notatkami; film 30 s; tekst strony projektu z odpowiedziami na pytania wyzwania; bank trudnych pytań jury; ograniczenia. Założenia zależne od zespołu są przypisami `[ZAŁOŻENIE Qn]`, nigdy tekstem na slajdzie.

**Gotowe, gdy:** każda liczba ma źródło, slajdów jest 7, film mieści się w 30 s, a statusy w tabeli dowodów zgadzają się z tabelą „Statusy funkcji na start”.

---

## Urządzenie 3: Aplikacja SARnik (20 agentów)

**Zakres:** rebranding SARnik; „Co tam powstanie” + strefa ISOK; „Jak widzi radar” (pasmo L kontra C); ruch gruntu EGMS + osuwiska; flagi z pikseli NISAR „gotowe pod dane”. **Wynik:** otwarty PR z gałęzi `sarnik-app`; autor aplikacji robi przegląd i wdraża.

### Architektura (mały diff dla autora aplikacji)
- **Tylko plaster 1 dotyka `web/app.js`** (cel: ok. 200 linii). Dodaje punkty rozszerzeń `window.SARNIK = {checks, cardTop, onSelect, drawer, layers, legend}` i obiekt `ctx` z istniejącymi pomocnikami (`landCell`, `inFlood`, `pointInRing`, `loadGray`, `renderCard`, `redraw`, `esc`, `num`).
- Każda funkcja to osobny moduł `web/sarnik/<nazwa>.js` + `.css` z własnymi tekstami PL/EN (`Object.assign`). Moduły nie kolidują, więc powstają równolegle.
- `inspectionHTML()` (`app.js:1152`) zostaje synchroniczna i tylko czyta wyniki. Zapytania sieciowe idą po `finishSelection()` (`app.js:988`) przez `fetchOnce(sel, klucz, fn, 6000)`; wynik trafia do `sel.ext`, potem `renderCard()`. To wzorzec z `reverseGeocode` w `selectPoint()` (`app.js:970`). Po 6 s wiersz pokazuje „info” z linkiem i nie blokuje karty.

### Fazy
| Faza | Agenci | Co robią |
|---|---|---|
| Sondy | 5 × Sonnet low | Potwierdzają `curl`-em szablony zapytań (fakty niżej), jednostkę wartości EGMS, najbliższe daty pasma C, statystykę opisów WUIA pod klasyfikator. |
| Projekt | 1 × Opus (`xhigh`) | Dokładne punkty wstawienia, klucze i18n, kontrakty danych. |
| Plaster 1 (sam) | 1 × Opus | Punkty rozszerzeń; `inspectionItems()` wydzielone z `inspectionHTML`; licznik ostrzeżeń przy tytule karty; sekcja „Radar NISAR” po `${chip}` w `renderCard()` (`app.js:1108`); nazwa SARnik w `index.html:6-9` i w nagłówku karty startowej (`renderFindings`, `app.js:1285`); puste moduły podpięte w `index.html`. Nazwa w jednym kluczu i18n, żeby plan awaryjny z bramki 12:00 był zmianą jednej linii. |
| Plastry 2–5 (równolegle) | 4 × Opus | Moduły z tabeli niżej. |
| Plaster 6 | 1 × Opus | `README.md`, nowy tekst „O danych” (`aboutHtml`), opis PR z listą kontrolną wdrożenia. |
| Przegląd | 4 × Opus | Poprawność JS; zgodność PL/EN i uczciwość tekstów; zrzuty z Playwright; zachowanie przy błędach sieci. |
| Poprawki | 2 × Opus + 1 kontrola | Poprawki, ponowne testy, na końcu podbicie `?v=` w `index.html`. |
| Statusy | 1 × Sonnet low | Lista prawdziwych statusów funkcji dla Urządzenia 2. |

### Moduły
| Moduł | Pliki | Zachowanie |
|---|---|---|
| **„Co tam powstanie” + ISOK** | `pipeline/build_wuia.py` → `web/data/wuia.json` (≤ 400 KB), `web/sarnik/wuia.js` | Decyzje „nowa budowa” w promieniu 500 m: typ z klasyfikatora słów w opisie (hala/magazyn, wielorodzinny, jednorodzinny, usługi, droga; sieci i instalacje pominięte), 3 najbliższe z datą. Hala, magazyn lub droga → „uwaga”. Poza miastem Poznań wiersz mówi, że rejestr obejmuje tylko miasto. ISOK: Q10% lub Q1% → „ryzyko”, tylko Q0,2% → „uwaga”. |
| **„Jak widzi radar”** | `web/sarnik/compare.js` | Dwie warstwy kafli z suwakiem-przegrodą (`clip-path`, bez nowych bibliotek). Tryby: suchy 25.06 / mokry 24.08 (NISAR) oraz pasmo L / pasmo C. Podpis: „podgląd obrazów, nie pomiar”. |
| **Ruch gruntu i osuwiska** | `web/sarnik/ground.js` | Warstwa EGMS przez `exportImage` i SOPO przez WMS; wiersze przeglądu z `identify`. Bez potwierdzonej jednostki EGMS wiersz pokazuje tylko „info”. Podpis: dane odniesienia 2016–2020, piksel 123 m. |
| **Flagi NISAR (gotowe pod dane)** | `pipeline/process_nisar.py`, `web/sarnik/nisar.js`, `h5py` w `requirements.txt` | Skrypt bierze lokalne pliki GCOV (`--h5 … --dry --wet --before --after`), odmawia mieszania wersji i orbit, uśrednia moc liniową do siatki z `land.json`, zapisuje `web/data/land/nisar_*.png` i manifest `nisar.json` z progami. Aplikacja pokazuje „Mokry grunt” i „Budowa obok” tylko wtedy, gdy manifest istnieje. `land.json` nie jest ruszany (nadpisuje go `model_urban.py`). |

### Fakty sprawdzone dla tej części
- **ISOK** (`wody.isok.gov.pl/wss/INSPIRE/INSPIRE_NZ_HY_MZPMRP_WMS`, warstwa `NZ.Fluvial`): `GetFeatureInfo` z `INFO_FORMAT=text/plain` zwraca ok. 2 KB z liniami „scenariusz Q 10% / 1% / 0,2%” (JSON zwraca 2,9 MB); poza strefą „no features were found”; CORS `*`; ok. 2 s. Metadane podają ważność map do 21.12.2025.
- **EGMS** (`cbdgmapa.pgi.gov.pl/arcgis/rest/services/geozagrozenia/egms_2016_2020_pion/ImageServer`): `identify` działa z CORS; WMS zwraca błąd 400, stąd `exportImage`. Wartości całkowite od −109 do 29, jednostka do potwierdzenia.
- **SOPO** (`…/geozagrozenia/sopo_obszary/MapServer/WMSServer`): działa, obsługuje EPSG:3857, CORS jest.
- **Pasmo C:** kafle GIBS `OPERA_L2_Radiometric_Terrain_Corrected_SAR_Sentinel-1` nad Poznaniem istnieją dla 25.06, 24.08 i 25.08.2026 (poziom 12). Plan awaryjny: warstwa `s1_2024` z aplikacji, podpisana jako mediana z lata 2024.

### Weryfikacja
- `node --check` dla `app.js`, `i18n.js` i modułów; skrypt w Node porównujący rekurencyjnie klucze PL i EN i wywołujący każdą funkcję tekstową.
- **Playwright** z systemowym Chrome (`channel="chrome"`, zaślepka Nominatim i hak `__map` z `promo/capture.py`) na lokalnym `http.server`: PL i EN, 1440×900 i 390×844; punkt przy moście Rocha (strefa ISOK) i „Dopiewo”; okno porównania z suwakiem na 50%; warstwy EGMS i SOPO; przebieg z zablokowanymi usługami ISOK i PIG-PIB; manifest NISAR nieobecny, potem obecny. Błąd w konsoli albo `undefined` / `NaN` w treści strony przerywa test.
- `process_nisar.py --self-test`: sztuczne pliki HDF5 o udokumentowanej strukturze GCOV z podłożoną mokrą plamą i placem budowy; wynik 956×898, flaga tylko w oczekiwanych komórkach, odmowa przy zmieszanych wersjach. Na prawdziwych plikach skrypt będzie sprawdzony dopiero przez osobę, która je ma; opis PR mówi to wprost.

**Gotowe, gdy:** testy przechodzą, PR ma zrzuty ekranu, log testów i listę kontrolną wdrożenia, a opis PR zawiera listę funkcji, które faktycznie weszły.

---

## Ryzyka

- Flagi „Mokry grunt” i „Budowa obok” są niewidoczne do czasu dostarczenia danych NISAR; progi w manifeście są wstępne i wymagają oceny osoby od SAR.
- Wdrożenie zależy od właściciela projektu Firebase.
- Bramka w niedzielę o 12:00 może cofnąć rebranding, dlatego nazwa siedzi w jednym kluczu.
- Wszystkie części startują przed odpowiedziami zespołu i bez wyników pozostałych urządzeń: wszystko, co od nich zależy, jest oznaczone jako założenie i trzymane w stałych, żeby zmiana była poprawką w kroku „Scalanie”, a nie pisaniem od nowa.
