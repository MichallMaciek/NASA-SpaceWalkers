"""Combine OpenStreetMap (Nominatim) boundaries into one GeoJSON of study areas.

Inputs: data/raw/nom_*.json (downloaded from nominatim.openstreetmap.org).
Output: data/processed/areas.geojson and web/data/areas.geojson
"""
import json

from common import PROCESSED, RAW, WEB_DATA

# Name in file -> display name, role
AREAS = {
    "Poznań": ("Poznań", "city"),
    "Luboń": ("Luboń", "suburb"),
    "Puszczykowo": ("Puszczykowo", "suburb"),
    "Komorniki": ("Komorniki", "suburb"),
    "Suchy_Las": ("Suchy Las", "suburb"),
    "Tarnowo_Podgórne": ("Tarnowo Podgórne", "suburb"),
    "Dopiewo": ("Dopiewo", "suburb"),
    "Rokietnica": ("Rokietnica", "suburb"),
    "Swarzędz": ("Swarzędz", "suburb"),
    "Czerwonak": ("Czerwonak", "suburb"),
    "Kórnik": ("Kórnik", "suburb"),
    "Mosina": ("Mosina", "suburb"),
    "Stęszew": ("Stęszew", "suburb"),
    "Kleszczewo": ("Kleszczewo", "suburb"),
    "Murowana_Goślina": ("Murowana Goślina", "suburb"),
    "Pobiedziska": ("Pobiedziska", "suburb"),
    "Kostrzyn": ("Kostrzyn", "suburb"),
    "Buk": ("Buk", "suburb"),
}


def pick(results, display):
    """Pick the administrative polygon from Nominatim results."""
    for r in results:
        g = r.get("geojson", {})
        if g.get("type") in ("Polygon", "MultiPolygon") and display.split()[0] in r["display_name"]:
            return r
    return None


def main():
    feats = []
    for key, (name, role) in AREAS.items():
        res = json.load(open(RAW / f"nom_{key}.json", encoding="utf-8"))
        r = pick(res, name)
        if r is None:
            print("missing", key)
            continue
        feats.append({
            "type": "Feature",
            "properties": {"name": name, "role": role, "osm_id": r.get("osm_id")},
            "geometry": r["geojson"],
        })
    fc = {"type": "FeatureCollection", "features": feats}
    for out in (PROCESSED / "areas.geojson", WEB_DATA / "areas.geojson"):
        json.dump(fc, open(out, "w", encoding="utf-8"), ensure_ascii=False)
    print(len(feats), "areas written")


if __name__ == "__main__":
    main()
