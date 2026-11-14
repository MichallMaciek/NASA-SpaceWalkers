export const meta = {
  name: 'sarnik-sar-3-mapa',
  description: 'Urządzenie 3: mapa i integracja (jedyny właściciel app.js): animacja przelotów NISAR, nowe warstwy z meta.json, kontrakt 1.1, włączenie modułów',
  phases: [
    { title: 'Przygotowanie', detail: 'środowisko testowe, mapa kodu', model: 'sonnet' },
    { title: 'Implementacja', detail: 'kontrakt 1.1, warstwy, animacja, manifest', model: 'opus' },
    { title: 'Przegląd', detail: '3 soczewki: regresje, kontrakt i dane, przeglądarka', model: 'opus' },
    { title: 'Poprawki', detail: 'poprawki z przeglądu', model: 'opus' },
    { title: 'Kontrola', detail: 'testy, limity, opis PR', model: 'opus' },
  ],
}

// Workflow({scriptPath: "<repo>/docs/planwyd_sar/sar-3-mapa.js", args: {repo: "<repo>", sar: "<folder dane/sar>"}})
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const SAR = (typeof args === 'object' && args && args.sar) ? String(args.sar) : ''
const WHERE = REPO ? "The repository root is " + REPO + " . Use absolute paths under it." : "Find the repository root with git rev-parse --show-toplevel."
const DATA = SAR ? "The local SAR data folder is " + SAR + " ." : "The local SAR data folder is poznan-trend-detective/data/raw/sar (git-ignored); if it is missing, stop and report it."

const CONTEXT = [
  "## Context (trust it)",
  "- Team SpaceWalkers, NASA Space Apps 2026, challenge 'Dancing with the SARs'. Code freeze Sunday 15 Nov 16:00. The app SARnik lives in poznan-trend-detective/ (Leaflet page web/app.js about 2100 lines, i18n.js, i18n_sar.js, styles.css; place-card module core window.SARNIK in app.js; web/sarnik/manifest.js lists modules, currently empty).",
  "- Read docs/planwyd_sar/PLAN.md first (binding). You are the ONLY computer allowed to edit app.js, index.html, i18n files, styles.css, manifest.js and tests/data_contract.py. The other three computers deliver data folders web/data/sarnik/<set>/ with meta.json ('layers' with name, file, decode {scale, offset, unit}, ramp, legend_pl, legend_en) and modules nisar_zmiany, nisar_polaryzacje, nisar_wilgoc, historia_l, opera_dist. Their files may not be in main yet: everything you build must work whether a set exists or not.",
  "- The audit docs/przeglad-v2/ZGODNOSC_Z_WYZWANIEM.md: 'the 9 NISAR passes are not animated' (requirement R10 time-series animation) and items 6–7 (misleading NISAR legend, overclaiming hover texts in expert mode). Others edit app.js too: keep the diff local and small, no reformatting, start from fresh main.",
  "- " + DATA,
].join("\n")
const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Change ONLY computer 3's files from PLAN.md: web/app.js, web/index.html, web/i18n.js, web/i18n_sar.js, web/styles.css, web/sarnik/manifest.js, pipeline/sar_animacja.py, web/data/sarnik/anim/, tests/data_contract.py, tests/sarnik/sar3_*.py (paths under poznan-trend-detective/).",
  "- Never run git commands that change state. Never deploy. No new CDN scripts or npm packages. Plain JS in the style of app.js. With no new data folders present the app must behave exactly as today.",
  "- Every user-facing string in Polish and English (tests/i18n_parity.mjs must pass). When you start a local server use the port in your task and stop it before you finish. Final message: compact factual report.",
].join("\n")
const TASK = [
  "## The task of computer 3",
  "1. Contract 1.1 in app.js: ctx.loadGray(name, dir) loads data/<dir>/<name>.png (same decoding as loadGray, cached under L8[dir + '/' + name]); without dir it behaves as today. Keep fake_core.mjs semantics.",
  "2. Generic extension layers: at start, try to fetch web/data/sarnik/<set>/meta.json for sets gunw, pol, sme2, alos1, dist (ignore 404 silently). For each declared layer add a toggle in the drawer under a group like 'NISAR i inne radary (nowe)', with opacity slider, legend from legend_pl/legend_en and ramp, and a hover line with the decoded value and unit. Draw with the same canvas overlay technique as existing land layers (renderLand style, 0 = transparent). Lazy-load each PNG only when switched on.",
  "3. NISAR pass animation (own data): pipeline/sar_animacja.py makes frames of the track 57 provisional GCOV passes (11 dates, dual-pol ones as HH/HV, SHSH passes HH only) on the app grid, averaged in linear power, as 8-bit grey PNGs (HH dB and HV dB, decode v/6 − 30) into web/data/sarnik/anim/ with meta.json listing frames {date, hh, hv}. Total under 3 MB: if full-grid frames are too big, write a half-resolution sheet like sar_series (and say so in meta.json). In the radar view, the 2026 step of the time line expands into the pass dates with Play, showing the frames as an RGB composite (R HH, G HV, B HH/HV) with the date label. If anim/meta.json is missing, the time line stays as today.",
  "4. manifest.js: window.SARNIK_MODULES = ['flood', 'landslide', {name: 'wuia', css: true}, 'nisar_zmiany', 'nisar_polaryzacje', 'nisar_wilgoc', 'historia_l', 'opera_dist']. A module file that is not in main yet only logs a console warning (core already handles onerror); confirm this does not break the page.",
  "5. Audit fixes in app texts only if quick and safe: item 7 (expert hover texts 'New building / wall' etc. → the plain u.hov.* texts) and item 6 (NISAR legend: one entry 'built-up land or forest: strong HV').",
  "6. tests/data_contract.py: treat the sarnik sets as optional (the app fetches them but they may be absent until the other PRs merge; a missing set is INFO, not FAIL), and when present check web/data/sarnik/*/meta.json (JSON valid, every declared layer file exists, 8-bit grey 956x898 or a declared sheet size, decode present) and the anim folder. tests/sarnik/sar3_browser.py (Playwright, headless Chrome, port 8771): app loads with and without the new folders (simulate absence with page.route returning 404), the animation plays and labels dates, an extension layer toggles and shows a legend, no page errors, PL and EN.",
].join("\n")
const CHECK_SCHEMA = { type: 'object', properties: { all_green: { type: 'boolean' }, tests: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' } }, required: ['name', 'passed'] } }, app_js_changed_lines: { type: 'number' }, data_mb: { type: 'number' }, changed_files: { type: 'array', items: { type: 'string' } }, pr_description: { type: 'string' }, notes: { type: 'string' } }, required: ['all_green', 'tests', 'pr_description'] }
const REVIEW_SCHEMA = { type: 'object', properties: { summary: { type: 'string' }, findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, file: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'file', 'problem', 'evidence', 'fix'] } } }, required: ['summary', 'findings'] }

