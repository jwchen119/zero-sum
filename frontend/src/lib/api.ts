import { DEFAULT_PORTFOLIO_BENCHMARK } from "@/lib/benchmarks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/* ─── Shared types ─── */

export interface PriceBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IncomeItem {
  period: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  eps: number | null;
}

export interface DividendItem {
  period: string;
  total: number;
  payments: number;
  perPayment: number;
  incomplete: boolean;
  medianPayments: number | null;
}

export interface Ratios {
  name: string;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  grossMargin: number | null;
  epsTrailing: number | null;
  epsForward: number | null;
  dividendRate: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  // Extended ratios
  beta: number | null;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  priceToBook: number | null;
  freeCashflow: number | null;
  operatingCashflow: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  sharesOutstanding: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  averageVolume: number | null;
}

export interface CompanyProfile {
  name: string;
  description: string | null;
  website: string | null;
  sector: string | null;
  industry: string | null;
  employees: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface Officer {
  name: string | null;
  title: string | null;
  totalPay: number | null;
  exercisedValue: number | null;
  yearBorn: number | null;
}

export interface RecommendationItem {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface SplitItem {
  date: string;
  ratio: number;
  type: string;
}

export interface PricesResponse {
  ticker: string;
  data: PriceBar[];
}

export interface FundamentalsResponse {
  ticker: string;
  quarterly: boolean;
  income: IncomeItem[];
  dividends: DividendItem[];
  ratios: Ratios;
  profile: CompanyProfile;
  officers: Officer[];
  recommendations: RecommendationItem[];
  calendar: Record<string, unknown>;
  splits: SplitItem[];
}

/* ─── Balance Sheet ─── */

export interface BalanceSheetItem {
  period: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  stockholdersEquity: number | null;
  totalDebt: number | null;
  cash: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  goodwill: number | null;
  retainedEarnings: number | null;
  longTermDebt: number | null;
}

export interface BalanceSheetResponse {
  ticker: string;
  quarterly: boolean;
  items: BalanceSheetItem[];
}

/* ─── Cash Flow ─── */

export interface CashFlowItem {
  period: string;
  operatingCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;
  freeCashFlow: number | null;
  capex: number | null;
  dividendsPaid: number | null;
  stockBuyback: number | null;
  debtRepayment: number | null;
  debtIssuance: number | null;
  netChangeInCash: number | null;
}

export interface CashFlowResponse {
  ticker: string;
  quarterly: boolean;
  items: CashFlowItem[];
}

/* ─── Holders ─── */

export interface HolderItem {
  holder: string;
  shares: number | null;
  value: number | null;
  pctHeld: number | null;
  pctChange: number | null;
  dateReported: string;
}

export interface HoldersSummary {
  insidersPercent?: number | null;
  institutionsPercent?: number | null;
  floatPercent?: number | null;
  institutionCount?: number | null;
}

export interface HoldersResponse {
  ticker: string;
  summary: HoldersSummary;
  holders: HolderItem[];
}

/* ─── AI Analysis ─── */

export interface AnalysisPoint {
  title: string;
  detail: string;
}

export interface FiveYearTrend {
  summary: string;
  strengths: string[];
  risks: string[];
  outlook: string;
}

export interface InvestmentThesis {
  bullCase: string[];
  bearCase: string[];
}

export interface AiAnalysis {
  ticker: string;
  companyName: string;
  generatedAt: string;
  model: string;
  goingWell: AnalysisPoint[];
  concerns: AnalysisPoint[];
  fiveYearTrend: FiveYearTrend;
  plainEnglish: string;
  investmentThesis: InvestmentThesis;
  _notEligible?: boolean;
}

/* ─── API fetch functions ─── */

export async function fetchPrices(
  ticker: string,
  period: string = "5y",
  signal?: AbortSignal,
  interval: string = "1d",
): Promise<PricesResponse> {
  const params = new URLSearchParams({ ticker, period });
  if (interval !== "1d") params.set("interval", interval);
  const res = await fetch(
    `${API_BASE}/api/prices?${params.toString()}`,
    signal ? { signal } : undefined,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch prices (${res.status})`);
  }
  return res.json();
}

export async function fetchFundamentals(
  ticker: string,
  quarterly: boolean = false
): Promise<FundamentalsResponse> {
  const res = await fetch(
    `${API_BASE}/api/fundamentals?ticker=${encodeURIComponent(ticker)}&quarterly=${quarterly}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch fundamentals (${res.status})`);
  }
  return res.json();
}

export async function fetchBalanceSheet(
  ticker: string,
  quarterly: boolean = false
): Promise<BalanceSheetResponse> {
  const res = await fetch(
    `${API_BASE}/api/balance-sheet?ticker=${encodeURIComponent(ticker)}&quarterly=${quarterly}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch balance sheet (${res.status})`);
  }
  return res.json();
}

export async function fetchCashFlow(
  ticker: string,
  quarterly: boolean = false
): Promise<CashFlowResponse> {
  const res = await fetch(
    `${API_BASE}/api/cashflow?ticker=${encodeURIComponent(ticker)}&quarterly=${quarterly}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch cash flow (${res.status})`);
  }
  return res.json();
}

export async function fetchHolders(
  ticker: string
): Promise<HoldersResponse> {
  const res = await fetch(
    `${API_BASE}/api/holders?ticker=${encodeURIComponent(ticker)}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch holders (${res.status})`);
  }
  return res.json();
}

export async function fetchAnalysis(
  ticker: string
): Promise<AiAnalysis | null> {
  const res = await fetch(
    `${API_BASE}/api/analyze?ticker=${encodeURIComponent(ticker)}`
  );
  if (res.status === 404) return null; // no analysis available — not an error
  if (res.status === 403) {
    return { _notEligible: true } as AiAnalysis;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch analysis (${res.status})`);
  }
  return res.json();
}

/* ─── Ticker List (Autocomplete) ─── */

export interface TickerInfo {
  symbol: string;
  name: string;
  sector: string;
}

let _tickerListCache: TickerInfo[] | null = null;

export async function fetchTickerList(): Promise<TickerInfo[]> {
  if (_tickerListCache) return _tickerListCache;
  const res = await fetch(`${API_BASE}/api/ticker-list`);
  if (!res.ok) throw new Error("Failed to fetch ticker list");
  _tickerListCache = await res.json();
  return _tickerListCache!;
}

/* ─── Bulk Prices (Screener) ─── */

export interface BulkPricesResponse {
  tickers: string[];
  data: Record<string, PriceBar[]>;
}

export async function fetchBulkPrices(
  tickers: string[],
  period: string = "5y"
): Promise<BulkPricesResponse> {
  const tickerStr = tickers.join(",");
  const res = await fetch(
    `${API_BASE}/api/bulk-prices?tickers=${encodeURIComponent(tickerStr)}&period=${encodeURIComponent(period)}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch bulk prices (${res.status})`);
  }
  return res.json();
}

