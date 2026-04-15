"""
Screener blueprint: bulk data, screener, heatmap, stock-detail,
sectors, dividend-screener, financials, compare, cache management.
"""

import json
import math
import os
import shutil
import threading
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, date as dt_date

import numpy as np
import pandas as pd
import yfinance as yf
from flask import Blueprint, jsonify, request

from shared import (
    ANALYSIS_DIR,
    BATCH_DATA_DIR,
    CACHE_DIR,
    CACHE_TTL,
    LISTINGS_DIR,
    _cache_get,
    _cache_get_stale,
    _cache_path,
    _cache_put,
    _safe_num,
    _validate_ticker,
    logger,
)

screener_bp = Blueprint("screener", __name__)

# ─── Index members (shared with heatmap) ─────────────────

_index_members_cache = {"mtime": 0, "twse": set()}


def _load_index_members():
    """Load TWSE symbol set from listing cache file."""
    latest_mtime = 0
    for name in ("twse",):
        fpath = os.path.join(LISTINGS_DIR, f"{name}.json")
        if os.path.isfile(fpath):
            mt = os.path.getmtime(fpath)
            if mt > latest_mtime:
                latest_mtime = mt

    if latest_mtime <= _index_members_cache["mtime"]:
        return _index_members_cache

    for name in ("twse",):
        fpath = os.path.join(LISTINGS_DIR, f"{name}.json")
        if os.path.isfile(fpath):
            with open(fpath) as f:
                data = json.load(f)
            _index_members_cache[name] = {s["symbol"] for s in data.get("stocks", [])}
        else:
            _index_members_cache[name] = set()

    _index_members_cache["mtime"] = latest_mtime
    return _index_members_cache


# ─── Ticker listing (for autocomplete) ───────────────────

_ticker_list_cache: list | None = None


def _load_ticker_list() -> list:
    """Load TWSE ticker list for autocomplete."""
    global _ticker_list_cache
    if _ticker_list_cache is not None:
        return _ticker_list_cache

    tickers = []
    seen = set()
    for name in ("twse",):
        fpath = os.path.join(LISTINGS_DIR, f"{name}.json")
        if os.path.isfile(fpath):
            with open(fpath) as f:
                data = json.load(f)
            for s in data.get("stocks", []):
                sym = s.get("symbol", "")
                if sym and sym not in seen:
                    seen.add(sym)
                    tickers.append({
                        "symbol": sym,
                        "name": s.get("name", ""),
                        "sector": s.get("sector", ""),
                    })
    _ticker_list_cache = tickers
    return tickers


@screener_bp.route("/api/ticker-list")
def api_ticker_list():
    """Return full ticker list for client-side autocomplete."""
    return jsonify(_load_ticker_list())


# ─── Screener data builder ───────────────────────────────

_SCREENER_FIELDS = [
    "symbol", "shortName", "sector", "industry",
    "marketCap", "enterpriseValue",
    "currentPrice", "previousClose",
    "fiftyTwoWeekHigh", "fiftyTwoWeekLow",
    "trailingPE", "forwardPE", "pegRatio",
    "priceToBook", "priceToSalesTrailing12Months",
    "trailingEps", "forwardEps",
    "revenueGrowth", "earningsGrowth", "earningsQuarterlyGrowth",
    "profitMargins", "operatingMargins", "grossMargins",
    "returnOnEquity", "returnOnAssets",
    "debtToEquity", "currentRatio", "quickRatio",
    "dividendYield", "dividendRate", "payoutRatio",
    "beta", "averageVolume",
    "totalRevenue", "totalDebt", "totalCash",
    "freeCashflow", "operatingCashflow",
    "recommendationKey", "recommendationMean", "numberOfAnalystOpinions",
    "targetMeanPrice", "targetHighPrice", "targetLowPrice",
]

_screener_cache = {"mtime": 0, "data": None}
_screener_lock = threading.Lock()


def _parse_price_day(raw: str | None):
    if not isinstance(raw, str):
        return None
    raw = raw.strip()
    if len(raw) < 10:
        return None
    try:
        return datetime.fromisoformat(raw[:10]).date()
    except ValueError:
        return None


def _price_change_3m_vs_2023(prices):
    """Return (avg_close_2023, avg_close_last_90d, pct_change_vs_2023)."""
    if not isinstance(prices, list):
        return None, None, None

    points = []
    for p in prices:
        if not isinstance(p, dict):
            continue
        day = _parse_price_day(p.get("date") or p.get("time"))
        close = _safe_num(p.get("close"))
        if day is None or close is None:
            continue
        points.append((day, close))

    if not points:
        return None, None, None

    latest_day = max(d for d, _ in points)
    lookback_start = latest_day - timedelta(days=90)

    closes_2023 = [c for d, c in points if d.year == 2023]
    closes_90d = [c for d, c in points if lookback_start <= d <= latest_day]

    avg_2023 = round(sum(closes_2023) / len(closes_2023), 4) if closes_2023 else None
    avg_90d = round(sum(closes_90d) / len(closes_90d), 4) if closes_90d else None

    if avg_2023 is None or avg_90d is None or avg_2023 <= 0:
        return avg_2023, avg_90d, None

    change_pct = round((avg_90d - avg_2023) / avg_2023 * 100, 4)
    return avg_2023, avg_90d, change_pct


def _extract_eps_annual_map(income_rows) -> dict[str, float | None]:
    """Extract annual EPS map from income statement rows.

    Priority: Basic EPS first, fallback to Diluted EPS when Basic is missing.
    Returns a mapping like {"2024": 1.45, "2023": 1.06, ...}.
    """
    if not isinstance(income_rows, list):
        return {}

    basic_row = None
    diluted_row = None
    for row in income_rows:
        if not isinstance(row, dict):
            continue
        label = str(row.get("_index") or "").strip().lower()
        if label == "basic eps":
            basic_row = row
        elif label == "diluted eps":
            diluted_row = row

    def _collect(source_row) -> dict[int, float | None]:
        values: dict[int, float | None] = {}
        if not isinstance(source_row, dict):
            return values
        for key, raw_val in source_row.items():
            if key == "_index":
                continue
            key_str = str(key)
            if len(key_str) < 4 or not key_str[:4].isdigit():
                continue
            year = int(key_str[:4])
            if year < 1900 or year > 2200:
                continue
            values[year] = _safe_num(raw_val)
        return values

    basic_vals = _collect(basic_row)
    diluted_vals = _collect(diluted_row)
    years = sorted(set(basic_vals.keys()) | set(diluted_vals.keys()), reverse=True)

    eps_map: dict[str, float | None] = {}
    for year in years:
        eps = basic_vals.get(year)
        if eps is None:
            eps = diluted_vals.get(year)
        eps_map[str(year)] = eps
    return eps_map


def _build_screener_data():
    idx = _load_index_members()
    listing_name_map = {
        (item.get("symbol") or ""): (item.get("name") or "")
        for item in _load_ticker_list()
        if isinstance(item, dict)
    }
    rows = []
    if not os.path.isdir(BATCH_DATA_DIR):
        return rows
    for fname in sorted(os.listdir(BATCH_DATA_DIR)):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(BATCH_DATA_DIR, fname)
        try:
            with open(fpath) as f:
                blob = json.load(f)
            info = blob.get("info", {})
            row = {}
            for key in _SCREENER_FIELDS:
                val = info.get(key)
                if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                    val = None
                row[key] = val
            symbol = row.get("symbol") or fname.replace(".json", "")
            if symbol not in idx["twse"]:
                continue
            row["symbol"] = symbol
            row["inTWSE"] = True
            row["localName"] = listing_name_map.get(symbol) or None
            row["epsAnnual"] = _extract_eps_annual_map(blob.get("income_stmt"))
            prices = blob.get("prices", [])
            if prices and len(prices) > 20:
                current_year = datetime.now().year
                ytd_start = None
                for p in prices:
                    if p.get("date", "").startswith(str(current_year)):
                        ytd_start = p
                        break
                if ytd_start and ytd_start.get("close") and prices[-1].get("close"):
                    row["ytdReturn"] = round(
                        (prices[-1]["close"] - ytd_start["close"]) / ytd_start["close"] * 100, 2
                    )
                else:
                    row["ytdReturn"] = None
            else:
                row["ytdReturn"] = None
            avg_close_2023, avg_close_last_90d, price_change_pct = _price_change_3m_vs_2023(prices)
            row["avgClose2023"] = avg_close_2023
            row["avgCloseLast90d"] = avg_close_last_90d
            row["priceChangePct3mVs2023"] = price_change_pct
            rows.append(row)
        except Exception:
            continue
    return rows


def _get_screener_data():
    with _screener_lock:
        now = datetime.now().timestamp()
        if _screener_cache["data"] is not None and (now - _screener_cache.get("checked", 0)) < 30:
            return _screener_cache["data"]
        _screener_cache["checked"] = now

        latest_mtime = 0
        if os.path.isdir(BATCH_DATA_DIR):
            for fname in os.listdir(BATCH_DATA_DIR):
                fpath = os.path.join(BATCH_DATA_DIR, fname)
                mt = os.path.getmtime(fpath)
                if mt > latest_mtime:
                    latest_mtime = mt
        if _screener_cache["data"] is None or latest_mtime > _screener_cache["mtime"]:
            logger.info(f"[screener] Rebuilding cache ({latest_mtime} > {_screener_cache['mtime']})...")
            _screener_cache["data"] = _build_screener_data()
            _screener_cache["mtime"] = latest_mtime
            logger.info(f"[screener] Cache rebuilt: {len(_screener_cache['data'])} rows")
        return _screener_cache["data"]


# Pre-serialized response cache
_SCREENER_RESP_MAX = 100
_screener_response_cache: OrderedDict = OrderedDict()
_screener_response_lock = threading.Lock()
_SCREENER_RESPONSE_TTL = 30


# ─── Heatmap data builder ────────────────────────────────

_heatmap_cache = {"mtime": 0, "data": None}
_heatmap_lock = threading.Lock()

_HEATMAP_RESP_MAX = 50
_heatmap_response_cache: OrderedDict = OrderedDict()
_heatmap_response_lock = threading.Lock()
_HEATMAP_RESPONSE_TTL = 30

_HEATMAP_PERIODS = {"1d", "1w", "1m", "ytd"}


