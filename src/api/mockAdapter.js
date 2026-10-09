// DEMO MODE ONLY. In-browser sample data. No validation authority lives here:
// the real backend owns clinical validation, session timing rules, PDF and email.
// This adapter only simulates the *shape* of responses so the UI can be reviewed.
const KEY = "clinicolink_mock_db";
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

const seed = () => {
  const today = new Date();
  const at = (d, h) => {
    const x = new Date(today);
    x.setDate(x.getDate() + d);
    x.setHours(h, 0, 0, 0);
    return x.toISOString();
  };
  return {
    patients: [
      { id: "p1", fullName: "Amelia Hart", dob: "1988-04-12", phone: "555-0142", email: "amelia@example.com", reason: "Anxiety follow-up", status: "active" },
      { id: "p2", fullName: "Marcus Bell", dob: "1975-09-30", phone: "555-0177", email: "marcus@example.com", reason: "Initial consultation", status: "active" },
    ],
    sessions: [
      { id: "s1", patientId: "p1", patientName: "Amelia Hart", startsAt: at(1, 10), durationMinutes: 50, type: "Follow-up", status: "scheduled" },
      { id: "s2", patientId: "p2", patientName: "Marcus Bell", startsAt: at(2, 14), durationMinutes: 60, type: "Initial", status: "scheduled" },
      { id: "s3", patientId: "p1", patientName: "Amelia Hart", startsAt: at(-7, 10), durationMinutes: 50, type: "Follow-up", status: "completed" },
    ],
    reports: [
      { id: "r1", sessionId: "s3", patientName: "Amelia Hart", createdAt: at(-6, 9), status: "ready", emailedTo: null },
    ],
  };
};

const load = () => {
  const raw = localStorage.getItem(KEY);
  if (raw) return JSON.parse(raw);
  const db = seed();
  localStorage.setItem(KEY, JSON.stringify(db));
  return db;
};
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));

export const mockAdapter = {
  async listPatients() { await delay(); return load().patients; },
  async createPatient(payload) {
    await delay();
    const db = load();
    const patient = { id: uid(), status: "active", ...payload };
    db.patients.unshift(patient);
    save(db);
    return patient;
  },
  async listSessions() { await delay(); return load().sessions; },
  async createSession(payload) {
    await delay();
    const db = load();
    const patient = db.patients.find((p) => p.id === payload.patientId);
    const session = { id: uid(), status: "scheduled", patientName: patient?.fullName || "Unknown", ...payload };
    db.sessions.push(session);
    save(db);
    return session;
  },
  async listReports() { await delay(); return load().reports; },
  async generateReport({ sessionId }) {
    await delay(700);
    const db = load();
    const s = db.sessions.find((x) => x.id === sessionId);
    const report = { id: uid(), sessionId, patientName: s?.patientName || "Unknown", createdAt: new Date().toISOString(), status: "ready", emailedTo: null };
    db.reports.unshift(report);
    save(db);
    return report;
  },
  async downloadReport() { await delay(); return { demo: true }; },
  async emailReport({ reportId, to }) {
    await delay(600);
    const db = load();
    const r = db.reports.find((x) => x.id === reportId);
    if (r) r.emailedTo = to;
    save(db);
    return { sent: true, to };
  },
  async ping() { await delay(150); return { ok: true, mode: "mock" }; },
};