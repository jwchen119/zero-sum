import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Stock Correlation Matrix — Find Correlated & Uncorrelated Assets",
  description:
    "Analyze correlation between stocks, ETFs, and sectors. Build a custom correlation matrix to find diversification opportunities and identify assets that move together or inversely.",
  openGraph: {
    title: "Stock Correlation Matrix — Find Correlated & Uncorrelated Assets",
    description:
      "Analyze stock correlation. Build custom matrices to find diversification opportunities across assets.",
    url: `${SITE}/correlation`,
  },
  alternates: { canonical: `${SITE}/correlation` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
