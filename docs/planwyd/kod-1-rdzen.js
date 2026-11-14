export const meta = {
  name: 'sarnik-kod-1-rdzen',
  description: 'Urządzenie 1 (kod): rdzeń rozszerzeń w karcie miejsca (start dopiero po scaleniu gałęzi v3)',
  phases: [
    { title: 'Przygotowanie', detail: 'środowisko testowe i mapa kodu', model: 'sonnet' },
    { title: 'Projekt', detail: 'dokładne punkty wstawienia', model: 'opus' },
    { title: 'Implementacja', detail: 'rdzeń według kontraktu', model: 'opus' },
    { title: 'Przegląd', detail: '3 soczewki: regresje, kontrakt, przeglądarka', model: 'opus' },
    { title: 'Poprawki', detail: 'poprawki z przeglądu', model: 'opus' },
    { title: 'Kontrola', detail: 'testy końcowe i opis PR', model: 'opus' },
  ],
}

// Uruchomienie: Workflow({scriptPath: "<repo>/docs/planwyd/kod-1-rdzen.js", args: {repo: "<pełna ścieżka do repo>"}})
// Opcjonalnie args.python = ścieżka do Pythona z pakietem playwright.
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const PYARG = (typeof args === 'object' && args && args.python) ? String(args.python) : ''
const WHERE = REPO
  ? "The repository root on this machine is " + REPO + " . Use absolute paths under it."
  : "First find the repository root: run git rev-parse --show-toplevel in your working directory. Use absolute paths under it."

const CONTEXT = [
  "## Context (established on 14 Nov 2026; trust it, do not re-derive)",
  "- Team SpaceWalkers, NASA Space Apps Challenge 2026, challenge 'Dancing with the SARs'. Submission closes Sunday 15 Nov 2026 at 23:59 (Poland).",
  "- The app: SARnik, in poznan-trend-detective/. A Leaflet single page: web/index.html, web/app.js (about 1820 lines, one IIFE), web/i18n.js and web/i18n_sar.js (strings in Polish and English, window.I18N), web/styles.css, data in web/data. A user searches an address or draws an area and gets a place card with a 'technical inspection of the land' (function inspectionHTML builds rows {lvl: ok|warn|risk|info, t, v, word?, link?}).",
  "- Version 2 is on main since 14 Nov 18:30 (radar as the main subject). Its author and another teammate are still editing web/app.js, so this change must be SMALL and local: target at most about 120 changed lines in app.js, only in the code that builds the place card and handles selection (never the map engine or the layers), no refactoring beyond what the task names, no reformatting.",
  "- State of the place card on 14 Nov 19:10 (check it again before you start): on main the card still shows the technical checklist built by inspectionHTML, and at 19:05-19:08 a teammate moved that checklist to the top of the card, folded the raw radar block into a collapsed 'for experts' section, and changed default layers, the hover tooltip and the Today button. On branch origin/v3 (the app author's next version, with a preview address in the README) the card opens with a plain check-up: plainChecks(sel) returns rows {lvl, t, v, src, sar} and plainHTML renders a header with the number of things to check (rows at level warn or risk) and two groups, 'From SAR radar' and 'Background from other sources'; the old inspectionHTML remains only in expert mode. docs/poprawa_mapy.md also plans a larger rebuild of the map engine with a switch gate on Sunday 14:00 and a code freeze at 16:00.",
  "- This work must be built on the version of the card that will ship. It therefore starts only when origin/v3 is merged into origin/main (the workflow checks this and stops otherwise). There is NO separate warning counter to build: the header of the plain check-up already counts the things to check, and the core must make it count module rows too.",
  "- Five computers code in parallel. This one builds the CORE: the extension points described in docs/planwyd/KONTRAKT.md (binding; read it first). Other computers write modules (flood, landslide, wuia) as separate files against the same contract, tested with docs/planwyd/kontrakt/fake_core.mjs. docs/planwyd/kontrakt/example_module.js is a reference module and docs/planwyd/kontrakt/selftest.mjs shows the expected behaviour.",
  "- Only this computer may edit web/app.js, web/index.html, web/i18n.js, web/i18n_sar.js, web/styles.css and web/sarnik/manifest.js. It must not create module files other than the manifest.",
  "- Deployment is by the Firebase project owner only. The result of this work is an open pull request.",
].join("\n")

