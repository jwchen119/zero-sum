"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import WSJLayout from "@/components/WSJLayout";
import TickerInput from "@/components/TickerInput";
import {
  WHT, INK, GRY, BLU, RED, T2, TM, BG, GAIN, LOSS,
  serif, mono,
  Hair, WSJSection,
} from "@/lib/wsj";
import {
  fetchHeatmap,
  type HeatmapStock,
  type HeatmapResponse,
} from "@/lib/api";
import { useWatchlist } from "@/lib/useWatchlist";

/* ════════════════════════════════════════════════════════════
   Color scale — green for gains, warm red for losses
   Matches the WSJ newspaper palette
   ════════════════════════════════════════════════════════════ */

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

const COLOR_SCALE: Record<string, number> = { "1d": 5, "1w": 10, "1m": 15, "ytd": 25 };

function changeColor(pct: number | null, scale = 5): string {
  if (pct == null) return GRY;
  const clamped = Math.max(-scale, Math.min(scale, pct));
  const t = Math.pow(Math.abs(clamped) / scale, 0.65);
  const dark = isDarkMode();
  if (clamped >= 0) {
    if (dark) {
      const r = Math.round(30 + (1 - t) * 50);
      const g = Math.round(90 + t * 100);
      const b = Math.round(50 + (1 - t) * 30);
      return `rgb(${r},${g},${b})`;
    }
    const r = Math.round(45 + (1 - t) * 75);
    const g = Math.round(110 + t * 80);
    const b = Math.round(55 + (1 - t) * 50);
    return `rgb(${r},${g},${b})`;
  } else {
    if (dark) {
      const r = Math.round(170 + t * 60);
      const g = Math.round(50 - t * 25);
      const b = Math.round(50 - t * 20);
      return `rgb(${r},${g},${b})`;
    }
    const r = Math.round(155 + t * 70);
    const g = Math.round(65 - t * 35);
    const b = Math.round(60 - t * 25);
    return `rgb(${r},${g},${b})`;
  }
}

function textColor(pct: number | null, scale = 5): string {
  if (pct == null) return INK;
  return Math.abs(pct) > scale * 0.3 ? "#fff" : isDarkMode() ? "#ddd" : "#111";
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
  // Fill area under the line
  const fillPoints = `${pad},${pad + h} ${points.join(" ")} ${pad + w},${pad + h}`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polygon points={fillPoints} fill={stroke} opacity={0.1} />
      <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth={1.5} />
      {/* Current price dot */}
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
   Treemap layout — squarified algorithm
   ════════════════════════════════════════════════════════════ */

interface TreeRect {
  stock: HeatmapStock;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SectorGroup {
  sector: string;
  stocks: HeatmapStock[];
  totalCap: number;
}

function squarify(
  items: { weight: number; data: HeatmapStock }[],
  x: number,
  y: number,
  w: number,
  h: number,
): TreeRect[] {
  if (items.length === 0 || w <= 0 || h <= 0) return [];

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) return [];

  const rects: TreeRect[] = [];

  // Simple slice-and-dice: alternate horizontal/vertical splits
  let cx = x, cy = y, cw = w, ch = h;
  let remaining = [...items];
  let remainingWeight = totalWeight;

  while (remaining.length > 0) {
    if (remaining.length === 1) {
      rects.push({ stock: remaining[0].data, x: cx, y: cy, w: cw, h: ch });
      break;
    }

    const isHorizontal = cw >= ch;
    // Find a row that minimizes worst aspect ratio
    const row: typeof remaining = [];
    let rowWeight = 0;
    let bestWorst = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      row.push(remaining[i]);
      rowWeight += remaining[i].weight;

      const fraction = rowWeight / remainingWeight;
      const rowLen = isHorizontal ? cw * fraction : ch * fraction;
      const crossLen = isHorizontal ? ch : cw;

      // Compute worst aspect ratio in this row
      let worst = 0;
      for (const item of row) {
        const itemFrac = item.weight / rowWeight;
        const itemLen = crossLen * itemFrac;
        const ar = Math.max(rowLen / itemLen, itemLen / rowLen);
        worst = Math.max(worst, ar);
      }

      if (worst <= bestWorst) {
        bestWorst = worst;
      } else {
        // Back up: previous set was better
        row.pop();
        rowWeight -= remaining[i].weight;
        break;
      }
    }

    // Lay out the row
    const fraction = rowWeight / remainingWeight;
    if (isHorizontal) {
      const rowW = cw * fraction;
      let ry = cy;
      for (const item of row) {
        const itemH = ch * (item.weight / rowWeight);
        rects.push({ stock: item.data, x: cx, y: ry, w: rowW, h: itemH });
        ry += itemH;
      }
      cx += rowW;
      cw -= rowW;
    } else {
      const rowH = ch * fraction;
      let rx = cx;
      for (const item of row) {
        const itemW = cw * (item.weight / rowWeight);
        rects.push({ stock: item.data, x: rx, y: cy, w: itemW, h: rowH });
        rx += itemW;
      }
      cy += rowH;
      ch -= rowH;
    }

    remaining = remaining.slice(row.length);
    remainingWeight -= rowWeight;
  }

  return rects;
}

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
   Main Heatmap Page
   ════════════════════════════════════════════════════════════ */

