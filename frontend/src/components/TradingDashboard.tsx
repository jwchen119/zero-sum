"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { fetchPrices, type PriceBar } from "@/lib/api";
import { useTradeJournal } from "@/lib/useTradeJournal";
import TradeJournal from "@/components/TradeJournal";
import {
  computeRSI,
  computeMACD,
  computeBollingerBands,
  computeStochastic,
  computeATR,
  computeEMA,
  computeSMA,
  computeParabolicSAR,
  detectSupportResistance,
  detectSwingPoints,
  computeFibonacciLevels,
  computeIchimoku,
  computeADX,
  computeVWAP,
  type SRLevel,
} from "@/lib/indicators";
import { detectTradingSetups, type TradingSetup } from "@/lib/setups";
import { TECH_COMPARISON_BENCHMARKS } from "@/lib/benchmarks";

/* ?????? WSJ tokens (dark-mode aware via CSS vars) ?????? */
const INK = "var(--wsj-ink, #1a1a1a)";
const WHT = "var(--wsj-white, #f5f0e8)";
const GRY = "var(--wsj-grey, #c8c8c8)";
const T2 = "var(--wsj-text, #555555)";
const TM = "var(--wsj-muted, #888888)";
const BULL = "var(--wsj-gain, #2e7d32)";
const BEAR = "var(--wsj-loss, #c62828)";
const NEUT = "#b08030";
const serif = "var(--font-serif), Georgia, serif";
const mono = "var(--font-mono), monospace";

/* ???????????????????????????????????Analysis engine ???????????????????????????????????*/

interface IndicatorReading {
  name: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral";
  weight: number; // 1-3
  detail: string;
}

interface ActionLevel {
  label: string;
  price: number;
  pct: string; // from current
  color: string;
}

interface AnalysisResult {
  price: number;
  change1d: number;
  change1dPct: number;
  change5d: number;
  change5dPct: number;
  change20d: number;
  change20dPct: number;
  readings: IndicatorReading[];
  score: number; // -100..+100
  verdict: string;
  verdictColor: string;
  bias: "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL";
  levels: ActionLevel[];
  riskRewardNotes: string[];
  volatility: { atr: number; atrPct: number; regime: string };
  trendPhase: string;
  setups: TradingSetup[];
  perfStats: {
    maxDrawdown: number;       // % from peak
    maxDrawdownDays: number;   // duration of deepest drawdown
    bestDay: number;           // % gain
    worstDay: number;          // % loss
    winRate: number;           // % of up days
    avgGain: number;           // avg % on up days
    avgLoss: number;           // avg % on down days
    sharpeApprox: number;      // annualized risk-adjusted return approximation
    totalReturn: number;       // % over full period
    volatilityAnn: number;     // annualized std dev of daily returns %
  };
  equityCurve: number[];     // cumulative equity starting at 100
  drawdownCurve: number[];   // drawdown % from peak (negative values)
}

