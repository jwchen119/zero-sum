"use client";

import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, BLU, RED, TM,
  serif, mono, sans,
  WSJSection, Hair,
} from "@/lib/wsj";

/* ── Route catalogue ── */

interface RouteEntry {
  href: string;
  label: string;
  desc: string;
  tag?: "prod" | "dev" | "prototype" | "dynamic";
}

const MAIN_ROUTES: RouteEntry[] = [
  { href: "/",             label: "Home",         desc: "Landing page — market summary, sector perf, movers, earnings, news", tag: "prod" },
  { href: "/heatmap",      label: "Heatmap",      desc: "TWSE treemap by market cap with sparkline tooltips",                   tag: "prod" },
  { href: "/bubble",       label: "Bubble Map",   desc: "Circle-packed force-directed market overview",                        tag: "prod" },
  { href: "/screener-v4",  label: "Screener v4",  desc: "Tabular screener — sortable columns, fundamentals, ★ watchlist",      tag: "prod" },
  { href: "/watchlist",    label: "Watchlist",     desc: "Personal watchlist — grid & chart views, localStorage-backed",        tag: "prod" },
  { href: "/screener",     label: "Charts (v1)",   desc: "Multi-stock mini chart grid with candlestick + overlays",             tag: "prod" },
  { href: "/screener-v2",  label: "Screener v2",  desc: "Earlier screener iteration",                                          tag: "dev" },
  { href: "/screener-v3",  label: "Screener v3",  desc: "Multi-chart screener with focus view, prev/next navigation",          tag: "dev" },
  { href: "/sectors",      label: "Sectors",       desc: "Sector overview — industry breakdown, market cap, key metrics",        tag: "prod" },
  { href: "/dividends",    label: "Dividends",     desc: "Dividend screener — yield, payout ratio, ex-div dates, filters",       tag: "prod" },
  { href: "/compare",      label: "Compare",       desc: "Stock comparison — normalized price chart, fundamentals table",        tag: "prod" },
  { href: "/financials?ticker=AAPL", label: "Financials", desc: "Financial statements — income, balance sheet, cash flow with YoY growth", tag: "prod" },
];

const DYNAMIC_ROUTES: RouteEntry[] = [
  { href: "/stocks/AAPL",  label: "/stocks/[ticker]",    desc: "Individual stock page — candlestick chart, company profile, AI analysis", tag: "dynamic" },
  { href: "/sectors/Technology", label: "/sectors/[sector]", desc: "Sector detail — industry accordion, all stocks table",                    tag: "dynamic" },
  { href: "/stocks/MSFT",  label: "  → MSFT",         desc: "Microsoft",                                                               tag: "dynamic" },
  { href: "/stocks/GOOG",  label: "  → GOOG",         desc: "Alphabet",                                                                tag: "dynamic" },
  { href: "/stocks/AMZN",  label: "  → AMZN",         desc: "Amazon",                                                                  tag: "dynamic" },
  { href: "/stocks/NVDA",  label: "  → NVDA",         desc: "NVIDIA",                                                                  tag: "dynamic" },
  { href: "/stocks/TSLA",  label: "  → TSLA",         desc: "Tesla",                                                                   tag: "dynamic" },
  { href: "/stocks/META",  label: "  → META",         desc: "Meta Platforms",                                                           tag: "dynamic" },
  { href: "/stocks/JPM",   label: "  → JPM",          desc: "JPMorgan Chase",                                                           tag: "dynamic" },
];

