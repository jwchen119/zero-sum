"""
Batch fetch comprehensive stock data from Yahoo Finance for Taiwan listings
(or any ticker list) while avoiding rate limits.

Strategy:
  1. Prices — use yf.download() which handles batching internally (10 tickers/call)
  2. Fundamentals — fetch per-ticker but pace with configurable delay
  3. Resume — skip tickers that already have fresh data (< TTL hours old)
  4. Save — one big JSON per ticker in cache/batch_data/

Usage:
    python batch_fetch_stocks.py                     # fetch all TWSE
    python batch_fetch_stocks.py --tickers AAPL,MSFT  # fetch specific tickers
    python batch_fetch_stocks.py --ttl 12             # re-fetch if older than 12h
    python batch_fetch_stocks.py --delay 1.0          # 1s delay between tickers
    python batch_fetch_stocks.py --prices-only        # just prices, skip fundamentals
    python batch_fetch_stocks.py --batch-size 10      # tickers per batch for prices
    python batch_fetch_stocks.py --no-resume          # force re-fetch everything
    python batch_fetch_stocks.py --dry-run            # show plan, don't fetch
"""

import argparse
import concurrent.futures
import json
import math
import os
import sys
import time
from datetime import datetime, timezone

import pandas as pd
import yfinance as yf

# ─── Paths ───────────────────────────────────────────────

BASE_DIR = os.path.dirname(__file__)
LISTINGS_DIR = os.path.join(BASE_DIR, "cache", "listings")
OUTPUT_DIR = os.path.join(BASE_DIR, "cache", "batch_data")


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


YF_DOWNLOAD_THREADS = _env_flag("YF_DOWNLOAD_THREADS", False)
YF_DOWNLOAD_RETRIES = _env_int("YF_DOWNLOAD_RETRIES", 1)
YF_DOWNLOAD_TIMEOUT_SEC = _env_float("YF_DOWNLOAD_TIMEOUT_SEC", 20.0)

# ─── Ticker symbol mapping ───────────────────────────────
# yfinance uses dashes for share classes (e.g. BRK-B), but listings use dots (BRK.B).
# We map dot→dash for API calls and save with the original dot name.
DOT_TICKER_MAP = {"BRK.B": "BRK-B", "BF.B": "BF-B"}


def yf_symbol(symbol: str) -> str:
    """Return the yfinance-compatible ticker for symbols with dots."""
    return DOT_TICKER_MAP.get(symbol, symbol)


# ─── Helpers ─────────────────────────────────────────────


def load_ticker_list(name: str) -> list[str]:
    """Load tickers from a listings JSON file."""
    path = os.path.join(LISTINGS_DIR, f"{name}.json")
    if not os.path.exists(path):
        print(f"ERROR: Listing file not found: {path}")
        print(f"  Run: python fetch_listings.py {name}")
        sys.exit(1)
    with open(path) as f:
        data = json.load(f)
    return [s["symbol"] for s in data["stocks"]]


def _market_is_closed() -> bool:
    """Check if Taiwan market is currently closed (weekend or outside 9:00-13:30 Taipei).
    When closed, cached data won't become stale until next open."""
    try:
        from zoneinfo import ZoneInfo
        now_et = datetime.now(ZoneInfo("Asia/Taipei"))
    except Exception:
        return False  # fail open — assume market is open if we can't check
    # Weekend
    if now_et.weekday() >= 5:
        return True
    # Before 9:00 or after 13:30 Taipei
    hour_min = now_et.hour * 100 + now_et.minute
    return hour_min < 900 or hour_min >= 1330


def _cached_data_age_hours(ticker: str) -> tuple[float | None, bool]:
    """Return (age_in_hours, has_quality_data) for a cached ticker file.
    Returns (None, False) if file doesn't exist or is unreadable.
    has_quality_data is True if the file has meaningful fundamentals."""
    path = os.path.join(OUTPUT_DIR, f"{ticker}.json")
    if not os.path.exists(path):
        return None, False
    try:
        with open(path) as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return None, False

    # Prefer _lastUpdated from JSON (survives file copies) over file mtime
    last_updated = data.get("_lastUpdated")
    if last_updated:
        try:
            ts = datetime.fromisoformat(last_updated)
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            age_hours = (datetime.now(timezone.utc) - ts).total_seconds() / 3600
        except (ValueError, TypeError):
            age_hours = (time.time() - os.path.getmtime(path)) / 3600
    else:
        age_hours = (time.time() - os.path.getmtime(path)) / 3600

    # Quality check — does the file have meaningful data?
    info_fields = len(data.get("info", {}))
    has_prices = len(data.get("prices", [])) > 0
    has_fundamentals = info_fields >= 10 or data.get("_mode") == "prices_only"
    has_quality = has_prices and has_fundamentals

    return age_hours, has_quality


