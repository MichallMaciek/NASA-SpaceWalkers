export const meta = {
  name: 'sarnik-dok-fakty',
  description: 'Dokument (po kodzie): weryfikacja twierdzeń i liczb, wynik w docs/fakty/',
  phases: [
    { title: 'Repo', detail: '3 agentów Haiku: liczby i twierdzenia w repozytorium', model: 'haiku' },
    { title: 'Sieć', detail: '6 agentów Sonnet: twierdzenia niepotwierdzone', model: 'sonnet' },
    { title: 'Kontrola', detail: 'Opus sprawdza cytaty i werdykty', model: 'opus' },
    { title: 'Redakcja', detail: 'Opus zapisuje FAKTY.md i fakty.json', model: 'opus' },
  ],
}

// Uruchomienie: Workflow({scriptPath: "<repo>/docs/planwyd/dok-fakty.js", args: {repo: "<pełna ścieżka do repo>"}})
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const WHERE = REPO
  ? "The repository root on this machine is " + REPO + " . Use absolute paths under it."
  : "First find the repository root: run git rev-parse --show-toplevel in your working directory. Use absolute paths under it."

const CONTEXT = [
  "## Context (established on 14 Nov 2026; trust it, do not re-derive)",
  "- Team SpaceWalkers, NASA Space Apps Challenge 2026, challenge 'Dancing with the SARs' (an interactive app that uses NISAR radar data to track and visualise surface change). Submission closes Sunday 15 Nov 2026 at 23:59 (Poland).",
  "- Product: SARnik (formerly 'Poznań Trend Detective'): a web app where a user searches an address or draws an area around Poznań and gets a 'technical inspection of the land'. Code in poznan-trend-detective/ (web/app.js, web/i18n.js, web/i18n_sar.js, data in web/data, pipeline in pipeline/). poznan-trend-detective/README.md describes the current version (v2). web/data/land/sar.json holds metadata and validation numbers (key 'checks'); web/data/land/land.json and web/data/study.json hold the older numbers.",
  "- Documents: docs/pitch.md (SARnik pitch; written before v2, so its status table is outdated), docs/pomysly-sar/ (six radar ideas with limits; zrodla.md lists sources and a section 'Niepotwierdzone' of unverified claims), poznan-trend-detective/docs/PITCH.md (older 7-slide deck ending with a table of where each number comes from), docs/planwyd.md (the work plan).",
  "- Judging: five criteria scored 1 to 5 (Impact, Creativity, Validity, Relevance, Presentation). Demo: a video of at most 30 seconds OR at most 7 slides. Project page in English, with disclosure of SI/AI use. These rules are already verified; do not spend time on them.",
  "- NISAR over Poznań: mode 20+5 MHz, HH + HV, GCOV pixel 20 m; provisional product version 17 Jun to 23 Oct 2026, validated version from 21 Oct 2026.",
].join("\n")

const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Read anything in the repository. Create or edit files ONLY under docs/fakty/ (and only if your task says to write files).",
  "- Never run git commands that change state (add, commit, push, checkout, switch, stash, reset, clean, merge, rebase). Never deploy anything.",
  "- A web claim counts as confirmed only with a verbatim quote from the source (at most 300 characters) and its URL. No quote means the verdict is 'nie znaleziono'. Never invent numbers, quotes, names or URLs. Prefer primary sources (the audit office, the law text, the agency) over press summaries, and say which kind you used.",
  "- Today is the weekend of 14-15 Nov 2026. Some sources are in Polish; quote them in the original language.",
].join("\n")

const CLAIMS_SCHEMA = {
  type: 'object',
  properties: {
    claims: { type: 'array', items: { type: 'object', properties: {
      claim: { type: 'string' },
      where: { type: 'string' },
      verdict: { type: 'string', enum: ['potwierdzone', 'częściowo', 'obalone', 'nie znaleziono'] },
      evidence: { type: 'string' },
      quote: { type: 'string' },
      source: { type: 'string' },
      source_kind: { type: 'string', enum: ['repo', 'pierwotne', 'prasa', 'naukowe', 'brak'] },
      confidence: { type: 'string', enum: ['wysoka', 'średnia', 'niska'] },
    }, required: ['claim', 'verdict', 'evidence', 'source'] } },
    notes: { type: 'string' },
  },
  required: ['claims'],
}

