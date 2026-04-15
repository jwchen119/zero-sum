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
   Style 08-A — Dark Neumorphism
   Deep charcoal base (#2d2d3a). Shadow pair: darker vs lighter.
   Gives a moody, premium, "carved from obsidian" tactile feel.
   Accent: electric indigo #818cf8. Green/red softer neon tints.
   ══════════════════════════════════════════════════════════════ */

const BG = "#2d2d3a";
const SD = "#1e1e28";   // shadow dark
const SL = "#3c3c4e";   // shadow light
const raised  = `6px 6px 14px ${SD}, -6px -6px 14px ${SL}`;
const raisedSm = `3px 3px 7px ${SD}, -3px -3px 7px ${SL}`;
const inset   = `inset 3px 3px 7px ${SD}, inset -3px -3px 7px ${SL}`;
const pill    = `4px 4px 10px ${SD}, -4px -4px 10px ${SL}`;

const AC = "#818cf8";   // indigo-400
const AG = "#6ee7b7";   // emerald-300
const AR = "#fca5a5";   // red-300
const TX = "#e2e4ea";
const T2 = "#a0a3b1";
const TM = "#6b6e7e";

const clr = (n: number) => (n >= 0 ? AG : AR);

/* ── Icon helpers (simple SVGs to differentiate from style-08) ── */
const IcTrend = ({ up }: { up: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={up ? AG : AR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {up ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></> : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></>}
  </svg>
);
const IcChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IcShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IcStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IcTarget = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);
const IcZap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

/* ─── Sparkline ─── */
function Spark({ positive }: { positive: boolean }) {
  const d = positive
    ? "M0,22 C10,18 20,20 30,14 C40,11 50,13 60,9 C70,6 80,8 90,4 L100,2"
    : "M0,4 C10,8 20,6 30,12 C40,15 50,13 60,18 C70,20 80,17 90,22 L100,24";
  return (
    <svg width="100" height="28" viewBox="0 0 100 28" className="inline-block">
      <path d={d} fill="none" stroke={positive ? AG : AR} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Dark Soft Card ─── */
function DCard({ title, icon, children, className = "" }: { title?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl p-6 ${className}`} style={{ background: BG, boxShadow: raised }}>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-[11px] uppercase tracking-widest font-bold" style={{ color: TM }}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Inset separator ─── */
function Groove() {
  return <div className="h-px my-4 rounded-full" style={{ boxShadow: `inset 1px 1px 2px ${SD}, inset -1px -1px 2px ${SL}` }} />;
}

/* ─── Inset pill badge ─── */
function InsetBadge({ label, color }: { label: string; color?: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: color || T2, boxShadow: inset }}>
      {label}
    </span>
  );
}

/* ─── Range bar ─── */
function RangeBar({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: TM }}>{label}</div>
      <div className="relative h-2.5 rounded-full" style={{ boxShadow: inset }}>
        <div className="absolute h-full rounded-full" style={{ width: `${p}%`, background: `linear-gradient(90deg, ${AC}, ${AG})`, boxShadow: `0 0 8px ${AC}44` }} />
        <div className="absolute top-[-2px] w-4 h-4 rounded-full" style={{ left: `calc(${p}% - 8px)`, background: BG, boxShadow: pill }} />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums mt-1.5" style={{ color: TM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */
export default function DarkNeumorphismPrototype() {
  return (
    <div className="min-h-screen" style={{ background: BG, color: TX, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50" style={{ background: BG }}>
        <div className="mx-auto max-w-7xl px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/prototype" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl text-sm font-black" style={{ background: BG, boxShadow: pill, color: AC, fontFamily: "'STIX Two Math', serif" }}>∑</span>
              <span className="text-base font-bold" style={{ color: TX }}>Zero Sum</span>
            </Link>
            <InsetBadge label="Dark Soft UI" color={AC} />
          </div>
          <Link href="/prototype" className="text-xs font-bold hover:underline" style={{ color: AC }}>← All Styles</Link>
        </div>
        <div className="mx-6 h-px rounded-full" style={{ boxShadow: `1px 1px 2px ${SD}, -1px -1px 2px ${SL}` }} />
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">

        {/* ── Price Hero ── */}
        <div className="rounded-3xl p-8" style={{ background: BG, boxShadow: raised }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-black" style={{ color: TX }}>{STOCK.ticker}</span>
                <InsetBadge label={STOCK.exchange} />
              </div>
              <p className="text-sm" style={{ color: T2 }}>{STOCK.name} — {STOCK.sector}</p>
            </div>
            <div className="flex items-end gap-5">
              <span className="text-5xl font-extralight tabular-nums" style={{ color: TX }}>{usd(STOCK.price)}</span>
              <div className="flex flex-col items-end pb-1">
                <div className="flex items-center gap-1.5">
                  <IcTrend up={STOCK.change >= 0} />
                  <span className="text-lg font-bold tabular-nums" style={{ color: clr(STOCK.change) }}>
                    {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                  </span>
                </div>
                <span className="text-sm tabular-nums" style={{ color: clr(STOCK.changePct) }}>({pct(STOCK.changePct)})</span>
              </div>
              <Spark positive={STOCK.change >= 0} />
            </div>
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="rounded-3xl overflow-hidden" style={{ background: BG, boxShadow: raised }}>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IcChart />
              <h3 className="text-[11px] uppercase tracking-widest font-bold" style={{ color: TM }}>Price Chart</h3>
            </div>
            <div className="flex gap-1">
              {["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"].map((p) => (
                <button key={p} className="px-3 py-1.5 text-[11px] font-bold rounded-xl transition-shadow" style={{
                  color: p === "1Y" ? AC : T2,
                  boxShadow: p === "1Y" ? pill : "none",
                }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-72 mx-6 mb-6 rounded-2xl relative" style={{ boxShadow: inset }}>
            <svg className="absolute inset-0 w-full h-full p-3" preserveAspectRatio="none" viewBox="0 0 400 180">
              <defs>
                <linearGradient id="dkNeuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AC} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={AC} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points="0,150 20,145 40,148 60,130 80,135 100,118 120,122 140,108 160,112 180,98 200,102 220,88 240,94 260,80 280,85 300,72 320,76 340,64 360,60 380,63 400,56" fill="none" stroke={AC} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,150 20,145 40,148 60,130 80,135 100,118 120,122 140,108 160,112 180,98 200,102 220,88 240,94 260,80 280,85 300,72 320,76 340,64 360,60 380,63 400,56 400,180 0,180" fill="url(#dkNeuGrad)" />
              <circle cx="400" cy="56" r="4" fill={AC}>
                <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
        </div>

        {/* ── Key Stats (2-row grid of raised pills) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {[
            { label: "Mkt Cap", value: fmt(STOCK.marketCap) },
            { label: "P/E", value: STOCK.pe.toFixed(1) },
            { label: "EPS", value: usd(STOCK.eps) },
            { label: "Beta", value: STOCK.beta.toFixed(2) },
            { label: "Yield", value: `${STOCK.dividendYield.toFixed(2)}%` },
            { label: "52W Hi", value: usd(STOCK.week52High) },
            { label: "52W Lo", value: usd(STOCK.week52Low) },
            { label: "Volume", value: fmt(STOCK.volume) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-3.5 text-center" style={{ background: BG, boxShadow: raisedSm }}>
              <div className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: TM }}>{s.label}</div>
              <div className="text-[15px] font-bold tabular-nums" style={{ color: TX }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Company Profile + Range ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DCard title="Company Profile" icon={<IcShield />} className="lg:col-span-2">
            <p className="text-sm leading-relaxed" style={{ color: T2 }}>{COMPANY_DESCRIPTION}</p>
            <Groove />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
              {[
                { label: "CEO", value: STOCK.ceo },
                { label: "HQ", value: STOCK.headquarters },
                { label: "Employees", value: STOCK.employees.toLocaleString() },
                { label: "Founded", value: STOCK.founded },
                { label: "IPO Date", value: STOCK.ipoDate },
                { label: "Fiscal YE", value: STOCK.fiscalYearEnd },
              ].map((item) => (
                <div key={item.label}>
                  <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: TM }}>{item.label}</span>
                  <div className="font-semibold mt-0.5" style={{ color: TX }}>{item.value}</div>
                </div>
              ))}
            </div>
          </DCard>
          <DCard title="Price Ranges" icon={<IcTarget />}>
            <RangeBar low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today" />
            <RangeBar low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week" />
            <Groove />
            {[
              { label: "Open", value: usd(STOCK.open) },
              { label: "Prev Close", value: usd(STOCK.prevClose) },
              { label: "Avg Vol", value: fmt(STOCK.avgVolume) },
              { label: "Shares", value: fmt(STOCK.sharesOut) },
            ].map((r) => (
              <div key={r.label} className="flex justify-between text-sm py-1.5">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: TM }}>{r.label}</span>
                <span className="font-bold tabular-nums" style={{ color: TX }}>{r.value}</span>
              </div>
            ))}
          </DCard>
        </div>

        {/* ── Business Segments ── */}
        <DCard title="Business Segments" icon={<IcChart />}>
          <div className="space-y-5">
            {SEGMENTS.map((seg) => (
              <div key={seg.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: TX }}>{seg.name}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-bold tabular-nums" style={{ color: AC }}>{seg.revenue}</span>
                    <span className="tabular-nums" style={{ color: TM }}>{seg.pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full" style={{ boxShadow: inset }}>
                  <div className="h-full rounded-full" style={{ width: `${seg.pct * 2}%`, background: `linear-gradient(90deg, ${AC}, ${AG})`, boxShadow: `0 0 6px ${AC}33` }} />
                </div>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: TM }}>{seg.description}</p>
              </div>
            ))}
          </div>
        </DCard>

        {/* ── AI Analysis ── */}
        <DCard title="AI Analysis" icon={<IcZap />}>
          <p className="text-sm leading-relaxed" style={{ color: T2 }}>{AI_ANALYSIS.summary}</p>
          <Groove />
          <h4 className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: AC }}>12–18 Month Outlook</h4>
          <p className="text-sm leading-relaxed" style={{ color: T2 }}>{AI_ANALYSIS.outlook}</p>
        </DCard>

        {/* ── Bull / Bear ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DCard title="Bull Case" icon={<IcTrend up />}>
            <p className="text-sm leading-relaxed mb-4" style={{ color: T2 }}>{BULL_CASE.thesis}</p>
            <Groove />
            <div className="grid grid-cols-2 gap-3">
              {BULL_CASE.keyMetrics.map((m) => (
                <div key={m.label} className="flex justify-between text-sm">
                  <span className="text-[10px]" style={{ color: TM }}>{m.label}</span>
                  <span className="font-bold tabular-nums" style={{ color: AG }}>{m.value}</span>
                </div>
              ))}
            </div>
          </DCard>
          <DCard title="Bear Case" icon={<IcTrend up={false} />}>
            <p className="text-sm leading-relaxed mb-4" style={{ color: T2 }}>{BEAR_CASE.thesis}</p>
            <Groove />
            <div className="grid grid-cols-2 gap-3">
              {BEAR_CASE.keyMetrics.map((m) => (
                <div key={m.label} className="flex justify-between text-sm">
                  <span className="text-[10px]" style={{ color: TM }}>{m.label}</span>
                  <span className="font-bold tabular-nums" style={{ color: AR }}>{m.value}</span>
                </div>
              ))}
            </div>
          </DCard>
        </div>

        {/* ── Analyst Consensus + Commentary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DCard title="Analyst Consensus" icon={<IcStar />}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center" style={{ boxShadow: inset }}>
                <div className="text-xl font-black" style={{ color: AG }}>{ANALYST_CONSENSUS.rating}</div>
              </div>
              <div className="flex-1">
                <div className="flex gap-0.5 h-3 rounded-full overflow-hidden" style={{ boxShadow: inset }}>
                  <div className="rounded-l-full" style={{ flex: ANALYST_CONSENSUS.buy, background: AG }} />
                  <div style={{ flex: ANALYST_CONSENSUS.overweight, background: `${AG}88` }} />
                  <div style={{ flex: ANALYST_CONSENSUS.hold, background: TM }} />
                  <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${AR}88` }} />
                  <div className="rounded-r-full" style={{ flex: ANALYST_CONSENSUS.sell, background: AR }} />
                </div>
                <div className="flex justify-between text-[9px] mt-1 font-bold" style={{ color: TM }}>
                  <span>Buy {ANALYST_CONSENSUS.buy}</span><span>Hold {ANALYST_CONSENSUS.hold}</span><span>Sell {ANALYST_CONSENSUS.sell}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Low", value: usd(ANALYST_CONSENSUS.lowTarget), color: AR },
                { label: "Avg", value: usd(ANALYST_CONSENSUS.avgTarget), color: AC },
                { label: "High", value: usd(ANALYST_CONSENSUS.highTarget), color: AG },
              ].map((t) => (
                <div key={t.label} className="text-center rounded-xl py-2.5" style={{ boxShadow: inset }}>
                  <div className="text-[9px] uppercase tracking-widest font-bold" style={{ color: TM }}>{t.label}</div>
                  <div className="font-bold tabular-nums text-sm" style={{ color: t.color }}>{t.value}</div>
                </div>
              ))}
            </div>
            {ANALYSTS.map((a, i) => (
              <div key={a.firm} className={`flex items-center justify-between py-2.5 ${i > 0 ? "" : ""}`} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: TX }}>{a.firm}</div>
                  <div className="text-[10px]" style={{ color: TM }}>{a.analyst} · {a.date}</div>
                </div>
                <div className="text-right">
                  <InsetBadge label={a.rating} color={a.rating.includes("Buy") || a.rating.includes("Overweight") ? AG : a.rating.includes("Sell") || a.rating.includes("Underperform") ? AR : T2} />
                  <div className="text-sm font-bold tabular-nums mt-1" style={{ color: TX }}>{usd(a.target)}</div>
                </div>
              </div>
            ))}
          </DCard>
          <DCard title="Analyst Commentary" icon={<IcStar />} className="lg:col-span-2">
            <div className="space-y-5">
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-5" : ""} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <h4 className="text-sm font-bold mb-1" style={{ color: TX }}>{c.title}</h4>
                  <span className="text-[10px]" style={{ color: TM }}>{c.firm} — {c.analyst} · {c.date}</span>
                  <p className="text-sm leading-relaxed mt-2" style={{ color: T2 }}>{c.snippet}</p>
                </div>
              ))}
            </div>
          </DCard>
        </div>

        {/* ── Earnings ── */}
        <DCard title="Earnings History" icon={<IcChart />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest font-bold" style={{ color: TM }}>
                  {["Quarter", "Date", "EPS Est", "EPS Act", "Revenue", "Rev Grow", "Surprise"].map((h) => (
                    <th key={h} className={`py-2.5 ${h === "Quarter" || h === "Date" ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
                <tr><td colSpan={7}><div className="h-px rounded-full" style={{ boxShadow: `1px 1px 2px ${SD}, -1px -1px 2px ${SL}` }} /></td></tr>
              </thead>
              <tbody>
                {EARNINGS.map((e) => (
                  <tr key={e.quarter} style={{ borderTop: `1px solid ${SD}` }}>
                    <td className="py-2.5 font-bold" style={{ color: AC }}>{e.quarter}</td>
                    <td className="py-2.5" style={{ color: TM }}>{e.date}</td>
                    <td className="py-2.5 text-right tabular-nums" style={{ color: TM }}>{usd(e.epsEst)}</td>
                    <td className="py-2.5 text-right tabular-nums font-bold" style={{ color: e.epsActual >= e.epsEst ? AG : AR }}>{usd(e.epsActual)}</td>
                    <td className="py-2.5 text-right tabular-nums" style={{ color: TX }}>{e.revenue}</td>
                    <td className="py-2.5 text-right tabular-nums" style={{ color: e.revenueGrowth >= 0 ? AG : AR }}>{pct(e.revenueGrowth)}</td>
                    <td className="py-2.5 text-right tabular-nums font-bold" style={{ color: e.surprise.startsWith("+") ? AG : AR }}>{e.surprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DCard>

        {/* ── Financials 3-col ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DCard title="Income Statement">
            {INCOME_STATEMENT.map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between py-2 ${i > 0 ? "" : ""}`} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums" style={{ color: TX }}>{row.value}</span>
                  {row.yoy && <span className="text-[10px] tabular-nums" style={{ color: row.yoy.startsWith("+") ? AG : row.yoy.startsWith("−") ? AR : TM }}>{row.yoy}</span>}
                </div>
              </div>
            ))}
          </DCard>
          <DCard title="Balance Sheet">
            {BALANCE_SHEET.map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between py-2`} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: row.value.startsWith("-") ? AR : TX }}>{row.value}</span>
              </div>
            ))}
          </DCard>
          <DCard title="Cash Flow">
            {CASH_FLOW.map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between py-2`} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums" style={{ color: row.value.startsWith("-") ? AR : TX }}>{row.value}</span>
                  {row.yoy && <span className="text-[10px] tabular-nums" style={{ color: TM }}>{row.yoy}</span>}
                </div>
              </div>
            ))}
          </DCard>
        </div>

        {/* ── Risks + Catalysts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DCard title="Key Risks" icon={<IcShield />}>
            <div className="space-y-4">
              {KEY_RISKS.map((r, i) => (
                <div key={i} className={i > 0 ? "pt-4" : ""} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-bold" style={{ color: TX }}>{r.title}</h4>
                    <InsetBadge label={r.severity} color={r.severity === "High" ? AR : r.severity === "Medium" ? "#fbbf24" : TM} />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: T2 }}>{r.description}</p>
                </div>
              ))}
            </div>
          </DCard>
          <DCard title="Catalysts" icon={<IcZap />}>
            <div className="space-y-4">
              {CATALYSTS.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-4" : ""} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-bold" style={{ color: TX }}>{c.title}</h4>
                    <InsetBadge label={c.timeline} color={AC} />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: T2 }}>{c.description}</p>
                </div>
              ))}
            </div>
          </DCard>
        </div>

        {/* ── Competitors ── */}
        <DCard title="Competitive Landscape" icon={<IcTarget />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest font-bold" style={{ color: TM }}>
                  <th className="text-left py-2.5">Company</th>
                  <th className="text-right py-2.5">Mkt Cap</th>
                  <th className="text-right py-2.5">P/E</th>
                  <th className="text-right py-2.5">Revenue</th>
                  <th className="text-right py-2.5">Margin</th>
                  <th className="text-right py-2.5">Growth</th>
                </tr>
                <tr><td colSpan={6}><div className="h-px rounded-full" style={{ boxShadow: `1px 1px 2px ${SD}, -1px -1px 2px ${SL}` }} /></td></tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c) => (
                  <tr key={c.ticker} style={{ borderTop: `1px solid ${SD}` }}>
                    <td className="py-2.5"><span className="font-bold" style={{ color: AC }}>{c.ticker}</span> <span style={{ color: TM }}>{c.name}</span></td>
                    <td className="py-2.5 text-right tabular-nums" style={{ color: TX }}>{c.marketCap}</td>
                    <td className="py-2.5 text-right tabular-nums" style={{ color: T2 }}>{c.pe}</td>
                    <td className="py-2.5 text-right tabular-nums" style={{ color: TX }}>{c.revenue}</td>
                    <td className="py-2.5 text-right tabular-nums" style={{ color: T2 }}>{c.margin}</td>
                    <td className="py-2.5 text-right tabular-nums font-bold" style={{ color: c.growth.startsWith("+") ? AG : AR }}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DCard>

        {/* ── Valuation + Technicals + Dividends ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DCard title="Valuation Ratios">
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className="flex justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-sm" style={{ color: T2 }}>{r.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: TX }}>{r.value}</span>
              </div>
            ))}
          </DCard>
          <DCard title="Technicals">
            {[
              { label: "SMA 20", value: usd(TECHNICALS.sma20), s: STOCK.price > TECHNICALS.sma20 },
              { label: "SMA 50", value: usd(TECHNICALS.sma50), s: STOCK.price > TECHNICALS.sma50 },
              { label: "SMA 200", value: usd(TECHNICALS.sma200), s: STOCK.price > TECHNICALS.sma200 },
              { label: "RSI 14", value: TECHNICALS.rsi14.toString(), s: TECHNICALS.rsi14 < 70 },
              { label: "Trend", value: TECHNICALS.trend, s: TECHNICALS.trend === "Uptrend" },
              { label: "MACD", value: TECHNICALS.macdSignal, s: TECHNICALS.macdSignal.includes("Bullish") },
              { label: "Support", value: usd(TECHNICALS.support1), s: true },
              { label: "Resist", value: usd(TECHNICALS.resistance1), s: false },
            ].map((t, i) => (
              <div key={t.label} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-sm" style={{ color: T2 }}>{t.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: t.s ? AG : AR }}>{t.value}</span>
              </div>
            ))}
          </DCard>
          <DCard title="Dividends">
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-sm font-bold" style={{ color: AC }}>{d.year}</span>
                <div className="flex items-center gap-3 text-sm tabular-nums">
                  <span className="font-bold" style={{ color: TX }}>{d.annual}</span>
                  <span style={{ color: TM }}>{d.yield}</span>
                  <span style={{ color: AG }}>{d.growth}</span>
                </div>
              </div>
            ))}
          </DCard>
        </div>

        {/* ── Holders + ESG ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DCard title="Top Holders">
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className="flex items-center justify-between py-2.5" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-sm" style={{ color: TX }}>{h.name}</span>
                <div className="flex items-center gap-4 text-sm tabular-nums">
                  <span style={{ color: TM }}>{h.shares}</span>
                  <span className="font-bold w-11 text-right" style={{ color: AC }}>{h.pct}</span>
                  <span className="w-20 text-right" style={{ color: T2 }}>{h.value}</span>
                </div>
              </div>
            ))}
          </DCard>
          <DCard title={`ESG — ${ESG.provider}`} icon={<IcShield />}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ boxShadow: inset }}>
                <span className="text-xl font-black" style={{ color: AG }}>{ESG.rating}</span>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-2">
                {[
                  { label: "Env", score: ESG.environmentScore },
                  { label: "Social", score: ESG.socialScore },
                  { label: "Gov", score: ESG.governanceScore },
                ].map((e) => (
                  <div key={e.label} className="text-center rounded-xl py-2" style={{ boxShadow: inset }}>
                    <div className="text-lg font-bold" style={{ color: AC }}>{e.score}</div>
                    <div className="text-[8px] uppercase tracking-widest font-bold" style={{ color: TM }}>{e.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <Groove />
            {ESG.highlights.map((h, i) => (
              <p key={i} className="text-sm leading-relaxed mb-1" style={{ color: T2 }}>
                <span style={{ color: AC }}>◆</span> {h}
              </p>
            ))}
          </DCard>
        </div>

        {/* ── Watchlist + News + Sector ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DCard title="Watchlist">
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className="flex items-center justify-between py-2 cursor-pointer" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <div>
                  <span className="text-sm font-bold" style={{ color: TX }}>{w.ticker}</span>
                  <span className="text-[10px] ml-2" style={{ color: TM }}>{w.volume}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums" style={{ color: TX }}>{usd(w.price)}</div>
                  <div className="text-[10px] tabular-nums" style={{ color: w.change >= 0 ? AG : AR }}>{pct(w.change)}</div>
                </div>
              </div>
            ))}
          </DCard>
          <DCard title="News">
            {NEWS.map((n, i) => (
              <div key={i} className="py-2.5 cursor-pointer" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-[10px] font-mono mr-2" style={{ color: AC }}>{n.time}</span>
                <span className="text-sm" style={{ color: T2 }}>{n.headline}</span>
              </div>
            ))}
          </DCard>
          <DCard title="Sector Perf.">
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-sm" style={{ color: T2 }}>{s.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: s.value.startsWith("+") ? AG : AR }}>{s.value}</span>
              </div>
            ))}
          </DCard>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer style={{ background: BG }}>
        <div className="mx-6 h-px rounded-full" style={{ boxShadow: `1px 1px 2px ${SD}, -1px -1px 2px ${SL}` }} />
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between text-[11px] uppercase tracking-widest font-bold" style={{ color: TM }}>
          <span>Zero Sum — Style 08-A: Dark Neumorphism</span>
          <span>Sample data only</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
