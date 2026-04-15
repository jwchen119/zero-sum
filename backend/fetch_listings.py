"""
Fetch TWSE listed company symbols from the official TWSE OpenAPI endpoint.

Usage:
    python fetch_listings.py
    python fetch_listings.py twse
"""

import json
import os
import ssl
import sys

import requests
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager

OUT_DIR = os.path.join(os.path.dirname(__file__), "cache", "listings")
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; zero-sum-bot/1.0)"}

TWSE_URL = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L"


class _TwseTLSAdapter(HTTPAdapter):
    """Keep certificate validation enabled but relax strict X.509 checks for TWSE."""

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
    # Avoid inheriting broken host proxy settings; opt-in via TWSE_TRUST_ENV=1.
    session.trust_env = os.environ.get("TWSE_TRUST_ENV", "0") == "1"
    session.headers.update(HEADERS)
    session.mount("https://openapi.twse.com.tw/", _TwseTLSAdapter())
    return session


def _get_first(item: dict, *keys: str) -> str:
    for key in keys:
        val = str(item.get(key, "")).strip()
        if val:
            return val
    return ""


def _fetch_twse_records_openapi() -> list[dict]:
    with _twse_session() as session:
        resp = session.get(TWSE_URL, timeout=20)
        resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, list):
        raise ValueError("TWSE OpenAPI returned non-list payload")
    return data


def fetch_twse() -> list[dict]:
    """Fetch TWSE listed companies and normalize to internal listing schema."""
    records = _fetch_twse_records_openapi()

    stocks: list[dict] = []
    for item in records:
        code = _get_first(item, "公司代號", "SecuritiesCompanyCode")
        if not code:
            continue

        name = _get_first(item, "公司簡稱", "公司名稱", "CompanyAbbreviation", "CompanyName")
        sector = _get_first(item, "產業別", "SecuritiesIndustryCode")
        stocks.append(
            {
                "symbol": f"{code}.TW",
                "name": name,
                "sector": sector,
                "market": "TWSE",
            }
        )

    stocks.sort(key=lambda x: x["symbol"])
    return stocks


def save(name: str, stocks: list[dict]) -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"count": len(stocks), "stocks": stocks}, f, indent=2, ensure_ascii=False)
    size_kb = os.path.getsize(path) / 1024
    print(f"  {name}: {len(stocks)} stocks ({size_kb:.0f} KB) -> {path}")


FETCHERS = {
    "twse": ("TWSE Listed", fetch_twse),
}


def main() -> None:
    targets = sys.argv[1:] if len(sys.argv) > 1 else ["twse"]
    for key in targets:
        if key not in FETCHERS:
            print(f"Unknown listing: {key}  (choices: {', '.join(FETCHERS)})")
            continue
        label, fetcher = FETCHERS[key]
        print(f"Fetching {label}...")
        try:
            stocks = fetcher()
            save(key, stocks)
        except Exception as exc:
            print(f"  ERROR: {exc}")
    print("Done.")


if __name__ == "__main__":
    main()
