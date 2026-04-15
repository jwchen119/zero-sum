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
   Style 12-B — Art Deco Financial Times (1920s–30s)
   Geometric precision, Jazz-age Wall Street, burnished gold
   on deep navy. Condensed sans + elegant serif. Stepped
   borders, sunburst motifs, gold pinstripes.
   ══════════════════════════════════════════════════════════════ */

const BG   = "#f5f0e0";   // rich ivory/linen
const BG2  = "#ede5cf";   // slightly deeper ivory
const NAVY = "#1a1a3e";   // deep navy
const GOLD = "#c5a55a";   // burnished gold
const HUNT = "#234d32";   // hunter green
const CRIM = "#9b1b30";   // deco crimson
const TAN  = "#8c7d63";   // warm muted tan
const TX   = "#1a1a2e";   // near-black with navy
const T2   = "#4a4545";   // secondary
const TM   = "#918a7a";   // muted

const display = "'Playfair Display', Georgia, serif";
const heading = "'Inter', 'Helvetica Neue', system-ui, sans-serif";
const body    = "'Source Serif Pro', Georgia, 'Charter', serif";
const mono    = "'IBM Plex Mono', Menlo, monospace";

const nClr = (n: number) => (n >= 0 ? HUNT : CRIM);

/* ── Gold stepped border card ── */
function DecoCard({ title, children, className = "", accent = GOLD }: { title?: string; children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <div className={`relative ${className}`} style={{ background: BG }}>
      {/* stepped border — outer */}
      <div className="absolute inset-0 border" style={{ borderColor: accent }} />
      <div className="absolute inset-[3px] border" style={{ borderColor: accent }} />
      <div className="relative p-5 m-[6px]">
        {title && (
          <>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.25em] text-center mb-3" style={{ fontFamily: heading, color: accent }}>{title}</h3>
            <div className="h-px" style={{ background: accent }} />
            <div className="h-px mt-[2px] mb-4" style={{ background: `${accent}40` }} />
          </>
        )}
        {children}
      </div>
    </div>
  );
}

/* ── Section heading with geometric chevron ── */
function DecoSection({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mt-12 mb-6">
      {/* gold pinstripe top */}
      <div className="h-px" style={{ background: GOLD }} />
      <div className="h-px mt-[2px]" style={{ background: `${GOLD}50` }} />
      {/* chevron accent */}
      <div className="flex items-center gap-3 mt-4 mb-2">
        <svg width="20" height="12" viewBox="0 0 20 12"><polygon points="0,6 6,0 12,6 6,12" fill={GOLD} /><polygon points="8,6 14,0 20,6 14,12" fill={`${GOLD}60`} /></svg>
        <h2 className="text-2xl font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: heading, color: NAVY }}>{title}</h2>
      </div>
      {sub && <p className="text-[10px] uppercase tracking-[0.3em] font-semibold ml-8" style={{ fontFamily: mono, color: TAN }}>{sub}</p>}
      <div className="h-px mt-3" style={{ background: `${GOLD}50` }} />
      <div className="h-px mt-[2px]" style={{ background: GOLD }} />
    </div>
  );
}

/* ── Gold thin rule ── */
function GoldRule() { return <div className="h-px my-4" style={{ background: GOLD }} />; }
function ThinGold() { return <div className="h-px my-3" style={{ background: `${GOLD}40` }} />; }

