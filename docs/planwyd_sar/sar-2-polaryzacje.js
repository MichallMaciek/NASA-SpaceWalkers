export const meta = {
  name: 'sarnik-sar-2-polaryzacje',
  description: 'Urządzenie 2: polaryzacje NISAR (GCOV tor 57, HH a HV) i wilgotność gleby SME2, dwa wiersze w karcie',
  phases: [
    { title: 'Przygotowanie', detail: 'dane, środowisko, mapa kodu', model: 'sonnet' },
    { title: 'Implementacja', detail: 'pipeline, warstwy, moduły, testy', model: 'opus' },
    { title: 'Przegląd', detail: '2 soczewki: kod i kontrakt, fizyka i uczciwość', model: 'opus' },
    { title: 'Poprawki', detail: 'poprawki z przeglądu', model: 'opus' },
    { title: 'Kontrola', detail: 'testy, limity, opis PR', model: 'opus' },
  ],
}

// Workflow({scriptPath: "<repo>/docs/planwyd_sar/sar-2-polaryzacje.js", args: {repo: "<repo>", sar: "<folder dane/sar>"}})
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const SAR = (typeof args === 'object' && args && args.sar) ? String(args.sar) : ''
const WHERE = REPO ? "The repository root is " + REPO + " . Use absolute paths under it." : "Find the repository root with git rev-parse --show-toplevel."
const DATA = SAR ? "The local SAR data folder is " + SAR + " ." : "The local SAR data folder is poznan-trend-detective/data/raw/sar (git-ignored); if it is missing, stop and report it."

const CONTEXT = [
  "## Context (trust it)",
  "- Team SpaceWalkers, NASA Space Apps 2026, challenge 'Dancing with the SARs'. Code freeze Sunday 15 Nov 16:00. The app SARnik lives in poznan-trend-detective/.",
  "- Read docs/planwyd_sar/PLAN.md first (binding: file ownership, data contract with output grid 956x898 EPSG:3857 120 m, 8-bit grey PNG with 0 = no data, meta.json with layers/decode/checks, size budgets, card-row rules). Read docs/planwyd/KONTRAKT.md and docs/planwyd/kontrakt/fake_core.mjs.",
  "- The challenge asks: 'Which polarizations highlight these changes?' and 'Hypothesize the physical drivers'. The audit (docs/przeglad-v2/ZGODNOSC_Z_WYZWANIEM.md, item 8) asks for exactly this: where HH rose together with HV it points to crops and vegetation (volume scattering), where only HH rose it points to soil moisture. NAUKA.md (N44) showed the app's 25.06→24.08 pair mixes rain and harvest: separate them with HV.",
  "- " + DATA,
].join("\n")
const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Change ONLY computer 2's files from PLAN.md: pipeline/sar_polaryzacje.py, pipeline/sar_sme2.py, web/data/sarnik/pol/, web/data/sarnik/sme2/, web/sarnik/nisar_polaryzacje.js, web/sarnik/nisar_wilgoc.js, tests/sarnik/nisar_polaryzacje.test.mjs, tests/sarnik/nisar_wilgoc.test.mjs, docs/przeglad-v2/NISAR_POLARYZACJE.md.",
  "- Never run git commands that change state. Never deploy. Use poznan-trend-detective/.venv (numpy, scipy, rasterio, pillow).",
  "- Never mix NISAR versions: use only track 57 PROVISIONAL files for the time comparison; the 4 VALIDATED passes are not part of it. Exclude HV from single-polarisation files (SHSH in the name).",
  "- Every user-facing string in Polish and English, natural Polish, no dB values in card text. Final message: compact factual report, no unrun checks reported.",
].join("\n")
const TASK = [
  "## The task of computer 2",
  "1. pipeline/sar_polaryzacje.py: nisar_gcov/*_gamma0_20m.tif of track 57 provisional (11 passes 18.06–16.10.2026; bands HHHH, HVHV in linear power; EPSG:32634). Reproject each pass to the app grid (from fetch_urban import TR, W, H) by averaging linear power.",
  "   Early = median of passes 18.06–12.07, late = median of passes 17.08–22.09 (state the exact dates used in meta.json). Products: pol_dhh and pol_dhv (late − early in dB, e.g. v/12.75 − 10), pol_hv_med (median HV dB over all dual-pol passes, a vegetation and forest indicator), pol_class (1 = stable, 2 = only HH brighter: moisture or soil, 3 = HH and HV change together: crops or vegetation, 4 = darker: harvest, mowing or drying; thresholds stated in meta.json).",
  "   Checks in meta.json: median dHH and dHV by land cover (built 2020 from web/data/land/built_2020.png, forest from forest2000_frac, open land), share of each class, and the comparison with the app's existing nisar_wetdry for the same cells. Write web/data/sarnik/pol/*.png + meta.json under 1.5 MB.",
  "2. pipeline/sar_sme2.py: nisar_sme2/*_soilmoisture_200m.tif (track 158, 10 dates, m³/m³, −9999 no data; EPSG:6933). Reproject to the app grid (average of valid values). Products: sme_mean (mean over dates), sme_last (11.10), sme_anom (last − mean). Mask cells without retrieval. meta.json with dates, decode, checks (coverage share in open land, built-up, forest). Under 1 MB.",
  "3. web/sarnik/nisar_polaryzacje.js (module 'nisar_polaryzacje', contract 1.1: ctx.loadGray(name, 'sarnik/pol')): one row, sar 'yes', title like 'Co pokazały polaryzacje NISAR (lato 2026)': the dominant class in the selection in plain words, e.g. 'Od czerwca do września echo HH i HV rosło razem na 40% terenu: tak reagują uprawy i roślinność. Samo HH, czyli wilgoć gleby, wzrosło na 12%.' Level info. Pending while loading, 'brak danych' without coverage. src: NISAR GCOV, track 57, provisional, dates.",
  "4. web/sarnik/nisar_wilgoc.js (module 'nisar_wilgoc'): one row for open land only, sar 'yes', title like 'Wilgotność gleby według NISAR': mean soil moisture of the selection in plain words (sucho, umiarkowanie, wilgotno, with the value in m³/m³ in brackets) and whether the last pass was drier or wetter than the season mean. For built-up selections without retrieval: info 'NISAR nie mierzy wilgotności na terenie zabudowanym'. Level info always (data not validated). src: NISAR SME2, track 158, provisional.",
  "5. Tests tests/sarnik/nisar_polaryzacje.test.mjs and tests/sarnik/nisar_wilgoc.test.mjs on fake_core.mjs with synthetic arrays: pending, data, no data, built-up case, both languages, no undefined/NaN. node docs/planwyd/kontrakt/selftest.mjs still passes.",
  "6. docs/przeglad-v2/NISAR_POLARYZACJE.md (Polish, short): physics of HH and HV in L-band (surface and double bounce versus volume scattering), the numbers, the answer to 'which polarizations highlight these changes' for Poznań, what we may claim, and a 3-sentence English text for the project page.",
].join("\n")
const CHECK_SCHEMA = { type: 'object', properties: { all_green: { type: 'boolean' }, tests: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' } }, required: ['name', 'passed'] } }, data_mb: { type: 'number' }, changed_files: { type: 'array', items: { type: 'string' } }, pr_description: { type: 'string' }, notes: { type: 'string' } }, required: ['all_green', 'tests', 'pr_description'] }
const REVIEW_SCHEMA = { type: 'object', properties: { summary: { type: 'string' }, findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, file: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'file', 'problem', 'evidence', 'fix'] } } }, required: ['summary', 'findings'] }

