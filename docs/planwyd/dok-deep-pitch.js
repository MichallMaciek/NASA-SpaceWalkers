export const meta = {
  name: 'sarnik-dok-deep-pitch',
  description: 'Dokument (po kodzie): deep pitch EN i PL, wynik w docs/deep-pitch/',
  phases: [
    { title: 'Szkice', detail: '3 niezależne wersje pitchu', model: 'opus' },
    { title: 'Jury', detail: '5 jurorów, ocena ślepa', model: 'opus' },
    { title: 'Synteza', detail: 'zwycięzca plus najlepsze elementy', model: 'opus' },
    { title: 'Czerwony zespół', detail: '3 soczewki: fizyka, liczby, zasady', model: 'opus' },
    { title: 'Finał', detail: 'wersja EN i PL zapisane do plików', model: 'opus' },
  ],
}

// Uruchomienie: Workflow({scriptPath: "<repo>/docs/planwyd/dok-deep-pitch.js", args: {repo: "<pełna ścieżka do repo>"}})
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const WHERE = REPO
  ? "The repository root on this machine is " + REPO + " . Use absolute paths under it."
  : "First find the repository root: run git rev-parse --show-toplevel in your working directory. Use absolute paths under it."

const CONTEXT = [
  "## Context (established on 14 Nov 2026; trust it, do not re-derive)",
  "- Team SpaceWalkers, NASA Space Apps Challenge 2026, challenge 'Dancing with the SARs': build an interactive app that uses NISAR radar data to track and visualise surface change, explain which polarisations show the change and the physical drivers, and say what future uses of NISAR are possible. The full challenge text is in materials/challenge_dancing_with_the_sars.md. Submission closes Sunday 15 Nov 2026 at 23:59 (Poland).",
  "- Product: SARnik (formerly 'Poznań Trend Detective'): a web app where a user searches an address or draws an area around Poznań and gets a 'technical inspection of the land' from radar. poznan-trend-detective/README.md describes the current version (v2, on main since 14 Nov 18:30) and is the truth about what the app does: Sentinel-1 2026 picture and change since June, 'ground soaks up water' (how the echo follows soil wetness), water seen by radar, EGMS ground motion 2016-2020, ALOS-2 L-band history 2015-2021, NISAR L-band 2026 from GCOV pixels (track 158, provisional release, 25 Jun to 11 Oct 2026), NISAR wet minus dry (25 Jun vs 24 Aug), the window 'How radar sees the ground' (L-band next to C-band), a layer of building decisions, a land-change projection tested on 2015-2020, and validation numbers in poznan-trend-detective/web/data/land/sar.json (key 'checks'; read the 'what' text of each check and its p value before quoting it: some are weak).",
  "- The public address still serves version 1; version 2 has a preview address given in the README. Branch origin/v3 (not on main as of 14 Nov 19:10) changes how the card looks: a plain check-up with a header counting the things to check, six map views and an expert mode. Check git log origin/main to see which interface is on main before describing screens, and take screenshots only from that version.",
  "- Being built by the plan in docs/planwyd.md and NOT on main as of 14 Nov 19:30: ISOK flood zone lookup for a point, SOPO landslides, module rows in the place card, a 'what is being built here' row with building type, an 'About the project' page. Before claiming any of them, check that its pull request is merged (git log, gh pr list); otherwise give it the status 'in an open pull request'. Never claim: subsidence measured from NISAR, single buildings, basement or groundwater-level measurement.",
  "- Judging: five criteria scored 1 to 5 (Impact, Creativity, Validity, Relevance, Presentation). Demo: a video of at most 30 seconds OR at most 7 slides (exceeding either disqualifies). Project page in English with disclosure of SI/AI use and a list of NASA data used.",
  "- Source documents: docs/pitch.md (SARnik pitch with the hook, the buyers' problem with sources, 'what we do not promise' in section 6; its status table predates v2), docs/pomysly-sar/ (six radar ideas with honest limits; zrodla.md has a section 'Niepotwierdzone' of unverified claims), poznan-trend-detective/docs/PITCH.md (older 7-slide deck with numbers for the growth model and a table of where each number comes from), docs/planwyd.md (tables 'Założenia startowe' and 'Statusy funkcji'), docs/BURZA_MOZGOW.md (section 8: answers to the challenge's questions).",
  "- If docs/fakty/FAKTY.md exists, it is the fact sheet: use only its confirmed rows for claims about the law, the audit office and press cases. If it does not exist yet, treat everything listed under 'Niepotwierdzone' in docs/pomysly-sar/zrodla.md as unverified and keep it off slides. If docs/grilling/ZALOZENIA.json exists, use its recommendations as working assumptions; otherwise use the table 'Założenia startowe' in docs/planwyd.md. If docs/przeglad-v2/NAUKA.md or APLIKACJA.md exist, do not repeat anything they refute.",
  "- Working assumptions: name SARnik; hook PL 'Deweloper ci tego nie powie. Radar tak.' / EN 'The developer won't tell you. The radar will.'; study area Poznań plus 17 municipalities; separate flags per risk, no single 0-100 overall score.",
].join("\n")

