# 06. Infrastruktura: drogi, tory, wały

**Poziom:** kierunek rozwoju. Najsłabiej udokumentowany pomysł; do sprawdzenia przed użyciem w pitchu.

## Problem
Nowa droga, bocznica albo plac składowy obok domu zmienia hałas, ruch i wartość nieruchomości. Stan wałów przeciwpowodziowych decyduje o tym, czy strefa „chroniona” jest naprawdę chroniona.

## Co mógłby robić radar
- **Budowa dróg i placów:** wyrównany, utwardzony teren jest dla radaru gładki i ciemny; zmiana z pola na plac to wyraźny spadek odbicia. Liczy się tak samo jak pomysł 02.
- **Tory, słupy, konstrukcje stalowe:** silne odbicia punktowe. Przy 20 m widać je tylko jako jaśniejsze linie.
- **Wały i nasypy:** osiadanie da się mierzyć interferometrią, ale wymaga wieloletniej serii i rozdzielczości lepszej niż 80 m (patrz pomysł 04).

## Co da się zrobić dziś
Warstwa „nowe utwardzone powierzchnie 2026”: piksele, w których odbicie trwale spadło, przecięte z planowanymi inwestycjami z GEOPOZ (`urbanistyka:bkp_inwestycje_sql`).

## Zastrzeżenie
Opis fizyki powyżej to wiedza ogólna o radarze. Przegląd literatury nie znalazł źródeł porównujących pasma L i C dla dróg, torów i mostów, więc nie podajemy tu liczb ani gotowych werdyktów.
