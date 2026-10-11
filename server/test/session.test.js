import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { events, syntheticSession, transcript } from "../../src/api/fixtures/syntheticSession.js";
import { workspaceEndpoints } from "../../src/api/liveWorkspace.js";
import { createServer } from "../index.js";
import { findSession, load } from "../session.js";

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

test("live adapter wires createSession, getTranscript, and getEvents", () => {
  assert.deepEqual(workspaceEndpoints.createSession, { method: "POST", path: "/api/sessions" });
  assert.deepEqual(workspaceEndpoints.getTranscript, { method: "GET", path: "/api/sessions/:sessionId/transcript" });
  assert.deepEqual(workspaceEndpoints.getEvents, { method: "GET", path: "/api/sessions/:sessionId/events" });
});

test("load reads the synthetic fixture and rejects paths outside that dir", () => {
  assert.match(load("syntheticSession.js"), /adult-intake-v1/);
  assert.throws(() => load("../templates/adultIntake.js"), (err) => err.code === "PATH_OUTSIDE");
  assert.throws(() => load("../../server/index.js"), (err) => err.code === "PATH_OUTSIDE");
  assert.throws(() => load("/etc/passwd"), (err) => err.code === "PATH_OUTSIDE");
  assert.throws(() => load("syntheticSession.js/../../server/index.js"), (err) => err.code === "PATH_OUTSIDE");
  assert.throws(() => load("syntheticSession.js\0"), (err) => err.code === "PATH_OUTSIDE");
});

test("POST /api/sessions returns the workspace shape and events match the fixture", async () => {
  const created = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      templateId: "adult-intake-v1",
      therapistName: "Dr. Rowan Ellis",
      therapistEmail: "therapist@example.com",
    }),
  });
  assert.equal(created.status, 200);
  const session = await created.json();
  assert.equal(typeof session.id, "string");
  assert.equal(session.id.includes("/"), false);
  assert.equal(session.patientLabel, syntheticSession.patientLabel);
  assert.deepEqual(session.therapist, syntheticSession.therapist);
  assert.equal(session.plannedMinutes, 45);
  assert.equal(session.templateId, "adult-intake-v1");
  assert.equal(Number.isFinite(session.startedAt), true);

  const transcriptRes = await fetch(`${base}/api/sessions/${session.id}/transcript`, { headers: authHeaders() });
  assert.equal(transcriptRes.status, 200);
  assert.deepEqual(await transcriptRes.json(), transcript);

  const eventsRes = await fetch(`${base}/api/sessions/${session.id}/events`, { headers: authHeaders() });
  assert.equal(eventsRes.status, 200);
  assert.deepEqual(await eventsRes.json(), events);
});

test("live create starts empty, and one append is the only transcript line", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  delete process.env.ALLOW_PHI;
  try {
    const created = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        templateId: "adult-intake-v1",
        therapistName: "Dr. Rowan Ellis",
        therapistEmail: "therapist@example.com",
        live: true,
      }),
    });
    assert.equal(created.status, 200);
    const session = await created.json();

    const transcriptRes = await fetch(`${base}/api/sessions/${session.id}/transcript`, { headers: authHeaders() });
    assert.equal(transcriptRes.status, 200);
    assert.deepEqual(await transcriptRes.json(), []);

    const eventsRes = await fetch(`${base}/api/sessions/${session.id}/events`, { headers: authHeaders() });
    assert.equal(eventsRes.status, 200);
    assert.deepEqual(await eventsRes.json(), []);

    const line = { t: 4, speaker: "Clinician", text: "What brings you in today?" };
    const appended = await fetch(`${base}/api/sessions/${session.id}/transcript-lines`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(line),
    });
    assert.equal(appended.status, 200);
    assert.deepEqual(await appended.json(), { ...line, seq: 1, drafts: [], code: "PHI_REFUSED" });

    const after = await fetch(`${base}/api/sessions/${session.id}/transcript`, { headers: authHeaders() });
    assert.deepEqual(await after.json(), [line]);
    const eventsAfter = await fetch(`${base}/api/sessions/${session.id}/events`, { headers: authHeaders() });
    assert.deepEqual(await eventsAfter.json(), []);
  } finally {
    if (previousPhi === undefined) delete process.env.ALLOW_PHI;
    else process.env.ALLOW_PHI = previousPhi;
  }
});

