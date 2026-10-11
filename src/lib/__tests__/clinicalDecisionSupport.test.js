import test from 'node:test';
import assert from 'node:assert/strict';
import { safetyReviewItems, diagnosticEvidence } from '../clinicalDecisionSupport.js';

test('no response is classified as safe or high-risk automatically', () => {
  const items = safetyReviewItems({ 'SAF-001': { status: 'confirmed', answer: 'No, not now' } });
  assert.equal(items[1].status, 'confirmed');
  assert.equal(items[0].status, 'pending');
  assert.ok(items.every(item => !('risk' in item)));
});

test('unconfirmed AI drafts are not treated as diagnostic evidence', () => {
  const report = diagnosticEvidence({ 'PHQ-001': { status: 'draft', answer: 'Nearly every day' }, 'PHQ-002': { status: 'confirmed', answer: 'Several days' } });
  assert.deepEqual(report.confirmed.map(f => f.id), ['PHQ-002']);
  assert.equal(report.missing.length, 4);
  assert.match(report.status, /diagnosis not established/);
});
