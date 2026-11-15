"""Outlines of the cadastral districts (obręby) that have a case in the building-permit register, for the
register test of the radar change after 2020 (check `pozwolenia_gunb` in sarnik_radar_lata.py).

Which districts: one per file in web/data/sarnik/dzialka/ (file name <unit>_<obręb>, e.g. 306401_1_0010 for the
district TERYT 306401_1.0010), i.e. every district of the city and county of Poznań with at least one case in GUNB RWDZ.

Source: GUGiK ULDK (public, no key), the same service the app uses:
  https://uldk.gugik.gov.pl/?request=GetRegionById&id=<district TERYT>&result=geom_wkt&srid=4326
The answer is a status line ("0" = found, "-1 brak wyników" = no such district) followed by one or more lines
"SRID=4326;MULTIPOLYGON(...)" (or POLYGON); several lines are parts of one district and are merged. Only the
district code is sent.

Politeness: sequential requests, a short pause between them, retries with back-off on network errors. Resumable:
every answer (found or not found) is appended to data/raw/radar/obreby_cache.jsonl and skipped on the next run;
network failures are not cached, so a re-run retries them.

Output (git-ignored): data/raw/radar/obreby.geojson, one feature per found district, properties {teryt, file, unit}.
Run:  .venv/bin/python -I pipeline/sarnik_radar_lata_obreby.py
"""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # -I drops the script folder from the path
from common import RAW, USER_AGENT, WEB_DATA  # noqa: E402

DZIALKA = WEB_DATA / "sarnik" / "dzialka"
OUT_DIR = RAW / "radar"
CACHE = OUT_DIR / "obreby_cache.jsonl"
OUT = OUT_DIR / "obreby.geojson"
URL = "https://uldk.gugik.gov.pl/"
PAUSE = 0.4            # seconds between requests
RETRIES = 4            # attempts per district on network / server errors
BACKOFF = 2.0          # seconds, doubled after each failed attempt
MAX_FAIL_RUN = 5       # consecutive districts failing on the network: the service is down, stop
TERYT_RE = re.compile(r"^\d{6}_\d_\d{4}$")


def district_ids():
    files = json.loads((DZIALKA / "meta.json").read_text(encoding="utf-8"))["files"]
    out = []
    for f in files:
        if not TERYT_RE.match(f):
            print(f"skipping unexpected file name {f!r}")
            continue
        out.append((f, f[:8] + "." + f[9:]))   # 306401_1_0010 -> 306401_1.0010
    return out


def fetch(teryt):
    """Returns (status, text). status: 'found', 'absent' (service says no such district) or raises on network error."""
    q = urllib.parse.urlencode({"request": "GetRegionById", "id": teryt, "result": "geom_wkt", "srid": "4326"})
    req = urllib.request.Request(f"{URL}?{q}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8", "replace")
    first, _, rest = body.partition("\n")
    first = first.strip()
    if first == "0":
        return "found", rest.strip()
    if first.startswith("-1"):
        return "absent", first
    raise RuntimeError(f"unexpected answer for {teryt}: {body[:120]!r}")


def fetch_retry(teryt):
    wait = BACKOFF
    for attempt in range(1, RETRIES + 1):
        try:
            return fetch(teryt)
        except (urllib.error.URLError, TimeoutError, ConnectionError, RuntimeError, OSError) as e:
            if attempt == RETRIES:
                raise
            print(f"  {teryt}: {type(e).__name__}: {str(e)[:100]}; retry in {wait:.0f} s")
            time.sleep(wait)
            wait *= 2


def wkt_to_geojson(wkt):
    """'SRID=4326;MULTIPOLYGON(((x y,...)),...)' or 'POLYGON((x y,...))' -> GeoJSON geometry (lon, lat)."""
    wkt = wkt.split(";", 1)[1] if wkt.upper().startswith("SRID=") else wkt
    m = re.match(r"\s*(MULTIPOLYGON|POLYGON)\s*(\(.*\))\s*$", wkt, re.S | re.I)
    if not m:
        raise ValueError(f"unsupported geometry: {wkt[:60]!r}")
    kind, body = m.group(1).upper(), m.group(2)
    num = r"-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?"
    js = re.sub(rf"({num})\s+({num})", r"[\1,\2]", body).replace("(", "[").replace(")", "]")
    coords = json.loads(js)
    return {"type": "MultiPolygon" if kind == "MULTIPOLYGON" else "Polygon", "coordinates": coords}


def merge(geoms):
    """Some districts come back as several WKT lines (separate parts): join them into one MultiPolygon."""
    if len(geoms) == 1:
        return geoms[0]
    polys = []
    for g in geoms:
        polys += g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    return {"type": "MultiPolygon", "coordinates": polys}


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ids = district_ids()
    done = {}
    if CACHE.exists():
        for line in CACHE.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rec = json.loads(line)
                done[rec["teryt"]] = rec
    todo = [(f, t) for f, t in ids if t not in done]
    print(f"{len(ids)} districts in the register, {len(done)} already answered, {len(todo)} to ask ULDK")
    fail_run, failed = 0, []
    with open(CACHE, "a", encoding="utf-8") as cache:
        for i, (f, t) in enumerate(todo, 1):
            try:
                status, text = fetch_retry(t)
            except Exception as e:  # noqa: BLE001 - network failure after all retries
                failed.append(t)
                fail_run += 1
                print(f"  {t}: failed after {RETRIES} attempts ({type(e).__name__}: {str(e)[:100]})")
                if fail_run >= MAX_FAIL_RUN:
                    sys.exit(f"ULDK ({URL}) unreachable: {fail_run} districts in a row failed. Saved answers are kept "
                             f"in {CACHE}; re-run later to continue.")
                time.sleep(PAUSE)
                continue
            fail_run = 0
            rec = {"teryt": t, "file": f, "status": status}
            if status == "found":
                rec["geometry"] = merge([wkt_to_geojson(w) for w in text.splitlines() if w.strip()])
            cache.write(json.dumps(rec, separators=(",", ":")) + "\n")
            cache.flush()
            done[t] = rec
            if i % 50 == 0 or i == len(todo):
                print(f"  {i}/{len(todo)} asked")
            time.sleep(PAUSE)
    feats = [{"type": "Feature", "properties": {"teryt": r["teryt"], "file": r["file"], "unit": r["teryt"][:6]},
              "geometry": r["geometry"]}
             for _, t in ids if (r := done.get(t)) and r["status"] == "found"]
    absent = sorted(t for _, t in ids if (r := done.get(t)) and r["status"] == "absent")
    OUT.write_text(json.dumps({"type": "FeatureCollection", "source": "GUGiK ULDK GetRegionById",
                               "features": feats}, separators=(",", ":")), encoding="utf-8")
    print(f"found {len(feats)} of {len(ids)} districts; ULDK has no district for {len(absent)} codes; "
          f"{len(failed)} failed on the network (re-run to retry). Wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")
    if absent:
        print("codes ULDK does not know:", " ".join(absent))


if __name__ == "__main__":
    main()
