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

Sprawdziliśmy sygnały radaru na niezależnych danych i piszemy też to, co się nie potwierdziło:
- **Decyzje o nowej budowie (Wydział Urbanistyki, czerwiec–sierpień 2026):** silne pojaśnienie w radarze Sentinel-1 (VV o 3 dB lub więcej, jesień do jesieni) jest na działkach z decyzją ok. **4,5 raza częstsze** niż w reszcie miasta (stosunek częstości, 12 z 766 komórek). Trafienia pochodzą z 4 budów, więc krotność jest niepewna (95% przedział ufności ok. 0,6–10). Sam ślad nowych ścian nie jest tam jeszcze wyraźnie częstszy.
- **Prognoza a radar:** radar widzi więcej zmian tuż przy istniejącej zabudowie, czyli tam, gdzie prognoza też spodziewa się wzrostu. To nie dowód, że prognoza się sprawdza, więc nie podajemy krotności.
- **NISAR:** między 25 czerwca a 24 sierpnia 2026 echo HH wzrosło o 2 dB lub więcej na 37% otwartego terenu: to deszcz razem ze żniwami i uprawą. W strefach podtopień PIG-PIB taki wzrost był o połowę rzadszy (19% wobec 38%); przyczyna nie jest jeszcze znana.
- **Osiadanie gruntu (EGMS 2016–2020):** EGMS mierzy 24% obszaru, głównie zabudowę i jej okolice. Typowy ruch to 0 mm/rok; 147 komórek (ok. 50 miejsc) osiada o 5 mm/rok lub szybciej, najszybciej o 18 mm/rok.

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
