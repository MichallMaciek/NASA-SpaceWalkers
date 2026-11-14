# Kontrakt rozszerzeń SARnik (wersja 1)

Ten plik jest wiążący dla wszystkich pięciu urządzeń. Dzięki niemu moduły pisane równolegle pasują do rdzenia od razu, bez uzgodnień w trakcie.

- **Rdzeń** (Urządzenie 1) implementuje ten kontrakt w `poznan-trend-detective/web/app.js`.
- **Moduły** (Urządzenia 2 i 3) piszą wyłącznie własne pliki i rejestrują się przez `window.SARNIK`.
- **Testy modułów** używają `docs/planwyd/kontrakt/fake_core.mjs`, czyli tego samego kontraktu w Node, bez przeglądarki.

> Zmiana 14.11, 19:20, po porównaniu z gałęzią `v3` autora aplikacji: wiersz ma pole `sar` (grupa w karcie). Rdzeń nie dodaje już osobnego licznika ostrzeżeń, bo `v3` ma nagłówek „N rzeczy do sprawdzenia”.

Poza tą zmianą kontraktu nie zmieniamy w trakcie pracy. Jeśli czegoś brakuje, moduł radzi sobie bez tego i zgłasza brak w opisie PR.

## 1. Pliki i własność

| Co | Ścieżka | Kto może edytować |
|---|---|---|
| Rdzeń aplikacji | `web/app.js`, `web/index.html`, `web/i18n.js`, `web/i18n_sar.js`, `web/styles.css` | tylko Urządzenie 1 |
| Lista modułów | `web/sarnik/manifest.js` | tylko Urządzenie 1 |
| Moduł | `web/sarnik/<nazwa>.js`, opcjonalnie `web/sarnik/<nazwa>.css` | tylko autor modułu |
| Dane modułu | `web/data/sarnik/<nazwa>/…` | tylko autor modułu |
| Skrypt danych modułu | `pipeline/sarnik_<nazwa>.py` | tylko autor modułu |
| Testy modułu | `tests/sarnik/<nazwa>.test.mjs` | tylko autor modułu |

Ścieżki są względne do `poznan-trend-detective/`. Nazwy modułów w tym planie: `flood` (strefa ISOK), `landslide` (osuwiska SOPO), `wuia` („Co tam powstanie”).

**Moduł bez rdzenia jest bezczynny:** jego pliki nie są nigdzie ładowane, więc PR z modułem można zmergować w dowolnej chwili. Moduł zaczyna działać, gdy rdzeń jest w `main`, a nazwa modułu jest w `manifest.js`.

## 2. Ładowanie

`web/sarnik/manifest.js` ustawia listę:

```js
window.SARNIK_MODULES = ["flood", "landslide", "wuia"];
```

Rdzeń tworzy `window.SARNIK` synchronicznie, a potem dla każdej nazwy z listy dokłada do strony `sarnik/<nazwa>.js` (i `sarnik/<nazwa>.css`, jeśli moduł zadeklarował `css: true` w manifeście w postaci `{name, css}`; sama nazwa oznacza brak pliku CSS). Kolejność na liście to kolejność wierszy w karcie.

## 3. `window.SARNIK`

```js
window.SARNIK = {
  version: 1,
  register(name, def) {},   // jedyne wejście dla modułu
  modules: {},              // name -> def (tylko do odczytu)
};
```

`def` może zawierać dowolne z pól:

| Pole | Sygnatura | Kiedy wywoływane |
|---|---|---|
| `i18n` | `{ pl: {...}, en: {...} }` | przy rejestracji; teksty modułu w obu językach |
| `onSelect` | `(sel, ctx) => void` | raz na wybór miejsca, po przygotowaniu `sel.cells` |
| `checks` | `(sel, ctx) => item \| item[] \| null` | przy każdym rysowaniu karty (także przy zmianie roku), synchronicznie |
| `cardTop` | `(sel, ctx) => string` | przy każdym rysowaniu karty; HTML wstawiany pod blokiem radarowym |