const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Read anything in the repository. Unless your task says otherwise, change files ONLY under poznan-trend-detective/web (the core files named above and web/sarnik/manifest.js) and poznan-trend-detective/tests/ .",
  "- Never run git commands that change state (add, commit, push, checkout, switch, stash, reset, clean, merge, rebase). Never deploy and never run firebase.",
  "- No new runtime dependencies (no npm packages, no new CDN scripts). Plain browser JavaScript in the style of the existing code.",
  "- Keep every existing feature working. With an empty module list the app must look and behave exactly as before.",
  "- Every new user-facing string exists in Polish and English; Polish must read naturally.",
  "- When you start a local web server, use the port given in your task, start it in the background, and stop it before you finish.",
  "- Final message: a compact factual report (what you did, files changed, how you verified, what is unverified). Never report a check you did not run.",
].join("\n")

const PREP_SCHEMA = {
  type: 'object',
  properties: {
    python: { type: 'string' }, playwright_ok: { type: 'boolean' }, browser: { type: 'string' }, node_ok: { type: 'boolean' },
    v3_merged: { type: 'boolean' }, card_state: { type: 'string' },
    code_map: { type: 'string' }, notes: { type: 'string' },
  },
  required: ['python', 'playwright_ok', 'v3_merged', 'card_state', 'code_map'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
      file: { type: 'string' }, where: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' },
    }, required: ['severity', 'file', 'problem', 'evidence', 'fix'] } },
    tests: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' },
    }, required: ['name', 'passed'] } },
  },
  required: ['summary', 'findings'],
}
const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    all_green: { type: 'boolean' },
    tests: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' },
    }, required: ['name', 'passed'] } },
    changed_files: { type: 'array', items: { type: 'string' } },
    app_js_changed_lines: { type: 'number' },
    pr_description: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['all_green', 'tests', 'pr_description', 'notes'],
}

