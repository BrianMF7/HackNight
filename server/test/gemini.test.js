import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { transcript } from "../../src/api/fixtures/syntheticSession.js";
import { workspaceEndpoints } from "../../src/api/liveWorkspace.js";
import { buildRequestText, draftFromTranscript } from "../gemini.js";
import { createServer } from "../index.js";
import { getTemplate } from "../template.js";

const TOKEN = "test-token";
const ORIGIN = "http://localhost:5173";

let server;
let base;

before(async () => {
  server = createServer({ token: TOKEN, origin: ORIGIN });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

function authHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Origin: ORIGIN,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

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

test("live adapter exposes the drafts route", () => {
  assert.deepEqual(workspaceEndpoints.drafts, { method: "POST", path: "/api/sessions/:sessionId/drafts" });
});

test("POST drafts returns grounded events whose quotes are in the session transcript", async () => {
  const created = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ templateId: "adult-intake-v1", therapistEmail: "therapist@example.com" }),
  });
  assert.equal(created.status, 200);
  const { id } = await created.json();

  const res = await fetch(`${base}/api/sessions/${id}/drafts`, {
    method: "POST",
    headers: authHeaders(),
    body: "{}",
  });
  assert.equal(res.status, 200);
  const drafts = await res.json();
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].fieldId, "AIQ-001");
  const corpus = transcript.map((line) => line.text).join("\n");
  const quotes = [...String(drafts[0].evidence).matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  assert.equal(quotes.length > 0, true);
  for (const quote of quotes) {
    for (const part of quote.split("...").map((part) => part.trim()).filter(Boolean)) {
      assert.equal(corpus.includes(part), true);
    }
  }
  assert.equal(drafts.some((draft) => String(draft.evidence).includes("chest pain")), false);
});

test("an unknown session drafts route is 404", async () => {
  const res = await fetch(`${base}/api/sessions/missing/drafts`, {
    method: "POST",
    headers: authHeaders(),
    body: "{}",
  });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, "NOT_FOUND");
});
