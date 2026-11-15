"""Split web/app.js and web/styles.css into ordered parts (web/app/*.js, web/css/*.css) without changing a byte of code.

app.js is one arrow IIFE ("use strict" inside). Its body is cut at section markers and at a few function boundaries,
in order. Every part is a plain script with "use strict"; loaded in order, the parts share the page's global scope,
so every name stays visible to every part (as inside the IIFE). styles.css is cut at its section comments, in order,
so the cascade is unchanged. index.html gets one tag per part, in the same place and with the same ?v= number.

Boundaries are found by text (section markers, function names), not by line numbers, so the script can be run again
on a newer app.js. A boundary that is not found stops the script.

It was run once, on 15 Nov 2026, to make web/app/ and web/css/ from app.js and styles.css. It stays here because
tools/przenies_zmiany_app.py uses it to move changes made to the old files into the parts, and as the record of how
the parts were cut (tests/app_parts.mjs checks the rules the parts must keep).

usage: python3 podziel_app.py <web dir with app.js and styles.css> [--write]   (without --write: dry run)
"""
import json
import re
import sys
from pathlib import Path

WEB = Path(sys.argv[1]) if __name__ == "__main__" else None
WRITE = "--write" in sys.argv

# (file name, start pattern (None = start of the body), what is in it)
JS = [
    ("01-helpers.js", None, "helpers: DATA_V, fetchJSON, colour ramps, statistics (Theil-Sen, Mann-Kendall)"),
    ("02-geometry.js", r"^  /\* =+ data =+ \*/", "data: grid geometry, projections, cells, municipalities and flood polygons"),
    ("03-gray-layers.js", r"^  const grayLoading = \{\}", "grey-level PNG layers: decoding and loading (loadGray)"),
    ("04-built-up.js", r'^  const RL = "sarnik/radar_lata/first_year";', "built-up epochs: radar first year, smoothing, projection, heat ranks, grids, risk pool"),
    ("05-state.js", r"^  /\* =+ state =+ \*/", "state: the one state object, NISAR dates, hires and sar handles"),
    ("06-sarnik-ext.js", r"^  /\* =+ SARnik extensions", "SARnik extension modules: window.SARNIK, ctx, the module loader (docs/planwyd/KONTRAKT.md)"),
    ("07-layer-keys.js", r"^  const LAND_KEYS = ", "layer keys, L-band years, which views use the radar time line"),
    ("08-nisar-passes.js", r"^  // NISAR passes of summer 2026", "NISAR passes of summer 2026 (animation on the time line)"),
    ("09-layer-needs.js", r"^  // keep the area clear of the floating cards", "map padding, pixel layers and the data each layer needs (PIXEL, NEEDS), decoders, year helpers"),
    ("10-map-layers.js", r"^  /\* =+ map =+ \*/", "map: Leaflet layer handles, building decisions (WUiA), overlays, canvas and pixel layers"),
    ("11-base-map.js", r"^  /\* ---- base map: OpenFreeMap", "base map (OpenFreeMap vector tiles), theme, smooth wheel zoom"),
    ("12-map-init.js", r"^  let baseDead = false;", "map start (initMap), place names, base switch, radar colour stretch"),
    ("13-layers-hires.js", r"^  /\* =+ rendering of the data layers =+ \*/", "data layers, part 1: sharp (hires) radar pictures"),
    ("14-layers.js", r"^  function renderLand\(", "data layers, part 2: renderLand, choropleth, redraw, ensure"),
    ("15-timeline.js", r"^  /\* =+ timeline =+ \*/", "time line: years, radar axis, play"),
    ("16-legend.js", r"^  /\* =+ legend =+ \*/", "legend"),
    ("17-lenses.js", r"^  /\* =+ SAR mark", "SAR mark and the map views (lenses)"),
    ("18-drawer.js", r"^  /\* =+ drawer \(map settings\) =+ \*/", "drawer: map settings, layer switches, sliders"),
    ("19-hover.js", r"^  /\* =+ hover =+ \*/", "hover tooltip"),
    ("20-draw.js", r"^  /\* =+ drawing an area =+ \*/", "drawing an area (polygon, freehand)"),
    ("21-selection.js", r"^  /\* =+ selection: ", "selection: clear, cells in a ring, select a point or an area"),
    ("22-place-numbers.js", r"^  /\* ---- numbers for the selection ---- \*/", "numbers for the selection: built-up share, forest, risk, prices, heat"),
    ("23-radar-stats.js", r"^  /\* =+ radar numbers for a selection", "radar numbers for a selection (sarStats, sarSeries, radarChart)"),
    ("24-card.js", r"^  /\* =+ side card =+ \*/", "place card: renderCard, renderCardLoading"),
    ("25-card-checks.js", r"^  /\* ---- plain-language check-up", "place card: the plain check-up rows (plainChecks)"),
    ("26-card-pros-cons.js", r"^  function computeProsAndCons\(", "place card: pros and cons, place score 0-100"),
    ("27-card-checkup-view.js", r"^  function plainHTML\(", "place card: HTML of the plain check-up (plainHTML, riskHTML)"),
    ("28-card-technical.js", r'^  /\* ---- "technical inspection"', "place card: technical inspection, mini charts, 'more'"),
    ("29-findings.js", r"^  /\* =+ findings =+ \*/", "findings list (no place selected)"),
    ("30-trend-test.js", r"^  /\* =+ full trend test =+ \*/", "full trend test dialog"),
    ("31-search.js", r"^  /\* =+ search =+ \*/", "search box (Nominatim)"),
    ("32-main.js", r"^  /\* =+ i18n & wiring =+ \*/", "language, wiring of the controls, main(): start of the app (runs last)"),
]
CSS = [
    ("01-base.css", None, "colour variables (light, dark), base type"),
    ("02-search-tools.css", r"^/\* -+ top left: search \+ tools", "search box and drawing tools"),
    ("03-card.css", r"^/\* -+ side card -+ \*/", "place card, risk indicator, findings list"),
    ("04-top-right.css", r"^/\* -+ top right -+ \*/", "buttons top right"),
    ("05-drawer.css", r"^/\* -+ drawer -+ \*/", "drawer, toggle switch, sliders, segmented control"),
    ("06-legend.css", r"^/\* -+ legend -+ \*/", "legend"),
    ("07-timeline.css", r"^/\* -+ timeline -+ \*/", "time line"),
    ("08-map.css", r"^/\* -+ map details -+ \*/", "map details"),
    ("09-dialogs.css", r"^/\* -+ dialogs -+ \*/", "dialogs"),
    ("10-small-screens.css", r"^/\* -+ smaller screens -+ \*/", "smaller screens"),
    ("11-inspection-theme-draw.css", r"^/\* technical inspection checklist \*/", "technical checklist, theme change, drawing, tablets"),
    ("12-sarnik-v2-radar.css", r"^/\* =+ SARnik v2: radar =+ \*/", "SARnik v2: radar, 'How radar sees the ground'"),
    ("13-sarnik-v3-plain.css", r"^/\* =+ SARnik v3: plain language", "SARnik v3: lenses, plain check-up, modules, SAR mark, radar time line"),
    ("14-qa-fixes.css", r"^/\* =+ QA pass \(14 Nov 2026\)", "QA fixes of 14 Nov, short screens, phones"),
    ("15-nisar-banner.css", r"^/\* NISAR 2026 ground banner", "NISAR 2026 banner in the card"),
    ("16-score.css", r"^/\* Overall spot score card \*/", "place score card"),
    ("17-pros-cons.css", r"^/\* Pros and Cons", "pros and cons"),
]

