import assert from "node:assert/strict";
import test from "node:test";

import {
  CORRELATION_TICKER_PLACEHOLDER,
  DEFAULT_CORRELATION_TICKERS,
} from "./correlationDefaults.ts";

test("uses Taiwan tickers for the default correlation input", () => {
  assert.equal(
    DEFAULT_CORRELATION_TICKERS,
    "2330.TW,2317.TW,2454.TW,2303.TW,2412.TW,2882.TW",
  );
});

test("uses Taiwan tickers for the correlation placeholder example", () => {
  assert.equal(
    CORRELATION_TICKER_PLACEHOLDER,
    "2330.TW,2317.TW,2454.TW",
  );
});
