# SARnik: a radar check-up for any piece of land

**NASA Space Apps Challenge 2026 · Dancing with the SARs · team SpaceWalkers, Poznań**

When you buy a used car for 30,000 zł, you take it to a diagnostic station. When you buy a plot for 1,000,000 zł,
you look at nice photos on a listing site and take the developer's word for it. SARnik is the diagnostic station
for land: search an address or draw a plot around Poznań, and radar tells you what the ground is doing.

- **What changes right now**: NISAR L-band (9 passes of track 158, June–October 2026) and Sentinel-1 C-band (relative orbit 73, 2026 and autumn 2025).
- **Water**: PIG-PIB groundwater-flood areas, terrain hollows, and how the radar echo follows wet weather (the surface response, not drainage).
- **Whether the ground moves**: radar interferometry (EGMS, Sentinel-1 InSAR).
- **What happened before**: L-band history from ALOS-2 (2015–2021), building growth since 1975 from Landsat
  (GHSL) and a projection of where the city grows next, tested on years the model never saw.

Live app: <https://poznan-trend-detective.web.app> (v1, history and projection). SARnik v2 preview: <https://poznan-trend-detective--v2-v4vqg11d.web.app>.
SARnik v3 preview (plain language for everyone): <https://poznan-trend-detective--v3-5tz04dp8.web.app>.

**v3 in short:** the card opens with a plain check-up, one sentence per question with no dB or statistics. It is split
into "From SAR radar" (new buildings, water, ground motion) and "Background from other sources (no radar)" (projection,
trees, summer heat, price). A radar mark shows which map views and findings come from SAR. Six map views replace the long list of
switches. Expert mode (menu, "Expert mode") brings back every layer, slider, dB chart and statistical test. In the radar views the timeline
walks through the years with radar data: the ALOS-2 L-band archive 2015–2021, then 2026 (NISAR, Sentinel-1, EGMS);
Play animates the L-band time line from 2015 to NISAR 2026.

## Why radar

Radar sends its own microwave pulse and listens for the echo, so it sees at night and through clouds. The echo
depends on the shape and roughness of the surface and on how much water it holds (the dielectric constant):

| What we see | Physics | Polarisation |
|---|---|---|
| New buildings brighten | wall + ground form a corner reflector: double bounce | strongest in co-pol (VV, HH) |
| Wet soil brightens | water raises the dielectric constant | co-pol (VV, HH) |
| Calm water and smooth asphalt are dark | mirror-like reflection away from the satellite | all |
| Forests and crops | volume scattering in leaves and branches turns the polarisation | cross-pol (VH, HV), raised most by vegetation; buildings at an angle to the track raise it too |
| L-band vs C-band | 24 cm waves (NISAR, ALOS-2) pass leaves and reach branches and soil; 5.6 cm waves (Sentinel-1) scatter mostly in the upper canopy but reach the soil through grass and low crops | — |

The app explains this in "How radar sees the ground" (radar button, top right).

## What the app computes

| Product | Data | Method |
|---|---|---|
| Radar picture 2026 | Sentinel-1 RTC, orbit 73 ascending, all passes June–November 2026 | median gamma0; R = VV, G = VH, B = VV/VH |
| Change in a year | Sentinel-1 RTC, orbit 73: 12 passes Sep–Nov 2026 and 12 passes Sep–Nov 2025 | median VV difference; double bounce = VV change minus VH change ≥ 1.5 dB |
| Response to moisture | Sentinel-1 2026 passes + NASA POWER GWETTOP soil wetness on each pass day (one MERRA-2 grid value for the whole area, about 50 km across) | Spearman rank correlation per 120 m cell; only p < 0.05 shown; the surface responding to wet weather, not drainage |
| Water seen by radar | Sentinel-1 2026 passes | calm open water: share of passes with VV < −17 dB |
| Ground motion | EGMS 2016–2020 vertical (Copernicus), via PIG-PIB | mm/year per cell |
| L-band history | ALOS-2 PALSAR-2 yearly mosaics 2015–2021 (JAXA) | HH, HV, HH/HV composite; HV change |
| NISAR L-band 2026 | NISAR GCOV (NASA-ISRO), HH + HV, 20 m, track 158 ascending, provisional release, 25 Jun – 11 Oct 2026 | Poznań window read from each HDF5 file (range requests), power-averaged to 120 m; median HH/HV/ratio composite as the last step of the L-band time line |
| NISAR change June → August | NISAR HH on 25 Jun and 24 Aug 2026 (ERA5 0–7 cm soil moisture 0.09 and 0.30 m³/m³ via Open-Meteo; 23.5 mm of rain in the 3 days before 24 Aug, daily values) | HH difference on open land: rain together with harvest and tillage, not rain alone; checked against PIG-PIB groundwater-flood areas |
| L-band next to C-band | NISAR HH/HV and Sentinel-1 VV/VH medians | built-up land, forest and open land compared in “How radar sees the ground” |
| History and projection | JRC GHSL 1975–2020, Hansen GFC, Copernicus DEM, OSM roads | logistic land-change model, trained 2005→2015, tested 2015→2020 |

