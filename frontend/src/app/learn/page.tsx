"use client";

import Link from "next/link";
import WSJLayout from "@/components/WSJLayout";
import {
  WHT, INK, GRY, BLU, T2, TM, GAIN, LOSS,
  serif, mono, sans,
  Hair, HeavyRule,
} from "@/lib/wsj";

/* ───────────────── Data ───────────────── */

interface PatternInfo {
  name: string;
  type: "bullish" | "bearish" | "neutral";
  bars: number;
  description: string;
  identification: string;
  psychology: string;
}

const CANDLE_PATTERNS: PatternInfo[] = [
  {
    name: "Hammer",
    type: "bullish",
    bars: 1,
    description: "A single-bar reversal pattern found at the bottom of downtrends. The long lower shadow shows sellers pushed the price down, but buyers fought back and closed near the open.",
    identification: "Small real body near the high of the bar. Lower shadow at least 2× the body. Little or no upper shadow.",
    psychology: "Sellers drove the price lower intraday but were overwhelmed by buyers, signaling exhaustion of selling pressure.",
  },
  {
    name: "Inverted Hammer",
    type: "bullish",
    bars: 1,
    description: "Appears after a decline. The long upper shadow shows buyers attempted to push higher. Though they failed initially, the pattern signals a potential reversal when confirmed.",
    identification: "Small real body near the low. Long upper shadow at least 2× the body. Little or no lower shadow.",
    psychology: "Buyers tested higher levels. Although the close was near the open, the buying attempt itself signals shifting sentiment.",
  },
  {
    name: "Shooting Star",
    type: "bearish",
    bars: 1,
    description: "Mirror image of the hammer, found at the top of uptrends. The long upper shadow indicates buyers lost control to sellers by the close.",
    identification: "Small real body near the low. Long upper shadow at least 2× the body. Little or no lower shadow.",
    psychology: "Buyers pushed price higher but sellers overwhelmed them, closing near the open — a warning that the uptrend may be ending.",
  },
  {
    name: "Doji",
    type: "neutral",
    bars: 1,
    description: "The open and close are virtually equal, creating a cross shape. It signals indecision between buyers and sellers — a potential turning point.",
    identification: "Extremely small real body (open ≈ close). Can have upper and lower shadows of varying length.",
    psychology: "Neither side gained ground. After a strong trend, this can signal exhaustion. After consolidation, it reinforces uncertainty.",
  },
  {
    name: "Dragonfly Doji",
    type: "bullish",
    bars: 1,
    description: "A doji with a long lower shadow and no upper shadow. Open, high, and close are at the same level. Found at bottoms, it signals strong buyer rejection of lower prices.",
    identification: "Open = High = Close, with a long lower shadow.",
    psychology: "Sellers pushed price significantly lower, but buyers drove it all the way back to the open — a powerful rejection of the downside.",
  },
  {
    name: "Gravestone Doji",
    type: "bearish",
    bars: 1,
    description: "A doji with a long upper shadow and no lower shadow. Open, low, and close are at the same level. Found at tops, it signals buyer failure.",
    identification: "Open = Low = Close, with a long upper shadow.",
    psychology: "Buyers pushed price significantly higher but sellers drove it all the way back down — a powerful rejection of higher prices.",
  },
  {
    name: "Bullish Engulfing",
    type: "bullish",
    bars: 2,
    description: "A two-bar pattern where a large green (bullish) candle completely engulfs the previous red candle. One of the most reliable reversal signals at support levels.",
    identification: "Bar 1 is bearish. Bar 2 is bullish and its body fully contains bar 1's body. Appears after a downtrend.",
    psychology: "Buyers completely overwhelmed sellers in a single session, reversing the prior day's losses and then some.",
  },
  {
    name: "Bearish Engulfing",
    type: "bearish",
    bars: 2,
    description: "A large red candle engulfs the prior green candle. Signals strong selling pressure and potential reversal at resistance levels.",
    identification: "Bar 1 is bullish. Bar 2 is bearish and its body fully contains bar 1's body. Appears after an uptrend.",
    psychology: "Sellers completely overwhelmed buyers, wiping out the prior day's gains and continuing lower.",
  },
  {
    name: "Morning Star",
    type: "bullish",
    bars: 3,
    description: "A three-bar reversal: a long bearish candle, a small-bodied candle (the 'star' that gaps down), and a long bullish candle that closes above the midpoint of the first bar.",
    identification: "Bar 1: long bearish body. Bar 2: small body (gaps down from bar 1). Bar 3: long bullish body closing above bar 1's midpoint.",
    psychology: "Day 1 shows continued selling. Day 2's small body signals indecision. Day 3's strong buying confirms the reversal.",
  },
  {
    name: "Evening Star",
    type: "bearish",
    bars: 3,
    description: "Bearish counterpart of the morning star. A long bullish candle, a small-bodied candle at the top, and a long bearish candle confirm the reversal.",
    identification: "Bar 1: long bullish body. Bar 2: small body (gaps up from bar 1). Bar 3: long bearish body closing below bar 1's midpoint.",
    psychology: "Day 1 shows continued buying. Day 2's small body signals indecision at the top. Day 3's strong selling confirms distribution.",
  },
  {
    name: "Three White Soldiers",
    type: "bullish",
    bars: 3,
    description: "Three consecutive long-bodied bullish candles, each opening within the prior body and closing near its high. A strong continuation/reversal pattern.",
    identification: "Three consecutive bullish bars with progressively higher closes. Each opens within the prior bar's body.",
    psychology: "Sustained buying pressure across three sessions signals strong institutional accumulation and trend conviction.",
  },
  {
    name: "Three Black Crows",
    type: "bearish",
    bars: 3,
    description: "Three consecutive long-bodied bearish candles, each opening within the prior body and closing near its low. Signals heavy distribution.",
    identification: "Three consecutive bearish bars with progressively lower closes. Each opens within the prior bar's body.",
    psychology: "Sustained selling pressure across three sessions signals institutional distribution and loss of confidence.",
  },
  {
    name: "Piercing Line",
    type: "bullish",
    bars: 2,
    description: "A bearish candle followed by a bullish candle that opens below the prior low but closes above the midpoint of the bearish candle. Signals a potential bottom.",
    identification: "Bar 1: bearish. Bar 2: opens below bar 1's low, closes above bar 1's midpoint.",
    psychology: "Despite a gap lower at the open, buyers rallied the price to close above the prior bar's midpoint — a sign of emerging strength.",
  },
  {
    name: "Dark Cloud Cover",
    type: "bearish",
    bars: 2,
    description: "A bullish candle followed by a bearish candle that opens above the prior high but closes below the midpoint. The bearish counterpart of the piercing line.",
    identification: "Bar 1: bullish. Bar 2: opens above bar 1's high, closes below bar 1's midpoint.",
    psychology: "Despite a gap higher, sellers drove the price below the prior bar's midpoint — a sign that buyers are losing control.",
  },
  {
    name: "Tweezer Bottom",
    type: "bullish",
    bars: 2,
    description: "Two candles with matching lows. The first is bearish. The second is bullish. The equal lows create a support level that held twice.",
    identification: "Two consecutive bars with approximately equal lows. Bar 1 is bearish, bar 2 is bullish.",
    psychology: "Price tested the same low twice and rejected it both times, confirming support at that level.",
  },
  {
    name: "Tweezer Top",
    type: "bearish",
    bars: 2,
    description: "Two candles with matching highs. The first is bullish. The second is bearish. The equal highs create a resistance level.",
    identification: "Two consecutive bars with approximately equal highs. Bar 1 is bullish, bar 2 is bearish.",
    psychology: "Price tested the same high twice and was rejected both times, confirming resistance.",
  },
];

