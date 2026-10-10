import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "../index.js";
import { adultIntake } from "../../src/api/templates/adultIntake.js";
import { workspaceEndpoints } from "../../src/api/liveWorkspace.js";

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

function questionFlags(template) {
  return template.pages.flatMap((page) =>
    page.sections.flatMap((section) =>
      section.questions.map((q) => ({
        id: q.id,
        required: q.required === true,
        safety: q.safety === true,
      })),
    ),
  );
}

function authHeaders() {
  return { Authorization: `Bearer ${TOKEN}`, Origin: ORIGIN, Accept: "application/json" };
}

test("live adapter lists and loads templates by id", () => {
  assert.deepEqual(workspaceEndpoints.getTemplates, { method: "GET", path: "/api/templates" });
  assert.deepEqual(workspaceEndpoints.getTemplate, { method: "GET", path: "/api/templates/:templateId" });
});

test("adult-intake-v1 keeps the same required and safety ids as the frontend template", async () => {
  const res = await fetch(`${base}/api/templates/adult-intake-v1`, { headers: authHeaders() });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, adultIntake.id);
  assert.deepEqual(questionFlags(body), questionFlags(adultIntake));
});

test("an unknown template id is 404", async () => {
  const res = await fetch(`${base}/api/templates/not-a-form`, { headers: authHeaders() });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, "NOT_FOUND");
});

test("brief intake and PHQ-9 are listed as unavailable", async () => {
  const res = await fetch(`${base}/api/templates`, { headers: authHeaders() });
  assert.equal(res.status, 200);
  const list = await res.json();
  const byId = Object.fromEntries(list.map((item) => [item.id, item]));
  assert.equal(byId["adult-intake-v1"].available, true);
  assert.equal(byId["brief-intake"].available, false);
  assert.equal(byId.phq9.available, false);
});

test("template routes reject a missing bearer", async () => {
  const res = await fetch(`${base}/api/templates`, { headers: { Origin: ORIGIN } });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).code, "UNAUTHORIZED");
});
