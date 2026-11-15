# Piąty komputer: zabudowa z radaru rok po roku (2007–2026)

> Dopisek wajlk, 15.11.2026, 02:20. Uzupełnia [PLAN.md](PLAN.md), nie zmienia przydziału komputerów 1–4.
> Gałąź `sar-5-radar-lata`, same nowe pliki, otwarty PR dla autora aplikacji: [MichallMaciek/NASA-SpaceWalkers#22](https://github.com/MichallMaciek/NASA-SpaceWalkers/pull/22).

## Po co

Historia zabudowy w aplikacji kończy się na mapie optycznej z 2020 r. (GHSL, Landsat i Sentinel-2).
Lata 2025, 2030 i 2035 są już wyliczone modelem. Radar jest jedynym źródłem, które mówi, co faktycznie
powstało po 2020 r., i robi to co rok, a nie co pięć lat. Ten zestaw daje kupującemu tę samą informację
co dotąd („co się tu buduje, co może powstać obok”), ale liczoną z radaru:

- Sentinel-1 (pasmo C), wszystkie lata 2015–2026, cztery orbity,
- ALOS PALSAR (pasmo L), lata 2007, 2008 i 2010, jeśli jakość na to pozwoli,
- NISAR (pasmo L, dwie polaryzacje i koherencja), rok 2026,
- ALOS-2 (pasmo L), lata 2015–2021, jako niezależne sprawdzenie.

## Pliki (ścieżki względem `poznan-trend-detective/`)

| Co | Ścieżka |
|---|---|
| Kompozyty Sentinel-1 rok po roku | `pipeline/sarnik_radar_lata_s1.py` |
| Sceny ALOS PALSAR 2007–2010 | `pipeline/sarnik_radar_lata_alos.py` |
| Cechy NISAR 2026 | `pipeline/sarnik_radar_lata_nisar.py` |
| Klasyfikacja, rok pierwszej zabudowy, testy | `pipeline/sarnik_radar_lata.py` |
| Prognoza startująca z radaru | `pipeline/sarnik_radar_prognoza.py` |
| Dane modułu | `web/data/sarnik/radar_lata/`, `web/data/sarnik/radar_prognoza/` |
| Moduł karty | `web/sarnik/radar_lata.js` |
| Testy modułu | `tests/sarnik/radar_lata.test.mjs` |
| Opis metody i wyników | `docs/przeglad-v2/RADAR_LATA.md` |

Nie zmieniamy: `web/app.js`, `web/index.html`, `web/i18n*.js`, `web/styles.css`, `web/sarnik/manifest.js`,
`web/data/land/*`, `sar.json`, `land.json`, istniejących skryptów pipeline'u ani `tests/data_contract.py`.

## Dane robocze (git je ignoruje): `data/raw/radar/`

| Plik | Zawartość |
|---|---|
| `s1_<rok>.npz`, 2015–2026 | `vv_db`, `vh_db` (float32, 898 × 956, lato: mediana w orbicie, średnia z orbit), `vv_std_db`, `n`, `dates`, `orbits` |
| `alos1_<rok>.npz`, 2007, 2008, 2010 | `hh_db`, `hv_db` (float32, 898 × 956, NaN = brak), `dates` |
| `nisar_features.npz` | `hh_mean`, `hv_mean` (moc liniowa), `hh_std_db`, `coh_mean`, `coh_min`, `coh_l_max` i inne |
| `built_years.npz` | `years` (lista lat), `prob` (rok × 898 × 956, prawdopodobieństwo zabudowy 0–1), `first_year` (898 × 956, int16: 0 = poza obszarem, 1 = brak zabudowy do 2026, inaczej rok) |

Siatka: 956 × 898 komórek, EPSG:3857, 120 m (`web/data/land/land.json`, pole `transform3857`).
Zabudowa według mapy optycznej: `web/data/land/built_<rok>.png`, `v/255` = udział zabudowy, próg 0,15
(`land.json`, pole `threshold`); lata obserwowane to 1975–2020, a 2025–2035 to prognoza.

## Dane modułu

`web/data/sarnik/radar_lata/first_year.png`: PNG 8-bit, odcienie szarości, 956 × 898, bez profilu kolorów.

| Wartość | Znaczenie |
|---|---|
| 0 | brak danych (poza obszarem badań) |
| 1 | radar nie widzi zabudowy do 2026 r. |
| 7–26 | zabudowa; radar widzi ją pierwszy raz w roku `2000 + v`. Najmniejsza wartość w pliku to rok początku zapisu (`meta.json`, pole `start_year`) i oznacza „zabudowane już wtedy albo wcześniej” |

`web/data/sarnik/radar_lata/meta.json` (schemat z PLAN.md plus pola modułu):

```json
{ "source": "Sentinel-1 RTC (ESA, Microsoft Planetary Computer); ALOS PALSAR (JAXA, ASF DAAC); NISAR GCOV i GUNW (NASA-ISRO, ASF DAAC)",
  "years": [2007, 2008, 2010, 2015, "...", 2026], "start_year": 2007, "last_optical_year": 2020,
  "passes": { "total": 0, "by_year": { "2015": 0 } },
  "cell_ha": 0.536,
  "study": { "built_share_pct": { "2015": 0.0 }, "new_ha_since_2020": 0.0 },
  "near_1km": { "new_ha_since_2020_quantiles": { "50": 0.0, "75": 0.0, "90": 0.0, "95": 0.0, "99": 0.0 } },
  "layers": [ { "name": "first_year", "file": "first_year.png", "decode": { "scale": 1, "offset": 2000, "unit": "rok" },
                "ramp": ["#2b2b2b", "#f2a31b"], "legend_pl": "…", "legend_en": "…" } ],
  "checks": { "<test>": { "what": "…", "cells": 0, "ratio": 0.0, "ci95": [0.0, 0.0], "passed": true } } }
```

`web/data/sarnik/radar_prognoza/prob_5y.png`: `(v/255)^2` = szansa, że wolna komórka zostanie zabudowana
w ciągu 5 lat, licząc od stanu z radaru w 2026 r.; 0 = brak danych albo komórka już zabudowana.
`web/data/sarnik/radar_prognoza/meta.json`: źródło, `start_year` (2026), `horizon_years` (5), `checks`,
`quantiles_open` (kwantyle szansy wśród wolnych komórek, żeby moduł mógł napisać „więcej niż w N% miejsc”).

## Zasady (z PLAN.md)

- Limit danych: oba foldery razem najwyżej 0,6 MB.
- Wiersz karty ma poziom `info`. `warn` wolno dać tylko wtedy, gdy odpowiedni test w `meta.json` ma `passed: true`.
- Prosty język, bez dB w treści. Brak danych to `info`, nigdy „w normie”.
- Każda liczba pochodzi z kodu w repo. Testy uwzględniają, że sąsiednie komórki nie są niezależne
  (bloki ok. 2 km, bootstrap blokowy). Wynik, który się nie potwierdził, opisujemy wprost.
- Dane pobrane z sieci czytamy izolowanym interpreterem: `.venv/bin/python -I pipeline/<skrypt>.py`.
- Agenci nie robią commitów. Gałąź, commit i PR robi osoba przy komputerze.

## Co wyszło inaczej niż w tej specyfikacji (15.11, 02:45)

- **Zapis zaczyna się w 2015 r.** ALOS PALSAR z lat 2007–2010 nie przeszedł testu dołączenia do szeregu,
  więc w `first_year.png` są wartości 0, 1 i 15–26, a lata 2007, 2008 i 2010 są tylko w `meta.json`
  (pole `lband_history`, niska pewność).
- **Folder `web/data/sarnik/radar_prognoza/` nie jest w repo.** Prognoza liczona od radaru prawie nie różni
  się od obecnej, a jej wiersz dublowałby istniejący. Skrypt zapisuje wynik do `data/raw/radar/radar_prognoza/`,
  a z opcją `--web` do folderu aplikacji. Wiersz włącza pole `prognoza.row` w `radar_lata/meta.json`.
- **Dane modułu zajmują 46 kB,** a nie 0,6 MB.
- **Nocne testy NISAR** są w `tests/nauka/nisar_*.py`.
- **Wyniki i granice metody:** [RADAR_LATA.md](../przeglad-v2/RADAR_LATA.md).
