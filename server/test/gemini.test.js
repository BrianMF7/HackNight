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

const LIVE_QUOTE = "I've been feeling really overwhelmed and anxious, and it's getting hard to function.";

function groundedBody(quote) {
  return {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            drafts: [{
              fieldId: "AIQ-001",
              status: "draft",
              answer: "Overwhelmed and anxious",
              evidence: `"${quote}"`,
              t: 6,
            }],
          }),
        }],
      },
    }],
  };
}

async function listen(fetchImpl) {
  const liveServer = createServer({ token: TOKEN, origin: ORIGIN, fetchImpl });
  await new Promise((resolve) => liveServer.listen(0, "127.0.0.1", resolve));
  return {
    base: `http://127.0.0.1:${liveServer.address().port}`,
    close: () => new Promise((resolve, reject) => liveServer.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function createSession(url, live) {
  const res = await fetch(`${url}/api/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ templateId: "adult-intake-v1", therapistEmail: "therapist@example.com", live }),
  });
  assert.equal(res.status, 200);
  return (await res.json()).id;
}

function appendLine(url, id, line) {
  return fetch(`${url}/api/sessions/${id}/transcript-lines`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(line),
  });
}

async function withPhi(allow, fn) {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  if (allow) process.env.ALLOW_PHI = "1";
  else delete process.env.ALLOW_PHI;
  process.env.GEMINI_API_KEY = "test-key";
  try {
    await fn();
  } finally {
    if (previousPhi === undefined) delete process.env.ALLOW_PHI;
    else process.env.ALLOW_PHI = previousPhi;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
}

test("a live append returns a grounded draft from one fetch with thinkingBudget 0", async () => {
  let calls = 0;
  let sent;
  const live = await listen(async (url, init) => {
    calls += 1;
    sent = { url, init };
    return { ok: true, json: async () => groundedBody(LIVE_QUOTE) };
  });
  try {
    await withPhi(true, async () => {
      const id = await createSession(live.base, true);
      const confirmed = await fetch(`${live.base}/api/sessions/${id}/actions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ fieldId: "AIQ-002", action: "confirm", answer: "About three months ago" }),
      });
      assert.equal(confirmed.status, 200);
      const line = { t: 6, speaker: "Patient", text: LIVE_QUOTE };
      const res = await appendLine(live.base, id, line);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.t, line.t);
      assert.equal(body.speaker, line.speaker);
      assert.equal(body.text, line.text);
      assert.equal(body.seq, 1);
      assert.equal(body.drafts.length, 1);
      assert.equal(body.drafts[0].fieldId, "AIQ-001");
      assert.equal(body.drafts[0].evidence.includes(LIVE_QUOTE), true);
      assert.equal(calls, 1);
      assert.match(String(sent.url), /gemini-2\.5-flash:generateContent/);
      const request = JSON.parse(sent.init.body);
      assert.equal(request.generationConfig.thinkingConfig.thinkingBudget, 0);
      const prompt = request.contents[0].parts[0].text;
      assert.equal(prompt.includes(LIVE_QUOTE), true);
      assert.equal(prompt.includes("AIQ-002"), false);
      assert.doesNotMatch(prompt, /diagnos(?:is|e|tic)\s+code/i);
      assert.doesNotMatch(prompt, /\bICD(?:-\d+)?\b/);
      assert.doesNotMatch(prompt, /\bDSM(?:-?\d+)?\b/);
    });
  } finally {
    await live.close();
  }
});

