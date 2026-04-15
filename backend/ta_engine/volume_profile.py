"""
Volume Profile — distribution of traded volume across price levels.

Computes:
- Volume at each price bin (horizontal histogram)
- Point of Control (POC): the price level with highest volume
- Value Area High/Low: price range containing ~70% of total volume
"""

from __future__ import annotations

import numpy as np


def compute_volume_profile(
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    volumes: np.ndarray,
    n_bins: int = 80,
) -> dict:
    """
    Build a volume profile from OHLCV data.

    Each bar's volume is distributed proportionally across the price bins
    that its high-low range covers, with extra weight near the close.

    Returns dict ready for JSON:
        bins: [{price, volume, pct}]  — sorted low to high
        poc: float   — Point of Control price
        value_area_high: float
        value_area_low: float
        total_volume: float
    """
    if len(highs) < 10:
        return {"bins": [], "poc": 0, "value_area_high": 0, "value_area_low": 0}

    price_min = float(np.min(lows))
    price_max = float(np.max(highs))

    if price_max <= price_min:
        return {"bins": [], "poc": 0, "value_area_high": 0, "value_area_low": 0}

    # Small padding so extremes don't land exactly on bin edges
    margin = (price_max - price_min) * 0.005
    price_min -= margin
    price_max += margin
    bin_size = (price_max - price_min) / n_bins

    vol_at_price = np.zeros(n_bins, dtype=np.float64)

    for i in range(len(highs)):
        lo = float(lows[i])
        hi = float(highs[i])
        cl = float(closes[i])
        v = float(volumes[i])
        if v <= 0 or hi <= lo:
            continue

        lo_bin = max(0, int((lo - price_min) / bin_size))
        hi_bin = min(n_bins - 1, int((hi - price_min) / bin_size))
        cl_bin = max(0, min(n_bins - 1, int((cl - price_min) / bin_size)))

        n_covered = hi_bin - lo_bin + 1
        if n_covered <= 0:
            continue

        # Distribute: 60% evenly across range, 40% extra at close level
        base_vol = v * 0.6 / n_covered
        for b in range(lo_bin, hi_bin + 1):
            vol_at_price[b] += base_vol
        vol_at_price[cl_bin] += v * 0.4

    total_volume = float(np.sum(vol_at_price))
    if total_volume <= 0:
        return {"bins": [], "poc": 0, "value_area_high": 0, "value_area_low": 0}

    # Point of Control — bin with highest volume
    poc_bin = int(np.argmax(vol_at_price))
    poc_price = price_min + (poc_bin + 0.5) * bin_size

    # Value Area — expand outward from POC until 70% of volume is covered
    va_vol = vol_at_price[poc_bin]
    va_lo_bin = poc_bin
    va_hi_bin = poc_bin
    target = total_volume * 0.70

    while va_vol < target and (va_lo_bin > 0 or va_hi_bin < n_bins - 1):
        lo_next = vol_at_price[va_lo_bin - 1] if va_lo_bin > 0 else 0
        hi_next = vol_at_price[va_hi_bin + 1] if va_hi_bin < n_bins - 1 else 0
        if lo_next >= hi_next and va_lo_bin > 0:
            va_lo_bin -= 1
            va_vol += lo_next
        elif va_hi_bin < n_bins - 1:
            va_hi_bin += 1
            va_vol += hi_next
        else:
            va_lo_bin -= 1
            va_vol += lo_next

    va_low = price_min + va_lo_bin * bin_size
    va_high = price_min + (va_hi_bin + 1) * bin_size

    # Build bins array
    max_vol = float(np.max(vol_at_price))
    bins = []
    for b in range(n_bins):
        v = float(vol_at_price[b])
        if v > 0:
            bins.append({
                "price": round(price_min + (b + 0.5) * bin_size, 2),
                "volume": round(v),
                "pct": round(v / max_vol, 4),  # normalized 0-1 relative to POC
            })

    return {
        "bins": bins,
        "poc": round(poc_price, 2),
        "value_area_high": round(va_high, 2),
        "value_area_low": round(va_low, 2),
        "total_volume": round(total_volume),
    }
