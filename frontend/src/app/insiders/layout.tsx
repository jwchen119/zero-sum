import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Insider Trading Tracker — SEC Form 4 Filings & Analysis",
  description:
    "Track insider buying and selling activity from SEC Form 4 filings. See what CEOs, directors, and 10% owners are trading. Spot insider sentiment shifts before the market reacts.",
  openGraph: {
    title: "Insider Trading Tracker — SEC Form 4 Filings",
    description:
      "Track insider buys and sells from SEC Form 4 filings. Spot CEO and director trading patterns.",
    url: `${SITE}/insiders`,
  },
  alternates: { canonical: `${SITE}/insiders` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