function round(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function analyze(data: PriceBar[]): AnalysisResult | null {
  if (data.length < 50) return null;

  const last = data[data.length - 1];
  const price = last.close;
  const prev = data[data.length - 2];
  const d5 = data[data.length - 6] ?? prev;
  const d20 = data[data.length - 21] ?? d5;

  // Indicators
  const rsi = computeRSI(data, 14);
  const macd = computeMACD(data);
  const bb = computeBollingerBands(data, 20, 2);
  const stoch = computeStochastic(data);
  const atr = computeATR(data, 14);
  const ema8 = computeEMA(data, 8);
  const ema21 = computeEMA(data, 21);
  const hasSma50 = data.length >= 50;
  const hasSma200 = data.length >= 200;
  const sma50 = hasSma50 ? computeSMA(data, 50) : [];
  const sma200 = hasSma200 ? computeSMA(data, 200) : [];
  const sar = computeParabolicSAR(data);
  const sr = detectSupportResistance(data);
  const sw = detectSwingPoints(data, Math.min(120, data.length));
  const setups = detectTradingSetups(data);
  const ich = computeIchimoku(data);
  const adxData = computeADX(data);
  const vwapData = computeVWAP(data);

  const rsiV = rsi.length ? rsi[rsi.length - 1].value : 50;
  const macdV = macd.length ? macd[macd.length - 1] : null;
  const bbV = bb.length ? bb[bb.length - 1] : null;
  const stochV = stoch.length ? stoch[stoch.length - 1] : null;
  const atrV = atr.length ? atr[atr.length - 1].value : 0;
  const ema8V = ema8.length ? ema8[ema8.length - 1].value : price;
  const ema21V = ema21.length ? ema21[ema21.length - 1].value : price;
  const sma50V = sma50.length ? sma50[sma50.length - 1].value : null;
  const sma200V = sma200.length ? sma200[sma200.length - 1].value : null;
  const sarV = sar.length ? sar[sar.length - 1] : null;

  const readings: IndicatorReading[] = [];

  // 1. RSI
  readings.push({
    name: "RSI (14)",
    value: rsiV.toFixed(1),
    signal: rsiV < 30 ? "bullish" : rsiV > 70 ? "bearish" : rsiV < 45 ? "bullish" : rsiV > 55 ? "bearish" : "neutral",
    weight: rsiV < 25 || rsiV > 75 ? 3 : rsiV < 30 || rsiV > 70 ? 2 : 1,
    detail: rsiV < 30 ? "Oversold ??reversal likely" : rsiV > 70 ? "Overbought ??pullback likely" : `Neutral zone (${rsiV.toFixed(0)})`,
  });

  // 2. MACD
  if (macdV) {
    const cross = macdV.macd > macdV.signal;
    const histRising = macd.length > 1 && macdV.histogram > macd[macd.length - 2].histogram;
    readings.push({
      name: "MACD",
      value: `${macdV.macd.toFixed(2)} / ${macdV.signal.toFixed(2)}`,
      signal: cross ? "bullish" : "bearish",
      weight: (cross && histRising) || (!cross && !histRising) ? 2 : 1,
      detail: cross
        ? histRising ? "Above signal, momentum accelerating" : "Above signal, momentum fading"
        : histRising ? "Below signal, momentum recovering" : "Below signal, momentum weakening",
    });
  }

  // 3. Bollinger Bands position
  if (bbV) {
    const pctB = (price - bbV.lower) / (bbV.upper - bbV.lower);
    readings.push({
      name: "Bollinger %B",
      value: (pctB * 100).toFixed(0) + "%",
      signal: pctB < 0.15 ? "bullish" : pctB > 0.85 ? "bearish" : "neutral",
      weight: pctB < 0.05 || pctB > 0.95 ? 3 : pctB < 0.15 || pctB > 0.85 ? 2 : 1,
      detail: pctB < 0.15 ? "Near lower band ??oversold" : pctB > 0.85 ? "Near upper band ??overbought" : `Mid-band (${(pctB * 100).toFixed(0)}%)`,
    });
  }

  // 4. Stochastic
  if (stochV) {
    readings.push({
      name: "Stochastic",
      value: `%K ${stochV.k.toFixed(0)} / %D ${stochV.d.toFixed(0)}`,
      signal: stochV.k < 20 ? "bullish" : stochV.k > 80 ? "bearish" : stochV.k > stochV.d ? "bullish" : "bearish",
      weight: (stochV.k < 20 || stochV.k > 80) ? 2 : 1,
      detail: stochV.k < 20 ? "Oversold territory" : stochV.k > 80 ? "Overbought territory" : stochV.k > stochV.d ? "%K above %D, upward momentum" : "%K below %D, downward momentum",
    });
  }

  // 5. EMA trend
  const emaBull = ema8V > ema21V;
  readings.push({
    name: "EMA 8/21",
    value: emaBull ? "Bullish" : "Bearish",
    signal: emaBull ? "bullish" : "bearish",
    weight: 2,
    detail: emaBull ? `EMA 8 ($${ema8V.toFixed(2)}) > EMA 21 ($${ema21V.toFixed(2)})` : `EMA 8 ($${ema8V.toFixed(2)}) < EMA 21 ($${ema21V.toFixed(2)})`,
  });

  // 6. Price vs SMA 50
  const above50 = sma50V !== null ? price > sma50V : null;
  if (sma50V !== null) {
    readings.push({
      name: "SMA 50",
      value: above50 ? "Above" : "Below",
      signal: above50 ? "bullish" : "bearish",
      weight: 2,
      detail: `Price ${above50 ? "above" : "below"} SMA 50 ($${sma50V.toFixed(2)}) by ${(((price - sma50V) / sma50V) * 100).toFixed(1)}%`,
    });
  }

  // 7. Price vs SMA 200
  const above200 = sma200V !== null ? price > sma200V : null;
  if (sma200V !== null) {
    readings.push({
      name: "SMA 200",
      value: above200 ? "Above" : "Below",
      signal: above200 ? "bullish" : "bearish",
      weight: 3,
      detail: `Price ${above200 ? "above" : "below"} SMA 200 ($${sma200V.toFixed(2)}) by ${(((price - sma200V) / sma200V) * 100).toFixed(1)}%`,
    });
  }

  // 8. Parabolic SAR
  if (sarV) {
    readings.push({
      name: "Parabolic SAR",
      value: sarV.trend === "up" ? "Bullish" : "Bearish",
      signal: sarV.trend === "up" ? "bullish" : "bearish",
      weight: 1,
      detail: `SAR at $${sarV.value.toFixed(2)} ??${sarV.trend === "up" ? "trailing stop below" : "trailing stop above"}`,
    });
  }

  // 9. Volume trend
  const volAvg20 = data.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
  const volAvg5 = data.slice(-5).reduce((s, d) => s + d.volume, 0) / 5;
  const volSurge = volAvg5 / volAvg20;
  readings.push({
    name: "Volume",
    value: volSurge.toFixed(2) + "? avg",
    signal: volSurge > 1.3 && price > prev.close ? "bullish" : volSurge > 1.3 && price < prev.close ? "bearish" : "neutral",
    weight: volSurge > 1.5 ? 2 : 1,
    detail: volSurge > 1.5 ? "Strong volume surge ??confirms move" : volSurge > 1.2 ? "Above-average activity" : "Normal volume",
  });

  // 10. Turbulent Waves ??count EMAs (20-200, step 10) below/above price
  let wavesBelow = 0;
  let wavesAbove = 0;
  const waveTotal = Math.min(19, Math.floor((Math.min(data.length, 200) - 20) / 10) + 1);
  for (let wp = 20; wp <= 200; wp += 10) {
    if (data.length < wp + 5) break;
    const wEma = computeEMA(data, wp);
    if (wEma.length) {
      const wV = wEma[wEma.length - 1].value;
      if (price > wV) wavesBelow++;
      else wavesAbove++;
    }
  }
  if (waveTotal >= 5) {
    const wPct = wavesBelow / waveTotal;
    readings.push({
      name: "Turbulent Waves",
      value: `${wavesBelow}/${waveTotal} below`,
      signal: wPct >= 0.75 ? "bullish" : wPct <= 0.25 ? "bearish" : "neutral",
      weight: wPct >= 0.9 || wPct <= 0.1 ? 3 : wPct >= 0.75 || wPct <= 0.25 ? 2 : 1,
      detail: wPct >= 0.9 ? "Price above almost all wave layers ??strong uptrend support"
        : wPct >= 0.75 ? "Price above most wave layers ??bullish support zone"
        : wPct <= 0.1 ? "Price below almost all wave layers ??strong downtrend resistance"
        : wPct <= 0.25 ? "Price below most wave layers ??bearish resistance zone"
        : `Price within the wave layers ??${wavesBelow} support, ${wavesAbove} resistance`,
    });
  }

  // 11. Ichimoku Cloud
  if (ich.length) {
    const lastIch = ich[ich.length - 1];
    const aboveCloud = price > Math.max(lastIch.senkouA, lastIch.senkouB);
    const belowCloud = price < Math.min(lastIch.senkouA, lastIch.senkouB);
    const tkCross = lastIch.tenkan > lastIch.kijun;
    const cloudBull = lastIch.senkouA > lastIch.senkouB;
    readings.push({
      name: "Ichimoku",
      value: aboveCloud ? "Above Cloud" : belowCloud ? "Below Cloud" : "In Cloud",
      signal: aboveCloud && tkCross ? "bullish" : belowCloud && !tkCross ? "bearish" : "neutral",
      weight: (aboveCloud || belowCloud) ? 2 : 1,
      detail: aboveCloud
        ? `Above ${cloudBull ? "bullish" : "bearish"} cloud. TK ${tkCross ? "bullish" : "bearish"} cross.`
        : belowCloud
          ? `Below ${cloudBull ? "bullish" : "bearish"} cloud. TK ${tkCross ? "bullish" : "bearish"} cross.`
          : `Inside cloud ??consolidation zone. TK ${tkCross ? "bullish" : "bearish"} cross.`,
    });
  }

  // 12. ADX (Trend Strength)
  if (adxData.length) {
    const lastADX = adxData[adxData.length - 1];
    const trending = lastADX.adx > 25;
    const diBull = lastADX.plusDI > lastADX.minusDI;
    readings.push({
      name: "ADX",
      value: `${lastADX.adx.toFixed(0)} (${trending ? "Trending" : "Ranging"})`,
      signal: trending ? (diBull ? "bullish" : "bearish") : "neutral",
      weight: lastADX.adx > 40 ? 3 : lastADX.adx > 25 ? 2 : 1,
      detail: trending
        ? `Strong trend (ADX ${lastADX.adx.toFixed(0)}). +DI ${lastADX.plusDI.toFixed(0)} / -DI ${lastADX.minusDI.toFixed(0)} ??${diBull ? "bulls" : "bears"} in control.`
        : `Weak trend / ranging (ADX ${lastADX.adx.toFixed(0)}). Avoid trend-following strategies.`,
    });
  }

  // 13. VWAP
  if (vwapData.length) {
    const vwapV = vwapData[vwapData.length - 1].value;
    const aboveVWAP = price > vwapV;
    readings.push({
      name: "VWAP",
      value: `$${vwapV.toFixed(2)}`,
      signal: aboveVWAP ? "bullish" : "bearish",
      weight: 1,
      detail: aboveVWAP
        ? `Price above VWAP ??institutional demand zone`
        : `Price below VWAP ??institutional supply zone`,
    });
  }

  // Score: weighted sum
  let bullW = 0,
    bearW = 0,
    totalW = 0;
  for (const r of readings) {
    totalW += r.weight;
    if (r.signal === "bullish") bullW += r.weight;
    if (r.signal === "bearish") bearW += r.weight;
  }
  const score = totalW > 0 ? round(((bullW - bearW) / totalW) * 100) : 0;

  // Bias
  let bias: AnalysisResult["bias"];
  if (score >= 50) bias = "STRONG BUY";
  else if (score >= 20) bias = "BUY";
  else if (score <= -50) bias = "STRONG SELL";
  else if (score <= -20) bias = "SELL";
  else bias = "NEUTRAL";

  const verdictColor = bias.includes("BUY") ? BULL : bias.includes("SELL") ? BEAR : NEUT;

  // Verdict sentence
  const trendWord = above200 === true ? "uptrend" : above200 === false ? "downtrend" : above50 === true ? "uptrend" : above50 === false ? "downtrend" : "transitioning";
  const momentumWord = macdV && macdV.histogram > 0 ? "positive" : "negative";
  const verdict =
    bias === "STRONG BUY"
      ? `Strong bullish confluence — ${readings.filter((r) => r.signal === "bullish").length}/${readings.length} indicators bullish. In ${trendWord} with ${momentumWord} momentum.`
      : bias === "BUY"
        ? `Moderately bullish — ${trendWord} with ${momentumWord} momentum. Watch for confirmation from volume.`
        : bias === "STRONG SELL"
          ? `Strong bearish confluence — ${readings.filter((r) => r.signal === "bearish").length}/${readings.length} indicators bearish. In ${trendWord} with ${momentumWord} momentum.`
          : bias === "SELL"
            ? `Moderately bearish — ${trendWord} with ${momentumWord} momentum. Risk of further downside.`
            : `Mixed signals — no clear directional bias. Wait for a decisive breakout.`;

  // Actionable levels
  const levels: ActionLevel[] = [];
  const fmtPct = (target: number) => {
    const pct = ((target - price) / price) * 100;
    return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
  };

  // Stop-loss: 2? ATR below (long) or above (short)
  const stopLong = round(price - 2 * atrV);
  const stopShort = round(price + 2 * atrV);

  if (bias.includes("BUY") || bias === "NEUTRAL") {
    levels.push({ label: "Stop-Loss (Long)", price: stopLong, pct: fmtPct(stopLong), color: BEAR });
  }
  if (bias.includes("SELL") || bias === "NEUTRAL") {
    levels.push({ label: "Stop-Loss (Short)", price: stopShort, pct: fmtPct(stopShort), color: BEAR });
  }

  // Nearest support/resistance
  const supports = sr.filter((l) => l.type === "support").sort((a, b) => b.price - a.price);
  const resistances = sr.filter((l) => l.type === "resistance").sort((a, b) => a.price - b.price);

  if (supports.length > 0) {
    levels.push({ label: `Support (x${supports[0].touches})`, price: supports[0].price, pct: fmtPct(supports[0].price), color: BULL });
  }
  if (supports.length > 1) {
    levels.push({ label: `Support 2 (x${supports[1].touches})`, price: supports[1].price, pct: fmtPct(supports[1].price), color: BULL });
  }
  if (resistances.length > 0) {
    levels.push({ label: `Resistance (x${resistances[0].touches})`, price: resistances[0].price, pct: fmtPct(resistances[0].price), color: BEAR });
  }
  if (resistances.length > 1) {
    levels.push({ label: `Resistance 2 (x${resistances[1].touches})`, price: resistances[1].price, pct: fmtPct(resistances[1].price), color: BEAR });
  }

  // Fibonacci targets
  if (sw) {
    const fibs = computeFibonacciLevels(sw.high, sw.low);
    const fib618 = fibs.find((f) => f.ratio === 0.618);
    const fib382 = fibs.find((f) => f.ratio === 0.382);
    if (fib618) levels.push({ label: "Fib 61.8%", price: fib618.price, pct: fmtPct(fib618.price), color: "#7b1fa2" });
    if (fib382) levels.push({ label: "Fib 38.2%", price: fib382.price, pct: fmtPct(fib382.price), color: "#7b1fa2" });
  }

  // Take-profit: nearest resistance for longs, nearest support for shorts
  if (bias.includes("BUY") && resistances.length > 0) {
    const tp = resistances[0].price;
    const rr = (tp - price) / (price - stopLong);
    levels.push({ label: `Take-Profit ??R:R ${rr.toFixed(1)}`, price: tp, pct: fmtPct(tp), color: BULL });
  }
  if (bias.includes("SELL") && supports.length > 0) {
    const tp = supports[0].price;
    const rr = (price - tp) / (stopShort - price);
    levels.push({ label: `Take-Profit ??R:R ${rr.toFixed(1)}`, price: tp, pct: fmtPct(tp), color: BULL });
  }

  // SAR trailing stop
  if (sarV) {
    levels.push({ label: "SAR Trailing Stop", price: sarV.value, pct: fmtPct(sarV.value), color: TM });
  }

  // Key MAs
  if (sma50V !== null) levels.push({ label: "SMA 50", price: sma50V, pct: fmtPct(sma50V), color: TM });
  if (sma200V !== null) levels.push({ label: "SMA 200", price: sma200V, pct: fmtPct(sma200V), color: TM });

  // Volatility
  const atrPct = (atrV / price) * 100;
  const regime = atrPct > 3 ? "High volatility" : atrPct > 1.5 ? "Normal volatility" : "Low volatility";

  // Trend phase
  let trendPhase: string;
  if (above200 === true && above50 === true && emaBull && price > ema8V) trendPhase = "Strong Uptrend";
  else if (above200 === true && above50 === true) trendPhase = "Uptrend";
  else if (above200 === true && above50 === false) trendPhase = "Uptrend Weakening";
  else if (above200 === false && above50 === false && !emaBull && price < ema8V) trendPhase = "Strong Downtrend";
  else if (above200 === false && above50 === false) trendPhase = "Downtrend";
  else if (above200 === false && above50 !== false) trendPhase = "Downtrend Recovery";
  else if (above200 === null && above50 === true && emaBull) trendPhase = "Uptrend";
  else if (above200 === null && above50 === false && !emaBull) trendPhase = "Downtrend";
  else trendPhase = "Transitioning";

  // Risk/reward notes
  const riskRewardNotes: string[] = [];
  if (atrPct > 3) riskRewardNotes.push("High ATR ??use wider stops or reduce position size.");
  if (volSurge > 2) riskRewardNotes.push("Volume spike ??potential climax or breakout, watch next bar for confirmation.");
  if (rsiV < 25) riskRewardNotes.push("Deeply oversold ??contrarian buy zone but don't catch a falling knife without support.");
  if (rsiV > 75) riskRewardNotes.push("Deeply overbought ??fading momentum likely, consider scaling out.");
  const highSetups = setups.filter((s) => s.confidence === "high");
  if (highSetups.length) riskRewardNotes.push(`${highSetups.length} high-confidence setup(s) detected recently ??see chart markers.`);
  if (supports.length && Math.abs(price - supports[0].price) / price < 0.02) {
    riskRewardNotes.push("Price is near support ??good risk/reward for long entry with tight stop.");
  }
  if (resistances.length && Math.abs(price - resistances[0].price) / price < 0.02) {
    riskRewardNotes.push("Price is near resistance ??wait for breakout or short with tight stop above.");
  }
  if (bbV && bbV.bandwidth < 5) riskRewardNotes.push("BB squeeze in progress ??expect a volatility expansion (breakout imminent).");
  if (riskRewardNotes.length === 0) riskRewardNotes.push("No special conditions. Trade with normal position sizing.");

  // ???? Performance statistics over the data period ????
  const dailyReturns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    dailyReturns.push(((data[i].close - data[i - 1].close) / data[i - 1].close) * 100);
  }
  const upDays = dailyReturns.filter((r) => r > 0);
  const downDays = dailyReturns.filter((r) => r < 0);
  const winRate = dailyReturns.length > 0 ? (upDays.length / dailyReturns.length) * 100 : 0;
  const avgGain = upDays.length > 0 ? upDays.reduce((s, v) => s + v, 0) / upDays.length : 0;
  const avgLoss = downDays.length > 0 ? downDays.reduce((s, v) => s + v, 0) / downDays.length : 0;
  const bestDay = dailyReturns.length > 0 ? Math.max(...dailyReturns) : 0;
  const worstDay = dailyReturns.length > 0 ? Math.min(...dailyReturns) : 0;
  const totalReturn = data.length > 1 ? ((data[data.length - 1].close - data[0].close) / data[0].close) * 100 : 0;

  // Drawdown calculation
  let peak = data[0].close;
  let maxDD = 0;
  let maxDDDays = 0;
  let ddStart = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i].close > peak) {
      peak = data[i].close;
      ddStart = i;
    }
    const dd = ((peak - data[i].close) / peak) * 100;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDDays = i - ddStart;
    }
  }

  // Annualized volatility & Sharpe approximation
  const meanReturn = dailyReturns.length > 0 ? dailyReturns.reduce((s, v) => s + v, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 1 ? dailyReturns.reduce((s, v) => s + (v - meanReturn) ** 2, 0) / (dailyReturns.length - 1) : 0;
  const dailyStd = Math.sqrt(variance);
  const volatilityAnn = dailyStd * Math.sqrt(252);
  const sharpeApprox = dailyStd > 0 ? (meanReturn * 252) / (dailyStd * Math.sqrt(252)) : 0;

  const perfStats = {
    maxDrawdown: round(maxDD),
    maxDrawdownDays: maxDDDays,
    bestDay: round(bestDay),
    worstDay: round(worstDay),
    winRate: round(winRate),
    avgGain: round(avgGain),
    avgLoss: round(avgLoss),
    sharpeApprox: round(sharpeApprox),
    totalReturn: round(totalReturn),
    volatilityAnn: round(volatilityAnn),
  };

  // Equity curve (starting at 100) and drawdown curve
  const equityCurve: number[] = [100];
  for (let i = 1; i < data.length; i++) {
    equityCurve.push(equityCurve[i - 1] * (data[i].close / data[i - 1].close));
  }
  let eqPeak = 100;
  const drawdownCurve: number[] = equityCurve.map(v => {
    eqPeak = Math.max(eqPeak, v);
    return ((v - eqPeak) / eqPeak) * 100;
  });

  return {
    price,
    change1d: round(price - prev.close),
    change1dPct: round(((price - prev.close) / prev.close) * 100),
    change5d: round(price - d5.close),
    change5dPct: round(((price - d5.close) / d5.close) * 100),
    change20d: round(price - d20.close),
    change20dPct: round(((price - d20.close) / d20.close) * 100),
    readings,
    score,
    verdict,
    verdictColor,
    bias,
    levels: levels.sort((a, b) => b.price - a.price),
    riskRewardNotes,
    volatility: { atr: atrV, atrPct: round(atrPct), regime },
    trendPhase,
    setups,
    perfStats,
    equityCurve,
    drawdownCurve,
  };
}

