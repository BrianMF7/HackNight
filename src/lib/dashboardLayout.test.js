/// <reference types="node" />
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("the intake forms list uses the same width as the session tools", async () => {
  const src = await readFile(new URL("../pages/Dashboard.jsx", import.meta.url), "utf8");
  const tools = src.slice(src.indexOf("session-actions-heading") - 120, src.indexOf("session-actions-heading"));
  const forms = src.slice(src.indexOf('aria-label="Intake questionnaires"') - 40, src.indexOf('aria-label="Intake questionnaires"'));
  assert.equal(tools.includes("max-w-"), false);
  assert.equal(forms.includes("max-w-"), false);
});
