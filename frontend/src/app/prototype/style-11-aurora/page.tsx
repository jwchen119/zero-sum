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
   Style 11 — Aurora Gradient Mesh
   Animated floating orbs, glass cards, gradient text accents.
   ══════════════════════════════════════════════════════════════ */

const CY = "#22d3ee";   // cyan-400
const GR = "#4ade80";   // green-400
const RD = "#fb7185";   // rose-400
const TX = "#ffffff";
const T2 = "#cbd5e1";   // slate-300
const TM = "#94a3b8";   // slate-400
const BD = "rgba(255,255,255,0.10)";

const aClr = (n: number) => (n >= 0 ? GR : RD);

/* ─── Sparkline ─── */
function Spark({ positive }: { positive: boolean }) {
  const d = positive
    ? "M0,22 C10,18 20,20 30,14 C40,11 50,13 60,9 C70,6 80,8 90,4 L100,2"
    : "M0,4 C10,8 20,6 30,12 C40,15 50,13 60,18 C70,20 80,17 90,22 L100,24";
  return (
    <svg width="100" height="28" viewBox="0 0 100 28" className="inline-block">
      <path d={d} fill="none" stroke={positive ? GR : RD} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Glass Card ─── */
function Glass({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border p-6 ${className}`} style={{ background: "rgba(0,0,0,0.40)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderColor: BD }}>
      {title && <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-5" style={{ color: TM }}>{title}</h3>}
      {children}
    </div>
  );
}

/* ─── Range bar ─── */
function AuroraRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: TM }}>{label}</div>
      <div className="relative h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="absolute h-full rounded-full" style={{ width: `${p}%`, background: `linear-gradient(90deg, ${CY}, #a78bfa)` }} />
        <div className="absolute top-[-4px] w-3.5 h-3.5 rounded-full border-2" style={{ left: `calc(${p}% - 7px)`, background: CY, borderColor: "rgba(0,0,0,0.4)", boxShadow: `0 0 12px ${CY}66` }} />
      </div>
      <div className="flex justify-between text-[11px] mt-1.5 tabular-nums" style={{ color: TM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */
export default function AuroraPrototype() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3b0764 40%, #0f172a 100%)", color: TX, fontFamily: "'Inter', 'Sora', system-ui, sans-serif" }}>

      {/* ── Animated Orbs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-30 animate-pulse" style={{ top: "10%", left: "15%", background: "radial-gradient(circle, #a855f7 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-20 animate-pulse" style={{ top: "50%", right: "10%", background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)", filter: "blur(100px)", animationDelay: "1.5s" }} />
        <div className="absolute w-[350px] h-[350px] rounded-full opacity-20 animate-pulse" style={{ bottom: "5%", left: "35%", background: "radial-gradient(circle, #ec4899 0%, transparent 70%)", filter: "blur(100px)", animationDelay: "3s" }} />
      </div>

      {/* ── All content above orbs ── */}
      <div className="relative z-10">

        {/* ── Header ── */}
        <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: BD }}>
          <div className="mx-auto max-w-7xl px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/prototype" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold" style={{ background: `linear-gradient(135deg, ${CY}, #a855f7)`, color: "#000", fontFamily: "'STIX Two Math', serif" }}>∑</span>
                <span className="text-base font-semibold" style={{ color: TX }}>Zero Sum</span>
              </Link>
              <span className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full border" style={{ color: CY, borderColor: `${CY}40` }}>Aurora Mesh</span>
            </div>
            <Link href="/prototype" className="text-xs font-medium hover:underline" style={{ color: CY }}>← All Styles</Link>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-8 py-10 space-y-7">

          {/* ── Price Hero ── */}
          <div className="rounded-3xl border p-10 text-center" style={{ background: "rgba(0,0,0,0.40)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderColor: BD }}>
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{STOCK.ticker}</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full border" style={{ borderColor: BD, color: TM }}>{STOCK.exchange}</span>
            </div>
            <p className="text-sm mb-6" style={{ color: T2 }}>{STOCK.name} — {STOCK.sector} / {STOCK.industry}</p>
            <div className="flex items-end justify-center gap-6">
              <span className="text-6xl font-light tabular-nums" style={{ color: TX }}>{usd(STOCK.price)}</span>
              <div className="flex flex-col items-start pb-1.5">
                <span className="text-xl font-semibold tabular-nums" style={{ color: aClr(STOCK.change) }}>
                  {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                </span>
                <span className="text-sm tabular-nums" style={{ color: aClr(STOCK.changePct) }}>({pct(STOCK.changePct)})</span>
              </div>
              <Spark positive={STOCK.change >= 0} />
            </div>
          </div>

          {/* ── Chart Placeholder ── */}
          <div className="rounded-3xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.30)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: BD }}>
            <div className="px-6 py-4 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: TM }}>Price Chart</h3>
              <div className="flex gap-1">
                {["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"].map((p) => (
                  <button key={p} className="px-3 py-1.5 text-xs rounded-full font-medium transition-all" style={{
                    color: p === "1Y" ? "#000" : T2,
                    background: p === "1Y" ? `linear-gradient(135deg, ${CY}, #a855f7)` : "transparent",
                  }}>{p}</button>
                ))}
              </div>
            </div>
            <div className="h-80 relative mx-6 mb-6 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="auroraLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={CY} />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                  <linearGradient id="auroraFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CY} stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <polyline
                  points="0,160 20,155 40,158 60,138 80,142 100,125 120,130 140,112 160,118 180,100 200,106 220,88 240,95 260,78 280,84 300,68 320,74 340,60 360,55 380,58 400,48"
                  fill="none" stroke="url(#auroraLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
                <polyline
                  points="0,160 20,155 40,158 60,138 80,142 100,125 120,130 140,112 160,118 180,100 200,106 220,88 240,95 260,78 280,84 300,68 320,74 340,60 360,55 380,58 400,48 400,200 0,200"
                  fill="url(#auroraFill)"
                />
                <circle cx="400" cy="48" r="5" fill={CY}>
                  <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
          </div>

          {/* ── Key Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
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
              <div key={s.label} className="rounded-2xl border p-3.5" style={{ background: "rgba(0,0,0,0.30)", backdropFilter: "blur(16px)", borderColor: BD }}>
                <div className="text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: TM }}>{s.label}</div>
                <div className="text-base font-semibold tabular-nums" style={{ color: TX }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Company Profile + Range ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Glass title="Company Profile" className="lg:col-span-2">
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: T2 }}>{COMPANY_DESCRIPTION}</p>
              <div className="h-px my-5" style={{ background: BD }} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                {[
                  { label: "CEO", value: STOCK.ceo },
                  { label: "HQ", value: STOCK.headquarters },
                  { label: "Employees", value: STOCK.employees.toLocaleString() },
                  { label: "Founded", value: STOCK.founded },
                  { label: "IPO Date", value: STOCK.ipoDate },
                  { label: "Fiscal Year", value: STOCK.fiscalYearEnd },
                ].map((item) => (
                  <div key={item.label}>
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TM }}>{item.label}</span>
                    <div className="font-medium mt-0.5" style={{ color: TX }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </Glass>
            <Glass title="Price Ranges">
              <AuroraRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today's Range" />
              <AuroraRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week Range" />
              <div className="h-px my-4" style={{ background: BD }} />
              <div className="space-y-3">
                {[
                  { label: "Open", value: usd(STOCK.open) },
                  { label: "Prev Close", value: usd(STOCK.prevClose) },
                  { label: "Avg Volume", value: fmt(STOCK.avgVolume) },
                  { label: "Shares Out", value: fmt(STOCK.sharesOut) },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TM }}>{r.label}</span>
                    <span className="font-medium tabular-nums" style={{ color: TX }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </Glass>
          </div>

          {/* ── Business Segments ── */}
          <Glass title="Business Segments">
            <div className="space-y-6">
              {SEGMENTS.map((seg) => (
                <div key={seg.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: TX }}>{seg.name}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="tabular-nums font-semibold" style={{ color: CY }}>{seg.revenue}</span>
                      <span className="tabular-nums" style={{ color: TM }}>{seg.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${seg.pct * 2}%`, background: `linear-gradient(90deg, ${CY}, #a855f7)` }} />
                  </div>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: TM }}>{seg.description}</p>
                </div>
              ))}
            </div>
          </Glass>

          {/* ── AI Analysis ── */}
          <Glass title="AI Analysis Summary">
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: T2 }}>{AI_ANALYSIS.summary}</p>
            <div className="h-px my-5" style={{ background: BD }} />
            <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">12–18 Month Outlook</h4>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: T2 }}>{AI_ANALYSIS.outlook}</p>
          </Glass>

          {/* ── Bull / Bear Case ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-3xl border p-6" style={{ background: "rgba(0,0,0,0.40)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderColor: `${GR}30` }}>
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: GR }}>▲</span>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: GR }}>{BULL_CASE.title}</h3>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line mb-5" style={{ color: T2 }}>{BULL_CASE.thesis}</p>
              <div className="h-px mb-5" style={{ background: BD }} />
              <div className="grid grid-cols-2 gap-3">
                {BULL_CASE.keyMetrics.map((m) => (
                  <div key={m.label} className="flex justify-between text-sm">
                    <span className="text-[10px]" style={{ color: TM }}>{m.label}</span>
                    <span className="font-semibold tabular-nums" style={{ color: GR }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border p-6" style={{ background: "rgba(0,0,0,0.40)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderColor: `${RD}30` }}>
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: RD }}>▼</span>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: RD }}>{BEAR_CASE.title}</h3>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line mb-5" style={{ color: T2 }}>{BEAR_CASE.thesis}</p>
              <div className="h-px mb-5" style={{ background: BD }} />
              <div className="grid grid-cols-2 gap-3">
                {BEAR_CASE.keyMetrics.map((m) => (
                  <div key={m.label} className="flex justify-between text-sm">
                    <span className="text-[10px]" style={{ color: TM }}>{m.label}</span>
                    <span className="font-semibold tabular-nums" style={{ color: RD }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Analyst Consensus + Commentary ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Glass title="Analyst Consensus">
              <div className="flex items-center gap-4 mb-5">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: GR }}>{ANALYST_CONSENSUS.rating}</div>
                  <div className="text-[9px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: TM }}>Consensus</div>
                </div>
                <div className="flex-1">
                  <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
                    <div className="rounded-l-full" style={{ flex: ANALYST_CONSENSUS.buy, background: GR }} />
                    <div style={{ flex: ANALYST_CONSENSUS.overweight, background: `${GR}70` }} />
                    <div style={{ flex: ANALYST_CONSENSUS.hold, background: "rgba(255,255,255,0.10)" }} />
                    <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${RD}70` }} />
                    <div className="rounded-r-full" style={{ flex: ANALYST_CONSENSUS.sell, background: RD }} />
                  </div>
                  <div className="flex justify-between text-[9px] mt-1" style={{ color: TM }}>
                    <span>Buy {ANALYST_CONSENSUS.buy}</span>
                    <span>Hold {ANALYST_CONSENSUS.hold}</span>
                    <span>Sell {ANALYST_CONSENSUS.sell}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-3 rounded-2xl text-center text-sm mb-5" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TM }}>Low</div>
                  <div className="font-semibold tabular-nums" style={{ color: RD }}>{usd(ANALYST_CONSENSUS.lowTarget)}</div>
                </div>
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TM }}>Average</div>
                  <div className="font-semibold tabular-nums bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{usd(ANALYST_CONSENSUS.avgTarget)}</div>
                </div>
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TM }}>High</div>
                  <div className="font-semibold tabular-nums" style={{ color: GR }}>{usd(ANALYST_CONSENSUS.highTarget)}</div>
                </div>
              </div>
              <div>
                {ANALYSTS.map((a, i) => (
                  <div key={a.firm} className={`flex items-center justify-between py-3 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: TX }}>{a.firm}</div>
                      <div className="text-xs" style={{ color: TM }}>{a.analyst} · {a.date}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{
                        color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? GR : a.rating.includes("Sell") || a.rating.includes("Underperform") ? RD : T2,
                        background: a.rating.includes("Buy") || a.rating.includes("Overweight") ? `${GR}18` : a.rating.includes("Sell") || a.rating.includes("Underperform") ? `${RD}18` : "rgba(255,255,255,0.06)",
                      }}>{a.rating}</span>
                      <div className="text-sm font-semibold tabular-nums mt-1" style={{ color: TX }}>{usd(a.target)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Glass>
            <Glass title="Analyst Commentary" className="lg:col-span-2">
              <div className="space-y-6">
                {ANALYST_COMMENTARY.map((c, i) => (
                  <div key={i} className={i > 0 ? "pt-6 border-t" : ""} style={{ borderColor: BD }}>
                    <div className="mb-2">
                      <h4 className="text-sm font-semibold" style={{ color: TX }}>{c.title}</h4>
                      <span className="text-xs" style={{ color: TM }}>{c.firm} — {c.analyst} · {c.date}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: T2 }}>{c.snippet}</p>
                  </div>
                ))}
              </div>
            </Glass>
          </div>

          {/* ── Earnings History ── */}
          <Glass title="Earnings History">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TM }}>
                    <th className="text-left py-3 border-b" style={{ borderColor: BD }}>Quarter</th>
                    <th className="text-left py-3 border-b" style={{ borderColor: BD }}>Date</th>
                    <th className="text-right py-3 border-b" style={{ borderColor: BD }}>EPS Est</th>
                    <th className="text-right py-3 border-b" style={{ borderColor: BD }}>EPS Actual</th>
                    <th className="text-right py-3 border-b" style={{ borderColor: BD }}>Revenue</th>
                    <th className="text-right py-3 border-b" style={{ borderColor: BD }}>Rev Growth</th>
                    <th className="text-right py-3 border-b" style={{ borderColor: BD }}>Surprise</th>
                  </tr>
                </thead>
                <tbody>
                  {EARNINGS.map((e) => (
                    <tr key={e.quarter} className="border-t" style={{ borderColor: `${BD}` }}>
                      <td className="py-3 font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{e.quarter}</td>
                      <td className="py-3" style={{ color: TM }}>{e.date}</td>
                      <td className="py-3 text-right tabular-nums" style={{ color: TM }}>{usd(e.epsEst)}</td>
                      <td className="py-3 text-right tabular-nums font-semibold" style={{ color: e.epsActual >= e.epsEst ? GR : RD }}>{usd(e.epsActual)}</td>
                      <td className="py-3 text-right tabular-nums" style={{ color: TX }}>{e.revenue}</td>
                      <td className="py-3 text-right tabular-nums" style={{ color: e.revenueGrowth >= 0 ? GR : RD }}>{pct(e.revenueGrowth)}</td>
                      <td className="py-3 text-right tabular-nums font-semibold" style={{ color: e.surprise.startsWith("+") ? GR : RD }}>{e.surprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Glass>

          {/* ── Financials 3-col ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Glass title="Income Statement (TTM)">
              {INCOME_STATEMENT.map((row, i) => (
                <div key={row.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                  <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums" style={{ color: TX }}>{row.value}</span>
                    {row.yoy && <span className="text-xs tabular-nums" style={{ color: row.yoy.startsWith("+") ? GR : row.yoy.startsWith("−") ? RD : TM }}>{row.yoy}</span>}
                  </div>
                </div>
              ))}
            </Glass>
            <Glass title="Balance Sheet">
              {BALANCE_SHEET.map((row, i) => (
                <div key={row.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                  <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: row.value.startsWith("-") ? RD : TX }}>{row.value}</span>
                </div>
              ))}
            </Glass>
            <Glass title="Cash Flow Statement">
              {CASH_FLOW.map((row, i) => (
                <div key={row.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                  <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums" style={{ color: row.value.startsWith("-") ? RD : TX }}>{row.value}</span>
                    {row.yoy && <span className="text-xs tabular-nums" style={{ color: TM }}>{row.yoy}</span>}
                  </div>
                </div>
              ))}
            </Glass>
          </div>

          {/* ── Risks + Catalysts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Glass title="Key Risks">
              <div className="space-y-5">
                {KEY_RISKS.map((r, i) => (
                  <div key={i} className={i > 0 ? "pt-5 border-t" : ""} style={{ borderColor: BD }}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold" style={{ color: TX }}>{r.title}</h4>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{
                        color: r.severity === "High" ? RD : r.severity === "Medium" ? "#fbbf24" : TM,
                        background: r.severity === "High" ? `${RD}18` : r.severity === "Medium" ? "rgba(251,191,36,0.10)" : "rgba(255,255,255,0.05)",
                      }}>{r.severity}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: T2 }}>{r.description}</p>
                  </div>
                ))}
              </div>
            </Glass>
            <Glass title="Upcoming Catalysts">
              <div className="space-y-5">
                {CATALYSTS.map((c, i) => (
                  <div key={i} className={i > 0 ? "pt-5 border-t" : ""} style={{ borderColor: BD }}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold" style={{ color: TX }}>{c.title}</h4>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400/20 to-purple-400/20" style={{ color: CY }}>{c.timeline}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: T2 }}>{c.description}</p>
                  </div>
                ))}
              </div>
            </Glass>
          </div>

          {/* ── Competitive Landscape ── */}
          <Glass title="Competitive Landscape">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TM }}>
                    <th className="text-left py-3 border-b" style={{ borderColor: BD }}>Company</th>
                    <th className="text-right py-3 border-b" style={{ borderColor: BD }}>Market Cap</th>
                    <th className="text-right py-3 border-b" style={{ borderColor: BD }}>P/E</th>
                    <th className="text-right py-3 border-b" style={{ borderColor: BD }}>Revenue</th>
                    <th className="text-right py-3 border-b" style={{ borderColor: BD }}>Net Margin</th>
                    <th className="text-right py-3 border-b" style={{ borderColor: BD }}>Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPETITORS.map((c) => (
                    <tr key={c.ticker} className="border-t" style={{ borderColor: BD }}>
                      <td className="py-3">
                        <span className="font-semibold" style={{ color: CY }}>{c.ticker}</span>
                        <span className="ml-2" style={{ color: TM }}>{c.name}</span>
                      </td>
                      <td className="py-3 text-right tabular-nums" style={{ color: TX }}>{c.marketCap}</td>
                      <td className="py-3 text-right tabular-nums" style={{ color: T2 }}>{c.pe}</td>
                      <td className="py-3 text-right tabular-nums" style={{ color: TX }}>{c.revenue}</td>
                      <td className="py-3 text-right tabular-nums" style={{ color: T2 }}>{c.margin}</td>
                      <td className="py-3 text-right tabular-nums font-semibold" style={{ color: c.growth.startsWith("+") ? GR : RD }}>{c.growth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Glass>

          {/* ── Valuation + Technicals + Dividends ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Glass title="Valuation Ratios">
              {VALUATION_RATIOS.map((r, i) => (
                <div key={r.label} className={`flex justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                  <span className="text-sm" style={{ color: T2 }}>{r.label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: TX }}>{r.value}</span>
                </div>
              ))}
            </Glass>
            <Glass title="Technical Indicators">
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
                <div key={t.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                  <span className="text-sm" style={{ color: T2 }}>{t.label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: t.signal ? GR : RD }}>{t.value}</span>
                </div>
              ))}
            </Glass>
            <Glass title="Dividend History">
              {DIVIDEND_HISTORY.map((d, i) => (
                <div key={d.year} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                  <span className="text-sm font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{d.year}</span>
                  <div className="flex items-center gap-3 text-sm tabular-nums">
                    <span className="font-semibold" style={{ color: TX }}>{d.annual}</span>
                    <span style={{ color: TM }}>{d.yield}</span>
                    <span style={{ color: GR }}>{d.growth}</span>
                  </div>
                </div>
              ))}
            </Glass>
          </div>

          {/* ── Holders + ESG ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Glass title="Top Institutional Holders">
              {TOP_HOLDERS.map((h, i) => (
                <div key={h.name} className={`flex items-center justify-between py-3 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                  <span className="text-sm" style={{ color: TX }}>{h.name}</span>
                  <div className="flex items-center gap-4 text-sm tabular-nums">
                    <span style={{ color: TM }}>{h.shares}</span>
                    <span className="font-semibold w-11 text-right" style={{ color: CY }}>{h.pct}</span>
                    <span style={{ color: T2 }} className="w-20 text-right">{h.value}</span>
                  </div>
                </div>
              ))}
            </Glass>
            <Glass title={`ESG Rating — ${ESG.provider}`}>
              <div className="flex items-center gap-5 mb-5">
                <div className="w-14 h-14 rounded-full flex flex-col items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="text-xl font-bold" style={{ color: GR }}>{ESG.rating}</div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {[
                    { label: "Environment", score: ESG.environmentScore },
                    { label: "Social", score: ESG.socialScore },
                    { label: "Governance", score: ESG.governanceScore },
                  ].map((e) => (
                    <div key={e.label} className="text-center py-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{e.score}</div>
                      <div className="text-[8px] font-semibold uppercase tracking-widest" style={{ color: TM }}>{e.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-px mb-4" style={{ background: BD }} />
              <div className="space-y-2">
                {ESG.highlights.map((h, i) => (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: T2 }}>
                    <span style={{ color: CY }}>•</span> {h}
                  </p>
                ))}
              </div>
            </Glass>
          </div>

          {/* ── Watchlist + News + Sector ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Glass title="Watchlist">
              {WATCHLIST.map((w, i) => (
                <div key={w.ticker} className={`flex items-center justify-between py-2.5 cursor-pointer ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: TX }}>{w.ticker}</span>
                    <span className="text-xs ml-2" style={{ color: TM }}>{w.volume}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums" style={{ color: TX }}>{usd(w.price)}</div>
                    <div className="text-xs tabular-nums" style={{ color: w.change >= 0 ? GR : RD }}>{pct(w.change)}</div>
                  </div>
                </div>
              ))}
            </Glass>
            <Glass title="News Wire">
              {NEWS.map((n, i) => (
                <div key={i} className={`py-3 cursor-pointer ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                  <span className="text-xs font-mono mr-2" style={{ color: CY }}>{n.time}</span>
                  <span className="text-sm" style={{ color: T2 }}>{n.headline}</span>
                </div>
              ))}
            </Glass>
            <Glass title="Sector Performance">
              {SECTOR_PERFORMANCE.map((s, i) => (
                <div key={s.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: BD }}>
                  <span className="text-sm" style={{ color: T2 }}>{s.label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: s.value.startsWith("+") ? GR : RD }}>{s.value}</span>
                </div>
              ))}
            </Glass>
          </div>

        </main>

        {/* ── Footer ── */}
        <footer className="border-t mt-10" style={{ borderColor: BD }}>
          <div className="mx-auto max-w-7xl px-8 py-5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest" style={{ color: TM }}>
            <span>Zero Sum — Style 11: Aurora Gradient Mesh</span>
            <span>Sample data only</span>
            <span>© 2026 Zero Sum</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
