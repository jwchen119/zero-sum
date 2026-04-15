"""
LLM Analysis Generator
Fetches Yahoo Finance data for a stock and calls OpenAI GPT to produce
structured analysis JSON consumed by the frontend AiAnalysisPanel.

Usage:
    python generate_analysis.py --tickers AAPL
    python generate_analysis.py --tickers AAPL,MSFT,GOOG --force
    python generate_analysis.py --tickers AAPL --dry-run
    python generate_analysis.py --tickers AAPL --model gpt-4o-mini
"""

import argparse
import json
import math
import os
import re
import sys
import time
from datetime import datetime

import yfinance as yf
import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI

# ─── Configuration ──────────────────────────────────────────

load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))

ANALYSIS_DIR = os.path.join(os.path.dirname(__file__), "static_analysis")
os.makedirs(ANALYSIS_DIR, exist_ok=True)

DEFAULT_MODEL = os.environ.get("ANALYSIS_MODEL", "gpt-4o")
CACHE_HOURS = int(os.environ.get("ANALYSIS_CACHE_HOURS", 24))


# ─── Helpers ────────────────────────────────────────────────

def _safe_num(val):
    if val is None:
        return None
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None


def _fmt_big(val):
    """Format a large number for human-readable display."""
    if val is None:
        return "n/a"
    v = abs(val)
    sign = "-" if val < 0 else ""
    if v >= 1e12:
        return f"{sign}${v / 1e12:.2f}T"
    if v >= 1e9:
        return f"{sign}${v / 1e9:.1f}B"
    if v >= 1e6:
        return f"{sign}${v / 1e6:.1f}M"
    return f"{sign}${v:,.0f}"


def _fmt_pct(val):
    """Format a percentage."""
    if val is None:
        return "n/a"
    return f"{val:.1f}%"


def _period_label(col, quarterly=False):
    if quarterly:
        return f"{col.year}-Q{(col.month - 1) // 3 + 1}" if hasattr(col, "year") else str(col)[:7]
    return col.strftime("%Y") if hasattr(col, "strftime") else str(col)[:4]


# ─── Data Gathering ────────────────────────────────────────

