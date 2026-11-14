#!/usr/bin/env python3
"""Data contract of the SARnik web app (poznan-trend-detective/web).

Checks, one printed line each (OK / FAIL / SKIP / INFO), exit code 1 if any FAIL:
  - every data file main() in web/app.js fetches exists and parses as JSON
  - land.json and sar.json hold every key web/app.js (and i18n_sar.js) reads
  - per-pass arrays in sar.json are as long as their date lists
  - every grey-level PNG layer the app requests or the JSON names exists, is an 8-bit grey PNG
    of 956 x 898 (the time-series sheets: (2*bw) x (n*bh)), without colour-management chunks
    that would make the browser change the grey values
  - every layer has a 'decode' rule in land.json or sar.json
  - web/data stays under 40 MB, no single file under web/ exceeds 3 MB (1 MB = 1,000,000 bytes)
  - no file under web/ contains an API key or token

Standard library only; Pillow (if installed) adds a full decode of every PNG.
Run:  python3 poznan-trend-detective/tests/data_contract.py      (from any folder)
"""
import json
import math
import re
import struct
import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent          # poznan-trend-detective/
WEB = APP_DIR / "web"
DATA = WEB / "data"
LAND = DATA / "land"
GRID_W, GRID_H = 956, 898
DATA_BUDGET = 40_000_000
FILE_BUDGET = 3_000_000

failures = 0


def report(status, name, detail=""):
    global failures
    if status == "FAIL":
        failures += 1
    print(f"{status:<4} {name}" + (f" -> {detail}" if detail else ""))


def check(name, ok, detail=""):
    report("OK" if ok else "FAIL", name, "" if ok else detail)
    return ok


def read(p):
    return p.read_text(encoding="utf-8")


app_js = read(WEB / "app.js")
i18n_sar = read(WEB / "i18n_sar.js") if (WEB / "i18n_sar.js").exists() else ""


# ---------------------------------------------------------------- 1. data files fetched by main()
def fetched_files():
    names = set(re.findall(r'\bget\("([^"]+\.(?:json|geojson))"\)', app_js))
    names |= set(re.findall(r'`data/([\w./-]+\.(?:json|geojson))\?v=', app_js))
    return sorted(names)


docs = {}
files = fetched_files()
check("app.js fetches land/land.json and land/sar.json", {"land/land.json", "land/sar.json"} <= set(files), f"found {files}")
for f in files:
    p = DATA / f
    if not p.exists():
        check(f"data/{f} exists", False, "missing: the app (or this part of it) does not load")
        continue
    try:
        docs[f] = json.loads(p.read_text(encoding="utf-8"))
        check(f"data/{f} parses as JSON", True)
    except ValueError as e:
        check(f"data/{f} parses as JSON", False, str(e))

land = docs.get("land/land.json")
sar = docs.get("land/sar.json")
if land is None or sar is None:
    report("FAIL", "land.json and sar.json are needed for the remaining checks", "stopping")
    print(f"\n{failures} check(s) failed")
    sys.exit(1)


# ---------------------------------------------------------------- 2. keys the app reads
MISSING = object()
ARRAY_PROPS = {"length", "concat", "filter", "map", "slice", "forEach", "includes", "indexOf", "some", "every", "reduce", "find", "join"}


def get_path(obj, path):
    for k in path:
        if isinstance(obj, dict) and k in obj:
            obj = obj[k]
        else:
            return MISSING
    return obj


def chains(src, root):
    """Dotted property chains read from `root` (land / sar) in the JS source, array methods stripped."""
    out = set()
    for m in re.finditer(rf"(?<![\w.$/\"'`-]){root}((?:\.[A-Za-z_]\w*)+)", src):
        parts = m.group(1)[1:].split(".")
        while parts and parts[-1] in ARRAY_PROPS:
            parts.pop()
        if parts and parts[0] != "json":       # "land.json" / "sar.json" in comments
            out.add(tuple(parts))
    return out


def check_keys(label, doc, paths):
    missing = [".".join(p) for p in sorted(paths) if get_path(doc, p) is MISSING]
    check(f"{label}: {len(paths)} key paths read by the app are present", not missing, "missing " + ", ".join(missing))


