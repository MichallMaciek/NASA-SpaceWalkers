# Initial idea — koncepcja systemu (Kacper)

> Pierwotna koncepcja projektu. Autor: Kacper (największe doświadczenie w SAR w zespole). Zapisano 2026-11-14, treść bez zmian.
> Aktualny plan uwzględniający tę koncepcję: `docs/PLAN.md`.

Koncepcja systemu analizy terenu na danych SAR (Sentinel 1/2, NISAR) z mapą interaktywną w stylu OtoDOM: heatmapa zabudowy z 30 lat, predykcja rozwoju miast i wycinki lasów, powiązanie z cenami mieszkań.

## Koncepcja systemu

- System danych dla NASA z interfejsem jak OtoDOM: zaznaczenie miejsca na mapie i analiza trendów na 10, 15 lat
- Źródła danych: Sentinel 1, Sentinel 2 lub NISAR; analiza SAR na bazie amplitudy, świateł lub fazy
- Cel: narzędzie analityczne pobierające jak najwięcej danych o terenie i przekładające zdjęcia na dane

## Analizy i predykcje

- Urbanizacja: metalowe konstrukcje i dachy dobrze widoczne w SAR, GSD pół metra wystarcza do wykrycia budynków
- Heatmapa zabudowy z ostatnich 30 lat i model predykcyjny przyszłego rozrostu na bazie dróg i map
- Połączenie z cenami mieszkań (np. OtoDOM, dane archiwalne), np. Poznań: wzrost cen nowych osiedli względem lokalizacji
- Analiza wycinki i gospodarki lasami: gdzie i dlaczego lasy są usuwane

## Mapa interaktywna

- Mapa ma być wysoce interaktywna, z wieloma suwakami
- Suwak czasu: do połowy zakres historyczny, dalej perspektywa 5 lub 10 lat
- Suwaki wysokości terenu (z danych SAR) i jasności odbicia
- Do przemyślenia: jakie inne dane można włączyć do projektu

## Możliwe rozszerzenia w przyszłości

- Połączyć dane o cenach mieszkań z OtoDomem i sprawdzić, czy ceny na nowo zabudowanych terenach zmieniają się wraz z rozwojem urbanizacji i upływem lat.
- Dodać kontekst ekonomiczny w Polsce, np. płacę minimalną i medianę zarobków, aby porównywać zmiany cen nieruchomości z dochodami.
- Uwzględnić otwarte dane krajowe o cenach nieruchomości za metr kwadratowy; dla Stanów Zjednoczonych rozważyć dane w przeliczeniu na square foot.
