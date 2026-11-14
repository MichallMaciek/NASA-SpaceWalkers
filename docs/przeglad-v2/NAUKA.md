# Przegląd naukowy SARnik v2

Stan na 14.11.2026, wieczór. Przegląd obejmuje `main` po wypchnięciu przez kolegę (commit 0cdedf1: v3 scalona o 19:27, README główne z 19:15).

Dla kogo:
- **autor aplikacji**: rozdział 4 (błędy i poprawki, z plikiem i linią);
- **piszący pitch**: rozdziały 2 i 3 (co wolno powiedzieć i które liczby cytować).

Jak powstał: pięć soczewek (fizyka, pipeline, przeliczenie, statystyka, dane). Każdą uwagę sprawdził drugi recenzent. Tu są tylko uwagi potwierdzone; odrzucone są w rozdziale 10. W potoku, aplikacji i danych nic nie zmieniono. Skrypty przeglądu leżą w `poznan-trend-detective/tests/nauka/`.

Wagi:
- **blocker**: radarowiec z jury nazwie to błędem;
- **major**: myli bez zastrzeżenia;
- **minor**: nieprecyzyjne.

Skróty ścieżek (względem `poznan-trend-detective/`; „README główne” to `README.md` w katalogu repozytorium):
B = `pipeline/build_sar.py`, FS = `pipeline/fetch_sar.py`, FN = `pipeline/fetch_nisar.py`, FU = `pipeline/fetch_urban.py`, I = `web/i18n_sar.js`, A = `web/app.js`. Zapis „I:440/442” znaczy: linia 440 po polsku, 442 po angielsku.

## 0. Aktualizacja po przebudowie danych (14.11, ok. 22:45)

Po przeglądzie dane Sentinel-1 przeczytano od nowa **w pełnej rozdzielczości 10 m** (wcześniej z podglądu 80 m, bo łącze było wolne). To usuwa problem z N10 i część N45: sąsiednie komórki nie dzielą już pikseli. Warstwy i `sar.json` przebudowano, a skrypty z `tests/nauka/` uruchomiono ponownie na nowych danych (`recompute_checks_output.txt` jest zaktualizowany). **Tabele w rozdziałach 2–8 opisują wersję sprzed przebudowy; tam, gdzie liczba się zmieniła, obowiązuje ten rozdział.**

| Test | Przed (80 m) | Teraz (10 m) | Co to zmienia w brzmieniu |
|---|---|---|---|
| Decyzje o nowej budowie (`wuia`) | 12 z 766 komórek, 4,46 raza; 4 budowy; przedział 0,6–10 | 16 z 766 (2,1% wobec 0,5%), ok. 4,2 raza (przeliczenie 4,06); **8 decyzji, 9 skupisk**; bootstrap blokowy 0,6 km: **1,7–7,1** (P(≤1) = 0,003), 1,2 km: 1,4–7,5 | T11: „Silne pojaśnienie jest ok. 4 razy częstsze na działkach z decyzją o nowej budowie (16 z 766 komórek z 8 decyzji; przedział ok. 1,7–7).” Nadal bez p dla komórek. Wśród trafień są 3 zmiany wcześniejszych pozwoleń i 2 budowy sieci. |
| Sam ślad ścian (`wuia_walls`) | 3 z 766, 1,63 raza, p = 0,28 | 9 z 766, ok. 3,5–3,7 raza; bootstrap 0,6 km: 1,2–6,4, 1,2 km: **0,7–7,1** | T13: ślad ścian „też częstszy, ale wynik na granicy”. Nadal nie mówimy „nowe budynki”. |
| Hektary pojaśnienia | 693 ha (≥ 3 dB), 358 ha (ściany) | 1 086 ha, 506 ha; ok. 34% komórek ścian na terenie zabudowanym w 2020 | Górna granica, każda przyczyna. |
| Prognoza a radar (`model`) | 2,13 raza; ściany 4,3 | 1,78; ściany 3,83; po wyrównaniu odległości od zabudowy (≤ 150 m): 1,27 (1,00–1,60), ściany 1,62 (1,20–2,14) | T16 bez zmian: bez krotności, „głównie skraj osiedli”; przewaga prognozy wyraźna tylko dla śladu ścian. |
| Ciemnienie rok do roku | 17 310 ha, 98% na polach | 20 759 ha, 97,6% na otwartym terenie | N32 bez zmian. |
| Reakcja na wilgoć (pasmo C) | 26%; podtopienia 27% wobec 26% | 23%; podtopienia 25% wobec 23% (p = 0,005 dla komórek, ale bootstrap 0,95–1,27) | T7 bez zmian: „prawie taka sama”. Aplikacja wymaga teraz efektu ≥ 1,2, zanim napisze „częściej”. |
| Sezon a rok do roku | 3,1% wobec 0,3% | 4,0% wobec ok. 0,5% | Liczby w T18. |
| NISAR (mokro/sucho, podtopienia) i EGMS | 37%; 19% wobec 38%; EGMS 24%, 147 komórek | bez zmian | — |

## 1. W skrócie

- **Werdykt:** obróbka danych jest poprawna (moc uśredniana liniowo, warstwy na jednej siatce, dobre filtry NISAR, kalibracja ALOS-2 wg JAXA), a liczby z `sar.json` dają się odtworzyć. Słaba jest interpretacja kilku nagłówkowych zdań.
- **Najpierw 1:** NISAR „po deszczu ziemia nasiąkła na 37% pól” to deszcz razem ze żniwami (para 25.06 → 24.08). Wartości 0,09 i 0,30 to ERA5 z Open-Meteo, nie NASA POWER (N44, N2).
- **Najpierw 2:** „4,5 razy częściej na działkach z pozwoleniem, p < 0,001” stoi na 12 komórkach z 4 budów. Sam ślad ścian („nowe budynki na 358 ha”) testu nie przechodzi. README główne nazywa to „korelacją 4,46x” (N45, N3, N58).
- **Najpierw 3:** „ciemniej = rozbiórka, wycinka, asfalt” i „żniwa i orka się znoszą”: 17 310 ha ciemnienia to w 98% pola (N32).
- **Rola NASA:** każdy sprawdzony wynik radarowy stoi na Sentinel-1. Pitch nie może mówić, że NISAR widzi budowę (N61, rozdział 5).
- **Liczba uwag:** 72 potwierdzone (9 blocker, 26 major, 37 minor), po scaleniu duplikatów 37 osobnych problemów; 3 odrzucone.

## 2. Co wolno powiedzieć

- **można**: mówić tak, jak jest w bezpiecznym brzmieniu;
- **przeformułować**: mówić tylko w bezpiecznym brzmieniu;
- **usunąć**: nie mówić; w kolumnach brzmienia jest to, co mówić zamiast.

Numery T1–T42 są używane w rozdziale 4.

### NISAR, deszcz i wilgotność

| # | Twierdzenie | Werdykt | Bezpieczne brzmienie PL | Safe wording EN |
|---|---|---|---|---|
| T1 | „Po deszczu 24 sierpnia ziemia wyraźnie nasiąkła na 37% pól i łąk” (NISAR) | przeformułować (N44, N1, N34, N19) | Między 25 czerwca a 24 sierpnia sygnał HH z NISAR (pasmo L) wzrósł o 2 dB lub więcej na 37% otwartego terenu. To deszcz razem ze żniwami i uprawą pól. W samych dniach 12–24 sierpnia (23,5 mm deszczu w ostatnich 3 dniach) taki wzrost był na ok. 15% terenu. | Between 25 June and 24 August, NISAR L-band HH rose by 2 dB or more on 37% of open land: rain together with harvest and tillage. Between 12 and 24 August alone (23.5 mm of rain in the last 3 days), such a rise covered about 15% of the land. |
| T2 | „25 czerwca sucho (wilgotność 0,09), 24 sierpnia mokro (0,30)” jako wilgotność NASA | przeformułować (N2, N51, N59) | Wilgotność gleby 0–7 cm wg ERA5 (Open-Meteo): 0,09 m³/m³ 25 czerwca i 0,30 m³/m³ 24 sierpnia; 23,5 mm deszczu w 3 dni przed 24 sierpnia (wartości dobowe dla dnia przelotu). Nie nazywać tych dni „suchym” i „mokrym” i nie przypisywać NASA POWER. | ERA5 0–7 cm soil moisture (Open-Meteo): 0.09 m³/m³ on 25 June and 0.30 m³/m³ on 24 August; 23.5 mm of rain in the 3 days before 24 August (daily values for the pass day). |
| T3 | Dymek „Po deszczu ziemia wysycha (żniwa)” | usunąć (N1) | Ciemniej 24 sierpnia niż 25 czerwca: zmiana upraw albo żniwa. | Darker on 24 August than on 25 June: crop change or harvest. |
| T4 | „Na 26% pól radar widzi, jak ziemia nasiąka” | przeformułować (N52, N7, N71) | Na 26% komórek otwartego terenu VV z Sentinel-1 rośnie razem z wilgotnością gleby NASA POWER (jedna seria dla całego obszaru, ok. 50 km). To reakcja powierzchni na mokrą pogodę, nie przepuszczalność gruntu. Zabudowa reaguje prawie tak samo często. | On 26% of open-land cells, Sentinel-1 VV rises with NASA POWER soil wetness (one series for the whole area, about 50 km across). This is the surface responding to wet weather, not soil drainage. Built-up land reacts almost as often. |
| T5 | „Sygnał wilgotności w paśmie C to nie tylko pora roku” | można (fizyka, pipeline, przeliczenie, statystyka) | Związek VV z wilgotnością NASA POWER jest prawdziwy: test permutacyjny p = 0,002; po usunięciu krzywej sezonowej wciąż ok. 29–33% bloków 480 m. | The link between VV and NASA POWER soil wetness is real: permutation test p = 0.002; with the seasonal curve removed, about 29–33% of 480 m blocks still pass. |
| T6 | Karta: „Wierzchnia warstwa łatwo wchłania wodę, zapytaj o drenaż” (ostrzeżenie) | usunąć (N7, N52) | Tu radar wyraźnie widzi, jak powierzchnia zmienia się z wilgotnością. (Poziom karty: informacja, nie ostrzeżenie.) | Here radar clearly sees the surface change with wetness. (Card level: info, not a warning.) |
| T7 | „W strefach podtopień reakcja w paśmie C nie jest wyraźnie silniejsza” | można (wszystkie soczewki) | W strefach podtopień PIG-PIB reakcja w paśmie C jest prawie taka sama (27% wobec 26%). | Inside PIG-PIB groundwater-flood areas the C-band response is about the same (27% vs 26%). |
| T8 | „Tu ma przewagę pasmo L NISAR” / „Zadanie dla pasma L” (strefy podtopień) | usunąć (N6, N53) | Pasmo L sięga głębiej w roślinność i glebę. Nasza pierwsza para przelotów NISAR obejmuje żniwa, więc nie pokaże jeszcze stref podtopień; pokaże je czysta para przelotów po deszczu i pełny rok danych NISAR. | L-band reaches further into vegetation and soil. Our first NISAR pair spans the harvest, so it cannot yet show groundwater-flood areas; a clean pair of passes after rain and a full year of NISAR will. |
| T9 | „W strefach podtopień NISAR rzadziej; nasza hipoteza: zarośnięte albo już mokre” | przeformułować (N53) | W strefach podtopień wzrost HH był o połowę rzadszy (19% wobec 38%). To głównie łąki, gdzie mniej się żnie, i więcej tu drzew; przyczyna nie jest jeszcze znana. | In groundwater-flood areas the HH rise was half as common (19% vs 38%). These areas are mostly meadows with little harvest and more trees; the cause is not yet known. |
| T10 | Sugestia, że pasmo L sięga do wody gruntowej | usunąć (N6) | Oba pasma czują tylko kilka centymetrów gleby (pasmo C ok. 1–2 cm, pasmo L ok. 5 cm w wilgotnej glebie). Przewaga pasma L to przenikanie przez roślinność. | Both bands sense only the top few centimetres of soil (C-band about 1–2 cm, L-band about 5 cm in moist soil). L-band's advantage is seeing through vegetation. |

### Budowy i prognoza