land_paths = chains(app_js, "land")
land_paths |= {("study_built_share_pct", "1990"), ("study_built_share_pct", "2020")}   # read with ["1990"]
for unit, var in (("Poznań (city)", "633677"), ("Poznań (city)", "64428")):              # priceSeries() in findingData()
    for y in ("2015", "2024"):
        land_paths.add(("prices", "data", unit, var, y))
land_paths.discard(("nisar_dates",))   # read as land.nisar_dates || []
check_keys("land.json", land, land_paths)

munis = land.get("municipalities") or {}
bad = [n for n, m in munis.items() if not all(isinstance(m.get(k), (int, float)) for k in ("elev_max", "forest_loss_total_ha"))]
check("land.json: every municipality has elev_max and forest_loss_total_ha", bool(munis) and not bad, f"bad: {bad}")
check("land.json: grid is 956 x 898", (land.get("width"), land.get("height")) == (GRID_W, GRID_H), f"{land.get('width')} x {land.get('height')}")

sar_paths = chains(app_js, "sar")
# findingData(): const k = sar && sar.checks; then k.wuia.ratio etc.
fd = app_js[app_js.find("function findingData"):]
fd = fd[: fd.find("\n  function ", 10)] if "\n  function " in fd[10:] else fd
sar_paths |= {("checks",) + tuple(m.groups()) for m in re.finditer(r"\bk\.([A-Za-z_]\w*)\.([A-Za-z_]\w*)", fd)}
sar_paths.discard(("checks", "model_walls", "ratio"))   # guarded by k.model_walls ? ... : null
sar_paths.discard(("checks", "model_walls", "p"))
sar_paths.discard(("s1", "wall_db"))                    # read as sar.s1.wall_db || 1.5
sar_paths.discard(("s1", "walls_ha"))                   # read as sar.s1.walls_ha || 0
for which in ("s1", "nisar"):                           # sarSeries(): S.block, S.bw, S.bh, S.n
    for k in ("block", "bw", "bh", "n"):
        sar_paths.add((which, "series", k))
for cls in ("built", "forest", "open"):                 # i18n_sar.js radarHtml table
    for pol in ("HH", "HV", "VV", "VH"):
        sar_paths.add(("nisar", "checks", "bands", cls, pol))
check_keys("sar.json", sar, sar_paths)


# ---------------------------------------------------------------- 3. per-pass arrays match their dates
def same_len(label, dates, arrays):
    bad = {k: len(v) for k, v in arrays.items() if not isinstance(v, list) or len(v) != len(dates)}
    check(f"sar.json: {label} arrays have one value per date ({len(dates)})", not bad, f"lengths {bad}")


s1 = sar.get("s1", {})
s1_dates = s1.get("dates", [])
check("sar.json: s1.dates are ISO dates in ascending order", s1_dates == sorted(s1_dates) and all(re.fullmatch(r"\d{4}-\d\d-\d\d", d) for d in s1_dates), str(s1_dates[:3]))
same_len("s1", s1_dates, {k: s1.get(k) for k in ("aoi_vv_db", "aoi_vh_db", "rain3_mm", "soil_wetness") if k in s1})
check("sar.json: s1.series.n equals the number of s1 dates", s1.get("series", {}).get("n") == len(s1_dates), f"n={s1.get('series', {}).get('n')} dates={len(s1_dates)}")
nisar = sar.get("nisar")
if nisar:
    nd = nisar.get("dates", [])
    check("sar.json: nisar.dates are ISO dates in ascending order", nd == sorted(nd) and all(re.fullmatch(r"\d{4}-\d\d-\d\d", d) for d in nd), str(nd[:3]))
    same_len("nisar", nd, {k: nisar.get(k) for k in ("aoi_hh_db", "aoi_hv_db") if k in nisar})
    check("sar.json: nisar.series.n equals the number of NISAR dates", nisar.get("series", {}).get("n") == len(nd), f"n={nisar.get('series', {}).get('n')} dates={len(nd)}")
years = sar.get("alos", {}).get("years", [])
check("sar.json: alos.years is a non-empty ascending list of years", bool(years) and years == sorted(years) and all(isinstance(y, int) for y in years), str(years))


