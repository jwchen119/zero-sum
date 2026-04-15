"use client";

import { useMemo, useState } from "react";
import type {
  TAPatternResponse,
  TATrendline,
  TABreakout,
  TAChartPattern,
  TAKeyLevel,
  TASetup,
  TAMiniBar,
} from "@/lib/api";

/* ─── WSJ tokens ─── */
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

/* ─── Formatting helpers ─── */
function confStars(c: number): string {
  if (c >= 0.8) return "★★★";
  if (c >= 0.5) return "★★";
  return "★";
}

function confColor(c: number): string {
  if (c >= 0.8) return BULL;
  if (c >= 0.5) return NEUT;
  return BEAR;
}

function dirColor(d: string): string {
  return d === "bullish" ? BULL : d === "bearish" ? BEAR : TM;
}

function dirLabel(d: string): string {
  return d === "bullish" ? "BULL" : d === "bearish" ? "BEAR" : "NEUT";
}

function kindLabel(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Sub-components ─── */

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <h3
      className="mb-2 text-xs font-bold uppercase tracking-[0.15em]"
      style={{ color: INK, fontFamily: serif }}
    >
      {title}
      {count !== undefined && (
        <span className="ml-2 font-normal" style={{ color: TM }}>({count})</span>
      )}
    </h3>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

/* ═══════════════════ Main Component ═══════════════════ */

interface Props {
  data: TAPatternResponse;
}

export default function PatternPanel({ data }: Props) {
  const { trendlines, breakouts, chart_patterns, key_levels, active_setups, current_price } = data;

  const [setupFilter, setSetupFilter] = useState<"active" | "resolved" | "all">("active");
  const [sortBy, setSortBy] = useState<"confidence" | "proximity">("confidence");

  const isActive = (s: TASetup): boolean => {
    if (s.direction === "bullish") return current_price >= s.stop && current_price <= s.target;
    if (s.direction === "bearish") return current_price <= s.stop && current_price >= s.target;
    return true;
  };

  const sortedSetups = useMemo(() => {
    const filtered = setupFilter === "all"
      ? active_setups
      : active_setups.filter((s) => setupFilter === "active" ? isActive(s) : !isActive(s));
    return [...filtered].sort((a, b) =>
      sortBy === "confidence"
        ? b.confidence - a.confidence
        : Math.abs(a.entry - current_price) / current_price - Math.abs(b.entry - current_price) / current_price
    );
  }, [active_setups, current_price, setupFilter, sortBy]);

  const activeCount = useMemo(() => active_setups.filter(isActive).length, [active_setups, current_price]);
  const resolvedCount = active_setups.length - activeCount;

  const nearbyLevels = useMemo(
    () => key_levels.filter((l) => Math.abs(l.distance_pct) < 15).slice(0, 12),
    [key_levels],
  );

  const recentPatterns = useMemo(
    () => [...chart_patterns].sort((a, b) => b.confidence - a.confidence).slice(0, 10),
    [chart_patterns],
  );

  const recentBreakouts = useMemo(
    () => [...breakouts].sort((a, b) => b.confidence - a.confidence).slice(0, 6),
    [breakouts],
  );

  return (
    <div className="space-y-4">
      {/* ── Active Setups ── */}
      {active_setups.length > 0 && (
        <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
          <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
            <SectionHeader title="Active Trading Setups" count={sortedSetups.length} />
            <div className="flex items-center gap-1">
              {(["active", "resolved", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSetupFilter(f)}
                  className="px-2 py-0.5 text-[10px] transition-colors"
                  style={{
                    background: setupFilter === f ? INK : "transparent",
                    color: setupFilter === f ? WHT : TM,
                    border: `1px solid ${setupFilter === f ? INK : GRY}`,
                  }}
                >
                  {f === "active" ? `Active (${activeCount})` : f === "resolved" ? `Resolved (${resolvedCount})` : `All (${active_setups.length})`}
                </button>
              ))}
              <button
                onClick={() => setSortBy((p) => p === "confidence" ? "proximity" : "confidence")}
                className="ml-1 px-2 py-0.5 text-[10px] transition-colors"
                style={{ color: TM, border: `1px solid ${GRY}` }}
                title={sortBy === "confidence" ? "Sort by proximity to entry" : "Sort by confidence"}
              >
                {sortBy === "confidence" ? "↕ Confidence" : "↕ Proximity"}
              </button>
            </div>
          </div>
          {sortedSetups.length > 0 ? (
            <div className="space-y-3">
              {sortedSetups.slice(0, 8).map((s, i) => {
                // Match chart marker numbering: top 5 by confidence with conf >= 0.5
                const chartSetups = active_setups.filter(x => x.confidence >= 0.5).slice(0, 5);
                const ci = chartSetups.findIndex(x => x.type === s.type && x.time === s.time);
                return (
                  <SetupCard key={`${s.type}-${s.time}-${i}`} setup={s} currentPrice={current_price} chartIndex={ci >= 0 ? ci : undefined} />
                );
              })}
            </div>
          ) : (
            <p className="text-[11px]" style={{ color: TM }}>No {setupFilter} setups found.</p>
          )}
        </div>
      )}

      {/* ── Key Levels ── */}
      {nearbyLevels.length > 0 && (
        <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
          <SectionHeader title="Key Price Levels" count={nearbyLevels.length} />
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: mono }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${INK}` }}>
                  <th className="py-1 text-left" style={{ color: TM }}>PRICE</th>
                  <th className="py-1 text-left" style={{ color: TM }}>TYPE</th>
                  <th className="py-1 text-center" style={{ color: TM }}>STR</th>
                  <th className="py-1 text-right" style={{ color: TM }}>DIST %</th>
                </tr>
              </thead>
              <tbody>
                {nearbyLevels.map((l, i) => {
                  const isSupport = l.kind.includes("support");
                  return (
                    <tr key={`${l.price}-${i}`} style={{ borderBottom: `1px solid ${GRY}` }}>
                      <td className="py-1.5 font-bold" style={{ color: INK }}>
                        ${l.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5">
                        <Badge
                          label={isSupport ? "SUPPORT" : "RESIST"}
                          color={isSupport ? BULL : BEAR}
                          bg={isSupport ? "rgba(46,125,50,0.12)" : "rgba(198,40,40,0.12)"}
                        />
                      </td>
                      <td className="py-1.5 text-center" style={{ color: INK }}>
                        {l.strength}
                      </td>
                      <td
                        className="py-1.5 text-right"
                        style={{ color: l.distance_pct > 0 ? BULL : BEAR }}
                      >
                        {l.distance_pct > 0 ? "+" : ""}{l.distance_pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Trendlines ── */}
      {(trendlines.support.length > 0 || trendlines.resistance.length > 0) && (
        <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
          <SectionHeader
            title="Detected Trendlines"
            count={trendlines.support.length + trendlines.resistance.length}
          />
          <div className="space-y-2">
            {trendlines.support.slice(0, 4).map((tl, i) => (
              <TrendlineCard key={`s-${i}`} tl={tl} currentPrice={current_price} />
            ))}
            {trendlines.resistance.slice(0, 4).map((tl, i) => (
              <TrendlineCard key={`r-${i}`} tl={tl} currentPrice={current_price} />
            ))}
          </div>
        </div>
      )}

      {/* ── Breakouts ── */}
      {recentBreakouts.length > 0 && (
        <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
          <SectionHeader title="Range Breakouts" count={recentBreakouts.length} />
          <div className="space-y-3">
            {recentBreakouts.map((bo, i) => (
              <BreakoutCard key={`bo-${i}`} bo={bo} />
            ))}
          </div>
        </div>
      )}

      {/* ── Chart Patterns ── */}
      {recentPatterns.length > 0 && (
        <div className="border p-4" style={{ borderColor: GRY, background: WHT }}>
          <SectionHeader title="Chart Patterns" count={recentPatterns.length} />
          <div className="space-y-3">
            {recentPatterns.map((p, i) => (
              <PatternCard key={`p-${i}`} pattern={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Mini OHLC Chart ─── */

function PatternMiniChart({ kind, direction, entry, stop, target, keyPoints, miniBars }: {
  kind: string;
  direction: string;
  entry?: number;
  stop?: number;
  target?: number;
  keyPoints?: { price: number }[];
  miniBars?: TAMiniBar[];
}) {
  // Need OHLC bars to draw candles
  if (!miniBars || miniBars.length < 3) return null;

  const W = 120;
  const H = 60;
  const PX = 3;
  const PY = 3;

  // Price range from bars + levels
  const allH = miniBars.map(b => b.h);
  const allL = miniBars.map(b => b.l);
  const prices = [...allH, ...allL];
  if (entry != null) prices.push(entry);
  if (stop != null) prices.push(stop);
  if (target != null) prices.push(target);

  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const toY = (p: number) => PY + (1 - (p - minP) / range) * (H - PY * 2);
  const n = miniBars.length;
  const barW = Math.max(1.5, Math.min(4, (W - PX * 2) / n * 0.7));
  const gap = (W - PX * 2) / n;

  const isBull = direction === "bullish";

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      {/* Entry / neckline */}
      {entry != null && (
        <line x1={0} y1={toY(entry)} x2={W} y2={toY(entry)}
          stroke={INK} strokeWidth={0.5} strokeDasharray="2,1.5" opacity={0.3} />
      )}
      {/* Stop */}
      {stop != null && (
        <line x1={0} y1={toY(stop)} x2={W} y2={toY(stop)}
          stroke={BEAR} strokeWidth={0.4} strokeDasharray="1.5,1.5" opacity={0.35} />
      )}
      {/* Target */}
      {target != null && (
        <line x1={0} y1={toY(target)} x2={W} y2={toY(target)}
          stroke={BULL} strokeWidth={0.4} strokeDasharray="1.5,1.5" opacity={0.35} />
      )}
      {/* Candles */}
      {miniBars.map((bar, i) => {
        const x = PX + i * gap + gap / 2;
        const bullCandle = bar.c >= bar.o;
        const bodyTop = toY(Math.max(bar.o, bar.c));
        const bodyBot = toY(Math.min(bar.o, bar.c));
        const bodyH = Math.max(0.5, bodyBot - bodyTop);
        const wickTop = toY(bar.h);
        const wickBot = toY(bar.l);
        const color = bullCandle ? BULL : BEAR;

        return (
          <g key={i}>
            {/* Wick */}
            <line x1={x} y1={wickTop} x2={x} y2={wickBot}
              stroke={color} strokeWidth={0.5} opacity={0.7} />
            {/* Body */}
            <rect x={x - barW / 2} y={bodyTop} width={barW} height={bodyH}
              fill={bullCandle ? color : color} stroke={color} strokeWidth={0.3}
              opacity={bullCandle ? 0.7 : 0.85} />
          </g>
        );
      })}
      {/* Key points overlay */}
      {keyPoints && keyPoints.length >= 2 && keyPoints.map((kp, i) => {
        // Map key_point to nearest bar by fraction of total span
        const frac = keyPoints.length > 1 ? i / (keyPoints.length - 1) : 0.5;
        const barIdx = Math.round(frac * (n - 1));
        const x = PX + barIdx * gap + gap / 2;
        const y = toY(kp.price);
        return (
          <circle key={i} cx={x} cy={y} r={2}
            fill="none" stroke={isBull ? BULL : BEAR} strokeWidth={1.2} opacity={0.9} />
        );
      })}
    </svg>
  );
}

/* ─── Card Components ─── */

const CIRCLED = ["\u2776","\u2777","\u2778","\u2779","\u277a"];

function SetupCard({ setup, currentPrice, chartIndex }: { setup: TASetup; currentPrice?: number; chartIndex?: number }) {
  const entryDist = currentPrice && setup.entry ? ((setup.entry - currentPrice) / currentPrice) * 100 : null;

  return (
    <div
      className="rounded border-l-[3px] p-3"
      style={{ borderColor: dirColor(setup.direction), background: "var(--wsj-bg, #e8e0d0)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {chartIndex != null && chartIndex < CIRCLED.length && (
              <span style={{ color: dirColor(setup.direction), fontSize: 16, lineHeight: 1 }}>
                {CIRCLED[chartIndex]}
              </span>
            )}
            <span className="text-xs font-bold" style={{ color: INK, fontFamily: mono }}>
              {kindLabel(setup.type)}
            </span>
            <Badge
              label={dirLabel(setup.direction)}
              color={dirColor(setup.direction)}
              bg={setup.direction === "bullish" ? "rgba(46,125,50,0.12)" : "rgba(198,40,40,0.12)"}
            />
            <span className="text-[10px]" style={{ color: confColor(setup.confidence) }}>
              {confStars(setup.confidence)} {(setup.confidence * 100).toFixed(0)}%
            </span>
            {entryDist != null && (
              <span className="text-[9px]" style={{ color: Math.abs(entryDist) < 2 ? BULL : TM }}>
                Entry {entryDist >= 0 ? "↑" : "↓"}{Math.abs(entryDist).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: T2 }}>
            {setup.description}
          </p>
          {setup.entry != null && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]" style={{ fontFamily: mono }}>
              <span style={{ color: INK }}>
                Entry: <strong>${setup.entry.toFixed(2)}</strong>
              </span>
              <span style={{ color: BEAR }}>
                Stop: ${setup.stop.toFixed(2)}
              </span>
              <span style={{ color: BULL }}>
                Target: ${setup.target.toFixed(2)}
              </span>
              {setup.risk_reward > 0 && (
                <span style={{ color: setup.risk_reward >= 2 ? BULL : NEUT }}>
                  R:R {setup.risk_reward.toFixed(1)}
                </span>
              )}
            </div>
          )}
          <div className="mt-1 text-[9px]" style={{ color: TM }}>
            {setup.time}{setup.status ? ` · ${setup.status}` : ""}
          </div>
        </div>
        <PatternMiniChart
          kind={setup.type}
          direction={setup.direction}
          entry={setup.entry}
          stop={setup.stop}
          target={setup.target}
          miniBars={setup.mini_bars}
        />
      </div>
    </div>
  );
}

function TrendlineCard({ tl, currentPrice }: { tl: TATrendline; currentPrice: number }) {
  const isSupport = tl.kind === "support";
  const lineEnd = tl.line[tl.line.length - 1]?.value ?? 0;
  const distPct = currentPrice > 0 ? ((currentPrice - lineEnd) / currentPrice * 100) : 0;

  return (
    <div className="flex items-center gap-3 text-xs" style={{ fontFamily: mono }}>
      <Badge
        label={isSupport ? "SUP" : "RES"}
        color={isSupport ? BULL : BEAR}
        bg={isSupport ? "rgba(46,125,50,0.12)" : "rgba(198,40,40,0.12)"}
      />
      <span style={{ color: INK }}>
        {tl.touches} touches
      </span>
      <span style={{ color: TM }}>
        {tl.start_time} → {tl.end_time}
      </span>
      <span style={{ color: INK }}>
        ${lineEnd.toFixed(2)}
      </span>
      <span style={{ color: distPct > 0 ? BULL : BEAR }}>
        ({distPct > 0 ? "+" : ""}{distPct.toFixed(1)}%)
      </span>
      <span style={{ color: TM }}>score {tl.score.toFixed(0)}</span>
    </div>
  );
}

function BreakoutCard({ bo }: { bo: TABreakout }) {
  return (
    <div
      className="rounded border-l-[3px] p-3"
      style={{ borderColor: dirColor(bo.direction), background: "var(--wsj-bg, #e8e0d0)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs" style={{ fontFamily: mono }}>
            <Badge
              label={bo.direction === "bullish" ? "BULL BREAK" : "BEAR BREAK"}
              color={dirColor(bo.direction)}
              bg={bo.direction === "bullish" ? "rgba(46,125,50,0.12)" : "rgba(198,40,40,0.12)"}
            />
            <span style={{ color: INK }}>
              ${bo.range.low.toFixed(0)} – ${bo.range.high.toFixed(0)} range
            </span>
            <span style={{ color: TM }}>({bo.range.duration_bars} bars)</span>
            <span style={{ color: confColor(bo.confidence) }}>{confStars(bo.confidence)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 text-[10px]" style={{ fontFamily: mono }}>
            <span style={{ color: INK }}>Break: ${bo.breakout_price.toFixed(2)} on {bo.breakout_time}</span>
            <span style={{ color: bo.volume_ratio >= 1.5 ? BULL : TM }}>Vol: {bo.volume_ratio.toFixed(1)}×</span>
            <span style={{ color: bo.confirmed ? BULL : NEUT }}>
              {bo.status.toUpperCase()}
            </span>
            {bo.retested && <span style={{ color: BULL }}>Retested ✓</span>}
          </div>
          <div className="mt-1 flex gap-x-3 text-[10px]" style={{ fontFamily: mono }}>
            <span style={{ color: BEAR }}>Stop: ${bo.stop.toFixed(2)}</span>
            <span style={{ color: BULL }}>Target: ${bo.target.toFixed(2)}</span>
            {bo.risk_reward > 0 && (
              <span style={{ color: bo.risk_reward >= 2 ? BULL : NEUT }}>R:R {bo.risk_reward.toFixed(1)}</span>
            )}
          </div>
        </div>
        <PatternMiniChart
          kind="breakout"
          direction={bo.direction}
          entry={bo.breakout_price}
          stop={bo.stop}
          target={bo.target}
          miniBars={bo.mini_bars}
        />
      </div>
    </div>
  );
}

function PatternCard({ pattern }: { pattern: TAChartPattern }) {
  return (
    <div
      className="rounded border-l-[3px] p-3"
      style={{ borderColor: dirColor(pattern.direction), background: "var(--wsj-bg, #e8e0d0)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs" style={{ fontFamily: mono }}>
            <span className="font-bold" style={{ color: INK }}>{kindLabel(pattern.kind)}</span>
            <Badge
              label={dirLabel(pattern.direction)}
              color={dirColor(pattern.direction)}
              bg={pattern.direction === "bullish" ? "rgba(46,125,50,0.12)" : "rgba(198,40,40,0.12)"}
            />
            <span style={{ color: confColor(pattern.confidence) }}>
              {confStars(pattern.confidence)} {(pattern.confidence * 100).toFixed(0)}%
            </span>
            <Badge
              label={pattern.status.toUpperCase()}
              color={pattern.status === "confirmed" ? BULL : pattern.status === "failed" ? BEAR : NEUT}
              bg="rgba(128,128,128,0.15)"
            />
          </div>
          <p className="mt-1 text-[11px]" style={{ color: T2 }}>
            {pattern.description}
          </p>
          {pattern.entry != null && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[10px]" style={{ fontFamily: mono }}>
              <span style={{ color: INK }}>Entry: ${pattern.entry.toFixed(2)}</span>
              {pattern.stop != null && <span style={{ color: BEAR }}>Stop: ${pattern.stop.toFixed(2)}</span>}
              {pattern.target != null && <span style={{ color: BULL }}>Target: ${pattern.target.toFixed(2)}</span>}
              {pattern.risk_reward != null && pattern.risk_reward > 0 && (
                <span style={{ color: pattern.risk_reward >= 2 ? BULL : NEUT }}>
                  R:R {pattern.risk_reward.toFixed(1)}
                </span>
              )}
            </div>
          )}
          <div className="mt-1 text-[9px]" style={{ color: TM }}>
            {pattern.start_time} → {pattern.end_time}
          </div>
        </div>
        <PatternMiniChart
          kind={pattern.kind}
          direction={pattern.direction}
          entry={pattern.entry}
          stop={pattern.stop}
          target={pattern.target}
          keyPoints={pattern.key_points}
          miniBars={pattern.mini_bars}
        />
      </div>
    </div>
  );
}
