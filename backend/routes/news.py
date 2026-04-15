"""
News blueprint: per-ticker stock news from multiple free sources.
Sources: Google News RSS, Yahoo Finance (yfinance), Yahoo Finance RSS.
Includes article text extraction and AI-powered news summary/signal.
"""

import json
import os
import re
import time
import hashlib
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote_plus, urlparse

import requests
from flask import Blueprint, jsonify, request

from shared import (
    _cache_get,
    _cache_put,
    _validate_ticker,
    logger,
)

news_bp = Blueprint("news", __name__)

_SESSION = requests.Session()
_SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; StockNewsBot/1.0)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
})

# TTL for per-ticker news cache: 30 minutes
_NEWS_TTL = 1800


# ─── Source: Google News RSS ─────────────────────────────

def _fetch_google_news(ticker: str) -> list[dict]:
    """Fetch recent articles from Google News RSS for a stock ticker."""
    try:
        import feedparser
    except ImportError:
        logger.warning("feedparser not installed — skipping Google News")
        return []

    url = (
        f"https://news.google.com/rss/search?"
        f"q={quote_plus(ticker + ' stock')}&hl=en-US&gl=US&ceid=US:en"
    )
    try:
        resp = _SESSION.get(url, timeout=10)
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
        articles = []
        for entry in feed.entries[:15]:
            pub_date = ""
            if hasattr(entry, "published"):
                pub_date = entry.published
            elif hasattr(entry, "updated"):
                pub_date = entry.updated

            # Google News titles often include " - Publisher" at the end
            title = entry.get("title", "")
            publisher = ""
            source_tag = entry.get("source", {})
            if hasattr(source_tag, "title"):
                publisher = source_tag.title
            elif " - " in title:
                publisher = title.rsplit(" - ", 1)[-1]

            articles.append({
                "title": title,
                "link": entry.get("link", ""),
                "publisher": publisher,
                "publishedAt": pub_date,
                "source": "Google News",
            })
        return articles
    except Exception as exc:
        logger.warning("Google News fetch failed for %s: %s", ticker, exc)
        return []


# ─── Source: Yahoo Finance RSS ───────────────────────────

def _fetch_yahoo_rss(ticker: str) -> list[dict]:
    """Fetch from Yahoo Finance RSS feed."""
    url = (
        f"https://feeds.finance.yahoo.com/rss/2.0/headline?"
        f"s={quote_plus(ticker)}&region=US&lang=en-US"
    )
    try:
        import feedparser
    except ImportError:
        return []

    try:
        resp = _SESSION.get(url, timeout=10)
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
        articles = []
        for entry in feed.entries[:10]:
            pub_date = ""
            if hasattr(entry, "published"):
                pub_date = entry.published

            articles.append({
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "publisher": "Yahoo Finance",
                "publishedAt": pub_date,
                "source": "Yahoo RSS",
            })
        return articles
    except Exception as exc:
        logger.warning("Yahoo RSS fetch failed for %s: %s", ticker, exc)
        return []


# ─── Source: yfinance news property ──────────────────────

def _fetch_yfinance_news(ticker: str) -> list[dict]:
    """Fetch news via yfinance Ticker.news property."""
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        raw = t.news
        if not raw or not isinstance(raw, list):
            return []
        articles = []
        for n in raw[:10]:
            content = n.get("content", {}) if isinstance(n, dict) else {}
            title = content.get("title") or n.get("title", "")
            pub = content.get("pubDate") or n.get("pubDate", "")
            link = (content.get("canonicalUrl", {}).get("url", "")
                    or n.get("link", ""))
            provider = ""
            if isinstance(content.get("provider"), dict):
                provider = content["provider"].get("displayName", "")
            elif isinstance(n.get("publisher"), str):
                provider = n["publisher"]

            if title:
                articles.append({
                    "title": title,
                    "link": link,
                    "publisher": provider,
                    "publishedAt": pub,
                    "source": "Yahoo Finance",
                })
        return articles
    except Exception as exc:
        logger.warning("yfinance news failed for %s: %s", ticker, exc)
        return []


# ─── Deduplicate & merge ─────────────────────────────────

def _normalize(title: str) -> str:
    """Normalize title for dedup: lowercase, strip punctuation."""
    return re.sub(r"[^a-z0-9 ]", "", title.lower()).strip()


def _merge_news(sources: list[list[dict]]) -> list[dict]:
    """Merge articles from multiple sources, deduplicate by title."""
    seen: set[str] = set()
    merged: list[dict] = []
    for articles in sources:
        for a in articles:
            key = _normalize(a.get("title", ""))
            if key and key not in seen:
                seen.add(key)
                merged.append(a)
    return merged[:40]


# ─── API endpoint ────────────────────────────────────────

