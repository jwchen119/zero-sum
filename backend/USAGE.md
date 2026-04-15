# Stock Data Fetcher — Usage Guide

A Python CLI tool that fetches daily stock price data from Yahoo Finance, generates candlestick charts, and displays company fundamentals (revenue, profits, margins, EPS, dividends).

## Requirements

```bash
pip install yfinance pandas mplfinance matplotlib
```

## Basic Usage

```bash
python fetch_stock_data.py TICKER [TICKER ...] [options]
```

---

## Fetching Stock Prices

```bash
# Single ticker, default last 1 year
python fetch_stock_data.py AAPL

# Multiple tickers
python fetch_stock_data.py AAPL MSFT GOOG

# Custom date range
python fetch_stock_data.py AAPL --start 2025-01-01 --end 2025-12-31

# Shorthand period (1mo, 3mo, 6mo, 1y, 2y, 5y, max)
python fetch_stock_data.py AAPL --period 6mo

# Save data to CSV
python fetch_stock_data.py AAPL --period 1y -o aapl_prices.csv

# Multiple tickers to CSV
python fetch_stock_data.py AAPL MSFT GOOG --period 6mo -o stocks.csv
```

---

## Candlestick Charts

```bash
# Display candlestick chart in a window
python fetch_stock_data.py AAPL --period 6mo --chart

# Save chart to file
python fetch_stock_data.py AAPL --period 6mo --chart-save aapl_candle.png

# Use a different chart style (charles, yahoo, nightclouds, mike)
python fetch_stock_data.py AAPL --period 6mo --chart --chart-style nightclouds

# Multiple tickers — opens one chart per ticker
python fetch_stock_data.py AAPL MSFT --period 3mo --chart
```

Charts include:
- Candlestick OHLC bars
- Volume bars
- Moving averages (10/20/50 day, auto-adjusted to data length)

---

## Fundamentals (Text)

```bash
# Show key financial data for a ticker
python fetch_stock_data.py AAPL -f

# Short form
python fetch_stock_data.py AAPL --fundamentals

# Multiple tickers
python fetch_stock_data.py AAPL MSFT GOOG -f
```

Displays:
- Market cap
- Annual revenue, gross profit, operating income, net income
- Gross / operating / profit margins
- Trailing & forward P/E ratios, EPS
- Dividend rate, yield, payout ratio

---

## Fundamentals Charts

```bash
# Display annual fundamentals chart
python fetch_stock_data.py AAPL --fundamentals-chart

# Save to file
python fetch_stock_data.py AAPL --fundamentals-chart-save aapl_fundamentals.png

# Quarterly fundamentals chart
python fetch_stock_data.py AAPL --fundamentals-chart --quarterly

# Quarterly, short form
python fetch_stock_data.py AAPL -q --fundamentals-chart-save aapl_quarterly.png
```

4-panel chart:
1. **Revenue & Income** — grouped bar chart (Revenue, Gross Profit, Operating Income, Net Income)
2. **Profit Margins** — line chart (Gross, Operating, Net margins)
3. **EPS** — earnings per share over time
4. **Dividend History** — dividends per period + cumulative line + current yield

---

## Combining Options

```bash
# Full analysis: prices + fundamentals text + both charts
python fetch_stock_data.py AAPL --period 6mo -f --fundamentals-chart --chart

# Save everything
python fetch_stock_data.py AAPL --period 1y -o aapl.csv -f \
  --chart-save aapl_candle.png \
  --fundamentals-chart-save aapl_fund.png

# Quarterly fundamentals + candlestick chart
python fetch_stock_data.py AAPL --period 6mo -q --fundamentals-chart --chart
```

---

## CLI Reference

| Argument | Short | Description |
|---|---|---|
| `tickers` | | One or more ticker symbols (positional) |
| `--start` | | Start date (YYYY-MM-DD) |
| `--end` | | End date (YYYY-MM-DD) |
| `--period` | | Period shorthand: `1mo`, `3mo`, `6mo`, `1y`, `2y`, `5y`, `max` (default: `1y`) |
| `--output` | `-o` | Save price data to CSV |
| `--chart` | | Show candlestick chart window |
| `--chart-save` | | Save candlestick chart to image file |
| `--chart-style` | | Chart style: `charles`, `yahoo`, `nightclouds`, `mike` (default: `charles`) |
| `--fundamentals` | `-f` | Print revenue, profits, dividends & key ratios |
| `--fundamentals-chart` | | Show fundamentals chart window |
| `--fundamentals-chart-save` | | Save fundamentals chart to image file |
| `--quarterly` | `-q` | Use quarterly data for fundamentals chart |
