"use client";

import type { CoverageTickerItem } from "@/lib/api";
import { INK, WHT, GRY, TM, T2, BG, mono, sans, serif } from "@/lib/wsj";

interface Props {
  tickers: CoverageTickerItem[];
  onTickerClick?: (ticker: string) => void;
}

export default function OurCoverage({ tickers, onTickerClick }: Props) {
  if (!tickers?.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: GRY }}>
      {tickers.map((t) => (
        <button
          key={t.ticker}
          onClick={() => onTickerClick?.(t.ticker)}
          className="text-left p-4 transition-colors cursor-pointer"
          style={{ background: WHT }}
          onMouseEnter={(e) => { e.currentTarget.style.background = BG; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = WHT; }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[16px] font-bold"
              style={{ fontFamily: mono, color: INK }}
            >
              {t.ticker}
            </span>
            <span
              className="text-[10px] truncate"
              style={{ fontFamily: sans, color: TM }}
            >
              {t.companyName}
            </span>
          </div>
          <p
            className="text-[11px] leading-relaxed line-clamp-3"
            style={{ fontFamily: serif, color: T2 }}
          >
            {t.summary}
          </p>
        </button>
      ))}
    </div>
  );
}
