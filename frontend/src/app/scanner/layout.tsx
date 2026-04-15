import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Technical Scanner — Real-Time Pattern & Signal Detection",
  description:
    "Scan the market for technical patterns, breakouts, and trading signals in real time. Configurable filters for volume spikes, moving average crossovers, and price action setups.",
  openGraph: {
    title: "Technical Scanner — Real-Time Pattern & Signal Detection",
    description:
      "Scan for technical patterns, breakouts, and trading signals across 3,500+ stocks in real time.",
    url: `${SITE}/scanner`,
  },
  alternates: { canonical: `${SITE}/scanner` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
