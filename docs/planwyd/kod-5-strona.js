export const meta = {
  name: 'sarnik-kod-5-strona',
  description: 'Urządzenie 5 (kod): strona „O projekcie” z liczbami na żywo, po przeglądzie nauki i liczb',
  phases: [
    { title: 'Przygotowanie', detail: 'środowisko i spis twierdzeń', model: 'sonnet' },
    { title: 'Szukanie', detail: '5 soczewek: fizyka, pipeline, przeliczenie, statystyka, dane', model: 'opus' },
    { title: 'Weryfikacja', detail: '3 agentów podważa każdą uwagę', model: 'opus' },
    { title: 'Strona', detail: 'strona O projekcie: budowa, przegląd, poprawki', model: 'opus' },
    { title: 'Raport', detail: 'docs/przeglad-v2/NAUKA.md', model: 'opus' },
  ],
}

// Uruchomienie: Workflow({scriptPath: "<repo>/docs/planwyd/kod-5-strona.js", args: {repo: "<pełna ścieżka do repo>"}})
// Opcjonalnie args.python = ścieżka do Pythona z pakietami numpy, pillow i scipy.
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const PYARG = (typeof args === 'object' && args && args.python) ? String(args.python) : ''
const WHERE = REPO
  ? "The repository root on this machine is " + REPO + " . Use absolute paths under it."
  : "First find the repository root: run git rev-parse --show-toplevel in your working directory. Use absolute paths under it."

const CONTEXT = [
  "## Context (established on 14 Nov 2026; trust it, do not re-derive)",
  "- Team SpaceWalkers, NASA Space Apps Challenge 2026, challenge 'Dancing with the SARs': an interactive app that uses NISAR radar data to track and visualise surface change, with an explanation of which polarisations show the change and the physical drivers. Judges score Impact, Creativity, Validity, Relevance (is NASA data integral?) and Presentation from 1 to 5. Radar scientists may be on the jury. Submission closes Sunday 15 Nov 2026 at 23:59 (Poland).",
  "- The app: SARnik, in poznan-trend-detective/. A user searches an address or draws an area around Poznań and gets a 'technical inspection of the land'. Version 2 (on main since 14 Nov 18:30) is described in poznan-trend-detective/README.md: read its sections 'Why radar', 'What the app computes', 'Checks' and 'Limits we state openly'.",
  "- Radar pipeline: poznan-trend-detective/pipeline/fetch_sar.py (Sentinel-1 RTC passes of 2026, EGMS, ALOS-2 mosaics), fetch_nisar.py (NISAR GCOV windows read from HDF5), build_sar.py (layers and validation checks). Outputs: web/data/land/*.png (grey-level layers on a 956 x 898 grid; 120 m cells in EPSG:3857, about 73 m on the ground) and web/data/land/sar.json (metadata, the 'decode' rule of each layer, and 'checks' with the validation numbers). Older layers and the growth model: pipeline/fetch_urban.py, model_urban.py, web/data/land/land.json.",
  "- User-facing science text: web/i18n_sar.js (Polish and English) and the README. The interface on main (since 14 Nov 19:27, when branch v3 was merged) speaks plain language first and keeps technical detail in an expert mode; review its plain strings (the 'plain' objects in web/i18n_sar.js) too. The About page should follow the same order: plain first, detail below.",
  "- Building decisions used as ground truth: progres/p1/dane/wuia_decyzje.geojson (2420 records Jun-Nov 2026, city of Poznań only; fields kategoria and status are noisy) and its copy in poznan-trend-detective/web/data/.",
  "- NISAR over Poznań: mode 20+5 MHz, HH + HV, GCOV pixel 20 m (gamma-0 power). Provisional product version covers 17 Jun to 23 Oct 2026; the validated version starts 21 Oct 2026; the two must not be mixed in one analysis. Same-track pair on track 158: 25 Jun 2026 (dry) and 24 Aug 2026 (wet). progres/p1/dane/nisar_poznan_przeloty.csv lists every product with rain and soil moisture on the pass day.",
  "- Honest limits the team already wrote down: docs/pitch.md section 6 and the 'Ograniczenia' parts of docs/pomysly-sar/*.md.",
  "- Another computer reviews the app's code and browser behaviour (docs/przeglad-v2/APLIKACJA.md). Stay with the science, the pipeline and the numbers.",
].join("\n")

