"""SARnik: the "what may be built next door" forecast, checked against radar and restarted from the radar state of 2026.

The app's forecast (pipeline/model_urban.py) is a logistic land-change model trained on the optical built-up map
(GHSL) for 2005->2010 and 2010->2015, tested on 2015->2020 and projected forward from the 2020 map. 2020 is six
years ago; radar (Sentinel-1, yearly) is the only source here that knows what was built since. This script:

  1. Reproduces the existing model (same functions, imported from model_urban.py; its main() is NOT run because
     it rewrites web/data/land/*): AUC on 2015->2020 and coefficients, compared with land.json -> model.
  2. prognoza_a_radar: tests the 2020-based model on years no optical map covers. Cells not built in the optical
     2020 map are scored with the model run on the 2020 state; the outcome is "radar dates the cell as first built
     in 2021-2026". AUC and the share of radar-new cells in the model's top 5 % versus the other 95 %, each with
     a 95 % interval from a block bootstrap (16 x 16 cell blocks, about 1.2 km on the ground). Also a fairer
     version: open cells (< 5 % built) that touch 2020 built-up.
  3. Starts from radar: the 2026 state = optical 2020 shares, with cells radar dates as first built in 2021-2026
     raised to at least new_cell_level (as model_urban.py builds a projected state); neighbourhood predictors are
     recomputed and the 5-year chance predicted for every cell still open in the study area. Compared with the
     app's current forecast (web/data/land/prob_2030.png, which starts from the model's own projected 2025).
  4. Writes prob_5y.png and meta.json (with every check) to data/raw/radar/radar_prognoza/ (git-ignored), or with
     --web to web/data/sarnik/radar_prognoza/, where the card module web/sarnik/radar_lata.js reads them once its
     forecast row is switched on.

Inputs (data/raw/ is git-ignored):
  * Predictors: data/raw/urban_grid.npz + data/raw/roads.json (pipeline/fetch_urban.py). If urban_grid.npz is
    missing, the static predictors are rebuilt from the app layers in web/data/land/ (built_<year>.png, dem.png,
    treecover2000.png); roads.json is still needed.
  * Radar built-up per year: data/raw/radar/built_years.npz (pipeline/sarnik_radar_lata.py). If it is missing, a
    clearly provisional stand-in is built from data/raw/radar/s1_<year>.npz and written to
    data/raw/radar/built_years_provisional.npz; meta.json then says "provisional": true.

Run:  .venv/bin/python -I pipeline/sarnik_radar_prognoza.py [--web]   (from poznan-trend-detective/)
"""
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # -I drops the script folder from the path

import numpy as np
from PIL import Image
from scipy import ndimage

from common import PROCESSED, RAW, WEB_DATA

LAND = WEB_DATA / "land"
RADAR = RAW / "radar"
# The outputs go to the git-ignored working folder unless --web is given: the card row that reads them is switched
# off (see FORECAST_ROW in sarnik_radar_lata.py), so the app does not ship a layer nobody reads.
WEB_OUT = WEB_DATA / "sarnik" / "radar_prognoza"
OUT = WEB_OUT if "--web" in sys.argv[1:] else RADAR / "radar_prognoza"
REAL_RADAR = RADAR / "built_years.npz"
PROV_RADAR = RADAR / "built_years_provisional.npz"

START_YEAR = 2026
HORIZON = 5
NEW_FROM, NEW_TO = 2021, 2026      # radar-dated first built years that no optical map covers
BLOCK = 16                         # bootstrap block, cells (16 x 73 m = about 1.2 km on the ground)
N_BOOT = 1000
SEED = 20261115
TOP_SHARE = 0.05
OPEN_SHARE = 0.05                  # "open land" as in model_urban.py's open-land test
SIZE_BUDGET = 250_000              # bytes for the whole output folder

# ---- pass criteria, declared before anything is computed ----
CRIT_REPRO = ("|AUC 2015-2020 - land.json| <= 0.005 and |open-land AUC - land.json| <= 0.010 "
              "(same model code; inputs re-downloaded or rebuilt)")
CRIT_RADAR = ("lower bound of the block-bootstrap 95 % interval of the top-5 % ratio "
              "(share of radar-new cells in the model's top 5 % / share in the other 95 %) > 2")
CRIT_RADAR_PL = ("dolna granica 95% przedziału (bootstrap blokowy) krotności: udział komórek nowych według radaru "
                 "w górnych 5% modelu podzielony przez udział w pozostałych 95% > 2")
