"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import TickerAutocomplete from "@/components/TickerAutocomplete";
import MiniChart from "@/components/MiniChart";
import FullChartWSJ from "@/components/FullChartWSJ";
import {
  WHT, INK, GRY, BLU, RED, T2, TM,
  serif, mono, sans,
  Hair, WSJSection,
} from "@/lib/wsj";
import {
  fetchBulkPrices,
  fetchBulkFundamentals,
  type PriceBar,
  type BulkFundamentalsEntry,
} from "@/lib/api";
import { useWatchlist } from "@/lib/useWatchlist";
import { setAppBadge, clearAppBadge } from "@/lib/badge";

const PERIOD_OPTIONS: { key: string; label: string }[] = [
  { key: "1mo", label: "1M" },
  { key: "6mo", label: "6M" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1Y" },
  { key: "2y", label: "2Y" },
  { key: "5y", label: "5Y" },
];
const GRN = "var(--wsj-gain, #2e7d32)";

/* ── Lazy-loaded chart: only renders when visible ── */
function LazyChart({ ticker, data, fundamentals, showRevenue, showDividends, showMA, onExpand }: {
  ticker: string;
  data: PriceBar[];
  fundamentals?: BulkFundamentalsEntry;
  showRevenue: boolean;
  showDividends: boolean;
  showMA: boolean;
  onExpand: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative group" style={{ minHeight: 320 }}>
      {visible ? (
        <>
          <button
            onClick={onExpand}
            className="absolute top-2 right-2 z-10 px-1.5 py-0.5 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ fontFamily: "'IBM Plex Mono', monospace", background: "var(--wsj-ink, #1a1a1a)", color: "var(--wsj-white, #f5f0e8)", border: "1px solid var(--wsj-ink, #1a1a1a)" }}
            title="Expand chart"
          >
            ⛶
          </button>
          <MiniChart
            ticker={ticker}
            data={data}
            fundamentals={fundamentals}
            showRevenue={showRevenue}
            showDividends={showDividends}
            showMA={showMA}
            theme="wsj"
          />
        </>
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ height: 320, background: "var(--wsj-white, #f5f0e8)", border: "1px solid var(--wsj-grey, #c8c8c8)" }}
        >
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--wsj-muted, #888888)" }}>{ticker}</span>
        </div>
      )}
    </div>
  );
}

/* ── Derive last price / change from price bars ── */
function getTickerStats(bars: PriceBar[]) {
  if (!bars || bars.length < 2) return null;
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const change = last.close - prev.close;
  const changePct = (change / prev.close) * 100;
  return { last: last.close, change, changePct };
}