interface ChartPatternInfo {
  name: string;
  kind: string;
  type: "bullish" | "bearish" | "either";
  description: string;
  identification: string;
  trading: string;
}

const CHART_PATTERNS: ChartPatternInfo[] = [
  {
    name: "Double Bottom",
    kind: "double_bottom",
    type: "bullish",
    description: "Price hits a support level twice, forming a 'W' shape. The pattern completes when price breaks above the neckline (the peak between the two bottoms). One of the most reliable reversal patterns.",
    identification: "Two distinct troughs at roughly the same price level, separated by a peak. Volume typically decreases on the second bottom and surges on the breakout.",
    trading: "Enter on a close above the neckline. Stop below the second bottom. Target is the neckline plus the distance from the bottom to the neckline.",
  },
  {
    name: "Double Top",
    kind: "double_top",
    type: "bearish",
    description: "Price hits a resistance level twice, forming an 'M' shape. Completes when price breaks below the neckline. Signals that buyers failed to push higher and distribution is occurring.",
    identification: "Two distinct peaks at roughly the same price level, separated by a trough. Volume often decreases on the second peak.",
    trading: "Enter on a close below the neckline. Stop above the second peak. Target is the neckline minus the distance from the peak to the neckline.",
  },
  {
    name: "Head & Shoulders",
    kind: "head_shoulders",
    type: "bearish",
    description: "Three peaks: a higher middle peak (head) between two lower, roughly equal peaks (shoulders). The neckline connects the troughs. A classic topping pattern with high reliability.",
    identification: "Left shoulder peak → trough → higher head peak → trough → right shoulder peak (≈ left shoulder height). Volume typically diminishes on the head and right shoulder.",
    trading: "Enter on a close below the neckline. Stop above the right shoulder. Target is the neckline minus the distance from the head to the neckline.",
  },
  {
    name: "Inverse Head & Shoulders",
    kind: "inv_head_shoulders",
    type: "bullish",
    description: "The mirror image of head & shoulders, found at bottoms. Three troughs with the middle one being the deepest. One of the most reliable bullish reversal patterns.",
    identification: "Left shoulder trough → peak → deeper head trough → peak → right shoulder trough (≈ left shoulder depth). Volume surges on the breakout above neckline.",
    trading: "Enter on a close above the neckline. Stop below the right shoulder. Target is the neckline plus the distance from the head to the neckline.",
  },
  {
    name: "Rising Wedge",
    kind: "rising_wedge",
    type: "bearish",
    description: "Both support and resistance lines slope upward, but converge. The narrowing range and rising pattern typically resolve with a downside breakout.",
    identification: "Higher highs and higher lows, but the highs are rising more slowly than the lows. The trading range narrows. Volume diminishes as the wedge progresses.",
    trading: "Enter short on a break below the support line. Stop above the most recent high. Target is the base of the wedge (the widest point projected downward).",
  },
  {
    name: "Falling Wedge",
    kind: "falling_wedge",
    type: "bullish",
    description: "Both support and resistance lines slope downward, but converge. Despite the falling price, the pattern typically resolves with an upside breakout.",
    identification: "Lower highs and lower lows, but the lows are falling more slowly than the highs. The range narrows. Volume diminishes then surges on breakout.",
    trading: "Enter long on a break above the resistance line. Stop below the most recent low. Target is the base of the wedge projected upward.",
  },
  {
    name: "Ascending Triangle",
    kind: "ascending_triangle",
    type: "bullish",
    description: "Flat resistance line with rising support. Each pullback finds buyers at higher levels. The flat top acts as a ceiling that eventually breaks under increasing buying pressure.",
    identification: "Horizontal resistance with ascending lows creating a rising support line. At least two touches on each line. Volume contracts then expands on breakout.",
    trading: "Enter on a break above the flat resistance. Stop below the most recent higher low. Target is the height of the triangle added to the breakout point.",
  },
  {
    name: "Descending Triangle",
    kind: "descending_triangle",
    type: "bearish",
    description: "Flat support line with declining resistance. Each rally meets sellers at lower levels. Typically resolves with a breakdown through the flat support.",
    identification: "Horizontal support with descending highs creating a falling resistance line. At least two touches on each line.",
    trading: "Enter on a break below the flat support. Stop above the most recent lower high. Target is the height of the triangle subtracted from the breakdown point.",
  },
  {
    name: "Symmetrical Triangle",
    kind: "symmetrical_triangle",
    type: "either",
    description: "Converging trendlines with lower highs and higher lows. Represents a period of consolidation where neither buyers nor sellers dominate. Breaks in the direction of the prior trend ~65% of the time.",
    identification: "A series of lower highs and higher lows forming converging trendlines. Volume typically contracts as the apex approaches.",
    trading: "Enter on a break above resistance or below support. Stop on the opposite side of the triangle. Target is the widest part of the triangle projected from the breakout point.",
  },
];

