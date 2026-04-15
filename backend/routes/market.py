"""
Market blueprint: real-time market data endpoints —
market-summary, sector-performance, market-movers, earnings-calendar,
market-news, etf-overview, and the combined landing endpoint.

All market-wide endpoints are CACHE-ONLY: they return data written by the
scheduler.  On cache miss they return stale data if available, or empty
but valid JSON — they never hit Yahoo Finance directly.
"""

import json
import os
from datetime import datetime

from flask import Blueprint, jsonify

from shared import (
    ENABLE_CONGRESS_TRADES,
    _cache_get,
    _cache_get_market,
    _cache_get_stale,
    _cache_path,
    logger,
)

market_bp = Blueprint("market", __name__)


@market_bp.route("/api/market-summary")
def api_market_summary():
    cached = _cache_get_market("market_summary", "latest")
    if cached is not None:
        return jsonify(cached)
    # Stale fallback — scheduler hasn't refreshed yet
    stale = _cache_get_stale("market_summary", "latest")
    if stale is not None:
        return jsonify(stale)
    # Cold start — return empty but valid structure
    return jsonify({"items": [], "marketStatus": {"status": "unknown", "message": ""}, "generatedAt": None})


@market_bp.route("/api/sector-performance")
def api_sector_performance():
    cached = _cache_get_market("sector_performance", "latest")
    if cached is not None:
        return jsonify(cached)
    stale = _cache_get_stale("sector_performance", "latest")
    if stale is not None:
        return jsonify(stale)
    return jsonify({"sectors": [], "generatedAt": None})


@market_bp.route("/api/market-movers")
def api_market_movers():
    cached = _cache_get_market("market_movers", "latest")
    if cached is not None:
        return jsonify(cached)
    stale = _cache_get_stale("market_movers", "latest")
    if stale is not None:
        return jsonify(stale)
    return jsonify({"gainers": [], "losers": [], "mostActive": [], "generatedAt": None})


@market_bp.route("/api/earnings-calendar")
def api_earnings_calendar():
    cached = _cache_get("earnings_calendar", "latest", ttl=3600)
    if cached is None:
        cached = _cache_get_stale("earnings_calendar", "latest")
    if cached is not None:
        # Scheduler writes "events" key; frontend expects "earnings"
        if "earnings" not in cached and "events" in cached:
            cached["earnings"] = cached["events"]
        return jsonify(cached)
    return jsonify({"earnings": [], "events": [], "generatedAt": None})


@market_bp.route("/api/market-news")
def api_market_news():
    path = _cache_path("market_news", "latest")
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                data = json.load(f)
            # Scheduler writes "news" key; frontend expects "articles"
            if "articles" not in data and "news" in data:
                data["articles"] = data["news"]
            return jsonify(data)
        except Exception:
            pass
    return jsonify({"news": [], "articles": [], "generatedAt": None})


@market_bp.route("/api/etf-overview")
def api_etf_overview():
    cached = _cache_get_market("etf_overview", "latest")
    if cached is not None:
        return jsonify(cached)
    stale = _cache_get_stale("etf_overview", "latest")
    if stale is not None:
        return jsonify(stale)
    return jsonify({"etfs": [], "generatedAt": None})


# ─── Combined landing endpoint ───────────────────────────

_LANDING_CACHE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "cache", "landing", "latest.json"
)
os.makedirs(os.path.dirname(_LANDING_CACHE_PATH), exist_ok=True)


