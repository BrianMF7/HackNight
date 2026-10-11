/// <reference types="node" />
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("the intake session bar does not label the backend mode", async () => {
  const src = await readFile(new URL("../components/workspace/SessionTimerBar.jsx", import.meta.url), "utf8");
  assert.equal(src.includes("Live backend"), false);
  assert.equal(src.includes("Demo · synthetic data"), false);
});
