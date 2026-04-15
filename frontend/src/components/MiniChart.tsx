"use client";

import { memo, useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries } from "lightweight-charts";
import type { PriceBar, BulkFundamentalsEntry } from "@/lib/api";
import MiniFinancials from "@/components/MiniFinancials";
import MiniDividends from "@/components/MiniDividends";
import type { CSSProperties } from "react";

export type ChartThemeName = "nord" | "neu" | "wsj";

/* ─── SMA helper ─── */
function computeSMA(data: PriceBar[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    result.push({ time: data[i].time, value: Math.round((sum / period) * 100) / 100 });
  }
  return result;
}

/* ─── Theme tokens ─── */

const NEU_BG = "#e0e5ec";
const NEU_SD = "#a3b1c6";
const NEU_SL = "#ffffff";

/* Resolved hex values for lightweight-charts (WSJ theme) */
function getWsjChartColors() {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return {
    background: dark ? "#1a1a1a" : "#ffffff",
    textColor:  dark ? "#777777" : "#888888",
    gridVert:   dark ? "#2a2a2a" : "#e5e5e5",
    gridHorz:   dark ? "#2a2a2a" : "#e5e5e5",
    borderColor:dark ? "#333333" : "#c8c8c8",
    candleUp:   dark ? "#4caf50" : "#1a4d2e",
    candleDown: dark ? "#ef5350" : "#8b0000",
  };
}

interface Tokens {
  card: { className: string; style: CSSProperties };
  ticker: { className: string; style: CSSProperties };
  price: { className: string; style: CSSProperties };
  changeBadge: { className: string; upStyle: CSSProperties; downStyle: CSSProperties };
  hairline?: CSSProperties;
  chartRef: { className: string; style: CSSProperties };
  headerSpacing: string;
  footerSpacing: string;
  lwChart: {
    background: string; textColor: string; fontSize: number; fontFamily?: string;
    gridVert: string; gridHorz: string; gridHorzStyle?: number;
    borderColor: string; priceMinWidth: number;
    candleUp: string; candleDown: string;
  };
  ma: { period: number; color: string; label: string }[];
  maLegend: { className: string; style: CSSProperties; lineHeight: string; lineRadius: string };
  support: {
    className: string; style: CSSProperties;
    nearColor: string; approachColor: string; defaultColor: string;
    nearLabel: string; approachLabel: string;
  };
}

