"use client";

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { BalanceSheetItem } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Props {
  items: BalanceSheetItem[];
  quarterly: boolean;
}

function periodRangeLabel(items: { period: string }[], quarterly: boolean): string {
  if (items.length === 0) return "";
  const first = items[0].period;
  const last = items[items.length - 1].period;
  const range = first === last ? first : `${first} – ${last}`;
  return `${range}, ${quarterly ? "Quarterly" : "Annual"}`;
}

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "#f5f0e8", border: "1px solid #c8c8c8", borderRadius: 0, fontFamily: "var(--font-mono-data), monospace", fontSize: 12 },
  labelStyle: { color: "#1a1a1a", fontFamily: "var(--font-sans-label), sans-serif", fontWeight: 700 },
};

const sans = "var(--font-sans-label), 'Helvetica Neue', sans-serif";
const mono = "var(--font-mono-data), 'Courier New', monospace";
const serif = "var(--font-serif), 'Georgia', serif";
const INK = "#1a1a1a";
const T2 = "#555555";
const TM = "#888888";
const GRY = "#c8c8c8";
const GR2 = "#d8d0c4";
const BLU = "#8a8a8a";
const RED = "#b07050";
const GRN = "#c9a96e";

/* ─── Health badge with plain-English explanation ─── */
function Metric({ label, value, hint, good }: { label: string; value: string; hint: string; good: boolean | null }) {
  return (
    <div className="px-3 py-2" style={{ border: `1px solid ${GRY}` }}>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: good === true ? GRN : good === false ? RED : TM }} />
        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ fontFamily: sans, color: INK }}>{label}</span>
        <span className="ml-auto text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: INK }}>{value}</span>
      </div>
      <div className="mt-0.5 text-[10px]" style={{ fontFamily: serif, color: TM }}>{hint}</div>
    </div>
  );
}

