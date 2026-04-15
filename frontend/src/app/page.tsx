"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TickerInput from "@/components/TickerInput";
import SectorHeatmap from "@/components/SectorHeatmap";
import MarketMovers from "@/components/MarketMovers";
import EarningsCalendarWidget from "@/components/EarningsCalendarWidget";
import MarketNews from "@/components/MarketNews";
import OurCoverage from "@/components/OurCoverage";
import ETFOverview from "@/components/ETFOverview";
import MarketPulse from "@/components/MarketPulse";
import CongressTradesWidget from "@/components/CongressTradesWidget";
import CongressHotTickers from "@/components/CongressHotTickers";
import InsiderTradesWidget from "@/components/InsiderTradesWidget";
import FeaturedAnalysis from "@/components/FeaturedAnalysis";
import WSJLayout from "@/components/WSJLayout";
import {
  INK, GRY, BLU, RED, TM,
  serif, mono, sans,
  WSJSection,
} from "@/lib/wsj";
import {
  fetchLanding,
  type MarketSummaryResponse,
  type SectorPerformanceResponse,
  type MarketMoversResponse,
  type EarningsCalendarResponse,
  type MarketNewsResponse,
  type CoverageTickersResponse,
  type ETFOverviewResponse,
  type LandingCongressData,
  type LandingInsiderData,
} from "@/lib/api";

