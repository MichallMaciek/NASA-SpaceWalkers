"""Built-up area from radar, year by year, and the first year each cell shows built-up (SARnik, work package 5).

Why: the app's built-up history comes from an optical map (GHSL) that ends in 2020. Radar is the only source here that
says what was actually built after 2020, and it says it every year.

Inputs (working files, git-ignored, in data/raw/radar/):
  s1_<year>.npz        Sentinel-1 summer composites 2015-2026 (sarnik_radar_lata_s1.py)
  nisar_features.npz   NISAR 2026: L-band HH, HV and 12-day coherence (sarnik_radar_lata_nisar.py)
  alos1_<year>.npz     ALOS PALSAR 2007, 2008, 2010 (optional; used only if they pass the pre-declared test below)
and from web/data/: optical built-up map (land/built_<year>.png), ALOS-2 yearly mosaics 2015-2021 (land/alos_*),
study area, tree cover, the team's model projection (land/built_2025.png), building decisions (wuia_decyzje.geojson),
city boundary (areas.geojson).

Method, in short:
  1. Each year's composite is normalised against cells that did not change (long-built cores, closed forest, remote
     farmland) by quantile matching, so that orbit mix, Sentinel-1B loss (Dec 2021), Sentinel-1C and calibration
     updates do not look like building.
  2. One classifier (gradient boosting on backscatter, VV/VH ratio, spread over the season and 3x3 / 7x7
     neighbourhood means) is trained on the optical map only where it is an observation: Sentinel-1 2015 vs optical
     2015 and Sentinel-1 2020 vs optical 2020. Every cell is predicted by a model that never saw its 16 x 16 cell
     block (about 1.2 km on the ground), for every year. So the change tests below are out of sample in space.
  3. 2026 fuses Sentinel-1 with NISAR (HH, HV, coherence). NISAR exists only in 2026, so its models learn optical
     2020 labels on cells whose Sentinel-1 state did not change 2020 -> 2026. The yearly series itself stays
     Sentinel-1 only (one model for every year, so 2026 cannot jump because the method changed); NISAR confirms
     steps in the last two years and the fused 2026 probability is stored next to it (prob_2026_fused).
  4. "First year": the best single step from not built to built over the series, with a minimum step height and
     persistence on both sides; a step in the second year needs a clearly unbuilt first year, and steps in the last
     two years must also be confirmed by NISAR alone.
  5. Tests of the change, each criterion declared in CRITERIA before anything is computed; intervals from a block
     bootstrap (neighbouring cells are not independent).
  6. Optional register test (pozwolenia_gunb), run only when data/raw/radar/obreby.geojson exists
     (pipeline/sarnik_radar_lata_obreby.py): radar new built-up 2021-2026 against GUNB RWDZ parcels with a new
     building, by cadastral district; design fixed in PERMITS, interval from a bootstrap over municipalities.

Outputs: data/raw/radar/built_years.npz (years, prob, first_year), web/data/sarnik/radar_lata/first_year.png and
meta.json. Run with an isolated interpreter (the inputs are downloaded files):
  .venv/bin/python -I pipeline/sarnik_radar_lata.py
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # -I drops the script folder from the path

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from common import RAW, WEB_DATA  # noqa: E402

RADAR = RAW / "radar"
LAND = WEB_DATA / "land"
OUT = WEB_DATA / "sarnik" / "radar_lata"
S1_YEARS = list(range(2015, 2027))
ALOS1_YEARS = [2007, 2008, 2010]
ALOS2_YEARS = list(range(2015, 2022))
TRAIN_YEARS = (2015, 2020)       # optical observation years with Sentinel-1
LAST_OPTICAL = 2020
BLOCK = 16                       # 16 x 16 cells of 120 m (Web Mercator) = about 1.2 km on the ground
FOLDS = 5
BOOT = 2000
SEED = 20261115

# ---------------------------------------------------------------- rule for the first year (fixed before the tests)
RULE = {
    "step_min": 0.40,            # mean probability after the step minus mean before must be at least this
    "after_hi_share": 0.75,      # at least this share of years from the step on must be >= 0.5
    "before_hi_share": 0.25,     # at most this share of years before the step may be >= 0.5
    "early_before_max": 0.25,    # a step in the second year (one year "before") needs that first year below this
    "late_years": 2,             # steps in the last N years need ...
    "late_after_mean": 0.70,     # ... a higher mean after the step, every year after it >= 0.5 ...
    "late_nisar": 0.50,          # ... and NISAR alone (L-band, independent of Sentinel-1) >= this probability in 2026
    "start_mean_first3": 0.50,   # no accepted step: built from the start if the first three years average >= this
}

# ---------------------------------------------------------------- pass criteria, declared before computing anything
CRITERIA = {
    "metoda_2015_2020": "pass if the lower bound of the 95% block-bootstrap interval of the ratio is above 2",
    "decyzje_2026": "pass if the lower bound of the 95% block-bootstrap interval of the ratio is above 1",
    "prognoza_2025": "pass if the lower bound of the ratio in the fair version (cells touching 2020 built-up) is above 1",
    "alos2_zgodnosc": "pass if the AUC of Sentinel-1 against ALOS-2 L-band labels is at least 0.85 in every year "
                      "2015-2021 AND the change ratio (ALOS-2 rise on cells Sentinel-1 dates 2016-2020 vs cells it "
                      "never calls built) has a lower bound above 2",
    "zmiana_po_2020": "pass only if metoda_2015_2020 and decyzje_2026 both pass",
    "pozwolenia_gunb": "pass if the lower bound of the 95% municipality-clustered bootstrap interval of the PARTIAL "
                       "rank correlation (controlling for the 2020 built-up share) between radar new built-up "
                       "2021-2026 and register parcels with a new building and last case 2021-2026, both per km2 of "
                       "district, is above 0.15",

    "krzyzowo_lata": "pass if the block-held-out AUC is at least 0.90 both ways (train 2015 test 2020 and the reverse)",
    "stabilnosc_lat": "pass if no year-to-year change of the radar built-up share (mean probability, study area) "
                      "is larger than 3 times the optical yearly growth 2015-2020",
    "nisar_2026": "pass if the NISAR-only probability calls built a share of the cells Sentinel-1 dates 2021-2024 "
                  "(decided without NISAR) at least 2 times the share among cells Sentinel-1 never calls built "
                  "(lower bound of the ratio above 2)",
    "tempo_po_2020": "pass if the radar's mean yearly new built-up area 2021-2026 is between 1/3 and 3 times the "
                     "optical yearly growth 2015-2020 (study area)",
    "alos1_dolaczenie": "ALOS PALSAR 2007-2010 joins the first-year series only if (i) at most 5% of cells built in "
                        "the optical map in both 2005 and 2020 get a first year after 2010, and (ii) cells the optical "
                        "map turned built 2010->2015 are dated 2011-2015 with a ratio lower bound above 2 against "
                        "cells it kept open",
}

# ---------------------------------------------------------------- register test, whole analysis fixed before computing
# Written into the code before the test was computed for the first time (15 Nov 2026, ~03:30). Nothing below may be
# tuned after seeing the result; any change after a first look must be recorded in PERMITS["changes_after_first_look"].
PERMITS = {
    "unit": "cadastral district (obręb) with at least one case in GUNB RWDZ (web/data/sarnik/dzialka, 601 files); "
            "outline from GUGiK ULDK (data/raw/radar/obreby.geojson, pipeline/sarnik_radar_lata_obreby.py)",
    "cells": "120 m grid cells whose centre lies inside the outline (rasterio, all_touched=False)",
    "min_study_cells": 50,          # about 0.27 km2 on the ground; fewer cells: density too coarse, district dropped
    "min_study_share": 0.90,        # share of the district's cells inside the study area; else the two measures
                                    # would cover different ground (permits: whole district, radar: study part)
    "radar": "hectares with radar first year 2021-2026 per km2 of the district's study cells",
    "register": "parcels with >= 1 'new building' case whose last-case year (year of the parcel's last case of any "
                "kind: new building, extension or demolition) is 2021-2026, per km2 of the district (all its cells)",
    "covariate": "2020 built-up share of the district: mean optical (GHSL) built-up fraction of 2020 over its study cells",
    "statistic": "Spearman rank correlation across districts; partial rank correlation = Pearson correlation of the "
                 "residuals of rank(radar) and rank(register) after a linear fit on rank(covariate)",
    "interval": "95% percentile interval, 2000 bootstrap draws of municipalities (first six TERYT digits) with "
                "replacement, all districts of a drawn municipality kept together; seed SEED",
    "reported_only": {
        "partial_rho_quadratic": "same, residuals after a quadratic fit on rank(covariate) (the fringe effect may be "
                                 "hump-shaped in the built-up share)",
        "dose_response": "districts split into four equal-count groups by register density 2021-2026: pooled radar "
                         "new ha 2021-2026 per km2 in each, clustered-bootstrap interval, group membership fixed",
        "timing_control": "same partial correlation with parcels whose last-case year is 2016-2018 (radar still "
                          "2021-2026); plus the difference main minus timing with its interval",
        "reverse_period": "radar first built 2016-2020 vs parcels with a new building and last-case year 2016-2020, "
                          "partial on the 2015 built-up share (the state at the start of that period)",
        "register_vs_optical": "optical (GHSL) new built-up 2015->2020 (ha per km2, cells not built in 2015 and built "
                               "in 2020) vs the same 2016-2020 parcels, partial on the 2015 share: how well the "
                               "register itself tracks real building at district level",
    },
    "pass": "lower bound of the 95% interval of the partial rank correlation (main) above 0.15 (fixed by the lead)",
    "changes_after_first_look": [
        "15 Nov 2026 ~04:35, after the first computation: ULDK serves the same ground under two cadastral unit codes "
        "(e.g. 302107_2.0008 and 302107_3.0008, identical outlines; 302114_3.0001 = 302114_4.0001 + 302114_5.0001) "
        "and the register files parcels under both. The first version rasterised all outlines into one layer (the "
        "later code overwrote the earlier), so one twin lost its cells and was dropped while the other kept only its "
        "own parcels. Fix: outlines that share cells are merged into one unit and their parcels are joined (same "
        "parcel number counted once). Nothing else changed: thresholds, measures, statistic and criterion are as "
        "declared. The first-version result is kept in the entry (first_look)."],
}


def die(msg):
    print("sarnik_radar_lata:", msg)
    sys.exit(0)


def gray(name):
    return np.array(Image.open(LAND / f"{name}.png")).astype(np.float32)


def png(path, arr):
    """8-bit grey PNG without colour profile, like build_sar.py."""
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(path, optimize=True)


def r(x, d=4):
    return None if x is None or not np.isfinite(x) else round(float(x), d)


# ---------------------------------------------------------------- normalisation against unchanged cells
QS = np.linspace(0.005, 0.995, 199)


def qmatch(a, ref_q, own_q):
    """Monotone map of a year's values so that its quantiles on the stable cells match the reference."""
    out = np.interp(a, own_q, ref_q)
    out = np.where(a > own_q[-1], a + (ref_q[-1] - own_q[-1]), out)
    out = np.where(a < own_q[0], a + (ref_q[0] - own_q[0]), out)
    return np.where(np.isfinite(a), out, np.nan).astype(np.float32)


