"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, BLU, RED, T2, TM,
  serif, mono,
  Hair, HeavyRule, WSJSection,
 LOSS, GAIN,} from "@/lib/wsj";
import { fetchScanner, type ScannerStock, type ScannerResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

const SIGNAL_LABELS: Record<string, { label: string; color: string }> = {
  golden_cross:   { label: "Golden Cross", color: GAIN },
  death_cross:    { label: "Death Cross", color: LOSS },
  rsi_oversold:   { label: "RSI Oversold", color: GAIN },
  rsi_overbought: { label: "RSI Overbought", color: LOSS },
  macd_bullish:   { label: "MACD Bullish", color: GAIN },
  macd_bearish:   { label: "MACD Bearish", color: LOSS },
  bb_oversold:    { label: "Below Lower BB", color: GAIN },
  bb_overbought:  { label: "Above Upper BB", color: LOSS },
  volume_surge:   { label: "Volume Surge", color: "#e65100" },
};

const TREND_LABELS: Record<string, { label: string; color: string }> = {
  strong_bullish: { label: "Strong Bullish", color: "#1b5e20" },
  bullish:        { label: "Bullish", color: GAIN },
  neutral:        { label: "Neutral", color: TM },
  bearish:        { label: "Bearish", color: LOSS },
  strong_bearish: { label: "Strong Bearish", color: "#b71c1c" },
};

export default function ScannerPage() {
  const [data, setData] = useState<ScannerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signalFilter, setSignalFilter] = useState("");
  const [trendFilter, setTrendFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [sortField, setSortField] = useState("marketCap");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchScanner({
      signal: signalFilter || undefined,
      trend: trendFilter || undefined,
      sector: sectorFilter || undefined,
      sort: sortField,
      order: sortOrder,
    })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [signalFilter, trendFilter, sectorFilter, sortField, sortOrder]);

  const sectors = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.stocks.map((r) => r.sector).filter(Boolean));
    return Array.from(s).sort() as string[];
  }, [data]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortIcon = (field: string) => {
    if (sortField !== field) return "";
    return sortOrder === "desc" ? " ▼" : " ▲";
  };

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Home</Link>
      <Link href="/screener-v4" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Screener</Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: serif, color: INK }}>
          Technical Scanner
        </h1>
        <p className="mt-1 text-sm" style={{ color: T2, fontFamily: mono }}>
          Real-time technical signals across {data?.total ?? "…"} stocks — RSI, MACD, Bollinger Bands, Moving Average crossovers, and volume surges.
        </p>
        <HeavyRule />

        {/* Signal Summary */}
        {data?.signals_summary && Object.keys(data.signals_summary).length > 0 && (
          <div className="my-4 flex flex-wrap gap-2">
            {Object.entries(data.signals_summary).map(([type, count]) => {
              const info = SIGNAL_LABELS[type] || { label: type, color: TM };
              return (
                <button
                  key={type}
                  onClick={() => setSignalFilter(signalFilter === type ? "" : type)}
                  className="border px-3 py-1.5 text-xs font-bold transition-all"
                  style={{
                    fontFamily: mono,
                    borderColor: signalFilter === type ? info.color : GRY,
                    background: signalFilter === type ? info.color : WHT,
                    color: signalFilter === type ? WHT : info.color,
                  }}
                >
                  {info.label} ({count})
                </button>
              );
            })}
            {signalFilter && (
              <button onClick={() => setSignalFilter("")} className="border px-3 py-1.5 text-xs" style={{ fontFamily: mono, borderColor: GRY, color: TM }}>
                Clear ×
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="my-3 flex flex-wrap items-center gap-3">
          <select
            value={trendFilter}
            onChange={(e) => setTrendFilter(e.target.value)}
            className="border px-2 py-1.5 text-xs"
            style={{ fontFamily: mono, borderColor: GRY, background: WHT, color: INK }}
          >
            <option value="">All Trends</option>
            {Object.entries(TREND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="border px-2 py-1.5 text-xs"
            style={{ fontFamily: mono, borderColor: GRY, background: WHT, color: INK }}
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="text-xs" style={{ fontFamily: mono, color: TM }}>
            {data ? `${data.count} of ${data.total} stocks` : "Loading…"}
          </span>
        </div>

        <Hair />

        {loading && <p className="py-8 text-center text-sm" style={{ fontFamily: mono, color: TM }}>Scanning all tickers…</p>}
        {error && <p className="py-8 text-center text-sm" style={{ color: RED }}>{error}</p>}

        {data && !loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: mono }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${INK}` }}>
                  {[
                    { key: "symbol", label: "Symbol", align: "left" },
                    { key: "price", label: "Price", align: "right" },
                    { key: "change_pct", label: "Chg%", align: "right" },
                    { key: "rsi", label: "RSI", align: "right" },
                    { key: "trend", label: "Trend", align: "center" },
                    { key: "macd_histogram", label: "MACD Hist", align: "right" },
                    { key: "bb_pct", label: "BB%", align: "right" },
                    { key: "volume_ratio", label: "Vol Ratio", align: "right" },
                    { key: "marketCap", label: "Mkt Cap", align: "right" },
                    { key: "signals", label: "Signals", align: "left" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`cursor-pointer px-2 py-2 text-${col.align as "left" | "right" | "center"} font-bold uppercase tracking-wider hover:underline`}
                      style={{ color: INK }}
                      onClick={() => col.key !== "signals" && handleSort(col.key)}
                    >
                      {col.label}{sortIcon(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.stocks.slice(0, 200).map((s) => {
                  const trend = TREND_LABELS[s.trend] || TREND_LABELS["neutral"];
                  return (
                    <tr key={s.symbol} className="hover:bg-black/5" style={{ borderBottom: `1px solid ${GRY}` }}>
                      <td className="px-2 py-1.5 font-bold">
                        <Link href={`/stocks/${s.symbol}`} className="hover:underline" style={{ color: BLU }}>{s.symbol}</Link>
                        <div className="font-normal text-[10px] truncate max-w-[120px]" style={{ color: TM }}>{s.name}</div>
                      </td>
                      <td className="px-2 py-1.5 text-right">${s.price.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right font-bold" style={{ color: s.change_pct && s.change_pct > 0 ? GAIN : s.change_pct && s.change_pct < 0 ? LOSS : INK }}>
                        {s.change_pct != null ? `${s.change_pct > 0 ? "+" : ""}${s.change_pct.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold" style={{ color: s.rsi != null ? (s.rsi < 30 ? GAIN : s.rsi > 70 ? LOSS : INK) : TM }}>
                        {s.rsi != null ? s.rsi.toFixed(1) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: trend.color, color: WHT }}>
                          {trend.label}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right" style={{ color: s.macd_histogram && s.macd_histogram > 0 ? GAIN : s.macd_histogram && s.macd_histogram < 0 ? LOSS : INK }}>
                        {s.macd_histogram != null ? s.macd_histogram.toFixed(4) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right">{s.bb_pct != null ? `${s.bb_pct.toFixed(0)}%` : "—"}</td>
                      <td className="px-2 py-1.5 text-right font-bold" style={{ color: s.volume_ratio && s.volume_ratio > 2 ? "#e65100" : INK }}>
                        {s.volume_ratio != null ? `${s.volume_ratio.toFixed(1)}x` : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(s.marketCap)}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex flex-wrap gap-1">
                          {s.signals.map((sig, i) => (
                            <span
                              key={i}
                              className="inline-block rounded px-1 py-0.5 text-[9px] font-bold"
                              style={{
                                background: sig.bias === "bullish" ? "#e8f5e9" : "#ffebee",
                                color: sig.bias === "bullish" ? GAIN : LOSS,
                              }}
                            >
                              {sig.label}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WSJLayout>
  );
}
