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
   Style 12-I — Japanese Financial Press (Nikkei-style)
   Dense, orderly, colour-coded section bands, clean sans-serif,
   stamp-style badges, compact sparklines, boxed section labels.
   ══════════════════════════════════════════════════════════════ */

const WHITE  = "#ffffff";
const OFFWH  = "#f5f5f0";
const NAVY   = "#003366";
const DNAVY  = "#001a33";
const ACCENT = "#c8102e";   // Nikkei red
const BLUE2  = "#2e6da4";
const GREEN  = "#1a8754";
const RED2   = "#c8102e";
const GREY   = "#666666";
const LGREY  = "#e5e5e0";
const DGREY  = "#333333";

const sans = "'Inter', 'Noto Sans JP', 'Helvetica Neue', system-ui, sans-serif";
const mono = "'IBM Plex Mono', 'Courier New', monospace";

const nClr = (n: number) => (n >= 0 ? GREEN : RED2);

/* ── Boxed section label ── */
function SectionLabel({ text, color = NAVY }: { text: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mt-8 mb-3">
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: sans, background: color, color: WHITE }}>
        {text}
      </div>
      <div className="flex-1 h-px" style={{ background: color }} />
    </div>
  );
}

/* ── Stamp Badge ── */
function Stamp({ children, color = ACCENT }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border-2 rotate-[-2deg]" style={{ fontFamily: mono, borderColor: color, color }}>
      {children}
    </span>
  );
}

/* ── Card ── */
function NKCard({ title, band, children, className = "" }: { title?: string; band?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white ${className}`} style={{ border: `1px solid ${LGREY}` }}>
      {band && <div className="h-1" style={{ background: band }} />}
      {title && (
        <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${LGREY}`, background: OFFWH }}>
          <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ fontFamily: sans, color: DGREY }}>{title}</h3>
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}

