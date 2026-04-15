"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, BLU, RED, T2, TM,
  serif, mono,
  Hair, HeavyRule,
  LOSS, GAIN,
} from "@/lib/wsj";
import {
  fetchCorrelation,
  fetchCorrelationDetailed,
  type CorrelationResponse,
  type CorrelationDetailedResponse,
} from "@/lib/api";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  ReferenceLine, Label,
} from "recharts";

/* ─── Constants ─── */

const PERIODS = [
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "5Y", value: "5y" },
];

const DEFAULT_TICKERS = "AAPL,MSFT,GOOG,AMZN,NVDA,TSLA";

const PALETTE = [
  "#1565c0", "#c62828", "#2e7d32", "#e65100", "#6a1b9a",
  "#00838f", "#ad1457", "#558b2f", "#4527a0", "#bf360c",
  "#00695c", "#283593", "#9e9d24", "#d84315", "#1b5e20",
  "#4a148c", "#004d40", "#b71c1c", "#33691e", "#880e4f",
];

/* ─── Dark mode helper ─── */

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/* ─── Colour helpers ─── */

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

function corrBarColor(v: number): string {
  if (v >= 0.7) return "#2e7d32";
  if (v >= 0.3) return "#66bb6a";
  if (v >= 0) return "#a5d6a7";
  if (v >= -0.3) return "#ef9a9a";
  if (v >= -0.7) return "#e53935";
  return "#b71c1c";
}

function histogramColor(bucket: string): string {
  if (bucket.startsWith("-1") || bucket.startsWith("-0.7")) return "#b71c1c";
  if (bucket.startsWith("-0.3") || bucket.startsWith("-0.5")) return "#ef9a9a";
  if (bucket.startsWith("0.0") || bucket.startsWith("-0.0") || bucket === "0") return isDarkMode() ? "#555" : "#bdbdbd";
  if (bucket.startsWith("0.3") || bucket.startsWith("0.5")) return "#66bb6a";
  return "#2e7d32";
}

/* ─── Section header component ─── */

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

/* ─── Pair selector ─── */

