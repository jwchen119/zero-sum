import type { PriceBar } from "./api";
import {
  computeRSI,
  computeBollingerBands,
  computeEMA,
  computeMACD,
  computeATR,
  computeSMA,
  computeStochastic,
  computeOBV,
  computeIchimoku,
  computeADX,
} from "./indicators";

/* ───────────────────────── Types ───────────────────────── */

export interface CandlePattern {
  time: string;
  name: string;
  type: "bullish" | "bearish" | "neutral";
}

export interface TradingSetup {
  time: string;
  name: string;
  type: "bullish" | "bearish";
  confidence: "high" | "medium" | "low";
  description: string;
  divergence?: {
    price1: { time: string; value: number };
    price2: { time: string; value: number };
    indicator: "rsi" | "macd";
  };
}

/* ───────────────────────── Candle helpers ───────────────────────── */

function body(b: PriceBar): number {
  return Math.abs(b.close - b.open);
}
function range(b: PriceBar): number {
  return b.high - b.low;
}
function upperShadow(b: PriceBar): number {
  return b.high - Math.max(b.open, b.close);
}
function lowerShadow(b: PriceBar): number {
  return Math.min(b.open, b.close) - b.low;
}
function bullish(b: PriceBar): boolean {
  return b.close > b.open;
}

/* ───────────────── Candlestick Pattern Detection ───────────────── */

