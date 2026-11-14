export const meta = {
  name: 'sarnik-kod-3-wuia',
  description: 'Urządzenie 3 (kod): moduł „Co tam powstanie” z decyzji budowlanych',
  phases: [
    { title: 'Sonda', detail: 'statystyka opisów decyzji', model: 'sonnet' },
    { title: 'Implementacja', detail: 'skrypt danych, moduł wuia i testy', model: 'opus' },
    { title: 'Przegląd', detail: '3 soczewki: klasyfikator, kontrakt, teksty', model: 'opus' },
    { title: 'Poprawki', detail: 'poprawki z przeglądu', model: 'opus' },
    { title: 'Kontrola', detail: 'testy końcowe i opis PR', model: 'opus' },
  ],
}

// Uruchomienie: Workflow({scriptPath: "<repo>/docs/planwyd/kod-3-wuia.js", args: {repo: "<pełna ścieżka do repo>"}})
// Opcjonalnie args.python = ścieżka do Pythona 3 (wystarczy biblioteka standardowa).
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const PY = (typeof args === 'object' && args && args.python) ? String(args.python) : 'python3'
const WHERE = REPO
  ? "The repository root on this machine is " + REPO + " . Use absolute paths under it."
  : "First find the repository root: run git rev-parse --show-toplevel in your working directory. Use absolute paths under it."

const CONTEXT = [
  "## Context (established on 14 Nov 2026; trust it, do not re-derive)",
  "- Team SpaceWalkers, NASA Space Apps Challenge 2026, challenge 'Dancing with the SARs'. Submission closes Sunday 15 Nov 2026 at 23:59 (Poland).",
  "- The app: SARnik, in poznan-trend-detective/ (a Leaflet single page; a user searches an address or draws an area around Poznań and gets a place card with a 'technical inspection of the land': rows with a green, amber, red or grey dot). The app's pitch line is: 'The model predicted it. NISAR sees it. The planning office confirms it.' The app already draws building decisions as a map layer (it loads web/data/wuia_decyzje.geojson, 2.6 MB), but the place card says nothing about what is planned next to the selected place.",
  "- Data: progres/p1/dane/wuia_decyzje.geojson (a copy is in poznan-trend-detective/web/data/). 2420 features, June to November 2026, city of Poznań only, parcel polygons, properties OBJECTID, RODZAJ, NR_SPRAWY, DATA (YYYY-MM-DD), OPIS (free text in Polish), NR_DZIALKI, kategoria (nowa budowa | rozbudowa | rozbiórka | inne) and status (decyzja | wniosek | sprzeciw/odmowa). The kategoria field was assigned automatically and is noisy: 'nowa budowa' includes conversions, water and gas connections and other utility works. progres/p1/skrypty/geopoz_wuia.py shows how the file was made.",
  "- Five computers code in parallel. This one writes the MODULE 'wuia' ('Co tam powstanie' / 'What is being built here') as separate files. Another computer writes the core that loads modules. The interface is docs/planwyd/KONTRAKT.md: binding, read it first. docs/planwyd/kontrakt/example_module.js is the pattern; docs/planwyd/kontrakt/fake_core.mjs and selftest.mjs show how to test a module in Node without the app.",
  "- How rows look in the card (on main since 14 Nov 19:27): a plain check-up for a home buyer. Each row is a short title, a level word, ONE or TWO plain sentences with no jargon and no dB, and a separate source line. Rows are grouped by the field sar; these modules do not use radar, so every row sets sar: 'no' and puts its source in src. Rows at level warn or risk are counted in the card's header 'things to check'. Read plainChecks in poznan-trend-detective/web/app.js and the 'plain' strings in poznan-trend-detective/web/i18n_sar.js to match the tone.",
  "- You may create or edit ONLY: poznan-trend-detective/pipeline/sarnik_wuia.py, poznan-trend-detective/web/data/sarnik/wuia/ (the data file), poznan-trend-detective/web/sarnik/wuia.js and wuia.css, poznan-trend-detective/tests/sarnik/wuia.test.mjs (plus fixtures under tests/sarnik/fixtures/). Never edit web/app.js, web/index.html, the i18n files, web/styles.css, web/sarnik/manifest.js or the existing wuia_decyzje.geojson files. The module files are inert until the core lists them, so this pull request is safe to merge at any time.",
].join("\n")