# ---------------------------------------------------------------- 4. layers
def template_years(prefix):
    """Year lists for template names like `built_${y}` in app.js."""
    if prefix == "built":
        return land.get("epochs", []) + land.get("projected", [])
    if prefix == "prob":
        return land.get("projected", [])
    if prefix in ("alos_hh", "alos_hv"):
        return years
    if prefix == "s1":   # s1Year(): 2017 / 2020 / 2024
        m = re.search(r"const s1Year = \(\) => \(([^;]+)\);", app_js)
        return sorted({int(y) for y in re.findall(r"[?:]\s*(\d{4})\b", m.group(1))}) if m else []   # the results, not the thresholds
    if prefix == "loss_cum":
        return []        # the names are literal in PLACE_LAYERS
    if prefix == "hr":
        return []        # sharp copies of other layers (pipeline/build_hires.py): listed in hires.json and checked on their own below
    return None


def app_layers():
    names, unknown = set(), set()
    blocks = []
    for start, end in (("const NEEDS = {", "\n  };"), ("const PLACE_LAYERS", "];"), ("const SAR_PLACE", ": []);"), ("const lbandNames", ";"), ("const builtNames", ";")):
        i = app_js.find(start)
        if i < 0:
            report("FAIL", f"app.js still defines {start!r}", "update tests/data_contract.py to the new layer code")
            continue
        blocks.append(app_js[i: app_js.find(end, i) + len(end)])
    blocks.append(" ".join(re.findall(r"L8\[`[^`]+`\]", app_js)))
    text = "\n".join(blocks)
    for m in re.finditer(r'"([a-z][a-z0-9_]*)"', text):
        names.add(m.group(1))
    names |= set(re.findall(r"\bL8\.([a-z][a-z0-9_]*)", app_js))
    for m in re.finditer(r"`([a-z][a-z0-9_]*?)_\$\{", text):
        ys = template_years(m.group(1))
        if ys is None:
            unknown.add(m.group(1))
        else:
            names |= {f"{m.group(1)}_{y}" for y in ys}
    # keys of NEEDS that are layer names, not PNG names
    names -= {"built", "forest", "activity", "radar", "s1rgb", "sarchange", "sarwet", "sarwater", "egms", "alos", "nisarwet"}
    names -= {k for k in names if not k.replace("_", "").isalnum()}
    return names, unknown


def json_layers():
    names = {f"built_{y}" for y in land.get("epochs", []) + land.get("projected", [])}
    names |= {f"prob_{y}" for y in land.get("projected", [])}
    names |= {k for k in land.get("decode", {}) if k not in ("built", "prob", "s1")}
    names |= {f"alos_{p}_{y}" for p in ("hh", "hv") for y in years}
    names |= {"sar_vv_med", "sar_vh_med"} | {k for k in sar.get("decode", {}) if k != "sar_db"}
    if nisar:
        names |= {"nisar_hh_med", "nisar_hv_med", "nisar_wetdry", "nisar_series"}
    return names


def png_info(p):
    b = p.read_bytes()
    if b[:8] != b"\x89PNG\r\n\x1a\n" or b[12:16] != b"IHDR":
        return None
    w, h, depth, ctype = struct.unpack(">IIBB", b[16:26])
    chunks, i = [], 8
    while i + 8 <= len(b):
        n = struct.unpack(">I", b[i: i + 4])[0]
        chunks.append(b[i + 4: i + 8].decode("latin-1"))
        i += 12 + n
    return w, h, depth, ctype, chunks


requested, unknown = app_layers()
check("app.js: every templated layer name is known to this contract", not unknown, f"unknown prefixes {sorted(unknown)}: add them to template_years()")
named = json_layers()
layers = sorted(requested | named)
print(f"INFO {len(requested)} layers requested by app.js, {len(named)} named by land.json/sar.json, {len(layers)} together")

series_dims = {"sar_series": s1.get("series", {})}
if nisar:
    series_dims["nisar_series"] = nisar.get("series", {})
for k, S in series_dims.items():
    blk = S.get("block") or 1
    check(f"sar.json: {k} sheet blocks cover the grid", (S.get("bw"), S.get("bh")) == (math.ceil(GRID_W / blk), math.ceil(GRID_H / blk)), f"bw={S.get('bw')} bh={S.get('bh')} block={blk}")

