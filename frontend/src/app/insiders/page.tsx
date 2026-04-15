"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, BLU, RED, T2, TM,
  serif, mono,
  Hair, HeavyRule,
 LOSS, GAIN,} from "@/lib/wsj";
import { fetchInsiders, type InsiderResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

const TYPE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Buys", value: "buy" },
  { label: "Sells", value: "sell" },
];

const DAYS_OPTIONS = [
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "180d", value: 180 },
  { label: "1yr", value: 365 },
];

const MIN_VALUE_OPTIONS = [
  { label: "Any", value: 0 },
  { label: ">$100K", value: 100000 },
  { label: ">$500K", value: 500000 },
  { label: ">$1M", value: 1000000 },
];

export default function InsidersPage() {
  const [ticker, setTicker] = useState("");
  const [txType, setTxType] = useState("all");
  const [days, setDays] = useState(90);
  const [minValue, setMinValue] = useState(0);
  const [data, setData] = useState<InsiderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchInsiders({
        ticker: ticker || undefined,
        type: txType !== "all" ? txType : undefined,
        days,
        minValue: minValue > 0 ? minValue : undefined,
      });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [ticker, txType, days, minValue]);

  useEffect(() => { load(); }, [load]);

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Home</Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: serif, color: INK }}>
          Insider Trading Tracker
        </h1>
        <p className="mt-1 text-sm" style={{ color: T2, fontFamily: mono }}>
          Executive &amp; director buy/sell activity across all tracked stocks
        </p>
        <HeavyRule />

        {/* Filters */}
        <div className="my-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ fontFamily: mono, color: INK }}>
              Ticker
            </label>
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="All stocks"
              className="w-28 border px-2 py-2 text-sm uppercase"
              style={{ borderColor: GRY, background: WHT, fontFamily: mono }}
            />
          </div>

          <div className="flex gap-1">
            {TYPE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setTxType(o.value)}
                className="border px-3 py-2 text-xs font-bold"
                style={{
                  fontFamily: mono,
                  background: txType === o.value ? INK : WHT,
                  color: txType === o.value ? WHT : T2,
                  borderColor: GRY,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            {DAYS_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setDays(o.value)}
                className="border px-3 py-2 text-xs font-bold"
                style={{
                  fontFamily: mono,
                  background: days === o.value ? INK : WHT,
                  color: days === o.value ? WHT : T2,
                  borderColor: GRY,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            {MIN_VALUE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setMinValue(o.value)}
                className="border px-3 py-2 text-xs font-bold"
                style={{
                  fontFamily: mono,
                  background: minValue === o.value ? INK : WHT,
                  color: minValue === o.value ? WHT : T2,
                  borderColor: GRY,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="py-8 text-center text-sm" style={{ color: TM, fontFamily: mono }}>Loading insider data…</p>}
        {error && <p className="py-4 text-sm" style={{ color: RED, fontFamily: mono }}>{error}</p>}

        {data && !loading && (
          <>
            {/* Summary Banner */}
            <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: "Total Transactions", value: data.totalCount.toLocaleString() },
                { label: "Buys", value: data.summary.totalBuys.toLocaleString(), color: GAIN },
                { label: "Sells", value: data.summary.totalSells.toLocaleString(), color: LOSS },
                { label: "Buy Volume", value: formatCurrency(data.summary.totalBuyValue), color: GAIN },
                { label: "Sell Volume", value: formatCurrency(data.summary.totalSellValue), color: LOSS },
              ].map((card) => (
                <div key={card.label} className="border p-3" style={{ borderColor: GRY, background: WHT }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: mono, color: TM }}>
                    {card.label}
                  </div>
                  <div className="mt-1 text-sm font-bold" style={{ fontFamily: mono, color: card.color || INK }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Buy/Sell Bar */}
            {(data.summary.totalBuys + data.summary.totalSells) > 0 && (
              <div className="my-4">
                <div className="flex h-6 overflow-hidden" style={{ borderRadius: 2 }}>
                  <div
                    className="flex items-center justify-center text-[10px] font-bold"
                    style={{
                      width: `${(data.summary.totalBuys / (data.summary.totalBuys + data.summary.totalSells)) * 100}%`,
                      background: GAIN,
                      color: "#fff",
                      fontFamily: mono,
                    }}
                  >
                    {data.summary.totalBuys > 0 && `${Math.round((data.summary.totalBuys / (data.summary.totalBuys + data.summary.totalSells)) * 100)}% Buy`}
                  </div>
                  <div
                    className="flex items-center justify-center text-[10px] font-bold"
                    style={{
                      width: `${(data.summary.totalSells / (data.summary.totalBuys + data.summary.totalSells)) * 100}%`,
                      background: LOSS,
                      color: "#fff",
                      fontFamily: mono,
                    }}
                  >
                    {data.summary.totalSells > 0 && `${Math.round((data.summary.totalSells / (data.summary.totalBuys + data.summary.totalSells)) * 100)}% Sell`}
                  </div>
                </div>
              </div>
            )}

            <Hair />

            {/* Transactions Table */}
            <div className="my-4 overflow-x-auto">
              <table className="w-full" style={{ fontFamily: mono, fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${INK}` }}>
                    {["Date", "Ticker", "Insider", "Position", "Type", "Shares", "Value", "Detail"].map((h) => (
                      <th key={h} className="p-2 text-left text-[10px] font-bold uppercase" style={{ color: TM }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${GRY}` }}>
                      <td className="p-2 whitespace-nowrap" style={{ color: T2 }}>{tx.date}</td>
                      <td className="p-2 font-bold">
                        <Link href={`/stocks/${tx.ticker}`} className="hover:underline" style={{ color: INK }}>
                          {tx.ticker}
                        </Link>
                        {tx.company && (
                          <div className="text-[9px] font-normal" style={{ color: TM }}>
                            {tx.company.length > 25 ? tx.company.slice(0, 25) + "…" : tx.company}
                          </div>
                        )}
                      </td>
                      <td className="p-2" style={{ color: INK }}>{tx.insider}</td>
                      <td className="p-2 text-[10px]" style={{ color: TM }}>{tx.position}</td>
                      <td className="p-2 font-bold" style={{
                        color: tx.type === "buy" ? GAIN : tx.type === "sell" ? LOSS : TM,
                      }}>
                        {tx.type.toUpperCase()}
                      </td>
                      <td className="p-2 tabular-nums" style={{ color: INK }}>
                        {tx.shares?.toLocaleString() ?? "—"}
                      </td>
                      <td className="p-2 tabular-nums font-bold" style={{
                        color: tx.type === "buy" ? GAIN : tx.type === "sell" ? LOSS : INK,
                      }}>
                        {tx.value > 0 ? formatCurrency(tx.value) : "—"}
                      </td>
                      <td className="p-2 text-[10px]" style={{ color: TM }}>
                        {tx.text.length > 40 ? tx.text.slice(0, 40) + "…" : tx.text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalCount > 500 && (
              <p className="text-[10px] text-center" style={{ fontFamily: mono, color: TM }}>
                Showing 500 of {data.totalCount.toLocaleString()} transactions. Use filters to narrow results.
              </p>
            )}
          </>
        )}
      </div>
    </WSJLayout>
  );
}
