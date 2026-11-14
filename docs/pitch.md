# SARnik: pitch i lista zmian pod „Dancing with the SARs”

> Propozycja dla zespołu, stan na sobotę 14.11.2026. Nie zmienia `docs/PLAN.md` ani `docs/BURZA_MOZGOW.md`, tylko je zawęża do jednego bohatera.
> Szczegóły pomysłów: [`pomysly-sar/`](pomysly-sar/README.md). Źródła i to, czego nie udało się potwierdzić: [`pomysly-sar/zrodla.md`](pomysly-sar/zrodla.md).

## 1. Jedno zdanie

**Deweloper ci tego nie powie. Radar tak.**
SARnik to przegląd techniczny terenu z radaru NISAR: wpisujesz adres i widzisz, czy grunt wokół jest trwale mokry, czy obok ruszyła budowa i co tam powstanie, zanim podpiszesz umowę.

EN: *The developer won't tell you. The radar will. SARnik is a radar check-up of the land before you sign.*

## 2. Problem

- **Kupujący nie dostaje tej informacji.** Prospekt informacyjny dewelopera pyta tylko o status prawny działki względem obszarów szczególnego zagrożenia powodzią. O wilgotnym gruncie, wodzie stojącej po deszczu czy budowie hali za płotem nie ma tam nic.
- **Państwo też jej nie daje.** NIK (kontrola P/22/063, 2022): „Potencjalni inwestorzy nie mieli rzetelnych informacji o zagrożeniu powodziowym”, a pozwolenia na budowę zwykle nie zawierały informacji o ryzyku powodzi.
- **Skutki są realne.**
  - Olsztyn, lipiec 2026: osiem rodzin w nowych mieszkaniach po 18 miesiącach wynosi wodę wiadrami. Projekt nie przewidywał odwodnienia, a miasto wydało pozwolenie.
  - Powódź 2024: ponad 230 tys. poszkodowanych (UOKiK) i prawie 37 tys. wypłaconych szkód mieszkaniowych (PIU).
- **Dotąd trzeba było wysłać człowieka w teren.** Wilgotność gruntu i stan budowy sprawdzał geotechnik albo inspektor, jednorazowo i za pieniądze. Radar robi pierwszy przegląd z orbity, co kilka dni, dla każdego adresu.

Ton: mówimy wprost, że deweloper nie ma obowiązku tego ujawnić i tego nie robi. Nie podajemy nazw firm i nie piszemy o oszustwie; każde zdanie o problemie ma źródło.

## 3. Dlaczego radar, a nie zdjęcie

| Co chce wiedzieć kupujący | Zdjęcie optyczne | Radar NISAR (pasmo L) |
|---|---|---|
| Czy grunt jest mokry | Nie widzi wilgoci, widzi kolor | Mokra gleba silniej odbija sygnał, także pod trawą i uprawami |
| Czy pod drzewami stoi woda | Korony zasłaniają | Pasmo L przenika korony; woda pod pniami daje silne podwójne odbicie |
| Czy budowa ruszyła w tym miesiącu | Tylko przy bezchmurnym niebie | Działa przez chmury i nocą, przelot co kilka dni |
| Jak było wcześniej | Archiwum zależne od pogody | Równy szereg: te same orbity, ta sama geometria |

## 4. Co pokazuje portal

### 4.1 Karta miejsca: flagi zamiast jednej oceny

Każde ryzyko ma własną heatmapę i światło (zielone, żółte, czerwone) z dowodem i źródłem. Mapa zbiorcza pokazuje liczbę ostrzeżeń, bez wag. Nie robimy jednego wyniku 0–100, bo nie mamy danych o szkodach, żeby skalibrować wagi.

| Flaga | Skąd | Poziom |
|---|---|---|
| **Mokry grunt wokół działki** | NISAR HH/HV: przelot suchy kontra mokry | działa w demie |
| **Budowa obok** | NISAR: zmiana odbicia przed i po, 2026 | działa w demie |
| **Co tam powstanie** | model wieloletni + pozwolenia + BDOT10k | działa w demie |
| **Jak to widzi pasmo L, a jak C** | NISAR obok Sentinel-1 | działa w demie |
| Strefa powodziowa | ISOK (Wody Polskie), warstwa odniesienia | działa w demie (gotowa usługa) |
| Ruch gruntu | EGMS (Sentinel-1), NISAR tylko koherencja | kierunek rozwoju |
| Iły poznańskie, osuwiska | mapy PIG-PIB | kierunek rozwoju |
| Mokradła i woda pod roślinnością | NISAR HH, pełny sezon | kierunek rozwoju |

