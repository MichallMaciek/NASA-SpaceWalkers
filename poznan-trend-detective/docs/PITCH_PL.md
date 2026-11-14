# Poznań Trend Detective: prezentacja (wersja polska)

NASA Space Apps Challenge 2026, wyzwanie *Be An Earth System Trend Detective* (radar NISAR z wyzwania *Dancing with the SARs*).
Siedem slajdów, 16:9, na lokalne wydarzenie. Wersja angielska do zgłoszenia: `docs/PITCH.md`, tam też tabela źródeł każdej liczby.

Kryteria oceny (każde 1–5): Wpływ (Impact), Kreatywność (Creativity), Rzetelność (Validity), Związek z danymi NASA (Relevance), Prezentacja (Presentation).
Zrzuty ekranu róbcie z interfejsem po polsku (domyślny język aplikacji).

Hak ze slajdu 1 to oryginalne słowa zespołu (w notatkach do slajdu 1).

---

## Slajd 1. Nikt nie prześwietla terenu

**Na slajdzie**

> Używane auto za 30 000 zł: sprawdzasz lakier, ramę i wycieki.
> Dom albo działka za 1 000 000 zł: ładne zdjęcia.
> **Nikt nie prześwietla terenu.**

Stopka: Poznań Trend Detective · NASA Space Apps 2026

**Wizualizacja.** Dwie połowy. Z lewej: własne zdjęcie miernika grubości lakieru na drzwiach auta (bez logotypów). Z prawej: lista „Przegląd techniczny terenu” z aplikacji dla adresu w Dopiewie, z kolorowymi kropkami.

**Notatki.** „Gdy kupujesz używany samochód za 30 tysięcy, jedziesz na stację diagnostyczną: mierzysz grubość lakieru, sprawdzasz geometrię ramy i wycieki oleju. Gdy kupujesz dom lub działkę za 1 000 000 zł... oglądasz ładne zdjęcia na OtoDomie i wierzysz deweloperowi na słowo! Nikt nie robi technicznego prześwietlenia terenu!” My zrobiliśmy je z danych satelitarnych.

*Źródła:* hak zespołu. Kwoty 30 000 zł i 1 000 000 zł są poglądowe, to nie dane.

**Kryteria:** Wpływ, Prezentacja. Każdy, kto kupował auto albo mieszkanie, rozumie problem w pięć sekund.

---

## Slajd 2. Poznań rozlewa się na zewnątrz

**Na slajdzie**

> Zabudowa wokół Poznania: **5,49% → 11,82%** powierzchni (1990–2020)
> Poznań: **−7,9%** mieszkańców od 2000 r.
> Dopiewo, Rokietnica, Komorniki: **ponad +200%**
> **6218 ha** pokrycia drzewami ubyło od 2001 r.

**Wizualizacja.** Dwa zrzuty tego samego kadru, warstwa Urbanizacja i granice gmin włączone: oś czasu na 1990 i na 2020. Podpiszcie Poznań i trzy gminy zmianą liczby mieszkańców.

**Notatki.** W 18 gminach, które badamy, zabudowa zajmowała w 1990 r. 5,49% powierzchni, a w 2020 r. już 11,82%, czyli ponad dwa razy więcej. Ludzie wyprowadzają się za miasto: Poznań stracił od 2000 r. 7,9% mieszkańców, a Dopiewo, Rokietnica i Komorniki urosły o ponad 200%. Od 2001 r. ubyło 6218 ha pokrycia drzewami, a roczna wycinka rośnie.

