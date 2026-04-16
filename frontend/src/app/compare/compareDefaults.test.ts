import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_COMPARE_TICKERS,
  getInitialCompareTickers,
} from "./compareDefaults.ts";

test("falls back to Taiwan compare defaults when query tickers are missing", () => {
  assert.deepEqual(getInitialCompareTickers(null), DEFAULT_COMPARE_TICKERS);
});

test("uses query tickers instead of the fallback and normalizes casing", () => {
  assert.deepEqual(
    getInitialCompareTickers("2412.tw,2882.tw"),
    ["2412.TW", "2882.TW"],
  );
});
