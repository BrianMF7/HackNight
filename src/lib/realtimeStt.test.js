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

/**
 * @param {{ suspended?: boolean }} [opts]
 */
function installMediaStubs({ suspended = false } = {}) {
  const previous = {
    WebSocket: Object.getOwnPropertyDescriptor(globalThis, "WebSocket"),
    AudioContext: Object.getOwnPropertyDescriptor(globalThis, "AudioContext"),
    MediaStream: Object.getOwnPropertyDescriptor(globalThis, "MediaStream"),
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
  };
  let micOpens = 0;
  /** @type {{ stop: () => void, stopped: boolean } | null} */
  let micTrack = null;
  /** @type {FakeSocket[]} */
  const sockets = [];
  /** @type {{ onaudioprocess?: (e: { inputBuffer: { getChannelData: () => Float32Array } }) => void }} */
  const processors = [];
  /** @type {FakeAudio[]} */
  const audios = [];
  class FakeSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    /** @param {string} url */
    constructor(url) {
      this.url = url;
      this.readyState = FakeSocket.CONNECTING;
      /** @type {string[]} */
      this.sent = [];
      this.closed = false;
      sockets.push(this);
      queueMicrotask(() => {
        if (this.readyState === FakeSocket.CLOSED) return;
        this.readyState = FakeSocket.OPEN;
        this.onopen?.();
      });
    }
    close() {
      if (this.readyState === FakeSocket.CLOSED) return;
      this.readyState = FakeSocket.CLOSED;
      this.closed = true;
      this.onclose?.();
    }
    /** @param {string} data */
    send(data) { this.sent.push(data); }
  }
  class FakeAudio {
    constructor() {
      this.sampleRate = 48000;
      this.destination = {};
      this.closed = false;
      this.state = suspended ? "suspended" : "running";
      this.resumes = 0;
      /** @type {(() => void) | null} */
      this.onstatechange = null;
      audios.push(this);
    }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createScriptProcessor() {
      const processor = { connect() {}, disconnect() {} };
      processors.push(processor);
      return processor;
    }
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
    resume() {
      this.resumes += 1;
      this.state = "running";
      return Promise.resolve();
    }
    close() { this.closed = true; this.state = "closed"; return Promise.resolve(); }
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
    sockets: () => sockets,
    processors: () => processors,
    audios: () => audios,
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

test("a suspended audio context is resumed and silence is still sent", async () => {
  const media = installMediaStubs({ suspended: true });
  try {
    const handle = await startRealtimeStt({ wsUrl: "wss://example.test/scribe", track: { stop() {} } });
    const audio = media.audios()[0];
    assert.equal(audio.state, "running");
    assert.equal(audio.resumes >= 1, true);

    media.processors()[0].onaudioprocess?.({
      inputBuffer: { getChannelData: () => new Float32Array(6) },
    });
    const sent = media.sockets()[0].sent;
    assert.equal(sent.length, 1);
    const payload = JSON.parse(sent[0]);
    assert.equal(payload.message_type, "input_audio_chunk");
    assert.equal(payload.commit, false);
    assert.equal(payload.sample_rate, 16000);
    assert.equal(typeof payload.audio_base_64, "string");
    assert.equal(payload.audio_base_64.length > 0, true);

    audio.state = "suspended";
    audio.onstatechange?.();
    assert.equal(audio.resumes >= 2, true);
    handle.stop();
  } finally {
    media.restore();
  }
});

test("a closed socket mints another url and keeps the audio graph", async () => {
  const media = installMediaStubs();
  try {
    /** @type {string[]} */
    const urls = [];
    const handle = await startRealtimeStt({
      wsUrl: "wss://example.test/first",
      track: { stop() {} },
      nextWsUrl: async () => {
        const url = "wss://example.test/second";
        urls.push(url);
        return url;
      },
    });
    media.sockets()[0].close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(urls, ["wss://example.test/second"]);
    assert.equal(media.sockets().length, 2);
    assert.equal(media.audios()[0].closed, false);

    media.processors()[0].onaudioprocess?.({
      inputBuffer: { getChannelData: () => new Float32Array(6) },
    });
    assert.equal(media.sockets()[1].sent.length, 1);
    assert.equal(JSON.parse(media.sockets()[1].sent[0]).message_type, "input_audio_chunk");

    handle.stop();
    assert.equal(media.audios()[0].closed, true);
    assert.equal(urls.length, 1);
  } finally {
    media.restore();
  }
});

test("without a next url, socket close stops the audio graph", async () => {
  const media = installMediaStubs();
  try {
    let closes = 0;
    await startRealtimeStt({
      wsUrl: "wss://example.test/scribe",
      track: { stop() {} },
      onClose: () => { closes += 1; },
    });
    media.sockets()[0].close();
    assert.equal(closes, 1);
    assert.equal(media.audios()[0].closed, true);
  } finally {
    media.restore();
  }
});

test("the connect timeout does not close an open socket", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const media = installMediaStubs();
  try {
    const handle = await startRealtimeStt({ wsUrl: "wss://example.test/scribe", track: { stop() {} } });
    t.mock.timers.tick(10000);
    assert.equal(media.audios()[0].closed, false);
    assert.equal(media.sockets()[0].readyState, 1);
    handle.stop();
  } finally {
    media.restore();
    t.mock.timers.reset();
  }
});
