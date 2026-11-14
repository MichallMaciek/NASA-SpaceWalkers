# 02. Budowa obok i co tam powstanie

**Poziom:** demo. **Flagi w karcie:** „Budowa obok”, „Co tam powstanie”.

## Problem
Kupujesz mieszkanie z widokiem na pole. Rok później stoi tam hala logistyczna. Informacja o planach istniała w urzędzie, ale nikt ci jej nie podał w zrozumiałej formie.

## Dlaczego zdjęcie tego nie pokaże
Ortofotomapa jest aktualizowana raz na rok lub rzadziej. Zdjęcia satelitarne zależą od pogody, więc jesienią i zimą bywają tygodnie bez obrazu.

## Co robi radar
- Nowe ściany dają podwójne odbicie (grunt i ściana), więc HH skacze w górę.
- Zdjęcie humusu i prace ziemne zmieniają szorstkość, co widać przed postawieniem ścian.
- Przelot co kilka dni, niezależnie od chmur.

## Jak to liczymy
1. **Budowa już ruszyła (NISAR 2026).** Zmiana odbicia między początkiem a końcem serii z jednej orbity. W demie suwak „przed / po”. To wykrywanie stanu bieżącego, nie prognoza.
2. **Gdzie miasto urośnie (model).** Obecny model z `pipeline/model_urban.py` plus cechy z Sentinel-1 od 2014: VV, VH, ich stosunek, zmienność w czasie. Test wsteczny 2015→2020 z radarem i bez; publikujemy oba wyniki.
3. **Co powstanie (rejestry).** Decyzje WUIA z `progres/p1/dane/wuia_decyzje.geojson`, pozwolenia GUNB i funkcja budynku z BDOT10k dają typ: hale, bloki, domy.

## Weryfikacja
- 751 decyzji „nowa budowa” (VI–XI 2026): odsetek działek, na których radar widzi zmianę, wobec losowych działek bez decyzji.
- „Prognoza spotyka radar”: ile razy częściej radar widzi zmianę w komórkach, które model wskazał jako ryzykowne.
- Punkt odniesienia z literatury: jedno badanie na Sentinel-1 podaje 90% wykryć przy 5% fałszywych alarmów na scenach z placami budów.

## Ograniczenia
- Pola udają budowę: orka i żniwa zmieniają odbicie podobnie. Potrzebna maska gruntów ornych i weryfikacja decyzjami.
- Odbicie od budynków zależy od ustawienia ulic względem radaru, więc część budów będzie słabo widoczna.
- Typu i materiału zabudowy z piksela 20 m i dwóch polaryzacji nie da się odczytać; bierzemy je z rejestrów.
- Nie znaleźliśmy dowodu, że cechy radarowe poprawiają modele prognozy zabudowy. Nasz test wsteczny to sprawdzi.
- Trafność takich prognoz jest w literaturze niska (wskaźnik Figure of Merit rzędu 0,1–0,3), więc pokazujemy niepewność.

## Zdanie do pitchu
„Model wskazał, gdzie Poznań urośnie. NISAR widzi tam budowę w 2026. Urząd potwierdza to decyzją.”
