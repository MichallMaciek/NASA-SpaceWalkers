export const meta = {
  name: 'sarnik-sar-4-historia',
  description: 'Urządzenie 4: historia pasma L (ALOS 2007–2010 obok NISAR 2026), zaburzenia OPERA DIST, dwa wiersze w karcie, tekst o danych NASA',
  phases: [
    { title: 'Przygotowanie', detail: 'dane, środowisko, mapa kodu', model: 'sonnet' },
    { title: 'Implementacja', detail: 'pipeline, warstwy, moduły, testy, teksty', model: 'opus' },
    { title: 'Przegląd', detail: '2 soczewki: kod i kontrakt, kalibracja i uczciwość', model: 'opus' },
    { title: 'Poprawki', detail: 'poprawki z przeglądu', model: 'opus' },
    { title: 'Kontrola', detail: 'testy, limity, opis PR', model: 'opus' },
  ],
}

// Workflow({scriptPath: "<repo>/docs/planwyd_sar/sar-4-historia.js", args: {repo: "<repo>", sar: "<folder dane/sar>"}})
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const SAR = (typeof args === 'object' && args && args.sar) ? String(args.sar) : ''
const WHERE = REPO ? "The repository root is " + REPO + " . Use absolute paths under it." : "Find the repository root with git rev-parse --show-toplevel."
const DATA = SAR ? "The local SAR data folder is " + SAR + " ." : "The local SAR data folder is poznan-trend-detective/data/raw/sar (git-ignored); if it is missing, stop and report it."

const CONTEXT = [
  "## Context (trust it)",
  "- Team SpaceWalkers, NASA Space Apps 2026, challenge 'Dancing with the SARs'. Code freeze Sunday 15 Nov 16:00. The app SARnik lives in poznan-trend-detective/. It already shows ALOS-2 yearly mosaics 2015–2021 (gamma0, decode v/6 − 30 dB, web/data/land/alos_hh_<y>.png) and NISAR 2026 medians (nisar_hh_med, nisar_hv_med) on one L-band time line. Your data extend it back to 2007 with ALOS PALSAR-1, and add NASA's OPERA disturbance product.",
  "- Read docs/planwyd_sar/PLAN.md first (binding: ownership, data contract, budgets, card-row rules), docs/planwyd/KONTRAKT.md and docs/planwyd/kontrakt/fake_core.mjs. NAUKA.md warns: different sensors and calibrations; compare relatively and say so.",
  "- " + DATA,
].join("\n")
const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Change ONLY computer 4's files from PLAN.md: pipeline/sar_alos1.py, pipeline/sar_dist.py, web/data/sarnik/alos1/, web/data/sarnik/dist/, web/sarnik/historia_l.js, web/sarnik/opera_dist.js, tests/sarnik/historia_l.test.mjs, tests/sarnik/opera_dist.test.mjs, docs/przeglad-v2/NISAR_HISTORIA.md, docs/deep-pitch/NASA_DANE.md (new file).",
  "- Never run git commands that change state. Never deploy. Use poznan-trend-detective/.venv (numpy, scipy, rasterio, pillow). Unzip ALOS archives into a temporary folder outside the repository.",
  "- Every user-facing string in Polish and English, natural Polish, no dB values in card text. Final message: compact factual report.",
].join("\n")
const TASK = [
  "## The task of computer 4",
  "1. pipeline/sar_alos1.py: the 6 ALOS PALSAR L2.2 FBD zips in alos_palsar/ (2007-08-13, 2008-05-15, 2008-06-01, 2008-06-13, 2008-06-30, 2010-07-06; HH and HV GeoTIFF inside). Calibrate sigma0 dB = 10·log10(DN²) − 83 (state it; L2.2 is sigma0 on the ellipsoid, the ALOS-2 mosaics are gamma0 with terrain correction: note the difference). Reproject to the app grid (from fetch_urban import TR, W, H) averaging linear power. Products: alos1_hh_2007, alos1_hv_2007 (one scene), alos1_hh_2010, alos1_hv_2010, and l_bright_2007_2026 = cells that were dark in HH in 2007–2010 and are bright in NISAR 2026 (web/data/land/nisar_hh_med.png, decode v/6 − 30), after a relative calibration on stable targets (median offset over cells built in both 2005 and 2020 per GHSL built_2005/built_2020 and land.json threshold). Write web/data/sarnik/alos1/*.png + meta.json (dates, decode, the offset used, checks). Under 1.5 MB.",
  "   Check in meta.json: agreement of l_bright_2007_2026 with GHSL growth (cells built in 2020 but not in 2005): share of bright cells that are GHSL growth versus the share in the study area, with honest uncertainty.",
  "2. pipeline/sar_dist.py: opera_dist_alert/ (4 MGRS tiles, EPSG:32633, 30 m, status as of 28.02.2026). Reproject GEN-DIST-STATUS to the app grid with the most frequent value (categorical) and GEN-DIST-DATE (first detection) with the maximum or most frequent value. Decode the status codes exactly as in the OPERA DIST-S1 product specification (find and cite it; if unsure, keep raw codes and document that). web/data/sarnik/dist/*.png + meta.json, under 0.5 MB. Checks: share of cells disturbed by land cover (forest, open, built).",
  "3. web/sarnik/historia_l.js (module 'historia_l', contract 1.1: ctx.loadGray(name, 'sarnik/alos1')): one row, sar 'yes', title like 'Radar w paśmie L: 2007 i 2026': share of the selection that became radar-bright between ALOS (2007–2010) and NISAR (2026), in plain words ('tak wygląda nowa zabudowa'), with the caveat of two different satellites. Level info. src: JAXA ALOS PALSAR 2007–2010 and NASA-ISRO NISAR 2026.",
  "4. web/sarnik/opera_dist.js (module 'opera_dist'): one row, sar 'part' (Sentinel-1 radar processed by NASA JPL), title like 'Zaburzenia według NASA OPERA (do 28.02.2026)': whether OPERA flagged disturbance in the selection and when it was first detected. Level info. 'brak danych' outside the tiles.",
  "5. Tests tests/sarnik/historia_l.test.mjs and tests/sarnik/opera_dist.test.mjs on fake_core.mjs with synthetic arrays: pending, data, no data, both languages, no undefined/NaN. node docs/planwyd/kontrakt/selftest.mjs passes.",
  "6. docs/przeglad-v2/NISAR_HISTORIA.md (Polish, short: method, calibration, numbers, what we may claim) and docs/deep-pitch/NASA_DANE.md: an English, submission-ready list of every NASA dataset the project uses (NISAR GCOV, GUNW, SME2 from ASF DAAC; OPERA DIST-ALERT-S1; NASA POWER; MODIS; Landsat via GHSL/GFC; NASA GIBS) with what it is used for, plus the partner data (ALOS, Sentinel-1, EGMS, GHSL) and citations. Do not edit other docs.",
].join("\n")
const CHECK_SCHEMA = { type: 'object', properties: { all_green: { type: 'boolean' }, tests: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' } }, required: ['name', 'passed'] } }, data_mb: { type: 'number' }, changed_files: { type: 'array', items: { type: 'string' } }, pr_description: { type: 'string' }, notes: { type: 'string' } }, required: ['all_green', 'tests', 'pr_description'] }
const REVIEW_SCHEMA = { type: 'object', properties: { summary: { type: 'string' }, findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, file: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'file', 'problem', 'evidence', 'fix'] } } }, required: ['summary', 'findings'] }