interface SetupInfo {
  name: string;
  type: "bullish" | "bearish" | "either";
  category: string;
  description: string;
  indicators: string;
  logic: string;
}

const TRADING_SETUPS: SetupInfo[] = [
  {
    name: "BB Squeeze Breakout",
    type: "either",
    category: "Volatility",
    description: "Bollinger Bands contract to their narrowest width, indicating a low-volatility regime. When price explodes out of the squeeze, a new directional move begins.",
    indicators: "Bollinger Bands (20, 2)",
    logic: "Bandwidth drops below a threshold. When price closes above the upper band → bullish. Below the lower band → bearish.",
  },
  {
    name: "RSI Divergence",
    type: "either",
    category: "Momentum",
    description: "Price makes a new high/low but RSI does not confirm. This divergence signals weakening momentum and a potential reversal. One of the most powerful mean-reversion signals.",
    indicators: "RSI (14)",
    logic: "Bullish: price makes a lower low, RSI makes a higher low. Bearish: price makes a higher high, RSI makes a lower high.",
  },
  {
    name: "MACD Divergence",
    type: "either",
    category: "Momentum",
    description: "Similar to RSI divergence but uses MACD histogram. Price and MACD histogram move in opposite directions, signaling that the trend's momentum is fading.",
    indicators: "MACD (12, 26, 9)",
    logic: "Bullish: price makes a lower low, MACD histogram makes a higher low. Bearish: price makes a higher high, MACD histogram makes a lower high.",
  },
  {
    name: "Oversold Bounce / Overbought Pullback",
    type: "either",
    category: "Mean Reversion",
    description: "RSI reaches extreme levels (below 30 or above 70) and then reverses. These extremes represent stretched conditions that tend to snap back.",
    indicators: "RSI (14)",
    logic: "Bounce: RSI drops below 30 and crosses back above. Pullback: RSI rises above 70 and crosses back below.",
  },
  {
    name: "Golden Cross / Death Cross",
    type: "either",
    category: "Trend",
    description: "The 50-period EMA crosses above (golden) or below (death) the 200-period EMA. These are slow but widely followed trend signals used by institutional investors.",
    indicators: "EMA 50, EMA 200",
    logic: "Golden cross: EMA 50 crosses above EMA 200. Death cross: EMA 50 crosses below EMA 200.",
  },
  {
    name: "MACD Cross",
    type: "either",
    category: "Momentum",
    description: "The MACD line crosses its signal line. This is one of the most commonly used momentum signals, best suited for trending markets.",
    indicators: "MACD (12, 26, 9)",
    logic: "Bull cross: MACD line crosses above signal line. Bear cross: MACD line crosses below signal line.",
  },
  {
    name: "EMA Pullback",
    type: "either",
    category: "Trend",
    description: "Price pulls back to a rising EMA in an uptrend (or rallies to a falling EMA in a downtrend) and bounces. The EMA acts as dynamic support/resistance.",
    indicators: "EMA 21",
    logic: "Bullish: price touches or approaches EMA 21 from above and bounces in an uptrend. Bearish: price approaches from below and rejects.",
  },
  {
    name: "Volume Climax Reversal",
    type: "either",
    category: "Volume",
    description: "An extreme volume spike (3×+ average) accompanied by a long candle wick. The climactic volume signals exhaustion — the last burst of panic selling or euphoric buying.",
    indicators: "Volume, SMA 20 (volume)",
    logic: "Volume exceeds 3× the 20-period average. The candle has a significant wick (rejection). Signals a potential reversal on the next bar.",
  },
  {
    name: "Stochastic Cross",
    type: "either",
    category: "Momentum",
    description: "The %K line crosses the %D line in oversold or overbought territory. More reliable when the cross happens at extreme levels.",
    indicators: "Stochastic (14, 3, 3)",
    logic: "Bull: %K crosses above %D below 20. Bear: %K crosses below %D above 80.",
  },
  {
    name: "Ichimoku TK Cross",
    type: "either",
    category: "Trend",
    description: "The Tenkan-sen (conversion line) crosses the Kijun-sen (base line). When above the Kumo, it's a strong bullish signal; below the Kumo, it's a strong bearish signal.",
    indicators: "Ichimoku Cloud (9, 26, 52)",
    logic: "Bull: Tenkan crosses above Kijun. Bear: Tenkan crosses below Kijun. Signal strength depends on position relative to the cloud.",
  },
  {
    name: "Kumo Breakout",
    type: "either",
    category: "Trend",
    description: "Price breaks above or below the Ichimoku Cloud (Kumo). This is one of the strongest trend signals in Ichimoku analysis, as the cloud represents long-term equilibrium.",
    indicators: "Ichimoku Cloud",
    logic: "Bull: price closes above the upper cloud boundary (Senkou Span A/B). Bear: price closes below the lower boundary.",
  },
  {
    name: "ADX Trend Start",
    type: "either",
    category: "Trend Strength",
    description: "ADX rises above 25, confirming a trend is emerging. The direction is determined by whether +DI or −DI is dominant. Useful for confirming breakouts.",
    indicators: "ADX/DMI (14)",
    logic: "ADX crosses above 25. Direction: +DI > −DI → bullish trend. −DI > +DI → bearish trend.",
  },
  {
    name: "Trendline Bounce",
    type: "bullish",
    category: "Structure",
    description: "Price approaches a rising support trendline with multiple touches and bounces. The more touches a trendline has, the more significant it becomes.",
    indicators: "TA Engine trendline detection",
    logic: "Price is within 4% above a rising support trendline that has 3+ touches. Entry at the trendline, stop 3% below.",
  },
  {
    name: "Range Breakout",
    type: "either",
    category: "Structure",
    description: "Price breaks out of a well-defined consolidation range (rectangle pattern). The breakout typically leads to a measured move equal to the range height.",
    indicators: "TA Engine range detection",
    logic: "Price closes beyond the range boundary with above-average volume. Confirmed if the breakout holds for 2+ bars.",
  },
];

/* ───────── Helpers ───────── */

