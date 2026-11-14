# Przekazanie dla komputerów 1, 2 i 4: co już wiadomo o danych z zipów

> Od sesji „design”, noc 14/15.11.2026. Te same pliki (`nisar_gcov.zip`, `nisar_gunw.zip`, `nisar_sme2.zip`,
> `opera_dist_alert.zip`) zostały przetworzone na próbę na siatkę aplikacji i sprawdzone w przeglądarce.
> Te warstwy **nie weszły do `main`**: należą do komputerów 1, 2 i 4 według [PLAN.md](../PLAN.md).
> Działający kod na próbę: [`build_from_zips_pelny.py`](build_from_zips_pelny.py) (zapisuje do `web/data/land/`,
> więc przenieście wyniki do `web/data/sarnik/<zestaw>/` według kontraktu planu).

## Na `main` po tym PR

- Ostry obraz NISAR 2026 (GCOV, tor 057, 20 m) w widoku Radar po przybliżeniu na Poznań: `hr_nisar_hh_med`,
  `hr_nisar_hv_med`, tylko do rysowania. Skrypt: `pipeline/build_from_zips.py`.
- `web/data` = **30,5 MB** według `tests/data_contract.py`. Zostaje **9,5 MB**, czyli dokładnie suma przydziałów
  z planu (2 + 2,5 + 3 + 2). Kto przekroczy swój limit, zablokuje CI pozostałym.

## Fakty o plikach

**Nazwy.** `NISAR_L2_PR_GCOV_<cykl>_<tor>_<A/D>_<ramka>_<tryb>_<pol>_<x>_<start>_<koniec>_<P-wersja>_N_F_J_<licznik>_…`.
Po podziale na `_`: tor = pole 5, polaryzacja = pole 9 (`DHDH` dwie, `SHSH` jedna), data = pierwsze 8 znaków pola 11.
Wersja to pole w postaci `P05023` (provisional) albo `P05036` (validated). Licznik produktu: `_J_001_`, `_J_002_`.

**GCOV.** Tor 057: 9 przelotów `DHDH` w wersji P05023 (18.06, 30.06, 12.07, 24.07, 17.08, 10.09, 22.09, 04.10, 16.10),
do tego 29.08 i drugi plik 22.09 tylko `SHSH` (jedno pasmo) oraz 28.10 w wersji P05036. Pojedyncze przeloty P05036:
tor 158 (23.10), 008 D (24.10), 080 D (29.10). Pliki `*_mask_20m.tif` mają same jedynki (nic nie maskują).
Mediana toru 057 wobec warstwy toru 158 z aplikacji (siatka 120 m, okno miasta, 121 040 komórek):
**HH +0,11 dB, HV +0,30 dB** (rozrzut IQR 1,1 i 0,85 dB), więc oba tory dają zgodny obraz.

**GUNW.** 8 par co 12 dni od 25.06 do **11.10** (ostatnia para 29.09–11.10, nie 29.09).
Plik `*_coherence_20m.tif` to jedno pasmo `coherenceMagnitude` (0–1, EPSG:32633). Plik `*_unwrapped_80m.tif` ma trzy
pasma: faza rozwinięta (rad), koherencja, ekran jonosferyczny. Mediana koherencji z 8 par na obszarze badań:
p10 0,331, p50 0,464, p90 0,669. Miasto (budynki, drogi) wychodzi stabilne, pola zmienne.
Fazy jako osiadania nie używajcie: 5 miesięcy to za mało (zob. `docs/przeglad-v2/NAUKA.md`).

**SME2.** 9 różnych dat (25.06, 07.07, 19.07, 12.08, 24.08, 05.09, 17.09, 29.09, 11.10); 05.09 ma dwa produkty
(`_J_001_` i `_J_002_`), bierzcie nowszy. Pasma: wilgotność (m³/m³), niepewność (ok. 0,04), udział wody; −9999 = brak.
Mediany obszaru po kolei: 0,275, 0,305, 0,211, 0,195, **0,215 (24.08)**, 0,213, 0,206, 0,173, 0,169.

> **Uwaga dla komputera 2 i tekstów:** SME2 daje **25.06 = 0,275, 24.08 = 0,215 m³/m³**, czyli w czerwcu było
> wilgotniej niż w sierpniu. Aplikacja i pitch nazywają tę parę „sucho → mokro” (za Open-Meteo: 0,089 i ok. 0,3).
> SME2 jest wstępny i NASA pisze, że nie jest jeszcze w pełni skalibrowany, ale to drugi sygnał obok uwagi
> „deszcz razem ze żniwami”, że wzrost HH między tymi datami to głównie żniwa i orka. Nie piszcie, że NISAR
> „potwierdza nasiąkanie” w sierpniu.

**OPERA DIST-ALERT-S1.** Kody `GEN-DIST-STATUS` potwierdzone w kodzie źródłowym (`dist_s1/constants.py`, DISTLABEL2VAL):
0 brak, 1/2/3 pierwsze, wstępne, potwierdzone zaburzenie o niskiej pewności, 4/5/6 to samo o wysokiej pewności,
7/8 potwierdzone i zakończone (niska / wysoka), 255 brak danych. `GEN-DIST-DATE` = dni od 2020-12-31; w tych kaflach
1827–1885, czyli **wykrycia z 1.01–28.02.2026 (zima)**. Na polach to w większości szum (orka, mróz, śnieg); sensownie
wychodzi tylko na lasach. Przy udziale ≥ 25% komórki 120 m i lesie z 2000 r. (Hansen ≥ 50%): 3039 komórek
o wysokiej pewności (kody 5, 6, 8) i 1673 o niskiej (2, 3, 7) z 92 389 komórek lasu.
Uwaga przy przeliczaniu: najczęstsza wartość (mode) w komórce 120 m daje prawie zawsze 0, bo zaburzone piksele są
w mniejszości; liczcie **udział** pikseli z danym kodem (średnia z maski 0/1).

Źródła: [OPERA DIST-S1 Product Layers](https://opera-adt.github.io/dist-s1/stable/pages/product_documentation/product_layers),
[dist_s1/constants.py](https://github.com/opera-adt/dist-s1/blob/main/src/dist_s1/constants.py).