All radar layers sit on the same 120 m grid as the rest of the app (about 73 m on the ground). Linear power is averaged before conversion to dB.

## Checks: does the radar signal mean what we say?

Filled in by `pipeline/build_sar.py` (see `web/data/land/sar.json`, key `checks`):

- **New-building decisions**: strong brightening (VV up by 3 dB or more, autumn to autumn) on plots with a new-building
  decision of the Poznań planning office (building permits, notifications, zoning and location decisions, June–August 2026)
  versus the rest of the city. The hits come from a handful of building sites, so the ratio is uncertain and we give no
  p-value (neighbouring cells are not independent). The new-wall signature alone is not yet clearly more common there.
- **Projection and radar**: change on the 5% of open land the model ranks highest versus other open land. It is mostly
  at the edge of existing estates; ranking open land by its existing built-up share gives the same result, so this does
  not test the model.
- **Response to moisture**: share of open-land cells whose VV follows soil wetness, inside versus outside the PIG-PIB
  groundwater-flood areas (about the same).
- **NISAR in groundwater-flood areas**: the HH rise from 25 Jun to 24 Aug is less common there, not more; the
  hypothesis was not confirmed.

## Run it

```bash
cd web && python3 -m http.server 8000
```

Rebuild the radar layers (no login needed):

```bash
pip install -r pipeline/requirements.txt
cd pipeline && python fetch_sar.py && python build_sar.py
```

NISAR GCOV pixels need a free NASA Earthdata account (put it in `~/.netrc`), then
`python fetch_nisar.py --inspect` and `python fetch_nisar.py`.

## Limits we state openly

- Our cells are 120 m on the Web Mercator grid, about 73 m on the ground: they show estates and streets, not single houses.
- We use NISAR backscatter (GCOV), not phase. NISAR interferometry can detect fast motion within months, but rates of
  millimetres a year need years; ground motion comes from EGMS 2016–2020.
- A building permit is not a building site; radar sees walls and earthworks, not paperwork.
- The change layer compares autumn 2026 with autumn 2025 (same orbit). This removes most of the farming season but not
  year-to-year differences in soil moisture and crops: darkening by 3 dB or more lies almost entirely on fields
  (probably a drier autumn 2026), so on fields "darker" does not mean demolition.
- The double-bounce rule mainly catches walls roughly parallel to the satellite track; buildings at an angle show more in
  cross-pol and can land in "brighter without double bounce".
- NISAR data are the provisional release of its first months (June–October 2026, one track); calibration may still change, and we do not mix versions.
- NISAR is on average about 3 dB brighter than the ALOS-2 mosaics over our area (calibration, season, viewing angle), so the
  L-band time line stretches each sensor separately (same share of the area below each colour bound) and its legend uses
  each sensor's own typical values: compare surface classes between ALOS-2 and NISAR, not raw brightness.
- Five months of NISAR cannot show subsidence or a full wetland cycle; those are future work once a year or more of passes exists.

## Data sources and licences

NASA-ISRO NISAR GCOV (ASF DAAC, read with earthaccess; NASA GIBS), NASA POWER, NASA MODIS (LP DAAC via Microsoft Planetary Computer),
Landsat (via GHSL and Global Forest Change). Partners: Copernicus Sentinel-1 RTC and DEM GLO-30 (Planetary Computer),
EGMS (Copernicus Land Monitoring Service, via PIG-PIB), JAXA ALOS-2 PALSAR-2 mosaics, JRC GHSL, Hansen/UMD GFC,
IMGW-PIB, GUS BDL, PIG-PIB groundwater-flood areas, GEOPOZ (Poznań planning decisions, orthophotos), GUGiK Geoportal,
OpenStreetMap contributors (ODbL), OpenFreeMap. Weather on NISAR pass days: ERA5 (Copernicus C3S) via Open-Meteo
(Weather data by Open-Meteo.com, CC BY 4.0).

## Use of AI tools

The team used Claude (an AI assistant) to write the data pipeline and the app and to draft text. Every number in
the app is computed by the pipeline from the sources above.
