# Burza mózgów: jak wygrać „Dancing with the SARs”

> Propozycja do decyzji zespołu (sobota 14.11, 15:30). Nie zmienia `docs/PLAN.md`.
> Podstawa: cały kod w repo (commit `dd92539`), działająca aplikacja <https://poznan-trend-detective.web.app>,
> podsumowania z `progres/p1/` i dane sprawdzone 14.11 zapytaniami do ASF, CMR, GIBS i usług krajowych.

## 0. W skrócie

1. **Mamy już mocną aplikację.** Adres albo narysowany obszar → karta: zabudowa 1975–2035, las, cena m², wskaźnik ryzyka zabudowy, „przegląd techniczny terenu” w 7 punktach, testy trendów. Model ma test wsteczny, trendy są porównane ze stacją IMGW.
2. **Ale jest pod inne wyzwanie.** README i pitch zgłaszają ją do „Earth System Trend Detective”, a NISAR to tylko obrazek z GIBS i lista dat. W „Dancing with the SARs” dostalibyśmy za to niską ocenę Relevance.
3. **Propozycja:** zostajemy przy SARs i robimy z NISAR serce aplikacji: 4 analizy z prawdziwych pikseli (zmiany 2026, reakcja na deszcz, roślinność, koherencja). Historia, prognoza i upał zostają jako tło.
4. **Nasza historia na jury:** „Model z 50 lat Landsata wskazał, gdzie Poznań urośnie. NISAR widzi to w 2026. Urząd potwierdza to decyzjami budowlanymi.” Trzy niezależne źródła mówią to samo.
5. **Bramka w niedzielę o 12:00:** jeśli NISAR nie liczy się jeszcze w aplikacji, zgłaszamy obecną wersję do Trend Detective, do którego pasuje już dziś. Nic nie tracimy.

## 1. Stan repo: co mamy, czego brakuje

| Element | Stan | Luka → kryterium |
|---|---|---|
| Aplikacja: mapa, karta, rysowanie, PL/EN, telefon, link do miejsca | ✅ działa na Firebase | — |
| Model zabudowy (regresja logistyczna, 120 m) z testem 2015→2020 | ✅ AUC 0,986 na otwartym terenie, top-N 56,4% | — |
| Trendy MODIS (Mann-Kendall + Theil-Sen), walidacja ze stacją Ławica | ✅ r = 0,893 nocą | — |
| Pitch 7 slajdów (EN/PL) i scenariusz filmu 30 s | ✅ pod Trend Detective | trzeba przepisać pod NISAR → **Presentation, Relevance** |
| NISAR | ❌ kafle GIBS + 38 dat, zero obliczeń | **Relevance**: wymóg „NASA data integral” |
| Nazwa i wyzwanie w README | ❌ „Poznań Trend Detective” | **Relevance** |
| Odpowiedzi na pytania z treści wyzwania (polaryzacje, przyczyny fizyczne, przyszłe zastosowania) | ❌ brak | **Relevance, Presentation** |
| Ceny | 🟡 GUS, poziom powiatu | RCN daje transakcje z ceną i metrażem → **Impact** |
| Woda | 🟡 podtopienia PIG-PIB + zagłębienia z DEM | strefy ISOK + reakcja NISAR na deszcz → **Validity** |
| Ruchy gruntu | ❌ brak | EGMS z serwera PIG-PIB (bez konta) |
| Weryfikacja zmian radarowych | ❌ brak | 751 decyzji „nowa budowa” z WUIA w `progres/p1/dane/` → **Validity** |
| Dane aplikacji (`web/data/`, 11 MB) | ✅ od 15:30 w repo | aplikację da się odpalić lokalnie: `cd poznan-trend-detective/web && python3 -m http.server 8000` |
| Spot 16:9 z lektorem i napisami (`promo/`) | 🟡 w przygotowaniu | scenariusz pod Trend Detective; przy SARs trzeba przepisać pod NISAR → **Presentation** |

## 2. Decyzja: które wyzwanie