const intro = (kind) => [
  kind === 'repo'
    ? "You check numbers and statements against files in a git repository. Use only files; no web."
    : "You verify factual claims on the web for a hackathon team that must not put anything false on a slide. Use web search and fetch. Stop after about 12 tool calls per claim and report 'nie znaleziono' rather than guessing.",
  CONTEXT, RULES,
  "Return one entry per claim: the claim as written, where it appears (file and section), the verdict, the evidence in one or two sentences, the verbatim quote, the source (file path with key, or URL), the kind of source and your confidence.",
].join("\n\n")

const REPO_TASKS = [
  { key: 'liczby-pitch', prompt: "## Task\nOpen poznan-trend-detective/docs/PITCH.md and find the final table 'Where each number comes from'. For every number in it, open the file and key it names (poznan-trend-detective/web/data/land/land.json or web/data/study.json; use Python or jq) and compare. Report each number as potwierdzone (matches), częściowo (rounded differently or computed from other values; show the computation) or obalone (differs; give the real value). Also check the numbers on the slides themselves against that table." },
  { key: 'liczby-v2', prompt: "## Task\nOpen poznan-trend-detective/README.md (version 2) and poznan-trend-detective/web/i18n_sar.js. List every number and every quantitative statement about radar results (shares, ratios, dates, counts of passes, thresholds, correlation values). For each, find the matching value in poznan-trend-detective/web/data/land/sar.json (keys s1, egms, alos, nisar, decode, checks) or in the pipeline code (pipeline/build_sar.py, fetch_sar.py, fetch_nisar.py) and compare. Verdict per item as above; 'nie znaleziono' when no file backs the statement." },
  { key: 'twierdzenia', prompt: "## Task\nOpen docs/pitch.md and every file in docs/pomysly-sar/. List every factual claim about (a) the buyers' problem and the law, (b) radar physics, (c) data and what the app does. For each: say whether docs/pomysly-sar/zrodla.md gives a source or lists it under 'Niepotwierdzone'; and for claims about what the app does, check the current code (grep poznan-trend-detective/web/app.js, web/i18n_sar.js and README.md) and give the verdict potwierdzone (the app does it now), częściowo, obalone (the app does not do it) with the file and line as evidence. Do not judge the truth of physics or law here; mark those 'nie znaleziono' with source_kind 'brak' unless the repo itself contains the proof." },
]