| # | Twierdzenie | Werdykt | Bezpieczne brzmienie PL | Safe wording EN |
|---|---|---|---|---|
| T11 | „Na działkach z pozwoleniem na budowę zmiany są 4,5 razy częstsze (1,57% wobec 0,35%, p < 0,001)” | przeformułować (N45, N21, N33) | Spośród 237 decyzji o nowej budowie (czerwiec–sierpień 2026), które obejmują choć jedną naszą komórkę, 4 budowy już mocno pojaśniały w radarze (12 z 766 komórek, 1,6% wobec 0,35% w reszcie Poznania). To za mało miejsc, żeby podać pewną krotność. Bez wartości p. | Of 237 new-building decisions (June–August 2026) covering at least one of our cells, 4 sites already show strong brightening (12 of 766 cells, 1.6% vs 0.35% elsewhere in Poznań). Too few sites to put a firm number on it. No p-value. |
| T12 | „Pozwolenie na budowę” jako nazwa zbioru danych | przeformułować (N9, N33) | decyzje o nowej budowie (pozwolenia, zgłoszenia, warunki zabudowy, decyzje lokalizacyjne) z czerwca–sierpnia 2026; prościej: „działki, w sprawie których miasto wydało decyzję o nowej budowie” | new-building decisions (building permits, notifications, zoning and location decisions) dated June–August 2026; plain: "plots where the city decided a new-building case" |
| T13 | „Nowe budynki widać na 358 ha” / dymek „Radar: tu nowe budynki” | przeformułować (N3, N36, N48, N50) | Na ok. 360 ha sygnał wzrósł tak, jak przy nowych ścianach. To górna granica: ok. jedna trzecia leży na terenie zabudowanym już w 2020. Sam ślad ścian nie jest jeszcze częstszy na działkach z decyzją (3 z 766 komórek, nieistotne). Dymek: „Radar: sygnał jak od nowych ścian”. | On about 360 ha the signal rose the way new walls make it rise. This is an upper bound: about a third lies on land already built in 2020. The wall signature alone is not yet more common on plots with a new-building decision (3 of 766 cells, not significant). Hover: "Radar: signal like new walls". |
| T14 | „Sygnał mocno wzrósł na 693 ha” | przeformułować (dopisać źródło i przyczynę) | Na ok. 700 ha VV z Sentinel-1 wzrósł o co najmniej 3 dB między jesienią 2025 a jesienią 2026 (każda przyczyna, także pola). | On about 700 ha Sentinel-1 VV rose by at least 3 dB from autumn 2025 to autumn 2026 (any cause, fields included). |
| T15 | README główne: „Radar widzi fundamenty i mury”, „validated … with a 4.46x correlation”, „p = 0.000” | usunąć (N58, N55, N74) | Silne pojaśnienie w radarze Sentinel-1 jest ok. 4,5 raza częstsze na działkach z decyzją o nowej budowie (stosunek częstości, z 4 budów). Sam ślad nowych ścian nie jest jeszcze potwierdzony. | Strong Sentinel-1 brightening is about 4.5 times as common on plots with a new-building decision (a rate ratio, from 4 sites). The new-wall signature alone is not yet confirmed. |
| T16 | „Prognoza się sprawdza: model przewidział, radar widzi” (2,13x; „nowe budynki 4,3 razy częściej”) | usunąć (N35, N49) | Jeśli w ogóle: radar widzi więcej zmian tuż przy istniejącej zabudowie, czyli tam, gdzie prognoza też spodziewa się wzrostu. Bez krotności. | If at all: radar sees more change next to existing buildings, where the projection also expects growth. No ratio. |
| T17 | Model „przetestowany na 50 latach” / „trained on 50 years of Landsat” (README główne :37, :89) | usunąć (N74) | Model uczony na latach 2005–2015, sprawdzony na 2015–2020. Na terenie wolnym w 2015 wygrywa z prostą regułą sąsiedztwa zabudowy (AUC 0,99 wobec 0,90), na 76 przypadkach. | Trained on 2005–2015, tested on 2015–2020. On land open in 2015 it beats a simple nearby-buildings baseline (AUC 0.99 vs 0.90), from 76 conversions. |

### Zmiana rok do roku i rolnictwo

| # | Twierdzenie | Werdykt | Bezpieczne brzmienie PL | Safe wording EN |
|---|---|---|---|---|
| T18 | „Porównanie jesieni z jesienią usuwa fałszywe pojaśnienia pól” | można (fizyka, pipeline, statystyka) | Zmiana czerwiec → listopad oznaczyłaby 3,1% terenu niezabudowanego; porównanie jesieni z jesienią oznacza 0,3%. | The June-to-November change would flag 3.1% of unbuilt land; comparing autumn with autumn flags 0.3%. |
| T19 | „Porównujemy jesień z jesienią, więc żniwa i orka się znoszą” | przeformułować (N47, N17) | Mediana 12 przelotów jesieni 2026 minus mediana 12 przelotów jesieni 2025, ta sama orbita. Usuwa to większość sezonu rolnego, ale nie różnice wilgotności i upraw między latami. | Median of 12 autumn-2026 passes minus median of 12 autumn-2025 passes, same orbit. This removes most of the farming season, but not year-to-year differences in soil moisture and crops. |
| T20 | Legenda i dymek: „ciemniej = coś zniknęło: rozbiórka, wycinka, nowy asfalt” | usunąć dla pól (N32, N46) | Radar: ciemniej niż rok temu (na polach zwykle inna uprawa, orka albo suchsza gleba). | Radar: darker than last autumn (on fields usually a different crop, tillage or drier soil). |

### Fizyka radaru

| # | Twierdzenie | Werdykt | Bezpieczne brzmienie PL | Safe wording EN |
|---|---|---|---|---|
| T21 | „Fale 5,6 cm zatrzymują się na koronach” / „pasmo C zatrzymuje się na roślinności” (README:36, I:34/61, pitch sekcja 8) | przeformułować (N5) | Fale 5,6 cm (Sentinel-1) rozpraszają się głównie w górnej części koron; przez trawę i niskie uprawy docierają jednak do gleby. | 5.6 cm waves (Sentinel-1) are scattered mostly in the upper canopy; through grass and low crops they still reach the soil. |
| T22 | „VH i HV to korony i uprawy”; „jaśniej bez podwójnego odbicia = pola, roboty ziemne” | przeformułować (N4) | Polaryzacje krzyżowe (VH, HV) najbardziej podnosi roślinność, ale podnoszą je też budynki ustawione ukośnie do toru satelity. Reguła podwójnego odbicia łapie głównie ściany mniej więcej równoległe do toru, więc część nowych budynków trafia do „jaśniej bez podwójnego odbicia”. | Cross-pol (VH, HV) is raised most by vegetation, but buildings set at an angle to the satellite track raise it too. The double-bounce rule mainly catches walls roughly parallel to the track, so some new buildings end up in "brighter without double bounce". |
| T23 | „Jasność zależy od dwóch rzeczy” | przeformułować (N15) | Dopisać: „…i od kąta, pod jakim patrzy radar”. | Add: "…and on the angle the radar looks from". |
| T24 | „Ciemne są jeziora, Warta i rozlewiska” | przeformułować (N14) | Spokojna otwarta woda jest ciemna. Zalana łąka z trawą lub trzciną nad wodą bywa jaśniejsza (podwójne odbicie), a wiatr rozjaśnia jeziora. | Calm open water is dark. A flooded meadow with grass or reeds above the water is often brighter (double bounce), and wind brightens lakes. |
| T25 | „Las świeci w HV, pola w HH” (tekst ALOS, dziś nieaktywny) | usunąć (N13) | Las wyróżnia się w HV. Pola są najciemniejsze w HH i wyróżniają się wysokim stosunkiem HH/HV. Tylko duży spadek HV nad lasem pewnie oznacza utratę drzew. | Forest stands out in HV. Fields are the darkest class in HH and stand out by a high HH/HV ratio. Only a large HV drop over forest reliably means trees were lost. |
| T26 | „Las jest jaśniejszy od otwartego terenu o 6,6 dB w HV pasma L, a tylko o 2,8 dB w VH pasma C” | można (z dopiskiem) | W obrębie każdego satelity las jest jaśniejszy od otwartego terenu o 6,6 dB w HV pasma L i o 2,8 dB w VH pasma C (mediany klas; kalibracja NISAR wstępna, inne kąty widzenia: porównuj kontrasty, nie surowe wartości). | Within each sensor, forest is 6.6 dB brighter than open land in L-band HV and 2.8 dB in C-band VH (class medians; NISAR provisional calibration, different viewing angles: compare contrasts, not raw values). |
| T27 | „NISAR jest średnio ok. 3 dB jaśniejszy od ALOS-2” | przeformułować (N12, N28) | Na całym obszarze ok. 3 dB, ale zależnie od pokrycia: ok. 1,3–2,5 dB nad lasem i zabudową, 4–6,5 dB nad polami. | About 3 dB over the whole area, but it depends on land cover: about 1.3–2.5 dB over forest and buildings, 4–6.5 dB over fields. |
| T28 | „Osiadania nie zmierzy sezon przelotów, bo trzeba lat interferometrii” | przeformułować (N16) | Używamy jasności echa (GCOV), nie fazy. Interferometria NISAR (GUNW) wykryje szybki ruch (cm na rok) już po kilku miesiącach; ruch rzędu mm na rok wymaga lat. | We use backscatter (GCOV), not phase. NISAR interferometry (GUNW) can detect fast motion (cm per year) within months; mm-per-year rates need years. |
| T29 | „Ostrzeżemy mieszkańców przed burzą”; „Copernicus DEM, model terenu” | przeformułować (N18) | NISAR może pokazać, który grunt jest już nasiąknięty przed ulewą. Źródło zagłębień: model powierzchni Copernicus DEM (radar TanDEM-X; obejmuje drzewa i budynki). | NISAR can show which ground is already waterlogged before a storm. Hollow source: Copernicus DEM surface model (TanDEM-X radar; includes trees and buildings). |

### Ruch gruntu

| # | Twierdzenie | Werdykt | Bezpieczne brzmienie PL | Safe wording EN |
|---|---|---|---|---|
| T30 | „Grunt pod Poznaniem jest stabilny”; „Czy osiada? Prawie nigdzie: typowo 0 mm na rok” | przeformułować (N8, N27, N54) | EGMS (Copernicus, 2016–2020) mierzy 24% obszaru: prawie całą zabudowę (95%) i ok. 15% pozostałego terenu. Tam, gdzie mierzy, typowy ruch pionowy to 0 mm/rok (wartości w pełnych mm; 95% komórek w granicach ±1 mm/rok). 147 komórek w ok. 50 miejscach osiada o 5 mm/rok lub szybciej. | EGMS (Copernicus, 2016–2020) measures 24% of the area: almost all built-up land (95%) and about 15% of the rest. Where it measures, typical vertical motion is 0 mm/year (whole-mm values; 95% of cells within ±1 mm/year). 147 cells in about 50 places sink by 5 mm/year or faster. |
| T31 | „EGMS mierzy głównie teren zabudowany”; „147 miejsc/stref” | usunąć (N8, N37, N54) | „głównie w zabudowie i wokół niej”; „147 komórek (ok. 53 miejsca)” | "mostly in and around built-up areas"; "147 cells (about 53 places)" |

### Przeloty i rozdzielczość

