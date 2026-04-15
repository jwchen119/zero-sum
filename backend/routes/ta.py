"""
Technical Analysis blueprint — structural pattern recognition routes.

/api/ta/patterns   — Full analysis for a single ticker
/api/ta/trendlines — Just trendlines (lighter)
/api/ta/scan       — Scan multiple tickers for active setups
"""

import traceback

from flask import Blueprint, jsonify, request

from fetch_stock_data import fetch_daily_prices
from shared import _cache_get, _cache_put, _validate_ticker, logger
from ta_engine.analysis import analyze
from ta_engine.signals import generate_signals

ta_bp = Blueprint("ta", __name__)

_TA_CACHE_TTL = 3600  # 1 hour


def _load_price_data(ticker: str, period: str = "5y"):
    """Fetch OHLCV data and split into parallel arrays."""
    cache_key = f"{ticker}_{period}"
    cached = _cache_get("prices", cache_key)

    if cached and "data" in cached:
        bars = cached["data"]
    else:
        df = fetch_daily_prices(ticker, period=period)
        if df.empty:
            return None
        df = df.dropna(subset=["Open", "High", "Low", "Close", "Volume"])
        bars = []
        for _, row in df.iterrows():
            bars.append({
                "time": row["Date"].strftime("%Y-%m-%d"),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "close": round(row["Close"], 2),
                "volume": int(row["Volume"]),
            })

    return bars


@ta_bp.route("/api/ta/patterns", methods=["GET"])
def api_ta_patterns():
    """Full structural pattern analysis for a ticker."""
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err

    period = request.args.get("period", "5y")

    # Check cache
    cache_key = f"ta_{ticker}_{period}"
    cached = _cache_get("ta_patterns", cache_key, ttl=_TA_CACHE_TTL)
    if cached is not None:
        return jsonify(cached)

    try:
        bars = _load_price_data(ticker, period)
        if not bars:
            return jsonify({"error": f"No price data for '{ticker}'"}), 404

        times = [b["time"] for b in bars]
        opens = [b["open"] for b in bars]
        highs = [b["high"] for b in bars]
        lows = [b["low"] for b in bars]
        closes = [b["close"] for b in bars]
        volumes = [b["volume"] for b in bars]

        result = analyze(times, opens, highs, lows, closes, volumes)
        result["ticker"] = ticker
        result["period"] = period

        _cache_put("ta_patterns", cache_key, result)
        return jsonify(result)

    except Exception as e:
        logger.error(f"TA analysis failed for {ticker}: {e}")
        traceback.print_exc()
        return jsonify({"error": "TA analysis failed"}), 500


@ta_bp.route("/api/ta/trendlines", methods=["GET"])
def api_ta_trendlines():
    """Lightweight endpoint: just trendlines for chart overlay."""
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err

    period = request.args.get("period", "5y")

    cache_key = f"ta_{ticker}_{period}"
    cached = _cache_get("ta_patterns", cache_key, ttl=_TA_CACHE_TTL)
    if cached is not None:
        return jsonify({
            "ticker": ticker,
            "trendlines": cached.get("trendlines", {}),
            "key_levels": cached.get("key_levels", []),
        })

    try:
        bars = _load_price_data(ticker, period)
        if not bars:
            return jsonify({"error": f"No price data for '{ticker}'"}), 404

        times = [b["time"] for b in bars]
        opens = [b["open"] for b in bars]
        highs = [b["high"] for b in bars]
        lows = [b["low"] for b in bars]
        closes = [b["close"] for b in bars]
        volumes = [b["volume"] for b in bars]

        result = analyze(times, opens, highs, lows, closes, volumes)
        result["ticker"] = ticker
        result["period"] = period

        # Cache full result for next time
        _cache_put("ta_patterns", cache_key, result)

        return jsonify({
            "ticker": ticker,
            "trendlines": result.get("trendlines", {}),
            "key_levels": result.get("key_levels", []),
        })

    except Exception as e:
        logger.error(f"TA trendlines failed for {ticker}: {e}")
        traceback.print_exc()
        return jsonify({"error": "Trendline analysis failed"}), 500


