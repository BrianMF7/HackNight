/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { PROCESSOR_BUFFER, resampleToPcm16, startRealtimeStt } from "./realtimeStt.js";

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

// Node has no media stack. These stubs only cover the calls startRealtimeStt makes.
/** @param {string} key @param {unknown} value */
function setGlobal(key, value) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

function installMediaStubs() {
  const previous = {
    WebSocket: Object.getOwnPropertyDescriptor(globalThis, "WebSocket"),
    AudioContext: Object.getOwnPropertyDescriptor(globalThis, "AudioContext"),
    MediaStream: Object.getOwnPropertyDescriptor(globalThis, "MediaStream"),
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
  };
  let micOpens = 0;
  /** @type {{ stop: () => void, stopped: boolean } | null} */
  let micTrack = null;
  class FakeSocket {
    constructor() {
      this.readyState = 0;
      this.closed = false;
      queueMicrotask(() => {
        this.readyState = 1;
        this.onopen?.();
      });
    }
    close() {
      this.readyState = 3;
      this.closed = true;
    }
    send() {}
  }
  class FakeAudio {
    constructor() {
      this.sampleRate = 48000;
      this.destination = {};
      this.closed = false;
    }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createScriptProcessor() { return { connect() {}, disconnect() {} }; }
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
    close() { this.closed = true; return Promise.resolve(); }
  }
  class FakeMediaStream {
    /** @param {Array<{ stop: () => void }>} [tracks] */
    constructor(tracks = []) { this.tracks = tracks; }
    getTracks() { return this.tracks; }
  }
  setGlobal("WebSocket", FakeSocket);
  setGlobal("AudioContext", FakeAudio);
  setGlobal("MediaStream", FakeMediaStream);
  setGlobal("navigator", {
    mediaDevices: {
      getUserMedia: async () => {
        micOpens += 1;
        micTrack = { stopped: false, stop() { this.stopped = true; } };
        return new FakeMediaStream([micTrack]);
      },
    },
  });
  return {
    micOpens: () => micOpens,
    micTrack: () => micTrack,
    restore() {
      for (const [key, descriptor] of Object.entries(previous)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}

test("stop() leaves a passed-in track running and still stops a microphone it opened", async () => {
  const media = installMediaStubs();
  try {
    const borrowed = { stopped: false, stop() { this.stopped = true; } };
    const fromTrack = await startRealtimeStt({ wsUrl: "wss://example.test/scribe", track: borrowed });
    fromTrack.stop();
    assert.equal(borrowed.stopped, false);
    assert.equal(media.micOpens(), 0);

    const fromMic = await startRealtimeStt({ wsUrl: "wss://example.test/scribe" });
    fromMic.stop();
    assert.equal(media.micOpens(), 1);
    assert.equal(media.micTrack()?.stopped, true);
  } finally {
    media.restore();
  }
});
