import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Portfolio Simulator ??Build & Backtest Stock Portfolios",
  description:
    "Free portfolio simulator for stocks. Build custom portfolios, track performance, analyze allocation, and compare against selected benchmarks.",
  openGraph: {
    title: "Portfolio Simulator ??Build & Backtest Stock Portfolios",
    description:
      "Build custom stock portfolios, track performance, and compare against benchmarks. Free portfolio analysis tool.",
    url: `${SITE}/portfolio`,
  },
  alternates: { canonical: `${SITE}/portfolio` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
