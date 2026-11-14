# SpaceWalkers · NASA Space Apps 2026 · Poznań — PLAN (current)

> Jedyny aktualny dokument planu. Stan na **2026-11-14**.
> Źródła kontekstu: `materials/` (treść challenge, Global Offers) i `docs/initial_idea.md` (pierwotna koncepcja).
> Legenda: ✔ = zweryfikowane przez nas, ❓ = do weryfikacji.

---

## 0. Kontekst
- **Wydarzenie:** NASA Space Apps Challenge 2026, lokalne wydarzenie Poznań. Zespół: SpaceWalkers.
- **Challenge:** *Dancing with the SARs*. Interaktywna aplikacja, która na danych radarowych **NISAR** śledzi
  i wizualizuje zmiany powierzchni Ziemi. Mile widziane: polaryzacje, szeregi czasowe, dane kontekstowe, wpływ człowieka,
  storytelling, open-source.
- **Koncepcja produktu** (Kacper, `docs/initial_idea.md`): **„OtoDOM dla terenu”**. Klikasz miejsce na mapie
  i dostajesz trendy z 10–15+ lat. Do tego heatmapa zabudowy z ~30 lat, prognoza rozwoju miasta i wycinki lasów,
  powiązanie z cenami mieszkań oraz mapa z wieloma suwakami (czas: połowa historia, połowa prognoza; jasność odbicia; wysokość terenu).

## 1. Ustalenia
| # | Temat | Status | Ustalenie |
|---|---|---|---|
| D1 | Obszar (AOI) | ✅ ustalone | **Poznań i okolice:** Poznań + 11 gmin graniczących + Puszczykowo ≈ **1 380 km²** (§3) |
| D2 | Zakres prognozy | ✅ ustalone | **Zabudowa + wycinka lasów** |
| D3 | Architektura | ✅ ustalone | Pipeline offline (Python) + **statyczny frontend** (GitHub Pages), bez backendu w MVP |
| D4 | Rdzeń danych | ✅ ustalone | **NISAR (L-band)** jako „teraz” + historia z Sentinel-1, ALOS i Landsat, harmonizowana do wspólnego wskaźnika |
| D5 | Global Offers | ✅ ustalone | Planetary Computer (dane), Google Cloud (VM do obliczeń), Meteomatics (pogoda w dniach przelotów), darmowa domena → GitHub Pages; hosting **nie** na kredytach chmurowych (wygasają przed końcem oceny) |
| O1 | **Źródło cen mieszkań** | 🟡 OTWARTE | Opcje w §8. Zespół chce spróbować OtoDOM |
| O2 | **Siatka / jednostka analizy** | 🟡 OTWARTE | Opcje w §7 |
| O3 | **SAR ~0,5 m** | 🟡 OTWARTE (debata) | Brak darmowych danych nad Poznaniem (§4.3). Do decyzji pracujemy na 10–25 m |

## 2. Produkt
**Mapa + karta lokalizacji („ogłoszenie terenu”).**
- **Mapa:** heatmapa zabudowy i lasu w czasie; warstwy NISAR (kompozycja HH/HV); zmiany; ryzyka; ortofoto miasta 2001–2025 na żywo.
- **Suwaki:**
  - czas ~1985 → 2026 | prognoza 2030 / 2035 (część prognozy wyraźnie oznaczona jako scenariusz);
  - próg jasności odbicia (dB), liczony w przeglądarce na wartościach, nie na obrazku;
  - wysokość terenu / poziom wody (scenariusz zalania doliny Warty i Cybiny);
  - porównanie (swipe): SAR ↔ ortofoto ↔ inny rok.
- **Karta lokalizacji** (klik): zabudowa i las teraz, trend z wykresem, prognoza z niepewnością, przyczyny wycinki, ryzyka
  (woda, ruchy gruntu, wyspa ciepła), plan miejscowy (MPZP), ceny (zależnie od O1).
- **Tryb Story:** 3–5 lokalnych case studies (nowe osiedla, wycinki, dolina Warty) z hipotezami fizycznymi.
- **Język:** EN główny (sędziowie globalni) + PL ❓ do potwierdzenia.

