// DEMO MODE ONLY. Simulates the shape of the backend's intake-session API.
// The handoff gate below only MIRRORS the documented backend rules so the UI flow can be reviewed.
// In live mode the real backend decides; the frontend never overrides it.
import { adultIntake, allQuestions } from "./templates/adultIntake";
import { syntheticSession, transcript, events } from "./fixtures/syntheticSession";

const KEY = "clinicolink_mock_workspace";
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || { sessions: {} }; } catch { return { sessions: {} }; }
};
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));

export const mockWorkspace = {
  async getTemplates() {
    await delay(150);
    return [
      { id: adultIntake.id, title: adultIntake.title, pages: 8, available: true, note: "Primary demo template" },
      { id: "brief-intake", title: "Brief Intake Assessment", pages: 10, available: false, note: "Reference only. Not yet loaded in demo." },
      { id: "phq9", title: "Patient Health Questionnaire (PHQ-9)", pages: 2, available: false, note: "Reference only. Not yet loaded in demo." },
    ];
  },
  async getTemplate() { await delay(150); return adultIntake; },

  async createSession({ templateId, therapistName, therapistEmail }) {
    await delay();
    const db = load();
    const s = {
      ...syntheticSession,
      id: uid(),
      templateId,
      therapist: { name: therapistName || syntheticSession.therapist.name, email: therapistEmail || "" },
      startedAt: Date.now(),
      status: "in_progress",
      answers: {},
    };
    db.sessions[s.id] = s;
    save(db);
    return { ...s, invitationLink: `${window.location.origin}/join/${s.id}` };
  },

  async playQuestion() { await delay(200); return { demo: true, audioUrl: null }; },

  // Realtime STT needs live mode + the Node server minting a single-use ElevenLabs token.
  async getSttToken() {
    const err = new Error("Realtime speech-to-text needs live backend mode.");
    err.code = "MOCK_MODE";
    throw err;
  },

  async appendTranscriptLine() { await delay(50); return { ok: true, demo: true }; },

  async drafts() { await delay(100); return events; },

  async getTranscript() { await delay(100); return transcript; },
  async getEvents() { await delay(100); return events; },

  async recordClinicianAction({ sessionId, fieldId, action, answer }) {
    await delay(150);
    const db = load();
    const s = db.sessions[sessionId];
    if (s) {
      s.answers[fieldId] = { action, answer, at: Date.now() };
      save(db);
    }
    return { ok: true };
  },

  async retainDraft({ sessionId }) {
    await delay(200);
    const db = load();
    if (db.sessions[sessionId]) { db.sessions[sessionId].status = "draft_retained"; save(db); }
    return { ok: true, status: "draft_retained", sent: false };
  },

  async discardDraft({ sessionId }) {
    await delay(200);
    const db = load();
    delete db.sessions[sessionId];
    save(db);
    return { ok: true };
  },

  // Simulated authoritative gate. Returns reasons exactly like a backend would.
  async requestHandoff({ sessionId, confirmedIds, recipientEmail, elapsedSeconds, plannedMinutes }) {
    await delay(700);
    const reasons = [];
    const required = allQuestions.filter((q) => q.required);
    const unconfirmed = required.filter((q) => !confirmedIds.includes(q.id));
    if (unconfirmed.length) reasons.push({ code: "REQUIRED_UNCONFIRMED", message: `${unconfirmed.length} required question(s) are not clinician-confirmed.` });
    if (unconfirmed.some((q) => q.safety)) reasons.push({ code: "SAFETY_UNRESOLVED", message: "A required safety item is unresolved." });
    if (!recipientEmail) reasons.push({ code: "NO_RECIPIENT", message: "No therapist recipient is assigned." });
    if (elapsedSeconds > plannedMinutes * 60) reasons.push({ code: "SEND_GATE_EXPIRED", message: `The ${plannedMinutes}-minute send window for this session has expired.` });
    if (reasons.length) return { allowed: false, reasons };
    return { allowed: true, sent: true, to: recipientEmail, demo: true };
  },
};