"""Independent recomputation of the validation numbers in web/data/land/sar.json ('checks').

Written from the 'what' texts in sar.json, the decode rules in sar.json / land.json and the
published layers only (web/data/land/*.png, web/data/*.geojson). It does not import or read
pipeline/build_sar.py. Run:

    python tests/nauka/recompute_checks.py

from poznan-trend-detective/. Prints, for every check, the published number and ours.
"""
import json
import math
import os
from collections import Counter

import numpy as np
from PIL import Image
from matplotlib.path import Path
from scipy import ndimage, stats
from shapely.geometry import box, shape

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LAND = os.path.join(ROOT, "web", "data", "land")
DATA = os.path.join(ROOT, "web", "data")

sar = json.load(open(os.path.join(LAND, "sar.json")))
land = json.load(open(os.path.join(LAND, "land.json")))
W, H = land["width"], land["height"]
a_, _, X0, _, e_, Y0 = land["transform3857"]
CELL = a_
THR = land["threshold"]
R = 6378137.0


def png(name):
    return np.array(Image.open(os.path.join(LAND, name + ".png"))).astype(np.float64)


def nan0(v, f):
    out = f(v)
    out[v == 0] = np.nan
    return out


# ---------------- layers, decoded with the published rules ----------------
study = png("study") > 0
built25 = png("built_2025") / 255
built20 = png("built_2020") / 255
forest = png("forest2000_frac") / 255
prob30 = (png("prob_2030") / 255) ** 2
prob25 = (png("prob_2025") / 255) ** 2
change = nan0(png("sar_change"), lambda v: v / 12.75 - 10)
dratio = nan0(png("sar_dratio"), lambda v: v / 12.75 - 10)
water = nan0(png("sar_water"), lambda v: (v - 1) / 254)
wet_r = nan0(png("sar_wet"), lambda v: (v - 1) / 127 - 1)
egms = nan0(png("sar_egms"), lambda v: v - 100)
vv = nan0(png("sar_vv_med"), lambda v: v / 6 - 30)
vh = nan0(png("sar_vh_med"), lambda v: v / 6 - 30)
nhh = nan0(png("nisar_hh_med"), lambda v: v / 6 - 30)  # decode as app.js dbOf (not listed in sar.json)
nhv = nan0(png("nisar_hv_med"), lambda v: v / 6 - 30)
nwd = nan0(png("nisar_wetdry"), lambda v: v / 12.75 - 10)  # app.js changeOf (not listed in sar.json)
ahh21 = nan0(png("alos_hh_2021"), lambda v: v / 6 - 30)
ahv21 = nan0(png("alos_hv_2021"), lambda v: v / 6 - 30)

# ground area of a cell: Web Mercator scale 1/cos(lat) per row
rows_y = Y0 + e_ * (np.arange(H) + 0.5)
lat_rows = np.degrees(2 * np.arctan(np.exp(rows_y / R)) - np.pi / 2)
ha_row = (CELL * np.cos(np.radians(lat_rows))) ** 2 / 1e4
HA = np.repeat(ha_row[:, None], W, axis=1)


# ---------------- rasterising polygons onto the grid ----------------
def to_px(lon, lat):
    x = R * np.radians(lon)
    y = R * np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))
    return (x - X0) / CELL, (Y0 - y) / CELL  # col, row (float, cell units)


