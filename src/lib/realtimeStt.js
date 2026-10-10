/** Browser mic → ElevenLabs realtime STT via a server-minted single-use token. */

export const PROCESSOR_BUFFER = 2048;
const TARGET_RATE = 16000;

function clampToInt16(sample) {
  const s = Math.max(-1, Math.min(1, sample));
  return s < 0 ? (s * 0x8000) | 0 : (s * 0x7fff) | 0;
}

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
 * @param {{ wsUrl: string, onPartial?: (text: string) => void, onCommitted?: (text: string) => void, onError?: (err: Error) => void, onClose?: () => void }} opts
 * @returns {Promise<{ stop: () => void }>}
 */
export async function startRealtimeStt({
  wsUrl,
  onPartial,
  onCommitted,
  onError,
  onClose,
}) {
  if (!wsUrl) throw new Error("Missing speech-to-text WebSocket URL");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(PROCESSOR_BUFFER, 1, 1);
  const silent = ctx.createGain();
  silent.gain.value = 0;

  const ws = new WebSocket(wsUrl);
  let closed = false;

  const stop = () => {
    if (closed) return;
    closed = true;
    try { processor.disconnect(); } catch { /* already */ }
    try { source.disconnect(); } catch { /* already */ }
    try { silent.disconnect(); } catch { /* already */ }
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
  };

  await new Promise((resolve, reject) => {
    const fail = (err) => {
      stop();
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    ws.onopen = () => resolve();
    ws.onerror = () => fail(new Error("Speech-to-text WebSocket failed to connect"));
    setTimeout(() => fail(new Error("Speech-to-text WebSocket timed out")), 10000);
  });

  ws.onmessage = (ev) => {
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
  ws.onclose = () => {
    if (!closed) stop();
    onClose?.();
  };
  ws.onerror = () => onError?.(new Error("Speech-to-text connection error"));

  processor.onaudioprocess = (e) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const input = e.inputBuffer.getChannelData(0);
    ws.send(JSON.stringify({
      message_type: "input_audio_chunk",
      audio_base_64: pcm16ToBase64(resampleToPcm16(input, ctx.sampleRate)),
      commit: false,
      sample_rate: TARGET_RATE,
    }));
  };

  source.connect(processor);
  processor.connect(silent);
  silent.connect(ctx.destination);

  return { stop };
}