RATIO_MIN = 2.0
REPRO_TOL_AUC, REPRO_TOL_OPEN = 0.005, 0.010


def die(msg):
    sys.exit(f"sarnik_radar_prognoza: {msg}")


# ------------------------------------------------------------------ inputs

def load_model_code():
    try:
        import model_urban as mu   # importing only defines functions (and makes web/data/land/, which exists)
    except ImportError as e:
        die(f"cannot import pipeline/model_urban.py ({e})")
    return mu


def load_grid(mu):
    """Grid transform, observed built-up shares per epoch, static predictors and their origin."""
    from affine import Affine
    land = json.load(open(LAND / "land.json", encoding="utf-8"))
    roads = RAW / "roads.json"
    if not roads.exists():
        die(f"missing {roads}: run pipeline/fetch_urban.py (roads come from OpenStreetMap / Overpass)")
    grid_npz = RAW / "urban_grid.npz"
    if grid_npz.exists():
        d = np.load(grid_npz)
        tr = Affine(*d["transform"][:6])
        w, h = int(d["width"]), int(d["height"])
        epochs = [int(e) for e in d["epochs"]]
        built = {e: d["built"][i].astype(float) for i, e in enumerate(epochs)}
        dem = d["dem"].astype(float)
        dem = np.where(np.isnan(dem), np.nanmean(dem), dem)
        tc = d["treecover2000"].astype(float) / 100.0
        origin = "data/raw/urban_grid.npz (pipeline/fetch_urban.py, re-downloaded)"
    else:
        need = [LAND / f"built_{e}.png" for e in (2005, 2010, 2015, 2020)] + [LAND / "dem.png", LAND / "treecover2000.png"]
        miss = [str(p) for p in need if not p.exists()]
        if miss:
            die("missing predictors: neither data/raw/urban_grid.npz nor the app layers " + ", ".join(miss))
        tr = Affine(*land["transform3857"])
        w, h = int(land["width"]), int(land["height"])
        epochs = [int(e) for e in land["epochs"]]
        built = {e: gray(LAND / f"built_{e}.png") / 255.0 for e in epochs if (LAND / f"built_{e}.png").exists()}
        dem = gray(LAND / "dem.png") / 2.0 + float(land["dem_offset"])
        tc = gray(LAND / "treecover2000.png") / 255.0
        origin = "web/data/land PNG layers (built_<year>, dem, treecover2000; quantised) + data/raw/roads.json"
    return land, tr, w, h, epochs, built, dem, tc, origin


def gray(path):
    return np.array(Image.open(path)).astype(float)


def study_mask(mu, tr, w, h):
    areas_p = PROCESSED / "areas.geojson"
    if areas_p.exists():
        masks = mu.rasterize_areas(json.load(open(areas_p, encoding="utf-8")), tr, w, h)
        m = np.zeros((h, w), bool)
        for v in masks.values():
            m |= v
        return m
    if (LAND / "study.png").exists():
        return gray(LAND / "study.png") > 0
    die("missing study area: data/processed/areas.geojson and web/data/land/study.png")


def static_predictors(mu, tr, w, h, dem, tc):
    """Exactly the static predictors of model_urban.main()."""
    import rasterio.warp
    rows, cols = np.mgrid[0:h, 0:w]
    xs, ys = tr * (cols + 0.5, rows + 0.5)
    cx, cy = rasterio.warp.transform("EPSG:4326", "EPSG:3857", [mu.CENTRE[0]], [mu.CENTRE[1]])
    kmpp = math.cos(math.radians(52.4)) / 1000.0
    dist_c = np.hypot(xs - cx[0], ys - cy[0]) * kmpp
    dist_r, _ = mu.road_distance(tr, w, h)
    gy, gx = np.gradient(dem, abs(tr.a) * math.cos(math.radians(52.4)))
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    return [np.log1p(dist_r), np.log1p(dist_c), (dem - dem.mean()) / dem.std(), slope, tc]


NAMES = ["built in cell", "built within ~360 m", "built within ~1.1 km", "built within ~2.5 km",
         "log distance to main road", "log distance to Old Market", "terrain height", "slope", "tree cover 2000"]


# ------------------------------------------------------------------ radar

