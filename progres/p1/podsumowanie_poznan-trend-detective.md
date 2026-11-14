# Poznań Trend Detective: podsumowanie (NASA Space Apps 2026)

**Aplikacja:** <https://poznan-trend-detective.web.app> (działa na komputerze i telefonie)

**W jednym zdaniu:** „przegląd techniczny działki z kosmosu”. Wpisujesz adres albo rysujesz obszar na mapie i dostajesz kartę: ile zabudowano tu od 1975 roku, jaka jest szansa, że wolny teren obok zostanie zabudowany, ile wycięto lasu, czy lata są coraz gorętsze, czy miejsce leży w zagłębieniu terenu albo w strefie podtopień, ile kosztuje m² i ile to pensji.

## 1. Co zrobiłem

- **Gotowa aplikacja:** mapa w stylu Otodom/Geoportal z makiety zespołu (karta „Zaznaczony obszar”, panel „Ustawienia mapy” z suwakami, oś czasu „Dane z pomiarów | Dziś | Predykcja”). Obszar: Poznań + 17 gmin powiatu poznańskiego. Do tego tryb jasny/ciemny, PL/EN i link do konkretnego miejsca.
- **Pipeline danych w Pythonie:** pobiera wszystko anonimowo, bez kont, i liczy dane od zera w 40–60 minut.
- **Model prognozy zabudowy z testem wstecznym** (opis krok po kroku w 1.1).
- **Testy trendów** (Mann-Kendall + Theil-Sen) dla temperatur, zieleni i wycinki, porównane z naziemną stacją IMGW.
- **Rysowanie obszaru** (odręczne i wielokąt) naprawione 14.11, działa myszą i dotykiem.

| Wynik | Wartość |
|---|---|
| Zabudowa, cały obszar | 4,3% (1975) → 11,8% (2020) → prognoza 15,7% (2035) |
| Zabudowa, miasto Poznań | 22,0% (1975) → 37,5% (2020) |
| Utrata lasu 2001–2024 | przyspiesza: +100 ha rocznej wycinki na każdą dekadę (p = 0,0008) |
| Letnie noce (MODIS) | 94,5% z 2517 kwadratów 1 km istotnie się ociepla; Poznań +0,85 °C na dekadę (p = 0,005) |
| Satelita a stacja IMGW Ławica | noc vs Tmin r = 0,893; dzień vs Tmax r = 0,796 (24 lata) |
| NISAR nad Poznaniem | 38 dni z przelotami GCOV, 18.06–29.10.2026 |

### 1.1 Jak nauczyłem model przewidywać zabudowę

**Krok 1. Z czego się uczy.** Mapa zabudowy JRC GHSL (z Landsata i Sentinela-2) co 5 lat, 1975–2020. Przeliczyłem ją na siatkę 120 m (w terenie ok. 73 m, ok. 0,54 ha na komórkę). Komórka jest „zabudowana”, gdy budynki pokrywają co najmniej 15% jej powierzchni. Komórka to więc kawałek osiedla, a nie pojedynczy dom.

**Krok 2. Co przewiduje.** Jedno pytanie dla każdej niezabudowanej komórki: czy w ciągu 5 lat stanie się zabudowana? Odpowiedź to prawdopodobieństwo od 0 do 1.

**Krok 3. Na podstawie czego (9 cech).** Do modelu wchodzą wartości z początku każdego okresu. Współczynniki są ze standaryzowanych cech, więc ich wielkość można porównywać.

| Cecha | Źródło | Współczynnik | Co to znaczy |
|---|---|---|---|
| udział zabudowy w samej komórce | GHSL | **+2,28** | najsilniejszy sygnał: częściowo zabudowane komórki się dopełniają |
| pokrycie drzewami w 2000 | Hansen GFC | **−0,87** | las mocno chroni przed zabudową |
| nachylenie terenu | Copernicus DEM (radar TanDEM-X) | **−0,31** | na stokach buduje się rzadziej |
| odległość do głównej drogi (log) | OpenStreetMap | **−0,16** | bliżej drogi, większa szansa |
| odległość do Starego Rynku (log) | – | +0,08 | lekko częściej dalej od centrum (suburbanizacja) |
| zabudowa w promieniu ~360 m / ~1,1 km / ~2,5 km | GHSL | +0,06 / −0,08 / +0,04 | słabe, bo te cechy są ze sobą powiązane; nie interpretujemy ich osobno |
| wysokość terenu | Copernicus DEM | +0,03 | praktycznie bez znaczenia |

