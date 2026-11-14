# Prezentacje na pitch: trzy gotowe wersje

> **Najnowsze:** interaktywny pitch SARnika na 3 minuty (spacja = kolejny krok, kamera przybliża zrzuty aplikacji):
> https://raw.githack.com/MichallMaciek/NASA-SpaceWalkers/main/poznan-trend-detective/promo/prezentacje/interaktywna/index.html
> (po włączeniu GitHub Pages także https://michallmaciek.github.io/NASA-SpaceWalkers/pitch/), źródło w
> [interaktywna/](interaktywna/README.md). Każdy push do `main` aktualizuje stronę, bez logowania i bez kluczy. Trzy pitche poniżej powstały przed zmianą aplikacji w SARnika
> (radar SAR w centrum), więc ich treść warto zestawić z aktualnym README repo.

Trzy kompletne pitche na żywo (po 3–4 minuty) dla aplikacji Poznań Trend Detective, NASA Space Apps Challenge 2026,
Poznań. Każdy ma inny sens produktu, inną publiczność i inny design. Na scenę wybieracie jeden.

| Plik | Pitch | Dla kogo | Sens w jednym zdaniu |
|---|---|---|---|
| [pitch1_przeglad_techniczny.md](pitch1_przeglad_techniczny.md) | Przegląd techniczny działki | kupujący, cała sala | Największy zakup życia, a nikt nie robi przeglądu terenu; pokazujemy przegląd i przycisk „Sprawdź teren” przy każdym ogłoszeniu. |
| [pitch2_ziemia_pamieta.md](pitch2_ziemia_pamieta.md) | Ziemia pamięta | jury NASA | Satelity patrzą na tę ziemię od ponad 50 lat; prowadzimy przez archiwum rok po roku, każdy trend sprawdzony testem. |
| [pitch3_ryzyko_terenu.md](pitch3_ryzyko_terenu.md) | Ryzyko terenu ma adres | banki, ubezpieczyciele, gminy | Od 2026 r. ryzyko terenu trzeba liczyć; dajemy otwarty, sprawdzalny przegląd z danych NASA dla każdego miasta. |

Rekomendacja na jury NASA Space Apps: pitch 2 (najmocniejszy w kryteriach Relevance i Validity). Najprostszy dla każdego,
z emocją i demo na żywo: pitch 1.

## Co jest w folderze

- `pitch*.md`: każdy slajd po kolei: tytuł, tekst na slajdzie, opis obrazów, oznaczenie *(klik)* dla elementów
  odsłanianych kliknięciem i pełny scenariusz prelegenta (kto mówi, co mówi, ile czasu, plan B, odpowiedzi na pytania jury).
- `podglad/*.jpg`: podgląd każdego slajdu (1280×720). `start.jpg` to slajd przeglądowy z porównaniem trzech pitchy.
- `slajdy/`: źródło prezentacji: `deck.json` (kolejność i fonty), `deck.css` (trzy style), `slides/*.html` (jeden slajd
  na plik, notatki w `<aside>`). Obrazy w HTML wskazują na zasoby artefaktu (`/_blob/...`), więc poza nim się nie
  wczytają; ich wygląd widać w `podglad/`.

Prezentacja na żywo (z animacjami i kliknięciami) to artefakt Claude „Trzy pitche: Poznań Trend Detective”
(claude.ai/artifact/QBGjkh1HSWusP3vgLfTnNo). Jest prywatny: otworzy go tylko właściciel, chyba że udostępni go w menu Share.
Stamtąd można też pobrać PPTX albo PDF.

## Skąd liczby

- Liczby z aplikacji pochodzą z `web/data/land/land.json` i `web/data/study.json` (tabela źródeł: `promo/README.md`).
- Kwoty 30 000 zł i 1 000 000 zł są poglądowe (hak zespołu), to nie dane.
- Fakty spoza aplikacji są tylko w pitchu 3 i mają źródła w notatkach slajdu `c2`. Sprawdźcie je przed pitchem, bo
  źródła branżowe podają je różnie:
  - wytyczne EBA o ryzykach ESG: duże banki od 11.01.2026;
  - powódź 2024 dotknęła ponad 230 tys. osób (UOKiK);
  - termin uchwalenia planów ogólnych gmin przesunięty na 2026 r. (bez konkretnej daty na slajdzie).

## Zasady designu, których się trzymamy

Zgodnie z `docs/DESIGN.md`: bez „kostiumów” (teczki detektywa, maszynopis, pieczątki), bez etykiet wersalikami nad
tytułami, bez monospace, bez kart z cieniem, bez przyciemnianych pudełek. Typografia, cienkie linie i kolor tylko tam,
gdzie coś znaczy (status, dane).

## Inne materiały promo

W `promo/` są skrypty filmów reklamowych. Filmy (`out/*.mp4`, 17–39 MB) i najnowszy film-pitch z głosem ElevenLabs
(`out/pitch_pl_16x9.mp4`, 2:06) nie są w repozytorium.