## 3. Obszar (D1)
Poznań (262 km²) + gminy graniczące, wyznaczone z warstwy GEOPOZ `granice:gminy_prg_aglo_sql` ✔:
**Czerwonak, Dopiewo, Kleszczewo, Komorniki, Kórnik, Luboń, Mosina, Rokietnica, Suchy Las, Swarzędz, Tarnowo Podgórne**
+ **Puszczykowo** (enklawa między Luboniem a Mosiną; Wielkopolski Park Narodowy). Razem ≈ 1 380 km².
- W Poznaniu: bogate dane miejskie (GEOPOZ).
- W gminach: dane krajowe, BDOT10k i Bank Danych o Lasach ❓; MPZP z Krajowej Integracji MPZP ❓.

## 4. Dane

### 4.1 Satelitarne — oś czasu (~1985 → 2026)
| Okres | Źródło | Rozdz. | Rola | Dostęp |
|---|---|---|---|---|
| 2025-10 → 2026-10 | **NISAR GCOV** L-band HH+HV | 10–20 m | „Teraz”, sezonowość, woda, las | ✔ ASF: 48 scen GCOV; ścieżki ASC 57/158, DESC 8/80; repeat 12 dni; ~2 GB/scena. **ASC 158 najdłuższa** (2025-10-28 → 2026-10-23). 2025 = BETA (jakościowo), 06–10.2026 = PROVISIONAL; luka 07-27…08-10 |
| 2007, 2008, 2010 | **ALOS-1 PALSAR FBD** L-band HH+HV | ~20 m | Historia L-band (te same polaryzacje co NISAR) | ✔ ASF, 7 dat |
| 2015–2021 | ALOS PALSAR mozaiki + las/nie-las | 25 m | Historia L-band, las | ✔ Planetary Computer |
| 2014-10 → dziś | **Sentinel-1 RTC** C-band VV+VH | 10 m | Gęsty szereg zabudowy i lasu | ✔ Planetary Computer `sentinel-1-rtc` |
| 2015 → dziś | Sentinel-2 L2A | 10 m | NDVI, walidacja | ✔ Planetary Computer |
| 1982 → dziś | Landsat C2 L2 | 30 m | Historia przed SAR (NDBI/NDVI) | ✔ Planetary Computer |
| 1985–2015 | WSF Evolution (DLR) | 30 m | Gotowa historia zabudowy | ❓ DLR |
| 1975–2030 | GHSL GHS-BUILT-S (JRC) | 100 m | Historia + **projekcja 2030 = benchmark** naszej prognozy | ❓ JRC |
| 1992–2020 / 2017–2024 / 2020–21 | ESA CCI LC / io-lulc-annual-v02 / ESA WorldCover | 300 / 10 / 10 m | Referencja pokrycia terenu | ✔ Planetary Computer |
| 2000–2024 | Hansen Global Forest Change | 30 m | Referencja wycinki | ❓ UMD |
| 1984–2020 | JRC Global Surface Water | 30 m | Referencja wody | ✔ Planetary Computer |
| 2000 / 2011–15 | NASADEM / Copernicus DEM (oba z **InSAR**) | 30 m | Suwak wysokości, scenariusz zalania | ✔ Planetary Computer |
| 2020–2025 | EGMS (Copernicus, PSInSAR) | punkty / 100 m | Ruchy gruntu | ❓ EU Login |
| 2012 → dziś | NASA Black Marble (VIIRS) | 500 m | Światła nocne (stretch) | ❓ Earthdata |

**Narracja L-band:** ALOS-1 (2007–10) → ALOS mozaiki (2015–21) → NISAR (2025→) daje ~19 lat porównywalnych obserwacji
w paśmie L, w tych samych polaryzacjach. Pasmo L przenika korony drzew, więc dobrze wychwytuje utratę lasu (spadek HV).

### 4.2 Dane miejskie i krajowe
- **GEOPOZ GeoServer** ✔ `https://wms2.geopoz.poznan.pl/geoserver/{wfs,wms}`: 485 warstw WFS / 603 WMS, **CORS `*`**,
  GeoJSON w EPSG:4326, WMS w EPSG:3857 (w GetMap wymagany parametr `styles=`).
  - Granice: `egib:granica_miasta_sql`, `granice:osiedla__sql`, `granice:gminy_prg_aglo_sql`, `historia:granice_historia_*` (1925–1986)
  - Ludność: `siatki:mieszkancy{200,500,1000,…}_sql`
  - Budynki: `topografia:blo_poly_h_sql` (z wysokościami), `egib:budynki_projektowane_sql`
  - Planowanie: `mpzp_poznan:mpzp_funkcje`, `sip_wfs:mpzp_opracowywane_g_sql_wfs`, `urbanistyka:s14_tere_funk_aft_sql`, `urbanistyka:bkp_inwestycje_sql`, `urbanistyka:rewitalizacja_aft_sql`
  - Zieleń / las / woda: `topografia:tereny_zielone_sql`, `srodowisko:inwentaryzacja_drzew`, `lmn:v_lmn_wydz_slowniki`, `srodowisko:zlp_antropopresja_sql`, `topografia:tereny_wodne_sql`, `topografia:zwr_poly_sql`
  - Zagrożenia: `srodowisko:teren_zagroz_poly(_osuw)`, `srodowisko:ochr_pow_kon_rek_*`, `wyspy_ciepla_chlodu:wyspy_ciepla_klasyfikacja`, `aquanet:z_aquanet_awarie_wod_kan`
  - WMS na żywo: `ortogpkg:ortofotomapa_2001…2022`, `ortogpkg:orto2025`, `ortogpkg:NDVI_2021`, `satelitarne:sentinel_*_ndvi`