const PROTOTYPE_ROUTES: RouteEntry[] = [
  { href: "/prototype",                         label: "Prototype Index",      desc: "Style gallery — all prototype themes listed",                  tag: "prototype" },
  { href: "/prototype/style-01-bloomberg",       label: "Bloomberg Terminal",   desc: "Dark pro, neon amber/green, monospace",                        tag: "prototype" },
  { href: "/prototype/style-08-neumorphism",     label: "Neumorphism",          desc: "Soft shadows, embossed cards",                                 tag: "prototype" },
  { href: "/prototype/style-08a-dark-neu",       label: "Dark Neumorphism",     desc: "Dark variant of neumorphic style",                             tag: "prototype" },
  { href: "/prototype/style-08b-warm-neu",       label: "Warm Neumorphism",     desc: "Warm-toned neumorphic variant",                                tag: "prototype" },
  { href: "/prototype/style-08c-clay-neu",       label: "Clay Neumorphism",     desc: "Clay/pastel neumorphic variant",                               tag: "prototype" },
  { href: "/prototype/style-10-material",        label: "Material Design",      desc: "Google Material palette and elevation",                        tag: "prototype" },
  { href: "/prototype/style-11-aurora",          label: "Aurora",               desc: "Northern lights gradient theme",                               tag: "prototype" },
  { href: "/prototype/style-12-newspaper",       label: "Newspaper",            desc: "Classic newspaper broadsheet layout",                          tag: "prototype" },
  { href: "/prototype/style-12a-victorian",      label: "Victorian",            desc: "Ornate Victorian-era typography",                              tag: "prototype" },
  { href: "/prototype/style-12b-art-deco",       label: "Art Deco",             desc: "1920s Art Deco geometric style",                               tag: "prototype" },
  { href: "/prototype/style-12c-pink-sheet",     label: "Pink Sheet",           desc: "OTC pink sheet aesthetic",                                     tag: "prototype" },
  { href: "/prototype/style-12d-wsj-hedcut",     label: "WSJ Hedcut",           desc: "Wall Street Journal stipple portrait style",                   tag: "prototype" },
  { href: "/prototype/style-12e-ticker-tape",    label: "Ticker Tape",          desc: "Vintage ticker tape / stock exchange",                         tag: "prototype" },
  { href: "/prototype/style-12f-swiss-nzz",      label: "Swiss NZZ",            desc: "Clean Swiss International typography",                         tag: "prototype" },
  { href: "/prototype/style-12g-classified",     label: "Classified",           desc: "Classified ads / small-print layout",                          tag: "prototype" },
  { href: "/prototype/style-12h-letterpress",    label: "Letterpress",          desc: "Deep impression letterpress printing",                         tag: "prototype" },
  { href: "/prototype/style-12i-nikkei",         label: "Nikkei",               desc: "Japanese Nikkei newspaper style",                              tag: "prototype" },
  { href: "/prototype/style-12j-microfiche",     label: "Microfiche",           desc: "Archival microfiche / microfilm look",                         tag: "prototype" },
];

const API_ROUTES = [
  { path: "/api/prices?ticker=AAPL&period=5y",     desc: "Single stock OHLCV price data" },
  { path: "/api/bulk-prices",                        desc: "Bulk price data (POST tickers + period)" },
  { path: "/api/bulk-fundamentals",                  desc: "Bulk fundamentals (POST tickers)" },
  { path: "/api/heatmap?index=twse&period=1d",       desc: "Heatmap data — TWSE treemap feed" },
  { path: "/api/screener",                           desc: "Screener — paginated, sortable stock list" },
  { path: "/api/market-summary",                     desc: "Market summary indices" },
  { path: "/api/sector-performance",                 desc: "Sector performance data" },
  { path: "/api/market-movers",                      desc: "Top gainers, losers, most active" },
  { path: "/api/earnings-calendar",                  desc: "Upcoming earnings dates" },
  { path: "/api/market-news",                        desc: "Latest market news headlines" },
  { path: "/api/coverage-tickers",                   desc: "Available tickers in coverage" },
  { path: "/api/etf-overview",                       desc: "ETF overview data" },
  { path: "/api/generate?ticker=AAPL",               desc: "LLM-generated stock analysis" },
  { path: "/api/stock-detail/AAPL",                   desc: "Combined stock detail (prices, financials, holders…)" },
  { path: "/api/sectors",                              desc: "Sector overview aggregations" },
  { path: "/api/sectors/Technology",                   desc: "Sector detail with industry breakdown" },
  { path: "/api/dividend-screener",                    desc: "Dividend screener with filters" },
  { path: "/api/financials/AAPL",                      desc: "Financial statements (income, balance, cashflow)" },
  { path: "/api/compare?tickers=AAPL,MSFT",            desc: "Stock comparison — normalized prices + fundamentals" },
];

const TAG_COLORS: Record<string, { bg: string; fg: string }> = {
  prod:      { bg: "#2d6a4f", fg: "#fff" },
  dev:       { bg: "#7f5539", fg: "#fff" },
  prototype: { bg: "#6c567b", fg: "#fff" },
  dynamic:   { bg: "#457b9d", fg: "#fff" },
};

function Tag({ tag }: { tag: string }) {
  const c = TAG_COLORS[tag] || { bg: GRY, fg: INK };
  return (
    <span
      className="inline-block px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.1em] rounded-sm"
      style={{ fontFamily: mono, background: c.bg, color: c.fg }}
    >
      {tag}
    </span>
  );
}

