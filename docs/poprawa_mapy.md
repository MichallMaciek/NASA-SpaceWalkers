# Lista zadań: szybka, ładna i dokładna mapa SARnik

## A. Od razu w obecnej wersji (v2), ok. 1 h

- [ ] **1. „Dziś” jako przycisk na osi czasu**
  - **Problem:** „Dziś” to sam napis (`app.js`, l. 727–729) i nic się nie dzieje po kliknięciu.
  - **Co zrobić:** kliknięcie myszą, dotykiem albo klawiszem Enter zatrzymuje odtwarzanie i w ok. 0,3 s przesuwa oś na rok 2026. W warstwach radarowych wybiera najnowszy przelot: Sentinel-1 z 13.11, NISAR z 11.10, z podpisem „najnowszy przelot”. Stan „dziś” trafia do linku do miejsca.
  - **Gotowe, gdy:** jedno kliknięcie zawsze pokazuje aktualny stan terenu.

- [ ] **2. Dymek z wartościami znika po wyjechaniu z mapy**
  - **Problem:** chowa go tylko `map.on("mouseout")` (`app.js`, l. 507), więc zostaje na ekranie nad kartą, panelem warstw i osią czasu.
  - **Co zrobić:** chować dymek, gdy kursor opuszcza samo płótno mapy, wchodzi na dowolny panel albo okno traci fokus, a także na początku przesuwania, przybliżania i rysowania. Na telefonie wartość pojawia się po stuknięciu i znika po stuknięciu obok albo po 4 s.
  - **Gotowe, gdy:** dymek widać tylko wtedy, gdy kursor jest nad mapą.

## B. Nowa wersja (v3) na osobnej gałęzi

v2 zostaje opublikowana jako zapas. Każdy punkt poniżej rozwiązuje konkretny problem dzisiejszej mapy.

- [ ] **3. Jeden silnik mapy: MapLibre GL**
  - **Problem:** dziś działają dwa silniki naraz. Leaflet rysuje warstwy, a MapLibre podkład, więc przy przybliżaniu wszystko się rozjeżdża i szarpie.
  - **Co zrobić:** zostawić samo MapLibre GL. Wszystko, łącznie z podkładem, warstwami, wektorami i etykietami, rysuje wtedy karta graficzna.
  - **Gotowe, gdy:** przesuwanie i przybliżanie są płynne, a warstwy nie odklejają się od podkładu.

- [ ] **4. Warstwy rastrowe rysowane przez kartę graficzną (deck.gl + własny shader)**
  - **Problem:** dziś 12 warstw po 858 tys. komórek przelicza się w JavaScripcie przy każdej klatce, więc odtwarzanie i suwaki zacinają się, zwłaszcza na telefonie.
  - **Co zrobić:** kafle zawierają same wartości (np. dB, % zabudowy), a kolor, progi, ustawienia suwaków i przejścia między datami liczy program na karcie graficznej. Ruch suwaka zmienia tylko jeden parametr.
  - **Gotowe, gdy:** suwak reaguje natychmiast, a odtwarzanie osi czasu idzie w 60 kl./s.

- [ ] **5. Kafle w pełnej rozdzielczości danych**
  - **Problem:** wszystko leży na siatce 120 m (ok. 73 m w terenie), którą przeglądarka rozciąga, więc na zbliżeniu obraz jest rozmyty. Dane źródłowe są 4–7 razy dokładniejsze.
  - **Co zrobić:**
    - do przybliżenia 12 zostaje siatka 120 m, bo wystarczy do widoku całości;
    - od 13 wchodzą kafle w rozdzielczości źródła: NISAR 20 m, Sentinel-1 10–20 m, zabudowa 10 m (2018);
    - model zabudowy dalej liczy na 120 m.
  - **Gotowe, gdy:** po przybliżeniu widać osiedla i ulice ostro, a nie rozmytą plamę.

- [ ] **6. Wektory jako kafle wektorowe**
  - **Problem:** działki WUIA (2,6 MB), podtopienia i granice gmin to dziś duże pliki GeoJSON, przerysowywane od nowa przy każdej zmianie.
  - **Co zrobić:** zamienić je na kafle wektorowe (PMTiles), a docelowo dodać budynki z BDOT10k. Styl i przezroczystość zmieniają się natychmiast.
  - **Gotowe, gdy:** kształty są ostre przy każdym przybliżeniu i nie spowalniają mapy.