*Źródła:* `land.json` `study_built_share_pct` 1990 = 5,49, 2020 = 11,82 (JRC GHSL z Landsata; komórka 120 m liczy się jako zabudowana od 15% powierzchni zabudowanej). `study.json` `areas[]` (GUS BDL): Poznań 582 254 → 536 151, `pop_change_pct_2000_2024` = −7,9; Dopiewo +242,0, Rokietnica +221,2, Komorniki +217,5. Drzewa: suma `land.json` `municipalities[*].forest_loss_total_ha` = 6218 ha (Hansen/UMD GFC v1.12, Landsat); `forest_loss_trend` +99,8 ha na dekadę, p = 0,0008. Na pytania: GFC liczy każdą utratę pokrycia drzewami, także zręby w lasach gospodarczych. Najwięcej ubyło w gminach leśnych (Murowana Goślina 1070 ha, Kórnik 1039, Mosina 857), więc nie mówcie, że wszystko poszło pod zabudowę.

**Kryteria:** Wpływ, Rzetelność. Problem w zmierzonych, lokalnych liczbach.

---

## Slajd 3. Jeden adres, jeden przegląd

**Na slajdzie**

> Wpisz adres albo obrysuj działkę.
> Jedna karta: zabudowa, wolny teren obok, drzewa, upał, wody gruntowe, obniżenia terenu, radar i cena za m².

**Wizualizacja.** Cały ekran aplikacji z wybranym adresem w Dopiewie: przerywany okrąg 1 km, warstwa Urbanizacja, oś czasu na 2020. Na karcie widać wiersze Zabudowa, Las i Cena za m², mały wykres zabudowy, wskaźnik ryzyka zabudowy i „Przegląd techniczny terenu”.

**Notatki.** To jest nasz produkt. Wpisujesz adres w Dopiewie albo obrysowujesz pole narzędziem do rysowania. Karta pokazuje zabudowę w promieniu kilometra od 1975 r., wycinkę od 2001 r., cenę metra w powiecie, wskaźnik ryzyka zabudowy i przegląd techniczny punkt po punkcie, jak na stacji diagnostycznej. Jeden przycisk otwiera pełny test trendu. Oś czasu przesuwa wszystkie warstwy.

*Źródła:* `web/i18n.js` (`ui.chk`, `ui.riskTitle`), `web/app.js` `renderCard()` i `inspectionHTML()`. Punkty przeglądu w obecnej wersji: zabudowa wokół, wolny teren obok, wycinka drzew, upał w dzień, woda gruntowa (obszary podtopień PIG-PIB), ukształtowanie terenu (obniżenia z DEM, link do mapy ISOK), zmiany na gruncie (radar). Stopka karty: przegląd nie zastępuje planu miejscowego (MPZP), mapy powodziowej ISOK ani badań gruntu.

**Kryteria:** Kreatywność, Prezentacja. Przegląd jak dla auta, tylko dla terenu, na jednej karcie.

---

## Slajd 4. Dane NASA, sprawdzone trendy

**Na slajdzie**

> Letnie noce ociepliły się istotnie w **94,5%** z 2517 kwadratów 1 km. Żaden się nie ochłodził.
> Satelita a termometr na Ławicy: **r = 0,893**
> NASA MODIS · Landsat · NISAR

**Wizualizacja.** Z lewej: warstwa „Letnie noce: trend” na całym obszarze (ciepłe kolory, szary = brak istotnego trendu, nigdzie niebieskiego). Z prawej: okno testu trendu dla kwadratu nad stacją Ławica (przerywana linia Theila-Sena, S, z i p Manna-Kendalla). Pasek na dole: warstwa NISAR z suwakiem przelotów.

**Notatki.** Ciepło i zieleń mierzy satelita NASA MODIS Terra, lata 2000–2024. Dla każdego kwadratu liczymy nachylenie Theila-Sena i test Manna-Kendalla; kolor oznacza p poniżej 0,05, szary to brak dowodu. Nad Ławicą noce z satelity idą w parze z minimum na stacji: r = 0,893 w 24 latach. Landsat daje historię zabudowy i lasu, NISAR 38 przelotów radaru od czerwca 2026.