phase('Przygotowanie')
const prep = await agent([
  "You prepare a test environment and a map of the code for an implementer. Be quick and factual.",
  CONTEXT, RULES,
  "## Task 0: is it safe to start",
  "Run git fetch --all (allowed: it does not touch the working tree). Report in v3_merged whether branch origin/v3 is fully merged into origin/main (git merge-base --is-ancestor origin/v3 origin/main; if the branch no longer exists, answer true). Report in card_state, in three sentences: whether the working tree is at origin/main, whether web/app.js on main has the functions plainChecks and plainHTML, and what builds the first check-up the user sees in the card.",
  "## Task 1: environment",
  PYARG
    ? "A Python interpreter was given: " + PYARG + " . Check that it can import playwright; if not, install playwright into it with pip."
    : "Create (if it does not exist) a virtual environment at poznan-trend-detective/.venv with python3 -m venv (git-ignored) and install the package playwright into it.",
  "Check that Playwright can launch a browser headless: first system Chrome with channel='chrome'; if Chrome is missing, run 'python -m playwright install chromium' in that environment and use the bundled Chromium. Check node --version. Run node docs/planwyd/kontrakt/selftest.mjs and report whether it passes.",
  "## Task 2: code map",
  "Read docs/planwyd/KONTRAKT.md, then poznan-trend-detective/web/app.js, web/index.html and the start of web/i18n_sar.js. Write a map (at most 500 words) with current line numbers for: the helper definitions at the top (esc, num, sgn, fmtInt, lang, T, U, DATA_V), L8 and loadGray, landCell, inFlood, mercToLatLng, the state object, the sar variable, selectPoint, selectArea, finishSelection, renderCard (where the title h2 is built, where radarBlock is inserted, where inspectionHTML is called), inspectionHTML (how items are built and rendered), applyLang, main, and the script tags in index.html with their ?v= value. Note anything that makes the insertion points fragile.",
].join("\n\n"), { label: 'środowisko i mapa kodu', phase: 'Przygotowanie', model: 'sonnet', effort: 'low', schema: PREP_SCHEMA })
if (!prep) throw new Error('Przygotowanie nie zwróciło wyniku')
const PY = prep.python
const FORCE = (typeof args === 'object' && args && args.force) ? true : false
if (prep.v3_merged === false && !FORCE) {
  log('STOP: gałąź v3 autora aplikacji nie jest jeszcze w main. Rdzeń trzeba zbudować na karcie, która wejdzie do zgłoszenia.')
  return {
    started: false,
    reason: 'Gałąź origin/v3 nie jest scalona z main, więc zmiana w karcie zderzyłaby się z pracą autora aplikacji. Uruchom ten skrypt ponownie po scaleniu v3 (albo z args.force = true, jeśli zespół zdecydował inaczej).',
    card_state: prep.card_state,
  }
}
const ENV = [
  "## Test environment",
  "- Python with Playwright: " + PY + (prep.playwright_ok ? "" : " (WARNING: Playwright did not work in preparation: " + (prep.notes || 'no details') + ")"),
  "- Browser: " + (prep.browser || "system Chrome through channel='chrome'") + ". Node available: " + (prep.node_ok === false ? "no" : "yes") + ".",
  "## Code map\n" + prep.code_map,
].join("\n")

phase('Projekt')
const design = await agent([
  "You design a small, exact change to an existing web app. Do not edit any file. An implementer will follow your specification literally.",
  CONTEXT, RULES, ENV,
  "## Your task",
  "Read docs/planwyd/KONTRAKT.md, docs/planwyd/kontrakt/fake_core.mjs (the reference behaviour) and the relevant parts of poznan-trend-detective/web/app.js. Specify, with function names and current line anchors:",
  "1. Where window.SARNIK and the ctx object are created (they must exist synchronously when app.js is evaluated, before main() runs) and how each ctx field maps to an existing helper. For helpers the contract needs but the app lacks (cellCentre, distM, loadJSON, fetchOnce, rerender, t), give the exact code.",
  "2. The module loader: index.html gets one script tag for sarnik/manifest.js placed before app.js; app.js reads window.SARNIK_MODULES (a list of names or of {name, css} objects), and appends a script tag (and a stylesheet link when css is true) for each, with the same ?v= value as other assets. A missing or empty list means no modules. Initial content of web/sarnik/manifest.js: an empty list with a comment explaining how to add a module.",
  "3. Module rows in the card. A helper moduleItems(sel) calls every registered checks function (each wrapped in try/catch with console.warn), prefixes ids with the module name, forces pending rows to level info and defaults sar to 'no'. Its rows are appended (a) to the rows of the plain check-up (plainChecks), so that they appear in the group given by sar and render with their src line and, when pending, a 'checking' word; and (b) to the technical checklist of expert mode (inspectionHTML), unchanged otherwise. If the card on main has no plain check-up at the time you read it, say so and hook only what exists.",
  "4. The header count. Do NOT add a new counter. The existing header of the plain check-up (the number of things to check) must count module rows at level warn or risk and must not count pending rows. Give the exact edit and the one new string needed for a pending row in Polish and English.",
  "5. cardTop output inserted right after the radar block; onSelect hooks called in finishSelection after sel.ready is set and before or right after renderCard, with sel.ext initialised; the data-sk click delegation on the card for onAction.",
  "6. What must not change, and a list of every line of existing behaviour your change touches.",
  "7. The contract test in a real browser (for the reviewers): how to serve the app, route sarnik/manifest.js to list the example module, serve docs/planwyd/kontrakt/example_module.js as sarnik/example.js, stub https://example.invalid/ and what to assert.",
  "Return the specification as Markdown. Be concrete: code, names and strings, not intentions.",
].join("\n\n"), { label: 'projekt rdzenia', phase: 'Projekt', model: 'opus', effort: 'xhigh' })
if (!design) throw new Error('Projekt nie powstał')