test("an empty transcript line is 400 and adds nothing", async () => {
  const created = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ templateId: "adult-intake-v1" }),
  });
  assert.equal(created.status, 200);
  const session = await created.json();
  const beforeRes = await fetch(`${base}/api/sessions/${session.id}/transcript`, { headers: authHeaders() });
  assert.deepEqual(await beforeRes.json(), transcript);

  const appended = await fetch(`${base}/api/sessions/${session.id}/transcript-lines`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ t: 1, speaker: "Clinician", text: "   " }),
  });
  assert.equal(appended.status, 400);
  assert.equal((await appended.json()).code, "BAD_REQUEST");

  const afterRes = await fetch(`${base}/api/sessions/${session.id}/transcript`, { headers: authHeaders() });
  assert.deepEqual(await afterRes.json(), transcript);
});

test("an unknown speaker is 400 and adds nothing; Patient and an omitted speaker are stored", async () => {
  const previousPhi = process.env.ALLOW_PHI;
  delete process.env.ALLOW_PHI;
  try {
    const created = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ templateId: "adult-intake-v1", live: true }),
    });
    const session = await created.json();

    const rejected = await fetch(`${base}/api/sessions/${session.id}/transcript-lines`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ t: 2, speaker: "Therapist", text: "Not a role we store" }),
    });
    assert.equal(rejected.status, 400);
    assert.equal((await rejected.json()).code, "BAD_REQUEST");

    const patient = await fetch(`${base}/api/sessions/${session.id}/transcript-lines`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ t: 3, speaker: "Patient", text: "I've been feeling overwhelmed" }),
    });
    assert.equal(patient.status, 200);

    const omitted = await fetch(`${base}/api/sessions/${session.id}/transcript-lines`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ t: 4, text: "What brings you in today?" }),
    });
    assert.equal(omitted.status, 200);
    assert.equal((await omitted.json()).speaker, "Clinician");

    const after = await fetch(`${base}/api/sessions/${session.id}/transcript`, { headers: authHeaders() });
    assert.deepEqual(await after.json(), [
      { t: 3, speaker: "Patient", text: "I've been feeling overwhelmed" },
      { t: 4, speaker: "Clinician", text: "What brings you in today?" },
    ]);
  } finally {
    if (previousPhi === undefined) delete process.env.ALLOW_PHI;
    else process.env.ALLOW_PHI = previousPhi;
  }
});

test("an unknown template id is 404", async () => {
  const res = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ templateId: "brief-intake" }),
  });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, "NOT_FOUND");
});

test("an unknown session is 404", async () => {
  const res = await fetch(`${base}/api/sessions/missing/events`, { headers: authHeaders() });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, "NOT_FOUND");
});

test("GET session pdf exports a drafted client answer", async () => {
  const created = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ templateId: "adult-intake-v1", live: true }),
  });
  const session = await created.json();
  const record = findSession(session.id);
  record.answers["AIQ-001"] = { status: "draft", answer: "The client feels overwhelmed." };
  const res = await fetch(`${base}/api/sessions/${session.id}/pdf`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Origin: ORIGIN, Accept: "application/pdf" },
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") || "", /application\/pdf/);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.ok(bytes.subarray(0, 5).equals(Buffer.from("%PDF-")));
});

test("session routes reject a missing bearer", async () => {
  const res = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ templateId: "adult-intake-v1" }),
  });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).code, "UNAUTHORIZED");
});
