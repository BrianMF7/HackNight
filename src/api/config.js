// Mode switch: "mock" (demo data, in-browser) or "live" (real Node.js backend).
// Persisted in localStorage so the choice survives reloads. Modes never mix.
const MODE_KEY = "clinicolink_api_mode";
const URL_KEY = "clinicolink_backend_url";
const TOKEN_KEY = "clinicolink_backend_token";

/** Deployed clinical server. Used when a production build has no VITE_BACKEND_URL. */
export const PRODUCTION_BACKEND_URL = "https://hacknight-5os5.onrender.com";

/**
 * @param {string | undefined} envUrl
 * @param {boolean} prod
 */
export function backendUrlFromEnv(envUrl, prod) {
  const fromEnv = String(envUrl || "").trim().replace(/\/+$/, "");
  // A laptop .env must not bake localhost into the bundle that real users load.
  if (fromEnv && !(prod && isLoopbackUrl(fromEnv))) return fromEnv;
  return prod ? PRODUCTION_BACKEND_URL : "http://localhost:8787";
}

/** @param {string} url */
function isLoopbackUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * Same public demo token as `.env.example` and the Render service.
 * A build can override it with VITE_BACKEND_TOKEN.
 * @param {string | undefined} envToken
 * @param {boolean} prod
 */
export function backendTokenFromEnv(envToken, prod) {
  if (typeof envToken === "string" && envToken.length > 0) return envToken;
  return prod ? "hacknight-demo" : "";
}

// Direct `import.meta.env.VITE_*` access so Vite includes these in the client bundle.
const hasViteEnv = typeof import.meta !== "undefined" && import.meta.env;
const envUrl = hasViteEnv ? import.meta.env.VITE_BACKEND_URL : undefined;
const envToken = hasViteEnv ? import.meta.env.VITE_BACKEND_TOKEN : undefined;
const prodBuild = hasViteEnv ? Boolean(import.meta.env.PROD) : false;

/** Defaults for Connection settings. Local `.env` wins; a clean production build uses Render. */
export const localDemoUrl = backendUrlFromEnv(envUrl, prodBuild);
export const localDemoToken = backendTokenFromEnv(envToken, prodBuild);

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