"""Statistics review: how often the place-card flags fire for a selection of ~1 km and ~500 m around open land
(chk.wetHigh: share of open cells with r > r_crit above 30 %; plain.waterSoaks: NISAR wet-dry >= 2 dB on more than 50 %)."""
import numpy as np
from scipy import ndimage
from common_layers import layers, sar

L = layers()
rc = sar["s1"]["r_crit"]
wr, wd = L["wet_r"], L["nisar_wetdry"]
for size in (7, 14):
    okr = np.isfinite(wr).astype(float)
    sig = ((wr > rc) & np.isfinite(wr)).astype(float)
    n = ndimage.uniform_filter(okr, size); s = ndimage.uniform_filter(sig, size)
    okw = np.isfinite(wd).astype(float); up = ((wd >= 2) & np.isfinite(wd)).astype(float)
    n2 = ndimage.uniform_filter(okw, size); u2 = ndimage.uniform_filter(up, size)
    centre = L["open_land"] & (n > 0.5 / size**2 * size**2 * 0.5)
    sh = np.where(n > 0, s / np.maximum(n, 1e-9), np.nan)[centre]
    sh2 = np.where(n2 > 0, u2 / np.maximum(n2, 1e-9), np.nan)[centre]
    print(f"window {size*73} m around open cells: wetHigh (share > 0.30) fires on {100*np.nanmean(sh > 0.3):.0f}% ; "
          f"NISAR waterSoaks (share > 0.50) fires on {100*np.nanmean(sh2 > 0.5):.0f}%")
