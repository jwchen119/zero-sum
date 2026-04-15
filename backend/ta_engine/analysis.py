"""
Master analysis — runs all TA engines and consolidates into a single response.

This is the main entry point: give it OHLCV data, get back everything.
"""

from __future__ import annotations

import numpy as np

from .swings import detect_swings, SwingPoint, swing_highs, swing_lows
from .trendlines import detect_trendlines, Trendline
from .ranges import detect_ranges, detect_breakouts, PriceRange, Breakout
from .patterns import detect_all_patterns, ChartPattern
from .volume_profile import compute_volume_profile
from .signals import generate_signals


def _top_ranges(ranges: list[PriceRange], max_n: int = 3) -> list[PriceRange]:
    """Keep only the most recent / most-touched ranges."""
    return sorted(ranges, key=lambda r: (-r.end_idx, -r.total_touches))[:max_n]


def _top_breakouts(breakouts: list[Breakout], max_n: int = 3) -> list[Breakout]:
    """Prefer confirmed breakouts, then by confidence."""
    confirmed = [b for b in breakouts if b.status == "confirmed"]
    rest = [b for b in breakouts if b.status != "confirmed"]
    result = sorted(confirmed, key=lambda b: -b.confidence)
    result += sorted(rest, key=lambda b: -b.confidence)
    return result[:max_n]


def _top_patterns(patterns: list[ChartPattern], max_n: int = 5) -> list[ChartPattern]:
    """Keep highest-confidence, most-recent patterns; deduplicate overlapping ones."""
    ranked = sorted(patterns, key=lambda p: (-p.confidence, -p.end_idx))
    kept: list[ChartPattern] = []
    for p in ranked:
        # Skip if we already have the same kind overlapping
        overlap = False
        for k in kept:
            if k.kind == p.kind and abs(k.end_idx - p.end_idx) < 40:
                overlap = True
                break
        if not overlap:
            kept.append(p)
        if len(kept) >= max_n:
            break
    return kept


def analyze(
    times: list[str],
    opens: list[float],
    highs_list: list[float],
    lows_list: list[float],
    closes_list: list[float],
    volumes_list: list[float],
) -> dict:
    """
    Run full technical analysis on OHLCV data.

    Parameters are plain lists (from JSON). Returns a dict ready for JSON response.
    """
    n = len(times)
    if n < 50:
        return {"error": "Need at least 50 bars for pattern detection"}

    highs = np.array(highs_list, dtype=float)
    lows = np.array(lows_list, dtype=float)
    closes = np.array(closes_list, dtype=float)
    volumes = np.array(volumes_list, dtype=float)

    # 1. Swing points
    swings = detect_swings(times, highs, lows, closes)

    # 2. Trendlines
    trendlines = detect_trendlines(times, highs, lows, closes, swings)

    # 3. Ranges & breakouts
    ranges = detect_ranges(times, highs, lows, closes, volumes, swings)
    breakouts = detect_breakouts(times, highs, lows, closes, volumes, ranges)

    # 4. Chart patterns
    chart_patterns = detect_all_patterns(times, highs, lows, closes, volumes, swings)

    # 4b. Volume profile
    vol_profile = compute_volume_profile(highs, lows, closes, volumes)

    # 5. Key levels (consolidated from all sources)
    key_levels = _build_key_levels(closes, trendlines, ranges, chart_patterns, n)

    # 6. Active setups (actionable now)
    active_setups = _build_active_setups(
        closes, volumes, trendlines, breakouts, chart_patterns, times, n
    )

    opens_arr = np.array(opens, dtype=float)

    # Attach mini OHLC bars to pattern-based setups
    for s in active_setups:
        si = s.pop("start_idx", None)
        ei = s.pop("end_idx", None)
        if si is not None and ei is not None:
            s["mini_bars"] = _extract_mini_bars(times, opens_arr, highs, lows, closes, si, ei)

    return {
        "bars_analyzed": n,
        "data_range": f"{times[0]} to {times[-1]}",
        "current_price": round(float(closes[-1]), 2),
        "swing_points": [
            {
                "time": s.time,
                "price": round(s.price, 2),
                "kind": s.kind,
                "strength": s.strength,
            }
            for s in swings
            if s.strength >= 2  # only report significant swings
        ],
        "trendlines": {
            "support": [t.to_dict(times, n) for t in trendlines["support"]],
            "resistance": [t.to_dict(times, n) for t in trendlines["resistance"]],
            "channels": [ch.to_dict(times, n) for ch in trendlines.get("channels", [])],
        },
        "ranges": [r.to_dict() for r in _top_ranges(ranges, max_n=3)],
        "breakouts": [
            {**b.to_dict(), "mini_bars": _extract_mini_bars(times, opens_arr, highs, lows, closes, b.range.start_idx, min(n - 1, b.breakout_idx + 10))}
            for b in _top_breakouts(breakouts, max_n=3)
        ],
        "chart_patterns": [
            {**p.to_dict(), "mini_bars": _extract_mini_bars(times, opens_arr, highs, lows, closes, p.start_idx, p.end_idx)}
            for p in _top_patterns(chart_patterns, max_n=5)
        ],
        "key_levels": key_levels,
        "active_setups": active_setups,
        "volume_profile": vol_profile,
        "signals": generate_signals(
            times, opens_arr, highs, lows, closes, volumes,
            swings, trendlines, ranges, breakouts, chart_patterns, vol_profile,
        ),
    }


