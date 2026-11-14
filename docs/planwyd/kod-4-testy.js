export const meta = {
  name: 'sarnik-kod-4-testy',
  description: 'Urządzenie 4 (kod): testy automatyczne, CI i przegląd aplikacji SARnik v2',
  phases: [
    { title: 'Przygotowanie', detail: 'środowisko testowe i mapa kodu', model: 'sonnet' },
    { title: 'Szukanie', detail: '6 soczewek: JS, teksty, przeglądarka, sieć, oczami jurora, CI', model: 'opus' },
    { title: 'Weryfikacja', detail: '3 agentów podważa każdą uwagę', model: 'opus' },
    { title: 'Poprawki', detail: 'tylko małe i bezpieczne', model: 'opus' },
    { title: 'Kontrola', detail: 'ponowne testy i zrzuty ekranu', model: 'opus' },
    { title: 'Raport', detail: 'docs/przeglad-v2/APLIKACJA.md', model: 'opus' },
  ],
}

// Uruchomienie: Workflow({scriptPath: "<repo>/docs/planwyd/kod-4-testy.js", args: {repo: "<pełna ścieżka do repo>"}})
// Opcjonalnie args.python = ścieżka do Pythona, w którym jest już pakiet playwright.
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const PYARG = (typeof args === 'object' && args && args.python) ? String(args.python) : ''
const WHERE = REPO
  ? "The repository root on this machine is " + REPO + " . Use absolute paths under it."
  : "First find the repository root: run git rev-parse --show-toplevel in your working directory. Use absolute paths under it."

const CONTEXT = [
  "## Context (established on 14 Nov 2026; trust it, do not re-derive)",
  "- Team SpaceWalkers, NASA Space Apps Challenge 2026, challenge 'Dancing with the SARs' (an interactive app that uses NISAR radar data to track and visualise surface change). Submission closes Sunday 15 Nov 2026 at 23:59 (Poland). Judges score Impact, Creativity, Validity, Relevance and Presentation from 1 to 5.",
  "- The app: SARnik (formerly 'Poznań Trend Detective'), in poznan-trend-detective/. A Leaflet single page: web/index.html, web/app.js (about 1800 lines, one IIFE), web/i18n.js and web/i18n_sar.js (strings in Polish and English), web/styles.css, data in web/data (about 28 MB; web/data/land/*.png are grey-level layers on a 956 x 898 grid decoded in the browser; land.json and sar.json are metadata). A user searches an address or draws an area and gets a place card with a 'technical inspection of the land'.",
  "- Version 2 landed on main on 14 Nov at 18:30 and made radar the main subject (Sentinel-1 2026, NISAR GCOV pixels, EGMS, ALOS-2, 'How radar sees the ground', a layer of building decisions added by another teammate). poznan-trend-detective/README.md describes it. The app's author is still editing web/app.js, so findings matter more than large code changes.",
  "- Deployment is by the Firebase project owner only. The public address still serves version 1; version 2 has a preview address in the README.",
  "- poznan-trend-detective/promo/capture.py shows how the app was driven with Playwright before (system Chrome through channel='chrome', a stub for the Nominatim geocoder).",
  "- Another computer reviews the radar science and the pipeline (docs/przeglad-v2/NAUKA.md). Stay with the app: code, texts, browser behaviour, loading and what a judge sees.",
].join("\n")

const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Read anything in the repository. Unless your task says otherwise, create or edit files ONLY under docs/przeglad-v2/ , poznan-trend-detective/tests/ and .github/workflows/ . Do not create files under poznan-trend-detective/tests/sarnik/ or tests/nauka/ : other computers own those folders.",
  "- Never run git commands that change state (add, commit, push, checkout, switch, stash, reset, clean, merge, rebase). Never deploy and never run firebase.",
  "- Report only what you verified. Each finding needs the file, the place (function or line), the problem, the evidence (the code line, a command and its output, or a screenshot path) and a concrete fix. Do not report style preferences.",
  "- Severity: blocker = breaks the app or misleads the user or the jury; major = wrong behaviour in a realistic case; minor = polish.",
  "- When you start a local web server, use the port given in your task, start it in the background, and stop it before you finish.",
].join("\n")

