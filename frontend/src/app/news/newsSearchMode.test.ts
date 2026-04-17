import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNewsUrl,
  getInitialNewsSearchState,
} from "./newsSearchMode.ts";

test("defaults to ticker mode when no search params are present", () => {
  const state = getInitialNewsSearchState(new URLSearchParams());

  assert.deepEqual(state, {
    mode: "ticker",
    query: "",
  });
});

test("uses symbol param for ticker mode and normalizes casing", () => {
  const state = getInitialNewsSearchState(new URLSearchParams("symbol=2330.tw"));

  assert.deepEqual(state, {
    mode: "ticker",
    query: "2330.TW",
  });
});

test("uses keyword param for beta keyword mode and preserves Chinese text", () => {
  const state = getInitialNewsSearchState(new URLSearchParams("keyword=%E5%8F%B0%E7%A9%8D%E9%9B%BB%20%E6%B3%95%E8%AA%AA%E6%9C%83"));

  assert.deepEqual(state, {
    mode: "keyword",
    query: "台積電 法說會",
  });
});

test("builds a ticker news URL with uppercased symbol", () => {
  assert.equal(buildNewsUrl("ticker", "2454.tw"), "/news?symbol=2454.TW");
});

test("builds a keyword news URL with encoded free text", () => {
  assert.equal(
    buildNewsUrl("keyword", "台積電 法說會"),
    "/news?keyword=%E5%8F%B0%E7%A9%8D%E9%9B%BB+%E6%B3%95%E8%AA%AA%E6%9C%83",
  );
});
