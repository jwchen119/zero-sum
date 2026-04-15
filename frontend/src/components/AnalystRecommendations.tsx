"use client";

import type { RecommendationItem } from "@/lib/api";

interface Props {
  recommendations: RecommendationItem[];
}

const sans  = "var(--font-sans-label), 'Helvetica Neue', sans-serif";
const mono  = "var(--font-mono-data), 'Courier New', monospace";
const INK   = "#1a1a1a";
const T2    = "#555555";
const TM    = "#888888";
const GRY   = "#c8c8c8";
const GR2   = "#d8d0c4";
const BLU   = "#8a8a8a";
const RED   = "#b07050";
const GRN   = "#c9a96e";

export default function AnalystRecommendations({ recommendations }: Props) {
  if (recommendations.length === 0) return null;

  const latest = recommendations[0];
  const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell;
  if (total === 0) return null;

  const segments = [
    { label: "Strong Buy", count: latest.strongBuy, color: GRN },
    { label: "Buy", count: latest.buy, color: GRN },
    { label: "Hold", count: latest.hold, color: TM },
    { label: "Sell", count: latest.sell, color: T2 },
    { label: "Strong Sell", count: latest.strongSell, color: RED },
  ];

  const buyish = latest.strongBuy + latest.buy;
  const sellish = latest.sell + latest.strongSell;
  let consensus = "Hold";
  if (buyish > latest.hold + sellish) consensus = "Buy";
  if (latest.strongBuy > latest.buy) consensus = "Strong Buy";
  if (sellish > latest.hold + buyish) consensus = "Sell";

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Analyst Recommendations</h3>
        <span className="text-[10px] font-bold" style={{ fontFamily: mono, color: TM }}>{latest.period}</span>
      </div>

      {/* Consensus */}
      <div className="mb-3">
        <span className="text-xs font-bold px-2 py-0.5" style={{
          fontFamily: mono,
          border: `1px solid ${GRY}`,
          color: consensus.includes("Buy") ? GRN : consensus.includes("Sell") ? RED : INK,
        }}>
          {consensus} ({total} analysts)
        </span>
      </div>

      {/* Horizontal stacked bar */}
      <div className="mb-3 flex h-6 overflow-hidden" style={{ border: `1px solid ${GRY}` }}>
        {segments.map((s) => {
          const pct = (s.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={s.label}
              style={{ width: `${pct}%`, backgroundColor: s.color }}
              className="flex items-center justify-center text-[10px] font-bold text-white transition-all"
              title={`${s.label}: ${s.count}`}
            >
              {pct >= 8 ? s.count : ""}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px]" style={{ fontFamily: sans, color: TM }}>
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2" style={{ backgroundColor: s.color }} />
            {s.label}: {s.count}
          </div>
        ))}
      </div>

      {/* Trend table */}
      {recommendations.length > 1 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs" style={{ fontFamily: mono }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}` }}>
                <th className="py-1 text-left text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Month</th>
                <th className="py-1 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Str Buy</th>
                <th className="py-1 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Buy</th>
                <th className="py-1 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Hold</th>
                <th className="py-1 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Sell</th>
                <th className="py-1 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Str Sell</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.slice(0, 4).map((r) => (
                <tr key={r.period} style={{ borderTop: `1px solid ${GR2}` }}>
                  <td className="py-1 font-bold" style={{ color: INK }}>{r.period}</td>
                  <td className="py-1 text-right" style={{ color: GRN }}>{r.strongBuy}</td>
                  <td className="py-1 text-right" style={{ color: GRN }}>{r.buy}</td>
                  <td className="py-1 text-right" style={{ color: TM }}>{r.hold}</td>
                  <td className="py-1 text-right" style={{ color: T2 }}>{r.sell}</td>
                  <td className="py-1 text-right" style={{ color: RED }}>{r.strongSell}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
