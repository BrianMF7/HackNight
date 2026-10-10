import { timingSafeEqual } from "node:crypto";
import http from "node:http";
import { pathToFileURL } from "node:url";
import {
  appendTranscriptLine,
  createSession,
  getEvents,
  getSession,
  getTranscript,
} from "./session.js";
import { createScribeToken } from "./stt.js";
import { getTemplate, listTemplates } from "./template.js";

const DEFAULT_ORIGIN = "http://localhost:5173";

export function createServer({
  token = process.env.BACKEND_TOKEN || "",
  origin = process.env.CORS_ORIGIN || DEFAULT_ORIGIN,
  elevenLabsKey = process.env.ELEVENLABS_API_KEY || "",
  fetchImpl = fetch,
} = {}) {
  const routes = {
    "GET /api/ping": (_req, res) => json(res, 200, { ok: true }),
    "GET /api/templates": (_req, res) => json(res, 200, listTemplates()),
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
    "POST /api/sessions": async (req, res) => {
      const body = await readJson(req);
      json(res, 200, createSession(body || {}));
    },
  };

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
      Promise.resolve(route(req, res)).catch(() => {
        json(res, 500, { message: "Internal error", code: "INTERNAL" });
      });
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

    const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)(?:\/(transcript|events|transcript-lines))?$/);
    if (sessionMatch) {
      const sessionId = decodeURIComponent(sessionMatch[1]);
      const sub = sessionMatch[2];
      const session = getSession(sessionId);
      if (!session) {
        json(res, 404, { message: "Not found", code: "NOT_FOUND" });
        return;
      }
      if (req.method === "GET" && sub === "transcript") {
        json(res, 200, getTranscript(sessionId));
        return;
      }
      if (req.method === "GET" && sub === "events") {
        json(res, 200, getEvents(sessionId));
        return;
      }
      if (req.method === "POST" && sub === "transcript-lines") {
        Promise.resolve(readJson(req))
          .then((body) => {
            try {
              json(res, 200, appendTranscriptLine(sessionId, body || {}));
            } catch (err) {
              json(res, 400, { message: err.message, code: err.code || "BAD_REQUEST" });
            }
          })
          .catch(() => json(res, 400, { message: "Invalid JSON", code: "BAD_REQUEST" }));
        return;
      }
      if (req.method === "GET" && !sub) {
        json(res, 200, {
          id: session.id,
          patientLabel: session.patientLabel,
          therapist: session.therapist,
          clinician: session.clinician,
          templateId: session.templateId,
          plannedMinutes: session.plannedMinutes,
          startedAt: session.startedAt,
          status: session.status,
        });
        return;
      }
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

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 8787;
  createServer().listen(port, () => {
    process.stdout.write(`clinical server listening on ${port}\n`);
  });
}
