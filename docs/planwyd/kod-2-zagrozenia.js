export const meta = {
  name: 'sarnik-kod-2-zagrozenia',
  description: 'Urządzenie 2 (kod): moduły strefa powodziowa ISOK i osuwiska SOPO',
  phases: [
    { title: 'Sondy', detail: '2 agentów Sonnet sprawdza usługi', model: 'sonnet' },
    { title: 'Implementacja', detail: 'moduły flood i landslide z testami', model: 'opus' },
    { title: 'Przegląd', detail: '3 soczewki: kontrakt, teksty, usługi na żywo', model: 'opus' },
    { title: 'Poprawki', detail: 'poprawki z przeglądu', model: 'opus' },
    { title: 'Kontrola', detail: 'testy końcowe i opis PR', model: 'opus' },
  ],
}

// Uruchomienie: Workflow({scriptPath: "<repo>/docs/planwyd/kod-2-zagrozenia.js", args: {repo: "<pełna ścieżka do repo>"}})
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const WHERE = REPO
  ? "The repository root on this machine is " + REPO + " . Use absolute paths under it."
  : "First find the repository root: run git rev-parse --show-toplevel in your working directory. Use absolute paths under it."

const CONTEXT = [
  "## Context (established on 14 Nov 2026; trust it, do not re-derive)",
  "- Team SpaceWalkers, NASA Space Apps Challenge 2026, challenge 'Dancing with the SARs'. Submission closes Sunday 15 Nov 2026 at 23:59 (Poland).",
  "- The app: SARnik, in poznan-trend-detective/ (a Leaflet single page; a user searches an address or draws an area around Poznań and gets a place card with a 'technical inspection of the land': rows with a green, amber, red or grey dot). The card already has rows for PIG-PIB groundwater-flood areas, terrain hollows, radar change, moisture seen by radar and EGMS ground motion. It only LINKS to the official ISOK flood map and has nothing on landslides.",
  "- Five computers code in parallel. This one writes two MODULES as separate files: 'flood' (the ISOK flood-hazard zone at the selected point) and 'landslide' (registered landslides and areas at risk from the PIG-PIB SOPO register near the point). Another computer writes the core that loads modules. The interface between them is docs/planwyd/KONTRAKT.md: binding, read it first. docs/planwyd/kontrakt/example_module.js is the pattern to copy; docs/planwyd/kontrakt/fake_core.mjs and selftest.mjs show how to test a module in Node without the app.",
  "- You may create or edit ONLY: poznan-trend-detective/web/sarnik/flood.js, flood.css, landslide.js, landslide.css, and poznan-trend-detective/tests/sarnik/flood.test.mjs and landslide.test.mjs (plus fixtures under poznan-trend-detective/tests/sarnik/fixtures/). Never edit web/app.js, web/index.html, the i18n files, web/styles.css or web/sarnik/manifest.js. The module files are inert until the core lists them, so this pull request is safe to merge at any time.",
  "## Services checked today (confirm, do not rediscover)",
  "- ISOK flood hazard WMS: https://wody.isok.gov.pl/wss/INSPIRE/INSPIRE_NZ_HY_MZPMRP_WMS , layer NZ.Fluvial. GetFeatureInfo with INFO_FORMAT=text/plain returns about 2 KB with lines such as 'loo_qualitativelikelihood = scenariusz Q 10% (raz na 10 lat)', also 'Q 1% (raz na 100 lat)' and 'Q 0,2% (raz na 500 lat)'; outside any zone the body is 'no features were found'. The JSON format returns 2.9 MB and must not be used. CORS header Access-Control-Allow-Origin: * . About 2 seconds. Working example: ?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=NZ.Fluvial&QUERY_LAYERS=NZ.Fluvial&CRS=CRS:84&BBOX=16.9443,52.4017,16.9463,52.4027&WIDTH=101&HEIGHT=101&I=50&J=50&FEATURE_COUNT=10&INFO_FORMAT=text/plain (Most Rocha, inside all three scenarios). At Stary Rynek (52.4083, 16.9340) the answer is 'no features were found'. The metadata gives validityperiod_end = 2025-12-21.",
  "- SOPO landslides (PIG-PIB): REST https://cbdgmapa.pgi.gov.pl/arcgis/rest/services/geozagrozenia/sopo_obszary/MapServer (identify works, query does not; layers 0 to 7; CORS headers present, the server echoes the Origin); WMS at https://cbdgmapa.pgi.gov.pl/arcgis/services/geozagrozenia/sopo_obszary/MapServer/WMSServer . An earlier check found 22 landslides and 35 areas at risk in a 30 x 30 km box around Poznań, small scarps along the Warta valley, mapped in 2017.",
].join("\n")

