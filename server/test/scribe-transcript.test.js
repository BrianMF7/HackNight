import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ground } from "../ground.js";
import { normalizeScribeTranscript } from "../scribeTranscript.js";
import { getTemplate } from "../template.js";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/scribe-full-transcript.json", import.meta.url), "utf8"),
);

function fieldIds() {
  return new Set(
    getTemplate("adult-intake-v1").pages.flatMap((page) =>
      page.sections.flatMap((section) => section.questions.map((question) => question.id)),
    ),
  );
}

test("a fixture Scribe transcript becomes ordered lines", () => {
  assert.deepEqual(normalizeScribeTranscript(fixture), [
    { t: 0, speaker: "speaker_0", text: "Do you drink alcohol?" },
    { t: 6, speaker: "speaker_1", text: "A glass of wine, maybe twice a week." },
  ]);
});

test("words without a speaker id use the live mic label", () => {
  const lines = normalizeScribeTranscript({
    words: [
      { text: "Hello", start: 1, type: "word" },
      { text: "there", start: 1.4, type: "word" },
    ],
  });
  assert.deepEqual(lines, [{ t: 1, speaker: "Clinician", text: "Hello there" }]);
});

test("an empty Scribe payload becomes no lines", () => {
  assert.deepEqual(normalizeScribeTranscript({}), []);
  assert.deepEqual(normalizeScribeTranscript({ text: "", words: [] }), []);
  assert.deepEqual(normalizeScribeTranscript(null), []);
});

test("quotes from those lines pass through ground", () => {
  const lines = normalizeScribeTranscript(fixture);
  const draft = {
    fieldId: "SUB-001",
    status: "draft",
    answer: "A glass of wine, maybe twice a week.",
    evidence: '"A glass of wine, maybe twice a week."',
  };
  assert.deepEqual(ground(draft, lines, fieldIds()), draft);
});