function PairSelector({
  pairs,
  selected,
  onChange,
}: {
  pairs: string[];
  selected: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {pairs.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="border px-2 py-1 text-[10px] font-bold transition-colors"
          style={{
            fontFamily: mono,
            background: selected === p ? INK : WHT,
            color: selected === p ? WHT : T2,
            borderColor: GRY,
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

/* ─── Hexbin density plot ─── */

interface HexBin {
  cx: number;       // pixel center x
  cy: number;       // pixel center y
  count: number;
  dataX: number;    // mean data x of points in bin
  dataY: number;    // mean data y of points in bin
}

function hexBinData(
  points: { x: number; y: number }[],
  width: number,
  height: number,
  margin: { top: number; right: number; bottom: number; left: number },
  gridSize: number = 16,
): { bins: HexBin[]; maxCount: number; xMin: number; xMax: number; yMin: number; yMax: number } {
  if (points.length === 0) return { bins: [], maxCount: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0 };

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const scaleX = (v: number) => margin.left + (plotW * (v - xMin)) / (xMax - xMin || 1);
  const scaleY = (v: number) => margin.top + plotH - (plotH * (v - yMin)) / (yMax - yMin || 1);

  const r = gridSize;
  const colW = r * Math.sqrt(3);
  const rowH = r * 1.5;

  const map = new Map<string, { sx: number; sy: number; sdx: number; sdy: number; count: number }>();

  for (const pt of points) {
    const px = scaleX(pt.x);
    const py = scaleY(pt.y);

    // find candidate hex centers for two rows
    const row = Math.round(py / rowH);
    const col = Math.round((px - (row % 2 === 0 ? 0 : colW / 2)) / colW);
    const cx1 = col * colW + (row % 2 === 0 ? 0 : colW / 2);
    const cy1 = row * rowH;

    // also check adjacent row
    const row2 = py / rowH > row ? row + 1 : row - 1;
    const col2 = Math.round((px - (row2 % 2 === 0 ? 0 : colW / 2)) / colW);
    const cx2 = col2 * colW + (row2 % 2 === 0 ? 0 : colW / 2);
    const cy2 = row2 * rowH;

    const d1 = (px - cx1) ** 2 + (py - cy1) ** 2;
    const d2 = (px - cx2) ** 2 + (py - cy2) ** 2;

    const hx = d1 <= d2 ? cx1 : cx2;
    const hy = d1 <= d2 ? cy1 : cy2;
    const key = `${Math.round(hx * 10)},${Math.round(hy * 10)}`;

    const entry = map.get(key) ?? { sx: hx, sy: hy, sdx: 0, sdy: 0, count: 0 };
    entry.sdx += pt.x;
    entry.sdy += pt.y;
    entry.count++;
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

const HEX_COLORS_LIGHT = [
  "#f5f0e8", "#c5e1a5", "#81c784", "#4caf50",
  "#388e3c", "#2e7d32", "#1b5e20", "#0d3b0d",
];
const HEX_COLORS_DARK = [
  "#1a1a1a", "#2a3a2a", "#3a5a3a", "#4caf50",
  "#388e3c", "#2e7d32", "#1b5e20", "#0d3b0d",
];

function getHexColors(): string[] {
  return isDarkMode() ? HEX_COLORS_DARK : HEX_COLORS_LIGHT;
}

function hexFill(count: number, maxCount: number): string {
  const palette = getHexColors();
  if (maxCount <= 0) return palette[0];
  const t = count / maxCount;
  const idx = Math.min(Math.floor(t * (palette.length - 1)), palette.length - 1);
  return palette[idx];
}

function ResponsiveHexbin({
  data,
  labelX,
  labelY,
  regression,
}: {
  data: { x: number; y: number }[];
  labelX: string;
  labelY: string;
  regression: { slope: number; intercept: number; r2: number; xMin: number; xMax: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 720, h: 480 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setDims({ w: Math.max(w, 280), h: Math.max(Math.round(w * 0.66), 260) });
    };
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

function HexbinPlot({
  data,
  width,
  height,
  labelX,
  labelY,
  regression,
}: {
  data: { x: number; y: number }[];
  width: number;
  height: number;
  labelX: string;
  labelY: string;
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

  // tick generation
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

  if (data.length === 0) return null;

  return (
    <svg width={width} height={height} style={{ fontFamily: "monospace" }}>
      {/* background */}
      <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill={dk ? "#1e1e1e" : "#faf8f3"} stroke={GRY} />

      {/* grid lines */}
      {xTicks.map((t) => (
        <line key={`gx${t}`} x1={scaleX(t)} x2={scaleX(t)} y1={margin.top} y2={margin.top + plotH}
          stroke={dk ? "#333" : "#e0e0e0"} strokeDasharray="3 3" />
      ))}
      {yTicks.map((t) => (
        <line key={`gy${t}`} x1={margin.left} x2={margin.left + plotW} y1={scaleY(t)} y2={scaleY(t)}
          stroke={dk ? "#333" : "#e0e0e0"} strokeDasharray="3 3" />
      ))}

      {/* zero lines */}
      {xMin <= 0 && xMax >= 0 && (
        <line x1={scaleX(0)} x2={scaleX(0)} y1={margin.top} y2={margin.top + plotH} stroke={dk ? "#666" : "#aaa"} strokeDasharray="4 2" />
      )}
      {yMin <= 0 && yMax >= 0 && (
        <line x1={margin.left} x2={margin.left + plotW} y1={scaleY(0)} y2={scaleY(0)} stroke={dk ? "#666" : "#aaa"} strokeDasharray="4 2" />
      )}

      {/* regression line */}
      {regression && (
        <line
          x1={scaleX(regression.xMin)} y1={scaleY(regression.intercept + regression.slope * regression.xMin)}
          x2={scaleX(regression.xMax)} y2={scaleY(regression.intercept + regression.slope * regression.xMax)}
          stroke="#c62828" strokeWidth={2} strokeDasharray="6 3"
        />
      )}

      {/* hex bins */}
      {bins.map((b, i) => (
        <path
          key={i}
          d={hexPath(b.cx, b.cy, hexR)}
          fill={hexFill(b.count, maxCount)}
          stroke={dk ? "#333" : "#ffffff"}
          strokeWidth={0.5}
          opacity={0.92}
          onMouseEnter={() => setHover(b)}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "crosshair" }}
        />
      ))}

      {/* X axis ticks + labels */}
      {xTicks.map((t) => (
        <g key={`xt${t}`}>
          <line x1={scaleX(t)} x2={scaleX(t)} y1={margin.top + plotH} y2={margin.top + plotH + 5} stroke={INK} />
          <text x={scaleX(t)} y={margin.top + plotH + 16} textAnchor="middle" fontSize={10} fill={dk ? "#aaa" : "#555"}>
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Y axis ticks + labels */}
      {yTicks.map((t) => (
        <g key={`yt${t}`}>
          <line x1={margin.left - 5} x2={margin.left} y1={scaleY(t)} y2={scaleY(t)} stroke={INK} />
          <text x={margin.left - 8} y={scaleY(t) + 3} textAnchor="end" fontSize={10} fill={dk ? "#aaa" : "#555"}>
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {/* axis labels */}
      <text x={margin.left + plotW / 2} y={height - (isSmall ? 4 : 6)} textAnchor="middle" fontSize={isSmall ? 9 : 11} fill={dk ? "#aaa" : "#555"}>
        {labelX} daily return %
      </text>
      <text x={isSmall ? 10 : 14} y={margin.top + plotH / 2} textAnchor="middle" fontSize={isSmall ? 9 : 11} fill={dk ? "#aaa" : "#555"}
        transform={`rotate(-90 ${isSmall ? 10 : 14} ${margin.top + plotH / 2})`}>
        {labelY} daily return %
      </text>

      {/* color legend */}
      {(() => {
        const lw = isSmall ? 10 : 15;
        const hexPalette = getHexColors();
        const totalW = hexPalette.length * lw;
        const lx = margin.left + plotW - totalW - 20;
        return (
          <>
            {hexPalette.map((c, i) => (
              <rect key={i} x={lx + i * lw} y={margin.top + 6} width={lw - 1} height={isSmall ? 7 : 10}
                fill={c} stroke={dk ? "#444" : "#ccc"} strokeWidth={0.5} />
            ))}
            <text x={lx - 2} y={margin.top + (isSmall ? 12 : 14)} textAnchor="end" fontSize={isSmall ? 7 : 9} fill={dk ? "#999" : "#888"}>Low</text>
            <text x={lx + totalW + 3} y={margin.top + (isSmall ? 12 : 14)} textAnchor="start" fontSize={isSmall ? 7 : 9} fill={dk ? "#999" : "#888"}>High</text>
            <text x={lx + totalW / 2} y={margin.top + (isSmall ? 22 : 26)} textAnchor="middle" fontSize={isSmall ? 7 : 9} fill={dk ? "#999" : "#888"}>density</text>
          </>
        );
      })()}

      {/* tooltip */}
      {hover && (
        <g>
          <rect x={hover.cx + 16} y={hover.cy - 34} width={140} height={42} rx={3}
            fill="rgba(26,26,26,0.9)" />
          <text x={hover.cx + 22} y={hover.cy - 18} fontSize={10} fill="#fff">
            Points: {hover.count}
          </text>
          <text x={hover.cx + 22} y={hover.cy - 4} fontSize={10} fill="#ccc">
            Avg: ({hover.dataX.toFixed(3)}%, {hover.dataY.toFixed(3)}%)
          </text>
        </g>
      )}
    </svg>
  );
}

/* ─── Main page ─── */

export default function CorrelationPage() {
  const [input, setInput] = useState(DEFAULT_TICKERS);
  const [period, setPeriod] = useState("1y");
  const [data, setData] = useState<CorrelationResponse | null>(null);
  const [detailed, setDetailed] = useState<CorrelationDetailedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* track dark mode so the whole tree re-renders on toggle */
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  /* pair selectors state */
  const [rollingPair, setRollingPair] = useState("");
  const [scatterPair, setScatterPair] = useState("");
  const [hexPair, setHexPair] = useState("");
  const [spreadPair, setSpreadPair] = useState("");
  const [betaBenchmark, setBetaBenchmark] = useState("");

  const tickers = useMemo(
    () => input.split(/[,\s]+/).map((t) => t.trim().toUpperCase()).filter(Boolean),
    [input],
  );

  const handleRun = useCallback(async () => {
    if (tickers.length < 2) { setError("Enter at least 2 tickers"); return; }
    if (tickers.length > 20) { setError("Max 20 tickers"); return; }
    setLoading(true);
    setError("");
    try {
      const [corrRes, detRes] = await Promise.all([
        fetchCorrelation(tickers, period),
        fetchCorrelationDetailed(tickers, period),
      ]);
      setData(corrRes);
      setDetailed(detRes);
      /* reset pair selectors to first pair */
      const t = corrRes.tickers;
      if (t.length >= 2) {
        const firstPair = `${t[0]}-${t[1]}`;
        setRollingPair(firstPair);
        setScatterPair(firstPair);
        setHexPair(firstPair);
        setSpreadPair(firstPair);
        setBetaBenchmark(t[0]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [tickers, period]);

  /* ─── derived data ─── */

  const allPairs = useMemo(() => {
    if (!data) return [];
    const p: string[] = [];
    const t = data.tickers;
    for (let i = 0; i < t.length; i++)
      for (let j = i + 1; j < t.length; j++)
        p.push(`${t[i]}-${t[j]}`);
    return p;
  }, [data]);

  /* ranked pairs from matrix */
  const rankedPairs = useMemo(() => {
    if (!data) return [];
    const t = data.tickers;
    const pairs: { pair: string; corr: number }[] = [];
    for (let i = 0; i < t.length; i++)
      for (let j = i + 1; j < t.length; j++)
        pairs.push({ pair: `${t[i]}-${t[j]}`, corr: data.matrix[i][j] });
    pairs.sort((a, b) => b.corr - a.corr);
    return pairs;
  }, [data]);

  /* correlation histogram buckets */
  const corrHistogram = useMemo(() => {
    if (!rankedPairs.length) return [];
    const buckets = [
      { range: "-1.0 to -0.7", min: -1.01, max: -0.7, count: 0 },
      { range: "-0.7 to -0.3", min: -0.7, max: -0.3, count: 0 },
      { range: "-0.3 to  0.0", min: -0.3, max: 0.0, count: 0 },
      { range: " 0.0 to  0.3", min: 0.0, max: 0.3, count: 0 },
      { range: " 0.3 to  0.7", min: 0.3, max: 0.7, count: 0 },
      { range: " 0.7 to  1.0", min: 0.7, max: 1.01, count: 0 },
    ];
    for (const { corr } of rankedPairs) {
      for (const b of buckets) {
        if (corr >= b.min && corr < b.max) { b.count++; break; }
      }
    }
    return buckets;
  }, [rankedPairs]);

  /* vol vs return scatter data */
  const riskReturnData = useMemo(() => {
    if (!data) return [];
    return data.stats.map((s) => ({
      ticker: s.ticker,
      vol: s.annualizedVol,
      ret: s.totalReturn,
    }));
  }, [data]);

  /* beta data (each ticker vs selected benchmark) */
  const betaData = useMemo(() => {
    if (!detailed || !betaBenchmark) return [];
    const benchReturns = detailed.dailyReturns[betaBenchmark];
    if (!benchReturns) return [];
    const results: { ticker: string; beta: number; r2: number }[] = [];
    for (const t of detailed.tickers) {
      if (t === betaBenchmark) continue;
      const tr = detailed.dailyReturns[t];
      if (!tr) continue;
      const n = Math.min(tr.length, benchReturns.length);
      const x = benchReturns.slice(0, n);
      const y = tr.slice(0, n);
      const mx = x.reduce((a, b) => a + b, 0) / n;
      const my = y.reduce((a, b) => a + b, 0) / n;
      let cov = 0, varX = 0, ssRes = 0, ssTot = 0;
      for (let i = 0; i < n; i++) {
        cov += (x[i] - mx) * (y[i] - my);
        varX += (x[i] - mx) ** 2;
      }
      const beta = varX !== 0 ? cov / varX : 0;
      const alpha = my - beta * mx;
      for (let i = 0; i < n; i++) {
        const pred = alpha + beta * x[i];
        ssRes += (y[i] - pred) ** 2;
        ssTot += (y[i] - my) ** 2;
      }
      const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
      results.push({ ticker: t, beta: Math.round(beta * 100) / 100, r2: Math.round(r2 * 100) / 100 });
    }
    results.sort((a, b) => b.beta - a.beta);
    return results;
  }, [detailed, betaBenchmark]);

  /* ─── chart data builders ─── */

  const cumulativeChartData = useMemo(() => {
    if (!detailed) return [];
    const { dates, cumulativeReturns, tickers: tk } = detailed;
    return dates.map((d, i) => {
      const row: Record<string, string | number> = { date: d };
      for (const t of tk) row[t] = cumulativeReturns[t]?.[i] ?? 0;
      return row;
    });
  }, [detailed]);

  const rollingChartData = useMemo(() => {
    if (!detailed || !rollingPair) return [];
    const entry = detailed.rollingCorrelations.find((e) => e.pair === rollingPair);
    if (!entry) return [];
    return detailed.returnDates.map((d, i) => ({
      date: d,
      corr: entry.values[i],
    }));
  }, [detailed, rollingPair]);

  const scatterChartData = useMemo(() => {
    if (!detailed || !scatterPair) return [];
    const [ta, tb] = scatterPair.split("-");
    const ra = detailed.dailyReturns[ta];
    const rb = detailed.dailyReturns[tb];
    if (!ra || !rb) return [];
    const n = Math.min(ra.length, rb.length);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) pts.push({ x: ra[i] * 100, y: rb[i] * 100 });
    return pts;
  }, [detailed, scatterPair]);

  const scatterRegression = useMemo(() => {
    if (scatterChartData.length < 2) return null;
    const n = scatterChartData.length;
    const mx = scatterChartData.reduce((a, p) => a + p.x, 0) / n;
    const my = scatterChartData.reduce((a, p) => a + p.y, 0) / n;
    let cov = 0, varX = 0, ssTot = 0, ssRes = 0;
    for (const p of scatterChartData) {
      cov += (p.x - mx) * (p.y - my);
      varX += (p.x - mx) ** 2;
    }
    const slope = varX ? cov / varX : 0;
    const intercept = my - slope * mx;
    for (const p of scatterChartData) {
      const pred = intercept + slope * p.x;
      ssRes += (p.y - pred) ** 2;
      ssTot += (p.y - my) ** 2;
    }
    const r2 = ssTot ? 1 - ssRes / ssTot : 0;
    const xs = scatterChartData.map((p) => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    return { slope, intercept, r2, xMin, xMax };
  }, [scatterChartData]);

  /* hex bin data for selected pair */
  const hexChartData = useMemo(() => {
    if (!detailed || !hexPair) return [];
    const [ta, tb] = hexPair.split("-");
    const ra = detailed.dailyReturns[ta];
    const rb = detailed.dailyReturns[tb];
    if (!ra || !rb) return [];
    const n = Math.min(ra.length, rb.length);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) pts.push({ x: ra[i] * 100, y: rb[i] * 100 });
    return pts;
  }, [detailed, hexPair]);

  const hexRegression = useMemo(() => {
    if (hexChartData.length < 2) return null;
    const n = hexChartData.length;
    const mx = hexChartData.reduce((a, p) => a + p.x, 0) / n;
    const my = hexChartData.reduce((a, p) => a + p.y, 0) / n;
    let cov = 0, varX = 0, ssTot = 0, ssRes = 0;
    for (const p of hexChartData) {
      cov += (p.x - mx) * (p.y - my);
      varX += (p.x - mx) ** 2;
    }
    const slope = varX ? cov / varX : 0;
    const intercept = my - slope * mx;
    for (const p of hexChartData) {
      ssRes += (p.y - (intercept + slope * p.x)) ** 2;
      ssTot += (p.y - my) ** 2;
    }
    const r2 = ssTot ? 1 - ssRes / ssTot : 0;
    const xs = hexChartData.map((p) => p.x);
    return { slope, intercept, r2, xMin: Math.min(...xs), xMax: Math.max(...xs) };
  }, [hexChartData]);

  const spreadChartData = useMemo(() => {
    if (!detailed || !spreadPair) return [];
    const [ta, tb] = spreadPair.split("-");
    const ca = detailed.cumulativeReturns[ta];
    const cb = detailed.cumulativeReturns[tb];
    if (!ca || !cb) return [];
    const n = Math.min(ca.length, cb.length);
    const spreads = [];
    let sum = 0;
    const vals: number[] = [];
    for (let i = 0; i < n; i++) {
      const s = ca[i] - cb[i];
      vals.push(s);
      sum += s;
      spreads.push({ date: detailed.dates[i], spread: Math.round(s * 100) / 100 });
    }
    const mean = sum / n;
    for (let i = 0; i < n; i++) spreads[i].spread;
    return spreads.map((d) => ({ ...d, mean: Math.round(mean * 100) / 100 }));
  }, [detailed, spreadPair]);

  /* ─── recharts tooltip style ─── */
  const tooltipStyle = {
    fontFamily: "monospace",
    fontSize: 11,
    background: dark ? "#1a1a1a" : "#fff",
    border: `1px solid ${dark ? "#333" : "#ccc"}`,
    color: dark ? "#e0ddd5" : "#1a1a1a",
  };
  const axisTick = { fontSize: 10, fontFamily: "monospace", fill: dark ? "#aaa" : "#666" };
  const axisLabel = { fontSize: 10, fontFamily: "monospace", fill: dark ? "#aaa" : "#555" };

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Home</Link>
      <Link href="/screener-v4" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>Screener</Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: serif, color: INK }}>
          Correlation Matrix
        </h1>
        <p className="mt-1 text-sm" style={{ color: T2, fontFamily: mono }}>
          Analyze daily-return correlations across multiple assets
        </p>
        <HeavyRule />

        {/* ────── Input Row ────── */}
        <div className="my-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ fontFamily: mono, color: INK }}>
              Tickers (comma separated)
            </label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full border px-3 py-2 text-sm uppercase"
              style={{ borderColor: GRY, background: WHT, fontFamily: mono }}
              placeholder="AAPL,MSFT,GOOG"
            />
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className="border px-3 py-2 text-xs font-bold transition-colors"
                style={{
                  fontFamily: mono,
                  background: period === p.value ? INK : WHT,
                  color: period === p.value ? WHT : T2,
                  borderColor: GRY,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleRun}
            disabled={loading || tickers.length < 2}
            className="border px-6 py-2 text-sm font-bold transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ background: INK, color: WHT, borderColor: INK, fontFamily: mono }}
          >
            {loading ? "Loading…" : "Compute"}
          </button>
        </div>

        {error && <p className="py-2 text-sm" style={{ color: RED, fontFamily: mono }}>{error}</p>}

        {data && (
          <>
            {/* ────── Heatmap ────── */}
            <Hair />
            <div className="my-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="text-center" style={{ fontFamily: mono, fontSize: 12, borderCollapse: "collapse", minWidth: data.tickers.length > 6 ? data.tickers.length * 52 : "100%", width: "100%" }}>
                <thead>
                  <tr>
                    <th className="p-1 sm:p-2 text-left text-[9px] sm:text-[10px] font-bold uppercase" style={{ color: TM, position: "sticky", left: 0, zIndex: 2, background: WHT }} />
                    {data.tickers.map((t) => (
                      <th key={t} className="p-1 sm:p-2 text-[9px] sm:text-[10px] font-bold uppercase" style={{ color: INK }}>
                        <Link href={`/stocks/${t}`} className="hover:underline">{t}</Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.tickers.map((rowTicker, ri) => (
                    <tr key={rowTicker}>
                      <td className="p-1 sm:p-2 text-left text-[9px] sm:text-[10px] font-bold uppercase" style={{ color: INK, position: "sticky", left: 0, zIndex: 1, background: WHT }}>
                        <Link href={`/stocks/${rowTicker}`} className="hover:underline">{rowTicker}</Link>
                      </td>
                      {data.tickers.map((colTicker, ci) => {
                        const v = data.matrix[ri]?.[ci];
                        const isDiag = ri === ci;
                        return (
                          <td key={colTicker} className="p-1 sm:p-2 text-[10px] sm:text-xs" style={{
                            background: isDiag ? (dark ? "#333" : "#e0e0e0") : corrBg(v ?? 0),
                            color: isDiag ? TM : corrColor(v ?? 0),
                            fontWeight: 700,
                          }}>
                            {v != null ? v.toFixed(2) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Color Legend */}
            <div className="my-4 flex flex-wrap items-center justify-center gap-4 text-[10px]" style={{ fontFamily: mono, color: TM }}>
              {[
                { label: "Strong +", color: dark ? "#66bb6a" : "#1b5e20", bg: dark ? "rgba(27,94,32,0.25)" : "#e8f5e9" },
                { label: "Moderate +", color: dark ? "#81c784" : "#4caf50", bg: dark ? "rgba(76,175,80,0.15)" : "#f1f8e9" },
                { label: "Weak / None", color: TM, bg: "transparent" },
                { label: "Moderate −", color: dark ? "#ef5350" : "#e53935", bg: dark ? "rgba(229,57,53,0.15)" : "#fce4ec" },
                { label: "Strong −", color: dark ? "#ff8a80" : "#b71c1c", bg: dark ? "rgba(183,28,28,0.25)" : "#ffcdd2" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 border" style={{ background: l.bg, borderColor: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>

            <Hair />

            {/* ────── Stats Table ────── */}
            <h3 className="mt-4 text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: mono, color: INK }}>
              Individual Statistics ({data.period})
            </h3>
            <div className="my-2 overflow-x-auto">
              <table className="w-full" style={{ fontFamily: mono, fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${INK}` }}>
                    {["Ticker", "Total Return", "Annualized Vol", "Avg Daily Return"].map((h) => (
                      <th key={h} className="p-2 text-left text-[10px] font-bold uppercase" style={{ color: TM }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.tickers.map((t) => {
                    const s = data.stats.find((st) => st.ticker === t);
                    if (!s) return null;
                    return (
                      <tr key={t} style={{ borderBottom: `1px solid ${GRY}` }}>
                        <td className="p-2 font-bold">
                          <Link href={`/stocks/${t}`} className="hover:underline" style={{ color: INK }}>{t}</Link>
                        </td>
                        <td className="p-2" style={{ color: s.totalReturn >= 0 ? GAIN : LOSS }}>
                          {(s.totalReturn * 100).toFixed(1)}%
                        </td>
                        <td className="p-2" style={{ color: T2 }}>{(s.annualizedVol * 100).toFixed(1)}%</td>
                        <td className="p-2" style={{ color: T2 }}>{(s.avgDailyReturn * 100).toFixed(3)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ════════════════════════════════════════════════════════
                CHART SECTIONS — require detailed data
               ════════════════════════════════════════════════════════ */}

            {detailed && (
              <>
                {/* ───── 1. Normalised Cumulative Returns ───── */}
                <SectionHeader
                  num={1}
                  title="Cumulative Returns (normalised to 100)"
                  subtitle="Shows how each asset's value evolves relative to the start of the period. Parallel lines = high correlation."
                />
                <div style={{ width: "100%", height: 360 }}>
                  <ResponsiveContainer>
                    <LineChart data={cumulativeChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRY} />
                      <XAxis dataKey="date" tick={axisTick} interval="preserveStartEnd" />
                      <YAxis tick={axisTick} domain={["auto", "auto"]} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                      <ReferenceLine y={100} stroke={TM} strokeDasharray="4 2" />
                      {detailed.tickers.map((t, i) => (
                        <Line
                          key={t}
                          type="monotone"
                          dataKey={t}
                          stroke={PALETTE[i % PALETTE.length]}
                          dot={false}
                          strokeWidth={1.5}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* ───── 2. Rolling Correlation ───── */}
                <SectionHeader
                  num={2}
                  title="Rolling Correlation"
                  subtitle={`${detailed.window}-day rolling window. Reveals when correlations break down or spike during market stress.`}
                />
                <PairSelector pairs={allPairs} selected={rollingPair} onChange={setRollingPair} />
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={rollingChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRY} />
                      <XAxis dataKey="date" tick={axisTick} interval="preserveStartEnd" />
                      <YAxis domain={[-1, 1]} tick={axisTick} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => typeof v === "number" ? v.toFixed(3) : "—"} />
                      <ReferenceLine y={0} stroke={TM} strokeDasharray="4 2" />
                      <ReferenceLine y={0.7} stroke="#a5d6a7" strokeDasharray="2 2" />
                      <ReferenceLine y={-0.7} stroke="#ef9a9a" strokeDasharray="2 2" />
                      <Line type="monotone" dataKey="corr" stroke="#1565c0" dot={false} strokeWidth={2} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* ───── 3. Return Scatter Plot ───── */}
                <SectionHeader
                  num={3}
                  title="Return Scatter Plot"
                  subtitle="Daily returns of one asset vs another. Tight diagonal = strong correlation. Shows R² and regression line."
                />
                <PairSelector pairs={allPairs} selected={scatterPair} onChange={setScatterPair} />
                {scatterPair && (
                  <div style={{ width: "100%", height: 360 }}>
                    <ResponsiveContainer>
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRY} />
                        <XAxis
                          dataKey="x" type="number" name={scatterPair.split("-")[0]}
                          tick={axisTick}
                          label={{ value: `${scatterPair.split("-")[0]} daily return %`, position: "bottom", ...axisLabel }}
                        />
                        <YAxis
                          dataKey="y" type="number" name={scatterPair.split("-")[1]}
                          tick={axisTick}
                          label={{ value: `${scatterPair.split("-")[1]} %`, angle: -90, position: "insideLeft", ...axisLabel }}
                        />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => typeof v === "number" ? `${v.toFixed(3)}%` : "—"} />
                        <Scatter data={scatterChartData} fill="#1565c0" fillOpacity={0.35} r={2} />
                        {scatterRegression && (
                          <Scatter
                            data={[
                              { x: scatterRegression.xMin, y: scatterRegression.intercept + scatterRegression.slope * scatterRegression.xMin },
                              { x: scatterRegression.xMax, y: scatterRegression.intercept + scatterRegression.slope * scatterRegression.xMax },
                            ]}
                            fill="none"
                            line={{ stroke: "#c62828", strokeWidth: 2 }}
                            legendType="none"
                            r={0}
                          />
                        )}
                        <ReferenceLine x={0} stroke={TM} strokeDasharray="2 2" />
                        <ReferenceLine y={0} stroke={TM} strokeDasharray="2 2" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {scatterRegression && (
                  <p className="text-[11px] text-center" style={{ fontFamily: mono, color: T2 }}>
                    y = {scatterRegression.slope.toFixed(3)}x {scatterRegression.intercept >= 0 ? "+" : ""}{" "}
                    {scatterRegression.intercept.toFixed(4)} &nbsp;|&nbsp; R² = {scatterRegression.r2.toFixed(3)}
                  </p>
                )}

                {/* ───── 4. Hexagonal Density Plot ───── */}
                <SectionHeader
                  num={4}
                  title="Hexagonal Density Plot"
                  subtitle="Seaborn-style hexbin showing where daily return pairs cluster. Darker hexagons = more data points overlap."
                />
                <PairSelector pairs={allPairs} selected={hexPair} onChange={setHexPair} />
                {hexPair && hexChartData.length > 0 && (
                  <ResponsiveHexbin
                    data={hexChartData}
                    labelX={hexPair.split("-")[0]}
                    labelY={hexPair.split("-")[1]}
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

                {/* ───── 5. Ranked Correlation Pairs ───── */}
                <SectionHeader
                  num={5}
                  title="Ranked Correlation Pairs"
                  subtitle="All unique pairs sorted from most positively to most negatively correlated."
                />
                <div style={{ width: "100%", height: Math.max(200, rankedPairs.length * 24 + 40) }}>
                  <ResponsiveContainer>
                    <BarChart data={rankedPairs} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRY} />
                      <XAxis type="number" domain={[-1, 1]} tick={axisTick} />
                      <YAxis
                        dataKey="pair" type="category"
                        tick={axisTick}
                        width={75}
                      />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => typeof v === "number" ? v.toFixed(4) : "—"} />
                      <ReferenceLine x={0} stroke={INK} />
                      <Bar dataKey="corr" name="Correlation">
                        {rankedPairs.map((entry, i) => (
                          <Cell key={i} fill={corrBarColor(entry.corr)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* ───── 6. Correlation Distribution ───── */}
                <SectionHeader
                  num={6}
                  title="Correlation Distribution"
                  subtitle="How many pairs fall into each correlation bucket. A diversified portfolio has spread across buckets."
                />
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={corrHistogram} margin={{ top: 5, right: 20, bottom: 25, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRY} />
                      <XAxis
                        dataKey="range"
                        tick={axisTick}
                        label={{ value: "Correlation bucket", position: "bottom", offset: 0, ...axisLabel }}
                      />
                      <YAxis allowDecimals={false} tick={axisTick} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name="Pairs">
                        {corrHistogram.map((entry, i) => (
                          <Cell key={i} fill={histogramColor(entry.range)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* ───── 7. Risk / Return Scatter ───── */}
                <SectionHeader
                  num={7}
                  title="Volatility vs Return"
                  subtitle="Classic risk-reward view. Each dot is a ticker. Upper-left is the efficient frontier sweet spot."
                />
                <div style={{ width: "100%", height: 340 }}>
                  <ResponsiveContainer>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRY} />
                      <XAxis
                        dataKey="vol" type="number" name="Annualized Vol"
                        tick={axisTick}
                        label={{ value: "Annualized Volatility (%)", position: "bottom", ...axisLabel }}
                      />
                      <YAxis
                        dataKey="ret" type="number" name="Total Return"
                        tick={axisTick}
                        label={{ value: "Total Return (%)", angle: -90, position: "insideLeft", ...axisLabel }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => typeof v === "number" ? `${v.toFixed(2)}%` : "—"}
                        labelFormatter={() => ""}
                      />
                      <ReferenceLine y={0} stroke={TM} strokeDasharray="2 2" />
                      <Scatter data={riskReturnData} fill="#1565c0" r={5}>
                        {riskReturnData.map((entry, i) => (
                          <Cell key={i} fill={entry.ret >= 0 ? "#2e7d32" : "#c62828"} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                {/* labels for each dot */}
                <div className="flex flex-wrap justify-center gap-3 mt-1 mb-2">
                  {riskReturnData.map((d, i) => (
                    <span key={d.ticker} className="text-[10px] font-bold" style={{ fontFamily: mono, color: d.ret >= 0 ? "#2e7d32" : "#c62828" }}>
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: d.ret >= 0 ? "#2e7d32" : "#c62828" }} />
                      {d.ticker}
                    </span>
                  ))}
                </div>

                {/* ───── 8. Pair Spread ───── */}
                <SectionHeader
                  num={8}
                  title="Pair Spread (Convergence / Divergence)"
                  subtitle="Difference in normalised cumulative returns. Useful for pairs trading — deviations from the mean often revert."
                />
                <PairSelector pairs={allPairs} selected={spreadPair} onChange={setSpreadPair} />
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={spreadChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRY} />
                      <XAxis dataKey="date" tick={axisTick} interval="preserveStartEnd" />
                      <YAxis tick={axisTick} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <ReferenceLine y={0} stroke={TM} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="mean" stroke="#e65100" strokeDasharray="6 3" dot={false} strokeWidth={1} name="Mean" />
                      <Line type="monotone" dataKey="spread" stroke="#1565c0" dot={false} strokeWidth={2} name="Spread" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-center" style={{ fontFamily: mono, color: TM }}>
                  Spread = {spreadPair.split("-")[0]} normalised return − {spreadPair.split("-")[1]} normalised return
                </p>

                {/* ───── 9. Beta vs Benchmark ───── */}
                <SectionHeader
                  num={9}
                  title="Beta vs Benchmark"
                  subtitle="Sensitivity of each ticker to the selected benchmark. Beta &gt; 1 amplifies moves; &lt; 1 dampens."
                />
                <div className="mb-2 flex flex-wrap gap-1">
                  {detailed.tickers.map((t) => (
                    <button
                      key={t}
                      onClick={() => setBetaBenchmark(t)}
                      className="border px-2 py-1 text-[10px] font-bold transition-colors"
                      style={{
                        fontFamily: mono,
                        background: betaBenchmark === t ? INK : WHT,
                        color: betaBenchmark === t ? WHT : T2,
                        borderColor: GRY,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                  <span className="text-[10px] self-center ml-2" style={{ fontFamily: mono, color: TM }}>← benchmark</span>
                </div>
                <div style={{ width: "100%", height: Math.max(200, betaData.length * 32 + 40) }}>
                  <ResponsiveContainer>
                    <BarChart data={betaData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRY} />
                      <XAxis type="number" tick={axisTick} />
                      <YAxis dataKey="ticker" type="category" tick={axisTick} width={50} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => typeof v === "number" ? v.toFixed(3) : "—"} />
                      <ReferenceLine x={1} stroke="#e65100" strokeDasharray="4 2">
                        <Label value="β=1" position="top" fontSize={10} fill="#e65100" />
                      </ReferenceLine>
                      <Bar dataKey="beta" name={`Beta vs ${betaBenchmark}`}>
                        {betaData.map((entry, i) => (
                          <Cell key={i} fill={entry.beta >= 1 ? "#c62828" : entry.beta >= 0 ? "#1565c0" : "#6a1b9a"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {betaData.length > 0 && (
                  <div className="my-2 overflow-x-auto">
                    <table className="w-full" style={{ fontFamily: mono, fontSize: 11, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${INK}` }}>
                          <th className="p-1 text-left text-[10px] font-bold uppercase" style={{ color: TM }}>Ticker</th>
                          <th className="p-1 text-left text-[10px] font-bold uppercase" style={{ color: TM }}>Beta</th>
                          <th className="p-1 text-left text-[10px] font-bold uppercase" style={{ color: TM }}>R²</th>
                          <th className="p-1 text-left text-[10px] font-bold uppercase" style={{ color: TM }}>Interpretation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {betaData.map((d) => (
                          <tr key={d.ticker} style={{ borderBottom: `1px solid ${GRY}` }}>
                            <td className="p-1 font-bold" style={{ color: INK }}>{d.ticker}</td>
                            <td className="p-1" style={{ color: d.beta >= 1 ? "#c62828" : "#1565c0" }}>{d.beta.toFixed(2)}</td>
                            <td className="p-1" style={{ color: T2 }}>{d.r2.toFixed(3)}</td>
                            <td className="p-1" style={{ color: TM }}>
                              {d.beta > 1.2 ? "Amplifies moves" : d.beta > 0.8 ? "Tracks closely" : d.beta > 0 ? "Dampens moves" : "Inverse"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            <p className="my-6 text-[10px] text-center" style={{ fontFamily: mono, color: TM }}>
              Correlations based on daily returns. Past correlations may not persist.
            </p>
          </>
        )}
      </div>
    </WSJLayout>
  );
}
