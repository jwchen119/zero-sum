"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import { formatCurrency } from "@/lib/format";
import {
  WHT, INK, GRY, BLU, RED, T2, TM,
  serif, mono, sans,
  Hair, HeavyRule, WSJSection,
} from "@/lib/wsj";
import { fetchSectors, type SectorOverview } from "@/lib/api";

export default function SectorsPage() {
  const [sectors, setSectors] = useState<SectorOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSectors()
      .then((d) => setSectors(d.sectors))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>← Home</Link>
      <Link href="/screener-v4" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Screener</Link>
    </div>
  );

  const totalMarketCap = sectors.reduce((s, sec) => s + sec.totalMarketCap, 0);
  const totalStocks = sectors.reduce((s, sec) => s + sec.stockCount, 0);

  return (
    <WSJLayout navContent={navContent}>
      <WSJSection title="Sector Performance" />

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-[11px] uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: sans, color: TM }}>Loading sectors…</div>
        </div>
      )}

      {!loading && sectors.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-px mb-6" style={{ background: GRY }}>
            {[
              { l: "Sectors", v: String(sectors.length) },
              { l: "Total Stocks", v: totalStocks.toLocaleString() },
              { l: "Total Market Cap", v: formatCurrency(totalMarketCap) },
            ].map((s) => (
              <div key={s.l} className="text-center py-3 px-2" style={{ background: WHT }}>
                <div className="text-[8px] font-extrabold uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{s.l}</div>
                <div className="text-lg font-bold tabular-nums" style={{ fontFamily: mono }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Sector cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sectors.map((sec) => {
              const capPct = totalMarketCap > 0 ? (sec.totalMarketCap / totalMarketCap) * 100 : 0;
              return (
                <Link
                  key={sec.name}
                  href={`/sectors/${encodeURIComponent(sec.name)}`}
                  className="block border p-4 hover:shadow-md transition-shadow"
                  style={{ borderColor: GRY, background: WHT }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-[15px] font-bold" style={{ fontFamily: serif }}>{sec.name}</h3>
                    <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 border" style={{ fontFamily: mono, borderColor: GRY, color: T2 }}>
                      {sec.stockCount} stocks
                    </span>
                  </div>

                  {/* Market cap bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[9px] uppercase tracking-wider mb-1" style={{ fontFamily: sans, color: TM }}>
                      <span>Market Cap</span>
                      <span>{formatCurrency(sec.totalMarketCap)}</span>
                    </div>
                    <div className="h-1.5 w-full" style={{ background: `${GRY}66` }}>
                      <div className="h-full" style={{ width: `${Math.min(100, capPct)}%`, background: INK }} />
                    </div>
                    <div className="text-right text-[9px] tabular-nums mt-0.5" style={{ fontFamily: mono, color: TM }}>
                      {capPct.toFixed(1)}% of total
                    </div>
                  </div>

                  <Hair />

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { l: "Median P/E", v: sec.medianPE?.toFixed(1) ?? "—" },
                      { l: "Mean P/E", v: sec.meanPE?.toFixed(1) ?? "—" },
                      { l: "Avg Yield", v: sec.avgDividendYield ? `${sec.avgDividendYield.toFixed(2)}%` : "—" },
                      { l: "Avg Margin", v: sec.avgProfitMargin ? `${(sec.avgProfitMargin * 100).toFixed(1)}%` : "—" },
                      { l: "Rev Growth", v: sec.avgRevenueGrowth ? `${(sec.avgRevenueGrowth * 100).toFixed(1)}%` : "—" },
                    ].map((m) => (
                      <div key={m.l}>
                        <div className="text-[8px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{m.l}</div>
                        <div className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono }}>{m.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Top stocks */}
                  <div className="flex flex-wrap gap-1.5">
                    {sec.topStocks.map((s) => (
                      <span
                        key={s.symbol}
                        className="text-[9px] font-bold px-1.5 py-0.5 border"
                        style={{ fontFamily: mono, borderColor: GRY, color: T2 }}
                      >
                        {s.symbol}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </WSJLayout>
  );
}
