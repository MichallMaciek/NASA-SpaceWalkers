# Plan wykonawczy na 5 urządzeń: kodowanie SARnik

> Stan na sobotę 14.11.2026, ok. 19:35. Termin zgłoszenia: niedziela 15.11, 23:59.
> **Wszystkie pięć urządzeń może ruszać po `git pull`**: gałąź `v3` jest w `main` od 19:27.
> Bramki zespołu (z `docs/poprawa_mapy.md`): niedziela 14:00, decyzja, która wersja aplikacji idzie do zgłoszenia; niedziela 16:00, koniec zmian w aplikacji.
> Każde urządzenie przede wszystkim **koduje** i kończy wdrożeniem, które da się wrzucić osobnym PR-em. Dokumenty (pytania dla zespołu, fakty, pitch) są zadaniem dodatkowym.
> Nie zmienia `docs/PLAN.md`, `docs/pitch.md`, `docs/BURZA_MOZGOW.md` ani `docs/poprawa_mapy.md`.

## Co się zmieniło między 18:54 a 19:27

Doszły trzy rzeczy, z którymi pierwsza wersja tego planu by się zderzyła. Plan jest już do nich dopasowany.

| Co doszło | Gdzie jest teraz | Skutek dla planu |
|---|---|---|
| **Prosty przegląd w karcie miejsca**: nagłówek „N rzeczy do sprawdzenia”, wiersze w grupach „Z radaru SAR” i „Tło z innych źródeł”, sześć widoków mapy, tryb ekspercki, oś czasu radaru | w `main` od 19:27: gałąź `v3` autora aplikacji scalona w PR #9, konflikty rozwiązane, 47 kontroli w przeglądarce | Licznik ostrzeżeń już istnieje, więc **wypadł z Urządzenia 1**. Wiersze modułów trafiają do prostego przeglądu, stąd pole `sar` w kontrakcie. |
| **Przycisk „Dziś”, znikający dymek, opisy słowne w dymku**, nowa kolejność warstw w panelu | w `main` od 19:05 i 19:08, zachowane przy scaleniu | Urządzenie 4 testuje „Dziś” i dymek, ale ich nie poprawia. |
| **Lista przebudowy mapy**: jeden silnik, kafle w pełnej rozdzielczości, testy przed przełączeniem | `docs/poprawa_mapy.md` | Testy z Urządzenia 4 są warunkiem z punktu 12 tej listy. Przegląd nauki z Urządzenia 5 sprawdza punkt 9. Reszty listy ten plan nie rusza. |

W zespole „v3” oznacza dwie różne rzeczy: gałąź `v3` autora aplikacji (prostszy interfejs, już w `main`) i przebudowę silnika mapy z `docs/poprawa_mapy.md` (w repo nie ma jeszcze jej kodu). W tym planie „gałąź `v3`” to zawsze ta pierwsza.

Autor aplikacji może dalej pracować na gałęzi `v3`. Jej nowe commity trzeba wtedy scalić z `main` ponownie; opis PR #9 mówi, jak rozwiązano konflikty poprzednim razem.

## Kto co robi

