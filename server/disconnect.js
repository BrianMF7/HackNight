import { deleteSession, findSession } from "./session.js";

export function handleDisconnect(method, pathname) {
  const match = method === "POST" && /^\/api\/sessions\/([^/]+)\/(retain|discard)$/.exec(pathname);
  if (!match) return null;
  const record = findSession(match[1]);
  if (!record) return { status: 404, body: { message: "Not found", code: "NOT_FOUND" } };
  if (match[2] === "discard") {
    deleteSession(record.id);
    return { status: 200, body: { ok: true } };
  }
  // Never write record.sent here: a keep after a real send must not reset the duplicate-send guard.
  record.status = "draft_retained";
  return { status: 200, body: { ok: true, status: "draft_retained", sent: false } };
}
