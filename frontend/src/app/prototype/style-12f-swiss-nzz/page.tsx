"use client";

import Link from "next/link";
import {
  STOCK, COMPANY_DESCRIPTION, SEGMENTS, AI_ANALYSIS, BULL_CASE, BEAR_CASE,
  ANALYSTS, ANALYST_CONSENSUS, ANALYST_COMMENTARY, EARNINGS,
  INCOME_STATEMENT, BALANCE_SHEET, CASH_FLOW, KEY_RISKS, CATALYSTS,
  COMPETITORS, WATCHLIST, NEWS, VALUATION_RATIOS, SECTOR_PERFORMANCE,
  DIVIDEND_HISTORY, TOP_HOLDERS, ESG, TECHNICALS, fmt, pct, usd,
} from "@/lib/mockData";

/* ══════════════════════════════════════════════════════════════
   Style 12-F — Swiss / NZZ International Typographic
   Inspired by Neue Zürcher Zeitung & Swiss Style.
   Helvetica grid perfection, red + black only, mathematical
   precision, strong whitespace, zero ornament.
   ══════════════════════════════════════════════════════════════ */

const WHT = "#ffffff";
const BG  = "#f8f8f8";
const INK = "#000000";
const RED = "#ff0000";     // Swiss red — the only accent
const GRY = "#e0e0e0";
const GR2 = "#f0f0f0";
const T2  = "#444444";
const TM  = "#999999";
const GRN = "#1a5c2a";

const sans  = "'Inter', 'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif";
const mono  = "'IBM Plex Mono', 'SF Mono', monospace";

const nClr = (n: number) => (n >= 0 ? INK : RED);

/* ── Thick red rule ── */
function RedRule() { return <div className="h-1 my-6" style={{ background: RED }} />; }
function ThinRule() { return <div className="h-px my-3" style={{ background: GRY }} />; }

/* ── Section — numbered, flush-left ── */
let sectionCount = 0;
function SwissSection({ title }: { title: string }) {
  sectionCount++;
  return (
    <div className="mt-12 mb-4">
      <div className="h-1" style={{ background: RED }} />
      <div className="flex items-baseline gap-3 pt-3">
        <span className="text-4xl font-extralight tabular-nums leading-none" style={{ fontFamily: sans, color: RED }}>{String(sectionCount).padStart(2, "0")}</span>
        <h2 className="text-lg font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: INK }}>{title}</h2>
      </div>
    </div>
  );
}

