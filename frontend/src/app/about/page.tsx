"use client";

import Link from "next/link";
import Image from "next/image";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, T2, TM,
  serif, display, mono, sans,
  Hair, HeavyRule,
} from "@/lib/wsj";

interface Feature {
  title: string;
  description: string;
  image: string;
  href: string;
}

const FEATURES: Feature[] = [
  {
    title: "Fundamental Analysis",
    description:
      "Dive deep into any stock with a full-page breakdown: price history with moving averages, company profile, cash & debt overview, balance sheet visualizations (assets vs. liabilities vs. equity), ratings snapshot radar, and cash vs. debt trends. Key metrics \u2014 market cap, P/E, P/S, beta, dividend yield, 52-week range, and average volume \u2014 are displayed at a glance.",
    image: "/about/fundamental_analysis.png",
    href: "/stocks/AAPL",
  },
  {
    title: "Landing Page & Market Dashboard",
    description:
      "The home page provides a real-time market overview for Taiwan: key benchmarks (TAIEX, Taiwan 50 ETFs), FX and commodity references, a color-coded sector proxy heatmap, top market movers (gainers, losers, most active), curated market news, and an upcoming earnings calendar.",
    image: "/about/landing_page.png",
    href: "/",
  },
  {
    title: "Advanced Charting Terminal",
    description:
      "A professional-grade charting terminal with TradingView-powered interactive charts, multiple timeframes (intraday to 5Y), and extensive customization. Toggle chart types (Heikin Ashi, candlestick), overlays (Bollinger Bands, EMA, Ichimoku, VWAP, Fibonacci, SAR), structure tools (trendlines, ranges, volume profile, FVG), and studies (RSI, MACD, Stochastic, OBV, ADX/DMI, Williams %R, CCI). Includes drawing tools, chart presets, data export, and replay mode.",
    image: "/about/advanced_charting.png",
    href: "/chart",
  },
  {
    title: "Technical Analysis & Setup Detection",
    description:
      "Automated technical analysis with an AI-generated scoring dashboard. Provides a composite BUY/SELL score, indicator scorecard (RSI, MACD, Bollinger %B, Stochastic, EMA), key price levels (stop-loss, SAR trailing stop, SMA, Fibonacci retracements, support/resistance), and contextual commentary on trend direction, momentum, and volatility. Compare performance against Taiwan benchmark ETFs at a glance.",
    image: "/about/technical_analysis.png",
    href: "/technical",
  },
  {
    title: "Market Heatmap",
    description:
      "An interactive treemap visualization of Taiwan stocks, sized by market cap and colored by daily performance. Filter by TWSE, switch between time periods (1D, 1W, 1M, YTD) and chart ranges (3M-5Y), group by sector or view flat, filter by sector, and search for any ticker. Toggle between map, sector summary, and table views.",
    image: "/about/market_heatmap.png",
    href: "/heatmap",
  },
  {
    title: "Watchlist",
    description:
      "A personalized watchlist with grid and chart views. Each card shows a TradingView price chart with moving average overlays, a revenue & profit mini-chart (net income, margin trend, revenue bars), and a dividend history chart with yield and growth indicators. Toggle visibility layers (MA, Revenue, Dividends), switch time periods, and manage tickers. A persistent sidebar tracks real-time prices and daily changes.",
    image: "/about/watchlist_grid.png",
    href: "/watchlist",
  },
  {
    title: "Stock Comparison",
    description:
      "Compare any set of stocks side by side. Summary cards show price, YTD/1Y performance, 52-week range, and sector/industry. Includes a normalized price chart (rebased to 100) for direct performance comparison, a multi-period return table (1M through 5Y), a fundamentals radar chart (profit margin, operating margin, gross margin, ROE, ROA, liquidity), and a risk vs. return scatter plot.",
    image: "/about/stock_comparison.png",
    href: "/compare",
  },
  {
    title: "Sector Analysis",
    description:
      "Cross-sector correlation analysis across Taiwan market sector groups. Features a color-coded correlation matrix showing how sectors move together, with cap-weighted and equal-weighted views over 3M-5Y windows. Includes normalized sector performance charts (rebased to $100) to visualize cumulative returns, helping identify diversification opportunities and hedging strategies.",
    image: "/about/sector_correlation.png",
    href: "/sector-analysis",
  },
  {
    title: "Sector Hexagonal Density Plot",
    description:
      "An interactive hexbin scatter plot showing daily return correlations between any two sectors. Pairs are categorized by correlation strength (strong positive, moderate, weak, near zero) and selected via the correlation matrix or quick-pick buttons. Displays regression line, R\u00b2 value, and data point count \u2014 useful for visualizing sector co-movement patterns and tail-risk events.",
    image: "/about/correlation_analysis.png",
    href: "/correlation",
  },
];