def gather_stock_data(ticker: str) -> dict:
    """
    Fetch all Yahoo Finance data required for analysis.
    Returns a consolidated dictionary.
    """
    print(f"  [data] Fetching Yahoo Finance data for {ticker}...")
    stock = yf.Ticker(ticker)
    info = stock.info

    # --- Income Statement (annual) ---
    income = []
    fin = stock.financials
    if fin is not None and not fin.empty:
        for col in reversed(fin.columns):
            label = _period_label(col)
            row = fin[col]
            rev = _safe_num(row.get("Total Revenue"))
            gp = _safe_num(row.get("Gross Profit"))
            oi = _safe_num(row.get("Operating Income") or row.get("EBIT"))
            ni = _safe_num(row.get("Net Income"))
            eps_val = _safe_num(row.get("Basic EPS")) or _safe_num(row.get("Diluted EPS"))
            income.append({
                "period": label,
                "revenue": rev,
                "grossProfit": gp,
                "operatingIncome": oi,
                "netIncome": ni,
                "grossMargin": round(gp / rev * 100, 1) if gp and rev and rev > 0 else None,
                "operatingMargin": round(oi / rev * 100, 1) if oi and rev and rev > 0 else None,
                "netMargin": round(ni / rev * 100, 1) if ni and rev and rev > 0 else None,
                "eps": round(eps_val, 2) if eps_val else None,
            })
    income = [i for i in income if any(i.get(k) is not None for k in ("revenue", "grossProfit", "netIncome"))]

    # --- Balance Sheet (annual) ---
    balance_sheet = []
    bs = stock.balance_sheet
    if bs is not None and not bs.empty:
        for col in reversed(bs.columns):
            label = _period_label(col)
            row = bs[col]
            balance_sheet.append({
                "period": label,
                "totalAssets": _safe_num(row.get("Total Assets")),
                "totalLiabilities": _safe_num(row.get("Total Liabilities Net Minority Interest") or row.get("Total Liabilities")),
                "stockholdersEquity": _safe_num(row.get("Stockholders Equity") or row.get("Total Equity Gross Minority Interest")),
                "totalDebt": _safe_num(row.get("Total Debt")),
                "cash": _safe_num(row.get("Cash And Cash Equivalents") or row.get("Cash Cash Equivalents And Short Term Investments")),
                "currentAssets": _safe_num(row.get("Current Assets")),
                "currentLiabilities": _safe_num(row.get("Current Liabilities")),
                "retainedEarnings": _safe_num(row.get("Retained Earnings")),
                "longTermDebt": _safe_num(row.get("Long Term Debt")),
            })
    balance_sheet = [r for r in balance_sheet if any(v is not None for k, v in r.items() if k != "period")]

    # --- Cash Flow (annual) ---
    cash_flow = []
    cf = stock.cashflow
    if cf is not None and not cf.empty:
        for col in reversed(cf.columns):
            label = _period_label(col)
            row = cf[col]
            cash_flow.append({
                "period": label,
                "operatingCashFlow": _safe_num(row.get("Operating Cash Flow")),
                "freeCashFlow": _safe_num(row.get("Free Cash Flow")),
                "capex": _safe_num(row.get("Capital Expenditure")),
                "dividendsPaid": _safe_num(row.get("Common Stock Dividend Paid") or row.get("Cash Dividends Paid")),
                "stockBuyback": _safe_num(row.get("Repurchase Of Capital Stock")),
                "debtRepayment": _safe_num(row.get("Repayment Of Debt")),
            })
    cash_flow = [r for r in cash_flow if any(v is not None for k, v in r.items() if k != "period")]

    # --- Key Ratios ---
    ratios = {
        "name": info.get("longName") or info.get("shortName") or ticker,
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "marketCap": info.get("marketCap"),
        "trailingPE": info.get("trailingPE"),
        "forwardPE": info.get("forwardPE"),
        "grossMargin": info.get("grossMargins"),
        "operatingMargin": info.get("operatingMargins"),
        "profitMargin": info.get("profitMargins"),
        "epsTrailing": info.get("trailingEps"),
        "epsForward": info.get("forwardEps"),
        "dividendYield": info.get("dividendYield"),
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
    }

    # --- Profile ---
    profile = {
        "name": info.get("longName") or info.get("shortName") or ticker,
        "description": info.get("longBusinessSummary"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
    }

    # --- Holders ---
    holders_data = {"summary": {}, "holders": []}
    try:
        mh = stock.major_holders
        if mh is not None and not mh.empty:
            if "Value" in mh.columns:
                for idx_label in mh.index:
                    val = _safe_num(mh.loc[idx_label, "Value"])
                    key = str(idx_label).strip()
                    if key == "insidersPercentHeld":
                        holders_data["summary"]["insidersPercent"] = round(val * 100, 2) if val else None
                    elif key == "institutionsPercentHeld":
                        holders_data["summary"]["institutionsPercent"] = round(val * 100, 2) if val else None
                    elif key == "institutionsFloatPercentHeld":
                        holders_data["summary"]["floatPercent"] = round(val * 100, 2) if val else None
                    elif key == "institutionsCount":
                        holders_data["summary"]["institutionCount"] = int(val) if val else None
        ih = stock.institutional_holders
        if ih is not None and not ih.empty:
            for _, row in ih.head(10).iterrows():
                holders_data["holders"].append({
                    "holder": str(row.get("Holder", "")),
                    "pctHeld": _safe_num(row.get("pctHeld")),
                    "pctChange": _safe_num(row.get("pctChange")),
                })
    except Exception:
        pass

    # --- Recommendations ---
    recommendations = []
    try:
        recs = stock.recommendations
        if recs is not None and not recs.empty:
            for _, row in recs.head(4).iterrows():
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
                cutoff_year = div_df["Date"].max().year - 5
            div_df = div_df[div_df["Date"].dt.year >= cutoff_year]
            div_df["Period"] = div_df["Date"].dt.strftime("%Y")
            agg = div_df.groupby("Period", sort=True).agg(
                total=("Dividend", "sum"),
                payments=("Dividend", "count"),
            ).reset_index()
            for _, row in agg.iterrows():
                dividends.append({
                    "period": row["Period"],
                    "total": round(row["total"], 4),
                    "payments": int(row["payments"]),
                })
    except Exception:
        pass

    # --- Calendar ---
    calendar = {}
    try:
        cal = stock.calendar
        if cal is not None and isinstance(cal, dict):
            for k, v in cal.items():
                if isinstance(v, list):
                    calendar[k] = [str(x) for x in v]
                elif hasattr(v, "isoformat"):
                    calendar[k] = v.isoformat()
                else:
                    calendar[k] = v
    except Exception:
        pass

    print(f"  [data] Done. Income: {len(income)} years, BS: {len(balance_sheet)} years, CF: {len(cash_flow)} years")

    return {
        "ticker": ticker,
        "profile": profile,
        "ratios": ratios,
        "income": income,
        "balanceSheet": balance_sheet,
        "cashFlow": cash_flow,
        "holders": holders_data,
        "recommendations": recommendations,
        "dividends": dividends,
        "calendar": calendar,
    }


# ─── Prompt Builder ─────────────────────────────────────────

SYSTEM_PROMPT = """You are a senior equity research analyst writing for an intelligent general audience. You will receive structured financial data for a publicly traded company and produce a JSON analysis.

RULES:
- Base every claim on the provided data. Do not hallucinate numbers.
- Reference specific figures (e.g., revenue of $416.2B, margin of 46.9%).
- Compare across years to identify trends (growth rates, direction changes).
- Be balanced — present both positives and negatives honestly.
- Write in a professional but accessible tone (like the Wall Street Journal).
- Do NOT give buy/sell recommendations or price targets.
- Each "detail" field should be 2-4 sentences with specific numbers from the data.
- Each bullet in strengths/risks/bullCase/bearCase should be 1-2 complete sentences.

OUTPUT FORMAT:
Return valid JSON matching this exact schema:
{
  "ticker": "<TICKER>",
  "companyName": "<from profile name>",
  "generatedAt": "<today's date YYYY-MM-DD>",
  "model": "<model name>",
  "plainEnglish": "<100-200 word non-technical summary explaining what the company does and its recent financial performance, written for someone who knows nothing about finance>",
  "goingWell": [
    {"title": "<short headline, 5-10 words>", "detail": "<2-4 sentences with specific numbers>"},
    {"title": "...", "detail": "..."},
    {"title": "...", "detail": "..."},
    {"title": "...", "detail": "..."}
  ],
  "concerns": [
    {"title": "<short headline, 5-10 words>", "detail": "<2-4 sentences with specific numbers>"},
    {"title": "...", "detail": "..."},
    {"title": "...", "detail": "..."},
    {"title": "...", "detail": "..."}
  ],
  "fiveYearTrend": {
    "summary": "<150-250 word narrative of multi-year financial trends, covering revenue trajectory, margin changes, capital allocation, and balance sheet evolution>",
    "strengths": ["<trend strength 1>", "<trend strength 2>", "<trend strength 3>", "<trend strength 4>"],
    "risks": ["<trend risk 1>", "<trend risk 2>", "<trend risk 3>", "<trend risk 4>"],
    "outlook": "<50-100 word forward-looking paragraph based on analyst estimates and calendar data>"
  },
  "investmentThesis": {
    "bullCase": ["<1-2 sentences>", "<1-2 sentences>", "<1-2 sentences>", "<1-2 sentences>", "<1-2 sentences>"],
    "bearCase": ["<1-2 sentences>", "<1-2 sentences>", "<1-2 sentences>", "<1-2 sentences>", "<1-2 sentences>"]
  }
}

Return ONLY the JSON object. No markdown fences, no commentary, no extra text."""


def build_user_prompt(data: dict) -> str:
    """Build the user message with all financial data formatted as readable text."""
    ticker = data["ticker"]
    profile = data["profile"]
    ratios = data["ratios"]

    lines = [f"Analyze the following financial data for {ticker}:\n"]

    # Profile
    lines.append("=== COMPANY PROFILE ===")
    lines.append(f"Name: {profile['name']}")
    if profile.get("sector"):
        lines.append(f"Sector: {profile['sector']} | Industry: {profile.get('industry', 'n/a')}")
    if profile.get("description"):
        desc = profile["description"]
        if len(desc) > 500:
            desc = desc[:500] + "..."
        lines.append(f"Description: {desc}")
    lines.append("")

    # Ratios
    lines.append("=== KEY RATIOS (Current Snapshot) ===")
    mc = ratios.get("marketCap")
    lines.append(f"Market Cap: {_fmt_big(mc) if mc else 'n/a'}")
    lines.append(f"Trailing P/E: {ratios.get('trailingPE', 'n/a')} | Forward P/E: {ratios.get('forwardPE', 'n/a')}")
    gm = ratios.get("grossMargin")
    om = ratios.get("operatingMargin")
    pm = ratios.get("profitMargin")
    lines.append(f"Gross Margin: {_fmt_pct(gm * 100) if gm else 'n/a'} | Operating Margin: {_fmt_pct(om * 100) if om else 'n/a'} | Net Margin: {_fmt_pct(pm * 100) if pm else 'n/a'}")
    lines.append(f"EPS (TTM): {ratios.get('epsTrailing', 'n/a')} | EPS (Forward): {ratios.get('epsForward', 'n/a')}")
    rg = ratios.get("revenueGrowth")
    eg = ratios.get("earningsGrowth")
    lines.append(f"Revenue Growth: {_fmt_pct(rg * 100) if rg else 'n/a'} | Earnings Growth: {_fmt_pct(eg * 100) if eg else 'n/a'}")
    roe = ratios.get("roe")
    roa = ratios.get("roa")
    lines.append(f"ROE: {_fmt_pct(roe * 100) if roe else 'n/a'} | ROA: {_fmt_pct(roa * 100) if roa else 'n/a'}")
    lines.append(f"D/E: {ratios.get('debtToEquity', 'n/a')} | Current Ratio: {ratios.get('currentRatio', 'n/a')}")
    lines.append(f"Beta: {ratios.get('beta', 'n/a')}")
    lines.append(f"52W High: {ratios.get('fiftyTwoWeekHigh', 'n/a')} | 52W Low: {ratios.get('fiftyTwoWeekLow', 'n/a')}")
    dy = ratios.get("dividendYield")
    pr = ratios.get("payoutRatio")
    # dividendYield from yfinance is already percentage-like (0.4 = 0.4%), payoutRatio is decimal (0.13 = 13%)
    lines.append(f"Dividend Yield: {_fmt_pct(dy) if dy else 'n/a'} | Payout Ratio: {_fmt_pct(pr * 100) if pr else 'n/a'}")
    lines.append(f"Price-to-Book: {ratios.get('priceToBook', 'n/a')}")
    so = ratios.get("sharesOutstanding")
    so_str = f"{so / 1e9:.2f}B" if so and so >= 1e9 else (f"{so / 1e6:.0f}M" if so else "n/a")
    lines.append(f"Shares Outstanding: {so_str}")
    lines.append("")

    # Income Statement
    lines.append("=== INCOME STATEMENT (Annual) ===")
    for item in data["income"]:
        eps_str = f" | EPS ${item['eps']}" if item.get("eps") else ""
        lines.append(
            f"FY{item['period']}: Rev {_fmt_big(item['revenue'])} | "
            f"GP {_fmt_big(item['grossProfit'])} ({_fmt_pct(item.get('grossMargin'))}) | "
            f"OpInc {_fmt_big(item['operatingIncome'])} | "
            f"NI {_fmt_big(item['netIncome'])}{eps_str}"
        )
    lines.append("")

    # Balance Sheet
    lines.append("=== BALANCE SHEET (Annual) ===")
    for item in data["balanceSheet"]:
        lines.append(
            f"FY{item['period']}: Assets {_fmt_big(item.get('totalAssets'))} | "
            f"Liab {_fmt_big(item.get('totalLiabilities'))} | "
            f"Equity {_fmt_big(item.get('stockholdersEquity'))} | "
            f"Debt {_fmt_big(item.get('totalDebt'))} | "
            f"Cash {_fmt_big(item.get('cash'))}"
        )
        re_val = item.get("retainedEarnings")
        if re_val is not None:
            lines.append(f"         Retained Earnings: {_fmt_big(re_val)} | LT Debt: {_fmt_big(item.get('longTermDebt'))}")
    lines.append("")

    # Cash Flow
    lines.append("=== CASH FLOW (Annual) ===")
    for item in data["cashFlow"]:
        lines.append(
            f"FY{item['period']}: OpCF {_fmt_big(item.get('operatingCashFlow'))} | "
            f"FCF {_fmt_big(item.get('freeCashFlow'))} | "
            f"CapEx {_fmt_big(item.get('capex'))} | "
            f"Buyback {_fmt_big(item.get('stockBuyback'))} | "
            f"Div {_fmt_big(item.get('dividendsPaid'))}"
        )
    lines.append("")

    # Dividends
    if data["dividends"]:
        lines.append("=== DIVIDENDS (Per Share, Annual) ===")
        for d in data["dividends"]:
            lines.append(f"{d['period']}: ${d['total']}/share ({d['payments']} payments)")
        lines.append("")

    # Holders
    holders = data.get("holders", {})
    if holders.get("holders"):
        lines.append("=== TOP INSTITUTIONAL HOLDERS ===")
        summary = holders.get("summary", {})
        if summary:
            lines.append(
                f"Insiders: {summary.get('insidersPercent', 'n/a')}% | "
                f"Institutions: {summary.get('institutionsPercent', 'n/a')}% | "
                f"Float: {summary.get('floatPercent', 'n/a')}%"
            )
        for i, h in enumerate(holders["holders"], 1):
            pct = h.get("pctHeld")
            chg = h.get("pctChange")
            pct_str = f"{pct * 100:.2f}%" if pct else "n/a"
            if chg is not None:
                chg_str = f"▲{chg * 100:.1f}%" if chg >= 0 else f"▼{abs(chg) * 100:.1f}%"
            else:
                chg_str = ""
            lines.append(f"{i}. {h['holder']}: {pct_str} ({chg_str})")
        lines.append("")

    # Recommendations
    if data["recommendations"]:
        lines.append("=== ANALYST RECOMMENDATIONS ===")
        rec = data["recommendations"][0]  # current month
        total = rec["strongBuy"] + rec["buy"] + rec["hold"] + rec["sell"] + rec["strongSell"]
        lines.append(
            f"Strong Buy: {rec['strongBuy']} | Buy: {rec['buy']} | "
            f"Hold: {rec['hold']} | Sell: {rec['sell']} | Strong Sell: {rec['strongSell']} "
            f"(Total: {total})"
        )
        lines.append("")

    # Calendar
    cal = data.get("calendar", {})
    if cal:
        lines.append("=== UPCOMING EARNINGS ===")
        ed = cal.get("Earnings Date")
        if ed:
            lines.append(f"Date: {ed[0] if isinstance(ed, list) else ed}")
        eh = cal.get("Earnings High")
        el = cal.get("Earnings Low")
        ea = cal.get("Earnings Average")
        if ea:
            lines.append(f"EPS Estimate: ${el}-${eh} (Avg ${ea})")
        rh = cal.get("Revenue High")
        rl = cal.get("Revenue Low")
        ra = cal.get("Revenue Average")
        if ra:
            lines.append(f"Revenue Estimate: {_fmt_big(rl)}-{_fmt_big(rh)} (Avg {_fmt_big(ra)})")
        lines.append("")

    today = datetime.now().strftime("%Y-%m-%d")
    lines.append(f"Today's date: {today}")

    return "\n".join(lines)


def build_messages(data: dict, model: str) -> list[dict]:
    """Build the OpenAI chat messages array."""
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(data)},
    ]


