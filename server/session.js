/** In-memory live sessions. Transcript lines can be appended from the client after STT commits. */

const sessions = new Map();

export function createSession({
  templateId = "adult-intake-v1",
  therapistName = "",
  therapistEmail = "",
  patientLabel = "Patient (live)",
} = {}) {
  const id = `live-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const session = {
    id,
    patientLabel,
    therapist: { name: therapistName || "Therapist", email: therapistEmail || "" },
    clinician: "Clinician",
    templateId,
    plannedMinutes: 45,
    startedAt: Date.now(),
    status: "in_progress",
    transcriptLines: [],
    events: [],
  };
  sessions.set(id, session);
  return publicSession(session);
}

export function getSession(id) {
  return sessions.get(id) || null;
}

export function getTranscript(id) {
  const s = getSession(id);
  return s ? s.transcriptLines : null;
}

export function getEvents(id) {
  const s = getSession(id);
  return s ? s.events : null;
}

export function appendTranscriptLine(id, line) {
  const s = getSession(id);
  if (!s) return null;
  const entry = {
    t: Number(line.t) || 0,
    speaker: line.speaker || "Clinician",
    text: String(line.text || "").trim(),
  };
  if (!entry.text) {
    const err = new Error("Transcript text is required");
    err.code = "BAD_REQUEST";
    throw err;
  }
  s.transcriptLines.push(entry);
  return entry;
}

function publicSession(s) {
  return {
    id: s.id,
    patientLabel: s.patientLabel,
    therapist: s.therapist,
    clinician: s.clinician,
    templateId: s.templateId,
    plannedMinutes: s.plannedMinutes,
    startedAt: s.startedAt,
    status: s.status,
  };
}