def load_radar(built, study, h, w, mu):
    """first_year (h, w) int16, years, provisional flag, note. Prefers the real file, then the stand-in."""
    if REAL_RADAR.exists():
        r = np.load(REAL_RADAR)
        fy, years = r["first_year"].astype(int), [int(y) for y in r["years"]]
        if fy.shape != (h, w):
            die(f"{REAL_RADAR} has first_year {fy.shape}, expected {(h, w)}")
        return fy, years, False, f"data/raw/radar/built_years.npz (pipeline/sarnik_radar_lata.py)"
    s1 = sorted(RADAR.glob("s1_20[0-9][0-9].npz"))
    if not s1:
        if PROV_RADAR.exists():
            r = np.load(PROV_RADAR)
            return r["first_year"].astype(int), [int(y) for y in r["years"]], True, "data/raw/radar/built_years_provisional.npz (stand-in)"
        die(f"missing radar: neither {REAL_RADAR} nor data/raw/radar/s1_<year>.npz to build a provisional stand-in")
    print("WARNING: data/raw/radar/built_years.npz not found; building a PROVISIONAL stand-in from Sentinel-1", flush=True)
    fy, years, note = build_provisional(s1, built, study, mu)
    return fy, years, True, note


def build_provisional(paths, built, study, mu):
    """Provisional radar built-up per year: a plain logistic classifier of built / not built from the Sentinel-1
    yearly composites, trained on the optical maps of 2015 and 2020, plus a persistent first-year rule.
    Only a stand-in so the forecast can run end to end until pipeline/sarnik_radar_lata.py delivers the real file."""
    years = [int(p.stem[3:]) for p in paths]
    s1 = {y: np.load(p) for y, p in zip(years, paths)}

    def feats(y):
        a = s1[y]
        vv, vh, sd = (a[k].astype(float) for k in ("vv_db", "vh_db", "vv_std_db"))
        f = [vv, vh, sd, ndimage.uniform_filter(np.nan_to_num(vv, nan=-15.0), 3),
             ndimage.uniform_filter(np.nan_to_num(vh, nan=-20.0), 3)]
        return np.stack([x.ravel() for x in f], axis=1)

    train_years = [y for y in (2015, 2020) if y in s1 and y in built]
    if not train_years:
        die("provisional radar needs s1_2015.npz or s1_2020.npz and the optical map of the same year")
    Xs, ys = [], []
    for y in train_years:
        X = feats(y)
        ok = study.ravel() & np.isfinite(X).all(1)
        Xs.append(X[ok])
        ys.append((built[y].ravel()[ok] >= mu.THR).astype(float))
    X, yv = np.vstack(Xs), np.concatenate(ys)
    m, s = X.mean(0), X.std(0) + 1e-9
    wts = mu.fit_logistic((X - m) / s, yv)
    h, w = study.shape
    prob = np.zeros((len(years), h, w), np.float32)
    for i, y in enumerate(years):
        Xy = feats(y)
        ok = np.isfinite(Xy).all(1)
        p = np.zeros(h * w)
        p[ok] = mu.predict(wts, (Xy[ok] - m) / s)
        prob[i] = p.reshape(h, w)
    # threshold calibrated so the radar built count in 2020 equals the optical one (quantity match)
    i20 = years.index(2020) if 2020 in years else len(years) - 1
    n_opt = int((built[train_years[-1]][study] >= mu.THR).sum())
    thr = float(np.sort(prob[i20][study])[::-1][n_opt - 1])
    b = prob >= thr
    # 3-year majority filter along time, then the first year from which the cell stays built. The first year is
    # padded with itself (the record start means "already built"); the last year is padded with "not built", so a
    # single bright 2026 composite does not count: a new cell must be seen in two consecutive late years.
    bi = b.astype(int)
    pad = np.concatenate([bi[:1], bi, np.zeros_like(bi[-1:])], axis=0)
    maj = (pad[:-2] + pad[1:-1] + pad[2:]) >= 2
    stays = np.flip(np.logical_and.accumulate(np.flip(maj, 0), axis=0), 0)   # built in t and in every later year
    fy = np.where(stays.any(0), np.array(years)[np.argmax(stays, axis=0)], 1).astype(np.int16)
    fy[~study] = 0
    acc = float(((prob[i20] >= thr) == (built[2020] >= mu.THR))[study].mean()) if 2020 in built else float("nan")
    np.savez_compressed(PROV_RADAR, years=np.array(years), prob=prob.astype(np.float16), first_year=fy,
                        threshold=thr, provisional=True, train_years=np.array(train_years))
    note = (f"PROVISIONAL stand-in data/raw/radar/built_years_provisional.npz: logistic classifier on Sentinel-1 "
            f"VV, VH, VV variability (+3x3 means), trained on optical {train_years}, threshold {thr:.3f} matched to the "
            f"optical 2020 built count, 3-year majority filter (last year must be confirmed by the year before) + 'stays built' first-year rule; agreement with optical "
            f"2020 inside the study area {acc:.3f}")
    print(note, flush=True)
    return fy.astype(int), years, note


