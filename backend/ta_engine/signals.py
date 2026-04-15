"""
Trading signal detection — produces curated, actionable signals.

Phase 1: Trend classifier + momentum snapshot (market context)
Phase 2: Discrete signal events (trendline bounce, breakout, divergence, etc.)
Phase 3: Scoring + confluence (multiple signals aligning = high conviction)
Phase 4: Setup builder (entry/stop/target/R:R)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

from .swings import SwingPoint, swing_highs, swing_lows
from .trendlines import Trendline
from .ranges import PriceRange, Breakout
from .patterns import ChartPattern
from .volume_profile import compute_volume_profile


# ────────────────────────────────────────────────────────────────────
# Indicator helpers (pure numpy, no external deps)
# ────────────────────────────────────────────────────────────────────

def _sma(data: np.ndarray, period: int) -> np.ndarray:
    """Simple moving average. Returns NaN for first (period-1) bars."""
    out = np.full(len(data), np.nan)
    if len(data) < period:
        return out
    cumsum = np.cumsum(data)
    cumsum[period:] = cumsum[period:] - cumsum[:-period]
    out[period - 1:] = cumsum[period - 1:] / period
    return out


def _ema(data: np.ndarray, period: int) -> np.ndarray:
    """Exponential moving average."""
    out = np.full(len(data), np.nan)
    if len(data) < period:
        return out
    k = 2.0 / (period + 1)
    out[period - 1] = np.mean(data[:period])
    for i in range(period, len(data)):
        out[i] = data[i] * k + out[i - 1] * (1 - k)
    return out


def _rsi(closes: np.ndarray, period: int = 14) -> np.ndarray:
    """Wilder's RSI."""
    out = np.full(len(closes), np.nan)
    if len(closes) < period + 1:
        return out
    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    if avg_loss == 0:
        out[period] = 100.0
    else:
        out[period] = 100.0 - 100.0 / (1.0 + avg_gain / avg_loss)
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        if avg_loss == 0:
            out[i + 1] = 100.0
        else:
            out[i + 1] = 100.0 - 100.0 / (1.0 + avg_gain / avg_loss)
    return out


def _macd(closes: np.ndarray, fast: int = 12, slow: int = 26, sig: int = 9):
    """Returns (macd_line, signal_line, histogram) arrays."""
    ema_fast = _ema(closes, fast)
    ema_slow = _ema(closes, slow)
    macd_line = ema_fast - ema_slow
    signal_line = np.full(len(closes), np.nan)
    # EMA of macd_line starting from where both EMAs are valid
    start = slow - 1
    valid = macd_line[start:]
    if len(valid) >= sig:
        sig_ema = np.full(len(valid), np.nan)
        sig_ema[sig - 1] = np.nanmean(valid[:sig])
        k = 2.0 / (sig + 1)
        for i in range(sig, len(valid)):
            if not np.isnan(valid[i]) and not np.isnan(sig_ema[i - 1]):
                sig_ema[i] = valid[i] * k + sig_ema[i - 1] * (1 - k)
        signal_line[start:] = sig_ema
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def _stochastic(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
                k_period: int = 14, d_period: int = 3):
    """Returns (%K, %D) arrays."""
    n = len(closes)
    k_out = np.full(n, np.nan)
    for i in range(k_period - 1, n):
        lo = np.min(lows[i - k_period + 1:i + 1])
        hi = np.max(highs[i - k_period + 1:i + 1])
        if hi - lo > 0:
            k_out[i] = (closes[i] - lo) / (hi - lo) * 100
        else:
            k_out[i] = 50.0
    d_out = _sma(k_out, d_period)
    return k_out, d_out


def _adx(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
         period: int = 14) -> np.ndarray:
    """Average Directional Index (Wilder)."""
    n = len(closes)
    out = np.full(n, np.nan)
    if n < period * 2 + 1:
        return out

    tr = np.zeros(n)
    plus_dm = np.zeros(n)
    minus_dm = np.zeros(n)
    for i in range(1, n):
        h_diff = highs[i] - highs[i - 1]
        l_diff = lows[i - 1] - lows[i]
        tr[i] = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
        plus_dm[i] = h_diff if (h_diff > l_diff and h_diff > 0) else 0.0
        minus_dm[i] = l_diff if (l_diff > h_diff and l_diff > 0) else 0.0

    # Wilder smoothing
    atr = np.zeros(n)
    plus_di_arr = np.zeros(n)
    minus_di_arr = np.zeros(n)
    atr[period] = np.sum(tr[1:period + 1])
    sm_plus = np.sum(plus_dm[1:period + 1])
    sm_minus = np.sum(minus_dm[1:period + 1])
    if atr[period] > 0:
        plus_di_arr[period] = 100 * sm_plus / atr[period]
        minus_di_arr[period] = 100 * sm_minus / atr[period]

    for i in range(period + 1, n):
        atr[i] = atr[i - 1] - atr[i - 1] / period + tr[i]
        sm_plus = sm_plus - sm_plus / period + plus_dm[i]
        sm_minus = sm_minus - sm_minus / period + minus_dm[i]
        if atr[i] > 0:
            plus_di_arr[i] = 100 * sm_plus / atr[i]
            minus_di_arr[i] = 100 * sm_minus / atr[i]

    dx = np.zeros(n)
    for i in range(period, n):
        denom = plus_di_arr[i] + minus_di_arr[i]
        if denom > 0:
            dx[i] = 100 * abs(plus_di_arr[i] - minus_di_arr[i]) / denom

    # ADX = Wilder-smoothed DX
    out[period * 2] = np.mean(dx[period:period * 2 + 1])
    for i in range(period * 2 + 1, n):
        out[i] = (out[i - 1] * (period - 1) + dx[i]) / period
    return out