def is_fresh(ticker: str, ttl_hours: float) -> bool:
    """Check if cached data exists, is within TTL, and has quality data.
    Files with empty/failed data are always considered stale."""
    age_hours, has_quality = _cached_data_age_hours(ticker)
    if age_hours is None:
        return False
    if not has_quality:
        return False  # re-fetch failed/empty data regardless of age
    return age_hours < ttl_hours


def safe_json(obj):
    """JSON serializer that handles NaN, Inf, Timestamps, etc."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    if isinstance(obj, pd.Timedelta):
        return str(obj)
    if hasattr(obj, 'isoformat'):  # datetime.date, datetime.time
        return obj.isoformat()
    if isinstance(obj, (set, frozenset)):
        return list(obj)
    return str(obj)


def clean_for_json(obj):
    """Recursively clean an object so it's JSON-serializable with string keys."""
    if isinstance(obj, dict):
        return {str(k): clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_for_json(item) for item in obj]
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    if isinstance(obj, pd.Timedelta):
        return str(obj)
    if isinstance(obj, (set, frozenset)):
        return list(obj)
    if isinstance(obj, (int, str, bool, type(None))):
        return obj
    return str(obj)


def df_to_records(df) -> list[dict]:
    """Convert a DataFrame to list of dicts with clean serialization."""
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    records = []
    for idx, row in df.iterrows():
        rec = {"_index": safe_json(idx)}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                rec[col] = None
            elif isinstance(val, (int,)):
                rec[col] = int(val)
            elif isinstance(val, (float,)):
                rec[col] = None if (math.isnan(val) or math.isinf(val)) else round(val, 6)
            else:
                rec[col] = safe_json(val)
        records.append(rec)
    return records


def series_to_records(s) -> list[dict]:
    """Convert a Series to list of dicts."""
    if s is None or (hasattr(s, "empty") and s.empty):
        return []
    return [{"date": safe_json(idx), "value": safe_json(val)} for idx, val in s.items()]


# ─── Price fetching (batch via yf.download) ─────────────

def _download_prices_frame(yf_batch: list[str], period: str) -> pd.DataFrame:
    """Download a batch with retry and sane defaults for unstable networks."""
    last_exc: Exception | None = None
    for attempt in range(YF_DOWNLOAD_RETRIES + 1):
        try:
            df = yf.download(
                yf_batch,
                period=period,
                group_by="ticker",
                progress=False,
                threads=YF_DOWNLOAD_THREADS,
                timeout=YF_DOWNLOAD_TIMEOUT_SEC,
            )
            if df is None:
                raise RuntimeError("yf.download returned None")
            return df
        except Exception as exc:
            last_exc = exc
            if attempt < YF_DOWNLOAD_RETRIES:
                wait = 2 * (attempt + 1)
                print(
                    f"    WARN: batch download retry {attempt + 1}/{YF_DOWNLOAD_RETRIES} "
                    f"after {wait}s: {exc}"
                )
                time.sleep(wait)
            else:
                raise

    raise RuntimeError(f"batch download failed: {last_exc}")


def _download_single_prices(yf_sym: str, period: str) -> pd.DataFrame:
    """Download a single symbol (more stable fallback than multi-symbol batches)."""
    return _download_prices_frame([yf_sym], period)


