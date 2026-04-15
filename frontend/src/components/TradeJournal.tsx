"use client";

import { type PaperTrade } from "@/lib/useTradeJournal";

const INK = "var(--wsj-ink, #1a1a1a)";
const WHT = "var(--wsj-white, #f5f0e8)";
const GRY = "var(--wsj-grey, #c8c8c8)";
const TM = "var(--wsj-muted, #888888)";
const BULL = "var(--wsj-gain, #2e7d32)";
const BEAR = "var(--wsj-loss, #c62828)";
const mono = "var(--font-mono), monospace";

interface Props {
  openTrades: PaperTrade[];
  closedTrades: PaperTrade[];
  currentPrice: number;
  totalPnL: number;
  winRate: number;
  onClose: (id: string, exitPrice: number, reason: "stopped" | "target" | "manual_close") => void;
  onDelete: (id: string) => void;
}

export default function TradeJournal({ openTrades, closedTrades, currentPrice, totalPnL, winRate, onClose, onDelete }: Props) {
  if (openTrades.length === 0 && closedTrades.length === 0) return null;

  return (
    <div className="border border-t-0 p-4" style={{ borderColor: GRY, background: WHT }}>
      <h3
        className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em]"
        style={{ fontFamily: mono, color: INK }}
      >
        Paper Trades
      </h3>
      <div className="h-[2px] mb-3" style={{ background: INK }} />

      {/* Open trades */}
      {openTrades.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: TM, fontFamily: mono }}>
            Open ({openTrades.length})
          </div>
          {openTrades.map(t => {
            const unrealized = t.direction === "long"
              ? (currentPrice - t.entryPrice) * t.shares
              : (t.entryPrice - currentPrice) * t.shares;
            return (
              <div
                key={t.id}
                className="flex items-center gap-2 py-1 text-[11px]"
                style={{ fontFamily: mono, borderBottom: `1px solid ${GRY}22` }}
              >
                <span style={{ color: t.direction === "long" ? BULL : BEAR, fontSize: 12 }}>
                  {t.direction === "long" ? "▲" : "▼"}
                </span>
                <span style={{ color: INK }}>{t.ticker}</span>
                <span style={{ color: TM }}>@ ${t.entryPrice.toFixed(2)}</span>
                <span style={{ color: TM }}>×{t.shares}</span>
                <span style={{ color: unrealized >= 0 ? BULL : BEAR, fontWeight: 700 }}>
                  {unrealized >= 0 ? "+" : ""}${unrealized.toFixed(0)}
                </span>
                <span className="text-[9px]" style={{ color: TM }}>{t.setupType}</span>
                <span className="ml-auto flex gap-1">
                  <button
                    onClick={() => onClose(t.id, currentPrice, "manual_close")}
                    className="px-1 py-0.5 text-[9px]"
                    style={{ border: `1px solid ${GRY}`, color: TM, background: "transparent", cursor: "pointer" }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="px-1 py-0.5 text-[9px]"
                    style={{ border: `1px solid ${GRY}`, color: BEAR, background: "transparent", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Closed trades summary */}
      {closedTrades.length > 0 && (
        <div>
          <div className="flex items-center gap-3 text-[9px] uppercase tracking-wider font-bold mb-1" style={{ fontFamily: mono }}>
            <span style={{ color: TM }}>Closed ({closedTrades.length})</span>
            <span style={{ color: totalPnL >= 0 ? BULL : BEAR }}>
              Total P&L: {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(0)}
            </span>
            <span style={{ color: winRate > 50 ? BULL : BEAR }}>
              Win Rate: {winRate.toFixed(0)}%
            </span>
          </div>
          {closedTrades.slice(-5).reverse().map(t => (
            <div
              key={t.id}
              className="flex items-center gap-2 py-0.5 text-[10px]"
              style={{ fontFamily: mono, color: TM }}
            >
              <span style={{ color: t.direction === "long" ? BULL : BEAR }}>
                {t.direction === "long" ? "▲" : "▼"}
              </span>
              <span>{t.ticker}</span>
              <span>${t.entryPrice.toFixed(2)} → ${t.exitPrice?.toFixed(2)}</span>
              <span style={{ color: (t.pnl ?? 0) >= 0 ? BULL : BEAR, fontWeight: 700 }}>
                {(t.pnl ?? 0) >= 0 ? "+" : ""}${(t.pnl ?? 0).toFixed(0)}
              </span>
              <span>{t.exitDate}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