const WEB_TASKS = [
  { key: 'nik', prompt: "## Task: the audit office (NIK) claims\n1. docs/pitch.md section 2 quotes NIK audit P/22/063 (2022): 'Potencjalni inwestorzy nie mieli rzetelnych informacji o zagrożeniu powodziowym' and says building permits usually carried no flood-risk information. Find the NIK report or NIK's own summary and confirm or correct the wording.\n2. docs/pomysly-sar/zrodla.md lists as unverified: 'ponad 19 tys. pozwoleń na terenach zalewowych, 90% zgód'. Find the exact figures and what they count (which years, which areas, which decisions)." },
  { key: 'przypadki', prompt: "## Task: cases and flood numbers\n1. Olsztyn, July 2026: a new estate without drainage where residents carry water out in buckets (docs/pitch.md says eight families, 18 months after buying, the design had no drainage and the city issued the permit). Confirm each detail from the source article(s).\n2. Kraków: flooding after a neighbouring development (see zrodla.md). Confirm what happened.\n3. Is there a documented case of a flooded or waterlogged new housing estate in Poznań or Wielkopolska? Search local press.\n4. In any of these cases, were buyers informed beforehand? Report only what sources say.\n5. Flood of 2024: 'ponad 230 tys. poszkodowanych (UOKiK)' and 'prawie 37 tys. wypłaconych szkód mieszkaniowych (PIU)'. Confirm the figures and what exactly they count." },
  { key: 'prawo', prompt: "## Task: what a developer must disclose\nThe pitch says the developer's information prospectus (prospekt informacyjny, ustawa deweloperska of 2021) asks only about the legal status of the plot with regard to areas of special flood hazard, and nothing about wet ground, groundwater level, geotechnical studies or planned buildings next door. Find the law or its official prospectus template and report exactly what must be disclosed about: flood hazard areas, groundwater, geotechnical or soil studies, and planned investments within 1 km. Quote the template's wording. Say clearly where the pitch's statement is right, too strong, or wrong." },
  { key: 'nisar', prompt: "## Task: NISAR technical claims\nConfirm from official documentation (nisar-docs.asf.alaska.edu, ASF, JPL, earthdata.nasa.gov) and quote:\n1. the dates of the provisional and validated product releases and the warning about mixing versions;\n2. the documented data gap around 27 Jul to 10 Aug 2026 (zrodla.md);\n3. the dataset path of coherence in a GUNW file and the GCOV pixel spacing for the 20 MHz mode;\n4. whether partial reads of the HDF5 files over the network are supported (range requests, vsicurl, fsspec);\n5. the calibration status of the SME2 soil-moisture product;\n6. that S-band acquisitions are mainly over India;\n7. what the NASA GIBS layer NISAR_L2_Geocoded_Polarimetric_Covariance shows (false colour meaning)." },
  { key: 'licencje', prompt: "## Task: coverage and licences\n1. Does the PIG-PIB landslide register (SOPO) cover the city of Poznań and the Warta valley scarps? Report what the register or its map service says.\n2. The ISOK flood hazard maps served at wody.isok.gov.pl carry a validity end of 2025-12-21 in their metadata. Is there a newer edition or review cycle, and which edition is current in November 2026?\n3. For each data source report the licence or terms of use and the attribution text required: PIG-PIB map services (EGMS copy, groundwater-flood areas, SOPO), ISOK / Wody Polskie flood maps, GUGiK BDOT10k, GUNB RWDZ building-permit register, GEOPOZ (City of Poznań) services, JAXA ALOS-2 PALSAR-2 yearly mosaics, Copernicus EGMS, Copernicus Sentinel-1, NASA data (NISAR, MODIS, POWER, GIBS imagery), JRC GHSL, Hansen/UMD Global Forest Change, OpenStreetMap. Flag anything that restricts use in a public web app." },
  { key: 'nauka', prompt: "## Task: science claims from the literature\nFor each claim find a peer-reviewed or agency source, quote it, and say how strong the support is:\n1. L-band HH responds to soil moisture under grass and crops where C-band stops responding (zrodla.md cites El Hajj et al., hal.inrae.fr/hal-03196203).\n2. L-band HH is the best band for flooded vegetation (double bounce off water and trunks); L-band backscatter tracked water level in the Everglades.\n3. Sentinel-1 detects construction sites with about 90% detection at 5% false alarms (ISPRS Archives XLII-3, 2018).\n4. Street orientation changes building backscatter in L, C and X bands.\n5. Land-change (urban growth) models typically reach a Figure of Merit of roughly 0.1 to 0.3 (the team also quotes 10 to 40%). Find the range in review papers.\n6. Is there published evidence that radar features improve urban growth prediction models?\n7. Expansive clays (iły poznańskie): seasonal movement of the order of 10 cm and damage appearing after 10 to 30 years.\n8. Any early published NISAR results (2026) for soil moisture, wetlands or urban areas." },
]

phase('Repo')
const repoP = parallel(REPO_TASKS.map((t) => () =>
  agent(intro('repo') + "\n\n" + t.prompt, { label: 'repo: ' + t.key, phase: 'Repo', model: 'haiku', effort: 'low', schema: CLAIMS_SCHEMA })))
phase('Sieć')
const webP = parallel(WEB_TASKS.map((t) => () =>
  agent(intro('web') + "\n\n" + t.prompt, { label: 'sieć: ' + t.key, phase: 'Sieć', model: 'sonnet', effort: 'low', schema: CLAIMS_SCHEMA })))
