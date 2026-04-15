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
   Style 12-H — Letterpress Broadside (1850s–1870s)
   Pre-Victorian woodtype poster aesthetic — giant bold slab-serif
   display type, mixed sizes/weights, hand-set compositor feel.
   Financial announcements & railroad bonds era.
   Pointing hands (☞), ornamental borders, ALL-CAPS stacking.
   ══════════════════════════════════════════════════════════════ */

const CREAM = "#f2e8d0";    // heavy cream stock
const INK   = "#1a1108";    // heavy black ink
const RED2  = "#8b1a1a";    // printer's red
const GRN   = "#2d4a2d";    // forest green
const TAN   = "#a09070";    // aged tan
const T2    = "#5a4a3a";    // secondary text
const TM    = "#8a7a6a";    // muted

const slab    = "'Playfair Display', 'Rockwell', 'Clarendon', Georgia, serif";
const display = "'Playfair Display', 'Georgia', serif";
const body    = "'Source Serif Pro', Georgia, 'Charter', serif";
const mono    = "'IBM Plex Mono', 'Courier New', monospace";
const heading = "'Inter', 'Helvetica Neue', system-ui, sans-serif";

const nClr = (n: number) => (n >= 0 ? GRN : RED2);

/* ── Ornamental border rule ── */
function OrnBorder() {
  return (
    <div className="my-4 text-center text-sm select-none leading-tight" style={{ fontFamily: body, color: TAN }}>
      ✦ ═══════════════════════════════════════════════════════ ✦
    </div>
  );
}
function ThinRule() { return <div className="h-px my-3" style={{ background: TAN }} />; }
function ThickRule() { return <div className="h-1 my-4" style={{ background: INK }} />; }

/* ── Section — stacked ALL-CAPS woodtype style ── */
function BroadsideSection({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mt-10 mb-4 text-center">
      <div className="flex items-center gap-2 justify-center mb-2">
        <span className="text-sm" style={{ color: TAN }}>☞</span>
        <div className="h-[2px] flex-1" style={{ background: INK }} />
        <span className="text-sm" style={{ color: TAN }}>☞</span>
      </div>
      <h2 className="text-2xl font-black uppercase tracking-[0.2em]" style={{ fontFamily: slab, color: INK }}>{title}</h2>
      {sub && <p className="text-[10px] uppercase tracking-[0.35em] mt-1" style={{ fontFamily: heading, color: TAN }}>{sub}</p>}
      <div className="flex items-center gap-2 justify-center mt-2">
        <span className="text-sm" style={{ color: TAN }}>☜</span>
        <div className="h-px flex-1" style={{ background: TAN }} />
        <span className="text-sm" style={{ color: TAN }}>☜</span>
      </div>
    </div>
  );
}