const TECH_STACK = [
  { layer: "Frontend", tech: "Next.js 16, React 19, TypeScript, Tailwind CSS" },
  { layer: "Backend", tech: "Python 3, Flask 3, pandas, NumPy, yfinance" },
  { layer: "Charts", tech: "TradingView Lightweight Charts, Recharts, D3.js" },
  { layer: "Data", tech: "Yahoo Finance API, batch caching, scheduled updates" },
  { layer: "Infrastructure", tech: "Docker, Docker Compose, Nginx reverse proxy" },
];

export default function AboutPage() {
  return (
    <WSJLayout wideContent>
      <div className="mx-auto max-w-[960px] px-6 py-10">
        <div className="mb-8 text-center">
          <p
            className="mb-2 text-[13px] uppercase tracking-[0.25em]"
            style={{ fontFamily: sans, color: TM }}
          >
            Platform Overview
          </p>
          <h1
            className="mb-3 text-[36px] leading-tight md:text-[48px]"
            style={{ fontFamily: display, color: INK }}
          >
            The Zero Sum Times
          </h1>
          <p
            className="mx-auto max-w-[640px] text-[15px] leading-relaxed"
            style={{ fontFamily: serif, color: T2 }}
          >
            A comprehensive, Wall Street Journal-inspired stock market analysis platform.
            Real-time quotes, interactive charting, fundamental analysis, sector correlations,
            and more {"\u2014"} all in one place.
          </p>
        </div>

        <HeavyRule />

        {FEATURES.map((feature, idx) => (
          <section key={feature.title} className="py-8">
            <div className="mb-2 flex items-baseline gap-3">
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ fontFamily: mono, color: TM }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <h2
                className="text-[22px] leading-tight md:text-[26px]"
                style={{ fontFamily: display, color: INK }}
              >
                {feature.title}
              </h2>
            </div>

            <Hair />

            <p
              className="mb-5 mt-3 text-[13px] leading-relaxed"
              style={{ fontFamily: serif, color: T2 }}
            >
              {feature.description}
            </p>

            <Link href={feature.href} className="group block">
              <div
                className="overflow-hidden border transition-shadow group-hover:shadow-lg"
                style={{ borderColor: GRY, borderRadius: 2 }}
              >
                <Image
                  src={feature.image}
                  alt={feature.title}
                  width={960}
                  height={540}
                  className="h-auto w-full"
                  style={{ display: "block" }}
                />
              </div>
              <p
                className="mt-2 text-[10px] uppercase tracking-[0.12em] group-hover:underline"
                style={{ fontFamily: sans, color: TM }}
              >
                Open {feature.title} {"\u2192"}
              </p>
            </Link>

            {idx < FEATURES.length - 1 && (
              <div className="mt-8">
                <Hair />
              </div>
            )}
          </section>
        ))}

        <div className="py-8">
          <HeavyRule />
          <h2
            className="mb-4 mt-4 text-[22px]"
            style={{ fontFamily: display, color: INK }}
          >
            Tech Stack
          </h2>
          <table className="w-full border-collapse text-[12px]" style={{ fontFamily: mono }}>
            <thead>
              <tr>
                <th
                  className="border-b px-3 py-2 text-left"
                  style={{
                    fontFamily: sans,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: TM,
                    borderColor: GRY,
                  }}
                >
                  Layer
                </th>
                <th
                  className="border-b px-3 py-2 text-left"
                  style={{
                    fontFamily: sans,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: TM,
                    borderColor: GRY,
                  }}
                >
                  Technology
                </th>
              </tr>
            </thead>
            <tbody>
              {TECH_STACK.map((row, i) => (
                <tr key={row.layer} style={{ background: i % 2 === 0 ? "transparent" : WHT }}>
                  <td
                    className="border-b px-3 py-2 font-bold"
                    style={{ color: INK, borderColor: `${GRY}66` }}
                  >
                    {row.layer}
                  </td>
                  <td
                    className="border-b px-3 py-2"
                    style={{ color: T2, borderColor: `${GRY}66` }}
                  >
                    {row.tech}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Hair />
        <p
          className="mt-3 pb-4 text-center text-[10px]"
          style={{ fontFamily: serif, color: TM }}
        >
          {"Data sourced from Yahoo Finance \u2014 Updated periodically \u2014 Not financial advice"}
        </p>
      </div>
    </WSJLayout>
  );
}
