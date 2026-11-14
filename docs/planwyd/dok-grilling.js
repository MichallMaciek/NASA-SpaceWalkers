export const meta = {
  name: 'sarnik-dok-grilling',
  description: 'Dokument (po kodzie): pytania dla zespołu w formacie grillingu, wynik w docs/grilling/',
  phases: [
    { title: 'Pytania', detail: '7 ról (jurorzy, ekspert SAR, szef dostaw)', model: 'opus' },
    { title: 'Drzewo decyzji', detail: 'scalenie duplikatów i zależności', model: 'opus' },
    { title: 'Sceptycy', detail: '3 agentów podważa rekomendacje rundy 1', model: 'opus' },
    { title: 'Krytyk', detail: 'czego brakuje', model: 'opus' },
    { title: 'Redakcja', detail: 'zapis docs/grilling/', model: 'opus' },
  ],
}

// Uruchomienie: Workflow({scriptPath: "<repo>/docs/planwyd/dok-grilling.js", args: {repo: "<pełna ścieżka do repo>"}})
const REPO = (typeof args === 'object' && args && args.repo) ? String(args.repo) : ''
const WHERE = REPO
  ? "The repository root on this machine is " + REPO + " . Use absolute paths under it."
  : "First find the repository root: run git rev-parse --show-toplevel in your working directory. Use absolute paths under it."

const CONTEXT = [
  "## Context (established on 14 Nov 2026; trust it, do not re-derive)",
  "- Team SpaceWalkers (6 people), NASA Space Apps Challenge 2026, challenge 'Dancing with the SARs' (an interactive app that uses NISAR radar data to track and visualise surface change). Submission closes Sunday 15 Nov 2026 at 23:59 (Poland). Gates set by the team: Sunday 14:00 (switch to the rebuilt map if it passes its tests, see docs/poprawa_mapy.md; otherwise submit the current version) and Sunday 16:00 (no more changes to the app; only video, slides and the submission).",
  "- Product: SARnik (formerly 'Poznań Trend Detective'): a web app where a user searches an address or draws an area around Poznań and gets a 'technical inspection of the land'. poznan-trend-detective/README.md describes the current version (v2, on main since 14 Nov 18:30) and is the best description of what exists: Sentinel-1 2026 picture and change, 'ground soaks up water', water seen by radar, EGMS ground motion, ALOS-2 L-band history, NISAR L-band 2026 from GCOV pixels (track 158, provisional release), NISAR wet minus dry, the window 'How radar sees the ground', a layer of building decisions, and validation numbers in poznan-trend-detective/web/data/land/sar.json (key 'checks').",
  "- The public address still serves version 1; version 2 has a preview address given in the README. Only the owner of the Firebase project can deploy.",
  "- Branch origin/v3 (the app author's next interface, with its own preview address in the README on that branch; not on main as of 14 Nov 19:30) changes the place card to a plain check-up with a header counting the things to check, groups 'From SAR radar' and 'Background from other sources', six map views and an expert mode. docs/poprawa_mapy.md plans a separate, larger rebuild of the map engine (one engine, full-resolution tiles, tests before switching); the team also calls it 'v3'. Which interface ships, and whether the rebuild is attempted, are open decisions for the team: ask about them.",
  "- Not in the app on main as of 14 Nov 19:30, but being built by the plan in docs/planwyd.md: ISOK flood zone lookup for a point, SOPO landslides, module rows in the place card, a 'what is being built here' row with building type, an 'About the project' page, automatic tests.",
  "- Judging: five criteria scored 1 to 5 (Impact, Creativity, Validity, Relevance, Presentation). Demo: a video of at most 30 seconds OR at most 7 slides. Project page in English with disclosure of SI/AI use. The team owner can change the challenge until the hackathon closes.",
  "- Documents to read: docs/planwyd.md (work plan; see 'Co się zmieniło o 19:30', 'Stan funkcji' and 'Scalanie'), docs/poprawa_mapy.md (a teammate's list for rebuilding the map, with the Sunday gates), docs/pitch.md (SARnik pitch; partly outdated), docs/pomysly-sar/ (six radar ideas with limits, and zrodla.md with unverified claims), poznan-trend-detective/docs/PITCH.md (older deck), docs/BURZA_MOZGOW.md (sections 2, 7, 8, 9, 10), docs/PLAN.md (section 1: open decisions O1 to O3), progres/p1/ (team summaries). If docs/fakty/FAKTY.md exists, read it and treat it as the fact sheet.",
  "- Five computers code in parallel according to docs/planwyd.md: 1 the core extension points that show module rows in the place card (its code starts only after branch origin/v3 is merged into main, so that computer writes this document first), 2 modules for the ISOK flood zone and SOPO landslides, 3 the module 'what is being built here' from building decisions, 4 automatic tests, CI and small fixes, 5 an 'About the project' page with live numbers. Their results are open pull requests until merged; check git log and the open pull requests (gh pr list) before assuming a feature exists.",
].join("\n")

