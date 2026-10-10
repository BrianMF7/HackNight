import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "../index.js";
import { endpoints } from "../../src/api/endpoints.js";

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

test("endpoints.ping is GET /api/ping", () => {
  assert.deepEqual(endpoints.ping, { method: "GET", path: "/api/ping" });
});

test("GET /api/ping with the bearer token returns ok", async () => {
  const res = await fetch(`${base}/api/ping`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Origin: ORIGIN, Accept: "application/json" },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(res.headers.get("access-control-allow-origin"), ORIGIN);
});

test("a missing bearer is 401 with a message the connection dialog can show", async () => {
  const res = await fetch(`${base}/api/ping`, { headers: { Origin: ORIGIN } });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, "UNAUTHORIZED");
  assert.equal(body.message, "Not signed in to the backend. Check your access token.");
  assert.equal(res.headers.get("access-control-allow-origin"), ORIGIN);
});

test("a wrong bearer is 401", async () => {
  const res = await fetch(`${base}/api/ping`, {
    headers: { Authorization: "Bearer wrong", Origin: ORIGIN },
  });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).code, "UNAUTHORIZED");
});

test("preflight from the Vite origin allows the Authorization header", async () => {
  const res = await fetch(`${base}/api/ping`, {
    method: "OPTIONS",
    headers: {
      Origin: ORIGIN,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization,content-type,accept",
    },
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), ORIGIN);
  assert.match(res.headers.get("access-control-allow-headers") || "", /authorization/i);
});

test("a different origin is not echoed", async () => {
  const res = await fetch(`${base}/api/ping`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Origin: "http://evil.example" },
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("an unset server token rejects every bearer", async () => {
  const bare = createServer({ token: "", origin: ORIGIN });
  await new Promise((resolve) => bare.listen(0, "127.0.0.1", resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${bare.address().port}/api/ping`, {
      headers: { Authorization: "Bearer " },
    });
    assert.equal(res.status, 401);
  } finally {
    await new Promise((resolve, reject) => bare.close((err) => (err ? reject(err) : resolve())));
  }
});
