"""
Trading blueprint: scanner,
volume-profile, correlation, portfolio analytics.
"""

import json
import math
import os
import threading
from datetime import datetime, timedelta

import numpy as np
import yfinance as yf
from flask import Blueprint, jsonify, request

from fetch_stock_data import fetch_daily_prices
from shared import (
    BATCH_DATA_DIR,
    _safe_num,
    _validate_ticker,
    logger,
)

trading_bp = Blueprint("trading", __name__)

DEFAULT_BENCHMARK_TICKER = "0050.TW"
ALLOWED_BENCHMARK_TICKERS = {"0050.TW", "0052.TW", "0056.TW", "006208.TW"}
BLEND_BENCHMARK_CODE = "60/40"
BLEND_COMPONENT_TICKERS = ("0050.TW", "0056.TW")
BLEND_BENCHMARK_LABEL = "60/40 TW Blend"


# ─── Technical indicator helpers ─────────────────────────

def _compute_sma(closes, period):
    if len(closes) < period:
        return np.full(len(closes), np.nan)
    kernel = np.ones(period) / period
    sma = np.convolve(closes, kernel, mode="valid")
    return np.concatenate([np.full(period - 1, np.nan), sma])


def _compute_ema(closes, period):
    ema = np.empty(len(closes))
    ema[:] = np.nan
    if len(closes) < period:
        return ema
    k = 2.0 / (period + 1)
    ema[period - 1] = np.mean(closes[:period])
    for i in range(period, len(closes)):
        ema[i] = closes[i] * k + ema[i - 1] * (1 - k)
    return ema


def _compute_rsi(closes, period=14):
    if len(closes) < period + 1:
        return np.nan
    deltas = np.diff(closes[-(period + 1):])
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - 100 / (1 + rs), 2)


def _compute_macd(closes, fast=12, slow=26, signal=9):
    if len(closes) < slow + signal:
        return None, None, None
    fast_ema = _compute_ema(closes, fast)
    slow_ema = _compute_ema(closes, slow)
    macd_line = fast_ema - slow_ema
    valid = macd_line[~np.isnan(macd_line)]
    if len(valid) < signal:
        return None, None, None
    sig_ema = _compute_ema(valid, signal)
    macd_val = round(float(valid[-1]), 4)
    sig_val = round(float(sig_ema[-1]), 4)
    hist_val = round(macd_val - sig_val, 4)
    return macd_val, sig_val, hist_val


# ─── Scanner helpers ─────────────────────────────────────

def _scan_single_stock(blob):
    info = blob.get("info", {})
    prices = blob.get("prices", [])
    if not prices or len(prices) < 50:
        return None
    symbol = info.get("symbol", "")
    if not symbol:
        return None

    closes = np.array([p["close"] for p in prices], dtype=float)
    volumes = np.array([p["volume"] for p in prices], dtype=float)
    highs = np.array([p["high"] for p in prices], dtype=float)
    lows = np.array([p["low"] for p in prices], dtype=float)

    current = float(closes[-1])
    sma20 = float(_compute_sma(closes, 20)[-1]) if len(closes) >= 20 else None
    sma50 = float(_compute_sma(closes, 50)[-1]) if len(closes) >= 50 else None
    sma200 = float(_compute_sma(closes, 200)[-1]) if len(closes) >= 200 else None
    ema12 = float(_compute_ema(closes, 12)[-1]) if len(closes) >= 12 else None
    ema26 = float(_compute_ema(closes, 26)[-1]) if len(closes) >= 26 else None

    rsi = _compute_rsi(closes, 14)
    macd_val, macd_sig, macd_hist = _compute_macd(closes)

    # Bollinger Bands (20, 2)
    bb_upper = bb_lower = bb_pct = None
    if len(closes) >= 20:
        window = closes[-20:]
        bb_mid = float(np.mean(window))
        bb_std = float(np.std(window))
        bb_upper = round(bb_mid + 2 * bb_std, 2)
        bb_lower = round(bb_mid - 2 * bb_std, 2)
        bb_range = bb_upper - bb_lower
        bb_pct = round((current - bb_lower) / bb_range * 100, 2) if bb_range > 0 else 50.0

    # Volume analysis
    avg_vol_20 = float(np.mean(volumes[-20:])) if len(volumes) >= 20 else None
    vol_ratio = round(float(volumes[-1]) / avg_vol_20, 2) if avg_vol_20 and avg_vol_20 > 0 else None

    # ATR (14)
    atr = None
    if len(closes) > 14:
        tr_vals = []
        for i in range(1, min(15, len(closes))):
            tr = max(
                float(highs[-i] - lows[-i]),
                abs(float(highs[-i] - closes[-i - 1])),
                abs(float(lows[-i] - closes[-i - 1])),
            )
            tr_vals.append(tr)
        atr = round(np.mean(tr_vals), 2)

    # Signal detection
    signals = []
    if sma50 and sma200:
        if len(closes) >= 201:
            prev_sma50 = float(_compute_sma(closes[:-1], 50)[-1])
            prev_sma200 = float(_compute_sma(closes[:-1], 200)[-1])
            if prev_sma50 <= prev_sma200 and sma50 > sma200:
                signals.append({"type": "golden_cross", "label": "Golden Cross", "bias": "bullish"})
            elif prev_sma50 >= prev_sma200 and sma50 < sma200:
                signals.append({"type": "death_cross", "label": "Death Cross", "bias": "bearish"})

    if rsi is not None:
        if rsi < 30:
            signals.append({"type": "rsi_oversold", "label": f"RSI Oversold ({rsi})", "bias": "bullish"})
        elif rsi > 70:
            signals.append({"type": "rsi_overbought", "label": f"RSI Overbought ({rsi})", "bias": "bearish"})

    if macd_val is not None and macd_sig is not None:
        if macd_val > macd_sig and macd_hist and macd_hist > 0:
            signals.append({"type": "macd_bullish", "label": "MACD Bullish", "bias": "bullish"})
        elif macd_val < macd_sig and macd_hist and macd_hist < 0:
            signals.append({"type": "macd_bearish", "label": "MACD Bearish", "bias": "bearish"})

    if bb_pct is not None:
        if bb_pct < 5:
            signals.append({"type": "bb_oversold", "label": "Below Lower BB", "bias": "bullish"})
        elif bb_pct > 95:
            signals.append({"type": "bb_overbought", "label": "Above Upper BB", "bias": "bearish"})

    if vol_ratio and vol_ratio > 2.0:
        bias = "bullish" if closes[-1] > closes[-2] else "bearish"
        signals.append({"type": "volume_surge", "label": f"Volume Surge ({vol_ratio}x)", "bias": bias})

    trend = "neutral"
    if sma50 and sma200:
        if current > sma50 > sma200:
            trend = "strong_bullish"
        elif current > sma50:
            trend = "bullish"
        elif current < sma50 < sma200:
            trend = "strong_bearish"
        elif current < sma50:
            trend = "bearish"

    return {
        "symbol": symbol,
        "name": info.get("shortName", symbol),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "price": round(current, 2),
        "change_pct": round((current / float(closes[-2]) - 1) * 100, 2) if len(closes) >= 2 else None,
        "marketCap": info.get("marketCap"),
        "sma20": round(sma20, 2) if sma20 else None,
        "sma50": round(sma50, 2) if sma50 else None,
        "sma200": round(sma200, 2) if sma200 else None,
        "rsi": rsi,
        "macd": macd_val,
        "macd_signal": macd_sig,
        "macd_histogram": macd_hist,
        "bb_upper": bb_upper,
        "bb_lower": bb_lower,
        "bb_pct": bb_pct,
        "atr": atr,
        "volume": int(volumes[-1]) if len(volumes) > 0 else None,
        "avg_volume_20": int(avg_vol_20) if avg_vol_20 else None,
        "volume_ratio": vol_ratio,
        "trend": trend,
        "signals": signals,
    }


