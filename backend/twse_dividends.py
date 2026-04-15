"""
TWSE dividend event fetch + normalization utilities for /api/dividend-screener.

Primary source:
  https://www.twse.com.tw/exchangeReport/TWT49U
"""

from __future__ import annotations

import json
import os
import re
import ssl
import tempfile
from datetime import date as dt_date
from datetime import datetime, timezone
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager


TWSE_TWT49U_URL = "https://www.twse.com.tw/exchangeReport/TWT49U"
_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; zero-sum-bot/1.0)"}


class _TwseTLSAdapter(HTTPAdapter):
    """Keep cert validation enabled but relax strict X.509 checks for TWSE."""

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        ctx = ssl.create_default_context()
        if hasattr(ssl, "VERIFY_X509_STRICT"):
            ctx.verify_flags &= ~ssl.VERIFY_X509_STRICT
        pool_kwargs["ssl_context"] = ctx
        self.poolmanager = PoolManager(
            num_pools=connections,
            maxsize=maxsize,
            block=block,
            **pool_kwargs,
        )


def _twse_session() -> requests.Session:
    session = requests.Session()
    session.trust_env = os.environ.get("TWSE_TRUST_ENV", "0") == "1"
    session.headers.update(_HEADERS)
    session.mount("https://www.twse.com.tw/", _TwseTLSAdapter())
    return session


def _canonical_key(raw: Any) -> str:
    s = str(raw or "").strip().lower()
    # Keep CJK and ascii alnum only for robust matching across punctuation/spacing variants.
    return re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "", s)


def _pick_value(row: dict[str, Any], exact_keys: list[str], contains_keywords: list[str]) -> Any:
    canonical_map = {_canonical_key(k): v for k, v in row.items()}
    for key in exact_keys:
        ck = _canonical_key(key)
        if ck in canonical_map:
            return canonical_map[ck]

    # Fallback to contains-based matching for schema drifts.
    for raw_key, val in row.items():
        ckey = _canonical_key(raw_key)
        if not ckey:
            continue
        if all(k in ckey for k in contains_keywords):
            return val
    return None


def _to_float(raw: Any) -> float | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if not text or text in {"--", "-", "—", "N/A", "null", "None"}:
        return None
    text = text.replace(",", "")
    if text.startswith("+"):
        text = text[1:]
    cleaned = re.sub(r"[^0-9.\-]", "", text)
    if not cleaned or cleaned in {"-", ".", "-."}:
        return None
    try:
        return float(cleaned)
    except (TypeError, ValueError):
        return None


def _parse_tw_date(raw: Any) -> dt_date | None:
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, dt_date):
        return raw

    text = str(raw).strip()
    if not text:
        return None

    m = re.match(r"^(\d{4})(\d{2})(\d{2})$", text)
    if m:
        try:
            return dt_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None

    m = re.match(r"^(\d{1,4})[/-](\d{1,2})[/-](\d{1,2})$", text)
    if m:
        y = int(m.group(1))
        mm = int(m.group(2))
        dd = int(m.group(3))
        if y < 1911:
            y += 1911
        try:
            return dt_date(y, mm, dd)
        except ValueError:
            return None

    m = re.match(r"^(\d{1,4})年(\d{1,2})月(\d{1,2})日$", text)
    if m:
        y = int(m.group(1))
        mm = int(m.group(2))
        dd = int(m.group(3))
        if y < 1911:
            y += 1911
        try:
            return dt_date(y, mm, dd)
        except ValueError:
            return None

    return None


def _is_cash_only(div_type: Any) -> bool:
    text = re.sub(r"\s+", "", str(div_type or ""))
    if not text:
        # Some rows may omit type; caller will still gate by positive cash amount.
        return True
    if "權息" in text:
        return False
    if "權" in text and "息" not in text:
        return False
    return "息" in text


def _normalize_symbol(code: Any) -> str | None:
    raw = str(code or "").strip().upper()
    if not raw:
        return None
    # Keep alnum only, then restore with .TW suffix.
    cleaned = re.sub(r"[^0-9A-Z]", "", raw)
    if not cleaned:
        return None
    return f"{cleaned}.TW"


def _row_to_event(row: dict[str, Any]) -> dict[str, Any] | None:
    code = _pick_value(
        row,
        exact_keys=[
            "證券代號",
            "股票代號",
            "公司代號",
            "代號",
            "SecuritiesCompanyCode",
            "Code",
            "StockNo",
        ],
        contains_keywords=["代號"],
    )
    symbol = _normalize_symbol(code)
    if not symbol:
        return None

    date_raw = _pick_value(
        row,
        exact_keys=[
            "除權息日期",
            "除權息交易日",
            "除權息日",
            "除權息日期(即除權息交易日)",
            "資料日期",
            "Date",
            "ExDividendDate",
        ],
        contains_keywords=["除", "息", "日"],
    )
    event_date = _parse_tw_date(date_raw)
    if event_date is None:
        return None

    div_type = _pick_value(
        row,
        exact_keys=["權/息", "除權息", "除權息別", "配發種類", "Type", "Category"],
        contains_keywords=["權息"],
    )
    if not _is_cash_only(div_type):
        return None

    div_raw = _pick_value(
        row,
        exact_keys=[
            "息值",
            "現金股利",
            "現金股利(元)",
            "除息金額",
            "權值+息值",
            "權值＋息值",
            "股利金額",
            "Dividend",
            "CashDividend",
        ],
        contains_keywords=["息", "值"],
    )
    div = _to_float(div_raw)
    if div is None or div <= 0:
        return None

    px_prev_raw = _pick_value(
        row,
        exact_keys=[
            "除權息前收盤價",
            "前收盤價",
            "PreClose",
            "PreClosePrice",
        ],
        contains_keywords=["前", "收盤價"],
    )
    px_prev = _to_float(px_prev_raw)
    yld = round(div / px_prev * 100, 4) if px_prev and px_prev > 0 else None

    return {
        "symbol": symbol,
        "date": event_date.isoformat(),
        "div": round(div, 6),
        "pxPrev": round(px_prev, 4) if px_prev and px_prev > 0 else None,
        "yld": yld,
        "refType": "prev",
    }


