/* ══════════════════════════════════════════════════════════════════
   Shared sample data for all 12 design-style prototype pages.
   Import what you need:  import { STOCK, EARNINGS, … } from "@/lib/mockData";
   ══════════════════════════════════════════════════════════════════ */

/* ─────────────────────── Price & Quote ─────────────────────── */

export const STOCK = {
  ticker: "AAPL",
  name: "Apple Inc.",
  exchange: "NASDAQ",
  currency: "USD",
  sector: "Technology",
  industry: "Consumer Electronics",
  ceo: "Tim Cook",
  founded: 1976,
  headquarters: "Cupertino, California",
  employees: 164_000,
  website: "https://www.apple.com",
  ipoDate: "1980-12-12",
  fiscalYearEnd: "September",

  price: 187.44,
  change: +2.36,
  changePct: +1.27,
  open: 185.08,
  high: 188.12,
  low: 184.91,
  prevClose: 185.08,
  volume: 58_293_104,
  avgVolume: 62_410_000,
  marketCap: 2_847_300_000_000,
  enterpriseValue: 2_917_000_000_000,
  pe: 28.7,
  forwardPe: 25.1,
  peg: 2.34,
  ps: 7.22,
  pb: 38.9,
  evEbitda: 21.3,
  evRevenue: 7.45,
  eps: 6.42,
  forwardEps: 7.11,
  beta: 1.24,
  dividend: 0.96,
  dividendYield: 0.51,
  payoutRatio: 14.9,
  week52High: 199.62,
  week52Low: 143.90,
  sharesOut: 15_200_000_000,
  floatShares: 15_170_000_000,
  shortRatio: 1.8,
  shortPctFloat: 0.72,
  insiderOwnership: 0.07,
  institutionalOwnership: 60.2,
};

/* ─────────────────── Company Description ──────────────────── */

export const COMPANY_DESCRIPTION = `Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company offers iPhone, Mac, iPad, Apple Watch, AirPods, Apple TV, and HomePod product lines. It also provides AppleCare support and cloud services, and operates digital content stores including the App Store, Apple Music, Apple TV+, Apple Arcade, Apple News+, Apple Fitness+, and Apple Card.

Apple's ecosystem strategy creates deep integration between hardware, software, and services, driving industry-leading customer retention rates above 90%. The company's installed base of active devices surpassed 2.2 billion in 2025, providing a massive platform for recurring services revenue.

Founded by Steve Jobs, Steve Wozniak, and Ronald Wayne in 1976, Apple went public in December 1980 and has since become the world's most valuable publicly traded company. Headquartered in Cupertino, California, the company employs approximately 164,000 full-time equivalent employees worldwide.`;

export const COMPANY_BRIEF = `Apple Inc. designs, manufactures, and markets consumer electronics, software, and services. Its product portfolio includes iPhone, Mac, iPad, Apple Watch, and AirPods, along with a growing ecosystem of digital services spanning payments, streaming, cloud storage, and health & fitness.`;

/* ──────────────────── Business Segments ───────────────────── */

export const SEGMENTS = [
  { name: "iPhone", revenue: "200.6B", pct: 50.8, description: "Flagship smartphone line including iPhone 16 series with AI-powered Apple Intelligence features." },
  { name: "Services", revenue: "96.2B", pct: 24.4, description: "App Store, Apple Music, iCloud, Apple TV+, Apple Pay, AppleCare, and advertising. Highest-margin segment." },
  { name: "Mac", revenue: "29.4B", pct: 7.5, description: "MacBook Air, MacBook Pro, iMac, Mac Mini, Mac Studio, and Mac Pro powered by Apple Silicon." },
  { name: "iPad", revenue: "28.3B", pct: 7.2, description: "iPad, iPad Air, iPad Pro, and iPad Mini with M-series chips for creative and productivity workflows." },
  { name: "Wearables, Home & Acc.", revenue: "39.8B", pct: 10.1, description: "Apple Watch, AirPods, Apple TV, HomePod, and third-party accessories." },
];

/* ────────────────── AI Analysis Summary ──────────────────── */

