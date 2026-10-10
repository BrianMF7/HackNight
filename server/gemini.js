import { applyDrafts } from "./ground.js";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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

function draftsFromBody(body) {
  const parts = body?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? "").join("");
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed?.drafts)) {
    const err = new Error("Gemini response has no drafts");
    err.code = "BAD_GEMINI";
    throw err;
  }
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
  const res = await fetchImpl(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      // shortcut: thinkingBudget 1024 on the final pass only; commit stays at 0
      generationConfig: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: options.final ? 1024 : 0 },
      },
    }),
  });
  if (!res.ok) fail("GEMINI_HTTP", "Gemini request failed");
  return res.json();
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
  const raw = draftsFromBody(body);
  const drafts = options.final ? raw.filter((draft) => fieldIds.has(draft.fieldId)) : raw;
  return applyDrafts(drafts, lines, fieldIds);
}