| Urz. | Kod: wdrożenie do wrzucenia | Skrypt | Wolno ruszać tylko | Gałąź | Dokument | Kto |
|---|---|---|---|---|---|---|
| **1** | **Rdzeń rozszerzeń**: wiersze modułów w prostym przeglądzie karty miejsca | `kod-1-rdzen.js` (8 agentów) | `web/app.js`, `web/index.html`, `web/i18n*.js`, `web/styles.css`, `web/sarnik/manifest.js` | `sarnik-rdzen` | `dok-grilling.js`, po kodzie | |
| **2** | **Moduły zagrożeń**: strefa powodziowa ISOK i osuwiska SOPO dla punktu | `kod-2-zagrozenia.js` (8) | `web/sarnik/flood.*`, `web/sarnik/landslide.*`, `tests/sarnik/` | `sarnik-zagrozenia` | `dok-fakty.js`, po kodzie | |
| **3** | **Moduł „Co tam powstanie”**: decyzje budowlane z typem zabudowy i lekki plik danych | `kod-3-wuia.js` (7) | `pipeline/sarnik_wuia.py`, `web/data/sarnik/wuia/`, `web/sarnik/wuia.*`, `tests/sarnik/` | `sarnik-wuia` | `dok-deep-pitch.js`, po kodzie | |
| **4** | **Testy automatyczne i CI** oraz małe poprawki potwierdzonych błędów | `kod-4-testy.js` (do 13) | `tests/`, `.github/workflows/`, `docs/przeglad-v2/`; w aplikacji tylko małe poprawki | `sarnik-testy` | raport `APLIKACJA.md` powstaje w tym samym skrypcie | |
| **5** | **Strona „O projekcie”** z liczbami czytanymi na żywo z danych, po przeglądzie nauki i liczb | `kod-5-strona.js` (13) | `web/about.html`, `web/about.js`, `web/about.css`, `tests/nauka/`, `docs/przeglad-v2/NAUKA.md` | `sarnik-strona` | raport `NAUKA.md` powstaje w tym samym skrypcie | |

Ścieżki w kolumnie „Wolno ruszać” są względne do `poznan-trend-detective/` (poza `.github/` i `docs/`). Skrypty leżą w `docs/planwyd/`. Kolumnę „Kto” wypełnia zespół: jedna osoba na urządzenie.

### Jak uruchomić (każde urządzenie)

`git pull`, potem w Claude Code wkleić, z nazwą swojego skryptu:

```
Uruchom narzędziem Workflow skrypt docs/planwyd/kod-2-zagrozenia.js z tego repozytorium:
scriptPath = pełna ścieżka do tego pliku, args = {"repo": "<pełna ścieżka do repozytorium>"}.
Nie zmieniaj skryptu. Gdy skończy: przejrzyj zmiany (git status, git diff), zrób gałąź podaną w wyniku,
zrób commit bez prywatnego adresu e-mail i otwórz PR z opisem zwróconym przez workflow.
```

Skrypty mają modele ustawione na sztywno: Opus do projektu, kodu i przeglądu, Sonnet albo Haiku z niskim wysiłkiem do sond i wyszukiwań. Żaden agent nie używa Fable. Każdy skrypt sam przygotowuje środowisko, którego potrzebuje (wirtualne środowisko Pythona w `poznan-trend-detective/.venv`, którego git nie śledzi).

Skrypt `kod-1-rdzen.js` zaczyna od sprawdzenia, czy w `main` jest prosty przegląd (jest od 19:27). Gdyby go nie było, kończy po jednym agencie z komunikatem i niczego nie zmienia.

| Urz. | Co musi być na komputerze |
|---|---|
| 1, 4 | Node, Python 3 i Chrome (albo zgoda na pobranie Chromium przez Playwright) |
| 2 | Node i `curl` |
| 3 | Node i Python 3 |
| 5 | Node i Python 3 (pakiety `numpy`, `pillow`, `scipy` instaluje skrypt) |

## Dlaczego pięć komputerów się nie zderzy

- **Start:** wszystkie ruszają w tej samej chwili, z aktualnego `main`. Żadna faza nie wymaga wyniku innego urządzenia.
- **Własność plików:** każde urządzenie ma własne pliki i własną gałąź (tabela wyżej). `web/app.js` rusza tylko Urządzenie 1 i, w granicach małych poprawek, Urządzenie 4.
- **Kontrakt:** [`docs/planwyd/KONTRAKT.md`](planwyd/KONTRAKT.md) opisuje, jak moduł podłącza się do aplikacji (`window.SARNIK`). Urządzenie 1 buduje rdzeń według kontraktu, a urządzenia 2 i 3 piszą moduły według tego samego kontraktu, więc pasują do siebie od razu.
- **Testy bez czekania:** moduły testuje się w Node na „sztucznym rdzeniu” ([`docs/planwyd/kontrakt/fake_core.mjs`](planwyd/kontrakt/fake_core.mjs)); wzór to `node docs/planwyd/kontrakt/selftest.mjs`. Rdzeń musi przejść ten sam scenariusz w prawdziwej przeglądarce z modułem przykładowym.
- **Moduł bez rdzenia jest bezczynny:** jego plików nic nie ładuje, więc PR z modułem nie może niczego zepsuć.
- **Limity:** jeśli urządzenia korzystają z jednego konta, limity zapytań są wspólne. Przy błędach limitu zmniejsz liczbę agentów pracujących naraz; nie czekaj na pozostałe.