export default function Home() {
  const router = useRouter();

  /* Landing page state */
  const [marketSummary, setMarketSummary] = useState<MarketSummaryResponse | null>(null);
  const [sectorPerf, setSectorPerf] = useState<SectorPerformanceResponse | null>(null);
  const [movers, setMovers] = useState<MarketMoversResponse | null>(null);
  const [earningsCal, setEarningsCal] = useState<EarningsCalendarResponse | null>(null);
  const [news, setNews] = useState<MarketNewsResponse | null>(null);
  const [coverage, setCoverage] = useState<CoverageTickersResponse | null>(null);
  const [etfData, setEtfData] = useState<ETFOverviewResponse | null>(null);
  const [congressData, setCongressData] = useState<LandingCongressData | null>(null);
  const [insiderData, setInsiderData] = useState<LandingInsiderData | null>(null);
  const [landingLoading, setLandingLoading] = useState(true);

  /* Fetch landing page data on mount ??single combined API call */
  useEffect(() => {
    const controller = new AbortController();
    setLandingLoading(true);
    fetchLanding()
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.marketSummary) setMarketSummary(data.marketSummary);
        if (data.sectorPerformance) setSectorPerf(data.sectorPerformance);
        if (data.marketMovers) setMovers(data.marketMovers);
        if (data.earningsCalendar) setEarningsCal(data.earningsCalendar);
        if (data.marketNews) setNews(data.marketNews);
        if (data.coverageTickers) setCoverage(data.coverageTickers);
        if (data.etfOverview) setEtfData(data.etfOverview);
        if (data.congressTrades) setCongressData(data.congressTrades);
        if (data.insiderTrades) setInsiderData(data.insiderTrades);
        setLandingLoading(false);
      })
      .catch(() => { if (!controller.signal.aborted) setLandingLoading(false); });
    return () => controller.abort();
  }, []);

  /* Navigate to stock detail page */
  const handleSubmit = useCallback((t: string, _p: string) => {
    router.push(`/stocks/${t.toUpperCase()}`);
  }, [router]);

  const handleTickerClick = useCallback((t: string) => {
    router.push(`/stocks/${t.toUpperCase()}`);
  }, [router]);

  const navContent = (
    <>
      <div className="flex items-center gap-3">
        <Link
          href="/screener-v4"
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          Screener
        </Link>
        <Link
          href="/heatmap"
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          Heatmap
        </Link>
        <Link
          href="/bubble"
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          Bubble Map
        </Link>
        <Link
          href="/screener"
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          Charts
        </Link>
        <Link
          href="/chart"
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          Chart Terminal
        </Link>
        <Link
          href="/technical"
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          Technical
        </Link>
        <Link
          href="/watchlist"
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          Watchlist
        </Link>
        <Link
          href="/sitemap-dev"
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          Sitemap
        </Link>
      </div>
      <TickerInput onSubmit={handleSubmit} />
    </>
  );

  return (
    <WSJLayout navContent={navContent}>
      {/* ?? LANDING PAGE ?? */}
      <div>
        {/* ?? 1. MARKET PULSE HERO ?? */}
        {/* Big prominent market index cards ??immediately show the market picture */}
        {marketSummary && marketSummary.items?.length > 0 && (
          <>
            {/* Scrolling ticker ribbon */}
            <div className="mb-2 overflow-hidden" style={{ borderTop: `2px solid ${INK}`, borderBottom: `1px solid ${GRY}` }}>
              <div className="flex items-center gap-6 py-1.5 animate-[scrollTicker_120s_linear_infinite] whitespace-nowrap w-max">
                {[...marketSummary.items, ...marketSummary.items].map((item, i) => (
                  <div key={`${item.symbol}-${i}`} className="flex items-center gap-1.5 px-1 shrink-0">
                    <span className="text-[8px] font-extrabold uppercase tracking-[0.1em]" style={{ fontFamily: sans, color: TM }}>
                      {item.name}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums" style={{ fontFamily: mono, color: INK }}>
                      {item.category === "bond" ? (item.price ?? 0).toFixed(2) + "%" : (item.price ?? 0) >= 1000 ? (item.price ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 }) : (item.price ?? 0).toFixed(2)}
                    </span>
                    <span
                      className="text-[10px] font-bold tabular-nums"
                      style={{ fontFamily: mono, color: (item.changePercent ?? 0) >= 0 ? "var(--wsj-green, #c9a96e)" : RED }}
                    >
                      {(item.changePercent ?? 0) >= 0 ? "+" : "-"}{Math.abs(item.changePercent ?? 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Pulse: Big index cards */}
            <MarketPulse
              items={marketSummary.items}
              marketStatus={marketSummary.marketStatus}
            />
          </>
        )}

        {/* ?? 2. SECTOR PERFORMANCE HEATMAP ?? */}
        {sectorPerf && sectorPerf.sectors?.length > 0 && (
          <>
            <WSJSection title="Sector Performance" />
            <SectorHeatmap sectors={sectorPerf.sectors} />
          </>
        )}

        {/* ?? 3. THREE-COLUMN: MOVERS | NEWS | EARNINGS ?? */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
          {/* LEFT: Market Movers */}
          <div>
            {movers && (movers.gainers?.length > 0 || movers.losers?.length > 0 || movers.mostActive?.length > 0) && (
              <>
                <WSJSection title="Market Movers" />
                <MarketMovers
                  gainers={movers.gainers}
                  losers={movers.losers}
                  mostActive={movers.mostActive}
                  onTickerClick={handleTickerClick}
                />
              </>
            )}
          </div>

          {/* CENTER: Market News */}
          <div>
            {news && news.articles?.length > 0 && (
              <>
                <WSJSection title="Market News" />
                <MarketNews articles={news.articles} />
              </>
            )}
          </div>

          {/* RIGHT: Earnings Calendar */}
          <div>
            {earningsCal && earningsCal.earnings?.length > 0 && (
              <>
                <WSJSection title="Upcoming Earnings" />
                <EarningsCalendarWidget
                  earnings={earningsCal.earnings}
                  onTickerClick={handleTickerClick}
                />
              </>
            )}
          </div>
        </div>

        {/* ?? 4. CONGRESS TRADING ?? the big engagement hook */}
        {congressData && congressData.trades?.length > 0 && (
          <>
            <WSJSection title="Congress Trading Activity" />
            <p className="text-[11px] mb-3" style={{ fontFamily: serif, color: TM }}>
              Recent stock trades disclosed by members of Congress under the STOCK Act.
              What are your representatives buying and selling?
            </p>
            <CongressTradesWidget
              trades={congressData.trades}
              summary={congressData.summary}
              totalCount={congressData.totalCount}
              onTickerClick={handleTickerClick}
            />
            {/* Hot tickers + party breakdown */}
            {congressData.summary?.mostTraded?.length > 0 && (
              <div className="mt-4">
                <CongressHotTickers
                  mostTraded={congressData.summary.mostTraded}
                  partyBreakdown={congressData.summary.partyBreakdown}
                  onTickerClick={handleTickerClick}
                />
              </div>
            )}
          </>
        )}

        {/* ?? 5. INSIDER TRADING ?? */}
        {insiderData && insiderData.transactions?.length > 0 && (
          <>
            <WSJSection title="Notable Insider Activity" />
            <p className="text-[11px] mb-3" style={{ fontFamily: serif, color: TM }}>
              Significant insider buys and sells (&gt;$100K) - when executives put their own money on the line.
            </p>
            <InsiderTradesWidget
              transactions={insiderData.transactions}
              onTickerClick={handleTickerClick}
            />
          </>
        )}

        {/* ?? 6. FEATURED AI ANALYSIS ?? teaser to get clicks */}
        {coverage && coverage.tickers?.length > 0 && (
          <>
            <WSJSection title="AI-Powered Analysis" />
            <p className="text-[11px] mb-3" style={{ fontFamily: serif, color: TM }}>
              Deep-dive AI analysis covering fundamentals, trends, and investment thesis.
              {coverage.tickers?.length} stocks covered.
            </p>
            <FeaturedAnalysis
              tickers={coverage.tickers}
              onTickerClick={handleTickerClick}
            />
          </>
        )}

        {/* ?? 7. ETF OVERVIEW ?? */}
        {etfData && etfData.etfs?.length > 0 && (
          <>
            <WSJSection title="ETF Overview" />
            <ETFOverview etfs={etfData.etfs} onTickerClick={handleTickerClick} />
          </>
        )}

        {/* ?? 8. TOOLS & FEATURES ??quick navigation grid ?? */}
        <WSJSection title="Tools & Analytics" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-2">
          {[
            { href: "/heatmap",     label: "Heatmap",        icon: "\u{1F5FA}" },
            { href: "/bubble",      label: "Bubble Map",     icon: "\u25CC" },
            { href: "/screener-v4", label: "Screener",       icon: "\u{1F50D}" },
            { href: "/chart",       label: "Chart Terminal", icon: "\u{1F4C8}" },
            { href: "/technical",   label: "Technical",      icon: "\u2699" },
            { href: "/watchlist",   label: "Watchlist",      icon: "\u2605" },
            { href: "/scanner",     label: "Scanner",        icon: "\u{1F50E}" },
            { href: "/earnings",    label: "Earnings",       icon: "\u{1F4C5}" },
            { href: "/correlation", label: "Correlation",    icon: "\u{1F517}" },
            { href: "/insiders",    label: "Insiders",       icon: "\u{1F465}" },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="flex flex-col items-center py-3 px-2 border transition-colors"
              style={{ borderColor: GRY, background: "transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `color-mix(in srgb, ${INK} 8%, transparent)`;
                e.currentTarget.style.borderColor = INK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = GRY;
              }}
            >
              <span
                className="text-[18px] mb-1 transition-colors"
                style={{ fontFamily: "system-ui, 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif", color: INK }}
              >
                {card.icon}
              </span>
              <span
                className="text-[8px] font-extrabold uppercase tracking-[0.1em] transition-colors"
                style={{ fontFamily: mono, color: INK }}
              >
                {card.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ?? 9. OUR COVERAGE ?? full grid */}
        {coverage && coverage.tickers?.length > 0 && (
          <>
            <WSJSection title="Our Coverage" />
            <p className="text-[11px] mb-3" style={{ fontFamily: serif, color: TM }}>
              In-depth AI-powered analysis available for {coverage.tickers?.length} stocks. Click to explore.
            </p>
            <OurCoverage
              tickers={coverage.tickers}
              onTickerClick={handleTickerClick}
            />
          </>
        )}

        {/* Loading skeleton for landing */}
        {landingLoading && !marketSummary && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-[11px] uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: sans, color: TM }}>
              {"Loading market data\u2026"}
            </div>
          </div>
        )}
      </div>
    </WSJLayout>
  );
}