| # | Twierdzenie | Werdykt | Bezpieczne brzmienie PL | Safe wording EN |
|---|---|---|---|---|
| T32 | „NISAR mierzy Poznań co 12 dni” | przeformułować (N11, N26, N56) | Nad Poznaniem przelatują cztery orbity NISAR, więc satelita jest tu co kilka dni. Używamy jednej (158), która wraca co 12 dni: 9 przelotów od 25 czerwca do 11 października 2026, bez przelotu między 19 lipca a 12 sierpnia. | NISAR covers Poznań from four tracks; we use one (158), which repeats every 12 days: 9 passes from 25 Jun to 11 Oct 2026, with no pass between 19 Jul and 12 Aug. |
| T33 | „Każdy przelot radaru nad Poznaniem w 2026” (README:9) | przeformułować (N66) | 9 przelotów NISAR z jednej orbity (z 38 dat na czterech orbitach) i 27 przelotów Sentinel-1 z orbity względnej 73. | 9 NISAR passes from one track (of 38 dates on four tracks) and 27 Sentinel-1 passes from relative orbit 73. |
| T34 | „Piksele 10–20 m i nasze komórki 120 m”; „Sentinel-1 RTC, 10 m” | przeformułować (N10, N23, N70) | Komórki 120 m w siatce Web Mercator, czyli ok. 73 m w terenie. Sentinel-1 czytamy z podglądu 80 m, NISAR z pikseli 20 m uśrednianych w mocy. | 120 m cells on the Web Mercator grid, about 73 m on the ground. Sentinel-1 is read from its 80 m overview, NISAR from 20 m pixels averaged in power. |
| T35 | „9 przelotów provisional orbity 158; wersji nie mieszamy” | można (pipeline, dane) | 9 przelotów NISAR GCOV (wersja provisional, orbita 158), 25.06–11.10.2026; produktów provisional i validated nie mieszamy. | 9 provisional NISAR GCOV passes of track 158 (25 Jun – 11 Oct 2026); provisional and validated products are not mixed. |

### Rola NASA, podpisy, README

| # | Twierdzenie | Werdykt | Bezpieczne brzmienie PL | Safe wording EN |
|---|---|---|---|---|
| T36 | Pitch: „NISAR: zmiana odbicia przed i po, 2026”, „NISAR widzi tam budowę w 2026”, film „przed / po budowie hali” | usunąć (N61) | Nowe budowy liczymy z Sentinel-1. NISAR pokazuje, jak pasmo L widzi te same miejsca i jak teren zmienia się po deszczu i żniwach. | We detect new building with Sentinel-1. NISAR shows how L-band sees the same places and how the land changes after rain and harvest. |
| T37 | „Nowy satelita NASA” | przeformułować (N75) | Nowy radar NASA i ISRO; w treści „NASA i ISRO (Indie)”. | The new NASA-ISRO radar; in the body "NASA and ISRO (India)". |
| T38 | Warstwa GIBS: „kalibrowany SAR pasma L (sucho vs mokro)” | usunąć (N60) | Obraz NASA GIBS, wszystkie orbity; nie używany w liczbach. Przy dacie pokazać orbitę i kierunek. | NASA GIBS picture, all tracks; not used in the numbers. Show the track and direction next to the date. |
| T39 | README: „Checks” z trzema testami Sentinel-1, bez wyniku NISAR | przeformułować (N64) | Testy: (1) silne pojaśnienie częstsze na działkach z decyzją o nowej budowie, ale z 4 budów; sam ślad ścian niepotwierdzony; (2) przy prognozie radar widzi więcej zmian, głównie przy istniejącej zabudowie; (3) VV z Sentinel-1 rośnie z wilgotnością NASA POWER na 26% otwartego terenu; (4) NISAR w strefach podtopień: wzrost rzadszy (19% wobec 38%), hipoteza się nie potwierdziła. | Checks: (1) strong brightening is more common on plots with a new-building decision, but from 4 sites; the wall signature alone is not confirmed; (2) radar sees more change where the projection expects growth, mainly next to existing buildings; (3) Sentinel-1 VV rises with NASA POWER soil wetness on 26% of open land; (4) NISAR in groundwater-flood areas: the rise is less common (19% vs 38%); the hypothesis was not confirmed. |
| T40 | README główne: „MODIS (Terra/Aqua)”, „NASA Earthdata: … NASA POWER”, „Copernicus Land: DEM GLO-30”, oba radary „przenikają korony”, „zagłębienia retencyjne (NISAR + PIG-PIB)” | przeformułować (N74) | „MODIS (Terra)”; „NASA POWER (NASA Langley Research Center)”; „Copernicus DEM GLO-30 (ESA, Copernicus)”; „pasmo L przenika przez korony, pasmo C głównie nie”; „zagłębienia z modelu wysokości (DEM) i strefy PIG-PIB”. | "MODIS (Terra)"; "NASA POWER (NASA Langley Research Center)"; "Copernicus DEM GLO-30 (ESA, Copernicus)"; "L-band penetrates the canopy, C-band mostly does not"; "hollows from the elevation model (DEM) and PIG-PIB zones". |

### Metody, które są dobre

| # | Twierdzenie | Werdykt | Bezpieczne brzmienie PL | Safe wording EN |
|---|---|---|---|---|
| T41 | „Uśredniamy w mocy liniowej, warstwy leżą na jednej siatce” | można (pipeline, fizyka) | Każde uśrednienie radaru robimy w mocy liniowej, przed przeliczeniem na dB. Wszystkie warstwy leżą na tej samej siatce (sprawdzone korelacją przesunięć). | Every radar average is taken in linear power, before converting to dB. All layers sit on the same grid (checked by shift correlation). |
| T42 | „ALOS-2 kalibrujemy wg JAXA” | można (pipeline, fizyka, dane) | Mozaiki ALOS-2 przeliczamy wzorem JAXA 10·log10(DN²) − 83, z resamplingiem w mocy. | ALOS-2 mosaics are converted with JAXA's formula 10·log10(DN²) − 83, with resampling in power. |

## 3. Liczby

Gdy soczewki różniły się w werdykcie, biorę ostrzejszy i piszę to w kolumnie werdykt. „Z przeglądu” znaczy: liczby nie ma w `sar.json` ani `land.json`, policzył ją przegląd z opublikowanych warstw.

### Budowy i zmiana

| Liczba | Co dokładnie liczy | Werdykt | Brzmienie z zastrzeżeniem |
|---|---|---|---|
| 693 ha (`s1.up3db_ha`) | Komórki 120 m (ok. 0,54 ha) w obszarze badań, gdzie mediana VV Sentinel-1 z 12 przelotów IX–XI 2026 minus mediana z 12 przelotów IX–XI 2025 (orbita 73) ≥ +3 dB. Liczone na wartościach przed zaokrągleniem; aplikacja liczy z PNG i pokazuje ok. 712 ha. | z zastrzeżeniem (wszystkie soczewki) | „ok. 700 ha, gdzie VV wzrósł o ≥ 3 dB od jesieni 2025 do jesieni 2026 (każda przyczyna, także pola); ok. 530 ha z tego na terenie wolnym w 2025”. Źródło: Sentinel-1, nie NISAR. |
| 358 ha (`s1.walls_ha`) | Jak wyżej i dodatkowo zmiana VV minus zmiana VH ≥ 1,5 dB (ślad podwójnego odbicia). Z PNG 363 ha. | z zastrzeżeniem (wszystkie) | „ok. 360 ha ze śladem jak od nowych ścian; górna granica (ok. 1/3 na terenie zabudowanym w 2020; na terenie wolnym w 2025 ok. 225–240 ha); niepotwierdzone przez decyzje (p = 0,28); omija budynki ustawione ukośnie do toru”. |
| 4,46x / 4,5x; 1,57% wobec 0,35%; 12 z 766 (`checks.wuia`) | Udział komórek z VV ≥ +3 dB (dowolne pojaśnienie, nie ślad ścian) na działkach z `kategoria = 'nowa budowa'`, `status = 'decyzja'`, data ≤ 31.08.2026. To 461 rekordów; reguła środka komórki zostawia 766 komórek z ok. 205–237 decyzji. Tło: reszta miasta bez komórek wszystkich 2420 spraw. 12 trafień pochodzi z 4 decyzji, 10 z nich z dwóch zmian pozwoleń (1130/2022, 555/2025). | z zastrzeżeniem (wszystkie) | T11. Inne reguły zmieniają krotność: komórki dotknięte przez działkę 3,11; tło z wnioskami i sprzeciwami 3,71. |
| p < 0,001 (`checks.wuia.p` = 0.0) | Test dwumianowy, który liczy 766 komórek jak niezależne. | nie cytować (pipeline, statystyka, przeliczenie) | Sąsiednie komórki są skorelowane (r = 0,80). Przy losowaniu blokami 95% CI krotności ok. 0,6–10; po przerzedzeniu siatki p = 0,17. |
| 1,63x, 3 z 766, p = 0,28 (`checks.wuia_walls`) | Ten sam test dla śladu ścian. | cytować (fizyka, przeliczenie, statystyka) | „Sam ślad nowych ścian nie jest częstszy na działkach z decyzją (3 z 766 komórek; nieistotne)”. Pokazywać obok 358 ha. |
| 2,13x; 0,56% wobec 0,26%; 99 z 17 557 (`checks.model`) | Top 5% kandydatów wg `prob_2030`. Kandydaci: obszar badań, niezabudowane wg prognozowanej warstwy 2025 (udział < 14,9%). Udział VV ≥ +3 dB. | nie cytować: najostrzejszy werdykt (przeliczenie); fizyka, pipeline, statystyka, dane: z zastrzeżeniem | Ranking wg udziału zabudowy 2020 daje 1,98–2,10x. Jeśli już: „radar widzi więcej zmian tuż przy istniejącej zabudowie; w pasie 150 m od niej różnica jest mała (1,15 raza, nieistotna)”. |
| 4,3x; 77 trafień (`checks.model_walls`) | Jak wyżej, dla śladu ścian. | nie cytować: najostrzejszy (przeliczenie); reszta: z zastrzeżeniem | Baza naiwna daje 4,0–4,2x; przy tej samej odległości od zabudowy 1,2–1,3 raza. |
| p = 0,0 (`checks.model.p`, `model_walls.p`) | Test dwumianowy na komórkach. | nie cytować (statystyka) | Zamiast tego CI z bootstrapu blokowego (pojaśnienie 1,58–2,77; ściany 3,11–5,58), z uwagą, że nie uwzględnia odległości od zabudowy. |
| AUC 0,99 wobec 0,90, 76 przypadków (`land.json` model) | Test wsteczny modelu 2015–2020 na terenie wolnym w 2015, wobec reguły sąsiedztwa zabudowy. | z zastrzeżeniem (statystyka) | T17. |
| 12 + 12 przelotów (`checks.change_method`) | Rok do roku, IX–XI 2025 i IX–XI 2026, ta sama orbita 73. | z zastrzeżeniem (statystyka) | T19. |
| 3,1% → 0,3% (`season_change_open_up3db_share` 0,0313; rok do roku 0,29% z przeglądu) | Udział komórek ≥ +3 dB na terenie niezabudowanym w 2025 (z lasem i wodą, nie sam otwarty teren, N42). | cytować (statystyka) | T18. |
| 17 310 ha ciemniej o ≥ 3 dB (z przeglądu) | Komórki ≤ −3 dB rok do roku w obszarze badań (32 305 komórek); 98,4% na otwartym terenie, czyli 13,4% otwartego terenu. Ciemnienie przeważa nad pojaśnieniem 24 do 1. | nie cytować jako rozbiórki (statystyka) | „Na polach to zwykle suchsza gleba albo inna uprawa niż rok temu”. Do pytań: mediana zmiany na otwartym terenie −1,14 dB, w lesie −0,20, w zabudowie −0,35 dB. |
| 4,46x „correlation” (README główne :88) | Stosunek częstości, nie korelacja. | nie cytować (dane) | T15. |

### Wilgotność i NISAR

