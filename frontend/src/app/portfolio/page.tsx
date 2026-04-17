"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import WSJLayout from "@/components/WSJLayout";
import { formatCurrency } from "@/lib/format";
import {
  WHT, INK, GRY, T2, TM, GAIN, LOSS,
  serif, mono, sans,
  Hair, HeavyRule,
} from "@/lib/wsj";
import {
  fetchPortfolioAnalysis,
  fetchWhatIfAnalysis,
  type PortfolioAnalysis,
  type PortfolioHoldingResult,
  type PortfolioAttribution,
  type PortfolioRiskContribution,
  type EfficientFrontierPoint,
  type EfficientFrontierMeta,
  type PortfolioFactorExposure,
  type RiskParityWeight,
  type RiskParitySummary,
  type DividendPayment,
  type DividendMonthly,
  type WhatIfResult,
} from "@/lib/api";
import { usePortfolio, type Holding } from "@/lib/usePortfolio";
import {
  usePortfolioAlerts,
  requestNotificationPermission,
  checkAlerts,
  alertLabel,
  type AlertType,
  type AlertCheckData,
} from "@/lib/usePortfolioAlerts";
import TickerAutocomplete from "@/components/TickerAutocomplete";
import { DEFAULT_PORTFOLIO_BENCHMARK, PORTFOLIO_BENCHMARKS } from "@/lib/benchmarks";
import {
  DEFAULT_PORTFOLIO_SAMPLE_TICKER,
  DEFAULT_PORTFOLIO_SECONDARY_SAMPLE_TICKER,
  DEFAULT_PORTFOLIO_WHAT_IF_TICKER,
} from "./portfolioDefaults";

/* ????????????????????????????????????????????????????????????   Constants
   ????????????????????????????????????????????????????????????*/

const PERIODS = [
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "5Y", value: "5y" },
];

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#1565c0",
  Healthcare: "#2e7d32",
  "Financial Services": "#e65100",
  "Consumer Cyclical": "#6a1b9a",
  "Communication Services": "#00838f",
  Industrials: "#ad1457",
  "Consumer Defensive": "#558b2f",
  Energy: "#4527a0",
  "Real Estate": "#bf360c",
  "Basic Materials": "#795548",
  Utilities: "#00695c",
  Unknown: "#9e9e9e",
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ????????????????????????????????????????????????????????????   Shared hook: responsive SVG width
   ????????????????????????????????????????????????????????????*/
function useResponsiveWidth(minW = 280) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(el.clientWidth, minW));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minW]);
  return { ref, w };
}

/* ????????????????????????????????????????????????????????????   Equity Curve + Benchmark + Drawdown + Moving Averages
   ????????????????????????????????????????????????????????????*/

function computeMA(vals: number[], window: number): (number | null)[] {
  return vals.map((_, i) => {
    if (i < window - 1) return null;
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += vals[j];
    return sum / window;
  });
}

interface CrossSignal { index: number; type: "golden" | "death"; }

function detectCrosses(ma50: (number | null)[], ma200: (number | null)[]): CrossSignal[] {
  const signals: CrossSignal[] = [];
  for (let i = 1; i < ma50.length; i++) {
    const prev50 = ma50[i - 1], prev200 = ma200[i - 1];
    const cur50 = ma50[i], cur200 = ma200[i];
    if (prev50 == null || prev200 == null || cur50 == null || cur200 == null) continue;
    if (prev50 <= prev200 && cur50 > cur200) signals.push({ index: i, type: "golden" });
    if (prev50 >= prev200 && cur50 < cur200) signals.push({ index: i, type: "death" });
  }
  return signals;
}

