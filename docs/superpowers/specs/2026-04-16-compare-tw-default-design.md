# /compare Taiwan Default Tickers Design

**Date:** 2026-04-16

**Goal**

Change the `/compare` page so that when no `tickers` query parameter is present, it initializes with Taiwan stock defaults instead of the current US stock defaults.

**Scope**

- Update the frontend-only default ticker initialization in `frontend/src/app/compare/page.tsx`.
- Preserve the existing behavior when `?tickers=` is present in the URL.
- Keep the existing limit of up to 5 tickers and all existing compare-page interactions unchanged.

**Out of Scope**

- No backend API changes.
- No market auto-detection or locale-based default selection.
- No shared cross-page default ticker refactor.

**Current Context**

The `/compare` page reads `tickers` from the query string, normalizes them to uppercase, and falls back to `["AAPL", "MSFT"]` when the query is missing or empty. The backend `/api/compare` endpoint already accepts arbitrary validated tickers from the query string, and the rest of the codebase already uses Yahoo-style Taiwan tickers such as `2330.TW` and `0050.TW`.

**Chosen Approach**

Use a minimal frontend-only change: replace the fallback default from `["AAPL", "MSFT"]` to `["2330.TW", "0050.TW"]`.

This is the lowest-risk option because the default is currently defined locally in the compare page and does not require API or routing changes. It also matches the established ticker format already used elsewhere in the project.

**Alternatives Considered**

1. Introduce a shared constant for default compare tickers.
This would improve reuse if multiple pages needed the same default pair, but it adds indirection without solving a current problem.

2. Add market-aware default selection.
This would support different defaults by locale or selected market, but it is unnecessary for the current requirement and would expand scope into product behavior decisions.

**Architecture**

The change stays inside the compare page's initial state calculation:

- If the URL contains `tickers`, continue using those values.
- If the URL does not contain valid tickers, initialize the local state with `2330.TW` and `0050.TW`.
- The existing effect that syncs local state back into the URL remains unchanged, so the page will continue to canonicalize the URL after load.

**Data Flow**

1. `useSearchParams()` reads the current `tickers` query string.
2. The page derives an `initial` ticker list from that query string.
3. If `initial` is empty, the page uses the new Taiwan fallback pair.
4. The existing load effect fetches compare data for the active tickers and updates the URL.

**Error Handling**

No new error-handling paths are needed. If the API cannot return data for a ticker, the page should continue following its current loading and failure behavior.

**Testing**

Add a focused test around the initialization logic to cover:

1. No `tickers` query present: defaults to `2330.TW` and `0050.TW`.
2. `tickers` query present: uses the query value instead of the fallback.

If the current page is difficult to test directly, extract the fallback selection into a small pure helper and test that helper instead of adding broad component test scaffolding.

**Risks**

- If the compare page currently has no test harness, adding the smallest viable unit test may require a small helper extraction.
- If some downstream data source lacks one of the chosen Taiwan symbols, the page would still load with the chosen defaults but show whatever existing empty/error UI it already uses.

**Success Criteria**

- Visiting `/compare` with no query string loads the page using `2330.TW` and `0050.TW`.
- Visiting `/compare?tickers=2412.TW,2882.TW` continues to use those query-provided symbols.
- No backend changes are required.
