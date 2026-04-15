"""
Shared infrastructure: caching, validation, helpers, constants.
Imported by all blueprint modules.
"""

import json
import logging
import math
import os
import re
import threading
from collections import OrderedDict
from datetime import datetime

logger = logging.getLogger(__name__)

# ─── Directories ──────────────────────────────────────────

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "raw_data")
os.makedirs(RAW_DATA_DIR, exist_ok=True)

BATCH_DATA_DIR = os.path.join(os.path.dirname(__file__), "cache", "batch_data")

LISTINGS_DIR = os.path.join(os.path.dirname(__file__), "cache", "listings")

ANALYSIS_DIR = os.path.join(os.path.dirname(__file__), "static_analysis")
os.makedirs(ANALYSIS_DIR, exist_ok=True)

# ─── Cache TTLs ──────────────────────────────────────────

CACHE_TTL = int(os.environ.get("CACHE_TTL_SECONDS", 4 * 3600))
MARKET_CACHE_TTL = int(os.environ.get("MARKET_CACHE_TTL_SECONDS", 300))

# ─── In-memory LRU cache ────────────────────────────────

_mem_cache: OrderedDict = OrderedDict()
_mem_cache_lock = threading.Lock()
_MEM_CACHE_MAX = 200

# ─── Input validation ───────────────────────────────────

_VALID_TICKER = re.compile(r"^[A-Z0-9]{1,10}(\.[A-Z]{1,4})?$")


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


ENABLE_CONGRESS_TRADES = _env_flag("ENABLE_CONGRESS_TRADES", False)


def _validate_ticker(ticker: str):
    """Return (clean_ticker, error_response) — error_response is None if valid."""
    from flask import jsonify
    t = (ticker or "").strip().upper()
    if not t:
        return t, (jsonify({"error": "Missing 'ticker' parameter"}), 400)
    if not _VALID_TICKER.match(t):
        return t, (jsonify({"error": "Invalid ticker format"}), 400)
    return t, None


# ─── File-based + memory cache ───────────────────────────

def _cache_path(namespace: str, key: str) -> str:
    """Return the file path for a cache entry, with path-traversal protection."""
    ns_dir = os.path.join(CACHE_DIR, namespace)
    os.makedirs(ns_dir, exist_ok=True)
    safe_key = re.sub(r"[^A-Za-z0-9_-]", "_", key)
    result = os.path.join(ns_dir, f"{safe_key}.json")
    if not os.path.realpath(result).startswith(os.path.realpath(CACHE_DIR)):
        raise ValueError(f"Cache path escapes cache directory: {key}")
    return result


def _cache_get(namespace: str, key: str, ttl: int | None = None):
    """Return cached data if it exists and is within TTL, else None.
    Optional `ttl` overrides the global CACHE_TTL for this lookup."""
    effective_ttl = ttl if ttl is not None else CACHE_TTL
    mem_key = f"{namespace}/{key}"
    now = datetime.now().timestamp()

    with _mem_cache_lock:
        entry = _mem_cache.get(mem_key)
        if entry and (now - entry["ts"]) < effective_ttl:
            return entry["data"]

    path = _cache_path(namespace, key)
    try:
        if not os.path.exists(path):
            return None
        age = now - os.path.getmtime(path)
        if age > effective_ttl:
            return None
        with open(path, "r") as f:
            data = json.load(f)
        with _mem_cache_lock:
            if mem_key in _mem_cache:
                _mem_cache.move_to_end(mem_key)
            elif len(_mem_cache) >= _MEM_CACHE_MAX:
                _mem_cache.popitem(last=False)
            _mem_cache[mem_key] = {"data": data, "ts": now}
        return data
    except Exception as exc:
        logger.warning("Cache read error %s/%s: %s", namespace, key, exc)
        return None


