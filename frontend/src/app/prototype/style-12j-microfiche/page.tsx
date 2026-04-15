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
   Style 12-J — Microfiche Archive (1970s–80s)
   Dark blue-green CRT phosphor, amber highlights, OCR mono,
   scan-line overlay, film-frame borders, archival stamps.
   ══════════════════════════════════════════════════════════════ */

const BG     = "#0a1a1f";    // dark blue-green base
const BG2    = "#0e2228";    // slightly lighter
const CYAN   = "#7ecfc0";    // phosphor cyan
const AMBER  = "#e0a040";    // amber highlight
const DIM    = "#3a6a60";    // dim cyan
const VDIM   = "#1e3a34";    // very dim
const RED2   = "#e05050";    // warning red
const GREEN  = "#60d070";    // green signal
const WHITE  = "#d0e8e0";    // off-white phosphor

const mono = "'IBM Plex Mono', 'OCR A Std', 'Courier New', monospace";

const nClr = (n: number) => (n >= 0 ? GREEN : RED2);

/* ── Film Frame Border ── */
function Frame({ children, label, className = "" }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <div className={`relative border p-3 ${className}`} style={{ borderColor: VDIM, background: BG2 }}>
      {/* Sprocket holes */}
      <div className="absolute -left-1.5 top-2 bottom-2 flex flex-col justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-sm" style={{ background: BG, border: `1px solid ${VDIM}` }} />
        ))}
      </div>
      {label && (
        <div className="absolute -top-2 left-6 px-2 text-[8px] uppercase tracking-[0.2em]" style={{ fontFamily: mono, background: BG2, color: AMBER }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Section ── */
function MicroSection({ title, id }: { title: string; id?: string }) {
  return (
    <div className="mt-8 mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[8px] tracking-wider" style={{ fontFamily: mono, color: AMBER }}>{id || "▸"}</span>
        <h2 className="text-sm font-bold uppercase tracking-[0.15em]" style={{ fontFamily: mono, color: CYAN }}>{title}</h2>
        <div className="flex-1 h-px" style={{ background: VDIM }} />
      </div>
    </div>
  );
}

/* ── Card ── */
function MicroCard({ head, children, className = "" }: { head?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ border: `1px solid ${VDIM}`, background: BG2 }}>
      {head && (
        <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: mono, color: AMBER, borderBottom: `1px solid ${VDIM}`, background: `${AMBER}08` }}>
          ▪ {head}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}

/* ── Range ── */
function MicroRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const p = ((current - low) / (high - low)) * 100;
  return (
    <div className="mb-3">
      <div className="text-[8px] tracking-wider mb-1" style={{ fontFamily: mono, color: DIM }}>{label}</div>
      <div className="relative h-1" style={{ background: VDIM }}>
        <div className="absolute h-full" style={{ width: `${p}%`, background: CYAN }} />
        <div className="absolute w-0.5 h-3 -translate-x-1/2 -top-1" style={{ left: `${p}%`, background: AMBER }} />
      </div>
      <div className="flex justify-between text-[9px] tabular-nums mt-0.5" style={{ fontFamily: mono, color: DIM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ── Stamp ── */
function ArchivalStamp({ text, color = AMBER }: { text: string; color?: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border rotate-[-1deg]" style={{ fontFamily: mono, borderColor: color, color }}>
      {text}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function MicrofichePrototype() {
  return (
    <div className="min-h-screen relative" style={{ background: BG, color: WHITE, fontFamily: mono }}>

      {/* Scan-line overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${CYAN} 2px, ${CYAN} 3px)`,
      }} />

      {/* ── Header ── */}
      <header className="border-b" style={{ borderColor: VDIM }}>
        <div className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between text-[10px]" style={{ color: DIM }}>
          <Link href="/prototype" className="hover:underline" style={{ color: AMBER }}>◂ INDEX</Link>
          <span>REEL 2026-03A · FRAME 001/001 · MAGNIFICATION: 24×</span>
        </div>
      </header>

      {/* ── Masthead ── */}
      <div className="border-b" style={{ borderColor: VDIM, background: `${CYAN}06` }}>
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/prototype" className="hover:opacity-80 transition-opacity block">
              <h1 className="text-3xl font-bold tracking-[0.3em]" style={{ color: CYAN }}>
                ZERO·SUM
              </h1>
              <div className="text-[9px] tracking-[0.2em] mt-1" style={{ color: DIM }}>
                FINANCIAL RESEARCH MICROFICHE · ARCHIVAL RECORDS DIVISION
              </div>
            </Link>
            <div className="text-right text-[9px]" style={{ color: DIM }}>
              <div>DATE CATALOGUED: 2026-03-03</div>
              <div>CLASSIFICATION: <span style={{ color: AMBER }}>PUBLIC RECORD</span></div>
              <ArchivalStamp text="VERIFIED" color={GREEN} />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">

        {/* ── Price Hero ── */}
        <Frame label="SUBJECT: EQUITY RECORD">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-bold" style={{ color: CYAN }}>{STOCK.ticker}</span>
                <span className="text-sm" style={{ color: DIM }}>{STOCK.name}</span>
                <ArchivalStamp text={STOCK.sector} />
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-bold tabular-nums" style={{ color: CYAN }}>{usd(STOCK.price)}</span>
                <span className="text-xl font-bold tabular-nums" style={{ color: nClr(STOCK.change) }}>
                  {STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}
                </span>
                <span className="text-sm tabular-nums" style={{ color: nClr(STOCK.changePct) }}>
                  ({pct(STOCK.changePct)})
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-0 border" style={{ borderColor: VDIM }}>
            {[
              { l: "MKT CAP", v: fmt(STOCK.marketCap) },
              { l: "P/E", v: STOCK.pe.toFixed(1) },
              { l: "EPS", v: usd(STOCK.eps) },
              { l: "BETA", v: STOCK.beta.toFixed(2) },
              { l: "YIELD", v: `${STOCK.dividendYield.toFixed(2)}%` },
              { l: "52W HI", v: usd(STOCK.week52High) },
              { l: "52W LO", v: usd(STOCK.week52Low) },
              { l: "VOL", v: fmt(STOCK.volume) },
            ].map((s, i) => (
              <div key={s.l} className="text-center py-2 px-1" style={{ borderRight: i < 7 ? `1px solid ${VDIM}` : "none" }}>
                <div className="text-[7px] tracking-wider" style={{ color: DIM }}>{s.l}</div>
                <div className="text-[11px] font-bold tabular-nums" style={{ color: CYAN }}>{s.v}</div>
              </div>
            ))}
          </div>
        </Frame>

        {/* ── Chart ── */}
        <MicroSection title="Price Record" id="SEC-01" />
        <Frame>
          <svg className="w-full h-44" preserveAspectRatio="none" viewBox="0 0 400 130">
            {[0, 32, 65, 97, 130].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={VDIM} strokeWidth="0.5" />
            ))}
            {/* Grid verticals */}
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={i} x1={i * 50} y1="0" x2={i * 50} y2="130" stroke={VDIM} strokeWidth="0.3" />
            ))}
            {/* Glow path */}
            <polyline points="0,118 25,113 50,116 75,100 100,106 125,92 150,97 175,82 200,88 225,72 250,77 275,64 300,69 325,56 350,60 375,50 400,42" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
            {/* Main path */}
            <polyline points="0,118 25,113 50,116 75,100 100,106 125,92 150,97 175,82 200,88 225,72 250,77 275,64 300,69 325,56 350,60 375,50 400,42" fill="none" stroke={CYAN} strokeWidth="1.5" strokeLinecap="round" />
            {/* Dots */}
            {[
              [0,118],[100,106],[200,88],[300,69],[400,42],
            ].map(([cx,cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" fill={AMBER} />
            ))}
          </svg>
        </Frame>

        {/* ── Two Column ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">

          {/* LEFT */}
          <div className="space-y-4">
            <MicroSection title="Corporate Record" id="SEC-02" />
            <MicroCard head="Company Description">
              <p className="text-[11px] leading-relaxed" style={{ color: WHITE }}>{COMPANY_DESCRIPTION}</p>
              <div className="h-px my-3" style={{ background: VDIM }} />
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "CEO", v: STOCK.ceo },
                  { l: "HQ", v: STOCK.headquarters },
                  { l: "EMPLOYEES", v: STOCK.employees.toLocaleString() },
                  { l: "FOUNDED", v: STOCK.founded },
                  { l: "IPO", v: STOCK.ipoDate },
                  { l: "FISCAL YR", v: STOCK.fiscalYearEnd },
                ].map((item) => (
                  <div key={item.l}>
                    <div className="text-[7px] tracking-wider" style={{ color: DIM }}>{item.l}</div>
                    <div className="text-[11px] font-bold" style={{ color: CYAN }}>{item.v}</div>
                  </div>
                ))}
              </div>
            </MicroCard>

            <MicroSection title="Analysis Record" id="SEC-03" />
            <MicroCard head="Research Summary">
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: WHITE }}>{AI_ANALYSIS.summary}</p>
              <p className="text-[11px] leading-relaxed" style={{ color: DIM }}>{AI_ANALYSIS.outlook}</p>
            </MicroCard>

            <div className="grid grid-cols-2 gap-3">
              <MicroCard head="Bull Case">
                <p className="text-[10px] leading-relaxed mb-2" style={{ color: DIM }}>{BULL_CASE.thesis}</p>
                {BULL_CASE.keyMetrics.map((m) => (
                  <div key={m.label} className="flex justify-between py-0.5 text-[10px]" style={{ borderTop: `1px solid ${VDIM}` }}>
                    <span style={{ color: DIM }}>{m.label}</span>
                    <span className="font-bold tabular-nums" style={{ color: GREEN }}>{m.value}</span>
                  </div>
                ))}
              </MicroCard>
              <MicroCard head="Bear Case">
                <p className="text-[10px] leading-relaxed mb-2" style={{ color: DIM }}>{BEAR_CASE.thesis}</p>
                {BEAR_CASE.keyMetrics.map((m) => (
                  <div key={m.label} className="flex justify-between py-0.5 text-[10px]" style={{ borderTop: `1px solid ${VDIM}` }}>
                    <span style={{ color: DIM }}>{m.label}</span>
                    <span className="font-bold tabular-nums" style={{ color: RED2 }}>{m.value}</span>
                  </div>
                ))}
              </MicroCard>
            </div>

            <MicroSection title="Risk Assessment" id="SEC-04" />
            <MicroCard>
              {KEY_RISKS.map((r, i) => (
                <div key={i} className="py-2" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] px-1 py-0.5 border" style={{ borderColor: r.severity === "High" ? RED2 : DIM, color: r.severity === "High" ? RED2 : DIM }}>{r.severity}</span>
                    <span className="text-[11px] font-bold" style={{ color: CYAN }}>{r.title}</span>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: DIM }}>{r.description}</p>
                </div>
              ))}
            </MicroCard>

            <MicroSection title="Catalysts" id="SEC-05" />
            <MicroCard>
              {CATALYSTS.map((c, i) => (
                <div key={i} className="py-2" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold" style={{ color: CYAN }}>{c.title}</span>
                    <span className="text-[9px]" style={{ color: AMBER }}>{c.timeline}</span>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: DIM }}>{c.description}</p>
                </div>
              ))}
            </MicroCard>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <MicroCard head="Trading Ranges">
              <MicroRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="TODAY" />
              <MicroRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-WEEK" />
              <div className="h-px my-2" style={{ background: VDIM }} />
              {[
                { l: "OPEN", v: usd(STOCK.open) },
                { l: "PREV CLOSE", v: usd(STOCK.prevClose) },
                { l: "AVG VOL", v: fmt(STOCK.avgVolume) },
              ].map((r) => (
                <div key={r.l} className="flex justify-between py-0.5">
                  <span className="text-[8px] tracking-wider" style={{ color: DIM }}>{r.l}</span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: CYAN }}>{r.v}</span>
                </div>
              ))}
            </MicroCard>

            <MicroCard head="Business Segments">
              {SEGMENTS.map((seg) => (
                <div key={seg.name} className="mb-2">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span style={{ color: WHITE }}>{seg.name}</span>
                    <span className="tabular-nums" style={{ color: DIM }}>{seg.revenue} ({seg.pct}%)</span>
                  </div>
                  <div className="h-1" style={{ background: VDIM }}>
                    <div className="h-full" style={{ width: `${seg.pct * 2}%`, background: CYAN }} />
                  </div>
                </div>
              ))}
            </MicroCard>

            <MicroCard head="Analyst Consensus">
              <div className="text-center mb-3">
                <div className="text-2xl font-bold" style={{ color: GREEN }}>{ANALYST_CONSENSUS.rating}</div>
                <div className="text-[9px]" style={{ color: DIM }}>
                  BUY {ANALYST_CONSENSUS.buy} · HOLD {ANALYST_CONSENSUS.hold} · SELL {ANALYST_CONSENSUS.sell}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0 border" style={{ borderColor: VDIM }}>
                {[
                  { l: "LOW", v: usd(ANALYST_CONSENSUS.lowTarget) },
                  { l: "AVG", v: usd(ANALYST_CONSENSUS.avgTarget) },
                  { l: "HIGH", v: usd(ANALYST_CONSENSUS.highTarget) },
                ].map((t, i) => (
                  <div key={t.l} className="text-center py-1.5" style={{ borderRight: i < 2 ? `1px solid ${VDIM}` : "none" }}>
                    <div className="text-[7px] tracking-wider" style={{ color: DIM }}>{t.l}</div>
                    <div className="text-[11px] font-bold tabular-nums" style={{ color: CYAN }}>{t.v}</div>
                  </div>
                ))}
              </div>
              <div className="h-px my-2" style={{ background: VDIM }} />
              {ANALYSTS.map((a, i) => (
                <div key={a.firm} className="flex items-center justify-between py-1" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                  <div>
                    <div className="text-[10px] font-bold" style={{ color: WHITE }}>{a.firm}</div>
                    <div className="text-[8px]" style={{ color: DIM }}>{a.analyst}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold" style={{ color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? GREEN : a.rating.includes("Sell") || a.rating.includes("Underperform") ? RED2 : DIM }}>{a.rating}</span>
                    <div className="text-[10px] font-bold tabular-nums" style={{ color: CYAN }}>{usd(a.target)}</div>
                  </div>
                </div>
              ))}
            </MicroCard>

            <MicroCard head="Commentary">
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className="py-2" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold" style={{ color: CYAN }}>{c.title}</span>
                    <span className="text-[8px]" style={{ color: DIM }}>{c.date}</span>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: DIM }}>{c.snippet}</p>
                </div>
              ))}
            </MicroCard>

            <MicroCard head="Technicals">
              {[
                { l: "SMA 20", v: usd(TECHNICALS.sma20), s: STOCK.price > TECHNICALS.sma20 },
                { l: "SMA 50", v: usd(TECHNICALS.sma50), s: STOCK.price > TECHNICALS.sma50 },
                { l: "SMA 200", v: usd(TECHNICALS.sma200), s: STOCK.price > TECHNICALS.sma200 },
                { l: "RSI 14", v: TECHNICALS.rsi14.toString(), s: TECHNICALS.rsi14 < 70 },
                { l: "TREND", v: TECHNICALS.trend, s: TECHNICALS.trend === "Uptrend" },
                { l: "MACD", v: TECHNICALS.macdSignal, s: TECHNICALS.macdSignal.includes("Bullish") },
              ].map((t, i) => (
                <div key={t.l} className="flex items-center justify-between py-0.5" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                  <span className="text-[10px]" style={{ color: DIM }}>{t.l}</span>
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: t.s ? GREEN : RED2 }}>{t.v}</span>
                </div>
              ))}
            </MicroCard>

            <MicroCard head="ESG Record">
              <div className="grid grid-cols-4 gap-0 border mb-3" style={{ borderColor: VDIM }}>
                {[
                  { l: "TOTAL", v: ESG.rating },
                  { l: "ENV", v: ESG.environmentScore },
                  { l: "SOC", v: ESG.socialScore },
                  { l: "GOV", v: ESG.governanceScore },
                ].map((s, i) => (
                  <div key={s.l} className="text-center py-1.5" style={{ borderRight: i < 3 ? `1px solid ${VDIM}` : "none" }}>
                    <div className="text-[7px] tracking-wider" style={{ color: DIM }}>{s.l}</div>
                    <div className="text-[12px] font-bold" style={{ color: CYAN }}>{s.v}</div>
                  </div>
                ))}
              </div>
              {ESG.highlights.map((h, i) => (
                <p key={i} className="text-[10px] leading-relaxed mb-1" style={{ color: DIM }}>▸ {h}</p>
              ))}
            </MicroCard>
          </div>
        </div>

        {/* ── Full-width: Earnings ── */}
        <MicroSection title="Earnings History" id="SEC-06" />
        <MicroCard>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  {["QUARTER", "DATE", "EPS EST", "EPS ACT", "REVENUE", "GROWTH", "SURPRISE"].map((h) => (
                    <th key={h} className={`py-1 px-2 text-[7px] tracking-wider ${h === "QUARTER" || h === "DATE" ? "text-left" : "text-right"}`} style={{ color: AMBER, borderBottom: `1px solid ${CYAN}40` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((e) => (
                  <tr key={e.quarter} style={{ borderTop: `1px solid ${VDIM}` }}>
                    <td className="py-1 px-2 font-bold" style={{ color: CYAN }}>{e.quarter}</td>
                    <td className="py-1 px-2" style={{ color: DIM }}>{e.date}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ color: DIM }}>{usd(e.epsEst)}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-bold" style={{ color: e.epsActual >= e.epsEst ? GREEN : RED2 }}>{usd(e.epsActual)}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ color: WHITE }}>{e.revenue}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ color: nClr(e.revenueGrowth) }}>{pct(e.revenueGrowth)}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-bold" style={{ color: e.surprise.startsWith("+") ? GREEN : RED2 }}>{e.surprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MicroCard>

        {/* Financial Statements */}
        <MicroSection title="Financial Statements" id="SEC-07" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            { title: "Income Statement", data: INCOME_STATEMENT, hasYoy: true },
            { title: "Balance Sheet", data: BALANCE_SHEET, hasYoy: false },
            { title: "Cash Flow", data: CASH_FLOW, hasYoy: true },
          ].map((section) => (
            <MicroCard key={section.title} head={section.title}>
              {section.data.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between py-0.5 text-[10px]" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                  <span style={{ color: DIM }}>{row.label}</span>
                  <span>
                    <span className="font-bold tabular-nums" style={{ color: row.value.startsWith("-") ? RED2 : CYAN }}>{row.value}</span>
                    {section.hasYoy && typeof (row as unknown as { yoy?: string }).yoy === "string" && (
                      <span className="text-[9px] ml-1 tabular-nums" style={{ color: (row as unknown as { yoy: string }).yoy.startsWith("+") ? GREEN : (row as unknown as { yoy: string }).yoy.startsWith("−") ? RED2 : DIM }}>{(row as unknown as { yoy: string }).yoy}</span>
                    )}
                  </span>
                </div>
              ))}
            </MicroCard>
          ))}
        </div>

        {/* Competitors */}
        <MicroSection title="Peer Comparison" id="SEC-08" />
        <MicroCard>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  {["COMPANY", "MKT CAP", "P/E", "REVENUE", "MARGIN", "GROWTH"].map((h) => (
                    <th key={h} className={`py-1 px-2 text-[7px] tracking-wider ${h === "COMPANY" ? "text-left" : "text-right"}`} style={{ color: AMBER, borderBottom: `1px solid ${CYAN}40` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c) => (
                  <tr key={c.ticker} style={{ borderTop: `1px solid ${VDIM}` }}>
                    <td className="py-1 px-2"><span className="font-bold" style={{ color: CYAN }}>{c.ticker}</span> <span style={{ color: DIM }}>{c.name}</span></td>
                    <td className="py-1 px-2 text-right tabular-nums">{c.marketCap}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ color: DIM }}>{c.pe}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{c.revenue}</td>
                    <td className="py-1 px-2 text-right tabular-nums" style={{ color: DIM }}>{c.margin}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-bold" style={{ color: c.growth.startsWith("+") ? GREEN : RED2 }}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MicroCard>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <MicroCard head="Watchlist">
            {WATCHLIST.map((w, i) => (
              <div key={w.ticker} className="flex items-center justify-between py-0.5" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                <span className="text-[10px] font-bold" style={{ color: CYAN }}>{w.ticker}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tabular-nums font-bold">{usd(w.price)}</span>
                  <span className="text-[9px] tabular-nums" style={{ color: nClr(w.change) }}>{pct(w.change)}</span>
                </div>
              </div>
            ))}
          </MicroCard>
          <MicroCard head="News Feed">
            {NEWS.map((n, i) => (
              <div key={i} className="py-1" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                <span className="text-[8px] font-bold mr-1" style={{ color: AMBER }}>{n.time}</span>
                <span className="text-[10px]" style={{ color: DIM }}>{n.headline}</span>
              </div>
            ))}
          </MicroCard>
          <MicroCard head="Sector Performance">
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-0.5" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                <span className="text-[10px]" style={{ color: DIM }}>{s.label}</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: s.value.startsWith("+") ? GREEN : RED2 }}>{s.value}</span>
              </div>
            ))}
          </MicroCard>
        </div>

        {/* Valuation + Dividends + Holders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <MicroCard head="Valuation">
            {VALUATION_RATIOS.map((r, i) => (
              <div key={r.label} className="flex justify-between py-0.5" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                <span className="text-[10px]" style={{ color: DIM }}>{r.label}</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: CYAN }}>{r.value}</span>
              </div>
            ))}
          </MicroCard>
          <MicroCard head="Dividends">
            {DIVIDEND_HISTORY.map((d, i) => (
              <div key={d.year} className="flex items-center justify-between py-0.5" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                <span className="text-[10px] font-bold" style={{ color: CYAN }}>{d.year}</span>
                <div className="flex items-center gap-2 text-[10px] tabular-nums">
                  <span className="font-bold">{d.annual}</span>
                  <span style={{ color: DIM }}>{d.yield}</span>
                  <span style={{ color: GREEN }}>{d.growth}</span>
                </div>
              </div>
            ))}
          </MicroCard>
          <MicroCard head="Top Holders">
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className="flex items-center justify-between py-0.5" style={{ borderTop: i > 0 ? `1px solid ${VDIM}` : "none" }}>
                <span className="text-[10px] truncate mr-2" style={{ color: DIM }}>{h.name}</span>
                <span className="text-[10px] font-bold tabular-nums whitespace-nowrap" style={{ color: CYAN }}>{h.pct}</span>
              </div>
            ))}
          </MicroCard>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-6 border-t" style={{ borderColor: VDIM }}>
        <div className="mx-auto max-w-5xl px-4 py-3 text-center text-[8px] tracking-wider" style={{ color: VDIM }}>
          ZERO SUM — 12-J: MICROFICHE ARCHIVE · END OF REEL · SAMPLE DATA ONLY · © 2026
        </div>
      </footer>
    </div>
  );
}
