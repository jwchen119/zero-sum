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
   Style 12 — Newspaper / Data Journalism
   Serif headings, thick rules, column layouts, warm cream bg.
   WSJ / FT editorial authority. The interface disappears —
   the data reads like a well-written research article.
   ══════════════════════════════════════════════════════════════ */

const BG  = "#faf9f6";
const SF  = "#ffffff";
const EL  = "#f5f0eb";
const BD  = "#d4c5b2";
const RL  = "#222222";   // thick rules
const TP  = "#1a1a1a";
const TS  = "#4a4a4a";
const TM  = "#8a8a8a";
const AR  = "#c41e3a";
const AB  = "#1a4d8f";
const AG  = "#2d6a4f";

const nClr = (n: number) => (n >= 0 ? AG : AR);

/* ─── Section Rule ─── */
function SectionRule({ title }: { title: string }) {
  return (
    <div className="border-t-2 pt-3 mt-10 mb-6" style={{ borderColor: RL }}>
      <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', 'Libre Baskerville', 'Georgia', serif", color: TP }}>{title}</h2>
    </div>
  );
}

/* ─── Callout aside ─── */
function Callout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="border-l-4 p-4 my-6 text-sm italic leading-relaxed" style={{ background: EL, borderColor: AR, color: TS, fontFamily: "'Georgia', 'Source Serif Pro', serif" }}>
      {children}
    </aside>
  );
}