- **Portal opendata Poznania** ✔ GraphQL `https://www.poznan.pl/opendata/graphql` (65 publicznych datasetów), pliki:
  `/opendata/rest/download/file?...`. Przydatne: ERA5 1940–2026 (opady, wilgotność gleby 0–7 cm, temperatura), schrony i PSP.
  Licencja: atrybucja „Miasto Poznań, serwis poznan.pl”.
- **Krajowe** ❓: BDOT10k, Bank Danych o Lasach, Krajowa Integracja MPZP, GUS BDL.
- **Pogoda w dniach przelotów:** Meteomatics (Global Offer, 1000 zapytań/dzień; dostęp tylko w trakcie hackathonu → zapis do JSON).

### 4.3 Wysoka rozdzielczość (O3), stan wiedzy
Sprawdzone 2026-11-14 (liczba produktów nad Poznaniem w ASF): Sentinel-1 16 741, NISAR 226, ALOS 18; UAVSAR, AIRSAR, SIR-C, ERS, JERS i RADARSAT-1: 0.
Programy z otwartymi danymi ~0,5 m: **Capella Open Data** (stolice; najbliżej Berlin i Bratysława, brak Warszawy i Poznania),
**Umbra Open Data** (82 lokalizacje; najbliżej Hamburg). **NASA CSDA**: tylko dla badaczy finansowanych przez rząd USA.
Bez danych 0,5 m mierzymy **udział zabudowy w komórce**, a budynki z GEOPOZ i BDOT10k służą do walidacji.
Opcjonalnie scena z Berlina jako ilustracja „co widać przy 0,5 m, a co przy 20 m”.

## 5. Metodyka
1. **Przygotowanie SAR:** wycinek AOI → γ⁰/σ⁰ w dB → redukcja szumu (filtr Lee + mediany wieloczasowe) → maska wody.
2. **Wskaźnik zabudowy:** HH (lub VV) wysokie, HV/HH niskie. Kalibracja na budynkach GEOPOZ.
   Opcjonalnie RandomForest z etykietami miejskimi („miasto uczy satelitę”).
3. **Harmonizacja serii:** każdy sensor (Landsat/WSF → S1 → NISAR, ALOS) sprowadzamy do wspólnego
   „prawdopodobieństwa zabudowy” i „prawdopodobieństwa lasu” na jednostkę i rok. Kalibracja w **okresach nakładania się**
   (np. WSF↔S1 w 2015, S1↔NISAR w 2025–26, ALOS↔S1 w 2015–21).
4. **Zmiany:** log-ratio rok do roku; (stretch) spadek koherencji InSAR = prace ziemne.
5. **Wycinka i jej przyczyny:** spadek HV (L-band) / VH (S1) / NDVI, referencja Hansen. Przyczyny przez nałożenie na MPZP i inwestycje,
   Bank Danych o Lasach (plany urządzenia lasu) i infrastrukturę. Klasy przyczyn: zabudowa / gospodarka leśna / infrastruktura / inne.
6. **Prognoza (D2):** jeden model przejść (LightGBM multi-class), klasy las / zabudowa / inne / woda.
   Wyniki: P(las→nie-las) i P(→zabudowa) w horyzoncie 5 i 10 lat.
   Cechy: drogi i przystanki, sąsiedztwo zabudowy, MPZP i studium, odległość do centrum, nachylenie, tempo wcześniejszych zmian,
   formy ochrony (WPN, Natura 2000), typ i własność lasu.
   **Backtest** 2015→2020 / 2020→2025, porównanie z GHSL 2030. W UI pokazywane jako scenariusz z niepewnością.