Zasady:
- `checks` i `cardTop` **nigdy nie pobierają danych**. Czytają tylko `sel.ext` i dane już załadowane. Pobieranie zaczyna się w `onSelect`.
- Wyjątek w funkcji modułu nie może zepsuć karty: rdzeń łapie go, wypisuje `console.warn` i pomija moduł.
- Moduł nie dotyka DOM poza zwracanym HTML. Zdarzenia podpina przez atrybut `data-sk="<nazwa>:<akcja>"`; rdzeń woła wtedy `def.onAction(akcja, sel, ctx, element)`, jeśli moduł je zdefiniował.

## 4. Wiersz przeglądu (`item`)

```js
{
  id: "flood",            // unikalne w module; rdzeń dodaje prefiks nazwy modułu
  lvl: "ok" | "warn" | "risk" | "info",
  t: "Strefa powodziowa",  // tytuł wiersza
  v: "…",                  // treść (HTML); tekst z zewnątrz MUSI przejść przez ctx.esc
  word: "sprawdzam…",      // opcjonalnie: słowo statusu zamiast domyślnego
  pending: true,           // opcjonalnie: wynik jeszcze nie przyszedł (lvl wtedy "info")
  src: "ISOK, Wody Polskie", // krótki podpis źródła; w prostym przeglądzie to osobna linia pod treścią
  sar: "no"                // grupa w karcie: "yes" = z radaru SAR, "part" = częściowo, "no" = tło z innych źródeł (domyślnie "no")
}
```

Znaczenie poziomów jest takie samo jak w istniejących wierszach: `ok` zielony, `warn` żółty, `risk` czerwony, `info` szary (brak danych, błąd usługi, poza zasięgiem danych). **Brak danych to zawsze `info`, nigdy `ok`.**

Karta w wersji `v3` zaczyna się od prostego przeglądu z nagłówkiem „N rzeczy do sprawdzenia”. Rdzeń dba o to, żeby:
- nagłówek liczył wiersze `warn` i `risk` ze wszystkich źródeł, także modułowych (wiersze `pending` nie są liczone);
- wiersz modułu pojawił się w prostym przeglądzie, w grupie wskazanej przez `sar`, oraz w trybie eksperckim.

Treść `v` to jedno albo dwa proste zdania dla kupującego, bez żargonu i bez dB. Moduły z tego planu (`flood`, `landslide`, `wuia`) nie korzystają z radaru, więc ustawiają `sar: "no"`.

## 5. Wybór miejsca (`sel`)

Pola, na których moduł może polegać:

```js
{
  kind: "point" | "area",
  lat, lng,            // punkt albo środek obszaru
  ring: [[lat, lng]…], // okrąg 1 km wokół punktu albo narysowany obszar
  area: "Poznań" | "Dopiewo" | … | null, // gmina, null poza obszarem badań
  cells: [i, …],       // indeksy komórek siatki 956 x 898 wewnątrz ring
  ready: true,
  ext: {}              // wyniki modułów, patrz ctx.fetchOnce
}
```

## 6. `ctx`

| Pole | Opis |
|---|---|
| `lang()` | `"pl"` albo `"en"` |
| `t(name)` | teksty modułu `name` w bieżącym języku (z `def.i18n`) |
| `esc(s)`, `num(v, d)`, `sgn(v, d)`, `fmtInt(n)` | pomocniki rdzenia: ucieczka HTML i liczby z przecinkiem w PL |
| `land`, `sar`, `L8` | `land.json`, `sar.json` (albo `null`) i załadowane warstwy szarości |
| `landCell(lat, lng)` | `{ i, row, col }` albo `null` poza siatką |
| `cellCentre(i)` | `[lat, lng]` środka komórki |
| `inFlood(lat, lng)` | czy punkt leży w obszarze podtopień PIG-PIB (już w aplikacji) |
| `distM(lat1, lng1, lat2, lng2)` | odległość w metrach |
| `loadGray(name)` | `Promise`: ładuje `data/land/<name>.png` do `L8[name]` |
| `loadJSON(path)` | `Promise`: ładuje `data/<path>` z wersją w adresie; wynik jest zapamiętany |
| `fetchOnce(sel, key, fn, ms = 6000)` | patrz niżej |
| `rerender()` | rysuje kartę ponownie, jeśli `sel` jest nadal wybrany |