def _atr(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
         period: int = 14) -> np.ndarray:
    """Average True Range."""
    n = len(closes)
    tr = np.zeros(n)
    for i in range(1, n):
        tr[i] = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
    out = np.full(n, np.nan)
    if n < period + 1:
        return out
    out[period] = np.mean(tr[1:period + 1])
    for i in range(period + 1, n):
        out[i] = (out[i - 1] * (period - 1) + tr[i]) / period
    return out


def _roc(closes: np.ndarray, period: int = 20) -> np.ndarray:
    """Rate of Change (%)."""
    out = np.full(len(closes), np.nan)
    for i in range(period, len(closes)):
        if closes[i - period] != 0:
            out[i] = (closes[i] / closes[i - period] - 1) * 100
    return out


def _vol_sma(volumes: np.ndarray, period: int = 20) -> np.ndarray:
    return _sma(volumes, period)


# ────────────────────────────────────────────────────────────────────
# Phase 1: Trend context & momentum snapshot
# ────────────────────────────────────────────────────────────────────

@dataclass
class TrendContext:
    """Current market regime classification."""
    trend: str  # strong_uptrend | uptrend | neutral | downtrend | strong_downtrend
    adx: float
    adx_trending: bool  # ADX > 25
    price: float
    sma50: float
    sma200: float
    price_vs_sma50_pct: float
    price_vs_sma200_pct: float
    sma50_vs_sma200: str  # "golden_cross" | "death_cross"
    sma50_slope: float    # 10-bar slope direction of SMA50

    def to_dict(self) -> dict:
        return {
            "trend": self.trend,
            "adx": round(self.adx, 1),
            "adx_trending": self.adx_trending,
            "price": round(self.price, 2),
            "sma50": round(self.sma50, 2),
            "sma200": round(self.sma200, 2),
            "price_vs_sma50_pct": round(self.price_vs_sma50_pct, 1),
            "price_vs_sma200_pct": round(self.price_vs_sma200_pct, 1),
            "sma_cross": self.sma50_vs_sma200,
            "sma50_slope": round(self.sma50_slope, 4),
        }


@dataclass
class MomentumSnapshot:
    """Current state of all oscillators."""
    rsi: float
    rsi_zone: str  # "overbought" | "oversold" | "neutral"
    rsi_divergence: str | None  # "bullish" | "bearish" | None
    macd_histogram: float
    macd_direction: str  # "expanding_bull" | "contracting_bull" | "expanding_bear" | "contracting_bear"
    macd_cross: str | None  # "bullish_cross" | "bearish_cross" | None (within last 3 bars)
    stoch_k: float
    stoch_d: float
    stoch_zone: str  # "overbought" | "oversold" | "neutral"
    stoch_cross: str | None  # "bullish_cross" | "bearish_cross" | None (within last 3 bars)
    roc_20: float
    atr_14: float
    atr_pct: float  # ATR as % of price

    def to_dict(self) -> dict:
        return {
            "rsi": round(self.rsi, 1),
            "rsi_zone": self.rsi_zone,
            "rsi_divergence": self.rsi_divergence,
            "macd_histogram": round(self.macd_histogram, 3),
            "macd_direction": self.macd_direction,
            "macd_cross": self.macd_cross,
            "stoch_k": round(self.stoch_k, 1),
            "stoch_d": round(self.stoch_d, 1),
            "stoch_zone": self.stoch_zone,
            "stoch_cross": self.stoch_cross,
            "roc_20": round(self.roc_20, 1),
            "atr_14": round(self.atr_14, 2),
            "atr_pct": round(self.atr_pct, 1),
        }


def compute_trend_context(
    highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
) -> TrendContext:
    """Classify current trend regime."""
    n = len(closes)
    price = float(closes[-1])
    sma50 = _sma(closes, 50)
    sma200 = _sma(closes, 200)
    adx_arr = _adx(highs, lows, closes, 14)

    s50 = float(sma50[-1]) if not np.isnan(sma50[-1]) else price
    s200 = float(sma200[-1]) if not np.isnan(sma200[-1]) else price
    adx_val = float(adx_arr[-1]) if not np.isnan(adx_arr[-1]) else 0.0

    pct50 = (price / s50 - 1) * 100 if s50 > 0 else 0.0
    pct200 = (price / s200 - 1) * 100 if s200 > 0 else 0.0

    cross = "golden_cross" if s50 > s200 else "death_cross"

    # SMA50 slope over last 10 bars
    if n >= 60 and not np.isnan(sma50[-10]):
        sma50_slope = (float(sma50[-1]) - float(sma50[-10])) / 10
    else:
        sma50_slope = 0.0

    # Classify
    above_50 = price > s50
    above_200 = price > s200
    golden = s50 > s200

    if above_50 and above_200 and golden and adx_val > 25:
        trend = "strong_uptrend"
    elif above_50 and above_200:
        trend = "uptrend"
    elif not above_50 and not above_200 and not golden and adx_val > 25:
        trend = "strong_downtrend"
    elif not above_50 and not above_200:
        trend = "downtrend"
    else:
        trend = "neutral"

    return TrendContext(
        trend=trend,
        adx=adx_val,
        adx_trending=adx_val > 25,
        price=price,
        sma50=s50,
        sma200=s200,
        price_vs_sma50_pct=pct50,
        price_vs_sma200_pct=pct200,
        sma50_vs_sma200=cross,
        sma50_slope=sma50_slope,
    )


