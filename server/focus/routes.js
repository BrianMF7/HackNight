import { findSession } from "../session.js";
import { applyFocusDecision } from "./decision.js";
import { DEPRESSION_CRITERIA } from "./criteria.js";
import { scoreFocus } from "./score.js";
import { suggestBindings } from "./agent.js";

const GAP = 4;

function notFound() {
  return { status: 404, body: { message: "Not found", code: "NOT_FOUND" } };
}

function load(rawId) {
  let id;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    return undefined;
  }
  return findSession(id);
}

function ensure(record) {
  if (!record.focus) {
    record.focus = { seen: 0, decision: null, focuses: [], addon: [], bindings: [] };
  }
  return record.focus;
}

function view(focus, skipped) {
  return {
    seq: focus.seen ?? 0,
    skipped,
    focuses: focus.focuses ?? [],
    decision: focus.decision ?? null,
    addon: focus.addon ?? [],
  };
}

async function runFocus(record, fetchImpl) {
  const lines = record.transcript.map((line) => ({ ...line }));
  try {
    const { bindings } = await suggestBindings(lines, DEPRESSION_CRITERIA, {
      synthetic: false,
      fetch: fetchImpl,
    });
    const scored = scoreFocus(bindings);
    const focus = ensure(record);
    focus.seen = lines.length;
    if (focus.decision === "no") return { status: 200, body: view(focus, false) };
    focus.bindings = bindings;
    focus.focuses = scored ? [scored] : [];
    return { status: 200, body: view(focus, false) };
  } catch (err) {
    const code = err?.code;
    const reported = code === "PHI_REFUSED" || code === "NO_GEMINI_KEY" || code === "GEMINI_HTTP" || code === "BAD_GEMINI";
    if (!reported) throw err;
    const focus = ensure(record);
    // A model attempt spends the line gap. A refusal before fetch keeps reporting its code.
    if (code === "GEMINI_HTTP" || code === "BAD_GEMINI") focus.seen = lines.length;
    return { status: 200, body: { ...view(focus, false), code } };
  }
}

async function postFocus(rawId, fetchImpl) {
  const record = load(rawId);
  if (!record) return notFound();
  const focus = ensure(record);
  const fresh = (record.transcript?.length ?? 0) - focus.seen;
  if (focus.decision || fresh < GAP) return { status: 200, body: view(focus, true) };
  if (record.focusing) return record.focusing;
  const run = runFocus(record, fetchImpl);
  record.focusing = run;
  try {
    return await run;
  } finally {
    if (record.focusing === run) record.focusing = null;
  }
}

function postDecision(rawId, body) {
  const record = load(rawId);
  if (!record) return notFound();
  const focus = ensure(record);
  try {
    record.focus = applyFocusDecision(focus, { focusId: body?.focusId, decision: body?.decision });
    return { status: 200, body: view(record.focus, true) };
  } catch (err) {
    if (err?.code === "BAD_DECISION" || err?.code === "UNKNOWN_FOCUS") {
      return { status: 400, body: { message: err.message, code: err.code } };
    }
    throw err;
  }
}

function getQuotes(rawId) {
  const record = load(rawId);
  if (!record) return notFound();
  const focus = record.focus;
  if (!focus || focus.decision === "no" || !focus.focuses?.length) {
    return { status: 200, body: { quotes: [] } };
  }
  return {
    status: 200,
    body: {
      quotes: (focus.bindings ?? []).map((item) => ({
        criterionId: item.criterionId,
        quote: item.evidence,
        t: item.t,
      })),
    },
  };
}

export async function handleFocus(method, pathname, body, fetchImpl) {
  const decision = method === "POST" && /^\/api\/sessions\/([^/]+)\/focus\/decision$/.exec(pathname);
  if (decision) return postDecision(decision[1], body);
  const quotes = method === "GET" && /^\/api\/sessions\/([^/]+)\/focus\/quotes$/.exec(pathname);
  if (quotes) return getQuotes(quotes[1]);
  const focus = method === "POST" && /^\/api\/sessions\/([^/]+)\/focus$/.exec(pathname);
  if (focus) return postFocus(focus[1], fetchImpl);
  return null;
}
