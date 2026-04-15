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
   Style 12-G — Classified Stock Listings (1970s–80s)
   Ultra-dense "stock pages" aesthetic — tiny agate type,
   6-8 columns of condensed data, newsprint grey background.
   Data-maximalist, the experience of scanning newspaper stock
   tables with a magnifying glass.
   ══════════════════════════════════════════════════════════════ */

const NEWS_PRINT = "#e8e4dc";   // newsprint grey
const NP2  = "#ddd8ce";         // darker alt
const INK  = "#1a1a1a";
const GRN  = "#1a5c2a";
const RED  = "#8b1a1a";
const TM   = "#7a7a6a";
const T2   = "#4a4a3a";
const WHT  = "#f5f2ea";

const agate   = "'IBM Plex Mono', 'Courier New', monospace";
const heading = "'Inter', 'Helvetica Neue', system-ui, sans-serif";
const serif   = "'Playfair Display', 'Georgia', serif";
const body    = "'Source Serif Pro', Georgia, serif";

const nClr = (n: number) => (n >= 0 ? GRN : RED);

/* ── Hairline ── */
function Hair() { return <div className="h-px my-1" style={{ background: TM }} />; }

/* ── Section — ultra-compact header ── */
function AgateSection({ title }: { title: string }) {
  return (
    <div className="mt-4 mb-1">
      <div className="h-[2px]" style={{ background: INK }} />
      <h2 className="text-[9px] font-extrabold uppercase tracking-[0.2em] py-1" style={{ fontFamily: heading, color: INK }}>{title}</h2>
      <div className="h-px" style={{ background: TM }} />
    </div>
  );
}

