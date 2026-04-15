"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";
import type { PriceBar, BulkFundamentalsEntry } from "@/lib/api";
import { useShare } from "@/lib/useShare";

/* ── WSJ colour tokens (CSS-variable aware for JSX) ── */
const WHT = "var(--wsj-white, #f5f0e8)";
const BG  = "var(--wsj-bg, #e8e0d0)";
const INK = "var(--wsj-ink, #1a1a1a)";
const GRY = "var(--wsj-grey, #c8c8c8)";
const GR2 = "var(--wsj-grey-light, #d8d0c4)";
const TM  = "var(--wsj-muted, #888888)";

/* Semantic colours that don't change between light/dark */
const BLU = "#1e4d8c";
const RED = "#8b0000";
const GRN = "#1a4d2e";

/* ── Resolved colours for lightweight-charts (needs actual hex) ── */
function getThemeColors() {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return {
    bg:       dark ? "#1a1a1a" : "#f8f7f5",
    ink:      dark ? "#e0ddd5" : "#1a1a1a",
    grid:     dark ? "#2a2a2a" : "#e5e5e5",
    border:   dark ? "#333333" : "#c8c8c8",
    muted:    dark ? "#777777" : "#888888",
    candleUp: dark ? "#4caf50" : "#1a7a3a",
    candleDown: dark ? "#ef5350" : "#c0392b",
    volUp:    dark ? "rgba(76,175,80,0.20)" : "rgba(26,122,58,0.20)",
    volDown:  dark ? "rgba(239,83,80,0.20)" : "rgba(192,57,43,0.20)",
  };
}

const mono = "'IBM Plex Mono', 'Courier New', monospace";
const sans = "'Inter', 'Helvetica Neue', system-ui, sans-serif";
const display = "'Playfair Display', 'Georgia', serif";

/* ─── SMA helper ─── */
function computeSMA(
  data: PriceBar[],
  period: number
): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    result.push({
      time: data[i].time,
      value: Math.round((sum / period) * 100) / 100,
    });
  }
  return result;
}

/* ─── EMA helper ─── */
function computeEMA(
  data: PriceBar[],
  period: number
): { time: string; value: number }[] {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const result: { time: string; value: number }[] = [];
  // seed with SMA of first `period` bars
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: Math.round(ema * 100) / 100 });
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: Math.round(ema * 100) / 100 });
  }
  return result;
}

const MA_CONFIG = [
  { period: 20, color: "#e6a030", label: "EMA 20", type: "ema" as const },
  { period: 50, color: "#555555", label: "SMA 50", type: "sma" as const },
  { period: 100, color: "#999999", label: "SMA 100", type: "sma" as const },
  { period: 150, color: BLU, label: "SMA 150", type: "sma" as const },
  { period: 200, color: RED, label: "SMA 200", type: "sma" as const },
];

/** Fixed minimum-width for the right price scale. */
const PRICE_SCALE_MIN_WIDTH = 85;

interface FullChartWSJProps {
  ticker: string;
  data: PriceBar[];
  fundamentals?: BulkFundamentalsEntry & {
    shortName?: string;
    sector?: string;
    industry?: string;
    marketCap?: number | null;
    trailingPE?: number | null;
  };
  onClose: () => void;
}

