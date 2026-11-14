"""Lista produktów NISAR nad Poznaniem z pogodą w dniu przelotu.

Pobiera z ASF SearchAPI wszystkie produkty GCOV, GUNW i SME2 nad Poznaniem,
dokleja z Open-Meteo (ERA5) deszcz z 3 dni przed przelotem i średnią dobową
wilgotność gleby 0-7 cm i zapisuje CSV. Nie wymaga konta ani bibliotek spoza
standardowej biblioteki Pythona.

Użycie:
    python3 nisar_pogoda.py [plik_wyjściowy.csv]
"""

import csv
import json
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

AOI_WKT = "POLYGON((16.73 52.29,17.07 52.29,17.07 52.51,16.73 52.51,16.73 52.29))"
POINT = (52.41, 16.93)  # punkt pogodowy: centrum Poznania
ASF_URL = "https://api.daac.asf.alaska.edu/services/search/param"
METEO_URL = "https://archive-api.open-meteo.com/v1/archive"

DEFAULT_OUT = Path(__file__).resolve().parent.parent / "dane" / "nisar_poznan_przeloty.csv"


def get_json(url: str, params: dict) -> dict:
    full = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(full, headers={"User-Agent": "spacewalkers-hackathon"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.load(resp)


def nisar_products() -> list[dict]:
    data = get_json(ASF_URL, {
        "dataset": "NISAR",
        "processingLevel": "GCOV,GUNW,SME2",
        "intersectsWith": AOI_WKT,
        "output": "geojson",
        "maxResults": 2000,
    })
    rows = []
    for feat in data["features"]:
        p = feat["properties"]
        files = p.get("bytes") or {}
        h5 = [v["bytes"] for name, v in files.items() if name.endswith(".h5") and "QA" not in name]
        collection = p.get("collectionName", "")
        if "BETA" in collection:
            maturity = "beta"
        elif "PROVISIONAL" in collection:
            maturity = "provisional"
        else:
            maturity = "validated"
        rows.append({
            "data": p["startTime"][:10],
            "produkt": p["processingLevel"],
            "orbita": p.get("pathNumber"),
            "kierunek": "wznoszacy" if p.get("flightDirection") == "ASCENDING" else "zstepujacy",
            "wersja": maturity,
            "pasmo_MHz": "+".join(p.get("rangeBandwidth") or []),
            "rozmiar_GB": round(h5[0] / 1e9, 2) if h5 else "",
            "nazwa": p.get("sceneName") or p.get("fileID"),
            "url_h5": p.get("url", ""),
            "podglad_png": (p.get("browse") or [""])[0],
        })
    rows.sort(key=lambda r: (r["data"], r["produkt"], r["orbita"]))
    return rows


def weather(start: str, end: str) -> tuple[dict, dict]:
    data = get_json(METEO_URL, {
        "latitude": POINT[0],
        "longitude": POINT[1],
        "start_date": start,
        "end_date": end,
        "daily": "precipitation_sum",
        "hourly": "soil_moisture_0_to_7cm",
        "timezone": "Europe/Warsaw",
    })
    rain = dict(zip(data["daily"]["time"], data["daily"]["precipitation_sum"]))
    hourly = defaultdict(list)
    for t, v in zip(data["hourly"]["time"], data["hourly"]["soil_moisture_0_to_7cm"]):
        if v is not None:
            hourly[t[:10]].append(v)
    soil = {d: sum(v) / len(v) for d, v in hourly.items()}
    return rain, soil


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    rows = nisar_products()
    first = (date.fromisoformat(rows[0]["data"]) - timedelta(days=3)).isoformat()
    last = min(date.fromisoformat(rows[-1]["data"]), date.today() - timedelta(days=2)).isoformat()
    rain, soil = weather(first, last)
    for r in rows:
        d = date.fromisoformat(r["data"])
        window = [(d - timedelta(days=i)).isoformat() for i in range(3)]
        vals = [rain.get(x) for x in window]
        r["deszcz_3dni_mm"] = round(sum(v or 0 for v in vals), 1) if any(v is not None for v in vals) else ""
        r["wilgotnosc_gleby_m3m3"] = round(soil[r["data"]], 3) if r["data"] in soil else ""
    out.parent.mkdir(parents=True, exist_ok=True)
    fields = ["data", "produkt", "orbita", "kierunek", "wersja", "pasmo_MHz", "rozmiar_GB",
              "deszcz_3dni_mm", "wilgotnosc_gleby_m3m3", "nazwa", "url_h5", "podglad_png"]
    with out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Zapisano {len(rows)} produktów do {out}")


if __name__ == "__main__":
    main()