7. **Ryzyka:** woda/zalanie (SAR + JRC GSW), wilgotność (NISAR + ERA5), ruchy gruntu (EGMS) w strefach osuwisk, wyspy ciepła a zabudowa.
8. **Walidacja (do pitchu):** zgodność wskaźnika SAR z budynkami GEOPOZ, wody z `tereny_wodne`, lasu z LMN/BDL; metryki w README.

## 6. Architektura i stack

```
OFFLINE (Python, pixi; VM w GCP europe-central2 + laptopy)
  ingest/  nisar · alos · s1_mpc · landsat_mpc · legacy_builtup (WSF/GHSL) · forest (Hansen/BDL)
           dem_mpc · egms · city_wfs · city_opendata · weather (Meteomatics) · prices (O1)
  process/ sar_prep · indices · harmonize · change · forest_loss · water · units (O2) · validate
  model/   transitions (LightGBM, backtest, prognoza 2030/2035)
  export/  rasters (COG→PMTiles) · vectors (tippecanoe→PMTiles) · timeseries (JSON w porcjach)
        data/raw → data/interim (GeoParquet, COG w EPSG:2180) → web/public/data
                               │  pliki statyczne, HTTP range requests
FRONTEND (GitHub Pages + własna domena)
  Vite + React + TS · MapLibre GL + pmtiles · GEOPOZ WMS na żywo
  deck.gl / geotiff.js (progowanie rastrów) · maplibre-gl-compare · Observable Plot · scrollama · Tailwind
```

| Element | Wybór | Fallback |
|---|---|---|
| Środowisko | **pixi** (conda-forge), Python 3.12, lockfile | mamba |
| NISAR | **asf_search** + `.netrc` (Earthdata); **h5py + xarray/rioxarray**; fsspec do odczytu tylko okna AOI | GDAL ≥3.13, Vertex |
| ALOS-1 | asf_search (produkty L2.2) | — |
| S1 / S2 / Landsat / ALOS mozaiki / DEM / LC | **Planetary Computer**: pystac-client + planetary-computer + **odc-stac** | GEE, ASF HyP3 |
| Wektory | OWSLib/requests → **GeoPandas** → GeoParquet | — |
| Rastry | numpy, xarray, scipy, scikit-image | — |
| Statystyki strefowe | **exactextract** | rasterstats |
| Model | **LightGBM** + scikit-learn | regresja logistyczna |
| Obliczenia | **Google Cloud VM** (e2-standard-8, 200 GB) | laptopy + pobieranie nocą |
| Rastry dla weba | COG → **PMTiles** (`gdal_translate -of PMTiles`); rastry z wartościami (uint8/float) do progowania | XYZ PNG |
| Wektory dla weba | **tippecanoe → PMTiles** | GeoJSON |
| Frontend | **Vite + React + TS + MapLibre GL** | Svelte / Leaflet |
| Progowanie w przeglądarce | **deck.gl** lub geotiff.js + WebGL | prekomputowane progi |
| Podkład | OpenFreeMap / Protomaps + ortofoto GEOPOZ | OSM |
| Wykresy / Story | Observable Plot / scrollama | Recharts |
| Orkiestracja | Makefile + `python -m pipeline.<krok>` + `config.yaml` | — |
| Notebooki | Jupyter + jupytext | — |
| Hosting / CI | **GitHub Pages + Actions**; domena z oferty Porkbun | Cloudflare Pages + R2 (pliki >100 MB) |

**Ograniczenia GitHub Pages:** tylko pliki statyczne i brak sekretów. Klucze API (Meteomatics itp.) używamy tylko w pipeline.
Limity: 100 MB na plik, ~1 GB na stronę. Backend (Cloud Run / TiTiler / HF Space) potrzebny byłby tylko dla
„dowolnego miejsca na Ziemi” lub analiz na żądanie, więc to stretch.

