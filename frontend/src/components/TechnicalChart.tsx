"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";
import type { IChartApi, ISeriesPrimitive, SeriesAttachedParameter, IPrimitivePaneView, IPrimitivePaneRenderer, Time, SeriesMarker, Coordinate } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import { fetchPrices, fetchFundamentals, type PriceBar, type Ratios, type TATrendline, type TAChannel, type TARange, type TABreakout, type TAChartPattern, type TASwingPoint, type TAVolumeProfile, type TASetup } from "@/lib/api";
import {
  computeBollingerBands,
  computeEMA,
  computeRSI,
  computeMACD,
  computeStochastic,
  computeParabolicSAR,
  detectSupportResistance,
  detectSwingPoints,
  computeFibonacciLevels,
  computeATR,
  computeSMA,
  computeVWAP,
  computeIchimoku,
  computeOBV,
  computeADX,
  computeWilliamsR,
  computeCCI,
  detectMarketStructure,
  detectFVGs,
  detectOrderBlocks,
} from "@/lib/indicators";
import {
  detectCandlePatterns,
  detectTradingSetups,
} from "@/lib/setups";
import { useDrawings, type Drawing, type DrawingType } from "@/lib/useDrawings";
import { TECH_RELATIVE_STRENGTH_BENCHMARK } from "@/lib/benchmarks";


/* ?????????????????? WSJ colour tokens (theme-aware) ?????????????????? */
/* Static accent colours that work in both light and dark */
const ACCENT = {
  bbBand: "#6e7b8b", bbMid: "#8a8a8a",
  ema8: "#c9a96e", ema21: "#b07050",
  fib: "#7b1fa2",
  vwap: "#4d9de0",
  ichTenkan: "#5dade2", ichKijun: "#e74c3c",
  ichSpanA: "rgba(76,175,80,0.18)", ichSpanB: "rgba(239,83,80,0.18)",
  ichChikou: "#9c27b0",
  sma50: "rgba(180,120,60,0.5)", sma100: "rgba(130,80,160,0.5)", sma200: "rgba(60,140,150,0.5)",
  ema50: "rgba(180,120,60,0.5)", ema100: "rgba(130,80,160,0.5)", ema200: "rgba(60,140,150,0.5)",
  wrLine: "#7b1fa2",
  obvLine: "#4d9de0",
};

function getThemeColors() {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return {
    bg:       dark ? "#1a1a1a" : "#f5f0e8",
    ink:      dark ? "#e0ddd5" : "#1a1a1a",
    grid:     dark ? "#2a2a2a" : "#d8d0c4",
    border:   dark ? "#333333" : "#c8c8c8",
    muted:    dark ? "#777777" : "#888888",
    candleUp: dark ? "#c9a96e" : "#c9a96e",
    candleDown: dark ? "#d49070" : "#b07050",
    volUp:    dark ? "rgba(201,169,110,0.25)" : "rgba(201,169,110,0.30)",
    volDown:  dark ? "rgba(212,144,112,0.25)" : "rgba(176,112,80,0.30)",
    bull:     dark ? "#4caf50" : "#2e7d32",
    bear:     dark ? "#ef5350" : "#c62828",
    ...ACCENT,
    sarUp:    dark ? "#4caf50" : "#2e7d32",
    sarDown:  dark ? "#ef5350" : "#c62828",
    support:  dark ? "#4caf50" : "#2e7d32",
    resistance: dark ? "#ef5350" : "#c62828",
    rsiLine:  dark ? "#e0ddd5" : "#1a1a1a",
    rsiOB:    dark ? "#ef5350" : "#c62828",
    rsiOS:    dark ? "#4caf50" : "#2e7d32",
    macdLine: dark ? "#e0ddd5" : "#1a1a1a",
    macdSig:  dark ? "#ef5350" : "#c62828",
    macdHistUp: dark ? "rgba(76,175,80,0.5)" : "rgba(46,125,50,0.5)",
    macdHistDn: dark ? "rgba(239,83,80,0.5)" : "rgba(198,40,40,0.5)",
    stochK:   dark ? "#e0ddd5" : "#1a1a1a",
    stochD:   dark ? "#ef5350" : "#c62828",
    adxLine:  dark ? "#e0ddd5" : "#1a1a1a",
    diPlus:   dark ? "#4caf50" : "#2e7d32",
    diMinus:  dark ? "#ef5350" : "#c62828",
    cciLine:  dark ? "#e0ddd5" : "#1a1a1a",
  };
}

/* C is used by JSX (outside useEffect) ??use CSS vars for theme reactivity */
const C = {
  bg: "var(--wsj-white, #f5f0e8)",
  ink: "var(--wsj-ink, #1a1a1a)",
  grid: "var(--wsj-grey-light, #d8d0c4)",
  border: "var(--wsj-grey, #c8c8c8)",
  muted: "var(--wsj-muted, #888888)",
  bull: "var(--wsj-gain, #2e7d32)",
  bear: "var(--wsj-loss, #c62828)",
  candleUp: "#c9a96e", candleDown: "var(--wsj-red, #b07050)",
  volUp: "rgba(201,169,110,0.30)", volDown: "rgba(176,112,80,0.30)",
  ...ACCENT,
  sarUp: "var(--wsj-gain, #2e7d32)", sarDown: "var(--wsj-loss, #c62828)",
  support: "var(--wsj-gain, #2e7d32)", resistance: "var(--wsj-loss, #c62828)",
  rsiLine: "var(--wsj-ink, #1a1a1a)", rsiOB: "var(--wsj-loss, #c62828)", rsiOS: "var(--wsj-gain, #2e7d32)",
  macdLine: "var(--wsj-ink, #1a1a1a)", macdSig: "var(--wsj-loss, #c62828)",
  macdHistUp: "rgba(46,125,50,0.5)", macdHistDn: "rgba(198,40,40,0.5)",
  stochK: "var(--wsj-ink, #1a1a1a)", stochD: "var(--wsj-loss, #c62828)",
  obvLine: "#4d9de0",
  adxLine: "var(--wsj-ink, #1a1a1a)", diPlus: "var(--wsj-gain, #2e7d32)", diMinus: "var(--wsj-loss, #c62828)",
  wrLine: "#7b1fa2",
  cciLine: "var(--wsj-ink, #1a1a1a)",
};

/* ?????????????????? Toggle state ?????????????????? */
interface Toggles {
  heikinAshi: boolean;
  logScale: boolean;
  bb: boolean;
  ema: boolean;
  waves: boolean;
  sar: boolean;
  sr: boolean;
  fib: boolean;
  vwap: boolean;
  ichimoku: boolean;
  rsi: boolean;
  macd: boolean;
  stoch: boolean;
  obv: boolean;
  adx: boolean;
  williamsR: boolean;
  cci: boolean;
  setups: boolean;
  trendlines: boolean;
  ranges: boolean;
  sma: boolean;
  longEma: boolean;
  volProfile: boolean;
  structure: boolean;
  fvg: boolean;
  orderBlocks: boolean;
  relStrength: boolean;
  fundamentals: boolean;
}

const DEFAULTS: Toggles = {
  heikinAshi: false,
  logScale: false,
  bb: false,
  ema: false,
  waves: false,
  sar: false,
  sr: false,
  fib: false,
  vwap: false,
  ichimoku: false,
  sma: false,
  longEma: true,
  rsi: true,
  macd: false,
  stoch: false,
  obv: false,
  adx: false,
  williamsR: false,
  cci: false,
  setups: false,
  trendlines: false,
  ranges: false,
  volProfile: false,
  structure: false,
  fvg: false,
  orderBlocks: false,
  relStrength: false,
  fundamentals: false,
};

const RS_BENCHMARK_TICKER = TECH_RELATIVE_STRENGTH_BENCHMARK.value;
const RS_LABEL = `RS vs ${RS_BENCHMARK_TICKER}`;

const TOGGLE_META: { key: keyof Toggles; label: string; mobileLabel?: string; group: string; shortcut?: string }[] = [
  { key: "heikinAshi", label: "Heikin Ashi", mobileLabel: "HA", group: "Chart", shortcut: "h" },
  { key: "logScale", label: "Log Scale", mobileLabel: "Log", group: "Chart", shortcut: "l" },
  { key: "bb", label: "Bollinger", mobileLabel: "BB", group: "Overlays", shortcut: "b" },
  { key: "ema", label: "EMA 8/21", mobileLabel: "EMA", group: "Overlays", shortcut: "e" },
  { key: "waves", label: "Waves", mobileLabel: "Wav", group: "Overlays", shortcut: "w" },
  { key: "sar", label: "SAR", group: "Overlays" },
  { key: "sr", label: "S / R", mobileLabel: "S/R", group: "Overlays" },
  { key: "fib", label: "Fibonacci", mobileLabel: "Fib", group: "Overlays", shortcut: "f" },
  { key: "vwap", label: "VWAP", group: "Overlays", shortcut: "v" },
  { key: "ichimoku", label: "Ichimoku", mobileLabel: "Ichi", group: "Overlays", shortcut: "i" },
  { key: "sma", label: "SMA 50/100/200", mobileLabel: "SMA", group: "Overlays" },
  { key: "longEma", label: "EMA 50/100/200", mobileLabel: "EMA+", group: "Overlays" },
  { key: "trendlines", label: "Trendlines", mobileLabel: "TL", group: "Structure" },
  { key: "ranges", label: "Ranges", mobileLabel: "Rng", group: "Structure" },
  { key: "volProfile", label: "Vol Profile", mobileLabel: "VP", group: "Structure" },
  { key: "structure", label: "HH/HL/LH/LL", mobileLabel: "HiLo", group: "Structure" },
  { key: "fvg", label: "FVG", group: "Structure" },
  { key: "orderBlocks", label: "OB", group: "Structure" },
  { key: "rsi", label: "RSI", group: "Studies", shortcut: "r" },
  { key: "macd", label: "MACD", group: "Studies", shortcut: "m" },
  { key: "stoch", label: "Stochastic", mobileLabel: "Stch", group: "Studies" },
  { key: "obv", label: "OBV", group: "Studies", shortcut: "o" },
  { key: "adx", label: "ADX/DMI", mobileLabel: "ADX", group: "Studies" },
  { key: "williamsR", label: "Williams %R", mobileLabel: "%R", group: "Studies" },
  { key: "cci", label: "CCI", group: "Studies" },
  { key: "relStrength", label: RS_LABEL, mobileLabel: "RS", group: "Studies" },
  { key: "fundamentals", label: "Fundamentals", mobileLabel: "Fund", group: "Data" },
  { key: "setups", label: "Signals", mobileLabel: "Sig", group: "Signals" },
];

/* ?????????????????? Strategy Presets ?????????????????? */
interface StrategyPreset {
  name: string;
  desc: string;
  toggles: Partial<Toggles>;
}

