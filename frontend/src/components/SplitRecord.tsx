"use client";

import { useState } from "react";
import type { SplitItem } from "@/lib/api";

interface Props {
  splits: SplitItem[];
}

const sans  = "var(--font-sans-label), 'Helvetica Neue', sans-serif";
const mono  = "var(--font-mono-data), 'Courier New', monospace";
const INK   = "#1a1a1a";
const TM    = "#888888";
const GRY   = "#c8c8c8";
const GR2   = "#d8d0c4";
const BLU   = "#8a8a8a";
const GRN   = "#c9a96e";
const RED   = "#b07050";

export default function SplitRecord({ splits }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (splits.length === 0) return null;

  const display = showAll ? splits : splits.slice(-5);

  return (
    <div>
      <h3 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>
        Stock Splits
        <span className="ml-2 text-[10px] font-normal" style={{ color: TM }}>({splits.length} total)</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: mono }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}` }}>
              <th className="py-1.5 text-left text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Date</th>
              <th className="py-1.5 text-left text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Type</th>
              <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Ratio</th>
            </tr>
          </thead>
          <tbody>
            {display.map((s, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${GR2}` }}>
                <td className="py-1.5" style={{ color: INK }}>{s.date}</td>
                <td className="py-1.5 font-bold" style={{ color: s.type === "Forward" ? GRN : RED }}>
                  {s.type}
                </td>
                <td className="py-1.5 text-right font-bold tabular-nums" style={{ color: INK }}>
                  {s.ratio > 1 ? `${s.ratio}:1` : `1:${(1 / s.ratio).toFixed(0)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {splits.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] hover:underline"
          style={{ fontFamily: sans, color: BLU }}
        >
          View All ({splits.length})
        </button>
      )}
    </div>
  );
}