## 7. 🟡 OTWARTE: siatka / jednostka analizy (O2)
Kryteria: spójność dla całego AOI (miasto i gminy), dopasowanie do rozdzielczości danych (10–30 m), rozmiar dla przeglądarki,
dostępność populacji, prostota harmonizacji.
| Opcja | Plusy | Minusy |
|---|---|---|
| A. Siatka GEOPOZ 200 m (`siatki:mieszkancy200_sql`) | Ma ludność; zgodna z danymi miasta | **Tylko Poznań** |
| B. Regularna siatka EPSG:2180, 100 / 200 / 250 m dla całego AOI | Spójna dla całego AOI; 200 m ≈ 35 tys. komórek | Ludność poza miastem z innego źródła (np. siatka GUS ❓) |
| C. Hybryda: 100 m w mieście, 250–500 m w gminach | Detal tam, gdzie są dane | Dwie skale w UI i modelu |
| D. Heksagony H3 (res 9 ≈ 0,1 km² / res 10) | Ładne heatmapy, łatwa agregacja | Słabo pasuje do danych miejskich i rastrów |
| E. Jednostki administracyjne (osiedla / obręby / gminy) jako dodatkowy poziom | Czytelne dla mieszkańców, potrzebne do cen | Za grube do modelu |
Do ustalenia: rozmiar komórki + czy model działa na pikselach (30 m), a siatka służy tylko do prezentacji.
Do czasu decyzji kontrakty danych używają abstrakcyjnego `unit_id` (§9).

## 8. 🟡 OTWARTE: źródło cen mieszkań (O1)
Wola zespołu: **spróbować OtoDOM**. Stan faktyczny: OtoDOM blokuje zapytania automatyczne na poziomie CDN
(CloudFront 403 nawet dla `robots.txt`, sprawdzone 2026-11-14) i pokazuje tylko bieżące ogłoszenia (brak archiwum).
| Opcja | Co daje | Uwagi |
|---|---|---|
| OtoDOM: oficjalna prośba o dane (OLX Group) | Oferty z lokalizacją | Mała szansa w 48 h, zero ryzyka |
| OtoDOM: ręczna próbka dla 3–5 case studies | Ceny ofert nowych osiedli | Pracochłonne, mała próba |
| Publiczne zbiory ogłoszeń (np. snapshoty na Kaggle z dużych miast PL) | Historia + współrzędne + rok budowy | ❓ licencja, zakres, czy jest Poznań |
| NBP — baza cen mieszkań | Kwartalnie od 2006, Poznań, rynek pierwotny/wtórny | Tylko poziom miasta |
| GUS BDL | Ceny 1 m², wynagrodzenia per powiat/gmina | Agregaty roczne |
| RCN — Rejestr Cen Nieruchomości | Transakcje, geolokalizowane | ❓ zakres bezpłatnego dostępu |
| USA (rozszerzenie) | Zillow ZHVI, FHFA HPI ($/sq ft) | Poza AOI |
Zasady niezależnie od wyboru: **nie obchodzimy zabezpieczeń antybotowych**. W repo i aplikacji trzymamy tylko **agregaty**
(np. mediana zł/m² per jednostka × okres), bez treści ogłoszeń i danych ogłoszeniodawców. Źródło zawsze podpisane.
Kontekst dochodowy (płaca minimalna, mediana wynagrodzeń) to rozszerzenie.

## 9. Kontrakty danych (front i pipeline równolegle)
- **CRS:** obliczenia w EPSG:2180; web w EPSG:3857/4326.
- `units.pmtiles`: `unit_id, gmina, pop, built_p_<rok>, forest_p_<rok>, built_change, forest_loss_cause,`
  `pred_built_2030, pred_built_2035, pred_forest_loss_2030, pred_forest_loss_2035, mpzp_func, heat_class, egms_vel, water_freq`
  (+ `price_*` zależnie od O1).
- `ts/<porcja>.json`: `{unit_id: {years:[…], built:[…], forest:[…]}}`; `ts_nisar/<porcja>.json`: daty, HH, HV.
- Rastry: `nisar_rgb_<data>.pmtiles`, `builtup_<rok>.pmtiles` (wartości), `forest_loss.pmtiles`, `dem.pmtiles`.
- `era5.json`, `weather_passes.json`, `admin.geojson` (gminy, osiedla).
- **Dane testowe** w tym schemacie gotowe w ~H+3, żeby frontend nie czekał.

## 10. Struktura repozytorium
```
docs/PLAN.md            ← ten plik (jedyny aktualny plan)
materials/              challenge_dancing_with_the_sars.md, global_offers.md (czysty tekst)
docs/initial_idea.md    pierwotna koncepcja (Kacper)
pipeline/{ingest,process,model,export}/  + config.yaml
notebooks/              01_nisar_spike · 02_history · 03_validation · 04_model (jupytext)
data/{raw,interim}/     (.gitignore)
web/                    Vite app; public/data ← export
Makefile · pixi.toml · .github/workflows/deploy.yml
```

