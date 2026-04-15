"use client";

import { useState } from "react";
import type { MoverItem } from "@/lib/api";
import { INK, WHT, GRY, RED, TM, T2, BG, mono, sans, serif } from "@/lib/wsj";

const GRN = "var(--wsj-green, #c9a96e)";

type Tab = "gainers" | "losers" | "mostActive";

interface Props {
  gainers: MoverItem[];
  losers: MoverItem[];
  mostActive: MoverItem[];
  onTickerClick?: (ticker: string) => void;
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

export default function MarketMovers({ gainers, losers, mostActive, onTickerClick }: Props) {
  const [tab, setTab] = useState<Tab>("gainers");

  const tabs: { key: Tab; label: string }[] = [
    { key: "gainers", label: "Gainers" },
    { key: "losers", label: "Losers" },
    { key: "mostActive", label: "Most Active" },
  ];

  const data = (tab === "gainers" ? gainers : tab === "losers" ? losers : mostActive) ?? [];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 border-b-2" style={{ borderColor: INK }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] transition-colors cursor-pointer"
            style={{
              fontFamily: sans,
              color: tab === t.key ? WHT : TM,
              background: tab === t.key ? INK : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <table className="w-full text-left" style={{ fontFamily: mono }}>
        <thead>
          <tr className="border-b" style={{ borderColor: GRY }}>
            {["Symbol", "Name", "Price", "Chg%", "Volume"].map((h) => (
              <th
                key={h}
                className="py-1.5 text-[8px] font-extrabold uppercase tracking-[0.15em]"
                style={{ fontFamily: sans, color: TM }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => {
            const isPositive = item.changePercent >= 0;
            return (
              <tr
                key={item.symbol}
                className="border-b transition-colors"
                style={{ borderColor: `${GRY}66` }}
                onMouseEnter={(e) => { e.currentTarget.style.background = BG; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                <td className="py-1.5">
                  <button
                    onClick={() => onTickerClick?.(item.symbol)}
                    className="text-[12px] font-bold hover:underline cursor-pointer"
                    style={{ fontFamily: mono, color: INK }}
                  >
                    {item.symbol}
                  </button>
                </td>
                <td
                  className="py-1.5 text-[11px] max-w-[140px] truncate"
                  style={{ fontFamily: serif, color: T2 }}
                >
                  {item.name}
                </td>
                <td className="py-1.5 text-[12px] font-bold tabular-nums" style={{ color: INK }}>
                  ${Number(item.price ?? 0).toFixed(2)}
                </td>
                <td
                  className="py-1.5 text-[12px] font-bold tabular-nums"
                  style={{ color: isPositive ? GRN : RED }}
                >
                  {isPositive ? "+" : ""}{Number(item.changePercent ?? 0).toFixed(2)}%
                </td>
                <td className="py-1.5 text-[11px] tabular-nums" style={{ color: TM }}>
                  {fmtVol(item.volume)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
