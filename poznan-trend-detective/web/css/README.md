# Style aplikacji: części w `web/css/`

Dawny `web/styles.css` jest pocięty na 17 części (plus części dodane później) w tej samej kolejności, więc kaskada (która reguła wygrywa) jest
taka sama jak wcześniej. `index.html` ładuje je po kolei.

| Plik | Co w nim jest |
|---|---|
| `01-base.css` | zmienne kolorów (jasny, ciemny motyw), krój pisma, podstawy |
| `02-search-tools.css` | wyszukiwarka i narzędzia rysowania |
| `03-card.css` | karta miejsca, wskaźnik ryzyka, lista odkryć |
| `04-top-right.css` | przyciski w prawym górnym rogu |
| `05-drawer.css` | szuflada, przełącznik, suwaki, przełącznik segmentowy |
| `06-legend.css` | legenda |
| `07-timeline.css` | oś czasu |
| `08-map.css` | szczegóły mapy |
| `09-dialogs.css` | okna dialogowe |
| `10-small-screens.css` | mniejsze ekrany |
| `11-inspection-theme-draw.css` | lista techniczna, zmiana motywu, rysowanie, tablety |
| `12-sarnik-v2-radar.css` | SARnik v2: radar, „Jak widzi radar” |
| `13-sarnik-v3-plain.css` | SARnik v3: widoki, prosty przegląd, moduły, znak SAR, oś radarowa |
| `14-qa-fixes.css` | poprawki z QA (14.11), niskie ekrany, telefony |
| `15-nisar-banner.css` | baner NISAR 2026 w karcie |
| `16-score.css` | karta oceny miejsca |
| `17-pros-cons.css` | wady i zalety |
| `18-parcels.css` | mapa działek (granice z ULDK, wybrana działka) |
| `19-helvetica-szklo.css` | design 15.11 (Figma, quick look 6): Helvetica Neue, szkło na pływających kontenerach, pasek wyszukiwania, karta jako lista wierszy; sam wygląd, bez zmian w logice |
| `20-hex.css` | heksy na mapie: próbki w legendzie, schodki klas, obwódka podtopień, przełącznik heatmapa / heksy |

Zasady:
- **Poprawka istniejącego elementu:** w części, w której jest jego reguła.
- **Nowa funkcja:** nowy plik na końcu (`18-moja-funkcja.css`) i `<link rel="stylesheet" href="css/18-moja-funkcja.css?v=…">`
  w `index.html` po ostatnim linku. Dopisywanie wszystkiego na koniec jednego wspólnego pliku było głównym źródłem
  konfliktów.
- **Kolejność ma znaczenie:** późniejszy plik wygrywa przy tej samej szczegółowości selektora. Nie zmieniaj kolejności
  linków bez sprawdzenia wyglądu.
- Style modułów karty mieszkają przy modułach: `web/sarnik/<nazwa>.css` (patrz `docs/planwyd/KONTRAKT.md`).
- Nowy `<link>` dostaje ten sam numer `?v=` co pozostałe; numer podbija tylko osoba robiąca deploy
  (`node poznan-trend-detective/tools/stamp-assets.mjs`).