def normalise(series, stable):
    """series: {year: {band: dB array}}. Quantile-match every band of every year to the mean quantile function."""
    bands = list(next(iter(series.values())).keys())
    out = {y: {} for y in series}
    info = {}
    for b in bands:
        own = {y: np.nanquantile(series[y][b][stable], QS) for y in series}
        ref = np.mean([own[y] for y in series], 0)
        for y in series:
            out[y][b] = qmatch(series[y][b], ref, own[y])
        info[b] = {str(y): r(float(np.median(own[y] - ref)), 2) for y in series}   # median shift removed, dB
    return out, info


# ---------------------------------------------------------------- features and classifier
def features(bands, power=("vv", "vh", "hh", "hv")):
    """Per-cell features: each band, 3x3 and 7x7 neighbourhood means (in linear power for backscatter), 3x3 max of
    the first band, and the co/cross ratio when both polarisations are present."""
    from scipy import ndimage
    F, names = [], []
    keys = list(bands)
    for k in keys:
        a = bands[k]
        fill = np.where(np.isfinite(a), a, np.nanmedian(a))
        F.append(fill); names.append(k)
        if k in power:
            lin = 10 ** (fill / 10)
            for s in (3, 7):
                F.append(10 * np.log10(ndimage.uniform_filter(lin, s))); names.append(f"{k}_m{s}")
        else:
            for s in (3, 7):
                F.append(ndimage.uniform_filter(fill, s)); names.append(f"{k}_m{s}")
    F.append(ndimage.maximum_filter(F[0], 3)); names.append(f"{keys[0]}_max3")
    for co, cx in (("vv", "vh"), ("hh", "hv")):
        if co in bands and cx in bands:
            d = F[names.index(co)] - F[names.index(cx)]
            F.append(d); names.append(f"{co}-{cx}")
            F.append(ndimage.uniform_filter(d, 3)); names.append(f"{co}-{cx}_m3")
    return np.stack(F, -1).astype(np.float32), names


def model():
    from sklearn.ensemble import HistGradientBoostingClassifier
    return HistGradientBoostingClassifier(max_iter=250, learning_rate=0.08, max_leaf_nodes=31, l2_regularization=1.0,
                                          random_state=0)


def fold_of(blocks_id, k=FOLDS, seed=SEED):
    """Random assignment of blocks to folds (grouped folds)."""
    u = np.unique(blocks_id)
    f = np.random.default_rng(seed).permutation(len(u)) % k
    lut = dict(zip(u.tolist(), f.tolist()))
    return np.array([lut[b] for b in blocks_id.tolist()])


def oof_series(train, apply, fold):
    """train: list of (X, y) on the study cells (same cell order); apply: {year: X}. Returns block-held-out
    probabilities for every year and the out-of-fold probabilities on the training years."""
    out = {y: np.zeros(len(fold), np.float32) for y in apply}
    oof_train = [np.zeros(len(fold), np.float32) for _ in train]
    for f in range(FOLDS):
        tr, te = fold != f, fold == f
        m = model().fit(np.vstack([X[tr] for X, _ in train]), np.concatenate([y[tr] for _, y in train]))
        for y_, X in apply.items():
            out[y_][te] = m.predict_proba(X[te])[:, 1]
        for i, (X, _) in enumerate(train):
            oof_train[i][te] = m.predict_proba(X[te])[:, 1]
    return out, oof_train


# ---------------------------------------------------------------- block bootstrap
class Boot:
    def __init__(self, block_id, reps=BOOT, seed=SEED):
        self.u, self.inv = np.unique(block_id, return_inverse=True)
        rng = np.random.default_rng(seed)
        nb = len(self.u)
        self.W = np.stack([np.bincount(rng.integers(0, nb, nb), minlength=nb) for _ in range(reps)]).astype(np.float32)

    def sums(self, v):
        return np.bincount(self.inv, weights=v.astype(np.float64), minlength=len(self.u)).astype(np.float32)

    def ratio(self, a, b, hit, what, criterion, lo_pass):
        """Share of hit cells in group a vs group b, ratio and 95% block-bootstrap interval."""
        na, nb_ = int(a.sum()), int(b.sum())
        ha, hb = int((hit & a).sum()), int((hit & b).sum())
        sa, sb = (ha / na if na else np.nan), (hb / nb_ if nb_ else np.nan)
        ratio = sa / sb if sb > 0 else np.nan
        A, HA, B, HB = (self.W @ self.sums(x) for x in (a, hit & a, b, hit & b))
        with np.errstate(all="ignore"):
            rb = (HA / A) / (HB / B)
        rb = rb[np.isfinite(rb)]
        ci = [r(np.percentile(rb, 2.5), 3), r(np.percentile(rb, 97.5), 3)] if rb.size else [None, None]
        blocks_a = int(len(np.unique(self.inv[a]))) if na else 0
        return {"what": what, "criterion": criterion, "cells": na, "hits": ha, "share": r(sa), "cells_ref": nb_,
                "hits_ref": hb, "share_ref": r(sb), "ratio": r(ratio, 3), "ci95": ci, "blocks": blocks_a,
                "p_boot_ratio_le_1": r(float(np.mean(rb <= 1)) if rb.size else np.nan, 4),
                "passed": bool(ci[0] is not None and ci[0] > lo_pass)}