# ─── GPT Caller ─────────────────────────────────────────────

def call_gpt(messages: list[dict], model: str = "gpt-4o") -> dict:
    """
    Call OpenAI API, parse response as JSON, validate structure.
    Retries once on parse/validation failure.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set. Add it to project root .env or container environment")

    org_id = os.environ.get("OPENAI_ORG_ID")
    client = OpenAI(api_key=api_key, organization=org_id)

    for attempt in range(2):
        print(f"  [gpt] Calling {model} (attempt {attempt + 1})...")
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.4,
            max_tokens=4000,
        )

        raw = response.choices[0].message.content.strip()
        usage = response.usage
        print(f"  [gpt] Tokens — prompt: {usage.prompt_tokens}, completion: {usage.completion_tokens}, total: {usage.total_tokens}")

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*\n?", "", raw)
            raw = re.sub(r"\n?```\s*$", "", raw)

        try:
            result = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f"  [gpt] JSON parse error: {e}")
            if attempt == 0:
                messages.append({"role": "assistant", "content": raw})
                messages.append({"role": "user", "content": "Your response was not valid JSON. Please return ONLY a valid JSON object matching the schema, with no extra text."})
                continue
            raise RuntimeError(f"GPT returned invalid JSON after 2 attempts: {e}")

        # Validate structure
        errors = _validate_analysis(result)
        if errors:
            print(f"  [gpt] Validation errors: {errors}")
            if attempt == 0:
                messages.append({"role": "assistant", "content": raw})
                messages.append({"role": "user", "content": f"Your response had validation errors: {'; '.join(errors)}. Please fix and return the corrected JSON."})
                continue
            print(f"  [gpt] WARNING: Returning result with validation issues: {errors}")

        return result

    raise RuntimeError("GPT call failed after retries")


def _validate_analysis(data: dict) -> list[str]:
    """Validate the analysis JSON structure. Returns list of error messages."""
    errors = []

    for key in ("ticker", "companyName", "generatedAt", "model", "plainEnglish"):
        if not isinstance(data.get(key), str) or len(data[key]) < 2:
            errors.append(f"Missing or empty string field: {key}")

    if len(data.get("plainEnglish", "")) < 50:
        errors.append("plainEnglish too short (< 50 chars)")

    for arr_key in ("goingWell", "concerns"):
        arr = data.get(arr_key, [])
        if not isinstance(arr, list) or len(arr) < 3:
            errors.append(f"{arr_key} should have at least 3 items, got {len(arr) if isinstance(arr, list) else 0}")
        else:
            for i, item in enumerate(arr):
                if not isinstance(item, dict) or not item.get("title") or not item.get("detail"):
                    errors.append(f"{arr_key}[{i}] missing title or detail")

    fyt = data.get("fiveYearTrend", {})
    if not isinstance(fyt, dict):
        errors.append("fiveYearTrend must be an object")
    else:
        if len(fyt.get("summary", "")) < 50:
            errors.append("fiveYearTrend.summary too short")
        for sub in ("strengths", "risks"):
            arr = fyt.get(sub, [])
            if not isinstance(arr, list) or len(arr) < 2:
                errors.append(f"fiveYearTrend.{sub} should have at least 2 items")
        if len(fyt.get("outlook", "")) < 20:
            errors.append("fiveYearTrend.outlook too short")

    thesis = data.get("investmentThesis", {})
    if not isinstance(thesis, dict):
        errors.append("investmentThesis must be an object")
    else:
        for sub in ("bullCase", "bearCase"):
            arr = thesis.get(sub, [])
            if not isinstance(arr, list) or len(arr) < 3:
                errors.append(f"investmentThesis.{sub} should have at least 3 items")

    return errors


# ─── Main Pipeline ──────────────────────────────────────────

def generate_analysis(ticker: str, model: str = None, force: bool = False) -> dict:
    """
    End-to-end pipeline: gather data → build prompt → call GPT → validate → save.
    Returns the complete analysis dict.
    """
    model = model or DEFAULT_MODEL
    ticker = ticker.upper()

    # Check cache — if analysis already exists, reuse it to avoid unnecessary API costs
    filepath = os.path.join(ANALYSIS_DIR, f"{ticker}.json")
    if not force and os.path.exists(filepath):
        age_hours = (time.time() - os.path.getmtime(filepath)) / 3600
        print(f"  [cache] Analysis exists for {ticker} ({age_hours:.1f}h old). Reusing cached version. Use --force to regenerate.")
        with open(filepath, "r") as f:
            return json.load(f)

    # Gather data
    stock_data = gather_stock_data(ticker)

    # Build prompt
    messages = build_messages(stock_data, model)

    # Call GPT
    analysis = call_gpt(messages, model)

    # Ensure metadata is correct
    analysis["ticker"] = ticker
    analysis["generatedAt"] = datetime.now().strftime("%Y-%m-%d")
    analysis["model"] = model

    # Save
    save_analysis(ticker, analysis)

    return analysis


def save_analysis(ticker: str, analysis: dict) -> None:
    """Write analysis JSON to static_analysis/{TICKER}.json."""
    filepath = os.path.join(ANALYSIS_DIR, f"{ticker}.json")
    with open(filepath, "w") as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)
    print(f"  [save] Written to {filepath}")


# ─── CLI ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate LLM stock analysis")
    parser.add_argument("--tickers", required=True, help="Comma-separated ticker symbols")
    parser.add_argument("--model", default=None, help=f"OpenAI model (default: {DEFAULT_MODEL})")
    parser.add_argument("--force", action="store_true", help="Regenerate even if cached")
    parser.add_argument("--dry-run", action="store_true", help="Show prompt without calling GPT")
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]
    model = args.model or DEFAULT_MODEL

    print(f"Generating analysis for {len(tickers)} ticker(s): {', '.join(tickers)}")
    print(f"Model: {model} | Force: {args.force} | Dry run: {args.dry_run}")
    print()

    for i, ticker in enumerate(tickers):
        print(f"[{i + 1}/{len(tickers)}] {ticker}")

        if args.dry_run:
            stock_data = gather_stock_data(ticker)
            messages = build_messages(stock_data, model)
            print("\n--- SYSTEM PROMPT ---")
            print(messages[0]["content"][:200] + "...")
            print(f"\n--- USER PROMPT ({len(messages[1]['content'])} chars) ---")
            print(messages[1]["content"])
            print("--- END ---\n")
            continue

        try:
            analysis = generate_analysis(ticker, model=model, force=args.force)
            print(f"  ✓ Done: {analysis['companyName']} — {len(analysis.get('goingWell', []))} strengths, {len(analysis.get('concerns', []))} concerns\n")
        except Exception as e:
            print(f"  ✗ FAILED: {e}\n")

        # Rate limit between tickers
        if i < len(tickers) - 1:
            print("  (waiting 2s for rate limit...)")
            time.sleep(2)

    print("Complete.")


if __name__ == "__main__":
    main()
