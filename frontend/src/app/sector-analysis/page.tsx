"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import { formatCurrency } from "@/lib/format";
import {
  WHT, INK, GRY, BLU, RED, T2, TM,
  serif, mono, sans,
  Hair, HeavyRule, GAIN, LOSS,
} from "@/lib/wsj";
import {
  fetchSectorCorrelation,
  fetchSectorValuation,
  type SectorCorrelationResponse,
  type SectorValuationResponse,
  type SectorValuation,
} from "@/lib/api";

/* ═══════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════ */

const PERIODS = [
  { label: "3M", value: "3m", days: 63 },
  { label: "6M", value: "6m", days: 126 },
  { label: "1Y", value: "1y", days: 252 },
  { label: "2Y", value: "2y", days: 504 },
  { label: "5Y", value: "5y", days: 1260 },
];

const SECTOR_COLORS: Record<string, string> = {
  "Technology": "#1565c0",
  "Healthcare": "#2e7d32",
  "Financial Services": "#e65100",
  "Consumer Cyclical": "#6a1b9a",
  "Communication Services": "#00838f",
  "Industrials": "#ad1457",
  "Consumer Defensive": "#558b2f",
  "Energy": "#4527a0",
  "Utilities": "#bf360c",
  "Real Estate": "#00695c",
  "Basic Materials": "#283593",
};

const SECTOR_SHORT: Record<string, string> = {
  "Technology": "Tech",
  "Healthcare": "Health",
  "Financial Services": "Financials",
  "Consumer Cyclical": "Cons. Cyc.",
  "Communication Services": "Comms",
  "Industrials": "Indust.",
  "Consumer Defensive": "Cons. Def.",
  "Energy": "Energy",
  "Utilities": "Utilities",
  "Real Estate": "Real Est.",
  "Basic Materials": "Materials",
};

/* ═══════════════════════════════════════════════════════════
   Dark mode helper
   ═══════════════════════════════════════════════════════════ */

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/* ═══════════════════════════════════════════════════════════
   Colour helpers
   ═══════════════════════════════════════════════════════════ */

function corrColor(v: number): string {
  const dk = isDarkMode();
  if (v >= 0.8) return dk ? "#66bb6a" : "#1b5e20";
  if (v >= 0.5) return dk ? "#81c784" : "#4caf50";
  if (v >= 0.2) return dk ? "#c5e1a5" : "#a5d6a7";
  if (v > -0.2) return TM;
  if (v > -0.5) return "#ef9a9a";
  if (v > -0.8) return dk ? "#ef5350" : "#e53935";
  return dk ? "#ff8a80" : "#b71c1c";
}

function corrBg(v: number): string {
  const dk = isDarkMode();
  if (v >= 0.8) return dk ? "rgba(27,94,32,0.25)" : "#e8f5e9";
  if (v >= 0.5) return dk ? "rgba(76,175,80,0.15)" : "#f1f8e9";
  if (v > -0.5) return "transparent";
  if (v > -0.8) return dk ? "rgba(229,57,53,0.15)" : "#fce4ec";
  return dk ? "rgba(183,28,28,0.25)" : "#ffcdd2";
}

function signalColor(signal: string): string {
  const dk = isDarkMode();
  if (signal === "cheap") return dk ? "#66bb6a" : "#1b5e20";
  if (signal === "slightly_cheap") return dk ? "#81c784" : "#4caf50";
  if (signal === "fair") return TM;
  if (signal === "slightly_expensive") return dk ? "#ffb74d" : "#e65100";
  if (signal === "expensive") return dk ? "#ef5350" : "#c62828";
  return TM;
}

function signalBg(signal: string): string {
  const dk = isDarkMode();
  if (signal === "cheap") return dk ? "rgba(27,94,32,0.2)" : "#e8f5e9";
  if (signal === "slightly_cheap") return dk ? "rgba(76,175,80,0.12)" : "#f1f8e9";
  if (signal === "fair") return dk ? "rgba(255,255,255,0.04)" : "#f5f5f5";
  if (signal === "slightly_expensive") return dk ? "rgba(230,81,0,0.15)" : "#fff3e0";
  if (signal === "expensive") return dk ? "rgba(198,40,40,0.18)" : "#ffebee";
  return "transparent";
}

