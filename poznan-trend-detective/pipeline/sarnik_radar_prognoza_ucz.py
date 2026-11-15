"""SARnik experiment: can the "what may be built next door" forecast be TRAINED on what radar saw?

pipeline/sarnik_radar_prognoza.py only CHECKS the app's optical-trained model against radar. This script trains
models on radar-observed transitions and tests them on a later period and on blocks of land they never saw,
against the app's model (M0) and a no-model baseline (B0). The whole design and the pass criteria are fixed in
DESIGN and CRITERIA below, before any outcome is computed.

Inputs (git-ignored, data/raw/): urban_grid.npz and roads.json (pipeline/fetch_urban.py), radar/built_years.npz
(pipeline/sarnik_radar_lata.py), radar/s1_<year>.npz (pipeline/sarnik_radar_lata_s1.py).
Outputs (git-ignored, nothing under web/): data/raw/radar/radar_prognoza_ucz/wyniki.json,
data/raw/radar/dopisek_prognoza_ucz.md, and only if the criterion passes, data/raw/radar/radar_prognoza_ucz/
prob_4y.png + meta.json (forward projection from the 2026 radar state).

Run (from poznan-trend-detective/, about 2-3 minutes):  .venv/bin/python -I pipeline/sarnik_radar_prognoza_ucz.py
"""
import json
import math
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # -I drops the script folder from the path

import numpy as np  # noqa: E402
from scipy import ndimage  # noqa: E402

from common import RAW  # noqa: E402

RADAR = RAW / "radar"
OUT = RADAR / "radar_prognoza_ucz"
NOTE = RADAR / "dopisek_prognoza_ucz.md"

# ---------------------------------------------------------------- design, fixed before any outcome is computed
DESIGN = {
    "unit": "120 m cell of the app grid (EPSG:3857, about 73 m on the ground), study area only, radar first_year > 0",
    "periods": {"A": {"start": 2018, "optical_epoch": 2015, "outcome": [2019, 2022], "momentum": [2016, 2018]},
                "B": {"start": 2022, "optical_epoch": 2020, "outcome": [2023, 2026], "momentum": [2020, 2022]}},
    "open_at_start": "optical built-up share at the epoch < 0.15 AND radar first_year is 'not built' or later than the start year",
    "outcome": "radar first_year inside the outcome years (four years, not five)",
    "start_state": "optical share at the epoch; cells radar first dates in (epoch, start] raised to at least new_cell_level "
                   "(0.168, median share of cells that turned built 2015-2020), as model_urban.py builds a projected state",
    "fringe": "open cells with start share < 0.05 whose 3 x 3 neighbourhood holds a built cell (start share >= 0.15)",
    "split": "16 x 16 cell blocks (about 1.2 km); a random half of all blocks (seed below) is the TRAIN half; models are fitted "
             "on period A cells in the train half and tested on period B cells in the other half (primary). Also reported: "
             "fit on all of A, test on all of B",
    "models": {
        "M0": "the app's model: logistic, nine predictors, refitted on the optical 2005-2020 periods exactly as model_urban.py "
              "(its coefficients equal land.json -> model to 3 decimals, checked), run on the test period's start state "
              "(it predicts a 5-year chance)",
        "B0": "no model: built-up share within ~1.1 km (15 x 15 cell mean) of the start state",
        "M1": "the same nine predictors, logistic (model_urban.fit_logistic), fitted on radar-observed transitions of period A",
        "M2": "M1 + radar predictors known at the start year: Sentinel-1 VV, VH, VV spread in the summer (each centred by "
              "subtracting that year's study-area median, because the yearly composites shift by up to ~0.6 dB for reasons "
              "unrelated to building); the radar built-up probability of the cell (built_years.npz prob) and its 3 x 3 and "
              "7 x 7 means; momentum = hectares radar first dated in the three years up to the start within ~360 m (5 x 5) "
              "and ~1.1 km (15 x 15). VV-VH in dB is exactly VV minus VH, so it adds nothing to a linear model and is left "
              "out of M2 only (it would make the coefficients unidentifiable)",
        "M3": "the M2 predictors plus VV-VH in scikit-learn HistGradientBoostingClassifier (max_depth 4, learning_rate 0.05, "
              "max_iter 300, min_samples_leaf 50, no early stopping, random_state fixed)",
    },
    "best_model_rule": "the 'best radar-trained model' is the one of M1, M2, M3 with the highest fringe AUC on period A's "
                       "held-out half of blocks (fitted on the train half of A). Period B is not looked at for the choice",
    "metrics": "on the test cells: AUC; share of positives in the model's top 5 % vs the other 95 % (ratio); the same two on "
               "the fringe subset. 95 % intervals from a block bootstrap over the test blocks (1000 draws, one set of draws "
               "shared by all models, so differences are paired). Paired differences of AUC and ratio against M0 and B0",
    "importance": "standardised coefficients of M2; permutation importance of M3 on the test set (drop in AUC, 5 repeats)",
    "calibration": "ten equal-count bins of the predicted chance on the test cells: mean prediction vs observed rate "
                   "(M0 predicts a 5-year chance against a 4-year outcome)",
    "robustness": {
        "outcome_2023_2024": "period B outcome restricted to 2023-2024; cells first dated 2025-2026 are removed from the test "
                             "(2025-2026 are under-counted by a stricter radar rule)",
        "no_own_probability": "M2 and M3 refitted without the cell's own radar built-up probability",
        "no_probability_at_all": "M2 and M3 refitted without the cell's own probability and its 3 x 3 and 7 x 7 means",
    },
    "projection": "only if the criterion passes: the best model refitted on A and B (all blocks), run on the 2026 start state "
                  "(optical 2020, radar 2021-2026 raised; momentum 2024-2026) for cells still open in 2026; chance of being first "
                  "built within four years; prob_4y.png, v = round(255 * sqrt(p)), at least 1 where a chance exists, 0 = no data "
                  "or already built",
}
BLOCK = 16
N_BOOT = 1000
SEED = 20261116
TOP_SHARE = 0.05
OPEN_SHARE = 0.05
HGB = dict(max_depth=4, learning_rate=0.05, max_iter=300, min_samples_leaf=50, early_stopping=False, random_state=SEED)
DIFF_ALL_MIN = -0.01
CRITERIA = {
    "radar_training_helps": "PASS only if the best radar-trained model (rule in DESIGN) on the primary split (train A on the "
                            "train half of blocks, test B on the other half) has (1) a fringe AUC above M0's with the lower "
                            "bound of the paired 95 % interval of the difference above 0, AND (2) a fringe AUC above B0's with "
                            "the lower bound above 0, AND (3) an all-cells AUC not worse than B0's: lower bound of the "
                            "difference above -0.01. Each part is reported separately",
    "projection_written": "the forward projection is written only if radar_training_helps passes",
}


