# Poznań Trend Detective: submission deck

NASA Space Apps Challenge 2026, challenge *Be An Earth System Trend Detective* (also uses NISAR from *Dancing with the SARs*).
Seven slides, 16:9, English. Polish version for the local event: `docs/PITCH_PL.md`. Video alternative: `docs/VIDEO_30S.md`.

Every number below is read from `web/data/land/land.json` or `web/data/study.json`. The table at the end lists each one with its path.
Record screenshots with the interface in English (Map settings, top right, then EN).

---

## Slide 1. Nobody inspects the land

**On the slide**

> Used car, 30,000 zł: paint, frame and oil checked.
> House or plot, 1,000,000 zł: nice photos.
> **Nobody X-rays the land.**

Footer: Poznań Trend Detective · NASA Space Apps 2026

**Visual.** Split frame. Left: the team's own photo of a paint-thickness gauge on a car door (no brand logos). Right: the app's "Technical inspection of the land" checklist for an address in Dopiewo, with its coloured status dots.

**Speaker notes.** Buying a used car for 30,000 złoty, you go to a diagnostic station: paint thickness, frame geometry, oil leaks. Buying a house or a plot for a million, you look at nice photos on Otodom and take the developer's word for it. Nobody does a technical X-ray of the land. We built one, from satellite data.

*Sources:* the hook is the team's. 30,000 zł and 1,000,000 zł are illustrative, not data.

**Judging criteria:** Impact, Presentation. Anyone who has bought a car or a flat gets the problem in five seconds.

---

## Slide 2. Poznań is spreading out

**On the slide**

> Built-up land around Poznań: **5.49% → 11.82%** (1990–2020)
> Poznań city: **−7.9%** residents since 2000
> Dopiewo, Rokietnica, Komorniki: **over +200%**
> **6,218 ha** of tree cover lost since 2001

**Visual.** Two screenshots of the same extent, Urbanisation layer on, municipal borders on: timeline at 1990 and timeline at 2020. Label Poznań and the three suburbs with their population change.

**Speaker notes.** In the 18 municipalities we study, built-up land more than doubled, from 5.49 to 11.82 percent between 1990 and 2020. People moved out: Poznań lost 7.9 percent of its residents since 2000, while Dopiewo, Rokietnica and Komorniki grew by more than 200 percent. Since 2001, 6,218 hectares of tree cover were lost, and the yearly loss is rising.

*Sources:* `land.json` `study_built_share_pct` 1990 = 5.49, 2020 = 11.82 (JRC GHSL, Landsat-based; a 120 m cell counts as built at 15% built-up surface). `study.json` `areas[]` (GUS BDL): Poznań 582,254 → 536,151, `pop_change_pct_2000_2024` = −7.9; Dopiewo +242.0, Rokietnica +221.2, Komorniki +217.5. Tree cover: sum of `land.json` `municipalities[*].forest_loss_total_ha` = 6,218 ha (Hansen/UMD GFC v1.12, Landsat); `forest_loss_trend` +99.8 ha per decade, p = 0.0008. If asked: GFC counts any tree-cover loss, forestry felling included. The largest totals are in forest municipalities (Murowana Goślina 1,070 ha, Kórnik 1,039, Mosina 857), so do not call it all "lost to building".

**Judging criteria:** Impact, Validity. The problem in measured local numbers.

---

## Slide 3. One address, one inspection

**On the slide**

> Search an address or draw an area.
> One card checks building, open land next door, trees, heat, groundwater, terrain hollows, radar and price per m².

**Visual.** Full app screen with an address in Dopiewo selected: dashed 1 km circle, Urbanisation layer, timeline at 2020. Side card visible: Building, Forest and Price per m² rows, the built-up mini chart, the building-risk score and the "Technical inspection of the land" checklist.

**Speaker notes.** This is the product. Type an address in Dopiewo, or trace a field with the drawing tool. The card shows building within one kilometre since 1975, trees cut since 2001, the county price per square metre, a building-risk score and an inspection list, like a car check. One button opens the full trend test. The timeline moves every layer.

*Sources:* `web/i18n.js` (`ui.chk`, `ui.riskTitle`), `web/app.js` `renderCard()` and `inspectionHTML()`. The checks in the current build: building around, open land next door, trees cut, daytime heat, groundwater flooding (PIG-PIB areas), lie of the land (DEM hollows, with the ISOK link), changes on the ground (radar). The card's own footnote: it does not replace the local zoning plan (MPZP), the ISOK flood map or a soil survey.

**Judging criteria:** Creativity, Presentation. A car-inspection format applied to land, in one card.

