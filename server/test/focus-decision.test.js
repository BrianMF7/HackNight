import assert from "node:assert/strict";
import { test } from "node:test";
import { depressionAddon } from "../focus/addon.js";
import { applyFocusDecision } from "../focus/decision.js";

const surfaced = {
  focuses: [{ id: "depression", reason: "Low mood and loss of interest are both quoted." }],
  addon: [],
};

test("yes on depression returns the decision and the two add-on questions", () => {
  const yes = applyFocusDecision(surfaced, { focusId: "depression", decision: "yes" });
  assert.equal(yes.decision, "yes");
  assert.deepEqual(yes.addon, depressionAddon);
  assert.deepEqual(
    applyFocusDecision(surfaced, { focusId: "depression", decision: "yes" }),
    yes,
  );
});

test("no clears a surfaced depression focus", () => {
  const no = applyFocusDecision(surfaced, { focusId: "depression", decision: "no" });
  assert.equal(no.decision, "no");
  assert.deepEqual(no.focuses, []);
  assert.deepEqual(no.addon, []);
  assert.deepEqual(
    applyFocusDecision(no, { focusId: "depression", decision: "no" }),
    no,
  );
});

test("an unknown focus id or any other decision throws and leaves the input unchanged", () => {
  const input = structuredClone(surfaced);
  const before = structuredClone(input);
  assert.throws(
    () => applyFocusDecision(input, { focusId: "anxiety", decision: "yes" }),
    (err) => err.code === "UNKNOWN_FOCUS",
  );
  assert.throws(
    () => applyFocusDecision(input, { focusId: "depression", decision: "maybe" }),
    (err) => err.code === "BAD_DECISION",
  );
  assert.deepEqual(input, before);
  assert.equal(JSON.stringify(input).includes("diagnosis"), false);
});
