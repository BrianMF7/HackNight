import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { transcript } from "../../src/api/fixtures/syntheticSession.js";
import { buildRequestText, draftFromTranscript } from "../gemini.js";
import { getTemplate } from "../template.js";

const recorded = JSON.parse(readFileSync(new URL("../fixtures/gemini-ramble-response.json", import.meta.url), "utf8"));

function questions() {
  return getTemplate("adult-intake-v1").pages.flatMap((page) =>
    page.sections.flatMap((section) => section.questions.map((question) => ({ id: question.id, label: question.label }))),
  );
}

function noFetch() {
  return async () => {
    throw new Error("Gemini fetch was called");
  };
}

test("recorded quotes in the synthetic transcript become grounded drafts", async () => {
  const drafts = await draftFromTranscript(transcript, questions(), {
    synthetic: true,
    body: recorded,
    fetch: noFetch(),
  });
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].fieldId, "AIQ-001");
  assert.equal(drafts[0].status, "draft");
  assert.match(drafts[0].evidence, /I've been feeling really overwhelmed and anxious, and it's getting hard to function\./);
  const corpus = transcript.map((line) => line.text).join("\n");
  assert.equal(corpus.includes("I've been feeling really overwhelmed and anxious, and it's getting hard to function."), true);
});

test("an invented quote in the recorded response fills nothing", async () => {
  const drafts = await draftFromTranscript(transcript, questions(), {
    synthetic: true,
    body: recorded,
    fetch: noFetch(),
  });
  assert.equal(drafts.some((draft) => String(draft.evidence).includes("chest pain")), false);
  assert.equal(drafts.some((draft) => draft.fieldId === "SUB-001"), false);
});

test("the request text does not instruct a diagnosis code on the form", () => {
  const text = buildRequestText(transcript, questions());
  assert.match(text, /AIQ-001/);
  assert.match(text, /What brings you in today\?/);
  assert.match(text, /overwhelmed and anxious/);
  assert.doesNotMatch(text, /diagnos(?:is|e|tic)\s+code/i);
  assert.doesNotMatch(text, /\bICD(?:-\d+)?\b/);
  assert.doesNotMatch(text, /\bDSM(?:-?\d+)?\b/);
  assert.doesNotMatch(text, /put (?:a |the )?diagnos/i);
});

test("a missing body is fetched and then grounded", async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  let called = false;
  try {
    const drafts = await draftFromTranscript(transcript, questions(), {
      synthetic: true,
      fetch: async (url, init) => {
        called = true;
        assert.equal(init.method, "POST");
        assert.equal(init.headers["x-goog-api-key"], "test-key");
        assert.equal(String(url).includes("test-key"), false);
        assert.match(String(url), /generativelanguage\.googleapis\.com/);
        const sent = JSON.parse(init.body);
        assert.match(sent.contents[0].parts[0].text, /AIQ-001/);
        assert.doesNotMatch(sent.contents[0].parts[0].text, /diagnos(?:is|e|tic)\s+code/i);
        return { ok: true, json: async () => recorded };
      },
    });
    assert.equal(called, true);
    assert.equal(drafts[0].fieldId, "AIQ-001");
    assert.equal(drafts.some((draft) => draft.fieldId === "SUB-001"), false);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test("synthetic false without ALLOW_PHI refuses before any Gemini call", async () => {
  const previous = process.env.ALLOW_PHI;
  delete process.env.ALLOW_PHI;
  let called = false;
  try {
    await assert.rejects(
      () => draftFromTranscript(transcript, questions(), {
        synthetic: false,
        body: recorded,
        fetch: async () => {
          called = true;
          throw new Error("Gemini fetch was called");
        },
      }),
      (err) => err.code === "PHI_REFUSED",
    );
    assert.equal(called, false);
  } finally {
    if (previous === undefined) delete process.env.ALLOW_PHI;
    else process.env.ALLOW_PHI = previous;
  }
});
