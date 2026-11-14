# SpaceWalkers · Space Apps 2026 · podsumowanie sesji (2026-11-14) M. Antoniewicz

## 1. Co zrobiłem

- **Challenge:** *Dancing with the SARs*, czyli interaktywna mapa zmian terenu na danych NISAR. Obszar: **Poznań + 11 gmin graniczących + Puszczykowo (~1 380 km²)**.
- **Produkt:** „OtoDOM dla terenu”. Klik w miejsce na mapie → karta lokalizacji z trendem zabudowy i lasu (~1985→2026) i prognozą na 2030/2035.
- **NISAR nad Poznaniem:** **48 scen GCOV** (HH+HV, co 12 dni, ~2 GB każda). Najdłuższa ścieżka ASC 158 obejmuje okres 2025-10 → 2026-10.
- **Pasmo L przez ~19 lat:** ALOS-1 (7 dat z lat 2007–2010) → mozaiki ALOS (2015–21) → NISAR.
- **Dane miasta:** GeoServer GEOPOZ ma **485 warstw WFS i 603 WMS** i pozwala na zapytania z przeglądarki. Portal opendata ma **65 publicznych datasetów** dostępnych przez API GraphQL.
- **Ustalenia:**
  - aplikacja statyczna (GitHub Pages), bez backendu;
  - prognoza obejmuje zabudowę i wycinkę lasów;
  - z ofert partnerów: Planetary Computer, Google Cloud, Meteomatics i darmowa domena.
- Zainstalowałem skill `grilling` (sesje pytań, które dopracowują plan).

## 2. Dane i źródła

| Nazwa | Do czego | Link |
| --- | --- | --- |
| NISAR GCOV (ASF) | stan obecny, pasmo L | <https://search.asf.alaska.edu/> |
| ALOS-1 PALSAR (ASF) | historia pasma L 2007–10 | <https://search.asf.alaska.edu/> |
| Planetary Computer | Sentinel-1 RTC (2014→), Landsat, Sentinel-2, DEM, mapy pokrycia terenu | <https://planetarycomputer.microsoft.com/catalog> |
| GEOPOZ WFS/WMS | budynki, MPZP, ludność, zieleń, woda, osuwiska, ortofoto 2001–2025 | <https://wms2.geopoz.poznan.pl/geoserver/wfs> |
| Opendata Poznań | ERA5 (opady, wilgotność gleby), schrony | <https://www.poznan.pl/opendata/graphql> |
| EGMS | ruchy gruntu | <https://egms.land.copernicus.eu/> |
| Meteomatics | pogoda w dniach przelotów satelitów | <https://www.meteomatics.com/en/meteomatics-and-nasa-space-apps-challenge/> |

## 3. Pliki

- [docs/PLAN.md](../../docs/PLAN.md): aktualny plan (ustalenia, dane, metodyka, stack, podział pracy, harmonogram, ryzyka).
- [docs/initial_idea.md](../../docs/initial_idea.md): pierwotna koncepcja produktu.
- [materials/challenge_dancing_with_the_sars.md](../../materials/challenge_dancing_with_the_sars.md): treść challenge'u i zasoby w czystym tekście.
- [materials/global_offers.md](../../materials/global_offers.md): oferty partnerów Space Apps z warunkami.

## 4. Problemy i ograniczenia

- Brak darmowego SAR o rozdzielczości ~0,5 m nad Poznaniem. Pracujemy na 10–25 m, czyli na udziale zabudowy w komórce, nie na pojedynczych budynkach.
- OtoDOM blokuje automatyczne zapytania (błąd 403 z CDN) i nie ma archiwum cen.
- NISAR z 2025 to wersja BETA (nieskalibrowana). W danych jest luka 27.07–10.08.2026.
- GitHub Pages obsługuje tylko pliki statyczne: bez sekretów, limit 100 MB na plik.
- Kredyty chmurowe wygasają (Google Cloud po 90 dniach, Azure po 30).
- Figma MCP na koncie View/Collab daje tylko **20 wywołań na miesiąc**.
- Niezweryfikowane: WSF Evolution, GHSL, Hansen, BDOT10k i Bank Danych o Lasach dla gmin, RCN.

## 5. Następne kroki

- [ ] Rozstrzygnąć **O2 (siatka / jednostka analizy)**: blokuje format danych.
- [ ] Rozstrzygnąć **O1 (źródło cen)** i **O3 (dane 0,5 m)** sesją `/grilling`.
- [ ] Założyć konta: Earthdata, Google Cloud (trial), Meteomatics.
- [ ] Postawić VM i zacząć pobieranie NISAR ASC 158.
- [ ] Szkielet repo (pixi, Makefile, Vite + MapLibre) i pierwszy test: wycinek NISAR na mapie.
- [ ] Podłączyć Figma MCP i zrobić sesję grillingu „UX a plan”.
- [ ] Napisać `AGENTS.md` po postawieniu szkieletu repo.