const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    name: "Swing",
    desc: "BB + RSI + MACD + S/R + Signals",
    toggles: { bb: true, ema: true, sr: true, fib: true, rsi: true, macd: true, setups: true, sar: false, waves: false, ichimoku: false, sma: false, longEma: false, stoch: false, obv: false, adx: false, williamsR: false, cci: false, vwap: false, volProfile: false },
  },
  {
    name: "Trend",
    desc: "EMA + Waves + ADX + Ichimoku + SAR",
    toggles: { ema: true, waves: true, sar: true, ichimoku: true, adx: true, sma: false, longEma: false, sr: false, fib: false, bb: false, rsi: false, macd: false, stoch: false, obv: false, williamsR: false, cci: false, vwap: false, volProfile: false, setups: true },
  },
  {
    name: "Mean Rev",
    desc: "BB + RSI + Stoch + Williams %R + CCI",
    toggles: { bb: true, rsi: true, stoch: true, williamsR: true, cci: true, sr: true, ema: false, waves: false, sar: false, ichimoku: false, sma: false, longEma: false, macd: false, obv: false, adx: false, vwap: false, fib: false, volProfile: false, setups: true },
  },
  {
    name: "Volume",
    desc: "VWAP + OBV + Vol Profile + S/R",
    toggles: { vwap: true, obv: true, volProfile: true, sr: true, ema: false, waves: false, bb: false, sar: false, ichimoku: false, sma: false, longEma: false, rsi: false, macd: false, stoch: false, adx: false, williamsR: false, cci: false, fib: false, setups: true },
  },
  {
    name: "Full",
    desc: "All indicators enabled",
    toggles: { bb: true, ema: true, waves: true, sar: true, sr: true, fib: true, vwap: true, ichimoku: true, sma: true, longEma: true, rsi: true, macd: true, stoch: true, obv: true, adx: true, williamsR: true, cci: true, setups: true, trendlines: true, ranges: true, volProfile: true, structure: true, fvg: true, orderBlocks: true, relStrength: true, fundamentals: true },
  },
  {
    name: "Clean",
    desc: "Price action only",
    toggles: { bb: false, ema: false, waves: false, sar: false, sr: false, fib: false, vwap: false, ichimoku: false, sma: false, longEma: false, rsi: false, macd: false, stoch: false, obv: false, adx: false, williamsR: false, cci: false, setups: false, trendlines: false, ranges: false, volProfile: false, structure: false, fvg: false, orderBlocks: false, relStrength: false, fundamentals: false },
  },
];

/* ?????????????????? Volume Profile Primitive (draws natively on chart canvas) ?????????????????? */
interface VPBin { price: number; volume: number; pct: number }
interface VPData { bins: VPBin[]; poc: number; vaH: number; vaL: number }

class VolumeProfileRenderer implements IPrimitivePaneRenderer {
  constructor(private _bars: { y: number; w: number; isPoc: boolean; inVA: boolean }[],
              private _labels: { y: number; text: string; color: string }[],
              private _chartWidth: number) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const leftEdge = 0;
      const maxBarW = mediaSize.width * 0.20;

      for (const bar of this._bars) {
        const barW = Math.max(2, (bar.w / 100) * maxBarW * 22);
        ctx.fillStyle = bar.isPoc ? "rgba(59,130,246,0.55)"
          : bar.inVA ? "rgba(201,169,110,0.40)" : "rgba(160,160,160,0.18)";
        ctx.fillRect(leftEdge, bar.y - (bar.isPoc ? 2.5 : 1.5), barW, bar.isPoc ? 5 : 3);
      }

      ctx.textAlign = "left";
      for (const lbl of this._labels) {
        ctx.font = lbl.text.startsWith("POC") ? "bold 9px monospace" : "8px monospace";
        ctx.fillStyle = lbl.color;
        ctx.fillText(lbl.text, leftEdge + 2, lbl.y - 3);
      }
    });
  }
}

class VolumeProfilePaneView implements IPrimitivePaneView {
  _bars: { y: number; w: number; isPoc: boolean; inVA: boolean }[] = [];
  _labels: { y: number; text: string; color: string }[] = [];
  _chartWidth = 0;

  zOrder(): "bottom" { return "bottom"; }
  renderer(): IPrimitivePaneRenderer | null {
    if (!this._bars.length) return null;
    return new VolumeProfileRenderer(this._bars, this._labels, this._chartWidth);
  }
}

class VolumeProfilePrimitive implements ISeriesPrimitive<Time> {
  private _data: VPData | null = null;
  private _view = new VolumeProfilePaneView();
  private _series: SeriesAttachedParameter<Time>["series"] | null = null;
  private _chart: IChartApiBase | null = null;
  _requestUpdate: (() => void) | null = null;

  attached(param: SeriesAttachedParameter<Time>): void {
    this._series = param.series;
    this._chart = param.chart as unknown as IChartApiBase;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this._series = null;
    this._chart = null;
    this._requestUpdate = null;
  }

  setData(d: VPData | null): void {
    this._data = d;
    this._requestUpdate?.();
  }

  updateAllViews(): void {
    this._view._bars = [];
    this._view._labels = [];
    if (!this._data || !this._series) return;

    const { bins, poc, vaH, vaL } = this._data;
    const binStep = bins.length > 1 ? bins[1].price - bins[0].price : 1;

    for (const bin of bins) {
      const y = this._series.priceToCoordinate(bin.price);
      if (y === null) continue;
      this._view._bars.push({
        y: y as number,
        w: bin.pct,
        isPoc: Math.abs(bin.price - poc) < binStep * 0.6,
        inVA: bin.price >= vaL && bin.price <= vaH,
      });
    }

    const pocY = this._series.priceToCoordinate(poc);
    if (pocY !== null) {
      this._view._labels.push({ y: pocY as number, text: `POC $${poc.toFixed(0)}`, color: "rgba(59,130,246,0.9)" });
    }
    const vahY = this._series.priceToCoordinate(vaH);
    if (vahY !== null) {
      this._view._labels.push({ y: vahY as number, text: `VAH $${vaH.toFixed(0)}`, color: "rgba(160,128,48,0.7)" });
    }
    const valY = this._series.priceToCoordinate(vaL);
    if (valY !== null) {
      this._view._labels.push({ y: valY as number, text: `VAL $${vaL.toFixed(0)}`, color: "rgba(160,128,48,0.7)" });
    }
  }

  paneViews(): readonly IPrimitivePaneView[] { return [this._view]; }
}

type IChartApiBase = IChartApi;

/* ?????????????????? Component ?????????????????? */
interface Props {
  data: PriceBar[];
  ticker: string;
  period?: string;
  taTrendlines?: { support: TATrendline[]; resistance: TATrendline[]; channels?: TAChannel[] };
  taRanges?: TARange[];
  taBreakouts?: TABreakout[];
  taPatterns?: TAChartPattern[];
  taSwings?: TASwingPoint[];
  taVolumeProfile?: TAVolumeProfile;
  taActiveSetups?: TASetup[];
  fullscreen?: boolean;
  compact?: boolean;
}

