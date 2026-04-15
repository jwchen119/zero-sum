"use client";

import Link from "next/link";
import {
  STOCK,
  COMPANY_DESCRIPTION,
  SEGMENTS,
  AI_ANALYSIS,
  BULL_CASE,
  BEAR_CASE,
  ANALYSTS,
  ANALYST_CONSENSUS,
  ANALYST_COMMENTARY,
  EARNINGS,
  INCOME_STATEMENT,
  BALANCE_SHEET,
  CASH_FLOW,
  KEY_RISKS,
  CATALYSTS,
  COMPETITORS,
  WATCHLIST,
  NEWS,
  VALUATION_RATIOS,
  SECTOR_PERFORMANCE,
  DIVIDEND_HISTORY,
  TOP_HOLDERS,
  ESG,
  TECHNICALS,
  fmt,
  pct,
  usd,
} from "@/lib/mockData";

/* ══════════════════════════════════════════════════════════════
   Style 12-C — Pink Sheet / FT-Style Financial Press (1960s–70s)
   Salmon pink broadsheet. Typewriter-monospaced data, tight
   serif headlines. Dense 2-column, hairline rules everywhere.
   Halftone dot accents, classified-ad watchlist grid,
   "MARKET CLOSE" stamp overlay feel.
   ══════════════════════════════════════════════════════════════ */

const PINK  = "#fce4d6";   // FT salmon pink
const PINK2 = "#f5d4c2";   // deeper pink for alt rows
const CREAM = "#faf6f0";   // off-white
const INK   = "#1a1a1a";   // black ink
const BURG  = "#6b0f1a";   // deep burgundy
const FGRN  = "#1a4d2e";   // forest green
const TAN   = "#8b7355";   // muted warm tan
const T2    = "#4a4040";   // secondary
const TM    = "#9a8a7a";   // muted label

const serif   = "'Playfair Display', 'Libre Baskerville', Georgia, serif";
const body    = "'Source Serif Pro', Georgia, 'Charter', serif";
const tw      = "'IBM Plex Mono', 'Courier New', Courier, monospace";    // typewriter
const heading = "'Inter', 'Helvetica Neue', system-ui, sans-serif";

const nClr = (n: number) => (n >= 0 ? FGRN : BURG);

/* ── Hairline rule ── */
function Hair() { return <div className="h-px my-3" style={{ background: TAN }} />; }
function HeavyRule() { return <div className="h-[2px] my-6" style={{ background: INK }} />; }

/* ── Dashed rule (perforated edge feel) ── */
function Perf() { return <div className="my-4 border-t border-dashed" style={{ borderColor: TAN }} />; }

/* ── Section heading — tight condensed ── */
function PinkSection({ title }: { title: string }) {
  return (
    <div className="mt-10 mb-4">
      <div className="h-[2px]" style={{ background: INK }} />
      <h2 className="text-xl font-extrabold uppercase tracking-[0.15em] mt-3" style={{ fontFamily: heading, color: INK }}>{title}</h2>
      <div className="h-px mt-2" style={{ background: TAN }} />
    </div>
  );
}

/* ── Dense data card ── */
function DenseCard({ title, children, className = "", bg = CREAM }: { title?: string; children: React.ReactNode; className?: string; bg?: string }) {
  return (
    <div className={`border p-4 ${className}`} style={{ borderColor: TAN, background: bg }}>
      {title && (
        <>
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: heading, color: INK }}>{title}</h3>
          <div className="h-[2px] mt-1 mb-3" style={{ background: INK }} />
        </>
      )}
      {children}
    </div>
  );
}

