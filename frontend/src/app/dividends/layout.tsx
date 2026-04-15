import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Dividend Stocks — High-Yield Screener & Payout Analysis",
  description:
    "Find the best dividend stocks with our free screener. Filter by dividend yield, payout ratio, ex-dividend date, and years of consecutive growth. Analyze dividend sustainability and income potential.",
  openGraph: {
    title: "Dividend Stocks — High-Yield Screener & Payout Analysis",
    description:
      "Find top dividend stocks by yield, payout ratio, ex-date, and growth streak. Free dividend screener.",
    url: `${SITE}/dividends`,
  },
  alternates: { canonical: `${SITE}/dividends` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