def rings_px(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    out = []
    for poly in polys:
        rr = []
        for ring in poly:
            a = np.asarray(ring, float)
            c, r = to_px(a[:, 0], a[:, 1])
            rr.append(np.c_[c, r])
        out.append(rr)
    return out


def raster_center(geom):
    """cells whose centre lies inside the polygon (holes respected)."""
    m = np.zeros((H, W), bool)
    for rr in rings_px(geom):
        allv = np.vstack(rr)
        c0, r0 = max(int(np.floor(allv[:, 0].min())), 0), max(int(np.floor(allv[:, 1].min())), 0)
        c1, r1 = min(int(np.ceil(allv[:, 0].max())), W - 1), min(int(np.ceil(allv[:, 1].max())), H - 1)
        if c1 < c0 or r1 < r0:
            continue
        cc, rw = np.meshgrid(np.arange(c0, c1 + 1) + 0.5, np.arange(r0, r1 + 1) + 0.5)
        pts = np.c_[cc.ravel(), rw.ravel()]
        inside = Path(rr[0]).contains_points(pts)
        for hole in rr[1:]:
            inside &= ~Path(hole).contains_points(pts)
        m[r0:r1 + 1, c0:c1 + 1] |= inside.reshape(cc.shape)
    return m


def raster_touched(geom):
    """cells the polygon intersects at all."""
    m = np.zeros((H, W), bool)
    for rr in rings_px(geom):
        from shapely.geometry import Polygon
        p = Polygon(rr[0], rr[1:]).buffer(0)
        c0, r0, c1, r1 = p.bounds
        for r in range(max(int(r0), 0), min(int(r1), H - 1) + 1):
            for c in range(max(int(c0), 0), min(int(c1), W - 1) + 1):
                if p.intersects(box(c, r, c + 1, r + 1)):
                    m[r, c] = True
    return m


def binom_greater(k, n, p):
    """one-sided P(X >= k), X ~ Bin(n, p)"""
    return float(stats.binom.sf(k - 1, n, p)) if n else float("nan")


def compare(name, a_mask, b_mask, hit, published=None):
    na, nb = int(a_mask.sum()), int(b_mask.sum())
    ka, kb = int((hit & a_mask).sum()), int((hit & b_mask).sum())
    sa, sb = ka / na if na else float("nan"), kb / nb if nb else float("nan")
    p = binom_greater(ka, na, sb)
    res = dict(cells=na, hits=ka, share_a=round(sa, 4), share_b=round(sb, 4),
               ratio=round(sa / sb, 2) if sb else None, p=round(p, 4), cells_b=nb, hits_b=kb)
    line(name, published, res, ["cells", "hits", "share_a", "share_b", "ratio", "p"])
    return res


ROWS = []


def line(name, pub, ours, keys):
    print(f"\n== {name}")
    for k in keys:
        pv = pub.get(k) if pub else None
        ov = ours.get(k)
        agree = ""
        if isinstance(pv, (int, float)) and isinstance(ov, (int, float)):
            tol = max(abs(pv) * 0.02, 0.0006 if abs(pv) < 1 else 0.011)
            agree = "AGREE" if abs(pv - ov) <= tol else "DIFFER"
        print(f"   {k:22s} published={pv!s:>10}  ours={ov!s:>10}  {agree}")
        ROWS.append((name, k, pv, ov, agree))


C = sar["checks"]
valid_ch = study & ~np.isnan(change)
up = change >= 3.0
walls = up & (dratio >= sar["s1"]["wall_db"])

# ---------------- city, decisions, flood ----------------
areas = json.load(open(os.path.join(DATA, "areas.geojson")))
city_geom = next(f["geometry"] for f in areas["features"] if f["properties"].get("role") == "city")
city = raster_center(city_geom)

dec = json.load(open(os.path.join(DATA, "wuia_decyzje.geojson")))["features"]
any_c = np.zeros((H, W), bool)
any_t = np.zeros((H, W), bool)
new_c = np.zeros((H, W), bool)
new_t = np.zeros((H, W), bool)
new_permit_c = np.zeros((H, W), bool)  # only real building permits / notifications
new_all_dates_c = np.zeros((H, W), bool)
dec_id = np.full((H, W), -1)
PERMIT = ("Decyzja o pozwoleniu na budow", "Zgłoszenie z projektem")
sel_rodzaj = Counter()
n_sel_zero = 0
for i, f in enumerate(dec):
    pr, g = f["properties"], f["geometry"]
    mc = raster_center(g)
    mt = raster_touched(g)
    any_c |= mc
    any_t |= mt
    is_new = pr["kategoria"] == "nowa budowa" and pr["status"] == "decyzja"
    if is_new:
        new_all_dates_c |= mc
    if is_new and "2026-06-01" <= pr["DATA"] <= "2026-08-31":
        new_c |= mc
        new_t |= mt
        dec_id[mc & (dec_id < 0)] = i
        sel_rodzaj[pr["RODZAJ"].split(" /")[0]] += 1
        n_sel_zero += int(not mc.any())
        if pr["RODZAJ"].startswith(PERMIT) and pr["RODZAJ"] != "Zgłoszenie z projektem - sprzeciw":
            new_permit_c |= mc

flood_geom = json.load(open(os.path.join(DATA, "podtopienia.geojson")))["features"][0]["geometry"]
flood = raster_center(flood_geom)

print("grid", W, H, "study cells", int(study.sum()), "city cells", int(city.sum()),
      "flood cells in study", int((flood & study).sum()))
print("ha per cell at grid centre %.3f (nominal 120 m x 120 m would be 1.44)" % ha_row[H // 2])
print("selected decisions (nowa budowa & decyzja & Jun-Aug):", sum(sel_rodzaj.values()), dict(sel_rodzaj))
print("   of these, decisions whose plot covers no cell centre (dropped by the centre rule):", n_sel_zero)

# ---------------- s1 area numbers ----------------
up_ha = float(HA[valid_ch & up].sum())
walls_ha = float(HA[valid_ch & walls].sum())
line("s1 area", sar["s1"], dict(up3db_ha=round(up_ha), walls_ha=round(walls_ha)), ["up3db_ha", "walls_ha"])
print("   (cells: up %d, walls %d; nominal 1.44 ha cells would give %d / %d ha)" % (
    (valid_ch & up).sum(), (valid_ch & walls).sum(), (valid_ch & up).sum() * 1.44, (valid_ch & walls).sum() * 1.44))
print("   cells outside study with change data:", int((~study & ~np.isnan(change)).sum()))

# ---------------- wuia ----------------
A = new_c & city & valid_ch
B = city & valid_ch & ~any_c
r_w = compare("checks.wuia (centre rule)", A, B, up, C["wuia"])
compare("checks.wuia_walls (centre rule)", A, B, walls, C["wuia_walls"])
At = new_t & city & valid_ch
Bt = city & valid_ch & ~any_t
compare("variant: wuia, all-touched rule", At, Bt, up, C["wuia"])
compare("variant: wuia, only building permits + notifications (no WZ / lokalizacja)",
        new_permit_c & city & valid_ch, B, up, None)
compare("variant: wuia, decisions of all dates Jun-Nov", new_all_dates_c & city & valid_ch, B, up, None)
compare("variant: wuia, reference = rest of city incl. other cases", A, city & valid_ch & ~new_c, up, None)

# clustering of the hits inside A
lab, nlab = ndimage.label(A & up, structure=np.ones((3, 3)))
ids = set(int(dec_id[r, c]) for r, c in zip(*np.nonzero(A & up)))
print("   hits in A form %d connected clusters, from %d distinct decisions" % (nlab, len(ids)))
for j in sorted(ids):
    pr = dec[j]["properties"]
    print("     -", pr["DATA"], pr["RODZAJ"][:40], "|", pr["OPIS"][:70])
# cluster-level bootstrap-free check: dilate hits to 'sites'
labA, nA_ = ndimage.label(A, structure=np.ones((3, 3)))
site_hit = len(set(labA[A & up]))
print("   decision sites (connected groups of A cells): %d, of which with a hit: %d" % (nA_, site_hit))

# spatial placebo: move the whole decision pattern by a random offset (keeps plot sizes and their
# clustering), keep only shifted cells that are in the city, valid and outside every real case.
rng = np.random.default_rng(0)
obs = (A & up).sum() / A.sum()
null = []
for _ in range(3000):
    dy, dx = rng.integers(-60, 61, 2)
    if abs(dy) < 5 and abs(dx) < 5:
        continue
    s_ = np.roll(np.roll(new_c, dy, 0), dx, 1) & B
    if s_.sum() > 200:
        null.append((s_ & up).sum() / s_.sum())
null = np.array(null)
print("   spatial placebo (%d random shifts of the decision mask, +-60 cells): share >= 3 dB median %.4f, "
      "95th pct %.4f, 99th pct %.4f; P(null >= observed %.4f) = %.4f" % (
          len(null), np.median(null), np.percentile(null, 95), np.percentile(null, 99), obs, (null >= obs).mean()))
# site-level count: chance that a site of the same size in the rest of the city has >= 1 hit
sizes = np.bincount(labA[A])[1:]
p_site = 1 - (1 - (B & up).sum() / B.sum()) ** sizes
print("   site-level: expected sites with a hit if cells were independent = %.2f of %d; observed %d; "
      "Poisson P(X>=%d) = %.3f" % (p_site.sum(), len(sizes), site_hit, site_hit, stats.poisson.sf(site_hit - 1, p_site.sum())))
print("   area of the 12 hit cells: %.1f ha" % HA[A & up].sum())

# ---------------- model ----------------
cand = study & (built25 < THR) & ~np.isnan(change)
for nm, pr_ in (("prob_2030", prob30), ("prob_2025", prob25)):
    q = np.percentile(pr_[cand], 95)
    top = cand & (pr_ >= q)
    rest = cand & ~top
    pub = C["model"] if nm == "prob_2030" else None
    compare(f"checks.model ({nm}, top = >= 95th percentile)", top, rest, up, pub)
    compare(f"checks.model_walls ({nm})", top, rest, walls, C["model_walls"] if nm == "prob_2030" else None)
    print("   candidates %d, threshold prob %.4f, top share %.4f (ties at the cutoff: %d cells)" % (
        cand.sum(), q, top.sum() / cand.sum(), (cand & (pr_ == q)).sum()))
    # how many of the 'hits' were already partly built in 2025
    print("   built_2025 share of hit cells in top: mean %.3f; hits with built_2025>0.05: %d" % (
        built25[top & up].mean(), (top & up & (built25 > 0.05)).sum()))
    print("   built_2020 share in top cells: median %.3f; in rest: median %.3f" % (
        np.median(built20[top]), np.median(built20[rest])))
q30 = np.percentile(prob30[cand], 95)
top30 = cand & (prob30 >= q30)
# naive baseline without the model: rank open cells by how much of the cell / its neighbourhood was
# already built in 2020 (GHSL observation), top 5% vs rest
for bname, score in (("built_2020 share of the cell", built20),
                     ("built_2020 share within 3x3", ndimage.uniform_filter(built20, 3))):
    q = np.percentile(score[cand], 95)
    topb = cand & (score >= q)
    compare(f"baseline: {bname}", topb, cand & ~topb, up, None)
    compare(f"baseline walls: {bname}", topb, cand & ~topb, walls, None)
    print("   overlap with the model's top 5%%: %.3f of baseline cells; hit cells shared: %d of %d" % (
        (topb & top30).sum() / topb.sum(), (topb & top30 & up).sum(), (topb & up).sum()))

# ---------------- open land, wet ----------------
open_a = study & (built20 < THR) & (forest < 0.3) & (np.nan_to_num(water) < 0.2)
open_b = study & (built25 < THR) & (forest < 0.3) & (np.nan_to_num(water) < 0.2)
wet_valid = study & ~np.isnan(wet_r)
print("\nopen land (built2020<thr, forest<0.3, water<0.2): %d cells; with built2025: %d; sar_wet valid in study: %d; overlap %d"
      % (open_a.sum(), open_b.sum(), wet_valid.sum(), (open_a & wet_valid).sum()))
rc = sar["checks"]["wet"]["r_crit"]
n_w = sar["s1"]["wet_passes"]
for p_ in (0.95, 0.975):
    t = stats.t.ppf(p_, n_w - 2)
    print("   r_crit from t.ppf(%.3f, %d) = %.3f" % (p_, n_w - 2, t / math.sqrt(n_w - 2 + t * t)))
O = open_a & wet_valid
sig = wet_r > rc
ours = dict(open_share_of_study=round(O.sum() / study.sum(), 2),
            median_r_open=round(float(np.median(wet_r[O])), 2),
            share_sig_study=round(sig[O].mean(), 4),
            share_sig_flood=round(sig[O & flood].mean(), 4),
            share_sig_outside=round(sig[O & ~flood].mean(), 4))
ours["p_flood_higher"] = round(binom_greater(int(sig[O & flood].sum()), int((O & flood).sum()), ours["share_sig_outside"]), 4)
line("checks.wet", C["wet"], ours, list(ours))
print("   open cells in flood %d, outside %d" % ((O & flood).sum(), (O & ~flood).sum()))
print("   share with r < -r_crit (significant DRYING with wetness): %.4f" % (wet_r[O] < -rc).mean())

# seasonal confound: is GWETTOP just a clock?
sw = np.array([np.nan if v is None else v for v in sar["s1"]["soil_wetness"]], float)
k = np.arange(len(sw))
ok = ~np.isnan(sw)
rho_t, p_t = stats.spearmanr(k[ok], sw[ok])
print("   Spearman(soil wetness, pass order) = %.3f (p=%.4f), n=%d" % (rho_t, p_t, ok.sum()))
# per-block test with the published VV series (block 4): r(VV, wetness) vs r(VV, time) and partial
ser = np.array(Image.open(os.path.join(LAND, "sar_series.png"))).astype(float)
bw, bh, nser = sar["s1"]["series"]["bw"], sar["s1"]["series"]["bh"], sar["s1"]["series"]["n"]
VV = np.stack([ser[i * bh:(i + 1) * bh, :bw] for i in range(nser)])  # (n, bh, bw)
VVd = np.where(VV > 0, VV / 6 - 30, np.nan)


def blk(m):
    """block-4 mean of a boolean grid, padded with False to the series size"""
    z = np.zeros((bh * 4, bw * 4))
    z[:H, :W] = m
    return z.reshape(bh, 4, bw, 4).mean(axis=(1, 3))


openblk = blk(open_a) > 0.75
studyblk = blk(study) > 0.99
sel = openblk & studyblk & np.all(~np.isnan(VVd[ok]), axis=0)
Y = VVd[ok][:, sel]  # (nw, m)
rk = lambda a: stats.rankdata(a, axis=0)
Ry = rk(Y)
rw_ = stats.rankdata(sw[ok])
rt_ = stats.rankdata(k[ok])


def corr(a, b):
    a = a - a.mean(0)
    b = b - b.mean(0)
    return (a * b).sum(0) / np.sqrt((a * a).sum(0) * (b * b).sum(0))


r_wet = corr(Ry, rw_[:, None])
r_time = corr(Ry, rt_[:, None])
# partial Spearman r(VV, wet | time)
r_wt = corr(rw_[:, None], rt_[:, None])[0]
r_part = (r_wet - r_time * r_wt) / np.sqrt((1 - r_time ** 2) * (1 - r_wt ** 2))
t1 = stats.t.ppf(0.975, ok.sum() - 3)
rc_part = t1 / math.sqrt(ok.sum() - 3 + t1 * t1)
print("   block-4 open blocks: %d; share r(VV,wet)>%.3f: %.3f; share |r(VV,time)|>%.3f: %.3f; "
      "share partial r(VV,wet|time)>%.3f: %.3f" % (sel.sum(), rc, (r_wet > rc).mean(), rc, (np.abs(r_time) > rc).mean(),
                                                   rc_part, (r_part > rc_part).mean()))
# placebo: circularly shifted wetness series (keeps its autocorrelation, breaks the pass-day link)
sh = []
for s_ in range(1, ok.sum()):
    rr = corr(Ry, np.roll(rw_, s_)[:, None])
    sh.append((rr > rc).mean())
print("   placebo (wetness series rolled by 1..%d passes): share significant median %.3f, max %.3f" % (
    ok.sum() - 1, np.median(sh), np.max(sh)))

# ---------------- NISAR wet minus dry ----------------
On = open_a & ~np.isnan(nwd)
hit = nwd >= 2.0
ours = dict(share_study=round(hit[On].mean(), 4), share_flood=round(hit[On & flood].mean(), 4),
            share_outside=round(hit[On & ~flood].mean(), 4), median_db_open=round(float(np.median(nwd[On])), 2))
ours["ratio"] = round(ours["share_flood"] / ours["share_outside"], 2)
ours["p"] = round(binom_greater(int(hit[On & flood].sum()), int((On & flood).sum()), ours["share_outside"]), 4)
line("nisar.checks.wetdry", sar["nisar"]["checks"]["wetdry"], ours, list(ours))
print("   nisar_wetdry valid cells in study %d, of which on our open land %d; valid outside our open land %d" % (
    (study & ~np.isnan(nwd)).sum(), On.sum(), (study & ~np.isnan(nwd) & ~open_a).sum()))
print("   share <= -2 dB (darker after rain): %.4f" % (nwd[On] <= -2).mean())

# ---------------- bands and sanity ----------------
built_cls = study & (built20 >= THR)
for fthr in (0.3, 0.5, 200 / 255):
    forest_cls = study & (forest > fthr)
    print("   forest class forest2000_frac > %.3f: %d cells" % (fthr, forest_cls.sum()))
forest_cls = study & (forest > 200 / 255)
open_cls = open_a
for cname, m in (("built", built_cls), ("forest", forest_cls), ("open", open_cls)):
    ours = dict(HH=round(float(np.nanmedian(nhh[m])), 2), HV=round(float(np.nanmedian(nhv[m])), 2),
                VV=round(float(np.nanmedian(vv[m])), 2), VH=round(float(np.nanmedian(vh[m])), 2))
    line(f"nisar.checks.bands.{cname}", sar["nisar"]["checks"]["bands"][cname], ours, ["HH", "HV", "VV", "VH"])
f30 = study & (forest > 0.3)
print("   forest>0.3 instead: HV %.2f VH %.2f" % (np.nanmedian(nhv[f30]), np.nanmedian(vh[f30])))
ours = dict(vv_med_built_db=round(float(np.nanmedian(vv[built_cls])), 2),
            vv_med_open_db=round(float(np.nanmedian(vv[study & (built20 < THR) & (forest < 0.3)])), 2),
            vh_med_forest_db=round(float(np.nanmedian(vh[forest_cls])), 2))
line("checks.sanity", C["sanity"], ours, list(ours))
print("   vv median on open_a (water excluded): %.2f" % np.nanmedian(vv[open_a]))

# ---------------- EGMS ----------------
E = study & ~np.isnan(egms)
ours = dict(cells=int(E.sum()), share_of_study=round(E.sum() / study.sum(), 3), median=float(np.median(egms[E])),
            p5=float(np.percentile(egms[E], 5)), min=float(egms[E].min()), cells_le_minus5=int((egms[E] <= -5).sum()))
line("checks.egms", C["egms"], ours, list(ours))
print("   EGMS cells that are built-up (built_2020>=thr): %.3f; study cells built-up: %.3f" % (
    (built20[E] >= THR).mean(), (built20[study] >= THR).mean()))
print("   EGMS value histogram (mm/yr):", dict(sorted(Counter(egms[E].astype(int)).items())))
lab, nl = ndimage.label(E & (egms <= -5), structure=np.ones((3, 3)))
print("   cells <= -5 mm/yr form %d connected spots" % nl)

# ---------------- season change (no 'what' text) ----------------
# approximate with the block-4 series: median of last 6 minus first 6 passes, open blocks
first, last = np.nanmedian(VVd[:6], axis=0), np.nanmedian(VVd[-6:], axis=0)
sc = last - first
m = openblk & studyblk & ~np.isnan(sc)
print("\n== checks.season_change_open_up3db_share (approximate, block-4 series, power vs dB medians)")
print("   published=%s  ours~%.4f" % (C["season_change_open_up3db_share"], (sc[m] >= 3).mean()))

# ---------------- AOI series and NISAR vs ALOS ----------------
st_blk = blk(study)
aoi = []
for i in range(nser):
    v = VVd[i]
    mm = (st_blk > 0.5) & ~np.isnan(v)
    aoi.append(10 * np.log10(np.mean(10 ** (v[mm] / 10))))
d = np.array(aoi) - np.array(sar["s1"]["aoi_vv_db"])
print("\n   s1 aoi_vv_db from block series minus published: mean %.2f, max |d| %.2f dB" % (d.mean(), np.abs(d).max()))
both = study & ~np.isnan(nhh) & ~np.isnan(ahh21)
print("   NISAR median HH minus ALOS-2 2021 HH over study: %.2f dB (median of per-cell diff %.2f); HV: %.2f dB" % (
    np.median(nhh[both]) - np.median(ahh21[both]), np.median(nhh[both] - ahh21[both]),
    np.nanmedian(nhv[both]) - np.nanmedian(ahv21[both])))
print("   NISAR HH cells clipped at 255 (>=12.5 dB): %d; nisar_hh_med zero cells: %d" % (
    (png("nisar_hh_med") == 255).sum(), (png("nisar_hh_med") == 0).sum()))

print("\nSUMMARY")
for r in ROWS:
    print("  %-48s %-22s %-10s %-10s %s" % r)

# ---------------- where are the 'new walls'? ----------------
print("\n== where the 'new walls' (VV >= +3 dB and VV-VH >= +1.5 dB) lie")
Wm = valid_ch & walls
U = valid_ch & up
b3 = ndimage.maximum_filter(built20, 3)  # most built cell in the 3x3 neighbourhood (2020)
b5 = ndimage.maximum_filter(built20, 5)
fields = (built20 < THR) & (forest < 0.3) & (np.nan_to_num(water) < 0.2)
for nm, m in (("walls", Wm), ("up >= 3 dB", U)):
    print("   %-10s cells %d: on built_2020>=thr %.3f | open land %.3f | forest>=0.3 %.3f | water-like>=0.2 %.3f | "
          "open AND no built cell within 2 cells (240 m) %.3f | with water-like neighbour %.3f | in city %.3f" % (
              nm, m.sum(), (built20[m] >= THR).mean(), fields[m].mean(), (forest[m] >= 0.3).mean(), (np.nan_to_num(water[m]) >= 0.2).mean(),
              (fields & (b5 < 0.02))[m].mean(), (ndimage.maximum_filter(np.nan_to_num(water), 3) >= 0.2)[m].mean(), city[m].mean()))
lw, nlw = ndimage.label(Wm, structure=np.ones((3, 3)))
sz = np.bincount(lw.ravel())[1:]
print("   wall cells form %d patches; patches of 1 cell: %d; median patch %d cells; largest %d" % (nlw, (sz == 1).sum(), np.median(sz), sz.max()))

# ---------------- quantisation of the published layers at the thresholds ----------------
raw_ch, raw_dr, raw_nw, raw_we = png("sar_change"), png("sar_dratio"), png("nisar_wetdry"), png("sar_wet")
print("\n== PNG quantisation at the thresholds")
print("   sar_change v=166 (3 dB bin, holds 2.980..3.059 dB) cells in study: %d; up cells if v>=167: %d (x0.5358 = %d ha)" % (
    (study & (raw_ch == 166)).sum(), (study & (raw_ch >= 167) & ~np.isnan(dratio)).sum(), (study & (raw_ch >= 167)).sum() * 0.5358))
print("   nisar_wetdry v=153 (2 dB bin, 1.961..2.039 dB) cells: %d of %d" % ((raw_nw == 153).sum(), (raw_nw > 0).sum()))
On_ = open_a & (raw_nw > 0)
for thr_v in (153, 154):
    h = raw_nw >= thr_v
    print("   v>=%d: share_study %.4f share_flood %.4f share_outside %.4f" % (thr_v, h[On_].mean(), h[On_ & flood].mean(), h[On_ & ~flood].mean()))

# ---------------- NISAR wet minus dry: moisture or harvest? ----------------
# soil wetness on the track-158 pass days, from progres/p1/dane/nisar_poznan_przeloty.csv (GWETTOP column)
import csv
csv_path = os.path.join(ROOT, "..", "progres", "p1", "dane", "nisar_poznan_przeloty.csv")
gw = {}
for row in csv.DictReader(open(csv_path, encoding="utf-8")):
    if row["produkt"] == "GCOV" and row["orbita"] == "158" and row["wersja"] == "provisional":
        gw[row["data"]] = (float(row["wilgotnosc_gleby_m3m3"]), float(row["deszcz_3dni_mm"]))
nd = sar["nisar"]["dates"]
ns = np.array(Image.open(os.path.join(LAND, "nisar_series.png"))).astype(float)
nbw, nbh = sar["nisar"]["series"]["bw"], sar["nisar"]["series"]["bh"]
HHs = np.stack([ns[i * nbh:(i + 1) * nbh, :nbw] for i in range(len(nd))])
HHs = np.where(HHs > 0, HHs / 6 - 30, np.nan)
ob = (blk(open_a) > 0.75) & (blk(study) > 0.99) & np.all(~np.isnan(HHs), axis=0)
print("\n== NISAR HH on open blocks (block-4 sheet), track 158")
print("   pass        GWETTOP rain3  median HH-HH(25 Jun)  share >= 2 dB")
for i, d in enumerate(nd):
    diff = HHs[i][ob] - HHs[nd.index("2026-06-25")][ob]
    print("   %s  %.3f  %5.1f   %+6.2f              %.3f" % (d, gw[d][0], gw[d][1], np.median(diff), (diff >= 2).mean()))
d_aug = HHs[nd.index("2026-08-24")][ob] - HHs[nd.index("2026-08-12")][ob]
print("   24 Aug minus 12 Aug (both after the cereal harvest; wetness 0.14 -> 0.30): median %+.2f dB, share >= 2 dB %.3f"
      % (np.median(d_aug), (d_aug >= 2).mean()))
d_jul = HHs[nd.index("2026-08-24")][ob] - HHs[nd.index("2026-07-19")][ob]
print("   24 Aug minus 19 Jul (same wetness 0.29 vs 0.30): median %+.2f dB, share >= 2 dB %.3f" % (np.median(d_jul), (d_jul >= 2).mean()))
w9 = np.array([gw[d][0] for d in nd])
rr = corr(stats.rankdata(HHs[:, ob], axis=0), stats.rankdata(w9)[:, None])
t9 = stats.t.ppf(0.975, len(nd) - 2)
rc9 = t9 / math.sqrt(len(nd) - 2 + t9 * t9)
print("   per-block Spearman HH vs GWETTOP over the 9 passes: median r %.2f; share r > %.3f (two-sided 5%%): %.3f" % (
    np.nanmedian(rr), rc9, (rr > rc9).mean()))

# ---------------- symmetry test: farming noise brightens and darkens, new walls only brighten ----------------
far_fields = study & fields & (b5 < 0.02) & ~np.isnan(change) & ~np.isnan(dratio)
near_built = study & ~far_fields & ~np.isnan(change) & ~np.isnan(dratio)
dn = change <= -3.0
mirror_walls = dn & (dratio <= -sar["s1"]["wall_db"])  # the same rule with the sign flipped
print("\n== year-on-year change in open fields with no built cell within 240 m (%d cells) vs elsewhere in study" % far_fields.sum())
for nm, m in (("far fields", far_fields), ("rest of study", near_built)):
    print("   %-13s up>=3 dB %d (%.4f) | down<=-3 dB %d (%.4f) | walls %d | mirror-walls (<=-3 dB and VV-VH<=-1.5) %d" % (
        nm, (m & up).sum(), (m & up).mean() if False else (up[m]).mean(), (m & dn).sum(), dn[m].mean(), (m & walls).sum(), (m & mirror_walls).sum()))
dn_study = valid_ch & dn
print("   median year-on-year VV change: far fields %+.2f dB, built_2020>=thr %+.2f dB, forest>=0.5 %+.2f dB, all study %+.2f dB" % (
    np.median(change[far_fields]), np.nanmedian(change[study & (built20 >= THR)]), np.nanmedian(change[study & (forest >= 0.5)]),
    np.nanmedian(change[valid_ch])))
print("   darker by >= 3 dB in study: %d cells = %.0f ha; of them on open land %.3f, on built_2020>=thr %.3f, forest>=0.3 %.3f" % (
    dn_study.sum(), HA[dn_study].sum(), fields[dn_study].mean(), (built20[dn_study] >= THR).mean(), (forest[dn_study] >= 0.3).mean()))
