"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import WSJLayout from "@/components/WSJLayout";
import TickerAutocomplete from "@/components/TickerAutocomplete";
import {
  WHT, INK, GRY, T2, TM, GAIN, LOSS,
  serif, mono, sans,
  Hair, HeavyRule,
} from "@/lib/wsj";
import {
  fetchStockNews, type StockNewsArticle,
  fetchStockNewsByKeyword,
  fetchStockNewsSummary, type StockNewsSummary,
} from "@/lib/api";
import {
  buildNewsUrl,
  DEFAULT_NEWS_KEYWORD_EXAMPLES,
  DEFAULT_NEWS_TICKER_EXAMPLES,
  getInitialNewsSearchState,
  type NewsSearchMode,
} from "./newsSearchMode";

/* ── Source badge colors ── */
const SOURCE_COLORS: Record<string, string> = {
  "Google News": "#4285F4",
  "Yahoo RSS": "#7B1FA2",
  "Yahoo Finance": "#6001D2",
};

const SENTIMENT_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  bullish:  { color: GAIN, bg: "rgba(46, 125, 50, 0.08)",  label: "BULLISH",  icon: "▲" },
  bearish:  { color: LOSS, bg: "rgba(198, 40, 40, 0.08)",  label: "BEARISH",  icon: "▼" },
  neutral:  { color: TM,   bg: "rgba(136, 136, 136, 0.08)", label: "NEUTRAL",  icon: "─" },
  mixed:    { color: "#e65100", bg: "rgba(230, 81, 0, 0.08)", label: "MIXED", icon: "◆" },
};

