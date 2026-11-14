# SARnik: deep pitch (English)

Team SpaceWalkers, NASA Space Apps Challenge 2026 [src:materials/challenge_dancing_with_the_sars.md#title], challenge "Dancing with the SARs".

**Status of this document:** final pitch after the red-team review, written on 14 Nov 2026. Every number carries a source tag. Every claim about the app is true of `main` at commit 0cdedf1 and carries one of four statuses: **works today**, **in an open pull request**, **needs team decision**, **future direction**. Only "works today" appears on a slide without a footnote. Anything that waits for a team decision is a footnote marked [ZAŁOŻENIE: ...].

**How this was checked (14 Nov 2026, evening)**
- `main` HEAD is 0cdedf1. `gh pr list` shows one open pull request: #11, branch `sarnik-wuia` ("Co tam powstanie"). The branches `sarnik-rdzen` (module rows) and `sarnik-zagrozenia` (ISOK, SOPO) have no pull request. The "About the project" page has neither a branch nor a pull request.
- docs/fakty/FAKTY.md, docs/grilling/ZALOZENIA.json and docs/przeglad-v2/ do not exist. The working assumptions therefore come from the brief, and everything under "Niepotwierdzone" in docs/pomysly-sar/zrodla.md stays off the slides.
- Numbers were re-read from `sar.json`, `land.json`, `study.json`, the NISAR pass list `progres/p1/dane/nisar_poznan_przeloty.csv` and the pipeline code.
- The three web pages quoted (Polsat, prawo.pl, pewnylokal.pl) were fetched on 14 Nov 2026 by the synthesis step; their verbatim quotes are in the sources table.

---

## 1. One-sentence pitch

**EN:** SARnik is a free web app for anyone about to buy a flat, house or plot in Poznań and the 17 municipalities around it [src:poznan-trend-detective/web/data/study.json#areas]: search an address or draw a plot and get a radar check-up of the land before you sign, showing what went up nearby since last autumn (Sentinel-1), whether the ground moved in 2016–2020 [src:poznan-trend-detective/web/data/land/sar.json#egms.source] (EGMS), and, where NASA-ISRO NISAR saw it, how the ground responded to one rain. *The developer won't tell you. The radar will.*¹

**PL:** SARnik to darmowa aplikacja dla każdego, kto kupuje mieszkanie, dom albo działkę w Poznaniu i 17 gminach wokół [src:poznan-trend-detective/web/data/study.json#areas]: wpisujesz adres albo obrysowujesz działkę i przed podpisaniem umowy dostajesz radarowy przegląd terenu, czyli co obok wyrosło od zeszłej jesieni (Sentinel-1), czy grunt się ruszał w latach 2016–2020 [src:poznan-trend-detective/web/data/land/sar.json#egms.source] (EGMS) i, tam gdzie NISAR (NASA-ISRO) to zobaczył, jak grunt zareagował na jeden deszcz. *Deweloper ci tego nie powie. Radar tak.*¹

¹ [ZAŁOŻENIE: the name SARnik and the hook are working assumptions from the brief, because docs/grilling/ZALOZENIA.json does not exist. The sentence "a developer has no duty to disclose how the ground behaves after rain, and does not" goes on a slide or into the notes only after docs/fakty/FAKTY.md confirms it; zrodla.md lists the disclosure duty for groundwater or soil surveys under "Niepotwierdzone". The prospectus guide tells buyers to check planned investments within 1 km [url:https://pewnylokal.pl/porady/prospekt-informacyjny-dewelopera], so the pitch never says a developer hides building next door.]

---

## 2. The problem, with sources

- **A home is bought on photos and a prospectus.** The prospectus guide we read tells buyers to check "planned investments within 1 km" [url:https://pewnylokal.pl/porady/prospekt-informacyjny-dewelopera]. The same page says nothing about flood zones, groundwater or soil surveys. A developer is not asked by that guide to describe how the ground behaves after rain, and in practice that is not what a buyer receives. Whether the law requires it is unconfirmed in our sources, so we make no legal claim (footnote ¹).
- **It already happens.** In Olsztyn, eight families [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/] in new flats have fought water in gardens, car parks and basements for a year and a half [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/]. The developer's permit application had no rainwater system, and the city approved it [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/]. Olsztyn is outside our study area, it is a stormwater problem that radar does not see directly, and no radar caught it. It shows why a first look at the ground before signing matters.
- **Those applying to build lacked flood information too.** Poland's Supreme Audit Office (NIK), as reported on 17 Apr 2023 [url:https://www.prawo.pl/samorzad/zabudowa-terenow-zagrozonych-powodzia-ustalenia-nik,520841.html]: "Potential investors therefore did not have reliable information about flood risk at the site of the planned investment" (our translation). In Polish building law the "investor" is the party applying to build, not the home buyer. Our own reasoning, not the audit's finding: if those applying to build lacked it, buyers further down the chain are unlikely to be better informed.
- **No local case.** We found no documented flooded estate in Poznań or Wielkopolska (docs/pomysly-sar/zrodla.md lists it as not found), so we invent none.

What SARnik does about water today: the card's Water row uses the PIG-PIB groundwater-flood map and terrain hollows, and adds NISAR only as information (works today). Official ISOK flood zones are not in the app: branch `sarnik-zagrozenia`, no pull request (future direction).

---

## 3. Why radar and not a photo

A camera records colour in daylight under clear sky. Radar sends its own pulse, day or night, through cloud, and the echo depends on the shape of the surface and on water. Three mechanisms explain what the app shows (works today, drawn in the app window "How radar sees the ground", `EN.radarHtml` in poznan-trend-detective/web/i18n_sar.js):

| Mechanism | What causes it | How it looks |
|---|---|---|
| Mirror (specular) bounce | smooth water, fresh asphalt | the pulse goes away; dark |
| Double bounce | a wall and the ground form a corner | bright in co-pol (HH, VV) |
| Volume scattering | leaves, branches, crops twist the polarisation | bright in cross-pol (HV, VH) |

**L-band next to C-band.** NISAR's wave is 24 cm [src:poznan-trend-detective/web/data/land/sar.json#nisar.mission]; Sentinel-1's is 5.6 cm [src:poznan-trend-detective/web/data/land/sar.json#s1.mission]. The longer wave reaches branches and trunks; the shorter one scatters mostly in the upper crowns. Over Poznań, forest stands out from open land by 6.6 dB in NISAR HV (−10.16 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.HV] against −16.74 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.open.HV]) and by 2.8 dB in Sentinel-1 VH (−13.36 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.VH] against −16.16 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.open.VH]). This is consistent with L-band seeing deeper into the canopy, but these are descriptive medians with no test; the sensors were composited over different windows (NISAR to October [src:poznan-trend-detective/web/data/land/sar.json#nisar.dates], Sentinel-1 to November [src:poznan-trend-detective/web/data/land/sar.json#s1.dates]), with different incidence angles and no cross-calibration, and C-band open-land VH carries crop volume.

**What brightness alone cannot do.** In L-band HH, forest is about as bright as town: −4.67 dB [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.HH] against −4.49 dB [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.built.HH], because trunks and the ground form corners too. Buildings turned away from the satellite also brighten cross-pol: in Sentinel-1 VH, built-up land is −12.31 dB [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.built.VH], brighter than forest. So SARnik finds new buildings from **change over time plus the co/cross ratio**, not from brightness.

---

## 4. What the product shows

All of this works today on `main`, run locally (the public address still serves version 1).

- **Choose a place:** search an address (OpenStreetMap Nominatim), click, or draw an area; a point gets a 1 km circle [src:poznan-trend-detective/web/app.js#selection: a point (1 km circle)].
- **Plain check-up in the place card:** a header counts the rows at the levels "worth checking" and "warning", with the advice to ask the seller and the planning office before signing. Then one sentence per question, each with a source line: New building next door; What may be built next door; Water; Is the ground moving; Trees; Summer heat; Price. Rows from radar are grouped under "From SAR radar" with a radar mark; the rest under "Background from other sources (no radar)".
- **Where NISAR appears in the card:** only in the Water row, and only when the place is outside PIG-PIB groundwater-flood areas, not in a terrain hollow, and more than half its open land got wetter between the two passes (`plainChecks()` item 3 in web/app.js). Then the row is "information", never a warning. Elsewhere NISAR is on the map views and in expert mode.
- **Six map views:** Radar, New buildings, Water, Ground, Trees, History (`LENSES()` in web/app.js).
- **Expert mode:** every layer, dB chart, polarisation and statistical check, including the ones that did not hold.
- **Radar timeline:** the Radar view plays L-band from ALOS-2 2015–2021 [src:poznan-trend-detective/web/data/land/sar.json#alos.years] to NISAR 2026 [src:poznan-trend-detective/web/data/land/sar.json#nisar.dates]. Each sensor is stretched on its own scale.
- **One flag per risk, no overall score** in the plain card.² The expert "Technical details" section still shows a building-likelihood "NN / 100" (`riskHTML()` in web/app.js).

² [ZAŁOŻENIE: "separate flags, no single 0–100 score" is the working assumption from the brief. The team decides whether to keep the "NN / 100" building likelihood in "Technical details"; until then it stays out of every screenshot.]

---

## 5. Evidence table with statuses

| Claim | Status | Source |
|---|---|---|
| Search an address or draw an area; a point gets a 1 km circle | works today | `geocode()` and selection code [src:poznan-trend-detective/web/app.js#selection: a point (1 km circle)] |
| Plain check-up: header counts "worth checking" and "warning" rows; radar group first, background second; source line under each row | works today | web/app.js `plainHTML()`, `plainChecks()`; web/i18n_sar.js `en.plain` |
| Six map views plus expert mode | works today | web/app.js `LENSES()`; web/i18n_sar.js `en.lens` |
| Study area: Poznań plus 17 municipalities | works today | [src:poznan-trend-detective/web/data/study.json#areas] (18 entries) |
| Building change compares 12 Sentinel-1 passes from autumn 2026 with 12 from autumn 2025 [src:poznan-trend-detective/web/data/land/sar.json#checks.change_method], orbit 73 [src:poznan-trend-detective/web/data/land/sar.json#s1.orbit] | works today (the README row "Change since June" is out of date) | `sar.json` `checks.change_method` |
| 693 ha brightened by 3 dB or more (build_sar.py line 137) [src:poznan-trend-detective/web/data/land/sar.json#s1.up3db_ha]; 358 ha with the new-building signature (co-pol up, cross-pol not) [src:poznan-trend-detective/web/data/land/sar.json#s1.walls_ha] | works today (the signature also catches cleared sites, topsoil stripping and river-bank water changes; precision against orthophotos not yet checked) | rule in poznan-trend-detective/pipeline/build_sar.py lines 137–138: VV up ≥ 3 dB and VV/VH ratio up ≥ 1.5 dB [src:poznan-trend-detective/web/data/land/sar.json#s1.wall_db] |
| On the 5% [src:poznan-trend-detective/web/data/land/sar.json#checks.model.what] of not-yet-built cells the projection ranks highest, the new-building signature is 4.3× as common [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.ratio] as on the other 95%: 0.44% [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.share_a] vs 0.10% [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.share_b], 77 hits [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.hits] among 17,557 cells [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.cells] | works today (**direction, not skill**: "not yet built" means the model's projected 2025 map and includes forest and water; the ranking leans on "built in cell" (coefficient 2.281 [src:poznan-trend-detective/web/data/land/land.json#model.coefficients_standardised]), so part of 4.3× may be "new buildings appear next to old ones"; no naive-rule baseline ratio yet; p optimistic) | [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls] |
| Same comparison for any VV rise of 3 dB or more [src:poznan-trend-detective/web/data/land/sar.json#checks.model.what]: 2.13× [src:poznan-trend-detective/web/data/land/sar.json#checks.model.ratio] (0.56% [src:poznan-trend-detective/web/data/land/sar.json#checks.model.share_a] vs 0.26% [src:poznan-trend-detective/web/data/land/sar.json#checks.model.share_b], 99 hits [src:poznan-trend-detective/web/data/land/sar.json#checks.model.hits]) | works today (same caveats) | [src:poznan-trend-detective/web/data/land/sar.json#checks.model] |
| Plots with a "new building" decision dated Jun–Aug 2026, city of Poznań: any VV rise of 3 dB or more [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.what] is 4.46× as common [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.ratio], 12 hits [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.hits] among 766 cells [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.cells] | works today (**notes and Q&A only**: any change, not buildings; small count; register categories are noisy [src:docs/planwyd.md#Fakty ustalone 14.11]) | [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia] |
| Same decision plots, new-building signature only: 1.63× [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia_walls.ratio], 3 hits [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia_walls.hits], p = 0.2811 [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia_walls.p] | works today (**not significant: never quote as evidence**) | [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia_walls] |
| A June-versus-autumn comparison would flag 3.13% of all not-yet-built cells [src:poznan-trend-detective/web/data/land/sar.json#checks.season_change_open_up3db_share] | works today (the year-on-year share is stored only for the top-5% and bottom-95% groups, not for all cells) | build_sar.py line 189 |
| Projection, open land, tested on 2015–2020 [src:poznan-trend-detective/web/data/land/land.json#model.tested_on]: AUC 0.986 [src:poznan-trend-detective/web/data/land/land.json#model.open_land_auc] against 0.901 for a naive rule [src:poznan-trend-detective/web/data/land/land.json#model.open_land_baseline_auc], on 76 conversions [src:poznan-trend-detective/web/data/land/land.json#model.open_land_conversions]; its top picks hit 1.3% [src:poznan-trend-detective/web/data/land/land.json#model.open_land_hit_rate] | works today (ranks open land better than the naive rule; cannot name the field) | [src:poznan-trend-detective/web/data/land/land.json#model] |
| Overall AUC 0.987 [src:poznan-trend-detective/web/data/land/land.json#model.auc_2015_2020] and top-N hit rate 56.4% [src:poznan-trend-detective/web/data/land/land.json#model.top_n_hit_rate] on 5,379 conversions [src:poznan-trend-detective/web/data/land/land.json#model.conversions_2015_2020] | works today (**inflated**: the candidate set is every cell below the built threshold, mostly cells already partly built; keep both off slides) | pipeline/model_urban.py |
| NISAR GCOV HH+HV, track 158 [src:poznan-trend-detective/web/data/land/sar.json#nisar.track], provisional release [src:poznan-trend-detective/web/data/land/sar.json#nisar.version], 9 passes 25 Jun–11 Oct 2026 [src:poznan-trend-detective/web/data/land/sar.json#nisar.dates], 20 m pixels [src:poznan-trend-detective/README.md#What the app computes] averaged to the app's cells | works today | `sar.json` `nisar` |
| NISAR also passed over Poznań on track 158 from 28 Oct 2025 [src:progres/p1/dane/nisar_poznan_przeloty.csv#2025-10-28.wersja] to 20 Jan 2026 [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-01-20.wersja], as a beta release | not used (we never mix NISAR releases) | NISAR pass list |
| NISAR dry 25 Jun [src:poznan-trend-detective/web/data/land/sar.json#nisar.dry] vs wet 24 Aug [src:poznan-trend-detective/web/data/land/sar.json#nisar.wet]: HH up 2 dB or more [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.what] on 37% of open land [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.share_study]; median +1.39 dB [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.median_db_open] | works today (**one pair, no dry–dry baseline**; rain, crop growth, harvest and stubble tillage all brighten HH; the 19 Jul counterexample below weakens the rain reading) | [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry] |
| Study-area HH series: −5.81 dB on dry 25 Jun, −5.58 dB on wet 19 Jul, −4.83 dB on 24 Aug, −4.72 dB on 17 Sep [src:poznan-trend-detective/web/data/land/sar.json#nisar.aoi_hh_db]; soil moisture 0.293 on 19 Jul [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-07-19.wilgotnosc_gleby_m3m3] and 0.272 on 17 Sep [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-09-17.wilgotnosc_gleby_m3m3] | works today (whole-area means; the pattern looks seasonal as much as wet) | `sar.json` `nisar.aoi_hh_db`; pass list |
| NISAR wetting inside PIG-PIB groundwater-flood areas: 18.5% [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.share_flood] vs 37.7% outside [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.share_outside], ratio 0.49 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.ratio] | works today (**not higher inside**: one-sided test for "higher" gives p = 1.0 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.p]; the reverse was not tested; the cell count inside flood areas is not stored) | build_sar.py line 257 |
| The card shows NISAR wetting as "information" only, and only where there is no flood area and no hollow | works today | web/app.js `plainChecks()` item 3 |
| Sentinel-1 VV follows NASA POWER soil wetness on 26% of open land [src:poznan-trend-detective/web/data/land/sar.json#checks.wet.share_sig_study]; median r 0.24 [src:poznan-trend-detective/web/data/land/sar.json#checks.wet.median_r_open] below r_crit 0.388 [src:poznan-trend-detective/web/data/land/sar.json#checks.wet.r_crit]; flood areas 27.1% [src:poznan-trend-detective/web/data/land/sar.json#checks.wet.share_sig_flood] vs 26.0% [src:poznan-trend-detective/web/data/land/sar.json#checks.wet.share_sig_outside], p = 0.0859 [src:poznan-trend-detective/web/data/land/sar.json#checks.wet.p_flood_higher] | works today (**weak context**: VV and soil wetness share an autumn trend, and POWER is one regional series, not per plot) | [src:poznan-trend-detective/web/data/land/sar.json#checks.wet] |
| Forest minus open land: 6.6 dB in NISAR HV, 2.8 dB in Sentinel-1 VH [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands] | works today (descriptive medians, no test, sensors not cross-calibrated) | [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands] |
| In NISAR HH, forest (−4.67 dB) is about as bright as built land (−4.49 dB) [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands] | works today (shown in the window's table) | same |
| "How radar sees the ground": three mechanisms and polarisations | works today | web/i18n_sar.js `EN.radarHtml` |
| Sentences in that window: "goes through leaves to ... soil", "every 12 days since June 2026" (line 61), "This is where NISAR's L-band has the edge" (line 66), "Residents can be warned about waterlogged ground" (line 72) | needs team decision (contradicted by our own checks or by the pass list: fix the text or crop it out) | poznan-trend-detective/web/i18n_sar.js |
| Plain finding "NASA's new satellite sees where the ground soaks up rain" (`fe.lband`) and the "permit" ratio in `fe.radar`; Water legend "soaks up a lot" / "dries out" | needs team decision (overclaims; keep out of frames or fix) | web/i18n_sar.js lines 418, 425, 442, 447 |
| ALOS-2 L-band 2015–2021 and Play to NISAR 2026 | works today (each sensor stretched separately; NISAR is about 3 dB brighter than ALOS-2 [src:poznan-trend-detective/README.md#Limits we state openly]; no L-band data 2022–2025) | `sar.json` `alos`; README |
| NISAR GCOV browse imagery via NASA GIBS (expert layer), stepping through 38 dates [src:poznan-trend-detective/web/data/land/land.json#nisar_dates] | works today (**visual quicklook only**: mixes tracks and the validated release from 23 Oct [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-10-23.wersja]; feeds no number) | `land.json` `nisar_dates` |
| EGMS 2016–2020: 24.2% of the study area measured [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.share_of_study]; median 0 mm/yr [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.median]; 147 cells at −5 mm/yr or faster [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.cells_le_minus5] | works today (Sentinel-1 InSAR, the EGMS release served by PIG-PIB, not NISAR) | [src:poznan-trend-detective/web/data/land/sar.json#checks.egms] |
| "Building permits (WUIA)" layer: 2,420 permits and applications, Jun–Nov 2026, city of Poznań only [src:poznan-trend-detective/web/i18n_sar.js#en.ui.Lsub.wuia] | works today (expert layer; WUIA is the Poznań city planning register) | web/data/wuia_decyzje.geojson |
| "What is being built here" row with building type | in an open pull request (#11, `sarnik-wuia`; inactive until the module core is merged) | `gh pr list` |
| Module rows in the card (core) | future direction (branch `sarnik-rdzen`, no pull request) | `gh pr list` |
| ISOK flood zone for a point; SOPO landslides | future direction (branch `sarnik-zagrozenia`, no pull request) | `gh pr list` |
| "About the project" page | future direction (no branch, no pull request) | docs/planwyd.md "Stan funkcji" |
| Building-likelihood "NN / 100" in "Technical details" | works today; needs team decision whether to show it | web/app.js `riskHTML()` |
| Separate flags per risk, no single overall score | needs team decision (working assumption; the plain card already counts flags only) | brief; web/app.js `plainHTML()` |
| Name SARnik and the hook | needs team decision (working assumption) | brief |
| A developer has no legal duty to disclose wet ground or groundwater | needs team decision (unconfirmed until docs/fakty/FAKTY.md) | docs/pomysly-sar/zrodla.md "Niepotwierdzone" |
| Prospectus guide: check planned investments within 1 km; silent on flood zones, groundwater, soil surveys | verified source | [url:https://pewnylokal.pl/porady/prospekt-informacyjny-dewelopera] |
| Olsztyn: 8 families, 1.5 years, no rainwater system in the permit application, permit granted | verified source | [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/] |
| NIK (2023): those applying to build lacked reliable flood-risk information at the site | verified source (the page gives no audit number) | [url:https://www.prawo.pl/samorzad/zabudowa-terenow-zagrozonych-powodzia-ustalenia-nik,520841.html] |
| NISAR interferometric motion (GUNW/RSLC) over vegetated ground; wetland cycles; L-band year-on-year change; any city NISAR covers | future direction | docs/pitch.md 5.2 |
| Subsidence from NISAR, single buildings, basements, groundwater level | never claimed | README "Limits we state openly"; docs/pitch.md section 6 |

---

## 6. Seven slides with speaker notes

The demo limit is a video of at most 30 s or at most 7 slides [src:docs/planwyd.md#Fakty ustalone 14.11].³ The deck is exactly these seven slides: **no separate title, agenda or thank-you slide**. Source tags are not shown on slides; each slide carries a short source footer where it quotes someone. Every slide line is "works today" unless it carries a footnote.

³ [ZAŁOŻENIE: docs/planwyd.md lists the demo format as a settled fact, but docs/pomysly-sar/zrodla.md still lists it under "Niepotwierdzone" because the official guides could not be downloaded. The team checks the official Space Apps guide and chooses video or slides as the judged demo.]

### Slide 1. Nice photos, no check-up
**On the slide:**
> Used car: an inspection. New home: nice photos.
> Buyers rarely get a plain check-up of the ground.
> **The developer won't tell you. The radar will.**¹
>
> *Footer:* SARnik · SpaceWalkers · NASA Space Apps 2026 [src:materials/challenge_dancing_with_the_sars.md#title]: Dancing with the SARs

**Visual:**
- Left: the team's own photo of a new estate, with no people, no logos and no listing-site branding.
- Right: a screenshot from `main`, in English, expert mode off: the place card with the header "N things to check" and the groups "From SAR radar" and "Background from other sources (no radar)".
- [ZAŁOŻENIE: the team picks an address whose flag comes from "New building next door" (Sentinel-1) or "Is the ground moving" (EGMS), not from the projection row "What may be built next door", and checks it on `main` run locally.]

**Speaker notes:** When you buy a used car, you get an inspection. When you buy a flat or a plot, often the biggest purchase of your life, you get nice photos and a prospectus. The prospectus covers planned investments within 1 km [url:https://pewnylokal.pl/porady/prospekt-informacyjny-dewelopera]. What buyers rarely get is a plain check-up of the ground itself: what changed nearby this year, how it took rain, whether it moved. We built that check-up from radar.

### Slide 2. It already happens
**On the slide:**
> Olsztyn 2026: 8 families [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/] in new flats, 1.5 years [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/] fighting water.
>
> *Footer:* Source: Polsat News, 29 Jul 2026.

**Visual:** a quote-led text slide on a plain background. No app screen, no radar overlay: Olsztyn is outside our study area and this is an example of the problem, not a case our radar caught.

**Speaker notes:** In Olsztyn, eight families bought new flats and have spent a year and a half fighting water in gardens, car parks and basements [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/]. The permit application had no rainwater system, and the city approved it. In 2023 Poland's Supreme Audit Office reported that those applying to build "did not have reliable information about flood risk at the site" [url:https://www.prawo.pl/samorzad/zabudowa-terenow-zagrozonych-powodzia-ustalenia-nik,520841.html]. If they lacked it, buyers are unlikely to have it. Olsztyn is outside our area and no radar proved this case; SARnik today shows the official groundwater-flood map and terrain hollows for any address.

### Slide 3. One address, one check-up
**On the slide:**
> Type an address. Get a radar check-up. One flag per risk.²

**Visual:**
- A full app screen from `main`, in English, run locally.
- An address selected with its 1 km circle [src:poznan-trend-detective/web/app.js#selection: a point (1 km circle)].
- The card open on the plain check-up (New building next door, What may be built next door, Water, Is the ground moving, Trees, Summer heat, Price); "Technical details" closed.
- The map-view buttons Radar, New buildings, Water, Ground, Trees and History visible.

**Speaker notes:** This is SARnik, and it works today, in Poznań and 17 municipalities around it [src:poznan-trend-detective/web/data/study.json#areas]. Type an address or draw your plot. The card answers plain questions, one sentence each, with the source under every line. Sentinel-1 and EGMS radar answers come first; NISAR appears where it saw the ground respond to rain; other maps follow. The header counts what deserves a question to the seller and the planning office. Each risk keeps its own flag. Expert mode shows every layer and check.

### Slide 4. What radar sees that a photo cannot
**On the slide:**
> Forest vs open land: L-band HV 6.6 dB apart [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.HV] [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.open.HV], C-band VH 2.8 dB [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.VH] [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.open.VH].

**Visual:**
- The window "How radar sees the ground", **cropped to the three drawings** ("Smooth: mirror bounce", "Corner: double bounce", "Canopy: volume scattering") **and the table** "L-band next to C-band over Poznań (medians, dB)". Everything else in the window is cropped out (see the team checks: lines 61, 66 and 72 of web/i18n_sar.js overclaim).
- Second frame: the Radar view with Play running from ALOS-2 2015 [src:poznan-trend-detective/web/data/land/sar.json#alos.years] to NISAR 2026 [src:poznan-trend-detective/web/data/land/sar.json#nisar.dates] over the forest south of Poznań, with the caption "each sensor on its own scale; compare patterns, not brightness; no L-band data 2022–2025" [src:poznan-trend-detective/web/data/land/sar.json#alos.years].
- [ZAŁOŻENIE: the team checks on `main` that the forest contrast is visible at that place.]

**Speaker notes:** A camera records colour. Radar sends its own pulse, day or night, through cloud. Smooth water reflects it away; a wall and the ground make a corner that brightens HH and VV; leaves twist the polarisation into HV and VH. NISAR's 24 cm [src:poznan-trend-detective/web/data/land/sar.json#nisar.mission] wave reaches branches; Sentinel-1's 5.6 cm [src:poznan-trend-detective/web/data/land/sar.json#s1.mission] wave scatters mostly in the upper crowns. Consistent with this, forest stands out more in L-band. But in L-band HH, forest is as bright as town, so we find buildings by change, not brightness. These are medians, each sensor against itself, no test. The timeline changes sensor in 2026; that step is not land change.

### Slide 5. After one rain, NISAR's echo rose
**On the slide:**
> Dry 25 Jun [src:poznan-trend-detective/web/data/land/sar.json#nisar.dry] → wet 24 Aug [src:poznan-trend-detective/web/data/land/sar.json#nisar.wet]: NISAR HH rose 2 dB+ [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.what] on 37% of open land [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.share_study].
> Rain, harvest and ploughing all brighten HH. A hint, not a flood map.

**Visual:**
- The Water view on `main` over the whole study area, **with the layer title and legend cropped out** unless the team has renamed them (see the team checks), and with the findings card minimised.
- Then the card row "Water" at the level "information" with the source line "NISAR radar, 25 June and 24 August 2026".
- [ZAŁOŻENIE: pick a place where the Water row shows the NISAR sentence, which means no flood area and no hollow there.]
- Do not use the quicklook JPGs in web/data/nisar/: the app on `main` does not show them.

**Speaker notes:** This is NASA-ISRO NISAR. At our reference point (Open-Meteo), no rain fell in the three days before 25 June [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-06-25.deszcz_3dni_mm]; 23.5 mm [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-08-24.deszcz_3dni_mm] fell before 24 August. Water raises the soil's dielectric constant, which can brighten HH: the median rise was 1.39 dB [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.median_db_open] on open land. But on 19 July the soil was almost as wet [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-07-19.wilgotnosc_gleby_m3m3] and HH barely moved [src:poznan-trend-detective/web/data/land/sar.json#nisar.aoi_hh_db]. Harvest and stubble tillage roughen the soil too. One pair, no dry–dry baseline: a hint, shown as information, never a warning.

### Slide 6. Is something going up next door?
**On the slide:**
> Where our projection expected building, Sentinel-1 saw a new-building signature 4.3× as often [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.ratio] as on other not-yet-built land.

**Visual:**
- **Frame 1:** click the finding "The projection holds up". The app switches to History, turns on "What changed in the last year", sets the timeline to 2030 and zooms on Poznań [src:poznan-trend-detective/web/app.js#SAR_FINDINGS.modelRadar]. Red change cells sit on the projected cells. Then **minimise the findings card** before the frame is taken: its "Where new buildings went up" text prints the 4.5× "permit" ratio (`fe.radar`, web/i18n_sar.js line 447).
- **Frame 2:** the New buildings view over one city district.
- Take both frames **with no place selected**, so the "NN / 100" in "Technical details" stays hidden.
- [ZAŁOŻENIE: the team picks the district after looking at the map.]

**Speaker notes:** Two witnesses on screen. First, our projection from Landsat-based built-up maps, trained on 2005–2015 [src:poznan-trend-detective/web/data/land/land.json#model.trained_on] and tested on 2015–2020 [src:poznan-trend-detective/web/data/land/land.json#model.tested_on]; on open land it ranks better than a naive rule, but its top picks hit only 1.3% [src:poznan-trend-detective/web/data/land/land.json#model.open_land_hit_rate]. Second, Sentinel-1, autumn 2026 against autumn 2025 [src:poznan-trend-detective/web/data/land/sar.json#checks.change_method]. In the projection's top 5% [src:poznan-trend-detective/web/data/land/sar.json#checks.model.what], the signature appeared on 77 [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.hits] of 17,557 cells [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.cells]. It also catches cleared sites and earthworks, and partly reflects building next to existing estates: direction, not skill. NISAR's autumn 2025 passes are beta; we do not mix releases.

**Notes only (not on the slide):** plots with a "new building" decision in the city register changed more often, 12 [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.hits] of 766 cells [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.cells]; that is any change, not buildings, register categories are noisy [src:docs/planwyd.md#Fakty ustalone 14.11], and the signature-only version is not significant (p = 0.2811 [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia_walls.p]).

### Slide 7. What we don't promise, and what NISAR makes possible next
**On the slide:**
> Not measured: subsidence from NISAR, single houses, basements, groundwater.
> Next⁴: NISAR interferometry and L-band year-on-year change.
> Open data: NASA-ISRO NISAR, NASA POWER and MODIS, ESA Sentinel-1, Copernicus EGMS, JAXA ALOS-2. AI-assisted.

**Visual:**
- The Ground view (EGMS 2016–2020 [src:poznan-trend-detective/web/data/land/sar.json#egms.source]) over Poznań, with the card row "Is the ground moving" for one address.
- Footer: QR codes for the public repository and the demo.
- [ZAŁOŻENIE: the demo QR points to a deployment of `main`; only the Firebase owner deploys. If that cannot happen in time, point it to the v3 preview from the README and say it predates the merge. Never present the v1 address as the app.]

**Speaker notes:** We say our limits out loud. Our cells are about 73 m [src:poznan-trend-detective/web/data/land/land.json#cell_m_ground] on the ground: estates and streets, not single homes. We used NISAR's backscatter product, GCOV, which carries no phase, so it cannot measure motion at all. Ground motion comes from EGMS 2016–2020, which covers 24.2% [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.share_of_study] of the area. Next, NISAR's interferometric products and years of passes could measure motion where vegetation defeats C-band, and L-band change should give fewer seasonal false alarms. Both are hypotheses to test.

⁴ Future direction; none of it is in the app. Also left off the slides: the ISOK flood-zone and SOPO landslide rows (branch `sarnik-zagrozenia`, no pull request) and the "what is being built here" row with building type (open pull request #11, inactive until the module core is merged).

---

## 7. Video script (30 s; voice-over 57 words, speech ends by 28 s)

| Time | Voice-over | On-screen caption | What the app shows |
|---|---|---|---|
| 0–4 s | "Your biggest purchase, made on nice photos." | Nice photos. What about the ground? | The team's own photo of a new estate (no people, no logos), cut to the SARnik map of Poznań |
| 4–10 s | "In Olsztyn, eight families fought water in new flats for eighteen months." | Olsztyn 2026: 8 families, 1.5 years of water [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/] · Polsat News | Text card on a plain background; no app screen (Olsztyn is outside the study area) |
| 10–15 s | "SARnik gives any address near Poznań a radar check-up." | Type an address. Get a check-up. | Address typed, 1 km circle [src:poznan-trend-detective/web/app.js#selection: a point (1 km circle)] appears, card opens with "N things to check" |
| 15–20 s | "Sentinel-1 shows what went up nearby since last autumn." | Sentinel-1: autumn 2025 → autumn 2026 [src:poznan-trend-detective/web/data/land/sar.json#checks.change_method] | New buildings view; card row "New building next door"; findings card minimised |
| 20–25 s | "NISAR's L-band echo rose after one rain: a hint, not a flood map." | NASA-ISRO NISAR L-band: dry 25 Jun [src:poznan-trend-detective/web/data/land/sar.json#nisar.dry] → wet 24 Aug [src:poznan-trend-detective/web/data/land/sar.json#nisar.wet] | Water view, layer title and legend cropped unless renamed |
| 25–28 s | "The developer won't tell you. The radar will."¹ | | Radar view, Play from ALOS-2 2015 [src:poznan-trend-detective/web/data/land/sar.json#alos.years] to NISAR 2026 [src:poznan-trend-detective/web/data/land/sar.json#nisar.dates], caption "each sensor on its own scale" |
| 28–30 s | (silence) | SARnik · SpaceWalkers · NASA Space Apps 2026 [src:materials/challenge_dancing_with_the_sars.md#title] | End slate, inside the 30 s |

**Recording notes:**
- Record on `main`, run locally, in English, widescreen, "Technical details" closed, findings card minimised.
- "NASA-ISRO" stays in the caption only, to keep the 20–25 s line speakable.
- The NISAR line avoids the word "flood" as a claim; the building line names Sentinel-1.
- Time the final export: it must be 30.0 s or less.
- The voice-over is a team member's voice. [ZAŁOŻENIE: the team confirms that no image in the video or slides is AI-generated, or watermarks any that are, per docs/BURZA_MOZGOW.md section 11.]

---

## 8. Space Apps project page (English)

### Summary
SARnik is a free web app that gives anyone buying a flat, house or plot around Poznań, Poland, a radar check-up of the land before they sign. Search an address or draw a plot in Poznań and 17 municipalities around it [src:poznan-trend-detective/web/data/study.json#areas]. The card says in plain sentences whether Sentinel-1 radar saw new building nearby since last autumn, whether EGMS measured the ground moving, and, where NASA-ISRO NISAR saw it, how the ground responded to one rain. Each answer names its source and keeps its own flag. Expert mode shows the layers, polarisations and checks behind every sentence, including those that did not hold.

### Detailed description

**The problem.** A home is often the biggest purchase of a lifetime, yet buyers decide on photos and a prospectus. The prospectus guide we read tells buyers to check planned investments within 1 km [url:https://pewnylokal.pl/porady/prospekt-informacyjny-dewelopera] and says nothing about how the ground behaves after rain or whether it moves. In 2023 Poland's Supreme Audit Office reported that those applying to build "did not have reliable information about flood risk at the site of the planned investment" [url:https://www.prawo.pl/samorzad/zabudowa-terenow-zagrozonych-powodzia-ustalenia-nik,520841.html] (our translation; "investors" in Polish law are those applying to build). In Olsztyn in 2026, eight families [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/] in new flats had been fighting water for a year and a half [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/]. SARnik is a first look at the ground before you sign, from radar that works day and night and through cloud.

**What SARnik shows.** Choose a place by address, by click or by drawing an area. The place card opens with a plain check-up: a header that counts the things to check, with the advice "Ask the seller and the planning office about this before you sign", then one sentence per question with its source line: New building next door; What may be built next door; Water; Is the ground moving; Trees; Summer heat; Price. Radar answers are grouped first and marked; background from other sources follows. NISAR enters the Water row as information where it saw open land get wetter and there is no official flood area or hollow. Map views turn one question into a map: Radar, New buildings, Water, Ground, Trees, History. Expert mode brings back every layer, dB chart, polarisation and statistical test.

**What the radar computes.**
- **NISAR L-band 2026:** GCOV HH and HV, track 158 [src:poznan-trend-detective/web/data/land/sar.json#nisar.track], provisional release [src:poznan-trend-detective/web/data/land/sar.json#nisar.version], 9 passes from 25 Jun to 11 Oct 2026 [src:poznan-trend-detective/web/data/land/sar.json#nisar.dates], 20 m pixels [src:poznan-trend-detective/README.md#What the app computes]. Only the Poznań window is read from each HDF5 file, and power is averaged before conversion to dB. Wet minus dry: HH on 24 Aug minus HH on 25 Jun, on open land.
- **Sentinel-1 C-band:** 27 passes from June to November 2026 [src:poznan-trend-detective/web/data/land/sar.json#s1.dates] on orbit 73 [src:poznan-trend-detective/web/data/land/sar.json#s1.orbit]. Change compares autumn 2026 with autumn 2025 [src:poznan-trend-detective/web/data/land/sar.json#checks.change_method]. A cell has the new-building signature when VV rises by 3 dB or more (poznan-trend-detective/pipeline/build_sar.py lines 137–138) and the VV/VH ratio rises by 1.5 dB or more [src:poznan-trend-detective/web/data/land/sar.json#s1.wall_db]; the same rule also catches cleared sites and earthworks. "Water seen by radar": share of passes darker than −17 dB [src:poznan-trend-detective/web/data/land/sar.json#s1.water_db].
- **ALOS-2 L-band yearly mosaics 2015–2021** [src:poznan-trend-detective/web/data/land/sar.json#alos.years]: the Radar view plays an L-band timeline to NISAR 2026, each sensor on its own scale.
- **EGMS ground motion 2016–2020** [src:poznan-trend-detective/web/data/land/sar.json#egms.source]: Sentinel-1 interferometry, the release served by PIG-PIB.
- **A land-change projection:** logistic regression on Landsat-based GHSL built-up maps, trained on 2005–2015 [src:poznan-trend-detective/web/data/land/land.json#model.trained_on] and tested on 2015–2020 [src:poznan-trend-detective/web/data/land/land.json#model.tested_on].

**Does the signal mean what we say?** The pipeline writes its own checks to `sar.json` and `land.json`, and we report all of them.
- **Clear direction:** on the 5% [src:poznan-trend-detective/web/data/land/sar.json#checks.model.what] of not-yet-built cells the projection ranks highest, Sentinel-1 saw the new-building signature 4.3× as often [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.ratio] as on the other 95% (77 [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.hits] of 17,557 cells [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.cells]). "Not yet built" is the model's 2025 map; the ranking leans on existing building in the cell, so this is direction, not proven forecasting skill. We have not yet compared it with the same ratio for a naive ranking.
- **Projection, open land:** AUC 0.986 against 0.901 for a naive rule [src:poznan-trend-detective/web/data/land/land.json#model.open_land_auc] [src:poznan-trend-detective/web/data/land/land.json#model.open_land_baseline_auc], on only 76 conversions [src:poznan-trend-detective/web/data/land/land.json#model.open_land_conversions]; its top picks hit 1.3% [src:poznan-trend-detective/web/data/land/land.json#model.open_land_hit_rate]. It ranks fields; it cannot name the field. The overall figures that include partly built cells are inflated, and we do not quote them.
- **Small:** plots with a "new building" decision changed more often, 12 of 766 cells [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.hits] [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.cells]; that is any change, and the signature-only version is not significant [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia_walls.p].
- **Unexpected:** NISAR wetting was not higher inside groundwater-flood areas: 18.5% inside against 37.7% outside [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry]; the one-sided test for "higher" gives p = 1.0 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.p], and we did not test the reverse. The Sentinel-1 version shows no clear difference (p = 0.0859 [src:poznan-trend-detective/web/data/land/sar.json#checks.wet.p_flood_higher]). That is why the card never turns radar wetting into a warning.
- The p values are one-sided binomial tests on neighbouring cells, which are not independent, so they are optimistic.

**How it is built.**
- A Python pipeline (`poznan-trend-detective/pipeline/`) writes PNG layers and JSON statistics to one grid of 120 m cells [src:docs/planwyd.md#Fakty ustalone 14.11] in Web Mercator, about 73 m on the ground [src:poznan-trend-detective/web/data/land/land.json#cell_m_ground].
- A static web app (Leaflet) reads them, in Polish and English. Run it locally with `cd poznan-trend-detective/web && python3 -m http.server 8000`.
- Code: https://github.com/MichallMaciek/NASA-SpaceWalkers [ZAŁOŻENIE: the team adds a LICENSE file (for example MIT) and names the licence here; the repository has none today.]
- Demo: [ZAŁOŻENIE: the link to a deployment of `main`; the public address still serves version 1.]

### How SARnik answers the challenge's questions

**Study area and personal context.** We live in Poznań, and our city is spreading into the fields and the Warta valley around it. Our area is Poznań plus 17 municipalities [src:poznan-trend-detective/web/data/study.json#areas]. Between 2000 and 2024, Poznań's population changed by −7.9% [src:poznan-trend-detective/web/data/study.json#areas.Poznań.pop_change_pct_2000_2024], while Dopiewo grew by 242% [src:poznan-trend-detective/web/data/study.json#areas.Dopiewo.pop_change_pct_2000_2024] and Komorniki by 217.5% [src:poznan-trend-detective/web/data/study.json#areas.Komorniki.pop_change_pct_2000_2024]. Our friends and families buy homes on exactly that edge, where yesterday's field is today's estate.

**Which polarisations show the changes.** Medians over Poznań, each sensor compared only with itself:

| Land cover | NISAR HH | NISAR HV | Sentinel-1 VV | Sentinel-1 VH |
|---|---|---|---|---|
| Built-up | −4.49 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.built.HH] | −11.13 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.built.HV] | −5.88 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.built.VV] | −12.31 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.built.VH] |
| Forest | −4.67 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.HH] | −10.16 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.HV] | −8.19 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.VV] | −13.36 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.forest.VH] |
| Open land | −9.9 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.open.HH] | −16.74 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.open.HV] | −9.93 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.open.VV] | −16.16 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands.open.VH] |

- **Co-pol (HH, VV)** separates built-up from open land in both sensors. In L-band HH, forest is almost as bright as built land, because trunks and the ground form corners too.
- **Cross-pol (HV, VH)** carries vegetation: forest stands out from open land by 6.6 dB in L-band HV and 2.8 dB in C-band VH [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.bands]. Buildings turned away from the satellite also brighten cross-pol.
- **New buildings** are therefore found from the co-pol rise over a year together with the co/cross ratio (VV/VH up by 1.5 dB or more [src:poznan-trend-detective/web/data/land/sar.json#s1.wall_db]), not from brightness alone.
- **The wet–dry change** is read in NISAR HH.

**Physical drivers.**
- **Double bounce:** a wall and the ground form a corner reflector, so new buildings brighten co-pol.
- **Dielectric constant:** water raises it, which can brighten HH and VV. We propose it as one driver of the NISAR rise after 23.5 mm of rain [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-08-24.deszcz_3dni_mm], but our own series argues for caution: on 19 July the soil was almost as wet (0.293 [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-07-19.wilgotnosc_gleby_m3m3] against 0.302 [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-08-24.wilgotnosc_gleby_m3m3]) yet study-area HH was −5.58 dB against −4.83 dB on 24 Aug, and the highest HH, −4.72 dB, came on 17 Sep [src:poznan-trend-detective/web/data/land/sar.json#nisar.aoi_hh_db] with drier soil (0.272 [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-09-17.wilgotnosc_gleby_m3m3]).
- **Surface roughness:** harvest and stubble tillage leave rough bare soil, which brightens L-band HH. This seasonal effect may explain much of the late-summer rise.
- **Volume scattering:** leaves and branches turn the polarisation, so forests and crops show in cross-pol. The longer L-band wave (24 cm [src:poznan-trend-detective/web/data/land/sar.json#nisar.mission] against 5.6 cm [src:poznan-trend-detective/web/data/land/sar.json#s1.mission]) reaches branches and trunks.
- **Specular reflection:** smooth water and new asphalt send the pulse away and look dark.
- **Farming seasons:** after harvest VH drops; after ploughing and autumn rain VV rises. That is why we compare autumn with autumn for building change.

**What cannot be seen, and why.**
- **Subsidence from NISAR:** we used NISAR's backscatter product (GCOV), which carries no phase. Measuring motion needs NISAR's interferometric products and years of passes, so ground motion comes from EGMS 2016–2020, which covers 24.2% of the area [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.share_of_study].
- **Single houses:** pixels are 10–20 m [src:poznan-trend-detective/README.md#Limits we state openly] and our cells about 73 m on the ground [src:poznan-trend-detective/web/data/land/land.json#cell_m_ground].
- **Basements and groundwater:** radar senses moisture near the surface only.
- **Soil under buildings and forest:** wetness checks run on open land only.
- **Building type or material:** that needs full polarimetry and 1–3 m resolution [src:docs/pitch.md#5.2].
- **The period without passes:** there is a NISAR data gap from 27 Jul to 10 Aug 2026 [src:docs/pitch.md#7].
- **Rain against tillage in one pair:** a single dry–wet pair cannot separate soil moisture from crop and roughness change, and we have no dry–dry baseline yet.
- **Something we expected but did not see:** stronger wetting inside official groundwater-flood areas. It was not higher there (18.5% vs 37.7% [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry]). Our untested guess is that those areas were already moist in June or are overgrown.
- **River banks:** along the Warta a change in water level can mimic the new-building signature on an exposed bank.

**Future applications of NISAR** (all future direction, each a hypothesis to test):
- L-band interferometry (NISAR GUNW/RSLC) of ground motion where vegetation defeats C-band, after 2–3 years of data [src:docs/pitch.md#5.2], including seasonal swelling of Poznań's clays.
- Year-on-year building change in L-band, which is less sensitive to crop and leaf state than C-band, so it should give fewer seasonal false alarms, once a second autumn exists in one NISAR release.
- Full wetland cycles through the Warta's spring high water.
- A dry–dry, wet–dry and seasonal series from a full NISAR year to separate rain from tillage.
- The same check-up for any city NISAR covers: the radar method does not depend on Poznań, only the local maps do.

### NASA data used
- **NISAR L2 GCOV**, NASA-ISRO, provisional release, track 158 ascending, HH and HV, 9 passes from 25 Jun to 11 Oct 2026 [src:poznan-trend-detective/web/data/land/sar.json#nisar]. Obtained from the ASF DAAC with `earthaccess`. Every number uses this one track and one release.
- **NISAR GCOV browse imagery** via NASA GIBS: an expert-mode visual quicklook across tracks and releases; it feeds no number.
- **NASA POWER GWETTOP** surface soil wetness on each Sentinel-1 pass day [src:poznan-trend-detective/web/data/land/sar.json#checks.wet.driver].
- **NASA MODIS** land surface temperature and NDVI, 2000–2024 [src:poznan-trend-detective/web/i18n_sar.js#en.plain.heatSrc] (LP DAAC, via Microsoft Planetary Computer).
- **Landsat**, through JRC GHSL built-up maps and Hansen/UMD Global Forest Change.

### Partner and other data
- **Copernicus Sentinel-1 RTC** (ESA, via Microsoft Planetary Computer).
- **EGMS** (Copernicus Land Monitoring Service, via PIG-PIB).
- **JAXA ALOS-2 PALSAR-2** yearly mosaics.
- **Copernicus DEM GLO-30**, measured by TanDEM-X.
- **JRC GHSL**; **Hansen/UMD GFC**.
- **PIG-PIB** groundwater-flood areas.
- **GEOPOZ**: the Poznań city planning register (WUIA), 2,420 permits and applications [src:poznan-trend-detective/web/i18n_sar.js#en.ui.Lsub.wuia], and orthophotos.
- **GUS BDL** (population, dwellings, prices, wages); **IMGW-PIB**; **GUGiK Geoportal**.
- **OpenStreetMap contributors (ODbL)**, including Nominatim search; **OpenFreeMap**.
- **Open-Meteo**: rain and soil moisture at one reference point on the NISAR pass days, used to choose the dry/wet pair. [ZAŁOŻENIE: add Open-Meteo to the README source list.]

### Use of AI tools
The team used Claude, an AI assistant, to write the data pipeline and the app and to draft text, including this page and the pitch. Every number in the app is computed by the pipeline from the sources above. Every number in our pitch notes and on this page traces to a data file and key. The voice-over is a team member's voice, and no image in the video or slides is AI-generated. [ZAŁOŻENIE: the team confirms the last sentence before submission, or watermarks any AI-generated image per docs/BURZA_MOZGOW.md section 11.]

---

## 9. What we do not promise

- **We do not measure water in basements or the depth of groundwater.** Radar senses moisture near the surface. The NISAR wet-minus-dry row is "information"; water warnings come from the PIG-PIB groundwater-flood map and terrain hollows.
- **We do not say radar wetting marks flood-prone plots.** It was not higher inside groundwater-flood areas: 18.5% inside against 37.7% outside [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry] (one-sided test for higher: p = 1.0 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.p]).
- **We do not say one rain caused the NISAR rise.** One pair, no dry–dry baseline; harvest and tillage brighten HH too.
- **We do not judge soil under buildings or forest.** Wetness is computed on open land only.
- **We do not give a subsidence rate from NISAR.** GCOV has no phase; motion needs NISAR's interferometric products and years of passes. Ground motion is EGMS 2016–2020, covering 24.2% of the area [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.share_of_study].
- **We do not recognise single buildings or materials.** Our cells are about 73 m on the ground [src:poznan-trend-detective/web/data/land/land.json#cell_m_ground]; materials need full polarimetry and 1–3 m resolution [src:docs/pitch.md#5.2].
- **We do not say radar saw walls.** It saw a new-building signature, which also catches cleared sites and earthworks; we have not yet checked a sample against orthophotos.
- **We do not say NISAR saw the 2026 building change.** That is Sentinel-1 year on year. NISAR passed over Poznań in autumn 2025, but only as a beta release [src:progres/p1/dane/nisar_poznan_przeloty.csv#2025-10-28.wersja]; we use only the provisional release [src:poznan-trend-detective/web/data/land/sar.json#nisar.version] and never mix versions.
- **We do not say NISAR forecasts.** The projection is a model built on Landsat-based maps, and on open land its top picks hit 1.3% [src:poznan-trend-detective/web/data/land/land.json#model.open_land_hit_rate]. Radar detects change. A building decision is paperwork, not a building site.
- **We do not say what will be built on a plot.** Building type from the city register is in open pull request #11, and the register covers only the city of Poznań.
- **We do not add risks into one overall score.** Each risk keeps its own flag.²
- **We do not replace a viewing, a soil survey or the local plan.** The card tells the buyer what to ask the seller and the planning office.
- **We do not mix NISAR releases in any number.** The validated release starts on 21 Oct 2026 [src:docs/planwyd.md#Fakty ustalone 14.11]; the GIBS browse layer is a quicklook that does mix them and feeds no number.
- **We do not cover all of Poland yet.** Today the area is Poznań plus 17 municipalities [src:poznan-trend-detective/web/data/study.json#areas].

---

## 10. Bank of hard jury questions

1. **"NISAR wetting is not higher inside the official flood areas. So what is it worth?"**
   A hint about how the surface responded between two passes (median +1.39 dB on open land [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.median_db_open]), not a flood map. Inside the flood areas the rise was less common (ratio 0.49 [src:poznan-trend-detective/web/data/land/sar.json#nisar.checks.wetdry.ratio]); we tested only for "higher" and did not test the reverse. So the card shows it as information, keeps the water warning on the PIG-PIB map and hollows, and a full NISAR year is the test.

2. **"Crops were harvested and fields ploughed between your passes. Isn't that the signal?"**
   Possibly much of it. On 19 July the soil was almost as wet as on 24 August [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-07-19.wilgotnosc_gleby_m3m3] [src:progres/p1/dane/nisar_poznan_przeloty.csv#2026-08-24.wilgotnosc_gleby_m3m3], yet study-area HH barely moved, and the brightest pass came on drier 17 September [src:poznan-trend-detective/web/data/land/sar.json#nisar.aoi_hh_db]. That looks like harvest and tillage roughness as much as rain. We call it a hint; the next step is the same calculation for 19 Jul and for a dry–dry pair as a noise floor.

3. **"How much of SARnik is NISAR?"**
   NISAR gives the 2026 L-band picture, the wet–dry pair, the L-band/C-band contrast and the end of the timeline that starts with ALOS-2 in 2015 [src:poznan-trend-detective/web/data/land/sar.json#alos.years]. Building change and ground motion come from Sentinel-1 and EGMS. NISAR did pass over Poznań in autumn 2025, but as a beta release [src:progres/p1/dane/nisar_poznan_przeloty.csv#2025-10-28.wersja]; we use only the provisional release and never mix versions, so NISAR takes over building change once a same-release autumn pair exists.

4. **"Why not measure subsidence with NISAR?"**
   We used GCOV, NISAR's backscatter product, which has no phase; no number of GCOV passes measures motion. That needs NISAR's interferometric products (GUNW/RSLC) and 2–3 years of data [src:docs/pitch.md#5.2]. Until then, motion is EGMS 2016–2020.

5. **"Your p values look too good. Are neighbouring cells independent?"**
   No. An estate spans several cells, so the one-sided binomial p values are optimistic. We show raw counts next to every ratio (77 of 17,557 [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.hits] [src:poznan-trend-detective/web/data/land/sar.json#checks.model_walls.cells]; 12 of 766 [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.hits] [src:poznan-trend-detective/web/data/land/sar.json#checks.wuia.cells]). A test on blocks of cells is our next step.

6. **"Isn't 4.3× just 'new buildings appear next to old ones'?"**
   Partly, yes. The ranking's strongest feature is existing building in the cell [src:poznan-trend-detective/web/data/land/land.json#model.coefficients_standardised], and "elsewhere" means the other 95% of cells the model's 2025 map calls not built, forest and water included. We call 4.3× direction, not skill, until we compare it with the same ratio for a naive ranking.

7. **"Ploughing brightens radar too. How do you know it is building?"**
   We don't know it for every cell. Comparing autumn with autumn cuts seasonal change: a June-versus-autumn comparison would flag 3.13% of all not-yet-built cells [src:poznan-trend-detective/web/data/land/sar.json#checks.season_change_open_up3db_share], while year on year 0.26% of the 95% outside the projection's top 5% [src:poznan-trend-detective/web/data/land/sar.json#checks.model.what] changed [src:poznan-trend-detective/web/data/land/sar.json#checks.model.share_b] (different subsets, so indicative only). The new-building signature also needs a VV/VH rise of 1.5 dB [src:poznan-trend-detective/web/data/land/sar.json#s1.wall_db]; it still catches cleared sites and earthworks, and an orthophoto spot check is pending.

8. **"The prospectus lists investments within 1 km. Is the developer really hiding anything?"**
   We don't say so. The guide we cite tells buyers to check that section [url:https://pewnylokal.pl/porady/prospekt-informacyjny-dewelopera]. Our point is what actually changed on the ground and how it took rain, which a developer is not asked to describe and does not. Whether the law requires disclosing groundwater or soil surveys is unconfirmed in our sources, so we make no legal claim.

9. **"Olsztyn is not in your study area, and radar doesn't see drains. Why open with it?"**
   It is a sourced example of the problem: eight families and a year and a half of water [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/], not a case our radar caught. We found no documented case from Poznań or Wielkopolska (docs/pomysly-sar/zrodla.md), so we invent none.

10. **"Can a buyer trust SARnik for their own plot?"**
    Not as a verdict. Our cells are about 73 m on the ground [src:poznan-trend-detective/web/data/land/land.json#cell_m_ground], so we see estates and streets, not one house. SARnik tells you which questions to ask the seller and the planning office; it does not replace a viewing or a soil survey.

11. **"Your ground motion is from 2016–2020 and covers a quarter of the area. Isn't it stale?"**
    Yes, EGMS 2016–2020 [src:poznan-trend-detective/web/data/land/sar.json#egms.source] measures 24.2% of the study area [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.share_of_study], and the card says "no measurements here" where it has none. Typical motion is 0 mm a year [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.median], and 147 cells sink 5 mm a year or faster [src:poznan-trend-detective/web/data/land/sar.json#checks.egms.cells_le_minus5]. Fresh motion over green land is what NISAR interferometry could add.

12. **"Provisional NISAR, ALOS-2 and Sentinel-1 in one timeline: different calibrations?"**
    We never compare raw brightness across sensors: NISAR is about 3 dB brighter than the ALOS-2 mosaics over our area [src:poznan-trend-detective/README.md#Limits we state openly], so the timeline stretches each sensor separately and the step from ALOS-2 to NISAR is not land change. Every number uses one NISAR track and one release; the GIBS browse layer is a quicklook that mixes tracks and releases and feeds no number.

13. **"Open-land AUC 0.986, but a 1.3% hit rate. Is the forecast useless for one field?"**
    It ranks open land better than a naive rule (0.986 against 0.901 [src:poznan-trend-detective/web/data/land/land.json#model.open_land_auc] [src:poznan-trend-detective/web/data/land/land.json#model.open_land_baseline_auc]), but on only 76 open-land conversions [src:poznan-trend-detective/web/data/land/land.json#model.open_land_conversions] its top picks caught 1.3% [src:poznan-trend-detective/web/data/land/land.json#model.open_land_hit_rate]. That is why the card says "check the local plan", and why we do not quote the inflated overall figures.

14. **"Why no single risk score? And what is the 'NN / 100' in Technical details?"**
    We have no damage data to weight different risks, so each keeps its own flag and the header only counts them. The "NN / 100" is the projection's building likelihood, not an overall score; whether to keep it is a team decision.²

15. **"Your public link shows an older version. What exactly works?"**
    The public address still serves version 1; everything in this pitch runs on `main`, and the demo must be deployed from it. The building-type row is in an open pull request; flood-zone and landslide rows are still being built, so none of them appears as working.

16. **"How did you use AI, and how do you know the numbers are right?"**
    Claude helped write the pipeline, the app and the texts, and we disclose that on the project page. Every number is computed by the pipeline into `sar.json` and `land.json`, every number in our notes carries a tag to its file and key, and the checks that did not hold are reported too.

---

## 11. Sources table

| Source | What it supports | Keys or passages used |
|---|---|---|
| `poznan-trend-detective/web/data/land/sar.json` | all radar numbers | `nisar.mission`, `nisar.track`, `nisar.version`, `nisar.dates`, `nisar.dry`, `nisar.wet`, `nisar.aoi_hh_db`, `nisar.checks.wetdry` (`share_study`, `share_flood`, `share_outside`, `ratio`, `p`, `median_db_open`), `nisar.checks.bands` (built/forest/open × HH/HV/VV/VH); `s1.mission`, `s1.dates`, `s1.orbit`, `s1.up3db_ha`, `s1.walls_ha`, `s1.wall_db`, `s1.water_db`; `alos.years`; `egms.source`; `checks.change_method`, `checks.model` (`ratio`, `share_a`, `share_b`, `hits`), `checks.model_walls` (`ratio`, `share_a`, `share_b`, `hits`, `cells`), `checks.wuia` (`ratio`, `hits`, `cells`), `checks.wuia_walls` (`ratio`, `hits`, `p`), `checks.season_change_open_up3db_share`, `checks.wet` (`driver`, `share_sig_study`, `share_sig_flood`, `share_sig_outside`, `median_r_open`, `r_crit`, `p_flood_higher`), `checks.egms` (`share_of_study`, `median`, `cells_le_minus5`) |
| `poznan-trend-detective/web/data/land/land.json` | projection and grid | `cell_m_ground`, `nisar_dates`, `model.trained_on`, `model.tested_on`, `model.open_land_auc`, `model.open_land_baseline_auc`, `model.open_land_conversions`, `model.open_land_hit_rate`, `model.auc_2015_2020`, `model.top_n_hit_rate`, `model.conversions_2015_2020`, `model.coefficients_standardised` |
| `poznan-trend-detective/web/data/study.json` | study area and population | `areas` (18 entries), `areas.Poznań/Dopiewo/Komorniki.pop_change_pct_2000_2024` |
| `progres/p1/dane/nisar_poznan_przeloty.csv` | NISAR pass list with Open-Meteo weather at one reference point | rows `2025-10-28.wersja`, `2026-01-20.wersja` (beta), `2026-06-25.deszcz_3dni_mm`, `2026-07-19.wilgotnosc_gleby_m3m3`, `2026-08-24.deszcz_3dni_mm`, `2026-08-24.wilgotnosc_gleby_m3m3`, `2026-09-17.wilgotnosc_gleby_m3m3`, `2026-10-23.wersja` (validated) |
| `poznan-trend-detective/web/app.js` | app behaviour | selection (1 km circle), `plainChecks()`, `plainHTML()`, `LENSES()`, `riskHTML()`, `SAR_FINDINGS.modelRadar` |
| `poznan-trend-detective/web/i18n_sar.js` | app texts | `en.plain`, `en.plain.heatSrc`, `en.ui.Lsub.wuia`, `EN.radarHtml` (lines 61, 66, 72), `fe.lband`, `fe.radar`, Water legend (lines 418, 425) |
| `poznan-trend-detective/pipeline/build_sar.py` | definitions and tests | new-building signature (lines 137–138), decision filter (line 129), one-sided binomial tests (lines 144, 185, 257), season share (line 189) |
| `poznan-trend-detective/pipeline/model_urban.py` | projection training and candidate set | training 2005–2015, test 2015–2020, candidates below the built threshold |
| `poznan-trend-detective/README.md` | app description and limits | "What the app computes" (20 m pixels), "Limits we state openly" (10–20 m pixels, NISAR about 3 dB brighter than ALOS-2) |
| `docs/planwyd.md` | settled facts | "Fakty ustalone 14.11" (demo format, 120 m ≈ 73 m cells, validated release from 21 Oct, WUIA categories noisy), "Stan funkcji" |
| `docs/pitch.md` | future directions and gaps | 5.2 (2–3 years for NISAR motion; 1–3 m for materials), 7 (data gap 27 Jul–10 Aug) |
| `docs/pomysly-sar/zrodla.md` | what is unconfirmed | "Niepotwierdzone" |
| `materials/challenge_dancing_with_the_sars.md` | challenge name and year | title |
| [url:https://pewnylokal.pl/porady/prospekt-informacyjny-dewelopera] | prospectus guide | "planned investments within 1 km"; no mention of flood zones, groundwater or soil surveys |
| [url:https://www.polsatnews.pl/wiadomosc/2026-07-29/nowe-osiedle-bez-odwodnienia-mieszkancy-sami-wynosza-wode-wiadrami/] | Olsztyn case, 29.07.2026 | "Osiem rodzin z Olsztyna od półtora roku walczy z wodą, która zalewa ogródki, parkingi i piwnice"; "W złożonym przez dewelopera wniosku o pozwolenie na budowę nie było zaprojektowanego systemu przeciwdeszczowego"; "miasto wydało zgodę na inwestycję" |
| [url:https://www.prawo.pl/samorzad/zabudowa-terenow-zagrozonych-powodzia-ustalenia-nik,520841.html] | NIK finding, page dated 17.04.2023 | "Potencjalni inwestorzy nie mieli więc rzetelnych informacji o zagrożeniu powodziowym w miejscu planowanej inwestycji." No audit number on the page. |

---

## 12. Assumptions waiting for the team

**Decisions ([ZAŁOŻENIE])**
- The name SARnik and the hook "The developer won't tell you. The radar will." (ZALOZENIA.json does not exist).
- The sentence "a developer has no duty to disclose how the ground behaves after rain, and does not": only after docs/fakty/FAKTY.md confirms it.
- Separate flags with no overall score, and whether to keep the "NN / 100" building likelihood in "Technical details".
- Demo format (video or slides) and confirming the limit in the official Space Apps guide; zrodla.md still lists it as unconfirmed.
- Slide 1 address: a flag from "New building next door" or "Is the ground moving", not from the projection row; checked on `main`.
- Slide 4: the forest contrast is visible over the forest south of Poznań.
- Slide 5: a place where the Water row shows the NISAR sentence.
- Slide 6: the district for Frame 2.
- Slide 7 and project page: the demo URL (a deployment of `main` by the Firebase owner, or the v3 preview with a note); the repository licence.
- No AI-generated images in the video or slides, or watermarked ones.
- Adding Open-Meteo to the README source list.

**Checks and fixes before slides are final** (outside docs/deep-pitch, so they need the team)
1. Run the wet–dry code in build_sar.py for 19 Jul minus 25 Jun and for a dry–dry pair (for example 25 Jun vs 12 Aug); quote 37% next to those shares.
2. Store the flood-area cell counts (`kf2`, `nf2`) in `sar.json`, and, if "less common" is to be claimed, add a test for "less" or a two-sided test.
3. Run `compare()` with the top 5% ranked by the naive rule and quote 4.3× next to that ratio.
4. Spot-check a random sample of new-building-signature cells against the GEOPOZ orthophoto and report the share that is construction.
5. Fix or crop app texts: i18n_sar.js line 61 ("through leaves to ... soil", "every 12 days since June 2026" → "NISAR's provisional release covers Poznań from June 2026, mostly every 12 days on track 158"); line 66 ("This is where NISAR's L-band has the edge"); line 72 (waterlogging warning); "Buildings are the brightest" → "among the brightest"; `fe.lband` ("sees where the ground soaks up rain"); `fe.radar` (4.5× "permit" ratio: add "(12 cells)", say "decision"); Water layer name, legend and lens tip ("soaks up a lot" / "dries out" → "brighter: wetter or rougher surface (rain, ploughing)" / "darker: drying or harvest"); `nextSrc` ("50 years of Landsat images" → "Landsat-based built-up maps 1975–2020, tested on 2015–2020"); "so harvest and ploughing cancel out" → "are reduced"; the layer label "Building permits (WUIA)" → "Building permits (city register)".
6. Check `alos.mission` ("1.27 GHz, 23.6 cm") against JAXA's PALSAR-2 specification; it may be the ALOS-1 PALSAR value.
7. Update the README: the row "Change since June" (and the docstring at line 9 of build_sar.py) to autumn against autumn; the NISAR soil-moisture values as Open-Meteo at one point.
8. Align the root README.md with the limits (basement water, millimetre subsidence, "9 flags", "147 zones ... in powiat").
9. Add a LICENSE file; deploy `main` for the demo link and QR code.
10. In the app, add "(about 73 m on the ground)" next to "120 m cells".