phase('Przygotowanie')
const prep = await agent([CONTEXT, RULES, TASK,
  "## Your job now: preparation only",
  "List nisar_gcov and nisar_sme2 files with dates, track, version (PROVISIONAL vs validated from the file name CRID/collection or dane/sar/manifest.json if present), polarisation (DHDH/SHSH), CRS and size. Prepare the venv. Read pipeline/fetch_urban.py, pipeline/build_sar.py (PNG writer, decode style, how nisar_wetdry was made), land.json keys (threshold, forest), KONTRAKT.md, fake_core.mjs, tests/sarnik/wuia.test.mjs. Return a short map for the implementer and any blocker.",
].join("\n\n"), { label: 'przygotowanie', phase: 'Przygotowanie', model: 'sonnet', effort: 'low' })

phase('Implementacja')
const impl = await agent([CONTEXT, RULES, TASK, "## Preparation notes\n" + prep,
  "## Your job now: implement steps 1–6, run both pipelines on the real data, run the tests, check sizes (pol under 1.5 MB, sme2 under 1 MB, every file under 3 MB), read your diff, report the numbers exactly as computed.",
].join("\n\n"), { label: 'implementacja', phase: 'Implementacja', model: 'opus', effort: 'high' })

phase('Przegląd')
const lenses = [
  "## Lens: code and contract. Modules against KONTRAKT.md 1.1 and PLAN.md (fields, pending, info only, escaping, no fetching in checks, both languages), PNG format and decode, version filter (track 57 provisional only, no SHSH HV), linear averaging, nodata, sizes, ownership. Run node --check and the tests.",
  "## Lens: physics and honesty. Check thresholds and class definitions against L-band scattering physics, recompute the class shares independently, check that the texts never claim more than the data show (classes are likely causes, not certainties; SME2 is provisional and has no values in towns), and that the English text answers the challenge question correctly.",
]
const reviews = await parallel(lenses.map((l) => () => agent([CONTEXT, RULES, TASK, "## Implementer's report (claims to check)\n" + impl, l,
  "Do not change files. Report findings with your own evidence."].join("\n\n"), { label: 'przegląd', phase: 'Przegląd', model: 'opus', effort: 'high', schema: REVIEW_SCHEMA })))
const findings = reviews.filter(Boolean).flatMap((r) => r.findings || [])
log('Przegląd: ' + findings.length + ' uwag')

phase('Poprawki')
const fixes = findings.length ? await agent([CONTEXT, RULES, TASK, "## Findings\n" + JSON.stringify(findings, null, 1),
  "Confirm each finding, fix the real ones, re-run pipelines if numbers change, one line per finding."].join("\n\n"),
  { label: 'poprawki', phase: 'Poprawki', model: 'opus', effort: 'high' }) : '(brak uwag)'

phase('Kontrola')
const check = await agent([CONTEXT, RULES, TASK, "## Fix report\n" + fixes,
  "## Final check: node --check on both modules, both module tests, docs/planwyd/kontrakt/selftest.mjs, python3 poznan-trend-detective/tests/data_contract.py (stays green), sizes, git status (only computer 2's files). PR description in Polish: what, why (challenge question on polarizations, audit item 8), numbers, how it switches on (computer 3 adds 'nisar_polaryzacje' and 'nisar_wilgoc' to manifest.js and the contract 1.1 loader), what is unverified."].join("\n\n"),
  { label: 'kontrola', phase: 'Kontrola', model: 'opus', effort: 'high', schema: CHECK_SCHEMA })

return { branch: 'sar-2-polaryzacje', all_green: check ? check.all_green : null, data_mb: check ? check.data_mb : null, findings: findings.length,
  changed_files: check ? check.changed_files : null, pr_description: check ? check.pr_description : null, notes: check ? check.notes : 'brak kontroli' }