export default function BalanceSheetPanel({ items, quarterly }: Props) {
  if (items.length === 0) return null;

  const isQ = quarterly;
  const latest = items[items.length - 1];

  /* ─── Auto-scale divisor ─── */
  const maxVal = Math.max(
    ...items.map((d) => Math.max(Math.abs(d.totalAssets ?? 0), Math.abs(d.totalLiabilities ?? 0)))
  );
  const div = maxVal >= 1e9 ? 1e9 : maxVal >= 1e6 ? 1e6 : 1;
  const unit = maxVal >= 1e9 ? "B" : maxVal >= 1e6 ? "M" : "";

  /* ─── Simple grouped chart data ─── */
  const chartData = items.map((d) => ({
    period: d.period,
    "What it Owns (Assets)": d.totalAssets ? d.totalAssets / div : 0,
    "What it Owes (Liabilities)": d.totalLiabilities ? d.totalLiabilities / div : 0,
    "Shareholder Equity": d.stockholdersEquity ? d.stockholdersEquity / div : 0,
    Cash: d.cash ? d.cash / div : 0,
    Debt: d.totalDebt ? d.totalDebt / div : 0,
  }));

  /* ─── Latest-period ratios ─── */
  const latestDE = (latest.totalDebt ?? 0) > 0 && (latest.stockholdersEquity ?? 0) > 0
    ? (latest.totalDebt ?? 0) / (latest.stockholdersEquity ?? 0) : null;
  const latestCR = (latest.currentAssets ?? 0) > 0 && (latest.currentLiabilities ?? 0) > 0
    ? (latest.currentAssets ?? 0) / (latest.currentLiabilities ?? 0) : null;
  const netDebt = (latest.totalDebt ?? 0) - (latest.cash ?? 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Balance Sheet</h3>
        <span className="text-[10px]" style={{ fontFamily: mono, color: TM }}>{periodRangeLabel(items, quarterly)}</span>
      </div>

      {/* Health metrics with explanations */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {latestDE != null && (
          <Metric
            label="Debt / Equity"
            value={`${latestDE.toFixed(2)}x`}
            hint={latestDE < 1 ? "Owns more than it owes — healthy" : latestDE < 2 ? "Moderate leverage" : "High leverage — more debt than equity"}
            good={latestDE < 1.5}
          />
        )}
        {latestCR != null && (
          <Metric
            label="Current Ratio"
            value={`${latestCR.toFixed(2)}x`}
            hint={latestCR >= 1.5 ? "Can easily cover short-term bills" : latestCR >= 1 ? "Can cover short-term bills" : "May struggle to pay near-term bills"}
            good={latestCR >= 1.0}
          />
        )}
        <Metric
          label="Net Debt"
          value={formatCurrency(netDebt)}
          hint={netDebt <= 0 ? "More cash than debt — strong" : "Total debt minus cash on hand"}
          good={netDebt <= 0 ? true : null}
        />
      </div>

      {/* Chart: Assets / Liabilities / Equity over time */}
      <div>
        <h4 className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: INK }}>
          Assets vs Liabilities vs Equity
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" stroke={GR2} />
            <XAxis
              dataKey="period"
              tick={{ fill: TM, fontSize: 11, fontFamily: mono }}
              angle={isQ ? -45 : 0}
              textAnchor={isQ ? "end" : "middle"}
              height={isQ ? 60 : 30}
            />
            <YAxis tick={{ fill: TM, fontSize: 11, fontFamily: mono }} tickFormatter={(v) => `$${v}${unit}`} />
            <Tooltip
              {...TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [`$${Number(value ?? 0).toFixed(1)}${unit}`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: sans }} />
            <Bar dataKey="What it Owns (Assets)" fill={BLU} radius={[4, 4, 0, 0]} />
            <Bar dataKey="What it Owes (Liabilities)" fill={RED} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Shareholder Equity" fill={GRN} radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="mt-1 text-[9px] italic" style={{ fontFamily: serif, color: TM }}>
          Assets = Liabilities + Equity. The green bar is what&apos;s left for shareholders after paying all debts.
        </p>
      </div>

      {/* Chart: Cash vs Debt */}
      {chartData.some((d) => d.Cash > 0 || d.Debt > 0) && (
        <div>
          <h4 className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: INK }}>
            Cash vs Debt
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke={GR2} />
              <XAxis
                dataKey="period"
                tick={{ fill: TM, fontSize: 11, fontFamily: mono }}
                angle={isQ ? -45 : 0}
                textAnchor={isQ ? "end" : "middle"}
                height={isQ ? 60 : 30}
              />
              <YAxis tick={{ fill: TM, fontSize: 11, fontFamily: mono }} tickFormatter={(v) => `$${v}${unit}`} />
              <Tooltip
                {...TOOLTIP_STYLE}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [`$${Number(value ?? 0).toFixed(1)}${unit}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: sans }} />
              <Bar dataKey="Cash" fill={BLU} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Debt" fill={RED} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[9px] italic" style={{ fontFamily: serif, color: TM }}>
            How much cash the company has on hand vs how much it owes in total debt.
          </p>
        </div>
      )}

      {/* Table */}
      <div>
        <h4 className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: INK }}>
          Period Detail
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ fontFamily: mono }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}` }}>
                <th className="py-1.5 text-left text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Period</th>
                <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Assets</th>
                <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Liabilities</th>
                <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Equity</th>
                <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Cash</th>
                <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Debt</th>
                <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>D/E</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const de = (d.totalDebt ?? 0) > 0 && (d.stockholdersEquity ?? 0) > 0
                  ? (d.totalDebt ?? 0) / (d.stockholdersEquity ?? 0) : null;
                return (
                  <tr key={d.period} style={{ borderTop: `1px solid ${GR2}` }}>
                    <td className="py-1.5 font-bold" style={{ color: INK }}>{d.period}</td>
                    <td className="py-1.5 text-right" style={{ color: BLU }}>{formatCurrency(d.totalAssets)}</td>
                    <td className="py-1.5 text-right" style={{ color: RED }}>{formatCurrency(d.totalLiabilities)}</td>
                    <td className="py-1.5 text-right font-bold" style={{ color: (d.stockholdersEquity ?? 0) >= 0 ? GRN : RED }}>
                      {formatCurrency(d.stockholdersEquity)}
                    </td>
                    <td className="py-1.5 text-right" style={{ color: BLU }}>{formatCurrency(d.cash)}</td>
                    <td className="py-1.5 text-right" style={{ color: RED }}>{formatCurrency(d.totalDebt)}</td>
                    <td className="py-1.5 text-right font-bold" style={{ color: de != null && de < 1.5 ? GRN : de != null ? TM : GRY }}>
                      {de != null ? `${de.toFixed(2)}x` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