## Jak ten plan ma się do `docs/poprawa_mapy.md`

| Punkt listy | Co robi ten plan |
|---|---|
| 1 i 2: przycisk „Dziś”, znikający dymek | Zrobione w `main` o 19:08. Urządzenie 4 tylko je testuje. |
| 3–5, 7, 8, 10, 11: silnik mapy, kafle, `layers.json`, statystyki liczone w tle, wygląd, pamięć podręczna | Poza tym planem. Mają własne strumienie (Dane, Mapa, Interfejs). |
| 6: decyzje budowlane jako kafle wektorowe | Uzupełnia Urządzenie 3: tam warstwa na mapie, tu wiersz w karcie miejsca. |
| 9: poprawna obróbka danych w pipeline | Urządzenie 5 sprawdza w kodzie, które z czterech poprawek są już zrobione, i wpisuje wynik do `NAUKA.md`. |
| 12: testy przed przełączeniem | Urządzenie 4 obejmuje testami listę z tego punktu. Jeśli na gałęzi `v3` pojawią się commity, których nie ma w `main`, test uruchamia się też na jej kopii. |
| 14 i 15: bramki 14:00 i 16:00 | Przyjęte w tym planie. |

Moduły z urządzeń 2 i 3 dotyczą karty miejsca, a nie mapy, więc przebudowa silnika mapy ich nie unieważnia.

## Co da się wrzucić i kiedy

| PR | Co zawiera | Kiedy można zmergować | Kto merguje |
|---|---|---|---|
| `sarnik-zagrozenia` (2) | dwa moduły i ich testy | od razu po przeglądzie: pliki są bezczynne | dowolna osoba z zespołu |
| `sarnik-wuia` (3) | skrypt danych, plik danych, moduł, test | od razu po przeglądzie: pliki są bezczynne | dowolna osoba z zespołu |
| `sarnik-testy` (4) | testy, workflow GitHuba, małe poprawki | testy i CI od razu; poprawki w aplikacji po zgodzie autora | autor aplikacji dla zmian w `web/` |
| `sarnik-strona` (5) | trzy nowe pliki strony | od razu po przeglądzie: strona nie zmienia aplikacji | dowolna osoba z zespołu |
| `sarnik-rdzen` (1) | małe zmiany w karcie miejsca i liście modułów | po przeglądzie autora, bo dotyka jego pliku | autor aplikacji |

Na Firebase wdraża tylko właściciel projektu.

## Scalanie

1. PR-y urządzeń 2, 3, 4 i 5 wchodzą do `main` w dowolnej kolejności.
2. Autor aplikacji przegląda i merguje rdzeń (`sarnik-rdzen`).
3. Jedna linijka w `web/sarnik/manifest.js` włącza moduły, które są już w `main`: `window.SARNIK_MODULES = ["flood", "landslide", "wuia"];`. Wtedy wiersze pojawiają się w karcie miejsca.
4. Link do strony „O projekcie” trafia do okna „O danych” w aplikacji (jedna linijka, robi autor aplikacji).
5. Urządzenie 4 uruchamia test w przeglądarce na złożonej całości; właściciel Firebase wdraża.

Jeśli rdzeń nie zdąży przed niedzielą 16:00, moduły po prostu się nie pokażą, a aplikacja działa jak dziś. Testy, CI i strona „O projekcie” nie zależą od rdzenia.

## Zasady wspólne

