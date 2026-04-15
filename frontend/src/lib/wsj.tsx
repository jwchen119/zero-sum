/* ─── WSJ Design Constants ─── */
/* These are used as fallbacks in inline styles. Components within WSJLayout
   will pick up CSS variable overrides for dark mode automatically. */
export const WHT  = "var(--wsj-white, #f5f0e8)";
export const BG   = "var(--wsj-bg, #e8e0d0)";
export const INK  = "var(--wsj-ink, #1a1a1a)";
export const GRY  = "var(--wsj-grey, #c8c8c8)";
export const BLU  = "var(--wsj-blue, #8a8a8a)";
export const RED  = "var(--wsj-red, #b07050)";
export const T2   = "var(--wsj-text, #555555)";
export const TM   = "var(--wsj-muted, #888888)";
export const GAIN = "var(--wsj-gain, #2e7d32)";
export const LOSS = "var(--wsj-loss, #c62828)";
export const LINK = "var(--wsj-link, #1565c0)";

export const serif   = "var(--font-serif), 'Georgia', 'Times New Roman', serif";
export const display = "var(--font-display), 'Georgia', serif";
export const mono    = "var(--font-mono-data), 'Courier New', monospace";
export const sans    = "var(--font-sans-label), 'Helvetica Neue', system-ui, sans-serif";

/* ─── Logo Variants ─── */
export const LOGOS = ["0∑×"];

/* ─── Zero-Sum Taglines ─── */
export const TAGLINES = [
  "Where every gain is someone else's loss",
  "Your alpha is someone else's beta",
  "Every long has a short on the other side",
  "The sum of all positions: zero",
  "One trader's ceiling is another's floor",
  "Because somebody always gets zero",
  "All gains accounted for — all losses, too",
  "The market giveth. The market taketh. Net result: nothing.",
  "In markets, nothing is created — only transferred",
  "Where bulls and bears perfectly cancel out",
  "For every winner, a loser of equal and opposite conviction",
  "Net returns across all players: precisely ∅",
  "Dedicated to the other side of every trade",
  "Buy the rumor, sell the news, sum to zero",
  "Risk transferred, never destroyed",
  "You get 零 sometimes",
  "∑ gains + ∑ losses = 0",
  "Your P&L is someone else's, inverted",
  "Conservation of capital: first law of markets",
  "What the market gives, the market takes — in equal measure",
  "Someone sold at the top. Someone bought it.",
  "Behind every portfolio gain, a stranger's regret",
  "The house always nets zero — minus fees",
  "Every IPO pop is a founder's discount",
  "Hedge funds: redistributing alpha since 1949",
  "零 — the number that balances all others",
  "In the ledger of markets, every entry has a contra",
  "Two sides to every trade, one side to every regret",
  "All the gains that are fit to offset",
  "Printing both sides of every trade since 2026",
  "Where one man's stop-loss is another's entry",
  "Read between the bid and the ask",
  "Tracking the transfer of conviction",
  "Somebody bought the top — we report on both sides",
  "Winners write the narratives. Losers write the checks.",
  "The money didn't disappear. It just changed hands.",
  "Your retirement fund thanks the other side of this trade",
  "Margin calls: the market's way of saying you were wrong, expensively",
  "Liquidated at 3 AM so someone else could profit at 9:30",
  "Behind every 10-bagger is someone who sold at 1×",
  "Diamond hands meet paper losses — net sum: zero",
  "HODL is just a fancy word for being the exit liquidity",
  "Somebody's life savings funded that short seller's yacht",
  "The invisible hand giveth, the margin call taketh away",
  "Panic sells at the bottom, FOMO buys at the top — perfectly balanced",
  "Every 'to the moon' has a 'back to earth' on the other side",
  "Your bags are someone else's profit-taking",
  "In a zero-sum game, the only guaranteed winner is the broker",
  "The market can stay irrational longer than you can stay solvent",
  "Buy high, sell low, donate the difference to a stranger",
  "Generational wealth transfer — just not the direction you hoped",
  "Your limit order filled. Condolences.",
  "Portfolio down 40%. Character development up 100%.",
  "Diversification: losing money in multiple asset classes simultaneously",
  "Past performance is no guarantee — but past losses are very real",
  "Not financial advice. Clearly not even financial competence.",
  "The stock market is a wealth transfer device from the impatient to the patient — and the patient to the fees",
  "Bought the dip. It kept dipping. Someone else bought my dip.",
  "Every candle on the chart is a little story of someone's hope and someone's ruin",
  "Today's floor is tomorrow's ceiling is next week's floor again",
  "Your stop-loss is a market maker's breakfast",
  "Averaging down: the art of being wrong at every price point",
  "The options expired worthless. The lessons, however, were very expensive.",
  "Sold too early. Held too long. Timed nothing. Lost to both sides.",
  "Infinite money glitch (for the counterparty)",
  "This is not a loss — it's a tax-loss harvest with extra steps",
  "Sir, this is a zero-sum casino",
  "Bull trap, bear trap — the only free-range animal is the broker",
  "'Just DCA' they said, as if discipline fixes direction",
  "When the shoeshine boy gives tips, somebody already took the other side",
  "The algo traded against you 47 times before you finished reading this",
  "Unrealized gains: Schrödinger's wealth — both rich and poor until you sell",
  "Your thesis was correct. Your timing funded someone else's thesis.",
  "The only DD that matters is the one the counterparty already did",
  "Congratulations on your paper gains. The taxman and the market maker send regards.",
  "Smart money got in early. You are not smart money.",
  "Every green candle is a red candle that someone else is looking at",
  "The market doesn't care about your feelings, your mortgage, or your conviction",
  "You didn't lose money. You paid tuition to the market.",
];

/* ─── WSJ Utility Components ─── */
export function Hair() { return <div className="h-px my-3" style={{ background: GRY }} />; }
export function HeavyRule() { return <div className="h-[3px]" style={{ background: INK }} />; }
export function DoubleRule() {
  return (
    <div className="my-5">
      <div className="h-[2px]" style={{ background: INK }} />
      <div className="h-px mt-0.5" style={{ background: INK }} />
    </div>
  );
}

export function WSJSection({ title }: { title: string }) {
  return (
    <div className="mt-8 mb-4">
      <div className="h-[2px]" style={{ background: INK }} />
      <h2
        className="text-[13px] font-extrabold uppercase tracking-[0.2em] py-2"
        style={{ fontFamily: sans, color: INK }}
      >
        {title}
      </h2>
      <div className="h-px" style={{ background: GRY }} />
    </div>
  );
}
