// LIVE MODE ONLY. Real HTTP calls to the Node.js backend.
// No validation, timing rules, PDF or email logic here: the backend is authoritative.
// Errors from the backend are passed through to the UI untouched.
import ApiError from "./ApiError";
import { endpoints } from "./endpoints";
import { getBackendUrl, getBackendToken } from "./config";

/**
 * @typedef {{ method: string, path: string } | null} Endpoint
 * @typedef {Record<string, string | undefined>} Params
 * @typedef {Record<string, string>} Query
 * @typedef {{ params?: Params, body?: unknown, query?: Query, raw?: boolean }} RequestOptions
 * @typedef {Record<string, string | undefined>} AdapterCall
 * @typedef {{ message?: string, error?: string, code?: string, fieldErrors?: Record<string, string>, errors?: Record<string, string> }} ErrorBody
 */

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
async function request(name, { params, body, query, raw } = {}) {
  const ep = /** @type {Record<string, Endpoint>} */ (endpoints)[name];
  if (!ep) {
    throw new ApiError(`The "${name}" endpoint is not configured yet.`, { code: "NOT_CONFIGURED" });
  }
  const base = getBackendUrl();
  if (!base) {
    throw new ApiError("No backend URL set. Add it in Connection settings.", { code: "NO_BASE_URL" });
  }
  const qs = query ? `?${new URLSearchParams(query)}` : "";
  /** @type {Record<string, string>} */
  const headers = { Accept: raw ? "*/*" : "application/json" };
  const token = getBackendToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${base}${fill(ep.path, params)}${qs}`, {
      method: ep.method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the backend. Check the URL, your network, or CORS settings.", { code: "NETWORK" });
  }

  if (!res.ok) {
    /** @type {ErrorBody} */
    let data = {};
    try { data = await res.json(); } catch { /* non-JSON error body */ }
    const fallback = {
      401: "Not signed in to the backend. Check your access token.",
      403: "You do not have permission to do that.",
      404: "The backend could not find that record.",
      422: "The backend rejected the submitted information.",
      500: "The backend ran into an error. Please try again.",
    }[res.status] || `Request failed (${res.status}).`;
    throw new ApiError(data.message || data.error || fallback, {
      status: res.status,
      code: data.code || "HTTP_ERROR",
      fieldErrors: data.fieldErrors || data.errors || {},
    });
  }
  if (raw) return res.blob();
  if (res.status === 204) return null;
  return res.json();
}

export const liveAdapter = {
  ping: () => request("ping"),
  listPatients: () => request("listPatients"),
  createPatient: (/** @type {AdapterCall} */ payload) => request("createPatient", { body: payload }),
  listSessions: () => request("listSessions"),
  createSession: (/** @type {AdapterCall} */ payload) => request("createSession", { body: payload }),
  listReports: () => request("listReports"),
  generateReport: (/** @type {AdapterCall} */ { sessionId }) => request("generateReport", { params: { sessionId }, body: { sessionId } }),
  downloadReport: (/** @type {AdapterCall} */ { reportId }) => request("downloadReport", { params: { reportId }, raw: true }),
  emailReport: (/** @type {AdapterCall} */ { reportId, to }) => request("emailReport", { params: { reportId }, body: { to } }),
};