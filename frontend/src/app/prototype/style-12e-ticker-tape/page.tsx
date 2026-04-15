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
   Style 12-E — Wire Service / Ticker Tape (1940s–50s)
   Raw AP/Reuters/UPI teletype aesthetic — monospaced everything,
   ALL-CAPS headlines, dashed-line separators, no decoration.
   Simulates the ribbons and paper tape of the trading floor.
   ══════════════════════════════════════════════════════════════ */

const PAPER = "#f5f0d0";   // yellowed teletype paper
const PAP2  = "#ede7c7";   // slightly darker alt
const INK   = "#2b2b2b";   // typewriter ink
const FLASH = "#cc0000";   // FLASH alert red
const GRN   = "#1a5c2a";   // positive
const TM    = "#7a7560";   // muted
const T2    = "#4a4a3a";   // secondary text

const mono = "'IBM Plex Mono', 'Courier New', Courier, monospace";

const nClr = (n: number) => (n >= 0 ? GRN : FLASH);

/* ── Dashed rule ── */
function Dash() { return <div className="my-3 text-xs select-none" style={{ fontFamily: mono, color: TM }}>- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>; }
function HeavyDash() { return <div className="my-4 text-xs select-none" style={{ fontFamily: mono, color: INK }}>=  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =</div>; }

/* ── Section heading — ALL CAPS with >>> markers ── */
function TapeSection({ title }: { title: string }) {
  return (
    <div className="mt-8 mb-3">
      <div className="text-xs select-none" style={{ fontFamily: mono, color: TM }}>=  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =</div>
      <h2 className="text-sm font-bold uppercase tracking-[0.15em] py-1" style={{ fontFamily: mono, color: INK }}>
        {`>>> ${title} <<<`}
      </h2>
      <div className="text-xs select-none" style={{ fontFamily: mono, color: TM }}>- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
    </div>
  );
}

/* ── Flash alert banner ── */
function Flash({ text }: { text: string }) {
  return (
    <div className="my-3 py-1 px-2 text-center text-xs font-bold uppercase tracking-[0.2em]" style={{ fontFamily: mono, color: PAPER, background: FLASH }}>
      ---FLASH--- {text} ---FLASH---
    </div>
  );
}

