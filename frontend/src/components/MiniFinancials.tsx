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
import type { MiniFinancialPeriod } from "@/lib/api";
import type { CSSProperties } from "react";

export type ChartThemeName = "nord" | "neu" | "wsj";

/* ─── Helpers ─── */

const fmtAxis = (val: number): string => {
  const abs = Math.abs(val);
  if (abs >= 1e9) return `${(val / 1e9).toFixed(0)}B`;
  if (abs >= 1e6) return `${(val / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return val.toFixed(0);
};

const fmtTip = (val: number): string => {
  const abs = Math.abs(val);
  if (abs >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
};

/* ─── Theme tokens ─── */

const NEU_BG = "#e0e5ec";
const NEU_SD = "#a3b1c6";
const NEU_SL = "#ffffff";

interface Tokens {
  wrapper: { className: string; style: CSSProperties };
  separator?: CSSProperties;
  title: { className: string; style: CSSProperties };
  trendColors: { growing: string; declining: string; flat: string };
  trendStyle: CSSProperties;
  profitDot: { positive: string; negative: string };
  chartArea: { className: string; style: CSSProperties };
  grid: { dash: string; stroke: string };
  xAxis: { tick: object; axisStroke: string };
  yAxisLeft: { tick: object };
  yAxisRight: { tick: object };
  tooltip: { content: CSSProperties; label: CSSProperties };
  tooltipLabels: { margin: string; revenue: string; netIncome: string };
  revBar: { fill: string; fillOpacity: number; stroke: string; strokeWidth: number; radius: [number, number, number, number] };
  netBar: { fill: string; fillOpacity: number; stroke: string; strokeWidth: number; radius: [number, number, number, number] };
  marginLine: {
    stroke: string; strokeWidth: number; dashArray?: string;
    dot: { r: number; fill: string; stroke: string; strokeWidth: number };
    activeDot: { r: number; fill: string; stroke: string; strokeWidth: number };
  };
  legend: { wrapper: CSSProperties; iconSize: number; textStyle: CSSProperties };
}

const T: Record<ChartThemeName, Tokens> = {
  nord: {
    wrapper: { className: "mt-2 pt-3", style: { borderTop: "1px solid #3B4252" } },
    title: { className: "text-[11px] font-semibold uppercase tracking-wide", style: { color: "#D8DEE9" } },
    trendColors: { growing: "#A3BE8C", declining: "#BF616A", flat: "#EBCB8B" },
    trendStyle: { fontSize: 10, fontWeight: 500 },
    profitDot: { positive: "#A3BE8C", negative: "#BF616A" },
    chartArea: { className: "rounded-lg p-1", style: { background: "rgba(59,66,82,0.3)" } },
    grid: { dash: "3 3", stroke: "#434C5E" },
    xAxis: { tick: { fill: "#D8DEE9", fontSize: 10 }, axisStroke: "#434C5E" },
    yAxisLeft: { tick: { fill: "#D8DEE9", fontSize: 9 } },
    yAxisRight: { tick: { fill: "#D08770", fontSize: 9 } },
    tooltip: {
      content: { backgroundColor: "#3B4252", border: "1px solid #434C5E", borderRadius: 8, fontSize: 11, color: "#ECEFF4" },
      label: { color: "#88C0D0", fontWeight: 600 },
    },
    tooltipLabels: { margin: "Profit Margin", revenue: "Revenue", netIncome: "Net Income" },
    revBar: { fill: "#5E81AC", fillOpacity: 0.75, stroke: "#5E81AC", strokeWidth: 1, radius: [3, 3, 0, 0] },
    netBar: { fill: "#A3BE8C", fillOpacity: 0.55, stroke: "#A3BE8C", strokeWidth: 1, radius: [3, 3, 0, 0] },
    marginLine: {
      stroke: "#D08770", strokeWidth: 2,
      dot: { r: 4, fill: "#D08770", stroke: "#2E3440", strokeWidth: 2 },
      activeDot: { r: 5, fill: "#D08770", stroke: "#ECEFF4", strokeWidth: 2 },
    },
    legend: { wrapper: { fontSize: 10, paddingTop: 4 }, iconSize: 10, textStyle: { color: "#D8DEE9" } },
  },
  neu: {
    wrapper: { className: "mt-3 pt-3", style: { borderTop: "none" } },
    separator: {
      height: 1, marginBottom: 12, borderRadius: 9999,
      background: NEU_BG,
      boxShadow: `inset 1px 1px 2px ${NEU_SD}, inset -1px -1px 2px ${NEU_SL}`,
    },
    title: { className: "text-[11px] font-bold uppercase tracking-wider", style: { color: "#6b7280" } },
    trendColors: { growing: "#16a34a", declining: "#ef4444", flat: "#ca8a04" },
    trendStyle: { fontSize: 10, fontWeight: 500 },
    profitDot: { positive: "#16a34a", negative: "#ef4444" },
    chartArea: {
      className: "rounded-xl p-1",
      style: { background: NEU_BG, boxShadow: `inset 3px 3px 6px ${NEU_SD}, inset -3px -3px 6px ${NEU_SL}` },
    },
    grid: { dash: "3 3", stroke: "#c4c9d2" },
    xAxis: { tick: { fill: "#718096", fontSize: 10 }, axisStroke: "#c4c9d2" },
    yAxisLeft: { tick: { fill: "#718096", fontSize: 9 } },
    yAxisRight: { tick: { fill: "#dd6b20", fontSize: 9 } },
    tooltip: {
      content: {
        backgroundColor: "#e8ecf1", border: "none", borderRadius: 12, fontSize: 11, color: "#2d3748",
        boxShadow: `3px 3px 6px ${NEU_SD}, -3px -3px 6px ${NEU_SL}`,
      },
      label: { color: "#667eea", fontWeight: 600 },
    },
    tooltipLabels: { margin: "Profit Margin", revenue: "Revenue", netIncome: "Net Income" },
    revBar: { fill: "#667eea", fillOpacity: 0.7, stroke: "#667eea", strokeWidth: 1, radius: [3, 3, 0, 0] },
    netBar: { fill: "#48bb78", fillOpacity: 0.55, stroke: "#48bb78", strokeWidth: 1, radius: [3, 3, 0, 0] },
    marginLine: {
      stroke: "#dd6b20", strokeWidth: 2,
      dot: { r: 4, fill: "#dd6b20", stroke: NEU_BG, strokeWidth: 2 },
      activeDot: { r: 5, fill: "#dd6b20", stroke: "#fff", strokeWidth: 2 },
    },
    legend: { wrapper: { fontSize: 10, paddingTop: 4 }, iconSize: 10, textStyle: { color: "#718096" } },
  },
  wsj: {
    wrapper: { className: "mt-2 pt-3", style: { borderTop: "1px solid var(--wsj-grey, #c8c8c8)" } },
    title: {
      className: "text-[9px] font-extrabold uppercase tracking-[0.15em]",
      style: { fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif", color: "var(--wsj-ink, #1a1a1a)" },
    },
    trendColors: { growing: "var(--wsj-gain, #2e7d32)", declining: "var(--wsj-loss, #c62828)", flat: "var(--wsj-muted, #888888)" },
    trendStyle: { fontSize: 10, fontWeight: 700, fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif" },
    profitDot: { positive: "var(--wsj-gain, #2e7d32)", negative: "var(--wsj-loss, #c62828)" },
    chartArea: { className: "p-1", style: { background: "var(--wsj-white, #f5f0e8)", border: "1px solid var(--wsj-grey, #c8c8c8)" } },
    grid: { dash: "2 4", stroke: "var(--wsj-grey, #c8c8c8)" },
    xAxis: {
      tick: { fill: "var(--wsj-muted, #888888)", fontSize: 9, fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
      axisStroke: "var(--wsj-grey, #c8c8c8)",
    },
    yAxisLeft: { tick: { fill: "var(--wsj-muted, #888888)", fontSize: 8, fontFamily: "'IBM Plex Mono', 'Courier New', monospace" } },
    yAxisRight: { tick: { fill: "var(--wsj-loss, #c62828)", fontSize: 8, fontFamily: "'IBM Plex Mono', 'Courier New', monospace" } },
    tooltip: {
      content: {
        backgroundColor: "var(--wsj-white, #f5f0e8)", border: "1px solid var(--wsj-grey, #c8c8c8)", borderRadius: 0, fontSize: 11,
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "var(--wsj-ink, #1a1a1a)",
      },
      label: { color: "var(--wsj-link, #1565c0)", fontWeight: 700, fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif" },
    },
    tooltipLabels: { margin: "Margin", revenue: "Revenue", netIncome: "Net Inc." },
    revBar: { fill: "var(--wsj-ink, #1a1a1a)", fillOpacity: 0.7, stroke: "var(--wsj-ink, #1a1a1a)", strokeWidth: 0.5, radius: [0, 0, 0, 0] },
    netBar: { fill: "var(--wsj-link, #1565c0)", fillOpacity: 0.5, stroke: "var(--wsj-link, #1565c0)", strokeWidth: 0.5, radius: [0, 0, 0, 0] },
    marginLine: {
      stroke: "var(--wsj-loss, #c62828)", strokeWidth: 1.5, dashArray: "4 2",
      dot: { r: 3, fill: "var(--wsj-loss, #c62828)", stroke: "var(--wsj-white, #f5f0e8)", strokeWidth: 1.5 },
      activeDot: { r: 4, fill: "var(--wsj-loss, #c62828)", stroke: "var(--wsj-ink, #1a1a1a)", strokeWidth: 1 },
    },
    legend: {
      wrapper: { fontSize: 9, paddingTop: 4, fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif" },
      iconSize: 8,
      textStyle: { color: "var(--wsj-ink, #1a1a1a)", letterSpacing: "0.05em", textTransform: "uppercase" as const, fontSize: 8, fontWeight: 700 },
    },
  },
};

/* ─── Component ─── */

interface MiniFinancialsProps {
  data: MiniFinancialPeriod[];
  theme?: ChartThemeName;
}

export default function MiniFinancials({ data, theme = "nord" }: MiniFinancialsProps) {
  const t = T[theme];

  if (!data || data.length === 0) return null;

  /* Build chart data with profit margin */
  const chartData = data.map((d) => {
    const rev = d.revenue ?? 0;
    const net = d.netIncome ?? 0;
    const margin = rev > 0 ? (net / rev) * 100 : 0;
    return {
      period: d.period,
      revenue: rev,
      netIncome: net,
      profitMargin: Math.round(margin * 10) / 10,
    };
  });

  /* Determine Y-axis domain for bars */
  const allVals = chartData.flatMap((d) => [d.revenue, d.netIncome]);
  const maxBar = Math.max(...allVals, 1);
  const minBar = Math.min(...allVals, 0);
  const barTop = Math.ceil(maxBar / 1e9) * 1e9 || Math.ceil(maxBar / 1e6) * 1e6 || maxBar * 1.1;
  const barBottom = minBar < 0 ? Math.floor(minBar / 1e9) * 1e9 : 0;

  /* Determine Y-axis domain for margin line */
  const margins = chartData.map((d) => d.profitMargin);
  const maxMargin = Math.max(...margins, 10);
  const minMargin = Math.min(...margins, 0);
  const marginTop = Math.ceil(maxMargin / 10) * 10;
  const marginBottom = minMargin < 0 ? Math.floor(minMargin / 10) * 10 : 0;

  /* Quick health indicators — nuanced trend detection */
  const latest = chartData[chartData.length - 1];
  const first = chartData[0];

  const revChange = first.revenue > 0
    ? ((latest.revenue - first.revenue) / first.revenue) * 100
    : 0;
  const netChange = first.netIncome !== 0
    ? ((latest.netIncome - first.netIncome) / Math.abs(first.netIncome)) * 100
    : latest.netIncome > 0 ? 100 : latest.netIncome < 0 ? -100 : 0;

  const classifyTrend = (pctChange: number): "growing" | "stagnating" | "declining" => {
    if (pctChange > 10) return "growing";
    if (pctChange < -10) return "declining";
    return "stagnating";
  };

  const revTrend = chartData.length >= 2 ? classifyTrend(revChange) : null;
  const netTrend = chartData.length >= 2 ? classifyTrend(netChange) : null;
  const profitable = latest.netIncome >= 0;

  const tc = t.trendColors;
  const trendLabel = (trend: "growing" | "stagnating" | "declining" | null, prefix: string) => {
    if (!trend) return null;
    const cfg = {
      growing:    { icon: "▲", text: `${prefix} Growing`,   color: tc.growing },
      stagnating: { icon: "▬", text: `${prefix} Flat`,      color: tc.flat },
      declining:  { icon: "▼", text: `${prefix} Declining`, color: tc.declining },
    }[trend];
    return <span style={{ ...t.trendStyle, color: cfg.color }}>{cfg.icon} {cfg.text}</span>;
  };

  const lbl = t.tooltipLabels;

  return (
    <div className={t.wrapper.className} style={t.wrapper.style}>
      {t.separator && <div style={t.separator} />}

      {/* Title row */}
      <div className="mb-1 flex items-center justify-between">
        <span className={t.title.className} style={t.title.style}>
          Revenue &amp; Profit
        </span>
        <div className="flex items-center gap-2 text-[10px] font-medium">
          {trendLabel(revTrend, "Rev")}
          {trendLabel(netTrend, "Net")}
          <span style={{ color: profitable ? t.profitDot.positive : t.profitDot.negative, fontSize: 10 }}>
            ●
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className={t.chartArea.className} style={t.chartArea.style}>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
            barGap={2}
            barCategoryGap="20%"
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
              yAxisId="left"
              tick={t.yAxisLeft.tick}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtAxis}
              domain={[barBottom, barTop]}
              width={38}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={t.yAxisRight.tick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              domain={[marginBottom, marginTop]}
              width={32}
            />
            <Tooltip
              contentStyle={t.tooltip.content}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: any, name: any) => {
                const v = Number(value) || 0;
                const nm = String(name ?? "");
                if (nm === "profitMargin") return [`${v.toFixed(1)}%`, lbl.margin];
                if (nm === "revenue") return [fmtTip(v), lbl.revenue];
                if (nm === "netIncome") return [fmtTip(v), lbl.netIncome];
                return [v, nm];
              }) as never}
              labelStyle={t.tooltip.label}
            />
            <Bar
              yAxisId="left"
              dataKey="revenue"
              fill={t.revBar.fill}
              fillOpacity={t.revBar.fillOpacity}
              stroke={t.revBar.stroke}
              strokeWidth={t.revBar.strokeWidth}
              radius={t.revBar.radius}
              name="revenue"
            />
            <Bar
              yAxisId="left"
              dataKey="netIncome"
              fill={t.netBar.fill}
              fillOpacity={t.netBar.fillOpacity}
              stroke={t.netBar.stroke}
              strokeWidth={t.netBar.strokeWidth}
              radius={t.netBar.radius}
              name="netIncome"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="profitMargin"
              stroke={t.marginLine.stroke}
              strokeWidth={t.marginLine.strokeWidth}
              strokeDasharray={t.marginLine.dashArray}
              dot={t.marginLine.dot}
              activeDot={t.marginLine.activeDot}
              name="profitMargin"
            />
            <Legend
              wrapperStyle={t.legend.wrapper}
              formatter={(value: string) => {
                const map: Record<string, string> = {
                  revenue: lbl.revenue,
                  netIncome: lbl.netIncome,
                  profitMargin: lbl.margin,
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
