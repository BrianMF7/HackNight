// Single entry point for the UI. Picks exactly one adapter per call based on the
// current mode. Mock and live never mix: live mode never falls back to mock data.
import { getMode } from "./config";
import { mockAdapter } from "./mockAdapter";
import { liveAdapter } from "./liveAdapter";
import { mockWorkspace } from "./mockWorkspace";
import { liveWorkspace } from "./liveWorkspace";

const METHODS = [
  "ping",
  "listPatients",
  "createPatient",
  "listSessions",
  "createSession",
  "listReports",
  "generateReport",
  "downloadReport",
  "emailReport",
];

const WORKSPACE_METHODS = [
  "getTemplates",
  "getTemplate",
  "createSession",
  "getTranscript",
  "getEvents",
  "recordClinicianAction",
  "retainDraft",
  "discardDraft",
  "requestHandoff",
  "playQuestion",
];

const live = () => getMode() === "live";
const adapter = () => (live() ? liveAdapter : mockAdapter);

export const api = Object.fromEntries(
  METHODS.map((m) => [m, (...args) => adapter()[m](...args)])
);

// Intake workspace API (templates, sessions, answer events, review, handoff).
export const workspaceApi = Object.fromEntries(
  WORKSPACE_METHODS.map((m) => [m, (...args) => (live() ? liveWorkspace : mockWorkspace)[m](...args)])
);