/* ???????????????????????????????????Component ???????????????????????????????????*/

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[11px] font-bold"
      style={{ background: color + "1a", color, fontFamily: mono }}
    >
      {text}
    </span>
  );
}

function Gauge({ score }: { score: number }) {
  // -100..+100 ??0..200 mapped to 0%..100%
  const pct = Math.max(0, Math.min(100, (score + 100) / 2));
  const color = score >= 20 ? BULL : score <= -20 ? BEAR : NEUT;
  return (
    <div className="relative h-4 w-full overflow-hidden rounded-sm" style={{ background: "var(--wsj-grey-light, #ddd6c8)" }}>
      {/* labels */}
      <div className="absolute inset-0 flex items-center justify-between px-1 text-[8px] font-bold" style={{ color: TM, fontFamily: mono }}>
        <span>SELL</span>
        <span>NEUTRAL</span>
        <span>BUY</span>
      </div>
      {/* needle */}
      <div
        className="absolute top-0 h-full w-0.5 transition-all"
        style={{ left: `${pct}%`, background: color }}
      />
      <div
        className="absolute -top-1 h-6 w-2 rounded-sm transition-all"
        style={{ left: `calc(${pct}% - 4px)`, background: color }}
      />
    </div>
  );
}

interface Props {
  data: PriceBar[];
  ticker: string;
  period?: string;
}