---

## Slide 4. NASA data, tested trends

**On the slide**

> Summer nights warmed significantly in **94.5%** of 2,517 one-km squares. None cooled.
> Satellite vs Ławica thermometer: **r = 0.893**
> NASA MODIS · Landsat · NISAR

**Visual.** Left: "Summer nights: trend" layer over the whole area (warm colours; grey = not significant; no blue anywhere). Right: the trend-test sheet for the Ławica station square (dashed Theil-Sen line, Mann-Kendall S, z, p). Bottom strip: the NISAR layer with its pass slider.

**Speaker notes.** Heat and greenness come from NASA MODIS Terra, 2000 to 2024. Each square gets a Theil-Sen slope and a Mann-Kendall test; colour means p below 0.05, grey means not proven. Above the Ławica station, satellite nights track the station's minimum, r = 0.893 over 24 summers. Landsat gives building and forest history; NISAR adds 38 radar passes since June 2026.

*Sources:* `study.json` `pixel_summary.night_sig_warming_share` = 94.5, `night_sig_cooling_share` = 0.0, `lst_pixels` = 2517 (MOD11A2 v061). `ground.modis_vs_station.night_vs_tmin` r = 0.893, n = 24 (2000–2023). `ground.trend_annual_mean`: IMGW Poznań-Ławica annual mean +0.4348 °C per decade over 58 years (1966–2023), significant. `growth_correlation.day_lst`: Spearman r = 0.682, p = 0.0018, n = 18 (faster-growing municipalities have faster-warming summer days). `land.json` `nisar_dates`: 38 passes, 2026-06-18 to 2026-10-29 (GCOV via NASA GIBS). Statistics checked against SciPy (README). If asked: surface temperature is roofs and ground, not air; Mann-Kendall assumes independent years; MODIS 2025 is missing (`study.json` `missing_years`).

**Judging criteria:** Relevance, Validity. NASA data is the core, every trend is tested, and the satellite is checked against a ground station.

---

## Slide 5. The forecast, checked honestly

**On the slide**

> Tested on 2015–2020, years it never saw:
> **56.4%** of its top-ranked cells were built.
> Open land: AUC **0.986** (naive rule: 0.901).
> A ranking, not a verdict.

**Visual.** Timeline dragged into the purple "Prediction" zone at 2035, purple projected cells on the map. Map settings open at the PREDICTION section (horizon, "Minimum chance of building" slider and its test hint). Inset: the building-risk score block ("NN / 100") with its scale line.

**Speaker notes.** The forecast is a logistic regression on 120-metre cells, trained on 2005–2015, tested on 2015–2020. Of the 5,379 cells it ranked highest, 56.4 percent were built. The overall AUC, 0.987, is inflated by nearly built cells, so we also test open land: 0.986 against 0.901 for a naive rule. Most growth is densification: only 76 conversions were on open land.

*Sources:* `land.json` `model`: `top_n_hit_rate` = 0.564, `conversions_2015_2020` = 5379, `auc_2015_2020` = 0.987, `open_land_auc` = 0.986, `open_land_baseline_auc` = 0.901, `open_land_conversions` = 76, `open_land_hit_rate` = 0.013, `demand_ha_per_5y` = 2781.0; `study_built_share_pct` 2030 = 14.4, 2035 = 15.69. Definitions in `pipeline/model_urban.py`: open land = under 5% built in 2015; naive rule = rank by built-up share within about 1.1 km. Score: `web/app.js` `riskOf()`, bands in `web/i18n.js` `ui.riskScale`.

Backup for questions:
- On open land the model's top 76 picks caught 1.3% (`open_land_hit_rate`): it ranks fields well, but cannot name the exact field that will be built.
- Projection at the 2010–2020 pace, 2,781 ha per 5 years: 14.4% of the area built by 2030, 15.69% by 2035. It knows nothing about new roads or plans.
- The score is a log scale of the model's 5-year chance (0.1% = 0, 30% = 100). Bands: low below 0.5%, moderate to 2%, elevated to 5%, high to 15%, very high above 15%.

**Judging criteria:** Validity. An out-of-sample test, a naive baseline, and the limits said out loud.

---

## Slide 6. Who needs it

**On the slide**

> **10,289 zł per m²**: Poznań median, 2024
> Buyers: check before signing
> Municipalities without a general plan: see the pressure
> Banks, insurers: screen plots in bulk

**Visual.** A freehand area drawn over open fields at the edge of a suburb next to the Warta valley, with the "Groundwater flooding (PIG-PIB)" layer on. Card shows "Open land is N% of the selection", the score, the groundwater line and the "Lie of the land" line with the link to the official ISOK flood map.

