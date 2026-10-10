import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { workspaceEndpoints } from "../../src/api/liveWorkspace.js";
import { createServer } from "../index.js";
import { getSession } from "../session.js";

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

async function createSession() {
  const res = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ templateId: "adult-intake-v1", therapistEmail: "therapist@example.com" }),
  });
  assert.equal(res.status, 200);
  return (await res.json()).id;
}

function act(sessionId, body) {
  return fetch(`${base}/api/sessions/${sessionId}/actions`, {
    method: "POST",
    headers: authHeaders(),
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("live adapter wires recordClinicianAction", () => {
  assert.deepEqual(workspaceEndpoints.recordClinicianAction, { method: "POST", path: "/api/sessions/:sessionId/actions" });
});

test("confirm and edit_confirm persist as confirmed on the server session", async () => {
  const id = await createSession();
  const confirmed = await act(id, { sessionId: id, fieldId: "AIQ-001", action: "confirm", answer: "Work stress" });
  assert.equal(confirmed.status, 200);
  assert.deepEqual(await confirmed.json(), { ok: true });
  const edited = await act(id, { sessionId: id, fieldId: "AIQ-002", action: "edit_confirm", answer: "About three months ago" });
  assert.equal(edited.status, 200);

  const { answers } = getSession(id);
  assert.equal(answers["AIQ-001"].status, "confirmed");
  assert.equal(answers["AIQ-001"].answer, "Work stress");
  assert.equal(answers["AIQ-001"].action, "confirm");
  assert.equal(Number.isFinite(answers["AIQ-001"].at), true);
  assert.equal(answers["AIQ-002"].status, "confirmed");
  assert.equal(answers["AIQ-002"].answer, "About three months ago");
  assert.equal(answers["AIQ-002"].action, "edit_confirm");
});

test("an edit after confirm clears the confirmation", async () => {
  const id = await createSession();
  await act(id, { fieldId: "AIQ-001", action: "confirm", answer: "Work stress" });
  const res = await act(id, { fieldId: "AIQ-001", action: "edit", answer: "Work and family stress" });
  assert.equal(res.status, 200);

  const stored = getSession(id).answers["AIQ-001"];
  assert.equal(stored.status, "draft");
  assert.equal(stored.answer, "Work and family stress");
  assert.equal(stored.action, "edit");
});

test("a safety question cannot be waived and stays unconfirmed", async () => {
  const id = await createSession();
  for (const fieldId of ["PHQ-009", "SAF-001", "SAF-002"]) {
    const res = await act(id, { fieldId, action: "waive", answer: "" });
    assert.equal(res.status, 422);
    assert.equal((await res.json()).code, "SAFETY_NOT_WAIVABLE");
    assert.equal(getSession(id).answers[fieldId], undefined);
  }
});

test("waive and unknown actions on other questions are refused, as is a non-text answer", async () => {
  const id = await createSession();
  for (const action of ["waive", "approve", "toString", undefined]) {
    const res = await act(id, { fieldId: "AIQ-001", action, answer: "x" });
    assert.equal(res.status, 422);
    assert.equal((await res.json()).code, "INVALID_ACTION");
  }
  const res = await act(id, { fieldId: "AIQ-001", action: "confirm", answer: 42 });
  assert.equal(res.status, 422);
  assert.equal((await res.json()).code, "INVALID_ANSWER");
  assert.deepEqual(getSession(id).answers, {});
});

test("an unknown field is 422 and records nothing", async () => {
  const id = await createSession();
  for (const fieldId of ["NOPE-001", "__proto__", 7, undefined]) {
    const res = await act(id, { fieldId, action: "confirm", answer: "x" });
    assert.equal(res.status, 422);
    assert.equal((await res.json()).code, "UNKNOWN_FIELD");
  }
  const nullBody = await act(id, "null");
  assert.equal(nullBody.status, 422);
  assert.equal((await nullBody.json()).code, "UNKNOWN_FIELD");
  assert.deepEqual(getSession(id).answers, {});
});

test("an unknown or malformed session id is 404", async () => {
  for (const sessionId of ["missing", "%E0%A4%A"]) {
    const res = await act(sessionId, { fieldId: "AIQ-001", action: "confirm", answer: "x" });
    assert.equal(res.status, 404);
    assert.equal((await res.json()).code, "NOT_FOUND");
  }
});