const T: Record<ChartThemeName, Tokens> = {
  nord: {
    card: { className: "rounded-xl p-3 flex flex-col", style: { background: "#2E3440", border: "1px solid #434C5E" } },
    ticker: { className: "text-sm font-bold", style: { color: "#ECEFF4" } },
    price: { className: "text-sm font-medium", style: { color: "#D8DEE9" } },
    changeBadge: {
      className: "text-xs font-semibold",
      upStyle: { color: "#A3BE8C" },
      downStyle: { color: "#BF616A" },
    },
    chartRef: { className: "w-full flex-1", style: {} },
    headerSpacing: "mb-2",
    footerSpacing: "mt-2",
    lwChart: {
      background: "#2E3440", textColor: "#D8DEE9", fontSize: 10,
      gridVert: "#3B4252", gridHorz: "#3B4252",
      borderColor: "#434C5E", priceMinWidth: 60,
      candleUp: "#A3BE8C", candleDown: "#BF616A",
    },
    ma: [
      { period: 50, color: "#EBCB8B", label: "50" },
      { period: 100, color: "#D08770", label: "100" },
      { period: 150, color: "#88C0D0", label: "150" },
      { period: 200, color: "#B48EAD", label: "200" },
    ],
    maLegend: { className: "flex items-center gap-2 text-[10px]", style: { color: "#D8DEE9" }, lineHeight: "h-0.5", lineRadius: "rounded" },
    support: {
      className: "text-[10px] font-medium", style: {},
      nearColor: "#A3BE8C", approachColor: "#EBCB8B", defaultColor: "#4C566A",
      nearLabel: "● NEAR SUPPORT", approachLabel: "● APPROACHING",
    },
  },
  neu: {
    card: {
      className: "rounded-2xl p-4 flex flex-col",
      style: { background: NEU_BG, boxShadow: `6px 6px 12px ${NEU_SD}, -6px -6px 12px ${NEU_SL}` },
    },
    ticker: { className: "text-sm font-extrabold", style: { color: "#1f2937" } },
    price: { className: "text-sm font-semibold tabular-nums", style: { color: "#4b5563" } },
    changeBadge: {
      className: "text-xs font-bold px-2 py-0.5 rounded-lg",
      upStyle: { color: "#16a34a", background: NEU_BG, boxShadow: `inset 3px 3px 6px ${NEU_SD}, inset -3px -3px 6px ${NEU_SL}` },
      downStyle: { color: "#ef4444", background: NEU_BG, boxShadow: `inset 3px 3px 6px ${NEU_SD}, inset -3px -3px 6px ${NEU_SL}` },
    },
    chartRef: {
      className: "w-full flex-1 rounded-xl overflow-hidden",
      style: { boxShadow: `inset 3px 3px 6px ${NEU_SD}, inset -3px -3px 6px ${NEU_SL}` },
    },
    headerSpacing: "mb-3",
    footerSpacing: "mt-3",
    lwChart: {
      background: "#dfe4eb", textColor: "#718096", fontSize: 10,
      gridVert: "#d1d6de", gridHorz: "#d1d6de",
      borderColor: "#c4c9d2", priceMinWidth: 60,
      candleUp: "#48bb78", candleDown: "#fc8181",
    },
    ma: [
      { period: 50, color: "#d69e2e", label: "50" },
      { period: 100, color: "#dd6b20", label: "100" },
      { period: 150, color: "#667eea", label: "150" },
      { period: 200, color: "#9f7aea", label: "200" },
    ],
    maLegend: { className: "flex items-center gap-2 text-[10px] font-medium", style: { color: "#6b7280" }, lineHeight: "h-0.5", lineRadius: "rounded" },
    support: {
      className: "text-[10px] font-bold", style: {},
      nearColor: "#16a34a", approachColor: "#ca8a04", defaultColor: "#9ca3af",
      nearLabel: "● NEAR SUPPORT", approachLabel: "● APPROACHING",
    },
  },
  wsj: {
    card: {
      className: "flex flex-col p-4",
      style: { background: "var(--wsj-white, #f5f0e8)", border: "1px solid var(--wsj-grey, #c8c8c8)" },
    },
    ticker: {
      className: "text-sm font-extrabold tracking-tight",
      style: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "var(--wsj-ink, #1a1a1a)" },
    },
    price: {
      className: "text-sm tabular-nums font-bold",
      style: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "var(--wsj-ink, #1a1a1a)" },
    },
    changeBadge: {
      className: "text-xs font-bold tabular-nums",
      upStyle: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "var(--wsj-gain, #2e7d32)" },
      downStyle: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "var(--wsj-loss, #c62828)" },
    },
    hairline: { height: 2, marginBottom: 8, background: "var(--wsj-ink, #1a1a1a)" },
    chartRef: { className: "w-full flex-1", style: { border: "1px solid var(--wsj-grey-light, #d8d0c4)" } },
    headerSpacing: "mb-2",
    footerSpacing: "mt-2",
    lwChart: {
      background: "#ffffff", textColor: "#888888", fontSize: 9,
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      gridVert: "#e5e5e5", gridHorz: "#e5e5e5", gridHorzStyle: 3,
      borderColor: "#c8c8c8", priceMinWidth: 55,
      candleUp: "#1a4d2e", candleDown: "#8b0000",
    },
    ma: [
      { period: 50, color: "#555555", label: "50" },
      { period: 100, color: "#999999", label: "100" },
      { period: 150, color: "#1e4d8c", label: "150" },
      { period: 200, color: "#8b0000", label: "200" },
    ],
    maLegend: {
      className: "flex items-center gap-2",
      style: { fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif", color: "var(--wsj-muted, #888888)", fontSize: 9 },
      lineHeight: "h-px", lineRadius: "",
    },
    support: {
      className: "text-[9px] font-extrabold uppercase tracking-[0.1em]",
      style: { fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif" },
      nearColor: "var(--wsj-gain, #2e7d32)", approachColor: "var(--wsj-muted, #888888)", defaultColor: "transparent",
      nearLabel: "■ NEAR SUPPORT", approachLabel: "■ APPROACHING",
    },
  },
};

/* ─── Component ─── */

interface MiniChartProps {
  ticker: string;
  data: PriceBar[];
  fundamentals?: BulkFundamentalsEntry;
  showRevenue?: boolean;
  showDividends?: boolean;
  showMA?: boolean;
  height?: number;
  theme?: ChartThemeName;
}

function MiniChartInner({
  ticker,
  data,
  fundamentals,
  showRevenue = true,
  showDividends = true,
  showMA = true,
  height = 260,
  theme = "nord",
}: MiniChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const t = T[theme];

  /* Price summary */
  const last = data.length > 0 ? data[data.length - 1] : null;
  const first = data.length > 1 ? data[0] : null;
  const changeAll = last && first ? ((last.close - first.close) / first.close) * 100 : 0;

  /* 52-week low for support detection */
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearStr = oneYearAgo.toISOString().slice(0, 10);
  const recentData = data.filter((d) => d.time >= oneYearStr);
  const low52w = recentData.length > 0 ? Math.min(...recentData.map((d) => d.low)) : null;
  const high52w = recentData.length > 0 ? Math.max(...recentData.map((d) => d.high)) : null;
  const nearSupport =
    last && low52w && high52w && high52w > low52w
      ? ((last.close - low52w) / (high52w - low52w)) * 100
      : null;

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;
    const container = chartRef.current;
    container.innerHTML = "";

    // For WSJ theme, resolve dark-mode hex colors at chart creation time
    const lw = theme === "wsj"
      ? { ...t.lwChart, ...getWsjChartColors() }
      : t.lwChart;
    const wsjDark = theme === "wsj" && typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const maOverrides: Record<number, string> | null = wsjDark
      ? { 50: "#aaaaaa", 100: "#bbbbbb", 150: "#64b5f6", 200: "#ef5350" }
      : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layoutOpts: any = {
      background: { color: lw.background },
      textColor: lw.textColor,
      fontSize: lw.fontSize,
    };
    if (lw.fontFamily) layoutOpts.fontFamily = lw.fontFamily;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gridOpts: any = {
      vertLines: { color: lw.gridVert },
      horzLines: { color: lw.gridHorz },
    };
    if (lw.gridHorzStyle !== undefined) gridOpts.horzLines.style = lw.gridHorzStyle;

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: layoutOpts,
      grid: gridOpts,
      crosshair: { mode: 0 },
      timeScale: { borderColor: lw.borderColor, timeVisible: false },
      rightPriceScale: { borderColor: lw.borderColor, minimumWidth: lw.priceMinWidth },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: lw.candleUp,
      downColor: lw.candleDown,
      borderDownColor: lw.candleDown,
      borderUpColor: lw.candleUp,
      wickDownColor: lw.candleDown,
      wickUpColor: lw.candleUp,
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

    /* Moving averages */
    for (const ma of t.ma) {
      if (showMA && data.length >= ma.period) {
        const maData = computeSMA(data, ma.period);
        const maSeries = chart.addSeries(LineSeries, {
          color: maOverrides?.[ma.period] ?? ma.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        maSeries.setData(maData);
      }
    }

    chart.timeScale().fitContent();

    // Use ResizeObserver so charts resize when container width changes
    // (e.g. sidebar open/close), not just on window resize.
    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [data, height, t, showMA]);

  return (
    <div className={t.card.className} style={t.card.style}>
      {/* Ticker header */}
      <div className={`${t.headerSpacing} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={t.ticker.className} style={t.ticker.style}>{ticker}</span>
          {last && (
            <span className={t.price.className} style={t.price.style}>
              ${last.close.toFixed(2)}
            </span>
          )}
        </div>
        {changeAll !== 0 && (
          <span
            className={t.changeBadge.className}
            style={changeAll >= 0 ? t.changeBadge.upStyle : t.changeBadge.downStyle}
          >
            {changeAll >= 0 ? "+" : ""}
            {changeAll.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Hairline (WSJ only) */}
      {t.hairline && <div style={t.hairline} />}

      {/* Chart */}
      <div ref={chartRef} className={t.chartRef.className} style={t.chartRef.style} />

      {/* Footer: MA legend + support indicator */}
      <div className={`${t.footerSpacing} flex items-center justify-between`}>
        <div className={t.maLegend.className} style={t.maLegend.style}>
          {showMA && t.ma.map(
            (ma) =>
              data.length >= ma.period && (
                <span key={ma.period} className="flex items-center gap-0.5">
                  <span
                    className={`inline-block w-3 ${t.maLegend.lineHeight} ${t.maLegend.lineRadius}`}
                    style={{ backgroundColor: ma.color }}
                  />
                  {ma.label}
                </span>
              )
          )}
        </div>
        {nearSupport !== null && (
          <span
            className={t.support.className}
            style={{
              ...t.support.style,
              color:
                nearSupport <= 15
                  ? t.support.nearColor
                  : nearSupport <= 30
                    ? t.support.approachColor
                    : t.support.defaultColor,
            }}
          >
            {nearSupport <= 15
              ? t.support.nearLabel
              : nearSupport <= 30
                ? t.support.approachLabel
                : ""}
          </span>
        )}
      </div>

      {/* Revenue + Net Income mini bars */}
      {showRevenue && fundamentals?.income && fundamentals.income.length > 0 && (
        <MiniFinancials data={fundamentals.income} theme={theme} />
      )}

      {/* Dividends */}
      {showDividends && (
        <MiniDividends
          data={fundamentals?.dividends ?? []}
          dividendYield={fundamentals?.dividendYield ?? null}
          theme={theme}
        />
      )}
    </div>
  );
}

export default memo(MiniChartInner, (prev, next) =>
  prev.ticker === next.ticker &&
  prev.data === next.data &&
  prev.height === next.height &&
  prev.theme === next.theme &&
  prev.showRevenue === next.showRevenue &&
  prev.showDividends === next.showDividends &&
  prev.showMA === next.showMA
);