/* ── Range ── */
function NKRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-3">
      <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ fontFamily: sans, color: GREY }}>{label}</div>
      <div className="relative h-1.5 rounded overflow-hidden" style={{ background: LGREY }}>
        <div className="absolute h-full rounded" style={{ width: `${p}%`, background: NAVY }} />
        <div className="absolute w-1 h-3 -translate-x-1/2 -top-0.5 rounded-sm" style={{ left: `${p}%`, background: ACCENT }} />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums mt-0.5" style={{ fontFamily: mono, color: GREY }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function NikkeiPrototype() {
  return (
    <div className="min-h-screen" style={{ background: OFFWH, color: DGREY, fontFamily: sans }}>

      {/* ── Banner ── */}
      <header style={{ background: NAVY }}>
        <div className="mx-auto max-w-[1100px] px-4">
          <div className="flex items-center justify-between py-1.5 text-[10px]" style={{ color: `${WHITE}66`, fontFamily: mono }}>
            <Link href="/prototype" className="hover:underline" style={{ color: `${WHITE}aa` }}>◀ STYLES INDEX</Link>
            <span>2026.03.03 MONDAY · MARKET OPEN</span>
          </div>
        </div>
      </header>

      {/* ── Masthead ── */}
      <div style={{ background: DNAVY }}>
        <div className="mx-auto max-w-[1100px] px-4 py-4 flex items-center justify-between">
          <Link href="/prototype" className="hover:opacity-80 transition-opacity">
            <h1 className="text-3xl font-black tracking-[0.15em]" style={{ color: WHITE }}>
              <span style={{ color: ACCENT }}>Z</span>ERO <span style={{ color: ACCENT }}>S</span>UM
            </h1>
            <div className="text-[9px] tracking-[0.3em] uppercase" style={{ color: `${WHITE}66` }}>Financial Intelligence · 株式情報</div>
          </Link>
          <div className="flex items-center gap-6" style={{ color: `${WHITE}88`, fontFamily: mono, fontSize: "11px" }}>
            {[
              { l: "Nikkei 225", v: "38,274", c: "+0.62%" },
              { l: "TOPIX", v: "2,712", c: "+0.45%" },
              { l: "USD/JPY", v: "149.85", c: "-0.12%" },
            ].map((m) => (
              <div key={m.l} className="text-center">
                <div className="text-[8px] uppercase tracking-wider" style={{ color: `${WHITE}44` }}>{m.l}</div>
                <span className="font-bold" style={{ color: WHITE }}>{m.v} </span>
                <span style={{ color: m.c.startsWith("+") ? "#4caf50" : ACCENT }}>{m.c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1100px] px-4 py-4">

        {/* ── Price Hero ── */}
        <div className="flex items-stretch gap-0 mb-4" style={{ border: `1px solid ${LGREY}` }}>
          <div className="flex-1 p-4 bg-white">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-black" style={{ color: NAVY }}>{STOCK.ticker}</span>
              <span className="text-sm" style={{ color: GREY }}>{STOCK.name}</span>
              <Stamp>{STOCK.sector}</Stamp>
            </div>
            <div className="flex items-baseline gap-4">
              <div className="text-4xl font-black tabular-nums" style={{ fontFamily: mono, color: DNAVY }}>{usd(STOCK.price)}</div>
              <div className="text-xl font-bold tabular-nums" style={{ fontFamily: mono, color: nClr(STOCK.change) }}>
                {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
              </div>
              <div className="text-sm font-bold tabular-nums" style={{ fontFamily: mono, color: nClr(STOCK.changePct) }}>
                ({pct(STOCK.changePct)})
              </div>
            </div>
            <div className="text-[10px] mt-2" style={{ fontFamily: mono, color: GREY }}>
              {STOCK.exchange} · Vol {fmt(STOCK.volume)} · {new Date().toLocaleDateString()}
            </div>
          </div>
          <div className="w-64 p-3 flex flex-col justify-center gap-1" style={{ background: OFFWH, borderLeft: `1px solid ${LGREY}` }}>
            {[
              { l: "Mkt Cap", v: fmt(STOCK.marketCap) },
              { l: "P/E", v: STOCK.pe.toFixed(1) },
              { l: "EPS", v: usd(STOCK.eps) },
              { l: "Beta", v: STOCK.beta.toFixed(2) },
              { l: "Yield", v: `${STOCK.dividendYield.toFixed(2)}%` },
            ].map((s) => (
              <div key={s.l} className="flex justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: GREY }}>{s.l}</span>
                <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: mono }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chart ── */}
        <NKCard title="Price Chart" band={NAVY}>
          <svg className="w-full h-40" preserveAspectRatio="none" viewBox="0 0 400 120">
            {[0, 30, 60, 90, 120].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={LGREY} strokeWidth="0.5" />
            ))}
            <polyline points="0,108 25,103 50,106 75,90 100,96 125,82 150,87 175,72 200,78 225,62 250,67 275,54 300,59 325,46 350,50 375,40 400,34" fill="none" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" />
            <polyline points="0,108 25,103 50,106 75,90 100,96 125,82 150,87 175,72 200,78 225,62 250,67 275,54 300,59 325,46 350,50 375,40 400,34" fill={`${NAVY}10`} strokeWidth="0" />
          </svg>
        </NKCard>

        {/* ── TWO-COLUMN ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">

          {/* LEFT COLUMN (3/5) */}
          <div className="lg:col-span-3 space-y-4">
            <SectionLabel text="企業概要 · Company Overview" />
            <NKCard band={BLUE2}>
              <p className="text-sm leading-relaxed" style={{ color: DGREY }}>{COMPANY_DESCRIPTION}</p>
              <div className="h-px my-3" style={{ background: LGREY }} />
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "CEO", v: STOCK.ceo },
                  { l: "HQ", v: STOCK.headquarters },
                  { l: "Employees", v: STOCK.employees.toLocaleString() },
                  { l: "Founded", v: STOCK.founded },
                  { l: "IPO", v: STOCK.ipoDate },
                  { l: "Fiscal Year", v: STOCK.fiscalYearEnd },
                ].map((item) => (
                  <div key={item.l}>
                    <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: GREY }}>{item.l}</div>
                    <div className="text-xs font-bold" style={{ fontFamily: mono }}>{item.v}</div>
                  </div>
                ))}
              </div>
            </NKCard>

            <SectionLabel text="分析 · Analysis" color={BLUE2} />
            <NKCard>
              <p className="text-sm leading-relaxed mb-2">{AI_ANALYSIS.summary}</p>
              <p className="text-sm leading-relaxed" style={{ color: GREY }}>{AI_ANALYSIS.outlook}</p>
            </NKCard>

            <div className="grid grid-cols-2 gap-4">
              <NKCard title="強気 · Bull Case" band={GREEN}>
                <p className="text-xs leading-relaxed mb-2" style={{ color: GREY }}>{BULL_CASE.thesis}</p>
                {BULL_CASE.keyMetrics.map((m) => (
                  <div key={m.label} className="flex justify-between py-1 text-xs" style={{ borderTop: `1px solid ${LGREY}` }}>
                    <span style={{ color: GREY }}>{m.label}</span>
                    <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: GREEN }}>{m.value}</span>
                  </div>
                ))}
              </NKCard>
              <NKCard title="弱気 · Bear Case" band={ACCENT}>
                <p className="text-xs leading-relaxed mb-2" style={{ color: GREY }}>{BEAR_CASE.thesis}</p>
                {BEAR_CASE.keyMetrics.map((m) => (
                  <div key={m.label} className="flex justify-between py-1 text-xs" style={{ borderTop: `1px solid ${LGREY}` }}>
                    <span style={{ color: GREY }}>{m.label}</span>
                    <span className="font-bold tabular-nums" style={{ fontFamily: mono, color: RED2 }}>{m.value}</span>
                  </div>
                ))}
              </NKCard>
            </div>

            <SectionLabel text="リスク · Risks" color={ACCENT} />
            <NKCard>
              {KEY_RISKS.map((r, i) => (
                <div key={i} className="py-2" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold px-1 py-0.5" style={{ background: r.severity === "High" ? `${ACCENT}15` : `${NAVY}10`, color: r.severity === "High" ? ACCENT : NAVY, fontFamily: mono }}>{r.severity}</span>
                    <h4 className="text-xs font-bold">{r.title}</h4>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: GREY }}>{r.description}</p>
                </div>
              ))}
            </NKCard>

            <SectionLabel text="カタリスト · Catalysts" color={GREEN} />
            <NKCard>
              {CATALYSTS.map((c, i) => (
                <div key={i} className="py-2" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold">{c.title}</h4>
                    <span className="text-[10px] font-bold" style={{ fontFamily: mono, color: GREEN }}>{c.timeline}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: GREY }}>{c.description}</p>
                </div>
              ))}
            </NKCard>

            {/* Earnings */}
            <SectionLabel text="決算 · Earnings" />
            <NKCard>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${NAVY}` }}>
                      {["Quarter", "Date", "EPS Est", "EPS Act", "Revenue", "Growth", "Surprise"].map((h) => (
                        <th key={h} className={`py-1.5 px-2 text-[8px] font-bold uppercase tracking-wider ${h === "Quarter" || h === "Date" ? "text-left" : "text-right"}`} style={{ color: GREY }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {EARNINGS.map((e) => (
                      <tr key={e.quarter} style={{ borderTop: `1px solid ${LGREY}` }}>
                        <td className="py-1 px-2 font-bold" style={{ fontFamily: mono }}>{e.quarter}</td>
                        <td className="py-1 px-2" style={{ fontFamily: mono, color: GREY }}>{e.date}</td>
                        <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, color: GREY }}>{usd(e.epsEst)}</td>
                        <td className="py-1 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, color: e.epsActual >= e.epsEst ? GREEN : RED2 }}>{usd(e.epsActual)}</td>
                        <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono }}>{e.revenue}</td>
                        <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, color: nClr(e.revenueGrowth) }}>{pct(e.revenueGrowth)}</td>
                        <td className="py-1 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, color: e.surprise.startsWith("+") ? GREEN : RED2 }}>{e.surprise}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </NKCard>

            {/* Financials */}
            <SectionLabel text="財務諸表 · Financial Statements" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { title: "損益計算書 · Income", data: INCOME_STATEMENT, hasYoy: true, band: NAVY },
                { title: "貸借対照表 · Balance", data: BALANCE_SHEET, hasYoy: false, band: BLUE2 },
                { title: "CF計算書 · Cash Flow", data: CASH_FLOW, hasYoy: true, band: GREEN },
              ].map((section) => (
                <NKCard key={section.title} title={section.title} band={section.band}>
                  {section.data.map((row, i) => (
                    <div key={row.label} className="flex items-center justify-between py-0.5 text-xs" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                      <span style={{ color: GREY }}>{row.label}</span>
                      <span>
                        <span className="font-bold tabular-nums" style={{ fontFamily: mono }}>{row.value}</span>
                        {section.hasYoy && typeof (row as unknown as { yoy?: string }).yoy === "string" && (
                          <span className="text-[10px] ml-1 tabular-nums" style={{ fontFamily: mono, color: (row as unknown as { yoy: string }).yoy.startsWith("+") ? GREEN : (row as unknown as { yoy: string }).yoy.startsWith("−") ? RED2 : GREY }}>{(row as unknown as { yoy: string }).yoy}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </NKCard>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN (2/5) */}
          <div className="lg:col-span-2 space-y-4">
            <NKCard title="Trading Range" band={NAVY}>
              <NKRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="Today" />
              <NKRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-Week" />
              <div className="h-px my-2" style={{ background: LGREY }} />
              {[
                { l: "Open", v: usd(STOCK.open) },
                { l: "Prev Close", v: usd(STOCK.prevClose) },
                { l: "Avg Volume", v: fmt(STOCK.avgVolume) },
              ].map((r) => (
                <div key={r.l} className="flex justify-between py-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: GREY }}>{r.l}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ fontFamily: mono }}>{r.v}</span>
                </div>
              ))}
            </NKCard>

            <NKCard title="事業セグメント · Segments" band={BLUE2}>
              {SEGMENTS.map((seg) => (
                <div key={seg.name} className="mb-2">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-bold">{seg.name}</span>
                    <span className="tabular-nums" style={{ fontFamily: mono, color: GREY }}>{seg.revenue} ({seg.pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded overflow-hidden" style={{ background: LGREY }}>
                    <div className="h-full rounded" style={{ width: `${seg.pct * 2}%`, background: NAVY }} />
                  </div>
                </div>
              ))}
            </NKCard>

            <NKCard title="アナリスト · Analysts" band={GREEN}>
              <div className="text-center mb-3">
                <div className="text-2xl font-black" style={{ color: GREEN }}>{ANALYST_CONSENSUS.rating}</div>
                <div className="flex justify-center gap-3 text-[10px]" style={{ fontFamily: mono, color: GREY }}>
                  <span>Buy {ANALYST_CONSENSUS.buy}</span>
                  <span>Hold {ANALYST_CONSENSUS.hold}</span>
                  <span>Sell {ANALYST_CONSENSUS.sell}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0 text-center" style={{ background: OFFWH, border: `1px solid ${LGREY}` }}>
                {[
                  { l: "Low", v: usd(ANALYST_CONSENSUS.lowTarget) },
                  { l: "Avg", v: usd(ANALYST_CONSENSUS.avgTarget) },
                  { l: "High", v: usd(ANALYST_CONSENSUS.highTarget) },
                ].map((t, i) => (
                  <div key={t.l} className="py-2" style={{ borderRight: i < 2 ? `1px solid ${LGREY}` : "none" }}>
                    <div className="text-[7px] font-bold uppercase tracking-wider" style={{ color: GREY }}>{t.l}</div>
                    <div className="text-xs font-bold tabular-nums" style={{ fontFamily: mono }}>{t.v}</div>
                  </div>
                ))}
              </div>
              <div className="h-px my-2" style={{ background: LGREY }} />
              {ANALYSTS.map((a, i) => (
                <div key={a.firm} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                  <div>
                    <div className="text-xs font-bold">{a.firm}</div>
                    <div className="text-[9px]" style={{ fontFamily: mono, color: GREY }}>{a.analyst}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold" style={{ color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? GREEN : a.rating.includes("Sell") || a.rating.includes("Underperform") ? RED2 : GREY }}>{a.rating}</span>
                    <div className="text-xs font-bold tabular-nums" style={{ fontFamily: mono }}>{usd(a.target)}</div>
                  </div>
                </div>
              ))}
            </NKCard>

            <NKCard title="コメント · Commentary" band={NAVY}>
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className="py-2" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-bold">{c.title}</h4>
                    <span className="text-[9px]" style={{ fontFamily: mono, color: GREY }}>{c.date}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: GREY }}>{c.snippet}</p>
                </div>
              ))}
            </NKCard>

            <NKCard title="テクニカル · Technicals" band={ACCENT}>
              {[
                { l: "SMA 20", v: usd(TECHNICALS.sma20), s: STOCK.price > TECHNICALS.sma20 },
                { l: "SMA 50", v: usd(TECHNICALS.sma50), s: STOCK.price > TECHNICALS.sma50 },
                { l: "SMA 200", v: usd(TECHNICALS.sma200), s: STOCK.price > TECHNICALS.sma200 },
                { l: "RSI 14", v: TECHNICALS.rsi14.toString(), s: TECHNICALS.rsi14 < 70 },
                { l: "Trend", v: TECHNICALS.trend, s: TECHNICALS.trend === "Uptrend" },
                { l: "MACD", v: TECHNICALS.macdSignal, s: TECHNICALS.macdSignal.includes("Bullish") },
              ].map((t, i) => (
                <div key={t.l} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                  <span className="text-xs" style={{ color: GREY }}>{t.l}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ fontFamily: mono, color: t.s ? GREEN : RED2 }}>{t.v}</span>
                </div>
              ))}
            </NKCard>

            <NKCard title="ESG" band={GREEN}>
              <div className="grid grid-cols-4 gap-0 text-center mb-3" style={{ border: `1px solid ${LGREY}` }}>
                {[
                  { l: "Total", v: ESG.rating },
                  { l: "Env", v: ESG.environmentScore },
                  { l: "Soc", v: ESG.socialScore },
                  { l: "Gov", v: ESG.governanceScore },
                ].map((s, i) => (
                  <div key={s.l} className="py-2" style={{ borderRight: i < 3 ? `1px solid ${LGREY}` : "none" }}>
                    <div className="text-[7px] font-bold uppercase tracking-wider" style={{ color: GREY }}>{s.l}</div>
                    <div className="text-sm font-black" style={{ fontFamily: mono, color: NAVY }}>{s.v}</div>
                  </div>
                ))}
              </div>
              {ESG.highlights.map((h, i) => (
                <p key={i} className="text-xs leading-relaxed mb-1" style={{ color: GREY }}>• {h}</p>
              ))}
            </NKCard>
          </div>
        </div>

        {/* ── Bottom ── */}
        <SectionLabel text="競合 · Competitors" />
        <NKCard>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${NAVY}` }}>
                  {["Company", "Mkt Cap", "P/E", "Revenue", "Margin", "Growth"].map((h) => (
                    <th key={h} className={`py-1 px-2 text-[8px] font-bold uppercase tracking-wider ${h === "Company" ? "text-left" : "text-right"}`} style={{ color: GREY }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c) => (
                  <tr key={c.ticker} style={{ borderTop: `1px solid ${LGREY}` }}>
                    <td className="py-1 px-2"><span className="font-bold" style={{ fontFamily: mono }}>{c.ticker}</span> <span style={{ color: GREY }}>{c.name}</span></td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono }}>{c.marketCap}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, color: GREY }}>{c.pe}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono }}>{c.revenue}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ fontFamily: mono, color: GREY }}>{c.margin}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-bold" style={{ fontFamily: mono, color: c.growth.startsWith("+") ? GREEN : RED2 }}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NKCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <NKCard title="マーケット · Watchlist" band={NAVY}>
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                <span className="text-xs font-bold" style={{ fontFamily: mono }}>{w.ticker}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums font-bold" style={{ fontFamily: mono }}>{usd(w.price)}</span>
                  <span className="text-[10px] tabular-nums" style={{ fontFamily: mono, color: nClr(w.change) }}>{pct(w.change)}</span>
                </div>
              </div>
            ))}
          </NKCard>
          <NKCard title="ニュース · News" band={ACCENT}>
            {NEWS.map((n, i) => (
              <div key={i} className="py-1" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                <span className="text-[9px] font-bold mr-1" style={{ fontFamily: mono, color: ACCENT }}>{n.time}</span>
                <span className="text-xs" style={{ color: GREY }}>{n.headline}</span>
              </div>
            ))}
          </NKCard>
          <NKCard title="セクター · Sectors" band={BLUE2}>
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                <span className="text-xs" style={{ color: GREY }}>{s.label}</span>
                <span className="text-xs font-bold tabular-nums" style={{ fontFamily: mono, color: s.value.startsWith("+") ? GREEN : RED2 }}>{s.value}</span>
              </div>
            ))}
          </NKCard>
        </div>

        {/* Valuation + Dividends + Holders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <NKCard title="バリュエーション" band={NAVY}>
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className="flex justify-between py-0.5" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                <span className="text-xs" style={{ color: GREY }}>{r.label}</span>
                <span className="text-xs font-bold tabular-nums" style={{ fontFamily: mono }}>{r.value}</span>
              </div>
            ))}
          </NKCard>
          <NKCard title="配当 · Dividends" band={GREEN}>
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className="flex items-center justify-between py-0.5" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                <span className="text-xs font-bold" style={{ fontFamily: mono }}>{d.year}</span>
                <div className="flex items-center gap-2 text-xs tabular-nums" style={{ fontFamily: mono }}>
                  <span className="font-bold">{d.annual}</span>
                  <span style={{ color: GREY }}>{d.yield}</span>
                  <span style={{ color: GREEN }}>{d.growth}</span>
                </div>
              </div>
            ))}
          </NKCard>
          <NKCard title="大株主 · Top Holders" band={BLUE2}>
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className="flex items-center justify-between py-0.5" style={{ borderTop: i > 0 ? `1px solid ${LGREY}` : "none" }}>
                <span className="text-xs truncate mr-2">{h.name}</span>
                <span className="text-xs font-bold tabular-nums whitespace-nowrap" style={{ fontFamily: mono }}>{h.pct}</span>
              </div>
            ))}
          </NKCard>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-6" style={{ background: DNAVY }}>
        <div className="mx-auto max-w-[1100px] px-4 py-3 text-center text-[9px] tracking-wider" style={{ fontFamily: mono, color: `${WHITE}44` }}>
          ZERO SUM — 12-I: Japanese Financial Press (Nikkei) · サンプルデータ · Sample Data Only · © 2026
        </div>
      </footer>
    </div>
  );
}
