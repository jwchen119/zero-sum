"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, RED, T2, TM,
  serif, display, mono, sans,
  HeavyRule, Hair,
 GAIN,} from "@/lib/wsj";
import {
  fetchScreener,
  type ScreenerStock,
  type ScreenerParams,
} from "@/lib/api";
import { useWatchlist } from "@/lib/useWatchlist";

/* ─── Column definitions ─── */

interface ColDef {
  key: string;
  label: string;
  short?: string;
  align?: "left" | "right";
  fmt?: (v: unknown, row: ScreenerStock) => string;
  group: string;
  defaultVisible?: boolean;
}

function fmtNum(v: unknown, decimals = 2): string {
  if (v == null) return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  return n.toFixed(decimals);
}
function fmtPct(v: unknown): string {
  if (v == null) return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  return (n * 100).toFixed(1) + "%";
}
function fmtPctRaw(v: unknown): string {
  if (v == null) return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  return n.toFixed(1) + "%";
}
function fmtBig(v: unknown): string {
  if (v == null) return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(0) + "M";
  return n.toLocaleString();
}
function fmtVol(v: unknown): string {
  if (v == null) return "—";
  const n = v as number;
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toLocaleString();
}
function fmtChange(_v: unknown, row: ScreenerStock): string {
  const cur = row.currentPrice;
  const prev = row.previousClose;
  if (cur == null || prev == null) return "—";
  const pct = ((cur - prev) / prev) * 100;
  return (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
}

const COLUMNS: ColDef[] = [
  { key: "symbol",       label: "Symbol",        group: "Core", align: "left", defaultVisible: true,
    fmt: (v) => String(v ?? "") },
  { key: "shortName",    label: "Company",        group: "Core", align: "left", defaultVisible: true,
    fmt: (v) => { const s = String(v ?? ""); return s.length > 28 ? s.slice(0, 26) + "…" : s; } },
  { key: "sector",       label: "Sector",         group: "Core", align: "left", defaultVisible: true,
    fmt: (v) => String(v ?? "—") },
  { key: "currentPrice", label: "Price",          group: "Core", align: "right", defaultVisible: true,
    fmt: (v) => fmtNum(v) },
  { key: "_change",      label: "Chg%",           group: "Core", align: "right", defaultVisible: true,
    fmt: fmtChange },
  { key: "marketCap",    label: "Mkt Cap",        group: "Valuation", align: "right", defaultVisible: true,
    fmt: (v) => fmtBig(v) },
  { key: "trailingPE",   label: "P/E",            group: "Valuation", align: "right", defaultVisible: true,
    fmt: (v) => fmtNum(v, 1) },
  { key: "forwardPE",    label: "Fwd P/E",        group: "Valuation", align: "right", defaultVisible: false,
    fmt: (v) => fmtNum(v, 1) },
  { key: "priceToBook",  label: "P/B",            group: "Valuation", align: "right", defaultVisible: false,
    fmt: (v) => fmtNum(v, 1) },
  { key: "priceToSalesTrailing12Months", label: "P/S", short: "P/S", group: "Valuation", align: "right", defaultVisible: false,
    fmt: (v) => fmtNum(v, 1) },
  { key: "enterpriseValue", label: "EV",          group: "Valuation", align: "right", defaultVisible: false,
    fmt: (v) => fmtBig(v) },
  { key: "ytdReturn",    label: "YTD",            group: "Performance", align: "right", defaultVisible: true,
    fmt: (v) => fmtPctRaw(v) },
  { key: "revenueGrowth", label: "Rev Growth",    group: "Growth", align: "right", defaultVisible: true,
    fmt: (v) => fmtPct(v) },
  { key: "earningsGrowth", label: "Earn Growth",  group: "Growth", align: "right", defaultVisible: false,
    fmt: (v) => fmtPct(v) },
  { key: "profitMargins", label: "Profit Margin", group: "Profitability", align: "right", defaultVisible: true,
    fmt: (v) => fmtPct(v) },
  { key: "operatingMargins", label: "Op Margin",  group: "Profitability", align: "right", defaultVisible: false,
    fmt: (v) => fmtPct(v) },
  { key: "grossMargins", label: "Gross Margin",   group: "Profitability", align: "right", defaultVisible: false,
    fmt: (v) => fmtPct(v) },
  { key: "returnOnEquity", label: "ROE",          group: "Profitability", align: "right", defaultVisible: false,
    fmt: (v) => fmtPct(v) },
  { key: "returnOnAssets", label: "ROA",           group: "Profitability", align: "right", defaultVisible: false,
    fmt: (v) => fmtPct(v) },
  { key: "dividendYield", label: "Div Yield",     group: "Dividends", align: "right", defaultVisible: true,
    fmt: (v) => fmtPctRaw(v) },
  { key: "payoutRatio",  label: "Payout",         group: "Dividends", align: "right", defaultVisible: false,
    fmt: (v) => fmtPct(v) },
  { key: "debtToEquity", label: "D/E",            group: "Financial Health", align: "right", defaultVisible: false,
    fmt: (v) => fmtNum(v, 1) },
  { key: "currentRatio", label: "Current",        group: "Financial Health", align: "right", defaultVisible: false,
    fmt: (v) => fmtNum(v, 1) },
  { key: "beta",         label: "Beta",           group: "Risk", align: "right", defaultVisible: true,
    fmt: (v) => fmtNum(v, 2) },
  { key: "averageVolume", label: "Avg Vol",       group: "Liquidity", align: "right", defaultVisible: false,
    fmt: (v) => fmtVol(v) },
  { key: "totalRevenue", label: "Revenue",        group: "Fundamentals", align: "right", defaultVisible: false,
    fmt: (v) => fmtBig(v) },
  { key: "freeCashflow", label: "FCF",            group: "Fundamentals", align: "right", defaultVisible: false,
    fmt: (v) => fmtBig(v) },
  { key: "recommendationKey", label: "Rating",    group: "Analyst", align: "left", defaultVisible: true,
    fmt: (v) => v ? String(v).toUpperCase() : "—" },
  { key: "targetMeanPrice", label: "Target",      group: "Analyst", align: "right", defaultVisible: false,
    fmt: (v) => fmtNum(v) },
  { key: "numberOfAnalystOpinions", label: "# Analysts", group: "Analyst", align: "right", defaultVisible: false,
    fmt: (v) => v != null ? String(v) : "—" },
];

const DEFAULT_VISIBLE = new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key));

