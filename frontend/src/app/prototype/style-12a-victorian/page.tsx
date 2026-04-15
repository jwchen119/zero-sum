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
   Style 12-A — Victorian Financial Gazette (1880s–1900s)
   Aged parchment, heavy ornamental rules, drop caps, multi-
   column broadsheet layout, decorative flourishes, Didone
   serif type, engraved-illustration chart style.
   ══════════════════════════════════════════════════════════════ */

const BG  = "#f0e6d3";   // aged parchment
const BG2 = "#e8dcc6";   // slightly darker parchment
const INK = "#1a1108";   // deep brown-black
const SEP = "#8b7355";   // sepia brown
const OX  = "#6b1d1d";   // oxblood red
const GLD = "#b8860b";   // aged gold
const GRN = "#2d4a2d";   // deep forest green
const TM  = "#8b7d6b";   // muted tan
const T2  = "#5c4d3c";   // secondary brown

const serif   = "'Playfair Display', 'Libre Baskerville', Georgia, serif";
const body    = "'Source Serif Pro', Georgia, 'Charter', serif";
const mono    = "'IBM Plex Mono', Menlo, monospace";
const display = "'Playfair Display', 'Georgia', serif";

const nClr = (n: number) => (n >= 0 ? GRN : OX);

/* ── Ornamental divider ── */
function Ornament({ char = "❧" }: { char?: string }) {
  return (
    <div className="flex items-center gap-4 my-6" style={{ color: SEP }}>
      <div className="flex-1 h-px" style={{ background: SEP }} />
      <span className="text-lg" style={{ fontFamily: display }}>{char}</span>
      <div className="flex-1 h-px" style={{ background: SEP }} />
    </div>
  );
}

/* ── Heavy double rule ── */
function DoubleRule() {
  return (
    <div className="my-8">
      <div className="h-[3px]" style={{ background: INK }} />
      <div className="h-[1px] mt-[2px]" style={{ background: INK }} />
    </div>
  );
}

/* ── Thin rule ── */
function ThinRule() {
  return <div className="h-px my-4" style={{ background: SEP }} />;
}

/* ── Drop cap paragraph ── */
function DropCapP({ text }: { text: string }) {
  const first = text[0];
  const rest = text.slice(1);
  return (
    <p className="text-[15px] leading-relaxed" style={{ fontFamily: body, color: T2 }}>
      <span className="float-left text-6xl font-bold leading-[0.8] mr-2 mt-1" style={{ fontFamily: display, color: OX }}>{first}</span>
      {rest}
    </p>
  );
}

