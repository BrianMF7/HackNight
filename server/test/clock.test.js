import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clockStatus } from '../clock.js';

const START = 1_700_000_000_000; // Fixed synthetic epoch timestamp; no live clock.
const MINUTE = 60_000;
const SECOND = 1_000;

test('44:59 is under the 45-minute minimum', () => {
  assert.equal(clockStatus(START, START + 44 * MINUTE + 59 * SECOND), 'under');
});

test('45:00 meets the minimum exactly', () => {
  assert.equal(clockStatus(START, START + 45 * MINUTE), 'met');
});

test('45:01 and later remain met, never expired', () => {
  assert.equal(clockStatus(START, START + 45 * MINUTE + SECOND), 'met');
  assert.equal(clockStatus(START, START + 90 * MINUTE), 'met');
});

test('same supplied timestamps always give the same result', () => {
  const end = START + 45 * MINUTE;
  assert.equal(clockStatus(START, end), clockStatus(START, end));
});

test('invalid and backwards timestamps fail closed as under', () => {
  for (const [start, end] of [
    [NaN, START], [START, NaN], [Infinity, START], [START, Infinity],
    [undefined, START], [START, undefined], [START, START - 1],
  ]) {
    assert.equal(clockStatus(start, end), 'under');
  }
});

test('the start instant is under and never qualifies immediately', () => {
  assert.equal(clockStatus(START, START), 'under');
});
