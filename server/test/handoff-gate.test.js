import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from '../index.js';
import { findSession } from '../session.js';
import { getTemplate } from '../template.js';
import { createFakeMailer } from '../send.js';
import { workspaceEndpoints } from '../../src/api/liveWorkspace.js';
import { handoffReasons } from '../handoff.js';

function record(overrides = {}) {
  const template = getTemplate('adult-intake-v1');
  const answers = Object.fromEntries(template.pages.flatMap(p => p.sections.flatMap(s => s.questions))
    .map(q => [q.id, { status: 'confirmed', answer: 'Synthetic confirmed answer' }]));
  return { templateId: template.id, startedAt: 10_000, therapist: { email: 'therapist@example.com' }, answers, ...overrides };
}

function requiredCount() {
  return getTemplate('adult-intake-v1').pages
    .flatMap((page) => page.sections.flatMap((section) => section.questions))
    .filter((question) => question.required).length;
}

test('live requestHandoff posts to the session handoff route', () => {
  assert.deepEqual(workspaceEndpoints.requestHandoff, {
    method: 'POST',
    path: '/api/sessions/:sessionId/handoff',
  });
  assert.equal(workspaceEndpoints.playQuestion, null);
});

test('gate rejects under 45 minutes and accepts exactly 45', () => {
  assert.deepEqual(handoffReasons(record(), 10_000 + 44 * 60_000 + 59_000), [
    { code: 'SEND_GATE_NOT_MET', message: 'At least 45 minutes are required before handoff.' },
  ]);
  assert.deepEqual(handoffReasons(record(), 10_000 + 45 * 60_000), []);
});
test('all four reasons are returned for missing confirmations, safety, recipient and clock', () => {
  const data = record({ therapist: { email: '' }, answers: {} });
  assert.deepEqual(handoffReasons(data, 10_000), [
    { code: 'SEND_GATE_NOT_MET', message: 'At least 45 minutes are required before handoff.' },
    { code: 'REQUIRED_UNCONFIRMED', message: `${requiredCount()} required question(s) are not clinician-confirmed.` },
    { code: 'SAFETY_UNRESOLVED', message: 'A required safety item is unresolved.' },
    { code: 'NO_RECIPIENT', message: 'No therapist recipient is assigned.' },
  ]);
});
test('a draft, an empty confirmed answer, and a safety draft block handoff', () => {
  const data = record();
  data.answers['AIQ-001'] = { status: 'draft', answer: 'unverified' };
  data.answers['SAF-001'] = { status: 'confirmed', answer: '   ' };
  assert.deepEqual(handoffReasons(data, 10_000 + 45 * 60_000), [
    { code: 'REQUIRED_UNCONFIRMED', message: '2 required question(s) are not clinician-confirmed.' },
    { code: 'SAFETY_UNRESOLVED', message: 'A required safety item is unresolved.' },
  ]);
});

test('HTTP handoff ignores forged client time and confirmations; authorized send is once', async () => {
  const mailer = createFakeMailer();
  const server = createServer({ token: 'synthetic-test', handoffMailer: mailer, sql: null });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body) => fetch(url + route, { method: 'POST', headers: { Authorization: 'Bearer synthetic-test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const initial = await post('/api/sessions', { templateId: 'adult-intake-v1', therapistEmail: 'therapist@example.com' });
    assert.equal(initial.status, 200);
    const { id } = await initial.json();
    const route = `/api/sessions/${id}/handoff`;
    let res = await post(route, { elapsedSeconds: 999999, confirmedIds: ['*'], therapistEmail: 'fake@example.com' });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).allowed, false);
    assert.equal(mailer.messages.length, 0);
    const entry = findSession(id);
    const template = getTemplate(entry.templateId);
    for (const q of template.pages.flatMap(p => p.sections.flatMap(s => s.questions))) {
      entry.answers[q.id] = { status: 'confirmed', answer: q.id === 'AIQ-001' ? 'Seeking support for synthetic stress.' : 'Synthetic answer' };
    }
    entry.startedAt = Date.now() - 45 * 60_000 - 1000;
    res = await post(route, { elapsedSeconds: 0 });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { allowed: true, sent: true, duplicate: false });
    assert.equal(mailer.messages.length, 1);
    assert.equal(mailer.messages[0].to, 'therapist@example.com');
    res = await post(route, {});
    assert.equal((await res.json()).duplicate, true);
    assert.equal(mailer.messages.length, 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
