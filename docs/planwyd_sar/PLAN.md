# Plan na 4 komputery: nowe dane SAR (NISAR GUNW, GCOV tor 57, SME2, ALOS 2007–2010, OPERA DIST) w SARniku

> Stan: niedziela 15.11.2026 rano, `main` = `1346ba9`. Bramka 14:00 (decyzja o wersji), koniec zmian 16:00, zgłoszenie do 23:59.
> Cel: NISAR ma być podstawą wniosków, a nie ilustracją. Audyt (`docs/przeglad-v2/ZGODNOSC_Z_WYZWANIEM.md`) wykazał, że NISAR ma 0 z 7 wierszy w karcie miejsca, a 9 przelotów nie jest animowanych.
> Dane SAR każdy ma lokalnie (`dane/sar/`, ok. 2,3 GB). **Do repozytorium trafiają tylko małe warstwy przeliczone na siatkę aplikacji**, nigdy surowe pliki.

## Kto co robi

| Urz. | Zadanie | Skrypt | Gałąź | Wolno zmieniać tylko |
|---|---|---|---|---|
| **1** | **Zmiany według NISAR**: koherencja GUNW (8 par, tor 158), test na decyzjach WUIA, wiersz w karcie | `sar-1-gunw.js` | `sar-1-gunw` | `pipeline/sar_gunw.py`, `web/data/sarnik/gunw/`, `web/sarnik/nisar_zmiany.js`, `tests/sarnik/nisar_zmiany.test.mjs`, `docs/przeglad-v2/NISAR_GUNW.md` |
| **2** | **Polaryzacje i wilgotność**: GCOV tor 57 (HH a HV, czerwiec → wrzesień), SME2, dwa wiersze w karcie | `sar-2-polaryzacje.js` | `sar-2-polaryzacje` | `pipeline/sar_polaryzacje.py`, `pipeline/sar_sme2.py`, `web/data/sarnik/pol/`, `web/data/sarnik/sme2/`, `web/sarnik/nisar_polaryzacje.js`, `web/sarnik/nisar_wilgoc.js`, `tests/sarnik/nisar_polaryzacje.test.mjs`, `tests/sarnik/nisar_wilgoc.test.mjs`, `docs/przeglad-v2/NISAR_POLARYZACJE.md` |
| **3** | **Mapa i integracja (jedyny właściciel `app.js`)**: animacja przelotów NISAR, ogólne wczytywanie nowych warstw, włączenie modułów | `sar-3-mapa.js` | `sar-3-mapa` | `web/app.js`, `web/index.html`, `web/i18n.js`, `web/i18n_sar.js`, `web/styles.css`, `web/sarnik/manifest.js`, `pipeline/sar_animacja.py`, `web/data/sarnik/anim/`, `tests/data_contract.py`, `tests/sarnik/sar3_*.py` |
| **4** | **Historia pasma L i OPERA**: ALOS 2007–2010 obok NISAR 2026, mapa zaburzeń OPERA, wiersze w karcie, tekst o danych NASA | `sar-4-historia.js` | `sar-4-historia` | `pipeline/sar_alos1.py`, `pipeline/sar_dist.py`, `web/data/sarnik/alos1/`, `web/data/sarnik/dist/`, `web/sarnik/historia_l.js`, `web/sarnik/opera_dist.js`, `tests/sarnik/historia_l.test.mjs`, `tests/sarnik/opera_dist.test.mjs`, `docs/przeglad-v2/NISAR_HISTORIA.md`, `docs/deep-pitch/NASA_DANE.md` |

Ścieżki są względne do `poznan-trend-detective/` (poza `docs/`). Zbiory plików się nie przecinają, więc gałęzie scalają się bez konfliktów.

**Nikt nie zmienia:** `web/data/land/*`, `sar.json`, `land.json`, istniejących skryptów pipeline'u, `README*`, `docs/PLAN.md`, `docs/pitch.md`, `docs/poprawa_mapy.md` ani modułów `flood`, `landslide`, `wuia`. Wyjątek: urządzenie 3 zmienia pliki z wiersza 3 tabeli.

## Kontrakt danych (wiążący dla wszystkich czterech)

