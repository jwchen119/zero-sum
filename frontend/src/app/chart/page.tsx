"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TechnicalChart from "@/components/TechnicalChart";
import TickerAutocomplete from "@/components/TickerAutocomplete";
import { fetchPrices, fetchTAPatterns, fetchBulkPrices, type PriceBar, type TAPatternResponse } from "@/lib/api";
import {
  WHT, BG, INK, GRY, T2, TM, GAIN, LOSS,
  serif, mono, sans,
} from "@/lib/wsj";
import { useWatchlist } from "@/lib/useWatchlist";
import { useWatchlistGroups } from "@/lib/useWatchlistGroups";
import { useTheme } from "@/lib/useTheme";
import { DEFAULT_CHART_TICKER } from "@/lib/benchmarks";

/* ── Period / Interval config ── */
const PERIODS = ["3mo", "6mo", "1y", "2y", "5y"] as const;
const PERIOD_LABELS: Record<string, string> = {
  "3mo": "3M", "6mo": "6M", "1y": "1Y", "2y": "2Y", "5y": "5Y",
};
const INTRADAY = [
  { label: "15m", interval: "15m", period: "60d" },
  { label: "1H",  interval: "1h",  period: "180d" },
  { label: "4H",  interval: "4h",  period: "730d" },
];

const DEFAULT_TICKER = DEFAULT_CHART_TICKER;

