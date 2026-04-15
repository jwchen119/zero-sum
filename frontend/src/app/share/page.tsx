"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import WSJLayout from "@/components/WSJLayout";
import { WHT, INK, GRY, BLU, TM, mono, sans, serif, Hair, WSJSection } from "@/lib/wsj";
import { useWatchlist } from "@/lib/useWatchlist";

/**
 * Extract potential ticker symbols from shared text/URL.
 * Looks for 1-5 letter uppercase words that look like stock tickers.
 */
function extractTickers(text: string): string[] {
  const matches = text.match(/\b[A-Z]{1,5}\b/g) || [];
  // Filter common English words that aren't tickers
  const IGNORE = new Set([
    "THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "CAN", "HER",
    "WAS", "ONE", "OUR", "OUT", "HAS", "HIS", "HOW", "ITS", "MAY", "NEW",
    "NOW", "OLD", "SEE", "WAY", "WHO", "DID", "GET", "HIM", "LET", "SAY",
    "SHE", "TOO", "USE", "FROM", "HAVE", "BEEN", "WILL", "WITH", "THAT",
    "THIS", "THEY", "SOME", "WHAT", "WHEN", "MAKE", "LIKE", "TIME", "VERY",
    "YOUR", "JUST", "KNOW", "TAKE", "COME", "MORE", "ONLY", "OVER", "SUCH",
    "INTO", "YEAR", "ALSO", "BACK", "AFTER", "WORK", "WELL", "MOST",
    "CEO", "CFO", "SEC", "IPO", "NYSE", "GDP", "ETF", "USA", "USD",
  ]);
  return [...new Set(matches.filter((m) => !IGNORE.has(m)))];
}

function ShareContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { add, has } = useWatchlist();

  const title = params.get("title") || "";
  const text = params.get("text") || "";
  const url = params.get("url") || "";

  const combined = [title, text, url].filter(Boolean).join(" ");
  const tickers = extractTickers(combined);

  const [added, setAdded] = useState<Set<string>>(new Set());

  const handleAdd = (ticker: string) => {
    add(ticker);
    setAdded((prev) => new Set(prev).add(ticker));
  };

  const handleAddAll = () => {
    for (const t of tickers) {
      add(t);
    }
    setAdded(new Set(tickers));
  };

  // If only one obvious ticker, redirect to stock page
  useEffect(() => {
    if (tickers.length === 1 && !text && !title) {
      router.replace(`/stocks/${tickers[0]}`);
    }
  }, [tickers, text, title, router]);

  return (
    <>
      <WSJSection title="Shared Content" />
      <div className="mt-4 p-4" style={{ background: WHT, border: `1px solid ${GRY}` }}>
        {title && (
          <p className="text-sm font-bold mb-1" style={{ fontFamily: serif, color: INK }}>
            {title}
          </p>
        )}
        {text && (
          <p className="text-sm mb-1" style={{ fontFamily: mono, color: TM, wordBreak: "break-word" }}>
            {text}
          </p>
        )}
        {url && (
          <p className="text-xs" style={{ fontFamily: mono, color: BLU, wordBreak: "break-all" }}>
            {url}
          </p>
        )}
      </div>

      <Hair />

      {tickers.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[9px] font-extrabold uppercase tracking-[0.2em]"
              style={{ fontFamily: sans, color: TM }}
            >
              Detected Tickers ({tickers.length})
            </span>
            {tickers.length > 1 && (
              <button
                onClick={handleAddAll}
                className="px-2.5 py-1 text-[10px] font-bold transition-colors hover:opacity-80"
                style={{ fontFamily: mono, background: INK, color: WHT, border: `1px solid ${INK}` }}
              >
                Add All to Watchlist
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {tickers.map((t) => {
              const alreadyIn = has(t) || added.has(t);
              return (
                <div
                  key={t}
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ background: WHT, border: `1px solid ${GRY}` }}
                >
                  <a
                    href={`/stocks/${t}`}
                    className="text-sm font-bold hover:underline"
                    style={{ fontFamily: mono, color: BLU }}
                  >
                    {t}
                  </a>
                  <button
                    onClick={() => handleAdd(t)}
                    disabled={alreadyIn}
                    className="text-[10px] font-bold px-2 py-0.5 transition-colors disabled:opacity-50"
                    style={{
                      fontFamily: mono,
                      background: alreadyIn ? GRY : INK,
                      color: WHT,
                      border: `1px solid ${alreadyIn ? GRY : INK}`,
                    }}
                  >
                    {alreadyIn ? "✓ Added" : "+ Watchlist"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-8 text-center py-12">
          <p className="text-lg" style={{ fontFamily: serif, color: TM }}>
            No ticker symbols detected
          </p>
          <p className="text-sm mt-2" style={{ fontFamily: mono, color: GRY }}>
            Try sharing content that mentions stock symbols like AAPL, GOOG, etc.
          </p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <a
          href="/watchlist"
          className="px-4 py-2 text-[11px] font-bold transition-colors hover:opacity-80"
          style={{ fontFamily: mono, background: INK, color: WHT }}
        >
          Go to Watchlist
        </a>
        <a
          href="/screener-v4"
          className="px-4 py-2 text-[11px] font-bold transition-colors hover:opacity-80"
          style={{ fontFamily: mono, background: "transparent", color: TM, border: `1px solid ${GRY}` }}
        >
          Open Screener
        </a>
      </div>
    </>
  );
}

export default function SharePage() {
  return (
    <WSJLayout>
      <Suspense fallback={<div className="py-20 text-center" style={{ fontFamily: mono, color: TM }}>Loading...</div>}>
        <ShareContent />
      </Suspense>
    </WSJLayout>
  );
}
