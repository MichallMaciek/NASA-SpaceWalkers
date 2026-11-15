# Testy SARnika

Uruchamiaj z katalogu głównego repozytorium. Python z Playwrightem: `poznan-trend-detective/.venv/bin/python` (przeglądarka: systemowy Chrome, `channel="chrome"`).

- `node --check poznan-trend-detective/web/*.js` – składnia JS (błąd składni wyłącza całą stronę).
- `node poznan-trend-detective/tests/i18n_parity.mjs [--strict]` – te same klucze i wywołania tekstów po polsku i angielsku.
- `python3 poznan-trend-detective/tests/data_contract.py` – pliki danych w `web/data`: klucze czytane przez app.js, warstwy PNG 956 × 898, reguły dekodowania, rozmiary, brak kluczy API.
- `.venv/bin/python poznan-trend-detective/tests/e2e_sarnik.py --serve poznan-trend-detective/web --port 8742` – testy w przeglądarce (punkt 12 w docs/poprawa_mapy.md): oś czasu, suwaki, karta miejsca, rysowanie obszaru, PL i EN, tryb ciemny, link do miejsca, przycisk „Dziś” i chowanie dymka. Sam uruchamia i zatrzymuje serwer. `--quick` = tylko PL 1440×900, `--shots DIR` = do 12 zrzutów JPEG.
  Od 15.11 (karta z oceną działki) 14 scenariuszy × 4 (PL i EN, 1440×900 i 390×844) = 56 przebiegów. Pilnują też radaru: wiersze „Z radaru SAR” w karcie (Stary Rynek, Naramowice), zdanie banera tylko z radaru i bez usuniętych twierdzeń, lata 2021–2026 z radaru w widoku „Zabudowa i prognoza”, przeloty NISAR z lata 2026, wszystkie widoki w kadrze na 1440 px i strona bez zestawów `radar_lata` i `anim`.
- `.venv/bin/python poznan-trend-detective/tests/small_fixes_check.py [--ofm-delay 25]` – sprawdza drobne poprawki z przeglądu v2 (bez serwera, pliki czytane z dysku).
- `tests/network/net_check.py` – zachowanie przy wolnej lub zerwanej sieci.

Testy przeglądarkowe potrzebują internetu (OpenFreeMap, GEOPOZ); Nominatim jest podstawiony atrapą.

GitHub (`.github/workflows/tests.yml`, przy każdym push i PR dotykającym aplikacji): `node --check`, `i18n_parity.mjs`, `data_contract.py` (z Pillow) i `node docs/planwyd/kontrakt/selftest.mjs`. Bez przeglądarki i bez sekretów; uprawnienia tylko `contents: read`.
