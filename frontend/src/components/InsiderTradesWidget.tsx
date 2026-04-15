"use client";

import { type InsiderTradeItem } from "@/lib/api";
import { INK, GRY, TM, GAIN, LOSS, serif, mono, sans } from "@/lib/wsj";

interface Props {
  transactions: InsiderTradeItem[];
  onTickerClick?: (ticker: string) => void;
}

function formatValue(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function formatShares(val: number): string {
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return val.toLocaleString();
}

/** Notable insider buys and sells — signals insider confidence or concerns. */
export default function InsiderTradesWidget({ transactions, onTickerClick }: Props) {
  if (!transactions?.length) return null;

  const buys = transactions.filter((t) => t.type === "buy");
  const sells = transactions.filter((t) => t.type === "sell");
  const totalBuyValue = buys.reduce((s, t) => s + t.value, 0);
  const totalSellValue = sells.reduce((s, t) => s + t.value, 0);

  return (
    <div>
      {/* Summary */}
      <div
        className="flex flex-wrap items-center gap-4 py-2 px-3 mb-3 border"
        style={{ borderColor: GRY }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider font-bold" style={{ fontFamily: sans, color: TM }}>
            Notable Buys
          </span>
          <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: GAIN }}>
            {buys.length}
          </span>
          <span className="text-[9px] tabular-nums" style={{ fontFamily: mono, color: GAIN }}>
            ({formatValue(totalBuyValue)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider font-bold" style={{ fontFamily: sans, color: TM }}>
            Notable Sells
          </span>
          <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: LOSS }}>
            {sells.length}
          </span>
          <span className="text-[9px] tabular-nums" style={{ fontFamily: mono, color: LOSS }}>
            ({formatValue(totalSellValue)})
          </span>
        </div>
      </div>

      {/* Transaction list */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]" style={{ fontFamily: mono }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}` }}>
              {["Ticker", "Insider", "Type", "Shares", "Value", "Date"].map((h) => (
                <th
                  key={h}
                  className="text-left py-1.5 px-2 font-extrabold uppercase tracking-[0.1em]"
                  style={{ fontFamily: sans, color: TM, fontSize: "8px" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => {
              const isBuy = t.type === "buy";
              return (
                <tr
                  key={`${t.ticker}-${t.insider}-${t.date}-${i}`}
                  className="transition-colors"
                  style={{ borderBottom: `1px solid ${GRY}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `color-mix(in srgb, ${INK} 5%, transparent)`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td className="py-1.5 px-2">
                    <button
                      className="font-bold hover:underline cursor-pointer"
                      style={{ color: INK }}
                      onClick={() => onTickerClick?.(t.ticker)}
                    >
                      {t.ticker}
                    </button>
                    {t.company && (
                      <div className="text-[8px] truncate max-w-[120px]" style={{ color: TM }}>
                        {t.company}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 px-2" style={{ fontFamily: serif, color: INK }}>
                    {t.insider}
                    {t.position && (
                      <div className="text-[8px] truncate max-w-[140px]" style={{ color: TM }}>
                        {t.position}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 px-2">
                    <span
                      className="inline-block text-[8px] font-bold uppercase px-1.5 py-0.5 tracking-wider"
                      style={{
                        fontFamily: sans,
                        color: isBuy ? GAIN : LOSS,
                        border: `1px solid ${isBuy ? GAIN : LOSS}`,
                      }}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 tabular-nums" style={{ color: INK }}>
                    {formatShares(t.shares)}
                  </td>
                  <td className="py-1.5 px-2 tabular-nums font-bold" style={{ color: isBuy ? GAIN : LOSS }}>
                    {formatValue(t.value)}
                  </td>
                  <td className="py-1.5 px-2 tabular-nums" style={{ color: TM }}>
                    {t.date}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Link to full insiders page */}
      <div className="mt-2 text-right">
        <a
          href="/insiders"
          className="text-[9px] uppercase tracking-[0.15em] font-bold hover:underline"
          style={{ fontFamily: sans, color: TM }}
        >
          View all insider activity →
        </a>
      </div>
    </div>
  );
}