# ---------------------------------------------------------------- second round (declared 15.11.2026 after the first
# report, BEFORE computing any of it; it adds analyses and changes no model, number or criterion above)
DESIGN2 = {
    "why": "the first round passed, but the gain sits in radar momentum, and both momentum and outcome come from the "
           "same radar dating rule: does momentum predict NEW places, or the rest of the same estate dated in "
           "different years by detector noise? And does the radar-trained model also rank better against an outcome "
           "with no radar in it (GUNB permit register)?",
    "gap_in_time": {
        "what": "M2 refitted (period A, train half; tested on period B, other half, as the primary split) with momentum "
                "from a window that ends one or two years before the start. Momentum is in hectares PER YEAR of the "
                "window, because period A's windows are shorter (the record starts in 2015, and 2015 means 'built in "
                "2015 or earlier', not a dated event, so the first dated year is 2016)",
        "gap1": {"A": [2016, 2017], "B": [2019, 2021]},
        "gap2": {"A": [2016, 2016], "B": [2018, 2020]},
        "report": "fringe and all-cells AUC with intervals; paired differences to B0 and to M2 (same draws)",
    },
    "gap_in_space": {
        "what": "M2 as fitted in the primary split, scored on the primary test cells WITHOUT every cell whose 3 x 3 "
                "(separately 7 x 7) neighbourhood holds a cell radar first dated in period B's momentum window "
                "(2020-2022); the exclusion removes positives and negatives alike",
        "report": "positives left; fringe and all-cells AUC of M2, M0, B0 on the reduced set; paired differences",
    },
    "gain_share": "fringe AUC of the variant minus B0's on the cells of that comparison, divided by M2's fringe AUC gain "
                  "over B0 on the full primary test set",
    "register": {
        "units": "cadastral districts as in pipeline/sarnik_radar_lata.py check pozwolenia_gunb (outlines from "
                 "data/raw/radar/obreby.geojson, centre-inside cells, outlines sharing cells merged into one unit, a "
                 "parcel number counted once per unit), same filters: at least 50 study cells and at least 90 % of the "
                 "district's cells inside the study area; in addition at least 10 open cells at the start of period B",
        "predictor": "per district: mean over its open cells at the start of period B (2022) of M2 (fitted on period A, "
                     "all blocks, so no outcome year 2023-2026 is in the training), of M0 and of B0",
        "outcome": "parcels with >= 1 new-building case and last-case year 2023-2026, per km2 of the district (all its "
                   "cells); timing control: last-case year 2016-2018",
        "covariate": "2020 built-up share of the district (share of its study cells built in the optical 2020 map), as "
                     "in pozwolenia_gunb",
        "statistic": "Spearman rank correlation; partial rank correlation after a linear fit on rank(covariate) "
                     "(functions from sarnik_radar_lata.py); 95 % intervals from 2000 bootstrap draws of municipalities "
                     "(first six TERYT digits), districts of a drawn municipality kept together; paired differences "
                     "M2 - M0 and M2 - B0 of the partial correlation on the same draws",
    },
}
CRITERIA2 = {
    "gain_not_mainly_date_noise": "PASS only if (1) M2 with the two-year gap beats B0 on fringe AUC with the lower bound "
                                  "of the paired difference above 0, AND (2) on the 7 x 7 reduced test set M2 beats B0 "
                                  "on fringe AUC with the lower bound of the paired difference above 0",
    "independently_better": "PASS only if the paired difference of district partial rank correlations M2 - M0 "
                            "(outcome: register parcels 2023-2026) has a 95 % lower bound above 0. M2 - B0 reported "
                            "the same way, without pass/fail",
}


def die(msg):
    sys.exit(f"sarnik_radar_prognoza_ucz: {msg}")


# ---------------------------------------------------------------- inputs

def load_inputs():
    need = [RAW / "urban_grid.npz", RAW / "roads.json", RADAR / "built_years.npz"]
    miss = [str(p) for p in need if not p.exists()]
    if miss:
        die("missing inputs: " + ", ".join(miss) + " (run pipeline/fetch_urban.py and pipeline/sarnik_radar_lata.py)")
    s1_need = [RADAR / f"s1_{y}.npz" for y in (2018, 2022, 2026)]
    miss = [str(p) for p in s1_need if not p.exists()]
    if miss:
        die("missing Sentinel-1 composites: " + ", ".join(miss) + " (run pipeline/sarnik_radar_lata_s1.py)")
    import sarnik_radar_prognoza as srp    # shared helpers (grid, predictors, weighted AUC); writes nothing on import
    return srp


def s1_feats(year, study):
    a = np.load(RADAR / f"s1_{year}.npz")
    out = {}
    for k, name in (("vv_db", "vv"), ("vh_db", "vh"), ("vv_std_db", "vv_spread")):
        x = a[k].astype(float)
        med = np.nanmedian(x[study])
        x = np.where(np.isfinite(x), x, med) - med
        out[name] = x
    out["vv_minus_vh"] = out["vv"] - out["vh"]
    return out


# ---------------------------------------------------------------- statistics

def calib(p, y, bins=10):
    order = np.argsort(p, kind="mergesort")
    parts = np.array_split(order, bins)
    return [{"mean_pred": round(float(p[i].mean()), 5), "observed": round(float(y[i].mean()), 5), "cells": int(len(i))}
            for i in parts]


def paired(scores, y, blk, subsets, rng, srp, refs=("M0", "B0")):
    """scores: {model: 1-D}; y: 1-D 0/1; blk: block id per cell; subsets: {name: bool mask}.
    Returns per subset per model AUC and ratio with block-bootstrap intervals, and paired differences vs M0 and B0."""
    y = y.astype(float)
    used = np.unique(blk)
    remap = np.searchsorted(used, blk)
    prep = {}
    for sn, m in subsets.items():
        for mn, s in scores.items():
            g, ng = srp.rank_groups(s[m])
            top = s[m] >= np.quantile(s[m], 1 - TOP_SHARE)
            prep[sn, mn] = (g, ng, top)
    one = np.ones(len(y))
    point = {(sn, mn): (srp.wauc(g, ng, y[subsets[sn]], one[subsets[sn]]),
                        srp.top_ratio(top, y[subsets[sn]], one[subsets[sn]]))
             for (sn, mn), (g, ng, top) in prep.items()}
    boot = {k: ([], []) for k in prep}
    for _ in range(N_BOOT):
        draw = rng.integers(0, len(used), len(used))
        wt = np.bincount(draw, minlength=len(used))[remap].astype(float)
        for (sn, mn), (g, ng, top) in prep.items():
            m = subsets[sn]
            ys, ws = y[m], wt[m]
            if (ws * ys).sum() == 0 or (ws * (1 - ys)).sum() == 0:
                boot[sn, mn][0].append(np.nan)
                boot[sn, mn][1].append(np.nan)
                continue
            boot[sn, mn][0].append(srp.wauc(g, ng, ys, ws))
            boot[sn, mn][1].append(srp.top_ratio(top, ys, ws)[2])
    ci = lambda b, k: [round(float(np.nanpercentile(b, 2.5)), k), round(float(np.nanpercentile(b, 97.5)), k)]
    res = {}
    for sn, m in subsets.items():
        r = {"cells": int(m.sum()), "positives": int(y[m].sum()), "blocks": int(len(np.unique(blk[m]))), "models": {}}
        for mn in scores:
            a, (st, sr, ra) = point[sn, mn]
            ba, br = np.array(boot[sn, mn][0]), np.array(boot[sn, mn][1])
            e = {"auc": round(a, 3), "auc_ci95": ci(ba, 3), "top5_share": round(st, 4), "rest_share": round(sr, 4),
                 "ratio": round(ra, 2), "ratio_ci95": ci(br, 2)}
            for ref in refs:
                if ref in scores and ref != mn:
                    da = ba - np.array(boot[sn, ref][0])
                    dr = br - np.array(boot[sn, ref][1])
                    e[f"auc_minus_{ref}"] = round(a - point[sn, ref][0], 3)
                    e[f"auc_minus_{ref}_ci95"] = ci(da, 3)
                    e[f"ratio_minus_{ref}"] = round(ra - point[sn, ref][1][2], 2)
                    e[f"ratio_minus_{ref}_ci95"] = ci(dr, 2)
            r["models"][mn] = e
        res[sn] = r
    return res


def paired_vs(test_sel, P, scores, ref, rng, srp):
    """paired() on a subset of a period's open cells, with an optional extra reference model."""
    sc = {k: v[test_sel] for k, v in scores.items()}
    subsets = {"all": np.ones(int(test_sel.sum()), bool), "fringe": P["fringe"][test_sel]}
    refs = ("M0", "B0") + ((ref,) if ref else ())
    return paired(sc, P["y"][test_sel], P["blk"][test_sel], subsets, rng, srp, refs=refs)


