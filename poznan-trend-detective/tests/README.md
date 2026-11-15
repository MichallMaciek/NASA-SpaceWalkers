# Testy SARnika

Uruchamiaj z katalogu głównego repozytorium. Python z Playwrightem: `poznan-trend-detective/.venv/bin/python` (przeglądarka: systemowy Chrome, `channel="chrome"`).

- `node --check poznan-trend-detective/web/*.js` – składnia JS (błąd składni wyłącza całą stronę).
- `node poznan-trend-detective/tests/app_parts.mjs` – części rdzenia (`web/app/*.js`, `web/css/*.css`): każda to poprawny skrypt przeglądarki, są wszystkie w `index.html` po kolei, żadna nazwa nie powtarza się między częściami ani nie zasłania nazwy przeglądarki, moduły `web/sarnik/` nie dokładają nazw globalnych.
- `node poznan-trend-detective/tests/i18n_parity.mjs [--strict]` – te same klucze i wywołania tekstów po polsku i angielsku.
- `node poznan-trend-detective/tests/sarnik/radar_w_rdzeniu.test.mjs` – strażnik funkcji radarowych: czyta pliki rdzenia i sprawdza, czy oś lat radaru, przeloty NISAR, zabudowa z radaru na mapie i w karcie oraz radar w prognozie są nadal podpięte. Chodzi w CI razem z testami modułów. Powstał 15.11, gdy oś lat radaru wypadła przy przebudowie osi czasu.
- `python3 poznan-trend-detective/tests/data_contract.py` – pliki danych w `web/data`: klucze czytane przez rdzeń (`web/app/*.js`), warstwy PNG 956 × 898, reguły dekodowania, rozmiary, brak kluczy API.
- `.venv/bin/python poznan-trend-detective/tests/e2e_sarnik.py --serve poznan-trend-detective/web --port 8742` – testy w przeglądarce (punkt 12 w docs/poprawa_mapy.md): oś czasu, suwaki, karta miejsca, rysowanie obszaru, PL i EN, tryb ciemny, link do miejsca, przycisk „Dziś” i chowanie dymka. Sam uruchamia i zatrzymuje serwer. `--quick` = tylko PL 1440×900, `--shots DIR` = do 12 zrzutów JPEG.
  Od 15.11 (karta z oceną działki) 15 scenariuszy × 4 (PL i EN, 1440×900 i 390×844) = 60 przebiegów (od 12:30 także: liczba na kafelku z przykładem równa się ocenie w karcie, którą kafelek otwiera). Pilnują też radaru: wiersze „Z radaru SAR” w karcie (Stary Rynek, Naramowice), zdanie banera tylko z radaru i bez usuniętych twierdzeń, lata 2021–2026 z radaru w widoku „Zabudowa i prognoza”, przeloty NISAR z lata 2026, wszystkie widoki w kadrze na 1440 px i strona bez zestawów `radar_lata` i `anim`.
- `.venv/bin/python poznan-trend-detective/tests/small_fixes_check.py [--ofm-delay 25]` – sprawdza drobne poprawki z przeglądu v2 (bez serwera, pliki czytane z dysku).
- `tests/network/net_check.py` – zachowanie przy wolnej lub zerwanej sieci.

Testy przeglądarkowe potrzebują internetu (OpenFreeMap, GEOPOZ); Nominatim jest podstawiony atrapą.

GitHub (`.github/workflows/tests.yml`, przy każdym push i PR dotykającym aplikacji): `node --check`, `i18n_parity.mjs`, `data_contract.py` (z Pillow) i `node docs/planwyd/kontrakt/selftest.mjs`. Bez przeglądarki i bez sekretów; uprawnienia tylko `contents: read`.
