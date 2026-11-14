# 🛰️ SARnik: Stacja Diagnostyczna dla Działki i Domu
### *„Deweloper ci tego nie powie. Radar tak.”*
> **NASA Space Apps Challenge 2026** · Kategoria: *Dancing with the SARs*  
> Zespół: **SpaceWalkers** (Poznań)  
> 🌐 **Działająca aplikacja:** [poznan-trend-detective.web.app](https://poznan-trend-detective.web.app) | Lokalnie: `http://localhost:8000`  
> 📄 **Nauka, dowody i ograniczenia:** strona [`about.html`](poznan-trend-detective/web/about.html) i przegląd [`docs/przeglad-v2/NAUKA.md`](docs/przeglad-v2/NAUKA.md)

---

## 💡 O co w tym chodzi? (Wersja dla ludzi)

Kiedy kupujesz używane auto za 30 000 zł, zabierasz je na stację diagnostyczną: sprawdzasz podwozie, czy nie było bite i czy nie wycieka olej.  
Kiedy kupujesz działkę lub dom za 1 000 000 zł... patrzysz na ładne zdjęcia na portalu ogłoszeniowym i wierzysz deweloperowi na słowo.

**SARnik to stacja diagnostyczna dla Twojej nieruchomości.**  
Wpisujesz adres lub klikasz dowolny punkt w Poznaniu i okolicach, a radary z orbity (nowy radar **NASA-ISRO NISAR** oraz **Sentinel-1**) i mapy urzędowe mówią, co dzieje się z gruntem:
- Czy działka leży w strefie zagrożonej podtopieniami albo w zagłębieniu, gdzie po ulewie zbiera się woda?
- Czy grunt pod fundamentami osiada i dom zacznie pękać?
- Czy w promieniu 1 km ktoś po cichu stawia halę magazynową?
- Czy otaczający las i łąka za 5 lat zamienią się w betonozę?

---

## 🚦 Jak to działa? (3 proste kroki)

```
[ 1. Wpisz adres lub wskaż punkt ] 
               ⬇️
[ 2. Satelity radarowe NASA i ESA prześwietlają teren ]
               ⬇️
[ 3. Odbierz przegląd: każdy punkt z oceną (w normie / do sprawdzenia / uwaga) ]
```

### Co sprawdza radar w Twojej okolicy?
1. 🟢 **Ruch podłoża (InSAR / EGMS 2016–2020):** Czy grunt jest stabilny, czy osiada (wartości w pełnych mm na rok; pomiary głównie w zabudowie i wokół niej).
2. 🟢 **Podtopienia i zagłębienia (PIG-PIB + model wysokości z radaru TanDEM-X):** Czy działka leży w strefie zagrożonej podtopieniami albo w niecce, gdzie zbiera się woda.
3. 🟢 **Budowa w toku (Sentinel-1):** Wzrost odbicia z podwójnym odbiciem od ścian, jesień 2025 → jesień 2026, pokazuje miejsca z sygnałem jak od nowych ścian (górna granica: część to pola i prace ziemne).
4. 🟢 **Prognoza zabudowy do 2035 (model):** Model uczony na latach 2005–2015 i sprawdzony na 2015–2020 szacuje szansę zabudowy wolnego terenu wokół Twojej działki.
5. 🟢 **Wycinka drzew i wyspy ciepła:** Rejestr ubytku lasów od 2001 roku i anomalie letnich upałów z satelitów NASA MODIS.

---

## 🔬 Dowody: skąd wiemy, że radar nie kłamie?

Nie zgadujemy – sprawdziliśmy radar z twardymi danymi naziemnymi i fizyką odbicia mikrofal:

### 📐 Fizyka: Dlaczego radar widzi nową budowę? (Double Bounce)
Gdy na pustym polu staje stan surowy budynku lub konstrukcja hali stalowej, pionowa ściana wraz z poziomą powierzchnią gruntu tworzą naturalny **reflektor narożny (kąt 90°)**. Fale mikrofalowe radaru odbijają się dwukrotnie (*double bounce*) i wracają prosto do anteny satelity. Odbicie radaru gwałtownie rośnie o co najmniej **+3 dB** w polaryzacji współbieżnej (VV) oraz o ponad **+1.5 dB** w stosunku polaryzacji (VV/VH).

---

### 🧪 Test 1: Model predykcji vs Rzeczywistość w radarze (2026)
*Implementacja: `poznan-trend-detective/pipeline/build_sar.py` (linie 153–167), dane: `web/data/land/sar.json`*

Oficjalne globalne spisy zabudowy z satelitów optycznych (JRC GHSL) skończyły się w 2020 roku. Skąd mamy wiedzieć, czy nasz model prognozy urbanizacji ma rację i co rzeczywiście wybudowano w ostatnich latach? **Weryfikujemy to radarami SAR z 2026 roku!**

1. Wzięto wszystkie puste (niezabudowane) pola w aglomeracji (17 557 komórek analizy).
2. Podzielono je na dwie grupy:
   - **Grupa 1 (Top 5% wg modelu):** Tereny wytypowane przez algorytm jako najbardziej zagrożone nową zabudową.
   - **Grupa 2 (Pozostałe 95%):** Reszta wolnych gruntów.
3. Sprawdzono radarem Sentinel-1 w sezonie 2026, na ilu z nich faktycznie ruszyła budowa:
   - W Grupie 1: skok odbicia radaru wystąpił na **0.56%** powierzchni.
   - W Grupie 2: tylko na **0.26%** powierzchni.
4. **Wynik:** `0.56% / 0.26%` = **2.13x wyższa szansa rzeczywistej budowy** na gruntach wskazanych przez model (`p = 0.000`)! A przy ścisłym kryterium nowych ścian (*double bounce*) szansa ta jest aż **4.30x wyższa (0.44% vs 0.10%)**!

---

### 🏛️ Test 2: Oficjalne pozwolenia na budowę z Urzędu Miasta Poznania (WUIA 2026)
*Implementacja: `poznan-trend-detective/pipeline/build_sar.py` (linie 124–152), dane: `web/data/wuia_decyzje.geojson`*

W skrypcie `geopoz_wuia.py` połączyliśmy się z oficjalnym geodezyjnym serwerem Poznania (`wms2.geopoz.poznan.pl`) i pobraliśmy **2 420 rzeczywistych decyzji budowlanych** z Wydziału Urbanistyki i Architektury (WUIA) z okresu czerwiec – sierpień 2026 roku:

1. **Na działkach z pozwoleniem na nową budowę:** skok odbicia radaru o >= 3 dB występuje na **1.57%** komórek.
2. **W reszcie miasta bez takich postępowań:** tylko na **0.35%** komórek.
3. **Wynik:** `1.57% / 0.35%` = **4.46x wyższa częstość skoku radaru** na terenach z urzędowymi pozwoleniami (`p = 0.000`)! Radar widzi fizyczne prace budowlane w terenie bez zaglądania w papiery urzędu.

---

### 📉 Test 3: Osiadanie gruntu z milimetrową precyzją (InSAR / EGMS)
Z europejskich danych interferometrycznych EGMS zidentyfikowaliśmy **147 stref** w powiecie poznańskim, które osiadają w tempie powyżej 5 mm rocznie (rekordziści: do -18 mm/rok na gruntach organicznych i dolinach rzecznych).


---

## 🚀 Jak uruchomić aplikację u siebie? (1 linijka)

Nie potrzebujesz żadnych skomplikowanych baz danych ani serwerów GIS. Całość to nowoczesna, lekka aplikacja internetowa:

```bash
# Sklonuj repozytorium
git clone https://github.com/MichallMaciek/NASA-SpaceWalkers.git
cd NASA-SpaceWalkers/poznan-trend-detective/web

# Uruchom wbudowany prosty serwer (dowolny język):
python -m http.server 8000
```
Otwórz w przeglądarce: **`http://localhost:8000`**

---

## 🛰️ Źródła danych

- **NASA / ISRO:** Satelita NISAR (dane radarowe L-band GCOV, orbita 158, rozdzielczość 20 m).
- **Copernicus / ESA:** Radar Sentinel-1 (C-band RTC 2026) oraz interferometria osiadania terenu EGMS (InSAR).
- **Copernicus (ESA):** model wysokości Copernicus DEM GLO-30 (z radaru TanDEM-X; obejmuje drzewa i budynki).
- **NASA:** temperatura powierzchni i wegetacja MODIS (Terra); wilgotność gleby NASA POWER (NASA Langley Research Center).
- **Copernicus C3S / Open-Meteo:** ERA5, pogoda w dni przelotów NISAR (Weather data by Open-Meteo.com, CC BY 4.0).
- **Polska geodezja i geologia:** PIG-PIB (tereny zagrożone podtopieniami), GEOPOZ Poznań (ortofotomapa 2025 i decyzje budowlane WUIA), GUGiK Geoportal, GUS BDL.
- **JAXA:** Mozaiki radarowe pasma L ALOS-2 PALSAR-2 (2015–2021).

---

<details>
<summary><b>🇬🇧 English Executive Summary (Click to expand)</b></summary>

### SARnik: The Pre-Purchase Geophysical Diagnostic Station for Land & Homes
When buying a used car for €5,000, you take it to an inspection station. When buying land or a house for €250,000, you look at glossy real estate listings and trust the seller's promises.

**SARnik is the diagnostic station for real estate.**  
Search any address or drop a pin across Poznań and its metropolitan area: spaceborne radar (NASA-ISRO NISAR L-band and Copernicus Sentinel-1 C-band) sees through clouds and at night, and L-band also through tree canopy:
- **Ground motion (EGMS InSAR, 2016–2020):** where measured, typical motion is 0 mm/yr; 147 cells sink by 5 mm/yr or faster (up to −18 mm/yr).
- **Flooding:** PIG-PIB groundwater-flood areas and terrain hollows from the Copernicus DEM (TanDEM-X radar).
- **Construction:** Sentinel-1 double-bounce brightening, autumn 2025 → autumn 2026. Strong brightening is about 4.5 times as common on plots with a new-building decision (a rate ratio from 4 building sites, so uncertain); the new-wall signature alone is not yet confirmed.
- **Urban growth projection to 2035:** logistic model trained on 2005–2015 and tested on 2015–2020 (Landsat-based GHSL).
- **NISAR:** L-band picture of 2026 and the change from June to August (rain together with harvest and tillage); building detection and ground motion use Sentinel-1 and EGMS for now, because five months of NISAR cannot yet give a year-on-year comparison.

**Quickstart:**
```bash
cd poznan-trend-detective/web && python -m http.server 8000
```
Open `http://localhost:8000` in your browser.
</details>

---

### 👥 Zespół SpaceWalkers
Projekt stworzony na hackathonie **NASA Space Apps Challenge 2026** w Poznaniu.  
*Narzędzia wspomagające:* Analiza danych, pipeline radarowy i frontend rozwijane przy wsparciu modeli AI (Google Antigravity, Claude). Każdą liczbę w aplikacji liczą skrypty zespołu z wymienionych danych satelitarnych i urzędowych.
