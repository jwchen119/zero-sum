"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import { formatCurrency } from "@/lib/format";
import {
  WHT, INK, GRY, BLU, RED, T2, TM, BG, GAIN, LOSS,
  serif, mono, sans,
  Hair, WSJSection,
} from "@/lib/wsj";
import { fetchCompare, type CompareResponse } from "@/lib/api";

const COLORS = ["#555555", "#b07050", "#4a7c59", "#5a6abf", "#b0701a"];
const BG_COLORS = ["var(--wsj-bg, #e8e0d0)", "var(--wsj-bg, #e8e0d0)", "var(--wsj-bg, #e8e0d0)", "var(--wsj-bg, #e8e0d0)", "var(--wsj-bg, #e8e0d0)"];

const METRIC_LABELS: Record<string, string> = {
  marketCap: "Market Cap",
  trailingPE: "P/E (TTM)",
  forwardPE: "P/E (Fwd)",
  priceToBook: "P/B",
  priceToSalesTrailing12Months: "P/S",
  enterpriseToRevenue: "EV/Rev",
  enterpriseToEbitda: "EV/EBITDA",
  profitMargins: "Profit Margin",
  operatingMargins: "Op Margin",
  grossMargins: "Gross Margin",
  returnOnEquity: "ROE",
  returnOnAssets: "ROA",
  revenueGrowth: "Rev Growth",
  earningsGrowth: "Earnings Growth",
  dividendYield: "Div Yield",
  payoutRatio: "Payout Ratio",
  beta: "Beta",
  debtToEquity: "D/E",
  currentRatio: "Current Ratio",
  totalRevenue: "Revenue",
  totalDebt: "Total Debt",
  totalCash: "Total Cash",
  freeCashflow: "Free Cash Flow",
  operatingCashflow: "Operating CF",
};

const RADAR_METRICS: { key: string; label: string; pct?: boolean; invert?: boolean }[] = [
  { key: "profitMargins", label: "Profit Margin", pct: true },
  { key: "grossMargins", label: "Gross Margin", pct: true },
  { key: "returnOnEquity", label: "ROE", pct: true },
  { key: "revenueGrowth", label: "Rev Growth", pct: true },
  { key: "currentRatio", label: "Liquidity" },
  { key: "operatingMargins", label: "Op Margin", pct: true },
];

const BAR_METRICS: { key: string; label: string; fmt: "currency" | "pct" | "ratio" }[] = [
  { key: "marketCap", label: "Market Cap", fmt: "currency" },
  { key: "totalRevenue", label: "Revenue", fmt: "currency" },
  { key: "freeCashflow", label: "Free Cash Flow", fmt: "currency" },
  { key: "profitMargins", label: "Profit Margin", fmt: "pct" },
  { key: "grossMargins", label: "Gross Margin", fmt: "pct" },
  { key: "returnOnEquity", label: "ROE", fmt: "pct" },
];

const PERIOD_ORDER = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y"];

function fmtMetric(key: string, v: unknown): string {
  if (v == null) return "—";
  const n = v as number;
  if (["profitMargins", "operatingMargins", "grossMargins", "returnOnEquity", "returnOnAssets", "revenueGrowth", "earningsGrowth", "dividendYield", "payoutRatio"].includes(key)) {
    return `${(n * 100).toFixed(2)}%`;
  }
  if (["marketCap", "totalRevenue", "totalDebt", "totalCash", "freeCashflow", "operatingCashflow"].includes(key)) {
    return formatCurrency(n);
  }
  if (["trailingPE", "forwardPE", "priceToBook", "priceToSalesTrailing12Months", "enterpriseToRevenue", "enterpriseToEbitda", "beta", "debtToEquity", "currentRatio"].includes(key)) {
    return n.toFixed(2);
  }
  return String(n);
}

function retColor(v: number) {
  return v > 0 ? GAIN : v < 0 ? LOSS : INK;
}

/** Convert a mouse event to SVG viewBox coordinates */
function svgPoint(svg: SVGSVGElement, e: React.MouseEvent): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (ctm) {
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  }
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  return {
    x: ((e.clientX - rect.left) / rect.width) * vb.width,
    y: ((e.clientY - rect.top) / rect.height) * vb.height,
  };
}