export const AI_ANALYSIS = {
  summary: `Apple remains one of the highest-quality businesses globally, combining a dominant consumer hardware franchise with an accelerating services flywheel. The transition to Apple Silicon has materially improved margins across the Mac lineup, while the iPhone 16 cycle — featuring on-device AI via Apple Intelligence — is tracking ahead of initial Street estimates. Services revenue grew 18% YoY in Q4 2025, now representing a $96B+ annualized run rate at ~70% gross margins, a structural uplift to the company's overall profitability.

However, regulatory headwinds from the EU Digital Markets Act and US DOJ antitrust case create meaningful uncertainty around App Store economics. Greater China weakness persists, with iPhone shipments declining 6% YoY as Huawei's resurgence pressures market share. Valuation at ~29x trailing earnings remains rich relative to low-teens earnings growth, leaving limited margin of safety.`,

  outlook: `The next 12–18 months hinge on several catalysts: (1) iPhone 17 launch with a rumored ultra-slim design and upgraded camera system; (2) Apple Vision Pro 2 with a lower price point targeting mainstream adoption; (3) broader rollout of Apple Intelligence features driving upgrade cycles in both iPhone and Mac; (4) continued double-digit Services growth compounding on the expanding installed base.

Key risks include potential App Store fee restructuring from regulatory pressure (estimated 2–4% EPS headwind), a broader consumer spending slowdown impacting premium device ASPs, and execution risk on the AI/ML feature roadmap where Apple trails OpenAI and Google in foundational model capabilities.`,
};

/* ──────────────────── Bull & Bear Cases ──────────────────── */

export const BULL_CASE = {
  title: "Bull Case — $230 Price Target (+23%)",
  targetPrice: 230,
  targetPe: 32,
  thesis: `Apple Intelligence becomes the defining AI interface for consumers. The on-device + cloud hybrid approach resonates with privacy-conscious users, driving a multi-year iPhone super-cycle as 900M+ devices in the installed base are 3+ years old and overdue for an upgrade. Siri 2.0, powered by Apple's partnership with OpenAI, transforms from a laggard to the default AI assistant for 2.2B+ Apple device users.

Services revenue inflects to 20%+ growth as Apple expands into financial services (Apple Savings, Apple Pay Later), healthcare (Apple Watch health monitoring platform deals with insurers), and advertising (Search Ads expansion into Maps, TV+, and News+). Services gross margins expand from 70% to 73%+ as scale advantages kick in.

Regulatory fears prove overblown — the EU DMA results in modest App Store fee adjustments but the overall ecosystem remains intact. China stabilizes as Apple Intelligence features launch there via a partnership with Baidu.`,

  keyMetrics: [
    { label: "2026E Revenue", value: "$425B" },
    { label: "2026E EPS", value: "$7.50" },
    { label: "Services Growth", value: "20%+" },
    { label: "iPhone Units", value: "240M+" },
    { label: "Gross Margin", value: "47.5%" },
    { label: "FCF Yield", value: "3.2%" },
  ],
};

export const BEAR_CASE = {
  title: "Bear Case — $145 Price Target (−23%)",
  targetPrice: 145,
  targetPe: 21,
  thesis: `Apple Intelligence underdelivers. The features are incremental rather than transformative, and Apple's late entry into generative AI means competitors (Samsung Galaxy AI, Google Pixel) erode the "it just works" differentiation. The iPhone 17 cycle is a normal replacement cycle, not a super-cycle, as consumers extend device holding periods in a soft macro environment.

Regulatory action bites: the DOJ antitrust case results in mandated third-party app stores and payment processors on iOS, cutting App Store take rates from 30% to 15–20%. The EU DMA forces meaningful interoperability requirements. Together, these regulatory changes reduce Services revenue by 8–12% and compress segment margins from 70% to 62%.

China continues to deteriorate as Huawei's HarmonyOS ecosystem matures and nationalistic purchasing trends accelerate. Apple's China revenue declines 15%+ in 2026, eliminating ~$10B in annual revenue. Capital allocation reaches its limit — with the buyback having already reduced shares outstanding by 40% over a decade, future per-share earnings growth requires organic revenue growth which proves elusive.`,

  keyMetrics: [
    { label: "2026E Revenue", value: "$385B" },
    { label: "2026E EPS", value: "$6.20" },
    { label: "Services Growth", value: "8%" },
    { label: "iPhone Units", value: "210M" },
    { label: "Gross Margin", value: "44.0%" },
    { label: "FCF Yield", value: "4.8%" },
  ],
};

/* ──────────────── Analyst Recommendations ────────────────── */