export default function TechnicalChart({ data, ticker, period = "2y", taTrendlines, taRanges, taBreakouts, taPatterns, taSwings, taVolumeProfile, taActiveSetups, fullscreen, compact }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);
  const stochRef = useRef<HTMLDivElement>(null);
  const obvRef = useRef<HTMLDivElement>(null);
  const adxRef = useRef<HTMLDivElement>(null);
  const wrRef = useRef<HTMLDivElement>(null);
  const cciRef = useRef<HTMLDivElement>(null);
  const rsRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Track dark mode so charts re-create on theme toggle
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => {
      setIsDark(el.classList.contains("dark"));
    });
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const mobileTiny = isMobile && compact;
  const btnCls = mobileTiny
    ? "px-[3px] py-0 text-[7px] leading-[16px]"
    : isMobile
      ? "px-1.5 py-1 text-[10px]"
      : compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";

  const [toolbarOpen, setToolbarOpen] = useState(false);

  const [toggles, setToggles] = useState<Toggles>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      // Check URL params first (for shared links)
      const params = new URLSearchParams(window.location.search);
      const onParam = params.get("on");
      if (onParam) {
        const keys = onParam.split(",");
        const t = { ...DEFAULTS };
        // Turn all off first, then enable specified
        for (const k of Object.keys(t) as (keyof Toggles)[]) (t as Record<string, boolean>)[k] = false;
        for (const k of keys) if (k in t) (t as Record<string, boolean>)[k] = true;
        return t;
      }
      const stored = localStorage.getItem("zs_ta_toggles");
      if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULTS;
  });

  const [crosshairData, setCrosshairData] = useState<{
    time: string; open: number; high: number; low: number; close: number; volume: number;
  } | null>(null);
  const [crosshairIndicators, setCrosshairIndicators] = useState<{
    rsi?: number; macd?: number; signal?: number;
    stochK?: number; stochD?: number; adx?: number; wr?: number; cci?: number;
  } | null>(null);
  const [vwapAnchor, setVwapAnchor] = useState<string | null>(null);
  const [vwapAnchorMode, setVwapAnchorMode] = useState(false);
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [benchmarkData, setBenchmarkData] = useState<PriceBar[]>([]);
  const [drawMode, setDrawMode] = useState<DrawingType | null>(null);
  const [drawStart, setDrawStart] = useState<{ time: string; price: number } | null>(null);
  const { drawings, add: addDrawing, remove: removeDrawing, clear: clearDrawings } = useDrawings(ticker);
  const drawingsRef = useRef(drawings);
  drawingsRef.current = drawings;
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;
  const drawStartRef = useRef(drawStart);
  drawStartRef.current = drawStart;
  const addDrawingRef = useRef(addDrawing);
  addDrawingRef.current = addDrawing;
  const [fundamentalsData, setFundamentalsData] = useState<Ratios | null>(null);

  // Fetch fundamentals when toggle is on
  useEffect(() => {
    setFundamentalsData(null);
    if (!toggles.fundamentals) return;
    const controller = new AbortController();
    fetchFundamentals(ticker)
      .then((res) => { if (!controller.signal.aborted) setFundamentalsData(res.ratios); })
      .catch(() => {});
    return () => controller.abort();
  }, [toggles.fundamentals, ticker]);

  // Fetch benchmark data when relative strength toggle is on
  useEffect(() => {
    setBenchmarkData([]);
    if (!toggles.relStrength || ticker === RS_BENCHMARK_TICKER) return;
    const controller = new AbortController();
    fetchPrices(RS_BENCHMARK_TICKER, period, controller.signal)
      .then((res) => { if (!controller.signal.aborted) setBenchmarkData(res.data); })
      .catch(() => {});
    return () => controller.abort();
  }, [toggles.relStrength, ticker, period]);

  const flip = useCallback(
    (k: keyof Toggles) => setToggles((p) => ({ ...p, [k]: !p[k] })),
    [],
  );

  const applyPreset = useCallback(
    (preset: StrategyPreset) => setToggles((p) => ({ ...p, ...preset.toggles })),
    [],
  );

  // Persist toggles to localStorage
  useEffect(() => {
    try { localStorage.setItem("zs_ta_toggles", JSON.stringify(toggles)); } catch {}
  }, [toggles]);

  const exportChart = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    const canvases = container.querySelectorAll("canvas");
    if (canvases.length === 0) return;

    // Collect all visible canvases and their positions
    const containerRect = container.getBoundingClientRect();
    const totalWidth = containerRect.width;
    const totalHeight = containerRect.height;

    const exportCanvas = document.createElement("canvas");
    const scale = 2; // retina quality
    exportCanvas.width = totalWidth * scale;
    exportCanvas.height = totalHeight * scale;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = getThemeColors().bg;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    canvases.forEach((canvas) => {
      const canvasRect = canvas.getBoundingClientRect();
      const x = canvasRect.left - containerRect.left;
      const y = canvasRect.top - containerRect.top;
      ctx.drawImage(canvas, x, y, canvasRect.width, canvasRect.height);
    });

    // Add ticker watermark
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillText(`${ticker} ??zero-sum.app`, 10, totalHeight - 10);

    const link = document.createElement("a");
    link.download = `${ticker}_chart_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  }, [ticker]);

  /* ???? Keyboard shortcuts ???? */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Escape: cancel draw mode first, then replay mode
      if (e.key === "Escape") {
        e.preventDefault();
        if (drawMode) { setDrawMode(null); setDrawStart(null); return; }
        if (replayMode) { setReplayMode(false); setReplayIndex(0); return; }
        return;
      }
      // Replay mode: left/right to step
      if (replayMode) {
        if (e.key === "ArrowLeft") { e.preventDefault(); setReplayIndex(i => Math.max(Math.min(50, data.length), i - 1)); return; }
        if (e.key === "ArrowRight") { e.preventDefault(); setReplayIndex(i => Math.min(data.length, i + 1)); return; }
      }
      const match = TOGGLE_META.find((t) => t.shortcut === e.key.toLowerCase());
      if (match) { e.preventDefault(); flip(match.key); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flip, replayMode, drawMode, data.length]);

  /* ???????????????????????????????????Chart Effect ???????????????????????????????????*/
  const effectiveData = replayMode && replayIndex > 0 && replayIndex < data.length
    ? data.slice(0, replayIndex) : data;

  useEffect(() => {
    if (!mainRef.current || effectiveData.length === 0) return;

    /* Resolve theme colors for canvas (lightweight-charts needs hex, not var()) */
    const tc = getThemeColors();

    // In replay mode, effectiveData is the sliced data; alias it as `data` for all chart rendering
    const data = effectiveData;

    const charts: { api: IChartApi; el: HTMLElement }[] = [];
    const cleanupFns: (() => void)[] = [];

    // Detect intraday data (times contain "T" separator)
    const isIntraday = data.length > 0 && data[0].time.includes("T");

    const opts = (h: number, el: HTMLElement) => ({
      width: el.clientWidth,
      height: h,
      layout: { background: { color: tc.bg }, textColor: tc.muted, fontSize: 11 },
      grid: { vertLines: { color: tc.grid }, horzLines: { color: tc.grid } },
      crosshair: { mode: 0 as const },
      timeScale: { borderColor: tc.border, timeVisible: isIntraday },
      rightPriceScale: { borderColor: tc.border, minimumWidth: 75, mode: toggles.logScale ? 1 as const : 0 as const },
    });

    /* ???? Main chart ?????????????????????????????????????????????????????????????????????? */
    const mEl = mainRef.current;
    mEl.innerHTML = "";
    // In fullscreen, compute available height using element's actual position
    const subChartCount = [toggles.rsi, toggles.macd, toggles.stoch, toggles.obv, toggles.adx, toggles.williamsR, toggles.cci, toggles.relStrength].filter(Boolean).length;
    const mainHeight = fullscreen
      ? Math.max(250, window.innerHeight - mEl.getBoundingClientRect().top - subChartCount * 130 - 8)
      : 420;
    const main = createChart(mEl, opts(mainHeight, mEl));
    charts.push({ api: main, el: mEl });

    // Heikin Ashi transformation
    const candleData = toggles.heikinAshi
      ? (() => {
          const ha: { time: string; open: number; high: number; low: number; close: number }[] = [];
          for (let i = 0; i < data.length; i++) {
            const d = data[i];
            const haClose = (d.open + d.high + d.low + d.close) / 4;
            const haOpen = i === 0
              ? (d.open + d.close) / 2
              : (ha[i - 1].open + ha[i - 1].close) / 2;
            ha.push({
              time: d.time,
              open: haOpen,
              high: Math.max(d.high, haOpen, haClose),
              low: Math.min(d.low, haOpen, haClose),
              close: haClose,
            });
          }
          return ha;
        })()
      : data.map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close }));

    const candle = main.addSeries(CandlestickSeries, {
      upColor: tc.candleUp, downColor: tc.candleDown,
      borderDownColor: tc.candleDown, borderUpColor: tc.candleUp,
      wickDownColor: tc.candleDown, wickUpColor: tc.candleUp,
    });
    candle.setData(candleData);

    // Volume
    const vol = main.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    main.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    vol.setData(
      data.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? tc.volUp : tc.volDown,
      })),
    );

    /* ???? Bollinger Bands ???? */
    if (toggles.bb) {
      const bb = computeBollingerBands(data, 20, 2);
      if (bb.length) {
        const addL = (vals: { time: string; value: number }[], color: string, dash?: number) => {
          const s = main.addSeries(LineSeries, {
            color, lineWidth: 1, lineStyle: dash, priceLineVisible: false,
            lastValueVisible: false, crosshairMarkerVisible: false,
          });
          s.setData(vals);
        };
        addL(bb.map((b) => ({ time: b.time, value: b.upper })), tc.bbBand, 2);
        addL(bb.map((b) => ({ time: b.time, value: b.middle })), tc.bbMid);
        addL(bb.map((b) => ({ time: b.time, value: b.lower })), tc.bbBand, 2);
      }
    }

    /* ???? EMA Ribbon ???? */
    if (toggles.ema) {
      for (const [p, c] of [[8, tc.ema8], [21, tc.ema21]] as [number, string][]) {
        const e = computeEMA(data, p);
        if (e.length) {
          const s = main.addSeries(LineSeries, {
            color: c, lineWidth: 2, priceLineVisible: false,
            lastValueVisible: false, crosshairMarkerVisible: false,
          });
          s.setData(e);
        }
      }
    }

    /* ???? SMA 50/100/200 ???? */
    if (toggles.sma) {
      for (const [p, c] of [[50, tc.sma50], [100, tc.sma100], [200, tc.sma200]] as [number, string][]) {
        if (data.length < p + 5) continue;
        const vals = computeSMA(data, p);
        if (vals.length) {
          const s = main.addSeries(LineSeries, {
            color: c, lineWidth: 1, lineStyle: 2,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          s.setData(vals);
        }
      }
    }

    /* ???? EMA 50/100/200 ???? */
    if (toggles.longEma) {
      for (const [p, c] of [[50, tc.ema50], [100, tc.ema100], [200, tc.ema200]] as [number, string][]) {
        if (data.length < p + 5) continue;
        const vals = computeEMA(data, p);
        if (vals.length) {
          const s = main.addSeries(LineSeries, {
            color: c, lineWidth: 1,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          s.setData(vals);
        }
      }
    }

    /* ???? Turbulent Waves ??19 EMAs from 20 to 200 ???? */
    if (toggles.waves) {
      for (let p = 20; p <= 200; p += 10) {
        if (data.length < p + 5) continue;
        const e = computeEMA(data, p);
        if (e.length) {
          const alpha = Math.max(0.15, Math.min(0.85, p / 250));
          const s = main.addSeries(LineSeries, {
            color: `rgba(59, 130, 246, ${alpha.toFixed(2)})`,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          s.setData(e);
        }
      }
    }

    /* ???? Parabolic SAR ???? */
    if (toggles.sar) {
      const sar = computeParabolicSAR(data);
      if (sar.length) {
        // Split into trend segments to avoid cross-trend lines
        type Seg = { trend: "up" | "down"; pts: { time: string; value: number }[] };
        const segs: Seg[] = [];
        let cur: Seg = { trend: sar[0].trend, pts: [] };
        for (const pt of sar) {
          if (pt.trend !== cur.trend) {
            segs.push(cur);
            cur = { trend: pt.trend, pts: [] };
          }
          cur.pts.push({ time: pt.time, value: pt.value });
        }
        segs.push(cur);
        for (const seg of segs) {
          const s = main.addSeries(LineSeries, {
            color: seg.trend === "up" ? tc.sarUp : tc.sarDown,
            lineWidth: 1, lineStyle: 1,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          s.setData(seg.pts);
        }
      }
    }

    /* ???? Support & Resistance ???? */
    if (toggles.sr) {
      const levels = detectSupportResistance(data);
      for (const lv of levels) {
        candle.createPriceLine({
          price: lv.price,
          color: lv.type === "support" ? tc.support : tc.resistance,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${lv.type === "support" ? "S" : "R"} (?${lv.touches})`,
        });
      }
    }

    /* ???? Fundamentals: 52-Week High/Low price lines ???? */
    if (toggles.fundamentals && fundamentalsData) {
      if (fundamentalsData.fiftyTwoWeekHigh != null) {
        candle.createPriceLine({
          price: fundamentalsData.fiftyTwoWeekHigh,
          color: "#2e7d32",
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: "52W High",
        });
      }
      if (fundamentalsData.fiftyTwoWeekLow != null) {
        candle.createPriceLine({
          price: fundamentalsData.fiftyTwoWeekLow,
          color: "#c62828",
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: "52W Low",
        });
      }
    }

    /* ???? VWAP ???? */
    if (toggles.vwap) {
      const vwapData = computeVWAP(data, vwapAnchor ?? undefined);
      if (vwapData.length) {
        const s = main.addSeries(LineSeries, {
          color: tc.vwap, lineWidth: 2, lineStyle: 0,
          priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
          title: vwapAnchor ? `aVWAP` : "VWAP",
        });
        s.setData(vwapData);
      }
    }

    /* ???? Ichimoku Cloud ???? */
    if (toggles.ichimoku) {
      const ich = computeIchimoku(data);
      if (ich.length) {
        // Tenkan-sen (Conversion Line)
        const tenkanS = main.addSeries(LineSeries, {
          color: tc.ichTenkan, lineWidth: 1,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        });
        tenkanS.setData(ich.map((p) => ({ time: p.time, value: p.tenkan })));

        // Kijun-sen (Base Line)
        const kijunS = main.addSeries(LineSeries, {
          color: tc.ichKijun, lineWidth: 1,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        });
        kijunS.setData(ich.map((p) => ({ time: p.time, value: p.kijun })));

        // Senkou Span A (Leading Span A) ??shifted 26 periods ahead via future dates
        // We approximate the shift by using displaced time entries
        const displacement = 26;
        const senkouAData: { time: string; value: number }[] = [];
        const senkouBData: { time: string; value: number }[] = [];

        for (let i = 0; i < ich.length; i++) {
          const dataIdx = (data.length - ich.length) + i + displacement;
          if (dataIdx < data.length) {
            // Use actual future dates from the data
            const futureTime = data[dataIdx]?.time;
            if (futureTime) {
              senkouAData.push({ time: futureTime, value: ich[i].senkouA });
              senkouBData.push({ time: futureTime, value: ich[i].senkouB });
            }
          } else if (!isIntraday) {
            // Extrapolate future dates beyond the data range (daily only ??            // intraday extrapolation would produce date-only strings that
            // mismatch the datetime format of the rest of the series)
            const lastDate = new Date(data[data.length - 1].time);
            const daysAhead = dataIdx - data.length + 1;
            // Skip weekends when extrapolating
            let added = 0;
            const d = new Date(lastDate);
            while (added < daysAhead) {
              d.setDate(d.getDate() + 1);
              const dow = d.getDay();
              if (dow !== 0 && dow !== 6) added++;
            }
            const futureTime = d.toISOString().slice(0, 10);
            senkouAData.push({ time: futureTime, value: ich[i].senkouA });
            senkouBData.push({ time: futureTime, value: ich[i].senkouB });
          }
        }

        if (senkouAData.length) {
          const spanAS = main.addSeries(LineSeries, {
            color: "#4caf50", lineWidth: 1, lineStyle: 0,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          spanAS.setData(senkouAData);

          const spanBS = main.addSeries(LineSeries, {
            color: "#ef5350", lineWidth: 1, lineStyle: 0,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          spanBS.setData(senkouBData);
        }

        // Chikou Span (Lagging Span) ??shifted 26 periods back
        const chikouData: { time: string; value: number }[] = [];
        for (let i = displacement; i < ich.length; i++) {
          if (isNaN(ich[i].chikou)) continue;
          const pastIdx = i - displacement;
          const pastTime = data[data.length - ich.length + pastIdx]?.time;
          if (pastTime) {
            chikouData.push({ time: pastTime, value: ich[i].chikou });
          }
        }
        if (chikouData.length) {
          const chikouS = main.addSeries(LineSeries, {
            color: tc.ichChikou, lineWidth: 1, lineStyle: 2,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          chikouS.setData(chikouData);
        }
      }
    }

    /* ???? TA Engine Trendlines ??one channel OR top support+resistance ???? */
    if (toggles.trendlines && taTrendlines) {
      const topChannel = (taTrendlines.channels ?? [])[0];

      if (topChannel) {
        // Best channel: 2 clean parallel lines
        if (topChannel.support.line.length >= 2) {
          const s = main.addSeries(LineSeries, {
            color: "#2e7d32", lineWidth: 2, lineStyle: 0,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          s.setData(topChannel.support.line.map(p => ({ time: p.time, value: p.value })));
        }
        if (topChannel.resistance.line.length >= 2) {
          const s = main.addSeries(LineSeries, {
            color: "#c62828", lineWidth: 2, lineStyle: 0,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          s.setData(topChannel.resistance.line.map(p => ({ time: p.time, value: p.value })));
        }
      } else {
        // No channel ??show single best support + single best resistance
        const sup = taTrendlines.support[0];
        if (sup?.line.length >= 2) {
          const s = main.addSeries(LineSeries, {
            color: "#2e7d32", lineWidth: 2, lineStyle: 0,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          s.setData(sup.line.map(p => ({ time: p.time, value: p.value })));
        }
        const res = taTrendlines.resistance[0];
        if (res?.line.length >= 2) {
          const s = main.addSeries(LineSeries, {
            color: "#c62828", lineWidth: 2, lineStyle: 0,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          });
          s.setData(res.line.map(p => ({ time: p.time, value: p.value })));
        }
      }
    }

    /* ???? TA Engine Ranges (most recent only) ???? */
    if (toggles.ranges && taRanges) {
      for (const rng of taRanges.slice(0, 2)) {
        candle.createPriceLine({
          price: rng.high,
          color: "rgba(176,128,48,0.45)",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: "",
        });
        candle.createPriceLine({
          price: rng.low,
          color: "rgba(176,128,48,0.45)",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: "",
        });
      }
    }

    /* ???? Fibonacci ???? */
    if (toggles.fib) {
      const sw = detectSwingPoints(data, 120);
      if (sw) {
        const fibs = computeFibonacciLevels(sw.high, sw.low);
        for (const f of fibs) {
          candle.createPriceLine({
            price: f.price,
            color: tc.fib,
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: false,
            title: `Fib ${f.label}`,
          });
        }
      }
    }

    /* ???? Market Structure Labels (HH/HL/LH/LL) ???? */
    /* (added to markers array below) */

    /* ???? Fair Value Gaps ???? */
    if (toggles.fvg) {
      const fvgs = detectFVGs(data).filter(g => !g.filled).slice(-12);
      for (const gap of fvgs) {
        candle.createPriceLine({
          price: gap.top,
          color: gap.direction === "bullish" ? "rgba(46,125,50,0.3)" : "rgba(198,40,40,0.3)",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: "",
        });
        candle.createPriceLine({
          price: gap.bottom,
          color: gap.direction === "bullish" ? "rgba(46,125,50,0.3)" : "rgba(198,40,40,0.3)",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: "",
        });
      }
    }

    /* ???? Order Blocks ???? */
    if (toggles.orderBlocks) {
      const obs = detectOrderBlocks(data).filter(ob => !ob.mitigated).slice(-8);
      for (const ob of obs) {
        candle.createPriceLine({
          price: ob.top,
          color: ob.direction === "bullish" ? "rgba(46,125,50,0.45)" : "rgba(198,40,40,0.45)",
          lineWidth: 1,
          lineStyle: 0,
          axisLabelVisible: false,
          title: ob.direction === "bullish" ? "OB Bull" : "OB Bear",
        });
        candle.createPriceLine({
          price: ob.bottom,
          color: ob.direction === "bullish" ? "rgba(46,125,50,0.45)" : "rgba(198,40,40,0.45)",
          lineWidth: 1,
          lineStyle: 0,
          axisLabelVisible: false,
          title: "",
        });
      }
    }

    /* ???? Markers ???? */
    const markers: SeriesMarker<Time>[] = [];

    /* ???? Market Structure Labels ???? */
    if (toggles.structure) {
      const structureLabels = detectMarketStructure(data, 5);
      for (const sl of structureLabels) {
        markers.push({
          time: sl.time as Time,
          position: sl.type === "high" ? "aboveBar" : "belowBar",
          color: sl.label === "HH" || sl.label === "HL" ? tc.bull : tc.bear,
          shape: "circle" as const,
          text: sl.label,
          size: 0.5,
        });
      }
    }

    /* ???? Candlestick pattern markers (small, no text) ???? */
    if (toggles.setups) {
      const allCandle = detectCandlePatterns(data);
      const cutoff = data.length > 120 ? data[data.length - 120].time : data[0].time;
      for (const p of allCandle.filter(p => p.time >= cutoff)) {
        markers.push({
          time: p.time as Time,
          position: p.type === "bullish" ? "belowBar" : p.type === "bearish" ? "aboveBar" : "inBar",
          color: p.type === "bullish" ? tc.bull : p.type === "bearish" ? tc.bear : tc.muted,
          shape: p.type === "bullish" ? "arrowUp" : p.type === "bearish" ? "arrowDown" : "circle",
          text: "",
          size: 0.5,
        });
      }
    }

    /* ???? Divergence lines (from old signal engine, kept for unique value) ???? */
    if (toggles.setups) {
      const divSetups = detectTradingSetups(data).filter(s => s.divergence);
      for (const ds of divSetups) {
        const dv = ds.divergence!;
        const divLine = main.addSeries(LineSeries, {
          color: ds.type === "bullish" ? tc.bull : tc.bear,
          lineWidth: 2,
          lineStyle: 2,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        });
        divLine.setData([
          { time: dv.price1.time as Time, value: dv.price1.value },
          { time: dv.price2.time as Time, value: dv.price2.value },
        ]);
        markers.push({
          time: dv.price1.time as Time,
          position: ds.type === "bullish" ? "belowBar" : "aboveBar",
          color: ds.type === "bullish" ? tc.bull : tc.bear,
          shape: "circle" as const,
          text: "DIV",
          size: 0.5,
        });
      }
    }

    /* ???? TA Engine Breakout markers (only if no TA setup already covers that time) ???? */
    if (toggles.ranges && taBreakouts) {
      const setupTimes = new Set(
        (taActiveSetups ?? []).filter(s => s.confidence >= 0.5).slice(0, 5).map(s => s.time?.slice(0, 10))
      );
      for (const bo of taBreakouts.filter(b => b.status === "confirmed").slice(0, 3)) {
        if (setupTimes.has(bo.breakout_time?.slice(0, 10))) continue;
        markers.push({
          time: bo.breakout_time as Time,
          position: bo.direction === "bullish" ? "belowBar" : "aboveBar",
          color: bo.direction === "bullish" ? tc.bull : tc.bear,
          shape: bo.direction === "bullish" ? "arrowUp" : "arrowDown",
          text: "Breakout",
          size: 1,
        });
      }
    }

    /* ???? TA Engine Chart Pattern key points (only top pattern, minimal markers) ???? */
    // Pattern details are shown in PatternPanel below the chart

    /* ???? TA Engine Active Setups ??numbered markers only (top 5, conf ??0.5) ???? */
    if (toggles.setups && taActiveSetups && taActiveSetups.length > 0) {
      const circled = ["\u2776","\u2777","\u2778","\u2779","\u277a"];
      const topSetups = taActiveSetups.filter(s => s.confidence >= 0.5).slice(0, 5);
      for (let si = 0; si < topSetups.length; si++) {
        const s = topSetups[si];
        const timeInRange = data.some(d => d.time.slice(0, 10) === s.time?.slice(0, 10));
        if (!timeInRange || !s.time) continue;
        markers.push({
          time: s.time.slice(0, 10) as Time,
          position: s.direction === "bullish" ? "belowBar" : "aboveBar",
          color: s.direction === "bullish" ? tc.bull : tc.bear,
          shape: s.direction === "bullish" ? "arrowUp" : "arrowDown",
          text: circled[si] || String(si + 1),
          size: 1.2,
        });
      }
    }

    if (markers.length) {
      markers.sort((a, b) => (a.time as string).localeCompare(b.time as string));
      createSeriesMarkers(candle, markers);
    }

    /* ???? Volume Profile (native chart primitive) ???? */
    const vpPrimitive = new VolumeProfilePrimitive();
    candle.attachPrimitive(vpPrimitive as ISeriesPrimitive<Time>);
    if (toggles.volProfile && taVolumeProfile && taVolumeProfile.bins.length > 0) {
      vpPrimitive.setData({
        bins: taVolumeProfile.bins,
        poc: taVolumeProfile.poc,
        vaH: taVolumeProfile.value_area_high,
        vaL: taVolumeProfile.value_area_low,
      });
    }

    main.timeScale().fitContent();

    /* eslint-disable react-hooks/exhaustive-deps */
    /* ???? Full time-axis anchor for sub-charts (aligns logical indices) ???? */
    const anchorData = data.map((d) => ({ time: d.time, value: 0 }));

    /* ???? Indicator lookup maps for crosshair ???? */
    const indMaps = {
      rsi: new Map<string, number>(),
      macd: new Map<string, number>(),
      signal: new Map<string, number>(),
      stochK: new Map<string, number>(),
      stochD: new Map<string, number>(),
      adx: new Map<string, number>(),
      wr: new Map<string, number>(),
      cci: new Map<string, number>(),
    };

    /* ???? RSI ?????????????????????????????????????????????????????????????????????????????????????? */
    if (toggles.rsi && rsiRef.current) {
      const el = rsiRef.current;
      el.innerHTML = "";
      const ch = createChart(el, { ...opts(120, el), width: el.clientWidth });
      charts.push({ api: ch, el });
      ch.timeScale().applyOptions({ visible: false });

      // Anchor: invisible series spanning full price data range so logical
      // indices stay aligned with the main chart
      const anchor = ch.addSeries(LineSeries, {
        priceScaleId: "_anchor", color: "transparent", lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      anchor.setData(anchorData);
      ch.priceScale("_anchor").applyOptions({ visible: false, scaleMargins: { top: 0, bottom: 0 } });

      const rsiData = computeRSI(data, 14);
      for (const d of rsiData) indMaps.rsi.set(d.time, d.value);
      const s = ch.addSeries(LineSeries, {
        color: tc.rsiLine, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
      });
      s.setData(rsiData);
      s.createPriceLine({ price: 70, color: tc.rsiOB, lineWidth: 1, lineStyle: 2, title: "70", axisLabelVisible: false });
      s.createPriceLine({ price: 30, color: tc.rsiOS, lineWidth: 1, lineStyle: 2, title: "30", axisLabelVisible: false });
      s.createPriceLine({ price: 50, color: tc.border, lineWidth: 1, lineStyle: 3, title: "", axisLabelVisible: false });
      ch.timeScale().fitContent();
    }

    /* ???? MACD ???????????????????????????????????????????????????????????????????????????????????? */
    if (toggles.macd && macdRef.current) {
      const el = macdRef.current;
      el.innerHTML = "";
      const ch = createChart(el, { ...opts(140, el), width: el.clientWidth });
      charts.push({ api: ch, el });
      ch.timeScale().applyOptions({ visible: false });

      const anchor = ch.addSeries(LineSeries, {
        priceScaleId: "_anchor", color: "transparent", lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      anchor.setData(anchorData);
      ch.priceScale("_anchor").applyOptions({ visible: false, scaleMargins: { top: 0, bottom: 0 } });

      const md = computeMACD(data);
      for (const d of md) { indMaps.macd.set(d.time, d.macd); indMaps.signal.set(d.time, d.signal); }
      const hist = ch.addSeries(HistogramSeries, {
        priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
        priceLineVisible: false, lastValueVisible: false,
      });
      hist.setData(md.map((d) => ({
        time: d.time, value: d.histogram,
        color: d.histogram >= 0 ? tc.macdHistUp : tc.macdHistDn,
      })));

      const ml = ch.addSeries(LineSeries, {
        color: tc.macdLine, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: false,
      });
      ml.setData(md.map((d) => ({ time: d.time, value: d.macd })));

      const sl = ch.addSeries(LineSeries, {
        color: tc.macdSig, lineWidth: 1, lineStyle: 2,
        priceLineVisible: false, lastValueVisible: false,
      });
      sl.setData(md.map((d) => ({ time: d.time, value: d.signal })));

      ml.createPriceLine({ price: 0, color: tc.border, lineWidth: 1, lineStyle: 3, title: "", axisLabelVisible: false });
      ch.timeScale().fitContent();
    }

    /* ???? Stochastic ???????????????????????????????????????????????????????????????????????? */
    if (toggles.stoch && stochRef.current) {
      const el = stochRef.current;
      el.innerHTML = "";
      const ch = createChart(el, { ...opts(120, el), width: el.clientWidth });
      charts.push({ api: ch, el });
      ch.timeScale().applyOptions({ visible: false });

      const anchor = ch.addSeries(LineSeries, {
        priceScaleId: "_anchor", color: "transparent", lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      anchor.setData(anchorData);
      ch.priceScale("_anchor").applyOptions({ visible: false, scaleMargins: { top: 0, bottom: 0 } });

      const sd = computeStochastic(data);
      for (const d of sd) { indMaps.stochK.set(d.time, d.k); indMaps.stochD.set(d.time, d.d); }
      const kS = ch.addSeries(LineSeries, {
        color: tc.stochK, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: false,
      });
      kS.setData(sd.map((d) => ({ time: d.time, value: d.k })));

      const dS = ch.addSeries(LineSeries, {
        color: tc.stochD, lineWidth: 1, lineStyle: 2,
        priceLineVisible: false, lastValueVisible: false,
      });
      dS.setData(sd.map((d) => ({ time: d.time, value: d.d })));

      kS.createPriceLine({ price: 80, color: tc.rsiOB, lineWidth: 1, lineStyle: 2, title: "", axisLabelVisible: false });
      kS.createPriceLine({ price: 20, color: tc.rsiOS, lineWidth: 1, lineStyle: 2, title: "", axisLabelVisible: false });
      ch.timeScale().fitContent();
    }

    /* ???? OBV ???????????????????????????????????????????????????????????????????????????????????????? */
    if (toggles.obv && obvRef.current) {
      const el = obvRef.current;
      el.innerHTML = "";
      const ch = createChart(el, { ...opts(120, el), width: el.clientWidth });
      charts.push({ api: ch, el });
      ch.timeScale().applyOptions({ visible: false });

      const anchor = ch.addSeries(LineSeries, {
        priceScaleId: "_anchor", color: "transparent", lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      anchor.setData(anchorData);
      ch.priceScale("_anchor").applyOptions({ visible: false, scaleMargins: { top: 0, bottom: 0 } });

      const obvData = computeOBV(data);
      const obvS = ch.addSeries(LineSeries, {
        color: tc.obvLine, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
      });
      obvS.setData(obvData);
      ch.timeScale().fitContent();
    }

    /* ???? ADX / DMI ?????????????????????????????????????????????????????????????????????????? */
    if (toggles.adx && adxRef.current) {
      const el = adxRef.current;
      el.innerHTML = "";
      const ch = createChart(el, { ...opts(120, el), width: el.clientWidth });
      charts.push({ api: ch, el });
      ch.timeScale().applyOptions({ visible: false });

      const anchor = ch.addSeries(LineSeries, {
        priceScaleId: "_anchor", color: "transparent", lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      anchor.setData(anchorData);
      ch.priceScale("_anchor").applyOptions({ visible: false, scaleMargins: { top: 0, bottom: 0 } });

      const adxData = computeADX(data);
      for (const d of adxData) indMaps.adx.set(d.time, d.adx);
      if (adxData.length) {
        const adxS = ch.addSeries(LineSeries, {
          color: tc.adxLine, lineWidth: 2,
          priceLineVisible: false, lastValueVisible: true,
        });
        adxS.setData(adxData.map((d) => ({ time: d.time, value: d.adx })));

        const piS = ch.addSeries(LineSeries, {
          color: tc.diPlus, lineWidth: 1,
          priceLineVisible: false, lastValueVisible: false,
        });
        piS.setData(adxData.map((d) => ({ time: d.time, value: d.plusDI })));

        const miS = ch.addSeries(LineSeries, {
          color: tc.diMinus, lineWidth: 1,
          priceLineVisible: false, lastValueVisible: false,
        });
        miS.setData(adxData.map((d) => ({ time: d.time, value: d.minusDI })));

        adxS.createPriceLine({ price: 25, color: tc.border, lineWidth: 1, lineStyle: 2, title: "", axisLabelVisible: false });
      }
      ch.timeScale().fitContent();
    }

    /* ???? Williams %R ???????????????????????????????????????????????????????????????????????? */
    if (toggles.williamsR && wrRef.current) {
      const el = wrRef.current;
      el.innerHTML = "";
      const ch = createChart(el, { ...opts(120, el), width: el.clientWidth });
      charts.push({ api: ch, el });
      ch.timeScale().applyOptions({ visible: false });

      const anchor = ch.addSeries(LineSeries, {
        priceScaleId: "_anchor", color: "transparent", lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      anchor.setData(anchorData);
      ch.priceScale("_anchor").applyOptions({ visible: false, scaleMargins: { top: 0, bottom: 0 } });

      const wrData = computeWilliamsR(data);
      for (const d of wrData) indMaps.wr.set(d.time, d.value);
      const wrS = ch.addSeries(LineSeries, {
        color: tc.wrLine, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
      });
      wrS.setData(wrData);
      wrS.createPriceLine({ price: -20, color: tc.rsiOB, lineWidth: 1, lineStyle: 2, title: "-20", axisLabelVisible: false });
      wrS.createPriceLine({ price: -80, color: tc.rsiOS, lineWidth: 1, lineStyle: 2, title: "-80", axisLabelVisible: false });
      ch.timeScale().fitContent();
    }

    /* ???? CCI ???????????????????????????????????????????????????????????????????????????????????????? */
    if (toggles.cci && cciRef.current) {
      const el = cciRef.current;
      el.innerHTML = "";
      const ch = createChart(el, { ...opts(120, el), width: el.clientWidth });
      charts.push({ api: ch, el });
      ch.timeScale().applyOptions({ visible: false });

      const anchor = ch.addSeries(LineSeries, {
        priceScaleId: "_anchor", color: "transparent", lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      anchor.setData(anchorData);
      ch.priceScale("_anchor").applyOptions({ visible: false, scaleMargins: { top: 0, bottom: 0 } });

      const cciData = computeCCI(data);
      for (const d of cciData) indMaps.cci.set(d.time, d.value);
      const cciS = ch.addSeries(LineSeries, {
        color: tc.cciLine, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
      });
      cciS.setData(cciData);
      cciS.createPriceLine({ price: 100, color: tc.rsiOB, lineWidth: 1, lineStyle: 2, title: "+100", axisLabelVisible: false });
      cciS.createPriceLine({ price: -100, color: tc.rsiOS, lineWidth: 1, lineStyle: 2, title: "-100", axisLabelVisible: false });
      cciS.createPriceLine({ price: 0, color: tc.border, lineWidth: 1, lineStyle: 3, title: "", axisLabelVisible: false });
      ch.timeScale().fitContent();
    }

    /* Relative Strength vs benchmark */
    if (toggles.relStrength && rsRef.current && benchmarkData.length > 0 && ticker !== RS_BENCHMARK_TICKER) {
      const el = rsRef.current;
      el.innerHTML = "";
      const ch = createChart(el, { ...opts(120, el), width: el.clientWidth });
      charts.push({ api: ch, el });
      ch.timeScale().applyOptions({ visible: false });

      const anchor = ch.addSeries(LineSeries, {
        priceScaleId: "_anchor", color: "transparent", lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      anchor.setData(anchorData);
      ch.priceScale("_anchor").applyOptions({ visible: false, scaleMargins: { top: 0, bottom: 0 } });

      const benchMap = new Map(benchmarkData.map((b) => [b.time, b.close]));
      const ratioData: { time: string; value: number }[] = [];
      let baseRatio: number | null = null;
      for (const bar of data) {
        const benchmarkClose = benchMap.get(bar.time);
        if (benchmarkClose && benchmarkClose > 0) {
          const ratio = bar.close / benchmarkClose;
          if (baseRatio === null) baseRatio = ratio;
          ratioData.push({ time: bar.time, value: (ratio / baseRatio) * 100 });
        }
      }
      if (ratioData.length > 0) {
        const rsLine = ch.addSeries(LineSeries, {
          color: tc.vwap, lineWidth: 2,
          priceLineVisible: false, lastValueVisible: true,
        });
        rsLine.setData(ratioData);
        rsLine.createPriceLine({ price: 100, color: tc.border, lineWidth: 1, lineStyle: 2, title: "Base", axisLabelVisible: false });
      }
      ch.timeScale().fitContent();
    }

    /* ???? Chart click handler (VWAP anchor + Drawing tools) ???? */
    main.subscribeClick((param) => {
      if (!param.time) return;
      const timeStr = typeof param.time === "object" && "year" in param.time
        ? `${param.time.year}-${String(param.time.month).padStart(2, "0")}-${String(param.time.day).padStart(2, "0")}`
        : String(param.time);

      // VWAP anchor mode
      if (vwapAnchorMode) {
        setVwapAnchor(timeStr);
        setVwapAnchorMode(false);
        return;
      }

      // Drawing mode
      if (drawModeRef.current && param.point) {
        const price = candle.coordinateToPrice(param.point.y as Coordinate);
        if (price === null) return;

        if (drawModeRef.current === "hline") {
          addDrawingRef.current({
            id: crypto.randomUUID(),
            type: "hline",
            ticker,
            color: "#ff9800",
            price: price as number,
          });
          setDrawMode(null);
        } else if (drawModeRef.current === "trendline") {
          if (!drawStartRef.current) {
            setDrawStart({ time: timeStr, price: price as number });
          } else {
            addDrawingRef.current({
              id: crypto.randomUUID(),
              type: "trendline",
              ticker,
              color: "#2196f3",
              p1: drawStartRef.current,
              p2: { time: timeStr, price: price as number },
            });
            setDrawStart(null);
            setDrawMode(null);
          }
        } else if (drawModeRef.current === "rect") {
          if (!drawStartRef.current) {
            setDrawStart({ time: timeStr, price: price as number });
          } else {
            addDrawingRef.current({
              id: crypto.randomUUID(),
              type: "rect",
              ticker,
              color: "#9c27b0",
              topLeft: {
                time: drawStartRef.current.time < timeStr ? drawStartRef.current.time : timeStr,
                price: Math.max(drawStartRef.current.price, price as number),
              },
              bottomRight: {
                time: drawStartRef.current.time < timeStr ? timeStr : drawStartRef.current.time,
                price: Math.min(drawStartRef.current.price, price as number),
              },
            });
            setDrawStart(null);
            setDrawMode(null);
          }
        }
      }
    });

    /* ???? Render saved drawings ???? */
    for (const drw of drawingsRef.current) {
      if (drw.type === "hline" && drw.price != null) {
        candle.createPriceLine({
          price: drw.price,
          color: drw.color,
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: "Line",
        });
      } else if (drw.type === "trendline" && drw.p1 && drw.p2) {
        const tl = main.addSeries(LineSeries, {
          color: drw.color,
          lineWidth: 2,
          lineStyle: 2,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        });
        tl.setData([
          { time: drw.p1.time as Time, value: drw.p1.price },
          { time: drw.p2.time as Time, value: drw.p2.price },
        ]);
      } else if (drw.type === "rect" && drw.topLeft && drw.bottomRight) {
        candle.createPriceLine({
          price: drw.topLeft.price,
          color: drw.color + "66",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: "Rect Top",
        });
        candle.createPriceLine({
          price: drw.bottomRight.price,
          color: drw.color + "66",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: "",
        });
      }
    }

    /* ???? Crosshair data tracking ?????????????????????????????????????????????? */
    // Build lookup maps for fast crosshair resolution
    const timeToBar = new Map<string, typeof data[0]>();
    const tsToBar = new Map<number, typeof data[0]>();
    for (const d of data) {
      timeToBar.set(d.time, d);
      if (isIntraday) {
        const ts = Math.floor(new Date(d.time).getTime() / 1000);
        tsToBar.set(ts, d);
      }
    }

    main.subscribeCrosshairMove((param) => {
      if (!param.time) { setCrosshairData(null); setCrosshairIndicators(null); return; }
      let timeStr: string;
      let bar: typeof data[0] | undefined;
      if (typeof param.time === "number") {
        // Intraday: param.time is a Unix timestamp
        bar = tsToBar.get(param.time);
        if (bar) { timeStr = bar.time; }
        else { setCrosshairData(null); setCrosshairIndicators(null); return; }
      } else if (typeof param.time === "object" && "year" in param.time) {
        timeStr = `${param.time.year}-${String(param.time.month).padStart(2, "0")}-${String(param.time.day).padStart(2, "0")}`;
        bar = timeToBar.get(timeStr);
      } else {
        timeStr = String(param.time);
        bar = timeToBar.get(timeStr);
      }
      if (bar) {
        setCrosshairData({
          time: bar.time, open: bar.open, high: bar.high,
          low: bar.low, close: bar.close, volume: bar.volume,
        });
        const ind: { rsi?: number; macd?: number; signal?: number; stochK?: number; stochD?: number; adx?: number; wr?: number; cci?: number } = {};
        const r = indMaps.rsi.get(timeStr); if (r !== undefined) ind.rsi = r;
        const m = indMaps.macd.get(timeStr); if (m !== undefined) ind.macd = m;
        const sg = indMaps.signal.get(timeStr); if (sg !== undefined) ind.signal = sg;
        const sk = indMaps.stochK.get(timeStr); if (sk !== undefined) ind.stochK = sk;
        const sd = indMaps.stochD.get(timeStr); if (sd !== undefined) ind.stochD = sd;
        const ax = indMaps.adx.get(timeStr); if (ax !== undefined) ind.adx = ax;
        const w = indMaps.wr.get(timeStr); if (w !== undefined) ind.wr = w;
        const cc = indMaps.cci.get(timeStr); if (cc !== undefined) ind.cci = cc;
        setCrosshairIndicators(Object.keys(ind).length > 0 ? ind : null);
      }
    });

    /* ???? Time-scale sync ?????????????????????????????????????????????????????????????? */
    let syncing = false;
    let disposed = false;
    for (let i = 0; i < charts.length; i++) {
      charts[i].api.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (syncing || !range || disposed) return;
        syncing = true;
        for (let j = 0; j < charts.length; j++) {
          if (i !== j) {
            try {
              charts[j].api.timeScale().setVisibleLogicalRange(range);
            } catch { /* chart might be removed */ }
          }
        }
        syncing = false;
      });
    }

    /* ???? Resize ???????????????????????????????????????????????????????????????????????????????? */
    const handleResize = () => {
      for (let i = 0; i < charts.length; i++) {
        const { api, el } = charts[i];
        try {
          const newOpts: { width: number; height?: number } = { width: el.clientWidth };
          // Recalculate main chart height in fullscreen mode
          if (fullscreen && i === 0 && mEl) {
            const newHeight = Math.max(250, window.innerHeight - mEl.getBoundingClientRect().top - subChartCount * 130 - 8);
            newOpts.height = newHeight;
          }
          api.applyOptions(newOpts);
        } catch { /* noop */ }
      }
    };
    window.addEventListener("resize", handleResize);

    // ResizeObserver for container size changes (sidebar toggle, split mode)
    let ro: ResizeObserver | undefined;
    if (chartContainerRef.current) {
      ro = new ResizeObserver(handleResize);
      ro.observe(chartContainerRef.current);
    }

    return () => {
      disposed = true;
      try { candle.detachPrimitive(vpPrimitive as ISeriesPrimitive<Time>); } catch {}
      window.removeEventListener("resize", handleResize);
      if (ro) ro.disconnect();
      for (const fn of cleanupFns) { try { fn(); } catch {} }
      for (const { api } of charts) {
        try { api.remove(); } catch { /* noop */ }
      }
    };
  }, [effectiveData, toggles, taTrendlines, taRanges, taBreakouts, taPatterns, taVolumeProfile, taActiveSetups, fullscreen, vwapAnchor, vwapAnchorMode, benchmarkData, ticker, fundamentalsData, isDark, drawings]);

  /* ???????????????????????????????????Render ???????????????????????????????????*/
  const groups = ["Chart", "Overlays", "Structure", "Studies", "Data", "Signals"] as const;

  const activeCount = (Object.values(toggles) as boolean[]).filter(Boolean).length;

  return (
    <div className="space-y-0">
      {/* ???? Toggle bar ???? */}
      {/* Mobile (non-compact): collapsible toolbar to prevent overflow */}
      {isMobile && !compact ? (
        <div
          className="border overflow-hidden"
          style={{ borderColor: C.border, background: C.bg, fontFamily: "var(--font-mono), monospace" }}
        >
          {/* Summary row ??always visible */}
          <button
            onClick={() => setToolbarOpen((v) => !v)}
            className="flex items-center justify-between w-full px-2 py-1.5"
            style={{ background: C.bg }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
              Indicators ({activeCount})
            </span>
            <span className="text-[10px]" style={{ color: C.muted }}>
              {toolbarOpen ? "Close" : "Open"}
            </span>
          </button>

          {/* Expanded groups */}
          {toolbarOpen && (
            <div className="px-2 pb-2 space-y-2">
              {groups.map((g) => (
                <div key={g}>
                  <span className="block text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: C.muted }}>
                    {g}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {TOGGLE_META.filter((t) => t.group === g).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => flip(t.key)}
                        className="px-1.5 py-1 text-[10px] transition-colors"
                        style={{
                          background: toggles[t.key] ? C.ink : "transparent",
                          color: toggles[t.key] ? C.bg : C.muted,
                          border: `1px solid ${toggles[t.key] ? C.ink : C.border}`,
                        }}
                      >
                        {t.mobileLabel || t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {/* Presets + actions */}
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: C.muted }}>
                  Presets
                </span>
                <div className="flex flex-wrap gap-1">
                  {STRATEGY_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => applyPreset(p)}
                      className="px-1.5 py-1 text-[10px] transition-colors"
                      style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}
                      title={p.desc}
                    >
                      {p.name}
                    </button>
                  ))}
                  <button
                    onClick={exportChart}
                    className="px-1.5 py-1 text-[10px] transition-colors"
                    style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}
                  >Export</button>
                  <button
                    onClick={() => {
                      const on = (Object.entries(toggles) as [string, boolean][])
                        .filter(([, v]) => v).map(([k]) => k).join(",");
                      const url = `${window.location.origin}${window.location.pathname}?on=${on}`;
                      navigator.clipboard.writeText(url).then(() => {
                        const btn = document.activeElement as HTMLButtonElement;
                        if (btn) { const orig = btn.textContent; btn.textContent = "Copied"; setTimeout(() => { btn.textContent = orig; }, 1500); }
                      });
                    }}
                    className="px-1.5 py-1 text-[10px] transition-colors"
                    style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}
                  >Share</button>
                  <button
                    onClick={() => { setReplayMode(true); setReplayIndex(Math.max(Math.min(50, data.length), Math.floor(data.length * 0.3))); }}
                    className="px-1.5 py-1 text-[10px] transition-colors"
                    style={{
                      background: replayMode ? "#d32f2f" : "transparent",
                      color: replayMode ? "#fff" : C.muted,
                      border: `1px solid ${replayMode ? "#d32f2f" : C.border}`,
                    }}
                  >Replay</button>
                  <button
                    onClick={() => { setToggles(DEFAULTS); try { localStorage.removeItem("zs_ta_toggles"); } catch {} }}
                    className="px-1.5 py-1 text-[10px] transition-colors"
                    style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}
                  >Reset</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
      <div
        className={`flex flex-wrap items-center border overflow-hidden ${mobileTiny ? "gap-x-[3px] gap-y-[2px] px-1 py-[3px]" : compact ? "gap-x-3 gap-y-1 p-1.5" : "gap-x-5 gap-y-2 p-3"}`}
        style={{ borderColor: C.border, background: C.bg, fontFamily: "var(--font-mono), monospace" }}
      >
        {groups.map((g) => (
          <div key={g} className={`flex flex-wrap items-center ${mobileTiny ? "gap-[2px]" : "gap-1.5"}`}>
            {!mobileTiny && (
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                {g}
              </span>
            )}
            {TOGGLE_META.filter((t) => t.group === g).map((t) => (
              <button
                key={t.key}
                onClick={() => flip(t.key)}
                className={`${btnCls} transition-colors`}
                style={{
                  background: toggles[t.key] ? C.ink : "transparent",
                  color: toggles[t.key] ? C.bg : C.muted,
                  border: `1px solid ${toggles[t.key] ? C.ink : C.border}`,
                }}
                title={t.shortcut ? `Shortcut: ${t.shortcut.toUpperCase()}` : undefined}
              >
                {mobileTiny ? (t.mobileLabel || t.label) : t.label}
                {!isMobile && t.shortcut && (
                  <span className="ml-1 text-[9px] opacity-50">({t.shortcut})</span>
                )}
              </button>
            ))}
          </div>
        ))}

        {/* Preset buttons */}
        <div className={`flex flex-wrap items-center ${mobileTiny ? "gap-[2px]" : "gap-1.5"} ml-auto`}>
          {!mobileTiny && (
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
              Presets
            </span>
          )}
          {STRATEGY_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[11px]"} transition-colors`}
              style={{
                background: "transparent",
                color: C.muted,
                border: `1px solid ${C.border}`,
              }}
              title={p.desc}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={exportChart}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[11px]"} transition-colors`}
            style={{
              background: "transparent",
              color: C.muted,
              border: `1px solid ${C.border}`,
            }}
            title="Export chart as PNG"
          >
            {mobileTiny ? "Exp" : "Export"}
          </button>
          <button
            onClick={() => {
              const on = (Object.entries(toggles) as [string, boolean][])
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(",");
              const url = `${window.location.origin}${window.location.pathname}?on=${on}`;
              navigator.clipboard.writeText(url).then(() => {
                const btn = document.activeElement as HTMLButtonElement;
                if (btn) { const orig = btn.textContent; btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = orig; }, 1500); }
              });
            }}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[11px]"} transition-colors`}
            style={{
              background: "transparent",
              color: C.muted,
              border: `1px solid ${C.border}`,
            }}
            title="Copy shareable link with current toggle state"
          >
            {mobileTiny ? "Link" : "Copy Link"}
          </button>
          <button
            onClick={() => { setReplayMode(true); setReplayIndex(Math.max(Math.min(50, data.length), Math.floor(data.length * 0.3))); }}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[11px]"} transition-colors`}
            style={{
              background: replayMode ? "#d32f2f" : "transparent",
              color: replayMode ? "#fff" : C.muted,
              border: `1px solid ${replayMode ? "#d32f2f" : C.border}`,
            }}
            title="Step through chart history bar-by-bar"
          >
            {mobileTiny ? "Play" : "Replay"}
          </button>
          <button
            onClick={() => { setToggles(DEFAULTS); try { localStorage.removeItem("zs_ta_toggles"); } catch {} }}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[11px]"} transition-colors`}
            style={{
              background: "transparent",
              color: C.muted,
              border: `1px solid ${C.border}`,
            }}
            title="Reset all toggles to defaults"
          >
            {mobileTiny ? "Reset" : "Reset"}
          </button>
        </div>
      </div>
      )}

      {/* ???? Drawing toolbar ???? */}
      <div
        className={`flex flex-wrap items-center border border-t-0 ${mobileTiny ? "gap-[2px] px-1 py-[2px]" : compact ? "gap-1.5 px-1.5 py-1" : "gap-2 px-3 py-1.5"}`}
        style={{ borderColor: C.border, background: C.bg, fontFamily: "var(--font-mono), monospace" }}
      >
        <span className={`${mobileTiny ? "text-[7px]" : "text-[10px]"} font-bold uppercase tracking-wider`} style={{ color: C.muted }}>
          Draw
        </span>
        {([
          { type: "hline" as DrawingType, label: "─ Line", mLabel: "─", color: "#ff9800" },
          { type: "trendline" as DrawingType, label: "╱ Trend", mLabel: "╱", color: "#2196f3" },
          { type: "rect" as DrawingType, label: "▭ Zone", mLabel: "▭", color: "#9c27b0" },
        ]).map((tool) => (
          <button
            key={tool.type}
            onClick={() => { setDrawMode(drawMode === tool.type ? null : tool.type); setDrawStart(null); }}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[10px]"} transition-colors`}
            style={{
              background: drawMode === tool.type ? tool.color : "transparent",
              color: drawMode === tool.type ? "#fff" : C.muted,
              border: `1px solid ${drawMode === tool.type ? tool.color : C.border}`,
            }}
          >
            {mobileTiny ? tool.mLabel : tool.label}
          </button>
        ))}
        {drawings.length > 0 && (
          <>
            <span className={`${mobileTiny ? "text-[7px]" : "text-[10px]"}`} style={{ color: C.muted }}>
              {drawings.length}{mobileTiny ? "" : ` drawing${drawings.length > 1 ? "s" : ""}`}
            </span>
            <button
              onClick={() => { if (drawings.length > 0) removeDrawing(drawings[drawings.length - 1].id); }}
              className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[10px]"} transition-colors`}
              style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}
            >
              {mobileTiny ? "Undo" : "Undo"}
            </button>
            <button
              onClick={clearDrawings}
              className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[10px]"} transition-colors`}
              style={{ background: "transparent", color: "#d32f2f", border: `1px solid ${C.border}` }}
            >
              Clear
            </button>
          </>
        )}
        {drawMode && (
          <span className={`${mobileTiny ? "text-[7px]" : "text-[10px]"}`} style={{ color: "#d32f2f" }}>
            {drawStart ? "Click second point" : "Click on chart"}
          </span>
        )}
      </div>

      {/* ???? VWAP Anchor bar (shown when VWAP is on) ???? */}
      {toggles.vwap && (
        <div
          className={`flex flex-wrap items-center border border-t-0 ${mobileTiny ? "gap-[2px] px-1 py-[2px]" : compact ? "gap-1.5 px-1.5 py-1" : "gap-2 px-3 py-1.5"}`}
          style={{ borderColor: C.border, background: C.bg, fontFamily: "var(--font-mono), monospace" }}
        >
          <span className={`${mobileTiny ? "text-[7px]" : "text-[10px]"} font-bold uppercase tracking-wider`} style={{ color: C.muted }}>
            VWAP
          </span>
          {[
            { label: "Monthly", value: null },
            { label: "YTD", value: `${new Date().getFullYear()}-01-01` },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => { setVwapAnchor(a.value); setVwapAnchorMode(false); }}
              className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[10px]"} transition-colors`}
              style={{
                background: vwapAnchor === a.value ? C.ink : "transparent",
                color: vwapAnchor === a.value ? C.bg : C.muted,
                border: `1px solid ${vwapAnchor === a.value ? C.ink : C.border}`,
              }}
            >
              {a.label}
            </button>
          ))}
          <button
            onClick={() => {
              const lowBar = data.reduce((min, d) => d.low < min.low ? d : min, data[0]);
              setVwapAnchor(lowBar.time);
              setVwapAnchorMode(false);
            }}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[10px]"} transition-colors`}
            style={{
              background: vwapAnchor && vwapAnchor !== `${new Date().getFullYear()}-01-01` && !vwapAnchorMode ? C.ink : "transparent",
              color: vwapAnchor && vwapAnchor !== `${new Date().getFullYear()}-01-01` && !vwapAnchorMode ? C.bg : C.muted,
              border: `1px solid ${C.border}`,
            }}
          >
            Period Low
          </button>
          <button
            onClick={() => setVwapAnchorMode(!vwapAnchorMode)}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[10px]"} transition-colors`}
            style={{
              background: vwapAnchorMode ? "#d32f2f" : "transparent",
              color: vwapAnchorMode ? "#fff" : C.muted,
              border: `1px solid ${vwapAnchorMode ? "#d32f2f" : C.border}`,
            }}
          >
            {vwapAnchorMode ? "Click chart" : "Set Anchor"}
          </button>
          {vwapAnchor && (
            <span className="text-[10px]" style={{ color: C.muted }}>
              from {vwapAnchor}
            </span>
          )}
        </div>
      )}

      {/* ???? Replay controls ???? */}
      {replayMode && (
        <div
          className={`flex flex-wrap items-center border border-t-0 ${mobileTiny ? "gap-[2px] px-1 py-[2px]" : compact ? "gap-1.5 px-1.5 py-1" : "gap-2 px-3 py-1.5"}`}
          style={{ borderColor: C.border, background: C.bg, fontFamily: "var(--font-mono), monospace" }}
        >
          <span className={`${mobileTiny ? "text-[7px]" : "text-[10px]"} font-bold uppercase tracking-wider`} style={{ color: "#d32f2f" }}>
            Replay
          </span>
          <button
            onClick={() => setReplayIndex(i => Math.max(Math.min(50, data.length), i - 1))}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[11px]"}`}
            style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}
          >
            -1
          </button>
          <button
            onClick={() => setReplayIndex(i => Math.min(data.length, i + 1))}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[11px]"}`}
            style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}
          >
            +1
          </button>
          <button
            onClick={() => setReplayIndex(i => Math.min(data.length, i + 5))}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[11px]"}`}
            style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}
          >
            +5
          </button>
          <input
            type="range"
            min={Math.min(50, data.length)}
            max={data.length}
            value={replayIndex || data.length}
            onChange={e => setReplayIndex(Number(e.target.value))}
            className={`flex-1 ${mobileTiny ? "min-w-[60px]" : "min-w-[100px]"}`}
            style={{ accentColor: C.ink }}
          />
          <span className={`${mobileTiny ? "text-[7px]" : "text-[10px]"}`} style={{ color: C.muted }}>
            {replayIndex || data.length}/{data.length}
          </span>
          <button
            onClick={() => { setReplayMode(false); setReplayIndex(0); }}
            className={`${mobileTiny ? "px-[3px] py-0 text-[7px] leading-[16px]" : "px-2 py-0.5 text-[10px]"}`}
            style={{ background: "#d32f2f", color: "#fff", border: "1px solid #d32f2f" }}
          >
            Exit
          </button>
        </div>
      )}
      {/* ???? Main chart ???? */}
      <div ref={chartContainerRef}>
      <div className="border border-t-0" style={{ borderColor: C.border, background: C.bg }}>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-serif), Georgia, serif", color: C.ink }}
          >
            {ticker} - {toggles.heikinAshi ? "Heikin Ashi" : "Technical Analysis"}
            {toggles.logScale && <span className="ml-2 text-[10px] font-normal" style={{ color: C.muted }}>(log)</span>}
          </h2>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: C.muted }}>
            {toggles.bb && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-px w-3" style={{ background: C.bbBand, borderTop: "1px dashed" + C.bbBand }} />
                BB
              </span>
            )}
            {toggles.ema && (
              <>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded" style={{ background: C.ema8 }} />EMA8</span>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded" style={{ background: C.ema21 }} />EMA21</span>
              </>
            )}
            {toggles.waves && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded-sm" style={{ background: "linear-gradient(to bottom, rgba(59,130,246,0.15), rgba(59,130,246,0.85))" }} />
                Waves
              </span>
            )}
            {toggles.sma && (
              <>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded" style={{ background: C.sma50, borderTop: "1px dashed" }} />SMA50</span>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded" style={{ background: C.sma100, borderTop: "1px dashed" }} />SMA100</span>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded" style={{ background: C.sma200, borderTop: "1px dashed" }} />SMA200</span>
              </>
            )}
            {toggles.longEma && (
              <>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded" style={{ background: C.ema50 }} />EMA50</span>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded" style={{ background: C.ema100 }} />EMA100</span>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded" style={{ background: C.ema200 }} />EMA200</span>
              </>
            )}
            {toggles.vwap && <span style={{ color: C.vwap }}>VWAP</span>}
            {toggles.ichimoku && (
              <>
                <span style={{ color: C.ichTenkan }}>Tenkan</span>
                <span style={{ color: C.ichKijun }}>Kijun</span>
                <span>Cloud</span>
              </>
            )}
            {toggles.sr && <span>S/R lines</span>}
            {toggles.fib && <span style={{ color: C.fib }}>Fibonacci</span>}
          </div>
        </div>

        {/* Crosshair data panel ??fixed height to prevent layout shift */}
        <div
          className="mx-4 mb-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]"
          style={{ fontFamily: "var(--font-mono), monospace", color: C.muted, fontFeatureSettings: '"tnum"', minHeight: "1.2em" }}
        >
          {crosshairData ? (
            <>
              <span>{crosshairData.time}</span>
              <span>O <b style={{ color: C.ink }}>{crosshairData.open.toFixed(2)}</b></span>
              <span>H <b style={{ color: C.ink }}>{crosshairData.high.toFixed(2)}</b></span>
              <span>L <b style={{ color: C.ink }}>{crosshairData.low.toFixed(2)}</b></span>
              <span>C <b style={{ color: crosshairData.close >= crosshairData.open ? C.bull : C.bear }}>{crosshairData.close.toFixed(2)}</b></span>
              <span>Vol <b style={{ color: C.ink }}>{crosshairData.volume >= 1e6 ? (crosshairData.volume / 1e6).toFixed(1) + "M" : crosshairData.volume >= 1e3 ? (crosshairData.volume / 1e3).toFixed(0) + "K" : crosshairData.volume.toString()}</b></span>
              <span style={{ color: crosshairData.close >= crosshairData.open ? C.bull : C.bear }}>
                {crosshairData.close >= crosshairData.open ? "Up" : "Down"} {((crosshairData.close - crosshairData.open) / crosshairData.open * 100).toFixed(2)}%
              </span>
              {crosshairIndicators && (
                <>
                  <span style={{ color: C.border }}>|</span>
                  {crosshairIndicators.rsi != null && (
                    <span>RSI <b style={{ color: crosshairIndicators.rsi > 70 ? C.bear : crosshairIndicators.rsi < 30 ? C.bull : C.ink }}>{crosshairIndicators.rsi.toFixed(1)}</b></span>
                  )}
                  {crosshairIndicators.macd != null && (
                    <span>MACD <b style={{ color: crosshairIndicators.macd >= 0 ? C.bull : C.bear }}>{crosshairIndicators.macd.toFixed(2)}</b>
                      {crosshairIndicators.signal != null && <>{" / "}<b style={{ color: C.ink }}>{crosshairIndicators.signal.toFixed(2)}</b></>}
                    </span>
                  )}
                  {crosshairIndicators.stochK != null && (
                    <span>%K <b style={{ color: crosshairIndicators.stochK > 80 ? C.bear : crosshairIndicators.stochK < 20 ? C.bull : C.ink }}>{crosshairIndicators.stochK.toFixed(1)}</b>
                      {crosshairIndicators.stochD != null && <>{" %D "}<b style={{ color: C.ink }}>{crosshairIndicators.stochD.toFixed(1)}</b></>}
                    </span>
                  )}
                  {crosshairIndicators.adx != null && (
                    <span>ADX <b style={{ color: crosshairIndicators.adx >= 25 ? C.bull : C.muted }}>{crosshairIndicators.adx.toFixed(1)}</b></span>
                  )}
                  {crosshairIndicators.wr != null && (
                    <span>W%R <b style={{ color: crosshairIndicators.wr > -20 ? C.bear : crosshairIndicators.wr < -80 ? C.bull : C.ink }}>{crosshairIndicators.wr.toFixed(1)}</b></span>
                  )}
                  {crosshairIndicators.cci != null && (
                    <span>CCI <b style={{ color: crosshairIndicators.cci > 100 ? C.bear : crosshairIndicators.cci < -100 ? C.bull : C.ink }}>{crosshairIndicators.cci.toFixed(0)}</b></span>
                  )}
                </>
              )}
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>

        <div className="relative">
          <div ref={mainRef} className="w-full px-2 pb-2" />
          {toggles.fundamentals && fundamentalsData && (
            <div
              className="absolute top-2 left-4 z-20 p-2 text-[10px] leading-relaxed"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                opacity: 0.92,
                fontFamily: "var(--font-mono), monospace",
                color: C.muted,
                pointerEvents: "none",
              }}
            >
              <div className="font-bold text-[11px] mb-0.5" style={{ color: C.ink }}>Fundamentals</div>
              <div>P/E: <b style={{ color: C.ink }}>{fundamentalsData.trailingPE?.toFixed(1) ?? "N/A"}</b></div>
              <div>Fwd P/E: <b style={{ color: C.ink }}>{fundamentalsData.forwardPE?.toFixed(1) ?? "N/A"}</b></div>
              <div>P/B: <b style={{ color: C.ink }}>{fundamentalsData.priceToBook?.toFixed(2) ?? "N/A"}</b></div>
              <div>Rev Growth: <b style={{ color: C.ink }}>{fundamentalsData.revenueGrowth != null ? (fundamentalsData.revenueGrowth * 100).toFixed(1) + "%" : "N/A"}</b></div>
              <div>Margin: <b style={{ color: C.ink }}>{fundamentalsData.profitMargin != null ? (fundamentalsData.profitMargin * 100).toFixed(1) + "%" : "N/A"}</b></div>
              <div>Beta: <b style={{ color: C.ink }}>{fundamentalsData.beta?.toFixed(2) ?? "N/A"}</b></div>
              <div>Div Yield: <b style={{ color: C.ink }}>{fundamentalsData.dividendYield != null ? (fundamentalsData.dividendYield * 100).toFixed(2) + "%" : "N/A"}</b></div>
              <div>Mkt Cap: <b style={{ color: C.ink }}>{fundamentalsData.marketCap != null
                ? fundamentalsData.marketCap >= 1e12 ? (fundamentalsData.marketCap / 1e12).toFixed(2) + "T"
                : fundamentalsData.marketCap >= 1e9 ? (fundamentalsData.marketCap / 1e9).toFixed(1) + "B"
                : (fundamentalsData.marketCap / 1e6).toFixed(0) + "M"
                : "N/A"}</b></div>
            </div>
          )}
        </div>
      </div>

      {/* ???? RSI panel ???? */}
      {toggles.rsi && (
        <div className="relative border border-t-0" style={{ borderColor: C.border, background: C.bg }}>
          <span
            className="absolute left-3 top-1 z-10 text-[10px] font-bold"
            style={{ color: C.muted, fontFamily: "var(--font-mono), monospace" }}
          >
            RSI (14)
          </span>
          <div ref={rsiRef} className="w-full px-2" />
        </div>
      )}

      {/* ???? MACD panel ???? */}
      {toggles.macd && (
        <div className="relative border border-t-0" style={{ borderColor: C.border, background: C.bg }}>
          <span
            className="absolute left-3 top-1 z-10 text-[10px] font-bold"
            style={{ color: C.muted, fontFamily: "var(--font-mono), monospace" }}
          >
            MACD (12, 26, 9)
          </span>
          <div ref={macdRef} className="w-full px-2" />
        </div>
      )}

      {/* ???? Stochastic panel ???? */}
      {toggles.stoch && (
        <div className="relative border border-t-0" style={{ borderColor: C.border, background: C.bg }}>
          <span
            className="absolute left-3 top-1 z-10 text-[10px] font-bold"
            style={{ color: C.muted, fontFamily: "var(--font-mono), monospace" }}
          >
            STOCH (14, 3, 3)
          </span>
          <div ref={stochRef} className="w-full px-2" />
        </div>
      )}

      {/* ???? OBV panel ???? */}
      {toggles.obv && (
        <div className="relative border border-t-0" style={{ borderColor: C.border, background: C.bg }}>
          <span
            className="absolute left-3 top-1 z-10 text-[10px] font-bold"
            style={{ color: C.muted, fontFamily: "var(--font-mono), monospace" }}
          >
            OBV
          </span>
          <div ref={obvRef} className="w-full px-2" />
        </div>
      )}

      {/* ???? ADX / DMI panel ???? */}
      {toggles.adx && (
        <div className="relative border border-t-0" style={{ borderColor: C.border, background: C.bg }}>
          <div
            className="absolute left-3 top-1 z-10 flex items-center gap-2 text-[10px] font-bold"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            <span style={{ color: C.adxLine }}>ADX</span>
            <span style={{ color: C.diPlus }}>+DI</span>
            <span style={{ color: C.diMinus }}>-DI</span>
          </div>
          <div ref={adxRef} className="w-full px-2" />
        </div>
      )}

      {/* ???? Williams %R panel ???? */}
      {toggles.williamsR && (
        <div className="relative border border-t-0" style={{ borderColor: C.border, background: C.bg }}>
          <span
            className="absolute left-3 top-1 z-10 text-[10px] font-bold"
            style={{ color: C.muted, fontFamily: "var(--font-mono), monospace" }}
          >
            Williams %R (14)
          </span>
          <div ref={wrRef} className="w-full px-2" />
        </div>
      )}

      {/* ???? CCI panel ???? */}
      {toggles.cci && (
        <div className="relative border border-t-0" style={{ borderColor: C.border, background: C.bg }}>
          <span
            className="absolute left-3 top-1 z-10 text-[10px] font-bold"
            style={{ color: C.muted, fontFamily: "var(--font-mono), monospace" }}
          >
            CCI (20)
          </span>
          <div ref={cciRef} className="w-full px-2" />
        </div>
      )}
      {/* Relative Strength panel */}
      {toggles.relStrength && ticker !== RS_BENCHMARK_TICKER && (
        <div className="relative border border-t-0" style={{ borderColor: C.border, background: C.bg }}>
          <span
            className="absolute left-3 top-1 z-10 text-[10px] font-bold"
            style={{ color: C.muted, fontFamily: "var(--font-mono), monospace" }}
          >
            {RS_LABEL}
          </span>
          <div ref={rsRef} className="w-full px-2" />
        </div>
      )}
      </div>{/* close chartContainerRef */}

      {/* ???? TA Engine Active Setups Key ???? */}
      {toggles.setups && taActiveSetups && taActiveSetups.filter(s => s.confidence >= 0.5).length > 0 && (
        <div
          className="border border-t-0 px-3 py-1.5"
          style={{ borderColor: C.border, background: C.bg }}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className="text-[9px] font-bold uppercase tracking-wider shrink-0"
              style={{ color: C.muted, fontFamily: "var(--font-mono), monospace" }}
            >
              Setups
            </span>
            {taActiveSetups.filter(s => s.confidence >= 0.5).slice(0, 5).map((s, i) => {
              const circled = ["\u2776","\u2777","\u2778","\u2779","\u277a"];
              const isBull = s.direction === "bullish";
              const kindLabel = s.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
              return (
                <span
                  key={`${s.type}-${s.time}-${i}`}
                  className="text-[10px]"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  <span style={{ color: isBull ? C.bull : C.bear, fontSize: 12 }}>
                    {circled[i] || i + 1}
                  </span>{" "}
                  <span style={{ color: C.ink }}>{kindLabel}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