const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Python: " + PY + " with the standard library only (json, re, math). No new dependencies anywhere. Plain browser JavaScript; tests are plain Node scripts using docs/planwyd/kontrakt/fake_core.mjs.",
  "- Never run git commands that change state (add, commit, push, checkout, switch, stash, reset, clean, merge, rebase). Never deploy.",
  "- Honesty of user-facing text: a decision or an application is paperwork, not a building site; say 'decyzja' or 'wniosek', never 'budowa trwa'. Outside the city of Poznań the register has no data: the row is level 'info' and says the register covers only the city; it never reads as 'nothing is planned'. The row gives the date range of the data. Objections and refusals never raise the level.",
  "- The description text comes from an office register: escape it with ctx.esc, cut it to a short length, and do not show case numbers or anything that looks like a person's name.",
  "- Every string exists in Polish and English; Polish must read naturally.",
  "- Final message: a compact factual report (what you did, files written, how you verified, what is unverified). Never report a check you did not run.",
].join("\n")

phase('Sonda')
const probe = await agent([
  "You analyse a GeoJSON file for a hackathon web app. Use Python (" + PY + "). Report facts; mark anything uncertain. Do not write any file.",
  CONTEXT, RULES,
  "## Task",
  "File: progres/p1/dane/wuia_decyzje.geojson",
  "1. Report counts by kategoria x status, the date range, geometry types, and how many features have an empty OPIS.",
  "2. Study the OPIS texts. Propose a classifier for a building type used in the card: hala (hala, magazyn, produkcyjn, przemysł, logistyczn, centrum dystrybucyjn), wielorodzinny (wielorodzinn, blok mieszkaln), jednorodzinny (jednorodzinn, bliźniacz, szeregow), uslugi (usługow, handlow, biurow, szkoł, przedszkol, hotel, stacja paliw), droga (drog, ulic, rondo, most, wiadukt, torowisk), sieci (sieć, przyłącz, kanalizacj, gazociąg, wodociąg, instalacj, linia kablow, oświetleni, światłow; excluded from what users see), inne. Give regular expressions that work in both Python and JavaScript, the order in which they are applied, and what separates a NEW building from a conversion, renovation, change of use or extension (those are not 'new').",
  "3. Draw 80 random features (fixed seed 7) with kategoria 'nowa budowa'; show OPIS cut to 110 characters with the type your classifier assigns; read them yourself and estimate the error rate; list the typical mistakes.",
  "4. Report counts per type for kategoria 'nowa budowa', and how many remain after dropping sieci and non-new works; of those, how many have status decyzja.",
  "5. Estimate the size of a compact JSON with one row per kept decision: [lat, lng (centroid, 5 decimals), date, status, type, description cut to 90 characters].",
  "Return the classifier, the tables, the sample with your error estimate, the size estimate and caveats.",
].join("\n\n"), { label: 'sonda: opisy decyzji', phase: 'Sonda', model: 'sonnet', effort: 'low' })