/* ── Framed card with ornamental corners ── */
function FramedCard({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative border-2 p-5 ${className}`} style={{ borderColor: SEP, background: BG }}>
      {/* corner ornaments */}
      <span className="absolute -top-2 -left-2 text-sm" style={{ color: GLD, background: BG, padding: "0 4px" }}>✦</span>
      <span className="absolute -top-2 -right-2 text-sm" style={{ color: GLD, background: BG, padding: "0 4px" }}>✦</span>
      <span className="absolute -bottom-2 -left-2 text-sm" style={{ color: GLD, background: BG, padding: "0 4px" }}>✦</span>
      <span className="absolute -bottom-2 -right-2 text-sm" style={{ color: GLD, background: BG, padding: "0 4px" }}>✦</span>
      {title && (
        <>
          <h3 className="text-lg font-bold tracking-wide text-center uppercase" style={{ fontFamily: display, color: INK, letterSpacing: "0.12em" }}>{title}</h3>
          <ThinRule />
        </>
      )}
      {children}
    </div>
  );
}

/* ── Section heading with triple rule ── */
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mt-12 mb-6 text-center">
      <div className="h-[2px] mb-1" style={{ background: INK }} />
      <div className="h-px mb-1" style={{ background: SEP }} />
      <div className="h-[2px]" style={{ background: INK }} />
      <h2 className="text-3xl font-bold tracking-wide uppercase mt-4 mb-1" style={{ fontFamily: display, color: INK, letterSpacing: "0.15em" }}>{title}</h2>
      {sub && <p className="text-xs uppercase tracking-[0.25em] font-semibold" style={{ fontFamily: mono, color: TM }}>{sub}</p>}
      <div className="h-px mt-4" style={{ background: SEP }} />
    </div>
  );
}

/* ── Sparkline ── */
function Spark({ positive }: { positive: boolean }) {
  const pts = positive
    ? "0,22 10,19 20,21 30,16 40,18 50,12 60,14 70,9 80,11 90,7 100,5"
    : "0,5 10,8 20,6 30,12 40,9 50,15 60,13 70,18 80,20 90,16 100,22";
  return (
    <svg width="80" height="24" viewBox="0 0 100 28" className="inline-block">
      <polyline points={pts} fill="none" stroke={positive ? GRN : OX} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Range ── */
function VRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2" style={{ fontFamily: mono, color: TM }}>{label}</div>
      <div className="relative h-[3px]" style={{ background: SEP }}>
        <div className="absolute h-full" style={{ width: `${p}%`, background: INK }} />
        <div className="absolute top-[-4px] w-3 h-3 rounded-full border-2" style={{ left: `calc(${p}% - 6px)`, background: BG, borderColor: OX }} />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums mt-1.5" style={{ fontFamily: mono, color: TM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function VictorianGazettePrototype() {
  return (
    <div className="min-h-screen" style={{ background: BG, color: INK }}>

      {/* ── MASTHEAD ── */}
      <header className="text-center pt-6 pb-2 mx-auto max-w-5xl px-6">
        <div className="flex items-center justify-between mb-3">
          <Link href="/prototype" className="text-xs hover:underline" style={{ fontFamily: mono, color: OX }}>← All Styles</Link>
          <span className="text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: mono, color: TM }}>Est. 1882 · Vol. CLXII · No. 47,291</span>
          <span className="text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: mono, color: TM }}>March 3, 2026</span>
        </div>
        <div className="h-[3px]" style={{ background: INK }} />
        <div className="h-[1px] mt-[2px]" style={{ background: INK }} />

        <Link href="/prototype" className="hover:opacity-80 transition-opacity">
          <h1 className="text-6xl font-black tracking-[0.2em] uppercase mt-6 mb-1" style={{ fontFamily: display, color: INK }}>The Zero Sum</h1>
        </Link>
        <p className="text-sm uppercase tracking-[0.35em] mb-1" style={{ fontFamily: display, color: SEP }}>Financial Gazette & Market Intelligence</p>
        <Ornament char="❦" />

        <div className="flex justify-center gap-6 text-[10px] uppercase tracking-[0.25em] font-semibold" style={{ fontFamily: mono, color: T2 }}>
          <span>Markets</span><span>·</span><span>Earnings</span><span>·</span><span>Analysis</span><span>·</span><span>Dividends</span><span>·</span><span>Securities</span>
        </div>

        <div className="h-[1px] mt-4" style={{ background: INK }} />
        <div className="h-[3px] mt-[2px]" style={{ background: INK }} />
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-12">

        {/* ── PRICE HERO ── */}
        <div className="py-8 border-b-2" style={{ borderColor: INK }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-5xl font-black tracking-wide" style={{ fontFamily: display }}>{STOCK.ticker}</h2>
              <p className="text-base mt-2" style={{ fontFamily: body, color: T2 }}>{STOCK.name} — {STOCK.sector} / {STOCK.industry}</p>
              <span className="inline-block text-[10px] uppercase tracking-[0.2em] font-semibold mt-2 border px-2 py-0.5" style={{ fontFamily: mono, color: TM, borderColor: SEP }}>{STOCK.exchange}</span>
            </div>
            <div className="flex items-end gap-4">
              <span className="text-5xl font-light tabular-nums" style={{ fontFamily: display }}>{usd(STOCK.price)}</span>
              <div className="flex flex-col items-end pb-1">
                <span className="text-xl font-bold tabular-nums" style={{ fontFamily: mono, color: nClr(STOCK.change) }}>
                  {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                </span>
                <span className="text-sm tabular-nums" style={{ fontFamily: mono, color: nClr(STOCK.changePct) }}>({pct(STOCK.changePct)})</span>
              </div>
              <Spark positive={STOCK.change >= 0} />
            </div>
          </div>
        </div>

        {/* ── Key Stats in 4-column broadsheet ── */}
        <div className="grid grid-cols-4 gap-4 py-6 border-b" style={{ borderColor: SEP }}>
          {[
            { l: "Market Capitalisation", v: fmt(STOCK.marketCap) },
            { l: "Price-to-Earnings", v: STOCK.pe.toFixed(1) },
            { l: "Earnings per Share", v: usd(STOCK.eps) },
            { l: "Beta Coefficient", v: STOCK.beta.toFixed(2) },
            { l: "Dividend Yield", v: `${STOCK.dividendYield.toFixed(2)}%` },
            { l: "52-Week High", v: usd(STOCK.week52High) },
            { l: "52-Week Low", v: usd(STOCK.week52Low) },
            { l: "Avg Daily Volume", v: fmt(STOCK.avgVolume) },
          ].map((s) => (
            <div key={s.l} className="text-center py-2">
              <div className="text-[9px] uppercase tracking-[0.2em] font-semibold mb-1" style={{ fontFamily: mono, color: TM }}>{s.l}</div>
              <div className="text-lg font-bold tabular-nums" style={{ fontFamily: display }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── CHART — engraved style ── */}
        <SectionHead title="Price History" sub="Twelve-Month Performance" />
        <div className="border-2 p-4 mb-2" style={{ borderColor: SEP }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ fontFamily: mono, color: TM }}>Daily Close</span>
            <div className="flex gap-4 text-[10px] uppercase tracking-[0.15em]" style={{ fontFamily: mono, color: TM }}>
              {["1D", "5D", "1M", "3M", "1Y", "5Y"].map((p) => (
                <button key={p} className="hover:underline" style={{ color: p === "1Y" ? OX : TM, fontWeight: p === "1Y" ? 700 : 400 }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-56" style={{ background: BG2 }}>
            <svg className="w-full h-full p-4" preserveAspectRatio="none" viewBox="0 0 400 160">
              <defs>
                <pattern id="vGrid" width="40" height="20" patternUnits="userSpaceOnUse">
                  <line x1="40" y1="0" x2="40" y2="20" stroke={SEP} strokeWidth="0.3" />
                  <line x1="0" y1="20" x2="40" y2="20" stroke={SEP} strokeWidth="0.3" />
                </pattern>
              </defs>
              <rect width="400" height="160" fill="url(#vGrid)" />
              <polyline points="0,140 25,135 50,138 75,122 100,128 125,112 150,118 175,100 200,106 225,88 250,95 275,78 300,84 325,68 350,72 375,60 400,52" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* ── Company Description — multi-column broadsheet with drop cap ── */}
        <SectionHead title="Company Profile" sub="Corporate Intelligence" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <DropCapP text={COMPANY_DESCRIPTION} />
            <ThinRule />
            <div className="grid grid-cols-3 gap-y-3 gap-x-4">
              {[
                { l: "Chief Executive", v: STOCK.ceo },
                { l: "Headquarters", v: STOCK.headquarters },
                { l: "Employees", v: STOCK.employees.toLocaleString() },
                { l: "Year Founded", v: STOCK.founded },
                { l: "Floated", v: STOCK.ipoDate },
                { l: "Fiscal Year", v: STOCK.fiscalYearEnd },
              ].map((item) => (
                <div key={item.l}>
                  <span className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ fontFamily: mono, color: TM }}>{item.l}</span>
                  <div className="text-sm font-bold mt-0.5" style={{ fontFamily: body }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <FramedCard title="Trading Ranges">
              <VRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Intraday" />
              <VRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week" />
              <ThinRule />
              {[
                { l: "Opening Price", v: usd(STOCK.open) },
                { l: "Previous Close", v: usd(STOCK.prevClose) },
                { l: "Average Volume", v: fmt(STOCK.avgVolume) },
              ].map((r) => (
                <div key={r.l} className="flex justify-between py-1 text-sm">
                  <span style={{ fontFamily: mono, color: TM, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em" }}>{r.l}</span>
                  <span className="font-bold tabular-nums" style={{ fontFamily: body }}>{r.v}</span>
                </div>
              ))}
            </FramedCard>
          </div>
        </div>

        {/* ── Segments ── */}
        <SectionHead title="Business Divisions" sub="Revenue Composition" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {SEGMENTS.map((seg) => (
            <div key={seg.name} className="border-l-2 pl-4 py-2" style={{ borderColor: GLD }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold" style={{ fontFamily: display }}>{seg.name}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: OX }}>{seg.revenue} ({seg.pct}%)</span>
              </div>
              <div className="h-[3px] mb-2" style={{ background: BG2 }}>
                <div className="h-full" style={{ width: `${seg.pct * 2}%`, background: INK }} />
              </div>
              <p className="text-xs leading-relaxed" style={{ fontFamily: body, color: T2 }}>{seg.description}</p>
            </div>
          ))}
        </div>

        {/* ── AI Analysis ── */}
        <SectionHead title="Analytical Commentary" sub="Mechanised Intelligence" />
        <div className="border-l-4 pl-4 mb-4" style={{ borderColor: GLD }}>
          <p className="text-[15px] italic leading-relaxed" style={{ fontFamily: body, color: T2 }}>{AI_ANALYSIS.summary}</p>
        </div>
        <h4 className="text-sm font-bold uppercase tracking-[0.15em] mb-2" style={{ fontFamily: display, color: OX }}>Prognostication</h4>
        <p className="text-[15px] leading-relaxed mb-2" style={{ fontFamily: body, color: T2 }}>{AI_ANALYSIS.outlook}</p>

        {/* ── Bull / Bear — side by side framed ── */}
        <SectionHead title="The Case For & Against" sub="Opposing Perspectives" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FramedCard title={`The Bull Case — ${BULL_CASE.title}`}>
            <p className="text-sm leading-relaxed mb-3" style={{ fontFamily: body, color: T2 }}>{BULL_CASE.thesis}</p>
            <ThinRule />
            {BULL_CASE.keyMetrics.map((m, i) => (
              <div key={m.label} className="flex justify-between py-1.5 text-sm" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <span style={{ fontFamily: mono, fontSize: "10px", color: TM, textTransform: "uppercase", letterSpacing: "0.12em" }}>{m.label}</span>
                <span className="font-bold tabular-nums" style={{ fontFamily: body, color: GRN }}>{m.value}</span>
              </div>
            ))}
          </FramedCard>
          <FramedCard title={`The Bear Case — ${BEAR_CASE.title}`}>
            <p className="text-sm leading-relaxed mb-3" style={{ fontFamily: body, color: T2 }}>{BEAR_CASE.thesis}</p>
            <ThinRule />
            {BEAR_CASE.keyMetrics.map((m, i) => (
              <div key={m.label} className="flex justify-between py-1.5 text-sm" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <span style={{ fontFamily: mono, fontSize: "10px", color: TM, textTransform: "uppercase", letterSpacing: "0.12em" }}>{m.label}</span>
                <span className="font-bold tabular-nums" style={{ fontFamily: body, color: OX }}>{m.value}</span>
              </div>
            ))}
          </FramedCard>
        </div>

        {/* ── Analyst Consensus ── */}
        <SectionHead title="Broker Recommendations" sub="Analyst Consensus" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FramedCard title="Summary of Opinion" className="lg:col-span-1">
            <div className="text-center mb-4">
              <div className="text-4xl font-black" style={{ fontFamily: display, color: GRN }}>{ANALYST_CONSENSUS.rating}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ fontFamily: mono, color: TM }}>Consensus Rating</div>
            </div>
            <div className="flex gap-px h-2.5 mb-2">
              <div className="rounded-l" style={{ flex: ANALYST_CONSENSUS.buy, background: GRN }} />
              <div style={{ flex: ANALYST_CONSENSUS.overweight, background: `${GRN}88` }} />
              <div style={{ flex: ANALYST_CONSENSUS.hold, background: SEP }} />
              <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${OX}88` }} />
              <div className="rounded-r" style={{ flex: ANALYST_CONSENSUS.sell, background: OX }} />
            </div>
            <div className="flex justify-between text-[9px] font-semibold mb-4" style={{ fontFamily: mono, color: TM }}>
              <span>Buy {ANALYST_CONSENSUS.buy}</span><span>Hold {ANALYST_CONSENSUS.hold}</span><span>Sell {ANALYST_CONSENSUS.sell}</span>
            </div>
            <ThinRule />
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { l: "Low", v: usd(ANALYST_CONSENSUS.lowTarget), c: OX },
                { l: "Average", v: usd(ANALYST_CONSENSUS.avgTarget), c: INK },
                { l: "High", v: usd(ANALYST_CONSENSUS.highTarget), c: GRN },
              ].map((t) => (
                <div key={t.l}>
                  <div className="text-[9px] uppercase tracking-[0.15em]" style={{ fontFamily: mono, color: TM }}>{t.l}</div>
                  <div className="text-sm font-bold tabular-nums" style={{ fontFamily: body, color: t.c }}>{t.v}</div>
                </div>
              ))}
            </div>
          </FramedCard>
          <div className="lg:col-span-2">
            <div className="border-t-2 mb-4" style={{ borderColor: INK }}>
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] mt-3 mb-4" style={{ fontFamily: display }}>Individual Recommendations</h3>
            </div>
            {ANALYSTS.map((a, i) => (
              <div key={a.firm} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <div>
                  <div className="text-sm font-bold" style={{ fontFamily: body }}>{a.firm}</div>
                  <div className="text-[10px]" style={{ fontFamily: mono, color: TM }}>{a.analyst} · {a.date}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: mono, color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? GRN : a.rating.includes("Sell") || a.rating.includes("Underperform") ? OX : T2 }}>{a.rating}</span>
                  <div className="text-sm font-bold tabular-nums" style={{ fontFamily: body }}>{usd(a.target)}</div>
                </div>
              </div>
            ))}
            <Ornament char="※" />
            {ANALYST_COMMENTARY.map((c, i) => (
              <div key={i} className={i > 0 ? "pt-4" : ""} style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <h4 className="text-sm font-bold" style={{ fontFamily: display }}>{c.title}</h4>
                <span className="text-[10px]" style={{ fontFamily: mono, color: TM }}>{c.firm} — {c.analyst} · {c.date}</span>
                <p className="text-sm leading-relaxed mt-1.5" style={{ fontFamily: body, color: T2 }}>{c.snippet}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Earnings ── */}
        <SectionHead title="Quarterly Earnings Record" sub="Historical Performance" />
        <div className="border-2 overflow-x-auto" style={{ borderColor: SEP }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: BG2 }}>
                {["Quarter", "Reported", "EPS Est.", "EPS Act.", "Revenue", "Growth", "Surprise"].map((h) => (
                  <th key={h} className={`py-2.5 px-3 text-[9px] uppercase tracking-[0.15em] font-semibold ${h === "Quarter" || h === "Reported" ? "text-left" : "text-right"}`} style={{ fontFamily: mono, color: TM, borderBottom: `2px solid ${INK}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EARNINGS.map((e, i) => (
                <tr key={e.quarter} style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                  <td className="py-2 px-3 font-bold" style={{ fontFamily: display, color: OX }}>{e.quarter}</td>
                  <td className="py-2 px-3" style={{ fontFamily: mono, fontSize: "11px", color: TM }}>{e.date}</td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: TM }}>{usd(e.epsEst)}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: e.epsActual >= e.epsEst ? GRN : OX }}>{usd(e.epsActual)}</td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{e.revenue}</td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: e.revenueGrowth >= 0 ? GRN : OX }}>{pct(e.revenueGrowth)}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: e.surprise.startsWith("+") ? GRN : OX }}>{e.surprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Financial Statements ── */}
        <SectionHead title="Financial Statements" sub="Annual Summary" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { title: "Income Statement", data: INCOME_STATEMENT, hasYoy: true },
            { title: "Balance Sheet", data: BALANCE_SHEET, hasYoy: false },
            { title: "Cash Flows", data: CASH_FLOW, hasYoy: true },
          ].map((section) => (
            <FramedCard key={section.title} title={section.title}>
              {section.data.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                  <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: row.value.startsWith("-") ? OX : INK }}>{row.value}</span>
                    {section.hasYoy && typeof (row as unknown as { yoy?: string }).yoy === "string" && (
                      <span className="text-[10px] tabular-nums" style={{ fontFamily: mono, color: (row as unknown as { yoy: string }).yoy.startsWith("+") ? GRN : (row as unknown as { yoy: string }).yoy.startsWith("−") ? OX : TM }}>{(row as unknown as { yoy: string }).yoy}</span>
                    )}
                  </div>
                </div>
              ))}
            </FramedCard>
          ))}
        </div>

        {/* ── Risks & Catalysts ── */}
        <SectionHead title="Risks & Catalysts" sub="Material Considerations" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-t-2" style={{ borderColor: OX }}>
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] mt-3 mb-4" style={{ fontFamily: display, color: OX }}>Principal Risks</h3>
            {KEY_RISKS.map((r, i) => (
              <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold" style={{ fontFamily: display }}>{r.title}</h4>
                  <span className="text-[9px] font-bold uppercase tracking-wider border px-1.5 py-0.5" style={{ fontFamily: mono, color: r.severity === "High" ? OX : r.severity === "Medium" ? GLD : TM, borderColor: r.severity === "High" ? OX : r.severity === "Medium" ? GLD : SEP }}>{r.severity}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: body, color: T2 }}>{r.description}</p>
              </div>
            ))}
          </div>
          <div className="border-t-2" style={{ borderColor: GRN }}>
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] mt-3 mb-4" style={{ fontFamily: display, color: GRN }}>Forthcoming Catalysts</h3>
            {CATALYSTS.map((c, i) => (
              <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold" style={{ fontFamily: display }}>{c.title}</h4>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ fontFamily: mono, color: GLD }}>{c.timeline}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: body, color: T2 }}>{c.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Competitors ── */}
        <SectionHead title="Comparable Securities" sub="Peer Analysis" />
        <div className="border-2 overflow-x-auto" style={{ borderColor: SEP }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: BG2 }}>
                <th className="text-left py-2 px-3 text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ fontFamily: mono, color: TM, borderBottom: `2px solid ${INK}` }}>Company</th>
                <th className="text-right py-2 px-3 text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ fontFamily: mono, color: TM, borderBottom: `2px solid ${INK}` }}>Mkt Cap</th>
                <th className="text-right py-2 px-3 text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ fontFamily: mono, color: TM, borderBottom: `2px solid ${INK}` }}>P/E</th>
                <th className="text-right py-2 px-3 text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ fontFamily: mono, color: TM, borderBottom: `2px solid ${INK}` }}>Revenue</th>
                <th className="text-right py-2 px-3 text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ fontFamily: mono, color: TM, borderBottom: `2px solid ${INK}` }}>Margin</th>
                <th className="text-right py-2 px-3 text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ fontFamily: mono, color: TM, borderBottom: `2px solid ${INK}` }}>Growth</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c, i) => (
                <tr key={c.ticker} style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                  <td className="py-2 px-3"><span className="font-bold" style={{ fontFamily: display, color: OX }}>{c.ticker}</span> <span style={{ fontFamily: body, color: TM }}>{c.name}</span></td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{c.marketCap}</td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: T2 }}>{c.pe}</td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{c.revenue}</td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: T2 }}>{c.margin}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: c.growth.startsWith("+") ? GRN : OX }}>{c.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Valuation, Technicals, Dividends ── */}
        <SectionHead title="Valuation & Technical Data" sub="Quantitative Measures" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FramedCard title="Valuation Ratios">
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className="flex justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{r.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{r.value}</span>
              </div>
            ))}
          </FramedCard>
          <FramedCard title="Technical Indicators">
            {[
              { l: "SMA 20", v: usd(TECHNICALS.sma20), s: STOCK.price > TECHNICALS.sma20 },
              { l: "SMA 50", v: usd(TECHNICALS.sma50), s: STOCK.price > TECHNICALS.sma50 },
              { l: "SMA 200", v: usd(TECHNICALS.sma200), s: STOCK.price > TECHNICALS.sma200 },
              { l: "RSI (14)", v: TECHNICALS.rsi14.toString(), s: TECHNICALS.rsi14 < 70 },
              { l: "Trend", v: TECHNICALS.trend, s: TECHNICALS.trend === "Uptrend" },
              { l: "MACD Signal", v: TECHNICALS.macdSignal, s: TECHNICALS.macdSignal.includes("Bullish") },
              { l: "Support", v: usd(TECHNICALS.support1), s: true },
              { l: "Resistance", v: usd(TECHNICALS.resistance1), s: false },
            ].map((t, i) => (
              <div key={t.l} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{t.l}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: t.s ? GRN : OX }}>{t.v}</span>
              </div>
            ))}
          </FramedCard>
          <FramedCard title="Dividend History">
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <span className="text-sm font-bold" style={{ fontFamily: display, color: OX }}>{d.year}</span>
                <div className="flex items-center gap-3 text-sm tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>
                  <span className="font-bold">{d.annual}</span>
                  <span style={{ color: TM }}>{d.yield}</span>
                  <span style={{ color: GRN }}>{d.growth}</span>
                </div>
              </div>
            ))}
          </FramedCard>
        </div>

        {/* ── Holders & ESG ── */}
        <SectionHead title="Proprietors & Governance" sub="Institutional Holdings & ESG" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-t-2" style={{ borderColor: INK }}>
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] mt-3 mb-4" style={{ fontFamily: display }}>Principal Shareholders</h3>
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body }}>{h.name}</span>
                <div className="flex items-center gap-3 text-sm tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>
                  <span style={{ color: TM }}>{h.shares}</span>
                  <span className="font-bold w-10 text-right" style={{ color: OX }}>{h.pct}</span>
                  <span className="w-16 text-right" style={{ color: T2 }}>{h.value}</span>
                </div>
              </div>
            ))}
          </div>
          <FramedCard title={`ESG Assessment — ${ESG.provider}`}>
            <div className="text-center mb-4">
              <div className="text-3xl font-black" style={{ fontFamily: display, color: GRN }}>{ESG.rating}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              {[
                { l: "Environment", s: ESG.environmentScore },
                { l: "Social", s: ESG.socialScore },
                { l: "Governance", s: ESG.governanceScore },
              ].map((e) => (
                <div key={e.l}>
                  <div className="text-xl font-bold" style={{ fontFamily: display, color: GLD }}>{e.s}</div>
                  <div className="text-[8px] uppercase tracking-[0.2em]" style={{ fontFamily: mono, color: TM }}>{e.l}</div>
                </div>
              ))}
            </div>
            <ThinRule />
            {ESG.highlights.map((h, i) => (
              <p key={i} className="text-sm leading-relaxed mb-1" style={{ fontFamily: body, color: T2 }}>
                <span style={{ color: GLD }}>❧</span> {h}
              </p>
            ))}
          </FramedCard>
        </div>

        {/* ── Watchlist + News + Sector in 3-col broadsheet ── */}
        <DoubleRule />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ columnRule: `1px solid ${SEP}` }}>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] border-b-2 pb-1 mb-4" style={{ fontFamily: display, borderColor: INK }}>Market Board</h3>
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <div>
                  <span className="text-sm font-bold" style={{ fontFamily: display }}>{w.ticker}</span>
                  <span className="text-[9px] ml-1" style={{ fontFamily: mono, color: TM }}>{w.volume}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{usd(w.price)}</span>
                  <span className="text-[10px] ml-2 tabular-nums" style={{ fontFamily: mono, color: w.change >= 0 ? GRN : OX }}>{pct(w.change)}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] border-b-2 pb-1 mb-4" style={{ fontFamily: display, borderColor: INK }}>News Wire</h3>
            {NEWS.map((n, i) => (
              <div key={i} className="py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <span className="text-[10px] font-bold mr-1" style={{ fontFamily: mono, color: OX }}>{n.time}</span>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{n.headline}</span>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] border-b-2 pb-1 mb-4" style={{ fontFamily: display, borderColor: INK }}>Sector Performance</h3>
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SEP}` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{s.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: s.value.startsWith("+") ? GRN : OX }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── Colophon ── */}
      <footer className="py-6 text-center" style={{ background: BG }}>
        <div className="mx-auto max-w-5xl px-6">
          <div className="h-[3px]" style={{ background: INK }} />
          <div className="h-[1px] mt-[2px] mb-4" style={{ background: INK }} />
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: mono, color: TM }}>
            The Zero Sum Financial Gazette · Style 12-A: Victorian · Est. 1882 · Sample Data Only · © 2026
          </p>
          <Ornament char="⁂" />
        </div>
      </footer>
    </div>
  );
}