**Krok 4. Uczenie.** Regresja logistyczna (metoda Newtona-Raphsona z małą karą L2), napisana od zera w NumPy. Model uczy się na przejściach 2005→2010 i 2010→2015. Wybrałem prosty, przejrzysty model zamiast „czarnej skrzynki”, bo każdą liczbę da się wytłumaczyć jury i kupującemu działkę.

**Krok 5. Test wsteczny.** Model nie widział przejścia 2015→2020. Na nim sprawdziłem, czy dobrze przewiduje przyszłość:

| Miara | Wynik | Jak czytać |
|---|---|---|
| AUC, wszystkie komórki | 0,987 | dobrze układa ranking, ale ta liczba jest zawyżona przez komórki już prawie zabudowane |
| AUC, sam otwarty teren (< 5% zabudowy w 2015) | **0,986** | trudniejszy, uczciwszy test; prosty wskaźnik „ile zabudowy w promieniu 1 km” daje tu tylko 0,901 |
| Trafność top-N | **56,4%** | gdy wskażemy tyle komórek, ile naprawdę zabudowano (5379), trafiamy w ponad połowę |
| Figure of Merit | **≈ 39%** | standardowa miara modeli zmian terenu, policzona z trafności top-N; podsumowanie zespołu podaje 10–40% jako realny zakres |
| Trafność top-N, sam otwarty teren | 1,3% (76 zdarzeń) | zabudowa „w szczerym polu” jest bardzo rzadka; model wskaże okolicę, ale nie konkretną działkę |

**Krok 6. Prognoza 2025, 2030, 2035.** Uczę model jeszcze raz, na wszystkich trzech okresach. Potem w każdym 5-letnim kroku:
1. liczę prawdopodobieństwo dla każdej wolnej komórki;
2. zabudowuję tyle komórek, ile średnio zabudowywano w latach 2010–2020 (5188 komórek, ok. 2781 ha na 5 lat), zaczynając od najbardziej prawdopodobnych;
3. nowe komórki dostają typowy poziom zabudowy (16,8%) i liczę wszystko od nowa, więc sąsiedztwo rośnie razem z miastem.

„Dziś” (2025) to już wynik modelu, bo GHSL kończy pomiary na 2020.

**Krok 7. Co z tego widać w aplikacji.**
- Warstwa „gdzie miasto urośnie” z suwakiem minimalnej szansy.
- **Wskaźnik ryzyka zabudowy** na karcie. To średnia 5-letnia szansa zabudowy wolnego terenu w zaznaczeniu, na skali logarytmicznej: 0,1% → 0 pkt, 30% → 100 pkt. Poziomy: niskie poniżej 0,5%, umiarkowane do 2%, podwyższone do 5%, wysokie do 15%, bardzo wysokie powyżej. Skala jest absolutna: zwykły ranking procentowy nazywałby 0,5% „bardzo wysokim”, bo prawie cały otwarty teren ma szansę bliską zera.
- **Lista kontrolna „przeglądu technicznego”:** zabudowa wokół, wolny teren obok, wycięte drzewa, upał w dzień, strefa podtopień PIG-PIB, zagłębienie terenu, zmiany w radarze Sentinel-1.

**Krok 8. Czego model nie wie.** Planów miejscowych, nowych dróg, cen ani decyzji gmin. Zakłada, że najbliższe lata będą jak 2010–2020. Dlatego w aplikacji prognoza jest fioletowa i podpisana jako scenariusz.

### 1.2 Trendy temperatur i zieleni

- NASA MODIS Terra: temperatura powierzchni (1 km, dzień i noc) i zieleń NDVI (250 m). Z każdego roku 2000–2024 biorę średnią z czerwca–sierpnia.
- Dla każdego kwadratu: test Manna-Kendalla (dwustronny, α = 0,05) i nachylenie Theila-Sena na dekadę. Kod w `pipeline/trend.py`, w aplikacji przepisany do JS; wyniki zgadzają się z SciPy co do ostatniej cyfry.
- Satelita mierzy dachy i grunt, nie powietrze. Dlatego porównałem go ze stacją IMGW Ławica (r = 0,89 nocą).

