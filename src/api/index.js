// Single entry point for the UI. Picks exactly one adapter per call based on the
// current mode. Mock and live never mix: live mode never falls back to mock data.
import { getMode } from "./config";
import { mockAdapter } from "./mockAdapter";
import { liveAdapter } from "./liveAdapter";
import { mockWorkspace } from "./mockWorkspace";
import { liveWorkspace } from "./liveWorkspace";

const METHODS = /** @type {const} */ ([
  "ping",
  "listPatients",
  "createPatient",
  "listSessions",
  "createSession",
  "listReports",
  "generateReport",
  "downloadReport",
  "emailReport",
]);

const WORKSPACE_METHODS = /** @type {const} */ ([
  "getTemplates",
  "getTemplate",
  "createSession",
  "getTranscript",
  "getEvents",
  "appendTranscriptLine",
  "getSttToken",
  "drafts",
  "recordClinicianAction",
  "retainDraft",
  "discardDraft",
  "requestHandoff",
  "diagnostic",
  "reviewDiagnostic",
  "startCall",
]);

/** @typedef {typeof METHODS[number]} ApiMethod */
/** @typedef {typeof WORKSPACE_METHODS[number]} WorkspaceMethod */

/**
 * @typedef {{ [M in ApiMethod]: (...args: Parameters<(typeof mockAdapter)[M]>) => ReturnType<(typeof mockAdapter)[M]> }} ApiClient
 * @typedef {{ [M in WorkspaceMethod]: (...args: Parameters<(typeof mockWorkspace)[M]>) => ReturnType<(typeof mockWorkspace)[M]> }} WorkspaceClient
 */

const live = () => getMode() === "live";
const clinic = () => (live() ? liveAdapter : mockAdapter);
const workspace = () => (live() ? liveWorkspace : mockWorkspace);

/** @type {ApiClient} */
export const api = {
  ping: () => clinic().ping(),
  listPatients: () => clinic().listPatients(),
  createPatient: (payload) => clinic().createPatient(payload),
  listSessions: () => clinic().listSessions(),
  createSession: (payload) => clinic().createSession(payload),
  listReports: () => clinic().listReports(),
  generateReport: (payload) => clinic().generateReport(payload),
  downloadReport: (payload) => clinic().downloadReport(payload),
  emailReport: (payload) => clinic().emailReport(payload),
};

// Intake workspace API (templates, sessions, answer events, review, handoff).
/** @type {WorkspaceClient} */
export const workspaceApi = {
  getTemplates: () => workspace().getTemplates(),
  getTemplate: (payload) => workspace().getTemplate(payload),
  createSession: (payload) => workspace().createSession(payload),
  getTranscript: (payload) => workspace().getTranscript(payload),
  getEvents: (payload) => workspace().getEvents(payload),
  appendTranscriptLine: (payload) => workspace().appendTranscriptLine(payload),
  getSttToken: () => workspace().getSttToken(),
  drafts: (payload) => workspace().drafts(payload),
  recordClinicianAction: (payload) => workspace().recordClinicianAction(payload),
  retainDraft: (payload) => workspace().retainDraft(payload),
  discardDraft: (payload) => workspace().discardDraft(payload),
  requestHandoff: (payload) => workspace().requestHandoff(payload),
  diagnostic: (payload) => workspace().diagnostic(payload),
  reviewDiagnostic: (payload) => workspace().reviewDiagnostic(payload),
  startCall: (payload) => workspace().startCall(payload),
};