phase('Przygotowanie')
const prep = await agent([CONTEXT, RULES, TASK,
  "## Your job now: preparation only",
  "List alos_palsar zips (unzip -l: which files hold HH and HV, their CRS and pixel size) and opera_dist_alert files (tile, layer, CRS). Prepare the venv. Read pipeline/fetch_urban.py, pipeline/fetch_sar.py (ALOS-2 calibration), pipeline/build_sar.py (PNG writer, decode), land.json keys, KONTRAKT.md, fake_core.mjs, tests/sarnik/wuia.test.mjs. Find the OPERA DIST-S1 product specification for status codes (search the web if needed; quote the code table). Return a short map and any blocker.",
].join("\n\n"), { label: 'przygotowanie', phase: 'Przygotowanie', model: 'sonnet', effort: 'low' })

phase('Implementacja')
const impl = await agent([CONTEXT, RULES, TASK, "## Preparation notes\n" + prep,
  "## Your job now: implement steps 1–6, run both pipelines on the real data, run the tests, check sizes (alos1 under 1.5 MB, dist under 0.5 MB, every file under 3 MB), read your diff, report the numbers exactly as computed.",
].join("\n\n"), { label: 'implementacja', phase: 'Implementacja', model: 'opus', effort: 'high' })

phase('Przegląd')
const lenses = [
  "## Lens: code and contract. Modules against KONTRAKT.md 1.1 and PLAN.md (fields, pending, info only, escaping, no fetching in checks, both languages), PNG format, decode in meta.json, categorical versus averaged resampling, nodata, sizes, ownership. Run node --check and the tests.",
  "## Lens: calibration and honesty. Check the ALOS sigma0 formula and the relative calibration to NISAR, recompute the GHSL agreement independently, check the OPERA status decoding against the specification, and that texts and NASA_DANE.md never overclaim (two satellites, 16-year gap; OPERA only until 28.02.2026).",
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
  "## Final check: node --check on both modules, both module tests, docs/planwyd/kontrakt/selftest.mjs, python3 poznan-trend-detective/tests/data_contract.py (stays green), sizes, git status (only computer 4's files). PR description in Polish: what, why, numbers with uncertainty, how it switches on (computer 3 adds 'historia_l' and 'opera_dist' to manifest.js and shows alos1/dist layers from meta.json), what is unverified."].join("\n\n"),
  { label: 'kontrola', phase: 'Kontrola', model: 'opus', effort: 'high', schema: CHECK_SCHEMA })

return { branch: 'sar-4-historia', all_green: check ? check.all_green : null, data_mb: check ? check.data_mb : null, findings: findings.length,
  changed_files: check ? check.changed_files : null, pr_description: check ? check.pr_description : null, notes: check ? check.notes : 'brak kontroli' }
