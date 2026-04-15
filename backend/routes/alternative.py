"""
Alternative data blueprint: earnings-full, insiders, congress-trades.
"""

import glob
import json
import os
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import yfinance as yf
from flask import Blueprint, jsonify, request

from shared import (
    BATCH_DATA_DIR,
    CACHE_DIR,
    ENABLE_CONGRESS_TRADES,
    _cache_get,
    _cache_path,
    _cache_put,
    _safe_num,
    _VALID_TICKER,
    logger,
)

alternative_bp = Blueprint("alternative", __name__)


# ─── Helpers ─────────────────────────────────────────────

_COVERAGE_TICKERS_PATH = os.path.join(
    os.path.dirname(__file__), os.pardir, "cache", "coverage_tickers", "latest.json"
)
_TWSE_LISTINGS_PATH = os.path.join(
    os.path.dirname(__file__), os.pardir, "cache", "listings", "twse.json"
)


def _get_coverage_symbols() -> list[str]:
    """Load the coverage ticker list as a fallback symbol source."""
    try:
        with open(_COVERAGE_TICKERS_PATH) as f:
            data = json.load(f)
        return [t["ticker"] for t in data.get("tickers", [])]
    except Exception:
        return []


def _get_twse_symbols() -> list[str]:
    """Load TWSE ticker list from cached listings."""
    try:
        with open(_TWSE_LISTINGS_PATH) as f:
            data = json.load(f)
        return [s["symbol"] for s in data.get("stocks", [])]
    except Exception:
        return []


def _fetch_info_live(symbol: str) -> dict | None:
    """Fetch a ticker's info dict from Yahoo Finance."""
    try:
        return dict(yf.Ticker(symbol).info or {})
    except Exception as e:
        logger.debug("earnings live fetch failed for %s: %s", symbol, e)
        return None


# ─── Earnings Full ───────────────────────────────────────

def _extract_earnings(symbol: str, info: dict, today, cutoff) -> dict | None:
    """Extract an earnings entry from a ticker info dict if within date range."""
    # Collect candidate earnings dates from all known field variants
    raw_dates = []
    ed_raw = info.get("earningsDate")
    if ed_raw:
        raw_dates.extend(ed_raw if isinstance(ed_raw, list) else [ed_raw])
    # yfinance also provides Unix timestamps for upcoming earnings
    for ts_key in ("earningsTimestampStart", "earningsTimestampEnd"):
        ts = info.get(ts_key)
        if ts and isinstance(ts, (int, float)):
            raw_dates.append(ts)

    if not raw_dates:
        return None

    for d in raw_dates:
        try:
            if isinstance(d, (int, float)):
                dt = datetime.fromtimestamp(d).date()
            else:
                dt = datetime.strptime(str(d)[:10], "%Y-%m-%d").date()
        except Exception:
            continue

        if today <= dt <= cutoff:
            return {
                "symbol": symbol,
                "company": (info.get("shortName") or info.get("longName") or symbol)[:50],
                "date": dt.isoformat(),
                "epsEstimate": _safe_num(info.get("epsCurrentYear")),
                "revenueEstimate": _safe_num(info.get("revenueEstimate")),
                "marketCap": _safe_num(info.get("marketCap")),
                "sector": info.get("sector", ""),
                "industry": info.get("industry", ""),
            }
    return None


