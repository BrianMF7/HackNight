import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEPRESSION_CRITERIA } from '../focus/criteria.js';
import { bindCriteria } from '../focus/bind.js';

const IDS = DEPRESSION_CRITERIA.map((item) => item.id);

const LINES = [
  { t: 1, speaker: 'patient', text: 'I have felt low and hopeless for weeks.' },
  { t: 2, speaker: 'patient', text: 'I stopped enjoying the walks I used to take.' },
];

test('a quote that appears in a transcript line is kept with its criterion id and t', () => {
  assert.deepEqual(
    bindCriteria(
      [{ criterionId: 'dep-mood', evidence: 'felt low and hopeless', t: 1 }],
      LINES,
      IDS,
    ),
    [{ criterionId: 'dep-mood', evidence: 'felt low and hopeless', t: 1 }],
  );
});

test('an invented quote, a missing quote, and an id outside the criteria are dropped', () => {
  assert.deepEqual(
    bindCriteria(
      [
        { criterionId: 'dep-mood', evidence: 'I invented this sentence', t: 9 },
        { criterionId: 'dep-mood', evidence: 'FELT LOW AND HOPELESS', t: 1 },
        { criterionId: 'dep-mood', evidence: 'patient', t: 1 },
        { criterionId: 'dep-interest', t: 2 },
        { criterionId: 'dep-interest', evidence: '', t: 2 },
        { criterionId: 'dep-interest', evidence: '   ', t: 2 },
        { criterionId: 'not-a-criterion', evidence: 'felt low and hopeless', t: 1 },
      ],
      LINES,
      IDS,
    ),
    [],
  );
});

test('a quote split by ... is kept only when every part is in the transcript', () => {
  assert.deepEqual(
    bindCriteria(
      [
        {
          criterionId: 'dep-span',
          evidence: 'felt low and hopeless ... stopped enjoying',
          t: 4,
        },
        {
          criterionId: 'dep-mood',
          evidence: 'stopped enjoying ... felt low and hopeless',
          t: 3,
        },
        { criterionId: 'dep-mood', evidence: 'felt low and hopeless ...', t: 1 },
        {
          criterionId: 'dep-interest',
          evidence: 'stopped enjoying ... never said this',
          t: 5,
        },
        { criterionId: 'dep-mood', evidence: '...', t: 6 },
      ],
      LINES,
      IDS,
    ),
    [
      {
        criterionId: 'dep-span',
        evidence: 'felt low and hopeless ... stopped enjoying',
        t: 4,
      },
      {
        criterionId: 'dep-mood',
        evidence: 'stopped enjoying ... felt low and hopeless',
        t: 3,
      },
      { criterionId: 'dep-mood', evidence: 'felt low and hopeless ...', t: 1 },
    ],
  );
});

test('a candidate list that is not an array returns nothing', () => {
  assert.deepEqual(bindCriteria(null, LINES, IDS), []);
  assert.deepEqual(bindCriteria({ evidence: 'felt low and hopeless' }, LINES, IDS), []);
});