const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Read anything in the repository. Unless your task says otherwise, create or edit files ONLY under docs/przeglad-v2/ (the file NAUKA.md) and poznan-trend-detective/tests/nauka/ . Never change the pipeline, the existing app files or the data.",
  "- Never run git commands that change state (add, commit, push, checkout, switch, stash, reset, clean, merge, rebase). Never deploy anything. Do not download satellite data; work with what is in the repository.",
  "- Report only what you can show. Each finding needs the file and place, the problem, the evidence (the code line, a computation you ran with its output, or a cited source) and a concrete fix or a safer wording.",
  "- Severity: blocker = a statement or number a radar scientist on the jury would call wrong; major = misleading without its caveat; minor = imprecise.",
  "- Be fair: when something is done correctly, do not invent a problem.",
].join("\n")

const PREP_SCHEMA = {
  type: 'object',
  properties: {
    python: { type: 'string' },
    packages_ok: { type: 'boolean' },
    claims_map: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['python', 'packages_ok', 'claims_map'],
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
    numbers: { type: 'array', items: { type: 'object', properties: {
      number: { type: 'string' }, source: { type: 'string' },
      verdict: { type: 'string', enum: ['cytować', 'cytować z zastrzeżeniem', 'nie cytować'] },
      wording: { type: 'string' },
    }, required: ['number', 'verdict'] } },
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

phase('Przygotowanie')
const prep = await agent([
  "You prepare a Python environment and a list of claims for a science review team. Be quick and factual.",
  CONTEXT, RULES,
  "## Task 1: environment",
  PYARG
    ? "A Python interpreter was given: " + PYARG + " . Check that it can import numpy, PIL and scipy; install what is missing with pip."
    : "Create (if it does not exist) a virtual environment at poznan-trend-detective/.venv with python3 -m venv (this directory is git-ignored) and install numpy, pillow and scipy into it.",
  "Report the absolute path of the interpreter and whether the three packages import.",
  "## Task 2: list of claims",
  "Read poznan-trend-detective/README.md, web/i18n_sar.js (both languages) and web/data/land/sar.json. List every scientific or quantitative statement shown to users or judges (at most 60 items): the exact text (English, plus the Polish key), where it appears, and which code computes it (function and line in pipeline/build_sar.py, fetch_sar.py or fetch_nisar.py, or the key in sar.json). Include every threshold used by the place card's checklist in web/app.js for the radar rows (search for the checklist items that read radar layers). Do not judge the claims.",
].join("\n\n"), { label: 'środowisko i spis twierdzeń', phase: 'Przygotowanie', model: 'sonnet', effort: 'low', schema: PREP_SCHEMA })
if (!prep) throw new Error('Przygotowanie nie zwróciło wyniku')
const PY = prep.python
const ENV = [
  "## Environment",
  "- Python with numpy, pillow and scipy: " + PY + (prep.packages_ok ? "" : " (WARNING: packages did not import in preparation: " + (prep.notes || 'no details') + ")"),
  "## Claims shown to users and judges\n" + prep.claims_map,
].join("\n")
log('Przygotowanie: python ' + PY + ', pakiety ' + (prep.packages_ok ? 'działają' : 'NIE działają'))

const LENSES = [
  { key: 'fizyka', task: "## Your lens: radar physics and honest wording\nYou are a SAR scientist. Check every statement about what radar sees (README 'Why radar' and 'What the app computes', all science strings in web/i18n_sar.js in both languages, the content of 'How radar sees the ground'): scattering mechanisms, what each polarisation shows, L-band versus C-band penetration, soil moisture and the dielectric constant, water, double bounce and street orientation, what EGMS measures (line of sight versus vertical, period, pixel), what an ALOS-2 yearly mosaic is, what five months of NISAR can and cannot support. Flag statements that are wrong, too strong, or true only with a condition the text omits (vegetation season, incidence angle, speckle, open land only, 120 m averaging of 20 m pixels). For each, give a corrected sentence in English and in Polish. Also say where the Polish and English versions make different claims." },
  { key: 'pipeline', task: "## Your lens: correctness of the radar pipeline\nRead pipeline/fetch_sar.py, fetch_nisar.py and build_sar.py line by line, and the parts of fetch_urban.py and common.py they use. Check: averaging in linear power before converting to dB; handling of no-data and of scene edges; resampling onto the app grid; that only one orbit and one direction are compared; that NISAR product versions are not mixed and which dates are actually used; calibration of ALOS-2 mosaics (digital numbers to dB) and of NISAR gamma-0; the units and sign of EGMS values and how they are encoded; the open-land mask; how 'change since June' handles crops and harvest; how the wet-minus-dry layer treats vegetation growth between 25 Jun and 24 Aug; whether each 'decode' rule in sar.json matches how the PNG was written (decode a few cells of several layers with Python and compare with expected physical ranges); off-by-one and axis-order errors. docs/poprawa_mapy.md point 9 lists pipeline fixes the team plans (average radar in linear power, reduce categories by the most frequent value, keep no-data apart from zero, use only the provisional NISAR version of track 158 without duplicates): for each, say with evidence whether the current code already does it. Report bugs with the line, the consequence for what the user sees, and the fix." },
  { key: 'przeliczenie', task: "## Your lens: recompute the validation numbers independently\nDo not read how build_sar.py computes the 'checks' until you have your own numbers. From the files in the repository only (web/data/land/*.png decoded with the rules in sar.json, land.json for the grid, the growth-model layers, the building-decision polygons, the groundwater-flood polygons in web/data/podtopienia.geojson) recompute each check described in sar.json 'checks' from its 'what' text: write poznan-trend-detective/tests/nauka/recompute_checks.py and run it with the interpreter above. Report, for every check, their number, your number, and whether they agree within rounding. Then read build_sar.py and explain every disagreement (different mask, different date filter, different threshold). Note anything the 'what' text does not say but the code does (selection of decisions by date or category, exclusion of cells), because the pitch will quote these texts." },
  { key: 'statystyka', task: "## Your lens: do the statistics support the claims\nFor every number in sar.json 'checks' and every quantitative claim in the README: judge what it can support. Look at: sample sizes and tiny hit counts (compute confidence intervals for the shares and for their ratio, for example with a Fisher exact test or a bootstrap, using the counts in the file; recompute counts from the layers if the file lacks them); p values printed as 0.0; base rates; whether cells are independent (neighbouring 120 m cells are not, so naive p values are too small; estimate the effect by block resampling or by thinning cells); the per-cell Spearman test for 'ground soaks up water' (how many passes, the critical r, and what share of cells would pass at p < 0.05 by chance alone compared with the share found); whether 'inside versus outside the flood areas' differs meaningfully; confounding by land cover and season. For each number return a verdict: cytować (safe to put on a slide as written), cytować z zastrzeżeniem (give the exact wording with its caveat, in English and Polish), or nie cytować (say why). Run the computations with the interpreter above and show the outputs." },
  { key: 'dane', task: "## Your lens: data provenance, versions and the NASA-data question\n1. For each data source named in the README's 'Data sources and licences' check that the pipeline really uses it as described, which product and version, which dates, and whether the README, sar.json and the app's About text agree with each other and with the code. Check in particular: which NISAR passes are used and that they are all of the provisional version; that the NISAR layer shown from NASA GIBS and the list of pass dates in land.json do not silently mix provisional and validated dates without saying so; where the soil wetness comes from.\n2. The judges score whether NASA data is integral. Make a table: each result the app shows, the data behind it, and whether that data is NASA's (NISAR, NASA POWER, MODIS, Landsat-derived products, NASA GIBS) or a partner's (Copernicus Sentinel-1 and EGMS, JAXA ALOS-2, national sources). Say plainly how much of the radar story rests on Sentinel-1 rather than NISAR, and suggest honest wording that makes NISAR's role clear without overstating it.\n3. Check that every source has the attribution its licence asks for somewhere in the app or README, and list what is missing." },
]
phase('Szukanie')
const reviews = await parallel(LENSES.map((l) => () => agent([
  "You review the science behind a radar web app before a hackathon jury that may include radar scientists sees it. Do not change the pipeline or the app; report findings.",
  CONTEXT, RULES, ENV, l.task,
].join("\n\n"), { label: 'szukanie: ' + l.key, phase: 'Szukanie', model: 'opus', effort: 'high', schema: REVIEW_SCHEMA })))
let n = 0
const all = reviews.flatMap((r, i) => (r && r.findings ? r.findings : []).map((f) => Object.assign({ id: 'N' + (++n), lens: LENSES[i].key }, f)))
const numbers = reviews.flatMap((r, i) => (r && r.numbers ? r.numbers : []).map((x) => Object.assign({ lens: LENSES[i].key }, x)))
const summaries = LENSES.map((l, i) => "### " + l.key + "\n" + (reviews[i] ? reviews[i].summary : '(this lens returned nothing)')).join("\n\n")
log('Szukanie: ' + all.length + ' uwag i ' + numbers.length + ' ocen liczb od ' + reviews.filter(Boolean).length + '/5 soczewek')

phase('Weryfikacja')
const chunk = (arr, k) => { const out = []; for (let i = 0; i < k; i++) out.push([]); arr.forEach((x, i) => out[i % k].push(x)); return out.filter((c) => c.length) }
const verif = all.length ? await parallel(chunk(all, 3).map((batch, i) => () => agent([
  "You verify findings from a science review of a radar web app. For each finding, try to REFUTE it: read the code at the named place, rerun the computation with the interpreter above, or check the physics against a standard source. A finding is real only if you can show evidence yourself. Reviewers sometimes misread code or apply a rule that does not hold for this sensor or product; catch that. If you cannot decide, mark it not real and say what is missing.",
  CONTEXT, RULES, ENV,
  "## Findings to verify\n" + JSON.stringify(batch, null, 1),
  "For each id return: real (true or false), your own evidence, the severity you would give it, and the fix or wording if you would change the proposed one.",
].join("\n\n"), { label: 'weryfikacja ' + (i + 1), phase: 'Weryfikacja', model: 'opus', effort: 'high', schema: VERIFY_SCHEMA }))) : []
const vmap = {}
verif.filter(Boolean).forEach((v) => (v.verdicts || []).forEach((x) => { vmap[x.id] = x }))
const confirmed = all.filter((f) => vmap[f.id] && vmap[f.id].real).map((f) => Object.assign({}, f, {
  severity: vmap[f.id].severity || f.severity, verified_evidence: vmap[f.id].evidence, fix: vmap[f.id].fix || f.fix }))
const rejected = all.filter((f) => vmap[f.id] && !vmap[f.id].real).map((f) => ({ id: f.id, problem: f.problem, why_rejected: vmap[f.id].evidence }))
const unverified = all.filter((f) => !vmap[f.id])
log('Weryfikacja: potwierdzone ' + confirmed.length + ', odrzucone ' + rejected.length + ', niesprawdzone ' + unverified.length)

phase('Strona')
const safeNumbers = numbers.filter((x) => x.verdict !== 'nie cytować')
const page = await agent([
  "You build one new, self-contained page for a web app: 'O projekcie' / 'About the project'. Judges of a hackathon will read it to understand the science, the evidence and the limits. It ships with the app as static files and reads its numbers live from the app's data, so it can never disagree with the app.",
  CONTEXT, RULES, ENV,
  "## What may be said (confirmed review findings: follow their fixes and wording)\n" + JSON.stringify(confirmed, null, 1),
  "## Numbers that may be shown, with the wording to use\n" + JSON.stringify(safeNumbers, null, 1),
  "## Numbers that must NOT be shown\n" + JSON.stringify(numbers.filter((x) => x.verdict === 'nie cytować'), null, 1),
  "## Your task (this overrides the general rule on files)",
  "Create exactly three files: poznan-trend-detective/web/about.html , web/about.js and web/about.css . Do not edit any existing file.",
  "- Plain HTML, CSS and JavaScript, no dependencies and no external requests except the app's own data files (data/land/sar.json and data/land/land.json, fetched with a relative URL). If a data file fails to load, the page still renders its text and says the numbers are unavailable.",
  "- Polish and English, with a language switch that remembers the choice in localStorage under the key the app already uses for language (read web/app.js to find it) and honours it on load. Every string in both languages; Polish must read naturally.",
  "- Reuse the app's look: read web/styles.css and copy the colour variables and type choices you need into about.css (light and dark theme, following the app's data-theme attribute and its localStorage key). The page must read well on a 390 px wide phone.",
  "- Sections, in this order: (1) what SARnik is, in two sentences, with a link back to the app (index.html); (2) why radar and not a photo; (3) which polarisation shows what and why: a small table and three simple inline SVG drawings of surface scattering, double bounce and volume scattering; (4) L-band next to C-band; (5) what the app computes: one short paragraph per product, each naming its data source and whether the source is NASA's or a partner's; (6) the evidence: each validation check from sar.json with its number filled in live, the plain-language meaning, and its caveat, using only numbers allowed above; a check whose number is not allowed is described without the number and with the reason; (7) what we do not promise; (8) answers to the challenge's questions (study area and why it is ours; which polarisations show the changes; the physical drivers; what cannot be seen and why; future uses of NISAR); (9) data sources, licences and attribution; (10) use of SI tools, as stated in the README.",
  "- Take facts from the README of version 2 and from the review above. Do not add claims of your own. Do not state anything the review refuted.",
  "Verify: node --check web/about.js ; serve poznan-trend-detective/web with 'python -m http.server 8771' in the background, fetch about.html, about.js and the two data files with curl and confirm status 200, then stop the server; open the page's script in node with a fake document only if that is simple, otherwise re-read the code for errors. Report the files written and what you could not verify.",
].join("\n\n"), { label: 'budowa strony O projekcie', phase: 'Strona', model: 'opus', effort: 'high' })

const PAGE_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
      where: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' },
    }, required: ['severity', 'problem', 'evidence', 'fix'] } },
    screenshots: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'findings'],
}
const pageReview = page ? await agent([
  "You review one new page of a web app ('About the project') before a hackathon jury reads it. Do not change it; report findings with evidence.",
  CONTEXT, RULES, ENV,
  "## What may be said\n" + JSON.stringify(confirmed, null, 1),
  "## Verdicts on numbers\n" + JSON.stringify(numbers, null, 1),
  "## Builder's report (claims to check)\n" + page,
  "## Your task",
  "Read poznan-trend-detective/web/about.html, about.js and about.css. Check: (1) every number shown comes from the data files at run time and is allowed by the verdicts, with its caveat; nothing refuted by the review is stated; (2) Polish and English say the same thing and Polish reads naturally; (3) the page works when a data file is missing; (4) no existing file was changed (git status); (5) it renders: serve poznan-trend-detective/web with 'python -m http.server 8772' in the background; if the Python environment above has Playwright (try to import it; do not install anything), open about.html at 1440x900 and 390x844 in both languages and both themes, fail on any console error, and save up to 4 JPEG screenshots into docs/przeglad-v2/zrzuty/ named about-*.jpg ; if Playwright is not available, fetch the files with curl, run node --check, and say clearly that the page was not seen in a browser. Stop the server. Severity: blocker = a wrong or forbidden claim or a page that does not render; major = misleading or broken in one language or on a phone; minor = polish.",
].join("\n\n"), { label: 'przegląd strony', phase: 'Strona', model: 'opus', effort: 'high', schema: PAGE_REVIEW_SCHEMA }) : null
const pageFindings = pageReview && pageReview.findings ? pageReview.findings : []
const pageFix = pageFindings.length ? await agent([
  "You fix review findings in one new page of a web app. You may edit only poznan-trend-detective/web/about.html, about.js and about.css.",
  CONTEXT, RULES, ENV,
  "## Findings\n" + JSON.stringify(pageFindings, null, 1),
  "Fix every blocker and major and the cheap minors. Where a finding says a claim or number is not allowed, remove or weaken it; never defend it. Run node --check on about.js afterwards. Report per finding: fixed / not real / left, one line each.",
].join("\n\n"), { label: 'poprawki strony', phase: 'Strona', model: 'opus', effort: 'high' }) : null
log('Strona: ' + (page ? 'zbudowana' : 'NIE powstała') + ', uwag z przeglądu: ' + pageFindings.length)