def rebuild_landing_cache():
    """Build the full landing payload and write it to disk.

    Called by the scheduler after each Tier 1 run so that /api/landing
    serves a single pre-built JSON file instantly.
    """
    import concurrent.futures

    # Import Flask app for request context
    from app import app

    def _fetch_section(name, fn):
        try:
            with app.test_request_context():
                resp = fn()
                return name, resp.get_json()
        except Exception as exc:
            logger.warning(f"[landing-cache] Error fetching {name}: {exc}")
            return name, None

    sections = [
        ("marketSummary",    api_market_summary),
        ("sectorPerformance", api_sector_performance),
        ("marketMovers",     api_market_movers),
        ("earningsCalendar", api_earnings_calendar),
        ("marketNews",       api_market_news),
    ]

    result = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        futures = [pool.submit(_fetch_section, name, fn) for name, fn in sections]

        from routes.core import api_coverage_tickers
        futures.append(pool.submit(_fetch_section, "coverageTickers", api_coverage_tickers))
        futures.append(pool.submit(_fetch_section, "etfOverview", api_etf_overview))

        def _landing_congress():
            if not ENABLE_CONGRESS_TRADES:
                return {
                    "trades": [],
                    "summary": {
                        "totalBuys": 0,
                        "totalSells": 0,
                        "uniqueTickers": 0,
                        "mostTraded": [],
                        "partyBreakdown": {
                            "D": {"total": 0, "buys": 0, "sells": 0},
                            "R": {"total": 0, "buys": 0, "sells": 0},
                        },
                    },
                    "totalCount": 0,
                }
            from routes.alternative import _build_congress_trades
            data = _build_congress_trades()
            trades = data.get("trades", [])[:10]
            return {
                "trades": trades,
                "summary": data.get("summary", {}),
                "totalCount": data.get("totalCount", 0),
            }

        def _landing_insiders():
            from shared import BATCH_DATA_DIR
            cutoff = datetime.now().timestamp() - 90 * 86400
            import glob as _glob
            txns = []
            for fpath in _glob.glob(os.path.join(BATCH_DATA_DIR, "*.json")):
                try:
                    with open(fpath) as f:
                        blob = json.load(f)
                except Exception:
                    continue
                symbol = blob.get("_ticker", os.path.basename(fpath).replace(".json", ""))
                info = blob.get("info", {})
                company = info.get("shortName", symbol)
                for tx in blob.get("insider_transactions", []):
                    raw_date = tx.get("Start Date", "")
                    if not raw_date:
                        continue
                    try:
                        dt_str = raw_date.replace("Z", "+00:00").split("T")[0]
                        dt = datetime.fromisoformat(dt_str)
                    except Exception:
                        continue
                    if dt.timestamp() < cutoff:
                        continue
                    value = tx.get("Value") or 0
                    text = (tx.get("Text") or "").lower()
                    if "purchase" in text or "buy" in text:
                        kind = "buy"
                    elif "sale" in text or "sold" in text:
                        kind = "sell"
                    else:
                        continue
                    if value < 100000:
                        continue
                    txns.append({
                        "ticker": symbol,
                        "company": company[:40],
                        "insider": tx.get("Insider", ""),
                        "position": tx.get("Position", ""),
                        "type": kind,
                        "date": dt.strftime("%Y-%m-%d"),
                        "shares": tx.get("Shares") or 0,
                        "value": value,
                    })
            txns.sort(key=lambda x: (x["date"], x["value"]), reverse=True)
            return {"transactions": txns[:12]}

        futures.append(pool.submit(
            lambda: ("congressTrades", _landing_congress())))
        futures.append(pool.submit(
            lambda: ("insiderTrades", _landing_insiders())))

        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            if isinstance(r, tuple) and len(r) == 2:
                name, data = r
                result[name] = data

    result["_cachedAt"] = datetime.now().isoformat()

    import tempfile
    try:
        fd, tmp = tempfile.mkstemp(
            dir=os.path.dirname(_LANDING_CACHE_PATH), suffix=".tmp"
        )
        with os.fdopen(fd, "w") as f:
            json.dump(result, f, default=str)
        os.replace(tmp, _LANDING_CACHE_PATH)
        logger.info("[landing-cache] Rebuilt (%d sections)", len(result))
    except Exception as exc:
        logger.error("[landing-cache] Write failed: %s", exc)


@market_bp.route("/api/landing", methods=["GET"])
def api_landing():
    """Returns all home page data from the pre-built cache file.

    The cache is rebuilt by the scheduler every Tier 1 cycle.
    On cold start (no cache file yet), rebuild inline (slow, once).
    """
    # Fast path: serve pre-built cache file
    try:
        if os.path.exists(_LANDING_CACHE_PATH):
            with open(_LANDING_CACHE_PATH, "r") as f:
                data = json.load(f)
            return jsonify(data)
    except Exception as exc:
        logger.warning("[landing] Cache read failed: %s", exc)

    # Cold start fallback: build inline and cache for next time
    logger.info("[landing] No cache file — building inline (slow, one-time)")
    rebuild_landing_cache()

    try:
        with open(_LANDING_CACHE_PATH, "r") as f:
            data = json.load(f)
        return jsonify(data)
    except Exception:
        return jsonify({})
