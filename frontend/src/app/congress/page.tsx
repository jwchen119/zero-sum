"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, BLU, RED, T2, TM,
  serif, mono, sans,
  Hair, HeavyRule, WSJSection,
  LINK, LOSS, GAIN,
} from "@/lib/wsj";
import { fetchCongressTrades, type CongressResponse, type CongressTrade, type CongressInsights } from "@/lib/api";

const PARTY_COLORS: Record<string, string> = { D: LINK, R: LOSS, I: TM };
const PARTY_LABELS: Record<string, string> = { D: "DEM", R: "REP", I: "IND" };
const PARTY_BGS: Record<string, string> = { D: "#e3f2fd", R: "#ffebee", I: "#f5f5f5" };

const AMOUNT_MID: Record<string, number> = {
  "$1,001 - $15,000": 8000, "$15,001 - $50,000": 32500,
  "$50,001 - $100,000": 75000, "$100,001 - $250,000": 175000,
  "$250,001 - $500,000": 375000, "$500,001 - $1,000,000": 750000,
  "$1,000,001 - $5,000,000": 3000000, "$5,000,001 - $25,000,000": 15000000,
  "$25,000,001 - $50,000,000": 37500000,
};
const BIG_AMOUNTS = new Set([
  "$100,001 - $250,000", "$250,001 - $500,000", "$500,001 - $1,000,000",
  "$1,000,001 - $5,000,000", "$5,000,001 - $25,000,000", "$25,000,001 - $50,000,000",
]);

type Period = "all" | "1y" | "6m" | "3m" | "1m";
const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "1y", label: "1 Year" },
  { key: "6m", label: "6 Months" },
  { key: "3m", label: "3 Months" },
  { key: "1m", label: "1 Month" },
];

function computeInsights(trades: CongressTrade[]): CongressInsights {
  const buys = trades.filter(t => t.type === "buy");
  const sells = trades.filter(t => t.type === "sell");

  const buyMap = new Map<string, { count: number; sample: CongressTrade; vol: number }>();
  for (const t of buys) {
    const e = buyMap.get(t.ticker);
    const v = AMOUNT_MID[t.amountRange] ?? 8000;
    if (e) { e.count++; e.vol += v; } else buyMap.set(t.ticker, { count: 1, sample: t, vol: v });
  }
  const mostBought = [...buyMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10)
    .map(([ticker, d]) => ({ ticker, trades: d.count, company: d.sample.company, sector: d.sample.sector, estimatedVolume: d.vol }));

  const sellMap = new Map<string, { count: number; sample: CongressTrade; vol: number }>();
  for (const t of sells) {
    const e = sellMap.get(t.ticker);
    const v = AMOUNT_MID[t.amountRange] ?? 8000;
    if (e) { e.count++; e.vol += v; } else sellMap.set(t.ticker, { count: 1, sample: t, vol: v });
  }
  const mostSold = [...sellMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10)
    .map(([ticker, d]) => ({ ticker, trades: d.count, company: d.sample.company, sector: d.sample.sector, estimatedVolume: d.vol }));

  const withPerf = trades.filter(t => t.excessReturn != null);
  const bestPerformers = [...withPerf].sort((a, b) => (b.excessReturn ?? 0) - (a.excessReturn ?? 0)).slice(0, 10);
  const worstPerformers = [...withPerf].sort((a, b) => (a.excessReturn ?? 0) - (b.excessReturn ?? 0)).slice(0, 10);

  const memMap = new Map<string, { name: string; party: string; chamber: string; trades: number; buys: number; sells: number; estimatedVolume: number }>();
  for (const t of trades) {
    let m = memMap.get(t.member);
    if (!m) { m = { name: t.member, party: t.party, chamber: t.chamber, trades: 0, buys: 0, sells: 0, estimatedVolume: 0 }; memMap.set(t.member, m); }
    m.trades++;
    if (t.type === "buy") m.buys++; else if (t.type === "sell") m.sells++;
    m.estimatedVolume += AMOUNT_MID[t.amountRange] ?? 8000;
  }
  const topMembers = [...memMap.values()].sort((a, b) => b.estimatedVolume - a.estimatedVolume).slice(0, 10);

  const secMap = new Map<string, { sector: string; buys: number; sells: number; total: number; estimatedVolume: number }>();
  for (const t of trades) {
    const s = t.sector || "Unknown";
    let e = secMap.get(s);
    if (!e) { e = { sector: s, buys: 0, sells: 0, total: 0, estimatedVolume: 0 }; secMap.set(s, e); }
    e.total++;
    if (t.type === "buy") e.buys++; else if (t.type === "sell") e.sells++;
    e.estimatedVolume += AMOUNT_MID[t.amountRange] ?? 8000;
  }
  const sectorBreakdown = [...secMap.values()].sort((a, b) => b.total - a.total);

  const bigTrades = trades.filter(t => BIG_AMOUNTS.has(t.amountRange));
  return { mostBought, mostSold, bestPerformers, worstPerformers, topMembers, sectorBreakdown, bigTrades };
}

