import { bindCriteria } from "./bind.js";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

const BINDINGS_SCHEMA = {
  type: "OBJECT",
  properties: {
    bindings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          criterionId: { type: "STRING" },
          evidence: { type: "STRING" },
          t: { type: "NUMBER" },
        },
        required: ["criterionId", "evidence", "t"],
      },
    },
  },
  required: ["bindings"],
};

function buildRequestText(lines, criteria) {
  const criterionLines = (Array.isArray(criteria) ? criteria : [])
    .map((item) => `${item.id}: ${item.rule}`)
    .join("\n");
  const transcriptLines = (Array.isArray(lines) ? lines : [])
    .map((line) => `${line.t} ${line.speaker}: ${line.text}`)
    .join("\n");
  return [
    "Find quoted evidence for these criterion ids using only the transcript.",
    "Return JSON {\"bindings\":[{\"criterionId\",\"evidence\",\"t\"}]}.",
    "evidence must be a substring of the transcript.",
    "Omit a criterion when the transcript does not support it.",
    "Criteria:",
    criterionLines,
    "Transcript:",
    transcriptLines,
  ].join("\n");
}

function bindingsFromBody(body) {
  const parts = body?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((part) => !part?.thought).map((part) => part.text ?? "").join("");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail("BAD_GEMINI", "Gemini response has no bindings");
  }
  if (!Array.isArray(parsed?.bindings)) fail("BAD_GEMINI", "Gemini response has no bindings");
  return parsed.bindings;
}

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

async function fetchGemini(text, options) {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) fail("NO_GEMINI_KEY", "GEMINI_API_KEY is not set");
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const controller = new AbortController();
  // shortcut: 3.8 Flash sometimes runs past a minute; release the caller instead of waiting forever
  const timeout = setTimeout(() => controller.abort(), 120_000);
  timeout.unref?.();
  let res;
  try {
    res = await fetchImpl(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        // shortcut: 2.5-flash is 404 for new keys; 3.8 Flash cannot turn thinking off, so this call stays low
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: BINDINGS_SCHEMA,
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    });
  } catch {
    fail("GEMINI_HTTP", "Gemini request failed");
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) fail("GEMINI_HTTP", "Gemini request failed");
  try {
    return await res.json();
  } catch {
    fail("BAD_GEMINI", "Gemini response has no bindings");
  }
}

export async function suggestBindings(lines, criteria, options = {}) {
  if (options.synthetic === false && process.env.ALLOW_PHI !== "1") {
    fail("PHI_REFUSED", "Non-synthetic transcripts require ALLOW_PHI=1");
  }
  const list = Array.isArray(criteria) ? criteria : [];
  const body = options.body ?? await fetchGemini(buildRequestText(lines, list), options);
  return { bindings: bindCriteria(bindingsFromBody(body), lines, list.map((item) => item.id)) };
}