function fmtNum(n: number | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtVol(n: number | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

function fmtBig(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  return "$" + n.toLocaleString();
}

export default function FullChartWSJ({
  ticker,
  data,
  fundamentals,
  onClose,
}: FullChartWSJProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { supported: shareSupported, shareStock } = useShare();
  const [crosshairData, setCrosshairData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } | null>(null);

  /* Price summary */
  const last = data.length > 0 ? data[data.length - 1] : null;
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const change = last && prev ? last.close - prev.close : 0;
  const changePct = prev ? (change / prev.close) * 100 : 0;

  /* 52-week stats */
  const yearData = data.slice(-252);
  const high52 = yearData.length > 0 ? Math.max(...yearData.map((d) => d.high)) : null;
  const low52 = yearData.length > 0 ? Math.min(...yearData.map((d) => d.low)) : null;

  /* Average volume (20d) */
  const vol20 =
    data.length >= 20
      ? data.slice(-20).reduce((s, d) => s + d.volume, 0) / 20
      : null;

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const container = chartRef.current;
    container.innerHTML = "";
    const tc = getThemeColors();

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 600,
      layout: {
        background: { color: tc.bg },
        textColor: tc.muted,
        fontSize: 11,
        fontFamily: mono,
      },
      grid: {
        vertLines: { color: tc.grid },
        horzLines: { color: tc.grid },
      },
      crosshair: { mode: 0 },
      timeScale: {
        borderColor: tc.border,
        timeVisible: false,
      },
      rightPriceScale: {
        borderColor: tc.border,
        minimumWidth: PRICE_SCALE_MIN_WIDTH,
      },
    });

    /* ── Candlestick series ── */
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: tc.candleUp,
      downColor: tc.candleDown,
      borderDownColor: tc.candleDown,
      borderUpColor: tc.candleUp,
      wickDownColor: tc.candleDown,
      wickUpColor: tc.candleUp,
    });

    candleSeries.setData(
      data.map((d) => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );

    /* ── Volume histogram ── */
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    volumeSeries.setData(
      data.map((d) => ({
        time: d.time,
        value: d.volume,
        color:
          d.close >= d.open
            ? tc.volUp
            : tc.volDown,
      }))
    );

    /* ── Moving averages ── */
    for (const ma of MA_CONFIG) {
      if (data.length >= ma.period) {
        const maData =
          ma.type === "ema"
            ? computeEMA(data, ma.period)
            : computeSMA(data, ma.period);
        const maSeries = chart.addSeries(LineSeries, {
          color: ma.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        maSeries.setData(maData);
      }
    }

    /* ── Crosshair data ── */
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setCrosshairData(null);
        return;
      }
      const timeStr = param.time as string;
      const bar = data.find((d) => d.time === timeStr);
      if (bar) {
        setCrosshairData({
          time: bar.time,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        });
      }
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [data]);

  /* Display data: crosshair or latest bar */
  const display_bar = crosshairData || (last
    ? { time: last.time, open: last.open, high: last.high, low: last.low, close: last.close, volume: last.volume }
    : null);

  return (
    <div>
      {/* ── Header ── */}
      <div
        className="p-4 flex items-start justify-between"
        style={{ background: WHT, borderBottom: `2px solid ${INK}` }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h2
              className="text-[28px] font-bold leading-none"
              style={{ fontFamily: display, color: INK }}
            >
              {ticker}
            </h2>
            {last && (
              <span
                className="text-[22px] font-bold tabular-nums"
                style={{ fontFamily: mono, color: INK }}
              >
                {fmtNum(last.close)}
              </span>
            )}
            {last && prev && (
              <span
                className="text-[16px] font-bold tabular-nums"
                style={{ fontFamily: mono, color: change >= 0 ? GRN : RED }}
              >
                {change >= 0 ? "+" : ""}
                {fmtNum(change)} ({changePct >= 0 ? "+" : ""}
                {changePct.toFixed(2)}%)
              </span>
            )}
          </div>
          {fundamentals && (fundamentals.shortName || fundamentals.sector) && (
            <div className="mt-1 text-[10px]" style={{ fontFamily: mono, color: TM }}>
              {fundamentals.shortName}
              {fundamentals.sector && ` · ${fundamentals.sector}`}
              {fundamentals.industry && ` · ${fundamentals.industry}`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {shareSupported && last && (
            <button
              onClick={() => shareStock({
                ticker,
                price: last.close,
                change: prev ? last.close - prev.close : undefined,
                changePct: prev ? ((last.close - prev.close) / prev.close) * 100 : undefined,
              })}
              className="px-3 py-1.5 text-[11px] font-bold transition-colors hover:opacity-80"
              style={{
                fontFamily: mono,
                background: "transparent",
                color: TM,
                border: `1px solid ${GRY}`,
              }}
              title="Share this stock"
            >
              ↗ SHARE
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[11px] font-bold transition-colors hover:opacity-80"
            style={{
              fontFamily: mono,
              background: INK,
              color: WHT,
              border: `1px solid ${INK}`,
            }}
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      {/* ── OHLCV data bar ── */}
      <div
        className="px-4 py-2 flex flex-wrap items-center gap-4"
        style={{ background: WHT, borderBottom: `1px solid ${GRY}` }}
      >
        {display_bar && (
          <>
            <span className="text-[9px]" style={{ fontFamily: mono, color: TM }}>
              {display_bar.time}
            </span>
            {[
              { label: "O", value: display_bar.open },
              { label: "H", value: display_bar.high },
              { label: "L", value: display_bar.low },
              { label: "C", value: display_bar.close },
            ].map(({ label, value }) => (
              <span key={label} className="text-[10px] tabular-nums" style={{ fontFamily: mono }}>
                <span style={{ color: TM }}>{label}</span>{" "}
                <span style={{ color: INK, fontWeight: 700 }}>{fmtNum(value)}</span>
              </span>
            ))}
            <span className="text-[10px] tabular-nums" style={{ fontFamily: mono }}>
              <span style={{ color: TM }}>Vol</span>{" "}
              <span style={{ color: INK, fontWeight: 700 }}>{fmtVol(display_bar.volume)}</span>
            </span>
          </>
        )}
      </div>

      {/* ── MA legend ── */}
      <div
        className="px-4 py-1.5 flex items-center gap-4"
        style={{ background: BG, borderBottom: `1px solid ${GRY}` }}
      >
        {MA_CONFIG.map(
          (ma) =>
            data.length >= ma.period && (
              <span
                key={ma.period}
                className="flex items-center gap-1 text-[9px]"
                style={{ fontFamily: mono, color: TM }}
              >
                <span
                  className="inline-block h-[2px] w-4"
                  style={{ backgroundColor: ma.color }}
                />
                {ma.label}
              </span>
            )
        )}
      </div>

      {/* ── Chart ── */}
      <div ref={chartRef} className="w-full" />

      {/* ── Stats bar ── */}
      <div
        className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-2"
        style={{ background: WHT, borderTop: `1px solid ${GRY}` }}
      >
        {[
          { label: "52W High", value: high52 != null ? fmtNum(high52) : "—" },
          { label: "52W Low", value: low52 != null ? fmtNum(low52) : "—" },
          { label: "Avg Vol (20d)", value: vol20 != null ? fmtVol(vol20) : "—" },
          { label: "Market Cap", value: fundamentals?.marketCap ? fmtBig(fundamentals.marketCap) : "—" },
          { label: "P/E", value: fundamentals?.trailingPE ? fundamentals.trailingPE.toFixed(2) : "—" },
          { label: "Div Yield", value: fundamentals?.dividendYield ? fundamentals.dividendYield.toFixed(2) + "%" : "—" },
        ].map(({ label, value }) => (
          <div key={label}>
            <div
              className="text-[8px] font-bold uppercase tracking-[0.1em]"
              style={{ fontFamily: sans, color: TM }}
            >
              {label}
            </div>
            <div
              className="text-[13px] font-bold tabular-nums"
              style={{ fontFamily: mono, color: INK }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