**Wejście.** Folder z danymi SAR podany w `args.sar` workflow (domyślnie `poznan-trend-detective/data/raw/sar`, który git ignoruje). Układ folderów jak na stronie udostępniania:
| Folder | Zawartość |
|---|---|
| `nisar_gcov/` | `*_gamma0_20m.tif`: pasma HHHH, HVHV, moc liniowa, EPSG:32634, 20 m. `*_mask_20m.tif`. Tor 57 provisional (11 przelotów 18.06–16.10, w tym 2 tylko HH: `SHSH`) oraz 4 przeloty validated (21–29.10). **Wersji nie mieszamy** |
| `nisar_gunw/` | `*_coherence_20m.tif` (0–1, EPSG:32633), `*_unwrapped_80m.tif` (faza w rad, koherencja, jonosfera), `*_components_80m.tif`. Tor 158, 8 par co 12 dni, 25.06–29.09 |
| `nisar_sme2/` | `*_soilmoisture_200m.tif` (m³/m³, niepewność, udział wody; −9999 = brak), `*_flags_200m.tif`. EPSG:6933, tor 158, 10 dat |
| `opera_dist_alert/` | 4 kafle MGRS, warstwy `GEN-DIST-STATUS`, `-CONF`, `-DATE`, `-LAST-DATE`, `-COUNT`. EPSG:32633, 30 m, stan na 28.02.2026 |
| `alos_palsar/` | 6 plików ZIP ALOS PALSAR L2.2 FBD (HH, HV) z lat 2007–2010 |

**Siatka wyjściowa.** Ta sama co w aplikacji: 956 × 898 komórek, EPSG:3857, piksel 120 m. Transformacja jest w `web/data/land/land.json` (`transform3857`), a w Pythonie: `from fetch_urban import TR, W, H` (katalog `pipeline/`). Radar przeliczamy na siatkę, **uśredniając moc liniową** (nie dB), a kategorie biorąc najczęstszą wartością.

**Warstwy.** PNG 8-bit w odcieniach szarości (tryb `L`, bez profilu kolorów, tak jak w `build_sar.py`), 956 × 898, gdzie **0 = brak danych**. Każdy folder `web/data/sarnik/<zestaw>/` ma `meta.json`:
```json
{ "source": "NASA-ISRO NISAR GUNW, ASF DAAC", "version": "provisional", "track": 158, "dates": ["2026-06-25", "..."],
  "layers": [ { "name": "coh_min", "file": "coh_min.png", "decode": { "scale": 0.004, "offset": 0, "unit": "" },
                "ramp": ["#2b2b2b", "#f2a31b"], "legend_pl": "…", "legend_en": "…" } ],
  "checks": { "...": "wyniki testów, z liczbą komórek, krotnością, przedziałem ufności i informacją, czy test przeszedł" } }
```
Wartość fizyczna to `v * scale + offset`, liczona dla `v ≥ 1`.

**Limity rozmiaru.** CI wymaga, żeby `web/data` miało poniżej 40 MB (dziś 29,7 MB) i żeby żaden plik nie przekraczał 3 MB. Przydział:
| Urządzenie | Limit |
|---|---|
| 1 | 2 MB |
| 2 | 2,5 MB |
| 3 | 3 MB |
| 4 | 2 MB |

**Moduły karty.** Według `docs/planwyd/KONTRAKT.md` z jednym dodatkiem (wersja 1.1, robi go urządzenie 3): `ctx.loadGray(name, dir)`. Gdy podany jest `dir`, wczytuje `data/<dir>/<name>.png`, np. `ctx.loadGray("coh_min", "sarnik/gunw")`. Moduł woła to w `onSelect`, a `checks` czyta wynik z `ctx.L8[dir + "/" + name]`. Do tego czasu testy w Node używają `fake_core.mjs`, bo sztuczny `loadGray` przyjmuje dowolne argumenty.

**Zasady wierszy:**
- Domyślny poziom to `info`. `warn` wolno dać tylko wtedy, gdy test zestawu przeszedł (`meta.json` → `checks.<test>.passed === true`).
- Prosty język, bez dB w treści. Źródło w polu `src`, z wersją danych i datami. `sar: "yes"` dla wierszy z radaru.
- Brak danych to zawsze `info` z tekstem „brak danych”, nigdy „w normie”.

**Uczciwość.** Każda liczba pochodzi z kodu w repo. Testy statystyczne uwzględniają, że sąsiednie komórki nie są niezależne: przerzedzenie albo bootstrap blokowy, jak zaleca `docs/przeglad-v2/NAUKA.md`. Wynik, który się nie potwierdził, opisujemy wprost.

