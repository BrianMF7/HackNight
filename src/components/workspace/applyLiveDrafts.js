/**
 * @typedef {import("../../api/templates/adultIntake").AnswerStatus} AnswerStatus
 * @typedef {{
 *   status: AnswerStatus,
 *   answer?: string,
 *   evidence?: string,
 *   category?: string,
 *   clinicianEdited?: boolean,
 *   fieldId?: string,
 *   t?: number,
 *   at?: number,
 *   prompt?: boolean,
 *   action?: string,
 * }} FieldState
 * @typedef {FieldState & { at: number, fieldId: string }} PlaybackEvent
 * @typedef {{
 *   fieldId: string,
 *   status: AnswerStatus,
 *   answer?: string,
 *   evidence?: string,
 *   t?: number,
 *   category?: string,
 *   prompt?: boolean,
 *   clinicianEdited?: boolean,
 * }} Draft
 * @typedef {{
 *   seq?: number,
 *   code?: string,
 *   ok?: boolean,
 *   demo?: boolean,
 *   drafts?: Draft[],
 * }} DraftResponse
 * @typedef {Record<string, FieldState>} AnswerMap
 * @typedef {{ call: false } | { call: true, body: { pass: "final", drafts: Array<FieldState & { fieldId: string }> } }} FinalPassPlan
 */

const FORM_STATUS = new Set(["partial", "draft", "clarify"]);

// The model uses statuses the form does not render. Only a clinician confirm is confirmed.
/** @param {Draft} draft */
function formDraft(draft) {
  if (FORM_STATUS.has(draft.status)) return draft;
  return { ...draft, status: "draft" };
}

// Writes commit-response drafts into the answer map. A lower seq is an older
// Gemini pass and must not replace a newer one. Confirmed answers stay put.
/**
 * @param {AnswerMap} answers
 * @param {DraftResponse | null | undefined} response
 * @param {number} lastSeq
 * @returns {{ answers: AnswerMap, lastSeq: number }}
 */
export function applyLiveDrafts(answers, response, lastSeq) {
  const seq = response?.seq;
  if (!response || typeof seq !== "number" || seq < lastSeq) {
    return { answers, lastSeq };
  }
  const drafts = Array.isArray(response.drafts) ? response.drafts : [];
  let next = answers;
  for (const draft of drafts) {
    if (!draft || typeof draft.fieldId !== "string") continue;
    if (next[draft.fieldId]?.status === "confirmed") continue;
    if (next === answers) next = { ...answers };
    next[draft.fieldId] = formDraft(draft);
  }
  return { answers: next, lastSeq: seq };
}

/**
 * @param {{ mode: string, lineCount: number, lastAppliedLineCount: number | null, answers: AnswerMap }} input
 * @returns {FinalPassPlan}
 */
export function planFinalPass({ mode, lineCount, lastAppliedLineCount, answers }) {
  if (mode !== "live" || lineCount === lastAppliedLineCount) return { call: false };
  return { call: true, body: { pass: "final", drafts: finalPassDrafts(answers) } };
}

/** @param {AnswerMap} answers */
function finalPassDrafts(answers) {
  return Object.entries(answers ?? {}).flatMap(([id, answer]) => {
    if (!answer || answer.status !== "draft") return [];
    const fieldId = typeof answer.fieldId === "string" ? answer.fieldId : id;
    return [{ ...answer, fieldId }];
  });
}

// A field the response omits stays. Confirmed stays. A code means the pass did not apply.
/**
 * @param {AnswerMap} answers
 * @param {DraftResponse | null | undefined} response
 * @returns {AnswerMap}
 */
export function applyFinalPass(answers, response) {
  if (!response || response.code) return answers;
  const drafts = Array.isArray(response.drafts) ? response.drafts : [];
  let next = answers;
  for (const draft of drafts) {
    if (!draft || typeof draft.fieldId !== "string") continue;
    if (next[draft.fieldId]?.status === "confirmed") continue;
    if (next === answers) next = { ...answers };
    next[draft.fieldId] = formDraft(draft);
  }
  return next;
}
