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
  recordClinicianAction: { method: "POST", path: "/api/sessions/:sessionId/actions" },
  retainDraft: { method: "POST", path: "/api/sessions/:sessionId/retain" },
  discardDraft: { method: "POST", path: "/api/sessions/:sessionId/discard" },
  requestHandoff: null,
  playQuestion: null, // backend-owned ElevenLabs prompt audio
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
  createSession: (/** @type {WorkspaceCall} */ payload) => request("createSession", { body: payload }),
  getTranscript: (/** @type {WorkspaceCall} */ { sessionId }) => request("getTranscript", { params: { sessionId } }),
  getEvents: (/** @type {WorkspaceCall} */ { sessionId }) => request("getEvents", { params: { sessionId } }),
  recordClinicianAction: (/** @type {WorkspaceCall} */ payload) => request("recordClinicianAction", { params: { sessionId: payload.sessionId }, body: payload }),
  retainDraft: (/** @type {WorkspaceCall} */ { sessionId }) => request("retainDraft", { params: { sessionId } }),
  discardDraft: (/** @type {WorkspaceCall} */ { sessionId }) => request("discardDraft", { params: { sessionId } }),
  requestHandoff: (/** @type {WorkspaceCall} */ payload) => request("requestHandoff", { params: { sessionId: payload.sessionId }, body: payload }),
  playQuestion: (/** @type {WorkspaceCall} */ { sessionId, fieldId }) => request("playQuestion", { params: { sessionId }, body: { fieldId } }),
};