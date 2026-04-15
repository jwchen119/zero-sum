"""
Swing-point detection — foundation for all structural pattern recognition.

Identifies local highs (swing highs) and local lows (swing lows) at multiple
time scales, then merges and scores them by significance.
"""

from __future__ import annotations

import numpy as np
from dataclasses import dataclass, field


@dataclass
class SwingPoint:
    index: int
    time: str
    price: float
    kind: str  # "high" or "low"
    strength: int = 1  # how many window sizes confirm this pivot


def detect_swings(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    windows: tuple[int, ...] = (5, 10, 20),
) -> list[SwingPoint]:
    """
    Multi-scale pivot detection.

    For each window size, find local maxima in highs and local minima in lows.
    Points confirmed by more window sizes get a higher strength score.
    """
    n = len(highs)
    hi_counts = np.zeros(n, dtype=int)
    lo_counts = np.zeros(n, dtype=int)

    for w in windows:
        if n < 2 * w + 1:
            continue
        for i in range(w, n - w):
            # swing high: this bar's high >= all neighbours' highs
            is_high = True
            for j in range(i - w, i + w + 1):
                if j == i:
                    continue
                if highs[j] > highs[i]:
                    is_high = False
                    break
            if is_high:
                hi_counts[i] += 1

            # swing low: this bar's low <= all neighbours' lows
            is_low = True
            for j in range(i - w, i + w + 1):
                if j == i:
                    continue
                if lows[j] < lows[i]:
                    is_low = False
                    break
            if is_low:
                lo_counts[i] += 1

    points: list[SwingPoint] = []
    for i in range(n):
        if hi_counts[i] > 0:
            points.append(SwingPoint(
                index=i, time=times[i], price=float(highs[i]),
                kind="high", strength=int(hi_counts[i]),
            ))
        if lo_counts[i] > 0:
            points.append(SwingPoint(
                index=i, time=times[i], price=float(lows[i]),
                kind="low", strength=int(lo_counts[i]),
            ))

    return points


def filter_swings(
    points: list[SwingPoint],
    min_strength: int = 1,
    kind: str | None = None,
) -> list[SwingPoint]:
    """Filter swing points by minimum strength and/or kind."""
    out = points
    if kind:
        out = [p for p in out if p.kind == kind]
    if min_strength > 1:
        out = [p for p in out if p.strength >= min_strength]
    return sorted(out, key=lambda p: p.index)


def swing_highs(points: list[SwingPoint], min_strength: int = 1) -> list[SwingPoint]:
    return filter_swings(points, min_strength=min_strength, kind="high")


def swing_lows(points: list[SwingPoint], min_strength: int = 1) -> list[SwingPoint]:
    return filter_swings(points, min_strength=min_strength, kind="low")
