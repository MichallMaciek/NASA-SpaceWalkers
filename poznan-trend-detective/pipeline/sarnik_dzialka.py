"""Building-permit history per cadastral parcel for the "dzialka" card module (Poznan and the county of Poznan).

Source: GUNB RWDZ (Rejestr Wniosków, Decyzji i Zgłoszeń), open data, CC0, one CSV per voivodeship:
  https://wyszukiwarka.gunb.gov.pl/pliki_pobranie/wynik_wielkopolskie.zip  (unpack to data/raw/rwdz/x/)
The CSV also holds names of investors and designers: none of that leaves this script. The output keeps only the parcel
number, the year and the kind of work.

Output: web/data/sarnik/dzialka/<unit>_<obreb>.json, one small file per cadastral district (obręb), so the app loads
only the district of the parcel the user clicked. One line per parcel, packed into one string to save bytes
(a JSON object per parcel was 40% larger):
  {"rows": "<parcel number>,<new buildings>,<extensions>,<demolitions>,<last year - 2000>\n..."}   (0 is written as "")
plus meta.json (source, date of the file, counts, and the list of district files: a district without a file has no
case in the register). Parcel ids follow the land register: <unit>.<obręb>.<number>,
the same as the "teryt" field returned by the GUGiK ULDK service (which may add a map sheet, "AR_n", in between).

Run (isolated interpreter, the CSV is downloaded data):  .venv/bin/python -I pipeline/sarnik_dzialka.py
"""
import collections
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # -I drops the script folder from the path
from common import RAW, WEB_DATA  # noqa: E402

SRC = RAW / "rwdz" / "x" / "wynik_wielkopolskie.csv"
OUT = WEB_DATA / "sarnik" / "dzialka"
UNITS = ("3064", "3021")   # city of Poznan, county of Poznan (TERYT)
KIND = {  # nazwa_zamierzenia_bud -> column
    "budowa nowego/nowych obiektów budowlanych": 0,
    "rozbudowa istniejącego/istniejących obiektów budowlanych": 1,
    "nadbudowa istniejącego/istniejących obiektów budowlanych": 1,
    "odbudowa istniejącego/istniejących obiektów budowlanych": 1,
    "rozbiórka istniejącego obiektu budowlanego": 2,
}


def main():
    if not SRC.exists():
        sys.exit(f"missing {SRC}: download wynik_wielkopolskie.zip from GUNB and unpack it there")
    f = open(SRC, encoding="utf-8-sig", newline="")
    rows = csv.reader(f, delimiter=";")
    hdr = next(rows)
    ix = {h: i for i, h in enumerate(hdr) if h not in ("cecha", "ulica")}
    parcels = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0, 0, 0]))
    years, used = collections.Counter(), 0
    for row in rows:
        if len(row) < len(hdr):
            continue
        unit = row[ix["jednosta_numer_ew"]].strip()
        if not unit.startswith(UNITS):
            continue
        k = KIND.get(row[ix["nazwa_zamierzenia_bud"]].strip())
        if k is None:
            continue
        ob = row[ix["obreb_numer"]].strip()
        y = (row[ix["data_wydania_decyzji"]] or row[ix["data_wplywu_wniosku"]])[:4]
        y = int(y) if y.isdigit() else 0
        for num in row[ix["numer_dzialki"]].replace(" ", "").split(","):
            if not num or not ob:
                continue
            rec = parcels[f"{unit}_{ob}"][num]
            rec[k] += 1
            rec[3] = max(rec[3], y)
        used += 1
        years[y] += 1
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.json"):
        old.unlink()
    total = 0
    cell = lambda v: str(v) if v else ""
    for district, d in parcels.items():
        p = OUT / f"{district}.json"
        rows = "\n".join(f"{num},{cell(r[0])},{cell(r[1])},{cell(r[2])},{cell(r[3] % 100 if r[3] else 0)}"
                         for num, r in sorted(d.items()))
        p.write_text(json.dumps({"rows": rows}, ensure_ascii=False), encoding="utf-8")
        total += p.stat().st_size
    meta = {"source": "GUNB RWDZ (Rejestr Wniosków, Decyzji i Zgłoszeń), open data CC0, file wynik_wielkopolskie.csv",
            "file_date": "2026-11-14", "area": "city of Poznan (3064) and county of Poznan (3021)",
            "kinds": ["new buildings", "extensions (rozbudowa, nadbudowa, odbudowa)", "demolitions"],
            "record": "rows: parcel number, new buildings, extensions, demolitions, last year - 2000 (empty = 0)", "years": [min(y for y in years if y), max(years)],
            "rows_used": used, "parcels": sum(len(d) for d in parcels.values()), "districts": len(parcels),
            "personal_data": "none: investor and designer names are dropped",
            "files": sorted(parcels)}
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{meta['parcels']} parcels in {len(parcels)} districts from {used} rows; {total / 1e6:.2f} MB in total")


if __name__ == "__main__":
    main()
