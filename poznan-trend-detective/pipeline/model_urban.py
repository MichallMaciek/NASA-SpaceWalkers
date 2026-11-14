"""Built-up history, forest loss, terrain and radar layers + a projection of urban growth.

Model (a simple, transparent land-change model, in the spirit of logistic CA models):
  * Unit: 120 m cell (EPSG:3857). A cell is "built" when GHSL built-up surface covers >= 15 % of it.
  * Event: a non-built cell becomes built within 5 years.
  * Predictors at the start of each period: built share in the cell and within ~360 m / ~1.1 km / ~2.5 km,
    distance to the nearest motorway/trunk/primary road, distance to Poznań's Old Market,
    terrain height and slope (Copernicus DEM, from TanDEM-X radar), tree cover in 2000.
  * Fitted by logistic regression on 2005->2010 and 2010->2015, tested on 2015->2020 (never seen in training).
  * Projection: how many cells turn built per 5 years = average of 2010-2020; those cells are taken
    in order of predicted probability, then the model is re-run on the new state (2025, 2030, 2035).

Outputs in web/data/land/: PNG layers (values encoded in the grey level, decoded in the browser) and land.json.
"""
import json
import math

import numpy as np
import rasterio.features
from affine import Affine
from PIL import Image
from rasterio.warp import transform_bounds, transform_geom
from scipy import ndimage

from common import PROCESSED, RAW, WEB_DATA
from trend import mann_kendall, sen_slope

OUT = WEB_DATA / "land"
OUT.mkdir(parents=True, exist_ok=True)
THR = 0.15
CENTRE = (16.9335, 52.4083)


def load():
    d = np.load(RAW / "urban_grid.npz")
    tr = Affine(*d["transform"][:6])
    return d, tr, int(d["width"]), int(d["height"])


def rasterize_areas(areas, tr, w, h):
    masks = {}
    for f in areas["features"]:
        g = transform_geom("EPSG:4326", "EPSG:3857", f["geometry"])
        masks[f["properties"]["name"]] = rasterio.features.rasterize([(g, 1)], out_shape=(h, w), transform=tr).astype(bool)
    return masks


def road_distance(tr, w, h):
    ways = json.load(open(RAW / "roads.json"))
    shapes = [(transform_geom("EPSG:4326", "EPSG:3857", {"type": "LineString", "coordinates": r["c"]}), 1)
              for r in ways if len(r["c"]) > 1]
    lines = rasterio.features.rasterize(shapes, out_shape=(h, w), transform=tr, all_touched=True)
    px = abs(tr.a) * math.cos(math.radians(52.4)) / 1000.0  # km per cell on the ground
    return ndimage.distance_transform_edt(lines == 0) * px, lines.astype(bool)


def features(b, extra):
    f = [b,
         ndimage.uniform_filter(b, 5), ndimage.uniform_filter(b, 15), ndimage.uniform_filter(b, 35)]
    f += extra
    return np.stack([x.ravel() for x in f], axis=1)


def fit_logistic(X, y, iters=60, l2=1e-3):
    """Newton-Raphson (IRLS) logistic regression with a small ridge penalty."""
    X1 = np.hstack([np.ones((X.shape[0], 1)), X])
    w = np.zeros(X1.shape[1])
    for _ in range(iters):
        z = np.clip(X1 @ w, -30, 30)
        p = 1 / (1 + np.exp(-z))
        g = X1.T @ (p - y) + l2 * w
        Hm = (X1 * (p * (1 - p))[:, None]).T @ X1 + l2 * np.eye(len(w))
        step = np.linalg.solve(Hm, g)
        w -= step
        if np.abs(step).max() < 1e-6:
            break
    return w


def predict(w, X):
    z = np.clip(np.hstack([np.ones((X.shape[0], 1)), X]) @ w, -30, 30)
    return 1 / (1 + np.exp(-z))