| Liczba | Co dokładnie liczy | Werdykt | Brzmienie z zastrzeżeniem |
|---|---|---|---|
| 26% (`checks.wet.share_sig_study` 0,2598) | Udział komórek 120 m otwartego terenu (bez zabudowy, lasu i wody) z r Spearmana VV wobec GWETTOP > 0,388 na 26 przelotach. Jedna seria NASA POWER dla całego obszaru. | z zastrzeżeniem: najostrzejszy (fizyka, statystyka, dane); pipeline i przeliczenie: cytować | „26% komórek otwartego terenu przechodzi test (przypadkiem przeszłoby ok. 2,5%); wynik zależy od wielkości komórki (bloki 480 m: 38%); zabudowa reaguje prawie tak samo; to reakcja powierzchni na mokrą pogodę, nie przepuszczalność gruntu”. |
| r = 0,24 (`median_r_open`) | Mediana r na otwartym terenie. | cytować (statystyka) | „Typowe r 0,24 (26 przelotów); związek dla całego obszaru istotny (test permutacyjny p = 0,002)”. |
| r_crit = 0,388 | Dwustronny próg 5% dla 26 przelotów, stosowany tylko do dodatnich r. | z zastrzeżeniem: najostrzejszy (statystyka); przeliczenie: cytować | „Próg dwustronny p < 0,05, tylko dodatnie r (jednostronnie p < 0,025)”. To uwaga o precyzji: zdanie w aplikacji „tylko p < 0,05” jest prawdziwe (N43 odrzucone). |
| 59% (`open_share_of_study`) | Otwarty teren (bez zabudowy, lasu, wody) w obszarze badań. | cytować (statystyka) | „Otwarty teren to 59% obszaru”. |
| 27% wobec 26%, p = 0,086 (`checks.wet` flood/outside) | Jak 26%, w strefach podtopień PIG-PIB i poza nimi. | cytować (wszystkie) | T7, bez „przewagi pasma L”. Stosunek 1,04 (CI 0,89–1,21). |
| 37% (`nisar.checks.wetdry.share_study` 0,3742) | Udział komórek otwartego terenu, gdzie HH NISAR 24.08 minus HH 25.06 ≥ 2 dB. Z PNG 38,1%. | z zastrzeżeniem (wszystkie) | T1. Nigdy „nasiąkła”. |
| +1,39 dB (`median_db_open`) | Mediana tej różnicy na otwartym terenie. | z zastrzeżeniem (statystyka) | „Mediana zmiany HH 25.06 → 24.08 na otwartym terenie +1,4 dB (sezon i deszcz razem)”. |
| ok. 15% (para 12.08 → 24.08, z przeglądu) | Bloki 480 m otwartego terenu z HH ≥ +2 dB w parze po żniwach. | z zastrzeżeniem | Zależnie od maski bloków 13,5–17%; mediana +1,0 dB. Liczba z przeglądu, nie z `sar.json`. |
| 19% wobec 38%, stosunek 0,49 (`wetdry` flood/outside) | Jak 37%, w strefach podtopień i poza nimi. | z zastrzeżeniem: najostrzejszy (przeliczenie, statystyka); fizyka, dane: cytować | T9. Wynik odporny na zależność sąsiednich komórek (CI stosunku 0,43–0,60). |
| p = 1,0 (`wetdry.p`) | Test jednostronny „podtopienia > reszta” przy wyniku odwrotnym. Poprawny, ale nic nie mówi. | nie cytować (statystyka) | Podać stosunek 0,51 z CI 0,43–0,60. |
| 0,09 / 0,30 | Wilgotność objętościowa gleby 0–7 cm, m³/m³, średnia dobowa z ERA5 przez Open-Meteo (`progres/p1/skrypty/nisar_pogoda.py`). | nie cytować w obecnej formie: najostrzejszy (fizyka); pipeline, statystyka, dane: z zastrzeżeniem jako ERA5 | Jedyna dopuszczalna forma: „wilgotność gleby 0–7 cm wg ERA5 (Open-Meteo): 0,09 i 0,30 m³/m³”. Nigdy jako NASA POWER: GWETTOP w tych tygodniach to 0,31–0,43. |
| 23,5 mm w 3 dni | Suma dobowa opadu ERA5 z dni d, d−1 i d−2, razem z dniem przelotu. | z zastrzeżeniem (fizyka, pipeline, dane) | „23,5 mm deszczu w 3 dni (ERA5, Open-Meteo); wartości dobowe, mogą obejmować deszcz po przelocie o 05:39”. |

### Pasma i czujniki

| Liczba | Co dokładnie liczy | Werdykt | Brzmienie z zastrzeżeniem |
|---|---|---|---|
| 6,6 dB (HV pasma L) wobec 2,8 dB (VH pasma C); tabela median klas (`nisar.checks.bands`) | Mediany klas w każdym satelicie. Las: ponad 78% lasu w 2000; zabudowa: udział ≥ 14,9%. | z zastrzeżeniem: najostrzejszy (statystyka); fizyka, pipeline, przeliczenie: cytować | T26. |
| ok. 3 dB NISAR minus ALOS-2 (README:90) | Mediana różnicy na komórkach; potok jej nie liczy. | nie cytować: najostrzejszy (fizyka); pipeline, dane: z zastrzeżeniem; przeliczenie: cytować (mediana HH 3,00 dB) | T27: podawać zakres według pokrycia. Sama średnia nie jest błędna (N69 odrzucone). |
| Sanity: VV zabudowa −5,88 dB, reszta −9,24 dB, VH las −13,36 dB (`checks.sanity`) | Mediany Sentinel-1. „Reszta” to cały teren niezabudowany, z lasem i wodą (N42). | cytować (statystyka) | „Mediana VV Sentinel-1: zabudowa −5,9 dB, reszta −9,2 dB; las VH −13,4 dB”. |

### Ruch gruntu

| Liczba | Co dokładnie liczy | Werdykt | Brzmienie z zastrzeżeniem |
|---|---|---|---|
| 24% (`checks.egms.share_of_study`) | Komórki z wartością EGMS w obszarze badań (97 567). | z zastrzeżeniem: najostrzejszy (statystyka, z powodu dopisku „głównie zabudowa”); fizyka, pipeline, przeliczenie: cytować | „EGMS mierzy 24% obszaru: 95% zabudowy i 15% pozostałego terenu”. |
| „głównie zabudowa” | Nikt tego nie liczył. 46,8% komórek EGMS leży w zabudowie. | nie cytować (fizyka) | „głównie w zabudowie i wokół niej”. |
| 0 mm/rok (mediana), p5 = −1 | EGMS Ortho, ruch pionowy, 2016–2020, wartości w pełnych mm/rok; 70% komórek to dokładnie 0. | z zastrzeżeniem: najostrzejszy (fizyka, pipeline, statystyka); przeliczenie: cytować | „Typowy ruch w granicach ±1 mm/rok (pełne mm), 2016–2020”. |
| 147 komórek ≤ −5 mm/rok | Komórki 120 m (ok. 0,5 ha), 53 skupiska. | z zastrzeżeniem: najostrzejszy; przeliczenie: cytować | „147 komórek w ok. 50 miejscach osiada o 5 mm/rok lub szybciej (EGMS 2016–2020, Copernicus)”. |
| −18 mm/rok (minimum) | Najszybsze osiadanie w danych. | z zastrzeżeniem (fizyka, statystyka) | „Najszybciej −18 mm/rok w jednym miejscu na skraju danych”. Czy to 1 czy 2 komórki, nie sprawdzono (fizyka: 1, statystyka: 2). |

### Przeloty i siatka

| Liczba | Co dokładnie liczy | Werdykt | Brzmienie z zastrzeżeniem |
|---|---|---|---|
| 9 przelotów NISAR, 25.06–11.10.2026 | GCOV, orbita 158, provisional (CRID P05023). | z zastrzeżeniem: najostrzejszy (pipeline, statystyka, z powodu przerwy); fizyka, dane: cytować | „9 przelotów orbity 158, 25.06–11.10.2026, co 12 dni z jedną przerwą”. |
| co 12 dni | Powtarzalność jednej orbity; przerwy [12, 12, 24, 12, 12, 12, 12, 12] dni. | z zastrzeżeniem (wszystkie) | T32. |
| 38 przelotów NISAR (`land.json nisar_dates`) | Cztery orbity; cztery ostatnie daty to wersja validated. | z zastrzeżeniem (dane) | „38 przelotów NISAR na czterech orbitach VI–X 2026 (ostatnie cztery po wydaniu wersji validated 21.10)”. |
| 27 przelotów Sentinel-1, orbita 73 (`s1.dates`) | Przeloty 2026 z jednej orbity względnej. | cytować (fizyka, pipeline) | — |
| 120 m | Bok komórki w Web Mercator. | z zastrzeżeniem (fizyka) | „ok. 73 m w terenie”. |

## 4. Błędy w pipeline

Tabela obejmuje wszystkie potwierdzone uwagi, które wymagają zmiany w pliku: kod potoku, `sar.json`, teksty aplikacji, README i pitch. Duplikaty z różnych soczewek są w jednym wierszu; pierwszy numer to uwaga główna. Waga wiersza to najwyższa waga w grupie. Bezpieczne teksty są w rozdziale 2 (T1–T42).

### Blocker

| Id | Plik i linia | Problem | Skutek dla użytkownika | Poprawka |
|---|---|---|---|---|
| N44 (N1, N19, N34) | B:243-258; I:440-443 (fp/fe.lband), 329/374 (plain.waterSoaks), 411/427 (hov.soaks, hov.dries), 409/425 (lgPlain), 256-257 (lg.wetter/drier), 273/278 (f.lband); README:51; aboutSar I:230/240 | Para 25.06/24.08 dzieli dwa miesiące ze żniwami i uprawą; cały wzrost HH przypisany deszczowi; brak kontroli roślinności. Przy równej wilgotności (19.07 → 24.08) HH i tak rośnie o +1,0 dB; 25.06 → 5.09 (mniej wilgoci) daje to samo co 24.08. Na otwartym terenie 44% bloków z HH ≥ 2 dB ma też HV ≥ 2 dB. Dymek „po deszczu ziemia wysycha (żniwa)” przeczy sam sobie. | Użytkownik i jury czytają „ziemia nasiąkła na 37% pól”. Radarowiec to obali danymi z naszej listy przelotów. | Decyzja zespołu: (a) przebudować warstwę z pary 12.08 → 24.08 (ok. 15% ≥ 2 dB, mediana +1,0 dB), albo (b) zostawić parę i zmienić teksty (T1, T3). Pokazać zmianę HV obok HH. Opcjonalnie odjąć przesunięcie lasu lub zabudowy (+0,5 / +0,67 dB) przed progiem 2 dB (udział spada z 38% do 27–29%). Usunąć „nasiąka” także z lgPlain.nisarwet/wetter, lensTip.water i caseIntro. Lsub.nisarwet: "HH 24 Aug minus 25 Jun (after rain, and after harvest)". |
| N45 (N21, N33) | B:140-151 `compare()`; I:183/203 (f.radar), 445-447 (fp/fe.radar); README:61; `sar.json checks.wuia` | Test dwumianowy liczy 766 komórek jak niezależne. 12 trafień to 4 decyzje i 4 skupiska (6, 4, 1, 1 komórek). Lag-1 r = 0,80; Sentinel-1 czytany w 80 m na komórki 73 m, więc sąsiedzi dzielą piksele. Bootstrap blokowy: CI ok. 0,6–10; przerzedzenie: p = 0,17. | „p < 0,001” jest błędne jako wnioskowanie; krotność 4,5x nie jest pewna. | Zapisać w `sar.json` liczbę miejsc z trafieniem, test na poziomie decyzji albo bloków i CI z bootstrapu blokowego obok p dla komórek. Tekst T11. Nie publikować 7,6x (pozwolenia + zgłoszenia) jako nagłówka: ten wariant wybrano po zobaczeniu, że wszystkie trafienia to pozwolenia. |
| N32 (N46, N17, N47) | A:1071 (d ≤ −3 dB); I:112/119 (lg.darkerNow), 408-410/424-426 (lgPlain.darkerNow, hov.darker); aboutSar I:232/242; FS:100 docstring; B:65-66 komentarz | Ciemnienie ≥ 3 dB rok do roku: 17 310 ha, 98% na polach (13,4% otwartego terenu). Mediana na polach −1,14 dB, w lesie −0,20 dB (więc to nie kalibracja). Prawdopodobnie suchsza jesień 2026 (ERA5: 0,397 i 0,353 w dwóch jedynych datach z 2025, 28.10 i 9.11, wobec 0,17–0,27 w IX–X 2026) i zmiana upraw. Jesień 2026 to tylko S1C i S1D; platform z 2025 nie zapisano. | Legenda i dymek mówią „rozbiórka, wycinka, nowy asfalt” o tysiącach hektarów pól. About mówi, że „żniwa i orka się znoszą”. | Teksty T19, T20. W legendzie oddzielić pola od zabudowy albo nie podpisywać przyczyny na polach. Poprawić docstring FS:100 i komentarz B:65-66. |
| N58 | README główne :45, :88 (też :46, :47) | „Radar widzi fundamenty i mury”, „4.46x correlation”, „p = 0.000”. 4,46 to stosunek częstości dowolnego pojaśnienia ≥ 3 dB (B:137, B:151), nie ściany i nie korelacja. Test samych ścian: 3 trafienia, 1,63x, p = 0,28. | Jury czyta README główne jako pierwsze. | Tekst T15. W :46 usunąć 2,13x (rozdz. 3: nie cytować); jeśli zostaje, to tylko „2,13 razy częściej pojaśnia się w radarze”, nie „rozwija się szybciej”. W :47 „147 komórek (ok. 53 miejsca)”. |