export default function WatchlistPage() {
  const { watchlist, add, remove, reorder } = useWatchlist();
  const [period, setPeriod] = useState("2y");
  const [data, setData] = useState<Record<string, PriceBar[]>>({});
  const [financials, setFinancials] = useState<Record<string, BulkFundamentalsEntry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRevenue, setShowRevenue] = useState(true);
  const [showDividends, setShowDividends] = useState(true);
  const [showMA, setShowMA] = useState(true);
  const [focusTicker, setFocusTicker] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768; // start closed on mobile
  });
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  /* ── Pagination ── */
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(watchlist.length / PAGE_SIZE));
  const pagedTickers = watchlist.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when watchlist changes
  useEffect(() => {
    if (page > Math.ceil(watchlist.length / PAGE_SIZE)) setPage(1);
  }, [watchlist.length, page]);

  const loadData = useCallback(async () => {
    if (watchlist.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const [priceRes, fundRes] = await Promise.all([
        fetchBulkPrices(watchlist, period),
        fetchBulkFundamentals(watchlist),
      ]);
      setData(priceRes.data);
      setFinancials(fundRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [watchlist, period]);

  // Update app badge with big mover count (>3% change)
  useEffect(() => {
    if (Object.keys(data).length === 0) { clearAppBadge(); return; }
    let bigMovers = 0;
    for (const t of watchlist) {
      const s = data[t] ? getTickerStats(data[t]) : null;
      if (s && Math.abs(s.changePct) >= 3) bigMovers++;
    }
    if (bigMovers > 0) setAppBadge(bigMovers);
    else clearAppBadge();
  }, [data, watchlist]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // If focused ticker gets removed, unfocus
  useEffect(() => {
    if (focusTicker && !watchlist.includes(focusTicker)) {
      setFocusTicker(null);
    }
  }, [watchlist, focusTicker]);

  /* Count gainers / losers */
  const stats = watchlist.reduce(
    (acc, t) => {
      const s = data[t] ? getTickerStats(data[t]) : null;
      if (!s) return acc;
      if (s.change > 0) acc.gainers++;
      else if (s.change < 0) acc.losers++;
      else acc.unchanged++;
      return acc;
    },
    { gainers: 0, losers: 0, unchanged: 0 }
  );

  const navContent = (
    <>
      <div className="flex items-center gap-3">
        <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
          Home
        </Link>
        <Link href="/screener-v4" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
          Screener
        </Link>
        <Link href="/heatmap" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
          Heatmap
        </Link>
        <Link href="/bubble" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
          Bubble Map
        </Link>
      </div>
      <TickerAutocomplete onAdd={(t: string) => { add(t); }} placeholder="Search ticker…" />
    </>
  );

  return (
    <WSJLayout navContent={navContent} wideContent>
      {/* ═══ RIGHT SIDEBAR — Watchlist ═══ */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-[59] bg-black/30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className="fixed right-0 top-0 h-full z-[60] flex flex-col transition-all duration-300 overflow-hidden"
        style={{
          width: sidebarOpen ? 280 : 0,
          background: "var(--wsj-white, #f5f0e8)",
          borderLeft: sidebarOpen ? `1px solid ${GRY}` : "none",
        }}
      >
        {sidebarOpen && (
          <>
            {/* Sidebar header */}
            <div className="px-3 pt-3 pb-2" style={{ borderBottom: `2px solid ${INK}` }}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[9px] font-extrabold uppercase tracking-[0.2em]"
                  style={{ fontFamily: sans, color: INK }}
                >
                  Watchlist
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-[10px] font-bold hover:opacity-60 transition-opacity"
                  style={{ fontFamily: mono, color: TM }}
                >
                  ✕
                </button>
              </div>
              {/* Gainers / Losers summary */}
              {Object.keys(data).length > 0 && (
                <div className="flex items-center gap-2 text-[9px] tabular-nums" style={{ fontFamily: mono }}>
                  <span style={{ color: GRN }}>▲ {stats.gainers}</span>
                  <span style={{ color: RED }}>▼ {stats.losers}</span>
                  <span style={{ color: TM }}>▬ {stats.unchanged}</span>
                </div>
              )}
            </div>

            {/* Column headers */}
            <div
              className="grid px-3 py-1.5 text-[7px] font-extrabold uppercase tracking-[0.15em]"
              style={{
                gridTemplateColumns: "1fr 70px 52px 52px",
                fontFamily: sans,
                color: TM,
                borderBottom: `1px solid ${GRY}`,
                background: "var(--wsj-bg, #e8e0d0)",
              }}
            >
              <span>Symbol</span>
              <span className="text-right">Last</span>
              <span className="text-right">Chg</span>
              <span className="text-right">Chg%</span>
            </div>

            {/* Stock rows */}
            <div className="flex-1 overflow-y-auto">
              {watchlist.map((t, i) => {
                const s = data[t] ? getTickerStats(data[t]) : null;
                const isSelected = selectedTicker === t;
                return (
                  <div
                    key={t}
                    className="grid px-3 py-1.5 cursor-pointer transition-colors"
                    style={{
                      gridTemplateColumns: "1fr 70px 52px 52px",
                      borderTop: i > 0 ? `1px solid ${GRY}20` : "none",
                      background: isSelected ? `${BLU}10` : i % 2 === 0 ? WHT : "var(--wsj-bg, #e8e0d0)",
                    }}
                    onClick={() => setFocusTicker(t)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = `${BLU}08`)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? `${BLU}10` : i % 2 === 0 ? WHT : "var(--wsj-bg, #e8e0d0)")}
                  >
                    <span className="text-[11px] font-bold truncate" style={{ fontFamily: mono, color: INK }}>{t}</span>
                    <span className="text-[11px] font-bold tabular-nums text-right" style={{ fontFamily: mono, color: INK }}>
                      {s ? s.last.toFixed(2) : "—"}
                    </span>
                    <span
                      className="text-[11px] font-bold tabular-nums text-right"
                      style={{ fontFamily: mono, color: s ? (s.change >= 0 ? GRN : RED) : TM }}
                    >
                      {s ? `${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)}` : "—"}
                    </span>
                    <span
                      className="text-[11px] font-bold tabular-nums text-right"
                      style={{ fontFamily: mono, color: s ? (s.changePct >= 0 ? GRN : RED) : TM }}
                    >
                      {s ? `${s.changePct >= 0 ? "+" : ""}${s.changePct.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Sidebar footer */}
            <div className="px-3 py-2 text-center" style={{ borderTop: `1px solid ${GRY}`, background: "var(--wsj-bg, #e8e0d0)" }}>
              <span className="text-[8px] uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>
                {watchlist.length} Symbols
              </span>
            </div>
          </>
        )}
      </aside>

      {/* Sidebar toggle (visible when closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed z-[61] transition-all hover:opacity-90
                     md:right-0 md:top-1/2 md:-translate-y-1/2 md:px-1 md:py-6
                     right-3 bottom-4 rounded-full md:rounded-none md:rounded-l shadow-lg md:shadow-none"
          style={{
            background: INK,
            color: WHT,
            fontFamily: mono,
          }}
        >
          {/* Desktop: vertical text tab */}
          <span
            className="hidden md:inline text-[10px] tracking-[0.15em]"
            style={{ writingMode: "vertical-lr" }}
          >
            WATCHLIST
          </span>
          {/* Mobile: small floating pill */}
          <span className="md:hidden flex items-center gap-1 px-3 py-2 text-[11px] font-semibold tracking-wide">
            ★ <span className="text-[10px]">List</span>
          </span>
        </button>
      )}

      {/* ═══ Main content — shifts when sidebar open ═══ */}
      <div
        style={{
          marginRight: sidebarOpen && !isMobile ? 280 : 0,
          transition: 'margin-right 300ms ease',
        }}
      >
      <WSJSection title="Watchlist" />
        {/* ── Controls ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          {/* Left: period + view toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Period */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] mr-1" style={{ fontFamily: sans, color: TM }}>
                Period
              </span>
              {PERIOD_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className="px-2 py-0.5 text-[10px] font-bold transition-colors"
                  style={{
                    fontFamily: mono,
                    background: period === key ? INK : "transparent",
                    color: period === key ? WHT : TM,
                    border: `1px solid ${period === key ? INK : GRY}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* View mode */}
            <div className="flex items-center border" style={{ borderColor: GRY }}>
              <button
                onClick={() => setFocusTicker(null)}
                className="px-2.5 py-0.5 text-[10px] font-bold transition-colors"
                style={{
                  fontFamily: mono,
                  background: !focusTicker ? INK : "transparent",
                  color: !focusTicker ? WHT : TM,
                }}
              >
                ▦ Grid
              </button>
              <button
                onClick={() => { if (!focusTicker && watchlist.length > 0) setFocusTicker(watchlist[0]); }}
                className="px-2.5 py-0.5 text-[10px] font-bold transition-colors"
                style={{
                  fontFamily: mono,
                  background: focusTicker ? INK : "transparent",
                  color: focusTicker ? WHT : TM,
                }}
              >
                ⛶ Chart
              </button>
            </div>

            {/* MA / Rev / Div toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowMA((v) => !v)}
                className="px-2 py-0.5 text-[10px] font-bold transition-colors"
                style={{
                  fontFamily: mono,
                  background: showMA ? INK : "transparent",
                  color: showMA ? WHT : TM,
                  border: `1px solid ${showMA ? INK : GRY}`,
                }}
              >
                MA
              </button>
              <button
                onClick={() => setShowRevenue((v) => !v)}
                className="px-2 py-0.5 text-[10px] font-bold transition-colors"
                style={{
                  fontFamily: mono,
                  background: showRevenue ? INK : "transparent",
                  color: showRevenue ? WHT : TM,
                  border: `1px solid ${showRevenue ? INK : GRY}`,
                }}
              >
                Rev
              </button>
              <button
                onClick={() => setShowDividends((v) => !v)}
                className="px-2 py-0.5 text-[10px] font-bold transition-colors"
                style={{
                  fontFamily: mono,
                  background: showDividends ? INK : "transparent",
                  color: showDividends ? WHT : TM,
                  border: `1px solid ${showDividends ? INK : GRY}`,
                }}
              >
                Div
              </button>
            </div>
          </div>

          {/* Right: add ticker + refresh */}
          <div className="flex items-center gap-2">
            <TickerAutocomplete onAdd={(t) => add(t)} />
            <button
              onClick={loadData}
              disabled={loading}
              className="px-2.5 py-0.5 text-[10px] font-bold transition-colors disabled:opacity-50"
              style={{
                fontFamily: mono,
                background: "transparent",
                color: TM,
                border: `1px solid ${GRY}`,
              }}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        <Hair />

        {/* ── Watchlist summary + tags ── */}
        <div className="my-3 flex flex-wrap items-center gap-2">
          {/* Stats */}
          {Object.keys(data).length > 0 && (
            <div className="flex items-center gap-2 text-[9px] tabular-nums mr-3" style={{ fontFamily: mono }}>
              <span style={{ color: GRN }}>▲ {stats.gainers}</span>
              <span style={{ color: RED }}>▼ {stats.losers}</span>
              <span style={{ color: TM }}>▬ {stats.unchanged}</span>
              <span style={{ color: TM }}>· {watchlist.length} total</span>
            </div>
          )}
          {/* Ticker tags */}
          {watchlist.map((t) => {
            const s = data[t] ? getTickerStats(data[t]) : null;
            return (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                style={{
                  fontFamily: mono,
                  color: INK,
                  border: `1px solid ${focusTicker === t ? BLU : GRY}`,
                  background: focusTicker === t ? `${BLU}10` : WHT,
                }}
                onClick={() => setFocusTicker(t)}
              >
                {t}
                {s && (
                  <span style={{ color: s.changePct >= 0 ? GRN : RED, fontSize: 9 }}>
                    {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(1)}%
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); remove(t); }}
                  className="transition-colors ml-0.5"
                  style={{ color: GRY }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = RED)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = GRY)}
                  title={`Remove ${t}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>

        <Hair />


        {/* ── Error ── */}
        {error && (
          <div
            className="my-4 p-3 text-sm"
            style={{ fontFamily: mono, border: `1px solid ${RED}`, color: RED, background: WHT }}
          >
            {error}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && Object.keys(data).length === 0 && (
          <div className={`grid gap-3 sm:gap-4 mt-4 grid-cols-1 sm:grid-cols-2 ${sidebarOpen && !isMobile ? "xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
            {pagedTickers.map((t) => (
              <div key={t} className="p-4 animate-pulse" style={{ background: WHT, border: `1px solid ${GRY}` }}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-3 w-16" style={{ background: GRY }} />
                  <div className="h-3 w-12" style={{ background: GRY }} />
                </div>
                <div className="h-[2px] mb-2" style={{ background: INK }} />
                <div className="h-[260px]" style={{ background: "var(--wsj-bg, #e8e0d0)" }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Full chart focus view ── */}
        {focusTicker && data[focusTicker] && data[focusTicker].length > 0 && (
          <div className="mt-4 border" style={{ background: WHT, borderColor: GRY }}>
            {/* Prev / Next */}
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{ background: "var(--wsj-bg, #e8e0d0)", borderBottom: `1px solid ${GRY}` }}
            >
              <button
                onClick={() => {
                  const idx = watchlist.indexOf(focusTicker);
                  setFocusTicker(watchlist[idx > 0 ? idx - 1 : watchlist.length - 1]);
                }}
                className="px-2 py-0.5 text-[10px] font-bold transition-colors hover:opacity-80"
                style={{ fontFamily: mono, color: BLU, background: "transparent", border: `1px solid ${GRY}` }}
              >
                ◀ Prev
              </button>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>
                {watchlist.indexOf(focusTicker) + 1} / {watchlist.length}
              </span>
              <button
                onClick={() => {
                  const idx = watchlist.indexOf(focusTicker);
                  setFocusTicker(watchlist[idx < watchlist.length - 1 ? idx + 1 : 0]);
                }}
                className="px-2 py-0.5 text-[10px] font-bold transition-colors hover:opacity-80"
                style={{ fontFamily: mono, color: BLU, background: "transparent", border: `1px solid ${GRY}` }}
              >
                Next ▶
              </button>
            </div>
            <FullChartWSJ
              ticker={focusTicker}
              data={data[focusTicker]}
              fundamentals={financials[focusTicker]}
              onClose={() => setFocusTicker(null)}
            />
          </div>
        )}

        {/* ── Charts grid ── */}
        {!focusTicker && Object.keys(data).length > 0 && (
          <>
            <div className={`grid gap-3 sm:gap-4 mt-4 grid-cols-1 sm:grid-cols-2 ${sidebarOpen && !isMobile ? "xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
              {pagedTickers.map(
                (t) =>
                  data[t] &&
                  data[t].length > 0 && (
                    <LazyChart
                      key={t}
                      ticker={t}
                      data={data[t]}
                      fundamentals={financials[t]}
                      showRevenue={showRevenue}
                      showDividends={showDividends}
                      showMA={showMA}
                      onExpand={() => { setFocusTicker(t); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    />
                  )
              )}
            </div>

            {/* ── Pagination controls ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-5 mb-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 text-[10px] font-bold transition-colors disabled:opacity-30"
                  style={{ fontFamily: mono, color: BLU, border: `1px solid ${GRY}`, background: "transparent" }}
                >
                  ◀ Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="px-2 py-1 text-[10px] font-bold transition-colors"
                    style={{
                      fontFamily: mono,
                      background: page === p ? INK : "transparent",
                      color: page === p ? WHT : TM,
                      border: `1px solid ${page === p ? INK : GRY}`,
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 text-[10px] font-bold transition-colors disabled:opacity-30"
                  style={{ fontFamily: mono, color: BLU, border: `1px solid ${GRY}`, background: "transparent" }}
                >
                  Next ▶
                </button>
                <span className="ml-2 text-[9px]" style={{ fontFamily: mono, color: TM }}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, watchlist.length)} of {watchlist.length}
                </span>
              </div>
            )}
          </>
        )}

        {/* ── Empty state ── */}
        {!loading && watchlist.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg" style={{ fontFamily: serif, color: TM }}>
              Your watchlist is empty
            </p>
            <p className="text-sm mt-1" style={{ fontFamily: mono, color: GRY }}>
              Add tickers above or use the ★ button on other pages
            </p>
          </div>
        )}
      </div>{/* end margin wrapper */}
      </WSJLayout>
  );
}