const RULES = [
  "## Rules",
  "- " + WHERE,
  "- Read anything in the repository. Create or edit files ONLY under docs/grilling/ (and only if your task says to write files).",
  "- Never run git commands that change state (add, commit, push, checkout, switch, stash, reset, clean, merge, rebase). Never deploy anything.",
  "- Finding facts is your job, never the team's. A question may go to the team only if it is a decision: something people must choose. Anything that can be looked up in the repository, measured from data or found on the web is not a team question; mark it answerable_by 'agenci' or 'dane'.",
  "- Base every recommendation on something you can point to (a file, a number with its source, a rule of the competition). Never invent numbers.",
  "- Write question texts in Polish, in plain short sentences, because the team reads them aloud.",
].join("\n")

const Q_PROPS = {
  title: { type: 'string' },
  body: { type: 'string' },
  options: { type: 'array', items: { type: 'string' } },
  recommended: { type: 'string' },
  why: { type: 'string' },
  depends_on: { type: 'array', items: { type: 'string' } },
  answerable_by: { type: 'string', enum: ['zespół', 'dane', 'agenci'] },
  default_if_unanswered: { type: 'string' },
  reversible: { type: 'boolean' },
  must_decide_by: { type: 'string' },
  affects: { type: 'string' },
  cost_if_wrong: { type: 'string' },
}
const PERSONA_SCHEMA = {
  type: 'object',
  properties: { questions: { type: 'array', items: { type: 'object', properties: Q_PROPS, required: ['title', 'body', 'options', 'recommended', 'why', 'answerable_by'] } } },
  required: ['questions'],
}
const TREE_SCHEMA = {
  type: 'object',
  properties: {
    questions: { type: 'array', items: { type: 'object', properties: Object.assign({ id: { type: 'string' }, raised_by: { type: 'array', items: { type: 'string' } } }, Q_PROPS), required: ['id', 'title', 'body', 'options', 'recommended', 'why', 'answerable_by', 'depends_on'] } },
    notes: { type: 'string' },
  },
  required: ['questions'],
}
const VERDICT_SCHEMA = {
  type: 'object',
  properties: { verdicts: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' },
    verdict: { type: 'string', enum: ['utrzymać', 'zmienić'] },
    new_recommended: { type: 'string' },
    new_why: { type: 'string' },
    risk: { type: 'string' },
  }, required: ['id', 'verdict', 'risk'] } } },
  required: ['verdicts'],
}

const PERSONAS = [
  { key: 'juror-impact', role: "a judge scoring IMPACT, who also thinks like a first-time home buyer in Poznań: does this solve a real problem for real people, who exactly uses it and what do they do differently afterwards?" },
  { key: 'juror-creativity', role: "a judge scoring CREATIVITY: what here has not been done before, what is a meaningful improvement, and what looks like every other radar dashboard?" },
  { key: 'juror-validity', role: "a judge scoring VALIDITY: is it scientifically sound, technically feasible, complete and usable; which numbers would you ask to see proven?" },
  { key: 'juror-relevance', role: "a judge scoring RELEVANCE: does the project answer the challenge text (read docs/BURZA_MOZGOW.md section 8 and materials/challenge_dancing_with_the_sars.md) and is NISAR data integral, not decoration?" },
  { key: 'juror-presentation', role: "a judge scoring PRESENTATION: the 30-second video or 7 slides, the English project page, the story and the live demo." },
  { key: 'ekspert-sar', role: "a radar remote-sensing scientist who will look for over-claims: polarisations, L-band versus C-band, what five months of NISAR can and cannot show, product versions, validation." },
  { key: 'szef-dostaw', role: "the delivery lead watching the clock to Sunday 23:59: who does what, what gets cut, who deploys version 2, who fills in the project page, what the Sunday 14:00 gate decides and who checks it, how the five computers' results are merged." },
]