### Major

| Id | Plik i linia | Problem | Skutek dla użytkownika | Poprawka |
|---|---|---|---|---|
| N22 (N40, N63) | README:45, :87-88; B:9 docstring | README opisuje „medianę ostatnich 6 przelotów minus pierwszych 6”. Kod (B:67-81) i `sar.json` liczą rok do roku: 12 przelotów IX–XI 2026 minus 12 IX–XI 2025. Metoda 6 na 6 to tylko zapas (B:83). | Recenzent przeczyta, że główna warstwa to sezon czerwiec → listopad, i odrzuci ją jako żniwa. | Wiersz README "Change in a year": 12 passes Sep–Nov 2026 vs 12 passes Sep–Nov 2025, median VV difference; double bounce = VV change minus VH change ≥ 1.5 dB. Poprawić docstring B:9 i Limits :87-88. |
| N2 (N20, N51, N59) | README:51, :95-101; B:242 komentarz; aboutSar I:230/240; `progres/p1/skrypty/nisar_pogoda.py`:24, 79-99 | 0,09/0,30 to ERA5 0–7 cm (m³/m³) z Open-Meteo, nazwane „soil wetness” jak GWETTOP (0–1) w wierszu wyżej. Open-Meteo/ERA5 brak w źródłach. Opad i wilgotność są dobowe, z dniem przelotu, a przelot jest o 03:39 UTC (05:39). | Czytelnik porówna z GWETTOP (0,31–0,43 w tych tygodniach) i uzna, że coś jest źle. | Tekst T2. Dodać do źródeł "Open-Meteo (ERA5, Copernicus C3S), CC BY 4.0". W skrypcie (decyzja zespołu) liczyć deszcz i wilgotność tylko do godziny przelotu albo pisać „wartości dobowe dla dnia przelotu”. Opcja z soczewki dane: sprawdzić dobór dat produktem NISAR SME2 z listy przelotów (pitch pisze, że SME2 nie jest w pełni skalibrowany). |
| N3 (N36, N48) | I:444-447 (fp/fe.radar), 314/359 (plain.buildYes), 410/426 (hov.walls), 449/453 (plain modelRadar), 181-183/201-203 (f.radar); A:1788 | Krotność 4,5x (dowolne pojaśnienie) stoi tuż za „nowe budynki na 358 ha”. Ślad ścian sam testu nie przechodzi (1,63x, p = 0,28). 135 z 285 płatów ścian to pojedyncze komórki 73 m. | Czytelnik bierze 4,5x za potwierdzenie budynków; dymek „tu nowe budynki” nad jedną komórką. | Tekst T13. W A:1788 pokazać obok wynik `wuia_walls`. Dymek: „Radar: sygnał jak od nowych ścian”. |
| N50 | `sar.json s1.up3db_ha`, `s1.walls_ha` (B:288-289); I f.radar, plain fe.radar | Sumy obejmują teren zabudowany w 2020: 32% komórek ścian i 21% pojaśnień. Tam wzrosty (0,58%) nie są częstsze niż spadki (0,89%). | „Nowe budynki na 358 ha” to górna granica. | Zapisać w `sar.json` osobno część na terenie wolnym w 2025 (ok. 228 ha ścian, 425 komórek; ok. 240 ha z terenem zabudowanym 2020–2025) i użyć jej w tekście. |
| N35 (N49) | B:153-167; I:213-217 (f.modelRadar), 452-455 (fe/fp.modelRadar); README:63 | Test nie sprawdza modelu. Ranking wg udziału zabudowy 2020 daje to samo (1,97–2,10x; ściany 4,0–4,2x) i pokrywa 93% komórek modelu. 90% top 5% leży ≤ 150 m od zabudowy; w tym pasie RR 1,15 (CI 0,88–1,51). Kandydatów wybiera prognozowana warstwa 2025, nie obserwacja. | „Model przewidział, radar widzi” myli; to wzrost na skraju osiedli. | Dodać do `sar.json` bazę naiwną i wynik w pasach odległości (np. Mantel-Haenszel: 1,23 i 1,34). Tekst T16. „Nie zabudowane w 2025” nazwać prognozą. |
| N4 | B:78-79, 86, 138; I:32/59, 29/56, 112/119, 152/165, 315/360 | Podwójne odbicie daje wzrost w VV/HH tylko przy ścianach mniej więcej równoległych do toru. Budynki obrócone o ponad ok. 20–30° oddają więcej w polaryzacji krzyżowej. Reguła VV−VH ≥ 1,5 dB odsyła je do „pola, roboty ziemne”. W tabeli aplikacji VH zabudowy (−12,31 dB) jest jaśniejsze niż VH lasu (−13,36 dB). | Część nowych budynków pokazana jako pola; tekst „VH = roślinność” przeczy własnej tabeli. | Tekst T22. W Ograniczeniach dopisać zależność od ustawienia ulic względem toru (zespół już to zapisał w `docs/pomysly-sar/02-budowa-obok.md`:28). |
| N6 (N53) | I:39/66 (radarHtml), 189/209 (f.wet) | Tekst obiecuje przewagę pasma L w strefach podtopień. Własny test NISAR pokazuje odwrotnie (stosunek 0,49). Żadne pasmo nie sięga wody gruntowej. | Jury widzi sprzeczność między dwoma zdaniami aplikacji. | Teksty T8, T10. Wyjaśnienie wyniku: T9. |
| N7 (N52, N71) | I:155/168 (chk.wetHigh); A:1705 (`s.wet > 0.3` → warn); I:39/66, 189/209, fe/fp.wet; aboutSar I:232/242; README:46; FS:36, 105-120; B:94-115 | Korelacja VV z jedną regionalną serią GWETTOP (MERRA-2, ok. 56 × 42 km) mówi, że radar widzi zmiany wilgotności powierzchni; nie mierzy wsiąkania. 26% to udział wykryć, zależny od wielkości komórki. Zabudowa reaguje prawie tak samo jak pola (33% wobec 38%), las nie (0,4%). | Ostrzeżenie „zapytaj o drenaż” zapala się w ok. 36–37% okien wokół otwartego terenu. | Poziom karty: info. Teksty T4, T6. W aboutSar dopisać: one NASA POWER (MERRA-2) grid value for the whole area, about 50 km across. |
| N8 (N27, N37, N54) | I:456/457 (fp/fe.ground), 190/210 i 191/211 (f.ground), 337/382 (plain.groundOk); FS:130-133 | EGMS mierzy 24% obszaru, 18% otwartego terenu, tylko 2016–2020, w pełnych mm/rok (70% to dokładnie 0). „Głównie zabudowa” nieprawdziwe (46,8%). 147 komórek to 53 skupiska. | „Prawie nigdzie nie osiada” bez informacji, że 3/4 obszaru nie ma pomiaru, a dane kończą się w 2020. | Teksty T30, T31. Zapytanie F32 zamiast S8 raczej nie pomoże, bo usługa PIG-PIB sama daje liczby całkowite. |
| N9 (N41, N57, N67, N39) | I:183, 203, 445, 447; aboutSar I:235/245; README:61; `sar.json checks.wuia.what` (B:150-151), `checks.model.what` (B:162-163) | „Pozwolenie” dla zbioru, w którym 125 z 461 to pozwolenia (WZ 160, zgłoszenia 138, lokalizacja 38). About mówi „decyzje i wnioski, VI–XI 2026”, a test bierze decyzje do 31.08. Tekst `what` nie mówi o regule środka komórki (224 z 461 decyzji bez komórki) i o wykluczeniu wszystkich 2420 spraw z tła; `model.what` nie mówi, że 2025 to prognoza. | Polska i angielska wersja twierdzą co innego; zły okres w About. | Tekst T12. About EN: "new-building decisions of the Poznań planning office dated June–August 2026"; PL: „decyzje o nowej budowie WUIA z czerwca–sierpnia 2026”. Rozszerzyć oba teksty `what`. |
| N60 | A:492, 708, 2052-2053; `web/i18n.js`:23, 30, 43, 91, 155, 203, 240, 291; FU:183-190 | Suwak GIBS bierze 38 dat bez filtra orbity i wersji. Otwiera się na 29.10 (orbita 80, zstępująca, validated), a liczby używają orbity 158 provisional. Podpis „kalibrowany SAR (sucho vs mokro)” nie opisuje mozaiki GIBS. Legenda „żółty/pomarańczowy: budynki” nie pasuje do palety GIBS. | Użytkownik bierze obraz GIBS za dane liczone. | Tekst T38. Otwierać na dacie orbity 158 provisional; przy dacie pokazać orbitę i kierunek; poprawić legendę wg palety GIBS. |
| N61 | `docs/pitch.md`:42, 54, 58, 122 | Pitch przypisuje NISAR wykrycie budowy. Sygnał budowy i oba testy to wyłącznie Sentinel-1 (B:65-81, 124-167). | Radarowiec wyłapie to na scenie. | Tekst T36. Nie zastępować go zdaniem „NISAR pokazuje, gdzie po deszczu nasiąka grunt” (zob. N44). |
| N62 | `web/i18n.js`:87-110 (EN), 199-222 (PL); A:2006 | Strona O projekcie zaczyna się listą źródeł z v1: NISAR jako „mozaiki GCOV z NASA GIBS”, Sentinel-1 „mediany letnie 2017, 2020, 2024”, podkład „Esri” (a domyślny to OpenFreeMap), „darmowy radar widzi 10–20 m”. Część radarowa poniżej mówi co innego. Kolejność nie jest „najpierw prosto”. | Strona O projekcie przeczy sama sobie. | Podpiąć nową stronę `web/about.html` (rozdział 8) albo przepisać aboutHtml: najpierw prosto, szczegóły niżej; podkład OpenFreeMap; NISAR GCOV czytany z HDF5. |
| N65 | README główne :5 | Główny link prowadzi do poznan-trend-detective.web.app. Weryfikator otworzył stronę: to v1 („Poznań Trend Detective”), bez słowa „SARnik”. | Juror nie zobaczy pikseli NISAR; cierpi ocena Relevance. | Wdrożyć `main` (v3) pod główny adres albo dać link v3 jako pierwszy w obu README i w formularzu zgłoszenia. |

### Minor