function typeColor(t: string): string {
  return t === "bullish" ? GAIN : t === "bearish" ? LOSS : TM;
}

function typeBg(t: string): string {
  return t === "bullish" ? "rgba(46,125,50,0.10)" : t === "bearish" ? "rgba(198,40,40,0.10)" : "rgba(128,128,128,0.10)";
}

function typeLabel(t: string): string {
  return t === "bullish" ? "BULL" : t === "bearish" ? "BEAR" : "NEUTRAL";
}

/* ───────── Mini SVG Candle Diagrams ───────── */

function MiniCandle({ pattern }: { pattern: PatternInfo }) {
  const W = 80;
  const H = 48;

  const shapes: Record<string, { o: number; h: number; l: number; c: number }[]> = {
    "Hammer":            [{ o: 45, h: 48, l: 5, c: 42 }],
    "Inverted Hammer":   [{ o: 8, h: 45, l: 5, c: 10 }],
    "Shooting Star":     [{ o: 10, h: 45, l: 5, c: 8 }],
    "Doji":              [{ o: 25, h: 45, l: 5, c: 25 }],
    "Dragonfly Doji":    [{ o: 42, h: 45, l: 5, c: 42 }],
    "Gravestone Doji":   [{ o: 8, h: 45, l: 5, c: 8 }],
    "Bullish Engulfing": [{ o: 32, h: 38, l: 12, c: 15 }, { o: 10, h: 45, l: 8, c: 40 }],
    "Bearish Engulfing": [{ o: 15, h: 38, l: 12, c: 32 }, { o: 40, h: 45, l: 8, c: 10 }],
    "Morning Star":      [{ o: 40, h: 42, l: 10, c: 12 }, { o: 10, h: 14, l: 5, c: 8 }, { o: 15, h: 42, l: 12, c: 38 }],
    "Evening Star":      [{ o: 10, h: 38, l: 8, c: 35 }, { o: 38, h: 45, l: 35, c: 40 }, { o: 35, h: 40, l: 10, c: 12 }],
    "Three White Soldiers": [{ o: 8, h: 20, l: 5, c: 18 }, { o: 16, h: 30, l: 14, c: 28 }, { o: 26, h: 42, l: 24, c: 40 }],
    "Three Black Crows": [{ o: 40, h: 42, l: 28, c: 30 }, { o: 30, h: 32, l: 16, c: 18 }, { o: 20, h: 22, l: 6, c: 8 }],
    "Piercing Line":     [{ o: 35, h: 38, l: 10, c: 12 }, { o: 8, h: 38, l: 5, c: 30 }],
    "Dark Cloud Cover":  [{ o: 12, h: 38, l: 10, c: 35 }, { o: 40, h: 42, l: 18, c: 20 }],
    "Tweezer Bottom":    [{ o: 30, h: 35, l: 8, c: 12 }, { o: 12, h: 32, l: 8, c: 28 }],
    "Tweezer Top":       [{ o: 12, h: 42, l: 10, c: 35 }, { o: 35, h: 42, l: 15, c: 18 }],
  };

  const bars = shapes[pattern.name] ?? [{ o: 20, h: 40, l: 10, c: 30 }];
  const n = bars.length;
  const barW = Math.min(14, (W - 10) / n * 0.55);
  const gap = (W - 10) / n;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      {bars.map((b, i) => {
        const x = 5 + i * gap + gap / 2;
        const bull = b.c > b.o;
        const bodyTop = H - Math.max(b.o, b.c);
        const bodyBot = H - Math.min(b.o, b.c);
        const wickTop = H - b.h;
        const wickBot = H - b.l;
        const clr = bull ? "#2e7d32" : "#c62828";
        return (
          <g key={i}>
            <line x1={x} y1={wickTop} x2={x} y2={wickBot} stroke={clr} strokeWidth={1} opacity={0.7} />
            <rect x={x - barW / 2} y={bodyTop} width={barW} height={Math.max(1, bodyBot - bodyTop)}
              fill={clr} stroke={clr} strokeWidth={0.5} opacity={0.85} />
          </g>
        );
      })}
    </svg>
  );
}

/* ───────── Mini SVG Chart Pattern Diagrams ───────── */

