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
| `04-built-up.js` | zabudowa w epokach: pierwszy rok z radaru, wygładzanie, prognoza, rangi upału, siatki, pula ryzyka |
| `05-state.js` | stan: jeden obiekt `state`, daty NISAR, uchwyty `hires` i `sar` |
| `06-sarnik-ext.js` | moduły SARnik: `window.SARNIK`, `ctx`, ładowanie modułów (`docs/planwyd/KONTRAKT.md`) |
| `07-layer-keys.js` | klucze warstw, lata pasma L, które widoki mają radarową oś czasu |
| `08-nisar-passes.js` | przeloty NISAR z lata 2026 (animacja na osi czasu) |
| `09-layer-needs.js` | marginesy mapy, warstwy pikselowe i dane potrzebne każdej warstwie (`PIXEL`, `NEEDS`), dekodery, lata |
| `10-map-layers.js` | mapa: uchwyty warstw Leaflet, decyzje budowlane (WUiA), nakładki, warstwy canvas i pikselowe |
| `11-base-map.js` | podkład (wektorowe kafle OpenFreeMap), motyw jasny/ciemny, płynne przybliżanie kółkiem |
| `12-map-init.js` | start mapy (`initMap`), nazwy miejscowości, zmiana podkładu, rozciągnięcie kolorów radaru |
| `13-layers-hires.js` | warstwy danych, cz. 1: ostre obrazy radarowe (hires) |
| `14-layers.js` | warstwy danych, cz. 2: `renderLand`, kartogram, `redraw`, `ensure` |
| `15-timeline.js` | oś czasu: lata, oś radarowa, odtwarzanie |
| `16-legend.js` | legenda |
| `17-lenses.js` | znak „z radaru” i widoki mapy (soczewki) |
| `18-drawer.js` | szuflada: ustawienia mapy, przełączniki warstw, suwaki |
| `19-hover.js` | dymek po najechaniu |
| `20-draw.js` | rysowanie obszaru (wielokąt, odręcznie) |
| `21-selection.js` | wybór miejsca: czyszczenie, komórki w pierścieniu, punkt albo obszar |
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

## Zasady (pilnuje ich `tests/app_parts.mjs`, uruchamiany w CI)

1. **Wszystkie części dzielą jeden zakres nazw.** To zwykłe skrypty ładowane po kolei przez `index.html`, więc nazwa
   zadeklarowana na najwyższym poziomie w jednej części jest widoczna we wszystkich. Dlatego:
   - **nazwa najwyższego poziomu może wystąpić tylko w jednej części** (podwójne `const` zatrzymuje całą część, podwójne
     `function` po cichu podmienia wcześniejszą);
   - **nie nazywaj niczego jak globalne przeglądarki** (`name`, `status`, `history`, `open`, `stop`, `Map`…).
2. **Kod, który biegnie przy wczytywaniu, może używać tylko nazw z części wcześniejszych.** Funkcje z dalszych części
   wołaj dopiero z `main()` (część 32) albo z obsługi zdarzeń. W jednym pliku `function` była „widoczna wcześniej”
   (hoisting); między plikami już nie.
3. **Bez `return` poza funkcją.** W starym pliku zatrzymanie startu robiło `return;`. Teraz robi to część 01
   (`window.SARNIK_STOP`), a każda następna część zaczyna się od linii
   `if (window.SARNIK_STOP) throw window.SARNIK_STOP;`. Zostaw ją na początku nowych części.
4. **Każda część zaczyna się od `"use strict";`** (po komentarzu z opisem).
5. **Nowa część:** plik `NN-nazwa.js` (wstawka między istniejące: `NNa-nazwa.js`, np. `25a-card-alerty.js`) i tag
   `<script src="app/NN-nazwa.js?v=…"></script>` w `index.html` we właściwym miejscu. Numer `?v=` ma być ten sam co
   w innych tagach (`node tools/stamp-assets.mjs --check`).
6. **Nowe wiersze karty miejsca** dodawaj jako moduł w `web/sarnik/` (kontrakt: `docs/planwyd/KONTRAKT.md`), nie w rdzeniu.

## Masz niezacommitowane zmiany w starym `web/app.js` albo `web/styles.css`?

```bash
git stash          # Twoje zmiany idą do schowka
git pull           # przychodzi podział
python3 poznan-trend-detective/tools/przenies_zmiany_app.py stash@{0}
```

Narzędzie robi 3-drogowe scalenie: Twoje zmiany względem wersji, na której pracowałeś, trafiają do właściwych części
(i plików w `web/css/`). Konflikty zaznacza zwykłymi znacznikami `<<<<<<<`. Masz commity na własnej gałęzi? Podaj ją:
`przenies_zmiany_app.py moja-galaz`.
