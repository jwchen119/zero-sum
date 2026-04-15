"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import TickerInput from "@/components/TickerInput";
import CompanyProfile from "@/components/CompanyProfile";
import FundamentalsPanel from "@/components/FundamentalsPanel";
import BalanceSheetPanel from "@/components/BalanceSheetPanel";
import CashFlowPanel from "@/components/CashFlowPanel";
import AnalystRecommendations from "@/components/AnalystRecommendations";
import EarningsCard from "@/components/EarningsCard";
import SplitRecord from "@/components/SplitRecord";
import HoldersPanel from "@/components/HoldersPanel";
import RatingsRadar from "@/components/RatingsRadar";
import AiAnalysisPanel from "@/components/AiAnalysisPanel";

/* Dynamic import only for CandlestickChart — pulls in lightweight-charts (186KB).
   Recharts-based panels share a single dependency and need static import
   for ResponsiveContainer to measure correctly on mount. */
const CandlestickChart = dynamic(() => import("@/components/CandlestickChart"), { ssr: false });
import WSJLayout from "@/components/WSJLayout";
import { formatCurrency } from "@/lib/format";
import {
  WHT, INK, GRY, BLU, RED, T2, TM, GAIN, LOSS,
  serif, mono, sans,
  Hair, WSJSection,
} from "@/lib/wsj";
import {
  fetchPrices,
  fetchFundamentals,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchHolders,
  fetchAnalysis,
  fetchStockNews,
  fetchStockNewsSummary,
  type PriceBar,
  type FundamentalsResponse,
  type BalanceSheetResponse,
  type CashFlowResponse,
  type HoldersResponse,
  type AiAnalysis,
  type StockNewsArticle,
  type StockNewsSummary,
  type IncomeItem,
  type BalanceSheetItem,
  type CashFlowItem,
  type Ratios,
  type CompanyProfile as CompanyProfileType,
  type Officer,
  type RecommendationItem,
  type SplitItem,
} from "@/lib/api";

/* ─── Server-provided initial data (from /api/stock-detail) ─── */
export interface InitialStockData {
  ticker: string;
  prices: PriceBar[];
  profile: CompanyProfileType;
  officers: Officer[];
  ratios: Ratios;
  income: IncomeItem[];
  quarterlyIncome: IncomeItem[];
  balanceSheet: BalanceSheetItem[];
  quarterlyBalanceSheet: BalanceSheetItem[];
  cashFlow: CashFlowItem[];
  quarterlyCashFlow: CashFlowItem[];
  recommendations: RecommendationItem[];
  holders: HoldersResponse;
  analysis: AiAnalysis | null;
  calendar: Record<string, unknown>;
  splits: SplitItem[];
}

interface Props {
  initialData?: InitialStockData | null;
}

