# Przegląd map i karty: co pokazujemy, a co mówią dane

> Dopisek wajlk, 15.11.2026, 12:10. Stan `main` = d904cf9 (po commitach Szymona z 11:39–11:40).
> **Stan z 13:00.** Poprawki są w `main`: #38 (punkty 4, 5 i las z punktu 6), #41 (punkty 1, 2, podpis z punktu 7,
> legenda z punktu 6), #40 (punkt 10) i #48 (tekst alarmu z punktu 3, dopisek do legendy OPERA z punktu 9).
> Do decyzji autorów zostają: waga zieleni na mapie oceny (6), kolor „jaśniej” w widoku wody (7), rozmycie i maska
> prognozy (8), krycie wycinki i miejsce warstwy OPERA (9), drobne z punktu 11 oraz nazwa widoku „Place budowy 2026 (SAR)”.
>
> **Oś lat radaru.** Od 12:38 oś czasu jest tylko w widokach prognozy i ubytku zieleni (zmiana Szymona). W widoku
> „Satelita NISAR” nie ma więc osi lat radaru ani przycisku przelotów NISAR. #48 przywrócił je na chwilę, #50 to cofnął:
> zostaje wersja Szymona. Test `tests/sarnik/radar_w_rdzeniu.test.mjs` pilnuje w CI zabudowy z radaru na mapie, w karcie
> i w prognozie; osi czasu nie pilnuje.

**Jak sprawdzane.** Kod warstw i karty przeczytany, a każda warstwa przeliczona na plikach z `web/data`.
Punkty 1, 3, 4, 5, 6, 10 i gradient z punktu 9 przeliczyłem skryptami `poznan-trend-detective/tests/nauka/mapy_*.py`,
a punkty 1, 4 i 5 sprawdziłem też w przeglądarce. Punkty 2, 7, 8, 11 i reszta punktu 9 pochodzą z przeglądu dwóch
niezależnych agentów AI (Opus), którzy liczyli na tych samych plikach; tych liczb nie przeliczałem drugi raz.

```bash
cd poznan-trend-detective && mkdir -p /tmp/mapy && .venv/bin/python -I tests/nauka/mapy_ocena.py web /tmp/mapy
```

Potem tak samo `mapy_zaglebienia_osiadanie.py` i `mapy_zaglebienia_wariant.py` (czytają `flood.npy` z pierwszego skryptu).

## Trzy pytania, od których się zaczęło

- **Czy zielone na mapie „Ocena działki” to po prostu las?** W dużej mierze tak. Ciemna zieleń to w 91% las,
  a 96% lasu jest ciemnozielone; korelacja oceny z udziałem lasu wynosi 0,89. Powód: sygnały ryzyka obejmują niecałe
  10% obszaru, więc poza nimi o kolorze decyduje tylko premia za zieleń (do +25). Strefy podtopień od 11:39 obniżają
  kolor (żadna nie jest już ciemnozielona), ale las w strefie podtopień nadal wychodzi jasnozielony (35% stref).
- **Czy zagłębienia i osiadanie są wiarygodne?** Pomiary osiadania tak, ale karta ostrzega też działki, których
  osiadanie nie dotyczy (punkt 5). Zagłębienia w większości nie: robi je las i zabudowa obok (punkt 4).
- **Czy scalenia coś usunęły?** Nie. Gałąź autora `sar-zipy-live` jest cała w `main` (zero commitów poza `main`,
  żaden jej plik nie zniknął), a publiczna strona różni się od `main` tylko nowszymi zmianami w `main`.

## Znaleziska, od najważniejszych