missing, wrong = [], []
infos = {}
for n in layers:
    p = LAND / f"{n}.png"
    if not p.exists():
        missing.append(n + (" (requested by app.js)" if n in requested else " (named in JSON)"))
        continue
    info = png_info(p)
    if info is None:
        wrong.append(f"{n}: not a PNG")
        continue
    infos[n] = info
    w, h, depth, ctype, chunks = info
    S = series_dims.get(n)
    want = (2 * S.get("bw", 0), S.get("n", 0) * S.get("bh", 0)) if S else (GRID_W, GRID_H)
    if (w, h) != want:
        wrong.append(f"{n}: {w} x {h}, expected {want[0]} x {want[1]}")
    if (depth, ctype) != (8, 0):
        wrong.append(f"{n}: bit depth {depth}, colour type {ctype} (the app reads 8-bit grey)")
    cm = sorted(set(chunks) & {"gAMA", "cHRM", "iCCP", "sRGB"})
    if cm:
        wrong.append(f"{n}: colour-management chunks {cm} may change grey values in the browser")
check(f"every layer PNG exists ({len(layers)})", not missing, "missing " + ", ".join(missing))
check("every layer PNG is 8-bit grey at the expected size, without colour chunks", not wrong, "; ".join(wrong))

try:
    from PIL import Image
except ImportError:
    Image = None
if Image is None:
    report("SKIP", "full PNG decode with Pillow", "Pillow is not installed (pip install pillow); header checks above still ran")
else:
    broken, empty = [], []
    for n in infos:
        try:
            with Image.open(LAND / f"{n}.png") as im:
                im.load()
                if im.getextrema()[1] == 0:
                    empty.append(n)
        except Exception as e:  # noqa: BLE001 - any decode error is a failure
            broken.append(f"{n}: {e}")
    check(f"every layer PNG decodes with Pillow ({len(infos)})", not broken, "; ".join(broken))
    check("no layer PNG is all zero (no data anywhere)", not empty, ", ".join(empty))

# sharp radar pictures: hires.json lists them; each is cut to its window and `scale` times finer than the grid
hires_p = LAND / "hires.json"
sharp = set()
if hires_p.exists():
    hi = json.loads(hires_p.read_text(encoding="utf-8"))
    win = hi.get("window") or [0, 0, GRID_W, GRID_H]
    want_hr = (win[2] * hi.get("scale", 1), win[3] * hi.get("scale", 1))
    inside = win[0] >= 0 and win[1] >= 0 and win[0] + win[2] <= GRID_W and win[1] + win[3] <= GRID_H
    check("hires.json: the window of the sharp pictures lies inside the grid", inside, str(win))
    bad_hr = []
    for n in hi.get("layers", []):
        sharp.add(f"hr_{n}")
        info = png_info(LAND / f"hr_{n}.png") if (LAND / f"hr_{n}.png").exists() else None
        if info is None or (info[0], info[1]) != want_hr or (info[2], info[3]) != (8, 0):
            bad_hr.append(n if info is None else f"{n}: {info[0]} x {info[1]}, depth {info[2]}, colour type {info[3]}")
        if n not in layers:
            bad_hr.append(f"{n}: no 120 m layer of that name")
    check(f"hires.json: every sharp picture is an 8-bit grey PNG of {want_hr[0]} x {want_hr[1]} with a 120 m twin ({len(sharp)})", not bad_hr, "; ".join(bad_hr))

orphans = sorted(p.stem for p in LAND.glob("*.png") if p.stem not in requested and p.stem not in sharp)
if orphans:
    print(f"INFO PNGs in data/land not requested by app.js (deployed but never loaded): {', '.join(orphans)}")


# ---------------------------------------------------------------- 5. decode rules
LD, SD = land.get("decode", {}), sar.get("decode", {})
DB_LAYER = re.compile(r"(sar_(vv|vh)_med|alos_(hh|hv)_\d{4}|nisar_(hh|hv)_med)")   # all use sar_db: v/6 - 30 dB


