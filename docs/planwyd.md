# Plan wykonawczy na 3 urządzenia: grilling, deep pitch, aplikacja SARnik

> Stan na sobotę 14.11.2026, ok. 18:40. **Aktualizacja:** o 18:30 autor aplikacji wrzucił do `main` SARnik v2 (radar w roli głównej, piksele NISAR), więc część 3 to teraz przegląd i testy v2, a tabela statusów jest poprawiona. Trzy części uruchamiane równocześnie na trzech komputerach, łącznie ok. 56 agentów. Nie zmienia `docs/PLAN.md`, `docs/pitch.md` ani `docs/BURZA_MOZGOW.md`.

## Kontekst

- Termin: **niedziela 15.11, 23:59**, wyzwanie „Dancing with the SARs”. Bramka zespołu: niedziela 12:00.
- W repo są dwa pitche tego samego produktu: `poznan-trend-detective/docs/PITCH.md` (stara nazwa) oraz `docs/pitch.md` z `docs/pomysly-sar/` (SARnik, NISAR w centrum). Ustalone: **to jeden produkt, nazwa SARnik**.
- Aplikacja `poznan-trend-detective/web` działa, ale NISAR to w niej tylko podgląd kafli z NASA GIBS. Tabela w `docs/pitch.md` §4.1 opisuje jako „działa w demie” rzeczy, których dziś nie ma.

## Podział

| Urządzenie | Zadanie | Agenci | Pisze tylko w | Gałąź | Koniec |
|---|---|---|---|---|---|
| **1** | Grilling: pytania dla zespołu + arkusz faktów | 22 (+2) | `docs/grilling/` | `grilling` | PR + merge |
| **2** | Deep pitch (EN + PL) | 14 | `docs/deep-pitch/` | `deep-pitch` | PR + merge |
| **3** | Przegląd i testy SARnik v2 | ok. 19 | `docs/przeglad-v2/`, `poznan-trend-detective/tests/` | `przeglad-v2` | raport: PR + merge; testy i poprawki: PR otwarty |

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
- **Piksele NISAR są w `main`** (według README: GCOV, orbita 158, wersja provisional, 25.06–11.10.2026, uśrednione do siatki aplikacji).

## Założenia startowe (obowiązują wszystkich do odpowiedzi zespołu)

| Temat | Założenie |
|---|---|
| Nazwa i wyzwanie | SARnik, „Dancing with the SARs” |
| Hasło | „Deweloper ci tego nie powie. Radar tak.” / *The developer won't tell you. The radar will.* |
| Obszar | Poznań i 17 gmin powiatu, tak jak w aplikacji |
| Demo | przygotowujemy oba warianty: 7 slajdów i film 30 s; wybór należy do zespołu |
| Bramka | niedziela 12:00: warstwy z pikseli NISAR są już w `main`; zespół potwierdza, że działają też po wdrożeniu |
| Ocena miejsca | osobne flagi (zielona / żółta / czerwona), bez jednej zbiorczej oceny 0–100 |

Urządzenie 1 może w `RUNDA_1.md` zakwestionować każde z tych założeń; zmiany wchodzą dopiero w kroku „Scalanie”.

## Statusy funkcji (stan `main` 14.11, 18:33; Urządzenie 2 używa tej tabeli w pitchu)

Według README i kodu w `main`. Przegląd Urządzenia 3 dopiero sprawdza, czy wszystko działa tak, jak opisano.

| Status | Funkcje |
|---|---|
| **Jest w `main`** (SARnik v2) | nazwa SARnik; karta miejsca; zabudowa 1975–2035 z modelem sprawdzonym na latach 2015–2020; wycinka; ceny powiatowe; trendy MODIS; podtopienia PIG-PIB; zagłębienia terenu; obraz radarowy 2026 i zmiana od czerwca (Sentinel-1); „grunt chłonie wodę” (reakcja odbicia na wilgotność gleby); woda widziana radarem; ruch gruntu EGMS 2016–2020; historia pasma L z ALOS-2 (2015–2021); pasmo L 2026 z pikseli NISAR; NISAR mokro minus sucho (25.06 kontra 24.08); okno „Jak widzi radar” (pasmo L obok C); warstwa decyzji budowlanych WUIA; liczby z weryfikacji w `web/data/land/sar.json` |
| **Wdrożenie** | pod głównym adresem działa jeszcze v1; v2 ma adres podglądu podany w `poznan-trend-detective/README.md` |
| **Nie ma** (do decyzji zespołu) | strefa ISOK dla punktu (jest tylko link); osuwiska SOPO; licznik ostrzeżeń; wiersz „Co tam powstanie” z typem zabudowy |
| **Kierunek rozwoju** | ruch gruntu z NISAR, iły poznańskie, mokradła, infrastruktura, cała Polska |

## Scalanie po zakończeniu (jedyny krok po kolei, nie blokuje pracy)