| | A. Dancing with the SARs | B. Earth System Trend Detective |
|---|---|---|
| Drużyny na świecie | 723 | 1 302 |
| Jak pasuje dziś | słabo: NISAR to tylko podgląd | dobrze: testy trendów to dokładnie treść wyzwania |
| Ile pracy do zgłoszenia | NISAR w pikselach (~10–14 h pracy osoby od SAR) + zmiany w UI i pitchu | poprawki i pitch |
| Atut | specjalista SAR w zespole, nowa misja (mało kto ma gotowe aplikacje), mniejsza konkurencja | gotowy produkt |
| Ryzyko | pliki 2 GB, konto Earthdata, nieznana struktura HDF5 | mocna konkurencja analityków danych |

**Rekomendacja: A z bramką.** Pracujemy pod SARs. W niedzielę o 12:00 sprawdzamy, czy w aplikacji są już co najmniej 2 warstwy liczone z NISAR i liczba z weryfikacji. Jeśli nie, zgłaszamy B. Przed decyzją sprawdźcie na stronie drużyny, do kiedy da się zmienić wyzwanie.

## 3. Produkt

- **Nazwa:** **SARnik** (szkic logo jest w `SARnik.pdf`; „SAR” + końcówka jak w „Sputnik”). Poznań to studium przypadku, a narzędzie działa wszędzie tam, gdzie lata NISAR.
- **Jedno zdanie:** „Przegląd techniczny terenu z radaru: wpisz adres i zobacz, co dzieje się z ziemią dziś, co działo się przez 50 lat i co ją czeka.”
- **EN:** *SARnik: a radar check-up for any piece of land. Check the land before you sign.*
- **Problem:** używany samochód za 30 tys. zł przechodzi przegląd, a działka za milion tylko „ładne zdjęcia” (zostawiamy hak z obecnego pitchu).
- **Dla kogo:** kupujący (przed podpisaniem), gminy (gdzie i co się buduje, gdzie znika zieleń), banki i ubezpieczyciele (ocena wielu działek naraz).
- **Co daje NISAR, czego nie da zdjęcie:** widzi przez chmury i nocą, wraca co 12 dni, pasmo L przenika korony drzew i reaguje na wilgotność gleby.

## 4. Jak to wygląda i działa

### 4.1 Ekran startowy

```
┌────────────────────────────────────────────────────────────────────┐
│ [🔍 Wpisz adres lub numer działki]  [✏️ rysuj] [⬠] [🗑]      [☰] [◐] │
│                                                                    │
│        MAPA: NISAR „taniec” nad Poznaniem (9 przelotów, play)      │
│        kolory: R = HH, G = HV, B = HH/HV                           │
│                                                                    │
│ ┌ Co widzi radar w 2026 ───────────┐                               │
│ │ 38 przelotów od 18.06 · co 12 dni │  [Jak widzi radar? →]         │
│ │ X ha zmian · Y miejsc podmokłych  │                               │
│ └───────────────────────────────────┘                               │
│ [▶] 1975 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●━━━━ 2026 ┆ 2030 ┆ 2035     │
│                         dane z pomiarów    radar   predykcja        │
└────────────────────────────────────────────────────────────────────┘
```

Zmiana względem dziś: na osi czasu pojawia się odcinek **„2026 · radar”** z kropkami przelotów. Gdy suwak na nim stoi, mapa pokazuje NISAR z danego dnia.

### 4.2 Karta miejsca (nowa kolejność)

```
┌ Bukowska 285, Poznań ──────────────────────── [link] ┐
│ RADAR NISAR · 2026 (NASA-ISRO, pasmo L, 20 m)          │
│ ● Zmiana powierzchni   wykryta ok. 05.09              │
│ ● Reakcja na deszcz    silna: grunt długo mokry       │
│ ● Roślinność (HV)      stabilna                        │
│ [wykres: HH i HV z 9 przelotów + słupki deszczu GPM]  │
│ „Model przewidział tu zabudowę i radar ją widzi” ✔     │
│──────────────────────────────────────────────────────│
│ HISTORIA I PROGNOZA (Landsat, model)   [jak dziś]      │
│──────────────────────────────────────────────────────│
│ PRZEGLĄD TECHNICZNY: 7 punktów + nowe:                 │
│   radar 2026 · reakcja na deszcz · strefa ISOK ·       │
│   ruch gruntu (EGMS) · decyzje budowlane obok          │
│ CENA: mediana zł/m² z transakcji w okolicy (RCN)       │
└──────────────────────────────────────────────────────┘
```

