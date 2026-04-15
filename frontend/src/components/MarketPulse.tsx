"use client";

import { type MarketItem, type MarketStatus } from "@/lib/api";
import { INK, GRY, TM, GAIN, LOSS, mono, sans } from "@/lib/wsj";

interface Props {
  items: MarketItem[];
  marketStatus: MarketStatus;
  onTickerClick?: (ticker: string) => void;
}

/** Big prominent market index cards — the hero section above the fold. */
export default function MarketPulse({ items = [], marketStatus }: Props) {
  /* Split into main indices vs secondary assets */
  const mainIndices = items.filter((i) => i.category === "index" || i.category === "volatility");
  const otherAssets = items.filter((i) => i.category !== "index" && i.category !== "volatility");

  return (
    <div className="mb-4">
      {/* Market status badge */}
      {marketStatus.status !== "unknown" && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-block w-2 h-2 rounded-full animate-pulse"
            style={{ background: marketStatus.status === "open" ? GAIN : LOSS }}
          />
          <span
            className="text-[10px] uppercase tracking-[0.15em] font-bold"
            style={{ fontFamily: sans, color: TM }}
          >
            {marketStatus.message || `Market ${marketStatus.status}`}
          </span>
        </div>
      )}

      {/* Main indices — big cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
        {mainIndices.map((item) => {
          const isUp = item.changePercent >= 0;
          return (
            <div
              key={item.symbol}
              className="p-3 border transition-all"
              style={{
                borderColor: GRY,
                borderLeft: `3px solid ${isUp ? GAIN : LOSS}`,
              }}
            >
              <div
                className="text-[8px] font-extrabold uppercase tracking-[0.15em] mb-1"
                style={{ fontFamily: sans, color: TM }}
              >
                {item.name}
              </div>
              <div
                className="text-[18px] font-bold tabular-nums leading-tight"
                style={{ fontFamily: mono, color: INK }}
              >
                {item.category === "bond"
                  ? (item.price ?? 0).toFixed(2) + "%"
                  : (item.price ?? 0) >= 1000
                    ? (item.price ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })
                    : (item.price ?? 0).toFixed(2)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ fontFamily: mono, color: isUp ? GAIN : LOSS }}
                >
                  {isUp ? "▲" : "▼"} {Math.abs(item.changePercent ?? 0).toFixed(2)}%
                </span>
                <span
                  className="text-[10px] tabular-nums"
                  style={{ fontFamily: mono, color: isUp ? GAIN : LOSS }}
                >
                  {isUp ? "+" : ""}
                  {(item.change ?? 0) >= 1000
                    ? (item.change ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })
                    : (item.change ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary assets — compact row */}
      {otherAssets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {otherAssets.map((item) => {
            const isUp = item.changePercent >= 0;
            return (
              <div
                key={item.symbol}
                className="flex items-center justify-between py-2 px-3 border"
                style={{ borderColor: GRY }}
              >
                <div>
                  <div
                    className="text-[8px] font-extrabold uppercase tracking-[0.1em]"
                    style={{ fontFamily: sans, color: TM }}
                  >
                    {item.name}
                  </div>
                  <div
                    className="text-[13px] font-bold tabular-nums"
                    style={{ fontFamily: mono, color: INK }}
                  >
                    {(item.price ?? 0) >= 1000
                      ? (item.price ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })
                      : (item.price ?? 0).toFixed(2)}
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{ fontFamily: mono, color: isUp ? GAIN : LOSS }}
                >
                  {isUp ? "▲" : "▼"}{Math.abs(item.changePercent ?? 0).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
