"use client";

import type { EarningsCalendarItem } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { INK, GRY, TM, T2, mono, sans, serif } from "@/lib/wsj";

function fmtMcap(v: number | null): string {
  if (!v) return "";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v}`;
}

function fmtDate(d: string): string {
  if (!d) return "";
  return formatShortDate(d);
}

interface Props {
  earnings: EarningsCalendarItem[];
  onTickerClick?: (ticker: string) => void;
}

export default function EarningsCalendarWidget({ earnings, onTickerClick }: Props) {
  if (!earnings?.length) return null;

  return (
    <div className="space-y-0">
      {earnings.map((e, i) => (
        <div
          key={`${e.symbol}-${i}`}
          className="flex items-center justify-between py-2"
          style={{ borderTop: i > 0 ? `1px solid ${GRY}66` : "none" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => onTickerClick?.(e.symbol)}
              className="text-[12px] font-bold hover:underline cursor-pointer shrink-0"
              style={{ fontFamily: mono, color: INK, minWidth: "3.5rem" }}
            >
              {e.symbol}
            </button>
            <span
              className="text-[11px] truncate"
              style={{ fontFamily: serif, color: T2, maxWidth: "140px" }}
            >
              {e.company}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {e.epsEstimate != null && (
              <span className="text-[10px] tabular-nums" style={{ fontFamily: mono, color: TM }}>
                Est ${e.epsEstimate.toFixed(2)}
              </span>
            )}
            {e.timing && (
              <span
                className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 border"
                style={{ fontFamily: sans, color: TM, borderColor: GRY }}
              >
                {e.timing}
              </span>
            )}
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ fontFamily: mono, color: INK, minWidth: "4rem", textAlign: "right" }}
            >
              {fmtDate(e.date)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
