# 01. Mokry grunt wokół działki

**Poziom:** demo. **Flaga w karcie:** „Mokry grunt”.

## Problem
Kupujesz dom latem, w suchy tydzień. Po pierwszej mokrej jesieni woda stoi w ogrodzie i wchodzi do piwnicy. Sprzedający o tym nie wspomniał, a prospekt tego nie wymaga. Dotąd jedynym sposobem było zlecić badanie geotechniczne albo pytać sąsiadów.

## Dlaczego zdjęcie tego nie pokaże
Kamera widzi kolor powierzchni. Mokra i sucha łąka wyglądają podobnie, a w dni deszczowe są chmury i zdjęcia nie ma wcale.

## Co robi radar
- Woda podnosi stałą dielektryczną gleby, więc mokry grunt odbija silniej (HH rośnie).
- Pasmo L dociera do gleby przez trawę i uprawy, gdzie pasmo C już nie reaguje. W badaniach pasmo L HH reagowało na wilgoć pod gęstą pszenicą i trawą, a pasmo C przestawało przy gęstej zieleni.
- Radar działa przez chmury, więc mamy przelot tuż po deszczu.

## Jak to liczymy
1. Para przelotów z tej samej orbity: suchy (25.06.2026) i mokry (24.08.2026), orbita 158. Pary dla pozostałych orbit są w `progres/p1/podsumowanie_wajlk.md`.
2. Różnica HH mokry minus suchy w dB, liczona w mocy liniowej i uśredniona do ok. 100 m.
3. Maska: tylko otwarty teren (bez zabudowy, lasu i wody).
4. Wynik względny: piksel na tle swojego otoczenia. Flaga czerwona, gdy teren jest wyraźnie mokrzejszy niż sąsiedztwo.
5. Rozszerzenie: zamiast jednej pary cały szereg, czyli jak często piksel jest w górnej części własnego zakresu.

## Weryfikacja
- Strefy powodziowe ISOK (WMS Wód Polskich): czy flaga częściej pada w strefie niż poza nią.
- Wskaźnik wilgotności z rzeźby terenu (TWI) z NMT 1 m.
- Obszary podtopień PIG-PIB, które są już w aplikacji.
- Jedna liczba do pitchu: „flaga pada X razy częściej w strefach podtopień niż poza nimi”.

## Ograniczenia
- To nie jest pomiar wody w piwnicy ani głębokości wód gruntowych. Radar widzi wilgoć przy powierzchni.
- Nie działa na pikselach zabudowanych; oceniamy teren wokół działki.
- Uczciwa skala to ok. 100–200 m, nie pojedyncza parcela.
- W sezonie wegetacyjnym część zmiany odbicia to rośliny, nie woda. Stąd maska i porównanie z otoczeniem.
- Tempa schnięcia nie mierzymy: powierzchnia odsącza się w godziny, a ta sama orbita wraca co 12 dni.

## Zdanie do pitchu
„Radar pokazuje, gdzie grunt wokół działki jest trwale mokrzejszy niż okolica. To informacja, po którą dotąd trzeba było wysłać człowieka w teren.”
