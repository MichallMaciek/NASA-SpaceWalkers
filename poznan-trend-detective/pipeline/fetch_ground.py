"""Download ground-truth and context data (no login needed).

1. NASA POWER (MERRA-2 based) monthly 2 m air temperature at Poznan, 1981-2025.
2. IMGW-PIB monthly synoptic data for Poznan-Lawica (station 12330), 1966-2024:
   mean temperature, mean daily max, mean daily min.
3. GUS Bank Danych Lokalnych (BDL): population and new dwellings completed per
   municipality, 1995-2025.

Output: data/raw/power_t2m.json, data/raw/imgw_poznan.json, data/raw/gus.json
"""
import csv
import io
import json
import time
import urllib.parse
import urllib.request
import zipfile

from common import POZNAN_POINT, RAW, USER_AGENT

IMGW = ("https://danepubliczne.imgw.pl/data/dane_pomiarowo_obserwacyjne/"
        "dane_meteorologiczne/miesieczne/synop/")
STATION = "352160330"  # Poznan-Lawica in IMGW synop files ("330" = WMO 12330)


def get(url, binary=False, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                return data if binary else data.decode("utf-8")
        except Exception as e:
            err = e
            time.sleep(2 + attempt * 3)
    raise err


def fetch_power():
    lon, lat = POZNAN_POINT
    url = ("https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,T2M_MAX,T2M_MIN"
           f"&community=RE&longitude={lon}&latitude={lat}&start=1981&end=2025&format=JSON")
    d = json.loads(get(url))
    json.dump(d["properties"]["parameter"], open(RAW / "power_t2m.json", "w"))
    print("POWER ok", len(d["properties"]["parameter"]["T2M"]))


def imgw_folders():
    folders = ["1966_1970", "1971_1975", "1976_1980", "1981_1985", "1986_1990",
               "1991_1995", "1996_2000"] + [str(y) for y in range(2001, 2025)]
    return folders


def fetch_imgw():
    rows = {}
    for f in imgw_folders():
        z = zipfile.ZipFile(io.BytesIO(get(f"{IMGW}{f}/{f}_m_s.zip", binary=True)))
        for name in z.namelist():
            if not name.startswith("s_m_d"):
                continue  # s_m_d = temperature extremes and means
            text = z.read(name).decode("cp1250")
            for r in csv.reader(io.StringIO(text)):
                if len(r) < 14 or "POZNA" not in r[1].upper():
                    continue
                year, month = int(r[2]), int(r[3])

                def num(i):
                    try:
                        return float(r[i].replace(",", "."))
                    except ValueError:
                        return None
                # TMAX, WTMAX, TMXS, WTMXS, TMIN, WTMIN, TMNS, WTMNS, STM, WSTM
                rows[f"{year}-{month:02d}"] = {
                    "station": r[1].strip(), "tmean": num(12), "tmax_mean": num(6), "tmin_mean": num(10)}
        print("IMGW", f, len(rows), flush=True)
    json.dump(rows, open(RAW / "imgw_poznan.json", "w"), ensure_ascii=False)


GUS_UNITS = {
    "Poznań": "023016264011",
}
SUBURBS = ["Luboń", "Puszczykowo", "Komorniki", "Suchy Las", "Tarnowo Podgórne", "Dopiewo",
           "Rokietnica", "Swarzędz", "Czerwonak", "Kórnik", "Mosina", "Stęszew", "Kleszczewo",
           "Murowana Goślina", "Pobiedziska", "Kostrzyn", "Buk"]
GUS_VARS = {"population": 72305, "dwellings_completed": 748601}


def bdl(path):
    url = "https://bdl.stat.gov.pl/api/v1/" + path
    out = json.loads(get(url, headers={"Accept": "application/json"}))
    time.sleep(0.6)  # stay well below the anonymous rate limit
    return out


def fetch_gus():
    units = dict(GUS_UNITS)
    for name in SUBURBS:
        res = bdl("units/search?" + urllib.parse.urlencode(
            {"name": name, "level": 6, "format": "json", "page-size": 50}))
        # powiat poznanski = 023016121; keep exact name matches only
        cands = [r for r in res.get("results", [])
                 if r["id"].startswith("023016121") and r["name"].split(" - ")[0].strip() == name]
        # prefer whole municipality (urban-rural kind 3, urban 1, rural 2)
        cands.sort(key=lambda r: {"3": 0, "1": 1, "2": 2}.get(str(r.get("kind")), 9))
        if cands:
            units[name] = cands[0]["id"]
        else:
            print("GUS unit not found", name)
    out = {}
    for name, uid in units.items():
        out[name] = {"unit_id": uid}
        for key, var in GUS_VARS.items():
            d = bdl(f"data/by-unit/{uid}?var-id={var}&format=json&page-size=100")
            vals = d["results"][0]["values"] if d.get("results") else []
            out[name][key] = {v["year"]: v["val"] for v in vals}
        print("GUS", name, uid, len(out[name]["population"]), len(out[name]["dwellings_completed"]),
              flush=True)
    json.dump(out, open(RAW / "gus.json", "w"), ensure_ascii=False)


if __name__ == "__main__":
    fetch_power()
    fetch_imgw()
    fetch_gus()
