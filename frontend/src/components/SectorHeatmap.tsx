"use client";

import type { SectorItem } from "@/lib/api";
import { WHT, GRY, mono, sans } from "@/lib/wsj";

/* Color intensity based on magnitude */
function sectorColor(pct: number): string {
  const abs = Math.min(Math.abs(pct), 4); // cap at 4% for color scaling
  const intensity = abs / 4; // 0..1
  if (pct >= 0) {
    // green tones (newspaper gold-green)
    const r = Math.round(201 - intensity * 60);
    const g = Math.round(169 - intensity * 20);
    const b = Math.round(110 - intensity * 40);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // red tones (wsj warm red)
    const r = Math.round(176 + intensity * 30);
    const g = Math.round(112 - intensity * 40);
    const b = Math.round(80 - intensity * 20);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

interface Props {
  sectors: SectorItem[];
}

export default function SectorHeatmap({ sectors }: Props) {
  if (!sectors?.length) return null;

  // Sort by absolute change descending
  const sorted = [...sectors].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  );

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-px" style={{ background: GRY }}>
      {sorted.map((s) => (
        <div
          key={s.symbol}
          className="flex flex-col items-center justify-center py-3 px-2 transition-colors"
          style={{ background: sectorColor(s.changePercent ?? 0) }}
        >
          <span
            className="text-[9px] font-extrabold uppercase tracking-[0.12em] mb-1"
            style={{ fontFamily: sans, color: WHT, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            {s.name}
          </span>
          <span
            className="text-[15px] font-bold tabular-nums"
            style={{ fontFamily: mono, color: WHT, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            {(s.changePercent ?? 0) >= 0 ? "+" : ""}{(s.changePercent ?? 0).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}
