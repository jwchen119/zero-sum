import { useEffect, useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface RealtimeData {
  price: number;
  volume: number;
  timestamp: number;
}

/**
 * Polls the latest price for a ticker every `intervalMs` milliseconds.
 * Returns null until the first successful fetch.
 */
export function useRealtimePrice(
  ticker: string,
  enabled: boolean = true,
  intervalMs: number = 15_000,
): RealtimeData | null {
  const [data, setData] = useState<RealtimeData | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !ticker) return;

    setData(null); // Reset on ticker change

    const fetchLatest = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/quote?ticker=${encodeURIComponent(ticker)}`
        );
        if (!res.ok) return;
        const json = await res.json();
        if (json.price != null) {
          setData({
            price: json.price,
            volume: json.volume ?? 0,
            timestamp: Date.now(),
          });
        }
      } catch {
        // swallow — will retry next interval
      }
    };

    fetchLatest();
    timerRef.current = setInterval(fetchLatest, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ticker, enabled, intervalMs]);

  return data;
}
