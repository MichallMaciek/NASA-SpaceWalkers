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

Nie zgadujemy – sprawdziliśmy radar z twardymi danymi naziemnymi:
- **Urząd Miasta Poznania (Wydział Urbanistyki):** Działki z oficjalnymi pozwoleniami na nową budowę wykazują **4.46x częstszy skok odbicia radaru** niż reszta miasta (`p = 0.000`). Radar widzi fundamenty i mury bez zaglądania w papiery urzędu.
- **Model vs Rzeczywistość:** Grunty wytypowane przez nasz model jako top 5% ryzyka urbanizacji rozwijają się w radarze **2.13x szybciej**.
- **Osiadanie gruntu:** Zidentyfikowaliśmy 147 stref w powiecie poznańskim, które osiadają w tempie powyżej 5 mm rocznie (rekordziści: do 18 mm/rok).

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