phase('Pytania')
const personaRes = await parallel(PERSONAS.map((p) => () => agent([
  "You help a hackathon team stress-test its plan before the deadline. You play one role: " + p.role,
  CONTEXT, RULES,
  "## Your task",
  "Read the documents listed above, then propose the 5 to 8 questions from your role that matter most for winning. For each question give: a short title; the body (two or three sentences with the options spelled out); 2 to 4 options; the answer you recommend; why (pointing to a file, a number with its source, or a competition rule); depends_on (titles of other questions of yours that must be settled first, or an empty list); answerable_by ('zespół' for a real decision, 'dane' if measuring the data settles it, 'agenci' if looking something up settles it); default_if_unanswered (what happens if the team does not decide); reversible (can it be changed on Sunday without wasted work); must_decide_by (for example 'sobota wieczór', 'niedziela 12:00'); affects (pitch, app, video, project page, roles); cost_if_wrong.",
  "Word each question so that answering 'tak' accepts your recommendation. Skip anything already settled in the table 'Założenia startowe' of docs/planwyd.md unless you have a concrete reason to reopen it, and say the reason.",
].join("\n\n"), { label: 'rola: ' + p.key, phase: 'Pytania', model: 'opus', effort: 'high', schema: PERSONA_SCHEMA })))
const raw = personaRes.flatMap((r, i) => (r && r.questions ? r.questions : []).map((q) => Object.assign({ raised_by: PERSONAS[i].key }, q)))
log('Pytania: ' + raw.length + ' od ' + personaRes.filter(Boolean).length + '/7 ról')
if (!raw.length) throw new Error('Żadna rola nie zwróciła pytań')

phase('Drzewo decyzji')
const tree = await agent([
  "You turn a pile of overlapping questions into one decision tree for a hackathon team.",
  CONTEXT, RULES,
  "## Questions proposed by seven roles\n" + JSON.stringify(raw, null, 1),
  "## Your task",
  "1. Merge duplicates and near-duplicates into one question each (keep the clearest wording, list the roles in raised_by).",
  "2. Give every question an id: Q1, Q2, ... in order of importance.",
  "3. Set depends_on to the ids of questions whose answer must be known first. A question depends on another only if its options or its recommendation would change with the other's answer. No cycles.",
  "4. Re-check answerable_by for each: only real choices stay 'zespół'. Facts go to 'agenci' or 'dane'.",
  "5. Make sure each question still reads so that 'tak' accepts the recommendation, and that the recommendation is one of the options.",
  "6. Keep at most 30 questions in total; drop the least consequential and say in notes what you dropped.",
].join("\n\n"), { label: 'drzewo decyzji', phase: 'Drzewo decyzji', model: 'opus', effort: 'xhigh', schema: TREE_SCHEMA })
if (!tree || !tree.questions || !tree.questions.length) throw new Error('Drzewo decyzji nie powstało')

// Rundy liczy kod: runda 1 = pytania do zespołu bez nierozstrzygniętych zależności.
const computeRounds = (list) => {
  const team = list.filter((q) => q.answerable_by === 'zespół')
  const byId = {}
  team.forEach((q) => { byId[q.id] = q })
  const round = {}
  const visit = (q, stack) => {
    if (round[q.id]) return round[q.id]
    if (stack.indexOf(q.id) >= 0) return 1 // cykl: przerwij
    const deps = (q.depends_on || []).map((d) => byId[d]).filter(Boolean)
    const r = deps.length ? 1 + Math.max.apply(null, deps.map((d) => visit(d, stack.concat([q.id])))) : 1
    round[q.id] = r
    return r
  }
  team.forEach((q) => visit(q, []))
  return round
}
let questions = tree.questions
let rounds = computeRounds(questions)
const round1 = questions.filter((q) => rounds[q.id] === 1)
log('Drzewo: ' + questions.length + ' pytań, w tym ' + Object.keys(rounds).length + ' do zespołu; runda 1: ' + round1.length)

phase('Sceptycy')
const chunk = (arr, n) => { const out = []; for (let i = 0; i < n; i++) out.push([]); arr.forEach((x, i) => out[i % n].push(x)); return out.filter((c) => c.length) }
const skeptics = await parallel(chunk(round1, 3).map((batch, i) => () => agent([
  "You are a sceptic. For each question below, try to show that the recommended answer is wrong or risky for a team that wants to win the hackathon by Sunday 23:59. Check the recommendation against the repository (README of version 2, sar.json validation numbers, the plan's status table, the fact sheet docs/fakty/FAKTY.md if it exists).",
  CONTEXT, RULES,
  "## Questions\n" + JSON.stringify(batch, null, 1),
  "For each id return: verdict 'utrzymać' if the recommendation survives, or 'zmienić' with new_recommended (one of the listed options, or a new option stated precisely) and new_why; and always the main risk of the final recommendation in one sentence.",
].join("\n\n"), { label: 'sceptyk ' + (i + 1), phase: 'Sceptycy', model: 'opus', effort: 'high', schema: VERDICT_SCHEMA })))
const verdicts = {}
skeptics.filter(Boolean).forEach((s) => (s.verdicts || []).forEach((v) => { verdicts[v.id] = v }))
let changed = 0
questions = questions.map((q) => {
  const v = verdicts[q.id]
  if (!v) return q
  const out = Object.assign({}, q, { risk: v.risk, checked: true })
  if (v.verdict === 'zmienić' && v.new_recommended) {
    changed++
    out.recommended_before = q.recommended
    out.recommended = v.new_recommended
    if (v.new_why) out.why = v.new_why
    if (out.options.indexOf(v.new_recommended) < 0) out.options = out.options.concat([v.new_recommended])
  }
  return out
})
log('Sceptycy: sprawdzono ' + Object.keys(verdicts).length + ' z ' + round1.length + ' pytań rundy 1, zmieniono ' + changed)