const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Never run git commands that change state (add, commit, push, checkout, switch, stash, reset, clean, merge, rebase). Never deploy.",
  "- No new dependencies. Plain browser JavaScript; tests are plain Node scripts using docs/planwyd/kontrakt/fake_core.mjs.",
  "- Honesty of user-facing text: no data or a failed service is level 'info' and says so; it never reads as 'no hazard'. Each row names its source and the date or edition of the data. A flood zone from a model is not a prediction that a house will flood. Every string exists in Polish and English; Polish must read naturally.",
  "- Any text that comes from a service is escaped with ctx.esc before it goes into HTML.",
  "- Final message: a compact factual report (what you did, files written, how you verified, what is unverified). Never report a check you did not run.",
].join("\n")

const PROBES = [
  { key: 'isok', task: "## Task: ISOK flood zone lookup for a point\nUse curl with small requests. 1. Confirm the text/plain GetFeatureInfo request above with an Origin header (https://poznan-trend-detective.web.app); report status, CORS headers, time and size. 2. Find a robust request for any point: a bounding box of about plus or minus 60 m with WIDTH=HEIGHT=101 and I=J=50; test CRS=CRS:84 (lon,lat) and CRS=EPSG:4326 (lat,lon) and say which works. 3. Test: Most Rocha (52.4022, 16.9453), Stary Rynek (52.4083, 16.9340), a floodplain point south of the centre (52.3700, 16.9300), Dopiewo (52.3584, 16.6764), and try to find one point that lies only in the Q 0,2% scenario. Save the raw response bodies of three different cases (all scenarios, only the rarest if found, no features) into poznan-trend-detective/tests/sarnik/fixtures/ as isok_*.txt . 4. Give exact parsing rules (decimal comma, repeated blocks) and what an error body looks like. 5. Check whether the capabilities or metadata mention an edition newer than validity end 2025-12-21 and what attribution is required. Return the URL template with placeholders, the parsing rules, the table of points, the fixture file names, and caveats." },
  { key: 'sopo', task: "## Task: SOPO landslide lookup near a point\nUse curl with small requests. 1. From the REST service description list each layer id with its name and say which are landslides and which are areas at risk of mass movement. 2. Build a working identify request for a point given in WGS84 (geometry, geometryType=esriGeometryPoint, sr=4326, layers=all, tolerance, mapExtent, imageDisplay, returnGeometry=false, f=json) that finds features within roughly 300 m of the point; explain how tolerance, mapExtent and imageDisplay translate into metres. Send an Origin header and report the CORS headers. 3. Find at least two real places within 20 km of Poznań (52.41, 16.93) where the service returns a landslide or risk area (step over a grid along the Warta valley if needed) and one where it returns nothing; report coordinates, layer and attributes. Save the three raw JSON responses into poznan-trend-detective/tests/sarnik/fixtures/ as sopo_*.json . 4. Report which attributes are useful to show (name or number, activity, area, year of the inventory) and the attribution text. Return the URL template with placeholders, the meaning of the response fields, the example places, the fixture file names, and caveats." },
]

