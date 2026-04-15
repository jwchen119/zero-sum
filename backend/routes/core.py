"""
Core blueprint: single-ticker price, fundamentals, balance-sheet, cashflow,
holders, AI analysis, and coverage-tickers endpoints.
"""

import json
import os
import time
import traceback

import pandas as pd
import yfinance as yf
from flask import Blueprint, jsonify, request

from fetch_stock_data import fetch_daily_prices
from shared import (
    ANALYSIS_DIR,
    LISTINGS_DIR,
    _cache_get,
    _cache_put,
    _get_stock,
    _period_label,
    _safe_num,
    _save_raw_dump,
    _serialize,
    _validate_ticker,
    logger,
)

core_bp = Blueprint("core", __name__)

# Analysis cache TTL — default 24 hours
_ANALYSIS_CACHE_HOURS = int(os.environ.get("ANALYSIS_CACHE_HOURS", 24))

# Tickers eligible for LLM generation (TWSE only)
_analysis_eligible: set[str] | None = None

def _is_analysis_eligible(ticker: str) -> bool:
    """Return True if ticker is in TWSE listings."""
    global _analysis_eligible
    if _analysis_eligible is None:
        syms: set[str] = set()
        for name in ("twse",):
            path = os.path.join(LISTINGS_DIR, f"{name}.json")
            if os.path.exists(path):
                with open(path) as f:
                    data = json.load(f)
                syms.update(s["symbol"] for s in data.get("stocks", []))
        _analysis_eligible = syms
    return ticker in _analysis_eligible


# ─── Prices endpoint ──────────────────────────────────────

@core_bp.route("/api/prices", methods=["GET"])
def api_prices():
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err

    period = request.args.get("period", "5y")
    interval = request.args.get("interval", "1d")
    start = request.args.get("start") or None
    end = request.args.get("end") or None

    # Validate interval
    if interval not in ("15m", "1h", "4h", "1d"):
        interval = "1d"

    cache_key = f"{ticker}_{period}_{interval}" if not start else f"{ticker}_{start}_{end}_{interval}"
    # Shorter cache for intraday
    intraday = interval != "1d"
    cached = _cache_get("prices", cache_key, ttl=300 if intraday else 3600)
    if cached is not None:
        return jsonify(cached)

    try:
        df = fetch_daily_prices(ticker, start=start, end=end, period=period, interval=interval)
        if df.empty:
            return jsonify({"error": f"No data for '{ticker}'"}), 404

        df = df.dropna(subset=["Open", "High", "Low", "Close", "Volume"])
        time_fmt = "%Y-%m-%dT%H:%M" if intraday else "%Y-%m-%d"
        records = []
        for _, row in df.iterrows():
            records.append({
                "time": row["Date"].strftime(time_fmt),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "close": round(row["Close"], 2),
                "volume": int(row["Volume"]),
            })

        _save_raw_dump(ticker, "prices", {
            "period": period,
            "count": len(records),
            "first": records[0]["time"] if records else None,
            "last": records[-1]["time"] if records else None,
            "data": records,
        })

        result = {"ticker": ticker, "data": records}
        _cache_put("prices", cache_key, result)
        return jsonify(result)
    except Exception:
        return jsonify({"error": "Failed to fetch price data"}), 500


# ─── Quick quote endpoint (low TTL for real-time polling) ─────

@core_bp.route("/api/quote", methods=["GET"])
def api_quote():
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err

    cache_key = f"quote_{ticker}"
    cached = _cache_get("prices", cache_key, ttl=15)
    if cached is not None:
        return jsonify(cached)

    try:
        info = yf.Ticker(ticker).fast_info
        last_price = info.get("lastPrice") or info.get("regularMarketPrice")
        if last_price is None:
            return jsonify({"error": f"No quote data for '{ticker}'"}), 404
        result = {
            "ticker": ticker,
            "price": round(float(last_price), 2),
            "previousClose": round(float(info.get("previousClose", 0)), 2),
            "volume": int(info.get("lastVolume", 0)),
            "marketCap": int(info.get("marketCap", 0)) if info.get("marketCap") else None,
        }
        _cache_put("prices", cache_key, result)
        return jsonify(result)
    except Exception:
        return jsonify({"error": "Failed to fetch quote"}), 500


