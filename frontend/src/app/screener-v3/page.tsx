"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import MiniChart from "@/components/MiniChart";
import FullChartWSJ from "@/components/FullChartWSJ";
import { fetchBulkPrices, fetchBulkFundamentals, type PriceBar, type BulkFundamentalsEntry } from "@/lib/api";
import { formatMastheadDate } from "@/lib/format";

/* ─── Default watchlist ─── */
const DEFAULT_WATCHLIST = [
  "AAPL", "MSFT", "GOOG", "AMZN", "NVDA",
  "META", "TSLA", "JPM", "V", "JNJ",
  "ORCL", "ADBE", "VZ", "O",
];

const PERIOD_OPTIONS = ["2y", "3y", "5y", "10y"];

/* ── WSJ colour tokens ── */
const WHT  = "#ffffff";
const BG   = "#f8f7f5";
const INK  = "#1a1a1a";
const GRY  = "#c8c8c8";
const BLU  = "#1e4d8c";
const RED  = "#8b0000";
const TM   = "#888888";

const GRN  = "#1a4d2e";

const display = "'Playfair Display', 'Georgia', serif";
const mono    = "'IBM Plex Mono', 'Courier New', monospace";
const sans    = "'Inter', 'Helvetica Neue', system-ui, sans-serif";

/* ── Derive last price / change from price bars ── */
function getTickerStats(bars: PriceBar[]) {
  if (!bars || bars.length < 2) return null;
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const change = last.close - prev.close;
  const changePct = (change / prev.close) * 100;
  return { last: last.close, change, changePct };
}