/* ─── Filter/tab types ─── */

type IndexTab = "" | "twse";
type CapRange = "" | "mega" | "large" | "mid" | "small";

const INDEX_TABS: { value: IndexTab; label: string; desc: string }[] = [
  { value: "",           label: "All",         desc: "All stocks" },
  { value: "twse",       label: "TWSE",        desc: "TWSE listed stocks" },
];

const CAP_RANGES: { value: CapRange; label: string; min?: number; max?: number }[] = [
  { value: "",      label: "All" },
  { value: "mega",  label: "Mega (>200B)",  min: 200e9 },
  { value: "large", label: "Large (10–200B)", min: 10e9, max: 200e9 },
  { value: "mid",   label: "Mid (2–10B)",   min: 2e9,  max: 10e9 },
  { value: "small", label: "Small (<2B)",   max: 2e9 },
];

/* ─── Main component ─── */

export default function ScreenerV4Page() {
  const { toggle: toggleWatchlist, has: inWatchlist } = useWatchlist();
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sector, setSector] = useState("");
  const [indexTab, setIndexTab] = useState<IndexTab>("");
  const [capRange, setCapRange] = useState<CapRange>("");
  const [sortField, setSortField] = useState("marketCap");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<Set<string>>(DEFAULT_VISIBLE);
  const [showColPicker, setShowColPicker] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ScreenerParams = {
        sort: sortField,
        order: sortOrder,
      };
      if (indexTab) params.index = indexTab;
      if (sector) params.sector = sector;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const cap = CAP_RANGES.find(c => c.value === capRange);
      if (cap?.min != null) params.minCap = cap.min;
      if (cap?.max != null) params.maxCap = cap.max;
      const data = await fetchScreener(params);
      setStocks(data.stocks);
      setSectors(data.sectors);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load screener");
    } finally {
      setLoading(false);
    }
  }, [sortField, sortOrder, sector, debouncedSearch, indexTab, capRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeCols = useMemo(
    () => COLUMNS.filter(c => visibleCols.has(c.key)),
    [visibleCols]
  );

  const colGroups = useMemo(() => {
    const groups: Record<string, ColDef[]> = {};
    for (const c of COLUMNS) {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    }
    return groups;
  }, []);

  function toggleCol(key: string) {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSort(key: string) {
    if (key === "_change") return; // computed, can't sort server-side
    if (key === sortField) {
      setSortOrder(o => o === "desc" ? "asc" : "desc");
    } else {
      setSortField(key);
      setSortOrder("desc");
    }
  }

  function cellColor(key: string, val: unknown, row: ScreenerStock): string {
    if (key === "_change") {
      const cur = row.currentPrice, prev = row.previousClose;
      if (cur == null || prev == null) return INK;
      return cur >= prev ? GAIN : RED;
    }
    if (key === "ytdReturn") {
      if (val == null) return INK;
      return (val as number) >= 0 ? GAIN : RED;
    }
    if (key === "revenueGrowth" || key === "earningsGrowth") {
      if (val == null) return INK;
      return (val as number) >= 0 ? GAIN : RED;
    }
    return INK;
  }

  return (
    <WSJLayout navContent={
      <div className="flex items-center gap-4">
        <Link href="/" className="text-[11px] uppercase tracking-widest hover:underline"
              style={{ fontFamily: sans, color: T2 }}>Home</Link>
        <Link href="/heatmap" className="text-[11px] uppercase tracking-widest hover:underline"
              style={{ fontFamily: sans, color: T2 }}>Heatmap</Link>
        <Link href="/bubble" className="text-[11px] uppercase tracking-widest hover:underline"
              style={{ fontFamily: sans, color: T2 }}>Bubble Map</Link>
        <Link href="/watchlist" className="text-[11px] uppercase tracking-widest hover:underline"
              style={{ fontFamily: sans, color: T2 }}>Watchlist</Link>
        <Link href="/screener-v3" className="text-[11px] uppercase tracking-widest hover:underline"
              style={{ fontFamily: sans, color: T2 }}>Charts</Link>
      </div>
    }>
      <div className="mx-auto max-w-[1200px] px-6 py-6">
        {/* ── Header ── */}
        <h1 className="text-[28px] leading-tight mb-1"
            style={{ fontFamily: display, color: INK }}>
          Stock Screener
        </h1>
        <p className="text-[12px] mb-4" style={{ fontFamily: serif, color: T2 }}>
          {indexTab ? INDEX_TABS.find(t => t.value === indexTab)?.desc : "All indices"}{" "}
          · {stocks.length}{total ? ` of ${total}` : ""} stocks
          · sorted by {sortField} {sortOrder === "desc" ? "↓" : "↑"}
          {sector && ` · ${sector}`}
          {capRange && ` · ${CAP_RANGES.find(c => c.value === capRange)?.label}`}
        </p>
        <HeavyRule />

        {/* ── Index tabs ── */}
        <div className="flex items-center gap-0 mt-3 mb-2" style={{ borderBottom: `1px solid ${GRY}` }}>
          {INDEX_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setIndexTab(tab.value)}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors -mb-px"
              style={{
                fontFamily: sans,
                color: indexTab === tab.value ? INK : TM,
                borderBottom: indexTab === tab.value ? `2px solid ${INK}` : "2px solid transparent",
                background: "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Filters row ── */}
        <div className="flex flex-wrap items-center gap-2.5 py-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none"
                 stroke={TM} strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search ticker or name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-[11px] border rounded-sm w-48"
              style={{ fontFamily: mono, borderColor: GRY, background: WHT, color: INK }}
            />
          </div>

          {/* Sector filter */}
          <select
            value={sector}
            onChange={e => setSector(e.target.value)}
            className="px-2 py-1.5 text-[11px] border rounded-sm"
            aria-label="Filter by sector"
            style={{ fontFamily: sans, borderColor: GRY, background: WHT, color: INK }}
          >
            <option value="">All Sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Market cap filter */}
          <select
            value={capRange}
            onChange={e => setCapRange(e.target.value as CapRange)}
            className="px-2 py-1.5 text-[11px] border rounded-sm"
            aria-label="Filter by market cap"
            style={{ fontFamily: sans, borderColor: GRY, background: WHT, color: INK }}
          >
            {CAP_RANGES.map(c => (
              <option key={c.value} value={c.value}>{c.value ? c.label : "All Market Cap"}</option>
            ))}
          </select>

          {/* Column picker toggle */}
          <button
            onClick={() => setShowColPicker(p => !p)}
            className="px-3 py-1.5 text-[10px] uppercase tracking-widest border rounded-sm"
            style={{ fontFamily: sans, borderColor: GRY, background: showColPicker ? INK : WHT,
                     color: showColPicker ? WHT : T2 }}
          >
            Columns
          </button>

          {/* Clear filters */}
          {(sector || capRange || search) && (
            <button
              onClick={() => { setSector(""); setCapRange(""); setSearch(""); }}
              className="px-2.5 py-1.5 text-[10px] uppercase tracking-widest hover:underline"
              style={{ fontFamily: sans, color: RED }}
            >
              Clear filters
            </button>
          )}

          <span className="text-[10px] ml-auto tabular-nums" style={{ fontFamily: mono, color: TM }}>
            {stocks.length} results
          </span>
        </div>

        {/* ── Column picker panel ── */}
        {showColPicker && (
          <div className="mb-4 p-3 border rounded-sm" style={{ background: WHT, borderColor: GRY }}>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {Object.entries(colGroups).map(([group, cols]) => (
                <div key={group}>
                  <div className="text-[9px] uppercase tracking-widest mb-1"
                       style={{ fontFamily: sans, color: TM }}>{group}</div>
                  {cols.map(c => (
                    <label key={c.key} className="flex items-center gap-1.5 text-[11px] cursor-pointer"
                           style={{ fontFamily: serif, color: T2 }}>
                      <input type="checkbox" checked={visibleCols.has(c.key)}
                             onChange={() => toggleCol(c.key)} className="accent-current" />
                      {c.short || c.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <Hair />

        {/* ── Table ── */}
        {loading ? (
          <div className="py-16 text-center text-[12px]" style={{ fontFamily: serif, color: TM }}>
            Loading screener data…
          </div>
        ) : error ? (
          <div className="py-16 text-center text-[12px]" style={{ fontFamily: serif, color: RED }}>
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse" style={{ fontFamily: mono }}>
              <thead>
                <tr>
                  {activeCols.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-2 py-2 cursor-pointer select-none whitespace-nowrap border-b"
                      style={{
                        textAlign: col.align || "right",
                        fontFamily: sans,
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: sortField === col.key ? INK : TM,
                        borderColor: GRY,
                        background: WHT,
                      }}
                    >
                      {col.short || col.label}
                      {sortField === col.key && (
                        <span className="ml-0.5">{sortOrder === "desc" ? "▼" : "▲"}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock, idx) => (
                  <tr
                    key={stock.symbol}
                    className="transition-colors"
                    style={{ background: idx % 2 === 0 ? "transparent" : WHT }}
                    onMouseEnter={e => (e.currentTarget.style.background = GRY + "44")}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : WHT)}
                  >
                    {activeCols.map(col => {
                      const val = col.key === "_change" ? null : (stock as unknown as Record<string, unknown>)[col.key];
                      const formatted = col.fmt ? col.fmt(val, stock) : String(val ?? "—");
                      const color = cellColor(col.key, val, stock);

                      if (col.key === "symbol") {
                        return (
                          <td key={col.key} className="px-2 py-1.5 whitespace-nowrap border-b"
                              style={{ textAlign: "left", borderColor: GRY + "66" }}>
                            <button
                              onClick={() => toggleWatchlist(stock.symbol)}
                              className="mr-1 transition-colors"
                              style={{ color: inWatchlist(stock.symbol) ? "#d4a017" : GRY, fontSize: 11 }}
                              title={inWatchlist(stock.symbol) ? "Remove from watchlist" : "Add to watchlist"}
                              aria-label={inWatchlist(stock.symbol) ? `Remove ${stock.symbol} from watchlist` : `Add ${stock.symbol} to watchlist`}
                            >
                              {inWatchlist(stock.symbol) ? "★" : "☆"}
                            </button>
                            <Link href={`/stocks/${stock.symbol}`}
                                  className="font-bold hover:underline"
                                  style={{ color: INK }}>
                              {formatted}
                            </Link>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.key}
                          className="px-2 py-1.5 whitespace-nowrap border-b"
                          style={{
                            textAlign: col.align || "right",
                            color,
                            borderColor: GRY + "66",
                          }}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <Hair />
          <p className="text-[10px] mt-2 text-center" style={{ fontFamily: serif, color: TM }}>
            Data from Yahoo Finance · Cached batch data · Updated periodically
          </p>
        </div>
      </div>
    </WSJLayout>
  );
}
