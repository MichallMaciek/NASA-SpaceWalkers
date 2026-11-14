# SARnik: a radar check-up for any piece of land

**NASA Space Apps Challenge 2026 · Dancing with the SARs · team SpaceWalkers, Poznań**

When you buy a used car for 30,000 zł, you take it to a diagnostic station. When you buy a plot for 1,000,000 zł,
you look at nice photos on a listing site and take the developer's word for it. SARnik is the diagnostic station
for land: search an address or draw a plot around Poznań, and radar tells you what the ground is doing.

- **What changes right now**: every 2026 radar pass over Poznań (NISAR L-band and Sentinel-1 C-band).
- **Whether the ground soaks up water**: how strongly the radar echo follows soil wetness from pass to pass.
- **Whether the ground moves**: radar interferometry (EGMS, Sentinel-1 InSAR).
- **What happened before**: L-band history from ALOS-2 (2015–2021), 50 years of building growth from Landsat
  (GHSL) and a projection of where the city grows next, tested on years the model never saw.

Live app: <https://poznan-trend-detective.web.app> (v1) · v2 preview: see the release notes of branch `v2`.

## Why radar

Radar sends its own microwave pulse and listens for the echo, so it sees at night and through clouds. The echo
depends on the shape and roughness of the surface and on how much water it holds (the dielectric constant):

| What we see | Physics | Polarisation |
|---|---|---|
| New buildings brighten | wall + ground form a corner reflector: double bounce | strongest in co-pol (VV, HH) |
| Wet soil brightens | water raises the dielectric constant | co-pol (VV, HH) |
| Water and asphalt are dark | mirror-like reflection away from the satellite | all |
| Forests and crops | volume scattering in leaves and branches turns the polarisation | cross-pol (VH, HV) |
| L-band vs C-band | 24 cm waves (NISAR, ALOS-2) pass leaves and reach branches and soil; 5.6 cm waves (Sentinel-1) stop at the canopy top | — |

The app explains this in "How radar sees the ground" (radar button, top right).

## What the app computes

| Product | Data | Method |
|---|---|---|
| Radar picture 2026 | Sentinel-1 RTC, orbit 73 ascending, all passes June–November 2026 | median gamma0; R = VV, G = VH, B = VV/VH |
| Change since June | same | median of the last 6 passes minus median of the first 6 (VV, dB) |
| Ground soaks up water | same + NASA POWER GWETTOP (soil wetness) on each pass day | Spearman rank correlation per 120 m cell; only p < 0.05 shown |
| Water seen by radar | same | share of passes with VV < −17 dB |
| Ground motion | EGMS 2016–2020 vertical (Copernicus), via PIG-PIB | mm/year per cell |
| L-band history | ALOS-2 PALSAR-2 yearly mosaics 2015–2021 (JAXA) | HH, HV, HH/HV composite; HV change |
| NISAR | NISAR GCOV (NASA-ISRO), 38 pass days since 18 June 2026 | GIBS mosaics in the app; GCOV pixels via `pipeline/fetch_nisar.py` |
| History and projection | JRC GHSL 1975–2020, Hansen GFC, Copernicus DEM, OSM roads | logistic land-change model, trained 2005→2015, tested 2015→2020 |

All radar layers sit on the same 120 m grid as the rest of the app. Linear power is averaged before conversion to dB.

## Checks: does the radar signal mean what we say?

Filled in by `pipeline/build_sar.py` (see `web/data/land/sar.json`, key `checks`):

- **Building permits**: change on plots with a "new building" decision (Poznań planning office, June–August 2026)
  versus the rest of the city.
- **Projection meets radar**: change on the 5% of open land the model ranks highest versus other open land.
- **Wet ground**: share of cells that follow soil wetness inside versus outside the PIG-PIB groundwater-flood areas.

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

- Pixels of 10–20 m and our 120 m cells show estates and streets, not single houses.
- A season of passes cannot measure subsidence; ground motion comes from EGMS 2016–2020.
- A building permit is not a building site; radar sees walls and earthworks, not paperwork.
- The radar series covers June–November 2026, so seasonal farming changes mix with building; the change layer says
  "brighter" or "darker", and the card explains the likely causes.
- NISAR pixel analysis waits for an Earthdata login; until then NISAR is shown as NASA GIBS mosaics with pass dates.

## Data sources and licences

NASA-ISRO NISAR (ASF DAAC, NASA GIBS), NASA POWER, NASA MODIS (LP DAAC via Microsoft Planetary Computer),
Landsat (via GHSL and Global Forest Change). Partners: Copernicus Sentinel-1 RTC and DEM GLO-30 (Planetary Computer),
EGMS (Copernicus Land Monitoring Service, via PIG-PIB), JAXA ALOS-2 PALSAR-2 mosaics, JRC GHSL, Hansen/UMD GFC,
IMGW-PIB, GUS BDL, PIG-PIB groundwater-flood areas, GEOPOZ (Poznań planning decisions, orthophotos), GUGiK Geoportal,
OpenStreetMap contributors (ODbL), OpenFreeMap.

## Use of AI tools

The team used Claude (an AI assistant) to write the data pipeline and the app and to draft text. Every number in
the app is computed by the pipeline from the sources above.
