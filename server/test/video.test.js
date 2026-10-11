import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { workspaceEndpoints } from "../../src/api/liveWorkspace.js";
import { createServer } from "../index.js";
import { handleSession } from "../session.js";
import { handleCall } from "../video.js";

const NOW = Date.UTC(2026, 9, 10, 20, 0, 0);
const EXP = NOW / 1000 + 2 * 60 * 60;
const KEY = "daily-secret-key";
const TOKEN = "test-token";
const ORIGIN = "http://localhost:5173";

// Fake Daily REST API: records every request and answers rooms and meeting-tokens.
function fakeDaily() {
  const daily = {
    requests: [],
    failRooms: false,
    async fetchImpl(url, init) {
      const n = daily.requests.push({ url, init, body: JSON.parse(init.body) });
      if (url.endsWith("/rooms")) {
        if (daily.failRooms) return { ok: false, status: 500, async json() { return { error: "server-error" }; } };
        return { ok: true, async json() { return { name: `room-${n}`, url: `https://hacknight.daily.co/room-${n}` }; } };
      }
      return { ok: true, async json() { return { token: `owner-token-${n}` }; } };
    },
  };
  return daily;
}

async function newSession(live) {
  const res = await handleSession("POST", "/api/sessions", { templateId: "adult-intake-v1", live }, NOW);
  return res.body.id;
}

const startCall = (sessionId, opts) => handleCall("POST", `/api/sessions/${sessionId}/call`, NOW, opts);

test("the live adapter routes startCall to the call endpoint", () => {
  assert.deepEqual(workspaceEndpoints.startCall, { method: "POST", path: "/api/sessions/:sessionId/call" });
});

test("a live session gets a private Daily room with chat and knocking, plus an owner token for that room", async () => {
  const daily = fakeDaily();
  const res = await startCall(await newSession(true), { apiKey: KEY, fetchImpl: daily.fetchImpl });

  assert.deepEqual(res, { status: 200, body: { roomUrl: "https://hacknight.daily.co/room-1", token: "owner-token-2" } });
  assert.equal(JSON.stringify(res.body).includes(KEY), false);
  assert.equal(daily.requests.length, 2);
  const [room, token] = daily.requests;
  assert.equal(room.url, "https://api.daily.co/v1/rooms");
  assert.equal(room.init.method, "POST");
  assert.equal(room.init.headers.Authorization, `Bearer ${KEY}`);
  assert.deepEqual(room.body, {
    privacy: "private",
    properties: { exp: EXP, enable_chat: true, enable_knocking: true, enable_prejoin_ui: true },
  });
  assert.equal(token.url, "https://api.daily.co/v1/meeting-tokens");
  assert.equal(token.init.method, "POST");
  assert.equal(token.init.headers.Authorization, `Bearer ${KEY}`);
  assert.deepEqual(token.body, { properties: { room_name: "room-1", is_owner: true, exp: EXP } });
});

test("a repeat request and two concurrent requests create one room", async () => {
  const daily = fakeDaily();
  const sessionId = await newSession(true);
  const opts = { apiKey: KEY, fetchImpl: daily.fetchImpl };

  const [first, second] = await Promise.all([startCall(sessionId, opts), startCall(sessionId, opts)]);
  const repeat = await startCall(sessionId, opts);

  assert.equal(first.status, 200);
  assert.deepEqual(second, first);
  assert.deepEqual(repeat, first);
  assert.equal(daily.requests.filter((request) => request.url.endsWith("/rooms")).length, 1);
});

test("a missing DAILY_API_KEY is 503 NO_VIDEO_KEY and does not call Daily", async () => {
  const daily = fakeDaily();
  const res = await startCall(await newSession(true), { apiKey: "", fetchImpl: daily.fetchImpl });

  assert.equal(res.status, 503);
  assert.equal(res.body.code, "NO_VIDEO_KEY");
  assert.equal(daily.requests.length, 0);
});

test("a synthetic session is 422 NOT_LIVE and unknown or malformed ids are 404, without calling Daily", async () => {
  const daily = fakeDaily();
  const opts = { apiKey: KEY, fetchImpl: daily.fetchImpl };

  const synthetic = await startCall(await newSession(false), opts);
  assert.equal(synthetic.status, 422);
  assert.equal(synthetic.body.code, "NOT_LIVE");
  for (const sessionId of ["missing", "%E0%A4%A"]) {
    const res = await startCall(sessionId, opts);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, "NOT_FOUND");
  }
  assert.equal(daily.requests.length, 0);
});

test("a Daily failure is 502 VIDEO_FAILED without the key, and a retry still creates the room", async () => {
  const daily = fakeDaily();
  const sessionId = await newSession(true);
  const opts = { apiKey: KEY, fetchImpl: daily.fetchImpl };

  daily.failRooms = true;
  const failed = await startCall(sessionId, opts);
  assert.equal(failed.status, 502);
  assert.equal(failed.body.code, "VIDEO_FAILED");
  assert.equal(JSON.stringify(failed.body).includes(KEY), false);

  daily.failRooms = false;
  const retried = await startCall(sessionId, opts);
  assert.equal(retried.status, 200);
  assert.equal(retried.body.roomUrl, "https://hacknight.daily.co/room-2");
});

const routeDaily = fakeDaily();
let server;
let base;

before(async () => {
  server = createServer({ token: TOKEN, origin: ORIGIN, dailyKey: KEY, fetchImpl: routeDaily.fetchImpl });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test("POST /api/sessions/:sessionId/call needs the bearer and returns the room for a live session", async () => {
  const headers = { Authorization: `Bearer ${TOKEN}`, Origin: ORIGIN, "Content-Type": "application/json" };
  const created = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ templateId: "adult-intake-v1", live: true }),
  });
  const { id } = await created.json();

  const anonymous = await fetch(`${base}/api/sessions/${id}/call`, { method: "POST", headers: { Origin: ORIGIN } });
  assert.equal(anonymous.status, 401);
  assert.equal(routeDaily.requests.length, 0);

  const res = await fetch(`${base}/api/sessions/${id}/call`, { method: "POST", headers });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { roomUrl: "https://hacknight.daily.co/room-1", token: "owner-token-2" });
});
