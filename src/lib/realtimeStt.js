/** Browser mic → ElevenLabs realtime STT via a server-minted single-use token. */

function floatToBase64Pcm16(float32) {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = s < 0 ? (s * 0x8000) | 0 : (s * 0x7fff) | 0;
  }
  const bytes = new Uint8Array(pcm.buffer);
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
  const processor = ctx.createScriptProcessor(4096, 1, 1);
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
      audio_base_64: floatToBase64Pcm16(input),
      commit: false,
      sample_rate: ctx.sampleRate,
    }));
  };

  source.connect(processor);
  processor.connect(silent);
  silent.connect(ctx.destination);

  return { stop };
}
