export interface BenchmarkOption {
  label: string;
  value: string;
}

export const TECH_RELATIVE_STRENGTH_BENCHMARK: BenchmarkOption = {
  label: "TWSE 50 ETF (0050.TW)",
  value: "0050.TW",
};

export const TECH_COMPARISON_BENCHMARKS: BenchmarkOption[] = [
  TECH_RELATIVE_STRENGTH_BENCHMARK,
  { label: "Taiwan Technology ETF (0052.TW)", value: "0052.TW" },
];

export const DEFAULT_CHART_TICKER = TECH_RELATIVE_STRENGTH_BENCHMARK.value;

export const TECHNICAL_ETF_INDICES_TICKERS: string[] = [
  "0050.TW",
  "0052.TW",
  "0056.TW",
  "006208.TW",
  "00878.TW",
  "00919.TW",
  "00713.TW",
  "00679B.TWO",
];

export const WATCHLIST_DEFAULT_ETF_TICKERS: string[] = [
  "0050.TW",
  "0052.TW",
  "006208.TW",
  "0056.TW",
  "00878.TW",
];

export const PORTFOLIO_BENCHMARKS: BenchmarkOption[] = [
  { label: "TWSE 50 ETF (0050.TW)", value: "0050.TW" },
  { label: "Taiwan Technology ETF (0052.TW)", value: "0052.TW" },
  { label: "Fubon TWSE 50 ETF (006208.TW)", value: "006208.TW" },
  { label: "Yuanta High Dividend ETF (0056.TW)", value: "0056.TW" },
  { label: "60/40 TW Blend", value: "60/40" },
];

export const DEFAULT_PORTFOLIO_BENCHMARK = PORTFOLIO_BENCHMARKS[0].value;