const PREP_SCHEMA = {
  type: 'object',
  properties: {
    python: { type: 'string' },
    playwright_ok: { type: 'boolean' },
    browser: { type: 'string' },
    node_ok: { type: 'boolean' },
    code_map: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['python', 'playwright_ok', 'code_map'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
      file: { type: 'string' }, where: { type: 'string' },
      problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' },
    }, required: ['severity', 'file', 'problem', 'evidence', 'fix'] } },
    tests: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' },
    }, required: ['name', 'passed'] } },
    files_written: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'findings'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: { verdicts: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, real: { type: 'boolean' }, evidence: { type: 'string' },
    severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, fix: { type: 'string' },
  }, required: ['id', 'real', 'evidence'] } } },
  required: ['verdicts'],
}
const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    all_green: { type: 'boolean' },
    tests: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' },
    }, required: ['name', 'passed'] } },
    screenshots: { type: 'array', items: { type: 'string' } },
    changed_files: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['all_green', 'tests', 'notes'],
}

phase('Przygotowanie')
const prep = await agent([
  "You prepare a test environment and a map of the code for a review team. Be quick and factual.",
  CONTEXT, RULES,
  "## Task 1: environment",
  PYARG
    ? "A Python interpreter was given: " + PYARG + " . Check that it can import playwright; if it cannot, install playwright into it with pip."
    : "Create (if it does not exist) a virtual environment at poznan-trend-detective/.venv with python3 -m venv (this directory is git-ignored) and install the package playwright into it.",
  "Check that Playwright can launch a browser headless: first try system Chrome with channel='chrome'; if Chrome is not installed, run 'python -m playwright install chromium' in that environment and use the bundled Chromium. Check that node is available (node --version). Report the absolute path of the Python interpreter, whether Playwright works, which browser will be used, and whether node works.",
  "## Task 2: code map",
  "Read poznan-trend-detective/web/app.js, web/index.html, web/i18n_sar.js and the README. Write a map (at most 600 words) for reviewers: the main functions with line numbers (state, layers, redraw, drawer, legend, timeline including the L-band axis, selection, place card, inspection checklist, 'How radar sees the ground', the building-decisions layer, loading of sar.json and of the PNG layers), which data file each part reads, how to open a place by URL hash, element ids useful for tests, and anything that looks fragile.",
].join("\n\n"), { label: 'środowisko i mapa kodu', phase: 'Przygotowanie', model: 'sonnet', effort: 'low', schema: PREP_SCHEMA })
if (!prep) throw new Error('Przygotowanie nie zwróciło wyniku')
const PY = prep.python
const ENV = [
  "## Test environment",
  "- Python with Playwright: " + PY + (prep.playwright_ok ? "" : " (WARNING: Playwright did not work in preparation: " + (prep.notes || 'no details') + ")"),
  "- Browser: " + (prep.browser || "system Chrome through channel='chrome'") + ". Node available: " + (prep.node_ok === false ? "no" : "yes") + ".",
  "## Code map\n" + prep.code_map,
].join("\n")
log('Przygotowanie: python ' + PY + ', playwright ' + (prep.playwright_ok ? 'działa' : 'NIE działa'))

