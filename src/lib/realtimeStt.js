/** Browser mic → ElevenLabs realtime STT via a server-minted single-use token. */

export const PROCESSOR_BUFFER = 2048;
const TARGET_RATE = 16000;

/** @param {number} sample */
function clampToInt16(sample) {
  const s = Math.max(-1, Math.min(1, sample));
  return s < 0 ? (s * 0x8000) | 0 : (s * 0x7fff) | 0;
}

/**
 * @param {Float32Array} float32
 * @param {number} sampleRate
 */
export function resampleToPcm16(float32, sampleRate) {
  const ratio = sampleRate / TARGET_RATE;
  // shortcut: samples past the last full 16 kHz frame in this buffer are dropped.
  const outLen = Math.floor(float32.length / ratio);
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = i * ratio;
    const end = start + ratio;
    let acc = 0;
    const last = Math.min(float32.length, Math.ceil(end - 1e-9));
    for (let idx = Math.floor(start); idx < last; idx++) {
      const lo = Math.max(start, idx);
      const hi = Math.min(end, idx + 1);
      acc += float32[idx] * (hi - lo);
    }
    pcm[i] = clampToInt16(acc / ratio);
  }
  return pcm;
}

/** @param {Int16Array} pcm */
function pcm16ToBase64(pcm) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * @param {string} url
 * @returns {Promise<WebSocket>}
 */
function openSocket(url) {
  const ws = new WebSocket(url);
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => fail(new Error("Speech-to-text WebSocket timed out")), 10000);
    /** @param {unknown} err */
    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    ws.onopen = () => {
      if (settled) {
        ws.close();
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(ws);
    };
    ws.onerror = () => fail(new Error("Speech-to-text WebSocket failed to connect"));
    ws.onclose = () => fail(new Error("Speech-to-text WebSocket closed"));
  });
}

/**
 * @param {{
 *   wsUrl: string,
 *   track?: MediaStreamTrack,
 *   nextWsUrl?: () => Promise<string>,
 *   onPartial?: (text: string) => void,
 *   onCommitted?: (text: string) => void,
 *   onError?: (err: Error) => void,
 *   onClose?: () => void,
 * }} opts
 * @returns {Promise<{ stop: () => void }>}
 */
export async function startRealtimeStt({
  wsUrl,
  track,
  nextWsUrl,
  onPartial,
  onCommitted,
  onError,
  onClose,
}) {
  if (!wsUrl) throw new Error("Missing speech-to-text WebSocket URL");

  // A passed-in track belongs to the call. Stopping it would mute that person.
  const borrowed = Boolean(track);
  const stream = track
    ? new MediaStream([track])
    : await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(PROCESSOR_BUFFER, 1, 1);
  const silent = ctx.createGain();
  silent.gain.value = 0;

  let closed = false;
  let epoch = 0;
  /** @type {WebSocket | null} */
  let socket = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let retryTimer = undefined;
  /** @type {(value?: unknown) => void} */
  let finishRetry = () => {};

  const resumeCtx = async () => {
    if (ctx.state === "suspended") await ctx.resume();
  };
  ctx.onstatechange = () => {
    if (!closed && ctx.state === "suspended") void resumeCtx();
  };

  const stop = () => {
    if (closed) return;
    closed = true;
    ctx.onstatechange = null;
    clearTimeout(retryTimer);
    finishRetry();
    try { processor.disconnect(); } catch { /* already */ }
    try { source.disconnect(); } catch { /* already */ }
    try { silent.disconnect(); } catch { /* already */ }
    if (!borrowed) stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
    const ws = socket;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) ws.close();
  };

  /** @param {MessageEvent} ev */
  const onMessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    const type = msg.message_type || msg.type;
    const text = msg.text ?? msg.transcript ?? "";
    if (type === "partial_transcript") onPartial?.(text);
    if (type === "committed_transcript" || type === "committed_transcript_with_timestamps") {
      if (text.trim()) onCommitted?.(text.trim());
    }
    if (type === "error" || msg.error) {
      onError?.(new Error(msg.error || msg.message || "Speech-to-text error"));
    }
  };

  /** @param {WebSocket} ws */
  const bind = (ws) => {
    const mine = ++epoch;
    socket = ws;
    ws.onmessage = onMessage;
    ws.onerror = () => {
      if (mine === epoch) onError?.(new Error("Speech-to-text connection error"));
    };
    ws.onclose = () => {
      if (!closed && mine === epoch) void reopen();
    };
    if (ws.readyState === WebSocket.CLOSED) void reopen();
  };

  // The socket dies after silence. The audio graph stays so the next token still hears quiet frames.
  const reopen = async () => {
    if (closed) return;
    epoch += 1;
    if (typeof nextWsUrl !== "function") {
      stop();
      onClose?.();
      return;
    }
    try {
      await resumeCtx();
      if (closed) return;
      const url = await nextWsUrl();
      if (closed) return;
      const ws = await openSocket(url);
      if (closed) {
        ws.close();
        return;
      }
      bind(ws);
    } catch (err) {
      if (closed) return;
      onError?.(err instanceof Error ? err : new Error(String(err)));
      // shortcut: pause only after a failed mint so a dead socket cannot spin.
      await new Promise((resolve) => {
        finishRetry = resolve;
        retryTimer = setTimeout(resolve, 400);
      });
      if (!closed) void reopen();
    }
  };

  processor.onaudioprocess = (e) => {
    const current = socket;
    if (!current || current.readyState !== WebSocket.OPEN) return;
    const input = e.inputBuffer.getChannelData(0);
    current.send(JSON.stringify({
      message_type: "input_audio_chunk",
      audio_base_64: pcm16ToBase64(resampleToPcm16(input, ctx.sampleRate)),
      commit: false,
      sample_rate: TARGET_RATE,
    }));
  };

  source.connect(processor);
  processor.connect(silent);
  silent.connect(ctx.destination);

  try {
    await resumeCtx();
    const ws = await openSocket(wsUrl);
    if (closed) {
      ws.close();
      return { stop };
    }
    bind(ws);
  } catch (err) {
    stop();
    throw err;
  }

  return { stop };
}