def compute_momentum(
    highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
    swings: list[SwingPoint],
) -> MomentumSnapshot:
    """Snapshot all oscillators at the current bar."""
    n = len(closes)
    price = float(closes[-1])

    # RSI
    rsi_arr = _rsi(closes, 14)
    rsi_val = float(rsi_arr[-1]) if not np.isnan(rsi_arr[-1]) else 50.0
    rsi_zone = "overbought" if rsi_val >= 70 else "oversold" if rsi_val <= 30 else "neutral"

    # RSI divergence — look at last two swing lows/highs vs RSI at those points
    rsi_div = _detect_rsi_divergence(closes, rsi_arr, swings)

    # MACD
    macd_line, signal_line, histogram = _macd(closes)
    hist_val = float(histogram[-1]) if not np.isnan(histogram[-1]) else 0.0
    hist_prev = float(histogram[-2]) if n >= 2 and not np.isnan(histogram[-2]) else 0.0

    if hist_val > 0:
        macd_dir = "expanding_bull" if hist_val > hist_prev else "contracting_bull"
    else:
        macd_dir = "expanding_bear" if hist_val < hist_prev else "contracting_bear"

    # MACD cross (within last 3 bars)
    macd_cross = None
    for i in range(max(0, n - 4), n - 1):
        if not np.isnan(macd_line[i]) and not np.isnan(signal_line[i]) and \
           not np.isnan(macd_line[i + 1]) and not np.isnan(signal_line[i + 1]):
            if macd_line[i] <= signal_line[i] and macd_line[i + 1] > signal_line[i + 1]:
                macd_cross = "bullish_cross"
            elif macd_line[i] >= signal_line[i] and macd_line[i + 1] < signal_line[i + 1]:
                macd_cross = "bearish_cross"

    # Stochastic
    stoch_k, stoch_d = _stochastic(highs, lows, closes)
    k_val = float(stoch_k[-1]) if not np.isnan(stoch_k[-1]) else 50.0
    d_val = float(stoch_d[-1]) if not np.isnan(stoch_d[-1]) else 50.0
    stoch_zone = "overbought" if k_val >= 80 else "oversold" if k_val <= 20 else "neutral"

    stoch_cross = None
    for i in range(max(0, n - 4), n - 1):
        if not np.isnan(stoch_k[i]) and not np.isnan(stoch_d[i]) and \
           not np.isnan(stoch_k[i + 1]) and not np.isnan(stoch_d[i + 1]):
            if stoch_k[i] <= stoch_d[i] and stoch_k[i + 1] > stoch_d[i + 1]:
                stoch_cross = "bullish_cross"
            elif stoch_k[i] >= stoch_d[i] and stoch_k[i + 1] < stoch_d[i + 1]:
                stoch_cross = "bearish_cross"

    # ROC
    roc_arr = _roc(closes, 20)
    roc_val = float(roc_arr[-1]) if not np.isnan(roc_arr[-1]) else 0.0

    # ATR
    atr_arr = _atr(highs, lows, closes, 14)
    atr_val = float(atr_arr[-1]) if not np.isnan(atr_arr[-1]) else 0.0

    return MomentumSnapshot(
        rsi=rsi_val,
        rsi_zone=rsi_zone,
        rsi_divergence=rsi_div,
        macd_histogram=hist_val,
        macd_direction=macd_dir,
        macd_cross=macd_cross,
        stoch_k=k_val,
        stoch_d=d_val,
        stoch_zone=stoch_zone,
        stoch_cross=stoch_cross,
        roc_20=roc_val,
        atr_14=atr_val,
        atr_pct=round(atr_val / price * 100, 1) if price > 0 else 0.0,
    )


def _detect_rsi_divergence(
    closes: np.ndarray, rsi_arr: np.ndarray, swings: list[SwingPoint],
) -> str | None:
    """Check for bullish/bearish RSI divergence at recent swing points."""
    n = len(closes)
    # Look at the two most recent swing lows for bullish div
    recent_lows = [s for s in swings if s.kind == "low" and s.index >= n - 100 and s.index < n - 2]
    recent_lows.sort(key=lambda s: s.index)
    if len(recent_lows) >= 2:
        l1, l2 = recent_lows[-2], recent_lows[-1]
        if not np.isnan(rsi_arr[l1.index]) and not np.isnan(rsi_arr[l2.index]):
            # Bullish: price makes lower low, RSI makes higher low
            if l2.price < l1.price and rsi_arr[l2.index] > rsi_arr[l1.index]:
                return "bullish"

    # Two most recent swing highs for bearish div
    recent_highs = [s for s in swings if s.kind == "high" and s.index >= n - 100 and s.index < n - 2]
    recent_highs.sort(key=lambda s: s.index)
    if len(recent_highs) >= 2:
        h1, h2 = recent_highs[-2], recent_highs[-1]
        if not np.isnan(rsi_arr[h1.index]) and not np.isnan(rsi_arr[h2.index]):
            # Bearish: price makes higher high, RSI makes lower high
            if h2.price > h1.price and rsi_arr[h2.index] < rsi_arr[h1.index]:
                return "bearish"

    return None


# ────────────────────────────────────────────────────────────────────
# Phase 2: Signal detection
# ────────────────────────────────────────────────────────────────────

@dataclass
class Signal:
    """A discrete trading signal event."""
    kind: str           # e.g. "trendline_bounce", "breakout_confirmed", etc.
    direction: str      # "bullish" | "bearish"
    bar_index: int      # when it occurred
    time: str
    price: float
    strength: float     # 0–1, raw signal quality
    description: str
    source: str         # e.g. "trendline", "range", "momentum", "pattern", "volume"
    details: dict = field(default_factory=dict)  # signal-specific metadata

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "direction": self.direction,
            "time": self.time,
            "price": round(self.price, 2),
            "strength": round(self.strength, 2),
            "description": self.description,
            "source": self.source,
            "details": self.details,
        }


