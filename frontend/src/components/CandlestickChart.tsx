"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from "lightweight-charts";
import type { ISeriesApi } from "lightweight-charts";
import type { PriceBar } from "@/lib/api";

interface CandlestickChartProps {
  data: PriceBar[];
  ticker: string;
}

/* ─── Technical indicator helpers ─── */

function computeSMA(data: PriceBar[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    result.push({ time: data[i].time, value: Math.round((sum / period) * 100) / 100 });
  }
  return result;
}

/* ─── Theme-aware colour resolver ─── */
function getThemeColors() {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return {
    bg:        dark ? "#1a1a1a" : "#f5f0e8",
    ink:       dark ? "#e0ddd5" : "#1a1a1a",
    grid:      dark ? "#2a2a2a" : "#d8d0c4",
    border:    dark ? "#333333" : "#c8c8c8",
    muted:     dark ? "#777777" : "#888888",
    candleUp:  dark ? "#c9a96e" : "#c9a96e",
    candleDown:dark ? "#d49070" : "#b07050",
    volUp:     dark ? "rgba(201,169,110,0.25)" : "rgba(201,169,110,0.30)",
    volDown:   dark ? "rgba(212,144,112,0.25)" : "rgba(176,112,80,0.30)",
  };
}

const MA_CONFIG = [
  { period: 50, color: "#8a8a8a" },   // warm gray
  { period: 100, color: "#888888" },   // grey
  { period: 150, color: "#c8c8c8" },   // light grey
  { period: 200, color: "#555555" },   // dark grey
];

/**
 * Fixed minimum-width for the right price scale.
 * 85 px comfortably holds labels up to ~9 characters (e.g. "630000.00").
 */
const PRICE_SCALE_MIN_WIDTH = 85;

export default function CandlestickChart({ data, ticker }: CandlestickChartProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [showMA, setShowMA] = useState(true);
  const showMARef = useRef(true);
  const maSeriesRef = useRef<ISeriesApi<"Line">[]>([]);

  useEffect(() => {
    if (!mainRef.current || data.length === 0) return;

    const mainContainer = mainRef.current;
    mainContainer.innerHTML = "";
    const tc = getThemeColors();

    /* ── Main price chart ── */
    const mainChart = createChart(mainContainer, {
      width: mainContainer.clientWidth,
      height: 420,
      layout: {
        background: { color: tc.bg },
        textColor: tc.muted,
        fontSize: 12,
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

    const candleSeries = mainChart.addSeries(CandlestickSeries, {
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

    const volumeSeries = mainChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    mainChart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      data.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? tc.volUp : tc.volDown,
      }))
    );

    // Moving averages
    const maList: ISeriesApi<"Line">[] = [];
    for (const ma of MA_CONFIG) {
      if (data.length >= ma.period) {
        const maData = computeSMA(data, ma.period);
        const maSeries = mainChart.addSeries(LineSeries, {
          color: ma.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          visible: showMARef.current,
        });
        maSeries.setData(maData);
        maList.push(maSeries);
      }
    }
    maSeriesRef.current = maList;

    mainChart.timeScale().fitContent();

    const handleResize = () => {
      mainChart.applyOptions({ width: mainContainer.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mainChart.remove();
    };
  }, [data]);

  /* Toggle MA visibility without recreating the chart */
  useEffect(() => {
    showMARef.current = showMA;
    for (const s of maSeriesRef.current) {
      s.applyOptions({ visible: showMA });
    }
  }, [showMA]);

  return (
    <div className="border p-4" style={{ borderColor: "var(--wsj-grey, #c8c8c8)", background: "var(--wsj-white, #f5f0e8)" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-serif), Georgia, serif", color: "var(--wsj-ink, #1a1a1a)" }}>
          {ticker} — Price Chart
        </h2>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--wsj-muted, #888888)" }}>
          <button
            onClick={() => setShowMA((v) => !v)}
            className="flex items-center gap-1 px-1.5 py-0.5 transition-colors"
            style={{
              fontFamily: "var(--font-sans-label), 'Helvetica Neue', system-ui, sans-serif",
              fontSize: "9px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: showMA ? "var(--wsj-ink, #1a1a1a)" : "var(--wsj-muted, #888888)",
              border: `1px solid ${showMA ? "var(--wsj-ink, #1a1a1a)" : "var(--wsj-grey, #c8c8c8)"}`,
              background: "transparent",
            }}
          >
            MA {showMA ? "ON" : "OFF"}
          </button>
          {showMA && MA_CONFIG.map((ma) => (
            data.length >= ma.period && (
              <span key={ma.period} className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: ma.color }} />
                MA{ma.period}
              </span>
            )
          ))}
        </div>
      </div>
      <div ref={mainRef} className="w-full" />
    </div>
  );
}
