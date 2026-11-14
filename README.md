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

Nie zgadujemy – sprawdziliśmy radar na niezależnych danych i fizyce odbicia mikrofal. Piszemy też, co się nie potwierdziło. Wszystkie liczby przeliczyliśmy niezależnie (`docs/przeglad-v2/NAUKA.md`, skrypty w `poznan-trend-detective/tests/nauka/`); Sentinel-1 czytamy w pełnej rozdzielczości 10 m.

### 📐 Fizyka: Dlaczego radar widzi nową budowę? (Double Bounce)
Gdy na pustym polu staje stan surowy budynku lub konstrukcja hali stalowej, pionowa ściana wraz z poziomą powierzchnią gruntu tworzą naturalny **reflektor narożny (kąt 90°)**. Fale mikrofalowe radaru odbijają się dwukrotnie (*double bounce*) i wracają prosto do anteny satelity. Nasza reguła: sygnał VV rośnie rok do roku o co najmniej **3 dB**, a różnica VV − VH o co najmniej **1,5 dB**. Działa głównie dla ścian mniej więcej równoległych do toru satelity; budynki ustawione ukośnie świecą bardziej w VH i mogą trafić do „jaśniej bez podwójnego odbicia”.

---

### 🧪 Test 1: Model predykcji a radar (2026)
*Implementacja: `poznan-trend-detective/pipeline/build_sar.py` (linie 153–167), dane: `web/data/land/sar.json`*

Oficjalne globalne spisy zabudowy z satelitów optycznych (JRC GHSL) kończą się na 2020 roku, więc sprawdzamy radarem Sentinel-1, co dzieje się teraz:

1. Wzięto wolny teren w aglomeracji: komórki niezabudowane według prognozy na 2025 rok.
2. Podzielono go na dwie grupy: **5% komórek, które model stawia najwyżej** (17 557 komórek), i **pozostałe 95%**.
3. Sprawdzono radarem, gdzie sygnał wzrósł o co najmniej 3 dB między jesienią 2025 a jesienią 2026: w grupie 1 na **0,76%** komórek, w grupie 2 na **0,43%**; ślad nowych ścian: **0,56%** wobec **0,15%**.
4. **Wynik:** różnica jest, ale to głównie skraj istniejących osiedli: 90% komórek z grupy 1 leży do 150 m od zabudowy. Gdy porównujemy tylko komórki w tej samej odległości od zabudowy, przewaga prognozy wynosi ok. **1,3 raza** dla silnego pojaśnienia (95% przedział 1,0–1,6) i ok. **1,6 raza** dla śladu nowych ścian (1,2–2,1). Ten test nie jest więc dowodem trafności modelu; model sprawdziliśmy osobno na latach 2015–2020.

---

### 🏛️ Test 2: Decyzje budowlane z Urzędu Miasta Poznania (WUIA 2026)
*Implementacja: `poznan-trend-detective/pipeline/build_sar.py` (linie 124–152), dane: `web/data/wuia_decyzje.geojson`*

W skrypcie `geopoz_wuia.py` połączyliśmy się z serwerem GEOPOZ (`wms2.geopoz.poznan.pl`) i pobraliśmy **2 420 spraw budowlanych** Wydziału Urbanistyki i Architektury (WUIA) z czerwca–listopada 2026 roku. Do testu wzięliśmy decyzje o nowej budowie z czerwca–sierpnia 2026 (pozwolenia, zgłoszenia, warunki zabudowy, decyzje lokalizacyjne):

1. **Na działkach z decyzją o nowej budowie:** sygnał wzrósł o co najmniej 3 dB na **2,1%** komórek (16 z 766).
2. **W reszcie miasta bez takich spraw:** na **0,5%** komórek.
3. **Wynik:** silne pojaśnienie jest na działkach z decyzją ok. **4 razy częstsze**. Trafienia pochodzą z 8 decyzji (9 osobnych skupisk), w tym z trzech zmian wcześniejszych pozwoleń i dwóch budów sieci. Gdy sąsiednie komórki losujemy razem, 95% przedział ufności to ok. **1,7–7**; wartości p nie podajemy, bo sąsiednie komórki nie są niezależne. Sam ślad nowych ścian jest tam ok. 3,5 raza częstszy (9 z 766 komórek), ale ten wynik jest na granicy.

---

### 📉 Test 3: Osiadanie gruntu (InSAR / EGMS 2016–2020)
EGMS mierzy 24% obszaru, głównie zabudowę i jej okolice; wartości są w pełnych milimetrach na rok. Tam, gdzie mierzy, typowy ruch to 0 mm/rok. **147 komórek (ok. 50 miejsc)** osiada o 5 mm/rok lub szybciej; najszybciej o 18 mm/rok (jedno miejsce na skraju danych, niezweryfikowane).

---

### 🛰️ Test 4: NISAR (pasmo L)
Między 25 czerwca a 24 sierpnia 2026 echo HH z NISAR wzrosło o 2 dB lub więcej na **37%** otwartego terenu: to deszcz razem ze żniwami i uprawą pól, a nie samo nasiąkanie. W strefach podtopień PIG-PIB taki wzrost był o połowę rzadszy (**19% wobec 38%**); przyczyna nie jest jeszcze znana.


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
- **Construction:** Sentinel-1 double-bounce brightening, autumn 2025 → autumn 2026. Strong brightening is about 4 times as common on plots with a new-building decision (16 of 766 cells from 8 decisions; block-bootstrap 95% interval about 1.7–7); the new-wall signature alone is about 3.5 times as common, a borderline result.
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
