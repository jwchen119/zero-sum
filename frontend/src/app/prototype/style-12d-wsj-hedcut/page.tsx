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
   Style 12-D — WSJ "Hedcut" (1980s–90s)
   Almost entirely black & white. Ultra-precise hairline rules,
   Scotch Roman serifs, tight justified columns, stipple-dot
   chart style, minimal accent colour (one subtle blue).
   The gold standard of serious financial newspaper design.
   ══════════════════════════════════════════════════════════════ */

const WHT  = "#ffffff";
const BG   = "#f8f7f5";   // very slight warm tint
const INK  = "#1a1a1a";
const GRY  = "#c8c8c8";   // hairline rules
const GR2  = "#e5e5e5";   // lighter grid
const BLU  = "#1e4d8c";   // single blue accent
const RED  = "#8b0000";   // dark red for negatives
const T2   = "#555555";
const TM   = "#888888";
const GRN  = "#1a4d2e";

const serif   = "'Libre Baskerville', 'Georgia', 'Times New Roman', serif";
const display = "'Playfair Display', 'Georgia', serif";
const mono    = "'IBM Plex Mono', 'Courier New', monospace";
const sans    = "'Inter', 'Helvetica Neue', system-ui, sans-serif";

const nClr = (n: number) => (n >= 0 ? GRN : RED);

/* ── Hairline rules ── */
function Hair() { return <div className="h-px my-3" style={{ background: GRY }} />; }
function HeavyRule() { return <div className="h-[3px] my-5" style={{ background: INK }} />; }
function DoubleRule() {
  return (
    <div className="my-5">
      <div className="h-[2px]" style={{ background: INK }} />
      <div className="h-px mt-0.5" style={{ background: INK }} />
    </div>
  );
}

/* ── Section heading — WSJ style: bold caps with hairline above and below ── */
function WSJSection({ title }: { title: string }) {
  return (
    <div className="mt-10 mb-4">
      <div className="h-[2px]" style={{ background: INK }} />
      <h2
        className="text-[13px] font-extrabold uppercase tracking-[0.2em] py-2"
        style={{ fontFamily: sans, color: INK }}
      >
        {title}
      </h2>
      <div className="h-px" style={{ background: GRY }} />
    </div>
  );
}

