#!/usr/bin/env bash
# Rebuild every data file the web app reads. Takes about 40-60 minutes, no login needed.
set -euo pipefail
cd "$(dirname "$0")"
python3 build_areas.py        # municipal borders (data/raw/nom_*.json from OpenStreetMap, kept in the repo)
python3 fetch_modis.py lst    # NASA MODIS land surface temperature, 2000-2025
python3 fetch_modis.py ndvi   # NASA MODIS NDVI, 2000-2025
python3 fetch_ground.py       # NASA POWER, IMGW station, GUS population and dwellings
python3 analyze.py            # heat and greenness trends -> web/data/*.json
python3 fetch_urban.py        # GHSL built-up, Hansen forest loss, DEM, Sentinel-1, roads, prices, NISAR dates
python3 fetch_forest.py       # forest and forest-loss fractions per cell (Hansen GFC at 30 m)
python3 model_urban.py        # growth projection and land layers -> web/data/land/
echo "Done. Serve the site with: python3 -m http.server --directory ../web"