function signalLabel(signal: string): string {
  return signal.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ═══════════════════════════════════════════════════════════
   Section header
   ═══════════════════════════════════════════════════════════ */

function SectionHeader({ num, title, subtitle }: { num: number; title: string; subtitle: string }) {
  return (
    <div className="mt-8 mb-3">
      <Hair />
      <h3 className="mt-3 text-lg font-bold" style={{ fontFamily: serif, color: INK }}>
        <span className="text-sm font-normal" style={{ color: TM }}>{num}.</span>{" "}
        {title}
      </h3>
      <p className="text-[11px]" style={{ fontFamily: mono, color: T2 }}>{subtitle}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Hexbin density plot (reused from correlation page)
   ═══════════════════════════════════════════════════════════ */

interface HexBin {
  cx: number; cy: number; count: number; dataX: number; dataY: number;
}

function hexBinData(
  points: { x: number; y: number }[],
  width: number, height: number,
  margin: { top: number; right: number; bottom: number; left: number },
  gridSize: number = 16,
) {
  if (!points.length) return { bins: [] as HexBin[], maxCount: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const scaleX = (v: number) => margin.left + (plotW * (v - xMin)) / (xMax - xMin || 1);
  const scaleY = (v: number) => margin.top + plotH - (plotH * (v - yMin)) / (yMax - yMin || 1);
  const r = gridSize, colW = r * Math.sqrt(3), rowH = r * 1.5;
  const map = new Map<string, { sx: number; sy: number; sdx: number; sdy: number; count: number }>();
  for (const pt of points) {
    const px = scaleX(pt.x), py = scaleY(pt.y);
    const row = Math.round(py / rowH);
    const col = Math.round((px - (row % 2 === 0 ? 0 : colW / 2)) / colW);
    const cx1 = col * colW + (row % 2 === 0 ? 0 : colW / 2), cy1 = row * rowH;
    const row2 = py / rowH > row ? row + 1 : row - 1;
    const col2 = Math.round((px - (row2 % 2 === 0 ? 0 : colW / 2)) / colW);
    const cx2 = col2 * colW + (row2 % 2 === 0 ? 0 : colW / 2), cy2 = row2 * rowH;
    const d1 = (px - cx1) ** 2 + (py - cy1) ** 2;
    const d2 = (px - cx2) ** 2 + (py - cy2) ** 2;
    const hx = d1 <= d2 ? cx1 : cx2, hy = d1 <= d2 ? cy1 : cy2;
    const key = `${Math.round(hx * 10)},${Math.round(hy * 10)}`;
    const entry = map.get(key) ?? { sx: hx, sy: hy, sdx: 0, sdy: 0, count: 0 };
    entry.sdx += pt.x; entry.sdy += pt.y; entry.count++;
    map.set(key, entry);
  }
  let maxCount = 0;
  const bins: HexBin[] = [];
  for (const v of map.values()) {
    if (v.count > maxCount) maxCount = v.count;
    bins.push({ cx: v.sx, cy: v.sy, count: v.count, dataX: v.sdx / v.count, dataY: v.sdy / v.count });
  }
  return { bins, maxCount, xMin, xMax, yMin, yMax };
}

function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M${pts.join("L")}Z`;
}

const HEX_COLORS_LIGHT = ["#f5f0e8", "#c5e1a5", "#81c784", "#4caf50", "#388e3c", "#2e7d32", "#1b5e20", "#0d3b0d"];
const HEX_COLORS_DARK = ["#1a1a1a", "#2a3a2a", "#3a5a3a", "#4caf50", "#388e3c", "#2e7d32", "#1b5e20", "#0d3b0d"];

function getHexColors(): string[] {
  return isDarkMode() ? HEX_COLORS_DARK : HEX_COLORS_LIGHT;
}

function hexFill(count: number, maxCount: number): string {
  const palette = getHexColors();
  if (maxCount <= 0) return palette[0];
  const t = count / maxCount;
  return palette[Math.min(Math.floor(t * (palette.length - 1)), palette.length - 1)];
}

function HexbinPlot({
  data, width, height, labelX, labelY, regression,
}: {
  data: { x: number; y: number }[];
  width: number; height: number;
  labelX: string; labelY: string;
  regression: { slope: number; intercept: number; r2: number; xMin: number; xMax: number } | null;
}) {
  const dk = isDarkMode();
  const isSmall = width < 500;
  const hexR = isSmall ? 10 : 14;
  const margin = isSmall
    ? { top: 10, right: 10, bottom: 40, left: 40 }
    : { top: 15, right: 20, bottom: 50, left: 55 };
  const { bins, maxCount, xMin, xMax, yMin, yMax } = useMemo(
    () => hexBinData(data, width, height, margin, hexR),
    [data, width, height, hexR],
  );
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const scaleX = (v: number) => margin.left + (plotW * (v - xMin)) / (xMax - xMin || 1);
  const scaleY = (v: number) => margin.top + plotH - (plotH * (v - yMin)) / (yMax - yMin || 1);

  const xTicks = useMemo(() => {
    const step = parseFloat(((xMax - xMin) / 5).toPrecision(1)) || 1;
    const ticks: number[] = [];
    let v = Math.ceil(xMin / step) * step;
    while (v <= xMax) { ticks.push(v); v += step; }
    return ticks;
  }, [xMin, xMax]);

  const yTicks = useMemo(() => {
    const step = parseFloat(((yMax - yMin) / 5).toPrecision(1)) || 1;
    const ticks: number[] = [];
    let v = Math.ceil(yMin / step) * step;
    while (v <= yMax) { ticks.push(v); v += step; }
    return ticks;
  }, [yMin, yMax]);

  const [hover, setHover] = useState<HexBin | null>(null);
  if (!data.length) return null;

  return (
    <svg width={width} height={height} style={{ fontFamily: "monospace" }}>
      <defs>
        <clipPath id="hex-plot-clip">
          <rect x={margin.left} y={margin.top} width={plotW} height={plotH} />
        </clipPath>
      </defs>
      <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill={dk ? "#1e1e1e" : "#faf8f3"} stroke={GRY} />
      {xTicks.map((t) => (
        <line key={`gx${t}`} x1={scaleX(t)} x2={scaleX(t)} y1={margin.top} y2={margin.top + plotH} stroke={dk ? "#333" : "#e0e0e0"} strokeDasharray="3 3" />
      ))}
      {yTicks.map((t) => (
        <line key={`gy${t}`} x1={margin.left} x2={margin.left + plotW} y1={scaleY(t)} y2={scaleY(t)} stroke={dk ? "#333" : "#e0e0e0"} strokeDasharray="3 3" />
      ))}
      {xMin <= 0 && xMax >= 0 && <line x1={scaleX(0)} x2={scaleX(0)} y1={margin.top} y2={margin.top + plotH} stroke={dk ? "#666" : "#aaa"} strokeDasharray="4 2" />}
      {yMin <= 0 && yMax >= 0 && <line x1={margin.left} x2={margin.left + plotW} y1={scaleY(0)} y2={scaleY(0)} stroke={dk ? "#666" : "#aaa"} strokeDasharray="4 2" />}
      {regression && (
        <line x1={scaleX(regression.xMin)} y1={scaleY(regression.intercept + regression.slope * regression.xMin)}
          x2={scaleX(regression.xMax)} y2={scaleY(regression.intercept + regression.slope * regression.xMax)}
          stroke="#c62828" strokeWidth={2} strokeDasharray="6 3" />
      )}
      <g clipPath="url(#hex-plot-clip)">
        {bins.map((b, i) => (
          <path key={i} d={hexPath(b.cx, b.cy, hexR)} fill={hexFill(b.count, maxCount)}
            stroke={dk ? "#333" : "#ffffff"} strokeWidth={0.5} opacity={0.92}
            onMouseEnter={() => setHover(b)} onMouseLeave={() => setHover(null)} style={{ cursor: "crosshair" }} />
        ))}
      </g>
      {xTicks.map((t) => (
        <g key={`xt${t}`}>
          <line x1={scaleX(t)} x2={scaleX(t)} y1={margin.top + plotH} y2={margin.top + plotH + 5} stroke={INK} />
          <text x={scaleX(t)} y={margin.top + plotH + 16} textAnchor="middle" fontSize={10} fill={dk ? "#aaa" : "#555"}>{t.toFixed(1)}</text>
        </g>
      ))}
      {yTicks.map((t) => (
        <g key={`yt${t}`}>
          <line x1={margin.left - 5} x2={margin.left} y1={scaleY(t)} y2={scaleY(t)} stroke={INK} />
          <text x={margin.left - 8} y={scaleY(t) + 3} textAnchor="end" fontSize={10} fill={dk ? "#aaa" : "#555"}>{t.toFixed(1)}</text>
        </g>
      ))}
      <text x={margin.left + plotW / 2} y={height - (isSmall ? 4 : 6)} textAnchor="middle" fontSize={isSmall ? 9 : 11} fill={dk ? "#aaa" : "#555"}>
        {labelX} daily return %
      </text>
      <text x={isSmall ? 10 : 14} y={margin.top + plotH / 2} textAnchor="middle" fontSize={isSmall ? 9 : 11} fill={dk ? "#aaa" : "#555"}
        transform={`rotate(-90 ${isSmall ? 10 : 14} ${margin.top + plotH / 2})`}>{labelY} daily return %</text>
      {(() => {
        const lw = isSmall ? 10 : 15;
        const hexPalette = getHexColors();
        const totalW = hexPalette.length * lw;
        const lx = margin.left + plotW - totalW - 20;
        return (
          <>
            {hexPalette.map((c, i) => (
              <rect key={i} x={lx + i * lw} y={margin.top + 6} width={lw - 1} height={isSmall ? 7 : 10} fill={c} stroke={dk ? "#444" : "#ccc"} strokeWidth={0.5} />
            ))}
            <text x={lx - 2} y={margin.top + (isSmall ? 12 : 14)} textAnchor="end" fontSize={isSmall ? 7 : 9} fill={dk ? "#999" : "#888"}>Low</text>
            <text x={lx + totalW + 3} y={margin.top + (isSmall ? 12 : 14)} textAnchor="start" fontSize={isSmall ? 7 : 9} fill={dk ? "#999" : "#888"}>High</text>
            <text x={lx + totalW / 2} y={margin.top + (isSmall ? 22 : 26)} textAnchor="middle" fontSize={isSmall ? 7 : 9} fill={dk ? "#999" : "#888"}>density</text>
          </>
        );
      })()}
      {hover && (
        <g>
          <rect x={hover.cx + 16} y={hover.cy - 34} width={140} height={42} rx={3} fill="rgba(26,26,26,0.9)" />
          <text x={hover.cx + 22} y={hover.cy - 18} fontSize={10} fill="#fff">Points: {hover.count}</text>
          <text x={hover.cx + 22} y={hover.cy - 4} fontSize={10} fill="#ccc">Avg: ({hover.dataX.toFixed(3)}%, {hover.dataY.toFixed(3)}%)</text>
        </g>
      )}
    </svg>
  );
}

function ResponsiveHexbin({
  data, labelX, labelY, regression,
}: {
  data: { x: number; y: number }[];
  labelX: string; labelY: string;
  regression: { slope: number; intercept: number; r2: number; xMin: number; xMax: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 720, h: 480 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => { const w = el.clientWidth; setDims({ w: Math.max(w, 280), h: Math.max(Math.round(w * 0.66), 260) }); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <HexbinPlot data={data} width={dims.w} height={dims.h} labelX={labelX} labelY={labelY} regression={regression} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Pair selector (for hex density plots) — grouped by correlation
   ═══════════════════════════════════════════════════════════ */

interface PairGroup {
  label: string;
  color: string;
  pairs: { key: string; corr: number }[];
}

const PREVIEW_COUNT = 4;

function GroupedPairSelector({ groups, selected, onChange }: { groups: PairGroup[]; selected: string; onChange: (v: string) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <div className="mb-4 space-y-3">
      {groups.map((g) => {
        if (g.pairs.length === 0) return null;
        const isExpanded = !!expanded[g.label];
        const needsTruncate = g.pairs.length > PREVIEW_COUNT;
        const visible = isExpanded || !needsTruncate ? g.pairs : g.pairs.slice(0, PREVIEW_COUNT);
        return (
          <div key={g.label}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: g.color }} />
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ fontFamily: mono, color: g.color }}>
                {g.label}
              </span>
              <span className="text-[9px] tabular-nums" style={{ fontFamily: mono, color: TM }}>({g.pairs.length})</span>
              <span className="flex-1 border-b" style={{ borderColor: GRY }} />
            </div>
            <div className="flex flex-wrap gap-1 items-center">
              {visible.map((p) => (
                <button key={p.key} onClick={() => onChange(p.key)}
                  className="border px-2 py-1 text-[10px] font-bold transition-colors"
                  style={{ fontFamily: mono, background: selected === p.key ? INK : WHT, color: selected === p.key ? WHT : T2, borderColor: GRY }}>
                  {p.key}
                </button>
              ))}
              {needsTruncate && (
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [g.label]: !isExpanded }))}
                  className="px-2 py-1 text-[10px] font-bold transition-colors"
                  style={{ fontFamily: mono, color: BLU }}>
                  {isExpanded ? "Show less" : `+${g.pairs.length - PREVIEW_COUNT} more`}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Risk/Return SVG scatter
   ═══════════════════════════════════════════════════════════ */

function RiskReturnSVG({ stats }: { stats: SectorCorrelationResponse["stats"] }) {
  const dk = isDarkMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const height = Math.max(Math.round(width * 0.5), 320);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(el.clientWidth, 280));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const vols = stats.map((s) => s.annualizedVol);
  const rets = stats.map((s) => s.totalReturn);
  const xMin = Math.min(...vols) - 2, xMax = Math.max(...vols) + 2;
  const yMin = Math.min(...rets, 0) - 5, yMax = Math.max(...rets) + 5;

  const sx = (v: number) => margin.left + (plotW * (v - xMin)) / (xMax - xMin || 1);
  const sy = (v: number) => margin.top + plotH - (plotH * (v - yMin)) / (yMax - yMin || 1);

  const [hover, setHover] = useState<number | null>(null);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <svg width={width} height={height} style={{ fontFamily: "monospace" }}>
        <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill={dk ? "#1e1e1e" : "#faf8f3"} stroke={GRY} />
        {/* grid */}
        {Array.from({ length: 6 }, (_, i) => xMin + (i * (xMax - xMin)) / 5).map((t) => (
          <g key={`gx${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={margin.top} y2={margin.top + plotH} stroke={dk ? "#333" : "#e0e0e0"} strokeDasharray="3 3" />
            <text x={sx(t)} y={margin.top + plotH + 14} textAnchor="middle" fontSize={9} fill={TM}>{t.toFixed(1)}</text>
          </g>
        ))}
        {Array.from({ length: 6 }, (_, i) => yMin + (i * (yMax - yMin)) / 5).map((t) => (
          <g key={`gy${t}`}>
            <line x1={margin.left} x2={margin.left + plotW} y1={sy(t)} y2={sy(t)} stroke={dk ? "#333" : "#e0e0e0"} strokeDasharray="3 3" />
            <text x={margin.left - 6} y={sy(t) + 3} textAnchor="end" fontSize={9} fill={TM}>{t.toFixed(1)}%</text>
          </g>
        ))}
        {/* zero return line */}
        <line x1={margin.left} x2={margin.left + plotW} y1={sy(0)} y2={sy(0)} stroke={TM} strokeDasharray="4 2" />

        {/* dots */}
        {stats.map((s, i) => {
          const color = SECTOR_COLORS[s.sector] || "#666";
          const r = hover === i ? 10 : 7;
          return (
            <g key={s.sector} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <circle cx={sx(s.annualizedVol)} cy={sy(s.totalReturn)} r={r} fill={color} opacity={0.85} stroke={dk ? "#333" : "#fff"} strokeWidth={1.5} />
              <text x={sx(s.annualizedVol)} y={sy(s.totalReturn) - r - 4} textAnchor="middle" fontSize={9} fill={color} fontWeight={700}>
                {SECTOR_SHORT[s.sector] || s.sector}
              </text>
            </g>
          );
        })}

        {/* axes labels */}
        <text x={margin.left + plotW / 2} y={height - 8} textAnchor="middle" fontSize={11} fill={dk ? "#aaa" : "#555"}>
          Annualized Volatility (%)
        </text>
        <text x={16} y={margin.top + plotH / 2} textAnchor="middle" fontSize={11} fill={dk ? "#aaa" : "#555"}
          transform={`rotate(-90 16 ${margin.top + plotH / 2})`}>
          Total Return (%)
        </text>

        {/* tooltip */}
        {hover !== null && (() => {
          const s = stats[hover];
          const tx = sx(s.annualizedVol) + 14;
          const ty = sy(s.totalReturn) - 10;
          return (
            <g>
              <rect x={tx} y={ty - 34} width={180} height={52} rx={3} fill="rgba(26,26,26,0.92)" />
              <text x={tx + 6} y={ty - 18} fontSize={10} fill="#fff" fontWeight={700}>{s.sector}</text>
              <text x={tx + 6} y={ty - 4} fontSize={10} fill="#ccc">Return: {s.totalReturn.toFixed(1)}% | Vol: {s.annualizedVol.toFixed(1)}%</text>
              <text x={tx + 6} y={ty + 10} fontSize={10} fill="#ccc">Stocks: {s.stockCount} | MCap: {formatCurrency(s.totalMarketCap)}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Normalized Sector Performance Chart
   ═══════════════════════════════════════════════════════════ */

function NormalizedPerformanceChart({
  dailyReturns, sectors, period,
}: {
  dailyReturns: Record<string, number[]>;
  sectors: string[];
  period: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cWidth, setCWidth] = useState(700);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; idx: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setCWidth(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const width = cWidth;
  const height = Math.min(440, Math.max(300, width * 0.52));
  const margin = width < 500
    ? { top: 16, right: 12, bottom: 40, left: 48 }
    : { top: 20, right: 20, bottom: 50, left: 60 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  /* Build normalized price series: start at 100, compound daily returns */
  const { lines, yMin, yMax, maxLen } = useMemo(() => {
    const result: Record<string, number[]> = {};
    let gMin = 100, gMax = 100, maxL = 0;
    for (const sec of sectors) {
      const rets = dailyReturns[sec];
      if (!rets || rets.length === 0) continue;
      const prices = [100];
      for (let i = 0; i < rets.length; i++) {
        prices.push(prices[i] * (1 + rets[i]));
      }
      result[sec] = prices;
      if (prices.length > maxL) maxL = prices.length;
      for (const p of prices) {
        if (p < gMin) gMin = p;
        if (p > gMax) gMax = p;
      }
    }
    // Pad range by 5%
    const range = gMax - gMin || 1;
    return { lines: result, yMin: gMin - range * 0.05, yMax: gMax + range * 0.05, maxLen: maxL };
  }, [dailyReturns, sectors]);

  const sx = (i: number) => margin.left + (i / Math.max(maxLen - 1, 1)) * plotW;
  const sy = (v: number) => margin.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  /* Y-axis ticks */
  const yTicks = useMemo(() => {
    const range = yMax - yMin;
    const rawStep = range / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) || rawStep;
    const ticks: number[] = [];
    const start = Math.ceil(yMin / step) * step;
    for (let v = start; v <= yMax; v += step) ticks.push(Math.round(v * 100) / 100);
    return ticks;
  }, [yMin, yMax]);

  /* X-axis ticks (trading day indices → approximate months) */
  const xTicks = useMemo(() => {
    const ticks: { idx: number; label: string }[] = [];
    const numTicks = width < 500 ? 4 : 6;
    const step = Math.max(1, Math.floor(maxLen / numTicks));
    for (let i = 0; i <= maxLen; i += step) {
      ticks.push({ idx: i, label: `${Math.round(i / 252 * 12)}mo` });
    }
    return ticks;
  }, [maxLen, width]);

  /* Crosshair index from mouse position */
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPx = e.clientX - rect.left - margin.left;
    const idx = Math.round((xPx / plotW) * (maxLen - 1));
    if (idx >= 0 && idx < maxLen) {
      setMousePos({ x: e.clientX - rect.left, idx });
    }
  };

  /* Sort sectors by final value for the legend */
  const sortedSectors = useMemo(() => {
    return [...sectors].sort((a, b) => {
      const aLast = lines[a]?.[lines[a].length - 1] ?? 100;
      const bLast = lines[b]?.[lines[b].length - 1] ?? 100;
      return bLast - aLast;
    });
  }, [sectors, lines]);

  return (
    <div ref={containerRef} className="my-4">
      <svg
        width={width} height={height}
        style={{ fontFamily: mono, overflow: "visible" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePos(null)}
      >
        {/* grid lines */}
        {yTicks.map((v) => (
          <line key={v} x1={margin.left} x2={width - margin.right} y1={sy(v)} y2={sy(v)}
            stroke={GRY} strokeWidth={0.5} strokeDasharray="3,3" />
        ))}

        {/* baseline at 100 */}
        <line x1={margin.left} x2={width - margin.right} y1={sy(100)} y2={sy(100)}
          stroke={INK} strokeWidth={1} strokeOpacity={0.3} />

        {/* Y-axis labels */}
        {yTicks.map((v) => (
          <text key={v} x={margin.left - 6} y={sy(v) + 3} textAnchor="end" fontSize={9} fill={TM}>
            {v.toFixed(0)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((t) => (
          <text key={t.idx} x={sx(t.idx)} y={height - margin.bottom + 16} textAnchor="middle" fontSize={9} fill={TM}>
            {t.idx === 0 ? "Start" : t.label}
          </text>
        ))}

        {/* sector lines */}
        {sectors.map((sec) => {
          const pts = lines[sec];
          if (!pts || pts.length < 2) return null;
          const isHovered = hoveredSector === sec;
          const isDimmed = hoveredSector !== null && !isHovered;
          const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
          return (
            <path key={sec} d={d}
              fill="none"
              stroke={SECTOR_COLORS[sec] || "#666"}
              strokeWidth={isHovered ? 3 : 1.8}
              opacity={isDimmed ? 0.15 : 1}
              style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
            />
          );
        })}

        {/* crosshair + tooltip on hover */}
        {mousePos && (
          <>
            <line x1={sx(mousePos.idx)} x2={sx(mousePos.idx)} y1={margin.top} y2={margin.top + plotH}
              stroke={INK} strokeWidth={0.5} strokeOpacity={0.4} />
            {sortedSectors.map((sec) => {
              const pts = lines[sec];
              if (!pts || mousePos.idx >= pts.length) return null;
              const val = pts[mousePos.idx];
              return (
                <circle key={sec} cx={sx(mousePos.idx)} cy={sy(val)} r={3}
                  fill={SECTOR_COLORS[sec] || "#666"} stroke={isDarkMode() ? "#333" : "#fff"} strokeWidth={1} />
              );
            })}
          </>
        )}

        {/* Y-axis label */}
        <text x={14} y={margin.top + plotH / 2} textAnchor="middle" fontSize={11} fill={isDarkMode() ? "#aaa" : "#555"}
          transform={`rotate(-90 14 ${margin.top + plotH / 2})`}>
          Normalized Price ($100 base)
        </text>

        {/* axes */}
        <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + plotH} stroke={INK} strokeWidth={1} />
        <line x1={margin.left} x2={width - margin.right} y1={margin.top + plotH} y2={margin.top + plotH} stroke={INK} strokeWidth={1} />
      </svg>

      {/* Crosshair data readout — always rendered to avoid layout shift */}
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] tabular-nums" style={{ fontFamily: mono, minHeight: 18, visibility: mousePos ? "visible" : "hidden" }}>
        {sortedSectors.map((sec) => {
          const pts = lines[sec];
          if (!pts || !mousePos || mousePos.idx >= pts.length) return null;
          const val = pts[mousePos.idx];
          const pct = val - 100;
          return (
            <span key={sec} style={{ color: SECTOR_COLORS[sec] || "#666" }}>
              <strong>{SECTOR_SHORT[sec] || sec}</strong>{" "}
              <span style={{ color: pct >= 0 ? GAIN : LOSS }}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</span>
            </span>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {sortedSectors.map((sec) => {
          const pts = lines[sec];
          const finalVal = pts?.[pts.length - 1] ?? 100;
          const pct = finalVal - 100;
          return (
            <button key={sec}
              className="flex items-center gap-1.5 text-[10px] transition-opacity"
              style={{ fontFamily: mono, opacity: hoveredSector && hoveredSector !== sec ? 0.3 : 1 }}
              onMouseEnter={() => setHoveredSector(sec)}
              onMouseLeave={() => setHoveredSector(null)}
            >
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: SECTOR_COLORS[sec] || "#666" }} />
              <span style={{ color: INK }}>{SECTOR_SHORT[sec] || sec}</span>
              <span className="font-bold" style={{ color: pct >= 0 ? GAIN : LOSS }}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function SectorAnalysisPage() {
  const [period, setPeriod] = useState("1y");
  const [weighting, setWeighting] = useState<"cap" | "equal">("cap");
  const [corrData, setCorrData] = useState<SectorCorrelationResponse | null>(null);
  const [valData, setValData] = useState<SectorValuation[] | null>(null);
  const [valMeta, setValMeta] = useState<Omit<SectorValuationResponse, "sectors"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hexPair, setHexPair] = useState("");

  /* track dark mode so the whole tree re-renders on toggle */
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  /* fetch data */
  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetchSectorCorrelation(period, weighting),
      fetchSectorValuation(),
    ])
      .then(([corr, val]) => {
        setCorrData(corr);
        setValData(val.sectors);
        setValMeta({ totalFilesInDataset: val.totalFilesInDataset, totalStocksUsed: val.totalStocksUsed, dataAsOf: val.dataAsOf });
        if (corr.sectors.length >= 2) {
          setHexPair(`${corr.sectors[0]}-${corr.sectors[1]}`);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [period, weighting]);

  /* derived: all sector pairs */
  const allPairs = useMemo(() => {
    if (!corrData) return [];
    const p: string[] = [];
    const s = corrData.sectors;
    for (let i = 0; i < s.length; i++)
      for (let j = i + 1; j < s.length; j++)
        p.push(`${s[i]}-${s[j]}`);
    return p;
  }, [corrData]);

  /* pairs grouped by correlation bucket */
  const groupedPairs = useMemo((): PairGroup[] => {
    if (!corrData) return [];
    const s = corrData.sectors;
    const buckets: PairGroup[] = [
      { label: "Strong Positive (≥ 0.8)", color: isDarkMode() ? "#66bb6a" : "#1b5e20", pairs: [] },
      { label: "Moderate Positive (0.5 – 0.8)", color: isDarkMode() ? "#81c784" : "#4caf50", pairs: [] },
      { label: "Weak Positive (0.2 – 0.5)", color: isDarkMode() ? "#c5e1a5" : "#a5d6a7", pairs: [] },
      { label: "Near Zero (−0.2 – 0.2)", color: TM, pairs: [] },
      { label: "Negative (< −0.2)", color: isDarkMode() ? "#ef5350" : "#c62828", pairs: [] },
    ];
    for (let i = 0; i < s.length; i++) {
      for (let j = i + 1; j < s.length; j++) {
        const c = corrData.matrix[i][j];
        const entry = { key: `${s[i]}-${s[j]}`, corr: c };
        if (c >= 0.8) buckets[0].pairs.push(entry);
        else if (c >= 0.5) buckets[1].pairs.push(entry);
        else if (c >= 0.2) buckets[2].pairs.push(entry);
        else if (c >= -0.2) buckets[3].pairs.push(entry);
        else buckets[4].pairs.push(entry);
      }
    }
    // Sort within each bucket by descending correlation
    for (const b of buckets) b.pairs.sort((a, bb) => bb.corr - a.corr);
    return buckets;
  }, [corrData]);

  /* ranked pairs */
  const rankedPairs = useMemo(() => {
    if (!corrData) return [];
    const s = corrData.sectors;
    const pairs: { pair: string; corr: number; sA: string; sB: string }[] = [];
    for (let i = 0; i < s.length; i++)
      for (let j = i + 1; j < s.length; j++)
        pairs.push({ pair: `${SECTOR_SHORT[s[i]] || s[i]} / ${SECTOR_SHORT[s[j]] || s[j]}`, corr: corrData.matrix[i][j], sA: s[i], sB: s[j] });
    pairs.sort((a, b) => b.corr - a.corr);
    return pairs;
  }, [corrData]);

  /* hedging recommendations */
  const hedgeRecommendations = useMemo(() => {
    if (!rankedPairs.length) return null;
    const low = rankedPairs.filter((p) => p.corr < 0.4).slice(-5).reverse();
    const high = rankedPairs.filter((p) => p.corr >= 0.8).slice(0, 5);
    return { lowCorr: low, highCorr: high };
  }, [rankedPairs]);

  /* hex data for selected pair */
  const hexChartData = useMemo(() => {
    if (!corrData || !hexPair) return [];
    const [secA, secB] = hexPair.split("-");
    const ra = corrData.dailyReturns[secA];
    const rb = corrData.dailyReturns[secB];
    if (!ra || !rb) return [];
    const n = Math.min(ra.length, rb.length);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) pts.push({ x: ra[i] * 100, y: rb[i] * 100 });
    return pts;
  }, [corrData, hexPair]);

  const hexRegression = useMemo(() => {
    if (hexChartData.length < 2) return null;
    const n = hexChartData.length;
    const mx = hexChartData.reduce((a, p) => a + p.x, 0) / n;
    const my = hexChartData.reduce((a, p) => a + p.y, 0) / n;
    let cov = 0, varX = 0, ssTot = 0, ssRes = 0;
    for (const p of hexChartData) { cov += (p.x - mx) * (p.y - my); varX += (p.x - mx) ** 2; }
    const slope = varX ? cov / varX : 0;
    const intercept = my - slope * mx;
    for (const p of hexChartData) { ssRes += (p.y - (intercept + slope * p.x)) ** 2; ssTot += (p.y - my) ** 2; }
    const r2 = ssTot ? 1 - ssRes / ssTot : 0;
    const xs = hexChartData.map((p) => p.x);
    return { slope, intercept, r2, xMin: Math.min(...xs), xMax: Math.max(...xs) };
  }, [hexChartData]);

  /* nav */
  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Home</Link>
      <Link href="/sectors" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Sectors</Link>
      <Link href="/correlation" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Correlation</Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: serif, color: INK }}>
          Sector Analysis
        </h1>
        <p className="mt-1 text-sm" style={{ color: T2, fontFamily: mono }}>
          S&amp;P 500 cross-sector correlations, valuation signals, and hedging insights
        </p>
        <HeavyRule />

        {/* Dataset metadata bar */}
        {corrData && !loading && (
          <div className="my-3 flex flex-wrap items-center gap-x-6 gap-y-1 border px-3 py-2 text-[11px]" style={{ fontFamily: mono, color: T2, borderColor: GRY, background: dark ? "#1a1a1a" : "#fafaf7" }}>
            <span><strong style={{ color: INK }}>{corrData.totalStocksUsed}</strong> S&amp;P 500 stocks processed across <strong style={{ color: INK }}>{corrData.sectors.length}</strong> sectors</span>
            <span><strong style={{ color: INK }}>{corrData.totalFilesInDataset}</strong> total tickers in dataset</span>
            {corrData.dataAsOf && <span>Data as of <strong style={{ color: INK }}>{corrData.dataAsOf}</strong></span>}
          </div>
        )}

        {/* Period selector + weighting toggle */}
        <div className="my-4 flex flex-wrap items-center gap-4">
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className="border px-3 py-2 text-xs font-bold transition-colors"
                style={{ fontFamily: mono, background: period === p.value ? INK : WHT, color: period === p.value ? WHT : T2, borderColor: GRY }}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 border rounded px-1" style={{ borderColor: GRY }}>
            <button onClick={() => setWeighting("cap")}
              className="px-2.5 py-1.5 text-[10px] font-bold transition-colors rounded-sm"
              style={{ fontFamily: mono, background: weighting === "cap" ? INK : "transparent", color: weighting === "cap" ? WHT : T2 }}>
              Cap-Weight
            </button>
            <button onClick={() => setWeighting("equal")}
              className="px-2.5 py-1.5 text-[10px] font-bold transition-colors rounded-sm"
              style={{ fontFamily: mono, background: weighting === "equal" ? INK : "transparent", color: weighting === "equal" ? WHT : T2 }}>
              Equal-Weight
            </button>
          </div>
        </div>

        {/* Weighting explainer */}
        <p className="text-[10px] leading-snug -mt-2 mb-3" style={{ fontFamily: sans, color: TM, maxWidth: 680 }}>
          {weighting === "cap" ? (
            <><strong style={{ color: INK }}>Cap-Weight</strong> — larger companies move the sector more.
            Matches how sector ETFs (XLK, XLV, XLE) actually behave, so correlations reflect
            what you&apos;d experience when hedging with real instruments.
            Downside: mega-caps like AAPL or NVDA can dominate an entire sector.
            Based on all S&amp;P 500 constituents.</>
          ) : (
            <><strong style={{ color: INK }}>Equal-Weight</strong> — every stock counts the same regardless of size.
            Shows how the <em>typical</em> S&amp;P 500 stock in each sector performs, without mega-cap dominance.
            Useful for spotting broad sector trends. Downside: doesn&apos;t match actual ETF behavior,
            so hedging correlations may differ from what you&apos;d see in practice.</>
          )}
        </p>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-[11px] uppercase tracking-[0.2em] animate-pulse" style={{ fontFamily: sans, color: TM }}>Computing sector correlations…</div>
          </div>
        )}

        {error && <p className="py-4 text-sm" style={{ color: RED, fontFamily: mono }}>{error}</p>}

        {corrData && !loading && (
          <>
            {/* ════════════════════════════════════════════
                1. CORRELATION MATRIX
               ════════════════════════════════════════════ */}
            <SectionHeader num={1} title="Sector Correlation Matrix"
              subtitle={`${corrData.dataPoints} trading days of equal-weight sector returns. Values near 1 = move together, near 0 = independent, negative = move opposite.`} />

            <div className="my-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="text-center" style={{ fontFamily: mono, fontSize: 11, borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th className="p-1 text-left text-[9px] font-bold uppercase" style={{ color: TM, position: "sticky", left: 0, zIndex: 2, background: WHT }} />
                    {corrData.sectors.map((s) => (
                      <th key={s} className="p-1 text-[8px] font-bold uppercase" style={{ color: INK, minWidth: 54 }}>
                        <Link href={`/sectors/${encodeURIComponent(s)}`} className="hover:underline">{SECTOR_SHORT[s] || s}</Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corrData.sectors.map((rowSec, ri) => (
                    <tr key={rowSec}>
                      <td className="p-1 text-left text-[9px] font-bold truncate max-w-[100px]" style={{ color: INK, position: "sticky", left: 0, zIndex: 1, background: WHT }}>
                        <Link href={`/sectors/${encodeURIComponent(rowSec)}`} className="hover:underline">{SECTOR_SHORT[rowSec] || rowSec}</Link>
                      </td>
                      {corrData.sectors.map((colSec, ci) => {
                        const v = corrData.matrix[ri]?.[ci];
                        const isDiag = ri === ci;
                        return (
                          <td key={colSec}
                            className="p-1 text-[10px] cursor-pointer hover:ring-1 hover:ring-black/20"
                            style={{
                              background: isDiag ? (dark ? "#333" : "#e0e0e0") : corrBg(v ?? 0),
                              color: isDiag ? TM : corrColor(v ?? 0),
                              fontWeight: 700,
                            }}
                            onClick={() => {
                              if (!isDiag) {
                                const pair = ri < ci ? `${rowSec}-${colSec}` : `${colSec}-${rowSec}`;
                                setHexPair(pair);
                              }
                            }}
                            title={isDiag ? "" : `Click to view ${SECTOR_SHORT[rowSec] || rowSec} vs ${SECTOR_SHORT[colSec] || colSec} density plot`}
                          >
                            {v != null ? v.toFixed(2) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Color legend */}
            <div className="my-3 flex flex-wrap items-center justify-center gap-4 text-[10px]" style={{ fontFamily: mono, color: TM }}>
              {[
                { label: "Strong +", color: dark ? "#66bb6a" : "#1b5e20", bg: dark ? "#1b3a1b" : "#e8f5e9" },
                { label: "Moderate +", color: dark ? "#81c784" : "#4caf50", bg: dark ? "#1a2e1a" : "#f1f8e9" },
                { label: "Weak / None", color: TM, bg: "transparent" },
                { label: "Moderate −", color: dark ? "#ef9a9a" : "#e53935", bg: dark ? "#3a1a1a" : "#fce4ec" },
                { label: "Strong −", color: dark ? "#e57373" : "#b71c1c", bg: dark ? "#4a1a1a" : "#ffcdd2" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 border" style={{ background: l.bg, borderColor: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>

            {/* ════════════════════════════════════════════
                2. NORMALIZED PERFORMANCE
               ════════════════════════════════════════════ */}
            <SectionHeader num={2} title="Normalized Sector Performance"
              subtitle={`${corrData.weighting === "cap" ? "Market-cap weighted" : "Equal-weight"} sector indices rebased to 100. Shows cumulative performance of $100 invested in each sector over the selected period.`} />

            {/* Methodology explanation */}
            <details className="my-3 border rounded" style={{ borderColor: GRY, background: dark ? "#1a1a1a" : "#fafaf7" }}>
              <summary className="cursor-pointer px-3 py-2 text-[11px] font-bold" style={{ fontFamily: mono, color: INK }}>
                How is this computed?
              </summary>
              <div className="px-3 pb-3 text-[11px] leading-relaxed" style={{ fontFamily: sans, color: T2 }}>
                <ol className="list-decimal pl-4 mt-2 space-y-1.5">
                  <li>
                    <strong style={{ color: INK }}>Source data:</strong> We read daily closing prices for all{" "}
                    <strong>{corrData.totalFilesInDataset}</strong> stocks in our dataset (S&amp;P 500 constituents). Each stock is
                    tagged with its GICS sector (e.g. Technology, Healthcare, Energy).
                  </li>
                  <li>
                    <strong style={{ color: INK }}>Daily returns per stock:</strong> For each stock, we compute the daily percentage
                    change: <em style={{ fontFamily: mono }}>return = (close[t] − close[t−1]) / close[t−1]</em>. Stocks with
                    fewer than {corrData.period === "5y" ? "630" : corrData.period === "2y" ? "252" : "60"} trading days of data
                    are excluded.
                  </li>
                  <li>
                    <strong style={{ color: INK }}>{corrData.weighting === "cap" ? "Market-cap weighted" : "Equal-weight"} sector average:</strong>{" "}
                    {corrData.weighting === "cap" ? (
                      <>Within each sector, daily returns are averaged using <em>market capitalization as the weight</em>.
                      A stock with $3T market cap contributes ~30× more than a stock with $100B market cap.
                      This matches how sector ETFs (XLK, XLV, XLE, etc.) are constructed and reflects your actual
                      exposure when trading sector funds. Correlations from cap-weighted returns are what you&apos;d
                      actually experience when hedging with sector ETFs.</>
                    ) : (
                      <>Within each sector, daily returns are averaged with <em>equal weight</em> — every stock counts
                      the same regardless of market capitalization. A $50B company and a $500B company contribute
                      equally. This shows the performance of the &ldquo;typical stock&rdquo; in each sector, not dominated by mega-caps.</>
                    )}
                  </li>
                  <li>
                    <strong style={{ color: INK }}>Normalize to $100 base:</strong> We compound the weighted daily sector
                    returns into a cumulative price index:
                    start at $100, then <em style={{ fontFamily: mono }}>price[t] = price[t−1] × (1 + avgReturn[t])</em>.
                    If a sector line reads $120, that sector gained +20%.
                    If it reads $85, it lost −15%.
                  </li>
                </ol>
                <p className="mt-2 pt-2 border-t text-[10px]" style={{ borderColor: GRY, color: TM }}>
                  <strong>What this means:</strong> Each line answers &ldquo;if I invested $100 in a {corrData.weighting === "cap" ? "cap-weighted" : "equal-weight"} portfolio
                  of each sector&apos;s stocks at the start of the period, what would it be worth today?&rdquo;{" "}
                  {corrData.weighting === "cap"
                    ? "Because it is cap-weighted, this mirrors how sector ETFs actually behave — the correlations you see here are the correlations you'd experience when hedging with real sector instruments."
                    : "Because it is equal-weight, the chart reflects the typical stock in each sector, not just the largest names."}{" "}
                  Sectors above $100 outperformed;
                  sectors below $100 underperformed. Currently using <strong>{corrData.totalStocksUsed}</strong> stocks
                  across <strong>{corrData.sectors.length}</strong> sectors
                  ({corrData.stats.map((s) => `${SECTOR_SHORT[s.sector] || s.sector}: ${s.stockCount}`).join(", ")}).
                </p>
              </div>
            </details>

            <NormalizedPerformanceChart
              dailyReturns={corrData.dailyReturns}
              sectors={corrData.sectors}
              period={corrData.period}
            />

            {/* Data coverage note */}
            {(() => {
              const expected = PERIODS.find((p) => p.value === corrData.period)?.days ?? 252;
              const actual = corrData.dataPoints;
              const coverage = Math.round((actual / expected) * 100);
              const months = (actual / 21).toFixed(1);
              if (coverage < 95) {
                return (
                  <p className="text-[9px] italic mt-1" style={{ fontFamily: mono, color: TM }}>
                    Note: Chart shows {months} months of data ({coverage}% of the selected {corrData.period.toUpperCase()} window).
                    Some sectors have shorter price histories, so all series are aligned to the shortest available overlap
                    to ensure accurate cross-sector comparisons.
                  </p>
                );
              }
              return null;
            })()}

            {/* ════════════════════════════════════════════
                3. RANKED PAIRS
               ════════════════════════════════════════════ */}
            <SectionHeader num={3} title="Ranked Sector Pairs"
              subtitle="All pairs sorted by correlation. High correlation = redundant exposure. Low correlation = good for diversification." />

            <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {/* Most correlated */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ fontFamily: mono, color: dark ? "#ef5350" : "#c62828" }}>
                  Most Correlated (redundant)
                </h4>
                {rankedPairs.slice(0, 8).map((p) => (
                  <div key={p.pair} className="flex items-center justify-between py-1 border-b" style={{ borderColor: GRY }}>
                    <span className="text-[11px]" style={{ fontFamily: mono }}>{p.pair}</span>
                    <span className="text-[11px] font-bold tabular-nums" style={{ fontFamily: mono, color: corrColor(p.corr) }}>
                      {p.corr.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
              {/* Least correlated */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ fontFamily: mono, color: dark ? "#66bb6a" : "#2e7d32" }}>
                  Least Correlated (hedging)
                </h4>
                {rankedPairs.slice(-8).reverse().map((p) => (
                  <div key={p.pair} className="flex items-center justify-between py-1 border-b" style={{ borderColor: GRY }}>
                    <span className="text-[11px]" style={{ fontFamily: mono }}>{p.pair}</span>
                    <span className="text-[11px] font-bold tabular-nums" style={{ fontFamily: mono, color: corrColor(p.corr) }}>
                      {p.corr.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ════════════════════════════════════════════
                3. HEDGING INSIGHT
               ════════════════════════════════════════════ */}
            {hedgeRecommendations && (
              <>
                <SectionHeader num={4} title="Hedging Insights"
                  subtitle="Practical diversification takeaways based on correlation data." />
                <div className="p-4 border mb-4" style={{ borderColor: GRY, background: dark ? "#1e1e1e" : "#faf8f3" }}>
                  <div className="mb-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ fontFamily: sans, color: dark ? "#66bb6a" : "#2e7d32" }}>
                      Best Diversifiers (low correlation)
                    </h4>
                    {hedgeRecommendations.lowCorr.length > 0 ? (
                      <ul className="space-y-1">
                        {hedgeRecommendations.lowCorr.map((p) => (
                          <li key={p.pair} className="text-[12px]" style={{ fontFamily: serif }}>
                            <strong>{SECTOR_SHORT[p.sA] || p.sA}</strong> + <strong>{SECTOR_SHORT[p.sB] || p.sB}</strong>
                            <span className="ml-2 text-[10px] tabular-nums" style={{ fontFamily: mono, color: corrColor(p.corr) }}>
                              ρ = {p.corr.toFixed(3)}
                            </span>
                            {p.corr < 0 && <span className="ml-1 text-[9px]" style={{ color: dark ? "#66bb6a" : "#2e7d32" }}>(negative — inverse hedge)</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px]" style={{ fontFamily: mono, color: TM }}>All sector pairs show moderate to high correlation in this period.</p>
                    )}
                  </div>
                  <Hair />
                  <div className="mt-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ fontFamily: sans, color: dark ? "#ef5350" : "#c62828" }}>
                      Overlap Warning (high correlation)
                    </h4>
                    {hedgeRecommendations.highCorr.length > 0 ? (
                      <ul className="space-y-1">
                        {hedgeRecommendations.highCorr.map((p) => (
                          <li key={p.pair} className="text-[12px]" style={{ fontFamily: serif }}>
                            <strong>{SECTOR_SHORT[p.sA] || p.sA}</strong> + <strong>{SECTOR_SHORT[p.sB] || p.sB}</strong>
                            <span className="ml-2 text-[10px] tabular-nums" style={{ fontFamily: mono, color: dark ? "#ef5350" : "#c62828" }}>
                              ρ = {p.corr.toFixed(3)}
                            </span>
                            <span className="ml-1 text-[9px]" style={{ color: TM }}> — holding both adds concentration risk</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px]" style={{ fontFamily: mono, color: TM }}>No sector pairs show very high correlation.</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════
                4. HEXAGONAL DENSITY PLOT
               ════════════════════════════════════════════ */}
            <SectionHeader num={5} title="Sector Hexagonal Density Plot"
              subtitle="Daily return pairs between two sectors. Click any cell in the correlation matrix or select a pair below." />

            <GroupedPairSelector groups={groupedPairs} selected={hexPair} onChange={setHexPair} />

            {hexPair && hexChartData.length > 0 && (
              <ResponsiveHexbin
                data={hexChartData}
                labelX={SECTOR_SHORT[hexPair.split("-")[0]] || hexPair.split("-")[0]}
                labelY={SECTOR_SHORT[hexPair.split("-")[1]] || hexPair.split("-")[1]}
                regression={hexRegression}
              />
            )}
            {hexRegression && (
              <p className="text-[11px] text-center mt-1" style={{ fontFamily: mono, color: T2 }}>
                y = {hexRegression.slope.toFixed(3)}x {hexRegression.intercept >= 0 ? "+" : ""}{" "}
                {hexRegression.intercept.toFixed(4)} &nbsp;|&nbsp; R² = {hexRegression.r2.toFixed(3)}
                &nbsp;|&nbsp; n = {hexChartData.length} points
              </p>
            )}

            {/* ════════════════════════════════════════════
                5. RISK / RETURN SCATTER
               ════════════════════════════════════════════ */}
            <SectionHeader num={6} title="Sector Risk vs Return"
              subtitle="Each dot is a sector. Upper-left = high return for low risk (sweet spot). Lower-right = poor risk-reward." />

            <RiskReturnSVG stats={corrData.stats} />

            {/* Stats table */}
            <div className="my-4 overflow-x-auto">
              <table className="w-full" style={{ fontFamily: mono, fontSize: 11, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${INK}` }}>
                    {["Sector", "Return", "Volatility", "Avg Daily", "Stocks", "Market Cap"].map((h) => (
                      <th key={h} className="p-2 text-left text-[10px] font-bold uppercase" style={{ color: TM }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corrData.stats.map((s) => (
                    <tr key={s.sector} style={{ borderBottom: `1px solid ${GRY}` }}>
                      <td className="p-2 font-bold text-[11px]">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: SECTOR_COLORS[s.sector] || "#666" }} />
                        <Link href={`/sectors/${encodeURIComponent(s.sector)}`} className="hover:underline" style={{ color: INK }}>{s.sector}</Link>
                      </td>
                      <td className="p-2 tabular-nums" style={{ color: s.totalReturn >= 0 ? GAIN : LOSS }}>{s.totalReturn.toFixed(1)}%</td>
                      <td className="p-2 tabular-nums" style={{ color: T2 }}>{s.annualizedVol.toFixed(1)}%</td>
                      <td className="p-2 tabular-nums" style={{ color: T2 }}>{s.avgDailyReturn.toFixed(3)}%</td>
                      <td className="p-2 tabular-nums" style={{ color: T2 }}>{s.stockCount}</td>
                      <td className="p-2 tabular-nums" style={{ color: T2 }}>{formatCurrency(s.totalMarketCap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════
            6. SECTOR VALUATION SCORECARD
           ════════════════════════════════════════════ */}
        {valData && !loading && (
          <>
            <SectionHeader num={7} title="Sector Valuation Scorecard"
              subtitle="Compares current median P/E to historical norms. Signals whether sectors are cheap, fair, or expensive relative to their own history." />

            {/* Signal summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 my-4">
              {valData.map((s) => (
                <div key={s.sector} className="border p-3" style={{ borderColor: GRY, background: signalBg(s.signal) }}>
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-[12px] font-bold leading-tight" style={{ fontFamily: serif }}>{s.sector}</h4>
                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 border rounded-sm whitespace-nowrap"
                      style={{ fontFamily: mono, color: signalColor(s.signal), borderColor: signalColor(s.signal) }}>
                      {signalLabel(s.signal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                    <div>
                      <div className="text-[7px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>Trailing P/E</div>
                      <div className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono }}>{s.medianPE?.toFixed(1) ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[7px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>Fwd P/E</div>
                      <div className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono }}>{s.forwardPE?.toFixed(1) ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[7px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>Historical P/E</div>
                      <div className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono }}>{s.historicalPE ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[7px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>PE / Hist.</div>
                      <div className="text-[13px] font-bold tabular-nums" style={{ fontFamily: mono, color: signalColor(s.signal) }}>
                        {s.peRatio ? `${s.peRatio.toFixed(2)}×` : "—"}
                      </div>
                    </div>
                  </div>

                  {s.earningsMomentum != null && (
                    <div className="mt-2 pt-1 border-t" style={{ borderColor: GRY }}>
                      <div className="text-[7px] uppercase tracking-wider" style={{ fontFamily: sans, color: TM }}>Earnings Momentum</div>
                      <div className="text-[12px] font-bold tabular-nums" style={{ fontFamily: mono, color: s.earningsMomentum > 0 ? GAIN : LOSS }}>
                        {s.earningsMomentum > 0 ? "+" : ""}{s.earningsMomentum.toFixed(1)}%
                        <span className="text-[9px] font-normal ml-1" style={{ color: TM }}>
                          {s.earningsMomentum > 15 ? "strong growth expected" : s.earningsMomentum > 5 ? "moderate growth" : s.earningsMomentum > 0 ? "slight growth" : "contraction expected"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Full valuation table */}
            <Hair />
            <h4 className="mt-4 text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: mono, color: INK }}>
              Full Valuation Metrics
            </h4>

            <div className="my-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full" style={{ fontFamily: mono, fontSize: 10, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${INK}` }}>
                    {["Sector", "Signal", "P/E", "Fwd PE", "P/B", "P/S", "EV/EBITDA", "Margin", "ROE", "Rev Gth", "Div Yld", "Beta", "D/E", "1Y Perf"].map((h) => (
                      <th key={h} className="p-1.5 text-left text-[9px] font-bold uppercase whitespace-nowrap" style={{ color: TM }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {valData.map((s) => (
                    <tr key={s.sector} style={{ borderBottom: `1px solid ${GRY}` }}>
                      <td className="p-1.5 font-bold whitespace-nowrap">
                        <Link href={`/sectors/${encodeURIComponent(s.sector)}`} className="hover:underline" style={{ color: INK }}>
                          {SECTOR_SHORT[s.sector] || s.sector}
                        </Link>
                      </td>
                      <td className="p-1.5">
                        <span className="text-[9px] font-bold px-1 py-0.5 border rounded-sm" style={{ color: signalColor(s.signal), borderColor: signalColor(s.signal) }}>
                          {signalLabel(s.signal)}
                        </span>
                      </td>
                      <td className="p-1.5 tabular-nums">{s.medianPE?.toFixed(1) ?? "—"}</td>
                      <td className="p-1.5 tabular-nums">{s.forwardPE?.toFixed(1) ?? "—"}</td>
                      <td className="p-1.5 tabular-nums">{s.medianPB?.toFixed(1) ?? "—"}</td>
                      <td className="p-1.5 tabular-nums">{s.medianPS?.toFixed(1) ?? "—"}</td>
                      <td className="p-1.5 tabular-nums">{s.medianEvEbitda?.toFixed(1) ?? "—"}</td>
                      <td className="p-1.5 tabular-nums">{s.profitMargin != null ? `${(s.profitMargin * 100).toFixed(1)}%` : "—"}</td>
                      <td className="p-1.5 tabular-nums">{s.returnOnEquity != null ? `${(s.returnOnEquity * 100).toFixed(1)}%` : "—"}</td>
                      <td className="p-1.5 tabular-nums" style={{ color: (s.revenueGrowth ?? 0) >= 0 ? GAIN : LOSS }}>
                        {s.revenueGrowth != null ? `${(s.revenueGrowth * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="p-1.5 tabular-nums">{s.dividendYield != null ? `${s.dividendYield.toFixed(2)}%` : "—"}</td>
                      <td className="p-1.5 tabular-nums">{s.avgBeta?.toFixed(2) ?? "—"}</td>
                      <td className="p-1.5 tabular-nums">{s.debtToEquity?.toFixed(0) ?? "—"}</td>
                      <td className="p-1.5 tabular-nums" style={{ color: (s.perf1y ?? 0) >= 0 ? GAIN : LOSS }}>
                        {s.perf1y != null ? `${(s.perf1y * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="my-6 text-[10px] text-center" style={{ fontFamily: mono, color: TM }}>
              Correlations computed from equal-weight sector daily returns. Valuation signals compare current median P/E to long-term sector norms. Past performance is not indicative of future results.
            </p>
          </>
        )}
      </div>
    </WSJLayout>
  );
}