/* ─── Bulk Fundamentals (Screener) ─── */

export interface MiniFinancialPeriod {
  period: string;
  revenue: number | null;
  netIncome: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
}

export interface MiniDividendPeriod {
  period: string;
  total: number;
  payments: number;
  incomplete: boolean;
}

export interface BulkFundamentalsEntry {
  income: MiniFinancialPeriod[];
  dividends: MiniDividendPeriod[];
  dividendYield: number | null;
}

export interface BulkFundamentalsResponse {
  tickers: string[];
  data: Record<string, BulkFundamentalsEntry>;
}

export async function fetchBulkFundamentals(
  tickers: string[]
): Promise<BulkFundamentalsResponse> {
  const tickerStr = tickers.join(",");
  const res = await fetch(
    `${API_BASE}/api/bulk-fundamentals?tickers=${encodeURIComponent(tickerStr)}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch bulk fundamentals (${res.status})`);
  }
  return res.json();
}

/* ─── Landing Page: Market Summary ─── */

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  category: string;
}

export interface MarketStatus {
  status: string;
  message: string;
}

export interface MarketSummaryResponse {
  items: MarketItem[];
  marketStatus: MarketStatus;
  generatedAt: string;
}



/* ─── Landing Page: Sector Performance ─── */

export interface SectorItem {
  symbol: string;
  name: string;
  changePercent: number;
  price: number;
}

export interface SectorPerformanceResponse {
  sectors: SectorItem[];
  generatedAt: string;
}



/* ─── Landing Page: Market Movers ─── */

export interface MoverItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

export interface MarketMoversResponse {
  gainers: MoverItem[];
  losers: MoverItem[];
  mostActive: MoverItem[];
  generatedAt: string;
}



/* ─── Landing Page: Earnings Calendar ─── */

export interface EarningsCalendarItem {
  symbol: string;
  company: string;
  date: string;
  timing: string;
  epsEstimate: number | null;
  marketCap: number | null;
}

export interface EarningsCalendarResponse {
  earnings: EarningsCalendarItem[];
  generatedAt: string;
}



/* ─── Landing Page: Market News ─── */

export interface NewsArticle {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
}

export interface MarketNewsResponse {
  articles: NewsArticle[];
  generatedAt: string;
}



/* ─── Stock News (per-ticker, multi-source) ─── */

export interface StockNewsArticle extends NewsArticle {
  source: string;
}

export interface StockNewsResponse {
  ticker: string;
  articles: StockNewsArticle[];
  sources: string[];
  generatedAt: string;
}

export async function fetchStockNews(ticker: string): Promise<StockNewsResponse> {
  const res = await fetch(`${API_BASE}/api/stock-news?symbol=${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch stock news (${res.status})`);
  }
  return res.json();
}

export interface KeywordNewsResponse {
  query: string;
  articles: StockNewsArticle[];
  sources: string[];
  generatedAt: string;
}

export async function fetchStockNewsByKeyword(keyword: string): Promise<KeywordNewsResponse> {
  const res = await fetch(`${API_BASE}/api/stock-news-keyword?keyword=${encodeURIComponent(keyword)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch keyword news (${res.status})`);
  }
  return res.json();
}

/* ─── Stock News AI Summary ─── */