*Źródła:* `study.json` `pixel_summary.night_sig_warming_share` = 94,5, `night_sig_cooling_share` = 0,0, `lst_pixels` = 2517 (MOD11A2 v061). `ground.modis_vs_station.night_vs_tmin` r = 0,893, n = 24 (2000–2023). `ground.trend_annual_mean`: średnia roczna na stacji IMGW Poznań-Ławica +0,4348 °C na dekadę w 58 latach (1966–2023), trend istotny. `growth_correlation.day_lst`: Spearman r = 0,682, p = 0,0018, n = 18 (im szybciej rosła gmina, tym szybciej ocieplały się jej letnie dni). `land.json` `nisar_dates`: 38 przelotów, od 18.06.2026 do 29.10.2026 (GCOV z NASA GIBS). Statystyka sprawdzona z SciPy (README). Na pytania: temperatura powierzchni to dachy i grunt, nie powietrze; test Manna-Kendalla zakłada niezależne lata; brak danych MODIS za 2025 r. (`study.json` `missing_years`).

**Kryteria:** Związek z danymi NASA, Rzetelność. Dane NASA są rdzeniem, każdy trend jest testowany, a satelitę sprawdzamy ze stacją naziemną.

---

## Slajd 5. Prognoza, uczciwie sprawdzona

**Na slajdzie**

> Test na latach 2015–2020, których model nie widział:
> **56,4%** wskazanych komórek zostało zabudowanych.
> Wolny teren: AUC **0,986** (prosta reguła: 0,901).
> Ranking, nie wyrok.

**Wizualizacja.** Oś czasu przeciągnięta w fioletową strefę „Predykcja” na 2035, fioletowe komórki prognozy na mapie. Ustawienia mapy otwarte na sekcji PREDYKCJA (horyzont, suwak „Minimalna szansa zabudowy” z podpowiedzią o teście). Wstawka: wskaźnik ryzyka zabudowy („NN / 100”) ze skalą.

**Notatki.** Prognoza to regresja logistyczna na komórkach 120 m, uczona na latach 2005–2015 i sprawdzona na 2015–2020. Z 5379 komórek, które model ocenił najwyżej, 56,4% rzeczywiście zabudowano. Ogólne AUC 0,987 zawyżają komórki prawie zabudowane, więc osobno sprawdzamy wolny teren: 0,986 wobec 0,901 dla prostej reguły. Większość wzrostu to dogęszczanie: tylko 76 przypadków na wolnym terenie.

*Źródła:* `land.json` `model`: `top_n_hit_rate` = 0,564, `conversions_2015_2020` = 5379, `auc_2015_2020` = 0,987, `open_land_auc` = 0,986, `open_land_baseline_auc` = 0,901, `open_land_conversions` = 76, `open_land_hit_rate` = 0,013, `demand_ha_per_5y` = 2781; `study_built_share_pct` 2030 = 14,4, 2035 = 15,69. Definicje w `pipeline/model_urban.py`: wolny teren = poniżej 5% zabudowy w 2015 r.; prosta reguła = kolejność według udziału zabudowy w promieniu ok. 1,1 km. Wskaźnik: `web/app.js` `riskOf()`, progi w `web/i18n.js` `ui.riskScale`.

Na pytania:
- Na wolnym terenie 76 najwyżej ocenionych komórek trafiło w 1,3% (`open_land_hit_rate`): model dobrze szereguje pola, ale nie wskaże konkretnej działki.
- Prognoza w tempie z lat 2010–2020, 2781 ha co 5 lat: 14,4% powierzchni zabudowane w 2030 r., 15,69% w 2035 r. Model nie zna nowych dróg ani planów.
- Wskaźnik to skala logarytmiczna 5-letniej szansy z modelu (0,1% = 0, 30% = 100). Progi: niskie poniżej 0,5%, umiarkowane do 2%, podwyższone do 5%, wysokie do 15%, bardzo wysokie powyżej 15%.

**Kryteria:** Rzetelność. Test na danych spoza uczenia, prosta reguła dla porównania i ograniczenia powiedziane na głos.

---

## Slajd 6. Komu to się przyda

**Na slajdzie**

> **10 289 zł za m²**: mediana w Poznaniu, 2024
> Kupujący: sprawdź przed podpisaniem
> Gminy bez planu ogólnego: zobacz presję zabudowy
> Banki, ubezpieczyciele: wiele działek naraz

