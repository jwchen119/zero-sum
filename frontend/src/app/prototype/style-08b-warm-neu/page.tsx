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
   Style 08-B — Warm Sand Neumorphism
   Base: warm beige #e8dfd1. Earth-tone shadows. Rounded pill
   shapes everywhere. Terracotta / olive / amber accents.
   Layout: 2-column asymmetric dashboard with sidebar watchlist.
   ══════════════════════════════════════════════════════════════ */

const BG = "#e8dfd1";
const SD = "#c4b9a8";   // warm dark shadow
const SL = "#fffaf2";   // warm light shadow
const raised  = `6px 6px 14px ${SD}, -6px -6px 14px ${SL}`;
const raisedSm = `3px 3px 8px ${SD}, -3px -3px 8px ${SL}`;
const inset   = `inset 3px 3px 7px ${SD}, inset -3px -3px 7px ${SL}`;
const deepInset = `inset 4px 4px 10px ${SD}, inset -4px -4px 10px ${SL}`;

const TC = "#a0522d";   // terracotta / sienna accent
const OL = "#5d6b3e";   // olive green (positive)
const AM = "#d97706";   // amber
const RD = "#b91c1c";   // rust red (negative)
const TX = "#3d3426";   // dark warm brown text
const T2 = "#6b5e4d";   // secondary brown
const TM = "#9a8e7e";   // muted beige

const clr = (n: number) => (n >= 0 ? OL : RD);

/* ── Icons (earthy / organic style) ── */
const IcLeaf = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={OL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-3.8 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);
const IcMountain = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
  </svg>
);
const IcSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);
const IcCompass = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);
const IcGem = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="6 3 18 3 22 9 12 22 2 9" /><line x1="2" y1="9" x2="22" y2="9" /><line x1="12" y1="22" x2="6" y2="3" /><line x1="12" y1="22" x2="18" y2="3" />
  </svg>
);