**CI.** W CI nie ma danych SAR. Testy modułów w `tests/sarnik/*.test.mjs` używają sztucznych danych (małe tablice w kodzie testu). Skrypty pipeline'u kończą się czytelnym komunikatem, gdy nie ma folderu z danymi.

## Jak uruchomić (każde urządzenie)
1. `git pull` na `main`.
2. Dane: skopiuj albo podlinkuj swój folder `dane/sar` do `poznan-trend-detective/data/raw/sar`, albo podaj ścieżkę w `args.sar`.
3. W Claude Code wklej, ze swoim numerem skryptu:
```
Uruchom narzędziem Workflow skrypt docs/planwyd_sar/sar-1-gunw.js z tego repozytorium:
scriptPath = pełna ścieżka do tego pliku, args = {"repo": "<pełna ścieżka do repozytorium>", "sar": "<pełna ścieżka do dane/sar>"}.
Nie zmieniaj skryptu. Gdy skończy: przejrzyj zmiany (git status, git diff), zrób gałąź podaną w wyniku,
zrób commit bez prywatnego adresu e-mail, wypchnij gałąź i otwórz PR z opisem zwróconym przez workflow.
```
Agenci w workflow nie robią commitów. Gałąź, commit i PR robi osoba przy komputerze.

## Scalanie i terminy
| Godzina | Krok |
|---|---|
| **teraz** | wszyscy startują jednocześnie z aktualnego `main`; nikt na nikogo nie czeka |
| **do 13:00** | PR-y 1, 2 i 4. Są to same nowe pliki, więc wchodzą w dowolnej kolejności, a do czasu włączenia w manifeście są bezczynne |
| **do 13:30** | PR 3 jako ostatni: włącza moduły w `manifest.js` (`flood`, `landslide`, `{name:"wuia", css:true}`, `nisar_zmiany`, `nisar_polaryzacje`, `nisar_wilgoc`, `historia_l`, `opera_dist`) i pokazuje nowe warstwy. Warstwa bez swojego `meta.json` się nie pokazuje, więc kolejność scalania niczego nie psuje |
| **14:00** | bramka: test w przeglądarce na złożonej całości. Potem wdrożenie na Firebase (robi właściciel projektu) |
| **16:00** | koniec zmian w aplikacji |

## Dopisek wajlk, 15.11.2026, 09:30: co z zadań komputera 3 jest już w `main`

Nikt nie zaczął jeszcze zadań z tego planu, a animacja przelotów NISAR jest najbliżej tego, o co prosi wyzwanie,
więc zrobiłem ją osobno (PR #28). Żeby nikt nie robił tego drugi raz:

| Punkt zadań komputera 3 (`sar-3-mapa.js`) | Stan |
|---|---|
| 1. Kontrakt 1.1: `ctx.loadGray(name, dir)` | **zrobione** (#28) |
| 2. Ogólne warstwy z `web/data/sarnik/<zestaw>/meta.json` | do zrobienia |
| 3. Animacja przelotów NISAR (`pipeline/sar_animacja.py`, `web/data/sarnik/anim/`) | **zrobione** (#28): 10 przelotów toru 57, 1,45 MB |
| 4. Manifest z modułami komputerów 1, 2 i 4 | do zrobienia; dziś w manifeście są `dzialka` i `radar_lata` |
| 5. Poprawki tekstów z audytu (punkty 6 i 7) | do zrobienia |
| 6. `tests/data_contract.py` dla zestawów `sarnik` | do zrobienia |

Inne zmiany w `app.js` z dzisiejszego ranka (PR #24): lata 2021–2026 w widoku „Historia”, w karcie i w prognozie
są liczone z radaru (`web/data/sarnik/radar_lata/`). Kto uruchamia `sar-3-mapa.js`, powinien zacząć od świeżego `main`.

Budżet danych: `web/data` ma teraz 32,9 MB z 40 MB.

Uzupełnienie z 10:20: punkty 5 (poprawki tekstów z audytu) i 6 (`tests/data_contract.py` dla zestawów `sarnik`)
są zrobione w PR #30, razem z wierszem NISAR w karcie, legendą na telefonie i nazwą SARnik na stronie.
Z zadań komputera 3 zostają punkty 2 (ogólne warstwy z `meta.json`) i 4 (manifest), oba czekają na dane
komputerów 1, 2 i 4.
