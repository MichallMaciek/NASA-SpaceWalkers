# Narracja PL: reklama 16:9 (prezentacja na żywo, ok. 85 s)

Lektor: ElevenLabs, model `eleven_v4`, głos „Piotr - lektor PASUJE” (szczegóły w `README.md`).
Hak (sceny `hook_car` i `hook_house`) to oryginalne słowa zespołu. Kwoty 30 000 zł i 1 000 000 zł są poglądowe, to nie dane.

Format, czytany przez `tts.py` i `build.py`:
każda sekcja `## <scena>` to jedna scena filmu, każda linia `- ` to jeden napis i fragment lektora.
Po `||` jest wersja dla lektora, gdy ma przeczytać tekst inaczej niż w napisie (liczby słownie, skróty).
Liczby z danych sprawdza `build.py` (sekcja CHECKS) przy każdym budowaniu.

## hook_car
- Gdy kupujesz używany samochód za 30 tysięcy, jedziesz na stację diagnostyczną: || Gdy kupujesz używany samochód za trzydzieści tysięcy, jedziesz na stację diagnostyczną:
- mierzysz grubość lakieru, sprawdzasz geometrię ramy i wycieki oleju.

## hook_house
- Gdy kupujesz dom lub działkę za 1 000 000 zł… || Gdy kupujesz dom lub działkę za milion złotych...
- oglądasz ładne zdjęcia na OtoDomie i wierzysz deweloperowi na słowo!
- Nikt nie robi technicznego prześwietlenia terenu!

## title
- My zrobiliśmy je z danych satelitarnych: Poznań Trend Detective.

## search
- Wpisz adres albo obrysuj działkę, a dostaniesz przegląd techniczny terenu:

## card
- historię zabudowy i jej prognozę, wskaźnik ryzyka zabudowy, wycinkę drzew, upał,
- obszary podtopień (PIG-PIB), obniżenia terenu, radar i cenę metra. || obszary podtopień, obniżenia terenu, radar i cenę metra.

## timeline
- Wokół Poznania zabudowa w 30 lat wzrosła ponad dwukrotnie. || Wokół Poznania zabudowa w trzydzieści lat wzrosła ponad dwukrotnie.
- Model pokazuje, gdzie miasto urośnie dalej.
- Na latach, których nie widział, trafił 56% nowej zabudowy. || Na latach, których nie widział, trafił pięćdziesiąt sześć procent nowej zabudowy.
- To ranking, nie wyrok.

## heat
- Letnie noce ociepliły się istotnie prawie wszędzie, a żaden kwadrat się nie ochłodził.
- A im szybciej rosła gmina, tym szybciej nagrzewały się jej letnie dni.

## data
- Dane: NASA MODIS, NISAR, Landsat, Sentinel-1, Copernicus DEM, GUS i IMGW. || Dane: NASA MODIS, NISAR, Landsat, Sentinel jeden, Copernicus DEM, GUS i i-em-gie-wu.
- Każdy trend sprawdzamy testem Manna-Kendalla i Theila-Sena.

## close
- Poznań Trend Detective. Sprawdź teren, zanim podpiszesz.
