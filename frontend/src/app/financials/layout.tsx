import { Metadata } from "next";

const SITE = "https://zero-sum-times.com";

export const metadata: Metadata = {
  title: "Financial Statements — Income, Balance Sheet & Cash Flow",
  description:
    "View detailed financial statements for any stock: income statements, balance sheets, and cash flow statements. Quarterly and annual data with trend visualization.",
  openGraph: {
    title: "Financial Statements — Income, Balance Sheet & Cash Flow",
    description:
      "View income statements, balance sheets, and cash flow data for any stock. Quarterly and annual trends.",
    url: `${SITE}/financials`,
  },
  alternates: { canonical: `${SITE}/financials` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
