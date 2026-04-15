import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Sector Analysis — Compare Stock Market Sectors & Industries",
  description:
    "Analyze and compare stock market sectors in real time. Sector performance, top gainers and losers, market cap breakdown, and industry trends for NASDAQ-listed stocks.",
  openGraph: {
    title: "Sector Analysis — Compare Stock Market Sectors & Industries",
    description:
      "Compare stock market sectors, view performance trends, and identify top industries. Free sector analysis tool.",
    url: `${SITE}/sector-analysis`,
  },
  alternates: { canonical: `${SITE}/sector-analysis` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
