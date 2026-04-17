# /sector-analysis Taiwan Market Context Design

**Date:** 2026-04-17

**Goal**

Update the `/sector-analysis` page so its market examples, explanatory text, and sector-analysis framing use Taiwan-market context instead of explicit US-market context.

**Scope**

- Update the user-facing copy in `frontend/src/app/sector-analysis/page.tsx`.
- Replace explicit US-market references such as `S&P 500`, `XLK`, `XLV`, `XLE`, `AAPL`, and `NVDA` with Taiwan-market equivalents or Taiwan-oriented wording.
- Preserve the existing page structure, charts, API calls, and data fields.

**Out of Scope**

- No backend API changes.
- No changes to sector-correlation calculations or valuation calculations.
- No schema changes to the API payloads.
- No attempt to rename backend dataset metadata fields such as `totalStocksUsed` or `totalFilesInDataset`.
- No new presets, toggles, or market-selection UI.

**Current Context**

The `/sector-analysis` page currently presents its content in explicit US-market language even though the underlying implementation does not require that framing:

- The page subtitle describes `S&P 500 cross-sector correlations`.
- The metadata bar says `S&P 500 stocks processed`.
- The weighting explainer references sector ETFs such as `XLK`, `XLV`, and `XLE`.
- The examples of dominant constituents reference `AAPL` and `NVDA`.
- The methodology copy refers to `S&P 500 constituents` and `GICS sector`.

The backend sector-correlation and sector-valuation endpoints return generic sector and dataset metadata. The mismatch is therefore primarily a frontend copy problem rather than a data-model problem.

**Chosen Approach**

Perform a front-end-only Taiwan-context rewrite of the affected `/sector-analysis` copy while keeping the current data/API behavior unchanged.

The rewrite should use one of two styles depending on the sentence:

1. **Taiwan-specific examples** where a concrete example improves understanding.
   - Replace `AAPL` / `NVDA` with Taiwan large-cap examples such as `2330.TW` and `2317.TW`.
   - Replace US ETF references like `XLK`, `XLV`, `XLE` with Taiwan sector or broad-market examples such as `0050.TW`, Taiwan sector-theme ETFs, or equivalent Taiwan-market phrasing.

2. **Taiwan-market framing or neutralized Taiwan wording** where direct one-to-one substitution would be misleading.
   - Replace `S&P 500` framing with wording such as `台股市場`, `台股產業`, `大型權值股資料集`, or `台股產業資料集`, depending on what makes the sentence accurate.
   - Replace `GICS sector` wording with Taiwan-oriented industry/sector wording unless the sentence specifically needs a global classification-system reference.

This approach keeps the page internally consistent without pretending that the backend has become a different API.

**Alternatives Considered**

1. Only replace explicit ticker symbols and ETF examples.
This would still leave the page anchored to `S&P 500` wording and would produce inconsistent copy.

2. Convert everything to fully neutral, market-agnostic language.
This would be safer in a strict factual sense, but it would not satisfy the user’s request to move the page into Taiwan-market context.

3. Rework backend sector datasets to be explicitly Taiwan-only.
That would be a materially larger feature and is outside the requested scope.

**Architecture**

The change stays entirely inside the page component:

- Keep the existing calls to `fetchSectorCorrelation()` and `fetchSectorValuation()`.
- Keep the existing rendering flow, chart data, and metadata display structure.
- Update only the strings and explanatory copy that currently assume a US-market audience.

**Copy Strategy**

The copy rewrite should keep three layers aligned:

1. **Page framing**
   - Subtitle and metadata bar should describe the page as Taiwan-market or Taiwan-sector analysis instead of `S&P 500` analysis.

2. **Methodology explanation**
   - Explanations about cap-weighting, equal-weighting, and normalization should remain technically the same.
   - US-specific ETF and constituent examples should be replaced with Taiwan-oriented examples or more accurate Taiwan-market descriptions.

3. **Concrete examples**
   - Large-cap dominance examples should use Taiwan heavyweights such as `2330.TW` and `2317.TW`.
   - ETF comparisons should use Taiwan ETF analogies only where the analogy remains understandable; otherwise the copy should fall back to Taiwan-market wording instead of forcing a bad one-to-one mapping.

**Known US-Context Strings To Replace**

The current audit of `frontend/src/app/sector-analysis/page.tsx` found these direct US-context references that should be rewritten for this scope:

- `S&P 500`
- `XLK`
- `XLV`
- `XLE`
- `AAPL`
- `NVDA`
- `GICS sector`
- `S&P 500 constituents`
- `sector ETFs` phrasing when it is specifically tied to the US examples above

**Error Handling**

No new error-handling logic is required. This is a copy-only change, so existing loading, empty-state, and API-error behavior should remain untouched.

**Testing**

Use targeted verification for the touched page:

1. Run targeted lint on `frontend/src/app/sector-analysis/page.tsx`.
2. Search the page for the explicit US-market strings that are in scope and confirm they no longer appear.
3. Manually inspect the updated copy to ensure the Taiwan-context wording remains coherent across the page.

Because this change is textual rather than behavioral, new test scaffolding is not required unless a helper is introduced during implementation.

**Risks**

- A literal one-to-one replacement of every US example with a Taiwan example can make some methodology copy less precise if the analogy is forced too far.
- Over-correcting into Taiwan-specific claims could imply a backend data guarantee that the current API does not explicitly state.

These risks should be managed by preferring Taiwan-market framing over forced direct substitution when necessary.

**Success Criteria**

- `/sector-analysis` no longer presents itself as an `S&P 500`-specific page.
- Explicit US examples such as `XLK`, `XLV`, `XLE`, `AAPL`, and `NVDA` are replaced with Taiwan-oriented examples or Taiwan-market wording.
- The page’s explanatory text reads as one coherent Taiwan-market experience rather than a mix of US and Taiwan references.
- No backend or API behavior changes are required.
