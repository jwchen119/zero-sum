"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MiniChart from "@/components/MiniChart";
import { fetchBulkPrices, fetchBulkFundamentals, type PriceBar, type BulkFundamentalsEntry } from "@/lib/api";

/* ─── Default watchlist ─── */
const DEFAULT_WATCHLIST = [
  "AAPL", "MSFT", "GOOG", "AMZN", "NVDA",
  "META", "TSLA", "JPM", "V", "JNJ",
];

const PERIOD_OPTIONS = ["2y", "3y", "5y", "10y"];

export default function ScreenerPage() {
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [period, setPeriod] = useState("5y");
  const [data, setData] = useState<Record<string, PriceBar[]>>({});
  const [financials, setFinancials] = useState<Record<string, BulkFundamentalsEntry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickerInput, setTickerInput] = useState("");
  const [showRevenue, setShowRevenue] = useState(true);
  const [showDividends, setShowDividends] = useState(true);

  const loadData = useCallback(async () => {
    if (watchlist.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const [priceRes, fundRes] = await Promise.all([
        fetchBulkPrices(watchlist, period),
        fetchBulkFundamentals(watchlist),
      ]);
      setData(priceRes.data);
      setFinancials(fundRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [watchlist, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTicker = () => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !watchlist.includes(t)) {
      setWatchlist((prev) => [...prev, t]);
    }
    setTickerInput("");
  };

  const handleRemoveTicker = (t: string) => {
    setWatchlist((prev) => prev.filter((x) => x !== t));
    setData((prev) => {
      const next = { ...prev };
      delete next[t];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#2E3440]">
      {/* Header */}
      <header className="border-b border-[#434C5E] bg-[#2E3440]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-[1600px] px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-[#ECEFF4] tracking-tight hover:text-[#88C0D0] transition-colors">
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#88C0D0] bg-[#88C0D0]/10 text-[#88C0D0] select-none"
                  style={{
                    fontFamily: "'STIX Two Math', 'Cambria Math', 'Latin Modern Math', 'Times New Roman', serif",
                    fontSize: "1.3rem",
                    lineHeight: 1,
                    textAlign: "center",
                  }}
                >
                  ∑
                </span>
                Zero Sum
              </Link>
              <span className="text-[#4C566A]">|</span>
              <h1 className="text-lg font-semibold text-[#D8DEE9]">Screener</h1>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Period selector */}
              <div className="flex items-center gap-1">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      period === p
                        ? "bg-[#5E81AC] text-[#ECEFF4]"
                        : "bg-[#3B4252] text-[#D8DEE9] hover:bg-[#434C5E]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Add ticker */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTicker()}
                  placeholder="Add ticker…"
                  className="w-28 rounded-md border border-[#4C566A] bg-[#3B4252] px-2.5 py-1 text-xs text-[#ECEFF4] placeholder-[#4C566A] focus:border-[#88C0D0] focus:outline-none"
                />
                <button
                  onClick={handleAddTicker}
                  className="rounded-md bg-[#5E81AC] px-2.5 py-1 text-xs font-medium text-[#ECEFF4] hover:bg-[#81A1C1] transition-colors"
                >
                  +
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={loadData}
                disabled={loading}
                className="rounded-md bg-[#3B4252] px-3 py-1 text-xs font-medium text-[#D8DEE9] hover:bg-[#434C5E] transition-colors disabled:opacity-50"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>

              {/* Toggles */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowRevenue((v) => !v)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    showRevenue
                      ? "bg-[#5E81AC] text-[#ECEFF4]"
                      : "bg-[#3B4252] text-[#4C566A] hover:bg-[#434C5E] hover:text-[#D8DEE9]"
                  }`}
                >
                  Rev
                </button>
                <button
                  onClick={() => setShowDividends((v) => !v)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    showDividends
                      ? "bg-[#B48EAD] text-[#ECEFF4]"
                      : "bg-[#3B4252] text-[#4C566A] hover:bg-[#434C5E] hover:text-[#D8DEE9]"
                  }`}
                >
                  Div
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {/* Watchlist tags */}
        <div className="mb-4 flex flex-wrap gap-2">
          {watchlist.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#3B4252] px-3 py-1 text-xs font-medium text-[#D8DEE9]"
            >
              <Link href={`/?ticker=${t}`} className="hover:text-[#88C0D0] transition-colors">
                {t}
              </Link>
              <button
                onClick={() => handleRemoveTicker(t)}
                className="text-[#4C566A] hover:text-[#BF616A] transition-colors"
                title={`Remove ${t}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-[#BF616A]/10 border border-[#BF616A]/30 p-3 text-sm text-[#BF616A]">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && Object.keys(data).length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {watchlist.map((t) => (
              <div
                key={t}
                className="rounded-xl border border-[#434C5E] bg-[#2E3440] p-3 animate-pulse"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-4 w-16 rounded bg-[#3B4252]" />
                  <div className="h-4 w-12 rounded bg-[#3B4252]" />
                </div>
                <div className="h-[260px] rounded bg-[#3B4252]" />
              </div>
            ))}
          </div>
        )}

        {/* Charts grid */}
        {Object.keys(data).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {watchlist.map(
              (t) =>
                data[t] &&
                data[t].length > 0 && (
                  <MiniChart key={t} ticker={t} data={data[t]} fundamentals={financials[t]} showRevenue={showRevenue} showDividends={showDividends} />
                )
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && watchlist.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[#4C566A]">
            <p className="text-lg">No tickers in watchlist</p>
            <p className="text-sm mt-1">Add some tickers above to get started</p>
          </div>
        )}
      </main>
    </div>
  );
}