@ta_bp.route("/api/ta/signals", methods=["GET"])
def api_ta_signals():
    """Curated trading signals for a ticker."""
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err

    period = request.args.get("period", "5y")

    # Use the full analysis cache (signals are embedded in it)
    cache_key = f"ta_{ticker}_{period}"
    cached = _cache_get("ta_patterns", cache_key, ttl=_TA_CACHE_TTL)
    if cached is not None and "signals" in cached:
        return jsonify({"ticker": ticker, **cached["signals"]})

    try:
        bars = _load_price_data(ticker, period)
        if not bars:
            return jsonify({"error": f"No price data for '{ticker}'"}), 404

        times = [b["time"] for b in bars]
        opens = [b["open"] for b in bars]
        highs = [b["high"] for b in bars]
        lows = [b["low"] for b in bars]
        closes = [b["close"] for b in bars]
        volumes = [b["volume"] for b in bars]

        result = analyze(times, opens, highs, lows, closes, volumes)
        result["ticker"] = ticker
        result["period"] = period
        _cache_put("ta_patterns", cache_key, result)

        signals = result.get("signals", {})
        return jsonify({"ticker": ticker, **signals})

    except Exception as e:
        logger.error(f"TA signals failed for {ticker}: {e}")
        traceback.print_exc()
        return jsonify({"error": "Signal analysis failed"}), 500


@ta_bp.route("/api/ta/scan", methods=["GET"])
def api_ta_scan():
    """
    Scan multiple tickers for active setups.
    Query params:
      tickers — comma-separated (default: top 20 coverage tickers)
      min_confidence — minimum confidence threshold (default: 0.5)
    """
    tickers_param = request.args.get("tickers", "")
    try:
        min_conf = float(request.args.get("min_confidence", "0.5"))
    except (ValueError, TypeError):
        min_conf = 0.5

    if tickers_param:
        tickers = [t.strip().upper() for t in tickers_param.split(",") if t.strip()]
    else:
        # Default scan list
        tickers = [
            "AAPL", "MSFT", "GOOG", "AMZN", "META", "NVDA", "TSLA",
            "JPM", "V", "JNJ", "ORCL", "AVGO", "ADBE", "CRM",
            "AMD", "NFLX", "COST", "PG", "XOM", "BA",
        ]

    all_setups: list[dict] = []
    errors: list[dict] = []

    for ticker in tickers[:30]:  # cap at 30
        try:
            cache_key = f"ta_{ticker}_5y"
            cached = _cache_get("ta_patterns", cache_key, ttl=_TA_CACHE_TTL)

            if cached is not None:
                result = cached
            else:
                bars = _load_price_data(ticker, "5y")
                if not bars:
                    errors.append({"ticker": ticker, "error": "No data"})
                    continue

                times = [b["time"] for b in bars]
                opens = [b["open"] for b in bars]
                highs_arr = [b["high"] for b in bars]
                lows_arr = [b["low"] for b in bars]
                closes_arr = [b["close"] for b in bars]
                volumes_arr = [b["volume"] for b in bars]

                result = analyze(times, opens, highs_arr, lows_arr, closes_arr, volumes_arr)
                result["ticker"] = ticker
                result["period"] = "5y"
                _cache_put("ta_patterns", cache_key, result)

            for setup in result.get("active_setups", []):
                if setup.get("confidence", 0) >= min_conf:
                    setup["ticker"] = ticker
                    setup["current_price"] = result.get("current_price")
                    all_setups.append(setup)

        except Exception as e:
            errors.append({"ticker": ticker, "error": str(e)})

    all_setups.sort(key=lambda s: -s.get("confidence", 0))

    return jsonify({
        "scanned": len(tickers),
        "setups": all_setups,
        "errors": errors if errors else None,
    })
