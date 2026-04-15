"use client";

import { useState, useCallback } from "react";

export interface PaperTrade {
  id: string;
  ticker: string;
  direction: "long" | "short";
  entryPrice: number;
  entryDate: string;
  stopPrice: number;
  targetPrice: number;
  shares: number;
  status: "open" | "stopped" | "target" | "manual_close";
  exitPrice?: number;
  exitDate?: string;
  pnl?: number;
  notes: string;
  setupType: string;
}

const KEY = "zs_trades";

function load(): PaperTrade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(trades: PaperTrade[]) {
  try { localStorage.setItem(KEY, JSON.stringify(trades)); } catch {}
}

export function useTradeJournal() {
  const [trades, setTrades] = useState<PaperTrade[]>(load);

  const openTrade = useCallback((trade: Omit<PaperTrade, "id" | "status">) => {
    setTrades(prev => {
      const next = [...prev, { ...trade, id: crypto.randomUUID(), status: "open" as const }];
      save(next);
      return next;
    });
  }, []);

  const closeTrade = useCallback((id: string, exitPrice: number, reason: "stopped" | "target" | "manual_close") => {
    setTrades(prev => {
      const next = prev.map(t =>
        t.id === id ? {
          ...t,
          status: reason,
          exitPrice,
          exitDate: new Date().toISOString().split("T")[0],
          pnl: t.direction === "long"
            ? (exitPrice - t.entryPrice) * t.shares
            : (t.entryPrice - exitPrice) * t.shares,
        } : t
      );
      save(next);
      return next;
    });
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setTrades(prev => {
      const next = prev.filter(t => t.id !== id);
      save(next);
      return next;
    });
  }, []);

  const openTrades = trades.filter(t => t.status === "open");
  const closedTrades = trades.filter(t => t.status !== "open");
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const winRate = closedTrades.length > 0
    ? closedTrades.filter(t => (t.pnl ?? 0) > 0).length / closedTrades.length * 100
    : 0;

  return { trades, openTrades, closedTrades, openTrade, closeTrade, deleteTrade, totalPnL, winRate };
}
