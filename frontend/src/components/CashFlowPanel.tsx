"use client";

import {
  ComposedChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { CashFlowItem } from "@/lib/api";
import { formatCurrencyAxis, smartYBase } from "@/lib/format";

interface Props {
  items: CashFlowItem[];
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

const sans  = "var(--font-sans-label), 'Helvetica Neue', sans-serif";
const mono  = "var(--font-mono-data), 'Courier New', monospace";
const serif = "var(--font-serif), 'Georgia', serif";
const INK   = "#1a1a1a";
const T2    = "#555555";
const TM    = "#888888";
const GRY   = "#c8c8c8";
const GR2   = "#d8d0c4";
const BLU   = "#8a8a8a";
const RED   = "#b07050";
const GRN   = "#c9a96e";

export default function CashFlowPanel({ items, quarterly }: Props) {
  if (items.length === 0) return null;

  const isQ = quarterly;

  // Auto-scale
  const maxVal = Math.max(
    ...items.map((d) => Math.max(
      Math.abs(d.operatingCashFlow ?? 0),
      Math.abs(d.investingCashFlow ?? 0),
      Math.abs(d.financingCashFlow ?? 0),
    ))
  );
  const div = maxVal >= 1e9 ? 1e9 : maxVal >= 1e6 ? 1e6 : 1;
  const unit = maxVal >= 1e9 ? "B" : maxVal >= 1e6 ? "M" : "";

  const chartData = items.map((d) => ({
    period: d.period,
    Operating: d.operatingCashFlow ? d.operatingCashFlow / div : 0,
    Investing: d.investingCashFlow ? d.investingCashFlow / div : 0,
    Financing: d.financingCashFlow ? d.financingCashFlow / div : 0,
  }));

  const fcfData = items.map((d) => ({
    period: d.period,
    "Free Cash Flow": d.freeCashFlow ? d.freeCashFlow / div : 0,
  }));
  const fcfBase = smartYBase(fcfData.map((d) => d["Free Cash Flow"]));

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Cash Flow Statement</h3>
        <span className="text-[10px]" style={{ fontFamily: mono, color: TM }}>{periodRangeLabel(items, quarterly)}</span>
      </div>

      <div className="space-y-6">
        {/* Operating / Investing / Financing */}
        <div>
          <h4 className="text-[9px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: INK }}>Operating &middot; Investing &middot; Financing</h4>
          <p className="mt-0.5 mb-2 text-[10px] leading-relaxed" style={{ fontFamily: serif, color: TM }}>
            <span className="inline-block w-2 h-2 mr-1 align-middle" style={{ backgroundColor: GRN }} />Operating — cash from core business.
            <span className="inline-block w-2 h-2 mx-1 align-middle" style={{ backgroundColor: BLU }} />Investing — buying/selling long-term assets.
            <span className="inline-block w-2 h-2 mx-1 align-middle" style={{ backgroundColor: TM }} />Financing — debt, equity &amp; dividends.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={GR2} />
            <XAxis
              dataKey="period"
              tick={{ fill: TM, fontSize: 11, fontFamily: mono }}
              angle={isQ ? -45 : 0}
              textAnchor={isQ ? "end" : "middle"}
              height={isQ ? 60 : 30}
            />
            <YAxis tick={{ fill: TM, fontSize: 11, fontFamily: mono }} tickFormatter={(v) => `$${v}${unit}`} />
            <ReferenceLine y={0} stroke={GRY} strokeDasharray="3 3" />
            <Tooltip
              {...TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`$${Number(value ?? 0).toFixed(1)}${unit}`, undefined]}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: sans }} />
            <Bar dataKey="Operating" fill={GRN} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Investing" fill={BLU} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Financing" fill={TM} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="Operating" stroke={GRN} strokeWidth={2} dot={{ r: 3, fill: GRN }} tooltipType="none" legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Free Cash Flow */}
        <div>
          <h4 className="text-[9px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: GRN }}>Free Cash Flow</h4>
          <p className="mt-0.5 mb-2 text-[10px]" style={{ fontFamily: serif, color: TM }}>
            Operating cash flow minus capital expenditure — the cash available after maintaining operations.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={fcfData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke={GR2} />
            <XAxis
              dataKey="period"
              tick={{ fill: TM, fontSize: 11, fontFamily: mono }}
              angle={isQ ? -45 : 0}
              textAnchor={isQ ? "end" : "middle"}
              height={isQ ? 60 : 30}
            />
            <YAxis tick={{ fill: TM, fontSize: 11, fontFamily: mono }} tickFormatter={(v) => `$${v}${unit}`} domain={[fcfBase, 'auto']} />
            <ReferenceLine y={0} stroke={GRY} strokeDasharray="3 3" />
            <Tooltip
              {...TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`$${Number(value ?? 0).toFixed(1)}${unit}`, undefined]}
            />
            <Bar dataKey="Free Cash Flow" radius={[4, 4, 0, 0]}>
              {fcfData.map((entry, i) => (
                <Cell key={i} fill={entry["Free Cash Flow"] >= 0 ? GRN : RED} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="Free Cash Flow" stroke={`${TM}73`} strokeWidth={2} dot={{ r: 3, fill: `${TM}73` }} strokeDasharray="4 2" tooltipType="none" legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs" style={{ fontFamily: mono }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}` }}>
              <th className="py-1.5 text-left text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Period</th>
              <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Operating</th>
              <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Investing</th>
              <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Financing</th>
              <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>FCF</th>
              <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>CapEx</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.period} style={{ borderTop: `1px solid ${GR2}` }}>
                <td className="py-1.5 font-bold" style={{ color: INK }}>{d.period}</td>
                <td className="py-1.5 text-right" style={{ color: (d.operatingCashFlow ?? 0) >= 0 ? GRN : RED }}>
                  {formatCurrencyAxis(d.operatingCashFlow ?? 0)}
                </td>
                <td className="py-1.5 text-right" style={{ color: T2 }}>{formatCurrencyAxis(d.investingCashFlow ?? 0)}</td>
                <td className="py-1.5 text-right" style={{ color: T2 }}>{formatCurrencyAxis(d.financingCashFlow ?? 0)}</td>
                <td className="py-1.5 text-right font-bold" style={{ color: (d.freeCashFlow ?? 0) >= 0 ? GRN : RED }}>
                  {formatCurrencyAxis(d.freeCashFlow ?? 0)}
                </td>
                <td className="py-1.5 text-right" style={{ color: T2 }}>{formatCurrencyAxis(d.capex ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