export interface StockNewsSummary {
  ticker: string;
  sentiment: "bullish" | "bearish" | "neutral" | "mixed";
  sentimentScore: number;
  headline: string;
  summary: string;
  keyTopics: string[];
  risks: string[];
  catalysts: string[];
  articlesAnalyzed: number;
  generatedAt: string;
  model: string;
  error?: string;
}

export async function fetchStockNewsSummary(ticker: string): Promise<StockNewsSummary> {
  const res = await fetch(`${API_BASE}/api/stock-news-summary?symbol=${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch news summary (${res.status})`);
  }
  return res.json();
}

/* ─── Landing Page: Coverage Tickers ─── */

export interface CoverageTickerItem {
  ticker: string;
  companyName: string;
  summary: string;
  generatedAt: string;
}

export interface CoverageTickersResponse {
  tickers: CoverageTickerItem[];
  generatedAt: string;
}



/* ─── Landing Page: ETF Overview ─── */

export interface ETFItem {
  symbol: string;
  name: string;
  fullName: string;
  category: string;
  price: number;
  changePercent: number;
  ytdPercent: number | null;
  totalAssets: number;
}

export interface ETFOverviewResponse {
  etfs: ETFItem[];
  generatedAt: string;
}



/* ─── Combined Landing Endpoint ─── */

export interface CongressTradeItem {
  member: string;
  party: string;
  chamber: string;
  ticker: string;
  company: string;
  sector: string;
  type: string;
  amountRange: string;
  tradeDate: string;
  disclosureDate: string;
  currentPrice: number;
}

export interface CongressTradesSummary {
  totalBuys: number;
  totalSells: number;
  uniqueTickers: number;
  mostTraded: { ticker: string; trades: number }[];
  partyBreakdown: Record<string, { total: number; buys: number; sells: number }>;
}

export interface LandingCongressData {
  trades: CongressTradeItem[];
  summary: CongressTradesSummary;
  totalCount: number;
}

export interface InsiderTradeItem {
  ticker: string;
  company: string;
  insider: string;
  position: string;
  type: string;
  date: string;
  shares: number;
  value: number;
}

export interface LandingInsiderData {
  transactions: InsiderTradeItem[];
}

export interface LandingData {
  marketSummary: MarketSummaryResponse | null;
  sectorPerformance: SectorPerformanceResponse | null;
  marketMovers: MarketMoversResponse | null;
  earningsCalendar: EarningsCalendarResponse | null;
  marketNews: MarketNewsResponse | null;
  coverageTickers: CoverageTickersResponse | null;
  etfOverview: ETFOverviewResponse | null;
  congressTrades: LandingCongressData | null;
  insiderTrades: LandingInsiderData | null;
}

export async function fetchLanding(): Promise<LandingData> {
  const res = await fetch(`${API_BASE}/api/landing`);
  if (!res.ok) {
    throw new Error(`Failed to fetch landing data (${res.status})`);
  }
  return res.json();
}

/* ─── Stock Screener ─── */

export interface ScreenerStock {
  symbol: string;
  shortName: string | null;
  localName?: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  priceToSalesTrailing12Months: number | null;
  trailingEps: number | null;
  forwardEps: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  earningsQuarterlyGrowth: number | null;
  profitMargins: number | null;
  operatingMargins: number | null;
  grossMargins: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  dividendYield: number | null;
  dividendRate: number | null;
  payoutRatio: number | null;
  beta: number | null;
  averageVolume: number | null;
  totalRevenue: number | null;
  totalDebt: number | null;
  totalCash: number | null;
  freeCashflow: number | null;
  operatingCashflow: number | null;
  recommendationKey: string | null;
  recommendationMean: number | null;
  numberOfAnalystOpinions: number | null;
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  ytdReturn: number | null;
  inTWSE: boolean;
}

export interface ScreenerResponse {
  stocks: ScreenerStock[];
  sectors: string[];
  count: number;
  total: number;
}

export interface ScreenerParams {
  index?: string;
  sector?: string;
  industry?: string;
  sort?: string;
  order?: "asc" | "desc";
  minCap?: number;
  maxCap?: number;
  maxPe?: number;
  minDivYield?: number;
  search?: string;
}

export async function fetchScreener(params: ScreenerParams = {}): Promise<ScreenerResponse> {
  const qs = new URLSearchParams();
  if (params.index) qs.set("index", params.index);
  if (params.sector) qs.set("sector", params.sector);
  if (params.industry) qs.set("industry", params.industry);
  if (params.sort) qs.set("sort", params.sort);
  if (params.order) qs.set("order", params.order);
  if (params.minCap != null) qs.set("minCap", String(params.minCap));
  if (params.maxCap != null) qs.set("maxCap", String(params.maxCap));
  if (params.maxPe != null) qs.set("maxPe", String(params.maxPe));
  if (params.minDivYield != null) qs.set("minDivYield", String(params.minDivYield));
  if (params.search) qs.set("search", params.search);
  const res = await fetch(`${API_BASE}/api/screener?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Screener failed (${res.status})`);
  }
  return res.json();
}