export function detectCandlePatterns(data: PriceBar[]): CandlePattern[] {
  const patterns: CandlePattern[] = [];

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];
    const r = range(bar);
    const bs = body(bar);
    if (r === 0) continue;
    const bodyRatio = bs / r;

    // ── Doji ──
    if (bodyRatio < 0.1) {
      patterns.push({ time: bar.time, name: "Doji", type: "neutral" });
      continue;
    }

    // ── Hammer (bullish reversal after red candle) ──
    if (
      i > 0 &&
      !bullish(data[i - 1]) &&
      lowerShadow(bar) > bs * 2 &&
      upperShadow(bar) < bs * 0.5 &&
      bodyRatio > 0.15
    ) {
      patterns.push({ time: bar.time, name: "Hammer", type: "bullish" });
      continue;
    }

    // ── Shooting Star (bearish reversal after green candle) ──
    if (
      i > 0 &&
      bullish(data[i - 1]) &&
      upperShadow(bar) > bs * 2 &&
      lowerShadow(bar) < bs * 0.5 &&
      bodyRatio > 0.15
    ) {
      patterns.push({ time: bar.time, name: "Shooting Star", type: "bearish" });
      continue;
    }

    // ── Inverted Hammer (bullish after red candle) ──
    if (
      i > 0 &&
      !bullish(data[i - 1]) &&
      upperShadow(bar) > bs * 2 &&
      lowerShadow(bar) < bs * 0.5 &&
      bodyRatio > 0.15
    ) {
      patterns.push({ time: bar.time, name: "Inv. Hammer", type: "bullish" });
      continue;
    }

    // ── Engulfing ──
    if (i > 0) {
      const prev = data[i - 1];
      if (
        !bullish(prev) &&
        bullish(bar) &&
        bar.open <= prev.close &&
        bar.close >= prev.open &&
        bs > body(prev) * 1.2
      ) {
        patterns.push({ time: bar.time, name: "Bull Engulf", type: "bullish" });
        continue;
      }
      if (
        bullish(prev) &&
        !bullish(bar) &&
        bar.open >= prev.close &&
        bar.close <= prev.open &&
        bs > body(prev) * 1.2
      ) {
        patterns.push({ time: bar.time, name: "Bear Engulf", type: "bearish" });
        continue;
      }
    }

    // ── Morning Star / Evening Star (3-candle) ──
    if (i >= 2) {
      const b0 = data[i - 2],
        b1 = data[i - 1],
        b2 = data[i];
      const r1 = range(b1) || 0.001;
      if (
        !bullish(b0) &&
        body(b0) / (range(b0) || 0.001) > 0.5 &&
        body(b1) / r1 < 0.3 &&
        bullish(b2) &&
        b2.close > (b0.open + b0.close) / 2
      ) {
        patterns.push({ time: b2.time, name: "Morning Star", type: "bullish" });
        continue;
      }
      if (
        bullish(b0) &&
        body(b0) / (range(b0) || 0.001) > 0.5 &&
        body(b1) / r1 < 0.3 &&
        !bullish(b2) &&
        b2.close < (b0.open + b0.close) / 2
      ) {
        patterns.push({ time: b2.time, name: "Evening Star", type: "bearish" });
        continue;
      }

      // ── Three White Soldiers (3 consecutive strong green candles) ──
      if (
        bullish(b0) && bullish(b1) && bullish(b2) &&
        body(b0) / (range(b0) || 0.001) > 0.5 &&
        body(b1) / (range(b1) || 0.001) > 0.5 &&
        body(b2) / (range(b2) || 0.001) > 0.5 &&
        b1.close > b0.close && b2.close > b1.close &&
        b1.open > b0.open && b2.open > b1.open
      ) {
        patterns.push({ time: b2.time, name: "3 White Soldiers", type: "bullish" });
        continue;
      }

      // ── Three Black Crows (3 consecutive strong red candles) ──
      if (
        !bullish(b0) && !bullish(b1) && !bullish(b2) &&
        body(b0) / (range(b0) || 0.001) > 0.5 &&
        body(b1) / (range(b1) || 0.001) > 0.5 &&
        body(b2) / (range(b2) || 0.001) > 0.5 &&
        b1.close < b0.close && b2.close < b1.close &&
        b1.open < b0.open && b2.open < b1.open
      ) {
        patterns.push({ time: b2.time, name: "3 Black Crows", type: "bearish" });
        continue;
      }
    }

    // ── Piercing Line (bullish 2-bar reversal) ──
    if (i > 0) {
      const prev = data[i - 1];
      if (
        !bullish(prev) &&
        bullish(bar) &&
        bar.open < prev.low &&
        bar.close > (prev.open + prev.close) / 2 &&
        bar.close < prev.open
      ) {
        patterns.push({ time: bar.time, name: "Piercing Line", type: "bullish" });
        continue;
      }

      // ── Dark Cloud Cover (bearish 2-bar reversal) ──
      if (
        bullish(prev) &&
        !bullish(bar) &&
        bar.open > prev.high &&
        bar.close < (prev.open + prev.close) / 2 &&
        bar.close > prev.open
      ) {
        patterns.push({ time: bar.time, name: "Dark Cloud", type: "bearish" });
        continue;
      }

      // ── Tweezer Bottom ──
      if (
        !bullish(prev) && bullish(bar) &&
        Math.abs(prev.low - bar.low) / (range(bar) || 0.001) < 0.05
      ) {
        patterns.push({ time: bar.time, name: "Tweezer Bottom", type: "bullish" });
        continue;
      }

      // ── Tweezer Top ──
      if (
        bullish(prev) && !bullish(bar) &&
        Math.abs(prev.high - bar.high) / (range(bar) || 0.001) < 0.05
      ) {
        patterns.push({ time: bar.time, name: "Tweezer Top", type: "bearish" });
        continue;
      }
    }

    // ── Dragonfly Doji (long lower shadow, no upper shadow) ──
    if (
      bodyRatio < 0.1 &&
      lowerShadow(bar) > r * 0.6 &&
      upperShadow(bar) < r * 0.1
    ) {
      patterns.push({ time: bar.time, name: "Dragonfly Doji", type: "bullish" });
      continue;
    }

    // ── Gravestone Doji (long upper shadow, no lower shadow) ──
    if (
      bodyRatio < 0.1 &&
      upperShadow(bar) > r * 0.6 &&
      lowerShadow(bar) < r * 0.1
    ) {
      patterns.push({ time: bar.time, name: "Gravestone Doji", type: "bearish" });
      continue;
    }
  }

  return patterns;
}