export const ANALYSTS = [
  { firm: "Morgan Stanley", analyst: "Erik Woodring", rating: "Overweight", target: 210, date: "2025-11-15", priorTarget: 195 },
  { firm: "Goldman Sachs", analyst: "Michael Ng", rating: "Buy", target: 205, date: "2025-11-12", priorTarget: 198 },
  { firm: "JP Morgan", analyst: "Samik Chatterjee", rating: "Overweight", target: 200, date: "2025-11-10", priorTarget: 190 },
  { firm: "Bank of America", analyst: "Wamsi Mohan", rating: "Buy", target: 208, date: "2025-11-08", priorTarget: 200 },
  { firm: "Barclays", analyst: "Tim Long", rating: "Equal Weight", target: 186, date: "2025-10-30", priorTarget: 182 },
  { firm: "UBS", analyst: "David Vogt", rating: "Neutral", target: 180, date: "2025-10-28", priorTarget: 175 },
  { firm: "Citi", analyst: "Atif Malik", rating: "Buy", target: 215, date: "2025-11-14", priorTarget: 200 },
  { firm: "Wells Fargo", analyst: "Aaron Rakers", rating: "Overweight", target: 195, date: "2025-11-05", priorTarget: 188 },
  { firm: "Deutsche Bank", analyst: "Sidney Ho", rating: "Buy", target: 200, date: "2025-11-01", priorTarget: 190 },
  { firm: "Bernstein", analyst: "Toni Sacconaghi", rating: "Underperform", target: 155, date: "2025-10-25", priorTarget: 150 },
];

export const ANALYST_CONSENSUS = {
  rating: "Buy",
  buy: 28,
  overweight: 8,
  hold: 7,
  underweight: 2,
  sell: 1,
  avgTarget: 199.88,
  highTarget: 250,
  lowTarget: 140,
  medianTarget: 200,
  impliedUpside: 6.6,
};

/* ──────────────── Analyst Commentary Snippets ────────────── */

export const ANALYST_COMMENTARY = [
  {
    firm: "Morgan Stanley",
    analyst: "Erik Woodring",
    date: "Nov 15, 2025",
    title: "iPhone 17 Cycle Underappreciated",
    snippet: `We believe the Street is underestimating the iPhone 17 upgrade cycle. Our supply chain checks indicate Apple has placed component orders 15% above iPhone 16 launch levels. The combination of Apple Intelligence, a redesigned ultra-slim form factor, and 3nm A19 chip creates the most compelling upgrade proposition since iPhone 12/5G. We raise our FY26 iPhone unit estimate to 235M from 220M.`,
  },
  {
    firm: "Bernstein",
    analyst: "Toni Sacconaghi",
    date: "Oct 25, 2025",
    title: "Valuation Stretched; Regulatory Risk Underpriced",
    snippet: `Apple trades at 29x trailing EPS for a business growing earnings mid-teens — a premium we struggle to justify even accounting for the Services mix shift. The DOJ case is progressing, and we estimate a 40% probability of meaningful App Store remedies that could impact FY27 EPS by $0.40–0.60. We reiterate Underperform with a $155 target, representing 22x our bear-case FY26 EPS.`,
  },
  {
    firm: "Goldman Sachs",
    analyst: "Michael Ng",
    date: "Nov 12, 2025",
    title: "Services Inflection Accelerating",
    snippet: `Apple Services hit a $96B run rate in Q4, growing 18% YoY with 70%+ gross margins. We see a path to $120B+ by FY27 driven by (1) advertising expansion across Apple's owned properties, (2) Apple Card/Pay monetization improvements, and (3) bundling optimization with Apple One. This increasingly SaaS-like revenue stream deserves a premium multiple.`,
  },
];

/* ──────────────────── Earnings History ───────────────────── */

export const EARNINGS = [
  { quarter: "Q4 2025", date: "2025-10-30", epsEst: 1.43, epsActual: 1.56, revenue: "94.9B", revenueGrowth: 8.2, surprise: "+9.1%" },
  { quarter: "Q3 2025", date: "2025-07-31", epsEst: 1.34, epsActual: 1.40, revenue: "85.8B", revenueGrowth: 5.4, surprise: "+4.5%" },
  { quarter: "Q2 2025", date: "2025-05-01", epsEst: 1.50, epsActual: 1.53, revenue: "90.8B", revenueGrowth: 3.8, surprise: "+2.0%" },
  { quarter: "Q1 2025", date: "2025-01-30", epsEst: 2.10, epsActual: 2.18, revenue: "119.6B", revenueGrowth: 6.1, surprise: "+3.8%" },
  { quarter: "Q4 2024", date: "2024-10-31", epsEst: 1.36, epsActual: 1.46, revenue: "89.5B", revenueGrowth: 7.4, surprise: "+7.4%" },
  { quarter: "Q3 2024", date: "2024-08-01", epsEst: 1.32, epsActual: 1.40, revenue: "85.8B", revenueGrowth: 4.9, surprise: "+6.1%" },
  { quarter: "Q2 2024", date: "2024-04-30", epsEst: 1.46, epsActual: 1.53, revenue: "90.8B", revenueGrowth: 1.2, surprise: "+4.8%" },
  { quarter: "Q1 2024", date: "2024-02-01", epsEst: 2.01, epsActual: 2.18, revenue: "119.6B", revenueGrowth: 2.1, surprise: "+8.5%" },
];