// ─── Heatmap / Bubble Chart ─────────────────────────────

export interface HeatmapStock {
  symbol: string;
  shortName: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number;
  changePercent: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  averageVolume: number | null;
  volume: number | null;
  inTWSE: boolean;
  sparkline?: number[];
  debug?: {
    latestDate: string | null;
    latestClose: number | null;
    refDate: string | null;
    refClose: number | null;
  };
}

export interface HeatmapResponse {
  stocks: HeatmapStock[];
  sectors: string[];
  industries: string[];
  count: number;
}

export interface HeatmapParams {
  index?: "twse";
  sector?: string;
  period?: "1d" | "1w" | "1m" | "ytd";
}

export async function fetchHeatmap(params: HeatmapParams = {}): Promise<HeatmapResponse> {
  const qs = new URLSearchParams();
  if (params.index) qs.set("index", params.index);
  if (params.sector) qs.set("sector", params.sector);
  if (params.period) qs.set("period", params.period);
  const res = await fetch(`${API_BASE}/api/heatmap?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Heatmap failed (${res.status})`);
  }
  return res.json();
}


/* ─── Sectors ─── */

export interface SectorOverview {
  name: string;
  stockCount: number;
  totalMarketCap: number;
  avgPE: number | null;
  meanPE: number | null;
  medianPE: number | null;
  avgDividendYield: number | null;
  avgRevenueGrowth: number | null;
  avgProfitMargin: number | null;
  topStocks: { symbol: string; shortName: string | null; marketCap: number | null }[];
  industries: string[];
}

export interface SectorsResponse {
  sectors: SectorOverview[];
}