@alternative_bp.route("/api/earnings-full", methods=["GET"])
def api_earnings_full():
    source = request.args.get("source", "")  # "watchlist", "twse", or empty
    tickers_param = request.args.get("tickers", "")  # comma-separated for watchlist

    # Determine symbol list based on source
    if source == "watchlist" and tickers_param:
        symbols = [t.strip().upper() for t in tickers_param.split(",") if t.strip()]
        cache_key = "watchlist_" + "_".join(sorted(symbols))
    elif source == "twse":
        symbols = _get_twse_symbols()
        cache_key = "twse"
    else:
        symbols = []
        cache_key = "full"

    # Check cache
    cached = _cache_get("earnings_calendar", cache_key)
    if cached is not None:
        path = _cache_path("earnings_calendar", cache_key)
        if os.path.exists(path):
            age = datetime.now().timestamp() - os.path.getmtime(path)
            ttl = 300 if source == "watchlist" else 3600
            if age < ttl:
                return jsonify(cached)

    from routes.screener import _get_screener_data

    earnings_list = []
    today = datetime.now().date()
    cutoff = today + timedelta(days=90)

    # If a specific source was given, use live fetch for those symbols
    if symbols:
        logger.info("[earnings-full] Fetching live for %d tickers (source=%s)", len(symbols), source)
        with ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(
                lambda s: (s, _fetch_info_live(s)),
                symbols,
            ))
        for symbol, info in results:
            if info:
                entry = _extract_earnings(symbol, info, today, cutoff)
                if entry:
                    earnings_list.append(entry)
    else:
        # Legacy: try batch data, then fall back to coverage tickers
        screener_data = _get_screener_data()
        batch_symbols = set()

        for row in screener_data:
            symbol = row.get("symbol", "")
            bp = os.path.join(BATCH_DATA_DIR, f"{symbol}.json")
            if not os.path.isfile(bp):
                continue
            batch_symbols.add(symbol)
            try:
                with open(bp) as f:
                    blob = json.load(f)
                info = blob.get("info", {})
                entry = _extract_earnings(symbol, info, today, cutoff)
                if entry:
                    earnings_list.append(entry)
            except Exception:
                continue

        if not batch_symbols:
            fallback = _get_coverage_symbols()
            if fallback:
                logger.info("[earnings-full] No batch data, fetching live for %d tickers", len(fallback))
                with ThreadPoolExecutor(max_workers=8) as pool:
                    results = list(pool.map(
                        lambda s: (s, _fetch_info_live(s)),
                        fallback,
                    ))
                for symbol, info in results:
                    if info:
                        entry = _extract_earnings(symbol, info, today, cutoff)
                        if entry:
                            earnings_list.append(entry)

    earnings_list.sort(key=lambda x: (x["date"], -(x["marketCap"] or 0)))

    grouped = {}
    for e in earnings_list:
        d = e["date"]
        if d not in grouped:
            grouped[d] = []
        grouped[d].append(e)

    dates_sorted = sorted(grouped.keys())
    by_date = [{"date": d, "earnings": grouped[d]} for d in dates_sorted]

    result = {
        "byDate": by_date,
        "totalCount": len(earnings_list),
        "source": source or "default",
        "dateRange": {
            "start": dates_sorted[0] if dates_sorted else None,
            "end": dates_sorted[-1] if dates_sorted else None,
        },
        "generatedAt": datetime.now().isoformat() + "Z",
    }

    _cache_put("earnings_calendar", cache_key, result)
    resp = jsonify(result)
    # Don't let browsers cache empty results
    if not earnings_list:
        resp.headers["Cache-Control"] = "no-cache"
    return resp


# ─── Insider Trading ─────────────────────────────────────

@alternative_bp.route("/api/insiders")
def insider_trading():
    ticker_filter = request.args.get("ticker", "").strip().upper()
    if ticker_filter and not _VALID_TICKER.match(ticker_filter):
        return jsonify({"error": "Invalid ticker format"}), 400
    tx_type = request.args.get("type", "all").lower()
    days = min(int(request.args.get("days", 365)), 730)
    min_value = float(request.args.get("minValue", 0))
    cache_key = f"insiders_{ticker_filter}_{tx_type}_{days}_{min_value}"

    cached = _cache_get("insiders", cache_key, ttl=1800)
    if cached:
        return jsonify(cached)

    cutoff = datetime.now() - timedelta(days=days)
    transactions = []

    if ticker_filter:
        files = []
        p = os.path.join(BATCH_DATA_DIR, f"{ticker_filter}.json")
        if os.path.isfile(p):
            files.append(p)
    else:
        files = glob.glob(os.path.join(BATCH_DATA_DIR, "*.json"))

    for fpath in files:
        try:
            with open(fpath) as f:
                data = json.load(f)
        except Exception:
            continue
        symbol = data.get("_ticker", os.path.basename(fpath).replace(".json", ""))
        info = data.get("info", {})
        company = info.get("shortName", symbol)
        sector = info.get("sector", "")
        current_price = info.get("currentPrice") or info.get("regularMarketPrice")

        for tx in data.get("insider_transactions", []):
            raw_date = tx.get("Start Date", "")
            if not raw_date:
                continue
            try:
                dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00").split("T")[0])
            except Exception:
                continue
            if dt < cutoff:
                continue

            shares = tx.get("Shares") or 0
            value = tx.get("Value") or 0
            text = tx.get("Text", "")
            insider = tx.get("Insider", "")
            position = tx.get("Position", "")
            ownership = tx.get("Ownership", "")

            text_lower = text.lower()
            if "sale" in text_lower or "sold" in text_lower:
                tx_kind = "sell"
            elif "purchase" in text_lower or "bought" in text_lower or "buy" in text_lower:
                tx_kind = "buy"
            elif "gift" in text_lower:
                tx_kind = "gift"
            elif "exercise" in text_lower or "option" in text_lower:
                tx_kind = "exercise"
            else:
                tx_kind = "other"

            if tx_type == "buy" and tx_kind != "buy":
                continue
            if tx_type == "sell" and tx_kind != "sell":
                continue

            if min_value > 0 and (value or 0) < min_value:
                continue

            transactions.append({
                "ticker": symbol,
                "company": company,
                "sector": sector,
                "insider": insider,
                "position": position,
                "type": tx_kind,
                "date": dt.strftime("%Y-%m-%d"),
                "shares": shares,
                "value": value,
                "text": text,
                "ownership": ownership,
                "currentPrice": current_price,
            })

    transactions.sort(key=lambda x: (x["date"], x["value"] or 0), reverse=True)

    buys = [t for t in transactions if t["type"] == "buy"]
    sells = [t for t in transactions if t["type"] == "sell"]
    total_buy_value = sum(t["value"] or 0 for t in buys)
    total_sell_value = sum(t["value"] or 0 for t in sells)

    result = {
        "transactions": transactions[:500],
        "totalCount": len(transactions),
        "summary": {
            "totalBuys": len(buys),
            "totalSells": len(sells),
            "totalBuyValue": total_buy_value,
            "totalSellValue": total_sell_value,
            "netValue": total_buy_value - total_sell_value,
        },
        "filters": {
            "ticker": ticker_filter or None,
            "type": tx_type,
            "days": days,
            "minValue": min_value,
        },
    }

    _cache_put("insiders", cache_key, result)
    return jsonify(result)


