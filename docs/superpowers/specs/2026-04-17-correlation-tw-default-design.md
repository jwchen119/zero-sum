# /correlation Taiwan Default Tickers Design

**Date:** 2026-04-17

**Goal**

Change the `/correlation` page so the ticker input defaults and ticker placeholder use Taiwan stock symbols instead of the current US stock symbols.

**Scope**

- Update the default ticker string in `frontend/src/app/correlation/page.tsx`.
- Update the ticker input placeholder in `frontend/src/app/correlation/page.tsx`.
- Keep the rest of the correlation page behavior unchanged.

**Out of Scope**

- No backend API changes.
- No new presets, market toggles, or UI controls.
- No shared cross-page default ticker refactor.
- No changes to generic "ticker" or "benchmark" wording that does not mention specific US symbols.

**Current Context**

The `/correlation` page currently hard-codes US tickers in two user-facing places:

1. `DEFAULT_TICKERS = "AAPL,MSFT,GOOG,AMZN,NVDA,TSLA"` initializes the input.
2. `placeholder="AAPL,MSFT,GOOG"` shows example symbols below the `Tickers` label.

The rest of the page uses generic wording such as "ticker" and "benchmark" and does not mention specific US stock symbols. The backend correlation endpoints already accept arbitrary ticker lists from the frontend, so this change is frontend-only.

**Chosen Approach**

Make a minimal page-local change:

- Replace the default ticker string with `2330.TW,2317.TW,2454.TW,2303.TW,2412.TW,2882.TW`.
- Replace the placeholder string with `2330.TW,2317.TW,2454.TW`.

This keeps the implementation focused on the exact user request and avoids introducing new abstraction or product behavior.

**Alternatives Considered**

1. Extract a shared Taiwan-default constant for multiple pages.
This would improve reuse if several tools needed the same preset, but it adds indirection without solving a current maintenance problem.

2. Add selectable presets or market-aware defaults.
This would give users more flexibility, but it expands scope into new UI and product decisions that were not requested.

**Architecture**

The change stays entirely inside the correlation page module:

- The page continues to parse tickers from the input the same way it does today.
- Only the initial example values shown to the user change.
- All charting, API fetching, validation, and benchmark logic remain unchanged.

**Other US-Ticker Audit**

The current audit of `frontend/src/app/correlation/page.tsx` found only two direct US-ticker strings that require attention for this request:

1. The page default ticker list.
2. The ticker input placeholder.

No additional hard-coded US stock symbols were found elsewhere in the page.

**Error Handling**

No new error-handling logic is needed. Existing validation such as minimum ticker count, maximum ticker count, and API error handling should remain unchanged.

**Testing**

Use targeted verification for the touched page. Because this is a small constant change inside an existing page file, the minimum acceptable verification is:

1. Run targeted lint on `frontend/src/app/correlation/page.tsx`.
2. Confirm the changed strings are the new Taiwan values.

If the page already has an easily testable helper for defaults, a small unit test would be acceptable, but adding new test scaffolding is not required for this change.

**Risks**

- If one of the selected Taiwan symbols has limited data coverage for a chosen period, the page may surface its existing empty or degraded chart behavior.
- Because the defaults are page-local constants, any future desire to synchronize them with other pages would still require a follow-up refactor.

**Success Criteria**

- Visiting `/correlation` shows `2330.TW,2317.TW,2454.TW,2303.TW,2412.TW,2882.TW` as the default ticker input.
- The ticker input placeholder shows `2330.TW,2317.TW,2454.TW`.
- No other behavior on the correlation page changes.
- No additional hard-coded US ticker strings remain on the page for this scope.
