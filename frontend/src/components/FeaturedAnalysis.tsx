"use client";

import { type CoverageTickerItem } from "@/lib/api";
import { INK, GRY, TM, serif, mono, sans } from "@/lib/wsj";

interface Props {
  tickers: CoverageTickerItem[];
  onTickerClick?: (ticker: string) => void;
}

/** Featured AI analysis teaser — shows a random analysis to entice clicks. */
export default function FeaturedAnalysis({ tickers, onTickerClick }: Props) {
  if (!tickers?.length) return null;

  /* Pick the first 3 tickers as featured (could randomize with seed) */
  const featured = tickers.slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {featured.map((item) => (
        <button
          key={item.ticker}
          className="text-left p-4 border transition-all cursor-pointer group"
          style={{ borderColor: GRY }}
          onClick={() => onTickerClick?.(item.ticker)}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = INK; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = GRY; }}
        >
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-[14px] font-extrabold tracking-wider"
              style={{ fontFamily: mono, color: INK }}
            >
              {item.ticker}
            </span>
            <span
              className="text-[10px] truncate"
              style={{ fontFamily: serif, color: TM }}
            >
              {item.companyName}
            </span>
          </div>
          <p
            className="text-[11px] leading-relaxed line-clamp-4"
            style={{ fontFamily: serif, color: INK }}
          >
            {item.summary}
          </p>
          <div className="mt-3 flex items-center gap-1">
            <span
              className="text-[8px] uppercase tracking-[0.15em] font-bold group-hover:underline"
              style={{ fontFamily: sans, color: TM }}
            >
              Read Full AI Analysis →
            </span>
          </div>
          <div className="text-[8px] mt-1" style={{ fontFamily: mono, color: TM }}>
            Generated {new Date(item.generatedAt).toLocaleDateString()}
          </div>
        </button>
      ))}
    </div>
  );
}
