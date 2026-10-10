import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "../index.js";
import { TOKEN_URL, createScribeToken, realtimeWsUrl } from "../stt.js";

test("TOKEN_URL is the realtime_scribe single-use endpoint, not a TTS path", () => {
  assert.match(TOKEN_URL, /single-use-token\/realtime_scribe$/);
  assert.doesNotMatch(TOKEN_URL, /text-to-speech/);
});

test("realtimeWsUrl uses speech-to-text realtime and the token query param", () => {
  const url = realtimeWsUrl("sutkn_test");
  assert.match(url, /^wss:\/\/api\.elevenlabs\.io\/v1\/speech-to-text\/realtime\?/);
  assert.match(url, /model_id=scribe_v2_realtime/);
  assert.match(url, /token=sutkn_test/);
  assert.match(url, /commit_strategy=vad/);
  assert.doesNotMatch(url, /text-to-speech/);
});

test("createScribeToken POSTs xi-api-key and returns token plus wsUrl", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      async json() {
        return { token: "sutkn_abc" };
      },
    };
  };
  const out = await createScribeToken({ apiKey: "secret-key", fetchImpl });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, TOKEN_URL);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["xi-api-key"], "secret-key");
  assert.equal(out.token, "sutkn_abc");
  assert.equal(out.wsUrl, realtimeWsUrl("sutkn_abc"));
});

test("createScribeToken refuses an empty API key without calling the network", async () => {
  let called = false;
  await assert.rejects(
    () => createScribeToken({ apiKey: "", fetchImpl: async () => { called = true; } }),
    (err) => err.code === "NO_API_KEY"
  );
  assert.equal(called, false);
});

const TOKEN = "test-token";
const ORIGIN = "http://localhost:5173";

let server;
let base;

before(async () => {
  server = createServer({
    token: TOKEN,
    origin: ORIGIN,
    elevenLabsKey: "lab-key",
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { token: "sutkn_from_route" };
      },
    }),
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test("POST /api/stt/token with bearer returns a scribe token payload", async () => {
  const res = await fetch(`${base}/api/stt/token`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, Origin: ORIGIN, Accept: "application/json" },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.token, "sutkn_from_route");
  assert.match(body.wsUrl, /token=sutkn_from_route/);
});

test("POST /api/stt/token without bearer is 401", async () => {
  const res = await fetch(`${base}/api/stt/token`, { method: "POST", headers: { Origin: ORIGIN } });
  assert.equal(res.status, 401);
});
