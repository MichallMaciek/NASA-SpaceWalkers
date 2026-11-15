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
| `pipeline/sarnik_radar_prognoza.py` | prognoza sprawdzona radarem i liczona od stanu z 2026 r. | ok. 25 s |

Dwa przebiegi `sarnik_radar_lata.py` dały identyczną warstwę (0 różnych komórek).

## Wiersz w karcie miejsca

Moduł `web/sarnik/radar_lata.js` (test: `tests/sarnik/radar_lata.test.mjs`, 113 sprawdzeń) dodaje wiersz
„Zabudowa wokół wg radaru, rok po roku” w grupie „Z radaru SAR”. Przykład dla Naramowic w Poznaniu:

> Radar widzi w 2026 r. zabudowę na 76% terenu w promieniu 1 km (w 2015 r.: 66%). Po 2020 r., gdzie kończy
> się mapa optyczna, przybyło ok. 21 ha (najwięcej w 2023 r.), więcej niż w 95% miejsc wokół Poznania.

- Poziom wiersza to zawsze `info`, dopóki `checks.zmiana_po_2020.passed` jest `false`.
- Moduł włącza się wpisem `"radar_lata"` w `web/sarnik/manifest.js`.
- Warstwę `first_year.png` można też narysować na mapie i przesuwać osią czasu 2015–2026: komórka jest
  zabudowana w roku R, gdy jej wartość jest od 15 do R − 2000. Tego moduł nie robi, bo mapę rysuje `app.js`.

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
