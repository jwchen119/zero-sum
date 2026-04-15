"use client";

import { useCallback } from "react";

interface ShareData {
  ticker: string;
  price?: number;
  change?: number;
  changePct?: number;
}

/**
 * Hook for Web Share API — lets users share stock data via the native share sheet.
 */
export function useShare() {
  const supported = typeof navigator !== "undefined" && !!navigator.share;

  const shareStock = useCallback(
    async ({ ticker, price, change, changePct }: ShareData): Promise<boolean> => {
      if (!navigator.share) return false;

      const priceStr = price != null ? `$${price.toFixed(2)}` : "";
      const changeStr =
        change != null && changePct != null
          ? ` (${change >= 0 ? "+" : ""}${change.toFixed(2)} / ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%)`
          : "";

      const text = `${ticker} ${priceStr}${changeStr} — Zero Sum Times`;
      const url = `${window.location.origin}/stocks/${ticker}`;

      try {
        await navigator.share({ title: `${ticker} Stock`, text, url });
        return true;
      } catch (err) {
        // User cancelled — not an error
        if (err instanceof DOMException && err.name === "AbortError") return false;
        console.error("Share failed:", err);
        return false;
      }
    },
    []
  );

  const shareChart = useCallback(
    async (ticker: string): Promise<boolean> => {
      if (!navigator.share) return false;
      try {
        await navigator.share({
          title: `${ticker} Chart — Zero Sum Times`,
          text: `Check out the ${ticker} chart on Zero Sum Times`,
          url: `${window.location.origin}/stocks/${ticker}`,
        });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  return { supported, shareStock, shareChart };
}
