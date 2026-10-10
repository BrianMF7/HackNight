import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "../index.js";
import { findSession } from "../session.js";
import { getTemplate } from "../template.js";
import { createFakeMailer } from "../send.js";
import { storeSentPacket } from "../store.js";

function fakeSql() {
  const calls = [];
  const sql = (strings, ...values) => {
    calls.push({ query: strings.join("?"), values });
    return Promise.resolve([]);
  };
  sql.begin = (fn) => fn(sql);
  sql.calls = calls;
  return sql;
}

function inserts(sql) {
  return sql.calls.filter((call) => call.query.trimStart().startsWith("insert"));
}

test("storeSentPacket skips when sql is missing", async () => {
  assert.deepEqual(await storeSentPacket(null, { caseId: "c", therapist: "a@b.co", pdfBytes: Buffer.from("%PDF-"), sentAt: new Date(0), nudgeIds: [] }), { stored: false });
});

test("bound parameters are the packet fields, not audio or the transcript", async () => {
  const sql = fakeSql();
  const pdfBytes = Buffer.from("%PDF-1.4 packet");
  const sentAt = new Date("2026-01-01T00:00:00.000Z");
  const transcript = [{ t: 6, speaker: "Patient", text: "I've been feeling really overwhelmed and anxious, and it's getting hard to function." }];
  const audio = Buffer.from("raw-pcm-audio");
  await storeSentPacket(sql, {
    caseId: "case-1",
    therapist: "therapist@example.com",
    pdfBytes,
    sentAt,
    nudgeIds: ["AIQ-005"],
    transcript,
    audio,
  });
  const written = inserts(sql);
  assert.equal(written.length, 2);
  assert.deepEqual(written[0].values, ["case-1", "therapist@example.com", pdfBytes, sentAt]);
  assert.deepEqual(written[1].values, ["case-1", "AIQ-005"]);
  for (const call of sql.calls) {
    assert.doesNotMatch(call.query, /transcript|audio/i);
    assert.equal(call.values.includes(transcript), false);
    assert.equal(call.values.includes(audio), false);
  }
});

test("a refused handoff writes nothing and a successful send stores the mailed pdf plus nudge rows", async () => {
  const mailer = createFakeMailer();
  const sql = fakeSql();
  const server = createServer({ token: "synthetic-test", handoffMailer: mailer, sql });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body) => fetch(url + route, {
    method: "POST",
    headers: { Authorization: "Bearer synthetic-test", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try {
    const created = await post("/api/sessions", { templateId: "adult-intake-v1", therapistEmail: "therapist@example.com" });
    const { id } = await created.json();
    const route = `/api/sessions/${id}/handoff`;
    const refused = await post(route, { elapsedSeconds: 999999, confirmedIds: ["*"] });
    assert.equal((await refused.json()).allowed, false);
    assert.equal(inserts(sql).length, 0);

    const entry = findSession(id);
    const template = getTemplate(entry.templateId);
    for (const question of template.pages.flatMap((page) => page.sections.flatMap((section) => section.questions))) {
      entry.answers[question.id] = { status: "confirmed", answer: "Synthetic answer" };
    }
    entry.startedAt = Date.now() - 45 * 60_000 - 1000;
    entry.events = [{ fieldId: "AIQ-005", prompt: true, status: "partial", answer: "nudge", evidence: '"Synthetic answer"' }];

    const sent = await post(route, {});
    assert.deepEqual(await sent.json(), { allowed: true, sent: true, duplicate: false });
    const written = inserts(sql);
    assert.equal(written.length, 2);
    assert.equal(written[0].values[0], id);
    assert.equal(written[0].values[1], "therapist@example.com");
    assert.ok(Buffer.isBuffer(written[0].values[2]));
    assert.ok(written[0].values[2].equals(mailer.messages[0].pdfBytes));
    assert.ok(written[0].values[3] instanceof Date);
    assert.deepEqual(written[1].values, [id, "AIQ-005"]);

    await post(route, {});
    assert.equal(inserts(sql).length, 2);
    assert.equal(mailer.messages.length, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