# Scanner cache
_scanner_cache = {"data": None, "ts": 0}
_scanner_lock = threading.Lock()
_SCANNER_TTL = 300


def _get_scanner_data():
    with _scanner_lock:
        now = datetime.now().timestamp()
        if _scanner_cache["data"] is not None and (now - _scanner_cache["ts"]) < _SCANNER_TTL:
            return _scanner_cache["data"]
        results = []
        if os.path.isdir(BATCH_DATA_DIR):
            for fname in sorted(os.listdir(BATCH_DATA_DIR)):
                if not fname.endswith(".json"):
                    continue
                fpath = os.path.join(BATCH_DATA_DIR, fname)
                try:
                    with open(fpath) as f:
                        blob = json.load(f)
                    row = _scan_single_stock(blob)
                    if row:
                        results.append(row)
                except Exception:
                    continue
        _scanner_cache["data"] = results
        _scanner_cache["ts"] = now
        return results


# ═══════════════════════════════════════════════════════════
# ROUTE HANDLERS
# ═══════════════════════════════════════════════════════════


# ─── Scanner ─────────────────────────────────────────────

@trading_bp.route("/api/scanner", methods=["GET"])
def api_scanner():
    rows = _get_scanner_data()
    if not rows:
        return jsonify({"stocks": [], "count": 0, "signals_summary": {}})

    signal_filter = request.args.get("signal")
    trend_filter = request.args.get("trend")
    sector = request.args.get("sector")
    min_rsi = request.args.get("minRsi", type=float)
    max_rsi = request.args.get("maxRsi", type=float)

    filtered = rows
    if signal_filter:
        filtered = [r for r in filtered if any(s["type"] == signal_filter for s in r.get("signals", []))]
    if trend_filter:
        filtered = [r for r in filtered if r.get("trend") == trend_filter]
    if sector:
        filtered = [r for r in filtered if r.get("sector") == sector]
    if min_rsi is not None:
        filtered = [r for r in filtered if r.get("rsi") is not None and r["rsi"] >= min_rsi]
    if max_rsi is not None:
        filtered = [r for r in filtered if r.get("rsi") is not None and r["rsi"] <= max_rsi]

    sort_field = request.args.get("sort", "marketCap")
    order = request.args.get("order", "desc")

    def sort_key(r):
        v = r.get(sort_field)
        if v is None:
            return float("-inf") if order == "desc" else float("inf")
        return v

    filtered.sort(key=sort_key, reverse=(order == "desc"))

    sig_summary = {}
    for r in rows:
        for s in r.get("signals", []):
            sig_summary[s["type"]] = sig_summary.get(s["type"], 0) + 1

    return jsonify({
        "stocks": filtered,
        "count": len(filtered),
        "total": len(rows),
        "signals_summary": sig_summary,
    })


# ─── Volume Profile ──────────────────────────────────────

@trading_bp.route("/api/volume-profile", methods=["GET"])
def api_volume_profile():
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err
    n_bins = int(request.args.get("bins", 50))
    period = request.args.get("period", "1y")

    bp = os.path.join(BATCH_DATA_DIR, f"{ticker}.json")
    prices = []
    if os.path.exists(bp):
        with open(bp) as f:
            prices = json.load(f).get("prices", [])

    # Fallback: fetch live if batch data is missing
    if not prices:
        try:
            df = fetch_daily_prices(ticker, period="5y")
            if df is not None and not df.empty:
                prices = [
                    {"date": r["Date"].strftime("%Y-%m-%d"), "open": float(r["Open"]),
                     "high": float(r["High"]), "low": float(r["Low"]),
                     "close": float(r["Close"]), "volume": int(r["Volume"])}
                    for _, r in df.iterrows()
                ]
        except Exception as e:
            logger.warning("volume-profile fallback fetch failed for %s: %s", ticker, e)

    if not prices:
        return jsonify({"error": "No price data available"}), 404

    period_days = {"1m": 21, "3m": 63, "6m": 126, "1y": 252, "2y": 504, "5y": 1260}
    days = period_days.get(period, 252)
    prices = prices[-days:]

    if len(prices) < 10:
        return jsonify({"error": "Not enough data"}), 400

    closes = np.array([p["close"] for p in prices], dtype=float)
    highs = np.array([p["high"] for p in prices], dtype=float)
    lows = np.array([p["low"] for p in prices], dtype=float)
    volumes = np.array([p["volume"] for p in prices], dtype=float)

    price_min = float(np.min(lows))
    price_max = float(np.max(highs))
    bin_size = (price_max - price_min) / n_bins if n_bins > 0 else 1

    bins = []
    for b in range(n_bins):
        low_edge = price_min + b * bin_size
        high_edge = low_edge + bin_size
        bins.append({
            "pricelow": round(low_edge, 2),
            "pricehigh": round(high_edge, 2),
            "pricemid": round((low_edge + high_edge) / 2, 2),
            "volume": 0,
            "buyVolume": 0,
            "sellVolume": 0,
        })

    for i in range(len(prices)):
        bar_low = float(lows[i])
        bar_high = float(highs[i])
        bar_vol = float(volumes[i])
        bar_close = float(closes[i])
        bar_open = float(prices[i]["open"])

        for b in range(n_bins):
            edge_low = price_min + b * bin_size
            edge_high = edge_low + bin_size
            overlap_low = max(bar_low, edge_low)
            overlap_high = min(bar_high, edge_high)
            if overlap_low < overlap_high:
                bar_range = bar_high - bar_low
                fraction = (overlap_high - overlap_low) / bar_range if bar_range > 0 else 1.0
                vol_share = bar_vol * fraction
                bins[b]["volume"] += vol_share
                if bar_close >= bar_open:
                    bins[b]["buyVolume"] += vol_share
                else:
                    bins[b]["sellVolume"] += vol_share

    max_vol = max((b["volume"] for b in bins), default=1)
    for b in bins:
        b["volume"] = int(round(b["volume"]))
        b["buyVolume"] = int(round(b["buyVolume"]))
        b["sellVolume"] = int(round(b["sellVolume"]))
        b["pct"] = round(b["volume"] / max_vol * 100, 1) if max_vol > 0 else 0

    poc_bin = max(bins, key=lambda b: b["volume"])
    poc = poc_bin["pricemid"]

    total_vol = sum(b["volume"] for b in bins)
    va_target = total_vol * 0.7
    poc_idx = bins.index(poc_bin)
    va_vol = poc_bin["volume"]
    lo_idx = poc_idx
    hi_idx = poc_idx
    while va_vol < va_target:
        expand_lo = bins[lo_idx - 1]["volume"] if lo_idx > 0 else 0
        expand_hi = bins[hi_idx + 1]["volume"] if hi_idx < n_bins - 1 else 0
        if expand_lo >= expand_hi and lo_idx > 0:
            lo_idx -= 1
            va_vol += expand_lo
        elif hi_idx < n_bins - 1:
            hi_idx += 1
            va_vol += expand_hi
        else:
            break

    vah = bins[hi_idx]["pricehigh"]
    val_price = bins[lo_idx]["pricelow"]

    return jsonify({
        "ticker": ticker,
        "period": period,
        "bins": bins,
        "poc": round(poc, 2),
        "valueAreaHigh": round(vah, 2),
        "valueAreaLow": round(val_price, 2),
        "currentPrice": round(float(closes[-1]), 2),
    })


# ─── Correlation Matrix ─────────────────────────────────