@news_bp.route("/api/stock-news")
def api_stock_news():
    """Return recent news for a given ticker from multiple free sources."""
    ticker_raw = request.args.get("symbol", "").strip()
    ticker, err = _validate_ticker(ticker_raw)
    if err:
        return err

    # Check cache first
    cache_key = f"news_{ticker}"
    cached = _cache_get("stock_news", cache_key, ttl=_NEWS_TTL)
    if cached is not None:
        return jsonify(cached)

    # Fetch from all sources in parallel
    results: list[list[dict]] = [[], [], []]
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {
            pool.submit(_fetch_google_news, ticker): 0,
            pool.submit(_fetch_yahoo_rss, ticker): 1,
            pool.submit(_fetch_yfinance_news, ticker): 2,
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                results[idx] = future.result()
            except Exception as exc:
                logger.warning("News source %d failed for %s: %s", idx, ticker, exc)

    articles = _merge_news(results)

    payload = {
        "ticker": ticker,
        "articles": articles,
        "sources": ["Google News", "Yahoo RSS", "Yahoo Finance"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

    _cache_put("stock_news", cache_key, payload)
    return jsonify(payload)


# ─── Article text extraction ─────────────────────────────

_ALLOWED_SCHEMES = {"http", "https"}

def _resolve_google_news_url(url: str) -> str:
    """Follow Google News redirect to get the real article URL."""
    if "news.google.com" not in url:
        return url
    try:
        resp = _SESSION.get(url, timeout=10, allow_redirects=True)
        final = resp.url
        # If we hit a consent page, try to extract the continue URL
        if "consent.google.com" in final:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(final)
            params = parse_qs(parsed.query)
            continue_url = params.get("continue", [""])[0]
            if continue_url and "news.google.com" not in continue_url:
                return continue_url
        # If the final URL is still google, trafilatura will try its own resolution
        if "google.com" not in final:
            return final
        return url
    except Exception:
        return url


def _extract_article_text(url: str) -> dict:
    """Extract article text from a URL using trafilatura."""
    try:
        import trafilatura
    except ImportError:
        return {"error": "trafilatura not installed"}

    try:
        real_url = _resolve_google_news_url(url)

        # trafilatura has its own fetcher that handles more edge cases
        downloaded = trafilatura.fetch_url(real_url)

        # If Google News resolution didn't work, try the original URL
        if not downloaded and real_url != url:
            downloaded = trafilatura.fetch_url(url)

        if not downloaded:
            return {"url": real_url, "text": "", "error": "Could not download page"}

        text = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            favor_precision=True,
        )
        if not text:
            return {"url": real_url, "text": "", "error": "Could not extract text (paywalled or JS-rendered)"}

        return {"url": real_url, "text": text}
    except Exception as exc:
        return {"url": url, "text": "", "error": str(exc)}


@news_bp.route("/api/article-extract")
def api_article_extract():
    """Extract readable text from a news article URL."""
    url = request.args.get("url", "").strip()
    if not url:
        return jsonify({"error": "Missing 'url' parameter"}), 400

    parsed = urlparse(url)
    if parsed.scheme not in _ALLOWED_SCHEMES:
        return jsonify({"error": "Invalid URL scheme"}), 400

    # Cache by URL hash
    url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
    cache_key = f"extract_{url_hash}"
    cached = _cache_get("article_extract", cache_key, ttl=86400)
    if cached is not None:
        return jsonify(cached)

    result = _extract_article_text(url)
    result["requestedUrl"] = url
    result["extractedAt"] = datetime.now(timezone.utc).isoformat()

    if result.get("text"):
        _cache_put("article_extract", cache_key, result)

    return jsonify(result)


# ─── AI News Summary / Signal ─────────────────────────────

_SUMMARY_TTL = 3600  # 1 hour cache for AI summaries

_NEWS_SUMMARY_PROMPT = """You are a financial news analyst. Given a collection of recent news article excerpts about a stock ticker, produce a structured analysis.

Return ONLY valid JSON with this structure:
{
  "sentiment": "bullish" | "bearish" | "neutral" | "mixed",
  "sentimentScore": <number from -1.0 (very bearish) to 1.0 (very bullish)>,
  "headline": "<one-line summary of the overall news situation, max 15 words>",
  "summary": "<2-4 paragraph analysis of what's happening with this stock based on the news. Include specific details from the articles. Explain WHY the stock might be moving up or down. Written in clear, non-technical English.>",
  "keyTopics": ["<topic1>", "<topic2>", ...],
  "risks": ["<risk factor mentioned in news>", ...],
  "catalysts": ["<positive catalyst mentioned in news>", ...]
}

Be specific. Reference actual events from the articles. If the news is about a recall, say so. If there's an earnings beat, mention the numbers. Don't be generic."""


def _build_news_context(ticker: str, articles: list[dict], max_articles: int = 8) -> str:
    """Extract text from top articles and build context for GPT."""
    context_parts = [f"Stock: {ticker}\nDate: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n"]

    extracted_count = 0
    for article in articles[:max_articles]:
        url = article.get("link", "")
        title = article.get("title", "")
        publisher = article.get("publisher", "")
        pub_date = article.get("publishedAt", "")

        header = f"\n--- Article {extracted_count + 1} ---\nTitle: {title}\nPublisher: {publisher}\nDate: {pub_date}\n"

        if url:
            result = _extract_article_text(url)
            text = result.get("text", "")
            if text:
                # Truncate long articles to keep context manageable
                if len(text) > 1500:
                    text = text[:1500] + "…"
                context_parts.append(header + f"Content:\n{text}\n")
                extracted_count += 1
                continue

        # Fallback: just use the title
        context_parts.append(header + "Content: (not available — title only)\n")

    return "\n".join(context_parts)


@news_bp.route("/api/stock-news-summary")
def api_stock_news_summary():
    """Generate an AI-powered news summary and sentiment signal for a ticker."""
    ticker_raw = request.args.get("symbol", "").strip()
    ticker, err = _validate_ticker(ticker_raw)
    if err:
        return err

    # Check cache
    cache_key = f"summary_{ticker}"
    cached = _cache_get("news_summary", cache_key, ttl=_SUMMARY_TTL)
    if cached is not None:
        return jsonify(cached)

    # Check for OpenAI key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return jsonify({"error": "AI summarization not available (no API key configured)"}), 503

    # Get cached news articles (or fetch fresh ones)
    news_cache_key = f"news_{ticker}"
    news_data = _cache_get("stock_news", news_cache_key, ttl=_NEWS_TTL)

    if not news_data or not news_data.get("articles"):
        # Fetch fresh news inline
        results: list[list[dict]] = [[], [], []]
        with ThreadPoolExecutor(max_workers=3) as pool:
            futures = {
                pool.submit(_fetch_google_news, ticker): 0,
                pool.submit(_fetch_yahoo_rss, ticker): 1,
                pool.submit(_fetch_yfinance_news, ticker): 2,
            }
            for future in as_completed(futures):
                idx = futures[future]
                try:
                    results[idx] = future.result()
                except Exception:
                    pass
        articles = _merge_news(results)
        if articles:
            news_data = {
                "ticker": ticker,
                "articles": articles,
                "sources": ["Google News", "Yahoo RSS", "Yahoo Finance"],
                "generatedAt": datetime.now(timezone.utc).isoformat(),
            }
            _cache_put("stock_news", news_cache_key, news_data)
    else:
        articles = news_data.get("articles", [])

    if not articles:
        return jsonify({
            "ticker": ticker,
            "error": "No news articles found to summarize",
            "sentiment": "neutral",
            "sentimentScore": 0,
            "headline": f"No recent news for {ticker}",
            "summary": "",
            "keyTopics": [],
            "risks": [],
            "catalysts": [],
        })

    # Build context from article text
    context = _build_news_context(ticker, articles)
    logger.info("news-summary %s: built context from %d articles (%d chars)",
                ticker, len(articles), len(context))

    # Call OpenAI
    try:
        from openai import OpenAI

        org_id = os.environ.get("OPENAI_ORG_ID")
        model = os.environ.get("NEWS_SUMMARY_MODEL", "gpt-4o-mini")
        client = OpenAI(api_key=api_key, organization=org_id)

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _NEWS_SUMMARY_PROMPT},
                {"role": "user", "content": context},
            ],
            temperature=0.3,
            max_tokens=1500,
        )

        raw = response.choices[0].message.content.strip()
        usage = response.usage
        logger.info("news-summary %s: tokens — prompt: %d, completion: %d",
                     ticker, usage.prompt_tokens, usage.completion_tokens)

        # Strip markdown fences
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*\n?", "", raw)
            raw = re.sub(r"\n?```\s*$", "", raw)

        result = json.loads(raw)

    except json.JSONDecodeError:
        logger.warning("news-summary %s: GPT returned invalid JSON", ticker)
        return jsonify({"error": "AI returned invalid response, try again"}), 500
    except Exception as exc:
        logger.error("news-summary %s failed: %s", ticker, exc)
        return jsonify({"error": f"AI summarization failed: {str(exc)}"}), 500

    # Build response
    payload = {
        "ticker": ticker,
        "sentiment": result.get("sentiment", "neutral"),
        "sentimentScore": result.get("sentimentScore", 0),
        "headline": result.get("headline", ""),
        "summary": result.get("summary", ""),
        "keyTopics": result.get("keyTopics", []),
        "risks": result.get("risks", []),
        "catalysts": result.get("catalysts", []),
        "articlesAnalyzed": len(articles),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": model,
    }

    _cache_put("news_summary", cache_key, payload)
    return jsonify(payload)
