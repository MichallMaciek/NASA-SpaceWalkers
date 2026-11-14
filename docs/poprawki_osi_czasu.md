# Oś czasu i kolory prognozy: co poprawić

> Stan: `main` z 14.11.2026, 22:10 (`9170684`). Numery linii dotyczą tej wersji `poznan-trend-detective/web/`.
> Dotyczy widoku z historią i prognozą (1975–2035). Oś radarowa (2015–2026) ma się zachowywać tak samo.

## 1. Kolory prognozy są zbyt agresywne

**Teraz:** prognoza ma mocny fiolet: `--pred: #7357E8` w trybie jasnym i `#9C86F5` w ciemnym (`styles.css` l. 13, 33, 40). Ten sam kolor jest w:
- osi czasu: napis „Predykcja”, kreskowany pasek, obwódka suwaka, podpis „prognoza modelu” (`styles.css` l. 263, 266, 270–274, 281–282);
- mapie: przyszła zabudowa (`app.js` l. 678);
- legendzie (`app.js` l. 942), wykresie w karcie (`app.js` l. 1836), plakietce `.chip` i suwakach `.rng.pred` (`styles.css` l. 93, 212, 221–222).

Fiolet nie pasuje do ciepłej palety zabudowy i bije w oczy mocniej niż dane z pomiarów.

**Co zrobić:**
- [ ] **Historia zabudowy: żółty przechodzący w pomarańcz.** W `RAMPS.built` (`app.js` l. 38) obciąć ciemnoczerwony koniec, np. `["#FBE7B5", "#F6C25B", "#F2A31B", "#E8832A"]`. Czerwień zostaje zarezerwowana dla prognozy.
- [ ] **Prognoza: stonowana czerwień.** Zmienić zmienne `--pred` i `--pred-soft`. Wtedy wszystkie miejsca z listy wyżej zmienią się naraz.

  | Tryb | `--pred` | `--pred-soft` |
  |---|---|---|
  | jasny | `#D9654F` | `#FBE4DF` |
  | ciemny | `#F08C78` | `#4A2A26` |

- [ ] **Nie mylić prognozy z ostrzeżeniem.** Karta używa czerwieni dla poziomu „uwaga” (`--risk-5: #B8261E`, `--risk-4: #E5602A`). Prognoza ma być jaśniejsza i bardziej koralowa niż te kolory, zawsze kreskowana na osi i zawsze podpisana „prognoza”. Kolorów ryzyka nie ruszamy.
- [ ] **Sprawdzić czytelność:**
  - kontrast napisów „Predykcja” i „prognoza modelu” co najmniej 4,5:1 w obu trybach;
  - symulacja daltonizmu (deuteranopia): przejście pomarańcz → czerwień jest tu słabo widoczne, więc różnicę musi nieść też wzór (kreski) i podpis, nie sam kolor.
- [ ] **Legenda** pokazuje te same kolory co mapa: skalę zabudowy żółty → pomarańcz i osobny kafelek „prognoza” w nowej czerwieni.

**Gotowe, gdy:** prognoza na mapie i osi jest wyraźnie inna niż pomiary, ale nie krzyczy, i nikt nie bierze jej za ostrzeżenie.

## 2. Wyśrodkowanie

- [ ] **Napis „Predykcja” nad środkiem odcinka prognozy.** Teraz stoi przy jego lewym końcu: `left = obsP + 1%` (`app.js`, `renderTimeline`, wiersz z `$("#tl-pred").style.left`). Powinien być na środku między 2020 a 2035, z `transform: translateX(-50%)`. Tak samo „Dane z pomiarów” (`#tl-real`) na środku odcinka 1975–2020.
- [ ] **Suwak zgrany z kreską „Dziś” i podziałką (błąd).**
  - **Dlaczego:** wypełnienie, odcinek prognozy, kreska „Dziś”, lata i napisy liczą położenie jako procent całej szerokości (`pos()` w `app.js`). Natywny suwak przesuwa środek kółka tylko w zakresie od 13 px do szerokość − 13 px (kółko ma 26 px).
  - **Skutek:** przy 2026 kółko stoi ok. 9 px na lewo od kreski „Dziś”, co widać na zrzucie, a przy końcach osi różnica sięga 13 px.
  - **Co zrobić:** liczyć wszystkie położenia z tym samym wcięciem, np. `left: calc(13px + (100% - 26px) * p)`. Najlepiej przez jedną funkcję w `app.js`, używaną dla `#tl-fill`, `#tl-future`, `#tl-now`, lat w `#tl-ticks` i napisów.
