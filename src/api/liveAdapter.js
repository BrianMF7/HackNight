// LIVE MODE ONLY. Real HTTP calls to the Node.js backend.
// No validation, timing rules, PDF or email logic here: the backend is authoritative.
// Errors from the backend are passed through to the UI untouched.
import ApiError from "./ApiError";
import { endpoints } from "./endpoints";
import { getBackendUrl, getBackendToken } from "./config";

const fill = (path, params = {}) =>
  path.replace(/:(\w+)/g, (_, k) => encodeURIComponent(params[k] ?? ""));

async function request(name, { params, body, query, raw } = {}) {
  const ep = endpoints[name];
  if (!ep) {
    throw new ApiError(`The "${name}" endpoint is not configured yet.`, { code: "NOT_CONFIGURED" });
  }
  const base = getBackendUrl();
  if (!base) {
    throw new ApiError("No backend URL set. Add it in Connection settings.", { code: "NO_BASE_URL" });
  }
  const qs = query ? `?${new URLSearchParams(query)}` : "";
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
  createPatient: (payload) => request("createPatient", { body: payload }),
  listSessions: () => request("listSessions"),
  createSession: (payload) => request("createSession", { body: payload }),
  listReports: () => request("listReports"),
  generateReport: ({ sessionId }) => request("generateReport", { params: { sessionId }, body: { sessionId } }),
  downloadReport: ({ reportId }) => request("downloadReport", { params: { reportId }, raw: true }),
  emailReport: ({ reportId, to }) => request("emailReport", { params: { reportId }, body: { to } }),
};