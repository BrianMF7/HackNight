/** ElevenLabs realtime speech-to-text (Scribe). API key stays on the server. */

export const TOKEN_URL = "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe";
export const REALTIME_MODEL = "scribe_v2_realtime";

export function realtimeWsUrl(token) {
  const q = new URLSearchParams({
    model_id: REALTIME_MODEL,
    token,
    commit_strategy: "vad",
    vad_silence_threshold_secs: "0.4",
  });
  return `wss://api.elevenlabs.io/v1/speech-to-text/realtime?${q}`;
}

export async function createScribeToken({
  apiKey = process.env.ELEVENLABS_API_KEY || "",
  fetchImpl = fetch,
} = {}) {
  if (!apiKey) {
    const err = new Error("ELEVENLABS_API_KEY is not set");
    err.code = "NO_API_KEY";
    throw err;
  }
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "xi-api-key": apiKey, Accept: "application/json" },
  });
  if (!res.ok) {
    const err = new Error(`ElevenLabs token failed (${res.status})`);
    err.code = "TOKEN_FAILED";
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  if (!data?.token) {
    const err = new Error("ElevenLabs token response missing token");
    err.code = "TOKEN_FAILED";
    throw err;
  }
  return { token: data.token, wsUrl: realtimeWsUrl(data.token) };
}
