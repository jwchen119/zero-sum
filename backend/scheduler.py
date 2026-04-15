"""
Autonomous data scheduler — keeps caches warm so user requests are always fast.

Runs as a standalone process (separate Docker container) that periodically
fetches fresh data from Yahoo Finance, TWSE listings, Quiver Quantitative, etc.
and writes it into the shared cache volume.

Schedule tiers (Asia/Taipei, aligned to Taiwan market hours):
  ┌─────────────────────────────────────────────┐
  │  TIER 1 — Market data  (every 5 min while   │
  │           market open; every 30 min closed)  │
  │  market-summary, sector-performance,         │
  │  market-movers, etf-overview                 │
  ├─────────────────────────────────────────────┤
  │  TIER 2 — Intraday    (every 4 hours)        │
  │  TWSE dividends cache, batch prices,         │
  │  market-news, earnings-calendar              │
  ├─────────────────────────────────────────────┤
  │  TIER 3 — Daily       (once per day, 5 PM)   │
  │  batch fundamentals (full), congress trades, │
  │  insider trades, stock listings              │
  ├─────────────────────────────────────────────┤
  │  TIER 4 — Weekly      (Sunday 2 AM)          │
  │  stock listings refresh (TWSE)               │
  └─────────────────────────────────────────────┘

Usage:
    python scheduler.py              # run scheduler loop
    python scheduler.py --once       # run all jobs once then exit
    python scheduler.py --job tier1  # run a specific tier once
"""

import argparse
import json
import logging
import math
import os
import sys
import tempfile
import threading
import time
import traceback
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))

# ─── Setup ───────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("scheduler")

BASE_DIR = os.path.dirname(__file__)
CACHE_DIR = os.path.join(BASE_DIR, "cache")
BATCH_DATA_DIR = os.path.join(CACHE_DIR, "batch_data")
LISTINGS_DIR = os.path.join(CACHE_DIR, "listings")

# Ensure dirs exist
for d in [CACHE_DIR, BATCH_DATA_DIR, LISTINGS_DIR]:
    os.makedirs(d, exist_ok=True)

MARKET_TZ = ZoneInfo("Asia/Taipei")

# ─── Timing config (env-overridable) ────────────────────

def _safe_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (ValueError, TypeError):
        logger.warning(f"Invalid env {name}, using default {default}")
        return default

def _safe_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (ValueError, TypeError):
        logger.warning(f"Invalid env {name}, using default {default}")
        return default


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


TIER1_MARKET_OPEN_SEC = _safe_int("TIER1_MARKET_OPEN_SEC", 300)       # 5 min
TIER1_MARKET_CLOSED_SEC = _safe_int("TIER1_MARKET_CLOSED_SEC", 1800)  # 30 min
TIER2_INTERVAL_SEC = _safe_int("TIER2_INTERVAL_SEC", 4 * 3600)        # 4 hours
TIER3_HOUR_LOCAL = _safe_int("TIER3_HOUR_LOCAL", 17)                  # 17:00 Taipei
TIER4_DAY = _safe_int("TIER4_DAY", 6)                                 # Sunday=6
TIER4_HOUR_LOCAL = _safe_int("TIER4_HOUR_LOCAL", 2)                   # 2 AM Taipei
ENABLE_CONGRESS_TRADES = _env_flag("ENABLE_CONGRESS_TRADES", False)
TWSE_DIVIDEND_WINDOW_YEARS = max(1, _safe_int("TWSE_DIVIDEND_WINDOW_YEARS", 6))

# Batch fetching config
BATCH_DELAY = _safe_float("BATCH_DELAY", 0.8)       # seconds between tickers
BATCH_WORKERS = _safe_int("BATCH_WORKERS", 2)        # parallel workers
BATCH_PRICE_SIZE = _safe_int("BATCH_PRICE_SIZE", 10) # tickers per price batch
PRICE_PERIOD = os.environ.get("PRICE_PERIOD", "5y")
BATCH_TTL_HOURS = _safe_float("BATCH_TTL_HOURS", 20) # refetch if older


# ─── Global Yahoo Rate-Limit Circuit Breaker ─────────────
# Shared state that all jobs check before hitting Yahoo.
# When too many failures accumulate, the breaker "opens" and
# all Yahoo calls pause until the cooldown expires.

class YahooCircuitBreaker:
    """Global circuit breaker for Yahoo Finance API calls.

    States:
      CLOSED  — normal operation, calls go through
      OPEN    — rate-limited, all calls are blocked until cooldown expires
      HALF    — cooldown expired, allow a single probe call to test recovery
    """

    CLOSED = "closed"
    OPEN = "open"
    HALF = "half_open"

    def __init__(self):
        self._lock = threading.Lock()
        self.state = self.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.cooldown_until = 0.0
        # Thresholds
        self.failure_threshold = 8          # consecutive failures before opening
        self.base_cooldown_sec = 60         # first cooldown duration
        self.max_cooldown_sec = 600         # maximum cooldown (10 min)
        self.cooldown_multiplier = 1        # doubles on repeated opens

    def record_success(self):
        """Call after a successful Yahoo API call."""
        with self._lock:
            if self.state == self.HALF:
                logger.info("circuit-breaker: probe succeeded, closing circuit")
            self.state = self.CLOSED
            self.failure_count = 0
            self.cooldown_multiplier = 1

    def record_failure(self, context: str = ""):
        """Call after a failed/empty Yahoo API call."""
        with self._lock:
            self._record_failure_locked(context)

    def _record_failure_locked(self, context: str = ""):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold and self.state != self.OPEN:
            cooldown = min(
                self.base_cooldown_sec * self.cooldown_multiplier,
                self.max_cooldown_sec,
            )
            self.cooldown_until = time.time() + cooldown
            self.state = self.OPEN
            self.cooldown_multiplier = min(self.cooldown_multiplier * 2, 10)
            logger.warning(
                "circuit-breaker: OPEN — %d failures (%s), cooling down %ds",
                self.failure_count, context, cooldown,
            )
            # Refresh yfinance session when circuit opens
            try:
                from batch_fetch_stocks import _refresh_yfinance_session
                _refresh_yfinance_session()
            except Exception:
                pass

    def allow_request(self) -> bool:
        """Check if a Yahoo API call is currently allowed."""
        with self._lock:
            if self.state == self.CLOSED:
                return True
            if self.state == self.OPEN:
                if time.time() >= self.cooldown_until:
                    self.state = self.HALF
                    logger.info("circuit-breaker: cooldown expired, entering HALF-OPEN (probe)")
                    return True
                return False
            # HALF — allow one probe
            return True

    def wait_if_needed(self) -> bool:
        """Block until the circuit allows requests. Returns False if waited."""
        if self.allow_request():
            return True
        with self._lock:
            remaining = self.cooldown_until - time.time()
        if remaining > 0:
            logger.info("circuit-breaker: waiting %.0fs for cooldown...", remaining)
            time.sleep(remaining)
        with self._lock:
            self.state = self.HALF
        return False