def fetch_batch_prices(tickers: list[str], period: str = "5y", batch_size: int = 10) -> dict[str, list[dict]]:
    """Fetch OHLCV prices for many tickers using yf.download() batching."""
    all_prices = {}
    total_batches = math.ceil(len(tickers) / batch_size)

    for i in range(0, len(tickers), batch_size):
        batch = tickers[i : i + batch_size]
        batch_num = i // batch_size + 1
        print(f"  [prices] batch {batch_num}/{total_batches}: {', '.join(batch)}")

        # Map dot-tickers to yfinance-compatible dashes for the download call
        yf_batch = [yf_symbol(s) for s in batch]
        # Reverse map: yfinance ticker -> original save name
        yf_to_orig = {yf_symbol(s): s for s in batch}

        try:
            df = _download_prices_frame(yf_batch, period)

            def _extract_prices(sym_df):
                """Extract OHLCV records from a DataFrame (flat or multi-level)."""
                # Flatten multi-level columns if present
                if isinstance(sym_df.columns, pd.MultiIndex):
                    sym_df = sym_df.droplevel(level=1, axis=1)
                records = []
                for idx, row in sym_df.iterrows():
                    records.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "open": round(row["Open"], 4) if pd.notna(row["Open"]) else None,
                        "high": round(row["High"], 4) if pd.notna(row["High"]) else None,
                        "low": round(row["Low"], 4) if pd.notna(row["Low"]) else None,
                        "close": round(row["Close"], 4) if pd.notna(row["Close"]) else None,
                        "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else None,
                    })
                return records

            if len(yf_batch) == 1:
                save_name = yf_to_orig[yf_batch[0]]
                one_df = df.dropna(how="all") if hasattr(df, "dropna") else df
                all_prices[save_name] = _extract_prices(one_df) if one_df is not None else []
            else:
                for yf_sym in yf_batch:
                    save_name = yf_to_orig[yf_sym]
                    try:
                        if df is None:
                            raise RuntimeError("empty download frame")
                        sym_df = df[yf_sym].dropna(how="all")
                        all_prices[save_name] = _extract_prices(sym_df)
                    except Exception as exc:
                        print(f"    WARN: {save_name} batch extraction failed, fallback to single: {exc}")
                        try:
                            one_df = _download_single_prices(yf_sym, period)
                            one_df = one_df.dropna(how="all") if hasattr(one_df, "dropna") else one_df
                            all_prices[save_name] = _extract_prices(one_df) if one_df is not None else []
                        except Exception as exc2:
                            print(f"    WARN: {save_name} single download failed: {exc2}")
                            all_prices[save_name] = []
        except Exception as exc:
            print(f"    ERROR batch download, fallback to single-symbol mode: {exc}")
            for sym in batch:
                yf_sym = yf_symbol(sym)
                try:
                    one_df = _download_single_prices(yf_sym, period)
                    one_df = one_df.dropna(how="all") if hasattr(one_df, "dropna") else one_df
                    # Reuse the same extraction logic
                    if isinstance(one_df.columns, pd.MultiIndex):
                        one_df = one_df.droplevel(level=1, axis=1)
                    records = []
                    for idx, row in one_df.iterrows():
                        records.append({
                            "date": idx.strftime("%Y-%m-%d"),
                            "open": round(row["Open"], 4) if pd.notna(row["Open"]) else None,
                            "high": round(row["High"], 4) if pd.notna(row["High"]) else None,
                            "low": round(row["Low"], 4) if pd.notna(row["Low"]) else None,
                            "close": round(row["Close"], 4) if pd.notna(row["Close"]) else None,
                            "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else None,
                        })
                    all_prices[sym] = records
                except Exception as exc2:
                    print(f"    WARN: {sym} fallback single download failed: {exc2}")
                    all_prices[sym] = []

        # Small pause between batches to be nice to Yahoo
        if i + batch_size < len(tickers):
            time.sleep(1)

    return all_prices


# ─── Fundamentals fetching (per-ticker) ─────────────────


def _refresh_yfinance_session():
    """Force yfinance to obtain a fresh crumb/cookie pair."""
    try:
        # Clear cached crumb so next request gets a fresh one
        if hasattr(yf, 'utils') and hasattr(yf.utils, 'get_json'):
            pass  # older API
        # The most reliable way: create a throwback ticker call
        _t = yf.Ticker("AAPL")
        _t._data._cookie = None  # type: ignore[attr-defined]
    except Exception:
        pass
    # Alternative: clear the shared session/cache data
    try:
        from yfinance import shared
        if hasattr(shared, '_SHARED_DATA'):
            shared._SHARED_DATA.clear()
    except Exception:
        pass


def fetch_ticker_fundamentals(symbol: str, retries: int = 3) -> dict:
    """Fetch all available fundamental data for a single ticker.
    Retries with a fresh session if a 401/crumb error is detected.
    Uses exponential backoff to handle rate limiting."""
    for attempt in range(retries + 1):
        result = _fetch_ticker_fundamentals_once(symbol)
        # Check if info was populated — if empty, may be a crumb issue
        if result.get("info") and len(result["info"]) >= 10:
            return result
        if attempt < retries:
            wait = 5 * (2 ** attempt)  # 5s, 10s, 20s
            print(f"    {symbol}: info empty (attempt {attempt+1}), refreshing session, waiting {wait}s...")
            _refresh_yfinance_session()
            time.sleep(wait)
    return result


