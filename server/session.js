import { randomUUID } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { events, syntheticSession, transcript } from "../src/api/fixtures/syntheticSession.js";
import { applyDrafts } from "./ground.js";
import { getTemplate } from "./template.js";

const FIXTURE_DIR = fileURLToPath(new URL("../src/api/fixtures/", import.meta.url));
const sessions = new Map();

function questionIds(template) {
  return new Set(
    template.pages.flatMap((page) =>
      page.sections.flatMap((section) => section.questions.map((question) => question.id)),
    ),
  );
}

const adult = getTemplate(syntheticSession.templateId);
const servedEvents = applyDrafts(events, transcript, questionIds(adult));
if (servedEvents.length !== events.length) throw new Error("synthetic fixture events failed ground");

function outside() {
  const err = new Error("path outside synthetic fixture dir");
  err.code = "PATH_OUTSIDE";
  return err;
}

function inside(root, target) {
  const rel = path.relative(root, target);
  return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

export function load(relativePath) {
  if (typeof relativePath !== "string" || relativePath.includes("\0")) throw outside();
  const root = realpathSync(FIXTURE_DIR);
  const target = path.resolve(root, relativePath);
  if (!inside(root, target)) throw outside();
  const real = realpathSync(target);
  if (!inside(root, real)) throw outside();
  return readFileSync(real, "utf8");
}

function notFound() {
  return { status: 404, body: { message: "Not found", code: "NOT_FOUND" } };
}

function publicSession(record) {
  return {
    id: record.id,
    patientLabel: record.patientLabel,
    therapist: record.therapist,
    plannedMinutes: record.plannedMinutes,
    templateId: record.templateId,
    startedAt: record.startedAt,
  };
}

export function handleSession(method, pathname, body, now) {
  if (method === "POST" && pathname === "/api/sessions") {
    const templateId = body?.templateId;
    const form = getTemplate(templateId);
    if (!form) return notFound();
    const name = typeof body?.therapistName === "string" && body.therapistName.trim()
      ? body.therapistName.trim()
      : syntheticSession.therapist.name;
    const email = typeof body?.therapistEmail === "string" ? body.therapistEmail.trim() : "";
    const record = {
      id: randomUUID(),
      patientLabel: syntheticSession.patientLabel,
      therapist: { name, email },
      plannedMinutes: 45,
      templateId: form.id,
      startedAt: now,
      transcript,
      events: servedEvents,
    };
    sessions.set(record.id, record);
    return { status: 200, body: publicSession(record) };
  }

  const transcriptMatch = method === "GET" && /^\/api\/sessions\/([^/]+)\/transcript$/.exec(pathname);
  if (transcriptMatch) return sessionPart(transcriptMatch[1], "transcript");
  const eventsMatch = method === "GET" && /^\/api\/sessions\/([^/]+)\/events$/.exec(pathname);
  if (eventsMatch) return sessionPart(eventsMatch[1], "events");
  return null;
}

function sessionPart(rawId, key) {
  let sessionId;
  try {
    sessionId = decodeURIComponent(rawId);
  } catch {
    return notFound();
  }
  const record = sessions.get(sessionId);
  if (!record) return notFound();
  return { status: 200, body: record[key] };
}
