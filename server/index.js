import { handleDiagnostic } from "./diagnostic.js";
import { timingSafeEqual } from "node:crypto";
import http from "node:http";
import { pathToFileURL } from "node:url";
import { handleActions } from "./actions.js";
import { createSql, pingDatabase } from "./db.js";
import { handleDisconnect } from "./disconnect.js";
import { handleFocus } from "./focus/routes.js";
import { handleHandoff } from "./handoff.js";
import { findSession, handleSession } from "./session.js";
import { renderIntakePdf } from "./pdf.js";
import { createScribeToken } from "./stt.js";
import { getTemplate, listTemplates } from "./template.js";
import { handleCall } from "./video.js";

const DEFAULT_ORIGIN = "http://localhost:5173";
const PRODUCTION_WEB_ORIGIN = "https://hack-night.vercel.app";

/** @param {string | string[]} origin */
export function parseCorsOrigins(origin) {
  const raw = Array.isArray(origin) ? origin.join(",") : origin || DEFAULT_ORIGIN;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.includes(PRODUCTION_WEB_ORIGIN)) list.push(PRODUCTION_WEB_ORIGIN);
  return list;
}

export function createServer({
  token = process.env.BACKEND_TOKEN || "",
  origin = process.env.CORS_ORIGIN || DEFAULT_ORIGIN,
  elevenLabsKey = process.env.ELEVENLABS_API_KEY || "",
  dailyKey = process.env.DAILY_API_KEY || "",
  fetchImpl = fetch,
  handoffMailer = null,
  sql = createSql(),
} = {}) {
  const origins = parseCorsOrigins(origin);
  const routes = {
    "GET /api/ping": (_req, res) => json(res, 200, { ok: true }),
    "GET /api/templates": (_req, res) => json(res, 200, listTemplates()),
    "GET /api/db/ping": async (_req, res) => {
      try {
        const body = await pingDatabase(sql);
        json(res, 200, body);
      } catch (err) {
        if (err.code === "NO_DATABASE") {
          json(res, 503, {
            message: "Tiger/Postgres is not configured. Set DATABASE_URL on the server.",
            code: "NO_DATABASE",
          });
          return;
        }
        json(res, 502, {
          message: err.message || "Database ping failed.",
          code: "DB_UNAVAILABLE",
        });
      }
    },
    "POST /api/stt/token": async (_req, res) => {
      try {
        const out = await createScribeToken({ apiKey: elevenLabsKey, fetchImpl });
        json(res, 200, out);
      } catch (err) {
        if (err.code === "NO_API_KEY") {
          json(res, 503, {
            message: "ElevenLabs is not configured. Set ELEVENLABS_API_KEY on the server.",
            code: "NO_API_KEY",
          });
          return;
        }
        json(res, 502, {
          message: err.message || "Could not mint a speech-to-text token.",
          code: err.code || "TOKEN_FAILED",
        });
      }
    },
  };

  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : "";
    const allowed = origins.includes(requestOrigin);
    if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
    }
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (req.method === "OPTIONS") {
      res.writeHead(allowed ? 204 : 403);
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

    let body;
    if (req.method === "POST") {
      try {
        body = await readJson(req);
      } catch {
        json(res, 400, { message: "Invalid JSON", code: "BAD_REQUEST" });
        return;
      }
    }

    const pdfMatch = req.method === "GET" && /^\/api\/sessions\/([^/]+)\/pdf$/.exec(url.pathname);
    if (pdfMatch) {
      const record = findSession(pdfMatch[1]);
      if (!record) {
        json(res, 404, { message: "Not found", code: "NOT_FOUND" });
        return;
      }
      try {
        const bytes = await renderIntakePdf(record, { includeDrafts: true });
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=\"intake-summary.pdf\"",
        });
        res.end(bytes);
      } catch {
        json(res, 500, { message: "Could not export the PDF", code: "PDF_FAILED" });
      }
      return;
    }

    const now = Date.now();
    let sessionResponse;
    try {
      sessionResponse = await handleSession(req.method, url.pathname, body, now, fetchImpl);
    } catch {
      json(res, 500, { message: "Internal error", code: "INTERNAL" });
      return;
    }
    if (sessionResponse) {
      json(res, sessionResponse.status, sessionResponse.body);
      return;
    }

    const focusResponse = await handleFocus(req.method, url.pathname, body, fetchImpl);
    if (focusResponse) {
      json(res, focusResponse.status, focusResponse.body);
      return;
    }

    const diagnosticResponse = handleDiagnostic(req.method, url.pathname, body);
    if (diagnosticResponse) { json(res, diagnosticResponse.status, diagnosticResponse.body); return; }

    const handoffResponse = await handleHandoff(req.method, url.pathname, body, Date.now(), { mailer: handoffMailer, sql });
    if (handoffResponse) {
      json(res, handoffResponse.status, handoffResponse.body);
      return;
    }

    const actionResponse = handleActions(req.method, url.pathname, body, now);
    if (actionResponse) {
      json(res, actionResponse.status, actionResponse.body);
      return;
    }

    const disconnectResponse = handleDisconnect(req.method, url.pathname);
    if (disconnectResponse) {
      json(res, disconnectResponse.status, disconnectResponse.body);
      return;
    }

    const callResponse = await handleCall(req.method, url.pathname, now, { apiKey: dailyKey, fetchImpl });
    if (callResponse) {
      json(res, callResponse.status, callResponse.body);
      return;
    }

    const route = routes[`${req.method} ${url.pathname}`];
    if (route) {
      try {
        await route(req, res);
      } catch {
        json(res, 500, { message: "Internal error", code: "INTERNAL" });
      }
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

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 8787;
  // Render's proxy cannot reach a localhost-only bind.
  createServer().listen(port, "0.0.0.0", () => {
    process.stdout.write(`clinical server listening on 0.0.0.0:${port}\n`);
  });
}
