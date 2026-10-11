import assert from "node:assert/strict";
import { test } from "node:test";
import { events, transcript } from "../../src/api/fixtures/syntheticSession.js";
import { applyDrafts, ground } from "../ground.js";
import { getTemplate } from "../template.js";

function fieldIds() {
  return new Set(
    getTemplate("adult-intake-v1").pages.flatMap((page) =>
      page.sections.flatMap((section) => section.questions.map((question) => question.id)),
    ),
  );
}

test("fixture events pass ground", () => {
  const ids = fieldIds();
  for (const event of events) {
    assert.deepEqual(ground(event, transcript, ids), event);
  }
  assert.deepEqual(applyDrafts(events, transcript, ids), events);
});

test("an invented quote fills nothing", () => {
  const ids = fieldIds();
  const draft = {
    fieldId: "AIQ-001",
    status: "draft",
    answer: "The patient reported chest pain.",
    evidence: '"The patient reported chest pain that was never spoken."',
  };
  assert.throws(() => ground(draft, transcript, ids), (err) => err.code === "INVENTED_QUOTE");
  assert.deepEqual(applyDrafts([draft], transcript, ids), []);
});

test("an unknown field id throws", () => {
  const draft = {
    fieldId: "NO-SUCH",
    status: "draft",
    answer: "x",
    evidence: '"A glass of wine, maybe twice a week."',
  };
  assert.throws(() => ground(draft, transcript, fieldIds()), (err) => err.code === "UNKNOWN_FIELD");
});

test("silence does not become no", () => {
  const ids = fieldIds();
  const draft = {
    fieldId: "SAF-001",
    status: "draft",
    answer: "no",
    evidence: '"A glass of wine, maybe twice a week."',
  };
  assert.throws(() => ground(draft, transcript, ids), (err) => err.code === "SILENCE");
  assert.deepEqual(applyDrafts([draft], transcript, ids), []);
});

test("a spoken no stays no", () => {
  const ids = fieldIds();
  const lines = [{ t: 4, speaker: "Patient", text: "No." }];
  const draft = { fieldId: "SAF-001", status: "draft", answer: "no", evidence: '"No."' };
  assert.deepEqual(applyDrafts([draft], lines, ids), [draft]);
});

const SAD = "What brings me in today is that I feel sad.";

test("the spoken line fills when evidence has no extra quotes", () => {
  const ids = fieldIds();
  const lines = [{ t: 8, speaker: "Patient", text: SAD }];
  const draft = { fieldId: "AIQ-001", status: "draft", answer: "Feels sad.", evidence: SAD, t: 8 };
  assert.deepEqual(applyDrafts([draft], lines, ids), [draft]);
});

test("a speaker label on the quote still fills when the words were spoken", () => {
  const ids = fieldIds();
  const lines = [{ t: 8, speaker: "Patient", text: SAD }];
  const draft = {
    fieldId: "AIQ-001",
    status: "draft",
    answer: "Feels sad.",
    evidence: `Patient: ${SAD}`,
    t: 8,
  };
  assert.deepEqual(applyDrafts([draft], lines, ids), [draft]);
  const quoted = { ...draft, evidence: `"Patient: ${SAD}"` };
  assert.deepEqual(applyDrafts([quoted], lines, ids), [quoted]);
});

test("an unquoted sentence that was never spoken fills nothing", () => {
  const ids = fieldIds();
  const lines = [{ t: 8, speaker: "Patient", text: SAD }];
  const draft = {
    fieldId: "AIQ-001",
    status: "draft",
    answer: "The patient reported chest pain.",
    evidence: "The patient reported chest pain that was never spoken.",
  };
  assert.deepEqual(applyDrafts([draft], lines, ids), []);
});