test("a second live append waits, then one follow-up draft sees both lines", async () => {
  let calls = 0;
  let release;
  const hold = new Promise((resolve) => { release = resolve; });
  let started;
  const gate = new Promise((resolve) => { started = resolve; });
  const prompts = [];
  const line1 = { t: 6, speaker: "Patient", text: LIVE_QUOTE };
  const line2 = { t: 12, speaker: "Patient", text: "It started about three months ago." };
  const live = await listen(async (_url, init) => {
    calls += 1;
    const prompt = JSON.parse(init.body).contents[0].parts[0].text;
    prompts.push(prompt);
    if (calls === 1) {
      started();
      await hold;
    }
    return { ok: true, json: async () => groundedBody(LIVE_QUOTE) };
  });
  try {
    await withPhi(true, async () => {
      const id = await createSession(live.base, true);
      const first = appendLine(live.base, id, line1);
      await Promise.race([
        gate,
        new Promise((_, reject) => setTimeout(() => reject(new Error("first fetch did not start")), 1000)),
      ]);
      const second = appendLine(live.base, id, line2);
      const deadline = Date.now() + 1000;
      let stored = 0;
      while (Date.now() < deadline) {
        const transcriptRes = await fetch(`${live.base}/api/sessions/${id}/transcript`, { headers: authHeaders() });
        stored = (await transcriptRes.json()).length;
        if (stored === 2) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(stored, 2);
      assert.equal(calls, 1);
      release();
      const firstBody = await (await first).json();
      const secondBody = await (await second).json();
      assert.equal(calls, 2);
      assert.equal(firstBody.seq, 1);
      assert.equal(secondBody.seq, 2);
      assert.equal(prompts[0].includes(line2.text), false);
      assert.equal(prompts[1].includes(line1.text), true);
      assert.equal(prompts[1].includes(line2.text), true);
    });
  } finally {
    release();
    await live.close();
  }
});

test("a refused or failed live draft stores the line and does not retry, and non-live drafts stay recorded", async () => {
  let calls = 0;
  const live = await listen(async () => {
    calls += 1;
    return { ok: false, status: 500, json: async () => ({}) };
  });
  try {
    await withPhi(false, async () => {
      const id = await createSession(live.base, true);
      const line = { t: 6, speaker: "Patient", text: LIVE_QUOTE };
      const res = await appendLine(live.base, id, line);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.seq, 1);
      assert.deepEqual(body.drafts, []);
      assert.equal(body.code, "PHI_REFUSED");
      assert.equal(body.text, line.text);
      assert.equal(calls, 0);
      const stored = await fetch(`${live.base}/api/sessions/${id}/transcript`, { headers: authHeaders() });
      assert.deepEqual(await stored.json(), [line]);
    });

    await withPhi(true, async () => {
      const id = await createSession(live.base, true);
      const line = { t: 8, speaker: "Patient", text: "Sleep has been rough." };
      const res = await appendLine(live.base, id, line);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.seq, 1);
      assert.deepEqual(body.drafts, []);
      assert.equal(body.code, "GEMINI_HTTP");
      assert.equal(calls, 1);
      const stored = await fetch(`${live.base}/api/sessions/${id}/transcript`, { headers: authHeaders() });
      assert.deepEqual(await stored.json(), [line]);
    });

    const recordedId = await createSession(live.base, false);
    const drafts = await fetch(`${live.base}/api/sessions/${recordedId}/drafts`, {
      method: "POST",
      headers: authHeaders(),
      body: "{}",
    });
    assert.equal(drafts.status, 200);
    const events = await drafts.json();
    assert.equal(events.length, 1);
    assert.equal(events[0].fieldId, "AIQ-001");
    assert.equal(calls, 1);
  } finally {
    await live.close();
  }
});

const LINE_TWO = "It started about three months ago.";
const POSTED_DRAFT = "Earlier note about feeling overwhelmed";

function postDrafts(url, id, body) {
  return fetch(`${url}/api/sessions/${id}/drafts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

function mixedFinalBody() {
  return {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            drafts: [
              {
                fieldId: "AIQ-001",
                status: "draft",
                answer: "Overwhelmed and anxious",
                evidence: `"${LIVE_QUOTE}"`,
                t: 6,
              },
              {
                fieldId: "SUB-001",
                status: "draft",
                answer: "Daily chest pain and no sleep.",
                evidence: "\"I have chest pain and I never sleep.\"",
                t: 1,
              },
              {
                fieldId: "AIQ-002",
                status: "draft",
                answer: "About three months ago",
                evidence: `"${LIVE_QUOTE}"`,
                t: 12,
              },
            ],
          }),
        }],
      },
    }],
  };
}

async function storeTwoLines(url, id) {
  const line1 = { t: 6, speaker: "Patient", text: LIVE_QUOTE };
  const line2 = { t: 12, speaker: "Patient", text: LINE_TWO };
  assert.equal((await appendLine(url, id, line1)).status, 200);
  assert.equal((await appendLine(url, id, line2)).status, 200);
  return [line1, line2];
}

test("a final pass grounds the injected body with thinkingBudget 1024 and both lines", async () => {
  const sent = [];
  const live = await listen(async (url, init) => {
    sent.push({ url, init });
    return { ok: true, json: async () => groundedBody(LIVE_QUOTE) };
  });
  try {
    const id = await createSession(live.base, true);
    const confirmed = await fetch(`${live.base}/api/sessions/${id}/actions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ fieldId: "AIQ-002", action: "confirm", answer: "About three months ago" }),
    });
    assert.equal(confirmed.status, 200);
    await withPhi(false, async () => {
      await storeTwoLines(live.base, id);
    });
    assert.equal(sent.length, 0);
    await withPhi(true, async () => {
      const res = await postDrafts(live.base, id, {
        pass: "final",
        drafts: [
          { fieldId: "AIQ-001", status: "draft", answer: POSTED_DRAFT, evidence: `"${LIVE_QUOTE}"` },
          { fieldId: "AIQ-002", status: "draft", answer: "confirmed leak", evidence: "\"nope\"" },
        ],
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.drafts.length, 1);
      assert.equal(body.drafts[0].fieldId, "AIQ-001");
      assert.equal(body.drafts[0].evidence.includes(LIVE_QUOTE), true);
      assert.equal(sent.length, 1);
      assert.match(String(sent[0].url), /gemini-2\.5-flash:generateContent/);
      const request = JSON.parse(sent[0].init.body);
      assert.equal(request.tools, undefined);
      assert.equal(request.generationConfig.thinkingConfig.thinkingBudget, 1024);
      const prompt = request.contents[0].parts[0].text;
      assert.equal(prompt.includes(LIVE_QUOTE), true);
      assert.equal(prompt.includes(LINE_TWO), true);
      assert.equal(prompt.includes(POSTED_DRAFT), true);
      assert.equal(prompt.includes("replace a draft"), true);
      assert.equal(prompt.includes("nothing should change"), true);
      assert.equal(prompt.includes("context only"), true);
      assert.equal(prompt.includes("AIQ-002"), false);
      assert.equal(prompt.includes("confirmed leak"), false);
      assert.doesNotMatch(prompt, /diagnos(?:is|e|tic)\s+code/i);
      assert.doesNotMatch(prompt, /\bICD(?:-\d+)?\b/);
      assert.doesNotMatch(prompt, /\bDSM(?:-?\d+)?\b/);

      const extra = await appendLine(live.base, id, { t: 20, speaker: "Patient", text: "Sleep has been rough." });
      assert.equal(extra.status, 200);
      assert.equal(sent.length, 2);
      const commit = JSON.parse(sent[1].init.body);
      assert.equal(commit.generationConfig.thinkingConfig.thinkingBudget, 0);
    });
  } finally {
    await live.close();
  }
});

