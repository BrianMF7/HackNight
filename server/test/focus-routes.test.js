import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createServer } from "../index.js";
import { findSession } from "../session.js";
import { depressionAddon } from "../focus/addon.js";
import { handoffReasons } from "../handoff.js";

const TOKEN = "test-token";
const ORIGIN = "http://localhost:5173";
const positive = JSON.parse(readFileSync(new URL("../fixtures/focus-positive.json", import.meta.url), "utf8"));

function restore(name, previous) {
  if (previous === undefined) delete process.env[name];
  else process.env[name] = previous;
}

async function listen(fetchImpl) {
  const calls = [];
  const server = createServer({
    token: TOKEN,
    origin: ORIGIN,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (fetchImpl) return fetchImpl(url, init);
      return { ok: true, json: async () => positive.body };
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Origin: ORIGIN,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  return {
    calls,
    base,
    headers,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function liveSession(base, headers, lines) {
  const created = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ templateId: "adult-intake-v1", therapistEmail: "therapist@example.com", live: true }),
  });
  const session = await created.json();
  findSession(session.id).transcript = lines.map((line) => ({ ...line }));
  return session.id;
}

test("POST focus on the positive fixture returns one depression focus and no quotes", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.ALLOW_PHI = "1";
  process.env.GEMINI_API_KEY = "test-key";
  const live = await listen();
  try {
    const id = await liveSession(live.base, live.headers, positive.lines);
    const res = await fetch(`${live.base}/api/sessions/${id}/focus`, { method: "POST", headers: live.headers, body: "{}" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.focuses.length, 1);
    assert.equal(body.focuses[0].id, "depression");
    assert.equal(typeof body.focuses[0].reason, "string");
    assert.equal(body.focuses[0].reason.length > 0, true);
    assert.deepEqual(body.addon, []);
    assert.equal(Object.hasOwn(body, "quotes"), false);
    assert.equal(live.calls.length, 1);
  } finally {
    await live.close();
    restore("ALLOW_PHI", previousPhi);
    restore("GEMINI_API_KEY", previousKey);
  }
});

test("a second POST focus before four further lines skips and does not fetch", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.ALLOW_PHI = "1";
  process.env.GEMINI_API_KEY = "test-key";
  const live = await listen();
  try {
    const id = await liveSession(live.base, live.headers, positive.lines);
    await fetch(`${live.base}/api/sessions/${id}/focus`, { method: "POST", headers: live.headers, body: "{}" });
    const res = await fetch(`${live.base}/api/sessions/${id}/focus`, { method: "POST", headers: live.headers, body: "{}" });
    const body = await res.json();
    assert.equal(body.skipped, true);
    assert.equal(live.calls.length, 1);
  } finally {
    await live.close();
    restore("ALLOW_PHI", previousPhi);
    restore("GEMINI_API_KEY", previousKey);
  }
});

test("two overlapping POST focus calls share one fetch", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.ALLOW_PHI = "1";
  process.env.GEMINI_API_KEY = "test-key";
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let started;
  const startedGate = new Promise((resolve) => { started = resolve; });
  const calls = [];
  const live = await listen(async () => {
    calls.push(1);
    started();
    await gate;
    return { ok: true, json: async () => positive.body };
  });
  try {
    const id = await liveSession(live.base, live.headers, positive.lines);
    const first = fetch(`${live.base}/api/sessions/${id}/focus`, { method: "POST", headers: live.headers, body: "{}" });
    await startedGate;
    const second = fetch(`${live.base}/api/sessions/${id}/focus`, { method: "POST", headers: live.headers, body: "{}" });
    release();
    const bodies = await Promise.all([first, second].map(async (pending) => (await pending).json()));
    assert.equal(calls.length, 1);
    assert.equal(bodies[0].focuses[0].id, "depression");
    assert.equal(bodies[1].focuses[0].id, "depression");
  } finally {
    await live.close();
    restore("ALLOW_PHI", previousPhi);
    restore("GEMINI_API_KEY", previousKey);
  }
});