/* ──────── Interactive Price Chart ──────── */
function PriceChart({ data }: { data: CompareResponse }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chartW = 700, chartH = 280, padL = 40, padR = 10, padT = 20, padB = 30;
  const plotW = chartW - padL - padR, plotH = chartH - padT - padB;

  const allPrices = useMemo(() => Object.values(data.prices).flat(), [data.prices]);
  const chartDates = useMemo(() => {
    const dates = new Set<string>();
    for (const ticker of data.tickers) {
      for (const p of data.prices[ticker] || []) dates.add(p.date);
    }
    return Array.from(dates).sort();
  }, [data.tickers, data.prices]);
  const dateIndexMap = useMemo(
    () => new Map(chartDates.map((date, idx) => [date, idx])),
    [chartDates]
  );
  const priceMapByTicker = useMemo(() => {
    const maps: Record<string, Map<string, CompareResponse["prices"][string][number]>> = {};
    for (const ticker of data.tickers) {
      maps[ticker] = new Map((data.prices[ticker] || []).map((p) => [p.date, p]));
    }
    return maps;
  }, [data.tickers, data.prices]);
  const maxLen = chartDates.length;

  if (allPrices.length === 0 || maxLen === 0) return null;

  const allNorm = allPrices.map((p) => p.normalized);
  const minN = Math.min(...allNorm), maxN = Math.max(...allNorm);
  const range = maxN - minN || 1;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const { x, y } = svgPoint(svgRef.current, e);
    if (x < padL || x > padL + plotW || y < padT || y > padT + plotH) {
      setHoverIdx(null);
      return;
    }
    const frac = (x - padL) / plotW;
    const idx = Math.round(frac * (maxLen - 1));
    setHoverIdx(Math.max(0, Math.min(maxLen - 1, idx)));
  };

  const xForIdx = (i: number) => maxLen <= 1 ? padL : padL + (i / (maxLen - 1)) * plotW;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${chartW} ${chartH}`}
      className="w-full cursor-crosshair"
      style={{ maxHeight: 320 }}
      onMouseMove={onMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padT + plotH * (1 - f);
        const val = (minN + range * f).toFixed(0);
        return (
          <g key={f}>
            <line x1={padL} x2={chartW - padR} y1={y} y2={y} stroke={GRY} strokeWidth={0.5} />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={8} fill={TM} fontFamily="var(--font-mono)">{val}</text>
          </g>
        );
      })}
      {/* Lines */}
      {data.tickers.map((ticker, ti) => {
        const prices = data.prices[ticker] || [];
        if (prices.length < 2) return null;
        const points = prices.map((p) => {
          const idx = dateIndexMap.get(p.date);
          if (idx == null) return null;
          const x = xForIdx(idx);
          const y = padT + plotH * (1 - (p.normalized - minN) / range);
          return `${x},${y}`;
        }).filter((point): point is string => point != null).join(" ");
        return <polyline key={ticker} points={points} fill="none" stroke={COLORS[ti]} strokeWidth={1.5} />;
      })}
      {/* Crosshair + dots + tooltip */}
      {hoverIdx != null && (
        <>
          <line x1={xForIdx(hoverIdx)} x2={xForIdx(hoverIdx)} y1={padT} y2={padT + plotH} stroke={INK} strokeWidth={0.5} strokeDasharray="3,2" />
          {data.tickers.map((ticker, ti) => {
            const date = chartDates[hoverIdx];
            const p = date ? priceMapByTicker[ticker]?.get(date) : undefined;
            if (!p) return null;
            const x = xForIdx(hoverIdx);
            const y = padT + plotH * (1 - (p.normalized - minN) / range);
            return <circle key={ticker} cx={x} cy={y} r={3} fill={COLORS[ti]} stroke={WHT} strokeWidth={1} />;
          })}
          {/* Tooltip box */}
          {(() => {
            const date = chartDates[hoverIdx] || "";
            const tx = xForIdx(hoverIdx);
            const tooltipX = tx > chartW / 2 ? tx - 115 : tx + 8;
            return (
              <g>
                <rect x={tooltipX} y={padT} width={110} height={14 + data.tickers.length * 13} rx={2} fill={INK} fillOpacity={0.92} />
                <text x={tooltipX + 6} y={padT + 11} fontSize={8} fill={TM} fontFamily="var(--font-mono)">{date}</text>
                {data.tickers.map((ticker, ti) => {
                  const p = date ? priceMapByTicker[ticker]?.get(date) : undefined;
                  return (
                    <text key={ticker} x={tooltipX + 6} y={padT + 24 + ti * 13} fontSize={8} fontFamily="var(--font-mono)" fontWeight={700} fill={COLORS[ti]}>
                      {p ? `${ticker} $${p.close.toFixed(2)} (${p.normalized.toFixed(1)})` : `${ticker} —`}
                    </text>
                  );
                })}
              </g>
            );
          })()}
        </>
      )}
      {/* Legend */}
      {data.tickers.map((ticker, ti) => (
        <g key={ticker}>
          <line x1={padL + ti * 80} x2={padL + ti * 80 + 16} y1={chartH - 6} y2={chartH - 6} stroke={COLORS[ti]} strokeWidth={2} />
          <text x={padL + ti * 80 + 20} y={chartH - 2} fontSize={9} fill={INK} fontFamily="var(--font-mono)" fontWeight={700}>{ticker}</text>
        </g>
      ))}
    </svg>
  );
}

/* ──────── Interactive Radar Chart ──────── */
function RadarChart({ data, tickers }: { data: CompareResponse; tickers: string[] }) {
  const [activeTicker, setActiveTicker] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; ti: number } | null>(null);

  const cx = 160, cy = 140, r = 100;
  const n = RADAR_METRICS.length;
  const angles = RADAR_METRICS.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);

  const maxVals = RADAR_METRICS.map((m) => {
    const vals = tickers.map((t) => {
      const v = data.fundamentals[t]?.[m.key] as number | null;
      return v != null ? Math.abs(v) : 0;
    });
    return Math.max(...vals, 0.001);
  });

  const rings = [0.25, 0.5, 0.75, 1];

  const handlePolyEnter = (ti: number, e: React.MouseEvent<SVGPolygonElement>) => {
    setActiveTicker(ti);
    if (svgRef.current) {
      const pt = svgPoint(svgRef.current, e);
      setTooltip({ x: pt.x, y: pt.y, ti });
    }
  };

  return (
    <svg ref={svgRef} viewBox="0 0 320 280" className="w-full" style={{ maxHeight: 340 }} onMouseLeave={() => { setActiveTicker(null); setTooltip(null); }}>
      {/* Grid rings */}
      {rings.map((frac) => (
        <polygon
          key={frac}
          points={angles.map((a) => `${cx + r * frac * Math.cos(a)},${cy + r * frac * Math.sin(a)}`).join(" ")}
          fill="none" stroke={GRY} strokeWidth={0.5} strokeDasharray={frac < 1 ? "2,2" : "0"}
        />
      ))}
      {/* Axis lines */}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke={GRY} strokeWidth={0.5} />
      ))}
      {/* Data polygons */}
      {tickers.map((t, ti) => {
        const pts = RADAR_METRICS.map((m, mi) => {
          const v = data.fundamentals[t]?.[m.key] as number | null;
          const norm = v != null ? Math.min(Math.abs(v) / maxVals[mi], 1) : 0;
          return `${cx + r * norm * Math.cos(angles[mi])},${cy + r * norm * Math.sin(angles[mi])}`;
        }).join(" ");
        const isActive = activeTicker === null || activeTicker === ti;
        return (
          <polygon
            key={t}
            points={pts}
            fill={COLORS[ti]}
            fillOpacity={isActive ? (activeTicker === ti ? 0.2 : 0.08) : 0.02}
            stroke={COLORS[ti]}
            strokeWidth={activeTicker === ti ? 2.5 : 1.5}
            opacity={isActive ? 1 : 0.25}
            style={{ cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={(e) => handlePolyEnter(ti, e)}
            onMouseLeave={() => { setActiveTicker(null); setTooltip(null); }}
          />
        );
      })}
      {/* Dots */}
      {tickers.map((t, ti) =>
        RADAR_METRICS.map((m, mi) => {
          const v = data.fundamentals[t]?.[m.key] as number | null;
          const norm = v != null ? Math.min(Math.abs(v) / maxVals[mi], 1) : 0;
          const x = cx + r * norm * Math.cos(angles[mi]);
          const y = cy + r * norm * Math.sin(angles[mi]);
          const isActive = activeTicker === null || activeTicker === ti;
          return (
            <circle
              key={`${t}-${mi}`} cx={x} cy={y}
              r={activeTicker === ti ? 4 : 2.5}
              fill={COLORS[ti]}
              opacity={isActive ? 1 : 0.2}
              style={{ transition: "all 0.15s", pointerEvents: "none" }}
            />
          );
        })
      )}
      {/* Labels */}
      {RADAR_METRICS.map((m, i) => {
        const lx = cx + (r + 18) * Math.cos(angles[i]);
        const ly = cy + (r + 18) * Math.sin(angles[i]);
        const anchor = Math.abs(angles[i]) < 0.1 || Math.abs(angles[i] - Math.PI) < 0.1 ? "middle"
          : angles[i] > -Math.PI / 2 && angles[i] < Math.PI / 2 ? "start" : "end";
        return (
          <text key={i} x={lx} y={ly + 3} textAnchor={anchor} fontSize={8} fill={TM} fontFamily="var(--font-sans)" fontWeight={600}>
            {m.label}
          </text>
        );
      })}
      {/* Tooltip */}
      {tooltip != null && (() => {
        const ti = tooltip.ti;
        const t = tickers[ti];
        const tx = tooltip.x > 200 ? tooltip.x - 120 : tooltip.x + 10;
        const ty = Math.max(10, tooltip.y - 10);
        return (
          <g style={{ pointerEvents: "none" }}>
            <rect x={tx} y={ty} width={115} height={12 + RADAR_METRICS.length * 12} rx={2} fill={INK} fillOpacity={0.92} />
            <text x={tx + 6} y={ty + 10} fontSize={8} fill={COLORS[ti]} fontFamily="var(--font-mono)" fontWeight={700}>{t} · {data.fundamentals[t]?.shortName}</text>
            {RADAR_METRICS.map((m, mi) => {
              const v = data.fundamentals[t]?.[m.key] as number | null;
              const display = v != null ? (m.pct ? `${(v * 100).toFixed(1)}%` : v.toFixed(2)) : "—";
              return (
                <text key={mi} x={tx + 6} y={ty + 22 + mi * 12} fontSize={7.5} fill={TM} fontFamily="var(--font-mono)">
                  {m.label}: <tspan fontWeight={700} fill={WHT}>{display}</tspan>
                </text>
              );
            })}
          </g>
        );
      })()}
    </svg>
  );
}

/* ──────── 52-Week Range Bar (interactive) ──────── */
function RangeBar({ current, low, high, color, ticker }: { current: number; low: number; high: number; color: string; ticker: string }) {
  const [hover, setHover] = useState(false);
  const range = high - low || 1;
  const pct = Math.max(0, Math.min(100, ((current - low) / range) * 100));
  return (
    <div
      className="flex items-center gap-2 w-full relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: "default" }}
    >
      <span className="text-[10px] tabular-nums w-14 text-right" style={{ fontFamily: mono, color: TM }}>${low.toFixed(0)}</span>
      <div className="relative flex-1 h-2 rounded-full" style={{ background: "var(--wsj-bg, #e8e0d0)", transition: "height 0.15s", height: hover ? 6 : 4 }}>
        <div className="absolute h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}44, ${color})` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full border-2"
          style={{
            left: `calc(${pct}% - ${hover ? 7 : 5}px)`,
            width: hover ? 14 : 10,
            height: hover ? 14 : 10,
            background: WHT,
            borderColor: color,
            transition: "all 0.15s",
            boxShadow: hover ? `0 0 6px ${color}66` : "none",
          }}
        />
      </div>
      <span className="text-[10px] tabular-nums w-14" style={{ fontFamily: mono, color: TM }}>${high.toFixed(0)}</span>
      {/* Tooltip on hover */}
      {hover && (
        <div
          className="absolute -top-8 px-2 py-1 rounded text-[9px] font-bold whitespace-nowrap z-10"
          style={{
            left: `calc(14px + ${pct}% * 0.7)`,
            fontFamily: mono,
            background: INK,
            color: WHT,
            transform: "translateX(-50%)",
          }}
        >
          {ticker} ${current.toFixed(2)} · {pct.toFixed(0)}% of range
        </div>
      )}
    </div>
  );
}

