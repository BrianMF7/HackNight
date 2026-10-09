// LIVE MODE ONLY. Calls the real Node.js backend for intake sessions.
// Every route comes from workspaceEndpoints; unset routes are refused, never guessed.
// The backend is authoritative for required-field, safety, recipient and 45-minute rules.
import ApiError from "./ApiError";
import { getBackendUrl, getBackendToken } from "./config";

// TODO: fill from the backend team's documented contract.
export const workspaceEndpoints = {
  getTemplates: null,
  getTemplate: null,
  createSession: null,
  getTranscript: null,
  getEvents: null, // or a stream/poll route that returns answer updates
  recordClinicianAction: null,
  retainDraft: null,
  discardDraft: null,
  requestHandoff: null,
  playQuestion: null, // backend-owned ElevenLabs prompt audio
};

const fill = (path, params = {}) => path.replace(/:(\w+)/g, (_, k) => encodeURIComponent(params[k] ?? ""));

async function request(name, { params, body } = {}) {
  const ep = workspaceEndpoints[name];
  if (!ep) throw new ApiError(`The "${name}" endpoint is not configured yet.`, { code: "NOT_CONFIGURED" });
  const base = getBackendUrl();
  if (!base) throw new ApiError("No backend URL set. Add it in Connection settings.", { code: "NO_BASE_URL" });
  const headers = { Accept: "application/json" };
  const token = getBackendToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  let res;
  try {
    res = await fetch(`${base}${fill(ep.path, params)}`, { method: ep.method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError("Cannot reach the backend. Check the URL, your network, or CORS settings.", { code: "NETWORK" });
  }
  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch { /* non-JSON */ }
    throw new ApiError(data.message || data.error || `Request failed (${res.status}).`, { status: res.status, code: data.code || "HTTP_ERROR" });
  }
  return res.status === 204 ? null : res.json();
}

export const liveWorkspace = {
  getTemplates: () => request("getTemplates"),
  getTemplate: ({ templateId }) => request("getTemplate", { params: { templateId } }),
  createSession: (p) => request("createSession", { body: p }),
  getTranscript: ({ sessionId }) => request("getTranscript", { params: { sessionId } }),
  getEvents: ({ sessionId }) => request("getEvents", { params: { sessionId } }),
  recordClinicianAction: (p) => request("recordClinicianAction", { params: { sessionId: p.sessionId }, body: p }),
  retainDraft: ({ sessionId }) => request("retainDraft", { params: { sessionId } }),
  discardDraft: ({ sessionId }) => request("discardDraft", { params: { sessionId } }),
  requestHandoff: (p) => request("requestHandoff", { params: { sessionId: p.sessionId }, body: p }),
  playQuestion: ({ sessionId, fieldId }) => request("playQuestion", { params: { sessionId }, body: { fieldId } }),
};