/* ── Card — heavy border with ornamental corners ── */
function BroadsideCard({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-2 p-4 relative ${className}`} style={{ borderColor: INK, background: CREAM }}>
      {/* Corner ornaments */}
      <span className="absolute -top-2 -left-2 text-lg leading-none" style={{ color: TAN }}>❧</span>
      <span className="absolute -top-2 -right-2 text-lg leading-none" style={{ color: TAN }}>❧</span>
      {title && (
        <>
          <h3 className="text-center text-sm font-black uppercase tracking-[0.2em] mb-1" style={{ fontFamily: slab, color: INK }}>{title}</h3>
          <div className="text-center text-xs mb-2 select-none" style={{ color: TAN }}>— ✦ —</div>
        </>
      )}
      {children}
    </div>
  );
}

/* ── Range ── */
function BroadsideRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-3">
      <div className="text-[9px] uppercase tracking-[0.15em] font-bold mb-1" style={{ fontFamily: heading, color: TM }}>{label}</div>
      <div className="relative h-1 border" style={{ borderColor: INK }}>
        <div className="absolute h-full" style={{ width: `${p}%`, background: INK }} />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums mt-0.5" style={{ fontFamily: mono, color: TM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function LetterpressBroadsidePrototype() {
  return (
    <div className="min-h-screen" style={{ background: CREAM, color: INK }}>

      {/* ── MASTHEAD — giant stacked type ── */}
      <header className="border-b-4" style={{ borderColor: INK }}>
        <div className="mx-auto max-w-5xl px-6 py-2">
          <div className="flex items-center justify-between">
            <Link href="/prototype" className="text-[10px] font-bold hover:underline" style={{ fontFamily: mono, color: RED2 }}>← ALL STYLES</Link>
            <span className="text-[10px]" style={{ fontFamily: mono, color: TM }}>MONDAY, MARCH 3, 1876 — er, 2026</span>
          </div>
          <OrnBorder />
          <div className="text-center">
            <Link href="/prototype" className="hover:opacity-80 transition-opacity block">
              <h1 className="text-6xl font-black uppercase tracking-[0.15em] leading-none" style={{ fontFamily: slab }}>ZERO SUM</h1>
              <p className="text-xl font-bold uppercase tracking-[0.4em] mt-2" style={{ fontFamily: display, color: T2 }}>FINANCIAL BROADSIDE</p>
            </Link>
            <div className="text-[9px] uppercase tracking-[0.3em] mt-2" style={{ fontFamily: heading, color: TAN }}>
              Published for the Edification of Investors & Speculators · Established A.D. 1852
            </div>
          </div>
          <OrnBorder />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">

        {/* ── PRICE HERO — giant announcement style ── */}
        <div className="text-center py-8 border-4" style={{ borderColor: INK }}>
          <div className="text-[10px] uppercase tracking-[0.3em] mb-3" style={{ fontFamily: heading, color: TAN }}>☞ Public Notice ☜</div>
          <div className="text-3xl font-black uppercase tracking-[0.1em]" style={{ fontFamily: slab }}>{STOCK.name}</div>
          <div className="text-sm uppercase tracking-[0.2em] mt-1" style={{ fontFamily: heading, color: T2 }}>{STOCK.sector} · {STOCK.exchange} · Ticker: {STOCK.ticker}</div>
          <ThickRule />
          <div className="flex items-center justify-center gap-8">
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>Current Price</div>
              <div className="text-5xl font-black" style={{ fontFamily: mono }}>{usd(STOCK.price)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>Change</div>
              <div className="text-3xl font-bold" style={{ fontFamily: mono, color: nClr(STOCK.change) }}>
                {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
              </div>
              <div className="text-lg" style={{ fontFamily: mono, color: nClr(STOCK.changePct) }}>({pct(STOCK.changePct)})</div>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-0 border-x border-b" style={{ borderColor: INK }}>
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
            <div key={s.l} className="text-center py-2 px-1 border-r" style={{ borderColor: i < 7 ? TAN : "transparent" }}>
              <div className="text-[7px] font-bold uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>{s.l}</div>
              <div className="text-sm font-black tabular-nums" style={{ fontFamily: mono }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── Chart ── */}
        <BroadsideSection title="Price Chart" sub="One Year Performance" />
        <BroadsideCard>
          <svg className="w-full h-48" preserveAspectRatio="none" viewBox="0 0 400 140">
            {[0, 35, 70, 105, 140].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={TAN} strokeWidth="0.5" />
            ))}
            <polyline points="0,130 25,125 50,128 75,110 100,116 125,100 150,106 175,88 200,94 225,76 250,82 275,66 300,72 325,56 350,60 375,48 400,40" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BroadsideCard>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">

          {/* LEFT */}
          <div className="space-y-4">
            <BroadsideSection title="Company Description" sub="Corporate Intelligence" />
            <p className="text-[15px] leading-[1.8] text-justify" style={{ fontFamily: body, color: T2 }}>
              <span className="text-4xl font-bold float-left mr-2 leading-none" style={{ fontFamily: slab, color: INK }}>{COMPANY_DESCRIPTION[0]}</span>
              {COMPANY_DESCRIPTION.slice(1)}
            </p>
            <ThinRule />
            <div className="grid grid-cols-3 gap-y-2 gap-x-3">
              {[
                { l: "Chief Executive", v: STOCK.ceo },
                { l: "Headquarters", v: STOCK.headquarters },
                { l: "Employees", v: STOCK.employees.toLocaleString() },
                { l: "Founded", v: STOCK.founded },
                { l: "Public Since", v: STOCK.ipoDate },
                { l: "Fiscal Year", v: STOCK.fiscalYearEnd },
              ].map((item) => (
                <div key={item.l}>
                  <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: heading, color: TM }}>{item.l}</span>
                  <div className="text-sm font-bold" style={{ fontFamily: mono }}>{item.v}</div>
                </div>
              ))}
            </div>

            <BroadsideSection title="Analysis" sub="Intelligence Report" />
            <p className="text-sm leading-relaxed text-justify" style={{ fontFamily: body, color: T2 }}>{AI_ANALYSIS.summary}</p>
            <ThinRule />
            <p className="text-sm leading-relaxed text-justify" style={{ fontFamily: body, color: T2 }}>{AI_ANALYSIS.outlook}</p>

            <BroadsideSection title="The Case For" sub="Bull Thesis" />
            <BroadsideCard>
              <p className="text-sm leading-relaxed text-justify mb-3" style={{ fontFamily: body, color: T2 }}>{BULL_CASE.thesis}</p>
              {BULL_CASE.keyMetrics.map((m, i) => (
                <div key={m.label} className="flex justify-between py-1 text-sm" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                  <span className="text-[9px] uppercase tracking-wider font-bold" style={{ fontFamily: heading, color: TM }}>☞ {m.label}</span>
                  <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: GRN }}>{m.value}</span>
                </div>
              ))}
            </BroadsideCard>

            <BroadsideSection title="The Case Against" sub="Bear Thesis" />
            <BroadsideCard>
              <p className="text-sm leading-relaxed text-justify mb-3" style={{ fontFamily: body, color: T2 }}>{BEAR_CASE.thesis}</p>
              {BEAR_CASE.keyMetrics.map((m, i) => (
                <div key={m.label} className="flex justify-between py-1 text-sm" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                  <span className="text-[9px] uppercase tracking-wider font-bold" style={{ fontFamily: heading, color: TM }}>☞ {m.label}</span>
                  <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: RED2 }}>{m.value}</span>
                </div>
              ))}
            </BroadsideCard>

            {/* Risks */}
            <BroadsideSection title="Perils & Hazards" sub="Risk Assessment" />
            {KEY_RISKS.map((r, i) => (
              <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: r.severity === "High" ? RED2 : TAN }}>☞</span>
                  <h4 className="text-sm font-black uppercase" style={{ fontFamily: slab }}>{r.title}</h4>
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: body, color: T2 }}>{r.description}</p>
              </div>
            ))}

            {/* Catalysts */}
            <BroadsideSection title="Forthcoming Events" sub="Catalysts" />
            {CATALYSTS.map((c, i) => (
              <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-black uppercase" style={{ fontFamily: slab }}>{c.title}</h4>
                  <span className="text-[9px] font-bold" style={{ fontFamily: mono, color: GRN }}>{c.timeline}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: body, color: T2 }}>{c.description}</p>
              </div>
            ))}
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <BroadsideCard title="Trading Ranges">
              <BroadsideRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today" />
              <BroadsideRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week" />
              <ThinRule />
              {[
                { l: "Open", v: usd(STOCK.open) },
                { l: "Prev Close", v: usd(STOCK.prevClose) },
                { l: "Avg Volume", v: fmt(STOCK.avgVolume) },
              ].map((r) => (
                <div key={r.l} className="flex justify-between py-1 text-sm">
                  <span className="text-[9px] uppercase tracking-wider font-bold" style={{ fontFamily: heading, color: TM }}>{r.l}</span>
                  <span className="font-bold tabular-nums" style={{ fontFamily: mono }}>{r.v}</span>
                </div>
              ))}
            </BroadsideCard>

            <BroadsideCard title="Business Segments">
              {SEGMENTS.map((seg) => (
                <div key={seg.name} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-black uppercase" style={{ fontFamily: slab }}>{seg.name}</span>
                    <span className="tabular-nums" style={{ fontFamily: mono, color: T2 }}>{seg.revenue} ({seg.pct}%)</span>
                  </div>
                  <div className="h-1 border" style={{ borderColor: INK }}>
                    <div className="h-full" style={{ width: `${seg.pct * 2}%`, background: INK }} />
                  </div>
                </div>
              ))}
            </BroadsideCard>

            <BroadsideCard title="Analyst Opinions">
              <div className="text-center mb-3">
                <div className="text-3xl font-black" style={{ fontFamily: slab, color: GRN }}>{ANALYST_CONSENSUS.rating}</div>
                <div className="text-[9px] uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>
                  Buy {ANALYST_CONSENSUS.buy} · Hold {ANALYST_CONSENSUS.hold} · Sell {ANALYST_CONSENSUS.sell}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0 border" style={{ borderColor: INK }}>
                {[
                  { l: "Low", v: usd(ANALYST_CONSENSUS.lowTarget) },
                  { l: "Avg", v: usd(ANALYST_CONSENSUS.avgTarget) },
                  { l: "High", v: usd(ANALYST_CONSENSUS.highTarget) },
                ].map((t, i) => (
                  <div key={t.l} className="text-center py-2" style={{ borderRight: i < 2 ? `1px solid ${TAN}` : "none" }}>
                    <div className="text-[7px] font-bold uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>{t.l}</div>
                    <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{t.v}</div>
                  </div>
                ))}
              </div>
              <ThinRule />
              {ANALYSTS.map((a, i) => (
                <div key={a.firm} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                  <div>
                    <div className="text-sm font-bold" style={{ fontFamily: body }}>{a.firm}</div>
                    <div className="text-[9px]" style={{ fontFamily: mono, color: TM }}>{a.analyst}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold uppercase tracking-wider" style={{ fontFamily: heading, color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? GRN : a.rating.includes("Sell") || a.rating.includes("Underperform") ? RED2 : T2 }}>{a.rating}</span>
                    <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{usd(a.target)}</div>
                  </div>
                </div>
              ))}
            </BroadsideCard>

            <BroadsideCard title="Commentary">
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                  <h4 className="text-sm font-black uppercase" style={{ fontFamily: slab }}>{c.title}</h4>
                  <div className="text-[9px]" style={{ fontFamily: mono, color: TM }}>{c.firm} — {c.date}</div>
                  <p className="text-sm leading-relaxed mt-1" style={{ fontFamily: body, color: T2 }}>{c.snippet}</p>
                </div>
              ))}
            </BroadsideCard>

            <BroadsideCard title="Technical Indicators">
              {[
                { l: "SMA 20", v: usd(TECHNICALS.sma20), s: STOCK.price > TECHNICALS.sma20 },
                { l: "SMA 50", v: usd(TECHNICALS.sma50), s: STOCK.price > TECHNICALS.sma50 },
                { l: "SMA 200", v: usd(TECHNICALS.sma200), s: STOCK.price > TECHNICALS.sma200 },
                { l: "RSI 14", v: TECHNICALS.rsi14.toString(), s: TECHNICALS.rsi14 < 70 },
                { l: "Trend", v: TECHNICALS.trend, s: TECHNICALS.trend === "Uptrend" },
                { l: "MACD", v: TECHNICALS.macdSignal, s: TECHNICALS.macdSignal.includes("Bullish") },
              ].map((t, i) => (
                <div key={t.l} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                  <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{t.l}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: t.s ? GRN : RED2 }}>{t.v}</span>
                </div>
              ))}
            </BroadsideCard>
          </div>
        </div>

        {/* ── FULL-WIDTH Earnings ── */}
        <BroadsideSection title="Earnings History" sub="Quarterly Results" />
        <BroadsideCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Quarter", "Date", "EPS Est", "EPS Act", "Revenue", "Growth", "Surprise"].map((h) => (
                    <th key={h} className={`py-1.5 px-2 text-[8px] font-bold uppercase tracking-[0.15em] ${h === "Quarter" || h === "Date" ? "text-left" : "text-right"}`} style={{ fontFamily: heading, color: TM, borderBottom: `2px solid ${INK}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((e, i) => (
                  <tr key={e.quarter} style={{ borderTop: `1px solid ${TAN}` }}>
                    <td className="py-1 px-2 font-bold" style={{ fontFamily: mono }}>{e.quarter}</td>
                    <td className="py-1 px-2" style={{ fontFamily: mono, fontSize: "11px", color: TM }}>{e.date}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: TM }}>{usd(e.epsEst)}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: e.epsActual >= e.epsEst ? GRN : RED2 }}>{usd(e.epsActual)}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{e.revenue}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: nClr(e.revenueGrowth) }}>{pct(e.revenueGrowth)}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: e.surprise.startsWith("+") ? GRN : RED2 }}>{e.surprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BroadsideCard>

        {/* Financials */}
        <BroadsideSection title="Financial Statements" sub="Annual Accounts" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            { title: "Income Stmt", data: INCOME_STATEMENT, hasYoy: true },
            { title: "Balance Sheet", data: BALANCE_SHEET, hasYoy: false },
            { title: "Cash Flow", data: CASH_FLOW, hasYoy: true },
          ].map((section) => (
            <BroadsideCard key={section.title} title={section.title}>
              {section.data.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between py-0.5 text-sm" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                  <span style={{ fontFamily: body, color: T2 }}>{row.label}</span>
                  <span>
                    <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: row.value.startsWith("-") ? RED2 : INK }}>{row.value}</span>
                    {section.hasYoy && typeof (row as unknown as { yoy?: string }).yoy === "string" && (
                      <span className="text-[10px] ml-1 tabular-nums" style={{ fontFamily: mono, color: (row as unknown as { yoy: string }).yoy.startsWith("+") ? GRN : (row as unknown as { yoy: string }).yoy.startsWith("−") ? RED2 : TM }}>{(row as unknown as { yoy: string }).yoy}</span>
                    )}
                  </span>
                </div>
              ))}
            </BroadsideCard>
          ))}
        </div>

        {/* Competitors */}
        <BroadsideSection title="Peer Comparison" />
        <BroadsideCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Company", "Mkt Cap", "P/E", "Revenue", "Margin", "Growth"].map((h) => (
                    <th key={h} className={`py-1 px-2 text-[8px] font-bold uppercase tracking-[0.15em] ${h === "Company" ? "text-left" : "text-right"}`} style={{ fontFamily: heading, color: TM, borderBottom: `2px solid ${INK}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr key={c.ticker} style={{ borderTop: `1px solid ${TAN}` }}>
                    <td className="py-1 px-2"><span className="font-bold" style={{ fontFamily: mono }}>{c.ticker}</span> <span style={{ fontFamily: body, color: TM }}>{c.name}</span></td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{c.marketCap}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: T2 }}>{c.pe}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{c.revenue}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: T2 }}>{c.margin}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: c.growth.startsWith("+") ? GRN : RED2 }}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BroadsideCard>

        {/* Valuation + Dividends + Holders + ESG */}
        <BroadsideSection title="Additional Intelligence" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BroadsideCard title="Valuation">
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className="flex justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{r.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{r.value}</span>
              </div>
            ))}
          </BroadsideCard>
          <BroadsideCard title="Dividends">
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-sm font-bold" style={{ fontFamily: mono }}>{d.year}</span>
                <div className="flex items-center gap-3 tabular-nums" style={{ fontFamily: mono, fontSize: "12px" }}>
                  <span className="font-bold">{d.annual}</span>
                  <span style={{ color: TM }}>{d.yield}</span>
                  <span style={{ color: GRN }}>{d.growth}</span>
                </div>
              </div>
            ))}
          </BroadsideCard>
          <BroadsideCard title="Top Holders">
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body }}>{h.name}</span>
                <div className="flex items-center gap-2 tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>
                  <span>{h.shares}</span>
                  <span className="font-bold">{h.pct}</span>
                </div>
              </div>
            ))}
          </BroadsideCard>
          <BroadsideCard title={`ESG — ${ESG.provider}`}>
            <div className="text-center mb-3">
              <div className="text-3xl font-black" style={{ fontFamily: slab, color: GRN }}>{ESG.rating}</div>
              <div className="text-[9px] uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>
                Env {ESG.environmentScore} · Soc {ESG.socialScore} · Gov {ESG.governanceScore}
              </div>
            </div>
            {ESG.highlights.map((h, i) => (
              <p key={i} className="text-sm leading-relaxed mb-1" style={{ fontFamily: body, color: T2 }}>☞ {h}</p>
            ))}
          </BroadsideCard>
        </div>

        {/* Bottom: Watchlist + News + Sectors */}
        <OrnBorder />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BroadsideCard title="Market Board">
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-sm font-bold" style={{ fontFamily: mono }}>{w.ticker}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums font-bold" style={{ fontFamily: mono }}>{usd(w.price)}</span>
                  <span className="text-[10px] tabular-nums" style={{ fontFamily: mono, color: nClr(w.change) }}>{pct(w.change)}</span>
                </div>
              </div>
            ))}
          </BroadsideCard>
          <BroadsideCard title="Intelligence">
            {NEWS.map((n, i) => (
              <div key={i} className="py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-[9px] font-bold mr-1" style={{ fontFamily: mono, color: RED2 }}>{n.time}</span>
                <span className="text-xs" style={{ fontFamily: body, color: T2 }}>{n.headline}</span>
              </div>
            ))}
          </BroadsideCard>
          <BroadsideCard title="Sectors">
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${TAN}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{s.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: s.value.startsWith("+") ? GRN : RED2 }}>{s.value}</span>
              </div>
            ))}
          </BroadsideCard>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: INK }}>
        <div className="mx-auto max-w-5xl px-6 py-4 text-center text-[9px] uppercase tracking-[0.2em]" style={{ fontFamily: mono, color: `${CREAM}55` }}>
          Zero Sum — 12-H: Letterpress Broadside · Sample Data Only · © 2026
        </div>
      </footer>
    </div>
  );
}