test("decision no hides the focus and yes returns the add-on, neither fetches", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.ALLOW_PHI = "1";
  process.env.GEMINI_API_KEY = "test-key";
  const live = await listen();
  try {
    const id = await liveSession(live.base, live.headers, positive.lines);
    await fetch(`${live.base}/api/sessions/${id}/focus`, { method: "POST", headers: live.headers, body: "{}" });
    const quotes = await fetch(`${live.base}/api/sessions/${id}/focus/quotes`, { headers: live.headers });
    const quoted = await quotes.json();
    assert.equal(quoted.quotes.length > 0, true);
    assert.equal(quoted.quotes.every((item) => item.criterionId && item.quote && Number.isFinite(item.t)), true);

    const beforeNo = live.calls.length;
    const no = await fetch(`${live.base}/api/sessions/${id}/focus/decision`, {
      method: "POST",
      headers: live.headers,
      body: JSON.stringify({ focusId: "depression", decision: "no" }),
    });
    const hidden = await no.json();
    assert.equal(live.calls.length, beforeNo);
    assert.equal(hidden.decision, "no");
    assert.deepEqual(hidden.focuses, []);
    assert.deepEqual((await (await fetch(`${live.base}/api/sessions/${id}/focus/quotes`, { headers: live.headers })).json()).quotes, []);

    const yesId = await liveSession(live.base, live.headers, positive.lines);
    await fetch(`${live.base}/api/sessions/${yesId}/focus`, { method: "POST", headers: live.headers, body: "{}" });
    const beforeYes = live.calls.length;
    const yes = await fetch(`${live.base}/api/sessions/${yesId}/focus/decision`, {
      method: "POST",
      headers: live.headers,
      body: JSON.stringify({ focusId: "depression", decision: "yes" }),
    });
    const opened = await yes.json();
    assert.deepEqual(opened.addon.map((question) => question.id), ["DEP-001", "DEP-002"]);
    assert.deepEqual(opened.addon, depressionAddon);
    assert.equal(live.calls.length, beforeYes);
  } finally {
    await live.close();
    restore("ALLOW_PHI", previousPhi);
    restore("GEMINI_API_KEY", previousKey);
  }
});

test("unknown session is 404, a bad decision is 400, and a missing bearer is 401", async () => {
  const live = await listen();
  try {
    const missing = await fetch(`${live.base}/api/sessions/no-such/focus`, { method: "POST", headers: live.headers, body: "{}" });
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).code, "NOT_FOUND");

    const id = await liveSession(live.base, live.headers, positive.lines);
    const bad = await fetch(`${live.base}/api/sessions/${id}/focus/decision`, {
      method: "POST",
      headers: live.headers,
      body: JSON.stringify({ focusId: "depression", decision: "maybe" }),
    });
    assert.equal(bad.status, 400);

    const open = await fetch(`${live.base}/api/sessions/${id}/focus`, { method: "POST" });
    assert.equal(open.status, 401);
  } finally {
    await live.close();
  }
});

test("ALLOW_PHI unset refuses focus before fetch and leaves the session in place", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.ALLOW_PHI;
  process.env.GEMINI_API_KEY = "test-key";
  const live = await listen();
  try {
    const id = await liveSession(live.base, live.headers, positive.lines);
    const res = await fetch(`${live.base}/api/sessions/${id}/focus`, { method: "POST", headers: live.headers, body: "{}" });
    const body = await res.json();
    assert.deepEqual(body.focuses, []);
    assert.equal(body.code, "PHI_REFUSED");
    assert.equal(live.calls.length, 0);
    const stored = await fetch(`${live.base}/api/sessions/${id}/transcript`, { headers: live.headers });
    assert.equal(stored.status, 200);
    assert.deepEqual(await stored.json(), positive.lines);
  } finally {
    await live.close();
    restore("ALLOW_PHI", previousPhi);
    restore("GEMINI_API_KEY", previousKey);
  }
});

test("a failed focus fetch returns GEMINI_HTTP once and keeps the stored lines", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.ALLOW_PHI = "1";
  process.env.GEMINI_API_KEY = "test-key";
  const failing = await listen(async () => ({ ok: false, json: async () => ({}) }));
  try {
    const id = await liveSession(failing.base, failing.headers, positive.lines);
    const res = await fetch(`${failing.base}/api/sessions/${id}/focus`, { method: "POST", headers: failing.headers, body: "{}" });
    const body = await res.json();
    assert.deepEqual(body.focuses, []);
    assert.equal(body.code, "GEMINI_HTTP");
    assert.equal(failing.calls.length, 1);
    const stored = await fetch(`${failing.base}/api/sessions/${id}/transcript`, { headers: failing.headers });
    assert.deepEqual(await stored.json(), positive.lines);
  } finally {
    await failing.close();
    restore("ALLOW_PHI", previousPhi);
    restore("GEMINI_API_KEY", previousKey);
  }
});