function timeSince(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function StockNewsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearchState = getInitialNewsSearchState(searchParams);

  const [mode, setMode] = useState<NewsSearchMode>(initialSearchState.mode);
  const [tickerInput, setTickerInput] = useState(
    initialSearchState.mode === "ticker" ? initialSearchState.query : "",
  );
  const [keywordInput, setKeywordInput] = useState(
    initialSearchState.mode === "keyword" ? initialSearchState.query : "",
  );
  const [activeMode, setActiveMode] = useState<NewsSearchMode>(initialSearchState.mode);
  const [activeQuery, setActiveQuery] = useState(initialSearchState.query);
  const [articles, setArticles] = useState<StockNewsArticle[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterSource, setFilterSource] = useState<string | null>(null);

  // AI Summary state
  const [summary, setSummary] = useState<StockNewsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const beginFetch = (nextMode: NewsSearchMode, nextQuery: string) => {
    setActiveMode(nextMode);
    setActiveQuery(nextQuery);
    setLoading(true);
    setError("");
    setFilterSource(null);
    setSummary(null);
    setSummaryError("");
    router.replace(buildNewsUrl(nextMode, nextQuery), { scroll: false });
  };

  const doFetchTicker = (sym: string) => {
    if (!sym) return;
    const clean = sym.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,10}(\.[A-Z]{1,2})?$/.test(clean)) return;
    setMode("ticker");
    setTickerInput(clean);
    beginFetch("ticker", clean);
    fetchStockNews(clean)
      .then((data) => {
        setArticles(data.articles || []);
        setSources(data.sources || []);
        setGeneratedAt(data.generatedAt || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const doFetchKeyword = (rawKeyword: string) => {
    if (!rawKeyword) return;
    const clean = rawKeyword.trim().replace(/\s+/g, " ");
    if (!clean) return;
    setMode("keyword");
    setKeywordInput(clean);
    beginFetch("keyword", clean);
    fetchStockNewsByKeyword(clean)
      .then((data) => {
        setArticles(data.articles || []);
        setSources(data.sources || []);
        setGeneratedAt(data.generatedAt || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const doFetchSummary = (sym: string) => {
    if (!sym || summaryLoading || activeMode !== "ticker") return;
    setSummaryLoading(true);
    setSummaryError("");
    fetchStockNewsSummary(sym)
      .then(setSummary)
      .catch((e) => setSummaryError(e.message))
      .finally(() => setSummaryLoading(false));
  };

  useEffect(() => {
    if (!initialSearchState.query) return;
    if (initialSearchState.mode === "keyword") {
      doFetchKeyword(initialSearchState.query);
      return;
    }
    doFetchTicker(initialSearchState.query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "keyword") {
      doFetchKeyword(keywordInput);
      return;
    }
    doFetchTicker(tickerInput);
  };

  const filtered = filterSource
    ? articles.filter((a) => a.source === filterSource)
    : articles;
  const currentInput = mode === "keyword" ? keywordInput : tickerInput;
  const loadingQuery = activeQuery || currentInput;
  const quickExamples = mode === "keyword"
    ? DEFAULT_NEWS_KEYWORD_EXAMPLES
    : DEFAULT_NEWS_TICKER_EXAMPLES;

  const navContent = (
    <div className="flex items-center gap-4">
      <Link href="/" style={{ fontFamily: sans, color: TM, fontSize: 13 }} className="hover:underline">
        Home
      </Link>
      <span style={{ color: GRY }}>|</span>
      <Link href="/watchlist" style={{ fontFamily: sans, color: TM, fontSize: 13 }} className="hover:underline">
        Watchlist
      </Link>
    </div>
  );

  return (
    <WSJLayout navContent={navContent}>
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        {/* Header */}
        <h1
          className="text-3xl md:text-4xl font-bold tracking-tight mb-1"
          style={{ fontFamily: serif, color: INK }}
        >
          Stock News
        </h1>
        <p className="text-sm mb-4" style={{ color: T2, fontFamily: mono }}>
          Aggregated from multiple free sources — Google News, Yahoo Finance RSS, yfinance
        </p>
        <HeavyRule />

        {/* Search bar */}
        <div className="mt-5 mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("ticker")}
            className="px-3 py-1.5 text-[11px] font-bold tracking-[0.18em] uppercase transition-colors"
            style={{
              fontFamily: sans,
              background: mode === "ticker" ? INK : WHT,
              color: mode === "ticker" ? WHT : INK,
              border: `1.5px solid ${GRY}`,
            }}
          >
            Ticker
          </button>
          <button
            type="button"
            onClick={() => setMode("keyword")}
            className="px-3 py-1.5 text-[11px] font-bold tracking-[0.18em] uppercase transition-colors"
            style={{
              fontFamily: sans,
              background: mode === "keyword" ? INK : WHT,
              color: mode === "keyword" ? WHT : INK,
              border: `1.5px solid ${GRY}`,
            }}
          >
            Keyword (Beta)
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-center">
          <div className="flex-1 max-w-xl">
            {mode === "ticker" ? (
              <TickerAutocomplete
                value={tickerInput}
                onChange={setTickerInput}
                onAdd={(nextTicker) => {
                  setTickerInput(nextTicker);
                  doFetchTicker(nextTicker);
                }}
                placeholder="Enter Taiwan ticker (e.g. 2330.TW)…"
                inputClassName="w-full"
                inputStyle={{
                  fontFamily: mono,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  border: "2px solid #aaa",
                  padding: "10px 12px 10px 34px",
                  color: INK,
                  background: WHT,
                }}
              />
            ) : (
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Enter keyword (beta, e.g. 台積電 or AI伺服器)…"
                className="w-full focus:outline-none"
                style={{
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 600,
                  border: "2px solid #aaa",
                  padding: "10px 12px",
                  color: INK,
                  background: WHT,
                }}
              />
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !currentInput.trim()}
            className="px-5 py-2.5 font-bold text-sm tracking-widest uppercase transition-colors"
            style={{
              fontFamily: sans,
              background: INK,
              color: WHT,
              border: "2px solid transparent",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Loading…" : "Get News"}
          </button>
        </form>
        {mode === "keyword" && (
          <p className="mb-6 text-xs" style={{ fontFamily: mono, color: TM }}>
            Keyword (Beta) uses free-text Google News search and accepts Chinese input. AI summary remains ticker-only for now.
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 mb-4 border" style={{ borderColor: LOSS, color: LOSS, fontFamily: mono, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <p className="animate-pulse text-lg" style={{ fontFamily: serif, color: TM }}>
              Fetching news for {loadingQuery}…
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && activeQuery && articles.length > 0 && (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <span className="text-sm" style={{ fontFamily: mono, color: T2 }}>
                <strong style={{ color: INK }}>{filtered.length}</strong>{" "}
                {filterSource ? `from ${filterSource}` : "articles"} for{" "}
                <strong style={{ color: INK }}>{activeQuery}</strong>
              </span>
              {generatedAt && (
                <span className="text-xs" style={{ fontFamily: mono, color: TM }}>
                  Updated {timeSince(generatedAt)}
                </span>
              )}
            </div>

            {/* ── AI News Summary Panel ── */}
            <div className="mb-6">
              {activeMode === "ticker" && !summary && !summaryLoading && !summaryError && (
                <button
                  onClick={() => doFetchSummary(activeQuery)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold tracking-wider uppercase transition-all hover:opacity-80"
                  style={{
                    fontFamily: sans,
                    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                    color: "#f5f0e8",
                    border: "none",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                  Generate AI News Summary
                </button>
              )}

              {summaryLoading && (
                <div
                  className="p-5 border"
                  style={{ borderColor: GRY, background: "rgba(26, 26, 46, 0.03)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${INK} transparent ${INK} ${INK}` }} />
                    <span className="text-sm animate-pulse" style={{ fontFamily: serif, color: TM }}>
                      Analyzing {articles.length} articles for {activeQuery}… extracting content &amp; generating AI summary
                    </span>
                  </div>
                </div>
              )}

              {activeMode === "ticker" && summaryError && (
                <div className="p-4 border flex items-center justify-between" style={{ borderColor: LOSS, background: "rgba(198, 40, 40, 0.05)" }}>
                  <span className="text-sm" style={{ fontFamily: mono, color: LOSS }}>{summaryError}</span>
                  <button
                    onClick={() => doFetchSummary(activeQuery)}
                    className="text-xs font-bold uppercase tracking-wider px-3 py-1"
                    style={{ fontFamily: sans, color: INK, border: `1px solid ${GRY}` }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {activeMode === "keyword" && (
                <div className="border px-4 py-3" style={{ borderColor: GRY, background: "rgba(0,0,0,0.02)" }}>
                  <p className="text-xs" style={{ fontFamily: mono, color: TM }}>
                    Keyword (Beta) currently returns article lists only. AI summary remains available in ticker mode.
                  </p>
                </div>
              )}

              {activeMode === "ticker" && summary && !summaryLoading && (
                <div className="border" style={{ borderColor: GRY }}>
                  {/* Sentiment header */}
                  {(() => {
                    const cfg = SENTIMENT_CONFIG[summary.sentiment] || SENTIMENT_CONFIG.neutral;
                    return (
                      <div className="p-4" style={{ background: cfg.bg, borderBottom: `1px solid ${GRY}` }}>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl font-bold" style={{ color: cfg.color, fontFamily: mono }}>
                            {cfg.icon}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span
                                className="text-xs font-bold tracking-[0.15em] uppercase px-2 py-0.5"
                                style={{ fontFamily: sans, color: "#fff", background: cfg.color }}
                              >
                                {cfg.label}
                              </span>
                              <span className="text-xs" style={{ fontFamily: mono, color: TM }}>
                                Score: {summary.sentimentScore > 0 ? "+" : ""}{summary.sentimentScore.toFixed(2)}
                              </span>
                              <span className="text-xs" style={{ fontFamily: mono, color: TM }}>
                                · {summary.articlesAnalyzed} articles · {summary.model}
                              </span>
                            </div>
                            <h2 className="text-lg font-bold" style={{ fontFamily: serif, color: INK }}>
                              {summary.headline}
                            </h2>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Summary text */}
                  <div className="p-4" style={{ borderBottom: `1px solid ${GRY}` }}>
                    <div
                      className="text-sm leading-relaxed whitespace-pre-line"
                      style={{ fontFamily: serif, color: INK }}
                    >
                      {summary.summary}
                    </div>
                  </div>

                  {/* Topics / Catalysts / Risks */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                    {/* Key Topics */}
                    {summary.keyTopics.length > 0 && (
                      <div className="p-4" style={{ borderRight: `1px solid ${GRY}`, borderBottom: `1px solid ${GRY}` }}>
                        <h4
                          className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2"
                          style={{ fontFamily: sans, color: TM }}
                        >
                          Key Topics
                        </h4>
                        <ul className="space-y-1">
                          {summary.keyTopics.map((t, i) => (
                            <li key={i} className="text-xs" style={{ fontFamily: mono, color: T2 }}>
                              • {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Catalysts */}
                    {summary.catalysts.length > 0 && (
                      <div className="p-4" style={{ borderRight: `1px solid ${GRY}`, borderBottom: `1px solid ${GRY}` }}>
                        <h4
                          className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2"
                          style={{ fontFamily: sans, color: GAIN }}
                        >
                          ▲ Catalysts
                        </h4>
                        <ul className="space-y-1">
                          {summary.catalysts.map((c, i) => (
                            <li key={i} className="text-xs" style={{ fontFamily: mono, color: T2 }}>
                              • {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risks */}
                    {summary.risks.length > 0 && (
                      <div className="p-4" style={{ borderBottom: `1px solid ${GRY}` }}>
                        <h4
                          className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2"
                          style={{ fontFamily: sans, color: LOSS }}
                        >
                          ▼ Risks
                        </h4>
                        <ul className="space-y-1">
                          {summary.risks.map((r, i) => (
                            <li key={i} className="text-xs" style={{ fontFamily: mono, color: T2 }}>
                              • {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 flex items-center justify-between" style={{ background: "rgba(0,0,0,0.02)" }}>
                    <span className="text-[10px]" style={{ fontFamily: mono, color: TM }}>
                      AI-generated · not financial advice
                    </span>
                    {summary.generatedAt && (
                      <span className="text-[10px]" style={{ fontFamily: mono, color: TM }}>
                        {timeSince(summary.generatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Source filter buttons */}
            {sources.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-5">
                <button
                  onClick={() => setFilterSource(null)}
                  className="px-3 py-1 text-xs font-bold tracking-wider uppercase transition-all"
                  style={{
                    fontFamily: sans,
                    background: !filterSource ? INK : WHT,
                    color: !filterSource ? WHT : INK,
                    border: `1.5px solid ${GRY}`,
                  }}
                >
                  All ({articles.length})
                </button>
                {sources.map((src) => {
                  const count = articles.filter((a) => a.source === src).length;
                  if (count === 0) return null;
                  const active = filterSource === src;
                  return (
                    <button
                      key={src}
                      onClick={() => setFilterSource(active ? null : src)}
                      className="px-3 py-1 text-xs font-bold tracking-wider uppercase transition-all"
                      style={{
                        fontFamily: sans,
                        background: active ? INK : WHT,
                        color: active ? WHT : INK,
                        border: `1.5px solid ${GRY}`,
                      }}
                    >
                      {src} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            <Hair />

            {/* Article list */}
            <div className="mt-4 space-y-0">
              {filtered.map((article, i) => (
                <a
                  key={`${article.link}-${i}`}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div
                    className="py-3.5 px-3 -mx-3 transition-colors"
                    style={{ borderBottom: `1px solid ${GRY}` }}
                  >
                    {/* Title */}
                    <h3
                      className="text-base font-semibold leading-snug mb-1.5 group-hover:underline"
                      style={{ fontFamily: serif, color: INK }}
                    >
                      {article.title}
                    </h3>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Publisher */}
                      {article.publisher && (
                        <span
                          className="text-xs font-medium"
                          style={{ fontFamily: sans, color: T2 }}
                        >
                          {article.publisher}
                        </span>
                      )}

                      {/* Time */}
                      {article.publishedAt && (
                        <>
                          <span style={{ color: GRY }}>·</span>
                          <span
                            className="text-xs"
                            style={{ fontFamily: mono, color: TM }}
                          >
                            {timeSince(article.publishedAt)}
                          </span>
                        </>
                      )}

                      {/* Source badge */}
                      <span
                        className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm"
                        style={{
                          fontFamily: sans,
                          background: SOURCE_COLORS[article.source] || TM,
                          color: "#fff",
                          opacity: 0.85,
                        }}
                      >
                        {article.source}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && activeQuery && articles.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-lg mb-2" style={{ fontFamily: serif, color: TM }}>
              No news found for <strong>{activeQuery}</strong>
            </p>
            <p className="text-sm" style={{ fontFamily: mono, color: TM }}>
              {activeMode === "keyword" ? "Try a broader keyword or check back later" : "Try a different ticker or check back later"}
            </p>
          </div>
        )}

        {/* Initial state */}
        {!loading && !activeQuery && !error && (
          <div className="text-center py-16">
            <p className="text-lg mb-2" style={{ fontFamily: serif, color: TM }}>
              {mode === "keyword" ? "Enter a keyword above to test beta news search" : "Enter a Taiwan ticker symbol above to get started"}
            </p>
            <p className="text-sm" style={{ fontFamily: mono, color: TM }}>
              {mode === "keyword"
                ? "Keyword mode currently searches Google News and accepts Chinese input"
                : "News aggregated from Google News RSS, Yahoo Finance RSS, and yfinance"}
            </p>
            <div className="flex justify-center gap-3 mt-6 flex-wrap">
              {quickExamples.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    if (mode === "keyword") {
                      setKeywordInput(example);
                      doFetchKeyword(example);
                      return;
                    }
                    setTickerInput(example);
                    doFetchTicker(example);
                  }}
                  className="px-4 py-2 text-sm font-bold tracking-widest transition-colors hover:opacity-80"
                  style={{
                    fontFamily: mono,
                    border: `1.5px solid ${GRY}`,
                    color: INK,
                    background: WHT,
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </WSJLayout>
  );
}

export default function StockNewsPage() {
  return (
    <Suspense>
      <StockNewsPageInner />
    </Suspense>
  );
}