@trading_bp.route("/api/correlation", methods=["GET"])
def api_correlation():
    tickers_str = request.args.get("tickers", "")
    if not tickers_str:
        return jsonify({"error": "tickers parameter required (comma-separated)"}), 400

    tickers = [t.strip().upper() for t in tickers_str.split(",") if t.strip()]
    if len(tickers) < 2:
        return jsonify({"error": "At least 2 tickers required"}), 400
    if len(tickers) > 20:
        return jsonify({"error": "Max 20 tickers"}), 400

    period = request.args.get("period", "1y")
    period_days = {"1m": 21, "3m": 63, "6m": 126, "1y": 252, "2y": 504, "5y": 1260}.get(period, 252)

    price_data = {}
    for ticker in tickers:
        bp = os.path.join(BATCH_DATA_DIR, f"{ticker}.json")
        prices = []
        if os.path.isfile(bp):
            with open(bp) as f:
                blob = json.load(f)
            prices = blob.get("prices", [])
        # Fallback: fetch live
        if not prices:
            try:
                df = fetch_daily_prices(ticker, period="5y")
                if df is not None and not df.empty:
                    prices = [{"close": float(r["Close"])} for _, r in df.iterrows()]
            except Exception:
                pass
        if not prices:
            continue
        closes = [p["close"] for p in prices[-period_days:]]
        if len(closes) < 20:
            continue
        price_data[ticker] = closes

    valid_tickers = list(price_data.keys())
    if len(valid_tickers) < 2:
        return jsonify({"error": "Need at least 2 tickers with sufficient data"}), 404

    min_len = min(len(v) for v in price_data.values())
    for t in valid_tickers:
        price_data[t] = price_data[t][-min_len:]

    returns = {}
    for t in valid_tickers:
        p = price_data[t]
        r = [(p[i] - p[i - 1]) / p[i - 1] if p[i - 1] != 0 else 0 for i in range(1, len(p))]
        returns[t] = np.array(r)

    n_t = len(valid_tickers)
    matrix = []
    for i in range(n_t):
        row = []
        for j in range(n_t):
            if i == j:
                row.append(1.0)
            else:
                corr = float(np.corrcoef(returns[valid_tickers[i]], returns[valid_tickers[j]])[0, 1])
                row.append(round(corr, 4))
        matrix.append(row)

    stats = []
    for t in valid_tickers:
        r = returns[t]
        p = price_data[t]
        total_return = (p[-1] - p[0]) / p[0] * 100 if p[0] != 0 else 0
        vol = float(np.std(r) * np.sqrt(252) * 100)
        stats.append({
            "ticker": t,
            "totalReturn": round(total_return, 2),
            "annualizedVol": round(vol, 2),
            "avgDailyReturn": round(float(np.mean(r) * 100), 4),
        })

    return jsonify({
        "tickers": valid_tickers,
        "matrix": matrix,
        "stats": stats,
        "period": period,
        "dataPoints": min_len,
    })


# ─── Correlation Detailed Data ───────────────────────────

@trading_bp.route("/api/correlation/detailed", methods=["GET"])
def api_correlation_detailed():
    """Return rich data for correlation visualisations:
    cumulative returns, rolling correlations, daily returns, etc."""
    tickers_str = request.args.get("tickers", "")
    if not tickers_str:
        return jsonify({"error": "tickers parameter required (comma-separated)"}), 400

    tickers = [t.strip().upper() for t in tickers_str.split(",") if t.strip()]
    if len(tickers) < 2:
        return jsonify({"error": "At least 2 tickers required"}), 400
    if len(tickers) > 20:
        return jsonify({"error": "Max 20 tickers"}), 400

    period = request.args.get("period", "1y")
    period_days = {"1m": 21, "3m": 63, "6m": 126, "1y": 252, "2y": 504, "5y": 1260}.get(period, 252)
    window = int(request.args.get("window", "30"))
    window = max(10, min(window, 120))

    # ── gather price data with dates ──
    price_data = {}
    date_data = {}
    for ticker in tickers:
        bp = os.path.join(BATCH_DATA_DIR, f"{ticker}.json")
        prices = []
        if os.path.isfile(bp):
            with open(bp) as f:
                blob = json.load(f)
            prices = blob.get("prices", [])
        if not prices:
            try:
                df = fetch_daily_prices(ticker, period="5y")
                if df is not None and not df.empty:
                    prices = [{"date": r["Date"].strftime("%Y-%m-%d"), "close": float(r["Close"])}
                              for _, r in df.iterrows()]
            except Exception:
                pass
        if not prices:
            continue
        trimmed = prices[-period_days:]
        closes = [p["close"] for p in trimmed]
        dates = [p.get("date", "") for p in trimmed]
        if len(closes) < 20:
            continue
        price_data[ticker] = closes
        date_data[ticker] = dates

    valid_tickers = list(price_data.keys())
    if len(valid_tickers) < 2:
        return jsonify({"error": "Need at least 2 tickers with sufficient data"}), 404

    min_len = min(len(v) for v in price_data.values())
    for t in valid_tickers:
        price_data[t] = price_data[t][-min_len:]
        date_data[t] = date_data[t][-min_len:]

    dates = date_data[valid_tickers[0]]

    # ── daily returns ──
    returns = {}
    for t in valid_tickers:
        p = price_data[t]
        r = [(p[i] - p[i - 1]) / p[i - 1] if p[i - 1] != 0 else 0
             for i in range(1, len(p))]
        returns[t] = r

    return_dates = dates[1:]  # one fewer element after diff

    # ── cumulative returns normalised to 100 ──
    cumulative = {}
    for t in valid_tickers:
        p = price_data[t]
        base = p[0] if p[0] != 0 else 1
        cumulative[t] = [round(v / base * 100, 2) for v in p]

    # ── rolling correlations for every unique pair ──
    pairs_rolling = []
    n_t = len(valid_tickers)
    for i in range(n_t):
        for j in range(i + 1, n_t):
            ta, tb = valid_tickers[i], valid_tickers[j]
            ra, rb = np.array(returns[ta]), np.array(returns[tb])
            n_r = len(ra)
            rolling_vals = []
            for k in range(window - 1, n_r):
                seg_a = ra[k - window + 1: k + 1]
                seg_b = rb[k - window + 1: k + 1]
                if np.std(seg_a) == 0 or np.std(seg_b) == 0:
                    rolling_vals.append(None)
                else:
                    rolling_vals.append(round(float(np.corrcoef(seg_a, seg_b)[0, 1]), 4))
            # pad front with None so length matches return_dates
            pad = [None] * (window - 1)
            pairs_rolling.append({
                "pair": f"{ta}-{tb}",
                "values": pad + rolling_vals,
            })

    # ── per-ticker daily returns (sampled for scatter) ──
    daily_returns_out = {}
    for t in valid_tickers:
        daily_returns_out[t] = [round(r, 6) for r in returns[t]]

    return jsonify({
        "tickers": valid_tickers,
        "dates": dates,
        "returnDates": return_dates,
        "cumulativeReturns": cumulative,
        "rollingCorrelations": pairs_rolling,
        "dailyReturns": daily_returns_out,
        "window": window,
        "period": period,
    })


# ─── Portfolio Analytics ──────────────────────────────────