def detect_trendline_signals(
    times: list[str],
    highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
    trendlines: dict[str, list[Trendline]],
    lookback: int = 10,
) -> list[Signal]:
    """Detect trendline bounces and breaks within recent bars."""
    signals: list[Signal] = []
    n = len(closes)
    start = max(0, n - lookback)

    for tl in trendlines.get("support", []):
        for i in range(start, n):
            tl_price = tl.price_at(i)
            if tl_price <= 0:
                continue
            pct_from_tl = (lows[i] - tl_price) / tl_price * 100

            # Bounce: low touched trendline (within 1.5%) and closed above it
            if -1.5 <= pct_from_tl <= 2.0 and closes[i] > tl_price:
                strength = min(1.0, len(tl.touches) / 8) * (0.7 + 0.3 * (1 - abs(pct_from_tl) / 2))
                signals.append(Signal(
                    kind="trendline_bounce",
                    direction="bullish",
                    bar_index=i, time=times[i], price=float(closes[i]),
                    strength=strength,
                    description=f"Bounce off support trendline ({len(tl.touches)} touches)",
                    source="trendline",
                    details={"touches": len(tl.touches), "tl_price": round(tl_price, 2),
                             "distance_pct": round(pct_from_tl, 2)},
                ))

            # Break: closed below support trendline by > 1.5%
            if pct_from_tl < -1.5 and i > 0 and (lows[i - 1] - tl.price_at(i - 1)) / tl.price_at(i - 1) * 100 > -0.5:
                strength = min(1.0, len(tl.touches) / 8) * 0.8
                signals.append(Signal(
                    kind="trendline_break",
                    direction="bearish",
                    bar_index=i, time=times[i], price=float(closes[i]),
                    strength=strength,
                    description=f"Broke below support trendline ({len(tl.touches)} touches)",
                    source="trendline",
                    details={"touches": len(tl.touches), "tl_price": round(tl_price, 2)},
                ))

    for tl in trendlines.get("resistance", []):
        for i in range(start, n):
            tl_price = tl.price_at(i)
            if tl_price <= 0:
                continue
            pct_from_tl = (highs[i] - tl_price) / tl_price * 100

            # Rejection: high touched resistance and closed below
            if -2.0 <= pct_from_tl <= 1.5 and closes[i] < tl_price:
                strength = min(1.0, len(tl.touches) / 8) * (0.7 + 0.3 * (1 - abs(pct_from_tl) / 2))
                signals.append(Signal(
                    kind="trendline_rejection",
                    direction="bearish",
                    bar_index=i, time=times[i], price=float(closes[i]),
                    strength=strength,
                    description=f"Rejected at resistance trendline ({len(tl.touches)} touches)",
                    source="trendline",
                    details={"touches": len(tl.touches), "tl_price": round(tl_price, 2)},
                ))

            # Breakout above resistance
            if pct_from_tl > 1.5 and i > 0:
                prev_pct = (highs[i - 1] - tl.price_at(i - 1)) / tl.price_at(i - 1) * 100
                if prev_pct < 0.5:
                    strength = min(1.0, len(tl.touches) / 8) * 0.8
                    signals.append(Signal(
                        kind="trendline_breakout",
                        direction="bullish",
                        bar_index=i, time=times[i], price=float(closes[i]),
                        strength=strength,
                        description=f"Broke above resistance trendline ({len(tl.touches)} touches)",
                        source="trendline",
                        details={"touches": len(tl.touches), "tl_price": round(tl_price, 2)},
                    ))

    return signals


def detect_range_signals(
    times: list[str],
    highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
    volumes: np.ndarray,
    ranges: list[PriceRange],
    breakouts: list[Breakout],
    lookback: int = 10,
) -> list[Signal]:
    """Detect range bounces and active breakouts."""
    signals: list[Signal] = []
    n = len(closes)
    start = max(0, n - lookback)
    avg_vol = _vol_sma(volumes, 20)

    for rng in ranges:
        for i in range(start, n):
            price = float(closes[i])
            # Bounce off range support
            if abs(lows[i] - rng.low) / rng.low * 100 < 1.5 and price > rng.low:
                strength = min(1.0, rng.total_touches / 8) * 0.7
                signals.append(Signal(
                    kind="range_bounce_support",
                    direction="bullish",
                    bar_index=i, time=times[i], price=price,
                    strength=strength,
                    description=f"Bounce off range support ${rng.low:.0f}",
                    source="range",
                    details={"range_low": rng.low, "range_high": rng.high},
                ))

            # Rejection at range resistance
            if abs(highs[i] - rng.high) / rng.high * 100 < 1.5 and price < rng.high:
                strength = min(1.0, rng.total_touches / 8) * 0.7
                signals.append(Signal(
                    kind="range_rejection",
                    direction="bearish",
                    bar_index=i, time=times[i], price=price,
                    strength=strength,
                    description=f"Rejected at range resistance ${rng.high:.0f}",
                    source="range",
                    details={"range_low": rng.low, "range_high": rng.high},
                ))

    # Breakouts that are recent and confirmed
    for bo in breakouts:
        bo_idx = bo.breakout_idx
        if bo_idx >= start and bo.status == "confirmed":
            vol_ratio = bo.volume_ratio
            strength = min(1.0, bo.confidence) * min(1.0, vol_ratio / 3)
            signals.append(Signal(
                kind="breakout_confirmed",
                direction=bo.direction,
                bar_index=bo_idx, time=bo.breakout_time,
                price=bo.breakout_price,
                strength=strength,
                description=f"Confirmed {bo.direction} breakout from ${bo.range.low:.0f}-${bo.range.high:.0f} range",
                source="range",
                details={"volume_ratio": round(vol_ratio, 1),
                         "entry": bo.entry, "stop": bo.stop, "target": bo.target},
            ))

    return signals


