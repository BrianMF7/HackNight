import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { workspaceEndpoints } from "../../src/api/liveWorkspace.js";
import { createServer } from "../index.js";
import { findSession } from "../session.js";

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

function post(path, body) {
  return fetch(`${base}${path}`, { method: "POST", headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
}

async function createSession() {
  const res = await post("/api/sessions", { templateId: "adult-intake-v1", therapistEmail: "therapist@example.com" });
  assert.equal(res.status, 200);
  return (await res.json()).id;
}

test("live adapter wires retainDraft and discardDraft", () => {
  assert.deepEqual(workspaceEndpoints.retainDraft, { method: "POST", path: "/api/sessions/:sessionId/retain" });
  assert.deepEqual(workspaceEndpoints.discardDraft, { method: "POST", path: "/api/sessions/:sessionId/discard" });
});

test("keep retains an unsent draft without touching answers", async () => {
  const id = await createSession();
  await post(`/api/sessions/${id}/actions`, { fieldId: "AIQ-001", action: "confirm", answer: "Work stress" });

  const res = await post(`/api/sessions/${id}/retain`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, status: "draft_retained", sent: false });

  const record = findSession(id);
  assert.equal(record.status, "draft_retained");
  assert.notEqual(record.sent, true);
  assert.equal(record.answers["AIQ-001"].status, "confirmed");

  const later = await post(`/api/sessions/${id}/actions`, { fieldId: "AIQ-002", action: "confirm", answer: "Three months ago" });
  assert.equal(later.status, 200);
});

test("keep and discard after 45:00 still mark nothing sent", async () => {
  const id = await createSession();
  const record = findSession(id);
  record.startedAt = Date.now() - 46 * 60 * 1000;

  const kept = await post(`/api/sessions/${id}/retain`);
  assert.equal(kept.status, 200);
  assert.equal((await kept.json()).sent, false);
  assert.notEqual(record.sent, true);

  const discarded = await post(`/api/sessions/${id}/discard`);
  assert.equal(discarded.status, 200);
  assert.notEqual(record.sent, true);
});

test("keep never clears a sent flag, so it cannot reopen a duplicate send", async () => {
  const id = await createSession();
  const record = findSession(id);
  record.sent = true;
  const res = await post(`/api/sessions/${id}/retain`);
  assert.equal(res.status, 200);
  assert.equal(record.sent, true);
});

test("discard deletes the session so every later call is 404", async () => {
  const id = await createSession();
  const res = await post(`/api/sessions/${id}/discard`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(findSession(id), undefined);

  const later = [
    await fetch(`${base}/api/sessions/${id}/transcript`, { headers: authHeaders() }),
    await fetch(`${base}/api/sessions/${id}/events`, { headers: authHeaders() }),
    await post(`/api/sessions/${id}/actions`, { fieldId: "AIQ-001", action: "confirm", answer: "x" }),
    await post(`/api/sessions/${id}/retain`),
    await post(`/api/sessions/${id}/discard`),
  ];
  for (const r of later) {
    assert.equal(r.status, 404);
    assert.equal((await r.json()).code, "NOT_FOUND");
  }
});

test("an unknown or malformed session id is 404 for keep and discard", async () => {
  for (const sessionId of ["missing", "%E0%A4%A"]) {
    for (const choice of ["retain", "discard"]) {
      const res = await post(`/api/sessions/${sessionId}/${choice}`);
      assert.equal(res.status, 404);
      assert.equal((await res.json()).code, "NOT_FOUND");
    }
  }
});
