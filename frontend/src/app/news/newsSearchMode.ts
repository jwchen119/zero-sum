export type NewsSearchMode = "ticker" | "keyword";

export const DEFAULT_NEWS_TICKER_EXAMPLES = [
  "2330.TW",
  "2317.TW",
  "2454.TW",
  "2303.TW",
  "2412.TW",
  "0050.TW",
] as const;

export const DEFAULT_NEWS_KEYWORD_EXAMPLES = [
  "台積電",
  "鴻海",
  "聯發科",
  "AI伺服器",
  "高股息ETF",
  "台股法說會",
] as const;

export interface NewsSearchState {
  mode: NewsSearchMode;
  query: string;
}

export function getInitialNewsSearchState(searchParams: URLSearchParams): NewsSearchState {
  const keyword = searchParams.get("keyword")?.trim() || "";
  if (keyword) {
    return {
      mode: "keyword",
      query: keyword,
    };
  }

  return {
    mode: "ticker",
    query: searchParams.get("symbol")?.trim().toUpperCase() || "",
  };
}

export function buildNewsUrl(mode: NewsSearchMode, query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "/news";

  const params = new URLSearchParams(
    mode === "ticker"
      ? { symbol: trimmed.toUpperCase() }
      : { keyword: trimmed },
  );
  return `/news?${params.toString()}`;
}