phase('Sondy')
const probeRes = await parallel(PROBES.map((p) => () => agent([
  "You probe a public web service for a hackathon web app. Report facts; quote short response snippets verbatim; mark anything you could not verify. You may write fixture files only where the task says.",
  CONTEXT, RULES, p.task,
].join("\n\n"), { label: 'sonda: ' + p.key, phase: 'Sondy', model: 'sonnet', effort: 'low' })))
const probeText = PROBES.map((p, i) => "### Probe " + p.key + "\n" + (probeRes[i] || '(the probe returned nothing: treat the service details above as the only facts and say so in your report)')).join("\n\n")
log('Sondy: ' + probeRes.filter(Boolean).length + '/2')

phase('Implementacja')
const impl = await agent([
  "You write two modules for a web app, against a fixed contract, so that they work the moment the core is merged.",
  CONTEXT, RULES,
  "## Probe results\n" + probeText,
  "## Your task",
  "Read docs/planwyd/KONTRAKT.md, docs/planwyd/kontrakt/example_module.js, fake_core.mjs and selftest.mjs. Then write:",
  "1. poznan-trend-detective/web/sarnik/flood.js : registers 'flood'. onSelect starts one lookup through ctx.fetchOnce for the selected point (for a drawn area: its centre, and the row says so). checks returns one row: pending while loading; level risk if the point lies in the Q 10% or Q 1% scenario (name the scenario and its return period); warn if only in Q 0,2%; ok if the service answered 'no features'; info with a link to the official map (https://wody.isok.gov.pl/imap_kzgw/?gpmap=gpMZP) on error or timeout. The row states the source (ISOK, Wody Polskie) and the edition date of the maps, and says the zone comes from a hydraulic model of river floods. Expose the parser as a pure function.",
  "2. poznan-trend-detective/web/sarnik/landslide.js : registers 'landslide'. onSelect starts one identify lookup around the point. checks returns one row: pending; risk if a registered landslide lies within about 100 m; warn if a landslide or an area at risk lies within about 300 m (give the distance band, the kind and, if available, its activity); ok if nothing within 300 m ('no registered landslides nearby; the register does not prove the slope is stable'); info on error or timeout or outside the register's coverage. Keep thresholds as named constants at the top. Expose the response interpreter as a pure function.",
  "3. Tests poznan-trend-detective/tests/sarnik/flood.test.mjs and landslide.test.mjs in the style of selftest.mjs, using the saved fixtures: pending, each result level, error, timeout, drawn area, both languages, and core.problems() returning an empty list. They must exit non-zero on failure. Run them with node and paste the output.",
  "4. CSS files only if a row needs styling beyond the app's own; otherwise do not create them.",
  "Run node --check on both modules. End your report with the exact request URLs your code builds for Most Rocha, so reviewers can replay them.",
].join("\n\n"), { label: 'moduły flood i landslide', phase: 'Implementacja', model: 'opus', effort: 'high' })
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
  { key: 'kontrakt', task: "## Your lens: contract and correctness\nRead both modules against docs/planwyd/KONTRAKT.md line by line: registration, no fetching inside checks, one lookup per selection, pending rows at level info, ids, escaping of service text, behaviour when sel.ext is missing, when the response is empty or malformed, and for a drawn area. Run both test files with node and report them as tests. Write three extra adversarial cases of your own in a temporary file (do not commit it): a response with unexpected casing or spacing, an HTML error page instead of the expected body, and a response that arrives after the user selected another place." },
  { key: 'teksty', task: "## Your lens: wording in Polish and English\nRead every string of both modules in both languages. Polish must read naturally to a home buyer (no calques, correct cases and plural forms); English must be correct; the two must say the same thing. Check honesty: a missing answer never reads as safety; the flood row says what a Q 1% zone is in plain words and that it is a model of river floods, not groundwater or rain; the landslide row says what the register is and its year; the edition date is shown. Propose exact replacement strings." },
  { key: 'uslugi', task: "## Your lens: the live services\nRebuild the exact URLs the code produces (read the code, do not trust the report) for five points: Most Rocha (52.4022, 16.9453), Stary Rynek (52.4083, 16.9340), Dopiewo (52.3584, 16.6764), the places with landslides found by the probe, and a point outside the study area (52.9, 17.9). Run each with curl and an Origin header (https://poznan-trend-detective.web.app). For each report status, CORS headers, time, size, and what the module's pure function returns for the real body (run it in node). Check that a browser could make the request (no forbidden headers, GET only, CORS allowed). Report each as a test." },
]
phase('Przegląd')
const reviews = await parallel(LENSES.map((l) => () => agent([
  "You review two new modules of a web app before they are merged. Do not change them; report findings with your own evidence. Severity: blocker = wrong or misleading result, or breaks the contract; major = wrong behaviour in a realistic case; minor = polish.",
  CONTEXT, RULES,
  "## Probe results\n" + probeText,
  "## Implementer's report (claims to check, not facts)\n" + impl,
  l.task,
].join("\n\n"), { label: 'przegląd: ' + l.key, phase: 'Przegląd', model: 'opus', effort: 'high', schema: REVIEW_SCHEMA })))
const findings = reviews.filter(Boolean).flatMap((r) => r.findings || [])
log('Przegląd: ' + findings.length + ' uwag, w tym ' + findings.filter((f) => f.severity === 'blocker').length + ' blokujących')

