// Test modułu SARnik „Plany budowlane obok” (wuia) na sztucznym rdzeniu (docs/planwyd/kontrakt/fake_core.mjs).
// Uruchomienie z katalogu repozytorium: node poznan-trend-detective/tests/sarnik/wuia.test.mjs
// Kończy się kodem 1, jeśli którykolwiek test nie przejdzie.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCore, loadModule } from '../../../docs/planwyd/kontrakt/fake_core.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const file = path.join(here, '..', '..', 'web', 'sarnik', 'wuia.js')
const DATA = 'sarnik/wuia/wuia.json'
const AREAS = 'areas.geojson'
let failed = 0
const check = (name, ok, detail = '') => { console.log((ok ? 'OK   ' : 'BŁĄD ') + name + (ok ? '' : ' -> ' + detail)); if (!ok) failed++ }

// ---- dane: punkt P i dziesięć sztucznych spraw wokół niego ----
const P = [52.4000, 16.9000]
const dLat = (m) => m / 111195          // metry na północ
const dLng = (m) => m / (111195 * Math.cos(P[0] * Math.PI / 180)) // metry na wschód
const at = (n, e) => [+(P[0] + dLat(n)).toFixed(6), +(P[1] + dLng(e)).toFixed(6)]
const row = (n, e, date, st, type, desc) => [...at(n, e), date, st, type, desc]
const ROWS = {
  house1: row(100, 0, '2026-10-01', 'dec', 'jednorodzinny', 'budowa budynku mieszkalnego jednorodzinnego'),
  flats: row(0, 250, '2026-09-12', 'wni', 'wielorodzinny', 'Budowa bloku <script>x</script> & "y"'),
  shop: row(-300, 0, '2026-08-03', 'dec', 'uslugi', 'budowa budynku handlowo-usługowego'),
  house2: row(0, -420, '2026-07-20', 'wni', 'jednorodzinny', 'budowa domu jednorodzinnego w zabudowie bliźniaczej i jeszcze bardzo długi opis, który trzeba uciąć'),
  refusedHall: row(150, 150, '2026-06-30', 'odm', 'hala', 'budowa hali magazynowej'),
  hallFar: row(700, 0, '2026-08-20', 'dec', 'hala', 'budowa hali magazynowo-produkcyjnej'),
  roadFar: row(0, 900, '2026-09-01', 'wni', 'droga', 'budowa drogi gminnej'),
  hallFar2: row(-2000, 0, '2026-10-10', 'dec', 'hala', 'budowa budynku magazynowego'),
  houseFar: row(0, -1500, '2026-06-05', 'dec', 'jednorodzinny', 'budowa budynku mieszkalnego jednorodzinnego'),
  roadNear: row(-50, -50, '2026-11-05', 'dec', 'droga', 'budowa drogi wewnętrznej'),
}
const COLS = ['lat', 'lng', 'date', 'status', 'type', 'desc']
const fixture = (names) => ({
  v: 1, coverage: 'Poznań (miasto)', source: 'GEOPOZ, WUiA', dates: ['2026-06-01', '2026-11-05'], built: '2026-11-05',
  cols: COLS, rows: names.map((n) => ROWS[n]),
})
const ALL = Object.keys(ROWS)
const WITHOUT_NEAR_ROAD = ALL.filter((n) => n !== 'roadNear')

// sztuczna granica miasta: kwadrat ±0,05° wokół P (ok. 5,5 km na północ i południe, 3,4 km na wschód i zachód)
const H = 0.05
const square = [[P[1] - H, P[0] - H], [P[1] + H, P[0] - H], [P[1] + H, P[0] + H], [P[1] - H, P[0] + H], [P[1] - H, P[0] - H]]
const CITY_GEO = { type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { name: 'Dopiewo' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } },
  { type: 'Feature', properties: { name: 'Poznań' }, geometry: { type: 'Polygon', coordinates: [square] } },
] }