| Co | Daje | Bierze | Kiedy |
|---|---|---|---|
| `docs/grilling/FAKTY.md`, `ZALOZENIA.json` | 1 | 2 i 3: krótka poprawka tam, gdzie fakty lub rekomendacje różnią się od założeń startowych | gdy część 1 jest w `main` |
| `docs/grilling/RUNDA_1.md` | 1 | cały zespół | burza mózgów |
| `docs/przeglad-v2/RAPORT.md` (potwierdzone błędy i twierdzenia bez pokrycia) | 3 | 2: pitch nie powtarza niczego, co raport podważa; autor aplikacji: poprawki | gdy raport jest w `main` |
| Odpowiedzi zespołu | zespół | 1 (runda 2), 2 (przypisy), 3 (stałe w kodzie) | po burzy mózgów |

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

**Wejście:** `docs/pitch.md` (źródło SARnik), `PITCH.md` (liczby i test modelu), `docs/pomysly-sar/` oraz tabele „Założenia startowe” i „Statusy funkcji” z tego pliku. Twierdzenia z sekcji „Niepotwierdzone” w `pomysly-sar/zrodla.md` traktuj jako niepotwierdzone, dopóki nie ma `FAKTY.md`. **Wynik:** `docs/deep-pitch/DEEP_PITCH.md` (EN) i `DEEP_PITCH_PL.md`, PR + merge.

| Faza | Agenci | Co robią |
|---|---|---|
| Szkice | 3 × Opus | Trzy niezależne wersje: problem kupującego („Deweloper ci tego nie powie. Radar tak.”); nauka NISAR (pasmo L kontra C, przyczyny fizyczne); dowód („model przewidział, NISAR widzi, urząd potwierdza”). |
| Jury | 5 × Opus | Po jurorze na kryterium, ocena 1–5. Szkice oznaczone A, B, C, żeby ocena była ślepa. |
| Synteza | 1 × Opus (`xhigh`) | Zwycięzca plus najlepsze elementy pozostałych. |
| Czerwony zespół | 3 × Opus | Fizyka SAR i nadmierne obietnice (względem `docs/pitch.md` §6); każda liczba kontra źródło (liczba bez znacznika odpada); zasady zgłoszenia. |
| Finał | 2 × Opus | Wersja EN, a po jej zamrożeniu wersja PL na event lokalny. |

**Zawartość:** jedno zdanie; problem ze źródłami; dlaczego radar; produkt; tabela dowodów ze statusem zgodnym ze stanem faktycznym (działa dziś / w PR / po danych NISAR / kierunek); 7 slajdów z notatkami; film 30 s; tekst strony projektu z odpowiedziami na pytania wyzwania; bank trudnych pytań jury; ograniczenia. Założenia zależne od zespołu są przypisami `[ZAŁOŻENIE Qn]`, nigdy tekstem na slajdzie.

**Gotowe, gdy:** każda liczba ma źródło, slajdów jest 7, film mieści się w 30 s, a statusy w tabeli dowodów zgadzają się z tabelą „Statusy funkcji”.

---

## Urządzenie 3: Przegląd i testy SARnik v2 (ok. 19 agentów)

**Dlaczego zmiana:** SARnik v2 w `main` robi większość pierwotnego zakresu tej części, na prawdziwych pikselach NISAR. Zamiast dublować kod, ta część sprawdza to, co jest, zanim zobaczy to jury.

**Wynik:** `docs/przeglad-v2/RAPORT.md` (PR + merge) oraz otwarty PR z gałęzi `przeglad-v2`: testy w `poznan-trend-detective/tests/` i tylko małe, bezpieczne poprawki, bo autor równolegle edytuje `app.js`.

| Faza | Agenci | Co robią |
|---|---|---|
| Mapa | 2 × Sonnet low | Spis nowych funkcji w kodzie oraz spis twierdzeń w tekstach (PL/EN, README) z danymi, na których stoją. |
| Szukanie | 7 × Opus | Soczewki: poprawność JS; fizyka radaru i uczciwość twierdzeń; poprawność pipeline'u (statystyka, maski, wersje danych); zgodność PL/EN; testy w przeglądarce na komputerze i telefonie; wymogi wyzwania i licencje danych; ładowanie danych i zachowanie przy błędach. |
| Weryfikacja | do 6 × Opus | Każda uwaga jest podważana. Zostają tylko te z dowodem: linia kodu, wynik polecenia albo zrzut ekranu. |
| Poprawki | 2 × Opus | Małe i bezpieczne; reszta idzie do raportu jako zalecenie dla autora. |
| Kontrola i raport | 2 × Opus | Ponowne testy, zrzuty ekranu, raport po polsku z tabelą uwag i statusem każdej. |

**Gotowe, gdy:** raport jest w `main`, testy da się uruchomić jednym poleceniem, a każda uwaga ma dowód i status (poprawione w PR / do decyzji autora).

---

## Ryzyka

- Kilka osób edytuje aplikację jednocześnie: przed startem pracy nad kodem sprawdź `git log origin/main` i gałąź `v2`, żeby nie budować na starej wersji.
- Wdrożenie zależy od właściciela projektu Firebase.
- Wszystkie części startują przed odpowiedziami zespołu i bez wyników pozostałych urządzeń: wszystko, co od nich zależy, jest oznaczone jako założenie i trzymane w stałych, żeby zmiana była poprawką w kroku „Scalanie”, a nie pisaniem od nowa.
