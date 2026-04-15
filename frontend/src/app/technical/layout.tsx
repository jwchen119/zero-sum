import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Technical Analysis — Charts, Indicators & Trading Signals",
  description:
    "Advanced technical analysis with interactive charts, moving averages, RSI, MACD, Bollinger Bands, and more. Analyze price action and trading signals for any stock.",
  openGraph: {
    title: "Technical Analysis — Charts, Indicators & Trading Signals",
    description:
      "Advanced technical analysis with interactive charts, RSI, MACD, Bollinger Bands, and more for any stock.",
    url: `${SITE}/technical`,
  },
  alternates: { canonical: `${SITE}/technical` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
