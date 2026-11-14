"""Science review of the radar pipeline outputs (read-only).

Decodes the PNG layers in web/data/land/ with the rules in sar.json / land.json and recomputes the
numbers sar.json reports, plus a few extra checks a radar scientist would ask for.
Usage: python tests/nauka/check_pipeline_layers.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import stats

ROOT = Path(__file__).resolve().parents[2]
LAND = ROOT / "web" / "data" / "land"
S = json.load(open(LAND / "sar.json"))
L = json.load(open(LAND / "land.json"))
W, H = L["width"], L["height"]
CELL_HA = L["cell_m_ground"] ** 2 / 1e4


def png(name):
    return np.array(Image.open(LAND / f"{name}.png")).astype(float)


def db(v):
    return np.where(v > 0, v / 6 - 30, np.nan)


def chg(v):
    return np.where(v > 0, v / 12.75 - 10, np.nan)


print("== 1. shapes and decode ranges")
for n in ["study", "sar_vv_med", "sar_vh_med", "sar_change", "sar_dratio", "sar_water", "sar_wet", "sar_egms",
          "nisar_hh_med", "nisar_hv_med", "nisar_wetdry", "alos_hh_2021", "alos_hv_2021", "sar_series", "nisar_series"]:
    a = png(n)
    print(f"  {n:14s} shape {a.shape}  min {a.min():.0f} max {a.max():.0f}  zero share {(a == 0).mean():.3f}")

study = png("study") > 0
thr = round(L["threshold"] * 255)
built20 = png("built_2020") >= thr
forest = png("forest2000_frac") > 200
water = np.where(png("sar_water") > 0, (png("sar_water") - 1) / 254, np.nan)
open_land = study & ~built20 & (png("forest2000_frac") < 0.3 * 255) & (np.nan_to_num(water) < 0.2)

vv, vh = db(png("sar_vv_med")), db(png("sar_vh_med"))
hh, hv = db(png("nisar_hh_med")), db(png("nisar_hv_med"))
ahh, ahv = db(png("alos_hh_2021")), db(png("alos_hv_2021"))
for nm, m in (("built", built20 & study), ("forest", forest & study), ("open", open_land)):
    print(f"  {nm:6s} VV {np.nanmedian(vv[m]):6.2f} VH {np.nanmedian(vh[m]):6.2f} | NISAR HH {np.nanmedian(hh[m]):6.2f} "
          f"HV {np.nanmedian(hv[m]):6.2f} | ALOS21 HH {np.nanmedian(ahh[m]):6.2f} HV {np.nanmedian(ahv[m]):6.2f}")
print("  sar.json bands", S["nisar"]["checks"]["bands"])

print("== 2. change / walls areas")
change, dratio = chg(png("sar_change")), chg(png("sar_dratio"))
ok = np.isfinite(change) & np.isfinite(dratio)
up = (change >= 3) & ok
walls = up & (dratio >= 1.5)
print(f"  up3db_ha {up[study].sum() * CELL_HA:.0f} (sar.json {S['s1']['up3db_ha']}), walls_ha {walls[study].sum() * CELL_HA:.0f} "
      f"(sar.json {S['s1']['walls_ha']}), cells up {int(up[study].sum())} walls {int(walls[study].sum())}")
for nm, m in (("built2020", built20 & study), ("open", open_land), ("forest", forest & study)):
    print(f"  {nm:9s} share up {up[m].mean():.4f}  walls {walls[m].mean():.4f}  of walls ha {walls[m].sum() * CELL_HA:.0f}")
print(f"  study median change {np.nanmedian(change[study]):.2f} dB, median dratio {np.nanmedian(dratio[study]):.2f} dB")
print(f"  open median change {np.nanmedian(change[open_land]):.2f} dB; built {np.nanmedian(change[built20 & study]):.2f} dB")

print("== 3. NISAR coverage and wet-dry")
nis = png("nisar_hh_med") > 0
print(f"  NISAR HH median covers {nis[study].mean():.3f} of study; S1 VV covers {(png('sar_vv_med') > 0)[study].mean():.3f}")
dw = chg(png("nisar_wetdry"))
okw = np.isfinite(dw)
print(f"  wetdry cells {okw.sum()}, share >=2 dB {(dw[okw] >= 2).mean():.4f} (sar.json {S['nisar']['checks']['wetdry']['share_study']}), "
      f"median {np.nanmedian(dw):.2f} (sar.json {S['nisar']['checks']['wetdry']['median_db_open']})")
print(f"  open_land cells {open_land.sum()}, of which NISAR-covered {(open_land & nis).sum()}")

print("== 4. NISAR per-pass on 480 m blocks: HH and HV change 25 Jun -> 24 Aug by land cover")
ns = S["nisar"]["series"]; bw, bh, nn = ns["bw"], ns["bh"], ns["n"]
sheet = png("nisar_series")
B = ns["block"]


def block_mask(m, need=1.0):
    p = np.pad(m.astype(float), ((0, bh * B - H), (0, bw * B - W)))
    return p.reshape(bh, B, bw, B).mean(axis=(1, 3)) >= need


def pass_layer(sh, k, j, bw_, bh_):
    return db(sh[k * bh_:(k + 1) * bh_, j * bw_:(j + 1) * bw_])


nd = S["nisar"]["dates"]
kd, kw = nd.index("2026-06-25"), nd.index("2026-08-24")
bopen, bbuilt, bforest = block_mask(open_land), block_mask(built20 & study, 0.75), block_mask(forest & study)
for j, pol in enumerate(("HH", "HV")):
    d = pass_layer(sheet, kw, j, bw, bh) - pass_layer(sheet, kd, j, bw, bh)
    print(f"  {pol} wet-dry median: open {np.nanmedian(d[bopen]):5.2f}  built(>=75%) {np.nanmedian(d[bbuilt]):5.2f}  "
          f"forest {np.nanmedian(d[bforest]):5.2f} dB  (blocks {bopen.sum()}/{bbuilt.sum()}/{bforest.sum()})")
for j, pol in enumerate(("HH", "HV")):
    row = []
    for k in range(nn):
        lay = pass_layer(sheet, k, j, bw, bh)
        row.append(f"{nd[k][5:]} {np.nanmedian(lay[bbuilt]):6.2f}/{np.nanmedian(lay[bopen]):6.2f}")
    print(f"  {pol} per pass built/open:", "  ".join(row))

print("== 5. Sentinel-1 per-pass: VV vs soil wetness, with and without the seasonal trend (480 m open blocks)")
ss = S["s1"]["series"]; sbw, sbh, sn = ss["bw"], ss["bh"], ss["n"]
s_sheet = png("sar_series")
dates = S["s1"]["dates"]; wet = S["s1"]["soil_wetness"]
k_ok = [k for k, w in enumerate(wet) if w is not None]
wv = np.array([wet[k] for k in k_ok])
doy = np.array([np.datetime64(dates[k]).astype("datetime64[D]").astype(int) for k in k_ok], float)
VV = np.stack([pass_layer(s_sheet, k, 0, sbw, sbh)[bopen] for k in k_ok])  # (passes, blocks)
fin = np.isfinite(VV).all(0)
VV = VV[:, fin]
print(f"  open blocks used {VV.shape[1]}, passes {VV.shape[0]}")
rw = stats.rankdata(wv)
rV = np.apply_along_axis(stats.rankdata, 0, VV)
rc = lambda a: a - a.mean(0)
r = (rc(rV) * rc(rw)[:, None]).sum(0) / np.sqrt((rc(rV) ** 2).sum(0) * (rc(rw) ** 2).sum())
t = stats.t.ppf(0.975, len(wv) - 2); rcrit = t / np.sqrt(len(wv) - 2 + t ** 2)
print(f"  Spearman VV~wetness: median r {np.median(r):.3f}, share r>{rcrit:.3f}: {(r > rcrit).mean():.3f}")
print(f"  wetness vs time: Spearman {stats.spearmanr(wv, doy)[0]:.3f}; AOI VV vs wetness: "
      f"{stats.spearmanr(np.array(S['s1']['aoi_vv_db'])[k_ok], wv)[0]:.3f}")
# partial out a quadratic trend in time from both series (ranks), then correlate the residuals
X = np.column_stack([np.ones_like(doy), doy - doy.mean(), (doy - doy.mean()) ** 2])
P = X @ np.linalg.pinv(X)
res_w = rw - P @ rw
res_V = rV - P @ rV
rp = (res_V * res_w[:, None]).sum(0) / np.sqrt((res_V ** 2).sum(0) * (res_w ** 2).sum())
t2 = stats.t.ppf(0.975, len(wv) - 4); rcrit2 = t2 / np.sqrt(len(wv) - 4 + t2 ** 2)
print(f"  after removing a quadratic season trend: median r {np.median(rp):.3f}, share r>{rcrit2:.3f}: {(rp > rcrit2).mean():.3f}")
# the same for the pixel-level sar_wet layer
wr = np.where(png("sar_wet") > 0, (png("sar_wet") - 1) / 127 - 1, np.nan)
print(f"  sar_wet layer: open cells {np.isfinite(wr).sum()}, share r>{S['s1']['r_crit']}: {(wr[np.isfinite(wr)] > S['s1']['r_crit']).mean():.4f} "
      f"(sar.json {S['checks']['wet']['share_sig_study']})")

print("== 6. EGMS")
eg = np.where(png("sar_egms") > 0, png("sar_egms") - 100, np.nan)
e = study & np.isfinite(eg)
print(f"  cells {e.sum()} (sar.json {S['checks']['egms']['cells']}), median {np.nanmedian(eg[e])}, min {np.nanmin(eg[e])}, "
      f"<=-5: {(eg[e] <= -5).sum()}, unique values {np.unique(eg[e])[:12]}...")
print(f"  share of EGMS cells built (GHSL 2020 >= 15%): {built20[e].mean():.3f}; built cells with EGMS {e[built20 & study].mean():.3f}; "
      f"open cells with EGMS {e[open_land].mean():.3f}")
print(f"  mean EGMS {np.nanmean(eg[e]):.2f}, share exactly 0: {(eg[e] == 0).mean():.3f}")

print("== 7. old radar layers s1_2017/2020/2024 (fetch_urban.fetch_s1)")
for y in (2017, 2020, 2024):
    a = png(f"s1_{y}")
    v = a[study & (a > 0)] / 6 - 30
    print(f"  s1_{y}: zero share in study {(a[study] == 0).mean():.3f}, median VV {np.median(v):.2f} dB")

print("== 8. NISAR wet-dry: offset seen on built-up/forest, and HV next to HH (480 m open blocks)")
for off in (0.0, 0.5, 0.67):
    print(f"  share of open cells with HH wet-dry >= 2 dB + {off:.2f} dB scene offset: {(dw[okw] >= 2 + off).mean():.4f}")
dHH = pass_layer(sheet, kw, 0, bw, bh) - pass_layer(sheet, kd, 0, bw, bh)
dHV = pass_layer(sheet, kw, 1, bw, bh) - pass_layer(sheet, kd, 1, bw, bh)
o = bopen & np.isfinite(dHH) & np.isfinite(dHV)
hitb = o & (dHH >= 2)
print(f"  open blocks with HH>=2 dB: {hitb.sum()} of {o.sum()} ({hitb.sum() / o.sum():.3f}); among them HV rose >= HH: "
      f"{(dHV[hitb] >= dHH[hitb]).mean():.3f}, HV rose >= 2 dB: {(dHV[hitb] >= 2).mean():.3f}; "
      f"Spearman dHH~dHV on open blocks {stats.spearmanr(dHH[o], dHV[o])[0]:.3f}")
print("  median (HV-HH) ratio change on open blocks: "
      f"{np.nanmedian((dHV - dHH)[o]):.2f} dB; on HH-hit blocks {np.nanmedian((dHV - dHH)[hitb]):.2f} dB")
