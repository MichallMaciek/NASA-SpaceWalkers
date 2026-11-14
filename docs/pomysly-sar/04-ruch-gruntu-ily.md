# 04. Ruch gruntu, iły poznańskie, osuwiska

**Poziom:** kierunek rozwoju. W demie co najwyżej warstwy odniesienia.

## Problem
Pęknięcia ścian wychodzą po latach. Pod Poznaniem leżą iły serii poznańskiej, które pęcznieją i kurczą się z wilgotnością. Literatura podaje sezonowe ruchy rzędu 10 cm i szkody ujawniające się często po 10–30 latach, czyli długo po upływie rękojmi.

## Dlaczego zdjęcie tego nie pokaże
Milimetrowych ruchów powierzchni nie widać na żadnym zdjęciu.

## Co robi radar
Interferometria porównuje fazę sygnału z dwóch przelotów i mierzy ruch w kierunku satelity. Pasmo L trzyma spójność sygnału na terenach zielonych lepiej niż pasmo C, więc NISAR po kilku latach da pomiar tam, gdzie Sentinel-1 ma dziury.

## Co da się uczciwie pokazać dziś
- **EGMS** (europejska usługa ruchu gruntu, z Sentinel-1): historia z ostatnich lat jako warstwa pomiarowa. Zespół ma już adres warstwy PIG-PIB 2016–2020 w `docs/PLAN.md`.
- **Mapa geologiczna:** zasięg iłów poznańskich jako flaga „grunt wymagający badania”.
- **NISAR GUNW:** tylko mapa koherencji (gdzie powierzchnia jest stabilna, a gdzie się zmienia), 80 m.
- **SOPO** (rejestr osuwisk PIG-PIB): warstwa odniesienia. Nie potwierdziliśmy, czy obejmuje skarpy Warty w Poznaniu.

## Czego nie wolno obiecywać
- Tempa osiadania w mm na rok z 5 miesięcy NISAR.
- Sezonowego ruchu iłów z NISAR: potrzeba ponad roku danych.
- Ruchu pionowego: interferometria daje ruch w linii patrzenia satelity.
- Odpowiedzi dla pojedynczej działki z piksela 80 m.
- Wyniku bez poprawki jonosferycznej; w paśmie L ten błąd jest wielokrotnie większy niż w C.

## Zdanie do pitchu
„Za trzy lata NISAR pokaże, czy grunt pod osiedlem pracuje. Dziś pokazujemy, gdzie leżą iły, i historię z radaru europejskiego.”