| Id | Plik i linia | Problem | Skutek dla użytkownika | Poprawka |
|---|---|---|---|---|
| N24 (N38) | B:205, 248 (`round` przy kodowaniu PNG) wobec B:137, 250, 288 (progi na float); A:1403-1418 | Progi liczone na wartościach przed zaokrągleniem; aplikacja liczy z PNG. Kod 166 obejmuje 2,980–3,059 dB i dekoduje się do 3,02. | Karty miejsc pokazują ok. 712 ha / 363 ha / 38,1% zamiast 693 / 358 / 37,4%. | Liczyć `sar.json` z wartości skwantowanych albo kodować `floor`, albo w aplikacji próg v ≥ 167. Najprościej pisać „ok. 700 ha” i „ok. 360 ha”. |
| N25 (N68) | B:231-235; FN:34-37 | 5.09 to dwie wersje przetworzenia tej samej akwizycji (`_J_001`, `_J_002`, ten sam czas). Są uśredniane, a komentarz nazywa je „frames”. | Pomijalny; 5.09 nie wchodzi w żaden test. | W `passes()` zostawić najwyższy licznik produktu; poprawić komentarz. |
| N31 | B:299-302 (`meta['decode']`) | Brak reguł dekodowania dla `nisar_hh_med`, `nisar_hv_med`, `nisar_wetdry`, `nisar_series`, `alos_*`; aplikacja ma je wpisane na stałe (A:329-333). | Część liczb bez opisanej metody. | Dodać: `nisar_*_med` i `alos_*`: v/6 − 30 dB; `nisar_wetdry`: v/12,75 − 10 dB; `nisar_series`: jak `sar_series`, HH z lewej, HV z prawej. |
| N42 | B:197 (`vv_med_open_db`), B:189 (`season_change_open_up3db_share`) | Pierwszy klucz liczy cały teren niezabudowany (z lasem i wodą): −9,24 dB wobec −10,0 na samym otwartym. Drugi liczy kandydatów (niezabudowane w 2025), nie otwarty teren. | Nie ma ich w interfejsie; mylą przy cytowaniu. | Zmienić nazwy na `vv_med_notbuilt_db` i `season_change_cand_up3db_share` albo użyć maski open_land. |
| N55 | B:146 (`round(p, 4)`) | p zapisane jako 0.0; przecieka do README głównego jako „p = 0.000”. | Wygląda jak błąd. | Zapisywać p w notacji naukowej albo jako „p < 1e-4”. Dla wetdry podać stosunek z CI. |
| N10 (N23, N70) | FS:43-50 (`warp_ovr(level=2)`, docstring „coarser grid”); README:44, 55, 84; I:43/70; aboutSar I:231/241 | Sentinel-1 czytany z podglądu 80 m, nie 10 m. Komórka ma 73 m w terenie, więc jest drobniejsza niż piksel wejściowy. Sposobu budowy podglądu potok nie sprawdza. | Opis rozdzielczości nie zgadza się z danymi. | Tekst T34; poprawić docstring FS:45. |
| N29 | FU:104-125 (FU:108-109); A:314, 316, 1127, 1709, 1767 | Warstwy `s1_2017/2020/2024` filtrują tylko kierunek orbity, bez orbity względnej, i biorą pierwsze 14 elementów STAC. W 2017 latał też S1B, w 2024 nie. | Zmiany dB 2017 → 2024 w dymku i karcie mogą wynikać z geometrii i dat, nie z gruntu. | Filtrować `sat:relative_orbit` i daty albo podpisać warstwę „tylko obraz” i nie liczyć z niej dB w kartach i dymkach. |
| N11 (N26, N56, N66) | I:34/61, 441/443; README:9; FS:34 | „Co 12 dni” to jedna orbita; jest przerwa 24 dni (brak 31.07). „Każdy przelot” to 9 z 38 dat NISAR. | Nieprecyzyjne. | Teksty T32, T33. |
| N12 (N28) | README:90 | Przesunięcie NISAR − ALOS-2 zależy od pokrycia: las +1,3–1,7, zabudowa +2,3–2,7, pola +3,8–6,5 dB. | Przy osobnym rozciągnięciu barw pola w NISAR wyglądają względnie jaśniej. | Tekst T27. |
| N13 | I:193/213 (f.lband, wariant ALOS) | „Pola świecą w HH”, a pola są najciemniejszą klasą w HH. Tekst pokazuje się tylko bez danych NISAR, więc dziś jest nieaktywny. | Dziś żaden. | Tekst T25; niski priorytet. |
| N14 | I:40/67, 99/107 (Lsub.sarwater); README:34; B:29, 64 | Próg VV < −17 dB łapie spokojną otwartą wodę, nie każde zalanie. | Nieprecyzyjne. | Tekst T24; Lsub.sarwater: „spokojna otwarta woda” / "calm open water". |
| N15 | I:25/52 | „Jasność zależy od dwóch rzeczy” pomija geometrię patrzenia. | Nieprecyzyjne. | Tekst T23. |
| N16 | I:43/70; README:85 | Powodem jest jasność (GCOV) zamiast fazy, nie „lata interferometrii”; GUNW orbity 158 są na liście przelotów. | Niepełne. | Tekst T28. |
| N18 | I:45/72; I:333/378 (plain.waterSrcHollow) | Copernicus DEM to model powierzchni (DSM), nie terenu; „zagłębienie” może być polaną. | Nieprecyzyjne. | Tekst T29. |
| N5 | README:36; I:34/61; `docs/pitch.md` sekcja 8 | „Pasmo C zatrzymuje się na koronach” przeczy własnemu wynikowi wilgotności w paśmie C. | Nieprecyzyjne (dla lasu prawie prawdziwe). | Tekst T21. |
| N64 | README:57-64 | Sekcja Checks pomija jedyny test NISAR (wynik przeciw hipotezie) i nie podaje wyników żadnego testu. | Wygląda na wybiórcze raportowanie. | Tekst T39 z liczbami. |
| N72 (N73) | A:435, 468-473, 492; `web/i18n.js` aboutHtml; README:95-101 | Brak dokładnych tekstów oznaczeń i cytowań. | Ryzyko licencyjne. | Rozdział 6. |
| N74 | README główne :34, 37, 47, 71, 72, 85-87, 89 | Kilka nieścisłości (MODIS, POWER, DEM, 50 lat Landsat, 147 stref, korony, zagłębienia z NISAR). | Nieprecyzyjne. | Teksty T17, T31, T40. |
| N75 | I:440/442 | „Nowy satelita NASA” dla misji NASA-ISRO. | Nieprecyzyjne. | Tekst T37. |

### Status punktu 9 z `docs/poprawa_mapy.md`

Wg soczewki pipeline. Poza punktem (d) i pierwszym zdaniem (c) drugi recenzent tego osobno nie sprawdzał.
- (a) Radar uśredniany w mocy liniowej: zrobione (FS:44-50, 83-87; FN:86-87; FS:149, 165; B:222, 268-269, 277, 286).
- (b) Kategorie przez najczęstszą wartość: nie zrobione. Jedyna warstwa kategorii (rok utraty lasu Hansen) jest redukowana maksimum (FU:82) i służy tylko do koloru (model_urban.py:126). Hektary liczą się z ułamków rocznych (fetch_forest.py), co jest lepsze niż wartość najczęstsza.
- (c) Brak danych oddzielony od zera: zrobione w build_sar. Wyjątek wg soczewki (niesprawdzony przez drugiego recenzenta): warstwy `s1_YYYY` z model_urban zamieniają NaN na −30 dB, a potem na 0, a decode w `land.json` tego nie mówi.
- (d) Tylko provisional, orbita 158, bez duplikatów: filtr zrobiony; duplikat 5.09 uśredniany (N25).

## 5. Dane NASA a dane partnerów

| Wynik w aplikacji | Dane pod spodem | Czyje dane |
|---|---|---|
| Odkrycie 1 „Nowy satelita NASA widzi, gdzie ziemia nasiąka”; widok Woda; wiersz karty „NISAR mokro minus sucho”; prosta linia wody „nasiąka” | NISAR GCOV HH, 25.06 i 24.08; maska otwartego terenu z GHSL, GFC i Sentinel-1; daty wybrane wg Open-Meteo ERA5 | NASA-ISRO; Copernicus C3S (wybór dat) |
| Widok Radar, kadr 2026; tabela pasmo L wobec C | Mediany NISAR HH/HV obok Sentinel-1 | NASA-ISRO i Copernicus |
| Widok Radar, lata 2015–2021 | Mozaiki ALOS-2 PALSAR-2 | JAXA |
| Odkrycie „nowe budowy” (693 ha, 358 ha, 4,46x); widok Budowa; prosty wiersz „Nowa budowa obok” | Sentinel-1 RTC, jesień 2025 i jesień 2026; decyzje GEOPOZ WUIA | Copernicus (przetwarzanie Catalyst); dane krajowe |
| Odkrycie „prognoza spotyka radar” (2,13x, 4,3x) | Sentinel-1 i model na GHSL, Hansen GFC, Copernicus DEM, OSM | Copernicus; NASA/USGS tylko pośrednio (Landsat) |
| Odkrycie „grunt stabilny” (147 komórek, −18 mm/rok); widok Grunt; prosty wiersz „Czy grunt się rusza” | EGMS (InSAR Sentinel-1) przez PIG-PIB | Copernicus |
| Odkrycie eksperckie „grunt oddycha z pogodą” (26%); warstwy „Grunt nasiąka” i „Woda widziana przez radar” | Sentinel-1; NASA POWER GWETTOP jako czynnik | Copernicus, NASA |
| Warstwa ekspercka „Przeloty NISAR” | Dzienne mozaiki NASA GIBS | NASA |
| Drzewa, Historia, prognoza | Hansen GFC (Landsat); JRC GHSL (Landsat i Sentinel-2) | wkład NASA/USGS przez UMD i JRC |
| Letni upał | MODIS (Terra) | NASA |
| Cena | GUS | dane krajowe |

Wprost:
- Każda liczba radarowa, która przeszła test, stoi na Sentinel-1: sygnał budowy i oba jego testy, test wilgotności w paśmie C i ruch gruntu.
- NISAR daje trzy rzeczy: warstwę mokro minus sucho, kadr 2026 na osi czasu radaru i tabelę pasmo L wobec C.
- Jedyny test NISAR (więcej zmian w strefach podtopień?) nie potwierdził hipotezy: 18,5% wobec 37,7%, stosunek 0,49.
- Na prostej karcie NISAR zasila jeden z trzech wierszy SAR, i to tylko w jego trzeciej gałęzi. Wg soczewki dane (`provenance_nisar.py`) może się pokazać w ok. 20% okien 1 km. Tej liczby nie ma na liście potwierdzonych uwag.
- Dobrze zrobione: liczby NISAR używają dokładnie 9 przelotów GCOV orbity 158, wszystkie z kolekcji NISAR_L2_GCOV_PROVISIONAL_V1, CRID P05023. Przelot validated z 23.10 (P05036) i przeloty beta są odfiltrowane (FN:36).

Uczciwe zdanie o roli NISAR. To wersja soczewki dane, z jedną zmianą: „how the ground responds to rain” zamieniono na „how the land changes after rain and harvest”, zgodnie z N44 i N61.

> EN: NISAR (NASA-ISRO, L-band) shows how the land changes after rain and harvest, and how L-band sees forest and soil differently from C-band, from 9 provisional passes of track 158 (Jun–Oct 2026). Building detection and ground motion use Copernicus Sentinel-1 and EGMS for now, because five months of NISAR cannot yet give a year-on-year comparison; NISAR takes over as its archive grows.

> PL: NISAR (NASA-ISRO, pasmo L) pokazuje, jak teren zmienia się po deszczu i żniwach i jak pasmo L widzi las i glebę inaczej niż pasmo C (9 przelotów provisional, orbita 158, VI–X 2026). Nowe budowy i ruch gruntu liczymy na razie z Sentinel-1 i EGMS (Copernicus), bo pięć miesięcy NISAR nie daje jeszcze porównania rok do roku.

## 6. Podpisy i licencje

