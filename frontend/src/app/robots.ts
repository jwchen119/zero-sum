export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/prototype/", "/sitemap-dev", "/screener-v2", "/screener-v3", "/screener", "/status", "/share"],
      },
    ],
    sitemap: "https://zero-sum-times.com/sitemap.xml",
  };
}
