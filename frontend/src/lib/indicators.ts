import type { PriceBar } from "./api";

/* ───────────────────────── Types ───────────────────────── */

export interface TimeValue {
  time: string;
  value: number;
}

export interface BollingerPoint {
  time: string;
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export interface MACDPoint {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

export interface StochPoint {
  time: string;
  k: number;
  d: number;
}

export interface SRLevel {
  price: number;
  type: "support" | "resistance";
  touches: number;
  strength: number;
}

export interface FibLevel {
  ratio: number;
  price: number;
  label: string;
}

export interface SARPoint {
  time: string;
  value: number;
  trend: "up" | "down";
}

/* ───────────────────────── Helpers ───────────────────────── */

function round(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/** EMA over raw number array — returns same-length array with NaN for warm-up entries */
function emaRaw(values: number[], period: number): number[] {
  if (values.length < period) return values.map(() => NaN);
  const k = 2 / (period + 1);
  const result: number[] = new Array(period - 1).fill(NaN);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let ema = sum / period;
  result.push(ema);
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

/* ───────────────── Moving Averages ───────────────── */

export function computeSMA(data: PriceBar[], period: number): TimeValue[] {
  const result: TimeValue[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    result.push({ time: data[i].time, value: round(sum / period) });
  }
  return result;
}

export function computeEMA(data: PriceBar[], period: number): TimeValue[] {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const result: TimeValue[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: round(ema) });
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: round(ema) });
  }
  return result;
}

/* ───────────────── Bollinger Bands (20, 2σ) ───────────────── */

export function computeBollingerBands(
  data: PriceBar[],
  period = 20,
  mult = 2,
): BollingerPoint[] {
  const result: BollingerPoint[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    const mean = sum / period;
    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) sqSum += (data[j].close - mean) ** 2;
    const sd = Math.sqrt(sqSum / period);
    const upper = mean + mult * sd;
    const lower = mean - mult * sd;
    result.push({
      time: data[i].time,
      upper: round(upper),
      middle: round(mean),
      lower: round(lower),
      bandwidth: round(((upper - lower) / mean) * 100, 4),
    });
  }
  return result;
}

/* ───────────────── RSI (14) ───────────────── */

export function computeRSI(data: PriceBar[], period = 14): TimeValue[] {
  if (data.length < period + 1) return [];
  const result: TimeValue[] = [];
  let avgGain = 0,
    avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const c = data[i].close - data[i - 1].close;
    if (c > 0) avgGain += c;
    else avgLoss -= c;
  }
  avgGain /= period;
  avgLoss /= period;
  result.push({
    time: data[period].time,
    value: round(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)),
  });
  for (let i = period + 1; i < data.length; i++) {
    const c = data[i].close - data[i - 1].close;
    avgGain = (avgGain * (period - 1) + (c > 0 ? c : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (c < 0 ? -c : 0)) / period;
    result.push({
      time: data[i].time,
      value: round(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)),
    });
  }
  return result;
}

/* ───────────────── MACD (12, 26, 9) ───────────────── */

export function computeMACD(
  data: PriceBar[],
  fast = 12,
  slow = 26,
  sigPeriod = 9,
): MACDPoint[] {
  const fastEMA = computeEMA(data, fast);
  const slowEMA = computeEMA(data, slow);
  if (slowEMA.length === 0) return [];

  const offset = (slow - 1) - (fast - 1); // align fast to slow start
  const macdVals: number[] = [];
  const times: string[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdVals.push(fastEMA[i + offset].value - slowEMA[i].value);
    times.push(slowEMA[i].time);
  }

  const sigLine = emaRaw(macdVals, sigPeriod);
  const result: MACDPoint[] = [];
  for (let i = 0; i < macdVals.length; i++) {
    if (isNaN(sigLine[i])) continue;
    result.push({
      time: times[i],
      macd: round(macdVals[i], 4),
      signal: round(sigLine[i], 4),
      histogram: round(macdVals[i] - sigLine[i], 4),
    });
  }
  return result;
}

/* ───────────────── Stochastic (14, 3, 3) ───────────────── */