Wartości na makiecie są przykładowe. Każdy wiersz ma kolor (w normie, uwaga, ryzyko), jedno zdanie po ludzku i źródło.

### 4.3 Panel warstw pogrupowany w „tańce”

| Taniec | Warstwy |
|---|---|
| **Budowa** | NISAR zmiana 2026 · koherencja · zabudowa 1975–2035 (GHSL + model) · decyzje WUIA · Black Marble |
| **Woda** | reakcja na deszcz (NISAR) · woda z satelity (OPERA DSWx) · strefy ISOK · podtopienia PIG · poziom wody (DEM) |
| **Zieleń** | NISAR HV · zaburzenia roślinności (OPERA DIST) · wycinka 2001–2024 (GFC) · NDVI (MODIS) |
| **Grunt** | ruch gruntu (EGMS) · osuwiska (SOPO) · wysokość terenu |
| **Upał** | trendy dnia i nocy (MODIS) · ewentualnie ECOSTRESS 70 m |

### 4.4 Tryb „Jak widzi radar”
Przełącznik HH / HV / RGB i trzy rysunki: odbicie od powierzchni (woda, gładki grunt), podwójne odbicie (ściany budynków), rozproszenie objętościowe (korony drzew, uprawy). To bezpośrednia odpowiedź na pytanie wyzwania o polaryzacje.

### 4.5 Tryb „3 historie” (dla jury i filmu)
Przycisk przenosi na miejsce, włącza warstwy i pokazuje podpis:
1. **Nowe osiedle** (np. Skórzewo lub Dopiewo): model przewidział, NISAR widzi zmianę, jest decyzja WUIA.
2. **Dolina Warty:** teren „oddycha” po ulewach; reakcja na deszcz pokrywa się z podtopieniami PIG i strefą ISOK.
3. **Pola i las:** spadek HV po żniwach lub wycince, kontra stabilny las.

### 4.6 Porównanie (suwak przesuwny)
NISAR ↔ zdjęcie optyczne HLS z tego samego tygodnia ↔ ortofoto 2025. Pokazuje, że radar widzi to, czego nie widać na zdjęciu (np. wilgoć).

## 5. Co wyciągamy z danych NASA

| Dane NASA | Co liczymy / pokazujemy | Gdzie w aplikacji | Wysiłek | Priorytet |
|---|---|---|---|---|
| **NISAR GCOV** HH+HV, 20 m, 38 przelotów VI–X 2026 (provisional) | animacja RGB; zmiana „wczesne lato → jesień” (log-ratio); korelacja z deszczem → reakcja na deszcz; spadek HV → roślinność | mapa, karta, przegląd | duży | **MVP** |
| **NISAR GUNW** koherencja 12-dniowa, 80 m | spadek koherencji = prace ziemne, orka, budowa; przemieszczenie tylko jako eksperyment | warstwa Budowa | średni | High |
| **NISAR SME2** wilgotność gleby, 200 m | wilgotność w dniu przelotu; sprawdzenie „reakcji na deszcz” | wykres w karcie | mały | High |
| **GPM IMERG** dzienny deszcz (do 12.11.2026) | słupki deszczu przy przelotach; zastępuje Open-Meteo, żeby wszystko było z NASA | wykres w karcie | mały | **MVP** |
| **OPERA DSWx-S1 / DSWx-HLS** (kafle GIBS) | woda widziana z satelity | warstwa Woda | mały (kafle) | **MVP** |
| **OPERA DIST-ALERT** (kafle GIBS) | zaburzenia roślinności 2023–2026 | warstwa Zieleń | mały | High |
| **HLS L30/S30** (kafle GIBS) | zdjęcie optyczne do porównania | suwak porównania | mały | High |
| **VIIRS Black Marble** (kafle GIBS, roczne VNP46A4 do 2025) | światła nocne jako znak rozwoju | warstwa Budowa | mały | Stretch |
| MODIS LST/NDVI, Landsat (GHSL, GFC), NASA POWER | ✅ już w aplikacji | — | — | — |
| **ECOSTRESS LST**, 70 m (do 10.11.2026) | upał na poziomie osiedla zamiast 1 km | warstwa Upał | średni | Stretch |
| **ALOS PALSAR** 2007–10 (ASF) i mozaiki 2015–21 | „wehikuł czasu” w paśmie L: 2007 → 2026 | oś czasu, Story | średni | Stretch (mocna historia) |
| **NASADEM** (SRTM 2000, radar NASA) | wysokość terenu z radaru NASA zamiast TanDEM-X | suwak wody | mały | Stretch |
| ICESat-2 ATL08 (120 granul nad AOI) | wysokość koron wzdłuż ścieżek | — | średni | odpuszczamy |
| GEDI | **brak nad Poznaniem** (zasięg do 51,6° N), sprawdzone w CMR | wspomnieć w README | — | — |

