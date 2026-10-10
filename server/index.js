import { timingSafeEqual } from "node:crypto";
import http from "node:http";
import { pathToFileURL } from "node:url";
import { getTemplate, listTemplates } from "./template.js";

const DEFAULT_ORIGIN = "http://localhost:5173";

const routes = {
  "GET /api/ping": (_req, res) => json(res, 200, { ok: true }),
  "GET /api/templates": (_req, res) => json(res, 200, listTemplates()),
};

export function createServer({
  token = process.env.BACKEND_TOKEN || "",
  origin = process.env.CORS_ORIGIN || DEFAULT_ORIGIN,
} = {}) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : "";
    if (requestOrigin === origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
    }
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (req.method === "OPTIONS") {
      res.writeHead(requestOrigin === origin ? 204 : 403);
      res.end();
      return;
    }

    if (!authorized(req.headers.authorization, token)) {
      json(res, 401, {
        message: "Not signed in to the backend. Check your access token.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    const route = routes[`${req.method} ${url.pathname}`];
    if (route) {
      route(req, res);
      return;
    }

    const templateMatch = req.method === "GET" && url.pathname.match(/^\/api\/templates\/([^/]+)$/);
    if (templateMatch) {
      let template = null;
      try {
        template = getTemplate(decodeURIComponent(templateMatch[1]));
      } catch {
        template = null;
      }
      if (!template) {
        json(res, 404, { message: "Not found", code: "NOT_FOUND" });
        return;
      }
      json(res, 200, template);
      return;
    }

    json(res, 404, { message: "Not found", code: "NOT_FOUND" });
  });
}

function authorized(header, token) {
  if (!token || typeof header !== "string" || !header.startsWith("Bearer ")) return false;
  const got = header.slice("Bearer ".length);
  const a = Buffer.from(got);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 8787;
  createServer().listen(port, () => {
    process.stdout.write(`clinical server listening on ${port}\n`);
  });
}
