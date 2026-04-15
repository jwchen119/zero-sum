"use client";

import { useCallback, useSyncExternalStore } from "react";

const ALERTS_KEY = "zs_portfolio_alerts";

export type AlertType =
  | "portfolioGainAbove"
  | "portfolioGainBelow"
  | "drawdownBelow"
  | "volatilityAbove"
  | "holdingGainAbove"
  | "holdingGainBelow";

export interface PortfolioAlert {
  id: string;
  type: AlertType;
  threshold: number;
  ticker?: string; // only for holding-level alerts
  enabled: boolean;
  label: string;
  lastTriggered?: string;
}

const ALERT_LABELS: Record<AlertType, string> = {
  portfolioGainAbove: "Portfolio gain above",
  portfolioGainBelow: "Portfolio gain below",
  drawdownBelow: "Drawdown deeper than",
  volatilityAbove: "Volatility above",
  holdingGainAbove: "Holding gain above",
  holdingGainBelow: "Holding gain below",
};

export function alertLabel(type: AlertType): string {
  return ALERT_LABELS[type] ?? type;
}

// ─── External store ───────────────────────────────

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
let cachedSnapshot: PortfolioAlert[] = [];

function getSnapshot(): PortfolioAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSnapshot = raw ? JSON.parse(raw) : [];
    }
    return cachedSnapshot;
  } catch {
    return [];
  }
}

const SERVER_SNAPSHOT: PortfolioAlert[] = [];
function getServerSnapshot(): PortfolioAlert[] {
  return SERVER_SNAPSHOT;
}

function persist(list: PortfolioAlert[]) {
  cachedRaw = JSON.stringify(list);
  cachedSnapshot = list;
  localStorage.setItem(ALERTS_KEY, cachedRaw);
  emitChange();
}

// ─── Notification helper ──────────────────────────

function sendNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// ─── Check alerts against analysis ────────────────

export interface AlertCheckData {
  totalGainPct: number;
  maxDrawdown: number;
  annualizedVolatility: number;
  holdings: { ticker: string; gainPct: number }[];
}

export function checkAlerts(
  alerts: PortfolioAlert[],
  data: AlertCheckData,
  onTrigger?: (alert: PortfolioAlert, message: string) => void
): PortfolioAlert[] {
  const now = new Date().toISOString();
  let anyTriggered = false;
  const updated = alerts.map((a) => {
    if (!a.enabled) return a;
    let triggered = false;
    let msg = "";

    switch (a.type) {
      case "portfolioGainAbove":
        triggered = data.totalGainPct >= a.threshold;
        msg = `Portfolio gain ${data.totalGainPct.toFixed(1)}% is above ${a.threshold}%`;
        break;
      case "portfolioGainBelow":
        triggered = data.totalGainPct <= a.threshold;
        msg = `Portfolio gain ${data.totalGainPct.toFixed(1)}% is below ${a.threshold}%`;
        break;
      case "drawdownBelow":
        triggered = data.maxDrawdown <= a.threshold;
        msg = `Drawdown ${data.maxDrawdown.toFixed(1)}% exceeded threshold ${a.threshold}%`;
        break;
      case "volatilityAbove":
        triggered = data.annualizedVolatility >= a.threshold;
        msg = `Volatility ${data.annualizedVolatility.toFixed(1)}% is above ${a.threshold}%`;
        break;
      case "holdingGainAbove": {
        const h = data.holdings.find((x) => x.ticker === a.ticker);
        if (h) {
          triggered = h.gainPct >= a.threshold;
          msg = `${a.ticker} gain ${h.gainPct.toFixed(1)}% is above ${a.threshold}%`;
        }
        break;
      }
      case "holdingGainBelow": {
        const h = data.holdings.find((x) => x.ticker === a.ticker);
        if (h) {
          triggered = h.gainPct <= a.threshold;
          msg = `${a.ticker} gain ${h.gainPct.toFixed(1)}% is below ${a.threshold}%`;
        }
        break;
      }
    }

    if (triggered) {
      // Don't spam — only trigger if not triggered in last hour
      const lastT = a.lastTriggered ? new Date(a.lastTriggered).getTime() : 0;
      if (Date.now() - lastT > 3600_000) {
        anyTriggered = true;
        sendNotification("Zero-Sum Alert", msg);
        onTrigger?.(a, msg);
        return { ...a, lastTriggered: now };
      }
    }
    return a;
  });

  if (anyTriggered) {
    persist(updated);
  }
  return updated;
}

// ─── Hook ─────────────────────────────────────────

export function usePortfolioAlerts() {
  const alerts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addAlert = useCallback(
    (type: AlertType, threshold: number, ticker?: string) => {
      const current = getSnapshot();
      const label = ALERT_LABELS[type] + ` ${threshold}%` + (ticker ? ` (${ticker})` : "");
      persist([
        ...current,
        {
          id: `a_${Date.now()}`,
          type,
          threshold,
          ticker: ticker?.toUpperCase(),
          enabled: true,
          label,
        },
      ]);
    },
    []
  );

  const removeAlert = useCallback((id: string) => {
    persist(getSnapshot().filter((a) => a.id !== id));
  }, []);

  const toggleAlert = useCallback((id: string) => {
    persist(getSnapshot().map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  }, []);

  return { alerts, addAlert, removeAlert, toggleAlert };
}
