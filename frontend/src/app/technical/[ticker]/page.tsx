"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import TechnicalChart from "@/components/TechnicalChart";
import TradingDashboard from "@/components/TradingDashboard";
import PatternPanel from "@/components/PatternPanel";
import TickerAutocomplete from "@/components/TickerAutocomplete";
import { fetchPrices, fetchTAPatterns, fetchBulkPrices, type PriceBar, type TAPatternResponse } from "@/lib/api";
import {
  WHT, INK, GRY, BLU, T2, TM, GAIN, LOSS,
  serif, mono, sans,
  Hair, HeavyRule, WSJSection,
} from "@/lib/wsj";
import { useWatchlist } from "@/lib/useWatchlist";
import { useRealtimePrice } from "@/lib/useRealtimePrice";

const PERIODS = ["3mo", "6mo", "1y", "2y", "5y"] as const;
const PERIOD_LABELS: Record<string, string> = {
  "3mo": "3M",
  "6mo": "6M",
  "1y": "1Y",
  "2y": "2Y",
  "5y": "5Y",
};

const INTRADAY = [
  { label: "15m", period: "60d", interval: "15m" },
  { label: "1H", period: "180d", interval: "1h" },
  { label: "4H", period: "730d", interval: "4h" },
] as const;

export default function TechnicalPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = (params.ticker as string).toUpperCase();

  const [data, setData] = useState<PriceBar[]>([]);
  const [period, setPeriod] = useState<string>("2y");
  const [candleInterval, setCandleInterval] = useState<string>("1d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jumpInput, setJumpInput] = useState("");
  const [taData, setTaData] = useState<TAPatternResponse | null>(null);
  const [taLoading, setTaLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchPrices(ticker, period, controller.signal, candleInterval)
      .then((res) => {
        if (!controller.signal.aborted) setData(res.data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [ticker, period, candleInterval]);

  // Fetch TA pattern analysis
  useEffect(() => {
    // TA patterns are only meaningful on daily candles
    if (candleInterval !== "1d") {
      setTaData(null);
      setTaLoading(false);
      return;
    }
    const controller = new AbortController();
    setTaLoading(true);
    fetchTAPatterns(ticker, period, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setTaData(res);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTaData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTaLoading(false);
      });
    return () => controller.abort();
  }, [ticker, period, candleInterval]);

  const handleJump = useCallback(() => {
    const t = jumpInput.trim().toUpperCase();
    if (t && t !== ticker) {
      router.push(`/technical/${encodeURIComponent(t)}`);
      setJumpInput("");
    }
  }, [jumpInput, ticker, router]);

  const [fullscreen, setFullscreen] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [splitPeriod, setSplitPeriod] = useState<string>("6mo");
  const [splitData, setSplitData] = useState<PriceBar[]>([]);
  const [wlOpen, setWlOpen] = useState(false);
  const { watchlist } = useWatchlist();
  const [wlPrices, setWlPrices] = useState<Record<string, PriceBar[]>>({});

  // Mobile detection (state to avoid SSR hydration mismatch)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Ref for scoping touch gestures to the page container
  const pageRef = useRef<HTMLDivElement>(null);

  // Swipe to change ticker in fullscreen (mobile only)
  useEffect(() => {
    if (!fullscreen || !isMobile || watchlist.length < 2) return;
    const el = pageRef.current;
    if (!el) return;
    let startX = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 80) {
        const idx = watchlist.indexOf(ticker);
        if (idx < 0) return;
        const next = dx > 0 ? idx - 1 : idx + 1;
        if (next >= 0 && next < watchlist.length) {
          router.push(`/technical/${watchlist[next]}`);
        }
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [fullscreen, isMobile, watchlist, ticker, router]);

  // Double-tap to toggle fullscreen (mobile only)
  useEffect(() => {
    if (!isMobile) return;
    const el = pageRef.current;
    if (!el) return;
    let lastTap = 0;
    const onTouch = (e: TouchEvent) => {
      // Only respond to taps on the chart area, not buttons/inputs
      const target = e.target as HTMLElement;
      if (target.closest("button, input, textarea, select, a")) return;
      const now = Date.now();
      if (now - lastTap < 300) {
        setFullscreen((v) => !v);
        e.preventDefault();
      }
      lastTap = now;
    };
    el.addEventListener("touchend", onTouch);
    return () => el.removeEventListener("touchend", onTouch);
  }, [isMobile]);

  // Chart notes (5.4)
  const [notes, setNotes] = useState("");
  const prevTickerRef = useRef(ticker);
  const notesSkipSaveRef = useRef(false);
  useEffect(() => {
    notesSkipSaveRef.current = true;
    if (typeof window !== "undefined") setNotes(localStorage.getItem(`zs_notes_${ticker}`) || "");
    prevTickerRef.current = ticker;
  }, [ticker]);
  useEffect(() => {
    // Skip save when notes was just set by ticker-change load effect
    if (notesSkipSaveRef.current) { notesSkipSaveRef.current = false; return; }
    const saveTicker = ticker;
    const t = setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(`zs_notes_${saveTicker}`, notes);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [notes, ticker]);

  // Panel reorder & collapse (6.5)
  type Panel = "dashboard" | "chart" | "patterns";
  const PANEL_LABELS: Record<Panel, string> = { dashboard: "Dashboard", chart: "Chart", patterns: "Patterns" };
  const DEFAULT_PANELS: Panel[] = ["chart", "dashboard", "patterns"];
  const VALID_PANELS = new Set<string>(DEFAULT_PANELS);
  const [panelOrder, setPanelOrder] = useState<Panel[]>(() => {
    if (typeof window === "undefined") return DEFAULT_PANELS;
    try {
      const stored = localStorage.getItem("zs_panel_order");
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length === DEFAULT_PANELS.length && parsed.every(p => VALID_PANELS.has(p))) {
          return parsed as Panel[];
        }
      }
    } catch {}
    return DEFAULT_PANELS;
  });
  const [collapsed, setCollapsed] = useState<Record<Panel, boolean>>({ dashboard: false, chart: false, patterns: false });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const handlePanelDrop = useCallback((fromIdx: number, toIdx: number) => {
    setPanelOrder((prev) => {
      const reordered = [...prev];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      try { localStorage.setItem("zs_panel_order", JSON.stringify(reordered)); } catch {}
      return reordered;
    });
  }, []);

  // Fetch watchlist prices when sidebar opens
  useEffect(() => {
    if (!wlOpen || watchlist.length === 0) return;
    const controller = new AbortController();
    fetchBulkPrices(watchlist, "1y")
      .then((res) => { if (!controller.signal.aborted) setWlPrices(res.data); })
      .catch(() => {});
    return () => controller.abort();
  }, [wlOpen, watchlist]);

  // Fetch split view data
  useEffect(() => {
    if (!splitView) return;
    const controller = new AbortController();
    fetchPrices(ticker, splitPeriod, controller.signal)
      .then((res) => { if (!controller.signal.aborted) setSplitData(res.data); })
      .catch(() => {});
    return () => controller.abort();
  }, [splitView, ticker, splitPeriod]);

  // Real-time price polling (15s interval)
  const liveQuote = useRealtimePrice(ticker);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [fullscreen]);

  return (
    <WSJLayout>
      <div ref={pageRef} className="mx-auto max-w-[1400px] px-4 py-6">
        {/* ── Header row ── */}
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/stocks/${ticker}`}
              className="text-xs hover:underline"
              style={{ color: T2, fontFamily: mono }}
            >
              ← {ticker} Overview
            </Link>
            <span style={{ color: GRY }}>|</span>
            <Link
              href="/screener-v4"
              className="text-xs hover:underline"
              style={{ color: T2, fontFamily: mono }}
            >
              Screener
            </Link>
          </div>

          {/* Quick jump */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleJump(); }}
            className="flex items-center gap-1"
          >
            <input
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="Jump to ticker…"
              className="w-28 border px-2 py-1 text-xs uppercase"
              style={{
                borderColor: GRY, background: WHT, color: INK,
                fontFamily: mono, outline: "none",
              }}
            />
            <button
              type="submit"
              className="border px-2 py-1 text-xs"
              style={{ borderColor: GRY, background: INK, color: WHT, fontFamily: mono }}
            >
              Go
            </button>
          </form>
        </div>

        {/* ── Title ── */}
        <h1
          className="mb-1 text-2xl font-bold sm:text-3xl"
          style={{ fontFamily: serif, color: INK }}
        >
          {ticker}
          {liveQuote && (
            <span className="ml-3 text-lg font-normal" style={{ fontFamily: mono }}>
              <span style={{ color: INK }}>${liveQuote.price.toFixed(2)}</span>
              <span className="ml-1 text-xs" style={{ color: TM }}>
                (live)
              </span>
            </span>
          )}
        </h1>
        <p className="mb-3 text-sm" style={{ color: T2, fontFamily: mono }}>
          Technical Analysis &amp; Setup Detection
        </p>

        <HeavyRule />

        {/* ── Period selector ── */}
        <div className="my-3 flex items-center gap-1" style={{ fontFamily: mono }}>
          <span className="mr-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: TM }}>
            Intraday
          </span>
          {INTRADAY.map((itd) => (
            <button
              key={itd.interval}
              onClick={() => { setPeriod(itd.period); setCandleInterval(itd.interval); }}
              className="px-2 py-0.5 text-xs transition-colors"
              style={{
                background: candleInterval === itd.interval ? INK : "transparent",
                color: candleInterval === itd.interval ? WHT : TM,
                border: `1px solid ${candleInterval === itd.interval ? INK : GRY}`,
              }}
            >
              {itd.label}
            </button>
          ))}
          <span className="mx-1 text-[10px]" style={{ color: GRY }}>│</span>
          <span className="mr-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: TM }}>
            Daily
          </span>
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setCandleInterval("1d"); }}
              className="px-2 py-0.5 text-xs transition-colors"
              style={{
                background: period === p && candleInterval === "1d" ? INK : "transparent",
                color: period === p && candleInterval === "1d" ? WHT : TM,
                border: `1px solid ${period === p && candleInterval === "1d" ? INK : GRY}`,
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* ── Chart ── */}
        {loading && (
          <div className="flex h-64 items-center justify-center" style={{ color: TM, fontFamily: mono }}>
            <div className="text-center">
              <div className="mb-2 text-sm">Loading {ticker} data…</div>
              <div
                className="mx-auto h-1 w-48 overflow-hidden rounded"
                style={{ background: GRY }}
              >
                <div
                  className="h-full animate-pulse rounded"
                  style={{ background: INK, width: "40%" }}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="border p-4 text-center text-sm"
            style={{ borderColor: LOSS, color: LOSS, fontFamily: mono }}
          >
            Error: {error}
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {panelOrder.map((panel, i) => (
              <div
                key={panel}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  if (from !== i) handlePanelDrop(from, i);
                  setDragIdx(null);
                }}
                className="transition-opacity"
                style={{ opacity: dragIdx === i ? 0.5 : 1 }}
              >
                {/* Panel header with drag handle + collapse */}
                <div
                  className="flex items-center gap-2 mt-3 mb-1 select-none"
                  style={{ fontFamily: mono }}
                >
                  <span
                    className="cursor-grab text-[10px]"
                    style={{ color: TM }}
                    title="Drag to reorder"
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(i)); setDragIdx(i); }}
                    onDragEnd={() => setDragIdx(null)}
                  >⋮⋮</span>
                  <button
                    onClick={() => setCollapsed((prev) => ({ ...prev, [panel]: !prev[panel] }))}
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: TM, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {collapsed[panel] ? "▸" : "▾"} {PANEL_LABELS[panel]}
                  </button>
                  {/* Chart-specific buttons in header */}
                  {panel === "chart" && !collapsed[panel] && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => setSplitView(!splitView)}
                        className="px-2 py-0.5 text-[10px] transition-colors"
                        style={{
                          background: splitView ? INK : "transparent",
                          color: splitView ? WHT : TM,
                          border: `1px solid ${splitView ? INK : GRY}`,
                        }}
                        title="Split view: compare two timeframes"
                      >
                        ⬒ Split
                      </button>
                      <button
                        onClick={() => setFullscreen(true)}
                        className="px-2 py-0.5 text-[10px] transition-colors"
                        style={{ background: "transparent", color: TM, border: `1px solid ${GRY}` }}
                        title="Open chart fullscreen"
                      >
                        ⛶ Fullscreen
                      </button>
                    </div>
                  )}
                </div>

                {/* Panel content */}
                {!collapsed[panel] && panel === "dashboard" && (
                  <TradingDashboard data={data} ticker={ticker} period={period} />
                )}
                {!collapsed[panel] && panel === "chart" && (
                  <>
                    {splitView ? (
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                        <div>
                          <div className="mb-1 flex items-center gap-1" style={{ fontFamily: mono }}>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TM }}>Left</span>
                            {PERIODS.map((p) => (
                              <button key={p} onClick={() => setPeriod(p)}
                                className="px-1.5 py-0.5 text-[10px]"
                                style={{ background: period === p ? INK : "transparent", color: period === p ? WHT : TM, border: `1px solid ${period === p ? INK : GRY}` }}
                              >{PERIOD_LABELS[p]}</button>
                            ))}
                          </div>
                          <TechnicalChart data={data} ticker={ticker} period={period} />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-1" style={{ fontFamily: mono }}>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TM }}>Right</span>
                            {PERIODS.map((p) => (
                              <button key={p} onClick={() => setSplitPeriod(p)}
                                className="px-1.5 py-0.5 text-[10px]"
                                style={{ background: splitPeriod === p ? INK : "transparent", color: splitPeriod === p ? WHT : TM, border: `1px solid ${splitPeriod === p ? INK : GRY}` }}
                              >{PERIOD_LABELS[p]}</button>
                            ))}
                          </div>
                          <TechnicalChart data={splitData} ticker={ticker} period={splitPeriod} />
                        </div>
                      </div>
                    ) : (
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
                      />
                    )}
                  </>
                )}
                {!collapsed[panel] && panel === "patterns" && taData && !taLoading && (
                  <PatternPanel data={taData} />
                )}
                {!collapsed[panel] && panel === "patterns" && taLoading && (
                  <div className="py-4 text-center text-xs" style={{ color: TM, fontFamily: mono }}>
                    Analyzing patterns…
                  </div>
                )}
              </div>
            ))}

            {/* ── Chart Notes (5.4) ── */}
            <details className="mt-3">
              <summary
                className="cursor-pointer text-[10px] font-bold uppercase tracking-widest select-none"
                style={{ color: TM, fontFamily: mono }}
              >
                📓 Notes {notes ? `(${notes.split("\n").filter(l => l.trim()).length} lines)` : ""}
              </summary>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full mt-1 p-2 text-xs resize-y focus:outline-none"
                style={{
                  fontFamily: mono,
                  background: WHT,
                  border: `1px solid ${GRY}`,
                  color: INK,
                  minHeight: 60,
                  maxHeight: 200,
                }}
                placeholder={`Notes for ${ticker}…`}
              />
            </details>
          </>
        )}

        {!loading && !error && data.length === 0 && (
          <div
            className="py-12 text-center text-sm"
            style={{ color: TM, fontFamily: mono }}
          >
            No price data available for {ticker}.
          </div>
        )}

        <Hair />

        {/* ── Legend / Help ── */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3" style={{ fontFamily: mono }}>
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: INK }}>
              Overlays
            </h4>
            <ul className="space-y-0.5 text-[11px]" style={{ color: T2 }}>
              <li><b>BB</b> — Bollinger Bands (20, 2σ): volatility envelope</li>
              <li><b>EMA 8/21</b> — Exponential MA ribbon for trend</li>
              <li><b>Waves</b> — Turbulent Waves: 19 EMAs (20–200) acting as dynamic S/R layers</li>
              <li><b>SAR</b> — Parabolic Stop &amp; Reverse trailing dots</li>
              <li><b>S/R</b> — Auto-detected support &amp; resistance levels</li>
              <li><b>Fib</b> — Fibonacci retracements from recent swing</li>
              <li><b>VWAP</b> — Volume-Weighted Average Price: institutional fair value</li>
              <li><b>Ichimoku</b> — Ichimoku Cloud: Tenkan/Kijun/Senkou/Chikou (complete trend system)</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: INK }}>
              Studies
            </h4>
            <ul className="space-y-0.5 text-[11px]" style={{ color: T2 }}>
              <li><b>RSI (14)</b> — Relative Strength Index: &gt;70 overbought, &lt;30 oversold</li>
              <li><b>MACD</b> — Moving Average Convergence-Divergence (12, 26, 9)</li>
              <li><b>Stochastic</b> — %K / %D oscillator (14, 3, 3)</li>
              <li><b>OBV</b> — On-Balance Volume: cumulative volume trend</li>
              <li><b>ADX/DMI</b> — Average Directional Index: trend strength &gt;25 = trending</li>
              <li><b>Williams %R</b> — Momentum: &gt;-20 overbought, &lt;-80 oversold</li>
              <li><b>CCI</b> — Commodity Channel Index: &gt;+100 overbought, &lt;-100 oversold</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: INK }}>
              Signal Detection
            </h4>
            <ul className="space-y-0.5 text-[11px]" style={{ color: T2 }}>
              <li><b>Patterns</b> — Doji, Hammer, Engulfing, Morning/Evening Star, 3 Soldiers/Crows, Piercing, Tweezer</li>
              <li><b>Setups</b> — BB squeeze, RSI divergence, MACD cross, S/R breakout, golden cross</li>
              <li>★★★ = high confidence (multi-indicator confluence)</li>
              <li><b>Keyboard:</b> Press letter keys (h, l, b, e, w, v, i, r, m, o, f) to toggle indicators</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Fullscreen chart overlay ── */}
      {fullscreen && !loading && !error && data.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: WHT }}>
          {/* Header bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: GRY }}>
            <div className="flex items-center gap-3">
              <TickerAutocomplete
                onAdd={(sym) => router.push(`/technical/${encodeURIComponent(sym)}`)}
                placeholder="Search ticker…"
                inputClassName="w-40 px-2.5 py-1 text-sm font-bold focus:outline-none"
                inputStyle={{
                  fontFamily: mono,
                  background: "transparent",
                  color: INK,
                  border: `1px solid ${GRY}`,
                  borderRadius: 4,
                }}
              />
              <h2 className="text-lg font-bold" style={{ fontFamily: serif, color: INK }}>
                {ticker}
              </h2>
            </div>
            <div className="flex items-center gap-2" style={{ fontFamily: mono }}>
              {INTRADAY.map((itd) => (
                <button
                  key={itd.interval}
                  onClick={() => { setPeriod(itd.period); setCandleInterval(itd.interval); }}
                  className="px-2 py-0.5 text-xs transition-colors"
                  style={{
                    background: candleInterval === itd.interval ? INK : "transparent",
                    color: candleInterval === itd.interval ? WHT : TM,
                    border: `1px solid ${candleInterval === itd.interval ? INK : GRY}`,
                  }}
                >
                  {itd.label}
                </button>
              ))}
              <span className="text-[10px]" style={{ color: GRY }}>│</span>
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setCandleInterval("1d"); }}
                  className="px-2 py-0.5 text-xs transition-colors"
                  style={{
                    background: period === p && candleInterval === "1d" ? INK : "transparent",
                    color: period === p && candleInterval === "1d" ? WHT : TM,
                    border: `1px solid ${period === p && candleInterval === "1d" ? INK : GRY}`,
                  }}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
              <button
                onClick={() => { setWlOpen((v) => !v); }}
                className="ml-2 px-2 py-0.5 text-xs transition-colors"
                style={{
                  background: wlOpen ? INK : "transparent",
                  color: wlOpen ? WHT : TM,
                  border: `1px solid ${wlOpen ? INK : GRY}`,
                  fontFamily: mono,
                }}
                title="Toggle watchlist"
              >
                ☰ Watchlist
              </button>
              <button
                onClick={() => setFullscreen(false)}
                className="ml-1 px-3 py-1 text-xs font-bold transition-colors"
                style={{ background: INK, color: WHT, fontFamily: mono }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Body: chart + optional sidebar */}
          <div className="flex flex-1 min-h-0">
            {/* Chart area */}
            <div className="flex-1 overflow-y-auto px-4 py-2 min-w-0">
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
              />
            </div>

            {/* Watchlist sidebar */}
            {wlOpen && (
              <aside
                className="flex flex-col border-l overflow-hidden"
                style={{
                  width: 240,
                  borderColor: GRY,
                  background: WHT,
                  flexShrink: 0,
                }}
              >
                {/* Sidebar header */}
                <div className="px-3 pt-3 pb-2" style={{ borderBottom: `2px solid ${INK}` }}>
                  <span
                    className="text-[9px] font-extrabold uppercase tracking-[0.2em]"
                    style={{ fontFamily: sans, color: INK }}
                  >
                    Watchlist
                  </span>
                </div>

                {/* Column headers */}
                <div
                  className="grid px-3 py-1 text-[7px] font-extrabold uppercase tracking-[0.12em]"
                  style={{
                    gridTemplateColumns: "1fr 60px 50px",
                    fontFamily: sans,
                    color: TM,
                    borderBottom: `1px solid ${GRY}`,
                    background: "var(--wsj-bg, #e8e0d0)",
                  }}
                >
                  <span>Symbol</span>
                  <span className="text-right">Last</span>
                  <span className="text-right">Chg%</span>
                </div>

                {/* Ticker rows */}
                <div className="flex-1 overflow-y-auto">
                  {watchlist.map((t, i) => {
                    const bars = wlPrices[t];
                    const s = bars && bars.length >= 2
                      ? (() => {
                          const last = bars[bars.length - 1];
                          const prev = bars[bars.length - 2];
                          const chg = last.close - prev.close;
                          return { last: last.close, pct: (chg / prev.close) * 100 };
                        })()
                      : null;
                    const active = t === ticker;
                    return (
                      <a
                        key={t}
                        href={`/technical/${encodeURIComponent(t)}`}
                        className="grid px-3 py-1.5 transition-colors no-underline"
                        style={{
                          gridTemplateColumns: "1fr 60px 50px",
                          borderBottom: `1px solid var(--wsj-grey, #c8c8c8)`,
                          background: active
                            ? "var(--wsj-bg, #e8e0d0)"
                            : "transparent",
                          opacity: active ? 1 : 0.85,
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.background = "var(--wsj-bg, #e8e0d0)";
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span
                          className="text-[11px] truncate"
                          style={{
                            fontFamily: mono,
                            color: INK,
                            fontWeight: active ? 800 : 600,
                          }}
                        >
                          {active ? `▸ ${t}` : t}
                        </span>
                        <span
                          className="text-[11px] tabular-nums text-right"
                          style={{ fontFamily: mono, fontWeight: 600, color: INK }}
                        >
                          {s ? s.last.toFixed(2) : "—"}
                        </span>
                        <span
                          className="text-[11px] font-bold tabular-nums text-right"
                          style={{
                            fontFamily: mono,
                            color: s ? (s.pct >= 0 ? GAIN : LOSS) : TM,
                          }}
                        >
                          {s ? `${s.pct >= 0 ? "+" : ""}${s.pct.toFixed(1)}%` : "—"}
                        </span>
                      </a>
                    );
                  })}
                </div>

                {/* Footer */}
                <div
                  className="px-3 py-1.5 text-center"
                  style={{
                    borderTop: `1px solid ${GRY}`,
                    background: "var(--wsj-bg, #e8e0d0)",
                  }}
                >
                  <span
                    className="text-[8px] uppercase tracking-[0.15em]"
                    style={{ fontFamily: sans, color: TM }}
                  >
                    {watchlist.length} Symbols
                  </span>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </WSJLayout>
  );
}