function MiniChartPatternSvg({ kind }: { kind: string }) {
  const W = 120;
  const H = 56;
  const clr = "#333";
  const bull = "#2e7d32";
  const bear = "#c62828";
  const grey = "#999";

  const paths: Record<string, React.ReactNode> = {
    double_bottom: (
      <>
        <polyline points="5,12 20,40 35,22 50,40 65,12 80,8" fill="none" stroke={bull} strokeWidth={1.5} />
        <line x1={5} y1={40} x2={65} y2={40} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <line x1={5} y1={22} x2={80} y2={22} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <text x={84} y={24} fontSize={6} fill={grey}>neckline</text>
        <text x={84} y={42} fontSize={6} fill={grey}>support</text>
      </>
    ),
    double_top: (
      <>
        <polyline points="5,44 20,16 35,34 50,16 65,44 80,48" fill="none" stroke={bear} strokeWidth={1.5} />
        <line x1={5} y1={16} x2={65} y2={16} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <line x1={5} y1={34} x2={80} y2={34} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <text x={84} y={18} fontSize={6} fill={grey}>resistance</text>
        <text x={84} y={36} fontSize={6} fill={grey}>neckline</text>
      </>
    ),
    head_shoulders: (
      <>
        <polyline points="3,40 14,24 22,34 35,8 48,34 56,24 67,40 80,48" fill="none" stroke={bear} strokeWidth={1.5} />
        <line x1={3} y1={34} x2={80} y2={34} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <text x={84} y={36} fontSize={6} fill={grey}>neckline</text>
        <text x={30} y={6} fontSize={5} fill={clr}>H</text>
        <text x={10} y={22} fontSize={5} fill={clr}>S</text>
        <text x={53} y={22} fontSize={5} fill={clr}>S</text>
      </>
    ),
    inv_head_shoulders: (
      <>
        <polyline points="3,16 14,32 22,22 35,48 48,22 56,32 67,16 80,8" fill="none" stroke={bull} strokeWidth={1.5} />
        <line x1={3} y1={22} x2={80} y2={22} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <text x={84} y={24} fontSize={6} fill={grey}>neckline</text>
        <text x={30} y={54} fontSize={5} fill={clr}>H</text>
        <text x={10} y={35} fontSize={5} fill={clr}>S</text>
        <text x={53} y={35} fontSize={5} fill={clr}>S</text>
      </>
    ),
    rising_wedge: (
      <>
        <line x1={5} y1={48} x2={75} y2={12} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <line x1={5} y1={48} x2={75} y2={20} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <polyline points="5,48 20,28 28,42 42,20 50,34 62,16 75,48" fill="none" stroke={bear} strokeWidth={1.5} />
        <polygon points="75,48 82,46 78,52" fill={bear} opacity={0.6} />
      </>
    ),
    falling_wedge: (
      <>
        <line x1={5} y1={8} x2={75} y2={44} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <line x1={5} y1={8} x2={75} y2={36} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <polyline points="5,8 20,28 28,14 42,36 50,22 62,40 75,8" fill="none" stroke={bull} strokeWidth={1.5} />
        <polygon points="75,8 82,10 78,4" fill={bull} opacity={0.6} />
      </>
    ),
    ascending_triangle: (
      <>
        <line x1={5} y1={12} x2={80} y2={12} stroke={grey} strokeWidth={0.7} strokeDasharray="3,2" />
        <line x1={5} y1={48} x2={70} y2={12} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <polyline points="5,48 18,12 25,38 40,12 48,28 62,12 75,12 85,4" fill="none" stroke={bull} strokeWidth={1.5} />
        <polygon points="85,4 88,10 82,8" fill={bull} opacity={0.6} />
        <text x={84} y={14} fontSize={6} fill={grey}>flat R</text>
      </>
    ),
    descending_triangle: (
      <>
        <line x1={5} y1={44} x2={80} y2={44} stroke={grey} strokeWidth={0.7} strokeDasharray="3,2" />
        <line x1={5} y1={8} x2={70} y2={44} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <polyline points="5,8 18,44 25,18 40,44 48,28 62,44 75,44 85,52" fill="none" stroke={bear} strokeWidth={1.5} />
        <polygon points="85,52 88,46 82,48" fill={bear} opacity={0.6} />
        <text x={84} y={42} fontSize={6} fill={grey}>flat S</text>
      </>
    ),
    symmetrical_triangle: (
      <>
        <line x1={5} y1={8} x2={70} y2={28} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <line x1={5} y1={48} x2={70} y2={28} stroke={grey} strokeWidth={0.5} strokeDasharray="3,2" />
        <polyline points="5,8 15,44 25,14 38,40 48,20 58,34 65,28 80,10" fill="none" stroke={bull} strokeWidth={1.5} />
        <text x={72} y={26} fontSize={6} fill={grey}>?</text>
      </>
    ),
  };

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      {paths[kind] ?? (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={8} fill={grey}>
          {kind}
        </text>
      )}
    </svg>
  );
}

/* ───────── Mini SVG Trading Setup Diagrams ───────── */