def auc(score, y):
    order = np.argsort(score)
    ranks = np.empty(len(score))
    ranks[order] = np.arange(1, len(score) + 1)
    pos = y == 1
    n1, n0 = pos.sum(), (~pos).sum()
    return float((ranks[pos].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def save_png(name, arr):
    Image.fromarray(np.clip(np.nan_to_num(arr, nan=0), 0, 255).astype(np.uint8), mode="L").save(OUT / f"{name}.png", optimize=True)


def main():
    d, tr, w, h = load()
    epochs = list(d["epochs"])
    built = d["built"]  # (epochs, h, w) fraction 0..1
    areas = json.load(open(PROCESSED / "areas.geojson", encoding="utf-8"))
    masks = rasterize_areas(areas, tr, w, h)
    study = np.zeros((h, w), bool)
    for m in masks.values():
        study |= m

    # static predictors
    rows, cols = np.mgrid[0:h, 0:w]
    xs, ys = tr * (cols + 0.5, rows + 0.5)
    cx, cy = rasterio.warp.transform("EPSG:4326", "EPSG:3857", [CENTRE[0]], [CENTRE[1]])
    kmpp = math.cos(math.radians(52.4)) / 1000.0
    dist_c = np.hypot(xs - cx[0], ys - cy[0]) * kmpp
    dist_r, road_px = road_distance(tr, w, h)
    dem = d["dem"].astype(float)
    dem = np.where(np.isnan(dem), np.nanmean(dem), dem)
    gy, gx = np.gradient(dem, abs(tr.a) * math.cos(math.radians(52.4)))
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    tc = d["treecover2000"].astype(float) / 100.0
    static = [np.log1p(dist_r), np.log1p(dist_c), (dem - dem.mean()) / dem.std(), slope, tc]
    names = ["built in cell", "built within ~360 m", "built within ~1.1 km", "built within ~2.5 km",
             "log distance to main road", "log distance to Old Market", "terrain height", "slope", "tree cover 2000"]

    ei = {e: i for i, e in enumerate(epochs)}
    B = (built >= THR)

    def period(t0, t1):
        cand = study & ~B[ei[t0]]
        X = features(built[ei[t0]], static)[cand.ravel()]
        y = B[ei[t1]][cand].astype(float)
        return X, y, cand

    Xa, ya, _ = period(2005, 2010)
    Xb, yb, _ = period(2010, 2015)
    Xtr, ytr = np.vstack([Xa, Xb]), np.concatenate([ya, yb])
    mu, sd = Xtr.mean(0), Xtr.std(0) + 1e-9
    wts = fit_logistic((Xtr - mu) / sd, ytr)
    Xv, yv, candv = period(2015, 2020)
    pv = predict(wts, (Xv - mu) / sd)
    val_auc = auc(pv, yv)
    # quantity check: if we had picked the top-N cells, how many were right?
    n_true = int(yv.sum())
    top = np.argsort(-pv)[:n_true]
    hit_rate = float(yv[top].mean())
    # The overall AUC is inflated by cells that are already almost built. A harder, more honest test:
    # only land that was essentially open in 2015 (built-up share below 5 %).
    open_mask = Xv[:, 0] < 0.05
    auc_open = auc(pv[open_mask], yv[open_mask]) if yv[open_mask].sum() > 0 else float("nan")
    n_open = int(yv[open_mask].sum())
    top_o = np.argsort(-pv[open_mask])[:n_open]
    hit_open = float(yv[open_mask][top_o].mean()) if n_open else float("nan")
    # naive baseline for comparison: rank open cells only by built share within ~1.1 km
    auc_base = auc(Xv[open_mask, 2], yv[open_mask]) if n_open else float("nan")
    print("AUC 2015->2020:", round(val_auc, 3), "conversions", n_true, "top-N hit rate", round(hit_rate, 3),
          "| open land: AUC", round(auc_open, 3), "hit", round(hit_open, 3), "n", n_open, "baseline AUC", round(auc_base, 3))

    # demand: cells turning built per 5 years, average of 2010->2015 and 2015->2020
    per5 = [int((study & ~B[ei[a]] & B[ei[b]]).sum()) for a, b in ((2010, 2015), (2015, 2020))]
    demand = int(round(np.mean(per5)))
    new_level = float(np.median(built[ei[2020]][study & ~B[ei[2015]] & B[ei[2020]]]))
    print("demand per 5y", per5, demand, "new cell built level", round(new_level, 3))

    # refit on all observed periods for the projection
    Xc, yc, _ = period(2015, 2020)
    Xall, yall = np.vstack([Xtr, Xc]), np.concatenate([ytr, yc])
    mu2, sd2 = Xall.mean(0), Xall.std(0) + 1e-9
    wts2 = fit_logistic((Xall - mu2) / sd2, yall)
    coef = {n: round(float(c), 3) for n, c in zip(names, wts2[1:])}

    state = built[ei[2020]].copy()
    proj, prob = {}, {}
    for year in (2025, 2030, 2035):
        cand = study & (state < THR)
        p = np.zeros((h, w))
        p[cand] = predict(wts2, (features(state, static)[cand.ravel()] - mu2) / sd2)
        prob[year] = p.copy()
        idx = np.argsort(-p.ravel())[:demand]
        nxt = state.copy().ravel()
        nxt[idx] = np.maximum(nxt[idx], new_level)
        state = nxt.reshape(h, w)
        proj[year] = state.copy()

    # ---------- per-municipality numbers ----------
    cell_ha = (abs(tr.a) * math.cos(math.radians(52.4))) ** 2 / 1e4
    loss = d["loss_year"].astype(int)  # latest loss year in the cell: used only to colour the map
    # true fractions (fetch_forest.py): share of 30 m pixels that were forest in 2000 / lost in each year
    ff = np.load(RAW / "forest_frac.npz")
    forest_frac, loss_frac = ff["forest_2000_frac"], ff["loss_frac"]  # (h,w), (24,h,w)
    muni = {}
    for name, m in masks.items():
        bshare = {int(e): round(float((built[ei[e]][m] >= THR).mean() * 100), 2) for e in epochs}
        bshare.update({y: round(float((proj[y][m] >= THR).mean() * 100), 2) for y in proj})
        loss_by_year = {2000 + k: round(float(loss_frac[k - 1][m].sum() * cell_ha), 1) for k in range(1, 25)}
        muni[name] = {
            "built_share_pct": bshare,
            "built_ha_2020": round(float((built[ei[2020]][m]).sum() * cell_ha), 0),
            "forest_2000_ha": round(float(forest_frac[m].sum() * cell_ha), 0),
            "forest_loss_cells_ha": loss_by_year,
            "forest_loss_total_ha": round(sum(loss_by_year.values()), 0),
            "elev_mean": round(float(dem[m].mean()), 1),
            "elev_min": round(float(dem[m].min()), 1), "elev_max": round(float(dem[m].max()), 1),
            "s1_2017_db": round(float(np.nanmean(d["s1_2017"][m])), 2),
            "s1_2024_db": round(float(np.nanmean(d["s1_2024"][m])), 2),
        }
    # whole study area
    tot = {int(e): round(float((built[ei[e]][study] >= THR).mean() * 100), 2) for e in epochs}
    tot.update({y: round(float((proj[y][study] >= THR).mean() * 100), 2) for y in proj})

    # forest loss trend (ha per year) across the whole area, tested like every other trend
    yrs = np.arange(2001, 2025)
    loss_series = [float(loss_frac[k - 1][study].sum() * cell_ha) for k in range(1, 25)]
    mk = mann_kendall(np.array(loss_series))
    loss_trend = {"years": yrs.tolist(), "ha": [round(v, 1) for v in loss_series],
                  "slope_ha_per_decade": round(float(sen_slope(np.array(loss_series), yrs.astype(float)) * 10), 1),
                  "p": round(float(mk["p"]), 4)}

    # ---------- prices (GUS BDL) ----------
    gp = json.load(open(RAW / "gus_prices.json", encoding="utf-8"))
    prices = {"variables": gp["variables"], "data": gp["data"]}

    # ---------- PNG layers ----------
    for e in epochs:
        save_png(f"built_{e}", built[ei[e]] * 255)
    for y in proj:
        save_png(f"built_{y}", proj[y] * 255)
        save_png(f"prob_{y}", np.sqrt(prob[y]) * 255)  # sqrt keeps small probabilities distinguishable
    save_png("forest_loss", loss)            # 0 = none, 1..24 = 2001..2024 (latest loss year in the cell)
    save_png("treecover2000", tc * 255)
    save_png("forest2000_frac", forest_frac * 255)        # share of the cell that was forest in 2000
    save_png("loss_frac", loss_frac.sum(0) * 255)         # share of the cell lost 2001-2024
    # cumulative share lost by 2005/2010/2015/2020, so the app can say how much was lost up to any year
    # (the latest-loss-year layer alone undercounts cells that lost trees more than once)
    for y in (2005, 2010, 2015, 2020):
        save_png(f"loss_cum_{y}", loss_frac[: y - 2000].sum(0) * 255)
    dem_lo = float(np.floor(dem[study].min()))
    save_png("dem", (dem - dem_lo) * 2)       # 0.5 m steps
    for y in (2017, 2020, 2024):
        save_png(f"s1_{y}", (np.nan_to_num(d[f"s1_{y}"], nan=-30) + 30) * 6)  # dB -> 0..255 (1/6 dB steps)
    save_png("study", study * 255)

    x0, y0, x1, y1 = tr.c, tr.f + tr.e * h, tr.c + tr.a * w, tr.f
    lon0, lat0, lon1, lat1 = transform_bounds("EPSG:3857", "EPSG:4326", x0, y0, x1, y1)
    land = {
        "bounds": [[lat0, lon0], [lat1, lon1]], "width": w, "height": h, "transform3857": [tr.a, tr.b, tr.c, tr.d, tr.e, tr.f], "cell_m_ground": round(abs(tr.a) * math.cos(math.radians(52.4)), 1),
        "epochs": [int(e) for e in epochs], "projected": [2025, 2030, 2035], "threshold": THR,
        "decode": {"built": "v/255 = built-up share of the cell", "forest_loss": "v = latest loss year - 2000 (0 none)",
                   "forest2000_frac": "v/255 = share of the cell that was forest (tree cover >= 30 %) in 2000",
                   "loss_frac": "v/255 = share of the cell where trees were lost 2001-2024",
                   "treecover2000": "v/255 = tree cover", "dem": f"v/2 + {dem_lo} = metres above sea level",
                   "s1": "v/6 - 30 = VV backscatter in dB", "prob": "(v/255)^2 = probability of turning built in 5 years"},
        "dem_offset": dem_lo,
        "model": {"auc_2015_2020": round(val_auc, 3), "top_n_hit_rate": round(hit_rate, 3), "conversions_2015_2020": n_true,
                  "open_land_auc": round(auc_open, 3), "open_land_hit_rate": round(hit_open, 3), "open_land_conversions": n_open,
                  "open_land_baseline_auc": round(auc_base, 3),
                  "demand_cells_per_5y": demand, "demand_ha_per_5y": round(demand * cell_ha, 0), "new_cell_level": round(new_level, 3),
                  "coefficients_standardised": coef, "trained_on": ["2005-2010", "2010-2015"], "tested_on": "2015-2020"},
        "municipalities": muni, "study_built_share_pct": tot, "forest_loss_trend": loss_trend, "prices": prices,
        # dates of NISAR GCOV acquisitions over Poznań (ASF search), shown through NASA GIBS tiles
        "nisar_dates": json.load(open(RAW / "nisar_dates.json")) if (RAW / "nisar_dates.json").exists() else [],
    }
    json.dump(land, open(OUT / "land.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("built share study area", tot)
    print("forest loss trend", loss_trend["slope_ha_per_decade"], loss_trend["p"])
    print("coefs", coef)


if __name__ == "__main__":
    main()
