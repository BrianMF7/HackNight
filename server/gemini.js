import { applyDrafts } from "./ground.js";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

export function buildRequestText(lines, questions) {
  const questionLines = questions.map((question) => `${question.id}: ${question.label}`).join("\n");
  const transcriptLines = lines.map((line) => `${line.speaker}: ${line.text}`).join("\n");
  return [
    "Fill draft answers for the intake questions using only the transcript.",
    "Return JSON {\"drafts\":[{\"fieldId\",\"status\",\"answer\",\"evidence\",\"t\"}]}.",
    "evidence must be a double-quoted substring of the transcript.",
    "Omit a question when the transcript does not answer it.",
    "Questions:",
    questionLines,
    "Transcript:",
    transcriptLines,
  ].join("\n");
}

function buildFinalRequestText(lines, questions, drafts) {
  const questionLines = questions.map((question) => `${question.id}: ${question.label}`).join("\n");
  const transcriptLines = lines.map((line) => `${line.speaker}: ${line.text}`).join("\n");
  const draftLines = (drafts ?? []).map((draft) => `${draft.fieldId}: ${draft.answer ?? ""}`).join("\n");
  return [
    "Fill a blank or replace a draft when the full transcript supports a quote.",
    "Omit a question when nothing should change.",
    "Posted drafts are context only.",
    "Return JSON {\"drafts\":[{\"fieldId\",\"status\",\"answer\",\"evidence\",\"t\"}]}.",
    "evidence must be a double-quoted substring of the transcript.",
    "Questions:",
    questionLines,
    "Current drafts:",
    draftLines,
    "Transcript:",
    transcriptLines,
  ].join("\n");
}

const DRAFT_SCHEMA = {
  type: "OBJECT",
  properties: {
    drafts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          fieldId: { type: "STRING" },
          status: { type: "STRING" },
          answer: { type: "STRING" },
          evidence: { type: "STRING" },
          t: { type: "NUMBER" },
        },
        required: ["fieldId", "status", "answer", "evidence", "t"],
      },
    },
  },
  required: ["drafts"],
};

function draftsFromBody(body) {
  const parts = body?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((part) => !part?.thought).map((part) => part.text ?? "").join("");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail("BAD_GEMINI", "Gemini response has no drafts");
  }
  if (!Array.isArray(parsed?.drafts)) fail("BAD_GEMINI", "Gemini response has no drafts");
  return parsed.drafts;
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
  // shortcut: 3.8 Flash sometimes runs past a minute; release the session lock instead of waiting forever
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
        // shortcut: 2.5-flash is 404 for new keys; 3.8 Flash cannot turn thinking off, so commit is low and the final pass is medium
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: DRAFT_SCHEMA,
          thinkingConfig: { thinkingLevel: options.final ? "medium" : "low" },
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
    fail("BAD_GEMINI", "Gemini response has no drafts");
  }
}

export async function draftFromTranscript(lines, questions, options = {}) {
  if (options.synthetic === false && process.env.ALLOW_PHI !== "1") {
    fail("PHI_REFUSED", "Non-synthetic transcripts require ALLOW_PHI=1");
  }
  const text = options.final
    ? buildFinalRequestText(lines, questions, options.contextDrafts)
    : buildRequestText(lines, questions);
  const body = options.body ?? await fetchGemini(text, options);
  const fieldIds = new Set(questions.map((question) => question.id));
  const drafts = draftsFromBody(body).filter((draft) => draft && fieldIds.has(draft.fieldId));
  return applyDrafts(drafts, lines, fieldIds);
}