test("an empty live transcript returns no focus and does not fetch", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.ALLOW_PHI = "1";
  process.env.GEMINI_API_KEY = "test-key";
  const live = await listen();
  try {
    const id = await liveSession(live.base, live.headers, []);
    const res = await fetch(`${live.base}/api/sessions/${id}/focus`, { method: "POST", headers: live.headers, body: "{}" });
    assert.deepEqual((await res.json()).focuses, []);
    assert.equal(live.calls.length, 0);
  } finally {
    await live.close();
    restore("ALLOW_PHI", previousPhi);
    restore("GEMINI_API_KEY", previousKey);
  }
});

test("yes does not add handoff requirements and the PDF module stays free of the add-on", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.ALLOW_PHI = "1";
  process.env.GEMINI_API_KEY = "test-key";
  const live = await listen();
  try {
    const id = await liveSession(live.base, live.headers, positive.lines);
    const record = findSession(id);
    await fetch(`${live.base}/api/sessions/${id}/focus`, { method: "POST", headers: live.headers, body: "{}" });
    await fetch(`${live.base}/api/sessions/${id}/focus/decision`, {
      method: "POST",
      headers: live.headers,
      body: JSON.stringify({ focusId: "depression", decision: "yes" }),
    });
    const reasons = handoffReasons(record, Date.now());
    const codes = reasons.map((reason) => reason.code);
    assert.deepEqual(codes, ["SEND_GATE_NOT_MET", "REQUIRED_UNCONFIRMED", "SAFETY_UNRESOLVED"]);
    assert.equal(JSON.stringify(reasons).includes("DEP-"), false);
    const pdf = readFileSync(new URL("../pdf.js", import.meta.url), "utf8");
    assert.equal(pdf.includes("No diagnosis code has been assigned by this document."), true);
    assert.equal(pdf.includes("DEP-001"), false);
    assert.equal(pdf.includes("DEP-002"), false);
  } finally {
    await live.close();
    restore("ALLOW_PHI", previousPhi);
    restore("GEMINI_API_KEY", previousKey);
  }
});

test("a committed line returns form drafts and does not call the focus agent", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.ALLOW_PHI = "1";
  process.env.GEMINI_API_KEY = "test-key";
  const quote = "I've been feeling really overwhelmed and anxious, and it's getting hard to function.";
  const formBody = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            drafts: [{ fieldId: "AIQ-001", status: "draft", answer: "Overwhelmed and anxious", evidence: `"${quote}"`, t: 6 }],
          }),
        }],
      },
    }],
  };
  const prompts = [];
  const live = await listen(async (_url, init) => {
    prompts.push(JSON.parse(init.body).contents[0].parts[0].text);
    return { ok: true, json: async () => formBody };
  });
  try {
    const id = await liveSession(live.base, live.headers, []);
    const line = await fetch(`${live.base}/api/sessions/${id}/transcript-lines`, {
      method: "POST",
      headers: live.headers,
      body: JSON.stringify({ t: 6, speaker: "Patient", text: quote }),
    });
    const drafted = await line.json();
    assert.equal(drafted.drafts.length, 1);
    assert.equal(drafted.drafts[0].fieldId, "AIQ-001");
    assert.equal(drafted.drafts[0].evidence.includes(quote), true);
    assert.equal(prompts.some((text) => text.includes("Find quoted evidence")), false);
    assert.equal(prompts.some((text) => text.includes("criterionId")), false);
    const sessionSource = readFileSync(new URL("../session.js", import.meta.url), "utf8");
    const geminiSource = readFileSync(new URL("../gemini.js", import.meta.url), "utf8");
    assert.equal(sessionSource.includes("suggestBindings"), false);
    assert.equal(sessionSource.includes("focus/agent"), false);
    assert.equal(geminiSource.includes("suggestBindings"), false);
    assert.equal(geminiSource.includes("focus/agent"), false);
  } finally {
    await live.close();
    restore("ALLOW_PHI", previousPhi);
    restore("GEMINI_API_KEY", previousKey);
  }
});
