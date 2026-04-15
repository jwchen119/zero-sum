"""
System status and observability endpoint.
Reports scheduler job results, cache freshness, circuit breaker state,
and per-ticker data quality — so operators can see at a glance whether
stock data is up to date.
"""

import json
import os
import time
from datetime import datetime, timezone

from flask import Blueprint, jsonify

from shared import CACHE_DIR, BATCH_DATA_DIR, LISTINGS_DIR, ANALYSIS_DIR, logger

status_bp = Blueprint("status", __name__)

# ─── Scheduler result log (written by scheduler, read here) ──

_RESULTS_FILE = os.path.join(CACHE_DIR, "_scheduler_results.json")
_STATE_FILE = os.path.join(CACHE_DIR, "_scheduler_state.json")


def _read_json(path: str):
    """Read a JSON file, return None on any error."""
    try:
        if os.path.exists(path):
            with open(path) as f:
                return json.load(f)
    except Exception:
        return None
    return None


def _file_age_seconds(path: str) -> float | None:
    """Return seconds since file was last modified, or None if missing."""
    try:
        return time.time() - os.path.getmtime(path)
    except OSError:
        return None


def _file_mtime_iso(path: str) -> str | None:
    """Return ISO timestamp of file modification time, or None."""
    try:
        return datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc).isoformat()
    except OSError:
        return None


def _cache_namespace_status(namespace: str, key: str = "latest") -> dict:
    """Get freshness info for a cache namespace/key."""
    path = os.path.join(CACHE_DIR, namespace, f"{key}.json")
    age = _file_age_seconds(path)
    return {
        "exists": os.path.exists(path),
        "lastUpdated": _file_mtime_iso(path),
        "ageSeconds": round(age) if age is not None else None,
        "ageHuman": _humanize_seconds(age) if age is not None else "missing",
    }


def _humanize_seconds(s: float | None) -> str:
    """Convert seconds to human-readable age string."""
    if s is None:
        return "unknown"
    s = int(s)
    if s < 60:
        return f"{s}s"
    if s < 3600:
        return f"{s // 60}m {s % 60}s"
    if s < 86400:
        h = s // 3600
        m = (s % 3600) // 60
        return f"{h}h {m}m"
    d = s // 86400
    h = (s % 86400) // 3600
    return f"{d}d {h}h"


