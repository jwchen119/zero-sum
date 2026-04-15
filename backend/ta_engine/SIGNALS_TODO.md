# Trading Signals Pipeline — TODO

**Goal:** Produce curated, actionable trading signals from our TA engine.
Output a structured JSON that can be directly consumed by an LLM for natural-language recommendations.

---

## What We Have (working)

- [x] Multi-scale swing detection (windows 5/10/20)
- [x] RANSAC trendlines (top 3 support + 3 resistance)
- [x] Horizontal ranges + breakout detection
- [x] Chart patterns (double bottom/top, H&S, wedges, triangles)
- [x] Volume profile (80-bin, POC, value area)
- [x] Key levels consolidation
- [x] Basic active_setups list

---

## Phase 1: Trend & Momentum Context

Right now we detect *structures* but don't classify the current *regime*.
An LLM (or any trader) needs to know: "are we in a bull trend, bear trend, or range?"

- [ ] **Trend classifier** — compute for the current bar:
  - Price vs SMA50 / SMA200 (above/below, distance %)
  - SMA50 vs SMA200 (golden cross / death cross state)
  - ADX (trend strength 0–100, >25 = trending)
  - Classify: `strong_uptrend | uptrend | range | downtrend | strong_downtrend`

- [ ] **Momentum snapshot** — current values of:
  - RSI(14) + overbought/oversold/divergence state
  - MACD histogram direction (expanding/contracting) + signal cross
  - Stochastic %K/%D cross state + zone (OB/OS/neutral)
  - Rate of change (ROC) 20-day

- [ ] **Relative strength** — is this name outperforming or underperforming SPY?
  - (needs SPY data as benchmark, can add later)

## Phase 2: Signal Detection

These are the discrete, timestamped events that say "something just happened."

- [ ] **Trendline signals:**
  - Bounce off support trendline (price touched and closed above)
  - Rejection at resistance trendline (price touched and closed below)
  - Trendline break (closed through a trendline with volume confirmation)

- [ ] **Range signals:**
  - Bounce off range support/resistance
  - Breakout (already have detection — add "active right now" flag)
  - Failed breakout / fakeout detection

- [ ] **Moving average signals:**
  - Golden cross / death cross (SMA50 x SMA200)
  - Price reclaim of SMA50 after being below
  - Price rejection at SMA200 from below

- [ ] **Momentum signals:**
  - RSI divergence (bullish: price lower low + RSI higher low, and inverse)
  - MACD bullish/bearish cross
  - Stochastic cross in OB/OS zone

- [ ] **Volume signals:**
  - Climactic volume (>2.5x average) on up/down day
  - Volume dry-up (contraction before a move)
  - Price at POC (mean reversion zone)
  - Price entering/exiting value area

- [ ] **Pattern completion signals:**
  - Pattern recently confirmed (within last 10 bars)
  - Pattern target reached / invalidated

## Phase 3: Signal Scoring & Confluence

Raw signals are noise. Confluence is the edge.

- [ ] **Score each signal** (0–100):
  - Recency (signals from last 5 bars > 20 bars ago)
  - Confirmation (volume, multiple timeframes)
  - Historical reliability of the pattern type
  - Proximity to key levels

- [ ] **Confluence detector:**
  - When 3+ signals align in the same direction → high-conviction setup
  - Example: trendline bounce + RSI divergence + volume spike = strong buy signal
  - Weight by signal quality

- [ ] **Filter and rank:**
  - Only output signals from the last N bars (configurable, default 20)
  - Rank by score
  - Cap at top 5 signals per ticker

## Phase 4: Actionable Setup Builder

Convert scored signals into concrete trade setups.

- [ ] **Setup structure:**
  ```json
  {
    "ticker": "ORCL",
    "signal_time": "2026-03-12",
    "direction": "long",
    "conviction": "high",
    "score": 82,
    "entry": 160.00,
    "stop_loss": 133.00,
    "target_1": 190.00,
    "target_2": 198.00,
    "risk_reward": 1.4,
    "reasoning": [
      "Bounced off 5-year support trendline (6 touches, $136)",
      "Climactic volume on bounce day (83M vs 25M avg)",
      "RSI recovering from oversold (32 → 45)"
    ],
    "invalidation": "Close below $133 invalidates the setup",
    "confluence_signals": ["trendline_bounce", "volume_climax", "rsi_recovery"],
    "context": {
      "trend": "downtrend",
      "trend_note": "Counter-trend bounce — higher risk",
      "distance_to_sma50": "-4.5%",
      "distance_to_sma200": "-27.2%"
    }
  }
  ```

- [ ] **Risk management rules:**
  - Stop always below nearest structural level
  - Minimum R:R of 1.5 for trend-following, 2.0 for counter-trend
  - Position sizing suggestion based on stop distance

## Phase 5: LLM Integration (later)

- [ ] `/api/ta/signals/<ticker>` endpoint returning the setup JSON above
- [ ] Prompt template that takes the setup JSON and produces natural-language recommendation
- [ ] Batch scanner: run signals on all coverage tickers, surface top setups
- [ ] Daily signal digest (top 5 setups across all tickers)

---

## Implementation Order

1. **Trend classifier + momentum snapshot** → `ta_engine/signals.py`
   - Gives every ticker a "context" that all other signals reference
2. **Signal detection** → extend `signals.py` with discrete event detectors
3. **Scoring + confluence** → `ta_engine/scoring.py`
4. **Setup builder** → extend `analysis.py` to output the final JSON
5. **API endpoint** → `routes/ta.py`
6. **LLM hookup** → separate phase

Start with #1 and #2 — that's where the alpha is.