/* ── Sparkline ── */
function Spark({ positive }: { positive: boolean }) {
  const pts = positive
    ? "0,22 10,19 20,21 30,16 40,18 50,12 60,14 70,9 80,11 90,7 100,5"
    : "0,5 10,8 20,6 30,12 40,9 50,15 60,13 70,18 80,20 90,16 100,22";
  return (
    <svg width="80" height="24" viewBox="0 0 100 28" className="inline-block">
      <polyline points={pts} fill="none" stroke={positive ? HUNT : CRIM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Range ── */
function DecoRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-5">
      <div className="text-[9px] uppercase tracking-[0.2em] font-extrabold mb-2" style={{ fontFamily: heading, color: TAN }}>{label}</div>
      <div className="relative h-[3px]" style={{ background: `${GOLD}30` }}>
        <div className="absolute h-full" style={{ width: `${p}%`, background: GOLD }} />
        <div className="absolute top-[-5px] w-4 h-4 rotate-45" style={{ left: `calc(${p}% - 8px)`, background: BG, border: `2px solid ${GOLD}` }} />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums mt-2" style={{ fontFamily: mono, color: TAN }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ── Sunburst divider ── */
function Sunburst() {
  return (
    <div className="flex items-center justify-center my-6">
      <svg width="60" height="24" viewBox="0 0 60 24">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1="30" y1="12" x2={30 + Math.cos((i * Math.PI) / 8 - Math.PI / 2) * 28} y2={12 + Math.sin((i * Math.PI) / 8 - Math.PI / 2) * 11} stroke={GOLD} strokeWidth="1" opacity={0.4 + i * 0.06} />
        ))}
        <circle cx="30" cy="12" r="3" fill={GOLD} />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function ArtDecoPrototype() {
  return (
    <div className="min-h-screen" style={{ background: BG, color: TX }}>

      {/* ── MASTHEAD — geometric Art Deco ── */}
      <header style={{ background: NAVY }}>
        <div className="mx-auto max-w-6xl px-6">
          {/* Gold pinstripes */}
          <div className="pt-4 flex gap-[2px]">
            <div className="flex-1 h-px" style={{ background: GOLD }} />
            <div className="flex-1 h-px" style={{ background: `${GOLD}60` }} />
            <div className="flex-1 h-px" style={{ background: GOLD }} />
          </div>

          <div className="flex items-center justify-between py-2 mt-2">
            <Link href="/prototype" className="text-[10px] uppercase tracking-[0.2em] font-semibold hover:underline" style={{ fontFamily: mono, color: `${GOLD}aa` }}>← All Styles</Link>
            <span className="text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: mono, color: `${GOLD}80` }}>March 3, 2026 · Edition XLII</span>
          </div>

          {/* Main title */}
          <div className="text-center py-6">
            <div className="flex items-center justify-center gap-4 mb-2">
              <svg width="30" height="30" viewBox="0 0 30 30"><polygon points="15,0 30,15 15,30 0,15" fill="none" stroke={GOLD} strokeWidth="1.5" /><polygon points="15,5 25,15 15,25 5,15" fill="none" stroke={GOLD} strokeWidth="0.5" /></svg>
              <Link href="/prototype" className="hover:opacity-80 transition-opacity">
                <h1 className="text-5xl font-extrabold uppercase tracking-[0.3em]" style={{ fontFamily: heading, color: GOLD }}>Zero Sum</h1>
              </Link>
              <svg width="30" height="30" viewBox="0 0 30 30"><polygon points="15,0 30,15 15,30 0,15" fill="none" stroke={GOLD} strokeWidth="1.5" /><polygon points="15,5 25,15 15,25 5,15" fill="none" stroke={GOLD} strokeWidth="0.5" /></svg>
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em]" style={{ fontFamily: mono, color: `${GOLD}99` }}>Financial Research & Market Intelligence</p>
          </div>

          {/* Nav bar */}
          <div className="flex justify-center gap-8 pb-4 text-[9px] uppercase tracking-[0.25em] font-extrabold" style={{ fontFamily: heading, color: `${GOLD}88` }}>
            <span>Markets</span><span>◆</span><span>Earnings</span><span>◆</span><span>Analysis</span><span>◆</span><span>Portfolio</span><span>◆</span><span>Research</span>
          </div>

          {/* Bottom pinstripes */}
          <div className="pb-1 flex gap-[2px]">
            <div className="flex-1 h-px" style={{ background: GOLD }} />
            <div className="flex-1 h-px" style={{ background: `${GOLD}60` }} />
            <div className="flex-1 h-px" style={{ background: GOLD }} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">

        {/* ── Price Hero ── */}
        <div className="py-8 border-b-2" style={{ borderColor: NAVY }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl font-extrabold tracking-wide uppercase" style={{ fontFamily: heading }}>{STOCK.ticker}</span>
                <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] border px-2 py-0.5" style={{ fontFamily: heading, color: TAN, borderColor: GOLD }}>{STOCK.exchange}</span>
              </div>
              <p className="text-sm" style={{ fontFamily: body, color: T2 }}>{STOCK.name} — {STOCK.sector} / {STOCK.industry}</p>
            </div>
            <div className="flex items-end gap-5">
              <span className="text-5xl font-light tabular-nums" style={{ fontFamily: display }}>{usd(STOCK.price)}</span>
              <div className="flex flex-col items-end pb-1">
                <span className="text-xl font-extrabold tabular-nums" style={{ fontFamily: mono, color: nClr(STOCK.change) }}>
                  {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                </span>
                <span className="text-sm tabular-nums" style={{ fontFamily: mono, color: nClr(STOCK.changePct) }}>({pct(STOCK.changePct)})</span>
              </div>
              <Spark positive={STOCK.change >= 0} />
            </div>
          </div>
        </div>

        {/* ── Stats — geometric grid ── */}
        <div className="grid grid-cols-4 gap-3 py-6">
          {[
            { l: "Mkt Cap", v: fmt(STOCK.marketCap) },
            { l: "P/E Ratio", v: STOCK.pe.toFixed(1) },
            { l: "EPS", v: usd(STOCK.eps) },
            { l: "Beta", v: STOCK.beta.toFixed(2) },
            { l: "Div Yield", v: `${STOCK.dividendYield.toFixed(2)}%` },
            { l: "52W High", v: usd(STOCK.week52High) },
            { l: "52W Low", v: usd(STOCK.week52Low) },
            { l: "Volume", v: fmt(STOCK.volume) },
          ].map((s) => (
            <div key={s.l} className="text-center py-3 border" style={{ borderColor: `${GOLD}40` }}>
              <div className="text-[8px] font-extrabold uppercase tracking-[0.25em] mb-1" style={{ fontFamily: heading, color: TAN }}>{s.l}</div>
              <div className="text-lg font-bold tabular-nums" style={{ fontFamily: display }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── Chart ── */}
        <DecoSection title="Price Chart" sub="Historical Performance" />
        <DecoCard>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: heading, color: TAN }}>Daily Close</span>
            <div className="flex gap-3">
              {["1D", "5D", "1M", "3M", "1Y", "5Y"].map((p) => (
                <button key={p} className="text-[10px] font-extrabold uppercase tracking-wider" style={{ fontFamily: heading, color: p === "1Y" ? NAVY : TAN }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-56" style={{ background: BG2 }}>
            <svg className="w-full h-full p-4" preserveAspectRatio="none" viewBox="0 0 400 160">
              <defs>
                <linearGradient id="decoG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points="0,140 25,135 50,138 75,122 100,128 125,112 150,118 175,100 200,106 225,88 250,95 275,78 300,84 325,68 350,72 375,60 400,52" fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,140 25,135 50,138 75,122 100,128 125,112 150,118 175,100 200,106 225,88 250,95 275,78 300,84 325,68 350,72 375,60 400,52 400,160 0,160" fill="url(#decoG)" />
            </svg>
          </div>
        </DecoCard>

        {/* ── Company Profile ── */}
        <DecoSection title="Company Profile" sub="Corporate Overview" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <p className="text-[15px] leading-relaxed" style={{ fontFamily: body, color: T2 }}>{COMPANY_DESCRIPTION}</p>
            <GoldRule />
            <div className="grid grid-cols-3 gap-y-3 gap-x-4">
              {[
                { l: "CEO", v: STOCK.ceo },
                { l: "Headquarters", v: STOCK.headquarters },
                { l: "Employees", v: STOCK.employees.toLocaleString() },
                { l: "Founded", v: STOCK.founded },
                { l: "IPO Date", v: STOCK.ipoDate },
                { l: "Fiscal Year", v: STOCK.fiscalYearEnd },
              ].map((item) => (
                <div key={item.l}>
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.25em]" style={{ fontFamily: heading, color: TAN }}>{item.l}</span>
                  <div className="text-sm font-bold mt-0.5" style={{ fontFamily: body }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
          <DecoCard title="Ranges" className="lg:col-span-2">
            <DecoRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today" />
            <DecoRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week" />
            <ThinGold />
            {[
              { l: "Open", v: usd(STOCK.open) },
              { l: "Prev Close", v: usd(STOCK.prevClose) },
              { l: "Avg Volume", v: fmt(STOCK.avgVolume) },
            ].map((r) => (
              <div key={r.l} className="flex justify-between py-1 text-sm">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: heading, color: TAN }}>{r.l}</span>
                <span className="font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "12px" }}>{r.v}</span>
              </div>
            ))}
          </DecoCard>
        </div>

        {/* ── Segments ── */}
        <DecoSection title="Business Segments" sub="Revenue Breakdown" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SEGMENTS.map((seg) => (
            <div key={seg.name} className="border-l-2 pl-4 py-2" style={{ borderColor: GOLD }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-extrabold uppercase tracking-wider" style={{ fontFamily: heading }}>{seg.name}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: NAVY }}>{seg.revenue} ({seg.pct}%)</span>
              </div>
              <div className="h-[3px] mb-2" style={{ background: `${GOLD}30` }}>
                <div className="h-full" style={{ width: `${seg.pct * 2}%`, background: `linear-gradient(90deg, ${NAVY}, ${GOLD})` }} />
              </div>
              <p className="text-xs leading-relaxed" style={{ fontFamily: body, color: T2 }}>{seg.description}</p>
            </div>
          ))}
        </div>

        {/* ── AI Analysis ── */}
        <DecoSection title="Analysis" sub="Mechanised Intelligence" />
        <DecoCard>
          <p className="text-[15px] leading-relaxed" style={{ fontFamily: body, color: T2 }}>{AI_ANALYSIS.summary}</p>
          <ThinGold />
          <h4 className="text-xs font-extrabold uppercase tracking-[0.2em] mb-2" style={{ fontFamily: heading, color: GOLD }}>Outlook</h4>
          <p className="text-[15px] leading-relaxed" style={{ fontFamily: body, color: T2 }}>{AI_ANALYSIS.outlook}</p>
        </DecoCard>

        {/* ── Bull / Bear ── */}
        <DecoSection title="Investment Thesis" sub="Bull vs Bear" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DecoCard title={BULL_CASE.title} accent={HUNT}>
            <p className="text-sm leading-relaxed mb-3" style={{ fontFamily: body, color: T2 }}>{BULL_CASE.thesis}</p>
            <GoldRule />
            {BULL_CASE.keyMetrics.map((m, i) => (
              <div key={m.label} className="flex justify-between py-1.5 text-sm" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <span style={{ fontFamily: heading, fontSize: "10px", color: TAN, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>{m.label}</span>
                <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: HUNT }}>{m.value}</span>
              </div>
            ))}
          </DecoCard>
          <DecoCard title={BEAR_CASE.title} accent={CRIM}>
            <p className="text-sm leading-relaxed mb-3" style={{ fontFamily: body, color: T2 }}>{BEAR_CASE.thesis}</p>
            <GoldRule />
            {BEAR_CASE.keyMetrics.map((m, i) => (
              <div key={m.label} className="flex justify-between py-1.5 text-sm" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <span style={{ fontFamily: heading, fontSize: "10px", color: TAN, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>{m.label}</span>
                <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: CRIM }}>{m.value}</span>
              </div>
            ))}
          </DecoCard>
        </div>

        {/* ── Analyst Consensus ── */}
        <DecoSection title="Broker Consensus" sub="Analyst Recommendations" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DecoCard title="Rating Summary" className="lg:col-span-1">
            <div className="text-center mb-4">
              <div className="text-4xl font-black" style={{ fontFamily: display, color: HUNT }}>{ANALYST_CONSENSUS.rating}</div>
              <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] mt-1" style={{ fontFamily: heading, color: TAN }}>Consensus</div>
            </div>
            <div className="flex gap-px h-3 mb-2">
              <div className="rounded-l" style={{ flex: ANALYST_CONSENSUS.buy, background: HUNT }} />
              <div style={{ flex: ANALYST_CONSENSUS.overweight, background: `${HUNT}88` }} />
              <div style={{ flex: ANALYST_CONSENSUS.hold, background: TAN }} />
              <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${CRIM}88` }} />
              <div className="rounded-r" style={{ flex: ANALYST_CONSENSUS.sell, background: CRIM }} />
            </div>
            <div className="flex justify-between text-[8px] font-extrabold mb-4" style={{ fontFamily: heading, color: TAN }}>
              <span>Buy {ANALYST_CONSENSUS.buy}</span><span>Hold {ANALYST_CONSENSUS.hold}</span><span>Sell {ANALYST_CONSENSUS.sell}</span>
            </div>
            <ThinGold />
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { l: "Low", v: usd(ANALYST_CONSENSUS.lowTarget), c: CRIM },
                { l: "Avg", v: usd(ANALYST_CONSENSUS.avgTarget), c: NAVY },
                { l: "High", v: usd(ANALYST_CONSENSUS.highTarget), c: HUNT },
              ].map((t) => (
                <div key={t.l}>
                  <div className="text-[8px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: heading, color: TAN }}>{t.l}</div>
                  <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: t.c }}>{t.v}</div>
                </div>
              ))}
            </div>
          </DecoCard>
          <div className="lg:col-span-2 space-y-5">
            {ANALYSTS.map((a, i) => (
              <div key={a.firm} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <div>
                  <div className="text-sm font-bold" style={{ fontFamily: body }}>{a.firm}</div>
                  <div className="text-[10px]" style={{ fontFamily: mono, color: TAN }}>{a.analyst} · {a.date}</div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider" style={{ fontFamily: heading, color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? HUNT : a.rating.includes("Sell") || a.rating.includes("Underperform") ? CRIM : T2 }}>{a.rating}</span>
                  <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono }}>{usd(a.target)}</div>
                </div>
              </div>
            ))}
            <Sunburst />
            {ANALYST_COMMENTARY.map((c, i) => (
              <div key={i} className={i > 0 ? "pt-4" : ""} style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <h4 className="text-sm font-bold" style={{ fontFamily: display }}>{c.title}</h4>
                <span className="text-[10px]" style={{ fontFamily: mono, color: TAN }}>{c.firm} — {c.analyst} · {c.date}</span>
                <p className="text-sm leading-relaxed mt-1.5" style={{ fontFamily: body, color: T2 }}>{c.snippet}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Earnings ── */}
        <DecoSection title="Earnings Record" sub="Quarterly Results" />
        <DecoCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: BG2 }}>
                  {["Quarter", "Date", "EPS Est", "EPS Act", "Revenue", "Growth", "Surprise"].map((h) => (
                    <th key={h} className={`py-2.5 px-3 text-[8px] font-extrabold uppercase tracking-[0.2em] ${h === "Quarter" || h === "Date" ? "text-left" : "text-right"}`} style={{ fontFamily: heading, color: TAN, borderBottom: `2px solid ${NAVY}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((e, i) => (
                  <tr key={e.quarter} style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                    <td className="py-2 px-3 font-bold" style={{ fontFamily: display, color: NAVY }}>{e.quarter}</td>
                    <td className="py-2 px-3" style={{ fontFamily: mono, fontSize: "11px", color: TAN }}>{e.date}</td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: TAN }}>{usd(e.epsEst)}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: e.epsActual >= e.epsEst ? HUNT : CRIM }}>{usd(e.epsActual)}</td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{e.revenue}</td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: e.revenueGrowth >= 0 ? HUNT : CRIM }}>{pct(e.revenueGrowth)}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: e.surprise.startsWith("+") ? HUNT : CRIM }}>{e.surprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DecoCard>

        {/* ── Financials ── */}
        <DecoSection title="Financial Statements" sub="Annual Summary" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { title: "Income Statement", data: INCOME_STATEMENT, hasYoy: true },
            { title: "Balance Sheet", data: BALANCE_SHEET, hasYoy: false },
            { title: "Cash Flows", data: CASH_FLOW, hasYoy: true },
          ].map((section) => (
            <DecoCard key={section.title} title={section.title}>
              {section.data.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                  <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: row.value.startsWith("-") ? CRIM : TX }}>{row.value}</span>
                    {section.hasYoy && typeof (row as unknown as { yoy?: string }).yoy === "string" && (
                      <span className="text-[10px] tabular-nums" style={{ fontFamily: mono, color: (row as unknown as { yoy: string }).yoy.startsWith("+") ? HUNT : (row as unknown as { yoy: string }).yoy.startsWith("−") ? CRIM : TAN }}>{(row as unknown as { yoy: string }).yoy}</span>
                    )}
                  </div>
                </div>
              ))}
            </DecoCard>
          ))}
        </div>

        {/* ── Risks & Catalysts ── */}
        <DecoSection title="Risks & Catalysts" sub="Material Factors" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DecoCard title="Key Risks" accent={CRIM}>
            {KEY_RISKS.map((r, i) => (
              <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold" style={{ fontFamily: display }}>{r.title}</h4>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider border px-1.5 py-0.5" style={{ fontFamily: heading, color: r.severity === "High" ? CRIM : r.severity === "Medium" ? GOLD : TAN, borderColor: r.severity === "High" ? CRIM : r.severity === "Medium" ? GOLD : `${TAN}50` }}>{r.severity}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: body, color: T2 }}>{r.description}</p>
              </div>
            ))}
          </DecoCard>
          <DecoCard title="Catalysts" accent={HUNT}>
            {CATALYSTS.map((c, i) => (
              <div key={i} className={i > 0 ? "pt-3" : ""} style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold" style={{ fontFamily: display }}>{c.title}</h4>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider" style={{ fontFamily: heading, color: GOLD }}>{c.timeline}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: body, color: T2 }}>{c.description}</p>
              </div>
            ))}
          </DecoCard>
        </div>

        {/* ── Competitors ── */}
        <DecoSection title="Comparable Securities" sub="Peer Analysis" />
        <DecoCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: BG2 }}>
                  {["Company", "Mkt Cap", "P/E", "Revenue", "Margin", "Growth"].map((h) => (
                    <th key={h} className={`py-2 px-3 text-[8px] font-extrabold uppercase tracking-[0.2em] ${h === "Company" ? "text-left" : "text-right"}`} style={{ fontFamily: heading, color: TAN, borderBottom: `2px solid ${NAVY}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr key={c.ticker} style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                    <td className="py-2 px-3"><span className="font-bold" style={{ fontFamily: display, color: NAVY }}>{c.ticker}</span> <span style={{ fontFamily: body, color: TAN }}>{c.name}</span></td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{c.marketCap}</td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: T2 }}>{c.pe}</td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{c.revenue}</td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: T2 }}>{c.margin}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold" style={{ fontFamily: mono, fontSize: "11px", color: c.growth.startsWith("+") ? HUNT : CRIM }}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DecoCard>

        {/* ── Valuation, Technicals, Dividends ── */}
        <DecoSection title="Quantitative Data" sub="Valuation · Technicals · Dividends" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DecoCard title="Valuation Ratios">
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className="flex justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{r.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>{r.value}</span>
              </div>
            ))}
          </DecoCard>
          <DecoCard title="Technical Indicators">
            {[
              { l: "SMA 20", v: usd(TECHNICALS.sma20), s: STOCK.price > TECHNICALS.sma20 },
              { l: "SMA 50", v: usd(TECHNICALS.sma50), s: STOCK.price > TECHNICALS.sma50 },
              { l: "SMA 200", v: usd(TECHNICALS.sma200), s: STOCK.price > TECHNICALS.sma200 },
              { l: "RSI 14", v: TECHNICALS.rsi14.toString(), s: TECHNICALS.rsi14 < 70 },
              { l: "Trend", v: TECHNICALS.trend, s: TECHNICALS.trend === "Uptrend" },
              { l: "MACD", v: TECHNICALS.macdSignal, s: TECHNICALS.macdSignal.includes("Bullish") },
              { l: "Support", v: usd(TECHNICALS.support1), s: true },
              { l: "Resistance", v: usd(TECHNICALS.resistance1), s: false },
            ].map((t, i) => (
              <div key={t.l} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{t.l}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: t.s ? HUNT : CRIM }}>{t.v}</span>
              </div>
            ))}
          </DecoCard>
          <DecoCard title="Dividend History">
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <span className="text-sm font-bold" style={{ fontFamily: display, color: NAVY }}>{d.year}</span>
                <div className="flex items-center gap-3 tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>
                  <span className="font-bold">{d.annual}</span>
                  <span style={{ color: TAN }}>{d.yield}</span>
                  <span style={{ color: HUNT }}>{d.growth}</span>
                </div>
              </div>
            ))}
          </DecoCard>
        </div>

        {/* ── Holders & ESG ── */}
        <DecoSection title="Ownership & Governance" sub="Holders · ESG" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DecoCard title="Top Holders">
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body }}>{h.name}</span>
                <div className="flex items-center gap-3 tabular-nums" style={{ fontFamily: mono, fontSize: "11px" }}>
                  <span style={{ color: TAN }}>{h.shares}</span>
                  <span className="font-bold w-10 text-right" style={{ color: NAVY }}>{h.pct}</span>
                  <span className="w-16 text-right" style={{ color: T2 }}>{h.value}</span>
                </div>
              </div>
            ))}
          </DecoCard>
          <DecoCard title={`ESG — ${ESG.provider}`} accent={HUNT}>
            <div className="text-center mb-4">
              <div className="text-3xl font-black" style={{ fontFamily: display, color: HUNT }}>{ESG.rating}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              {[
                { l: "Environment", s: ESG.environmentScore },
                { l: "Social", s: ESG.socialScore },
                { l: "Governance", s: ESG.governanceScore },
              ].map((e) => (
                <div key={e.l}>
                  <div className="text-xl font-bold" style={{ fontFamily: display, color: GOLD }}>{e.s}</div>
                  <div className="text-[7px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: heading, color: TAN }}>{e.l}</div>
                </div>
              ))}
            </div>
            <ThinGold />
            {ESG.highlights.map((h, i) => (
              <p key={i} className="text-sm leading-relaxed mb-1" style={{ fontFamily: body, color: T2 }}>
                <span style={{ color: GOLD }}>◆</span> {h}
              </p>
            ))}
          </DecoCard>
        </div>

        {/* ── Watchlist, News, Sector: 3-col ── */}
        <Sunburst />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] border-b-2 pb-1 mb-4" style={{ fontFamily: heading, borderColor: NAVY, color: NAVY }}>Watchlist</h3>
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <div>
                  <span className="text-sm font-bold" style={{ fontFamily: display }}>{w.ticker}</span>
                  <span className="text-[9px] ml-1" style={{ fontFamily: mono, color: TAN }}>{w.volume}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "12px" }}>{usd(w.price)}</span>
                  <span className="text-[10px] ml-2 tabular-nums" style={{ fontFamily: mono, color: w.change >= 0 ? HUNT : CRIM }}>{pct(w.change)}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] border-b-2 pb-1 mb-4" style={{ fontFamily: heading, borderColor: NAVY, color: NAVY }}>News Wire</h3>
            {NEWS.map((n, i) => (
              <div key={i} className="py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <span className="text-[10px] font-bold mr-1" style={{ fontFamily: mono, color: NAVY }}>{n.time}</span>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{n.headline}</span>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] border-b-2 pb-1 mb-4" style={{ fontFamily: heading, borderColor: NAVY, color: NAVY }}>Sector Perf.</h3>
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${GOLD}30` : "none" }}>
                <span className="text-sm" style={{ fontFamily: body, color: T2 }}>{s.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, fontSize: "11px", color: s.value.startsWith("+") ? HUNT : CRIM }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer style={{ background: NAVY }}>
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex gap-[2px] mb-4">
            <div className="flex-1 h-px" style={{ background: GOLD }} />
            <div className="flex-1 h-px" style={{ background: `${GOLD}60` }} />
            <div className="flex-1 h-px" style={{ background: GOLD }} />
          </div>
          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.25em]" style={{ fontFamily: heading, color: `${GOLD}88` }}>
            <span>Zero Sum — 12-B: Art Deco</span>
            <span>◆ Sample Data Only ◆</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