phase('Raport')
const report = await agent([
  "You write the science review report for a hackathon team: the app's author needs the bugs, and the pitch writers need to know exactly what they may say. Write one file and nothing else.",
  CONTEXT, RULES,
  "## Summaries of the five lenses\n" + summaries,
  "## Confirmed findings (verified by a second reviewer)\n" + JSON.stringify(confirmed, null, 1),
  "## Verdicts on numbers\n" + JSON.stringify(numbers, null, 1),
  "## Findings rejected in verification\n" + JSON.stringify(rejected, null, 1),
  "## Findings nobody verified\n" + JSON.stringify(unverified, null, 1),
  "## The new page About the project (built from the review)\nBuilder: " + (page || '(the page was not built)') + "\nReview: " + JSON.stringify(pageReview || {}, null, 1) + "\nFixes: " + (pageFix || '(none)'),
  "## Your task",
  "Write docs/przeglad-v2/NAUKA.md in Polish (plain short sentences, GitHub Markdown; keep proposed English wording in English): (1) 'W skrócie': at most six lines: is the science sound, and the three things to fix or reword first; (2) 'Co wolno powiedzieć': a table for the pitch writers (twierdzenie | werdykt: można / przeformułować / usunąć | bezpieczne brzmienie PL | safe wording EN); (3) 'Liczby': a table (liczba | co dokładnie liczy | werdykt: cytować / z zastrzeżeniem / nie cytować | brzmienie z zastrzeżeniem); where two lenses disagree about a number, take the stricter verdict and say so; (4) 'Błędy w pipeline': confirmed bugs for the author (id | plik i linia | problem | skutek dla użytkownika | poprawka), blockers first; (5) 'Dane NASA a dane partnerów': the table of results and the data behind them, and the suggested honest wording about NISAR's role; (6) 'Podpisy i licencje': what is missing; (7) 'Przeliczenie liczb': what was recomputed, what agreed, and how to rerun poznan-trend-detective/tests/nauka/recompute_checks.py; (8) 'Strona O projekcie': what the new page poznan-trend-detective/web/about.html contains, what was checked and what was not (say plainly if it was never opened in a browser), and the pull request description for it in Polish (new files only; link it from the app's About sheet later); (9) 'Czego nie sprawdzono'; (10) 'Odrzucone uwagi': one line each.",
  "Do not soften confirmed problems, do not add findings of your own, and do not turn an unverified finding into a confirmed one. Reply with the file path and the counts.",
].join("\n\n"), { label: 'raport NAUKA.md', phase: 'Raport', model: 'opus', effort: 'xhigh' })

return {
  branch: 'sarnik-strona',
  pr: 'otwarty: trzy nowe pliki strony (about.html, about.js, about.css); raport docs/przeglad-v2/NAUKA.md można zmergować osobno',
  files: ['poznan-trend-detective/web/about.html', 'poznan-trend-detective/web/about.js', 'poznan-trend-detective/web/about.css', 'docs/przeglad-v2/NAUKA.md', 'poznan-trend-detective/tests/nauka/'],
  page_built: !!page,
  page_findings: pageFindings.length,
  page_seen_in_browser_screenshots: pageReview && pageReview.screenshots ? pageReview.screenshots : [],
  findings: { all: all.length, confirmed: confirmed.length, rejected: rejected.length, unverified: unverified.length },
  blockers: confirmed.filter((f) => f.severity === 'blocker').map((f) => f.id + ': ' + f.problem),
  numbers: {
    cytowac: numbers.filter((x) => x.verdict === 'cytować').length,
    z_zastrzezeniem: numbers.filter((x) => x.verdict === 'cytować z zastrzeżeniem').length,
    nie_cytowac: numbers.filter((x) => x.verdict === 'nie cytować').length,
  },
  report_written: !!report,
}