def auc(y, s):
    from sklearn.metrics import roc_auc_score
    return float(roc_auc_score(y, s))


# ---------------------------------------------------------------- first-year rule
def first_year_rule(P, years, nisar_p, rule=RULE):
    """P: (n_years, n_cells). Returns first year per cell (0 = not built), plus diagnostics."""
    n = len(years)
    hi = P >= 0.5
    cs, ch = np.cumsum(P, 0), np.cumsum(hi, 0)
    tot, toth = cs[-1], ch[-1]
    best_step = np.full(P.shape[1], -np.inf, np.float32)
    best_k = np.zeros(P.shape[1], int)
    any_raw = np.zeros(P.shape[1], bool)
    late_rejected = np.zeros(P.shape[1], bool)
    for k in range(1, n):
        mb, ma = cs[k - 1] / k, (tot - cs[k - 1]) / (n - k)
        fb, fa = ch[k - 1] / k, (toth - ch[k - 1]) / (n - k)
        step = ma - mb
        ok = (step >= rule["step_min"]) & (fa >= rule["after_hi_share"]) & (fb <= rule["before_hi_share"])
        any_raw |= (step >= rule["step_min"]) & (ma >= 0.5) & (mb < 0.5)
        if k == 1:
            ok &= mb <= rule["early_before_max"]
        if k >= n - rule["late_years"]:
            strict = (ma >= rule["late_after_mean"]) & hi[k:].all(0) & (nisar_p >= rule["late_nisar"])
            late_rejected |= ok & ~strict
            ok &= strict
        better = ok & (step > best_step)
        best_step = np.where(better, step, best_step)
        best_k = np.where(better, k, best_k)
    has_step = np.isfinite(best_step)
    start = ~has_step & (P[:3].mean(0) >= rule["start_mean_first3"])
    fy = np.zeros(P.shape[1], np.int16)
    fy[has_step] = np.array(years)[best_k[has_step]]
    fy[start] = years[0]
    # cells whose series crosses 0.5 upwards somewhere but get no accepted step
    crosses = (hi[1:] & ~hi[:-1]).any(0)
    diag = {"cells_with_upward_crossing": int(crosses.sum()), "accepted_steps": int(has_step.sum()),
            "rejected_crossing_no_step": int((crosses & ~has_step).sum()),
            "rejected_candidate_steps": int((any_raw & ~has_step).sum()),
            "rejected_late_without_nisar": int((late_rejected & ~has_step).sum()),
            "ambiguous_high_now_not_dated": int((~has_step & ~start & (P[-3:].mean(0) >= 0.5)).sum()),
            "built_from_start": int(start.sum())}
    return fy, diag


# The card module can also show a forecast that starts from the radar state of 2026 (pipeline/sarnik_radar_prognoza.py
# --web). It stays off: the app already has a forecast row, the two differ little (rank correlation 0.91), and two
# rows with two numbers would confuse a buyer. The app's author switches it on together with retiring the old row.
FORECAST_ROW = False