const repoRes = await repoP
const webRes = await webP
const tag = (tasks, res) => res.flatMap((r, i) => (r && r.claims ? r.claims : []).map((c) => Object.assign({ group: tasks[i].key }, c)))
const repoClaims = tag(REPO_TASKS, repoRes)
const webClaims = tag(WEB_TASKS, webRes)
const failed = REPO_TASKS.filter((t, i) => !repoRes[i]).concat(WEB_TASKS.filter((t, i) => !webRes[i])).map((t) => t.key)
log('Fakty: ' + repoClaims.length + ' z repo, ' + webClaims.length + ' z sieci' + (failed.length ? '; bez wyniku: ' + failed.join(', ') : ''))

phase('Kontrola')
const checked = await agent([
  "You are the checker of a fact sheet. Researchers on a cheaper model produced the claims below. Your job is to catch wrong or unsupported verdicts before the team relies on them.",
  CONTEXT, RULES,
  "## Claims from the web researchers\n" + JSON.stringify(webClaims, null, 1),
  "## Your task",
  "1. For every web claim with verdict 'potwierdzone' or 'częściowo': open the source URL and confirm that the quote is really there and really supports the claim. If the page cannot be opened or the quote is not there, change the verdict to 'nie znaleziono' and say why in the evidence. If the source is a press summary of a primary document, try once to reach the primary document and prefer it.",
  "2. Look for claims where two researchers disagree and resolve them.",
  "3. Return the full corrected list of web claims in the same shape (keep the group field in 'where' if useful). Do not drop any claim.",
].join("\n\n"), { label: 'kontrola cytatów', phase: 'Kontrola', model: 'opus', effort: 'high', schema: CLAIMS_SCHEMA })
const finalWeb = checked && checked.claims && checked.claims.length ? checked.claims : webClaims
if (!checked) log('Kontrola nie zwróciła wyniku: werdykty z sieci są NIESPRAWDZONE drugi raz')

phase('Redakcja')
const written = await agent([
  "You are the editor of the team's fact sheet. Write two files and nothing else.",
  CONTEXT, RULES,
  "## Checked claims from the web\n" + JSON.stringify(finalWeb, null, 1),
  "## Claims checked against repository files\n" + JSON.stringify(repoClaims, null, 1),
  failed.length ? "## Groups that returned nothing (say so in the file)\n" + failed.join(', ') : "",
  checked ? "" : "## Warning\nThe second check of web quotes did not run. State this at the top of FAKTY.md.",
  "## Your task",
  "Write docs/fakty/FAKTY.md in Polish (plain, short sentences, GitHub Markdown) with these sections:",
  "1. 'Jak czytać': four lines on the verdicts and on the rule that a slide may use only rows from section 2.",
  "2. 'Można użyć w pitchu': a table (twierdzenie | dokładne brzmienie do użycia | cytat ze źródła | źródło) with every confirmed claim. Where the source supports a weaker statement than the team wrote, give the corrected wording.",
  "3. 'Użyć tylko z zastrzeżeniem': partly confirmed claims with the caveat that must accompany them.",
  "4. 'Nie używać': refuted and not-found claims, each with one line why.",
  "5. 'Liczby w repo': numbers that match their files, numbers that do not (with the real value and the file key), and statements no file backs.",
  "6. 'Co aplikacja robi dziś': claims from the pitch documents checked against the current code.",
  "7. 'Licencje i podpisy danych': a table of sources with the attribution text to show.",
  "8. 'Pytania otwarte': what nobody could verify.",
  "Then write docs/fakty/fakty.json: a JSON array of all claims with fields claim, where, verdict, evidence, quote, source, source_kind, confidence, group.",
  "Do not soften a refuted claim and do not add facts of your own. Reply with the list of files written and the counts per verdict.",
].filter(Boolean).join("\n\n"), { label: 'redakcja FAKTY.md', phase: 'Redakcja', model: 'opus', effort: 'high' })

const count = (v) => finalWeb.concat(repoClaims).filter((c) => c.verdict === v).length
return {
  files: ['docs/fakty/FAKTY.md', 'docs/fakty/fakty.json'],
  verdicts: { potwierdzone: count('potwierdzone'), czesciowo: count('częściowo'), obalone: count('obalone'), nie_znaleziono: count('nie znaleziono') },
  groups_without_result: failed,
  second_check_ran: !!checked,
  editor_report: written,
}
