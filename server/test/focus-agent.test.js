import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DEPRESSION_CRITERIA } from '../focus/criteria.js';
import { suggestBindings } from '../focus/agent.js';
import { scoreFocus } from '../focus/score.js';

const LINES = [
  { t: 1, speaker: 'patient', text: 'I have felt low and hopeless for weeks.' },
  { t: 2, speaker: 'patient', text: 'I stopped enjoying the walks I used to take.' },
];

const recorded = JSON.parse(readFileSync(new URL('../fixtures/focus-bindings.json', import.meta.url), 'utf8'));

function noFetch() {
  return async () => {
    throw new Error('Gemini fetch was called');
  };
}

function restore(name, previous) {
  if (previous === undefined) delete process.env[name];
  else process.env[name] = previous;
}

test('the request text lists the criterion ids and asks for JSON bindings', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  let text = '';
  try {
    await suggestBindings(LINES, DEPRESSION_CRITERIA, {
      synthetic: true,
      fetch: async (_url, init) => {
        text = JSON.parse(init.body).contents[0].parts[0].text;
        return { ok: true, json: async () => recorded };
      },
    });
  } finally {
    restore('GEMINI_API_KEY', previous);
  }
  assert.match(text, /dep-mood/);
  assert.match(text, /dep-interest/);
  assert.match(text, /dep-span/);
  assert.match(text, /\{"bindings":\[\{"criterionId","evidence","t"\}\]\}/);
  assert.match(text, /felt low and hopeless/);
  assert.doesNotMatch(text, /diagnos(?:is|e|tic)\s+name/i);
  assert.doesNotMatch(text, /diagnos(?:is|e|tic)\s+code/i);
  assert.doesNotMatch(text, /\bICD(?:-\d+)?\b/);
  assert.doesNotMatch(text, /\bDSM(?:-?\d+)?\b/);
});

test('a recorded body whose quotes are in the transcript becomes bindings and ignores a focus name', async () => {
  const result = await suggestBindings(LINES, DEPRESSION_CRITERIA, {
    synthetic: true,
    body: recorded,
    fetch: noFetch(),
  });
  assert.deepEqual(result, {
    bindings: [
      { criterionId: 'dep-mood', evidence: 'felt low and hopeless', t: 1 },
      { criterionId: 'dep-interest', evidence: 'stopped enjoying the walks', t: 2 },
    ],
  });
  const corpus = LINES.map((line) => line.text).join('\n');
  for (const binding of result.bindings) {
    assert.equal(corpus.includes(binding.evidence), true);
  }
});

test('synthetic false without ALLOW_PHI refuses before fetch', async () => {
  const previous = process.env.ALLOW_PHI;
  delete process.env.ALLOW_PHI;
  let called = false;
  try {
    await assert.rejects(
      () => suggestBindings(LINES, DEPRESSION_CRITERIA, {
        synthetic: false,
        body: recorded,
        fetch: async () => {
          called = true;
          throw new Error('Gemini fetch was called');
        },
      }),
      (err) => err.code === 'PHI_REFUSED',
    );
    assert.equal(called, false);
  } finally {
    restore('ALLOW_PHI', previous);
  }
});

test('the request JSON uses gemini-3.8-flash and thinkingLevel low', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  let calls = 0;
  try {
    await suggestBindings(LINES, DEPRESSION_CRITERIA, {
      synthetic: true,
      fetch: async (url, init) => {
        calls += 1;
        assert.equal(init.method, 'POST');
        assert.equal(init.headers['x-goog-api-key'], 'test-key');
        assert.equal(String(url).includes('test-key'), false);
        assert.match(String(url), /\/models\/gemini-3\.8-flash:generateContent$/);
        const sent = JSON.parse(init.body);
        assert.equal(sent.generationConfig.thinkingConfig.thinkingLevel, 'low');
        assert.equal(sent.generationConfig.responseMimeType, 'application/json');
        assert.equal(Object.hasOwn(sent, 'tools'), false);
        return { ok: true, json: async () => recorded };
      },
    });
    assert.equal(calls, 1);
  } finally {
    restore('GEMINI_API_KEY', previous);
  }
});