- [ ] **7. Jeden opis wszystkich warstw (`layers.json`)**
  - **Problem:** dziś opis każdej warstwy jest rozrzucony po kodzie: rysowanie, legenda, dymek i karta osobno, więc łatwo o niezgodności.
  - **Co zrobić:** jeden plik dla wszystkich warstw: źródło, jednostka, paleta, rozdzielczość, suwaki, teksty PL/EN, data, licencja. Pipeline zapisuje go razem z danymi.
  - **Gotowe, gdy:** legenda, dymek i karta zawsze mówią to samo co mapa.

- [ ] **8. Dokładne statystyki karty, liczone w tle**
  - **Problem:** karta liczy po środkach komórek, więc dla małej działki wynik skacze między 0 a 100%. Do tego obliczenia blokują stronę.
  - **Co zrobić:** liczyć w Web Workerze, z udziałem powierzchni każdej komórki w obszarze. Dla małych działek brać dane 10–20 m. W trakcie liczenia karta pokazuje „liczę”.
  - **Gotowe, gdy:** wynik dla działki 0,5 ha jest wiarygodny, a strona nie przycina.

- [ ] **9. Poprawna obróbka danych w pipeline**
  - **Problem:** zła metoda zmniejszania rozdzielczości zniekształca wartości, a mieszanie wersji NISAR daje fałszywe zmiany.
  - **Co zrobić:**
    - radar uśredniać w mocy liniowej, a nie w dB;
    - kategorie (np. rok wycinki) zmniejszać przez najczęstszą wartość;
    - zaznaczać brak danych osobno od zera;
    - brać tylko PROVISIONAL z toru 158, bez duplikatów.
  - **Gotowe, gdy:** każda liczba na mapie ma jasne źródło, wersję i metodę.

- [ ] **10. Wygląd i wygoda**
  - **Problem:** palety bywają nieczytelne, przy zmianie daty obraz miga, a użytkownik nie wie, jak dokładne są dane.
  - **Co zrobić:**
    - palety odporne na daltonizm, osobno dla trybu jasnego i ciemnego;
    - przy legendzie plakietka z rozdzielczością, np. „piksel 20 m · NISAR 24.08.2026”;
    - płynne przenikanie przy zmianie daty;
    - pasek wczytywania przy każdej warstwie;
    - na telefonie karta wysuwana z dołu i duże przyciski.
  - **Gotowe, gdy:** osoba spoza zespołu rozumie mapę bez tłumaczenia.

- [ ] **11. Niezawodność na pokazie**
  - **Problem:** NASA GIBS czasem zwraca błąd 500 (sprawdzone 14.11), a Wi-Fi na pokazie bywa słabe.
  - **Co zrobić:** główne warstwy NISAR i Sentinel-1 podawać z własnych kafli, a odwiedzone kafle zapisywać w pamięci przeglądarki (service worker).
  - **Gotowe, gdy:** demo działa nawet przy słabym internecie.

- [ ] **12. Testy przed przełączeniem**
  - **Problem:** przebudowa może po cichu zepsuć którąś z obecnych funkcji.
  - **Co zrobić:**
    - automatyczne testy Playwright dla każdej funkcji: oś czasu, suwaki, karta, rysowanie, PL/EN, tryb ciemny, link do miejsca;
    - pomiar płynności w Chrome DevTools;
    - ręczny test na telefonie i laptopie.
  - **Gotowe, gdy:** wszystko z obecnej wersji działa, a odtwarzanie idzie w 60 kl./s.

## C. Organizacja i terminy

- [ ] **13. Podział na 3 równoległe strumienie:**
  - **Dane** (punkty 5, 6, 7, 9): kafle, kafle wektorowe, `layers.json`;
  - **Mapa** (punkty 3, 4, 11): MapLibre, shader, pamięć podręczna;
  - **Interfejs** (punkty 8, 10, 12): oś czasu, suwaki, karta, dymek, testy.

  Razem ok. 16–22 h pracy plus 3–4 h na szlify.
- [ ] **14. Niedziela 14:00, bramka:** jeśli v3 przechodzi testy z punktu 12, przełączamy na nią główny adres. Jeśli nie, zgłaszamy v2 z poprawkami z części A.
- [ ] **15. Niedziela 16:00:** koniec zmian w aplikacji, potem tylko film, slajdy i zgłoszenie do 23:59.

To duża przebudowa, a do terminu zostało ok. 28 godzin. Dlatego v2 jest zapasem, a bramka o 14:00 chroni działające demo.