export async function fetchSectors(): Promise<SectorsResponse> {
  const res = await fetch(`${API_BASE}/api/sectors`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch sectors (${res.status})`);
  }
  return res.json();
}

export interface IndustryOverview {
  name: string;
  stockCount: number;
  totalMarketCap: number;
  avgPE: number | null;
  avgDividendYield: number | null;
}

export interface SectorDetailResponse {
  sector: string;
  stockCount: number;
  totalMarketCap: number;
  industries: IndustryOverview[];
  stocks: ScreenerStock[];
}

export async function fetchSectorDetail(sector: string): Promise<SectorDetailResponse> {
  const res = await fetch(
    `${API_BASE}/api/sectors/${encodeURIComponent(sector)}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch sector detail (${res.status})`);
  }
  return res.json();
}


/* ─── Dividend Screener ─── */

export interface DividendEvent {
  date: string | null;
  div: number | null;
  pxPrev: number | null;
  yld: number | null;
  refType?: "prev" | "same_day" | "next_7d" | "current_price" | null;
}

export interface DividendYearBucket {
  year: number;
  events: DividendEvent[];
  totalYld: number | null;
}

export interface DividendEpsPoint {
  year: number;
  eps: number | null;
}

export interface DividendSortKeys {
  lyTotalYld: number | null;
  compareTotalYld?: number | null;
  progressTotalYld?: number | null;
  h5yAvgAnnualYld: number | null;
  h5yLatestYearYld: number | null;
}

export interface DividendStock extends ScreenerStock {
  exDividendDate?: string | null;
  fiveYearAvgDividendYield?: number | null;
  trailingAnnualDividendRate?: number | null;
  trailingAnnualDividendYield?: number | null;
  lastDividendValue?: number | null;
  lastDividendDate?: string | null;
  avgClose2023?: number | null;
  avgCloseLast90d?: number | null;
  priceChangePct3mVs2023?: number | null;
  compare?: DividendYearBucket | null;
  progress?: DividendYearBucket | null;
  ly?: DividendYearBucket | null;
  h5y?: DividendYearBucket[] | null;
  eps5y?: DividendEpsPoint[] | null;
  sortKeys?: DividendSortKeys | null;
}

export interface DividendScreenerResponse {
  stocks: DividendStock[];
  sectors: string[];
  count: number;
  anchorYear?: number | null;
  compareYear?: number | null;
  progressYear?: number | null;
  windowYears?: number | null;
  lastFullYear?: number | null;
}

export interface DividendScreenerParams {
  minYield?: number;
  maxYield?: number;
  sector?: string;
  minCap?: number;
}

export async function fetchDividendScreener(
  params: DividendScreenerParams = {}
): Promise<DividendScreenerResponse> {
  const qs = new URLSearchParams();
  if (params.minYield != null) qs.set("minYield", String(params.minYield));
  if (params.maxYield != null) qs.set("maxYield", String(params.maxYield));
  if (params.sector) qs.set("sector", params.sector);
  if (params.minCap != null) qs.set("minCap", String(params.minCap));
  const res = await fetch(`${API_BASE}/api/dividend-screener?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Dividend screener failed (${res.status})`);
  }
  return res.json();
}


/* ─── Financial Statements ─── */

export interface FinancialRow {
  label: string;
  values: (number | null)[];
  growth: (number | null)[];
}

export interface FinancialStatement {
  periods: string[];
  rows: FinancialRow[];
}

export interface FinancialsResponse {
  ticker: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  annual: {
    income: FinancialStatement;
    balance: FinancialStatement;
    cashflow: FinancialStatement;
  };
  quarterly: {
    income: FinancialStatement;
    balance: FinancialStatement;
    cashflow: FinancialStatement;
  };
}

export async function fetchFinancials(ticker: string): Promise<FinancialsResponse> {
  const res = await fetch(
    `${API_BASE}/api/financials/${encodeURIComponent(ticker)}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch financials (${res.status})`);
  }
  return res.json();
}


/* ─── Stock Comparison ─── */

export interface ComparePrice {
  date: string;
  close: number;
  normalized: number;
}

export interface CompareFundamentals {
  shortName: string | null;
  sector: string | null;
  industry: string | null;
  [key: string]: unknown;
}

export interface CompareResponse {
  tickers: string[];
  prices: Record<string, ComparePrice[]>;
  fundamentals: Record<string, CompareFundamentals>;
  periodReturns: Record<string, Record<string, number>>;
  riskMetrics: Record<string, { annualizedReturn: number | null; annualizedVolatility: number | null }>;
  correlation: Record<string, Record<string, number>>;
}

export async function fetchCompare(tickers: string[]): Promise<CompareResponse> {
  const res = await fetch(
    `${API_BASE}/api/compare?tickers=${encodeURIComponent(tickers.join(","))}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Compare failed (${res.status})`);
  }
  return res.json();
}


/* ═══════════════════════════════════════════════════════════
   TRADING SIGNAL FEATURES
   ═══════════════════════════════════════════════════════════ */


/* ─── #1 Technical Scanner ─── */

export interface ScannerSignal {
  type: string;
  label: string;
  bias: "bullish" | "bearish";
}

export interface ScannerStock {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;
  price: number;
  change_pct: number | null;
  marketCap: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  bb_upper: number | null;
  bb_lower: number | null;
  bb_pct: number | null;
  atr: number | null;
  volume: number | null;
  avg_volume_20: number | null;
  volume_ratio: number | null;
  trend: string;
  signals: ScannerSignal[];
}

export interface ScannerResponse {
  stocks: ScannerStock[];
  count: number;
  total: number;
  signals_summary: Record<string, number>;
}

export interface ScannerParams {
  signal?: string;
  trend?: string;
  sector?: string;
  sort?: string;
  order?: "asc" | "desc";
  minRsi?: number;
  maxRsi?: number;
}

export async function fetchScanner(params: ScannerParams = {}): Promise<ScannerResponse> {
  const qs = new URLSearchParams();
  if (params.signal) qs.set("signal", params.signal);
  if (params.trend) qs.set("trend", params.trend);
  if (params.sector) qs.set("sector", params.sector);
  if (params.sort) qs.set("sort", params.sort);
  if (params.order) qs.set("order", params.order);
  if (params.minRsi != null) qs.set("minRsi", String(params.minRsi));
  if (params.maxRsi != null) qs.set("maxRsi", String(params.maxRsi));
  const res = await fetch(`${API_BASE}/api/scanner?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Scanner failed (${res.status})`);
  }
  return res.json();
}


/* ─── Correlation Matrix ─── */

export interface CorrelationStats {
  ticker: string;
  totalReturn: number;
  annualizedVol: number;
  avgDailyReturn: number;
}

export interface CorrelationResponse {
  tickers: string[];
  matrix: number[][];
  stats: CorrelationStats[];
  period: string;
  dataPoints: number;
}

export async function fetchCorrelation(
  tickers: string[],
  period: string = "1y"
): Promise<CorrelationResponse> {
  const qs = new URLSearchParams({
    tickers: tickers.join(","),
    period,
  });
  const res = await fetch(`${API_BASE}/api/correlation?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Correlation failed (${res.status})`);
  }
  return res.json();
}


/* ─── Correlation Detailed (charts data) ─── */

export interface RollingCorrelationEntry {
  pair: string;
  values: (number | null)[];
}

export interface CorrelationDetailedResponse {
  tickers: string[];
  dates: string[];
  returnDates: string[];
  cumulativeReturns: Record<string, number[]>;
  rollingCorrelations: RollingCorrelationEntry[];
  dailyReturns: Record<string, number[]>;
  window: number;
  period: string;
}

export async function fetchCorrelationDetailed(
  tickers: string[],
  period: string = "1y",
  window: number = 30
): Promise<CorrelationDetailedResponse> {
  const qs = new URLSearchParams({
    tickers: tickers.join(","),
    period,
    window: String(window),
  });
  const res = await fetch(`${API_BASE}/api/correlation/detailed?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Correlation detailed failed (${res.status})`);
  }
  return res.json();
}


/* ─── Enhanced Earnings Calendar ─── */

export interface EarningsEntry {
  symbol: string;
  company: string;
  date: string;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  marketCap: number | null;
  sector: string;
  industry: string;
}

export interface EarningsByDate {
  date: string;
  earnings: EarningsEntry[];
}

export interface EarningsFullResponse {
  byDate: EarningsByDate[];
  totalCount: number;
  source: string;
  dateRange: { start: string | null; end: string | null };
  generatedAt: string;
}

export async function fetchEarningsFull(
  source?: "watchlist" | "twse",
  tickers?: string[],
): Promise<EarningsFullResponse> {
  const params = new URLSearchParams();
  if (source) params.set("source", source);
  if (source === "watchlist" && tickers?.length) params.set("tickers", tickers.join(","));
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/api/earnings-full${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Earnings calendar failed (${res.status})`);
  }
  return res.json();
}


