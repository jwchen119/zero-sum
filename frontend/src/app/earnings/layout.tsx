import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Earnings Calendar — Upcoming & Recent Earnings Reports",
  description:
    "Track upcoming and recent earnings reports for NASDAQ-listed stocks. View earnings dates, EPS estimates vs. actuals, revenue surprises, and after-hours reactions.",
  openGraph: {
    title: "Earnings Calendar — Upcoming & Recent Earnings Reports",
    description:
      "Track upcoming earnings dates, EPS estimates, revenue surprises, and after-hours reactions for 3,500+ stocks.",
    url: `${SITE}/earnings`,
  },
  alternates: { canonical: `${SITE}/earnings` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
