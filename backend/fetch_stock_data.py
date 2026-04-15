"""
Stock Data Fetcher — MVP
Fetches daily stock price data from Yahoo Finance using yfinance + pandas.
"""

import argparse
import sys
from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
import mplfinance as mpf
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np


def _aggregate_candles(df: pd.DataFrame, n: int) -> pd.DataFrame:
    """Aggregate n intraday candles into one (e.g. 4 × 1h → 4h)."""
    df = df.copy()
    df.index = pd.to_datetime(df.index)
    agg = {
        "Open": "first",
        "High": "max",
        "Low": "min",
        "Close": "last",
        "Volume": "sum",
    }
    # Offset by 9.5h so 4h blocks align with US market open (9:30 ET)
    return df.resample(f"{n}h", offset="9h30min").agg(agg).dropna()


def fetch_daily_prices(
    ticker: str,
    start: str | None = None,
    end: str | None = None,
    period: str = "1y",
    interval: str = "1d",
) -> pd.DataFrame:
    """
    Download OHLCV data for a single ticker.

    Parameters
    ----------
    ticker : str
        Yahoo Finance ticker symbol (e.g. "AAPL", "MSFT").
    start : str | None
        Start date in YYYY-MM-DD format. If None, ``period`` is used instead.
    end : str | None
        End date in YYYY-MM-DD format. Defaults to today.
    period : str
        Shorthand period when start/end are not provided (e.g. "1mo", "6mo", "1y", "5y", "max").
    interval : str
        Candle interval: "15m", "1h", "4h", "1d".

    Returns
    -------
    pd.DataFrame
        DataFrame with columns: Date, Open, High, Low, Close, Volume.
    """
    stock = yf.Ticker(ticker)

    # Handle 4h by fetching 1h and aggregating
    aggregate = 1
    yf_interval = interval
    if interval == "4h":
        yf_interval = "1h"
        aggregate = 4

    # Clamp period for intraday limits
    if interval == "15m" and not start:
        period = "60d"
    elif interval in ("1h", "4h") and not start:
        period = "730d"

    if start:
        df = stock.history(start=start, end=end or datetime.now().strftime("%Y-%m-%d"), interval=yf_interval)
    else:
        df = stock.history(period=period, interval=yf_interval)

    if df.empty:
        print(f"WARNING: No data returned for '{ticker}'. Check the symbol or date range.")
        return pd.DataFrame()

    # Keep only the standard OHLCV columns and reset the index so Date becomes a column.
    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()

    if aggregate > 1:
        df = _aggregate_candles(df, aggregate)

    df.index = df.index.tz_localize(None)  # strip timezone for cleaner output
    df.index.name = "Date"
    df = df.reset_index()
    df.insert(0, "Ticker", ticker.upper())

    return df


def plot_candlestick(
    df: pd.DataFrame,
    ticker: str,
    volume: bool = True,
    style: str = "charles",
    savefig: str | None = None,
) -> None:
    """
    Plot a candlestick chart for a single ticker's OHLCV data.

    Parameters
    ----------
    df : pd.DataFrame
        DataFrame with columns: Date, Open, High, Low, Close, Volume.
    ticker : str
        Ticker symbol (used in the chart title).
    volume : bool
        Whether to show volume bars below the price chart.
    style : str
        mplfinance style (e.g. "charles", "yahoo", "nightclouds", "mike").
    savefig : str | None
        If provided, save the chart to this file path instead of displaying.
    """
    ohlcv = df[df["Ticker"] == ticker.upper()].copy()
    if ohlcv.empty:
        print(f"No data for {ticker} — skipping chart.")
        return

    ohlcv["Date"] = pd.to_datetime(ohlcv["Date"])
    ohlcv = ohlcv.set_index("Date")
    ohlcv = ohlcv[["Open", "High", "Low", "Close", "Volume"]]

    # Moving averages overlay
    mavs = ()
    if len(ohlcv) >= 20:
        mavs = (10, 20)
    if len(ohlcv) >= 50:
        mavs = (10, 20, 50)

    kwargs = dict(
        type="candle",
        style=style,
        title=f"{ticker.upper()} — Daily Candlestick",
        ylabel="Price (USD)",
        volume=volume,
        ylabel_lower="Volume",
        figscale=1.3,
        figratio=(16, 9),
        tight_layout=True,
    )
    if mavs:
        kwargs["mav"] = mavs
    if savefig:
        kwargs["savefig"] = savefig

    mpf.plot(ohlcv, **kwargs)
    if not savefig:
        print(f"Chart displayed for {ticker.upper()}.")
    else:
        print(f"Chart saved to {savefig}")


