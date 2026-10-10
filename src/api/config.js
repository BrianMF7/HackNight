// Mode switch: "mock" (demo data, in-browser) or "live" (real Node.js backend).
// Persisted in localStorage so the choice survives reloads. Modes never mix.
const MODE_KEY = "clinicolink_api_mode";
const URL_KEY = "clinicolink_backend_url";
const TOKEN_KEY = "clinicolink_backend_token";

export const getMode = () => localStorage.getItem(MODE_KEY) || "mock";
/** @param {string} mode */
export const setMode = (mode) => localStorage.setItem(MODE_KEY, mode);

export const getBackendUrl = () => localStorage.getItem(URL_KEY) || "";
/** @param {string} url */
export const setBackendUrl = (url) => localStorage.setItem(URL_KEY, url.replace(/\/+$/, ""));

export const getBackendToken = () => localStorage.getItem(TOKEN_KEY) || "";
/** @param {string} token */
export const setBackendToken = (token) => localStorage.setItem(TOKEN_KEY, token);