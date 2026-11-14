# Podsumowanie sesji – NASA Space Apps 2026: Dancing with the SARs

## Co zrobiłem
- **Dane NISAR dla Poznania (stan na 14.11.2026):** 48 zdjęć GCOV z okresu 28.10.2025–29.10.2026 (tylko 8 sprzed kwietnia 2026) i 38 gotowych map ruchu terenu GUNW. Nad miastem przechodzą 4 tory orbity: 57 i 158 wznoszące, 8 i 80 zstępujące. Każdy tor wraca co 12 dni. Pliki HDF5 ważą ok. 2 GB i mają dwa kanały: HH (woda, zabudowa) i HV (roślinność).
- **Otwarte Dane Poznań:** przejrzałem wszystkie 65 zbiorów i ułożyłem je według przydatności. Najważniejsze: ERA5 (wilgotność gleby, opady, temperatura, śnieg), Osiedla, Granice miasta, Budowa geologiczna, Inwestycje celu publicznego, Awarie sieci wodno-kanalizacyjnej.
- **Ranking urbanizacji z GUS** dla 35 powiatów Wielkopolski, liczony z 4 wskaźników:

| Powiat | Ludność 2005→2025 | Saldo migracji 2016–25 na 1000 mieszk. | Liczba mieszkań 2005→2025 |
|---|---|---|---|
| poznański (1. miejsce) | +59,5% | +122,7 | +102% |
| średzki (3.) | +10,2% | +28,5 | +49% |
| wrzesiński (4.) | +5,8% | +13,1 | +42% |
| szamotulski (5.) | +6,9% | +24,3 | +39% |
| m. Poznań (17.) | −5,9% | −31,2 | +41% |

Wniosek: ludzie wyprowadzają się z Poznania do powiatu poznańskiego, a urbanizacja obejmuje już następny pierścień powiatów.

## Dane i źródła
| Nazwa | Do czego | Link |
|---|---|---|
| ASF Search API | lista zdjęć NISAR z linkami do pobrania | [zapytanie dla Poznania](https://api.daac.asf.alaska.edu/services/search/param?dataset=NISAR&processingLevel=GCOV&intersectsWith=POINT(16.93%2052.41)&maxResults=10&output=CSV) |
| ASF Vertex | przeglądanie danych NISAR na mapie | https://search.asf.alaska.edu/ |
| GUS Bank Danych Lokalnych | statystyki powiatów i gmin, ma API | https://bdl.stat.gov.pl/ |
| Otwarte Dane Poznań | dane miejskie, ma API | https://www.poznan.pl/opendata |
| GHSL | mapa zabudowy 1975–2030 | https://human-settlement.emergency.copernicus.eu/ghs_buS2023.php |
| Państwowy Rejestr Granic | granice powiatów i gmin | https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/ |
| EGMS | osiadanie terenu w Europie | https://egms.land.copernicus.eu/ |
| Planetary Computer | Sentinel-1, ALOS, obrysy budynków, model terenu | https://planetarycomputer.microsoft.com/ |

## Pliki
- [skrypty/gus_urbanizacja.py](skrypty/gus_urbanizacja.py): pobiera dane z GUS i liczy ranking.
- [dane/gus_powiaty_surowe.csv](dane/gus_powiaty_surowe.csv): surowe dane dla powiatów rok po roku, 1995–2025.
- [dane/ranking_urbanizacji_powiatow.csv](dane/ranking_urbanizacji_powiatow.csv): ranking wszystkich 35 powiatów.

## Problemy i ograniczenia
- Grunty zabudowane GUS podaje dla powiatów tylko za lata 2012–2014, więc zmianę zabudowy trzeba liczyć z GHSL albo z radaru.
- Saldo migracji obejmuje tylko przeprowadzki w obrębie Polski. Ranking to średnia miejsc w 4 wskaźnikach, każdy z tą samą wagą.
- Dane NISAR obejmują dopiero rok, a pliki są duże. Żadnego jeszcze nie pobrałem.
- Na Otwartych Danych Poznań nie ma danych o ludności ani o zieleni. ERA5 to jedna wartość miesięczna dla całego miasta.
- Rejestr pozwoleń na budowę GUNB nie ma pliku do pobrania.

## Następne kroki
- [ ] Pobrać dane GUS dla gmin (ten sam skrypt, inny poziom)
- [ ] Policzyć zabudowę z GHSL dla każdego powiatu
- [ ] Założyć konto NASA Earthdata
- [ ] Pobrać 2–5 zdjęć NISAR z toru 57 i porównać kanał HV w QGIS
- [ ] Porównać nową zabudowę wykrytą radarem z liczbą mieszkań z GUS
