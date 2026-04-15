"""
Trendline detection — fits support/resistance lines through swing points,
including parallel channel detection.

Uses a RANSAC-inspired approach:
1. Enumerate candidate lines through pairs of swing lows (support) or highs (resistance)
2. Count how many other pivots "touch" each line (within tolerance)
3. Verify no significant violations between touches
4. Score and rank, deduplicate similar lines
5. Pair parallel support+resistance lines into channels
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from itertools import combinations

import numpy as np

from .swings import SwingPoint, swing_highs, swing_lows


@dataclass
class Trendline:
    kind: str  # "support" or "resistance"
    slope: float  # price change per bar
    intercept: float  # price at index 0
    start_idx: int
    end_idx: int
    start_time: str
    end_time: str
    touches: list[dict]  # [{index, time, price, distance_pct}, ...]
    violations: int
    score: float
    slope_per_day: float = 0.0  # annualized for display
    channel_id: str | None = None  # set when part of a channel

    def price_at(self, idx: int) -> float:
        return self.slope * idx + self.intercept

    def to_dict(self, times: list[str], n_bars: int) -> dict:
        """Serialize for API response, extending active lines to current bar."""
        # Extend to current bar if the line is still active (end within last 30% of bars)
        recency_cutoff = int(n_bars * 0.7)
        if self.end_idx >= recency_cutoff:
            ext_idx = n_bars - 1
        else:
            ext_idx = min(n_bars - 1, self.end_idx + 40)
        return {
            "kind": self.kind,
            "slope": round(self.slope, 6),
            "intercept": round(self.intercept, 2),
            "start_time": self.start_time,
            "end_time": self.end_time,
            "touches": len(self.touches),
            "touch_points": self.touches,
            "violations": self.violations,
            "score": round(self.score, 2),
            "channel_id": self.channel_id,
            "line": [
                {"time": self.start_time, "value": round(self.price_at(self.start_idx), 2)},
                {"time": times[ext_idx],
                 "value": round(self.price_at(ext_idx), 2)},
            ],
        }


@dataclass
class Channel:
    support: Trendline
    resistance: Trendline
    slope: float
    width: float  # avg price distance between lines
    touches_total: int
    score: float
    channel_id: str = ""

    def to_dict(self, times: list[str], n_bars: int) -> dict:
        return {
            "support": self.support.to_dict(times, n_bars),
            "resistance": self.resistance.to_dict(times, n_bars),
            "slope": round(self.slope, 6),
            "width": round(self.width, 2),
            "touches_total": self.touches_total,
            "score": round(self.score, 2),
            "channel_id": self.channel_id,
        }


def _fit_line(p1_idx: int, p1_price: float, p2_idx: int, p2_price: float):
    """Return (slope, intercept) for a line through two points."""
    if p2_idx == p1_idx:
        return 0.0, p1_price
    slope = (p2_price - p1_price) / (p2_idx - p1_idx)
    intercept = p1_price - slope * p1_idx
    return slope, intercept


def _deduplicate_lines(lines: list[Trendline], slope_tol: float = 0.0005, intercept_pct: float = 0.02) -> list[Trendline]:
    """Remove near-duplicate lines, keeping the highest-scoring."""
    if not lines:
        return []
    lines = sorted(lines, key=lambda l: -l.score)
    kept: list[Trendline] = []
    for line in lines:
        is_dup = False
        for existing in kept:
            if abs(line.slope - existing.slope) < slope_tol:
                avg_price = (line.intercept + existing.intercept) / 2
                if avg_price > 0 and abs(line.intercept - existing.intercept) / avg_price < intercept_pct:
                    is_dup = True
                    break
        if not is_dup:
            kept.append(line)
    return kept


def detect_trendlines(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    swings: list[SwingPoint],
    min_touches: int = 3,
    tolerance_pct: float = 0.015,
    max_lines: int = 3,
) -> dict:
    """
    Detect support/resistance trendlines and parallel channels.

    Returns dict with keys "support", "resistance", and "channels".
    """
    n = len(times)
    sh = swing_highs(swings)
    sl = swing_lows(swings)

    support_lines = _find_lines(
        pivots=sl,
        all_prices_check=lows,
        kind="support",
        violation_check="below",
        times=times,
        n=n,
        min_touches=min_touches,
        tolerance_pct=tolerance_pct,
        closes=closes,
    )

    resistance_lines = _find_lines(
        pivots=sh,
        all_prices_check=highs,
        kind="resistance",
        violation_check="above",
        times=times,
        n=n,
        min_touches=min_touches,
        tolerance_pct=tolerance_pct,
        closes=closes,
    )

    support_lines = _deduplicate_lines(support_lines)
    resistance_lines = _deduplicate_lines(resistance_lines)

    # ── Channel detection ──
    channels = _detect_channels(
        support_lines, resistance_lines,
        sh, sl, highs, lows, times, n, tolerance_pct,
    )

    # Mark channel trendlines and boost their score
    channel_support_ids = set()
    channel_resistance_ids = set()
    for ch in channels:
        channel_support_ids.add(id(ch.support))
        channel_resistance_ids.add(id(ch.resistance))

    # Build final lists: channel lines first (they're most important), then others
    final_support = []
    final_resistance = []

    for ch in channels:
        if id(ch.support) not in {id(s) for s in final_support}:
            final_support.append(ch.support)
        if id(ch.resistance) not in {id(r) for r in final_resistance}:
            final_resistance.append(ch.resistance)

    for tl in support_lines:
        if id(tl) not in channel_support_ids and len(final_support) < max_lines:
            final_support.append(tl)
    for tl in resistance_lines:
        if id(tl) not in channel_resistance_ids and len(final_resistance) < max_lines:
            final_resistance.append(tl)

    return {
        "support": final_support[:max_lines],
        "resistance": final_resistance[:max_lines],
        "channels": channels,
    }


def _find_lines(
    pivots: list[SwingPoint],
    all_prices_check: np.ndarray,
    kind: str,
    violation_check: str,
    times: list[str],
    n: int,
    min_touches: int,
    tolerance_pct: float,
    closes: np.ndarray,
) -> list[Trendline]:
    """Find trendlines from a set of pivot points."""
    if len(pivots) < 2:
        return []

    candidates: list[Trendline] = []

    # Limit combinatorial explosion: use the most significant pivots
    pivots_sorted = sorted(pivots, key=lambda p: (-p.strength, p.index))
    use_pivots = pivots_sorted[:40]  # cap at 40 most significant
    use_pivots.sort(key=lambda p: p.index)

    for i, j in combinations(range(len(use_pivots)), 2):
        p1, p2 = use_pivots[i], use_pivots[j]

        # Require minimum separation
        if p2.index - p1.index < 15:
            continue

        slope, intercept = _fit_line(p1.index, p1.price, p2.index, p2.price)

        # Count touches among ALL pivots (not just the subset)
        touches = []
        for pv in pivots:
            expected = slope * pv.index + intercept
            if expected <= 0:
                continue
            dist_pct = abs(pv.price - expected) / expected
            if dist_pct < tolerance_pct:
                touches.append({
                    "index": pv.index,
                    "time": pv.time,
                    "price": round(pv.price, 2),
                    "distance_pct": round(dist_pct * 100, 3),
                })

        if len(touches) < min_touches:
            continue

        # Check for violations: price significantly through the line
        violations = 0
        strict_tol = tolerance_pct * 2
        for idx in range(p1.index, min(p2.index + 1, n)):
            expected = slope * idx + intercept
            if expected <= 0:
                continue
            price_check = float(all_prices_check[idx])
            if violation_check == "below":
                # Support: violation if price goes well below the line
                if price_check < expected * (1 - strict_tol):
                    violations += 1
            else:
                # Resistance: violation if price goes well above the line
                if price_check > expected * (1 + strict_tol):
                    violations += 1

        # Allow some tolerance — a few wicks through is normal
        max_violations = max(3, int((p2.index - p1.index) * 0.04))
        if violations > max_violations:
            continue

        # Score: touches * duration * recency
        duration = p2.index - p1.index
        recency = 1.0 + 0.5 * (p2.index / max(n, 1))  # recent lines score higher
        touch_score = sum(2 if t["distance_pct"] < 0.5 else 1 for t in touches)
        score = touch_score * math.sqrt(duration) * recency * (1 - violations / max(max_violations, 1) * 0.3)

        candidates.append(Trendline(
            kind=kind,
            slope=slope,
            intercept=intercept,
            start_idx=p1.index,
            end_idx=p2.index,
            start_time=p1.time,
            end_time=p2.time,
            touches=touches,
            violations=violations,
            score=score,
        ))

    return candidates


# ─────────────────────────────────────────────────────────────────────────────
# Channel detection — finds parallel support+resistance trendline pairs
# ─────────────────────────────────────────────────────────────────────────────

def _fit_parallel(
    slope: float,
    primary: Trendline,
    opposite_pivots: list[SwingPoint],
    opposite_prices: np.ndarray,
    kind: str,  # "support" or "resistance" (what we're fitting)
    times: list[str],
    n: int,
    tolerance_pct: float,
) -> Trendline | None:
    """
    Given a slope from a primary trendline, find the best parallel line on the
    opposite side by testing different intercepts through opposite-side swing points.
    """
    if len(opposite_pivots) < 2:
        return None

    # Try an intercept from each opposite-side pivot
    best: Trendline | None = None
    best_score = 0.0

    # Filter to pivots in the relevant time range (overlapping with primary)
    relevant = [p for p in opposite_pivots
                if p.index >= primary.start_idx - 30 and p.index <= n - 1]
    if len(relevant) < 2:
        return None

    for anchor in relevant:
        intercept = anchor.price - slope * anchor.index

        # Count touches
        touches = []
        for pv in opposite_pivots:
            expected = slope * pv.index + intercept
            if expected <= 0:
                continue
            dist_pct = abs(pv.price - expected) / expected
            if dist_pct < tolerance_pct:
                touches.append({
                    "index": pv.index,
                    "time": pv.time,
                    "price": round(pv.price, 2),
                    "distance_pct": round(dist_pct * 100, 3),
                })

        if len(touches) < 2:
            continue

        # Check violations
        violation_check = "below" if kind == "support" else "above"
        violations = 0
        start_idx = min(t["index"] for t in touches)
        end_idx = max(t["index"] for t in touches)
        strict_tol = tolerance_pct * 2.5
        for idx in range(start_idx, min(end_idx + 1, n)):
            expected = slope * idx + intercept
            if expected <= 0:
                continue
            price_check = float(opposite_prices[idx])
            if violation_check == "below":
                if price_check < expected * (1 - strict_tol):
                    violations += 1
            else:
                if price_check > expected * (1 + strict_tol):
                    violations += 1

        span = end_idx - start_idx
        max_violations = max(3, int(span * 0.05))
        if violations > max_violations:
            continue

        # Score
        duration = end_idx - start_idx
        recency = 1.0 + 0.5 * (end_idx / max(n, 1))
        touch_score = sum(2 if t["distance_pct"] < 0.5 else 1 for t in touches)
        score = touch_score * math.sqrt(max(duration, 1)) * recency

        if score > best_score:
            best_score = score
            best = Trendline(
                kind=kind,
                slope=slope,
                intercept=intercept,
                start_idx=start_idx,
                end_idx=end_idx,
                start_time=times[start_idx],
                end_time=times[end_idx],
                touches=touches,
                violations=violations,
                score=score,
            )

    return best


def _detect_channels(
    support_lines: list[Trendline],
    resistance_lines: list[Trendline],
    swing_hi: list[SwingPoint],
    swing_lo: list[SwingPoint],
    highs: np.ndarray,
    lows: np.ndarray,
    times: list[str],
    n: int,
    tolerance_pct: float,
) -> list[Channel]:
    """
    Find channels by:
    1. For each support line, fit a parallel resistance line through swing highs
    2. For each resistance line, fit a parallel support line through swing lows
    3. Also check existing line pairs for natural parallelism
    4. Score and deduplicate
    """
    candidates: list[Channel] = []
    used_slopes: list[float] = []
    slope_dedup_tol = 0.003

    # Strategy 1: support → fit parallel resistance
    for sup in support_lines[:8]:
        par_res = _fit_parallel(
            slope=sup.slope, primary=sup, opposite_pivots=swing_hi,
            opposite_prices=highs, kind="resistance",
            times=times, n=n, tolerance_pct=tolerance_pct * 1.2,
        )
        if par_res and len(par_res.touches) >= 2:
            _try_add_channel(candidates, used_slopes, slope_dedup_tol,
                             sup, par_res, times, n)

    # Strategy 2: resistance → fit parallel support
    for res in resistance_lines[:8]:
        par_sup = _fit_parallel(
            slope=res.slope, primary=res, opposite_pivots=swing_lo,
            opposite_prices=lows, kind="support",
            times=times, n=n, tolerance_pct=tolerance_pct * 1.2,
        )
        if par_sup and len(par_sup.touches) >= 2:
            _try_add_channel(candidates, used_slopes, slope_dedup_tol,
                             par_sup, res, times, n)

    # Strategy 3: check existing line pairs for natural parallelism
    for sup in support_lines[:6]:
        for res in resistance_lines[:6]:
            avg_slope = (sup.slope + res.slope) / 2
            slope_diff = abs(sup.slope - res.slope)
            # Slopes within 15% of each other = roughly parallel
            if avg_slope != 0 and slope_diff / abs(avg_slope) < 0.15:
                # Must have the resistance above support
                mid_idx = (max(sup.start_idx, res.start_idx) + min(sup.end_idx, res.end_idx)) // 2
                if res.price_at(mid_idx) > sup.price_at(mid_idx):
                    _try_add_channel(candidates, used_slopes, slope_dedup_tol,
                                     sup, res, times, n)

    # Sort by score and return top channels
    candidates.sort(key=lambda c: -c.score)
    return candidates[:3]


def _try_add_channel(
    candidates: list[Channel],
    used_slopes: list[float],
    slope_tol: float,
    support: Trendline,
    resistance: Trendline,
    times: list[str],
    n: int,
):
    """Score a channel candidate and add if it's good enough and not a duplicate."""
    # Resistance must be above support
    mid_idx = (max(support.start_idx, resistance.start_idx) +
               min(support.end_idx, resistance.end_idx)) // 2
    if resistance.price_at(mid_idx) <= support.price_at(mid_idx):
        return

    avg_slope = (support.slope + resistance.slope) / 2

    # Check slope dedup
    for existing_slope in used_slopes:
        if abs(avg_slope - existing_slope) < slope_tol:
            return

    # Channel width
    width = resistance.price_at(mid_idx) - support.price_at(mid_idx)
    mid_price = (resistance.price_at(mid_idx) + support.price_at(mid_idx)) / 2

    # Reject channels that are too wide (>40% of price) or too narrow (<2%)
    if mid_price > 0:
        width_pct = width / mid_price
        if width_pct > 0.40 or width_pct < 0.02:
            return

    touches_total = len(support.touches) + len(resistance.touches)
    overlap_start = max(support.start_idx, resistance.start_idx)
    overlap_end = min(support.end_idx, resistance.end_idx)
    overlap = max(0, overlap_end - overlap_start)

    # Score: touches on both sides, duration of overlap, recency
    recency = 1.0 + (max(support.end_idx, resistance.end_idx) / max(n, 1))
    parallelism = 1.0 - min(1.0, abs(support.slope - resistance.slope) / max(abs(avg_slope), 0.001) * 2)
    score = (touches_total * math.sqrt(max(overlap, 1)) * recency * (1 + parallelism)
             * (1 + min(len(support.touches), len(resistance.touches)) / 3))

    if score < 10:
        return

    channel_id = f"ch_{len(candidates)}"
    support.channel_id = channel_id
    resistance.channel_id = channel_id

    # Extend both lines to cover the same range
    combined_start = min(support.start_idx, resistance.start_idx)
    combined_end = max(support.end_idx, resistance.end_idx)
    support.start_idx = combined_start
    support.start_time = times[combined_start]
    resistance.start_idx = combined_start
    resistance.start_time = times[combined_start]
    support.end_idx = combined_end
    support.end_time = times[combined_end]
    resistance.end_idx = combined_end
    resistance.end_time = times[combined_end]

    candidates.append(Channel(
        support=support,
        resistance=resistance,
        slope=avg_slope,
        width=width,
        touches_total=touches_total,
        score=score,
        channel_id=channel_id,
    ))
    used_slopes.append(avg_slope)
