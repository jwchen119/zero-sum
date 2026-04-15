"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "zs_portfolio";
const PORTFOLIOS_META_KEY = "zs_portfolios_meta";
const ACTIVE_PORTFOLIO_KEY = "zs_active_portfolio";

export interface Holding {
  ticker: string;
  shares: number;
  costBasis: number;
  purchaseDate?: string;   // YYYY-MM-DD
}

export interface PortfolioMeta {
  id: string;
  name: string;
  createdAt: string;
}

// ─── External store (cross-component sync) ────────────────

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

function _getActiveId(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(ACTIVE_PORTFOLIO_KEY) || "default";
}

function _storageKey(id?: string): string {
  const pid = id || _getActiveId();
  return pid === "default" ? STORAGE_KEY : `zs_portfolio_${pid}`;
}

let cachedRaw: string | null = null;
let cachedSnapshot: Holding[] = [];
let cachedKey: string = "";

function getSnapshot(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const key = _storageKey();
    const raw = localStorage.getItem(key);
    if (raw !== cachedRaw || key !== cachedKey) {
      cachedRaw = raw;
      cachedKey = key;
      cachedSnapshot = raw ? JSON.parse(raw) : [];
    }
    return cachedSnapshot;
  } catch {
    return [];
  }
}

const SERVER_SNAPSHOT: Holding[] = [];

function getServerSnapshot(): Holding[] {
  return SERVER_SNAPSHOT;
}

function persist(list: Holding[], id?: string) {
  const key = _storageKey(id);
  const raw = JSON.stringify(list);
  if (!id || id === _getActiveId()) {
    cachedRaw = raw;
    cachedKey = key;
    cachedSnapshot = list;
  }
  localStorage.setItem(key, raw);
  emitChange();
}

// ─── Portfolio metadata helpers ─────────────────────────

let cachedMetaRaw: string | null = null;
let cachedMeta: PortfolioMeta[] = [];

function getMetaSnapshot(): PortfolioMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PORTFOLIOS_META_KEY);
    if (raw !== cachedMetaRaw) {
      cachedMetaRaw = raw;
      cachedMeta = raw ? JSON.parse(raw) : [];
    }
    // Ensure default portfolio always present
    if (!cachedMeta.find((p) => p.id === "default")) {
      cachedMeta = [{ id: "default", name: "My Portfolio", createdAt: new Date().toISOString() }, ...cachedMeta];
    }
    return cachedMeta;
  } catch {
    return [{ id: "default", name: "My Portfolio", createdAt: new Date().toISOString() }];
  }
}

function persistMeta(list: PortfolioMeta[]) {
  cachedMetaRaw = JSON.stringify(list);
  cachedMeta = list;
  localStorage.setItem(PORTFOLIOS_META_KEY, cachedMetaRaw);
  emitChange();
}

function getActiveIdSnapshot(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(ACTIVE_PORTFOLIO_KEY) || "default";
}

const SERVER_ACTIVE: string = "default";
const SERVER_META: PortfolioMeta[] = [];

// ─── Hook ─────────────────────────────────────────────────

export function usePortfolio() {
  const holdings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const portfolios = useSyncExternalStore(subscribe, getMetaSnapshot, () => SERVER_META);
  const activeId = useSyncExternalStore(subscribe, getActiveIdSnapshot, () => SERVER_ACTIVE);

  const add = useCallback((ticker: string, shares: number, costBasis: number, purchaseDate?: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t || shares <= 0) return;
    const current = getSnapshot();
    persist([...current, { ticker: t, shares, costBasis, ...(purchaseDate ? { purchaseDate } : {}) }]);
  }, []);

  const update = useCallback((index: number, holding: Holding) => {
    const current = [...getSnapshot()];
    if (index < 0 || index >= current.length) return;
    current[index] = { ...holding, ticker: holding.ticker.trim().toUpperCase() };
    persist(current);
  }, []);

  const remove = useCallback((index: number) => {
    const current = [...getSnapshot()];
    if (index < 0 || index >= current.length) return;
    current.splice(index, 1);
    persist(current);
  }, []);

  const clear = useCallback(() => {
    persist([]);
  }, []);

  const importHoldings = useCallback((newHoldings: Holding[]) => {
    persist(newHoldings);
  }, []);

  // ── Multi-portfolio management ──

  const createPortfolio = useCallback((name: string) => {
    const meta = getMetaSnapshot();
    const id = `p_${Date.now()}`;
    persistMeta([...meta, { id, name, createdAt: new Date().toISOString() }]);
    return id;
  }, []);

  const renamePortfolio = useCallback((id: string, name: string) => {
    const meta = getMetaSnapshot().map((p) => (p.id === id ? { ...p, name } : p));
    persistMeta(meta);
  }, []);

  const deletePortfolio = useCallback((id: string) => {
    if (id === "default") return;
    const meta = getMetaSnapshot().filter((p) => p.id !== id);
    persistMeta(meta);
    localStorage.removeItem(_storageKey(id));
    if (_getActiveId() === id) {
      localStorage.setItem(ACTIVE_PORTFOLIO_KEY, "default");
    }
    emitChange();
  }, []);

  const switchPortfolio = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_PORTFOLIO_KEY, id);
    cachedRaw = null; // force re-read
    cachedKey = "";
    emitChange();
  }, []);

  const duplicatePortfolio = useCallback((sourceId: string, newName: string) => {
    const sourceKey = _storageKey(sourceId);
    const raw = localStorage.getItem(sourceKey);
    const holdings: Holding[] = raw ? JSON.parse(raw) : [];
    const newId = `p_${Date.now()}`;
    const meta = getMetaSnapshot();
    persistMeta([...meta, { id: newId, name: newName, createdAt: new Date().toISOString() }]);
    persist(holdings, newId);
    return newId;
  }, []);

  const getHoldingsForPortfolio = useCallback((id: string): Holding[] => {
    try {
      const key = _storageKey(id);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  return {
    holdings,
    add,
    update,
    remove,
    clear,
    importHoldings,
    // Multi-portfolio
    portfolios,
    activeId,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
    switchPortfolio,
    duplicatePortfolio,
    getHoldingsForPortfolio,
  };
}
