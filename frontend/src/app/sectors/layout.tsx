import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Stock Market Sectors — Performance, Top Holdings & Analysis",
  description:
    "Explore all 11 GICS stock market sectors. Compare sector performance, market cap, P/E ratios, dividend yields, and top holdings across Technology, Healthcare, Energy, Financials, and more.",
  openGraph: {
    title: "Stock Market Sectors — Performance, Top Holdings & Analysis",
    description:
      "Compare all 11 GICS sectors by performance, valuation, dividends, and top holdings.",
    url: `${SITE}/sectors`,
  },
  alternates: { canonical: `${SITE}/sectors` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
