"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import WSJLayout from "@/components/WSJLayout";
import TickerInput from "@/components/TickerInput";
import {
  WHT, INK, GRY, BLU, RED, T2, TM, BG, GAIN, LOSS,
  serif, mono, sans,
  Hair, WSJSection,
} from "@/lib/wsj";
import {
  fetchHeatmap,
  type HeatmapStock,
  type HeatmapResponse,
} from "@/lib/api";
import { useWatchlist } from "@/lib/useWatchlist";

/* ════════════════════════════════════════════════════════════
   Sector color palette — consistent, distinguishable hues
   ════════════════════════════════════════════════════════════ */

const SECTOR_COLORS: Record<string, string> = {
  "Technology":            "#4a90d9",
  "Healthcare":            "#e57373",
  "Financial Services":    "#81c784",
  "Consumer Cyclical":     "#ffb74d",
  "Communication Services":"#ba68c8",
  "Industrials":           "#a1887f",
  "Consumer Defensive":    "#4db6ac",
  "Energy":                "#ff8a65",
  "Utilities":             "#90a4ae",
  "Real Estate":           "#aed581",
  "Basic Materials":       "#f06292",
};

function sectorColor(sector: string | null): string {
  if (!sector) return TM;
  return SECTOR_COLORS[sector] || TM;
}

/* ════════════════════════════════════════════════════════════
   Sparkline — mini price chart for tooltip
   ════════════════════════════════════════════════════════════ */

function Sparkline({ data, width = 200, height = 48 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const isUp = data[data.length - 1] >= data[0];
  const stroke = isUp ? GAIN : LOSS;
  const fillPoints = `${pad},${pad + h} ${points.join(" ")} ${pad + w},${pad + h}`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polygon points={fillPoints} fill={stroke} opacity={0.1} />
      <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth={1.5} />
      <circle
        cx={pad + w}
        cy={pad + h - ((data[data.length - 1] - min) / range) * h}
        r={2.5}
        fill={stroke}
      />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   Bubble layout — force-directed circle packing
   ════════════════════════════════════════════════════════════ */

interface Bubble {
  stock: HeatmapStock;
  x: number;
  y: number;
  r: number;
}

/* Simple deterministic hash for symbol → 0..1 float */
function hashSymbol(s: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return ((h & 0x7fffffff) % 10000) / 10000;
}

function layoutBubbles(
  stocks: HeatmapStock[],
  width: number,
  height: number,
  sizeBy: "marketCap" | "volume",
): Bubble[] {
  if (stocks.length === 0) return [];

  // Compute radius from value
  const values = stocks.map((s) =>
    sizeBy === "marketCap" ? s.marketCap : (s.volume ?? s.averageVolume ?? 0)
  );
  const maxVal = Math.max(...values, 1);
  const minR = 6;
  const maxR = Math.min(width, height) * 0.08;

  const bubbles: Bubble[] = stocks.map((stock, i) => {
    const val = values[i];
    const r = minR + (maxR - minR) * Math.sqrt(val / maxVal);
    // Deterministic initial position from symbol hash
    const hx = hashSymbol(stock.symbol, 1);
    const hy = hashSymbol(stock.symbol, 2);
    return {
      stock,
      x: width / 2 + (hx - 0.5) * width * 0.6,
      y: height / 2 + (hy - 0.5) * height * 0.6,
      r: Math.max(minR, r),
    };
  });

  // Simple force simulation (collision + centering)
  const cx = width / 2;
  const cy = height / 2;

  for (let iter = 0; iter < 120; iter++) {
    const alpha = 0.3 * (1 - iter / 120);

    // Centering force
    for (const b of bubbles) {
      b.x += (cx - b.x) * alpha * 0.02;
      b.y += (cy - b.y) * alpha * 0.02;
    }

    // Collision resolution
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i], b = bubbles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = a.r + b.r + 1.5;
        if (dist < minDist) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
        }
      }
    }

    // Keep in bounds
    for (const b of bubbles) {
      b.x = Math.max(b.r + 2, Math.min(width - b.r - 2, b.x));
      b.y = Math.max(b.r + 2, Math.min(height - b.r - 2, b.y));
    }
  }

  return bubbles;
}

/* ════════════════════════════════════════════════════════════
   Change % color — green/red spectrum
   ════════════════════════════════════════════════════════════ */

function changeColor(pct: number | null): string {
  if (pct == null) return TM;
  const clamped = Math.max(-5, Math.min(5, pct));
  const t = Math.pow(Math.abs(clamped) / 5, 0.65);
  if (clamped >= 0) {
    const r = Math.round(45 + (1 - t) * 75);
    const g = Math.round(110 + t * 80);
    const b = Math.round(55 + (1 - t) * 50);
    return `rgb(${r},${g},${b})`;
  } else {
    const r = Math.round(155 + t * 70);
    const g = Math.round(65 - t * 35);
    const b = Math.round(60 - t * 25);
    return `rgb(${r},${g},${b})`;
  }
}