const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Read anything in the repository. Create or edit files ONLY under docs/deep-pitch/ (and only if your task says to write files).",
  "- Never run git commands that change state (add, commit, push, checkout, switch, stash, reset, clean, merge, rebase). Never deploy anything.",
  "- Every number carries a source tag right after it: [src:<repo path>#<key>] for repository data or [url:<address>] for the web. A number without a tag will be deleted by the reviewers. Never invent numbers, quotes or sources.",
  "- Every claim about what the app does must be true of the code on main. Mark each claim's status: 'works today', 'in an open pull request', 'needs team decision', or 'future direction'. Only 'works today' may appear on a slide without a footnote.",
  "- Anything that depends on a decision the team has not made is written as a footnote [ZAŁOŻENIE: ...], never as text on a slide.",
  "- Tone: say plainly that a developer has no duty to disclose these things and does not; name no companies and never write 'fraud'.",
].join("\n")

const ANGLES = [
  { key: 'A', label: 'problem kupującego', angle: "Lead with the buyer's problem: the biggest purchase of a lifetime is made on nice photos; nobody tells you the ground is wet or what is being built next door. Hook: 'The developer won't tell you. The radar will.' Radar is the answer to a human problem." },
  { key: 'B', label: 'nauka NISAR', angle: "Lead with the science: what L-band radar sees that a photo cannot (through clouds, at night, under leaves, soil wetness), L-band next to C-band, which polarisation shows what and why (dielectric constant, double bounce, volume scattering). The buyer's story illustrates the physics." },
  { key: 'C', label: 'dowód', angle: "Lead with proof: 'The model predicted it. NISAR sees it. The planning office confirms it.' Build the pitch around the validation numbers in sar.json and the growth model's test on 2015-2020, and be exact about which numbers are strong and which are weak." },
]

const DRAFT_SPEC = [
  "Write a complete pitch draft in English with these parts:",
  "1. One sentence that says what SARnik is and for whom (and its Polish version).",
  "2. Seven slides. For each: title; the exact text on the slide (at most 35 words); the visual (which screen of the app, which layer, which place); speaker notes (at most 80 words); sources for every number.",
  "3. A 30-second video script as a table: time range, voice-over (at most 70 words in total), on-screen caption, what the app shows.",
  "4. An evidence table: claim, status (works today / in an open pull request / needs team decision / future direction), source.",
  "5. The five hardest questions a judge could ask about this draft, each with a two-sentence honest answer.",
].join("\n")