## 11. Strumienie pracy
| # | Strumień | Zadania (MVP → stretch) |
|---|---|---|
| **A** | NISAR + L-band | Earthdata; **spike** (1 scena ASC 158 → wycinek AOI → HH/HV dB); szereg ASC 158; ALOS-1 2007–10; kompozycja RGB; woda; szereg per jednostka |
| **B** | Historia + lasy | S1 RTC, Landsat, WSF/GHSL; **harmonizacja**; wycinka + przyczyny (Hansen, BDL); EGMS; (stretch) koherencja |
| **C** | Dane miasta/kraju + integracja | snapshot GEOPOZ; AOI; dane krajowe dla gmin; jednostki (O2); statystyki strefowe; **walidacja** |
| **D** | Frontend | szkielet + deploy; WMS ortofoto; PMTiles; suwaki (czas/prognoza, dB, wysokość wody); compare; karta lokalizacji; Story; EN/PL |
| **E** | Story + zgłoszenie | hipotezy fizyczne; case studies; teksty; slajdy/wideo wg wymogów Space Apps ❓; README; atrybucje |
| **F** | Model + ekonomia | model przejść + backtest; prognozy 2030/2035; ceny (O1); kontekst dochodowy (stretch) |

## 12. Priorytety
| Priorytet | Zakres |
|---|---|
| **MVP** | AOI; heatmapa zabudowy (WSF/Landsat → S1 → NISAR); NISAR „teraz” + ALOS-1 porównanie L-band; karta lokalizacji z trendem; suwak czasu + próg dB; walidacja z GEOPOZ |
| **High** | Prognoza zabudowa + wycinka z backtestem; wycinka z przyczynami; ceny (wg O1); ryzyka w karcie (woda, EGMS, wyspy ciepła) |
| **Stretch** | Koherencja InSAR; suwak wysokości/zalania; Black Marble; scena 0,5 m z Berlina jako ilustracja; kontekst dochodowy; backend „dowolne miejsce” |

## 13. Harmonogram (~48 h)
| Okno | Kamień milowy |
|---|---|
| H0–H3 | Repo, pixi, szkielet frontu na Pages; konta Earthdata / GCP / Meteomatics; VM + **start pobierania NISAR ASC 158**; dane testowe; decyzja O2 |
| H3–H8 | **Go/no-go:** wycinek NISAR AOI na mapie; snapshot GEOPOZ; S1 i Landsat z Planetary Computer; pogoda w dniach przelotów |
| H8–H20 | Wskaźniki, harmonizacja, jednostki, statystyki strefowe; front: warstwy, suwaki, karta |
| H20–H30 | Walidacja; model + backtest; wycinka; ceny (O1); case studies; Story |
| H30–H40 | **Feature freeze**; teksty, EN/PL, UX, wydajność |
| H40–H48 | Wideo/slajdy, strona zgłoszenia, README, ostatni deploy |

## 14. Ryzyka
| Ryzyko | Plan B |
|---|---|
| Wolny internet (2 GB/scena NISAR) | Odczyt tylko okna AOI (fsspec) / VM w GCP |
| Format HDF5 / geokodowanie | Spike w H3–H8; GDAL ≥3.13 |
| Różne sensory → niespójna seria | Kalibracja w okresach nakładania się; w UI oznaczenie źródła per okres |
| Kalibracja BETA ≠ PROVISIONAL | Wnioski ilościowe tylko z 06–10.2026 |
| Planetary Computer wolny/limitowany | GEE / ASF HyP3 |
| Dane krajowe dla gmin niedostępne | Zakres pokrycia terenu z io-lulc/WorldCover; budynki z Microsoft Buildings (Planetary Computer) |
| Ceny (O1) nieosiągalne | NBP/GUS na poziomie miasta/powiatu |
| Prognoza przesadnie pewna | Backtest + przedziały + porównanie z GHSL; etykieta „scenariusz” |
| Meteomatics po hackathonie | Dane zapisane do JSON |
| Kredyty GCP wygasną | Nic produkcyjnego w GCP |
| Zakres > 48 h | Twarde priorytety §12, feature freeze H30 |

## 15. Następne kroki
1. Rozstrzygnąć **O2 (siatka)** na starcie, bo blokuje kontrakty danych i strumień C.
2. Kontynuować debatę **O3 (0,5 m)** i rozpoznanie **O1 (ceny)** równolegle; nie blokują MVP.
3. Założyć konta (Earthdata, GCP trial, Meteomatics), postawić szkielet repo i uruchomić spike NISAR.