/* ── Card — clean white with subtle border ── */
function WSJCard({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border p-4 ${className}`} style={{ borderColor: GRY, background: WHT }}>
      {title && (
        <>
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>{title}</h3>
          <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
        </>
      )}
      {children}
    </div>
  );
}

/* ── Sparkline — stipple-dot style ── */
function StippleSpark({ positive }: { positive: boolean }) {
  const pts = positive
    ? "0,22 10,19 20,21 30,16 40,18 50,12 60,14 70,9 80,11 90,7 100,5"
    : "0,5 10,8 20,6 30,12 40,9 50,15 60,13 70,18 80,20 90,16 100,22";
  return (
    <svg width="80" height="22" viewBox="0 0 100 28" className="inline-block">
      <polyline points={pts} fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 3" />
    </svg>
  );
}

/* ── Range bar ── */
function WSJRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-4">
      <div className="text-[9px] uppercase tracking-[0.15em] font-extrabold mb-1.5" style={{ fontFamily: sans, color: TM }}>{label}</div>
      <div className="relative h-px" style={{ background: GRY }}>
        <div className="absolute h-full" style={{ width: `${p}%`, background: INK }} />
        <div className="absolute top-[-4px] w-2 h-2 rounded-full" style={{ left: `calc(${p}% - 4px)`, background: INK }} />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums mt-1" style={{ fontFamily: mono, color: TM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function WSJHedcutPrototype() {
  return (
    <div className="min-h-screen" style={{ background: BG, color: INK }}>

      {/* ── MASTHEAD ── */}
      <header>
        <div style={{ background: WHT }}>
          <div className="mx-auto max-w-[1100px] px-6 py-1 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ fontFamily: mono, color: TM }}>New York · London · Hong Kong · Tokyo</span>
            <span className="text-[9px] uppercase tracking-[0.2em]" style={{ fontFamily: mono, color: TM }}>Monday, March 3, 2026</span>
          </div>
          <div className="h-[3px] mx-6" style={{ background: INK }} />
        </div>
        <div className="mx-auto max-w-[1100px] px-6 pt-5 pb-3" style={{ background: WHT }}>
          <div className="flex items-center justify-between mb-1">
            <Link href="/prototype" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>← All Styles</Link>
            <span className="text-[9px] font-bold tracking-[0.1em]" style={{ fontFamily: mono, color: TM }}>VOL. CCXLVIII NO. 52</span>
          </div>
          <div className="text-center py-2">
            <Link href="/prototype" className="hover:opacity-80 transition-opacity">
              <h1 className="text-[42px] font-normal tracking-[0.04em] leading-none" style={{ fontFamily: display, color: INK }}>
                The Zero Sum Journal
              </h1>
            </Link>
            <div className="h-px mt-3" style={{ background: INK }} />
            <div className="h-px mt-0.5" style={{ background: INK }} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-4" style={{ background: WHT }}>

        {/* ── PRICE HERO ── */}
        <div className="py-5 border-b-2" style={{ borderColor: INK }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-4xl font-bold tracking-tight" style={{ fontFamily: display }}>{STOCK.ticker}</span>
                <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] border px-1.5 py-0.5" style={{ fontFamily: sans, color: TM, borderColor: GRY }}>{STOCK.exchange}</span>
              </div>
              <p className="text-[15px]" style={{ fontFamily: serif, color: T2 }}>{STOCK.name} — {STOCK.sector}</p>
            </div>
            <div className="flex items-end gap-4">
              <span className="text-5xl font-light tabular-nums" style={{ fontFamily: mono }}>{usd(STOCK.price)}</span>
              <div className="flex flex-col items-end pb-1">
                <span className="text-lg font-bold tabular-nums" style={{ fontFamily: mono, color: nClr(STOCK.change) }}>
                  {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                </span>
                <span className="text-sm tabular-nums" style={{ fontFamily: mono, color: nClr(STOCK.changePct) }}>({pct(STOCK.changePct)})</span>
              </div>
              <StippleSpark positive={STOCK.change >= 0} />
            </div>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-px my-4" style={{ background: GRY }}>
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
            <div key={s.l} className="text-center py-2 px-1" style={{ background: WHT }}>
              <div className="text-[7px] font-extrabold uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{s.l}</div>
              <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── Chart — stipple dot grid ── */}
        <WSJSection title="Price History" />
        <WSJCard>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Daily Close</span>
            <div className="flex gap-3">
              {["1D", "5D", "1M", "3M", "1Y", "5Y"].map((p) => (
                <button key={p} className="text-[10px] font-bold" style={{ fontFamily: mono, color: p === "1Y" ? INK : TM }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-52 border" style={{ borderColor: GRY }}>
            <svg className="w-full h-full p-3" preserveAspectRatio="none" viewBox="0 0 400 160">
              <defs>
                <pattern id="wsjDots" width="6" height="6" patternUnits="userSpaceOnUse">
                  <circle cx="3" cy="3" r="0.5" fill={GRY} />
                </pattern>
              </defs>
              <rect width="400" height="160" fill="url(#wsjDots)" />
              {/* Grid lines */}
              {[0, 40, 80, 120, 160].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={GR2} strokeWidth="0.5" />
              ))}
              <polyline points="0,140 25,135 50,138 75,122 100,128 125,112 150,118 175,100 200,106 225,88 250,95 275,78 300,84 325,68 350,72 375,60 400,52" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </WSJCard>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

          {/* LEFT COLUMN */}
          <div className="space-y-4">
            <WSJSection title="Company Profile" />
            <p className="text-[14.5px] leading-[1.7] text-justify" style={{ fontFamily: serif, color: T2 }}>{COMPANY_DESCRIPTION}</p>
            <Hair />
            <div className="grid grid-cols-3 gap-y-2 gap-x-3">
              {[
                { l: "CEO", v: STOCK.ceo },
                { l: "HQ", v: STOCK.headquarters },
                { l: "Employees", v: STOCK.employees.toLocaleString() },
                { l: "Founded", v: STOCK.founded },
                { l: "IPO", v: STOCK.ipoDate },
                { l: "FY End", v: STOCK.fiscalYearEnd },
              ].map((item) => (
                <div key={item.l}>
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>{item.l}</span>
                  <div className="text-sm font-bold" style={{ fontFamily: mono }}>{item.v}</div>
                </div>
              ))}
            </div>

            {/* AI Analysis */}
            <WSJSection title="Market Intelligence" />
            <p className="text-[14.5px] leading-[1.7] text-justify" style={{ fontFamily: serif, color: T2 }}>{AI_ANALYSIS.summary}</p>
            <Hair />
            <h4 className="text-[10px] font-extrabold uppercase tracking-[0.15em] mb-1" style={{ fontFamily: sans, color: BLU }}>Outlook</h4>
            <p className="text-[14.5px] leading-[1.7] text-justify" style={{ fontFamily: serif, color: T2 }}>{AI_ANALYSIS.outlook}</p>

            {/* Bull / Bear */}
            <WSJSection title={BULL_CASE.title} />
            <p className="text-sm leading-relaxed text-justify mb-2" style={{ fontFamily: serif, color: T2 }}>{BULL_CASE.thesis}</p>
            {BULL_CASE.keyMetrics.map((m, i) => (
              <div key={m.label} className="flex justify-between py-1 text-sm" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{m.label}</span>
                <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: GRN }}>{m.value}</span>
              </div>
            ))}

            <WSJSection title={BEAR_CASE.title} />
            <p className="text-sm leading-relaxed text-justify mb-2" style={{ fontFamily: serif, color: T2 }}>{BEAR_CASE.thesis}</p>
            {BEAR_CASE.keyMetrics.map((m, i) => (
              <div key={m.label} className="flex justify-between py-1 text-sm" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{m.label}</span>
                <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: RED }}>{m.value}</span>
              </div>
            ))}

            {/* Risks */}
            <WSJSection title="Key Risks" />
            {KEY_RISKS.map((r, i) => (
              <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold" style={{ fontFamily: serif }}>{r.title}</h4>
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] border px-1.5 py-0.5" style={{ fontFamily: sans, color: r.severity === "High" ? RED : TM, borderColor: r.severity === "High" ? RED : GRY }}>{r.severity}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: serif, color: T2 }}>{r.description}</p>
              </div>
            ))}

            {/* Catalysts */}
            <WSJSection title="Catalysts" />
            {CATALYSTS.map((c, i) => (
              <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold" style={{ fontFamily: serif }}>{c.title}</h4>
                  <span className="text-[9px] font-bold" style={{ fontFamily: mono, color: BLU }}>{c.timeline}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: serif, color: T2 }}>{c.description}</p>
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            <WSJCard title="Price Ranges">
              <WSJRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today" />
              <WSJRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week" />
              <Hair />
              {[
                { l: "Open", v: usd(STOCK.open) },
                { l: "Prev Close", v: usd(STOCK.prevClose) },
                { l: "Avg Volume", v: fmt(STOCK.avgVolume) },
              ].map((r) => (
                <div key={r.l} className="flex justify-between py-1 text-sm">
                  <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{r.l}</span>
                  <span className="font-bold tabular-nums" style={{ fontFamily: mono }}>{r.v}</span>
                </div>
              ))}
            </WSJCard>

            <WSJCard title="Business Segments">
              {SEGMENTS.map((seg) => (
                <div key={seg.name} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold" style={{ fontFamily: serif }}>{seg.name}</span>
                    <span className="tabular-nums" style={{ fontFamily: mono, color: T2 }}>{seg.revenue} ({seg.pct}%)</span>
                  </div>
                  <div className="h-px" style={{ background: GRY }}>
                    <div className="h-full" style={{ width: `${seg.pct * 2}%`, background: INK }} />
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ fontFamily: serif, color: T2 }}>{seg.description}</p>
                </div>
              ))}
            </WSJCard>

            <WSJCard title="Analyst Consensus">
              <div className="flex items-center gap-4 mb-3">
                <div className="text-3xl font-black" style={{ fontFamily: mono, color: BLU }}>{ANALYST_CONSENSUS.rating}</div>
                <div className="flex-1">
                  <div className="flex gap-px h-2">
                    <div className="rounded-l" style={{ flex: ANALYST_CONSENSUS.buy, background: GRN }} />
                    <div style={{ flex: ANALYST_CONSENSUS.overweight, background: `${GRN}88` }} />
                    <div style={{ flex: ANALYST_CONSENSUS.hold, background: GRY }} />
                    <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${RED}88` }} />
                    <div className="rounded-r" style={{ flex: ANALYST_CONSENSUS.sell, background: RED }} />
                  </div>
                  <div className="flex justify-between text-[8px] font-extrabold mt-0.5" style={{ fontFamily: sans, color: TM }}>
                    <span>Buy {ANALYST_CONSENSUS.buy}</span><span>Hold {ANALYST_CONSENSUS.hold}</span><span>Sell {ANALYST_CONSENSUS.sell}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px mb-3" style={{ background: GRY }}>
                {[
                  { l: "Low", v: usd(ANALYST_CONSENSUS.lowTarget), c: RED },
                  { l: "Avg", v: usd(ANALYST_CONSENSUS.avgTarget), c: INK },
                  { l: "High", v: usd(ANALYST_CONSENSUS.highTarget), c: GRN },
                ].map((t) => (
                  <div key={t.l} className="text-center py-2" style={{ background: WHT }}>
                    <div className="text-[7px] font-extrabold uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{t.l}</div>
                    <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: t.c }}>{t.v}</div>
                  </div>
                ))}
              </div>
              {ANALYSTS.map((a, i) => (
                <div key={a.firm} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <div>
                    <div className="text-sm font-bold" style={{ fontFamily: serif }}>{a.firm}</div>
                    <div className="text-[9px]" style={{ fontFamily: mono, color: TM }}>{a.analyst} · {a.date}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-extrabold uppercase tracking-wider" style={{ fontFamily: sans, color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? GRN : a.rating.includes("Sell") || a.rating.includes("Underperform") ? RED : T2 }}>{a.rating}</span>
                    <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{usd(a.target)}</div>
                  </div>
                </div>
              ))}
            </WSJCard>

            <WSJCard title="Commentary">
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <h4 className="text-sm font-bold" style={{ fontFamily: serif }}>{c.title}</h4>
                  <span className="text-[9px]" style={{ fontFamily: mono, color: TM }}>{c.firm} — {c.analyst} · {c.date}</span>
                  <p className="text-sm leading-relaxed mt-1" style={{ fontFamily: serif, color: T2 }}>{c.snippet}</p>
                </div>
              ))}
            </WSJCard>

            <WSJCard title="Technical Indicators">
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
                  <span className="text-sm" style={{ fontFamily: serif, color: T2 }}>{t.l}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: t.s ? GRN : RED }}>{t.v}</span>
                </div>
              ))}
            </WSJCard>
          </div>
        </div>

        {/* ── FULL-WIDTH: Earnings ── */}
        <WSJSection title="Earnings History" />
        <WSJCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Quarter", "Date", "EPS Est", "EPS Act", "Revenue", "Growth", "Surprise"].map((h) => (
                    <th key={h} className={`py-2 px-2 text-[8px] font-extrabold uppercase tracking-[0.15em] ${h === "Quarter" || h === "Date" ? "text-left" : "text-right"}`} style={{ fontFamily: sans, color: TM, borderBottom: `2px solid ${INK}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((e, i) => (
                  <tr key={e.quarter} style={{ background: i % 2 === 0 ? WHT : BG, borderTop: `1px solid ${GRY}` }}>
                    <td className="py-1.5 px-2 font-bold" style={{ fontFamily: mono, color: BLU }}>{e.quarter}</td>
                    <td className="py-1.5 px-2" style={{ fontFamily: mono, fontSize: "11px", color: TM }}>{e.date}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: TM }}>{usd(e.epsEst)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: e.epsActual >= e.epsEst ? GRN : RED }}>{usd(e.epsActual)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{e.revenue}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: e.revenueGrowth >= 0 ? GRN : RED }}>{pct(e.revenueGrowth)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: e.surprise.startsWith("+") ? GRN : RED }}>{e.surprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WSJCard>

        {/* Financials */}
        <WSJSection title="Financial Statements" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: GRY }}>
          {[
            { title: "Income Statement", data: INCOME_STATEMENT, hasYoy: true },
            { title: "Balance Sheet", data: BALANCE_SHEET, hasYoy: false },
            { title: "Cash Flow", data: CASH_FLOW, hasYoy: true },
          ].map((section) => (
            <WSJCard key={section.title} title={section.title}>
              {section.data.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                  <span className="text-[13px]" style={{ fontFamily: serif, color: T2 }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: row.value.startsWith("-") ? RED : INK }}>{row.value}</span>
                    {section.hasYoy && typeof (row as unknown as { yoy?: string }).yoy === "string" && (
                      <span className="text-[10px] tabular-nums" style={{ fontFamily: mono, color: (row as unknown as { yoy: string }).yoy.startsWith("+") ? GRN : (row as unknown as { yoy: string }).yoy.startsWith("−") ? RED : TM }}>{(row as unknown as { yoy: string }).yoy}</span>
                    )}
                  </div>
                </div>
              ))}
            </WSJCard>
          ))}
        </div>

        {/* Competitors */}
        <WSJSection title="Peer Comparison" />
        <WSJCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Company", "Mkt Cap", "P/E", "Revenue", "Margin", "Growth"].map((h) => (
                    <th key={h} className={`py-2 px-2 text-[8px] font-extrabold uppercase tracking-[0.15em] ${h === "Company" ? "text-left" : "text-right"}`} style={{ fontFamily: sans, color: TM, borderBottom: `2px solid ${INK}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr key={c.ticker} style={{ background: i % 2 === 0 ? WHT : BG, borderTop: `1px solid ${GRY}` }}>
                    <td className="py-1.5 px-2"><span className="font-bold" style={{ fontFamily: mono }}>{c.ticker}</span> <span style={{ fontFamily: serif, color: TM }}>{c.name}</span></td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{c.marketCap}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: T2 }}>{c.pe}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{c.revenue}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: T2 }}>{c.margin}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: c.growth.startsWith("+") ? GRN : RED }}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WSJCard>

        {/* Valuation + Dividends */}
        <WSJSection title="Valuation & Dividends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: GRY }}>
          <WSJCard title="Valuation Ratios">
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className="flex justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: serif, color: T2 }}>{r.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{r.value}</span>
              </div>
            ))}
          </WSJCard>
          <WSJCard title="Dividend History">
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-sm font-bold" style={{ fontFamily: mono }}>{d.year}</span>
                <div className="flex items-center gap-3 tabular-nums" style={{ fontFamily: mono, fontSize: "12px" }}>
                  <span className="font-bold">{d.annual}</span>
                  <span style={{ color: TM }}>{d.yield}</span>
                  <span style={{ color: GRN }}>{d.growth}</span>
                </div>
              </div>
            ))}
          </WSJCard>
        </div>

        {/* Holders + ESG */}
        <WSJSection title="Ownership & ESG" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: GRY }}>
          <WSJCard title="Top Holders">
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: serif }}>{h.name}</span>
                <div className="flex items-center gap-3 tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>
                  <span style={{ color: TM }}>{h.shares}</span>
                  <span className="font-bold w-10 text-right">{h.pct}</span>
                  <span className="w-16 text-right" style={{ color: T2 }}>{h.value}</span>
                </div>
              </div>
            ))}
          </WSJCard>
          <WSJCard title={`ESG — ${ESG.provider}`}>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-2xl font-black" style={{ fontFamily: mono, color: BLU }}>{ESG.rating}</div>
              <div className="flex-1 grid grid-cols-3 gap-px" style={{ background: GRY }}>
                {[
                  { l: "Env", s: ESG.environmentScore },
                  { l: "Soc", s: ESG.socialScore },
                  { l: "Gov", s: ESG.governanceScore },
                ].map((e) => (
                  <div key={e.l} className="text-center py-1.5" style={{ background: WHT }}>
                    <div className="text-lg font-bold" style={{ fontFamily: mono }}>{e.s}</div>
                    <div className="text-[7px] font-extrabold uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{e.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <Hair />
            {ESG.highlights.map((h, i) => (
              <p key={i} className="text-sm leading-relaxed mb-1" style={{ fontFamily: serif, color: T2 }}>
                <span style={{ color: BLU }}>■</span> {h}
              </p>
            ))}
          </WSJCard>
        </div>

        {/* Bottom 3-col */}
        <DoubleRule />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] border-b-2 pb-1 mb-3" style={{ fontFamily: sans, borderColor: INK }}>Market Board</div>
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-xs font-bold" style={{ fontFamily: mono }}>{w.ticker}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] tabular-nums font-bold" style={{ fontFamily: mono }}>{usd(w.price)}</span>
                  <span className="text-[10px] tabular-nums w-14 text-right" style={{ fontFamily: mono, color: w.change >= 0 ? GRN : RED }}>{pct(w.change)}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] border-b-2 pb-1 mb-3" style={{ fontFamily: sans, borderColor: INK }}>Headlines</div>
            {NEWS.map((n, i) => (
              <div key={i} className="py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-[10px] font-bold mr-1" style={{ fontFamily: mono, color: TM }}>{n.time}</span>
                <span className="text-[13px]" style={{ fontFamily: serif, color: T2 }}>{n.headline}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] border-b-2 pb-1 mb-3" style={{ fontFamily: sans, borderColor: INK }}>Sectors</div>
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GRY}` : "none" }}>
                <span className="text-[13px]" style={{ fontFamily: serif, color: T2 }}>{s.label}</span>
                <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: s.value.startsWith("+") ? GRN : RED }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: INK }}>
        <div className="mx-auto max-w-[1100px] px-6 py-4 flex items-center justify-between text-[9px] uppercase tracking-[0.2em]" style={{ fontFamily: mono, color: `${WHT}66` }}>
          <span>Zero Sum — 12-D: WSJ Hedcut</span>
          <span>Sample Data Only</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