const LENSES = [
  { key: 'js', task: "## Your lens: JavaScript correctness\nRead web/app.js fully, with attention to the code added in version 2 and to the building-decisions layer. Look for: runtime errors; behaviour when sar.json or a PNG layer fails to load or is still loading; race conditions when the selection or the year changes during an async step; wrong decoding of grey levels (compare with the 'decode' section of web/data/land/sar.json); the timeline with its L-band axis; the checklist rows (thresholds, divisions by zero, empty selections, areas versus points); language and theme switching; memory or listener leaks; external text put into HTML without escaping. Run node --check on every JS file. Confirm suspicions by running small snippets with node where you can." },
  { key: 'teksty', task: "## Your lens: Polish/English parity and wording\nWrite poznan-trend-detective/tests/i18n_parity.mjs: a Node script that loads web/i18n.js and web/i18n_sar.js with a fake window object, compares the key sets of the Polish and English trees recursively, calls every function-valued string with dummy arguments, and exits non-zero on a missing key or on the text 'undefined' or 'NaN' in any result. Run it and report the result as a test. Then read every new string in both languages: Polish must read naturally (no calques from English, correct plural forms and cases); English must be correct; the two must say the same thing. Flag wording that promises more than the feature does (compare with the 'Limits we state openly' section of the README)." },
  { key: 'e2e', task: "## Your lens: behaviour in a real browser\nWrite poznan-trend-detective/tests/e2e_sarnik.py (Playwright for Python, headless). Serve poznan-trend-detective/web with 'python -m http.server 8742' in the background. Stub the Nominatim geocoder as promo/capture.py does. Scenarios, each in Polish and in English, at 1440x900 and at 390x844: (1) the start page loads without console errors and shows the SARnik name; (2) open a place by URL hash in central Poznań and one in a suburb (for example Dopiewo, 52.35844,16.67640): the place card renders, the inspection checklist has its radar rows, no text says undefined, NaN or [object; (3) move the timeline through its ranges including the L-band axis and the projection; (4) switch on each radar layer in the drawer in turn and check the legend updates; (5) open 'How radar sees the ground'; (6) draw an area if the test can drive the drawing tool, otherwise say it could not; (7) switch language and theme with a card open. Fail a scenario on any pageerror or console error. Save at most 12 screenshots as JPEG (quality 70, at most 250 KB each) into docs/przeglad-v2/zrzuty/ with descriptive names. Report every scenario as a test (passed true or false with a detail line) and every bug as a finding with the screenshot path as evidence." },
  { key: 'siec', task: "## Your lens: loading, network and failure handling\nMeasure what the app downloads: serve poznan-trend-detective/web with 'python -m http.server 8744' and use Playwright to record every request and its size (a) on first load, (b) after selecting a place, (c) after switching on each radar layer. Report totals and the largest files, and judge them for a phone on mobile data. Read poznan-trend-detective/firebase.json for cache headers. Check what the user sees when a data file is missing or slow (use page.route to abort or delay web/data/land/sar.json and one PNG layer) and when external services (map tiles, NASA GIBS, geocoder, any WMS) fail. With curl, check that the public address and the version 2 preview address given in the README respond and which version each serves (look for data/land/sar.json on each). Report each check as a test." },
  { key: 'ci', task: "## Your lens: automatic checks on every push\nWrite two files. (1) poznan-trend-detective/tests/data_contract.py (Python standard library plus pillow if it is installed; skip image checks with a clear message if it is not): checks that web/data/land/land.json and sar.json parse and hold the keys the app reads (grep web/app.js for the keys), that every PNG layer named in sar.json and every layer the app requests exists and is 956 x 898 pixels, that each layer's 'decode' rule is present, that web/data stays under 40 MB and no single file exceeds 3 MB, and that no file under web/ contains an API key or token pattern. It exits non-zero on failure and prints one line per check. Run it and report the result as a test. (2) .github/workflows/tests.yml : a GitHub Actions workflow that runs on every push and pull request touching poznan-trend-detective/ : node --check on every JS file under poznan-trend-detective/web, node poznan-trend-detective/tests/i18n_parity.mjs if the file exists, python poznan-trend-detective/tests/data_contract.py , and node docs/planwyd/kontrakt/selftest.mjs . Use only actions/checkout, actions/setup-node and actions/setup-python at pinned major versions, no secrets, read-only permissions, and a job timeout. Validate the YAML by parsing it. Do not add the browser test to CI (it needs a browser and network); mention how to run it locally in a comment. Report as findings anything in the data that the contract check flags." },
  { key: 'juror', task: "## Your lens: what a judge sees in five minutes\nYou are a NASA Space Apps judge opening the app for the first time, on a laptop and then on a phone. Serve poznan-trend-detective/web with 'python -m http.server 8743' and use Playwright to walk through it (take your own screenshots into a temporary directory, not into the repository). Judge, with evidence: is it clear within ten seconds what the app is and that NISAR is central; can you find what NISAR shows about one address; does the app explain which polarisations show the change and why (the challenge asks this); are the limits stated; is the data attributed (NASA NISAR, Copernicus, JAXA, PIG-PIB and the others listed in the README) and is the use of SI/AI tools disclosed somewhere a judge will look; is anything confusing, mislabelled, or left over from the old name 'Poznań Trend Detective'; is it usable on a 390 px wide phone (overlaps, cut-off text, unreachable controls); basic accessibility (contrast, keyboard focus, labels). Report concrete findings, not impressions." },
]
phase('Szukanie')
const reviews = await parallel(LENSES.map((l) => () => agent([
  "You review a web app before a hackathon jury sees it. Do not fix the app's code; report findings.",
  CONTEXT, RULES, ENV, l.task,
].join("\n\n"), { label: 'szukanie: ' + l.key, phase: 'Szukanie', model: 'opus', effort: 'high', schema: REVIEW_SCHEMA })))
let n = 0
const all = reviews.flatMap((r, i) => (r && r.findings ? r.findings : []).map((f) => Object.assign({ id: 'A' + (++n), lens: LENSES[i].key }, f)))
const tests1 = reviews.flatMap((r) => (r && r.tests ? r.tests : []))
log('Szukanie: ' + all.length + ' uwag od ' + reviews.filter(Boolean).length + '/' + LENSES.length + ' soczewek')