# ─── Congress Trading ────────────────────────────────────

_CONGRESS_API_URL = "https://api.quiverquant.com/beta/live/congresstrading"
_CONGRESS_CACHE_KEY = "congress_trades_v3"


def _map_transaction_type(txn):
    """Map Quiver Quant transaction strings to buy/sell/exchange."""
    if not txn:
        return "buy"
    t = txn.lower()
    if "purchase" in t:
        return "buy"
    if "sale" in t:
        return "sell"
    return "exchange"


def _map_chamber(house):
    """Map Quiver Quant 'House' field to our chamber names."""
    if not house:
        return "House"
    if house.lower() == "senate":
        return "Senate"
    return "House"


def _build_stock_lookup():
    """Build ticker→{company, sector, currentPrice} from batch data."""
    lookup = {}
    for fpath in glob.glob(os.path.join(BATCH_DATA_DIR, "*.json")):
        try:
            with open(fpath) as f:
                data = json.load(f)
        except Exception:
            continue
        info = data.get("info", {})
        ticker = data.get("_ticker", os.path.basename(fpath).replace(".json", ""))
        lookup[ticker] = {
            "company": info.get("shortName", ""),
            "sector": info.get("sector", ""),
            "currentPrice": info.get("currentPrice") or info.get("regularMarketPrice") or 0,
        }
    return lookup


