"use client";

import type { HolderItem, HoldersSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Props {
  summary: HoldersSummary;
  holders: HolderItem[];
}

const sans  = "var(--font-sans-label), 'Helvetica Neue', sans-serif";
const mono  = "var(--font-mono-data), 'Courier New', monospace";
const INK   = "#1a1a1a";
const T2    = "#555555";
const TM    = "#888888";
const GRY   = "#c8c8c8";
const GR2   = "#d8d0c4";
const GRN   = "#c9a96e";
const RED   = "#b07050";

export default function HoldersPanel({ summary, holders }: Props) {
  if (holders.length === 0 && !summary.insidersPercent) return null;

  return (
    <div>
      <h3 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ fontFamily: sans, color: INK }}>Institutional Ownership</h3>

      {/* Summary strip */}
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {summary.insidersPercent != null && (
          <div className="px-3 py-1.5" style={{ border: `1px solid ${GRY}` }}>
            <div className="text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Insider</div>
            <div className="font-bold tabular-nums" style={{ fontFamily: mono, color: INK }}>{Number(summary.insidersPercent).toFixed(1)}%</div>
          </div>
        )}
        {summary.institutionsPercent != null && (
          <div className="px-3 py-1.5" style={{ border: `1px solid ${GRY}` }}>
            <div className="text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Institutional</div>
            <div className="font-bold tabular-nums" style={{ fontFamily: mono, color: INK }}>{Number(summary.institutionsPercent).toFixed(1)}%</div>
          </div>
        )}
        {summary.floatPercent != null && (
          <div className="px-3 py-1.5" style={{ border: `1px solid ${GRY}` }}>
            <div className="text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Float Inst.</div>
            <div className="font-bold tabular-nums" style={{ fontFamily: mono, color: INK }}>{Number(summary.floatPercent).toFixed(1)}%</div>
          </div>
        )}
        {summary.institutionCount != null && (
          <div className="px-3 py-1.5" style={{ border: `1px solid ${GRY}` }}>
            <div className="text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}># Institutions</div>
            <div className="font-bold tabular-nums" style={{ fontFamily: mono, color: INK }}>{summary.institutionCount.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Top holders table */}
      {holders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: mono }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}` }}>
                <th className="py-1.5 text-left text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Holder</th>
                <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Shares</th>
                <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>Value</th>
                <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>% Held</th>
                <th className="py-1.5 text-right text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ fontFamily: sans, color: TM }}>% Chg</th>
              </tr>
            </thead>
            <tbody>
              {holders.map((h, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${GR2}` }}>
                  <td className="py-1.5 max-w-xs truncate font-bold" style={{ color: INK, fontFamily: sans, fontSize: 12 }}>{h.holder}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: T2 }}>
                    {h.shares ? (h.shares / 1e6).toFixed(1) + "M" : "—"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: T2 }}>
                    {h.value ? formatCurrency(h.value) : "—"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: T2 }}>
                    {h.pctHeld != null ? `${(h.pctHeld * 100).toFixed(2)}%` : "—"}
                  </td>
                  <td className="py-1.5 text-right font-bold tabular-nums" style={{
                    color: (h.pctChange ?? 0) > 0 ? GRN : (h.pctChange ?? 0) < 0 ? RED : TM,
                  }}>
                    {h.pctChange != null ? `${(h.pctChange * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