type ViewMode = "sector" | "flat";
type DisplayMode = "treemap" | "sectors" | "table";
type SparkPeriod = "3m" | "6m" | "1y" | "2y" | "5y";
const SPARK_SLICES: Record<SparkPeriod, number> = { "3m": 63, "6m": 126, "1y": 252, "2y": 504, "5y": Infinity };
const SPARK_LABELS: Record<SparkPeriod, string> = { "3m": "3 months", "6m": "6 months", "1y": "1 year", "2y": "2 years", "5y": "5 years" };

export default function HeatmapPage() {
  return <Suspense><HeatmapInner /></Suspense>;
}

function HeatmapInner() {
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
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get("view") as ViewMode) || "sector"
  );
  const [searchTicker, setSearchTicker] = useState<string>(searchParams.get("q") || "");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    (searchParams.get("display") as DisplayMode) || "treemap"
  );
  const [hoveredStock, setHoveredStock] = useState<HeatmapStock | null>(null);
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
    if (viewMode !== "sector") params.set("view", viewMode);
    if (displayMode !== "treemap") params.set("display", displayMode);
    if (searchTicker) params.set("q", searchTicker);
    const qs = params.toString();
    router.replace(`/heatmap${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [period, sparkPeriod, sectorFilter, viewMode, displayMode, searchTicker, router]);

  /* Fetch data */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchHeatmap({ index: "twse", period })
      .then((res) => {
        if (!controller.signal.aborted) { setData(res); setLoading(false); }
      })
      .catch((err) => {
        if (!controller.signal.aborted) { setError(err.message); setLoading(false); }
      });
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

  /* Group by sector for treemap */
  const sectorGroups = useMemo((): SectorGroup[] => {
    const map = new Map<string, HeatmapStock[]>();
    for (const s of filtered) {
      const sector = s.sector || "Other";
      if (!map.has(sector)) map.set(sector, []);
      map.get(sector)!.push(s);
    }
    return Array.from(map.entries())
      .map(([sector, stocks]) => ({
        sector,
        stocks: stocks.sort((a, b) => b.marketCap - a.marketCap),
        totalCap: stocks.reduce((sum, s) => sum + s.marketCap, 0),
      }))
      .sort((a, b) => b.totalCap - a.totalCap);
  }, [filtered]);

  /* Layout treemap rects */
  const MAP_W = 1100;
  const MAP_H = 650;

  interface SectorRect {
    sector: string;
    rects: TreeRect[];
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  }

  const sectorRects = useMemo((): SectorRect[] => {
    if (viewMode === "flat" || sectorFilter) {
      // Flat view: all stocks in one treemap
      const items = filtered.map((s) => ({ weight: s.marketCap, data: s }));
      return [{ sector: "All", rects: squarify(items, 0, 0, MAP_W, MAP_H) }];
    }

    // Sector view: first layout sector boxes, then fill each with stocks
    const totalCap = sectorGroups.reduce((s, g) => s + g.totalCap, 0);
    if (totalCap === 0) return [];

    // Layout sector regions
    const sectorItems = sectorGroups.map((g) => ({ weight: g.totalCap, data: g }));
    const sectorBoxes = squarifyGroups(sectorItems, 0, 0, MAP_W, MAP_H);

    return sectorBoxes.map((box) => {
      const items = box.data.stocks.map((s) => ({ weight: s.marketCap, data: s }));
      const rects = squarify(items, box.x, box.y, box.w, box.h);
      return { sector: box.data.sector, rects, x: box.x, y: box.y, w: box.w, h: box.h };
    });
  }, [filtered, sectorGroups, viewMode, sectorFilter]);

  /* Per-sector treemap layouts (for "sectors" display mode) */
  const SECTOR_MAP_W = 1100;

  const perSectorLayouts = useMemo(() => {
    return sectorGroups.map((group) => {
      const stockCount = group.stocks.length;
      // Scale height based on stock count so smaller sectors aren't overly tall
      const h = stockCount <= 5 ? 200 : stockCount <= 15 ? 280 : stockCount <= 30 ? 360 : 440;
      const items = group.stocks.map((s) => ({ weight: s.marketCap, data: s }));
      const rects = squarify(items, 0, 0, SECTOR_MAP_W, h);
      return { sector: group.sector, totalCap: group.totalCap, stockCount, rects, w: SECTOR_MAP_W, h };
    });
  }, [sectorGroups]);

  /* Handle hover */
  const handleMouseMove = useCallback((e: React.MouseEvent, stock: HeatmapStock) => {
    setHoveredStock(stock);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredStock(null);
  }, []);

  /* Navigate */
  const handleSubmit = useCallback((t: string) => {
    router.push(`/stocks/${t.toUpperCase()}`);
  }, [router]);

  /* Nav bar */
  const navContent = (
    <>
      <div className="flex items-center gap-3">
        <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
          Home
        </Link>
        <Link href="/screener-v4" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
          Screener
        </Link>
        <Link href="/bubble" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
          Bubble Map
        </Link>
      </div>
      <TickerInput onSubmit={handleSubmit} />
    </>
  );

  return (
    <WSJLayout navContent={navContent}>
      <WSJSection title="Market Heatmap" />

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

        {/* View mode */}
        <div className="flex border" style={{ borderColor: GRY }}>
          {(["sector", "flat"] as ViewMode[]).map((vm) => (
            <button
              key={vm}
              onClick={() => setViewMode(vm)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
              style={{
                fontFamily: mono,
                background: viewMode === vm ? INK : "transparent",
                color: viewMode === vm ? WHT : TM,
              }}
            >
              {vm === "sector" ? "By Sector" : "Flat"}
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

        {/* Stats */}
        <span className="ml-auto text-[10px] tabular-nums" style={{ fontFamily: mono, color: TM }}>
          {filtered.length} stocks
        </span>

        {/* Display mode toggle */}
        <div className="flex border" style={{ borderColor: GRY }}>
          {(["treemap", "sectors", "table"] as DisplayMode[]).map((dm) => (
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
              {dm === "treemap" ? "Map" : dm === "sectors" ? "Sectors" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="border" style={{ borderColor: GRY }}>
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full" style={{ background: WHT }}>
            <defs>
              <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={GRY} stopOpacity="0.15" />
                <stop offset="50%" stopColor={GRY} stopOpacity="0.35" />
                <stop offset="100%" stopColor={GRY} stopOpacity="0.15" />
                <animate attributeName="x1" values="-1;2" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="x2" values="0;3" dur="1.5s" repeatCount="indefinite" />
              </linearGradient>
            </defs>
            {/* Fake treemap grid */}
            {[
              { x: 0, y: 0, w: 440, h: 340 }, { x: 442, y: 0, w: 360, h: 220 },
              { x: 804, y: 0, w: 296, h: 180 }, { x: 442, y: 222, w: 200, h: 118 },
              { x: 644, y: 222, w: 160, h: 118 }, { x: 804, y: 182, w: 296, h: 158 },
              { x: 0, y: 342, w: 300, h: 160 }, { x: 302, y: 342, w: 240, h: 160 },
              { x: 544, y: 342, w: 280, h: 160 }, { x: 826, y: 342, w: 274, h: 160 },
              { x: 0, y: 504, w: 380, h: 146 }, { x: 382, y: 504, w: 340, h: 146 },
              { x: 724, y: 504, w: 376, h: 146 },
            ].map((r, i) => (
              <rect key={i} x={r.x + 1} y={r.y + 1} width={r.w - 2} height={r.h - 2}
                fill="url(#shimmer)" rx={2} />
            ))}
          </svg>
        </div>
      )}
      {error && (
        <div className="py-10 text-center">
          <span className="text-[11px]" style={{ fontFamily: mono, color: RED }}>{error}</span>
        </div>
      )}

      {/* ── Heatmap Treemap ── */}
      {!loading && !error && filtered.length > 0 && displayMode === "treemap" && (
        <div className="relative border" style={{ borderColor: GRY }}>
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="w-full"
            style={{ background: WHT }}
            onMouseLeave={handleMouseLeave}
          >
            {sectorRects.map((group) =>
              group.rects.map((r) => {
                const pct = r.stock.changePercent;
                const showLabel = r.w > 35 && r.h > 25;
                const showPct = r.w > 28 && r.h > 18;
                const isLarge = r.w > 70 && r.h > 45;
                const isXL = r.w > 110 && r.h > 65;
                const isSearchMatch = searchTicker.length > 0 && r.stock.symbol.includes(searchTicker);
                const isDimmed = (hoveredStock && hoveredStock.symbol !== r.stock.symbol)
                  || (selectedStock && selectedStock.symbol !== r.stock.symbol)
                  || (searchTicker.length > 0 && !isSearchMatch);

                return (
                  <g
                    key={r.stock.symbol}
                    onMouseMove={(e) => !isMobile && handleMouseMove(e, r.stock)}
                    onClick={() => {
                      if (isMobile) {
                        setSelectedStock((prev) =>
                          prev?.symbol === r.stock.symbol ? null : r.stock
                        );
                      } else {
                        router.push(`/stocks/${r.stock.symbol}`);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x={r.x + 0.5}
                      y={r.y + 0.5}
                      width={Math.max(0, r.w - 1)}
                      height={Math.max(0, r.h - 1)}
                      fill={changeColor(pct, COLOR_SCALE[period])}
                      stroke={isSearchMatch ? INK : WHT}
                      strokeWidth={isSearchMatch ? 2.5 : 1}
                      rx={1}
                      opacity={isDimmed ? 0.35 : 1}
                    />
                    {showLabel && (
                      <text
                        x={r.x + r.w / 2}
                        y={r.y + r.h / 2 - (isXL ? 14 : isLarge ? 6 : 1)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={textColor(pct, COLOR_SCALE[period])}
                        fontSize={isLarge ? 13 : r.w > 50 ? 10 : 8}
                        fontWeight="bold"
                        fontFamily="var(--font-mono-data), monospace"
                        style={{ pointerEvents: "none" }}
                      >
                        {r.stock.symbol}
                      </text>
                    )}
                    {/* Company name for extra-large rects */}
                    {isXL && r.stock.shortName && (
                      <text
                        x={r.x + r.w / 2}
                        y={r.y + r.h / 2 - 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={textColor(pct, COLOR_SCALE[period])}
                        fontSize={9}
                        fontFamily="var(--font-sans-label), sans-serif"
                        style={{ pointerEvents: "none", opacity: 0.75 }}
                      >
                        {r.stock.shortName.length > 18
                          ? r.stock.shortName.slice(0, 17) + "…"
                          : r.stock.shortName}
                      </text>
                    )}
                    {showPct && pct != null && (
                      <text
                        x={r.x + r.w / 2}
                        y={r.y + r.h / 2 + (isXL ? 14 : isLarge ? 10 : 7)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={textColor(pct, COLOR_SCALE[period])}
                        fontSize={isLarge ? 11 : 7}
                        fontFamily="var(--font-mono-data), monospace"
                        style={{ pointerEvents: "none", opacity: 0.85 }}
                      >
                        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {/* Sector borders */}
            {viewMode === "sector" && !sectorFilter && sectorRects.map((group) => {
              const gw = group.w ?? 0;
              const gh = group.h ?? 0;
              const gx = group.x ?? 0;
              const gy = group.y ?? 0;
              if (gw < 1 || gh < 1) return null;
              return (
                <rect
                  key={`border-${group.sector}`}
                  x={gx}
                  y={gy}
                  width={gw}
                  height={gh}
                  fill="none"
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth={2}
                  style={{ pointerEvents: "none" }}
                />
              );
            })}

            {/* Sector labels (outline) */}
            {viewMode === "sector" && !sectorFilter && sectorRects.map((group) => {
              const gw = group.w ?? 0;
              const gh = group.h ?? 0;
              const gx = group.x ?? 0;
              const gy = group.y ?? 0;
              if (gw < 80 || gh < 30) return null;
              return (
                <g key={`label-${group.sector}`} style={{ pointerEvents: "none" }}>
                  <rect
                    x={gx + 2}
                    y={gy}
                    width={Math.min(group.sector.length * 7 + 12, gw - 4)}
                    height={16}
                    fill="rgba(0,0,0,0.55)"
                    rx={2}
                  />
                  <text
                    x={gx + 8}
                    y={gy + 11}
                    fill="#fff"
                    fontSize={9}
                    fontWeight="bold"
                    fontFamily="var(--font-sans-label), sans-serif"
                    letterSpacing="0.06em"
                  >
                    {group.sector}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip — desktop hover */}
          {!isMobile && hoveredStock && (
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
                {hoveredStock.symbol}
                <span className="font-normal ml-1.5" style={{ color: T2 }}>
                  {hoveredStock.shortName}
                </span>
              </div>
              {hoveredStock.sparkline && hoveredStock.sparkline.length > 1 && (() => {
                const n = SPARK_SLICES[sparkPeriod];
                const sliced = n === Infinity ? hoveredStock.sparkline : hoveredStock.sparkline.slice(-n);
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
                  ${hoveredStock.currentPrice?.toFixed(2) ?? "—"}
                </span>
                <span style={{ color: TM }}>Change</span>
                <span className="text-right font-bold" style={{
                  color: (hoveredStock.changePercent ?? 0) >= 0 ? GAIN : LOSS,
                }}>
                  {hoveredStock.changePercent != null
                    ? `${hoveredStock.changePercent >= 0 ? "+" : ""}${hoveredStock.changePercent.toFixed(2)}%`
                    : "—"}
                </span>
                <span style={{ color: TM }}>Mkt Cap</span>
                <span className="text-right" style={{ color: INK }}>
                  {fmtCap(hoveredStock.marketCap)}
                </span>
                <span style={{ color: TM }}>Sector</span>
                <span className="text-right" style={{ color: INK }}>
                  {hoveredStock.sector ?? "—"}
                </span>
                <span style={{ color: TM }}>Industry</span>
                <span className="text-right" style={{ color: INK }}>
                  {hoveredStock.industry ?? "—"}
                </span>
                <span style={{ color: TM }}>Rank</span>
                <span className="text-right" style={{ color: INK }}>
                  {sectorRankMap.get(hoveredStock.symbol) ?? "—"}
                </span>
              </div>
              {hoveredStock.debug && (
                <div className="mt-1.5 pt-1 border-t text-[8px]" style={{ borderColor: GRY, fontFamily: mono, color: TM }}>
                  <div className="font-bold mb-0.5" style={{ color: INK }}>Debug — {period.toUpperCase()}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                    <span>Latest</span>
                    <span className="text-right" style={{ color: INK }}>
                      ${hoveredStock.debug.latestClose?.toFixed(2) ?? "—"} ({hoveredStock.debug.latestDate ?? "—"})
                    </span>
                    <span>Ref</span>
                    <span className="text-right" style={{ color: INK }}>
                      ${hoveredStock.debug.refClose?.toFixed(2) ?? "—"} ({hoveredStock.debug.refDate ?? "—"})
                    </span>
                  </div>
                </div>
              )}
              <button
                className="mt-1.5 w-full text-center text-[9px] font-bold py-1 pointer-events-auto transition-colors"
                style={{
                  fontFamily: mono,
                  background: inWatchlist(hoveredStock.symbol) ? BG : INK,
                  color: inWatchlist(hoveredStock.symbol) ? INK : WHT,
                  border: `1px solid ${GRY}`,
                }}
                onClick={() => toggleWatchlist(hoveredStock.symbol)}
              >
                {inWatchlist(hoveredStock.symbol) ? "★ In Watchlist" : "☆ Add to Watchlist"}
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
                <span style={{ color: TM }}>Sector</span>
                <span className="text-right" style={{ color: INK }}>
                  {selectedStock.sector ?? "—"}
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

      {/* ── Sector-by-Sector Treemaps ── */}
      {!loading && !error && filtered.length > 0 && displayMode === "sectors" && (
        <div className="space-y-5">
          {perSectorLayouts.map((layout) => (
            <div key={layout.sector}>
              {/* Sector header */}
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
              {/* Sector treemap */}
              <div className="relative border" style={{ borderColor: GRY }}>
                <svg
                  viewBox={`0 0 ${layout.w} ${layout.h}`}
                  className="w-full"
                  style={{ background: WHT }}
                  onMouseLeave={handleMouseLeave}
                >
                  {layout.rects.map((r) => {
                    const pct = r.stock.changePercent;
                    const showLabel = r.w > 30 && r.h > 20;
                    const showPct = r.w > 24 && r.h > 16;
                    const isLarge = r.w > 70 && r.h > 45;
                    const isXL = r.w > 110 && r.h > 65;
                    const isSearchMatch = searchTicker.length > 0 && r.stock.symbol.includes(searchTicker);
                    const isDimmed = (hoveredStock && hoveredStock.symbol !== r.stock.symbol)
                      || (selectedStock && selectedStock.symbol !== r.stock.symbol)
                      || (searchTicker.length > 0 && !isSearchMatch);

                    return (
                      <g
                        key={r.stock.symbol}
                        onMouseMove={(e) => !isMobile && handleMouseMove(e, r.stock)}
                        onClick={() => {
                          if (isMobile) {
                            setSelectedStock((prev) =>
                              prev?.symbol === r.stock.symbol ? null : r.stock
                            );
                          } else {
                            router.push(`/stocks/${r.stock.symbol}`);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <rect
                          x={r.x + 0.5}
                          y={r.y + 0.5}
                          width={Math.max(0, r.w - 1)}
                          height={Math.max(0, r.h - 1)}
                          fill={changeColor(pct, COLOR_SCALE[period])}
                          stroke={isSearchMatch ? INK : WHT}
                          strokeWidth={isSearchMatch ? 2.5 : 1}
                          rx={1}
                          opacity={isDimmed ? 0.35 : 1}
                        />
                        {showLabel && (
                          <text
                            x={r.x + r.w / 2}
                            y={r.y + r.h / 2 - (isXL ? 14 : isLarge ? 6 : 1)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor(pct, COLOR_SCALE[period])}
                            fontSize={isLarge ? 13 : r.w > 50 ? 10 : 8}
                            fontWeight="bold"
                            fontFamily="var(--font-mono-data), monospace"
                            style={{ pointerEvents: "none" }}
                          >
                            {r.stock.symbol}
                          </text>
                        )}
                        {isXL && r.stock.shortName && (
                          <text
                            x={r.x + r.w / 2}
                            y={r.y + r.h / 2 - 1}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor(pct, COLOR_SCALE[period])}
                            fontSize={9}
                            fontFamily="var(--font-sans-label), sans-serif"
                            style={{ pointerEvents: "none", opacity: 0.75 }}
                          >
                            {r.stock.shortName.length > 18
                              ? r.stock.shortName.slice(0, 17) + "…"
                              : r.stock.shortName}
                          </text>
                        )}
                        {showPct && pct != null && (
                          <text
                            x={r.x + r.w / 2}
                            y={r.y + r.h / 2 + (isXL ? 14 : isLarge ? 10 : 7)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor(pct, COLOR_SCALE[period])}
                            fontSize={isLarge ? 11 : 7}
                            fontFamily="var(--font-mono-data), monospace"
                            style={{ pointerEvents: "none", opacity: 0.85 }}
                          >
                            {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Desktop tooltip reuse */}
                {!isMobile && hoveredStock && layout.rects.some((r) => r.stock.symbol === hoveredStock.symbol) && (
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
                      {hoveredStock.symbol}
                      <span className="font-normal ml-1.5" style={{ color: T2 }}>
                        {hoveredStock.shortName}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]" style={{ fontFamily: mono }}>
                      <span style={{ color: TM }}>Price</span>
                      <span className="text-right" style={{ color: INK }}>
                        ${hoveredStock.currentPrice?.toFixed(2) ?? "—"}
                      </span>
                      <span style={{ color: TM }}>Change</span>
                      <span className="text-right font-bold" style={{
                        color: (hoveredStock.changePercent ?? 0) >= 0 ? GAIN : LOSS,
                      }}>
                        {hoveredStock.changePercent != null
                          ? `${hoveredStock.changePercent >= 0 ? "+" : ""}${hoveredStock.changePercent.toFixed(2)}%`
                          : "—"}
                      </span>
                      <span style={{ color: TM }}>Mkt Cap</span>
                      <span className="text-right" style={{ color: INK }}>
                        {fmtCap(hoveredStock.marketCap)}
                      </span>
                      <span style={{ color: TM }}>Rank</span>
                      <span className="text-right" style={{ color: INK }}>
                        {sectorRankMap.get(hoveredStock.symbol) ?? "—"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Mobile tap detail card */}
                {isMobile && selectedStock && layout.rects.some((r) => r.stock.symbol === selectedStock.symbol) && (
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
                <th className="px-2 py-1.5 text-right">Price</th>
                <th className="px-2 py-1.5 text-right">Chg%</th>
                <th className="px-2 py-1.5 text-right">Mkt Cap</th>
              </tr>
            </thead>
            <tbody>
              {[...filtered]
                .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
                .map((s) => (
                  <tr
                    key={s.symbol}
                    onClick={() => router.push(`/stocks/${s.symbol}`)}
                    className="border-b cursor-pointer"
                    style={{ borderColor: GRY }}
                  >
                    <td className="px-2 py-1" style={{ color: INK }}>
                      <span className="font-bold">{s.symbol}</span>
                      <span className="ml-1" style={{ color: TM, fontSize: 8 }}>{s.sector}</span>
                    </td>
                    <td className="px-2 py-1 text-right" style={{ color: INK }}>
                      ${s.currentPrice?.toFixed(2) ?? "—"}
                    </td>
                    <td className="px-2 py-1 text-right font-bold" style={{
                      color: (s.changePercent ?? 0) >= 0 ? GAIN : LOSS,
                    }}>
                      {s.changePercent != null
                        ? `${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="px-2 py-1 text-right" style={{ color: T2 }}>
                      {fmtCap(s.marketCap)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Legend ── */}
      {!loading && !error && (() => {
        const s = COLOR_SCALE[period];
        const ticks = s <= 5 ? [-5, -3, -1, 0, 1, 3, 5]
          : s <= 10 ? [-10, -5, -2, 0, 2, 5, 10]
          : s <= 15 ? [-15, -10, -5, 0, 5, 10, 15]
          : [-25, -15, -5, 0, 5, 15, 25];
        return (
        <div className="flex items-center justify-center gap-1 mt-3">
          {ticks.map((v) => (
            <div key={v} className="flex flex-col items-center">
              <div className="w-6 h-3" style={{ background: changeColor(v, s) }} />
              <span className="text-[7px] mt-0.5 tabular-nums" style={{ fontFamily: mono, color: TM }}>
                {v >= 0 ? "+" : ""}{v}%
              </span>
            </div>
          ))}
        </div>
        );
      })()}

      <Hair />
      <p className="text-[9px] italic" style={{ fontFamily: serif, color: TM }}>
        Rectangle size represents market capitalization. Color intensity reflects
        {period === "1d" ? " daily" : period === "1w" ? " weekly" : period === "1m" ? " monthly" : " year-to-date"} percentage change.
        Click any stock to view its detailed analysis.
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

/* Squarify for sector groups (same algorithm, different data type) */
function squarifyGroups(
  items: { weight: number; data: SectorGroup }[],
  x: number, y: number, w: number, h: number,
): { data: SectorGroup; x: number; y: number; w: number; h: number }[] {
  if (items.length === 0 || w <= 0 || h <= 0) return [];

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) return [];

  const rects: { data: SectorGroup; x: number; y: number; w: number; h: number }[] = [];
  let cx = x, cy = y, cw = w, ch = h;
  let remaining = [...items];
  let remainingWeight = totalWeight;

  while (remaining.length > 0) {
    if (remaining.length === 1) {
      rects.push({ data: remaining[0].data, x: cx, y: cy, w: cw, h: ch });
      break;
    }

    const isHorizontal = cw >= ch;
    const row: typeof remaining = [];
    let rowWeight = 0;
    let bestWorst = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      row.push(remaining[i]);
      rowWeight += remaining[i].weight;

      const fraction = rowWeight / remainingWeight;
      const rowLen = isHorizontal ? cw * fraction : ch * fraction;
      const crossLen = isHorizontal ? ch : cw;

      let worst = 0;
      for (const item of row) {
        const itemFrac = item.weight / rowWeight;
        const itemLen = crossLen * itemFrac;
        const ar = Math.max(rowLen / itemLen, itemLen / rowLen);
        worst = Math.max(worst, ar);
      }

      if (worst <= bestWorst) {
        bestWorst = worst;
      } else {
        row.pop();
        rowWeight -= remaining[i].weight;
        break;
      }
    }

    const fraction = rowWeight / remainingWeight;
    if (isHorizontal) {
      const rowW = cw * fraction;
      let ry = cy;
      for (const item of row) {
        const itemH = ch * (item.weight / rowWeight);
        rects.push({ data: item.data, x: cx, y: ry, w: rowW, h: itemH });
        ry += itemH;
      }
      cx += rowW;
      cw -= rowW;
    } else {
      const rowH = ch * fraction;
      let rx = cx;
      for (const item of row) {
        const itemW = cw * (item.weight / rowWeight);
        rects.push({ data: item.data, x: rx, y: cy, w: itemW, h: rowH });
        rx += itemW;
      }
      cy += rowH;
      ch -= rowH;
    }

    remaining = remaining.slice(row.length);
    remainingWeight -= rowWeight;
  }

  return rects;
}