function RouteTable({ routes }: { routes: RouteEntry[] }) {
  return (
    <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${INK}` }}>
          <th className="py-1.5 pr-3 text-[9px] font-extrabold uppercase tracking-[0.15em]"
              style={{ fontFamily: sans, color: TM, width: "20%" }}>Route</th>
          <th className="py-1.5 pr-3 text-[9px] font-extrabold uppercase tracking-[0.15em]"
              style={{ fontFamily: sans, color: TM, width: "10%" }}>Tag</th>
          <th className="py-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em]"
              style={{ fontFamily: sans, color: TM }}>Description</th>
        </tr>
      </thead>
      <tbody>
        {routes.map((r) => (
          <tr key={r.href} className="group" style={{ borderBottom: `1px solid ${GRY}66` }}>
            <td className="py-1.5 pr-3">
              <Link
                href={r.href}
                className="text-[11px] font-bold hover:underline"
                style={{ fontFamily: mono, color: INK }}
              >
                {r.label}
              </Link>
            </td>
            <td className="py-1.5 pr-3">
              {r.tag && <Tag tag={r.tag} />}
            </td>
            <td className="py-1.5 text-[10px]" style={{ fontFamily: serif, color: TM }}>
              {r.desc}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function SitemapDevPage() {
  const navContent = (
    <div className="flex items-center gap-3">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
        Home
      </Link>
      <Link href="/watchlist" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
        Watchlist
      </Link>
      <Link href="/heatmap" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
        Heatmap
      </Link>
      <Link href="/screener-v4" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
        Screener
      </Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <WSJSection title="Developer Sitemap" />

      <p className="text-[11px] mb-5" style={{ fontFamily: serif, color: TM }}>
        Complete index of all routes, pages, and API endpoints.
        Tags: <Tag tag="prod" /> production &nbsp; <Tag tag="dev" /> development &nbsp;
        <Tag tag="prototype" /> prototype &nbsp; <Tag tag="dynamic" /> dynamic
      </p>

      {/* ── Main Pages ── */}
      <h3
        className="text-[11px] font-extrabold uppercase tracking-[0.15em] mt-6 mb-2"
        style={{ fontFamily: sans, color: INK }}
      >
        Main Pages
      </h3>
      <Hair />
      <RouteTable routes={MAIN_ROUTES} />

      {/* ── Dynamic Routes ── */}
      <h3
        className="text-[11px] font-extrabold uppercase tracking-[0.15em] mt-8 mb-2"
        style={{ fontFamily: sans, color: INK }}
      >
        Dynamic Routes
      </h3>
      <Hair />
      <RouteTable routes={DYNAMIC_ROUTES} />

      {/* ── Prototype Styles ── */}
      <h3
        className="text-[11px] font-extrabold uppercase tracking-[0.15em] mt-8 mb-2"
        style={{ fontFamily: sans, color: INK }}
      >
        Prototype Styles ({PROTOTYPE_ROUTES.length})
      </h3>
      <Hair />
      <RouteTable routes={PROTOTYPE_ROUTES} />

      {/* ── API Endpoints ── */}
      <h3
        className="text-[11px] font-extrabold uppercase tracking-[0.15em] mt-8 mb-2"
        style={{ fontFamily: sans, color: INK }}
      >
        API Endpoints ({API_ROUTES.length})
      </h3>
      <Hair />
      <table className="w-full text-left mb-8" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${INK}` }}>
            <th className="py-1.5 pr-3 text-[9px] font-extrabold uppercase tracking-[0.15em]"
                style={{ fontFamily: sans, color: TM, width: "40%" }}>Endpoint</th>
            <th className="py-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em]"
                style={{ fontFamily: sans, color: TM }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {API_ROUTES.map((r) => (
            <tr key={r.path} style={{ borderBottom: `1px solid ${GRY}66` }}>
              <td className="py-1.5 pr-3">
                <code className="text-[10px]" style={{ fontFamily: mono, color: INK }}>{r.path}</code>
              </td>
              <td className="py-1.5 text-[10px]" style={{ fontFamily: serif, color: TM }}>
                {r.desc}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Summary ── */}
      <Hair />
      <div className="flex items-center gap-4 py-3 text-[10px]" style={{ fontFamily: mono, color: TM }}>
        <span>{MAIN_ROUTES.length} main</span>
        <span>{DYNAMIC_ROUTES.length} dynamic</span>
        <span>{PROTOTYPE_ROUTES.length} prototypes</span>
        <span>{API_ROUTES.length} API endpoints</span>
        <span style={{ color: INK, fontWeight: 700 }}>
          {MAIN_ROUTES.length + PROTOTYPE_ROUTES.length + 1} total pages
        </span>
      </div>
    </WSJLayout>
  );
}
