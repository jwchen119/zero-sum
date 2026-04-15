import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Bubble Chart — Visualize Stocks by Market Cap, P/E & Growth",
  description:
    "Interactive bubble chart to visualize stocks across three dimensions: market cap, P/E ratio, and revenue growth. Spot overvalued and undervalued opportunities across sectors.",
  openGraph: {
    title: "Bubble Chart — Visualize Stocks by Market Cap, P/E & Growth",
    description:
      "Interactive stock bubble chart. Visualize market cap, valuation, and growth across sectors.",
    url: `${SITE}/bubble`,
  },
  alternates: { canonical: `${SITE}/bubble` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