/* ────────────────── Financial Statements ─────────────────── */

export const INCOME_STATEMENT = [
  { label: "Revenue (TTM)", value: "394.3B", yoy: "+5.9%" },
  { label: "Cost of Revenue", value: "215.5B", yoy: "+4.1%" },
  { label: "Gross Profit", value: "178.8B", yoy: "+8.2%" },
  { label: "Operating Expenses", value: "55.6B", yoy: "+7.8%" },
  { label: "Operating Income", value: "123.2B", yoy: "+8.4%" },
  { label: "Net Income", value: "96.99B", yoy: "+10.2%" },
  { label: "EBITDA", value: "134.5B", yoy: "+9.1%" },
  { label: "Gross Margin", value: "45.3%", yoy: "+100bp" },
  { label: "Operating Margin", value: "31.2%", yoy: "+70bp" },
  { label: "Net Margin", value: "24.6%", yoy: "+100bp" },
];

export const BALANCE_SHEET = [
  { label: "Total Assets", value: "352.6B" },
  { label: "Total Liabilities", value: "279.4B" },
  { label: "Stockholders Equity", value: "73.2B" },
  { label: "Cash & Equivalents", value: "29.9B" },
  { label: "Short-term Investments", value: "31.6B" },
  { label: "Accounts Receivable", value: "29.5B" },
  { label: "Inventories", value: "6.3B" },
  { label: "Current Assets", value: "143.6B" },
  { label: "Current Liabilities", value: "145.3B" },
  { label: "Long-term Debt", value: "98.1B" },
  { label: "Retained Earnings", value: "-5.8B" },
  { label: "Book Value / Share", value: "$4.82" },
];

export const CASH_FLOW = [
  { label: "Operating Cash Flow", value: "116.4B", yoy: "+12.3%" },
  { label: "Capital Expenditure", value: "-10.8B", yoy: "+5.2%" },
  { label: "Free Cash Flow", value: "105.6B", yoy: "+13.1%" },
  { label: "Dividends Paid", value: "-15.0B", yoy: "+4.2%" },
  { label: "Share Buybacks", value: "-77.6B", yoy: "+8.7%" },
  { label: "Net Borrowing", value: "-3.2B", yoy: "" },
  { label: "FCF Margin", value: "26.8%", yoy: "+170bp" },
  { label: "FCF / Share", value: "$6.95", yoy: "+15.8%" },
];

/* ─────────────── Key Risks & Catalysts ──────────────────── */

export const KEY_RISKS = [
  {
    title: "Regulatory & Antitrust Pressure",
    severity: "High",
    description: "The US DOJ antitrust suit targeting Apple's smartphone monopoly could force changes to the App Store, iMessage, and Apple Pay exclusivity. The EU Digital Markets Act already requires sideloading support. Estimated EPS impact: $0.30–0.60 in a worst-case scenario.",
  },
  {
    title: "China Market Deterioration",
    severity: "High",
    description: "Huawei's resurgence with the Mate 70 series and growing nationalist consumer sentiment are pressuring Apple's ~18% market share in China. Greater China revenue declined 6% YoY in Q4 2025. Further deterioration could remove $8–12B in annual revenue.",
  },
  {
    title: "AI Execution Risk",
    severity: "Medium",
    description: "Apple Intelligence launched later than competitors and initial reviews were mixed. If Apple fails to close the gap with Google and Samsung's AI offerings, it risks erosion of the premium user experience narrative that justifies higher ASPs.",
  },
  {
    title: "Consumer Spending Slowdown",
    severity: "Medium",
    description: "With iPhone ASPs above $850, Apple is disproportionately exposed to any pullback in discretionary spending, particularly in international markets where currency headwinds amplify the effective price increase.",
  },
  {
    title: "Supply Chain Concentration",
    severity: "Low–Medium",
    description: "Despite ongoing diversification to India and Vietnam, approximately 85% of iPhone production still occurs in China (primarily through Foxconn and Pegatron). Geopolitical disruptions could significantly impact supply.",
  },
];

