"use client";

import Link from "next/link";
import {
  STOCK,
  COMPANY_DESCRIPTION,
  COMPANY_BRIEF,
  SEGMENTS,
  AI_ANALYSIS,
  BULL_CASE,
  BEAR_CASE,
  ANALYSTS,
  ANALYST_CONSENSUS,
  ANALYST_COMMENTARY,
  EARNINGS,
  INCOME_STATEMENT as INCOME,
  BALANCE_SHEET as BALANCE,
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
   Style 01 — Bloomberg Terminal (Dark Pro)
   Dense, monospaced, neon-on-black. Maximum data per pixel.
   ══════════════════════════════════════════════════════════════ */

/* Bloomberg-specific color helpers (neon on black) */
const bClr = (n: number) => (n >= 0 ? "text-[#00ff00]" : "text-[#ff3333]");

/* ─── Fake sparkline SVG ─── */
function Sparkline({ positive }: { positive: boolean }) {
  const points = positive
    ? "0,20 8,18 16,22 24,15 32,17 40,12 48,14 56,10 64,8 72,11 80,6 88,4 96,7 104,3 112,5"
    : "0,5 8,8 16,4 24,10 32,7 40,13 48,11 56,15 64,18 72,14 80,19 88,22 96,17 104,20 112,23";
  return (
    <svg width="112" height="26" viewBox="0 0 112 26" className="inline-block align-middle">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#00ff00" : "#ff3333"}
        strokeWidth="1.5"
      />
    </svg>
  );
}

/* ─── Mini bar chart for earnings ─── */
function EarningsBar({ est, actual }: { est: number; actual: number }) {
  const max = Math.max(est, actual) * 1.2;
  const estH = (est / max) * 32;
  const actH = (actual / max) * 32;
  return (
    <svg width="24" height="32" className="inline-block align-middle">
      <rect x="2" y={32 - estH} width="8" height={estH} fill="#666" />
      <rect x="14" y={32 - actH} width="8" height={actH} fill={actual >= est ? "#00ff00" : "#ff3333"} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════════════════ */
export default function BloombergPrototype() {
  return (
    <div className="min-h-screen bg-black text-[#ff8c00] font-mono text-xs selection:bg-[#ff8c00] selection:text-black">

      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between border-b border-[#222] px-2 py-1">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-[#00ccff] hover:text-[#00ff00] transition-colors text-[10px] uppercase tracking-widest"
          >
            ← ZERO SUM
          </Link>
          <span className="text-[#333]">│</span>
          <span className="text-[#00ccff] font-bold tracking-widest text-sm">BLOOMBERG TERMINAL</span>
          <span className="text-[#333]">│</span>
          <span className="text-[#666] text-[10px] uppercase tracking-widest">Style 01 Prototype</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[#666] uppercase tracking-wider">
          <span>MARKET: <span className="text-[#00ff00]">OPEN</span></span>
          <span>NYC 14:32 EST</span>
          <span>LDN 19:32 GMT</span>
          <span>TKY 04:32 JST</span>
        </div>
      </header>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-[260px_1fr_280px] gap-px bg-[#111] min-h-[calc(100vh-32px)]">

        {/* ══ LEFT PANEL — Watchlist ══ */}
        <aside className="bg-black border-r border-[#222] flex flex-col">
          <div className="border-b border-[#222] px-2 py-1.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Watchlist</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {WATCHLIST.map((w) => (
              <div
                key={w.ticker}
                className="flex items-center justify-between px-2 py-1 border-b border-[#111] hover:bg-[#0a0a0a] cursor-pointer transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-[#ff8c00] font-bold">{w.ticker}</span>
                  <span className="text-[10px] text-[#444]">{w.volume}</span>
                </div>
                <div className="text-right">
                  <div className="tabular-nums">{usd(w.price)}</div>
                  <div className={`text-[10px] tabular-nums ${bClr(w.change)}`}>{pct(w.change)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* News feed in sidebar */}
          <div className="border-t border-[#222]">
            <div className="px-2 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">News Wire</span>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {NEWS.map((n, i) => (
                <div key={i} className="px-2 py-1.5 border-b border-[#111] hover:bg-[#0a0a0a] cursor-pointer">
                  <span className="text-[#00ccff] mr-1.5">{n.time}</span>
                  <span className="text-[#999]">{n.headline}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ══ CENTER — Main Content ══ */}
        <main className="bg-black flex flex-col overflow-y-auto">

          {/* ── Ticker Header ── */}
          <div className="flex items-end gap-6 border-b border-[#222] px-3 py-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#00ccff] tracking-wider">{STOCK.ticker}</span>
                <span className="text-[#666] text-[10px] uppercase">{STOCK.exchange}</span>
              </div>
              <span className="text-[#555] text-[11px]">{STOCK.name} — {STOCK.sector} / {STOCK.industry}</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold tabular-nums text-[#ff8c00]">{usd(STOCK.price)}</span>
              <span className={`text-lg tabular-nums font-bold ${bClr(STOCK.change)}`}>
                {STOCK.change >= 0 ? "▲" : "▼"} {Math.abs(STOCK.change).toFixed(2)}
              </span>
              <span className={`text-lg tabular-nums ${bClr(STOCK.changePct)}`}>
                ({pct(STOCK.changePct)})
              </span>
            </div>
            <div className="ml-auto">
              <Sparkline positive={STOCK.change >= 0} />
            </div>
          </div>

          {/* ── Chart Placeholder ── */}
          <div className="border-b border-[#222] px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Intraday Chart</span>
              <div className="flex gap-1">
                {["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"].map((p) => (
                  <button
                    key={p}
                    className={`px-1.5 py-0.5 text-[10px] rounded ${
                      p === "1Y" ? "bg-[#ff8c00] text-black font-bold" : "text-[#555] hover:text-[#ff8c00]"
                    } transition-colors`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56 bg-[#050505] border border-[#222] rounded-sm flex items-center justify-center relative overflow-hidden">
              {/* Fake chart grid */}
              <div className="absolute inset-0 opacity-20">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={`h-${i}`} className="absolute w-full border-t border-[#222]" style={{ top: `${(i + 1) * 12.5}%` }} />
                ))}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={`v-${i}`} className="absolute h-full border-l border-[#222]" style={{ left: `${(i + 1) * 8.33}%` }} />
                ))}
              </div>
              {/* Fake price line */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 160">
                <polyline
                  points="0,120 20,115 40,118 60,105 80,110 100,95 120,100 140,88 160,92 180,80 200,85 220,72 240,78 260,65 280,70 300,58 320,62 340,50 360,45 380,48 400,42"
                  fill="none"
                  stroke="#ff8c00"
                  strokeWidth="2"
                />
                <polyline
                  points="0,120 20,115 40,118 60,105 80,110 100,95 120,100 140,88 160,92 180,80 200,85 220,72 240,78 260,65 280,70 300,58 320,62 340,50 360,45 380,48 400,42 400,160 0,160"
                  fill="url(#grad)"
                  opacity="0.15"
                />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff8c00" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Y-axis labels */}
              <div className="absolute right-1 inset-y-0 flex flex-col justify-between py-2 text-[9px] text-[#444] tabular-nums">
                <span>$200</span>
                <span>$190</span>
                <span>$180</span>
                <span>$170</span>
                <span>$160</span>
                <span>$150</span>
              </div>
            </div>
          </div>

          {/* ── Key Stats Grid ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Key Statistics</span>
            </div>
            <div className="grid grid-cols-4 gap-px bg-[#111]">
              {[
                { label: "MARKET CAP", value: fmt(STOCK.marketCap), color: "" },
                { label: "P/E RATIO", value: STOCK.pe.toFixed(1), color: "" },
                { label: "EPS (TTM)", value: usd(STOCK.eps), color: "" },
                { label: "BETA", value: STOCK.beta.toFixed(2), color: "" },
                { label: "DIV YIELD", value: `${STOCK.dividendYield.toFixed(2)}%`, color: "" },
                { label: "52W HIGH", value: usd(STOCK.week52High), color: "text-[#00ff00]" },
                { label: "52W LOW", value: usd(STOCK.week52Low), color: "text-[#ff3333]" },
                { label: "AVG VOLUME", value: fmt(STOCK.avgVolume), color: "" },
                { label: "OPEN", value: usd(STOCK.open), color: "" },
                { label: "HIGH", value: usd(STOCK.high), color: "text-[#00ff00]" },
                { label: "LOW", value: usd(STOCK.low), color: "text-[#ff3333]" },
                { label: "VOLUME", value: fmt(STOCK.volume), color: STOCK.volume > STOCK.avgVolume ? "text-[#ffff00]" : "" },
                { label: "PREV CLOSE", value: usd(STOCK.prevClose), color: "" },
                { label: "SHARES OUT", value: fmt(STOCK.sharesOut), color: "" },
                { label: "DIVIDEND", value: usd(STOCK.dividend), color: "" },
                { label: "DAY CHANGE", value: pct(STOCK.changePct), color: bClr(STOCK.changePct) },
              ].map((s) => (
                <div key={s.label} className="bg-black px-2 py-1.5">
                  <div className="text-[9px] uppercase tracking-[0.15em] text-[#444] mb-0.5">{s.label}</div>
                  <div className={`text-sm tabular-nums font-bold ${s.color || "text-[#ff8c00]"}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Income Statement + Balance Sheet side by side ── */}
          <div className="grid grid-cols-2 gap-px bg-[#111] border-b border-[#222]">
            {/* Income Statement */}
            <div className="bg-black">
              <div className="px-3 py-1.5 border-b border-[#222]">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Income Statement (TTM)</span>
              </div>
              <div>
                {INCOME.map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex justify-between px-3 py-1 ${
                      i % 2 === 0 ? "bg-black" : "bg-[#060606]"
                    } hover:bg-[#0f0f0f] transition-colors`}
                  >
                    <span className="text-[#888]">{row.label}</span>
                    <span className="tabular-nums text-[#ff8c00] font-bold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Balance Sheet */}
            <div className="bg-black">
              <div className="px-3 py-1.5 border-b border-[#222]">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Balance Sheet</span>
              </div>
              <div>
                {BALANCE.map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex justify-between px-3 py-1 ${
                      i % 2 === 0 ? "bg-black" : "bg-[#060606]"
                    } hover:bg-[#0f0f0f] transition-colors`}
                  >
                    <span className="text-[#888]">{row.label}</span>
                    <span className={`tabular-nums font-bold ${row.value.startsWith("-") ? "text-[#ff3333]" : "text-[#ff8c00]"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Earnings Table ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Earnings History</span>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[#555] uppercase tracking-wider text-[9px] border-b border-[#222]">
                  <th className="text-left px-3 py-1.5 font-normal">Quarter</th>
                  <th className="text-left px-3 py-1.5 font-normal">Date</th>
                  <th className="text-right px-3 py-1.5 font-normal">EPS Est</th>
                  <th className="text-right px-3 py-1.5 font-normal">EPS Act</th>
                  <th className="text-right px-3 py-1.5 font-normal">Revenue</th>
                  <th className="text-right px-3 py-1.5 font-normal">Surprise</th>
                  <th className="text-center px-3 py-1.5 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((e, i) => (
                  <tr
                    key={e.quarter}
                    className={`border-b border-[#111] hover:bg-[#0f0f0f] transition-colors ${
                      i % 2 === 0 ? "" : "bg-[#060606]"
                    }`}
                  >
                    <td className="px-3 py-1 text-[#00ccff] font-bold">{e.quarter}</td>
                    <td className="px-3 py-1 text-[#666]">{e.date}</td>
                    <td className="px-3 py-1 text-right tabular-nums text-[#888]">{usd(e.epsEst)}</td>
                    <td className={`px-3 py-1 text-right tabular-nums font-bold ${bClr(e.epsActual - e.epsEst)}`}>
                      {usd(e.epsActual)}
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums text-[#ff8c00]">{e.revenue}</td>
                    <td className={`px-3 py-1 text-right tabular-nums font-bold ${e.surprise.startsWith("+") ? "text-[#00ff00]" : "text-[#ff3333]"}`}>
                      {e.surprise}
                    </td>
                    <td className="px-3 py-1 text-center">
                      <EarningsBar est={e.epsEst} actual={e.epsActual} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Company Description ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Company Profile</span>
            </div>
            <div className="px-3 py-2 text-[11px] leading-relaxed text-[#999]">
              {COMPANY_BRIEF}
            </div>
            <div className="px-3 pb-2 flex flex-wrap gap-x-6 gap-y-1 text-[10px]">
              <span><span className="text-[#555]">CEO:</span> <span className="text-[#ff8c00]">{STOCK.ceo}</span></span>
              <span><span className="text-[#555]">HQ:</span> <span className="text-[#ff8c00]">{STOCK.headquarters}</span></span>
              <span><span className="text-[#555]">EMPLOYEES:</span> <span className="text-[#ff8c00]">{STOCK.employees.toLocaleString()}</span></span>
              <span><span className="text-[#555]">FOUNDED:</span> <span className="text-[#ff8c00]">{STOCK.founded}</span></span>
              <span><span className="text-[#555]">IPO:</span> <span className="text-[#ff8c00]">{STOCK.ipoDate}</span></span>
              <span><span className="text-[#555]">FY END:</span> <span className="text-[#ff8c00]">{STOCK.fiscalYearEnd}</span></span>
            </div>
          </div>

          {/* ── Revenue Segments ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Business Segments</span>
            </div>
            {SEGMENTS.map((seg, i) => (
              <div key={seg.name} className={`px-3 py-1.5 ${i % 2 === 0 ? "bg-black" : "bg-[#060606]"} hover:bg-[#0f0f0f] transition-colors`}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[#00ccff] font-bold text-[11px]">{seg.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-[#ff8c00] text-[11px] font-bold">{seg.revenue}</span>
                    <span className="tabular-nums text-[#666] text-[10px]">{seg.pct}%</span>
                  </div>
                </div>
                <div className="relative h-1 bg-[#222] rounded-sm mb-1">
                  <div className="absolute h-full bg-[#ff8c00]/60 rounded-sm" style={{ width: `${seg.pct * 2}%` }} />
                </div>
                <p className="text-[10px] text-[#555] leading-relaxed">{seg.description}</p>
              </div>
            ))}
          </div>

          {/* ── AI Analysis ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">AI Analysis Summary</span>
            </div>
            <div className="px-3 py-2">
              <div className="text-[11px] leading-relaxed text-[#bbb] whitespace-pre-line">{AI_ANALYSIS.summary}</div>
              <div className="mt-3 border-t border-[#222] pt-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Outlook</span>
                <div className="text-[11px] leading-relaxed text-[#999] mt-1 whitespace-pre-line">{AI_ANALYSIS.outlook}</div>
              </div>
            </div>
          </div>

          {/* ── Bull / Bear Case ── */}
          <div className="grid grid-cols-2 gap-px bg-[#111] border-b border-[#222]">
            {/* Bull */}
            <div className="bg-black">
              <div className="px-3 py-1.5 border-b border-[#222] flex items-center gap-2">
                <span className="text-[#00ff00] text-sm">▲</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#00ff00]">Bull Case — {usd(BULL_CASE.targetPrice)}</span>
              </div>
              <div className="px-3 py-2 text-[11px] leading-relaxed text-[#999] whitespace-pre-line">{BULL_CASE.thesis}</div>
              <div className="px-3 pb-2 grid grid-cols-2 gap-1">
                {BULL_CASE.keyMetrics.map((m) => (
                  <div key={m.label} className="flex justify-between text-[10px]">
                    <span className="text-[#555]">{m.label}</span>
                    <span className="text-[#00ff00] font-bold tabular-nums">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Bear */}
            <div className="bg-black">
              <div className="px-3 py-1.5 border-b border-[#222] flex items-center gap-2">
                <span className="text-[#ff3333] text-sm">▼</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#ff3333]">Bear Case — {usd(BEAR_CASE.targetPrice)}</span>
              </div>
              <div className="px-3 py-2 text-[11px] leading-relaxed text-[#999] whitespace-pre-line">{BEAR_CASE.thesis}</div>
              <div className="px-3 pb-2 grid grid-cols-2 gap-1">
                {BEAR_CASE.keyMetrics.map((m) => (
                  <div key={m.label} className="flex justify-between text-[10px]">
                    <span className="text-[#555]">{m.label}</span>
                    <span className="text-[#ff3333] font-bold tabular-nums">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Analyst Commentary ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Analyst Commentary</span>
            </div>
            {ANALYST_COMMENTARY.map((c, i) => (
              <div key={i} className={`px-3 py-2 ${i > 0 ? "border-t border-[#111]" : ""} hover:bg-[#060606] transition-colors`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#00ccff] font-bold text-[11px]">{c.title}</span>
                  <span className="text-[9px] text-[#555]">{c.date}</span>
                </div>
                <div className="text-[10px] text-[#666] mb-1">{c.firm} — {c.analyst}</div>
                <div className="text-[11px] leading-relaxed text-[#999]">{c.snippet}</div>
              </div>
            ))}
          </div>

          {/* ── Cash Flow Statement ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Cash Flow Statement</span>
            </div>
            {CASH_FLOW.map((row, i) => (
              <div key={row.label} className={`flex justify-between px-3 py-1 ${i % 2 === 0 ? "bg-black" : "bg-[#060606]"} hover:bg-[#0f0f0f] transition-colors`}>
                <span className="text-[#888] text-[11px]">{row.label}</span>
                <div className="flex items-center gap-3">
                  <span className={`tabular-nums text-[11px] font-bold ${row.value.startsWith("-") ? "text-[#ff3333]" : "text-[#ff8c00]"}`}>{row.value}</span>
                  {row.yoy && <span className="text-[9px] text-[#555] tabular-nums">{row.yoy}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* ── Key Risks ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Key Risks</span>
            </div>
            {KEY_RISKS.map((r, i) => (
              <div key={i} className={`px-3 py-2 ${i > 0 ? "border-t border-[#111]" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#ff8c00] font-bold text-[11px]">{r.title}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                    r.severity === "High" ? "bg-[#ff3333]/20 text-[#ff3333]" :
                    r.severity === "Medium" ? "bg-[#ffff00]/15 text-[#ffff00]" :
                    "bg-[#666]/20 text-[#888]"
                  }`}>{r.severity.toUpperCase()}</span>
                </div>
                <p className="text-[10px] leading-relaxed text-[#888]">{r.description}</p>
              </div>
            ))}
          </div>

          {/* ── Catalysts ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Upcoming Catalysts</span>
            </div>
            {CATALYSTS.map((c, i) => (
              <div key={i} className={`px-3 py-2 ${i > 0 ? "border-t border-[#111]" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#00ccff] font-bold text-[11px]">{c.title}</span>
                  <span className="text-[9px] text-[#555] font-bold">{c.timeline}</span>
                </div>
                <p className="text-[10px] leading-relaxed text-[#888]">{c.description}</p>
              </div>
            ))}
          </div>

          {/* ── Competitive Landscape ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Competitive Landscape</span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[#555] uppercase tracking-wider text-[8px] border-b border-[#222]">
                  <th className="text-left px-2 py-1 font-normal">Ticker</th>
                  <th className="text-right px-2 py-1 font-normal">Mkt Cap</th>
                  <th className="text-right px-2 py-1 font-normal">P/E</th>
                  <th className="text-right px-2 py-1 font-normal">Margin</th>
                  <th className="text-right px-2 py-1 font-normal">Growth</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr key={c.ticker} className={`border-b border-[#111] ${i % 2 ? "bg-[#060606]" : ""} hover:bg-[#0f0f0f] transition-colors`}>
                    <td className="px-2 py-1 text-[#00ccff] font-bold">{c.ticker}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-[#ff8c00]">{c.marketCap}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-[#888]">{c.pe}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-[#888]">{c.margin}</td>
                    <td className={`px-2 py-1 text-right tabular-nums font-bold ${c.growth.startsWith("+") ? "text-[#00ff00]" : "text-[#ff3333]"}`}>{c.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Top Holders ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Top Institutional Holders</span>
            </div>
            {TOP_HOLDERS.map((h, i) => (
              <div key={h.name} className={`flex justify-between px-3 py-1 text-[11px] ${i % 2 === 0 ? "" : "bg-[#060606]"}`}>
                <span className="text-[#888]">{h.name}</span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-[#ff8c00] font-bold">{h.pct}</span>
                  <span className="tabular-nums text-[#555] w-16 text-right">{h.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Dividend History ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Dividend History</span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[#555] uppercase tracking-wider text-[8px] border-b border-[#222]">
                  <th className="text-left px-3 py-1 font-normal">Year</th>
                  <th className="text-right px-3 py-1 font-normal">Annual</th>
                  <th className="text-right px-3 py-1 font-normal">Yield</th>
                  <th className="text-right px-3 py-1 font-normal">Growth</th>
                </tr>
              </thead>
              <tbody>
                {DIVIDEND_HISTORY.map((d, i) => (
                  <tr key={d.year} className={`border-b border-[#111] ${i % 2 ? "bg-[#060606]" : ""}`}>
                    <td className="px-3 py-1 text-[#00ccff]">{d.year}</td>
                    <td className="px-3 py-1 text-right tabular-nums text-[#ff8c00] font-bold">{d.annual}</td>
                    <td className="px-3 py-1 text-right tabular-nums text-[#888]">{d.yield}</td>
                    <td className="px-3 py-1 text-right tabular-nums text-[#00ff00]">{d.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── ESG Summary ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">ESG Rating — {ESG.provider}</span>
            </div>
            <div className="px-3 py-2">
              <div className="flex items-center gap-4 mb-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#00ff00]">{ESG.rating}</div>
                  <div className="text-[8px] text-[#555] uppercase">Overall</div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-sm font-bold text-[#ff8c00]">{ESG.environmentScore}</div>
                    <div className="text-[8px] text-[#555] uppercase">Env</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-[#ff8c00]">{ESG.socialScore}</div>
                    <div className="text-[8px] text-[#555] uppercase">Social</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-[#ff8c00]">{ESG.governanceScore}</div>
                    <div className="text-[8px] text-[#555] uppercase">Gov</div>
                  </div>
                </div>
              </div>
              {ESG.highlights.map((h, i) => (
                <div key={i} className="text-[10px] text-[#888] leading-relaxed mb-1">
                  <span className="text-[#555]">•</span> {h}
                </div>
              ))}
            </div>
          </div>

          {/* ── Technical Levels ── */}
          <div className="border-b border-[#222]">
            <div className="px-3 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Technical Indicators</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#111]">
              {[
                { label: "SMA 20", value: usd(TECHNICALS.sma20), color: STOCK.price > TECHNICALS.sma20 ? "text-[#00ff00]" : "text-[#ff3333]" },
                { label: "SMA 50", value: usd(TECHNICALS.sma50), color: STOCK.price > TECHNICALS.sma50 ? "text-[#00ff00]" : "text-[#ff3333]" },
                { label: "SMA 200", value: usd(TECHNICALS.sma200), color: STOCK.price > TECHNICALS.sma200 ? "text-[#00ff00]" : "text-[#ff3333]" },
                { label: "RSI 14", value: TECHNICALS.rsi14.toString(), color: TECHNICALS.rsi14 > 70 ? "text-[#ff3333]" : TECHNICALS.rsi14 < 30 ? "text-[#00ff00]" : "text-[#ff8c00]" },
                { label: "SUPPORT 1", value: usd(TECHNICALS.support1), color: "text-[#00ff00]" },
                { label: "RESISTANCE 1", value: usd(TECHNICALS.resistance1), color: "text-[#ff3333]" },
                { label: "TREND", value: TECHNICALS.trend.toUpperCase(), color: TECHNICALS.trend === "Uptrend" ? "text-[#00ff00]" : "text-[#ff3333]" },
                { label: "MACD", value: TECHNICALS.macdSignal, color: TECHNICALS.macdSignal.includes("Bullish") ? "text-[#00ff00]" : "text-[#ff3333]" },
              ].map((t) => (
                <div key={t.label} className="bg-black px-2 py-1">
                  <div className="text-[8px] uppercase tracking-[0.15em] text-[#444]">{t.label}</div>
                  <div className={`text-[11px] tabular-nums font-bold ${t.color}`}>{t.value}</div>
                </div>
              ))}
            </div>
          </div>

        </main>

        {/* ══ RIGHT PANEL — Analyst Ratings + Details ══ */}
        <aside className="bg-black border-l border-[#222] flex flex-col overflow-y-auto">

          {/* Day Range Bar */}
          <div className="border-b border-[#222] px-2 py-2">
            <div className="text-[9px] uppercase tracking-[0.15em] text-[#444] mb-1">Day Range</div>
            <div className="relative h-2 bg-[#222] rounded-sm">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff3333] via-[#ff8c00] to-[#00ff00] rounded-sm"
                style={{
                  left: `${((STOCK.low - STOCK.week52Low) / (STOCK.week52High - STOCK.week52Low)) * 100}%`,
                  width: `${((STOCK.high - STOCK.low) / (STOCK.week52High - STOCK.week52Low)) * 100}%`,
                }}
              />
              <div
                className="absolute top-[-3px] w-0.5 h-[14px] bg-white"
                style={{
                  left: `${((STOCK.price - STOCK.week52Low) / (STOCK.week52High - STOCK.week52Low)) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] tabular-nums text-[#555] mt-1">
              <span>{usd(STOCK.week52Low)}</span>
              <span>{usd(STOCK.week52High)}</span>
            </div>
          </div>

          {/* 52-Week Range */}
          <div className="border-b border-[#222] px-2 py-2">
            <div className="text-[9px] uppercase tracking-[0.15em] text-[#444] mb-1">52-Week Range</div>
            <div className="relative h-2 bg-[#222] rounded-sm">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff3333] via-[#ff8c00] to-[#00ff00] rounded-sm w-full" />
              <div
                className="absolute top-[-3px] w-0.5 h-[14px] bg-white"
                style={{
                  left: `${((STOCK.price - STOCK.week52Low) / (STOCK.week52High - STOCK.week52Low)) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] tabular-nums text-[#555] mt-1">
              <span>{usd(STOCK.week52Low)}</span>
              <span>{usd(STOCK.week52High)}</span>
            </div>
          </div>

          {/* Analyst Ratings */}
          <div className="border-b border-[#222]">
            <div className="px-2 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Analyst Ratings</span>
            </div>

            {/* Rating summary */}
            <div className="px-2 py-2 flex items-center gap-3 border-b border-[#111]">
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-[#444] uppercase">Consensus</span>
                <span className="text-[#00ff00] font-bold text-sm">BUY</span>
              </div>
              <div className="flex-1">
                <div className="flex gap-px h-3">
                  <div className="bg-[#00ff00] flex-[5] rounded-l-sm" title="Buy" />
                  <div className="bg-[#00ff00]/50 flex-[3]" title="Overweight" />
                  <div className="bg-[#666] flex-[1]" title="Neutral" />
                  <div className="bg-[#ff3333]/50 flex-[0.5] rounded-r-sm" title="Sell" />
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-[#444] uppercase">Avg Target</span>
                <div className="text-[#00ccff] font-bold tabular-nums">{usd(199.88)}</div>
              </div>
            </div>

            {/* Individual ratings */}
            <div>
              {ANALYSTS.map((a, i) => (
                <div
                  key={a.firm}
                  className={`flex items-center justify-between px-2 py-1 ${
                    i % 2 === 0 ? "" : "bg-[#060606]"
                  } hover:bg-[#0f0f0f] transition-colors`}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#888]">{a.firm}</span>
                    <span className="text-[8px] text-[#555]">{a.analyst}</span>
                    <span className={`text-[10px] font-bold ${
                      a.rating.includes("Buy") || a.rating.includes("Overweight")
                        ? "text-[#00ff00]"
                        : a.rating.includes("Sell") || a.rating.includes("Underweight")
                        ? "text-[#ff3333]"
                        : "text-[#888]"
                    }`}>{a.rating}</span>
                  </div>
                  <div className="text-right">
                    <span className="tabular-nums text-[#ff8c00] block">{usd(a.target)}</span>
                    <span className="text-[8px] text-[#555] tabular-nums">prior {usd(a.priorTarget)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Ratios */}
          <div className="border-b border-[#222]">
            <div className="px-2 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Valuation Ratios</span>
            </div>
            {VALUATION_RATIOS.map((r, i) => (
              <div
                key={r.label}
                className={`flex justify-between px-2 py-1 text-[11px] ${
                  i % 2 === 0 ? "" : "bg-[#060606]"
                }`}
              >
                <span className="text-[#666]">{r.label}</span>
                <span className="tabular-nums text-[#ff8c00] font-bold">{r.value}</span>
              </div>
            ))}
          </div>

          {/* Sector Performance */}
          <div>
            <div className="px-2 py-1.5 border-b border-[#222]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">Sector Performance</span>
            </div>
            {SECTOR_PERFORMANCE.map((s, i) => (
              <div
                key={s.label}
                className={`flex justify-between px-2 py-1 text-[11px] ${
                  i % 2 === 0 ? "" : "bg-[#060606]"
                }`}
              >
                <span className="text-[#666]">{s.label}</span>
                <span className={`tabular-nums font-bold ${s.value.startsWith("+") ? "text-[#00ff00]" : "text-[#ff3333]"}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ── Bottom Status Bar ── */}
      <footer className="flex items-center justify-between border-t border-[#222] px-2 py-0.5 text-[9px] text-[#444] uppercase tracking-wider">
        <span>ZERO SUM TERMINAL v0.1 — STYLE 01: BLOOMBERG DARK PRO</span>
        <span>DATA IS SAMPLE ONLY — NOT REAL-TIME</span>
        <span>© 2026 ZERO SUM</span>
      </footer>
    </div>
  );
}