# Global instance — shared by all jobs
_breaker = YahooCircuitBreaker()

# ─── Market hours ────────────────────────────────────────


def _now_market() -> datetime:
    return datetime.now(MARKET_TZ)


def _market_is_open() -> bool:
    """Check if Taiwan stock market is currently open (weekday 9:00-13:30 Taipei)."""
    now = _now_market()
    if now.weekday() >= 5:
        return False
    hm = now.hour * 100 + now.minute
    return 900 <= hm < 1330


def _is_market_day() -> bool:
    """True if today is a weekday (doesn't check holidays)."""
    return _now_market().weekday() < 5


def _tw_market_status() -> dict:
    """Compute Taiwan market status from local timezone and session window."""
    now = _now_market()
    hm = now.hour * 100 + now.minute
    if now.weekday() >= 5:
        return {"status": "closed", "message": "Weekend"}
    if hm < 900:
        return {"status": "pre", "message": "Pre-open"}
    if hm < 1330:
        return {"status": "open", "message": "Regular session"}
    return {"status": "closed", "message": "After close"}


# ─── Helpers ─────────────────────────────────────────────


def _cache_path(namespace: str, key: str) -> str:
    import re
    ns_dir = os.path.join(CACHE_DIR, namespace)
    os.makedirs(ns_dir, exist_ok=True)
    safe_key = re.sub(r"[^A-Za-z0-9._-]", "_", key)
    return os.path.join(ns_dir, f"{safe_key}.json")


def _atomic_json_write(path: str, data, default=str):
    """Write JSON atomically — write to temp file then rename.
    Prevents corrupt files if the process is killed mid-write."""
    dir_name = os.path.dirname(path)
    os.makedirs(dir_name, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, default=default)
        os.replace(tmp_path, path)  # atomic on POSIX
    except BaseException:
        # Clean up temp file on any error
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def _cache_write(namespace: str, key: str, data):
    path = _cache_path(namespace, key)
    _atomic_json_write(path, data)


def _load_ticker_list(name: str) -> list[str]:
    path = os.path.join(LISTINGS_DIR, f"{name}.json")
    if not os.path.exists(path):
        return []
    with open(path) as f:
        data = json.load(f)
    return [s["symbol"] for s in data.get("stocks", [])]


def _load_all_tickers() -> list[str]:
    """Load and merge tickers from TWSE listings (deduplicated)."""
    seen: set[str] = set()
    result: list[str] = []
    for name in ("twse",):
        for sym in _load_ticker_list(name):
            if sym not in seen:
                seen.add(sym)
                result.append(sym)
    return result


def _safe_num(val):
    if val is None:
        return None
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None


def _parse_price_day(record: dict) -> datetime | None:
    """Parse a price record date/time into a day-level datetime."""
    if not isinstance(record, dict):
        return None
    raw = record.get("date") or record.get("time")
    if not isinstance(raw, str):
        return None
    raw = raw.strip()
    if len(raw) < 10:
        return None
    try:
        return datetime.fromisoformat(raw[:10])
    except ValueError:
        return None


def _has_price_year(prices: list[dict], year: int) -> bool:
    for rec in prices:
        day = _parse_price_day(rec)
        if day is not None and day.year == year:
            return True
    return False


def _merge_price_history(*chunks: list[dict]) -> list[dict]:
    """Merge price chunks by day, keeping the last seen record per date."""
    by_day: dict[str, dict] = {}
    for chunk in chunks:
        if not isinstance(chunk, list):
            continue
        for rec in chunk:
            if not isinstance(rec, dict):
                continue
            day = _parse_price_day(rec)
            if day is None:
                continue
            by_day[day.strftime("%Y-%m-%d")] = rec
    return [by_day[k] for k in sorted(by_day.keys())]


def _yf_fetch(
    symbol: str,
    extract_fn,
    retries: int = 2,
    context: str = "",
    empty_is_failure: bool = True,
):
    """Fetch data from Yahoo Finance with retry, backoff, and circuit-breaker.

    Args:
        symbol:     Ticker symbol
        extract_fn: Callable(yf.Ticker) → data.
        retries:    Number of retries on failure (default 2 → 3 total attempts)
        context:    Label for logging (e.g. "market-summary")
        empty_is_failure:
                    If True, None/empty result counts as soft failure.
                    If False, None is treated as expected miss and returns immediately.

    Returns:
        Whatever extract_fn returns, or None on total failure.
    """
    import yfinance as yf

    for attempt in range(retries + 1):
        # Check global circuit breaker
        if not _breaker.allow_request():
            _breaker.wait_if_needed()

        try:
            t = yf.Ticker(symbol)
            result = extract_fn(t)
            if result is not None:
                _breaker.record_success()
                return result
            if not empty_is_failure:
                return None
            # None result = empty data, soft failure
            _breaker.record_failure(f"{context}/{symbol} empty")
        except Exception as exc:
            exc_str = str(exc).lower()
            is_rate_limit = any(s in exc_str for s in [
                "429", "too many requests", "rate limit",
                "unauthorized", "401", "crumb",
            ])
            _breaker.record_failure(f"{context}/{symbol}: {exc}")
            if is_rate_limit and attempt < retries:
                wait = 5 * (2 ** attempt)  # 5s, 10s
                logger.warning(
                    "%s %s: rate-limited (attempt %d/%d), waiting %ds — %s",
                    context, symbol, attempt + 1, retries + 1, wait, exc,
                )
                time.sleep(wait)
                continue
            elif attempt < retries:
                time.sleep(2 * (attempt + 1))
                continue
            else:
                logger.warning("%s %s: all %d attempts failed — %s", context, symbol, retries + 1, exc)
                return None

        # Soft failure retry
        if attempt < retries:
            time.sleep(2 * (attempt + 1))
        else:
            return None
    return None


def _yf_fetch_fast_info(symbol: str, context: str = "") -> dict | None:
    """Fetch price/change from fast_info with retry + circuit breaker."""
    def _extract(t):
        fi = t.fast_info
        price = fi.last_price
        prev = fi.previous_close
        if price and prev:
            return {"price": price, "prev": prev}
        return None
    return _yf_fetch(symbol, _extract, context=context)


# ─── TIER 1: Market Data ────────────────────────────────