## 6. Wszystkie pomysły z burzy

**Robimy (✅):**
- **„Prognoza spotyka radar”:** komórki, które model wskazał na 2025–2030, a NISAR widzi w nich zmianę w 2026. Jedna liczba: ile razy częściej radar widzi zmianę w komórkach z wysokim ryzykiem niż w pozostałych.
- **Zmiany 2026 a decyzje WUIA:** procent działek z decyzją „nowa budowa”, na których radar widzi zmianę, w porównaniu z losowymi działkami bez decyzji.
- **„Taniec terenu”:** animacja NISAR z 9 przelotów orbity 158 z licznikiem dat i deszczu.
- **Reakcja na deszcz** jako nowy punkt przeglądu (podmokłość), sprawdzona na obszarach podtopień PIG i strefach ISOK.
- **Tryb „Jak widzi radar”** i **„3 historie”**.
- **Kafle GIBS:** OPERA woda i zaburzenia, HLS. Szybki zysk w kryterium Best Use of Data.
- **Nazwa SARnik**, nowy README, pitch i film pod NISAR.

**Jeśli zostanie czas (🟡):**
- Ceny z RCN: mediana zł/m² i trend dla okolicy (tylko agregaty, bez nazwisk notariuszy).
- EGMS (PIG 2016–2020, bez konta) i strefa ISOK w przeglądzie.
- Warta na żywo z API IMGW obok suwaka poziomu wody.
- „Do sprawdzenia dla gminy”: zmiany widziane przez radar bez decyzji w rejestrze (słowo „samowola” odpada).
- Porównanie dwóch miejsc obok siebie.
- Wehikuł czasu ALOS PALSAR 2007 → NISAR 2026.
- Kalendarz żniw na polach w trybie „3 historie”.

**Odpuszczamy (❌):** pojedyncze budynki (piksel 20 m), Otodom, prognoza cen, osiadanie z NISAR jako wynik (4 miesiące danych to za mało), raport PDF, powiadomienia „obserwuj miejsce” (najwyżej jako makieta w pitchu).

## 7. Kryteria oceny → co jury musi zobaczyć

| Kryterium | Co jury ma zobaczyć | Co dowozimy | Stan |
|---|---|---|---|
| **Impact** | realny problem i konkretni użytkownicy | przegląd terenu przed zakupem; gminy; liczby z Poznania (zabudowa 5,49% → 11,82% w latach 1990–2020, Dopiewo +242% mieszkańców) | ✅ z aplikacji |
| **Creativity** | coś, czego nie robi nikt inny | NISAR w aplikacji dla zwykłego człowieka; „prognoza spotyka radar”; reakcja na deszcz; „taniec terenu” | do zrobienia |
| **Validity** | nauka i liczby, które da się sprawdzić | test wsteczny modelu; zmiany NISAR a decyzje WUIA; reakcja na deszcz a PIG/ISOK; MODIS a IMGW; jawne ograniczenia; nie mieszamy wersji danych | częściowo |
| **Relevance** | NISAR jako rdzeń i odpowiedź na treść wyzwania | 4 analizy NISAR, HH/HV wyjaśnione, sekcja z odpowiedziami na pytania wyzwania | do zrobienia |
| **Presentation** | jasna historia, dobre demo, strona projektu | film 30 s od „tańca” NISAR; 7 slajdów; strona po angielsku; tryb „3 historie” | do przepisania |