JS_HEAD = """// SARnik core, part {n} of {total}: {what}.
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
"""
# every part after the first: stop at once when part 01 stopped (Leaflet or the texts missing), as the old file did
STOP_LINE = 'if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load\n'
# the old file stopped with a bare `return;` inside its IIFE; a part is a plain script, where `return` is a syntax error
GUARD_OLD = """  if (!window.L || !window.I18N) {
    console.error("SARnik: Leaflet or the text files did not load");
    if (location.protocol !== "file:") renderLoadError();
    return;
  }
"""
GUARD_NEW = """  if (!window.L || !window.I18N) {
    console.error("SARnik: Leaflet or the text files did not load");
    if (location.protocol !== "file:") renderLoadError();
    // stop here and in every later part (their first line tests SARNIK_STOP); reported once, by the line above
    window.SARNIK_STOP = new Error("SARnik: stopped, Leaflet or the text files did not load");
    window.addEventListener("error", (e) => { if (e.error === window.SARNIK_STOP) e.preventDefault(); });
    throw window.SARNIK_STOP;
  }
"""
CSS_HEAD = "/* SARnik styles, part {n} of {total}: {what}. Loaded in order by index.html; rules: web/css/README.md */\n"


def cut(lines, plan, first, last):
    """Indices where each part starts; a boundary on a function also takes the comment lines just above it."""
    starts = []
    for name, pat, _ in plan:
        if pat is None:
            starts.append(first)
            continue
        hits = [i for i in range(first, last) if re.search(pat, lines[i])]
        if len(hits) != 1:
            sys.exit(f"{name}: pattern {pat!r} found {len(hits)} times")
        i = hits[0]
        while i - 1 > starts[-1] and re.match(r"^\s*//", lines[i - 1]):
            i -= 1
        starts.append(i)
    if starts != sorted(starts) or len(set(starts)) != len(starts):
        sys.exit(f"boundaries out of order: {starts}")
    return starts + [last]