def job_market_summary():
    """Fetch live Taiwan-market-centric summary prices → market_summary/latest.json"""

    ASSETS = [
        ("^TWII", "TAIEX", "index"),
        ("0050.TW", "元大台灣50", "etf"),
        ("0056.TW", "元大高股息", "etf"),
        ("006208.TW", "富邦台50", "etf"),
        ("USDTWD=X", "USD/TWD", "fx"),
        ("GC=F", "Gold", "commodity"),
        ("CL=F", "Crude Oil", "commodity"),
        ("BTC-USD", "Bitcoin", "crypto"),
    ]
    items = []
    for symbol, name, category in ASSETS:
        data = _yf_fetch_fast_info(symbol, context="market-summary")
        if data:
            price, prev = data["price"], data["prev"]
            change = price - prev
            change_pct = (change / prev * 100) if prev else 0
            items.append({
                "symbol": symbol, "name": name,
                "price": round(price, 2),
                "change": round(change, 2),
                "changePercent": round(change_pct, 2),
                "category": category,
            })
        time.sleep(0.3)

    market_status = _tw_market_status()

    if items:
        result = {
            "items": items,
            "marketStatus": market_status,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
        _cache_write("market_summary", "latest", result)
    logger.info("market-summary: %d/%d items", len(items), len(ASSETS))


def job_sector_performance():
    """Fetch Taiwan sector proxies → sector_performance/latest.json"""
    SECTORS = [
        ("2330.TW", "Semiconductors"), ("2317.TW", "Electronics Manufacturing"),
        ("2412.TW", "Telecom"), ("2882.TW", "Financials"),
        ("1301.TW", "Materials"), ("2603.TW", "Shipping"),
        ("3045.TW", "Consumer Electronics"), ("1101.TW", "Cement"),
        ("1326.TW", "Petrochemicals"), ("2303.TW", "Foundry"),
        ("2891.TW", "Financial Holding"),
    ]
    items = []
    for symbol, name in SECTORS:
        data = _yf_fetch_fast_info(symbol, context="sector-perf")
        if data:
            price, prev = data["price"], data["prev"]
            chg = ((price - prev) / prev * 100) if prev else 0
            items.append({"symbol": symbol, "name": name, "changePercent": round(chg, 2), "price": round(price, 2)})
        time.sleep(0.3)
    if items:
        _cache_write("sector_performance", "latest", {"sectors": items, "generatedAt": datetime.now(timezone.utc).isoformat()})
    logger.info("sector-performance: %d/%d sectors", len(items), len(SECTORS))


def job_market_movers():
    """Fetch top gainers/losers/active from batch_data → market_movers/latest.json"""
    # Read from batch_data to avoid hitting Yahoo live
    all_stocks = []
    if not os.path.isdir(BATCH_DATA_DIR):
        logger.warning("market-movers: batch_data dir missing, skipping")
        return

    for fname in os.listdir(BATCH_DATA_DIR):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(BATCH_DATA_DIR, fname)) as f:
                d = json.load(f)
            info = d.get("info", {})
            price = info.get("currentPrice") or info.get("regularMarketPrice")
            prev = info.get("previousClose") or info.get("regularMarketPreviousClose")
            vol = info.get("volume") or info.get("regularMarketVolume") or 0
            if price and prev and prev > 0:
                chg = price - prev
                chg_pct = chg / prev * 100
                all_stocks.append({
                    "symbol": info.get("symbol", fname.replace(".json", "")),
                    "name": info.get("shortName", ""),
                    "price": round(float(price), 2),
                    "change": round(float(chg), 2),
                    "changePercent": round(float(chg_pct), 2),
                    "volume": int(vol),
                    "marketCap": info.get("marketCap"),
                })
        except Exception:
            continue

    gainers = sorted(all_stocks, key=lambda x: x["changePercent"], reverse=True)[:20]
    losers = sorted(all_stocks, key=lambda x: x["changePercent"])[:20]
    active = sorted(all_stocks, key=lambda x: x["volume"], reverse=True)[:20]

    result = {"gainers": gainers, "losers": losers, "mostActive": active, "generatedAt": datetime.now(timezone.utc).isoformat()}
    _cache_write("market_movers", "latest", result)
    logger.info("market-movers: %d gainers, %d losers, %d active", len(gainers), len(losers), len(active))


def job_etf_overview():
    """Fetch ETF data → etf_overview/latest.json"""
    import yfinance as yf

    ETFS = [
        "0050.TW", "0051.TW", "0052.TW", "0056.TW", "006208.TW",
        "00878.TW", "00919.TW", "00929.TW", "00713.TW", "00757.TW",
    ]
    items = []
    for sym in ETFS:
        def _extract_etf(t):
            fi = t.fast_info
            price = fi.last_price
            prev = fi.previous_close
            if price and prev:
                info = t.info
                # Calculate real YTD from price history
                ytd_pct = None
                try:
                    hist = t.history(period="ytd")
                    if len(hist) >= 2:
                        start_price = float(hist["Close"].iloc[0])
                        if start_price > 0:
                            ytd_pct = round((price - start_price) / start_price * 100, 2)
                except Exception:
                    pass
                return {
                    "price": price, "prev": prev,
                    "volume": getattr(fi, "last_volume", None),
                    "marketCap": getattr(fi, "market_cap", None),
                    "name": info.get("shortName", ""),
                    "fullName": info.get("longName", ""),
                    "category": info.get("category", ""),
                    "totalAssets": info.get("totalAssets"),
                    "ytdPercent": ytd_pct,
                }
            return None
        data = _yf_fetch(sym, _extract_etf, context="etf-overview")
        if data:
            price, prev = data["price"], data["prev"]
            chg_pct = ((price - prev) / prev * 100) if prev else 0
            items.append({
                "symbol": sym, "price": round(price, 2),
                "changePercent": round(chg_pct, 2),
                "volume": data["volume"],
                "marketCap": data["marketCap"],
                "name": data["name"],
                "fullName": data["fullName"],
                "category": data["category"],
                "totalAssets": data["totalAssets"],
                "ytdPercent": data["ytdPercent"],
            })
        time.sleep(0.3)
    if items:
        _cache_write("etf_overview", "latest", {"etfs": items, "generatedAt": datetime.now(timezone.utc).isoformat()})
    logger.info("etf-overview: %d/%d etfs", len(items), len(ETFS))


# ─── Job Result Tracking ────────────────────────────────
# Records success/fail/duration per job for the observability dashboard.

_RESULTS_FILE = os.path.join(CACHE_DIR, "_scheduler_results.json")
_results_lock = threading.Lock()


