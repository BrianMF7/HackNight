import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DEPRESSION_CRITERIA, DEPRESSION_ID } from '../focus/criteria.js';
import { scoreFocus } from '../focus/score.js';

const PAIR =
  'Low mood and lost interest were both described, so depression is a possible focus to ask about.';
const SPAN =
  'Low mood and lost interest were both described across a longer stretch, so depression is a possible focus to ask about.';

const MOOD_RULE =
  'Count this only when the speaker reports a sad, empty, or hopeless mood, or reports that someone else saw that mood, and it covers most of each day on most days.';
const INTEREST_RULE =
  'Count this only when the speaker reports a clear loss of interest or enjoyment in nearly everything they usually do, or reports that someone else saw that loss, and it covers most of each day on most days.';
const SPAN_RULE =
  'Count this only when the speaker says the low mood or the lost interest has held through the same period of about two weeks, and that this is a change from how they usually feel.';

test('dep-mood plus dep-interest returns depression with the pair reason', () => {
  assert.deepEqual(scoreFocus(['dep-mood', 'dep-interest']), {
    id: 'depression',
    reason: PAIR,
  });
  assert.deepEqual(scoreFocus(['dep-mood', 'dep-interest', 'nope']), {
    id: 'depression',
    reason: PAIR,
  });
});

test('binder rows ignore quotes and order and still score the required pair', () => {
  assert.deepEqual(
    scoreFocus([
      { criterionId: 'dep-interest', evidence: 'not in the reason', t: 1 },
      { criterionId: 'dep-mood', evidence: 'also ignored', t: 2 },
      { criterionId: 'dep-mood', evidence: 'duplicate', t: 3 },
    ]),
    { id: 'depression', reason: PAIR },
  );
});

test('a missing required id, an empty list, or an unknown id returns null', () => {
  for (const bindings of [
    ['dep-mood'],
    ['dep-interest'],
    [],
    ['nope'],
    ['dep-span'],
    ['dep-mood', 'dep-span'],
    ['dep-interest', 'dep-span'],
    null,
    'dep-mood',
    { bindings: ['dep-mood', 'dep-interest'] },
  ]) {
    assert.equal(scoreFocus(bindings), null);
  }
});

test('dep-span with the required pair changes the reason and stays depression', () => {
  const scored = scoreFocus(['dep-span', 'dep-mood', 'dep-interest']);
  assert.deepEqual(scored, { id: DEPRESSION_ID, reason: SPAN });
  assert.notEqual(scored.reason, PAIR);
});

test('criteria are the three original depression evidence rules', () => {
  assert.equal(DEPRESSION_ID, 'depression');
  assert.deepEqual(
    DEPRESSION_CRITERIA.map((item) => item.id),
    ['dep-mood', 'dep-interest', 'dep-span'],
  );
  assert.deepEqual(
    DEPRESSION_CRITERIA.map((item) => item.rule),
    [MOOD_RULE, INTEREST_RULE, SPAN_RULE],
  );
});

test('criteria text does not contain DSM-5 criteria prose or a diagnosis code', () => {
  const source = readFileSync(new URL('../focus/criteria.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /diagnos(?:is|e|tic)\s+code/i);
  assert.doesNotMatch(source, /\bICD(?:-\d+)?\b/);
  assert.doesNotMatch(source, /\bDSM(?:-?\d+)?\b/);
});