# ------------------------------------------------------------------ statistics

def block_ids(h, w):
    r, c = np.mgrid[0:h, 0:w]
    nbc = math.ceil(w / BLOCK)
    return ((r // BLOCK) * nbc + c // BLOCK).ravel(), math.ceil(h / BLOCK) * nbc


def rank_groups(score):
    """Group index of each cell in ascending score order, ties share a group (for weighted AUC)."""
    order = np.argsort(score, kind="mergesort")
    s = score[order]
    grp = np.concatenate([[0], np.cumsum(s[1:] != s[:-1])])
    g = np.empty(len(score), int)
    g[order] = grp
    return g, int(grp[-1]) + 1


def wauc(g, ng, y, wt):
    pos = np.bincount(g, wt * y, ng)
    neg = np.bincount(g, wt * (1 - y), ng)
    below = np.cumsum(neg) - neg
    return float((pos * (below + 0.5 * neg)).sum() / (pos.sum() * neg.sum()))


def top_ratio(top, y, wt):
    a, b = (wt * top).sum(), (wt * ~top).sum()
    sa, sb = (wt * y * top).sum() / a, (wt * y * ~top).sum() / b
    return sa, sb, (sa / sb if sb > 0 else float("inf"))


def evaluate(score, y, blk, rng, label, base=None):
    """AUC and the top-5 % ratio with block-bootstrap 95 % intervals. score, y, blk are 1-D over the test cells.
    base: optional naive score on the same cells; its AUC and ratio are reported, and the model-minus-baseline AUC
    gets a paired interval from the same resamples."""
    y = y.astype(float)
    g, ng = rank_groups(score)
    one = np.ones(len(y))
    a = wauc(g, ng, y, one)
    top = score >= np.quantile(score, 1 - TOP_SHARE)
    st, sr, ratio = top_ratio(top, y, one)
    if base is not None:
        gb, ngb = rank_groups(base)
        ab = wauc(gb, ngb, y, one)
        topb = base >= np.quantile(base, 1 - TOP_SHARE)
        rb = top_ratio(topb, y, one)[2]
    used = np.unique(blk)
    remap = np.searchsorted(used, blk)
    boots_a, boots_r, boots_d = [], [], []
    for _ in range(N_BOOT):
        draw = rng.integers(0, len(used), len(used))
        wt = np.bincount(draw, minlength=len(used))[remap].astype(float)
        if (wt * y).sum() == 0 or (wt * (1 - y)).sum() == 0:
            continue
        boots_a.append(wauc(g, ng, y, wt))
        boots_r.append(top_ratio(top, y, wt)[2])
        if base is not None:
            boots_d.append(boots_a[-1] - wauc(gb, ngb, y, wt))
    ci = lambda b, k: [round(float(np.percentile(b, 2.5)), k), round(float(np.percentile(b, 97.5)), k)]
    out = {"cells": int(len(y)), "positives": int(y.sum()), "blocks": int(len(used)),
           "auc": round(a, 3), "auc_ci95": ci(boots_a, 3),
           "top5_cells": int(top.sum()), "top5_share": round(st, 4), "rest_share": round(sr, 4),
           "ratio": round(ratio, 2), "ci95": ci(boots_r, 2)}
    if base is not None:
        out.update({"baseline_auc": round(ab, 3), "baseline_ratio": round(rb, 2),
                    "auc_minus_baseline": round(a - ab, 3), "auc_minus_baseline_ci95": ci(boots_d, 3)})
    print(f"{label}: " + json.dumps(out), flush=True)
    return out


# ------------------------------------------------------------------ output

def png_bytes(v):
    import io
    buf = io.BytesIO()
    Image.fromarray(v.astype(np.uint8), mode="L").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def main():
    mu = load_model_code()
    land, tr, w, h, epochs, built, dem, tc, origin = load_grid(mu)
    for e in (2005, 2010, 2015, 2020):
        if e not in built:
            die(f"no optical built-up map for {e}")
    study = study_mask(mu, tr, w, h)
    static = static_predictors(mu, tr, w, h, dem, tc)
    THR = mu.THR
    B = {e: built[e] >= THR for e in built}
    orig = land["model"]
    cell_ha = (abs(tr.a) * math.cos(math.radians(52.4))) ** 2 / 1e4
    blk_all, _ = block_ids(h, w)
    rng = np.random.default_rng(SEED)
    print("predictors from:", origin, flush=True)

    # ---------------- 1. reproduce the existing model ----------------
    def period(t0, t1):
        cand = study & ~B[t0]
        X = mu.features(built[t0], static)[cand.ravel()]
        return X, B[t1][cand].astype(float), cand

    Xa, ya, _ = period(2005, 2010)
    Xb, yb, _ = period(2010, 2015)
    Xtr, ytr = np.vstack([Xa, Xb]), np.concatenate([ya, yb])
    m1, s1 = Xtr.mean(0), Xtr.std(0) + 1e-9
    w1 = mu.fit_logistic((Xtr - m1) / s1, ytr)
    Xv, yv, candv = period(2015, 2020)
    pv = mu.predict(w1, (Xv - m1) / s1)
    val_auc = mu.auc(pv, yv)
    open_m = Xv[:, 0] < OPEN_SHARE
    auc_open = mu.auc(pv[open_m], yv[open_m])
    rep = evaluate(pv, yv, blk_all[candv.ravel()], rng, "reproduction 2015->2020")
    rep_open = evaluate(pv[open_m], yv[open_m], blk_all[candv.ravel()][open_m], rng, "reproduction 2015->2020, open land")
    per5 = [int((study & ~B[a] & B[b]).sum()) for a, b in ((2010, 2015), (2015, 2020))]
    demand = int(round(np.mean(per5)))
    new_level = float(np.median(built[2020][study & ~B[2015] & B[2020]]))
    # projection model: refit on all three observed periods, as model_urban.main() does
    Xall, yall = np.vstack([Xtr, Xv]), np.concatenate([ytr, yv])
    m2, s2 = Xall.mean(0), Xall.std(0) + 1e-9
    w2 = mu.fit_logistic((Xall - m2) / s2, yall)
    coef = {n: round(float(c), 3) for n, c in zip(NAMES, w2[1:])}
    coef_diff = {n: round(coef[n] - orig["coefficients_standardised"][n], 3) for n in NAMES}
    repro_pass = (abs(val_auc - orig["auc_2015_2020"]) <= REPRO_TOL_AUC
                  and abs(auc_open - orig["open_land_auc"]) <= REPRO_TOL_OPEN)
    print(f"reproduction: AUC {val_auc:.3f} (land.json {orig['auc_2015_2020']}), open {auc_open:.3f} "
          f"(land.json {orig['open_land_auc']}), conversions {int(yv.sum())} ({orig['conversions_2015_2020']}), "
          f"open conversions {int(yv[open_m].sum())} ({orig['open_land_conversions']}), demand {demand} "
          f"({orig['demand_cells_per_5y']}), new level {new_level:.3f} ({orig['new_cell_level']})", flush=True)
    print("coefficient differences vs land.json:", coef_diff, flush=True)

    # ---------------- radar ----------------
    fy, ryears, provisional, radar_note = load_radar(built, study, h, w, mu)
    valid = study & (fy > 0)
    radar_new = valid & (fy >= NEW_FROM) & (fy <= NEW_TO)
    radar_early = valid & (fy > 1) & (fy < NEW_FROM)       # radar: built before 2021
    print(f"radar: {radar_note}; years {ryears[0]}-{ryears[-1]}; first built {NEW_FROM}-{NEW_TO}: {int(radar_new.sum())} cells", flush=True)

    # ---------------- 2. prognoza_a_radar ----------------
    cand20 = valid & ~B[2020]
    X20 = mu.features(built[2020], static)
    p20 = np.zeros(h * w)
    p20[cand20.ravel()] = mu.predict(w2, (X20[cand20.ravel()] - m2) / s2)
    p20 = p20.reshape(h, w)
    y20 = radar_new[cand20]
    # naive baseline on the same cells: rank by built share within ~1.1 km (as model_urban.py's open-land baseline)
    near = X20[:, 2].reshape(h, w)
    test = evaluate(p20[cand20], y20, blk_all[cand20.ravel()], rng, "prognoza_a_radar (all open in 2020)",
                    base=near[cand20])
    # sensitivity: drop cells radar says were built before 2021 although optical 2020 says open
    keep = ~radar_early[cand20]
    sens_auc = mu.auc(p20[cand20][keep], y20[keep].astype(float))
    fringe = cand20 & (built[2020] < OPEN_SHARE) & ndimage.binary_dilation(B[2020], np.ones((3, 3), bool)) & ~B[2020]
    test_f = evaluate(p20[fringe], radar_new[fringe], blk_all[fringe.ravel()], rng,
                      "prognoza_a_radar, open cells touching 2020 built-up", base=near[fringe])
    passed = bool(test["ci95"][0] > RATIO_MIN)
    passed_f = bool(test_f["ci95"][0] > RATIO_MIN)
    print(f"AUC without radar-early cells {sens_auc:.3f}; passed {passed}, fringe passed {passed_f}", flush=True)

    # ---------------- 3. start from radar 2026 ----------------
    state = built[2020].copy()
    raise_m = radar_new & (state < new_level)
    state[radar_new] = np.maximum(state[radar_new], new_level)
    open26 = valid & (state < THR)
    p26 = np.zeros(h * w)
    p26[open26.ravel()] = mu.predict(w2, (mu.features(state, static)[open26.ravel()] - m2) / s2)
    p26 = p26.reshape(h, w)
    q = {str(k): float(f"{np.percentile(p26[open26], k):.3g}") for k in (50, 75, 90, 95, 99)}
    print("2026 state: open cells", int(open26.sum()), "raised", int(raise_m.sum()), "quantiles", q, flush=True)

    # comparison with the app's current forecast (prob_2030 = chance 2025->2030 from the projected 2025 state)
    old = (gray(LAND / "prob_2030.png") / 255.0) ** 2
    old_open = study & (gray(LAND / "built_2025.png") / 255.0 < THR)
    both = old_open & open26
    a_new, a_old = p26[both], old[both]
    from scipy.stats import spearmanr
    pear = float(np.corrcoef(a_new, a_old)[0, 1])
    spear = float(spearmanr(a_new, a_old).statistic)
    t_new = a_new >= np.quantile(a_new, 1 - TOP_SHARE)
    t_old = a_old >= np.quantile(a_old, 1 - TOP_SHARE)
    overlap = float((t_new & t_old).sum() / t_old.sum())
    # the top 5 % is dominated by partly built cells (share 0.10-0.15) that are the same in both states, so also
    # compare on open land (below 5 % built in both states), where the neighbourhood predictors decide
    ol = (built[2020][both] < OPEN_SHARE) & (state[both] < OPEN_SHARE)
    tn_o = a_new[ol] >= np.quantile(a_new[ol], 1 - TOP_SHARE)
    to_o = a_old[ol] >= np.quantile(a_old[ol], 1 - TOP_SHARE)
    overlap_open = float((tn_o & to_o).sum() / to_o.sum())
    spear_open = float(spearmanr(a_new[ol], a_old[ol]).statistic)
    hi = (a_new >= np.quantile(a_new, 0.9)) | (a_old >= np.quantile(a_old, 0.9))
    up2, down2 = int((hi & (a_new > 2 * a_old)).sum()), int((hi & (a_old > 2 * a_new)).sum())
    old_top_all = old_open & (old >= np.quantile(old[old_open], 1 - TOP_SHARE))
    stale = old_open & radar_new                                  # old forecast: open; radar: built 2021-2026
    proj25 = study & ~B[2020] & ~old_open                         # model's own projected new built-up 2020->2025
    near_new = ndimage.binary_dilation(radar_new, np.ones((5, 5), bool))   # within ~2 cells (~150 m)
    tn_map = np.zeros((h, w), bool); tn_map[both] = t_new
    to_map = np.zeros((h, w), bool); to_map[both] = t_old
    new_only, old_only = tn_map & ~to_map, to_map & ~tn_map
    comp = {
        "cells_open_in_both": int(both.sum()),
        "pearson_r": round(pear, 3), "spearman_rho": round(spear, 3),
        "top5_overlap_share": round(overlap, 3), "top5_cells": int(t_old.sum()),
        "open_land": {"cells": int(ol.sum()), "spearman_rho": round(spear_open, 3),
                      "top5_overlap_share": round(overlap_open, 3), "top5_cells": int(to_o.sum())},
        "top10_cells_chance_at_least_doubled": up2, "top10_cells_chance_at_least_halved": down2,
        "old_open_but_radar_built_2021_2026": {"cells": int(stale.sum()), "ha": round(float(stale.sum() * cell_ha), 0),
                                                "share_in_old_top5": round(float(old_top_all[stale].mean()), 3) if stale.any() else None,
                                                "old_mean_chance": round(float(old[stale].mean()), 4) if stale.any() else None},
        "model_projected_built_2025": {"cells": int(proj25.sum()),
                                       "radar_built_2021_2026_share": round(float(radar_new[proj25].mean()), 3),
                                       "radar_built_before_2021_share": round(float(radar_early[proj25].mean()), 3),
                                       "radar_not_built_2026_share": round(float((fy[proj25] == 1).mean()), 3),
                                       "radar_new_share_other_open_2020": round(float(radar_new[study & ~B[2020] & old_open].mean()), 4)},
        "new_top5_only_near_radar_new_share": round(float(near_new[new_only].mean()), 3) if new_only.any() else None,
        "old_top5_only_near_radar_new_share": round(float(near_new[old_only].mean()), 3) if old_only.any() else None,
        "mean_chance_new": round(float(a_new.mean()), 4), "mean_chance_old": round(float(a_old.mean()), 4),
    }
    print("comparison with prob_2030:", json.dumps(comp, ensure_ascii=False), flush=True)

    # ---------------- 4. outputs ----------------
    OUT.mkdir(parents=True, exist_ok=True)
    v = np.where(open26, np.maximum(1, np.round(255 * np.sqrt(np.clip(p26, 0, 1)))), 0)
    step = 1
    for step in (1, 2, 3, 4, 6, 8):
        vq = np.where(open26, np.clip(np.maximum(1, np.round(v / step) * step), 1, 255), 0) if step > 1 else v
        data = png_bytes(vq)
        if len(data) < SIZE_BUDGET - 25_000:
            break
    (OUT / "prob_5y.png").write_bytes(data)

    checks = {
        "reprodukcja_modelu": {
            "what": "Czy ten sam kod modelu, uruchomiony na pobranych na nowo danych, daje te same wyniki co aplikacja "
                    "(trening 2005–2015 na mapie optycznej, test 2015–2020).",
            "what_en": "Does the same model code, run on re-obtained inputs, give the app's numbers "
                       "(trained on the optical map 2005-2015, tested 2015-2020)?",
            "cells": rep["cells"], "positives": rep["positives"], "value": round(val_auc, 3), "ci95": rep["auc_ci95"],
            "app_value": orig["auc_2015_2020"],
            "open_land": {"cells": rep_open["cells"], "positives": rep_open["positives"], "value": round(auc_open, 3),
                          "ci95": rep_open["auc_ci95"], "app_value": orig["open_land_auc"]},
            "demand_cells_per_5y": demand, "app_demand_cells_per_5y": orig["demand_cells_per_5y"],
            "new_cell_level": round(new_level, 3), "app_new_cell_level": orig["new_cell_level"],
            "coefficients_standardised": coef, "coefficient_minus_app": coef_diff,
            "predictors_from": origin, "passed": bool(repro_pass), "criterion": CRIT_REPRO},
        "prognoza_a_radar": {
            "what": "Czy model liczony od mapy z 2020 r. wskazał miejsca, które radar widzi jako zabudowane pierwszy raz "
                    "w latach 2021–2026 (lata, których nie obejmuje żadna mapa optyczna). Wszystkie komórki wolne w 2020 r.",
            "what_en": "Did the model run on the 2020 map point to the cells radar first sees built in 2021-2026 "
                       "(years no optical map covers)? All cells open in 2020.",
            **{k: test[k] for k in ("cells", "positives", "blocks", "top5_cells", "top5_share", "rest_share", "baseline_auc",
                                   "baseline_ratio", "auc_minus_baseline", "auc_minus_baseline_ci95")},
            "value": test["ratio"], "ci95": test["ci95"], "auc": test["auc"], "auc_ci95": test["auc_ci95"],
            "auc_without_cells_radar_built_before_2021": round(sens_auc, 3),
            "cells_radar_built_before_2021_optical_open_2020": int(radar_early[cand20].sum()),
            "baseline": "rank by built-up share within ~1.1 km of the 2020 map (no model)",
            "bootstrap": f"{N_BOOT} resamples of {BLOCK} x {BLOCK} cell blocks (about 1.2 km), seed {SEED}",
            "passed": passed, "criterion": CRIT_RADAR, "criterion_pl": CRIT_RADAR_PL},
        "prognoza_a_radar_brzeg": {
            "what": "To samo, ale uczciwiej: tylko wolne komórki (poniżej 5% zabudowy) stykające się z zabudową z 2020 r.",
            "what_en": "The same, fairer: only open cells (below 5 % built) that touch 2020 built-up.",
            **{k: test_f[k] for k in ("cells", "positives", "blocks", "top5_cells", "top5_share", "rest_share", "baseline_auc",
                                     "baseline_ratio", "auc_minus_baseline", "auc_minus_baseline_ci95")},
            "value": test_f["ratio"], "ci95": test_f["ci95"], "auc": test_f["auc"], "auc_ci95": test_f["auc_ci95"],
            "passed": passed_f, "criterion": CRIT_RADAR, "criterion_pl": CRIT_RADAR_PL},
        "porownanie_z_prognoza_aplikacji": {
            "what": "Porównanie z obecną prognozą aplikacji (prob_2030, liczona od modelowego stanu z 2025 r.): "
                    "zgodność i miejsca, które stara prognoza uważa za wolne, a radar widzi już zabudowane.",
            "what_en": "Comparison with the app's current forecast (prob_2030, started from the model's own projected 2025): "
                       "agreement, and land the old forecast treats as open that radar shows already built.",
            "cells": comp["cells_open_in_both"], "value": comp["spearman_rho"], "ci95": None, **comp,
            "passed": None, "criterion": "descriptive comparison, no pass criterion"},
    }
    meta = {
        "source": ("Logistic land-change model (pipeline/model_urban.py) on JRC GHSL GHS-BUILT-S R2023A, Copernicus DEM "
                   "GLO-30, Hansen tree cover 2000 and OpenStreetMap roads; start state GHSL 2020 plus Sentinel-1 RTC "
                   "radar built-up 2021-2026 (ESA, Microsoft Planetary Computer)"),
        "radar_input": radar_note, "radar_years": ryears,
        "start_year": START_YEAR, "horizon_years": HORIZON,
        "trained_on": ["2005-2010", "2010-2015", "2015-2020"],
        "tested_on": ["2015-2020 (optical, model trained on 2005-2015 only)",
                      "2021-2026 (radar first built year; model run on the optical 2020 state)"],
        "provisional": bool(provisional),
        "start_state": (f"optical 2020 built-up shares; cells radar dates as first built {NEW_FROM}-{NEW_TO} raised to at "
                        f"least {round(new_level, 3)} (median share of cells that turned built 2015-2020); built = share >= {THR}"),
        "cell_ha": round(cell_ha, 3), "open_cells": int(open26.sum()), "radar_new_cells": int(radar_new.sum()),
        "quantiles_open": q,
        "png_quantisation_step": step,
        "layers": [{
            "name": "prob_5y", "file": "prob_5y.png",
            "decode": {"text": "(v/255)^2 = chance that an open cell turns built within 5 years from 2026; 0 = no data or already built",
                       "scale": round(1 / 255, 8), "offset": 0, "power": 2, "unit": "",
                       "quantised_step": step},
            "ramp": ["#2b2b2b", "#f2a31b"],
            "legend_pl": "Szansa zabudowy w ciągu 5 lat, licząc od stanu z radaru w 2026 r. (0 = brak danych albo już zabudowane)",
            "legend_en": "Chance of being built within 5 years, starting from the 2026 radar state (0 = no data or already built)"}],
        "checks": checks,
    }
    mj = json.dumps(meta, ensure_ascii=False, indent=1)
    (OUT / "meta.json").write_text(mj, encoding="utf-8")
    total = sum(p.stat().st_size for p in OUT.iterdir() if p.is_file())
    print(f"wrote {OUT / 'prob_5y.png'} ({len(data)} B, step {step}) and meta.json ({len(mj.encode())} B); folder {total} B"
          + ("  [PROVISIONAL radar]" if provisional else ""), flush=True)
    if total > SIZE_BUDGET:
        die(f"output folder is {total} B, over the {SIZE_BUDGET} B budget")


if __name__ == "__main__":
    main()