phase('Implementacja')
const impl = await agent([
  "You write a data script, a module for a web app and its tests, against a fixed contract, so that the module works the moment the core is merged.",
  CONTEXT, RULES,
  "## Analysis of the decision texts\n" + (probe || '(the analysis returned nothing: study the file yourself first)'),
  "## Your task",
  "Read docs/planwyd/KONTRAKT.md, docs/planwyd/kontrakt/example_module.js, fake_core.mjs and selftest.mjs. Then write:",
  "1. poznan-trend-detective/pipeline/sarnik_wuia.py : reads progres/p1/dane/wuia_decyzje.geojson (path relative to the repository root, found from the script's own location) and writes poznan-trend-detective/web/data/sarnik/wuia/wuia.json : {v: 1, coverage: 'Poznań (miasto)', source: 'GEOPOZ, WUiA', dates: [min, max], built: '<date the file was built, passed as an argument or taken from the newest record>', cols: ['lat','lng','date','status','type','desc'], rows: [[...]]}. One row per decision that is a NEW building or road (drop utility networks, installations, conversions, renovations, changes of use; keep extensions out too). Centroid of the parcel polygon rounded to 5 decimals; description cut to 90 characters with case numbers removed. The classifier lives in one function with the regular expressions at the top. The script prints counts per type and per status and the file size. Run it; the file must be at most 400 KB.",
  "2. poznan-trend-detective/web/sarnik/wuia.js : registers 'wuia'. onSelect loads the data once with ctx.loadJSON('sarnik/wuia/wuia.json') through ctx.fetchOnce (so the row shows 'checking' first). checks returns one row: info outside the city of Poznań (sel.area is not 'Poznań'): the register covers only the city; pending while loading; info if the file failed to load; otherwise from decisions within 500 m of the point (for a drawn area: inside the ring or within 500 m of its centre, and say which): level warn if a hall, warehouse or road has a decision or an application; info if only housing or services are planned (list counts by type and the three nearest with distance, date and status); ok if nothing within 500 m ('no decisions for new buildings in the register for <date range>; a new decision can appear any day'). Refusals and objections are listed separately and never raise the level. Thresholds are named constants at the top. Expose the classifier-independent logic (nearby(), summarise()) as pure functions, and keep the same type names as the data file.",
  "3. poznan-trend-detective/tests/sarnik/wuia.test.mjs in the style of selftest.mjs with a small fixture built in the test (ten fake decisions around a point): outside Poznań, pending, load failure, a hall nearby, only housing nearby, nothing nearby, a refusal nearby, a drawn area, both languages, and core.problems() empty. It must exit non-zero on failure. Run it with node and paste the output.",
  "4. A CSS file only if the list of nearest decisions needs styling beyond the app's own.",
  "Run node --check on the module. Read 40 random rows of the data file and confirm the types make sense; fix the classifier if not, and report the error rate you see.",
].join("\n\n"), { label: 'moduł wuia', phase: 'Implementacja', model: 'opus', effort: 'high' })
if (!impl) throw new Error('Implementacja nie zwróciła raportu')

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
const LENSES = [
  { key: 'klasyfikator', task: "## Your lens: is the data right\nRe-run poznan-trend-detective/pipeline/sarnik_wuia.py and report it as a test. Draw 100 random rows of the output (seed 11) and, for each, find the original feature and judge: is it really a new building or road, and is the type right? Then draw 60 random features that the script DROPPED and check that none of them is an obviously new hall, block of flats or housing estate. Report the two error rates with examples. Check centroids (inside or next to their parcel; inside the city), dates, the description cut (no case numbers, nothing that looks like a person's name), the file size, and that the JSON matches the shape the module reads." },
  { key: 'kontrakt', task: "## Your lens: contract and correctness\nRead web/sarnik/wuia.js against docs/planwyd/KONTRAKT.md line by line: registration, no loading inside checks, one load per selection (and the data shared between selections), pending rows at level info, escaping, behaviour when sel.area is null, when the data file is empty or has an unknown version, with zero, one and hundreds of nearby decisions, and for a drawn area. Check the distance computation against a hand calculation for two points. Run the test file with node and report it as a test. Write three extra adversarial cases of your own in a temporary file (do not commit it)." },
  { key: 'teksty', task: "## Your lens: wording in Polish and English\nRead every string in both languages as a home buyer would. Polish must read naturally (cases, plural forms for 1, 2-4, 5+: 'decyzja', 'decyzje', 'decyzji'; 'wniosek', 'wnioski', 'wniosków'); English must be correct; both must say the same thing. Check honesty: paperwork is not a building site; an application is not a decision; outside Poznań the row says there is no data, not that nothing is planned; the date range is shown; a hall next door is described without alarm ('sprawdź w urzędzie, co powstaje'). Propose exact replacement strings." },
]
phase('Przegląd')
const reviews = await parallel(LENSES.map((l) => () => agent([
  "You review a new module of a web app and its data before they are merged. Do not change them; report findings with your own evidence. Severity: blocker = wrong or misleading result, or breaks the contract; major = wrong behaviour in a realistic case; minor = polish.",
  CONTEXT, RULES,
  "## Implementer's report (claims to check, not facts)\n" + impl,
  l.task,
].join("\n\n"), { label: 'przegląd: ' + l.key, phase: 'Przegląd', model: 'opus', effort: 'high', schema: REVIEW_SCHEMA })))
const findings = reviews.filter(Boolean).flatMap((r) => r.findings || [])
log('Przegląd: ' + findings.length + ' uwag, w tym ' + findings.filter((f) => f.severity === 'blocker').length + ' blokujących')

