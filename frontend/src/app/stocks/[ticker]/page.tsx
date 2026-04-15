import type { Metadata } from "next";
import StockDetailClient from "./StockDetailClient";
import type { InitialStockData } from "./StockDetailClient";

const API = process.env.BACKEND_URL || "http://localhost:5000";
const SITE = "https://zero-sum-times.com";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

// ISR: pages are server-rendered on first request, then cached for 5 min.
// No generateStaticParams — the backend isn't available during docker build.
// Next.js won't pre-render dynamic [ticker] routes without generateStaticParams,
// so build works fine. At runtime, ISR serves cached HTML in <10ms.
export const revalidate = 300;

async function getStockMeta(ticker: string) {
  try {
    const res = await fetch(`${API}/api/stock-detail/${encodeURIComponent(ticker)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  const data = await getStockMeta(t);
  const name = data?.profile?.name || t;
  const sector = data?.profile?.sector || "";
  const price = data?.prices?.length
    ? `$${data.prices[data.prices.length - 1].close.toFixed(2)}`
    : "";

  const title = `${name} (${t}) Stock Price, Financials & Analysis — Zero Sum Times`;
  const description = `${t} ${price ? `at ${price}` : "stock"} — financials, key ratios, analyst ratings, balance sheet, and cash flow analysis.${sector ? ` Sector: ${sector}.` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}/stocks/${t}`,
      siteName: "The Zero Sum Times",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: `${SITE}/stocks/${t}`,
    },
  };
}

/* ─── Helper: format large numbers for SSR summary ─── */
function fmtNum(n: number | null | undefined): string {
  if (n == null) return "N/A";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default async function StockPage({ params }: PageProps) {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  const data = await getStockMeta(t);

  const name = data?.profile?.name || t;
  const sector = data?.profile?.sector || "";
  const industry = data?.profile?.industry || "";
  const description = data?.profile?.description || "";
  const price = data?.prices?.length
    ? data.prices[data.prices.length - 1].close
    : null;
  const ratios = data?.ratios;

  const jsonLd = data
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "FinancialProduct",
            name: `${name} (${t})`,
            description: `Stock analysis and financial data for ${name}${sector ? ` in the ${sector} sector` : ""}${industry ? `, ${industry} industry` : ""}.`,
            url: `${SITE}/stocks/${t}`,
            ...(price && { offers: { "@type": "Offer", price: price.toFixed(2), priceCurrency: "USD" } }),
            provider: {
              "@type": "Organization",
              name: "The Zero Sum Times",
              url: SITE,
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE },
              { "@type": "ListItem", position: 2, name: "Stocks", item: `${SITE}/screener-v4` },
              { "@type": "ListItem", position: 3, name: `${t} — ${name}`, item: `${SITE}/stocks/${t}` },
            ],
          },
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {/* Server-rendered SEO article — visible to crawlers, hidden once JS hydrates */}
      {data && (
        <article
          className="sr-only"
          aria-hidden="true"
          itemScope
          itemType="https://schema.org/Article"
        >
          <h1 itemProp="headline">{name} ({t}) — Stock Price, Financials &amp; Analysis</h1>
          {description && <p itemProp="description">{description}</p>}
          <section>
            <h2>Key Statistics — {t}</h2>
            <ul>
              {price != null && <li>Latest Close: ${price.toFixed(2)}</li>}
              {ratios?.marketCap && <li>Market Cap: {fmtNum(ratios.marketCap)}</li>}
              {ratios?.trailingPE != null && <li>P/E Ratio (TTM): {ratios.trailingPE.toFixed(1)}</li>}
              {ratios?.epsTrailing != null && <li>EPS (TTM): ${ratios.epsTrailing.toFixed(2)}</li>}
              {ratios?.dividendYield != null && <li>Dividend Yield: {(ratios.dividendYield * 100).toFixed(2)}%</li>}
              {ratios?.beta != null && <li>Beta: {ratios.beta.toFixed(2)}</li>}
              {ratios?.fiftyTwoWeekHigh != null && <li>52-Week High: ${ratios.fiftyTwoWeekHigh.toFixed(2)}</li>}
              {ratios?.fiftyTwoWeekLow != null && <li>52-Week Low: ${ratios.fiftyTwoWeekLow.toFixed(2)}</li>}
              {ratios?.profitMargin != null && <li>Profit Margin: {(ratios.profitMargin * 100).toFixed(1)}%</li>}
              {ratios?.roe != null && <li>Return on Equity: {(ratios.roe * 100).toFixed(1)}%</li>}
              {ratios?.debtToEquity != null && <li>Debt to Equity: {ratios.debtToEquity.toFixed(1)}</li>}
            </ul>
          </section>
          {sector && <p>Sector: {sector}{industry ? ` — ${industry}` : ""}</p>}
          {data.income?.length > 0 && (
            <section>
              <h2>Income Statement — {t}</h2>
              <ul>
                {data.income.slice(0, 4).map((item: { period: string; revenue: number | null; netIncome: number | null }) => (
                  <li key={item.period}>
                    {item.period}: Revenue {fmtNum(item.revenue)}, Net Income {fmtNum(item.netIncome)}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {data.analysis?.plainEnglish && (
            <section>
              <h2>AI Analysis — {t}</h2>
              <p>{data.analysis.plainEnglish}</p>
            </section>
          )}
        </article>
      )}
      <StockDetailClient initialData={data ? {
        ...data,
        prices: (data.prices ?? []).slice(-30).map((p: { date?: string; time?: string; open: number; high: number; low: number; close: number; volume: number }) => ({
          time: p.time ?? p.date ?? "",
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume,
        })),
      } as InitialStockData : null} />
    </>
  );
}
