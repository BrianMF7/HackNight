/** @param {string} text */
export function normalizeSpoken(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * The clinician line contains a form question verbatim.
 * @param {string} text
 * @param {ReadonlyArray<{ id: string, label: string, followUp?: string }>} questions
 */
export function askedQuestionId(text, questions) {
  const said = normalizeSpoken(text);
  if (said.length < 12) return null;
  for (const question of questions) {
    for (const phrase of [question.label, question.followUp]) {
      const needle = normalizeSpoken(phrase);
      if (needle.length >= 12 && said.includes(needle)) return question.id;
    }
  }
  return null;
}

/**
 * The patient's line answers the question the clinician just asked.
 * A confirmed field stays. No id fills nothing.
 * @template {Record<string, { status?: string }>} T
 * @param {T} answers
 * @param {string | null | undefined} fieldId
 * @param {string} patientText
 * @returns {T}
 */
export function applyAskedDraft(answers, fieldId, patientText) {
  if (!fieldId || answers[fieldId]?.status === "confirmed") return answers;
  const text = String(patientText || "").trim();
  if (!text) return answers;
  return /** @type {T} */ ({
    ...answers,
    [fieldId]: {
      ...answers[fieldId],
      fieldId,
      status: "draft",
      answer: text,
      evidence: text,
      clinicianEdited: false,
    },
  });
}