/* ── Dense mini card ── */
function MiniCard({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border px-2 py-1.5 ${className}`} style={{ borderColor: TM, background: WHT }}>
      {title && (
        <div className="text-[7px] font-extrabold uppercase tracking-[0.2em] mb-1 pb-0.5 border-b" style={{ fontFamily: heading, borderColor: TM }}>{title}</div>
      )}
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function ClassifiedListingsPrototype() {
  return (
    <div className="min-h-screen" style={{ background: NEWS_PRINT, color: INK, fontFamily: agate, fontSize: "11px" }}>

      {/* ── MASTHEAD — narrow, dense ── */}
      <header>
        <div className="mx-auto max-w-6xl px-3 pt-2">
          <div className="h-[2px]" style={{ background: INK }} />
          <div className="flex items-center justify-between py-0.5">
            <Link href="/prototype" className="text-[8px] font-bold hover:underline" style={{ color: RED }}>← INDEX</Link>
            <span className="text-[8px]" style={{ color: TM }}>MONDAY, MARCH 3, 2026</span>
          </div>
          <div className="text-center py-1">
            <Link href="/prototype" className="hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold tracking-[0.08em]" style={{ fontFamily: serif }}>ZERO SUM STOCK LISTINGS</h1>
            </Link>
            <p className="text-[7px] uppercase tracking-[0.3em]" style={{ fontFamily: heading, color: TM }}>New York Stock Exchange · NASDAQ · Complete Market Data</p>
          </div>
          <div className="h-[2px]" style={{ background: INK }} />
          <div className="h-px mt-px" style={{ background: INK }} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-2">

        {/* ── FEATURED STOCK — headline treatment ── */}
        <div className="py-2 border-b" style={{ borderColor: INK }}>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold" style={{ fontFamily: serif }}>{STOCK.ticker}</span>
                <span className="text-[8px] font-bold px-1 border" style={{ borderColor: TM, color: TM }}>{STOCK.exchange}</span>
              </div>
              <span className="text-[10px]" style={{ fontFamily: body, color: T2 }}>{STOCK.name}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold tabular-nums">{usd(STOCK.price)}</span>
              <div className="text-sm tabular-nums" style={{ color: nClr(STOCK.change) }}>
                {STOCK.change >= 0 ? "▲" : "▼"} {Math.abs(STOCK.change).toFixed(2)} ({pct(STOCK.changePct)})
              </div>
            </div>
          </div>
        </div>

        {/* ── Data grid — ultra-dense 8-column ── */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-px my-1" style={{ background: TM }}>
          {[
            { l: "OPEN", v: usd(STOCK.open) },
            { l: "HIGH", v: usd(STOCK.high) },
            { l: "LOW", v: usd(STOCK.low) },
            { l: "PREV", v: usd(STOCK.prevClose) },
            { l: "VOL", v: fmt(STOCK.volume) },
            { l: "MCAP", v: fmt(STOCK.marketCap) },
            { l: "P/E", v: STOCK.pe.toFixed(1) },
            { l: "EPS", v: usd(STOCK.eps) },
            { l: "BETA", v: STOCK.beta.toFixed(2) },
            { l: "YLD", v: `${STOCK.dividendYield.toFixed(2)}%` },
            { l: "52H", v: usd(STOCK.week52High) },
            { l: "52L", v: usd(STOCK.week52Low) },
            { l: "FPE", v: STOCK.forwardPe.toFixed(1) },
            { l: "PEG", v: STOCK.peg.toFixed(2) },
            { l: "P/B", v: STOCK.pb.toFixed(1) },
            { l: "SHR%", v: `${STOCK.shortPctFloat}%` },
          ].map((s, i) => (
            <div key={s.l} className="text-center py-1 px-0.5" style={{ background: i % 2 === 0 ? WHT : NEWS_PRINT }}>
              <div className="text-[6px] font-bold uppercase tracking-wider" style={{ fontFamily: heading, color: TM }}>{s.l}</div>
              <div className="text-[10px] font-bold tabular-nums">{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── Chart — minimal ── */}
        <div className="border my-2 p-1" style={{ borderColor: TM, background: WHT }}>
          <div className="text-[7px] font-bold uppercase tracking-wider mb-0.5" style={{ fontFamily: heading, color: TM }}>1YR PRICE</div>
          <svg className="w-full h-24" preserveAspectRatio="none" viewBox="0 0 400 80">
            {[0, 20, 40, 60, 80].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={NP2} strokeWidth="0.5" />
            ))}
            <polyline points="0,70 25,67 50,69 75,58 100,62 125,52 150,55 175,45 200,48 225,38 250,42 275,34 300,36 325,28 350,30 375,24 400,18" fill="none" stroke={INK} strokeWidth="1.5" />
          </svg>
          <div className="flex justify-between text-[7px]" style={{ color: TM }}>
            <span>Mar 2025</span><span>Sep 2025</span><span>Mar 2026</span>
          </div>
        </div>

        {/* ── MASSIVE 6-COLUMN GRID ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px" style={{ background: TM }}>

          {/* Col 1: Company */}
          <MiniCard title="COMPANY">
            <div className="text-[9px] leading-relaxed" style={{ color: T2 }}>{COMPANY_DESCRIPTION.substring(0, 280)}...</div>
            <Hair />
            {[
              { l: "CEO", v: STOCK.ceo },
              { l: "HQ", v: "Cupertino, CA" },
              { l: "EMP", v: fmt(STOCK.employees) },
              { l: "IPO", v: STOCK.ipoDate },
            ].map((item) => (
              <div key={item.l} className="flex justify-between text-[9px]">
                <span style={{ color: TM }}>{item.l}</span>
                <span className="font-bold">{item.v}</span>
              </div>
            ))}
          </MiniCard>

          {/* Col 2: Segments */}
          <MiniCard title="SEGMENTS">
            {SEGMENTS.map((seg) => (
              <div key={seg.name} className="mb-1">
                <div className="flex justify-between text-[9px]">
                  <span className="font-bold">{seg.name}</span>
                  <span style={{ color: T2 }}>{seg.pct}%</span>
                </div>
                <div className="h-px" style={{ background: TM }}>
                  <div className="h-full" style={{ width: `${seg.pct * 2}%`, background: INK }} />
                </div>
              </div>
            ))}
          </MiniCard>

          {/* Col 3: Analysis */}
          <MiniCard title="ANALYSIS">
            <div className="text-[9px] leading-relaxed" style={{ color: T2 }}>{AI_ANALYSIS.summary.substring(0, 300)}...</div>
          </MiniCard>

          {/* Col 4: Consensus */}
          <MiniCard title="CONSENSUS">
            <div className="text-lg font-bold mb-1" style={{ color: GRN }}>{ANALYST_CONSENSUS.rating}</div>
            <div className="flex gap-px h-1 mb-1">
              <div style={{ flex: ANALYST_CONSENSUS.buy, background: GRN }} />
              <div style={{ flex: ANALYST_CONSENSUS.hold, background: TM }} />
              <div style={{ flex: ANALYST_CONSENSUS.sell, background: RED }} />
            </div>
            <div className="text-[8px]" style={{ color: TM }}>B:{ANALYST_CONSENSUS.buy} H:{ANALYST_CONSENSUS.hold} S:{ANALYST_CONSENSUS.sell}</div>
            <Hair />
            <div className="text-[9px]">
              <div>Lo: {usd(ANALYST_CONSENSUS.lowTarget)}</div>
              <div>Avg: <span className="font-bold">{usd(ANALYST_CONSENSUS.avgTarget)}</span></div>
              <div>Hi: {usd(ANALYST_CONSENSUS.highTarget)}</div>
            </div>
          </MiniCard>

          {/* Col 5: Technicals */}
          <MiniCard title="TECHNICALS">
            {[
              { l: "SMA20", v: usd(TECHNICALS.sma20), s: STOCK.price > TECHNICALS.sma20 },
              { l: "SMA50", v: usd(TECHNICALS.sma50), s: STOCK.price > TECHNICALS.sma50 },
              { l: "SMA200", v: usd(TECHNICALS.sma200), s: STOCK.price > TECHNICALS.sma200 },
              { l: "RSI", v: TECHNICALS.rsi14.toFixed(0), s: TECHNICALS.rsi14 < 70 },
              { l: "TREND", v: TECHNICALS.trend === "Uptrend" ? "UP" : "DN", s: TECHNICALS.trend === "Uptrend" },
              { l: "SUP", v: usd(TECHNICALS.support1), s: true },
              { l: "RES", v: usd(TECHNICALS.resistance1), s: false },
            ].map((t) => (
              <div key={t.l} className="flex justify-between text-[9px]">
                <span style={{ color: TM }}>{t.l}</span>
                <span className="font-bold" style={{ color: t.s ? GRN : RED }}>{t.v}</span>
              </div>
            ))}
          </MiniCard>

          {/* Col 6: Valuation */}
          <MiniCard title="VALUATION">
            {VALUATION_RATIOS.map((r) => (
              <div key={r.label} className="flex justify-between text-[9px]">
                <span style={{ color: TM }}>{r.label}</span>
                <span className="font-bold">{r.value}</span>
              </div>
            ))}
          </MiniCard>
        </div>

        {/* ── Analysts — super dense table ── */}
        <AgateSection title="ANALYST RATINGS" />
        <div className="overflow-x-auto" style={{ background: WHT }}>
          <table className="w-full text-[9px]">
            <thead>
              <tr>
                {["FIRM", "ANALYST", "RATING", "TGT", "PRIOR", "DATE"].map((h) => (
                  <th key={h} className="py-0.5 px-1 text-left text-[7px] font-bold uppercase tracking-wider" style={{ fontFamily: heading, color: TM, borderBottom: `1px solid ${INK}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ANALYSTS.map((a, i) => (
                <tr key={a.firm} style={{ background: i % 2 === 0 ? WHT : NEWS_PRINT }}>
                  <td className="py-0.5 px-1 font-bold">{a.firm}</td>
                  <td className="py-0.5 px-1" style={{ color: T2 }}>{a.analyst}</td>
                  <td className="py-0.5 px-1 font-bold" style={{ color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? GRN : a.rating.includes("Sell") || a.rating.includes("Underperform") ? RED : T2 }}>{a.rating}</td>
                  <td className="py-0.5 px-1 tabular-nums font-bold">{usd(a.target)}</td>
                  <td className="py-0.5 px-1 tabular-nums" style={{ color: TM }}>{usd(a.priorTarget)}</td>
                  <td className="py-0.5 px-1 tabular-nums" style={{ color: TM }}>{a.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Earnings — compact table ── */}
        <AgateSection title="EARNINGS HISTORY" />
        <div className="overflow-x-auto" style={{ background: WHT }}>
          <table className="w-full text-[9px]">
            <thead>
              <tr>
                {["QTR", "DATE", "EST", "ACT", "REV", "GRW", "SRPR"].map((h) => (
                  <th key={h} className={`py-0.5 px-1 text-[7px] font-bold uppercase tracking-wider ${h === "QTR" || h === "DATE" ? "text-left" : "text-right"}`} style={{ fontFamily: heading, color: TM, borderBottom: `1px solid ${INK}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EARNINGS.map((e, i) => (
                <tr key={e.quarter} style={{ background: i % 2 === 0 ? WHT : NEWS_PRINT }}>
                  <td className="py-0.5 px-1 font-bold">{e.quarter}</td>
                  <td className="py-0.5 px-1" style={{ color: TM }}>{e.date}</td>
                  <td className="py-0.5 px-1 text-right tabular-nums" style={{ color: TM }}>{usd(e.epsEst)}</td>
                  <td className="py-0.5 px-1 text-right tabular-nums font-bold" style={{ color: e.epsActual >= e.epsEst ? GRN : RED }}>{usd(e.epsActual)}</td>
                  <td className="py-0.5 px-1 text-right tabular-nums">{e.revenue}</td>
                  <td className="py-0.5 px-1 text-right tabular-nums" style={{ color: nClr(e.revenueGrowth) }}>{pct(e.revenueGrowth)}</td>
                  <td className="py-0.5 px-1 text-right tabular-nums font-bold" style={{ color: e.surprise.startsWith("+") ? GRN : RED }}>{e.surprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Financials — 3 dense columns ── */}
        <AgateSection title="FINANCIAL STATEMENTS" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: TM }}>
          {[
            { title: "INCOME STMT", data: INCOME_STATEMENT, hasYoy: true },
            { title: "BALANCE SHEET", data: BALANCE_SHEET, hasYoy: false },
            { title: "CASH FLOW", data: CASH_FLOW, hasYoy: true },
          ].map((section) => (
            <MiniCard key={section.title} title={section.title}>
              {section.data.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between text-[9px]" style={{ borderTop: i > 0 ? `1px solid ${NP2}` : "none" }}>
                  <span style={{ color: T2 }}>{row.label}</span>
                  <span>
                    <span className="font-bold" style={{ color: row.value.startsWith("-") ? RED : INK }}>{row.value}</span>
                    {section.hasYoy && typeof (row as unknown as { yoy?: string }).yoy === "string" && (
                      <span className="ml-1 text-[8px]" style={{ color: (row as unknown as { yoy: string }).yoy.startsWith("+") ? GRN : (row as unknown as { yoy: string }).yoy.startsWith("−") ? RED : TM }}>{(row as unknown as { yoy: string }).yoy}</span>
                    )}
                  </span>
                </div>
              ))}
            </MiniCard>
          ))}
        </div>

        {/* ── Competitors — agate table ── */}
        <AgateSection title="PEER COMPARISON" />
        <div className="overflow-x-auto" style={{ background: WHT }}>
          <table className="w-full text-[9px]">
            <thead>
              <tr>
                {["TKR", "NAME", "MCAP", "PE", "REV", "MRGN", "GRW"].map((h) => (
                  <th key={h} className={`py-0.5 px-1 text-[7px] font-bold uppercase tracking-wider ${h === "TKR" || h === "NAME" ? "text-left" : "text-right"}`} style={{ fontFamily: heading, color: TM, borderBottom: `1px solid ${INK}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c, i) => (
                <tr key={c.ticker} style={{ background: i % 2 === 0 ? WHT : NEWS_PRINT }}>
                  <td className="py-0.5 px-1 font-bold">{c.ticker}</td>
                  <td className="py-0.5 px-1" style={{ color: T2 }}>{c.name}</td>
                  <td className="py-0.5 px-1 text-right tabular-nums">{c.marketCap}</td>
                  <td className="py-0.5 px-1 text-right tabular-nums" style={{ color: T2 }}>{c.pe}</td>
                  <td className="py-0.5 px-1 text-right tabular-nums">{c.revenue}</td>
                  <td className="py-0.5 px-1 text-right tabular-nums" style={{ color: T2 }}>{c.margin}</td>
                  <td className="py-0.5 px-1 text-right tabular-nums font-bold" style={{ color: c.growth.startsWith("+") ? GRN : RED }}>{c.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Bull / Bear side by side ── */}
        <AgateSection title="BULL & BEAR CASES" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: TM }}>
          <MiniCard title="BULL CASE">
            <div className="text-[9px] leading-relaxed mb-1" style={{ color: T2 }}>{BULL_CASE.thesis.substring(0, 300)}...</div>
            <Hair />
            {BULL_CASE.keyMetrics.map((m) => (
              <div key={m.label} className="flex justify-between text-[9px]">
                <span style={{ color: TM }}>{m.label}</span>
                <span className="font-bold" style={{ color: GRN }}>{m.value}</span>
              </div>
            ))}
          </MiniCard>
          <MiniCard title="BEAR CASE">
            <div className="text-[9px] leading-relaxed mb-1" style={{ color: T2 }}>{BEAR_CASE.thesis.substring(0, 300)}...</div>
            <Hair />
            {BEAR_CASE.keyMetrics.map((m) => (
              <div key={m.label} className="flex justify-between text-[9px]">
                <span style={{ color: TM }}>{m.label}</span>
                <span className="font-bold" style={{ color: RED }}>{m.value}</span>
              </div>
            ))}
          </MiniCard>
        </div>

        {/* ── Bottom: Risks + Catalysts + Dividends + Holders + ESG — 5 tiny columns ── */}
        <AgateSection title="RISKS · CATALYSTS · DIVIDENDS · HOLDERS · ESG" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px" style={{ background: TM }}>
          <MiniCard title="RISKS">
            {KEY_RISKS.map((r, i) => (
              <div key={i} className="text-[8px] mb-1">
                <span className="font-bold" style={{ color: r.severity === "High" ? RED : T2 }}>[{r.severity[0]}]</span> {r.title}
              </div>
            ))}
          </MiniCard>
          <MiniCard title="CATALYSTS">
            {CATALYSTS.map((c, i) => (
              <div key={i} className="text-[8px] mb-1">
                <span className="font-bold" style={{ color: GRN }}>{c.timeline}</span> {c.title}
              </div>
            ))}
          </MiniCard>
          <MiniCard title="DIVIDENDS">
            {DIVIDEND_HISTORY.map((d) => (
              <div key={d.year} className="flex justify-between text-[9px]">
                <span className="font-bold">{d.year}</span>
                <span>{d.annual} <span style={{ color: GRN }}>{d.growth}</span></span>
              </div>
            ))}
          </MiniCard>
          <MiniCard title="HOLDERS">
            {TOP_HOLDERS.slice(0, 6).map((h) => (
              <div key={h.name} className="text-[8px]">
                <span className="font-bold">{h.pct}</span> {h.name}
              </div>
            ))}
          </MiniCard>
          <MiniCard title={`ESG (${ESG.provider})`}>
            <div className="text-lg font-bold mb-1" style={{ color: GRN }}>{ESG.rating}</div>
            <div className="text-[9px]">E:{ESG.environmentScore} S:{ESG.socialScore} G:{ESG.governanceScore}</div>
          </MiniCard>
        </div>

        {/* ── WATCHLIST as dense stock ticker board ── */}
        <AgateSection title="MARKET BOARD" />
        <div className="grid grid-cols-4 md:grid-cols-8 gap-px" style={{ background: TM }}>
          {WATCHLIST.map((w) => (
            <div key={w.ticker} className="text-center py-1" style={{ background: WHT }}>
              <div className="text-[9px] font-bold">{w.ticker}</div>
              <div className="text-[10px] font-bold tabular-nums">{usd(w.price)}</div>
              <div className="text-[8px] tabular-nums" style={{ color: nClr(w.change) }}>{w.change >= 0 ? "▲" : "▼"}{pct(w.change)}</div>
            </div>
          ))}
        </div>

        {/* ── News + Sectors ── */}
        <AgateSection title="NEWS & SECTORS" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: TM }}>
          <MiniCard title="HEADLINES">
            {NEWS.map((n, i) => (
              <div key={i} className="text-[9px] py-0.5" style={{ borderTop: i > 0 ? `1px solid ${NP2}` : "none" }}>
                <span className="font-bold" style={{ color: RED }}>{n.time}</span> {n.headline}
              </div>
            ))}
          </MiniCard>
          <MiniCard title="SECTOR PERF">
            {SECTOR_PERFORMANCE.map((s) => (
              <div key={s.label} className="flex justify-between text-[9px]">
                <span style={{ color: T2 }}>{s.label}</span>
                <span className="font-bold" style={{ color: s.value.startsWith("+") ? GRN : RED }}>{s.value}</span>
              </div>
            ))}
          </MiniCard>
        </div>

        {/* Commentary */}
        <AgateSection title="ANALYST COMMENTARY" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: TM }}>
          {ANALYST_COMMENTARY.map((c, i) => (
            <MiniCard key={i} title={c.firm.toUpperCase()}>
              <div className="text-[8px] font-bold mb-0.5">{c.title}</div>
              <div className="text-[8px]" style={{ color: TM }}>{c.analyst} · {c.date}</div>
              <div className="text-[8px] leading-relaxed mt-0.5" style={{ color: T2 }}>{c.snippet.substring(0, 200)}...</div>
            </MiniCard>
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-2" style={{ background: INK }}>
        <div className="mx-auto max-w-6xl px-3 py-2 flex items-center justify-between text-[8px] uppercase tracking-[0.2em]" style={{ fontFamily: heading, color: `${NEWS_PRINT}66` }}>
          <span>Zero Sum — 12-G: Classified Listings</span>
          <span>Sample Data Only</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