# ─── Fundamentals endpoint ────────────────────────────────

@core_bp.route("/api/fundamentals", methods=["GET"])
def api_fundamentals():
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err

    quarterly = request.args.get("quarterly", "false").lower() == "true"

    cache_key = f"{ticker}_q{quarterly}"
    cached = _cache_get("fundamentals", cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        stock, info = _get_stock(ticker)
        fin = stock.quarterly_financials if quarterly else stock.financials

        # --- Income statement ---
        income = []
        if fin is not None and not fin.empty:
            for col in reversed(fin.columns):
                label = _period_label(col, quarterly)
                row = fin[col]
                income.append({
                    "period": label,
                    "revenue": _safe_num(row.get("Total Revenue")),
                    "grossProfit": _safe_num(row.get("Gross Profit")),
                    "operatingIncome": _safe_num(row.get("Operating Income") or row.get("EBIT")),
                    "netIncome": _safe_num(row.get("Net Income")),
                })

        income = [item for item in income if any(
            item.get(k) is not None for k in ("revenue", "grossProfit", "operatingIncome", "netIncome")
        )]

        for item in income:
            rev = item["revenue"]
            if rev and rev > 0:
                item["grossMargin"] = round((item["grossProfit"] or 0) / rev * 100, 1)
                item["operatingMargin"] = round((item["operatingIncome"] or 0) / rev * 100, 1)
                item["netMargin"] = round((item["netIncome"] or 0) / rev * 100, 1)
            else:
                item["grossMargin"] = None
                item["operatingMargin"] = None
                item["netMargin"] = None

        for idx, item in enumerate(income):
            eps_val = None
            if fin is not None and not fin.empty:
                col = list(reversed(fin.columns))[idx] if idx < len(fin.columns) else None
                if col is not None:
                    row = fin[col]
                    eps_val = _safe_num(row.get("Basic EPS")) or _safe_num(row.get("Diluted EPS"))
            item["eps"] = round(eps_val, 2) if eps_val is not None else None

        # --- Dividends ---
        dividends = []
        try:
            divs = stock.dividends
            if divs is not None and not divs.empty:
                div_df = divs.reset_index()
                div_df.columns = ["Date", "Dividend"]
                div_df["Date"] = pd.to_datetime(div_df["Date"]).dt.tz_localize(None)
                if income:
                    cutoff_year = int(income[0]["period"][:4])
                else:
                    cutoff_year = div_df["Date"].max().year - 10
                div_df = div_df[div_df["Date"].dt.year >= cutoff_year]
                if quarterly:
                    div_df["Period"] = div_df["Date"].apply(lambda d: f"{d.year}-Q{(d.month - 1) // 3 + 1}")
                else:
                    div_df["Period"] = div_df["Date"].dt.strftime("%Y")
                agg = div_df.groupby("Period", sort=True).agg(
                    total=("Dividend", "sum"),
                    payments=("Dividend", "count"),
                ).reset_index()

                from datetime import datetime
                now = datetime.now()
                if quarterly:
                    current_period = f"{now.year}-Q{(now.month - 1) // 3 + 1}"
                else:
                    current_period = str(now.year)

                completed_counts = [
                    int(r["payments"]) for _, r in agg.iterrows()
                    if r["Period"] != current_period
                ]
                if completed_counts:
                    sorted_counts = sorted(completed_counts)
                    mid = len(sorted_counts) // 2
                    if len(sorted_counts) % 2 == 0:
                        median_payments = (sorted_counts[mid - 1] + sorted_counts[mid]) / 2
                    else:
                        median_payments = sorted_counts[mid]
                else:
                    median_payments = None

                for _, row in agg.iterrows():
                    pmts = int(row["payments"])
                    total = round(row["total"], 4)
                    per_payment = round(total / pmts, 4) if pmts > 0 else 0.0
                    is_incomplete = (row["Period"] == current_period)
                    dividends.append({
                        "period": row["Period"],
                        "total": total,
                        "payments": pmts,
                        "perPayment": per_payment,
                        "incomplete": is_incomplete,
                        "medianPayments": median_payments,
                    })
        except Exception as exc:
            logger.warning(f"[WARN] Dividend processing failed for {ticker}: {exc}")
            traceback.print_exc()

        # --- Key ratios ---
        dividend_rate = info.get("dividendRate")
        price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        computed_yield = (dividend_rate / price) if (dividend_rate and price and price > 0) else None

        ratios = {
            "name": info.get("shortName") or info.get("longName") or ticker,
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "marketCap": info.get("marketCap"),
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "profitMargin": info.get("profitMargins"),
            "operatingMargin": info.get("operatingMargins"),
            "grossMargin": info.get("grossMargins"),
            "epsTrailing": info.get("trailingEps"),
            "epsForward": info.get("forwardEps"),
            "dividendRate": info.get("dividendRate"),
            "dividendYield": computed_yield,
            "payoutRatio": info.get("payoutRatio"),
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

        # --- Company profile ---
        profile = {
            "name": info.get("longName") or info.get("shortName") or ticker,
            "description": info.get("longBusinessSummary"),
            "website": info.get("website"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "employees": _safe_num(info.get("fullTimeEmployees")),
            "city": info.get("city"),
            "state": info.get("state"),
            "country": info.get("country"),
        }

        # --- Officers ---
        officers_raw = info.get("companyOfficers", [])
        officers = []
        for o in officers_raw[:5]:
            officers.append({
                "name": o.get("name"),
                "title": o.get("title"),
                "totalPay": _safe_num(o.get("totalPay")),
                "exercisedValue": _safe_num(o.get("exercisedValue")),
                "yearBorn": o.get("yearBorn"),
            })

        # --- Recommendations ---
        recommendations = []
        try:
            recs = stock.recommendations
            if recs is not None and not recs.empty:
                for _, row in recs.iterrows():
                    recommendations.append({
                        "period": str(row.get("period", "")),
                        "strongBuy": int(row.get("strongBuy", 0)),
                        "buy": int(row.get("buy", 0)),
                        "hold": int(row.get("hold", 0)),
                        "sell": int(row.get("sell", 0)),
                        "strongSell": int(row.get("strongSell", 0)),
                    })
        except Exception:
            pass

        # --- Calendar ---
        calendar = {}
        try:
            cal = stock.calendar
            if cal is not None:
                if isinstance(cal, dict):
                    calendar = {k: _serialize(v) for k, v in cal.items()}
                elif isinstance(cal, pd.DataFrame) and not cal.empty:
                    calendar = {k: _serialize(cal[k].iloc[0]) for k in cal.columns}
        except Exception:
            pass

        # --- Splits ---
        splits = []
        try:
            sp = stock.splits
            if sp is not None and not sp.empty:
                sp_df = sp.reset_index()
                sp_df.columns = ["Date", "Ratio"]
                for _, row in sp_df.iterrows():
                    d = row["Date"]
                    date_str = d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10]
                    ratio = float(row["Ratio"])
                    splits.append({
                        "date": date_str,
                        "ratio": ratio,
                        "type": "Forward" if ratio > 1 else "Reverse",
                    })
        except Exception:
            pass

        result = {
            "ticker": ticker,
            "quarterly": quarterly,
            "income": income,
            "dividends": dividends,
            "ratios": ratios,
            "profile": profile,
            "officers": officers,
            "recommendations": recommendations,
            "calendar": calendar,
            "splits": splits,
        }

        _save_raw_dump(ticker, "fundamentals", result)
        _cache_put("fundamentals", cache_key, result)
        return jsonify(result)
    except Exception:
        return jsonify({"error": "Failed to fetch fundamentals"}), 500


# ─── Balance Sheet ────────────────────────────────────────

@core_bp.route("/api/balance-sheet", methods=["GET"])
def api_balance_sheet():
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err
    if not ticker:
        return jsonify({"error": "Missing 'ticker' parameter"}), 400

    quarterly = request.args.get("quarterly", "false").lower() == "true"
    cache_key = f"{ticker}_q{quarterly}"
    cached = _cache_get("balance_sheet", cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        stock, _ = _get_stock(ticker)
        bs = stock.quarterly_balance_sheet if quarterly else stock.balance_sheet

        items = []
        if bs is not None and not bs.empty:
            for col in reversed(bs.columns):
                label = _period_label(col, quarterly)
                row = bs[col]
                items.append({
                    "period": label,
                    "totalAssets": _safe_num(row.get("Total Assets")),
                    "totalLiabilities": _safe_num(row.get("Total Liabilities Net Minority Interest") or row.get("Total Liabilities")),
                    "stockholdersEquity": _safe_num(row.get("Stockholders Equity") or row.get("Total Equity Gross Minority Interest")),
                    "totalDebt": _safe_num(row.get("Total Debt")),
                    "cash": _safe_num(row.get("Cash And Cash Equivalents") or row.get("Cash Cash Equivalents And Short Term Investments")),
                    "currentAssets": _safe_num(row.get("Current Assets")),
                    "currentLiabilities": _safe_num(row.get("Current Liabilities")),
                    "goodwill": _safe_num(row.get("Goodwill")),
                    "retainedEarnings": _safe_num(row.get("Retained Earnings")),
                    "longTermDebt": _safe_num(row.get("Long Term Debt")),
                })

        items = [r for r in items if any(
            v is not None for k, v in r.items() if k != "period"
        )]

        bs_result = {"ticker": ticker, "quarterly": quarterly, "items": items}
        _save_raw_dump(ticker, "balanceSheet", bs_result)
        _cache_put("balance_sheet", cache_key, bs_result)
        return jsonify(bs_result)
    except Exception:
        return jsonify({"error": "Failed to fetch balance sheet"}), 500


# ─── Cash Flow ───────────────────────────────────────────

@core_bp.route("/api/cashflow", methods=["GET"])
def api_cashflow():
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err
    if not ticker:
        return jsonify({"error": "Missing 'ticker' parameter"}), 400

    quarterly = request.args.get("quarterly", "false").lower() == "true"
    cache_key = f"{ticker}_q{quarterly}"
    cached = _cache_get("cashflow", cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        stock, _ = _get_stock(ticker)
        cf = stock.quarterly_cashflow if quarterly else stock.cashflow

        items = []
        if cf is not None and not cf.empty:
            for col in reversed(cf.columns):
                label = _period_label(col, quarterly)
                row = cf[col]
                items.append({
                    "period": label,
                    "operatingCashFlow": _safe_num(row.get("Operating Cash Flow")),
                    "investingCashFlow": _safe_num(row.get("Investing Cash Flow") or row.get("Cash Flow From Continuing Investing Activities")),
                    "financingCashFlow": _safe_num(row.get("Financing Cash Flow") or row.get("Cash Flow From Continuing Financing Activities")),
                    "freeCashFlow": _safe_num(row.get("Free Cash Flow")),
                    "capex": _safe_num(row.get("Capital Expenditure")),
                    "dividendsPaid": _safe_num(row.get("Common Stock Dividend Paid") or row.get("Cash Dividends Paid")),
                    "stockBuyback": _safe_num(row.get("Repurchase Of Capital Stock")),
                    "debtRepayment": _safe_num(row.get("Repayment Of Debt")),
                    "debtIssuance": _safe_num(row.get("Issuance Of Debt")),
                    "netChangeInCash": _safe_num(row.get("Changes In Cash") or row.get("Change In Cash Supplemental As Reported")),
                })

        items = [r for r in items if any(
            v is not None for k, v in r.items() if k != "period"
        )]

        cf_result = {"ticker": ticker, "quarterly": quarterly, "items": items}
        _save_raw_dump(ticker, "cashFlow", cf_result)
        _cache_put("cashflow", cache_key, cf_result)
        return jsonify(cf_result)
    except Exception:
        return jsonify({"error": "Failed to fetch cash flow"}), 500


# ─── Holders ─────────────────────────────────────────────

@core_bp.route("/api/holders", methods=["GET"])
def api_holders():
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err

    cached = _cache_get("holders", ticker)
    if cached is not None:
        return jsonify(cached)

    try:
        stock, _ = _get_stock(ticker)

        summary = {}
        try:
            mh = stock.major_holders
            if mh is not None and not mh.empty:
                if "Value" in mh.columns:
                    for idx_label in mh.index:
                        val = _safe_num(mh.loc[idx_label, "Value"])
                        key = str(idx_label).strip()
                        if key == "insidersPercentHeld":
                            summary["insidersPercent"] = round(val * 100, 2) if val else None
                        elif key == "institutionsPercentHeld":
                            summary["institutionsPercent"] = round(val * 100, 2) if val else None
                        elif key == "institutionsFloatPercentHeld":
                            summary["floatPercent"] = round(val * 100, 2) if val else None
                        elif key == "institutionsCount":
                            summary["institutionCount"] = int(val) if val else None
                else:
                    for _, row in mh.iterrows():
                        label = str(row.iloc[1]).strip().lower() if len(row) >= 2 else ""
                        value = _safe_num(row.iloc[0])
                        if "insider" in label:
                            summary["insidersPercent"] = round(value * 100, 2) if value else None
                        elif "institution" in label and "float" not in label and "count" not in label:
                            summary["institutionsPercent"] = round(value * 100, 2) if value else None
                        elif "float" in label:
                            summary["floatPercent"] = round(value * 100, 2) if value else None
        except Exception:
            pass

        holders = []
        try:
            ih = stock.institutional_holders
            if ih is not None and not ih.empty:
                for _, row in ih.head(10).iterrows():
                    holders.append({
                        "holder": str(row.get("Holder", "")),
                        "shares": _safe_num(row.get("Shares")),
                        "value": _safe_num(row.get("Value")),
                        "pctHeld": _safe_num(row.get("pctHeld")),
                        "pctChange": _safe_num(row.get("pctChange")),
                        "dateReported": str(row.get("Date Reported", ""))[:10],
                    })
        except Exception:
            pass

        holders_result = {"ticker": ticker, "summary": summary, "holders": holders}
        _save_raw_dump(ticker, "holders", holders_result)
        _cache_put("holders", ticker, holders_result)
        return jsonify(holders_result)
    except Exception:
        return jsonify({"error": "Failed to fetch holders"}), 500


# ─── AI Analysis ─────────────────────────────────────────

@core_bp.route("/api/analyze")
def api_analyze():
    ticker, err = _validate_ticker(request.args.get("ticker", ""))
    if err:
        return err

    force = request.args.get("force", "").lower() in ("true", "1", "yes")
    filepath = os.path.join(ANALYSIS_DIR, f"{ticker}.json")

    # Serve existing cached analysis for any ticker
    if not force and os.path.exists(filepath):
        with open(filepath, "r") as f:
            data = json.load(f)
        try:
            age_hours = (time.time() - os.path.getmtime(filepath)) / 3600
            data["_ageHours"] = round(age_hours, 1)
            data["_stale"] = age_hours > 168  # >7 days = stale
        except OSError:
            pass
        logger.info(f"[analyze] Serving cached analysis for {ticker}")
        return jsonify(data)

    # Only generate new analysis for TWSE tickers
    if not _is_analysis_eligible(ticker):
        return jsonify(
            error="AI analysis is only available for TWSE stocks.",
            _notEligible=True,
        ), 403

    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        try:
            from generate_analysis import generate_analysis
            analysis = generate_analysis(ticker, force=force)
            return jsonify(analysis)
        except Exception as e:
            logger.error(f"[analyze] Generation failed for {ticker}: {e}")

    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            data = json.load(f)
        return jsonify(data)

    return jsonify(error=f"No AI analysis available for {ticker}"), 404


# ─── Coverage Tickers ────────────────────────────────────

@core_bp.route("/api/coverage-tickers")
def api_coverage_tickers():
    cached = _cache_get("coverage_tickers", "latest")
    if cached is not None:
        return jsonify(cached)

    tickers = []
    if os.path.isdir(ANALYSIS_DIR):
        for fname in sorted(os.listdir(ANALYSIS_DIR)):
            if not fname.endswith(".json"):
                continue
            try:
                with open(os.path.join(ANALYSIS_DIR, fname), "r") as f:
                    data = json.load(f)
                tickers.append({
                    "ticker": data.get("ticker", fname.replace(".json", "")),
                    "companyName": data.get("companyName", ""),
                    "summary": (data.get("plainEnglish") or "")[:150],
                    "generatedAt": data.get("generatedAt", ""),
                })
            except Exception:
                continue

    from datetime import datetime
    result = {
        "tickers": tickers,
        "generatedAt": datetime.now().isoformat() + "Z",
    }
    _cache_put("coverage_tickers", "latest", result)
    return jsonify(result)
