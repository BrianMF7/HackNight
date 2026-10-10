import { findSession } from "./session.js";
import { getTemplate } from "./template.js";

// Task 7's handoff gate reads record.answers, never the client's list of confirmed ids.
const STATUS = { confirm: "confirmed", edit_confirm: "confirmed", edit: "draft" };

function fail(status, code, message) {
  return { status, body: { message, code } };
}

export function recordClinicianAction(record, { fieldId, action, answer }, template, now) {
  const question = template.pages
    .flatMap((page) => page.sections.flatMap((section) => section.questions))
    .find((q) => q.id === fieldId);
  if (!question) return fail(422, "UNKNOWN_FIELD", "That question is not on this form.");
  if (action === "waive" && question.safety) {
    return fail(422, "SAFETY_NOT_WAIVABLE", "Safety questions cannot be waived. Ask the question and confirm the answer.");
  }
  if (!Object.hasOwn(STATUS, action)) return fail(422, "INVALID_ACTION", "That clinician action is not supported.");
  if (typeof answer !== "string") return fail(422, "INVALID_ANSWER", "The answer must be text.");
  record.answers[fieldId] = { status: STATUS[action], answer, action, at: now };
  return { status: 200, body: { ok: true } };
}

export function handleActions(method, pathname, body, now) {
  const match = method === "POST" && /^\/api\/sessions\/([^/]+)\/actions$/.exec(pathname);
  if (!match) return null;
  const record = findSession(match[1]);
  if (!record) return fail(404, "NOT_FOUND", "Not found");
  return recordClinicianAction(record, body ?? {}, getTemplate(record.templateId), now);
}