Czego brakuje:
1. **Open-Meteo / ERA5** nie ma w README:95-101 ani w About aplikacji (`i18n.js`), choć daje 0,09/0,30 i 23,5 mm (N2, N59, N73). Licencja CC BY 4.0 wymaga podpisu "Weather data by Open-Meteo.com"; dane reanalizy pochodzą z Copernicus C3S. Nowa `about.html` już to ma.
2. **NASA POWER**: brak tekstu „POWER Reference” i odnośnika do danych z wersją i datą dostępu (N73). Podziękowanie w `about.html` napisano z pamięci; trzeba je porównać ze stroną NASA POWER.
3. **Cytowania i DOI**: brak dla Hansen GFC, JRC GHSL i zbioru NISAR GCOV (N73).
4. **IMGW-PIB**: trzeba podać źródło i to, że dane przetworzono (N73).
5. **Oznaczenia na mapie** (A:435, 468-473, 492 podpisują tylko podkłady, ortofotomapy i GIBS). W `web/` nie ma „©JAXA” przy obrazach ALOS-2, „Catalyst” i CC BY 4.0 dla Sentinel-1 RTC ani „Contains modified Copernicus Sentinel data” (N72). Usługa PIG-PIB ma puste `copyrightText`, więc podpis EGMS zespół musi napisać sam. Uczciwie: aboutSar i About w `i18n.js` już wymieniają te źródła; brakuje dokładnych tekstów oznaczeń.
6. **About w aplikacji** (`i18n.js`:100) pisze „Base map: Esri”, a domyślny podkład to OpenFreeMap (N62).
7. **NASA-ISRO**: „Nowy satelita NASA” → „Nowy radar NASA i ISRO”; w treści „NASA i ISRO (Indie)” (N75).
8. **README główne**: „NASA Earthdata: … NASA POWER” (POWER to usługa NASA LaRC), „Copernicus Land: DEM GLO-30” (to produkt Copernicus/ESA, nie CLMS), „MODIS (Terra/Aqua)” (potok bierze tylko Terra) (N74).
9. **Nowa `about.html`**: poprawione po przeglądzie strony. Jest „Zawiera zmodyfikowane dane Copernicus Sentinel (2017–2026)” (letnie warstwy 2017/2020/2024 i jesienie 2025–2026; EGMS ma własną linię) oraz nowe linie: „EGMS: © Unia Europejska, Copernicus Land Monitoring Service, EEA” i „Copernicus DEM GLO-30: © DLR e.V. 2010–2014 i © Airbus Defence and Space GmbH 2014–2018, udostępnione w ramach programu COPERNICUS przez Unię Europejską i ESA”. C3S/ERA5 jest w linii Open-Meteo. Tekstów nie porównano jeszcze ze stronami dostawców.

Co soczewka dane sprawdziła w sieci: wpis STAC sentinel-1-rtc w Planetary Computer (licencja CC-BY-4.0, „The RTC processing is performed by Catalyst”), stronę licencji Open-Meteo (CC BY 4.0), stronę mozaik JAXA („©JAXA” na obrazach), stronę cytowania NASA POWER, stronę ASF o NISAR w Worldview (mozaiki z VALIDATED GCOV od 21.10.2026, wcześniej PROVISIONAL; wszystkie tryby razem; tylko wizualizacja) i metadane ImageServer PIG-PIB.

## 7. Przeliczenie liczb

**Co przeliczono.** Soczewka przeliczenie odtworzyła każdą liczbę z `sar.json` (`checks`, `nisar.checks` i hektary `s1`) z opublikowanych warstw PNG, `land.json`, `areas.geojson`, `wuia_decyzje.geojson` i `podtopienia.geojson`. Skrypt nie czyta `build_sar.py`; kod potoku obejrzano dopiero po policzeniu własnych liczb.

**Co się zgadza** (opublikowane / przeliczone):

| Test | Wynik | Zgodność |
|---|---|---|
| `wuia` | 766/766 komórek, 12/12 trafień, 1,57%/1,57%, 0,35%/0,35%, krotność 4,46/4,43 | zgodne |
| `wuia_walls` | 766/766, 3/3, 1,63/1,63, p 0,2811/0,2811 | zgodne |
| `model` | 17 557/17 566 komórek, 99/101 trafień, krotność 2,13/2,09 | w granicach 1–2% |
| `model_walls` | 77/78, krotność 4,3/4,21 | w granicach 2% |
| `wet` | udział otwartego 0,59/0,59; mediana r 0,24/0,24; istotne 0,2598/0,257; podtopienia 0,271/0,268; poza 0,2596/0,2568; p 0,0859/0,0911 | zgodne, p nieco inne |
| `r_crit` | 0,388/0,388 | zgodne |
| `nisar wetdry` | 0,3742/0,3813; podtopienia 0,1852/0,1959; poza 0,3765/0,3836; mediana 1,39/1,37; stosunek 0,49/0,51 | bliskie |
| `bands` (12 median) | wszystkie w granicach 0,07 dB | zgodne |
| `sanity` | zabudowa −5,88/−5,83; las VH −13,36/−13,33; „open” VV −9,24/−10,00 | ostatnia różna (inna maska, N42) |
| `egms` | 97 567; 0,242; 0; −1; −18; 147 | identyczne |
| hektary | 693/713 ha; ściany 358/364 ha | różnica z kwantyzacji (N24) |
| `season_change_open_up3db_share` | 0,0313/ok. 0,027 | tylko przybliżenie z arkusza 480 m |

**Dlaczego niektóre liczby się różnią** (wszystkie powody są niewinne):
1. Warstwy PNG są skwantowane, a potok stosuje progi na wartościach float. Kod 166 w `sar_change` obejmuje 2,98–3,06 dB (98 komórek w obszarze), więc opublikowane 1293 komórki leżą między 1231 (v ≥ 167) a 1329 (v ≥ 166). Podobnie `nisar_wetdry` (kod 153 przy progu 2 dB) i `sar_wet` (przy r = 0,388).
2. Próg zabudowy w potoku to surowa wartość < round(0,15·255) = 38, czyli udział < 14,9% (B:156-158, B:172). Przegląd użył < 0,15. Stąd 17 566 wobec 17 557.
3. `sanity.vv_med_open` liczy `~built & study` (B:197), więc z lasem i wodą.
4. `season_change_open_up3db_share` jest liczony na kandydatach modelu (B:189), nie na otwartym terenie.

**Co jeszcze skrypt liczy** (warianty i bazy, wyniki w pliku wyjściowym): reguła „wszystkie dotknięte komórki” (krotność 3,13), same pozwolenia i zgłoszenia (7,6x, wybrane po fakcie), decyzje VI–XI, tło z innymi sprawami (3,71), bazy naiwne dla testu modelu, położenie komórek ścian, kwantyzację przy progach, HH NISAR na blokach otwartego terenu przelot po przelocie, zmianę rok do roku na polach daleko od zabudowy.

**Ponowne uruchomienie dziś.** Uruchomiłem skrypt jeszcze raz przy pisaniu tego pliku: trwał ok. 5 s, a wynik był identyczny z `tests/nauka/recompute_checks_output.txt`.

**Jak uruchomić.** Potrzebne: numpy, scipy, pillow, matplotlib, shapely. Uwaga: `pipeline/requirements.txt` nie ma matplotlib ani shapely. Surowe dane (`data/raw`) nie są potrzebne. Środowisko zrób poza repozytorium:

```sh
python3 -m venv ~/venv-nauka
~/venv-nauka/bin/pip install numpy scipy pillow matplotlib shapely
cd poznan-trend-detective
~/venv-nauka/bin/python tests/nauka/recompute_checks.py > /tmp/recompute.txt
diff /tmp/recompute.txt tests/nauka/recompute_checks_output.txt   # pusty diff = te same liczby
```

Wynik: przy każdym teście linie `published= … ours= … AGREE/DIFFER`, a na końcu tabela zbiorcza. Środowisko użyte w przeglądzie: Python z numpy 2.0.2, scipy 1.13.1, pillow 11.3.0, matplotlib 3.9.4, shapely 2.0.7.

Pozostałe skrypty w `tests/nauka/` (wszystkie tylko czytają):
- `stat_building.py`, `stat_change_extra.py`, `stat_wet.py`, `stat_nisar.py`, `stat_egms.py`, `stat_cards.py`: statystyka. Importują `common_layers.py` z tego samego folderu, więc uruchamiaj bez `-I`, np. `python tests/nauka/stat_building.py` z `poznan-trend-detective/`.
- `physics_class_medians.py`, `physics_moisture_confound.py`: fizyka; `python -I tests/nauka/physics_moisture_confound.py .` (argument to ścieżka do `poznan-trend-detective`).
- `check_pipeline_layers.py`, `check_alignment.py`, `check_permit_clusters.py`: pipeline. `check_permit_clusters.py` używa przybliżonego rasteryzatora PIL (976 komórek i 16 trafień zamiast 766 i 12), więc jego liczby są tylko orientacyjne.
- `provenance_nisar.py`: dane; uruchamiaj z `poznan-trend-detective/`.

## 8. Strona O projekcie

**Co to jest.** Nowa, osobna strona: `poznan-trend-detective/web/about.html` z `about.js` i `about.css`. Żaden istniejący plik nie został zmieniony. Aplikacja jeszcze do niej nie linkuje.

**Co zawiera.** Dziesięć sekcji, każda zaczyna się prostym tekstem, a metoda i zastrzeżenia są niżej, pod rozwijanym „Szczegóły / Details”:
1. Czym jest SARnik.
2. Dlaczego radar, a nie zdjęcie.
3. Która polaryzacja co pokazuje: trzy rysunki SVG (odbicie od powierzchni, podwójne odbicie, rozpraszanie objętościowe) i tabela.
4. Pasmo L obok pasma C: tabela median klas z `sar.json`.
5. Co liczy aplikacja: każdy produkt z metodą, w tym stare letnie warstwy Sentinel-1 2017/2020/2024.
6. Dowody: każdy test z wynikiem i zastrzeżeniem.
7. Czego nie obiecujemy.
8. Odpowiedzi na pytania wyzwania.
9. Źródła danych, licencje i uznanie autorstwa: każde źródło oznaczone jako dane NASA albo partnera, z Open-Meteo/ERA5 i wymaganymi oznaczeniami.
10. Użycie narzędzi SI.

**Jak działa.**
- Liczby pogrubione są czytane na żywo z `data/land/sar.json` i `land.json`. Gdy plik się nie wczyta, w miejscu liczby jest „—”, a linia stanu mówi, którego pliku brakuje.
- Liczby z przeglądu, których nie ma w plikach danych (4 budowy, CI ok. 0,6–10, ok. 15% dla 12–24.08, ok. 1/3 na terenie zabudowanym, 95% zabudowy, ok. 50 miejsc, ok. 0,3%), pokazują się tylko wtedy, gdy dane wciąż zgadzają się z wersją sprawdzoną w przeglądzie (np. 12 z 766, 693/358 ha). Po zmianie danych strona pokazuje zdanie neutralne.
- Słowa typu „częściej”, „o połowę rzadziej”, „nieistotne” są dobierane z liczb.
- Teksty stosują poprawki z tego przeglądu: brak „nasiąkania” (N44), ERA5 zamiast NASA POWER (N2), „ślad nowych ścian” jako górna granica (N3, N50), ukośne budynki (N4), pasmo C dociera do gleby (N5, N6), „decyzje o nowej budowie, VI–VIII” (N9), 73 m i 80 m (N10), jedna orbita i przerwa (N11), spokojna woda (N14), faza zamiast GCOV (N16), DSM (N18), ciemniejsze pola to nie rozbiórki (N32), GIBS nie w liczbach (N60), budowy z Sentinel-1 (N61), EGMS bez „głównie zabudowy” (N8). Bez p dla decyzji i modelu i bez krotności modelu.
- Język: klucz `ptd-lang` aplikacji, a bez niego język przeglądarki. Motyw: klucz `ptd-theme` i przycisk. Kolory z `styles.css`, czcionka Archivo z zapasową systemową, bez zewnętrznych zapytań.

**Co sprawdzono.**
- Budujący: składnia `about.js` (JavaScriptCore `checkSyntax`); uruchomienie na sztucznym dokumencie w 4 przypadkach (PL i EN z danymi, EN bez obu plików: 108 „—”, PL bez `land.json`: 12 „—”), bez „undefined”, „NaN” i „null”; `python3 -m http.server`: wszystkie pliki 200; panel przeglądarki Claude przy 390 px: brak przewijania w poziomie, tabele się mieszczą, brak błędów w konsoli.
- Recenzent strony: każda pogrubiona liczba porównana ręcznie z `sar.json` i `land.json`, wszystkie zgodne. Panel przeglądarki Claude przy 1440×900 i 390×844, PL i EN, motyw jasny, ciemny i systemowy ciemny: brak komunikatów w konsoli, `scrollWidth` = `clientWidth`. Brak plików zasymulowany przez 404: `sar.json` 97 „—”, `land.json` 12, oba 108, z poprawną linią stanu. Zrzuty recenzenta (z panelu, wersja sprzed poprawek) zastąpiono zrzutami wersji końcowej ze zwykłego Chrome: `docs/przeglad-v2/zrzuty/about-pl-ciemny-*.jpg`.
- Wprost: stronę otwarto w przeglądarce, ale tylko w panelu przeglądarki Claude, nie w zwykłej przeglądarce w pełnym rozmiarze. Zrzuty są pomniejszone do rozmiaru panelu (698×436 dla układu 1440, 202×436 dla 390).

