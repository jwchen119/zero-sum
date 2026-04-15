"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import { formatCurrency } from "@/lib/format";
import {
  WHT, INK, GRY, BLU, RED, T2, TM,
  serif, mono, sans,
  Hair, WSJSection,
} from "@/lib/wsj";
import { fetchSectorDetail, type SectorDetailResponse } from "@/lib/api";

type SortField = "symbol" | "marketCap" | "trailingPE" | "dividendYield" | "revenueGrowth" | "profitMargins" | "ytdReturn";

export default function SectorDetailPage() {
  const params = useParams();
  const sector = decodeURIComponent(params.sector as string);
  const [data, setData] = useState<SectorDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("marketCap");
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedIndustry, setExpandedIndustry] = useState<string | null>(null);

  useEffect(() => {
    fetchSectorDetail(sector)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sector]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDesc(!sortDesc);
    else { setSortField(field); setSortDesc(true); }
  };

  const sortedStocks = data?.stocks
    ? [...data.stocks].sort((a, b) => {
        const av = a[sortField] ?? (sortDesc ? -Infinity : Infinity);
        const bv = b[sortField] ?? (sortDesc ? -Infinity : Infinity);
        if (typeof av === "string" && typeof bv === "string") return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
        return sortDesc ? (bv as number) - (av as number) : (av as number) - (bv as number);
      })
    : [];

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>← Home</Link>
      <Link href="/sectors" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>← All Sectors</Link>
    </div>
  );

  const cols: { key: SortField; label: string; fmt: (v: unknown) => string; align?: string }[] = [
    { key: "symbol", label: "Ticker", fmt: (v) => String(v ?? ""), align: "left" },
    { key: "marketCap", label: "Mkt Cap", fmt: (v) => formatCurrency(v as number) },
    { key: "trailingPE", label: "P/E", fmt: (v) => v != null ? (v as number).toFixed(1) : "—" },
    { key: "dividendYield", label: "Yield", fmt: (v) => v != null ? `${(v as number).toFixed(2)}%` : "—" },
    { key: "revenueGrowth", label: "Rev Growth", fmt: (v) => v != null ? `${((v as number) * 100).toFixed(1)}%` : "—" },
    { key: "profitMargins", label: "Margin", fmt: (v) => v != null ? `${((v as number) * 100).toFixed(1)}%` : "—" },
    { key: "ytdReturn", label: "YTD", fmt: (v) => v != null ? `${(v as number).toFixed(1)}%` : "—" },
  ];

  return (
    <WSJLayout navContent={navContent}>
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-[11px] uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: sans, color: TM }}>Loading {sector}…</div>
        </div>
      )}

      {!loading && data && (
        <>
          <WSJSection title={sector} />

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-px mb-6" style={{ background: GRY }}>
            {[
              { l: "Stocks", v: String(data.stockCount) },
              { l: "Industries", v: String(data.industries.length) },
              { l: "Total Market Cap", v: formatCurrency(data.totalMarketCap) },
            ].map((s) => (
              <div key={s.l} className="text-center py-3 px-2" style={{ background: WHT }}>
                <div className="text-[8px] font-extrabold uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{s.l}</div>
                <div className="text-lg font-bold tabular-nums" style={{ fontFamily: mono }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Industries accordion */}
          <WSJSection title="Industries" />
          <div className="mb-6 border" style={{ borderColor: GRY }}>
            {data.industries.map((ind, i) => (
              <div key={ind.name} style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <button
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#f0ead8] transition-colors"
                  onClick={() => setExpandedIndustry(expandedIndustry === ind.name ? null : ind.name)}
                >
                  <span className="text-[13px] font-bold" style={{ fontFamily: serif }}>{ind.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] tabular-nums" style={{ fontFamily: mono, color: TM }}>{ind.stockCount} stocks</span>
                    <span className="text-[10px] tabular-nums" style={{ fontFamily: mono, color: T2 }}>{formatCurrency(ind.totalMarketCap)}</span>
                    <span className="text-[10px]" style={{ color: TM }}>{expandedIndustry === ind.name ? "▼" : "▶"}</span>
                  </div>
                </button>
                {expandedIndustry === ind.name && (
                  <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                    {[
                      { l: "Avg P/E", v: ind.avgPE?.toFixed(1) ?? "—" },
                      { l: "Avg Yield", v: ind.avgDividendYield ? `${ind.avgDividendYield.toFixed(2)}%` : "—" },
                    ].map((m) => (
                      <div key={m.l}>
                        <span className="text-[8px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{m.l}: </span>
                        <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: mono }}>{m.v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stocks table */}
          <WSJSection title="All Stocks" />
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-[12px] border-collapse" style={{ fontFamily: mono }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${INK}` }}>
                  {cols.map((col) => (
                    <th
                      key={col.key}
                      className={`py-2 px-2 cursor-pointer hover:underline text-[9px] uppercase tracking-wider font-extrabold ${col.align === "left" ? "text-left" : "text-right"}`}
                      style={{ fontFamily: sans, color: sortField === col.key ? INK : TM }}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortField === col.key && (sortDesc ? " ▾" : " ▴")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStocks.map((stock, i) => (
                  <tr key={stock.symbol} style={{ borderBottom: `1px solid ${GRY}` }} className="hover:bg-[#f0ead8] transition-colors">
                    {cols.map((col) => (
                      <td key={col.key} className={`py-1.5 px-2 tabular-nums ${col.align === "left" ? "text-left" : "text-right"}`}>
                        {col.key === "symbol" ? (
                          <Link href={`/stocks/${stock.symbol}`} className="font-bold hover:underline" style={{ color: INK }}>
                            {stock.symbol}
                            <span className="ml-1.5 text-[10px] font-normal" style={{ color: TM, fontFamily: serif }}>{stock.shortName}</span>
                          </Link>
                        ) : (
                          <span style={{
                            color: (col.key === "ytdReturn" || col.key === "revenueGrowth")
                              ? ((stock[col.key] ?? 0) as number) >= 0 ? INK : RED
                              : INK,
                          }}>
                            {col.fmt(stock[col.key])}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </WSJLayout>
  );
}