def _fetch_ticker_fundamentals_once(symbol: str) -> dict:
    """Single attempt to fetch all fundamental data for a ticker."""
    t = yf.Ticker(yf_symbol(symbol))
    result = {}

    # ── info (183 fields: price, valuation, margins, short interest, etc.) ──
    try:
        result["info"] = dict(t.info or {})
    except Exception:
        result["info"] = {}

    # ── Financial statements (annual) ──
    try:
        result["income_stmt"] = df_to_records(t.income_stmt)
    except Exception:
        result["income_stmt"] = []

    try:
        result["balance_sheet"] = df_to_records(t.balance_sheet)
    except Exception:
        result["balance_sheet"] = []

    try:
        result["cash_flow"] = df_to_records(t.cash_flow)
    except Exception:
        result["cash_flow"] = []

    # ── Financial statements (quarterly) ──
    try:
        result["quarterly_income_stmt"] = df_to_records(t.quarterly_income_stmt)
    except Exception:
        result["quarterly_income_stmt"] = []

    try:
        result["quarterly_balance_sheet"] = df_to_records(t.quarterly_balance_sheet)
    except Exception:
        result["quarterly_balance_sheet"] = []

    try:
        result["quarterly_cash_flow"] = df_to_records(t.quarterly_cash_flow)
    except Exception:
        result["quarterly_cash_flow"] = []

    # ── Analyst data ──
    try:
        result["recommendations"] = df_to_records(t.recommendations)
    except Exception:
        result["recommendations"] = []

    try:
        result["recommendations_summary"] = df_to_records(t.recommendations_summary)
    except Exception:
        result["recommendations_summary"] = []

    try:
        result["analyst_price_targets"] = t.analyst_price_targets
        if isinstance(result["analyst_price_targets"], dict):
            result["analyst_price_targets"] = {
                k: safe_json(v) for k, v in result["analyst_price_targets"].items()
            }
    except Exception:
        result["analyst_price_targets"] = {}

    try:
        result["earnings_estimate"] = df_to_records(t.earnings_estimate)
    except Exception:
        result["earnings_estimate"] = []

    try:
        result["revenue_estimate"] = df_to_records(t.revenue_estimate)
    except Exception:
        result["revenue_estimate"] = []

    try:
        result["growth_estimates"] = df_to_records(t.growth_estimates)
    except Exception:
        result["growth_estimates"] = []

    try:
        result["eps_trend"] = df_to_records(t.eps_trend)
    except Exception:
        result["eps_trend"] = []

    try:
        result["eps_revisions"] = df_to_records(t.eps_revisions)
    except Exception:
        result["eps_revisions"] = []

    # ── Holders ──
    try:
        result["institutional_holders"] = df_to_records(t.institutional_holders)
    except Exception:
        result["institutional_holders"] = []

    try:
        result["mutualfund_holders"] = df_to_records(t.mutualfund_holders)
    except Exception:
        result["mutualfund_holders"] = []

    try:
        result["major_holders"] = df_to_records(t.major_holders)
    except Exception:
        result["major_holders"] = []

    try:
        result["insider_transactions"] = df_to_records(t.insider_transactions)
    except Exception:
        result["insider_transactions"] = []

    try:
        result["insider_purchases"] = df_to_records(t.insider_purchases)
    except Exception:
        result["insider_purchases"] = []

    # ── Earnings ──
    try:
        result["earnings_dates"] = df_to_records(t.earnings_dates)
    except Exception:
        result["earnings_dates"] = []

    try:
        result["calendar"] = t.calendar
        if isinstance(result["calendar"], dict):
            result["calendar"] = {k: safe_json(v) for k, v in result["calendar"].items()}
    except Exception:
        result["calendar"] = {}

    # ── Upgrades / downgrades (can be large — limit to recent 50) ──
    try:
        ud = t.upgrades_downgrades
        if ud is not None and not ud.empty:
            result["upgrades_downgrades"] = df_to_records(ud.head(50))
        else:
            result["upgrades_downgrades"] = []
    except Exception:
        result["upgrades_downgrades"] = []

    # ── Corporate actions ──
    try:
        result["splits"] = series_to_records(t.splits)
    except Exception:
        result["splits"] = []

    try:
        result["dividends"] = series_to_records(t.dividends)
    except Exception:
        result["dividends"] = []

    # ── SEC filings (recent 10) ──
    try:
        filings = t.sec_filings
        if filings:
            result["sec_filings"] = filings[:10] if isinstance(filings, list) else []
        else:
            result["sec_filings"] = []
    except Exception:
        result["sec_filings"] = []

    # ── News ──
    try:
        news = t.news
        result["news"] = news[:10] if isinstance(news, list) else []
    except Exception:
        result["news"] = []

    return result