def main():
    t0 = time.time()
    s1_paths = {y: RADAR / f"s1_{y}.npz" for y in S1_YEARS}
    missing = [y for y, p in s1_paths.items() if not p.exists()]
    if missing:
        die(f"missing Sentinel-1 composites for {missing} in {RADAR} (run pipeline/sarnik_radar_lata_s1.py). Nothing written.")
    if not (RADAR / "nisar_features.npz").exists():
        die(f"missing {RADAR / 'nisar_features.npz'} (run pipeline/sarnik_radar_lata_nisar.py). Nothing written.")
    from scipy import ndimage
    import rasterio.features
    from affine import Affine
    from rasterio.warp import transform_geom

    land = json.load(open(LAND / "land.json"))
    W, H = land["width"], land["height"]
    TR = Affine(*land["transform3857"][:6])
    THR = land["threshold"]
    cell_ha = land["cell_m_ground"] ** 2 / 1e4
    study = gray("study") > 0
    idx = np.flatnonzero(study.ravel())
    N = len(idx)
    on = lambda a: a.ravel()[idx]                               # noqa: E731
    B = {y: gray(f"built_{y}") / 255 for y in range(1975, 2021, 5)}
    built = {y: B[y] >= THR for y in B}
    tree = gray("treecover2000") / 255
    rr, cc = np.indices((H, W))
    block = (rr // BLOCK) * 1000 + cc // BLOCK
    blk = on(block)
    fold = fold_of(blk)
    boot = Boot(blk)
    rng = np.random.default_rng(SEED)

    # unchanged cells for normalisation: long-built cores, closed forest, farmland far from any built-up
    dist_built = ndimage.distance_transform_edt(~built[2020]) * land["cell_m_ground"]
    stable_built = study & built[2000] & built[2020] & (B[2000] >= 0.3)
    stable_forest = study & (tree >= 0.8) & (B[2020] < 0.02)
    stable_open = study & (B[2020] < 0.01) & (tree < 0.1) & (dist_built > 1000)
    stable = stable_built | stable_forest | stable_open
    print(f"stable cells: built {stable_built.sum()}, forest {stable_forest.sum()}, open {stable_open.sum()}")

    # ---------------------------------------------------------------- Sentinel-1
    raw, passes = {}, {}
    for y in S1_YEARS:
        d = np.load(s1_paths[y])
        raw[y] = {"vv": d["vv_db"], "vh": d["vh_db"], "sd": d["vv_std_db"]}
        passes[y] = {"sentinel1": int(len(set(zip(d["orbits"].tolist(), d["dates"].tolist()))))}
    norm, shifts = normalise(raw, stable)
    X = {}
    names = None
    for y in S1_YEARS:
        F, names = features(norm[y])
        X[y] = F.reshape(-1, F.shape[-1])[idx]
    Xraw = {}
    for y in TRAIN_YEARS:
        F, _ = features(raw[y])
        Xraw[y] = F.reshape(-1, F.shape[-1])[idx]
    Y = {y: on(built[y]).astype(int) for y in TRAIN_YEARS}
    print("features", names, f"{time.time() - t0:.0f} s")

    checks = {}
    # cross-year accuracy, block-held-out: train one year on 4/5 of the blocks, test the other year on the rest
    cy = {}
    for a, b in ((2015, 2020), (2020, 2015)):
        s = np.zeros(N, np.float32)
        for f in range(FOLDS):
            tr, te = fold != f, fold == f
            s[te] = model().fit(X[a][tr], Y[a][tr]).predict_proba(X[b][te])[:, 1]
        cy[f"{a}->{b}"] = {"auc": r(auc(Y[b], s), 3), "pred_share": r(s.mean()), "optical_share": r(Y[b].mean())}
    # the same without normalisation, to show what normalisation does
    for a, b in ((2015, 2020), (2020, 2015)):
        m = model().fit(Xraw[a], Y[a])
        s = m.predict_proba(Xraw[b])[:, 1]
        cy[f"{a}->{b}_raw_same_cells"] = {"auc": r(auc(Y[b], s), 3), "pred_share": r(s.mean())}
    checks["krzyzowo_lata"] = {
        "what": "Sentinel-1 classifier trained on one optical year and tested on the other, on blocks it never saw",
        "criterion": CRITERIA["krzyzowo_lata"], **cy,
        "auc": min(cy["2015->2020"]["auc"], cy["2020->2015"]["auc"]),
        "passed": bool(min(cy["2015->2020"]["auc"], cy["2020->2015"]["auc"]) >= 0.90)}
    print("cross-year", cy)

    # main model: both training years, every cell predicted by the model that never saw its block
    probs, oof = oof_series([(X[y], Y[y]) for y in TRAIN_YEARS], X, fold)
    yall = np.concatenate([Y[y] for y in TRAIN_YEARS])
    pall = np.concatenate(oof)
    rel = []
    for lo in np.arange(0, 1, 0.1):
        s = (pall >= lo) & (pall < lo + 0.1)
        rel.append([r(lo, 1), int(s.sum()), r(yall[s].mean() if s.any() else np.nan, 3)])
    ece = float(sum(n_ * abs(o - (lo + 0.05)) for lo, n_, o in rel if n_) / len(pall))
    checks["blokowa_walidacja"] = {
        "what": "block cross-validation on 2015 and 2020 together (5 grouped folds of 16 x 16 cell blocks)",
        "auc": r(auc(yall, pall), 3), "auc_2015": r(auc(Y[2015], oof[0]), 3), "auc_2020": r(auc(Y[2020], oof[1]), 3),
        "brier": r(float(np.mean((pall - yall) ** 2)), 4), "reliability_bins": rel, "ece_approx": r(ece, 3),
        "pred_share_2015": r(oof[0].mean()), "pred_share_2020": r(oof[1].mean()),
        "optical_share_2015": r(Y[2015].mean()), "optical_share_2020": r(Y[2020].mean()),
        "criterion": "reported, no pass threshold", "passed": None}
    print("block CV", {k: v for k, v in checks["blokowa_walidacja"].items() if k != "reliability_bins"})

    # ---------------------------------------------------------------- NISAR 2026 and fusion
    nz = dict(np.load(RADAR / "nisar_features.npz", allow_pickle=True))
    with np.errstate(all="ignore"):
        nb = {"hh": 10 * np.log10(nz["hh_mean"]), "hv": 10 * np.log10(nz["hv_mean"]), "coh": nz["coh_mean"],
              "cohmin": nz["coh_min"], "hhsd": nz["hh_std_db"], "cohlmax": nz["coh_l_max"]}
    nvalid = on(np.all([np.isfinite(v) for v in nb.values()], 0))
    FN, _ = features(nb)
    XN = FN.reshape(-1, FN.shape[-1])[idx]
    gcov_dates = [str(d) for d in nz["dates"]]
    gunw_dates = sorted({d for p in nz["pairs"] for d in str(p).split(">")})
    passes[2026]["nisar_gcov_track57"] = len(gcov_dates)
    passes[2026]["nisar_gunw_track158"] = len(gunw_dates)
    # NISAR labels: optical 2020 on cells whose Sentinel-1 state is the same in 2020 and 2026 (label still valid)
    y20 = Y[2020]
    keep = (np.abs(probs[2026] - probs[2020]) < 0.3) & nvalid
    XF = np.hstack([X[2026], XN])

    def oof_fit(Xm, mask):
        out = np.zeros(N, np.float32)
        for f in range(FOLDS):
            tr, te = (fold != f) & mask, fold == f
            out[te] = model().fit(Xm[tr], y20[tr]).predict_proba(Xm[te])[:, 1]
        return out
    p_nisar = oof_fit(XN, keep)
    p_fused = oof_fit(XF, keep)
    p_s1_26 = oof_fit(X[2026], keep)
    p_nisar[~nvalid] = np.nan
    p_fused = np.where(nvalid, p_fused, probs[2026])
    ev = np.isfinite(p_nisar)
    a_s1, a_ni, a_fu = auc(y20[ev], p_s1_26[ev]), auc(y20[ev], p_nisar[ev]), auc(y20[ev], p_fused[ev])
    a_ser = auc(y20[ev], probs[2026][ev])
    bs1, bni = probs[2026] >= 0.5, np.nan_to_num(p_nisar) >= 0.5
    agree = float((bs1 == bni)[ev].mean())
    po, pe = agree, float(bs1[ev].mean() * bni[ev].mean() + (1 - bs1[ev].mean()) * (1 - bni[ev].mean()))
    kappa = (po - pe) / (1 - pe)
    print(f"NISAR: AUC on 2020 labels S1-2026 {a_s1:.3f}, NISAR {a_ni:.3f}, fused {a_fu:.3f}; kappa {kappa:.3f}")

    # ---------------------------------------------------------------- first year
    years = list(S1_YEARS)
    P = np.stack([probs[y] for y in years])
    nis = np.nan_to_num(p_nisar, nan=0.0)
    fy, diag = first_year_rule(P, years, nis)
    # the same rule on Sentinel-1 alone (no fusion, no NISAR confirmation), for the "what NISAR adds" comparison
    fy_s1, diag_s1 = first_year_rule(P, years, np.ones(N), {**RULE, "late_nisar": -1})
    print("rule", diag, f"{time.time() - t0:.0f} s")

    # ---------------------------------------------------------------- ALOS PALSAR 2007-2010 (optional)
    alos1 = {y: RADAR / f"alos1_{y}.npz" for y in ALOS1_YEARS if (RADAR / f"alos1_{y}.npz").exists()}
    lband_hist, alos1_join, lband_p = None, False, {}
    if 2010 in alos1:
        a1raw, a1valid = {}, {}
        for y, p in alos1.items():
            d = np.load(p)
            a1raw[y] = {"hh": d["hh_db"].astype(np.float32), "hv": d["hv_db"].astype(np.float32)}
            a1valid[y] = on(np.isfinite(d["hh_db"]) & np.isfinite(d["hv_db"]))
            passes.setdefault(y, {})["alos_palsar"] = int(len(d["dates"]))
        a1n, a1shift = normalise(a1raw, stable & np.all([np.isfinite(v["hh"]) for v in a1raw.values()], 0))
        XA = {y: features(a1n[y])[0] for y in a1n}
        XA = {y: v.reshape(-1, v.shape[-1])[idx] for y, v in XA.items()}
        y10 = on(built[2010]).astype(int)
        pa, (oofa,) = oof_series([(XA[2010], y10)], XA, fold)
        lband_p = {y: np.where(a1valid[y], pa[y], np.nan) for y in pa}
        ref_opt = {2007: 2005, 2008: 2010, 2010: 2010}
        lband_hist = {"years": sorted(a1n), "confidence": "low",
                      "auc_vs_optical": {str(y): r(auc(on(built[ref_opt[y]])[a1valid[y]], pa[y][a1valid[y]]), 3) for y in pa},
                      "built_share_pct": {str(y): r(100 * float(pa[y][a1valid[y]].mean()), 2) for y in pa},
                      "optical_share_pct": {str(y): r(100 * float(on(built[ref_opt[y]]).mean()), 2) for y in pa},
                      "normalisation_shift_db": a1shift}
        # option (b): join the series and test it against the pre-declared criterion
        yrs_b = sorted(pa) + years
        P_b = np.vstack([np.stack([np.where(a1valid[y], pa[y], np.nan) for y in sorted(pa)]), P])
        P_b = np.where(np.isfinite(P_b), P_b, np.nanmean(P_b, 0))
        fy_b, diag_b = first_year_rule(P_b, yrs_b, nis)
        long_built = on(built[2005] & built[2020])
        late = long_built & (fy_b > 2010)
        new_10_15 = on(~built[2010] & built[2015])
        kept = on(~built[2010] & ~built[2015] & ~built[2020])
        rb = boot.ratio(new_10_15, kept, (fy_b > 2010) & (fy_b <= 2015),
                        "optical new 2010->2015 vs kept open: share dated 2011-2015 with ALOS PALSAR joined",
                        CRITERIA["alos1_dolaczenie"], 2)
        false_new = float(late.sum() / long_built.sum())
        alos1_join = bool(false_new <= 0.05 and rb["passed"])
        checks["alos1_dolaczenie"] = {**rb, "what": "can ALOS PALSAR 2007-2010 date first years together with Sentinel-1?",
                                      "long_built_dated_after_2010_share": r(false_new),
                                      "long_built_cells": int(long_built.sum()), "rule_diagnostics": diag_b,
                                      "passed": alos1_join}
        print("ALOS PALSAR join test", alos1_join, r(false_new), rb["ratio"], rb["ci95"])
        if alos1_join:
            years, P, fy, diag = yrs_b, P_b, fy_b, diag_b
            for y in sorted(pa):
                probs[y] = P_b[yrs_b.index(y)]

    # ---------------------------------------------------------------- products
    start_year = years[0]
    FY = np.zeros((H, W), np.int16)
    FY.ravel()[idx] = np.where(fy == 0, 1, fy)
    newmask = (FY > LAST_OPTICAL) & (FY <= 2026)

    # ---------------------------------------------------------------- tests of the change
    city = np.zeros((H, W), bool)
    for f in json.load(open(WEB_DATA / "areas.geojson", encoding="utf-8"))["features"]:
        if f["properties"].get("role") == "city":
            city |= rasterio.features.rasterize([(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1)],
                                                out_shape=(H, W), transform=TR).astype(bool)
    wuia = json.load(open(WEB_DATA / "wuia_decyzje.geojson", encoding="utf-8"))

    def wmask(pred):
        shapes = [(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1) for f in wuia["features"] if pred(f["properties"])]
        return rasterio.features.rasterize(shapes, out_shape=(H, W), transform=TR, all_touched=False).astype(bool) \
            if shapes else np.zeros((H, W), bool)
    new_dec = wmask(lambda p: p.get("kategoria") == "nowa budowa" and p.get("status") == "decyzja"
                    and str(p.get("DATA", "")) <= "2026-08-31")
    new_dec_all = wmask(lambda p: p.get("kategoria") == "nowa budowa" and p.get("status") == "decyzja")
    any_case = wmask(lambda p: True)
    fyc = on(FY)

    # (a) optical change 2015 -> 2020
    a_new = on(~built[2015] & built[2020])
    a_kept = on(~built[2015] & ~built[2020])
    checks["metoda_2015_2020"] = boot.ratio(
        a_new, a_kept, (fyc >= 2016) & (fyc <= 2020),
        "cells the optical map turned built 2015->2020 vs cells it kept open: share radar dates as first built 2016-2020",
        CRITERIA["metoda_2015_2020"], 2)
    checks["metoda_2015_2020"]["dated_any_year_share"] = r(float((fyc[a_new] > 1).mean()))
    checks["metoda_2015_2020"]["dated_start_share"] = r(float((fyc[a_new] == start_year).mean()))
    checks["metoda_2015_2020"]["dated_after_2020_share"] = r(float((fyc[a_new] > 2020).mean()))
    # (b) building decisions 2026
    dec = on(new_dec & study)
    ref = on(city & study & ~any_case)
    hit_b = (fyc > 2020) & (fyc <= 2026)
    checks["decyzje_2026"] = boot.ratio(
        dec, ref, hit_b,
        "cells with a 'nowa budowa' decision (status decyzja, Jun-Aug 2026) vs the rest of Poznań without any case: "
        "share radar dates as first built 2021-2026", CRITERIA["decyzje_2026"], 1)
    v1 = boot.ratio(on(new_dec_all & study), ref, hit_b, "variant: all 'nowa budowa' decisions Jun-Nov 2026", "reported only", 1)
    v2 = boot.ratio(dec & on(~built[2020]), ref & on(~built[2020]), hit_b,
                    "variant: only cells not built in the optical map 2020", "reported only", 1)
    checks["decyzje_2026"]["variants"] = {"all_decisions_jun_nov": {k: v1[k] for k in ("cells", "hits", "share", "share_ref", "ratio", "ci95")},
                                          "open_in_2020_only": {k: v2[k] for k in ("cells", "hits", "share", "share_ref", "ratio", "ci95")}}
    # (c) the team's model projection for 2025
    b25 = gray("built_2025") / 255 >= THR
    open20 = study & ~built[2020]
    touch = open20 & ndimage.binary_dilation(built[2020], iterations=1)
    c_all = boot.ratio(on(open20 & b25), on(open20 & ~b25), hit_b,
                       "cells not built in 2020: projected built by 2025 vs the others, share radar dates 2021-2026",
                       "reported only", 1)
    c_fair = boot.ratio(on(touch & b25), on(touch & ~b25), hit_b,
                        "fair version, only cells touching 2020 built-up: projected built by 2025 vs not",
                        CRITERIA["prognoza_2025"], 1)
    checks["prognoza_2025"] = {**c_fair, "all_open_cells": {k: c_all[k] for k in ("cells", "hits", "share", "share_ref", "ratio", "ci95")}}

    # (d) ALOS-2 L-band, independent sensor, 2015-2021
    a2raw = {}
    for y in ALOS2_YEARS:
        hh, hv = gray(f"alos_hh_{y}"), gray(f"alos_hv_{y}")
        a2raw[y] = {"hh": np.where(hh > 0, hh / 6 - 30, np.nan).astype(np.float32),
                    "hv": np.where(hv > 0, hv / 6 - 30, np.nan).astype(np.float32)}
    a2ok = on(np.all([np.isfinite(a2raw[y]["hh"]) & np.isfinite(a2raw[y]["hv"]) for y in ALOS2_YEARS], 0))
    a2n, a2shift = normalise(a2raw, stable & np.all([np.isfinite(a2raw[y]["hh"]) for y in ALOS2_YEARS], 0))
    XA2 = {}
    for y in ALOS2_YEARS:
        F, _ = features(a2n[y])
        XA2[y] = F.reshape(-1, F.shape[-1])[idx]
    pa2, oofa2 = oof_series([(XA2[y], Y[y]) for y in TRAIN_YEARS], XA2, fold)
    yr_auc, yr_iou = {}, {}
    thin = (on(rr) % 3 == 0) & (on(cc) % 3 == 0) & a2ok
    for y in ALOS2_YEARS:
        s1b = probs[y] >= 0.5
        q = 1 - s1b[a2ok].mean()
        lab = pa2[y] >= np.quantile(pa2[y][a2ok], q)            # ALOS-2 labels at the same built area as Sentinel-1
        yr_auc[str(y)] = r(auc(lab[thin], probs[y][thin]), 3)
        yr_iou[str(y)] = r(float((lab & s1b & a2ok).sum() / ((lab | s1b) & a2ok).sum()), 3)
    with np.errstate(all="ignore"):
        rise = (pa2[2020] + pa2[2021]) / 2 - (pa2[2015] + pa2[2016]) / 2
    d_new = (fyc >= 2016) & (fyc <= 2020) & a2ok
    d_never = (fyc == 1) & a2ok
    dch = boot.ratio(d_new, d_never, rise >= 0.2,
                     "ALOS-2 L-band built probability rises by >= 0.2 from 2015-16 to 2020-21: cells Sentinel-1 dates "
                     "2016-2020 vs cells Sentinel-1 never calls built", "part of alos2_zgodnosc", 2)
    min_auc = min(yr_auc.values())
    checks["alos2_zgodnosc"] = {
        "what": "agreement of the Sentinel-1 built-up map with an ALOS-2 L-band-only classifier, same year 2015-2021",
        "criterion": CRITERIA["alos2_zgodnosc"], "auc": min_auc, "auc_by_year": yr_auc,
        "iou_equal_area_by_year": yr_iou, "alos2_auc_vs_optical": {"2015": r(auc(Y[2015][a2ok], oofa2[0][a2ok]), 3),
                                                                   "2020": r(auc(Y[2020][a2ok], oofa2[1][a2ok]), 3)},
        "change": {k: dch[k] for k in ("what", "cells", "hits", "share", "cells_ref", "hits_ref", "share_ref", "ratio", "ci95")},
        "cells": int(a2ok.sum()), "ratio": dch["ratio"], "ci95": dch["ci95"],
        "passed": bool(min_auc >= 0.85 and dch["passed"])}

    # NISAR: what it adds, agreement in 2026
    s1_new_21_24 = (fy_s1 >= 2021) & (fy_s1 <= 2024) & ev
    s1_never = (fy_s1 == 0) & ev
    nch = boot.ratio(s1_new_21_24, s1_never, bni,
                     "NISAR alone calls the cell built in 2026: cells Sentinel-1 alone dates 2021-2024 vs cells "
                     "Sentinel-1 never calls built", CRITERIA["nisar_2026"], 2)
    checks["nisar_2026"] = {**nch,
                            "auc_2020_labels": {"sentinel1_2026": r(a_s1, 3), "nisar_2026": r(a_ni, 3),
                                                "fused_2026": r(a_fu, 3), "sentinel1_series_2026": r(a_ser, 3)},
                            "agreement_2026_at_0.5": r(agree, 3), "kappa_2026": r(kappa, 3),
                            "built_share_pct_2026": {"sentinel1": r(100 * bs1.mean(), 2), "nisar": r(100 * bni[ev].mean(), 2),
                                                     "fused": r(100 * float((p_fused >= 0.5).mean()), 2)},
                            "note": "labels are optical 2020 on cells whose Sentinel-1 state did not change 2020-2026 "
                                    "(proxy: no optical map of 2026 exists)",
                            "first_year_late_steps": {"with_nisar_2025_2026": int(((fyc == 2025) | (fyc == 2026)).sum()),
                                                      "sentinel1_only_2025_2026": int(((fy_s1 == 2025) | (fy_s1 == 2026)).sum())}}

    # instrument stability: built share per year
    share_prob = {y: float(probs[y].mean()) for y in S1_YEARS}
    raw_share = {}
    m_raw = model().fit(np.vstack([Xraw[y] for y in TRAIN_YEARS]), yall)
    for y in S1_YEARS:
        F, _ = features(raw[y])
        raw_share[y] = float(m_raw.predict_proba(F.reshape(-1, F.shape[-1])[idx])[:, 1].mean())
    opt_rate = float((on(built[2020]).mean() - on(built[2015]).mean()) / 5)   # share of the study area per year
    jumps = {f"{a}-{b}": 100 * (share_prob[b] - share_prob[a]) for a, b in zip(S1_YEARS[:-1], S1_YEARS[1:])}
    jumps_raw = {f"{a}-{b}": 100 * (raw_share[b] - raw_share[a]) for a, b in zip(S1_YEARS[:-1], S1_YEARS[1:])}
    maxj = max(abs(v) for v in jumps.values())
    checks["stabilnosc_lat"] = {
        "what": "radar built-up share per year (mean probability, study area) does not jump for instrumental reasons",
        "criterion": CRITERIA["stabilnosc_lat"], "optical_growth_pp_per_year": r(100 * opt_rate, 3),
        "share_pct_normalised": {str(y): r(100 * v, 2) for y, v in share_prob.items()},
        "share_pct_without_normalisation": {str(y): r(100 * v, 2) for y, v in raw_share.items()},
        "jump_pp_normalised": {k: r(v, 2) for k, v in jumps.items()},
        "jump_pp_without_normalisation": {k: r(v, 2) for k, v in jumps_raw.items()},
        "max_jump_pp": r(maxj, 2), "max_jump_pp_raw": r(max(abs(v) for v in jumps_raw.values()), 2),
        "normalisation_median_shift_db": shifts,
        "passed": bool(maxj <= 3 * 100 * opt_rate)}

    # hectares built after 2020, per year, study area and city
    per_year = {str(y): r(float(((FY == y) & study).sum() * cell_ha), 1) for y in range(2016, 2027)}
    per_year_city = {str(y): r(float(((FY == y) & city & study).sum() * cell_ha), 1) for y in range(2016, 2027)}
    new_ha = float((newmask & study).sum() * cell_ha)
    rate_radar = new_ha / 6
    rate_opt_ha = opt_rate * N * cell_ha
    radar_16_20 = float((((FY >= 2016) & (FY <= 2020)) & study).sum() * cell_ha / 5)
    checks["tempo_po_2020"] = {
        "what": "radar new built-up area per year after 2020 vs the optical growth rate 2015-2020 (study area)",
        "criterion": CRITERIA["tempo_po_2020"], "radar_ha_per_year_2021_2026": r(rate_radar, 1),
        "radar_ha_per_year_2016_2020": r(radar_16_20, 1), "optical_ha_per_year_2015_2020": r(rate_opt_ha, 1),
        "ratio": r(rate_radar / rate_opt_ha, 3), "new_ha_by_year_study": per_year, "new_ha_by_year_city": per_year_city,
        "new_ha_since_2020_city": r(float((newmask & city & study).sum() * cell_ha), 1),
        "optical_ha_per_year_2015_2020_city": r(float((on(built[2020] & city).sum() - on(built[2015] & city).sum()) * cell_ha / 5), 1),
        "passed": bool(1 / 3 <= rate_radar / rate_opt_ha <= 3)}

    # (f) building-permit register by district (only when the district outlines have been fetched)
    if (RADAR / "obreby.geojson").exists():
        checks["pozwolenia_gunb"] = permit_check(FY, study, B, cell_ha, TR, H, W)
        fl = permit_check(FY, study, B, cell_ha, TR, H, W, merge_overlaps=False)   # first version, for the record
        checks["pozwolenia_gunb"]["first_look"] = {
            "what": "first computation, before overlapping outlines were merged (see design.changes_after_first_look)",
            **{kk: fl[kk] for kk in ("districts", "rho", "partial_rho", "ci95", "passed")},
            "timing_control_partial_rho": fl["timing_control"]["partial_rho"],
            "timing_control_partial_ci95": fl["timing_control"]["partial_ci95"]}
        pg = checks["pozwolenia_gunb"]
        print("permit register", {kk: pg[kk] for kk in ("districts", "rho", "partial_rho", "ci95", "passed")})

    # (e) the gate for the app's warning level. The rule is the one declared at the start: the method test and the
    # 2026 decisions test must both pass. On 15 Nov 2026 (~03:30) the lead considered widening it with the permit
    # register test (pozwolenia_gunb) and decided against it after seeing that test: it passes its own criterion only
    # after a bug fix made once a failing first result was known, by a margin of 0.005, and its timing control shows
    # that it cannot tell building after 2020 from building before. The register test is reported, not used here.
    zp = bool(checks["metoda_2015_2020"]["passed"] and checks["decyzje_2026"]["passed"])
    checks["zmiana_po_2020"] = {
        "what": "radar dates new built-up after 2020 well enough to rank places: metoda_2015_2020 and decyzje_2026 both pass",
        "what_pl": "Radar trafnie wskazuje rok nowej zabudowy: potwierdza zmiany z mapy optycznej 2015–2020 i decyzje o budowie z 2026 r.",
        "what_en": "Radar dates new built-up correctly: it confirms the optical changes 2015-2020 and the 2026 building decisions.",
        "criterion": CRITERIA["zmiana_po_2020"],
        "cells": checks["decyzje_2026"]["cells"], "ratio": checks["decyzje_2026"]["ratio"], "ci95": checks["decyzje_2026"]["ci95"],
        "components": {"metoda_2015_2020": checks["metoda_2015_2020"]["passed"], "decyzje_2026": checks["decyzje_2026"]["passed"]},
        "passed": zp}
    if "pozwolenia_gunb" in checks:
        pg = checks["pozwolenia_gunb"]
        checks["zmiana_po_2020"]["register_not_used"] = {
            "passed_own_criterion": pg["passed"], "partial_rho": pg["partial_rho"], "ci95": pg["ci95"],
            "first_look_ci95": pg["first_look"]["ci95"], "first_look_passed": pg["first_look"]["passed"],
            "why_pl": "Test na rejestrze pozwoleń GUNB jest podany osobno i nie wchodzi do tej reguły. Zalicza własne "
                      "kryterium dopiero po poprawce zrobionej po nieudanym pierwszym przeliczeniu, o 0,005, a jego "
                      "kontrola czasu pokazuje, że nie odróżnia budowy po 2020 r. od wcześniejszej.",
            "why_en": "The GUNB permit-register test is reported separately and is not part of this rule. It meets its "
                      "own criterion only after a fix made once a failing first computation was known, by 0.005, and "
                      "its timing control shows it cannot tell building after 2020 from earlier building."}

    # 1 km neighbourhood: new hectares after 2020 within a 1 km radius of every study cell
    rad = 1000 / land["cell_m_ground"]
    k = int(np.ceil(rad))
    yy, xx = np.mgrid[-k:k + 1, -k:k + 1]
    disk = ((yy ** 2 + xx ** 2) <= rad ** 2).astype(np.float32)
    from scipy.signal import fftconvolve
    near = fftconvolve(newmask.astype(np.float32), disk, mode="same") * cell_ha
    nq = np.quantile(near[study], [0.5, 0.75, 0.9, 0.95, 0.99])

    # ---------------------------------------------------------------- write
    np.savez_compressed(RADAR / "built_years.npz", years=np.array(years, np.int16),
                        prob=np.stack([_grid(probs[y], idx, H, W) for y in years]),
                        first_year=FY, p_nisar_2026=_grid(np.nan_to_num(p_nisar), idx, H, W),
                        prob_2026_fused=_grid(p_fused, idx, H, W),
                        lband_years=np.array(lband_hist["years"] if lband_hist else [], np.int16),
                        lband_prob=np.stack([_grid(np.nan_to_num(lband_p[y]), idx, H, W) for y in lband_hist["years"]])
                        if lband_hist else np.zeros((0, H, W), np.float32))
    OUT.mkdir(parents=True, exist_ok=True)
    png(OUT / "first_year.png", np.where(FY >= 2000, FY - 2000, FY))
    for y in list(passes):
        passes[y]["total"] = sum(v for kk, v in passes[y].items() if kk != "total")
    by_year = {str(y): passes[y]["total"] for y in sorted(passes)}
    built_share = {str(y): r(100 * float(((FY > 1) & (FY <= y) & study).sum() / N), 2) for y in years}
    meta = {
        "source": "Sentinel-1 RTC (ESA, Microsoft Planetary Computer); NISAR GCOV i GUNW (NASA-ISRO, ASF DAAC); "
                  "ALOS-2 PALSAR-2 (JAXA) do sprawdzenia" + ("; ALOS PALSAR (JAXA, ASF DAAC)" if alos1_join else ""),
        "years": years, "start_year": start_year, "last_optical_year": LAST_OPTICAL,
        "passes": {"total": int(sum(by_year.values())), "by_year": by_year,
                   "by_sensor": {str(y): {kk: v for kk, v in passes[y].items() if kk != "total"} for y in sorted(passes)}},
        "cell_ha": r(cell_ha, 4),
        "study": {"built_share_pct": built_share,
                  "built_share_pct_prob": {str(y): r(100 * float(probs[y].mean()), 2) for y in years},
                  "optical_built_share_pct": {str(y): r(100 * float(on(built[y]).mean()), 2) for y in (2015, 2020)},
                  "new_ha_since_2020": r(new_ha, 1), "new_ha_by_year": per_year,
                  "city_new_ha_since_2020": checks["tempo_po_2020"]["new_ha_since_2020_city"],
                  "city_new_ha_by_year": per_year_city},
        "near_1km": {"radius_m": 1000, "new_ha_since_2020_quantiles": {q: r(v, 2) for q, v in zip(("50", "75", "90", "95", "99"), nq)}},
        "layers": [{"name": "first_year", "file": "first_year.png", "decode": {"scale": 1, "offset": 2000, "unit": "rok"},
                    "values": {"0": "brak danych / no data", "1": "brak zabudowy do 2026 / not built through 2026",
                               str(start_year - 2000): f"zabudowane w {start_year} r. lub wcześniej / built in {start_year} or earlier"},
                    "ramp": ["#2b2b2b", "#f2a31b"],
                    "legend_pl": f"Rok, w którym radar pierwszy raz widzi zabudowę. Najciemniej: już w {start_year} r. "
                                 "albo wcześniej; najjaśniej: 2026 r. Bez koloru: radar nie widzi tu zabudowy do 2026 r.",
                    "legend_en": f"Year in which radar first sees built-up land. Darkest: already in {start_year} or "
                                 "earlier; brightest: 2026. No colour: radar sees no built-up land here through 2026."}],
        "method": {"classifier": "gradient boosting (scikit-learn HistGradientBoosting) on Sentinel-1 VV, VH, VV/VH, "
                                 "spread over the summer, 3x3 and 7x7 neighbourhood means; 2026 adds NISAR HH, HV, coherence",
                   "labels": "optical built-up map (GHSL), share >= 0.15, 2015 and 2020 only",
                   "normalisation": "quantile matching per year on unchanged cells (long-built cores, closed forest, remote farmland)",
                   "out_of_sample": "every cell predicted by a model that never saw its 16 x 16 cell block",
                   "nisar_2026": "series stays Sentinel-1 only; NISAR alone must confirm steps in 2025-2026; the fused "
                                 "Sentinel-1 + NISAR probability of 2026 is in built_years.npz (prob_2026_fused)",
                   "rule": RULE, "rule_diagnostics": diag, "rule_diagnostics_sentinel1_only": diag_s1,
                   "alos_palsar_2007_2010": ("joined the series" if alos1_join else
                                             "not joined: built-up share only, low confidence (see lband_history)")},
        "lband_history": lband_hist,
        "prognoza": {"set": "sarnik/radar_prognoza", "row": FORECAST_ROW,
                     "why": "wiersz prognozy liczonej od stanu z radaru jest wyłączony, bo aplikacja ma już wiersz prognozy; "
                            "włącza go autor aplikacji razem z danymi z pipeline/sarnik_radar_prognoza.py --web / "
                            "the forecast row is off because the app already has one; the app's author switches it on "
                            "together with the data from pipeline/sarnik_radar_prognoza.py --web"},
        "checks": checks,
    }
    with open(OUT / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))
    for kk in ("krzyzowo_lata", "metoda_2015_2020", "decyzje_2026", "prognoza_2025", "alos2_zgodnosc", "nisar_2026",
               "stabilnosc_lat", "tempo_po_2020", "pozwolenia_gunb", "zmiana_po_2020", "alos1_dolaczenie"):
        c = checks.get(kk)
        if c:
            print(f"{kk:18s} passed={c['passed']} ratio={c.get('ratio')} auc={c.get('auc')} ci95={c.get('ci95')} "
                  f"cells={c.get('cells')} hits={c.get('hits')} share={c.get('share')} ref={c.get('share_ref')}")
    print("new ha since 2020:", r(new_ha, 1), per_year, "city", per_year_city)
    print("near 1 km quantiles", meta["near_1km"])
    print("built share", built_share)
    print(f"done in {time.time() - t0:.0f} s; sizes:", {p.name: p.stat().st_size for p in OUT.iterdir()})