def detect_ma_signals(
    times: list[str], closes: np.ndarray, lookback: int = 10,
) -> list[Signal]:
    """Moving average cross and reclaim signals."""
    signals: list[Signal] = []
    n = len(closes)
    start = max(0, n - lookback)
    sma50 = _sma(closes, 50)
    sma200 = _sma(closes, 200)

    for i in range(start, n):
        if i < 1 or np.isnan(sma50[i]) or np.isnan(sma200[i]):
            continue

        # Golden cross
        if sma50[i - 1] <= sma200[i - 1] and sma50[i] > sma200[i]:
            signals.append(Signal(
                kind="golden_cross", direction="bullish",
                bar_index=i, time=times[i], price=float(closes[i]),
                strength=0.75,
                description="SMA50 crossed above SMA200 (Golden Cross)",
                source="moving_average",
            ))

        # Death cross
        if sma50[i - 1] >= sma200[i - 1] and sma50[i] < sma200[i]:
            signals.append(Signal(
                kind="death_cross", direction="bearish",
                bar_index=i, time=times[i], price=float(closes[i]),
                strength=0.75,
                description="SMA50 crossed below SMA200 (Death Cross)",
                source="moving_average",
            ))

        # Price reclaim SMA50 from below
        if closes[i - 1] < sma50[i - 1] and closes[i] > sma50[i]:
            signals.append(Signal(
                kind="sma50_reclaim", direction="bullish",
                bar_index=i, time=times[i], price=float(closes[i]),
                strength=0.5,
                description=f"Price reclaimed SMA50 (${sma50[i]:.0f})",
                source="moving_average",
                details={"sma50": round(float(sma50[i]), 2)},
            ))

        # Price lost SMA50
        if closes[i - 1] > sma50[i - 1] and closes[i] < sma50[i]:
            signals.append(Signal(
                kind="sma50_lost", direction="bearish",
                bar_index=i, time=times[i], price=float(closes[i]),
                strength=0.5,
                description=f"Price lost SMA50 (${sma50[i]:.0f})",
                source="moving_average",
                details={"sma50": round(float(sma50[i]), 2)},
            ))

        # Price rejected at SMA200 from below (needs highs data)
        # TODO: add highs parameter to detect_ma_signals to enable this signal

    return signals


def detect_momentum_signals(
    times: list[str],
    highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
    swings: list[SwingPoint],
    lookback: int = 10,
) -> list[Signal]:
    """RSI divergence, MACD cross, stochastic cross signals."""
    signals: list[Signal] = []
    n = len(closes)
    start = max(0, n - lookback)

    rsi_arr = _rsi(closes, 14)
    macd_line, signal_line, histogram = _macd(closes)
    stoch_k, stoch_d = _stochastic(highs, lows, closes)

    for i in range(start, n):
        if i < 1:
            continue

        # MACD bullish cross
        if not np.isnan(macd_line[i]) and not np.isnan(signal_line[i]) and \
           not np.isnan(macd_line[i - 1]) and not np.isnan(signal_line[i - 1]):
            if macd_line[i - 1] <= signal_line[i - 1] and macd_line[i] > signal_line[i]:
                below_zero = macd_line[i] < 0  # more significant when crossing below zero line
                signals.append(Signal(
                    kind="macd_bullish_cross", direction="bullish",
                    bar_index=i, time=times[i], price=float(closes[i]),
                    strength=0.6 if below_zero else 0.45,
                    description=f"MACD bullish cross" + (" (below zero — stronger)" if below_zero else ""),
                    source="momentum",
                ))
            elif macd_line[i - 1] >= signal_line[i - 1] and macd_line[i] < signal_line[i]:
                above_zero = macd_line[i] > 0
                signals.append(Signal(
                    kind="macd_bearish_cross", direction="bearish",
                    bar_index=i, time=times[i], price=float(closes[i]),
                    strength=0.6 if above_zero else 0.45,
                    description=f"MACD bearish cross" + (" (above zero — stronger)" if above_zero else ""),
                    source="momentum",
                ))

        # Stochastic cross in extreme zones
        if not np.isnan(stoch_k[i]) and not np.isnan(stoch_d[i]) and \
           not np.isnan(stoch_k[i - 1]) and not np.isnan(stoch_d[i - 1]):
            if stoch_k[i - 1] <= stoch_d[i - 1] and stoch_k[i] > stoch_d[i] and stoch_k[i] < 30:
                signals.append(Signal(
                    kind="stoch_bullish_cross", direction="bullish",
                    bar_index=i, time=times[i], price=float(closes[i]),
                    strength=0.55,
                    description=f"Stochastic bullish cross in oversold zone (%K={stoch_k[i]:.0f})",
                    source="momentum",
                ))
            elif stoch_k[i - 1] >= stoch_d[i - 1] and stoch_k[i] < stoch_d[i] and stoch_k[i] > 70:
                signals.append(Signal(
                    kind="stoch_bearish_cross", direction="bearish",
                    bar_index=i, time=times[i], price=float(closes[i]),
                    strength=0.55,
                    description=f"Stochastic bearish cross in overbought zone (%K={stoch_k[i]:.0f})",
                    source="momentum",
                ))

        # RSI extreme recovery
        if not np.isnan(rsi_arr[i]) and not np.isnan(rsi_arr[i - 1]):
            if rsi_arr[i - 1] < 30 and rsi_arr[i] >= 30:
                signals.append(Signal(
                    kind="rsi_recovery", direction="bullish",
                    bar_index=i, time=times[i], price=float(closes[i]),
                    strength=0.5,
                    description=f"RSI recovered from oversold ({rsi_arr[i - 1]:.0f} → {rsi_arr[i]:.0f})",
                    source="momentum",
                ))
            elif rsi_arr[i - 1] > 70 and rsi_arr[i] <= 70:
                signals.append(Signal(
                    kind="rsi_rejection", direction="bearish",
                    bar_index=i, time=times[i], price=float(closes[i]),
                    strength=0.5,
                    description=f"RSI fell from overbought ({rsi_arr[i - 1]:.0f} → {rsi_arr[i]:.0f})",
                    source="momentum",
                ))

    # RSI divergence (non-bar-specific, structural)
    rsi_div = _detect_rsi_divergence(closes, rsi_arr, swings)
    if rsi_div:
        signals.append(Signal(
            kind=f"rsi_divergence_{rsi_div}", direction=rsi_div.split("_")[0] if "_" in rsi_div else rsi_div,
            bar_index=n - 1, time=times[-1], price=float(closes[-1]),
            strength=0.7,
            description=f"RSI {rsi_div} divergence detected",
            source="momentum",
        ))

    return signals