# ─── Main ────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Batch fetch stock data from Yahoo Finance")
    parser.add_argument("--list", default="twse", help="Listing to use (default: twse)")
    parser.add_argument("--tickers", default="", help="Comma-separated tickers (overrides --list)")
    parser.add_argument("--ttl", type=float, default=24.0, help="Skip if data is fresher than TTL hours (default: 24)")
    parser.add_argument("--delay", type=float, default=0.5, help="Seconds between per-ticker calls (default: 0.5)")
    parser.add_argument("--workers", type=int, default=5, help="Parallel workers for fundamentals (default: 5)")
    parser.add_argument("--batch-size", type=int, default=10, help="Tickers per batch for price download (default: 10)")
    parser.add_argument("--prices-only", action="store_true", help="Skip fundamentals, fetch prices only")
    parser.add_argument("--no-resume", action="store_true", help="Force re-fetch even if data is fresh")
    parser.add_argument("--dry-run", action="store_true", help="Show plan without fetching")
    parser.add_argument("--period", default="5y", help="Price history period (default: 5y)")
    args = parser.parse_args()

    # Determine ticker list
    if args.tickers:
        tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]
    else:
        tickers = load_ticker_list(args.list)

    # Filter already-fresh data
    market_closed = _market_is_closed()
    effective_ttl = args.ttl
    if market_closed and args.ttl <= 24.0:
        # When market is closed, data won't change — be more conservative
        effective_ttl = max(args.ttl, 24.0)

    if args.no_resume:
        to_fetch = tickers
        skipped = []
        skipped_stale = []
    else:
        to_fetch = []
        skipped = []
        skipped_stale = []  # files that exist but have empty/bad data → will re-fetch
        for t in tickers:
            age, quality = _cached_data_age_hours(t)
            if age is not None and age < effective_ttl and quality:
                skipped.append(t)
            elif age is not None and not quality:
                skipped_stale.append(t)
                to_fetch.append(t)
            else:
                to_fetch.append(t)

    # Summary
    print("=" * 60)
    print(f"Batch Stock Data Fetcher")
    print(f"=" * 60)
    print(f"  Source:       {args.list if not args.tickers else 'custom'}")
    print(f"  Total:        {len(tickers)} tickers")
    print(f"  To fetch:     {len(to_fetch)} tickers")
    print(f"  Skipped:      {len(skipped)} (fresh data < {effective_ttl}h)")
    if skipped_stale:
        print(f"  Re-fetching:  {len(skipped_stale)} (cached but empty/failed data)")
    if market_closed:
        print(f"  Market:       CLOSED (using {effective_ttl}h effective TTL)")
    else:
        print(f"  Market:       OPEN (TTL: {effective_ttl}h)")
    print(f"  Price period: {args.period}")
    print(f"  Batch size:   {args.batch_size}")
    print(f"  Delay:        {args.delay}s between tickers")
    print(f"  Workers:      {args.workers} parallel threads")
    print(f"  Mode:         {'prices only' if args.prices_only else 'full (prices + fundamentals)'}")
    print(f"  Output:       {OUTPUT_DIR}/")

    if not args.prices_only:
        est_time = len(to_fetch) * (3.5 + args.delay) / args.workers
        price_time = math.ceil(len(to_fetch) / args.batch_size) * 2
        est_total = est_time + price_time
        print(f"  Est. time:    ~{est_total/60:.0f} min ({est_total:.0f}s)")
    else:
        est = math.ceil(len(to_fetch) / args.batch_size) * 2
        print(f"  Est. time:    ~{est}s")

    print()

    if args.dry_run:
        print("DRY RUN — would fetch these tickers:")
        for i, t in enumerate(to_fetch):
            print(f"  {i+1:3d}. {t}")
        return

    if not to_fetch:
        print("Nothing to fetch — all data is fresh.")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── Phase 1: Batch price download ──
    print("Phase 1: Downloading prices...")
    t0 = time.time()
    all_prices = fetch_batch_prices(to_fetch, period=args.period, batch_size=args.batch_size)
    print(f"  Prices done in {time.time()-t0:.1f}s")
    print()

    if args.prices_only:
        # Save prices-only files
        for sym in to_fetch:
            data = {
                "_ticker": sym,
                "_lastUpdated": datetime.now(timezone.utc).isoformat(),
                "_mode": "prices_only",
                "prices": all_prices.get(sym, []),
            }
            path = os.path.join(OUTPUT_DIR, f"{sym}.json")
            with open(path, "w") as f:
                json.dump(clean_for_json(data), f)
        print(f"Saved {len(to_fetch)} price-only files.")
        return

    # ── Phase 2: Per-ticker fundamentals ──
    # Use sequential processing with adaptive delay to avoid Yahoo 401/crumb errors.
    # Parallel workers cause crumb invalidation under rate limiting.
    workers = args.workers
    print(f"Phase 2: Fetching fundamentals ({workers} worker{'s' if workers > 1 else ''}, {args.delay}s base delay)...")
    t0 = time.time()
    failed = []
    total = len(to_fetch)
    consecutive_401s = 0
    current_delay = args.delay

    def process_ticker(sym, idx):
        nonlocal consecutive_401s, current_delay
        tick_start = time.time()
        try:
            fundamentals = fetch_ticker_fundamentals(sym)

            data = {
                "_ticker": sym,
                "_lastUpdated": datetime.now(timezone.utc).isoformat(),
                "_mode": "full",
                "prices": all_prices.get(sym, []),
                **fundamentals,
            }

            path = os.path.join(OUTPUT_DIR, f"{sym}.json")
            with open(path, "w") as f:
                json.dump(clean_for_json(data), f)

            dt = time.time() - tick_start
            n_prices = len(all_prices.get(sym, []))
            n_income = len(fundamentals.get("income_stmt", []))

            # Check if we got good data (info has enough fields)
            info_count = len(fundamentals.get("info", {}))
            if info_count >= 10:
                consecutive_401s = 0
                # Gradually reduce delay back to base when things are working
                current_delay = max(args.delay, current_delay * 0.9)
            else:
                consecutive_401s += 1

            print(f"  [{idx+1}/{total}] {sym} OK ({dt:.1f}s, {n_prices} bars, {n_income} income, {info_count} info fields)")
            return True
        except Exception as exc:
            dt = time.time() - tick_start
            consecutive_401s += 1
            print(f"  [{idx+1}/{total}] {sym} FAILED ({dt:.1f}s): {exc}")
            return False

    if workers <= 1:
        # Sequential — safest for avoiding rate limits
        for i, sym in enumerate(to_fetch):
            ok = process_ticker(sym, i)
            if not ok:
                failed.append(sym)
            # Adaptive delay — back off when hitting 401s
            if consecutive_401s >= 5:
                pause = min(60, 10 * (consecutive_401s // 5))
                print(f"    ⚠ {consecutive_401s} consecutive empty results — pausing {pause}s to cool down...")
                _refresh_yfinance_session()
                time.sleep(pause)
                consecutive_401s = 0
                current_delay = min(current_delay * 1.5, 10.0)
            else:
                time.sleep(current_delay)
    else:
        # Parallel — use thread pool but with rate-limit aware batching
        batch_size = workers
        for batch_start in range(0, total, batch_size):
            batch_end = min(batch_start + batch_size, total)
            batch_syms = to_fetch[batch_start:batch_end]

            with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
                futures = {
                    pool.submit(process_ticker, sym, batch_start + j): sym
                    for j, sym in enumerate(batch_syms)
                }
                for future in concurrent.futures.as_completed(futures):
                    sym = futures[future]
                    if not future.result():
                        failed.append(sym)

            # Adaptive delay between batches
            if consecutive_401s >= 3:
                pause = min(60, 15 * (consecutive_401s // 3))
                print(f"    ⚠ {consecutive_401s} empty results in batch — pausing {pause}s...")
                _refresh_yfinance_session()
                time.sleep(pause)
                consecutive_401s = 0
                current_delay = min(current_delay * 1.5, 15.0)
            else:
                time.sleep(current_delay)

    total_time = time.time() - t0

    # ── Summary ──
    print()
    print("=" * 60)
    print(f"Done in {total_time:.0f}s ({total_time/60:.1f} min)")
    print(f"  Success: {len(to_fetch) - len(failed)}/{len(to_fetch)}")
    if failed:
        print(f"  Failed:  {', '.join(failed)}")

    # Show output size
    total_size = 0
    for fname in os.listdir(OUTPUT_DIR):
        total_size += os.path.getsize(os.path.join(OUTPUT_DIR, fname))
    print(f"  Output:  {total_size/1024/1024:.1f} MB in {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
