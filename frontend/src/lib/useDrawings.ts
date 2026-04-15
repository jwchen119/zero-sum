"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type DrawingType = "hline" | "trendline" | "rect";

export interface Drawing {
  id: string;
  type: DrawingType;
  ticker: string;
  color: string;
  // hline
  price?: number;
  // trendline
  p1?: { time: string; price: number };
  p2?: { time: string; price: number };
  // rect
  topLeft?: { time: string; price: number };
  bottomRight?: { time: string; price: number };
}

export function useDrawings(ticker: string) {
  const key = `zs_drawings_${ticker}`;
  const [drawings, setDrawings] = useState<Drawing[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Track prev key to detect ticker changes vs drawing mutations
  const prevKeyRef = useRef(key);

  useEffect(() => {
    if (prevKeyRef.current !== key) {
      // Ticker changed — load new ticker's drawings
      prevKeyRef.current = key;
      try {
        const stored = localStorage.getItem(key);
        setDrawings(stored ? JSON.parse(stored) : []);
      } catch {
        setDrawings([]);
      }
    } else {
      // Same ticker — persist current drawings
      try {
        localStorage.setItem(key, JSON.stringify(drawings));
      } catch {}
    }
  }, [drawings, key]);

  const add = useCallback(
    (d: Drawing) => setDrawings((prev) => [...prev, d]),
    [],
  );

  const remove = useCallback(
    (id: string) => setDrawings((prev) => prev.filter((d) => d.id !== id)),
    [],
  );

  const clear = useCallback(() => setDrawings([]), []);

  return { drawings, add, remove, clear };
}
