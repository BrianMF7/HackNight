import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { addonFor, depressionAddon } from "../focus/addon.js";

test("depression add-on is a prior episode and an elevated-mood screen, neither required or safety", () => {
  assert.deepEqual(depressionAddon.map((question) => question.id), ["DEP-001", "DEP-002"]);
  assert.equal(depressionAddon[0].label.length > 0, true);
  assert.equal(depressionAddon[1].label.length > 0, true);
  for (const question of depressionAddon) {
    assert.equal(question.required, false);
    assert.equal(question.safety, undefined);
  }
});

test("addonFor returns the depression questions and nothing else", () => {
  assert.equal(addonFor("depression"), depressionAddon);
  assert.equal(addonFor("anxiety"), null);
  assert.equal(addonFor(""), null);
});

test("the adult intake templates do not contain the add-on ids", () => {
  const serverTemplate = readFileSync(new URL("../template.js", import.meta.url), "utf8");
  const clientTemplate = readFileSync(new URL("../../src/api/templates/adultIntake.js", import.meta.url), "utf8");
  assert.equal(serverTemplate.includes("DEP-001"), false);
  assert.equal(serverTemplate.includes("DEP-002"), false);
  assert.equal(clientTemplate.includes("DEP-001"), false);
  assert.equal(clientTemplate.includes("DEP-002"), false);
});