/* ── Sparkline ── */
function Spark({ positive }: { positive: boolean }) {
  const pts = positive
    ? "0,22 10,19 20,21 30,16 40,18 50,12 60,14 70,9 80,11 90,7 100,5"
    : "0,5 10,8 20,6 30,12 40,9 50,15 60,13 70,18 80,20 90,16 100,22";
  return (
    <svg width="80" height="22" viewBox="0 0 100 28" className="inline-block">
      <polyline points={pts} fill="none" stroke={positive ? FGRN : BURG} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Range ── */
function FTRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-4">
      <div className="text-[9px] uppercase tracking-[0.15em] font-extrabold mb-1.5" style={{ fontFamily: heading, color: TM }}>{label}</div>
      <div className="relative h-[2px]" style={{ background: TAN }}>
        <div className="absolute h-full" style={{ width: `${p}%`, background: INK }} />
        <div className="absolute top-[-3px] w-2 h-2 rotate-45 border" style={{ left: `calc(${p}% - 4px)`, background: PINK, borderColor: BURG }} />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums mt-1" style={{ fontFamily: tw, color: TM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ── "STAMP" badge ── */
function Stamp({ text, color = BURG }: { text: string; color?: string }) {
  return (
    <span
      className="inline-block text-[9px] font-extrabold uppercase tracking-[0.2em] border-2 px-2 py-0.5 rotate-[-2deg]"
      style={{ fontFamily: heading, color, borderColor: color, opacity: 0.8 }}
    >
      {text}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function PinkSheetPrototype() {
  return (
    <div className="min-h-screen" style={{ background: PINK, color: INK }}>

      {/* ── MASTHEAD — black bar with reverse type ── */}
      <header>
        <div style={{ background: INK }}>
          <div className="mx-auto max-w-6xl px-6 py-1 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ fontFamily: tw, color: PINK }}>London · New York · Tokyo · Hong Kong</span>
            <span className="text-[9px] uppercase tracking-[0.2em]" style={{ fontFamily: tw, color: `${PINK}99` }}>March 3, 2026</span>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <Link href="/prototype" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: tw, color: BURG }}>← All Styles</Link>
            <Stamp text="Market Close" />
          </div>
          <div className="text-center mb-3">
            <Link href="/prototype" className="hover:opacity-80 transition-opacity">
              <h1 className="text-5xl font-bold tracking-tight" style={{ fontFamily: serif, color: INK }}>Zero Sum</h1>
            </Link>
            <p className="text-[10px] uppercase tracking-[0.35em] mt-1" style={{ fontFamily: heading, color: TAN }}>Financial Times · Markets · Data · Analysis</p>
          </div>
          <div className="h-[2px]" style={{ background: INK }} />
          <div className="h-px mt-px" style={{ background: INK }} />
          {/* Nav */}
          <div className="flex justify-center gap-6 py-2 text-[9px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: heading, color: T2 }}>
            <span>Markets</span><span>|</span><span>Companies</span><span>|</span><span>Earnings</span><span>|</span><span>Opinion</span><span>|</span><span>Data</span>
          </div>
          <div className="h-px" style={{ background: TAN }} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-4">

        {/* ── PRICE HERO ── */}
        <div className="py-6 border-b" style={{ borderColor: INK }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-4xl font-bold tracking-tight" style={{ fontFamily: serif }}>{STOCK.ticker}</span>
                <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] border px-1.5 py-0.5" style={{ fontFamily: heading, color: TM, borderColor: TAN }}>{STOCK.exchange}</span>
                <Stamp text="NYSE" color={FGRN} />
              </div>
              <p className="text-sm" style={{ fontFamily: body, color: T2 }}>{STOCK.name} — {STOCK.sector}</p>
            </div>
            <div className="flex items-end gap-4">
              <span className="text-5xl font-light tabular-nums" style={{ fontFamily: tw }}>{usd(STOCK.price)}</span>
              <div className="flex flex-col items-end pb-1">
                <span className="text-lg font-bold tabular-nums" style={{ fontFamily: tw, color: nClr(STOCK.change) }}>
                  {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                </span>
                <span className="text-sm tabular-nums" style={{ fontFamily: tw, color: nClr(STOCK.changePct) }}>({pct(STOCK.changePct)})</span>
              </div>
              <Spark positive={STOCK.change >= 0} />
            </div>
          </div>
        </div>

        {/* ── Stats — dense typewriter grid ── */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-px my-4" style={{ background: TAN }}>
          {[
            { l: "Mkt Cap", v: fmt(STOCK.marketCap) },
            { l: "P/E", v: STOCK.pe.toFixed(1) },
            { l: "EPS", v: usd(STOCK.eps) },
            { l: "Beta", v: STOCK.beta.toFixed(2) },
            { l: "Yield", v: `${STOCK.dividendYield.toFixed(2)}%` },
            { l: "52W Hi", v: usd(STOCK.week52High) },
            { l: "52W Lo", v: usd(STOCK.week52Low) },
            { l: "Vol", v: fmt(STOCK.volume) },
          ].map((s, i) => (
            <div key={s.l} className="text-center py-2 px-1" style={{ background: i % 2 === 0 ? PINK : PINK2 }}>
              <div className="text-[7px] font-extrabold uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>{s.l}</div>
              <div className="text-sm font-bold tabular-nums" style={{ fontFamily: tw }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── Chart ── */}
        <PinkSection title="Price Chart" />
        <DenseCard bg={CREAM}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: heading, color: TM }}>Daily Close</span>
            <div className="flex gap-3">
              {["1D", "5D", "1M", "3M", "1Y", "5Y"].map((p) => (
                <button key={p} className="text-[10px] font-bold" style={{ fontFamily: tw, color: p === "1Y" ? INK : TM }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-52 border" style={{ borderColor: TAN, background: PINK }}>
            <svg className="w-full h-full p-3" preserveAspectRatio="none" viewBox="0 0 400 160">
              <defs>
                <pattern id="ftDots" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="4" r="0.8" fill={TAN} />
                </pattern>
              </defs>
              <rect width="400" height="160" fill="url(#ftDots)" />
              <polyline points="0,140 25,135 50,138 75,122 100,128 125,112 150,118 175,100 200,106 225,88 250,95 275,78 300,84 325,68 350,72 375,60 400,52" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </DenseCard>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Company Profile */}
            <PinkSection title="Company" />
            <p className="text-[14px] leading-relaxed text-justify" style={{ fontFamily: body, color: T2 }}>{COMPANY_DESCRIPTION}</p>
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
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: heading, color: TM }}>{item.l}</span>
                  <div className="text-sm font-bold" style={{ fontFamily: tw }}>{item.v}</div>
                </div>
              ))}
            </div>

            {/* AI Analysis */}
            <PinkSection title="Analysis" />
            <p className="text-[14px] leading-relaxed text-justify" style={{ fontFamily: body, color: T2 }}>{AI_ANALYSIS.summary}</p>
            <Perf />
            <h4 className="text-[10px] font-extrabold uppercase tracking-[0.15em] mb-1" style={{ fontFamily: heading, color: BURG }}>Outlook</h4>
            <p className="text-[14px] leading-relaxed text-justify" style={{ fontFamily: body, color: T2 }}>{AI_ANALYSIS.outlook}</p>

            {/* Bull Case */}
            <PinkSection title={`Bull — ${BULL_CASE.title}`} />
            <p className="text-sm leading-relaxed text-justify mb-2" style={{ fontFamily: body, color: T2 }}>{BULL_CASE.thesis}</p>
            {BULL_CASE.keyMetrics.map((m, i) => (
              <div key={m.label} className="flex justify-between py-1 text-sm" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>{m.label}</span>
                <span className="font-bold tabular-nums" style={{ fontFamily: tw, color: FGRN }}>{m.value}</span>
              </div>
            ))}

            {/* Bear Case */}
            <PinkSection title={`Bear — ${BEAR_CASE.title}`} />
            <p className="text-sm leading-relaxed text-justify mb-2" style={{ fontFamily: body, color: T2 }}>{BEAR_CASE.thesis}</p>
            {BEAR_CASE.keyMetrics.map((m, i) => (
              <div key={m.label} className="flex justify-between py-1 text-sm" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>{m.label}</span>
                <span className="font-bold tabular-nums" style={{ fontFamily: tw, color: BURG }}>{m.value}</span>
              </div>
            ))}

            {/* Risks */}
            <PinkSection title="Key Risks" />
            {KEY_RISKS.map((r, i) => (
              <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold" style={{ fontFamily: serif }}>{r.title}</h4>
                  <Stamp text={r.severity} color={r.severity === "High" ? BURG : r.severity === "Medium" ? TAN : TM} />
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: body, color: T2 }}>{r.description}</p>
              </div>
            ))}

            {/* Catalysts */}
            <PinkSection title="Catalysts" />
            {CATALYSTS.map((c, i) => (
              <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold" style={{ fontFamily: serif }}>{c.title}</h4>
                  <span className="text-[9px] font-bold" style={{ fontFamily: tw, color: FGRN }}>{c.timeline}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: body, color: T2 }}>{c.description}</p>
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* Ranges */}
            <DenseCard title="Ranges">
              <FTRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today" />
              <FTRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week" />
              <Hair />
              {[
                { l: "Open", v: usd(STOCK.open) },
                { l: "Prev Close", v: usd(STOCK.prevClose) },
                { l: "Avg Volume", v: fmt(STOCK.avgVolume) },
              ].map((r) => (
                <div key={r.l} className="flex justify-between py-1 text-sm">
                  <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>{r.l}</span>
                  <span className="font-bold tabular-nums" style={{ fontFamily: tw }}>{r.v}</span>
                </div>
              ))}
            </DenseCard>

            {/* Segments */}
            <DenseCard title="Segments" bg={PINK2}>
              {SEGMENTS.map((seg) => (
                <div key={seg.name} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold" style={{ fontFamily: serif }}>{seg.name}</span>
                    <span className="tabular-nums" style={{ fontFamily: tw, color: BURG }}>{seg.revenue} ({seg.pct}%)</span>
                  </div>
                  <div className="h-[2px]" style={{ background: TAN }}>
                    <div className="h-full" style={{ width: `${seg.pct * 2}%`, background: INK }} />
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ fontFamily: body, color: T2 }}>{seg.description}</p>
                </div>
              ))}
            </DenseCard>

            {/* Consensus */}
            <DenseCard title="Analyst Consensus">
              <div className="flex items-center gap-4 mb-3">
                <div className="text-3xl font-black" style={{ fontFamily: tw, color: FGRN }}>{ANALYST_CONSENSUS.rating}</div>
                <div className="flex-1">
                  <div className="flex gap-px h-2.5">
                    <div className="rounded-l" style={{ flex: ANALYST_CONSENSUS.buy, background: FGRN }} />
                    <div style={{ flex: ANALYST_CONSENSUS.overweight, background: `${FGRN}88` }} />
                    <div style={{ flex: ANALYST_CONSENSUS.hold, background: TAN }} />
                    <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${BURG}88` }} />
                    <div className="rounded-r" style={{ flex: ANALYST_CONSENSUS.sell, background: BURG }} />
                  </div>
                  <div className="flex justify-between text-[8px] font-extrabold mt-0.5" style={{ fontFamily: heading, color: TM }}>
                    <span>Buy {ANALYST_CONSENSUS.buy}</span><span>Hold {ANALYST_CONSENSUS.hold}</span><span>Sell {ANALYST_CONSENSUS.sell}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px mb-3" style={{ background: TAN }}>
                {[
                  { l: "Low", v: usd(ANALYST_CONSENSUS.lowTarget), c: BURG },
                  { l: "Avg", v: usd(ANALYST_CONSENSUS.avgTarget), c: INK },
                  { l: "High", v: usd(ANALYST_CONSENSUS.highTarget), c: FGRN },
                ].map((t) => (
                  <div key={t.l} className="text-center py-2" style={{ background: CREAM }}>
                    <div className="text-[7px] font-extrabold uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>{t.l}</div>
                    <div className="text-sm font-bold tabular-nums" style={{ fontFamily: tw, color: t.c }}>{t.v}</div>
                  </div>
                ))}
              </div>
              {ANALYSTS.map((a, i) => (
                <div key={a.firm} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                  <div>
                    <div className="text-sm font-bold" style={{ fontFamily: body }}>{a.firm}</div>
                    <div className="text-[9px]" style={{ fontFamily: tw, color: TM }}>{a.analyst} · {a.date}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-extrabold uppercase tracking-wider" style={{ fontFamily: heading, color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? FGRN : a.rating.includes("Sell") || a.rating.includes("Underperform") ? BURG : T2 }}>{a.rating}</span>
                    <div className="text-sm font-bold tabular-nums" style={{ fontFamily: tw }}>{usd(a.target)}</div>
                  </div>
                </div>
              ))}
            </DenseCard>

            {/* Commentary */}
            <DenseCard title="Commentary" bg={PINK2}>
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                  <h4 className="text-sm font-bold" style={{ fontFamily: serif }}>{c.title}</h4>
                  <span className="text-[9px]" style={{ fontFamily: tw, color: TM }}>{c.firm} — {c.analyst} · {c.date}</span>
                  <p className="text-sm leading-relaxed mt-1" style={{ fontFamily: body, color: T2 }}>{c.snippet}</p>
                </div>
              ))}
            </DenseCard>

            {/* Technicals */}
            <DenseCard title="Technical Indicators">
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
                <div key={t.l} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                  <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{t.l}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ fontFamily: tw, color: t.s ? FGRN : BURG }}>{t.v}</span>
                </div>
              ))}
            </DenseCard>
          </div>
        </div>

        {/* ── FULL-WIDTH SECTIONS ── */}

        {/* Earnings */}
        <PinkSection title="Earnings History" />
        <DenseCard bg={CREAM}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Quarter", "Date", "EPS Est", "EPS Act", "Revenue", "Growth", "Surprise"].map((h) => (
                    <th key={h} className={`py-2 px-2 text-[8px] font-extrabold uppercase tracking-[0.15em] ${h === "Quarter" || h === "Date" ? "text-left" : "text-right"}`} style={{ fontFamily: heading, color: TM, borderBottom: `2px solid ${INK}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((e, i) => (
                  <tr key={e.quarter} style={{ background: i % 2 === 0 ? CREAM : PINK, borderTop: `1px solid ${TAN}` }}>
                    <td className="py-1.5 px-2 font-bold" style={{ fontFamily: tw, color: BURG }}>{e.quarter}</td>
                    <td className="py-1.5 px-2" style={{ fontFamily: tw, fontSize: "11px", color: TM }}>{e.date}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: tw, fontSize: "11px", color: TM }}>{usd(e.epsEst)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold" style={{ fontFamily: tw, fontSize: "11px", color: e.epsActual >= e.epsEst ? FGRN : BURG }}>{usd(e.epsActual)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: tw, fontSize: "11px" }}>{e.revenue}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: tw, fontSize: "11px", color: e.revenueGrowth >= 0 ? FGRN : BURG }}>{pct(e.revenueGrowth)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold" style={{ fontFamily: tw, fontSize: "11px", color: e.surprise.startsWith("+") ? FGRN : BURG }}>{e.surprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DenseCard>

        {/* Financials */}
        <PinkSection title="Financial Statements" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: TAN }}>
          {[
            { title: "Income Stmt", data: INCOME_STATEMENT, hasYoy: true },
            { title: "Balance Sheet", data: BALANCE_SHEET, hasYoy: false },
            { title: "Cash Flow", data: CASH_FLOW, hasYoy: true },
          ].map((section) => (
            <DenseCard key={section.title} title={section.title} bg={CREAM}>
              {section.data.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                  <span className="text-[13px]" style={{ fontFamily: body, color: T2 }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: tw, color: row.value.startsWith("-") ? BURG : INK }}>{row.value}</span>
                    {section.hasYoy && typeof (row as unknown as { yoy?: string }).yoy === "string" && (
                      <span className="text-[10px] tabular-nums" style={{ fontFamily: tw, color: (row as unknown as { yoy: string }).yoy.startsWith("+") ? FGRN : (row as unknown as { yoy: string }).yoy.startsWith("−") ? BURG : TM }}>{(row as unknown as { yoy: string }).yoy}</span>
                    )}
                  </div>
                </div>
              ))}
            </DenseCard>
          ))}
        </div>

        {/* Competitors */}
        <PinkSection title="Peer Comparison" />
        <DenseCard bg={CREAM}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Company", "Mkt Cap", "P/E", "Revenue", "Margin", "Growth"].map((h) => (
                    <th key={h} className={`py-2 px-2 text-[8px] font-extrabold uppercase tracking-[0.15em] ${h === "Company" ? "text-left" : "text-right"}`} style={{ fontFamily: heading, color: TM, borderBottom: `2px solid ${INK}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr key={c.ticker} style={{ background: i % 2 === 0 ? CREAM : PINK, borderTop: `1px solid ${TAN}` }}>
                    <td className="py-1.5 px-2"><span className="font-bold" style={{ fontFamily: tw, color: BURG }}>{c.ticker}</span> <span style={{ fontFamily: body, color: TM }}>{c.name}</span></td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: tw, fontSize: "11px" }}>{c.marketCap}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: tw, fontSize: "11px", color: T2 }}>{c.pe}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: tw, fontSize: "11px" }}>{c.revenue}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums" style={{ fontFamily: tw, fontSize: "11px", color: T2 }}>{c.margin}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold" style={{ fontFamily: tw, fontSize: "11px", color: c.growth.startsWith("+") ? FGRN : BURG }}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DenseCard>

        {/* Valuation + Dividends */}
        <PinkSection title="Valuation & Dividends" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: TAN }}>
          <DenseCard title="Valuation Ratios" bg={CREAM}>
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className="flex justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{r.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: tw }}>{r.value}</span>
              </div>
            ))}
          </DenseCard>
          <DenseCard title="Dividend History" bg={CREAM}>
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-sm font-bold" style={{ fontFamily: tw, color: BURG }}>{d.year}</span>
                <div className="flex items-center gap-3 tabular-nums" style={{ fontFamily: tw, fontSize: "12px" }}>
                  <span className="font-bold">{d.annual}</span>
                  <span style={{ color: TM }}>{d.yield}</span>
                  <span style={{ color: FGRN }}>{d.growth}</span>
                </div>
              </div>
            ))}
          </DenseCard>
        </div>

        {/* Holders + ESG */}
        <PinkSection title="Ownership & ESG" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: TAN }}>
          <DenseCard title="Top Holders" bg={CREAM}>
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body }}>{h.name}</span>
                <div className="flex items-center gap-3 tabular-nums" style={{ fontFamily: tw, fontSize: "11px" }}>
                  <span style={{ color: TM }}>{h.shares}</span>
                  <span className="font-bold w-10 text-right" style={{ color: BURG }}>{h.pct}</span>
                  <span className="w-16 text-right" style={{ color: T2 }}>{h.value}</span>
                </div>
              </div>
            ))}
          </DenseCard>
          <DenseCard title={`ESG — ${ESG.provider}`} bg={CREAM}>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-2xl font-black" style={{ fontFamily: tw, color: FGRN }}>{ESG.rating}</div>
              <div className="flex-1 grid grid-cols-3 gap-px" style={{ background: TAN }}>
                {[
                  { l: "Env", s: ESG.environmentScore },
                  { l: "Soc", s: ESG.socialScore },
                  { l: "Gov", s: ESG.governanceScore },
                ].map((e) => (
                  <div key={e.l} className="text-center py-1.5" style={{ background: CREAM }}>
                    <div className="text-lg font-bold" style={{ fontFamily: tw }}>{e.s}</div>
                    <div className="text-[7px] font-extrabold uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>{e.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <Hair />
            {ESG.highlights.map((h, i) => (
              <p key={i} className="text-sm leading-relaxed mb-1" style={{ fontFamily: body, color: T2 }}>
                <span style={{ fontFamily: tw, color: FGRN }}>▸</span> {h}
              </p>
            ))}
          </DenseCard>
        </div>

        {/* ── CLASSIFIED-AD STYLE Watchlist + News + Sector ── */}
        <HeavyRule />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Watchlist as dense classified grid */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] border-b-2 pb-1 mb-3" style={{ fontFamily: heading, borderColor: INK }}>Market Board</div>
            <div className="grid grid-cols-2 gap-px" style={{ background: TAN }}>
              {WATCHLIST.map((w) => (
                <div key={w.ticker} className="p-1.5 cursor-pointer" style={{ background: CREAM }}>
                  <div className="text-xs font-bold" style={{ fontFamily: tw }}>{w.ticker}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] tabular-nums font-bold" style={{ fontFamily: tw }}>{usd(w.price)}</span>
                    <span className="text-[10px] tabular-nums" style={{ fontFamily: tw, color: w.change >= 0 ? FGRN : BURG }}>{pct(w.change)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] border-b-2 pb-1 mb-3" style={{ fontFamily: heading, borderColor: INK }}>News</div>
            {NEWS.map((n, i) => (
              <div key={i} className="py-1.5 cursor-pointer" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-[10px] font-bold mr-1" style={{ fontFamily: tw, color: BURG }}>{n.time}</span>
                <span className="text-[13px]" style={{ fontFamily: body, color: T2 }}>{n.headline}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] border-b-2 pb-1 mb-3" style={{ fontFamily: heading, borderColor: INK }}>Sector</div>
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-[13px]" style={{ fontFamily: body, color: T2 }}>{s.label}</span>
                <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: tw, color: s.value.startsWith("+") ? FGRN : BURG }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer style={{ background: INK }}>
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between text-[9px] uppercase tracking-[0.2em]" style={{ fontFamily: tw, color: `${PINK}99` }}>
          <span>Zero Sum — 12-C: Pink Sheet</span>
          <span>Sample Data Only</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