phase('Szkice')
const drafts = await parallel(ANGLES.map((a) => () => agent([
  "You write one of three competing pitch drafts for a hackathon team. Three writers work independently from different angles; a jury will score the drafts blind.",
  CONTEXT, RULES,
  "## Your angle\n" + a.angle,
  "## Your task\nRead the README of version 2, sar.json, docs/pitch.md, docs/pomysly-sar/ and the other documents listed. " + DRAFT_SPEC,
].join("\n\n"), { label: 'szkic ' + a.key + ': ' + a.label, phase: 'Szkice', model: 'opus', effort: 'high' })))
const have = ANGLES.map((a, i) => ({ key: a.key, text: drafts[i] })).filter((d) => d.text)
if (!have.length) throw new Error('Żaden szkic nie powstał')
const draftsText = have.map((d) => "### DRAFT " + d.key + "\n" + d.text).join("\n\n")
log('Szkice: ' + have.length + '/3')

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    scores: { type: 'array', items: { type: 'object', properties: {
      draft: { type: 'string' }, score: { type: 'number' }, why: { type: 'string' },
    }, required: ['draft', 'score', 'why'] } },
    best_elements: { type: 'array', items: { type: 'string' } },
    weakest_claims: { type: 'array', items: { type: 'string' } },
  },
  required: ['scores', 'best_elements', 'weakest_claims'],
}
const CRITERIA = [
  { key: 'Impact', text: "Impact: does the project address a significant problem, how large is its reach, does it inspire or help many people?" },
  { key: 'Creativity', text: "Creativity: is it original, a novel concept or a meaningful improvement on existing ideas, a fresh perspective?" },
  { key: 'Validity', text: "Validity: is it scientifically sound and technically feasible, complete, usable and user-friendly, does it work in the real world?" },
  { key: 'Relevance', text: "Relevance: does it fully and directly address the challenge, and is NASA data integral to the solution rather than a superficial addition?" },
  { key: 'Presentation', text: "Presentation: is the challenge, the solution and its significance communicated clearly, with engaging and well-structured storytelling?" },
]
phase('Jury')
const juries = await parallel(CRITERIA.map((c) => () => agent([
  "You are a NASA Space Apps judge. You score three pitch drafts, labelled only by letter, on ONE criterion, from 1 to 5 (5 = outstanding).",
  "Your criterion. " + c.text,
  CONTEXT,
  "## The drafts\n" + draftsText,
  "Score each draft on your criterion only, with a two-sentence reason. Then list the best elements across all drafts that the final pitch must keep (name the draft and the element), and the weakest claims that would cost points with a real judge (over-claims, numbers without proof, things the app does not do).",
].join("\n\n"), { label: 'juror: ' + c.key, phase: 'Jury', model: 'opus', effort: 'high', schema: SCORE_SCHEMA })))
const totals = {}
juries.filter(Boolean).forEach((j) => (j.scores || []).forEach((s) => { const k = String(s.draft).replace(/[^ABC]/g, '').slice(0, 1); if (k) totals[k] = (totals[k] || 0) + (Number(s.score) || 0) }))
const juryText = CRITERIA.map((c, i) => juries[i] ? "### " + c.key + "\n" + JSON.stringify(juries[i], null, 1) : "### " + c.key + "\n(no result)").join("\n\n")
log('Jury: suma punktów ' + JSON.stringify(totals))