## 2. Dane i źródła

| Nazwa | Do czego | Link |
|---|---|---|
| NASA MODIS MOD11A2 / MOD13Q1 v061 | temperatura powierzchni dzień/noc, zieleń 2000–2024 | [LP DAAC](https://lpdaac.usgs.gov/products/mod11a2v061/) |
| NASA-ISRO NISAR GCOV | mozaiki radarowe i daty przelotów 2026 | [ASF](https://search.asf.alaska.edu/), [GIBS](https://nasa-gibs.github.io/gibs-api-docs/) |
| NASA POWER | walidacja temperatur | [power.larc.nasa.gov](https://power.larc.nasa.gov/) |
| JRC GHSL GHS-BUILT-S R2023A | zabudowa 1975–2020 co 5 lat (uczenie modelu) | [GHSL](https://human-settlement.emergency.copernicus.eu/) |
| Hansen/UMD Global Forest Change v1.12 | las w 2000 i wycinka 2001–2024 | [GFC](https://glad.earthengine.app/view/global-forest-change) |
| Copernicus DEM GLO-30, Sentinel-1 RTC | wysokość i nachylenie terenu, zmiany radarowe 2017–2024 | [Planetary Computer](https://planetarycomputer.microsoft.com/) |
| OpenStreetMap (Overpass) | główne drogi (cecha modelu) | [overpass-api.de](https://overpass-api.de/) |
| IMGW-PIB | stacja Poznań-Ławica | [danepubliczne.imgw.pl](https://danepubliczne.imgw.pl/) |
| GUS BDL | ceny m², płace, ludność, mieszkania | [bdl.stat.gov.pl](https://bdl.stat.gov.pl/) |
| PIG-PIB | obszary zagrożone podtopieniami | [cbdgmapa.pgi.gov.pl](https://cbdgmapa.pgi.gov.pl/arcgis/rest/services/hydrogeologia/podtopienia/MapServer) |
| Geoportal, GEOPOZ, OpenFreeMap, Nominatim | ortofoto (Polska, Poznań 1940 i 2025), podkład mapy, wyszukiwarka adresów | [geoportal.gov.pl](https://www.geoportal.gov.pl/), [openfreemap.org](https://openfreemap.org/) |

## 3. Pliki

| Ścieżka | Opis |
|---|---|
| [web/](../../poznan-trend-detective/web/) | aplikacja: [index.html](../../poznan-trend-detective/web/index.html), [app.js](../../poznan-trend-detective/web/app.js) (mapa, karta, rysowanie), [i18n.js](../../poznan-trend-detective/web/i18n.js) (PL/EN), [styles.css](../../poznan-trend-detective/web/styles.css) |
| [web/data/](../../poznan-trend-detective/web/data/) | gotowe dane dla aplikacji (JSON, GeoJSON, warstwy PNG 120 m), ok. 12 MB |
| [pipeline/run_all.sh](../../poznan-trend-detective/pipeline/run_all.sh) | odtwarza wszystkie dane od zera |
| [pipeline/fetch_*.py](../../poznan-trend-detective/pipeline/) | pobieranie: MODIS, IMGW/POWER/GUS, GHSL/las/DEM/Sentinel-1/drogi/ceny, las 30 m, podtopienia |
| [pipeline/model_urban.py](../../poznan-trend-detective/pipeline/model_urban.py) | model zabudowy, test wsteczny i prognoza 2025–2035 (opis w 1.1) |
| [pipeline/analyze.py](../../poznan-trend-detective/pipeline/analyze.py), [trend.py](../../poznan-trend-detective/pipeline/trend.py) | trendy temperatur i zieleni, walidacja, testy statystyczne |
| [README.md](../../poznan-trend-detective/README.md) | opis projektu, metody, ograniczenia i źródła (EN) |
| [docs/PITCH.md](../../poznan-trend-detective/docs/PITCH.md), [PITCH_PL.md](../../poznan-trend-detective/docs/PITCH_PL.md), [VIDEO_30S.md](../../poznan-trend-detective/docs/VIDEO_30S.md) | prezentacja EN/PL i scenariusz filmu 30 s |
| [docs/DESIGN.md](../../poznan-trend-detective/docs/DESIGN.md) | zasady wyglądu aplikacji |
| [firebase.json](../../poznan-trend-detective/firebase.json), [.gitignore](../../poznan-trend-detective/.gitignore) | hosting; `.gitignore` pilnuje, żeby klucze API i surowe dane nie trafiły na GitHub |

## 4. Problemy i ograniczenia

- Trendy temperatur kończą się na 2024: w użytym mirrorze MODIS brakuje plików z lipca–listopada 2025.
- Siatka 120 m pokazuje osiedla i ulice, a nie pojedyncze domy. GHSL ma pomiary co 5 lat, do 2020.
- Ceny m² mamy tylko dla powiatu (GUS), nie dla adresu. Otodomu nie pobieramy (regulamin, blokada 403).
- Prognoza nie zna planów miejscowych ani nowych dróg, a konkretnej działki w szczerym polu nie wskaże (1,3%).
- NISAR jest tylko podglądem (mozaiki GIBS + daty przelotów). Nie liczymy jeszcze nic z jego pikseli.
- Przegląd kodu z 14.11 wskazał 16 błędów. Poprawione i wdrożone: karta dla każdego roku (nie tylko co 5), wycinka liczona narastająco (wcześniej zaniżona, np. do 2005: 545 zamiast 872 ha), zmiana zabudowy w punktach procentowych zamiast „+5000%”, suwak wysokości do 164 m, wyciek mapy przy przełączaniu motywu, pamięć przy suwaku szansy, układ na telefonie i tablecie.
- Wycinkę dla lat pośrednich interpolujemy między stanami z lat 2005, 2010, 2015, 2020 i 2024 (różnica do pipeline'u poniżej 1%).

## 5. Jak to się łączy z planem zespołu (repo NASA-SpaceWalkers)

| Temat w [PLAN.md](https://github.com/MichallMaciek/NASA-SpaceWalkers/blob/main/docs/PLAN.md) | Stan u nas | Wniosek |
|---|---|---|
| Wyzwanie: *Dancing with the SARs* | README podaje *Trend Detective* + NISAR jako dodatek | ustalić jedno; jeśli SARs, to NISAR musi być rdzeniem, nie podglądem |
| Obszar D1: Poznań + 11 gmin + Puszczykowo (≈ 1380 km²) | Poznań + 17 gmin powiatu, czyli ich obszar plus więcej | łatwo przyciąć do D1 |
| O2: siatka / jednostka analizy | gotowa siatka 120 m, wszystkie warstwy na niej | może zamknąć O2 |
| Prognoza z backtestem (LightGBM) | regresja logistyczna, backtest 2015→2020, FoM ≈ 39% | gotowy punkt odniesienia; można porównać z prognozą GHSL 2030 |
| O1: ceny | GUS, poziom powiatu | RCN (WFS geoportalu, ~76 tys. transakcji z ceną, metrażem i datą) da ceny dla miejsca; publikować tylko agregaty |
| Ryzyka: woda, ruchy gruntu | podtopienia PIG-PIB | dodać EGMS 2016–2020 z tego samego serwera PIG-PIB (bez konta) i strefy powodziowe ISOK |
| Walidacja zmian | – | 751 decyzji WUIA na nową budowę (VI–XI 2026) w repo zespołu do sprawdzenia modelu i radaru |
| NISAR: wersje danych | daty z ASF od 17.06.2026 (38, zgodne z listą zespołu) | GCOV nad Polską ma 20 m; od 21.10.2026 dane „validated”, nie mieszać wersji |

## 6. Następne kroki

- [ ] Ustalić z zespołem wyzwanie i obszar (tabela w sekcji 5)
- [ ] Podpiąć pliki NISAR GCOV (HH/HV, para sucho/mokro z listy zespołu), jeśli zostajemy przy *Dancing with the SARs*
- [ ] Ceny z RCN zamiast powiatowych (tylko agregaty)
- [ ] Warstwa ruchów gruntu EGMS (PIG-PIB) i strefy powodziowe ISOK w przeglądzie działki
- [ ] Prezentacja (≤ 7 slajdów) lub film (≤ 30 s) po angielsku na bazie `docs/`, z odpowiedziami na pytania wyzwania
- [ ] Spot 16:9 z lektorem (folder `promo/`, w przygotowaniu)
- [ ] Przetestować aplikację na telefonach całego zespołu
- [ ] Wysłać zgłoszenie do niedzieli 15.11, 23:59