- **Modele:** każdy agent ma jawnie podany model. Opus do analizy, pisania i kodu; Sonnet albo Haiku z niskim wysiłkiem do wyszukiwań i sond. Skryptów nie trzeba zmieniać.
- **Uczciwość:** brak danych to „brak danych”, nigdy „bez zagrożeń”. Każda liczba ma źródło. Weryfikator sieciowy zwraca dosłowny cytat i URL; bez cytatu werdykt to „nie znaleziono”.
- **Język wierszy w karcie:** jedno albo dwa proste zdania dla kupującego, bez żargonu i bez dB, ze źródłem w osobnej linii. Tak pisze prosty przegląd, który jest już w `main`.
- **Agenci nie robią commitów.** Gałąź, commit i PR robi osoba przy komputerze, po przejrzeniu zmian.
- **Bez zmian zostają:** `docs/PLAN.md`, `docs/pitch.md`, `docs/BURZA_MOZGOW.md`, `docs/poprawa_mapy.md`, `docs/pomysly-sar/*`, `poznan-trend-detective/docs/`, `promo/`, model prognozy, istniejące dane i skrypty pipeline'u.
- **Punkty z `docs/poprawa_mapy.md` mają swoich wykonawców.** Agenci z tego planu ich nie realizują.
- **Git:** commity bez prywatnych adresów e-mail (adres noreply z GitHuba).
- **Zanim zaczniesz:** zrób `git fetch` i sprawdź `git log origin/main`. W sobotę wieczorem `app.js` zmieniały dwie osoby w odstępie kilku minut, więc zaczynaj od świeżego `main`.

## Fakty ustalone 14.11 (nie sprawdzać ponownie)

- **Ocena:** 5 kryteriów po 1–5 pkt (Impact, Creativity, Validity, Relevance, Presentation). Demo: film ≤ 30 s **albo** ≤ 7 slajdów. Strona projektu po angielsku, z ujawnieniem użycia SI.
- **Aplikacja:** SARnik v2 jest w `main` od 14.11, 18:30, a prosty interfejs z gałęzi `v3` od 19:27 (opis w `poznan-trend-detective/README.md`). Pod głównym adresem działa nadal v1. Adresy podglądu v2 i v3 są w README; podgląd v3 pokazuje gałąź sprzed scalenia, czyli bez przycisku „Dziś” i zmian dymka.
- **Siatka:** 956×898 komórek; 120 m w EPSG:3857, czyli ok. 73 m w terenie.
- **NISAR nad Poznaniem:** tryb 20+5 MHz, HH + HV; GCOV 20 m. Wersja provisional 17.06–23.10.2026, validated od 21.10 (nie mieszać). Piksele z orbity 158 są już w `main`.
- **Decyzje budowlane (WUIA):** 2 420 rekordów (VI–XI 2026), tylko miasto Poznań; kategorie w danych są zaszumione.
- **ISOK:** zapytanie `GetFeatureInfo` z `INFO_FORMAT=text/plain` zwraca ok. 2 KB z nazwami scenariuszy (Q 10%, Q 1%, Q 0,2%); format JSON zwraca 2,9 MB i nie wolno go używać. CORS jest otwarty.
- **SOPO (PIG-PIB):** działa `identify`, nie działa `query`; CORS jest.

## Stan funkcji (14.11, 19:35)

| Status | Funkcje |
|---|---|
| **Jest w `main`** (SARnik v2) | nazwa SARnik; karta miejsca; zabudowa 1975–2035 z modelem sprawdzonym na latach 2015–2020; wycinka; ceny powiatowe; trendy MODIS; podtopienia PIG-PIB; zagłębienia terenu; obraz radarowy 2026 i zmiana od czerwca (Sentinel-1); „grunt chłonie wodę”; woda widziana radarem; ruch gruntu EGMS 2016–2020; historia pasma L z ALOS-2; pasmo L 2026 z pikseli NISAR; NISAR mokro minus sucho; okno „Jak widzi radar”; warstwa decyzji budowlanych; przycisk „Dziś”; liczby z weryfikacji w `web/data/land/sar.json` |
| **Jest w `main`** (z gałęzi `v3`, od 19:27) | prosty przegląd z nagłówkiem „N rzeczy do sprawdzenia”; podział na „Z radaru SAR” i „Tło z innych źródeł”; znak radaru przy wynikach; sześć widoków mapy; tryb ekspercki; oś czasu radaru (ALOS-2 2015–2021, NISAR 2026) |
| **Powstaje w tym planie** | strefa ISOK dla punktu (2); osuwiska SOPO (2); wiersz „Co tam powstanie” z typem zabudowy (3); wiersze modułów w karcie (1); testy i CI (4); strona „O projekcie” (5) |
| **Powstaje poza tym planem** (`docs/poprawa_mapy.md`) | jeden silnik mapy; kafle w pełnej rozdzielczości; kafle wektorowe; `layers.json`; statystyki liczone w tle; pamięć podręczna na pokaz |
| **Kierunek rozwoju** | ruch gruntu z NISAR, iły poznańskie, mokradła, infrastruktura, cała Polska |

