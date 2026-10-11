import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const BASE44_API = "https://base44.app";

function onLocalDev() {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

const local = onLocalDev();

export const base44 = createClient({
  appId,
  token: token ?? undefined,
  functionsVersion,
  // Local Vite proxies /api to Base44. The Vercel site has no proxy, so call the API host.
  serverUrl: local ? "" : BASE44_API,
  // https://app.base44.com is the builder. Sign-in from a Vercel URL must start on the API host.
  appBaseUrl: local ? (appBaseUrl || "") : BASE44_API,
});