def detect_volume_signals(
    times: list[str],
    highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
    volumes: np.ndarray,
    vol_profile: dict | None,
    lookback: int = 10,
) -> list[Signal]:
    """Volume-based signals: climactic volume, dry-up, POC proximity."""
    signals: list[Signal] = []
    n = len(closes)
    start = max(0, n - lookback)
    avg_vol = _vol_sma(volumes, 20)

    for i in range(start, n):
        if np.isnan(avg_vol[i]) or avg_vol[i] == 0:
            continue
        ratio = volumes[i] / avg_vol[i]

        # Climactic volume
        if ratio >= 2.5:
            direction = "bullish" if closes[i] > closes[i - 1] else "bearish"
            signals.append(Signal(
                kind="volume_climax", direction=direction,
                bar_index=i, time=times[i], price=float(closes[i]),
                strength=min(1.0, ratio / 5),
                description=f"Climactic volume ({ratio:.1f}x average) on {'up' if direction == 'bullish' else 'down'} day",
                source="volume",
                details={"volume_ratio": round(ratio, 1)},
            ))

        # Volume dry-up (contraction)
        if ratio < 0.4 and i >= start + 2:
            # Check if previous 3 bars are also low-volume
            low_vol_streak = all(
                volumes[j] / avg_vol[j] < 0.6
                for j in range(max(0, i - 2), i + 1)
                if not np.isnan(avg_vol[j]) and avg_vol[j] > 0
            )
            if low_vol_streak:
                signals.append(Signal(
                    kind="volume_dryup", direction="neutral",
                    bar_index=i, time=times[i], price=float(closes[i]),
                    strength=0.4,
                    description=f"Volume dry-up (3+ bars below 60% of average) — coiling for a move",
                    source="volume",
                ))

    # POC proximity
    if vol_profile and "poc" in vol_profile:
        poc = vol_profile["poc"]
        price = float(closes[-1])
        pct_from_poc = abs(price - poc) / poc * 100
        if pct_from_poc < 3:
            signals.append(Signal(
                kind="at_poc", direction="neutral",
                bar_index=n - 1, time=times[-1], price=price,
                strength=0.4,
                description=f"Price near Volume POC (${poc:.0f}) — mean reversion zone",
                source="volume",
                details={"poc": poc, "distance_pct": round(pct_from_poc, 1)},
            ))

    # Value area signals
    if vol_profile and "value_area_high" in vol_profile and "value_area_low" in vol_profile:
        vah = vol_profile["value_area_high"]
        val_ = vol_profile["value_area_low"]
        price = float(closes[-1])
        if n >= 2:
            prev_price = float(closes[-2])
            # Entering value area from above (bearish — losing ground)
            if prev_price > vah and price <= vah:
                signals.append(Signal(
                    kind="va_enter_from_above", direction="bearish",
                    bar_index=n - 1, time=times[-1], price=price,
                    strength=0.35,
                    description=f"Price entered value area from above (VAH ${vah:.0f})",
                    source="volume",
                ))
            # Exiting value area upward (bullish)
            if prev_price <= vah and price > vah:
                signals.append(Signal(
                    kind="va_exit_above", direction="bullish",
                    bar_index=n - 1, time=times[-1], price=price,
                    strength=0.35,
                    description=f"Price exited value area upward (VAH ${vah:.0f})",
                    source="volume",
                ))

    return signals


def detect_pattern_signals(
    times: list[str], closes: np.ndarray,
    patterns: list[ChartPattern],
    lookback: int = 15,
) -> list[Signal]:
    """Signals from recently confirmed or completed chart patterns."""
    signals: list[Signal] = []
    n = len(closes)
    start = max(0, n - lookback)

    for p in patterns:
        # Recently confirmed patterns
        if p.status in ("confirmed", "completed") and p.end_idx >= start:
            price = float(closes[min(p.end_idx, n - 1)])
            signals.append(Signal(
                kind=f"pattern_{p.kind}",
                direction=p.direction,
                bar_index=p.end_idx, time=p.end_time, price=price,
                strength=p.confidence * 0.8,
                description=p.description,
                source="pattern",
                details={
                    "pattern": p.kind,
                    "entry": p.entry, "stop": p.stop, "target": p.target,
                    "risk_reward": p.risk_reward,
                },
            ))

        # Target reached (pattern completed successfully)
        if p.status == "confirmed" and p.target is not None:
            if p.direction == "bullish" and closes[-1] >= p.target:
                signals.append(Signal(
                    kind="pattern_target_reached",
                    direction="bullish",
                    bar_index=n - 1, time=times[-1], price=float(closes[-1]),
                    strength=0.3,  # informational
                    description=f"{p.kind} target ${p.target:.0f} reached",
                    source="pattern",
                ))
            elif p.direction == "bearish" and closes[-1] <= p.target:
                signals.append(Signal(
                    kind="pattern_target_reached",
                    direction="bearish",
                    bar_index=n - 1, time=times[-1], price=float(closes[-1]),
                    strength=0.3,
                    description=f"{p.kind} target ${p.target:.0f} reached",
                    source="pattern",
                ))

    return signals


