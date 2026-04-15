"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, BLU, RED, T2, TM,
  serif, mono, sans,
  Hair, HeavyRule, WSJSection,
} from "@/lib/wsj";
import { fetchEarningsFull, type EarningsByDate, type EarningsEntry } from "@/lib/api";
import { useWatchlist } from "@/lib/useWatchlist";
import { formatCurrency, formatShortDate } from "@/lib/format";

type EarningsSource = "watchlist" | "twse";

export default function EarningsCalendarPage() {
  const { watchlist } = useWatchlist();
  const [source, setSource] = useState<EarningsSource>("watchlist");
  const [data, setData] = useState<EarningsByDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchEarningsFull(source, source === "watchlist" ? watchlist : undefined)
      .then((r) => setData(r.byDate))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [source, watchlist]);

  const sectors = useMemo(() => {
    const s = new Set<string>();
    data.forEach((d) => d.earnings.forEach((e) => { if (e.sector) s.add(e.sector); }));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!sectorFilter) return data;
    return data
      .map((d) => ({
        ...d,
        earnings: d.earnings.filter((e) => e.sector === sectorFilter),
      }))
      .filter((d) => d.earnings.length > 0);
  }, [data, sectorFilter]);

  const totalCount = filtered.reduce((sum, d) => sum + d.earnings.length, 0);

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
        Home
      </Link>
      <Link href="/screener-v4" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
        Screener
      </Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <div className="w-full px-2 sm:px-4">
        <div className="mx-auto w-full max-w-[980px] py-6">
          <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: serif, color: INK }}>
            Earnings Calendar
          </h1>
          <p className="mt-1 text-sm" style={{ color: T2, fontFamily: mono }}>
            Upcoming earnings reports for the next 90 days - {totalCount} companies
            {source === "watchlist" ? " (Watchlist)" : " (TWSE)"}
          </p>
          <HeavyRule />

          <div className="my-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center border" style={{ borderColor: GRY }}>
              {(["watchlist", "twse"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
                  style={{
                    fontFamily: mono,
                    background: source === s ? INK : "transparent",
                    color: source === s ? WHT : TM,
                  }}
                >
                  {s === "watchlist" ? "Watchlist" : "TWSE"}
                </button>
              ))}
            </div>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="border px-3 py-1.5 text-xs"
              style={{ borderColor: GRY, background: WHT, fontFamily: mono }}
            >
              <option value="">All Sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="py-16 text-center text-[11px] uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: sans, color: TM }}>
              Loading earnings calendar...
            </div>
          )}

          {error && <p className="py-4 text-sm" style={{ color: RED, fontFamily: mono }}>{error}</p>}

          {!loading && filtered.length === 0 && (
            <p className="py-8 text-center text-sm" style={{ color: TM, fontFamily: serif }}>
              No upcoming earnings found.
            </p>
          )}

          {filtered.map((day) => (
            <div key={day.date} className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-lg font-bold" style={{ fontFamily: serif, color: INK }}>
                  {formatShortDate(day.date, true)}
                </span>
                <span className="rounded border px-2 py-0.5 text-[10px] font-bold" style={{ fontFamily: mono, color: TM, borderColor: GRY }}>
                  {day.earnings.length} {day.earnings.length === 1 ? "report" : "reports"}
                </span>
              </div>
              <Hair />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] table-fixed text-left" style={{ fontFamily: mono }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${INK}` }}>
                      {["Symbol", "Company", "Sector", "Mkt Cap", "EPS Est."].map((h) => (
                        <th key={h} className="px-2 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: TM }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {day.earnings.map((e: EarningsEntry) => (
                      <tr key={e.symbol} className="hover:bg-[#f0ebe0]" style={{ borderBottom: `1px solid ${GRY}` }}>
                        <td className="px-2 py-2">
                          <Link href={`/stocks/${e.symbol}`} className="text-sm font-bold hover:underline" style={{ color: INK }}>
                            {e.symbol}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-xs" style={{ color: T2 }}>{e.company}</td>
                        <td className="px-2 py-2 text-[10px]" style={{ color: TM }}>{e.sector || "-"}</td>
                        <td className="px-2 py-2 text-xs tabular-nums" style={{ color: INK }}>
                          {e.marketCap ? formatCurrency(e.marketCap) : "-"}
                        </td>
                        <td className="px-2 py-2 text-xs tabular-nums" style={{ color: INK }}>
                          {e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WSJLayout>
  );
}
