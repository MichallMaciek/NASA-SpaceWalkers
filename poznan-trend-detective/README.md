# Poznań Trend Detective

An interactive map that turns 50 years of satellite data into answers for any address around Poznań, Poland:
how much has been built here, where the city will grow next, where trees were cut, whether summers are getting
hotter, and whether each change is statistically real.

Built for the **NASA Space Apps Challenge 2026**, challenge *Be An Earth System Trend Detective*
(also uses NISAR radar from *Dancing with the SARs*).

## What you can do

- **Search any address** (or click the map) and get a place card: built-up share within 1 km from 1975 to 2020
  plus a projection to 2030, the chance that this 120 m square gets built on by 2030, forest lost nearby,
  summer day/night surface temperature and greenness trends for the 1 km satellite square, terrain height,
  radar change, flat prices per m² and how many m² an average monthly wage buys.
- **Run a trend test** on any of those series: Theil-Sen slope, Mann-Kendall S, z and p, the data table.
- **Overlay layers** (Geoportal-style) on a real street map or on aerial photos (Poland 2020s, Poznań 2025 and 1940),
  each with its own sliders:

| Layer | Sliders | Data |
|---|---|---|
| Built-up area 1975–2035 | year (history, then projection), "show as new from", built-up threshold | JRC GHSL (Landsat/Sentinel-2) + our model |
| Where the city grows next | five-year period, minimum chance | our model |
| Forest loss 2001–2024 | from, to (with play), minimum tree cover | UMD Global Forest Change v1.12 (Landsat) |
| Summer night / day surface temperature trend | – | NASA MODIS Terra MOD11A2 v061 |
| Summer nights year by year | year (with play) | NASA MODIS Terra MOD11A2 v061 |
| Greenness trend | – | NASA MODIS Terra MOD13Q1 v061 |
| NISAR radar passes | pass date (with play) | NASA-ISRO NISAR GCOV via NASA GIBS |
| Radar brightness | summer, brightness threshold | ESA Sentinel-1 RTC |
| Radar change 2017–2024 | minimum change | ESA Sentinel-1 RTC |
| Terrain height | water level, relief shading | Copernicus DEM GLO-30 (TanDEM-X radar) |
| Population change | – | GUS Bank Danych Lokalnych |

The interface is bilingual (English / Polish).

## How it works

```
pipeline/                      web/
  build_areas.py   borders  ─┐   index.html  i18n.js  app.js  styles.css
  fetch_modis.py   MODIS     │   data/study.json        heat & greenness trends, validation
  fetch_ground.py  POWER,    ├─> data/grid_lst.json     1 km MODIS squares (trends + yearly values)
                   IMGW, GUS │   data/grid_ndvi.json    250 m NDVI squares
  analyze.py       trends   ─┤   data/areas.geojson     18 municipalities
  fetch_urban.py   GHSL, GFC,│   data/land/land.json    model, municipal stats, prices, NISAR dates
                   DEM, S1,  │   data/land/*.png        120 m layers, values encoded as grey levels
                   roads,    │
                   prices   ─┤
  model_urban.py   projection┘
```

- **Trends**: summer (June–August) mean per year and per square, Theil-Sen slope, two-sided Mann-Kendall test
  (α = 0.05, normal approximation). Implemented in `pipeline/trend.py` and mirrored in `web/app.js`; both were
  checked against SciPy (`theilslopes`, `spearmanr`, `pearsonr`) to the last digit.
- **Validation**: the MODIS square containing the IMGW Poznań-Ławica station is compared with the station's
  summer minimum and maximum temperatures; NASA POWER is compared with the station's annual mean.
- **Growth projection** (`pipeline/model_urban.py`): 120 m cells; a cell counts as built when GHSL built-up
  surface covers at least 15 % of it. Logistic regression on built-up share in and around the cell, distance to
  main roads (OpenStreetMap), distance to the Old Market, terrain height and slope, tree cover in 2000.
  Trained on 2005→2010 and 2010→2015, tested on 2015→2020 (AUC and top-N hit rate are stored in
  `land.json` and shown in the app), then rolled forward in 5-year steps at the 2010–2020 pace.

## Run it

```bash
cd web && python3 -m http.server 8000
```

Then open <http://localhost:8000>. Rebuilding the data takes 40–60 minutes and needs no login:

```bash
pip install -r pipeline/requirements.txt
bash pipeline/run_all.sh
```

## Limits we state openly

- Free radar and optical data resolve 10–30 m: estates and streets, not single houses.
- Surface temperature is roofs and ground, not air (it tracks the station closely).
- The projection assumes the coming years look like 2010–2020; it knows nothing about new roads or plans.
- Flat prices are published per county (Poznań city, Poznań county), not per address.
- The MODIS mirror we used has no files for July to mid-November 2025, so heat trends end in 2024.
- Mann-Kendall assumes independent years; similar neighbouring summers make p-values slightly optimistic.

## Data sources and licences

NASA: MODIS Terra MOD11A2/MOD13Q1 v061 (LP DAAC, read via Microsoft Planetary Computer), NISAR GCOV (ASF DAAC,
NASA GIBS), NASA POWER, Landsat (via GHSL and Global Forest Change). Partners: JRC GHSL GHS-BUILT-S R2023A,
Hansen/UMD Global Forest Change 2024 v1.12, Copernicus Sentinel-1 RTC and DEM GLO-30, IMGW-PIB, GUS BDL,
PIG-PIB (areas at risk of groundwater flooding, `hydrogeologia/podtopienia`), GUGiK Geoportal, GEOPOZ Poznań,
OpenStreetMap contributors (ODbL), OpenFreeMap vector tiles, Esri basemaps, NASA GIBS (NISAR mosaics).

## Use of SI tools

The team used Claude (an SI assistant) to write the data pipeline and the app and to draft text. Every number
in the app is computed by the pipeline from the sources above.

## Why this matters

When you buy a used car for 30,000 zł, you take it to a diagnostic station: you measure the paint thickness,
check the frame geometry and look for oil leaks. When you buy a house or a plot for 1,000,000 zł... you look at
nice photos on Otodom and take the developer's word for it! Nobody does a technical X-ray of the land.

- **Buyers** search the address before signing and see how much has been built around it since 1975, how likely
  the open land next door is to be built on, how many trees were cut, whether summer days are warming, and whether
  the spot lies in a terrain hollow or an official groundwater-flooding area.
- **Municipalities without a general plan** see where the model expects building in the next 5 to 10 years and
  how much forest lies in its path.
- **Banks and insurers** draw an area and screen it in one step instead of plot by plot. The building-risk score
  is a ranking from the model, not a verdict.

The pitch deck (`docs/PITCH.md`, Polish `docs/PITCH_PL.md`) and the 30-second video script (`docs/VIDEO_30S.md`)
use the same numbers as the app.
