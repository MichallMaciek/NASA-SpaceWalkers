// Kontrakt rozszerzeń SARnik (docs/planwyd/KONTRAKT.md) w Node: ten sam interfejs co rdzeń
// w przeglądarce, żeby moduły dało się testować bez aplikacji. Bez zależności.
import fs from 'node:fs'
import vm from 'node:vm'

const LEVELS = ['ok', 'warn', 'risk', 'info']

export function createCore(opts = {}) {
  let lang = opts.lang || 'pl'
  const warnings = []
  const waiting = []
  let rerenders = 0
  let current = null

  const SARNIK = {
    version: 1,
    modules: {},
    order: [],
    register(name, def) {
      if (typeof name !== 'string' || !name) throw new Error('register: brak nazwy modułu')
      SARNIK.modules[name] = def || {}
      if (SARNIK.order.indexOf(name) < 0) SARNIK.order.push(name)
    },
  }

  const dsep = () => (lang === 'pl' ? ',' : '.')
  const num = (v, d) => Number(v).toFixed(d).replace('.', dsep())
  const jsonCache = {}

  const ctx = {
    lang: () => lang,
    t: (name) => ((SARNIK.modules[name] || {}).i18n || {})[lang] || {},
    esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    num,
    sgn: (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(v), d),
    fmtInt: (n) => Math.round(n).toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-GB'),
    land: opts.land || { width: 956, height: 898, cell_m_ground: 73.2 },
    sar: opts.sar || null,
    L8: opts.L8 || {},
    landCell: opts.landCell || (() => null),
    cellCentre: opts.cellCentre || (() => [52.4, 16.9]),
    inFlood: opts.inFlood || (() => false),
    distM(lat1, lng1, lat2, lng2) {
      const R = 6371008.8, rad = Math.PI / 180
      const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
      return 2 * R * Math.asin(Math.sqrt(a))
    },
    loadGray: opts.loadGray || (async () => undefined),
    loadJSON(path) {
      if (!jsonCache[path]) {
        jsonCache[path] = (async () => {
          if (opts.json && path in opts.json) return opts.json[path]
          throw new Error('brak danych: ' + path)
        })()
      }
      return jsonCache[path]
    },
    fetchOnce(sel, key, fn, ms = 6000) {
      sel.ext = sel.ext || {}
      if (sel.ext[key]) return
      sel.ext[key] = { st: 'loading' }
      const ac = new AbortController()
      let timer
      const timeout = new Promise((resolve) => { timer = setTimeout(() => { ac.abort(); resolve({ st: 'timeout' }) }, ms) })
      const work = Promise.resolve()
        .then(() => fn(ac.signal))
        .then((data) => ({ st: 'ok', data }), (error) => ({ st: 'error', error: String((error && error.message) || error) }))
      const done = Promise.race([work, timeout]).then((res) => {
        clearTimeout(timer)
        sel.ext[key] = res
        if (current === sel) ctx.rerender()
      })
      waiting.push(done)
    },
    rerender() { rerenders++ },
  }

  const guard = (name, what, fn) => {
    try { return fn() } catch (e) { warnings.push(name + '.' + what + ': ' + ((e && e.message) || e)); return null }
  }

  return {
    SARNIK,
    ctx,
    warnings,
    setLang(l) { lang = l },
    get rerenders() { return rerenders },
    // wybór miejsca: jak finishSelection w aplikacji
    select(sel) {
      sel.ext = sel.ext || {}
      sel.ready = true
      current = sel
      SARNIK.order.forEach((name) => { const d = SARNIK.modules[name]; if (d.onSelect) guard(name, 'onSelect', () => d.onSelect(sel, ctx)) })
      return sel
    },
    // wiersze przeglądu ze wszystkich modułów, w kolejności rejestracji
    items(sel) {
      const out = []
      SARNIK.order.forEach((name) => {
        const d = SARNIK.modules[name]
        if (!d.checks) return
        const r = guard(name, 'checks', () => d.checks(sel, ctx))
        const list = r == null ? [] : Array.isArray(r) ? r : [r]
        list.filter(Boolean).forEach((it) => out.push(Object.assign({}, it, { id: name + ':' + (it.id || 'row'), module: name })))
      })
      return out
    },
    cardTop(sel) {
      return SARNIK.order.map((name) => { const d = SARNIK.modules[name]; return d.cardTop ? guard(name, 'cardTop', () => d.cardTop(sel, ctx)) || '' : '' }).join('')
    },
    // czeka na wszystkie zapytania rozpoczęte przez fetchOnce
    async settle() { while (waiting.length) await waiting.shift() },
    // lista naruszeń kontraktu w wierszach; pusta lista = wiersze poprawne
    problems(items) {
      const p = []
      items.forEach((it) => {
        if (LEVELS.indexOf(it.lvl) < 0) p.push(it.id + ': zły poziom ' + it.lvl)
        if (typeof it.t !== 'string' || !it.t) p.push(it.id + ': brak tytułu')
        if (typeof it.v !== 'string' || !it.v) p.push(it.id + ': brak treści')
        if (/undefined|NaN|\[object /.test(String(it.t) + String(it.v) + String(it.word || '') + String(it.src || ''))) p.push(it.id + ': w tekście jest undefined, NaN albo [object')
        if (it.pending && it.lvl !== 'info') p.push(it.id + ': wiersz w toku musi mieć poziom info')
      })
      return p
    },
  }
}

// Uruchamia plik modułu tak jak przeglądarka: z window.SARNIK i podanym fetch.
export function loadModule(file, core, globals = {}) {
  const win = { SARNIK: core.SARNIK }
  const sandbox = Object.assign({
    window: win,
    fetch: async () => { throw new Error('fetch nie został podstawiony w teście') },
    AbortController, URL, URLSearchParams, setTimeout, clearTimeout, console,
  }, globals)
  win.fetch = sandbox.fetch
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file })
  return core.SARNIK
}
