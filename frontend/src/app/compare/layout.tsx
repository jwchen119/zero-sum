import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Stock Comparison Tool — Compare Stocks Side by Side",
  description:
    "Compare multiple stocks side by side on valuation, financials, growth, dividends, and performance. Free stock comparison tool covering 3,500+ NASDAQ-listed companies.",
  openGraph: {
    title: "Stock Comparison Tool — Compare Stocks Side by Side",
    description:
      "Compare stocks side by side on valuation, financials, growth, and performance. Free comparison tool.",
    url: `${SITE}/compare`,
  },
  alternates: { canonical: `${SITE}/compare` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