def fetch_twse_cash_dividend_events(start_date: dt_date, end_date: dt_date) -> list[dict[str, Any]]:
    """Fetch TWSE TWT49U rows and normalize into event-level cash dividend records."""
    params = {
        "response": "json",
        "startDate": start_date.strftime("%Y%m%d"),
        "endDate": end_date.strftime("%Y%m%d"),
    }
    with _twse_session() as session:
        resp = session.get(TWSE_TWT49U_URL, params=params, timeout=45)
        resp.raise_for_status()
        payload = resp.json()

    rows: list[dict[str, Any]] = []
    if isinstance(payload, dict) and isinstance(payload.get("fields"), list) and isinstance(payload.get("data"), list):
        fields = [str(f) for f in payload.get("fields", [])]
        for raw in payload.get("data", []):
            if isinstance(raw, list):
                rows.append({fields[i]: raw[i] if i < len(raw) else None for i in range(len(fields))})
            elif isinstance(raw, dict):
                rows.append(raw)
    elif isinstance(payload, list):
        rows = [r for r in payload if isinstance(r, dict)]

    out: list[dict[str, Any]] = []
    for row in rows:
        evt = _row_to_event(row)
        if evt is not None:
            out.append(evt)

    out.sort(key=lambda x: (x["symbol"], x["date"]))
    return out


def _empty_year_bucket(year: int) -> dict[str, Any]:
    return {"year": year, "events": [], "totalYld": None}


def _build_symbol_payload(events: list[dict[str, Any]], anchor_year: int, window_years: int) -> dict[str, Any]:
    grouped: dict[int, list[dict[str, Any]]] = {}
    for evt in events:
        year = int(str(evt.get("date", ""))[:4] or 0)
        if year <= 0:
            continue
        grouped.setdefault(year, []).append(evt)

    years = [anchor_year - i for i in range(window_years)]
    h5y: list[dict[str, Any]] = []
    for year in years:
        year_events = sorted(grouped.get(year, []), key=lambda e: e.get("date") or "")
        ylds = [e["yld"] for e in year_events if isinstance(e.get("yld"), (int, float))]
        total = round(sum(ylds), 4) if ylds else None
        h5y.append({"year": year, "events": year_events, "totalYld": total})

    ly = h5y[0] if h5y else _empty_year_bucket(anchor_year)
    totals = [y["totalYld"] for y in h5y if isinstance(y.get("totalYld"), (int, float))]
    h5y_avg = round(sum(totals) / len(totals), 4) if totals else None
    return {
        "ly": ly,
        "h5y": h5y,
        "sortKeys": {
            "lyTotalYld": ly.get("totalYld"),
            "h5yAvgAnnualYld": h5y_avg,
            "h5yLatestYearYld": ly.get("totalYld"),
        },
    }


def build_twse_dividend_cache_payload(
    events: list[dict[str, Any]],
    *,
    anchor_year: int,
    window_years: int,
    start_date: dt_date,
    end_date: dt_date,
) -> dict[str, Any]:
    per_symbol: dict[str, list[dict[str, Any]]] = {}
    for evt in events:
        sym = evt.get("symbol")
        if not isinstance(sym, str):
            continue
        per_symbol.setdefault(sym, []).append(evt)

    symbols_payload: dict[str, Any] = {}
    for sym, sym_events in per_symbol.items():
        symbols_payload[sym] = _build_symbol_payload(sym_events, anchor_year=anchor_year, window_years=window_years)

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "twse/twt49u",
        "anchorYear": anchor_year,
        "windowYears": window_years,
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "symbols": symbols_payload,
        "stats": {
            "symbolCount": len(symbols_payload),
            "eventCount": len(events),
        },
    }


def _atomic_json_write(path: str, data: Any):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(path), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp_path, path)
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def refresh_twse_dividend_cache(
    cache_dir: str,
    *,
    window_years: int = 5,
    end_date: dt_date | None = None,
) -> dict[str, Any]:
    """Fetch + normalize + write TWSE dividend cache.

    Returns the payload that was written to disk.
    """
    if window_years < 1:
        window_years = 1
    end = end_date or dt_date.today()
    anchor_year = end.year
    start = dt_date(anchor_year - window_years + 1, 1, 1)

    events = fetch_twse_cash_dividend_events(start, end)
    payload = build_twse_dividend_cache_payload(
        events,
        anchor_year=anchor_year,
        window_years=window_years,
        start_date=start,
        end_date=end,
    )

    output_path = os.path.join(cache_dir, "twse_dividends", "latest.json")
    _atomic_json_write(output_path, payload)
    return payload