def _fetch_congress_trades():
    """Fetch real congress trading data from Quiver Quantitative."""
    import urllib.request

    req = urllib.request.Request(
        _CONGRESS_API_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
            "Accept": "application/json",
            "Origin": "https://www.quiverquant.com",
            "Referer": "https://www.quiverquant.com/",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


_SEED_PATH = os.path.join(CACHE_DIR, "congress_seed.json")


def _load_seed_data():
    """Load seed data as fallback if API is unavailable."""
    if os.path.exists(_SEED_PATH):
        try:
            with open(_SEED_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _build_congress_trades():
    if not ENABLE_CONGRESS_TRADES:
        return {
            "trades": [],
            "members": [],
            "totalCount": 0,
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
            "insights": {},
            "disclaimer": "Congress trading data is disabled in this deployment.",
        }

    cached = _cache_get("congress", _CONGRESS_CACHE_KEY, ttl=3600)
    if cached:
        return cached

    try:
        raw = _fetch_congress_trades()
        # Update seed file on successful fetch
        try:
            with open(_SEED_PATH, "w") as f:
                json.dump(raw, f)
        except Exception:
            pass
    except Exception as e:
        logger.error("Failed to fetch congress trades: %s", e)
        raw = _load_seed_data()
        if not raw:
            return {
                "trades": [], "members": [], "totalCount": 0,
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
                "disclaimer": "Congress trading data is temporarily unavailable.",
            }

    stock_lookup = _build_stock_lookup()

    # Amount range → midpoint for estimated volume calculations
    _AMOUNT_MID = {
        "$1,001 - $15,000": 8000,
        "$15,001 - $50,000": 32500,
        "$50,001 - $100,000": 75000,
        "$100,001 - $250,000": 175000,
        "$250,001 - $500,000": 375000,
        "$500,001 - $1,000,000": 750000,
        "$1,000,001 - $5,000,000": 3000000,
        "$5,000,001 - $25,000,000": 15000000,
        "$25,000,001 - $50,000,000": 37500000,
    }

    trades = []
    members_set = set()

    for rec in raw:
        ticker = (rec.get("Ticker") or "").strip().upper()
        if not ticker or not _VALID_TICKER.match(ticker):
            continue

        member = rec.get("Representative") or ""
        party = rec.get("Party") or ""
        chamber = _map_chamber(rec.get("House"))
        trade_type = _map_transaction_type(rec.get("Transaction"))
        amount_range = rec.get("Range") or "$1,001 - $15,000"
        trade_date = rec.get("TransactionDate") or ""
        disclosure_date = rec.get("ReportDate") or ""

        stock_info = stock_lookup.get(ticker, {})
        company = rec.get("Description") or stock_info.get("company", "")
        sector = stock_info.get("sector", "")
        current_price = stock_info.get("currentPrice", 0)

        # Performance fields from Quiver Quant
        excess_return = rec.get("ExcessReturn")
        price_change = rec.get("PriceChange")
        spy_change = rec.get("SPYChange")

        members_set.add((member, party, chamber))

        trades.append({
            "member": member,
            "party": party,
            "chamber": chamber,
            "state": "",
            "ticker": ticker,
            "company": company,
            "sector": sector,
            "type": trade_type,
            "amountRange": amount_range,
            "tradeDate": trade_date,
            "disclosureDate": disclosure_date,
            "currentPrice": current_price,
            "excessReturn": round(excess_return, 2) if excess_return is not None else None,
            "priceChange": round(price_change, 2) if price_change is not None else None,
            "spyChange": round(spy_change, 2) if spy_change is not None else None,
        })

    trades.sort(key=lambda x: x["tradeDate"], reverse=True)

    members_list = [
        {"name": m[0], "party": m[1], "chamber": m[2], "state": ""}
        for m in sorted(members_set)
    ]

    buy_count = sum(1 for t in trades if t["type"] == "buy")
    sell_count = sum(1 for t in trades if t["type"] == "sell")
    unique_tickers = sorted({t["ticker"] for t in trades})

    ticker_counts = Counter(t["ticker"] for t in trades)
    most_traded = [{"ticker": k, "trades": v} for k, v in ticker_counts.most_common(10)]

    d_trades = [t for t in trades if t["party"] == "D"]
    r_trades = [t for t in trades if t["party"] == "R"]

    # ── Actionable Insights ────────────────────────────────
    buys = [t for t in trades if t["type"] == "buy"]
    sells = [t for t in trades if t["type"] == "sell"]

    # Most bought tickers (aggregated)
    buy_counts = Counter(t["ticker"] for t in buys)
    most_bought = []
    for tick, cnt in buy_counts.most_common(10):
        sample = next((t for t in buys if t["ticker"] == tick), {})
        est_vol = sum(_AMOUNT_MID.get(t["amountRange"], 8000) for t in buys if t["ticker"] == tick)
        most_bought.append({
            "ticker": tick, "trades": cnt, "company": sample.get("company", ""),
            "sector": sample.get("sector", ""), "estimatedVolume": est_vol,
        })

    # Most sold tickers (aggregated)
    sell_counts = Counter(t["ticker"] for t in sells)
    most_sold = []
    for tick, cnt in sell_counts.most_common(10):
        sample = next((t for t in sells if t["ticker"] == tick), {})
        est_vol = sum(_AMOUNT_MID.get(t["amountRange"], 8000) for t in sells if t["ticker"] == tick)
        most_sold.append({
            "ticker": tick, "trades": cnt, "company": sample.get("company", ""),
            "sector": sample.get("sector", ""), "estimatedVolume": est_vol,
        })

    # Best/worst performing trades (by ExcessReturn — how much the trade
    # outperformed SPY since it was made)
    trades_with_perf = [t for t in trades if t["excessReturn"] is not None]
    best = sorted(trades_with_perf, key=lambda t: t["excessReturn"], reverse=True)[:10]
    worst = sorted(trades_with_perf, key=lambda t: t["excessReturn"])[:10]

    # Most active members (by trade count and estimated dollar volume)
    member_stats = {}
    for t in trades:
        m = t["member"]
        if m not in member_stats:
            member_stats[m] = {"name": m, "party": t["party"], "chamber": t["chamber"],
                               "trades": 0, "buys": 0, "sells": 0, "estimatedVolume": 0}
        member_stats[m]["trades"] += 1
        if t["type"] == "buy":
            member_stats[m]["buys"] += 1
        elif t["type"] == "sell":
            member_stats[m]["sells"] += 1
        member_stats[m]["estimatedVolume"] += _AMOUNT_MID.get(t["amountRange"], 8000)
    top_members = sorted(member_stats.values(), key=lambda m: m["estimatedVolume"], reverse=True)[:10]

    # Sector breakdown (buy/sell counts per sector)
    sector_data = {}
    for t in trades:
        s = t["sector"] or "Unknown"
        if s not in sector_data:
            sector_data[s] = {"sector": s, "buys": 0, "sells": 0, "total": 0, "estimatedVolume": 0}
        sector_data[s]["total"] += 1
        if t["type"] == "buy":
            sector_data[s]["buys"] += 1
        elif t["type"] == "sell":
            sector_data[s]["sells"] += 1
        sector_data[s]["estimatedVolume"] += _AMOUNT_MID.get(t["amountRange"], 8000)
    sectors_sorted = sorted(sector_data.values(), key=lambda s: s["total"], reverse=True)

    # Big trades (large dollar amounts ≥$100k)
    big_threshold = {"$100,001 - $250,000", "$250,001 - $500,000",
                     "$500,001 - $1,000,000", "$1,000,001 - $5,000,000",
                     "$5,000,001 - $25,000,000", "$25,000,001 - $50,000,000"}
    big_trades = [t for t in trades if t["amountRange"] in big_threshold]

    insights = {
        "mostBought": most_bought,
        "mostSold": most_sold,
        "bestPerformers": best,
        "worstPerformers": worst,
        "topMembers": top_members,
        "sectorBreakdown": sectors_sorted,
        "bigTrades": big_trades,
    }

    result = {
        "trades": trades,
        "members": members_list,
        "totalCount": len(trades),
        "summary": {
            "totalBuys": buy_count,
            "totalSells": sell_count,
            "uniqueTickers": len(unique_tickers),
            "mostTraded": most_traded,
            "partyBreakdown": {
                "D": {"total": len(d_trades), "buys": sum(1 for t in d_trades if t["type"] == "buy"), "sells": sum(1 for t in d_trades if t["type"] == "sell")},
                "R": {"total": len(r_trades), "buys": sum(1 for t in r_trades if t["type"] == "buy"), "sells": sum(1 for t in r_trades if t["type"] == "sell")},
            },
        },
        "insights": insights,
        "disclaimer": "Data sourced from official STOCK Act disclosures via Quiver Quantitative. Trades are self-reported by members of Congress and may be delayed.",
    }

    _cache_put("congress", _CONGRESS_CACHE_KEY, result)
    return result


@alternative_bp.route("/api/congress-trades")
def congress_trades():
    data = _build_congress_trades()

    trades = data["trades"]
    member_f = request.args.get("member", "")
    party_f = request.args.get("party", "").upper()
    chamber_f = request.args.get("chamber", "")
    ticker_f = request.args.get("ticker", "").strip().upper()
    if ticker_f and not _VALID_TICKER.match(ticker_f):
        return jsonify({"error": "Invalid ticker format"}), 400
    type_f = request.args.get("type", "").lower()

    if member_f:
        trades = [t for t in trades if member_f.lower() in t["member"].lower()]
    if party_f:
        trades = [t for t in trades if t["party"] == party_f]
    if chamber_f:
        trades = [t for t in trades if t["chamber"].lower() == chamber_f.lower()]
    if ticker_f:
        trades = [t for t in trades if t["ticker"] == ticker_f]
    if type_f in ("buy", "sell"):
        trades = [t for t in trades if t["type"] == type_f]

    return jsonify({
        "trades": trades,
        "members": data["members"],
        "totalCount": len(trades),
        "summary": data["summary"],
        "insights": data.get("insights", {}),
        "disclaimer": data["disclaimer"],
        "filters": {
            "member": member_f or None,
            "party": party_f or None,
            "chamber": chamber_f or None,
            "ticker": ticker_f or None,
            "type": type_f or None,
        },
    })
