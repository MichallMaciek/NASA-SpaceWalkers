# 03. Porównanie pasm L i C

**Poziom:** demo. **W aplikacji:** panel „Jak widzi radar”.

## Po co
Wyzwanie pyta wprost o różne polaryzacje i częstotliwości. Dla kupującego to dowód, że NISAR pokazuje coś, czego wcześniejsze radary nie pokazywały.

## Dane
- **Pasmo L:** NISAR GCOV, HH i HV, 20 m, VI–X 2026.
- **Pasmo C:** Sentinel-1 RTC, VV i VH, 10 m, od 2014. Skrypt `fetch_s1` pobiera dziś tylko VV; trzeba dodać VH.
- Pasma S nie używamy: jest zbierane głównie nad Indiami.
- Opcja na później: mozaiki ALOS PALSAR (pasmo L, 25 m, 2007–2010 i 2015–2020) jako „wehikuł czasu”.

## Co widać na którym paśmie

| Teren | Pasmo L (ok. 24 cm) | Pasmo C (ok. 5,6 cm) | Znaczenie dla kupującego |
|---|---|---|---|
| Gleba i wilgoć | dociera do gruntu pod trawą i uprawami | reaguje tylko przy gołej ziemi lub niskiej roślinności | mokry grunt widać także latem |
| Las | przenika korony, widzi pnie i grunt | zatrzymuje się w koronach | wycinkę i podmokły las widać wyraźniej |
| Uprawy | słabsza reakcja na łan | silna reakcja, dobre do upraw | pasmo C lepiej odróżnia pole od budowy |
| Mokradła | woda pod roślinnością daje silne HH | słabsze przenikanie | teren zalewowy pod zaroślami |
| Zabudowa | silne odbicie, zależne od ustawienia ulic | ostrzejszy obraz, też zależny od ustawienia | oba pasma razem zmniejszają liczbę pomyłek |
| Drogi, tory, mosty | brak dobrych źródeł | brak dobrych źródeł | patrz pomysł 06 |

## Jak to pokazujemy
Cztery miejsca wybrane ręcznie: las w Wielkopolskim Parku Narodowym, pole w Dopiewie, łąka nad Wartą, nowe osiedle. Dla każdego dwa obrazy obok siebie i wykres szeregu z obu radarów.

## Ograniczenia
- Różne rozdzielczości i kąty patrzenia; porównujemy charakter sygnału, nie wartości piksel w piksel.
- Daty przelotów obu satelitów się nie pokrywają; bierzemy najbliższe.
- Kolorowa kompozycja HH/HV to nie klasyfikacja pokrycia terenu.