export const CATALYSTS = [
  {
    title: "iPhone 17 Super-cycle",
    timeline: "Sep 2026",
    description: "Ultra-slim redesign, A19 Pro chip, and expanded AI features could drive the largest upgrade cycle since iPhone 12. Supply chain checks suggest initial build orders 15% above iPhone 16.",
  },
  {
    title: "Apple Vision Pro 2",
    timeline: "Early 2026",
    description: "Second-generation headset at a sub-$2,000 price point could unlock mainstream adoption of spatial computing. Enterprise partnerships with SAP and Salesforce signal B2B expansion.",
  },
  {
    title: "Services Revenue $100B+ Run Rate",
    timeline: "H1 2026",
    description: "Crossing the $100B annualized Services revenue milestone at 70%+ margins would further re-rate the stock's valuation as investors assign a higher multiple to the recurring revenue mix.",
  },
  {
    title: "India Manufacturing Scale-up",
    timeline: "2026–2027",
    description: "Apple is targeting 25% of global iPhone production in India by 2027, reducing China concentration risk and benefiting from Indian government production-linked incentives.",
  },
  {
    title: "Capital Return Program Expansion",
    timeline: "May 2026 (WWDC/earnings)",
    description: "Apple is expected to refresh its buyback authorization (current program ~80% complete). A new $100B+ authorization would signal confidence and provide ongoing per-share earnings accretion.",
  },
];

/* ───────────────── Competitive Landscape ─────────────────── */

export const COMPETITORS = [
  { ticker: "MSFT", name: "Microsoft", marketCap: "2.78T", pe: 32.4, revenue: "236.6B", margin: "36.4%", growth: "+12.8%" },
  { ticker: "GOOG", name: "Alphabet", marketCap: "1.78T", pe: 22.1, revenue: "339.9B", margin: "27.2%", growth: "+14.1%" },
  { ticker: "AMZN", name: "Amazon", marketCap: "1.85T", pe: 42.8, revenue: "620.1B", margin: "8.1%", growth: "+11.2%" },
  { ticker: "NVDA", name: "NVIDIA", marketCap: "1.72T", pe: 48.2, revenue: "113.3B", margin: "55.8%", growth: "+94.2%" },
  { ticker: "META", name: "Meta Platforms", marketCap: "1.24T", pe: 24.6, revenue: "156.2B", margin: "33.1%", growth: "+19.4%" },
  { ticker: "SSNLF", name: "Samsung Electronics", marketCap: "358B", pe: 14.2, revenue: "234.1B", margin: "11.2%", growth: "+3.4%" },
];

/* ───────────────────── Watchlist Data ────────────────────── */

export const WATCHLIST = [
  { ticker: "MSFT", price: 378.91, change: +1.23, volume: "24.1M" },
  { ticker: "GOOG", price: 141.80, change: -0.47, volume: "18.7M" },
  { ticker: "AMZN", price: 178.25, change: +0.89, volume: "32.4M" },
  { ticker: "NVDA", price: 721.33, change: +3.12, volume: "41.2M" },
  { ticker: "META", price: 484.10, change: -1.05, volume: "15.8M" },
  { ticker: "TSLA", price: 248.42, change: -2.31, volume: "67.9M" },
  { ticker: "JPM",  price: 183.77, change: +0.54, volume: "8.3M" },
  { ticker: "V",    price: 274.55, change: +0.32, volume: "5.4M" },
];

/* ───────────────────── News Headlines ───────────────────── */

export const NEWS = [
  { time: "14:32", headline: "Apple reportedly in talks for AI chip partnership with TSMC for custom server silicon" },
  { time: "13:15", headline: "App Store revenue tops estimates in Q4, Services segment grows 18% to $24.2B quarterly" },
  { time: "11:48", headline: "iPhone 17 production ramp-up confirmed by supply chain sources — ultra-slim design verified" },
  { time: "10:22", headline: "Apple Vision Pro 2 expected in early 2026 with M4 chip and 50% price reduction" },
  { time: "09:31", headline: "AAPL opens higher on broad tech rally, Nasdaq up 0.8% at the open" },
  { time: "08:45", headline: "Analyst: Apple's buyback program to accelerate in 2026 — new $110B authorization expected" },
  { time: "07:30", headline: "EU regulators approve Apple's DMA compliance plan for App Store with minor conditions" },
  { time: "06:15", headline: "Apple India crosses $10B annual revenue milestone — manufacturing diversification on track" },
];

