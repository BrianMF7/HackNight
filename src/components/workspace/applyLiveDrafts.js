// Writes commit-response drafts into the answer map. A lower seq is an older
// Gemini pass and must not replace a newer one. Confirmed answers stay put.
export function applyLiveDrafts(answers, response, lastSeq) {
  const seq = response?.seq;
  if (typeof seq !== "number" || seq < lastSeq) {
    return { answers, lastSeq };
  }
  const drafts = Array.isArray(response.drafts) ? response.drafts : [];
  let next = answers;
  for (const draft of drafts) {
    if (!draft || typeof draft.fieldId !== "string") continue;
    if (next[draft.fieldId]?.status === "confirmed") continue;
    if (next === answers) next = { ...answers };
    next[draft.fieldId] = draft;
  }
  return { answers: next, lastSeq: seq };
}
