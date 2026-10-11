import assert from "node:assert/strict";
import test from "node:test";
import { PRODUCTION_BACKEND_URL, backendTokenFromEnv, backendUrlFromEnv, defaultApiMode, resolveBackendUrl } from "./config.js";

test("a production build with no URL uses the Render service", () => {
  assert.equal(backendUrlFromEnv(undefined, true), PRODUCTION_BACKEND_URL);
  assert.equal(backendUrlFromEnv("", true), "https://hacknight-5os5.onrender.com");
});

test("a production build ignores a loopback URL from the local .env", () => {
  assert.equal(backendUrlFromEnv("http://localhost:8787/", true), PRODUCTION_BACKEND_URL);
  assert.equal(backendUrlFromEnv("http://127.0.0.1:8787", true), PRODUCTION_BACKEND_URL);
});

test("dev keeps the local server, and an explicit https URL wins in production", () => {
  assert.equal(backendUrlFromEnv("http://localhost:8787", false), "http://localhost:8787");
  assert.equal(backendUrlFromEnv(undefined, false), "http://localhost:8787");
  assert.equal(backendUrlFromEnv("https://hacknight-5os5.onrender.com/", true), PRODUCTION_BACKEND_URL);
});

test("production visitors use the Render server even if the browser saved localhost", () => {
  assert.equal(resolveBackendUrl("http://localhost:8787", undefined, true), PRODUCTION_BACKEND_URL);
  assert.equal(resolveBackendUrl(null, undefined, true), PRODUCTION_BACKEND_URL);
  assert.equal(defaultApiMode(null, true), "live");
  assert.equal(defaultApiMode("mock", true), "mock");
  assert.equal(defaultApiMode(null, false), "mock");
});

test("a production build uses the demo token unless the host sets one", () => {
  assert.equal(backendTokenFromEnv(undefined, true), "hacknight-demo");
  assert.equal(backendTokenFromEnv("other-token", true), "other-token");
  assert.equal(backendTokenFromEnv(undefined, false), "");
});