/* ───────────────── Multi-Indicator Setup Detection ───────────────── */

export function detectTradingSetups(data: PriceBar[]): TradingSetup[] {
  if (data.length < 50) return [];

  const setups: TradingSetup[] = [];
  const rsi = computeRSI(data, 14);
  const bb = computeBollingerBands(data, 20, 2);
  const macd = computeMACD(data, 12, 26, 9);
  const atr = computeATR(data, 14);
  const sma50 = computeSMA(data, 50);
  const sma200 = computeSMA(data, 200);
  const ema21 = computeEMA(data, 21);
  const stoch = computeStochastic(data);
  const ich = computeIchimoku(data);
  const adxData = computeADX(data);

  // Lookup maps
  const rsiM = new Map(rsi.map((v) => [v.time, v.value]));
  const bbM = new Map(bb.map((v) => [v.time, v]));
  const macdM = new Map(macd.map((v) => [v.time, v]));
  const atrM = new Map(atr.map((v) => [v.time, v.value]));
  const sma50M = new Map(sma50.map((v) => [v.time, v.value]));
  const sma200M = new Map(sma200.map((v) => [v.time, v.value]));
  const ema21M = new Map(ema21.map((v) => [v.time, v.value]));
  const stochM = new Map(stoch.map((v) => [v.time, v]));
  const ichM = new Map(ich.map((v) => [v.time, v]));
  const adxM = new Map(adxData.map((v) => [v.time, v]));

  const avgVol = (idx: number): number => {
    if (idx < 20) return data[idx].volume || 1;
    let s = 0;
    for (let j = idx - 19; j <= idx; j++) s += data[j].volume;
    return s / 20 || 1;
  };

  // Scan last 60 bars (skip warm-up period for indicators)
  const warmup = Math.max(50, Math.min(data.length - 1, 200));
  const start = Math.max(warmup, data.length - 60);

  for (let i = start; i < data.length; i++) {
    const bar = data[i];
    const prev = data[i - 1];
    const rv = rsiM.get(bar.time);
    const bv = bbM.get(bar.time);
    const mv = macdM.get(bar.time);
    const mp = macdM.get(prev.time);
    const s50 = sma50M.get(bar.time);
    const s200 = sma200M.get(bar.time);
    const s50p = sma50M.get(prev.time);
    const s200p = sma200M.get(prev.time);
    const e21 = ema21M.get(bar.time);
    const vol = bar.volume;
    const av = avgVol(i);
    const stochV = stochM.get(bar.time);
    const stochP = stochM.get(prev.time);
    const ichV = ichM.get(bar.time);
    const ichP = ichM.get(prev.time);
    const adxV = adxM.get(bar.time);
    const adxP = adxM.get(prev.time);

    // 1 ── Bollinger Band Squeeze Breakout ──
    if (bv) {
      const recent = bb.slice(-60);
      const bws = recent.map((b) => b.bandwidth).sort((a, b) => a - b);
      const q25 = bws[Math.floor(bws.length * 0.25)];
      if (bv.bandwidth <= q25) {
        if (bar.close > bv.upper && vol > av * 1.3) {
          setups.push({
            time: bar.time,
            name: "BB Squeeze Breakout ↑",
            type: "bullish",
            confidence: vol > av * 1.5 ? "high" : "medium",
            description: `Price broke above upper BB after squeeze. Vol ${(vol / av).toFixed(1)}× avg.`,
          });
        } else if (bar.close < bv.lower && vol > av * 1.3) {
          setups.push({
            time: bar.time,
            name: "BB Squeeze Breakout ↓",
            type: "bearish",
            confidence: vol > av * 1.5 ? "high" : "medium",
            description: `Price broke below lower BB after squeeze. Vol ${(vol / av).toFixed(1)}× avg.`,
          });
        }
      }
    }

    // 2 ── Mean Reversion (BB + RSI confluence) ──
    if (bv && rv !== undefined) {
      if (bar.close <= bv.lower && rv < 30) {
        setups.push({
          time: bar.time,
          name: "Oversold Bounce",
          type: "bullish",
          confidence: rv < 25 ? "high" : "medium",
          description: `At lower BB with RSI ${rv}. Potential mean-reversion bounce.`,
        });
      }
      if (bar.close >= bv.upper && rv > 70) {
        setups.push({
          time: bar.time,
          name: "Overbought Pullback",
          type: "bearish",
          confidence: rv > 75 ? "high" : "medium",
          description: `At upper BB with RSI ${rv}. Potential mean-reversion pullback.`,
        });
      }
    }

    // 3 ── Golden / Death Cross ──
    if (s50 && s200 && s50p && s200p) {
      if (s50p < s200p && s50 > s200) {
        setups.push({
          time: bar.time,
          name: "Golden Cross",
          type: "bullish",
          confidence: vol > av * 1.5 ? "high" : "medium",
          description: "SMA 50 crossed above SMA 200 — major bullish trend signal.",
        });
      }
      if (s50p > s200p && s50 < s200) {
        setups.push({
          time: bar.time,
          name: "Death Cross",
          type: "bearish",
          confidence: vol > av * 1.5 ? "high" : "medium",
          description: "SMA 50 crossed below SMA 200 — major bearish trend signal.",
        });
      }
    }

    // 4 ── MACD Cross ──
    if (mv && mp) {
      if (mp.macd < mp.signal && mv.macd > mv.signal) {
        setups.push({
          time: bar.time,
          name: "MACD Bull Cross",
          type: "bullish",
          confidence: s200 && bar.close > s200 ? "high" : "medium",
          description: `MACD crossed above signal. Histogram ${mv.histogram.toFixed(2)}.`,
        });
      }
      if (mp.macd > mp.signal && mv.macd < mv.signal) {
        setups.push({
          time: bar.time,
          name: "MACD Bear Cross",
          type: "bearish",
          confidence: s200 && bar.close < s200 ? "high" : "medium",
          description: `MACD crossed below signal. Histogram ${mv.histogram.toFixed(2)}.`,
        });
      }
    }

    // 5 ── EMA 21 Pullback in Trend ──
    if (e21 && s200) {
      const pct = Math.abs(bar.close - e21) / e21;
      if (
        bar.close > s200 &&
        pct < 0.015 &&
        bar.low <= e21 &&
        bar.close > e21 &&
        rv !== undefined &&
        rv > 40 &&
        rv < 55
      ) {
        setups.push({
          time: bar.time,
          name: "EMA Pullback ↑",
          type: "bullish",
          confidence: "medium",
          description: `Price pulled back to 21 EMA in uptrend. RSI ${rv}.`,
        });
      }
      if (
        bar.close < s200 &&
        pct < 0.015 &&
        bar.high >= e21 &&
        bar.close < e21 &&
        rv !== undefined &&
        rv > 50 &&
        rv < 65
      ) {
        setups.push({
          time: bar.time,
          name: "EMA Pullback ↓",
          type: "bearish",
          confidence: "medium",
          description: `Price pulled back to 21 EMA in downtrend. RSI ${rv}.`,
        });
      }
    }

    // 6 ── Volume Climax Reversal ──
    if (vol > av * 3 && i + 2 < data.length) {
      const next = data[i + 1];
      const nextNext = data[i + 2];
      const flipped =
        (bullish(bar) && !bullish(next)) || (!bullish(bar) && bullish(next));
      const confirmed = flipped && (
        (bullish(bar) && nextNext.close < next.close) || (!bullish(bar) && nextNext.close > next.close)
      );
      if (flipped) {
        setups.push({
          time: data[i + 2].time,
          name: "Vol Climax Reversal",
          type: bullish(bar) ? "bearish" : "bullish",
          confidence: confirmed ? "high" : vol > av * 4 ? "high" : "medium",
          description: `Extreme volume (${(vol / av).toFixed(1)}× avg) with reversal signal${confirmed ? " — confirmed" : " — watch next bar"}.`,
        });
      }
    }

    // 7 ── RSI Divergence ──
    if (rv !== undefined) {
      for (let lb = 10; lb <= 30; lb += 5) {
        if (i - lb < 0) break;
        const priorRSI = rsiM.get(data[i - lb].time);
        if (priorRSI === undefined) continue;

        // Bullish: lower price low, higher RSI
        let isLow = true;
        for (let k = Math.max(0, i - 3); k <= Math.min(data.length - 2, i + 1); k++) {
          if (k !== i && data[k].low < bar.low) isLow = false;
        }
        if (isLow && bar.low < data[i - lb].low && rv > priorRSI && rv < 40) {
          setups.push({
            time: bar.time,
            name: "RSI Bull Divergence",
            type: "bullish",
            confidence: "high",
            description: `Price lower low but RSI higher low (${priorRSI}→${rv}). Strong reversal signal.`,
            divergence: {
              price1: { time: data[i - lb].time, value: data[i - lb].low },
              price2: { time: bar.time, value: bar.low },
              indicator: "rsi",
            },
          });
          break;
        }

        // Bearish: higher price high, lower RSI
        let isHigh = true;
        for (let k = Math.max(0, i - 3); k <= Math.min(data.length - 2, i + 1); k++) {
          if (k !== i && data[k].high > bar.high) isHigh = false;
        }
        if (isHigh && bar.high > data[i - lb].high && rv < priorRSI && rv > 60) {
          setups.push({
            time: bar.time,
            name: "RSI Bear Divergence",
            type: "bearish",
            confidence: "high",
            description: `Price higher high but RSI lower high (${priorRSI}→${rv}). Strong reversal signal.`,
            divergence: {
              price1: { time: data[i - lb].time, value: data[i - lb].high },
              price2: { time: bar.time, value: bar.high },
              indicator: "rsi",
            },
          });
          break;
        }
      }
    }

    // 8 ── MACD Divergence ──
    if (mv) {
      for (let lb = 10; lb <= 30; lb += 5) {
        if (i - lb < 0) break;
        const priorMACD = macdM.get(data[i - lb].time);
        if (!priorMACD) continue;

        let isLowM = true;
        for (let k = Math.max(0, i - 3); k <= Math.min(data.length - 2, i + 1); k++) {
          if (k !== i && data[k].low < bar.low) isLowM = false;
        }
        if (isLowM && bar.low < data[i - lb].low && mv.histogram > priorMACD.histogram && mv.histogram < 0) {
          setups.push({
            time: bar.time,
            name: "MACD Bull Divergence",
            type: "bullish",
            confidence: "high",
            description: `Price lower low but MACD histogram higher (${priorMACD.histogram.toFixed(2)}→${mv.histogram.toFixed(2)}). Bearish momentum fading.`,
            divergence: {
              price1: { time: data[i - lb].time, value: data[i - lb].low },
              price2: { time: bar.time, value: bar.low },
              indicator: "macd",
            },
          });
          break;
        }

        let isHighM = true;
        for (let k = Math.max(0, i - 3); k <= Math.min(data.length - 2, i + 1); k++) {
          if (k !== i && data[k].high > bar.high) isHighM = false;
        }
        if (isHighM && bar.high > data[i - lb].high && mv.histogram < priorMACD.histogram && mv.histogram > 0) {
          setups.push({
            time: bar.time,
            name: "MACD Bear Divergence",
            type: "bearish",
            confidence: "high",
            description: `Price higher high but MACD histogram lower (${priorMACD.histogram.toFixed(2)}→${mv.histogram.toFixed(2)}). Bullish momentum fading.`,
            divergence: {
              price1: { time: data[i - lb].time, value: data[i - lb].high },
              price2: { time: bar.time, value: bar.high },
              indicator: "macd",
            },
          });
          break;
        }
      }
    }

    // 9 ── Stochastic Cross ──
    if (stochV && stochP) {
      if (stochP.k < stochP.d && stochV.k > stochV.d && stochV.k < 30) {
        setups.push({
          time: bar.time,
          name: "Stoch Bull Cross",
          type: "bullish",
          confidence: stochV.k < 20 ? "high" : "medium",
          description: `%K crossed above %D in oversold zone (%K=${stochV.k.toFixed(0)}).`,
        });
      }
      if (stochP.k > stochP.d && stochV.k < stochV.d && stochV.k > 70) {
        setups.push({
          time: bar.time,
          name: "Stoch Bear Cross",
          type: "bearish",
          confidence: stochV.k > 80 ? "high" : "medium",
          description: `%K crossed below %D in overbought zone (%K=${stochV.k.toFixed(0)}).`,
        });
      }
    }

    // 10 ── Ichimoku TK Cross + Kumo Breakout ──
    if (ichV && ichP) {
      // TK Cross (Tenkan/Kijun)
      if (ichP.tenkan < ichP.kijun && ichV.tenkan > ichV.kijun) {
        const aboveCloud = bar.close > Math.max(ichV.senkouA, ichV.senkouB);
        setups.push({
          time: bar.time,
          name: "Ichimoku TK Bull Cross",
          type: "bullish",
          confidence: aboveCloud ? "high" : "medium",
          description: `Tenkan crossed above Kijun${aboveCloud ? " above the cloud — strong bullish signal" : " — watch for cloud confirmation"}.`,
        });
      }
      if (ichP.tenkan > ichP.kijun && ichV.tenkan < ichV.kijun) {
        const belowCloud = bar.close < Math.min(ichV.senkouA, ichV.senkouB);
        setups.push({
          time: bar.time,
          name: "Ichimoku TK Bear Cross",
          type: "bearish",
          confidence: belowCloud ? "high" : "medium",
          description: `Tenkan crossed below Kijun${belowCloud ? " below the cloud — strong bearish signal" : " — watch for cloud confirmation"}.`,
        });
      }
      // Kumo Breakout
      const prevAboveCloud = prev.close > Math.max(ichP.senkouA, ichP.senkouB);
      const prevBelowCloud = prev.close < Math.min(ichP.senkouA, ichP.senkouB);
      const nowAboveCloud = bar.close > Math.max(ichV.senkouA, ichV.senkouB);
      const nowBelowCloud = bar.close < Math.min(ichV.senkouA, ichV.senkouB);
      if (!prevAboveCloud && nowAboveCloud) {
        setups.push({
          time: bar.time,
          name: "Kumo Breakout ↑",
          type: "bullish",
          confidence: ichV.senkouA > ichV.senkouB ? "high" : "medium",
          description: `Price broke above the Ichimoku cloud — bullish trend initiation.`,
        });
      }
      if (!prevBelowCloud && nowBelowCloud) {
        setups.push({
          time: bar.time,
          name: "Kumo Breakout ↓",
          type: "bearish",
          confidence: ichV.senkouA < ichV.senkouB ? "high" : "medium",
          description: `Price broke below the Ichimoku cloud — bearish trend initiation.`,
        });
      }
    }

    // 11 ── ADX Trend Start ──
    if (adxV && adxP) {
      if (adxP.adx < 25 && adxV.adx >= 25) {
        const diBull = adxV.plusDI > adxV.minusDI;
        setups.push({
          time: bar.time,
          name: diBull ? "ADX Trend Start ↑" : "ADX Trend Start ↓",
          type: diBull ? "bullish" : "bearish",
          confidence: adxV.adx > 30 ? "high" : "medium",
          description: `ADX crossed above 25 (${adxV.adx.toFixed(0)}) — new trend emerging. ${diBull ? "+DI leads" : "-DI leads"}.`,
        });
      }
    }
  }

  return setups;
}
