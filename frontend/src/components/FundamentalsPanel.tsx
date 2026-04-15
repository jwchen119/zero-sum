"use client";

import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import type { FundamentalsResponse, IncomeItem, DividendItem } from "@/lib/api";
import { formatCurrency, formatPercent, computeGrowth, formatGrowth, findYoYIndex, smartYBase } from "@/lib/format";

interface FundamentalsPanelProps {
  data: FundamentalsResponse;
}

/* ─── Helpers ─── */

/** Compute YoY growth for a field across the income array, respecting quarterly mode. */
function incomeGrowth(
  items: IncomeItem[],
  idx: number,
  field: keyof IncomeItem,
  isQuarterly: boolean
): number | null {
  const yoyIdx = findYoYIndex(items, idx, isQuarterly);
  if (yoyIdx == null) return null;
  return computeGrowth(items[idx][field] as number | null, items[yoyIdx][field] as number | null);
}

function divGrowth(items: DividendItem[], idx: number, isQuarterly: boolean): number | null {
  // Skip incomplete periods for growth calculation
  if (items[idx].incomplete) return null;
  const yoyIdx = findYoYIndex(items, idx, isQuarterly);
  if (yoyIdx == null) return null;
  // Use perPayment rate for growth to avoid payment-count noise
  return computeGrowth(items[idx].perPayment, items[yoyIdx].perPayment);
}

/** Build a period range description like "2021 – 2024, Annual" or "Q1 2023 – Q4 2024, Quarterly" */
function periodRangeLabel(items: { period: string }[], quarterly: boolean): string {
  if (items.length === 0) return "";
  const first = items[0].period;
  const last = items[items.length - 1].period;
  const range = first === last ? first : `${first} – ${last}`;
  return `${range}, ${quarterly ? "Quarterly" : "Annual"}`;
}

/** Whether to show growth labels (hide when >10 bars to avoid clutter) */
function showLabels(count: number): boolean {
  return count <= 10;
}

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "#f5f0e8", border: "1px solid #c8c8c8", borderRadius: 0, fontFamily: "var(--font-mono-data), monospace", fontSize: 12 },
  labelStyle: { color: "#1a1a1a", fontFamily: "var(--font-sans-label), sans-serif", fontWeight: 700 },
};

const serif = "var(--font-serif), 'Georgia', serif";
const sans  = "var(--font-sans-label), 'Helvetica Neue', sans-serif";
const mono  = "var(--font-mono-data), 'Courier New', monospace";
const INK   = "#1a1a1a";
const T2    = "#555555";
const TM    = "#888888";
const GRY   = "#c8c8c8";
const GR2   = "#d8d0c4";
const BLU   = "#8a8a8a";
const RED   = "#b07050";
const GRN   = "#c9a96e";

/* ─────────────────────────────────────────────
   Health Summary — multi-period trend, not single-period snapshot
   ───────────────────────────────────────────── */

interface Badge {
  label: string;
  ok: boolean | null;
  detail: string;
}

