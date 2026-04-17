# /news Ticker + Keyword Beta Search Design

**Date:** 2026-04-17

**Goal**

Keep the existing ticker-based `/news` search intact while adding a reversible `Keyword (Beta)` mode that allows Chinese and other free-text queries for broader, fresher news discovery.

**Scope**

- Keep the current ticker-search flow on `/news`.
- Add a clear UI mode switch on `frontend/src/app/news/page.tsx`:
  - `Ticker`
  - `Keyword (Beta)`
- Add a new backend search path for free-text news queries that does not rely on ticker validation.
- Ensure the new keyword mode is easy to remove later without affecting the existing ticker mode.

**Out of Scope**

- No removal or behavior change of the existing ticker-search mode.
- No changes to unrelated pages or shared ticker validation behavior used elsewhere.
- No promise that AI summary must support the keyword mode in the first iteration if the summary pipeline is too ticker-specific.
- No attempt to fully internationalize every news source or solve source-level freshness limits across all providers.

**Current Context**

The current `/news` implementation is strictly ticker-oriented across both frontend and backend:

- The page initializes from `?symbol=...` and uppercases the query.
- The input uses `TickerAutocomplete`, which uppercases typed content and is optimized for ticker symbols.
- The frontend validation in `doFetch()` only accepts ticker-like patterns.
- The backend `/api/stock-news` route calls `_validate_ticker()` and rejects anything that is not a ticker.
- News fetching currently uses source strategies tuned for ticker input, for example Google News with `"<ticker> stock"` and Yahoo Finance feeds keyed by symbol.

This means allowing Chinese input in the frontend alone would not help, because the backend would still reject the query.

**Problem Statement**

Taiwan tickers such as `2330.TW` may return limited or stale news. In practice, company names or free-text Chinese phrases such as `台積電`, `台積電 法說會`, or `鴻海 AI 伺服器` are often better search terms for discovering more recent news.

Therefore the feature needed is not merely &ldquo;allow non-alphanumeric input&rdquo; but rather &ldquo;introduce a second query mode with different query semantics.&rdquo;

**Chosen Approach**

Add an explicit search-mode switch to `/news`:

1. **Ticker**
   - Preserves the current behavior exactly.
   - Keeps `TickerAutocomplete`.
   - Keeps ticker-format validation.
   - Continues to call the existing ticker-based news endpoint.

2. **Keyword (Beta)**
   - Uses a plain text input that allows Chinese and arbitrary text.
   - Does not force uppercase normalization.
   - Skips ticker-format validation.
   - Calls a new backend keyword-news endpoint (or the same endpoint with an explicit mode flag) that performs free-text query searches.

This approach is preferred because it creates a clean product boundary between two different search behaviors and makes the new mode easy to roll back later.

**Alternatives Considered**

1. Auto-detect whether the input looks like a ticker or a keyword.
This reduces UI surface but creates ambiguity for inputs such as `2330`, `TSMC`, or mixed phrases. It is also harder to remove later because the behaviors are intertwined.

2. Replace the ticker input with a single free-text input.
This would degrade the current ticker-focused experience and risks breaking a workflow that already works acceptably for US and structured symbol searches.

3. Only loosen the frontend input restrictions and keep the current API.
This would not solve the problem because the backend still validates the query as a ticker.

**Architecture**

The implementation should separate the two modes end-to-end:

- **Frontend**
  - Track search mode in page state and URL query parameters.
  - Render the ticker autocomplete input only in `Ticker` mode.
  - Render a plain text input only in `Keyword (Beta)` mode.
  - Route requests to the correct fetch function based on mode.

- **Backend**
  - Preserve the current `/api/stock-news` ticker endpoint behavior.
  - Add a new keyword-search endpoint, or add a mode-aware branch with explicit query parameters, for example:
    - `/api/stock-news-keyword?query=台積電`
    - or `/api/stock-news?mode=keyword&query=台積電`
  - Do not reuse `_validate_ticker()` for keyword mode.

**Data Flow**

**Ticker mode**

1. User enters a ticker via autocomplete.
2. Frontend normalizes the ticker and updates the URL with `symbol=...` and `mode=ticker`.
3. Frontend calls the existing ticker news fetch path.
4. Backend queries ticker-oriented sources and returns articles.

**Keyword mode**

1. User enters free text such as `台積電` or `台積電 法說會`.
2. Frontend updates the URL with `query=...` and `mode=keyword`.
3. Frontend calls the keyword-news fetch path.
4. Backend queries keyword-friendly sources, prioritizing broad text search rather than ticker feeds.
5. Backend returns normalized articles in the same article-list shape where possible.

**Source Strategy**

The first iteration should prefer sources that work well with free-text search:

- Google News RSS search should be the primary source for keyword mode because it accepts arbitrary search terms.
- Yahoo RSS and `yfinance` ticker news are naturally ticker-centric and may be omitted or deprioritized for keyword mode.

This keeps the beta focused on the user’s real problem: keyword freshness and coverage.

**URL & Reversibility**

The mode should be explicit in the page URL so testing and rollback are simple:

- `Ticker` example: `/news?mode=ticker&symbol=2330.TW`
- `Keyword` example: `/news?mode=keyword&query=%E5%8F%B0%E7%A9%8D%E9%9B%BB`

This makes the beta easy to disable later because the keyword logic is isolated rather than merged into the ticker flow.

**AI Summary**

The current AI summary path is ticker-oriented. For the first iteration:

- It is acceptable to keep AI summary enabled only in `Ticker` mode.
- In `Keyword (Beta)` mode, either hide the summary button or show a clear note that AI summary is currently ticker-only.

This keeps the beta small and avoids overextending the scope into content summarization design.

**Error Handling**

- `Ticker` mode should keep existing ticker validation and error behavior.
- `Keyword (Beta)` mode should validate only basic query presence and a reasonable length limit.
- Empty queries should be rejected with a user-facing message.
- Backend keyword mode should return a clear error for missing `query`.

**Testing**

The implementation should include targeted verification for both frontend and backend paths:

1. Verify `/news` still supports ticker search unchanged.
2. Verify `Keyword (Beta)` mode accepts Chinese input.
3. Verify the backend keyword path does not reject Chinese/free-text input as an invalid ticker.
4. Run targeted lint for the touched frontend page.
5. Add focused tests for any extracted query-mode helper if one is introduced.

Because this is a behavior addition rather than a copy-only change, test coverage is more important here than in the previous purely textual rewrites.

**Risks**

- Free-text searches may return broader, noisier results than ticker searches.
- Keyword mode may surface duplicate or less finance-specific articles depending on source quality.
- If the UI does not clearly separate the two modes, users may be confused about why autocomplete works in one mode but not the other.

These risks are acceptable for a beta feature if the mode is clearly labeled and isolated.

**Success Criteria**

- `/news` still supports the existing ticker workflow unchanged.
- `/news` offers a visible `Keyword (Beta)` mode.
- `Keyword (Beta)` mode accepts Chinese and free-text input.
- The backend supports keyword-based news search without ticker validation errors.
- The new mode is clearly isolated so it can be removed later without undoing the ticker workflow.