**Speaker notes.** Buyers: the median square metre in Poznań cost 10,289 złoty in 2024, so the land under it deserves a check. Municipalities without a general plan can see where the model expects building and how much forest lies in its path. Banks and insurers can draw an area and screen it in one step. Prices are per county, not per address.

*Sources:* `land.json` `prices.data["Poznań (city)"]["633677"]` 2015 = 5,650, 2024 = 10,289 (GUS BDL, median price per m²); `["64428"]` 2015 = 4,549.11, 2024 = 9,495.07 (average gross monthly wage). If asked about affordability: wages rose faster than prices (+108.7% against +82.1%), so one month's pay bought 0.81 m² in 2015 and 0.92 m² in 2024. Do not claim flats got less affordable. The app does not predict basement flooding: it flags terrain hollows from the DEM, shows the official PIG-PIB groundwater-flooding areas and links the ISOK flood map.

**Judging criteria:** Impact. Three groups that make expensive, hard-to-reverse decisions about land.

---

## Slide 7. Open data, open code

**On the slide**

> Free, open data: NASA MODIS, NISAR, POWER, Landsat (GHSL, GFC); Copernicus; IMGW; GUS; PIG-PIB.
> Pipeline rebuilds everything in 40–60 min.
> Claude (SI) helped write code and text.

**Visual.** The "About the data" sheet from the app next to the pipeline diagram from the README. QR codes for the repository and the live demo: [repo link], [demo link].

**Speaker notes.** Every source is free and needs no login. The pipeline rebuilds all data in 40 to 60 minutes; statistics were checked against SciPy. Our limits: 10 to 30 metre resolution, surface rather than air temperature, a forecast at the 2010–2020 pace, county-level prices. We used Claude, an SI assistant, for code and drafts; every number comes from the pipeline.

*Sources:* `README.md` sections "Data sources and licences", "Limits we state openly", "Use of SI tools", "Run it"; PIG-PIB groundwater-flood areas from `pipeline/fetch_flood.py`.

**Judging criteria:** Relevance, Validity, Presentation. Open NASA data at the core, reproducible, open about limits and SI use.

---

## Before you export

- The numbers were checked against the data rebuilt on 14 Nov 2026, 14:32, after the terrain (DEM) fix. If the pipeline runs again, re-read every number from the table below. The model uses terrain height and slope, so the slide 5 figures are the most likely to move.
- The checklist is still growing (the groundwater line is new). Take screenshots from the final build, so the slides and the app match.
- Fill in [repo link] and [demo link] on slide 7.

## Where each number comes from

| Number | Path |
|---|---|
| 5.49% (1990), 11.82% (2020), 14.4% (2030), 15.69% (2035) | `land.json` `study_built_share_pct` |
| −7.9%; 582,254 → 536,151 | `study.json` `areas[name=Poznań]` `pop_change_pct_2000_2024`, `population` |
| Dopiewo +242.0%, Rokietnica +221.2%, Komorniki +217.5% | `study.json` `areas[]` `pop_change_pct_2000_2024` |
| 6,218 ha; 1,070 / 1,039 / 857 ha | sum of `land.json` `municipalities[*].forest_loss_total_ha`; the three largest |
| +99.8 ha per decade, p = 0.0008 | `land.json` `forest_loss_trend` |
| 94.5%, 2,517 squares, 0.0% cooling | `study.json` `pixel_summary` |
| r = 0.893, n = 24 | `study.json` `ground.modis_vs_station.night_vs_tmin` |
| +0.4348 °C per decade, 58 years from 1966 | `study.json` `ground.trend_annual_mean`, `ground.years` |
| Spearman r = 0.682, p = 0.0018, n = 18 | `study.json` `growth_correlation.day_lst` |
| 38 NISAR passes, 2026-06-18 to 2026-10-29 | `land.json` `nisar_dates` |
| 56.4%; 5,379; 0.987; 0.986; 0.901; 76; 1.3%; 2,781 ha | `land.json` `model` |
| 5,650 and 10,289 zł per m² | `land.json` `prices.data["Poznań (city)"]["633677"]` |
| 4,549.11 and 9,495.07 zł wage; +82.1%, +108.7%, 0.81 → 0.92 m² | `["64428"]` and ratios computed from the two series |
| Score scale 0.1% = 0, 30% = 100; bands 0.5 / 2 / 5 / 15% | `web/app.js` `riskOf()`, `web/i18n.js` `ui.riskScale` |
