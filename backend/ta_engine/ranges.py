"""
Horizontal range and breakout detection.

Identifies consolidation ranges (sideways price action) and detects breakouts
from those ranges — one of the most reliable trading signals on long timeframes.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .swings import SwingPoint, swing_highs, swing_lows


@dataclass
class PriceRange:
    high: float
    low: float
    start_idx: int
    end_idx: int
    start_time: str
    end_time: str
    duration_bars: int
    upper_touches: int
    lower_touches: int
    total_touches: int

    def to_dict(self) -> dict:
        return {
            "high": round(self.high, 2),
            "low": round(self.low, 2),
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_bars": self.duration_bars,
            "upper_touches": self.upper_touches,
            "lower_touches": self.lower_touches,
            "width_pct": round((self.high - self.low) / self.low * 100, 2) if self.low > 0 else 0,
        }


@dataclass
class Breakout:
    range: PriceRange
    direction: str  # "bullish" or "bearish"
    breakout_idx: int
    breakout_time: str
    breakout_price: float
    volume_ratio: float  # vs 20-bar average
    confirmed: bool  # held for 3+ bars
    retested: bool  # came back and bounced
    status: str  # "confirmed", "pending", "failed"
    confidence: float  # 0-1
    # Trade levels
    entry: float
    stop: float
    target: float
    risk_reward: float

    def to_dict(self) -> dict:
        return {
            "range": self.range.to_dict(),
            "direction": self.direction,
            "breakout_time": self.breakout_time,
            "breakout_price": round(self.breakout_price, 2),
            "volume_ratio": round(self.volume_ratio, 2),
            "confirmed": self.confirmed,
            "retested": self.retested,
            "status": self.status,
            "confidence": round(self.confidence, 3),
            "entry": round(self.entry, 2),
            "stop": round(self.stop, 2),
            "target": round(self.target, 2),
            "risk_reward": round(self.risk_reward, 2),
        }


def detect_ranges(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    volumes: np.ndarray,
    swings: list[SwingPoint],
    min_duration: int = 30,
    max_width_pct: float = 0.15,
    min_touches: int = 4,
) -> list[PriceRange]:
    """
    Detect horizontal consolidation ranges.

    A range is defined as a zone where:
    - Multiple swing highs cluster near a ceiling price
    - Multiple swing lows cluster near a floor price
    - The range width (ceiling - floor) / floor < max_width_pct
    - Duration is at least min_duration bars
    """
    sh = swing_highs(swings)
    sl = swing_lows(swings)

    if len(sh) < 2 or len(sl) < 2:
        return []

    ranges: list[PriceRange] = []

    # Cluster swing highs into potential ceilings
    hi_prices = np.array([s.price for s in sh])
    lo_prices = np.array([s.price for s in sl])

    # Try different window approaches: sliding window over the data
    n = len(times)
    # Step through the data in windows of varying size
    for window_size in [60, 100, 150, 200, 300]:
        if n < window_size:
            continue
        step = window_size // 3
        for start in range(0, n - window_size + 1, step):
            end = start + window_size

            # Get swings within this window
            window_highs = [s for s in sh if start <= s.index < end]
            window_lows = [s for s in sl if start <= s.index < end]

            if len(window_highs) < 2 or len(window_lows) < 2:
                continue

            # Find the most common ceiling level (cluster swing highs)
            ceiling_candidates = _cluster_prices(
                [s.price for s in window_highs], tolerance_pct=0.025
            )
            floor_candidates = _cluster_prices(
                [s.price for s in window_lows], tolerance_pct=0.025
            )

            for ceiling_price, ceiling_count in ceiling_candidates:
                for floor_price, floor_count in floor_candidates:
                    if ceiling_price <= floor_price:
                        continue

                    width_pct = (ceiling_price - floor_price) / floor_price
                    if width_pct > max_width_pct:
                        continue

                    total = ceiling_count + floor_count
                    if total < min_touches:
                        continue

                    # Verify the range: most price action should be contained
                    tolerance = (ceiling_price - floor_price) * 0.1
                    contained = 0
                    for idx in range(start, end):
                        if lows[idx] >= floor_price - tolerance and highs[idx] <= ceiling_price + tolerance:
                            contained += 1
                    containment = contained / (end - start)
                    if containment < 0.75:
                        continue

                    duration = end - start
                    if duration < min_duration:
                        continue

                    ranges.append(PriceRange(
                        high=ceiling_price,
                        low=floor_price,
                        start_idx=start,
                        end_idx=end - 1,
                        start_time=times[start],
                        end_time=times[end - 1],
                        duration_bars=duration,
                        upper_touches=ceiling_count,
                        lower_touches=floor_count,
                        total_touches=total,
                    ))

    # Deduplicate overlapping ranges (keep the one with more touches)
    ranges = _deduplicate_ranges(ranges)
    return sorted(ranges, key=lambda r: -r.total_touches)


def detect_breakouts(
    times: list[str],
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    volumes: np.ndarray,
    ranges: list[PriceRange],
    lookback: int = 20,
) -> list[Breakout]:
    """
    Check each detected range for a breakout.

    A breakout = price closes above the range ceiling (bullish)
    or below the range floor (bearish) after the range ends.
    """
    n = len(times)
    breakouts: list[Breakout] = []

    for rng in ranges:
        # Look at bars after the range (and also the last portion of the range)
        scan_start = max(0, rng.end_idx - 10)
        range_height = rng.high - rng.low

        # Average volume in the range for comparison
        range_vols = volumes[rng.start_idx:rng.end_idx + 1]
        avg_vol = float(np.mean(range_vols)) if len(range_vols) > 0 else 1.0

        for i in range(scan_start, min(n, rng.end_idx + lookback + 1)):
            # Bullish breakout: close above ceiling
            if closes[i] > rng.high * 1.005:
                vol_ratio = float(volumes[i]) / avg_vol if avg_vol > 0 else 1.0

                # Check confirmation (next 3 bars stay above)
                bars_after = min(3, n - i - 1)
                confirmed = bars_after >= 1  # Need at least 1 bar to confirm
                for j in range(1, bars_after + 1):
                    if closes[i + j] < rng.high * 0.995:
                        confirmed = False
                        break

                # Check retest
                retested = False
                for j in range(1, min(20, n - i)):
                    if lows[i + j] <= rng.high * 1.01 and closes[i + j] > rng.high:
                        retested = True
                        break

                # Check if it failed (price fell back inside range)
                failed = False
                for j in range(1, min(10, n - i)):
                    if closes[i + j] < rng.low + range_height * 0.5:
                        failed = True
                        break

                status = "failed" if failed else ("confirmed" if confirmed else "pending")

                # Confidence
                conf = 0.3
                if confirmed:
                    conf += 0.25
                if vol_ratio > 1.5:
                    conf += 0.15
                if retested:
                    conf += 0.15
                conf += min(0.15, rng.duration_bars / 300 * 0.15)

                entry = float(closes[i])
                stop = rng.low - range_height * 0.1
                target = entry + range_height  # measured move
                rr = (target - entry) / (entry - stop) if entry > stop else 0

                breakouts.append(Breakout(
                    range=rng,
                    direction="bullish",
                    breakout_idx=i,
                    breakout_time=times[i],
                    breakout_price=float(closes[i]),
                    volume_ratio=vol_ratio,
                    confirmed=confirmed,
                    retested=retested,
                    status=status,
                    confidence=min(1.0, conf),
                    entry=entry,
                    stop=stop,
                    target=target,
                    risk_reward=rr,
                ))
                break  # only report first breakout per range

            # Bearish breakout: close below floor
            if closes[i] < rng.low * 0.995:
                vol_ratio = float(volumes[i]) / avg_vol if avg_vol > 0 else 1.0

                bars_after = min(3, n - i - 1)
                confirmed = bars_after >= 1  # Need at least 1 bar to confirm
                for j in range(1, bars_after + 1):
                    if closes[i + j] > rng.low * 1.005:
                        confirmed = False
                        break

                retested = False
                for j in range(1, min(20, n - i)):
                    if highs[i + j] >= rng.low * 0.99 and closes[i + j] < rng.low:
                        retested = True
                        break

                failed = False
                for j in range(1, min(10, n - i)):
                    if closes[i + j] > rng.low + range_height * 0.5:
                        failed = True
                        break

                status = "failed" if failed else ("confirmed" if confirmed else "pending")

                conf = 0.3
                if confirmed:
                    conf += 0.25
                if vol_ratio > 1.5:
                    conf += 0.15
                if retested:
                    conf += 0.15
                conf += min(0.15, rng.duration_bars / 300 * 0.15)

                entry = float(closes[i])
                stop = rng.high + range_height * 0.1
                target = entry - range_height
                rr = (entry - target) / (stop - entry) if stop > entry else 0

                breakouts.append(Breakout(
                    range=rng,
                    direction="bearish",
                    breakout_idx=i,
                    breakout_time=times[i],
                    breakout_price=float(closes[i]),
                    volume_ratio=vol_ratio,
                    confirmed=confirmed,
                    retested=retested,
                    status=status,
                    confidence=min(1.0, conf),
                    entry=entry,
                    stop=stop,
                    target=target,
                    risk_reward=rr,
                ))
                break

    return breakouts


def _cluster_prices(prices: list[float], tolerance_pct: float = 0.025) -> list[tuple[float, int]]:
    """Cluster nearby prices, return (avg_price, count) sorted by count desc."""
    if not prices:
        return []
    sorted_p = sorted(prices)
    clusters: list[list[float]] = [[sorted_p[0]]]
    for p in sorted_p[1:]:
        cluster_avg = sum(clusters[-1]) / len(clusters[-1])
        if abs(p - cluster_avg) / cluster_avg < tolerance_pct:
            clusters[-1].append(p)
        else:
            clusters.append([p])

    result = [(sum(c) / len(c), len(c)) for c in clusters if len(c) >= 2]
    return sorted(result, key=lambda x: -x[1])


def _deduplicate_ranges(ranges: list[PriceRange]) -> list[PriceRange]:
    """Remove overlapping ranges, keeping higher-touch ones."""
    if not ranges:
        return []
    ranges = sorted(ranges, key=lambda r: -r.total_touches)
    kept: list[PriceRange] = []
    for rng in ranges:
        overlap = False
        for existing in kept:
            # Check overlap in both price and time
            price_overlap = (rng.low <= existing.high and rng.high >= existing.low)
            time_overlap = (rng.start_idx <= existing.end_idx and rng.end_idx >= existing.start_idx)
            if price_overlap and time_overlap:
                overlap = True
                break
        if not overlap:
            kept.append(rng)
    return kept