/* ─── Insider Trading ─── */

export interface InsiderTransaction {
  ticker: string;
  company: string;
  sector: string;
  insider: string;
  position: string;
  type: "buy" | "sell" | "gift" | "exercise" | "other";
  date: string;
  shares: number;
  value: number;
  text: string;
  ownership: string;
  currentPrice: number | null;
}

export interface InsiderSummary {
  totalBuys: number;
  totalSells: number;
  totalBuyValue: number;
  totalSellValue: number;
  netValue: number;
}

export interface InsiderResponse {
  transactions: InsiderTransaction[];
  totalCount: number;
  summary: InsiderSummary;
  filters: {
    ticker: string | null;
    type: string;
    days: number;
    minValue: number;
  };
}

export async function fetchInsiders(params?: {
  ticker?: string;
  type?: string;
  days?: number;
  minValue?: number;
}): Promise<InsiderResponse> {
  const qs = new URLSearchParams();
  if (params?.ticker) qs.set("ticker", params.ticker);
  if (params?.type) qs.set("type", params.type);
  if (params?.days) qs.set("days", String(params.days));
  if (params?.minValue) qs.set("minValue", String(params.minValue));
  const res = await fetch(`${API_BASE}/api/insiders?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Insider trading failed (${res.status})`);
  }
  return res.json();
}


/* ─── Congress Trading ─── */

export interface CongressTrade {
  member: string;
  party: "D" | "R" | "I";
  chamber: "House" | "Senate";
  state: string;
  ticker: string;
  company: string;
  sector: string;
  type: "buy" | "sell" | "exchange";
  amountRange: string;
  tradeDate: string;
  disclosureDate: string;
  currentPrice: number;
  excessReturn: number | null;
  priceChange: number | null;
  spyChange: number | null;
}

export interface CongressMember {
  name: string;
  party: "D" | "R" | "I";
  chamber: "House" | "Senate";
  state: string;
}

export interface CongressMostTraded {
  ticker: string;
  trades: number;
}

export interface CongressSummary {
  totalBuys: number;
  totalSells: number;
  uniqueTickers: number;
  mostTraded: CongressMostTraded[];
  partyBreakdown: {
    D: { total: number; buys: number; sells: number };
    R: { total: number; buys: number; sells: number };
  };
}

export interface CongressTickerInsight {
  ticker: string;
  trades: number;
  company: string;
  sector: string;
  estimatedVolume: number;
}

export interface CongressMemberInsight {
  name: string;
  party: string;
  chamber: string;
  trades: number;
  buys: number;
  sells: number;
  estimatedVolume: number;
}

export interface CongressSectorInsight {
  sector: string;
  buys: number;
  sells: number;
  total: number;
  estimatedVolume: number;
}

export interface CongressInsights {
  mostBought: CongressTickerInsight[];
  mostSold: CongressTickerInsight[];
  bestPerformers: CongressTrade[];
  worstPerformers: CongressTrade[];
  topMembers: CongressMemberInsight[];
  sectorBreakdown: CongressSectorInsight[];
  bigTrades: CongressTrade[];
}

export interface CongressResponse {
  trades: CongressTrade[];
  members: CongressMember[];
  totalCount: number;
  summary: CongressSummary;
  insights: CongressInsights;
  disclaimer: string;
  filters: {
    member: string | null;
    party: string | null;
    chamber: string | null;
    ticker: string | null;
    type: string | null;
  };
}

export async function fetchCongressTrades(params?: {
  member?: string;
  party?: string;
  chamber?: string;
  ticker?: string;
  type?: string;
}): Promise<CongressResponse> {
  const qs = new URLSearchParams();
  if (params?.member) qs.set("member", params.member);
  if (params?.party) qs.set("party", params.party);
  if (params?.chamber) qs.set("chamber", params.chamber);
  if (params?.ticker) qs.set("ticker", params.ticker);
  if (params?.type) qs.set("type", params.type);
  const res = await fetch(`${API_BASE}/api/congress-trades?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Congress trades failed (${res.status})`);
  }
  return res.json();
}

/* ─── Technical Analysis — Pattern Recognition ─── */

export interface TATouchPoint {
  index: number;
  time: string;
  price: number;
  distance_pct: number;
}

export interface TATrendline {
  kind: string;
  slope: number;
  intercept: number;
  start_time: string;
  end_time: string;
  touches: number;
  touch_points: TATouchPoint[];
  violations: number;
  score: number;
  channel_id?: string | null;
  line: { time: string; value: number }[];
}

export interface TAChannel {
  support: TATrendline;
  resistance: TATrendline;
  slope: number;
  width: number;
  touches_total: number;
  score: number;
  channel_id: string;
}

