import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "../index.js";
import { pingDatabase } from "../db.js";

const TOKEN = "test-token";
const ORIGIN = "http://localhost:5173";

test("pingDatabase refuses when sql is null", async () => {
  await assert.rejects(() => pingDatabase(null), (err) => err.code === "NO_DATABASE");
});

let server;
let base;

before(async () => {
  server = createServer({ token: TOKEN, origin: ORIGIN, sql: null });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test("GET /api/db/ping without DATABASE_URL is 503", async () => {
  const res = await fetch(`${base}/api/db/ping`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Origin: ORIGIN, Accept: "application/json" },
  });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, "NO_DATABASE");
});

test("GET /api/db/ping without bearer is 401", async () => {
  const res = await fetch(`${base}/api/db/ping`, { headers: { Origin: ORIGIN } });
  assert.equal(res.status, 401);
});