export default function TradingDashboard({ data, ticker, period = "2y" }: Props) {
  const result = useMemo(() => analyze(data), [data]);

  // Benchmark data for correlation (4.5)
  const [benchmarks, setBenchmarks] = useState<Record<string, PriceBar[]>>({});
  useEffect(() => {
    if (data.length < 60 || TECH_COMPARISON_BENCHMARKS.some((bm) => bm.value === ticker)) {
      setBenchmarks({});
      return;
    }
    const ac = new AbortController();
    Promise.all(
      TECH_COMPARISON_BENCHMARKS.map((bm) =>
        fetchPrices(bm.value, period, ac.signal).then((r) => r.data).catch(() => [] as PriceBar[])
      )
    ).then((seriesList) => {
      const next: Record<string, PriceBar[]> = {};
      TECH_COMPARISON_BENCHMARKS.forEach((bm, idx) => {
        next[bm.value] = seriesList[idx];
      });
      setBenchmarks(next);
    });
    return () => ac.abort();
  }, [ticker, period, data.length]);

  // Position Size Calculator state (5.1)
  const [showCalc, setShowCalc] = useState(false);
  const [acctSize, setAcctSize] = useState(() => {
    if (typeof window === "undefined") return 10000;
    return Number(localStorage.getItem("zs_acct_size")) || 10000;
  });
  const [riskPct, setRiskPct] = useState(() => {
    if (typeof window === "undefined") return 1;
    return Number(localStorage.getItem("zs_risk_pct")) || 1;
  });

  // Local level alerts (5.3)
  const [levelAlerts, setLevelAlerts] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(`zs_alerts_${ticker}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  // Reset alerts when ticker changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`zs_alerts_${ticker}`);
      setLevelAlerts(stored ? new Set(JSON.parse(stored)) : new Set());
    } catch { setLevelAlerts(new Set()); }
  }, [ticker]);
  const toggleLevelAlert = useCallback((price: string) => {
    setLevelAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(price)) next.delete(price); else next.add(price);
      try { localStorage.setItem(`zs_alerts_${ticker}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [ticker]);

  // Trade Journal (5.2)
  const { openTrades, closedTrades, openTrade, closeTrade, deleteTrade, totalPnL, winRate } = useTradeJournal();

  if (!result) {
    return (
      <div className="border p-4 text-center text-xs" style={{ borderColor: GRY, color: TM, fontFamily: mono }}>
        Need at least 50 bars for analysis. Select a longer period.
      </div>
    );
  }

  const signalIcon = (s: "bullish" | "bearish" | "neutral") =>
    s === "bullish" ? "▲" : s === "bearish" ? "▼" : "●";
  const signalColor = (s: "bullish" | "bearish" | "neutral") =>
    s === "bullish" ? BULL : s === "bearish" ? BEAR : TM;

  // Memoize expensive historical score computation
  const scoreHistory = useMemo(() => {
    const minBars = 50;
    const maxSamples = 40;
    if (data.length < minBars) return null;
    const step = Math.max(5, Math.ceil((data.length - minBars) / maxSamples));
    const scores: number[] = [];
    for (let i = minBars; i <= data.length; i += step) {
      const r = analyze(data.slice(0, i));
      if (r) scores.push(r.score);
    }
    // Always include the full dataset as last point
    if (data.length > minBars && (data.length - minBars) % step !== 0) {
      const r = analyze(data);
      if (r) scores.push(r.score);
    }
    return scores.length >= 2 ? scores : null;
  }, [data]);

  return (
    <div className="space-y-0">
      {/* ?????Hero verdict ?????*/}
      <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: verdict */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span
                className="text-xl font-extrabold tracking-tight sm:text-2xl"
                style={{ fontFamily: serif, color: result.verdictColor }}
              >
                {result.bias}
              </span>
              <span className="text-sm" style={{ color: T2, fontFamily: mono }}>
                Score: {result.score > 0 ? "+" : ""}{result.score}
              </span>
            </div>
            <Gauge score={result.score} />

            {/* ?????Historical score sparkline (4.1) ?????*/}
            {(() => {
              if (!scoreHistory) return null;
              const scores = scoreHistory;
              const SW = 200, SH = 32;
              const pts = scores.map((s, i) =>
                `${(i / (scores.length - 1)) * SW},${SH / 2 - (s / 100) * (SH / 2 - 1)}`
              ).join(" ");
              const zY = SH / 2;
              // Bullish fill (above zero)
              const bullPath = `M0,${zY} ` + scores.map((s, i) => {
                const x = (i / (scores.length - 1)) * SW;
                const y = Math.min(zY, SH / 2 - (s / 100) * (SH / 2 - 1));
                return `L${x},${y}`;
              }).join(" ") + ` L${SW},${zY} Z`;
              // Bearish fill (below zero)
              const bearPath = `M0,${zY} ` + scores.map((s, i) => {
                const x = (i / (scores.length - 1)) * SW;
                const y = Math.max(zY, SH / 2 - (s / 100) * (SH / 2 - 1));
                return `L${x},${y}`;
              }).join(" ") + ` L${SW},${zY} Z`;
              return (
                <div className="mt-1.5 mb-1">
                  <svg width="100%" height={SH} viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" style={{ display: "block" }}>
                    <path d={bullPath} fill="rgba(46,125,50,0.10)" />
                    <path d={bearPath} fill="rgba(198,40,40,0.10)" />
                    <line x1={0} y1={zY} x2={SW} y2={zY} stroke="var(--wsj-grey, #c8c8c8)" strokeWidth={0.5} />
                    <polyline points={pts} fill="none" stroke="var(--wsj-ink, #1a1a1a)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div className="flex justify-between text-[7px]" style={{ color: TM, fontFamily: mono }}>
                    <span>SCORE HISTORY</span>
                    <span>{result.score > 0 ? "+" : ""}{result.score}</span>
                  </div>
                </div>
              );
            })()}

            {/* Relative scoring vs benchmarks (4.2) */}
            {(() => {
              const comparisons: { label: string; score: number }[] = [];
              for (const bm of TECH_COMPARISON_BENCHMARKS) {
                const bars = benchmarks[bm.value] || [];
                if (bars.length >= 50) {
                  const bmResult = analyze(bars);
                  if (bmResult) comparisons.push({ label: bm.label, score: bmResult.score });
                }
              }
              if (comparisons.length === 0) return null;
              return (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]" style={{ fontFamily: mono }}>
                  {comparisons.map((c) => {
                    const diff = result.score - c.score;
                    return (
                      <span key={c.label}>
                        <span style={{ color: TM }}>vs {c.label}: </span>
                        <span style={{ color: diff > 0 ? BULL : diff < 0 ? BEAR : TM }}>
                          {diff > 0 ? "+" : ""}{diff}
                        </span>
                        <span style={{ color: TM }}> ({c.label} {c.score > 0 ? "+" : ""}{c.score})</span>
                      </span>
                    );
                  })}
                </div>
              );
            })()}
            <p className="mt-2 text-xs leading-relaxed" style={{ color: T2, fontFamily: mono }}>
              {result.verdict}
            </p>
          </div>

          {/* Right: price & changes */}
          <div className="text-right" style={{ fontFamily: mono }}>
            <div className="text-2xl font-bold" style={{ color: INK }}>
              ${result.price.toFixed(2)}
            </div>
            <div className="mt-1 space-y-0.5 text-xs">
              {[
                { label: "1D", val: result.change1d, pct: result.change1dPct },
                { label: "5D", val: result.change5d, pct: result.change5dPct },
                { label: "20D", val: result.change20d, pct: result.change20dPct },
              ].map((c) => (
                <div key={c.label}>
                  <span style={{ color: TM }}>{c.label} </span>
                  <span style={{ color: c.val >= 0 ? BULL : BEAR }}>
                    {c.val >= 0 ? "+" : ""}{c.val.toFixed(2)} ({c.pct >= 0 ? "+" : ""}{c.pct.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend & volatility row */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill text={result.trendPhase} color={result.trendPhase.includes("Up") ? BULL : result.trendPhase.includes("Down") ? BEAR : NEUT} />
          <Pill text={result.volatility.regime} color={result.volatility.atrPct > 3 ? BEAR : result.volatility.atrPct > 1.5 ? NEUT : BULL} />
          <Pill text={`ATR $${result.volatility.atr.toFixed(2)} (${result.volatility.atrPct}%)`} color={TM} />
        </div>
      </div>

      {/* ?????Two-column: Indicators + Levels ?????*/}
      <div className="grid grid-cols-1 gap-0 border border-t-0 lg:grid-cols-2" style={{ borderColor: GRY }}>
        {/* Left: Indicator scorecard */}
        <div className="p-4" style={{ background: WHT }}>
          <h3
            className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em]"
            style={{ fontFamily: mono, color: INK }}
          >
            Indicator Scorecard
          </h3>
          <div className="h-[2px] mb-3" style={{ background: INK }} />
          <table className="w-full text-xs" style={{ fontFamily: mono }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${GRY}` }}>
                <th className="py-1 text-left" style={{ color: TM }}>INDICATOR</th>
                <th className="py-1 text-right" style={{ color: TM }}>VALUE</th>
                <th className="py-1 text-center" style={{ color: TM }}>SIGNAL</th>
              </tr>
            </thead>
            <tbody>
              {result.readings.map((r) => (
                <tr key={r.name} style={{ borderBottom: `1px solid ${GRY}22` }}>
                  <td className="py-1.5">
                    <div style={{ color: INK }}>{r.name}</div>
                    <div className="text-[10px]" style={{ color: TM }}>{r.detail}</div>
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap" style={{ color: T2 }}>
                    {r.value}
                  </td>
                  <td className="py-1.5 text-center">
                    <span style={{ color: signalColor(r.signal), fontSize: 14 }}>
                      {signalIcon(r.signal)}
                    </span>
                    {r.weight >= 2 && (
                      <span className="ml-0.5 text-[9px]" style={{ color: signalColor(r.signal) }}>
                        {"●".repeat(r.weight)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-[10px]" style={{ color: TM }}>
            ● weight: more dots = stronger signal influence on final score
          </div>
        </div>

        {/* Right: Key levels */}
        <div className="border-t p-4 lg:border-t-0 lg:border-l" style={{ borderColor: GRY, background: WHT }}>
          <h3
            className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em]"
            style={{ fontFamily: mono, color: INK }}
          >
            Key Price Levels
          </h3>
          <div className="h-[2px] mb-3" style={{ background: INK }} />

          {/* Visual price ladder */}
          <div className="space-y-0">
            {result.levels.map((lv, i) => {
              const isCurrentZone =
                i < result.levels.length - 1 &&
                result.levels[i].price >= result.price &&
                result.levels[i + 1].price <= result.price;
              return (
                <div key={`${lv.label}-${i}`}>
                  <div
                    className="flex items-center justify-between py-1 text-xs"
                    style={{ fontFamily: mono, borderBottom: `1px solid ${GRY}22` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: lv.color }} />
                      <span style={{ color: T2 }}>{lv.label}</span>
                    </div>
                    <div className="text-right flex items-center gap-1">
                      <span className="font-bold" style={{ color: INK }}>${lv.price.toFixed(2)}</span>
                      <span className="ml-1" style={{ color: lv.pct.startsWith("+") ? BULL : lv.pct.startsWith("-") ? BEAR : TM }}>
                        {lv.pct}
                      </span>
                      <button
                        onClick={() => toggleLevelAlert(lv.price.toFixed(2))}
                        className="ml-1 text-[11px] opacity-60 hover:opacity-100 transition-opacity"
                        style={{ background: "none", border: "none", cursor: "pointer", color: levelAlerts.has(lv.price.toFixed(2)) ? "#f59e0b" : TM }}
                        title={levelAlerts.has(lv.price.toFixed(2)) ? "Remove alert" : "Watch this level"}
                      >
                        {levelAlerts.has(lv.price.toFixed(2)) ? "🔔" : "🔕"}
                      </button>
                    </div>
                  </div>
                  {isCurrentZone && (
                    <div
                      className="my-0.5 flex items-center gap-2 rounded px-2 py-1 text-[11px] font-bold"
                      style={{ background: INK, color: WHT, fontFamily: mono }}
                    >
                      <span>◆</span>
                      <span>CURRENT PRICE ${result.price.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ?????Position Size Calculator (5.1) ?????*/}
      <div className="border border-t-0 p-4" style={{ borderColor: GRY, background: WHT }}>
        <button
          onClick={() => setShowCalc(v => !v)}
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: showCalc ? INK : TM, fontFamily: mono, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Position Calculator {showCalc ? "Hide" : "Show"}
        </button>
        {showCalc && (() => {
          const entry = result.price;
          const stopLevel = result.levels.find(l => l.label.toLowerCase().includes("stop"));
          const targetLevel = result.levels.find(l => l.label.toLowerCase().includes("target") || l.label.toLowerCase().includes("profit"));
          const stop = stopLevel?.price ?? entry * 0.95;
          const target = targetLevel?.price ?? entry * 1.10;
          const riskDollars = acctSize * (riskPct / 100);
          const stopDist = Math.abs(entry - stop);
          const shares = stopDist > 0 ? Math.floor(riskDollars / stopDist) : 0;
          const posValue = shares * entry;
          const portfolioPct = acctSize > 0 ? (posValue / acctSize) * 100 : 0;
          const rr = stopDist > 0 ? Math.abs(target - entry) / stopDist : 0;
          return (
            <div className="mt-2" style={{ fontFamily: mono }}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <label className="text-[10px] block" style={{ color: TM }}>
                  Account Size ($)
                  <input type="number" value={acctSize} onChange={e => { const v = Number(e.target.value); setAcctSize(v); localStorage.setItem("zs_acct_size", String(v)); }}
                    className="w-full mt-0.5 px-2 py-1 text-xs focus:outline-none"
                    style={{ border: `1px solid ${GRY}`, background: "var(--wsj-bg, #e8e0d0)", color: INK }} />
                </label>
                <label className="text-[10px] block" style={{ color: TM }}>
                  Risk Per Trade (%)
                  <input type="number" value={riskPct} step={0.5} min={0.1} max={10} onChange={e => { const v = Number(e.target.value); setRiskPct(v); localStorage.setItem("zs_risk_pct", String(v)); }}
                    className="w-full mt-0.5 px-2 py-1 text-xs focus:outline-none"
                    style={{ border: `1px solid ${GRY}`, background: "var(--wsj-bg, #e8e0d0)", color: INK }} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
                <div><span style={{ color: TM }}>Entry: </span><b style={{ color: INK }}>${entry.toFixed(2)}</b></div>
                <div><span style={{ color: TM }}>Stop: </span><b style={{ color: BEAR }}>${stop.toFixed(2)}</b></div>
                <div><span style={{ color: TM }}>Target: </span><b style={{ color: BULL }}>${target.toFixed(2)}</b></div>
                <div><span style={{ color: TM }}>Shares: </span><b style={{ color: INK }}>{shares}</b></div>
                <div><span style={{ color: TM }}>Risk: </span><b style={{ color: BEAR }}>${riskDollars.toFixed(0)}</b></div>
                <div><span style={{ color: TM }}>R:R: </span><b style={{ color: rr >= 2 ? BULL : rr >= 1 ? NEUT : BEAR }}>{rr.toFixed(1)}</b></div>
                <div><span style={{ color: TM }}>Position: </span><b style={{ color: INK }}>${posValue.toLocaleString()}</b></div>
                <div><span style={{ color: TM }}>% Portfolio: </span><b style={{ color: portfolioPct > 20 ? BEAR : portfolioPct > 10 ? NEUT : BULL }}>{portfolioPct.toFixed(1)}%</b></div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ?????Risk notes ?????*/}
      <div className="border border-t-0 p-4" style={{ borderColor: GRY, background: WHT }}>
        {/* Performance Statistics */}
        <h3
          className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em]"
          style={{ fontFamily: mono, color: INK }}
        >
          Period Performance
        </h3>
        <div className="h-[2px] mb-3" style={{ background: INK }} />

        {/* Equity curve sparkline */}
        {result.equityCurve.length > 1 && (() => {
          const eq = result.equityCurve;
          const dd = result.drawdownCurve;
          const W = 320, H = 64, PAD = 1;
          const eqMin = Math.min(...eq);
          const eqMax = Math.max(...eq);
          const eqRange = eqMax - eqMin || 1;
          const ddMin = Math.min(...dd);
          const scaleX = (i: number) => PAD + (i / (eq.length - 1)) * (W - 2 * PAD);
          const scaleEq = (v: number) => PAD + (1 - (v - eqMin) / eqRange) * (H - 2 * PAD);
          const zeroY = scaleEq(100);
          const eqPoints = eq.map((v, i) => `${scaleX(i)},${scaleEq(v)}`).join(" ");
          // Drawdown fill path (area between equity curve and peak line)
          const ddPath = dd.length > 0 ?
            `M${scaleX(0)},${scaleEq(eq[0])} ` +
            dd.map((_, i) => `L${scaleX(i)},${scaleEq(eq[i])}`).join(" ") + " " +
            [...dd].reverse().map((d, ri) => {
              const i = dd.length - 1 - ri;
              const peakVal = eq[i] / (1 + d / 100);
              return `L${scaleX(i)},${scaleEq(peakVal)}`;
            }).join(" ") + " Z" : "";
          const finalColor = eq[eq.length - 1] >= 100 ? BULL : BEAR;
          return (
            <div className="mb-3">
              <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
                {/* Zero line (starting value = 100) */}
                <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="var(--wsj-grey, #c8c8c8)" strokeWidth={0.5} strokeDasharray="3,3" />
                {/* Drawdown shading */}
                {ddMin < -0.1 && <path d={ddPath} fill="rgba(198,40,40,0.1)" />}
                {/* Equity line */}
                <polyline points={eqPoints} fill="none" stroke={finalColor} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="flex justify-between text-[9px]" style={{ fontFamily: mono, color: TM }}>
                <span>Start</span>
                <span>{result.perfStats.totalReturn >= 0 ? "+" : ""}{result.perfStats.totalReturn.toFixed(1)}%</span>
                <span>End</span>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-5 mb-4">
          {[
            { label: "Total Return", value: `${result.perfStats.totalReturn >= 0 ? "+" : ""}${result.perfStats.totalReturn.toFixed(1)}%`, color: result.perfStats.totalReturn >= 0 ? BULL : BEAR },
            { label: "Max Drawdown", value: `-${result.perfStats.maxDrawdown.toFixed(1)}%`, color: result.perfStats.maxDrawdown > 20 ? BEAR : result.perfStats.maxDrawdown > 10 ? NEUT : BULL },
            { label: "DD Duration", value: `${result.perfStats.maxDrawdownDays}d`, color: TM },
            { label: "Sharpe Ratio", value: result.perfStats.sharpeApprox.toFixed(2), color: result.perfStats.sharpeApprox > 1 ? BULL : result.perfStats.sharpeApprox > 0 ? NEUT : BEAR },
            { label: "Ann. Volatility", value: `${result.perfStats.volatilityAnn.toFixed(1)}%`, color: result.perfStats.volatilityAnn > 40 ? BEAR : result.perfStats.volatilityAnn > 25 ? NEUT : BULL },
            { label: "Win Rate", value: `${result.perfStats.winRate.toFixed(0)}%`, color: result.perfStats.winRate > 52 ? BULL : result.perfStats.winRate < 48 ? BEAR : TM },
            { label: "Avg Gain", value: `+${result.perfStats.avgGain.toFixed(2)}%`, color: BULL },
            { label: "Avg Loss", value: `${result.perfStats.avgLoss.toFixed(2)}%`, color: BEAR },
            { label: "Best Day", value: `+${result.perfStats.bestDay.toFixed(2)}%`, color: BULL },
            { label: "Worst Day", value: `${result.perfStats.worstDay.toFixed(2)}%`, color: BEAR },
          ].map((s) => (
            <div key={s.label} style={{ fontFamily: mono }}>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: TM }}>{s.label}</div>
              <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ?????Rolling Sharpe & Drawdown sparklines (4.4) ?????*/}
        {(() => {
          const W = 60;
          if (data.length < W + 1) return null;
          const sharpes: number[] = [];
          const rollDDs: number[] = [];
          for (let i = W; i < data.length; i++) {
            const rets: number[] = [];
            let peak = data[i - W].close;
            let maxDD = 0;
            for (let j = i - W + 1; j <= i; j++) {
              rets.push(data[j].close / data[j - 1].close - 1);
              peak = Math.max(peak, data[j].close);
              maxDD = Math.min(maxDD, (data[j].close - peak) / peak);
            }
            const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
            const std = Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / rets.length);
            sharpes.push(std > 0 ? (mean / std) * Math.sqrt(252) : 0);
            rollDDs.push(maxDD * 100);
          }
          const renderMini = (vals: number[], label: string, bearish?: boolean) => {
            const SH = 32, SW = 200;
            const mn = Math.min(...vals);
            const mx = Math.max(...vals);
            const rng = mx - mn || 1;
            const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * SW},${SH - ((v - mn) / rng) * (SH - 2) - 1}`).join(" ");
            const zY = SH - ((0 - mn) / rng) * (SH - 2) - 1;
            const lastColor = bearish ? "#c62828" : (vals[vals.length - 1] >= 0 ? "#2e7d32" : "#c62828");
            return (
              <div>
                <div className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: TM, fontFamily: mono }}>{label}</div>
                <svg width="100%" height={SH} viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" style={{ display: "block" }}>
                  <line x1={0} y1={zY} x2={SW} y2={zY} stroke="var(--wsj-grey, #c8c8c8)" strokeWidth={0.5} strokeDasharray="3,3" />
                  <polyline points={pts} fill="none" stroke={lastColor} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="flex justify-between text-[8px]" style={{ color: TM, fontFamily: mono }}>
                  <span>{vals[0].toFixed(2)}</span>
                  <span style={{ color: lastColor, fontWeight: 700 }}>{vals[vals.length - 1].toFixed(2)}{bearish ? "%" : ""}</span>
                </div>
              </div>
            );
          };
          return (
            <div className="grid grid-cols-2 gap-4 mt-2 mb-3">
              {renderMini(sharpes, "Rolling 60d Sharpe")}
              {renderMini(rollDDs, "Rolling 60d Drawdown", true)}
            </div>
          );
        })()}

        {/* ?????Correlation Metrics (4.5) ?????*/}
        {(() => {
          const pearson = (x: number[], y: number[]): number => {
            const n = Math.min(x.length, y.length);
            if (n < 30) return NaN;
            const xs = x.slice(-n), ys = y.slice(-n);
            const mx = xs.reduce((a, b) => a + b, 0) / n;
            const my = ys.reduce((a, b) => a + b, 0) / n;
            let num = 0, dx2 = 0, dy2 = 0;
            for (let i = 0; i < n; i++) {
              const dx = xs[i] - mx, dy = ys[i] - my;
              num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
            }
            const denom = Math.sqrt(dx2 * dy2);
            return denom > 0 ? num / denom : 0;
          };
          const dailyReturns = (bars: PriceBar[]) => {
            const m = new Map<string, number>();
            for (let i = 1; i < bars.length; i++) m.set(bars[i].time.slice(0, 10), bars[i].close / bars[i - 1].close - 1);
            return m;
          };
          const stockRetsMap = dailyReturns(data);
          const alignedReturns = (benchBars: PriceBar[]) => {
            const benchMap = dailyReturns(benchBars);
            const xs: number[] = [], ys: number[] = [];
            for (const [date, sr] of stockRetsMap) {
              const br = benchMap.get(date);
              if (br != null) { xs.push(sr); ys.push(br); }
            }
            return { xs, ys };
          };
          const corrs: { label: string; val: number }[] = [];
          for (const bm of TECH_COMPARISON_BENCHMARKS) {
            const bars = benchmarks[bm.value] || [];
            if (bars.length > 60) {
              const { xs, ys } = alignedReturns(bars);
              corrs.push({ label: bm.label, val: pearson(xs, ys) });
            }
          }
          if (corrs.length === 0) return null;
          const corrColor = (v: number) => Math.abs(v) > 0.8 ? NEUT : Math.abs(v) > 0.5 ? BULL : "#1565c0";
          return (
            <div className="flex items-center gap-4 mb-3 text-[10px]" style={{ fontFamily: mono }}>
              <span className="uppercase tracking-wider font-bold" style={{ color: TM }}>Correlation (60d)</span>
              {corrs.map(c => (
                <span key={c.label}>
                  <span style={{ color: TM }}>{c.label}: </span>
                  <span className="font-bold" style={{ color: corrColor(c.val) }}>{isNaN(c.val) ? "--" : c.val.toFixed(2)}</span>
                </span>
              ))}
            </div>
          );
        })()}
        <h3
          className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em]"
          style={{ fontFamily: mono, color: INK }}
        >
          Actionable Notes
        </h3>
        <div className="h-[2px] mb-3" style={{ background: INK }} />
        <ul className="space-y-1">
          {result.riskRewardNotes.map((n, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{ fontFamily: mono, color: T2 }}>
              <span style={{ color: NEUT }}>▸</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>

        {/* Recent high-confidence setups */}
        {result.setups.filter((s) => s.confidence === "high").length > 0 && (
          <div className="mt-3">
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: INK, fontFamily: mono }}>
              High-Confidence Setups
            </h4>
            {result.setups.filter((s) => s.confidence === "high").reverse().map((s, i) => (
              <div
                key={`${s.time}-${i}`}
                className="mt-1 flex items-center gap-2 rounded px-2 py-1.5 text-[11px]"
                style={{
                  background: s.type === "bullish" ? BULL + "12" : BEAR + "12",
                  fontFamily: mono,
                }}
              >
                <span style={{ color: s.type === "bullish" ? BULL : BEAR, fontSize: 14 }}>
                  {s.type === "bullish" ? "▲" : "▼"}
                </span>
                <span className="font-bold" style={{ color: INK }}>{s.name}</span>
                <span style={{ color: TM }}>{s.time}</span>
                <span className="flex-1" style={{ color: T2 }}>— {s.description}</span>
                <button
                  onClick={() => {
                    const entry = result.price;
                    const stopLevel = result.levels.find(l => l.label.toLowerCase().includes("stop"));
                    const stop = stopLevel?.price ?? entry * (s.type === "bullish" ? 0.95 : 1.05);
                    const targetLevel = result.levels.find(l => l.label.toLowerCase().includes("target") || l.label.toLowerCase().includes("profit"));
                    const target = targetLevel?.price ?? entry * (s.type === "bullish" ? 1.10 : 0.90);
                    const riskDollars = acctSize * (riskPct / 100);
                    const stopDist = Math.abs(entry - stop);
                    const shares = stopDist > 0 ? Math.floor(riskDollars / stopDist) : 1;
                    openTrade({
                      ticker,
                      direction: s.type === "bullish" ? "long" : "short",
                      entryPrice: entry,
                      entryDate: new Date().toISOString().split("T")[0],
                      stopPrice: stop,
                      targetPrice: target,
                      shares,
                      notes: "",
                      setupType: s.name,
                    });
                  }}
                  className="flex-shrink-0 px-2 py-0.5 text-[9px] transition-opacity hover:opacity-80"
                  style={{ border: `1px solid ${GRY}`, color: TM, background: "transparent", cursor: "pointer" }}
                >
                  Paper
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ?????Signal Timeline (4.3) ?????*/}
        {result.setups.length > 0 && (() => {
          const d0 = new Date(data[0].time).getTime();
          const dN = new Date(data[data.length - 1].time).getTime();
          const range = dN - d0 || 1;
          const signals = result.setups.map(s => ({
            x: ((new Date(s.time).getTime() - d0) / range) * 100,
            type: s.type,
            name: s.name,
            confidence: s.confidence,
            time: s.time,
          }));
          // Cluster detection: 3+ same-type signals within 5% of timeline
          const clusters: { x1: number; x2: number; type: string }[] = [];
          const grouped = { bullish: signals.filter(s => s.type === "bullish"), bearish: signals.filter(s => s.type === "bearish") };
          for (const [type, sigs] of Object.entries(grouped)) {
            const sorted = [...sigs].sort((a, b) => a.x - b.x);
            let start = 0;
            for (let i = 1; i <= sorted.length; i++) {
              if (i === sorted.length || sorted[i].x - sorted[i - 1].x > 5) {
                if (i - start >= 3) {
                  clusters.push({ x1: sorted[start].x - 0.5, x2: sorted[i - 1].x + 0.5, type });
                }
                start = i;
              }
            }
          }
          return (
            <div className="mt-4">
              <h3 className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: mono, color: INK }}>
                Signal Timeline
              </h3>
              <div className="h-[2px] mb-2" style={{ background: INK }} />
              <svg width="100%" height={28} viewBox="0 0 100 28" preserveAspectRatio="none" style={{ display: "block" }}>
                {/* Cluster highlights */}
                {clusters.map((c, i) => (
                  <rect key={i} x={c.x1} y={0} width={c.x2 - c.x1} height={28}
                    fill={c.type === "bullish" ? "rgba(46,125,50,0.10)" : "rgba(198,40,40,0.10)"} />
                ))}
                {/* Axis */}
                <line x1={0} y1={14} x2={100} y2={14} stroke="var(--wsj-grey, #c8c8c8)" strokeWidth={0.3} />
                {/* Signal dots */}
                {signals.map((s, i) => (
                  <circle key={i} cx={Math.max(1, Math.min(99, s.x))} cy={s.type === "bullish" ? 6 : 22}
                    r={s.confidence === "high" ? 2.5 : 1.5}
                    fill={s.type === "bullish" ? "#2e7d32" : "#c62828"} opacity={0.85}>
                    <title>{s.name} ({s.time})</title>
                  </circle>
                ))}
                {/* Now marker */}
                <line x1={99.5} y1={0} x2={99.5} y2={28} stroke="var(--wsj-ink, #1a1a1a)" strokeWidth={0.5} />
              </svg>
              <div className="flex justify-between text-[8px]" style={{ color: TM, fontFamily: mono }}>
                <span>{data[0].time}</span>
                <span>??bull above ????bear below</span>
                <span>NOW</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ?????Trade Journal (5.2) ?????*/}
      <TradeJournal
        openTrades={openTrades.filter(t => t.ticker === ticker)}
        closedTrades={closedTrades.filter(t => t.ticker === ticker)}
        currentPrice={result.price}
        totalPnL={closedTrades.filter(t => t.ticker === ticker).reduce((sum, t) => sum + (t.pnl ?? 0), 0)}
        winRate={(() => {
          const ct = closedTrades.filter(t => t.ticker === ticker);
          return ct.length > 0 ? ct.filter(t => (t.pnl ?? 0) > 0).length / ct.length * 100 : 0;
        })()}
        onClose={closeTrade}
        onDelete={deleteTrade}
      />

      {/* Disclaimer */}
      <div className="border border-t-0 px-4 py-2 text-center text-[9px]" style={{ borderColor: GRY, color: TM, fontFamily: mono, background: "var(--wsj-bg, #e8e0d0)" }}>
        This is <span className="font-bold uppercase">not financial advice</span>. For informational and educational purposes only. Technical indicators are backward-looking and do not guarantee future results. Always conduct your own research before making investment decisions.
      </div>
    </div>
  );
}