function HealthSummary({ data }: FundamentalsPanelProps) {
  const inc = data.income;
  const divs = data.dividends;
  const isQ = data.quarterly;

  const badges: Badge[] = [];

  // 1. Profitable? — check majority of periods, not just the latest
  const profitablePeriods = inc.filter((d) => (d.netIncome ?? 0) > 0).length;
  const totalPeriods = inc.length;
  if (totalPeriods > 0) {
    const allProfitable = profitablePeriods === totalPeriods;
    const mostProfitable = profitablePeriods >= Math.ceil(totalPeriods * 0.75);
    badges.push({
      label: "Profitable",
      ok: mostProfitable,
      detail: allProfitable
        ? `All ${totalPeriods} periods`
        : `${profitablePeriods}/${totalPeriods} periods`,
    });
  }

  // 2. Revenue trend — count how many periods show positive YoY growth
  if (inc.length >= 2) {
    let positiveCount = 0;
    let measurable = 0;
    for (let i = 1; i < inc.length; i++) {
      const g = incomeGrowth(inc, i, "revenue", isQ);
      if (g != null) { measurable++; if (g > 0) positiveCount++; }
    }
    const latestG = incomeGrowth(inc, inc.length - 1, "revenue", isQ);
    badges.push({
      label: "Revenue Growing",
      ok: measurable > 0 ? positiveCount >= Math.ceil(measurable * 0.5) : null,
      detail: latestG != null
        ? `${formatGrowth(latestG)} latest, ${positiveCount}/${measurable} up`
        : `${positiveCount}/${measurable} periods up`,
    });
  }

  // 3. Earnings trend
  if (inc.length >= 2) {
    let positiveCount = 0;
    let measurable = 0;
    for (let i = 1; i < inc.length; i++) {
      const g = incomeGrowth(inc, i, "netIncome", isQ);
      if (g != null) { measurable++; if (g > 0) positiveCount++; }
    }
    const latestG = incomeGrowth(inc, inc.length - 1, "netIncome", isQ);
    badges.push({
      label: "Earnings Growing",
      ok: measurable > 0 ? positiveCount >= Math.ceil(measurable * 0.5) : null,
      detail: latestG != null
        ? `${formatGrowth(latestG)} latest, ${positiveCount}/${measurable} up`
        : `${positiveCount}/${measurable} periods up`,
    });
  }

  // 4. Dividend trend
  if (divs.length >= 2) {
    let positiveCount = 0;
    let measurable = 0;
    for (let i = 1; i < divs.length; i++) {
      const g = divGrowth(divs, i, isQ);
      if (g != null) { measurable++; if (g > 0) positiveCount++; }
    }
    const latestG = divGrowth(divs, divs.length - 1, isQ);
    badges.push({
      label: "Dividend Growing",
      ok: measurable > 0 ? positiveCount >= Math.ceil(measurable * 0.5) : null,
      detail: latestG != null
        ? `${formatGrowth(latestG)} latest, ${positiveCount}/${measurable} up`
        : `${positiveCount}/${measurable} periods up`,
    });
  } else if (divs.length === 0) {
    badges.push({ label: "Pays Dividend", ok: false, detail: "No dividends" });
  }

  // 5. Positive margin?
  const margin = data.ratios.profitMargin;
  badges.push({
    label: "Positive Margin",
    ok: margin != null ? margin > 0 : null,
    detail: margin != null ? `${(margin * 100).toFixed(1)}% net margin` : "No data",
  });

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((b) => (
        <div
          key={b.label}
          className="flex items-center gap-2 px-3 py-2 text-sm"
          style={{
            fontFamily: mono,
            border: `1px solid ${GRY}`,
            color: b.ok === true ? GRN : b.ok === false ? RED : INK,
          }}
        >
          <span className="text-base font-bold">{b.ok === true ? "\u2713" : b.ok === false ? "\u2717" : "?"}</span>
          <div>
            <div className="font-bold text-xs" style={{ fontFamily: sans }}>{b.label}</div>
            <div className="text-[10px]" style={{ color: TM }}>{b.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Ratios Card — colors are soft / factual, no sector-blind judgments
   ───────────────────────────────────────────── */

const colorClasses = {
  green: "text-[#c9a96e]",
  red: "text-[#b07050]",
  neutral: "text-[#1a1a1a]",
} as const;

type RatingColor = keyof typeof colorClasses;

function RatiosCard({ data }: FundamentalsPanelProps) {
  const r = data.ratios;

  // Only color positive/negative — no threshold judgments
  const posNeg = (v: number | null | undefined): RatingColor =>
    v == null ? "neutral" : v > 0 ? "green" : v < 0 ? "red" : "neutral";

  const rows: { label: string; value: string; color: RatingColor }[] = [
    { label: "Market Cap", value: formatCurrency(r.marketCap), color: "neutral" },
    { label: "Trailing P/E", value: r.trailingPE?.toFixed(1) ?? "N/A", color: "neutral" },
    { label: "Forward P/E", value: r.forwardPE?.toFixed(1) ?? "N/A", color: "neutral" },
    { label: "EPS (trailing)", value: r.epsTrailing ? `$${r.epsTrailing.toFixed(2)}` : "N/A", color: posNeg(r.epsTrailing) },
    { label: "EPS (forward)", value: r.epsForward ? `$${r.epsForward.toFixed(2)}` : "N/A", color: posNeg(r.epsForward) },
    { label: "Gross Margin", value: formatPercent(r.grossMargin), color: posNeg(r.grossMargin) },
    { label: "Operating Margin", value: formatPercent(r.operatingMargin), color: posNeg(r.operatingMargin) },
    { label: "Profit Margin", value: formatPercent(r.profitMargin), color: posNeg(r.profitMargin) },
    { label: "Dividend Rate", value: r.dividendRate ? `$${r.dividendRate.toFixed(2)}/share` : "None", color: "neutral" },
    { label: "Dividend Yield", value: r.dividendYield ? formatPercent(r.dividendYield) : "None", color: "neutral" },
    { label: "Payout Ratio", value: r.payoutRatio ? formatPercent(r.payoutRatio) : "N/A", color: "neutral" },
  ];

  return (
    <div>
      <h3 className="mb-1 text-lg font-bold" style={{ fontFamily: serif, color: INK }}>{r.name}</h3>
      <p className="mb-4 text-sm" style={{ fontFamily: sans, color: TM }}>
        {r.sector} \u00b7 {r.industry}
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${GR2}` }}>
            <span style={{ fontFamily: sans, color: TM, fontSize: 12 }}>{row.label}</span>
            <span className={`font-bold tabular-nums ${colorClasses[row.color]}`} style={{ fontFamily: mono }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Revenue Chart — separate Net Income sub-chart, YoY growth, zero-line
   ───────────────────────────────────────────── */

function RevenueChart({ data }: FundamentalsPanelProps) {
  const isQ = data.quarterly;
  const inc = data.income;
  const doShow = showLabels(inc.length);

  const maxRev = Math.max(...inc.map((d) => Math.abs(d.revenue ?? 0)));
  const maxNI = Math.max(...inc.map((d) => Math.abs(d.netIncome ?? 0)));
  const revDiv = maxRev >= 1e9 ? 1e9 : maxRev >= 1e6 ? 1e6 : 1;
  const niDiv = maxNI >= 1e9 ? 1e9 : maxNI >= 1e6 ? 1e6 : 1;
  const revUnit = maxRev >= 1e9 ? "B" : maxRev >= 1e6 ? "M" : "";
  const niUnit = maxNI >= 1e9 ? "B" : maxNI >= 1e6 ? "M" : "";

  const revData = inc.map((d, i) => ({
    period: d.period,
    Revenue: d.revenue ? d.revenue / revDiv : 0,
    revGrowth: incomeGrowth(inc, i, "revenue", isQ),
  }));
  const revBase = smartYBase(revData.map((d) => d.Revenue));

  const niData = inc.map((d, i) => ({
    period: d.period,
    "Net Income": d.netIncome ? d.netIncome / niDiv : 0,
    niGrowth: incomeGrowth(inc, i, "netIncome", isQ),
  }));
  const niBase = smartYBase(niData.map((d) => d["Net Income"]));

  const xAxisProps = {
    dataKey: "period" as const,
    tick: { fill: TM, fontSize: 11, fontFamily: mono },
    angle: isQ ? -45 : 0,
    textAnchor: (isQ ? "end" : "middle") as "end" | "middle",
    height: isQ ? 60 : 30,
  };

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Revenue & Net Income</h3>
        <span className="text-[10px]" style={{ fontFamily: mono, color: TM }}>{periodRangeLabel(inc, data.quarterly)}</span>
      </div>
      <div className="space-y-6">
        {/* Revenue sub-chart */}
        <h4 className="text-[9px] font-extrabold uppercase tracking-[0.15em] mb-1" style={{ fontFamily: sans, color: BLU }}>Revenue</h4>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={revData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke={GR2} />
            <XAxis {...xAxisProps} />
            <YAxis tick={{ fill: TM, fontSize: 11, fontFamily: mono }} tickFormatter={(v) => `$${v}${revUnit}`} domain={[revBase, 'auto']} />
            <Tooltip {...TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _n: any, props: any) => {
                const g = props.payload.revGrowth;
                const gs = g != null ? ` (${formatGrowth(g)})` : "";
                return [`$${Number(value ?? 0).toFixed(1)}${revUnit}${gs}`, "Revenue"];
              }}
            />
            <Bar dataKey="Revenue" radius={[4, 4, 0, 0]}>
              {revData.map((entry, i) => {
                const g = entry.revGrowth;
                const color = g == null ? BLU : g > 0 ? GRN : g < 0 ? RED : BLU;
                return <Cell key={i} fill={color} />;
              })}
              {doShow && (
                <LabelList
                  dataKey="revGrowth"
                  position="top"
                  formatter={(v: unknown) => (v != null ? formatGrowth(v as number) : "")}
                  style={{ fontSize: 10, fontWeight: 600, fontFamily: mono }}
                  fill={TM}
                />
              )}
            </Bar>
            <Line type="monotone" dataKey="Revenue" stroke={BLU} strokeWidth={2} dot={{ r: 3, fill: BLU }} tooltipType="none" legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>
        {/* Net Income sub-chart — own Y-axis scale so trend is visible */}
        <h4 className="text-[9px] font-extrabold uppercase tracking-[0.15em] mb-1" style={{ fontFamily: sans, color: GRN }}>Net Income</h4>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={niData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke={GR2} />
            <XAxis {...xAxisProps} />
            <YAxis tick={{ fill: TM, fontSize: 11, fontFamily: mono }} tickFormatter={(v) => `$${v}${niUnit}`} domain={[niBase, 'auto']} />
            <ReferenceLine y={0} stroke={GRY} strokeDasharray="3 3" />
            <Tooltip {...TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _n: any, props: any) => {
                const g = props.payload.niGrowth;
                const gs = g != null ? ` (${formatGrowth(g)})` : "";
                return [`$${Number(value ?? 0).toFixed(1)}${niUnit}${gs}`, "Net Income"];
              }}
            />
            <Bar dataKey="Net Income" radius={[4, 4, 0, 0]}>
              {niData.map((entry, i) => (
                <Cell key={i} fill={entry["Net Income"] >= 0 ? GRN : RED} />
              ))}
              {doShow && (
                <LabelList
                  dataKey="niGrowth"
                  position="top"
                  formatter={(v: unknown) => (v != null ? formatGrowth(v as number) : "")}
                  style={{ fontSize: 10, fontWeight: 600, fontFamily: mono }}
                  fill={TM}
                />
              )}
            </Bar>
            <Line type="monotone" dataKey="Net Income" stroke={TM} strokeWidth={2} dot={{ r: 3, fill: TM }} strokeDasharray="4 2" tooltipType="none" legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Margins Chart — zero-line, period label
   ───────────────────────────────────────────── */

function MarginsChart({ data }: FundamentalsPanelProps) {
  const isQ = data.quarterly;
  const chartData = data.income.map((d) => ({
    period: d.period,
    "Gross Margin": d.grossMargin,
    "Op. Margin": d.operatingMargin,
    "Net Margin": d.netMargin,
  }));

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Profit Margins</h3>
        <span className="text-[10px]" style={{ fontFamily: mono, color: TM }}>{periodRangeLabel(data.income, data.quarterly)}</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GR2} />
          <XAxis
            dataKey="period"
            tick={{ fill: TM, fontSize: 11, fontFamily: mono }}
            angle={isQ ? -45 : 0}
            textAnchor={isQ ? "end" : "middle"}
            height={isQ ? 60 : 30}
          />
          <YAxis tick={{ fill: TM, fontSize: 11, fontFamily: mono }} tickFormatter={(v) => `${v}%`} />
          <ReferenceLine y={0} stroke={GRY} strokeDasharray="3 3" />
          <Tooltip {...TOOLTIP_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [`${Number(value ?? 0).toFixed(1)}%`, undefined]}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: sans }} />
          <Area type="monotone" dataKey="Gross Margin" fill={GRN} fillOpacity={0.06} stroke="none" tooltipType="none" legendType="none" />
          <Area type="monotone" dataKey="Op. Margin" fill={BLU} fillOpacity={0.06} stroke="none" tooltipType="none" legendType="none" />
          <Area type="monotone" dataKey="Net Margin" fill={TM} fillOpacity={0.06} stroke="none" tooltipType="none" legendType="none" />
          <Line type="monotone" dataKey="Gross Margin" stroke={GRN} strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="Op. Margin" stroke={BLU} strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="Net Margin" stroke={TM} strokeWidth={2} dot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EPS Chart — YoY growth, zero-line, period label, cramp-aware labels
   ───────────────────────────────────────────── */

function EpsChart({ data }: FundamentalsPanelProps) {
  const isQ = data.quarterly;
  const inc = data.income;
  const doShow = showLabels(inc.length);

  const chartData = inc.map((d, i) => ({
    period: d.period,
    EPS: d.eps,
    growth: incomeGrowth(inc, i, "eps", isQ),
  }));
  const epsBase = smartYBase(chartData.map((d) => d.EPS));

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Earnings Per Share</h3>
        <span className="text-[10px]" style={{ fontFamily: mono, color: TM }}>{periodRangeLabel(inc, data.quarterly)}</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GR2} />
          <XAxis
            dataKey="period"
            tick={{ fill: TM, fontSize: 11, fontFamily: mono }}
            angle={isQ ? -45 : 0}
            textAnchor={isQ ? "end" : "middle"}
            height={isQ ? 60 : 30}
          />
          <YAxis tick={{ fill: TM, fontSize: 11, fontFamily: mono }} tickFormatter={(v) => `$${v}`} domain={[epsBase, 'auto']} />
          <ReferenceLine y={0} stroke={GRY} strokeDasharray="3 3" />
          <Tooltip {...TOOLTIP_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, _: any, props: any) => {
              const g = props.payload.growth;
              const gs = g != null ? ` (${formatGrowth(g)})` : "";
              return [`$${Number(value ?? 0).toFixed(2)}${gs}`, "EPS"];
            }}
          />
          <Bar dataKey="EPS" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={(entry.EPS ?? 0) >= 0 ? BLU : RED} />
            ))}
            {doShow && (
              <LabelList
                dataKey="growth"
                position="top"
                formatter={(v: unknown) => (v != null ? formatGrowth(v as number) : "")}
                style={{ fontSize: 10, fontWeight: 600, fontFamily: mono }}
                fill={TM}
              />
            )}
          </Bar>
          <Line type="monotone" dataKey="EPS" stroke={TM} strokeWidth={2} dot={{ r: 3, fill: TM }} strokeDasharray="4 2" tooltipType="none" legendType="none" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Dividends Chart — YoY growth, neutral first-bar, cramp-aware labels
   ───────────────────────────────────────────── */

function DividendsChart({ data }: FundamentalsPanelProps) {
  if (data.dividends.length === 0) {
    return (
      <div>
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3" style={{ fontFamily: sans, color: INK }}>Dividends</h3>
        <p className="text-sm" style={{ fontFamily: serif, color: TM }}>No dividend history available.</p>
      </div>
    );
  }

  const isQ = data.quarterly;
  const divs = data.dividends;
  const doShow = showLabels(divs.length);

  // Detect if this is a multi-payment-per-period payer (monthly → ~3 per quarter)
  const median = divs[0]?.medianPayments ?? 1;
  const isMultiPay = median > 1;

  const chartData = divs.map((d, i) => ({
    period: d.period,
    // Use perPayment rate to normalize payment-count artifacts
    "Div/Share": d.perPayment,
    total: d.total,
    growth: divGrowth(divs, i, isQ),
    payments: d.payments,
    incomplete: d.incomplete,
  }));
  const divBase = smartYBase(chartData.map((d) => d["Div/Share"]));

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>
          Dividend Per Share
          {isMultiPay && isQ && (
            <span className="ml-2 text-[10px] font-normal" style={{ color: TM }}>(per payment)</span>
          )}
          {data.ratios.dividendYield != null && (
            <span className="ml-3 px-2 py-0.5 text-[10px] font-bold" style={{ fontFamily: mono, border: `1px solid ${GRY}`, color: INK }}>
              Yield: {(data.ratios.dividendYield * 100).toFixed(2)}%
            </span>
          )}
        </h3>
        <span className="text-[10px]" style={{ fontFamily: mono, color: TM }}>{periodRangeLabel(divs, data.quarterly)}</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GR2} />
          <XAxis
            dataKey="period"
            tick={{ fill: TM, fontSize: 11, fontFamily: mono }}
            angle={isQ || chartData.length > 8 ? -45 : 0}
            textAnchor={isQ || chartData.length > 8 ? "end" : "middle"}
            height={isQ || chartData.length > 8 ? 60 : 30}
          />
          <YAxis tick={{ fill: TM, fontSize: 11, fontFamily: mono }} tickFormatter={(v) => `$${v}`} domain={[divBase, 'auto']} />
          <Tooltip {...TOOLTIP_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, _: any, props: any) => {
              const entry = props.payload;
              const g = entry.growth;
              const gs = g != null ? ` (${formatGrowth(g)})` : "";
              const lines: [string, string][] = [
                [`$${Number(value ?? 0).toFixed(4)}${gs}`, "Per Payment"],
              ];
              if (isMultiPay) {
                lines.push([`$${Number(entry.total).toFixed(4)}`, `Period Total (${entry.payments} pmts)`]);
              }
              if (entry.incomplete) {
                lines.push(["⚠ Incomplete period", ""]);
              }
              return lines;
            }}
          />
          <Bar dataKey="Div/Share" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => {
              if (entry.incomplete) {
                return <Cell key={i} fill={`${TM}80`} strokeDasharray="4 2" stroke={TM} />;
              }
              const g = entry.growth;
              const color = g == null ? TM : g >= 0 ? GRN : RED;
              return <Cell key={i} fill={color} />;
            })}
            {doShow && (
              <LabelList
                dataKey="growth"
                position="top"
                formatter={(v: unknown) => (v != null ? formatGrowth(v as number) : "")}
                style={{ fontSize: 10, fontWeight: 600, fontFamily: mono }}
                fill={TM}
              />
            )}
          </Bar>
          <Line type="monotone" dataKey="Div/Share" stroke={`${TM}73`} strokeWidth={2} dot={{ r: 3, fill: `${TM}73` }} strokeDasharray="4 2" tooltipType="none" legendType="none" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Panel Layout
   ───────────────────────────────────────────── */

export default function FundamentalsPanel({ data }: FundamentalsPanelProps) {
  return (
    <div className="space-y-6">
      <HealthSummary data={data} />
      <RatiosCard data={data} />
      {data.income.length > 0 && (
        <>
          <RevenueChart data={data} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MarginsChart data={data} />
            <EpsChart data={data} />
          </div>
          <DividendsChart data={data} />
        </>
      )}
    </div>
  );
}