def _fmt(value, is_pct: bool = False) -> str:
    """Format a number for display — human-readable billions/millions or percentage."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "N/A"
    if is_pct:
        return f"{value * 100:.1f}%"
    abs_val = abs(value)
    if abs_val >= 1e9:
        return f"${value / 1e9:.2f}B"
    if abs_val >= 1e6:
        return f"${value / 1e6:.1f}M"
    return f"${value:,.0f}"


def fetch_fundamentals(ticker: str) -> dict:
    """
    Fetch basic financial fundamentals for a ticker:
    revenue, net income, profit margins, EPS, dividends, P/E ratio.

    Returns a dict with the data (suitable for printing or further processing).
    """
    stock = yf.Ticker(ticker)
    info = stock.info

    # --- Annual income statement (most recent year) ---
    financials = stock.financials  # annual, columns = fiscal year dates
    annual = {}
    if financials is not None and not financials.empty:
        latest_col = financials.columns[0]
        rows = financials[latest_col]
        annual["fiscal_year"] = str(latest_col.date()) if hasattr(latest_col, "date") else str(latest_col)
        annual["total_revenue"] = rows.get("Total Revenue")
        annual["gross_profit"] = rows.get("Gross Profit")
        annual["operating_income"] = rows.get("Operating Income") or rows.get("EBIT")
        annual["net_income"] = rows.get("Net Income")

    # --- Key ratios from info ---
    ratios = {
        "market_cap": info.get("marketCap"),
        "trailing_pe": info.get("trailingPE"),
        "forward_pe": info.get("forwardPE"),
        "profit_margin": info.get("profitMargins"),
        "operating_margin": info.get("operatingMargins"),
        "gross_margin": info.get("grossMargins"),
        "eps_trailing": info.get("trailingEps"),
        "eps_forward": info.get("forwardEps"),
        "dividend_rate": info.get("dividendRate"),
        "dividend_yield": info.get("dividendYield"),
        "payout_ratio": info.get("payoutRatio"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "name": info.get("shortName") or info.get("longName") or ticker.upper(),
    }

    return {"ticker": ticker.upper(), "annual": annual, "ratios": ratios}


def print_fundamentals(data: dict) -> None:
    """Pretty-print fundamentals data to the terminal."""
    r = data["ratios"]
    a = data["annual"]
    ticker = data["ticker"]

    print(f"\n{'='*60}")
    print(f"  {r.get('name', ticker)}  ({ticker})")
    print(f"  {r.get('sector', 'N/A')} · {r.get('industry', 'N/A')}")
    print(f"{'='*60}")

    print(f"  Market Cap:        {_fmt(r.get('market_cap'))}")

    if a:
        print(f"\n  --- Annual Financials ({a.get('fiscal_year', '?')}) ---")
        print(f"  Revenue:           {_fmt(a.get('total_revenue'))}")
        print(f"  Gross Profit:      {_fmt(a.get('gross_profit'))}")
        print(f"  Operating Income:  {_fmt(a.get('operating_income'))}")
        print(f"  Net Income:        {_fmt(a.get('net_income'))}")

    print(f"\n  --- Margins ---")
    print(f"  Gross Margin:      {_fmt(r.get('gross_margin'), is_pct=True)}")
    print(f"  Operating Margin:  {_fmt(r.get('operating_margin'), is_pct=True)}")
    print(f"  Profit Margin:     {_fmt(r.get('profit_margin'), is_pct=True)}")

    print(f"\n  --- Valuation ---")
    pe_t = r.get('trailing_pe')
    pe_f = r.get('forward_pe')
    print(f"  Trailing P/E:      {f'{pe_t:.1f}' if pe_t else 'N/A'}")
    print(f"  Forward P/E:       {f'{pe_f:.1f}' if pe_f else 'N/A'}")
    print(f"  EPS (trailing):    {f'${r["eps_trailing"]:.2f}' if r.get('eps_trailing') else 'N/A'}")
    print(f"  EPS (forward):     {f'${r["eps_forward"]:.2f}' if r.get('eps_forward') else 'N/A'}")

    print(f"\n  --- Dividends ---")
    div_rate = r.get('dividend_rate')
    div_yield = r.get('dividend_yield')
    payout = r.get('payout_ratio')
    print(f"  Dividend Rate:     {f'${div_rate:.2f}/share' if div_rate else 'None'}")
    print(f"  Dividend Yield:    {_fmt(div_yield, is_pct=True) if div_yield else 'None'}")
    print(f"  Payout Ratio:      {_fmt(payout, is_pct=True) if payout else 'N/A'}")
    print()


def _build_financials_df(ticker: str, quarterly: bool = False) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """
    Build tidy DataFrames of income-statement data and dividend history.

    Parameters
    ----------
    ticker : str
    quarterly : bool
        If True, use quarterly financials; otherwise annual.

    Returns
    -------
    (financials_df, dividends_df, info_dict)
    """
    stock = yf.Ticker(ticker)
    info = stock.info
    fin = stock.quarterly_financials if quarterly else stock.financials

    # --- Income statement ---
    fin_df = pd.DataFrame()
    if fin is not None and not fin.empty:
        records = []
        for col in reversed(fin.columns):  # oldest → newest
            if quarterly:
                label = col.strftime("%Y-Q") + str((col.month - 1) // 3 + 1) if hasattr(col, "strftime") else str(col)[:7]
                # Nicer: "2025-Q1"
                label = f"{col.year}-Q{(col.month - 1) // 3 + 1}" if hasattr(col, "year") else str(col)[:7]
            else:
                label = col.strftime("%Y") if hasattr(col, "strftime") else str(col)[:4]
            row = fin[col]
            records.append({
                "Period": label,
                "Revenue": row.get("Total Revenue"),
                "Gross Profit": row.get("Gross Profit"),
                "Operating Income": row.get("Operating Income") or row.get("EBIT"),
                "Net Income": row.get("Net Income"),
            })
        fin_df = pd.DataFrame(records)

        # Compute margins
        for col_name, num_col in [("Gross Margin", "Gross Profit"),
                                   ("Operating Margin", "Operating Income"),
                                   ("Net Margin", "Net Income")]:
            fin_df[col_name] = fin_df.apply(
                lambda r: (r[num_col] / r["Revenue"] * 100)
                if pd.notna(r.get("Revenue")) and r.get("Revenue") and pd.notna(r.get(num_col))
                else None,
                axis=1,
            )

    # --- EPS from income statement (Net Income / shares outstanding) ---
    shares = info.get("sharesOutstanding")
    if not fin_df.empty and shares:
        fin_df["EPS"] = fin_df["Net Income"].apply(
            lambda ni: ni / shares if pd.notna(ni) else None
        )
    elif not fin_df.empty:
        fin_df["EPS"] = None

    # --- Dividend history ---
    div_df = pd.DataFrame()
    try:
        dividends = stock.dividends
        if dividends is not None and not dividends.empty:
            div_df = dividends.reset_index()
            div_df.columns = ["Date", "Dividend"]
            div_df["Date"] = pd.to_datetime(div_df["Date"]).dt.tz_localize(None)
            # Aggregate by year or quarter
            if quarterly:
                div_df["Period"] = div_df["Date"].apply(lambda d: f"{d.year}-Q{(d.month - 1) // 3 + 1}")
            else:
                div_df["Period"] = div_df["Date"].dt.strftime("%Y")
            div_df = div_df.groupby("Period", sort=True).agg(
                Total_Dividend=("Dividend", "sum"),
                Payments=("Dividend", "count"),
            ).reset_index()
    except Exception:
        pass

    return fin_df, div_df, info


def plot_fundamentals(
    ticker: str,
    quarterly: bool = False,
    savefig: str | None = None,
) -> None:
    """
    Create a 4-panel fundamentals chart:
      1. Revenue / Gross Profit / Operating Income / Net Income  (bar chart)
      2. Margins over time  (line chart)
      3. EPS over time  (bar chart)
      4. Dividends over time  (bar chart + cumulative line)
    """
    fin_df, div_df, info = _build_financials_df(ticker, quarterly=quarterly)
    if fin_df.empty:
        print(f"No financial data for {ticker} — skipping chart.")
        return

    name = info.get("shortName") or info.get("longName") or ticker.upper()
    freq_label = "Quarterly" if quarterly else "Annual"
    periods = fin_df["Period"].tolist()
    x = np.arange(len(periods))
    bar_w = 0.2

    fig, axes = plt.subplots(4, 1, figsize=(14, 18), gridspec_kw={"height_ratios": [3, 2, 2, 2]})
    fig.suptitle(f"{name} ({ticker.upper()}) — {freq_label} Fundamentals",
                 fontsize=16, fontweight="bold", y=0.99)

    # ───── Panel 1: Revenue & Income bars ─────
    ax1 = axes[0]
    metrics = [
        ("Revenue", "#2196F3"),
        ("Gross Profit", "#4CAF50"),
        ("Operating Income", "#FF9800"),
        ("Net Income", "#9C27B0"),
    ]
    for i, (col, color) in enumerate(metrics):
        vals = fin_df[col].fillna(0).values / 1e9
        ax1.bar(x + i * bar_w, vals, bar_w, label=col, color=color, edgecolor="white", linewidth=0.5)

    ax1.set_xticks(x + bar_w * 1.5)
    ax1.set_xticklabels(periods, fontsize=9, rotation=45 if quarterly else 0, ha="right" if quarterly else "center")
    ax1.set_ylabel("USD (Billions)", fontsize=11)
    ax1.set_title("Revenue & Income", fontsize=13, pad=10)
    ax1.legend(loc="upper left", fontsize=9)
    ax1.grid(axis="y", alpha=0.3)
    ax1.yaxis.set_major_formatter(mticker.FormatStrFormatter("$%.0fB"))

    # ───── Panel 2: Margins line chart ─────
    ax2 = axes[1]
    margin_cols = [
        ("Gross Margin", "#4CAF50", "o"),
        ("Operating Margin", "#FF9800", "s"),
        ("Net Margin", "#9C27B0", "D"),
    ]
    for col, color, marker in margin_cols:
        vals = fin_df[col].values
        ax2.plot(periods, vals, color=color, marker=marker, linewidth=2, markersize=6, label=col)
        for xi, v in enumerate(vals):
            if pd.notna(v):
                ax2.annotate(f"{v:.1f}%", (periods[xi], v), textcoords="offset points",
                             xytext=(0, 10), ha="center", fontsize=7, color=color)

    ax2.set_ylabel("Margin (%)", fontsize=11)
    ax2.set_title("Profit Margins", fontsize=13, pad=10)
    ax2.legend(loc="upper left", fontsize=9)
    ax2.grid(axis="y", alpha=0.3)
    ax2.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f%%"))
    if quarterly:
        ax2.tick_params(axis="x", rotation=45, labelsize=9)

    # ───── Panel 3: EPS over time ─────
    ax3 = axes[2]
    if "EPS" in fin_df.columns and fin_df["EPS"].notna().any():
        eps_vals = fin_df["EPS"].fillna(0).values
        bar_colors = ["#2196F3" if v >= 0 else "#F44336" for v in eps_vals]
        ax3.bar(periods, eps_vals, color=bar_colors, width=0.5, edgecolor="white", linewidth=0.5)
        for xi, v in enumerate(eps_vals):
            if v != 0:
                ax3.text(xi, v + (0.05 * max(abs(eps_vals))), f"${v:.2f}",
                         ha="center", fontsize=8, fontweight="bold")
        ax3.set_ylabel("USD / Share", fontsize=11)
        ax3.set_title("Earnings Per Share (EPS)", fontsize=13, pad=10)
        ax3.axhline(y=0, color="gray", linewidth=0.5)
    else:
        # Fallback: show latest snapshot
        eps_t = info.get("trailingEps")
        eps_f = info.get("forwardEps")
        labels, values, colors = [], [], []
        if eps_t is not None:
            labels.append("Trailing"); values.append(eps_t); colors.append("#2196F3")
        if eps_f is not None:
            labels.append("Forward"); values.append(eps_f); colors.append("#03A9F4")
        if labels:
            ax3.bar(labels, values, color=colors, width=0.4)
            for xi, v in enumerate(values):
                ax3.text(xi, v + 0.1, f"${v:.2f}", ha="center", fontsize=10, fontweight="bold")
        ax3.set_ylabel("USD / Share", fontsize=11)
        ax3.set_title("Earnings Per Share (Latest)", fontsize=13, pad=10)
    ax3.grid(axis="y", alpha=0.3)
    if quarterly:
        ax3.tick_params(axis="x", rotation=45, labelsize=9)

    # ───── Panel 4: Dividends ─────
    ax4 = axes[3]
    if not div_df.empty:
        # Limit to same time range as financials if possible
        div_periods = div_df["Period"].tolist()
        div_vals = div_df["Total_Dividend"].values
        div_counts = div_df["Payments"].values

        ax4.bar(div_periods, div_vals, color="#E91E63", width=0.5, edgecolor="white",
                linewidth=0.5, label="Dividend / Period")
        for xi, (v, cnt) in enumerate(zip(div_vals, div_counts)):
            ax4.text(xi, v + 0.01 * max(div_vals), f"${v:.2f}\n({int(cnt)}x)",
                     ha="center", fontsize=7, fontweight="bold")

        # Cumulative line on secondary axis
        ax4b = ax4.twinx()
        cumulative = np.cumsum(div_vals)
        ax4b.plot(div_periods, cumulative, color="#880E4F", marker="o", linewidth=2,
                  markersize=5, label="Cumulative", linestyle="--")
        ax4b.set_ylabel("Cumulative (USD)", fontsize=10, color="#880E4F")
        ax4b.tick_params(axis="y", colors="#880E4F")

        # Annotate current yield
        div_yield = info.get("dividendYield")
        if div_yield is not None:
            ax4.annotate(f"Current Yield: {div_yield * 100:.2f}%",
                         xy=(0.98, 0.95), xycoords="axes fraction",
                         ha="right", va="top", fontsize=10,
                         bbox=dict(boxstyle="round,pad=0.3", fc="#FCE4EC", ec="#E91E63", alpha=0.8))

        ax4.set_ylabel("Dividend (USD/share)", fontsize=11)
        ax4.set_title("Dividend History", fontsize=13, pad=10)
        ax4.legend(loc="upper left", fontsize=9)
        ax4b.legend(loc="upper left", fontsize=9, bbox_to_anchor=(0.0, 0.85))
    else:
        ax4.text(0.5, 0.5, "No dividend history available", transform=ax4.transAxes,
                 ha="center", va="center", fontsize=12, color="gray")
        ax4.set_title("Dividend History", fontsize=13, pad=10)
    ax4.grid(axis="y", alpha=0.3)
    if quarterly or (not div_df.empty and len(div_df) > 8):
        ax4.tick_params(axis="x", rotation=45, labelsize=8)

    plt.tight_layout(rect=[0, 0, 1, 0.97])

    if savefig:
        fig.savefig(savefig, dpi=150, bbox_inches="tight")
        print(f"Fundamentals chart saved to {savefig}")
    else:
        plt.show()
        print(f"Fundamentals chart displayed for {ticker.upper()}.")
    plt.close(fig)


def fetch_multiple(
    tickers: list[str],
    start: str | None = None,
    end: str | None = None,
    period: str = "1y",
) -> pd.DataFrame:
    """Fetch daily data for multiple tickers and concatenate into one DataFrame."""
    frames = []
    for t in tickers:
        print(f"Fetching {t} …")
        df = fetch_daily_prices(t, start=start, end=end, period=period)
        if not df.empty:
            frames.append(df)
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch daily stock prices from Yahoo Finance")
    parser.add_argument("tickers", nargs="+", help="One or more ticker symbols (e.g. AAPL MSFT GOOG)")
    parser.add_argument("--start", default=None, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", default=None, help="End date (YYYY-MM-DD)")
    parser.add_argument("--period", default="5y", help="Period if no start/end (default: 5y)")
    parser.add_argument("--output", "-o", default=None, help="Save to CSV file path")
    parser.add_argument("--chart", action="store_true", help="Show candlestick chart(s)")
    parser.add_argument("--chart-save", default=None, help="Save chart image to file (single ticker only)")
    parser.add_argument("--chart-style", default="charles", help="Chart style: charles, yahoo, nightclouds, mike (default: charles)")
    parser.add_argument("--fundamentals", "-f", action="store_true", help="Show revenue, profits, dividends & key ratios")
    parser.add_argument("--fundamentals-chart", action="store_true", help="Show fundamentals chart(s)")
    parser.add_argument("--fundamentals-chart-save", default=None, help="Save fundamentals chart to file")
    parser.add_argument("--quarterly", "-q", action="store_true", help="Use quarterly data for fundamentals chart")
    args = parser.parse_args()

    df = fetch_multiple(args.tickers, start=args.start, end=args.end, period=args.period)

    if df.empty:
        print("No data fetched.")
        sys.exit(1)

    # Print summary
    print(f"\n{'='*60}")
    print(f"Fetched {len(df)} rows for {df['Ticker'].nunique()} ticker(s)")
    print(f"Date range: {df['Date'].min().date()} → {df['Date'].max().date()}")
    print(f"{'='*60}")
    print(df.head(10).to_string(index=False))
    print("…")

    if args.output:
        df.to_csv(args.output, index=False)
        print(f"\nSaved to {args.output}")

    # Fundamentals
    if args.fundamentals:
        for ticker in args.tickers:
            print(f"\nFetching fundamentals for {ticker} …")
            data = fetch_fundamentals(ticker)
            print_fundamentals(data)

    # Fundamentals charts
    if args.fundamentals_chart or args.fundamentals_chart_save:
        for ticker in args.tickers:
            save_path = args.fundamentals_chart_save if len(args.tickers) == 1 else None
            plot_fundamentals(ticker, quarterly=args.quarterly, savefig=save_path)

    # Candlestick charts
    if args.chart or args.chart_save:
        for ticker in args.tickers:
            save_path = args.chart_save if len(args.tickers) == 1 else None
            plot_candlestick(df, ticker, style=args.chart_style, savefig=save_path)


if __name__ == "__main__":
    main()
