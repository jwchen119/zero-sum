"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, BLU, T2,
  serif, mono,
  Hair, HeavyRule,
} from "@/lib/wsj";
import { TECHNICAL_ETF_INDICES_TICKERS } from "@/lib/benchmarks";

/* Popular Taiwan tickers grouped by theme for quick access */
const GROUPS: { label: string; tickers: string[] }[] = [
  { label: "Semiconductors", tickers: ["2330.TW", "2454.TW", "2303.TW", "3034.TW", "3711.TW", "2379.TW", "2408.TW"] },
  { label: "AI Servers & EMS", tickers: ["2317.TW", "2382.TW", "2308.TW", "2357.TW", "3231.TW", "6669.TW", "4938.TW"] },
  { label: "Networking & Telecom", tickers: ["2412.TW", "3045.TW", "4904.TW", "2345.TW", "3596.TW", "6285.TW"] },
  { label: "Financials", tickers: ["2881.TW", "2882.TW", "2884.TW", "2886.TW", "2891.TW", "2892.TW", "5871.TW", "5880.TW"] },
  { label: "Materials & Industrials", tickers: ["1301.TW", "1326.TW", "1101.TW", "2207.TW", "6505.TW", "9910.TW"] },
  { label: "Shipping & Transport", tickers: ["2603.TW", "2609.TW", "2615.TW", "2610.TW", "2618.TW", "2637.TW"] },
  { label: "Consumer & Retail", tickers: ["1216.TW", "2912.TW", "5876.TW", "9904.TW", "2727.TW", "8464.TW"] },
  { label: "High Dividend & Income", tickers: ["0056.TW", "00878.TW", "00919.TW", "00713.TW", "00929.TW"] },
  { label: "ETFs & Indices", tickers: TECHNICAL_ETF_INDICES_TICKERS },
];

export default function TechnicalIndexPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleGo = () => {
    const t = search.trim().toUpperCase();
    if (t) {
      router.push(`/technical/${encodeURIComponent(t)}`);
      setSearch("");
    }
  };

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
        Home
      </Link>
      <Link href="/screener-v4" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
        Screener
      </Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: serif, color: INK }}>
          Technical Analysis
        </h1>
        <p className="mt-1 text-sm" style={{ color: T2, fontFamily: mono }}>
          Charts with Bollinger Bands, RSI, MACD, Stochastic, Support/Resistance, Fibonacci, Parabolic SAR, and multi-indicator setup detection.
        </p>

        <HeavyRule />

        <div className="my-4">
          <form
            onSubmit={(e) => { e.preventDefault(); handleGo(); }}
            className="flex items-center gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter TW ticker (e.g. 2330.TW)"
              className="w-full max-w-xs border px-3 py-2 text-sm uppercase"
              style={{
                borderColor: GRY,
                background: WHT,
                color: INK,
                fontFamily: mono,
                outline: "none",
              }}
            />
            <button
              type="submit"
              className="border px-4 py-2 text-sm font-bold transition-colors hover:opacity-80"
              style={{ background: INK, color: WHT, borderColor: INK, fontFamily: mono }}
            >
              Analyze
            </button>
          </form>
        </div>

        <Hair />

        <div className="mt-4 space-y-5">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <h3
                className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em]"
                style={{ fontFamily: mono, color: INK }}
              >
                {g.label}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {g.tickers.map((t) => (
                  <Link
                    key={t}
                    href={`/technical/${t}`}
                    className="inline-block border px-2.5 py-1 text-xs font-bold transition-colors hover:opacity-80"
                    style={{
                      borderColor: GRY,
                      color: INK,
                      fontFamily: mono,
                      background: WHT,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = INK;
                      e.currentTarget.style.color = WHT;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = WHT;
                      e.currentTarget.style.color = INK;
                    }}
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Hair />

        <div className="mt-4 grid gap-4 sm:grid-cols-3" style={{ fontFamily: mono }}>
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: INK }}>
              Overlays
            </h4>
            <p className="text-[11px] leading-relaxed" style={{ color: T2 }}>
              Bollinger Bands, EMA 8/21 ribbon, Parabolic SAR, auto-detected support &amp; resistance levels, Fibonacci retracements.
            </p>
          </div>
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: INK }}>
              Studies
            </h4>
            <p className="text-[11px] leading-relaxed" style={{ color: T2 }}>
              RSI (14) with overbought/oversold zones, MACD (12, 26, 9) histogram, Stochastic %K/%D oscillator.
            </p>
          </div>
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: INK }}>
              Setup Detection
            </h4>
            <p className="text-[11px] leading-relaxed" style={{ color: T2 }}>
              BB squeeze breakouts, RSI divergences, golden/death crosses, MACD crosses, EMA pullbacks, volume climax reversals, candlestick patterns.
            </p>
          </div>
        </div>
      </div>
    </WSJLayout>
  );
}
