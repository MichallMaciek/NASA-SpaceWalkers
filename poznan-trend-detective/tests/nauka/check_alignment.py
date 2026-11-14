"""Are the radar layers co-registered on the app grid? Correlation of each layer with Sentinel-1 VV median
for whole-cell shifts of -2..2 (row, column). The best shift should be (0, 0)."""
from pathlib import Path
import numpy as np
from PIL import Image

LAND = Path(__file__).resolve().parents[2] / "web" / "data" / "land"
ld = lambda n: np.array(Image.open(LAND / f"{n}.png")).astype(float)
ref = ld("sar_vv_med")
study = ld("study") > 0
for name in ("nisar_hh_med", "alos_hh_2021", "built_2020", "sar_water"):
    a = ld(name)
    best = []
    for dr in range(-2, 3):
        for dc in range(-2, 3):
            b = np.roll(np.roll(a, dr, 0), dc, 1)
            m = study & (ref > 0) & (b > 0)
            m[:3], m[-3:], m[:, :3], m[:, -3:] = False, False, False, False
            r = np.corrcoef(ref[m], b[m])[0, 1]
            best.append((abs(r), dr, dc, r))
    best.sort(reverse=True)
    print(f"{name:13s} best shift (row, col) = ({best[0][1]}, {best[0][2]}) r={best[0][3]:.3f}; at (0,0) r={[x[3] for x in best if x[1] == 0 and x[2] == 0][0]:.3f}")