function MiniSetupSvg({ name }: { name: string }) {
  const W = 100;
  const H = 48;
  const bull = "#2e7d32";
  const bear = "#c62828";
  const grey = "#999";
  const blue = "#1565c0";
  const orange = "#e65100";

  const key = name.toLowerCase();

  let content: React.ReactNode;

  if (key.includes("bb squeeze")) {
    // Bollinger Bands squeezing then expanding
    content = (
      <>
        <polyline points="5,10 15,14 25,18 35,22 45,24 55,22 60,14 70,6 80,4" fill="none" stroke={grey} strokeWidth={0.7} strokeDasharray="2,2" />
        <polyline points="5,38 15,34 25,30 35,26 45,24 55,26 60,34 70,42 80,44" fill="none" stroke={grey} strokeWidth={0.7} strokeDasharray="2,2" />
        <polyline points="5,24 15,22 25,26 35,23 45,24 55,22 60,18 70,10 80,6" fill="none" stroke={bull} strokeWidth={1.5} />
        <line x1={45} y1={0} x2={45} y2={H} stroke={orange} strokeWidth={0.5} strokeDasharray="1,2" />
        <text x={38} y={46} fontSize={5} fill={orange}>squeeze</text>
      </>
    );
  } else if (key.includes("rsi divergence")) {
    // Price lower low, RSI higher low
    content = (
      <>
        <polyline points="5,10 20,20 35,8 50,28 65,5 80,18" fill="none" stroke={bull} strokeWidth={1} />
        <text x={2} y={8} fontSize={5} fill={grey}>Price</text>
        <polyline points="5,32 20,38 35,30 50,36 65,28 80,34" fill="none" stroke={blue} strokeWidth={1} />
        <text x={2} y={30} fontSize={5} fill={grey}>RSI</text>
        <line x1={35} y1={28} x2={65} y2={28} stroke={bear} strokeWidth={0.5} strokeDasharray="2,1" />
        <line x1={35} y1={8} x2={65} y2={5} stroke={bear} strokeWidth={0.7} />
        <line x1={35} y1={30} x2={65} y2={28} stroke={bull} strokeWidth={0.7} />
        <text x={70} y={46} fontSize={5} fill={bull}>diverge</text>
      </>
    );
  } else if (key.includes("macd divergence")) {
    content = (
      <>
        <polyline points="5,10 20,20 35,6 50,24 65,4 80,16" fill="none" stroke={bull} strokeWidth={1} />
        <rect x={20} y={34} width={5} height={6} fill={bear} opacity={0.5} />
        <rect x={30} y={30} width={5} height={10} fill={bear} opacity={0.5} />
        <rect x={40} y={32} width={5} height={8} fill={bear} opacity={0.5} />
        <rect x={50} y={35} width={5} height={5} fill={bear} opacity={0.5} />
        <rect x={60} y={36} width={5} height={4} fill={bull} opacity={0.5} />
        <rect x={70} y={34} width={5} height={6} fill={bull} opacity={0.5} />
        <line x1={20} y1={34} x2={55} y2={35} stroke={bear} strokeWidth={0.5} />
        <line x1={55} y1={36} x2={75} y2={34} stroke={bull} strokeWidth={0.5} />
        <text x={62} y={46} fontSize={5} fill={bull}>diverge</text>
      </>
    );
  } else if (key.includes("oversold") || key.includes("overbought")) {
    // RSI bouncing off 30/70
    content = (
      <>
        <line x1={0} y1={10} x2={W} y2={10} stroke={bear} strokeWidth={0.3} strokeDasharray="2,2" />
        <line x1={0} y1={38} x2={W} y2={38} stroke={bull} strokeWidth={0.3} strokeDasharray="2,2" />
        <text x={82} y={9} fontSize={5} fill={bear}>70</text>
        <text x={82} y={42} fontSize={5} fill={bull}>30</text>
        <polyline points="5,20 15,24 25,30 35,40 42,44 50,40 58,34 68,26 80,22" fill="none" stroke={blue} strokeWidth={1.5} />
        <circle cx={42} cy={44} r={2.5} fill="none" stroke={bull} strokeWidth={1} />
        <text x={34} y={48} fontSize={5} fill={bull}>bounce</text>
      </>
    );
  } else if (key.includes("golden") || key.includes("death")) {
    // Two EMAs crossing
    content = (
      <>
        <polyline points="5,32 20,30 35,26 50,22 65,16 80,12" fill="none" stroke={bull} strokeWidth={1.2} />
        <polyline points="5,18 20,20 35,24 50,22 65,24 80,28" fill="none" stroke={orange} strokeWidth={1.2} />
        <circle cx={50} cy={22} r={3} fill="none" stroke={bear} strokeWidth={1} />
        <text x={2} y={36} fontSize={5} fill={bull}>EMA 50</text>
        <text x={2} y={16} fontSize={5} fill={orange}>EMA 200</text>
        <text x={54} y={18} fontSize={5} fill={grey}>cross</text>
      </>
    );
  } else if (key.includes("macd cross")) {
    content = (
      <>
        <polyline points="5,30 15,28 25,24 35,18 50,14 65,18 80,22" fill="none" stroke={blue} strokeWidth={1.2} />
        <polyline points="5,20 15,22 25,22 35,20 50,14 65,12 80,16" fill="none" stroke={orange} strokeWidth={1.2} strokeDasharray="3,2" />
        <circle cx={50} cy={14} r={3} fill="none" stroke={bull} strokeWidth={1} />
        <text x={2} y={34} fontSize={5} fill={blue}>MACD</text>
        <text x={2} y={18} fontSize={5} fill={orange}>Signal</text>
        <text x={54} y={12} fontSize={5} fill={grey}>cross</text>
      </>
    );
  } else if (key.includes("ema pullback")) {
    // Price pulling back to EMA and bouncing
    content = (
      <>
        <polyline points="5,36 15,30 25,22 35,16 45,20 55,26 60,24 65,18 75,12 85,8" fill="none" stroke={bull} strokeWidth={1.2} />
        <polyline points="5,38 15,34 25,28 35,24 45,22 55,22 60,22 65,20 75,18 85,16" fill="none" stroke={orange} strokeWidth={0.8} strokeDasharray="3,2" />
        <circle cx={55} cy={26} r={3} fill="none" stroke={bull} strokeWidth={1} />
        <text x={58} y={32} fontSize={5} fill={bull}>bounce</text>
        <text x={72} y={20} fontSize={5} fill={orange}>EMA</text>
      </>
    );
  } else if (key.includes("volume climax")) {
    // Big volume spike with wick
    content = (
      <>
        <rect x={10} y={36} width={6} height={8} fill={grey} opacity={0.3} />
        <rect x={20} y={34} width={6} height={10} fill={grey} opacity={0.3} />
        <rect x={30} y={32} width={6} height={12} fill={grey} opacity={0.3} />
        <rect x={40} y={8} width={6} height={36} fill={bear} opacity={0.5} />
        <rect x={50} y={30} width={6} height={14} fill={bull} opacity={0.3} />
        <rect x={60} y={28} width={6} height={16} fill={bull} opacity={0.3} />
        <rect x={70} y={26} width={6} height={18} fill={bull} opacity={0.3} />
        <line x1={5} y1={32} x2={85} y2={32} stroke={grey} strokeWidth={0.4} strokeDasharray="2,2" />
        <text x={38} y={6} fontSize={5} fill={bear}>3× avg</text>
      </>
    );
  } else if (key.includes("stochastic")) {
    content = (
      <>
        <line x1={0} y1={8} x2={W} y2={8} stroke={bear} strokeWidth={0.3} strokeDasharray="2,2" />
        <line x1={0} y1={40} x2={W} y2={40} stroke={bull} strokeWidth={0.3} strokeDasharray="2,2" />
        <text x={82} y={7} fontSize={5} fill={bear}>80</text>
        <text x={82} y={44} fontSize={5} fill={bull}>20</text>
        <polyline points="5,24 15,30 25,36 35,42 42,44 50,38 60,30 70,24 80,20" fill="none" stroke={blue} strokeWidth={1.2} />
        <polyline points="5,22 15,26 25,32 35,38 42,42 50,42 60,36 70,28 80,22" fill="none" stroke={orange} strokeWidth={1} strokeDasharray="3,2" />
        <circle cx={46} cy={42} r={3} fill="none" stroke={bull} strokeWidth={1} />
        <text x={2} y={46} fontSize={5} fill={blue}>%K</text>
        <text x={12} y={46} fontSize={5} fill={orange}>%D</text>
      </>
    );
  } else if (key.includes("ichimoku tk")) {
    content = (
      <>
        <rect x={5} y={18} width={85} height={10} fill={grey} opacity={0.08} rx={2} />
        <polyline points="5,30 20,28 35,24 50,20 65,16 80,14" fill="none" stroke={blue} strokeWidth={1.2} />
        <polyline points="5,22 20,22 35,22 50,20 65,22 80,24" fill="none" stroke={orange} strokeWidth={1} strokeDasharray="3,2" />
        <circle cx={50} cy={20} r={3} fill="none" stroke={bull} strokeWidth={1} />
        <text x={2} y={34} fontSize={5} fill={blue}>Tenkan</text>
        <text x={2} y={20} fontSize={5} fill={orange}>Kijun</text>
        <text x={60} y={32} fontSize={5} fill={grey}>cloud</text>
      </>
    );
  } else if (key.includes("kumo")) {
    // Price breaking through cloud
    content = (
      <>
        <rect x={5} y={20} width={80} height={12} fill={grey} opacity={0.12} rx={2} />
        <line x1={5} y1={20} x2={85} y2={20} stroke={grey} strokeWidth={0.5} strokeDasharray="2,2" />
        <line x1={5} y1={32} x2={85} y2={32} stroke={grey} strokeWidth={0.5} strokeDasharray="2,2" />
        <polyline points="5,38 15,36 25,34 35,30 45,26 55,20 65,14 75,10 85,8" fill="none" stroke={bull} strokeWidth={1.5} />
        <text x={56} y={18} fontSize={5} fill={bull}>breakout</text>
        <text x={60} y={30} fontSize={5} fill={grey}>kumo</text>
      </>
    );
  } else if (key.includes("adx")) {
    content = (
      <>
        <line x1={0} y1={24} x2={W} y2={24} stroke={grey} strokeWidth={0.3} strokeDasharray="2,2" />
        <text x={82} y={22} fontSize={5} fill={grey}>25</text>
        <polyline points="5,38 15,36 25,32 35,28 45,24 55,18 65,14 75,12 85,10" fill="none" stroke={blue} strokeWidth={1.5} />
        <polyline points="5,30 15,28 25,24 35,20 45,16 55,14 65,16 75,18 85,20" fill="none" stroke={bull} strokeWidth={0.8} strokeDasharray="3,2" />
        <polyline points="5,42 15,40 25,38 35,36 45,34 55,36 65,38 75,40 85,42" fill="none" stroke={bear} strokeWidth={0.8} strokeDasharray="3,2" />
        <text x={2} y={42} fontSize={5} fill={blue}>ADX</text>
        <text x={60} y={10} fontSize={5} fill={bull}>+DI</text>
        <text x={60} y={46} fontSize={5} fill={bear}>−DI</text>
      </>
    );
  } else if (key.includes("trendline")) {
    // Price bouncing off trendline
    content = (
      <>
        <line x1={5} y1={44} x2={85} y2={12} stroke={grey} strokeWidth={0.7} strokeDasharray="4,2" />
        <polyline points="5,42 12,36 20,40 28,32 36,28 44,34 52,26 60,22 68,28 75,18 85,12" fill="none" stroke={bull} strokeWidth={1.2} />
        <circle cx={20} cy={40} r={2} fill="none" stroke={bull} strokeWidth={0.8} />
        <circle cx={44} cy={34} r={2} fill="none" stroke={bull} strokeWidth={0.8} />
        <circle cx={68} cy={28} r={2} fill="none" stroke={bull} strokeWidth={0.8} />
        <text x={62} y={10} fontSize={5} fill={grey}>support TL</text>
      </>
    );
  } else if (key.includes("range breakout")) {
    // Horizontal range then breakout
    content = (
      <>
        <rect x={5} y={18} width={55} height={16} fill={grey} opacity={0.06} />
        <line x1={5} y1={18} x2={60} y2={18} stroke={grey} strokeWidth={0.7} strokeDasharray="3,2" />
        <line x1={5} y1={34} x2={60} y2={34} stroke={grey} strokeWidth={0.7} strokeDasharray="3,2" />
        <polyline points="5,28 12,22 20,30 28,20 36,32 44,22 52,26 60,18 68,12 76,8 85,6" fill="none" stroke={bull} strokeWidth={1.5} />
        <polygon points="85,6 88,12 82,10" fill={bull} opacity={0.6} />
        <text x={18} y={44} fontSize={5} fill={grey}>range</text>
        <text x={64} y={18} fontSize={5} fill={bull}>break</text>
      </>
    );
  } else {
    content = (
      <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={7} fill={grey}>
        {name}
      </text>
    );
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      {content}
    </svg>
  );
}