phase('Implementacja')
const impl = await agent([
  "You implement the core extension points of a web app exactly as specified. Other computers are writing modules against the same contract right now, so the behaviour must match docs/planwyd/KONTRAKT.md and docs/planwyd/kontrakt/fake_core.mjs.",
  CONTEXT, RULES, ENV,
  "## Specification\n" + design,
  "## Your task",
  "1. Make the changes in poznan-trend-detective/web/app.js, web/index.html, web/i18n.js or web/i18n_sar.js (new strings), web/styles.css, and create web/sarnik/manifest.js. Do not bump the ?v= cache-buster; the final check does that.",
  "2. Run node --check on every JS file you touched. Load i18n.js and i18n_sar.js with a fake window in node -e and confirm that every new key exists in both languages.",
  "3. Read your diff (git diff) line by line for accidental changes to existing behaviour, and count the changed lines in app.js.",
  "End your report with the section 'Core as implemented': the final shape of window.SARNIK and ctx, and every deviation from the contract (ideally none).",
].join("\n\n"), { label: 'implementacja rdzenia', phase: 'Implementacja', model: 'opus', effort: 'high' })
if (!impl) throw new Error('Implementacja nie zwróciła raportu')

const LENSES = [
  { key: 'regresje', task: "## Your lens: regressions and JavaScript correctness\nRead the diff (git diff in the repository) and the surrounding code. Look for: any change in behaviour when the module list is empty; errors when a module throws, returns nothing, returns an array, or registers twice; races when the selection changes while fetchOnce is in flight (the old selection must not re-render the card); fetchOnce firing more than once per selection or on every year change; listeners added on every render; unescaped text; the header count being wrong when rows are pending; the timeline, drawer, legend, language and theme switches still working. Run node --check. Confirm suspicions with small node snippets." },
  { key: 'kontrakt', task: "## Your lens: conformance to the contract in a real browser\nWrite poznan-trend-detective/tests/sarnik/core_contract.py (Playwright for Python, headless). Serve poznan-trend-detective/web with 'python -m http.server 8761' in the background. With page.route: answer sarnik/manifest.js with a script that sets window.SARNIK_MODULES to the example module; answer sarnik/example.js with the content of docs/planwyd/kontrakt/example_module.js; answer https://example.invalid/** with the text 'value=7.25'. Stub the Nominatim geocoder as poznan-trend-detective/promo/capture.py does. Assert, by opening a place through the URL hash (#52.40220,16.94530): the example row appears first as pending (info) and then as a warning with the value formatted for the language; the card's header of things to check counts it once it is a warning and does not count it while it is pending; the row sits in the group for other sources (sar 'no') and also appears in expert mode; switching language changes the row's text; a second scenario where example.invalid fails gives an info row and the card still renders; a third where it never answers gives an info row after the timeout (shorten the wait by overriding the timeout only if the core allows it, otherwise wait); a fourth where the module's checks function throws does not break the card and logs a warning; with an empty manifest there is no extra row and no console error. Report each scenario as a test." },
  { key: 'przegladarka', task: "## Your lens: the app still works for a user\nServe poznan-trend-detective/web with 'python -m http.server 8762' and drive it with Playwright in Polish and English at 1440x900 and 390x844, with the real (empty) manifest: start page; a place in central Poznań and one in a suburb by URL hash; the timeline across its ranges; each drawer section; 'How radar sees the ground'; language and theme switch with a card open. Fail on any pageerror or console error and on the text undefined, NaN or [object in the card. Check that the number in the header of things to check equals the number of amber plus red rows shown, in both languages. Save up to 6 JPEG screenshots (quality 70) into poznan-trend-detective/tests/out/ (create a .gitignore there that ignores everything) and name the paths in your evidence." },
]
phase('Przegląd')
const reviews = await parallel(LENSES.map((l) => () => agent([
  "You review a small change to a web app before it goes to its author as a pull request. Do not change the app's code; report findings. Severity: blocker = breaks the app or the contract; major = wrong behaviour in a realistic case; minor = polish. Each finding needs your own evidence.",
  CONTEXT, RULES, ENV,
  "## Specification the change should follow\n" + design,
  "## Implementer's report (claims to check, not facts)\n" + impl,
  l.task,
].join("\n\n"), { label: 'przegląd: ' + l.key, phase: 'Przegląd', model: 'opus', effort: 'high', schema: REVIEW_SCHEMA })))
const findings = reviews.filter(Boolean).flatMap((r) => r.findings || [])
log('Przegląd: ' + findings.length + ' uwag, w tym ' + findings.filter((f) => f.severity === 'blocker').length + ' blokujących')

