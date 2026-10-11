// SYNTHETIC DEMO DATA ONLY. Fictional patient, fictional conversation.
// `events` mimic what the backend would push after processing a transcript.
// Nothing is guessed: PHQ-9 items are only filled when a timeframe and category are stated,
// and unmentioned symptoms are left unanswered (absence is not denial).
export const syntheticSession = {
  id: "demo-session-001",
  patientLabel: "Patient A.",
  therapist: { name: "Dr. Rowan Ellis", email: "therapist@example.com" },
  clinician: "Clinician",
  templateId: "adult-intake-v1",
  plannedMinutes: 45,
};

export const transcript = [
  { t: 0, speaker: "Clinician", text: "Thanks for joining. To start, what brings you in today?" },
  { t: 6, speaker: "Patient", text: "I've been feeling really overwhelmed and anxious, and it's getting hard to function." },
  { t: 12, speaker: "Clinician", text: "I'm sorry to hear that. When did this begin?" },
  { t: 18, speaker: "Patient", text: "Probably about six months ago, after I changed jobs." },
  { t: 24, speaker: "Clinician", text: "How has it affected your day to day?" },
  { t: 30, speaker: "Patient", text: "I miss deadlines, and I snap at my partner more than I'd like." },
  { t: 37, speaker: "Clinician", text: "And your mood over the last two weeks?" },
  { t: 43, speaker: "Patient", text: "Mostly low. I've felt down and hopeless several days, maybe four or five out of fourteen." },
  { t: 50, speaker: "Clinician", text: "Any trouble with sleep?" },
  { t: 55, speaker: "Patient", text: "Yes, I lie awake for hours. It's happened nearly every night lately." },
  { t: 62, speaker: "Clinician", text: "Do you drink alcohol?" },
  { t: 67, speaker: "Patient", text: "A glass of wine, maybe twice a week." },
  { t: 73, speaker: "Clinician", text: "Have you seen a therapist before?" },
  { t: 78, speaker: "Patient", text: "Briefly, a few years ago. It wasn't a great fit." },
  { t: 84, speaker: "Clinician", text: "Who do you live with?" },
  { t: 88, speaker: "Patient", text: "My partner. My sister is nearby and helps a lot." },
];

// Backend-style events. `at` is the playback second at which each arrives.
/** @type {import("../../components/workspace/applyLiveDrafts.js").PlaybackEvent[]} */
export const events = [
  { at: 8, fieldId: "AIQ-001", status: "draft", answer: "Feeling overwhelmed and anxious; difficulty functioning.", evidence: "\"I've been feeling really overwhelmed and anxious, and it's getting hard to function.\"", t: 6 },
  { at: 20, fieldId: "AIQ-002", status: "draft", answer: "Approximately six months, following a job change.", evidence: "\"Probably about six months ago, after I changed jobs.\"", t: 18 },
  { at: 32, fieldId: "AIQ-003", status: "draft", answer: "Missing deadlines at work; increased irritability with partner.", evidence: "\"I miss deadlines, and I snap at my partner more than I'd like.\"", t: 30 },
  { at: 45, fieldId: "AIQ-004", status: "draft", answer: "Mostly low mood; feeling down and hopeless on several days.", evidence: "\"Mostly low. I've felt down and hopeless several days...\"", t: 43 },
  { at: 46, fieldId: "PHQ-002", status: "draft", answer: "Several days", category: "Several days", evidence: "\"...felt down and hopeless several days, maybe four or five out of fourteen.\"", t: 43 },
  { at: 47, fieldId: "AIQ-005", status: "partial", answer: "Reports feeling anxious; frequency not stated.", evidence: "\"overwhelmed and anxious\" (first statement only)", t: 6, prompt: true },
  { at: 57, fieldId: "AIQ-006", status: "draft", answer: "Lies awake for hours, nearly every night recently.", evidence: "\"I lie awake for hours. It's happened nearly every night lately.\"", t: 55 },
  { at: 58, fieldId: "PHQ-003", status: "clarify", answer: "Sleep trouble mentioned as \"lately\"; two-week window not confirmed.", evidence: "\"...nearly every night lately.\"", t: 55 },
  { at: 69, fieldId: "SUB-001", status: "draft", answer: "About one glass of wine, twice a week.", evidence: "\"A glass of wine, maybe twice a week.\"", t: 67 },
  { at: 80, fieldId: "HIS-001", status: "draft", answer: "Brief prior therapy a few years ago; reported poor fit.", evidence: "\"Briefly, a few years ago. It wasn't a great fit.\"", t: 78 },
  { at: 90, fieldId: "SOC-001", status: "draft", answer: "Lives with partner; sister nearby and supportive.", evidence: "\"My partner. My sister is nearby and helps a lot.\"", t: 88 },
];

// Reminder cues: required items still open as the session progresses.
export const reminderAt = 70;