phase('Poprawki')
const fixes = findings.length ? await agent([
  "You fix review findings in two modules of a web app. Fix what is reported; do not redesign.",
  CONTEXT, RULES,
  "## Findings\n" + JSON.stringify(findings, null, 1),
  "For each finding: confirm it by reading the code; fix it if real; say 'not real' with the reason if not. Blockers and majors first. Run node --check and both test files after your changes. Report per finding: fixed / not real / left, one line each.",
].join("\n\n"), { label: 'poprawki modułów', phase: 'Poprawki', model: 'opus', effort: 'high' }) : null
if (!findings.length) log('Poprawki: brak uwag')

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    all_green: { type: 'boolean' },
    tests: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' },
    }, required: ['name', 'passed'] } },
    changed_files: { type: 'array', items: { type: 'string' } },
    pr_description: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['all_green', 'tests', 'pr_description', 'notes'],
}
phase('Kontrola')
const check = await agent([
  "You run the final check of two new modules of a web app and prepare the pull request text. You are the only one working in the tree now.",
  CONTEXT, RULES,
  "## Fix report\n" + (fixes || '(no fixes were needed)'),
  "## Your task",
  "1. Run and record as tests: node --check on both modules; node poznan-trend-detective/tests/sarnik/flood.test.mjs; node poznan-trend-detective/tests/sarnik/landslide.test.mjs; node docs/planwyd/kontrakt/selftest.mjs; one live request per service for Most Rocha with the module's own URL builder, parsed by the module's pure function.",
  "2. Run git status; list new and changed files; confirm that only the allowed files were created and that web/app.js, web/index.html, the i18n files, web/styles.css and web/sarnik/manifest.js are untouched.",
  "3. Write the pull request description in Polish (return it in pr_description, do not create a file): what the two modules show and when each level appears; that the files are inert until the core is in main and their names ('flood', 'landslide') are added to web/sarnik/manifest.js; the tests and results; the services used with their attribution; what is unverified (above all: the rows have not been seen inside the real card until the core is merged).",
].join("\n\n"), { label: 'kontrola końcowa', phase: 'Kontrola', model: 'opus', effort: 'high', schema: CHECK_SCHEMA })

return {
  branch: 'sarnik-zagrozenia',
  pr: 'moduły są bezczynne bez rdzenia, więc PR można zmergować po przeglądzie w dowolnej chwili',
  modules: ['flood', 'landslide'],
  all_green: check ? check.all_green : null,
  changed_files: check ? check.changed_files : null,
  findings: findings.length,
  pr_description: check ? check.pr_description : null,
  notes: check ? check.notes : 'kontrola końcowa nie zwróciła wyniku',
}
