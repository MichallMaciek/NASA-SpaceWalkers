export const meta = {
  name: 'sarnik-sar-1-gunw',
  description: 'Urządzenie 1: zmiany według NISAR (koherencja GUNW), test na decyzjach WUIA, wiersz w karcie',
  phases: [
    { title: 'Przygotowanie', detail: 'dane, środowisko, mapa kodu', model: 'sonnet' },
    { title: 'Implementacja', detail: 'pipeline, warstwy, test, moduł', model: 'opus' },
    { title: 'Przegląd', detail: '2 soczewki: kod i kontrakt, nauka i uczciwość', model: 'opus' },
    { title: 'Poprawki', detail: 'poprawki z przeglądu', model: 'opus' },
    { title: 'Kontrola', detail: 'testy, limity, opis PR', model: 'opus' },
  ],
}

// Workflow({scriptPath: "<repo>/docs/planwyd_sar/sar-1-gunw.js", args: {repo: "<repo>", sar: "<folder dane/sar>"}})
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const SAR = (typeof args === 'object' && args && args.sar) ? String(args.sar) : ''
const WHERE = REPO ? "The repository root is " + REPO + " . Use absolute paths under it." : "Find the repository root with git rev-parse --show-toplevel."
const DATA = SAR ? "The local SAR data folder is " + SAR + " ." : "The local SAR data folder is poznan-trend-detective/data/raw/sar (git-ignored); if it is missing, stop and report it."

const CONTEXT = [
  "## Context (trust it)",
  "- Team SpaceWalkers, NASA Space Apps 2026, challenge 'Dancing with the SARs'. Code freeze Sunday 15 Nov 16:00, submission 23:59. The app SARnik lives in poznan-trend-detective/ (Leaflet page web/, Python pipeline pipeline/).",
  "- Read docs/planwyd_sar/PLAN.md first: it is the binding plan for four computers, with file ownership, the data contract (input folders, output grid 956x898 EPSG:3857 120 m, 8-bit grey PNG with 0 = no data, meta.json with layers/decode/checks, size budgets) and the card-row rules. Also read docs/planwyd/KONTRAKT.md (place-card modules) and docs/planwyd/kontrakt/fake_core.mjs.",
  "- A team audit (docs/przeglad-v2/ZGODNOSC_Z_WYZWANIEM.md) found NISAR gives 0 of 7 rows in the place card and is only an illustration. The science review (docs/przeglad-v2/NAUKA.md) warns: neighbouring cells are not independent (use thinning or block bootstrap), never average radar in dB, say plainly when a test fails.",
  "- " + DATA,
].join("\n")
const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Change ONLY the files PLAN.md assigns to computer 1: pipeline/sar_gunw.py, web/data/sarnik/gunw/, web/sarnik/nisar_zmiany.js, tests/sarnik/nisar_zmiany.test.mjs, docs/przeglad-v2/NISAR_GUNW.md (paths under poznan-trend-detective/ except docs/). Never touch web/app.js, i18n files, manifest.js, land.json, sar.json or other teams' files.",
  "- Never run git commands that change state (add, commit, push, checkout, switch, stash, reset, merge, rebase). Never deploy.",
  "- Use poznan-trend-detective/.venv (create it with python3 -m venv if missing; install numpy, scipy, rasterio, pillow). No new runtime dependency for the web page.",
  "- Every user-facing string in Polish and English; Polish must read naturally. No dB values in card text.",
  "- Final message: a compact factual report. Never report a check you did not run.",
].join("\n")
const TASK = [
  "## The task of computer 1",
  "1. pipeline/sar_gunw.py: read the 8 files nisar_gunw/*_coherence_20m.tif (track 158, pairs 12 days apart, 25.06–29.09.2026). Reproject each to the app grid (from fetch_urban import TR, W, H) by averaging. Products on the app grid:",
  "   coh_med (median coherence over pairs), coh_min (minimum), coh_drop (coh_med − coh_min, the size of the biggest drop), coh_drop_pair (index 1..8 of the pair with the biggest drop, 0 = none or no data), coh_low_n (number of pairs with coherence < 0.3).",
  "   Write them to web/data/sarnik/gunw/*.png (8-bit grey, 0 = no data; choose scale/offset so 1..255 covers the range) and meta.json with source, version 'provisional', track 158, the 8 pair dates, layers (name, file, decode {scale, offset, unit}, ramp, legend_pl, legend_en) and checks. Total under 2 MB.",
  "2. Checks in meta.json (computed in the same script):",
  "   a) WUIA: cells of plots with a 'nowa budowa' decision dated June–August 2026 (poznan-trend-detective/web/data/wuia_decyzje.geojson; category field as used by web/sarnik/wuia.js) versus Poznań cells without any decision: share of cells with coh_drop >= 0.3 in both groups, ratio, and an honest uncertainty (block bootstrap over decisions/plots or thinning, as NAUKA.md recommends). Report passed = true only if the lower bound of the ratio's interval is above 1.",
  "   b) Agreement with Sentinel-1: share of cells with coh_drop >= 0.3 that also have sar_change >= 3 dB (decode from web/data/land/sar.json 'decode').",
  "   c) Built-up stability: median coh_med inside cells built in 2020 (web/data/land/built_2020.png with land.json threshold) versus open land. This explains the physics: buildings keep coherence, fields lose it.",
  "3. web/sarnik/nisar_zmiany.js (module 'nisar_zmiany', contract 1.1): onSelect loads ctx.loadGray('coh_drop','sarnik/gunw') and 'coh_drop_pair' and ctx.loadJSON('sarnik/gunw/meta.json'). checks returns one row in group sar 'yes', titled like 'Zmiany według NISAR (lato 2026)': share of the selection with a clear coherence drop and the most common pair dates, in plain words (e.g. 'na 6% terenu radar NISAR zauważył wyraźną zmianę powierzchni, najczęściej między 12.08 a 24.08: tak wyglądają prace ziemne, budowy i orka'). Level info; warn only if meta checks.wuia.passed === true and the share is high. Pending row while loading; 'brak danych' when there is no coverage. src names NISAR GUNW, track 158, provisional, dates.",
  "4. tests/sarnik/nisar_zmiany.test.mjs on fake_core.mjs (no network, synthetic arrays for L8 and the meta JSON): pending, ok with data, no data, both languages, no undefined/NaN, warn only when passed. node docs/planwyd/kontrakt/selftest.mjs must still pass.",
  "5. docs/przeglad-v2/NISAR_GUNW.md (Polish, short): what coherence is, method, the three checks with numbers, what we may and may not claim, and a two-sentence English summary for the project page.",
].join("\n")
const CHECK_SCHEMA = { type: 'object', properties: { all_green: { type: 'boolean' }, tests: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' } }, required: ['name', 'passed'] } }, data_mb: { type: 'number' }, changed_files: { type: 'array', items: { type: 'string' } }, pr_description: { type: 'string' }, notes: { type: 'string' } }, required: ['all_green', 'tests', 'pr_description'] }
const REVIEW_SCHEMA = { type: 'object', properties: { summary: { type: 'string' }, findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, file: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'file', 'problem', 'evidence', 'fix'] } } }, required: ['summary', 'findings'] }

