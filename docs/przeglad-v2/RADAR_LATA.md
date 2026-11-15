# Zabudowa z radaru rok po roku (2015–2026): metoda, testy, granice

> Pakiet 5 z [planu](../planwyd_sar/sar-5-radar-lata.md), 15.11.2026. Wszystkie liczby pochodzą z
> `poznan-trend-detective/pipeline/sarnik_radar_lata.py` i są zapisane w
> `web/data/sarnik/radar_lata/meta.json` (pole `checks`). Uruchomienie:
> `.venv/bin/python -I pipeline/sarnik_radar_lata.py` (ok. 3 minuty).
>
> Kod, dane i moduł karty: [MichallMaciek/NASA-SpaceWalkers#22](https://github.com/MichallMaciek/NASA-SpaceWalkers/pull/22) (otwarty PR dla autora aplikacji).
> Dopóki nie jest scalony, skryptów i plików wymienionych niżej nie ma w `main`.

## Po co

Mapa optyczna (GHSL) kończy się na 2020 r. Lata 2025–2035 w aplikacji to prognoza modelu.
Radar widzi zabudowę co roku. Ten zestaw mówi dla każdej komórki 120 m, w którym roku radar
pierwszy raz widzi tam zabudowę, od 2015 do 2026 r.

## W skrócie

- **Skąd:** 265 dat radarowych z 12 lat. Sentinel-1 co roku od 2015 do 2026 r. (240 przelotów), NISAR w 2026 r.,
  ALOS PALSAR z lat 2007–2010 i ALOS-2 z lat 2015–2021 do sprawdzenia.
- **Co mówi:** po 2020 r. radar widzi 1839 ha nowej zabudowy w obszarze badań, z tego 393 ha w Poznaniu.
  Tego nie ma żadna inna warstwa w aplikacji.
- **Co się potwierdziło:** tam, gdzie mapa optyczna pokazuje nową zabudowę z lat 2015–2020, radar datuje ją
  na te lata 46 razy częściej niż gdzie indziej. Drugi satelita w paśmie L widzi tę samą zmianę (20 razy),
  a NISAR potwierdza zabudowę z lat 2021–2024 (22 razy).
- **Co się nie potwierdziło:** test na decyzjach o budowie z 2026 r. (2,1 raza, ale przedział 0,3–4,8),
  więc wiersz w karcie jest informacją, bez ostrzeżeń. ALOS PALSAR z lat 2007–2010 nie nadaje się do
  datowania, więc zapis zaczyna się w 2015 r.
- **Rejestr pozwoleń GUNB (321 obrębów):** gdzie jest więcej pozwoleń na nowe budynki, radar widzi więcej
  nowej zabudowy, także przy tym samym stopniu zabudowy (0,30; przedział 0,155–0,425). Test nie odróżnia
  jednak budowy po 2020 r. od wcześniejszej, więc nie zmienia poziomu wiersza.
- **Gdzie aplikacja z tego korzysta:** wiersz w karcie (PR #22) oraz mapa, udział zabudowy i prognoza
  dla lat 2021–2026 (PR #24). Opis w sekcji „Wiersz w karcie miejsca i reszta aplikacji”.
- **Prognoza uczona na radarze nie weszła do aplikacji.** W teście „radar na radarze” wypada dużo lepiej na
  skraju zabudowy (0,83 wobec 0,58 dla prostej reguły), ale ten zysk to głównie dalszy ciąg budowy, którą
  radar już widział obok, a niezależny rejestr pozwoleń GUNB go nie potwierdza. Nie mówimy, że radar
  przewiduje, gdzie powstaną budynki. Sekcja „Prognoza uczona na radarze”.
- **Prognoza:** model „co może powstać obok” sprawdziliśmy na tym, co radar widział po 2020 r.
  Trafia w okolicę, ale nie w konkretne działki (sekcja niżej).

## Dane

| Źródło | Lata | Przeloty | Do czego |
|---|---|---|---|
| Sentinel-1 (pasmo C, VV i VH) | 2015–2026 | 20 dat na rok (4 orbity × 5 dat, czerwiec–sierpień), razem 240 | szereg roczny |
| NISAR GCOV, tor 57 (HH, HV) | 2026 | 10 | potwierdzenie zabudowy w 2025–2026 |
| NISAR GUNW, tor 158 (koherencja 12 dni) | 2026 | 9 dat (8 par) | jw. |
| ALOS PALSAR (pasmo L) | 2007, 2008, 2010 | 1, 4, 1 | tylko udział zabudowy, niska pewność (niżej) |
| ALOS-2 (pasmo L, mozaiki roczne) | 2015–2021 | mozaiki | niezależne sprawdzenie |

Razem 265 dat radarowych (`meta.passes`).

## Metoda w skrócie

1. **Wyrównanie lat.** Kompozyty z różnych lat różnią się bez związku z budową: inny zestaw satelitów
   (w 2015 r. tylko Sentinel-1A, utrata 1B w grudniu 2021 r., od 2025 r. 1C), poprawki kalibracji, susza.
   Każdy rok dopasowujemy do wspólnego wzorca na komórkach, które się nie zmieniły:
   stara zabudowa (zabudowane już w 2000 r. i nadal w 2020 r., 8555 komórek), zwarty las (60 839) i pola
   ponad 1 km od zabudowy (26 088). Dopasowanie to zrównanie rozkładów (kwantyli) na tych komórkach.
   Największe przesunięcie: 2015 r., +0,5 dB w VV.
2. **Klasyfikator.** Jeden model (gradient boosting) na VV, VH, VV/VH, rozrzucie w sezonie i średnich
   z sąsiedztwa 3 × 3 i 7 × 7 komórek. Uczymy go tylko tam, gdzie mapa optyczna jest pomiarem:
   Sentinel-1 2015 z mapą 2015 i Sentinel-1 2020 z mapą 2020 („zabudowane” = udział ≥ 0,15).
3. **Bez podglądania.** Obszar dzielimy na bloki 16 × 16 komórek (ok. 1,2 km). Każdą komórkę, w każdym
   roku, liczy model, który nie widział jej bloku. Dlatego testy zmian niżej są poza próbą uczącą.
4. **NISAR 2026.** NISAR jest tylko w 2026 r. Jego model uczy się mapy 2020 na komórkach, których stan
   według Sentinel-1 nie zmienił się 2020 → 2026. Szereg roczny zostaje z samego Sentinel-1 (ten sam model
   co roku, więc 2026 r. nie skacze przez zmianę metody). NISAR potwierdza nową zabudowę z 2025 i 2026 r.
   Połączone prawdopodobieństwo 2026 jest w `built_years.npz` (`prob_2026_fused`).
5. **Rok pierwszej zabudowy.** Szukamy jednego najlepszego skoku „niezabudowane → zabudowane”:
   - średnia po skoku minus średnia przed skokiem ≥ 0,40,
   - po skoku co najmniej 75% lat z prawdopodobieństwem ≥ 0,5, przed skokiem najwyżej 25%,
   - skok w 2016 r. (tylko jeden rok „przed”): rok 2015 poniżej 0,25,
   - skok w 2025 lub 2026 r.: średnia po skoku ≥ 0,70, każdy rok po skoku ≥ 0,5 i NISAR sam ≥ 0,5,
   - bez skoku: „zabudowane od początku” (2015 lub wcześniej), jeśli średnia z 2015–2017 ≥ 0,5,
     inaczej „brak zabudowy do 2026”.

   Reguła odrzuca dużo: 36 919 komórek przekracza 0,5 w górę choć raz, a skok dostaje 7270.
   4226 komórek miało kandydata na skok, ale nie spełniło warunków trwałości;
   2566 z nich to skoki z 2025–2026 bez potwierdzenia NISAR. 6778 komórek jest dziś raczej zabudowanych
   (średnia z 2024–2026 ≥ 0,5), ale bez wyraźnego roku; zapisujemy je jako „brak zabudowy” (ostrożnie).

**Jedna poprawka po pierwszym przebiegu.** Pierwsza wersja reguły (bez warunku dla 2016 r. i z połączonym
prawdopodobieństwem w 2026 r.) dawała stosy na brzegach szeregu: 773 ha w 2016 r. i 835 ha w 2026 r.
przy ok. 350–440 ha w innych latach. To artefakt brzegu (jeden rok przed albo po skoku i zmiana modelu
w 2026 r.), więc regułę zaostrzyliśmy. Wyniki pierwszej wersji: `metoda_2015_2020` 51,7 (45,2–59,0),
`decyzje_2026` 2,21 (0,37–4,89), 2406 ha po 2020 r. Test decyzji nie przechodził ani wtedy, ani teraz.

## Wyniki

### Zabudowa po 2020 r. (obszar badań, ha)

| Rok | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| obszar badań | 461 | 382 | 367 | 409 | 438 | 360 | 373 | 372 | 341 | 180 | 214 |
| Poznań (miasto) | 76 | 70 | 87 | 84 | 91 | 90 | 78 | 65 | 81 | 33 | 46 |

- Po 2020 r. radar widzi **1839 ha** nowej zabudowy w obszarze badań, z tego **393 ha** w Poznaniu.
- **Dopisek, 15.11, 12:10.** Z tych 1839 ha 1379 ha (2573 komórki) leży tam, gdzie mapa optyczna z 2020 r. miała
  poniżej 15% zabudowy. Pozostałe 460 ha (859 komórek, 25%) to komórki, które mapa optyczna miała już jako
  zabudowane, prawie wszystkie w przedziale 15–30%: radar widzi tam dogęszczenie, a nie zabudowę na pustym
  terenie. W latach 2016–2020 ten udział był jeszcze większy (47% względem mapy z 2015 r.), bo radar uznaje
  komórkę za zabudowaną przy gęstszej zabudowie niż próg 15% mapy optycznej. Uczciwe sformułowanie:
  „1839 ha nowej i gęstszej zabudowy”, a jako ściśle nową podawać 1379 ha.
- To ok. 306 ha rocznie. Mapa optyczna przybywała w latach 2015–2020 po ok. 580 ha rocznie
  (w mieście ok. 107 ha). Radar w tym samym okresie 2016–2020 daje ok. 411 ha rocznie.
  Radar jest więc ostrożniejszy niż mapa optyczna (ok. 0,7 jej tempa), a nie luźniejszy.
- Lata 2025 i 2026 są zaniżone przez ostrzejszą regułę. Budowa zaczęta w 2026 r. pokaże się pewnie
  dopiero po kolejnym lecie.
- Udział zabudowy według reguły: 9,0% obszaru badań w 2015 r., 10,0% w 2020 r., 10,8% w 2026 r.
  Mapa optyczna: 10,3% w 2015 r. i 11,6% w 2020 r. Radar nie widzi części luźnej zabudowy, którą mapa
  optyczna liczy jako ≥ 15% udziału.
- W promieniu 1 km od komórki przybyło po 2020 r. (kwantyle w obszarze badań): mediana 0 ha,
  75%: 2,7 ha, 90%: 8,6 ha, 95%: 13,9 ha, 99%: 25,2 ha.

### Tabela testów

Kryteria zapisaliśmy w kodzie (`CRITERIA`) przed liczeniem. Przedziały 95% z bootstrapu blokowego
(bloki 16 × 16 komórek, 2000 losowań), nie z testu dwumianowego na komórkach.

| Nr | Test (`checks.…`) | Co porównuje | Wynik | Przedział 95% | Kryterium | Zaliczony |
|---|---|---|---|---|---|---|
| 1 | `krzyzowo_lata` | model z 2015 r. na 2020 r. i odwrotnie, na blokach, których nie widział | AUC 0,979 i 0,964 | – | AUC ≥ 0,90 w obie strony | **tak** |
| 2 | `blokowa_walidacja` | 2015 i 2020 razem, 5 grup bloków | AUC 0,978; Brier 0,032; błąd kalibracji ok. 0,035 | – | tylko raport | – |
| 3 | `metoda_2015_2020` | komórki, które mapa optyczna zmieniła 2015 → 2020 (5410), wobec tych, które zostały wolne (355 675): ile radar datuje na 2016–2020 | 16,0% wobec 0,35%, **46 razy** | 40,0–53,2 | dolna granica > 2 | **tak** |
| 4 | `decyzje_2026` | komórki z decyzją „nowa budowa” (VI–VIII 2026, 766 komórek, 118 bloków) wobec reszty miasta bez spraw (45 285): ile radar datuje na 2021–2026 | 3,0% wobec 1,45%, **2,1 raza** (23 komórki) | **0,30–4,77** | dolna granica > 1 | **nie** |
| 5 | `prognoza_2025` | wolne w 2020 r. komórki przy zabudowie: model zespołu mówi „zabudowane w 2025” (4656) wobec reszty (20 651): ile radar datuje na 2021–2026 | 5,0% wobec 4,1%, **1,22 raza** | 1,04–1,41 | dolna granica > 1 | **tak** |
| 5a | jw., wszystkie wolne komórki | bez wyrównania odległości od zabudowy | 7,1 raza | 5,9–8,5 | tylko raport | – |
| 6 | `alos2_zgodnosc` | Sentinel-1 a ALOS-2 (pasmo L, inny satelita), te same lata 2015–2021 | AUC 0,875–0,935 (najsłabiej 2018); zmiana: ALOS-2 rośnie na 43,8% komórek datowanych przez Sentinel-1 na 2016–2020 wobec 2,2% nigdy niezabudowanych, **20 razy** | 18,2–22,7 | AUC ≥ 0,85 co roku i dolna granica zmiany > 2 | **tak** |
| 7 | `nisar_2026` | NISAR sam a komórki, które Sentinel-1 sam datuje na 2021–2024 (2597), wobec nigdy niezabudowanych | 68,5% wobec 3,1%, **22 razy** | 20,3–24,5 | dolna granica > 2 | **tak** |
| 8 | `stabilnosc_lat` | czy udział zabudowy (średnie prawdopodobieństwo) skacze z roku na rok | największy skok +0,98 p.p. (2019 → 2020); bez wyrównania 1,63 p.p. | – | skok ≤ 3 × wzrost optyczny (0,81 p.p.) | **nie** |
| 9 | `tempo_po_2020` | nowa zabudowa na rok po 2020 r. wobec wzrostu optycznego 2015–2020 | 306 wobec 580 ha rocznie, 0,53 | – | między 1/3 a 3 | **tak** |
| 10 | `alos1_dolaczenie` | czy ALOS PALSAR 2007–2010 może datować lata razem z Sentinel-1 | 24,7% starej zabudowy dostaje rok po 2010 r. | – | najwyżej 5% (i drugi warunek) | **nie** |
| 11 | `zmiana_po_2020` | bramka poziomu `warn` w karcie: testy 3 i 4 naraz | test 4 nie przechodzi | – | 3 i 4 zaliczone | **nie** |
| 12 | `pozwolenia_gunb` | 321 obrębów: nowa zabudowa z radaru 2021–2026 a działki z nową budową w rejestrze GUNB, po odjęciu wpływu zabudowy z 2020 r. | korelacja cząstkowa rang 0,30 | 0,155–0,425 | dolna granica > 0,15 | tak, o włos; nie wchodzi do bramki (sekcja niżej) |

Co z tego wynika:

- **Metoda datuje zmianę dobrze tam, gdzie mamy prawdę** (test 3), a niezależny satelita w paśmie L
  widzi tę samą zmianę (test 6). NISAR potwierdza nową zabudowę z 2021–2024 (test 7).
- **Test na decyzjach o budowie nie przechodzi.** Krotność 2,1 jest w dobrą stronę, ale to 23 komórki
  w 118 blokach i przedział sięga 0,3. Decyzja z lata 2026 r. zwykle oznacza, że budowa jeszcze się nie
  zaczęła, więc lato 2026 r. często nie może jej pokazać. Ten sam test na wszystkich decyzjach VI–XI
  daje 1,98 (0,78–3,82), a tylko na komórkach wolnych w 2020 r. 3,0 (0,27–6,9).
- Dlatego `zmiana_po_2020.passed = false`. Karta zostaje na poziomie `info`; nie wolno pisać „ostrzeżenie”.
- **Szereg prawdopodobieństw nie jest stabilny** (test 8). Lato 2020 r. daje o ok. 1 p.p. więcej
  zabudowy niż 2019 r., czyli ok. 3,6 raza więcej niż roczny wzrost optyczny. Wyrównanie zmniejsza skoki
  o mniej więcej połowę, ale ich nie usuwa. Prawdopodobnie to pogoda (susze 2018–2019) na luźnej
  zabudowie z ogrodami. Reguła pierwszego roku tłumi to: udział według reguły rośnie równo, o ok.
  0,17 p.p. rocznie. Kto czyta `prob` z `built_years.npz` rok po roku, musi o tym wiedzieć.
- Prognoza zespołu (test 5) trafia w nową zabudowę z radaru tylko trochę lepiej niż proste
  „obok istniejącej zabudowy” (1,22 raza). Krotność 7,1 dla wszystkich wolnych komórek to głównie efekt
  bliskości zabudowy.

### Co dodaje NISAR

| Mapa 2026 a mapa optyczna 2020 (zastępczo, komórki bez zmiany) | AUC |
|---|---|
| Sentinel-1 2026 sam (model uczony na 2020) | 0,974 |
| szereg Sentinel-1 (model 2015 + 2020) w 2026 r. | 0,970 |
| NISAR sam (HH, HV, koherencja) | 0,982 |
| Sentinel-1 + NISAR | 0,985 |

- Zgodność Sentinel-1 i NISAR w 2026 r. przy progu 0,5: 95% komórek, kappa 0,77. Udział zabudowy:
  Sentinel-1 12,3%, NISAR 11,8%, razem 12,1%.
- Wkład NISAR do stanu jest mały (AUC +0,01). Duży jest wkład do roku: bez potwierdzenia NISAR reguła
  dałaby 1815 komórek z pierwszym rokiem 2025–2026, z potwierdzeniem 734. NISAR odrzuca więc ok. 60%
  świeżych „skoków” z samego Sentinel-1.

### Prognoza „co może powstać obok” sprawdzona radarem

Skrypt: `pipeline/sarnik_radar_prognoza.py` (ok. 25 sekund). Wynik zapisuje do
`data/raw/radar/radar_prognoza/meta.json` (poza gitem), a z opcją `--web` do `web/data/sarnik/radar_prognoza/`.
Przedziały 95% z bootstrapu blokowego (bloki 16 × 16 komórek, 1000 losowań).

| Co | Wynik | Przedział 95% | Zaliczone |
|---|---|---|---|
| Odtworzenie modelu z aplikacji (uczony 2005–2015, test 2015–2020) | AUC 0,987, na wolnym terenie 0,986; wszystkie współczynniki identyczne z `land.json` | 0,986–0,989 | tak |
| `prognoza_a_radar`: 354 926 komórek wolnych w 2020 r., z nich radar datuje 2586 na 2021–2026. Udział nowych w 5% miejsc najwyżej w prognozie wobec reszty | 4,3% wobec 0,54%, **7,9 raza**; AUC 0,838 | 6,7–9,4 | tak (kryterium: dolna granica > 2) |
| To samo dla prostej reguły „ile zabudowy jest w promieniu ok. 1,1 km”, bez modelu | 10,0 raza; AUC 0,861 | różnica AUC modelu: −0,024 (−0,048 do +0,002) | model nie jest lepszy od tej reguły |
| `prognoza_a_radar_brzeg`: tylko wolne komórki stykające się z zabudową z 2020 r. (10 340, z nich 345 nowych) | 3,3% wobec 3,3%, **0,98 raza**; AUC 0,571 | 0,56–1,47 | **nie** |
| Start ze stanu z radaru w 2026 r. zamiast z mapy 2020 (2778 komórek dopisanych jako zabudowane) | kolejność miejsc prawie ta sama: korelacja rang 0,91, górne 5% wspólne w 98% | – | tylko raport |

Co z tego wynika:

- **Prognoza trafia w okolicę, nie w działkę.** Dobrze wskazuje strefy, gdzie się buduje, bo są blisko
  istniejącej zabudowy. Na samym skraju zabudowy nie odróżnia miejsc, gdzie radar potem widzi budowę,
  od pozostałych. Test 5 z tabeli wyżej (1,22 raza) mówi to samo inną miarą.
- **Z 5188 komórek, które model wskazał jako zabudowane do 2025 r.,** radar widzi nową zabudowę z lat
  2021–2026 w 4,8%. W 25,1% widzi zabudowę już przed 2021 r., a w 70,1% nie widzi jej do 2026 r.
  Dla pozostałych wolnych komórek to 0,67%.
- **Co radar zmienia naprawdę:** 2369 komórek (1270 ha), które prognoza aplikacji nadal liczy jako wolne,
  radar widzi jako zabudowane w latach 2021–2026.
- **Wiersz prognozy liczonej od radaru jest w module wyłączony** (`meta.json`, pole `prognoza.row`).
  Aplikacja ma już wiersz prognozy, a dwa wiersze z dwiema liczbami myliłyby kupującego. Żeby go włączyć:
  `sarnik_radar_prognoza.py --web`, `FORECAST_ROW = True` w `sarnik_radar_lata.py` i wyłączenie starego wiersza.

### Test na rejestrze pozwoleń GUNB (`pozwolenia_gunb`), 15.11.2026

**Po co.** Test na decyzjach z 2026 r. jest za mały (23 trafione komórki). Rejestr GUNB (RWDZ) ma
decyzje i zgłoszenia od 2016 r. dla miasta i powiatu poznańskiego. To dużo więcej danych i niezależne źródło.

**Co sprawdzamy.** Jednostką jest obręb ewidencyjny. Dla każdego obrębu liczymy dwie rzeczy:

- radar: ile hektarów radar datuje jako pierwszy raz zabudowane w latach 2021–2026, na km² obrębu;
- rejestr: ile działek ma co najmniej jedną sprawę „nowa budowa”, a ostatnią sprawę w latach 2021–2026, na km².

Potem sprawdzamy, czy obręby z większą liczbą takich działek mają też więcej nowej zabudowy z radaru.
Miara to korelacja rang (Spearmana). Na obrzeżach miasta jest i więcej pozwoleń, i więcej nowej zabudowy,
niezależnie od tego, czy radar coś wykrywa. Dlatego test liczymy po usunięciu wpływu udziału zabudowy
w 2020 r. (korelacja cząstkowa rang). Przedział 95% liczymy bootstrapem po gminach (pierwsze sześć cyfr
TERYT, 18 gmin), bo sąsiednie obręby nie są niezależne.

**Kryterium (zapisane w kodzie przed liczeniem):** dolna granica przedziału 95%
korelacji cząstkowej > 0,15.

**Dane.** Granice obrębów z usługi GUGiK ULDK (`pipeline/sarnik_radar_lata_obreby.py`). Rejestr ma 601
kodów obrębów. ULDK zna 339 z nich. Pozostałe 262 kody to błędy wpisu w rejestrze (np. zły rodzaj gminy).
Mają tylko 2,5% działek z rejestru i 1,7% działek z nową budową z lat 2021–2026. Do testu weszło
321 obrębów: 18 gmin, 2151 km², 30 185 działek z nową budową i ostatnią sprawą z lat 2021–2026.
Minimum: 50 komórek w obszarze badań i co najmniej 90% obrębu w obszarze badań (odpadł 1 obręb).

**Jedna poprawka po pierwszym przeliczeniu.** ULDK podaje część obrębów pod dwoma kodami, z tą samą
granicą (np. `302107_2.0008` i `302107_3.0008`). Rejestr zapisuje działki raz pod jednym, raz pod drugim kodem.
W pierwszej wersji jeden z „bliźniaków” tracił swoje komórki i odpadał, a drugi miał tylko część działek.
Poprawka: obręby o wspólnym terenie łączymy w jeden (16 takich grup), a ich działki sumujemy
(ten sam numer działki liczymy raz). Nic więcej się nie zmieniło. Ten błąd znaleźliśmy, sprawdzając
pokrycie mapy **po** zobaczeniu pierwszego wyniku. **Pierwsza wersja nie przechodziła:** korelacja
cząstkowa 0,20 (0,08–0,33), 322 obręby. Obie wersje są w `meta.json` (`first_look`).

**Wynik.**

| Co | Korelacja rang | Cząstkowa (bez wpływu zabudowy 2020) | Przedział 95% cząstkowej |
|---|---|---|---|
| **test:** radar 2021–2026 a działki z ostatnią sprawą 2021–2026 | 0,71 | **0,30** | **0,155–0,425** |
| kontrola czasu: radar 2021–2026 a działki z ostatnią sprawą 2016–2018 | 0,72 | 0,27 | 0,12–0,39 |
| różnica test − kontrola czasu | – | 0,03 | −0,05 do 0,13 |
| okres odwrotny: radar 2016–2020 a działki 2016–2020 (bez wpływu zabudowy 2015) | 0,75 | 0,29 | 0,17–0,39 |
| dla porównania: mapa optyczna 2015 → 2020 a te same działki 2016–2020 | 0,76 | 0,25 | 0,005–0,46 |

Ten sam test z dopasowaniem kwadratowym do udziału zabudowy (tylko raport): 0,30 (0,148–0,429).

Ćwiartki obrębów według gęstości działek z nową budową (2021–2026):

| Grupa | Obręby | Działki na km² | Zabudowa 2020 (średnio) | Nowa zabudowa z radaru 2021–2026, ha/km² | Przedział 95% |
|---|---|---|---|---|---|
| 1 (najmniej) | 81 | 0–3,3 | 0,8% | 0,07 | 0,04–0,12 |
| 2 | 80 | 3,4–11,1 | 1,9% | 0,31 | 0,17–0,50 |
| 3 | 80 | 11,6–22,9 | 5,6% | 0,98 | 0,66–1,17 |
| 4 (najwięcej) | 80 | 22,9–122 | 11,3% | 2,54 | 2,03–3,03 |

Tabela ćwiartek nie usuwa wpływu zabudowy z 2020 r.: gęstsze grupy są też bardziej zabudowane.

**Co przeszło, co nie.**

- `pozwolenia_gunb` **przechodzi, ale ledwo**: dolna granica 0,155 przy progu 0,15. Przeszedł dopiero
  po poprawce zrobionej po zobaczeniu pierwszego wyniku (który nie przechodził). Wariant kwadratowy
  ma dolną granicę 0,148, czyli tuż pod progiem.
- Reguła `zmiana_po_2020` **zostaje taka, jak była** (testy 3 i 4 naraz), więc nadal nie przechodzi.
  Rozważaliśmy dopisanie do niej tego testu. Nie dopisaliśmy: wynik przechodzi o 0,005, dopiero po
  poprawce zrobionej po nieudanym pierwszym przeliczeniu, a kontrola czasu (niżej) pokazuje, że test nie
  odróżnia budowy po 2020 r. od wcześniejszej. W `meta.json` jest to zapisane w polu `register_not_used`.

**Kontrola czasu nie odróżnia „radar widzi, co zbudowano po 2020 r.” od „to rosnąca okolica”.**
Radar z lat 2021–2026 idzie w parze ze starymi pozwoleniami (ostatnia sprawa 2016–2018) prawie tak
samo mocno (0,27) jak z nowymi (0,30). Różnica 0,03 ma przedział od −0,05 do 0,13. Test pokazuje więc,
że radar widzi więcej nowej zabudowy tam, gdzie się buduje. Nie pokazuje, że trafia w lata budowy.

**Sam rejestr słabo mierzy budowę na poziomie obrębu.** Nawet mapa optyczna (prawda dla 2015–2020)
daje z rejestrem tylko 0,25, z przedziałem od 0,005. Radar w tym samym okresie daje 0,29. Radar wypada
więc nie gorzej niż mapa optyczna. Ten test nie może dać dużo mocniejszego wyniku, bo rejestr jest szumny.

**Granice.**

- Poziom obrębu, nie działki ani komórki. Obręb ma średnio ok. 7 km².
- „Ostatni rok” działki to rok jej **ostatniej sprawy dowolnego rodzaju** (nowa budowa, rozbudowa,
  nadbudowa, odbudowa, rozbiórka), z daty decyzji, a gdy jej brak, z daty wniosku. To nie musi być rok
  pozwolenia na nową budowę. Działka z pozwoleniem z 2017 r. i rozbudową w 2023 r. liczy się do 2021–2026.
- Pozwolenie to nie budynek. Część nie zostanie zbudowana, część dopiero się buduje (zwłaszcza 2025–2026).
- Obręby bez żadnej sprawy w rejestrze nie mają pliku, więc nie weszły do testu (mało ich, prawie cały
  obszar badań jest pokryty).
- 18 gmin to mało skupień do bootstrapu. Przedział może być za wąski albo za szeroki.

**Co aplikacja może powiedzieć.** Uczciwie: „Tam, gdzie rejestr pokazuje więcej pozwoleń na nowe
budynki, radar widzi po 2020 r. więcej nowej zabudowy, także przy tym samym stopniu zabudowy”. Nie
możemy napisać, że radar potwierdza konkretną budowę ani jej rok. Wiersz karty zostaje więc informacją,
bez ostrzeżeń.

### Prognoza uczona na radarze (eksperyment, 15.11.2026)

Skrypt: `pipeline/sarnik_radar_prognoza_ucz.py`. Liczby: `data/raw/radar/radar_prognoza_ucz/wyniki.json` (poza gitem).
Plan i kryterium zapisaliśmy w kodzie (`DESIGN`, `CRITERIA`) przed policzeniem wyników.

**Pytanie.** Czy prognoza „co może powstać obok” będzie lepsza, jeśli uczymy ją na tym, co widział radar,
a nie tylko na mapie optycznej?

**Jak.**
- Dwa okresy po 4 lata. A: stan w 2018 r., nowa zabudowa z radaru w latach 2019–2022.
  B: stan w 2022 r., nowa zabudowa w latach 2023–2026.
- Uczymy na A, sprawdzamy na B. Do tego na innych blokach terenu (bloki ok. 1,2 km, losowa połowa do nauki).
- Wolne komórki: A 353710, z nich nowe 2131; B 348522, z nich nowe 1590.
- Skraj zabudowy: wolne komórki stykające się z zabudową.
- Przedziały 95% z bootstrapu blokowego (1000 losowań, te same dla wszystkich modeli).
- Najlepszy model wybieramy na okresie A (na blokach odłożonych), bez patrzenia na B. Wybrany: **M2**.

**Wyniki** (test: okres B, bloki niewidziane w nauce). „Krotność” = udział nowej zabudowy w 5% miejsc najwyżej
w prognozie, podzielony przez udział w pozostałych 95%.

| Model | Co to jest | AUC, wszystkie wolne | Krotność, wszystkie | AUC, skraj | Krotność, skraj |
|---|---|---|---|---|---|
| M0 | model z aplikacji (uczony na mapie optycznej) | 0,832 (0,802–0,862) | 8,83 (6,69–11,73) | 0,467 (0,422–0,518) | 0,62 (0,23–1,13) |
| B0 | bez modelu: ile zabudowy w promieniu ok. 1,1 km | 0,861 (0,808–0,902) | 10,19 (7,50–14,05) | 0,584 (0,524–0,649) | 1,38 (0,52–2,54) |
| M1 | te same 9 cech, uczone na radarze | 0,887 (0,858–0,915) | 12,25 (9,16–16,53) | 0,629 (0,583–0,680) | 2,10 (1,11–3,47) |
| M2 | M1 + cechy z radaru (regresja logistyczna) | 0,916 (0,882–0,944) | 24,56 (17,83–35,47) | 0,834 (0,794–0,864) | 8,98 (6,02–13,13) |
| M3 | cechy M2, gradient boosting | 0,912 (0,876–0,943) | 22,97 (16,90–31,64) | 0,814 (0,774–0,847) | 8,98 (5,98–12,87) |

**Kryterium** („uczenie na radarze pomaga”), dla M2:
- skraj, AUC lepsze od modelu z aplikacji: różnica 0,366 (0,290–0,425): **tak**
- skraj, AUC lepsze od reguły „obok zabudowy”: różnica 0,250 (0,169–0,322): **tak**
- wszystkie wolne, AUC nie gorsze od tej reguły (dolna granica powyżej −0,01): różnica 0,055 (0,035–0,076): **tak**
- **całe kryterium: zaliczone.**

Bez podziału na bloki (uczenie na całym A, test na całym B) M2 ma AUC na skraju
0,834 (0,807–0,861), a reguła „obok zabudowy” 0,624 (0,571–0,676).

**Co niesie wynik.** Najważniejsze cechy w modelu M3 (dla porównania) (spadek AUC po przemieszaniu cechy, wszystkie wolne komórki okresu B): built within ~360 m (0,039), built within ~2,5 km (0,018), log distance to Old Market (0,011), p_7x7 (0,009).

**Sprawdzenia.**
- Tylko nowa zabudowa z lat 2023–2024 (lata 2025–2026 radar zaniża): M2 ma AUC 0,912 (0,864–0,948) na wszystkich
  wolnych i 0,852 (0,814–0,882) na skraju.
- Bez prawdopodobieństwa zabudowy z radaru (komórki i sąsiedztwa): AUC na skraju 0,839 (0,800–0,873), różnica do reguły 0,256 (0,176–0,334).
- Kalibracja (10 przedziałów): suma przewidywań M2 1040 komórek wobec 908 obserwowanych.

**Co dodaliśmy po pierwszym przebiegu** (nie zmienia kryterium ani liczb wyżej; wynik na skraju, AUC):
- tylko 9 cech + „tempo budowy obok” z radaru: 0,827 (0,785–0,860);
- tylko 9 cech + jasność radaru (VV, VH, rozrzut): 0,701 (0,658–0,744);
- tylko 9 cech + prawdopodobieństwo zabudowy z radaru: 0,693 (0,649–0,737);
- M2 bez „tempa budowy obok”: 0,737 (0,698–0,775);
- 9 cech + „tempo budowy obok” z mapy optycznej (starsze o 3–8 lat, bez detektora radarowego): 0,647 (0,597–0,702).

Zysk niesie więc głównie „tempo budowy obok”: ile radar datował jako nową zabudowę w promieniu ok. 360 m
w trzech latach przed startem. Budowa idzie falami: osiedle rośnie etapami.

**Granice.**
- Lata 2025–2026 są zaniżone w warstwie radarowej (ostrzejsza reguła, potwierdzenie NISAR).
- Etykietą jest sama warstwa radarowa. Cechy „prawie zabudowane” i „tempo budowy obok” częściowo mierzą
  zachowanie detektora, a nie budowę.
- Jedna budowa (np. osiedle) może dostać w sąsiednich komórkach różne lata pierwszej zabudowy, bo detektor
  ma szum. Wtedy „tempo budowy obok” częściowo mierzy tę samą budowę, a nie następną. Tego nie sprawdziliśmy
  osobno; „tempo” z mapy optycznej (starsze, bez detektora) daje dużo mniej (wyżej).
- Nie mamy niezależnej prawdy dla lat 2023–2026. Następny krok: rejestr pozwoleń GUNB po obrębach.
- Okresy mają 4 lata, a nie 5 jak prognoza w aplikacji.

**Zdanie po pierwszej rundzie** (nieaktualne: zastępuje je druga runda niżej). Prognoza uczona na tym, co radar widział, lepiej wskazuje miejsca na skraju zabudowy niż model z aplikacji i prosta reguła „obok zabudowy” (AUC 0,83 wobec 0,47 i 0,58, na latach i blokach, których model nie widział), a niesie to głównie radarowy zapis tego, gdzie budowano obok w ostatnich trzech latach; sprawdzianem jest sam radar, nie niezależny rejestr.

### Druga runda: szum dat i niezależny rejestr (15.11.2026)

Plan i kryteria tej rundy (`DESIGN2`, `CRITERIA2`) zapisaliśmy w kodzie przed liczeniem. Liczby z pierwszej rundy
się nie zmieniły (porównanie logów).

**1. Czy „tempo budowy obok” wskazuje nowe miejsca, czy resztę tej samej budowy?**
Detektor może dać sąsiednim komórkom jednego osiedla różne lata. Sprawdzamy dwa sposoby:
przerwę w czasie (okno „tempa” kończy się rok albo dwa lata przed startem) i przerwę w przestrzeni
(usuwamy z testu komórki, przy których radar datował budowę w latach 2020–2022).

| Wariant (skraj zabudowy, okres B) | Nowe komórki | AUC modelu | AUC reguły „obok zabudowy” | Różnica |
|---|---|---|---|---|
| M2 jak w pierwszej rundzie | 221 | 0,834 (0,794–0,864) | 0,584 (0,524–0,649) | 0,250 (0,169–0,322) |
| „tempo” kończy się rok przed startem (A 2016–2017, B 2019–2021) | 221 | 0,783 (0,746–0,818) | 0,584 (0,519–0,653) | 0,199 (0,133–0,259) |
| „tempo” kończy się dwa lata przed startem (A 2016, B 2018–2020) | 221 | 0,753 (0,714–0,789) | 0,584 (0,523–0,651) | 0,169 (0,103–0,231) |
| bez komórek z budową 2020–2022 tuż obok (3 × 3) | 66 | 0,770 (0,703–0,826) | 0,718 (0,621–0,803) | 0,053 (-0,013–0,126) |
| bez komórek z budową 2020–2022 w promieniu ok. 220 m (7 × 7) | 36 | 0,750 (0,665–0,831) | 0,696 (0,558–0,823) | 0,053 (-0,042–0,148) |

Ile zostaje z przewagi M2 nad regułą na skraju: rok przerwy 80%, dwa lata 68%, bez sąsiadów 3 × 3 21%, 7 × 7 22%.

Kryterium „zysk to nie głównie szum dat”:
- dwa lata przerwy, model lepszy od reguły: **tak**
- bez budowy w promieniu 7 × 7, model lepszy od reguły: **nie**
- **całe kryterium: niezaliczone.**

**2. Sprawdzian bez radaru: rejestr pozwoleń GUNB.**
- 320 obrębów w 18 gminach, 18221 działek z nową budową
  i ostatnią sprawą w latach 2023–2026.
- Dla każdego obrębu: średnia szansa z modelu na wolnych komórkach w 2022 r. (M2 uczony tylko na okresie A).
- Miara: korelacja rang z liczbą takich działek na km², po odjęciu wpływu zabudowy z 2020 r.
  Przedziały z losowania całych gmin (2000 razy).

| Model | 2023–2026 (test) | 2016–2018 (kontrola czasu) |
|---|---|---|
| M0, model z aplikacji | 0,31 (0,23–0,38) | 0,28 (0,20–0,35) |
| B0, reguła „obok zabudowy” | 0,26 (0,12–0,43) | 0,24 (0,05–0,44) |
| M2, uczony na radarze | 0,22 (0,13–0,34) | 0,20 (0,09–0,36) |
| różnica M2 − M0 | -0,09 (-0,19–0,05) | -0,08 (-0,24–0,12) |
| różnica M2 − B0 | -0,04 (-0,20–0,11) | -0,04 (-0,21–0,13) |

Kryterium „niezależnie lepszy” (różnica M2 − M0, dolna granica powyżej 0): **niezaliczone.**

Co ten test może, a czego nie:
- Pokazuje, czy obręby, które model ocenia wyżej, miały więcej nowych spraw budowlanych, bez radaru w wyniku.
- Działa na obrębach, nie na komórkach ani działkach.
- „Ostatni rok” to ostatnia sprawa dowolnego rodzaju (też rozbudowa, rozbiórka), a nie rok pozwolenia na nowy budynek.
- Pozwolenie to nie budynek: może powstać później albo wcale.
- 18 gmin: przedziały są szerokie. Rejestr obejmuje tylko miasto i powiat poznański.

**Zdanie, które wolno powiedzieć na pitchu.** Radar pokazuje, co powstało po 2020 r.; prognoza uczona na radarze głównie powtarza, gdzie budowa już trwa.

**Zdanie, którego nie wolno mówić.** Nie mówimy, że prognoza w aplikacji korzysta z radaru ani że radar przewiduje, gdzie powstaną nowe budynki.

### ALOS PALSAR 2007–2010: wybrany wariant (a)

ALOS PALSAR na naszym modelu (z sąsiedztwem) odtwarza mapę optyczną z AUC ok. 0,93 (2007, 2008, 2010).
Mimo to nie łączy się z Sentinel-1 w jeden szereg: przy wspólnej regule 24,7% komórek zabudowanych
w mapie optycznej i w 2005, i w 2020 r. dostałoby rok „po 2010” (kryterium: najwyżej 5%).
To skutek zmiany satelity, a nie budowy. Dlatego zapis pierwszego roku zaczyna się w 2015 r.
(`start_year` = 2015), a lata 2007, 2008 i 2010 są tylko udziałem zabudowy w `meta.lband_history`,
z flagą `confidence: "low"`: 8,2%, 8,2% i 9,1% (mapa optyczna: 8,0% w 2005 r., 9,1% w 2010 r.).
Prawdopodobieństwa są w `built_years.npz` (`lband_years`, `lband_prob`).

## Pliki

| Plik | Rozmiar | Zawartość |
|---|---|---|
| `web/data/sarnik/radar_lata/first_year.png` | 32 kB | 0 = poza obszarem, 1 = brak zabudowy do 2026, 15–26 = rok − 2000 (15 = w 2015 r. albo wcześniej) |
| `web/data/sarnik/radar_lata/meta.json` | 13 kB | lata, przeloty, udziały, hektary, kwantyle 1 km, legenda PL/EN, wszystkie testy |
| `data/raw/radar/built_years.npz` (poza gitem) | 26 MB | `years`, `prob` (12 × 898 × 956), `first_year`, `p_nisar_2026`, `prob_2026_fused`, `lband_*` |

Skrypty (w `poznan-trend-detective/`), w kolejności uruchamiania:

| Skrypt | Co robi | Czas |
|---|---|---|
| `pipeline/sarnik_radar_lata_s1.py` | kompozyty Sentinel-1 dla lat 2015–2026 (Microsoft Planetary Computer, bez konta) | ok. 1 min na rok |
| `pipeline/sarnik_radar_lata_nisar.py` | cechy NISAR 2026 z pobranych plików GCOV i GUNW | ok. 40 s |
| `pipeline/sarnik_radar_lata_alos.py` | sceny ALOS PALSAR 2007, 2008 i 2010 na siatce aplikacji | ok. 10 s |
| `pipeline/sarnik_radar_lata.py` | klasyfikacja, rok pierwszej zabudowy, wszystkie testy, pliki modułu | ok. 3 min |
| `pipeline/sarnik_radar_lata_obreby.py` | granice obrębów z usługi GUGiK ULDK do testu na rejestrze GUNB; bez nich test jest pomijany | ok. 50 min, raz |
| `pipeline/sarnik_radar_prognoza.py` | prognoza sprawdzona radarem i liczona od stanu z 2026 r. | ok. 25 s |
| `pipeline/sarnik_radar_prognoza_ucz.py` | eksperyment: prognoza uczona na zmianach z radaru, z dwoma niezależnymi sprawdzeniami | ok. 2,5 min |

Dwa przebiegi `sarnik_radar_lata.py` dały identyczną warstwę (0 różnych komórek).

## Wiersz w karcie miejsca i reszta aplikacji

**Wiersz modułu (PR #22).** Moduł `web/sarnik/radar_lata.js` (test: `tests/sarnik/radar_lata.test.mjs`,
126 sprawdzeń) dodaje wiersz „Zabudowa wokół wg radaru, rok po roku” w grupie „Z radaru SAR”.
Przykład dla Naramowic w Poznaniu:

> Po 2020 r., gdzie kończy się mapa optyczna, radar widzi w promieniu 1 km ok. 21 ha nowej zabudowy
> (najwięcej w 2023 r.), więcej niż w 95% miejsc wokół Poznania. Od 2015 r. łącznie ok. 29 ha.

- Wiersz mówi tylko o zmianie w hektarach. Udział zabudowy podaje wiersz „Zabudowa” w karcie; druga,
  inaczej liczona liczba myliłaby kupującego.
- Poziom wiersza to zawsze `info`, dopóki `checks.zmiana_po_2020.passed` jest `false`.
- Moduł włącza się wpisem `"radar_lata"` w `web/sarnik/manifest.js`.

**Mapa, karta i prognoza (PR #24, zmienia `app.js`).** Mapa optyczna kończy się na 2020 r., a aplikacja
mieszała ją dla lat 2021–2025 z prognozą modelu na 2025 r. i pokazywała wynik jak pomiar.
Gdy jest warstwa `first_year.png`:

- **Mapa, widok „Historia”:** lata 2021–2026 pokazują nową zabudowę z radaru osobnym kolorem,
  a podkład zostaje na 2020 r.
- **Udział zabudowy i wykres historii w karcie:** lata 2021–2026 to mapa z 2020 r. plus zabudowa, którą
  radar datuje na te lata. Naramowice w 2026 r.: 72% zamiast 69%. Dopiewo: 31% zamiast 34%, bo radar
  widzi tam mniej budów, niż zakładał model.
- **Wiersz „Co może powstać obok”:** szansa jest liczona tylko na terenie, który radar nadal widzi jako
  wolny. Gdy radar widzi zabudowę na terenie liczonym dotąd jako wolny, wiersz to mówi
  („Radar widzi już zabudowę po 2020 r. na 21 ha terenu, który prognoza liczyła jako wolny”).
- **Bez warstwy radarowej** mapa i karta działają jak przed zmianą.

## Czego to nie mówi

- **Nie mówi, co zbudowano.** Radar widzi jasne, stałe odbicia: ściany, dachy, utwardzony plac.
  Nowy magazyn, parking i osiedle wyglądają podobnie. Szklarnie i niektóre sady też mogą świecić.
- **Rok jest przybliżony.** Kompozyt to lato (czerwiec–sierpień). Budowa zaczęta jesienią pokaże się
  rok później. Rok 2026 i 2025 są zaniżone (ostrzejsza reguła), a budowy z lata 2026 r. często jeszcze
  nie widać.
- **Nie widzi drobnych zmian.** Komórka ma ok. 0,54 ha. Jeden dom na dużej działce często nie podnosi
  komórki ponad próg. Z komórek, które mapa optyczna zmieniła 2015 → 2020, radar datuje na te lata
  tylko 16%; 26% uważa za zabudowane już w 2015 r., a ok. połowy nie widzi wcale.
- **Nie potwierdza decyzji o budowie.** Test 4 nie przeszedł. Nie wolno pisać, że radar „widzi budowę
  na działkach z pozwoleniem”.
- **Prawdopodobieństwa rok po roku pływają** o ok. 1 p.p. udziału (test 8). Używaj roku pierwszej
  zabudowy, a nie różnicy prawdopodobieństw z dwóch lat.
- **Etykiety to mapa GHSL**, z jej błędami i progiem 15% udziału. Lata 2025–2035 z aplikacji (prognoza)
  nie są tu etykietą, tylko testem 5.
- **NISAR 2026 nie ma prawdziwej etykiety.** Uczymy go mapą 2020 na komórkach bez zmiany; to zastępstwo.
- Komórki 6778 „dziś raczej zabudowanych bez wyraźnego roku” są w pliku jako „brak zabudowy”.
  To świadomie ostrożne, ale zaniża zabudowę 2026 r. o ok. 1,7% obszaru badań.

## Testy NISAR z nocy 14/15.11

Skrypty: `tests/nauka/nisar_zmiana_sezonowa.py`, `nisar_stan_i_wilgotnosc.py` i `nisar_a_prognoza.py`
(w `poznan-trend-detective/`), uruchomione ponownie 15.11
(`.venv/bin/python -I <skrypt> web data/raw/radar/nisar_features.npz [folder SAR]`). Uwaga:
wartości p w tych skryptach liczą komórki jak niezależne; za przedział należy brać bootstrap blokowy,
a krotności poniżej traktować jako orientacyjne. **Dla zespołów z komputerów 1 i 2: najpierw część „nie
potwierdziło się”.**

**Nie potwierdziło się (nie budować na tym wierszy karty):**

- **Zmiana NISAR w sezonie (czerwiec → październik) nie wskazuje budowy.** HH w górę o ≥ 3 dB:
  na działkach z decyzją 2,35% wobec 1,85% w reszcie miasta (1,27 raza, p = 0,18 nawet dla komórek).
  Na wolnym terenie zmiana sezonowa wypada odwrotnie: wśród 5% komórek najwyżej w prognozie
  0,23 raza (rolnictwo dominuje zmianę).
- **Zmiana koherencji (komputer 1):** „koherencja wzrosła” (`f_stable_new`) 0,85 raza na działkach
  z decyzją; „koherencja spadła” (`f_lost_stab`) 1,95 raza przy 6 trafieniach (p = 0,09 dla komórek).
  Koherencja późno − wcześnie: AUC 0,507 (brak informacji). Pojedyncza koherencja jako **stan**
  (średnia AUC 0,597, minimum 0,607) mówi trochę o decyzjach, ale tyle samo mówi sam udział zabudowy z mapy (AUC 0,63): działki z decyzją leżą w gęstszych częściach miasta.
- **Wilgotność gleby SME2 (komputer 2) nie odróżnia terenów podtopień:** średnia wilgotność AUC 0,518,
  ranga wilgotności 0,524; najwilgotniejsze 20% komórek ma podtopienia 1,06 raza częściej; komórki
  zawsze najwilgotniejsze 0,38 raza (rzadziej). Sam teren (jak nisko wobec otoczenia) daje AUC 0,862
  w walidacji blokowej, a dodanie SME2 obniża to do 0,839.
- **Różnica ALOS-2 2021 → NISAR 2026 jest za szumna:** rozrzut 5,6 dB na starej zabudowie i 3,5 dB na
  polach; 13,7% wolnego terenu „rośnie” o ≥ 3 dB. Krotność na decyzjach (1,6–1,9) jest taka sama
  jak w kontroli ALOS-2 2019 → 2021 (2,25), zanim decyzje zapadły. Działki z decyzją różnią się od reszty miasta w każdej parze pasma L, więc to nie jest ślad budowy.
- **Modele przewidujące, gdzie będą decyzje:** AUC 0,57–0,63 (sam NISAR 0,62–0,63); sprawy złożone od
  września: AUC najwyżej 0,58. Obie pary radarów razem („Sentinel-1 i NISAR w górę”): 0 trafień.

**Potwierdziło się:**

- **NISAR jako mapa stanu zabudowy.** HH, HV i koherencja odtwarzają mapę optyczną 2020 z AUC 0,953
  w walidacji blokowej; samo minimum koherencji 0,933, średnia koherencja 0,916, HH 0,845, HV 0,782.
  Zgodność przy równej powierzchni 93%. (W tym przebiegu z sąsiedztwem i Sentinel-1: 0,982 i 0,985.)
- Komórki, które NISAR uważa za zabudowane, a mapa 2020 za wolne (13 401), mają 4,0 raza częściej
  „nowe ściany” Sentinel-1 i 12,8 raza częściej wzrost udziału zabudowy 2015 → 2020.
- **Prognoza a NISAR:** komórki, które model zespołu uznał za zabudowane w 2025 r., NISAR widzi jako
  zabudowane w 39% wobec 3,2% (12 razy); uczciwie, tylko przy istniejącej zabudowie: 1,95 raza.
- **Sentinel-1 rok do roku** (jesień 2025 → jesień 2026): VV w górę o ≥ 3 dB 4,06 raza częściej na
  działkach z decyzją (16 z 766 komórek); bootstrap blokowy w `NAUKA.md`: 1,7–7,1. To jedyny sygnał
  **zmiany** związany z decyzjami, który przeszedł; dzisiejszy test 4 (rok pierwszej zabudowy) nie przeszedł.

Wniosek dla komputerów 1 i 2: zmiana w obrębie jednego sezonu (koherencja, HH, wilgotność) nie
przeszła żadnego testu; stan z całego sezonu (koherencja minimalna, HH, HV) przeszedł.