def district_test(PB, scores, study, B, cell_ha, tr, h, w):
    """Independent test against the GUNB permit register by cadastral district (DESIGN2['register']).
    Units, filters and statistics as in sarnik_radar_lata.py's check pozwolenia_gunb (code copied in its minimum
    form: per-outline rasterisation, merging outlines that share cells, a parcel counted once per unit)."""
    import rasterio.features
    from rasterio.warp import transform_geom
    import sarnik_radar_lata as srl          # defines functions and constants only on import
    from common import WEB_DATA
    gpath = RADAR / "obreby.geojson"
    dz = WEB_DATA / "sarnik" / "dzialka"
    if not gpath.exists() or not dz.exists():
        print("register test skipped: data/raw/radar/obreby.geojson or web/data/sarnik/dzialka missing", flush=True)
        return {"skipped": "missing data/raw/radar/obreby.geojson or web/data/sarnik/dzialka"}
    gj = json.load(open(gpath, encoding="utf-8"))
    feats = sorted(gj["features"], key=lambda f: f["properties"]["teryt"])
    cells = [np.flatnonzero(rasterio.features.rasterize(
        [(transform_geom("EPSG:4326", "EPSG:3857", f["geometry"]), 1)], out_shape=(h, w), transform=tr,
        all_touched=False, fill=0, dtype="uint8").ravel()) for f in feats]
    parent = list(range(len(feats)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    owner = np.full(h * w, -1, np.int64)
    for i, c in enumerate(cells):
        for j in np.unique(owner[c][owner[c] >= 0]).tolist():
            a, b = find(i), find(j)
            parent[max(a, b)] = min(a, b)
        owner[c] = i
    roots = sorted({find(i) for i in range(len(feats))})
    gid = {rt: g for g, rt in enumerate(roots)}
    groups = [[i for i in range(len(feats)) if find(i) == rt] for rt in roots]
    lab = np.zeros(h * w, np.int64)
    for i, c in enumerate(cells):
        lab[c] = gid[find(i)] + 1
    n = len(groups) + 1
    st = study.ravel()
    all_cells = np.bincount(lab, minlength=n)[1:]
    study_cells = np.bincount(lab, weights=st.astype(float), minlength=n)[1:]
    b20 = np.bincount(lab, weights=np.where(st, B[2020].ravel(), 0), minlength=n)[1:]
    om = PB["mask"].ravel()
    lab_open = lab[om]
    open_cells = np.bincount(lab_open, minlength=n)[1:]
    mean_score = {k: np.bincount(lab_open, weights=v, minlength=n)[1:] / np.maximum(open_cells, 1)
                  for k, v in scores.items()}

    def parcels(members):
        rec = {}
        for i in members:
            fp = dz / f"{feats[i]['properties']['file']}.json"
            for line in json.loads(fp.read_text(encoding="utf-8"))["rows"].splitlines():
                parts = line.split(",")
                if len(parts) < 5:
                    continue
                new = int(parts[1] or 0) > 0
                last = 2000 + int(parts[4]) if parts[4] else 0
                o = rec.get(parts[0], (False, 0))
                rec[parts[0]] = (o[0] or new, max(o[1], last))
        return {"23_26": sum(1 for nw, la in rec.values() if nw and 2023 <= la <= 2026),
                "16_18": sum(1 for nw, la in rec.values() if nw and 2016 <= la <= 2018)}
    reg = [parcels(g) for g in groups]
    PP = srl.PERMITS
    keep = ((study_cells >= PP["min_study_cells"]) & (study_cells >= PP["min_study_share"] * np.maximum(all_cells, 1))
            & (open_cells >= 10))
    k = np.flatnonzero(keep)
    km2_a = all_cells[k] * cell_ha / 100
    share20 = b20[k] / study_cells[k]
    y_main = np.array([reg[i]["23_26"] for i in k]) / km2_a
    y_old = np.array([reg[i]["16_18"] for i in k]) / km2_a
    x = {m: mean_score[m][k] for m in scores}
    unit = np.array([feats[groups[i][0]]["properties"]["teryt"][:6] for i in k])
    uu, inv = np.unique(unit, return_inverse=True)
    members = [np.flatnonzero(inv == j) for j in range(len(uu))]
    rng = np.random.default_rng(SEED + 3)
    draws = [np.concatenate([members[j] for j in rng.integers(0, len(uu), len(uu))]) for _ in range(srl.BOOT)]
    ci = lambda v: [round(float(np.nanpercentile(v, 2.5)), 3), round(float(np.nanpercentile(v, 97.5)), 3)]

    def block(yv):
        out, pv = {}, {}
        for m in scores:
            rho = srl.spearman(x[m], yv)
            par = srl.partial_spearman(x[m], yv, share20, 1)
            vr = np.array([srl.spearman(x[m][d], yv[d]) for d in draws])
            vp = np.array([srl.partial_spearman(x[m][d], yv[d], share20[d], 1) for d in draws])
            pv[m] = (par, vp)
            out[m] = {"rho": round(rho, 3), "rho_ci95": ci(vr), "partial_rho": round(par, 3), "partial_ci95": ci(vp)}
        for ref in ("M0", "B0"):
            d = pv["M2"][1] - pv[ref][1]
            out[f"M2_minus_{ref}_partial"] = round(pv["M2"][0] - pv[ref][0], 3)
            out[f"M2_minus_{ref}_partial_ci95"] = ci(d)
        return out
    main_r, tim_r = block(y_main), block(y_old)
    passed = bool(main_r["M2_minus_M0_partial_ci95"][0] > 0)
    res = {"districts": int(len(k)), "municipalities": int(len(uu)), "units_after_merging": len(groups),
           "parcels_new_23_26": int(sum(reg[i]["23_26"] for i in k)),
           "parcels_new_16_18": int(sum(reg[i]["16_18"] for i in k)),
           "open_cells_in_districts": int(open_cells[k].sum()), "bootstrap_draws": int(srl.BOOT),
           "main_2023_2026": main_r, "timing_control_2016_2018": tim_r,
           "passed": passed, "criterion": CRITERIA2["independently_better"],
           "can_show": "whether districts the model rates higher got more new-building permit activity in 2023-2026, "
                       "beyond what their 2020 built-up share explains, with no radar in the outcome",
           "cannot_show": ["district level, not cells or plots",
                           "'last year' is the parcel's last case of ANY kind (new building, extension, demolition), "
                           "so a 2023-2026 last year does not date the new-building case",
                           "a permit is not a building: it may be built later or never",
                           "18 municipalities: the clustered interval is wide",
                           "the register covers only the city and county of Poznan"]}
    print(f"\n== ROUND 2, register test ({res['districts']} districts, {res['municipalities']} municipalities, "
          f"{res['parcels_new_23_26']} parcels 2023-2026)", flush=True)
    for lab_, r_ in (("main 2023-2026", main_r), ("timing control 2016-2018", tim_r)):
        print(f"  [{lab_}]", json.dumps(r_), flush=True)
    print("  independently_better passed:", passed, flush=True)
    return res


def print_table(label, res):
    print(f"\n== {label}")
    for sn, r in res.items():
        print(f"  [{sn}] cells {r['cells']}, positives {r['positives']}, blocks {r['blocks']}")
        for mn, e in r["models"].items():
            extra = "".join(f"  dAUC vs {ref} {e[f'auc_minus_{ref}']:+.3f} {e[f'auc_minus_{ref}_ci95']}"
                            for ref in ("M0", "B0", "M2") if f"auc_minus_{ref}" in e)
            print(f"    {mn:10s} AUC {e['auc']:.3f} {e['auc_ci95']}  ratio {e['ratio']:.2f} {e['ratio_ci95']}{extra}")
    sys.stdout.flush()


# ---------------------------------------------------------------- main

def main():
    t0 = time.time()
    srp = load_inputs()
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.inspection import permutation_importance

    mu = srp.load_model_code()
    land, tr, w, h, epochs, built, dem, tc, origin = srp.load_grid(mu)
    if "urban_grid" not in origin:
        die("expected data/raw/urban_grid.npz predictors")
    study = srp.study_mask(mu, tr, w, h)
    static = srp.static_predictors(mu, tr, w, h, dem, tc)
    THR = mu.THR
    B = {e: built[e] >= THR for e in built}
    cell_ha = (abs(tr.a) * math.cos(math.radians(52.4))) ** 2 / 1e4
    blk, nblk = srp.block_ids(h, w)
    blk = blk.reshape(h, w)

    r = np.load(RADAR / "built_years.npz")
    fy = r["first_year"].astype(int)
    if fy.max() < 100:                       # PNG-style encoding (v = year - 2000); the npz stores years
        fy = np.where(fy > 1, fy + 2000, fy)
    ryears = [int(y) for y in r["years"]]
    prob = {y: r["prob"][i].astype(float) for i, y in enumerate(ryears)}
    valid = study & (fy > 0)
    for need in (2018, 2022, 2026):
        if need not in prob:
            die(f"built_years.npz has no probability for {need}")

    # ---- M0: the app's model, refitted exactly as model_urban.main() (three optical periods) ----
    def period(t0_, t1_):
        cand = study & ~B[t0_]
        return mu.features(built[t0_], static)[cand.ravel()], B[t1_][cand].astype(float)
    Xs, ys = zip(*(period(a, b) for a, b in ((2005, 2010), (2010, 2015), (2015, 2020))))
    Xo, yo = np.vstack(Xs), np.concatenate(ys)
    m0, s0 = Xo.mean(0), Xo.std(0) + 1e-9
    w0 = mu.fit_logistic((Xo - m0) / s0, yo)
    coef0 = {n: round(float(c), 3) for n, c in zip(srp.NAMES, w0[1:])}
    same = all(abs(coef0[n] - land["model"]["coefficients_standardised"][n]) < 0.0015 for n in srp.NAMES)
    if not same:
        die(f"M0 does not reproduce land.json coefficients: {coef0}")
    new_level = float(np.median(built[2020][study & ~B[2015] & B[2020]]))

    # ---- period tables ----
    rng_split = np.random.default_rng(SEED)
    train_half = np.zeros(nblk, bool)
    train_half[rng_split.permutation(nblk)[: nblk // 2]] = True

    def build_period(P):
        st, ep = P["start"], P["optical_epoch"]
        o0, o1 = P["outcome"]
        k0, k1 = P["momentum"]
        state = built[ep].copy()
        rais = valid & (fy > ep) & (fy <= st)
        state[rais] = np.maximum(state[rais], new_level)
        radar_by_start = valid & (fy > 1) & (fy <= st)
        open_ = valid & (built[ep] < THR) & ~radar_by_start
        y = valid & (fy >= o0) & (fy <= o1)
        fringe = open_ & (state < OPEN_SHARE) & ndimage.binary_dilation(state >= THR, np.ones((3, 3), bool))
        nine = mu.features(state, static)
        s1 = s1_feats(st, study)
        p = prob[st]
        mom = ((fy >= k0) & (fy <= k1) & valid).astype(float)
        radar = {"vv": s1["vv"], "vh": s1["vh"], "vv_spread": s1["vv_spread"], "vv_minus_vh": s1["vv_minus_vh"],
                 "p_cell": p, "p_3x3": ndimage.uniform_filter(p, 3), "p_7x7": ndimage.uniform_filter(p, 7),
                 "new_ha_360m": ndimage.uniform_filter(mom, 5) * 25 * cell_ha,
                 "new_ha_1km": ndimage.uniform_filter(mom, 15) * 225 * cell_ha}
        # post-hoc only: the same momentum from the OPTICAL map (cells turned built epoch-5 -> epoch), independent of
        # the radar detector; older than the radar momentum (A: 2010-2015, B: 2015-2020)
        omom = (study & B[ep] & ~B[ep - 5]).astype(float)
        radar["opt_new_ha_360m"] = ndimage.uniform_filter(omom, 5) * 25 * cell_ha
        radar["opt_new_ha_1km"] = ndimage.uniform_filter(omom, 15) * 225 * cell_ha
        # second round only: momentum windows ending one / two years before the start (ha per year), and the
        # neighbourhood of cells dated inside the original momentum window
        tag = "A" if st == 2018 else "B"
        for g in ("gap1", "gap2"):
            g0, g1 = DESIGN2["gap_in_time"][g][tag]
            gm_ = ((fy >= g0) & (fy <= g1) & valid).astype(float) / (g1 - g0 + 1)
            radar[f"{g}_new_ha_360m"] = ndimage.uniform_filter(gm_, 5) * 25 * cell_ha
            radar[f"{g}_new_ha_1km"] = ndimage.uniform_filter(gm_, 15) * 225 * cell_ha
        near3 = ndimage.binary_dilation(mom > 0, np.ones((3, 3), bool))
        near7 = ndimage.binary_dilation(mom > 0, np.ones((7, 7), bool))
        m = open_.ravel()
        return {"near3": near3[open_], "near7": near7[open_], "mask": open_, "y": y[open_].astype(float), "fringe": fringe[open_], "blk": blk[open_],
                "nine": nine[m], "radar": {k: v[open_] for k, v in radar.items()},
                "b0": ndimage.uniform_filter(state, 15)[open_], "state": state, "years_out": fy[open_]}

    PA, PB = (build_period(DESIGN["periods"][k]) for k in ("A", "B"))
    print(f"period A: open {PA['mask'].sum()}, positives {int(PA['y'].sum())}, fringe {int(PA['fringe'].sum())}; "
          f"period B: open {PB['mask'].sum()}, positives {int(PB['y'].sum())}, fringe {int(PB['fringe'].sum())}", flush=True)

    R_LIN = ["vv", "vh", "vv_spread", "p_cell", "p_3x3", "p_7x7", "new_ha_360m", "new_ha_1km"]
    R_ALL = ["vv", "vh", "vv_spread", "vv_minus_vh", "p_cell", "p_3x3", "p_7x7", "new_ha_360m", "new_ha_1km"]

    def X(P, radar_keys):
        return np.hstack([P["nine"]] + [P["radar"][k][:, None] for k in radar_keys]) if radar_keys else P["nine"]

    class Logit:
        def __init__(self, keys):
            self.keys = keys

        def fit(self, P, sel):
            Xt = X(P, self.keys)[sel]
            self.m, self.s = Xt.mean(0), Xt.std(0) + 1e-9
            self.w = mu.fit_logistic((Xt - self.m) / self.s, P["y"][sel])
            return self

        def predict(self, P):
            return mu.predict(self.w, (X(P, self.keys) - self.m) / self.s)

    class Boost:
        def __init__(self, keys):
            self.keys = keys

        def fit(self, P, sel):
            self.clf = HistGradientBoostingClassifier(**HGB).fit(X(P, self.keys)[sel], P["y"][sel])
            return self

        def predict(self, P):
            return self.clf.predict_proba(X(P, self.keys))[:, 1]

    def m0_score(P):
        return mu.predict(w0, (P["nine"] - m0) / s0)

    specs = {"M1": lambda: Logit([]), "M2": lambda: Logit(R_LIN), "M3": lambda: Boost(R_ALL)}
    trA = train_half[PA["blk"]]
    teB = ~train_half[PB["blk"]]
    allA = np.ones(len(PA["y"]), bool)

    # ---- best-model choice on period A's held-out half (period B not looked at) ----
    fitted_half = {k: f().fit(PA, trA) for k, f in specs.items()}
    selA = {}
    for k, mdl in fitted_half.items():
        s = mdl.predict(PA)
        mm = ~trA & PA["fringe"]
        selA[k] = round(mu.auc(s[mm], PA["y"][mm]), 4)
    best = max(selA, key=selA.get)
    print("choice on period A held-out half, fringe AUC:", selA, "-> best", best, flush=True)

    # ---- primary: train A (train half), test B (other half) ----
    rng = np.random.default_rng(SEED + 1)

    def test_on(P, sel, models):
        sc = {"M0": m0_score(P)[sel], "B0": P["b0"][sel]}
        sc.update({k: mdl.predict(P)[sel] for k, mdl in models.items()})
        subsets = {"all": np.ones(sel.sum(), bool), "fringe": P["fringe"][sel]}
        return paired(sc, P["y"][sel], P["blk"][sel], subsets, rng, srp), sc

    primary, sc_primary = test_on(PB, teB, fitted_half)
    print_table("PRIMARY: fit on period A, train half of blocks; test period B, other half", primary)
    fitted_all = {k: f().fit(PA, allA) for k, f in specs.items()}
    plain, _ = test_on(PB, np.ones(len(PB["y"]), bool), fitted_all)
    print_table("PLAIN: fit on all of period A; test all of period B", plain)

    # ---- criterion ----
    fr, al = primary["fringe"]["models"][best], primary["all"]["models"][best]
    parts = {"fringe_auc_beats_M0": bool(fr["auc_minus_M0_ci95"][0] > 0),
             "fringe_auc_beats_B0": bool(fr["auc_minus_B0_ci95"][0] > 0),
             "all_auc_not_worse_than_B0": bool(al["auc_minus_B0_ci95"][0] > DIFF_ALL_MIN)}
    passed = all(parts.values())
    print(f"\ncriterion on best={best}: {parts} -> passed {passed}", flush=True)

    # ---- importance ----
    m2 = fitted_half["M2"]
    coef_m2 = {n: round(float(c), 3) for n, c in zip(srp.NAMES + R_LIN, m2.w[1:])}
    coef_m1 = {n: round(float(c), 3) for n, c in zip(srp.NAMES, fitted_half["M1"].w[1:])}
    m3 = fitted_half["M3"]
    Xte = X(PB, R_ALL)[teB]
    pi = permutation_importance(m3.clf, Xte, PB["y"][teB], scoring="roc_auc", n_repeats=5, random_state=SEED, n_jobs=1)
    perm_m3 = {n: [round(float(a), 4), round(float(s), 4)] for n, a, s in
               zip(srp.NAMES + R_ALL, pi.importances_mean, pi.importances_std)}
    perm_m3 = dict(sorted(perm_m3.items(), key=lambda kv: -kv[1][0]))
    print("M2 standardised coefficients:", coef_m2, flush=True)
    print("M3 permutation importance on test (drop in AUC, mean, sd):", perm_m3, flush=True)

    # ---- calibration (primary test cells) ----
    yte = PB["y"][teB]
    cal = {k: {"bins": calib(sc_primary[k], yte), "sum_pred": round(float(sc_primary[k].sum()), 1),
               "sum_observed": int(yte.sum())} for k in ("M0", "M1", "M2", "M3")}
    for k in cal:
        print(f"calibration {k}: predicted total {cal[k]['sum_pred']} vs observed {cal[k]['sum_observed']}; top bin "
              f"{cal[k]['bins'][-1]}", flush=True)

    # ---- robustness ----
    rob = {}
    keep = teB & ~((PB["years_out"] >= 2025) & (PB["years_out"] <= 2026))
    PB2 = dict(PB)
    PB2["y"] = ((PB["years_out"] >= 2023) & (PB["years_out"] <= 2024)).astype(float)
    rob["outcome_2023_2024"], _ = test_on(PB2, keep, fitted_half)
    print_table("ROBUSTNESS: outcome 2023-2024 only (2025-2026 cells removed)", rob["outcome_2023_2024"])
    nop = {"M2_no_p_cell": Logit([k for k in R_LIN if k != "p_cell"]).fit(PA, trA),
           "M3_no_p_cell": Boost([k for k in R_ALL if k != "p_cell"]).fit(PA, trA),
           "M2_no_prob": Logit([k for k in R_LIN if not k.startswith("p_")]).fit(PA, trA),
           "M3_no_prob": Boost([k for k in R_ALL if not k.startswith("p_")]).fit(PA, trA)}
    rob["no_radar_probability"], _ = test_on(PB, teB, nop)
    print_table("ROBUSTNESS: radar models without the cell's own probability / without any probability",
                rob["no_radar_probability"])

    # ---- post-hoc diagnostic (added AFTER the first run; changes no criterion, no model, no earlier number) ----
    # Which group of radar predictors carries M2's gain? Each group alone on top of the nine predictors.
    groups = {"M2_only_backscatter": ["vv", "vh", "vv_spread"], "M2_only_probability": ["p_cell", "p_3x3", "p_7x7"],
              "M2_only_momentum": ["new_ha_360m", "new_ha_1km"],
              "M2_no_momentum": [k for k in R_LIN if not k.startswith("new_")],
              # is the momentum gain a property of the radar detector? the same predictor from the optical map instead
              "M1_plus_optical_momentum": ["opt_new_ha_360m", "opt_new_ha_1km"]}
    gm = {k: Logit(v).fit(PA, trA) for k, v in groups.items()}
    gm["M1"] = fitted_half["M1"]
    post_hoc, _ = test_on(PB, teB, gm)
    print_table("POST-HOC (added after the first run): radar predictor groups one at a time, primary split", post_hoc)

    # ================= second round (DESIGN2 / CRITERIA2); separate random stream =================
    rng2 = np.random.default_rng(SEED + 2)

    base_full = {"M0": m0_score(PB), "B0": PB["b0"], "M2": fitted_half["M2"].predict(PB)}
    gap = {}
    for g in ("gap1", "gap2"):
        keys = [k for k in R_LIN if not k.startswith("new_")] + [f"{g}_new_ha_360m", f"{g}_new_ha_1km"]
        mg = Logit(keys).fit(PA, trA)
        gap[g] = {"years": DESIGN2["gap_in_time"][g], "coefficients_standardised":
                  {n: round(float(c), 3) for n, c in zip(srp.NAMES + keys, mg.w[1:])},
                  "result": paired_vs(test_sel=teB, P=PB, scores={**base_full, f"M2_{g}": mg.predict(PB)},
                                      ref="M2", rng=rng2, srp=srp)}
        print_table(f"ROUND 2, gap in time {g} {DESIGN2['gap_in_time'][g]}", gap[g]["result"])
    space = {}
    for nb in ("near3", "near7"):
        sel = teB & ~PB[nb]
        space[nb] = paired_vs(test_sel=sel, P=PB, scores=base_full, ref=None, rng=rng2, srp=srp)
        print_table(f"ROUND 2, gap in space: test cells without radar-dated 2020-2022 building in {nb}", space[nb])

    def share_of_gain(r_, model):
        f_ = r_["fringe"]["models"]
        full_gain = primary["fringe"]["models"]["M2"]["auc"] - primary["fringe"]["models"]["B0"]["auc"]
        return round((f_[model]["auc"] - f_["B0"]["auc"]) / full_gain, 3) if full_gain else None

    g2f = gap["gap2"]["result"]["fringe"]["models"]["M2_gap2"]
    s7f = space["near7"]["fringe"]["models"]["M2"]
    parts2 = {"gap2_fringe_beats_B0": bool(g2f["auc_minus_B0_ci95"][0] > 0),
              "near7_fringe_beats_B0": bool(s7f["auc_minus_B0_ci95"][0] > 0)}
    noise = {"parts": parts2, "passed": all(parts2.values()), "criterion": CRITERIA2["gain_not_mainly_date_noise"],
             "share_of_fringe_gain_over_B0": {"gap1": share_of_gain(gap["gap1"]["result"], "M2_gap1"),
                                              "gap2": share_of_gain(gap["gap2"]["result"], "M2_gap2"),
                                              "near3": share_of_gain(space["near3"], "M2"),
                                              "near7": share_of_gain(space["near7"], "M2")},
             "gap_in_time": gap, "gap_in_space": space}
    print("\nROUND 2 criterion gain_not_mainly_date_noise:", parts2, "->", noise["passed"],
          "gain share:", noise["share_of_fringe_gain_over_B0"], flush=True)
    register = district_test(PB, {"M2": fitted_all["M2"].predict(PB), "M0": m0_score(PB), "B0": PB["b0"]},
                             study, B, cell_ha, tr, h, w)

    res = {"design": DESIGN, "criteria": CRITERIA, "hgb": HGB, "seed": SEED, "n_boot": N_BOOT,
           "inputs": {"predictors": origin, "radar": "data/raw/radar/built_years.npz", "radar_years": ryears},
           "m0_coefficients_standardised": coef0, "m0_matches_land_json": same, "new_cell_level": round(new_level, 3),
           "period_counts": {k: {"open": int(P["mask"].sum()), "positives": int(P["y"].sum()),
                                 "fringe": int(P["fringe"].sum()), "fringe_positives": int(P["y"][P["fringe"]].sum())}
                             for k, P in (("A", PA), ("B", PB))},
           "split": {"blocks": int(nblk), "train_half_blocks": int(train_half.sum()),
                     "test_cells_primary": int(teB.sum())},
           "best_model_choice": {"fringe_auc_on_A_heldout": selA, "best": best},
           "primary": primary, "plain": plain,
           "criterion": {"best": best, "parts": parts, "passed": passed},
           "importance": {"M1_coefficients_standardised": coef_m1, "M2_coefficients_standardised": coef_m2,
                          "M3_permutation_auc_drop_on_test": perm_m3},
           "calibration": cal, "robustness": rob,
           "round2": {"design": DESIGN2, "criteria": CRITERIA2, "date_noise": noise, "register": register},
           "post_hoc_predictor_groups": {"note": "added after the first run to see which radar predictors carry the gain, and whether "
                                                 "the momentum gain also appears with momentum from the optical map "
                                                 "(independent of the radar detector); it changes no criterion and no "
                                                 "earlier number", "result": post_hoc},
           "limits": ["outcomes in 2025-2026 are under-counted by the stricter radar rule (NISAR confirmation)",
                      "the label is the radar layer itself, so 'almost built' and momentum predictors partly measure the "
                      "detector's own behaviour (see robustness)",
                      "four-year periods, not five; M0 predicts a 5-year chance",
                      "the radar layer is conservative: about 0.7 of the optical growth rate",
                      "one construction (an estate) may be dated in different years in adjacent cells because the detector "
                      "is noisy; radar momentum can then partly measure the same construction, not the next one (not "
                      "tested separately; optical momentum, older and detector-free, gives much less: post-hoc)",
                      "no independent truth for 2023-2026; next step: GUNB permit register by cadastral district"]}

    # ---- projection, only if passed ----
    OUT.mkdir(parents=True, exist_ok=True)
    if passed:
        res["projection"] = project(srp, mu, specs[best], PA, PB, built, valid, fy, prob, static, study, cell_ha,
                                    new_level, THR, s1_feats, R_LIN if best != "M3" else R_ALL, best)
        full = {**res["projection"], **{k: v for k, v in res.items() if k != "projection"}}
        (OUT / "meta.json").write_text(json.dumps(full, ensure_ascii=False, indent=1), encoding="utf-8")
    else:
        res["projection"] = "not written: the criterion did not pass"
        for f in ("prob_4y.png", "meta.json"):        # never leave a projection from an earlier passing run
            if (OUT / f).exists():
                (OUT / f).unlink()
    (OUT / "wyniki.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    write_note(res)
    print(f"\nwrote {OUT / 'wyniki.json'} and {NOTE}; {time.time() - t0:.0f} s", flush=True)


def project(srp, mu, make, PA, PB, built, valid, fy, prob, static, study, cell_ha, new_level, THR, s1f, keys, best):
    """Refit the winning model on A and B (all blocks) and project from the 2026 radar state (4-year chance)."""
    from PIL import Image  # noqa: F401
    P = {"start": 2026, "optical_epoch": 2020, "momentum": [2024, 2026]}
    state = built[2020].copy()
    rais = valid & (fy > 2020) & (fy <= 2026)
    state[rais] = np.maximum(state[rais], new_level)
    open_ = valid & (built[2020] < THR) & ~(valid & (fy > 1))
    s1 = s1f(2026, study)
    p = prob[2026]
    mom = ((fy >= 2024) & (fy <= 2026) & valid).astype(float)
    radar = {"vv": s1["vv"], "vh": s1["vh"], "vv_spread": s1["vv_spread"], "vv_minus_vh": s1["vv_minus_vh"],
             "p_cell": p, "p_3x3": ndimage.uniform_filter(p, 3), "p_7x7": ndimage.uniform_filter(p, 7),
             "new_ha_360m": ndimage.uniform_filter(mom, 5) * 25 * cell_ha,
             "new_ha_1km": ndimage.uniform_filter(mom, 15) * 225 * cell_ha}
    PC = {"nine": mu.features(state, static)[open_.ravel()], "radar": {k: v[open_] for k, v in radar.items()}}
    both = {"nine": np.vstack([PA["nine"], PB["nine"]]), "y": np.concatenate([PA["y"], PB["y"]]),
            "radar": {k: np.concatenate([PA["radar"][k], PB["radar"][k]]) for k in PA["radar"]}}
    mdl = make().fit(both, np.ones(len(both["y"]), bool))
    pc = np.zeros(state.shape)
    pc[open_] = mdl.predict(PC)
    v = np.where(open_, np.maximum(1, np.round(255 * np.sqrt(np.clip(pc, 0, 1)))), 0)
    (OUT / "prob_4y.png").write_bytes(srp.png_bytes(v))
    q = {str(k): float(f"{np.percentile(pc[open_], k):.3g}") for k in (50, 75, 90, 95, 99)}
    meta = {"model": best, "start_year": 2026, "horizon_years": 4, "trained_on": ["2018->2019-2022", "2022->2023-2026"],
            "open_cells": int(open_.sum()), "quantiles_open": q,
            "decode": "(v/255)^2 = chance an open cell is first dated built by radar within 4 years from 2026; 0 = no data or built",
            "see": "every test number follows below and is also in wyniki.json"}
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    return meta


def round2_text(res, f, g):
    """Polish text of the second round (date noise and permit register). All numbers come from res."""
    r2 = res["round2"]
    nz, rg = r2["date_noise"], r2["register"]
    tak = lambda b: "**tak**" if b else "**nie**"
    gt, sp = nz["gap_in_time"], nz["gap_in_space"]
    sh = nz["share_of_fringe_gain_over_B0"]
    pct = lambda v: "–" if v is None else f"{100 * v:.0f}%"
    rows = []
    for lab, r_, mk in (("M2 jak w pierwszej rundzie", res["primary"], "M2"),
                        (f"„tempo” kończy się rok przed startem (A {gt['gap1']['years']['A'][0]}–{gt['gap1']['years']['A'][1]}, "
                         f"B {gt['gap1']['years']['B'][0]}–{gt['gap1']['years']['B'][1]})", gt["gap1"]["result"], "M2_gap1"),
                        (f"„tempo” kończy się dwa lata przed startem (A {gt['gap2']['years']['A'][0]}, "
                         f"B {gt['gap2']['years']['B'][0]}–{gt['gap2']['years']['B'][1]})", gt["gap2"]["result"], "M2_gap2"),
                        ("bez komórek z budową 2020–2022 tuż obok (3 × 3)", sp["near3"], "M2"),
                        ("bez komórek z budową 2020–2022 w promieniu ok. 220 m (7 × 7)", sp["near7"], "M2")):
        fr, b0 = r_["fringe"]["models"][mk], r_["fringe"]["models"]["B0"]
        rows.append(f"| {lab} | {r_['fringe']['positives']} | {f(fr, 'auc')} | {f(b0, 'auc')} | {f(fr, 'auc_minus_B0')} |")
    share_txt = (f"rok przerwy {pct(sh['gap1'])}, dwa lata {pct(sh['gap2'])}, bez sąsiadów 3 × 3 {pct(sh['near3'])}, "
                 f"7 × 7 {pct(sh['near7'])}")
    txt = f"""
### Druga runda: szum dat i niezależny rejestr (15.11.2026)

Plan i kryteria tej rundy (`DESIGN2`, `CRITERIA2`) zapisaliśmy w kodzie przed liczeniem. Liczby z pierwszej rundy
się nie zmieniły (porównanie logów).

**1. Czy „tempo budowy obok” wskazuje nowe miejsca, czy resztę tej samej budowy?**
Detektor może dać sąsiednim komórkom jednego osiedla różne lata. Sprawdzamy dwa sposoby:
przerwę w czasie (okno „tempa” kończy się rok albo dwa lata przed startem) i przerwę w przestrzeni
(usuwamy z testu komórki, przy których radar datował budowę w latach 2020–2022).

| Wariant (skraj zabudowy, okres B) | Nowe komórki | AUC modelu | AUC reguły „obok zabudowy” | Różnica |
|---|---|---|---|---|
{chr(10).join(rows)}

Ile zostaje z przewagi M2 nad regułą na skraju: {share_txt}.

Kryterium „zysk to nie głównie szum dat”:
- dwa lata przerwy, model lepszy od reguły: {tak(nz['parts']['gap2_fringe_beats_B0'])}
- bez budowy w promieniu 7 × 7, model lepszy od reguły: {tak(nz['parts']['near7_fringe_beats_B0'])}
- **całe kryterium: {'zaliczone' if nz['passed'] else 'niezaliczone'}.**
"""
    if "skipped" in rg:
        txt += f"\n**2. Rejestr pozwoleń GUNB:** nie policzono ({rg['skipped']}).\n"
        reg_ok = False
    else:
        m, t = rg["main_2023_2026"], rg["timing_control_2016_2018"]
        c = lambda e: f"{e['partial_rho']:.2f} ({e['partial_ci95'][0]:.2f}–{e['partial_ci95'][1]:.2f})".replace(".", ",")
        d = lambda e, k: f"{e[k]:+.2f} ({e[k + '_ci95'][0]:.2f}–{e[k + '_ci95'][1]:.2f})".replace(".", ",")
        reg_ok = rg["passed"]
        txt += f"""
**2. Sprawdzian bez radaru: rejestr pozwoleń GUNB.**
- {rg['districts']} obrębów w {rg['municipalities']} gminach, {rg['parcels_new_23_26']} działek z nową budową
  i ostatnią sprawą w latach 2023–2026.
- Dla każdego obrębu: średnia szansa z modelu na wolnych komórkach w 2022 r. (M2 uczony tylko na okresie A).
- Miara: korelacja rang z liczbą takich działek na km², po odjęciu wpływu zabudowy z 2020 r.
  Przedziały z losowania całych gmin (2000 razy).

| Model | 2023–2026 (test) | 2016–2018 (kontrola czasu) |
|---|---|---|
| M0, model z aplikacji | {c(m['M0'])} | {c(t['M0'])} |
| B0, reguła „obok zabudowy” | {c(m['B0'])} | {c(t['B0'])} |
| M2, uczony na radarze | {c(m['M2'])} | {c(t['M2'])} |
| różnica M2 − M0 | {d(m, 'M2_minus_M0_partial')} | {d(t, 'M2_minus_M0_partial')} |
| różnica M2 − B0 | {d(m, 'M2_minus_B0_partial')} | {d(t, 'M2_minus_B0_partial')} |

Kryterium „niezależnie lepszy” (różnica M2 − M0, dolna granica powyżej 0): **{'zaliczone' if reg_ok else 'niezaliczone'}.**

Co ten test może, a czego nie:
- Pokazuje, czy obręby, które model ocenia wyżej, miały więcej nowych spraw budowlanych, bez radaru w wyniku.
- Działa na obrębach, nie na komórkach ani działkach.
- „Ostatni rok” to ostatnia sprawa dowolnego rodzaju (też rozbudowa, rozbiórka), a nie rok pozwolenia na nowy budynek.
- Pozwolenie to nie budynek: może powstać później albo wcale.
- 18 gmin: przedziały są szerokie. Rejestr obejmuje tylko miasto i powiat poznański.
"""
    if nz["passed"] and reg_ok:
        may = ("Prognoza uczona na radarze lepiej wskazuje, gdzie na skraju zabudowy pojawi się nowa budowa; potwierdza "
               "to też niezależny rejestr pozwoleń, na poziomie obrębów.")
    elif nz["passed"]:
        may = ("Uczona na tym, co radar widział, prognoza lepiej wskazuje nowe miejsca na skraju zabudowy, także z dala "
               "od świeżych budów; niezależny rejestr pozwoleń tego jeszcze nie potwierdza.")
    else:
        may = ("Radar pokazuje, co powstało po 2020 r.; prognoza uczona na radarze głównie powtarza, gdzie budowa już trwa.")
    mustnot = ("Nie mówimy, że prognoza w aplikacji korzysta z radaru ani że radar przewiduje, gdzie powstaną nowe "
               "budynki" + ("." if not (nz["passed"] and reg_ok) else
                            " na konkretnej działce (test jest na obrębach)."))
    txt += f"""
**Zdanie, które wolno powiedzieć na pitchu.** {may}

**Zdanie, którego nie wolno mówić.** {mustnot}
"""
    return txt


def write_note(res):
    """Short Polish section for the method note (plain language). All numbers come from res."""
    pr, pl = res["primary"], res["plain"]
    best = res["criterion"]["best"]
    parts = res["criterion"]["parts"]
    names = {"M0": "model z aplikacji (uczony na mapie optycznej)", "B0": "bez modelu: ile zabudowy w promieniu ok. 1,1 km",
             "M1": "te same 9 cech, uczone na radarze", "M2": "M1 + cechy z radaru (regresja logistyczna)",
             "M3": "cechy M2, gradient boosting"}
    f = lambda e, k: f"{e[k]:.3f} ({e[k + '_ci95'][0]:.3f}–{e[k + '_ci95'][1]:.3f})".replace(".", ",")
    g = lambda e: f"{e['ratio']:.2f} ({e['ratio_ci95'][0]:.2f}–{e['ratio_ci95'][1]:.2f})".replace(".", ",")
    rows = []
    for mn in ("M0", "B0", "M1", "M2", "M3"):
        a, fr = pr["all"]["models"][mn], pr["fringe"]["models"][mn]
        rows.append(f"| {mn} | {names[mn]} | {f(a, 'auc')} | {g(a)} | {f(fr, 'auc')} | {g(fr)} |")
    fb = pr["fringe"]["models"][best]
    ab = pr["all"]["models"][best]
    tak = lambda b: "**tak**" if b else "**nie**"
    rb = res["robustness"]
    r1 = rb["outcome_2023_2024"]["fringe"]["models"][best]
    r1a = rb["outcome_2023_2024"]["all"]["models"][best]
    nop = rb["no_radar_probability"]
    k_nop = f"{best}_no_prob" if best != "M1" else None
    imp = list(res["importance"]["M3_permutation_auc_drop_on_test"].items())[:4]
    imp_txt = ", ".join(f"{n} ({v[0]:.3f})".replace(".", ",") for n, v in imp)
    passed = res["criterion"]["passed"]
    ph = res["post_hoc_predictor_groups"]["result"]["fringe"]["models"]
    num = lambda x: f"{x:.2f}".replace(".", ",")
    if passed:
        pitch = (f"Prognoza uczona na tym, co radar widział, lepiej wskazuje miejsca na skraju zabudowy niż model z "
                 f"aplikacji i prosta reguła „obok zabudowy” (AUC {num(fb['auc'])} wobec "
                 f"{num(pr['fringe']['models']['M0']['auc'])} i {num(pr['fringe']['models']['B0']['auc'])}, na latach i "
                 f"blokach, których model nie widział), a niesie to głównie radarowy zapis tego, gdzie budowano obok "
                 f"w ostatnich trzech latach; sprawdzianem jest sam radar, nie niezależny rejestr.")
    else:
        pitch = ("Radar mówi, co już powstało po 2020 r., i to poprawia stan, od którego liczymy prognozę; "
                 "uczenie samej prognozy na radarze nie dało mierzalnie lepszego wskazania, gdzie powstanie coś nowego.")
    cnt = res["period_counts"]
    txt = f"""### Prognoza uczona na radarze (eksperyment, 15.11.2026)

Skrypt: `pipeline/sarnik_radar_prognoza_ucz.py`. Liczby: `data/raw/radar/radar_prognoza_ucz/wyniki.json` (poza gitem).
Plan i kryterium zapisaliśmy w kodzie (`DESIGN`, `CRITERIA`) przed policzeniem wyników.

**Pytanie.** Czy prognoza „co może powstać obok” będzie lepsza, jeśli uczymy ją na tym, co widział radar,
a nie tylko na mapie optycznej?

**Jak.**
- Dwa okresy po 4 lata. A: stan w 2018 r., nowa zabudowa z radaru w latach 2019–2022.
  B: stan w 2022 r., nowa zabudowa w latach 2023–2026.
- Uczymy na A, sprawdzamy na B. Do tego na innych blokach terenu (bloki ok. 1,2 km, losowa połowa do nauki).
- Wolne komórki: A {cnt['A']['open']}, z nich nowe {cnt['A']['positives']}; B {cnt['B']['open']}, z nich nowe {cnt['B']['positives']}.
- Skraj zabudowy: wolne komórki stykające się z zabudową.
- Przedziały 95% z bootstrapu blokowego (1000 losowań, te same dla wszystkich modeli).
- Najlepszy model wybieramy na okresie A (na blokach odłożonych), bez patrzenia na B. Wybrany: **{best}**.

**Wyniki** (test: okres B, bloki niewidziane w nauce). „Krotność” = udział nowej zabudowy w 5% miejsc najwyżej
w prognozie, podzielony przez udział w pozostałych 95%.

| Model | Co to jest | AUC, wszystkie wolne | Krotność, wszystkie | AUC, skraj | Krotność, skraj |
|---|---|---|---|---|---|
{chr(10).join(rows)}

**Kryterium** („uczenie na radarze pomaga”), dla {best}:
- skraj, AUC lepsze od modelu z aplikacji: różnica {f(fb, 'auc_minus_M0')}: {tak(parts['fringe_auc_beats_M0'])}
- skraj, AUC lepsze od reguły „obok zabudowy”: różnica {f(fb, 'auc_minus_B0')}: {tak(parts['fringe_auc_beats_B0'])}
- wszystkie wolne, AUC nie gorsze od tej reguły (dolna granica powyżej −0,01): różnica {f(ab, 'auc_minus_B0')}: {tak(parts['all_auc_not_worse_than_B0'])}
- **całe kryterium: {'zaliczone' if passed else 'niezaliczone'}.**

Bez podziału na bloki (uczenie na całym A, test na całym B) {best} ma AUC na skraju
{f(pl['fringe']['models'][best], 'auc')}, a reguła „obok zabudowy” {f(pl['fringe']['models']['B0'], 'auc')}.

**Co niesie wynik.** Najważniejsze cechy w modelu {('M3' if best == 'M3' else 'M3 (dla porównania)')} (spadek AUC po przemieszaniu cechy, wszystkie wolne komórki okresu B): {imp_txt}.

**Sprawdzenia.**
- Tylko nowa zabudowa z lat 2023–2024 (lata 2025–2026 radar zaniża): {best} ma AUC {f(r1a, 'auc')} na wszystkich
  wolnych i {f(r1, 'auc')} na skraju.
{f"- Bez prawdopodobieństwa zabudowy z radaru (komórki i sąsiedztwa): AUC na skraju {f(nop['fringe']['models'][k_nop], 'auc')}, różnica do reguły {f(nop['fringe']['models'][k_nop], 'auc_minus_B0')}." if k_nop else "- Model M1 nie używa cech radaru, więc sprawdzenie bez prawdopodobieństwa go nie dotyczy."}
- Kalibracja (10 przedziałów): suma przewidywań {best} {res['calibration'][best]['sum_pred']:.0f} komórek wobec {res['calibration'][best]['sum_observed']} obserwowanych.

**Co dodaliśmy po pierwszym przebiegu** (nie zmienia kryterium ani liczb wyżej; wynik na skraju, AUC):
- tylko 9 cech + „tempo budowy obok” z radaru: {f(ph['M2_only_momentum'], 'auc')};
- tylko 9 cech + jasność radaru (VV, VH, rozrzut): {f(ph['M2_only_backscatter'], 'auc')};
- tylko 9 cech + prawdopodobieństwo zabudowy z radaru: {f(ph['M2_only_probability'], 'auc')};
- M2 bez „tempa budowy obok”: {f(ph['M2_no_momentum'], 'auc')};
- 9 cech + „tempo budowy obok” z mapy optycznej (starsze o 3–8 lat, bez detektora radarowego): {f(ph['M1_plus_optical_momentum'], 'auc')}.

Zysk niesie więc głównie „tempo budowy obok”: ile radar datował jako nową zabudowę w promieniu ok. 360 m
w trzech latach przed startem. Budowa idzie falami: osiedle rośnie etapami.

**Granice.**
- Lata 2025–2026 są zaniżone w warstwie radarowej (ostrzejsza reguła, potwierdzenie NISAR).
- Etykietą jest sama warstwa radarowa. Cechy „prawie zabudowane” i „tempo budowy obok” częściowo mierzą
  zachowanie detektora, a nie budowę.
- Jedna budowa (np. osiedle) może dostać w sąsiednich komórkach różne lata pierwszej zabudowy, bo detektor
  ma szum. Wtedy „tempo budowy obok” częściowo mierzy tę samą budowę, a nie następną. Tego nie sprawdziliśmy
  osobno; „tempo” z mapy optycznej (starsze, bez detektora) daje dużo mniej (wyżej).
- Nie mamy niezależnej prawdy dla lat 2023–2026. Następny krok: rejestr pozwoleń GUNB po obrębach.
- Okresy mają 4 lata, a nie 5 jak prognoza w aplikacji.

**Zdanie po pierwszej rundzie** (nieaktualne: zastępuje je druga runda niżej). {pitch}
{round2_text(res, f, g)}"""
    NOTE.write_text(txt, encoding="utf-8")


if __name__ == "__main__":
    main()
