# Teren: podsumowanie sesji (14.11.2026)

Mapa w stylu Otodom do analizy terenu z danych SAR: zaznacz obszar, zobacz historię zabudowy i prognozę.

## 1. Co zrobiłem

- **Makieta w Figmie:** 5 ekranów 1440×900 (widok domyślny, rysowanie ołówkiem, obszar zaznaczony, panel ustawień, tryb predykcji). [Plik Figma](https://www.figma.com/design/8qEh0jyimDVtBxVe6oFCnU)
- **Oś czasu:** 3/4 to dane rzeczywiste (1995–2025), 1/4 to predykcja (2025–2035), z granicą „Dziś".
- **Termin:** Space Apps 2026 trwa 14–15.11, zgłoszenia do niedzieli 23:59. Demo: film do 30 s albo do 7 slajdów.
- **Wyzwanie:** najlepiej pasuje „Dancing with the SARs" (NISAR). Dane NASA są obowiązkowe do nagród globalnych.
- **Rozdzielczość:** Sentinel-1 ma ok. 10 m, więc widać teren zabudowany, nie pojedyncze budynki. Multilook nie poprawia GSD; uśrednianie w czasie tylko zbija szum.
- **Historia 30 lat:** nie z Sentinela (od 2014). Daje ją GHSL: 1975–2030 co 5 lat, 100 m.
- **Prognoza:** realna trafność (Figure of Merit) to ok. 10–40%, więc potrzebny test wsteczny i pokazanie niepewności.
- **Ceny:** Otodom odpada (regulamin). Legalne źródła to RCN (bezpłatny od 13.02.2026) i GUS BDL.

## 2. Dane i źródła

| Nazwa | Do czego | Link |
|---|---|---|
| NISAR (od 10.2026) | Warstwa radarowa „teraz", wymóg wyzwania | [ASF](https://nisar-docs.asf.alaska.edu/availability-overview/) |
| GHSL GHS-BUILT-S | Zabudowa 1975–2030 | [Earth Engine](https://developers.google.com/earth-engine/datasets/catalog/JRC_GHSL_P2023A_GHS_BUILT_S) |
| Dynamic World | Zabudowa roczna 10 m, od 2015 | [Earth Engine](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_DYNAMICWORLD_V1) |
| Sentinel-1 | Radar, historia od 2014 | [Copernicus](https://dataspace.copernicus.eu/node/4026) |
| Hansen GFC v1.13 | Utrata lasu 2000–2025 | [Earth Engine](https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2025_v1_13) |
| Black Marble | Światła nocne, aktywność terenu | [Earth Engine](https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP46A2) |
| GUS BDL API | Ceny za m², wynagrodzenia | [GUS](https://api.stat.gov.pl/Home/BdlApi?lang=en) |
| Zasady konkursu | Kryteria i zgłoszenie | [Space Apps](https://www.spaceappschallenge.org/resources/project-submission-guide) |

## 3. Pliki

- [plan-rozwoju.md](plan-rozwoju.md): pełny plan z harmonogramem do niedzieli, danymi, metodami, stosem i źródłami.
- [teren.html](teren.html): statyczny podgląd 5 ekranów makiety w przeglądarce.
- [gen.py](gen.py): skrypt generujący `teren.html`.

## 4. Problemy i ograniczenia

- Nie ma jeszcze kodu aplikacji ani modelu; istnieje tylko makieta i plan.
- Mapa i liczby w makiecie są przykładowe (+38%, 7 400 zł, pewność 78%).
- Warstwa „Aktywność terenu" nie ma własnego widoku na mapie.
- Lista wyzwań pochodzi ze źródła wtórnego; limity demo odczytane ze stron z datami 2024/2025.
- Sentinel-1 ma nierówne archiwum (jeden satelita od 12.2021 do 01.2025).
- terra-draw jest opisany dla MapLibre 4/5, a rysowanie odręczne nie działa na ekranach dotykowych.
- Elementy w Figmie to zwykłe ramki, nie komponenty.

## 5. Następne kroki

- [ ] Przeczytać treść wyzwania na stronie konkursu i potwierdzić limity demo
- [ ] Założyć projekt Earth Engine i konto ASF/Earthdata
- [ ] Wyeksportować roczne warstwy zabudowy i utraty lasu dla Poznania (COG)
- [ ] Postawić mapę: MapLibre, rysowanie odręczne, suwak czasu
- [ ] Dodać jedną scenę NISAR (limit 3 h)
- [ ] Zbudować prognozę i test wsteczny (uczenie 2017→2020, sprawdzenie 2024)
- [ ] Podpiąć statystyki zaznaczonego obszaru (TiTiler)
- [ ] Nagrać film 30 s lub przygotować 7 slajdów, opisać użycie AI
- [ ] Wysłać zgłoszenie przed niedzielą 23:59