type ColorMode = "sector" | "change";

/* ════════════════════════════════════════════════════════════
   Mobile breakpoint hook
   ════════════════════════════════════════════════════════════ */

function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return mobile;
}

/* ════════════════════════════════════════════════════════════
   Main Bubble Map Page
   ════════════════════════════════════════════════════════════ */

type SizeMode = "marketCap" | "volume";
type DisplayMode = "bubble" | "sectors" | "table";
type SparkPeriod = "3m" | "6m" | "1y" | "2y" | "5y";
const SPARK_SLICES: Record<SparkPeriod, number> = { "3m": 63, "6m": 126, "1y": 252, "2y": 504, "5y": Infinity };
const SPARK_LABELS: Record<SparkPeriod, string> = { "3m": "3 months", "6m": "6 months", "1y": "1 year", "2y": "2 years", "5y": "5 years" };

export default function BubblePage() {
  return <Suspense><BubbleInner /></Suspense>;
}

function BubbleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { toggle: toggleWatchlist, has: inWatchlist } = useWatchlist();

  /* State — read initial values from URL */
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"1d" | "1w" | "1m" | "ytd">(
    (searchParams.get("period") as "1d" | "1w" | "1m" | "ytd") || "1d"
  );
  const [sectorFilter, setSectorFilter] = useState<string>(searchParams.get("sector") || "");
  const [colorMode, setColorMode] = useState<ColorMode>(
    (searchParams.get("color") as ColorMode) || "sector"
  );
  const [sizeMode, setSizeMode] = useState<SizeMode>(
    (searchParams.get("size") as SizeMode) || "marketCap"
  );
  const [searchTicker, setSearchTicker] = useState<string>(searchParams.get("q") || "");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    (searchParams.get("display") as DisplayMode) || "bubble"
  );
  const [hoveredBubble, setHoveredBubble] = useState<HeatmapStock | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedStock, setSelectedStock] = useState<HeatmapStock | null>(null);
  const [sparkPeriod, setSparkPeriod] = useState<SparkPeriod>(
    (searchParams.get("chart") as SparkPeriod) || "1y"
  );

  /* Sync state → URL */
  useEffect(() => {
    const params = new URLSearchParams();
    if (period !== "1d") params.set("period", period);
    if (sparkPeriod !== "1y") params.set("chart", sparkPeriod);
    if (sectorFilter) params.set("sector", sectorFilter);
    if (colorMode !== "sector") params.set("color", colorMode);
    if (sizeMode !== "marketCap") params.set("size", sizeMode);
    if (displayMode !== "bubble") params.set("display", displayMode);
    if (searchTicker) params.set("q", searchTicker);
    const qs = params.toString();
    router.replace(`/bubble${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [period, sparkPeriod, sectorFilter, colorMode, sizeMode, displayMode, searchTicker, router]);

  /* Fetch data */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchHeatmap({ index: "twse", period })
      .then((res) => { if (!controller.signal.aborted) { setData(res); setLoading(false); } })
      .catch((err) => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [period]);

  /* Filtered stocks */
  const filtered = useMemo(() => {
    if (!data) return [];
    let stocks = data.stocks.filter((s) => s.marketCap > 0);
    if (sectorFilter) stocks = stocks.filter((s) => s.sector === sectorFilter);
    return stocks;
  }, [data, sectorFilter]);

  /* Sector rank map: symbol → "#N in Sector" */
  const sectorRankMap = useMemo(() => {
    const map = new Map<string, string>();
    const byS = new Map<string, HeatmapStock[]>();
    for (const s of filtered) {
      const sec = s.sector || "Other";
      if (!byS.has(sec)) byS.set(sec, []);
      byS.get(sec)!.push(s);
    }
    for (const [sec, stocks] of byS) {
      const sorted = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
      sorted.forEach((s, i) => map.set(s.symbol, `#${i + 1} in ${sec}`));
    }
    return map;
  }, [filtered]);

  /* Layout */
  const MAP_W = 1100;
  const MAP_H = 650;

  const bubbles = useMemo(
    () => layoutBubbles(filtered, MAP_W, MAP_H, sizeMode),
    [filtered, sizeMode],
  );

  /* Unique sectors for legend */
  const activeSectors = useMemo(() => {
    const set = new Set<string>();
    for (const s of filtered) if (s.sector) set.add(s.sector);
    return Array.from(set).sort();
  }, [filtered]);

  /* Sector groups for per-sector view */
  const sectorGroups = useMemo(() => {
    const map = new Map<string, HeatmapStock[]>();
    for (const s of filtered) {
      const sec = s.sector || "Other";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(s);
    }
    return Array.from(map.entries())
      .map(([sector, stocks]) => ({
        sector,
        stocks: stocks.sort((a, b) => b.marketCap - a.marketCap),
        totalCap: stocks.reduce((sum, s) => sum + s.marketCap, 0),
      }))
      .sort((a, b) => b.totalCap - a.totalCap);
  }, [filtered]);

  /* Per-sector bubble layouts */
  const SECTOR_W = 1100;
  const perSectorBubbles = useMemo(() => {
    return sectorGroups.map((group) => {
      const count = group.stocks.length;
      const h = count <= 5 ? 250 : count <= 15 ? 350 : count <= 30 ? 420 : 500;
      const bubs = layoutBubbles(group.stocks, SECTOR_W, h, sizeMode);
      return { sector: group.sector, totalCap: group.totalCap, stockCount: count, bubbles: bubs, w: SECTOR_W, h };
    });
  }, [sectorGroups, sizeMode]);

  /* Navigate */
  const handleSubmit = useCallback((t: string) => {
    router.push(`/stocks/${t.toUpperCase()}`);
  }, [router]);

  const handleMouseMove = useCallback((e: React.MouseEvent, stock: HeatmapStock) => {
    setHoveredBubble(stock);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredBubble(null);
  }, []);

  /* Nav */
  const navContent = (
    <>
      <div className="flex items-center gap-3">
        <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
          Home
        </Link>
        <Link href="/screener-v4" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
          Screener
        </Link>
        <Link href="/heatmap" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
          Heatmap
        </Link>
      </div>
      <TickerInput onSubmit={handleSubmit} />
    </>
  );

  return (
    <WSJLayout navContent={navContent}>
      <WSJSection title="Bubble Map" />

      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        {/* Period toggle */}
        <div className="flex border" style={{ borderColor: GRY }}>
          {(["1d", "1w", "1m", "ytd"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
              style={{
                fontFamily: mono,
                background: period === p ? INK : "transparent",
                color: period === p ? WHT : TM,
              }}
            >
              {p === "1d" ? "1D" : p === "1w" ? "1W" : p === "1m" ? "1M" : "YTD"}
            </button>
          ))}
        </div>

        {/* Sparkline chart period — hide on small screens */}
        <div className="hidden sm:flex border" style={{ borderColor: GRY }}>
          <span className="px-2 py-1.5 text-[9px] uppercase tracking-wider" style={{ fontFamily: mono, color: TM }}>Chart</span>
          {(["3m", "6m", "1y", "2y", "5y"] as SparkPeriod[]).map((sp) => (
            <button
              key={sp}
              onClick={() => setSparkPeriod(sp)}
              className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
              style={{
                fontFamily: mono,
                background: sparkPeriod === sp ? INK : "transparent",
                color: sparkPeriod === sp ? WHT : TM,
              }}
            >
              {sp.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Color mode */}
        <div className="flex border" style={{ borderColor: GRY }}>
          {(["sector", "change"] as ColorMode[]).map((cm) => (
            <button
              key={cm}
              onClick={() => setColorMode(cm)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
              style={{
                fontFamily: mono,
                background: colorMode === cm ? INK : "transparent",
                color: colorMode === cm ? WHT : TM,
              }}
            >
              {cm === "sector" ? "Color: Sector" : "Color: Change%"}
            </button>
          ))}
        </div>

        {/* Size mode */}
        <div className="flex border" style={{ borderColor: GRY }}>
          {(["marketCap", "volume"] as SizeMode[]).map((sm) => (
            <button
              key={sm}
              onClick={() => setSizeMode(sm)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
              style={{
                fontFamily: mono,
                background: sizeMode === sm ? INK : "transparent",
                color: sizeMode === sm ? WHT : TM,
              }}
            >
              {sm === "marketCap" ? "Size: Mkt Cap" : "Size: Volume"}
            </button>
          ))}
        </div>

        {/* Sector dropdown */}
        {data && (
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="px-2 py-1.5 border text-[10px] uppercase tracking-wider"
            style={{ fontFamily: mono, borderColor: GRY, background: WHT, color: INK }}
            aria-label="Filter by sector"
          >
            <option value="">All Sectors</option>
            {data.sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Search */}
        <input
          type="text"
          value={searchTicker}
          onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
          placeholder="Search…"
          className="px-2 py-1.5 border text-[10px] uppercase tracking-wider w-24 sm:w-28"
          style={{ fontFamily: mono, borderColor: GRY, background: WHT, color: INK }}
        />

        <span className="ml-auto text-[10px] tabular-nums" style={{ fontFamily: mono, color: TM }}>
          {filtered.length} stocks
        </span>

        {/* Display mode toggle */}
        <div className="flex border" style={{ borderColor: GRY }}>
          {(["bubble", "sectors", "table"] as DisplayMode[]).map((dm) => (
            <button
              key={dm}
              onClick={() => { setDisplayMode(dm); setSelectedStock(null); }}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
              style={{
                fontFamily: mono,
                background: displayMode === dm ? INK : "transparent",
                color: displayMode === dm ? WHT : TM,
              }}
            >
              {dm === "bubble" ? "Map" : dm === "sectors" ? "Sectors" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="border" style={{ borderColor: GRY }}>
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full" style={{ background: WHT }}>
            <defs>
              <linearGradient id="bshimmer" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={GRY} stopOpacity="0.15" />
                <stop offset="50%" stopColor={GRY} stopOpacity="0.35" />
                <stop offset="100%" stopColor={GRY} stopOpacity="0.15" />
                <animate attributeName="x1" values="-1;2" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="x2" values="0;3" dur="1.5s" repeatCount="indefinite" />
              </linearGradient>
            </defs>
            {/* Fake bubble circles */}
            {[
              { cx: 350, cy: 260, r: 90 }, { cx: 550, cy: 300, r: 75 },
              { cx: 750, cy: 250, r: 60 }, { cx: 220, cy: 400, r: 55 },
              { cx: 450, cy: 150, r: 50 }, { cx: 650, cy: 420, r: 45 },
              { cx: 850, cy: 380, r: 40 }, { cx: 300, cy: 140, r: 35 },
              { cx: 180, cy: 280, r: 30 }, { cx: 900, cy: 180, r: 28 },
              { cx: 500, cy: 480, r: 25 }, { cx: 700, cy: 130, r: 22 },
              { cx: 400, cy: 530, r: 20 }, { cx: 800, cy: 530, r: 18 },
            ].map((c, i) => (
              <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="url(#bshimmer)" />
            ))}
          </svg>
        </div>
      )}
      {error && (
        <div className="py-10 text-center">
          <span className="text-[11px]" style={{ fontFamily: mono, color: RED }}>{error}</span>
        </div>
      )}

      {/* ── Bubble Chart ── */}
      {!loading && !error && bubbles.length > 0 && displayMode === "bubble" && (
        <div className="relative border" style={{ borderColor: GRY }}>
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="w-full"
            style={{ background: WHT }}
            onMouseLeave={handleMouseLeave}
          >
            {bubbles.map((b) => {
              const fill = colorMode === "sector"
                ? sectorColor(b.stock.sector)
                : changeColor(b.stock.changePercent);
              const isHovered = hoveredBubble?.symbol === b.stock.symbol;
              const isSelected = selectedStock?.symbol === b.stock.symbol;
              const isSearchMatch = searchTicker.length > 0 && b.stock.symbol.includes(searchTicker);
              const isDimmed = (hoveredBubble && !isHovered)
                || (selectedStock && !isSelected)
                || (searchTicker.length > 0 && !isSearchMatch);
              const showLabel = b.r > 14;
              const showPct = b.r > 20;

              return (
                <g
                  key={b.stock.symbol}
                  onMouseMove={(e) => !isMobile && handleMouseMove(e, b.stock)}
                  onClick={() => {
                    if (isMobile) {
                      setSelectedStock((prev) =>
                        prev?.symbol === b.stock.symbol ? null : b.stock
                      );
                    } else {
                      router.push(`/stocks/${b.stock.symbol}`);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={b.r}
                    fill={fill}
                    stroke={isSearchMatch ? INK : isHovered || isSelected ? INK : WHT}
                    strokeWidth={isSearchMatch ? 3 : isHovered || isSelected ? 2 : 0.5}
                    opacity={isDimmed ? 0.25 : 0.85}
                  />
                  {showLabel && (
                    <text
                      x={b.x}
                      y={b.y - (showPct ? 4 : 0)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={b.r > 30 ? 11 : b.r > 20 ? 9 : 7}
                      fontWeight="bold"
                      fontFamily="var(--font-mono-data), monospace"
                      style={{ pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                    >
                      {b.stock.symbol}
                    </text>
                  )}
                  {showPct && b.stock.changePercent != null && (
                    <text
                      x={b.x}
                      y={b.y + (b.r > 30 ? 10 : 8)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={b.r > 30 ? 9 : 7}
                      fontFamily="var(--font-mono-data), monospace"
                      style={{ pointerEvents: "none", opacity: 0.9, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                    >
                      {b.stock.changePercent >= 0 ? "+" : ""}{b.stock.changePercent.toFixed(1)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Desktop hover tooltip */}
          {!isMobile && hoveredBubble && (
            <div
              className="fixed z-50 px-3 py-2 shadow-lg border pointer-events-none"
              style={{
                left: tooltipPos.x + 14,
                top: tooltipPos.y - 10,
                background: WHT,
                borderColor: GRY,
                maxWidth: 260,
              }}
            >
              <div className="text-[11px] font-bold" style={{ fontFamily: mono, color: INK }}>
                {hoveredBubble.symbol}
                <span className="font-normal ml-1.5" style={{ color: T2 }}>
                  {hoveredBubble.shortName}
                </span>
              </div>
              {hoveredBubble.sparkline && hoveredBubble.sparkline.length > 1 && (() => {
                const n = SPARK_SLICES[sparkPeriod];
                const sliced = n === Infinity ? hoveredBubble.sparkline : hoveredBubble.sparkline.slice(-n);
                return sliced.length > 1 ? (
                  <div className="mt-1 border-b" style={{ borderColor: GRY }}>
                    <Sparkline data={sliced} width={232} height={50} />
                    <div className="flex justify-between text-[7px] pb-0.5 px-0.5" style={{ fontFamily: mono, color: TM }}>
                      <span>{SPARK_LABELS[sparkPeriod]} ago</span>
                      <span>Today</span>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]" style={{ fontFamily: mono }}>
                <span style={{ color: TM }}>Price</span>
                <span className="text-right" style={{ color: INK }}>
                  ${hoveredBubble.currentPrice?.toFixed(2) ?? "—"}
                </span>
                <span style={{ color: TM }}>Change</span>
                <span className="text-right font-bold" style={{
                  color: (hoveredBubble.changePercent ?? 0) >= 0 ? GAIN : LOSS,
                }}>
                  {hoveredBubble.changePercent != null
                    ? `${hoveredBubble.changePercent >= 0 ? "+" : ""}${hoveredBubble.changePercent.toFixed(2)}%`
                    : "—"}
                </span>
                <span style={{ color: TM }}>Mkt Cap</span>
                <span className="text-right" style={{ color: INK }}>
                  {fmtCap(hoveredBubble.marketCap)}
                </span>
                <span style={{ color: TM }}>Sector</span>
                <span className="text-right" style={{ color: INK }}>
                  {hoveredBubble.sector ?? "—"}
                </span>
                <span style={{ color: TM }}>Volume</span>
                <span className="text-right" style={{ color: INK }}>
                  {fmtVol(hoveredBubble.volume)}
                </span>
                <span style={{ color: TM }}>Rank</span>
                <span className="text-right" style={{ color: INK }}>
                  {sectorRankMap.get(hoveredBubble.symbol) ?? "—"}
                </span>
              </div>
              {hoveredBubble.debug && (
                <div className="mt-1.5 pt-1 border-t text-[8px]" style={{ borderColor: GRY, fontFamily: mono, color: TM }}>
                  <div className="font-bold mb-0.5" style={{ color: INK }}>Debug — {period.toUpperCase()}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                    <span>Latest</span>
                    <span className="text-right" style={{ color: INK }}>
                      ${hoveredBubble.debug.latestClose?.toFixed(2) ?? "—"} ({hoveredBubble.debug.latestDate ?? "—"})
                    </span>
                    <span>Ref</span>
                    <span className="text-right" style={{ color: INK }}>
                      ${hoveredBubble.debug.refClose?.toFixed(2) ?? "—"} ({hoveredBubble.debug.refDate ?? "—"})
                    </span>
                  </div>
                </div>
              )}
              <button
                className="mt-1.5 w-full text-center text-[9px] font-bold py-1 pointer-events-auto transition-colors"
                style={{
                  fontFamily: mono,
                  background: inWatchlist(hoveredBubble.symbol) ? BG : INK,
                  color: inWatchlist(hoveredBubble.symbol) ? INK : WHT,
                  border: `1px solid ${GRY}`,
                }}
                onClick={() => toggleWatchlist(hoveredBubble.symbol)}
              >
                {inWatchlist(hoveredBubble.symbol) ? "★ In Watchlist" : "☆ Add to Watchlist"}
              </button>
            </div>
          )}

          {/* Mobile tap detail card */}
          {isMobile && selectedStock && (
            <div
              className="absolute bottom-0 left-0 right-0 z-50 px-3 py-2.5 shadow-lg border-t"
              style={{ background: WHT, borderColor: GRY }}
            >
              <div className="flex items-start justify-between">
                <div className="text-[12px] font-bold" style={{ fontFamily: mono, color: INK }}>
                  {selectedStock.symbol}
                  <span className="font-normal ml-1.5 text-[10px]" style={{ color: T2 }}>
                    {selectedStock.shortName}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStock(null)}
                  className="text-[14px] leading-none px-1"
                  style={{ color: TM }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              {selectedStock.sparkline && selectedStock.sparkline.length > 1 && (() => {
                const n = SPARK_SLICES[sparkPeriod];
                const sliced = n === Infinity ? selectedStock.sparkline : selectedStock.sparkline.slice(-n);
                return sliced.length > 1 ? (
                  <div className="mt-1 border-b" style={{ borderColor: GRY }}>
                    <Sparkline data={sliced} width={280} height={50} />
                    <div className="flex justify-between text-[7px] pb-0.5 px-0.5" style={{ fontFamily: mono, color: TM }}>
                      <span>{SPARK_LABELS[sparkPeriod]} ago</span>
                      <span>Today</span>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]" style={{ fontFamily: mono }}>
                <span style={{ color: TM }}>Price</span>
                <span className="text-right" style={{ color: INK }}>
                  ${selectedStock.currentPrice?.toFixed(2) ?? "—"}
                </span>
                <span style={{ color: TM }}>Change</span>
                <span className="text-right font-bold" style={{
                  color: (selectedStock.changePercent ?? 0) >= 0 ? GAIN : LOSS,
                }}>
                  {selectedStock.changePercent != null
                    ? `${selectedStock.changePercent >= 0 ? "+" : ""}${selectedStock.changePercent.toFixed(2)}%`
                    : "—"}
                </span>
                <span style={{ color: TM }}>Mkt Cap</span>
                <span className="text-right" style={{ color: INK }}>
                  {fmtCap(selectedStock.marketCap)}
                </span>
                <span style={{ color: TM }}>Volume</span>
                <span className="text-right" style={{ color: INK }}>
                  {fmtVol(selectedStock.volume)}
                </span>
              </div>
              {selectedStock.debug && (
                <div className="mt-1.5 pt-1 border-t text-[8px]" style={{ borderColor: GRY, fontFamily: mono, color: TM }}>
                  <div className="font-bold mb-0.5" style={{ color: INK }}>Debug — {period.toUpperCase()}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                    <span>Latest</span>
                    <span className="text-right" style={{ color: INK }}>
                      ${selectedStock.debug.latestClose?.toFixed(2) ?? "—"} ({selectedStock.debug.latestDate ?? "—"})
                    </span>
                    <span>Ref</span>
                    <span className="text-right" style={{ color: INK }}>
                      ${selectedStock.debug.refClose?.toFixed(2) ?? "—"} ({selectedStock.debug.refDate ?? "—"})
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  className="flex-1 text-center text-[10px] font-bold py-1.5 transition-colors"
                  style={{
                    fontFamily: mono,
                    background: INK,
                    color: WHT,
                    border: `1px solid ${GRY}`,
                  }}
                  onClick={() => router.push(`/stocks/${selectedStock.symbol}`)}
                >
                  View Details →
                </button>
                <button
                  className="flex-1 text-center text-[10px] font-bold py-1.5 transition-colors"
                  style={{
                    fontFamily: mono,
                    background: inWatchlist(selectedStock.symbol) ? BG : "transparent",
                    color: INK,
                    border: `1px solid ${GRY}`,
                  }}
                  onClick={() => toggleWatchlist(selectedStock.symbol)}
                >
                  {inWatchlist(selectedStock.symbol) ? "★ Watchlist" : "☆ Watchlist"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sector-by-Sector Bubbles ── */}
      {!loading && !error && filtered.length > 0 && displayMode === "sectors" && (
        <div className="space-y-5">
          {perSectorBubbles.map((layout) => (
            <div key={layout.sector}>
              <div className="flex items-baseline justify-between mb-1">
                <h3
                  className="text-[13px] font-bold uppercase tracking-wider"
                  style={{ fontFamily: mono, color: INK }}
                >
                  {layout.sector}
                </h3>
                <span className="text-[9px] tabular-nums" style={{ fontFamily: mono, color: TM }}>
                  {layout.stockCount} stocks · {fmtCap(layout.totalCap)}
                </span>
              </div>
              <div className="relative border" style={{ borderColor: GRY }}>
                <svg
                  viewBox={`0 0 ${layout.w} ${layout.h}`}
                  className="w-full"
                  style={{ background: WHT }}
                  onMouseLeave={handleMouseLeave}
                >
                  {layout.bubbles.map((b) => {
                    const fill = colorMode === "sector"
                      ? sectorColor(b.stock.sector)
                      : changeColor(b.stock.changePercent);
                    const isHovered = hoveredBubble?.symbol === b.stock.symbol;
                    const isSelected = selectedStock?.symbol === b.stock.symbol;
                    const isSearchMatch = searchTicker.length > 0 && b.stock.symbol.includes(searchTicker);
                    const isDimmed = (hoveredBubble && !isHovered)
                      || (selectedStock && !isSelected)
                      || (searchTicker.length > 0 && !isSearchMatch);
                    const showLabel = b.r > 12;
                    const showPct = b.r > 18;

                    return (
                      <g
                        key={b.stock.symbol}
                        onMouseMove={(e) => !isMobile && handleMouseMove(e, b.stock)}
                        onClick={() => {
                          if (isMobile) {
                            setSelectedStock((prev) =>
                              prev?.symbol === b.stock.symbol ? null : b.stock
                            );
                          } else {
                            router.push(`/stocks/${b.stock.symbol}`);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <circle
                          cx={b.x}
                          cy={b.y}
                          r={b.r}
                          fill={fill}
                          stroke={isSearchMatch ? INK : isHovered || isSelected ? INK : WHT}
                          strokeWidth={isSearchMatch ? 3 : isHovered || isSelected ? 2 : 0.5}
                          opacity={isDimmed ? 0.25 : 0.85}
                        />
                        {showLabel && (
                          <text
                            x={b.x}
                            y={b.y - (showPct ? 4 : 0)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#fff"
                            fontSize={b.r > 30 ? 12 : b.r > 20 ? 10 : 8}
                            fontWeight="bold"
                            fontFamily="var(--font-mono-data), monospace"
                            style={{ pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                          >
                            {b.stock.symbol}
                          </text>
                        )}
                        {showPct && b.stock.changePercent != null && (
                          <text
                            x={b.x}
                            y={b.y + (b.r > 30 ? 12 : 9)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#fff"
                            fontSize={b.r > 30 ? 10 : 7}
                            fontFamily="var(--font-mono-data), monospace"
                            style={{ pointerEvents: "none", opacity: 0.9, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                          >
                            {b.stock.changePercent >= 0 ? "+" : ""}{b.stock.changePercent.toFixed(1)}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Desktop tooltip */}
                {!isMobile && hoveredBubble && layout.bubbles.some((b) => b.stock.symbol === hoveredBubble.symbol) && (
                  <div
                    className="fixed z-50 px-3 py-2 shadow-lg border pointer-events-none"
                    style={{
                      left: tooltipPos.x + 14,
                      top: tooltipPos.y - 10,
                      background: WHT,
                      borderColor: GRY,
                      maxWidth: 260,
                    }}
                  >
                    <div className="text-[11px] font-bold" style={{ fontFamily: mono, color: INK }}>
                      {hoveredBubble.symbol}
                      <span className="font-normal ml-1.5" style={{ color: T2 }}>
                        {hoveredBubble.shortName}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]" style={{ fontFamily: mono }}>
                      <span style={{ color: TM }}>Price</span>
                      <span className="text-right" style={{ color: INK }}>
                        ${hoveredBubble.currentPrice?.toFixed(2) ?? "—"}
                      </span>
                      <span style={{ color: TM }}>Change</span>
                      <span className="text-right font-bold" style={{
                        color: (hoveredBubble.changePercent ?? 0) >= 0 ? GAIN : LOSS,
                      }}>
                        {hoveredBubble.changePercent != null
                          ? `${hoveredBubble.changePercent >= 0 ? "+" : ""}${hoveredBubble.changePercent.toFixed(2)}%`
                          : "—"}
                      </span>
                      <span style={{ color: TM }}>Mkt Cap</span>
                      <span className="text-right" style={{ color: INK }}>
                        {fmtCap(hoveredBubble.marketCap)}
                      </span>
                      <span style={{ color: TM }}>Volume</span>
                      <span className="text-right" style={{ color: INK }}>
                        {fmtVol(hoveredBubble.volume)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Mobile tap card */}
                {isMobile && selectedStock && layout.bubbles.some((b) => b.stock.symbol === selectedStock.symbol) && (
                  <div
                    className="absolute bottom-0 left-0 right-0 z-50 px-3 py-2.5 shadow-lg border-t"
                    style={{ background: WHT, borderColor: GRY }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-[12px] font-bold" style={{ fontFamily: mono, color: INK }}>
                        {selectedStock.symbol}
                        <span className="font-normal ml-1.5 text-[10px]" style={{ color: T2 }}>
                          {selectedStock.shortName}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedStock(null)}
                        className="text-[14px] leading-none px-1"
                        style={{ color: TM }}
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]" style={{ fontFamily: mono }}>
                      <span style={{ color: TM }}>Price</span>
                      <span className="text-right" style={{ color: INK }}>
                        ${selectedStock.currentPrice?.toFixed(2) ?? "—"}
                      </span>
                      <span style={{ color: TM }}>Change</span>
                      <span className="text-right font-bold" style={{
                        color: (selectedStock.changePercent ?? 0) >= 0 ? GAIN : LOSS,
                      }}>
                        {selectedStock.changePercent != null
                          ? `${selectedStock.changePercent >= 0 ? "+" : ""}${selectedStock.changePercent.toFixed(2)}%`
                          : "—"}
                      </span>
                      <span style={{ color: TM }}>Mkt Cap</span>
                      <span className="text-right" style={{ color: INK }}>
                        {fmtCap(selectedStock.marketCap)}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        className="flex-1 text-center text-[10px] font-bold py-1.5 transition-colors"
                        style={{
                          fontFamily: mono,
                          background: INK,
                          color: WHT,
                          border: `1px solid ${GRY}`,
                        }}
                        onClick={() => router.push(`/stocks/${selectedStock.symbol}`)}
                      >
                        View Details →
                      </button>
                      <button
                        className="flex-1 text-center text-[10px] font-bold py-1.5 transition-colors"
                        style={{
                          fontFamily: mono,
                          background: inWatchlist(selectedStock.symbol) ? BG : "transparent",
                          color: INK,
                          border: `1px solid ${GRY}`,
                        }}
                        onClick={() => toggleWatchlist(selectedStock.symbol)}
                      >
                        {inWatchlist(selectedStock.symbol) ? "★ Watchlist" : "☆ Watchlist"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table View ── */}
      {!loading && !error && filtered.length > 0 && displayMode === "table" && (
        <div className="border overflow-auto" style={{ borderColor: GRY, maxHeight: 520 }}>
          <table className="w-full text-[10px]" style={{ fontFamily: mono }}>
            <thead>
              <tr style={{ background: INK, color: WHT }}>
                <th className="px-2 py-1.5 text-left">Ticker</th>
                <th className="px-2 py-1.5 text-left">Sector</th>
                <th className="px-2 py-1.5 text-right">Chg%</th>
                <th className="px-2 py-1.5 text-right">Mkt Cap</th>
              </tr>
            </thead>
            <tbody>
              {[...filtered]
                .sort((a, b) => b.marketCap - a.marketCap)
                .map((s) => (
                  <tr
                    key={s.symbol}
                    onClick={() => router.push(`/stocks/${s.symbol}`)}
                    className="border-b cursor-pointer"
                    style={{ borderColor: GRY }}
                  >
                    <td className="px-2 py-1 font-bold" style={{ color: INK }}>{s.symbol}</td>
                    <td className="px-2 py-1" style={{ color: TM, fontSize: 8 }}>{s.sector}</td>
                    <td className="px-2 py-1 text-right font-bold" style={{
                      color: (s.changePercent ?? 0) >= 0 ? GAIN : LOSS,
                    }}>
                      {s.changePercent != null
                        ? `${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="px-2 py-1 text-right" style={{ color: T2 }}>{fmtCap(s.marketCap)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Legend ── */}
      {!loading && !error && (
        <div className="mt-3">
          {colorMode === "sector" ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {activeSectors.map((s) => (
                <button
                  key={s}
                  onClick={() => setSectorFilter(sectorFilter === s ? "" : s)}
                  className="flex items-center gap-1.5 transition-opacity"
                  style={{ opacity: sectorFilter && sectorFilter !== s ? 0.4 : 1 }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: sectorColor(s) }} />
                  <span className="text-[8px] uppercase tracking-wider" style={{ fontFamily: sans, color: T2 }}>
                    {s}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              {[-5, -3, -1, 0, 1, 3, 5].map((v) => (
                <div key={v} className="flex flex-col items-center">
                  <div className="w-6 h-3 rounded-sm" style={{ background: changeColor(v) }} />
                  <span className="text-[7px] mt-0.5 tabular-nums" style={{ fontFamily: mono, color: TM }}>
                    {v >= 0 ? "+" : ""}{v}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Hair />
      <p className="text-[9px] italic" style={{ fontFamily: serif, color: TM }}>
        Bubble size represents {sizeMode === "marketCap" ? "market capitalization" : "trading volume"}.
        Color indicates {colorMode === "sector" ? "sector membership" : "daily percentage change"}.
        Click any bubble to view detailed stock analysis.
      </p>
    </WSJLayout>
  );
}

/* ── Helpers ── */

function fmtCap(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtVol(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
}
