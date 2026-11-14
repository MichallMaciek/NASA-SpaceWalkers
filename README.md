# 🛰️ SARnik: Stacja Diagnostyczna dla Działki i Domu
### *„Deweloper ci tego nie powie. Radar tak.”*
> **NASA Space Apps Challenge 2026** · Kategoria: *Dancing with the SARs*  
> Zespół: **SpaceWalkers** (Poznań)  
> 🌐 **Działająca aplikacja:** [poznan-trend-detective.web.app](https://poznan-trend-detective.web.app) | Lokalnie: `http://localhost:8000`

---

## 💡 O co w tym chodzi? (Wersja dla ludzi)

Kiedy kupujesz używane auto za 30 000 zł, zabierasz je na stację diagnostyczną: sprawdzasz podwozie, czy nie było bite i czy nie wycieka olej.  
Kiedy kupujesz działkę lub dom za 1 000 000 zł... patrzysz na ładne zdjęcia na portalu ogłoszeniowym i wierzysz deweloperowi na słowo.

**SARnik to stacja diagnostyczna dla Twojej nieruchomości.**  
Wpisujesz adres lub klikasz dowolny punkt w Poznaniu i okolicach, a radary z orbity (nowy satelita **NASA NISAR** oraz **Sentinel-1**) prześwietlają teren i mówią prawdę o gruncie:
- Czy po ulewach woda zbierze się w piwnicy?
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
[ 3. Odbierz raport z 9 flagami bezpieczeństwa (Zielona / Żółta / Czerwona) ]
```

### Co sprawdza radar w Twojej okolicy?
1. 🟢 **Ruch podłoża (InSAR / EGMS):** Czy grunt jest stabilny, czy osiada (pomiary z dokładnością do milimetra rocznie).
2. 🟢 **Podtopienia i wsiąkanie wody (NISAR + PIG-PIB):** Czy ziemia chłonie deszczówkę, czy stoisz w bezodpływowej niecce.
3. 🟢 **Budowa w toku (Sentinel-1):** Odbicia mikrofal (tzw. podwójne odbicie od ścian) wykrywają stan surowy i konstrukcje hal magazynowych na bieżąco w sezonie 2026.
4. 🟢 **Prognoza zabudowy do 2035 (Model ML):** Przetestowany na 50 latach historii algorytm szacuje ryzyko zagęszczenia zabudowy wokół Twojej działki.
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
- **Copernicus Land:** Cyfrowy Model Terenu Copernicus DEM GLO-30.
- **NASA Earthdata:** Pomiary temperatury powierzchni i wegetacji MODIS (Terra/Aqua), wilgotność gleby NASA POWER.
- **Polska geodezja i geologia:** PIG-PIB (tereny zagrożone podtopieniami), GEOPOZ Poznań (ortofotomapa 2025 i decyzje budowlane WUIA), GUGiK Geoportal, GUS BDL.
- **JAXA:** Mozaiki radarowe pasma L ALOS-2 PALSAR-2 (2015–2021).

---

<details>
<summary><b>🇬🇧 English Executive Summary (Click to expand)</b></summary>

### SARnik: The Pre-Purchase Geophysical Diagnostic Station for Land & Homes
When buying a used car for €5,000, you take it to an inspection station. When buying land or a house for €250,000, you look at glossy real estate listings and trust the seller's promises.

**SARnik is the diagnostic station for real estate.**  
Search any address or drop a pin across Poznań and its metropolitan area: spaceborne radar (NASA-ISRO NISAR L-band and Copernicus Sentinel-1 C-band) penetrates clouds, weather, and canopy to reveal what the ground is actually doing:
- **Millimeter Ground Motion (InSAR):** Detects soil subsidence (up to -18 mm/yr) before structural foundations crack.
- **Soil Wetness & Flooding (NISAR + PIG-PIB):** Identifies low-drainage retention basins and water saturation after storms.
- **Active Construction Tracking:** Microwave double-bounce backscatter captures newly erected walls and logistics parks in real time (validated against municipal building permits with a 4.46x correlation).
- **Urban Sprawl Prediction:** Machine learning model projected to 2035, trained on 50 years of Landsat urbanization data.

**Quickstart:**
```bash
cd poznan-trend-detective/web && python -m http.server 8000
```
Open `http://localhost:8000` in your browser.
</details>

---

### 👥 Zespół SpaceWalkers
Projekt stworzony na hackathonie **NASA Space Apps Challenge 2026** w Poznaniu.  
*Narzędzia wspomagające:* Analiza danych, pipeline radarowy i frontend rozwijane przy wsparciu modeli AI (Google Antigravity, Claude). Każda liczba w aplikacji pochodzi bezpośrednio ze zweryfikowanych surowych danych satelitarnych i urzędowych.