def _load_results() -> dict:
    try:
        if os.path.exists(_RESULTS_FILE):
            with open(_RESULTS_FILE) as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_results(results: dict):
    _atomic_json_write(_RESULTS_FILE, results)


def _record_job_result(job_name: str, status: str, duration_sec: float,
                       detail: str = "", items: int | None = None):
    """Record the result of a scheduler job execution."""
    with _results_lock:
        results = _load_results()
        entry = {
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "durationSec": round(duration_sec, 1),
        }
        if detail:
            entry["detail"] = detail
        if items is not None:
            entry["items"] = items

        if job_name not in results:
            results[job_name] = {"lastRun": entry, "history": []}
        else:
            results[job_name]["lastRun"] = entry

        # Keep last 20 runs in history
        hist = results[job_name].setdefault("history", [])
        hist.insert(0, entry)
        results[job_name]["history"] = hist[:20]

        # Circuit breaker state snapshot
        results["_circuitBreaker"] = {
            "state": _breaker.state,
            "failureCount": _breaker.failure_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        _save_results(results)


def _run_job_tracked(job, tier_name: str):
    """Run a single job with timing and result tracking."""
    name = job.__name__
    t0 = time.time()
    try:
        job()
        dur = time.time() - t0
        _record_job_result(name, "success", dur)
    except Exception:
        dur = time.time() - t0
        err = traceback.format_exc()
        _record_job_result(name, "error", dur, detail=err.split("\n")[-2] if err else "")
        logger.error("%s job %s failed:\n%s", tier_name, name, err)


# ─── Earnings Detection ────────────────────────────────
# Detects when a ticker's "Reported EPS" transitions from null → value,
# indicating new earnings results are available, then triggers AI analysis.

_EARNINGS_LOG_FILE = os.path.join(CACHE_DIR, "_earnings_triggers.json")


def _detect_new_earnings(ticker: str, old_data: dict, new_data: dict) -> bool:
    """Return True if new_data contains freshly-reported earnings not in old_data.

    Compares 'earnings_dates' arrays: if any date had Reported EPS = null
    in old_data but now has a non-null value, that means the company just
    reported earnings.
    """
    old_dates = old_data.get("earnings_dates", [])
    new_dates = new_data.get("earnings_dates", [])

    if not old_dates or not new_dates:
        return False

    # Build lookup: date-index → Reported EPS from old data
    old_eps = {}
    for entry in old_dates:
        idx = entry.get("_index")
        if idx:
            old_eps[idx] = entry.get("Reported EPS")

    # Check if any previously-null EPS is now populated
    for entry in new_dates:
        idx = entry.get("_index")
        if not idx:
            continue
        new_reported = entry.get("Reported EPS")
        if new_reported is None:
            continue  # still upcoming
        old_reported = old_eps.get(idx)
        if old_reported is None and idx in old_eps:
            # Transition: null → value
            logger.info("earnings-detect: %s reported EPS %.2f on %s (was null)",
                        ticker, new_reported, idx)
            return True

    return False


def _log_earnings_trigger(ticker: str, reported_eps: float | None, date_idx: str):
    """Append to the earnings trigger log for observability."""
    try:
        log = []
        if os.path.exists(_EARNINGS_LOG_FILE):
            with open(_EARNINGS_LOG_FILE) as f:
                log = json.load(f)
        log.insert(0, {
            "ticker": ticker,
            "reportedEps": reported_eps,
            "earningsDate": date_idx,
            "triggeredAt": datetime.now(timezone.utc).isoformat(),
        })
        log = log[:100]  # keep last 100 triggers
        _atomic_json_write(_EARNINGS_LOG_FILE, log)
    except Exception:
        pass


def job_post_earnings_analysis(tickers: list[str]):
    """Regenerate AI analysis for tickers that just reported earnings.
    Called automatically after job_batch_fundamentals detects new earnings.
    Only generates for TWSE tickers."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.warning("post-earnings-analysis: OPENAI_API_KEY not set, skipping %d tickers", len(tickers))
        return

    # Only generate for TWSE tickers
    eligible = set()
    for name in ("twse",):
        eligible.update(_load_ticker_list(name))
    original_count = len(tickers)
    tickers = [t for t in tickers if t in eligible]
    if original_count != len(tickers):
        logger.info("post-earnings-analysis: filtered %d -> %d eligible tickers", original_count, len(tickers))
    if not tickers:
        logger.info("post-earnings-analysis: no eligible tickers to regenerate")
        return

    from generate_analysis import generate_analysis

    succeeded = []
    failed = []
    for ticker in tickers:
        try:
            logger.info("post-earnings-analysis: regenerating %s", ticker)
            generate_analysis(ticker, force=True)
            succeeded.append(ticker)
            time.sleep(2)  # pace OpenAI calls
        except Exception as exc:
            logger.error("post-earnings-analysis: %s failed: %s", ticker, exc)
            failed.append(ticker)

    detail = f"{len(succeeded)} regenerated"
    if failed:
        detail += f", {len(failed)} failed: {','.join(failed)}"
    _record_job_result("job_post_earnings_analysis", "success" if not failed else "partial",
                       0, detail=detail, items=len(succeeded))
    logger.info("post-earnings-analysis: %s", detail)


# Jobs that don't hit Yahoo API (can always run)
_YAHOO_FREE_JOBS = {"job_market_movers", "job_insider_trades", "job_twse_dividends"}


def run_tier1():
    """Execute all Tier 1 jobs."""
    logger.info("─── TIER 1: Market data ───")
    for job in [job_market_summary, job_sector_performance, job_market_movers, job_etf_overview]:
        if job.__name__ not in _YAHOO_FREE_JOBS and not _breaker.allow_request():
            logger.warning("Tier 1: skipping %s — circuit breaker OPEN", job.__name__)
            _record_job_result(job.__name__, "skipped", 0, detail="circuit breaker OPEN")
            continue
        _run_job_tracked(job, "Tier 1")
        time.sleep(2)  # pause between jobs

    # Rebuild pre-built landing cache after all Tier 1 data is fresh
    try:
        from routes.market import rebuild_landing_cache
        rebuild_landing_cache()
    except Exception as exc:
        logger.warning("Tier 1: landing cache rebuild failed: %s", exc)


# ─── TIER 2: Intraday Data ──────────────────────────────


def job_twse_dividends():
    """Refresh TWSE cash-dividend cache used by /api/dividend-screener."""
    from twse_dividends import refresh_twse_dividend_cache

    payload = refresh_twse_dividend_cache(
        CACHE_DIR,
        window_years=TWSE_DIVIDEND_WINDOW_YEARS,
    )
    stats = payload.get("stats", {}) if isinstance(payload, dict) else {}
    logger.info(
        "twse-dividends: updated %s symbols / %s events (anchorYear=%s, windowYears=%s)",
        stats.get("symbolCount", 0),
        stats.get("eventCount", 0),
        payload.get("anchorYear") if isinstance(payload, dict) else None,
        payload.get("windowYears") if isinstance(payload, dict) else None,
    )


def job_market_news():
    """Fetch general market news → market_news/latest.json"""
    items = []
    for sym in ["^TWII", "2330.TW", "0050.TW"]:
        def _extract_news(t):
            news = t.news
            return news if news else None

        news = _yf_fetch(sym, _extract_news, context="market-news")
        if news:
            for n in news[:10]:
                content = n.get("content", {}) if isinstance(n, dict) else {}
                title = content.get("title") or n.get("title", "")
                pub = content.get("pubDate") or n.get("pubDate", "")
                link = content.get("canonicalUrl", {}).get("url", "") or n.get("link", "")
                provider = (content.get("provider", {}).get("displayName", "")
                            if isinstance(content.get("provider"), dict) else n.get("publisher", ""))
                if title:
                    items.append({"title": title, "publisher": provider, "link": link, "publishedAt": pub})
        time.sleep(0.5)

    # Deduplicate by title
    seen = set()
    unique = []
    for item in items:
        if item["title"] not in seen:
            seen.add(item["title"])
            unique.append(item)
    unique = unique[:30]

    if unique:
        _cache_write("market_news", "latest", {"news": unique, "generatedAt": datetime.now(timezone.utc).isoformat()})
    logger.info("market-news: %d articles", len(unique))


def job_earnings_calendar():
    """Fetch upcoming earnings dates → earnings_calendar/latest.json"""
    tickers = _load_all_tickers()
    if not tickers:
        logger.warning("earnings-calendar: no ticker lists available")
        return

    events = []
    sample = tickers[:200]
    for sym in sample:
        if not _breaker.allow_request():
            _breaker.wait_if_needed()

        def _extract_calendar(t):
            cal = t.calendar
            if isinstance(cal, dict) and cal.get("Earnings Date"):
                info = t.info
                return {
                    "cal": cal,
                    "shortName": info.get("shortName", ""),
                    "marketCap": info.get("marketCap"),
                }
            return None

        result = _yf_fetch(
            sym,
            _extract_calendar,
            context="earnings-cal",
            retries=1,
            empty_is_failure=False,
        )
        if result:
            cal = result["cal"]
            ed = cal.get("Earnings Date")
            dates = ed if isinstance(ed, list) else [ed]
            for d in dates:
                events.append({
                    "symbol": sym,
                    "company": result["shortName"],
                    "date": str(d),
                    "epsEstimate": _safe_num(cal.get("Earnings Average")),
                    "revenueEstimate": _safe_num(cal.get("Revenue Average")),
                    "marketCap": _safe_num(result["marketCap"]),
                })
        time.sleep(0.5)

    events.sort(key=lambda x: x["date"])
    # Sort by market cap (descending) within each date for importance
    if events:
        _cache_write("earnings_calendar", "latest", {"events": events[:60], "generatedAt": datetime.now(timezone.utc).isoformat()})
    logger.info("earnings-calendar: %d events", len(events))


def job_batch_prices():
    """Refresh prices for all covered tickers using efficient batching."""
    from batch_fetch_stocks import fetch_batch_prices, clean_for_json

    tickers = _load_all_tickers()
    if not tickers:
        logger.warning("batch-prices: no ticker lists, skipping")
        return

    existing_payloads: dict[str, dict] = {}
    needs_backfill: list[str] = []
    for sym in tickers:
        path = os.path.join(BATCH_DATA_DIR, f"{sym}.json")
        existing: dict = {}
        if os.path.exists(path):
            try:
                with open(path) as f:
                    existing = json.load(f)
            except Exception:
                existing = {}
        existing_payloads[sym] = existing
        prices = existing.get("prices") if isinstance(existing.get("prices"), list) else []
        if not _has_price_year(prices, 2023):
            needs_backfill.append(sym)

    logger.info(
        "batch-prices: fetching 1y for %d tickers (missing-2023 backfill candidates: %d)",
        len(tickers),
        len(needs_backfill),
    )
    all_prices_1y = fetch_batch_prices(tickers, period="1y", batch_size=BATCH_PRICE_SIZE)
    all_prices_backfill = {}
    if needs_backfill:
        logger.info("batch-prices: backfilling %d tickers with %s history", len(needs_backfill), PRICE_PERIOD)
        all_prices_backfill = fetch_batch_prices(needs_backfill, period=PRICE_PERIOD, batch_size=BATCH_PRICE_SIZE)

    updated = 0
    for sym in tickers:
        path = os.path.join(BATCH_DATA_DIR, f"{sym}.json")
        existing = existing_payloads.get(sym, {})
        existing_prices = existing.get("prices") if isinstance(existing.get("prices"), list) else []
        prices_1y = all_prices_1y.get(sym) if isinstance(all_prices_1y.get(sym), list) else []
        prices_backfill = all_prices_backfill.get(sym) if isinstance(all_prices_backfill.get(sym), list) else []
        merged_prices = _merge_price_history(existing_prices, prices_1y, prices_backfill)
        if not merged_prices:
            continue
        existing["prices"] = merged_prices
        existing["_pricesUpdated"] = datetime.now(timezone.utc).isoformat()
        existing.setdefault("_ticker", sym)
        _atomic_json_write(path, clean_for_json(existing))
        updated += 1

    logger.info(
        "batch-prices: updated %d/%d tickers (%d backfill candidates)",
        updated,
        len(tickers),
        len(needs_backfill),
    )


def run_tier2():
    """Execute all Tier 2 jobs."""
    logger.info("─── TIER 2: Intraday data ───")
    for job in [job_twse_dividends, job_market_news, job_earnings_calendar, job_batch_prices]:
        if job.__name__ not in _YAHOO_FREE_JOBS and not _breaker.allow_request():
            logger.warning("Tier 2: skipping %s — circuit breaker OPEN", job.__name__)
            _record_job_result(job.__name__, "skipped", 0, detail="circuit breaker OPEN")
            continue
        _run_job_tracked(job, "Tier 2")
        time.sleep(2)

    # Rebuild heatmap cache now that prices are fresh
    try:
        from routes.screener import rebuild_heatmap_disk_cache
        rebuild_heatmap_disk_cache()
    except Exception:
        logger.error("Heatmap prewarm failed:\n%s", traceback.format_exc())

    # Rebuild sector correlation & valuation cache
    try:
        from routes.screener import rebuild_sector_analysis_disk_cache
        rebuild_sector_analysis_disk_cache()
    except Exception:
        logger.error("Sector analysis prewarm failed:\n%s", traceback.format_exc())


    # Catch-up: regenerate analyses older than their most recent earnings.
    # Running here (every 4h) ensures staleness is fixed even when Tier 3 is
    # skipped (non-market days, scheduler restarts, etc.).
    try:
        stale = _check_stale_analyses()
        if stale:
            logger.info("tier2 catch-up: %d analyses stale after earnings: %s",
                        len(stale), ", ".join(stale))
            job_post_earnings_analysis(stale)
    except Exception:
        logger.error("tier2 stale-analysis check failed:\n%s", traceback.format_exc())


# ─── TIER 3: Daily Data ─────────────────────────────────


def job_batch_fundamentals():
    """Full batch fetch of fundamentals for all covered tickers.
    Uses the existing batch_fetch_stocks machinery with rate-limit awareness.
    Detects new earnings reports and triggers AI analysis regeneration."""
    from batch_fetch_stocks import (
        fetch_batch_prices, fetch_ticker_fundamentals,
        clean_for_json, is_fresh, _refresh_yfinance_session,
    )

    tickers = _load_all_tickers()
    if not tickers:
        logger.warning("batch-fundamentals: no ticker lists, skipping")
        return

    # Filter out already-fresh data
    to_fetch = [t for t in tickers if not is_fresh(t, BATCH_TTL_HOURS)]
    logger.info("batch-fundamentals: %d/%d tickers need refresh (TTL=%sh)", len(to_fetch), len(tickers), BATCH_TTL_HOURS)

    if not to_fetch:
        logger.info("batch-fundamentals: all data is fresh, skipping")
        return

    # Phase 1: Batch prices
    logger.info("batch-fundamentals phase 1: prices for %d tickers", len(to_fetch))
    all_prices = fetch_batch_prices(to_fetch, period=PRICE_PERIOD, batch_size=BATCH_PRICE_SIZE)

    # Phase 2: Parallel fundamentals with rate limiting + circuit breaker
    logger.info("batch-fundamentals phase 2: fundamentals (workers=%d, delay=%.1fs)", BATCH_WORKERS, BATCH_DELAY)
    failed = []
    earnings_triggered = []  # tickers with newly-reported earnings
    _fetch_lock = threading.Lock()
    _counter = {"done": 0, "consecutive_empty": 0}

    def _fetch_one(sym: str) -> None:
        # Respect global circuit breaker
        if not _breaker.allow_request():
            logger.warning("  circuit breaker OPEN — waiting before %s", sym)
            _breaker.wait_if_needed()

        try:
            # Read old data BEFORE overwrite for earnings comparison
            path = os.path.join(BATCH_DATA_DIR, f"{sym}.json")
            old_data = {}
            if os.path.exists(path):
                try:
                    with open(path) as f:
                        old_data = json.load(f)
                except Exception:
                    pass

            fundamentals = fetch_ticker_fundamentals(sym)
            data = {
                "_ticker": sym,
                "_lastUpdated": datetime.now(timezone.utc).isoformat(),
                "_mode": "full",
                "prices": all_prices.get(sym, []),
                **fundamentals,
            }

            # Detect new earnings before writing
            if old_data and _detect_new_earnings(sym, old_data, data):
                with _fetch_lock:
                    earnings_triggered.append(sym)
                # Find the newly reported EPS for logging
                for entry in data.get("earnings_dates", []):
                    old_entries = {e.get("_index"): e.get("Reported EPS") for e in old_data.get("earnings_dates", [])}
                    idx = entry.get("_index")
                    if idx and entry.get("Reported EPS") is not None and old_entries.get(idx) is None:
                        _log_earnings_trigger(sym, entry.get("Reported EPS"), idx)
                        break

            _atomic_json_write(path, clean_for_json(data))

            info_count = len(fundamentals.get("info", {}))
            with _fetch_lock:
                _counter["done"] += 1
                n = _counter["done"]
                if info_count >= 10:
                    _counter["consecutive_empty"] = 0
                    _breaker.record_success()
                else:
                    _counter["consecutive_empty"] += 1
                    _breaker.record_failure(f"batch-fund/{sym} empty info")

                ce = _counter["consecutive_empty"]

            logger.info("  [%d/%d] %s OK (%d info fields)", n, len(to_fetch), sym, info_count)

            # Adaptive backoff
            if ce >= 5:
                pause = min(60, 10 * (ce // 5))
                logger.warning("  %d consecutive empty — cooling down %ds", ce, pause)
                _refresh_yfinance_session()
                time.sleep(pause)
                with _fetch_lock:
                    _counter["consecutive_empty"] = 0
            else:
                time.sleep(BATCH_DELAY)

        except Exception as exc:
            with _fetch_lock:
                _counter["done"] += 1
                n = _counter["done"]
                _counter["consecutive_empty"] += 1
                failed.append(sym)
                _breaker.record_failure(f"batch-fund/{sym}: {exc}")
            logger.warning("  [%d/%d] %s FAILED: %s", n, len(to_fetch), sym, exc)
            time.sleep(BATCH_DELAY)

    if BATCH_WORKERS > 1:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=BATCH_WORKERS) as pool:
            pool.map(_fetch_one, to_fetch)
    else:
        for sym in to_fetch:
            _fetch_one(sym)

    logger.info("batch-fundamentals done: %d/%d success, %d failed", len(to_fetch) - len(failed), len(to_fetch), len(failed))

    # Phase 3: Trigger AI analysis for tickers with new earnings
    if earnings_triggered:
        logger.info("batch-fundamentals: %d tickers reported new earnings: %s",
                    len(earnings_triggered), ", ".join(earnings_triggered))
        job_post_earnings_analysis(earnings_triggered)
    else:
        logger.info("batch-fundamentals: no new earnings detected")


def _check_stale_analyses():
    """Catch-up check: find tickers whose AI analysis is older than their
    most recent reported earnings.  Returns a list of tickers that need
    regeneration.  This is idempotent and handles cases the transition
    detection misses (downtime, failures, manual data updates)."""
    analysis_dir = os.path.join(BASE_DIR, "static_analysis")
    if not os.path.isdir(analysis_dir) or not os.path.isdir(BATCH_DATA_DIR):
        return []

    stale = []
    for fname in os.listdir(analysis_dir):
        if not fname.endswith(".json"):
            continue
        ticker = fname.replace(".json", "")
        analysis_path = os.path.join(analysis_dir, fname)
        batch_path = os.path.join(BATCH_DATA_DIR, f"{ticker}.json")
        if not os.path.exists(batch_path):
            continue

        try:
            analysis_mtime = os.path.getmtime(analysis_path)
            with open(batch_path) as f:
                batch = json.load(f)
        except Exception:
            continue

        # Find the most recent earnings date with a reported EPS
        for entry in batch.get("earnings_dates", []):
            reported = entry.get("Reported EPS")
            if reported is None:
                continue
            idx = entry.get("_index", "")
            if not idx:
                continue
            try:
                # Parse the earnings date
                from datetime import datetime as dt
                # Handle timezone-aware ISO strings
                earnings_dt = dt.fromisoformat(idx)
                earnings_ts = earnings_dt.timestamp()
            except (ValueError, TypeError):
                continue

            if earnings_ts > analysis_mtime:
                logger.info("stale-analysis-check: %s analysis is older than earnings on %s",
                            ticker, idx.split("T")[0])
                stale.append(ticker)
            break  # only check the most recent reported earnings

    return stale


def job_congress_trades():
    """Fetch congress trading data → congress/latest.json"""
    if not ENABLE_CONGRESS_TRADES:
        logger.info("congress-trades: disabled by ENABLE_CONGRESS_TRADES=0, skipping")
        return

    import requests

    QUIVER_URL = "https://api.quiverquant.com/beta/live/congresstrading"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": "https://www.quiverquant.com",
        "Referer": "https://www.quiverquant.com/",
    }

    try:
        resp = requests.get(QUIVER_URL, headers=HEADERS, timeout=30)
        if resp.status_code == 200:
            trades = resp.json()
            if isinstance(trades, list) and len(trades) > 0:
                _cache_write("congress", "latest", trades)
                # Also write the seed file as backup
                seed_path = os.path.join(CACHE_DIR, "congress_seed.json")
                _atomic_json_write(seed_path, trades)
                logger.info("congress-trades: %d trades", len(trades))
            else:
                logger.warning("congress-trades: empty response")
        else:
            logger.warning("congress-trades: HTTP %d", resp.status_code)
    except Exception as exc:
        logger.error("congress-trades: %s", exc)


def job_insider_trades():
    """Pre-compute insider trades from batch_data → cache for /api/insiders."""
    # This reads from batch_data which has insider_transactions per ticker
    if not os.path.isdir(BATCH_DATA_DIR):
        return

    all_insiders = []
    for fname in os.listdir(BATCH_DATA_DIR):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(BATCH_DATA_DIR, fname)) as f:
                d = json.load(f)
            sym = d.get("_ticker", fname.replace(".json", ""))
            for txn in d.get("insider_transactions", []):
                all_insiders.append({**txn, "symbol": sym})
        except Exception:
            continue

    # Sort by date, most recent first
    all_insiders.sort(key=lambda x: x.get("_index", ""), reverse=True)
    _cache_write("congress", "insiders_precomputed", all_insiders[:500])
    logger.info("insider-trades: %d transactions indexed", len(all_insiders))


def job_listings():
    """Refresh stock listings from TWSE official endpoint."""
    from fetch_listings import FETCHERS, save

    for key, (label, fetcher) in FETCHERS.items():
        try:
            logger.info("listings: fetching %s...", label)
            stocks = fetcher()
            save(key, stocks)
            logger.info("listings: %s → %d stocks", label, len(stocks))
        except Exception as exc:
            logger.error("listings %s: %s", key, exc)
        time.sleep(2)


def run_tier3():
    """Execute all Tier 3 jobs."""
    logger.info("─── TIER 3: Daily data ───")
    jobs = [job_listings, job_insider_trades, job_batch_fundamentals]
    if ENABLE_CONGRESS_TRADES:
        jobs.insert(1, job_congress_trades)
    else:
        logger.info("Tier 3: congress trades disabled by ENABLE_CONGRESS_TRADES=0")

    for job in jobs:
        _run_job_tracked(job, "Tier 3")

    # Rebuild heatmap cache now that fundamentals are fresh
    try:
        from routes.screener import rebuild_heatmap_disk_cache
        rebuild_heatmap_disk_cache()
    except Exception:
        logger.error("Heatmap prewarm failed:\n%s", traceback.format_exc())

    # Rebuild sector correlation & valuation cache
    try:
        from routes.screener import rebuild_sector_analysis_disk_cache
        rebuild_sector_analysis_disk_cache()
    except Exception:
        logger.error("Sector analysis prewarm failed:\n%s", traceback.format_exc())

    # Catch-up: regenerate analyses older than their most recent earnings report.
    # This is idempotent safety — it catches anything the transition detection
    # in job_batch_fundamentals might miss (scheduler downtime, OpenAI failures,
    # manual data updates, etc.).
    try:
        stale = _check_stale_analyses()
        if stale:
            logger.info("tier3 catch-up: %d analyses stale after earnings: %s",
                        len(stale), ", ".join(stale))
            job_post_earnings_analysis(stale)
    except Exception:
        logger.error("tier3 catch-up check failed:\n%s", traceback.format_exc())



# ─── TIER 4: Weekly ─────────────────────────────────────

def run_tier4():
    """Weekly maintenance — just re-run listings (already in tier3, this is extra safety)."""
    logger.info("─── TIER 4: Weekly maintenance ───")
    _run_job_tracked(job_listings, "Tier 4")


# ─── Scheduler Loop ─────────────────────────────────────

STATE_FILE = os.path.join(CACHE_DIR, "_scheduler_state.json")


def _load_state() -> dict:
    """Load persisted scheduler state from disk (survives container restarts)."""
    try:
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE) as f:
                return json.load(f)
    except Exception as exc:
        logger.warning("Could not load scheduler state: %s", exc)
    return {}


def _save_state(state: dict):
    """Persist scheduler state to disk atomically."""
    _atomic_json_write(STATE_FILE, state)


def run_once():
    """Run all tiers once (useful for initial seeding)."""
    logger.info("=" * 60)
    logger.info("Running ALL tiers once (seeding mode)")
    logger.info("=" * 60)
    run_tier1()
    run_tier2()
    run_tier3()


def scheduler_loop():
    """Main loop — runs forever, executing tiers on their schedules."""
    logger.info("=" * 60)
    logger.info("Zero-Sum Data Scheduler starting")
    logger.info("  Tier 1 (market):  every %ds (open) / %ds (closed)", TIER1_MARKET_OPEN_SEC, TIER1_MARKET_CLOSED_SEC)
    logger.info("  Tier 2 (intraday): every %ds (%dh)", TIER2_INTERVAL_SEC, TIER2_INTERVAL_SEC // 3600)
    logger.info("  Tier 3 (daily):   at %d:00 Asia/Taipei", TIER3_HOUR_LOCAL)
    logger.info("  Tier 4 (weekly):  day=%d at %d:00 Asia/Taipei", TIER4_DAY, TIER4_HOUR_LOCAL)
    logger.info("  Congress trades:  %s", "enabled" if ENABLE_CONGRESS_TRADES else "disabled")
    logger.info("  Batch delay: %.1fs | Workers: %d | Price batch: %d", BATCH_DELAY, BATCH_WORKERS, BATCH_PRICE_SIZE)
    logger.info("=" * 60)

    # Restore state from previous run
    state = _load_state()
    logger.info("Restored state: %s", {k: v for k, v in state.items()})

    # Seed immediately on startup if cache is empty
    listings_exist = os.path.exists(os.path.join(LISTINGS_DIR, "twse.json"))
    batch_count = len([f for f in os.listdir(BATCH_DATA_DIR) if f.endswith(".json")]) if os.path.isdir(BATCH_DATA_DIR) else 0

    if not listings_exist:
        logger.info("No listings found — running initial seed (listings + tier1)")
        try:
            job_listings()
        except Exception:
            logger.error("Initial listings fetch failed:\n%s", traceback.format_exc())

    if batch_count < 50:
        logger.info("Batch data sparse (%d files) — running full seed", batch_count)
        try:
            run_tier1()
            run_tier2()
            run_tier3()
        except Exception:
            logger.error("Initial seed failed:\n%s", traceback.format_exc())
        state["last_tier1"] = time.time()
        state["last_tier2"] = time.time()
        state["last_tier3_date"] = str(_now_market().date())
        _save_state(state)
    else:
        # Batch data exists — warm cache with tier 1 + tier 2 so API serves
        # fresh data immediately (API routes are cache-only, no Yahoo fallback)
        logger.info("Batch data present (%d files) — pre-warming tier 1 + 2", batch_count)
        try:
            run_tier1()
        except Exception:
            logger.error("Startup tier1 failed:\n%s", traceback.format_exc())
        try:
            run_tier2()
        except Exception:
            logger.error("Startup tier2 failed:\n%s", traceback.format_exc())
        state["last_tier1"] = time.time()
        state["last_tier2"] = time.time()
        _save_state(state)

    last_tier1 = state.get("last_tier1", time.time())
    last_tier2 = state.get("last_tier2", time.time())
    last_tier3_date = state.get("last_tier3_date")
    last_tier4_date = state.get("last_tier4_date")

    while True:
        try:
            now = time.time()
            now_local = _now_market()

            # ── Tier 1: Market data ──
            interval = TIER1_MARKET_OPEN_SEC if _market_is_open() else TIER1_MARKET_CLOSED_SEC
            if (now - last_tier1) >= interval:
                try:
                    run_tier1()
                except Exception:
                    logger.error("Tier 1 error:\n%s", traceback.format_exc())
                last_tier1 = time.time()
                state["last_tier1"] = last_tier1
                _save_state(state)

            # ── Tier 2: Intraday ──
            if (now - last_tier2) >= TIER2_INTERVAL_SEC:
                try:
                    run_tier2()
                except Exception:
                    logger.error("Tier 2 error:\n%s", traceback.format_exc())
                last_tier2 = time.time()
                state["last_tier2"] = last_tier2
                _save_state(state)

            # ── Tier 3: Daily (at TIER3_HOUR_LOCAL on market days) ──
            today = str(now_local.date())
            if _is_market_day() and now_local.hour == TIER3_HOUR_LOCAL and last_tier3_date != today:
                try:
                    run_tier3()
                except Exception:
                    logger.error("Tier 3 error:\n%s", traceback.format_exc())
                last_tier3_date = today
                state["last_tier3_date"] = today
                _save_state(state)

            # ── Tier 4: Weekly (TIER4_DAY at TIER4_HOUR_LOCAL) ──
            if now_local.weekday() == TIER4_DAY and now_local.hour == TIER4_HOUR_LOCAL and last_tier4_date != today:
                try:
                    run_tier4()
                except Exception:
                    logger.error("Tier 4 error:\n%s", traceback.format_exc())
                last_tier4_date = today
                state["last_tier4_date"] = today
                _save_state(state)

            # Sleep — check every 30 seconds
            time.sleep(30)

        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user")
            break
        except Exception:
            logger.error("Scheduler loop error:\n%s", traceback.format_exc())
            time.sleep(60)


# ─── CLI ─────────────────────────────────────────────────

def _find_time_stale_analyses(max_age_hours: float = 168) -> list[str]:
    """Find analyses older than max_age_hours (default 168 = 7 days)."""
    analysis_dir = os.path.join(BASE_DIR, "static_analysis")
    if not os.path.isdir(analysis_dir):
        return []
    now = time.time()
    stale = []
    for fname in os.listdir(analysis_dir):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(analysis_dir, fname)
        age_hours = (now - os.path.getmtime(path)) / 3600
        if age_hours > max_age_hours:
            stale.append(fname.replace(".json", ""))
    return stale


def _refresh_stale_analyses(max_age_hours: float | None = None):
    """Manual CLI command: find and regenerate stale AI analyses.
    If max_age_hours is given, regenerate anything older than that many hours.
    Otherwise use earnings-based staleness detection."""
    if max_age_hours is not None:
        stale = _find_time_stale_analyses(max_age_hours)
        label = f"older than {max_age_hours}h"
    else:
        stale = _check_stale_analyses()
        label = "older than most recent earnings"

    if not stale:
        logger.info("refresh-analyses: no stale analyses found (%s)", label)
        return
    logger.info("refresh-analyses: %d stale analyses (%s): %s",
                len(stale), label, ", ".join(sorted(stale)))
    job_post_earnings_analysis(stale)


def main():
    parser = argparse.ArgumentParser(description="Zero-Sum autonomous data scheduler")
    parser.add_argument("--once", action="store_true", help="Run all jobs once then exit")
    parser.add_argument("--job", choices=["tier1", "tier2", "tier3", "tier4"], help="Run a specific tier once")
    parser.add_argument("--refresh-analyses", action="store_true",
                        help="Find and regenerate stale analyses (earnings-based by default, or use --max-age)")
    parser.add_argument("--max-age", type=float, default=None,
                        help="With --refresh-analyses: regenerate analyses older than this many hours (default: earnings-based)")
    args = parser.parse_args()

    if args.refresh_analyses:
        _refresh_stale_analyses(max_age_hours=args.max_age)
    elif args.once:
        run_once()
    elif args.job:
        {"tier1": run_tier1, "tier2": run_tier2, "tier3": run_tier3, "tier4": run_tier4}[args.job]()
    else:
        scheduler_loop()


if __name__ == "__main__":
    main()