/* ── Box — simple border-characters feel ── */
function TapeBox({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-2 border-dashed p-3 ${className}`} style={{ borderColor: INK, background: PAP2 }}>
      {title && (
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 pb-1 border-b border-dashed" style={{ fontFamily: mono, borderColor: TM }}>
          [ {title} ]
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Range bar ── */
function TapeRange({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const total = 30;
  const pos = Math.round(((current - low) / (high - low)) * total);
  const bar = Array.from({ length: total }, (_, i) => (i === pos ? "▓" : "░")).join("");
  return (
    <div className="mb-2">
      <span className="text-[10px] uppercase" style={{ fontFamily: mono, color: TM }}>{label}: </span>
      <span className="text-xs" style={{ fontFamily: mono, color: INK }}>{bar}</span>
      <div className="flex justify-between text-[10px]" style={{ fontFamily: mono, color: TM }}>
        <span>{usd(low)}</span><span>{usd(high)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function TickerTapePrototype() {
  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK, fontFamily: mono }}>

      {/* ── MASTHEAD ── */}
      <header className="border-b-2 border-dashed" style={{ borderColor: INK }}>
        <div className="mx-auto max-w-4xl px-4 py-2">
          <div className="flex items-center justify-between text-[10px]" style={{ color: TM }}>
            <Link href="/prototype" className="hover:underline" style={{ color: FLASH }}>{"<< BACK TO INDEX"}</Link>
            <span>03/03/2026 16:00:01 EST</span>
          </div>
          <div className="text-center py-3">
            <Link href="/prototype" className="hover:opacity-80 transition-opacity">
              <pre className="text-sm leading-tight" style={{ color: INK }}>{`
 _______ ______ ______ _____   _____ _    _ __  __ 
|__   __|  ____|  ____|  __ \\ / ____| |  | |  \\/  |
   | |  | |__  | |__  | |__) | (___ | |  | | \\  / |
   | |  |  __| |  __| |  _  / \\___ \\| |  | | |\\/| |
   | |  | |____| |____| | \\ \\ ____) | |__| | |  | |
   |_|  |______|______|_|  \\_|_____/ \\____/|_|  |_|
              `}</pre>
            </Link>
            <div className="text-[10px] uppercase tracking-[0.3em] mt-1" style={{ color: TM }}>WIRE SERVICE FINANCIAL TERMINAL</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-4">

        {/* ── FLASH ALERT ── */}
        <Flash text={`${STOCK.ticker} ${STOCK.change >= 0 ? "UP" : "DOWN"} ${Math.abs(STOCK.change).toFixed(2)} TO ${usd(STOCK.price)}`} />

        {/* ── PRICE HERO ── */}
        <TapeSection title={`${STOCK.ticker} — ${STOCK.name.toUpperCase()}`} />
        <div className="space-y-1 text-sm">
          <div>LAST .... {usd(STOCK.price)}  CHG .... <span style={{ color: nClr(STOCK.change) }}>{STOCK.change >= 0 ? "+" : ""}{STOCK.change.toFixed(2)}</span>  PCT .... <span style={{ color: nClr(STOCK.changePct) }}>{pct(STOCK.changePct)}</span></div>
          <div>OPEN .... {usd(STOCK.open)}  HIGH ... {usd(STOCK.high)}  LOW .... {usd(STOCK.low)}</div>
          <div>PREV .... {usd(STOCK.prevClose)}  VOL .... {fmt(STOCK.volume)}  AVG .... {fmt(STOCK.avgVolume)}</div>
          <div>MKTCAP .. {fmt(STOCK.marketCap)}  PE ..... {STOCK.pe.toFixed(1)}  EPS .... {usd(STOCK.eps)}</div>
          <div>BETA .... {STOCK.beta.toFixed(2)}  YIELD .. {STOCK.dividendYield.toFixed(2)}%  EXCH ... {STOCK.exchange}</div>
        </div>

        <Dash />

        {/* ── Chart — ASCII-style ── */}
        <div className="text-[10px] mb-1" style={{ color: TM }}>PRICE CHART (1YR):</div>
        <div className="border-2 border-dashed p-2" style={{ borderColor: TM }}>
          <svg className="w-full h-40" preserveAspectRatio="none" viewBox="0 0 400 120">
            <defs>
              <pattern id="tapeGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke={TM} strokeWidth="0.3" strokeDasharray="2 2" />
              </pattern>
            </defs>
            <rect width="400" height="120" fill="url(#tapeGrid)" />
            <polyline points="0,110 25,105 50,108 75,92 100,98 125,82 150,88 175,70 200,76 225,58 250,65 275,48 300,54 325,38 350,42 375,30 400,22" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots at data points */}
            {[[0,110],[50,108],[100,98],[150,88],[200,76],[250,65],[300,54],[350,42],[400,22]].map(([x,y], i) => (
              <circle key={i} cx={x} cy={y} r="2.5" fill={INK} />
            ))}
          </svg>
        </div>

        <Dash />

        {/* Ranges */}
        <TapeRange low={STOCK.low} high={STOCK.high} current={STOCK.price} label="INTRADAY" />
        <TapeRange low={STOCK.week52Low} high={STOCK.week52High} current={STOCK.price} label="52-WEEK" />

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

          {/* LEFT COLUMN */}
          <div className="space-y-3">
            <TapeSection title="COMPANY PROFILE" />
            <p className="text-xs leading-relaxed" style={{ color: T2 }}>{COMPANY_DESCRIPTION}</p>
            <Dash />
            <div className="text-xs space-y-0.5">
              <div>CEO ......... {STOCK.ceo}</div>
              <div>HQ .......... {STOCK.headquarters}</div>
              <div>EMPLOYEES ... {STOCK.employees.toLocaleString()}</div>
              <div>FOUNDED ..... {STOCK.founded}</div>
              <div>IPO ......... {STOCK.ipoDate}</div>
              <div>FY END ...... {STOCK.fiscalYearEnd}</div>
            </div>

            <TapeSection title="ANALYSIS" />
            <p className="text-xs leading-relaxed" style={{ color: T2 }}>{AI_ANALYSIS.summary}</p>
            <Dash />
            <div className="text-[10px] font-bold uppercase" style={{ color: FLASH }}>OUTLOOK:</div>
            <p className="text-xs leading-relaxed" style={{ color: T2 }}>{AI_ANALYSIS.outlook}</p>

            <TapeSection title="BULL CASE" />
            <p className="text-xs leading-relaxed mb-2" style={{ color: T2 }}>{BULL_CASE.thesis}</p>
            {BULL_CASE.keyMetrics.map((m) => (
              <div key={m.label} className="text-xs">
                <span style={{ color: TM }}>{m.label.toUpperCase().padEnd(18, ".")}</span> <span className="font-bold" style={{ color: GRN }}>{m.value}</span>
              </div>
            ))}

            <TapeSection title="BEAR CASE" />
            <p className="text-xs leading-relaxed mb-2" style={{ color: T2 }}>{BEAR_CASE.thesis}</p>
            {BEAR_CASE.keyMetrics.map((m) => (
              <div key={m.label} className="text-xs">
                <span style={{ color: TM }}>{m.label.toUpperCase().padEnd(18, ".")}</span> <span className="font-bold" style={{ color: FLASH }}>{m.value}</span>
              </div>
            ))}

            <TapeSection title="KEY RISKS" />
            {KEY_RISKS.map((r, i) => (
              <div key={i} className={i > 0 ? "mt-2" : ""}>
                <div className="text-xs font-bold uppercase">[{r.severity.toUpperCase()}] {r.title.toUpperCase()}</div>
                <p className="text-xs leading-relaxed" style={{ color: T2 }}>{r.description}</p>
              </div>
            ))}

            <TapeSection title="CATALYSTS" />
            {CATALYSTS.map((c, i) => (
              <div key={i} className={i > 0 ? "mt-2" : ""}>
                <div className="text-xs"><span className="font-bold uppercase">{c.title.toUpperCase()}</span> <span style={{ color: GRN }}>({c.timeline})</span></div>
                <p className="text-xs leading-relaxed" style={{ color: T2 }}>{c.description}</p>
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-3">
            <TapeBox title="SEGMENTS">
              {SEGMENTS.map((seg) => (
                <div key={seg.name} className="mb-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase">{seg.name}</span>
                    <span style={{ color: T2 }}>{seg.revenue} ({seg.pct}%)</span>
                  </div>
                  <div className="text-xs" style={{ color: TM }}>
                    {"█".repeat(Math.round(seg.pct / 3))}{"░".repeat(Math.max(0, 17 - Math.round(seg.pct / 3)))}
                  </div>
                </div>
              ))}
            </TapeBox>

            <TapeBox title="CONSENSUS">
              <div className="text-xl font-bold mb-2" style={{ color: GRN }}>{ANALYST_CONSENSUS.rating.toUpperCase()}</div>
              <div className="text-xs space-y-0.5">
                <div>BUY ......... {ANALYST_CONSENSUS.buy}</div>
                <div>OVERWEIGHT .. {ANALYST_CONSENSUS.overweight}</div>
                <div>HOLD ........ {ANALYST_CONSENSUS.hold}</div>
                <div>UNDERWEIGHT . {ANALYST_CONSENSUS.underweight}</div>
                <div>SELL ........ {ANALYST_CONSENSUS.sell}</div>
              </div>
              <Dash />
              <div className="text-xs space-y-0.5">
                <div>TGT LOW ..... {usd(ANALYST_CONSENSUS.lowTarget)}</div>
                <div>TGT AVG ..... {usd(ANALYST_CONSENSUS.avgTarget)}</div>
                <div>TGT HIGH .... {usd(ANALYST_CONSENSUS.highTarget)}</div>
                <div>UPSIDE ...... <span style={{ color: GRN }}>{pct(ANALYST_CONSENSUS.impliedUpside)}</span></div>
              </div>
              <Dash />
              {ANALYSTS.map((a) => (
                <div key={a.firm} className="text-xs py-0.5">
                  <span className="font-bold">{a.firm.substring(0, 16).padEnd(16)}</span>{" "}
                  <span style={{ color: a.rating.includes("Buy") || a.rating.includes("Overweight") ? GRN : a.rating.includes("Sell") || a.rating.includes("Underperform") ? FLASH : T2 }}>{a.rating.padEnd(12)}</span>{" "}
                  <span>{usd(a.target)}</span>
                </div>
              ))}
            </TapeBox>

            <TapeBox title="COMMENTARY">
              {ANALYST_COMMENTARY.map((c, i) => (
                <div key={i} className={i > 0 ? "mt-2 pt-2 border-t border-dashed" : ""} style={{ borderColor: TM }}>
                  <div className="text-xs font-bold uppercase">{c.title.toUpperCase()}</div>
                  <div className="text-[10px]" style={{ color: TM }}>{c.firm} / {c.analyst} / {c.date}</div>
                  <p className="text-xs leading-relaxed mt-1" style={{ color: T2 }}>{c.snippet}</p>
                </div>
              ))}
            </TapeBox>

            <TapeBox title="TECHNICALS">
              {[
                { l: "SMA 20", v: usd(TECHNICALS.sma20), s: STOCK.price > TECHNICALS.sma20 },
                { l: "SMA 50", v: usd(TECHNICALS.sma50), s: STOCK.price > TECHNICALS.sma50 },
                { l: "SMA 200", v: usd(TECHNICALS.sma200), s: STOCK.price > TECHNICALS.sma200 },
                { l: "RSI 14", v: TECHNICALS.rsi14.toString(), s: TECHNICALS.rsi14 < 70 },
                { l: "TREND", v: TECHNICALS.trend.toUpperCase(), s: TECHNICALS.trend === "Uptrend" },
                { l: "MACD", v: TECHNICALS.macdSignal.toUpperCase(), s: TECHNICALS.macdSignal.includes("Bullish") },
                { l: "SUPPORT", v: usd(TECHNICALS.support1), s: true },
                { l: "RESIST", v: usd(TECHNICALS.resistance1), s: false },
              ].map((t) => (
                <div key={t.l} className="text-xs">
                  <span style={{ color: TM }}>{t.l.padEnd(12, ".")}</span> <span className="font-bold" style={{ color: t.s ? GRN : FLASH }}>{t.v}</span>
                </div>
              ))}
            </TapeBox>
          </div>
        </div>

        {/* ── FULL-WIDTH: Earnings ── */}
        <TapeSection title="EARNINGS HISTORY" />
        <TapeBox>
          <div className="overflow-x-auto">
            <pre className="text-xs leading-relaxed">
{`QTR         DATE        EST     ACT     REV       GRWTH   SRPR`}
{`---------- ---------- ------- ------- --------- ------- ------`}
{EARNINGS.map((e) =>
  `${e.quarter.padEnd(10)} ${e.date.padEnd(10)} ${usd(e.epsEst).padStart(7)} ${usd(e.epsActual).padStart(7)} ${e.revenue.padStart(9)} ${pct(e.revenueGrowth).padStart(7)} ${e.surprise.padStart(6)}`
).join("\n")}
            </pre>
          </div>
        </TapeBox>

        {/* Financials */}
        <TapeSection title="FINANCIAL STATEMENTS" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            { title: "INCOME STMT", data: INCOME_STATEMENT, hasYoy: true },
            { title: "BALANCE SHEET", data: BALANCE_SHEET, hasYoy: false },
            { title: "CASH FLOW", data: CASH_FLOW, hasYoy: true },
          ].map((section) => (
            <TapeBox key={section.title} title={section.title}>
              {section.data.map((row) => (
                <div key={row.label} className="text-xs flex justify-between">
                  <span style={{ color: T2 }}>{row.label}</span>
                  <span>
                    <span className="font-bold" style={{ color: row.value.startsWith("-") ? FLASH : INK }}>{row.value}</span>
                    {section.hasYoy && typeof (row as unknown as { yoy?: string }).yoy === "string" && (
                      <span className="ml-1" style={{ color: (row as unknown as { yoy: string }).yoy.startsWith("+") ? GRN : (row as unknown as { yoy: string }).yoy.startsWith("−") ? FLASH : TM }}>{(row as unknown as { yoy: string }).yoy}</span>
                    )}
                  </span>
                </div>
              ))}
            </TapeBox>
          ))}
        </div>

        {/* Competitors */}
        <TapeSection title="PEER COMPARISON" />
        <TapeBox>
          <pre className="text-xs leading-relaxed overflow-x-auto">
{`TICKER  NAME               MKTCAP    PE     REV       MRGN    GRWTH`}
{`------  ----------------  -------  -----  --------  ------  ------`}
{COMPETITORS.map((c) =>
  `${c.ticker.padEnd(6)}  ${c.name.padEnd(16)}  ${c.marketCap.padStart(7)}  ${c.pe.toFixed(1).padStart(5)}  ${c.revenue.padStart(8)}  ${c.margin.padStart(6)}  ${c.growth.padStart(6)}`
).join("\n")}
          </pre>
        </TapeBox>

        {/* Valuation + Dividends */}
        <TapeSection title="VALUATION & DIVIDENDS" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TapeBox title="VALUATION">
            {VALUATION_RATIOS.map((r) => (
              <div key={r.label} className="text-xs">
                <span style={{ color: TM }}>{r.label.padEnd(16, ".")}</span> <span className="font-bold">{r.value}</span>
              </div>
            ))}
          </TapeBox>
          <TapeBox title="DIVIDENDS">
            {DIVIDEND_HISTORY.map((d) => (
              <div key={d.year} className="text-xs">
                <span className="font-bold">{d.year}</span>{" "}
                <span>{d.annual.padStart(6)}</span>{" "}
                <span style={{ color: TM }}>{d.yield.padStart(6)}</span>{" "}
                <span style={{ color: GRN }}>{d.growth.padStart(6)}</span>
              </div>
            ))}
          </TapeBox>
        </div>

        {/* Holders + ESG */}
        <TapeSection title="OWNERSHIP & ESG" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TapeBox title="TOP HOLDERS">
            {TOP_HOLDERS.map((h) => (
              <div key={h.name} className="text-xs">
                <span>{h.name.padEnd(20)}</span> <span style={{ color: TM }}>{h.shares.padStart(6)}</span> <span className="font-bold">{h.pct.padStart(5)}</span>
              </div>
            ))}
          </TapeBox>
          <TapeBox title={`ESG (${ESG.provider})`}>
            <div className="text-xl font-bold mb-2" style={{ color: GRN }}>{ESG.rating}</div>
            <div className="text-xs space-y-0.5">
              <div>ENVIRONMENT ... {ESG.environmentScore}/10</div>
              <div>SOCIAL ........ {ESG.socialScore}/10</div>
              <div>GOVERNANCE .... {ESG.governanceScore}/10</div>
            </div>
            <Dash />
            {ESG.highlights.map((h, i) => (
              <p key={i} className="text-xs leading-relaxed">{`>>> `}{h}</p>
            ))}
          </TapeBox>
        </div>

        {/* Ticker tape bottom */}
        <HeavyDash />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase mb-2 pb-1 border-b border-dashed" style={{ borderColor: TM }}>[ MARKET BOARD ]</div>
            {WATCHLIST.map((w) => (
              <div key={w.ticker} className="text-xs">
                <span className="font-bold">{w.ticker.padEnd(6)}</span>
                <span>{usd(w.price).padStart(8)}</span>{" "}
                <span style={{ color: w.change >= 0 ? GRN : FLASH }}>{(w.change >= 0 ? "+" : "")}{w.change.toFixed(2).padStart(6)}</span>{" "}
                <span style={{ color: TM }}>{w.volume}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase mb-2 pb-1 border-b border-dashed" style={{ borderColor: TM }}>[ WIRE HEADLINES ]</div>
            {NEWS.map((n, i) => (
              <div key={i} className="text-xs py-0.5">
                <span style={{ color: FLASH }}>{n.time}</span> {n.headline}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase mb-2 pb-1 border-b border-dashed" style={{ borderColor: TM }}>[ SECTOR PERF ]</div>
            {SECTOR_PERFORMANCE.map((s) => (
              <div key={s.label} className="text-xs flex justify-between">
                <span style={{ color: T2 }}>{s.label}</span>
                <span className="font-bold" style={{ color: s.value.startsWith("+") ? GRN : FLASH }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t-2 border-dashed mt-6" style={{ borderColor: INK, background: PAP2 }}>
        <div className="mx-auto max-w-4xl px-4 py-3 text-center text-[10px] uppercase tracking-[0.2em]" style={{ color: TM }}>
          --- END TRANSMISSION --- ZERO SUM 12-E: TICKER TAPE --- SAMPLE DATA ONLY --- (C) 2026 ---
        </div>
      </footer>
    </div>
  );
}