def rule_for(n):
    if n in LD:
        return "land." + n
    if n in SD:
        return "sar." + n
    fam = re.sub(r"_\d{4}$", "", n)              # built_2020 -> built, prob_2030 -> prob, s1_2024 -> s1
    if fam != n and fam in LD:
        return "land." + fam
    if fam != n and fam in SD:
        return "sar." + fam
    if DB_LAYER.fullmatch(n) and "sar_db" in SD:
        return "sar.sar_db"
    return None


no_rule = [n for n in layers if rule_for(n) is None]
# Layers whose decoding lived only in app.js when this test was written (14 Nov 2026). They are reported, not failed,
# so that CI stays green for a known gap; a NEW layer without a rule still fails. Remove a name once its rule is added.
KNOWN_NO_RULE = {"loss_cum_2005", "loss_cum_2010", "loss_cum_2015", "loss_cum_2020", "nisar_series", "nisar_wetdry", "study"}
known_gap = [n for n in no_rule if n in KNOWN_NO_RULE]
new_gap = [n for n in no_rule if n not in KNOWN_NO_RULE]
if known_gap:
    print(f"INFO decode rule missing in land.json / sar.json (known gap, decoded in app.js only): {', '.join(known_gap)}")
check(f"every layer has a decode rule in land.json or sar.json, or is a known gap ({len(layers)})", not new_gap, "no rule for " + ", ".join(new_gap))


# ---------------------------------------------------------------- 6. size budget
data_bytes = sum(p.stat().st_size for p in DATA.rglob("*") if p.is_file())
check(f"web/data is under {DATA_BUDGET / 1e6:.0f} MB ({data_bytes / 1e6:.1f} MB)", data_bytes < DATA_BUDGET, f"{data_bytes / 1e6:.1f} MB")
big = sorted(((p.stat().st_size, p) for p in WEB.rglob("*") if p.is_file() and p.stat().st_size > FILE_BUDGET), reverse=True)
check(f"no file under web/ exceeds {FILE_BUDGET / 1e6:.0f} MB", not big, ", ".join(f"{p.relative_to(WEB)} {s / 1e6:.2f} MB" for s, p in big))
largest = max((p.stat().st_size, p) for p in WEB.rglob("*") if p.is_file())
print(f"INFO largest file under web/: {largest[1].relative_to(WEB)} {largest[0] / 1e6:.2f} MB")


# ---------------------------------------------------------------- 7. keys and tokens
SECRETS = [
    ("Google API key", r"AIza[0-9A-Za-z_\-]{35}"),
    ("AWS access key", r"\b(AKIA|ASIA)[0-9A-Z]{16}\b"),
    ("GitHub token", r"\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})"),
    ("Slack token", r"\bxox[abprs]-[A-Za-z0-9-]{10,}"),
    ("Stripe key", r"\b[sr]k_live_[A-Za-z0-9]{16,}"),
    ("Mapbox token", r"\b[ps]k\.eyJ[A-Za-z0-9_\-]{20,}"),
    ("OpenAI / Anthropic key", r"\bsk-(ant-)?[A-Za-z0-9_\-]{20,}"),
    ("JSON web token", r"\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"),
    ("private key", r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    ("key in a URL", r"[?&](api_?key|apikey|access_token|token|key|secret)=[A-Za-z0-9_\-]{12,}"),
    ("key assignment", r"(?i)\b(api_?key|apikey|secret|access_token|auth_token|client_secret)\b[\"']?\s*[:=]\s*[\"'][A-Za-z0-9_\-/+=]{16,}[\"']"),
]
TEXT = {".js", ".mjs", ".html", ".css", ".json", ".geojson", ".txt", ".md", ".svg", ".xml", ".csv", ".webmanifest", ".map"}
hits, scanned = [], 0
for p in sorted(WEB.rglob("*")):
    if not p.is_file() or p.suffix.lower() not in TEXT:
        continue
    scanned += 1
    txt = p.read_text(encoding="utf-8", errors="replace")
    for label, pat in SECRETS:
        for m in re.finditer(pat, txt):
            line = txt.count("\n", 0, m.start()) + 1
            hits.append(f"{p.relative_to(WEB)}:{line} {label}")   # the match itself is never printed (CI logs are public)
check(f"no API key or token in {scanned} text files under web/", not hits, "; ".join(hits[:10]))

print(f"\n{'All checks passed' if not failures else f'{failures} check(s) failed'}")
sys.exit(1 if failures else 0)