def _batch_data_summary() -> dict:
    """Analyze all batch_data files for coverage and freshness."""
    if not os.path.isdir(BATCH_DATA_DIR):
        return {"totalFiles": 0, "tickers": [], "errors": ["batch_data directory missing"]}

    files = [f for f in os.listdir(BATCH_DATA_DIR) if f.endswith(".json")]
    total = len(files)
    now = time.time()

    fresh = 0       # < 24h old
    stale = 0       # 24-48h old
    very_stale = 0  # > 48h old
    errors = []
    stale_tickers = []
    empty_tickers = []
    oldest_age = 0
    newest_age = float("inf") if files else 0
    ages = []

    for fname in files:
        path = os.path.join(BATCH_DATA_DIR, fname)
        sym = fname.replace(".json", "")
        age = now - os.path.getmtime(path)
        ages.append(age)

        if age > oldest_age:
            oldest_age = age
        if age < newest_age:
            newest_age = age

        if age < 86400:
            fresh += 1
        elif age < 172800:
            stale += 1
            stale_tickers.append(sym)
        else:
            very_stale += 1
            stale_tickers.append(sym)

        # Check data quality
        try:
            with open(path) as f:
                data = json.load(f)
            info = data.get("info", {})
            prices = data.get("prices", [])
            if len(info) < 10:
                empty_tickers.append({"ticker": sym, "issue": "sparse info", "infoFields": len(info)})
            if not prices:
                empty_tickers.append({"ticker": sym, "issue": "no prices"})
        except Exception as exc:
            errors.append({"ticker": sym, "issue": f"read error: {exc}"})

    return {
        "totalFiles": total,
        "fresh": fresh,
        "stale": stale,
        "veryStale": very_stale,
        "oldestAgeSeconds": round(oldest_age),
        "oldestAgeHuman": _humanize_seconds(oldest_age),
        "newestAgeSeconds": round(newest_age) if files else None,
        "newestAgeHuman": _humanize_seconds(newest_age) if files else "n/a",
        "medianAgeHuman": _humanize_seconds(sorted(ages)[len(ages) // 2]) if ages else "n/a",
        "staleTickers": stale_tickers[:50],
        "dataQualityIssues": empty_tickers[:50],
        "readErrors": errors[:20],
    }


def _listings_status() -> dict:
    """Check presence and freshness of listing files."""
    result = {}
    for name in ["twse"]:
        path = os.path.join(LISTINGS_DIR, f"{name}.json")
        info = {
            "exists": os.path.exists(path),
            "lastUpdated": _file_mtime_iso(path),
            "ageHuman": _humanize_seconds(_file_age_seconds(path)),
        }
        if os.path.exists(path):
            try:
                with open(path) as f:
                    data = json.load(f)
                info["count"] = data.get("count", len(data.get("stocks", [])))
            except Exception:
                info["count"] = None
        result[name] = info
    return result


def _analysis_status() -> dict:
    """Check AI analysis coverage with per-file staleness."""
    if not os.path.isdir(ANALYSIS_DIR):
        return {"totalFiles": 0, "tickers": [], "details": []}
    files = [f for f in os.listdir(ANALYSIS_DIR) if f.endswith(".json")]
    details = []
    for f in sorted(files):
        path = os.path.join(ANALYSIS_DIR, f)
        age_sec = _file_age_seconds(path)
        age_hours = round(age_sec / 3600, 1) if age_sec else None
        details.append({
            "ticker": f.replace(".json", ""),
            "ageHours": age_hours,
            "stale": age_hours is not None and age_hours > 168,  # >7 days
            "lastUpdated": _file_mtime_iso(path),
        })
    return {
        "totalFiles": len(files),
        "tickers": sorted([f.replace(".json", "") for f in files]),
        "details": details,
    }


def _heatmap_cache_status() -> dict:
    """Check heatmap precomputed disk cache freshness."""
    return _disk_cache_dir_status(os.path.join(CACHE_DIR, "heatmap"))


def _sector_analysis_cache_status() -> dict:
    """Check sector analysis precomputed disk cache freshness."""
    return _disk_cache_dir_status(os.path.join(CACHE_DIR, "sector_analysis"))


def _disk_cache_dir_status(cache_dir: str) -> dict:
    """Generic status for a directory of precomputed JSON cache files."""
    if not os.path.isdir(cache_dir):
        return {"exists": False, "files": [], "totalFiles": 0}

    files_info = []
    for fname in sorted(os.listdir(cache_dir)):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(cache_dir, fname)
        age = _file_age_seconds(fpath)
        size_kb = None
        try:
            size_kb = round(os.path.getsize(fpath) / 1024)
        except OSError:
            pass
        files_info.append({
            "name": fname.replace(".json", ""),
            "lastUpdated": _file_mtime_iso(fpath),
            "ageSeconds": round(age) if age is not None else None,
            "ageHuman": _humanize_seconds(age) if age is not None else "missing",
            "sizeKB": size_kb,
        })

    oldest_age = max((f["ageSeconds"] for f in files_info if f["ageSeconds"] is not None), default=None)
    newest_age = min((f["ageSeconds"] for f in files_info if f["ageSeconds"] is not None), default=None)

    return {
        "exists": True,
        "totalFiles": len(files_info),
        "files": files_info,
        "oldestAgeHuman": _humanize_seconds(oldest_age) if oldest_age is not None else "n/a",
        "newestAgeHuman": _humanize_seconds(newest_age) if newest_age is not None else "n/a",
    }


def _earnings_triggers() -> list:
    """Read the earnings trigger log."""
    log_file = os.path.join(CACHE_DIR, "_earnings_triggers.json")
    return _read_json(log_file) or []


def _news_status() -> dict:
    """Summarize stock news and AI news summary cache."""
    result = {}
    for ns, label in [("stock_news", "stockNews"), ("news_summary", "newsSummary")]:
        ns_dir = os.path.join(CACHE_DIR, ns)
        if not os.path.isdir(ns_dir):
            result[label] = {"totalFiles": 0, "tickers": [], "oldestAgeHuman": "n/a", "newestAgeHuman": "n/a"}
            continue

        files = [f for f in os.listdir(ns_dir) if f.endswith(".json")]
        now = time.time()
        ages = []
        tickers = []
        details = []

        for fname in sorted(files):
            sym = fname.replace(".json", "").upper()
            tickers.append(sym)
            path = os.path.join(ns_dir, fname)
            age = now - os.path.getmtime(path)
            ages.append(age)
            details.append({
                "ticker": sym,
                "ageSeconds": round(age),
                "ageHuman": _humanize_seconds(age),
                "lastUpdated": _file_mtime_iso(path),
                "stale": age > (1800 if ns == "stock_news" else 3600),
            })

        result[label] = {
            "totalFiles": len(files),
            "tickers": tickers,
            "oldestAgeHuman": _humanize_seconds(max(ages)) if ages else "n/a",
            "newestAgeHuman": _humanize_seconds(min(ages)) if ages else "n/a",
            "details": details,
        }
    return result


@status_bp.route("/api/system-status")
def api_system_status():
    """Comprehensive system status for observability dashboard."""
    # 1. Scheduler state (last run times)
    scheduler_state = _read_json(_STATE_FILE) or {}

    # 2. Scheduler job results (success/fail/duration per job)
    scheduler_results = _read_json(_RESULTS_FILE) or {}

    # 3. Cache freshness per namespace
    cache_freshness = {}
    for ns in ["market_summary", "sector_performance", "market_movers",
               "etf_overview", "market_news", "earnings_calendar", "twse_dividends"]:
        cache_freshness[ns] = _cache_namespace_status(ns)

    # 4. Batch data summary
    batch_summary = _batch_data_summary()

    # 5. Listings status
    listings = _listings_status()

    # 6. AI analysis coverage
    analysis = _analysis_status()

    # 7. News cache status
    news = _news_status()

    # 8. Compute overall health
    issues = []
    # Check if scheduler has run recently
    last_t1 = scheduler_state.get("last_tier1")
    if last_t1 and (time.time() - last_t1) > 3600:
        issues.append(f"Tier 1 last ran {_humanize_seconds(time.time() - last_t1)} ago (expected <30m)")
    last_t2 = scheduler_state.get("last_tier2")
    if last_t2 and (time.time() - last_t2) > 18000:
        issues.append(f"Tier 2 last ran {_humanize_seconds(time.time() - last_t2)} ago (expected <5h)")

    # Check critical caches
    for ns in ["market_summary", "sector_performance"]:
        info = cache_freshness[ns]
        if not info["exists"]:
            issues.append(f"{ns} cache missing")
        elif info["ageSeconds"] and info["ageSeconds"] > 3600:
            issues.append(f"{ns} is {info['ageHuman']} old (expected <1h)")

    # Check batch data staleness
    if batch_summary["totalFiles"] == 0:
        issues.append("No batch data files — stock data unavailable")
    elif batch_summary["veryStale"] > 10:
        issues.append(f"{batch_summary['veryStale']} tickers with data >48h old")
    if batch_summary.get("readErrors"):
        issues.append(f"{len(batch_summary['readErrors'])} batch files have read errors")

    # Check listings
    if not listings.get("twse", {}).get("exists"):
        issues.append("TWSE listings missing")

    health = "healthy" if not issues else ("degraded" if len(issues) <= 3 else "unhealthy")

    # 9. Heatmap disk cache status
    heatmap = _heatmap_cache_status()

    # 10. Sector analysis disk cache status
    sector_analysis = _sector_analysis_cache_status()

    return jsonify({
        "health": health,
        "issues": issues,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scheduler": {
            "state": scheduler_state,
            "jobResults": scheduler_results,
        },
        "cacheFreshness": cache_freshness,
        "batchData": batch_summary,
        "listings": listings,
        "analysis": analysis,
        "news": news,
        "heatmapCache": heatmap,
        "sectorAnalysisCache": sector_analysis,
        "earningsTriggers": _earnings_triggers(),
    })
