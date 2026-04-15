import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Market Heatmap — TWSE & Sector Performance",
  description:
    "Interactive stock market heatmap showing real-time performance of 3,500+ stocks across all sectors. Quickly spot market trends, sector rotation, and top movers at a glance.",
  openGraph: {
    title: "Market Heatmap — TWSE & Sector Performance",
    description:
      "Interactive stock market heatmap for 3,500+ stocks. Spot trends, sector rotation, and top movers at a glance.",
    url: `${SITE}/heatmap`,
  },
  alternates: { canonical: `${SITE}/heatmap` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