phase('Weryfikacja')
const chunk = (arr, k) => { const out = []; for (let i = 0; i < k; i++) out.push([]); arr.forEach((x, i) => out[i % k].push(x)); return out.filter((c) => c.length) }
const verif = all.length ? await parallel(chunk(all, 3).map((batch, i) => () => agent([
  "You verify review findings about a web app. For each finding, try to REFUTE it: read the code at the named place, run the command or a small script, reproduce it in the browser if needed (serve poznan-trend-detective/web on port " + (8750 + i) + "). A finding is real only if you can show evidence yourself. If you cannot decide, mark it not real and say what is missing.",
  CONTEXT, RULES, ENV,
  "## Findings to verify\n" + JSON.stringify(batch, null, 1),
  "For each id return: real (true or false), your own evidence (code line, command output or observation), the severity you would give it, and the fix if you would change the proposed one.",
].join("\n\n"), { label: 'weryfikacja ' + (i + 1), phase: 'Weryfikacja', model: 'opus', effort: 'high', schema: VERIFY_SCHEMA }))) : []
const vmap = {}
verif.filter(Boolean).forEach((v) => (v.verdicts || []).forEach((x) => { vmap[x.id] = x }))
const confirmed = all.filter((f) => vmap[f.id] && vmap[f.id].real).map((f) => Object.assign({}, f, {
  severity: vmap[f.id].severity || f.severity, verified_evidence: vmap[f.id].evidence, fix: vmap[f.id].fix || f.fix }))
const rejected = all.filter((f) => vmap[f.id] && !vmap[f.id].real).map((f) => ({ id: f.id, problem: f.problem, why_rejected: vmap[f.id].evidence }))
const unverified = all.filter((f) => !vmap[f.id])
log('Weryfikacja: potwierdzone ' + confirmed.length + ', odrzucone ' + rejected.length + ', niesprawdzone ' + unverified.length)

phase('Poprawki')
const fixable = confirmed.filter((f) => f.severity !== 'minor' || /i18n|styles\.css/.test(f.file || ''))
const fixes = fixable.length ? await agent([
  "You apply small, safe fixes to a web app that its author is still editing. Large changes would collide with his work, so restraint matters more than completeness.",
  CONTEXT, RULES, ENV,
  "## Confirmed findings\n" + JSON.stringify(fixable, null, 1),
  "## What you may change (overrides the general rule on files)",
  "- poznan-trend-detective/web/i18n.js and web/i18n_sar.js: wording, missing keys, plural forms.",
  "- poznan-trend-detective/web/styles.css: small layout fixes.",
  "- poznan-trend-detective/web/app.js and web/index.html: ONLY for findings of severity blocker or major, and only if the fix is at most about 15 changed lines, local to one function and obviously safe. No refactoring, no reformatting, no renaming.",
  "- poznan-trend-detective/tests/: anything.",
  "Everything else stays untouched and goes into the report as a recommendation for the author.",
  "For each finding reply: fixed (with file and a one-line description), or left for the author (with the reason). Run node --check on every JS file you touch and re-run poznan-trend-detective/tests/i18n_parity.mjs if it exists. Do not start a web server.",
].join("\n\n"), { label: 'małe poprawki', phase: 'Poprawki', model: 'opus', effort: 'high' }) : null
if (!fixable.length) log('Poprawki: nic do poprawienia')

