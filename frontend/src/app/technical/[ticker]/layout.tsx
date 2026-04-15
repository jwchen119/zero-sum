import type { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  const title = `${t} Technical Analysis — Charts, Patterns & Signals`;
  const description = `Technical analysis for ${t}: interactive price charts, support/resistance levels, chart patterns, volume analysis, and trading signals.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}/technical/${t}`,
    },
    alternates: { canonical: `${SITE}/technical/${t}` },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
