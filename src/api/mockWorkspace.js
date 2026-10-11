// DEMO MODE ONLY. Simulates the shape of the backend's intake-session API.
// The handoff gate below only MIRRORS the documented backend rules so the UI flow can be reviewed.
// In live mode the real backend decides; the frontend never overrides it.
import ApiError from "./ApiError";
import { adultIntake, allQuestions } from "./templates/adultIntake";
import { syntheticSession, transcript, events } from "./fixtures/syntheticSession";

const KEY = "clinicolink_mock_workspace";
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * @typedef {{
 *   sessions: Record<string, {
 *     id?: string,
 *     status?: string,
 *     answers: Record<string, { action?: string, answer?: string, at?: number }>,
 *     patientLabel?: string,
 *     plannedMinutes?: number,
 *     therapist?: { name?: string, email?: string },
 *     templateId?: string,
 *     clinician?: string,
 *     startedAt?: number,
 *     invitationLink?: string,
 *   }>,
 * }} WorkspaceStore
 * @typedef {import("./liveWorkspace.js").WorkspaceCall} WorkspaceCall
 * @typedef {import("./liveWorkspace.js").SessionRef} SessionRef
 * @typedef {import("./liveWorkspace.js").CreateSessionInput} CreateSessionInput
 * @typedef {import("./liveWorkspace.js").TranscriptInput} TranscriptInput
 * @typedef {import("./liveWorkspace.js").DraftsInput} DraftsInput
 * @typedef {import("./liveWorkspace.js").ActionInput} ActionInput
 * @typedef {import("./liveWorkspace.js").HandoffInput} HandoffInput
 */

/** @returns {WorkspaceStore} */
const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sessions: {} };
    return /** @type {WorkspaceStore} */ (JSON.parse(raw) || { sessions: {} });
  } catch {
    return { sessions: {} };
  }
};
/** @param {WorkspaceStore} db */
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
  async getTemplate(/** @type {WorkspaceCall} */ _ref) { await delay(150); return adultIntake; },

  async createSession(/** @type {CreateSessionInput} */ { templateId, therapistName, therapistEmail }) {
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

  // Realtime STT needs live mode + the Node server minting a single-use ElevenLabs token.
  /** @returns {Promise<{ wsUrl: string }>} */
  async getSttToken() {
    throw new ApiError("Realtime speech-to-text needs live backend mode.", { code: "MOCK_MODE" });
  },

  // A Daily video room needs live mode + the Node server holding DAILY_API_KEY.
  /** @returns {Promise<{ roomUrl: string, token: string }>} */
  async startCall(/** @type {SessionRef} */ _ref) {
    throw new ApiError("Video calls need live backend mode.", { code: "MOCK_MODE" });
  },

  async appendTranscriptLine(/** @type {TranscriptInput} */ _line) { await delay(50); return { ok: true, demo: true }; },

  /** @returns {Promise<import("../components/workspace/applyLiveDrafts.js").DraftResponse>} */
  async drafts(/** @type {DraftsInput} */ _body) { await delay(100); return { drafts: [] }; },

  async getTranscript(/** @type {SessionRef} */ _ref) { await delay(100); return transcript; },
  async getEvents(/** @type {SessionRef} */ _ref) { await delay(100); return events; },

  async recordClinicianAction(/** @type {ActionInput} */ { sessionId, fieldId, action, answer }) {
    await delay(150);
    const db = load();
    const s = db.sessions[sessionId];
    if (s) {
      s.answers[fieldId] = { action, answer, at: Date.now() };
      save(db);
    }
    return { ok: true };
  },

  async retainDraft(/** @type {SessionRef} */ { sessionId }) {
    await delay(200);
    const db = load();
    if (db.sessions[sessionId]) { db.sessions[sessionId].status = "draft_retained"; save(db); }
    return { ok: true, status: "draft_retained", sent: false };
  },

  async discardDraft(/** @type {SessionRef} */ { sessionId }) {
    await delay(200);
    const db = load();
    delete db.sessions[sessionId];
    save(db);
    return { ok: true };
  },

  /**
   * Simulated authoritative gate. Returns reasons exactly like a backend would.
   * @returns {Promise<{ allowed: false, reasons: { code: string, message: string }[] } | { allowed: true, sent: true, to: string, demo: true }>}
   */
  async requestHandoff(/** @type {HandoffInput} */ { sessionId, confirmedIds, recipientEmail, elapsedSeconds, plannedMinutes }) {
    await delay(700);
    const reasons = [];
    const required = allQuestions.filter((q) => q.required);
    const unconfirmed = required.filter((q) => !confirmedIds.includes(q.id));
    if (unconfirmed.length) reasons.push({ code: "REQUIRED_UNCONFIRMED", message: `${unconfirmed.length} required question(s) are not clinician-confirmed.` });
    if (unconfirmed.some((q) => q.safety)) reasons.push({ code: "SAFETY_UNRESOLVED", message: "A required safety item is unresolved." });
    if (!recipientEmail) reasons.push({ code: "NO_RECIPIENT", message: "No therapist recipient is assigned." });
    if (elapsedSeconds < plannedMinutes * 60) reasons.push({ code: "SEND_GATE_NOT_MET", message: `At least ${plannedMinutes} minutes are required before handoff.` });
    if (reasons.length || !recipientEmail) return { allowed: false, reasons };
    return { allowed: true, sent: true, to: recipientEmail, demo: true };
  },
};