export interface TARange {
  high: number;
  low: number;
  start_time: string;
  end_time: string;
  duration_bars: number;
  upper_touches: number;
  lower_touches: number;
  width_pct: number;
}

export interface TABreakout {
  range: TARange;
  direction: string;
  breakout_time: string;
  breakout_price: number;
  volume_ratio: number;
  confirmed: boolean;
  retested: boolean;
  status: string;
  confidence: number;
  entry: number;
  stop: number;
  target: number;
  risk_reward: number;
  mini_bars?: TAMiniBar[];
}

export interface TAKeyPoint {
  time: string;
  price: number;
  label: string;
}

export interface TAMiniBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface TAChartPattern {
  kind: string;
  direction: string;
  confidence: number;
  start_time: string;
  end_time: string;
  description: string;
  key_points: TAKeyPoint[];
  entry?: number;
  stop?: number;
  target?: number;
  risk_reward?: number;
  status: string;
  mini_bars?: TAMiniBar[];
}

export interface TAKeyLevel {
  price: number;
  kind: string;
  source: string;
  strength: number;
  distance_pct: number;
}

export interface TASetup {
  type: string;
  direction: string;
  confidence: number;
  description: string;
  entry: number;
  stop: number;
  target: number;
  risk_reward: number;
  time: string;
  ticker?: string;
  current_price?: number;
  status?: string;
  mini_bars?: TAMiniBar[];
}

export interface TASwingPoint {
  time: string;
  price: number;
  kind: string;
  strength: number;
}

export interface TAVolumeProfileBin {
  price: number;
  volume: number;
  pct: number; // 0-1 normalized to max bin
}

export interface TAVolumeProfile {
  bins: TAVolumeProfileBin[];
  poc: number;
  value_area_high: number;
  value_area_low: number;
  total_volume: number;
}

export interface TAPatternResponse {
  ticker: string;
  period: string;
  bars_analyzed: number;
  data_range: string;
  current_price: number;
  swing_points: TASwingPoint[];
  trendlines: {
    support: TATrendline[];
    resistance: TATrendline[];
    channels?: TAChannel[];
  };
  ranges: TARange[];
  breakouts: TABreakout[];
  chart_patterns: TAChartPattern[];
  key_levels: TAKeyLevel[];
  active_setups: TASetup[];
  volume_profile?: TAVolumeProfile;
}

export async function fetchTAPatterns(
  ticker: string,
  period: string = "5y",
  signal?: AbortSignal,
): Promise<TAPatternResponse> {
  const res = await fetch(
    `${API_BASE}/api/ta/patterns?ticker=${encodeURIComponent(ticker)}&period=${period}`,
    signal ? { signal } : undefined,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `TA analysis failed (${res.status})`);
  }
  return res.json();
}

/* ─── Sector Correlation ─── */

export interface SectorCorrelationStat {
  sector: string;
  totalReturn: number;
  annualizedVol: number;
  avgDailyReturn: number;
  stockCount: number;
  totalMarketCap: number;
}

export interface SectorCorrelationResponse {
  sectors: string[];
  matrix: number[][];
  dailyReturns: Record<string, number[]>;
  stats: SectorCorrelationStat[];
  period: string;
  weighting: "cap" | "equal";
  dataPoints: number;
  totalFilesInDataset: number;
  totalStocksUsed: number;
  dataAsOf: string | null;
}

export async function fetchSectorCorrelation(
  period: string = "1y",
  weighting: string = "cap"
): Promise<SectorCorrelationResponse> {
  const res = await fetch(`${API_BASE}/api/sector-correlation?period=${period}&weighting=${weighting}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Sector correlation failed (${res.status})`);
  }
  return res.json();
}


/* ─── Sector Valuation ─── */

export interface SectorValuation {
  sector: string;
  stockCount: number;
  totalMarketCap: number;
  medianPE: number | null;
  forwardPE: number | null;
  historicalPE: number | null;
  peRatio: number | null;
  signal: string;
  earningsMomentum: number | null;
  medianPB: number | null;
  medianPS: number | null;
  medianEvEbitda: number | null;
  profitMargin: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  returnOnEquity: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  dividendYield: number | null;
  avgBeta: number | null;
  debtToEquity: number | null;
  perf1y: number | null;
}

export interface SectorValuationResponse {
  sectors: SectorValuation[];
  totalFilesInDataset: number;
  totalStocksUsed: number;
  dataAsOf: string | null;
}