- [ ] **Jeden rozmiar kółka we wszystkich przeglądarkach.** Teraz jest 26 px w Chrome i Safari, a 21 px w Firefoksie (`styles.css` l. 279–280). Inaczej poprawka z punktu wyżej działa tylko w części przeglądarek.
- [ ] **Blok z rokiem po lewej** („2026 / prognoza modelu”) wyrównać w pionie do paska osi, a nie do całej karty.

**Gotowe, gdy:** po kliknięciu „Dziś” środek kółka stoi dokładnie na kresce, a napisy stoją nad środkami swoich odcinków. Sprawdzone przy 1440 px i 390 px.

## 3. Suwak

- [ ] **Kółko:**
  - mniejsze (ok. 22 px) i wypełnione kolorem: tuszem dla pomiarów, `--pred` dla prognozy, z cienką białą obwódką dla kontrastu;
  - teraz jest puste, z grubą obwódką, która w prognozie tylko zmienia kolor;
  - lekkie powiększenie po najechaniu i przy przeciąganiu.
- [ ] **Widoczny fokus z klawiatury** (`:focus-visible`, obwódka w `--area`). Dziś po wejściu Tabem nie widać, że suwak jest aktywny.
- [ ] **Trzy czytelne części paska:**
  1. pomiary 1975–2020: pełna linia w tuszu (jak teraz);
  2. prognoza od 2020 do kółka: kreski w `--pred`, pełne krycie;
  3. prognoza za kółkiem: kreski szare (`--ink-3`).

  Teraz cała przyszłość jest w tym samym fiolecie, tylko z kryciem 0,45 (`styles.css` l. 270–274), więc trudno odróżnić, gdzie stoi suwak.
- [ ] **Kreska „Dziś”** nie powinna przechodzić przez kółko (teraz ma 30 px wysokości, `styles.css` l. 275). Lepszy jest krótki znacznik pod paskiem albo kropka na pasku. Napis „Dziś · 2026” zostaje klikalny.
- [ ] **Krok i przyciąganie:**
  - strzałki na klawiaturze przesuwają o 1 rok, a Page Up / Page Down o 5 lat (dziś `step = 0.1`, więc strzałka przesuwa o 0,1 roku);
  - po puszczeniu suwaka rok zaokrągla się do pełnego, z wyjątkiem odtwarzania;
  - w odległości do pół roku od „Dziś” suwak przyciąga się do „Dziś”.
- [ ] **Obszar dotyku na telefonie** co najmniej 44 px wysokości (dziś pasek ma 26 px, `styles.css` l. 267, 276). Wystarczy niewidoczny margines wokół `input`.
- [ ] **Oś radarowa** dostaje to samo kółko, te same kolory i ten sam znacznik. Napis „brak danych” na odcinku 2022–2025 trzeba doprecyzować, np. „2022–2025: brak zdjęć w paśmie L (ALOS-2 do 2021, NISAR od 2026)” (`i18n_sar.js`, klucz `noRadarData`).

## 4. Sprawdzenie po zmianach

- [ ] PL i EN, tryb jasny i ciemny, szerokość 1440 px i 390 px.
- [ ] Chrome, Safari i Firefox, bo wygląd kółka zależy od pseudo-elementów każdej przeglądarki.
- [ ] Kliknięcie „Dziś”: kółko dokładnie na kresce, rok 2026.
- [ ] Odtwarzanie 1975 → 2035: płynne, kolor zmienia się dopiero po przejściu w prognozę.
- [ ] Mapa, legenda, wykres w karcie i plakietka używają nowych kolorów prognozy. Nigdzie nie został fiolet.
- [ ] Obsługa z klawiatury: Tab, strzałki, Page Up / Page Down, Enter na „Dziś”.
