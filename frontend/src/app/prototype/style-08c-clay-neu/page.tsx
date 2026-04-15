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
   Style 08-C — Claymorphism / Concave Neumorphism
   Base: pastel lavender #e0d8f0. Cards use colored concave
   surfaces. Thick border-radius (24-32px). Vibrant clay-like
   inner shadows create "pressed into soft material" feel.
   Layout: Bento-grid / masonry-inspired with varied card sizes.
   ══════════════════════════════════════════════════════════════ */

const BG = "#e0d8f0";   // lavender base
const SD = "#b7aed0";   // dark lavender shadow
const SL = "#f8f2ff";   // bright lavender highlight

/* Clay surfaces — colored with concave inner shadows */
const raised = `8px 8px 16px ${SD}, -8px -8px 16px ${SL}`;
const inset  = `inset 4px 4px 8px ${SD}, inset -4px -4px 8px ${SL}`;
const deepInset = `inset 6px 6px 12px ${SD}, inset -6px -6px 12px ${SL}`;

/* Candy accents */
const VIOLET = "#7c3aed";
const ROSE   = "#f43f5e";
const LIME   = "#65a30d";
const SKY    = "#0ea5e9";
const AMBER  = "#f59e0b";
const PINK   = "#ec4899";

const TX = "#2d2447";   // deep purple-brown
const T2 = "#5a4d6e";   // muted purple
const TM = "#998db3";   // placeholder
const CARD = "#ddd4ef";  // slightly darker than BG for cards

const clr = (n: number) => (n >= 0 ? LIME : ROSE);

