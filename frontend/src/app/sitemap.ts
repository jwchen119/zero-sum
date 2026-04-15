const SITE = "https://zero-sum-times.com";
const API = process.env.BACKEND_URL || "http://localhost:5000";

type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

export const revalidate = 21600; // 6 hours

export default async function sitemap(): Promise<SitemapEntry[]> {
  const now = new Date();

  const staticPages: SitemapEntry[] = [
    { url: SITE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE}/screener-v4`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/heatmap`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/earnings`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/bubble`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/sectors`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/sector-analysis`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/dividends`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/insiders`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/financials`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/scanner`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/technical`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/portfolio`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/correlation`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/watchlist`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];

  // Dynamic stock pages + technical analysis pages
  const stockPages: SitemapEntry[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(`${API}/api/screener?sort=marketCap&order=desc`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const stocks: { symbol: string }[] = data.stocks || [];
      for (const s of stocks) {
        stockPages.push({
          url: `${SITE}/stocks/${s.symbol}`,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.7,
        });
        stockPages.push({
          url: `${SITE}/technical/${s.symbol}`,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.5,
        });
      }
    } else {
      console.error(`[sitemap] screener returned ${res.status}`);
    }
  } catch (err) {
    console.error("[sitemap] failed to fetch stock list:", err);
  }

  return [...staticPages, ...stockPages];
}
