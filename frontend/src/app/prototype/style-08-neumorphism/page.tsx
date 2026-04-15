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
   Style 08 — Neumorphism (Soft UI)
   Base bg #e0e5ec, dual-direction shadows, no borders,
   tactile extruded / inset elements. Nunito / Poppins.
   ══════════════════════════════════════════════════════════════ */

const BG  = "#e0e5ec";
const SD  = "#a3b1c6";  // shadow dark
const SL  = "#ffffff";  // shadow light
const raised = `6px 6px 12px ${SD}, -6px -6px 12px ${SL}`;
const raisedSm = `3px 3px 6px ${SD}, -3px -3px 6px ${SL}`;
const inset  = `inset 3px 3px 6px ${SD}, inset -3px -3px 6px ${SL}`;

const nClr = (n: number) => (n >= 0 ? "text-green-600" : "text-red-500");

/* ─── Sparkline ─── */
function Sparkline({ positive }: { positive: boolean }) {
  const pts = positive
    ? "0,22 10,19 20,21 30,16 40,18 50,12 60,14 70,9 80,11 90,7 100,5"
    : "0,5 10,8 20,6 30,12 40,9 50,15 60,13 70,18 80,20 90,16 100,22";
  return (
    <svg width="100" height="28" viewBox="0 0 100 28" className="inline-block">
      <polyline points={pts} fill="none" stroke={positive ? "#48bb78" : "#fc8181"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Soft Card (raised) ─── */
function SCard({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`} style={{ background: BG, boxShadow: raised }}>
      {title && <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-4">{title}</h3>}
      {children}
    </div>
  );
}

/* ─── Inset separator ─── */
function InsetLine() {
  return <div className="h-px my-4 rounded-full" style={{ background: BG, boxShadow: `inset 1px 1px 2px ${SD}, inset -1px -1px 2px ${SL}` }} />;
}

/* ─── Range bar ─── */
function RangeBar({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-5">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">{label}</div>
      <div className="h-2 rounded-full relative" style={{ background: BG, boxShadow: inset }}>
        <div className="absolute h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500" style={{ width: `${p}%` }} />
        <div className="absolute top-[-2px] w-3 h-3 rounded-full bg-indigo-500" style={{ left: `calc(${p}% - 6px)`, boxShadow: raisedSm }} />
      </div>
      <div className="flex justify-between text-[11px] text-gray-500 mt-1.5 tabular-nums">
        <span>{usd(low)}</span>
        <span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */
export default function NeumorphismPrototype() {
  return (
    <div className="min-h-screen text-gray-800" style={{ background: BG, fontFamily: "'Nunito', 'Poppins', 'DM Sans', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50" style={{ background: BG }}>
        <div className="mx-auto max-w-7xl px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/prototype" className="flex items-center gap-3 text-lg font-bold text-gray-700 hover:text-indigo-600 transition-colors">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white text-sm font-bold select-none bg-gradient-to-br from-indigo-500 to-indigo-600" style={{ boxShadow: raisedSm, fontFamily: "'STIX Two Math', serif" }}>∑</span>
              Zero Sum
            </Link>
            <div className="h-5 w-px" style={{ background: SD, opacity: 0.4 }} />
            <span className="text-xs uppercase tracking-wider text-gray-500">Soft UI</span>
          </div>
          <Link href="/prototype" className="text-xs uppercase tracking-wider text-gray-500 hover:text-indigo-600 transition-colors">← All Styles</Link>
        </div>
        {/* Inset line at bottom */}
        <div className="mx-8 h-px rounded-full" style={{ boxShadow: `inset 1px 1px 1px ${SD}, inset -1px -1px 1px ${SL}` }} />
      </header>

      <main className="mx-auto max-w-7xl px-8 py-10 space-y-8">

        {/* ── Price Hero ── */}
        <div className="rounded-2xl p-8" style={{ background: BG, boxShadow: raised }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-extrabold text-gray-800 tracking-wide">{STOCK.ticker}</span>
                <span className="text-xs uppercase tracking-wider text-gray-500 px-3 py-1 rounded-lg" style={{ background: BG, boxShadow: inset }}>{STOCK.exchange}</span>
              </div>
              <p className="text-sm text-gray-500">{STOCK.name} — {STOCK.sector} / {STOCK.industry}</p>
            </div>
            <div className="flex items-end gap-5">
              <span className="text-5xl font-extrabold tabular-nums text-gray-800">{usd(STOCK.price)}</span>
              <div className="flex flex-col items-end pb-1">
                <span className={`text-lg font-bold tabular-nums ${nClr(STOCK.change)}`}>
                  {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                </span>
                <span className={`text-sm tabular-nums ${nClr(STOCK.changePct)}`}>({pct(STOCK.changePct)})</span>
              </div>
              <Sparkline positive={STOCK.change >= 0} />
            </div>
          </div>
        </div>

        {/* ── Chart Placeholder ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: BG, boxShadow: raised }}>
          <div className="px-6 py-4 flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold">Price Chart</h3>
            <div className="flex gap-2">
              {["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"].map((p) => (
                <button key={p} className="px-3 py-1.5 text-xs rounded-lg font-bold transition-all" style={{
                  background: BG,
                  boxShadow: p === "1Y" ? inset : raisedSm,
                  color: p === "1Y" ? "#667eea" : "#718096",
                }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-72 relative mx-6 mb-6 rounded-xl overflow-hidden" style={{ boxShadow: inset }}>
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 180">
              <defs>
                <linearGradient id="neuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#667eea" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#667eea" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <polyline
                points="0,150 20,145 40,148 60,130 80,135 100,118 120,122 140,108 160,112 180,98 200,102 220,88 240,94 260,80 280,85 300,72 320,76 340,64 360,60 380,63 400,56"
                fill="none" stroke="#667eea" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              />
              <polyline
                points="0,150 20,145 40,148 60,130 80,135 100,118 120,122 140,108 160,112 180,98 200,102 220,88 240,94 260,80 280,85 300,72 320,76 340,64 360,60 380,63 400,56 400,180 0,180"
                fill="url(#neuGrad)"
              />
              <circle cx="400" cy="56" r="4" fill="#667eea">
                <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
        </div>

        {/* ── Key Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
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
            <div key={s.label} className="rounded-xl p-3.5" style={{ background: BG, boxShadow: raisedSm }}>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">{s.label}</div>
              <div className="text-base font-bold tabular-nums text-gray-800">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Company Profile + Range ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SCard title="Company Profile" className="lg:col-span-2">
            <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{COMPANY_DESCRIPTION}</p>
            <InsetLine />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
              {[
                { label: "CEO", value: STOCK.ceo },
                { label: "HQ", value: STOCK.headquarters },
                { label: "Employees", value: STOCK.employees.toLocaleString() },
                { label: "Founded", value: STOCK.founded },
                { label: "IPO Date", value: STOCK.ipoDate },
                { label: "Fiscal Year", value: STOCK.fiscalYearEnd },
              ].map((item) => (
                <div key={item.label}>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">{item.label}</span>
                  <div className="text-gray-800 font-bold mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
          </SCard>
          <SCard title="Price Ranges">
            <RangeBar low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today's Range" />
            <RangeBar low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week Range" />
            <InsetLine />
            <div className="space-y-3">
              {[
                { label: "Open", value: usd(STOCK.open) },
                { label: "Prev Close", value: usd(STOCK.prevClose) },
                { label: "Avg Volume", value: fmt(STOCK.avgVolume) },
                { label: "Shares Out", value: fmt(STOCK.sharesOut) },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-gray-500 text-xs uppercase tracking-wider">{r.label}</span>
                  <span className="font-bold tabular-nums text-gray-800">{r.value}</span>
                </div>
              ))}
            </div>
          </SCard>
        </div>

        {/* ── Business Segments ── */}
        <SCard title="Business Segments">
          <div className="space-y-6">
            {SEGMENTS.map((seg) => (
              <div key={seg.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">{seg.name}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="tabular-nums font-bold text-indigo-600">{seg.revenue}</span>
                    <span className="tabular-nums text-gray-500">{seg.pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden relative" style={{ background: BG, boxShadow: inset }}>
                  <div className="absolute h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500" style={{ width: `${seg.pct * 2}%` }} />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mt-2">{seg.description}</p>
              </div>
            ))}
          </div>
        </SCard>

        {/* ── AI Analysis ── */}
        <SCard title="AI Analysis Summary">
          <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{AI_ANALYSIS.summary}</p>
          <InsetLine />
          <div>
            <h4 className="text-xs uppercase tracking-wider text-indigo-600 font-bold mb-2">12–18 Month Outlook</h4>
            <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{AI_ANALYSIS.outlook}</p>
          </div>
        </SCard>

        {/* ── Bull / Bear Case ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bull */}
          <div className="rounded-2xl p-6" style={{ background: BG, boxShadow: raised }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-green-600 text-sm font-bold">▲</span>
              <h3 className="text-xs uppercase tracking-wider font-bold text-green-600">{BULL_CASE.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line mb-4">{BULL_CASE.thesis}</p>
            <InsetLine />
            <div className="grid grid-cols-2 gap-3">
              {BULL_CASE.keyMetrics.map((m) => (
                <div key={m.label} className="flex justify-between text-sm">
                  <span className="text-gray-500 text-xs">{m.label}</span>
                  <span className="font-bold text-green-600 tabular-nums">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Bear */}
          <div className="rounded-2xl p-6" style={{ background: BG, boxShadow: raised }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-red-500 text-sm font-bold">▼</span>
              <h3 className="text-xs uppercase tracking-wider font-bold text-red-500">{BEAR_CASE.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line mb-4">{BEAR_CASE.thesis}</p>
            <InsetLine />
            <div className="grid grid-cols-2 gap-3">
              {BEAR_CASE.keyMetrics.map((m) => (
                <div key={m.label} className="flex justify-between text-sm">
                  <span className="text-gray-500 text-xs">{m.label}</span>
                  <span className="font-bold text-red-500 tabular-nums">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Analyst Consensus + Commentary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SCard title="Analyst Consensus">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-green-600">{ANALYST_CONSENSUS.rating}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">Consensus</div>
              </div>
              <div className="flex-1">
                <div className="flex gap-1 h-3 rounded-full overflow-hidden" style={{ boxShadow: inset }}>
                  <div className="bg-green-500 rounded-l-full" style={{ flex: ANALYST_CONSENSUS.buy }} />
                  <div className="bg-green-300" style={{ flex: ANALYST_CONSENSUS.overweight }} />
                  <div className="bg-gray-400" style={{ flex: ANALYST_CONSENSUS.hold }} />
                  <div className="bg-red-300" style={{ flex: ANALYST_CONSENSUS.underweight }} />
                  <div className="bg-red-500 rounded-r-full" style={{ flex: ANALYST_CONSENSUS.sell }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>Buy {ANALYST_CONSENSUS.buy}</span>
                  <span>Hold {ANALYST_CONSENSUS.hold}</span>
                  <span>Sell {ANALYST_CONSENSUS.sell}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 py-4 text-center text-sm rounded-xl mb-4" style={{ background: BG, boxShadow: inset }}>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Low</div>
                <div className="font-bold tabular-nums text-red-500">{usd(ANALYST_CONSENSUS.lowTarget)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Average</div>
                <div className="font-bold tabular-nums text-indigo-600">{usd(ANALYST_CONSENSUS.avgTarget)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">High</div>
                <div className="font-bold tabular-nums text-green-600">{usd(ANALYST_CONSENSUS.highTarget)}</div>
              </div>
            </div>
            <div className="space-y-0">
              {ANALYSTS.map((a, i) => (
                <div key={a.firm} className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-gray-300/50" : ""}`}>
                  <div>
                    <div className="text-sm font-bold text-gray-700">{a.firm}</div>
                    <div className="text-xs text-gray-500">{a.analyst} · {a.date}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-lg ${
                      a.rating.includes("Buy") || a.rating.includes("Overweight")
                        ? "text-green-700 bg-green-100"
                        : a.rating.includes("Sell") || a.rating.includes("Underperform")
                        ? "text-red-700 bg-red-100"
                        : "text-gray-600 bg-gray-200"
                    }`}>{a.rating}</span>
                    <div className="text-sm font-bold tabular-nums text-gray-700 mt-1">{usd(a.target)}</div>
                  </div>
                </div>
              ))}
            </div>
          </SCard>
          <SCard title="Analyst Commentary" className="lg:col-span-2">
            <div className="space-y-5">
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-5 border-t border-gray-300/50" : ""}>
                  <div className="mb-2">
                    <h4 className="text-sm font-bold text-gray-700">{c.title}</h4>
                    <span className="text-xs text-gray-500">{c.firm} — {c.analyst} · {c.date}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-500">{c.snippet}</p>
                </div>
              ))}
            </div>
          </SCard>
        </div>

        {/* ── Earnings History ── */}
        <SCard title="Earnings History">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500">
                  <th className="text-left py-3 font-bold">Quarter</th>
                  <th className="text-left py-3 font-bold">Date</th>
                  <th className="text-right py-3 font-bold">EPS Est</th>
                  <th className="text-right py-3 font-bold">EPS Actual</th>
                  <th className="text-right py-3 font-bold">Revenue</th>
                  <th className="text-right py-3 font-bold">Rev Growth</th>
                  <th className="text-right py-3 font-bold">Surprise</th>
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((e) => (
                  <tr key={e.quarter} className="border-t border-gray-300/40">
                    <td className="py-3 font-bold text-indigo-600">{e.quarter}</td>
                    <td className="py-3 text-gray-500">{e.date}</td>
                    <td className="py-3 text-right tabular-nums text-gray-500">{usd(e.epsEst)}</td>
                    <td className={`py-3 text-right tabular-nums font-bold ${e.epsActual >= e.epsEst ? "text-green-600" : "text-red-500"}`}>{usd(e.epsActual)}</td>
                    <td className="py-3 text-right tabular-nums text-gray-700">{e.revenue}</td>
                    <td className={`py-3 text-right tabular-nums ${e.revenueGrowth >= 0 ? "text-green-600" : "text-red-500"}`}>{pct(e.revenueGrowth)}</td>
                    <td className={`py-3 text-right tabular-nums font-bold ${e.surprise.startsWith("+") ? "text-green-600" : "text-red-500"}`}>{e.surprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SCard>

        {/* ── Financials 3-col ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SCard title="Income Statement (TTM)">
            <div className="space-y-0">
              {INCOME_STATEMENT.map((row, i) => (
                <div key={row.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-gray-300/40" : ""}`}>
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-gray-700">{row.value}</span>
                    {row.yoy && <span className={`text-xs tabular-nums ${row.yoy.startsWith("+") ? "text-green-600" : row.yoy.startsWith("−") ? "text-red-500" : "text-gray-500"}`}>{row.yoy}</span>}
                  </div>
                </div>
              ))}
            </div>
          </SCard>
          <SCard title="Balance Sheet">
            <div className="space-y-0">
              {BALANCE_SHEET.map((row, i) => (
                <div key={row.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-gray-300/40" : ""}`}>
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${row.value.startsWith("-") ? "text-red-500" : "text-gray-700"}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </SCard>
          <SCard title="Cash Flow Statement">
            <div className="space-y-0">
              {CASH_FLOW.map((row, i) => (
                <div key={row.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-gray-300/40" : ""}`}>
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold tabular-nums ${row.value.startsWith("-") ? "text-red-500" : "text-gray-700"}`}>{row.value}</span>
                    {row.yoy && <span className="text-xs tabular-nums text-gray-500">{row.yoy}</span>}
                  </div>
                </div>
              ))}
            </div>
          </SCard>
        </div>

        {/* ── Risks + Catalysts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SCard title="Key Risks">
            <div className="space-y-5">
              {KEY_RISKS.map((r, i) => (
                <div key={i} className={i > 0 ? "pt-5 border-t border-gray-300/40" : ""}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-700">{r.title}</h4>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                      r.severity === "High" ? "text-red-700 bg-red-100"
                      : r.severity === "Medium" ? "text-yellow-700 bg-yellow-100"
                      : "text-gray-600 bg-gray-200"
                    }`}>{r.severity}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-500">{r.description}</p>
                </div>
              ))}
            </div>
          </SCard>
          <SCard title="Upcoming Catalysts">
            <div className="space-y-5">
              {CATALYSTS.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-5 border-t border-gray-300/40" : ""}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-700">{c.title}</h4>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">{c.timeline}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-500">{c.description}</p>
                </div>
              ))}
            </div>
          </SCard>
        </div>

        {/* ── Competitive Landscape ── */}
        <SCard title="Competitive Landscape">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500">
                  <th className="text-left py-3 font-bold">Company</th>
                  <th className="text-right py-3 font-bold">Market Cap</th>
                  <th className="text-right py-3 font-bold">P/E</th>
                  <th className="text-right py-3 font-bold">Revenue</th>
                  <th className="text-right py-3 font-bold">Net Margin</th>
                  <th className="text-right py-3 font-bold">Growth</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c) => (
                  <tr key={c.ticker} className="border-t border-gray-300/40">
                    <td className="py-3">
                      <span className="font-bold text-indigo-600">{c.ticker}</span>
                      <span className="ml-2 text-gray-500">{c.name}</span>
                    </td>
                    <td className="py-3 text-right tabular-nums text-gray-700">{c.marketCap}</td>
                    <td className="py-3 text-right tabular-nums text-gray-500">{c.pe}</td>
                    <td className="py-3 text-right tabular-nums text-gray-700">{c.revenue}</td>
                    <td className="py-3 text-right tabular-nums text-gray-500">{c.margin}</td>
                    <td className={`py-3 text-right tabular-nums font-bold ${c.growth.startsWith("+") ? "text-green-600" : "text-red-500"}`}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SCard>

        {/* ── Valuation + Technicals + Dividends ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SCard title="Valuation Ratios">
            <div className="space-y-0">
              {VALUATION_RATIOS.map((r, i) => (
                <div key={r.label} className={`flex justify-between py-2.5 ${i > 0 ? "border-t border-gray-300/40" : ""}`}>
                  <span className="text-sm text-gray-500">{r.label}</span>
                  <span className="text-sm font-bold tabular-nums text-gray-700">{r.value}</span>
                </div>
              ))}
            </div>
          </SCard>
          <SCard title="Technical Indicators">
            <div className="space-y-0">
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
                <div key={t.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-gray-300/40" : ""}`}>
                  <span className="text-sm text-gray-500">{t.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${t.signal ? "text-green-600" : "text-red-500"}`}>{t.value}</span>
                </div>
              ))}
            </div>
          </SCard>
          <SCard title="Dividend History">
            <div className="space-y-0">
              {DIVIDEND_HISTORY.map((d, i) => (
                <div key={d.year} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-gray-300/40" : ""}`}>
                  <span className="text-sm font-bold text-indigo-600">{d.year}</span>
                  <div className="flex items-center gap-3 text-sm tabular-nums">
                    <span className="text-gray-700 font-bold">{d.annual}</span>
                    <span className="text-gray-500">{d.yield}</span>
                    <span className="text-green-600">{d.growth}</span>
                  </div>
                </div>
              ))}
            </div>
          </SCard>
        </div>

        {/* ── Holders + ESG ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SCard title="Top Institutional Holders">
            <div className="space-y-0">
              {TOP_HOLDERS.map((h, i) => (
                <div key={h.name} className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-gray-300/40" : ""}`}>
                  <span className="text-sm text-gray-700">{h.name}</span>
                  <div className="flex items-center gap-4 text-sm tabular-nums">
                    <span className="text-gray-500">{h.shares}</span>
                    <span className="font-bold text-indigo-600 w-12 text-right">{h.pct}</span>
                    <span className="text-gray-500 w-20 text-right">{h.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </SCard>
          <SCard title={`ESG Rating — ${ESG.provider}`}>
            <div className="flex items-center gap-6 mb-4">
              <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center" style={{ background: BG, boxShadow: inset }}>
                <div className="text-xl font-extrabold text-green-600">{ESG.rating}</div>
                <div className="text-[8px] uppercase tracking-wider text-gray-500">Overall</div>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-3">
                {[
                  { label: "Environment", score: ESG.environmentScore },
                  { label: "Social", score: ESG.socialScore },
                  { label: "Governance", score: ESG.governanceScore },
                ].map((e) => (
                  <div key={e.label} className="text-center px-2 py-2 rounded-xl" style={{ background: BG, boxShadow: raisedSm }}>
                    <div className="text-lg font-bold text-indigo-600">{e.score}</div>
                    <div className="text-[9px] uppercase tracking-wider text-gray-500">{e.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <InsetLine />
            <div className="space-y-2">
              {ESG.highlights.map((h, i) => (
                <p key={i} className="text-sm leading-relaxed text-gray-500">
                  <span className="text-indigo-600 font-bold">•</span> {h}
                </p>
              ))}
            </div>
          </SCard>
        </div>

        {/* ── Watchlist + News + Sector ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SCard title="Watchlist">
            <div className="space-y-0">
              {WATCHLIST.map((w, i) => (
                <div key={w.ticker} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-gray-300/40" : ""} cursor-pointer`}>
                  <div>
                    <span className="text-sm font-bold text-gray-700">{w.ticker}</span>
                    <span className="text-xs text-gray-500 ml-2">{w.volume}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums text-gray-700">{usd(w.price)}</div>
                    <div className={`text-xs tabular-nums ${w.change >= 0 ? "text-green-600" : "text-red-500"}`}>{pct(w.change)}</div>
                  </div>
                </div>
              ))}
            </div>
          </SCard>
          <SCard title="News Wire">
            <div className="space-y-0">
              {NEWS.map((n, i) => (
                <div key={i} className={`py-3 ${i > 0 ? "border-t border-gray-300/40" : ""} cursor-pointer`}>
                  <span className="text-xs font-mono text-indigo-500 mr-2">{n.time}</span>
                  <span className="text-sm text-gray-600">{n.headline}</span>
                </div>
              ))}
            </div>
          </SCard>
          <SCard title="Sector Performance">
            <div className="space-y-0">
              {SECTOR_PERFORMANCE.map((s, i) => (
                <div key={s.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-gray-300/40" : ""}`}>
                  <span className="text-sm text-gray-500">{s.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${s.value.startsWith("+") ? "text-green-600" : "text-red-500"}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </SCard>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="mt-10">
        <div className="mx-8 h-px rounded-full" style={{ boxShadow: `inset 1px 1px 1px ${SD}, inset -1px -1px 1px ${SL}` }} />
        <div className="mx-auto max-w-7xl px-8 py-5 flex items-center justify-between text-xs uppercase tracking-wider text-gray-500">
          <span>Zero Sum — Style 08: Neumorphism</span>
          <span>Sample data only</span>
          <span>© 2026 Zero Sum</span>
        </div>
      </footer>
    </div>
  );
}
