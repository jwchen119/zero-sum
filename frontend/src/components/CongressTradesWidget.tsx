"use client";

import { type CongressTradeItem, type CongressTradesSummary } from "@/lib/api";
import { INK, GRY, TM, GAIN, LOSS, serif, mono, sans } from "@/lib/wsj";

interface Props {
  trades: CongressTradeItem[];
  summary: CongressTradesSummary;
  totalCount: number;
  onTickerClick?: (ticker: string) => void;
}

function partyBadge(party: string) {
  const bg = party === "D" ? "#1565c0" : party === "R" ? "#c62828" : GRY;
  return (
    <span
      className="inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm tracking-wider"
      style={{ background: bg, color: "#fff", fontFamily: sans }}
    >
      {party || "?"}
    </span>
  );
}

function typeBadge(type: string) {
  const isBuy = type === "buy";
  return (
    <span
      className="inline-block text-[8px] font-bold uppercase px-1.5 py-0.5 tracking-wider"
      style={{
        fontFamily: sans,
        color: isBuy ? GAIN : LOSS,
        border: `1px solid ${isBuy ? GAIN : LOSS}`,
      }}
    >
      {type}
    </span>
  );
}

/** Congress member stock trading activity ??extremely engaging data. */
export default function CongressTradesWidget({ trades, summary, totalCount, onTickerClick }: Props) {
  if (!trades?.length) return null;

  return (
    <div>
      {/* Summary bar */}
      <div
        className="flex flex-wrap items-center gap-4 py-2 px-3 mb-3 border"
        style={{ borderColor: GRY }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider font-bold" style={{ fontFamily: sans, color: TM }}>
            Total Trades
          </span>
          <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: INK }}>
            {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider font-bold" style={{ fontFamily: sans, color: TM }}>
            Buys
          </span>
          <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: GAIN }}>
            {summary.totalBuys}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider font-bold" style={{ fontFamily: sans, color: TM }}>
            Sells
          </span>
          <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: LOSS }}>
            {summary.totalSells}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider font-bold" style={{ fontFamily: sans, color: TM }}>
            Unique Tickers
          </span>
          <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: INK }}>
            {summary.uniqueTickers}
          </span>
        </div>
        {/* Buy/sell ratio bar */}
        {(summary.totalBuys + summary.totalSells) > 0 && (
          <div className="flex-1 min-w-[80px]">
            <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: GRY }}>
              <div
                className="h-full"
                style={{
                  width: `${(summary.totalBuys / (summary.totalBuys + summary.totalSells)) * 100}%`,
                  background: GAIN,
                }}
              />
              <div
                className="h-full"
                style={{
                  width: `${(summary.totalSells / (summary.totalBuys + summary.totalSells)) * 100}%`,
                  background: LOSS,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Trades table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]" style={{ fontFamily: mono }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}` }}>
              {["Member", "Party", "Ticker", "Type", "Amount", "Date"].map((h) => (
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
            {trades.map((t, i) => (
              <tr
                key={`${t.member}-${t.ticker}-${t.tradeDate}-${i}`}
                className="transition-colors"
                style={{ borderBottom: `1px solid ${GRY}` }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `color-mix(in srgb, ${INK} 5%, transparent)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <td className="py-1.5 px-2 font-medium" style={{ fontFamily: serif, color: INK }}>
                  {t.member}
                  {t.chamber && (
                    <span className="ml-1 text-[8px]" style={{ color: TM }}>
                      ({t.chamber})
                    </span>
                  )}
                </td>
                <td className="py-1.5 px-2">{partyBadge(t.party)}</td>
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
                <td className="py-1.5 px-2">{typeBadge(t.type)}</td>
                <td className="py-1.5 px-2 tabular-nums" style={{ color: INK }}>
                  {t.amountRange}
                </td>
                <td className="py-1.5 px-2 tabular-nums" style={{ color: TM }}>
                  {t.tradeDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