/* ───────────────── Page Component ───────────────── */

export default function LearnPage() {
  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
        Home
      </Link>
      <Link href="/technical" className="text-[10px] font-semibold hover:underline" style={{ fontFamily: mono, color: BLU }}>
        Technical Analysis
      </Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <div className="mx-auto max-w-[960px] px-4 py-6">
        {/* ── Header ── */}
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: serif, color: INK }}>
          Trading Setups &amp; Chart Patterns
        </h1>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: T2, fontFamily: mono }}>
          A reference guide to the candlestick patterns, chart formations, and technical setups detected by the Zero Sum Times analysis engine.
          Each entry explains what it is, how to identify it, and the market psychology behind it.
        </p>

        <HeavyRule />

        {/* ── Table of Contents ── */}
        <nav className="my-6 border p-4" style={{ borderColor: GRY, background: WHT }}>
          <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3" style={{ fontFamily: sans, color: INK }}>
            Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2">
            <div>
              <a href="#candlestick" className="text-xs font-bold hover:underline" style={{ fontFamily: serif, color: INK }}>
                I. Candlestick Patterns
              </a>
              <p className="text-[10px] mt-0.5" style={{ color: TM }}>
                {CANDLE_PATTERNS.length} single- and multi-bar patterns
              </p>
            </div>
            <div>
              <a href="#chart-patterns" className="text-xs font-bold hover:underline" style={{ fontFamily: serif, color: INK }}>
                II. Chart Patterns
              </a>
              <p className="text-[10px] mt-0.5" style={{ color: TM }}>
                {CHART_PATTERNS.length} classic formations
              </p>
            </div>
            <div>
              <a href="#setups" className="text-xs font-bold hover:underline" style={{ fontFamily: serif, color: INK }}>
                III. Trading Setups
              </a>
              <p className="text-[10px] mt-0.5" style={{ color: TM }}>
                {TRADING_SETUPS.length} indicator-based signals
              </p>
            </div>
          </div>
        </nav>

        {/* ────────────────── I. CANDLESTICK PATTERNS ────────────────── */}
        <section id="candlestick">
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: serif, color: INK }}>
            I. Candlestick Patterns
          </h2>
          <p className="text-xs mb-4" style={{ color: T2 }}>
            Candlestick patterns are formed by one to three price bars and signal potential reversals or continuations.
            They are most reliable when they appear at key support/resistance levels, in the context of an existing trend,
            and are confirmed by volume.
          </p>
          <Hair />

          <div className="space-y-0">
            {CANDLE_PATTERNS.map((p, i) => (
              <div
                key={p.name}
                className={`py-4 ${i > 0 ? "border-t" : ""}`}
                style={{ borderColor: GRY }}
              >
                <div className="flex items-start gap-4">
                  <MiniCandle pattern={p} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold" style={{ fontFamily: serif, color: INK }}>
                        {p.name}
                      </h3>
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold"
                        style={{ color: typeColor(p.type), background: typeBg(p.type) }}
                      >
                        {typeLabel(p.type)}
                      </span>
                      <span className="text-[9px]" style={{ color: TM, fontFamily: mono }}>
                        {p.bars}-bar
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed" style={{ color: T2 }}>
                      {p.description}
                    </p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TM }}>
                          Identification
                        </span>
                        <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: INK }}>
                          {p.identification}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TM }}>
                          Psychology
                        </span>
                        <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: INK }}>
                          {p.psychology}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="my-8">
          <HeavyRule />
        </div>

        {/* ────────────────── II. CHART PATTERNS ────────────────── */}
        <section id="chart-patterns">
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: serif, color: INK }}>
            II. Chart Patterns
          </h2>
          <p className="text-xs mb-4" style={{ color: T2 }}>
            Chart patterns are larger formations that develop over weeks or months. They represent the collective behavior
            of market participants — accumulation, distribution, continuation, or reversal. The TA engine auto-detects these
            on daily charts and derives entry, stop, and target levels.
          </p>
          <Hair />

          <div className="space-y-0">
            {CHART_PATTERNS.map((p, i) => (
              <div
                key={p.kind}
                className={`py-4 ${i > 0 ? "border-t" : ""}`}
                style={{ borderColor: GRY }}
              >
                <div className="flex items-start gap-4">
                <MiniChartPatternSvg kind={p.kind} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold" style={{ fontFamily: serif, color: INK }}>
                      {p.name}
                    </h3>
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ color: typeColor(p.type), background: typeBg(p.type) }}
                    >
                      {p.type === "either" ? "BULL / BEAR" : typeLabel(p.type)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed" style={{ color: T2 }}>
                    {p.description}
                  </p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TM }}>
                        Identification
                      </span>
                      <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: INK }}>
                        {p.identification}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TM }}>
                        Trading
                      </span>
                      <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: INK }}>
                        {p.trading}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            ))}
          </div>
        </section>

        <div className="my-8">
          <HeavyRule />
        </div>

        {/* ────────────────── III. TRADING SETUPS ────────────────── */}
        <section id="setups">
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: serif, color: INK }}>
            III. Trading Setups
          </h2>
          <p className="text-xs mb-4" style={{ color: T2 }}>
            Trading setups combine price action with technical indicators to identify high-probability entry points.
            These are the signals detected by the Zero Sum Times chart engine and TA analysis backend. Best used
            in confluence — when multiple signals align.
          </p>
          <Hair />

          {/* Group by category */}
          {["Volatility", "Momentum", "Mean Reversion", "Trend", "Trend Strength", "Volume", "Structure"].map((cat) => {
            const items = TRADING_SETUPS.filter((s) => s.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-6">
                <h3
                  className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ fontFamily: sans, color: INK, borderBottom: `2px solid ${INK}` }}
                >
                  {cat}
                </h3>
                {items.map((s, i) => (
                  <div
                    key={s.name}
                    className={`py-3 ${i > 0 ? "border-t" : ""}`}
                    style={{ borderColor: GRY }}
                  >
                    <div className="flex items-start gap-4">
                      <MiniSetupSvg name={s.name} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold" style={{ fontFamily: serif, color: INK }}>
                            {s.name}
                          </h4>
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold"
                            style={{ color: typeColor(s.type), background: typeBg(s.type) }}
                          >
                            {s.type === "either" ? "BULL / BEAR" : typeLabel(s.type)}
                          </span>
                          <span className="text-[9px]" style={{ color: TM, fontFamily: mono }}>
                            {s.indicators}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: T2 }}>
                          {s.description}
                        </p>
                        <div className="mt-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TM }}>
                            Logic
                          </span>
                          <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: INK, fontFamily: mono }}>
                            {s.logic}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </section>

        <div className="my-8">
          <HeavyRule />
        </div>

        {/* ── Concepts Reference ── */}
        <section id="concepts" className="mb-8">
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: serif, color: INK }}>
            Key Concepts
          </h2>
          <Hair />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
            {[
              { term: "Confluence", def: "When multiple independent signals agree — e.g. a hammer at a trendline support with RSI oversold. Confluence dramatically increases the probability of a setup working." },
              { term: "Confirmation", def: "Waiting for the next bar to close in the expected direction before acting on a signal. Reduces false positives at the cost of a slightly worse entry price." },
              { term: "False Breakout", def: "Price breaks a key level but quickly reverses back inside the range. Common during low-volume sessions. Stop-losses protect against these." },
              { term: "Risk:Reward (R:R)", def: "The ratio of potential profit to potential loss. A 2:1 R:R means you risk $1 to make $2. Professional traders typically require at least 1.5:1." },
              { term: "Support & Resistance", def: "Price levels where buying (support) or selling (resistance) pressure has historically concentrated. The more times a level is tested, the more significant it becomes." },
              { term: "Volume Confirmation", def: "Breakouts and reversals are more reliable when accompanied by above-average volume, signaling genuine participation rather than thin-market noise." },
            ].map((c) => (
              <div key={c.term}>
                <h4 className="text-xs font-bold" style={{ fontFamily: serif, color: INK }}>
                  {c.term}
                </h4>
                <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: T2 }}>
                  {c.def}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <div className="border-t pt-4 pb-2" style={{ borderColor: GRY }}>
          <p className="text-[9px] leading-relaxed" style={{ color: TM, fontFamily: mono }}>
            DISCLAIMER: This page is for educational purposes only and does not constitute financial advice.
            Pattern detection is probabilistic — no signal guarantees future price movement.
            Always use proper risk management, position sizing, and stop-losses.
            Past pattern performance does not predict future results.
          </p>
        </div>
      </div>
    </WSJLayout>
  );
}
