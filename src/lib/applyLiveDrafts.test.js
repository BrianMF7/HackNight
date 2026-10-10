import assert from "node:assert/strict";
import { test } from "node:test";
import { applyLiveDrafts } from "../components/workspace/applyLiveDrafts.js";

const overwhelmed = {
  fieldId: "AIQ-001",
  status: "draft",
  answer: "Feeling overwhelmed",
  evidence: "\"I've been feeling really overwhelmed\"",
  t: 6,
};

test("a live append response with a draft sets that field's answer without a playhead", () => {
  const applied = applyLiveDrafts({}, { seq: 1, drafts: [overwhelmed] }, 0);

  assert.equal(applied.lastSeq, 1);
  assert.equal(applied.answers["AIQ-001"].answer, "Feeling overwhelmed");
  assert.equal(applied.answers["AIQ-001"].status, "draft");
  assert.equal(applied.events, undefined);
});

test("a response with a lower seq does not overwrite a newer draft", () => {
  const current = { "AIQ-001": { fieldId: "AIQ-001", status: "draft", answer: "six months" } };
  const newer = applyLiveDrafts(current, { seq: 2, drafts: [] }, 0);
  const stale = applyLiveDrafts(newer.answers, { seq: 1, drafts: [overwhelmed] }, newer.lastSeq);

  assert.equal(stale.answers["AIQ-001"].answer, "six months");
  assert.equal(stale.lastSeq, 2);
});

test("a confirmed field stays confirmed when a later draft names it", () => {
  const answers = {
    "AIQ-001": { status: "not_answered" },
    "AIQ-002": { status: "confirmed", answer: "About three months ago" },
  };
  const applied = applyLiveDrafts(answers, {
    seq: 3,
    drafts: [
      overwhelmed,
      { fieldId: "AIQ-002", status: "draft", answer: "six months", evidence: "\"six months\"", t: 18 },
    ],
  }, 2);

  assert.equal(applied.answers["AIQ-002"].status, "confirmed");
  assert.equal(applied.answers["AIQ-002"].answer, "About three months ago");
  assert.equal(applied.answers["AIQ-001"].answer, "Feeling overwhelmed");
  assert.equal(applied.lastSeq, 3);
});

test("a demo append response leaves answers and the applied seq unchanged", () => {
  const answers = { "AIQ-001": { status: "draft", answer: "existing" } };
  const applied = applyLiveDrafts(answers, { ok: true, demo: true }, 0);

  assert.equal(applied.answers, answers);
  assert.equal(applied.lastSeq, 0);
});