/* ═══════════════════════════════════════════ */
/*  Inner component (uses useSearchParams)     */
/* ═══════════════════════════════════════════ */
function ChartTerminal() {
  const router = useRouter();
  const params = useSearchParams();
  const tickerParam = (params.get("symbol") || params.get("ticker") || DEFAULT_TICKER).toUpperCase();

  /* ── State ── */
  const [ticker, setTicker] = useState(tickerParam);
  const [period, setPeriod] = useState("2y");
  const [candleInterval, setCandleInterval] = useState("1d");
  const [data, setData] = useState<PriceBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [taData, setTaData] = useState<TAPatternResponse | null>(null);
  const [taLoading, setTaLoading] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [wlOpen, setWlOpen] = useState(false);
  // Open sidebar by default on desktop once we know the viewport
  const wlInitRef = useRef(false);
  useEffect(() => {
    if (wlInitRef.current) return;
    wlInitRef.current = true;
    if (!isMobile) setWlOpen(true);
  }, [isMobile]);
  const [wlPrices, setWlPrices] = useState<Record<string, PriceBar[]>>({});

  /* ── Split / comparison mode ── */
  const [splitMode, setSplitMode] = useState(false);
  const [splitTicker, setSplitTicker] = useState("");
  const [splitData, setSplitData] = useState<PriceBar[]>([]);
  const [splitTaData, setSplitTaData] = useState<TAPatternResponse | null>(null);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitError, setSplitError] = useState("");

  /* ── Watchlist hooks ── */
  const { watchlist, add: wlAdd, remove: wlRemove } = useWatchlist();
  const { groups, addGroup, removeGroup, addTicker, removeTicker } = useWatchlistGroups();
  const { theme, setTheme } = useTheme();
  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };
  const themeIcon = theme === "dark" ? "☾" : theme === "system" ? "◐" : "☀";
  const themeLabel = theme === "dark" ? "Dark" : theme === "system" ? "Auto" : "Light";

  /* ── Tabs: "All" = main watchlist, then groups ── */
  const [activeTab, setActiveTab] = useState("All");
  const [newGroupName, setNewGroupName] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);

  const activeTickers =
    activeTab === "All"
      ? watchlist
      : groups.find((g) => g.name === activeTab)?.tickers ?? [];

  /* ── Sync ticker with URL ── */
  useEffect(() => {
    if (tickerParam !== ticker) setTicker(tickerParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerParam]);

  /* ── Fetch price data ── */
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError("");
    const iv = candleInterval !== "1d" ? candleInterval : undefined;
    fetchPrices(ticker, period, ac.signal, iv)
      .then((res) => { setData(res.data); setLoading(false); })
      .catch((e) => { if (e.name !== "AbortError") { setError(e.message); setLoading(false); } });
    return () => ac.abort();
  }, [ticker, period, candleInterval]);

  /* ── Fetch TA patterns (daily only) ── */
  useEffect(() => {
    if (candleInterval !== "1d") { setTaData(null); return; }
    const ac = new AbortController();
    setTaLoading(true);
    fetchTAPatterns(ticker, period, ac.signal)
      .then((d) => { setTaData(d); setTaLoading(false); })
      .catch((e) => { if (e.name !== "AbortError") setTaLoading(false); });
    return () => ac.abort();
  }, [ticker, period, candleInterval]);

  /* ── Fetch watchlist sidebar prices ── */
  useEffect(() => {
    if (!wlOpen || activeTickers.length === 0) return;
    const ac = new AbortController();
    fetchBulkPrices(activeTickers, "1y")
      .then((r) => { if (!ac.signal.aborted) setWlPrices(r.data); })
      .catch(() => {});
    return () => ac.abort();
  }, [wlOpen, activeTickers]);

  /* ── Fetch split ticker data ── */
  useEffect(() => {
    if (!splitMode || !splitTicker) { setSplitData([]); setSplitTaData(null); return; }
    const ac = new AbortController();
    setSplitLoading(true);
    setSplitError("");
    const iv = candleInterval !== "1d" ? candleInterval : undefined;
    fetchPrices(splitTicker, period, ac.signal, iv)
      .then((res) => { setSplitData(res.data); setSplitLoading(false); })
      .catch((e) => { if (e.name !== "AbortError") { setSplitError(e.message); setSplitLoading(false); } });
    return () => ac.abort();
  }, [splitMode, splitTicker, period, candleInterval]);

  useEffect(() => {
    if (!splitMode || !splitTicker || candleInterval !== "1d") { setSplitTaData(null); return; }
    const ac = new AbortController();
    fetchTAPatterns(splitTicker, period, ac.signal)
      .then((d) => { if (!ac.signal.aborted) setSplitTaData(d); })
      .catch(() => {});
    return () => ac.abort();
  }, [splitMode, splitTicker, period, candleInterval]);

  /* ── Navigate to ticker ── */
  const goToTicker = useCallback((sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setTicker(s);
    router.replace(`/chart?symbol=${encodeURIComponent(s)}`, { scroll: false });
  }, [router]);

  /* ── Keyboard: left/right to cycle watchlist ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = activeTickers.indexOf(ticker);
      if (idx < 0) return;
      if (e.key === "ArrowLeft" && idx > 0) {
        e.preventDefault();
        goToTicker(activeTickers[idx - 1]);
      } else if (e.key === "ArrowRight" && idx < activeTickers.length - 1) {
        e.preventDefault();
        goToTicker(activeTickers[idx + 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ticker, activeTickers, goToTicker]);

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: WHT }}>
      {/* ── Top accent line ── */}
      <div className="shrink-0" style={{ height: 2, background: INK }} />

      {/* ── Header bar ── */}
      <div
        className="shrink-0"
        style={{ borderBottom: `1px solid ${GRY}`, background: BG }}
      >
        {/* ── Row 1: Logo, search, ticker, controls ── */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{ height: isMobile ? 36 : 42, paddingLeft: isMobile ? 6 : 20, paddingRight: isMobile ? 6 : 20 }}
        >
          <div className="flex items-center min-w-0" style={{ gap: isMobile ? 4 : 12 }}>
            <a
              href="/"
              className="no-underline select-none shrink-0"
              style={{ fontFamily: mono, color: INK, fontSize: isMobile ? 11 : 13, fontWeight: 800, letterSpacing: "0.04em" }}
              title="Back to home"
            >
              0&sum;&times;
            </a>
            <div className="shrink-0" style={{ width: 1, height: isMobile ? 14 : 18, background: GRY }} />
            <TickerAutocomplete
              onAdd={goToTicker}
              placeholder={isMobile ? "Ticker…" : "Search ticker…"}
              inputClassName={`${isMobile ? "w-16" : "w-40"} px-1.5 py-0.5 text-xs font-bold focus:outline-none`}
              inputStyle={{
                fontFamily: mono,
                background: WHT,
                color: INK,
                border: `1px solid ${GRY}`,
                borderRadius: 2,
                fontSize: isMobile ? 10 : undefined,
              }}
            />
            <h2
              className="font-bold leading-none truncate"
              style={{ fontFamily: serif, color: INK, letterSpacing: "-0.01em", fontSize: isMobile ? 13 : 16 }}
            >
              {ticker}
            </h2>
            {!isMobile && (
              <span
                className="text-[10px] font-semibold uppercase"
                style={{ fontFamily: sans, color: TM, letterSpacing: "0.08em" }}
              >
                {candleInterval === "1d" ? `Daily · ${PERIOD_LABELS[period]}` : candleInterval.toUpperCase()}
              </span>
            )}
            {taLoading && (
              <span className="text-[9px] animate-pulse shrink-0" style={{ fontFamily: mono, color: TM }}>
                ● analyzing
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0" style={{ fontFamily: mono }}>
            {/* Period buttons — desktop only in row 1 */}
            {!isMobile && (
              <>
                <span className="text-[8px] font-bold uppercase tracking-widest mr-0.5" style={{ color: TM }}>
                  Intraday
                </span>
                {INTRADAY.map((itd) => {
                  const sel = candleInterval === itd.interval;
                  return (
                    <button
                      key={itd.interval}
                      onClick={() => { setPeriod(itd.period); setCandleInterval(itd.interval); }}
                      className="px-2 py-0.5 text-[11px] transition-all"
                      style={{
                        background: sel ? INK : "transparent",
                        color: sel ? WHT : T2,
                        border: `1px solid ${sel ? INK : "transparent"}`,
                        borderRadius: 2,
                        fontWeight: sel ? 700 : 500,
                      }}
                    >
                      {itd.label}
                    </button>
                  );
                })}
                <div style={{ width: 1, height: 16, background: GRY, margin: "0 4px" }} />
                <span className="text-[8px] font-bold uppercase tracking-widest mr-0.5" style={{ color: TM }}>
                  Daily
                </span>
                {PERIODS.map((p) => {
                  const sel = period === p && candleInterval === "1d";
                  return (
                    <button
                      key={p}
                      onClick={() => { setPeriod(p); setCandleInterval("1d"); }}
                      className="px-2 py-0.5 text-[11px] transition-all"
                      style={{
                        background: sel ? INK : "transparent",
                        color: sel ? WHT : T2,
                        border: `1px solid ${sel ? INK : "transparent"}`,
                        borderRadius: 2,
                        fontWeight: sel ? 700 : 500,
                      }}
                    >
                      {PERIOD_LABELS[p]}
                    </button>
                  );
                })}
                <div style={{ width: 1, height: 16, background: GRY, margin: "0 4px" }} />
                <button
                  onClick={() => {
                    setSplitMode((v) => !v);
                    if (!splitMode && !splitTicker) {
                      const alt = activeTickers.find((t) => t !== ticker);
                      if (alt) setSplitTicker(alt);
                    }
                  }}
                  className="px-2.5 py-0.5 text-[11px] transition-all"
                  style={{
                    background: splitMode ? INK : "transparent",
                    color: splitMode ? WHT : T2,
                    border: `1px solid ${splitMode ? INK : "transparent"}`,
                    borderRadius: 2,
                    fontWeight: splitMode ? 700 : 500,
                  }}
                  title="Split view: compare two stocks side by side"
                >
                  ⬒ Compare
                </button>
                {splitMode && (
                  <>
                    <span className="text-[9px]" style={{ color: TM, fontFamily: mono }}>vs</span>
                    <TickerAutocomplete
                      onAdd={(sym) => setSplitTicker(sym.toUpperCase())}
                      placeholder="Ticker…"
                      inputClassName="w-24 px-1.5 py-0.5 text-[11px] font-bold focus:outline-none"
                      inputStyle={{
                        fontFamily: mono,
                        background: WHT,
                        color: INK,
                        border: `1px solid ${GRY}`,
                        borderRadius: 2,
                      }}
                    />
                    {splitTicker && (
                      <span className="text-[11px] font-bold" style={{ color: INK, fontFamily: mono }}>{splitTicker}</span>
                    )}
                  </>
                )}
              </>
            )}
            <button
              onClick={() => setWlOpen((v) => !v)}
              className={`${isMobile ? "px-1.5 py-0 text-[10px]" : "px-2.5 py-0.5 text-[11px]"} transition-all`}
              style={{
                background: wlOpen ? INK : "transparent",
                color: wlOpen ? WHT : T2,
                border: `1px solid ${wlOpen ? INK : "transparent"}`,
                borderRadius: 2,
                fontWeight: wlOpen ? 700 : 500,
                lineHeight: isMobile ? "20px" : undefined,
              }}
              title="Toggle watchlist"
            >
              {isMobile ? "☰" : "☰ Watchlist"}
            </button>
            {!isMobile && <div style={{ width: 1, height: 16, background: GRY, margin: "0 4px" }} />}
            <button
              onClick={cycleTheme}
              className={`${isMobile ? "px-1.5 py-0 text-[10px]" : "px-2.5 py-0.5 text-[11px]"} transition-all`}
              style={{
                background: "transparent",
                color: T2,
                border: `1px solid transparent`,
                borderRadius: 2,
                fontWeight: 500,
                lineHeight: isMobile ? "20px" : undefined,
              }}
              title={`Theme: ${themeLabel}`}
            >
              {isMobile ? themeIcon : `${themeIcon} ${themeLabel}`}
            </button>
          </div>
        </div>

        {/* ── Row 2 (mobile only): period / interval buttons ── */}
        {isMobile && (
          <div
            className="flex items-center justify-center no-scrollbar"
            style={{
              height: 28,
              paddingLeft: 6,
              paddingRight: 6,
              gap: 1,
              borderTop: `1px solid ${GRY}`,
              fontFamily: mono,
            }}
          >
            {INTRADAY.map((itd) => {
              const sel = candleInterval === itd.interval;
              return (
                <button
                  key={itd.interval}
                  onClick={() => { setPeriod(itd.period); setCandleInterval(itd.interval); }}
                  className="px-1.5 py-0 text-[9px] transition-all shrink-0"
                  style={{
                    background: sel ? INK : "transparent",
                    color: sel ? WHT : T2,
                    border: `1px solid ${sel ? INK : "transparent"}`,
                    borderRadius: 2,
                    fontWeight: sel ? 700 : 500,
                    lineHeight: "18px",
                  }}
                >
                  {itd.label}
                </button>
              );
            })}
            <div className="shrink-0" style={{ width: 1, height: 12, background: GRY, margin: "0 1px" }} />
            {PERIODS.map((p) => {
              const sel = period === p && candleInterval === "1d";
              return (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setCandleInterval("1d"); }}
                  className="px-1.5 py-0 text-[9px] transition-all shrink-0"
                  style={{
                    background: sel ? INK : "transparent",
                    color: sel ? WHT : T2,
                    border: `1px solid ${sel ? INK : "transparent"}`,
                    borderRadius: 2,
                    fontWeight: sel ? 700 : 500,
                    lineHeight: "18px",
                  }}
                >
                  {PERIOD_LABELS[p]}
                </button>
              );
            })}
            <div className="shrink-0" style={{ width: 1, height: 12, background: GRY, margin: "0 1px" }} />
            <span className="text-[8px] font-semibold uppercase shrink-0" style={{ color: TM, letterSpacing: "0.04em" }}>
              {candleInterval === "1d" ? `${PERIOD_LABELS[period]}` : candleInterval.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* ── Body: chart + sidebar ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Chart area */}
        {!isMobile && splitMode && splitTicker ? (
          /* ── Split mode: two independent scroll panes ── */
          <div className="flex-1 flex min-w-0">
            {/* Primary pane */}
            <div className="flex-1 min-w-0 overflow-y-auto no-scrollbar px-1 py-1" style={{ borderRight: `1px solid ${GRY}` }}>
              {loading ? (
                <div className="flex h-full items-center justify-center" style={{ color: TM, fontFamily: mono }}>
                  <div className="text-center">
                    <div className="mb-2 text-sm">Loading {ticker}…</div>
                    <div className="mx-auto h-1 w-48 overflow-hidden rounded" style={{ background: GRY }}>
                      <div className="h-full animate-pulse rounded" style={{ background: INK, width: "40%" }} />
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="border p-4 text-center text-sm mt-8" style={{ borderColor: LOSS, color: LOSS, fontFamily: mono }}>Error: {error}</div>
              ) : data.length > 0 ? (
                <TechnicalChart
                  data={data} ticker={ticker} period={period}
                  taTrendlines={taData?.trendlines} taRanges={taData?.ranges}
                  taBreakouts={taData?.breakouts} taPatterns={taData?.chart_patterns}
                  taSwings={taData?.swing_points} taVolumeProfile={taData?.volume_profile}
                  taActiveSetups={taData?.active_setups} fullscreen compact
                />
              ) : (
                <div className="flex h-full items-center justify-center" style={{ color: TM, fontFamily: mono }}>No data for {ticker}.</div>
              )}
            </div>
            {/* Secondary pane */}
            <div className="flex-1 min-w-0 overflow-y-auto no-scrollbar px-1 py-1">
              {splitLoading ? (
                <div className="flex h-full items-center justify-center" style={{ color: TM, fontFamily: mono }}>
                  <div className="text-sm">Loading {splitTicker}…</div>
                </div>
              ) : splitError ? (
                <div className="border p-4 text-center text-sm mt-8" style={{ borderColor: LOSS, color: LOSS, fontFamily: mono }}>Error: {splitError}</div>
              ) : splitData.length > 0 ? (
                <TechnicalChart
                  data={splitData} ticker={splitTicker} period={period}
                  taTrendlines={splitTaData?.trendlines} taRanges={splitTaData?.ranges}
                  taBreakouts={splitTaData?.breakouts} taPatterns={splitTaData?.chart_patterns}
                  taSwings={splitTaData?.swing_points} taVolumeProfile={splitTaData?.volume_profile}
                  taActiveSetups={splitTaData?.active_setups} fullscreen compact
                />
              ) : (
                <div className="flex h-full items-center justify-center" style={{ color: TM, fontFamily: mono }}>No data for {splitTicker}.</div>
              )}
            </div>
          </div>
        ) : (
          /* ── Single chart mode ── */
          <div className={`flex-1 overflow-y-auto no-scrollbar min-w-0 flex flex-col ${isMobile ? "px-0.5 py-0.5" : "px-2 py-1"}`}>
          {loading && (
            <div
              className="flex h-full items-center justify-center"
              style={{ color: TM, fontFamily: mono }}
            >
              <div className="text-center">
                <div className="mb-2 text-sm">Loading {ticker} data…</div>
                <div className="mx-auto h-1 w-48 overflow-hidden rounded" style={{ background: GRY }}>
                  <div className="h-full animate-pulse rounded" style={{ background: INK, width: "40%" }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              className="border p-4 text-center text-sm mt-8"
              style={{ borderColor: LOSS, color: LOSS, fontFamily: mono }}
            >
              Error: {error}
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <TechnicalChart
              data={data}
              ticker={ticker}
              period={period}
              taTrendlines={taData?.trendlines}
              taRanges={taData?.ranges}
              taBreakouts={taData?.breakouts}
              taPatterns={taData?.chart_patterns}
              taSwings={taData?.swing_points}
              taVolumeProfile={taData?.volume_profile}
              taActiveSetups={taData?.active_setups}
              fullscreen
              compact={isMobile}
            />
          )}

          {!loading && !error && data.length === 0 && (
            <div className="flex h-full items-center justify-center" style={{ color: TM, fontFamily: mono }}>
              No price data available for {ticker}.
            </div>
          )}
          </div>
        )}

        {/* ── Watchlist sidebar / overlay ── */}
        {wlOpen && (
          <aside
            className={`flex flex-col overflow-hidden ${isMobile ? "fixed inset-0 z-50" : ""}`}
            style={isMobile ? {
              background: WHT,
            } : {
              width: 250,
              background: WHT,
              flexShrink: 0,
              borderLeft: `1px solid ${GRY}`,
              boxShadow: "-2px 0 8px rgba(0,0,0,0.04)",
            }}
          >
            {/* Sidebar header */}
            <div
              className="flex items-center justify-between px-3 shrink-0"
              style={{ height: 30, background: BG, borderBottom: `1px solid ${GRY}` }}
            >
              <span
                className="text-[9px] font-extrabold uppercase tracking-[0.2em]"
                style={{ fontFamily: sans, color: INK }}
              >
                Watchlist
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-[8px] tabular-nums"
                  style={{ fontFamily: mono, color: TM }}
                >
                  {activeTickers.length}
                </span>
                {isMobile && (
                  <button
                    onClick={() => setWlOpen(false)}
                    className="text-sm leading-none"
                    style={{ fontFamily: mono, color: TM, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    title="Close watchlist"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ── Category tabs ── */}
            <div
              className="flex items-center overflow-x-auto no-scrollbar shrink-0"
              style={{ borderBottom: `1px solid ${GRY}`, background: WHT, scrollbarWidth: "none" }}
            >
              {/* "All" tab = main watchlist */}
              {[{ name: "All" }, ...groups].map((g) => {
                const sel = activeTab === g.name;
                return (
                  <button
                    key={g.name}
                    onClick={() => setActiveTab(g.name)}
                    onContextMenu={g.name !== "All" ? (e) => {
                      e.preventDefault();
                      if (confirm(`Remove "${g.name}" group?`)) {
                        removeGroup(g.name);
                        if (activeTab === g.name) setActiveTab("All");
                      }
                    } : undefined}
                    className="px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-colors relative"
                    style={{
                      fontFamily: sans,
                      background: "transparent",
                      color: sel ? INK : TM,
                      border: "none",
                      cursor: "pointer",
                      borderBottom: sel ? `2px solid ${INK}` : "2px solid transparent",
                      marginBottom: -1,
                    }}
                    title={g.name !== "All" ? `Right-click to remove` : undefined}
                  >
                    {g.name}
                  </button>
                );
              })}
              {/* Add group button */}
              <button
                onClick={() => setShowNewGroup((v) => !v)}
                className="px-2 py-1.5 text-[10px] transition-colors"
                style={{
                  fontFamily: mono,
                  background: "transparent",
                  color: TM,
                  border: "none",
                  cursor: "pointer",
                }}
                title="Add new group"
              >
                +
              </button>
            </div>

            {/* New group input */}
            {showNewGroup && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newGroupName.trim()) {
                    addGroup(newGroupName.trim());
                    setActiveTab(newGroupName.trim());
                    setNewGroupName("");
                    setShowNewGroup(false);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5"
                style={{ borderBottom: `1px solid ${GRY}`, background: BG }}
              >
                <input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name…"
                  className="flex-1 px-1.5 py-0.5 text-[10px] focus:outline-none"
                  style={{ fontFamily: mono, border: `1px solid ${GRY}`, background: WHT, color: INK, borderRadius: 2 }}
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 text-[9px] font-bold"
                  style={{ background: INK, color: WHT, border: "none", fontFamily: mono, cursor: "pointer", borderRadius: 2 }}
                >
                  Add
                </button>
              </form>
            )}

            {/* Add ticker to current group */}
            {activeTab !== "All" && (
              <div className="px-3 py-1.5" style={{ borderBottom: `1px solid ${GRY}`, background: BG }}>
                <TickerAutocomplete
                  onAdd={(sym) => addTicker(activeTab, sym)}
                  placeholder={`Add to ${activeTab}…`}
                  inputClassName="w-full px-1.5 py-0.5 text-[10px] focus:outline-none"
                  inputStyle={{
                    fontFamily: mono,
                    background: WHT,
                    color: INK,
                    border: `1px solid ${GRY}`,
                    borderRadius: 2,
                  }}
                />
              </div>
            )}

            {/* Column headers */}
            <div
              className="grid px-3 text-[7px] font-extrabold uppercase tracking-[0.12em] shrink-0"
              style={{
                gridTemplateColumns: "1fr 52px 44px 14px",
                fontFamily: sans,
                color: TM,
                height: 22,
                alignItems: "center",
                borderBottom: `1px solid ${GRY}`,
                background: BG,
              }}
            >
              <span>Symbol</span>
              <span className="text-right">Last</span>
              <span className="text-right">Chg%</span>
              <span />
            </div>

            {/* Ticker rows */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {activeTickers.length === 0 && (
                <div className="px-3 py-6 text-center text-[10px]" style={{ color: TM, fontFamily: mono }}>
                  {activeTab === "All"
                    ? "Watchlist is empty"
                    : `No tickers in "${activeTab}"`}
                  <div className="mt-1 text-[9px]" style={{ color: GRY }}>
                    {activeTab === "All" ? "Add tickers from search" : "Use the search above to add tickers"}
                  </div>
                </div>
              )}
              {activeTickers.map((t) => {
                const bars = wlPrices[t];
                const s =
                  bars && bars.length >= 2
                    ? (() => {
                        const last = bars[bars.length - 1];
                        const prev = bars[bars.length - 2];
                        const chg = last.close - prev.close;
                        return { last: last.close, pct: (chg / prev.close) * 100 };
                      })()
                    : null;
                const active = t === ticker;
                return (
                  <div
                    key={t}
                    className="grid px-3 transition-colors cursor-pointer"
                    style={{
                      gridTemplateColumns: "1fr 52px 44px 14px",
                      height: 28,
                      alignItems: "center",
                      borderBottom: `1px solid color-mix(in srgb, ${GRY} 50%, transparent)`,
                      background: active ? BG : "transparent",
                    }}
                    onClick={() => { goToTicker(t); if (isMobile) setWlOpen(false); }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = BG;
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span
                      className="text-[11px] truncate"
                      style={{
                        fontFamily: mono,
                        color: active ? INK : T2,
                        fontWeight: active ? 800 : 500,
                      }}
                    >
                      {active ? `▸ ${t}` : t}
                    </span>
                    <span
                      className="text-[10px] tabular-nums text-right"
                      style={{ fontFamily: mono, fontWeight: 600, color: INK }}
                    >
                      {s ? s.last.toFixed(2) : "—"}
                    </span>
                    <span
                      className="text-[10px] font-bold tabular-nums text-right"
                      style={{ fontFamily: mono, color: s ? (s.pct >= 0 ? GAIN : LOSS) : TM }}
                    >
                      {s ? `${s.pct >= 0 ? "+" : ""}${s.pct.toFixed(1)}%` : "—"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTab === "All") wlRemove(t);
                        else removeTicker(activeTab, t);
                      }}
                      className="text-[8px] opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                      style={{
                        fontFamily: mono,
                        color: LOSS,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        lineHeight: 1,
                      }}
                      title={activeTab === "All" ? "Remove from watchlist" : `Remove from ${activeTab}`}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className="px-3 flex items-center justify-center shrink-0"
              style={{
                height: 24,
                borderTop: `1px solid ${GRY}`,
                background: BG,
              }}
            >
              <span
                className="text-[7px] uppercase tracking-[0.18em]"
                style={{ fontFamily: sans, color: TM }}
              >
                {activeTickers.length} Symbols
                {activeTab !== "All" && ` · ${activeTab}`}
              </span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  Page wrapper with Suspense                 */
/* ═══════════════════════════════════════════ */
export default function ChartPage() {
  return (
    <Suspense
      fallback={
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "var(--wsj-white, #f5f0e8)", fontFamily: "monospace", color: "#888" }}
        >
          Loading chart terminal…
        </div>
      }
    >
      <ChartTerminal />
    </Suspense>
  );
}