| # | Co widać na ekranie | Co pokazują dane | Najmniejsza poprawka | Stan |
|---|---|---|---|---|
| 1 | Kafelki z przykładami na karcie startowej: Morasko 92, Dolina Warty 35, Naramowice „Plac budowy (SAR)” 56, Stary Rynek 80 | Liczby są wpisane w kod. Karta po kliknięciu pokazuje 98, 27, 87 i 62. W Naramowicach karta mówi „radar nie widzi tu śladu nowych ścian” (ściany na 0,34% koła, próg 2%); prawdziwe jest „ok. 24 ha nowej zabudowy wg radaru od 2020 r.” | Liczyć oceny w chwili rysowania albo zdjąć liczby; Naramowice podpisać „nowa zabudowa wg radaru” | poprawione (#41) |
| 2 | Zaleta „Letnie wysychanie gleby (spadek wilgoci z 0,28 do 0,17)”: „Pomiary radarowe NISAR 2026 potwierdzają … Woda opadowa nie tworzy trwałych zastoisk” | To mediany całego obszaru z 25.06 i 11.10 (czerwiec–październik, nie lato), wpisane w kod i pokazywane prawie każdej działce poza strefami, także na Starym Rynku. Mapy w aplikacji (25.06 i 24.08) dają spadek o 22%, a 7.07 wilgotność była wyższa. W strefach podtopień gleba wyschła tak samo (−25% wobec −24%), więc wniosek o zastoiskach z tego nie wynika. Produkt jest wstępny i nieskalibrowany | Zdjąć wiersz albo zrobić z niego informację z wartościami dla tego miejsca, bez „potwierdzają” i bez wniosku o wodzie | poprawione (#41) |
| 3 | Widok „Place budowy 2026 (SAR)”: „fizyczny ślad nowych ścian i budów”, podpis „zmiany ścian i geometrii w 2026 r.” | Kolor ma 40 821 komórek; 95% to „ciemniej”, prawie wszystko na polach (teren otwarty jest jesienią 2026 o 1,4 dB ciemniejszy). „Ściany” to 970 komórek: 56% na terenie, którego żadna mapa nie widzi jako zabudowany, 51% to pojedyncze komórki, tylko 6,6% pokrywa się z nową zabudową 2021–2026. Warstwa to jesień 2025 do jesieni 2026. Na działkach z decyzją o nowej budowie ściany są 2,8 raza częstsze niż w reszcie Poznania (przedział 1,4–5,0; 31 komórek), czyli to sygnał, nie pewność. Wada „Aktywny plac budowy tuż obok” (−14 pkt) w 84% miejsc opiera się na ścianach z dala od jakiejkolwiek zabudowy | Nazwać widok „Zmiana radaru, jesień 2025 → 2026” i napisać „ślad jak od nowych ścian, do sprawdzenia” zamiast „aktywny plac budowy”. Bramka „licz ściany tylko przy zabudowie” nie poprawia zgodności z decyzjami (2,7 wobec 2,8 raza), więc jej nie proponuję | tekst alarmu poprawiony (#48); nazwa widoku do decyzji |
| 4 | „Zagłębienie terenu (−X m)” jako wada (−15 pkt); „Wyniesiony teren (+X m) … zerowe ryzyko gromadzenia wody” jako zaleta (+5 pkt) | Model wysokości mierzy korony drzew i dachy. Flaga zagłębienia pada na 26,5% obszaru: na 8% pól z dala od lasu i na 81% pól, które mają 25–50% lasu w promieniu 500 m. Stary Rynek: −3,6 m (kamienice). Morasko: +6,2 m (las). „Wyniesione” wychodzi 64% lasu | Porównywać tylko z komórkami bez lasu i gęstej zabudowy; gdy ich brak, nie wydawać werdyktu. Flaga spada do 7,4% obszaru, a zgodność ze strefami podtopień rośnie z 2,0 do 2,7 raza. Usunąć „zerowe ryzyko” | zagłębienia poprawione (#38); tekst „zerowe ryzyko” do decyzji |
| 5 | Wada „Osiadanie gruntu (−7 mm/rok) … Ryzyko pękania murów” | Same pomiary są spójne (ze 147 komórek z −5 mm/rok lub szybciej 143 ma sąsiada, który też osiada). Ale wada pojawia się w 7,3% obszaru i w 99% tych miejsc tylko dlatego, że gdzieś w kole 1 km jedna komórka osiada. Sama działka albo jej sąsiedzi osiadają w 5% takich miejsc. Dolina Warty z kafelka: komórka z −7 mm/rok leży 427 m od punktu | Ryzyko tylko gdy osiada typowa komórka; w pozostałych miejscach ostrzeżenie „Osiadające miejsca w okolicy” | poprawione (#38) |
| 6 | Mapa „Ocena działki”: „zielony = zalety”, „korzystna / bezpieczna” | Patrz pierwsze pytanie wyżej. Do tego las liczy się według 2000 r.: 9600 komórek, w których ubyła co najmniej połowa drzew, jest ciemnozielonych | Liczyć las, który stoi (w PR #38). Czy zieleń ma ważyć aż tyle, że mapa jest mapą lasów, to decyzja projektowa; jeśli zostaje, legenda powinna to mówić | las poprawiony (#38); zdanie w legendzie dodane (#41); waga do decyzji |
| 7 | Widok „Ryzyko zalania”: podpis „w lecie wilgotność gleby spada o 40% (NISAR 2026)” | W tym widoku nie ma warstwy wilgotności. Jest zmiana echa NISAR, która maluje na niebiesko „jaśniej” na 22% obszaru. Ten niebieski jest prawie taki sam jak niebieski stref podtopień; 99,4% niebieskiego NISAR leży poza strefami, a w strefach wzrost echa jest o połowę rzadszy | Zdjąć „40%” z podpisu i podpowiedzi; „jaśniej” rysować innym kolorem niż strefy | podpowiedź poprawiona (#41), podpis zniknął razem z osią czasu w tym widoku; kolor do decyzji |
| 8 | Widok „Prognoza 2035 (AI)”: fiolet „Prognozowana zabudowa”, podpowiedź „z ochroną lasów i dolin” | Fiolet maluje 4–5 razy więcej, niż przewiduje model (2030: 16 887 komórek, z tego 3643 to przewidziane zmiany; reszta to rozmycie 3×3). Nowa maska pomija las powyżej 35% z 2000 r., wodę i strefy wód gruntowych PIG-PIB (to nie doliny rzek ani obszary chronione). Karta tej maski nie stosuje: poziom ryzyka w karcie różni się od mapy w 19% punktów. W masce leży 6,7% prawdziwej nowej zabudowy 2015–2020. Sprawdzone liczby modelu dotyczą wersji bez maski. „AI” to regresja logistyczna na 9 cechach | Rysować maskę bez rozmycia; maskę albo zdjąć, albo zastosować też w karcie; „ochronę” zastąpić dosłowną regułą | do decyzji |
| 9 | Widok „Ubytek zieleni”: magenta „Zaburzenia lasu z radaru” (OPERA), pomarańczowa wycinka | OPERA flaguje 5,1% lasu w dwa zimowe miesiące (Landsat: ok. 371 ha rocznie w lesie), a udział rośnie z zachodu na wschód od ok. 1% do 31% w skrajnym wschodnim pasie (na wschód od 17,33°E): to wygląda na śnieg, mróz albo granicę sceny, nie na wycinkę. Wycinka z Landsat jest malowana na 17 600 ha przy prawdziwym ubytku 6183 ha (każda komórka z jakimkolwiek ubytkiem dostaje co najmniej 43% krycia) | OPERA tylko z wysoką pewnością i z dopiskiem „w dużej części fałszywe alarmy (śnieg)”, albo poza domyślnym widokiem; krycie wycinki od zera według udziału ubytku | dopisek w legendzie OPERA dodany (#48); reszta do decyzji |
| 10 | „1839 ha nowej zabudowy po 2020 r.” (karta, README, pitch) | 1379 ha leży tam, gdzie mapa optyczna z 2020 r. nie miała jeszcze zabudowy. 460 ha (25%) to komórki, które miała już jako częściowo zabudowane (prawie wszystkie 15–30%); radar widzi tam dogęszczenie | Mówić „nowej i gęstszej zabudowy” albo podawać 1379 ha jako ściśle nową | poprawione: README, ściąga, RADAR_LATA.md, krok 14 pitchu, a w aplikacji baner, punkt „obok wg radaru”, wiersz modułu i legenda (#40, scalone) |
| 11 | Drobniejsze | „Decyzje budowlane”: wśród 1254 pomarańczowych „nowa budowa” jest 377 wniosków i 126 odmów. Legenda ALOS-2 rozdziela „zabudowę” i „las”, a dane ich nie rozróżniają. Narysowany obszar: wiersz przeglądu flaguje podtopienia od 5% pokrycia, wady już od jednej komórki (−35 pkt). Podpowiedź pod kursorem w latach prognozy pisze „Urbanizacja: X%” bez słowa „prognoza”. Plakietka „Pasmo L (20 m) · Orbita 158” łączy dwa źródła (20 m to orbita 57). Legenda cen nie mówi, że to mieszkania | jak w kolumnie obok | do decyzji |

## Sprawdzone i poprawne

- Strefy podtopień: te same wielokąty na mapie, w karcie i pod kursorem; nowy filtr prostokąta w `inFlood` daje te same odpowiedzi.
- Radar rok po roku: `first_year.png` zgadza się z `meta.json` (1838,9 ha), lata 2021–2026 są na mapie, w legendzie i pod kursorem.
- Koherencja i wilgotność gleby NISAR oraz OPERA: dekodowanie, liczby w legendzie i liczniki zgadzają się z `sar.json`; komórki bez danych nie są rysowane.
- Ubytek lasu: lata 2001–2024, hektary w karcie zgadzają się z rastrem (6183 ha wobec 6220 ha w `land.json`).
- Legenda i podpowiedź zmiany echa NISAR mówią „deszcz, żniwa, uprawa” i nie wspominają o zalaniu.
- Legendy NISAR. Oś lat radaru i animacja przelotów działały do 12:38; teraz nie są dostępne w aplikacji (patrz góra dokumentu).
- Ściany w mapie, karcie i pod kursorem liczone tą samą regułą; każdy plik wymagany przez warstwy istnieje.
- Testy w przeglądarce: 60 z 60 na `main` = 497174d (po #38 i #41), szybki zestaw 15 z 15 po #48.

## Czego nie sprawdzono

- Szybkości: mapa oceny woła `inFlood` dla każdej z 402 tys. komórek przy każdym przerysowaniu; na telefonie może to być wolne.
- Czy „ściany” to prawdziwe budowy: jedyne odniesienie (WUIA) obejmuje tylko Poznań.
- Skąd bierze się gradient zachód–wschód w OPERA (źródłowych kafli nie ma w repo).
- Kompletności wielokąta stref podtopień względem źródła PIG-PIB.