export async function fetchSectorValuation(): Promise<SectorValuationResponse> {
  const res = await fetch(`${API_BASE}/api/sector-valuation`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Sector valuation failed (${res.status})`);
  }
  return res.json();
}

// ─── Portfolio Analytics ──────────────────────────────────

export interface PortfolioHolding {
  ticker: string;
  shares: number;
  costBasis: number;
  purchaseDate?: string;
}

export interface PortfolioHoldingResult {
  ticker: string;
  name: string;
  shares: number;
  costBasis: number;
  purchaseDate?: string;
  currentPrice: number;
  marketValue: number;
  totalCost: number;
  gain: number;
  gainPct: number;
  dailyChange: number;
  dailyChangeDollar: number;
  weight: number;
  sector: string;
  beta: number | null;
  dividendYield: number | null;
  annDividend: number;
  annReturn: number;
  annVolatility: number;
}

export interface PortfolioSector {
  sector: string;
  value: number;
  weight: number;
}

export interface PortfolioMonthlyReturn {
  year: number;
  month: number;
  return: number;
}

export interface PortfolioDayPerf {
  date: string;
  return: number;
  value: number;
}

export interface PortfolioAttribution {
  ticker: string;
  name: string;
  weight: number;
  holdingReturn: number;
  contribution: number;
}

export interface PortfolioRiskContribution {
  ticker: string;
  mctr: number;
  ctr: number;
  pctContribution: number;
}

export interface EfficientFrontierPoint {
  return: number;
  risk: number;
  sharpe: number;
  label: string | null;
}

export interface EfficientFrontierMeta {
  cml: { startRisk: number; startReturn: number; endRisk: number; endReturn: number } | null;
  boundary: { risk: number; return: number }[];
  lowerBoundary: { risk: number; return: number }[];
}

export interface PortfolioFactorExposure {
  growth: number;
  value: number;
  size: number;
  momentum: number;
  volatility: number;
  quality: number;
}

export interface RiskParityWeight {
  ticker: string;
  currentWeight: number;
  rpWeight: number;
}

export interface RiskParitySummary {
  annReturn: number;
  annVol: number;
  sharpe: number;
}

export interface DividendPayment {
  date: string;
  payDate?: string | null;
  ticker: string;
  amount: number;
  totalAmount: number;
  shares: number;
  projected?: boolean;
}

export interface DividendMonthly {
  month: string;
  amount: number;
  projected: boolean;
}

export interface PortfolioAnalysis {
  summary: {
    totalValue: number;
    totalCost: number;
    totalGain: number;
    totalGainPct: number;
    dailyChange: number;
    dailyChangePct: number;
    annualizedReturn: number;
    annualizedVolatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    calmarRatio: number;
    var95: number;
    cvar95: number;
    weightedBeta: number | null;
    holdingCount: number;
    highCorrelationPct: number;
    informationRatio: number;
    benchmarkReturn: number;
    hhi: number;
    top5Weight: number;
    effectivePositions: number;
    annualDividendIncome: number;
    dividendYield: number;
  };
  holdings: PortfolioHoldingResult[];
  sectors: PortfolioSector[];
  equityCurve: { date: string; value: number }[];
  benchmarkCurve: { date: string; value: number }[];
  drawdown: { date: string; drawdown: number }[];
  rollingVolatility: { date: string; volatility: number }[];
  correlation: {
    tickers: string[];
    matrix: number[][];
  };
  monthlyReturns: PortfolioMonthlyReturn[];
  bestDays: PortfolioDayPerf[];
  worstDays: PortfolioDayPerf[];
  attribution: PortfolioAttribution[];
  riskContribution: PortfolioRiskContribution[];
  riskParityWeights: RiskParityWeight[];
  riskParitySummary: RiskParitySummary | null;
  efficientFrontier: EfficientFrontierPoint[];
  efficientFrontierMeta: EfficientFrontierMeta;
  factorExposure: PortfolioFactorExposure;
  dividendCalendar: DividendPayment[];
  dividendUpcoming: DividendPayment[];
  dividendMonthly: DividendMonthly[];
  benchmarkLabel: string;
  period: string;
  dataPoints: number;
}

export interface WhatIfResult {
  current: {
    totalValue: number;
    annualizedReturn: number;
    annualizedVolatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    var95: number;
    cvar95: number;
    holdingCount: number;
    holdings: { ticker: string; weight: number }[];
  };
  modified: {
    totalValue: number;
    annualizedReturn: number;
    annualizedVolatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    var95: number;
    cvar95: number;
    holdingCount: number;
    holdings: { ticker: string; weight: number }[];
  };
  delta: {
    annualizedReturn: number;
    annualizedVolatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    var95: number;
    cvar95: number;
  };
  action: string;
  ticker: string;
  shares: number;
}

export async function fetchPortfolioAnalysis(
  holdings: PortfolioHolding[],
  period: string = "1y",
  benchmark: string = DEFAULT_PORTFOLIO_BENCHMARK
): Promise<PortfolioAnalysis> {
  const res = await fetch(`${API_BASE}/api/portfolio/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings, period, benchmark }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Portfolio analysis failed (${res.status})`);
  }
  return res.json();
}

export async function fetchWhatIfAnalysis(
  holdings: PortfolioHolding[],
  action: "add" | "remove" | "modify",
  ticker: string,
  shares: number,
  costBasis: number = 0,
  period: string = "1y",
  benchmark: string = DEFAULT_PORTFOLIO_BENCHMARK
): Promise<WhatIfResult> {
  const res = await fetch(`${API_BASE}/api/portfolio/what-if`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings, action, ticker, shares, costBasis, period, benchmark }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `What-if analysis failed (${res.status})`);
  }
  return res.json();
}