# ────────────────────────────────────────────────────────────────────
# Phase 3: Scoring & confluence
# ────────────────────────────────────────────────────────────────────

def _recency_weight(bar_index: int, current_bar: int, half_life: int = 5) -> float:
    """Exponential decay by distance from current bar."""
    age = current_bar - bar_index
    if age < 0:
        age = 0
    return math.exp(-0.693 * age / half_life)  # 0.693 = ln(2)


def score_signals(
    signals: list[Signal],
    trend: TrendContext,
    n_bars: int,
) -> list[dict]:
    """Score each signal 0–100 accounting for recency and trend alignment."""
    scored = []
    for sig in signals:
        # Base: raw strength (0–1) → 0–60
        base = sig.strength * 60

        # Recency bonus: 0–20
        recency = _recency_weight(sig.bar_index, n_bars - 1) * 20

        # Trend alignment: 0–20
        alignment = 0.0
        if sig.direction == "bullish" and trend.trend in ("uptrend", "strong_uptrend"):
            alignment = 20.0
        elif sig.direction == "bearish" and trend.trend in ("downtrend", "strong_downtrend"):
            alignment = 20.0
        elif sig.direction == "bullish" and trend.trend in ("downtrend", "strong_downtrend"):
            alignment = -5.0  # counter-trend penalty
        elif sig.direction == "bearish" and trend.trend in ("uptrend", "strong_uptrend"):
            alignment = -5.0
        else:
            alignment = 5.0  # neutral trend, small bonus

        total = max(0, min(100, base + recency + alignment))

        scored.append({
            **sig.to_dict(),
            "score": round(total, 1),
            "trend_aligned": alignment > 0,
        })

    scored.sort(key=lambda s: -s["score"])
    return scored


def find_confluence(
    scored_signals: list[dict],
    min_signals: int = 2,
    max_bar_gap: int = 5,
) -> list[dict]:
    """Find groups of signals that cluster in time and agree on direction."""
    if not scored_signals:
        return []

    clusters: list[dict] = []

    for direction in ("bullish", "bearish"):
        dir_sigs = [s for s in scored_signals if s["direction"] == direction and s["score"] >= 20]
        if len(dir_sigs) < min_signals:
            continue

        # Group by proximity (within max_bar_gap bars of each other)
        dir_sigs.sort(key=lambda s: s.get("bar_index", 0) if "bar_index" in s else 0)

        # Use the signal time as grouping key
        groups: list[list[dict]] = []
        current_group: list[dict] = [dir_sigs[0]]
        for sig in dir_sigs[1:]:
            last_idx = current_group[-1].get("bar_index", 0)
            curr_idx = sig.get("bar_index", 0)
            if abs(curr_idx - last_idx) <= max_bar_gap:
                current_group.append(sig)
            else:
                groups.append(current_group)
                current_group = [sig]
        if current_group:
            groups.append(current_group)

        # Find the best cluster with enough unique sources
        for group in groups:
            sources = set()
            contributing = []
            for sig in group:
                if sig["source"] not in sources:
                    sources.add(sig["source"])
                    contributing.append(sig)

            if len(sources) >= min_signals:
                avg_score = sum(s["score"] for s in contributing) / len(contributing)
                confluence_bonus = min(30, len(sources) * 10)
                clusters.append({
                    "direction": direction,
                    "signal_count": len(contributing),
                    "source_count": len(sources),
                    "sources": sorted(sources),
                    "conviction": "high" if len(sources) >= 3 else "moderate",
                    "confluence_score": round(avg_score + confluence_bonus, 1),
                    "signals": contributing,
                })

    clusters.sort(key=lambda c: -c["confluence_score"])
    return clusters


# ────────────────────────────────────────────────────────────────────
# Phase 4: Setup builder
# ────────────────────────────────────────────────────────────────────

def build_setups(
    times: list[str],
    highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
    trend: TrendContext,
    momentum: MomentumSnapshot,
    confluence_groups: list[dict],
    trendlines: dict[str, list[Trendline]],
    vol_profile: dict | None,
    atr_val: float,
) -> list[dict]:
    """Translate confluence groups into concrete trade setups with entry/stop/target."""
    setups: list[dict] = []
    n = len(closes)
    price = float(closes[-1])

    for group in confluence_groups:
        direction = group["direction"]
        is_long = direction == "bullish"

        # Find nearest structural stop
        stop = _find_stop(price, is_long, trendlines, vol_profile, atr_val, n - 1)
        risk = abs(price - stop)
        if risk == 0:
            continue

        # Targets: 1.5R and 2.5R from entry
        t1 = price + risk * 1.5 if is_long else price - risk * 1.5
        t2 = price + risk * 2.5 if is_long else price - risk * 2.5

        # Adjust targets to nearest structural level if close
        # (keep it simple for now — just R multiples)

        rr1 = round(abs(t1 - price) / risk, 1) if risk > 0 else 0
        rr2 = round(abs(t2 - price) / risk, 1) if risk > 0 else 0

        counter_trend = (
            (is_long and trend.trend in ("downtrend", "strong_downtrend")) or
            (not is_long and trend.trend in ("uptrend", "strong_uptrend"))
        )

        reasoning = [s["description"] for s in group["signals"][:5]]

        setups.append({
            "direction": "long" if is_long else "short",
            "conviction": group["conviction"],
            "score": group["confluence_score"],
            "entry": round(price, 2),
            "stop_loss": round(stop, 2),
            "target_1": round(t1, 2),
            "target_2": round(t2, 2),
            "risk_reward_t1": rr1,
            "risk_reward_t2": rr2,
            "risk_pct": round(risk / price * 100, 1),
            "reasoning": reasoning,
            "confluence_sources": group["sources"],
            "signal_count": group["signal_count"],
            "counter_trend": counter_trend,
            "invalidation": f"Close {'below' if is_long else 'above'} ${stop:.2f}",
            "context": {
                "trend": trend.trend,
                "adx": round(trend.adx, 1),
                "rsi": round(momentum.rsi, 1),
                "distance_to_sma50": f"{trend.price_vs_sma50_pct:+.1f}%",
                "distance_to_sma200": f"{trend.price_vs_sma200_pct:+.1f}%",
                "atr_pct": f"{momentum.atr_pct}%",
            },
        })

    return setups