/* ── Icons (playful rounded) ── */
const IcBubble = ({ c = VIOLET }: { c?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={c} fillOpacity="0.2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
  </svg>
);
const IcHeart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={ROSE} fillOpacity="0.2" stroke={ROSE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const IcDiamond = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={SKY} fillOpacity="0.15" stroke={SKY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 12 12 22 2 12" />
  </svg>
);
const IcFlame = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={AMBER} fillOpacity="0.2" stroke={AMBER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
const IcStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={AMBER} fillOpacity="0.2" stroke={AMBER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/* ─── Sparkline ─── */
function Spark({ positive }: { positive: boolean }) {
  const pts = positive
    ? "0,22 10,19 20,21 30,16 40,18 50,12 60,14 70,9 80,11 90,7 100,5"
    : "0,5 10,8 20,6 30,12 40,9 50,15 60,13 70,18 80,20 90,16 100,22";
  return (
    <svg width="100" height="28" viewBox="0 0 100 28" className="inline-block">
      <polyline points={pts} fill="none" stroke={positive ? LIME : ROSE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Clay Card: concave surface with thick rounded corners ─── */
function ClayCard({
  title, icon, accent = VIOLET, children, className = "",
}: { title?: string; icon?: React.ReactNode; accent?: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[24px] p-6 ${className}`}
      style={{
        background: CARD,
        boxShadow: raised,
        borderTop: `3px solid ${accent}30`,
      }}
    >
      {title && (
        <div className="flex items-center gap-2.5 mb-4">
          {icon}
          <h3 className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: accent }}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Concave Separator ─── */
function Dent() {
  return <div className="h-1 my-4 rounded-full" style={{ boxShadow: inset }} />;
}

/* ─── Concave Pill with fill ─── */
function ConcavePill({ label, value, accent = VIOLET }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ boxShadow: inset }}>
      <div className="text-[8px] uppercase tracking-[0.2em] font-black mb-1" style={{ color: TM }}>{label}</div>
      <div className="text-lg font-black tabular-nums" style={{ color: accent }}>{value}</div>
    </div>
  );
}

/* ─── Progress Bar ─── */
function ClayBar({ pct: pctVal, color }: { pct: number; color: string }) {
  return (
    <div className="h-3.5 rounded-full" style={{ boxShadow: deepInset }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pctVal}%`, background: color, boxShadow: `0 2px 6px ${color}66` }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function ClayNeumorphismPrototype() {
  return (
    <div className="min-h-screen" style={{ background: BG, color: TX, fontFamily: "'Nunito', 'Poppins', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50" style={{ background: BG }}>
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/prototype" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-lg font-black" style={{ background: CARD, boxShadow: raised, color: VIOLET, fontFamily: "'STIX Two Math', serif" }}>∑</span>
              <span className="text-base font-black" style={{ color: TX }}>Zero Sum</span>
            </Link>
            <span className="text-[9px] font-black uppercase tracking-[0.25em] rounded-xl px-3 py-1.5" style={{ color: PINK, background: CARD, boxShadow: inset }}>Claymorphism</span>
          </div>
          <Link href="/prototype" className="text-xs font-bold hover:underline" style={{ color: VIOLET }}>← All Styles</Link>
        </div>
        <div className="mx-6 h-1 rounded-full" style={{ boxShadow: inset }} />
      </header>

      {/* ── BENTO GRID LAYOUT ── */}
      <div className="mx-auto max-w-[1400px] px-6 py-8 grid grid-cols-12 gap-5 auto-rows-auto">

        {/* ── 1. Price Hero: wide span ── */}
        <div className="col-span-12 lg:col-span-8 rounded-[28px] p-8" style={{ background: CARD, boxShadow: raised, borderTop: `4px solid ${VIOLET}40` }}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <IcBubble c={VIOLET} />
                <span className="text-3xl font-black" style={{ color: TX }}>{STOCK.ticker}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] rounded-xl px-3 py-1" style={{ color: TM, boxShadow: inset }}>{STOCK.exchange}</span>
              </div>
              <p className="text-sm" style={{ color: T2 }}>{STOCK.name} · {STOCK.sector}</p>
            </div>
            <div className="flex items-end gap-5">
              <span className="text-5xl font-extralight tabular-nums" style={{ color: TX }}>{usd(STOCK.price)}</span>
              <div className="flex flex-col items-end pb-1">
                <span className="text-xl font-black" style={{ color: clr(STOCK.change) }}>
                  {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                </span>
                <span className="text-sm tabular-nums" style={{ color: clr(STOCK.changePct) }}>({pct(STOCK.changePct)})</span>
              </div>
              <Spark positive={STOCK.change >= 0} />
            </div>
          </div>
        </div>

        {/* ── 2. Quick Stats grid in sidebar ── */}
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-3">
          <ConcavePill label="Mkt Cap" value={fmt(STOCK.marketCap)} accent={VIOLET} />
          <ConcavePill label="P/E" value={STOCK.pe.toFixed(1)} accent={SKY} />
          <ConcavePill label="EPS" value={usd(STOCK.eps)} accent={LIME} />
          <ConcavePill label="Beta" value={STOCK.beta.toFixed(2)} accent={AMBER} />
        </div>

        {/* ── 3. Chart: full width ── */}
        <div className="col-span-12 rounded-[24px]" style={{ background: CARD, boxShadow: raised, borderTop: `3px solid ${SKY}30` }}>
          <div className="px-6 pt-5 flex items-center justify-between">
            <div className="flex items-center gap-2"><IcDiamond /><span className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: SKY }}>Chart</span></div>
            <div className="flex gap-1.5">
              {["1D", "5D", "1M", "3M", "1Y", "5Y"].map((p) => (
                <button key={p} className="px-3 py-1.5 text-[11px] font-bold rounded-xl" style={{ color: p === "1Y" ? TX : TM, boxShadow: p === "1Y" ? raised : "none" }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-64 mx-6 my-5 rounded-2xl" style={{ boxShadow: deepInset }}>
            <svg className="w-full h-full p-4" preserveAspectRatio="none" viewBox="0 0 400 160">
              <defs>
                <linearGradient id="clayG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={VIOLET} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={VIOLET} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points="0,140 25,135 50,138 75,122 100,128 125,112 150,118 175,100 200,106 225,88 250,95 275,78 300,84 325,68 350,72 375,60 400,52" fill="none" stroke={VIOLET} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,140 25,135 50,138 75,122 100,128 125,112 150,118 175,100 200,106 225,88 250,95 275,78 300,84 325,68 350,72 375,60 400,52 400,160 0,160" fill="url(#clayG)" />
            </svg>
          </div>
        </div>

        {/* ── 4. More stats ── */}
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-3">
          {[
            { label: "Yield", value: `${STOCK.dividendYield.toFixed(2)}%`, c: LIME },
            { label: "52W High", value: usd(STOCK.week52High), c: AMBER },
            { label: "52W Low", value: usd(STOCK.week52Low), c: ROSE },
            { label: "Volume", value: fmt(STOCK.volume), c: SKY },
          ].map((s) => (
            <ConcavePill key={s.label} label={s.label} value={s.value} accent={s.c} />
          ))}
        </div>

        {/* ── 5. Company Profile ── */}
        <ClayCard title="Company Profile" icon={<IcBubble c={VIOLET} />} accent={VIOLET} className="col-span-12 lg:col-span-8">
          <p className="text-sm leading-relaxed" style={{ color: T2 }}>{COMPANY_DESCRIPTION}</p>
          <Dent />
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { l: "CEO", v: STOCK.ceo },
              { l: "HQ", v: STOCK.headquarters },
              { l: "Employees", v: STOCK.employees.toLocaleString() },
              { l: "Founded", v: STOCK.founded },
              { l: "IPO", v: STOCK.ipoDate },
              { l: "FY End", v: STOCK.fiscalYearEnd },
            ].map((item) => (
              <div key={item.l}>
                <span className="text-[8px] uppercase tracking-[0.2em] font-black" style={{ color: TM }}>{item.l}</span>
                <div className="font-bold mt-0.5">{item.v}</div>
              </div>
            ))}
          </div>
        </ClayCard>

        {/* ── 6. Segments with colored bars ── */}
        <ClayCard title="Segments" icon={<IcBubble c={PINK} />} accent={PINK} className="col-span-12 lg:col-span-6">
          <div className="space-y-5">
            {SEGMENTS.map((seg, idx) => {
              const colors = [VIOLET, ROSE, SKY, AMBER, LIME];
              return (
                <div key={seg.name}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold">{seg.name}</span>
                    <span className="tabular-nums font-bold" style={{ color: colors[idx % colors.length] }}>{seg.revenue} ({seg.pct}%)</span>
                  </div>
                  <ClayBar pct={seg.pct * 2} color={colors[idx % colors.length]} />
                  <p className="text-xs mt-1.5" style={{ color: TM }}>{seg.description}</p>
                </div>
              );
            })}
          </div>
        </ClayCard>

        {/* ── 7. AI Analysis ── */}
        <ClayCard title="AI Analysis" icon={<IcStar />} accent={AMBER} className="col-span-12 lg:col-span-6">
          <p className="text-sm leading-relaxed" style={{ color: T2 }}>{AI_ANALYSIS.summary}</p>
          <Dent />
          <h4 className="text-xs uppercase tracking-[0.2em] font-black mb-2" style={{ color: AMBER }}>Outlook</h4>
          <p className="text-sm leading-relaxed" style={{ color: T2 }}>{AI_ANALYSIS.outlook}</p>
        </ClayCard>

        {/* ── 8. Bull / Bear ── */}
        <ClayCard title={`▲ ${BULL_CASE.title}`} icon={<IcBubble c={LIME} />} accent={LIME} className="col-span-12 md:col-span-6">
          <p className="text-sm leading-relaxed mb-3" style={{ color: T2 }}>{BULL_CASE.thesis}</p>
          <Dent />
          {BULL_CASE.keyMetrics.map((m, i) => (
            <div key={m.label} className="flex justify-between py-1.5 text-sm" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span style={{ color: TM }}>{m.label}</span>
              <span className="font-bold tabular-nums" style={{ color: LIME }}>{m.value}</span>
            </div>
          ))}
        </ClayCard>
        <ClayCard title={`▼ ${BEAR_CASE.title}`} icon={<IcHeart />} accent={ROSE} className="col-span-12 md:col-span-6">
          <p className="text-sm leading-relaxed mb-3" style={{ color: T2 }}>{BEAR_CASE.thesis}</p>
          <Dent />
          {BEAR_CASE.keyMetrics.map((m, i) => (
            <div key={m.label} className="flex justify-between py-1.5 text-sm" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span style={{ color: TM }}>{m.label}</span>
              <span className="font-bold tabular-nums" style={{ color: ROSE }}>{m.value}</span>
            </div>
          ))}
        </ClayCard>

        {/* ── 9. Analyst Consensus ── */}
        <ClayCard title="Consensus" icon={<IcFlame />} accent={AMBER} className="col-span-12 lg:col-span-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ boxShadow: inset }}>
              <span className="text-2xl font-black" style={{ color: LIME }}>{ANALYST_CONSENSUS.rating}</span>
            </div>
            <div className="flex-1">
              <div className="flex gap-px h-4 rounded-xl overflow-hidden" style={{ boxShadow: inset }}>
                <div className="rounded-l-xl" style={{ flex: ANALYST_CONSENSUS.buy, background: LIME }} />
                <div style={{ flex: ANALYST_CONSENSUS.overweight, background: `${LIME}88` }} />
                <div style={{ flex: ANALYST_CONSENSUS.hold, background: TM }} />
                <div style={{ flex: ANALYST_CONSENSUS.underweight, background: `${ROSE}88` }} />
                <div className="rounded-r-xl" style={{ flex: ANALYST_CONSENSUS.sell, background: ROSE }} />
              </div>
              <div className="flex justify-between text-[8px] mt-1 font-black" style={{ color: TM }}>
                <span>Buy {ANALYST_CONSENSUS.buy}</span><span>Hold {ANALYST_CONSENSUS.hold}</span><span>Sell {ANALYST_CONSENSUS.sell}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { l: "Low", v: usd(ANALYST_CONSENSUS.lowTarget), c: ROSE },
              { l: "Avg", v: usd(ANALYST_CONSENSUS.avgTarget), c: VIOLET },
              { l: "High", v: usd(ANALYST_CONSENSUS.highTarget), c: LIME },
            ].map((t) => (
              <div key={t.l} className="text-center rounded-2xl py-3" style={{ boxShadow: inset }}>
                <div className="text-[7px] uppercase tracking-[0.2em] font-black" style={{ color: TM }}>{t.l}</div>
                <div className="font-black tabular-nums text-sm" style={{ color: t.c }}>{t.v}</div>
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
                <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? LIME : a.rating.includes("Sell") || a.rating.includes("Underperform") ? ROSE : T2 }}>{a.rating}</span>
                <div className="text-sm font-bold tabular-nums">{usd(a.target)}</div>
              </div>
            </div>
          ))}
        </ClayCard>

        {/* Commentary */}
        <ClayCard title="Commentary" accent={SKY} className="col-span-12 lg:col-span-8">
          <div className="space-y-5">
            {ANALYST_COMMENTARY.map((c, i) => (
              <div key={i} className={i > 0 ? "pt-5" : ""} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
                <h4 className="text-sm font-bold mb-1">{c.title}</h4>
                <span className="text-[10px]" style={{ color: TM }}>{c.firm} — {c.analyst} · {c.date}</span>
                <p className="text-sm leading-relaxed mt-2" style={{ color: T2 }}>{c.snippet}</p>
              </div>
            ))}
          </div>
        </ClayCard>

        {/* ── 10. Earnings ── */}
        <ClayCard title="Earnings" icon={<IcBubble c={SKY} />} accent={SKY} className="col-span-12">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[8px] uppercase tracking-[0.2em] font-black" style={{ color: TM }}>
                  {["Quarter", "Date", "EPS Est", "EPS Act", "Revenue", "Growth", "Surprise"].map((h) => (
                    <th key={h} className={`py-2 ${h === "Quarter" || h === "Date" ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
                <tr><td colSpan={7}><Dent /></td></tr>
              </thead>
              <tbody>
                {EARNINGS.map((e) => (
                  <tr key={e.quarter} style={{ borderTop: `1px solid ${SD}` }}>
                    <td className="py-2 font-bold" style={{ color: VIOLET }}>{e.quarter}</td>
                    <td className="py-2" style={{ color: TM }}>{e.date}</td>
                    <td className="py-2 text-right tabular-nums" style={{ color: TM }}>{usd(e.epsEst)}</td>
                    <td className="py-2 text-right tabular-nums font-bold" style={{ color: e.epsActual >= e.epsEst ? LIME : ROSE }}>{usd(e.epsActual)}</td>
                    <td className="py-2 text-right tabular-nums">{e.revenue}</td>
                    <td className="py-2 text-right tabular-nums" style={{ color: e.revenueGrowth >= 0 ? LIME : ROSE }}>{pct(e.revenueGrowth)}</td>
                    <td className="py-2 text-right tabular-nums font-bold" style={{ color: e.surprise.startsWith("+") ? LIME : ROSE }}>{e.surprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ClayCard>

        {/* ── 11. Financials: 3 col ── */}
        <ClayCard title="Income Stmt" accent={VIOLET} className="col-span-12 lg:col-span-4">
          {INCOME_STATEMENT.map((row, i) => (
            <div key={row.label} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tabular-nums">{row.value}</span>
                {row.yoy && <span className="text-[10px] tabular-nums" style={{ color: row.yoy.startsWith("+") ? LIME : row.yoy.startsWith("−") ? ROSE : TM }}>{row.yoy}</span>}
              </div>
            </div>
          ))}
        </ClayCard>
        <ClayCard title="Balance Sheet" accent={SKY} className="col-span-12 lg:col-span-4">
          {BALANCE_SHEET.map((row, i) => (
            <div key={row.label} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: row.value.startsWith("-") ? ROSE : TX }}>{row.value}</span>
            </div>
          ))}
        </ClayCard>
        <ClayCard title="Cash Flow" accent={LIME} className="col-span-12 lg:col-span-4">
          {CASH_FLOW.map((row, i) => (
            <div key={row.label} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span className="text-sm" style={{ color: T2 }}>{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tabular-nums" style={{ color: row.value.startsWith("-") ? ROSE : TX }}>{row.value}</span>
                {row.yoy && <span className="text-[10px] tabular-nums" style={{ color: TM }}>{row.yoy}</span>}
              </div>
            </div>
          ))}
        </ClayCard>

        {/* ── 12. Risks & Catalysts ── */}
        <ClayCard title="Key Risks" icon={<IcHeart />} accent={ROSE} className="col-span-12 md:col-span-6">
          {KEY_RISKS.map((r, i) => (
            <div key={i} className={i > 0 ? "pt-4" : ""} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold">{r.title}</h4>
                <span className="text-[9px] font-black uppercase tracking-wider rounded-lg px-2 py-0.5" style={{ color: r.severity === "High" ? ROSE : r.severity === "Medium" ? AMBER : TM, boxShadow: inset }}>{r.severity}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: T2 }}>{r.description}</p>
            </div>
          ))}
        </ClayCard>
        <ClayCard title="Catalysts" icon={<IcFlame />} accent={AMBER} className="col-span-12 md:col-span-6">
          {CATALYSTS.map((c, i) => (
            <div key={i} className={i > 0 ? "pt-4" : ""} style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold">{c.title}</h4>
                <span className="text-[9px] font-black uppercase tracking-wider rounded-lg px-2 py-0.5" style={{ color: AMBER, boxShadow: inset }}>{c.timeline}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: T2 }}>{c.description}</p>
            </div>
          ))}
        </ClayCard>

        {/* ── 13. Competitors ── */}
        <ClayCard title="Competitors" icon={<IcDiamond />} accent={SKY} className="col-span-12">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[8px] uppercase tracking-[0.2em] font-black" style={{ color: TM }}>
                  <th className="text-left py-2">Company</th><th className="text-right py-2">Mkt Cap</th><th className="text-right py-2">P/E</th><th className="text-right py-2">Revenue</th><th className="text-right py-2">Margin</th><th className="text-right py-2">Growth</th>
                </tr>
                <tr><td colSpan={6}><Dent /></td></tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c) => (
                  <tr key={c.ticker} style={{ borderTop: `1px solid ${SD}` }}>
                    <td className="py-2"><span className="font-bold" style={{ color: VIOLET }}>{c.ticker}</span> <span style={{ color: TM }}>{c.name}</span></td>
                    <td className="py-2 text-right tabular-nums">{c.marketCap}</td>
                    <td className="py-2 text-right tabular-nums" style={{ color: T2 }}>{c.pe}</td>
                    <td className="py-2 text-right tabular-nums">{c.revenue}</td>
                    <td className="py-2 text-right tabular-nums" style={{ color: T2 }}>{c.margin}</td>
                    <td className="py-2 text-right tabular-nums font-bold" style={{ color: c.growth.startsWith("+") ? LIME : ROSE }}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ClayCard>

        {/* ── 14. Valuation, Technicals, Dividends ── */}
        <ClayCard title="Valuation" accent={VIOLET} className="col-span-12 lg:col-span-4">
          {VALUATION_RATIOS.map((r, i) => (
            <div key={r.label} className="flex justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span className="text-sm" style={{ color: T2 }}>{r.label}</span>
              <span className="text-sm font-bold tabular-nums">{r.value}</span>
            </div>
          ))}
        </ClayCard>
        <ClayCard title="Technicals" accent={SKY} className="col-span-12 lg:col-span-4">
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
            <div key={t.l} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span className="text-sm" style={{ color: T2 }}>{t.l}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: t.s ? LIME : ROSE }}>{t.v}</span>
            </div>
          ))}
        </ClayCard>
        <ClayCard title="Dividends" accent={AMBER} className="col-span-12 lg:col-span-4">
          {DIVIDEND_HISTORY.map((d, i) => (
            <div key={d.year} className="flex items-center justify-between py-1.5" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span className="text-sm font-bold" style={{ color: VIOLET }}>{d.year}</span>
              <div className="flex items-center gap-3 text-sm tabular-nums">
                <span className="font-bold">{d.annual}</span>
                <span style={{ color: TM }}>{d.yield}</span>
                <span style={{ color: LIME }}>{d.growth}</span>
              </div>
            </div>
          ))}
        </ClayCard>

        {/* ── 15. Holders + ESG ── */}
        <ClayCard title="Top Holders" accent={VIOLET} className="col-span-12 md:col-span-6">
          {TOP_HOLDERS.map((h, i) => (
            <div key={h.name} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span className="text-sm">{h.name}</span>
              <div className="flex items-center gap-3 text-sm tabular-nums">
                <span style={{ color: TM }}>{h.shares}</span>
                <span className="font-bold w-10 text-right" style={{ color: VIOLET }}>{h.pct}</span>
                <span className="w-16 text-right" style={{ color: T2 }}>{h.value}</span>
              </div>
            </div>
          ))}
        </ClayCard>
        <ClayCard title={`ESG — ${ESG.provider}`} icon={<IcBubble c={LIME} />} accent={LIME} className="col-span-12 md:col-span-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ boxShadow: inset }}>
              <span className="text-2xl font-black" style={{ color: LIME }}>{ESG.rating}</span>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              {[
                { l: "Env", s: ESG.environmentScore, c: LIME },
                { l: "Soc", s: ESG.socialScore, c: SKY },
                { l: "Gov", s: ESG.governanceScore, c: AMBER },
              ].map((e) => (
                <div key={e.l} className="text-center rounded-2xl py-2" style={{ boxShadow: inset }}>
                  <div className="text-lg font-black" style={{ color: e.c }}>{e.s}</div>
                  <div className="text-[7px] uppercase tracking-[0.2em] font-black" style={{ color: TM }}>{e.l}</div>
                </div>
              ))}
            </div>
          </div>
          <Dent />
          {ESG.highlights.map((h, i) => (
            <p key={i} className="text-sm leading-relaxed mb-1" style={{ color: T2 }}><span style={{ color: LIME }}>●</span> {h}</p>
          ))}
        </ClayCard>

        {/* ── 16. Watchlist + News + Sector perf in bottom wide row ── */}
        <ClayCard title="Watchlist" accent={PINK} className="col-span-12 lg:col-span-4">
          {WATCHLIST.map((w, i) => (
            <div key={w.ticker} className="flex items-center justify-between py-2 cursor-pointer" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <div>
                <span className="text-sm font-bold">{w.ticker}</span>
                <span className="text-[9px] ml-1.5" style={{ color: TM }}>{w.volume}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold tabular-nums">{usd(w.price)}</div>
                <div className="text-[10px] tabular-nums" style={{ color: w.change >= 0 ? LIME : ROSE }}>{pct(w.change)}</div>
              </div>
            </div>
          ))}
        </ClayCard>
        <ClayCard title="News" accent={VIOLET} className="col-span-12 lg:col-span-5">
          {NEWS.map((n, i) => (
            <div key={i} className="py-2 cursor-pointer" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span className="text-[10px] font-mono font-bold mr-1.5" style={{ color: VIOLET }}>{n.time}</span>
              <span className="text-sm" style={{ color: T2 }}>{n.headline}</span>
            </div>
          ))}
        </ClayCard>
        <ClayCard title="Sector Performance" accent={AMBER} className="col-span-12 lg:col-span-3">
          {SECTOR_PERFORMANCE.map((s, i) => (
            <div key={s.label} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${SD}` : "none" }}>
              <span className="text-sm" style={{ color: T2 }}>{s.label}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: s.value.startsWith("+") ? LIME : ROSE }}>{s.value}</span>
            </div>
          ))}
        </ClayCard>

      </div>

      {/* ── Footer ── */}
      <footer style={{ background: BG }}>
        <div className="mx-6 h-1 rounded-full" style={{ boxShadow: inset }} />
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] font-black" style={{ color: TM }}>
          <span>Zero Sum — 08-C: Claymorphism</span>
          <span>Sample data only</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
