"""Shared settings for the Poznan Trend Detective pipeline."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
WEB_DATA = ROOT / "web" / "data"

# Study area: Poznan and the surrounding ring of suburban municipalities (WGS84).
# min lon, min lat, max lon, max lat. Covers all 18 municipalities (16.45-17.40 E, 52.15-52.68 N).
# The north-west corner falls just outside MODIS tile h19v03; it is filled as no-data and lies
# outside every municipality.
BBOX = (16.42, 52.12, 17.45, 52.71)

YEARS = list(range(2000, 2026))  # full years available for MODIS (2000 starts 18 Feb)
SUMMER_MONTHS = (6, 7, 8)

# Poznan-Lawica synoptic station (IMGW-PIB) and point used for NASA POWER.
POZNAN_POINT = (16.93, 52.41)
USER_AGENT = "trend-detective-hackathon/0.1"

for p in (RAW, PROCESSED, WEB_DATA):
    p.mkdir(parents=True, exist_ok=True)