## Urządzenia: zakres i warunek „gotowe”

### Urządzenie 1: rdzeń rozszerzeń
- **Kod:** punkty rozszerzeń `window.SARNIK` według kontraktu; wiersze modułów dołączone do prostego przeglądu, w grupie wskazanej polem `sar`; nagłówek „N rzeczy do sprawdzenia” liczy także wiersze modułów; ładowanie modułów z `web/sarnik/manifest.js` (na start pusta lista).
- **Czego nie robi:** osobnego licznika ostrzeżeń (jest w nagłówku przeglądu) ani podpinania starej listy technicznej (`inspectionHTML` jest w kodzie, ale karta jej już nie wyświetla).
- **Ograniczenie:** zmiana w `app.js` ma być mała (cel: ok. 120 linii), tylko w kodzie karty miejsca, bez refaktoryzacji.
- **Gotowe, gdy:** z pustą listą modułów aplikacja działa jak dziś; test `tests/sarnik/core_contract.py` pokazuje wiersz modułu przykładowego w prawdziwej karcie, a nagłówek liczy go dopiero po odpowiedzi usługi; PR jest otwarty.

### Urządzenie 2: strefa powodziowa ISOK i osuwiska SOPO
- **Kod:** `web/sarnik/flood.js` (Q 10% lub Q 1% → czerwony, tylko Q 0,2% → żółty, brak strefy → zielony, błąd usługi → szary z linkiem do mapy) i `web/sarnik/landslide.js` (osuwisko do ok. 100 m → czerwony, do ok. 300 m → żółty).
- **Wiersze:** proste zdania, grupa „Tło z innych źródeł” (`sar: "no"`), źródło w polu `src`.
- **Gotowe, gdy:** testy modułów przechodzą na zapisanych odpowiedziach usług i na żywych zapytaniach dla mostu Rocha; PR jest otwarty.

### Urządzenie 3: „Co tam powstanie”
- **Kod:** `pipeline/sarnik_wuia.py` buduje `web/data/sarnik/wuia/wuia.json` (do 400 KB: tylko nowe budynki i drogi, z typem z opisu decyzji); `web/sarnik/wuia.js` pokazuje decyzje w promieniu 500 m (hala, magazyn lub droga → żółty; poza miastem → szary z informacją, że rejestr obejmuje tylko Poznań).
- **Wiersze:** proste zdania, grupa „Tło z innych źródeł” (`sar: "no"`), źródło w polu `src`.
- **Gotowe, gdy:** przegląd stu losowych rekordów podaje odsetek błędów klasyfikatora; test modułu przechodzi; PR jest otwarty.

### Urządzenie 4: testy automatyczne, CI i poprawki
- **Kod:** `tests/i18n_parity.mjs` (zgodność PL/EN), `tests/e2e_sarnik.py` (przeglądarka: komputer i telefon), `tests/data_contract.py` (pliki danych), `.github/workflows/tests.yml` (kontrole przy każdym pushu, bez sekretów); małe poprawki potwierdzonych błędów.
- **Dwie wersje:** test w przeglądarce sam rozpoznaje, jaki przegląd ma karta. Jeśli na gałęzi `v3` są commity, których nie ma w `main`, test uruchamia się też na jej kopii, a raport rozdziela uwagi według wersji.
- **Znany błąd do potwierdzenia i poprawienia:** w trybie eksperckim opisy słowne w dymku są po angielsku także na polskiej stronie (kod sprawdza `state.lang`, a język jest w zmiennej `lang`).
- **Zakres testów:** oś czasu z przyciskiem „Dziś”, suwaki, karta, rysowanie obszaru, PL/EN, tryb ciemny, link do miejsca, dymek (lista z punktu 12 w `docs/poprawa_mapy.md`).
- **Dokument:** `docs/przeglad-v2/APLIKACJA.md` z potwierdzonymi uwagami i zrzutami ekranu.
- **Gotowe, gdy:** testy uruchamia jedno polecenie; każda uwaga ma dowód, wersję i status; PR jest otwarty.

