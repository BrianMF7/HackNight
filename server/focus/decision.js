import { addonFor } from "./addon.js";

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

/** Yes opens the add-on. No hides the focus. The input object is left as it was. */
export function applyFocusDecision(state, { focusId, decision } = {}) {
  const addon = addonFor(focusId);
  if (!addon) fail("UNKNOWN_FOCUS", `Unknown focus id ${focusId}`);
  if (decision !== "yes" && decision !== "no") fail("BAD_DECISION", "Decision must be yes or no");
  const current = state && typeof state === "object" ? state : {};
  if (decision === "no") return { ...current, decision: "no", focuses: [], addon: [] };
  return { ...current, decision: "yes", focuses: [...(current.focuses ?? [])], addon };
}
