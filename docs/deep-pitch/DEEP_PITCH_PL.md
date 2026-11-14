# SARnik: deep pitch (po polsku, na finał w Poznaniu)

Zespół SpaceWalkers, NASA Space Apps Challenge 2026 [src:materials/challenge_dancing_with_the_sars.md#title], wyzwanie „Dancing with the SARs”.

**Czym jest ten plik.** To polska wersja pitchu na lokalny finał w Poznaniu, napisana na podstawie wersji angielskiej (docs/deep-pitch/DEEP_PITCH.md) po przeglądzie red-teamu, 14 listopada 2026. To nie jest tłumaczenie słowo w słowo: tekst ma brzmieć tak, jak mówi ktoś stąd do jury stąd.

**Zasady, których trzyma się ten tekst**
- Wartości liczb i ich tagi źródłowe są dokładnie takie jak w wersji angielskiej. Zapis jest polski: przecinek dziesiętny i spacja w tysiącach (6,6 zamiast 6.6; 17 557 zamiast 17,557). Nie dodaliśmy żadnej liczby.
- Każde zdanie o tym, co robi aplikacja, jest prawdziwe dla `main` (commit 0cdedf1) i ma jeden z czterech statusów: **działa dziś**, **w otwartym pull requeście**, **czeka na decyzję zespołu**, **kierunek na przyszłość**. Na slajdzie bez przypisu może się znaleźć tylko „działa dziś”.
- Wszystko, co czeka na decyzję zespołu, jest przypisem [ZAŁOŻENIE: ...], nigdy tekstem na slajdzie.
- Stan sprawdzony 14 listopada 2026 wieczorem: `gh pr list` pokazuje jeden otwarty pull request, #11 (`sarnik-wuia`, „Co tam powstanie”). Gałęzie `sarnik-rdzen` (wiersze modułów) i `sarnik-zagrozenia` (ISOK, SOPO) nie mają pull requestu. Strona „O projekcie” nie ma ani gałęzi, ani pull requestu. Pliki docs/fakty/FAKTY.md, docs/grilling/ZALOZENIA.json i katalog docs/przeglad-v2/ nie istnieją, więc wszystko z sekcji „Niepotwierdzone” w docs/pomysly-sar/zrodla.md zostaje poza slajdami.
- Nie wymieniamy żadnej firmy i nie piszemy o oszustwie. Mówimy wprost tylko to, co mamy w źródłach.

---

## 1. Pitch w jednym zdaniu

SARnik to darmowa aplikacja dla każdego, kto kupuje mieszkanie, dom albo działkę w Poznaniu i 17 gminach wokół [src:poznan-trend-detective/web/data/study.json#areas]: wpisujesz adres albo obrysowujesz działkę i przed podpisaniem umowy dostajesz radarowy przegląd terenu, czyli co obok wyrosło od zeszłej jesieni (Sentinel-1), czy grunt się ruszał w latach 2016–2020 [src:poznan-trend-detective/web/data/land/sar.json#egms.source] (EGMS) i, tam gdzie NISAR (NASA-ISRO) to zobaczył, jak grunt zareagował na jeden deszcz. *Deweloper ci tego nie powie. Radar tak.*¹

¹ [ZAŁOŻENIE: nazwa SARnik i hasło to robocze założenia z briefu, bo docs/grilling/ZALOZENIA.json nie istnieje. Zdanie „deweloper nie ma obowiązku mówić, jak grunt zachowuje się po deszczu, i tego nie robi” trafia na slajd albo do notatek dopiero wtedy, gdy potwierdzi je docs/fakty/FAKTY.md; zrodla.md wpisuje obowiązek ujawniania badań gruntu i wód gruntowych do „Niepotwierdzone”. Poradnik o prospekcie każe kupującym sprawdzić planowane inwestycje w promieniu 1 km [url:https://pewnylokal.pl/porady/prospekt-informacyjny-dewelopera], więc w pitchu nigdy nie mówimy, że deweloper ukrywa budowę za płotem.]

---

## 2. Siedem slajdów z notatkami prelegenta

Demo to film do 30 s albo najwyżej 7 slajdów [src:docs/planwyd.md#Fakty ustalone 14.11].³ Talia to dokładnie te siedem slajdów: **bez osobnego slajdu tytułowego, planu prezentacji ani podziękowań**. Tagów źródłowych nie pokazujemy na slajdach; tam, gdzie kogoś cytujemy, slajd ma krótką stopkę ze źródłem. Każda linijka na slajdzie ma status „działa dziś”, chyba że ma przypis.

Zrzuty ekranu robimy tylko z `main`, uruchomionego lokalnie, w polskiej wersji językowej, z wyłączonym trybem eksperckim, chyba że slajd mówi inaczej.

³ [ZAŁOŻENIE: docs/planwyd.md podaje format demo jako ustalony fakt, ale docs/pomysly-sar/zrodla.md wciąż ma go w „Niepotwierdzone”, bo oficjalnych poradników nie udało się pobrać. Zespół sprawdza oficjalny poradnik Space Apps i wybiera, czy oceniane demo to film, czy slajdy.]

### Slajd 1. Ładne zdjęcia, zero przeglądu

**Na slajdzie:**
> Używane auto: przegląd u diagnosty. Nowe mieszkanie: ładne zdjęcia.
> Mało kto dostaje prosty przegląd samego gruntu.
> **Deweloper ci tego nie powie. Radar tak.**¹
>
> *Stopka:* SARnik · SpaceWalkers · NASA Space Apps 2026 [src:materials/challenge_dancing_with_the_sars.md#title]: Dancing with the SARs

**Obraz:**
- Po lewej: własne zdjęcie zespołu z nowego osiedla, bez ludzi, bez logo i bez znaków portali ogłoszeniowych.
- Po prawej: zrzut z `main`: karta miejsca z nagłówkiem „N rzeczy do sprawdzenia” i grupami „Z radaru SAR” oraz „Tło z innych źródeł (bez radaru)”.
- [ZAŁOŻENIE: zespół wybiera adres, którego flaga pochodzi z wiersza „Nowe budowy obok” (Sentinel-1) albo „Czy grunt się rusza” (EGMS), a nie z wiersza prognozy „Co może powstać obok”, i sprawdza go na `main` uruchomionym lokalnie.]

**Notatki prelegenta:** Jak kupujecie używane auto, jedziecie z nim do diagnosty. Jak kupujecie mieszkanie albo działkę, czyli zwykle najdroższą rzecz w życiu, dostajecie ładne zdjęcia i prospekt. W prospekcie są planowane inwestycje w promieniu 1 km [url:https://pewnylokal.pl/porady/prospekt-informacyjny-dewelopera]. Ale prostego przeglądu samego gruntu raczej nikt wam nie da: co się obok zmieniło w tym roku, jak ziemia przyjęła deszcz, czy się ruszała. Taki przegląd zrobiliśmy z radaru.

### Slajd 2. To się już dzieje

**Na slajdzie:**
> Olsztyn 2026: 8 rodzin [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/] w nowych mieszkaniach, od 1,5 roku [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/] walczy z wodą.
>
> *Stopka:* Źródło: Polsat News, 29 lipca 2026.

**Obraz:** slajd z samym cytatem na gładkim tle. Bez ekranu aplikacji i bez nakładki radarowej: Olsztyn leży poza naszym obszarem, to przykład problemu, a nie przypadek, który wyłapał nasz radar.

**Notatki prelegenta:** W Olsztynie osiem rodzin kupiło nowe mieszkania i od półtora roku walczy z wodą, która zalewa ogródki, parkingi i piwnice [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/]. We wniosku o pozwolenie na budowę nie było systemu odprowadzania deszczówki, a miasto i tak wydało zgodę. W 2023 roku NIK napisała, że „potencjalni inwestorzy nie mieli więc rzetelnych informacji o zagrożeniu powodziowym w miejscu planowanej inwestycji” [url:https://www.prawo.pl/samorzad/zabudowa-terenow-zagrozonych-powodzia-ustalenia-nik,520841.html]. Inwestor to w prawie budowlanym ten, kto buduje, a nie ten, kto kupuje. Skoro nie mieli tego ci, którzy budują, kupujący raczej też tego nie mają; to nasz wniosek, nie ustalenie NIK. Olsztyn jest poza naszym obszarem i żaden radar tego przypadku nie udowodnił. SARnik już dziś pokazuje dla każdego adresu oficjalną mapę podtopień PIG-PIB i zagłębienia terenu.

### Slajd 3. Jeden adres, jeden przegląd

**Na slajdzie:**
> Wpisz adres. Dostań przegląd z radaru. Każde ryzyko ma osobną flagę.²

**Obraz:**
- Pełny ekran aplikacji z `main`, uruchomionej lokalnie.
- Wybrany adres z kołem 1 km [src:poznan-trend-detective/web/app.js#selection: a point (1 km circle)].
- Karta otwarta na prostym przeglądzie (Nowe budowy obok, Co może powstać obok, Woda, Czy grunt się rusza, Drzewa, Upał latem, Cena); sekcja „Szczegóły techniczne: radar, wykresy, statystyka” zwinięta.
- Widoczne przyciski widoków mapy: Radar, Nowe budowy, Woda, Grunt, Drzewa, Historia.

**Notatki prelegenta:** To jest SARnik i działa już dziś, w Poznaniu i 17 gminach wokół [src:poznan-trend-detective/web/data/study.json#areas]. Znacie to z Dopiewa czy Komornik: wczoraj było tu pole, dziś jest osiedle. Wpisujecie adres albo obrysowujecie działkę. Karta odpowiada na proste pytania, jednym zdaniem każde, i pod każdą linijką mówi, skąd to wiemy. Najpierw odpowiedzi z radaru Sentinel-1 i z EGMS; NISAR pojawia się tam, gdzie zobaczył, jak grunt zareagował na deszcz; potem inne mapy. Nagłówek liczy, o co warto zapytać sprzedającego i urząd. Każde ryzyko ma własną flagę. Tryb ekspercki pokazuje wszystkie warstwy i wszystkie testy.

² [ZAŁOŻENIE: „osobne flagi, bez jednej oceny 0–100” to robocze założenie z briefu. Zespół decyduje, czy zostawić prawdopodobieństwo zabudowy „NN / 100” w „Szczegółach technicznych” (`riskHTML()` w web/app.js); do tego czasu nie ma go na żadnym zrzucie.]

### Slajd 4. Co radar widzi, a zdjęcie nie

**Na slajdzie:**
> Las a otwarty teren: w paśmie L (HV) różnica 6,6 dB [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.HV] [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.open.HV], w paśmie C (VH) 2,8 dB [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.VH] [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.open.VH].

**Obraz:**
- Okno „Jak widzi radar”, **przycięte do trzech rysunków** („Gładko: odbicie w bok”, „Narożnik: podwójne odbicie”, „Korona: rozproszenie”) **i tabeli** „Pasmo L obok pasma C nad Poznaniem (mediany, dB)”. Resztę okna wycinamy: polski tekst w web/i18n_sar.js (obiekt `PL.radarHtml`) ma te same przesadzone zdania co angielski w liniach 61, 66 i 72, czyli „przechodzi przez liście do gałęzi, pni i gleby”, „NISAR mierzy Poznań co 12 dni od czerwca 2026”, „Tu ma przewagę pasmo L NISAR” i „Mieszkańcy dostaną ostrzeżenie o nasiąkniętym gruncie”.
- Druga klatka: widok Radar z włączonym odtwarzaniem od ALOS-2 2015 [src:poznan-trend-detective/web/data/land/sar.json#alos.years] do NISAR 2026 [src:poznan-trend-detective/web/data/land/sar.json#nisar.dates] nad lasami na południe od Poznania, z podpisem „każdy satelita we własnej skali; porównuj wzory, nie jasność; brak danych w paśmie L z lat 2022–2025” [src:poznan-trend-detective/web/data/land/sar.json#alos.years].
- [ZAŁOŻENIE: zespół sprawdza na `main`, że w tym miejscu różnicę lasu widać gołym okiem.]

**Notatki prelegenta:** Aparat zapisuje kolor. Radar sam wysyła falę, w dzień i w nocy, przez chmury. Gładka woda odbija ją w bok jak lustro; ściana z ziemią tworzą narożnik, który rozjaśnia HH i VV; liście obracają drganie fali, więc roślinność widać w HV i VH. Fala NISAR-a ma 24 cm [src:poznan-trend-detective/web/data/land/sar.json#nisar.mission] i dochodzi do gałęzi; fala Sentinela-1 ma 5,6 cm [src:poznan-trend-detective/web/data/land/sar.json#s1.mission] i rozprasza się głównie w górnej części koron. Pasuje do tego, że las bardziej odstaje w paśmie L. Ale w HH w paśmie L las świeci tak samo jak miasto, więc budynki szukamy po zmianie, a nie po jasności. To mediany, każdy satelita porównany sam ze sobą, bez testu. Na osi czasu w 2026 zmienia się satelita i ten skok to nie jest zmiana terenu.

### Slajd 5. Po jednym deszczu echo NISAR-a wzrosło

**Na slajdzie:**
> Sucho 25 czerwca [src:poznan-trend-detective/web/data/land/sar.json#nisar.dry] → mokro 24 sierpnia [src:poznan-trend-detective/web/data/land/sar.json#nisar.wet]: HH z NISAR-a wzrosło o 2 dB lub więcej [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.what] na 37% otwartego terenu [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.share_study].
> HH rozjaśnia deszcz, ale też żniwa i orka. To wskazówka, nie mapa podtopień.

**Obraz:**
- Widok Woda na `main` nad całym obszarem, **z wyciętym tytułem warstwy i legendą** („Gdzie po deszczu ziemia nasiąka (radar NISAR)”, „mocno nasiąka” / „przesycha”), dopóki zespół ich nie zmieni, i ze zwiniętą kartą odkryć.
- Potem wiersz karty „Woda” na poziomie „informacja” z linijką źródła „Radar NISAR, 25 czerwca i 24 sierpnia 2026”.
- [ZAŁOŻENIE: wybieramy miejsce, w którym wiersz Woda pokazuje zdanie z NISAR-a, czyli bez strefy podtopień i bez zagłębienia.]
- Nie używamy podglądów JPG z web/data/nisar/: aplikacja na `main` ich nie pokazuje.

**Notatki prelegenta:** To jest NISAR, wspólny satelita NASA i indyjskiej agencji ISRO. W naszym punkcie odniesienia (Open-Meteo) przez trzy dni przed 25 czerwca nie spadła ani kropla [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-06-25.deszcz_3dni_mm]; przed 24 sierpnia spadło 23,5 mm [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-08-24.deszcz_3dni_mm]. Woda podnosi stałą dielektryczną gleby, a to może rozjaśnić HH: mediana wzrostu na otwartym terenie to 1,39 dB [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.median_db_open]. Tylko że 19 lipca gleba była prawie tak samo mokra [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-07-19.wilgotnosc_gleby_m3m3], a HH ledwo drgnęło [src:poznan-trend-detective/web/data/land/sar.json#nisar.aoi_hh_db]. Po żniwach i podorywce gleba też robi się szorstka. Jedna para zdjęć, bez porównania dwóch suchych dni: to wskazówka, pokazana jako informacja, nigdy jako ostrzeżenie.

### Slajd 6. Czy obok coś rośnie?

**Na slajdzie:**
> Tam, gdzie nasza prognoza spodziewała się zabudowy, Sentinel-1 widział ślad nowego budynku 4,3 razy częściej [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.ratio] niż na reszcie niezabudowanego terenu.

**Obraz:**
- **Klatka 1:** klikamy odkrycie „Prognoza się sprawdza”. Aplikacja przełącza się na Historię, włącza „Co się zmieniło w ostatnim roku”, ustawia oś czasu na 2030 i przybliża Poznań [src:poznan-trend-detective/web/app.js#SAR_FINDINGS.modelRadar]. Czerwone komórki zmian leżą na komórkach z prognozy. Przed zrobieniem klatki **zwijamy kartę odkryć**: jej tekst „Gdzie w tym roku stanęły nowe budynki” podaje stosunek dla „działek z pozwoleniem na budowę” (`fp.radar` w web/i18n_sar.js), którego nie pokazujemy.
- **Klatka 2:** widok Nowe budowy nad jedną dzielnicą.
- Obie klatki robimy **bez wybranego miejsca**, żeby „NN / 100” w „Szczegółach technicznych” się nie pokazało.
- [ZAŁOŻENIE: zespół wybiera dzielnicę po obejrzeniu mapy.]

**Notatki prelegenta:** Na ekranie dwóch świadków. Pierwszy to nasza prognoza zbudowana na mapach zabudowy z Landsata, uczona na latach 2005–2015 [src:poznan-trend-detective/web/data/land/land.json#model.trained_on] i sprawdzona na latach 2015–2020 [src:poznan-trend-detective/web/data/land/land.json#model.tested_on]; na otwartym terenie układa miejsca lepiej niż prosta reguła, ale jej najmocniejsze typy trafiają tylko w 1,3% [src:poznan-trend-detective/web/data/land/land.json#model.open_land_hit_rate]. Drugi to Sentinel-1: jesień 2026 kontra jesień 2025 [src:poznan-trend-detective/web/data/land/sar.json#checks.change_method]. W górnych 5% prognozy [src:poznan-trend-detective/web/data/land/sar.json#checks.model.what] ślad nowego budynku pojawił się w 77 [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.hits] z 17 557 komórek [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.cells]. Ten sam ślad łapie też wyczyszczone place i prace ziemne, a częściowo mówi po prostu, że nowe bloki stawia się obok starych. To kierunek, a nie dowód, że prognoza trafia. Przeloty NISAR-a z jesieni 2025 to wersja beta, a wersji nie mieszamy.

**Tylko w notatkach (nie na slajdzie):** działki z decyzją o nowym budynku w miejskim rejestrze zmieniały się częściej, 12 [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.hits] z 766 komórek [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.cells]; to jakakolwiek zmiana, a nie budynki, kategorie w rejestrze są zaszumione [src:docs/planwyd.md#Fakty ustalone 14.11], a wersja z samym śladem nowego budynku nie jest istotna (p = 0,2811 [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia_walls.p]).

### Slajd 7. Czego nie obiecujemy i co NISAR da potem

**Na slajdzie:**
> Nie mierzymy: osiadania z NISAR-a, pojedynczych domów, piwnic, wód gruntowych.
> Dalej⁴: interferometria NISAR-a i zmiana rok do roku w paśmie L.
> Otwarte dane: NASA-ISRO NISAR, NASA POWER i MODIS, ESA Sentinel-1, Copernicus EGMS, JAXA ALOS-2. Pracowaliśmy z pomocą SI.

**Obraz:**
- Widok Grunt (EGMS 2016–2020 [src:poznan-trend-detective/web/data/land/sar.json#egms.source]) nad Poznaniem i wiersz karty „Czy grunt się rusza” dla jednego adresu.
- Stopka: kody QR do publicznego repozytorium i do demo.
- [ZAŁOŻENIE: kod QR demo prowadzi do wdrożenia `main`; wdraża tylko właściciel projektu Firebase. Jeśli nie zdąży, QR prowadzi do podglądu v3 z README i mówimy, że to wersja sprzed scalenia. Adresu z wersją 1 nigdy nie pokazujemy jako aplikacji.]

**Notatki prelegenta:** Swoje granice mówimy na głos. Nasze komórki mają w terenie około 73 m [src:poznan-trend-detective/web/data/land/land.json#cell_m_ground]: widzimy osiedla i ulice, a nie pojedyncze domy. Z NISAR-a wzięliśmy produkt GCOV, czyli samą siłę odbicia, bez fazy, więc ruchu gruntu z niego w ogóle nie da się zmierzyć. Ruch gruntu mamy z EGMS z lat 2016–2020, który pokrywa 24,2% [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.share_of_study] obszaru. Dalej: produkty interferometryczne NISAR-a i kilka lat przelotów mogłyby mierzyć ruch tam, gdzie pasmo C gubi się w zieleni, a zmiana rok do roku w paśmie L powinna dawać mniej sezonowych fałszywych alarmów. Jedno i drugie to hipotezy do sprawdzenia.

⁴ Kierunek na przyszłość; nic z tego nie ma w aplikacji. Poza slajdami zostają też wiersze o strefach powodziowych ISOK i osuwiskach SOPO (gałąź `sarnik-zagrozenia`, bez pull requestu) oraz wiersz „co tu powstanie” z typem budynku (otwarty pull request #11, nieaktywny, dopóki nie scalimy rdzenia modułów).

---

## 3. Scenariusz filmu (30 s; lektor kończy do 28. sekundy)

| Czas | Lektor | Napis na ekranie | Co pokazuje aplikacja |
|---|---|---|---|
| 0–4 s | „Największy zakup w życiu, a kupujesz po ładnych zdjęciach.” | Ładne zdjęcia. A grunt? | Własne zdjęcie zespołu z nowego osiedla (bez ludzi, bez logo), przejście do mapy SARnika nad Poznaniem |
| 4–10 s | „W Olsztynie osiem rodzin od półtora roku walczy z wodą w nowych mieszkaniach.” | Olsztyn 2026: 8 rodzin, 1,5 roku walki z wodą [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/] · Polsat News | Plansza z tekstem na gładkim tle; bez ekranu aplikacji (Olsztyn jest poza obszarem) |
| 10–15 s | „SARnik robi radarowy przegląd każdego adresu pod Poznaniem.” | Wpisz adres. Dostań przegląd. | Wpisany adres, pojawia się koło 1 km [src:poznan-trend-detective/web/app.js#selection: a point (1 km circle)], otwiera się karta z „N rzeczy do sprawdzenia” |
| 15–20 s | „Sentinel-1 pokazuje, co obok wyrosło od zeszłej jesieni.” | Sentinel-1: jesień 2025 → jesień 2026 [src:poznan-trend-detective/web/data/land/sar.json#checks.change_method] | Widok Nowe budowy; wiersz karty „Nowe budowy obok”; karta odkryć zwinięta |
| 20–25 s | „Po jednym deszczu echo NISAR-a wzrosło. Wskazówka, nie mapa podtopień.” | NASA-ISRO NISAR, pasmo L: sucho 25 czerwca [src:poznan-trend-detective/web/data/land/sar.json#nisar.dry] → mokro 24 sierpnia [src:poznan-trend-detective/web/data/land/sar.json#nisar.wet] | Widok Woda, tytuł warstwy i legenda wycięte, dopóki nie zmienimy nazw |
| 25–28 s | „Deweloper ci tego nie powie. Radar tak.”¹ | | Widok Radar, odtwarzanie od ALOS-2 2015 [src:poznan-trend-detective/web/data/land/sar.json#alos.years] do NISAR 2026 [src:poznan-trend-detective/web/data/land/sar.json#nisar.dates], podpis „każdy satelita we własnej skali” |
| 28–30 s | (cisza) | SARnik · SpaceWalkers · NASA Space Apps 2026 [src:materials/challenge_dancing_with_the_sars.md#title] | Plansza końcowa, w ramach 30 s |

**Uwagi do nagrania:**
- Nagrywamy na `main`, lokalnie, po polsku, w panoramie, ze zwiniętymi „Szczegółami technicznymi” i zwiniętą kartą odkryć.
- „NASA-ISRO” i „pasmo L” są tylko w napisie, żeby kwestia z 20–25 s dała się wygodnie powiedzieć.
- Zdanie o NISAR-ze nie twierdzi niczego o podtopieniach, tylko je wyklucza; zdanie o budynkach wymienia Sentinel-1.
- Polskie kwestie są dłuższe niż angielskie: przed eksportem nagrywamy lektora na próbę i mierzymy każdy odcinek. Gotowy plik musi mieć 30,0 s lub mniej.
- Lektorem jest ktoś z zespołu. [ZAŁOŻENIE: zespół potwierdza, że żaden obraz w filmie ani na slajdach nie jest wygenerowany przez SI, albo oznacza takie obrazy znakiem wodnym, zgodnie z docs/BURZA_MOZGOW.md, sekcja 11.]
- Jeśli film idzie na stronę zgłoszenia w Space Apps, oceniana jest wersja angielska z docs/deep-pitch/DEEP_PITCH.md; ta wersja jest na lokalny finał.

---

## 4. Czego nie obiecujemy

- **Nie mierzymy wody w piwnicach ani poziomu wód gruntowych.** Radar czuje wilgoć tylko przy powierzchni. Wiersz z NISAR-a (mokro minus sucho) to „informacja”; ostrzeżenia o wodzie biorą się z mapy podtopień PIG-PIB i z zagłębień terenu.
- **Nie mówimy, że to, gdzie radar widzi nasiąkanie, to działki zagrożone podtopieniem.** W strefach podtopień PIG-PIB nasiąkanie nie było częstsze: 18,5% w środku wobec 37,7% poza nimi [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry] (test jednostronny na „częściej”: p = 1,0 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.p]).
- **Nie mówimy, że wzrost w NISAR-ze spowodował jeden deszcz.** Jedna para zdjęć, bez porównania dwóch suchych dni; żniwa i orka też rozjaśniają HH.
- **Nie oceniamy gruntu pod budynkami ani w lesie.** Wilgotność liczymy tylko na otwartym terenie.
- **Nie podajemy tempa osiadania z NISAR-a.** GCOV nie ma fazy; do ruchu gruntu potrzeba produktów interferometrycznych NISAR-a i kilku lat przelotów. Ruch gruntu to EGMS 2016–2020, który pokrywa 24,2% obszaru [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.share_of_study].
- **Nie rozpoznajemy pojedynczych budynków ani materiałów.** Nasze komórki mają w terenie około 73 m [src:poznan-trend-detective/web/data/land/land.json#cell_m_ground]; do materiałów potrzeba pełnej polarymetrii i rozdzielczości 1–3 m [src:docs/pitch.md#5.2].
- **Nie mówimy, że radar zobaczył ściany.** Zobaczył ślad nowego budynku, który łapie też wyczyszczone place i prace ziemne; nie sprawdziliśmy jeszcze próbki na ortofotomapie.
- **Nie mówimy, że to NISAR zobaczył zabudowę z 2026 roku.** To Sentinel-1, rok do roku. NISAR przelatywał nad Poznaniem jesienią 2025, ale tylko w wersji beta [src:progres/p1/dane/nisar_poznan_przeloty.csv#2025-10-28.wersja]; używamy wyłącznie wersji provisional [src:poznan-trend-detective/web/data/land/sar.json#nisar.version] i nigdy nie mieszamy wersji.
- **Nie mówimy, że NISAR przewiduje przyszłość.** Prognoza to model zbudowany na mapach z Landsata, a na otwartym terenie jej najmocniejsze typy trafiają w 1,3% [src:poznan-trend-detective/web/data/land/land.json#model.open_land_hit_rate]. Radar wykrywa zmianę. Decyzja budowlana to papier, a nie plac budowy.
- **Nie mówimy, co powstanie na konkretnej działce.** Typ budynku z miejskiego rejestru jest w otwartym pull requeście #11, a rejestr obejmuje tylko miasto Poznań.
- **Nie sumujemy ryzyk w jedną ocenę.** Każde ryzyko ma własną flagę.²
- **Nie zastępujemy oględzin, badania gruntu ani planu miejscowego.** Karta mówi kupującemu, o co zapytać sprzedającego i urząd.
- **Nie mieszamy wersji danych NISAR w żadnej liczbie.** Wersja validated zaczyna się 21 października 2026 [src:docs/planwyd.md#Fakty ustalone 14.11]; warstwa podglądów z GIBS je miesza, ale to tylko podgląd i nie wchodzi do żadnej liczby.
- **Nie obejmujemy jeszcze całej Polski.** Dziś to Poznań i 17 gmin wokół [src:poznan-trend-detective/web/data/study.json#areas].

---

## 5. Dziesięć najtrudniejszych pytań jury

1. **„Nasiąkanie w NISAR-ze nie jest częstsze w oficjalnych strefach podtopień. To ile to jest warte?”**
   To wskazówka, jak powierzchnia zareagowała między dwoma przelotami (mediana +1,39 dB na otwartym terenie [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.median_db_open]), a nie mapa podtopień. W strefach podtopień wzrost był wręcz rzadszy (stosunek 0,49 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.ratio]); testowaliśmy tylko „częściej”, odwrotnej hipotezy nie. Dlatego karta pokazuje to jako informację, ostrzeżenie o wodzie opiera na mapie PIG-PIB i zagłębieniach terenu, a prawdziwym sprawdzianem będzie pełny rok NISAR-a.

2. **„Między przelotami były żniwa i orka. Czy to nie jest wasz sygnał?”**
   Możliwe, że w dużej części tak. 19 lipca gleba była prawie tak samo mokra jak 24 sierpnia [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-07-19.wilgotnosc_gleby_m3m3] [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-08-24.wilgotnosc_gleby_m3m3], a HH dla całego obszaru prawie się nie zmieniło, za to najjaśniejszy przelot wypadł 17 września, przy suchszej glebie [src:poznan-trend-detective/web/data/land/sar.json#nisar.aoi_hh_db]. To wygląda na szorstkość po żniwach i podorywce w tym samym stopniu co na deszcz. Nazywamy to wskazówką; następny krok to ten sam rachunek dla 19 lipca i dla pary dwóch suchych dni jako poziomu szumu.

3. **„Ile w SARniku jest NISAR-a?”**
   NISAR daje obraz 2026 w paśmie L, parę sucho–mokro, porównanie pasma L z pasmem C i koniec osi czasu, która zaczyna się od ALOS-2 w 2015 [src:poznan-trend-detective/web/data/land/sar.json#alos.years]. Zmiana zabudowy i ruch gruntu pochodzą z Sentinela-1 i EGMS. NISAR przelatywał nad Poznaniem jesienią 2025, ale w wersji beta [src:progres/p1/dane/nisar_poznan_przeloty.csv#2025-10-28.wersja]; używamy tylko wersji provisional i nie mieszamy wersji, więc zmianę zabudowy NISAR przejmie, gdy będzie para jesieni z tej samej wersji.

4. **„Czemu nie mierzycie osiadania NISAR-em?”**
   Wzięliśmy GCOV, czyli produkt z samą siłą odbicia, bez fazy; z GCOV nie zmierzy się ruchu niezależnie od liczby przelotów. Do tego trzeba produktów interferometrycznych NISAR-a (GUNW/RSLC) i 2–3 lat danych [src:docs/pitch.md#5.2]. Do tego czasu ruch gruntu to EGMS 2016–2020.

5. **„Wasze p wyglądają za dobrze. Czy sąsiednie komórki są niezależne?”**
   Nie są. Jedno osiedle zajmuje kilka komórek, więc jednostronne p z testu dwumianowego są zbyt optymistyczne. Obok każdego stosunku pokazujemy surowe liczby (77 z 17 557 [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.hits] [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.cells]; 12 z 766 [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.hits] [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.cells]). Następny krok to test na blokach komórek.

6. **„Czy te 4,3 razy to nie jest po prostu »nowe bloki stawia się obok starych«?”**
   Częściowo tak. Najsilniejsza cecha w prognozie to istniejąca zabudowa w komórce [src:poznan-trend-detective/web/data/land/land.json#model.coefficients_standardised], a „gdzie indziej” to pozostałe 95% komórek, które mapa modelu na 2025 uznaje za niezabudowane, razem z lasami i wodą. Dlatego mówimy o kierunku, a nie o trafności, dopóki nie porównamy tego z takim samym stosunkiem dla prostej reguły.

7. **„Prospekt pokazuje inwestycje w promieniu kilometra. To deweloper naprawdę coś ukrywa?”**
   Tego nie mówimy. Poradnik, na który się powołujemy, każe kupującym sprawdzić właśnie tę część prospektu [url:https://pewnylokal.pl/porady/prospekt-informacyjny-dewelopera]. Nam chodzi o to, co naprawdę zmieniło się na gruncie i jak ziemia przyjęła deszcz: tego od dewelopera nikt nie wymaga i tego nie dostajecie. Czy prawo każe ujawniać badania gruntu albo wody gruntowe, tego nasze źródła nie potwierdzają, więc nie stawiamy żadnej tezy prawnej.

8. **„Olsztyn nie jest w waszym obszarze, a radar nie widzi kanalizacji deszczowej. Czemu od niego zaczynacie?”**
   Bo to przykład problemu z podanym źródłem: osiem rodzin i półtora roku walki z wodą [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/], a nie przypadek wyłapany przez nasz radar. Udokumentowanego przypadku z Poznania ani z Wielkopolski nie znaleźliśmy (docs/pomysly-sar/zrodla.md), więc żadnego nie wymyślamy.

9. **„Czy kupujący może zaufać SARnikowi co do swojej działki?”**
   Nie jako wyrokowi. Nasze komórki mają w terenie około 73 m [src:poznan-trend-detective/web/data/land/land.json#cell_m_ground], więc widzimy osiedla i ulice, a nie jeden dom. SARnik mówi, o co zapytać sprzedającego i urząd; nie zastępuje oględzin ani badania gruntu.

10. **„Pod publicznym adresem jest starsza wersja. Co dokładnie działa?”**
    Publiczny adres wciąż pokazuje wersję 1; wszystko z tego pitchu działa na `main` i demo musi być wdrożone z `main`. Wiersz z typem budynku jest w otwartym pull requeście; wiersze o strefach powodziowych i osuwiskach dopiero powstają, więc żadnego z nich nie pokazujemy jako działającego.

Pozostałe pytania (jakość danych EGMS, kalibracja między satelitami, trafność prognozy, użycie SI) mają odpowiedzi w sekcji 10 wersji angielskiej, docs/deep-pitch/DEEP_PITCH.md.

---

## 6. Statusy twierdzeń użytych w tym pliku

| Twierdzenie | Status |
|---|---|
| Wyszukiwanie adresu, rysowanie obszaru, koło 1 km wokół punktu | działa dziś |
| Prosty przegląd w karcie: nagłówek „N rzeczy do sprawdzenia”, grupy „Z radaru SAR” i „Tło z innych źródeł (bez radaru)”, źródło pod każdym wierszem | działa dziś |
| Sześć widoków mapy i tryb ekspercki | działa dziś |
| Zmiana zabudowy z Sentinela-1, jesień do jesieni | działa dziś |
| Para NISAR sucho–mokro jako „informacja” w wierszu Woda | działa dziś |
| Oś czasu w paśmie L od ALOS-2 do NISAR | działa dziś |
| Ruch gruntu z EGMS 2016–2020 | działa dziś |
| Okno „Jak widzi radar” z trzema rysunkami i tabelą | działa dziś |
| Przesadzone zdania w oknie „Jak widzi radar”, w odkryciach (`fp.lband`, `fp.radar`) i w legendzie widoku Woda | czeka na decyzję zespołu (poprawić albo wyciąć z kadru) |
| Prawdopodobieństwo zabudowy „NN / 100” w „Szczegółach technicznych” | działa dziś; czeka na decyzję zespołu, czy je pokazywać |
| Osobne flagi bez jednej oceny | czeka na decyzję zespołu (robocze założenie) |
| Nazwa SARnik i hasło | czeka na decyzję zespołu (robocze założenie) |
| Deweloper nie ma obowiązku ujawniać mokrego gruntu ani wód gruntowych | czeka na decyzję zespołu (niepotwierdzone, dopóki nie ma docs/fakty/FAKTY.md) |
| Wiersz „co tu powstanie” z typem budynku | w otwartym pull requeście (#11, `sarnik-wuia`) |
| Wiersze modułów w karcie (rdzeń) | kierunek na przyszłość (gałąź `sarnik-rdzen`, bez pull requestu) |
| Strefy powodziowe ISOK dla punktu; osuwiska SOPO | kierunek na przyszłość (gałąź `sarnik-zagrozenia`, bez pull requestu) |
| Strona „O projekcie” | kierunek na przyszłość (bez gałęzi i bez pull requestu) |
| Interferometria NISAR-a, cykle mokradeł, zmiana rok do roku w paśmie L, każde miasto w zasięgu NISAR-a | kierunek na przyszłość |
| Osiadanie z NISAR-a, pojedyncze budynki, piwnice, poziom wód gruntowych | nigdy nie twierdzimy |
