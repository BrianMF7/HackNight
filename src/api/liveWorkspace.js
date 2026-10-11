// LIVE MODE ONLY. Calls the real Node.js backend for intake sessions.
// Every route comes from workspaceEndpoints; unset routes are refused, never guessed.
// The backend is authoritative for required-field, safety, recipient and 45-minute rules.
import ApiError from "./ApiError.js";
import { getBackendUrl, getBackendToken } from "./config.js";

/**
 * @typedef {{ method: string, path: string } | null} Endpoint
 * @typedef {Record<string, string | undefined>} Params
 * @typedef {{ params?: Params, body?: unknown }} RequestOptions
 * @typedef {Record<string, string | undefined>} WorkspaceCall
 * @typedef {{ templateId: string, therapistName?: string, therapistEmail?: string, live?: boolean }} CreateSessionInput
 * @typedef {{ sessionId: string, t?: number, speaker?: string, text?: string }} TranscriptInput
 * @typedef {{ sessionId: string, pass?: string, drafts?: ReadonlyArray<{ fieldId?: string, status?: string, answer?: string, evidence?: string, t?: number }> }} DraftsInput
 * @typedef {{ sessionId: string, fieldId: string, action: string, answer: string }} ActionInput
 * @typedef {{ sessionId: string }} SessionRef
 * @typedef {{ sessionId: string, confirmedIds: string[], recipientEmail?: string, elapsedSeconds: number, plannedMinutes: number }} HandoffInput
 * @typedef {{ sessionId: string, fieldId?: string }} PlayInput
 * @typedef {{ message?: string, error?: string, code?: string }} ErrorBody
 */

// Unset routes stay null until the task that implements that handler.
/** @type {Record<string, Endpoint>} */
export const workspaceEndpoints = {
  getTemplates: { method: "GET", path: "/api/templates" },
  getTemplate: { method: "GET", path: "/api/templates/:templateId" },
  createSession: { method: "POST", path: "/api/sessions" },
  getTranscript: { method: "GET", path: "/api/sessions/:sessionId/transcript" },
  getEvents: { method: "GET", path: "/api/sessions/:sessionId/events" },
  appendTranscriptLine: { method: "POST", path: "/api/sessions/:sessionId/transcript-lines" },
  getSttToken: { method: "POST", path: "/api/stt/token" },
  drafts: { method: "POST", path: "/api/sessions/:sessionId/drafts" },
  recordClinicianAction: { method: "POST", path: "/api/sessions/:sessionId/actions" },
  retainDraft: { method: "POST", path: "/api/sessions/:sessionId/retain" },
  discardDraft: { method: "POST", path: "/api/sessions/:sessionId/discard" },
  requestHandoff: { method: "POST", path: "/api/sessions/:sessionId/handoff" },
  startCall: { method: "POST", path: "/api/sessions/:sessionId/call" },
  playQuestion: null,
};

/**
 * @param {string} path
 * @param {Params} [params]
 */
const fill = (path, params = {}) =>
  path.replace(/:(\w+)/g, (/** @type {string} */ _match, /** @type {string} */ key) => encodeURIComponent(params[key] ?? ""));

/**
 * @param {string} name
 * @param {RequestOptions} [options]
 */
async function request(name, { params, body } = {}) {
  const ep = workspaceEndpoints[name];
  if (!ep) throw new ApiError(`The "${name}" endpoint is not configured yet.`, { code: "NOT_CONFIGURED" });
  const base = getBackendUrl();
  if (!base) throw new ApiError("No backend URL set. Add it in Connection settings.", { code: "NO_BASE_URL" });
  /** @type {Record<string, string>} */
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
    /** @type {ErrorBody} */
    let data = {};
    try { data = await res.json(); } catch { /* non-JSON */ }
    throw new ApiError(data.message || data.error || `Request failed (${res.status}).`, { status: res.status, code: data.code || "HTTP_ERROR" });
  }
  return res.status === 204 ? null : res.json();
}

export const liveWorkspace = {
  getTemplates: () => request("getTemplates"),
  getTemplate: (/** @type {WorkspaceCall} */ { templateId }) => request("getTemplate", { params: { templateId } }),
  createSession: (/** @type {CreateSessionInput} */ payload) => request("createSession", { body: payload }),
  getTranscript: (/** @type {SessionRef} */ { sessionId }) => request("getTranscript", { params: { sessionId } }),
  getEvents: (/** @type {SessionRef} */ { sessionId }) => request("getEvents", { params: { sessionId } }),
  appendTranscriptLine: (/** @type {TranscriptInput} */ { sessionId, t, speaker, text }) =>
    request("appendTranscriptLine", { params: { sessionId }, body: { t, speaker, text } }),
  getSttToken: () => request("getSttToken"),
  drafts: (/** @type {DraftsInput} */ payload) => request("drafts", { params: { sessionId: payload.sessionId }, body: payload }),
  recordClinicianAction: (/** @type {ActionInput} */ payload) => request("recordClinicianAction", { params: { sessionId: payload.sessionId }, body: payload }),
  retainDraft: (/** @type {SessionRef} */ { sessionId }) => request("retainDraft", { params: { sessionId } }),
  discardDraft: (/** @type {SessionRef} */ { sessionId }) => request("discardDraft", { params: { sessionId } }),
  requestHandoff: (/** @type {HandoffInput} */ payload) => request("requestHandoff", { params: { sessionId: payload.sessionId }, body: payload }),
  startCall: (/** @type {SessionRef} */ { sessionId }) => request("startCall", { params: { sessionId } }),
  playQuestion: (/** @type {PlayInput} */ { sessionId, fieldId }) => request("playQuestion", { params: { sessionId }, body: { fieldId } }),
};