phase('Kontrola')
const check = await agent([
  "You run the final check after a review of a web app. You are the only one working in the tree now.",
  CONTEXT, RULES, ENV,
  "## Fix report\n" + (fixes || '(no fixes were made)'),
  "## Your task",
  "1. Run and record as tests: node --check on every JS file under poznan-trend-detective/web; node poznan-trend-detective/tests/i18n_parity.mjs if it exists; " + PY + " poznan-trend-detective/tests/data_contract.py if it exists; " + PY + " poznan-trend-detective/tests/e2e_sarnik.py if it exists (it serves the app on port 8742; make sure the port is free and the server is stopped afterwards).",
  "2. If a test fails because of something a fix broke, repair it within the same limits as the fixer (small and local) or revert that fix by hand, and say which.",
  "3. Make sure docs/przeglad-v2/zrzuty/ holds at most 12 JPEG screenshots of at most 250 KB each that show the current state: start page, a place card in Polish on a laptop, the same on a phone, the radar checklist rows, 'How radar sees the ground', one radar layer with its legend. Retake them if fixes changed the look.",
  "4. Run git status and list the changed and new files. Confirm that nothing outside docs/przeglad-v2/ and poznan-trend-detective/ changed and that no data file under web/data was modified.",
  "5. Add a short poznan-trend-detective/tests/README.md (Polish, about 12 lines) on how to run the tests locally and what the GitHub workflow runs.",
  "6. Write the pull request description in Polish and put it at the end of your notes: what the tests cover, the result of each, the small fixes made (file and one line each), what was left for the author, and that the workflow needs no secrets.",
].join("\n\n"), { label: 'kontrola końcowa', phase: 'Kontrola', model: 'opus', effort: 'high', schema: CHECK_SCHEMA })

phase('Raport')
const report = await agent([
  "You write the review report for the app's author and the team. Write one file and nothing else.",
  CONTEXT, RULES,
  "## Confirmed findings (verified by a second reviewer)\n" + JSON.stringify(confirmed, null, 1),
  "## Findings rejected in verification\n" + JSON.stringify(rejected, null, 1),
  "## Findings nobody verified\n" + JSON.stringify(unverified, null, 1),
  "## Tests from the search phase\n" + JSON.stringify(tests1, null, 1),
  "## Fix report\n" + (fixes || '(no fixes were made)'),
  "## Final check\n" + JSON.stringify(check || { notes: 'the final check did not return a result' }, null, 1),
  "## Your task",
  "Write docs/przeglad-v2/APLIKACJA.md in Polish (plain short sentences, GitHub Markdown): (1) 'W skrócie': five lines at most, the state of the app and the three things to fix first; (2) 'Do poprawy przed zgłoszeniem': a table of confirmed blockers and majors (id | plik i miejsce | problem | dowód | poprawka | status: poprawione w PR albo do decyzji autora); (3) 'Drobiazgi': confirmed minors as a list; (4) 'Testy': what was run, the result of each, and how to run them again; (5) 'Zrzuty ekranu': the files in docs/przeglad-v2/zrzuty/ with one line each, embedded as images with relative links; (6) 'Czego nie sprawdzono': unverified findings and anything the tests could not cover; (7) 'Odrzucone uwagi': one line each, so nobody raises them again.",
  "Do not soften confirmed problems and do not add findings of your own. Reply with the file path and the counts.",
].join("\n\n"), { label: 'raport APLIKACJA.md', phase: 'Raport', model: 'opus', effort: 'high' })

return {
  branch: 'sarnik-testy',
  pr: 'otwarty: testy, CI i małe poprawki; raport docs/przeglad-v2/ można zmergować osobno',
  files: ['docs/przeglad-v2/APLIKACJA.md', 'docs/przeglad-v2/zrzuty/', 'poznan-trend-detective/tests/', '.github/workflows/tests.yml'],
  findings: { all: all.length, confirmed: confirmed.length, rejected: rejected.length, unverified: unverified.length },
  blockers: confirmed.filter((f) => f.severity === 'blocker').map((f) => f.id + ': ' + f.problem),
  all_green: check ? check.all_green : null,
  changed_files: check ? check.changed_files : null,
  notes: check ? check.notes : null,
  report_written: !!report,
}
