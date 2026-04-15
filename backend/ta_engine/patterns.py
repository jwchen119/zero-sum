"""
Classic chart pattern detection.

Identifies structural price patterns using swing points:
- Double Bottom / Double Top
- Head and Shoulders / Inverse H&S
- Rising Wedge / Falling Wedge
- Ascending / Descending / Symmetrical Triangle
- Cup and Handle
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .swings import SwingPoint, swing_highs, swing_lows


@dataclass
class ChartPattern:
    kind: str  # "double_bottom", "double_top", "head_shoulders", etc.
    direction: str  # "bullish" or "bearish"
    confidence: float  # 0-1
    start_idx: int
    end_idx: int
    start_time: str
    end_time: str
    description: str
    key_points: list[dict]  # [{time, price, label}, ...]
    # Trade levels
    entry: float | None = None
    stop: float | None = None
    target: float | None = None
    risk_reward: float | None = None
    status: str = "forming"  # "forming", "confirmed", "completed", "failed"

    def to_dict(self) -> dict:
        d = {
            "kind": self.kind,
            "direction": self.direction,
            "confidence": round(self.confidence, 3),
            "start_time": self.start_time,
            "end_time": self.end_time,
            "description": self.description,
            "key_points": self.key_points,
            "status": self.status,
        }
        if self.entry is not None:
            d["entry"] = round(self.entry, 2)
        if self.stop is not None:
            d["stop"] = round(self.stop, 2)
        if self.target is not None:
            d["target"] = round(self.target, 2)
        if self.risk_reward is not None:
            d["risk_reward"] = round(self.risk_reward, 2)
        return d


def detect_all_patterns(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    volumes: np.ndarray,
    swings: list[SwingPoint],
) -> list[ChartPattern]:
    """Run all pattern detectors and return combined results."""
    patterns: list[ChartPattern] = []
    patterns.extend(detect_double_bottoms(times, highs, lows, closes, volumes, swings))
    patterns.extend(detect_double_tops(times, highs, lows, closes, volumes, swings))
    patterns.extend(detect_head_shoulders(times, highs, lows, closes, volumes, swings))
    patterns.extend(detect_inv_head_shoulders(times, highs, lows, closes, volumes, swings))
    patterns.extend(detect_wedges(times, highs, lows, closes, swings))
    patterns.extend(detect_triangles(times, highs, lows, closes, swings))
    return patterns


# ─── Double Bottom ────────────────────────────────────────


def detect_double_bottoms(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    volumes: np.ndarray,
    swings: list[SwingPoint],
    tolerance_pct: float = 0.03,
    min_separation: int = 15,
) -> list[ChartPattern]:
    """
    Double bottom: two swing lows at approximately the same price,
    with a swing high (neckline) between them.
    """
    sl = swing_lows(swings)
    sh = swing_highs(swings)
    n = len(times)
    patterns: list[ChartPattern] = []

    for i in range(len(sl)):
        for j in range(i + 1, len(sl)):
            l1, l2 = sl[i], sl[j]

            # Must be separated enough
            if l2.index - l1.index < min_separation:
                continue
            if l2.index - l1.index > 300:
                continue

            # Prices must be close
            avg_price = (l1.price + l2.price) / 2
            if avg_price <= 0:
                continue
            if abs(l1.price - l2.price) / avg_price > tolerance_pct:
                continue

            # Must have a swing high between them (the neckline)
            between_highs = [s for s in sh if l1.index < s.index < l2.index]
            if not between_highs:
                continue
            neckline = max(between_highs, key=lambda s: s.price)
            neckline_price = neckline.price

            # Neckline must be meaningfully above the lows
            depth = neckline_price - avg_price
            if depth / avg_price < 0.03:
                continue

            # Check confirmation: price breaks above neckline after l2
            confirmed = False
            breakout_idx = None
            for k in range(l2.index + 1, min(n, l2.index + 50)):
                if closes[k] > neckline_price:
                    confirmed = True
                    breakout_idx = k
                    break

            # Volume: ideally second low has lower volume (exhaustion)
            vol1 = float(volumes[l1.index])
            vol2 = float(volumes[l2.index])
            vol_exhaustion = vol2 < vol1

            conf = 0.4
            if confirmed:
                conf += 0.25
            if vol_exhaustion:
                conf += 0.1
            if l1.strength >= 2:
                conf += 0.05
            if l2.strength >= 2:
                conf += 0.05
            conf += min(0.15, (l2.index - l1.index) / 200 * 0.15)

            entry = neckline_price
            stop = min(l1.price, l2.price) - depth * 0.1
            target = neckline_price + depth  # measured move
            rr = (target - entry) / (entry - stop) if entry > stop else 0

            status = "confirmed" if confirmed else "forming"

            patterns.append(ChartPattern(
                kind="double_bottom",
                direction="bullish",
                confidence=min(1.0, conf),
                start_idx=l1.index,
                end_idx=breakout_idx or l2.index,
                start_time=l1.time,
                end_time=times[breakout_idx or l2.index],
                description=f"Double bottom at ~${avg_price:.0f} with neckline at ${neckline_price:.0f}",
                key_points=[
                    {"time": l1.time, "price": round(l1.price, 2), "label": "Low 1"},
                    {"time": neckline.time, "price": round(neckline_price, 2), "label": "Neckline"},
                    {"time": l2.time, "price": round(l2.price, 2), "label": "Low 2"},
                ],
                entry=entry,
                stop=stop,
                target=target,
                risk_reward=rr,
                status=status,
            ))

    # Deduplicate overlapping patterns
    return _deduplicate_patterns(patterns)


# ─── Double Top ───────────────────────────────────────────


def detect_double_tops(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    volumes: np.ndarray,
    swings: list[SwingPoint],
    tolerance_pct: float = 0.03,
    min_separation: int = 15,
) -> list[ChartPattern]:
    """
    Double top: two swing highs at approximately the same price,
    with a swing low (neckline) between them.
    """
    sh = swing_highs(swings)
    sl = swing_lows(swings)
    n = len(times)
    patterns: list[ChartPattern] = []

    for i in range(len(sh)):
        for j in range(i + 1, len(sh)):
            h1, h2 = sh[i], sh[j]

            if h2.index - h1.index < min_separation:
                continue
            if h2.index - h1.index > 300:
                continue

            avg_price = (h1.price + h2.price) / 2
            if avg_price <= 0:
                continue
            if abs(h1.price - h2.price) / avg_price > tolerance_pct:
                continue

            between_lows = [s for s in sl if h1.index < s.index < h2.index]
            if not between_lows:
                continue
            neckline = min(between_lows, key=lambda s: s.price)
            neckline_price = neckline.price

            depth = avg_price - neckline_price
            if depth / avg_price < 0.03:
                continue

            confirmed = False
            breakout_idx = None
            for k in range(h2.index + 1, min(n, h2.index + 50)):
                if closes[k] < neckline_price:
                    confirmed = True
                    breakout_idx = k
                    break

            vol1 = float(volumes[h1.index])
            vol2 = float(volumes[h2.index])
            vol_exhaustion = vol2 < vol1

            conf = 0.4
            if confirmed:
                conf += 0.25
            if vol_exhaustion:
                conf += 0.1
            if h1.strength >= 2:
                conf += 0.05
            if h2.strength >= 2:
                conf += 0.05
            conf += min(0.15, (h2.index - h1.index) / 200 * 0.15)

            entry = neckline_price
            stop = max(h1.price, h2.price) + depth * 0.1
            target = neckline_price - depth
            rr = (entry - target) / (stop - entry) if stop > entry else 0

            status = "confirmed" if confirmed else "forming"

            patterns.append(ChartPattern(
                kind="double_top",
                direction="bearish",
                confidence=min(1.0, conf),
                start_idx=h1.index,
                end_idx=breakout_idx or h2.index,
                start_time=h1.time,
                end_time=times[breakout_idx or h2.index],
                description=f"Double top at ~${avg_price:.0f} with neckline at ${neckline_price:.0f}",
                key_points=[
                    {"time": h1.time, "price": round(h1.price, 2), "label": "High 1"},
                    {"time": neckline.time, "price": round(neckline_price, 2), "label": "Neckline"},
                    {"time": h2.time, "price": round(h2.price, 2), "label": "High 2"},
                ],
                entry=entry,
                stop=stop,
                target=target,
                risk_reward=rr,
                status=status,
            ))

    return _deduplicate_patterns(patterns)


# ─── Head and Shoulders ──────────────────────────────────


def detect_head_shoulders(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    volumes: np.ndarray,
    swings: list[SwingPoint],
    shoulder_tol: float = 0.05,
) -> list[ChartPattern]:
    """
    Head and Shoulders (bearish): left shoulder, head (highest), right shoulder.
    Two troughs between them form the neckline.
    """
    sh = swing_highs(swings, min_strength=1)
    sl = swing_lows(swings, min_strength=1)
    n = len(times)
    patterns: list[ChartPattern] = []

    for head_i in range(1, len(sh) - 1):
        head = sh[head_i]

        # Find potential left shoulders (lower high before the head)
        for ls_i in range(head_i - 1, -1, -1):
            ls = sh[ls_i]
            if head.index - ls.index < 10 or head.index - ls.index > 200:
                continue
            if ls.price >= head.price:
                continue  # left shoulder must be lower than head

            # Find potential right shoulders (lower high after the head)
            for rs_i in range(head_i + 1, len(sh)):
                rs = sh[rs_i]
                if rs.index - head.index < 10 or rs.index - head.index > 200:
                    continue
                if rs.price >= head.price:
                    continue

                # Shoulders should be roughly equal height
                avg_shoulder = (ls.price + rs.price) / 2
                if avg_shoulder <= 0:
                    continue
                if abs(ls.price - rs.price) / avg_shoulder > shoulder_tol:
                    continue

                # Find neckline troughs
                trough1_candidates = [s for s in sl if ls.index < s.index < head.index]
                trough2_candidates = [s for s in sl if head.index < s.index < rs.index]

                if not trough1_candidates or not trough2_candidates:
                    continue

                t1 = min(trough1_candidates, key=lambda s: s.price)
                t2 = min(trough2_candidates, key=lambda s: s.price)

                # Neckline
                neckline_price = (t1.price + t2.price) / 2

                # Head must be meaningfully above neckline
                pattern_height = head.price - neckline_price
                if pattern_height / head.price < 0.04:
                    continue

                # Check for confirmation (break below neckline)
                confirmed = False
                breakout_idx = None
                for k in range(rs.index + 1, min(n, rs.index + 40)):
                    if closes[k] < neckline_price:
                        confirmed = True
                        breakout_idx = k
                        break

                conf = 0.35
                if confirmed:
                    conf += 0.3
                # Volume should diminish from left shoulder to head to right shoulder
                vol_ls = float(volumes[ls.index])
                vol_head = float(volumes[head.index])
                vol_rs = float(volumes[rs.index])
                if vol_rs < vol_head < vol_ls:
                    conf += 0.1
                if head.strength >= 2:
                    conf += 0.1

                entry = neckline_price
                stop = rs.price + pattern_height * 0.1
                target = neckline_price - pattern_height
                rr = (entry - target) / (stop - entry) if stop > entry else 0

                patterns.append(ChartPattern(
                    kind="head_shoulders",
                    direction="bearish",
                    confidence=min(1.0, conf),
                    start_idx=ls.index,
                    end_idx=breakout_idx or rs.index,
                    start_time=ls.time,
                    end_time=times[breakout_idx or rs.index],
                    description=f"H&S: head ${head.price:.0f}, shoulders ~${avg_shoulder:.0f}, neckline ${neckline_price:.0f}",
                    key_points=[
                        {"time": ls.time, "price": round(ls.price, 2), "label": "Left Shoulder"},
                        {"time": t1.time, "price": round(t1.price, 2), "label": "Trough 1"},
                        {"time": head.time, "price": round(head.price, 2), "label": "Head"},
                        {"time": t2.time, "price": round(t2.price, 2), "label": "Trough 2"},
                        {"time": rs.time, "price": round(rs.price, 2), "label": "Right Shoulder"},
                    ],
                    entry=entry,
                    stop=stop,
                    target=target,
                    risk_reward=rr,
                    status="confirmed" if confirmed else "forming",
                ))

    return _deduplicate_patterns(patterns)


# ─── Inverse Head and Shoulders ──────────────────────────


def detect_inv_head_shoulders(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    volumes: np.ndarray,
    swings: list[SwingPoint],
    shoulder_tol: float = 0.05,
) -> list[ChartPattern]:
    """Inverse H&S (bullish): left shoulder low, head (lowest), right shoulder low."""
    sl = swing_lows(swings, min_strength=1)
    sh = swing_highs(swings, min_strength=1)
    n = len(times)
    patterns: list[ChartPattern] = []

    for head_i in range(1, len(sl) - 1):
        head = sl[head_i]

        for ls_i in range(head_i - 1, -1, -1):
            ls = sl[ls_i]
            if head.index - ls.index < 10 or head.index - ls.index > 200:
                continue
            if ls.price <= head.price:
                continue  # left shoulder must be higher (less deep) than head

            for rs_i in range(head_i + 1, len(sl)):
                rs = sl[rs_i]
                if rs.index - head.index < 10 or rs.index - head.index > 200:
                    continue
                if rs.price <= head.price:
                    continue

                avg_shoulder = (ls.price + rs.price) / 2
                if avg_shoulder <= 0:
                    continue
                if abs(ls.price - rs.price) / avg_shoulder > shoulder_tol:
                    continue

                peak1_candidates = [s for s in sh if ls.index < s.index < head.index]
                peak2_candidates = [s for s in sh if head.index < s.index < rs.index]

                if not peak1_candidates or not peak2_candidates:
                    continue

                p1 = max(peak1_candidates, key=lambda s: s.price)
                p2 = max(peak2_candidates, key=lambda s: s.price)

                neckline_price = (p1.price + p2.price) / 2
                pattern_height = neckline_price - head.price
                if pattern_height / neckline_price < 0.04:
                    continue

                confirmed = False
                breakout_idx = None
                for k in range(rs.index + 1, min(n, rs.index + 40)):
                    if closes[k] > neckline_price:
                        confirmed = True
                        breakout_idx = k
                        break

                conf = 0.35
                if confirmed:
                    conf += 0.3
                vol_rs = float(volumes[rs.index])
                vol_head = float(volumes[head.index])
                vol_ls = float(volumes[ls.index])
                if vol_rs < vol_head < vol_ls:
                    conf += 0.1
                if head.strength >= 2:
                    conf += 0.1

                entry = neckline_price
                stop = head.price - pattern_height * 0.1
                target = neckline_price + pattern_height
                rr = (target - entry) / (entry - stop) if entry > stop else 0

                patterns.append(ChartPattern(
                    kind="inv_head_shoulders",
                    direction="bullish",
                    confidence=min(1.0, conf),
                    start_idx=ls.index,
                    end_idx=breakout_idx or rs.index,
                    start_time=ls.time,
                    end_time=times[breakout_idx or rs.index],
                    description=f"Inv H&S: head ${head.price:.0f}, shoulders ~${avg_shoulder:.0f}, neckline ${neckline_price:.0f}",
                    key_points=[
                        {"time": ls.time, "price": round(ls.price, 2), "label": "Left Shoulder"},
                        {"time": p1.time, "price": round(p1.price, 2), "label": "Peak 1"},
                        {"time": head.time, "price": round(head.price, 2), "label": "Head"},
                        {"time": p2.time, "price": round(p2.price, 2), "label": "Peak 2"},
                        {"time": rs.time, "price": round(rs.price, 2), "label": "Right Shoulder"},
                    ],
                    entry=entry,
                    stop=stop,
                    target=target,
                    risk_reward=rr,
                    status="confirmed" if confirmed else "forming",
                ))

    return _deduplicate_patterns(patterns)


# ─── Wedges ──────────────────────────────────────────────


def detect_wedges(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    swings: list[SwingPoint],
    min_points: int = 4,
    min_bars: int = 30,
) -> list[ChartPattern]:
    """
    Wedges: converging trendlines where both slope in the same direction.
    - Rising wedge (both up, converging) → bearish
    - Falling wedge (both down, converging) → bullish
    """
    sh = swing_highs(swings, min_strength=1)
    sl = swing_lows(swings, min_strength=1)
    n = len(times)
    patterns: list[ChartPattern] = []

    # Try to fit lines through recent swing points
    for window_start in range(max(0, n - 500), n - min_bars, 50):
        window_end = min(n, window_start + 400)

        w_highs = [s for s in sh if window_start <= s.index < window_end]
        w_lows = [s for s in sl if window_start <= s.index < window_end]

        if len(w_highs) < 2 or len(w_lows) < 2:
            continue

        # Fit line through the highs
        hi_x = np.array([s.index for s in w_highs], dtype=float)
        hi_y = np.array([s.price for s in w_highs], dtype=float)
        if len(hi_x) < 2:
            continue
        hi_slope, hi_int = np.polyfit(hi_x, hi_y, 1)

        # Fit line through the lows
        lo_x = np.array([s.index for s in w_lows], dtype=float)
        lo_y = np.array([s.price for s in w_lows], dtype=float)
        if len(lo_x) < 2:
            continue
        lo_slope, lo_int = np.polyfit(lo_x, lo_y, 1)

        # Both slopes must be in the same direction for a wedge
        if hi_slope * lo_slope <= 0:
            continue  # diverging or one flat — not a wedge

        # Lines must converge (gap narrows)
        gap_start = (hi_slope * window_start + hi_int) - (lo_slope * window_start + lo_int)
        gap_end = (hi_slope * window_end + hi_int) - (lo_slope * window_end + lo_int)
        if gap_end >= gap_start:
            continue  # diverging, not a wedge

        if gap_start <= 0 or gap_end <= 0:
            continue

        # Minimum number of total touches
        tolerance = gap_start * 0.05
        hi_touches = sum(1 for s in w_highs if abs(s.price - (hi_slope * s.index + hi_int)) < tolerance)
        lo_touches = sum(1 for s in w_lows if abs(s.price - (lo_slope * s.index + lo_int)) < tolerance)

        if hi_touches + lo_touches < min_points:
            continue

        duration = window_end - window_start
        if duration < min_bars:
            continue

        # Rising wedge (both slopes positive) → bearish
        # Falling wedge (both slopes negative) → bullish
        if hi_slope > 0 and lo_slope > 0:
            kind = "rising_wedge"
            direction = "bearish"
            desc = f"Rising wedge converging from ${gap_start:.0f} to ${gap_end:.0f} width"
        else:
            kind = "falling_wedge"
            direction = "bullish"
            desc = f"Falling wedge converging from ${gap_start:.0f} to ${gap_end:.0f} width"

        # Confidence based on number of touches and convergence ratio
        convergence_ratio = gap_end / gap_start
        conf = 0.3
        conf += min(0.3, (hi_touches + lo_touches) / 8 * 0.3)
        conf += (1 - convergence_ratio) * 0.2
        conf += min(0.2, duration / 200 * 0.2)

        all_points = w_highs + w_lows
        all_points.sort(key=lambda s: s.index)
        key_pts = [
            {"time": s.time, "price": round(s.price, 2), "label": s.kind}
            for s in all_points[:8]
        ]

        # Trade levels
        last_close = float(closes[-1])
        if direction == "bullish":
            entry = hi_slope * (n - 1) + hi_int  # upper trendline
            stop = lo_slope * (n - 1) + lo_int - gap_end * 0.2
            target = entry + gap_start
        else:
            entry = lo_slope * (n - 1) + lo_int  # lower trendline
            stop = hi_slope * (n - 1) + hi_int + gap_end * 0.2
            target = entry - gap_start

        rr = abs(target - entry) / abs(stop - entry) if abs(stop - entry) > 0 else 0

        patterns.append(ChartPattern(
            kind=kind,
            direction=direction,
            confidence=min(1.0, conf),
            start_idx=window_start,
            end_idx=window_end - 1,
            start_time=times[window_start],
            end_time=times[window_end - 1],
            description=desc,
            key_points=key_pts,
            entry=round(entry, 2),
            stop=round(stop, 2),
            target=round(target, 2),
            risk_reward=round(rr, 2),
        ))

    return _deduplicate_patterns(patterns)


# ─── Triangles ───────────────────────────────────────────


def detect_triangles(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    swings: list[SwingPoint],
    min_points: int = 4,
    min_bars: int = 25,
) -> list[ChartPattern]:
    """
    Triangles:
    - Ascending: flat resistance + rising support → bullish
    - Descending: falling resistance + flat support → bearish
    - Symmetrical: converging lines, hi slopes down, lo slopes up → continuation
    """
    sh = swing_highs(swings, min_strength=1)
    sl = swing_lows(swings, min_strength=1)
    n = len(times)
    patterns: list[ChartPattern] = []

    flat_threshold = 0.0003  # slope per bar considered "flat"

    for window_start in range(max(0, n - 500), n - min_bars, 50):
        window_end = min(n, window_start + 350)

        w_highs = [s for s in sh if window_start <= s.index < window_end]
        w_lows = [s for s in sl if window_start <= s.index < window_end]

        if len(w_highs) < 2 or len(w_lows) < 2:
            continue

        hi_x = np.array([s.index for s in w_highs], dtype=float)
        hi_y = np.array([s.price for s in w_highs], dtype=float)
        lo_x = np.array([s.index for s in w_lows], dtype=float)
        lo_y = np.array([s.price for s in w_lows], dtype=float)

        if len(hi_x) < 2 or len(lo_x) < 2:
            continue

        hi_slope, hi_int = np.polyfit(hi_x, hi_y, 1)
        lo_slope, lo_int = np.polyfit(lo_x, lo_y, 1)

        # Lines must converge
        avg_price = float(np.mean(closes[window_start:window_end]))
        if avg_price <= 0:
            continue

        # Normalize slopes to percentage per bar
        hi_slope_pct = hi_slope / avg_price
        lo_slope_pct = lo_slope / avg_price

        gap_start = (hi_slope * window_start + hi_int) - (lo_slope * window_start + lo_int)
        gap_end = (hi_slope * window_end + hi_int) - (lo_slope * window_end + lo_int)

        if gap_start <= 0 or gap_end <= 0 or gap_end >= gap_start:
            continue  # must converge

        duration = window_end - window_start
        if duration < min_bars:
            continue

        # Count touches
        tolerance = gap_start * 0.05
        hi_touches = sum(1 for s in w_highs if abs(s.price - (hi_slope * s.index + hi_int)) < tolerance)
        lo_touches = sum(1 for s in w_lows if abs(s.price - (lo_slope * s.index + lo_int)) < tolerance)

        if hi_touches + lo_touches < min_points:
            continue

        # Classify
        hi_flat = abs(hi_slope_pct) < flat_threshold
        lo_flat = abs(lo_slope_pct) < flat_threshold

        if hi_flat and lo_slope > 0:
            kind = "ascending_triangle"
            direction = "bullish"
            desc = f"Ascending triangle: flat resistance ~${hi_int:.0f}, rising support"
        elif lo_flat and hi_slope < 0:
            kind = "descending_triangle"
            direction = "bearish"
            desc = f"Descending triangle: falling resistance, flat support ~${lo_int:.0f}"
        elif hi_slope < 0 and lo_slope > 0:
            kind = "symmetrical_triangle"
            direction = "neutral"  # continuation pattern
            desc = "Symmetrical triangle: converging resistance and support"
        else:
            continue  # not a valid triangle

        conf = 0.3
        conf += min(0.3, (hi_touches + lo_touches) / 8 * 0.3)
        convergence_ratio = gap_end / gap_start
        conf += (1 - convergence_ratio) * 0.2
        conf += min(0.2, duration / 200 * 0.2)

        all_points = w_highs + w_lows
        all_points.sort(key=lambda s: s.index)
        key_pts = [{"time": s.time, "price": round(s.price, 2), "label": s.kind} for s in all_points[:8]]

        last_close = float(closes[-1])
        if direction == "bullish":
            entry = hi_slope * (n - 1) + hi_int
            stop = lo_slope * (n - 1) + lo_int - gap_end * 0.3
            target = entry + gap_start * 0.75
        elif direction == "bearish":
            entry = lo_slope * (n - 1) + lo_int
            stop = hi_slope * (n - 1) + hi_int + gap_end * 0.3
            target = entry - gap_start * 0.75
        else:
            entry = last_close
            stop = lo_slope * (n - 1) + lo_int
            target = hi_slope * (n - 1) + hi_int

        rr = abs(target - entry) / abs(stop - entry) if abs(stop - entry) > 0 else 0

        patterns.append(ChartPattern(
            kind=kind,
            direction=direction if direction != "neutral" else
                ("bullish" if float(closes[-1]) > float(closes[window_start]) else "bearish"),
            confidence=min(1.0, conf),
            start_idx=window_start,
            end_idx=window_end - 1,
            start_time=times[window_start],
            end_time=times[window_end - 1],
            description=desc,
            key_points=key_pts,
            entry=round(entry, 2),
            stop=round(stop, 2),
            target=round(target, 2),
            risk_reward=round(rr, 2),
        ))

    return _deduplicate_patterns(patterns)


# ─── Helpers ─────────────────────────────────────────────


def _deduplicate_patterns(patterns: list[ChartPattern]) -> list[ChartPattern]:
    """Remove overlapping patterns of the same kind, keeping highest confidence."""
    if not patterns:
        return []
    patterns = sorted(patterns, key=lambda p: -p.confidence)
    kept: list[ChartPattern] = []
    for p in patterns:
        overlap = False
        for existing in kept:
            if p.kind != existing.kind:
                continue
            if p.start_idx <= existing.end_idx and p.end_idx >= existing.start_idx:
                overlap = True
                break
        if not overlap:
            kept.append(p)
    return kept
