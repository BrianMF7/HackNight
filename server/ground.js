function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

function quotesIn(evidence) {
  return [...String(evidence ?? "").matchAll(/"([^"]*)"/g)].map((match) => match[1]);
}

// The model often returns the spoken line itself. Extra quote marks are not required.
function evidenceQuotes(evidence) {
  const quoted = quotesIn(evidence);
  if (quoted.length > 0) return quoted;
  const bare = String(evidence ?? "").trim();
  return bare ? [bare] : [];
}

function partSpoken(part, corpus) {
  if (corpus.includes(part)) return true;
  const stripped = part.replace(/^(?:Patient|Clinician):\s*/, "");
  return stripped.length > 0 && stripped !== part && corpus.includes(stripped);
}

export function quoteParts(quote) {
  return quote.split("...").map((part) => part.trim()).filter(Boolean);
}

function denialKind(answer) {
  const normalized = String(answer ?? "").trim().toLowerCase();
  if (normalized === "no" || normalized === "not at all") return normalized;
  return null;
}

function quoteStatesDenial(quote, kind) {
  const text = quote.toLowerCase();
  if (kind === "not at all") return text.includes("not at all");
  return /\bno\b/.test(text);
}

export function ground(draft, transcriptLines, fieldIds) {
  if (!fieldIds.has(draft.fieldId)) fail("UNKNOWN_FIELD", `Unknown field id ${draft.fieldId}`);
  const corpus = transcriptLines.map((line) => line.text).join("\n");
  const quotes = evidenceQuotes(draft.evidence);
  if (quotes.length === 0) fail("NO_QUOTE", "Draft has no transcript quote");
  for (const quote of quotes) {
    const parts = quoteParts(quote);
    if (parts.length === 0 || parts.some((part) => !partSpoken(part, corpus))) {
      fail("INVENTED_QUOTE", "Invented quote");
    }
  }
  const denial = denialKind(draft.answer);
  if (denial && !quotes.some((quote) => quoteStatesDenial(quote, denial))) {
    fail("SILENCE", "Silence is not a denial");
  }
  return draft;
}

const SKIPPED = new Set(["INVENTED_QUOTE", "NO_QUOTE", "SILENCE"]);

export function applyDrafts(drafts, transcriptLines, fieldIds) {
  const filled = [];
  for (const draft of drafts) {
    try {
      filled.push(ground(draft, transcriptLines, fieldIds));
    } catch (err) {
      if (!SKIPPED.has(err.code)) throw err;
    }
  }
  return filled;
}
