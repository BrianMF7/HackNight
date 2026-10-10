import { DEPRESSION_ID } from "./criteria.js";

const PAIR_REASON =
  "Low mood and lost interest were both described, so depression is a possible focus to ask about.";
const SPAN_REASON =
  "Low mood and lost interest were both described across a longer stretch, so depression is a possible focus to ask about.";

function boundIds(bindings) {
  if (!Array.isArray(bindings)) return null;
  const ids = new Set();
  for (const item of bindings) {
    if (typeof item === "string") ids.add(item);
    else if (item && typeof item.criterionId === "string") ids.add(item.criterionId);
  }
  return ids;
}

export function scoreFocus(bindings) {
  const ids = boundIds(bindings);
  if (!ids || !ids.has("dep-mood") || !ids.has("dep-interest")) return null;
  return {
    id: DEPRESSION_ID,
    reason: ids.has("dep-span") ? SPAN_REASON : PAIR_REASON,
  };
}
