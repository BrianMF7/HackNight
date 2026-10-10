export function normalizeScribeTranscript(payload) {
  const raw = Array.isArray(payload?.words) ? payload.words : [];
  const words = raw
    .filter((word) => word?.type === "word" && String(word.text ?? "").trim())
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const lines = [];
  for (const word of words) {
    const speaker = word.speaker_id || "Clinician"; // shortcut: no speaker_id uses the live mic label
    const text = String(word.text).trim();
    const last = lines.at(-1);
    if (!last || last.speaker !== speaker) {
      lines.push({ t: word.start ?? 0, speaker, text });
    } else {
      last.text += ` ${text}`;
    }
  }
  return lines;
}