/* ─── Sparkline ─── */
function Spark({ positive }: { positive: boolean }) {
  const pts = positive
    ? "0,22 10,19 20,21 30,16 40,18 50,12 60,14 70,9 80,11 90,7 100,5"
    : "0,5 10,8 20,6 30,12 40,9 50,15 60,13 70,18 80,20 90,16 100,22";
  return (
    <svg width="80" height="24" viewBox="0 0 100 28" className="inline-block">
      <polyline points={pts} fill="none" stroke={positive ? AG : AR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Range bar ─── */
function RangeBar({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-5">
      <div className="text-xs font-sans font-semibold uppercase tracking-wider mb-2" style={{ color: TM }}>{label}</div>
      <div className="relative h-1 rounded-full" style={{ background: BD }}>
        <div className="absolute h-full rounded-full" style={{ width: `${p}%`, background: RL }} />
        <div className="absolute top-[-3px] w-2.5 h-2.5 rounded-full" style={{ left: `calc(${p}% - 5px)`, background: AR, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </div>
      <div className="flex justify-between text-xs font-mono tabular-nums mt-1" style={{ color: TM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */
export default function NewspaperPrototype() {
  const serif = "'Playfair Display', 'Libre Baskerville', 'Georgia', serif";
  const body  = "'Source Serif Pro', 'Georgia', 'Charter', serif";
  const mono  = "'IBM Plex Mono', 'Menlo', monospace";
  const sans  = "'Inter', system-ui, sans-serif";

  return (
    <div className="min-h-screen" style={{ background: BG, color: TP }}>

      {/* ── Masthead ── */}
      <header className="border-b-4 py-6 text-center" style={{ borderColor: RL }}>
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-between mb-2">
            <Link href="/prototype" className="text-xs font-sans font-medium hover:underline" style={{ color: AB }}>← All Styles</Link>
            <span className="text-xs font-sans" style={{ color: TM }}>March 3, 2026 · Vol. I, No. 12</span>
            <span className="text-xs font-sans" style={{ color: TM }}>Style 12</span>
          </div>
          <Link href="/prototype" className="hover:opacity-80 transition-opacity">
            <h1 className="text-5xl font-bold tracking-tight" style={{ fontFamily: serif, color: TP }}>Zero Sum</h1>
          </Link>
          <p className="text-sm mt-1 font-sans" style={{ color: TM }}>Financial Research & Analysis</p>
          <div className="h-px mt-4" style={{ background: BD }} />
          <div className="flex justify-center gap-8 mt-3 text-xs font-sans font-medium uppercase tracking-wider" style={{ color: TS }}>
            <span>Markets</span><span>Earnings</span><span>Analysis</span><span>Watchlist</span><span>Research</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">

        {/* ── Price Hero ── */}
        <div className="border-b-2 pb-8 mb-4" style={{ borderColor: RL }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: serif }}>{STOCK.ticker}</h2>
              <p className="text-base mt-1" style={{ fontFamily: body, color: TS }}>{STOCK.name} — {STOCK.sector} / {STOCK.industry}</p>
              <span className="inline-block text-xs font-sans font-semibold uppercase tracking-wider mt-2 px-2 py-0.5 border rounded" style={{ color: TM, borderColor: BD }}>{STOCK.exchange}</span>
            </div>
            <div className="flex items-end gap-4">
              <span className="text-5xl font-light tabular-nums" style={{ fontFamily: serif, color: TP }}>{usd(STOCK.price)}</span>
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

        {/* ── Chart Placeholder ── */}
        <div className="border-b pb-8 mb-2" style={{ borderColor: BD }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>Price Chart</span>
            <div className="flex gap-4 text-xs font-sans font-medium" style={{ color: TM }}>
              {["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"].map((p) => (
                <button key={p} className="hover:underline" style={{ color: p === "1Y" ? AR : TM, fontWeight: p === "1Y" ? 700 : 500 }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-64 relative border rounded" style={{ borderColor: BD, background: SF }}>
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 160">
              <polyline
                points="0,140 20,136 40,138 60,125 80,128 100,115 120,118 140,105 160,110 180,95 200,100 220,85 240,90 260,78 280,82 300,68 320,72 340,62 360,58 380,60 400,52"
                fill="none" stroke={RL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              />
              <line x1="0" y1="52" x2="400" y2="52" stroke={BD} strokeWidth="0.5" strokeDasharray="4 3" />
              <text x="395" y="48" textAnchor="end" fill={TM} fontSize="8" fontFamily="sans-serif">{usd(STOCK.week52High)}</text>
              <line x1="0" y1="140" x2="400" y2="140" stroke={BD} strokeWidth="0.5" strokeDasharray="4 3" />
              <text x="395" y="136" textAnchor="end" fill={TM} fontSize="8" fontFamily="sans-serif">{usd(STOCK.week52Low)}</text>
            </svg>
          </div>
        </div>

        {/* ── Key Stats (newspaper table) ── */}
        <SectionRule title="Market Summary" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 mb-8">
          {[
            { label: "Market Cap", value: fmt(STOCK.marketCap) },
            { label: "P/E Ratio", value: STOCK.pe.toFixed(1) },
            { label: "EPS (TTM)", value: usd(STOCK.eps) },
            { label: "Beta", value: STOCK.beta.toFixed(2) },
            { label: "Div Yield", value: `${STOCK.dividendYield.toFixed(2)}%` },
            { label: "52W High", value: usd(STOCK.week52High) },
            { label: "52W Low", value: usd(STOCK.week52Low) },
            { label: "Volume", value: fmt(STOCK.volume) },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>{s.label}</div>
              <div className="text-lg font-bold tabular-nums mt-0.5" style={{ fontFamily: mono, color: TP }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Company Profile + Ranges ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <SectionRule title="Company Profile" />
            <p className="text-base leading-relaxed whitespace-pre-line" style={{ fontFamily: body, color: TS }}>{COMPANY_DESCRIPTION}</p>
            <div className="h-px my-6" style={{ background: BD }} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
              {[
                { label: "CEO", value: STOCK.ceo },
                { label: "Headquarters", value: STOCK.headquarters },
                { label: "Employees", value: STOCK.employees.toLocaleString() },
                { label: "Founded", value: STOCK.founded },
                { label: "IPO Date", value: STOCK.ipoDate },
                { label: "Fiscal Year End", value: STOCK.fiscalYearEnd },
              ].map((item) => (
                <div key={item.label}>
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>{item.label}</span>
                  <div className="text-sm font-semibold mt-0.5" style={{ fontFamily: body, color: TP }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionRule title="Trading Range" />
            <RangeBar low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today's Range" />
            <RangeBar low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week Range" />
            <div className="h-px my-5" style={{ background: BD }} />
            <div className="space-y-3">
              {[
                { label: "Open", value: usd(STOCK.open) },
                { label: "Prev Close", value: usd(STOCK.prevClose) },
                { label: "Avg Volume", value: fmt(STOCK.avgVolume) },
                { label: "Shares Out", value: fmt(STOCK.sharesOut) },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: TM }}>{r.label}</span>
                  <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: TP }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Business Segments ── */}
        <SectionRule title="Business Segments" />
        <div className="space-y-5">
          {SEGMENTS.map((seg) => (
            <div key={seg.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-base font-bold" style={{ fontFamily: serif, color: TP }}>{seg.name}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: TP }}>{seg.revenue}</span>
                  <span className="tabular-nums font-sans" style={{ color: TM }}>{seg.pct}%</span>
                </div>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: BD }}>
                <div className="h-full rounded-full" style={{ width: `${seg.pct * 2}%`, background: RL }} />
              </div>
              <p className="text-sm mt-2 leading-relaxed" style={{ fontFamily: body, color: TS }}>{seg.description}</p>
            </div>
          ))}
        </div>

        {/* ── AI Analysis ── */}
        <SectionRule title="Analysis Summary" />
        <p className="text-base leading-relaxed whitespace-pre-line" style={{ fontFamily: body, color: TS }}>{AI_ANALYSIS.summary}</p>
        <Callout>{AI_ANALYSIS.outlook}</Callout>

        {/* ── Bull / Bear Case ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="border-t-2 pt-3 mt-10 mb-4" style={{ borderColor: AG }}>
              <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: serif, color: AG }}>▲ {BULL_CASE.title}</h2>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line mb-4" style={{ fontFamily: body, color: TS }}>{BULL_CASE.thesis}</p>
            <div className="border-t pt-3" style={{ borderColor: BD }}>
              {BULL_CASE.keyMetrics.map((m, i) => (
                <div key={m.label} className={`flex justify-between py-2 text-sm ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                  <span className="font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: TM }}>{m.label}</span>
                  <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: AG }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="border-t-2 pt-3 mt-10 mb-4" style={{ borderColor: AR }}>
              <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: serif, color: AR }}>▼ {BEAR_CASE.title}</h2>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line mb-4" style={{ fontFamily: body, color: TS }}>{BEAR_CASE.thesis}</p>
            <div className="border-t pt-3" style={{ borderColor: BD }}>
              {BEAR_CASE.keyMetrics.map((m, i) => (
                <div key={m.label} className={`flex justify-between py-2 text-sm ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                  <span className="font-sans text-xs font-semibold uppercase tracking-wider" style={{ color: TM }}>{m.label}</span>
                  <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: AR }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Analyst Consensus + Commentary ── */}
        <SectionRule title="Analyst Consensus" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-4 mb-5">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ fontFamily: serif, color: AG }}>{ANALYST_CONSENSUS.rating}</div>
                <div className="text-[10px] font-sans font-semibold uppercase tracking-wider mt-0.5" style={{ color: TM }}>Consensus</div>
              </div>
              <div className="flex-1">
                <div className="flex gap-px h-2.5 overflow-hidden">
                  <div style={{ flex: ANALYST_CONSENSUS.buy, background: AG }} />
                  <div style={{ flex: ANALYST_CONSENSUS.overweight, background: `${AG}88` }} />
                  <div style={{ flex: ANALYST_CONSENSUS.hold, background: BD }} />
                  <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${AR}88` }} />
                  <div style={{ flex: ANALYST_CONSENSUS.sell, background: AR }} />
                </div>
                <div className="flex justify-between text-[10px] font-sans mt-1" style={{ color: TM }}>
                  <span>Buy {ANALYST_CONSENSUS.buy}</span>
                  <span>Hold {ANALYST_CONSENSUS.hold}</span>
                  <span>Sell {ANALYST_CONSENSUS.sell}</span>
                </div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2" style={{ borderColor: RL }}>
                  <th className="text-left py-2 text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>Target</th>
                  <th className="text-right py-2 text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>Price</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: mono }}>
                <tr className="border-b" style={{ borderColor: `${BD}80` }}>
                  <td className="py-2" style={{ color: TS }}>Low</td>
                  <td className="py-2 text-right font-bold tabular-nums" style={{ color: AR }}>{usd(ANALYST_CONSENSUS.lowTarget)}</td>
                </tr>
                <tr className="border-b" style={{ borderColor: `${BD}80` }}>
                  <td className="py-2" style={{ color: TS }}>Average</td>
                  <td className="py-2 text-right font-bold tabular-nums" style={{ color: AB }}>{usd(ANALYST_CONSENSUS.avgTarget)}</td>
                </tr>
                <tr>
                  <td className="py-2" style={{ color: TS }}>High</td>
                  <td className="py-2 text-right font-bold tabular-nums" style={{ color: AG }}>{usd(ANALYST_CONSENSUS.highTarget)}</td>
                </tr>
              </tbody>
            </table>
            <div className="h-px my-5" style={{ background: BD }} />
            {ANALYSTS.map((a, i) => (
              <div key={a.firm} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                <div>
                  <div className="text-sm font-semibold" style={{ fontFamily: body, color: TP }}>{a.firm}</div>
                  <div className="text-xs font-sans" style={{ color: TM }}>{a.analyst} · {a.date}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-wider" style={{
                    color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? AG : a.rating.includes("Sell") || a.rating.includes("Underperform") ? AR : TS,
                  }}>{a.rating}</span>
                  <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: TP }}>{usd(a.target)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="text-xs font-sans font-semibold uppercase tracking-wider mb-4" style={{ color: TM }}>Analyst Commentary</div>
            <div className="space-y-6">
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-6 border-t" : ""} style={{ borderColor: BD }}>
                  <h4 className="text-lg font-bold mb-1" style={{ fontFamily: serif, color: TP }}>{c.title}</h4>
                  <span className="text-xs font-sans" style={{ color: TM }}>{c.firm} — {c.analyst} · {c.date}</span>
                  <p className="text-sm leading-relaxed mt-3" style={{ fontFamily: body, color: TS }}>{c.snippet}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Earnings History ── */}
        <SectionRule title="Earnings History" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2" style={{ borderColor: RL }}>
                {["Quarter", "Date", "EPS Est", "EPS Actual", "Revenue", "Rev Growth", "Surprise"].map((h) => (
                  <th key={h} className={`py-2 text-[10px] font-sans font-semibold uppercase tracking-wider ${h === "Quarter" || h === "Date" ? "text-left" : "text-right"}`} style={{ color: TM }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EARNINGS.map((e) => (
                <tr key={e.quarter} className="border-b" style={{ borderColor: `${BD}80` }}>
                  <td className="py-2.5 font-bold" style={{ fontFamily: serif, color: AB }}>{e.quarter}</td>
                  <td className="py-2.5 font-sans" style={{ color: TM }}>{e.date}</td>
                  <td className="py-2.5 text-right tabular-nums" style={{ fontFamily: mono, color: TM }}>{usd(e.epsEst)}</td>
                  <td className="py-2.5 text-right tabular-nums font-bold" style={{ fontFamily: mono, color: e.epsActual >= e.epsEst ? AG : AR }}>{usd(e.epsActual)}</td>
                  <td className="py-2.5 text-right tabular-nums" style={{ fontFamily: mono, color: TP }}>{e.revenue}</td>
                  <td className="py-2.5 text-right tabular-nums" style={{ fontFamily: mono, color: e.revenueGrowth >= 0 ? AG : AR }}>{pct(e.revenueGrowth)}</td>
                  <td className="py-2.5 text-right tabular-nums font-bold" style={{ fontFamily: mono, color: e.surprise.startsWith("+") ? AG : AR }}>{e.surprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Financials 3-col ── */}
        <SectionRule title="Financial Statements" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[
            { title: "Income Statement (TTM)", data: INCOME_STATEMENT, hasYoy: true as const },
            { title: "Balance Sheet", data: BALANCE_SHEET, hasYoy: false as const },
            { title: "Cash Flow Statement", data: CASH_FLOW, hasYoy: true as const },
          ].map((section) => (
            <div key={section.title}>
              <div className="text-xs font-sans font-semibold uppercase tracking-wider mb-3 pb-2 border-b-2" style={{ color: TM, borderColor: RL }}>{section.title}</div>
              {section.data.map((row, i) => (
                <div key={row.label} className={`flex items-center justify-between py-2 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                  <span className="text-sm" style={{ fontFamily: body, color: TS }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: row.value.startsWith("-") ? AR : TP }}>{row.value}</span>
                    {"yoy" in row && typeof (row as { yoy?: string }).yoy === "string" && <span className="text-[10px] tabular-nums font-sans" style={{ color: (row as { yoy: string }).yoy.startsWith("+") ? AG : (row as { yoy: string }).yoy.startsWith("−") ? AR : TM }}>{(row as { yoy: string }).yoy}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Risks + Catalysts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <SectionRule title="Key Risks" />
            <div className="space-y-5">
              {KEY_RISKS.map((r, i) => (
                <div key={i} className={i > 0 ? "pt-5 border-t" : ""} style={{ borderColor: BD }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold" style={{ fontFamily: serif, color: TP }}>{r.title}</h4>
                    <span className="text-[10px] font-sans font-semibold uppercase tracking-wider" style={{
                      color: r.severity === "High" ? AR : r.severity === "Medium" ? "#b45309" : TM,
                    }}>{r.severity}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ fontFamily: body, color: TS }}>{r.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionRule title="Upcoming Catalysts" />
            <div className="space-y-5">
              {CATALYSTS.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-5 border-t" : ""} style={{ borderColor: BD }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold" style={{ fontFamily: serif, color: TP }}>{c.title}</h4>
                    <span className="text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: AB }}>{c.timeline}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ fontFamily: body, color: TS }}>{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Competitive Landscape ── */}
        <SectionRule title="Competitive Landscape" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2" style={{ borderColor: RL }}>
                <th className="text-left py-2 text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>Company</th>
                <th className="text-right py-2 text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>Market Cap</th>
                <th className="text-right py-2 text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>P/E</th>
                <th className="text-right py-2 text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>Revenue</th>
                <th className="text-right py-2 text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>Net Margin</th>
                <th className="text-right py-2 text-[10px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>Growth</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c) => (
                <tr key={c.ticker} className="border-b" style={{ borderColor: `${BD}80` }}>
                  <td className="py-2.5">
                    <span className="font-bold" style={{ fontFamily: serif, color: AB }}>{c.ticker}</span>
                    <span className="ml-2 font-sans text-xs" style={{ color: TM }}>{c.name}</span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums" style={{ fontFamily: mono, color: TP }}>{c.marketCap}</td>
                  <td className="py-2.5 text-right tabular-nums" style={{ fontFamily: mono, color: TS }}>{c.pe}</td>
                  <td className="py-2.5 text-right tabular-nums" style={{ fontFamily: mono, color: TP }}>{c.revenue}</td>
                  <td className="py-2.5 text-right tabular-nums" style={{ fontFamily: mono, color: TS }}>{c.margin}</td>
                  <td className="py-2.5 text-right tabular-nums font-bold" style={{ fontFamily: mono, color: c.growth.startsWith("+") ? AG : AR }}>{c.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Valuation + Technicals + Dividends ── */}
        <SectionRule title="Valuation, Technicals & Dividends" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <div className="text-xs font-sans font-semibold uppercase tracking-wider mb-3 pb-2 border-b-2" style={{ color: TM, borderColor: RL }}>Valuation Ratios</div>
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className={`flex justify-between py-2 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                <span className="text-sm" style={{ fontFamily: body, color: TS }}>{r.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: TP }}>{r.value}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs font-sans font-semibold uppercase tracking-wider mb-3 pb-2 border-b-2" style={{ color: TM, borderColor: RL }}>Technical Indicators</div>
            {[
              { label: "SMA 20", value: usd(TECHNICALS.sma20), signal: STOCK.price > TECHNICALS.sma20 },
              { label: "SMA 50", value: usd(TECHNICALS.sma50), signal: STOCK.price > TECHNICALS.sma50 },
              { label: "SMA 200", value: usd(TECHNICALS.sma200), signal: STOCK.price > TECHNICALS.sma200 },
              { label: "RSI 14", value: TECHNICALS.rsi14.toString(), signal: TECHNICALS.rsi14 < 70 },
              { label: "Trend", value: TECHNICALS.trend, signal: TECHNICALS.trend === "Uptrend" },
              { label: "MACD", value: TECHNICALS.macdSignal, signal: TECHNICALS.macdSignal.includes("Bullish") },
              { label: "Support", value: usd(TECHNICALS.support1), signal: true },
              { label: "Resistance", value: usd(TECHNICALS.resistance1), signal: false },
            ].map((t, i) => (
              <div key={t.label} className={`flex items-center justify-between py-2 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                <span className="text-sm" style={{ fontFamily: body, color: TS }}>{t.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: t.signal ? AG : AR }}>{t.value}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs font-sans font-semibold uppercase tracking-wider mb-3 pb-2 border-b-2" style={{ color: TM, borderColor: RL }}>Dividend History</div>
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className={`flex items-center justify-between py-2 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                <span className="text-sm font-bold" style={{ fontFamily: serif, color: AB }}>{d.year}</span>
                <div className="flex items-center gap-3 text-sm tabular-nums" style={{ fontFamily: mono }}>
                  <span className="font-bold" style={{ color: TP }}>{d.annual}</span>
                  <span style={{ color: TM }}>{d.yield}</span>
                  <span style={{ color: AG }}>{d.growth}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Holders + ESG ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <SectionRule title="Top Institutional Holders" />
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                <span className="text-sm" style={{ fontFamily: body, color: TP }}>{h.name}</span>
                <div className="flex items-center gap-4 text-sm tabular-nums" style={{ fontFamily: mono }}>
                  <span style={{ color: TM }}>{h.shares}</span>
                  <span className="font-bold w-11 text-right" style={{ color: AB }}>{h.pct}</span>
                  <span className="w-20 text-right" style={{ color: TS }}>{h.value}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <SectionRule title={`ESG Rating — ${ESG.provider}`} />
            <div className="flex items-center gap-5 mb-5">
              <div className="w-14 h-14 flex flex-col items-center justify-center border-2 rounded-sm" style={{ borderColor: RL }}>
                <div className="text-xl font-bold" style={{ fontFamily: serif, color: AG }}>{ESG.rating}</div>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-3">
                {[
                  { label: "Environment", score: ESG.environmentScore },
                  { label: "Social", score: ESG.socialScore },
                  { label: "Governance", score: ESG.governanceScore },
                ].map((e) => (
                  <div key={e.label} className="text-center py-2 border rounded-sm" style={{ borderColor: BD }}>
                    <div className="text-lg font-bold" style={{ fontFamily: mono, color: AB }}>{e.score}</div>
                    <div className="text-[8px] font-sans font-semibold uppercase tracking-wider" style={{ color: TM }}>{e.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-px mb-4" style={{ background: BD }} />
            <div className="space-y-2">
              {ESG.highlights.map((h, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ fontFamily: body, color: TS }}>
                  <span style={{ color: AR }}>■</span> {h}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ── Watchlist + News + Sector ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <SectionRule title="Watchlist" />
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className={`flex items-center justify-between py-2 cursor-pointer ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                <div>
                  <span className="text-sm font-bold" style={{ fontFamily: serif, color: TP }}>{w.ticker}</span>
                  <span className="text-xs font-sans ml-2" style={{ color: TM }}>{w.volume}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: TP }}>{usd(w.price)}</div>
                  <div className="text-xs tabular-nums font-sans" style={{ color: w.change >= 0 ? AG : AR }}>{pct(w.change)}</div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <SectionRule title="News Wire" />
            {NEWS.map((n, i) => (
              <div key={i} className={`py-2.5 cursor-pointer ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                <span className="text-xs mr-2 font-bold tabular-nums" style={{ fontFamily: mono, color: AR }}>{n.time}</span>
                <span className="text-sm" style={{ fontFamily: body, color: TS }}>{n.headline}</span>
              </div>
            ))}
          </div>
          <div>
            <SectionRule title="Sector Performance" />
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className={`flex items-center justify-between py-2 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                <span className="text-sm" style={{ fontFamily: body, color: TS }}>{s.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: s.value.startsWith("+") ? AG : AR }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t-4 mt-12" style={{ borderColor: RL }}>
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between text-xs font-sans" style={{ color: TM }}>
          <span className="font-bold uppercase tracking-wider">Zero Sum — Style 12: Newspaper / Data Journalism</span>
          <span className="italic" style={{ fontFamily: body }}>Sample data only — not investment advice</span>
          <span>© 2026 Zero Sum</span>
        </div>
      </footer>
    </div>
  );
}