export function computeStochastic(
  data: PriceBar[],
  kPeriod = 14,
  dPeriod = 3,
  smooth = 3,
): StochPoint[] {
  if (data.length < kPeriod) return [];

  // Raw %K
  const rawK: number[] = [];
  for (let i = kPeriod - 1; i < data.length; i++) {
    let hi = -Infinity,
      lo = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (data[j].high > hi) hi = data[j].high;
      if (data[j].low < lo) lo = data[j].low;
    }
    const range = hi - lo;
    rawK.push(range === 0 ? 50 : ((data[i].close - lo) / range) * 100);
  }

  // Smoothed %K = SMA of rawK
  const sK: number[] = [];
  for (let i = smooth - 1; i < rawK.length; i++) {
    let s = 0;
    for (let j = i - smooth + 1; j <= i; j++) s += rawK[j];
    sK.push(s / smooth);
  }

  // %D = SMA of smoothed %K
  const result: StochPoint[] = [];
  for (let i = dPeriod - 1; i < sK.length; i++) {
    let s = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) s += sK[j];
    const dataIdx = kPeriod - 1 + smooth - 1 + i;
    if (dataIdx < data.length) {
      result.push({ time: data[dataIdx].time, k: round(sK[i]), d: round(s / dPeriod) });
    }
  }
  return result;
}

/* ───────────────── ATR (14) ───────────────── */

