import { randomUUID } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { events, syntheticSession, transcript } from "../src/api/fixtures/syntheticSession.js";
import { draftFromTranscript } from "./gemini.js";
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

export function findSession(rawId) {
  try {
    return sessions.get(decodeURIComponent(rawId));
  } catch {
    return undefined;
  }
}

export const deleteSession = (id) => sessions.delete(id);

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

function questionList(template) {
  return template.pages.flatMap((page) =>
    page.sections.flatMap((section) => section.questions.map((question) => ({ id: question.id, label: question.label }))),
  );
}

function openQuestions(record) {
  return questionList(getTemplate(record.templateId)).filter(
    (question) => record.answers[question.id]?.status !== "confirmed",
  );
}

// Commits that arrive mid-call share one follow-up over the transcript stored so far.
function enqueueLiveDraft(record, fetchImpl) {
  if (record.drafting) {
    return new Promise((resolve, reject) => {
      record.draftWaiters.push({ resolve, reject });
    });
  }
  return runLiveDraft(record, fetchImpl);
}

async function runLiveDraft(record, fetchImpl) {
  const lines = record.transcript.map((line) => ({ ...line }));
  const seq = lines.length;
  const questions = openQuestions(record);
  record.drafting = true;
  record.draftWaiters ??= [];
  let result;
  try {
    const drafts = await draftFromTranscript(lines, questions, { synthetic: false, fetch: fetchImpl });
    result = { seq, drafts };
  } catch (err) {
    const code = geminiFailure(err);
    if (!code) throw err;
    result = { seq, drafts: [], code };
  } finally {
    const waiters = record.draftWaiters.splice(0);
    if (waiters.length) {
      const follow = runLiveDraft(record, fetchImpl);
      for (const waiter of waiters) follow.then(waiter.resolve, waiter.reject);
    } else {
      record.drafting = null;
    }
  }
  return result;
}

function recordedGeminiBody() {
  return JSON.parse(readFileSync(new URL("./fixtures/gemini-ramble-response.json", import.meta.url), "utf8"));
}

function postedDrafts(record, drafts) {
  const openIds = new Set(openQuestions(record).map((question) => question.id));
  if (!Array.isArray(drafts)) return [];
  return drafts.filter((draft) => draft && openIds.has(draft.fieldId));
}

async function finalPass(record, body, fetchImpl) {
  if (record.transcript.length === 0) return { status: 200, body: { drafts: [] } };
  try {
    const drafts = await draftFromTranscript(record.transcript, openQuestions(record), {
      synthetic: false,
      fetch: fetchImpl,
      final: true,
      contextDrafts: postedDrafts(record, body?.drafts),
    });
    return { status: 200, body: { drafts } };
  } catch (err) {
    const code = geminiFailure(err);
    if (!code) throw err;
    return { status: 200, body: { drafts: [], code } };
  }
}

function geminiFailure(err) {
  if (err?.code === "PHI_REFUSED" || err?.code === "GEMINI_HTTP" || err?.code === "BAD_GEMINI" || err?.code === "NO_GEMINI_KEY") {
    return err.code;
  }
  return null;
}

async function handleDrafts(rawId, body, fetchImpl) {
  let sessionId;
  try {
    sessionId = decodeURIComponent(rawId);
  } catch {
    return notFound();
  }
  const record = sessions.get(sessionId);
  if (!record) return notFound();
  if (record.live && body?.pass === "final") return finalPass(record, body, fetchImpl);
  // shortcut: recorded fixture only; a synthetic:false body is ignored and Gemini is not called.
  const grounded = await draftFromTranscript(record.transcript, questionList(getTemplate(record.templateId)), {
    synthetic: true,
    body: recordedGeminiBody(),
  });
  return { status: 200, body: grounded };
}

async function appendTranscriptLine(rawId, line, fetchImpl) {
  let sessionId;
  try {
    sessionId = decodeURIComponent(rawId);
  } catch {
    return notFound();
  }
  const record = sessions.get(sessionId);
  if (!record) return notFound();
  const entry = {
    t: Number(line?.t) || 0,
    speaker: line?.speaker || "Clinician",
    text: String(line?.text || "").trim(),
  };
  if (!entry.text) {
    return { status: 400, body: { message: "Transcript text is required", code: "BAD_REQUEST" } };
  }
  record.transcript.push(entry);
  if (!record.live) return { status: 200, body: entry };
  const drafted = await enqueueLiveDraft(record, fetchImpl);
  return {
    status: 200,
    body: { ...entry, seq: drafted.seq, drafts: drafted.drafts, ...(drafted.code ? { code: drafted.code } : {}) },
  };
}

export async function handleSession(method, pathname, body, now, fetchImpl) {
  if (method === "POST" && pathname === "/api/sessions") {
    const templateId = body?.templateId;
    const form = getTemplate(templateId);
    if (!form) return notFound();
    const name = typeof body?.therapistName === "string" && body.therapistName.trim()
      ? body.therapistName.trim()
      : syntheticSession.therapist.name;
    const email = typeof body?.therapistEmail === "string" ? body.therapistEmail.trim() : "";
    const live = body?.live === true;
    const record = {
      id: randomUUID(),
      patientLabel: syntheticSession.patientLabel,
      therapist: { name, email },
      plannedMinutes: 45,
      templateId: form.id,
      startedAt: now,
      transcript: live ? [] : transcript.map((line) => ({ ...line })),
      events: live ? [] : servedEvents,
      live,
      answers: {},
    };
    sessions.set(record.id, record);
    return { status: 200, body: publicSession(record) };
  }

  const transcriptMatch = method === "GET" && /^\/api\/sessions\/([^/]+)\/transcript$/.exec(pathname);
  if (transcriptMatch) return sessionPart(transcriptMatch[1], "transcript");
  const eventsMatch = method === "GET" && /^\/api\/sessions\/([^/]+)\/events$/.exec(pathname);
  if (eventsMatch) return sessionPart(eventsMatch[1], "events");
  const draftsMatch = method === "POST" && /^\/api\/sessions\/([^/]+)\/drafts$/.exec(pathname);
  if (draftsMatch) return handleDrafts(draftsMatch[1], body, fetchImpl);
  const lineMatch = method === "POST" && /^\/api\/sessions\/([^/]+)\/transcript-lines$/.exec(pathname);
  if (lineMatch) return appendTranscriptLine(lineMatch[1], body, fetchImpl);
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
