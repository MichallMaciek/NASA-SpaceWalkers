# SpaceScore: Satelitarny Audyt Działki i Nieruchomości (NASA & ESA)

> **Główne hasło projektu:**  
> **SpaceScore** – Pierwszy zasilany radarem NASA kosmiczny audyt gruntu, ryzyka zalań i przyszłości Twojej nieruchomości. Zanim kupisz działkę lub dom, sprawdź to, czego nie widać gołym okiem.

---

## 1. Problem (Dlaczego ten projekt musi powstać?)

Kupno domu lub działki to wydatek rzędu setek tysięcy lub milionów złotych. Na portalach takich jak OtoDOM czy Morizon widzimy piękne zdjęcia, metraż i cenę. 

**Nikt jednak nie mówi kupującemu o ukrytych zagrożeniach fizycznych terenu:**
1. **Podmycia i powodzie**: Czy po ulewach działka nie zamienia się w bagno? Czy woda gruntowa nie podmyje fundamentów?
2. **Stabilność podłoża**: Czy grunt nie osiada o kilka milimetrów rocznie, powodując pękanie ścian nowego domu?
3. **Kondycja gleby i woda**: Czy ziemia nie jest jałową, wysychającą na wiór pustynią (susza glebowa), czy urosną tu rośliny, drzewa i ogród?
4. **Znikający las i beton za płotem**: Czy za 3 lata z okna nadal będzie widać zieleń, czy gigantyczną halę magazynową?

---

## 2. Rozwiązanie: SpaceScore (Satelitarne Prześwietlenie Działki)

Użytkownik klika dowolne miejsce na mapie (np. Poznań, Dąbrówkę, Naramowice, Tarnowo Podgórne) i otrzymuje **Indeks Bezpieczeństwa Działki (0–100 pkt)** oparty na 4 filarach radarowych:

```text
                           [ SPACESCORE: 88/100 ]
                                     |
    +--------------------------------+-------------------------------+
    |                                |                               |
[ 1. WODA I PODMYCIA ]     [ 2. STABILNOŚĆ GRUNTU ]     [ 3. GLEBA I OGRÓD ]     [ 4. OTOCZENIE ]
Ryzyko zalania i retencja   Osiadanie w mm/rok          Wilgotność gleby do 50cm  Wycinka drzew vs
(Sentinel-1, Pasmo C)       (InSAR faza radarowa)       (NISAR/SAOCOM, Pasmo L)   Nowy beton w okolicy
```

### Filar 1: "Czy nie podmyje mi domu?" (Ryzyko Wodne i Podtopienia)
* **Technologia**: Radar Sentinel-1 (Pasmo C – 5.6 cm).
* **Jak to działa**: Woda działa na radar jak lustro (jest całkowicie czarna na zdjęciu SAR). System analizuje historię ulew z ostatnich 10 lat i wykrywa, czy na tej działce stała woda po roztopach lub wezbraniach Warty.

### Filar 2: "Czy grunt nie pęka i nie siada?" (Stabilność Geotechniczna)
* **Technologia**: Interferometria radarowa InSAR (Sentinel-1 SLC).
* **Jak to działa**: Radar mierzy milimetrowe przesunięcia fazy fali. System generuje wykres: czy grunt pod budynkiem jest stabilny, czy osiada (np. -3 mm/rok na dawnych torfowiskach).

### Filar 3: "Jaka jest gleba i czy urosną kwiaty/ogród?" (Profil Wilgotności)
* **Technologia**: **NISAR & SAOCOM (Pasmo L – 24 cm)**.
* **Jak to działa**: Fala pasma L wnika w ziemię na głębokość 20–50 cm! Zamiast patrzeć na suchą trawę na powierzchni, radar bada zawartość wody w strefie korzeniowej (Root-Zone Soil Moisture). Użytkownik dowiaduje się, czy działka ma dobrą retencję pod ogród, czy grozi jej chroniczna susza.

### Filar 4: "Co stanie się z otoczeniem?" (Zieleń vs Beton)
* **Technologia**: Zmiana współczynnika rozpraszania (Delta Backscatter) + dane MPZP i NBP.
* **Jak to działa**: Wykrywanie tempa ubytku lasu w sąsiedztwie oraz prognoza, jak rozwinie się zabudowa w ciągu 5–10 lat.

---

## 3. Scenariusz Prezentacji przed Jury (3 Minuty / 180 Sekund)

* **0:00 – 0:40 [Haczyk i Życiowy Problem]**:
  * "Kiedy kupujemy samochód za 30 tysięcy, sprawdzamy go na stacji diagnostycznej, mierzymy lakier i sprawdzamy historię wypadkową. Kiedy kupujemy dom lub działkę za milion złotych... patrzymy na ładne zdjęcia na OtoDomie i wierzymy deweloperowi na słowo. Nie wiemy, czy grunt pod fundamentem nie osiada, czy po ulewach działki nie podmywa woda, a w glebie urosną choćby kwiaty."
* **0:40 – 1:30 [Nasze Rozwiązanie – Kosmiczny Audyt]**:
  * "Przedstawiamy **SpaceScore** – kosmiczny raport diagnostyczny działki zasilany radarami NASA i ESA: Sentinel-1 oraz nadchodzącą misją NISAR. 
  * Wpisujesz adres lub klikasz działkę na mapie. Zamiast zdjęć, dostajesz fizykę terenu:
    1. Indeks Podmycia (jak woda zachowywała się tu przez 10 lat),
    2. Stabilność Geodezyjną (czy grunt nie siada w milimetrach),
    3. Indeks Wilgotności Gleby z pasma L (czy gleba ma retencję pod zieleń)."
* **1:30 – 2:30 [Live Demo – Poznań i Aglomeracja]**:
  * "Zobaczmy to na żywo na przykładzie Poznania:
    * Wybieramy działkę w dolinie Warty lub w Dąbrówce.
    * Suwak czasu: widzimy, że po ulewach w 2020 roku woda stała tu przez 2 tygodnie.
    * Wykres stabilności: grunt osiada o 2 mm rocznie z powodu dawnych osadów rzecznych.
    * Dostępność: nasz model przewiduje również dynamikę cen i ubytek zieleni."
* **2:30 – 3:00 [Wdrożenie i Skalowalność]**:
  * "Nasz system to gotowa wtyczka B2B dla portali nieruchomości (OtoDOM), banków wydających kredyty hipoteczne i ubezpieczycieli. Działa globalnie dzięki otwartym danym NASA. Dziękujemy!"

---

## 4. Wykorzystane Źródła Danych

1. **Sentinel-1 (ESA/NASA)**: Archiwum 16 000+ scen dla Poznania (amplituda do wody i betonu, faza SLC do osiadania InSAR).
2. **NISAR / SAOCOM (NASA/CONAE)**: Pasmo L (24 cm) do badania wilgotności podglebia i retencji wodnej.
3. **Hydroportal (Wody Polskie)**: Mapy terenów zalewowych Warty.
4. **GUGiK (BDOT10k i LiDAR)**: Obrysy budynków, ukształtowanie terenu i numeryczny model terenu (NMT).
5. **NBP**: Kwartalne ceny mieszkań za m2 jako kontekst rynkowy.