phase('Poprawki')
const fixes = findings.length ? await agent([
  "You fix review findings in a small change to a web app. Keep the change small: fix what is reported, do not refactor.",
  CONTEXT, RULES, ENV,
  "## Specification\n" + design,
  "## Findings\n" + JSON.stringify(findings, null, 1),
  "For each finding: confirm it by reading the code; fix it if real; say 'not real' with the reason if not. Blockers and majors first. Run node --check on every file you touch. Do not start a web server. Report per finding: fixed / not real / left, one line each.",
].join("\n\n"), { label: 'poprawki rdzenia', phase: 'Poprawki', model: 'opus', effort: 'high' }) : null
if (!findings.length) log('Poprawki: brak uwag')

phase('Kontrola')
const check = await agent([
  "You run the final check of a small change to a web app and prepare its pull request text. You are the only one working in the tree now.",
  CONTEXT, RULES, ENV,
  "## Fix report\n" + (fixes || '(no fixes were needed)'),
  "## Your task",
  "1. Run and record as tests: node --check on every JS file under poznan-trend-detective/web; node docs/planwyd/kontrakt/selftest.mjs; " + PY + " poznan-trend-detective/tests/sarnik/core_contract.py if it exists (port 8761; make sure it is free and the server is stopped afterwards).",
  "2. If a test fails for a small, clear reason, fix it and re-run; otherwise leave it failing and say exactly why.",
  "3. As the very last edit, bump the ?v= value on the stylesheet and script tags in web/index.html (all of them to one new number larger than the current one) and give the manifest script tag the same value.",
  "4. Run git status and git diff --stat; list changed and new files; count the changed lines in web/app.js; confirm nothing outside poznan-trend-detective/ changed and that web/sarnik contains only manifest.js.",
  "5. Write the pull request description in Polish (return it in pr_description, do not create a file): what changed and why; that with an empty module list the app behaves exactly as before; how modules get switched on (add the name to web/sarnik/manifest.js once the module's files are in main); the tests and their results; what is unverified; a deploy note for the author.",
].join("\n\n"), { label: 'kontrola końcowa', phase: 'Kontrola', model: 'opus', effort: 'high', schema: CHECK_SCHEMA })

return {
  branch: 'sarnik-rdzen',
  pr: 'otwarty, bez merge\'a (kod aplikacji)',
  all_green: check ? check.all_green : null,
  app_js_changed_lines: check ? check.app_js_changed_lines : null,
  changed_files: check ? check.changed_files : null,
  findings: findings.length,
  pr_description: check ? check.pr_description : null,
  notes: check ? check.notes : 'kontrola końcowa nie zwróciła wyniku',
}