def _cache_put(namespace: str, key: str, data):
    """Write data to cache (disk + memory)."""
    path = _cache_path(namespace, key)
    mem_key = f"{namespace}/{key}"
    now = datetime.now().timestamp()
    try:
        with open(path, "w") as f:
            json.dump(data, f, default=str)
        with _mem_cache_lock:
            if mem_key in _mem_cache:
                _mem_cache.move_to_end(mem_key)
            elif len(_mem_cache) >= _MEM_CACHE_MAX:
                _mem_cache.popitem(last=False)
            _mem_cache[mem_key] = {"data": data, "ts": now}
    except Exception as exc:
        logger.warning("Cache write error %s/%s: %s", namespace, key, exc)


def _cache_get_market(namespace: str, key: str):
    """Like _cache_get but uses the shorter market TTL."""
    mem_key = f"{namespace}/{key}"
    now = datetime.now().timestamp()

    with _mem_cache_lock:
        entry = _mem_cache.get(mem_key)
        if entry and (now - entry["ts"]) < MARKET_CACHE_TTL:
            return entry["data"]

    path = _cache_path(namespace, key)
    try:
        if not os.path.exists(path):
            return None
        age = now - os.path.getmtime(path)
        if age > MARKET_CACHE_TTL:
            return None
        with open(path, "r") as f:
            data = json.load(f)
        with _mem_cache_lock:
            if len(_mem_cache) >= _MEM_CACHE_MAX:
                oldest_key = min(_mem_cache, key=lambda k: _mem_cache[k]["ts"])
                del _mem_cache[oldest_key]
            _mem_cache[mem_key] = {"data": data, "ts": now}
        return data
    except Exception:
        return None


def _cache_get_stale(namespace: str, key: str):
    """Read cache file ignoring TTL — returns whatever is on disk, or None.
    Used as a fallback so API routes never hit Yahoo directly."""
    path = _cache_path(namespace, key)
    try:
        if not os.path.exists(path):
            return None
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return None


# ─── Helpers ────────────────────────────────────────────

def _safe_num(val):
    """Convert numpy/pandas numeric to Python float, or None."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None


def _period_label(col, quarterly):
    """Turn a pandas Timestamp column into '2024' or '2024-Q2'."""
    if quarterly:
        return f"{col.year}-Q{(col.month - 1) // 3 + 1}" if hasattr(col, "year") else str(col)[:7]
    return col.strftime("%Y") if hasattr(col, "strftime") else str(col)[:4]


def _serialize(val):
    """Make a value JSON-serializable."""
    if val is None:
        return None
    if isinstance(val, (int, float, str, bool)):
        if isinstance(val, float) and math.isnan(val):
            return None
        return val
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if isinstance(val, (list, tuple)):
        return [_serialize(v) for v in val]
    return str(val)


def _get_stock(ticker):
    """Return yfinance Ticker + info."""
    import yfinance as yf
    stock = yf.Ticker(ticker)
    info = dict(stock.info or {})
    return stock, info


# ─── Raw data dump ──────────────────────────────────────

_dump_lock = threading.Lock()


def _save_raw_dump(ticker: str, section: str, data):
    """Merge `data` under `section` key into raw_data/{TICKER}.json.
    Thread-safe via a simple lock so parallel endpoint calls don't clobber."""
    path = os.path.join(RAW_DATA_DIR, f"{ticker}.json")
    try:
        with _dump_lock:
            existing = {}
            if os.path.exists(path):
                try:
                    with open(path, "r") as f:
                        existing = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    logger.warning(f"[raw_dump] Corrupted JSON for {ticker}, resetting")
                    existing = {}
            existing["_ticker"] = ticker
            existing["_lastUpdated"] = datetime.now().isoformat() + "Z"
            existing[section] = data
            with open(path, "w") as f:
                json.dump(existing, f, indent=2, default=str)
    except Exception as exc:
        logger.warning(f"[raw_dump] Failed to save {section} for {ticker}: {exc}")
