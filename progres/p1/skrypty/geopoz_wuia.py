"""Decyzje budowlane WUIA z Geopoz jako GeoJSON (do weryfikacji zmian z radaru).

Pobiera decyzje i wnioski z warstwy decyzje:v_decyzje_wuia_group_mapa_sql
(poligony działek z datą) dla zadanego okresu i dopisuje dwie kolumny:
  - kategoria: "nowa budowa", "rozbudowa", "rozbiórka" albo "inne"
    (przebudowy, remonty i zmiany sposobu użytkowania radar zwykle nie widzi),
  - status: "decyzja", "wniosek" albo "sprzeciw/odmowa".
Do porównania z radarem najlepiej brać kategorię "nowa budowa" ze statusem "decyzja".

Użycie:
    python3 geopoz_wuia.py [od RRRR-MM-DD] [do RRRR-MM-DD] [plik.geojson]
"""

import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

WFS = "https://wms2.geopoz.poznan.pl/geoserver/wfs"
LAYER = "decyzje:v_decyzje_wuia_group_mapa_sql"
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "dane" / "wuia_decyzje.geojson"

NEW = re.compile(r"(?<![a-ząćęłńóśźż])budow[aęyie]", re.IGNORECASE)
EXTEND = re.compile(r"(rozbudow|nadbudow)", re.IGNORECASE)
DEMOLISH = re.compile(r"rozbi[oó]rk", re.IGNORECASE)


def category(opis: str) -> str:
    text = opis or ""
    if NEW.search(text):
        return "nowa budowa"
    if EXTEND.search(text):
        return "rozbudowa"
    if DEMOLISH.search(text):
        return "rozbiórka"
    return "inne"


def status(rodzaj: str) -> str:
    text = (rodzaj or "").lower()
    if "sprzeciw" in text or "odmow" in text:
        return "sprzeciw/odmowa"
    if text.startswith(("podanie", "wniosek")):
        return "wniosek"
    return "decyzja"


def main() -> None:
    start = sys.argv[1] if len(sys.argv) > 1 else "2026-06-01"
    end = sys.argv[2] if len(sys.argv) > 2 else "2026-12-31"
    out = Path(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_OUT
    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": LAYER,
        "outputFormat": "application/json",
        "srsName": "EPSG:4326",
        "CQL_FILTER": f"DATA >= '{start}' AND DATA <= '{end}'",
    }
    url = WFS + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "spacewalkers-hackathon"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = json.load(resp)
    for feat in data["features"]:
        props = feat["properties"]
        props["kategoria"] = category(props.get("OPIS"))
        props["status"] = status(props.get("RODZAJ"))
        props["DATA"] = (props.get("DATA") or "")[:10]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    counts: dict[tuple[str, str], int] = {}
    for feat in data["features"]:
        key = (feat["properties"]["kategoria"], feat["properties"]["status"])
        counts[key] = counts.get(key, 0) + 1
    print(f"Zapisano {len(data['features'])} rekordów ({start} – {end}) do {out}")
    for (cat, st), n in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {cat:12s} | {st:16s} | {n}")


if __name__ == "__main__":
    main()
