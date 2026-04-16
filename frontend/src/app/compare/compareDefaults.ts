export const DEFAULT_COMPARE_TICKERS = ["2330.TW", "0050.TW"] as const;

export function getInitialCompareTickers(
  tickersParam: string | null | undefined,
): string[] {
  const initial =
    tickersParam
      ?.split(",")
      .filter(Boolean)
      .map((ticker) => ticker.trim().toUpperCase())
      .slice(0, 5) || [];

  return initial.length > 0 ? initial : [...DEFAULT_COMPARE_TICKERS];
}
