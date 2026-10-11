// Mode switch: "mock" (demo data, in-browser) or "live" (real Node.js backend).
// Persisted in localStorage so the choice survives reloads. Modes never mix.
const MODE_KEY = "clinicolink_api_mode";
const URL_KEY = "clinicolink_backend_url";
const TOKEN_KEY = "clinicolink_backend_token";

/** Local demo defaults from Vite env (must match server BACKEND_TOKEN / PORT). */
export const localDemoUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  "http://localhost:8787";
export const localDemoToken =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_TOKEN) ||
  "";

export const getMode = () => localStorage.getItem(MODE_KEY) || "mock";
/** @param {string} mode */
export const setMode = (mode) => localStorage.setItem(MODE_KEY, mode);

export const getBackendUrl = () => localStorage.getItem(URL_KEY) || localDemoUrl;
/** @param {string} url */
export const setBackendUrl = (url) => localStorage.setItem(URL_KEY, String(url || "").trim().replace(/\/+$/, ""));

export const getBackendToken = () => localStorage.getItem(TOKEN_KEY) ?? localDemoToken;
/** @param {string} token */
export const setBackendToken = (token) => localStorage.setItem(TOKEN_KEY, String(token || "").trim());

/** Fill Connection settings with the local clinical server values from .env. */
export const applyLocalDemoConnection = () => {
  setBackendUrl(localDemoUrl);
  setBackendToken(localDemoToken);
};