MAX_MINI_BARS = 32  # cap to keep payloads small


def _extract_mini_bars(
    times: list[str],
    opens: np.ndarray,
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    start_idx: int,
    end_idx: int,
) -> list[dict]:
    """Extract a sampled OHLC slice for a pattern's date range."""
    n = len(times)
    # Add some padding before/after
    pad = max(5, int((end_idx - start_idx) * 0.15))
    s = max(0, start_idx - pad)
    e = min(n, end_idx + pad + 1)
    total = e - s

    if total <= MAX_MINI_BARS:
        step = 1
    else:
        step = max(1, total // MAX_MINI_BARS)

    bars = []
    for i in range(s, e, step):
        # When stepping, aggregate OHLC over the step window
        chunk_end = min(i + step, e)
        bars.append({
            "t": times[i],
            "o": round(float(opens[i]), 2),
            "h": round(float(highs[i:chunk_end].max()), 2),
            "l": round(float(lows[i:chunk_end].min()), 2),
            "c": round(float(closes[chunk_end - 1]), 2),
        })
    return bars


def _build_key_levels(
    closes: np.ndarray,
    trendlines: dict[str, list[Trendline]],
    ranges: list[PriceRange],
    patterns: list[ChartPattern],
    n: int,
) -> list[dict]:
    """Consolidate all price levels from various sources."""
    levels: list[dict] = []
    current = float(closes[-1])

    # From trendlines: current price projection
    for kind in ("support", "resistance"):
        for tl in trendlines[kind]:
            price = tl.price_at(n - 1)
            if price > 0:
                distance_pct = (current - price) / current * 100
                levels.append({
                    "price": round(price, 2),
                    "kind": f"trendline_{kind}",
                    "source": "trendline",
                    "strength": len(tl.touches),
                    "distance_pct": round(distance_pct, 2),
                })

    # From ranges
    for rng in ranges:
        for price, kind in [(rng.high, "resistance"), (rng.low, "support")]:
            distance_pct = (current - price) / current * 100
            levels.append({
                "price": round(price, 2),
                "kind": f"range_{kind}",
                "source": "range",
                "strength": rng.total_touches,
                "distance_pct": round(distance_pct, 2),
            })

    # From pattern key points (necklines, etc.)
    for p in patterns:
        for kp in p.key_points:
            if kp["label"] in ("Neckline", "Head"):
                distance_pct = (current - kp["price"]) / current * 100
                levels.append({
                    "price": kp["price"],
                    "kind": "pattern_level",
                    "source": p.kind,
                    "strength": round(p.confidence * 10),
                    "distance_pct": round(distance_pct, 2),
                })

    # Sort by distance from current price
    levels.sort(key=lambda l: abs(l["distance_pct"]))

    # Deduplicate nearby levels
    kept: list[dict] = []
    for level in levels:
        is_dup = False
        for existing in kept:
            if abs(level["price"] - existing["price"]) / current < 0.01:
                # Keep the one with higher strength
                if level["strength"] > existing["strength"]:
                    kept.remove(existing)
                    kept.append(level)
                is_dup = True
                break
        if not is_dup:
            kept.append(level)

    return sorted(kept, key=lambda l: l["price"])


def _build_active_setups(
    closes: np.ndarray,
    volumes: np.ndarray,
    trendlines: dict[str, list[Trendline]],
    breakouts: list[Breakout],
    patterns: list[ChartPattern],
    times: list[str],
    n: int,
) -> list[dict]:
    """Build actionable trade setups from detected patterns/structures."""
    setups: list[dict] = []
    current = float(closes[-1])

    # Trendline proximity setups
    for tl in trendlines["support"]:
        tl_price = tl.price_at(n - 1)
        if tl_price <= 0:
            continue
        distance_pct = (current - tl_price) / current * 100
        if 0 < distance_pct < 4:  # within 4% above support
            entry = tl_price
            stop = tl_price * 0.97
            target = current + (current - tl_price) * 2
            rr = (target - entry) / (entry - stop) if entry > stop else 0
            setups.append({
                "type": "trendline_bounce",
                "direction": "bullish",
                "confidence": round(min(1.0, 0.3 + len(tl.touches) * 0.1 + (4 - distance_pct) * 0.05), 3),
                "description": f"Price {distance_pct:.1f}% above rising support ({len(tl.touches)} touches)",
                "entry": round(entry, 2),
                "stop": round(stop, 2),
                "target": round(target, 2),
                "risk_reward": round(rr, 2),
                "time": times[-1],
            })

    for tl in trendlines["resistance"]:
        tl_price = tl.price_at(n - 1)
        if tl_price <= 0:
            continue
        distance_pct = (tl_price - current) / current * 100
        if 0 < distance_pct < 4:
            entry = tl_price
            stop = tl_price * 1.03
            target = current - (tl_price - current) * 2
            rr = (entry - target) / (stop - entry) if stop > entry else 0
            setups.append({
                "type": "trendline_rejection",
                "direction": "bearish",
                "confidence": round(min(1.0, 0.3 + len(tl.touches) * 0.1 + (4 - distance_pct) * 0.05), 3),
                "description": f"Price {distance_pct:.1f}% below falling resistance ({len(tl.touches)} touches)",
                "entry": round(entry, 2),
                "stop": round(stop, 2),
                "target": round(target, 2),
                "risk_reward": round(rr, 2),
                "time": times[-1],
            })

    # Breakout setups
    for bo in breakouts:
        if bo.status in ("confirmed", "pending"):
            setups.append({
                "type": f"range_breakout_{bo.direction}",
                "direction": bo.direction,
                "confidence": round(bo.confidence, 3),
                "description": f"{'Bullish' if bo.direction == 'bullish' else 'Bearish'} breakout from "
                              f"${bo.range.low:.0f}-${bo.range.high:.0f} range "
                              f"({bo.range.duration_bars} bars). Vol {bo.volume_ratio:.1f}x avg. "
                              f"Status: {bo.status}.",
                "entry": round(bo.entry, 2),
                "stop": round(bo.stop, 2),
                "target": round(bo.target, 2),
                "risk_reward": round(bo.risk_reward, 2),
                "time": bo.breakout_time,
                "start_idx": bo.range.start_idx,
                "end_idx": min(len(times) - 1, bo.breakout_idx + 10),
            })

    # Chart pattern setups
    for p in patterns:
        if p.confidence >= 0.4 and p.entry is not None:
            setups.append({
                "type": p.kind,
                "direction": p.direction,
                "confidence": round(p.confidence, 3),
                "description": p.description,
                "entry": round(p.entry, 2) if p.entry else None,
                "stop": round(p.stop, 2) if p.stop else None,
                "target": round(p.target, 2) if p.target else None,
                "risk_reward": round(p.risk_reward, 2) if p.risk_reward else None,
                "time": p.end_time,
                "status": p.status,
                "start_idx": p.start_idx,
                "end_idx": p.end_idx,
            })

    # Sort by confidence
    setups.sort(key=lambda s: -s["confidence"])
    return setups
