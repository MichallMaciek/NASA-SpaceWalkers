# Radar rok po roku: liczby i zdania do prezentacji

> Dopisek wajlk, 15.11.2026, 09:15. Propozycje do `poznan-trend-detective/promo/prezentacje/interaktywna/steps.js`
> i do strony projektu. Niczego w prezentacji nie zmieniam; decyzja należy do osób, które ją prowadzą.
> Wszystkie liczby pochodzą z `poznan-trend-detective/web/data/sarnik/radar_lata/meta.json` i z notatki
> [RADAR_LATA.md](../przeglad-v2/RADAR_LATA.md). Kod jest w `main` od 15.11, 09:00.

## Jedno zdanie

SARnik liczy z 265 przelotów radarowych z 12 lat i jako jedyne źródło w aplikacji mówi, co faktycznie powstało
po 2020 r., gdzie kończy się mapa ze zdjęć optycznych.

## Trzy liczby, które można powiedzieć głośno

| Liczba | Co znaczy | Skąd |
|---|---|---|
| **265 przelotów, 12 lat** | Sentinel-1 każdego lata od 2015 do 2026 r. (240), NISAR w 2026 r. (19), ALOS PALSAR (6) | `passes.total` |
| **1839 ha** | tyle nowej zabudowy radar widzi po 2020 r. wokół Poznania; z tego 393 ha w samym mieście | `study.new_ha_since_2020`, `study.city_new_ha_since_2020` |
| **46 razy** | tam, gdzie mapa optyczna pokazuje nową zabudowę z lat 2015–2020, radar datuje ją na te lata 46 razy częściej niż gdzie indziej (przedział 40–53) | `checks.metoda_2015_2020` |

Dwie liczby pomocnicze, gdy ktoś zapyta „skąd wiecie, że to nie szum”:

- Drugi satelita w paśmie L (ALOS-2) widzi tę samą zmianę 20 razy częściej (18–23).
- NISAR potwierdza zabudowę, którą Sentinel-1 datuje na lata 2021–2024: 22 razy częściej (20–24).

## Propozycje do trzech kroków prezentacji

**Krok „Co powstanie obok do 2035”.** Dziś: „Prognoza z 50 lat zdjęć Landsat, sprawdzona na latach 2015–2020”.
Można dodać jedno zdanie o radarze:

> Prognozę sprawdziliśmy też radarem na latach, których nie ma żadna mapa: w miejscach, które oceniała
> najwyżej, radar widzi po 2020 r. nową zabudowę 8 razy częściej. I liczymy ją już tylko na terenie,
> który radar nadal widzi jako wolny.

**Krok „NISAR: nowy radar NASA i ISRO”.** Dziś mówi o echu w strefach podtopień („dlaczego, jeszcze nie wiemy”).
Mocniejsze i sprawdzone jest to:

> NISAR widzi przez chmury i nocą. Tam, gdzie starszy radar datuje nowe osiedla na ostatnie lata, NISAR
> widzi zabudowę 22 razy częściej niż na pustym terenie. Dlatego to on potwierdza u nas budowy z lat 2025 i 2026.

**Krok „Piszemy też, co się nie potwierdziło”.** Dziś: „Prognoza a radar 2026: przewaga ok. 1,3 raza”.
Aktualna, uczciwa wersja:

> Trzy rzeczy się nie potwierdziły. Zmiana NISAR w jednym sezonie nie wskazuje budów, bo zagłuszają ją pola.
> Wilgotność gleby z NISAR nie odróżnia terenów podtopień. A prognoza trafia w okolicę, nie w konkretną działkę.

## Po angielsku (strona projektu)

- SARnik uses 265 radar passes over 12 years: Sentinel-1 every summer from 2015 to 2026, NISAR in 2026 and
  ALOS PALSAR from 2007–2010.
- The optical built-up map ends in 2020. Radar is the only source in the app that shows what was built after
  it: 1,839 ha around Poznań, 393 ha in the city.
- Where the optical map shows new building in 2015–2020, radar dates it to those years 46 times more often
  than elsewhere (95% interval 40–53). ALOS-2 sees the same change 20 times more often, and NISAR confirms
  the building Sentinel-1 dates to 2021–2024 22 times more often.
- What did not hold up: NISAR change within one season does not mark construction (farmland dominates it),
  NISAR soil moisture does not single out flood-prone land, and the forecast finds the right neighbourhood
  but not the plot.

## Czego nie mówić

- Nie „radar potwierdza pozwolenia na budowę”. Test na decyzjach z 2026 r. nie przeszedł (2,1 raza, przedział 0,3–4,8).
- Nie „radar widzi każdy nowy dom”. Komórka ma ok. 73 m; pojedynczy dom na dużej działce często jej nie zmienia.
- Nie „NISAR pokazuje historię”. NISAR ma dane od kilku miesięcy; lata 2015–2025 niesie Sentinel-1.
- Nie „dokładny rok budowy”. Rok jest przybliżony, a lata 2025 i 2026 są zaniżone przez ostrożną regułę.

## Obrazy

| Plik | Co pokazuje |
|---|---|
| `img/radar_historia_2024.png` | widok „Historia” na roku 2024: pomarańczowe to mapa optyczna do 2020 r., turkusowe to nowa zabudowa z radaru z lat 2021–2024 (Naramowice i okolice) |
| `img/radar_karta_wykres.png` | wykres w karcie: odcinek radarowy 2021–2026 między mapą optyczną a prognozą |

Nowe zrzuty w rozdzielczości prezentacji zrobi `poznan-trend-detective/promo/capture_hires.py`.
