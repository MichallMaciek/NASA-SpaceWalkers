# Podsumowanie sesji: dane SAR, weryfikacja źródeł, strategia (2026-11-14)

## 1. Co zrobiłem
- **Wybór wyzwania:** „Dancing with the SARs” ma 723 drużyny, drugie najmniej z 14 (najwięcej: 2966). Ocena: 5 kryteriów po 1–5 pkt; jury czyta głównie stronę projektu.
- **Historia SAR w konkursie:** jedyna potwierdzona nagroda główna to 2016 (L.I.V.E., lodowce z Sentinel-1). Od 2022 projekty SAR dochodzą do finałów, ale nie wygrywają; przegrywają brakiem interfejsu i opowieści.
- **Pogoda w dniach przelotów NISAR:** dla każdego przelotu dopasowałem deszcz i wilgotność gleby (Open-Meteo). Wilgotność od 0,089 (25.06) do 0,336 (23.10). Pary sucho/mokro z tej samej orbity: 158: 25.06 / 24.08, 8: 26.06 / 20.07, 57: 12.07 / 22.09, 80: 13.07 / 18.08.
- **Dane do weryfikacji budów:** 2 420 decyzji WUIA z Geopoz (VI–XI 2026), w tym 751 decyzji dla nowej budowy.
- **Konkurencja:** płatne raporty ruchu gruntu dla adresu (UK: Groundsure/SatSense, Terrafirma) i wykrywanie budów z Sentinel-1 (Datel, Spaceshift, SpaceKnow). Nie znalazłem niczego, co łączy radar, budowy i ceny transakcyjne za darmo.

## 2. Korekty i uzupełnienia do PLAN.md
| Temat | W planie / podsumowaniach | Ustalenie |
|---|---|---|
| Rozdzielczość NISAR | GCOV 10–20 m | Nad Polską wszystkie przeloty są w trybie 20+5 MHz: **GCOV 20 m**, GUNW 80 m. Ok. 10 m daje tylko GSLC (5×10 m, 12 GB/plik) |
| Wersje danych | beta, provisional | Od 21.10.2026 są dane **validated** (wydane 6.11). Nie mieszać wersji w obliczeniach |
| ERA5 z portalu Poznania | wilgotność i opady 2026 | Miesięczne, 1 punkt siatki, **kończą się w I 2026**. Zamiast tego Open-Meteo (dzienne do 12.11.2026) lub IMGW |
| O1: źródło cen | otwarte | **RCN działa** (WFS geoportalu): ok. 76 tys. transakcji mieszkaniowych w centrum, z ceną, metrażem i datą; w próbkach lata 2015–2024. Rekordy zawierają nazwiska notariuszy, więc surowych danych nie publikujemy |
| GUNB RWDZ | „brak pliku do pobrania” | Plik jest: `wynik_wielkopolskie.zip` (36 MB, CC0, aktualizacja 13.11.2026), bez współrzędnych, łączyć przez ULDK |
| Awarie Aquanet | warstwa ryzyka | Tylko bieżące awarie, bez archiwum |

## 3. Pliki
- [poznan-pod-radarem.html](poznan-pod-radarem.html): katalog sprawdzonych źródeł (NASA, Geopoz, krajowe) z endpointami, 5 analiz i pary przelotów.
- [dane/nisar_poznan_przeloty.csv](dane/nisar_poznan_przeloty.csv): 130 produktów NISAR nad Poznaniem (GCOV, GUNW, SME2) z wersją, rozmiarem, deszczem, wilgotnością gleby i linkami.
- [dane/wuia_decyzje.geojson](dane/wuia_decyzje.geojson): 2 420 decyzji budowlanych VI–XI 2026 z kategorią (nowa budowa, rozbudowa, rozbiórka, inne) i statusem.
- [skrypty/nisar_pogoda.py](skrypty/nisar_pogoda.py): odtwarza CSV z przelotami (bez konta, sama biblioteka standardowa).
- [skrypty/geopoz_wuia.py](skrypty/geopoz_wuia.py): pobiera decyzje WUIA dla dowolnego okresu.
- [obrazy/](obrazy/): podglądy NISAR nad Poznaniem 25.06 (sucho), 7.07 i 24.08 (mokro), ok. 130 m na piksel.

## 4. Problemy i ograniczenia
- Nie otworzyłem jeszcze pełnego pliku NISAR (brak konta Earthdata).
- Kategorie decyzji WUIA są nadane automatycznie z opisu; część przebudów i remontów może być źle sklasyfikowana.
- Warstwa podmokłości jest niepewna w sezonie wegetacyjnym. Pomiar osiadania z NISAR odpada (za krótki szereg).
- RCN: filtr po dacie w WFS nie działa, trzeba pobrać i filtrować lokalnie.

## 5. Następne kroki
- [ ] Otworzyć GCOV z orbity 158 (25.06 i 24.08) i potwierdzić 20 m oraz układ współrzędnych
- [ ] Policzyć zmiany z NISAR i procent trafień na decyzjach „nowa budowa / decyzja”
- [ ] Pobrać RCN dla Poznania i gmin, bez kolumn z nazwiskami
- [ ] Zaktualizować PLAN.md o korekty z sekcji 2
- [ ] Na stronie projektu odpowiedzieć wprost na pytania wyzwania: obszar, polaryzacje, fizyczne przyczyny, przyszłe zastosowania NISAR
