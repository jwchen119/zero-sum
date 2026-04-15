import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Congress Stock Trades — Track What Politicians Are Buying",
  description:
    "Monitor stock trades reported by U.S. Congress members under the STOCK Act. See which stocks senators and representatives are buying and selling, with trade dates, amounts, and party breakdowns.",
  openGraph: {
    title: "Congress Stock Trades — Track What Politicians Are Buying",
    description:
      "Track stock trades by U.S. Congress members. See what senators and representatives Buy and sell.",
    url: `${SITE}/congress`,
  },
  alternates: { canonical: `${SITE}/congress` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