export function computeATR(data: PriceBar[], period = 14): TimeValue[] {
  if (data.length < period + 1) return [];
  const tr: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const h = data[i].high,
      l = data[i].low,
      pc = data[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let atr = 0;
  for (let i = 0; i < period; i++) atr += tr[i];
  atr /= period;
  const result: TimeValue[] = [{ time: data[period].time, value: round(atr) }];
  for (let i = period; i < tr.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    result.push({ time: data[i + 1].time, value: round(atr) });
  }
  return result;
}

/* ───────────────── OBV ───────────────── */

export function computeOBV(data: PriceBar[]): TimeValue[] {
  if (data.length === 0) return [];
  let obv = 0;
  const result: TimeValue[] = [{ time: data[0].time, value: 0 }];
  for (let i = 1; i < data.length; i++) {
    if (data[i].close > data[i - 1].close) obv += data[i].volume;
    else if (data[i].close < data[i - 1].close) obv -= data[i].volume;
    result.push({ time: data[i].time, value: obv });
  }
  return result;
}

/* ───────────────── Support & Resistance ───────────────── */

export function detectSupportResistance(
  data: PriceBar[],
  pivotWindow = 5,
  maxLevels = 6,
): SRLevel[] {
  if (data.length < pivotWindow * 2 + 1) return [];
  const lastPrice = data[data.length - 1].close;

  // Find pivot highs and lows
  const pivots: { price: number; type: "high" | "low" }[] = [];
  for (let i = pivotWindow; i < data.length - pivotWindow; i++) {
    let isHigh = true,
      isLow = true;
    for (let j = i - pivotWindow; j <= i + pivotWindow; j++) {
      if (j === i) continue;
      if (data[j].high >= data[i].high) isHigh = false;
      if (data[j].low <= data[i].low) isLow = false;
    }
    if (isHigh) pivots.push({ price: data[i].high, type: "high" });
    if (isLow) pivots.push({ price: data[i].low, type: "low" });
  }
  if (pivots.length === 0) return [];

  // Cluster nearby pivots
  const tolerance = lastPrice * 0.015;
  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const clusters: { prices: number[] }[] = [];
  let cur = { prices: [sorted[0].price] };
  for (let i = 1; i < sorted.length; i++) {
    const avg = cur.prices.reduce((s, p) => s + p, 0) / cur.prices.length;
    if (sorted[i].price - avg <= tolerance) {
      cur.prices.push(sorted[i].price);
    } else {
      clusters.push(cur);
      cur = { prices: [sorted[i].price] };
    }
  }
  clusters.push(cur);

  return clusters
    .filter((c) => c.prices.length >= 2)
    .map((c) => {
      const avg = round(c.prices.reduce((s, p) => s + p, 0) / c.prices.length);
      return {
        price: avg,
        type: (avg < lastPrice ? "support" : "resistance") as "support" | "resistance",
        touches: c.prices.length,
        strength: round((c.prices.length / pivots.length) * 100),
      };
    })
    .sort((a, b) => b.touches - a.touches)
    .slice(0, maxLevels);
}

/* ───────────────── Fibonacci Retracements ───────────────── */

export function detectSwingPoints(
  data: PriceBar[],
  lookback = 120,
): { high: number; highTime: string; low: number; lowTime: string } | null {
  if (data.length === 0) return null;
  const slice = data.slice(-lookback);
  let high = -Infinity,
    low = Infinity,
    highTime = "",
    lowTime = "";
  for (const bar of slice) {
    if (bar.high > high) {
      high = bar.high;
      highTime = bar.time;
    }
    if (bar.low < low) {
      low = bar.low;
      lowTime = bar.time;
    }
  }
  return { high, highTime, low, lowTime };
}

export function computeFibonacciLevels(swingHigh: number, swingLow: number): FibLevel[] {
  const diff = swingHigh - swingLow;
  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const labels = ["0%", "23.6%", "38.2%", "50%", "61.8%", "78.6%", "100%"];
  return ratios.map((r, i) => ({
    ratio: r,
    price: round(swingHigh - diff * r),
    label: labels[i],
  }));
}

/* ───────────────── Parabolic SAR ───────────────── */

export function computeParabolicSAR(
  data: PriceBar[],
  step = 0.02,
  maxAF = 0.2,
): SARPoint[] {
  if (data.length < 2) return [];
  const result: SARPoint[] = [];

  let isLong = data[1].close > data[0].close;
  let af = step;
  let ep = isLong ? data[0].high : data[0].low;
  let sar = isLong ? data[0].low : data[0].high;

  for (let i = 1; i < data.length; i++) {
    sar = sar + af * (ep - sar);

    // Clamp
    if (isLong) {
      sar = Math.min(sar, data[i - 1].low);
      if (i >= 2) sar = Math.min(sar, data[i - 2].low);
    } else {
      sar = Math.max(sar, data[i - 1].high);
      if (i >= 2) sar = Math.max(sar, data[i - 2].high);
    }

    // Check reversal
    let reversed = false;
    if (isLong && data[i].low < sar) {
      isLong = false;
      sar = ep;
      ep = data[i].low;
      af = step;
      reversed = true;
    } else if (!isLong && data[i].high > sar) {
      isLong = true;
      sar = ep;
      ep = data[i].high;
      af = step;
      reversed = true;
    }

    if (!reversed) {
      if (isLong && data[i].high > ep) {
        ep = data[i].high;
        af = Math.min(af + step, maxAF);
      } else if (!isLong && data[i].low < ep) {
        ep = data[i].low;
        af = Math.min(af + step, maxAF);
      }
    }

    result.push({ time: data[i].time, value: round(sar), trend: isLong ? "up" : "down" });
  }
  return result;
}

/* ───────────────── VWAP (anchored monthly reset) ───────────────── */

export function computeVWAP(data: PriceBar[], anchor?: string): TimeValue[] {
  let cumTPV = 0;
  let cumVol = 0;
  let prevYearMonth = "";
  const useAnchor = !!anchor;
  let started = !useAnchor;
  return data.map((d) => {
    if (useAnchor) {
      if (!started) {
        if (d.time >= anchor) started = true;
        else return { time: d.time, value: 0 };
      }
    } else {
      const yearMonth = d.time.slice(0, 7);
      if (yearMonth !== prevYearMonth) {
        cumTPV = 0;
        cumVol = 0;
        prevYearMonth = yearMonth;
      }
    }
    const tp = (d.high + d.low + d.close) / 3;
    cumTPV += tp * d.volume;
    cumVol += d.volume;
    return { time: d.time, value: round(cumVol === 0 ? tp : cumTPV / cumVol) };
  }).filter(v => v.value !== 0 || !useAnchor);
}

/* ───────────────── Ichimoku Cloud ───────────────── */

export interface IchimokuPoint {
  time: string;
  tenkan: number;      // Conversion Line (9)
  kijun: number;       // Base Line (26)
  senkouA: number;     // Leading Span A (shifted 26 ahead)
  senkouB: number;     // Leading Span B (shifted 26 ahead)
  chikou: number;      // Lagging Span (shifted 26 back)
}

function donchianMid(data: PriceBar[], end: number, period: number): number {
  const start = Math.max(0, end - period + 1);
  let hi = -Infinity, lo = Infinity;
  for (let i = start; i <= end; i++) {
    if (data[i].high > hi) hi = data[i].high;
    if (data[i].low < lo) lo = data[i].low;
  }
  return (hi + lo) / 2;
}

export function computeIchimoku(
  data: PriceBar[],
  tenkanP = 9,
  kijunP = 26,
  senkouBP = 52,
  displacement = 26,
): IchimokuPoint[] {
  if (data.length < senkouBP) return [];
  const result: IchimokuPoint[] = [];

  for (let i = senkouBP - 1; i < data.length; i++) {
    const tenkan = round(donchianMid(data, i, tenkanP));
    const kijun = round(donchianMid(data, i, kijunP));
    const senkouA = round((tenkan + kijun) / 2);
    const senkouB = round(donchianMid(data, i, senkouBP));
    const chikouIdx = i - displacement;
    const chikou = chikouIdx >= 0 ? round(data[i].close) : NaN;

    result.push({ time: data[i].time, tenkan, kijun, senkouA, senkouB, chikou });
  }
  return result;
}

/* ───────────────── ADX / DMI (14) ───────────────── */

export interface ADXPoint {
  time: string;
  adx: number;
  plusDI: number;
  minusDI: number;
}

export function computeADX(data: PriceBar[], period = 14): ADXPoint[] {
  if (data.length < period * 2 + 1) return [];

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high;
    const downMove = data[i - 1].low - data[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    const h = data[i].high, l = data[i].low, pc = data[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }

  // Smoothed sums (Wilder's smoothing)
  let sTR = 0, sPDM = 0, sMDM = 0;
  for (let i = 0; i < period; i++) {
    sTR += tr[i]; sPDM += plusDM[i]; sMDM += minusDM[i];
  }

  const dx: number[] = [];
  const result: ADXPoint[] = [];

  for (let i = period; i < tr.length; i++) {
    if (i > period) {
      sTR = sTR - sTR / period + tr[i];
      sPDM = sPDM - sPDM / period + plusDM[i];
      sMDM = sMDM - sMDM / period + minusDM[i];
    }
    const pdi = sTR === 0 ? 0 : (sPDM / sTR) * 100;
    const mdi = sTR === 0 ? 0 : (sMDM / sTR) * 100;
    const diSum = pdi + mdi;
    const dxVal = diSum === 0 ? 0 : (Math.abs(pdi - mdi) / diSum) * 100;
    dx.push(dxVal);

    if (dx.length >= period) {
      let adx: number;
      if (dx.length === period) {
        adx = dx.reduce((s, v) => s + v, 0) / period;
      } else {
        const prevADX = result[result.length - 1].adx;
        adx = (prevADX * (period - 1) + dxVal) / period;
      }
      result.push({
        time: data[i + 1].time,
        adx: round(adx),
        plusDI: round(pdi),
        minusDI: round(mdi),
      });
    }
  }
  return result;
}

/* ───────────────── Williams %R ───────────────── */

export function computeWilliamsR(data: PriceBar[], period = 14): TimeValue[] {
  if (data.length < period) return [];
  const result: TimeValue[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high > hi) hi = data[j].high;
      if (data[j].low < lo) lo = data[j].low;
    }
    const range = hi - lo;
    const wr = range === 0 ? -50 : ((hi - data[i].close) / range) * -100;
    result.push({ time: data[i].time, value: round(wr) });
  }
  return result;
}