phase('Synteza')
const synth = await agent([
  "You write the team's final pitch from three drafts and a jury's verdict.",
  CONTEXT, RULES,
  "## The drafts\n" + draftsText,
  "## Jury results (total points per draft: " + JSON.stringify(totals) + ")\n" + juryText,
  "## Your task",
  "Take the highest-scoring draft as the base, graft in the best elements the judges named, and remove or fix every weakest claim. Check each number against the repository yourself before keeping it. " + DRAFT_SPEC,
  "Add three more parts: (6) the text of the Space Apps project page in English: summary (at most 100 words), detailed description, how the project answers each question in the challenge text (study area and personal context; which polarisations show the changes; physical drivers; what cannot be seen and why; future applications of NISAR), NASA data used, partner and other data, use of SI tools; (7) 'What we do not promise' (from docs/pitch.md section 6, updated to version 2); (8) a bank of 15 hard jury questions with honest two-sentence answers.",
].join("\n\n"), { label: 'synteza pitchu', phase: 'Synteza', model: 'opus', effort: 'xhigh' })
if (!synth) throw new Error('Synteza nie powstała')

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: { findings: { type: 'array', items: { type: 'object', properties: {
    where: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' },
    severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
  }, required: ['where', 'problem', 'fix', 'severity'] } } },
  required: ['findings'],
}
const LENSES = [
  { key: 'fizyka', text: "Radar physics and over-claims. You are a SAR scientist. Check every statement about what radar sees against physics and against what version 2 actually computes (read pipeline/build_sar.py, fetch_nisar.py and the README limits). Flag anything a radar expert on the jury would reject: subsidence from five months of data, single buildings from 20 m pixels, moisture under buildings, forecasts attributed to NISAR, mixed product versions, validation numbers that are not significant, causal language where only correlation is shown." },
  { key: 'liczby', text: "Numbers. Open the file and key behind every source tag and compare the value. Flag every number without a tag, every mismatch, every number quoted without its caveat (sample size, p value, what exactly was counted), and every claim about the law, the audit office or press cases that is not confirmed in docs/fakty/FAKTY.md (or, if that file does not exist, that appears under 'Niepotwierdzone' in docs/pomysly-sar/zrodla.md)." },
  { key: 'zasady', text: "Submission rules and clarity. Exactly 7 slides or fewer; slide text short enough to read in five seconds; the video script fits 30 seconds at a natural speaking pace (count the words); everything in English; the project-page text covers every question of the challenge and lists NASA data; SI use is disclosed; no minors, no brand logos, no company names accused of anything; nothing that claims a feature the app lacks." },
]
phase('Czerwony zespół')
const reds = await parallel(LENSES.map((l) => () => agent([
  "You are on the red team for a hackathon pitch. Find what is wrong before a judge does. Do not rewrite the pitch; report findings with the exact place and a concrete fix.",
  "Your lens. " + l.text,
  CONTEXT, RULES,
  "## The pitch\n" + synth,
].join("\n\n"), { label: 'czerwony zespół: ' + l.key, phase: 'Czerwony zespół', model: 'opus', effort: 'high', schema: FINDINGS_SCHEMA })))
const findings = reds.filter(Boolean).flatMap((r) => r.findings || [])
log('Czerwony zespół: ' + findings.length + ' uwag, w tym ' + findings.filter((f) => f.severity === 'blocker').length + ' blokujących')

phase('Finał')
const finalEn = await agent([
  "You produce the final English deep pitch for a hackathon team and write it to a file.",
  CONTEXT, RULES,
  "## The pitch before review\n" + synth,
  "## Red-team findings to apply\n" + JSON.stringify(findings, null, 1),
  "## Your task",
  "Apply every blocker and major finding and every minor one that is cheap. Where a finding says a number or claim has no support, remove it or weaken it; never defend it. Then write docs/deep-pitch/DEEP_PITCH.md (GitHub Markdown, English) with this order: one-sentence pitch (EN and PL); the problem with sources; why radar and not a photo; what the product shows; the evidence table with statuses; seven slides with speaker notes; the 30-second video script; the project-page text with answers to the challenge's questions; what we do not promise; the bank of hard jury questions; a sources table built from the tags (keep the tags in the text too); a short list 'Assumptions waiting for the team' with every [ZAŁOŻENIE].",
  "After writing, reply with the full text of the file.",
].join("\n\n"), { label: 'finał EN', phase: 'Finał', model: 'opus', effort: 'high' })
const finalPl = await agent([
  "You write the Polish version of a hackathon pitch for the local event in Poznań and save it to a file. It is not a word-for-word translation: it must sound like a person from Poznań talking to a local jury, in plain, natural Polish without English calques.",
  CONTEXT, RULES,
  "## The final English pitch\n" + (finalEn || synth),
  "## Your task",
  "Write docs/deep-pitch/DEEP_PITCH_PL.md with: the one-sentence pitch; the seven slides with speaker notes; the 30-second video script; 'Czego nie obiecujemy'; the ten hardest jury questions with answers. Keep every number and its source tag exactly as in the English version; do not add or change numbers. Reply with the list of files written.",
].join("\n\n"), { label: 'wersja PL', phase: 'Finał', model: 'opus', effort: 'high' })

return {
  files: ['docs/deep-pitch/DEEP_PITCH.md', 'docs/deep-pitch/DEEP_PITCH_PL.md'],
  jury_totals: totals,
  red_team_findings: findings.length,
  red_team_blockers: findings.filter((f) => f.severity === 'blocker').map((f) => f.problem),
  english_written: !!finalEn,
  polish_written: !!finalPl,
}
