# Rdzeń aplikacji: części w `web/app/`

Dawny `web/app.js` (ok. 3100 linii, jedna funkcja) jest podzielony na 32 części według funkcji aplikacji, żeby osoby
pracujące nad różnymi rzeczami nie edytowały tego samego pliku i nie wchodziły sobie w konflikty przy `git pull`.
Kod przeniesiono bez zmian, linia w linię (sprawdza to `tools/podziel_app.py`); jedyna różnica to sposób zatrzymania
startu, gdy nie wczytał się Leaflet albo teksty (patrz niżej).

## Która część za co odpowiada

| Plik | Co w nim jest |
|---|---|
| `01-helpers.js` | pomocniki: `DATA_V`, `fetchJSON`, rampy kolorów, statystyka (Theil-Sen, Mann-Kendall), komunikat błędu startu |
| `02-geometry.js` | geometria siatek: odwzorowania, komórki, gminy, poligony podtopień |
| `03-gray-layers.js` | warstwy szarości PNG: dekodowanie i wczytywanie (`loadGray`) |
| `04-built-up.js` | zabudowa w epokach: pierwszy rok z radaru, epoki, rangi upału, siatki, pula ryzyka |
| `05-state.js` | stan: jeden obiekt `state`, daty NISAR, uchwyty `hires` i `sar` |
| `06-sarnik-ext.js` | moduły SARnik: `window.SARNIK`, `ctx`, ładowanie modułów (`docs/planwyd/KONTRAKT.md`) |
| `07-layer-keys.js` | klucze warstw, lata pasma L, które widoki mają radarową oś czasu |
| `08-nisar-passes.js` | przeloty NISAR z lata 2026 (animacja na osi czasu) |
| `09-layer-needs.js` | marginesy mapy, warstwy pikselowe i dane potrzebne każdej warstwie (`PIXEL`, `NEEDS`), dekodery, lata |
| `10-map-layers.js` | mapa: uchwyty warstw Leaflet, decyzje budowlane (WUiA), nakładki, warstwy canvas i pikselowe |
| `11-base-map.js` | podkład (wektorowe kafle OpenFreeMap), motyw jasny/ciemny, płynne przybliżanie kółkiem |
| `12-map-init.js` | start mapy (`initMap`), nazwy miejscowości, zmiana podkładu, rozciągnięcie kolorów radaru |
| `13-layers-hires.js` | warstwy danych, cz. 1: ostre obrazy radarowe (hires), tylko zdjęcia radarowe |
| `13a-hex-layers.js` | warstwy danych, cz. 1a: heksy dla warstw ocennych i ilościowych (ocena, zabudowa, las, woda, EGMS, zmiana radaru): siatka, klasy, kafle, dymek, legenda |
| `14-layers.js` | warstwy danych, cz. 2: `renderLand` (rastry: zdjęcia radarowe, wysokość terenu), kartogram, `redraw`, `ensure` |
| `15-timeline.js` | oś czasu: lata, oś radarowa, odtwarzanie |
| `16-legend.js` | legenda |
| `17-lenses.js` | znak „z radaru” i widoki mapy (soczewki) |
| `18-drawer.js` | szuflada: ustawienia mapy, przełączniki warstw, suwaki |
| `19-hover.js` | dymek po najechaniu |
| `20-draw.js` | rysowanie obszaru (wielokąt, odręcznie) |
| `21-selection.js` | wybór miejsca: czyszczenie, komórki w pierścieniu, punkt albo obszar |
| `21a-parcels.js` | działki z ULDK (GUGiK): jedno pobieranie z pamięcią, podświetlenie pod kursorem, wybór kliknięciem, linki `#dz=`, promień koła |
| `22-place-numbers.js` | liczby dla wyboru: udział zabudowy, las, ryzyko, ceny, upał |
| `23-radar-stats.js` | liczby radarowe dla wyboru (`sarStats`, `sarSeries`, `radarChart`) |
| `24-card.js` | karta miejsca: `renderCard`, `renderCardLoading` |
| `25-card-checks.js` | karta: wiersze prostego przeglądu (`plainChecks`) |
| `26-card-pros-cons.js` | karta: wady i zalety, ocena miejsca 0–100 |
| `27-card-checkup-view.js` | karta: HTML prostego przeglądu (`plainHTML`, `riskHTML`) |
| `28-card-technical.js` | karta: przegląd techniczny, mini wykresy, „więcej” |
| `29-findings.js` | lista odkryć (gdy nic nie jest wybrane) |
| `30-trend-test.js` | okno pełnego testu trendu |
| `31-search.js` | wyszukiwarka (Nominatim) |
| `32-main.js` | język, podpięcie przycisków, `main()`: start aplikacji (ładuje się ostatnia) |

