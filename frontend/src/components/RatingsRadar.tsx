"use client";

import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Ratios } from "@/lib/api";

interface Props {
  ratios: Ratios;
}

/**
 * Score a ratio on a 1–5 scale based on general financial health heuristics.
 * These are broad — not sector-specific — but useful for a quick visual snapshot.
 */
function scorePE(pe: number | null): number {
  if (pe == null || pe <= 0) return 3; // no data or negative = neutral
  if (pe < 10) return 5;
  if (pe < 15) return 4;
  if (pe < 25) return 3;
  if (pe < 40) return 2;
  return 1;
}

function scorePB(pb: number | null): number {
  if (pb == null) return 3;
  if (pb < 1) return 5;
  if (pb < 3) return 4;
  if (pb < 5) return 3;
  if (pb < 10) return 2;
  return 1;
}

function scoreROE(roe: number | null): number {
  if (roe == null) return 3;
  const pct = roe * 100;
  if (pct > 25) return 5;
  if (pct > 15) return 4;
  if (pct > 8) return 3;
  if (pct > 0) return 2;
  return 1;
}

function scoreROA(roa: number | null): number {
  if (roa == null) return 3;
  const pct = roa * 100;
  if (pct > 15) return 5;
  if (pct > 8) return 4;
  if (pct > 3) return 3;
  if (pct > 0) return 2;
  return 1;
}

function scoreDE(de: number | null): number {
  if (de == null) return 3;
  if (de < 0) return 1; // negative equity
  if (de < 0.5) return 5;
  if (de < 1) return 4;
  if (de < 2) return 3;
  if (de < 4) return 2;
  return 1;
}

function scoreCurrentRatio(cr: number | null): number {
  if (cr == null) return 3;
  if (cr > 2) return 5;
  if (cr > 1.5) return 4;
  if (cr > 1) return 3;
  if (cr > 0.5) return 2;
  return 1;
}

const sans  = "var(--font-sans-label), 'Helvetica Neue', sans-serif";
const mono  = "var(--font-mono-data), 'Courier New', monospace";
const INK   = "var(--wsj-ink, #1a1a1a)";
const TM    = "var(--wsj-muted, #888888)";
const GRY   = "var(--wsj-grey, #c8c8c8)";
const GR2   = "var(--wsj-grey-light, #d8d0c4)";
const BLU   = "var(--wsj-blue, #8a8a8a)";
const RED   = "var(--wsj-red, #b07050)";
const GRN   = "var(--wsj-green, #c9a96e)";

export default function RatingsRadar({ ratios }: Props) {
  const scores = useMemo(() => [
    { metric: "P/E", score: scorePE(ratios.trailingPE), raw: ratios.trailingPE },
    { metric: "P/B", score: scorePB(ratios.priceToBook), raw: ratios.priceToBook },
    { metric: "ROE", score: scoreROE(ratios.roe), raw: ratios.roe ? (ratios.roe * 100) : null },
    { metric: "ROA", score: scoreROA(ratios.roa), raw: ratios.roa ? (ratios.roa * 100) : null },
    { metric: "D/E", score: scoreDE(ratios.debtToEquity), raw: ratios.debtToEquity },
    { metric: "Liquidity", score: scoreCurrentRatio(ratios.currentRatio), raw: ratios.currentRatio },
  ], [ratios]);

  const avg = useMemo(() => scores.reduce((s, d) => s + d.score, 0) / scores.length, [scores]);

  const fillColor = avg >= 3.5 ? GRN : avg >= 2.5 ? TM : RED;
  const strokeColor = avg >= 3.5 ? GRN : avg >= 2.5 ? INK : RED;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Ratings Snapshot</h3>
        <span className="text-xs font-bold tabular-nums px-2 py-0.5" style={{
          fontFamily: mono,
          border: `1px solid ${GRY}`,
          color: avg >= 3.5 ? GRN : avg >= 2.5 ? INK : RED,
        }}>
          {avg.toFixed(1)} / 5
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={scores} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke={GR2} />
          <PolarAngleAxis dataKey="metric" tick={{ fill: TM, fontSize: 11, fontFamily: sans }} />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 5]}
            tick={{ fill: GRY, fontSize: 10 }}
            tickCount={6}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--wsj-white, #f5f0e8)", border: `1px solid ${GRY}`, borderRadius: 0, fontFamily: mono, fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, _: any, props: any) => {
              const raw = props.payload.raw;
              const rawStr = raw != null ? ` (${raw.toFixed(1)})` : "";
              return [`${value}/5${rawStr}`, props.payload.metric];
            }}
          />
          <Radar
            dataKey="score"
            stroke={strokeColor}
            fill={fillColor}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Score breakdown */}
      <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-0 text-xs" style={{ fontFamily: mono }}>
        {scores.map((s) => (
          <div key={s.metric} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${GR2}` }}>
            <span style={{ fontFamily: sans, color: TM }}>{s.metric}</span>
            <span className="font-bold" style={{
              color: s.score >= 4 ? GRN : s.score >= 3 ? INK : RED,
            }}>
              {s.score}/5
              {s.raw != null && (
                <span className="ml-1 font-normal" style={{ color: TM }}>({s.raw.toFixed(1)})</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
