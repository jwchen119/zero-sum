"use client";

import type { ETFItem } from "@/lib/api";
import { INK, WHT, GRY, TM, RED, BG, mono, sans } from "@/lib/wsj";

const GOLD = "var(--wsj-green, #c9a96e)";

function formatAUM(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n}`;
}

interface Props {
  etfs: ETFItem[];
  onTickerClick?: (ticker: string) => void;
}

export default function ETFOverview({ etfs, onTickerClick }: Props) {
  if (!etfs?.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse" style={{ fontFamily: mono }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${INK}` }}>
            {["ETF", "Name", "Price", "Day", "YTD", "Category", "AUM"].map((h) => (
              <th
                key={h}
                className="py-2 px-2 text-[8px] font-extrabold uppercase tracking-[0.15em]"
                style={{ fontFamily: sans, color: TM }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {etfs.map((etf, i) => {
            const dayColor = (etf.changePercent ?? 0) >= 0 ? GOLD : RED;
            const ytdColor = (etf.ytdPercent ?? 0) >= 0 ? GOLD : RED;
            return (
              <tr
                key={etf.symbol}
                className="transition-colors cursor-pointer"
                style={{
                  borderBottom: `1px solid ${GRY}`,
                  background: i % 2 === 0 ? WHT : "transparent",
                }}
                onClick={() => onTickerClick?.(etf.symbol)}
                onMouseEnter={(e) => { e.currentTarget.style.background = BG; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? WHT : "transparent"; }}
              >
                <td className="py-2 px-2">
                  <span className="text-[13px] font-bold" style={{ color: INK }}>
                    {etf.symbol}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <span className="text-[10px]" style={{ color: TM }}>
                    {etf.name}
                  </span>
                </td>
                <td className="py-2 px-2 tabular-nums text-right">
                  <span className="text-[12px] font-bold" style={{ color: INK }}>
                    ${(etf.price ?? 0).toFixed(2)}
                  </span>
                </td>
                <td className="py-2 px-2 tabular-nums text-right">
                  <span className="text-[11px] font-bold" style={{ color: dayColor }}>
                    {(etf.changePercent ?? 0) >= 0 ? "▲" : "▼"}{Math.abs(etf.changePercent ?? 0).toFixed(2)}%
                  </span>
                </td>
                <td className="py-2 px-2 tabular-nums text-right">
                  {typeof etf.ytdPercent === "number" ? (
                    <span className="text-[11px] font-bold" style={{ color: ytdColor }}>
                      {etf.ytdPercent >= 0 ? "+" : ""}{etf.ytdPercent.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-[10px]" style={{ color: TM }}>—</span>
                  )}
                </td>
                <td className="py-2 px-2">
                  <span className="text-[9px]" style={{ fontFamily: sans, color: TM }}>
                    {etf.category || "—"}
                  </span>
                </td>
                <td className="py-2 px-2 tabular-nums text-right">
                  <span className="text-[10px]" style={{ color: TM }}>
                    {etf.totalAssets ? formatAUM(etf.totalAssets) : "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