export default function StockDetailClient({ initialData }: Props) {
  const params = useParams();
  const router = useRouter();
  const tickerParam = (params.ticker as string).toUpperCase();

  /* Map server data to client state shapes */
  const initPrices = initialData?.prices ?? [];
  const initFundamentals: FundamentalsResponse | null = initialData
    ? {
        ticker: initialData.ticker,
        quarterly: false,
        income: initialData.income,
        dividends: [],
        ratios: initialData.ratios,
        profile: initialData.profile,
        officers: initialData.officers,
        recommendations: initialData.recommendations,
        calendar: initialData.calendar,
        splits: initialData.splits,
      }
    : null;
  const initBalanceSheet: BalanceSheetResponse | null = initialData
    ? { ticker: initialData.ticker, quarterly: false, items: initialData.balanceSheet }
    : null;
  const initCashFlow: CashFlowResponse | null = initialData
    ? { ticker: initialData.ticker, quarterly: false, items: initialData.cashFlow }
    : null;
  const initHolders = initialData?.holders ?? null;
  const initAnalysis = initialData?.analysis ?? null;

  const hasInitialData = !!initialData;

  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("5y");
  const [prices, setPrices] = useState<PriceBar[]>(initPrices);
  const [fundamentals, setFundamentals] = useState<FundamentalsResponse | null>(initFundamentals);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetResponse | null>(initBalanceSheet);
  const [cashFlow, setCashFlow] = useState<CashFlowResponse | null>(initCashFlow);
  const [holders, setHolders] = useState<HoldersResponse | null>(initHolders);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(initAnalysis);
  const [quarterly, setQuarterly] = useState(false);
  const [newsArticles, setNewsArticles] = useState<StockNewsArticle[]>([]);
  const [newsSummary, setNewsSummary] = useState<StockNewsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  /* Track whether this is the very first render with server data */
  const skipInitialFetch = useRef(hasInitialData);

  /* Fetch all data when ticker, period, or quarterly changes */
  useEffect(() => {
    /* On mount with server data for default period (5y, annual):
       skip fundamentals/analysis (already have them from SSR),
       but still fetch full prices (SSR only sends last 30 bars)
       and news (not in stock-detail endpoint). */
    if (skipInitialFetch.current && period === "5y" && !quarterly) {
      skipInitialFetch.current = false;
      fetchPrices(tickerParam, period)
        .then((r) => setPrices(r.data))
        .catch(() => {});
      fetchStockNews(tickerParam)
        .then((r) => setNewsArticles(r.articles))
        .catch(() => {});
      // SSR bundles analysis from static files; if none existed, fetch via
      // /api/analyze which can generate on-the-fly or return _notEligible.
      if (!initAnalysis) {
        fetchAnalysis(tickerParam)
          .then((a) => setAnalysis(a))
          .catch(() => {});
      }
      return;
    }
    skipInitialFetch.current = false;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.allSettled([
      fetchPrices(tickerParam, period),
      fetchFundamentals(tickerParam, quarterly),
      fetchBalanceSheet(tickerParam, quarterly),
      fetchCashFlow(tickerParam, quarterly),
      fetchHolders(tickerParam),
      fetchAnalysis(tickerParam),
      fetchStockNews(tickerParam),
    ])
      .then(([priceRes, fundRes, bsRes, cfRes, holdRes, analysisRes, newsRes]) => {
        if (controller.signal.aborted) return;
        if (priceRes.status === "fulfilled") setPrices(priceRes.value.data); else setPrices([]);
        if (fundRes.status === "fulfilled") setFundamentals(fundRes.value); else setFundamentals(null);
        if (bsRes.status === "fulfilled") setBalanceSheet(bsRes.value); else setBalanceSheet(null);
        if (cfRes.status === "fulfilled") setCashFlow(cfRes.value); else setCashFlow(null);
        if (holdRes.status === "fulfilled") setHolders(holdRes.value); else setHolders(null);
        if (analysisRes.status === "fulfilled") setAnalysis(analysisRes.value); else setAnalysis(null);
        if (newsRes.status === "fulfilled") setNewsArticles(newsRes.value.articles); else setNewsArticles([]);
        // Only show error if prices also failed
        if (priceRes.status === "rejected") {
          const msg = priceRes.reason instanceof Error ? priceRes.reason.message : "Something went wrong";
          setError(msg);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [tickerParam, period, quarterly]);

  /* TickerInput handler — navigate to new ticker or update period */
  const handleSubmit = useCallback(
    (t: string, p: string) => {
      const newTicker = t.toUpperCase();
      if (newTicker !== tickerParam) {
        setPeriod(p);
        router.push(`/stocks/${newTicker}`);
      } else if (p !== period) {
        setPeriod(p);
      }
    },
    [router, tickerParam, period],
  );

  /* ── Format helpers ── */
  const r = fundamentals?.ratios;

  const statsItems = r
    ? [
        { l: "Mkt Cap", v: formatCurrency(r.marketCap) },
        { l: "P/E", v: r.trailingPE?.toFixed(1) ?? "N/A" },
        { l: "EPS", v: r.epsTrailing ? `$${r.epsTrailing.toFixed(2)}` : "N/A" },
        { l: "Beta", v: r.beta?.toFixed(2) ?? "N/A" },
        { l: "Yield", v: r.dividendYield ? `${(r.dividendYield * 100).toFixed(2)}%` : "—" },
        { l: "52W Hi", v: r.fiftyTwoWeekHigh ? `$${r.fiftyTwoWeekHigh.toFixed(2)}` : "N/A" },
        { l: "52W Lo", v: r.fiftyTwoWeekLow ? `$${r.fiftyTwoWeekLow.toFixed(2)}` : "N/A" },
        { l: "Vol", v: r.averageVolume ? `${(r.averageVolume / 1e6).toFixed(1)}M` : "N/A" },
      ]
    : [];

  const navContent = (
    <>
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          ← Home
        </Link>
        <Link
          href="/screener"
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          ← Screener
        </Link>
        <Link
          href={`/chart?symbol=${tickerParam}`}
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          Chart Terminal
        </Link>
        <Link
          href={`/technical/${tickerParam}`}
          className="text-[10px] font-semibold hover:underline"
          style={{ fontFamily: mono, color: BLU }}
        >
          Technical
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <TickerInput onSubmit={handleSubmit} loading={loading} initialTicker={tickerParam} />
        <label className="flex items-center gap-2 text-[11px]" style={{ fontFamily: sans, color: T2 }}>
          <input
            type="checkbox"
            checked={quarterly}
            onChange={(e) => setQuarterly(e.target.checked)}
            className="rounded border-[#c8c8c8] accent-[#1e4d8c]"
          />
          Quarterly
        </label>
      </div>
    </>
  );

  return (
    <WSJLayout navContent={navContent}>
      {/* Error */}
      {error && (
        <div className="border px-4 py-3 text-sm mb-4" style={{ borderColor: RED, color: RED, fontFamily: serif }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: sans, color: TM }}>
            Loading {tickerParam} data…
          </div>
        </div>
      )}

      {/* ── PRICE HERO ── */}
      {!loading && prices.length > 0 && (
        <div className="py-5 border-b-2" style={{ borderColor: INK }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-4xl font-bold tracking-tight" style={{ fontFamily: sans }}>{tickerParam}</span>
                {r?.name && (
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] border px-1.5 py-0.5" style={{ fontFamily: sans, color: TM, borderColor: GRY }}>
                    {r.sector || ""}
                  </span>
                )}
              </div>
              <p className="text-[15px]" style={{ fontFamily: serif, color: T2 }}>
                {r?.name ?? ""}{r?.sector ? ` — ${r.sector}` : ""}{r?.industry ? ` · ${r.industry}` : ""}
              </p>
            </div>
            <div className="flex items-end gap-4">
              {prices.length > 0 && (() => {
                const last = prices[prices.length - 1].close;
                const prev = prices.length > 1 ? prices[prices.length - 2].close : null;
                const chg = prev != null ? last - prev : null;
                const chgPct = prev != null && prev !== 0 ? (chg! / prev) * 100 : null;
                const positive = chg != null && chg >= 0;
                return (
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-light tabular-nums" style={{ fontFamily: mono }}>
                      ${last.toFixed(2)}
                    </span>
                    {chg != null && (
                      <span className="text-lg font-bold tabular-nums" style={{ fontFamily: mono, color: positive ? GAIN : LOSS }}>
                        {positive ? "+" : ""}{chg.toFixed(2)} ({positive ? "+" : ""}{chgPct!.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Stats bar ── */}
      {statsItems.length > 0 && (
        <div className="grid grid-cols-4 md:grid-cols-8 gap-px my-4" style={{ background: GRY }}>
          {statsItems.map((s) => (
            <div key={s.l} className="text-center py-2 px-1" style={{ background: WHT }}>
              <div className="text-[7px] font-extrabold uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{s.l}</div>
              <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── NEWSPAPER COLUMN LAYOUT ── */}
      {/* Mobile: stacked · lg: 2-col grid · 2xl: CSS multi-column flow (true broadsheet) */}
      {!loading && (prices.length > 0 || fundamentals) && (
        <>
          {/* === lg 2-column grid (hidden on 2xl where flow layout takes over) === */}
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 mt-2 2xl:hidden">

            {/* LEFT COLUMN — Main Story */}
            <div className="space-y-0 min-w-0">
              {prices.length > 0 && (
                <>
                  <WSJSection title="Price History" />
                  <CandlestickChart data={prices} ticker={tickerParam} />
                  <div className="flex justify-end gap-4 mt-1 mb-2">
                    <Link
                      href={`/chart?symbol=${tickerParam}`}
                      className="text-xs hover:underline"
                      style={{ color: BLU, fontFamily: mono }}
                    >
                      Chart Terminal →
                    </Link>
                    <Link
                      href={`/technical/${tickerParam}`}
                      className="text-xs hover:underline"
                      style={{ color: BLU, fontFamily: mono }}
                    >
                      Technical Analysis →
                    </Link>
                  </div>
                </>
              )}
              {fundamentals && fundamentals.profile && (
                <>
                  <WSJSection title="Company Profile" />
                  <CompanyProfile profile={fundamentals.profile} officers={fundamentals.officers} />
                </>
              )}
              {analysis && !analysis._notEligible && (
                <>
                  <WSJSection title="Market Intelligence" />
                  <AiAnalysisPanel analysis={analysis} />
                </>
              )}
              {analysis && analysis._notEligible && (
                <div className="border p-4 text-center" style={{ borderColor: GRY, background: WHT }}>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ fontFamily: sans, color: TM }}>Market Intelligence</p>
                  <p className="text-[13px]" style={{ fontFamily: serif, color: T2 }}>AI analysis is available for TWSE stocks only.</p>
                </div>
              )}
              {fundamentals && fundamentals.income.length > 0 && (
                <>
                  <WSJSection title="Financial Statements" />
                  <FundamentalsPanel data={fundamentals} />
                </>
              )}
            </div>

            {/* RIGHT COLUMN — Sidebar */}
            <div className="space-y-4">
              {r && (r.fiftyTwoWeekHigh || r.fiftyTwoWeekLow) && (
                <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Price Ranges</h3>
                  <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                  {r.fiftyTwoWeekLow != null && r.fiftyTwoWeekHigh != null && prices.length > 0 && (() => {
                    const current = prices[prices.length - 1].close;
                    const pct = ((current - r.fiftyTwoWeekLow) / (r.fiftyTwoWeekHigh - r.fiftyTwoWeekLow)) * 100;
                    return (
                      <div className="mb-4">
                        <div className="text-[9px] uppercase tracking-[0.15em] font-extrabold mb-1.5" style={{ fontFamily: sans, color: TM }}>52-Week</div>
                        <div className="relative h-px" style={{ background: GRY }}>
                          <div className="absolute h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: INK }} />
                          <div className="absolute top-[-4px] w-2 h-2 rounded-full" style={{ left: `calc(${Math.min(100, Math.max(0, pct))}% - 4px)`, background: INK }} />
                        </div>
                        <div className="flex justify-between text-[10px] tabular-nums mt-1" style={{ fontFamily: mono, color: TM }}>
                          <span>${r.fiftyTwoWeekLow.toFixed(2)}</span>
                          <span>${r.fiftyTwoWeekHigh.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                  <Hair />
                  {[
                    { l: "Fwd P/E", v: r.forwardPE?.toFixed(1) ?? "N/A" },
                    { l: "Avg Volume", v: r.averageVolume ? `${(r.averageVolume / 1e6).toFixed(1)}M` : "N/A" },
                    { l: "Shares Out", v: r.sharesOutstanding ? `${(r.sharesOutstanding / 1e9).toFixed(2)}B` : "N/A" },
                  ].map((row) => (
                    <div key={row.l} className="flex justify-between py-1 text-sm">
                      <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{row.l}</span>
                      <span className="font-bold tabular-nums" style={{ fontFamily: mono }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              )}
              {r && (
                <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Key Ratios</h3>
                  <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                  {[
                    { l: "Gross Margin", v: r.grossMargin != null ? `${(r.grossMargin * 100).toFixed(1)}%` : "N/A", pos: (r.grossMargin ?? 0) > 0 },
                    { l: "Operating Margin", v: r.operatingMargin != null ? `${(r.operatingMargin * 100).toFixed(1)}%` : "N/A", pos: (r.operatingMargin ?? 0) > 0 },
                    { l: "Profit Margin", v: r.profitMargin != null ? `${(r.profitMargin * 100).toFixed(1)}%` : "N/A", pos: (r.profitMargin ?? 0) > 0 },
                    { l: "ROE", v: r.roe != null ? `${(r.roe * 100).toFixed(1)}%` : "N/A", pos: (r.roe ?? 0) > 0 },
                    { l: "ROA", v: r.roa != null ? `${(r.roa * 100).toFixed(1)}%` : "N/A", pos: (r.roa ?? 0) > 0 },
                    { l: "P/B", v: r.priceToBook?.toFixed(1) ?? "N/A", pos: true },
                    { l: "D/E", v: r.debtToEquity?.toFixed(2) ?? "N/A", pos: (r.debtToEquity ?? 999) < 1.5 },
                    { l: "Current Ratio", v: r.currentRatio?.toFixed(2) ?? "N/A", pos: (r.currentRatio ?? 0) >= 1 },
                    { l: "Dividend Rate", v: r.dividendRate ? `$${r.dividendRate.toFixed(2)}` : "None", pos: true },
                    { l: "Payout Ratio", v: r.payoutRatio != null ? `${(r.payoutRatio * 100).toFixed(1)}%` : "N/A", pos: true },
                  ].map((row, i) => (
                    <div key={row.l} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                      <span className="text-[13px]" style={{ fontFamily: serif, color: T2 }}>{row.l}</span>
                      <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: row.pos ? INK : RED }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              )}
              {r && (r.totalCash != null || r.totalDebt != null) && (
                <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Cash &amp; Debt</h3>
                  <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                  {r.totalCash != null && r.totalDebt != null && (() => {
                    const cash = r.totalCash ?? 0;
                    const debt = r.totalDebt ?? 0;
                    const total = cash + debt;
                    const cashPct = total > 0 ? (cash / total) * 100 : 50;
                    return (
                      <div className="mb-3">
                        <div className="flex h-3 w-full overflow-hidden" style={{ background: `${RED}22` }}>
                          <div style={{ width: `${cashPct}%`, background: `${BLU}44` }} />
                        </div>
                        <div className="flex justify-between text-[9px] uppercase tracking-[0.1em] font-extrabold mt-1" style={{ fontFamily: sans }}>
                          <span style={{ color: BLU }}>Cash {cashPct.toFixed(0)}%</span>
                          <span style={{ color: RED }}>Debt {(100 - cashPct).toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })()}
                  {[
                    { l: "Total Cash", v: r.totalCash != null ? formatCurrency(r.totalCash) : "N/A", c: BLU },
                    { l: "Total Debt", v: r.totalDebt != null ? formatCurrency(r.totalDebt) : "N/A", c: RED },
                    { l: "Net Cash", v: r.totalCash != null && r.totalDebt != null ? formatCurrency(r.totalCash - r.totalDebt) : "N/A", c: (r.totalCash ?? 0) > (r.totalDebt ?? 0) ? BLU : RED },
                    { l: "Free Cash Flow", v: r.freeCashflow != null ? formatCurrency(r.freeCashflow) : "N/A", c: (r.freeCashflow ?? 0) >= 0 ? INK : RED },
                    { l: "Operating CF", v: r.operatingCashflow != null ? formatCurrency(r.operatingCashflow) : "N/A", c: (r.operatingCashflow ?? 0) >= 0 ? INK : RED },
                  ].map((row, i) => (
                    <div key={row.l} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                      <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{row.l}</span>
                      <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: mono, color: row.c }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              )}
              {fundamentals && <RatingsRadar ratios={fundamentals.ratios} />}
              {r && (r.revenueGrowth != null || r.earningsGrowth != null) && (
                <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Growth Pulse</h3>
                  <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                  {[
                    { l: "Revenue Growth", v: r.revenueGrowth },
                    { l: "Earnings Growth", v: r.earningsGrowth },
                  ].filter(g => g.v != null).map((g, i) => {
                    const pct = (g.v! * 100);
                    const positive = pct >= 0;
                    return (
                      <div key={g.l} style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }} className="py-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold" style={{ fontFamily: sans, color: TM }}>{g.l}</span>
                          <span className="text-[15px] font-bold tabular-nums" style={{ fontFamily: mono, color: positive ? "#c9a96e" : RED }}>
                            {positive ? "+" : ""}{pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1 w-full" style={{ background: `${GRY}66` }}>
                          <div className="h-full" style={{ width: `${Math.min(100, Math.abs(pct))}%`, background: positive ? "#c9a96e" : RED }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {fundamentals && fundamentals.recommendations.length > 0 && (
                <AnalystRecommendations recommendations={fundamentals.recommendations} />
              )}
              {/* ── News & AI Sentiment ── */}
              {newsArticles.length > 0 && (
                <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Recent News</h3>
                    <Link
                      href={`/news?symbol=${tickerParam}`}
                      className="text-[10px] hover:underline"
                      style={{ color: BLU, fontFamily: mono }}
                    >
                      All News →
                    </Link>
                  </div>
                  <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />

                  {/* AI Summary button / panel */}
                  {!newsSummary && (
                    <button
                      onClick={async () => {
                        setSummaryLoading(true);
                        try {
                          const s = await fetchStockNewsSummary(tickerParam);
                          setNewsSummary(s);
                        } catch { /* ignore */ }
                        setSummaryLoading(false);
                      }}
                      disabled={summaryLoading}
                      className="w-full mb-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.15em] border"
                      style={{
                        fontFamily: mono,
                        borderColor: GRY,
                        background: summaryLoading ? GRY : INK,
                        color: summaryLoading ? TM : WHT,
                        cursor: summaryLoading ? "wait" : "pointer",
                      }}
                    >
                      {summaryLoading ? "Analyzing…" : "Generate AI News Summary"}
                    </button>
                  )}

                  {newsSummary && !newsSummary.error && (() => {
                    const sc = newsSummary.sentimentScore;
                    const sentCfg: Record<string, { icon: string; color: string }> = {
                      bullish:  { icon: "▲", color: "#2e7d32" },
                      bearish:  { icon: "▼", color: "#c62828" },
                      neutral:  { icon: "─", color: TM },
                      mixed:    { icon: "◆", color: "#e65100" },
                    };
                    const cfg = sentCfg[newsSummary.sentiment] || sentCfg.neutral;
                    return (
                      <div className="mb-3 p-3 border rounded" style={{ borderColor: GRY, background: "#fafaf5" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-bold" style={{ color: cfg.color }}>{cfg.icon}</span>
                          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em]" style={{ fontFamily: sans, color: cfg.color }}>
                            {newsSummary.sentiment} ({sc > 0 ? "+" : ""}{sc.toFixed(2)})
                          </span>
                        </div>
                        <p className="text-[13px] font-bold mb-1" style={{ fontFamily: serif, color: INK }}>{newsSummary.headline}</p>
                        <p className="text-[12px] leading-relaxed mb-2" style={{ fontFamily: serif, color: T2 }}>{newsSummary.summary}</p>
                        {newsSummary.catalysts.length > 0 && (
                          <div className="mb-1">
                            <span className="text-[8px] font-extrabold uppercase tracking-wider" style={{ fontFamily: sans, color: "#2e7d32" }}>Catalysts: </span>
                            <span className="text-[11px]" style={{ fontFamily: serif, color: T2 }}>{newsSummary.catalysts.join(" · ")}</span>
                          </div>
                        )}
                        {newsSummary.risks.length > 0 && (
                          <div>
                            <span className="text-[8px] font-extrabold uppercase tracking-wider" style={{ fontFamily: sans, color: "#c62828" }}>Risks: </span>
                            <span className="text-[11px]" style={{ fontFamily: serif, color: T2 }}>{newsSummary.risks.join(" · ")}</span>
                          </div>
                        )}
                        <div className="mt-2 text-[9px]" style={{ fontFamily: mono, color: TM }}>
                          {newsSummary.articlesAnalyzed} articles · {newsSummary.model}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Article list (top 8) */}
                  <div className="space-y-0">
                    {newsArticles.slice(0, 8).map((a, i) => {
                      const ago = (() => {
                        const diff = Date.now() - new Date(a.publishedAt).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 60) return `${mins}m`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h`;
                        return `${Math.floor(hrs / 24)}d`;
                      })();
                      return (
                        <a
                          key={i}
                          href={a.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block py-2 hover:bg-[#f0ebe0]"
                          style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}
                        >
                          <div className="text-[12px] leading-snug font-semibold" style={{ fontFamily: serif, color: INK }}>
                            {a.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {a.publisher && (
                              <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>
                                {a.publisher}
                              </span>
                            )}
                            <span className="text-[9px] tabular-nums" style={{ fontFamily: mono, color: TM }}>{ago}</span>
                            <span className="text-[8px] px-1 py-px border rounded" style={{ fontFamily: mono, color: TM, borderColor: GRY }}>
                              {a.source}
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              {fundamentals && fundamentals.income.length > 0 && (() => {
                const latest = fundamentals.income[fundamentals.income.length - 1];
                const revDiv = Math.abs(latest.revenue ?? 0) >= 1e9 ? 1e9 : 1e6;
                const revUnit = revDiv === 1e9 ? "B" : "M";
                const niDiv = Math.abs(latest.netIncome ?? 0) >= 1e9 ? 1e9 : 1e6;
                const niUnit = niDiv === 1e9 ? "B" : "M";
                return (
                  <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>
                      Income Snapshot <span className="ml-2 font-normal" style={{ color: TM }}>{latest.period}</span>
                    </h3>
                    <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { l: "Revenue", v: latest.revenue != null ? `$${(latest.revenue / revDiv).toFixed(1)}${revUnit}` : "N/A" },
                        { l: "Net Income", v: latest.netIncome != null ? `$${(latest.netIncome / niDiv).toFixed(1)}${niUnit}` : "N/A" },
                        { l: "Gross Margin", v: latest.grossMargin != null ? `${latest.grossMargin.toFixed(1)}%` : "N/A" },
                        { l: "Net Margin", v: latest.netMargin != null ? `${latest.netMargin.toFixed(1)}%` : "N/A" },
                        { l: "Op. Income", v: latest.operatingIncome != null ? `$${(latest.operatingIncome / revDiv).toFixed(1)}${revUnit}` : "N/A" },
                        { l: "EPS", v: latest.eps != null ? `$${latest.eps.toFixed(2)}` : "N/A" },
                      ].map((cell) => (
                        <div key={cell.l} className="text-center py-2 border" style={{ borderColor: GRY }}>
                          <div className="text-[8px] uppercase tracking-wider font-extrabold" style={{ fontFamily: sans, color: TM }}>{cell.l}</div>
                          <div className="text-[14px] font-bold tabular-nums mt-0.5" style={{ fontFamily: mono }}>{cell.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {fundamentals && Object.keys(fundamentals.calendar).length > 0 && (
                <EarningsCard calendar={fundamentals.calendar} />
              )}
              {balanceSheet && balanceSheet.items.length > 0 && (
                <BalanceSheetPanel items={balanceSheet.items} quarterly={quarterly} />
              )}
              {balanceSheet && balanceSheet.items.length > 0 && (() => {
                const latest = balanceSheet.items[balanceSheet.items.length - 1];
                const d = (v: number | null) => v != null ? formatCurrency(v) : "N/A";
                return (
                  <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>
                      Balance Sheet Snapshot <span className="ml-2 font-normal" style={{ color: TM }}>{latest.period}</span>
                    </h3>
                    <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                    {[
                      { l: "Total Assets", v: d(latest.totalAssets) },
                      { l: "Total Liabilities", v: d(latest.totalLiabilities) },
                      { l: "Equity", v: d(latest.stockholdersEquity) },
                      { l: "Retained Earnings", v: d(latest.retainedEarnings) },
                      { l: "Goodwill", v: d(latest.goodwill) },
                      { l: "Long-Term Debt", v: d(latest.longTermDebt) },
                    ].map((row, i) => (
                      <div key={row.l} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                        <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{row.l}</span>
                        <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: mono }}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {cashFlow && cashFlow.items.length > 0 && (
                <CashFlowPanel items={cashFlow.items} quarterly={quarterly} />
              )}
              {cashFlow && cashFlow.items.length > 0 && (() => {
                const latest = cashFlow.items[cashFlow.items.length - 1];
                const d = (v: number | null) => v != null ? formatCurrency(v) : "N/A";
                const neg = (v: number | null) => v != null ? formatCurrency(Math.abs(v)) : "N/A";
                return (
                  <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>
                      Capital Allocation <span className="ml-2 font-normal" style={{ color: TM }}>{latest.period}</span>
                    </h3>
                    <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                    {[
                      { l: "CapEx", v: neg(latest.capex) },
                      { l: "Dividends Paid", v: neg(latest.dividendsPaid) },
                      { l: "Buybacks", v: neg(latest.stockBuyback) },
                      { l: "Debt Repaid", v: neg(latest.debtRepayment) },
                      { l: "Debt Issued", v: d(latest.debtIssuance) },
                      { l: "Net Change Cash", v: d(latest.netChangeInCash) },
                    ].map((row, i) => (
                      <div key={row.l} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                        <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{row.l}</span>
                        <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: mono }}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {holders && <HoldersPanel summary={holders.summary} holders={holders.holders} />}
              {fundamentals && fundamentals.splits.length > 0 && (
                <SplitRecord splits={fundamentals.splits} />
              )}
            </div>
          </div>

          {/* === 2xl: CSS multi-column flow layout (true newspaper) === */}
          <div className="hidden 2xl:block mt-2 spread-flow" style={{ columnCount: 3, columnGap: "2rem", columnRule: `1px solid ${GRY}` }}>
            {/* Chart — spans all columns */}
            {prices.length > 0 && (
              <div className="spread-span mb-4">
                <WSJSection title="Price History" />
                <CandlestickChart data={prices} ticker={tickerParam} />
                <div className="flex justify-end gap-4 mt-1">
                  <Link
                    href={`/chart?symbol=${tickerParam}`}
                    className="text-xs hover:underline"
                    style={{ color: BLU, fontFamily: mono }}
                  >
                    Chart Terminal →
                  </Link>
                  <Link
                    href={`/technical/${tickerParam}`}
                    className="text-xs hover:underline"
                    style={{ color: BLU, fontFamily: mono }}
                  >
                    Technical Analysis →
                  </Link>
                </div>
              </div>
            )}

            {/* All remaining sections flow freely across 3 columns */}
            {fundamentals && fundamentals.profile && (
              <div className="spread-item">
                <WSJSection title="Company Profile" />
                <CompanyProfile profile={fundamentals.profile} officers={fundamentals.officers} />
              </div>
            )}

            {r && (r.fiftyTwoWeekHigh || r.fiftyTwoWeekLow) && (
              <div className="spread-item border p-4" style={{ borderColor: GRY, background: WHT }}>
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Price Ranges</h3>
                <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                {r.fiftyTwoWeekLow != null && r.fiftyTwoWeekHigh != null && prices.length > 0 && (() => {
                  const current = prices[prices.length - 1].close;
                  const pct = ((current - r.fiftyTwoWeekLow) / (r.fiftyTwoWeekHigh - r.fiftyTwoWeekLow)) * 100;
                  return (
                    <div className="mb-4">
                      <div className="text-[9px] uppercase tracking-[0.15em] font-extrabold mb-1.5" style={{ fontFamily: sans, color: TM }}>52-Week</div>
                      <div className="relative h-px" style={{ background: GRY }}>
                        <div className="absolute h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: INK }} />
                        <div className="absolute top-[-4px] w-2 h-2 rounded-full" style={{ left: `calc(${Math.min(100, Math.max(0, pct))}% - 4px)`, background: INK }} />
                      </div>
                      <div className="flex justify-between text-[10px] tabular-nums mt-1" style={{ fontFamily: mono, color: TM }}>
                        <span>${r.fiftyTwoWeekLow.toFixed(2)}</span>
                        <span>${r.fiftyTwoWeekHigh.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
                <Hair />
                {[
                  { l: "Fwd P/E", v: r.forwardPE?.toFixed(1) ?? "N/A" },
                  { l: "Avg Volume", v: r.averageVolume ? `${(r.averageVolume / 1e6).toFixed(1)}M` : "N/A" },
                  { l: "Shares Out", v: r.sharesOutstanding ? `${(r.sharesOutstanding / 1e9).toFixed(2)}B` : "N/A" },
                ].map((row) => (
                  <div key={row.l} className="flex justify-between py-1 text-sm">
                    <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{row.l}</span>
                    <span className="font-bold tabular-nums" style={{ fontFamily: mono }}>{row.v}</span>
                  </div>
                ))}
              </div>
            )}

            {r && (
              <div className="spread-item border p-4" style={{ borderColor: GRY, background: WHT }}>
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Key Ratios</h3>
                <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                {[
                  { l: "Gross Margin", v: r.grossMargin != null ? `${(r.grossMargin * 100).toFixed(1)}%` : "N/A", pos: (r.grossMargin ?? 0) > 0 },
                  { l: "Operating Margin", v: r.operatingMargin != null ? `${(r.operatingMargin * 100).toFixed(1)}%` : "N/A", pos: (r.operatingMargin ?? 0) > 0 },
                  { l: "Profit Margin", v: r.profitMargin != null ? `${(r.profitMargin * 100).toFixed(1)}%` : "N/A", pos: (r.profitMargin ?? 0) > 0 },
                  { l: "ROE", v: r.roe != null ? `${(r.roe * 100).toFixed(1)}%` : "N/A", pos: (r.roe ?? 0) > 0 },
                  { l: "ROA", v: r.roa != null ? `${(r.roa * 100).toFixed(1)}%` : "N/A", pos: (r.roa ?? 0) > 0 },
                  { l: "P/B", v: r.priceToBook?.toFixed(1) ?? "N/A", pos: true },
                  { l: "D/E", v: r.debtToEquity?.toFixed(2) ?? "N/A", pos: (r.debtToEquity ?? 999) < 1.5 },
                  { l: "Current Ratio", v: r.currentRatio?.toFixed(2) ?? "N/A", pos: (r.currentRatio ?? 0) >= 1 },
                  { l: "Dividend Rate", v: r.dividendRate ? `$${r.dividendRate.toFixed(2)}` : "None", pos: true },
                  { l: "Payout Ratio", v: r.payoutRatio != null ? `${(r.payoutRatio * 100).toFixed(1)}%` : "N/A", pos: true },
                ].map((row, i) => (
                  <div key={row.l} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                    <span className="text-[13px]" style={{ fontFamily: serif, color: T2 }}>{row.l}</span>
                    <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: row.pos ? INK : RED }}>{row.v}</span>
                  </div>
                ))}
              </div>
            )}

            {analysis && !analysis._notEligible && (
              <div className="spread-item">
                <WSJSection title="Market Intelligence" />
                <AiAnalysisPanel analysis={analysis} />
              </div>
            )}
            {analysis && analysis._notEligible && (
              <div className="spread-item border p-4 text-center" style={{ borderColor: GRY, background: WHT }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ fontFamily: sans, color: TM }}>Market Intelligence</p>
                <p className="text-[13px]" style={{ fontFamily: serif, color: T2 }}>AI analysis is available for TWSE stocks only.</p>
              </div>
            )}

            {r && (r.totalCash != null || r.totalDebt != null) && (
              <div className="spread-item border p-4" style={{ borderColor: GRY, background: WHT }}>
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Cash &amp; Debt</h3>
                <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                {r.totalCash != null && r.totalDebt != null && (() => {
                  const cash = r.totalCash ?? 0;
                  const debt = r.totalDebt ?? 0;
                  const total = cash + debt;
                  const cashPct = total > 0 ? (cash / total) * 100 : 50;
                  return (
                    <div className="mb-3">
                      <div className="flex h-3 w-full overflow-hidden" style={{ background: `${RED}22` }}>
                        <div style={{ width: `${cashPct}%`, background: `${BLU}44` }} />
                      </div>
                      <div className="flex justify-between text-[9px] uppercase tracking-[0.1em] font-extrabold mt-1" style={{ fontFamily: sans }}>
                        <span style={{ color: BLU }}>Cash {cashPct.toFixed(0)}%</span>
                        <span style={{ color: RED }}>Debt {(100 - cashPct).toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })()}
                {[
                  { l: "Total Cash", v: r.totalCash != null ? formatCurrency(r.totalCash) : "N/A", c: BLU },
                  { l: "Total Debt", v: r.totalDebt != null ? formatCurrency(r.totalDebt) : "N/A", c: RED },
                  { l: "Net Cash", v: r.totalCash != null && r.totalDebt != null ? formatCurrency(r.totalCash - r.totalDebt) : "N/A", c: (r.totalCash ?? 0) > (r.totalDebt ?? 0) ? BLU : RED },
                  { l: "Free Cash Flow", v: r.freeCashflow != null ? formatCurrency(r.freeCashflow) : "N/A", c: (r.freeCashflow ?? 0) >= 0 ? INK : RED },
                  { l: "Operating CF", v: r.operatingCashflow != null ? formatCurrency(r.operatingCashflow) : "N/A", c: (r.operatingCashflow ?? 0) >= 0 ? INK : RED },
                ].map((row, i) => (
                  <div key={row.l} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                    <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{row.l}</span>
                    <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: mono, color: row.c }}>{row.v}</span>
                  </div>
                ))}
              </div>
            )}

            {fundamentals && <div className="spread-item"><RatingsRadar ratios={fundamentals.ratios} /></div>}

            {r && (r.revenueGrowth != null || r.earningsGrowth != null) && (
              <div className="spread-item border p-4" style={{ borderColor: GRY, background: WHT }}>
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Growth Pulse</h3>
                <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                {[
                  { l: "Revenue Growth", v: r.revenueGrowth },
                  { l: "Earnings Growth", v: r.earningsGrowth },
                ].filter(g => g.v != null).map((g, i) => {
                  const pct = (g.v! * 100);
                  const positive = pct >= 0;
                  return (
                    <div key={g.l} style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }} className="py-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold" style={{ fontFamily: sans, color: TM }}>{g.l}</span>
                        <span className="text-[15px] font-bold tabular-nums" style={{ fontFamily: mono, color: positive ? "#c9a96e" : RED }}>
                          {positive ? "+" : ""}{pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1 w-full" style={{ background: `${GRY}66` }}>
                        <div className="h-full" style={{ width: `${Math.min(100, Math.abs(pct))}%`, background: positive ? "#c9a96e" : RED }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {fundamentals && fundamentals.recommendations.length > 0 && (
              <div className="spread-item"><AnalystRecommendations recommendations={fundamentals.recommendations} /></div>
            )}

            {/* ── News (spread layout) ── */}
            {newsArticles.length > 0 && (
              <div className="spread-item border p-4" style={{ borderColor: GRY, background: WHT }}>
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Recent News</h3>
                  <Link href={`/news?symbol=${tickerParam}`} className="text-[10px] hover:underline" style={{ color: BLU, fontFamily: mono }}>All News →</Link>
                </div>
                <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                {!newsSummary && (
                  <button
                    onClick={async () => {
                      setSummaryLoading(true);
                      try { const s = await fetchStockNewsSummary(tickerParam); setNewsSummary(s); } catch { /* ignore */ }
                      setSummaryLoading(false);
                    }}
                    disabled={summaryLoading}
                    className="w-full mb-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.15em] border"
                    style={{ fontFamily: mono, borderColor: GRY, background: summaryLoading ? GRY : INK, color: summaryLoading ? TM : WHT, cursor: summaryLoading ? "wait" : "pointer" }}
                  >
                    {summaryLoading ? "Analyzing…" : "Generate AI News Summary"}
                  </button>
                )}
                {newsSummary && !newsSummary.error && (() => {
                  const sc = newsSummary.sentimentScore;
                  const sentCfg: Record<string, { icon: string; color: string }> = {
                    bullish: { icon: "▲", color: "#2e7d32" }, bearish: { icon: "▼", color: "#c62828" },
                    neutral: { icon: "─", color: TM }, mixed: { icon: "◆", color: "#e65100" },
                  };
                  const cfg = sentCfg[newsSummary.sentiment] || sentCfg.neutral;
                  return (
                    <div className="mb-3 p-3 border rounded" style={{ borderColor: GRY, background: "#fafaf5" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold" style={{ color: cfg.color }}>{cfg.icon}</span>
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em]" style={{ fontFamily: sans, color: cfg.color }}>
                          {newsSummary.sentiment} ({sc > 0 ? "+" : ""}{sc.toFixed(2)})
                        </span>
                      </div>
                      <p className="text-[13px] font-bold mb-1" style={{ fontFamily: serif, color: INK }}>{newsSummary.headline}</p>
                      <p className="text-[12px] leading-relaxed" style={{ fontFamily: serif, color: T2 }}>{newsSummary.summary}</p>
                      <div className="mt-2 text-[9px]" style={{ fontFamily: mono, color: TM }}>
                        {newsSummary.articlesAnalyzed} articles · {newsSummary.model}
                      </div>
                    </div>
                  );
                })()}
                {newsArticles.slice(0, 6).map((a, i) => {
                  const ago = (() => {
                    const diff = Date.now() - new Date(a.publishedAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 60) return `${mins}m`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs}h`;
                    return `${Math.floor(hrs / 24)}d`;
                  })();
                  return (
                    <a key={i} href={a.link} target="_blank" rel="noopener noreferrer" className="block py-2 hover:bg-[#f0ebe0]" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                      <div className="text-[12px] leading-snug font-semibold" style={{ fontFamily: serif, color: INK }}>{a.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {a.publisher && <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{a.publisher}</span>}
                        <span className="text-[9px] tabular-nums" style={{ fontFamily: mono, color: TM }}>{ago}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}

            {fundamentals && fundamentals.income.length > 0 && (
              <div className="spread-item">
                <WSJSection title="Financial Statements" />
                <FundamentalsPanel data={fundamentals} />
              </div>
            )}

            {fundamentals && fundamentals.income.length > 0 && (() => {
              const latest = fundamentals.income[fundamentals.income.length - 1];
              const revDiv = Math.abs(latest.revenue ?? 0) >= 1e9 ? 1e9 : 1e6;
              const revUnit = revDiv === 1e9 ? "B" : "M";
              const niDiv = Math.abs(latest.netIncome ?? 0) >= 1e9 ? 1e9 : 1e6;
              const niUnit = niDiv === 1e9 ? "B" : "M";
              return (
                <div className="spread-item border p-4" style={{ borderColor: GRY, background: WHT }}>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>
                    Income Snapshot <span className="ml-2 font-normal" style={{ color: TM }}>{latest.period}</span>
                  </h3>
                  <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: "Revenue", v: latest.revenue != null ? `$${(latest.revenue / revDiv).toFixed(1)}${revUnit}` : "N/A" },
                      { l: "Net Income", v: latest.netIncome != null ? `$${(latest.netIncome / niDiv).toFixed(1)}${niUnit}` : "N/A" },
                      { l: "Gross Margin", v: latest.grossMargin != null ? `${latest.grossMargin.toFixed(1)}%` : "N/A" },
                      { l: "Net Margin", v: latest.netMargin != null ? `${latest.netMargin.toFixed(1)}%` : "N/A" },
                      { l: "Op. Income", v: latest.operatingIncome != null ? `$${(latest.operatingIncome / revDiv).toFixed(1)}${revUnit}` : "N/A" },
                      { l: "EPS", v: latest.eps != null ? `$${latest.eps.toFixed(2)}` : "N/A" },
                    ].map((cell) => (
                      <div key={cell.l} className="text-center py-2 border" style={{ borderColor: GRY }}>
                        <div className="text-[8px] uppercase tracking-wider font-extrabold" style={{ fontFamily: sans, color: TM }}>{cell.l}</div>
                        <div className="text-[14px] font-bold tabular-nums mt-0.5" style={{ fontFamily: mono }}>{cell.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {fundamentals && Object.keys(fundamentals.calendar).length > 0 && (
              <div className="spread-item"><EarningsCard calendar={fundamentals.calendar} /></div>
            )}

            {balanceSheet && balanceSheet.items.length > 0 && (
              <div className="spread-item"><BalanceSheetPanel items={balanceSheet.items} quarterly={quarterly} /></div>
            )}

            {balanceSheet && balanceSheet.items.length > 0 && (() => {
              const latest = balanceSheet.items[balanceSheet.items.length - 1];
              const d = (v: number | null) => v != null ? formatCurrency(v) : "N/A";
              return (
                <div className="spread-item border p-4" style={{ borderColor: GRY, background: WHT }}>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>
                    Balance Sheet Snapshot <span className="ml-2 font-normal" style={{ color: TM }}>{latest.period}</span>
                  </h3>
                  <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                  {[
                    { l: "Total Assets", v: d(latest.totalAssets) },
                    { l: "Total Liabilities", v: d(latest.totalLiabilities) },
                    { l: "Equity", v: d(latest.stockholdersEquity) },
                    { l: "Retained Earnings", v: d(latest.retainedEarnings) },
                    { l: "Goodwill", v: d(latest.goodwill) },
                    { l: "Long-Term Debt", v: d(latest.longTermDebt) },
                  ].map((row, i) => (
                    <div key={row.l} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                      <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{row.l}</span>
                      <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: mono }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {cashFlow && cashFlow.items.length > 0 && (
              <div className="spread-item"><CashFlowPanel items={cashFlow.items} quarterly={quarterly} /></div>
            )}

            {cashFlow && cashFlow.items.length > 0 && (() => {
              const latest = cashFlow.items[cashFlow.items.length - 1];
              const d = (v: number | null) => v != null ? formatCurrency(v) : "N/A";
              const neg = (v: number | null) => v != null ? formatCurrency(Math.abs(v)) : "N/A";
              return (
                <div className="spread-item border p-4" style={{ borderColor: GRY, background: WHT }}>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>
                    Capital Allocation <span className="ml-2 font-normal" style={{ color: TM }}>{latest.period}</span>
                  </h3>
                  <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
                  {[
                    { l: "CapEx", v: neg(latest.capex) },
                    { l: "Dividends Paid", v: neg(latest.dividendsPaid) },
                    { l: "Buybacks", v: neg(latest.stockBuyback) },
                    { l: "Debt Repaid", v: neg(latest.debtRepayment) },
                    { l: "Debt Issued", v: d(latest.debtIssuance) },
                    { l: "Net Change Cash", v: d(latest.netChangeInCash) },
                  ].map((row, i) => (
                    <div key={row.l} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                      <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{row.l}</span>
                      <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: mono }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {holders && <div className="spread-item"><HoldersPanel summary={holders.summary} holders={holders.holders} /></div>}

            {fundamentals && fundamentals.splits.length > 0 && (
              <div className="spread-item"><SplitRecord splits={fundamentals.splits} /></div>
            )}
          </div>
        </>
      )}
    </WSJLayout>
  );
}