### Urządzenie 5: strona „O projekcie”
- **Kod:** `web/about.html`, `about.js`, `about.css`: najpierw prosto, niżej szczegóły. Polaryzacje i przyczyny fizyczne, pasmo L obok C, co liczy aplikacja, dowody z liczbami czytanymi na żywo z `sar.json`, ograniczenia, odpowiedzi na pytania wyzwania, źródła i licencje, użycie SI. PL i EN, jasny i ciemny motyw.
- **Najpierw przegląd:** pięć soczewek sprawdza fizykę, pipeline, przelicza liczby od zera, ocenia statystykę i pochodzenie danych; strona używa tylko tego, co przegląd potwierdził. Przegląd obejmuje też teksty prostego przeglądu i cztery poprawki z punktu 9 w `docs/poprawa_mapy.md`.
- **Dokument:** `docs/przeglad-v2/NAUKA.md` (co wolno powiedzieć, które liczby cytować, błędy w pipeline dla autora).
- **Gotowe, gdy:** żadna liczba na stronie nie jest wpisana ręcznie; strona działa bez plików danych; PR jest otwarty.

## Dokumenty po kodzie

Te trzy skrypty nie piszą kodu. Uruchamia je urządzenie wskazane w tabeli, gdy jego PR z kodem jest już otwarty (albo wcześniej, jeśli limity pozwalają). Wynik to nowe pliki w `docs/`: PR i od razu merge.

| Skrypt | Wynik | Agenci |
|---|---|---|
| `dok-grilling.js` | `docs/grilling/RUNDA_1.md`: pytania dla zespołu z rekomendacjami (na „tak” przyjmuje się rekomendację), `ZALOZENIA.json` | 13 |
| `dok-fakty.js` | `docs/fakty/FAKTY.md`: co wolno powiedzieć o prawie, NIK i przypadkach, z cytatami i linkami | 11 |
| `dok-deep-pitch.js` | `docs/deep-pitch/DEEP_PITCH.md` i `DEEP_PITCH_PL.md`: 7 slajdów, film 30 s, tekst strony projektu, bank pytań jury | 14 |

## Ryzyka

- **Kartę miejsca zmieniają dwie osoby.** Scalenie z 19:27 pogodziło ich wersje, ale kolejne commity na gałęzi `v3` albo w `main` mogą się znów rozejść. Dlatego zmiana rdzenia jest mała, a każde urządzenie zaczyna od `git pull`. Reszta planu nie zależy od rdzenia.
- **Przebudowa silnika mapy może mocno przepisać `app.js`.** Moduły to przetrwają, bo żyją w osobnych plikach i dotyczą karty. Rdzeń trzeba by wtedy przenieść do nowego kodu karty (ok. 120 linii).
- **Modułów nie widać w karcie, dopóki rdzeń nie jest w `main`.** Do tego czasu są sprawdzone tylko testami na sztucznym rdzeniu; opisy PR mówią to wprost.
- **Usługi ISOK i PIG-PIB bywają wolne.** Wiersz po 6 s pokazuje „brak odpowiedzi” z linkiem i nie blokuje karty.
- **Mapy ISOK mają w metadanych ważność do 21.12.2025.** Moduł podaje datę danych; sonda sprawdza, czy jest nowsza edycja.
- **Skrypty workflow nie były jeszcze uruchomione na prawdziwych agentach.** Przeszły próbę na sucho (składnia, przepływ, modele, blokada startu rdzenia), ale pierwsze uruchomienie może wymagać poprawki w treści zadania.
