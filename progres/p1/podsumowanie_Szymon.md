# Podsumowanie Sesji Badawczej: Projekt SpaceWalkers

Podsumowanie ustaleń i weryfikacji technicznej na potrzeby wyzwania *Dancing with the SARs* (NASA Space Apps 2026, Poznań).

---

## 1. Co zrobiłem

* **Weryfikacja łączności**: Przetestowano 14 źródeł danych (9 z pliku [sources.txt](sources.txt) + 5 z [add_sources.txt](add_sources.txt)) – wszystkie zwracają kod HTTP 200 OK.
* **Inwentaryzacja danych SAR dla Poznania w ASF**:
  * **Sentinel-1 (Pasmo C – 5.6 cm)**: 16 743 sceny od 30 maja 2015 r. do dziś (rewizyta co 2–4 dni, formaty GRD 10 m i SLC z fazą).
  * **ALOS PALSAR (Pasmo L – 24 cm)**: 21 scen z lat 2007–2010.
  * **NISAR (Pasmo L – 24 cm)**: 226 produktów, w tym 48 scen L-band GCOV (ścieżka ASC 158, okres 2025–2026).
* **Ujednolicenie koncepcji produktu**: Połączono wizję rozwoju urbanizacji z analizą zagrożeń naturalnych w jeden produkt **SpaceScore** („OtoDOM dla terenu” – 4 filary: podmycia/woda, stabilność gruntu InSAR, wilgotność gleby ERA5/NISAR oraz wycinka/beton z cenami NBP).
* **Synchronizacja repozytorium Git**: Wykonano `git pull origin main` i skonfigurowano śledzenie gałęzi `origin/main` – pobrano dokumentację zespołu ([docs/PLAN.md](docs/PLAN.md)).

---

## 2. Dane i źródła

| Nazwa | Do czego | Link |
| :--- | :--- | :--- |
| **ASF Search API / Vertex** | Wyszukiwanie i pobieranie scen Sentinel-1, ALOS, NISAR | [search.asf.alaska.edu](https://search.asf.alaska.edu/) |
| **NISAR Docs** | Specyfikacja techniczna i struktura hierarchii HDF5 (GCOV, GUNW) | [nisar-docs.asf.alaska.edu](https://nisar-docs.asf.alaska.edu/) |
| **CSA SAR Tutorial (GitHub)** | Gotowy kod w Pythonie (`rasterio`) do analizy i wizualizacji rastrów SAR | [github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial](https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial) |
| **SAOCOM (CONAE)** | Operacyjne dane SAR pasma L (24 cm, Quad-Pol) do testów fizyki tożsamej z NISAR | [catalogos.conae.gov.ar](https://catalogos.conae.gov.ar/catalogo/catalogoSaocomInfo.html) |
| **GUGiK BDOT10k i PRG** | Wektorowe obrysy budynków (`OT_BUBD_A`), dróg i urzędowe granice gmin | [geoportal.gov.pl](https://www.geoportal.gov.pl/) |
| **GEOPOZ GeoServer** | Warstwy WFS/WMS Poznania (MPZP, tereny zielone, zagrożenia osuwiskowe, ortofotomapy) | [wms2.geopoz.poznan.pl/geoserver](https://wms2.geopoz.poznan.pl/geoserver/) |
| **Open Data Poznań** | Zbiory miejskie, w tym ERA5 1940–2026 (wilgotność gleby 0–7 cm, opady) | [poznan.pl/opendata](https://www.poznan.pl/opendata/) |
| **Baza Cen Nieruchomości NBP**| Kwartalne ceny transakcyjne i ofertowe za 1 m² w Poznaniu (2006–2026) | Portal NBP |

---

## 3. Pliki

* [sources.txt](sources.txt) – Wykaz 9 początkowych źródeł danych NASA i ASF.
* [add_sources.txt](add_sources.txt) – Wykaz 5 dodatkowych źródeł z agencji kosmicznych Kanady (CSA) i Argentyny (CONAE).
* [friends_idea.txt](friends_idea.txt) – Notatka z koncepcją interfejsu w stylu OtoDOM, analizą trendów 10–15 lat i suwakami.
* [koncepcja_spacescore.md](koncepcja_spacescore.md) – Spójna specyfikacja produktu SpaceScore, architektura 4 filarów oraz 3-minutowy scenariusz pitchu dla jury.
* [docs/PLAN.md](docs/PLAN.md) – Główny plan techniczny projektu SpaceWalkers (obszar 1380 km², harmonizacja serii danych, architektura).

---

## 4. Problemy i ograniczenia

* **Brak danych komercyjnych bardzo wysokiej rozdzielczości (~0,5 m)**: Otwarte programy Capella/Umbra nie obejmują Poznania; projekt realizujemy na darmowych danych 10–20 m (Sentinel-1 / NISAR).
* **Wymóg autoryzacji EDL**: Pobieranie plików rastrowych (HDF5/SLC) wymaga bezpłatnego konta NASA Earthdata Login ze zgodą na dostęp do aplikacji ASF.
* **Limit API ASF**: Zapytania REST bez parametru `maxResults` zwracają błąd HTTP 400 przy liczbie wyników powyżej 2000 (wymagany parametr `maxResults <= 2000` lub moduł Python `asf_search`).

---

## 5. Następne kroki

- [ ] Skonfigurować plik `~/.netrc` z danymi konta NASA Earthdata Login do automatycznego pobierania danych.
- [ ] Pobrać próbną scenę Sentinel-1 RTC / NISAR GCOV dla Poznania za pomocą biblioteki `asf_search`.
- [ ] Pobrać wektorowe granice 11 gmin ościennych z GEOPOZ WFS (`granice:gminy_prg_aglo_sql`) lub PRG.
- [ ] Zintegrować arkusz cen transakcyjnych NBP z lat 2015–2026 dla Poznania.
- [ ] Przygotować prototyp statycznego interfejsu z suwakiem czasu (2015–2026 -> prognoza).

