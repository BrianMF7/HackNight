import { quoteParts } from "../ground.js";

export function bindCriteria(candidates, transcriptLines, criterionIds) {
  if (!Array.isArray(candidates)) return [];
  const ids =
    criterionIds instanceof Set || Array.isArray(criterionIds)
      ? new Set(criterionIds)
      : new Set();
  const lines = Array.isArray(transcriptLines) ? transcriptLines : [];
  const corpus = lines
    .map((line) => (line && typeof line.text === "string" ? line.text : ""))
    .join("\n");
  const kept = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate.criterionId !== "string" || !ids.has(candidate.criterionId)) {
      continue;
    }
    if (typeof candidate.evidence !== "string") continue;
    const parts = quoteParts(candidate.evidence);
    if (parts.length === 0 || parts.some((part) => !corpus.includes(part))) continue;
    kept.push({
      criterionId: candidate.criterionId,
      evidence: candidate.evidence,
      t: candidate.t,
    });
  }
  return kept;
}