**Wizualizacja.** Obszar obrysowany odręcznie na polach na skraju gminy przy dolinie Warty, z włączoną warstwą „Podtopienia (PIG-PIB)”. Na karcie: „Wolny teren to N% zaznaczenia”, wskaźnik, linia o wodzie gruntowej i „Ukształtowanie terenu” z linkiem do oficjalnej mapy ISOK.

**Notatki.** Kupujący: mediana ceny metra w Poznaniu wyniosła w 2024 r. 10 289 zł, więc teren pod mieszkaniem warto sprawdzić. Gminy bez planu ogólnego widzą, gdzie model spodziewa się zabudowy i ile lasu stoi jej na drodze. Banki i ubezpieczyciele obrysowują obszar i oceniają go za jednym razem. Ceny są dla powiatów, nie dla adresów.

*Źródła:* `land.json` `prices.data["Poznań (city)"]["633677"]` 2015 = 5650, 2024 = 10 289 (GUS BDL, mediana ceny za m²); `["64428"]` 2015 = 4549,11, 2024 = 9495,07 (przeciętne miesięczne wynagrodzenie brutto). Na pytania o dostępność: płace rosły szybciej niż ceny (+108,7% wobec +82,1%), więc za miesięczną pensję można było kupić 0,81 m² w 2015 r. i 0,92 m² w 2024 r. Nie mówcie, że mieszkania stały się mniej dostępne. Aplikacja nie przewiduje zalewania piwnic: wskazuje obniżenia terenu z DEM, pokazuje oficjalne obszary podtopień PIG-PIB i linkuje mapę ISOK.

**Kryteria:** Wpływ. Trzy grupy, które podejmują drogie i trudne do odwrócenia decyzje o terenie.

---

## Slajd 7. Otwarte dane, otwarty kod

**Na slajdzie**

> Darmowe, otwarte dane: NASA MODIS, NISAR, POWER, Landsat (GHSL, GFC); Copernicus; IMGW; GUS; PIG-PIB.
> Skrypty odtwarzają wszystko w 40–60 min.
> SI: Claude pomógł pisać kod i tekst.

**Wizualizacja.** Okno „O danych” z aplikacji obok schematu przetwarzania z README. Kody QR do repozytorium i dema: [link do repo], [link do dema].

**Notatki.** Każde źródło jest darmowe i nie wymaga logowania. Skrypty odtwarzają wszystkie dane w 40–60 minut, a statystykę sprawdziliśmy z biblioteką SciPy. Mówimy wprost o ograniczeniach: rozdzielczość 10–30 m, temperatura powierzchni, a nie powietrza, prognoza w tempie z lat 2010–2020, ceny dla powiatów. Z Claude, asystenta SI, korzystaliśmy przy kodzie i szkicach; każdą liczbę liczą skrypty.

*Źródła:* `README.md`, sekcje „Data sources and licences”, „Limits we state openly”, „Use of SI tools”, „Run it”; obszary podtopień PIG-PIB z `pipeline/fetch_flood.py`.

**Kryteria:** Związek z danymi NASA, Rzetelność, Prezentacja. Otwarte dane NASA w rdzeniu, wynik do odtworzenia, uczciwie o ograniczeniach i użyciu SI.

---

## Przed eksportem

- Liczby sprawdzone na danych przebudowanych 14.11.2026 o 14:32, po poprawce wysokości terenu (DEM). Jeśli skrypty ruszą jeszcze raz, sprawdźcie liczby ponownie według tabeli w `docs/PITCH.md`. Najbardziej mogą się zmienić liczby ze slajdu 5.
- Lista przeglądu wciąż rośnie (punkt o wodzie gruntowej jest nowy). Zrzuty róbcie z wersji końcowej, żeby slajdy zgadzały się z aplikacją.
- Uzupełnijcie [link do repo] i [link do dema] na slajdzie 7.