def split_js(src=None):
    """Parts of app.js: [(file name, text, first old line, last old line, what)], and the source."""
    src = src if src is not None else (WEB / "app.js").read_text(encoding="utf-8")
    lines = src.split("\n")
    o = next(i for i, l in enumerate(lines) if l.startswith("(() => {"))
    assert lines[o + 1].strip() == '"use strict";', lines[o + 1]
    end = max(i for i, l in enumerate(lines) if l.startswith("})();"))
    assert all(not l.strip() for l in lines[end + 1:]), "code after the IIFE"
    head_comment = lines[:o]
    first, last = o + 2, end
    while not lines[first].strip():
        first += 1
    b = cut(lines, JS, first, last)
    parts = []
    for k, (name, _, what) in enumerate(JS):
        body = lines[b[k]:b[k + 1]]
        head = JS_HEAD.format(n=k + 1, total=len(JS), what=what)
        text = "\n".join(body) + "\n"
        if k == 0:
            head = "\n".join(head_comment) + "\n" + head
            assert text.count(GUARD_OLD) == 1, "the start-up guard of app.js changed: update GUARD_OLD"
            text = text.replace(GUARD_OLD, GUARD_NEW)
        else:
            head += STOP_LINE
        parts.append((name, head + text, b[k] + 1, b[k + 1], what))
    # the body of the IIFE, line for line, equals the parts without their headers
    assert sum((p[3] - p[2] + 1) for p in parts) == last - first
    return parts, src


def split_css(src=None):
    src = src if src is not None else (WEB / "styles.css").read_text(encoding="utf-8")
    lines = src.split("\n")
    last = len(lines)
    while not lines[last - 1].strip():
        last -= 1
    b = cut(lines, CSS, 0, last)
    parts = []
    for k, (name, _, what) in enumerate(CSS):
        body = lines[b[k]:b[k + 1]]
        parts.append((name, CSS_HEAD.format(n=k + 1, total=len(CSS), what=what) + "\n".join(body) + "\n", b[k] + 1, b[k + 1], what))
    return parts, src


def main():
    js, js_src = split_js()
    css, css_src = split_css()
    for title, parts in (("web/app/", js), ("web/css/", css)):
        print(title)
        for name, text, a, z, what in parts:
            print(f"  {name:32} old lines {a:5}-{z:<5} {z - a + 1:4} lines  {what[:70]}")
    html = (WEB / "index.html").read_text(encoding="utf-8")
    ms = re.search(r'^( *)<script src="app\.js\?v=(\d+)"></script>\n', html, re.M)
    mc = re.search(r'^( *)<link rel="stylesheet" href="styles\.css\?v=(\d+)">\n', html, re.M)
    assert ms and mc and ms[2] == mc[2], "app.js / styles.css tags not found or with different ?v="
    v = ms[2]
    tags_js = "".join(f'{ms[1]}<script src="app/{n}?v={v}"></script>\n' for n, *_ in js)
    tags_css = "".join(f'{mc[1]}<link rel="stylesheet" href="css/{n}?v={v}">\n' for n, *_ in css)
    html2 = html.replace(ms[0], tags_js).replace(mc[0], tags_css)
    split_map = {"from_commit_file": "web/app.js and web/styles.css",
                 "js": [{"file": f"app/{n}", "old_lines": [a, z], "what": w} for n, _, a, z, w in js],
                 "css": [{"file": f"css/{n}", "old_lines": [a, z], "what": w} for n, _, a, z, w in css]}
    if WRITE:
        (WEB / "app").mkdir(exist_ok=True)
        (WEB / "css").mkdir(exist_ok=True)
        for n, text, *_ in js:
            (WEB / "app" / n).write_text(text, encoding="utf-8")
        for n, text, *_ in css:
            (WEB / "css" / n).write_text(text, encoding="utf-8")
        (WEB / "index.html").write_text(html2, encoding="utf-8")
        (WEB / "app.js").unlink()
        (WEB / "styles.css").unlink()
        (WEB.parent / "tools" / "app_split_map.json").write_text(json.dumps(split_map, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print("written; app.js and styles.css removed")


def join_js(texts):
    """The inverse of split_js: app.js from the texts of the parts, in order (headers and stop lines dropped)."""
    head, body = [], []
    for k, t in enumerate(texts):
        lines = t.split("\n")
        s = lines.index('"use strict";')
        if k == 0:
            head = lines[:next(i for i, l in enumerate(lines) if l.startswith("// SARnik core, part 1 of"))]
        rest = lines[s + 1:]
        if rest and rest[0].startswith(STOP_LINE[:40]):
            rest = rest[1:]
        body += rest[:-1] if rest and rest[-1] == "" else rest
    text = "\n".join(body) + "\n"
    text = text.replace(GUARD_NEW, GUARD_OLD)
    return "\n".join(head) + '\n(() => {\n  "use strict";\n\n' + text + "})();\n"


def join_css(texts):
    """The inverse of split_css: styles.css from the texts of the parts, in order."""
    return "".join(t.split("\n", 1)[1] for t in texts)


if __name__ == "__main__":
    main()