/* ──────── Interactive Horizontal Bar Chart ──────── */
function HBar({ tickers, data, metric }: { tickers: string[]; data: CompareResponse; metric: typeof BAR_METRICS[number] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const vals = tickers.map((t) => {
    const v = data.fundamentals[t]?.[metric.key] as number | null;
    return v ?? 0;
  });
  const max = Math.max(...vals.map(Math.abs), 0.001);

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>{metric.label}</div>
      {tickers.map((t, i) => {
        const v = vals[i];
        const pct = Math.abs(v) / max * 100;
        const label = metric.fmt === "currency" ? formatCurrency(v) : metric.fmt === "pct" ? `${(v * 100).toFixed(1)}%` : v.toFixed(2);
        const isHover = hoverIdx === i;
        return (
          <div
            key={t}
            className="flex items-center gap-2 rounded transition-colors"
            style={{ background: isHover ? BG : "transparent", padding: "1px 0" }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <span className="text-[10px] font-bold w-10" style={{ fontFamily: mono, color: COLORS[i] }}>{t}</span>
            <div className="flex-1 h-4 relative overflow-hidden" style={{ background: WHT, borderRadius: 2 }}>
              <div
                className="h-full"
                style={{
                  width: `${pct}%`,
                  background: `${COLORS[i]}${v < 0 ? '55' : 'cc'}`,
                  transition: "width 0.5s ease, filter 0.15s",
                  filter: isHover ? "brightness(1.15)" : "none",
                }}
              />
              {isHover && (
                <div
                  className="absolute inset-y-0 flex items-center px-1.5 text-[9px] font-bold"
                  style={{
                    left: `${Math.min(pct, 85)}%`,
                    fontFamily: mono,
                    color: INK,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </div>
              )}
            </div>
            <span className="text-[10px] tabular-nums w-20 text-right" style={{ fontFamily: mono, color: v < 0 ? RED : INK, fontWeight: isHover ? 800 : 400 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ──────── Interactive Risk-Return Scatter ──────── */
function RiskReturnScatter({ data, tickers }: { data: CompareResponse; tickers: string[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverTicker, setHoverTicker] = useState<string | null>(null);

  const W = 400, H = 260, padL = 50, padR = 30, padT = 25, padB = 40;
  const pW = W - padL - padR, pH = H - padT - padB;

  const points = tickers.map((t, i) => ({
    ticker: t,
    color: COLORS[i],
    idx: i,
    vol: data.riskMetrics[t]?.annualizedVolatility ?? 0,
    ret: data.riskMetrics[t]?.annualizedReturn ?? 0,
  })).filter((p) => p.vol !== 0 || p.ret !== 0);

  if (points.length < 1) return null;

  const vols = points.map((p) => p.vol);
  const rets = points.map((p) => p.ret);
  const minV = Math.min(...vols) - 2, maxV = Math.max(...vols) + 2;
  const minR = Math.min(...rets, 0) - 3, maxR = Math.max(...rets) + 3;
  const rangeV = maxV - minV || 1, rangeR = maxR - minR || 1;

  const scaleX = (v: number) => padL + ((v - minV) / rangeV) * pW;
  const scaleY = (r: number) => padT + pH - ((r - minR) / rangeR) * pH;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 300 }} onMouseLeave={() => setHoverTicker(null)}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padT + pH * (1 - f);
        const val = (minR + rangeR * f).toFixed(0);
        return (
          <g key={`h-${f}`}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={GRY} strokeWidth={0.3} />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={8} fill={TM} fontFamily="var(--font-mono)">{val}%</text>
          </g>
        );
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const x = padL + pW * f;
        const val = (minV + rangeV * f).toFixed(0);
        return (
          <g key={`v-${f}`}>
            <line x1={x} x2={x} y1={padT} y2={padT + pH} stroke={GRY} strokeWidth={0.3} />
            <text x={x} y={H - padB + 14} textAnchor="middle" fontSize={8} fill={TM} fontFamily="var(--font-mono)">{val}%</text>
          </g>
        );
      })}
      {/* Zero line */}
      {minR < 0 && maxR > 0 && (
        <line x1={padL} x2={W - padR} y1={scaleY(0)} y2={scaleY(0)} stroke={INK} strokeWidth={0.5} strokeDasharray="3,3" />
      )}
      {/* Points */}
      {points.map((p) => {
        const x = scaleX(p.vol);
        const y = scaleY(p.ret);
        const isHover = hoverTicker === p.ticker;
        const isOther = hoverTicker != null && hoverTicker !== p.ticker;
        return (
          <g key={p.ticker} style={{ cursor: "pointer" }} onMouseEnter={() => setHoverTicker(p.ticker)} onMouseLeave={() => setHoverTicker(null)}>
            {/* Invisible larger hit area */}
            <circle cx={x} cy={y} r={16} fill="transparent" />
            {/* Crosshair lines on hover */}
            {isHover && (
              <>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={p.color} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.4} />
                <line x1={x} x2={x} y1={padT} y2={padT + pH} stroke={p.color} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.4} />
              </>
            )}
            <circle cx={x} cy={y} r={isHover ? 9 : 6} fill={p.color} fillOpacity={isHover ? 0.25 : 0.15} stroke={p.color} strokeWidth={isHover ? 2 : 1.5} opacity={isOther ? 0.3 : 1} style={{ transition: "all 0.15s" }} />
            <circle cx={x} cy={y} r={isHover ? 3 : 2} fill={p.color} opacity={isOther ? 0.3 : 1} style={{ transition: "all 0.15s" }} />
            <text x={x + (isHover ? 13 : 9)} y={y + 3} fontSize={isHover ? 10 : 9} fill={p.color} fontFamily="var(--font-mono)" fontWeight={700} opacity={isOther ? 0.3 : 1}>
              {p.ticker}
            </text>
            {/* Tooltip on hover */}
            {isHover && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={x > W / 2 ? x - 105 : x + 14} y={y - 30} width={95} height={34} rx={2} fill={INK} fillOpacity={0.92} />
                <text x={(x > W / 2 ? x - 105 : x + 14) + 6} y={y - 16} fontSize={8} fill={TM} fontFamily="var(--font-mono)">
                  Return: <tspan fill={WHT} fontWeight={700}>{p.ret.toFixed(1)}%</tspan>
                </text>
                <text x={(x > W / 2 ? x - 105 : x + 14) + 6} y={y - 4} fontSize={8} fill={TM} fontFamily="var(--font-mono)">
                  Volatility: <tspan fill={WHT} fontWeight={700}>{p.vol.toFixed(1)}%</tspan>
                </text>
              </g>
            )}
          </g>
        );
      })}
      {/* Axis labels */}
      <text x={padL + pW / 2} y={H - 4} textAnchor="middle" fontSize={9} fill={TM} fontFamily="var(--font-sans)" fontWeight={600}>
        Annualized Volatility →
      </text>
      <text x={12} y={padT + pH / 2} textAnchor="middle" fontSize={9} fill={TM} fontFamily="var(--font-sans)" fontWeight={600} transform={`rotate(-90, 12, ${padT + pH / 2})`}>
        Annualized Return →
      </text>
    </svg>
  );
}

/* ──────── Interactive Correlation Heatmap ──────── */
function CorrelationHeatmap({ data, tickers }: { data: CompareResponse; tickers: string[] }) {
  const [hoverCell, setHoverCell] = useState<{ i: number; j: number } | null>(null);
  const corr = data.correlation;
  if (!corr || Object.keys(corr).length < 2) return null;

  const cellSz = 60;
  const labelW = 50;
  const W = labelW + tickers.length * cellSz;
  const H = labelW + tickers.length * cellSz;

  const heatColor = (v: number) => {
    if (v >= 0.8) return "#1b5e20";
    if (v >= 0.6) return "#4caf50";
    if (v >= 0.4) return "#81c784";
    if (v >= 0.2) return "#c8e6c9";
    if (v >= 0) return "#f5f5f5";
    if (v >= -0.2) return "#ffcdd2";
    if (v >= -0.4) return "#ef9a9a";
    if (v >= -0.6) return "#e57373";
    return "#c62828";
  };
  const textColor = (v: number) => Math.abs(v) > 0.6 ? WHT : INK;

  const corrLabel = (v: number) => {
    if (v >= 0.8) return "Very Strong";
    if (v >= 0.6) return "Strong";
    if (v >= 0.4) return "Moderate";
    if (v >= 0.2) return "Weak";
    if (v >= -0.2) return "None";
    if (v >= -0.4) return "Weak Inv.";
    if (v >= -0.6) return "Moderate Inv.";
    return "Strong Inv.";
  };

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ maxWidth: 420 }} onMouseLeave={() => setHoverCell(null)}>
      {/* Column headers */}
      {tickers.map((t, i) => (
        <text key={`ch-${t}`} x={labelW + i * cellSz + cellSz / 2} y={labelW - 8} textAnchor="middle" fontSize={10} fontWeight={700} fontFamily="var(--font-mono)"
          fill={COLORS[i]} opacity={hoverCell != null && hoverCell.j !== i ? 0.3 : 1} style={{ transition: "opacity 0.15s" }}>
          {t}
        </text>
      ))}
      {/* Row headers + cells */}
      {tickers.map((t1, i) => (
        <g key={t1}>
          <text x={labelW - 6} y={labelW + i * cellSz + cellSz / 2 + 4} textAnchor="end" fontSize={10} fontWeight={700} fontFamily="var(--font-mono)"
            fill={COLORS[i]} opacity={hoverCell != null && hoverCell.i !== i ? 0.3 : 1} style={{ transition: "opacity 0.15s" }}>
            {t1}
          </text>
          {tickers.map((t2, j) => {
            const v = corr[t1]?.[t2] ?? (t1 === t2 ? 1 : 0);
            const isHover = hoverCell?.i === i && hoverCell?.j === j;
            const isInCross = hoverCell != null && (hoverCell.i === i || hoverCell.j === j);
            const dimmed = hoverCell != null && !isHover && !isInCross;
            return (
              <g key={`${t1}-${t2}`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoverCell({ i, j })}
              >
                <rect
                  x={labelW + j * cellSz} y={labelW + i * cellSz}
                  width={cellSz} height={cellSz}
                  fill={heatColor(v)} stroke={isHover ? INK : WHT}
                  strokeWidth={isHover ? 2.5 : 2} rx={3}
                  opacity={dimmed ? 0.35 : 1}
                  style={{ transition: "opacity 0.15s, stroke-width 0.15s" }}
                />
                <text
                  x={labelW + j * cellSz + cellSz / 2}
                  y={labelW + i * cellSz + cellSz / 2 + 4}
                  textAnchor="middle" fontSize={isHover ? 14 : 12} fontWeight={700}
                  fontFamily="var(--font-mono)" fill={textColor(v)}
                  opacity={dimmed ? 0.35 : 1}
                  style={{ transition: "all 0.15s" }}
                >
                  {v.toFixed(2)}
                </text>
              </g>
            );
          })}
        </g>
      ))}
      {/* Tooltip */}
      {hoverCell != null && (() => {
        const { i, j } = hoverCell;
        const t1 = tickers[i], t2 = tickers[j];
        const v = corr[t1]?.[t2] ?? (t1 === t2 ? 1 : 0);
        return (
          <text x={W / 2} y={H + 14} textAnchor="middle" fontSize={9} fontFamily="var(--font-sans)" fill={TM}>
            {t1} ↔ {t2}: <tspan fontWeight={700} fill={INK}>{v.toFixed(3)}</tspan> · {corrLabel(v)}
          </text>
        );
      })()}
    </svg>
  );
}