def _ranks(v):
    from scipy.stats import rankdata
    return rankdata(v).astype(np.float64)


def _corr(a, b):
    a, b = a - a.mean(), b - b.mean()
    d = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / d) if d > 0 else np.nan


def _resid(v, z, deg):
    Z = np.vander(z, deg + 1)
    coef, *_ = np.linalg.lstsq(Z, v, rcond=None)
    return v - Z @ coef


def spearman(x, y):
    return _corr(_ranks(x), _ranks(y))


def partial_spearman(x, y, z, deg=1):
    """Rank correlation of x and y after removing a polynomial (degree deg) in rank(z) from rank(x) and rank(y)."""
    rz = _ranks(z)
    rz = (rz - rz.mean()) / (rz.std() or 1.0)
    return _corr(_resid(_ranks(x), rz, deg), _resid(_ranks(y), rz, deg))


def permit_check(FY, study, B, cell_ha, TR, H, W, merge_overlaps=True):
    """Check pozwolenia_gunb (district level, GUNB RWDZ register). Design fixed in PERMITS / CRITERIA above."""
    import rasterio.features
    from rasterio.warp import transform_geom
    P = PERMITS
    gj = json.load(open(RADAR / "obreby.geojson", encoding="utf-8"))
    feats = sorted(gj["features"], key=lambda f: f["properties"]["teryt"])
    # cells of each outline (centre inside), one rasterisation per outline so that overlaps are visible
    cells = [np.flatnonzero(rasterio.features.rasterize(
        [(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1)], out_shape=(H, W), transform=TR,
        all_touched=False, fill=0, dtype="uint8").ravel()) for f in feats]
    # merge outlines that share cells into one unit (union-find); see PERMITS["changes_after_first_look"]
    parent = list(range(len(feats)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    owner = np.full(H * W, -1, np.int64)
    if merge_overlaps:
        for i, c in enumerate(cells):
            for j in np.unique(owner[c][owner[c] >= 0]).tolist():
                a, b = find(i), find(j)
                parent[max(a, b)] = min(a, b)
            owner[c] = i
    roots = sorted({find(i) for i in range(len(feats))})
    gid = {rt: g for g, rt in enumerate(roots)}
    groups = [[i for i in range(len(feats)) if find(i) == rt] for rt in roots]
    lab = np.zeros(H * W, np.int64)
    for i, c in enumerate(cells):          # first-look version: later outlines overwrite earlier ones
        lab[c] = gid[find(i)] + 1
    n = len(groups) + 1
    l = lab
    all_cells = np.bincount(l, minlength=n)
    st = study.ravel()
    fyv = FY.ravel()
    study_cells = np.bincount(l, weights=st.astype(np.float64), minlength=n)
    new_21_26 = np.bincount(l, weights=(st & (fyv >= 2021) & (fyv <= 2026)).astype(np.float64), minlength=n)
    new_16_20 = np.bincount(l, weights=(st & (fyv >= 2016) & (fyv <= 2020)).astype(np.float64), minlength=n)
    b20 = np.bincount(l, weights=np.where(st, B[2020].ravel(), 0), minlength=n)
    b15 = np.bincount(l, weights=np.where(st, B[2015].ravel(), 0), minlength=n)
    thr = json.load(open(LAND / "land.json"))["threshold"]
    opt_new = np.bincount(l, weights=(st & (B[2015].ravel() < thr) & (B[2020].ravel() >= thr)).astype(np.float64), minlength=n)

    # register: parcels per unit (aggregated files, no personal data). In a merged unit the same parcel number under
    # two codes is the same parcel: counted once, "new building" if any record has one, last year = the latest.
    def parcels(members):
        rec = {}
        for i in members:
            p = WEB_DATA / "sarnik" / "dzialka" / f"{feats[i]['properties']['file']}.json"
            for line in json.loads(p.read_text(encoding="utf-8"))["rows"].splitlines():
                parts = line.split(",")
                if len(parts) < 5:
                    continue
                new = int(parts[1] or 0) > 0
                last = 2000 + int(parts[4]) if parts[4] else 0
                o = rec.get(parts[0], (False, 0))
                rec[parts[0]] = (o[0] or new, max(o[1], last))
        c = {"21_26": 0, "16_18": 0, "16_20": 0, "parcels": len(rec)}
        for new, last in rec.values():
            if new:
                c["21_26"] += 2021 <= last <= 2026
                c["16_18"] += 2016 <= last <= 2018
                c["16_20"] += 2016 <= last <= 2020
        return c
    reg = [parcels(g) for g in groups]

    sc, ac = study_cells[1:], all_cells[1:]
    keep = (sc >= P["min_study_cells"]) & (sc >= P["min_study_share"] * np.maximum(ac, 1))
    k = np.flatnonzero(keep)
    km2_s = sc[k] * cell_ha / 100
    km2_a = ac[k] * cell_ha / 100
    radar = new_21_26[1:][k] * cell_ha / km2_s                     # ha per km2
    radar_old = new_16_20[1:][k] * cell_ha / km2_s
    optical = opt_new[1:][k] * cell_ha / km2_s
    share20 = b20[1:][k] / sc[k]
    share15 = b15[1:][k] / sc[k]
    reg_main = np.array([reg[i]["21_26"] for i in k]) / km2_a
    reg_old = np.array([reg[i]["16_18"] for i in k]) / km2_a
    reg_rev = np.array([reg[i]["16_20"] for i in k]) / km2_a
    unit = np.array([feats[groups[i][0]]["properties"]["teryt"][:6] for i in k])
    nd = len(k)

    # clustered bootstrap: draw municipalities with replacement
    uu, inv = np.unique(unit, return_inverse=True)
    members = [np.flatnonzero(inv == j) for j in range(len(uu))]
    rng = np.random.default_rng(SEED)
    draws = [np.concatenate([members[j] for j in rng.integers(0, len(uu), len(uu))]) for _ in range(BOOT)]

    def ci(stat):
        v = np.array([stat(d) for d in draws])
        v = v[np.isfinite(v)]
        return [r(np.percentile(v, 2.5), 3), r(np.percentile(v, 97.5), 3)], v

    def full(stat):
        return stat(np.arange(nd))

    def stat_set(x, y, z):
        s = lambda d: spearman(x[d], y[d])                         # noqa: E731
        p1 = lambda d: partial_spearman(x[d], y[d], z[d], 1)        # noqa: E731
        p2 = lambda d: partial_spearman(x[d], y[d], z[d], 2)        # noqa: E731
        (c_s, _), (c_p, v_p), (c_q, _) = ci(s), ci(p1), ci(p2)
        return {"rho": r(full(s), 3), "rho_ci95": c_s, "partial_rho": r(full(p1), 3), "partial_ci95": c_p,
                "partial_rho_quadratic": r(full(p2), 3), "partial_quadratic_ci95": c_q,
                "p_boot_partial_le_0": r(float(np.mean(v_p <= 0)), 4)}, (p1, v_p)

    main_s, (p_main, v_main) = stat_set(radar, reg_main, share20)
    tim_s, (p_tim, v_tim) = stat_set(radar, reg_old, share20)
    rev_s, _ = stat_set(radar_old, reg_rev, share15)
    opt_s, _ = stat_set(optical, reg_rev, share15)
    diff = np.array([p_main(d) - p_tim(d) for d in draws])
    diff = diff[np.isfinite(diff)]

    # dose-response: four equal-count groups by register density 2021-2026 (stable order, districts sorted by TERYT)
    order = np.argsort(reg_main, kind="stable")
    grp = np.zeros(nd, int)
    for g, part in enumerate(np.array_split(order, 4)):
        grp[part] = g
    dose = []
    for g in range(4):
        m = grp == g

        def pooled(d, m=m):
            d = d[m[d]]
            return float((radar[d] * km2_s[d]).sum() / km2_s[d].sum()) if d.size else np.nan
        c, _ = ci(pooled)
        dose.append({"group": g + 1, "districts": int(m.sum()),
                     "register_per_km2_range": [r(reg_main[m].min(), 2), r(reg_main[m].max(), 2)],
                     "register_per_km2_median": r(float(np.median(reg_main[m])), 2),
                     "built_share_2020_mean": r(float(share20[m].mean()), 3),
                     "radar_new_ha_per_km2_2021_2026": r(pooled(np.arange(nd)), 3), "ci95": c})

    lo = main_s["partial_ci95"][0]
    passed = bool(lo is not None and lo > 0.15)
    return {
        "what": "Czy radar widzi więcej nowej zabudowy z lat 2021–2026 w obrębach, w których rejestr GUNB ma więcej "
                "działek z nową budową (ostatnia sprawa 2021–2026), także przy tym samym udziale zabudowy w 2020 r.?",
        "what_pl": "Czy radar widzi więcej nowej zabudowy z lat 2021–2026 w obrębach, w których rejestr GUNB ma więcej "
                   "działek z nową budową (ostatnia sprawa 2021–2026), także przy tym samym udziale zabudowy w 2020 r.?",
        "what_en": "Does radar see more new built-up land in 2021-2026 in districts where the GUNB register has more "
                   "parcels with a new building (last case 2021-2026), also at the same 2020 built-up share?",
        "criterion": CRITERIA["pozwolenia_gunb"], "design": P,
        "districts_with_outline": len(feats), "units_after_merging_overlaps": len(groups),
        "merged_units": [[feats[i]["properties"]["teryt"] for i in g] for g in groups if len(g) > 1],
        "districts": nd, "municipalities": int(len(uu)),
        "dropped_small_or_outside_study": int(len(groups) - nd),
        "parcels_new_21_26": int(sum(reg[i]["21_26"] for i in k)), "parcels_new_16_18": int(sum(reg[i]["16_18"] for i in k)),
        "parcels_new_16_20": int(sum(reg[i]["16_20"] for i in k)),
        "radar_new_ha_2021_2026": r(float((radar * km2_s).sum()), 1), "area_km2": r(float(km2_s.sum()), 1),
        **{kk: main_s[kk] for kk in ("rho", "rho_ci95", "partial_rho", "partial_rho_quadratic",
                                     "partial_quadratic_ci95", "p_boot_partial_le_0")},
        "ci95": main_s["partial_ci95"],
        "dose_response": dose,
        "timing_control": {"what": "radar 2021-2026 vs parcels with a new building and last case 2016-2018",
                           **tim_s, "difference_main_minus_timing": r(full(p_main) - full(p_tim), 3),
                           "difference_ci95": [r(np.percentile(diff, 2.5), 3), r(np.percentile(diff, 97.5), 3)]},
        "reverse_period": {"what": "radar first built 2016-2020 vs parcels with a new building and last case "
                                   "2016-2020, partial on the 2015 built-up share", **rev_s},
        "register_vs_optical": {"what": "optical new built-up 2015->2020 vs parcels with a new building and last "
                                        "case 2016-2020, partial on the 2015 built-up share", **opt_s},
        "passed": passed}


def _grid(v, idx, H, W):
    g = np.zeros(H * W, np.float32)
    g[idx] = v
    return g.reshape(H, W)


if __name__ == "__main__":
    main()