## Zasady

Reguły 1–4 i 7 sprawdza `node poznan-trend-detective/tests/app_parts.mjs` (parser JavaScriptu, uruchamiany też w CI);
reguły 5, 6 i 8 częściowo; resztę trzeba pamiętać.

1. **Wszystkie części dzielą jeden zakres nazw.** To zwykłe skrypty ładowane po kolei przez `index.html`, więc nazwa
   zadeklarowana na najwyższym poziomie w jednej części jest widoczna we wszystkich i w każdym skrypcie strony. Dlatego:
   - **nazwa najwyższego poziomu może wystąpić tylko w jednej części** (podwójne `const` zatrzymuje całą część, podwójne
     `function` po cichu podmienia wcześniejszą);
   - **nie nazywaj niczego jak globalne JavaScriptu i przeglądarki** (`name`, `status`, `history`, `open`, `stop`, `Map`,
     `Number`, `onload`…) ani jak nazwy z innych skryptów strony (`plForm` z `i18n.js`). Przed dodaniem nazwy:
     `grep -rn "nazwa" poznan-trend-detective/web/app/`.
2. **Kod, który biegnie przy wczytywaniu, może używać tylko nazw z części wcześniejszych.** Funkcje z dalszych części
   wołaj dopiero z `main()` (część 32) albo z obsługi zdarzeń. W jednym pliku `function` była widoczna wcześniej
   (hoisting); między plikami już nie.
3. **Bez `return` poza funkcją.** W starym pliku zatrzymanie startu robiło `return;`. Teraz robi to część 01
   (`window.SARNIK_STOP`), a każda następna część zaczyna się od linii
   `if (window.SARNIK_STOP) throw window.SARNIK_STOP;`. Zostaw ją na początku nowych części.
4. **Każda część zaczyna się od `"use strict";`** (po komentarzu z opisem).
5. **Co ma ruszyć dopiero, gdy cały rdzeń jest wczytany** (dokładanie skryptów, timery, pobieranie danych na starcie),
   uruchamiaj z `32-main.js`. Przykład: moduły `web/sarnik/` startuje `skLoadModules()` z części 32, nie z 06.
6. **Nowa część:** plik `NN-nazwa.js` (wstawka między istniejące: `NNa-nazwa.js`, np. `25a-card-alerty.js`), z takim
   samym nagłówkiem jak inne części, i tag `<script src="app/NN-nazwa.js?v=…"></script>` w `index.html` we właściwym
   miejscu, z tym samym numerem `?v=` co pozostałe tagi. Wcięcie kodu: 2 spacje, jak w innych częściach.
7. **Nowe wiersze karty miejsca** dodawaj jako moduł w `web/sarnik/` (kontrakt: `docs/planwyd/KONTRAKT.md`), nie w rdzeniu.
   Moduł trzyma cały kod w `(function () { ... })();`, żeby nie dokładać nazw globalnych.
8. **Numer `?v=` podbija tylko osoba, która robi deploy** (`node poznan-trend-detective/tools/stamp-assets.mjs`): zmienia
   wtedy wszystkie ~50 tagów naraz. Kto dodaje tag, kopiuje obecny numer, inaczej każdy commit zmienia te same linie.

## Masz niezacommitowane zmiany w starym `web/app.js` albo `web/styles.css`?

```bash
git stash          # Twoje zmiany (wszystkie pliki) idą do schowka
git pull           # przychodzi podział
python3 poznan-trend-detective/tools/przenies_zmiany_app.py stash@{0}
git stash pop      # wracają Twoje pozostałe pliki; app.js i styles.css wracają jako „deleted by us”:
git rm -q poznan-trend-detective/web/app.js poznan-trend-detective/web/styles.css
git stash drop
```

Narzędzie robi 3-drogowe scalenie: Twoje zmiany względem wersji, na której pracowałeś, trafiają do właściwych części
(także `web/css/`), nowe części dodane po podziale zostają nietknięte. Konflikty zaznacza zwykłymi znacznikami
`<<<<<<<` (kod wyjścia 1). Gdy nie da się pociąć wyniku (np. usunąłeś komentarz-znacznik sekcji), niczego nie zmienia,
kończy się kodem 2 i zostawia scalony plik w katalogu tymczasowym do przeniesienia ręcznie. Masz commity na własnej
gałęzi? Uruchom na `main`: `przenies_zmiany_app.py moja-galaz`.