function fmtVol(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function PerfBadge({ value }: { value: number | null }) {
  if (value == null) return <span style={{ color: TM }}>—</span>;
  const color = value >= 0 ? GAIN : LOSS;
  return (
    <span className="font-bold tabular-nums" style={{ color, fontFamily: mono, fontSize: 12 }}>
      {value >= 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function PartyDot({ party }: { party: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
      style={{ background: PARTY_COLORS[party] || TM }}
      title={PARTY_LABELS[party] || party}
    />
  );
}

type Tab = "insights" | "trades";

export default function CongressPage() {
  const [data, setData] = useState<CongressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("insights");

  // Filters (applied client-side for instant response)
  const [memberFilter, setMemberFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState<"" | "D" | "R" | "I">("");
  const [chamberFilter, setChamberFilter] = useState<"" | "House" | "Senate">("");
  const [tickerFilter, setTickerFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "buy" | "sell">("");
  const [period, setPeriod] = useState<Period>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchCongressTrades();
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const periodTrades = useMemo(() => {
    if (!data) return [];
    if (period === "all") return data.trades;
    const d = new Date();
    if (period === "1m") d.setMonth(d.getMonth() - 1);
    else if (period === "3m") d.setMonth(d.getMonth() - 3);
    else if (period === "6m") d.setMonth(d.getMonth() - 6);
    else if (period === "1y") d.setFullYear(d.getFullYear() - 1);
    const cutoff = d.toISOString().slice(0, 10);
    return data.trades.filter(t => t.tradeDate >= cutoff);
  }, [data, period]);

  const periodIns = useMemo(() => computeInsights(periodTrades), [periodTrades]);

  const periodSummary = useMemo(() => {
    const b = periodTrades.filter(t => t.type === "buy").length;
    const s = periodTrades.filter(t => t.type === "sell").length;
    const uniq = new Set(periodTrades.map(t => t.ticker)).size;
    const dT = periodTrades.filter(t => t.party === "D");
    const rT = periodTrades.filter(t => t.party === "R");
    return {
      total: periodTrades.length, buys: b, sells: s, uniqueTickers: uniq,
      partyBreakdown: {
        D: { total: dT.length, buys: dT.filter(t => t.type === "buy").length, sells: dT.filter(t => t.type === "sell").length },
        R: { total: rT.length, buys: rT.filter(t => t.type === "buy").length, sells: rT.filter(t => t.type === "sell").length },
      },
    };
  }, [periodTrades]);

  const monthlyActivity = useMemo(() => {
    const months = new Map<string, { buys: number; sells: number }>();
    for (const t of periodTrades) {
      const m = t.tradeDate.slice(0, 7);
      if (!m || m.length < 7) continue;
      let e = months.get(m);
      if (!e) { e = { buys: 0, sells: 0 }; months.set(m, e); }
      if (t.type === "buy") e.buys++; else if (t.type === "sell") e.sells++;
    }
    return [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  }, [periodTrades]);

  const filtered = useMemo(() => {
    let trades = periodTrades;
    if (memberFilter) trades = trades.filter(t => t.member.toLowerCase().includes(memberFilter.toLowerCase()));
    if (partyFilter) trades = trades.filter(t => t.party === partyFilter);
    if (chamberFilter) trades = trades.filter(t => t.chamber === chamberFilter);
    if (tickerFilter) trades = trades.filter(t => t.ticker.includes(tickerFilter.toUpperCase()));
    if (typeFilter) trades = trades.filter(t => t.type === typeFilter);
    return trades;
  }, [periodTrades, memberFilter, partyFilter, chamberFilter, tickerFilter, typeFilter]);

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Home</Link>
      <Link href="/insiders" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Insider Trading</Link>
    </div>
  );

  const ins = periodIns;

  return (
    <WSJLayout navContent={navContent}>
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: serif, color: INK }}>
          Congress Trading Tracker
        </h1>
        <p className="mt-1 text-sm" style={{ color: T2, fontFamily: mono }}>
          Stock trades by U.S. Congress members — disclosed under the STOCK Act
        </p>
        <HeavyRule />

        {loading && <p className="py-8 text-center text-sm" style={{ color: TM, fontFamily: mono }}>Loading congress trading data…</p>}
        {error && <p className="py-4 text-sm" style={{ color: RED, fontFamily: mono }}>{error}</p>}

        {data && !loading && (
          <>
            {/* ─── Summary Cards ─── */}
            <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Trades", value: periodSummary.total, color: INK },
                { label: "Unique Tickers", value: periodSummary.uniqueTickers, color: INK },
                { label: "Buys", value: periodSummary.buys, color: GAIN },
                { label: "Sells", value: periodSummary.sells, color: LOSS },
              ].map((c) => (
                <div key={c.label} className="border p-3" style={{ borderColor: GRY, background: WHT }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: mono, color: TM }}>{c.label}</div>
                  <div className="mt-1 text-xl font-bold" style={{ fontFamily: mono, color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* ─── Party Breakdown ─── */}
            <div className="my-4 grid grid-cols-2 gap-3">
              {(["D", "R"] as const).map((p) => {
                const pb = periodSummary.partyBreakdown[p];
                return (
                  <div key={p} className="border p-3" style={{ borderColor: GRY, background: WHT }}>
                    <div className="flex items-center gap-2 mb-2">
                      <PartyDot party={p} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: mono, color: INK }}>
                        {p === "D" ? "Democrats" : "Republicans"} — {pb.total} trades
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs" style={{ fontFamily: mono }}>
                      <span style={{ color: GAIN }}>{pb.buys} buys</span>
                      <span style={{ color: LOSS }}>{pb.sells} sells</span>
                    </div>
                    {pb.total > 0 && (
                      <div className="mt-2 flex h-3 overflow-hidden" style={{ borderRadius: 2 }}>
                        <div style={{ width: `${(pb.buys / pb.total) * 100}%`, background: GAIN }} />
                        <div style={{ width: `${(pb.sells / pb.total) * 100}%`, background: LOSS }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── Period Toggle ─── */}
            <div className="my-4 flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider mr-2" style={{ fontFamily: sans, color: TM }}>Period</span>
              {PERIODS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className="border px-3 py-1.5 text-[11px] font-bold"
                  style={{
                    fontFamily: mono,
                    background: period === key ? INK : WHT,
                    color: period === key ? WHT : T2,
                    borderColor: GRY,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ─── Tab Selector ─── */}
            <div className="flex gap-0 border-b" style={{ borderColor: GRY }}>
              {([["insights", "Actionable Insights"], ["trades", "All Trades"]] as [Tab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider -mb-px border-b-2"
                  style={{
                    fontFamily: sans,
                    color: tab === key ? INK : TM,
                    borderBottomColor: tab === key ? INK : "transparent",
                    background: "transparent",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ─── INSIGHTS TAB ─── */}
            {tab === "insights" && ins && (
              <div className="mt-4 space-y-5">

                {/* ── Visual Overview Dashboard ── */}
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Buy/Sell Sentiment Gauge */}
                  <div className="border p-4 flex flex-col items-center justify-center" style={{ borderColor: GRY, background: WHT }}>
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-3" style={{ fontFamily: sans, color: TM }}>Buy / Sell Sentiment</div>
                    {(() => {
                      const pct = periodSummary.total > 0 ? periodSummary.buys / periodSummary.total * 100 : 50;
                      const deg = pct * 3.6;
                      return (
                        <div style={{ position: "relative", width: 110, height: 110, borderRadius: "50%",
                          background: `conic-gradient(${GAIN} 0deg ${deg}deg, ${LOSS} ${deg}deg 360deg)` }}>
                          <div className="flex items-center justify-center" style={{ position: "absolute", inset: 22, borderRadius: "50%", background: WHT }}>
                            <div className="text-center">
                              <div className="text-xl font-bold" style={{ fontFamily: mono, color: pct >= 50 ? GAIN : LOSS }}>{pct.toFixed(0)}%</div>
                              <div className="text-[8px] font-bold uppercase" style={{ fontFamily: sans, color: TM }}>Buy Rate</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex gap-4 mt-3 text-[10px] font-bold" style={{ fontFamily: mono }}>
                      <span style={{ color: GAIN }}>{"\u25CF"} {periodSummary.buys} buys</span>
                      <span style={{ color: LOSS }}>{"\u25CF"} {periodSummary.sells} sells</span>
                    </div>
                  </div>

                  {/* Monthly Activity Timeline */}
                  <div className="border p-4 md:col-span-2" style={{ borderColor: GRY, background: WHT }}>
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-3" style={{ fontFamily: sans, color: TM }}>Monthly Trading Activity</div>
                    {monthlyActivity.length > 0 ? (() => {
                      const maxM = Math.max(...monthlyActivity.map(([, d]) => d.buys + d.sells), 1);
                      return (
                        <div className="flex items-end gap-[3px]" style={{ height: 100 }}>
                          {monthlyActivity.map(([month, d]) => {
                            const bH = d.buys / maxM * 80;
                            const sH = d.sells / maxM * 80;
                            return (
                              <div key={month} className="flex-1 flex flex-col items-center min-w-0">
                                <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                                  <div style={{ height: sH, background: LOSS, borderRadius: "2px 2px 0 0", minHeight: d.sells > 0 ? 2 : 0 }} />
                                  <div style={{ height: bH, background: GAIN, minHeight: d.buys > 0 ? 2 : 0 }} />
                                </div>
                                <div className="text-[7px] mt-1 whitespace-nowrap" style={{ color: TM, fontFamily: mono }}>{month.slice(5)}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })() : <p className="text-[10px]" style={{ color: TM, fontFamily: mono }}>No monthly data</p>}
                    <div className="flex gap-3 mt-2 text-[8px]" style={{ fontFamily: mono, color: TM }}>
                      <span><span className="font-bold" style={{ color: GAIN }}>{"\u25A0"}</span> Buys</span>
                      <span><span className="font-bold" style={{ color: LOSS }}>{"\u25A0"}</span> Sells</span>
                    </div>
                  </div>
                </div>

                {/* Most Bought & Most Sold side by side */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Most Bought */}
                  <div>
                    <WSJSection title="Most Bought Stocks" />
                    <div className="border" style={{ borderColor: GRY, background: WHT }}>
                      <table className="w-full" style={{ fontFamily: mono, fontSize: 11, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${INK}` }}>
                            <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Ticker</th>
                            <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Buys</th>
                            <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Est. Volume</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ins.mostBought.map((t, i) => {
                            const barW = ins.mostBought[0]?.trades ? (t.trades / ins.mostBought[0].trades * 100) : 0;
                            return (
                            <tr key={t.ticker} style={{ borderBottom: `1px solid ${GRY}`, background: `linear-gradient(to right, rgba(76,175,80,${(0.18 - i * 0.014).toFixed(3)}) ${barW}%, transparent ${barW}%)` }}>
                              <td className="p-2">
                                <Link href={`/stocks/${t.ticker}`} className="font-bold hover:underline" style={{ color: INK }}>{t.ticker}</Link>
                                {t.company && <div className="text-[9px]" style={{ color: TM }}>{t.company.slice(0, 25)}</div>}
                              </td>
                              <td className="p-2 text-right font-bold" style={{ color: GAIN }}>{t.trades}</td>
                              <td className="p-2 text-right" style={{ color: T2 }}>{fmtVol(t.estimatedVolume)}</td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Most Sold */}
                  <div>
                    <WSJSection title="Most Sold Stocks" />
                    <div className="border" style={{ borderColor: GRY, background: WHT }}>
                      <table className="w-full" style={{ fontFamily: mono, fontSize: 11, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${INK}` }}>
                            <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Ticker</th>
                            <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Sells</th>
                            <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Est. Volume</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ins.mostSold.map((t, i) => {
                            const barW = ins.mostSold[0]?.trades ? (t.trades / ins.mostSold[0].trades * 100) : 0;
                            return (
                            <tr key={t.ticker} style={{ borderBottom: `1px solid ${GRY}`, background: `linear-gradient(to right, rgba(244,67,54,${(0.18 - i * 0.014).toFixed(3)}) ${barW}%, transparent ${barW}%)` }}>
                              <td className="p-2">
                                <Link href={`/stocks/${t.ticker}`} className="font-bold hover:underline" style={{ color: INK }}>{t.ticker}</Link>
                                {t.company && <div className="text-[9px]" style={{ color: TM }}>{t.company.slice(0, 25)}</div>}
                              </td>
                              <td className="p-2 text-right font-bold" style={{ color: LOSS }}>{t.trades}</td>
                              <td className="p-2 text-right" style={{ color: T2 }}>{fmtVol(t.estimatedVolume)}</td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Best & Worst Performers */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Best Performers */}
                  <div>
                    <WSJSection title="Best Performing Trades" />
                    <p className="text-[9px] -mt-1 mb-2" style={{ color: TM, fontFamily: sans }}>
                      Excess return vs S&P 500 since trade date
                    </p>
                    <div className="border" style={{ borderColor: GRY, background: WHT }}>
                      <table className="w-full" style={{ fontFamily: mono, fontSize: 11, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${INK}` }}>
                            <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Ticker</th>
                            <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Member</th>
                            <th className="p-2 text-center text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Type</th>
                            <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Excess</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ins.bestPerformers.map((t, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${GRY}` }}>
                              <td className="p-2">
                                <Link href={`/stocks/${t.ticker}`} className="font-bold hover:underline" style={{ color: INK }}>{t.ticker}</Link>
                              </td>
                              <td className="p-2" style={{ color: T2 }}>
                                <div>{t.member.split(" ").slice(0, 2).join(" ")}</div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <PartyDot party={t.party} />
                                  <span className="text-[9px]" style={{ color: TM }}>{t.chamber}</span>
                                </div>
                              </td>
                              <td className="p-2 text-center font-bold text-[10px]" style={{ color: t.type === "buy" ? GAIN : LOSS }}>
                                {t.type.toUpperCase()}
                              </td>
                              <td className="p-2 text-right"><PerfBadge value={t.excessReturn} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Worst Performers */}
                  <div>
                    <WSJSection title="Worst Performing Trades" />
                    <p className="text-[9px] -mt-1 mb-2" style={{ color: TM, fontFamily: sans }}>
                      Excess return vs S&P 500 since trade date
                    </p>
                    <div className="border" style={{ borderColor: GRY, background: WHT }}>
                      <table className="w-full" style={{ fontFamily: mono, fontSize: 11, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${INK}` }}>
                            <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Ticker</th>
                            <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Member</th>
                            <th className="p-2 text-center text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Type</th>
                            <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Excess</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ins.worstPerformers.map((t, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${GRY}` }}>
                              <td className="p-2">
                                <Link href={`/stocks/${t.ticker}`} className="font-bold hover:underline" style={{ color: INK }}>{t.ticker}</Link>
                              </td>
                              <td className="p-2" style={{ color: T2 }}>
                                <div>{t.member.split(" ").slice(0, 2).join(" ")}</div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <PartyDot party={t.party} />
                                  <span className="text-[9px]" style={{ color: TM }}>{t.chamber}</span>
                                </div>
                              </td>
                              <td className="p-2 text-center font-bold text-[10px]" style={{ color: t.type === "buy" ? GAIN : LOSS }}>
                                {t.type.toUpperCase()}
                              </td>
                              <td className="p-2 text-right"><PerfBadge value={t.excessReturn} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Most Active Members */}
                <div>
                  <WSJSection title="Most Active Members" />
                  <p className="text-[9px] -mt-1 mb-2" style={{ color: TM, fontFamily: sans }}>
                    Ranked by estimated trade volume (midpoint of disclosed range)
                  </p>
                  <div className="border overflow-x-auto" style={{ borderColor: GRY, background: WHT }}>
                    <table className="w-full" style={{ fontFamily: mono, fontSize: 11, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${INK}` }}>
                          <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Member</th>
                          <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Trades</th>
                          <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Buys</th>
                          <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Sells</th>
                          <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Est. Volume</th>
                          <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Bias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ins.topMembers.map((m) => {
                          const bias = m.trades > 0 ? m.buys / m.trades : 0.5;
                          return (
                            <tr key={m.name} style={{ borderBottom: `1px solid ${GRY}` }}>
                              <td className="p-2">
                                <span className="font-bold" style={{ color: INK }}>{m.name}</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <PartyDot party={m.party} />
                                  <span className="text-[9px]" style={{ color: TM }}>{PARTY_LABELS[m.party] || m.party} · {m.chamber}</span>
                                </div>
                              </td>
                              <td className="p-2 text-right font-bold" style={{ color: INK }}>{m.trades}</td>
                              <td className="p-2 text-right" style={{ color: GAIN }}>{m.buys}</td>
                              <td className="p-2 text-right" style={{ color: LOSS }}>{m.sells}</td>
                              <td className="p-2 text-right font-bold" style={{ color: INK }}>{fmtVol(m.estimatedVolume)}</td>
                              <td className="p-2 w-24">
                                <div className="flex h-2.5 overflow-hidden rounded-sm" style={{ background: GRY }}>
                                  <div style={{ width: `${bias * 100}%`, background: GAIN }} />
                                  <div style={{ width: `${(1 - bias) * 100}%`, background: LOSS }} />
                                </div>
                                <div className="flex justify-between text-[8px] mt-0.5" style={{ color: TM }}>
                                  <span>B</span><span>S</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sector Breakdown */}
                <div>
                  <WSJSection title="Sector Breakdown" />
                  {/* Sector Treemap */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {ins.sectorBreakdown.slice(0, 10).map((s) => {
                      const totalAll = ins.sectorBreakdown.reduce((a, x) => a + x.total, 0) || 1;
                      const pct = s.total / totalAll * 100;
                      const buyR = s.total > 0 ? s.buys / s.total : 0.5;
                      const bg = buyR > 0.55 ? GAIN : buyR < 0.45 ? LOSS : TM;
                      return (
                        <div key={s.sector} className="rounded-sm p-2 flex items-center justify-center text-center"
                          style={{ flex: `${Math.max(pct, 6)} 0 0`, minWidth: 70, minHeight: 56, background: bg, opacity: 0.85 }}>
                          <div>
                            <div className="text-[9px] font-bold text-white leading-tight" style={{ fontFamily: sans }}>{s.sector}</div>
                            <div className="text-[10px] font-bold text-white/90" style={{ fontFamily: mono }}>{s.total}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border" style={{ borderColor: GRY, background: WHT }}>
                    <table className="w-full" style={{ fontFamily: mono, fontSize: 11, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${INK}` }}>
                          <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Sector</th>
                          <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Total</th>
                          <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Buys</th>
                          <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Sells</th>
                          <th className="p-2 text-right text-[9px] font-bold uppercase hidden sm:table-cell" style={{ color: TM, fontFamily: sans }}>Est. Volume</th>
                          <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Buy/Sell</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ins.sectorBreakdown.map((s) => {
                          const ratio = s.total > 0 ? s.buys / s.total : 0.5;
                          return (
                            <tr key={s.sector} style={{ borderBottom: `1px solid ${GRY}` }}>
                              <td className="p-2 font-bold" style={{ color: INK }}>{s.sector}</td>
                              <td className="p-2 text-right" style={{ color: T2 }}>{s.total}</td>
                              <td className="p-2 text-right" style={{ color: GAIN }}>{s.buys}</td>
                              <td className="p-2 text-right" style={{ color: LOSS }}>{s.sells}</td>
                              <td className="p-2 text-right hidden sm:table-cell" style={{ color: T2 }}>{fmtVol(s.estimatedVolume)}</td>
                              <td className="p-2 w-20">
                                <div className="flex h-2 overflow-hidden rounded-sm" style={{ background: GRY }}>
                                  <div style={{ width: `${ratio * 100}%`, background: GAIN }} />
                                  <div style={{ width: `${(1 - ratio) * 100}%`, background: LOSS }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Big Trades */}
                {ins.bigTrades.length > 0 && (
                  <div>
                    <WSJSection title={`Big Trades ($100K+) — ${ins.bigTrades.length} trades`} />
                    <div className="border overflow-x-auto" style={{ borderColor: GRY, background: WHT }}>
                      <table className="w-full" style={{ fontFamily: mono, fontSize: 11, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${INK}` }}>
                            <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Date</th>
                            <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Member</th>
                            <th className="p-2 text-left text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Ticker</th>
                            <th className="p-2 text-center text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Type</th>
                            <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>Amount</th>
                            <th className="p-2 text-right text-[9px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>vs SPY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ins.bigTrades.map((t, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${GRY}` }}>
                              <td className="p-2 whitespace-nowrap" style={{ color: T2 }}>{t.tradeDate}</td>
                              <td className="p-2">
                                <span className="font-bold" style={{ color: INK }}>{t.member}</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <PartyDot party={t.party} />
                                  <span className="text-[9px]" style={{ color: TM }}>{t.chamber}</span>
                                </div>
                              </td>
                              <td className="p-2">
                                <Link href={`/stocks/${t.ticker}`} className="font-bold hover:underline" style={{ color: INK }}>{t.ticker}</Link>
                                {t.company && <div className="text-[9px]" style={{ color: TM }}>{t.company.slice(0, 22)}</div>}
                              </td>
                              <td className="p-2 text-center font-bold text-[10px]" style={{ color: t.type === "buy" ? GAIN : LOSS }}>
                                {t.type.toUpperCase()}
                              </td>
                              <td className="p-2 text-right whitespace-nowrap" style={{ color: INK }}>{t.amountRange}</td>
                              <td className="p-2 text-right"><PerfBadge value={t.excessReturn} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── TRADES TAB ─── */}
            {tab === "trades" && (
              <div className="mt-4">
                {/* Filters */}
                <div className="my-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ fontFamily: sans, color: INK }}>Member</label>
                    <input
                      value={memberFilter}
                      onChange={(e) => setMemberFilter(e.target.value)}
                      placeholder="Search…"
                      className="w-36 border px-2 py-2 text-sm"
                      style={{ borderColor: GRY, background: WHT, fontFamily: mono }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ fontFamily: sans, color: INK }}>Ticker</label>
                    <input
                      value={tickerFilter}
                      onChange={(e) => setTickerFilter(e.target.value)}
                      placeholder="All"
                      className="w-24 border px-2 py-2 text-sm uppercase"
                      style={{ borderColor: GRY, background: WHT, fontFamily: mono }}
                    />
                  </div>

                  <div className="flex gap-1">
                    {(["", "D", "R", "I"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPartyFilter(p)}
                        className="border px-3 py-2 text-xs font-bold"
                        style={{
                          fontFamily: mono,
                          background: partyFilter === p ? INK : WHT,
                          color: partyFilter === p ? WHT : (PARTY_COLORS[p] || T2),
                          borderColor: GRY,
                        }}
                      >
                        {p === "" ? "All" : PARTY_LABELS[p] || p}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1">
                    {(["", "House", "Senate"] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setChamberFilter(c)}
                        className="border px-3 py-2 text-xs font-bold"
                        style={{
                          fontFamily: mono,
                          background: chamberFilter === c ? INK : WHT,
                          color: chamberFilter === c ? WHT : T2,
                          borderColor: GRY,
                        }}
                      >
                        {c || "Both"}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1">
                    {(["", "buy", "sell"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className="border px-3 py-2 text-xs font-bold"
                        style={{
                          fontFamily: mono,
                          background: typeFilter === t ? INK : WHT,
                          color: typeFilter === t ? WHT : T2,
                          borderColor: GRY,
                        }}
                      >
                        {t === "" ? "All" : t === "buy" ? "Buy" : "Sell"}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] mb-2" style={{ fontFamily: mono, color: TM }}>
                  {filtered.length} trades match filters
                </p>

                {/* Trades Table */}
                <div className="my-2 overflow-x-auto">
                  <table className="w-full" style={{ fontFamily: mono, fontSize: 12, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${INK}` }}>
                        {["Trade Date", "Member", "Party", "Ticker", "Type", "Amount Range", "vs SPY"].map((h) => (
                          <th key={h} className="p-2 text-left text-[10px] font-bold uppercase" style={{ color: TM, fontFamily: sans }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 200).map((tx, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${GRY}` }}>
                          <td className="p-2 whitespace-nowrap" style={{ color: T2 }}>{tx.tradeDate}</td>
                          <td className="p-2 font-bold" style={{ color: INK }}>
                            {tx.member}
                            <div className="text-[9px] font-normal" style={{ color: TM }}>
                              {tx.chamber}{tx.state ? ` — ${tx.state}` : ""}
                            </div>
                          </td>
                          <td className="p-2">
                            <span
                              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{
                                background: PARTY_BGS[tx.party] || "#f5f5f5",
                                color: PARTY_COLORS[tx.party] || TM,
                              }}
                            >
                              {PARTY_LABELS[tx.party] || tx.party}
                            </span>
                          </td>
                          <td className="p-2 font-bold">
                            <Link href={`/stocks/${tx.ticker}`} className="hover:underline" style={{ color: INK }}>
                              {tx.ticker}
                            </Link>
                            {tx.company && (
                              <div className="text-[9px] font-normal" style={{ color: TM }}>
                                {tx.company.length > 20 ? tx.company.slice(0, 20) + "…" : tx.company}
                              </div>
                            )}
                          </td>
                          <td className="p-2 font-bold" style={{
                            color: tx.type === "buy" ? GAIN : LOSS,
                          }}>
                            {tx.type.toUpperCase()}
                          </td>
                          <td className="p-2 text-xs" style={{ color: INK }}>
                            {tx.amountRange}
                          </td>
                          <td className="p-2 text-right"><PerfBadge value={tx.excessReturn} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filtered.length > 200 && (
                  <p className="text-[10px] text-center mt-2" style={{ fontFamily: mono, color: TM }}>
                    Showing 200 of {filtered.length} trades. Use filters to narrow results.
                  </p>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="my-6 border p-4 text-center" style={{ borderColor: GRY, background: "#fff8e1" }}>
              <p className="text-[10px]" style={{ fontFamily: mono, color: "#f57f17" }}>
                ⚠ {data.disclaimer}
              </p>
            </div>
          </>
        )}
      </div>
    </WSJLayout>
  );
}
