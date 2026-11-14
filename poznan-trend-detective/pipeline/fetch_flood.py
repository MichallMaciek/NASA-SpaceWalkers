"""Areas at risk of groundwater flooding ("podtopienia") from the Polish Geological Institute (PIG-PIB).

Source: PIG-PIB map service hydrogeologia/podtopienia, layer 0 "obszary zagrożone powodzią od wód gruntowych
(podtopienia)" - areas in large river valleys where flooding comes from groundwater (the typical cause of wet
basements). Downloaded with the ArcGIS REST query endpoint (no login), clipped to the 18 municipalities and
simplified to ~10 m.

Output: data/raw/podtopienia_pig.geojson (raw), web/data/podtopienia.geojson (clipped), area per municipality
printed for the record.
"""
import json
import subprocess

from shapely.geometry import mapping, shape
from shapely.ops import unary_union

from common import BBOX, PROCESSED, RAW, WEB_DATA

URL = "https://cbdgmapa.pgi.gov.pl/arcgis/rest/services/hydrogeologia/podtopienia/MapServer/0/query"


def download():
    args = ["curl", "-s", "--max-time", "180", "-G", URL,
            "--data-urlencode", "where=1=1",
            "--data-urlencode", f"geometry={BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]}",
            "--data-urlencode", "geometryType=esriGeometryEnvelope", "--data-urlencode", "inSR=4326",
            "--data-urlencode", "spatialRel=esriSpatialRelIntersects", "--data-urlencode", "outFields=*",
            "--data-urlencode", "outSR=4326", "--data-urlencode", "f=geojson"]
    raw = subprocess.run(args, capture_output=True, check=True).stdout
    (RAW / "podtopienia_pig.geojson").write_bytes(raw)
    return json.loads(raw)


def main():
    path = RAW / "podtopienia_pig.geojson"
    d = json.load(open(path)) if path.exists() else download()
    flood = unary_union([shape(f["geometry"]) for f in d["features"]])
    areas = json.load(open(PROCESSED / "areas.geojson", encoding="utf-8"))
    study = unary_union([shape(f["geometry"]) for f in areas["features"]])
    clipped = flood.intersection(study).simplify(0.0001, preserve_topology=True)
    out = {"type": "FeatureCollection", "features": [{
        "type": "Feature", "geometry": mapping(clipped),
        "properties": {"source": "PIG-PIB, hydrogeologia/podtopienia",
                       "name_pl": "Obszary zagrożone powodzią od wód gruntowych (podtopienia)",
                       "name_en": "Areas at risk of groundwater flooding"}}]}
    json.dump(out, open(WEB_DATA / "podtopienia.geojson", "w"), separators=(",", ":"))
    # area per municipality (approximate, degrees -> km2 at 52.4 N)
    k = 111.32 * 110.57 * 0.6101
    for f in areas["features"]:
        a = shape(f["geometry"])
        print(f'{f["properties"]["name"]:18s} {a.intersection(clipped).area * k:7.2f} km2 of {a.area * k:7.1f}')


if __name__ == "__main__":
    main()