### `fetchOnce`

```js
ctx.fetchOnce(sel, "flood", (signal) => fetch(url, { signal }).then((r) => r.text()));
```

- Jeśli `sel.ext[key]` już istnieje, nic nie robi (jedno zapytanie na wybór).
- Ustawia `sel.ext[key] = { st: "loading" }`, woła `fn(signal)`.
- Po sukcesie: `{ st: "ok", data }`. Po błędzie: `{ st: "error", error }`. Po `ms` milisekund: przerywa i ustawia `{ st: "timeout" }`.
- Na końcu woła `rerender()`, ale tylko jeśli użytkownik nie wybrał w międzyczasie innego miejsca.

Wiersz czyta wynik tak:

```js
const r = sel.ext.flood;
if (!r || r.st === "loading") return { id: "flood", lvl: "info", pending: true, t: s.title, v: s.checking };
if (r.st !== "ok") return { id: "flood", lvl: "info", t: s.title, v: s.unavailable };
```

## 7. Szkielet modułu

```js
(function () {
  const SK = window.SARNIK;
  if (!SK) return; // bez rdzenia moduł jest bezczynny
  SK.register("flood", {
    i18n: {
      pl: { title: "Strefa powodziowa (ISOK)", checking: "Sprawdzam mapę zagrożenia powodziowego…" },
      en: { title: "Flood zone (ISOK)", checking: "Checking the flood hazard map…" },
    },
    onSelect(sel, ctx) { ctx.fetchOnce(sel, "flood", (signal) => query(sel, signal)); },
    checks(sel, ctx) { /* czyta sel.ext.flood, zwraca item */ },
  });
})();
```

Żeby dało się testować logikę w Node, moduł wystawia czyste funkcje na `SK.modules[name].pure` (na przykład parser odpowiedzi usługi, klasyfikator opisu decyzji).

## 8. Teksty i wygląd

- Każdy tekst istnieje po polsku i po angielsku. Polski ma brzmieć naturalnie.
- Uczciwość: brak danych to „brak danych”, nie „bez zagrożeń”. Każdy wiersz podaje źródło i, jeśli dane mają datę albo zasięg, mówi to wprost.
- Klasy CSS modułu zaczynają się od `sk-<nazwa>-`. Moduł używa zmiennych kolorów aplikacji (`--ink-2`, `--line`, `--area`), nie własnych kolorów.

## 9. Testy

- `docs/planwyd/kontrakt/fake_core.mjs` udostępnia `createCore()` i `loadModule()`: uruchamia moduł w Node z tym samym kontraktem, sztucznym `fetch` i sztucznym wyborem miejsca. Przykład: `docs/planwyd/kontrakt/selftest.mjs` (uruchom: `node docs/planwyd/kontrakt/selftest.mjs`).
- Test modułu sprawdza co najmniej: wiersz w stanie „sprawdzam”, po sukcesie, po błędzie usługi, po przekroczeniu czasu, poza zasięgiem danych; oba języki; brak słowa `undefined` w tekście.
- Rdzeń (Urządzenie 1) musi przejść ten sam `selftest.mjs` wobec prawdziwej aplikacji w przeglądarce: moduł przykładowy `docs/planwyd/kontrakt/example_module.js` załadowany przez manifest ma pokazać swój wiersz.
