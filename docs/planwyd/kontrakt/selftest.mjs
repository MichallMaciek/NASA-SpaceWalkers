// Test kontraktu: uruchamia moduł przykładowy na sztucznym rdzeniu i sprawdza pełny cykl.
// Uruchomienie: node docs/planwyd/kontrakt/selftest.mjs
// Testy modułów (tests/sarnik/<nazwa>.test.mjs) powinny wyglądać tak samo.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCore, loadModule } from './fake_core.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const file = path.join(here, 'example_module.js')
let failed = 0
const check = (name, ok, detail = '') => { console.log((ok ? 'OK   ' : 'BŁĄD ') + name + (ok ? '' : ' -> ' + detail)); if (!ok) failed++ }
const point = () => ({ kind: 'point', lat: 52.4022, lng: 16.9453, ring: [], area: 'Poznań', cells: [1, 2, 3] })

// 1. sukces: najpierw wiersz „w toku”, potem wynik
{
  const core = createCore({ lang: 'pl' })
  loadModule(file, core, { fetch: async () => ({ text: async () => 'value=7.25' }) })
  const sel = core.select(point())
  const before = core.items(sel)
  check('wiersz w toku ma poziom info i flagę pending', before.length === 1 && before[0].pending === true && before[0].lvl === 'info', JSON.stringify(before))
  await core.settle()
  const after = core.items(sel)
  check('po odpowiedzi wiersz ma poziom warn', after[0].lvl === 'warn' && !after[0].pending, JSON.stringify(after))
  check('liczba po polsku ma przecinek', after[0].v.includes('7,3') || after[0].v.includes('7,2'), after[0].v)
  check('karta została narysowana ponownie dokładnie raz', core.rerenders === 1, String(core.rerenders))
  check('brak naruszeń kontraktu', core.problems(before.concat(after)).length === 0, core.problems(before.concat(after)).join('; '))
  check('id wiersza ma prefiks modułu', after[0].id === 'example:value', after[0].id)
  check('wiersz trafia do grupy „tło z innych źródeł” (sar = no)', after[0].sar === 'no', String(after[0].sar))
  check('nagłówek karty liczy 0 w toku i 1 po odpowiedzi', core.flags(before) === 0 && core.flags(after) === 1, core.flags(before) + ' / ' + core.flags(after))
  core.setLang('en')
  check('teksty po angielsku', core.items(sel)[0].t === 'Example (contract test)', core.items(sel)[0].t)
}

// 2. błąd usługi: poziom info, nigdy ok
{
  const core = createCore({ lang: 'pl' })
  loadModule(file, core, { fetch: async () => { throw new Error('sieć') } })
  const sel = core.select(point())
  await core.settle()
  const it = core.items(sel)[0]
  check('błąd usługi daje poziom info', it.lvl === 'info' && sel.ext.example.st === 'error', JSON.stringify(sel.ext))
}

// 3. przekroczenie czasu: zapytanie jest przerywane
{
  const core = createCore({ lang: 'pl' })
  let aborted = false
  loadModule(file, core, {
    fetch: (url, o) => new Promise((resolve, reject) => { o.signal.addEventListener('abort', () => { aborted = true; reject(new Error('abort')) }) }),
    // skracamy czas w teście: moduł prosi o 6000 ms, tu zegar przyspiesza 100 razy
    setTimeout: (fn, ms) => setTimeout(fn, ms / 100),
  })
  const sel = core.select(point())
  // fetchOnce rdzenia używa prawdziwego zegara, więc wołamy go wprost z krótkim limitem
  delete sel.ext.example
  core.ctx.fetchOnce(sel, 'example', (signal) => new Promise((resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('abort')) })), 30)
  await core.settle()
  check('po przekroczeniu czasu stan to timeout', sel.ext.example.st === 'timeout' && aborted, JSON.stringify(sel.ext))
  check('wiersz po przekroczeniu czasu ma poziom info', core.items(sel)[0].lvl === 'info')
}

// 4. jedno zapytanie na wybór, a zmiana miejsca nie rysuje starej karty
{
  let calls = 0
  const core = createCore({ lang: 'pl' })
  loadModule(file, core, { fetch: async () => { calls++; return { text: async () => 'value=1' } } })
  const a = core.select(point())
  core.SARNIK.modules.example.onSelect(a, core.ctx) // drugie wywołanie nie może pobrać ponownie
  const b = core.select(Object.assign(point(), { lat: 52.3 }))
  await core.settle()
  check('jedno zapytanie na wybór miejsca', calls === 2, 'wywołań: ' + calls)
  check('karta rysowana tylko dla aktualnego miejsca', core.rerenders === 1, String(core.rerenders))
  check('wyjątek w module nie psuje pozostałych', (() => { core.SARNIK.register('broken', { checks() { throw new Error('ups') } }); return core.items(b).length === 1 && core.warnings.length === 1 })(), core.warnings.join('; '))
}

// 5. czysta funkcja modułu jest dostępna do testów
{
  const core = createCore()
  loadModule(file, core)
  const parse = core.SARNIK.modules.example.pure.parse
  check('czysta funkcja parse', parse('value=3') === 3 && parse('nic') === null)
}

console.log(failed ? '\nNIE PRZESZŁO: ' + failed : '\nWszystkie testy kontraktu przeszły.')
process.exit(failed ? 1 : 0)
