"use client";

import { useCallback, useSyncExternalStore } from "react";
import { WATCHLIST_DEFAULT_ETF_TICKERS } from "@/lib/benchmarks";

const STORAGE_KEY = "zs_watchlist_groups";

export interface WatchlistGroup {
  name: string;
  tickers: string[];
}

const DEFAULT_GROUPS: WatchlistGroup[] = [
  { name: "Technology", tickers: ["AAPL", "MSFT", "GOOG", "NVDA", "META", "AMZN"] },
  { name: "Energy", tickers: ["XOM", "CVX", "COP", "SLB", "EOG"] },
  { name: "Healthcare", tickers: ["JNJ", "UNH", "PFE", "ABBV", "MRK"] },
  { name: "Finance", tickers: ["JPM", "V", "MA", "BAC", "GS"] },
  { name: "ETFs", tickers: WATCHLIST_DEFAULT_ETF_TICKERS },
];

/* ── External store for cross-component sync ── */
let listeners: (() => void)[] = [];
function emitChange() {
  for (const l of listeners) l();
}
function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

let cachedRaw: string | null = null;
let cachedSnapshot: WatchlistGroup[] = DEFAULT_GROUPS;

function getSnapshot(): WatchlistGroup[] {
  if (typeof window === "undefined") return DEFAULT_GROUPS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSnapshot = raw ? JSON.parse(raw) : DEFAULT_GROUPS;
    }
    return cachedSnapshot;
  } catch {
    return DEFAULT_GROUPS;
  }
}
function getServerSnapshot(): WatchlistGroup[] {
  return DEFAULT_GROUPS;
}

function persist(groups: WatchlistGroup[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  cachedRaw = null; // force re-read
  emitChange();
}

export function useWatchlistGroups() {
  const groups = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addGroup = useCallback((name: string) => {
    const n = name.trim();
    if (!n) return;
    const current = getSnapshot();
    if (current.some((g) => g.name.toLowerCase() === n.toLowerCase())) return;
    persist([...current, { name: n, tickers: [] }]);
  }, []);

  const removeGroup = useCallback((name: string) => {
    const current = getSnapshot();
    persist(current.filter((g) => g.name !== name));
  }, []);

  const renameGroup = useCallback((oldName: string, newName: string) => {
    const n = newName.trim();
    if (!n) return;
    const current = getSnapshot();
    persist(current.map((g) => (g.name === oldName ? { ...g, name: n } : g)));
  }, []);

  const addTicker = useCallback((groupName: string, ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    const current = getSnapshot();
    persist(
      current.map((g) =>
        g.name === groupName && !g.tickers.includes(t)
          ? { ...g, tickers: [...g.tickers, t] }
          : g
      )
    );
  }, []);

  const removeTicker = useCallback((groupName: string, ticker: string) => {
    const t = ticker.trim().toUpperCase();
    const current = getSnapshot();
    persist(
      current.map((g) =>
        g.name === groupName
          ? { ...g, tickers: g.tickers.filter((x) => x !== t) }
          : g
      )
    );
  }, []);

  const toggleTicker = useCallback((groupName: string, ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    const current = getSnapshot();
    persist(
      current.map((g) => {
        if (g.name !== groupName) return g;
        return g.tickers.includes(t)
          ? { ...g, tickers: g.tickers.filter((x) => x !== t) }
          : { ...g, tickers: [...g.tickers, t] };
      })
    );
  }, []);

  return { groups, addGroup, removeGroup, renameGroup, addTicker, removeTicker, toggleTicker };
}