def _find_stop(
    price: float, is_long: bool,
    trendlines: dict[str, list[Trendline]],
    vol_profile: dict | None,
    atr_val: float,
    current_idx: int = 0,
) -> float:
    """Find nearest structural level for stop placement."""
    candidates: list[float] = []

    if is_long:
        # Look for support below price
        for tl in trendlines.get("support", []):
            tl_price = tl.price_at(current_idx)
            if 0 < tl_price < price:
                candidates.append(tl_price * 0.99)  # 1% below the line
        if vol_profile and "value_area_low" in vol_profile:
            val_ = vol_profile["value_area_low"]
            if val_ < price:
                candidates.append(val_ * 0.99)
        # Fallback: 2x ATR below
        candidates.append(price - 2 * atr_val)
    else:
        # Look for resistance above price
        for tl in trendlines.get("resistance", []):
            tl_price = tl.price_at(current_idx)
            if tl_price > price:
                candidates.append(tl_price * 1.01)
        if vol_profile and "value_area_high" in vol_profile:
            vah = vol_profile["value_area_high"]
            if vah > price:
                candidates.append(vah * 1.01)
        candidates.append(price + 2 * atr_val)

    if not candidates:
        return price - 2 * atr_val if is_long else price + 2 * atr_val

    if is_long:
        # Closest support below price
        return max(c for c in candidates if c < price) if any(c < price for c in candidates) else min(candidates)
    else:
        return min(c for c in candidates if c > price) if any(c > price for c in candidates) else max(candidates)


# ────────────────────────────────────────────────────────────────────
# Master entry point
# ────────────────────────────────────────────────────────────────────

def generate_signals(
    times: list[str],
    opens: np.ndarray,
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    volumes: np.ndarray,
    swings: list[SwingPoint],
    trendlines: dict[str, list[Trendline]],
    ranges: list[PriceRange],
    breakouts: list[Breakout],
    patterns: list[ChartPattern],
    vol_profile: dict | None = None,
    lookback: int = 15,
) -> dict:
    """
    Master signal generation — runs all phases and returns structured output.

    Input: raw OHLCV arrays + pre-computed TA structures from ta_engine.analysis
    Output: dict ready for JSON response / LLM consumption
    """
    n = len(closes)

    # Phase 1: Context
    trend = compute_trend_context(highs, lows, closes)
    momentum = compute_momentum(highs, lows, closes, swings)

    # Phase 2: Detect all signals
    all_signals: list[Signal] = []
    all_signals += detect_trendline_signals(times, highs, lows, closes, trendlines, lookback)
    all_signals += detect_range_signals(times, highs, lows, closes, volumes, ranges, breakouts, lookback)
    all_signals += detect_ma_signals(times, closes, lookback)
    all_signals += detect_momentum_signals(times, highs, lows, closes, swings, lookback)
    all_signals += detect_volume_signals(times, highs, lows, closes, volumes, vol_profile, lookback)
    all_signals += detect_pattern_signals(times, closes, patterns, lookback)

    # Phase 3: Score & confluence
    scored = score_signals(all_signals, trend, n)
    confluence = find_confluence(scored)

    # Phase 4: Setups
    atr_arr = _atr(highs, lows, closes, 14)
    atr_val = float(atr_arr[-1]) if not np.isnan(atr_arr[-1]) else float(closes[-1]) * 0.02
    setups = build_setups(times, highs, lows, closes, trend, momentum,
                          confluence, trendlines, vol_profile, atr_val)

    return {
        "ticker_context": {
            "price": round(float(closes[-1]), 2),
            "as_of": times[-1],
            "bars_analyzed": n,
            "trend": trend.to_dict(),
            "momentum": momentum.to_dict(),
        },
        "signals": scored[:15],  # top 15 by score
        "confluence": confluence,
        "setups": setups,
        "summary": _build_summary(trend, momentum, scored, confluence, setups),
    }


def _build_summary(
    trend: TrendContext,
    momentum: MomentumSnapshot,
    scored: list[dict],
    confluence: list[dict],
    setups: list[dict],
) -> dict:
    """Plain-language summary for LLM consumption."""
    bull_count = sum(1 for s in scored if s["direction"] == "bullish" and s["score"] >= 30)
    bear_count = sum(1 for s in scored if s["direction"] == "bearish" and s["score"] >= 30)

    if bull_count > bear_count * 2:
        bias = "bullish"
    elif bear_count > bull_count * 2:
        bias = "bearish"
    elif bull_count > bear_count:
        bias = "slightly_bullish"
    elif bear_count > bull_count:
        bias = "slightly_bearish"
    else:
        bias = "neutral"

    return {
        "bias": bias,
        "trend_regime": trend.trend,
        "bullish_signals": bull_count,
        "bearish_signals": bear_count,
        "has_confluence": len(confluence) > 0,
        "top_confluence": confluence[0]["conviction"] if confluence else None,
        "actionable_setups": len(setups),
    }