export default function ScreenerV3Page() {
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [period, setPeriod] = useState("5y");
  const [data, setData] = useState<Record<string, PriceBar[]>>({});
  const [financials, setFinancials] = useState<Record<string, BulkFundamentalsEntry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickerInput, setTickerInput] = useState("");
  const [showRevenue, setShowRevenue] = useState(true);
  const [showDividends, setShowDividends] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [focusTicker, setFocusTicker] = useState<string | null>(null);
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTicker = () => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !watchlist.includes(t)) {
      setWatchlist((prev) => [...prev, t]);
    }
    setTickerInput("");
  };

  const handleRemoveTicker = (t: string) => {
    setWatchlist((prev) => prev.filter((x) => x !== t));
    setData((prev) => {
      const next = { ...prev };
      delete next[t];
      return next;
    });
  };

  /* Scroll to chart on sidebar click */
  const scrollToChart = (ticker: string) => {
    setSelectedTicker(ticker);
    const el = chartRefs.current[ticker];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setSelectedTicker(null), 2000);
    }
  };

  /* Today's date for masthead */
  const dateStr = formatMastheadDate();

  /* Count gainers / losers / unchanged */
  const sidebarStats = watchlist.reduce(
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

  return (
    <div className="min-h-screen flex" style={{ background: BG, color: INK }}>

      {/* ═══ RIGHT SIDEBAR — Watchlist ═══ */}
      <aside
        className="fixed right-0 top-0 h-full z-[60] flex flex-col transition-all duration-300 overflow-hidden"
        style={{
          width: sidebarOpen ? 280 : 0,
          background: WHT,
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
                  <span style={{ color: GRN }}>▲ {sidebarStats.gainers}</span>
                  <span style={{ color: RED }}>▼ {sidebarStats.losers}</span>
                  <span style={{ color: TM }}>▬ {sidebarStats.unchanged}</span>
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
                background: BG,
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
                const stats = data[t] ? getTickerStats(data[t]) : null;
                const isSelected = selectedTicker === t;
                return (
                  <div
                    key={t}
                    className="grid px-3 py-1.5 cursor-pointer transition-colors"
                    style={{
                      gridTemplateColumns: "1fr 70px 52px 52px",
                      borderTop: i > 0 ? `1px solid ${GRY}20` : "none",
                      background: isSelected ? `${BLU}10` : i % 2 === 0 ? WHT : BG,
                    }}
                    onClick={() => setFocusTicker(t)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = `${BLU}08`)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? `${BLU}10` : i % 2 === 0 ? WHT : BG)}
                  >
                    {/* Symbol */}
                    <span
                      className="text-[11px] font-bold truncate"
                      style={{ fontFamily: mono, color: INK }}
                    >
                      {t}
                    </span>
                    {/* Last */}
                    <span
                      className="text-[11px] font-bold tabular-nums text-right"
                      style={{ fontFamily: mono, color: INK }}
                    >
                      {stats ? stats.last.toFixed(2) : "—"}
                    </span>
                    {/* Change */}
                    <span
                      className="text-[11px] font-bold tabular-nums text-right"
                      style={{
                        fontFamily: mono,
                        color: stats ? (stats.change >= 0 ? GRN : RED) : TM,
                      }}
                    >
                      {stats ? `${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(2)}` : "—"}
                    </span>
                    {/* Change % */}
                    <span
                      className="text-[11px] font-bold tabular-nums text-right"
                      style={{
                        fontFamily: mono,
                        color: stats ? (stats.changePct >= 0 ? GRN : RED) : TM,
                      }}
                    >
                      {stats ? `${stats.changePct >= 0 ? "+" : ""}${stats.changePct.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Sidebar footer */}
            <div
              className="px-3 py-2 text-center"
              style={{ borderTop: `1px solid ${GRY}`, background: BG }}
            >
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
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[61] px-1 py-6 transition-colors hover:opacity-80"
          style={{
            background: INK,
            color: WHT,
            fontFamily: mono,
            fontSize: 10,
            writingMode: "vertical-lr",
            letterSpacing: "0.15em",
            borderRadius: "4px 0 0 4px",
          }}
        >
          WATCHLIST
        </button>
      )}

      {/* ═══ Main column — shifts when sidebar open ═══ */}
      <div
        className="flex-1 min-h-screen transition-all duration-300"
        style={{ marginRight: sidebarOpen ? 280 : 0 }}
      >

      {/* ═══ MASTHEAD ═══ */}
      <header style={{ background: WHT }}>
        {/* Dateline row */}
        <div className="mx-auto max-w-[1600px] px-6 py-1 flex items-center justify-between">
          <span
            className="text-[9px] uppercase tracking-[0.2em] font-semibold"
            style={{ fontFamily: mono, color: TM }}
          >
            New York · London · Hong Kong · Tokyo
          </span>
          <span
            className="text-[9px] uppercase tracking-[0.2em]"
            style={{ fontFamily: mono, color: TM }}
          >
            {dateStr}
          </span>
        </div>
        {/* Heavy rule */}
        <div className="mx-6 h-[3px]" style={{ background: INK }} />

        {/* Title row */}
        <div className="mx-auto max-w-[1600px] px-6 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/"
              className="text-[10px] font-semibold hover:underline"
              style={{ fontFamily: mono, color: BLU }}
            >
              ← Home
            </Link>
            <span
              className="text-[9px] font-bold tracking-[0.1em]"
              style={{ fontFamily: mono, color: TM }}
            >
              MARKET SCREENER
            </span>
          </div>
          <div className="text-center py-1">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <h1
                className="text-[36px] font-normal tracking-[0.04em] leading-none"
                style={{ fontFamily: display, color: INK }}
              >
                The Zero Sum Journal
              </h1>
            </Link>
            {/* Double rule */}
            <div className="h-[2px] mt-3" style={{ background: INK }} />
            <div className="h-px mt-0.5" style={{ background: INK }} />
          </div>
        </div>

        {/* ═══ CONTROLS BAR ═══ */}
        <div className="mx-auto max-w-[1600px] px-6 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Period selector */}
            <div className="flex items-center gap-1">
              <span
                className="text-[8px] font-extrabold uppercase tracking-[0.15em] mr-2"
                style={{ fontFamily: sans, color: TM }}
              >
                Period
              </span>
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-2 py-0.5 text-[10px] font-bold transition-colors"
                  style={{
                    fontFamily: mono,
                    background: period === p ? INK : "transparent",
                    color: period === p ? WHT : TM,
                    border: `1px solid ${period === p ? INK : GRY}`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              {/* Add ticker */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTicker()}
                  placeholder="Add ticker…"
                  className="w-28 px-2 py-0.5 text-[10px] focus:outline-none"
                  style={{
                    fontFamily: mono,
                    background: WHT,
                    color: INK,
                    border: `1px solid ${GRY}`,
                  }}
                />
                <button
                  onClick={handleAddTicker}
                  className="px-2 py-0.5 text-[10px] font-bold transition-colors"
                  style={{
                    fontFamily: mono,
                    background: BLU,
                    color: WHT,
                    border: `1px solid ${BLU}`,
                  }}
                >
                  +
                </button>
              </div>

              {/* Refresh */}
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

              {/* Toggles */}
              <div className="flex items-center gap-1">
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

              {/* View mode: Grid / Chart */}
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
            </div>
          </div>
        </div>

        {/* Bottom rule */}
        <div className="h-px" style={{ background: GRY }} />
      </header>

      {/* ═══ MAIN ═══ */}
      <main className="mx-auto max-w-[1600px] px-6 py-5" style={{ background: BG }}>

        {/* Sidebar toggle button in controls area */}
        {!sidebarOpen && (
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setSidebarOpen(true)}
              className="px-2.5 py-0.5 text-[10px] font-bold transition-colors"
              style={{
                fontFamily: mono,
                background: "transparent",
                color: TM,
                border: `1px solid ${GRY}`,
              }}
            >
              Show Watchlist ▶
            </button>
          </div>
        )}

        {/* ── Watchlist tags ── */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {watchlist.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold"
              style={{
                fontFamily: mono,
                color: INK,
                border: `1px solid ${GRY}`,
                background: WHT,
              }}
            >
              <Link
                href={`/?ticker=${t}`}
                className="hover:underline transition-colors"
                style={{ color: BLU }}
              >
                {t}
              </Link>
              <button
                onClick={() => handleRemoveTicker(t)}
                className="transition-colors ml-0.5"
                style={{ color: GRY }}
                onMouseEnter={(e) => (e.currentTarget.style.color = RED)}
                onMouseLeave={(e) => (e.currentTarget.style.color = GRY)}
                title={`Remove ${t}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* ── Hairline ── */}
        <div className="h-px mb-4" style={{ background: GRY }} />

        {/* ── Error ── */}
        {error && (
          <div
            className="mb-4 p-3 text-sm"
            style={{
              fontFamily: mono,
              border: `1px solid ${RED}`,
              color: RED,
              background: WHT,
            }}
          >
            {error}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && Object.keys(data).length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {watchlist.map((t) => (
              <div
                key={t}
                className="p-4 animate-pulse"
                style={{ background: WHT, border: `1px solid ${GRY}` }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-3 w-16" style={{ background: GRY }} />
                  <div className="h-3 w-12" style={{ background: GRY }} />
                </div>
                <div className="h-[2px] mb-2" style={{ background: INK }} />
                <div className="h-[260px]" style={{ background: BG }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Full chart focus view ── */}
        {focusTicker && data[focusTicker] && data[focusTicker].length > 0 && (
          <div
            className="border"
            style={{ background: WHT, borderColor: GRY }}
          >
            {/* Prev / Next navigation */}
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{ background: BG, borderBottom: `1px solid ${GRY}` }}
            >
              <button
                onClick={() => {
                  const idx = watchlist.indexOf(focusTicker);
                  const prev = idx > 0 ? watchlist[idx - 1] : watchlist[watchlist.length - 1];
                  setFocusTicker(prev);
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
                  const next = idx < watchlist.length - 1 ? watchlist[idx + 1] : watchlist[0];
                  setFocusTicker(next);
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
            {/* Back to grid */}
            <div className="px-4 py-3 text-center" style={{ background: BG, borderTop: `1px solid ${GRY}` }}>
              <button
                onClick={() => setFocusTicker(null)}
                className="px-4 py-1 text-[10px] font-bold transition-colors hover:opacity-80"
                style={{ fontFamily: mono, color: WHT, background: INK }}
              >
                ← BACK TO GRID
              </button>
            </div>
          </div>
        )}

        {/* ── Charts grid ── */}
        {!focusTicker && Object.keys(data).length > 0 && (
          <div className={`grid gap-4 ${sidebarOpen ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"}`}>
            {watchlist.map(
              (t) =>
                data[t] &&
                data[t].length > 0 && (
                  <div
                    key={t}
                    ref={(el) => { chartRefs.current[t] = el; }}
                    className="relative group transition-shadow duration-500"
                    style={{
                      boxShadow: selectedTicker === t ? `0 0 0 2px ${BLU}` : "none",
                    }}
                  >
                    {/* Expand button */}
                    <button
                      onClick={() => { setFocusTicker(t); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="absolute top-2 right-2 z-10 px-1.5 py-0.5 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        fontFamily: mono,
                        background: INK,
                        color: WHT,
                        border: `1px solid ${INK}`,
                      }}
                      title="Expand chart"
                    >
                      ⛶
                    </button>
                    <MiniChart
                      ticker={t}
                      data={data[t]}
                      fundamentals={financials[t]}
                      showRevenue={showRevenue}
                      showDividends={showDividends}
                      theme="wsj"
                    />
                  </div>
                )
            )}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && watchlist.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p
              className="text-lg"
              style={{ fontFamily: display, color: TM }}
            >
              No tickers in watchlist
            </p>
            <p
              className="text-sm mt-1"
              style={{ fontFamily: mono, color: GRY }}
            >
              Add some tickers above to get started
            </p>
          </div>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: INK }}>
        <div
          className="mx-auto max-w-[1600px] px-6 py-3 flex items-center justify-between text-[9px] uppercase tracking-[0.2em]"
          style={{ fontFamily: mono, color: `${WHT}66` }}
        >
          <span>Zero Sum — WSJ Screener</span>
          <span>Sample Data Only</span>
          <span>© 2026</span>
        </div>
      </footer>

      </div>{/* end main column */}
    </div>
  );
}