@trading_bp.route("/api/portfolio/analyze", methods=["POST"])
def api_portfolio_analyze():
    """Comprehensive portfolio analysis endpoint.

    Body JSON:
    {
      "holdings": [
        { "ticker": "AAPL", "shares": 10, "costBasis": 150.00, "purchaseDate": "2023-01-15" },
        ...
      ],
      "period": "1y"
    }
    """
    body = request.get_json(force=True, silent=True) or {}
    holdings = body.get("holdings", [])
    if not holdings or not isinstance(holdings, list):
        return jsonify({"error": "holdings array required"}), 400
    if len(holdings) > 50:
        return jsonify({"error": "Max 50 holdings"}), 400

    period = body.get("period", "1y")
    period_days = {"1m": 21, "3m": 63, "6m": 126, "1y": 252, "2y": 504, "5y": 1260}.get(period, 252)

    # Benchmark ticker (default Taiwan benchmark ETF)
    benchmark_ticker = body.get("benchmark", DEFAULT_BENCHMARK_TICKER).upper()
    is_blend = benchmark_ticker == BLEND_BENCHMARK_CODE
    if is_blend:
        benchmark_tickers_to_load = list(BLEND_COMPONENT_TICKERS)
    elif benchmark_ticker in ALLOWED_BENCHMARK_TICKERS:
        benchmark_tickers_to_load = [benchmark_ticker]
    else:
        benchmark_ticker = DEFAULT_BENCHMARK_TICKER
        benchmark_tickers_to_load = [DEFAULT_BENCHMARK_TICKER]

    # ── Parse & validate holdings ──
    parsed = []
    for h in holdings:
        ticker, err = _validate_ticker(h.get("ticker", ""))
        if err:
            continue
        shares = float(h.get("shares", 0))
        cost_basis = float(h.get("costBasis", 0))
        if shares <= 0:
            continue
        purchase_date = h.get("purchaseDate") or None
        parsed.append({"ticker": ticker, "shares": shares, "costBasis": cost_basis, "purchaseDate": purchase_date})

    if not parsed:
        return jsonify({"error": "No valid holdings provided"}), 400

    # ── Load price data for each holding ──
    price_data = {}
    info_data = {}

    # Also load benchmark ticker(s)
    tickers_to_load = list(dict.fromkeys([h["ticker"] for h in parsed] + benchmark_tickers_to_load))

    for t in tickers_to_load:
        if t in price_data:
            continue
        bp = os.path.join(BATCH_DATA_DIR, f"{t}.json")
        prices = []
        info = {}
        if os.path.isfile(bp):
            try:
                with open(bp) as f:
                    blob = json.load(f)
                prices = blob.get("prices", [])
                info = blob.get("info", {})
            except Exception:
                pass
        if not prices:
            try:
                df = fetch_daily_prices(t, period="5y")
                if df is not None and not df.empty:
                    prices = [
                        {"date": r["Date"].strftime("%Y-%m-%d") if hasattr(r["Date"], "strftime") else str(r["Date"])[:10],
                         "close": float(r["Close"])}
                        for _, r in df.iterrows()
                    ]
            except Exception:
                pass
        if prices:
            price_data[t] = prices[-period_days:] if len(prices) >= period_days else prices
            info_data[t] = info

    valid_tickers = [h["ticker"] for h in parsed if h["ticker"] in price_data]
    if not valid_tickers:
        return jsonify({"error": "No price data available for any holding"}), 404

    parsed = [h for h in parsed if h["ticker"] in price_data]

    # ── Align dates across all tickers (including benchmark if available) ──
    align_tickers = list(valid_tickers)
    has_benchmark = all(t in price_data for t in benchmark_tickers_to_load) and not all(t in valid_tickers for t in benchmark_tickers_to_load)
    if has_benchmark:
        for bt in benchmark_tickers_to_load:
            if bt not in align_tickers:
                align_tickers.append(bt)

    date_sets = [set(p["date"] for p in price_data[t]) for t in align_tickers]
    common_dates = sorted(set.intersection(*date_sets)) if date_sets else []
    if len(common_dates) < 10:
        return jsonify({"error": "Insufficient overlapping price data"}), 404

    close_lookup = {}
    for t in align_tickers:
        close_lookup[t] = {p["date"]: p["close"] for p in price_data[t]}

    aligned_closes = {}
    for t in align_tickers:
        aligned_closes[t] = [close_lookup[t][d] for d in common_dates]

    n_days = len(common_dates)

    # ── Per-holding metrics ──
    holdings_out = []
    total_cost = 0.0
    total_value = 0.0
    sector_map = {}

    for h in parsed:
        t = h["ticker"]
        closes = aligned_closes[t]
        current = closes[-1]
        prev = closes[-2] if len(closes) >= 2 else current
        mkt_value = h["shares"] * current
        cost_total = h["shares"] * h["costBasis"]
        gain = mkt_value - cost_total
        gain_pct = (gain / cost_total * 100) if cost_total > 0 else 0
        daily_chg = (current - prev) / prev * 100 if prev else 0
        daily_chg_dollar = h["shares"] * (current - prev)

        info = info_data.get(t, {})
        sector = info.get("sector", "Unknown")
        beta = _safe_num(info.get("beta"))
        div_yield = _safe_num(info.get("dividendYield"))
        div_per_share = _safe_num(info.get("dividendRate")) or 0

        # Per-holding annualized return and volatility
        h_returns = [(closes[i] - closes[i - 1]) / closes[i - 1] for i in range(1, len(closes)) if closes[i - 1] != 0]
        h_ann_return = float(np.mean(h_returns)) * 252 * 100 if h_returns else 0
        h_ann_vol = float(np.std(h_returns)) * math.sqrt(252) * 100 if h_returns else 0

        total_cost += cost_total
        total_value += mkt_value
        sector_map[sector] = sector_map.get(sector, 0) + mkt_value

        holdings_out.append({
            "ticker": t,
            "name": info.get("shortName") or info.get("longName") or t,
            "shares": h["shares"],
            "costBasis": h["costBasis"],
            "purchaseDate": h.get("purchaseDate"),
            "currentPrice": round(current, 2),
            "marketValue": round(mkt_value, 2),
            "totalCost": round(cost_total, 2),
            "gain": round(gain, 2),
            "gainPct": round(gain_pct, 2),
            "dailyChange": round(daily_chg, 2),
            "dailyChangeDollar": round(daily_chg_dollar, 2),
            "weight": 0,
            "sector": sector,
            "beta": beta,
            "dividendYield": round(div_yield * 100, 2) if div_yield else None,
            "annDividend": round(h["shares"] * div_per_share, 2),
            "annReturn": round(h_ann_return, 2),
            "annVolatility": round(h_ann_vol, 2),
        })

    for h in holdings_out:
        h["weight"] = round(h["marketValue"] / total_value * 100, 2) if total_value else 0

    # ── Sector allocation ──
    sectors = [
        {"sector": s, "value": round(v, 2), "weight": round(v / total_value * 100, 2)}
        for s, v in sorted(sector_map.items(), key=lambda x: -x[1])
    ] if total_value else []

    # ── Daily portfolio equity curve ──
    equity_curve = []
    for i, d in enumerate(common_dates):
        day_value = sum(h["shares"] * aligned_closes[h["ticker"]][i] for h in parsed)
        equity_curve.append({"date": d, "value": round(day_value, 2)})

    port_values = [e["value"] for e in equity_curve]
    port_returns = []
    for i in range(1, len(port_values)):
        r = (port_values[i] - port_values[i - 1]) / port_values[i - 1] if port_values[i - 1] else 0
        port_returns.append(r)

    # ── Benchmark equity curve ──
    benchmark_curve = []
    benchmark_returns = []
    benchmark_label = BLEND_BENCHMARK_LABEL if is_blend else benchmark_ticker
    if has_benchmark:
        if is_blend:
            core_closes = aligned_closes[BLEND_COMPONENT_TICKERS[0]]
            income_closes = aligned_closes[BLEND_COMPONENT_TICKERS[1]]
            # Normalize both to 1.0 first so the blend is by return, not by price level
            core_start = core_closes[0] or 1
            income_start = income_closes[0] or 1
            bm_closes = [0.6 * (c / core_start) + 0.4 * (i / income_start) for c, i in zip(core_closes, income_closes)]
        else:
            bm_closes = aligned_closes[benchmark_ticker]
        bm_start = bm_closes[0]
        for i, d in enumerate(common_dates):
            bv = (bm_closes[i] / bm_start) * port_values[0] if bm_start else 0
            benchmark_curve.append({"date": d, "value": round(bv, 2)})
        for i in range(1, len(bm_closes)):
            r = (bm_closes[i] - bm_closes[i - 1]) / bm_closes[i - 1] if bm_closes[i - 1] else 0
            benchmark_returns.append(r)

    # ── Drawdown series ──
    peak = port_values[0]
    drawdown = []
    max_dd = 0.0
    for i, v in enumerate(port_values):
        if v > peak:
            peak = v
        dd = (v - peak) / peak * 100 if peak else 0
        if dd < max_dd:
            max_dd = dd
        drawdown.append({"date": common_dates[i], "drawdown": round(dd, 2)})

    # ── Rolling volatility (30-day) ──
    roll_window = min(30, len(port_returns))
    rolling_vol = []
    for i in range(roll_window - 1, len(port_returns)):
        window_r = port_returns[i - roll_window + 1:i + 1]
        vol = float(np.std(window_r)) * math.sqrt(252) * 100
        rolling_vol.append({"date": common_dates[i + 1], "volatility": round(vol, 2)})

    # ── Risk Metrics ──
    ann_return = 0
    ann_vol = 0
    sharpe = 0
    sortino = 0
    var_95 = 0
    cvar_95 = 0
    calmar = 0

    if port_returns:
        pr = np.array(port_returns)
        avg_daily = float(np.mean(pr))
        std_daily = float(np.std(pr))
        ann_return = avg_daily * 252 * 100
        ann_vol = std_daily * math.sqrt(252) * 100
        sharpe = (avg_daily * 252) / (std_daily * math.sqrt(252)) if std_daily > 0 else 0
        # Note: np.std uses ddof=0 here for Sharpe/vol; EF and MCTR sections
        # use np.cov (ddof=1) which is standard for sample covariance estimation.

        # Sortino: downside deviation = sqrt(mean(min(0, r)²)) over ALL returns
        downside = np.minimum(pr, 0)
        downside_std = float(np.sqrt(np.mean(downside ** 2)))
        sortino = (avg_daily * 252) / (downside_std * math.sqrt(252)) if downside_std > 0 else 0

        # Value at Risk (95%) & Conditional VaR
        var_95 = float(np.percentile(pr, 5)) * 100  # 5th percentile as %
        tail = pr[pr <= np.percentile(pr, 5)]
        cvar_95 = float(np.mean(tail)) * 100 if len(tail) > 0 else var_95

        # Calmar ratio: ann return / abs(max drawdown)
        calmar = (ann_return / abs(max_dd)) if max_dd != 0 else 0

    # Weighted beta
    w_beta = 0.0
    beta_count = 0
    for h in holdings_out:
        if h["beta"] is not None:
            w_beta += h["beta"] * (h["weight"] / 100)
            beta_count += 1

    # ── Benchmark stats ──
    benchmark_ann_return = 0
    information_ratio = 0
    if benchmark_returns:
        bm_arr = np.array(benchmark_returns)
        benchmark_ann_return = float(np.mean(bm_arr)) * 252 * 100
        if port_returns:
            pr = np.array(port_returns)
            excess = pr[:len(bm_arr)] - bm_arr[:len(pr)]
            te = float(np.std(excess)) * math.sqrt(252) if len(excess) > 1 else 0
            information_ratio = (float(np.mean(excess)) * 252) / te if te > 0 else 0

    # ── Monthly Returns Grid ──
    monthly_returns = []
    if port_returns and len(common_dates) > 1:
        # Group returns by year-month
        from collections import defaultdict
        month_map = defaultdict(list)
        for i, r in enumerate(port_returns):
            d = common_dates[i + 1]  # return i corresponds to date i+1
            ym = d[:7]  # "YYYY-MM"
            month_map[ym].append(r)

        for ym in sorted(month_map.keys()):
            compound = 1.0
            for r in month_map[ym]:
                compound *= (1 + r)
            monthly_returns.append({
                "year": int(ym[:4]),
                "month": int(ym[5:7]),
                "return": round((compound - 1) * 100, 2),
            })

    # ── Best & Worst Days ──
    best_days = []
    worst_days = []
    if port_returns:
        day_perf = []
        for i, r in enumerate(port_returns):
            day_perf.append({
                "date": common_dates[i + 1],
                "return": round(r * 100, 2),
                "value": port_values[i + 1],
            })
        sorted_days = sorted(day_perf, key=lambda x: x["return"])
        worst_days = sorted_days[:5]
        best_days = sorted_days[-5:][::-1]

    # ── Performance Attribution (contribution to return) ──
    attribution = []
    if port_returns and total_value > 0:
        for h in holdings_out:
            t = h["ticker"]
            closes = aligned_closes[t]
            start_val = h["shares"] * closes[0]
            end_val = h["shares"] * closes[-1]
            contribution = (end_val - start_val) / port_values[0] * 100 if port_values[0] else 0
            period_return = ((closes[-1] - closes[0]) / closes[0] * 100) if closes[0] else 0
            attribution.append({
                "ticker": t,
                "name": h["name"],
                "weight": h["weight"],
                "holdingReturn": round(period_return, 2),
                "contribution": round(contribution, 2),
            })
        attribution.sort(key=lambda x: x["contribution"], reverse=True)

    # ── Concentration Metrics ──
    weights = sorted([h["weight"] for h in holdings_out], reverse=True)
    hhi = round(sum(w ** 2 for w in weights), 2) if weights else 0  # Herfindahl-Hirschman
    top5_weight = round(sum(weights[:5]), 2) if weights else 0
    effective_positions = round(10000 / hhi, 1) if hhi > 0 else 0  # 1/HHI scaled

    # ── Estimated Annual Dividend Income ──
    annual_dividend_income = round(sum(h["annDividend"] for h in holdings_out), 2)
    dividend_yield_portfolio = round(annual_dividend_income / total_value * 100, 2) if total_value > 0 else 0

    # ── Correlation matrix ──
    corr_tickers = list(dict.fromkeys(h["ticker"] for h in parsed))
    returns_map = {}
    for t in corr_tickers:
        c = aligned_closes[t]
        r = [(c[i] - c[i - 1]) / c[i - 1] if c[i - 1] != 0 else 0 for i in range(1, len(c))]
        returns_map[t] = np.array(r)

    corr_matrix = []
    for i, t1 in enumerate(corr_tickers):
        row = []
        for j, t2 in enumerate(corr_tickers):
            if i == j:
                row.append(1.0)
            else:
                c = float(np.corrcoef(returns_map[t1], returns_map[t2])[0, 1])
                row.append(round(c, 4) if not math.isnan(c) else 0)
        corr_matrix.append(row)

    high_corr_count = 0
    total_pairs = 0
    for i in range(len(corr_tickers)):
        for j in range(i + 1, len(corr_tickers)):
            total_pairs += 1
            if corr_matrix[i][j] > 0.8:
                high_corr_count += 1
    high_corr_pct = round(high_corr_count / total_pairs * 100, 1) if total_pairs > 0 else 0

    # ── Risk Contribution (MCTR) ──
    risk_contribution = []
    if len(corr_tickers) >= 2 and port_returns:
        ret_matrix = np.column_stack([returns_map[t] for t in corr_tickers])
        cov_matrix = np.cov(ret_matrix, rowvar=False)
        w_vec = np.array([h["weight"] / 100 for h in holdings_out])
        port_std = float(np.sqrt(w_vec @ cov_matrix @ w_vec))
        if port_std > 0:
            mcr = (cov_matrix @ w_vec) / port_std  # marginal contribution to risk
            ctr = w_vec * mcr  # component risk
            total_ctr = float(np.sum(ctr))
            for idx, t in enumerate(corr_tickers):
                pct_ctr = (ctr[idx] / total_ctr * 100) if total_ctr > 0 else 0
                risk_contribution.append({
                    "ticker": t,
                    "mctr": round(float(mcr[idx]) * math.sqrt(252) * 100, 4),
                    "ctr": round(float(ctr[idx]) * math.sqrt(252) * 100, 4),
                    "pctContribution": round(float(pct_ctr), 2),
                })

    # ── Risk Parity Weights ──
    risk_parity_weights = []
    if len(corr_tickers) >= 2 and port_returns:
        ret_matrix = np.column_stack([returns_map[t] for t in corr_tickers])
        cov_rp = np.cov(ret_matrix, rowvar=False) * 252  # annualized
        n_a = len(corr_tickers)
        w_rp = np.ones(n_a) / n_a  # start equal weight
        for _iter in range(500):
            port_vol = float(np.sqrt(w_rp @ cov_rp @ w_rp))
            if port_vol == 0:
                break
            mcr_rp = (cov_rp @ w_rp) / port_vol
            rc = w_rp * mcr_rp  # risk contribution per asset
            target_rc = port_vol / n_a
            # Adjust weights: increase weight for under-contributing, decrease for over
            w_new = w_rp * (target_rc / (rc + 1e-12))
            w_new = w_new / w_new.sum()
            if np.max(np.abs(w_new - w_rp)) < 1e-8:
                w_rp = w_new
                break
            w_rp = w_new
        # Compute stats for risk parity portfolio
        rp_ret = float(w_rp @ (np.mean(ret_matrix, axis=0) * 252)) * 100
        rp_vol = float(np.sqrt(w_rp @ cov_rp @ w_rp)) * 100
        rp_sharpe = (rp_ret / 100) / (rp_vol / 100) if rp_vol > 0 else 0
        for idx, t in enumerate(corr_tickers):
            risk_parity_weights.append({
                "ticker": t,
                "currentWeight": round(holdings_out[idx]["weight"], 2),
                "rpWeight": round(float(w_rp[idx]) * 100, 2),
            })

    # ── Efficient Frontier (Monte Carlo) with Sharpe coloring ──
    efficient_frontier = []
    if len(corr_tickers) >= 2 and port_returns:
        ret_matrix = np.column_stack([returns_map[t] for t in corr_tickers])
        mean_rets = np.mean(ret_matrix, axis=0) * 252
        cov_annual = np.cov(ret_matrix, rowvar=False) * 252
        n_assets = len(corr_tickers)
        rng = np.random.default_rng(42)
        rf = 0.0  # risk-free rate (annualized, as fraction — 0 = 0%)

        def _port_stats(w):
            """Return (ann_return%, ann_risk%, sharpe) for weight vector."""
            r = float(w @ mean_rets) * 100
            s = float(np.sqrt(w @ cov_annual @ w)) * 100
            sh = (r / 100 - rf) / (s / 100) if s > 0 else 0.0
            return r, s, sh

        # ── Individual stocks ──
        for i, t in enumerate(corr_tickers):
            w = np.zeros(n_assets)
            w[i] = 1.0
            r, s, sh = _port_stats(w)
            efficient_frontier.append({
                "return": round(r, 2), "risk": round(s, 2),
                "sharpe": round(sh, 4), "label": t,
            })

        # ── Current portfolio point ──
        cur_w = np.array([h["weight"] / 100 for h in holdings_out])
        cur_ret, cur_risk, cur_sh = _port_stats(cur_w)
        efficient_frontier.append({
            "return": round(cur_ret, 2), "risk": round(cur_risk, 2),
            "sharpe": round(cur_sh, 4), "label": "Current",
        })

        # ── Equal-weight point ──
        eq_w = np.ones(n_assets) / n_assets
        eq_ret, eq_risk, eq_sh = _port_stats(eq_w)
        efficient_frontier.append({
            "return": round(eq_ret, 2), "risk": round(eq_risk, 2),
            "sharpe": round(eq_sh, 4), "label": "Equal Weight",
        })

        # ── Random portfolios (2000 for dense cloud) ──
        random_pts = []
        for _ in range(2000):
            w = rng.random(n_assets)
            w = w / w.sum()
            r, s, sh = _port_stats(w)
            pt = {"return": round(r, 2), "risk": round(s, 2), "sharpe": round(sh, 4), "label": None}
            random_pts.append(pt)
            efficient_frontier.append(pt)

        # ── Find max Sharpe & min volatility portfolios ──
        all_pts = random_pts + [
            {"return": round(cur_ret, 2), "risk": round(cur_risk, 2), "sharpe": round(cur_sh, 4)},
            {"return": round(eq_ret, 2), "risk": round(eq_risk, 2), "sharpe": round(eq_sh, 4)},
        ]
        max_sharpe_pt = max(all_pts, key=lambda p: p["sharpe"])
        min_vol_pt = min(all_pts, key=lambda p: p["risk"])

        efficient_frontier.append({
            "return": max_sharpe_pt["return"], "risk": max_sharpe_pt["risk"],
            "sharpe": max_sharpe_pt["sharpe"], "label": "Max Sharpe",
        })
        efficient_frontier.append({
            "return": min_vol_pt["return"], "risk": min_vol_pt["risk"],
            "sharpe": min_vol_pt["sharpe"], "label": "Min Volatility",
        })

        # ── Efficient frontier boundary (upper envelope) ──
        # Bin by risk, take max return in each bin → upper boundary
        if random_pts:
            risk_vals = [p["risk"] for p in random_pts]
            r_min, r_max = min(risk_vals), max(risk_vals)
            n_bins = 40
            boundary = []
            for b in range(n_bins + 1):
                edge_lo = r_min + (r_max - r_min) * b / n_bins - 0.5
                edge_hi = r_min + (r_max - r_min) * (b + 1) / n_bins + 0.5
                in_bin = [p for p in random_pts if edge_lo <= p["risk"] <= edge_hi]
                if in_bin:
                    best = max(in_bin, key=lambda p: p["return"])
                    boundary.append({"risk": best["risk"], "return": best["return"]})
            # Also compute lower boundary
            lower_boundary = []
            for b in range(n_bins + 1):
                edge_lo = r_min + (r_max - r_min) * b / n_bins - 0.5
                edge_hi = r_min + (r_max - r_min) * (b + 1) / n_bins + 0.5
                in_bin = [p for p in random_pts if edge_lo <= p["risk"] <= edge_hi]
                if in_bin:
                    worst = min(in_bin, key=lambda p: p["return"])
                    lower_boundary.append({"risk": worst["risk"], "return": worst["return"]})

        # ── Capital Market Line (from rf through max Sharpe tangent) ──
        cml = None
        if max_sharpe_pt["risk"] > 0:
            cml_slope = (max_sharpe_pt["return"] / 100 - rf) / (max_sharpe_pt["risk"] / 100)
            # Line from (0, rf) to extended point
            cml_end_risk = r_max * 1.15 if random_pts else max_sharpe_pt["risk"] * 2
            cml_end_ret = (rf + cml_slope * cml_end_risk / 100) * 100
            cml = {
                "startRisk": 0, "startReturn": round(rf * 100, 2),
                "endRisk": round(cml_end_risk, 2), "endReturn": round(cml_end_ret, 2),
            }

    # Package frontier metadata
    ef_meta = {}
    if efficient_frontier:
        ef_meta["cml"] = cml if 'cml' in locals() else None
        ef_meta["boundary"] = boundary if 'boundary' in locals() else []
        ef_meta["lowerBoundary"] = lower_boundary if 'lower_boundary' in locals() else []

    # ── Factor Exposure (radar) ──
    factor_exposure = {}
    if parsed and info_data:
        # Compute weighted factor scores (0-100 scale)
        scores = {"growth": [], "value": [], "size": [], "momentum": [], "volatility": [], "quality": []}

        for h in holdings_out:
            t = h["ticker"]
            info = info_data.get(t, {})
            w = h["weight"] / 100

            # Growth: inverse PE/PEG (high PE → high growth), clamp 0-100
            pe = _safe_num(info.get("trailingPE")) or _safe_num(info.get("forwardPE"))
            rev_growth = _safe_num(info.get("revenueGrowth"))
            growth_raw = min(100, max(0, (pe or 20) * 2 + (rev_growth or 0) * 200)) if pe else 50
            scores["growth"].append(growth_raw * w)

            # Value: high div yield + low P/B → high value
            pb = _safe_num(info.get("priceToBook"))
            dy = (_safe_num(info.get("dividendYield")) or 0) * 100
            value_raw = min(100, max(0, (1 / pb * 20 if pb and pb > 0 else 30) + dy * 10))
            scores["value"].append(value_raw * w)

            # Size: market cap → log scale
            mc = _safe_num(info.get("marketCap"))
            if mc and mc > 0:
                # log10(1e9)=9, log10(1e12)=12; scale 9-12 → 0-100
                size_raw = min(100, max(0, (math.log10(mc) - 8) * 25))
            else:
                size_raw = 50
            scores["size"].append(size_raw * w)

            # Momentum: ann return of holding
            mom_raw = min(100, max(0, h["annReturn"] / 2 + 50))
            scores["momentum"].append(mom_raw * w)

            # Volatility: inverse (low vol = high score)
            vol_raw = min(100, max(0, 100 - h["annVolatility"]))
            scores["volatility"].append(vol_raw * w)

            # Quality: ROE + profit margin
            roe = (_safe_num(info.get("returnOnEquity")) or 0) * 100
            margin = (_safe_num(info.get("profitMargins")) or 0) * 100
            quality_raw = min(100, max(0, roe * 1.5 + margin))
            scores["quality"].append(quality_raw * w)

        for factor in scores:
            factor_exposure[factor] = round(sum(scores[factor]), 1)

    # ── Dividend Calendar ──
    dividend_history = []   # past payments
    dividend_upcoming = []  # real upcoming ex-dates + projected
    today_str = datetime.now().strftime("%Y-%m-%d")

    for h in holdings_out:
        t = h["ticker"]
        try:
            stock = yf.Ticker(t)
            divs = stock.dividends
            live_info = stock.info or {}

            # ── Real upcoming ex-dividend date from yfinance info ──
            ex_div_ts = live_info.get("exDividendDate")
            pay_date_ts = live_info.get("dividendDate")  # optional payment date
            last_div_val = _safe_num(live_info.get("lastDividendValue"))
            div_rate = _safe_num(live_info.get("dividendRate"))

            ex_div_date = None
            if ex_div_ts:
                try:
                    if isinstance(ex_div_ts, (int, float)):
                        ex_div_date = datetime.fromtimestamp(ex_div_ts).strftime("%Y-%m-%d")
                    else:
                        ex_div_date = str(ex_div_ts)[:10]
                except Exception:
                    pass

            pay_date = None
            if pay_date_ts:
                try:
                    if isinstance(pay_date_ts, (int, float)):
                        pay_date = datetime.fromtimestamp(pay_date_ts).strftime("%Y-%m-%d")
                    else:
                        pay_date = str(pay_date_ts)[:10]
                except Exception:
                    pass

            # Determine per-share amount for upcoming
            upcoming_amt = last_div_val or (div_rate / 4 if div_rate else None)

            if ex_div_date and ex_div_date >= today_str and upcoming_amt:
                dividend_upcoming.append({
                    "date": ex_div_date,
                    "payDate": pay_date,
                    "ticker": t,
                    "amount": round(upcoming_amt, 4),
                    "totalAmount": round(upcoming_amt * h["shares"], 2),
                    "shares": h["shares"],
                    "projected": False,
                })

            # ── Historical payments ──
            if divs is not None and len(divs) > 0:
                for dt, amt in divs.items():
                    d_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10]
                    dividend_history.append({
                        "date": d_str,
                        "ticker": t,
                        "amount": round(float(amt), 4),
                        "totalAmount": round(float(amt) * h["shares"], 2),
                        "shares": h["shares"],
                    })

                # ── Projected future payments (fill in beyond known upcoming) ──
                recent = divs.last("2Y") if len(divs) > 4 else divs
                if len(recent) >= 2:
                    dates_sorted = sorted(recent.index)
                    gaps = [(dates_sorted[i+1] - dates_sorted[i]).days for i in range(len(dates_sorted)-1)]
                    median_gap = sorted(gaps)[len(gaps)//2] if gaps else 90
                    last_date = dates_sorted[-1]
                    last_amt = float(recent.iloc[-1])
                    # Only project dates beyond the known upcoming ex-date
                    start_after = ex_div_date if ex_div_date and ex_div_date >= today_str else last_date.strftime("%Y-%m-%d")
                    proj_date = last_date
                    n_payments = max(1, int(365 / max(median_gap, 30)))
                    for _ in range(n_payments):
                        proj_date = proj_date + timedelta(days=median_gap)
                        d_str = proj_date.strftime("%Y-%m-%d")
                        if d_str <= start_after:
                            continue  # skip dates already covered by real upcoming
                        dividend_upcoming.append({
                            "date": d_str,
                            "payDate": None,
                            "ticker": t,
                            "amount": round(last_amt, 4),
                            "totalAmount": round(last_amt * h["shares"], 2),
                            "shares": h["shares"],
                            "projected": True,
                        })
        except Exception:
            pass

    # Sort
    dividend_history.sort(key=lambda x: x["date"])
    dividend_upcoming.sort(key=lambda x: x["date"])

    # Monthly aggregation for the bar chart (last 2y history + upcoming)
    div_monthly = {}
    for d in dividend_history:
        ym = d["date"][:7]
        div_monthly[ym] = div_monthly.get(ym, 0) + d["totalAmount"]
    for d in dividend_upcoming:
        ym = d["date"][:7]
        key = ym + "_proj"
        div_monthly[key] = div_monthly.get(key, 0) + d["totalAmount"]

    div_monthly_list = []
    for k, v in sorted(div_monthly.items()):
        projected = k.endswith("_proj")
        ym = k.replace("_proj", "")
        div_monthly_list.append({
            "month": ym,
            "amount": round(v, 2),
            "projected": projected,
        })

    # ── Summary ──
    total_gain = total_value - total_cost
    total_gain_pct = (total_gain / total_cost * 100) if total_cost > 0 else 0
    prev_value = port_values[-2] if len(port_values) >= 2 else port_values[-1]
    daily_change_dollar = total_value - prev_value
    daily_change_pct = (daily_change_dollar / prev_value * 100) if prev_value else 0

    return jsonify({
        "summary": {
            "totalValue": round(total_value, 2),
            "totalCost": round(total_cost, 2),
            "totalGain": round(total_gain, 2),
            "totalGainPct": round(total_gain_pct, 2),
            "dailyChange": round(daily_change_dollar, 2),
            "dailyChangePct": round(daily_change_pct, 2),
            "annualizedReturn": round(ann_return, 2),
            "annualizedVolatility": round(ann_vol, 2),
            "sharpeRatio": round(sharpe, 2),
            "sortinoRatio": round(sortino, 2),
            "maxDrawdown": round(max_dd, 2),
            "calmarRatio": round(calmar, 2),
            "var95": round(var_95, 2),
            "cvar95": round(cvar_95, 2),
            "weightedBeta": round(w_beta, 2) if beta_count > 0 else None,
            "holdingCount": len(parsed),
            "highCorrelationPct": high_corr_pct,
            "informationRatio": round(information_ratio, 2),
            "benchmarkReturn": round(benchmark_ann_return, 2),
            "hhi": hhi,
            "top5Weight": top5_weight,
            "effectivePositions": effective_positions,
            "annualDividendIncome": annual_dividend_income,
            "dividendYield": dividend_yield_portfolio,
        },
        "holdings": holdings_out,
        "sectors": sectors,
        "equityCurve": equity_curve,
        "benchmarkCurve": benchmark_curve,
        "drawdown": drawdown,
        "rollingVolatility": rolling_vol,
        "correlation": {
            "tickers": corr_tickers,
            "matrix": corr_matrix,
        },
        "monthlyReturns": monthly_returns,
        "bestDays": best_days,
        "worstDays": worst_days,
        "attribution": attribution,
        "riskContribution": risk_contribution,
        "riskParityWeights": risk_parity_weights,
        "riskParitySummary": {
            "annReturn": round(rp_ret, 2) if risk_parity_weights else None,
            "annVol": round(rp_vol, 2) if risk_parity_weights else None,
            "sharpe": round(rp_sharpe, 2) if risk_parity_weights else None,
        } if risk_parity_weights else None,
        "efficientFrontier": efficient_frontier,
        "efficientFrontierMeta": ef_meta,
        "factorExposure": factor_exposure,
        "dividendCalendar": dividend_history[-100:],
        "dividendUpcoming": dividend_upcoming,
        "dividendMonthly": div_monthly_list,
        "benchmarkLabel": benchmark_label,
        "period": period,
        "dataPoints": n_days,
    })


# ─────────────────────────────────────────────────────────
# What-If Scenario Simulator
# ─────────────────────────────────────────────────────────

@trading_bp.route("/api/portfolio/what-if", methods=["POST"])
def api_portfolio_what_if():
    """Simulate adding/removing a position and return projected metrics delta.

    Body JSON:
    {
      "holdings": [ ... current holdings ... ],
      "action": "add" | "remove" | "modify",
      "ticker": "NVDA",
      "shares": 5,
      "costBasis": 120,
      "period": "1y",
      "benchmark": "0050.TW"
    }
    """
    body = request.get_json(force=True, silent=True) or {}
    holdings = body.get("holdings", [])
    action = body.get("action", "add")
    ticker = (body.get("ticker") or "").upper().strip()
    shares = float(body.get("shares", 0))
    cost_basis = float(body.get("costBasis", 0))
    period = body.get("period", "1y")
    benchmark = body.get("benchmark", DEFAULT_BENCHMARK_TICKER)

    if not holdings or not isinstance(holdings, list):
        return jsonify({"error": "holdings array required"}), 400
    if not ticker:
        return jsonify({"error": "ticker required"}), 400
    ticker, err = _validate_ticker(ticker)
    if err:
        return jsonify({"error": err}), 400

    # Build modified holdings list
    import copy
    modified = copy.deepcopy(holdings)

    if action == "add":
        if shares <= 0:
            return jsonify({"error": "shares must be positive"}), 400
        # Check if already exists
        found = False
        for h in modified:
            if (h.get("ticker") or "").upper().strip() == ticker:
                h["shares"] = float(h.get("shares", 0)) + shares
                found = True
                break
        if not found:
            modified.append({"ticker": ticker, "shares": shares, "costBasis": cost_basis})

    elif action == "remove":
        modified = [h for h in modified if (h.get("ticker") or "").upper().strip() != ticker]
        if not modified:
            return jsonify({"error": "Cannot remove last holding"}), 400

    elif action == "modify":
        if shares <= 0:
            return jsonify({"error": "shares must be positive"}), 400
        found = False
        for h in modified:
            if (h.get("ticker") or "").upper().strip() == ticker:
                h["shares"] = shares
                if cost_basis > 0:
                    h["costBasis"] = cost_basis
                found = True
                break
        if not found:
            modified.append({"ticker": ticker, "shares": shares, "costBasis": cost_basis})

    else:
        return jsonify({"error": "action must be add, remove, or modify"}), 400

    # Quick analysis of both original and modified using internal helper
    def _quick_metrics(h_list):
        """Compute key portfolio metrics for a holdings list."""
        period_days = {"1m": 21, "3m": 63, "6m": 126, "1y": 252, "2y": 504, "5y": 1260}.get(period, 252)
        pd_map = {}
        tickers = list(dict.fromkeys(hh.get("ticker", "").upper().strip() for hh in h_list))
        tickers = [t for t in tickers if t]

        for t in tickers:
            bp = os.path.join(BATCH_DATA_DIR, f"{t}.json")
            prices = []
            if os.path.isfile(bp):
                try:
                    with open(bp) as f:
                        blob = json.load(f)
                    prices = blob.get("prices", [])
                except Exception:
                    pass
            if not prices:
                try:
                    df = fetch_daily_prices(t, period="5y")
                    if df is not None and not df.empty:
                        prices = [
                            {"date": r["Date"].strftime("%Y-%m-%d") if hasattr(r["Date"], "strftime") else str(r["Date"])[:10],
                             "close": float(r["Close"])}
                            for _, r in df.iterrows()
                        ]
                except Exception:
                    pass
            if prices:
                pd_map[t] = prices[-period_days:] if len(prices) >= period_days else prices

        valid = [t for t in tickers if t in pd_map]
        if not valid:
            return None

        date_sets = [set(p["date"] for p in pd_map[t]) for t in valid]
        common = sorted(set.intersection(*date_sets)) if date_sets else []
        if len(common) < 10:
            return None

        cl = {t: {p["date"]: p["close"] for p in pd_map[t]} for t in valid}
        ac = {t: [cl[t][d] for d in common] for t in valid}

        parsed_h = []
        for hh in h_list:
            t = hh.get("ticker", "").upper().strip()
            s = float(hh.get("shares", 0))
            if t in ac and s > 0:
                parsed_h.append({"ticker": t, "shares": s})

        if not parsed_h:
            return None

        pv = []
        for i in range(len(common)):
            v = sum(h["shares"] * ac[h["ticker"]][i] for h in parsed_h)
            pv.append(v)

        total_val = pv[-1]
        pr = [(pv[i] - pv[i-1]) / pv[i-1] for i in range(1, len(pv)) if pv[i-1] != 0]
        if not pr:
            return None

        arr = np.array(pr)
        ann_ret = float(np.mean(arr)) * 252 * 100
        ann_vol_v = float(np.std(arr)) * math.sqrt(252) * 100
        sharpe_v = (float(np.mean(arr)) * 252) / (float(np.std(arr)) * math.sqrt(252)) if np.std(arr) > 0 else 0
        neg = arr[arr < 0]
        ds = float(np.std(neg)) if len(neg) > 0 else 0
        sortino_v = (float(np.mean(arr)) * 252) / (ds * math.sqrt(252)) if ds > 0 else 0

        peak = pv[0]
        max_dd_v = 0
        for v in pv:
            if v > peak:
                peak = v
            dd = (v - peak) / peak * 100 if peak else 0
            if dd < max_dd_v:
                max_dd_v = dd

        var95 = float(np.percentile(arr, 5)) * 100
        tail = arr[arr <= np.percentile(arr, 5)]
        cvar95 = float(np.mean(tail)) * 100 if len(tail) > 0 else var95

        # Holdings weights
        hw = []
        for h in parsed_h:
            mv = h["shares"] * ac[h["ticker"]][-1]
            hw.append({"ticker": h["ticker"], "weight": round(mv / total_val * 100, 2) if total_val else 0})

        return {
            "totalValue": round(total_val, 2),
            "annualizedReturn": round(ann_ret, 2),
            "annualizedVolatility": round(ann_vol_v, 2),
            "sharpeRatio": round(sharpe_v, 2),
            "sortinoRatio": round(sortino_v, 2),
            "maxDrawdown": round(max_dd_v, 2),
            "var95": round(var95, 2),
            "cvar95": round(cvar95, 2),
            "holdingCount": len(parsed_h),
            "holdings": hw,
        }

    current_metrics = _quick_metrics(holdings)
    modified_metrics = _quick_metrics(modified)

    if not current_metrics or not modified_metrics:
        return jsonify({"error": "Insufficient price data for simulation"}), 404

    # Compute deltas
    delta = {}
    for key in ["annualizedReturn", "annualizedVolatility", "sharpeRatio", "sortinoRatio", "maxDrawdown", "var95", "cvar95"]:
        delta[key] = round(modified_metrics[key] - current_metrics[key], 2)

    return jsonify({
        "current": current_metrics,
        "modified": modified_metrics,
        "delta": delta,
        "action": action,
        "ticker": ticker,
        "shares": shares,
    })