def _build_heatmap_data():
    idx = _load_index_members()
    rows = []
    if not os.path.isdir(BATCH_DATA_DIR):
        return rows
    for fname in sorted(os.listdir(BATCH_DATA_DIR)):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(BATCH_DATA_DIR, fname)
        try:
            with open(fpath) as f:
                blob = json.load(f)
            info = blob.get("info", {})
            symbol = info.get("symbol") or fname.replace(".json", "")
            if symbol not in idx["twse"]:
                continue
            market_cap = info.get("marketCap")
            if not market_cap:
                continue

            prices = blob.get("prices", [])

            # Precompute period changes + debug for all periods
            computed = {}
            for period in _HEATMAP_PERIODS:
                pct, debug = _compute_period_change(prices, period)
                computed[period] = {"changePercent": pct, "debug": debug}

            # Precompute sparkline
            sparkline = None
            if prices:
                tail = prices[-1260:] if len(prices) > 1260 else prices
                sparkline = [round(p["close"], 2) for p in tail if p.get("close")]

            row = {
                "symbol": symbol,
                "shortName": info.get("shortName"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "marketCap": market_cap,
                "currentPrice": info.get("currentPrice"),
                "previousClose": info.get("previousClose"),
                "averageVolume": info.get("averageVolume"),
                "volume": info.get("regularMarketVolume") or info.get("volume"),
                "inTWSE": True,
                "_computed": computed,
                "_sparkline": sparkline,
            }
            rows.append(row)
        except Exception:
            continue
    return rows


def _get_heatmap_data():
    with _heatmap_lock:
        now = datetime.now().timestamp()
        if _heatmap_cache["data"] is not None and (now - _heatmap_cache.get("checked", 0)) < 30:
            return _heatmap_cache["data"]
        _heatmap_cache["checked"] = now

        latest_mtime = 0
        if os.path.isdir(BATCH_DATA_DIR):
            for fname in os.listdir(BATCH_DATA_DIR):
                fpath = os.path.join(BATCH_DATA_DIR, fname)
                mt = os.path.getmtime(fpath)
                if mt > latest_mtime:
                    latest_mtime = mt
        if _heatmap_cache["data"] is None or latest_mtime > _heatmap_cache["mtime"]:
            logger.info("[heatmap] Rebuilding cache...")
            _heatmap_cache["data"] = _build_heatmap_data()
            _heatmap_cache["mtime"] = latest_mtime
            logger.info(f"[heatmap] Cache rebuilt: {len(_heatmap_cache['data'])} rows")
        return _heatmap_cache["data"]


# ─── Disk-persisted heatmap cache (production fast-path) ─────────

_HEATMAP_CACHE_DIR = os.path.join(CACHE_DIR, "heatmap")
_HEATMAP_INDEX_OPTIONS = ("", "twse")


def _heatmap_disk_key(index_filter: str, period: str) -> str:
    """Deterministic filename for a precomputed heatmap response."""
    idx = index_filter or "all"
    return f"{idx}_{period}"


def invalidate_heatmap_cache():
    """Force heatmap cache rebuild on next access. Call after batch data updates."""
    with _heatmap_lock:
        _heatmap_cache["mtime"] = 0
        _heatmap_cache["checked"] = 0
    with _heatmap_response_lock:
        _heatmap_response_cache.clear()
    logger.info("[heatmap] Cache invalidated — will rebuild on next request.")


def prewarm_heatmap_cache():
    """Rebuild heatmap cache eagerly (call from scheduler after data updates)."""
    invalidate_heatmap_cache()
    _get_heatmap_data()
    logger.info("[heatmap] Cache prewarmed.")


def rebuild_heatmap_disk_cache():
    """Pre-build and persist heatmap JSON responses for all common param combos.

    Covers 2 index options × 4 periods = 8 files (no sector filter).
    Called by the scheduler after data updates so /api/heatmap serves
    instantly from disk — identical to the landing-page pattern.
    """
    import tempfile

    # Ensure raw data is fresh in memory first
    prewarm_heatmap_cache()
    rows = _get_heatmap_data()
    if not rows:
        logger.warning("[heatmap-disk] No rows — skipping disk cache build.")
        return

    os.makedirs(_HEATMAP_CACHE_DIR, exist_ok=True)

    all_sectors = sorted(set(r.get("sector") for r in rows if r.get("sector")))
    all_industries = sorted(set(r.get("industry") for r in rows if r.get("industry")))

    count = 0
    for index_filter in _HEATMAP_INDEX_OPTIONS:
        # Apply index filter once
        if index_filter == "twse":
            filtered = [r for r in rows if r.get("inTWSE")]
        else:
            filtered = rows

        for period in _HEATMAP_PERIODS:
            output = []
            for row in filtered:
                out = {k: v for k, v in row.items() if not k.startswith("_")}
                computed = row.get("_computed", {}).get(period, {})
                pct = computed.get("changePercent")
                if pct is not None:
                    out["changePercent"] = pct
                out["debug"] = computed.get("debug", {})
                sparkline = row.get("_sparkline")
                if sparkline:
                    out["sparkline"] = sparkline
                output.append(out)

            result = {
                "stocks": output,
                "sectors": all_sectors,
                "industries": all_industries,
                "count": len(output),
                "_cachedAt": datetime.now().isoformat(),
            }

            key = _heatmap_disk_key(index_filter, period)
            dest = os.path.join(_HEATMAP_CACHE_DIR, f"{key}.json")
            try:
                fd, tmp = tempfile.mkstemp(
                    dir=_HEATMAP_CACHE_DIR, suffix=".tmp"
                )
                with os.fdopen(fd, "w") as f:
                    json.dump(result, f, default=str)
                os.replace(tmp, dest)
                count += 1
            except Exception as exc:
                logger.error("[heatmap-disk] Failed to write %s: %s", key, exc)

    logger.info("[heatmap-disk] Rebuilt %d precomputed responses.", count)


def _compute_period_change(prices, period):
    """Return (pct, debug_dict) for any period including 1d."""
    empty = (None, {})
    if not prices or len(prices) < 2:
        return empty

    last_price = prices[-1]
    last_close = last_price.get("close")
    if not last_close:
        return empty

    latest_date_str = prices[-1]["date"]
    today = datetime.strptime(latest_date_str, "%Y-%m-%d").date()

    if period == "1d":
        ref_close = prices[-2].get("close")
        ref_date_str = prices[-2]["date"]
    else:
        if period == "1w":
            target_date = today - timedelta(days=7)
        elif period == "1m":
            target_date = today - timedelta(days=30)
        elif period == "ytd":
            target_date = dt_date(today.year, 1, 1)
        else:
            return empty

        ref_close = None
        ref_date_str = None
        for p in prices:
            d = datetime.strptime(p["date"], "%Y-%m-%d").date()
            if d <= target_date:
                ref_close = p.get("close")
                ref_date_str = p["date"]
            else:
                break

    debug = {
        "latestDate": latest_date_str,
        "latestClose": round(last_close, 4) if last_close else None,
        "refDate": ref_date_str,
        "refClose": round(ref_close, 4) if ref_close else None,
    }

    if ref_close and ref_close != 0:
        pct = round((last_close - ref_close) / ref_close * 100, 4)
        if not (math.isnan(pct) or math.isinf(pct)):
            return pct, debug
    return None, debug


# ═══════════════════════════════════════════════════════════
# ROUTE HANDLERS
# ═══════════════════════════════════════════════════════════


# ─── Bulk Prices ─────────────────────────────────────────

def _period_cutoff(period: str) -> datetime:
    """Return the earliest date to include for a given period string."""
    now = datetime.now()
    mapping = {
        "1mo": timedelta(days=31),
        "3mo": timedelta(days=93),
        "6mo": timedelta(days=183),
        "ytd": now - datetime(now.year, 1, 1),
        "1y": timedelta(days=365),
        "2y": timedelta(days=730),
        "5y": timedelta(days=1826),
        "10y": timedelta(days=3652),
    }
    delta = mapping.get(period)
    if delta is None:
        return datetime(2000, 1, 1)
    if isinstance(delta, timedelta):
        return now - delta
    return now - delta  # ytd returns timedelta directly


@screener_bp.route("/api/bulk-prices", methods=["GET"])
def api_bulk_prices():
    raw = request.args.get("tickers", "").strip().upper()
    if not raw:
        return jsonify({"error": "Missing 'tickers' parameter"}), 400

    tickers = [t.strip() for t in raw.split(",") if t.strip()]
    if len(tickers) > 200:
        return jsonify({"error": "Maximum 200 tickers per request"}), 400

    period = request.args.get("period", "5y")
    cutoff = _period_cutoff(period)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    results = {}
    uncached = []

    # 1. Check in-memory / disk cache first
    for ticker in tickers:
        cache_key = f"{ticker}_{period}"
        cached = _cache_get("bulk_prices", cache_key)
        if cached is not None:
            results[ticker] = cached
        else:
            uncached.append(ticker)

    # 2. For uncached, try batch_data (pre-built by scheduler)
    still_uncached = []
    for ticker in uncached:
        batch_path = os.path.join(BATCH_DATA_DIR, f"{ticker}.json")
        try:
            if os.path.exists(batch_path):
                with open(batch_path, "r") as f:
                    bd = json.load(f)
                prices = bd.get("prices", [])
                records = [
                    {
                        "time": p["date"],
                        "open": round(float(p["open"]), 2),
                        "high": round(float(p["high"]), 2),
                        "low": round(float(p["low"]), 2),
                        "close": round(float(p["close"]), 2),
                        "volume": int(p.get("volume", 0)),
                    }
                    for p in prices
                    if p.get("date", "") >= cutoff_str
                ]
                if records:
                    results[ticker] = records
                    _cache_put("bulk_prices", f"{ticker}_{period}", records)
                    continue
        except Exception as exc:
            logger.warning(f"[bulk-prices] batch_data read error for {ticker}: {exc}")
        still_uncached.append(ticker)

    # 3. Fallback to Yahoo Finance for remaining tickers
    if still_uncached:
        try:
            df = yf.download(still_uncached, period=period, group_by="ticker", auto_adjust=True, threads=True)
            for ticker in still_uncached:
                try:
                    if len(still_uncached) == 1:
                        tdf = df.copy()
                    else:
                        tdf = df[ticker].copy()

                    tdf = tdf.dropna(subset=["Close"])
                    if tdf.empty:
                        continue

                    records = []
                    for idx, row in tdf.iterrows():
                        records.append({
                            "time": idx.strftime("%Y-%m-%d"),
                            "open": round(float(row["Open"]), 2),
                            "high": round(float(row["High"]), 2),
                            "low": round(float(row["Low"]), 2),
                            "close": round(float(row["Close"]), 2),
                            "volume": int(row["Volume"]) if not math.isnan(row["Volume"]) else 0,
                        })
                    results[ticker] = records
                    _cache_put("bulk_prices", f"{ticker}_{period}", records)
                except Exception as exc:
                    logger.warning(f"[bulk-prices] Skipping {ticker}: {exc}")
                    continue
        except Exception as e:
            if results:
                logger.warning(f"[bulk-prices] Yahoo download failed, returning cached data only: {e}")
            else:
                return jsonify({"error": "Failed to fetch bulk prices"}), 500

    return jsonify({"tickers": list(results.keys()), "data": results})


# ─── Bulk Fundamentals ───────────────────────────────────

def _extract_fundamentals_from_batch(ticker: str) -> dict | None:
    """Extract fundamentals data from batch_data cache file."""
    batch_path = os.path.join(BATCH_DATA_DIR, f"{ticker}.json")
    if not os.path.exists(batch_path):
        return None
    try:
        with open(batch_path, "r") as f:
            bd = json.load(f)

        # --- Income statement (metric-rows format) ---
        inc_rows = bd.get("income_stmt", [])
        metrics = {}
        for row in inc_rows:
            idx = row.get("_index", "")
            if idx in ("Total Revenue", "Net Income", "Gross Profit", "Operating Income", "EBIT"):
                metrics[idx] = {k: v for k, v in row.items() if k != "_index"}

        # Collect all date columns, sorted ascending
        date_cols = set()
        for m in metrics.values():
            date_cols.update(m.keys())
        date_cols = sorted(date_cols)

        periods = []
        for dc in date_cols:
            label = dc[:4]  # "2024-09-30 00:00:00" → "2024"
            rev = _safe_num(metrics.get("Total Revenue", {}).get(dc))
            net = _safe_num(metrics.get("Net Income", {}).get(dc))
            gross = _safe_num(metrics.get("Gross Profit", {}).get(dc))
            op_inc = _safe_num(metrics.get("Operating Income", {}).get(dc))
            if op_inc is None:
                op_inc = _safe_num(metrics.get("EBIT", {}).get(dc))
            if rev is None and net is None:
                continue
            periods.append({
                "period": label,
                "revenue": rev,
                "netIncome": net,
                "grossProfit": gross,
                "operatingIncome": op_inc,
            })

        if not periods:
            return None

        # --- Dividends ---
        div_periods = []
        raw_divs = bd.get("dividends", [])
        if raw_divs:
            from collections import defaultdict
            yearly: dict[str, list[float]] = defaultdict(list)
            cutoff_year = int(periods[0]["period"][:4])
            now_year = str(datetime.now().year)
            for d in raw_divs:
                ddate = d.get("date", "")[:4]
                if ddate and int(ddate) >= cutoff_year:
                    yearly[ddate].append(float(d.get("value", 0)))
            for yr in sorted(yearly.keys()):
                vals = yearly[yr]
                div_periods.append({
                    "period": yr,
                    "total": round(sum(vals), 4),
                    "payments": len(vals),
                    "incomplete": yr == now_year,
                })

        # --- Dividend yield ---
        info = bd.get("info", {})
        div_yield = None
        dr = info.get("dividendRate")
        price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        if dr and price and price > 0:
            div_yield = round(dr / price * 100, 2)

        return {
            "income": periods,
            "dividends": div_periods,
            "dividendYield": div_yield,
        }
    except Exception as exc:
        logger.warning(f"[bulk-fundamentals] batch_data read error for {ticker}: {exc}")
        return None


def _fetch_fundamentals_yahoo(ticker: str) -> dict | None:
    """Fetch fundamentals from Yahoo Finance for a single ticker."""
    try:
        stock = yf.Ticker(ticker)
        fin = stock.financials
        if fin is None or fin.empty:
            return None

        periods = []
        for col in reversed(fin.columns):
            label = col.strftime("%Y") if hasattr(col, "strftime") else str(col)[:4]
            rev = _safe_num(fin[col].get("Total Revenue"))
            net = _safe_num(fin[col].get("Net Income"))
            gross = _safe_num(fin[col].get("Gross Profit"))
            op_inc = _safe_num(fin[col].get("Operating Income") or fin[col].get("EBIT"))
            if rev is None and net is None:
                continue
            periods.append({
                "period": label,
                "revenue": rev,
                "netIncome": net,
                "grossProfit": gross,
                "operatingIncome": op_inc,
            })

        div_periods = []
        try:
            divs = stock.dividends
            if divs is not None and not divs.empty:
                div_df = divs.reset_index()
                div_df.columns = ["Date", "Dividend"]
                div_df["Date"] = pd.to_datetime(div_df["Date"]).dt.tz_localize(None)
                cutoff_year = int(periods[0]["period"][:4]) if periods else div_df["Date"].max().year - 10
                div_df = div_df[div_df["Date"].dt.year >= cutoff_year]
                div_df["Period"] = div_df["Date"].dt.strftime("%Y")
                agg = div_df.groupby("Period", sort=True).agg(
                    total=("Dividend", "sum"),
                    payments=("Dividend", "count"),
                ).reset_index()
                now_year = str(datetime.now().year)
                for _, row in agg.iterrows():
                    div_periods.append({
                        "period": row["Period"],
                        "total": round(float(row["total"]), 4),
                        "payments": int(row["payments"]),
                        "incomplete": row["Period"] == now_year,
                    })
        except Exception as exc:
            logger.warning(f"[bulk-fundamentals] Dividend error for {ticker}: {exc}")

        info = dict(stock.info or {})
        div_yield = None
        try:
            dr = info.get("dividendRate")
            price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
            if dr and price and price > 0:
                div_yield = round(dr / price * 100, 2)
        except Exception:
            pass

        if not periods:
            return None
        return {
            "income": periods,
            "dividends": div_periods,
            "dividendYield": div_yield,
        }
    except Exception as exc:
        logger.warning(f"[bulk-fundamentals] Skipping {ticker}: {exc}")
        return None


@screener_bp.route("/api/bulk-fundamentals", methods=["GET"])
def api_bulk_fundamentals():
    raw = request.args.get("tickers", "").strip().upper()
    if not raw:
        return jsonify({"error": "Missing 'tickers' parameter"}), 400

    tickers = [t.strip() for t in raw.split(",") if t.strip()]
    if len(tickers) > 200:
        return jsonify({"error": "Maximum 200 tickers per request"}), 400

    results = {}
    uncached = []

    # 1. Check in-memory / disk cache
    for ticker in tickers:
        cached = _cache_get("bulk_fundamentals", ticker)
        if cached is not None:
            results[ticker] = cached
        else:
            uncached.append(ticker)

    # 2. Try batch_data for uncached tickers
    still_uncached = []
    for ticker in uncached:
        entry = _extract_fundamentals_from_batch(ticker)
        if entry:
            results[ticker] = entry
            _cache_put("bulk_fundamentals", ticker, entry)
        else:
            still_uncached.append(ticker)

    # 3. Fallback to Yahoo — parallelized
    if still_uncached:
        with ThreadPoolExecutor(max_workers=min(8, len(still_uncached))) as pool:
            futures = {pool.submit(_fetch_fundamentals_yahoo, t): t for t in still_uncached}
            for fut in as_completed(futures):
                ticker = futures[fut]
                entry = fut.result()
                if entry:
                    results[ticker] = entry
                    _cache_put("bulk_fundamentals", ticker, entry)

    return jsonify({"tickers": list(results.keys()), "data": results})


# ─── Screener ────────────────────────────────────────────

@screener_bp.route("/api/screener", methods=["GET"])
def api_screener():
    rows = _get_screener_data()
    if not rows:
        return jsonify({"stocks": [], "sectors": [], "count": 0, "total": 0})

    resp_key = request.query_string.decode("utf-8", errors="replace")
    now = datetime.now().timestamp()
    with _screener_response_lock:
        cached_resp = _screener_response_cache.get(resp_key)
        if cached_resp and (now - cached_resp["ts"]) < _SCREENER_RESPONSE_TTL:
            from flask import current_app
            return current_app.response_class(
                response=cached_resp["json"],
                status=200,
                mimetype="application/json",
            )

    total = len(rows)

    index_filter = request.args.get("index")
    sector = request.args.get("sector")
    industry = request.args.get("industry")
    search = request.args.get("search", "").strip().upper()[:50]
    min_cap = request.args.get("minCap", type=float)
    max_cap = request.args.get("maxCap", type=float)
    max_pe = request.args.get("maxPe", type=float)
    min_div = request.args.get("minDivYield", type=float)

    filtered = rows
    if index_filter == "twse":
        filtered = [r for r in filtered if r.get("inTWSE")]
    if sector:
        filtered = [r for r in filtered if r.get("sector") == sector]
    if industry:
        q = industry.lower()
        filtered = [r for r in filtered if q in (r.get("industry") or "").lower()]
    if search:
        filtered = [r for r in filtered
                    if search in (r.get("symbol") or "").upper()
                    or search in (r.get("shortName") or "").upper()]
    if min_cap is not None:
        filtered = [r for r in filtered if (r.get("marketCap") or 0) >= min_cap]
    if max_cap is not None:
        filtered = [r for r in filtered if (r.get("marketCap") or 0) <= max_cap]
    if max_pe is not None:
        filtered = [r for r in filtered if r.get("trailingPE") is not None and r["trailingPE"] <= max_pe]
    if min_div is not None:
        filtered = [r for r in filtered if (r.get("dividendYield") or 0) >= min_div]

    sort_field = request.args.get("sort", "marketCap")
    order = request.args.get("order", "desc")

    # Type-safe sorting: keep missing values at the end for both asc/desc.
    # This avoids Python 3 comparison errors when a field mixes strings and None.
    missing_rank = -1 if order == "desc" else 1

    def sort_key(r):
        v = r.get(sort_field)
        if v is None:
            return (missing_rank, 2, "")
        if isinstance(v, str):
            s = v.strip().lower()
            if not s:
                return (missing_rank, 2, "")
            return (0, 1, s)
        if isinstance(v, (int, float)):
            n = float(v)
            if math.isnan(n) or math.isinf(n):
                return (missing_rank, 2, "")
            return (0, 0, n)
        return (0, 2, str(v).lower())

    filtered.sort(key=sort_key, reverse=(order == "desc"))

    all_sectors = sorted(set(r.get("sector") for r in rows if r.get("sector")))

    result = {
        "stocks": filtered,
        "sectors": all_sectors,
        "count": len(filtered),
        "total": total,
    }
    resp_json = json.dumps(result, default=str)
    with _screener_response_lock:
        if resp_key in _screener_response_cache:
            _screener_response_cache.move_to_end(resp_key)
        elif len(_screener_response_cache) >= _SCREENER_RESP_MAX:
            _screener_response_cache.popitem(last=False)
        _screener_response_cache[resp_key] = {"json": resp_json, "ts": now}
    from flask import current_app
    return current_app.response_class(response=resp_json, status=200, mimetype="application/json")


# ─── Heatmap ─────────────────────────────────────────────

@screener_bp.route("/api/heatmap", methods=["GET"])
def api_heatmap():
    index_filter = request.args.get("index", "").strip().lower()
    sector_filter = request.args.get("sector", "").strip()
    period = request.args.get("period", "1d").strip().lower()
    if period not in _HEATMAP_PERIODS:
        period = "1d"

    # ── Fast path: serve pre-built disk cache (no sector filter) ──
    if not sector_filter:
        key = _heatmap_disk_key(index_filter, period)
        disk_path = os.path.join(_HEATMAP_CACHE_DIR, f"{key}.json")
        try:
            if os.path.exists(disk_path):
                with open(disk_path, "r") as f:
                    payload = f.read()
                from flask import current_app
                return current_app.response_class(
                    response=payload, status=200, mimetype="application/json"
                )
        except Exception as exc:
            logger.warning("[heatmap] Disk cache read failed for %s: %s", key, exc)

    # ── Fallback: compute on-the-fly (sector filter or no disk cache) ──
    rows = _get_heatmap_data()
    if not rows:
        return jsonify({"stocks": [], "sectors": [], "industries": [], "count": 0})

    resp_key = f"{index_filter}|{sector_filter}|{period}"
    now = datetime.now().timestamp()
    with _heatmap_response_lock:
        cached_resp = _heatmap_response_cache.get(resp_key)
        if cached_resp and (now - cached_resp["ts"]) < _HEATMAP_RESPONSE_TTL:
            from flask import current_app
            return current_app.response_class(
                response=cached_resp["json"],
                status=200,
                mimetype="application/json",
            )

    filtered = rows
    if index_filter == "twse":
        filtered = [r for r in filtered if r.get("inTWSE")]
    if sector_filter:
        filtered = [r for r in filtered if r.get("sector") == sector_filter]

    output = []
    for row in filtered:
        out = {k: v for k, v in row.items() if not k.startswith("_")}
        computed = row.get("_computed", {}).get(period, {})
        pct = computed.get("changePercent")
        if pct is not None:
            out["changePercent"] = pct
        out["debug"] = computed.get("debug", {})
        sparkline = row.get("_sparkline")
        if sparkline:
            out["sparkline"] = sparkline
        output.append(out)

    all_sectors = sorted(set(r.get("sector") for r in rows if r.get("sector")))
    all_industries = sorted(set(r.get("industry") for r in rows if r.get("industry")))

    result = {
        "stocks": output,
        "sectors": all_sectors,
        "industries": all_industries,
        "count": len(output),
    }
    resp_json = json.dumps(result, default=str)
    with _heatmap_response_lock:
        if resp_key in _heatmap_response_cache:
            _heatmap_response_cache.move_to_end(resp_key)
        elif len(_heatmap_response_cache) >= _HEATMAP_RESP_MAX:
            _heatmap_response_cache.popitem(last=False)
        _heatmap_response_cache[resp_key] = {"json": resp_json, "ts": now}
    from flask import current_app
    return current_app.response_class(response=resp_json, status=200, mimetype="application/json")


# ─── Cache management ────────────────────────────────────

@screener_bp.route("/api/cache/clear", methods=["POST"])
def api_cache_clear():
    namespace = request.args.get("namespace", "").strip()
    if namespace:
        ns_dir = os.path.join(CACHE_DIR, namespace)
        if os.path.isdir(ns_dir):
            shutil.rmtree(ns_dir)
            return jsonify({"cleared": namespace})
        return jsonify({"error": f"Namespace '{namespace}' not found"}), 404
    else:
        for entry in os.listdir(CACHE_DIR):
            entry_path = os.path.join(CACHE_DIR, entry)
            if os.path.isdir(entry_path):
                shutil.rmtree(entry_path)
        return jsonify({"cleared": "all"})


@screener_bp.route("/api/cache/status", methods=["GET"])
def api_cache_status():
    status = {"ttl_seconds": CACHE_TTL, "namespaces": {}}
    if os.path.isdir(CACHE_DIR):
        for ns in sorted(os.listdir(CACHE_DIR)):
            ns_path = os.path.join(CACHE_DIR, ns)
            if os.path.isdir(ns_path):
                files = os.listdir(ns_path)
                status["namespaces"][ns] = {
                    "entries": len(files),
                    "keys": sorted(f.replace(".json", "") for f in files),
                }
    return jsonify(status)


# ─── Stock Detail ────────────────────────────────────────

@screener_bp.route("/api/stock-detail/<ticker>", methods=["GET"])
def api_stock_detail(ticker):
    ticker, err = _validate_ticker(ticker)
    if err:
        return err
    batch_path = os.path.join(BATCH_DATA_DIR, f"{ticker}.json")
    if not os.path.isfile(batch_path):
        return jsonify({"error": f"No data for {ticker}"}), 404

    try:
        with open(batch_path) as f:
            blob = json.load(f)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    info = blob.get("info", {})
    prices = blob.get("prices", [])

    profile = {
        "name": info.get("shortName") or info.get("longName") or ticker,
        "description": info.get("longBusinessSummary"),
        "website": info.get("website"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "employees": info.get("fullTimeEmployees"),
        "city": info.get("city"),
        "state": info.get("state"),
        "country": info.get("country"),
    }

    officers = []
    for o in info.get("companyOfficers", []):
        officers.append({
            "name": o.get("name"),
            "title": o.get("title"),
            "totalPay": _safe_num(o.get("totalPay")),
            "exercisedValue": _safe_num(o.get("exercisedValue")),
            "yearBorn": o.get("yearBorn"),
        })

    ratios = {
        "name": info.get("shortName") or ticker,
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "marketCap": _safe_num(info.get("marketCap")),
        "trailingPE": _safe_num(info.get("trailingPE")),
        "forwardPE": _safe_num(info.get("forwardPE")),
        "profitMargin": _safe_num(info.get("profitMargins")),
        "operatingMargin": _safe_num(info.get("operatingMargins")),
        "grossMargin": _safe_num(info.get("grossMargins")),
        "epsTrailing": _safe_num(info.get("trailingEps")),
        "epsForward": _safe_num(info.get("forwardEps")),
        "dividendRate": _safe_num(info.get("dividendRate")),
        "dividendYield": _safe_num(info.get("dividendYield")),
        "payoutRatio": _safe_num(info.get("payoutRatio")),
        "beta": _safe_num(info.get("beta")),
        "roe": _safe_num(info.get("returnOnEquity")),
        "roa": _safe_num(info.get("returnOnAssets")),
        "debtToEquity": _safe_num(info.get("debtToEquity")),
        "currentRatio": _safe_num(info.get("currentRatio")),
        "revenueGrowth": _safe_num(info.get("revenueGrowth")),
        "earningsGrowth": _safe_num(info.get("earningsGrowth")),
        "priceToBook": _safe_num(info.get("priceToBook")),
        "freeCashflow": _safe_num(info.get("freeCashflow")),
        "operatingCashflow": _safe_num(info.get("operatingCashflow")),
        "totalCash": _safe_num(info.get("totalCash")),
        "totalDebt": _safe_num(info.get("totalDebt")),
        "sharesOutstanding": _safe_num(info.get("sharesOutstanding")),
        "fiftyTwoWeekHigh": _safe_num(info.get("fiftyTwoWeekHigh")),
        "fiftyTwoWeekLow": _safe_num(info.get("fiftyTwoWeekLow")),
        "averageVolume": _safe_num(info.get("averageVolume")),
    }

    # ── Helper: transpose metric-rows × date-columns to period-rows ──
    # Raw batch data layout: each row is one metric (e.g. "Total Revenue")
    # with date-string keys ("2024-05-31 00:00:00") holding the values.
    # We need to pivot so each output item represents one period.
    def _pivot_to_periods(raw_rows, quarterly=False):
        """Return {date_str: {metric_name: value}} sorted by date."""
        if not raw_rows:
            return []
        # Build a metric lookup: metric_name → {date: value}
        metrics = {}
        date_keys = set()
        for row in raw_rows:
            name = row.get("_index", "")
            for key, val in row.items():
                if key == "_index":
                    continue
                date_keys.add(key)
                if name not in metrics:
                    metrics[name] = {}
                metrics[name][key] = val
        # Sort dates chronologically
        sorted_dates = sorted(date_keys)
        return sorted_dates, metrics

    def _period_label_str(date_str, quarterly=False):
        """Turn '2024-05-31 00:00:00' → '2024' or '2024-Q2'."""
        try:
            parts = date_str.split("-")
            year = parts[0]
            month = int(parts[1]) if len(parts) > 1 else 1
            if quarterly:
                q = (month - 1) // 3 + 1
                return f"{year}-Q{q}"
            return year
        except Exception:
            return date_str[:4] if len(date_str) >= 4 else date_str

    def _parse_financial_rows(raw_rows, quarterly=False):
        if not raw_rows:
            return []
        result = _pivot_to_periods(raw_rows, quarterly)
        if not result:
            return []
        sorted_dates, metrics = result
        items = []
        for d in sorted_dates:
            rev = _safe_num(metrics.get("Total Revenue", {}).get(d))
            gp = _safe_num(metrics.get("Gross Profit", {}).get(d))
            oi = _safe_num(metrics.get("Operating Income", {}).get(d)) or _safe_num(metrics.get("EBIT", {}).get(d))
            ni = _safe_num(metrics.get("Net Income", {}).get(d))
            eps_basic = _safe_num(metrics.get("Basic EPS", {}).get(d))
            items.append({
                "period": _period_label_str(d, quarterly),
                "revenue": rev,
                "grossProfit": gp,
                "operatingIncome": oi,
                "netIncome": ni,
                "grossMargin": round(gp / rev * 100, 2) if gp and rev and rev != 0 else None,
                "operatingMargin": round(oi / rev * 100, 2) if oi and rev and rev != 0 else None,
                "netMargin": round(ni / rev * 100, 2) if ni and rev and rev != 0 else None,
                "eps": eps_basic,
            })
        return items

    income = _parse_financial_rows(blob.get("income_stmt", []))
    quarterly_income = _parse_financial_rows(blob.get("quarterly_income_stmt", []), quarterly=True)

    def _parse_bs_rows(raw_rows, quarterly=False):
        if not raw_rows:
            return []
        result = _pivot_to_periods(raw_rows, quarterly)
        if not result:
            return []
        sorted_dates, metrics = result
        items = []
        for d in sorted_dates:
            items.append({
                "period": _period_label_str(d, quarterly),
                "totalAssets": _safe_num(metrics.get("Total Assets", {}).get(d)),
                "totalLiabilities": _safe_num(metrics.get("Total Liabilities Net Minority Interest", {}).get(d)),
                "stockholdersEquity": _safe_num(metrics.get("Stockholders Equity", {}).get(d)) or _safe_num(metrics.get("Total Equity Gross Minority Interest", {}).get(d)),
                "totalDebt": _safe_num(metrics.get("Total Debt", {}).get(d)),
                "cash": _safe_num(metrics.get("Cash And Cash Equivalents", {}).get(d)),
                "currentAssets": _safe_num(metrics.get("Current Assets", {}).get(d)),
                "currentLiabilities": _safe_num(metrics.get("Current Liabilities", {}).get(d)),
                "goodwill": _safe_num(metrics.get("Goodwill", {}).get(d)),
                "retainedEarnings": _safe_num(metrics.get("Retained Earnings", {}).get(d)),
                "longTermDebt": _safe_num(metrics.get("Long Term Debt", {}).get(d)),
            })
        return items

    balance_sheet = _parse_bs_rows(blob.get("balance_sheet", []))
    quarterly_balance_sheet = _parse_bs_rows(blob.get("quarterly_balance_sheet", []), quarterly=True)

    def _parse_cf_rows(raw_rows, quarterly=False):
        if not raw_rows:
            return []
        result = _pivot_to_periods(raw_rows, quarterly)
        if not result:
            return []
        sorted_dates, metrics = result
        items = []
        for d in sorted_dates:
            items.append({
                "period": _period_label_str(d, quarterly),
                "operatingCashFlow": _safe_num(metrics.get("Operating Cash Flow", {}).get(d)),
                "investingCashFlow": _safe_num(metrics.get("Investing Cash Flow", {}).get(d)) or _safe_num(metrics.get("Cash Flow From Continuing Investing Activities", {}).get(d)),
                "financingCashFlow": _safe_num(metrics.get("Financing Cash Flow", {}).get(d)) or _safe_num(metrics.get("Cash Flow From Continuing Financing Activities", {}).get(d)),
                "freeCashFlow": _safe_num(metrics.get("Free Cash Flow", {}).get(d)),
                "capex": _safe_num(metrics.get("Capital Expenditure", {}).get(d)),
                "dividendsPaid": _safe_num(metrics.get("Common Stock Dividend Paid", {}).get(d)) or _safe_num(metrics.get("Cash Dividends Paid", {}).get(d)),
                "stockBuyback": _safe_num(metrics.get("Repurchase Of Capital Stock", {}).get(d)),
                "debtRepayment": _safe_num(metrics.get("Repayment Of Debt", {}).get(d)),
                "debtIssuance": _safe_num(metrics.get("Issuance Of Debt", {}).get(d)),
                "netChangeInCash": _safe_num(metrics.get("Changes In Cash", {}).get(d)),
            })
        return items

    cash_flow = _parse_cf_rows(blob.get("cash_flow", []))
    quarterly_cash_flow = _parse_cf_rows(blob.get("quarterly_cash_flow", []), quarterly=True)

    recs = blob.get("recommendations", [])
    recommendations = []
    for r_item in (recs if isinstance(recs, list) else []):
        recommendations.append({
            "period": r_item.get("period", ""),
            "strongBuy": r_item.get("strongBuy", 0),
            "buy": r_item.get("buy", 0),
            "hold": r_item.get("hold", 0),
            "sell": r_item.get("sell", 0),
            "strongSell": r_item.get("strongSell", 0),
        })

    holders_data = {"summary": {}, "holders": []}
    holders_path = os.path.join(CACHE_DIR, "holders", f"{ticker}.json")
    if os.path.isfile(holders_path):
        try:
            with open(holders_path) as f:
                holders_data = json.load(f)
        except Exception:
            pass

    analysis_data = None
    analysis_path = os.path.join(ANALYSIS_DIR, f"{ticker}.json")
    if os.path.isfile(analysis_path):
        try:
            with open(analysis_path) as f:
                analysis_data = json.load(f)
        except Exception:
            pass

    result = {
        "ticker": ticker,
        "prices": prices,
        "profile": profile,
        "officers": officers,
        "ratios": ratios,
        "income": income,
        "quarterlyIncome": quarterly_income,
        "balanceSheet": balance_sheet,
        "quarterlyBalanceSheet": quarterly_balance_sheet,
        "cashFlow": cash_flow,
        "quarterlyCashFlow": quarterly_cash_flow,
        "recommendations": recommendations,
        "holders": holders_data,
        "analysis": analysis_data,
        "calendar": {},
        "splits": [],
    }
    return jsonify(result)


# ─── Sectors ─────────────────────────────────────────────

@screener_bp.route("/api/sectors", methods=["GET"])
def api_sectors():
    rows = _get_screener_data()
    if not rows:
        return jsonify({"sectors": []})

    sector_map = {}
    for r in rows:
        sec = r.get("sector")
        if not sec:
            continue
        if sec not in sector_map:
            sector_map[sec] = {
                "name": sec,
                "stocks": [],
                "totalMarketCap": 0,
                "industries": set(),
            }
        sector_map[sec]["stocks"].append(r)
        sector_map[sec]["totalMarketCap"] += (r.get("marketCap") or 0)
        ind = r.get("industry")
        if ind:
            sector_map[sec]["industries"].add(ind)

    sectors = []
    for sec, info in sector_map.items():
        stocks = info["stocks"]
        count = len(stocks)

        def _avg(field, _stocks=stocks):
            vals = [s[field] for s in _stocks if isinstance(s.get(field), (int, float))]
            return round(sum(vals) / len(vals), 4) if vals else None

        def _median(field, _stocks=stocks):
            vals = sorted(s[field] for s in _stocks if isinstance(s.get(field), (int, float)))
            if not vals:
                return None
            mid = len(vals) // 2
            return round(vals[mid], 4) if len(vals) % 2 else round((vals[mid - 1] + vals[mid]) / 2, 4)

        top = sorted(stocks, key=lambda s: s.get("marketCap") or 0, reverse=True)[:5]

        sectors.append({
            "name": sec,
            "stockCount": count,
            "totalMarketCap": info["totalMarketCap"],
            "avgPE": _median("trailingPE"),
            "meanPE": _avg("trailingPE"),
            "medianPE": _median("trailingPE"),
            "avgDividendYield": _avg("dividendYield"),
            "avgRevenueGrowth": _avg("revenueGrowth"),
            "avgProfitMargin": _avg("profitMargins"),
            "topStocks": [{"symbol": s.get("symbol"), "shortName": s.get("shortName"), "marketCap": s.get("marketCap")} for s in top],
            "industries": sorted(info["industries"]),
        })

    sectors.sort(key=lambda s: s["totalMarketCap"], reverse=True)
    return jsonify({"sectors": sectors})


@screener_bp.route("/api/sectors/<sector>", methods=["GET"])
def api_sector_detail(sector):
    rows = _get_screener_data()
    if not rows:
        return jsonify({"sector": sector, "stocks": [], "industries": []})

    sector_stocks = [r for r in rows if r.get("sector") == sector]
    if not sector_stocks:
        return jsonify({"error": f"Sector '{sector}' not found"}), 404

    industry_map = {}
    for s in sector_stocks:
        ind = s.get("industry") or "Other"
        if ind not in industry_map:
            industry_map[ind] = []
        industry_map[ind].append(s)

    industries = []
    for ind, stocks in sorted(industry_map.items()):
        def _avg(field, _stocks=stocks):
            vals = [s[field] for s in _stocks if isinstance(s.get(field), (int, float))]
            return round(sum(vals) / len(vals), 4) if vals else None

        def _median(field, _stocks=stocks):
            vals = sorted(s[field] for s in _stocks if isinstance(s.get(field), (int, float)))
            if not vals:
                return None
            mid = len(vals) // 2
            return round(vals[mid], 4) if len(vals) % 2 else round((vals[mid - 1] + vals[mid]) / 2, 4)

        industries.append({
            "name": ind,
            "stockCount": len(stocks),
            "totalMarketCap": sum(s.get("marketCap") or 0 for s in stocks),
            "avgPE": _median("trailingPE"),
            "meanPE": _avg("trailingPE"),
            "medianPE": _median("trailingPE"),
            "avgDividendYield": _avg("dividendYield"),
        })

    industries.sort(key=lambda i: i["totalMarketCap"], reverse=True)
    sector_stocks.sort(key=lambda s: s.get("marketCap") or 0, reverse=True)

    return jsonify({
        "sector": sector,
        "stockCount": len(sector_stocks),
        "totalMarketCap": sum(s.get("marketCap") or 0 for s in sector_stocks),
        "industries": industries,
        "stocks": sector_stocks,
    })


# ─── Dividend Screener ───────────────────────────────────

_DIVIDEND_CACHE_NS = "twse_dividends"
_DIVIDEND_CACHE_KEY = "latest"
_DIVIDEND_CACHE_TTL = int(os.environ.get("DIVIDEND_CACHE_TTL_SECONDS", 6 * 3600))
_DIVIDEND_WINDOW_DEFAULT = 5
_DIVIDEND_COMPARE_HISTORY_YEARS = 5


def _empty_dividend_bucket(year: int):
    return {"year": year, "events": [], "totalYld": None}


def _empty_dividend_payload(anchor_year: int, window_years: int):
    years = [anchor_year - i for i in range(window_years)]
    h5y = [_empty_dividend_bucket(y) for y in years]
    ly = h5y[0] if h5y else _empty_dividend_bucket(anchor_year)
    return {
        "ly": ly,
        "h5y": h5y,
        "compare": ly,
        "progress": ly,
        "sortKeys": {
            "lyTotalYld": ly.get("totalYld"),
            "compareTotalYld": ly.get("totalYld"),
            "progressTotalYld": ly.get("totalYld"),
            "h5yAvgAnnualYld": None,
            "h5yLatestYearYld": ly.get("totalYld"),
        },
    }


def _eps5y_for_symbol(stock_row: dict, compare_year: int, years: int):
    eps_annual = stock_row.get("epsAnnual")
    if not isinstance(eps_annual, dict):
        eps_annual = {}
    points = []
    for offset in range(years):
        year = compare_year - offset
        eps = _safe_num(eps_annual.get(str(year)))
        points.append({"year": year, "eps": eps})
    return points


def _normalize_h5y(h5y_raw, anchor_year: int, window_years: int):
    years = [anchor_year - i for i in range(window_years)]
    if not isinstance(h5y_raw, list):
        return [_empty_dividend_bucket(y) for y in years]
    by_year = {}
    for row in h5y_raw:
        if not isinstance(row, dict):
            continue
        year = row.get("year")
        if not isinstance(year, int):
            continue
        events = row.get("events") if isinstance(row.get("events"), list) else []
        by_year[year] = {
            "year": year,
            "events": events,
            "totalYld": row.get("totalYld"),
        }
    return [by_year.get(y) or _empty_dividend_bucket(y) for y in years]


def _load_twse_dividend_cache():
    cached = _cache_get(_DIVIDEND_CACHE_NS, _DIVIDEND_CACHE_KEY, ttl=_DIVIDEND_CACHE_TTL)
    if cached is None:
        cached = _cache_get_stale(_DIVIDEND_CACHE_NS, _DIVIDEND_CACHE_KEY)
    if not isinstance(cached, dict):
        cached = {}

    anchor_year = cached.get("anchorYear")
    if not isinstance(anchor_year, int):
        anchor_year = datetime.now().year

    window_years = cached.get("windowYears")
    if not isinstance(window_years, int) or window_years < 1:
        window_years = _DIVIDEND_WINDOW_DEFAULT

    symbols = cached.get("symbols")
    if not isinstance(symbols, dict):
        symbols = {}

    return {
        **cached,
        "anchorYear": anchor_year,
        "windowYears": window_years,
        "symbols": symbols,
    }


def _dividend_for_symbol(div_cache: dict, symbol: str):
    anchor_year = div_cache["anchorYear"]
    window_years = div_cache["windowYears"]
    entry = (div_cache.get("symbols") or {}).get(symbol)
    if not isinstance(entry, dict):
        return _empty_dividend_payload(anchor_year, window_years)

    all_years = _normalize_h5y(entry.get("h5y"), anchor_year, window_years)
    by_year = {b.get("year"): b for b in all_years if isinstance(b, dict) and isinstance(b.get("year"), int)}

    progress_year = anchor_year
    compare_year = anchor_year - 1
    compare = by_year.get(compare_year) or _empty_dividend_bucket(compare_year)
    progress = by_year.get(progress_year) or _empty_dividend_bucket(progress_year)

    h5y = [
        by_year.get(compare_year - i) or _empty_dividend_bucket(compare_year - i)
        for i in range(_DIVIDEND_COMPARE_HISTORY_YEARS)
    ]

    raw_sort = entry.get("sortKeys") if isinstance(entry.get("sortKeys"), dict) else {}
    totals = [y.get("totalYld") for y in h5y if isinstance(y.get("totalYld"), (int, float))]
    h5y_avg = round(sum(totals) / len(totals), 4) if totals else None
    sort_keys = {
        "lyTotalYld": compare.get("totalYld"),
        "compareTotalYld": compare.get("totalYld"),
        "progressTotalYld": progress.get("totalYld"),
        "h5yAvgAnnualYld": raw_sort.get("h5yAvgAnnualYld") if isinstance(raw_sort.get("h5yAvgAnnualYld"), (int, float)) else h5y_avg,
        "h5yLatestYearYld": compare.get("totalYld"),
    }
    return {
        "ly": compare,  # backward compatibility for older clients
        "compare": compare,
        "progress": progress,
        "h5y": h5y,
        "sortKeys": sort_keys,
    }


def _has_any_dividend_events(div_payload: dict) -> bool:
    for key in ("compare", "progress"):
        bucket = div_payload.get(key)
        if isinstance(bucket, dict) and isinstance(bucket.get("events"), list) and bucket.get("events"):
            return True
    for bucket in div_payload.get("h5y", []):
        if isinstance(bucket, dict) and isinstance(bucket.get("events"), list) and bucket.get("events"):
            return True
    return False


def _ly_sort_tuple(stock: dict):
    sort_keys = stock.get("sortKeys") or {}
    compare = sort_keys.get("compareTotalYld")
    progress = sort_keys.get("progressTotalYld")
    compare_num = float(compare) if isinstance(compare, (int, float)) else None
    progress_num = float(progress) if isinstance(progress, (int, float)) else None
    missing_compare = 0 if compare_num is not None else 1
    return (
        missing_compare,
        -(compare_num if compare_num is not None else 0.0),
        -(progress_num if progress_num is not None else 0.0),
        stock.get("symbol") or "",
    )

@screener_bp.route("/api/dividend-screener", methods=["GET"])
def api_dividend_screener():
    rows = _get_screener_data()
    div_cache = _load_twse_dividend_cache()
    anchor_year = div_cache["anchorYear"]
    compare_year = anchor_year - 1
    progress_year = anchor_year
    window_years = _DIVIDEND_COMPARE_HISTORY_YEARS
    if not rows:
        return jsonify({
            "stocks": [],
            "sectors": [],
            "count": 0,
            "anchorYear": anchor_year,
            "compareYear": compare_year,
            "progressYear": progress_year,
            "windowYears": window_years,
            "lastFullYear": compare_year,
        })

    min_yield = request.args.get("minYield", type=float)
    max_yield = request.args.get("maxYield", type=float)
    sector = request.args.get("sector")
    min_cap = request.args.get("minCap", type=float)

    div_stocks = []
    for r in rows:
        if not r.get("inTWSE"):
            continue
        if sector and r.get("sector") != sector:
            continue
        if min_cap is not None and (r.get("marketCap") or 0) < min_cap:
            continue

        symbol = r.get("symbol")
        if not isinstance(symbol, str):
            continue

        div_payload = _dividend_for_symbol(div_cache, symbol)
        if not _has_any_dividend_events(div_payload):
            continue

        compare_total = (div_payload.get("sortKeys") or {}).get("compareTotalYld")
        if min_yield is not None and (not isinstance(compare_total, (int, float)) or compare_total < min_yield):
            continue
        if max_yield is not None and (not isinstance(compare_total, (int, float)) or compare_total > max_yield):
            continue

        extra = {
            "compare": div_payload.get("compare"),
            "progress": div_payload.get("progress"),
            "ly": div_payload.get("ly"),
            "h5y": div_payload.get("h5y"),
            "eps5y": _eps5y_for_symbol(r, compare_year, _DIVIDEND_COMPARE_HISTORY_YEARS),
            "sortKeys": div_payload.get("sortKeys"),
        }

        div_stocks.append({**r, **extra})

    div_stocks.sort(key=_ly_sort_tuple)
    sectors = sorted(set(s.get("sector") for s in div_stocks if s.get("sector")))

    return jsonify({
        "stocks": div_stocks,
        "sectors": sectors,
        "count": len(div_stocks),
        "anchorYear": anchor_year,
        "compareYear": compare_year,
        "progressYear": progress_year,
        "windowYears": window_years,
        "lastFullYear": compare_year,
    })


# ─── Financial Statements ────────────────────────────────

@screener_bp.route("/api/financials/<ticker>", methods=["GET"])
def api_financials(ticker):
    ticker, err = _validate_ticker(ticker)
    if err:
        return err
    batch_path = os.path.join(BATCH_DATA_DIR, f"{ticker}.json")
    if not os.path.isfile(batch_path):
        return jsonify({"error": f"No data for {ticker}"}), 404

    try:
        with open(batch_path) as f:
            blob = json.load(f)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    info = blob.get("info", {})

    def _parse_statement(raw_rows):
        if not raw_rows:
            return {"periods": [], "rows": []}
        first = raw_rows[0] if raw_rows else {}
        periods = [k for k in first.keys() if k != "_index"]

        rows = []
        for row in raw_rows:
            label = row.get("_index", "")
            values = []
            for p in periods:
                values.append(_safe_num(row.get(p)))
            growth = []
            for i, v in enumerate(values):
                if i == 0 or v is None or values[i - 1] is None or values[i - 1] == 0:
                    growth.append(None)
                else:
                    growth.append(round((v - values[i - 1]) / abs(values[i - 1]) * 100, 2))
            rows.append({"label": label, "values": values, "growth": growth})
        return {"periods": periods, "rows": rows}

    result = {
        "ticker": ticker,
        "companyName": info.get("shortName") or ticker,
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "annual": {
            "income": _parse_statement(blob.get("income_stmt", [])),
            "balance": _parse_statement(blob.get("balance_sheet", [])),
            "cashflow": _parse_statement(blob.get("cash_flow", [])),
        },
        "quarterly": {
            "income": _parse_statement(blob.get("quarterly_income_stmt", [])),
            "balance": _parse_statement(blob.get("quarterly_balance_sheet", [])),
            "cashflow": _parse_statement(blob.get("quarterly_cash_flow", [])),
        },
    }
    return jsonify(result)


# ─── Stock Comparison ────────────────────────────────────

@screener_bp.route("/api/compare", methods=["GET"])
def api_compare():
    tickers_raw = request.args.get("tickers", "")
    tickers = []
    for t in tickers_raw.split(","):
        clean, err = _validate_ticker(t)
        if err:
            continue
        tickers.append(clean)
    if not tickers:
        return jsonify({"error": "Provide ?tickers=AAPL,MSFT"}), 400
    if len(tickers) > 5:
        tickers = tickers[:5]

    result_prices = {}
    result_fundamentals = {}

    compare_fields = [
        "marketCap", "trailingPE", "forwardPE", "priceToBook",
        "priceToSalesTrailing12Months", "pegRatio",
        "grossMargins", "operatingMargins", "profitMargins",
        "returnOnEquity", "returnOnAssets",
        "revenueGrowth", "earningsGrowth",
        "currentRatio", "debtToEquity", "quickRatio",
        "freeCashflow", "operatingCashflow", "totalRevenue",
        "dividendYield", "payoutRatio", "beta",
        "fiftyTwoWeekHigh", "fiftyTwoWeekLow",
        "currentPrice", "previousClose",
    ]

    for ticker in tickers:
        batch_path = os.path.join(BATCH_DATA_DIR, f"{ticker}.json")
        info = {}
        prices = []

        if os.path.isfile(batch_path):
            try:
                with open(batch_path) as f:
                    blob = json.load(f)
                info = blob.get("info", {})
                prices = blob.get("prices", [])
            except Exception:
                pass

        # Fallback: fetch live from Yahoo Finance
        if not info or not prices:
            try:
                yt = yf.Ticker(ticker)
                if not info:
                    info = dict(yt.info or {})
                if not prices:
                    df = yt.history(period="5y", interval="1d")
                    if df is not None and not df.empty:
                        df.index = df.index.tz_localize(None)
                        prices = [
                            {"date": idx.strftime("%Y-%m-%d"), "close": float(row["Close"]),
                             "open": float(row["Open"]), "high": float(row["High"]),
                             "low": float(row["Low"]), "volume": int(row["Volume"])}
                            for idx, row in df.iterrows()
                        ]
            except Exception:
                pass

        if not prices and not info:
            continue

        if prices:
            first_close = prices[0].get("close", 1) or 1
            result_prices[ticker] = [
                {"date": p["date"], "close": p.get("close"), "normalized": round(p.get("close", 0) / first_close * 100, 2)}
                for p in prices
            ]
        else:
            result_prices[ticker] = []

        fund = {"shortName": info.get("shortName"), "sector": info.get("sector"), "industry": info.get("industry")}
        for field in compare_fields:
            val = info.get(field)
            if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                val = None
            fund[field] = val
        result_fundamentals[ticker] = fund

    # ── Compute period returns, risk metrics & correlation ──
    period_returns = {}   # {ticker: {period: pct}}
    risk_metrics = {}     # {ticker: {annualizedReturn, annualizedVol}}

    for ticker in tickers:
        prices = result_prices.get(ticker, [])
        if len(prices) < 2:
            period_returns[ticker] = {}
            risk_metrics[ticker] = {"annualizedReturn": None, "annualizedVolatility": None}
            continue

        closes = pd.Series(
            [p["close"] for p in prices],
            index=pd.to_datetime([p["date"] for p in prices]),
        )
        latest = closes.iloc[-1]
        ret = {}
        for label, delta in [
            ("1M", timedelta(days=30)),
            ("3M", timedelta(days=91)),
            ("6M", timedelta(days=182)),
            ("YTD", None),
            ("1Y", timedelta(days=365)),
            ("3Y", timedelta(days=365 * 3)),
            ("5Y", timedelta(days=365 * 5)),
        ]:
            if label == "YTD":
                target_date = pd.Timestamp(closes.index[-1].year, 1, 1)
            else:
                target_date = closes.index[-1] - delta
            mask = closes.index >= target_date
            if mask.any():
                base = closes[mask].iloc[0]
                if base and base != 0:
                    ret[label] = round((latest / base - 1) * 100, 2)
        period_returns[ticker] = ret

        daily_ret = closes.pct_change().dropna()
        if len(daily_ret) > 20:
            ann_vol = float(daily_ret.std() * (252 ** 0.5))
            ann_ret = float(((1 + daily_ret.mean()) ** 252 - 1))
            risk_metrics[ticker] = {
                "annualizedReturn": round(ann_ret * 100, 2),
                "annualizedVolatility": round(ann_vol * 100, 2),
            }
        else:
            risk_metrics[ticker] = {"annualizedReturn": None, "annualizedVolatility": None}

    # Correlation matrix
    corr_matrix = {}
    frames = {}
    for ticker in tickers:
        prices = result_prices.get(ticker, [])
        if prices:
            s = pd.Series(
                [p["close"] for p in prices],
                index=pd.to_datetime([p["date"] for p in prices]),
                name=ticker,
            )
            frames[ticker] = s.pct_change().dropna()
    if len(frames) >= 2:
        df_all = pd.DataFrame(frames)
        df_all = df_all.dropna()
        if len(df_all) > 5:
            cm = df_all.corr()
            corr_matrix = {t: {t2: round(cm.loc[t, t2], 3) for t2 in cm.columns} for t in cm.index}

    return jsonify({
        "tickers": tickers,
        "prices": result_prices,
        "fundamentals": result_fundamentals,
        "periodReturns": period_returns,
        "riskMetrics": risk_metrics,
        "correlation": corr_matrix,
    })


# ═══════════════════════════════════════════════════════════
# SECTOR CORRELATION & VALUATION
# ═══════════════════════════════════════════════════════════

_SECTOR_CACHE_DIR = os.path.join(CACHE_DIR, "sector_analysis")
_SECTOR_CORR_PERIODS = ["3m", "6m", "1y", "2y", "5y"]
_SECTOR_CORR_WEIGHTINGS = ["cap", "equal"]
_SECTOR_PERIOD_DAYS = {"1m": 21, "3m": 63, "6m": 126, "1y": 252, "2y": 504, "5y": 1260}

def _build_sector_returns(period_days: int, weighting: str = "cap"):
    """Build daily-return series per sector from batch data.
    weighting: "cap" for market-cap weighted, "equal" for equal-weight.
    Returns (sector_returns_dict, sector_meta_dict) where:
      sector_returns_dict[sector] = np.array of daily returns
      sector_meta_dict[sector] = {stocks: [...], totalMarketCap, ...}
    """
    if not os.path.isdir(BATCH_DATA_DIR):
        return {}, {}

    # Gather prices + market caps by sector
    sector_stocks = {}   # sector -> list of {closes, marketCap}
    sector_meta = {}     # sector -> aggregate info

    for fname in os.listdir(BATCH_DATA_DIR):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(BATCH_DATA_DIR, fname)
        try:
            with open(fpath) as f:
                blob = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue

        info = blob.get("info", {})
        sector = info.get("sector")
        if not sector:
            continue

        prices = blob.get("prices", [])
        closes = [p.get("close") for p in prices if p.get("close") is not None]
        if len(closes) < max(60, int(period_days * 0.85)):
            continue

        closes = closes[-period_days:]
        symbol = fname.replace(".json", "")
        mcap = info.get("marketCap") or 0

        sector_stocks.setdefault(sector, []).append({
            "closes": closes,
            "marketCap": mcap,
        })

        if sector not in sector_meta:
            sector_meta[sector] = {"stocks": [], "totalMarketCap": 0}
        sector_meta[sector]["stocks"].append(symbol)
        sector_meta[sector]["totalMarketCap"] += mcap

    # Compute weighted avg daily return per sector
    sector_returns = {}
    for sector, stock_list in sector_stocks.items():
        if len(stock_list) < 2:
            continue
        # Per-stock daily returns
        stock_returns = []
        stock_mcaps = []
        for entry in stock_list:
            closes = entry["closes"]
            rets = []
            for i in range(1, len(closes)):
                if closes[i - 1] != 0:
                    rets.append((closes[i] - closes[i - 1]) / closes[i - 1])
                else:
                    rets.append(0.0)
            stock_returns.append(rets)
            stock_mcaps.append(entry["marketCap"])

        # Align to same length; use 10th-percentile length to avoid
        # a few short-history stocks dragging the entire sector's series down
        lengths = sorted(len(r) for r in stock_returns)
        target_len = lengths[max(0, len(lengths) // 10)]  # P10 length
        if target_len < 20:
            continue
        # Keep only stocks at least as long as the target
        filtered_pairs = [
            (r, m) for r, m in zip(stock_returns, stock_mcaps)
            if len(r) >= target_len
        ]
        if len(filtered_pairs) < 2:
            continue
        stock_returns_f, stock_mcaps_f = zip(*filtered_pairs)
        aligned = np.array([r[-target_len:] for r in stock_returns_f])

        if weighting == "cap" and sum(stock_mcaps_f) > 0:
            # Market-cap weighted average
            weights = np.array(stock_mcaps_f, dtype=float)
            weights /= weights.sum()
            avg_returns = np.average(aligned, axis=0, weights=weights)
        else:
            # Equal-weight average
            avg_returns = np.mean(aligned, axis=0)

        sector_returns[sector] = avg_returns

    return sector_returns, sector_meta


@screener_bp.route("/api/sector-correlation", methods=["GET"])
def api_sector_correlation():
    """Sector-level correlation matrix + daily returns for hex density plots."""
    period = request.args.get("period", "1y")
    weighting = request.args.get("weighting", "cap")  # "cap" or "equal"
    if weighting not in ("cap", "equal"):
        weighting = "cap"

    # ── Fast path: serve pre-built disk cache ──
    disk_key = f"{period}_{weighting}"
    disk_path = os.path.join(_SECTOR_CACHE_DIR, f"corr_{disk_key}.json")
    try:
        if os.path.exists(disk_path):
            with open(disk_path, "r") as f:
                payload = f.read()
            from flask import current_app
            return current_app.response_class(
                response=payload, status=200, mimetype="application/json"
            )
    except Exception as exc:
        logger.warning("[sector-corr] Disk cache read failed for %s: %s", disk_key, exc)

    # ── Fallback: compute on-the-fly ──
    period_days = _SECTOR_PERIOD_DAYS.get(period, 252)

    sector_returns, sector_meta = _build_sector_returns(period_days, weighting)
    sectors = sorted(sector_returns.keys())

    if len(sectors) < 2:
        return jsonify({"error": "Insufficient sector data"}), 404

    # Align all sector return arrays to same length
    min_len = min(len(sector_returns[s]) for s in sectors)
    for s in sectors:
        sector_returns[s] = sector_returns[s][-min_len:]

    # Correlation matrix
    n = len(sectors)
    matrix = []
    for i in range(n):
        row = []
        for j in range(n):
            if i == j:
                row.append(1.0)
            else:
                corr = float(np.corrcoef(sector_returns[sectors[i]],
                                         sector_returns[sectors[j]])[0, 1])
                row.append(round(corr, 4))
        matrix.append(row)

    # Daily returns as lists (for hex density plots)
    daily_returns = {}
    for s in sectors:
        daily_returns[s] = [round(float(v), 6) for v in sector_returns[s]]

    # Stats per sector
    stats = []
    for s in sectors:
        r = sector_returns[s]
        total_return = float(np.prod(1 + r) - 1) * 100
        vol = float(np.std(r) * np.sqrt(252) * 100)
        stats.append({
            "sector": s,
            "totalReturn": round(total_return, 2),
            "annualizedVol": round(vol, 2),
            "avgDailyReturn": round(float(np.mean(r) * 100), 4),
            "stockCount": len(sector_meta.get(s, {}).get("stocks", [])),
            "totalMarketCap": sector_meta.get(s, {}).get("totalMarketCap", 0),
        })

    # Dataset metadata
    total_files = len([f for f in os.listdir(BATCH_DATA_DIR) if f.endswith(".json")]) if os.path.isdir(BATCH_DATA_DIR) else 0
    total_stocks_used = sum(len(sector_meta.get(s, {}).get("stocks", [])) for s in sectors)
    newest_ts = 0
    for fname in os.listdir(BATCH_DATA_DIR):
        if fname.endswith(".json"):
            ts = os.path.getmtime(os.path.join(BATCH_DATA_DIR, fname))
            if ts > newest_ts:
                newest_ts = ts
    data_as_of = datetime.fromtimestamp(newest_ts).strftime("%Y-%m-%d %H:%M") if newest_ts else None

    return jsonify({
        "sectors": sectors,
        "matrix": matrix,
        "dailyReturns": daily_returns,
        "stats": stats,
        "period": period,
        "weighting": weighting,
        "dataPoints": min_len,
        "totalFilesInDataset": total_files,
        "totalStocksUsed": total_stocks_used,
        "dataAsOf": data_as_of,
    })


@screener_bp.route("/api/sector-valuation", methods=["GET"])
def api_sector_valuation():
    """Sector-level valuation scorecard: PE, PB, margins, growth, etc."""
    # ── Fast path: serve pre-built disk cache ──
    disk_path = os.path.join(_SECTOR_CACHE_DIR, "valuation.json")
    try:
        if os.path.exists(disk_path):
            with open(disk_path, "r") as f:
                payload = f.read()
            from flask import current_app
            return current_app.response_class(
                response=payload, status=200, mimetype="application/json"
            )
    except Exception as exc:
        logger.warning("[sector-val] Disk cache read failed: %s", exc)

    # ── Fallback: compute on-the-fly ──
    if not os.path.isdir(BATCH_DATA_DIR):
        return jsonify({"sectors": []})

    sector_data = {}  # sector -> list of info dicts

    for fname in os.listdir(BATCH_DATA_DIR):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(BATCH_DATA_DIR, fname)
        try:
            with open(fpath) as f:
                blob = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue

        info = blob.get("info", {})
        sector = info.get("sector")
        if not sector:
            continue

        symbol = fname.replace(".json", "")
        prices = blob.get("prices", [])

        # 52-week performance
        perf_1y = None
        if len(prices) >= 200:
            p0 = prices[-252]["close"] if len(prices) >= 252 else prices[0]["close"]
            p1 = prices[-1]["close"]
            if p0 and p1 and p0 != 0:
                perf_1y = (p1 - p0) / p0

        entry = {
            "symbol": symbol,
            "marketCap": info.get("marketCap"),
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "priceToBook": info.get("priceToBook"),
            "priceToSales": info.get("priceToSalesTrailing12Months"),
            "evToEbitda": info.get("enterpriseToEbitda"),
            "evToRevenue": info.get("enterpriseToRevenue"),
            "profitMargin": info.get("profitMargins"),
            "grossMargin": info.get("grossMargins"),
            "operatingMargin": info.get("operatingMargins"),
            "returnOnEquity": info.get("returnOnEquity"),
            "revenueGrowth": info.get("revenueGrowth"),
            "earningsGrowth": info.get("earningsGrowth"),
            "dividendYield": info.get("dividendYield"),
            "debtToEquity": info.get("debtToEquity"),
            "beta": info.get("beta"),
            "perf1y": perf_1y,
        }
        sector_data.setdefault(sector, []).append(entry)

    def _median(vals):
        vals = sorted(v for v in vals if v is not None and isinstance(v, (int, float))
                      and not (isinstance(v, float) and (math.isnan(v) or math.isinf(v))))
        if not vals:
            return None
        mid = len(vals) // 2
        return round(vals[mid], 4) if len(vals) % 2 else round((vals[mid - 1] + vals[mid]) / 2, 4)

    def _avg(vals):
        vals = [v for v in vals if v is not None and isinstance(v, (int, float))
                and not (isinstance(v, float) and (math.isnan(v) or math.isinf(v)))]
        return round(sum(vals) / len(vals), 4) if vals else None

    # Historical PE benchmarks per sector (approximate long-term medians)
    HIST_PE = {
        "Technology": 25, "Healthcare": 20, "Financial Services": 14,
        "Consumer Cyclical": 18, "Communication Services": 18,
        "Industrials": 19, "Consumer Defensive": 20, "Energy": 12,
        "Utilities": 17, "Real Estate": 35, "Basic Materials": 15,
    }

    sectors = []
    for sector, entries in sector_data.items():
        n = len(entries)
        mcap = sum(e["marketCap"] or 0 for e in entries)

        med_pe = _median([e["trailingPE"] for e in entries])
        fwd_pe = _median([e["forwardPE"] for e in entries])
        hist_pe = HIST_PE.get(sector)

        # Valuation signal
        signal = "fair"
        if med_pe is not None and hist_pe:
            ratio = med_pe / hist_pe
            if ratio > 1.25:
                signal = "expensive"
            elif ratio > 1.10:
                signal = "slightly_expensive"
            elif ratio < 0.75:
                signal = "cheap"
            elif ratio < 0.90:
                signal = "slightly_cheap"

        # Earnings momentum: fwd PE < trailing PE means analysts expect growth
        earnings_momentum = None
        if med_pe and fwd_pe and med_pe > 0:
            earnings_momentum = round((med_pe - fwd_pe) / med_pe * 100, 1)

        sectors.append({
            "sector": sector,
            "stockCount": n,
            "totalMarketCap": mcap,
            "medianPE": med_pe,
            "forwardPE": fwd_pe,
            "historicalPE": hist_pe,
            "peRatio": round(med_pe / hist_pe, 2) if med_pe and hist_pe else None,
            "signal": signal,
            "earningsMomentum": earnings_momentum,
            "medianPB": _median([e["priceToBook"] for e in entries]),
            "medianPS": _median([e["priceToSales"] for e in entries]),
            "medianEvEbitda": _median([e["evToEbitda"] for e in entries]),
            "profitMargin": _avg([e["profitMargin"] for e in entries]),
            "grossMargin": _avg([e["grossMargin"] for e in entries]),
            "operatingMargin": _avg([e["operatingMargin"] for e in entries]),
            "returnOnEquity": _avg([e["returnOnEquity"] for e in entries]),
            "revenueGrowth": _avg([e["revenueGrowth"] for e in entries]),
            "earningsGrowth": _avg([e["earningsGrowth"] for e in entries]),
            "dividendYield": _avg([e["dividendYield"] for e in entries]),
            "avgBeta": _avg([e["beta"] for e in entries]),
            "debtToEquity": _median([e["debtToEquity"] for e in entries]),
            "perf1y": _avg([e["perf1y"] for e in entries]),
        })

    sectors.sort(key=lambda s: s["totalMarketCap"], reverse=True)

    # Dataset metadata
    total_files = len([f for f in os.listdir(BATCH_DATA_DIR) if f.endswith(".json")]) if os.path.isdir(BATCH_DATA_DIR) else 0
    total_stocks_used = sum(s["stockCount"] for s in sectors)
    newest_ts = 0
    for fname in os.listdir(BATCH_DATA_DIR):
        if fname.endswith(".json"):
            ts = os.path.getmtime(os.path.join(BATCH_DATA_DIR, fname))
            if ts > newest_ts:
                newest_ts = ts
    data_as_of = datetime.fromtimestamp(newest_ts).strftime("%Y-%m-%d %H:%M") if newest_ts else None

    return jsonify({
        "sectors": sectors,
        "totalFilesInDataset": total_files,
        "totalStocksUsed": total_stocks_used,
        "dataAsOf": data_as_of,
    })


def rebuild_sector_analysis_disk_cache():
    """Pre-build and persist sector correlation + valuation responses.

    Covers 5 periods × 2 weightings = 10 correlation files + 1 valuation file.
    Called by the scheduler after data updates.
    """
    import tempfile

    os.makedirs(_SECTOR_CACHE_DIR, exist_ok=True)
    count = 0

    # ── Sector correlation combos ──
    for period in _SECTOR_CORR_PERIODS:
        period_days = _SECTOR_PERIOD_DAYS.get(period, 252)
        for weighting in _SECTOR_CORR_WEIGHTINGS:
            try:
                sector_returns, sector_meta = _build_sector_returns(period_days, weighting)
                sectors_list = sorted(sector_returns.keys())
                if len(sectors_list) < 2:
                    continue

                min_len = min(len(sector_returns[s]) for s in sectors_list)
                for s in sectors_list:
                    sector_returns[s] = sector_returns[s][-min_len:]

                n = len(sectors_list)
                matrix = []
                for i in range(n):
                    row = []
                    for j in range(n):
                        if i == j:
                            row.append(1.0)
                        else:
                            corr = float(np.corrcoef(sector_returns[sectors_list[i]],
                                                     sector_returns[sectors_list[j]])[0, 1])
                            row.append(round(corr, 4))
                    matrix.append(row)

                daily_returns = {}
                for s in sectors_list:
                    daily_returns[s] = [round(float(v), 6) for v in sector_returns[s]]

                stats = []
                for s in sectors_list:
                    r = sector_returns[s]
                    total_return = float(np.prod(1 + r) - 1) * 100
                    vol = float(np.std(r) * np.sqrt(252) * 100)
                    stats.append({
                        "sector": s,
                        "totalReturn": round(total_return, 2),
                        "annualizedVol": round(vol, 2),
                        "avgDailyReturn": round(float(np.mean(r) * 100), 4),
                        "stockCount": len(sector_meta.get(s, {}).get("stocks", [])),
                        "totalMarketCap": sector_meta.get(s, {}).get("totalMarketCap", 0),
                    })

                total_files = len([f for f in os.listdir(BATCH_DATA_DIR) if f.endswith(".json")]) if os.path.isdir(BATCH_DATA_DIR) else 0
                total_stocks_used = sum(len(sector_meta.get(s, {}).get("stocks", [])) for s in sectors_list)
                newest_ts = 0
                for fname in os.listdir(BATCH_DATA_DIR):
                    if fname.endswith(".json"):
                        ts = os.path.getmtime(os.path.join(BATCH_DATA_DIR, fname))
                        if ts > newest_ts:
                            newest_ts = ts
                data_as_of = datetime.fromtimestamp(newest_ts).strftime("%Y-%m-%d %H:%M") if newest_ts else None

                result = {
                    "sectors": sectors_list,
                    "matrix": matrix,
                    "dailyReturns": daily_returns,
                    "stats": stats,
                    "period": period,
                    "weighting": weighting,
                    "dataPoints": min_len,
                    "totalFilesInDataset": total_files,
                    "totalStocksUsed": total_stocks_used,
                    "dataAsOf": data_as_of,
                    "_cachedAt": datetime.now().isoformat(),
                }

                key = f"corr_{period}_{weighting}"
                dest = os.path.join(_SECTOR_CACHE_DIR, f"{key}.json")
                fd, tmp = tempfile.mkstemp(dir=_SECTOR_CACHE_DIR, suffix=".tmp")
                with os.fdopen(fd, "w") as f:
                    json.dump(result, f, default=str)
                os.replace(tmp, dest)
                count += 1
            except Exception as exc:
                logger.error("[sector-disk] Failed corr %s/%s: %s", period, weighting, exc)

    # ── Sector valuation ──
    try:
        from flask import Flask as _Flask
        # Build valuation inline (same logic as api_sector_valuation fallback)
        if os.path.isdir(BATCH_DATA_DIR):
            sector_data = {}
            for fname in os.listdir(BATCH_DATA_DIR):
                if not fname.endswith(".json"):
                    continue
                fpath = os.path.join(BATCH_DATA_DIR, fname)
                try:
                    with open(fpath) as f:
                        blob = json.load(f)
                except (json.JSONDecodeError, OSError):
                    continue
                info = blob.get("info", {})
                sector = info.get("sector")
                if not sector:
                    continue
                symbol = fname.replace(".json", "")
                prices = blob.get("prices", [])
                perf_1y = None
                if len(prices) >= 200:
                    p0 = prices[-252]["close"] if len(prices) >= 252 else prices[0]["close"]
                    p1 = prices[-1]["close"]
                    if p0 and p1 and p0 != 0:
                        perf_1y = (p1 - p0) / p0
                entry = {
                    "symbol": symbol,
                    "marketCap": info.get("marketCap"),
                    "trailingPE": info.get("trailingPE"),
                    "forwardPE": info.get("forwardPE"),
                    "priceToBook": info.get("priceToBook"),
                    "priceToSales": info.get("priceToSalesTrailing12Months"),
                    "evToEbitda": info.get("enterpriseToEbitda"),
                    "evToRevenue": info.get("enterpriseToRevenue"),
                    "profitMargin": info.get("profitMargins"),
                    "grossMargin": info.get("grossMargins"),
                    "operatingMargin": info.get("operatingMargins"),
                    "returnOnEquity": info.get("returnOnEquity"),
                    "revenueGrowth": info.get("revenueGrowth"),
                    "earningsGrowth": info.get("earningsGrowth"),
                    "dividendYield": info.get("dividendYield"),
                    "debtToEquity": info.get("debtToEquity"),
                    "beta": info.get("beta"),
                    "perf1y": perf_1y,
                }
                sector_data.setdefault(sector, []).append(entry)

            def _median(vals):
                vals = sorted(v for v in vals if v is not None and isinstance(v, (int, float))
                              and not (isinstance(v, float) and (math.isnan(v) or math.isinf(v))))
                if not vals:
                    return None
                mid = len(vals) // 2
                return round(vals[mid], 4) if len(vals) % 2 else round((vals[mid - 1] + vals[mid]) / 2, 4)

            def _avg(vals):
                vals = [v for v in vals if v is not None and isinstance(v, (int, float))
                        and not (isinstance(v, float) and (math.isnan(v) or math.isinf(v)))]
                return round(sum(vals) / len(vals), 4) if vals else None

            HIST_PE = {
                "Technology": 25, "Healthcare": 20, "Financial Services": 14,
                "Consumer Cyclical": 18, "Communication Services": 18,
                "Industrials": 19, "Consumer Defensive": 20, "Energy": 12,
                "Utilities": 17, "Real Estate": 35, "Basic Materials": 15,
            }

            val_sectors = []
            for sector, entries in sector_data.items():
                n = len(entries)
                mcap = sum(e["marketCap"] or 0 for e in entries)
                med_pe = _median([e["trailingPE"] for e in entries])
                fwd_pe = _median([e["forwardPE"] for e in entries])
                hist_pe = HIST_PE.get(sector)
                signal = "fair"
                if med_pe is not None and hist_pe:
                    ratio = med_pe / hist_pe
                    if ratio > 1.25: signal = "expensive"
                    elif ratio > 1.10: signal = "slightly_expensive"
                    elif ratio < 0.75: signal = "cheap"
                    elif ratio < 0.90: signal = "slightly_cheap"
                earnings_momentum = None
                if med_pe and fwd_pe and med_pe > 0:
                    earnings_momentum = round((med_pe - fwd_pe) / med_pe * 100, 1)
                val_sectors.append({
                    "sector": sector, "stockCount": n, "totalMarketCap": mcap,
                    "medianPE": med_pe, "forwardPE": fwd_pe, "historicalPE": hist_pe,
                    "peRatio": round(med_pe / hist_pe, 2) if med_pe and hist_pe else None,
                    "signal": signal, "earningsMomentum": earnings_momentum,
                    "medianPB": _median([e["priceToBook"] for e in entries]),
                    "medianPS": _median([e["priceToSales"] for e in entries]),
                    "medianEvEbitda": _median([e["evToEbitda"] for e in entries]),
                    "profitMargin": _avg([e["profitMargin"] for e in entries]),
                    "grossMargin": _avg([e["grossMargin"] for e in entries]),
                    "operatingMargin": _avg([e["operatingMargin"] for e in entries]),
                    "returnOnEquity": _avg([e["returnOnEquity"] for e in entries]),
                    "revenueGrowth": _avg([e["revenueGrowth"] for e in entries]),
                    "earningsGrowth": _avg([e["earningsGrowth"] for e in entries]),
                    "dividendYield": _avg([e["dividendYield"] for e in entries]),
                    "avgBeta": _avg([e["beta"] for e in entries]),
                    "debtToEquity": _median([e["debtToEquity"] for e in entries]),
                    "perf1y": _avg([e["perf1y"] for e in entries]),
                })
            val_sectors.sort(key=lambda s: s["totalMarketCap"], reverse=True)

            total_files = len([f for f in os.listdir(BATCH_DATA_DIR) if f.endswith(".json")])
            total_stocks_used = sum(s["stockCount"] for s in val_sectors)
            newest_ts = 0
            for fname in os.listdir(BATCH_DATA_DIR):
                if fname.endswith(".json"):
                    ts = os.path.getmtime(os.path.join(BATCH_DATA_DIR, fname))
                    if ts > newest_ts:
                        newest_ts = ts
            data_as_of = datetime.fromtimestamp(newest_ts).strftime("%Y-%m-%d %H:%M") if newest_ts else None

            val_result = {
                "sectors": val_sectors,
                "totalFilesInDataset": total_files,
                "totalStocksUsed": total_stocks_used,
                "dataAsOf": data_as_of,
                "_cachedAt": datetime.now().isoformat(),
            }
            dest = os.path.join(_SECTOR_CACHE_DIR, "valuation.json")
            fd, tmp = tempfile.mkstemp(dir=_SECTOR_CACHE_DIR, suffix=".tmp")
            with os.fdopen(fd, "w") as f:
                json.dump(val_result, f, default=str)
            os.replace(tmp, dest)
            count += 1
    except Exception as exc:
        logger.error("[sector-disk] Failed valuation: %s", exc)

    logger.info("[sector-disk] Rebuilt %d precomputed responses.", count)
