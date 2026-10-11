/** Daily video rooms for live sessions. The API key stays on the server. */
import { findSession } from "./session.js";

const DAILY_API = "https://api.daily.co/v1";
const ROOM_SECONDS = 2 * 60 * 60;

async function dailyPost(path, body, apiKey, fetchImpl) {
  const res = await fetchImpl(`${DAILY_API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Daily ${path} failed (${res.status})`);
  return res.json();
}

async function createCall(apiKey, fetchImpl, now) {
  const exp = Math.floor(now / 1000) + ROOM_SECONDS;
  const room = await dailyPost(
    "/rooms",
    { privacy: "private", properties: { exp, enable_chat: true, enable_knocking: true, enable_prejoin_ui: true } },
    apiKey,
    fetchImpl,
  );
  const { token } = await dailyPost(
    "/meeting-tokens",
    { properties: { room_name: room.name, is_owner: true, exp } },
    apiKey,
    fetchImpl,
  );
  return { roomUrl: room.url, token };
}

export async function handleCall(method, pathname, now, { apiKey, fetchImpl }) {
  const match = method === "POST" && /^\/api\/sessions\/([^/]+)\/call$/.exec(pathname);
  if (!match) return null;
  const record = findSession(match[1]);
  if (!record) return { status: 404, body: { message: "Not found", code: "NOT_FOUND" } };
  if (!record.live) {
    return { status: 422, body: { message: "Video calls are only for live sessions.", code: "NOT_LIVE" } };
  }
  if (!apiKey) {
    return {
      status: 503,
      body: { message: "Daily is not configured. Set DAILY_API_KEY on the server.", code: "NO_VIDEO_KEY" },
    };
  }
  // Concurrent requests share one pending room; a failure clears it so a retry can create one.
  record.call ??= createCall(apiKey, fetchImpl, now).catch((err) => {
    record.call = null;
    throw err;
  });
  try {
    return { status: 200, body: await record.call };
  } catch {
    return { status: 502, body: { message: "Could not create the video room.", code: "VIDEO_FAILED" } };
  }
}
