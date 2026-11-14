# Wskazówki dla agentów: SpaceWalkers / SARnik

## Prezentacja na pitch

Gdy ktoś prosi o „prezentację”, „pitch”, „slajdy” albo „pokaz”, chodzi o **interaktywny pitch SARnika na 3 minuty**:
strona w przeglądarce, Spacja to kolejny krok, kamera przybliża prawdziwe zrzuty aplikacji.

- **Kod:** `poznan-trend-detective/promo/prezentacje/interaktywna/`
  - `steps.js`: treść i kadry kroków (tu robi się prawie wszystkie zmiany),
  - `index.html`: silnik (kamera, klawisze, licznik), bez bibliotek i bez kroku budowania,
  - `img/`: zrzuty aplikacji; nowe robi `poznan-trend-detective/promo/capture_hires.py`.
- **Publiczny link: na razie brak (decyzja zespołu).** Hosting czeka na **MichallMaciek**, właściciela repo:
  tylko on może włączyć GitHub Pages (Settings → Pages → Source: „GitHub Actions”). Wtedy gotowy workflow
  `.github/workflows/pitch-pages.yml` sam opublikuje pitch pod https://michallmaciek.github.io/NASA-SpaceWalkers/pitch/.
  Do tego czasu pitch uruchamiamy lokalnie (niżej). Nie publikuj go pod innymi publicznymi adresami
  (raw.githack, htmlpreview, Firebase itp.), dopóki MichallMaciek się nie odezwie.
- **Uruchom lokalnie:**
  ```bash
  cd poznan-trend-detective/promo/prezentacje/interaktywna && python3 -m http.server 8000
  ```
  potem http://localhost:8000. Spacja: dalej, ←: wstecz, N: notatki prelegenta, T: licznik 3:00, F: pełny ekran.
- **Zmiany:** edytuj, przejdź wszystkie kroki lokalnie (konsola bez błędów), zrób push do `main`. Gdy MichallMaciek
  włączy GitHub Pages, workflow opublikuje każdą zmianę sam; do tego czasu kończy się na zielono i nic nie publikuje.
  Nie trzeba logowania do Firebase ani żadnych kluczy, tylko prawo do pusha.
- **Pełna instrukcja:** `poznan-trend-detective/promo/prezentacje/interaktywna/README.md`.

Zasady: liczby tylko z aplikacji i z sekcji „Dowody” w `README.md` repo (albo z `poznan-trend-detective/web/data`);
3 minuty, ok. 17 kroków; wygląd aplikacji według `poznan-trend-detective/docs/DESIGN.md` (Archivo, bez wersalików,
bez monospace, bez kart z cieniem, bez „kostiumów”); żadnych haseł, tokenów ani kluczy w repo (jest publiczne).

Starsze materiały: trzy pitche (Markdown ze scenariuszami, slajdy) w `poznan-trend-detective/promo/prezentacje/`,
filmy promo i ich skrypty w `poznan-trend-detective/promo/`. Powstały przed przejściem aplikacji na SARnika.
