"""Statistics review: EGMS numbers (checks.egms) and the 'mostly built-up land' and 'spots' wording."""
import numpy as np
from scipy import ndimage
from common_layers import layers, sar, THR, TR

L = layers()
st, eg = L["study"], L["egms"]
m = st & np.isfinite(eg)
v = eg[m]
print("cells", m.sum(), "(json", sar["checks"]["egms"]["cells"], ") share of study", round(m.sum() / st.sum(), 3))
print("values are whole mm/yr:", np.allclose(v, np.round(v)), " distinct:", np.unique(v)[:12], "...", " counts of -1,0,+1:", [(int(x), int((v == x).sum())) for x in (-2, -1, 0, 1, 2)])
print("median", np.median(v), "p5", np.percentile(v, 5), "p95", np.percentile(v, 95), "min", v.min(), "max", v.max(), "cells <= -5:", (v <= -5).sum())
b20 = L["built_2020"] >= THR
print("EGMS cells on land built in 2020:", round((m & b20).sum() / m.sum(), 3), "; share of built-2020 study cells with EGMS:", round((m & b20).sum() / (st & b20).sum(), 3),
      "; share of non-built study cells with EGMS:", round((m & ~b20).sum() / (st & ~b20).sum(), 3))
sink = m & (eg <= -5)
lab, nl = ndimage.label(sink, structure=np.ones((3, 3)))
sizes = np.bincount(lab.ravel())[1:]
print("cells <= -5 mm/yr form", nl, "connected patches; largest sizes", sorted(sizes.tolist(), reverse=True)[:8], "; single-cell patches", int((sizes == 1).sum()))
iy, ix = np.unravel_index(np.argmin(np.where(m, eg, np.inf)), eg.shape)
x, y = TR * (ix + 0.5, iy + 0.5)
import math
lon = math.degrees(x / 6378137.0); lat = math.degrees(2 * math.atan(math.exp(y / 6378137.0)) - math.pi / 2)
nb = eg[max(0, iy - 2):iy + 3, max(0, ix - 2):ix + 3]
print("fastest cell", eg[iy, ix], "at", round(lat, 4), round(lon, 4), "built2020:", bool(b20[iy, ix]), "; 5x5 neighbourhood:\n", nb)
# per-place card thresholds: how often a typical click lands on 'warn' (min <= -5) by chance of a single cell
print("cells with -4..-3:", int(((v <= -3) & (v >= -4)).sum()))
