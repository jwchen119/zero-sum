"use client";

import { INK, GRY, TM, GAIN, LOSS, mono, sans } from "@/lib/wsj";

interface Props {
  mostTraded: { ticker: string; trades: number }[];
  partyBreakdown: Record<string, { total: number; buys: number; sells: number }>;
  onTickerClick?: (ticker: string) => void;
}

/** Compact display of most-traded tickers by Congress + party breakdown. */
export default function CongressHotTickers({ mostTraded, partyBreakdown, onTickerClick }: Props) {
  if (!mostTraded?.length) return null;

  const maxTrades = Math.max(...mostTraded.map((t) => t.trades), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Most traded tickers */}
      <div>
        <div
          className="text-[8px] font-extrabold uppercase tracking-[0.15em] mb-2"
          style={{ fontFamily: sans, color: TM }}
        >
          Most Traded by Congress
        </div>
        <div className="space-y-1">
          {mostTraded.slice(0, 8).map((item) => (
            <div key={item.ticker} className="flex items-center gap-2">
              <button
                className="text-[10px] font-bold w-12 text-left hover:underline cursor-pointer"
                style={{ fontFamily: mono, color: INK }}
                onClick={() => onTickerClick?.(item.ticker)}
              >
                {item.ticker}
              </button>
              <div className="flex-1 h-3 relative" style={{ background: `color-mix(in srgb, ${GRY} 30%, transparent)` }}>
                <div
                  className="h-full"
                  style={{
                    width: `${(item.trades / maxTrades) * 100}%`,
                    background: `color-mix(in srgb, ${INK} 25%, transparent)`,
                  }}
                />
              </div>
              <span
                className="text-[9px] tabular-nums font-bold w-8 text-right"
                style={{ fontFamily: mono, color: INK }}
              >
                {item.trades}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Party breakdown */}
      <div>
        <div
          className="text-[8px] font-extrabold uppercase tracking-[0.15em] mb-2"
          style={{ fontFamily: sans, color: TM }}
        >
          Party Breakdown
        </div>
        {Object.entries(partyBreakdown).map(([party, data]) => (
          <div key={party} className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm tracking-wider"
                style={{
                  background: party === "D" ? "#1565c0" : party === "R" ? "#c62828" : GRY,
                  color: "#fff",
                  fontFamily: sans,
                }}
              >
                {party === "D" ? "Democrat" : party === "R" ? "Republican" : party}
              </span>
              <span className="text-[9px] tabular-nums" style={{ fontFamily: mono, color: TM }}>
                {data.total} trades
              </span>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>
                  Buys
                </span>
                <span className="text-[11px] font-bold tabular-nums" style={{ fontFamily: mono, color: GAIN }}>
                  {data.buys}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>
                  Sells
                </span>
                <span className="text-[11px] font-bold tabular-nums" style={{ fontFamily: mono, color: LOSS }}>
                  {data.sells}
                </span>
              </div>
            </div>
            {/* Mini buy/sell bar */}
            {data.total > 0 && (
              <div className="flex h-1 mt-1 rounded-full overflow-hidden" style={{ background: GRY }}>
                <div style={{ width: `${(data.buys / data.total) * 100}%`, background: GAIN }} />
                <div style={{ width: `${(data.sells / data.total) * 100}%`, background: LOSS }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
