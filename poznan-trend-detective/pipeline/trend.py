"""Trend statistics: Mann-Kendall test and Theil-Sen slope.

Kept dependency-free (numpy only) so every number can be traced line by line.
Both functions accept NaN for missing years; pairs with a NaN are skipped and
the variance uses the number of valid observations. Ties are ignored in the
variance (values are continuous measurements).
"""
import math

import numpy as np


def _pairs(n):
    i, j = np.triu_indices(n, k=1)
    return i, j


def mann_kendall(y, t=None):
    """Mann-Kendall trend test along the last axis.

    y: array (..., n). Returns dict of arrays: S, z, p (two-sided), n_valid.
    """
    y = np.asarray(y, dtype=float)
    n = y.shape[-1]
    i, j = _pairs(n)
    d = y[..., j] - y[..., i]
    s = np.nansum(np.sign(d), axis=-1)
    nv = np.sum(~np.isnan(y), axis=-1).astype(float)
    var = nv * (nv - 1) * (2 * nv + 5) / 18.0
    with np.errstate(invalid="ignore", divide="ignore"):
        z = np.where(s > 0, (s - 1) / np.sqrt(var), np.where(s < 0, (s + 1) / np.sqrt(var), 0.0))
    p = np.vectorize(lambda v: math.erfc(abs(v) / math.sqrt(2)) if np.isfinite(v) else np.nan)(z)
    p = np.where(nv >= 10, p, np.nan)
    return {"S": s, "z": z, "p": p, "n": nv}


def sen_slope(y, t):
    """Theil-Sen slope (median of pairwise slopes) along the last axis, per unit of t."""
    y = np.asarray(y, dtype=float)
    t = np.asarray(t, dtype=float)
    i, j = _pairs(len(t))
    slopes = (y[..., j] - y[..., i]) / (t[j] - t[i])
    with np.errstate(all="ignore"):
        med = np.nanmedian(slopes, axis=-1)
    return med


def sen_intercept(y, t, slope):
    y = np.asarray(y, dtype=float)
    return np.nanmedian(y - slope * np.asarray(t, dtype=float))


def spearman(x, y):
    """Spearman rank correlation with a t-approximation p-value (n >= 8)."""
    x = np.asarray(x, float)
    y = np.asarray(y, float)
    ok = ~(np.isnan(x) | np.isnan(y))
    x, y = x[ok], y[ok]
    n = len(x)
    rx = np.argsort(np.argsort(x)).astype(float)
    ry = np.argsort(np.argsort(y)).astype(float)
    r = np.corrcoef(rx, ry)[0, 1]
    tstat = r * math.sqrt((n - 2) / max(1e-12, 1 - r * r))
    # two-sided p from Student t via regularized incomplete beta
    p = _t_two_sided(tstat, n - 2)
    return float(r), float(p), int(n)


def pearson(x, y):
    x = np.asarray(x, float)
    y = np.asarray(y, float)
    ok = ~(np.isnan(x) | np.isnan(y))
    x, y = x[ok], y[ok]
    n = len(x)
    r = float(np.corrcoef(x, y)[0, 1])
    tstat = r * math.sqrt((n - 2) / max(1e-12, 1 - r * r))
    return r, _t_two_sided(tstat, n - 2), n


def _t_two_sided(tstat, df):
    xval = df / (df + tstat * tstat)
    return float(_betainc(df / 2.0, 0.5, xval))


def _betainc(a, b, x):
    """Regularized incomplete beta I_x(a, b) by continued fraction (Numerical Recipes)."""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    lbeta = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1 - x)
    front = math.exp(lbeta)
    if x < (a + 1) / (a + b + 2):
        return front * _betacf(a, b, x) / a
    return 1.0 - front * _betacf(b, a, 1 - x) / b


def _betacf(a, b, x, itmax=200, eps=3e-14):
    qab, qap, qam = a + b, a + 1, a - 1
    c, d = 1.0, 1 - qab * x / qap
    d = 1 / d if abs(d) > 1e-30 else 1e30
    h = d
    for m in range(1, itmax + 1):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d
        d = 1 / d if abs(d) > 1e-30 else 1e30
        c = 1 + aa / c if abs(c) > 1e-30 else 1e30
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d
        d = 1 / d if abs(d) > 1e-30 else 1e30
        c = 1 + aa / c if abs(c) > 1e-30 else 1e30
        de = d * c
        h *= de
        if abs(de - 1) < eps:
            break
    return h


if __name__ == "__main__":
    # Self-check against known behaviour.
    t = np.arange(26)
    rng = np.random.default_rng(1)
    y = 0.05 * t + rng.normal(0, 0.3, 26)
    print("sen", round(float(sen_slope(y, t)), 4), "MK", {k: float(v) for k, v in mann_kendall(y).items()})
    print("noise p", float(mann_kendall(rng.normal(0, 1, 26))["p"]))
    print("spearman", spearman(t, t + rng.normal(0, 5, 26)))