### 4.2 Heatmapa predykcji: gdzie i co powstanie

Trzy warstwy, każda nazwana tym, czym jest:

1. **Budowa już ruszyła (NISAR 2026).** Wykrywanie stanu bieżącego, nie prognoza: piksele, w których odbicie zmieniło się między przelotami. Pokazujemy suwak „przed / po”.
2. **Gdzie miasto urośnie do 2030 i 2035 (model).** Obecna regresja na historii zabudowy 1975–2020. Dokładamy cechy radarowe z Sentinel-1 (od 2014) i podajemy wynik testu wstecznego 2015→2020 z radarem i bez niego, jakikolwiek wyjdzie.
3. **Co powstanie (rejestry).** Typ zabudowy: hale i logistyka, bloki, domy. Źródłem są pozwolenia na budowę i funkcja budynku z BDOT10k. Radar potwierdza, że budowa trwa; rodzaju i materiału z piksela 20 m nie odczyta.

Zdanie do pitchu: „Model wskazał, gdzie Poznań urośnie. NISAR widzi tam budowę w 2026. Urząd potwierdza to decyzją.”

## 5. Zmiany do zrobienia

### 5.1 Działa w demie (do niedzieli 23:59)

| # | Zmiana | Gdzie w repo | Wynik do pokazania |
|---|---|---|---|
| 1 | Pobrać i wyciąć NISAR GCOV z orbity 158, w tym parę suchą i mokrą (25.06 i 24.08); HH i HV w dB, 20 m | nowy `pipeline/fetch_nisar.py` | warstwy `nisar_*.png` zamiast obrazka z GIBS |
| 2 | **Mokry grunt:** różnica mokry minus suchy na otwartym terenie (zabudowa i las zamaskowane), uśredniona do ok. 100 m | `pipeline/analyze.py` | heatmapa i flaga; zgodność ze strefami ISOK jako jedna liczba |
| 3 | **Budowa obok:** zmiana odbicia między początkiem a końcem serii 2026 | `pipeline/analyze.py` | suwak przed / po; odsetek z 751 decyzji „nowa budowa”, na których radar widzi zmianę, wobec losowych działek |
| 4 | **Pasma L i C:** te same miejsca w NISAR (HH, HV) i Sentinel-1 (VV, VH); dodać VH do `fetch_s1` | `pipeline/fetch_urban.py` | panel porównania dla lasu, pola, łąki nad Wartą i osiedla |
| 5 | Cechy Sentinel-1 w modelu i test wsteczny z radarem i bez | `pipeline/model_urban.py` | dwie liczby obok siebie |
| 6 | Typ planowanej zabudowy z pozwoleń i BDOT10k | `pipeline/analyze.py` | etykieta w karcie: „obok: hala / bloki / domy” |
| 7 | Karta miejsca w nowej kolejności: flagi radarowe na górze, licznik ostrzeżeń, strefa ISOK | `web/app.js` | ekran do filmu |
| 8 | README, 7 slajdów i film 30 s pod SARnik i NISAR; tabela odpowiedzi na pytania wyzwania | `README.md`, `docs/` | zgłoszenie |

Kolejność: 1 blokuje 2, 3 i 4. Punkty 5, 6 i 8 można robić równolegle od razu.

### 5.2 Kierunek rozwoju (uczciwie oznaczony w pitchu)

- **Ruch gruntu.** Z 5 miesięcy NISAR nie da się podać mm na rok. Dziś: historia z EGMS. Po 2–3 latach danych NISAR: własny pomiar, lepszy na terenach zielonych niż z pasma C.
- **Iły poznańskie.** Pęcznieją i kurczą się sezonowo, a szkody w budynkach wychodzą często po 10–30 latach. Dziś: mapa geologiczna jako flaga. Później: sezonowy ruch z wieloletniej serii.
- **Mokradła i woda pod roślinnością.** Wymaga pełnego roku, w tym wiosennych wezbrań Warty.
- **Osuwiska.** Rejestr SOPO jako warstwa; trzeba sprawdzić, czy obejmuje skarpy Warty.
- **Materiały budowlane.** Temat badawczy: wymaga pełnej polarymetrii i rozdzielczości rzędu 1–3 m.
- **Cała Polska.** Metoda nie zależy od Poznania; działa wszędzie tam, gdzie lata NISAR.

