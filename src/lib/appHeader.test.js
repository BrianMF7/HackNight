/// <reference types="node" />
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("the signed-in header logo returns to the demo", async () => {
  const src = await readFile(new URL("../components/clinic/AppLayout.jsx", import.meta.url), "utf8");
  assert.match(src, /<Link to="\/app"><Logo \/><\/Link>/);
});

test("the public homepage logo still opens the homepage", async () => {
  const src = await readFile(new URL("../components/marketing/SiteNav.jsx", import.meta.url), "utf8");
  assert.match(src, /<Link to="\/" aria-label="MindScribe home"><Logo \/><\/Link>/);
});