/* ───────────────── CCI (Commodity Channel Index) ───────────────── */

export function computeCCI(data: PriceBar[], period = 20): TimeValue[] {
  if (data.length < period) return [];
  const result: TimeValue[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += (data[j].high + data[j].low + data[j].close) / 3;
    }
    const mean = sum / period;
    let madSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      madSum += Math.abs((data[j].high + data[j].low + data[j].close) / 3 - mean);
    }
    const mad = madSum / period;
    const tp = (data[i].high + data[i].low + data[i].close) / 3;
    const cci = mad === 0 ? 0 : (tp - mean) / (0.015 * mad);
    result.push({ time: data[i].time, value: round(cci) });
  }
  return result;
}

/* ───────────────── Market Structure (HH/HL/LH/LL) ───────────────── */

export interface StructureLabel {
  time: string;
  price: number;
  label: "HH" | "HL" | "LH" | "LL";
  type: "high" | "low";
}

export function detectMarketStructure(data: PriceBar[], lookback = 5): StructureLabel[] {
  if (data.length < lookback * 2 + 1) return [];
  const swingHighs: { time: string; price: number }[] = [];
  const swingLows: { time: string; price: number }[] = [];

  for (let i = lookback; i < data.length - lookback; i++) {
    let isHigh = true, isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) isHigh = false;
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) isLow = false;
    }
    if (isHigh) swingHighs.push({ time: data[i].time, price: data[i].high });
    if (isLow) swingLows.push({ time: data[i].time, price: data[i].low });
  }

  const labels: StructureLabel[] = [];
  for (let i = 1; i < swingHighs.length; i++) {
    labels.push({
      time: swingHighs[i].time,
      price: swingHighs[i].price,
      label: swingHighs[i].price > swingHighs[i - 1].price ? "HH" : "LH",
      type: "high",
    });
  }
  for (let i = 1; i < swingLows.length; i++) {
    labels.push({
      time: swingLows[i].time,
      price: swingLows[i].price,
      label: swingLows[i].price > swingLows[i - 1].price ? "HL" : "LL",
      type: "low",
    });
  }
  return labels;
}