test("a final pass drops an invented quote and a confirmed field id", async () => {
  const live = await listen(async () => ({ ok: true, json: async () => mixedFinalBody() }));
  try {
    const id = await createSession(live.base, true);
    const confirmed = await fetch(`${live.base}/api/sessions/${id}/actions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ fieldId: "AIQ-002", action: "confirm", answer: "About three months ago" }),
    });
    assert.equal(confirmed.status, 200);
    await withPhi(false, async () => {
      await storeTwoLines(live.base, id);
    });
    await withPhi(true, async () => {
      const res = await postDrafts(live.base, id, { pass: "final", drafts: [] });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.drafts.length, 1);
      assert.equal(body.drafts[0].fieldId, "AIQ-001");
      assert.equal(body.drafts.some((draft) => String(draft.evidence).includes("chest pain")), false);
      assert.equal(body.drafts.some((draft) => draft.fieldId === "SUB-001"), false);
      assert.equal(body.drafts.some((draft) => draft.fieldId === "AIQ-002"), false);
    });
  } finally {
    await live.close();
  }
});

test("an empty final pass does not fetch, and a non-live drafts post stays recorded", async () => {
  let calls = 0;
  const live = await listen(async () => {
    calls += 1;
    throw new Error("Gemini fetch was called");
  });
  try {
    await withPhi(true, async () => {
      const id = await createSession(live.base, true);
      const res = await postDrafts(live.base, id, {
        pass: "final",
        drafts: [{ fieldId: "AIQ-001", answer: POSTED_DRAFT }],
      });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { drafts: [] });
      assert.equal(calls, 0);
    });

    const recordedId = await createSession(live.base, false);
    const drafts = await postDrafts(live.base, recordedId, {});
    assert.equal(drafts.status, 200);
    const events = await drafts.json();
    assert.equal(events.length, 1);
    assert.equal(events[0].fieldId, "AIQ-001");
    assert.equal(calls, 0);
  } finally {
    await live.close();
  }
});

test("a refused or failed final pass returns empty drafts and does not retry", async () => {
  let calls = 0;
  const live = await listen(async () => {
    calls += 1;
    return { ok: false, status: 500, json: async () => ({}) };
  });
  try {
    const id = await createSession(live.base, true);
    await withPhi(false, async () => {
      await storeTwoLines(live.base, id);
    });
    assert.equal(calls, 0);
    await withPhi(false, async () => {
      const res = await postDrafts(live.base, id, { pass: "final", drafts: [] });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body.drafts, []);
      assert.equal(body.code, "PHI_REFUSED");
      assert.equal(calls, 0);
    });
    await withPhi(true, async () => {
      const res = await postDrafts(live.base, id, { pass: "final", drafts: [] });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body.drafts, []);
      assert.equal(body.code, "GEMINI_HTTP");
      assert.equal(calls, 1);
    });
  } finally {
    await live.close();
  }
});