/* ──────────────────── Sector Performance ─────────────────── */

export const SECTOR_PERFORMANCE = [
  { label: "Technology", value: "+1.42%" },
  { label: "Healthcare", value: "-0.38%" },
  { label: "Financials", value: "+0.87%" },
  { label: "Energy", value: "-1.24%" },
  { label: "Consumer Disc.", value: "+0.55%" },
  { label: "Industrials", value: "+0.21%" },
  { label: "Real Estate", value: "-0.67%" },
  { label: "Utilities", value: "+0.13%" },
];

/* ──────────────── Valuation Ratios (table) ───────────────── */

export const VALUATION_RATIOS = [
  { label: "P/E (TTM)", value: "28.7" },
  { label: "P/E (FWD)", value: "25.1" },
  { label: "PEG Ratio", value: "2.34" },
  { label: "P/S (TTM)", value: "7.22" },
  { label: "P/B (MRQ)", value: "38.9" },
  { label: "EV/EBITDA", value: "21.3" },
  { label: "EV/Revenue", value: "7.45" },
  { label: "FCF Yield", value: "3.7%" },
];

/* ──────────────── Dividend History ────────────────────────── */

export const DIVIDEND_HISTORY = [
  { year: "2025", annual: "$0.96", yield: "0.51%", growth: "+4.3%" },
  { year: "2024", annual: "$0.92", yield: "0.52%", growth: "+4.5%" },
  { year: "2023", annual: "$0.88", yield: "0.56%", growth: "+5.4%" },
  { year: "2022", annual: "$0.84", yield: "0.62%", growth: "+5.0%" },
  { year: "2021", annual: "$0.80", yield: "0.50%", growth: "+7.3%" },
];

/* ──────────────── Ownership Breakdown ────────────────────── */

export const TOP_HOLDERS = [
  { name: "Vanguard Group", shares: "1.31B", pct: "8.6%", value: "$245.5B" },
  { name: "BlackRock", shares: "1.01B", pct: "6.6%", value: "$189.3B" },
  { name: "Berkshire Hathaway", shares: "905M", pct: "5.9%", value: "$169.6B" },
  { name: "State Street Corp", shares: "592M", pct: "3.9%", value: "$111.0B" },
  { name: "FMR (Fidelity)", shares: "381M", pct: "2.5%", value: "$71.4B" },
  { name: "Geode Capital", shares: "296M", pct: "1.9%", value: "$55.5B" },
  { name: "T. Rowe Price", shares: "218M", pct: "1.4%", value: "$40.9B" },
  { name: "Northern Trust", shares: "187M", pct: "1.2%", value: "$35.1B" },
];

/* ──────────────── ESG Summary ────────────────────────────── */

export const ESG = {
  rating: "AA",
  provider: "MSCI",
  environmentScore: 7.8,
  socialScore: 6.4,
  governanceScore: 8.1,
  carbonNeutralSince: 2020,
  renewableEnergy: "100% for corporate operations",
  supplyChainAudit: "Audited 1,200+ supplier sites in 2024",
  highlights: [
    "Carbon neutral for all corporate operations since 2020; targeting entire supply chain by 2030.",
    "All Apple products designed with recycled and renewable materials where possible.",
    "Supplier Responsibility program has driven measurable improvements across 200+ metrics.",
    "Governance concerns: dual-class voting not present, but limited shareholder proposal adoption.",
  ],
};

/* ──────────────── Technical Levels ────────────────────────── */

export const TECHNICALS = {
  sma20: 184.50,
  sma50: 181.20,
  sma200: 176.80,
  rsi14: 58.3,
  macdSignal: "Bullish crossover",
  support1: 182.50,
  support2: 178.00,
  resistance1: 190.00,
  resistance2: 199.62,
  trend: "Uptrend",
  adx: 24.6,
  atr14: 3.42,
  bollingerUpper: 192.10,
  bollingerLower: 180.40,
};

/* ──────────────── Helper Formatters ──────────────────────── */

export const fmt = (n: number): string =>
  n >= 1e12 ? `${(n / 1e12).toFixed(1)}T` :
  n >= 1e9  ? `${(n / 1e9).toFixed(1)}B` :
  n >= 1e6  ? `${(n / 1e6).toFixed(1)}M` :
  n.toLocaleString();

export const pct = (n: number): string => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
export const usd = (n: number): string => `$${n.toFixed(2)}`;
export const clr = (n: number): string => (n >= 0 ? "text-green-500" : "text-red-500");