## 8. Pytania z treści wyzwania → nasze odpowiedzi (na stronę projektu)

| Pytanie wyzwania | Nasza odpowiedź |
|---|---|
| Obszar i osobisty kontekst | Poznań i 17 gmin wokół: nasze miasto, które się rozlewa (ludzie przenoszą się do gmin), z doliną Warty i lasami pod presją |
| Dane | NISAR GCOV, GUNW, SME2 (wersja provisional, 17.06–23.10.2026), do tego warstwy optyczne (HLS) i GIS (Geopoz, PIG, ISOK) |
| Które polaryzacje pokazują zmiany | HH: powierzchnia i podwójne odbicie (budynki, zalana roślinność); HV: rozproszenie objętościowe (korony, uprawy). Stosunek HH/HV odróżnia zabudowę od lasu |
| Fizyczne przyczyny tego, co widać | deszcz podnosi stałą dielektryczną gleby, więc HH rośnie; nowe ściany dają podwójne odbicie; żniwa i wycinka obniżają HV; prace ziemne obniżają koherencję |
| Czego nie widać i dlaczego | osiadania w Poznaniu (milimetry na rok, za krótki szereg), pojedynczych domów (20 m) |
| Przyszłe zastosowania NISAR | monitoring zabudowy dla gmin, wczesne ostrzeganie o podtopieniach, kontrola wycinki, rolnictwo, ubezpieczenia; po kilku latach danych także ruchy gruntu |

## 9. Plan pracy do niedzieli 23:59

### 9.1 Priorytety

| Priorytet | Zakres |
|---|---|
| **MVP** | NISAR GCOV z orbity 158: animacja i zmiana 2026 w aplikacji; sekcja „Radar NISAR” w karcie z wykresem i deszczem GPM; weryfikacja z WUIA (1 liczba); kafle OPERA DSWx; tryb „Jak widzi radar”; nazwa SARnik, README, pitch i film pod SARs |
| **High** | reakcja na deszcz z weryfikacją PIG/ISOK; koherencja GUNW; „prognoza spotyka radar”; orbita 8 (druga geometria); OPERA DIST i HLS; tryb „3 historie” |
| **Stretch** | RCN, EGMS, ISOK w przeglądzie, ALOS 2007, ECOSTRESS, Black Marble, porównanie dwóch miejsc |

### 9.2 Role (imiona do wpisania przez zespół)

| Rola | Zadania | Kto? |
|---|---|---|
| R1 SAR | NISAR: pobranie, wycinek, dB, animacja, zmiana, reakcja na deszcz, koherencja | propozycja: osoba z doświadczeniem SAR |
| R2 Pipeline | konto Earthdata, pobieranie (orbita 158: 9 dat, 10 plików, ok. 21 GB), eksport do siatki aplikacji (`web/data/land/`) | |
| R3 Frontend | sekcja NISAR w karcie, odcinek „2026 · radar” na osi czasu, warstwy GIBS, tryby „Jak widzi radar” i „3 historie”, rebranding | autor obecnej aplikacji |
| R4 Weryfikacja | WUIA vs radar, „prognoza spotyka radar”, reakcja na deszcz vs PIG/ISOK, liczby do pitchu | |
| R5 Dane dodatkowe | GPM, RCN, EGMS, ISOK GetFeatureInfo, IMGW | |
| R6 Pitch | strona projektu (EN), 7 slajdów, film 30 s, ujawnienie SI, bibliografia, wersja PL na event lokalny | |

### 9.3 Harmonogram