phase('Krytyk')
const critic = await agent([
  "You are the completeness critic of a decision list for a hackathon team. Find what is missing: decisions nobody asked about but which will bite before Sunday 23:59.",
  CONTEXT, RULES,
  "## Current questions\n" + JSON.stringify(questions.map((q) => ({ id: q.id, title: q.title, answerable_by: q.answerable_by, recommended: q.recommended })), null, 1),
  "Think about, at least: who deploys version 2 to the public address and when; who owns the Space Apps project page and its required fields; video or slides, and who records; who speaks at the local event; what the Sunday 14:00 gate actually tests and who decides; which of the two things called 'v3' ships (the app author's branch with the plain check-up, or the map rebuild in docs/poprawa_mapy.md); which validation numbers go on a slide and which are too weak; how results from the five computers get merged and by whom; the disclosure of SI/AI use; what is cut if time runs out; the fallback challenge.",
  "Return only genuinely missing team decisions (at most 6), in the same shape as the existing ones, with ids continuing after the last one and depends_on using existing ids. Return an empty list if nothing is missing.",
].join("\n\n"), { label: 'krytyk kompletności', phase: 'Krytyk', model: 'opus', effort: 'high', schema: TREE_SCHEMA })
const known = {}
questions.forEach((q) => { known[q.id] = true })
const added = (critic && critic.questions ? critic.questions : []).filter((q) => !known[q.id]).map((q) => Object.assign({ added_by_critic: true }, q))
questions = questions.concat(added)
rounds = computeRounds(questions)
questions = questions.map((q) => Object.assign({ round: rounds[q.id] || null }, q))
log('Krytyk: dodano ' + added.length + ' pytań')

phase('Redakcja')
const written = await agent([
  "You are the editor of the team's question pack. Write four files and nothing else.",
  CONTEXT, RULES,
  "## All questions (field 'round' is set for team questions; null means it is not a team question)\n" + JSON.stringify(questions, null, 1),
  "## Your task",
  "1. docs/grilling/RUNDA_1.md, in Polish. Start with three lines on how to use it (read each question aloud; 'tak' accepts the recommendation; otherwise pick another option; write the answer in the sheet at the end). Then every question with round 1, most important first, at most 12; if there are more, keep the 12 with the highest cost of being wrong and list the rest under 'Jeśli zostanie czas'. Use exactly this format for each:\n\n❓ **Q1** - **<tytuł>**: <treść z opcjami>\n\n➡️ <rekomendowana odpowiedź i jedno zdanie dlaczego; jeśli sceptyk podał ryzyko, dodaj je po słowie Ryzyko:>\n\n---\n\nThen a section 'Arkusz odpowiedzi' (a table: pytanie | odpowiedź zespołu | kto pilnuje | do kiedy). Then a section 'Następne rundy (zablokowane)' listing the titles of questions with round 2 or more and which answers unlock them.",
  "2. docs/grilling/ZALOZENIA.json: a JSON array with every team question from every round: id, round, title, recommended, why, default_if_unanswered, reversible, must_decide_by, affects, depends_on. This is what the other computers use as working assumptions.",
  "3. docs/grilling/PYTANIA_O_FAKTY.md, in Polish: the questions with answerable_by 'agenci' or 'dane', each with what would settle it. These are for the fact-checking and review computers, not for the team.",
  "4. docs/grilling/README.md, in Polish, about 15 lines: what the files are, how to run a 45-minute session, and that the team's answers should be sent back to this computer so the next round can be computed.",
  "Keep the wording of questions and recommendations; fix only language. Reply with the list of files written and the number of questions per round.",
].join("\n\n"), { label: 'redakcja pytań', phase: 'Redakcja', model: 'opus', effort: 'high' })

const perRound = {}
questions.forEach((q) => { const k = q.round ? 'runda ' + q.round : 'nie do zespołu'; perRound[k] = (perRound[k] || 0) + 1 })
return {
  files: ['docs/grilling/RUNDA_1.md', 'docs/grilling/ZALOZENIA.json', 'docs/grilling/PYTANIA_O_FAKTY.md', 'docs/grilling/README.md'],
  questions_per_round: perRound,
  recommendations_changed_by_sceptics: changed,
  added_by_critic: added.length,
  editor_report: written,
}
