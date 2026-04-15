import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Stock Watchlist — Track Your Favorite Stocks",
  description:
    "Create and manage custom stock watchlists. Track real-time prices, daily changes, and key metrics for your favorite stocks all in one place.",
  openGraph: {
    title: "Stock Watchlist — Track Your Favorite Stocks",
    description:
      "Create custom watchlists. Track real-time prices, daily changes, and key metrics for your favorite stocks.",
    url: `${SITE}/watchlist`,
  },
  alternates: { canonical: `${SITE}/watchlist` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