test('synthetic false with ALLOW_PHI=1 fetches once', async () => {
  const previousPhi = process.env.ALLOW_PHI;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.ALLOW_PHI = '1';
  process.env.GEMINI_API_KEY = 'test-key';
  let calls = 0;
  try {
    const result = await suggestBindings(LINES, DEPRESSION_CRITERIA, {
      synthetic: false,
      fetch: async () => {
        calls += 1;
        return { ok: true, json: async () => recorded };
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.bindings.length, 2);
  } finally {
    restore('ALLOW_PHI', previousPhi);
    restore('GEMINI_API_KEY', previousKey);
  }
});

test('a missing Gemini key refuses before fetch', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  let called = false;
  try {
    await assert.rejects(
      () => suggestBindings(LINES, DEPRESSION_CRITERIA, {
        synthetic: true,
        fetch: async () => {
          called = true;
          throw new Error('Gemini fetch was called');
        },
      }),
      (err) => err.code === 'NO_GEMINI_KEY',
    );
    assert.equal(called, false);
  } finally {
    restore('GEMINI_API_KEY', previous);
  }
});

test('a failed Gemini response throws GEMINI_HTTP and does not retry', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  let calls = 0;
  try {
    await assert.rejects(
      () => suggestBindings(LINES, DEPRESSION_CRITERIA, {
        synthetic: true,
        fetch: async () => {
          calls += 1;
          return { ok: false, status: 503, json: async () => ({}) };
        },
      }),
      (err) => err.code === 'GEMINI_HTTP',
    );
    assert.equal(calls, 1);
  } finally {
    restore('GEMINI_API_KEY', previous);
  }
});

test('a Gemini body that names a focus and has no bindings throws BAD_GEMINI', async () => {
  await assert.rejects(
    () => suggestBindings(LINES, DEPRESSION_CRITERIA, {
      synthetic: true,
      body: { candidates: [{ content: { parts: [{ text: '{"focus":"depression"}' }] } }] },
      fetch: noFetch(),
    }),
    (err) => err.code === 'BAD_GEMINI',
  );
});

function loadGold(name) {
  return JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
}

async function runGold(fixture) {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  let calls = 0;
  try {
    const result = await suggestBindings(fixture.lines, DEPRESSION_CRITERIA, {
      synthetic: true,
      fetch: async () => {
        calls += 1;
        return { ok: true, json: async () => fixture.body };
      },
    });
    return { result, calls };
  } finally {
    restore('GEMINI_API_KEY', previous);
  }
}

function corpusOf(fixture) {
  return fixture.lines.map((line) => line.text).join('\n');
}

test('the positive gold transcript surfaces depression and keeps only transcript quotes', async () => {
  const fixture = loadGold('focus-positive.json');
  const { result, calls } = await runGold(fixture);
  assert.equal(calls, 1);
  const scored = scoreFocus(result.bindings);
  assert.equal(scored?.id, 'depression');
  const corpus = corpusOf(fixture);
  const ids = new Set(result.bindings.map((binding) => binding.criterionId));
  assert.equal(ids.has('dep-mood'), true);
  assert.equal(ids.has('dep-interest'), true);
  assert.equal(result.bindings.length > 0, true);
  for (const binding of result.bindings) {
    assert.equal(corpus.includes(binding.evidence), true);
  }
  assert.equal(result.bindings.some((binding) => binding.evidence === 'I have a diagnosis of depression'), false);
  assert.equal(Object.hasOwn(result, 'id'), false);
});

test('the negative gold transcript surfaces nothing', async () => {
  const fixture = loadGold('focus-negative.json');
  const { result, calls } = await runGold(fixture);
  assert.equal(calls, 1);
  assert.equal(scoreFocus(result.bindings), null);
  const corpus = corpusOf(fixture);
  for (const binding of result.bindings) {
    assert.equal(corpus.includes(binding.evidence), true);
  }
});

test('gold fixtures are not loaded by session create or the form-draft agent', () => {
  const session = readFileSync(new URL('../session.js', import.meta.url), 'utf8');
  const drafts = readFileSync(new URL('../gemini.js', import.meta.url), 'utf8');
  const index = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  for (const source of [session, drafts, index]) {
    assert.equal(source.includes('focus-positive'), false);
    assert.equal(source.includes('focus-negative'), false);
  }
});
