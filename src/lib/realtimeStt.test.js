import assert from "node:assert/strict";
import { test } from "node:test";
import { PROCESSOR_BUFFER, resampleToPcm16 } from "./realtimeStt.js";

test("processor buffer is 2048 samples", () => {
  assert.equal(PROCESSOR_BUFFER, 2048);
});

test("a 48 kHz buffer resamples to 16-bit PCM at 16 kHz, one sample per three inputs", () => {
  const input = new Float32Array([0.5, 0.5, 0.5, -0.5, -0.5, -0.5]);
  const pcm = resampleToPcm16(input, 48000);
  assert.ok(pcm instanceof Int16Array);
  assert.equal(pcm.length, input.length / 3);
  assert.equal(pcm[0], 16383);
  assert.equal(pcm[1], -16384);
});

test("any other AudioContext rate uses sampleRate / 16000 as the box width", () => {
  const paired = resampleToPcm16(new Float32Array([1, 0, 1, 0]), 32000);
  assert.equal(paired.length, 2);
  assert.equal(paired[0], 16383);
  assert.equal(paired[1], 16383);

  const fractional = resampleToPcm16(new Float32Array([1, 0, 0, 0]), 24000);
  assert.equal(fractional.length, Math.floor(4 / (24000 / 16000)));
  assert.equal(fractional[0], 21844);
  assert.equal(fractional[1], 0);

  const input = new Float32Array(14).fill(0.25);
  const pcm = resampleToPcm16(input, 44100);
  assert.equal(pcm.length, Math.floor(input.length / (44100 / 16000)));
  assert.notEqual(pcm.length, Math.floor(input.length / 3));
});