const point = (o = {}) => Object.assign({ kind: 'point', lat: P[0], lng: P[1], ring: [], area: 'Poznań', cells: [1, 2, 3] }, o)
const ringAround = (cn, ce, halfN, halfE) => [at(cn - halfN, ce - halfE), at(cn - halfN, ce + halfE), at(cn + halfN, ce + halfE), at(cn + halfN, ce - halfE)]
const noUndef = (it) => !/undefined|NaN|\[object /.test(it.t + it.v + (it.src || ''))
const strip = (h) => h.replace(/<[^>]+>/g, '')
// treść widoczna bez rozwijania (bez <details>) i liczba zdań w niej
const main = (v) => strip(v.split('<details')[0]).trim()
const sentences = (t) => (t.match(/[.!?](\s|$)/g) || []).length

async function run(json, sel, lang = 'pl', areas = CITY_GEO) {
  const files = {}
  if (json) files[DATA] = json
  if (areas) files[AREAS] = areas
  const core = createCore({ lang, json: files })
  loadModule(file, core)
  const s = core.select(sel)
  const before = core.items(s)
  await core.settle()
  const after = core.items(s)
  return { core, sel: s, before, after, it: after[0] }
}

// 1. poza Poznaniem: info, rejestr obejmuje tylko miasto
{
  const far = point({ area: 'Dopiewo', lat: P[0] + dLat(5000), lng: P[1] })
  const { core, it, before } = await run(fixture(ALL), far)
  check('poza miastem: poziom info, bez „sprawdzam”', it.lvl === 'info' && !it.pending && !before[0].pending, JSON.stringify(before[0]))
  check('poza miastem: tekst mówi, że rejestr obejmuje tylko miasto', /tylko miasto Poznań/.test(it.v) && !/nie ma decyzji/.test(it.v), it.v)
  check('poza miastem: wiersze poprawne', core.problems(before.concat([it])).length === 0, core.problems([it]).join('; '))
  const nul = await run(fixture(ALL), point({ area: null }))
  check('poza obszarem badań (area null): info i bez pobierania', nul.it.lvl === 'info' && !nul.sel.ext.wuia, JSON.stringify(nul.sel.ext))
  // tuż za granicą miasta, a w Poznaniu do 500 m są sprawy: info (nigdy warn), mówi o stronie Poznania
  const edge = await run(fixture(ALL), point({ area: 'Dopiewo' }))
  check('za granicą, sprawy po stronie Poznania: info, nie warn', edge.it.lvl === 'info' && edge.core.flags(edge.after) === 0, edge.it.lvl)
  check('za granicą: mówi „poza Poznaniem” i „po stronie Poznania”', /leży poza Poznaniem/.test(edge.it.v) && /Po stronie Poznania, do 500 m stąd, rejestr ma 3 decyzje i 2 wnioski/.test(edge.it.v), strip(edge.it.v))
  check('za granicą: najwyżej dwa zdania na wierzchu', sentences(main(edge.it.v)) <= 2, main(edge.it.v))
}

// 2. w toku i błąd wczytania
{
  const { core, before, after, sel } = await run(null, point())
  check('w toku: pending, info, „sprawdzam”', before.length === 1 && before[0].pending === true && before[0].lvl === 'info' && /Sprawdzam/.test(before[0].v), JSON.stringify(before))
  check('w toku: nagłówek nie liczy wiersza', core.flags(before) === 0)
  check('błąd wczytania: stan error i poziom info', sel.ext.wuia.st === 'error' && after[0].lvl === 'info' && !after[0].pending, JSON.stringify(sel.ext))
  check('błąd wczytania: nie twierdzi, że nic się nie planuje', /nie znaczy, że nic się tu nie planuje/.test(after[0].v), after[0].v)
  check('błąd wczytania: wiersze poprawne', core.problems(before.concat(after)).length === 0, core.problems(before.concat(after)).join('; '))
  const bad = await run({ v: 2, rows: [] }, point())
  check('zły format pliku: info', bad.it.lvl === 'info' && bad.sel.ext.wuia.st === 'error', JSON.stringify(bad.sel.ext))
  // pusty rejestr i brak dat to błąd danych, a nie zielone „ok”
  const empty = await run({ v: 1, cols: COLS, dates: ['2026-06-01', '2026-11-05'], rows: [] }, point())
  check('pusty rejestr: info „nie udało się”, nie ok', empty.it.lvl === 'info' && empty.sel.ext.wuia.st === 'error' && /Nie udało się/.test(empty.it.v), empty.it.lvl + ' ' + empty.it.v)
  const nodates = await run({ v: 1, cols: COLS, rows: [ROWS.house1] }, point())
  check('brak dat: info „nie udało się”, bez pustych nawiasów', nodates.it.lvl === 'info' && nodates.sel.ext.wuia.st === 'error' && !/\(\)/.test(nodates.it.v), nodates.it.v)
  const baddates = await run(Object.assign(fixture(ALL), { dates: ['2026-06', 'x'] }), point())
  check('złe daty: info', baddates.it.lvl === 'info' && baddates.sel.ext.wuia.st === 'error', baddates.it.v)
  // przekroczenie czasu: fetchOnce rdzenia, ten sam klucz
  const core2 = createCore({ lang: 'pl' })
  loadModule(file, core2)
  const s2 = core2.select(point({ area: null }))
  s2.area = 'Poznań'
  core2.ctx.fetchOnce(s2, 'wuia', () => new Promise(() => {}), 20)
  await core2.settle()
  check('przekroczenie czasu: info', s2.ext.wuia.st === 'timeout' && core2.items(s2)[0].lvl === 'info' && /Nie udało się/.test(core2.items(s2)[0].v), JSON.stringify(s2.ext))
}

// 3. hala/droga w pobliżu -> warn; daleko leżące nie liczą się
{
  const { core, it, after } = await run(fixture(ALL), point())
  const top = main(it.v)
  check('droga 70 m obok: warn', it.lvl === 'warn', it.lvl + ' ' + it.v)
  check('warn: nagłówek liczy 1', core.flags(after) === 1)
  check('warn: decyzje i wnioski osobno, typy z liczbą mnogą', top.indexOf('Do 500 m stąd rejestr miasta ma 3 decyzje i 2 wnioski: 1 droga, 1 blok mieszkalny, 2 domy jednorodzinne, 1 budynek usługowy.') === 0, top)
  check('warn: bez „×” i bez „spraw”', !/×|spraw[ęy]?\b/.test(top), top)
  check('warn: hala 700 m dalej nie jest liczona', !/hal/.test(top), top)
  check('warn: dwa zdania na wierzchu', sentences(top) === 2, top)
  check('warn: papiery, nie plac budowy; zapytaj w urzędzie', /To dokumenty z urzędu \(od 1 czerwca do 5 listopada 2026\), a nie place budowy; zapytaj w urzędzie/.test(top) && !/budowa trwa/i.test(it.v), top)
  check('warn: lista zwinięta, trzy najbliższe w kolejności', /<details class="sk-wuia-more"><summary>Najbliżej \(5\)<\/summary>/.test(it.v) && (it.v.match(/<li>/g) || []).length === 3 &&
    /<li><b>droga<\/b>, ok\. 70 m, decyzja 05\.11\.2026: /.test(it.v) && it.v.indexOf('ok. 100 m') < it.v.indexOf('ok. 250 m'), it.v)
  check('warn: odmowa wymieniona w rozwinięciu', /<details[\s\S]*Urząd odmówił albo wniósł sprzeciw w 1 sprawie\./.test(it.v) && !/odmówił/.test(top), it.v)
  check('warn: spacja przed rozwinięciem (bez CSS tekst się nie skleja)', / <details/.test(it.v), it.v)
  check('warn: wiersz poprawny i w grupie „bez radaru”', core.problems(after).length === 0 && it.sar === 'no' && it.id === 'wuia:plan' && noUndef(it), core.problems(after).join('; '))
  check('źródło w osobnym polu, z zakresem miesięcy', /GEOPOZ/.test(it.src) && /czerwiec–listopad 2026/.test(it.src) && !/GEOPOZ/.test(it.v), it.src)
  check('tytuł nazywa źródło', it.t === 'Plany budowlane obok (urząd miasta)', it.t)
}

// 4. tylko mieszkania i usługi w pobliżu -> info
{
  const { core, it, after } = await run(fixture(WITHOUT_NEAR_ROAD), point())
  const top = main(it.v)
  check('tylko domy, blok i usługi: info', it.lvl === 'info', it.lvl + ' ' + strip(it.v))
  check('info: 2 decyzje i 2 wnioski', /rejestr miasta ma 2 decyzje i 2 wnioski: 1 blok mieszkalny, 2 domy jednorodzinne, 1 budynek usługowy\./.test(top), top)
  check('info: „budowa mogła jeszcze nie ruszyć”', /a nie place budowy: budowa mogła jeszcze nie ruszyć\./.test(top) && sentences(top) === 2, top)
  check('info: odmowa hali obok nie podnosi poziomu', /sprzeciw w 1 sprawie/.test(it.v) && core.flags(after) === 0, strip(it.v))
  check('info: opis z rejestru przechodzi przez esc', it.v.indexOf('<script>') < 0 && it.v.indexOf('&lt;script&gt;x&lt;/script&gt; &amp; &quot;y&quot;') > 0, it.v)
  check('info: wiersz poprawny', core.problems(after).length === 0 && noUndef(it), core.problems(after).join('; '))
  const long = await run(fixture(['house2']), point())
  check('info: długi opis z rejestru ucięty z wielokropkiem', /…<\/span>/.test(long.it.v) && !/trzeba uciąć/.test(long.it.v), long.it.v)
  const one = await run(fixture(['house1']), point())
  check('jedna decyzja: liczba pojedyncza', /rejestr miasta ma 1 decyzję: 1 dom jednorodzinny\./.test(one.it.v), strip(one.it.v))
  const one2 = await run(fixture(['flats']), point())
  check('jeden wniosek: liczba pojedyncza', /rejestr miasta ma 1 wniosek: 1 blok mieszkalny\./.test(one2.it.v), strip(one2.it.v))
}

// 5. nic w promieniu 500 m -> ok tylko wtedy, gdy całe koło leży w mieście
{
  const { core, it, after } = await run(fixture(['hallFar', 'roadFar', 'hallFar2', 'houseFar']), point())
  check('nic w 500 m, w głębi miasta: ok', it.lvl === 'ok', it.lvl + ' ' + it.v)
  check('ok: zakres dat i „w każdej chwili”', /nie ma decyzji ani wniosków o nowe domy, bloki, hale, budynki usługowe ani drogi \(od 1 czerwca do 5 listopada 2026\)\. Nowa sprawa może pojawić się w każdej chwili\./.test(it.v), it.v)
  check('ok: wiersz poprawny', core.problems(after).length === 0 && noUndef(it))
  const nearEdge = point({ lng: P[1] + H - dLng(200) })
  const e = await run(fixture(['hallFar', 'roadFar']), nearEdge)
  check('200 m od granicy miasta, nic w 500 m: info, nie ok', e.it.lvl === 'info' && /poza Poznaniem, a tam rejestr nie sięga/.test(e.it.v), e.it.lvl + ' ' + e.it.v)
  const nob = await run(fixture(['hallFar']), point(), 'pl', null)
  check('granica miasta się nie wczytała: info, „tylko teren w granicach miasta”', nob.it.lvl === 'info' && /tylko teren w granicach miasta/.test(nob.it.v), nob.it.lvl + ' ' + nob.it.v)
  // narysowany obszar wychodzący poza miasto: info
  const ar = await run(fixture(['hallFar']), point({ kind: 'area', ring: [[P[0], P[1]], [P[0], P[1] + H + 0.01], [P[0] + 0.001, P[1] + H + 0.01]] }))
  check('obszar wychodzi poza miasto: info', ar.it.lvl === 'info', ar.it.lvl + ' ' + ar.it.v)
}

// 6. tylko odmowa w pobliżu -> ok, odmowa w rozwinięciu
{
  const { it, core, after } = await run(fixture(['refusedHall', 'hallFar']), point())
  check('tylko odmowa hali obok: ok, nie warn', it.lvl === 'ok' && core.flags(after) === 0, it.lvl + ' ' + it.v)
  check('tylko odmowa: zwinięta „Odmowy i sprzeciwy (1)” z jednym zdaniem', /<summary>Odmowy i sprzeciwy \(1\)<\/summary>/.test(it.v) && /Urząd odmówił albo wniósł sprzeciw w 1 sprawie\./.test(it.v) && !/tylko/.test(it.v), it.v)
  check('tylko odmowa: na wierzchu dwa zdania', sentences(main(it.v)) === 2, main(it.v))
}

// 7. narysowany obszar: w obszarze albo do 500 m od środka, i mówi które
{
  // prostokąt 2,4 km x 0,4 km na północ od P: obejmuje halę 700 m na północ, nie obejmuje drogi 900 m na wschód
  const ring = ringAround(1000, 0, 1200, 200)
  const sel = point({ kind: 'area', ring })
  const { it, core, after } = await run(fixture(['hallFar', 'roadFar', 'house1', 'houseFar']), sel)
  check('obszar: hala w obszarze (700 m od środka) daje warn', it.lvl === 'warn', it.lvl + ' ' + strip(it.v))
  check('obszar: tekst mówi „w zaznaczonym obszarze lub do 500 m od jego środka”', /W zaznaczonym obszarze lub do 500 m od jego środka rejestr miasta ma 2 decyzje: 1 hala lub magazyn, 1 dom jednorodzinny\./.test(it.v), strip(it.v))
  check('obszar: sprawa w obszarze oznaczona „w obszarze”', /hala lub magazyn<\/b>, w obszarze/.test(it.v), it.v)
  check('obszar: droga 900 m poza obszarem pominięta', !/droga/.test(strip(it.v)), strip(it.v))
  check('obszar: wiersz poprawny', core.problems(after).length === 0 && noUndef(it))
}

// 8. oba języki
{
  const { core, sel, it } = await run(fixture(ALL), point())
  core.setLang('en')
  const e = core.items(sel)[0]
  const top = main(e.v)
  check('EN: tytuł i treść po angielsku', e.t === 'Building plans nearby (city office)' &&
    top.indexOf('Within 500 m of this place, the city register has 3 decisions and 2 applications: 1 road, 1 block of flats, 2 houses, 1 commercial building.') === 0 &&
    /This is paperwork from the city office \(1 June to 5 November 2026\), not building sites; ask the planning office/.test(top), e.t + ' | ' + top)
  check('EN: status i data po angielsku', /<summary>Nearest \(5\)<\/summary>/.test(e.v) && /<b>road<\/b>, about 70 m, decision 5 Nov 2026/.test(e.v) && /The office refused or objected in 1 case\./.test(e.v), e.v)
  check('EN: źródło', /Poznań City Hall planning department register \(GEOPOZ\), June–November 2026, city of Poznań only/.test(e.src), e.src)
  check('EN: ten sam poziom co PL', e.lvl === it.lvl)
  check('EN: wiersz poprawny', core.problems([e]).length === 0 && noUndef(e))
  const ok = await run(fixture(['hallFar']), point(), 'en')
  check('EN ok', ok.it.lvl === 'ok' && /^Within 500 m of this place, the city register has no decisions or applications for new houses/.test(ok.it.v) && /A new one can be filed any day\./.test(ok.it.v), ok.it.v)
  const out = await run(fixture(ALL), point({ area: 'Dopiewo', lat: P[0] + dLat(5000) }), 'en')
  check('EN poza miastem', /covers only the city of Poznań/.test(out.it.v), out.it.v)
  const pend = createCore({ lang: 'en' }); loadModule(file, pend)
  const ps = pend.select(point())
  check('EN w toku', /Checking/.test(pend.items(ps)[0].v) && pend.items(ps)[0].pending === true)
  await pend.settle()
  check('EN błąd', /does not mean nothing is planned here; try again later/.test(pend.items(ps)[0].v), pend.items(ps)[0].v)
  // wszystkie klucze tekstów są w obu językach
  const i18n = core.SARNIK.modules.wuia.i18n
  const keys = (o) => Object.keys(o).sort().join(',')
  check('te same klucze PL i EN', keys(i18n.pl) === keys(i18n.en) && keys(i18n.pl.type) === keys(i18n.en.type) && keys(i18n.pl.status) === keys(i18n.en.status))
  check('PL: dzień i miesiąc z zerem', i18n.pl.date('2026-08-06') === '06.08.2026')
  check('PL: liczby mnogie typów', i18n.pl.count(5, i18n.pl.type.droga) === '5 dróg' && i18n.pl.count(22, i18n.pl.type.jednorodzinny) === '22 domy jednorodzinne' && i18n.pl.count(12, i18n.pl.type.uslugi) === '12 budynków usługowych')
}

// 9. czyste funkcje i jedno pobranie na wybór
{
  const core = createCore({ json: { [DATA]: fixture(ALL), [AREAS]: CITY_GEO } })
  loadModule(file, core)
  const pure = core.SARNIK.modules.wuia.pure
  const data = pure.parseData(fixture(ALL))
  const list = pure.nearby(data.rows, point(), core.ctx.distM)
  check('nearby: 6 spraw w 500 m, posortowane', list.length === 6 && list.every((r, i) => i === 0 || list[i - 1].d <= r.d), list.map((r) => Math.round(r.d)).join(','))
  const sum = pure.summarise(list)
  check('summarise: odmowa osobno, 3 decyzje i 2 wnioski, warn', sum.refused.length === 1 && sum.active.length === 5 && sum.nDec === 3 && sum.nWni === 2 && sum.lvl === 'warn' && sum.nearest.length === 3)
  check('summarise: pusta lista -> ok', pure.summarise([]).lvl === 'ok')
  check('summarise: same odmowy -> ok', pure.summarise([{ st: 'odm', type: 'hala' }, { st: 'odm', type: 'droga' }]).lvl === 'ok')
  check('typy modułu = typy w pliku danych', pure.TYPES.slice().sort().join() === 'droga,hala,jednorodzinny,uslugi,wielorodzinny')
  check('shorten tnie i dodaje wielokropek', pure.shorten('a '.repeat(60)).length <= 80 && pure.shorten('a '.repeat(60)).endsWith('…'))
  // złe wiersze odpadają: brak współrzędnych, pusty tekst, nieznany typ albo status, zła data
  const dirty = fixture(['house1'])
  dirty.rows = dirty.rows.concat([
    [null, '', '2026-07-01', 'dec', 'jednorodzinny', 'x'], ['', 16.9, '2026-07-01', 'dec', 'jednorodzinny', 'x'],
    [52.4, 16.9, '2026-07-01', 'dec', 'inne<b>', 'x'], [52.4, 16.9, '2026-07-01', 'zzz', 'droga', 'x'], [52.4, 16.9, 'xyz', 'dec', 'droga', 'x'],
  ])
  const dd = pure.parseData(dirty)
  check('parseData: złe wiersze odpadają', dd.rows.length === 1 && dd.rows[0].type === 'jednorodzinny', JSON.stringify(dd.rows))
  let threw = false
  try { pure.parseData(Object.assign(fixture([]), { rows: [[null, null, 'x', 'q', 'w', '']] })) } catch (e) { threw = true }
  check('parseData: same złe wiersze -> błąd', threw)
  const city = pure.parseCity(CITY_GEO)
  check('parseCity: Poznań z areas.geojson', city && city.rings.length === 1 && pure.inRing(P[0], P[1], city.rings[0]))
  check('distToEdge: ok. 200 m od wschodniej krawędzi', Math.abs(pure.distToEdge(P[0], P[1] + H - dLng(200), city.rings) - 200) < 5, String(pure.distToEdge(P[0], P[1] + H - dLng(200), city.rings)))
  check('coverage: w głębi full, przy krawędzi edge, bez granicy unknown', pure.coverage(point(), city) === 'full' && pure.coverage(point({ lng: P[1] + H - dLng(200) }), city) === 'edge' && pure.coverage(point(), null) === 'unknown')
  let calls = 0
  const orig = core.ctx.loadJSON
  core.ctx.loadJSON = (p) => { if (p === DATA) calls++; return orig(p) }
  const a = core.select(point())
  core.SARNIK.modules.wuia.onSelect(a, core.ctx)
  await core.settle()
  check('jedno pobranie na wybór', calls === 1, String(calls))
}

// 10. prawdziwe pliki danych (jeśli są): format, typy, i przegląd siatki punktów w Poznaniu
{
  const real = path.join(here, '..', '..', 'web', 'data', 'sarnik', 'wuia', 'wuia.json')
  const realAreas = path.join(here, '..', '..', 'web', 'data', 'areas.geojson')
  if (fs.existsSync(real) && fs.existsSync(realAreas)) {
    const json = JSON.parse(fs.readFileSync(real, 'utf8'))
    const areas = JSON.parse(fs.readFileSync(realAreas, 'utf8'))
    const core = createCore({ json: { [DATA]: json, [AREAS]: areas } })
    loadModule(file, core)
    const pure = core.SARNIK.modules.wuia.pure
    const data = pure.parseData(json)
    check('plik danych: ≤ 400 KB', fs.statSync(real).size <= 400 * 1024, String(fs.statSync(real).size))
    check('plik danych: żaden wiersz nie odpada w parseData', data.rows.length === json.rows.length, data.rows.length + ' / ' + json.rows.length)
    check('plik danych: opisy bez numerów spraw', data.rows.every((r) => !/UA-[IVX]|\d+\/\d{4}/.test(r.desc) && r.desc.length <= 90))
    check('plik danych: opisy bez nazwy procedury na początku', data.rows.every((r) => !/^(ustal|pozw|zgłosz|zmian|inwestycja drogowa)/i.test(r.desc)), data.rows.filter((r) => /^(ustal|pozw|zgłosz|zmian)/i.test(r.desc)).map((r) => r.desc).slice(0, 3).join(' | '))
    const keys = new Set(json.rows.map((r) => r.slice(0, 5).join('|')))
    check('plik danych: bez powtórzeń (miejsce, data, status, typ)', keys.size === json.rows.length, keys.size + ' / ' + json.rows.length)
    const city = pure.parseCity(areas)
    check('plik danych: wszystkie sprawy w granicach Poznania', city && data.rows.every((r) => city.rings.some((g) => pure.inRing(r.lat, r.lng, g))))
    // siatka co 0,01° w granicach Poznania, w obu językach: wiersz poprawny, na wierzchu najwyżej dwa zdania
    let n = 0, bad = [], longest = '', lv = {}
    for (const lang of ['pl', 'en']) {
      for (let lat = 52.29; lat <= 52.51; lat += 0.01) {
        for (let lng = 16.73; lng <= 17.08; lng += 0.01) {
          if (!city.rings.some((g) => pure.inRing(lat, lng, g))) continue
          const r = await run(json, point({ lat, lng }), lang, areas)
          n++
          lv[r.it.lvl] = (lv[r.it.lvl] || 0) + 1
          const top = main(r.it.v)
          if (r.core.problems(r.after).length || !noUndef(r.it) || sentences(top) > 2 || /\(\)|×|\s:/.test(top)) bad.push(lat.toFixed(2) + ',' + lng.toFixed(2) + ' ' + top)
          if (top.length > longest.length) longest = top
        }
      }
    }
    check('siatka: każdy wiersz poprawny, najwyżej dwa zdania na wierzchu', n > 500 && bad.length === 0, bad.slice(0, 3).join(' || '))
    console.log(`     (siatka: ${n} wierszy, poziomy ${JSON.stringify(lv)}; najdłuższa treść na wierzchu ${longest.length} znaków)`)
    const centre = await run(json, point({ lat: 52.4064, lng: 16.9252 }), 'pl', areas)
    console.log('     (centrum Poznania: ' + centre.it.lvl + ' – ' + main(centre.it.v) + ')')
  } else check('pliki danych istnieją', false, real + ' ' + realAreas)
}

console.log(failed ? '\nNIE PRZESZŁO: ' + failed : '\nWszystkie testy modułu wuia przeszły.')
process.exit(failed ? 1 : 0)
