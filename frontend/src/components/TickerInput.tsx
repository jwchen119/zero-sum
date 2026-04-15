"use client";

import { useState, FormEvent } from "react";

interface TickerInputProps {
  onSubmit: (ticker: string, period: string) => void;
  loading?: boolean;
  initialTicker?: string;
}

const PERIODS = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
];

const mono = "var(--font-mono-data), 'Courier New', monospace";

export default function TickerInput({ onSubmit, loading, initialTicker }: TickerInputProps) {
  const [ticker, setTicker] = useState(initialTicker || "2330.TW");
  const [period, setPeriod] = useState("5y");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (t && /^[A-Z0-9]{1,10}(\.[A-Z]{1,4})?$/.test(t)) onSubmit(t, period);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#888888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Search ticker…"
          className="w-44 border-2 pl-8 pr-3 py-2 text-sm font-bold tracking-wider outline-none focus:ring-2 focus:border-[#1a1a1a] transition-colors"
          style={{
            fontFamily: mono,
            borderColor: "#aaa",
            color: "#1a1a1a",
            background: "#f5f0e8",
          }}
        />
      </div>
      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className="px-2.5 py-1.5 text-[10px] font-bold transition-colors"
            style={{
              fontFamily: mono,
              color: period === p.value ? "#1a1a1a" : "#888888",
              borderBottom: period === p.value ? "2px solid #1a1a1a" : "2px solid transparent",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2 text-[11px] font-extrabold uppercase tracking-[0.15em] transition-colors disabled:opacity-50 disabled:cursor-wait"
        style={{
          fontFamily: mono,
          background: "#1a1a1a",
          color: "#ffffff",
        }}
      >
        {loading ? "Loading…" : "Analyze"}
      </button>
    </form>
  );
}
