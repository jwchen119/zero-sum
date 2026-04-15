import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Stock Screener — Filter 3,500+ Stocks by Fundamentals",
  description:
    "Free stock screener with 30+ filters: market cap, P/E ratio, dividend yield, revenue growth, profit margins, and more. Screen NASDAQ-listed companies instantly.",
  openGraph: {
    title: "Stock Screener — Filter 3,500+ Stocks by Fundamentals",
    description:
      "Free stock screener with 30+ filters. Screen by market cap, P/E, dividends, growth, and more.",
    url: `${SITE}/screener-v4`,
  },
  alternates: { canonical: `${SITE}/screener-v4` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