phase('Przygotowanie')
const prep = await agent([CONTEXT, RULES, TASK,
  "## Your job now: preparation only (no implementation)",
  "Check the data folder: list nisar_gunw/*_coherence_20m.tif with sizes and CRS (rasterio), and confirm 8 files. Prepare the venv. Read pipeline/fetch_urban.py (grid), pipeline/build_sar.py (PNG writer, decode style, how the Sentinel-1 WUIA check is computed), web/sarnik/wuia.js (decision categories), web/data/sar.json decode keys, KONTRAKT.md, fake_core.mjs and an existing module test (tests/sarnik/wuia.test.mjs). Return a short map with exact function names and field names the implementer needs, and anything that blocks the task.",
].join("\n\n"), { label: 'przygotowanie', phase: 'Przygotowanie', model: 'sonnet', effort: 'low' })

phase('Implementacja')
const impl = await agent([CONTEXT, RULES, TASK, "## Preparation notes\n" + prep,
  "## Your job now: implement steps 1–5, run the pipeline on the real data, run the tests (node tests and selftest), check sizes (web/data/sarnik/gunw under 2 MB, every file under 3 MB), read your diff. Report numbers of the three checks exactly as computed.",
].join("\n\n"), { label: 'implementacja', phase: 'Implementacja', model: 'opus', effort: 'high' })

phase('Przegląd')
const lenses = [
  "## Lens: code and contract. Check the module against KONTRAKT.md 1.1 and PLAN.md (row fields, pending, info by default, escaping, no fetching in checks, both languages), the PNG format (8-bit L, 956x898, 0 = no data, decode in meta.json), file ownership and size budget, that the pipeline averages linear values and handles nodata, and that the test runs without network. Run node --check and the tests.",
  "## Lens: science and honesty. Recompute the WUIA check independently in a small script; check the treatment of spatial dependence, the definition of 'nowa budowa', the date window, and whether 'passed' is justified. Check that every sentence in the module, meta.json and NISAR_GUNW.md matches the numbers and does not overclaim (coherence drop = change of the surface, not proof of a building).",
]
const reviews = await parallel(lenses.map((l) => () => agent([CONTEXT, RULES, TASK, "## Implementer's report (claims to check)\n" + impl, l,
  "Do not change files. Report findings with your own evidence."].join("\n\n"), { label: 'przegląd', phase: 'Przegląd', model: 'opus', effort: 'high', schema: REVIEW_SCHEMA })))
const findings = reviews.filter(Boolean).flatMap((r) => r.findings || [])
log('Przegląd: ' + findings.length + ' uwag')

phase('Poprawki')
const fixes = findings.length ? await agent([CONTEXT, RULES, TASK, "## Findings\n" + JSON.stringify(findings, null, 1),
  "Confirm each finding, fix the real ones (blockers and majors first), re-run the pipeline if numbers change, report one line per finding."].join("\n\n"),
  { label: 'poprawki', phase: 'Poprawki', model: 'opus', effort: 'high' }) : '(brak uwag)'

phase('Kontrola')
const check = await agent([CONTEXT, RULES, TASK, "## Fix report\n" + fixes,
  "## Final check: run node --check on the module, node tests/sarnik/nisar_zmiany.test.mjs, node docs/planwyd/kontrakt/selftest.mjs, python3 poznan-trend-detective/tests/data_contract.py (must stay green), and verify sizes. List changed files with git status and confirm nothing outside computer 1's files changed. Write the PR description in Polish (what, why, numbers of the checks with uncertainty, how it switches on: computer 3 adds 'nisar_zmiany' to manifest.js and the contract 1.1 loader; what is unverified)."].join("\n\n"),
  { label: 'kontrola', phase: 'Kontrola', model: 'opus', effort: 'high', schema: CHECK_SCHEMA })

return { branch: 'sar-1-gunw', all_green: check ? check.all_green : null, data_mb: check ? check.data_mb : null, findings: findings.length,
  changed_files: check ? check.changed_files : null, pr_description: check ? check.pr_description : null, notes: check ? check.notes : 'brak kontroli' }