/* ── Card — clean white, no border, just background ── */
function SwissCard({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-5 ${className}`} style={{ background: WHT }}>
      {title && (
        <>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-1" style={{ fontFamily: sans, color: RED }}>{title}</h3>
          <div className="h-px mb-3" style={{ background: INK }} />
        </>
      )}
      {children}
    </div>
  );
}

/* ── Range ── */
function SwissRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1" style={{ fontFamily: sans, color: TM }}>{label}</div>
      <div className="relative h-0.5" style={{ background: GRY }}>
        <div className="absolute h-full" style={{ width: `${p}%`, background: RED }} />
        <div className="absolute top-[-3px] w-2 h-2 rounded-full" style={{ left: `calc(${p}% - 4px)`, background: RED }} />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums mt-1" style={{ fontFamily: mono, color: TM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function SwissNZZPrototype() {
  sectionCount = 0; // reset on each render
  return (
    <div className="min-h-screen" style={{ background: BG, color: INK, fontFamily: sans }}>

      {/* ── MASTHEAD — clean, precise ── */}
      <header style={{ background: WHT }}>
        <div className="mx-auto max-w-[1100px] px-8">
          <div className="h-1" style={{ background: RED }} />
          <div className="flex items-center justify-between py-2">
            <Link href="/prototype" className="text-[11px] font-bold hover:underline" style={{ color: RED }}>← Index</Link>
            <span className="text-[11px] tabular-nums" style={{ fontFamily: mono, color: TM }}>2026-03-03</span>
          </div>
          <div className="py-6">
            <Link href="/prototype" className="hover:opacity-80 transition-opacity">
              <h1 className="text-5xl font-extralight tracking-[0.08em] uppercase" style={{ color: INK }}>Zero Sum</h1>
            </Link>
            <p className="text-[11px] uppercase tracking-[0.3em] mt-2" style={{ color: TM }}>Financial Intelligence · Zurich · New York · Tokyo</p>
          </div>
          <div className="h-px" style={{ background: INK }} />
          <div className="flex gap-8 py-2">
            {["Markets", "Companies", "Analysis", "Data", "Opinion"].map((n) => (
              <span key={n} className="text-[11px] font-bold uppercase tracking-[0.15em] cursor-pointer hover:text-red-600" style={{ color: T2 }}>{n}</span>
            ))}
          </div>
          <div className="h-px" style={{ background: GRY }} />
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-8 py-6">

        {/* ── PRICE HERO ── */}
        <div className="py-8" style={{ background: WHT }}>
          <div className="px-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-5xl font-extralight tracking-wider">{STOCK.ticker}</span>
                <span className="h-3 w-px" style={{ background: GRY }} />
                <span className="text-[11px] uppercase tracking-[0.15em]" style={{ color: TM }}>{STOCK.exchange}</span>
              </div>
              <p className="text-[15px]" style={{ color: T2 }}>{STOCK.name} — {STOCK.sector}</p>
            </div>
            <div className="flex items-end gap-6">
              <span className="text-6xl font-extralight tabular-nums" style={{ fontFamily: mono }}>{usd(STOCK.price)}</span>
              <div className="flex flex-col items-end pb-2">
                <span className="text-xl font-bold tabular-nums" style={{ fontFamily: mono, color: nClr(STOCK.change) }}>
                  {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                </span>
                <span className="text-sm tabular-nums" style={{ fontFamily: mono, color: nClr(STOCK.changePct) }}>({pct(STOCK.changePct)})</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-px mt-px" style={{ background: GRY }}>
          {[
            { l: "Mkt Cap", v: fmt(STOCK.marketCap) },
            { l: "P/E", v: STOCK.pe.toFixed(1) },
            { l: "EPS", v: usd(STOCK.eps) },
            { l: "Beta", v: STOCK.beta.toFixed(2) },
            { l: "Yield", v: `${STOCK.dividendYield.toFixed(2)}%` },
            { l: "52W Hi", v: usd(STOCK.week52High) },
            { l: "52W Lo", v: usd(STOCK.week52Low) },
            { l: "Vol", v: fmt(STOCK.volume) },
          ].map((s) => (
            <div key={s.l} className="text-center py-3 px-1" style={{ background: WHT }}>
              <div className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: TM }}>{s.l}</div>
              <div className="text-sm font-bold tabular-nums mt-0.5" style={{ fontFamily: mono }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── Chart ── */}
        <SwissSection title="Price History" />
        <SwissCard>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: TM }}>Daily Close</span>
            <div className="flex gap-1">
              {["1D", "5D", "1M", "3M", "1Y", "5Y"].map((p) => (
                <button key={p} className="text-[11px] font-bold px-2 py-0.5" style={{ background: p === "1Y" ? RED : "transparent", color: p === "1Y" ? WHT : TM }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-56" style={{ background: WHT }}>
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 160">
              {/* Grid */}
              {[0, 40, 80, 120, 160].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={GRY} strokeWidth="0.5" />
              ))}
              {[0, 80, 160, 240, 320, 400].map((x) => (
                <line key={x} x1={x} y1="0" x2={x} y2="160" stroke={GRY} strokeWidth="0.5" />
              ))}
              <polyline points="0,140 25,135 50,138 75,122 100,128 125,112 150,118 175,100 200,106 225,88 250,95 275,78 300,84 325,68 350,72 375,60 400,52" fill="none" stroke={RED} strokeWidth="2" />
            </svg>
          </div>
        </SwissCard>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px mt-6" style={{ background: GRY }}>

          {/* LEFT */}
          <div style={{ background: BG }}>
            <SwissSection title="Company Profile" />
            <div className="px-5 pb-6" style={{ background: WHT }}>
              <p className="text-[14.5px] leading-[1.8]" style={{ color: T2 }}>{COMPANY_DESCRIPTION}</p>
              <ThinRule />
              <div className="grid grid-cols-3 gap-y-3 gap-x-4 mt-3">
                {[
                  { l: "CEO", v: STOCK.ceo },
                  { l: "HQ", v: STOCK.headquarters },
                  { l: "Employees", v: STOCK.employees.toLocaleString() },
                  { l: "Founded", v: STOCK.founded },
                  { l: "IPO", v: STOCK.ipoDate },
                  { l: "FY End", v: STOCK.fiscalYearEnd },
                ].map((item) => (
                  <div key={item.l}>
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: TM }}>{item.l}</div>
                    <div className="text-sm font-bold" style={{ fontFamily: mono }}>{item.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <SwissSection title="Analysis" />
            <div className="px-5 pb-6" style={{ background: WHT }}>
              <p className="text-[14.5px] leading-[1.8]" style={{ color: T2 }}>{AI_ANALYSIS.summary}</p>
              <div className="h-0.5 my-4" style={{ background: RED }} />
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: RED }}>Outlook</h4>
              <p className="text-[14.5px] leading-[1.8]" style={{ color: T2 }}>{AI_ANALYSIS.outlook}</p>
            </div>

            <SwissSection title={BULL_CASE.title} />
            <div className="px-5 pb-6" style={{ background: WHT }}>
              <p className="text-sm leading-relaxed mb-3" style={{ color: T2 }}>{BULL_CASE.thesis}</p>
              {BULL_CASE.keyMetrics.map((m, i) => (
                <div key={m.label} className="flex justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: TM }}>{m.label}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{m.value}</span>
                </div>
              ))}
            </div>

            <SwissSection title={BEAR_CASE.title} />
            <div className="px-5 pb-6" style={{ background: WHT }}>
              <p className="text-sm leading-relaxed mb-3" style={{ color: T2 }}>{BEAR_CASE.thesis}</p>
              {BEAR_CASE.keyMetrics.map((m, i) => (
                <div key={m.label} className="flex justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: TM }}>{m.label}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: RED }}>{m.value}</span>
                </div>
              ))}
            </div>

            <SwissSection title="Key Risks" />
            <div className="px-5 pb-6" style={{ background: WHT }}>
              {KEY_RISKS.map((r, i) => (
                <div key={i} className={i > 0 ? "pt-3 mt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <div className="flex items-center gap-2 mb-1">
                    {r.severity === "High" && <span className="w-2 h-2 rounded-full" style={{ background: RED }} />}
                    {r.severity === "Medium" && <span className="w-2 h-2 rounded-full" style={{ background: TM }} />}
                    {r.severity !== "High" && r.severity !== "Medium" && <span className="w-2 h-2 rounded-full" style={{ background: GRY }} />}
                    <h4 className="text-sm font-bold">{r.title}</h4>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: T2 }}>{r.description}</p>
                </div>
              ))}
            </div>

            <SwissSection title="Catalysts" />
            <div className="px-5 pb-6" style={{ background: WHT }}>
              {CATALYSTS.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-3 mt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold">{c.title}</h4>
                    <span className="text-[10px] font-bold tabular-nums" style={{ fontFamily: mono, color: RED }}>{c.timeline}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: T2 }}>{c.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ background: BG }}>
            <div className="p-5 mt-6" style={{ background: WHT }}>
              <SwissRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today" />
              <SwissRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week" />
              <ThinRule />
              {[
                { l: "Open", v: usd(STOCK.open) },
                { l: "Prev Close", v: usd(STOCK.prevClose) },
                { l: "Avg Volume", v: fmt(STOCK.avgVolume) },
              ].map((r) => (
                <div key={r.l} className="flex justify-between py-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: TM }}>{r.l}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{r.v}</span>
                </div>
              ))}
            </div>

            <SwissCard title="Segments" className="mt-px">
              {SEGMENTS.map((seg) => (
                <div key={seg.name} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold">{seg.name}</span>
                    <span className="tabular-nums" style={{ fontFamily: mono, color: T2 }}>{seg.revenue} ({seg.pct}%)</span>
                  </div>
                  <div className="h-1" style={{ background: GRY }}>
                    <div className="h-full" style={{ width: `${seg.pct * 2}%`, background: RED }} />
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: T2 }}>{seg.description}</p>
                </div>
              ))}
            </SwissCard>

            <SwissCard title="Analyst Consensus" className="mt-px">
              <div className="flex items-center gap-4 mb-3">
                <div className="text-3xl font-extralight" style={{ fontFamily: sans, color: RED }}>{ANALYST_CONSENSUS.rating}</div>
                <div className="flex-1">
                  <div className="flex gap-px h-1.5">
                    <div style={{ flex: ANALYST_CONSENSUS.buy, background: INK }} />
                    <div style={{ flex: ANALYST_CONSENSUS.overweight, background: T2 }} />
                    <div style={{ flex: ANALYST_CONSENSUS.hold, background: TM }} />
                    <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${RED}88` }} />
                    <div style={{ flex: ANALYST_CONSENSUS.sell, background: RED }} />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold mt-1" style={{ color: TM }}>
                    <span>Buy {ANALYST_CONSENSUS.buy}</span><span>Hold {ANALYST_CONSENSUS.hold}</span><span>Sell {ANALYST_CONSENSUS.sell}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px mb-3" style={{ background: GRY }}>
                {[
                  { l: "Low", v: usd(ANALYST_CONSENSUS.lowTarget), c: RED },
                  { l: "Avg", v: usd(ANALYST_CONSENSUS.avgTarget), c: INK },
                  { l: "High", v: usd(ANALYST_CONSENSUS.highTarget), c: INK },
                ].map((t) => (
                  <div key={t.l} className="text-center py-2" style={{ background: WHT }}>
                    <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TM }}>{t.l}</div>
                    <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: t.c }}>{t.v}</div>
                  </div>
                ))}
              </div>
              {ANALYSTS.map((a, i) => (
                <div key={a.firm} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <div>
                    <div className="text-sm font-bold">{a.firm}</div>
                    <div className="text-[10px]" style={{ fontFamily: mono, color: TM }}>{a.analyst} · {a.date}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? INK : a.rating.includes("Sell") || a.rating.includes("Underperform") ? RED : TM }}>{a.rating}</span>
                    <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{usd(a.target)}</div>
                  </div>
                </div>
              ))}
            </SwissCard>

            <SwissCard title="Commentary" className="mt-px">
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-3 mt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <h4 className="text-sm font-bold">{c.title}</h4>
                  <div className="text-[10px]" style={{ fontFamily: mono, color: TM }}>{c.firm} — {c.analyst} · {c.date}</div>
                  <p className="text-sm leading-relaxed mt-1" style={{ color: T2 }}>{c.snippet}</p>
                </div>
              ))}
            </SwissCard>

            <SwissCard title="Technical Indicators" className="mt-px">
              {[
                { l: "SMA 20", v: usd(TECHNICALS.sma20), s: STOCK.price > TECHNICALS.sma20 },
                { l: "SMA 50", v: usd(TECHNICALS.sma50), s: STOCK.price > TECHNICALS.sma50 },
                { l: "SMA 200", v: usd(TECHNICALS.sma200), s: STOCK.price > TECHNICALS.sma200 },
                { l: "RSI 14", v: TECHNICALS.rsi14.toString(), s: TECHNICALS.rsi14 < 70 },
                { l: "Trend", v: TECHNICALS.trend, s: TECHNICALS.trend === "Uptrend" },
                { l: "MACD", v: TECHNICALS.macdSignal, s: TECHNICALS.macdSignal.includes("Bullish") },
                { l: "Support", v: usd(TECHNICALS.support1), s: true },
                { l: "Resist", v: usd(TECHNICALS.resistance1), s: false },
              ].map((t, i) => (
                <div key={t.l} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <span className="text-sm" style={{ color: T2 }}>{t.l}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: t.s ? INK : RED }}>{t.v}</span>
                </div>
              ))}
            </SwissCard>
          </div>
        </div>

        {/* ── FULL-WIDTH — Earnings ── */}
        <SwissSection title="Earnings History" />
        <SwissCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Quarter", "Date", "EPS Est", "EPS Act", "Revenue", "Growth", "Surprise"].map((h) => (
                    <th key={h} className={`py-2 px-2 text-[9px] font-bold uppercase tracking-[0.15em] ${h === "Quarter" || h === "Date" ? "text-left" : "text-right"}`} style={{ color: TM, borderBottom: `2px solid ${INK}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((e, i) => (
                  <tr key={e.quarter} style={{ background: i % 2 === 0 ? WHT : GR2, borderTop: `1px solid ${GRY}` }}>
                    <td className="py-1.5 px-2 font-bold" style={{ fontFamily: mono, color: RED }}>{e.quarter}</td>
                    <td className="py-1.5 px-2" style={{ fontFamily: mono, fontSize: "11px", color: TM }}>{e.date}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: TM }}>{usd(e.epsEst)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: e.epsActual >= e.epsEst ? INK : RED }}>{usd(e.epsActual)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{e.revenue}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: e.revenueGrowth >= 0 ? INK : RED }}>{pct(e.revenueGrowth)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: e.surprise.startsWith("+") ? INK : RED }}>{e.surprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SwissCard>

        {/* Financials */}
        <SwissSection title="Financial Statements" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: GRY }}>
          {[
            { title: "Income Statement", data: INCOME_STATEMENT, hasYoy: true },
            { title: "Balance Sheet", data: BALANCE_SHEET, hasYoy: false },
            { title: "Cash Flow", data: CASH_FLOW, hasYoy: true },
          ].map((section) => (
            <SwissCard key={section.title} title={section.title}>
              {section.data.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <span className="text-[13px]" style={{ color: T2 }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: row.value.startsWith("-") ? RED : INK }}>{row.value}</span>
                    {section.hasYoy && typeof (row as unknown as { yoy?: string }).yoy === "string" && (
                      <span className="text-[10px] tabular-nums" style={{ fontFamily: mono, color: (row as unknown as { yoy: string }).yoy.startsWith("+") ? INK : (row as unknown as { yoy: string }).yoy.startsWith("−") ? RED : TM }}>{(row as unknown as { yoy: string }).yoy}</span>
                    )}
                  </div>
                </div>
              ))}
            </SwissCard>
          ))}
        </div>

        {/* Competitors */}
        <SwissSection title="Peer Comparison" />
        <SwissCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Company", "Mkt Cap", "P/E", "Revenue", "Margin", "Growth"].map((h) => (
                    <th key={h} className={`py-2 px-2 text-[9px] font-bold uppercase tracking-[0.15em] ${h === "Company" ? "text-left" : "text-right"}`} style={{ color: TM, borderBottom: `2px solid ${INK}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr key={c.ticker} style={{ background: i % 2 === 0 ? WHT : GR2, borderTop: `1px solid ${GRY}` }}>
                    <td className="py-1.5 px-2"><span className="font-bold" style={{ fontFamily: mono }}>{c.ticker}</span> <span style={{ color: TM }}>{c.name}</span></td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{c.marketCap}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: T2 }}>{c.pe}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{c.revenue}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: T2 }}>{c.margin}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: c.growth.startsWith("+") ? INK : RED }}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SwissCard>

        {/* Valuation + Dividends */}
        <SwissSection title="Valuation & Dividends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: GRY }}>
          <SwissCard title="Valuation Ratios">
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className="flex justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-sm" style={{ color: T2 }}>{r.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{r.value}</span>
              </div>
            ))}
          </SwissCard>
          <SwissCard title="Dividend History">
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-sm font-bold" style={{ fontFamily: mono }}>{d.year}</span>
                <div className="flex items-center gap-3 tabular-nums" style={{ fontFamily: mono, fontSize: "12px" }}>
                  <span className="font-bold">{d.annual}</span>
                  <span style={{ color: TM }}>{d.yield}</span>
                  <span>{d.growth}</span>
                </div>
              </div>
            ))}
          </SwissCard>
        </div>

        {/* Holders + ESG */}
        <SwissSection title="Ownership & ESG" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: GRY }}>
          <SwissCard title="Top Holders">
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-sm">{h.name}</span>
                <div className="flex items-center gap-3 tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>
                  <span style={{ color: TM }}>{h.shares}</span>
                  <span className="font-bold w-10 text-right">{h.pct}</span>
                  <span className="w-16 text-right" style={{ color: T2 }}>{h.value}</span>
                </div>
              </div>
            ))}
          </SwissCard>
          <SwissCard title={`ESG — ${ESG.provider}`}>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-3xl font-extralight" style={{ color: RED }}>{ESG.rating}</div>
              <div className="flex-1 grid grid-cols-3 gap-px" style={{ background: GRY }}>
                {[
                  { l: "Env", s: ESG.environmentScore },
                  { l: "Soc", s: ESG.socialScore },
                  { l: "Gov", s: ESG.governanceScore },
                ].map((e) => (
                  <div key={e.l} className="text-center py-1.5" style={{ background: WHT }}>
                    <div className="text-lg font-bold" style={{ fontFamily: mono }}>{e.s}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TM }}>{e.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <ThinRule />
            {ESG.highlights.map((h, i) => (
              <p key={i} className="text-sm leading-relaxed mb-1" style={{ color: T2 }}>
                <span className="inline-block w-2 h-2 mr-1.5" style={{ background: RED }} /> {h}
              </p>
            ))}
          </SwissCard>
        </div>

        {/* Bottom 3-col */}
        <RedRule />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: GRY }}>
          <SwissCard title="Market Board">
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-xs font-bold" style={{ fontFamily: mono }}>{w.ticker}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] tabular-nums font-bold" style={{ fontFamily: mono }}>{usd(w.price)}</span>
                  <span className="text-[10px] tabular-nums w-14 text-right" style={{ fontFamily: mono, color: nClr(w.change) }}>{pct(w.change)}</span>
                </div>
              </div>
            ))}
          </SwissCard>
          <SwissCard title="Headlines">
            {NEWS.map((n, i) => (
              <div key={i} className="py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-[10px] font-bold mr-1" style={{ fontFamily: mono, color: RED }}>{n.time}</span>
                <span className="text-[13px]" style={{ color: T2 }}>{n.headline}</span>
              </div>
            ))}
          </SwissCard>
          <SwissCard title="Sectors">
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-[13px]" style={{ color: T2 }}>{s.label}</span>
                <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: s.value.startsWith("+") ? INK : RED }}>{s.value}</span>
              </div>
            ))}
          </SwissCard>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: INK }}>
        <div className="mx-auto max-w-[1100px] px-8 py-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em]" style={{ color: `${WHT}55` }}>
          <span>Zero Sum — 12-F: Swiss / NZZ</span>
          <span>Sample Data Only</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