/* ─── Sparkline ─── */
function Spark({ positive }: { positive: boolean }) {
  const pts = positive
    ? "0,22 10,19 20,21 30,16 40,18 50,12 60,14 70,9 80,11 90,7 100,5"
    : "0,5 10,8 20,6 30,12 40,9 50,15 60,13 70,18 80,20 90,16 100,22";
  return (
    <svg width="90" height="26" viewBox="0 0 100 28" className="inline-block">
      <polyline points={pts} fill="none" stroke={positive ? OL : RD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Warm Card ─── */
function WCard({ title, icon, children, className = "" }: { title?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] p-6 ${className}`} style={{ background: BG, boxShadow: raised }}>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-[11px] uppercase tracking-widest font-extrabold" style={{ color: TM }}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Groove line ─── */
function Groove() {
  return <div className="h-px my-4 rounded-full" style={{ boxShadow: `inset 1px 1px 2px ${SD}, inset -1px -1px 2px ${SL}` }} />;
}

/* ─── Pill stat ─── */
function PillStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full px-5 py-3 flex items-center justify-between" style={{ background: BG, boxShadow: raisedSm }}>
      <span className="text-[9px] uppercase tracking-widest font-extrabold" style={{ color: TM }}>{label}</span>
      <span className="text-sm font-extrabold tabular-nums" style={{ color: TX }}>{value}</span>
    </div>
  );
}

/* ─── Range ─── */
function WRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-widest font-extrabold mb-2" style={{ color: TM }}>{label}</div>
      <div className="relative h-3 rounded-full" style={{ boxShadow: deepInset }}>
        <div className="absolute h-full rounded-full" style={{ width: `${p}%`, background: `linear-gradient(90deg, ${TC}, ${AM})` }} />
        <div className="absolute top-[-1px] w-4 h-4 rounded-full" style={{ left: `calc(${p}% - 8px)`, background: BG, boxShadow: raisedSm }} />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums mt-1.5 font-bold" style={{ color: TM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function WarmNeumorphismPrototype() {
  return (
    <div className="min-h-screen" style={{ background: BG, color: TX, fontFamily: "'Nunito', 'Poppins', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50" style={{ background: BG }}>
        <div className="mx-auto max-w-7xl px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/prototype" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-black" style={{ background: BG, boxShadow: raisedSm, color: TC, fontFamily: "'STIX Two Math', serif" }}>∑</span>
              <span className="text-base font-extrabold" style={{ color: TX }}>Zero Sum</span>
            </Link>
            <span className="text-[10px] font-extrabold uppercase tracking-widest rounded-full px-3 py-1" style={{ color: TC, boxShadow: inset }}> Warm Soft UI</span>
          </div>
          <Link href="/prototype" className="text-xs font-bold hover:underline" style={{ color: TC }}>← All Styles</Link>
        </div>
        <div className="mx-6 h-px rounded-full" style={{ boxShadow: `1px 1px 2px ${SD}, -1px -1px 2px ${SL}` }} />
      </header>

      {/* ── ASYMMETRIC 2-COL LAYOUT: Main + Sidebar ── */}
      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col lg:flex-row gap-6">

        {/* ── Main Column ── */}
        <div className="flex-1 space-y-6 min-w-0">

          {/* Price Hero — wide pill shape */}
          <div className="rounded-[28px] p-8" style={{ background: BG, boxShadow: raised }}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-3xl font-black" style={{ color: TX }}>{STOCK.ticker}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest rounded-full px-3 py-0.5" style={{ color: TM, boxShadow: inset }}>{STOCK.exchange}</span>
                </div>
                <p className="text-sm" style={{ color: T2 }}>{STOCK.name} — {STOCK.sector}</p>
              </div>
              <div className="flex items-end gap-4">
                <span className="text-5xl font-extralight tabular-nums" style={{ color: TX }}>{usd(STOCK.price)}</span>
                <div className="flex flex-col items-end pb-1">
                  <span className="text-lg font-extrabold tabular-nums" style={{ color: clr(STOCK.change) }}>
                    {STOCK.change >= 0 ? "▲ +" : "▼ "}{STOCK.change.toFixed(2)}
                  </span>
                  <span className="text-sm tabular-nums" style={{ color: clr(STOCK.changePct) }}>({pct(STOCK.changePct)})</span>
                </div>
                <Spark positive={STOCK.change >= 0} />
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-[24px] overflow-hidden" style={{ background: BG, boxShadow: raised }}>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><IcMountain /><span className="text-[11px] uppercase tracking-widest font-extrabold" style={{ color: TM }}>Chart</span></div>
              <div className="flex gap-1">
                {["1D", "5D", "1M", "3M", "1Y", "5Y"].map((p) => (
                  <button key={p} className="px-3 py-1.5 text-[11px] font-bold rounded-full" style={{ color: p === "1Y" ? TX : TM, boxShadow: p === "1Y" ? raisedSm : "none" }}>{p}</button>
                ))}
              </div>
            </div>
            <div className="h-64 mx-6 mb-6 rounded-2xl" style={{ boxShadow: deepInset }}>
              <svg className="w-full h-full p-3" preserveAspectRatio="none" viewBox="0 0 400 160">
                <defs>
                  <linearGradient id="warmG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TC} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={TC} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline points="0,140 25,135 50,138 75,122 100,128 125,112 150,118 175,100 200,106 225,88 250,95 275,78 300,84 325,68 350,72 375,60 400,52" fill="none" stroke={TC} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="0,140 25,135 50,138 75,122 100,128 125,112 150,118 175,100 200,106 225,88 250,95 275,78 300,84 325,68 350,72 375,60 400,52 400,160 0,160" fill="url(#warmG)" />
              </svg>
            </div>
          </div>

          {/* Key stats as pill grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <PillStat key={s.label} label={s.label} value={s.value} />
            ))}
          </div>

          {/* Company + Ranges side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <WCard title="Company Profile" icon={<IcCompass />} className="lg:col-span-3">
              <p className="text-sm leading-relaxed" style={{ color: T2 }}>{COMPANY_DESCRIPTION}</p>
              <Groove />
              <div className="grid grid-cols-3 gap-y-3 gap-x-4 text-sm">
                {[
                  { label: "CEO", value: STOCK.ceo },
                  { label: "HQ", value: STOCK.headquarters },
                  { label: "Employees", value: STOCK.employees.toLocaleString() },
                  { label: "Founded", value: STOCK.founded },
                  { label: "IPO", value: STOCK.ipoDate },
                  { label: "FY End", value: STOCK.fiscalYearEnd },
                ].map((item) => (
                  <div key={item.label}>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold" style={{ color: TM }}>{item.label}</span>
                    <div className="font-bold mt-0.5" style={{ color: TX }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </WCard>
            <WCard title="Ranges" className="lg:col-span-2">
              <WRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today" />
              <WRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week" />
              <Groove />
              {[
                { l: "Open", v: usd(STOCK.open) },
                { l: "Prev Close", v: usd(STOCK.prevClose) },
                { l: "Avg Vol", v: fmt(STOCK.avgVolume) },
              ].map((r) => (
                <div key={r.l} className="flex justify-between text-sm py-1">
                  <span className="text-[9px] uppercase tracking-widest font-extrabold" style={{ color: TM }}>{r.l}</span>
                  <span className="font-bold tabular-nums" style={{ color: TX }}>{r.v}</span>
                </div>
              ))}
            </WCard>
          </div>

          {/* Segments */}
          <WCard title="Business Segments" icon={<IcGem />}>
            <div className="space-y-5">
              {SEGMENTS.map((seg) => (
                <div key={seg.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">{seg.name}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-bold tabular-nums" style={{ color: TC }}>{seg.revenue}</span>
                      <span className="tabular-nums" style={{ color: TM }}>{seg.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full" style={{ boxShadow: inset }}>
                    <div className="h-full rounded-full" style={{ width: `${seg.pct * 2}%`, background: `linear-gradient(90deg, ${TC}, ${AM})` }} />
                  </div>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: TM }}>{seg.description}</p>
                </div>
              ))}
            </div>
          </WCard>

          {/* AI Analysis */}
          <WCard title="AI Analysis" icon={<IcSun />}>
            <p className="text-sm leading-relaxed" style={{ color: T2 }}>{AI_ANALYSIS.summary}</p>
            <Groove />
            <h4 className="text-[11px] uppercase tracking-widest font-extrabold mb-2" style={{ color: TC }}>Outlook</h4>
            <p className="text-sm leading-relaxed" style={{ color: T2 }}>{AI_ANALYSIS.outlook}</p>
          </WCard>

          {/* Bull / Bear */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <WCard title={`▲ ${BULL_CASE.title}`} icon={<IcLeaf />}>
              <p className="text-sm leading-relaxed mb-4" style={{ color: T2 }}>{BULL_CASE.thesis}</p>
              <Groove />
              {BULL_CASE.keyMetrics.map((m, i) => (
                <div key={m.label} className="flex justify-between py-1.5 text-sm" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <span className="text-[10px]" style={{ color: TM }}>{m.label}</span>
                  <span className="font-bold tabular-nums" style={{ color: OL }}>{m.value}</span>
                </div>
              ))}
            </WCard>
            <WCard title={`▼ ${BEAR_CASE.title}`}>
              <p className="text-sm leading-relaxed mb-4" style={{ color: T2 }}>{BEAR_CASE.thesis}</p>
              <Groove />
              {BEAR_CASE.keyMetrics.map((m, i) => (
                <div key={m.label} className="flex justify-between py-1.5 text-sm" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <span className="text-[10px]" style={{ color: TM }}>{m.label}</span>
                  <span className="font-bold tabular-nums" style={{ color: RD }}>{m.value}</span>
                </div>
              ))}
            </WCard>
          </div>

          {/* Analyst Consensus + Commentary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <WCard title="Consensus">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ boxShadow: inset }}>
                  <span className="text-xl font-black" style={{ color: OL }}>{ANALYST_CONSENSUS.rating}</span>
                </div>
                <div className="flex-1">
                  <div className="flex gap-px h-2.5 rounded-full overflow-hidden" style={{ boxShadow: inset }}>
                    <div className="rounded-l-full" style={{ flex: ANALYST_CONSENSUS.buy, background: OL }} />
                    <div style={{ flex: ANALYST_CONSENSUS.overweight, background: `${OL}88` }} />
                    <div style={{ flex: ANALYST_CONSENSUS.hold, background: TM }} />
                    <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${RD}88` }} />
                    <div className="rounded-r-full" style={{ flex: ANALYST_CONSENSUS.sell, background: RD }} />
                  </div>
                  <div className="flex justify-between text-[8px] mt-1 font-bold" style={{ color: TM }}>
                    <span>Buy {ANALYST_CONSENSUS.buy}</span><span>Hold {ANALYST_CONSENSUS.hold}</span><span>Sell {ANALYST_CONSENSUS.sell}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { l: "Low", v: usd(ANALYST_CONSENSUS.lowTarget), c: RD },
                  { l: "Avg", v: usd(ANALYST_CONSENSUS.avgTarget), c: TC },
                  { l: "High", v: usd(ANALYST_CONSENSUS.highTarget), c: OL },
                ].map((t) => (
                  <div key={t.l} className="text-center rounded-2xl py-2" style={{ boxShadow: inset }}>
                    <div className="text-[8px] uppercase tracking-widest font-extrabold" style={{ color: TM }}>{t.l}</div>
                    <div className="font-bold tabular-nums text-sm" style={{ color: t.c }}>{t.v}</div>
                  </div>
                ))}
              </div>
              {ANALYSTS.map((a, i) => (
                <div key={a.firm} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <div>
                    <div className="text-sm font-bold">{a.firm}</div>
                    <div className="text-[10px]" style={{ color: TM }}>{a.analyst} · {a.date}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? OL : a.rating.includes("Sell") || a.rating.includes("Underperform") ? RD : T2 }}>{a.rating}</span>
                    <div className="text-sm font-bold tabular-nums">{usd(a.target)}</div>
                  </div>
                </div>
              ))}
            </WCard>
            <WCard title="Commentary" className="lg:col-span-2">
              <div className="space-y-5">
                {ANALYST_COMMENTARY.map((c, i) => (
                  <div key={i} className={i > 0 ? "pt-5" : ""} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                    <h4 className="text-sm font-bold mb-1">{c.title}</h4>
                    <span className="text-[10px]" style={{ color: TM }}>{c.firm} — {c.analyst} · {c.date}</span>
                    <p className="text-sm leading-relaxed mt-2" style={{ color: T2 }}>{c.snippet}</p>
                  </div>
                ))}
              </div>
            </WCard>
          </div>

          {/* Earnings */}
          <WCard title="Earnings History" icon={<IcMountain />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[9px] uppercase tracking-widest font-extrabold" style={{ color: TM }}>
                    {["Quarter", "Date", "EPS Est", "EPS Act", "Revenue", "Growth", "Surprise"].map((h) => (
                      <th key={h} className={`py-2.5 ${h === "Quarter" || h === "Date" ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                  <tr><td colSpan={7}><Groove /></td></tr>
                </thead>
                <tbody>
                  {EARNINGS.map((e) => (
                    <tr key={e.quarter} style={{ borderTop: `1px solid ${SD}` }}>
                      <td className="py-2 font-bold" style={{ color: TC }}>{e.quarter}</td>
                      <td className="py-2" style={{ color: TM }}>{e.date}</td>
                      <td className="py-2 text-right tabular-nums" style={{ color: TM }}>{usd(e.epsEst)}</td>
                      <td className="py-2 text-right tabular-nums font-bold" style={{ color: e.epsActual >= e.epsEst ? OL : RD }}>{usd(e.epsActual)}</td>
                      <td className="py-2 text-right tabular-nums">{e.revenue}</td>
                      <td className="py-2 text-right tabular-nums" style={{ color: e.revenueGrowth >= 0 ? OL : RD }}>{pct(e.revenueGrowth)}</td>
                      <td className="py-2 text-right tabular-nums font-bold" style={{ color: e.surprise.startsWith("+") ? OL : RD }}>{e.surprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WCard>

          {/* Financials */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <WCard title="Income Stmt">
              {INCOME_STATEMENT.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums">{row.value}</span>
                    {row.yoy && <span className="text-[10px] tabular-nums" style={{ color: row.yoy.startsWith("+") ? OL : row.yoy.startsWith("−") ? RD : TM }}>{row.yoy}</span>}
                  </div>
                </div>
              ))}
            </WCard>
            <WCard title="Balance Sheet">
              {BALANCE_SHEET.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: row.value.startsWith("-") ? RD : TX }}>{row.value}</span>
                </div>
              ))}
            </WCard>
            <WCard title="Cash Flow">
              {CASH_FLOW.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums" style={{ color: row.value.startsWith("-") ? RD : TX }}>{row.value}</span>
                    {row.yoy && <span className="text-[10px] tabular-nums" style={{ color: TM }}>{row.yoy}</span>}
                  </div>
                </div>
              ))}
            </WCard>
          </div>

          {/* Risks + Catalysts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <WCard title="Key Risks">
              {KEY_RISKS.map((r, i) => (
                <div key={i} className={i > 0 ? "pt-4" : ""} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold">{r.title}</h4>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: r.severity === "High" ? RD : r.severity === "Medium" ? AM : TM }}>{r.severity}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: T2 }}>{r.description}</p>
                </div>
              ))}
            </WCard>
            <WCard title="Catalysts" icon={<IcSun />}>
              {CATALYSTS.map((c, i) => (
                <div key={i} className={i > 0 ? "pt-4" : ""} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold">{c.title}</h4>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: TC }}>{c.timeline}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: T2 }}>{c.description}</p>
                </div>
              ))}
            </WCard>
          </div>

          {/* Competitors */}
          <WCard title="Competitors">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[9px] uppercase tracking-widest font-extrabold" style={{ color: TM }}>
                    <th className="text-left py-2">Company</th><th className="text-right py-2">Mkt Cap</th><th className="text-right py-2">P/E</th><th className="text-right py-2">Revenue</th><th className="text-right py-2">Margin</th><th className="text-right py-2">Growth</th>
                  </tr>
                  <tr><td colSpan={6}><Groove /></td></tr>
                </thead>
                <tbody>
                  {COMPETITORS.map((c) => (
                    <tr key={c.ticker} style={{ borderTop: `1px solid ${SD}` }}>
                      <td className="py-2"><span className="font-bold" style={{ color: TC }}>{c.ticker}</span> <span style={{ color: TM }}>{c.name}</span></td>
                      <td className="py-2 text-right tabular-nums">{c.marketCap}</td>
                      <td className="py-2 text-right tabular-nums" style={{ color: T2 }}>{c.pe}</td>
                      <td className="py-2 text-right tabular-nums">{c.revenue}</td>
                      <td className="py-2 text-right tabular-nums" style={{ color: T2 }}>{c.margin}</td>
                      <td className="py-2 text-right tabular-nums font-bold" style={{ color: c.growth.startsWith("+") ? OL : RD }}>{c.growth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WCard>

          {/* Valuation + Technicals + Dividends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <WCard title="Valuation">
              {VALUATION_RATIOS.map((r, i) => (
                <div key={r.label} className="flex justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <span className="text-sm" style={{ color: T2 }}>{r.label}</span>
                  <span className="text-sm font-bold tabular-nums">{r.value}</span>
                </div>
              ))}
            </WCard>
            <WCard title="Technicals">
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
                <div key={t.l} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <span className="text-sm" style={{ color: T2 }}>{t.l}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: t.s ? OL : RD }}>{t.v}</span>
                </div>
              ))}
            </WCard>
            <WCard title="Dividends">
              {DIVIDEND_HISTORY.map((d, i) => (
                <div key={d.year} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <span className="text-sm font-bold" style={{ color: TC }}>{d.year}</span>
                  <div className="flex items-center gap-3 text-sm tabular-nums">
                    <span className="font-bold">{d.annual}</span>
                    <span style={{ color: TM }}>{d.yield}</span>
                    <span style={{ color: OL }}>{d.growth}</span>
                  </div>
                </div>
              ))}
            </WCard>
          </div>

          {/* Holders + ESG */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <WCard title="Top Holders">
              {TOP_HOLDERS.map((h, i) => (
                <div key={h.name} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                  <span className="text-sm">{h.name}</span>
                  <div className="flex items-center gap-3 text-sm tabular-nums">
                    <span style={{ color: TM }}>{h.shares}</span>
                    <span className="font-bold w-10 text-right" style={{ color: TC }}>{h.pct}</span>
                    <span className="w-16 text-right" style={{ color: T2 }}>{h.value}</span>
                  </div>
                </div>
              ))}
            </WCard>
            <WCard title={`ESG — ${ESG.provider}`} icon={<IcLeaf />}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ boxShadow: inset }}>
                  <span className="text-xl font-black" style={{ color: OL }}>{ESG.rating}</span>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {[
                    { l: "Env", s: ESG.environmentScore },
                    { l: "Soc", s: ESG.socialScore },
                    { l: "Gov", s: ESG.governanceScore },
                  ].map((e) => (
                    <div key={e.l} className="text-center rounded-xl py-2" style={{ boxShadow: inset }}>
                      <div className="text-lg font-bold" style={{ color: TC }}>{e.s}</div>
                      <div className="text-[7px] uppercase tracking-widest font-extrabold" style={{ color: TM }}>{e.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Groove />
              {ESG.highlights.map((h, i) => (
                <p key={i} className="text-sm leading-relaxed mb-1" style={{ color: T2 }}><span style={{ color: OL }}>●</span> {h}</p>
              ))}
            </WCard>
          </div>

        </div>

        {/* ── SIDEBAR (Watchlist + News + Sector) ── */}
        <aside className="w-full lg:w-80 flex-shrink-0 space-y-5">
          <WCard title="Watchlist">
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className="flex items-center justify-between py-2 cursor-pointer" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <div>
                  <span className="text-sm font-bold">{w.ticker}</span>
                  <span className="text-[9px] ml-1.5" style={{ color: TM }}>{w.volume}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums">{usd(w.price)}</div>
                  <div className="text-[10px] tabular-nums" style={{ color: w.change >= 0 ? OL : RD }}>{pct(w.change)}</div>
                </div>
              </div>
            ))}
          </WCard>
          <WCard title="News">
            {NEWS.map((n, i) => (
              <div key={i} className="py-2 cursor-pointer" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-[10px] font-mono font-bold mr-1.5" style={{ color: TC }}>{n.time}</span>
                <span className="text-sm" style={{ color: T2 }}>{n.headline}</span>
              </div>
            ))}
          </WCard>
          <WCard title="Sector Perf.">
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <span className="text-sm" style={{ color: T2 }}>{s.label}</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: s.value.startsWith("+") ? OL : RD }}>{s.value}</span>
              </div>
            ))}
          </WCard>
        </aside>

      </div>

      {/* ── Footer ── */}
      <footer style={{ background: BG }}>
        <div className="mx-6 h-px rounded-full" style={{ boxShadow: `1px 1px 2px ${SD}, -1px -1px 2px ${SL}` }} />
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between text-[11px] uppercase tracking-widest font-extrabold" style={{ color: TM }}>
          <span>Zero Sum — 08-B: Warm Neumorphism</span>
          <span>Sample data only</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
