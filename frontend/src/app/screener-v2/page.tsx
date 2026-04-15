"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MiniChart from "@/components/MiniChart";
import { fetchBulkPrices, fetchBulkFundamentals, type PriceBar, type BulkFundamentalsEntry } from "@/lib/api";

/* ─── Default watchlist ─── */
const DEFAULT_WATCHLIST = [
  "AAPL", "MSFT", "GOOG", "AMZN", "NVDA",
  "META", "TSLA", "JPM", "V", "JNJ",
  "ORCL", "ADBE", "VZ", "O",
];

const PERIOD_OPTIONS = ["2y", "3y", "5y", "10y"];

/* ─── Neumorphism tokens ─── */
const BG   = "#e0e5ec";
const SD   = "#a3b1c6";   // shadow dark
const SL   = "#ffffff";   // shadow light
const raised   = `6px 6px 12px ${SD}, -6px -6px 12px ${SL}`;
const raisedSm = `3px 3px 6px ${SD}, -3px -3px 6px ${SL}`;
const inset    = `inset 3px 3px 6px ${SD}, inset -3px -3px 6px ${SL}`;

export default function ScreenerV2Page() {
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
    <div className="min-h-screen text-gray-800" style={{ background: BG, fontFamily: "'Nunito', 'Poppins', 'DM Sans', system-ui, sans-serif" }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-50" style={{ background: BG }}>
        <div className="mx-auto max-w-[1600px] px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-gray-700 hover:text-indigo-600 transition-colors">
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-white select-none bg-gradient-to-br from-indigo-500 to-indigo-600"
                  style={{
                    boxShadow: raisedSm,
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
              <div className="h-5 w-px" style={{ background: SD, opacity: 0.4 }} />
              <h1 className="text-lg font-semibold text-gray-600">Screener</h1>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Period selector */}
              <div className="flex items-center gap-1.5">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                    style={{
                      background: BG,
                      boxShadow: period === p ? inset : raisedSm,
                      color: period === p ? "#667eea" : "#718096",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Add ticker */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTicker()}
                  placeholder="Add ticker…"
                  className="w-28 rounded-lg px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                  style={{ background: BG, boxShadow: inset }}
                />
                <button
                  onClick={handleAddTicker}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 transition-all"
                  style={{ boxShadow: raisedSm }}
                >
                  +
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={loadData}
                disabled={loading}
                className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50"
                style={{
                  background: BG,
                  boxShadow: raisedSm,
                  color: "#718096",
                }}
              >
                {loading ? "Loading…" : "Refresh"}
              </button>

              {/* Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowRevenue((v) => !v)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                  style={{
                    background: showRevenue ? "linear-gradient(135deg, #667eea, #764ba2)" : BG,
                    boxShadow: showRevenue ? inset : raisedSm,
                    color: showRevenue ? "#fff" : "#a0aec0",
                  }}
                >
                  Rev
                </button>
                <button
                  onClick={() => setShowDividends((v) => !v)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                  style={{
                    background: showDividends ? "linear-gradient(135deg, #a855f7, #7c3aed)" : BG,
                    boxShadow: showDividends ? inset : raisedSm,
                    color: showDividends ? "#fff" : "#a0aec0",
                  }}
                >
                  Div
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Inset separator */}
        <div className="mx-6 h-px rounded-full" style={{ boxShadow: `inset 1px 1px 1px ${SD}, inset -1px -1px 1px ${SL}` }} />
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {/* Watchlist tags */}
        <div className="mb-5 flex flex-wrap gap-2">
          {watchlist.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-gray-600"
              style={{ background: BG, boxShadow: raisedSm }}
            >
              <Link href={`/?ticker=${t}`} className="hover:text-indigo-600 transition-colors">
                {t}
              </Link>
              <button
                onClick={() => handleRemoveTicker(t)}
                className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                title={`Remove ${t}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-5 rounded-xl p-4 text-sm text-red-600 font-medium"
            style={{ background: BG, boxShadow: inset }}
          >
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && Object.keys(data).length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {watchlist.map((t) => (
              <div
                key={t}
                className="rounded-2xl p-4 animate-pulse"
                style={{ background: BG, boxShadow: raised }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="h-4 w-16 rounded-lg" style={{ background: BG, boxShadow: inset }} />
                  <div className="h-4 w-12 rounded-lg" style={{ background: BG, boxShadow: inset }} />
                </div>
                <div className="h-[260px] rounded-xl" style={{ background: BG, boxShadow: inset }} />
              </div>
            ))}
          </div>
        )}

        {/* Charts grid */}
        {Object.keys(data).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {watchlist.map(
              (t) =>
                data[t] &&
                data[t].length > 0 && (
                  <MiniChart key={t} ticker={t} data={data[t]} fundamentals={financials[t]} showRevenue={showRevenue} showDividends={showDividends} theme="neu" />
                )
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && watchlist.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-lg font-semibold">No tickers in watchlist</p>
            <p className="text-sm mt-1">Add some tickers above to get started</p>
          </div>
        )}
      </main>
    </div>
  );
}
