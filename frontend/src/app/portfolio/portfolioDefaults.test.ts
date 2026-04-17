import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PORTFOLIO_SAMPLE_TICKER,
  DEFAULT_PORTFOLIO_SECONDARY_SAMPLE_TICKER,
  DEFAULT_PORTFOLIO_WHAT_IF_TICKER,
} from "./portfolioDefaults.ts";

test("uses Taiwan ticker examples across portfolio defaults", () => {
  assert.equal(DEFAULT_PORTFOLIO_SAMPLE_TICKER, "2330.TW");
  assert.equal(DEFAULT_PORTFOLIO_WHAT_IF_TICKER, "2330.TW");
  assert.equal(DEFAULT_PORTFOLIO_SECONDARY_SAMPLE_TICKER, "0050.TW");
});