/* ──────── Hexagonal Density Plot ──────── */
const HEX_GREENS = ["#e8f5e9", "#c8e6c9", "#a5d6a7", "#81c784", "#66bb6a", "#4caf50", "#43a047", "#388e3c", "#2e7d32", "#1b5e20"];

function hexCorner(cx: number, cy: number, size: number, i: number) {
  const angle = (Math.PI / 180) * (60 * i - 30);
  return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
}
function hexPoints(cx: number, cy: number, size: number) {
  return Array.from({ length: 6 }, (_, i) => hexCorner(cx, cy, size, i)).map((p) => `${p.x},${p.y}`).join(" ");
}

function HexDensityPlot({ data }: { data: CompareResponse }) {
  const tickers = data.tickers;
  // Generate all unique pairs
  const pairs = useMemo(() => {
    const p: [string, string][] = [];
    for (let i = 0; i < tickers.length; i++)
      for (let j = i + 1; j < tickers.length; j++)
        p.push([tickers[i], tickers[j]]);
    return p;
  }, [tickers]);

  const [selectedPair, setSelectedPair] = useState(0);
  const [hoverHex, setHoverHex] = useState<{ bin: string; count: number; cx: number; cy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (pairs.length === 0) return null;

  const [tA, tB] = pairs[selectedPair];

  // Compute aligned daily returns
  const dailyReturns = useMemo(() => {
    const pricesA = data.prices[tA] || [];
    const pricesB = data.prices[tB] || [];
    // Build date→close maps
    const mapA = new Map(pricesA.map((p) => [p.date, p.close]));
    const mapB = new Map(pricesB.map((p) => [p.date, p.close]));
    const datesA = pricesA.map((p) => p.date);

    const points: { x: number; y: number }[] = [];
    let prevA: number | null = null, prevB: number | null = null;
    for (const d of datesA) {
      const cA = mapA.get(d);
      const cB = mapB.get(d);
      if (cA != null && cB != null && prevA != null && prevB != null) {
        const retA = ((cA - prevA) / prevA) * 100;
        const retB = ((cB - prevB) / prevB) * 100;
        points.push({ x: retA, y: retB });
      }
      if (cA != null) prevA = cA;
      if (cB != null) prevB = cB;
    }
    return points;
  }, [data.prices, tA, tB]);

  // Chart dimensions
  const W = 560, H = 420, padL = 55, padR = 25, padT = 25, padB = 50;
  const pW = W - padL - padR, pH = H - padT - padB;

  if (dailyReturns.length < 5) return null;

  // Scale
  const xs = dailyReturns.map((p) => p.x);
  const ys = dailyReturns.map((p) => p.y);
  const bound = Math.max(Math.max(...xs.map(Math.abs)), Math.max(...ys.map(Math.abs)), 1) * 1.15;
  const minX = -bound, maxX = bound, minY = -bound, maxY = bound;
  const rangeX = maxX - minX, rangeY = maxY - minY;

  const scaleX = (v: number) => padL + ((v - minX) / rangeX) * pW;
  const scaleY = (v: number) => padT + pH - ((v - minY) / rangeY) * pH;

  // Hexagonal binning
  const hexSize = 12;
  const hexW = hexSize * 2;
  const hexH = Math.sqrt(3) * hexSize;

  const bins = new Map<string, { cx: number; cy: number; count: number }>();
  for (const pt of dailyReturns) {
    const sx = scaleX(pt.x);
    const sy = scaleY(pt.y);
    // Axial coords
    const q = ((2 / 3) * (sx - padL)) / hexSize;
    const r = ((-1 / 3) * (sx - padL) + (Math.sqrt(3) / 3) * (sy - padT)) / hexSize;
    // Cube round
    let rx = Math.round(q), ry = Math.round(r), rz = Math.round(-q - r);
    const dx = Math.abs(rx - q), dy = Math.abs(ry - r), dz = Math.abs(rz - (-q - r));
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;

    const key = `${rx},${ry}`;
    const centerX = padL + hexSize * (3 / 2) * rx;
    const centerY = padT + hexSize * Math.sqrt(3) * (ry + rx / 2);
    const existing = bins.get(key);
    if (existing) existing.count++;
    else bins.set(key, { cx: centerX, cy: centerY, count: 1 });
  }

  const maxCount = Math.max(...Array.from(bins.values()).map((b) => b.count), 1);

  // Linear regression
  const n = dailyReturns.length;
  const sumX = dailyReturns.reduce((s, p) => s + p.x, 0);
  const sumY = dailyReturns.reduce((s, p) => s + p.y, 0);
  const sumXY = dailyReturns.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = dailyReturns.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  // R²
  const meanY = sumY / n;
  const ssTot = dailyReturns.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = dailyReturns.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Axis ticks
  const tickStep = Math.max(1, Math.round(bound / 4));
  const ticks: number[] = [];
  for (let v = -tickStep * 4; v <= tickStep * 4; v += tickStep) {
    if (v >= minX && v <= maxX) ticks.push(v);
  }

  return (
    <div>
      {/* Pair selector */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {pairs.map(([a, b], idx) => (
          <button
            key={`${a}-${b}`}
            onClick={() => { setSelectedPair(idx); setHoverHex(null); }}
            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border transition-colors"
            style={{
              fontFamily: mono,
              borderColor: selectedPair === idx ? INK : GRY,
              background: selectedPair === idx ? INK : WHT,
              color: selectedPair === idx ? WHT : TM,
            }}
          >
            {a}-{b}
          </button>
        ))}
      </div>

      <div className="border p-3" style={{ borderColor: GRY, background: WHT }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: 460 }}
          onMouseLeave={() => setHoverHex(null)}
        >
          {/* Grid lines */}
          {ticks.map((v) => (
            <g key={`gx-${v}`}>
              <line x1={scaleX(v)} x2={scaleX(v)} y1={padT} y2={padT + pH} stroke={GRY} strokeWidth={0.3} />
              <text x={scaleX(v)} y={H - padB + 14} textAnchor="middle" fontSize={8} fill={TM} fontFamily="var(--font-mono)">{v.toFixed(0)}%</text>
            </g>
          ))}
          {ticks.map((v) => (
            <g key={`gy-${v}`}>
              <line x1={padL} x2={padL + pW} y1={scaleY(v)} y2={scaleY(v)} stroke={GRY} strokeWidth={0.3} />
              <text x={padL - 4} y={scaleY(v) + 3} textAnchor="end" fontSize={8} fill={TM} fontFamily="var(--font-mono)">{v.toFixed(0)}%</text>
            </g>
          ))}
          {/* Zero crosshairs */}
          <line x1={scaleX(0)} x2={scaleX(0)} y1={padT} y2={padT + pH} stroke={GRY} strokeWidth={0.7} />
          <line x1={padL} x2={padL + pW} y1={scaleY(0)} y2={scaleY(0)} stroke={GRY} strokeWidth={0.7} />

          {/* Hexagons */}
          {Array.from(bins.entries()).map(([key, bin]) => {
            const frac = bin.count / maxCount;
            const colorIdx = Math.min(Math.floor(frac * HEX_GREENS.length), HEX_GREENS.length - 1);
            const isHover = hoverHex?.bin === key;
            return (
              <polygon
                key={key}
                points={hexPoints(bin.cx, bin.cy, hexSize - 0.5)}
                fill={HEX_GREENS[colorIdx]}
                stroke={isHover ? INK : HEX_GREENS[Math.min(colorIdx + 2, HEX_GREENS.length - 1)]}
                strokeWidth={isHover ? 1.5 : 0.5}
                opacity={isHover ? 1 : 0.85}
                style={{ cursor: "pointer", transition: "opacity 0.1s" }}
                onMouseEnter={() => setHoverHex({ bin: key, count: bin.count, cx: bin.cx, cy: bin.cy })}
                onMouseLeave={() => setHoverHex(null)}
              />
            );
          })}

          {/* Regression line */}
          <line
            x1={scaleX(minX)} y1={scaleY(slope * minX + intercept)}
            x2={scaleX(maxX)} y2={scaleY(slope * maxX + intercept)}
            stroke="#c62828" strokeWidth={1.5} strokeDasharray="6,3" opacity={0.7}
          />

          {/* Density legend */}
          {HEX_GREENS.map((c, i) => (
            <rect key={i} x={W - padR - (HEX_GREENS.length - i) * 12} y={padT + 2} width={12} height={10} fill={c} rx={1} />
          ))}
          <text x={W - padR - HEX_GREENS.length * 12 - 4} y={padT + 10} textAnchor="end" fontSize={7} fill={TM} fontFamily="var(--font-sans)">Low</text>
          <text x={W - padR + 2} y={padT + 10} fontSize={7} fill={TM} fontFamily="var(--font-sans)">High</text>
          <text x={W - padR - HEX_GREENS.length * 6} y={padT + 22} textAnchor="middle" fontSize={7} fill={TM} fontFamily="var(--font-sans)">density</text>

          {/* Axis labels */}
          <text x={padL + pW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill={INK} fontFamily="var(--font-sans)" fontWeight={600}>
            {tA} daily return %
          </text>
          <text x={14} y={padT + pH / 2} textAnchor="middle" fontSize={10} fill={INK} fontFamily="var(--font-sans)" fontWeight={600}
            transform={`rotate(-90, 14, ${padT + pH / 2})`}>
            {tB} daily return %
          </text>

          {/* Hover tooltip */}
          {hoverHex && (
            <g style={{ pointerEvents: "none" }}>
              <rect x={hoverHex.cx + 12} y={hoverHex.cy - 14} width={72} height={20} rx={2} fill={INK} fillOpacity={0.9} />
              <text x={hoverHex.cx + 18} y={hoverHex.cy} fontSize={9} fill={WHT} fontFamily="var(--font-mono)" fontWeight={700}>
                {hoverHex.count} point{hoverHex.count > 1 ? "s" : ""}
              </text>
            </g>
          )}
        </svg>

        {/* Regression equation */}
        <div className="text-center mt-2 text-[11px] tabular-nums" style={{ fontFamily: mono, color: TM }}>
          y = {slope.toFixed(3)}x {intercept >= 0 ? "+" : "−"} {Math.abs(intercept).toFixed(4)} &nbsp;|&nbsp; R² = {r2.toFixed(3)} &nbsp;|&nbsp; n = {n} points
        </div>
      </div>
    </div>
  );
}


function ComparePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get("tickers")?.split(",").filter(Boolean).map((t) => t.trim().toUpperCase()).slice(0, 5) || [];
  const [tickers, setTickers] = useState<string[]>(initial.length > 0 ? initial : ["AAPL", "MSFT"]);
  const [input, setInput] = useState("");
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback((t: string[]) => {
    if (t.length < 2) return;
    setLoading(true);
    fetchCompare(t)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tickers.length >= 2) {
      load(tickers);
      router.replace(`/compare?tickers=${tickers.join(",")}`, { scroll: false });
    }
  }, [tickers, load, router]);

  const addTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim().toUpperCase();
    if (t && !tickers.includes(t) && tickers.length < 5) {
      setTickers([...tickers, t]);
      setInput("");
    }
  };

  const removeTicker = (sym: string) => {
    setTickers(tickers.filter((t) => t !== sym));
  };

  // Fundamentals rows
  const metricKeys = data ? Object.keys(METRIC_LABELS).filter((k) => data.tickers.some((t) => data.fundamentals[t]?.[k] != null)) : [];

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: T2 }}>← Home</Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <WSJSection title="Stock Comparison" />

      {/* Ticker chips + input */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {tickers.map((t, i) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold"
            style={{ fontFamily: mono, border: `2px solid ${COLORS[i]}`, background: WHT }}
          >
            <span style={{ color: COLORS[i] }}>●</span> {t}
            <button onClick={() => removeTicker(t)} className="ml-1 text-[10px] font-normal hover:text-red-700" style={{ color: TM }}>×</button>
          </span>
        ))}
        {tickers.length < 5 && (
          <form onSubmit={addTicker} className="inline-flex items-center gap-1">
            <input
              className="border px-2 py-1 text-[12px] font-bold uppercase w-20"
              style={{ borderColor: GRY, fontFamily: mono, background: WHT }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="+ Add"
              maxLength={10}
            />
            <button type="submit" className="text-[10px] px-2 py-1 border font-extrabold uppercase tracking-wider hover:bg-[var(--wsj-bg)]" style={{ fontFamily: sans, borderColor: GRY }}>Add</button>
          </form>
        )}
      </div>

      {tickers.length < 2 && (
        <div className="text-[11px] py-8 text-center" style={{ fontFamily: sans, color: TM }}>
          Add at least 2 tickers to compare.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-[11px] uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: sans, color: TM }}>Loading comparison…</div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* ──── Snapshot Cards with inline 52-week range ──── */}
          <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: `repeat(${Math.min(data.tickers.length, 5)}, 1fr)` }}>
            {data.tickers.map((t, i) => {
              const f = data.fundamentals[t];
              const price = f?.currentPrice as number | null;
              const ytd = data.periodReturns?.[t]?.["YTD"];
              const oneY = data.periodReturns?.[t]?.["1Y"];
              const low52 = f?.fiftyTwoWeekLow as number | null;
              const high52 = f?.fiftyTwoWeekHigh as number | null;
              return (
                <div key={t} className="border p-3" style={{ borderColor: COLORS[i], borderWidth: 2, background: BG_COLORS[i] }}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <Link href={`/stocks/${t}`} className="text-[14px] font-black hover:underline" style={{ fontFamily: mono, color: COLORS[i] }}>{t}</Link>
                    <span className="text-[9px] truncate" style={{ fontFamily: sans, color: TM }}>{f?.shortName}</span>
                  </div>
                  {price && <div className="text-[18px] font-bold tabular-nums" style={{ fontFamily: mono, color: INK }}>${price.toFixed(2)}</div>}
                  <div className="flex gap-3 mt-1">
                    {ytd != null && (
                      <span className="text-[9px]" style={{ fontFamily: mono }}>
                        <span style={{ color: TM }}>YTD </span>
                        <span style={{ color: retColor(ytd), fontWeight: 700 }}>{ytd > 0 ? "+" : ""}{ytd.toFixed(1)}%</span>
                      </span>
                    )}
                    {oneY != null && (
                      <span className="text-[9px]" style={{ fontFamily: mono }}>
                        <span style={{ color: TM }}>1Y </span>
                        <span style={{ color: retColor(oneY), fontWeight: 700 }}>{oneY > 0 ? "+" : ""}{oneY.toFixed(1)}%</span>
                      </span>
                    )}
                  </div>
                  {price && low52 && high52 && (
                    <div className="mt-2">
                      <RangeBar current={price} low={low52} high={high52} color={COLORS[i]} ticker={t} />
                    </div>
                  )}
                  <div className="text-[8px] mt-1.5" style={{ fontFamily: sans, color: TM }}>
                    {f?.sector}{f?.sector && f?.industry ? " · " : ""}{f?.industry}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ──── Price Chart + Performance Returns ──── */}
          <div className="grid md:grid-cols-[1fr_auto] gap-4 mb-5 items-start">
            <div>
              <WSJSection title="Normalized Price (Rebased to 100)" />
              <div className="border p-3" style={{ borderColor: GRY, background: WHT }}>
                <PriceChart data={data} />
              </div>
            </div>
            {data.periodReturns && Object.keys(data.periodReturns).length > 0 && (
              <div className="min-w-0">
                <WSJSection title="Performance Returns" />
                <div className="border p-3 overflow-x-auto" style={{ borderColor: GRY, background: WHT }}>
                  <table className="text-[11px] border-collapse" style={{ fontFamily: mono }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${INK}` }}>
                        <th className="text-left py-1.5 px-1.5 text-[8px] uppercase tracking-wider font-extrabold" style={{ fontFamily: sans, color: TM }}></th>
                        {PERIOD_ORDER.map((p) => (
                          <th key={p} className="text-right py-1.5 px-2 text-[8px] uppercase tracking-wider font-extrabold" style={{ fontFamily: sans, color: TM }}>{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.tickers.map((t, ti) => (
                        <tr key={t} className="hover:bg-[var(--wsj-bg)] transition-colors" style={{ borderBottom: `1px solid ${GRY}` }}>
                          <td className="py-1.5 px-1.5 font-bold text-[10px]" style={{ color: COLORS[ti] }}>{t}</td>
                          {PERIOD_ORDER.map((p) => {
                            const v = data.periodReturns[t]?.[p];
                            return (
                              <td key={p} className="py-1.5 px-2 text-right tabular-nums font-bold text-[10px]" style={{ color: v != null ? retColor(v) : TM }}>
                                {v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ──── Two-column: Radar + Risk-Return ──── */}
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <div>
              <WSJSection title="Fundamentals Radar" />
              <div className="border p-3" style={{ borderColor: GRY, background: WHT }}>
                <RadarChart data={data} tickers={data.tickers} />
                <div className="flex flex-wrap justify-center gap-3 mt-1">
                  {data.tickers.map((t, i) => (
                    <span key={t} className="text-[9px] font-bold" style={{ fontFamily: mono, color: COLORS[i] }}>● {t}</span>
                  ))}
                </div>
              </div>
            </div>
            {data.riskMetrics && (
              <div>
                <WSJSection title="Risk vs. Return" />
                <div className="border p-3" style={{ borderColor: GRY, background: WHT }}>
                  <RiskReturnScatter data={data} tickers={data.tickers} />
                  <p className="text-[8px] mt-1 text-center" style={{ fontFamily: sans, color: TM }}>
                    Annualized 5-year metrics · Top-left = best risk-adjusted
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ──── Key Metrics Bars ──── */}
          <WSJSection title="Key Metrics Comparison" />
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 mb-5 border p-4" style={{ borderColor: GRY, background: WHT }}>
            {BAR_METRICS.filter((m) => data.tickers.some((t) => data.fundamentals[t]?.[m.key] != null)).map((m) => (
              <HBar key={m.key} tickers={data.tickers} data={data} metric={m} />
            ))}
          </div>

          {/* ──── Two-column: Correlation Matrix + Hex Density ──── */}
          {data.tickers.length >= 2 && (
            <div className="grid md:grid-cols-[minmax(200px,340px)_1fr] gap-5 mb-5 items-start">
              {data.correlation && Object.keys(data.correlation).length >= 2 && (
                <div>
                  <WSJSection title="Correlation Matrix" />
                  <div className="border p-3" style={{ borderColor: GRY, background: WHT }}>
                    <CorrelationHeatmap data={data} tickers={data.tickers} />
                    <p className="text-[8px] mt-2 text-center" style={{ fontFamily: sans, color: TM }}>
                      Green = moves together · Red = inverse
                    </p>
                  </div>
                </div>
              )}
              <div>
                <WSJSection title="Hexagonal Density Plot" />
                <p className="text-[9px] mb-1.5 -mt-1" style={{ fontFamily: sans, color: TM }}>
                  Daily return pairs · Darker = more overlap
                </p>
                <HexDensityPlot data={data} />
              </div>
            </div>
          )}

          {/* ──── Fundamentals Table ──── */}
          <WSJSection title="Full Fundamentals" />
          {metricKeys.length > 0 && (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-[11px] border-collapse" style={{ fontFamily: mono }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${INK}` }}>
                    <th className="text-left py-1.5 px-2 text-[8px] uppercase tracking-wider font-extrabold" style={{ fontFamily: sans, color: TM, minWidth: 120 }}>Metric</th>
                    {data.tickers.map((t, i) => (
                      <th key={t} className="text-right py-1.5 px-2 text-[8px] uppercase tracking-wider font-extrabold" style={{ fontFamily: sans, color: COLORS[i], minWidth: 90 }}>
                        <Link href={`/stocks/${t}`} className="hover:underline">{t}</Link>
                        <div className="text-[7px] font-normal" style={{ color: TM }}>{data.fundamentals[t]?.shortName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metricKeys.map((key) => (
                    <tr key={key} className="hover:bg-[var(--wsj-bg)] transition-colors" style={{ borderBottom: `1px solid ${GRY}` }}>
                      <td className="py-1 px-2 text-left text-[10px]" style={{ fontFamily: serif, color: INK }}>{METRIC_LABELS[key]}</td>
                      {data.tickers.map((t) => {
                        const val = data.fundamentals[t]?.[key];
                        return (
                          <td key={t} className="py-1 px-2 text-right tabular-nums" style={{ color: INK }}>{fmtMetric(key, val)}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </WSJLayout>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <ComparePageInner />
    </Suspense>
  );
}