**Uwagi recenzenta strony i co z nimi zrobiono.** Recenzent nie znalazł blockerów; zgłosił 4 major i 5 minor. Krok poprawek w skrypcie przerwał się po utracie połączenia z serwerem API („Can't reach the API server”), gdy część zmian była już w pliku. Resztę wprowadzono ręcznie po zakończeniu skryptu:

| Uwaga recenzenta | Waga | Stan |
|---|---|---|
| Linia stanu i sekcja SI twierdzą, że każda liczba jest czytana na żywo i liczona przez potok | major | poprawione: „Liczby pogrubione są czytane na żywo… Kilka liczb z przeglądu zespołu i z listy przelotów NISAR (ERA5) jest wpisanych na stałe”; w sekcji SI „liczą skrypty zespołu”. Sprawdzone w kodzie: każda pogrubiona liczba idzie przez `B()` ze zmiennej czytanej z `sar.json` albo `land.json`. |
| Brak `sar.json` zamienia wynik testu decyzji w wynik negatywny | major | poprawione: trzy gałęzie dla `wuMore`, `wwSig` i `half`; bez liczby jest zdanie neutralne („Wynik podajemy obok, gdy dane się wczytają”) |
| Strona pomija stare warstwy 2017–2024 z mieszanymi orbitami i twierdzi, że porównuje tylko jedną orbitę | major | poprawione: produkt „Letnie obrazy Sentinel-1 2017, 2020, 2024 i aktywność terenu 2017→2024”; „w produktach z 2026 roku porównujemy tylko przeloty z tej samej orbity” |
| Kolumna „Najjaśniej w” podaje las jako VH/HV | major | poprawione: „Najbardziej wyróżnia się w” / "Stands out most in", w podpisie: polaryzacje krzyżowe są wszędzie słabsze, ale roślinność podnosi je najbardziej |
| Kilka wniosków z przeglądu bez bramki REV; wyjaśnienie wyniku w strefach podtopień | minor | poprawione: wnioski z przeglądu mają bramki `R.*` / `D.REV.*` (zdanie o ok. 3% po angielsku dopisano ręcznie, jak po polsku); nowe zdanie o łąkach |
| Dolna granica przesunięcia nad lasem | minor | poprawione: „1,3–2,5 dB” |
| „12 deszczowych dni” | minor | poprawione: „W samym okresie 12–24 sierpnia (23,5 mm deszczu w ostatnich 3 dniach)” / "Between 12 and 24 August alone (23.5 mm of rain in the last 3 days)" |
| Lista oznaczeń niepełna, „(2025–2026)” | minor | poprawione: „(2017–2026)” oraz linie EGMS i Copernicus DEM (rozdział 6, punkt 9) |
| Trzy polskie zwroty | minor | poprawione: „z jedną 24-dniową przerwą” (liczba z danych), „spośród ok. 200 działek z decyzją”, „który grunt jest już nasiąknięty przed ulewą” |

Poza uwagami recenzenta zmieniono wygląd według zasad zespołu: numery sekcji i linki w kolorze tekstu zamiast fioletu, nagłówek „Spis treści” bez wersalików, link „Otwórz aplikację” bez strzałki.

**Sprawdzenie wersji końcowej:**
- `node --check web/about.js`: bez błędów.
- Panel przeglądarki Claude, 1440×900 i 375×812, PL i EN: wszystkie 10 sekcji, brak komunikatów w konsoli, brak „undefined”, „NaN” i „null”, brak przewijania w poziomie (tabele 311 z 311 px przy 375 px).
- Zwykły Chrome w pełnym rozmiarze, motyw ciemny: nagłówek, spis treści, rysunki, tabela polaryzacji i rozdział Dowody wyglądają poprawnie.
- Brak plików danych (zapytania zamienione na 404): bez `sar.json` 83 „—”, bez `land.json` 11, bez obu 93; zawsze właściwa linia stanu i zdanie neutralne w teście decyzji; brak „undefined” i „NaN”.
- Język zapisuje się pod kluczem `ptd-lang`, motyw pod `ptd-theme`, jak w aplikacji.

**Opis pull requesta** (tylko nowe pliki strony; link z aplikacji osobno, później):

````markdown
# Strona „O projekcie” SARnik: nauka, dowody i granice

## Co
Nowa, osobna strona `web/about.html` z `web/about.js` i `web/about.css`.
Ten PR dodaje tylko te trzy pliki. Żaden istniejący plik nie jest zmieniony.
Aplikacja jeszcze do tej strony nie linkuje.

## Dlaczego
Obecny arkusz „O projekcie” zaczyna się listą źródeł z v1 i przeczy części radarowej
(N62 w `docs/przeglad-v2/NAUKA.md`). Nowa strona idzie w kolejności „najpierw prosto,
szczegóły niżej” i stosuje poprawki z przeglądu naukowego.

## Co jest na stronie
Dziesięć sekcji: czym jest SARnik; dlaczego radar; która polaryzacja co pokazuje
(trzy rysunki i tabela); pasmo L obok pasma C; co liczy aplikacja; dowody; czego
nie obiecujemy; odpowiedzi na pytania wyzwania; źródła, licencje i oznaczenia
(dane NASA i partnerów osobno, z Open-Meteo/ERA5); użycie narzędzi SI.
Każda sekcja ma prosty tekst, a metodę i zastrzeżenia pod „Szczegóły”.

## Jak działa
- Liczby pogrubione są czytane na żywo z `data/land/sar.json` i `land.json`.
  Gdy plik się nie wczyta, w miejscu liczby jest „—” i linia stanu.
- Liczby z przeglądu pokazują się tylko, gdy dane zgadzają się z wersją sprawdzoną
  w przeglądzie; inaczej strona pokazuje zdanie neutralne.
- Polski i angielski; język z klucza `ptd-lang`, motyw z `ptd-theme`, jak w aplikacji.
- Bez zewnętrznych bibliotek i czcionek.

## Jak sprawdzono
- Składnia `about.js`: `node --check`, bez błędów.
- Panel przeglądarki Claude: 1440×900 i 375×812, PL i EN, jasny i ciemny motyw;
  brak przewijania w poziomie, brak błędów w konsoli.
- Zwykły Chrome w pełnym rozmiarze: wygląd strony, rysunki i tabele.
- Brak plików danych (404): w miejscu liczb „—”, właściwa linia stanu,
  bez „undefined”, „NaN” i „null”.
- Każda pogrubiona liczba porównana z `sar.json` i `land.json` i czytana w kodzie ze zmiennej.

## Czego nie sprawdzono
- Tekstów licencji i oznaczeń na stronach dostawców (podziękowanie NASA POWER pisane z pamięci).
- Czcionki Archivo na komputerach jury (bez niej jest czcionka systemowa).

## Uwagi z przeglądu strony
Wszystkie 9 (4 major, 5 minor) są poprawione; lista w `docs/przeglad-v2/NAUKA.md`, rozdział 8.

## Co dalej (osobny PR)
Dodać link do `about.html` z arkusza „O projekcie” w aplikacji (dziś `app.js:2006`
składa `aboutHtml` i `aboutSar`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
````

## 9. Czego nie sprawdzono

- **Surowe dane.** `data/raw` (pliki npz) nie jest w repozytorium. Wszystkie przeliczenia idą z opublikowanych warstw PNG, więc mają błąd kwantyzacji (ok. 0,08 dB; ok. 3% w hektarach).
- **Resampling ALOS-2.** Nie wiadomo, czy przy budowie `alos.npz` zadziałało `rms`, czy zapasowe `average` (dlatego N30 odrzucono).
- **Podgląd 80 m Sentinel-1.** Nie wiadomo, czy podgląd COG zbudowano uśrednianiem, czy decymacją.
- **GWETTOP w dni przelotów NISAR.** Brak `data/raw/power_rain_2026.json`; porównanie idzie przez najbliższe dni Sentinel-1.
- **Deszcz po przelocie 24.08.** Danych godzinowych nie ma w repozytorium, więc nie wiadomo, ile z 23,5 mm spadło po 05:39.
- **Platformy Sentinel-1 jesienią 2025.** `sar.json` ich nie zapisuje.
- **Zmiany pozwoleń 1130/2022 i 555/2025.** Że budowa trwała już przed 2026, to wniosek, nie sprawdzony.
- **Test przesunięć przestrzennych** (p = 0,012 dla testu decyzji): nie powtórzony przez weryfikatora.
- **Minimum −18 mm/rok.** Położenia i liczby komórek nikt nie potwierdził.
- **Mediany warstw 2017/2020/2024** (N29): weryfikator ich nie przeliczył.
- **Dokumentacja ASF o mozaikach NISAR w Worldview** (N60): weryfikator nie przeczytał jej ponownie.
- **Teksty licencji w `about.html`**: nikt nie porównał ich ze stronami dostawców.
- **Wdrożone aplikacje.** Soczewka dane ich nie otwierała. Weryfikator N65 otworzył tylko główny adres (v1). Linków podglądu v2/v3 nikt nie sprawdził.
- **Kod aplikacji i zachowanie w przeglądarce.** To osobny przegląd (`docs/przeglad-v2/APLIKACJA.md`); w chwili pisania tego pliku nie było go jeszcze w folderze.
- **Strona `about.html`**: czcionka Archivo u jurorów i teksty oznaczeń na stronach dostawców nie są sprawdzone.
- **Dane satelitarne.** Niczego nie pobierano; pliki NISAR HDF5 nie były czytane ponownie.
- **Status punktu 9 (c)**: wyjątek warstw `s1_YYYY` z model_urban (−30 dB → 0) zgłosiła soczewka pipeline; drugi recenzent tego nie sprawdzał.

## 10. Odrzucone uwagi

- **N30** (ALOS: `Resampling.rms` wymaga rasterio ≥ 1.4, inaczej cicho uśrednia amplitudę): zapas w FS:149 istnieje, ale granicy wersji nie da się pokazać, a bez `alos.npz` nie wiadomo, która metoda zadziałała.
- **N43** (próg r 0,388 to w praktyce test jednostronny p < 0,025): zdanie „pokazujemy tylko p < 0,05” jest prawdziwe, tylko ostrożne; kolorowanie warstwy jest spójne; żadnego błędnego twierdzenia.
- **N69** (przesunięcie NISAR − ALOS-2 podane bez obliczenia, 1,7–3,7 dB): mediany potwierdzają „średnio ok. 3 dB”; prawdziwa część (zależność od klasy) jest w N12.

Części potwierdzonych uwag, które weryfikator odrzucił:
- **N5**: obniżone z major do minor; dla lasu zdanie jest prawie prawdziwe.
- **N15**: dowód (NISAR HH −4,49 wobec S1 VV −5,88) nieważny, bo porównuje dwa czujniki; zostaje tylko „dwie rzeczy” w zdaniu wstępnym.
- **N18**: argument o jednej orbicie co 12 dni nieprawdziwy (cztery orbity, przelot co kilka dni); zostaje DSM.
- **N21**: liczby z rasteryzatora PIL (6 decyzji, 5 skupisk) zastąpione wynikiem rasteryzatora potoku (4 decyzje, 4 skupiska).
- **N33**: żadna z decyzji z trafieniem nie jest ekranem akustycznym; Poisson na poziomie miejsc wg weryfikatora P ≈ 0,41, nie 0,275.
- **N36**: udział ścian na terenie wolnym w 2020 nie jest dowodem przeciw (tak wygląda nowa budowa); nie cytować go.
- **N53**: „zarośnięte albo już mokre” nie jest najbardziej prawdopodobnym wyjaśnieniem; bardziej prawdopodobne: mniej żniw na łąkach.
- **N55**: p = 1,0 dla wetdry jest poprawnym wynikiem testu jednostronnego; uwaga o r_crit odrzucona (N43); zostaje tylko zaokrąglanie p.
- **N72**: „brak podpisu licencji nigdzie” przesadzone; źródła są wymienione, brakuje dokładnych oznaczeń.
- **N74**: podpunkt „z dokładnością do milimetra rocznie” odrzucony; zgadza się z wartościami w pełnych mm.