/* ───────────────── Fair Value Gaps (FVG) ───────────────── */

export interface FairValueGap {
  time: string;       // middle candle time
  top: number;
  bottom: number;
  direction: "bullish" | "bearish";
  filled: boolean;
}

export function detectFVGs(data: PriceBar[]): FairValueGap[] {
  const n = data.length;
  if (n < 3) return [];

  // Pre-compute suffix arrays for O(n) filled checks
  const suffixMinLow = new Array<number>(n);
  const suffixMaxHigh = new Array<number>(n);
  suffixMinLow[n - 1] = data[n - 1].low;
  suffixMaxHigh[n - 1] = data[n - 1].high;
  for (let i = n - 2; i >= 0; i--) {
    suffixMinLow[i] = Math.min(data[i].low, suffixMinLow[i + 1]);
    suffixMaxHigh[i] = Math.max(data[i].high, suffixMaxHigh[i + 1]);
  }

  const gaps: FairValueGap[] = [];
  for (let i = 0; i < n - 2; i++) {
    // Bullish FVG: candle[i].high < candle[i+2].low
    if (data[i].high < data[i + 2].low) {
      const filled = i + 3 < n && suffixMinLow[i + 3] <= data[i].high;
      gaps.push({
        time: data[i + 1].time,
        top: data[i + 2].low,
        bottom: data[i].high,
        direction: "bullish",
        filled,
      });
    }
    // Bearish FVG: candle[i].low > candle[i+2].high
    if (data[i].low > data[i + 2].high) {
      const filled = i + 3 < n && suffixMaxHigh[i + 3] >= data[i].low;
      gaps.push({
        time: data[i + 1].time,
        top: data[i].low,
        bottom: data[i + 2].high,
        direction: "bearish",
        filled,
      });
    }
  }
  return gaps;
}

/* ───────────────── Order Blocks ───────────────── */

export interface OrderBlock {
  time: string;
  top: number;
  bottom: number;
  direction: "bullish" | "bearish";
  mitigated: boolean;
}

export function detectOrderBlocks(data: PriceBar[], atrPeriod = 14): OrderBlock[] {
  const n = data.length;
  if (n < atrPeriod + 5) return [];
  const atrVals = computeATR(data, atrPeriod);
  const atrMap = new Map(atrVals.map(a => [a.time, a.value]));

  // Pre-compute suffix arrays for O(n) mitigation checks
  const suffixMinLow = new Array<number>(n);
  const suffixMaxHigh = new Array<number>(n);
  suffixMinLow[n - 1] = data[n - 1].low;
  suffixMaxHigh[n - 1] = data[n - 1].high;
  for (let i = n - 2; i >= 0; i--) {
    suffixMinLow[i] = Math.min(data[i].low, suffixMinLow[i + 1]);
    suffixMaxHigh[i] = Math.max(data[i].high, suffixMaxHigh[i + 1]);
  }

  const blocks: OrderBlock[] = [];

  for (let i = 1; i < n - 3; i++) {
    const atr = atrMap.get(data[i].time);
    if (!atr || atr <= 0) continue;

    // Bullish OB: last bearish candle before a strong bullish impulse (>2× ATR over next 3 bars)
    if (data[i].close < data[i].open) {
      let impulse = 0;
      for (let j = 1; j <= 3 && i + j < n; j++) impulse += data[i + j].close - data[i + j].open;
      if (impulse > atr * 2) {
        const mitigated = i + 4 < n && suffixMinLow[i + 4] < data[i].low;
        blocks.push({
          time: data[i].time,
          top: data[i].open,
          bottom: data[i].low,
          direction: "bullish",
          mitigated,
        });
      }
    }

    // Bearish OB: last bullish candle before a strong bearish impulse
    if (data[i].close > data[i].open) {
      let impulse = 0;
      for (let j = 1; j <= 3 && i + j < n; j++) impulse += data[i + j].open - data[i + j].close;
      if (impulse > atr * 2) {
        const mitigated = i + 4 < n && suffixMaxHigh[i + 4] > data[i].high;
        blocks.push({
          time: data[i].time,
          top: data[i].high,
          bottom: data[i].open,
          direction: "bearish",
          mitigated,
        });
      }
    }
  }
  return blocks;
}
