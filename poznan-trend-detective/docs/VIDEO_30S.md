# Poznań Trend Detective: 30-second video

The alternative to the 7-slide deck (`docs/PITCH.md`). English voice-over, about 66 spoken words, with English subtitles burned in.
Every number on screen comes from `web/data/land/land.json` or `web/data/study.json` (sources at the end).

## Set up before recording

1. Serve the app: `cd web && python3 -m http.server 8000`, then open <http://localhost:8000> in a 1920×1080 browser window at 100% zoom.
2. Map settings (button, top right): switch the language to **EN**, keep Background on **Map**, municipal borders on, only **Urbanisation** switched on. Close the settings.
3. Collapse the "What the data shows" card (Collapse link) and make sure nothing is selected.
4. Drag the timeline at the bottom to **1990**.
5. Do a dry run of the search. Type "Dopiewo" and check that the first suggestion is the village, not a street. Turn the NISAR layer on and off once so its tiles are cached.

Record each block as a separate take and cut them together. The final export must be 30.0 s or shorter.

## Script

| Time | Voice-over | On-screen caption | App action |
|---|---|---|---|
| 0:00–0:05 | "A used car gets a full inspection. A million-złoty house gets nice photos." | Used car, 30,000 zł: paint, frame, oil checked. House, 1,000,000 zł: nice photos. | Whole study area on screen, Urbanisation layer, timeline at 1990. No clicks. |
| 0:05–0:11 | "Around Poznań, built-up land more than doubled between 1990 and 2020." | Built-up land: 5.49% → 11.82% (1990–2020) | Click **Play** (round button at the left of the timeline). The year steps every 0.9 s, so 1990 → 2020 takes about 5.4 s. Click it again to pause at **2020**, or cut there. |
| 0:11–0:19 | "Type any address and get a technical inspection of the land: building, trees, heat, groundwater, radar." | One address. One card. | Click the search box (top left), type **Dopiewo**, press Enter. The map flies in and draws the dashed 1 km circle. When the card loads, scroll it to **Technical inspection of the land** and hold for 2 s. |
| 0:19–0:22 | "NASA MODIS, Landsat and NISAR data." | NISAR (NASA-ISRO): 38 radar passes since June 2026 | Separate take, same Dopiewo view. Open Map settings, under SAR DATA switch on **NISAR radar (NASA-ISRO)**, drag the **Pass** slider a few steps. |
| 0:22–0:26 | "Every trend tested, the forecast checked on years it never saw." | Tested on 2015–2020: 56.4% of top-ranked cells were built | Separate take: NISAR off, settings closed, Dopiewo card open at 2020. Drag the timeline handle right, into the purple **Prediction** zone, to **2035**. Purple projected cells appear and the card shows the purple forecast chip. |
| 0:26–0:30 | "Poznań Trend Detective. Check the land before you sign." | Poznań Trend Detective · NASA Space Apps 2026 · Be An Earth System Trend Detective · [demo link] | Hold on the card with the building-risk score visible, then cut to an end card over the map. |

Word count: 13 + 11 + 16 + 6 + 11 + 9 = 66, about 2.2 words per second.

## If the Dopiewo card is weak

Try **Skórzewo** or **Dąbrowa** (villages in Dopiewo municipality at the city edge), or an address near the Warta in Luboń or Czerwonak with the **Groundwater flooding (PIG-PIB)** layer on. Do not retype or edit any number shown by the app. Captions only use the study-wide figures below, so they stay true whichever address you show.

## Sources for the captions

| Caption | Source |
|---|---|
| 30,000 zł, 1,000,000 zł | The team's hook. Illustrative, not data. |
| 5.49% → 11.82% | `land.json` `study_built_share_pct` 1990 and 2020 (JRC GHSL, Landsat-based) |
| 56.4% | `land.json` `model.top_n_hit_rate` = 0.564, test period `model.tested_on` = 2015-2020 |
| 38 passes since June 2026 | `land.json` `nisar_dates` (38 dates, first 2026-06-18) |

If the pipeline is rerun before recording, re-read 56.4% from `land.json`. It changed from 0.562 to 0.564 when the data was rebuilt on 14 Nov.
