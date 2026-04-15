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
   Style 10 — Material Design 3 / Google Finance
   Tonal surfaces, rounded-xl/-2xl, MD3 color system,
   clear type hierarchy (Display/Headline/Title/Body/Label).
   ══════════════════════════════════════════════════════════════ */

const BG  = "#1c1b1f";
const SF  = "#2b2930";
const SV  = "#36343b";
const BD  = "#49454f";
const TP  = "#e6e1e5";
const TS  = "#cac4d0";
const TM  = "#938f99";
const AP  = "#d0bcff";   // primary purple tonal
const AT  = "#efb8c8";   // tertiary pink tonal
const AG  = "#81c784";   // positive
const AR  = "#ef5350";   // negative

const mClr = (n: number) => (n >= 0 ? AG : AR);

/* ─── Sparkline ─── */
function Sparkline({ positive }: { positive: boolean }) {
  const pts = positive
    ? "0,22 10,19 20,21 30,16 40,18 50,12 60,14 70,9 80,11 90,7 100,5"
    : "0,5 10,8 20,6 30,12 40,9 50,15 60,13 70,18 80,20 90,16 100,22";
  return (
    <svg width="100" height="28" viewBox="0 0 100 28" className="inline-block">
      <polyline points={pts} fill="none" stroke={positive ? AG : AR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── MD3 Card (filled variant) ─── */
function MCard({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-5 ${className}`} style={{ background: SF }}>
      {title && <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: TM }}>{title}</h3>}
      {children}
    </div>
  );
}

/* ─── MD3 Chip ─── */
function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-medium" style={{ borderColor: BD, color: color || TS }}>
      {label}
    </span>
  );
}

/* ─── Range bar ─── */
function RangeBar({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-5">
      <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: TM }}>{label}</div>
      <div className="relative h-1.5 rounded-full" style={{ background: SV }}>
        <div className="absolute h-full rounded-full" style={{ width: `${p}%`, background: AP }} />
        <div className="absolute top-[-3px] w-3 h-3 rounded-full" style={{ left: `calc(${p}% - 6px)`, background: AP, boxShadow: `0 2px 8px ${AP}66` }} />
      </div>
      <div className="flex justify-between text-[11px] mt-1.5 tabular-nums" style={{ color: TM }}>
        <span>{usd(low)}</span>
        <span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */
export default function MaterialPrototype() {
  return (
    <div className="min-h-screen" style={{ background: BG, color: TP, fontFamily: "'Roboto Flex', 'Google Sans', 'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b" style={{ background: SF, borderColor: BD }}>
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/prototype" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold" style={{ background: AP, color: "#381e72", fontFamily: "'STIX Two Math', serif" }}>∑</span>
              <span className="text-base font-medium" style={{ color: TP }}>Zero Sum</span>
            </Link>
            <Chip label="Material Design 3" />
          </div>
          <Link href="/prototype" className="text-xs font-medium hover:underline" style={{ color: AP }}>← All Styles</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">

        {/* ── Price Hero ── */}
        <div className="rounded-2xl p-8" style={{ background: SF }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-medium" style={{ color: TP }}>{STOCK.ticker}</span>
                <Chip label={STOCK.exchange} />
              </div>
              <p className="text-sm" style={{ color: TS }}>{STOCK.name} — {STOCK.sector} / {STOCK.industry}</p>
            </div>
            <div className="flex items-end gap-5">
              <span className="text-5xl font-light tabular-nums" style={{ color: TP }}>{usd(STOCK.price)}</span>
              <div className="flex flex-col items-end pb-1">
                <span className="text-lg font-medium tabular-nums" style={{ color: mClr(STOCK.change) }}>
                  {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                </span>
                <span className="text-sm tabular-nums" style={{ color: mClr(STOCK.changePct) }}>({pct(STOCK.changePct)})</span>
              </div>
              <Sparkline positive={STOCK.change >= 0} />
            </div>
          </div>
        </div>

        {/* ── Chart Placeholder ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: SF }}>
          <div className="px-5 py-3 flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: TM }}>Price Chart</h3>
            <div className="flex gap-1">
              {["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"].map((p) => (
                <button key={p} className="px-3 py-1.5 text-xs rounded-full font-medium transition-shadow" style={{
                  color: p === "1Y" ? "#381e72" : TS,
                  background: p === "1Y" ? AP : "transparent",
                  boxShadow: p === "1Y" ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-72 relative mx-5 mb-5 rounded-xl overflow-hidden" style={{ background: SV }}>
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 180">
              <defs>
                <linearGradient id="mdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AP} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={AP} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <polyline
                points="0,150 20,145 40,148 60,130 80,135 100,118 120,122 140,108 160,112 180,98 200,102 220,88 240,94 260,80 280,85 300,72 320,76 340,64 360,60 380,63 400,56"
                fill="none" stroke={AP} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              />
              <polyline
                points="0,150 20,145 40,148 60,130 80,135 100,118 120,122 140,108 160,112 180,98 200,102 220,88 240,94 260,80 280,85 300,72 320,76 340,64 360,60 380,63 400,56 400,180 0,180"
                fill="url(#mdGrad)"
              />
              <circle cx="400" cy="56" r="4" fill={AP}>
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
            <div key={s.label} className="rounded-xl p-3.5" style={{ background: SF }}>
              <div className="text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: TM }}>{s.label}</div>
              <div className="text-base font-medium tabular-nums" style={{ color: TP }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Company Profile + Range ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MCard title="Company Profile" className="lg:col-span-2">
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: TS }}>{COMPANY_DESCRIPTION}</p>
            <div className="h-px my-4 rounded-full" style={{ background: BD }} />
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
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: TM }}>{item.label}</span>
                  <div className="font-medium mt-0.5" style={{ color: TP }}>{item.value}</div>
                </div>
              ))}
            </div>
          </MCard>
          <MCard title="Price Ranges">
            <RangeBar low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today's Range" />
            <RangeBar low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week Range" />
            <div className="h-px my-4 rounded-full" style={{ background: BD }} />
            <div className="space-y-3">
              {[
                { label: "Open", value: usd(STOCK.open) },
                { label: "Prev Close", value: usd(STOCK.prevClose) },
                { label: "Avg Volume", value: fmt(STOCK.avgVolume) },
                { label: "Shares Out", value: fmt(STOCK.sharesOut) },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: TM }}>{r.label}</span>
                  <span className="font-medium tabular-nums" style={{ color: TP }}>{r.value}</span>
                </div>
              ))}
            </div>
          </MCard>
        </div>

        {/* ── Business Segments ── */}
        <MCard title="Business Segments">
          <div className="space-y-6">
            {SEGMENTS.map((seg) => (
              <div key={seg.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: TP }}>{seg.name}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="tabular-nums font-medium" style={{ color: AP }}>{seg.revenue}</span>
                    <span className="tabular-nums" style={{ color: TM }}>{seg.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: SV }}>
                  <div className="h-full rounded-full" style={{ width: `${seg.pct * 2}%`, background: AP }} />
                </div>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: TM }}>{seg.description}</p>
              </div>
            ))}
          </div>
        </MCard>

        {/* ── AI Analysis ── */}
        <MCard title="AI Analysis Summary">
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: TS }}>{AI_ANALYSIS.summary}</p>
          <div className="h-px my-4 rounded-full" style={{ background: BD }} />
          <h4 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: AP }}>12–18 Month Outlook</h4>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: TS }}>{AI_ANALYSIS.outlook}</p>
        </MCard>

        {/* ── Bull / Bear Case ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border p-5" style={{ background: SF, borderColor: `${AG}40` }}>
            <div className="flex items-center gap-2 mb-4">
              <span style={{ color: AG }}>▲</span>
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: AG }}>{BULL_CASE.title}</h3>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line mb-4" style={{ color: TS }}>{BULL_CASE.thesis}</p>
            <div className="h-px mb-4 rounded-full" style={{ background: BD }} />
            <div className="grid grid-cols-2 gap-3">
              {BULL_CASE.keyMetrics.map((m) => (
                <div key={m.label} className="flex justify-between text-sm">
                  <span className="text-xs" style={{ color: TM }}>{m.label}</span>
                  <span className="font-medium tabular-nums" style={{ color: AG }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border p-5" style={{ background: SF, borderColor: `${AR}40` }}>
            <div className="flex items-center gap-2 mb-4">
              <span style={{ color: AR }}>▼</span>
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: AR }}>{BEAR_CASE.title}</h3>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line mb-4" style={{ color: TS }}>{BEAR_CASE.thesis}</p>
            <div className="h-px mb-4 rounded-full" style={{ background: BD }} />
            <div className="grid grid-cols-2 gap-3">
              {BEAR_CASE.keyMetrics.map((m) => (
                <div key={m.label} className="flex justify-between text-sm">
                  <span className="text-xs" style={{ color: TM }}>{m.label}</span>
                  <span className="font-medium tabular-nums" style={{ color: AR }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Analyst Consensus + Commentary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MCard title="Analyst Consensus">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-medium" style={{ color: AG }}>{ANALYST_CONSENSUS.rating}</div>
                <div className="text-[10px] font-medium uppercase tracking-wider mt-0.5" style={{ color: TM }}>Consensus</div>
              </div>
              <div className="flex-1">
                <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
                  <div className="rounded-l-full" style={{ flex: ANALYST_CONSENSUS.buy, background: AG }} />
                  <div style={{ flex: ANALYST_CONSENSUS.overweight, background: `${AG}88` }} />
                  <div style={{ flex: ANALYST_CONSENSUS.hold, background: SV }} />
                  <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${AR}88` }} />
                  <div className="rounded-r-full" style={{ flex: ANALYST_CONSENSUS.sell, background: AR }} />
                </div>
                <div className="flex justify-between text-[10px] mt-1" style={{ color: TM }}>
                  <span>Buy {ANALYST_CONSENSUS.buy}</span>
                  <span>Hold {ANALYST_CONSENSUS.hold}</span>
                  <span>Sell {ANALYST_CONSENSUS.sell}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 py-3 rounded-xl text-center text-sm mb-4" style={{ background: SV }}>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: TM }}>Low</div>
                <div className="font-medium tabular-nums" style={{ color: AR }}>{usd(ANALYST_CONSENSUS.lowTarget)}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: TM }}>Average</div>
                <div className="font-medium tabular-nums" style={{ color: AP }}>{usd(ANALYST_CONSENSUS.avgTarget)}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: TM }}>High</div>
                <div className="font-medium tabular-nums" style={{ color: AG }}>{usd(ANALYST_CONSENSUS.highTarget)}</div>
              </div>
            </div>
            <div>
              {ANALYSTS.map((a, i) => (
                <div key={a.firm} className={`flex items-center justify-between py-3 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}80` }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: TP }}>{a.firm}</div>
                    <div className="text-xs" style={{ color: TM }}>{a.analyst} · {a.date}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full" style={{
                      color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? AG : a.rating.includes("Sell") || a.rating.includes("Underperform") ? AR : TS,
                      background: a.rating.includes("Buy") || a.rating.includes("Overweight") ? `${AG}18` : a.rating.includes("Sell") || a.rating.includes("Underperform") ? `${AR}18` : SV,
                    }}>{a.rating}</span>
                    <div className="text-sm font-medium tabular-nums mt-1" style={{ color: TP }}>{usd(a.target)}</div>
                  </div>
                </div>
              ))}
            </div>
          </MCard>
          <MCard title="Analyst Commentary" className="lg:col-span-2">
            <div className="space-y-5">
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-5 border-t" : ""} style={{ borderColor: `${BD}80` }}>
                  <div className="mb-2">
                    <h4 className="text-sm font-medium" style={{ color: TP }}>{c.title}</h4>
                    <span className="text-xs" style={{ color: TM }}>{c.firm} — {c.analyst} · {c.date}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: TS }}>{c.snippet}</p>
                </div>
              ))}
            </div>
          </MCard>
        </div>

        {/* ── Earnings History ── */}
        <MCard title="Earnings History">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-medium uppercase tracking-wider" style={{ color: TM }}>
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
                  <tr key={e.quarter} className="border-t" style={{ borderColor: `${BD}60` }}>
                    <td className="py-3 font-medium" style={{ color: AP }}>{e.quarter}</td>
                    <td className="py-3" style={{ color: TM }}>{e.date}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: TM }}>{usd(e.epsEst)}</td>
                    <td className="py-3 text-right tabular-nums font-medium" style={{ color: e.epsActual >= e.epsEst ? AG : AR }}>{usd(e.epsActual)}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: TP }}>{e.revenue}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: e.revenueGrowth >= 0 ? AG : AR }}>{pct(e.revenueGrowth)}</td>
                    <td className="py-3 text-right tabular-nums font-medium" style={{ color: e.surprise.startsWith("+") ? AG : AR }}>{e.surprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MCard>

        {/* ── Financials 3-col ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MCard title="Income Statement (TTM)">
            {INCOME_STATEMENT.map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}60` }}>
                <span className="text-sm" style={{ color: TS }}>{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums" style={{ color: TP }}>{row.value}</span>
                  {row.yoy && <span className="text-xs tabular-nums" style={{ color: row.yoy.startsWith("+") ? AG : row.yoy.startsWith("−") ? AR : TM }}>{row.yoy}</span>}
                </div>
              </div>
            ))}
          </MCard>
          <MCard title="Balance Sheet">
            {BALANCE_SHEET.map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}60` }}>
                <span className="text-sm" style={{ color: TS }}>{row.label}</span>
                <span className="text-sm font-medium tabular-nums" style={{ color: row.value.startsWith("-") ? AR : TP }}>{row.value}</span>
              </div>
            ))}
          </MCard>
          <MCard title="Cash Flow Statement">
            {CASH_FLOW.map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}60` }}>
                <span className="text-sm" style={{ color: TS }}>{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums" style={{ color: row.value.startsWith("-") ? AR : TP }}>{row.value}</span>
                  {row.yoy && <span className="text-xs tabular-nums" style={{ color: TM }}>{row.yoy}</span>}
                </div>
              </div>
            ))}
          </MCard>
        </div>

        {/* ── Risks + Catalysts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MCard title="Key Risks">
            <div className="space-y-5">
              {KEY_RISKS.map((r, i) => (
                <div key={i} className={i > 0 ? "pt-5 border-t" : ""} style={{ borderColor: `${BD}60` }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium" style={{ color: TP }}>{r.title}</h4>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{
                      color: r.severity === "High" ? AR : r.severity === "Medium" ? "#ff9800" : TM,
                      background: r.severity === "High" ? `${AR}18` : r.severity === "Medium" ? "rgba(255,152,0,0.12)" : SV,
                    }}>{r.severity}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: TS }}>{r.description}</p>
                </div>
              ))}
            </div>
          </MCard>
          <MCard title="Upcoming Catalysts">
            <div className="space-y-5">
              {CATALYSTS.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-5 border-t" : ""} style={{ borderColor: `${BD}60` }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium" style={{ color: TP }}>{c.title}</h4>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{ color: AP, background: `${AP}18` }}>{c.timeline}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: TS }}>{c.description}</p>
                </div>
              ))}
            </div>
          </MCard>
        </div>

        {/* ── Competitive Landscape ── */}
        <MCard title="Competitive Landscape">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-medium uppercase tracking-wider" style={{ color: TM }}>
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
                  <tr key={c.ticker} className="border-t" style={{ borderColor: `${BD}60` }}>
                    <td className="py-3">
                      <span className="font-medium" style={{ color: AP }}>{c.ticker}</span>
                      <span className="ml-2" style={{ color: TM }}>{c.name}</span>
                    </td>
                    <td className="py-3 text-right tabular-nums" style={{ color: TP }}>{c.marketCap}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: TS }}>{c.pe}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: TP }}>{c.revenue}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: TS }}>{c.margin}</td>
                    <td className="py-3 text-right tabular-nums font-medium" style={{ color: c.growth.startsWith("+") ? AG : AR }}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MCard>

        {/* ── Valuation + Technicals + Dividends ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MCard title="Valuation Ratios">
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className={`flex justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}60` }}>
                <span className="text-sm" style={{ color: TS }}>{r.label}</span>
                <span className="text-sm font-medium tabular-nums" style={{ color: TP }}>{r.value}</span>
              </div>
            ))}
          </MCard>
          <MCard title="Technical Indicators">
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
              <div key={t.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}60` }}>
                <span className="text-sm" style={{ color: TS }}>{t.label}</span>
                <span className="text-sm font-medium tabular-nums" style={{ color: t.signal ? AG : AR }}>{t.value}</span>
              </div>
            ))}
          </MCard>
          <MCard title="Dividend History">
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}60` }}>
                <span className="text-sm font-medium" style={{ color: AP }}>{d.year}</span>
                <div className="flex items-center gap-3 text-sm tabular-nums">
                  <span className="font-medium" style={{ color: TP }}>{d.annual}</span>
                  <span style={{ color: TM }}>{d.yield}</span>
                  <span style={{ color: AG }}>{d.growth}</span>
                </div>
              </div>
            ))}
          </MCard>
        </div>

        {/* ── Holders + ESG ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MCard title="Top Institutional Holders">
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className={`flex items-center justify-between py-3 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}60` }}>
                <span className="text-sm" style={{ color: TP }}>{h.name}</span>
                <div className="flex items-center gap-4 text-sm tabular-nums">
                  <span style={{ color: TM }}>{h.shares}</span>
                  <span className="font-medium w-11 text-right" style={{ color: AP }}>{h.pct}</span>
                  <span style={{ color: TS }} className="w-20 text-right">{h.value}</span>
                </div>
              </div>
            ))}
          </MCard>
          <MCard title={`ESG Rating — ${ESG.provider}`}>
            <div className="flex items-center gap-5 mb-4">
              <div className="w-14 h-14 rounded-full flex flex-col items-center justify-center" style={{ background: SV }}>
                <div className="text-xl font-medium" style={{ color: AG }}>{ESG.rating}</div>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-2">
                {[
                  { label: "Environment", score: ESG.environmentScore },
                  { label: "Social", score: ESG.socialScore },
                  { label: "Governance", score: ESG.governanceScore },
                ].map((e) => (
                  <div key={e.label} className="text-center py-2 rounded-xl" style={{ background: SV }}>
                    <div className="text-lg font-medium" style={{ color: AP }}>{e.score}</div>
                    <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: TM }}>{e.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-px mb-4 rounded-full" style={{ background: BD }} />
            <div className="space-y-2">
              {ESG.highlights.map((h, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ color: TS }}>
                  <span style={{ color: AP }}>•</span> {h}
                </p>
              ))}
            </div>
          </MCard>
        </div>

        {/* ── Watchlist + News + Sector ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MCard title="Watchlist">
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className={`flex items-center justify-between py-2.5 cursor-pointer ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}60` }}>
                <div>
                  <span className="text-sm font-medium" style={{ color: TP }}>{w.ticker}</span>
                  <span className="text-xs ml-2" style={{ color: TM }}>{w.volume}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium tabular-nums" style={{ color: TP }}>{usd(w.price)}</div>
                  <div className="text-xs tabular-nums" style={{ color: w.change >= 0 ? AG : AR }}>{pct(w.change)}</div>
                </div>
              </div>
            ))}
          </MCard>
          <MCard title="News Wire">
            {NEWS.map((n, i) => (
              <div key={i} className={`py-3 cursor-pointer ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}60` }}>
                <span className="text-xs font-mono mr-2" style={{ color: AT }}>{n.time}</span>
                <span className="text-sm" style={{ color: TS }}>{n.headline}</span>
              </div>
            ))}
          </MCard>
          <MCard title="Sector Performance">
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: `${BD}60` }}>
                <span className="text-sm" style={{ color: TS }}>{s.label}</span>
                <span className="text-sm font-medium tabular-nums" style={{ color: s.value.startsWith("+") ? AG : AR }}>{s.value}</span>
              </div>
            ))}
          </MCard>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t mt-8" style={{ borderColor: BD }}>
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between text-xs font-medium uppercase tracking-wider" style={{ color: TM }}>
          <span>Zero Sum — Style 10: Material Design 3</span>
          <span>Sample data only</span>
          <span>© 2026 Zero Sum</span>
        </div>
      </footer>
    </div>
  );
}