## 6. Czego nie obiecujemy

- **Nie mierzymy wody w piwnicy ani głębokości wód gruntowych.** Radar widzi wilgoć przy powierzchni. Flaga „mokry grunt” to sygnał ostrzegawczy, który kieruje do mapy powodziowej i badania geotechnicznego.
- **Nie oceniamy działek zabudowanych.** Na pikselach z budynkami pomiar wilgoci nie ma sensu; oceniamy otwarty teren wokół.
- **Nie podajemy tempa osiadania z NISAR.**
- **Nie rozpoznajemy materiałów ani pojedynczych budynków.**
- **Nie mówimy, że NISAR prognozuje.** NISAR wykrywa, model prognozuje.

Te zdania idą na stronę projektu. Jury ocenia rzetelność (Validity), a ekspert od radaru sprawdzi dokładnie te punkty.

## 7. Pułapki techniczne

- Nie mieszać wersji danych: provisional (17.06–23.10.2026) i validated (od 21.10.2026).
- Luka w danych od 27.07 do 10.08.2026.
- Porównywać tylko przeloty z tej samej orbity; różne orbity mają różną geometrię.
- GCOV to gamma-0, nie sigma-0. Uśredniać w mocy liniowej, wyświetlać w dB.
- Pola udają budowę: orka i żniwa zmieniają odbicie tak samo. Stąd weryfikacja decyzjami budowlanymi i maska gruntów ornych.
- Produkt wilgotności gleby (SME2) nie jest w pełni skalibrowany; tylko jako tło.
- Pasmo S jest zbierane głównie nad Indiami; porównujemy L i C.

## 8. Odpowiedzi na pytania wyzwania

| Pytanie | Odpowiedź |
|---|---|
| Obszar | Poznań i gminy wokół: nasze miasto, które rozlewa się na pola i dolinę Warty |
| Jakie zmiany śledzimy | wilgotność gruntu, nową zabudowę, a w tle las i wodę |
| Które polaryzacje pokazują zmiany | HH: grunt, wilgoć, ściany budynków. HV: roślinność, korony, uprawy |
| Fizyczne przyczyny | woda podnosi stałą dielektryczną gleby, więc HH rośnie; nowe ściany dają podwójne odbicie; wycinka i żniwa obniżają HV |
| Inne częstotliwości | pasmo C (Sentinel-1) zatrzymuje się na roślinności, pasmo L dociera do gruntu |
| Czego nie widać i dlaczego | osiadania (za krótki szereg), piwnic i wód gruntowych (radar widzi powierzchnię), pojedynczych domów (20 m) |
| Przyszłe zastosowania NISAR | ruch gruntu po kilku latach danych, mokradła w pełnym cyklu rocznym, monitoring budów dla gmin, ocena ryzyka dla banków i ubezpieczycieli |

## 9. Film 30 s (szkic)

1. **0–5 s:** rodzina wynosi wodę wiadrami z nowego osiedla. „Kupili 18 miesięcy temu. Nikt im nie powiedział.”
2. **5–12 s:** mapa Poznania, adres, karta: dwie czerwone flagi.
3. **12–20 s:** suwak NISAR suchy / mokry, potem przed / po budowie hali obok.
4. **20–26 s:** „Model przewidział. Radar widzi. Urząd potwierdza.” Jedna liczba z weryfikacji.
5. **26–30 s:** „SARnik. Sprawdź teren, zanim podpiszesz. Dane NISAR, NASA i ISRO.”

## 10. Bramka

Niedziela 12:00: jeśli punkty 1–3 z tabeli 5.1 nie działają na prawdziwych pikselach NISAR, wracamy do planu awaryjnego z `BURZA_MOZGOW.md` (zgłoszenie do „Earth System Trend Detective”).
