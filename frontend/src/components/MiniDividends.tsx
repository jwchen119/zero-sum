"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { MiniDividendPeriod } from "@/lib/api";
import type { CSSProperties } from "react";

export type ChartThemeName = "nord" | "neu" | "wsj";

/* ─── Theme tokens ─── */

const NEU_SD = "#a3b1c6";
const NEU_SL = "#ffffff";

interface Tokens {
  wrapper: { className: string; style: CSSProperties };
  separator?: CSSProperties;
  title: { className: string; style: CSSProperties };
  noData: { className: string; style: CSSProperties };
  yieldLabel: { className: string; style: CSSProperties };
  trendBadge: { className: string; style: CSSProperties };
  trendColors: { growing: string; declining: string; flat: string };
  chartArea: { className: string; style: CSSProperties };
  grid: { dash: string; stroke: string };
  xAxis: { tick: object; axisStroke: string };
  yAxis: { tick: object };
  tooltip: { content: CSSProperties; label: CSSProperties };
  bar: { fill: string; fillOpacity: number; stroke: string; strokeWidth: number; radius: [number, number, number, number] };
  trendLine: { up: string; down: string; strokeWidth: number };
  legend: { wrapper: CSSProperties; iconSize: number; textStyle: CSSProperties };
}

const T: Record<ChartThemeName, Tokens> = {
  nord: {
    wrapper: { className: "mt-2 pt-3", style: { borderTop: "1px solid #3B4252" } },
    title: { className: "text-[11px] font-semibold uppercase tracking-wide", style: { color: "#D8DEE9" } },
    noData: { className: "text-[10px]", style: { color: "#4C566A" } },
    yieldLabel: { className: "text-[10px]", style: { color: "#88C0D0" } },
    trendBadge: { className: "text-[10px] font-medium", style: {} },
    trendColors: { growing: "#A3BE8C", declining: "#BF616A", flat: "#EBCB8B" },
    chartArea: { className: "rounded-lg p-1", style: { background: "rgba(59,66,82,0.3)" } },
    grid: { dash: "3 3", stroke: "#434C5E" },
    xAxis: { tick: { fill: "#D8DEE9", fontSize: 10 }, axisStroke: "#434C5E" },
    yAxis: { tick: { fill: "#D8DEE9", fontSize: 9 } },
    tooltip: {
      content: { backgroundColor: "#3B4252", border: "1px solid #434C5E", borderRadius: 8, fontSize: 11, color: "#ECEFF4" },
      label: { color: "#88C0D0", fontWeight: 600 },
    },
    bar: { fill: "#B48EAD", fillOpacity: 0.7, stroke: "#B48EAD", strokeWidth: 1, radius: [3, 3, 0, 0] },
    trendLine: { up: "#A3BE8C", down: "#BF616A", strokeWidth: 2 },
    legend: { wrapper: { fontSize: 10, paddingTop: 4 }, iconSize: 10, textStyle: { color: "#D8DEE9" } },
  },
  neu: {
    wrapper: { className: "mt-3 pt-3", style: {} },
    separator: {
      height: 1, marginBottom: 12, borderRadius: 9999,
      background: "#e0e5ec",
      boxShadow: `inset 1px 1px 2px ${NEU_SD}, inset -1px -1px 2px ${NEU_SL}`,
    },
    title: { className: "text-[11px] font-bold uppercase tracking-wider", style: { color: "#6b7280" } },
    noData: { className: "text-[10px]", style: { color: "#9ca3af" } },
    yieldLabel: { className: "text-[10px] font-medium", style: { color: "#6366f1" } },
    trendBadge: { className: "text-[10px] font-bold", style: {} },
    trendColors: { growing: "#16a34a", declining: "#ef4444", flat: "#ca8a04" },
    chartArea: {
      className: "rounded-xl p-1",
      style: { background: "#e0e5ec", boxShadow: `inset 3px 3px 6px ${NEU_SD}, inset -3px -3px 6px ${NEU_SL}` },
    },
    grid: { dash: "3 3", stroke: "#c4c9d2" },
    xAxis: { tick: { fill: "#718096", fontSize: 10 }, axisStroke: "#c4c9d2" },
    yAxis: { tick: { fill: "#718096", fontSize: 9 } },
    tooltip: {
      content: {
        backgroundColor: "#e8ecf1", border: "none", borderRadius: 12, fontSize: 11, color: "#2d3748",
        boxShadow: `3px 3px 6px ${NEU_SD}, -3px -3px 6px ${NEU_SL}`,
      },
      label: { color: "#667eea", fontWeight: 600 },
    },
    bar: { fill: "#9f7aea", fillOpacity: 0.65, stroke: "#9f7aea", strokeWidth: 1, radius: [3, 3, 0, 0] },
    trendLine: { up: "#48bb78", down: "#fc8181", strokeWidth: 2 },
    legend: { wrapper: { fontSize: 10, paddingTop: 4 }, iconSize: 10, textStyle: { color: "#718096" } },
  },
  wsj: {
    wrapper: { className: "mt-2 pt-3", style: { borderTop: "1px solid var(--wsj-grey, #c8c8c8)" } },
    title: {
      className: "text-[9px] font-extrabold uppercase tracking-[0.15em]",
      style: { fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif", color: "var(--wsj-ink, #1a1a1a)" },
    },
    noData: { className: "text-[10px]", style: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "var(--wsj-muted, #888888)" } },
    yieldLabel: { className: "text-[10px]", style: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "var(--wsj-link, #1565c0)" } },
    trendBadge: {
      className: "text-[10px] font-bold",
      style: { fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif" },
    },
    trendColors: { growing: "var(--wsj-gain, #2e7d32)", declining: "var(--wsj-loss, #c62828)", flat: "var(--wsj-muted, #888888)" },
    chartArea: { className: "p-1", style: { background: "var(--wsj-white, #f5f0e8)", border: "1px solid var(--wsj-grey, #c8c8c8)" } },
    grid: { dash: "2 4", stroke: "var(--wsj-grey, #c8c8c8)" },
    xAxis: {
      tick: { fill: "var(--wsj-muted, #888888)", fontSize: 9, fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
      axisStroke: "var(--wsj-grey, #c8c8c8)",
    },
    yAxis: { tick: { fill: "var(--wsj-muted, #888888)", fontSize: 8, fontFamily: "'IBM Plex Mono', 'Courier New', monospace" } },
    tooltip: {
      content: {
        backgroundColor: "var(--wsj-white, #f5f0e8)", border: "1px solid var(--wsj-grey, #c8c8c8)", borderRadius: 0, fontSize: 11,
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "var(--wsj-ink, #1a1a1a)",
      },
      label: { color: "var(--wsj-link, #1565c0)", fontWeight: 700, fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif" },
    },
    bar: { fill: "var(--wsj-ink, #1a1a1a)", fillOpacity: 0.55, stroke: "var(--wsj-ink, #1a1a1a)", strokeWidth: 0.5, radius: [0, 0, 0, 0] },
    trendLine: { up: "var(--wsj-gain, #2e7d32)", down: "var(--wsj-loss, #c62828)", strokeWidth: 1.5 },
    legend: {
      wrapper: { fontSize: 9, paddingTop: 4, fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif" },
      iconSize: 8,
      textStyle: { color: "var(--wsj-ink, #1a1a1a)", letterSpacing: "0.05em", textTransform: "uppercase" as const, fontSize: 8, fontWeight: 700 },
    },
  },
};

/* ─── Component ─── */

interface MiniDividendsProps {
  data: MiniDividendPeriod[];
  dividendYield: number | null;
  theme?: ChartThemeName;
}

export default function MiniDividends({ data, dividendYield, theme = "nord" }: MiniDividendsProps) {
  const t = T[theme];

  /* No dividends at all */
  if (!data || data.length === 0) {
    return (
      <div className={t.wrapper.className} style={t.wrapper.style}>
        {t.separator && <div style={t.separator} />}
        <div className="flex items-center justify-between">
          <span className={t.title.className} style={t.title.style}>Dividends</span>
          <span className={t.noData.className} style={t.noData.style}>No dividends paid</span>
        </div>
      </div>
    );
  }

  /* Filter out incomplete current year for cleaner chart */
  const completeData = data.filter((d) => !d.incomplete);
  const chartData = (completeData.length > 0 ? completeData : data).map((d) => ({
    period: d.period,
    dividend: Math.round(d.total * 10000) / 10000,
    payments: d.payments,
  }));

  const n = chartData.length;
  if (n === 0) {
    return (
      <div className={t.wrapper.className} style={t.wrapper.style}>
        {t.separator && <div style={t.separator} />}
        <div className="flex items-center justify-between">
          <span className={t.title.className} style={t.title.style}>Dividends</span>
          <span className={t.noData.className} style={t.noData.style}>No dividends paid</span>
        </div>
      </div>
    );
  }

  /* Trend detection */
  const first = chartData[0].dividend;
  const last = chartData[n - 1].dividend;
  const pctChange = first > 0 ? ((last - first) / first) * 100 : last > 0 ? 100 : 0;

  const tc = t.trendColors;
  const trendLabel =
    pctChange > 10
      ? { icon: "▲", text: "Growing", color: tc.growing }
      : pctChange < -10
        ? { icon: "▼", text: "Declining", color: tc.declining }
        : { icon: "▬", text: "Flat", color: tc.flat };

  /* Trend line via linear regression */
  const divVals = chartData.map((d) => d.dividend);
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += divVals[i];
    sumXY += i * divVals[i];
    sumX2 += i * i;
  }
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
  const intercept = (sumY - slope * sumX) / n;

  const trendData = chartData.map((d, i) => ({
    ...d,
    trend: Math.round((intercept + slope * i) * 10000) / 10000,
  }));

  const maxDiv = Math.max(...divVals, 0.01);

  return (
    <div className={t.wrapper.className} style={t.wrapper.style}>
      {t.separator && <div style={t.separator} />}

      {/* Title row */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={t.title.className} style={t.title.style}>
            Dividends
          </span>
          {dividendYield !== null && (
            <span className={t.yieldLabel.className} style={t.yieldLabel.style}>
              Yield {dividendYield.toFixed(2)}%
            </span>
          )}
        </div>
        <span
          className={t.trendBadge.className}
          style={{ ...t.trendBadge.style, color: trendLabel.color }}
        >
          {trendLabel.icon} {trendLabel.text}
        </span>
      </div>

      {/* Chart */}
      <div className={t.chartArea.className} style={t.chartArea.style}>
        <ResponsiveContainer width="100%" height={120}>
          <ComposedChart
            data={trendData}
            margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
            barCategoryGap="25%"
          >
            <CartesianGrid
              strokeDasharray={t.grid.dash}
              stroke={t.grid.stroke}
              vertical={false}
            />
            <XAxis
              dataKey="period"
              tick={t.xAxis.tick}
              tickLine={false}
              axisLine={{ stroke: t.xAxis.axisStroke }}
            />
            <YAxis
              tick={t.yAxis.tick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              domain={[0, maxDiv * 1.15]}
              width={42}
            />
            <Tooltip
              contentStyle={t.tooltip.content}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: any, name: any) => {
                const v = Number(value) || 0;
                const nm = String(name ?? "");
                if (nm === "dividend") return [`$${v.toFixed(4)}`, "Div/Share"];
                if (nm === "trend") return [`$${v.toFixed(4)}`, "Trend"];
                return [v, nm];
              }) as never}
              labelStyle={t.tooltip.label}
            />
            <Bar
              dataKey="dividend"
              fill={t.bar.fill}
              fillOpacity={t.bar.fillOpacity}
              stroke={t.bar.stroke}
              strokeWidth={t.bar.strokeWidth}
              radius={t.bar.radius}
              name="dividend"
            />
            <Line
              type="monotone"
              dataKey="trend"
              stroke={slope >= 0 ? t.trendLine.up : t.trendLine.down}
              strokeWidth={t.trendLine.strokeWidth}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
              name="trend"
            />
            <Legend
              wrapperStyle={t.legend.wrapper}
              formatter={(value: string) => {
                const map: Record<string, string> = {
                  dividend: "Div/Share",
                  trend: "Trend",
                };
                return <span style={t.legend.textStyle}>{map[value] ?? value}</span>;
              }}
              iconSize={t.legend.iconSize}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