| Kiedy | Kamień milowy |
|---|---|
| sob 15:30–16:30 | decyzja: wyzwanie, nazwa, role; konta Earthdata; start pobierania orbity 158 |
| sob 16:30–20:00 | **spike R1:** jeden plik GCOV → wycinek Poznania → HH/HV w dB na mapie aplikacji. R3: kafle GIBS i szkielet sekcji NISAR. R4/R5: GPM i dane do weryfikacji |
| sob 20:00–02:00 | szereg 9 przelotów orbity 158, zmiana 2026, animacja; pierwsza wersja na Firebase |
| ndz 08:00–12:00 | reakcja na deszcz, koherencja, liczby weryfikacji; **12:00 bramka: SARs czy Trend Detective** |
| ndz 12:00–16:00 | „3 historie”, przegląd w karcie, poprawki; **16:00 zamrożenie funkcji** |
| ndz 16:00–20:00 | film 30 s, slajdy, strona projektu, README; **20:00 wersja robocza zgłoszenia** |
| ndz 20:00–23:00 | poprawki tekstów, test na telefonach; **23:00 ostateczne zgłoszenie** |

### 9.4 Start dla R1: NISAR w Pythonie
- Pliki: lista z linkami i pogodą w [`progres/p1/dane/nisar_poznan_przeloty.csv`](../progres/p1/dane/nisar_poznan_przeloty.csv). Bierzemy tylko wersję **provisional** (17.06–23.10.2026; na orbicie 158 to 9 dat od 25.06 do 11.10); nie mieszamy z beta i validated.
- Dostęp: `~/.netrc` z kontem Earthdata, potem `earthaccess` albo `asf_search`. GDAL `/vsicurl/` pozwala wyciąć fragment bez pobierania całego pliku.
- Ścieżki w HDF5 (dokumentacja ASF): `/science/LSAR/GCOV/grids/frequencyA/HHHH` i `HVHV`, wartości gamma-0 w mocy (dB = 10·log10). Piksel 20 m, układ UTM; współrzędne i EPSG sprawdzić w pliku (`h5ls -r`).
- Kolejność: wycinek AOI → dB → filtr wieloczasowy (mediana 3 dat) → przeskalowanie do siatki aplikacji 120 m (EPSG:3857, jak `land.json`) + wersja 40 m do podglądu → PNG w odcieniach szarości (ten sam format co inne warstwy aplikacji).
- Pary sucho/mokro do pierwszego testu: orbita 158, 25.06 (wilgotność 0,089) i 24.08 (0,302).

## 10. Ryzyka i plan B

| Ryzyko | Plan B |
|---|---|
| Wolne pobieranie (2 GB na plik) | wycinek przez `/vsicurl/`; jedna orbita zamiast czterech; VM w Google Cloud |
| Nieznana struktura HDF5 | spike z limitem 3 h; dokumentacja ASF; tutorial CSA z zasobów wyzwania |
| Reakcja na deszcz nie wychodzi (roślinność zagłusza) | pokazujemy ją tylko na otwartym gruncie albo odpuszczamy; zostaje zmiana i HV |
| Weryfikacja WUIA wychodzi słabo | pokazujemy uczciwie i tłumaczymy (decyzja ≠ start budowy) |
| Brak NISAR w aplikacji do niedzieli 12:00 | zgłoszenie do Trend Detective z obecną aplikacją |
| Rozjazd liczb w pitchu i aplikacji | liczby czytane z plików danych, jak w obecnym `PITCH.md` |

## 11. Lista kontrolna zgłoszenia
- [ ] Wybrane wyzwanie zgodne z README, stroną projektu i filmem
- [ ] Strona projektu po angielsku z sekcją odpowiedzi na pytania wyzwania (rozdział 8)
- [ ] Film do 30 s **albo** do 7 slajdów (przekroczenie wyklucza z oceny globalnej)
- [ ] Publiczny link do aplikacji i repozytorium, bez logowania
- [ ] Lista danych NASA i pozostałych źródeł z licencjami
- [ ] Ujawnienie użycia SI; obrazy wygenerowane przez SI ze znakiem wodnym
- [ ] Brak osób poniżej 18 lat w materiałach
- [ ] Wersja robocza wysłana do 20:00, ostateczna do 23:00