function EquityCurveSVG({ data, drawdown, benchmark }: {
  data: { date: string; value: number }[];
  drawdown: { date: string; drawdown: number }[];
  benchmark: { date: string; value: number }[];
}) {
  const { ref, w } = useResponsiveWidth();
  const h = Math.max(Math.round(w * 0.40), 280);
  const m = { top: 22, right: 55, bottom: 38, left: 72 };
  const pw = w - m.left - m.right;
  const topH = Math.round((h - m.top - m.bottom) * 0.64);
  const botH = Math.round((h - m.top - m.bottom) * 0.28);
  const gap = Math.round((h - m.top - m.bottom) * 0.08);

  const norm = (arr: { date: string; value: number }[]) => {
    if (!arr.length) return [];
    const base = arr[0].value || 1;
    return arr.map(d => ({ date: d.date, value: (d.value / base) * 100 }));
  };
  const normData = useMemo(() => norm(data), [data]);
  const normBench = useMemo(() => norm(benchmark), [benchmark]);

  // Moving averages on normalized equity curve
  const ma50 = useMemo(() => computeMA(normData.map(d => d.value), 50), [normData]);
  const ma200 = useMemo(() => computeMA(normData.map(d => d.value), 200), [normData]);
  const crosses = useMemo(() => detectCrosses(ma50, ma200), [ma50, ma200]);

  const allVals = [
    ...normData.map(d => d.value),
    ...normBench.map(d => d.value),
    ...ma50.filter((v): v is number => v !== null),
    ...ma200.filter((v): v is number => v !== null),
  ];
  const vMin = allVals.length ? Math.min(...allVals) * 0.97 : 90;
  const vMax = allVals.length ? Math.max(...allVals) * 1.03 : 110;
  const ddVals = drawdown.map(d => d.drawdown);
  const ddMin = ddVals.length ? Math.min(...ddVals, -1) : -10;

  const sx = (i: number) => m.left + (pw * i) / (data.length - 1 || 1);
  const sy = (v: number) => m.top + topH - (topH * (v - vMin)) / (vMax - vMin || 1);
  const syDD = (v: number) => m.top + topH + gap + botH - (botH * (v - ddMin)) / (0 - ddMin || 1);

  const makePath = (arr: { value: number }[]) =>
    arr.map((d, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(d.value).toFixed(1)}`).join("");

  const makeMAPath = (vals: (number | null)[]) => {
    let started = false;
    return vals.map((v, i) => {
      if (v == null) { started = false; return ""; }
      const cmd = started ? "L" : "M";
      started = true;
      return `${cmd}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`;
    }).join("");
  };

  const eqPath = normData.length ? makePath(normData) : "";
  const benchPath = normBench.length ? makePath(normBench) : "";
  const ma50Path = makeMAPath(ma50);
  const ma200Path = makeMAPath(ma200);
  const ddPath = drawdown.map((d, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${syDD(d.drawdown).toFixed(1)}`).join("");
  const ddFill = drawdown.length ? `${ddPath}L${sx(drawdown.length - 1).toFixed(1)},${syDD(0).toFixed(1)}L${sx(0).toFixed(1)},${syDD(0).toFixed(1)}Z` : "";

  const yTicks = 5;
  const valStep = (vMax - vMin) / (yTicks - 1);
  const ddStep = (0 - ddMin) / 3;

  const xLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(data.length / 6));
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  const [hover, setHover] = useState<number | null>(null);

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={h} style={{ fontFamily: mono }}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left - m.left;
          const idx = Math.round((x / pw) * (data.length - 1));
          setHover(idx >= 0 && idx < data.length ? idx : null);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <rect x={m.left} y={m.top} width={pw} height={topH} fill="#faf8f3" stroke={GRY} />
        {Array.from({ length: yTicks }, (_, i) => {
          const v = vMin + i * valStep;
          const y = sy(v);
          return (
            <g key={`yt${i}`}>
              <line x1={m.left} x2={m.left + pw} y1={y} y2={y} stroke="#e0e0e0" strokeDasharray="3 3" />
              <text x={m.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill={TM}>{v.toFixed(0)}</text>
            </g>
          );
        })}
        {benchPath && <path d={benchPath} fill="none" stroke="#9e9e9e" strokeWidth={1.5} strokeDasharray="4 3" />}
        {ma200Path && <path d={ma200Path} fill="none" stroke="#e65100" strokeWidth={1.2} strokeDasharray="6 3" opacity={0.7} />}
        {ma50Path && <path d={ma50Path} fill="none" stroke="#2e7d32" strokeWidth={1.2} strokeDasharray="4 2" opacity={0.7} />}
        {eqPath && <path d={eqPath} fill="none" stroke="#1565c0" strokeWidth={2} />}

        {/* Golden / Death cross markers */}
        {crosses.map((c, ci) => {
          const v = ma50[c.index];
          if (v == null) return null;
          const cx = sx(c.index);
          const cy = sy(v);
          const isGolden = c.type === "golden";
          return (
            <g key={`cross${ci}`}>
              <circle cx={cx} cy={cy} r={5} fill={isGolden ? "#ffd600" : "#c62828"} stroke={INK} strokeWidth={1} />
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize={7} fill={isGolden ? "#e65100" : "#c62828"} fontWeight={700}>
                {isGolden ? "GC" : "DC"}
              </text>
            </g>
          );
        })}

        <rect x={m.left} y={m.top + topH + gap} width={pw} height={botH} fill="#faf8f3" stroke={GRY} />
        {ddFill && <path d={ddFill} fill="rgba(198,40,40,0.15)" />}
        {ddPath && <path d={ddPath} fill="none" stroke="#c62828" strokeWidth={1.5} />}
        <line x1={m.left} x2={m.left + pw} y1={syDD(0)} y2={syDD(0)} stroke={TM} strokeDasharray="3 3" />
        {[1, 2, 3].map(i => {
          const v = ddMin + i * ddStep;
          return (
            <g key={`ddt${i}`}>
              <line x1={m.left} x2={m.left + pw} y1={syDD(v)} y2={syDD(v)} stroke="#e0e0e0" strokeDasharray="3 3" />
              <text x={m.left - 6} y={syDD(v) + 3} textAnchor="end" fontSize={9} fill={TM}>{v.toFixed(1)}%</text>
            </g>
          );
        })}

        {xLabels.map(d => {
          const i = data.findIndex(p => p.date === d.date);
          return (
            <text key={d.date} x={sx(i)} y={m.top + topH + gap + botH + 14} textAnchor="middle" fontSize={8} fill={TM}>
              {d.date.slice(5)}
            </text>
          );
        })}

        {/* Legend */}
        <line x1={m.left + 4} x2={m.left + 20} y1={m.top + 10} y2={m.top + 10} stroke="#1565c0" strokeWidth={2} />
        <text x={m.left + 24} y={m.top + 13} fontSize={9} fill={T2}>Portfolio</text>
        {benchPath && (
          <>
            <line x1={m.left + 90} x2={m.left + 106} y1={m.top + 10} y2={m.top + 10} stroke="#9e9e9e" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={m.left + 110} y={m.top + 13} fontSize={9} fill={TM}>Benchmark</text>
          </>
        )}
        {ma50Path && (
          <>
            <line x1={m.left + 180} x2={m.left + 196} y1={m.top + 10} y2={m.top + 10} stroke="#2e7d32" strokeWidth={1.2} strokeDasharray="4 2" />
            <text x={m.left + 200} y={m.top + 13} fontSize={9} fill="#2e7d32">50d MA</text>
          </>
        )}
        {ma200Path && (
          <>
            <line x1={m.left + 250} x2={m.left + 266} y1={m.top + 10} y2={m.top + 10} stroke="#e65100" strokeWidth={1.2} strokeDasharray="6 3" />
            <text x={m.left + 270} y={m.top + 13} fontSize={9} fill="#e65100">200d MA</text>
          </>
        )}
        <text x={m.left + 4} y={m.top + topH + gap + 12} fontSize={9} fill="#c62828" fontWeight={600}>Drawdown %</text>

        {hover !== null && hover >= 0 && hover < data.length && (() => {
          const flipLeft = sx(hover) + 190 > w - m.right;
          const tx = flipLeft ? sx(hover) - 188 : sx(hover) + 8;
          const ttx = flipLeft ? sx(hover) - 182 : sx(hover) + 14;
          const hVal = normData[hover]?.value ?? 0;
          const h50 = ma50[hover];
          const h200 = ma200[hover];
          const tooltipH = 44 + (h50 != null ? 12 : 0);
          return (
            <g>
              <line x1={sx(hover)} x2={sx(hover)} y1={m.top} y2={m.top + topH + gap + botH} stroke={INK} strokeDasharray="2 2" opacity={0.5} />
              <circle cx={sx(hover)} cy={sy(hVal)} r={4} fill="#1565c0" stroke="#fff" strokeWidth={1.5} />
              <rect x={tx} y={sy(hVal) - 32} width={180} height={tooltipH} rx={3} fill="rgba(26,26,26,0.92)" />
              <text x={ttx} y={sy(hVal) - 18} fontSize={9} fill="#fff">{data[hover].date}</text>
              <text x={ttx} y={sy(hVal) - 6} fontSize={9} fill="#ccc">
                ${data[hover].value.toLocaleString(undefined, { maximumFractionDigits: 0 })} | DD: {drawdown[hover]?.drawdown.toFixed(2)}%
              </text>
              {h50 != null && (
                <text x={ttx} y={sy(hVal) + 6} fontSize={8} fill="#aaa">
                  MA50: {h50.toFixed(1)} | MA200: {h200 != null ? h200.toFixed(1) : "--"}
                </text>
              )}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/* ????????????????????????????????????????????????????????????   Rolling Volatility SVG
   ????????????????????????????????????????????????????????????*/
function RollingVolSVG({ data }: { data: { date: string; volatility: number }[] }) {
  const { ref, w } = useResponsiveWidth();
  const h = Math.max(Math.round(w * 0.20), 140);
  const m = { top: 15, right: 30, bottom: 25, left: 55 };
  const pw = w - m.left - m.right;
  const ph = h - m.top - m.bottom;
  const vals = data.map(d => d.volatility);
  const vMax = Math.max(...vals) * 1.1 || 10;
  const sx = (i: number) => m.left + (pw * i) / (data.length - 1 || 1);
  const sy = (v: number) => m.top + ph - (ph * v) / (vMax || 1);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(d.volatility).toFixed(1)}`).join("");
  const fill = `${path}L${sx(data.length - 1).toFixed(1)},${sy(0).toFixed(1)}L${sx(0).toFixed(1)},${sy(0).toFixed(1)}Z`;

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={h} style={{ fontFamily: mono }}>
        <rect x={m.left} y={m.top} width={pw} height={ph} fill="#faf8f3" stroke={GRY} />
        {[0, 1, 2, 3, 4].map(i => {
          const v = (vMax / 4) * i;
          return (
            <g key={i}>
              <line x1={m.left} x2={m.left + pw} y1={sy(v)} y2={sy(v)} stroke="#e0e0e0" strokeDasharray="3 3" />
              <text x={m.left - 6} y={sy(v) + 3} textAnchor="end" fontSize={9} fill={TM}>{v.toFixed(0)}%</text>
            </g>
          );
        })}
        <path d={fill} fill="rgba(21,101,192,0.1)" />
        <path d={path} fill="none" stroke="#1565c0" strokeWidth={1.5} />
        <text x={m.left + 4} y={m.top + 11} fontSize={9} fill={T2} fontWeight={600}>30-Day Rolling Vol (Ann.)</text>
      </svg>
    </div>
  );
}

/* ????????????????????????????????????????????????????????????   Correlation Heatmap SVG
   ????????????????????????????????????????????????????????????*/
function CorrHeatmapSVG({ tickers, matrix }: { tickers: string[]; matrix: number[][] }) {
  const n = tickers.length;
  const cell = Math.min(48, Math.max(28, Math.floor(480 / n)));
  const labelW = 55;
  const w = labelW + n * cell + 10;
  const h = labelW + n * cell + 10;
  const color = (v: number) => {
    if (v >= 0.8) return "#c62828";
    if (v >= 0.5) return "#ef6c00";
    if (v >= 0.2) return "#f9a825";
    if (v >= -0.2) return "#e0e0e0";
    if (v >= -0.5) return "#81d4fa";
    return "#1565c0";
  };
  return (
    <svg width={w} height={h} style={{ fontFamily: mono, maxWidth: "100%", height: "auto" }} viewBox={`0 0 ${w} ${h}`}>
      {tickers.map((t, i) => (
        <text key={`r${i}`} x={labelW - 4} y={labelW + i * cell + cell / 2 + 3} textAnchor="end" fontSize={9} fill={T2}>{t}</text>
      ))}
      {tickers.map((t, i) => (
        <text key={`c${i}`} x={labelW + i * cell + cell / 2} y={labelW - 6} textAnchor="middle" fontSize={9} fill={T2}>{t}</text>
      ))}
      {matrix.map((row, i) => row.map((v, j) => (
        <g key={`${i}-${j}`}>
          <rect x={labelW + j * cell} y={labelW + i * cell} width={cell - 1} height={cell - 1} fill={color(v)} rx={2} opacity={0.85} />
          {cell >= 32 && (
            <text x={labelW + j * cell + cell / 2 - 0.5} y={labelW + i * cell + cell / 2 + 3} textAnchor="middle" fontSize={8} fill={v > 0.6 || v < -0.3 ? "#fff" : "#333"}>
              {v.toFixed(2)}
            </text>
          )}
        </g>
      )))}
    </svg>
  );
}

/* ????????????????????????????????????????????????????????????   Sector Donut
   ????????????????????????????????????????????????????????????*/
function SectorDonut({ sectors }: { sectors: { sector: string; weight: number }[] }) {
  const size = 200;
  const cx = size / 2, cy = size / 2, r = 80, ir = 50;
  let cumAngle = -Math.PI / 2;
  const slices = sectors.map(s => {
    const angle = (s.weight / 100) * 2 * Math.PI;
    const start = cumAngle;
    cumAngle += angle;
    return { ...s, start, end: cumAngle, angle };
  });
  const arcPath = (sa: number, ea: number, oR: number, iR: number) => {
    const [x1, y1] = [cx + oR * Math.cos(sa), cy + oR * Math.sin(sa)];
    const [x2, y2] = [cx + oR * Math.cos(ea), cy + oR * Math.sin(ea)];
    const [x3, y3] = [cx + iR * Math.cos(ea), cy + iR * Math.sin(ea)];
    const [x4, y4] = [cx + iR * Math.cos(sa), cy + iR * Math.sin(sa)];
    const large = ea - sa > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${oR},${oR} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${iR},${iR} 0 ${large} 0 ${x4},${y4} Z`;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: "100%" }}>
      {slices.map(s => {
        if (s.angle >= 2 * Math.PI - 0.001) {
          const mid = s.start + Math.PI;
          return (
            <g key={s.sector}>
              <path d={arcPath(s.start, mid, r, ir)} fill={SECTOR_COLORS[s.sector] || "#9e9e9e"} stroke={WHT} strokeWidth={2}><title>{s.sector}: {s.weight.toFixed(1)}%</title></path>
              <path d={arcPath(mid, s.end, r, ir)} fill={SECTOR_COLORS[s.sector] || "#9e9e9e"} stroke={WHT} strokeWidth={2}><title>{s.sector}: {s.weight.toFixed(1)}%</title></path>
            </g>
          );
        }
        return (
          <path key={s.sector} d={arcPath(s.start, s.end, r, ir)} fill={SECTOR_COLORS[s.sector] || "#9e9e9e"} stroke={WHT} strokeWidth={2}>
            <title>{s.sector}: {s.weight.toFixed(1)}%</title>
          </path>
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={9} fill={TM} style={{ fontFamily: sans }}>Sectors</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={11} fill={INK} fontWeight={700}>{sectors.length}</text>
    </svg>
  );
}

/* ????????????????????????????????????????????????????????????   Monthly Returns Heatmap
   ????????????????????????????????????????????????????????????*/
function MonthlyReturnsHeatmap({ data }: { data: { year: number; month: number; return: number }[] }) {
  if (!data.length) return null;
  const years = [...new Set(data.map(d => d.year))].sort();
  const lookup: Record<string, number> = {};
  data.forEach(d => { lookup[`${d.year}-${d.month}`] = d.return; });

  const cellW = 52, cellH = 28, labelW = 46, headerH = 22;
  const w = labelW + 12 * cellW + 8;
  const h = headerH + years.length * cellH + 8;

  const heatColor = (v: number) => {
    if (v > 5) return "#1b5e20";
    if (v > 2) return "#4caf50";
    if (v > 0) return "#c8e6c9";
    if (v > -2) return "#ffcdd2";
    if (v > -5) return "#e53935";
    return "#b71c1c";
  };
  const textColor = (v: number) => (Math.abs(v) > 2 ? "#fff" : "#333");

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={w} height={h} style={{ fontFamily: mono, minWidth: w }}>
        {MONTH_LABELS.map((m, i) => (
          <text key={m} x={labelW + i * cellW + cellW / 2} y={headerH - 6} textAnchor="middle" fontSize={9} fill={TM}>{m}</text>
        ))}
        {years.map((yr, yi) => (
          <g key={yr}>
            <text x={labelW - 6} y={headerH + yi * cellH + cellH / 2 + 3} textAnchor="end" fontSize={9} fill={T2}>{yr}</text>
            {Array.from({ length: 12 }, (_, mi) => {
              const key = `${yr}-${mi + 1}`;
              const v = lookup[key];
              return v !== undefined ? (
                <g key={key}>
                  <rect x={labelW + mi * cellW} y={headerH + yi * cellH} width={cellW - 1} height={cellH - 1}
                    rx={3} fill={heatColor(v)} />
                  <text x={labelW + mi * cellW + cellW / 2} y={headerH + yi * cellH + cellH / 2 + 3}
                    textAnchor="middle" fontSize={8} fill={textColor(v)}>
                    {v > 0 ? "+" : ""}{v.toFixed(1)}%
                  </text>
                </g>
              ) : (
                <rect key={key} x={labelW + mi * cellW} y={headerH + yi * cellH} width={cellW - 1} height={cellH - 1}
                  rx={3} fill="#f5f5f5" />
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ????????????????????????????????????????????????????????????   Attribution Bar Chart
   ????????????????????????????????????????????????????????????*/
function AttributionBars({ data }: { data: PortfolioAttribution[] }) {
  if (!data.length) return null;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.contribution)), 0.01);
  const barH = 24;
  const h = data.length * barH + 28;
  const labelW = 52;
  const { ref, w: fullW } = useResponsiveWidth(300);
  const chartW = fullW - labelW - 60;
  const midX = labelW + chartW / 2;

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={fullW} height={h} style={{ fontFamily: mono }}>
        <line x1={midX} x2={midX} y1={20} y2={h - 8} stroke={GRY} />
        <text x={midX} y={14} textAnchor="middle" fontSize={8} fill={TM}>0%</text>
        {data.map((d, i) => {
          const barW = (Math.abs(d.contribution) / maxAbs) * (chartW / 2 - 10);
          const x = d.contribution >= 0 ? midX : midX - barW;
          const color = d.contribution >= 0 ? GAIN : LOSS;
          return (
            <g key={d.ticker}>
              <text x={labelW - 4} y={24 + i * barH + barH / 2 + 3} textAnchor="end" fontSize={9} fill={T2}>{d.ticker}</text>
              <rect x={x} y={24 + i * barH + 3} width={barW} height={barH - 6} rx={2} fill={color} opacity={0.75} />
              <text x={d.contribution >= 0 ? x + barW + 4 : x - 4} y={24 + i * barH + barH / 2 + 3}
                textAnchor={d.contribution >= 0 ? "start" : "end"} fontSize={8} fill={color}>
                {d.contribution > 0 ? "+" : ""}{d.contribution.toFixed(2)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ????????????????????????????????????????????????????????????   Holdings Treemap
   ????????????????????????????????????????????????????????????*/
function HoldingsTreemap({ holdings }: { holdings: PortfolioHoldingResult[] }) {
  const { ref, w } = useResponsiveWidth(300);
  const h = Math.max(Math.round(w * 0.28), 180);
  if (!holdings.length) return null;
  const sorted = [...holdings].sort((a, b) => b.weight - a.weight);
  const totalW = sorted.reduce((a, h) => a + h.weight, 0) || 100;

  type Rect = { x: number; y: number; w: number; h: number; holding: PortfolioHoldingResult };
  const rects: Rect[] = [];
  let rx = 0, ry = 0, rw = w, rh = h;
  const remaining = [...sorted];

  while (remaining.length > 0) {
    if (remaining.length === 1) {
      rects.push({ x: rx, y: ry, w: rw, h: rh, holding: remaining.pop()! });
      break;
    }
    const take = Math.max(1, Math.ceil(remaining.length / 2));
    const row = remaining.splice(0, take);
    const rowWeight = row.reduce((a, h) => a + h.weight, 0);
    const rowFrac = rowWeight / totalW;
    const isHoriz = rw >= rh;
    const rowSize = isHoriz ? rw * rowFrac : rh * rowFrac;
    let offset = 0;
    const rowTotal = row.reduce((a, h) => a + h.weight, 0) || 1;
    for (const item of row) {
      const frac = item.weight / rowTotal;
      if (isHoriz) {
        const ih = rh * frac;
        rects.push({ x: rx, y: ry + offset, w: rowSize, h: ih, holding: item });
        offset += ih;
      } else {
        const iw = rw * frac;
        rects.push({ x: rx + offset, y: ry, w: iw, h: rowSize, holding: item });
        offset += iw;
      }
    }
    if (isHoriz) { rx += rowSize; rw -= rowSize; }
    else { ry += rowSize; rh -= rowSize; }
  }

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={h} style={{ fontFamily: mono }}>
        {rects.map((r, i) => {
          const color = SECTOR_COLORS[r.holding.sector] || "#9e9e9e";
          const isGain = r.holding.gainPct >= 0;
          return (
            <g key={i}>
              <rect x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} fill={color} rx={3} opacity={0.85} />
              {r.w > 44 && r.h > 28 && (
                <>
                  <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 3} textAnchor="middle" fontSize={Math.min(12, r.w / 5)} fill="#fff" fontWeight={700}>{r.holding.ticker}</text>
                  <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 10} textAnchor="middle" fontSize={Math.min(9, r.w / 7)} fill={isGain ? "#c8e6c9" : "#ffcdd2"}>
                    {r.holding.weight.toFixed(1)}% | {isGain ? "+" : ""}{r.holding.gainPct.toFixed(1)}%
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ????????????????????????????????????????????????????????????   Small Stat Card
   ????????????????????????????????????????????????????????????*/
function StatCard({ label, value, color = INK, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ padding: "10px 12px", border: `1px solid ${GRY}`, borderRadius: 3, background: WHT }}>
      <div style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: TM, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontFamily: sans, fontSize: 9, color: TM, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ????????????????????????????????????????????????????????????   Risk Contribution Bar Chart
   ????????????????????????????????????????????????????????????*/
function RiskContributionBars({ data }: { data: PortfolioRiskContribution[] }) {
  if (!data.length) return null;
  const maxPct = Math.max(...data.map(d => Math.abs(d.pctContribution)), 0.01);
  const barH = 24;
  const h = data.length * barH + 28;
  const labelW = 52;
  const { ref, w: fullW } = useResponsiveWidth(300);
  const chartW = fullW - labelW - 60;

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={fullW} height={h} style={{ fontFamily: mono }}>
        {data.map((d, i) => {
          const barW = (d.pctContribution / maxPct) * (chartW - 10);
          return (
            <g key={d.ticker}>
              <text x={labelW - 4} y={24 + i * barH + barH / 2 + 3} textAnchor="end" fontSize={9} fill={T2}>{d.ticker}</text>
              <rect x={labelW} y={24 + i * barH + 3} width={Math.max(0, barW)} height={barH - 6} rx={2}
                fill={d.pctContribution > 25 ? LOSS : "#1565c0"} opacity={0.75} />
              <text x={labelW + Math.max(0, barW) + 4} y={24 + i * barH + barH / 2 + 3}
                fontSize={8} fill={T2}>
                {d.pctContribution.toFixed(1)}% ({d.ctr.toFixed(2)}%)
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ????????????????????????????????????????????????????????????   Efficient Frontier Scatter ??Sharpe-colored
   ????????????????????????????????????????????????????????????*/

/** Map Sharpe ratio to a color on a red ??yellow ??cyan ??blue scale. */
function sharpeColor(sharpe: number, sMin: number, sMax: number): string {
  const t = sMax > sMin ? (sharpe - sMin) / (sMax - sMin) : 0.5;
  const tc = Math.max(0, Math.min(1, t));
  // 4-stop: #c62828 (0) ??#f9a825 (0.33) ??#4dd0e1 (0.66) ??#1565c0 (1)
  if (tc < 0.33) {
    const u = tc / 0.33;
    const r = Math.round(198 + (249 - 198) * u);
    const g = Math.round(40 + (168 - 40) * u);
    const b = Math.round(40 + (37 - 40) * u);
    return `rgb(${r},${g},${b})`;
  } else if (tc < 0.66) {
    const u = (tc - 0.33) / 0.33;
    const r = Math.round(249 + (77 - 249) * u);
    const g = Math.round(168 + (208 - 168) * u);
    const b = Math.round(37 + (225 - 37) * u);
    return `rgb(${r},${g},${b})`;
  } else {
    const u = (tc - 0.66) / 0.34;
    const r = Math.round(77 + (21 - 77) * u);
    const g = Math.round(208 + (101 - 208) * u);
    const b = Math.round(225 + (192 - 225) * u);
    return `rgb(${r},${g},${b})`;
  }
}

function EfficientFrontierSVG({ data, meta }: { data: EfficientFrontierPoint[]; meta: EfficientFrontierMeta }) {
  const { ref, w } = useResponsiveWidth(340);
  const h = Math.max(Math.round(w * 0.52), 300);
  const legendW = 48;
  const m = { top: 30, right: 14 + legendW, bottom: 44, left: 62 };
  const pw = w - m.left - m.right;
  const ph = h - m.top - m.bottom;

  // Categorize points
  const cloud = data.filter(d => !d.label);
  const stocks = data.filter(d => d.label && !["Current", "Equal Weight", "Max Sharpe", "Min Volatility"].includes(d.label));
  const current = data.find(d => d.label === "Current");
  const eqWeight = data.find(d => d.label === "Equal Weight");
  const maxSharpe = data.find(d => d.label === "Max Sharpe");
  const minVol = data.find(d => d.label === "Min Volatility");

  // Compute ranges
  const allRisks = data.map(d => d.risk);
  const allRets = data.map(d => d.return);
  const riskPad = (Math.max(...allRisks) - Math.min(...allRisks)) * 0.08 || 2;
  const retPad = (Math.max(...allRets) - Math.min(...allRets)) * 0.08 || 2;
  const riskMin = Math.min(...allRisks) - riskPad;
  const riskMax = Math.max(...allRisks) + riskPad;
  const retMin = Math.min(...allRets) - retPad;
  const retMax = Math.max(...allRets) + retPad;

  const allSharpes = data.map(d => d.sharpe).filter(s => isFinite(s));
  const sMin = allSharpes.length ? Math.min(...allSharpes) : 0;
  const sMax = allSharpes.length ? Math.max(...allSharpes) : 1;

  const sx = (v: number) => m.left + ((v - riskMin) / (riskMax - riskMin || 1)) * pw;
  const sy = (v: number) => m.top + ph - ((v - retMin) / (retMax - retMin || 1)) * ph;

  // Build CML line
  const cml = meta?.cml;
  const cmlPath = cml ? `M${sx(cml.startRisk).toFixed(1)},${sy(cml.startReturn).toFixed(1)} L${sx(cml.endRisk).toFixed(1)},${sy(cml.endReturn).toFixed(1)}` : "";

  // Build boundary curve (upper envelope)
  const boundary = meta?.boundary || [];
  const lowerBoundary = meta?.lowerBoundary || [];
  const boundaryPath = boundary.length > 1
    ? boundary.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.risk).toFixed(1)},${sy(p.return).toFixed(1)}`).join("")
    : "";
  const lowerBoundaryPath = lowerBoundary.length > 1
    ? lowerBoundary.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.risk).toFixed(1)},${sy(p.return).toFixed(1)}`).join("")
    : "";

  // Sharpe legend (vertical gradient bar)
  const legendX = w - legendW - 4;
  const legendY = m.top + 12;
  const legendH = ph - 24;
  const nLegendSteps = 60;

  // Hover state
  const [hover, setHover] = useState<EfficientFrontierPoint | null>(null);

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={h} style={{ fontFamily: mono }}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          // Find nearest point
          let best: EfficientFrontierPoint | null = null;
          let bestDist = 400;
          for (const d of data) {
            const dx = sx(d.risk) - mx;
            const dy = sy(d.return) - my;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) { bestDist = dist; best = d; }
          }
          setHover(best);
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Background */}
        <rect x={m.left} y={m.top} width={pw} height={ph} fill="#faf8f3" stroke={GRY} />

        {/* Grid lines */}
        {Array.from({ length: 6 }, (_, i) => {
          const v = riskMin + (i * (riskMax - riskMin)) / 5;
          return (
            <g key={`xg${i}`}>
              <line x1={sx(v)} x2={sx(v)} y1={m.top} y2={m.top + ph} stroke="#eee" strokeWidth={0.5} />
              <text x={sx(v)} y={m.top + ph + 14} textAnchor="middle" fontSize={8} fill={TM}>{v.toFixed(0)}%</text>
            </g>
          );
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const v = retMin + (i * (retMax - retMin)) / 5;
          return (
            <g key={`yg${i}`}>
              <line x1={m.left} x2={m.left + pw} y1={sy(v)} y2={sy(v)} stroke="#eee" strokeWidth={0.5} />
              <text x={m.left - 6} y={sy(v) + 3} textAnchor="end" fontSize={8} fill={TM}>{v.toFixed(0)}%</text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text x={m.left + pw / 2} y={h - 4} textAnchor="middle" fontSize={10} fill={T2} style={{ fontFamily: sans }}>
          Risk (Annualized Volatility %)
        </text>
        <text x={12} y={m.top + ph / 2} textAnchor="middle" fontSize={10} fill={T2}
          transform={`rotate(-90, 12, ${m.top + ph / 2})`} style={{ fontFamily: sans }}>
          Expected Return %
        </text>

        {/* Lower boundary (faint) */}
        {lowerBoundaryPath && (
          <path d={lowerBoundaryPath} fill="none" stroke="#bbb" strokeWidth={1.2} strokeDasharray="6 4" opacity={0.5} />
        )}

        {/* Upper boundary (efficient frontier curve) */}
        {boundaryPath && (
          <path d={boundaryPath} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="8 5" />
        )}

        {/* CML ??Capital Market Line */}
        {cmlPath && (
          <path d={cmlPath} fill="none" stroke={INK} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />
        )}

        {/* Cloud points colored by Sharpe */}
        {cloud.map((d, i) => (
          <circle key={i} cx={sx(d.risk)} cy={sy(d.return)} r={2.2}
            fill={sharpeColor(d.sharpe, sMin, sMax)} opacity={0.65} />
        ))}

        {/* Individual stocks */}
        {stocks.map(d => (
          <g key={d.label}>
            <circle cx={sx(d.risk)} cy={sy(d.return)} r={5} fill={sharpeColor(d.sharpe, sMin, sMax)} stroke="#fff" strokeWidth={1.5} />
            <text x={sx(d.risk)} y={sy(d.return) - 8} textAnchor="middle" fontSize={8} fill={INK} fontWeight={600}>{d.label}</text>
          </g>
        ))}

        {/* Min Volatility */}
        {minVol && (
          <g>
            <line x1={sx(minVol.risk) - 7} x2={sx(minVol.risk) + 7} y1={sy(minVol.return) - 7} y2={sy(minVol.return) + 7} stroke="#2e7d32" strokeWidth={3} />
            <line x1={sx(minVol.risk) - 7} x2={sx(minVol.risk) + 7} y1={sy(minVol.return) + 7} y2={sy(minVol.return) - 7} stroke="#2e7d32" strokeWidth={3} />
            <text x={sx(minVol.risk) + 11} y={sy(minVol.return) + 4} fontSize={8} fill="#2e7d32" fontWeight={700}>EF min Vol</text>
          </g>
        )}

        {/* Max Sharpe */}
        {maxSharpe && (
          <g>
            <line x1={sx(maxSharpe.risk) - 7} x2={sx(maxSharpe.risk) + 7} y1={sy(maxSharpe.return) - 7} y2={sy(maxSharpe.return) + 7} stroke="#c62828" strokeWidth={3} />
            <line x1={sx(maxSharpe.risk) - 7} x2={sx(maxSharpe.risk) + 7} y1={sy(maxSharpe.return) + 7} y2={sy(maxSharpe.return) - 7} stroke="#c62828" strokeWidth={3} />
            <text x={sx(maxSharpe.risk) + 11} y={sy(maxSharpe.return) + 4} fontSize={8} fill="#c62828" fontWeight={700}>Max Sharpe</text>
          </g>
        )}

        {/* Equal weight */}
        {eqWeight && (
          <g>
            <circle cx={sx(eqWeight.risk)} cy={sy(eqWeight.return)} r={6} fill="none" stroke="#ef6c00" strokeWidth={2.5} />
            <text x={sx(eqWeight.risk) + 10} y={sy(eqWeight.return) + 4} fontSize={8} fill="#ef6c00" fontWeight={600}>Equal Wt.</text>
          </g>
        )}

        {/* Current portfolio */}
        {current && (
          <g>
            <polygon points={`${sx(current.risk)},${sy(current.return) - 9} ${sx(current.risk) - 7},${sy(current.return) + 5} ${sx(current.risk) + 7},${sy(current.return) + 5}`}
              fill={INK} stroke="#fff" strokeWidth={1.5} />
            <text x={sx(current.risk) + 10} y={sy(current.return) + 4} fontSize={9} fill={INK} fontWeight={700}>Initial Portfolio</text>
          </g>
        )}

        {/* Sharpe color legend */}
        <text x={legendX + 9} y={legendY - 4} fontSize={8} fill={T2} textAnchor="middle" style={{ fontFamily: sans }}>Sharpe</text>
        {Array.from({ length: nLegendSteps }, (_, i) => {
          const t = 1 - i / (nLegendSteps - 1);
          const sh = sMin + t * (sMax - sMin);
          const y = legendY + (i / nLegendSteps) * legendH;
          return (
            <rect key={i} x={legendX} y={y} width={18} height={legendH / nLegendSteps + 1}
              fill={sharpeColor(sh, sMin, sMax)} />
          );
        })}
        <rect x={legendX} y={legendY} width={18} height={legendH} fill="none" stroke={GRY} strokeWidth={0.5} />
        <text x={legendX + 22} y={legendY + 6} fontSize={7} fill={TM}>{sMax.toFixed(1)}</text>
        <text x={legendX + 22} y={legendY + legendH / 2 + 3} fontSize={7} fill={TM}>{((sMax + sMin) / 2).toFixed(1)}</text>
        <text x={legendX + 22} y={legendY + legendH} fontSize={7} fill={TM}>{sMin.toFixed(1)}</text>

        {/* Legend items */}
        {(() => {
          const lx = m.left + 6, ly = m.top + 8;
          return (
            <g>
              <line x1={lx} x2={lx + 10} y1={ly + 4} y2={ly - 4} stroke="#c62828" strokeWidth={2} />
              <line x1={lx} x2={lx + 10} y1={ly - 4} y2={ly + 4} stroke="#c62828" strokeWidth={2} />
              <text x={lx + 16} y={ly + 2} fontSize={8} fill={T2}>Max Sharpe</text>

              <line x1={lx} x2={lx + 10} y1={ly + 16} y2={ly + 8} stroke="#2e7d32" strokeWidth={2} />
              <line x1={lx} x2={lx + 10} y1={ly + 8} y2={ly + 16} stroke="#2e7d32" strokeWidth={2} />
              <text x={lx + 16} y={ly + 14} fontSize={8} fill={T2}>Min Volatility</text>

              <polygon points={`${lx + 5},${ly + 21} ${lx},${ly + 29} ${lx + 10},${ly + 29}`} fill={INK} />
              <text x={lx + 16} y={ly + 28} fontSize={8} fill={T2}>Your Portfolio</text>

              <circle cx={lx + 5} cy={ly + 37} r={4} fill="none" stroke="#ef6c00" strokeWidth={2} />
              <text x={lx + 16} y={ly + 40} fontSize={8} fill={T2}>Equal Weight</text>

              <circle cx={lx + 5} cy={ly + 50} r={4} fill="#1565c0" />
              <text x={lx + 16} y={ly + 53} fontSize={8} fill={T2}>Stocks</text>
            </g>
          );
        })()}

        {/* Hover tooltip */}
        {hover && (() => {
          const hx = sx(hover.risk);
          const hy = sy(hover.return);
          const flipLeft = hx + 160 > w - m.right;
          const tx = flipLeft ? hx - 156 : hx + 10;
          const ty = Math.max(m.top + 2, Math.min(hy - 28, m.top + ph - 42));
          return (
            <g>
              <circle cx={hx} cy={hy} r={5} fill="none" stroke={INK} strokeWidth={1.5} />
              <rect x={tx} y={ty} width={148} height={40} rx={3} fill="rgba(26,26,26,0.92)" />
              <text x={tx + 6} y={ty + 13} fontSize={9} fill="#fff" fontWeight={600}>
                {hover.label || "Random"} ??Sharpe: {hover.sharpe.toFixed(2)}
              </text>
              <text x={tx + 6} y={ty + 26} fontSize={8} fill="#ccc">
                Return: {hover.return.toFixed(1)}% | Risk: {hover.risk.toFixed(1)}%
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/* ????????????????????????????????????????????????????????????   Factor Exposure Radar Chart
   ????????????????????????????????????????????????????????????*/
const FACTOR_LABELS: { key: keyof PortfolioFactorExposure; label: string }[] = [
  { key: "growth", label: "Growth" },
  { key: "momentum", label: "Momentum" },
  { key: "quality", label: "Quality" },
  { key: "value", label: "Value" },
  { key: "volatility", label: "Low Vol" },
  { key: "size", label: "Size" },
];

function FactorRadarSVG({ data }: { data: PortfolioFactorExposure }) {
  const size = 260;
  const cx = size / 2, cy = size / 2;
  const maxR = 95;
  const n = FACTOR_LABELS.length;

  const angleOf = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  // Grid rings
  const rings = [20, 40, 60, 80, 100];

  // Data polygon
  const points = FACTOR_LABELS.map((f, i) => {
    const v = Math.min(100, Math.max(0, data[f.key] || 0));
    const r = (v / 100) * maxR;
    const a = angleOf(i);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), v };
  });
  const polyStr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ fontFamily: mono, maxWidth: "100%" }}>
      {/* Grid rings */}
      {rings.map(rv => {
        const r = (rv / 100) * maxR;
        const pts = Array.from({ length: n }, (_, i) => {
          const a = angleOf(i);
          return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
        }).join(" ");
        return <polygon key={rv} points={pts} fill="none" stroke="#e0e0e0" strokeWidth={0.5} />;
      })}
      {/* Spokes */}
      {FACTOR_LABELS.map((_, i) => {
        const a = angleOf(i);
        return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="#e0e0e0" strokeWidth={0.5} />;
      })}
      {/* Data polygon */}
      <polygon points={polyStr} fill="rgba(21,101,192,0.18)" stroke="#1565c0" strokeWidth={2} />
      {/* Data dots + labels */}
      {points.map((p, i) => {
        const a = angleOf(i);
        const lx = cx + (maxR + 18) * Math.cos(a);
        const ly = cy + (maxR + 18) * Math.sin(a);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="#1565c0" stroke="#fff" strokeWidth={1} />
            <text x={lx} y={ly + 3} textAnchor="middle" fontSize={9} fill={T2} fontWeight={600}>{FACTOR_LABELS[i].label}</text>
            <text x={lx} y={ly + 14} textAnchor="middle" fontSize={8} fill={TM}>{p.v.toFixed(0)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ????????????????????????????????????????????????????????????   Dividend Income Bar Chart
   ????????????????????????????????????????????????????????????*/
function DividendBarChart({ data }: { data: DividendMonthly[] }) {
  const { ref, w } = useResponsiveWidth();
  const h = Math.max(Math.round(w * 0.22), 160);
  const m = { top: 18, right: 16, bottom: 40, left: 62 };
  const pw = w - m.left - m.right;
  const ph = h - m.top - m.bottom;
  if (!data.length) return null;

  const maxVal = Math.max(...data.map(d => d.amount), 1);
  const barW = Math.max(2, Math.min(24, (pw / data.length) - 2));
  const gap = (pw - barW * data.length) / (data.length + 1);

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={h} style={{ fontFamily: mono }}>
        <rect x={m.left} y={m.top} width={pw} height={ph} fill="#faf8f3" stroke={GRY} />
        {/* Y-axis ticks */}
        {[0, 1, 2, 3, 4].map(i => {
          const v = (maxVal / 4) * i;
          const y = m.top + ph - (ph * v) / maxVal;
          return (
            <g key={i}>
              <line x1={m.left} x2={m.left + pw} y1={y} y2={y} stroke="#e0e0e0" strokeDasharray="3 3" />
              <text x={m.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill={TM}>${v.toFixed(0)}</text>
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const bx = m.left + gap + i * (barW + gap);
          const bh = (d.amount / maxVal) * ph;
          const by = m.top + ph - bh;
          return (
            <g key={d.month + (d.projected ? "_p" : "")}>
              <rect
                x={bx} y={by} width={barW} height={bh}
                fill={d.projected ? "#e65100" : "#2e7d32"}
                opacity={d.projected ? 0.6 : 0.85}
                rx={1}
              />
              {/* Label every Nth bar so they don't overlap */}
              {(data.length <= 24 || i % Math.ceil(data.length / 20) === 0) && (
                <text
                  x={bx + barW / 2}
                  y={m.top + ph + 12}
                  textAnchor="middle"
                  fontSize={7}
                  fill={TM}
                  transform={`rotate(-45, ${bx + barW / 2}, ${m.top + ph + 12})`}
                >
                  {d.month.slice(2)}
                </text>
              )}
            </g>
          );
        })}
        {/* Legend */}
        <rect x={m.left + 4} y={m.top + 4} width={8} height={8} fill="#2e7d32" rx={1} />
        <text x={m.left + 16} y={m.top + 11} fontSize={9} fill={T2}>Paid</text>
        <rect x={m.left + 50} y={m.top + 4} width={8} height={8} fill="#e65100" opacity={0.6} rx={1} />
        <text x={m.left + 62} y={m.top + 11} fontSize={9} fill={T2}>Projected</text>
      </svg>
    </div>
  );
}

/* ????????????????????????????????????????????????????????????   Main Page
   ????????????????????????????????????????????????????????????*/
export default function PortfolioPage() {
  const { holdings, add, update, remove, clear, portfolios, activeId, createPortfolio, renamePortfolio, deletePortfolio, switchPortfolio, duplicatePortfolio, getHoldingsForPortfolio } = usePortfolio();
  const { alerts, addAlert, removeAlert, toggleAlert } = usePortfolioAlerts();
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("1y");
  const [benchmark, setBenchmark] = useState(DEFAULT_PORTFOLIO_BENCHMARK);

  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newDate, setNewDate] = useState("");
  const [addError, setAddError] = useState("");

  const [sortCol, setSortCol] = useState<string>("weight");
  const [sortAsc, setSortAsc] = useState(false);

  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editShares, setEditShares] = useState("");
  const [editCost, setEditCost] = useState("");

  // What-if state
  const [wiAction, setWiAction] = useState<"add" | "remove" | "modify">("add");
  const [wiTicker, setWiTicker] = useState("");
  const [wiShares, setWiShares] = useState("");
  const [wiCost, setWiCost] = useState("");
  const [wiResult, setWiResult] = useState<WhatIfResult | null>(null);
  const [wiLoading, setWiLoading] = useState(false);
  const [wiError, setWiError] = useState("");

  // Alerts UI
  const [showAlerts, setShowAlerts] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>("portfolioGainAbove");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [alertTicker, setAlertTicker] = useState("");

  // Portfolio management UI
  const [showPortfolioMenu, setShowPortfolioMenu] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  // Triggered alerts log
  const [triggeredAlerts, setTriggeredAlerts] = useState<string[]>([]);

  // Rebalancing tool state
  const [rebalTargets, setRebalTargets] = useState<Record<string, string>>({});

  // Portfolio comparison state
  const [compareId, setCompareId] = useState<string | null>(null);
  const [compareAnalysis, setCompareAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const handleAdd = useCallback(() => {
    const t = newTicker.trim().toUpperCase();
    const s = parseFloat(newShares);
    const c = parseFloat(newCost);
    if (!t) { setAddError("Enter a ticker symbol"); return; }
    if (isNaN(s) || s <= 0) { setAddError("Enter a valid number of shares"); return; }
    if (isNaN(c) || c <= 0) { setAddError("Enter a valid cost basis"); return; }
    setAddError("");
    add(t, s, c, newDate || undefined);
    setNewTicker("");
    setNewShares("");
    setNewCost("");
    setNewDate("");
  }, [newTicker, newShares, newCost, newDate, add]);

  const handleEdit = useCallback((idx: number) => {
    setEditIdx(idx);
    setEditShares(String(holdings[idx].shares));
    setEditCost(String(holdings[idx].costBasis));
  }, [holdings]);

  const handleSaveEdit = useCallback(() => {
    if (editIdx === null) return;
    const s = parseFloat(editShares);
    const c = parseFloat(editCost);
    if (isNaN(s) || s <= 0 || isNaN(c) || c <= 0) return;
    update(editIdx, { ...holdings[editIdx], shares: s, costBasis: c });
    setEditIdx(null);
  }, [editIdx, editShares, editCost, update, holdings]);

  const analyze = useCallback(async () => {
    if (holdings.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchPortfolioAnalysis(holdings, period, benchmark);
      setAnalysis(res);
      // Check alerts
      if (alerts.length > 0) {
        const checkData: AlertCheckData = {
          totalGainPct: res.summary.totalGainPct,
          maxDrawdown: res.summary.maxDrawdown,
          annualizedVolatility: res.summary.annualizedVolatility,
          holdings: res.holdings.map(h => ({ ticker: h.ticker, gainPct: h.gainPct })),
        };
        checkAlerts(alerts, checkData, (_a, msg) => {
          setTriggeredAlerts(prev => [msg, ...prev].slice(0, 10));
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [holdings, period, benchmark, alerts]);

  const holdingsKey = useMemo(() => JSON.stringify(holdings), [holdings]);

  useEffect(() => {
    if (holdings.length === 0) { setAnalysis(null); return; }
    const timer = setTimeout(() => { analyze(); }, 400);
    return () => clearTimeout(timer);
  }, [holdingsKey, period, benchmark]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedHoldings = useMemo(() => {
    if (!analysis) return [];
    // Match by index (backend preserves input order) then handle lots that were filtered
    const arr: (PortfolioHoldingResult & { localIdx: number })[] = [];
    const usedAnalysis = new Set<number>();
    for (let i = 0; i < holdings.length; i++) {
      const localH = holdings[i];
      // Find matching analysis holding by ticker + shares + costBasis for multi-lot
      let ahIdx = analysis.holdings.findIndex((h, j) => !usedAnalysis.has(j) && h.ticker === localH.ticker && Math.abs(h.shares - localH.shares) < 0.001 && Math.abs(h.costBasis - localH.costBasis) < 0.01);
      if (ahIdx === -1) ahIdx = analysis.holdings.findIndex((h, j) => !usedAnalysis.has(j) && h.ticker === localH.ticker);
      if (ahIdx !== -1) {
        usedAnalysis.add(ahIdx);
        arr.push({ ...analysis.holdings[ahIdx], localIdx: i });
      } else {
        arr.push({ ticker: localH.ticker, name: localH.ticker, shares: localH.shares, costBasis: localH.costBasis, purchaseDate: localH.purchaseDate, currentPrice: 0, marketValue: 0, totalCost: localH.shares * localH.costBasis, gain: 0, gainPct: 0, dailyChange: 0, dailyChangeDollar: 0, weight: 0, sector: "Unknown", beta: null, dividendYield: null, annDividend: 0, annReturn: 0, annVolatility: 0, localIdx: i });
      }
    }
    const col = sortCol as keyof PortfolioHoldingResult;
    arr.sort((a, b) => {
      const av = a[col] ?? 0, bv = b[col] ?? 0;
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [analysis, holdings, sortCol, sortAsc]);

  // Group holdings by ticker for accordion display
  type GroupedHolding = {
    ticker: string;
    name: string;
    lots: (PortfolioHoldingResult & { localIdx: number })[];
    // Aggregated values
    shares: number;
    costBasis: number; // weighted average
    currentPrice: number;
    marketValue: number;
    totalCost: number;
    gain: number;
    gainPct: number;
    dailyChange: number;
    dailyChangeDollar: number;
    weight: number;
    annReturn: number;
    annVolatility: number;
    sector: string;
    beta: number | null;
    dividendYield: number | null;
    annDividend: number;
  };

  const groupedHoldings = useMemo((): GroupedHolding[] => {
    const groups: Map<string, (PortfolioHoldingResult & { localIdx: number })[]> = new Map();
    for (const h of sortedHoldings) {
      const existing = groups.get(h.ticker) || [];
      existing.push(h);
      groups.set(h.ticker, existing);
    }
    const result: GroupedHolding[] = [];
    // Maintain order of first appearance from sortedHoldings
    const seen = new Set<string>();
    for (const h of sortedHoldings) {
      if (seen.has(h.ticker)) continue;
      seen.add(h.ticker);
      const lots = groups.get(h.ticker)!;
      const totalShares = lots.reduce((s, l) => s + l.shares, 0);
      const totalCost = lots.reduce((s, l) => s + l.totalCost, 0);
      const totalMktVal = lots.reduce((s, l) => s + l.marketValue, 0);
      const totalGain = lots.reduce((s, l) => s + l.gain, 0);
      const totalDailyDollar = lots.reduce((s, l) => s + l.dailyChangeDollar, 0);
      const totalWeight = lots.reduce((s, l) => s + l.weight, 0);
      const totalAnnDiv = lots.reduce((s, l) => s + l.annDividend, 0);
      result.push({
        ticker: lots[0].ticker,
        name: lots[0].name,
        lots,
        shares: totalShares,
        costBasis: totalCost > 0 ? totalCost / totalShares : 0,
        currentPrice: lots[0].currentPrice,
        marketValue: totalMktVal,
        totalCost,
        gain: totalGain,
        gainPct: totalCost > 0 ? (totalGain / totalCost) * 100 : 0,
        dailyChange: lots[0].dailyChange, // same % for same ticker
        dailyChangeDollar: totalDailyDollar,
        weight: totalWeight,
        annReturn: lots[0].annReturn, // same ticker = same return
        annVolatility: lots[0].annVolatility,
        sector: lots[0].sector,
        beta: lots[0].beta,
        dividendYield: lots[0].dividendYield,
        annDividend: totalAnnDiv,
      });
    }
    return result;
  }, [sortedHoldings]);

  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  const toggleExpand = useCallback((ticker: string) => {
    setExpandedTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }, []);

  const handleSort = (col: string) => {
    if (col === sortCol) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const exportCSV = useCallback(() => {
    if (!analysis) return;
    const headers = ["Ticker","Name","Shares","Cost Basis","Current Price","Market Value","Gain/Loss","Gain %","Weight %","Sector","Beta","Ann Return %","Ann Vol %","Ann Dividend $"];
    const rows = analysis.holdings.map(h => [h.ticker, h.name, h.shares, h.costBasis, h.currentPrice, h.marketValue, h.gain, h.gainPct, h.weight, h.sector, h.beta ?? "", h.annReturn, h.annVolatility, h.annDividend]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysis]);

  const runWhatIf = useCallback(async () => {
    const t = wiTicker.trim().toUpperCase();
    const s = parseFloat(wiShares);
    const c = parseFloat(wiCost) || 0;
    if (!t) { setWiError("Enter a ticker"); return; }
    if (wiAction !== "remove" && (isNaN(s) || s <= 0)) { setWiError("Enter shares"); return; }
    setWiLoading(true);
    setWiError("");
    setWiResult(null);
    try {
      const res = await fetchWhatIfAnalysis(holdings, wiAction, t, s, c, period, benchmark);
      setWiResult(res);
    } catch (e: unknown) {
      setWiError(e instanceof Error ? e.message : "What-if failed");
    } finally {
      setWiLoading(false);
    }
  }, [holdings, wiAction, wiTicker, wiShares, wiCost, period, benchmark]);

  const handleAddAlert = useCallback(() => {
    const th = parseFloat(alertThreshold);
    if (isNaN(th)) return;
    const isHoldingAlert = alertType === "holdingGainAbove" || alertType === "holdingGainBelow";
    addAlert(alertType, th, isHoldingAlert ? alertTicker.trim().toUpperCase() || undefined : undefined);
    setAlertThreshold("");
    setAlertTicker("");
  }, [alertType, alertThreshold, alertTicker, addAlert]);

  const inputStyle: React.CSSProperties = {
    fontFamily: mono, fontSize: 13, padding: "6px 10px",
    border: `1px solid ${GRY}`, borderRadius: 3, background: WHT, color: INK, outline: "none",
  };
  const btnStyle: React.CSSProperties = {
    fontFamily: sans, fontSize: 12, fontWeight: 600, padding: "7px 16px",
    border: `1px solid ${GRY}`, borderRadius: 3, cursor: "pointer", background: WHT, color: INK,
    letterSpacing: "0.03em", textTransform: "uppercase" as const,
  };

  const s = analysis?.summary;
  const thStyle = (col: string): React.CSSProperties => ({
    fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em",
    color: sortCol === col ? INK : TM, textAlign: col === "ticker" || col === "sector" ? "left" : "right",
    padding: "6px 6px", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
  });

  return (
    <WSJLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: INK, margin: 0 }}>
              Portfolio Tracker &amp; Risk Dashboard
            </h1>
            <p style={{ fontFamily: sans, fontSize: 13, color: T2, margin: "4px 0 0" }}>
              Track holdings, analyze risk, compare benchmarks, and simulate scenarios.
            </p>
            <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "2px 0 0" }}>
              All data is stored locally in your browser ??nothing is sent to any server except ticker lookups for prices.
            </p>
          </div>
          {/* Portfolio Switcher */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowPortfolioMenu(!showPortfolioMenu)} style={{
              ...btnStyle, display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 11 }}>{portfolios.find(p => p.id === activeId)?.name || "My Portfolio"}</span>
              <span style={{ fontSize: 8 }}>v</span>
            </button>
            {showPortfolioMenu && (
              <div style={{
                position: "absolute", top: "100%", right: 0, zIndex: 20, marginTop: 4,
                background: WHT, border: `1px solid ${GRY}`, borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                minWidth: 220, padding: "8px 0",
              }}>
                {portfolios.map(p => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                    background: p.id === activeId ? "#f5f5f5" : "transparent",
                    cursor: "pointer",
                  }}>
                    {renamingId === p.id ? (
                      <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                        onBlur={() => { renamePortfolio(p.id, renameVal); setRenamingId(null); }}
                        onKeyDown={e => { if (e.key === "Enter") { renamePortfolio(p.id, renameVal); setRenamingId(null); } }}
                        style={{ ...inputStyle, fontSize: 11, padding: "2px 6px", flex: 1 }} />
                    ) : (
                      <>
                        <span onClick={() => { switchPortfolio(p.id); setShowPortfolioMenu(false); setAnalysis(null); }}
                          style={{ fontFamily: sans, fontSize: 12, color: INK, flex: 1 }}>{p.name}</span>
                        <button onClick={() => { setRenamingId(p.id); setRenameVal(p.name); }}
                          style={{ background: "none", border: "none", color: TM, cursor: "pointer", fontSize: 10, padding: "2px" }}>Rename</button>
                        <button onClick={() => duplicatePortfolio(p.id, `${p.name} (copy)`)}
                          style={{ background: "none", border: "none", color: TM, cursor: "pointer", fontSize: 10, padding: "2px" }}>Copy</button>
                        {p.id !== "default" && (
                          <button onClick={() => deletePortfolio(p.id)}
                            style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 10, padding: "2px" }}>Delete</button>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <Hair />
                <div style={{ padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }}>
                  <input placeholder="New portfolio name" value={newPortfolioName}
                    onChange={e => setNewPortfolioName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newPortfolioName.trim()) {
                        const id = createPortfolio(newPortfolioName.trim());
                        switchPortfolio(id);
                        setNewPortfolioName("");
                        setShowPortfolioMenu(false);
                        setAnalysis(null);
                      }
                    }}
                    style={{ ...inputStyle, fontSize: 10, padding: "3px 6px", flex: 1 }} />
                  <button onClick={() => {
                    if (!newPortfolioName.trim()) return;
                    const id = createPortfolio(newPortfolioName.trim());
                    switchPortfolio(id);
                    setNewPortfolioName("");
                    setShowPortfolioMenu(false);
                    setAnalysis(null);
                  }} style={{ ...btnStyle, fontSize: 9, padding: "3px 8px" }}>+ New</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 16 }} />
        <HeavyRule />

        {/* Add Holding */}
        <div style={{ margin: "16px 0" }}>
          <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Add Holding</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 160px", minWidth: 140, position: "relative" }}>
              <label style={{ fontFamily: sans, fontSize: 10, color: TM, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>Ticker</label>
              <TickerAutocomplete
                value={newTicker}
                onChange={setNewTicker}
                onAdd={(t) => { setNewTicker(t); setAddError(""); }}
                placeholder={DEFAULT_PORTFOLIO_SAMPLE_TICKER}
                inputStyle={{ ...inputStyle, width: "100%" }}
                inputClassName=""
              />
            </div>
            <div style={{ flex: "0 0 90px" }}>
              <label style={{ fontFamily: sans, fontSize: 10, color: TM, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>Shares</label>
              <input type="number" step="any" min="0.01" placeholder="10" value={newShares}
                onChange={e => setNewShares(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
                style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div style={{ flex: "0 0 110px" }}>
              <label style={{ fontFamily: sans, fontSize: 10, color: TM, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>Cost Basis ($)</label>
              <input type="number" step="any" min="0.01" placeholder="150.00" value={newCost}
                onChange={e => setNewCost(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
                style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div style={{ flex: "0 0 130px" }}>
              <label style={{ fontFamily: sans, fontSize: 10, color: TM, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>Purchase Date <span style={{ fontFamily: sans, fontSize: 8, color: GRY }}>(optional)</span></label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                style={{ ...inputStyle, width: "100%" }} />
            </div>
            <button onClick={handleAdd} style={btnStyle}>+ Add</button>
          </div>
          {addError && <p style={{ fontFamily: sans, fontSize: 11, color: "#c62828", margin: "6px 0 0" }}>{addError}</p>}
        </div>
        <Hair />

        {/* Period + Benchmark + Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
          <span style={{ fontFamily: sans, fontSize: 11, color: TM, textTransform: "uppercase", letterSpacing: "0.05em" }}>Period:</span>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} style={{
              ...btnStyle, background: period === p.value ? INK : WHT, color: period === p.value ? WHT : INK,
              fontSize: 11, padding: "4px 10px",
            }}>{p.label}</button>
          ))}
          <span style={{ fontFamily: sans, fontSize: 11, color: TM, textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: 8 }}>Benchmark:</span>
          <select value={benchmark} onChange={e => setBenchmark(e.target.value)}
            style={{ ...inputStyle, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
            {PORTFOLIO_BENCHMARKS.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button onClick={() => setShowAlerts(!showAlerts)} style={{ ...btnStyle, fontSize: 10, padding: "4px 12px", position: "relative" }}>
              Alerts{alerts.length > 0 && <span style={{ fontFamily: mono, fontSize: 8, color: "#c62828", marginLeft: 4 }}>({alerts.filter(a => a.enabled).length})</span>}
            </button>
            {analysis && <button onClick={exportCSV} style={{ ...btnStyle, fontSize: 10, padding: "4px 12px" }}>Export CSV</button>}
            <button onClick={analyze} disabled={loading || holdings.length === 0} style={{
              ...btnStyle, opacity: loading || holdings.length === 0 ? 0.5 : 1,
            }}>
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>

        {/* Alerts Panel */}
        {showAlerts && (
          <div style={{ border: `1px solid ${GRY}`, borderRadius: 4, padding: 16, margin: "0 0 12px", background: "#faf8f3" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontFamily: serif, fontSize: 14, fontWeight: 600, color: INK, margin: 0 }}>Portfolio Alerts</h3>
              <button onClick={async () => {
                const ok = await requestNotificationPermission();
                if (!ok) alert("Notification permission denied. Enable in browser settings.");
              }} style={{ ...btnStyle, fontSize: 9, padding: "3px 10px" }}>Enable Notifications</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
              <div>
                <label style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Type</label>
                <select value={alertType} onChange={e => setAlertType(e.target.value as AlertType)}
                  style={{ ...inputStyle, fontSize: 10, padding: "4px 6px" }}>
                  <option value="portfolioGainAbove">Portfolio Gain Above</option>
                  <option value="portfolioGainBelow">Portfolio Gain Below</option>
                  <option value="drawdownBelow">Drawdown Deeper Than</option>
                  <option value="volatilityAbove">Volatility Above</option>
                  <option value="holdingGainAbove">Holding Gain Above</option>
                  <option value="holdingGainBelow">Holding Gain Below</option>
                </select>
              </div>
              {(alertType === "holdingGainAbove" || alertType === "holdingGainBelow") && (
                <div>
                  <label style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Ticker</label>
                  <input value={alertTicker} onChange={e => setAlertTicker(e.target.value)}
                    placeholder={DEFAULT_PORTFOLIO_SAMPLE_TICKER} style={{ ...inputStyle, fontSize: 10, padding: "4px 6px", width: 96 }} />
                </div>
              )}
              <div>
                <label style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Threshold %</label>
                <input type="number" step="any" value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)}
                  placeholder="10" style={{ ...inputStyle, fontSize: 10, padding: "4px 6px", width: 70 }}
                  onKeyDown={e => e.key === "Enter" && handleAddAlert()} />
              </div>
              <button onClick={handleAddAlert} style={{ ...btnStyle, fontSize: 9, padding: "4px 10px" }}>+ Add</button>
            </div>
            {alerts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {alerts.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: WHT, border: `1px solid ${GRY}`, borderRadius: 3 }}>
                    <button onClick={() => toggleAlert(a.id)} style={{
                      background: "none", border: "none", cursor: "pointer", fontSize: 14, color: a.enabled ? GAIN : TM,
                    }}>{a.enabled ? "On" : "Off"}</button>
                    <span style={{ fontFamily: sans, fontSize: 11, color: a.enabled ? INK : TM, flex: 1 }}>{a.label}</span>
                    {a.lastTriggered && <span style={{ fontFamily: mono, fontSize: 8, color: TM }}>Last: {a.lastTriggered.slice(0, 16)}</span>}
                    <button onClick={() => removeAlert(a.id)} style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 12 }}>x</button>
                  </div>
                ))}
              </div>
            )}
            {triggeredAlerts.length > 0 && (
              <div style={{ marginTop: 8, padding: "6px 8px", background: "rgba(198,40,40,0.05)", borderRadius: 3 }}>
                <div style={{ fontFamily: sans, fontSize: 9, color: "#c62828", textTransform: "uppercase", marginBottom: 4 }}>Recent Triggers</div>
                {triggeredAlerts.map((msg, i) => (
                  <div key={i} style={{ fontFamily: sans, fontSize: 10, color: T2, marginBottom: 2 }}>??{msg}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p style={{ fontFamily: sans, fontSize: 12, color: "#c62828", margin: "8px 0" }}>{error}</p>}

        {/* Empty State */}
        {holdings.length === 0 && !analysis && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: TM }}>
            <p style={{ fontFamily: serif, fontSize: 18, margin: "0 0 8px" }}>No holdings yet</p>
            <p style={{ fontFamily: sans, fontSize: 12 }}>Add your first position above to start tracking. Try: {DEFAULT_PORTFOLIO_SAMPLE_TICKER}, 10 shares, $150 cost basis.</p>
          </div>
        )}

        {/* ????ANALYSIS RESULTS ????*/}
        {analysis && s && (
          <>
            <HeavyRule />

            {/* Top Summary */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "16px 0 12px", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontFamily: sans, fontSize: 10, color: TM, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Value</div>
                <div style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: INK }}>{formatCurrency(s.totalValue)}</div>
              </div>
              <div>
                <div style={{ fontFamily: sans, fontSize: 10, color: TM, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total P&amp;L</div>
                <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: s.totalGain >= 0 ? GAIN : LOSS }}>
                  {s.totalGain >= 0 ? "+" : ""}{formatCurrency(s.totalGain)} <span style={{ fontSize: 14 }}>({s.totalGainPct >= 0 ? "+" : ""}{s.totalGainPct.toFixed(1)}%)</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: sans, fontSize: 10, color: TM, textTransform: "uppercase", letterSpacing: "0.05em" }}>Daily Change</div>
                <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 600, color: s.dailyChange >= 0 ? GAIN : LOSS }}>
                  {s.dailyChange >= 0 ? "+" : ""}{formatCurrency(s.dailyChange)} ({s.dailyChangePct >= 0 ? "+" : ""}{s.dailyChangePct.toFixed(2)}%)
                </div>
              </div>
              {s.annualDividendIncome > 0 && (
                <div>
                  <div style={{ fontFamily: sans, fontSize: 10, color: TM, textTransform: "uppercase", letterSpacing: "0.05em" }}>Est. Annual Income</div>
                  <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 600, color: GAIN }}>
                    {formatCurrency(s.annualDividendIncome)} <span style={{ fontSize: 11 }}>({s.dividendYield.toFixed(2)}% yield)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Risk & Return Metrics Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, margin: "0 0 16px" }}>
              <StatCard label="Ann. Return" value={`${s.annualizedReturn >= 0 ? "+" : ""}${s.annualizedReturn.toFixed(1)}%`} color={s.annualizedReturn >= 0 ? GAIN : LOSS} sub="Portfolio" />
              <StatCard label={`${analysis.benchmarkLabel || "Benchmark"} Return`} value={`${s.benchmarkReturn >= 0 ? "+" : ""}${s.benchmarkReturn.toFixed(1)}%`} color={s.benchmarkReturn >= 0 ? GAIN : LOSS} sub="Benchmark" />
              <StatCard label="Ann. Volatility" value={`${s.annualizedVolatility.toFixed(1)}%`} />
              <StatCard label="Sharpe Ratio" value={s.sharpeRatio.toFixed(2)} color={s.sharpeRatio >= 1 ? GAIN : s.sharpeRatio < 0 ? LOSS : INK} sub="Risk-adj. return" />
              <StatCard label="Sortino Ratio" value={s.sortinoRatio.toFixed(2)} color={s.sortinoRatio >= 1.5 ? GAIN : s.sortinoRatio < 0 ? LOSS : INK} sub="Downside-adj." />
              <StatCard label="Max Drawdown" value={`${s.maxDrawdown.toFixed(1)}%`} color={LOSS} sub="Peak to trough" />
              <StatCard label="Calmar Ratio" value={s.calmarRatio.toFixed(2)} sub="Return / MaxDD" />
              <StatCard label="VaR (95%)" value={`${s.var95.toFixed(2)}%`} color={LOSS} sub="Worst daily 5%" />
              <StatCard label="CVaR (95%)" value={`${s.cvar95.toFixed(2)}%`} color={LOSS} sub="Avg of worst 5%" />
              <StatCard label="Weighted Beta" value={s.weightedBeta != null ? s.weightedBeta.toFixed(2) : "\u2014"} sub="Market sensitivity" />
              <StatCard label="Info. Ratio" value={s.informationRatio.toFixed(2)} sub={`vs. ${analysis.benchmarkLabel || "Benchmark"}`} />
              <StatCard label="Concentration" value={`${s.effectivePositions.toFixed(0)} eff.`} sub={`HHI: ${s.hhi} | Top 5: ${s.top5Weight}%`} />
            </div>

            {/* Correlation Warning */}
            {s.highCorrelationPct > 0 && (
              <div style={{
                padding: "10px 14px", borderRadius: 3, marginBottom: 16,
                background: s.highCorrelationPct > 50 ? "rgba(198,40,40,0.08)" : "rgba(239,108,0,0.08)",
                border: `1px solid ${s.highCorrelationPct > 50 ? "#c62828" : "#ef6c00"}`,
              }}>
                <p style={{ fontFamily: sans, fontSize: 12, color: s.highCorrelationPct > 50 ? "#c62828" : "#ef6c00", margin: 0, fontWeight: 600 }}>
                  Concentration Risk: {s.highCorrelationPct}% of holding pairs correlated &gt; 0.8
                </p>
                <p style={{ fontFamily: sans, fontSize: 11, color: T2, margin: "4px 0 0" }}>
                  High correlation reduces diversification benefit ??consider adding assets from different sectors or asset classes.
                </p>
              </div>
            )}
            <Hair />

            {/* Holdings Treemap */}
            <div style={{ margin: "16px 0" }}>
              <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Holdings Map</h2>
              <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>Each rectangle represents a holding ??larger rectangles have higher portfolio weight. Color indicates sector. Hover to see exact allocation and value.</p>
              <HoldingsTreemap holdings={analysis.holdings} />
            </div>
            <Hair />

            {/* Sector Allocation */}
            <div style={{ margin: "16px 0" }}>
              <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Sector Allocation</h2>
              <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>Breakdown of your portfolio by GICS sector. Donut chart shows proportions visually ??bars show exact percentages and dollar values. Heavy concentration in one sector increases sensitivity to sector-specific shocks.</p>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
                <SectorDonut sectors={analysis.sectors} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  {analysis.sectors.map(sec => (
                    <div key={sec.sector} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: SECTOR_COLORS[sec.sector] || "#9e9e9e", flexShrink: 0 }} />
                      <span style={{ fontFamily: sans, fontSize: 12, color: INK, flex: 1 }}>{sec.sector}</span>
                      <span style={{ fontFamily: mono, fontSize: 12, color: T2 }}>{sec.weight.toFixed(1)}%</span>
                      <div style={{ width: 70, height: 5, background: GRY, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${sec.weight}%`, height: "100%", background: SECTOR_COLORS[sec.sector] || "#9e9e9e", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: mono, fontSize: 10, color: TM, minWidth: 65, textAlign: "right" }}>{formatCurrency(sec.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Hair />

            {/* Equity Curve + Drawdown */}
            <div style={{ margin: "16px 0" }}>
              <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Performance vs. {analysis.benchmarkLabel || "Benchmark"}</h2>
              <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>Shows how $100 invested at the start would have grown. Solid blue = your portfolio, dashed gray = {analysis.benchmarkLabel || "Benchmark"}. Green dashed = 50-day moving average, orange dashed = 200-day moving average. Yellow &ldquo;GC&rdquo; markers flag golden crosses (50d crosses above 200d ??bullish signal), red &ldquo;DC&rdquo; markers flag death crosses (bearish). The shaded area below shows drawdown over time.</p>
              <EquityCurveSVG data={analysis.equityCurve} drawdown={analysis.drawdown} benchmark={analysis.benchmarkCurve} />
            </div>
            <Hair />

            {/* Rolling Volatility */}
            {analysis.rollingVolatility.length > 0 && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Rolling Volatility</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>30-day rolling annualized volatility. Higher values indicate more price turbulence. Spikes often coincide with market events or earnings surprises. A steady, low line signals calm, predictable returns.</p>
                <RollingVolSVG data={analysis.rollingVolatility} />
              </div>
            )}
            <Hair />

            {/* Monthly Returns Heatmap */}
            {analysis.monthlyReturns.length > 0 && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Monthly Returns Heatmap</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>Each cell shows the portfolio? total return for that month. Green cells = gains, red cells = losses ??deeper color means larger magnitude. Helps spot seasonal patterns and identify your strongest and weakest months over time.</p>
                <MonthlyReturnsHeatmap data={analysis.monthlyReturns} />
              </div>
            )}
            <Hair />

            {/* Performance Attribution */}
            {analysis.attribution.length > 0 && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Performance Attribution</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>Breaks down how much each holding added (green bars) or subtracted (red bars) from your total portfolio return. Contribution = weight ? individual return. Useful for identifying which positions are actually driving performance.</p>
                <AttributionBars data={analysis.attribution} />
              </div>
            )}
            <Hair />

            {/* Best & Worst Days */}
            {(analysis.bestDays.length > 0 || analysis.worstDays.length > 0) && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Best &amp; Worst Days</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>The most extreme single-day portfolio moves during the selected period. Useful for understanding tail risk ??how bad your worst days were versus how rewarding your best days were. Large gaps between best and worst suggest high volatility.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <h3 style={{ fontFamily: sans, fontSize: 11, color: GAIN, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Best Days</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11 }}>
                      <tbody>
                        {analysis.bestDays.map(d => (
                          <tr key={d.date} style={{ borderBottom: `1px solid ${GRY}` }}>
                            <td style={{ padding: "4px 6px", color: T2 }}>{d.date}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", color: GAIN, fontWeight: 600 }}>+{d.return.toFixed(2)}%</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", color: TM, fontSize: 10 }}>{formatCurrency(d.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 style={{ fontFamily: sans, fontSize: 11, color: LOSS, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Worst Days</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11 }}>
                      <tbody>
                        {analysis.worstDays.map(d => (
                          <tr key={d.date} style={{ borderBottom: `1px solid ${GRY}` }}>
                            <td style={{ padding: "4px 6px", color: T2 }}>{d.date}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", color: LOSS, fontWeight: 600 }}>{d.return.toFixed(2)}%</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", color: TM, fontSize: 10 }}>{formatCurrency(d.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            <Hair />

            {/* Correlation Heatmap */}
            {analysis.correlation.tickers.length > 1 && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Correlation Matrix</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>Pairwise correlation of daily returns between all holdings. Red cells (near +1) move in lockstep ??low diversification benefit. Blue cells (near ??) move opposite ??natural hedges. White (near 0) means no relationship. A well-diversified portfolio has more blue and white than red.</p>
                <div style={{ overflowX: "auto" }}>
                  <CorrHeatmapSVG tickers={analysis.correlation.tickers} matrix={analysis.correlation.matrix} />
                </div>
              </div>
            )}
            <Hair />

            {/* Risk Contribution */}
            {analysis.riskContribution.length > 0 && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Risk Contribution</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>
                  Marginal Contribution to Risk (MCTR) ??how much each holding adds to total portfolio volatility, accounting for correlations. Longer bars mean that position is a bigger risk driver. Useful for identifying where to trim if you want to reduce overall risk without changing expected return much.
                </p>
                <RiskContributionBars data={analysis.riskContribution} />
              </div>
            )}
            <Hair />

            {/* Efficient Frontier */}
            {analysis.efficientFrontier.length > 2 && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Efficient Frontier</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>
                  2,000 randomly generated portfolio allocations from your holdings plotted by risk (x-axis) vs. return (y-axis).
                  Color = Sharpe ratio (risk-adjusted return) ??blue is best, red is worst.
                  The dashed curve traces the efficient frontier ??the best possible return for each risk level.
                  Red ? = maximum Sharpe portfolio (best risk-adjusted), green ? = minimum volatility (lowest risk).
                  Black triangle = your current allocation. Labeled dots = individual stock positions.
                  The straight dashed line is the Capital Market Line (CML) ??the theoretical optimal mix of risk-free asset and the tangent portfolio.
                </p>
                <EfficientFrontierSVG data={analysis.efficientFrontier} meta={analysis.efficientFrontierMeta} />
              </div>
            )}
            <Hair />

            {/* Factor Exposure Radar */}
            {analysis.factorExposure && Object.keys(analysis.factorExposure).length > 0 && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Factor Exposure</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>
                  Your portfolio? exposure to 6 investment factors on a 0??00 scale. Momentum = tendency to ride trends. Value = tilt toward underpriced stocks. Size = small-cap vs. large-cap bias. Volatility = how much price swing you?e taking on. Quality = profitability and earnings stability. Dividend = income generation tilt. Balanced across all axes suggests broad diversification.
                </p>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <FactorRadarSVG data={analysis.factorExposure} />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    {FACTOR_LABELS.map(f => {
                      const v = analysis.factorExposure[f.key] || 0;
                      return (
                        <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontFamily: sans, fontSize: 11, color: INK, width: 75 }}>{f.label}</span>
                          <div style={{ flex: 1, height: 6, background: GRY, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, v)}%`, height: "100%", background: "#1565c0", borderRadius: 3 }} />
                          </div>
                          <span style={{ fontFamily: mono, fontSize: 10, color: T2, width: 28, textAlign: "right" }}>{v.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <Hair />

            {/* Risk Parity Suggestion */}
            {analysis.riskParityWeights && analysis.riskParityWeights.length > 0 && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Risk Parity Allocation</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>
                  Shows the weight each holding would need so every position contributes equally to total portfolio risk.
                  Compare your current allocation (dark bars) against the risk-parity target (orange bars).
                  Large gaps mean some holdings dominate your risk budget ??risk parity suggests redistributing toward lower-volatility names.
                </p>
                {analysis.riskParitySummary && (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                    <div style={{ padding: "6px 12px", border: `1px solid ${GRY}`, borderRadius: 3, background: "#faf8f3" }}>
                      <span style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase" }}>RP Ann. Return</span>
                      <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: INK }}>{analysis.riskParitySummary.annReturn.toFixed(2)}%</div>
                    </div>
                    <div style={{ padding: "6px 12px", border: `1px solid ${GRY}`, borderRadius: 3, background: "#faf8f3" }}>
                      <span style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase" }}>RP Ann. Vol</span>
                      <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: INK }}>{analysis.riskParitySummary.annVol.toFixed(2)}%</div>
                    </div>
                    <div style={{ padding: "6px 12px", border: `1px solid ${GRY}`, borderRadius: 3, background: "#faf8f3" }}>
                      <span style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase" }}>RP Sharpe</span>
                      <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: INK }}>{analysis.riskParitySummary.sharpe.toFixed(2)}</div>
                    </div>
                    <div style={{ padding: "6px 12px", border: `1px solid ${GRY}`, borderRadius: 3, background: "#faf8f3" }}>
                      <span style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase" }}>Your Sharpe</span>
                      <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: INK }}>{analysis.summary.sharpeRatio.toFixed(2)}</div>
                    </div>
                  </div>
                )}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${INK}` }}>
                        <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "left", padding: "6px" }}>Ticker</th>
                        <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>Current %</th>
                        <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>Risk Parity %</th>
                        <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "left", padding: "6px", width: "40%" }}>Comparison</th>
                        <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.riskParityWeights.map(rp => {
                        const maxW = Math.max(...analysis.riskParityWeights.map(r => Math.max(r.currentWeight, r.rpWeight)), 1);
                        const diff = rp.rpWeight - rp.currentWeight;
                        return (
                          <tr key={rp.ticker} style={{ borderBottom: `1px solid ${GRY}` }}>
                            <td style={{ padding: "5px 6px", fontWeight: 600, color: INK }}>{rp.ticker}</td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>{rp.currentWeight.toFixed(1)}%</td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>{rp.rpWeight.toFixed(1)}%</td>
                            <td style={{ padding: "5px 6px" }}>
                              <div style={{ position: "relative", height: 14 }}>
                                <div style={{ position: "absolute", top: 0, left: 0, width: `${(rp.currentWeight / maxW) * 100}%`, height: 6, background: INK, borderRadius: 2 }} />
                                <div style={{ position: "absolute", top: 8, left: 0, width: `${(rp.rpWeight / maxW) * 100}%`, height: 6, background: "#e65100", borderRadius: 2 }} />
                              </div>
                            </td>
                            <td style={{ padding: "5px 6px", textAlign: "right", color: Math.abs(diff) < 1 ? TM : diff > 0 ? GAIN : LOSS, fontWeight: 600 }}>
                              {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <Hair />

            {/* Rebalancing Tool */}
            {analysis.holdings.length > 0 && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Rebalancing Tool</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>
                  Set target weights for each holding, see the drift from target, and get a trade list to rebalance.
                  Enter your desired weight % for each ticker. Leave blank to keep current weight as target.
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${INK}` }}>
                        <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "left", padding: "6px" }}>Ticker</th>
                        <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>Current %</th>
                        <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "center", padding: "6px" }}>Target %</th>
                        <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>Drift</th>
                        <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>Trade ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Aggregate by ticker for rebalancing
                        const byTicker: Record<string, { weight: number; value: number; price: number }> = {};
                        for (const h of analysis.holdings) {
                          if (!byTicker[h.ticker]) byTicker[h.ticker] = { weight: 0, value: 0, price: h.currentPrice };
                          byTicker[h.ticker].weight += h.weight;
                          byTicker[h.ticker].value += h.marketValue;
                        }
                        const tickers = Object.keys(byTicker);
                        return tickers.map(t => {
                          const cur = byTicker[t];
                          const targetStr = rebalTargets[t] ?? "";
                          const target = targetStr === "" ? cur.weight : parseFloat(targetStr);
                          const drift = isNaN(target) ? 0 : target - cur.weight;
                          const tradeAmt = isNaN(target) ? 0 : (drift / 100) * analysis.summary.totalValue;
                          return (
                            <tr key={t} style={{ borderBottom: `1px solid ${GRY}` }}>
                              <td style={{ padding: "5px 6px", fontWeight: 600, color: INK }}>{t}</td>
                              <td style={{ padding: "5px 6px", textAlign: "right" }}>{cur.weight.toFixed(1)}%</td>
                              <td style={{ padding: "5px 6px", textAlign: "center" }}>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  placeholder={cur.weight.toFixed(1)}
                                  value={rebalTargets[t] ?? ""}
                                  onChange={e => setRebalTargets(prev => ({ ...prev, [t]: e.target.value }))}
                                  style={{ ...inputStyle, width: 65, padding: "3px 6px", fontSize: 10, textAlign: "center" }}
                                />
                              </td>
                              <td style={{ padding: "5px 6px", textAlign: "right", color: Math.abs(drift) < 0.5 ? TM : drift > 0 ? GAIN : LOSS, fontWeight: 600 }}>
                                {drift >= 0 ? "+" : ""}{drift.toFixed(1)}%
                              </td>
                              <td style={{ padding: "5px 6px", textAlign: "right", color: Math.abs(tradeAmt) < 10 ? TM : tradeAmt > 0 ? GAIN : LOSS }}>
                                {tradeAmt >= 0 ? "+" : ""}{formatCurrency(Math.abs(tradeAmt))}
                                <span style={{ fontSize: 9, color: TM, marginLeft: 4 }}>
                                  ({tradeAmt >= 0 ? "Buy" : "Sell"} {cur.price > 0 ? `~${Math.abs(tradeAmt / cur.price).toFixed(1)} sh` : ""})
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const targetSum = Object.keys(rebalTargets).length > 0
                    ? (() => {
                      const byTicker: Record<string, number> = {};
                      for (const h of analysis.holdings) {
                        byTicker[h.ticker] = (byTicker[h.ticker] || 0) + h.weight;
                      }
                      let sum = 0;
                      for (const t of Object.keys(byTicker)) {
                        const v = rebalTargets[t];
                        sum += v != null && v !== "" ? parseFloat(v) || 0 : byTicker[t];
                      }
                      return sum;
                    })()
                    : 100;
                  return targetSum !== 100 && Object.keys(rebalTargets).length > 0 ? (
                    <p style={{ fontFamily: sans, fontSize: 11, color: "#c62828", margin: "6px 0 0" }}>
                      Target weights sum to {targetSum.toFixed(1)}% (should be 100%)
                    </p>
                  ) : null;
                })()}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      // Set equal weight targets
                      const byTicker: Record<string, boolean> = {};
                      for (const h of analysis.holdings) byTicker[h.ticker] = true;
                      const tickers = Object.keys(byTicker);
                      const eq = (100 / tickers.length).toFixed(1);
                      const targets: Record<string, string> = {};
                      tickers.forEach(t => { targets[t] = eq; });
                      setRebalTargets(targets);
                    }}
                    style={{ ...btnStyle, fontSize: 10, padding: "4px 10px" }}
                  >
                    Equal Weight
                  </button>
                  {analysis.riskParityWeights && analysis.riskParityWeights.length > 0 && (
                    <button
                      onClick={() => {
                        const targets: Record<string, string> = {};
                        for (const rp of analysis.riskParityWeights) {
                          targets[rp.ticker] = rp.rpWeight.toFixed(1);
                        }
                        setRebalTargets(targets);
                      }}
                      style={{ ...btnStyle, fontSize: 10, padding: "4px 10px" }}
                    >
                      Risk Parity
                    </button>
                  )}
                  <button onClick={() => setRebalTargets({})} style={{ ...btnStyle, fontSize: 10, padding: "4px 10px", color: TM }}>
                    Reset
                  </button>
                </div>
              </div>
            )}
            <Hair />

            {/* Portfolio Comparison */}
            {portfolios.length > 1 && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Portfolio Comparison</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>
                  Select another saved portfolio to compare side-by-side metrics. Both are analyzed over the same period and benchmark.
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <select
                    value={compareId || ""}
                    onChange={e => { setCompareId(e.target.value || null); setCompareAnalysis(null); }}
                    style={{ ...inputStyle, fontSize: 11, padding: "5px 8px" }}
                  >
                    <option value="">Choose portfolio...</option>
                    {portfolios.filter(p => p.id !== activeId).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    disabled={!compareId || compareLoading}
                    onClick={async () => {
                      if (!compareId) return;
                      setCompareLoading(true);
                      try {
                        const h2 = getHoldingsForPortfolio(compareId);
                        if (h2.length === 0) { setCompareAnalysis(null); return; }
                        const res = await fetchPortfolioAnalysis(h2, period, benchmark);
                        setCompareAnalysis(res);
                      } catch { setCompareAnalysis(null); }
                      finally { setCompareLoading(false); }
                    }}
                    style={{ ...btnStyle, fontSize: 10, padding: "5px 12px", opacity: !compareId || compareLoading ? 0.5 : 1 }}
                  >
                    {compareLoading ? "Comparing..." : "Compare"}
                  </button>
                </div>
                {compareAnalysis && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${INK}` }}>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "left", padding: "6px" }}>Metric</th>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>
                            {portfolios.find(p => p.id === activeId)?.name || "Current"}
                          </th>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>
                            {portfolios.find(p => p.id === compareId)?.name || "Compare"}
                          </th>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>Diff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const a = analysis.summary;
                          const b = compareAnalysis.summary;
                          const rows: { label: string; a: number; b: number; fmt: string; higherBetter: boolean }[] = [
                            { label: "Total Value", a: a.totalValue, b: b.totalValue, fmt: "$", higherBetter: true },
                            { label: "Ann. Return", a: a.annualizedReturn, b: b.annualizedReturn, fmt: "%", higherBetter: true },
                            { label: "Ann. Volatility", a: a.annualizedVolatility, b: b.annualizedVolatility, fmt: "%", higherBetter: false },
                            { label: "Sharpe Ratio", a: a.sharpeRatio, b: b.sharpeRatio, fmt: "", higherBetter: true },
                            { label: "Sortino Ratio", a: a.sortinoRatio, b: b.sortinoRatio, fmt: "", higherBetter: true },
                            { label: "Max Drawdown", a: a.maxDrawdown, b: b.maxDrawdown, fmt: "%", higherBetter: false },
                            { label: "Calmar Ratio", a: a.calmarRatio, b: b.calmarRatio, fmt: "", higherBetter: true },
                            { label: "VaR (95%)", a: a.var95, b: b.var95, fmt: "%", higherBetter: false },
                            { label: "CVaR (95%)", a: a.cvar95, b: b.cvar95, fmt: "%", higherBetter: false },
                            { label: "Beta", a: a.weightedBeta ?? 0, b: b.weightedBeta ?? 0, fmt: "", higherBetter: false },
                            { label: "Holdings", a: a.holdingCount, b: b.holdingCount, fmt: "#", higherBetter: true },
                            { label: "Concentration (HHI)", a: a.hhi, b: b.hhi, fmt: "", higherBetter: false },
                            { label: "Dividend Yield", a: a.dividendYield, b: b.dividendYield, fmt: "%", higherBetter: true },
                          ];
                          return rows.map(r => {
                            const diff = r.b - r.a;
                            const better = r.higherBetter ? diff > 0 : diff < 0;
                            const fmtVal = (v: number) =>
                              r.fmt === "$" ? formatCurrency(v) :
                              r.fmt === "%" ? `${v.toFixed(2)}%` :
                              r.fmt === "#" ? String(v) :
                              v.toFixed(2);
                            return (
                              <tr key={r.label} style={{ borderBottom: `1px solid ${GRY}` }}>
                                <td style={{ padding: "5px 6px", fontWeight: 600, color: T2, fontFamily: sans, fontSize: 11 }}>{r.label}</td>
                                <td style={{ padding: "5px 6px", textAlign: "right" }}>{fmtVal(r.a)}</td>
                                <td style={{ padding: "5px 6px", textAlign: "right" }}>{fmtVal(r.b)}</td>
                                <td style={{ padding: "5px 6px", textAlign: "right", color: Math.abs(diff) < 0.01 ? TM : better ? GAIN : LOSS, fontWeight: 600 }}>
                                  {diff >= 0 ? "+" : ""}{r.fmt === "$" ? formatCurrency(diff) : r.fmt === "#" ? String(diff) : diff.toFixed(2)}{r.fmt === "%" ? "%" : ""}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            <Hair />

            {/* ?? Upcoming Dividends ?? */}
            {analysis.dividendUpcoming.length > 0 && (() => {
              const confirmed = analysis.dividendUpcoming.filter(d => !d.projected);
              const projected = analysis.dividendUpcoming.filter(d => d.projected);
              const totalIncome = analysis.dividendUpcoming.reduce((s, d) => s + d.totalAmount, 0);
              const payingTickers = new Set(analysis.dividendUpcoming.map(d => d.ticker)).size;
              return (
                <div style={{ margin: "16px 0" }}>
                  <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Upcoming Dividends</h2>
                  <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 10px" }}>
                    Next expected dividend payments for your holdings. &ldquo;Confirmed&rdquo; dates come from broker-reported
                    ex-dividend schedules; &ldquo;Est.&rdquo; dates are projected from each stock&rsquo;s recent payment cadence.
                  </p>

                  {/* Summary cards */}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "0 0 12px" }}>
                    <div style={{ padding: "10px 16px", border: `1px solid ${GRY}`, borderRadius: 4, background: "#faf8f3", minWidth: 100 }}>
                      <span style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Total Expected</span>
                      <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: GAIN }}>{formatCurrency(totalIncome)}</div>
                    </div>
                    <div style={{ padding: "10px 16px", border: `1px solid ${GRY}`, borderRadius: 4, background: "#faf8f3", minWidth: 80 }}>
                      <span style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Confirmed</span>
                      <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: "#2e7d32" }}>{confirmed.length}</div>
                    </div>
                    <div style={{ padding: "10px 16px", border: `1px solid ${GRY}`, borderRadius: 4, background: "#faf8f3", minWidth: 80 }}>
                      <span style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Estimated</span>
                      <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: TM }}>{projected.length}</div>
                    </div>
                    <div style={{ padding: "10px 16px", border: `1px solid ${GRY}`, borderRadius: 4, background: "#faf8f3", minWidth: 80 }}>
                      <span style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Paying Tickers</span>
                      <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: INK }}>{payingTickers}</div>
                    </div>
                  </div>

                  {/* Upcoming payments table */}
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${INK}` }}>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "left", padding: "6px" }}>Ex-Date</th>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "left", padding: "6px" }}>Pay Date</th>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "left", padding: "6px" }}>Ticker</th>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>$/Share</th>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>Shares</th>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "6px" }}>Total</th>
                          <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "center", padding: "6px" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.dividendUpcoming.map((d, i) => (
                          <tr key={`${d.ticker}-${d.date}-${i}`} style={{ borderBottom: `1px solid ${GRY}` }}>
                            <td style={{ padding: "5px 6px", color: T2 }}>{d.date}</td>
                            <td style={{ padding: "5px 6px", color: TM }}>{d.payDate || "--"}</td>
                            <td style={{ padding: "5px 6px", fontWeight: 600, color: INK }}>{d.ticker}</td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>${d.amount.toFixed(4)}</td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>{d.shares}</td>
                            <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600, color: GAIN }}>{formatCurrency(d.totalAmount)}</td>
                            <td style={{ padding: "5px 6px", textAlign: "center" }}>
                              <span style={{
                                fontFamily: sans, fontSize: 8, fontWeight: 600, textTransform: "uppercase",
                                padding: "2px 6px", borderRadius: 3,
                                background: d.projected ? "#fff3e0" : "#e8f5e9",
                                color: d.projected ? "#e65100" : "#2e7d32",
                              }}>
                                {d.projected ? "Est." : "Confirmed"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
            <Hair />

            {/* Dividend Calendar */}
            {(analysis.dividendCalendar.length > 0 || analysis.dividendMonthly.length > 0) && (
              <div style={{ margin: "16px 0" }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>Dividend Calendar</h2>
                <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>
                  Historical and projected monthly dividend income. Green bars represent received payments;
                  orange bars are forward estimates based on recent payment cadence.
                </p>

                {/* Monthly income bar chart */}
                {analysis.dividendMonthly.length > 0 && (
                  <DividendBarChart data={analysis.dividendMonthly} />
                )}

                {/* Recent payment history */}
                {analysis.dividendCalendar.length > 0 && (
                  <details style={{ marginTop: 10 }}>
                    <summary style={{ fontFamily: sans, fontSize: 11, color: TM, cursor: "pointer", letterSpacing: "0.03em" }}>
                      Recent Payment History ({analysis.dividendCalendar.length} payments)
                    </summary>
                    <div style={{ overflowX: "auto", marginTop: 6 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11 }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${INK}` }}>
                            <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "left", padding: "5px 6px" }}>Date</th>
                            <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "left", padding: "5px 6px" }}>Ticker</th>
                            <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "5px 6px" }}>$/Share</th>
                            <th style={{ fontFamily: sans, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: TM, textAlign: "right", padding: "5px 6px" }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...analysis.dividendCalendar].reverse().map((d, i) => (
                            <tr key={`hist-${d.ticker}-${d.date}-${i}`} style={{ borderBottom: `1px solid ${GRY}` }}>
                              <td style={{ padding: "4px 6px", color: T2 }}>{d.date}</td>
                              <td style={{ padding: "4px 6px", fontWeight: 600, color: INK }}>{d.ticker}</td>
                              <td style={{ padding: "4px 6px", textAlign: "right" }}>${d.amount.toFixed(4)}</td>
                              <td style={{ padding: "4px 6px", textAlign: "right", color: GAIN }}>{formatCurrency(d.totalAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* What-If Scenario Simulator */}
            <div style={{ margin: "16px 0" }}>
              <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 10px" }}>What-If Scenario Simulator</h2>
              <p style={{ fontFamily: sans, fontSize: 11, color: TM, margin: "0 0 8px" }}>
                Test hypothetical changes before trading. Add a new ticker, remove an existing holding, or change the share count ??                then compare projected Sharpe ratio, volatility, and return against your current portfolio. Helps answer questions like
                &ldquo;What if I added 20 shares of {DEFAULT_PORTFOLIO_WHAT_IF_TICKER}?&rdquo; or &ldquo;How does dropping {DEFAULT_PORTFOLIO_SECONDARY_SAMPLE_TICKER} affect my risk?&rdquo;
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
                <div>
                  <label style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Action</label>
                  <select value={wiAction} onChange={e => setWiAction(e.target.value as "add" | "remove" | "modify")}
                    style={{ ...inputStyle, fontSize: 11, padding: "5px 8px" }}>
                    <option value="add">Add</option>
                    <option value="remove">Remove</option>
                    <option value="modify">Modify</option>
                  </select>
                </div>
                <div style={{ minWidth: 120 }}>
                  <label style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Ticker</label>
                  <TickerAutocomplete
                    value={wiTicker}
                    onChange={setWiTicker}
                    onAdd={(t) => setWiTicker(t)}
                    placeholder={DEFAULT_PORTFOLIO_WHAT_IF_TICKER}
                    inputStyle={{ ...inputStyle, width: "100%" }}
                    inputClassName=""
                  />
                </div>
                {wiAction !== "remove" && (
                  <>
                    <div style={{ width: 80 }}>
                      <label style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Shares</label>
                      <input type="number" step="any" min="0.01" value={wiShares}
                        onChange={e => setWiShares(e.target.value)} placeholder="10"
                        style={{ ...inputStyle, width: "100%", fontSize: 11 }} />
                    </div>
                    <div style={{ width: 90 }}>
                      <label style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Cost ($)</label>
                      <input type="number" step="any" min="0" value={wiCost}
                        onChange={e => setWiCost(e.target.value)} placeholder="120"
                        style={{ ...inputStyle, width: "100%", fontSize: 11 }} />
                    </div>
                  </>
                )}
                <button onClick={runWhatIf} disabled={wiLoading} style={{
                  ...btnStyle, opacity: wiLoading ? 0.5 : 1,
                }}>
                  {wiLoading ? "Simulating..." : "Simulate"}
                </button>
              </div>
              {wiError && <p style={{ fontFamily: sans, fontSize: 11, color: "#c62828", margin: "4px 0" }}>{wiError}</p>}
              {wiResult && (
                <div style={{ border: `1px solid ${GRY}`, borderRadius: 4, padding: 12, background: "#faf8f3" }}>
                  <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: INK, marginBottom: 8 }}>
                    Result: {wiResult.action.toUpperCase()} {wiResult.ticker} {wiResult.shares > 0 ? `(${wiResult.shares} shares)` : ""}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                    {(["annualizedReturn", "annualizedVolatility", "sharpeRatio", "sortinoRatio", "maxDrawdown", "var95", "cvar95"] as const).map(key => {
                      const labels: Record<string, string> = {
                        annualizedReturn: "Ann. Return",
                        annualizedVolatility: "Ann. Volatility",
                        sharpeRatio: "Sharpe",
                        sortinoRatio: "Sortino",
                        maxDrawdown: "Max Drawdown",
                        var95: "VaR (95%)",
                        cvar95: "CVaR (95%)",
                      };
                      const d = wiResult.delta[key];
                      const isGood = key === "annualizedReturn" || key === "sharpeRatio" || key === "sortinoRatio" ? d > 0
                        : key === "annualizedVolatility" || key === "var95" || key === "cvar95" ? d < 0
                        : key === "maxDrawdown" ? d > 0 : true;
                      return (
                        <div key={key} style={{ padding: "6px 10px", border: `1px solid ${GRY}`, borderRadius: 3, background: WHT }}>
                          <div style={{ fontFamily: sans, fontSize: 9, color: TM, textTransform: "uppercase" }}>{labels[key]}</div>
                          <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: INK }}>
                            {wiResult.modified[key].toFixed(2)}{key.includes("Ratio") ? "" : "%"}
                          </div>
                          <div style={{ fontFamily: mono, fontSize: 10, color: isGood ? GAIN : LOSS, fontWeight: 600 }}>
                            {d >= 0 ? "+" : ""}{d.toFixed(2)}{key.includes("Ratio") ? "" : "%"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <Hair />

            {/* Holdings Table */}
            <div style={{ margin: "16px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: 0 }}>
                  Holdings Detail ({holdings.length} lot{holdings.length !== 1 ? "s" : ""} 繚 {groupedHoldings.length} ticker{groupedHoldings.length !== 1 ? "s" : ""})
                </h2>
                <button onClick={clear} style={{ ...btnStyle, fontSize: 10, padding: "3px 10px", color: "#c62828", borderColor: "#c62828" }}>Clear All</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${INK}` }}>
                      {[
                        { key: "ticker", label: "Ticker" },
                        { key: "shares", label: "Shares" },
                        { key: "costBasis", label: "Avg Cost" },
                        { key: "currentPrice", label: "Price" },
                        { key: "marketValue", label: "Mkt Val" },
                        { key: "gain", label: "Gain/Loss" },
                        { key: "gainPct", label: "Gain %" },
                        { key: "dailyChange", label: "Day %" },
                        { key: "weight", label: "Weight" },
                        { key: "annReturn", label: "Ann. Ret" },
                        { key: "annVolatility", label: "Ann. Vol" },
                        { key: "sector", label: "Sector" },
                      ].map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key)} style={thStyle(col.key)}>
                          {col.label}{sortCol === col.key ? (sortAsc ? " \u25B2" : " \u25BC") : ""}
                        </th>
                      ))}
                      <th style={{ ...thStyle(""), cursor: "default" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedHoldings.map((g) => {
                      const multiLot = g.lots.length > 1;
                      const expanded = expandedTickers.has(g.ticker);
                      return (
                        <React.Fragment key={g.ticker}>
                          {/* Aggregated / single-lot row */}
                          <tr style={{ borderBottom: `1px solid ${GRY}`, background: expanded ? "#f7f5f0" : undefined }}>
                            <td style={{ padding: "5px 6px", fontWeight: 600, color: INK, textAlign: "left", whiteSpace: "nowrap" }}>
                              {multiLot && (
                                <button
                                  onClick={() => toggleExpand(g.ticker)}
                                  style={{
                                    background: "none", border: "none", cursor: "pointer", padding: "0 4px 0 0",
                                    fontFamily: mono, fontSize: 10, color: TM, verticalAlign: "middle",
                                  }}
                                  title={expanded ? "Collapse lots" : `Expand ${g.lots.length} lots`}
                                >
                                  {expanded ? "\u25BC" : "\u25B6"}
                                </button>
                              )}
                              <span title={g.name}>{g.ticker}</span>
                              {multiLot && <span style={{ fontSize: 9, color: TM, marginLeft: 3 }}>({g.lots.length})</span>}
                              {!multiLot && g.lots[0].purchaseDate && (
                                <span style={{ fontSize: 9, color: TM, marginLeft: 4 }}>{g.lots[0].purchaseDate}</span>
                              )}
                            </td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>
                              {!multiLot && editIdx === g.lots[0].localIdx ? (
                                <input type="number" step="any" value={editShares} onChange={e => setEditShares(e.target.value)}
                                  style={{ ...inputStyle, width: 60, padding: "2px 4px", fontSize: 10 }} />
                              ) : (
                                g.shares % 1 === 0 ? g.shares : g.shares.toFixed(2)
                              )}
                            </td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>
                              {!multiLot && editIdx === g.lots[0].localIdx ? (
                                <input type="number" step="any" value={editCost} onChange={e => setEditCost(e.target.value)}
                                  style={{ ...inputStyle, width: 70, padding: "2px 4px", fontSize: 10 }} />
                              ) : (
                                `$${g.costBasis.toFixed(2)}`
                              )}
                            </td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>${g.currentPrice.toFixed(2)}</td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>{formatCurrency(g.marketValue)}</td>
                            <td style={{ padding: "5px 6px", textAlign: "right", color: g.gain >= 0 ? GAIN : LOSS }}>
                              {g.gain >= 0 ? "+" : ""}{formatCurrency(g.gain)}
                            </td>
                            <td style={{ padding: "5px 6px", textAlign: "right", color: g.gainPct >= 0 ? GAIN : LOSS }}>
                              {g.gainPct >= 0 ? "+" : ""}{g.gainPct.toFixed(1)}%
                            </td>
                            <td style={{ padding: "5px 6px", textAlign: "right", color: g.dailyChange >= 0 ? GAIN : LOSS }}>
                              {g.dailyChange >= 0 ? "+" : ""}{g.dailyChange.toFixed(2)}%
                            </td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>{g.weight.toFixed(1)}%</td>
                            <td style={{ padding: "5px 6px", textAlign: "right", color: g.annReturn >= 0 ? GAIN : LOSS }}>
                              {g.annReturn >= 0 ? "+" : ""}{g.annReturn.toFixed(1)}%
                            </td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>{g.annVolatility.toFixed(1)}%</td>
                            <td style={{ padding: "5px 6px", textAlign: "left", fontSize: 10, color: T2 }}>{g.sector}</td>
                            <td style={{ padding: "5px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                              {!multiLot ? (
                                editIdx === g.lots[0].localIdx ? (
                                  <>
                                    <button onClick={handleSaveEdit} style={{ ...btnStyle, fontSize: 9, padding: "2px 6px", marginRight: 3 }}>Save</button>
                                    <button onClick={() => setEditIdx(null)} style={{ ...btnStyle, fontSize: 9, padding: "2px 6px" }}>Cancel</button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => handleEdit(g.lots[0].localIdx)} style={{ ...btnStyle, fontSize: 9, padding: "2px 6px", marginRight: 3 }}>Edit</button>
                                    <button onClick={() => remove(g.lots[0].localIdx)} style={{ ...btnStyle, fontSize: 9, padding: "2px 6px", color: "#c62828", borderColor: "#c62828" }}>?</button>
                                  </>
                                )
                              ) : (
                                <button onClick={() => toggleExpand(g.ticker)} style={{ ...btnStyle, fontSize: 9, padding: "2px 6px" }}>
                                  {expanded ? "Hide" : `${g.lots.length} lots`}
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Expanded lot rows */}
                          {multiLot && expanded && g.lots.map((lot) => (
                            <tr key={lot.localIdx} style={{ borderBottom: `1px solid ${GRY}`, background: "#faf8f3" }}>
                              <td style={{ padding: "4px 6px 4px 28px", textAlign: "left", fontSize: 10, color: TM }}>
                                {lot.purchaseDate ? (
                                  <span title={`Bought ${lot.purchaseDate}`}>??{lot.purchaseDate}</span>
                                ) : (
                                  <span>??lot</span>
                                )}
                              </td>
                              <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 10 }}>
                                {editIdx === lot.localIdx ? (
                                  <input type="number" step="any" value={editShares} onChange={e => setEditShares(e.target.value)}
                                    style={{ ...inputStyle, width: 55, padding: "2px 4px", fontSize: 9 }} />
                                ) : (
                                  lot.shares % 1 === 0 ? lot.shares : lot.shares.toFixed(2)
                                )}
                              </td>
                              <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 10 }}>
                                {editIdx === lot.localIdx ? (
                                  <input type="number" step="any" value={editCost} onChange={e => setEditCost(e.target.value)}
                                    style={{ ...inputStyle, width: 65, padding: "2px 4px", fontSize: 9 }} />
                                ) : (
                                  `$${lot.costBasis.toFixed(2)}`
                                )}
                              </td>
                              <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 10, color: TM }}>${lot.currentPrice.toFixed(2)}</td>
                              <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 10 }}>{formatCurrency(lot.marketValue)}</td>
                              <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 10, color: lot.gain >= 0 ? GAIN : LOSS }}>
                                {lot.gain >= 0 ? "+" : ""}{formatCurrency(lot.gain)}
                              </td>
                              <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 10, color: lot.gainPct >= 0 ? GAIN : LOSS }}>
                                {lot.gainPct >= 0 ? "+" : ""}{lot.gainPct.toFixed(1)}%
                              </td>
                              <td colSpan={4} style={{ padding: "4px 6px", fontSize: 10, color: TM }}></td>
                              <td style={{ padding: "4px 6px" }}></td>
                              <td style={{ padding: "4px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                                {editIdx === lot.localIdx ? (
                                  <>
                                    <button onClick={handleSaveEdit} style={{ ...btnStyle, fontSize: 9, padding: "2px 5px", marginRight: 2 }}>Save</button>
                                    <button onClick={() => setEditIdx(null)} style={{ ...btnStyle, fontSize: 9, padding: "2px 5px" }}>Cancel</button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => handleEdit(lot.localIdx)} style={{ ...btnStyle, fontSize: 9, padding: "2px 5px", marginRight: 2 }}>Edit</button>
                                    <button onClick={() => remove(lot.localIdx)} style={{ ...btnStyle, fontSize: 9, padding: "2px 5px", color: "#c62828", borderColor: "#c62828" }}>?</button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <Hair />

            {/* Methodology */}
            <details style={{ margin: "16px 0" }}>
              <summary style={{ fontFamily: sans, fontSize: 12, color: TM, cursor: "pointer", letterSpacing: "0.03em" }}>
                Methodology &amp; Assumptions
              </summary>
              <div style={{ fontFamily: sans, fontSize: 11, color: T2, marginTop: 8, lineHeight: 1.6, columns: "280px 2", columnGap: 24 }}>
                <p style={{ marginTop: 0 }}><strong>Returns:</strong> Daily simple returns from closing prices. Annualized = avg daily x 252.</p>
                <p><strong>Sharpe:</strong> (Ann. return) / (Ann. volatility). Uses 0% risk-free rate.</p>
                <p><strong>Sortino:</strong> Like Sharpe but only penalizes downside volatility  better for asymmetric returns.</p>
                <p><strong>Max Drawdown:</strong> Largest peak-to-trough decline in portfolio value.</p>
                <p><strong>Calmar:</strong> Ann. return / |Max Drawdown|. Reward per unit of drawdown risk.</p>
                <p><strong>VaR (95%):</strong> The worst daily loss you might expect 95% of the time.</p>
                <p><strong>CVaR (95%):</strong> Average loss in the worst 5% of days  a tail-risk measure.</p>
                <p><strong>Beta:</strong> Market-weighted sum of individual betas. 1.0 = market-like risk.</p>
                <p><strong>Information Ratio:</strong> Excess return over S&amp;P 500 / tracking error. Measures active management skill.</p>
                <p><strong>HHI (Concentration):</strong> Sum of squared weights. Lower = more diversified. Effective positions = 1/HHI.</p>
                <p><strong>Correlation:</strong> Pearson correlation of daily returns. &gt;0.8 = high co-movement.</p>
                <p><strong>Attribution:</strong> Holding return x weight = contribution to total portfolio return.</p>
                <p><strong>Monthly Returns:</strong> End-of-month portfolio values used to compute calendar month returns.</p>
                <p><strong>Data:</strong> {analysis.dataPoints} overlapping trading days for {analysis.period} period. Benchmark = {analysis.benchmarkLabel || DEFAULT_PORTFOLIO_BENCHMARK}.</p>
                <p><strong>Risk Contribution:</strong> Marginal contribution to risk (MCTR) = covariance with portfolio / portfolio std. Sums to total portfolio volatility.</p>
                <p><strong>Efficient Frontier:</strong> 200 random weight combinations of current holdings. Upper-left = best risk-adjusted returns.</p>
                <p><strong>Factor Exposure:</strong> Weighted scores (0-100) across Growth, Value, Size, Momentum, Volatility, Quality using fundamental data.</p>
                <p><strong>What-If:</strong> Simulates adding/removing/modifying holdings and shows projected metric changes using historical data.</p>
                <p><strong>Moving Averages:</strong> 50-day and 200-day simple moving averages on normalized equity curve. Golden Cross (GC) = 50d crosses above 200d (bullish). Death Cross (DC) = 50d crosses below 200d (bearish).</p>
                <p><strong>Risk Parity:</strong> Iterative algorithm adjusting weights so each holding contributes equally to total portfolio volatility. Uses annualized covariance matrix and converges within 500 iterations.</p>
                <p><strong>Rebalancing:</strong> Compare current vs. target weights, see drift and dollar trades needed. Supports equal-weight and risk-parity presets.</p>
                <p><strong>Dividend Calendar:</strong> Shows historical dividend payments and 12-month forward projections. Projections use the most recent dividend amount and median payment frequency from the last 2 years of data.</p>
              </div>
            </details>
          </>
        )}

        {/* Holdings list when no analysis yet */}
        {holdings.length > 0 && !analysis && (
          <div style={{ margin: "16px 0" }}>
            <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: INK, margin: "0 0 8px" }}>
              Holdings ({holdings.length})
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {holdings.map((h, i) => (
                <div key={i} style={{ padding: "8px 12px", border: `1px solid ${GRY}`, borderRadius: 3, fontFamily: mono, fontSize: 12 }}>
                  <strong>{h.ticker}</strong> x {h.shares} @ ${h.costBasis.toFixed(2)}
                  {h.purchaseDate && <span style={{ fontSize: 10, color: TM, marginLeft: 6 }}>{h.purchaseDate}</span>}
                  <button onClick={() => remove(i)} style={{ marginLeft: 8, background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 14 }}>x</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WSJLayout>
  );
}
