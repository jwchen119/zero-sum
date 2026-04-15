"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import { formatCurrency } from "@/lib/format";
import {
  WHT, INK, GRY, RED, T2, TM,
  serif, mono, sans,
  Hair, WSJSection,
 GAIN,} from "@/lib/wsj";
import {
  fetchFinancials,
  type FinancialsResponse,
  type FinancialStatement,
  type FinancialRow,
} from "@/lib/api";

const TABS = ["income", "balance", "cashflow"] as const;
type TabKey = (typeof TABS)[number];
const TAB_LABELS: Record<TabKey, string> = {
  income: "Income Statement",
  balance: "Balance Sheet",
  cashflow: "Cash Flow",
};

const HIGHLIGHT_ROWS: Record<TabKey, string[]> = {
  income: ["Total Revenue", "Operating Income", "Net Income", "EBITDA", "Basic EPS", "Diluted EPS"],
  balance: ["Total Assets", "Total Liabilities", "Stockholders Equity", "Total Debt", "Cash And Cash Equivalents"],
  cashflow: ["Operating Cash Flow", "Free Cash Flow", "Capital Expenditure"],
};

function fmtVal(v: number | null): string {
  if (v == null) return "—";
  return formatCurrency(v);
}

function GrowthBadge({ g }: { g: number | null }) {
  if (g == null) return <span style={{ color: TM }}>—</span>;
  const pct = (g * 100).toFixed(1);
  const positive = g >= 0;
  return (
    <span
      className="text-[9px] font-bold tabular-nums"
      style={{ color: positive ? GAIN : RED }}
    >
      {positive ? "+" : ""}{pct}%
    </span>
  );
}

function FinancialsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticker = (searchParams.get("ticker") || "AAPL").toUpperCase();
  const [input, setInput] = useState(ticker);
  const [data, setData] = useState<FinancialsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("income");
  const [quarterly, setQuarterly] = useState(false);

  const load = useCallback((t: string) => {
    setLoading(true);
    fetchFinancials(t)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(ticker); }, [ticker, load]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim().toUpperCase();
    if (t && t !== ticker) router.push(`/financials?ticker=${encodeURIComponent(t)}`);
  };

  const period = quarterly ? "quarterly" : "annual";
  const statement: FinancialStatement | null = data
    ? data[period]?.[tab] ?? null
    : null;

  const highlighted = HIGHLIGHT_ROWS[tab] || [];

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: T2 }}>← Home</Link>
      <Link href={`/stocks/${ticker}`} className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: T2 }}>← {ticker}</Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      {/* Header */}
      <WSJSection title="Financial Statements" />

      {/* Ticker search */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-5">
        <input
          className="border px-3 py-1.5 text-[13px] font-bold uppercase w-28"
          style={{ borderColor: GRY, fontFamily: mono, background: WHT }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="AAPL"
          maxLength={10}
        />
        <button
          type="submit"
          className="border px-3 py-1.5 text-[10px] uppercase tracking-wider font-extrabold hover:bg-[#f0ead8] transition-colors"
          style={{ borderColor: GRY, fontFamily: sans }}
        >
          Go
        </button>
      </form>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-[11px] uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: sans, color: TM }}>Loading financials…</div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Company info */}
          <div className="mb-4">
            <h2 className="text-2xl font-black" style={{ fontFamily: serif }}>{data.ticker}</h2>
            {data.companyName && (
              <div className="text-[12px]" style={{ fontFamily: serif, color: T2 }}>{data.companyName}</div>
            )}
            {(data.sector || data.industry) && (
              <div className="text-[10px] mt-0.5" style={{ fontFamily: sans, color: TM }}>
                {data.sector}{data.sector && data.industry ? " · " : ""}{data.industry}
              </div>
            )}
          </div>

          <Hair />

          {/* Tab bar + period toggle */}
          <div className="flex items-center justify-between mb-4 mt-3 flex-wrap gap-2">
            <div className="flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-extrabold transition-colors"
                  style={{
                    fontFamily: sans,
                    background: tab === t ? INK : "transparent",
                    color: tab === t ? WHT : TM,
                    border: `1px solid ${tab === t ? INK : GRY}`,
                  }}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["Annual", "Quarterly"] as const).map((label) => {
                const isQ = label === "Quarterly";
                return (
                  <button
                    key={label}
                    onClick={() => setQuarterly(isQ)}
                    className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-extrabold transition-colors"
                    style={{
                      fontFamily: sans,
                      background: quarterly === isQ ? INK : "transparent",
                      color: quarterly === isQ ? WHT : TM,
                      border: `1px solid ${quarterly === isQ ? INK : GRY}`,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Statement table */}
          {statement && statement.rows.length > 0 ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-[12px] border-collapse" style={{ fontFamily: mono }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${INK}` }}>
                    <th className="text-left py-2 px-2 text-[9px] uppercase tracking-wider font-extrabold sticky left-0 z-10" style={{ fontFamily: sans, color: TM, background: WHT, minWidth: 180 }}>
                      Line Item
                    </th>
                    {statement.periods.map((p) => (
                      <th key={p} className="text-right py-2 px-2 text-[9px] uppercase tracking-wider font-extrabold" style={{ fontFamily: sans, color: TM, minWidth: 100 }}>
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statement.rows.map((row: FinancialRow, ri: number) => {
                    const bold = highlighted.includes(row.label);
                    return (
                      <tr
                        key={ri}
                        className="hover:bg-[#f0ead8] transition-colors"
                        style={{
                          borderBottom: bold ? `2px solid ${GRY}` : `1px solid ${GRY}`,
                          background: bold ? "#f8f4e8" : "transparent",
                        }}
                      >
                        <td
                          className="py-1.5 px-2 text-left sticky left-0 z-10"
                          style={{
                            fontFamily: serif,
                            fontWeight: bold ? 800 : 400,
                            fontSize: bold ? 12 : 11,
                            color: INK,
                            background: bold ? "#f8f4e8" : WHT,
                          }}
                        >
                          {row.label}
                        </td>
                        {row.values.map((v, vi) => (
                          <td key={vi} className="py-1.5 px-2 text-right tabular-nums" style={{ color: v != null && v < 0 ? RED : INK, fontWeight: bold ? 700 : 400 }}>
                            <div>{fmtVal(v)}</div>
                            {row.growth[vi] != null && (
                              <div className="mt-0.5"><GrowthBadge g={row.growth[vi]} /></div>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-[11px]" style={{ fontFamily: sans, color: TM }}>
              No {TAB_LABELS[tab].toLowerCase()} data available.
            </div>
          )}
        </>
      )}

      {!loading && !data && (
        <div className="text-center py-12 text-[11px]" style={{ fontFamily: sans, color: TM }}>
          Could not load financials for {ticker}.
        </div>
      )}
    </WSJLayout>
  );
}

export default function FinancialsPage() {
  return (
    <Suspense>
      <FinancialsPageInner />
    </Suspense>
  );
}
