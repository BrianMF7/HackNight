import assert from "node:assert/strict";
import { test } from "node:test";
import { applyFinalPass, applyLiveDrafts, planFinalPass } from "../components/workspace/applyLiveDrafts.js";

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

const sleepDraft = {
  fieldId: "AIQ-003",
  status: "draft",
  answer: "Sleep has been rough",
  evidence: "\"Sleep has been rough\"",
  t: 20,
};

test("a final pass replaces a non-confirmed draft and fills a field that was empty", () => {
  const answers = {
    "AIQ-001": { fieldId: "AIQ-001", status: "draft", answer: "Feeling overwhelmed" },
    "AIQ-004": { fieldId: "AIQ-004", status: "draft", answer: "keep this omission" },
  };
  const applied = applyFinalPass(answers, { drafts: [overwhelmed, sleepDraft] });

  assert.equal(applied["AIQ-001"].answer, "Feeling overwhelmed");
  assert.equal(applied["AIQ-003"].answer, "Sleep has been rough");
  assert.equal(applied["AIQ-004"].answer, "keep this omission");
});

test("a final pass leaves an omitted field and a confirmed field as they were", () => {
  const answers = {
    "AIQ-001": { fieldId: "AIQ-001", status: "draft", answer: "Feeling overwhelmed" },
    "AIQ-002": { fieldId: "AIQ-002", status: "confirmed", answer: "About three months ago" },
  };
  const applied = applyFinalPass(answers, {
    drafts: [{ fieldId: "AIQ-002", status: "draft", answer: "six months", evidence: "\"six months\"", t: 18 }],
  });

  assert.equal(applied["AIQ-001"], answers["AIQ-001"]);
  assert.equal(applied["AIQ-002"].status, "confirmed");
  assert.equal(applied["AIQ-002"].answer, "About three months ago");
});

test("a refusal or failed final pass leaves the form as it was", () => {
  const answers = { "AIQ-001": { status: "draft", answer: "Feeling overwhelmed" } };

  assert.equal(applyFinalPass(answers, { drafts: [], code: "PHI_REFUSED" }), answers);
  assert.equal(applyFinalPass(answers, { drafts: [], code: "GEMINI_HTTP" }), answers);
});

test("review requests one final pass in live mode and skips demo or an unchanged transcript", () => {
  const answers = {
    "AIQ-001": { status: "draft", answer: "Feeling overwhelmed" },
    "AIQ-002": { status: "confirmed", answer: "About three months ago" },
  };
  const first = planFinalPass({ mode: "live", lineCount: 2, lastAppliedLineCount: null, answers });
  const again = planFinalPass({ mode: "live", lineCount: 2, lastAppliedLineCount: 2, answers });
  const demo = planFinalPass({ mode: "mock", lineCount: 2, lastAppliedLineCount: null, answers });

  assert.equal(first.call, true);
  assert.equal(first.body.pass, "final");
  assert.deepEqual(first.body.drafts, [{ fieldId: "AIQ-001", status: "draft", answer: "Feeling overwhelmed" }]);
  assert.equal(again.call, false);
  assert.equal(demo.call, false);
});