phase('Poprawki')
const fixes = findings.length ? await agent([
  "You fix review findings in a module of a web app and its data script. Fix what is reported; do not redesign.",
  CONTEXT, RULES,
  "## Findings\n" + JSON.stringify(findings, null, 1),
  "For each finding: confirm it; fix it if real; say 'not real' with the reason if not. Blockers and majors first. If you change the classifier, re-run the data script. Run node --check and the test file after your changes. Report per finding: fixed / not real / left, one line each.",
].join("\n\n"), { label: 'poprawki modułu', phase: 'Poprawki', model: 'opus', effort: 'high' }) : null
if (!findings.length) log('Poprawki: brak uwag')

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    all_green: { type: 'boolean' },
    tests: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' },
    }, required: ['name', 'passed'] } },
    changed_files: { type: 'array', items: { type: 'string' } },
    data_rows: { type: 'number' },
    data_kb: { type: 'number' },
    pr_description: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['all_green', 'tests', 'pr_description', 'notes'],
}
phase('Kontrola')
const check = await agent([
  "You run the final check of a new module of a web app and prepare the pull request text. You are the only one working in the tree now.",
  CONTEXT, RULES,
  "## Fix report\n" + (fixes || '(no fixes were needed)'),
  "## Your task",
  "1. Run and record as tests: " + PY + " poznan-trend-detective/pipeline/sarnik_wuia.py (the output must be at most 400 KB); node --check on web/sarnik/wuia.js; node poznan-trend-detective/tests/sarnik/wuia.test.mjs; node docs/planwyd/kontrakt/selftest.mjs; and a run of the module's pure functions on the REAL data file for three points: Stary Rynek (52.4083, 16.9340), a point in the north of the city (52.4600, 16.9200) and Dopiewo (52.3584, 16.6764, outside the city).",
  "2. Run git status; list new and changed files; confirm that only the allowed files were created.",
  "3. Write the pull request description in Polish (return it in pr_description, do not create a file): what the row shows and when each level appears; how many decisions the data file holds and how they were filtered, with the error rates found in review; that the files are inert until the core is in main and 'wuia' is added to web/sarnik/manifest.js; the tests and results; what is unverified (above all: the row has not been seen inside the real card until the core is merged); and a note for the app's author that the map layer could later read this smaller file instead of the 2.6 MB GeoJSON.",
].join("\n\n"), { label: 'kontrola końcowa', phase: 'Kontrola', model: 'opus', effort: 'high', schema: CHECK_SCHEMA })

return {
  branch: 'sarnik-wuia',
  pr: 'moduł jest bezczynny bez rdzenia, więc PR można zmergować po przeglądzie w dowolnej chwili',
  modules: ['wuia'],
  all_green: check ? check.all_green : null,
  data: check ? { rows: check.data_rows, kb: check.data_kb } : null,
  changed_files: check ? check.changed_files : null,
  findings: findings.length,
  pr_description: check ? check.pr_description : null,
  notes: check ? check.notes : 'kontrola końcowa nie zwróciła wyniku',
}