phase('Przygotowanie')
const prep = await agent([CONTEXT, RULES, TASK,
  "## Your job now: preparation only",
  "git fetch (read-only) and confirm the working tree is at origin/main. Prepare poznan-trend-detective/.venv with playwright (python -m playwright install chromium only if system Chrome is missing). List nisar_gcov track 57 provisional files. Map app.js with current line numbers: SARNIK core and ctx, loadGray, L8, LAND_KEYS/overlays/renderLand/CanvasOverlay, drawer rendering (renderDrawer, layerRow), legend (renderLegend), hover (onHover), radar time line (renderTimeline radar branch, RY, state.ryear, play), applyLang, main. Also the CI checks in .github/workflows/tests.yml. Return the map and anything fragile.",
].join("\n\n"), { label: 'przygotowanie', phase: 'Przygotowanie', model: 'sonnet', effort: 'low' })

phase('Implementacja')
const impl = await agent([CONTEXT, RULES, TASK, "## Preparation notes\n" + prep,
  "## Your job now: implement steps 1–6 (5 only if time allows), run the animation pipeline on the real data, check sizes (anim under 3 MB, files under 3 MB, web/data under 40 MB), run node --check on all web JS, tests/i18n_parity.mjs, tests/data_contract.py, docs/planwyd/kontrakt/selftest.mjs, read your diff and count changed lines in app.js. Do not bump ?v= yet.",
].join("\n\n"), { label: 'implementacja', phase: 'Implementacja', model: 'opus', effort: 'high' })

phase('Przegląd')
const lenses = [
  "## Lens: regressions. With no sarnik data folders and an empty module list the app must behave exactly as before; check every existing feature path you touched (time line both modes, drawer, legend, hover, language and theme switch, card). Look for listeners added per render, unescaped text, errors when a meta.json is malformed.",
  "## Lens: contract and data. ctx.loadGray(name, dir) against PLAN.md and fake_core.mjs; extension layers read meta.json exactly as PLAN.md defines (decode v*scale+offset for v>=1); animation frames averaged in linear power and versions not mixed; data_contract.py extensions correct and still green on main.",
  "## Lens: browser. Serve poznan-trend-detective/web on port 8772 and drive it with Playwright (Polish and English, 1440x900 and 390x844): radar view animation, extension layers (create a tiny temporary fake web/data/sarnik/test/meta.json + PNG only in a copy or via page.route, never commit it), module rows when module files exist or are missing. Fail on page errors and on 'undefined', 'NaN', '[object' in visible text. Stop the server.",
]
const reviews = await parallel(lenses.map((l) => () => agent([CONTEXT, RULES, TASK, "## Implementer's report (claims to check)\n" + impl, l,
  "Do not change app files. Report findings with your own evidence."].join("\n\n"), { label: 'przegląd', phase: 'Przegląd', model: 'opus', effort: 'high', schema: REVIEW_SCHEMA })))
const findings = reviews.filter(Boolean).flatMap((r) => r.findings || [])
log('Przegląd: ' + findings.length + ' uwag')

phase('Poprawki')
const fixes = findings.length ? await agent([CONTEXT, RULES, TASK, "## Findings\n" + JSON.stringify(findings, null, 1),
  "Confirm each finding, fix the real ones (blockers and majors first), keep the change small, one line per finding."].join("\n\n"),
  { label: 'poprawki', phase: 'Poprawki', model: 'opus', effort: 'high' }) : '(brak uwag)'

phase('Kontrola')
const check = await agent([CONTEXT, RULES, TASK, "## Fix report\n" + fixes,
  "## Final check: all CI checks locally (node --check on web JS, i18n_parity, data_contract, selftest), tests/sarnik/sar3_browser.py, sizes. As the very last edit bump every ?v= in web/index.html to one new larger number. git status: only computer 3's files. PR description in Polish: what, why (audit R10 and items 6–7, contract 1.1), merge note (merge after PRs of computers 1, 2, 4 or before them: missing sets and modules are ignored), tests, unverified items, deploy note for the Firebase owner."].join("\n\n"),
  { label: 'kontrola', phase: 'Kontrola', model: 'opus', effort: 'high', schema: CHECK_SCHEMA })

return { branch: 'sar-3-mapa', all_green: check ? check.all_green : null, app_js_changed_lines: check ? check.app_js_changed_lines : null, data_mb: check ? check.data_mb : null,
  findings: findings.length, changed_files: check ? check.changed_files : null, pr_description: check ? check.pr_description : null, notes: check ? check.notes : 'brak kontroli' }
