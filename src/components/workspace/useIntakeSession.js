import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { workspaceApi } from "@/api";
import { allQuestions } from "@/api/templates/adultIntake";
import { getMode } from "@/api/config";
import { applyFinalPass, applyLiveDrafts, planFinalPass } from "./applyLiveDrafts";

// Drives one intake session. In demo mode a synthetic transcript plays back and mock backend
// events arrive over time. The frontend only DISPLAYS backend answers; it never invents them.
// Elapsed time is taken from the session start; the real backend enforces all timing rules.
const PLAYBACK_SPEED = 2; // demo playback runs faster than real time

/**
 * @typedef {import("./applyLiveDrafts").FieldState} FieldState
 * @typedef {import("./applyLiveDrafts").AnswerMap} AnswerMap
 * @typedef {FieldState & { at: number, fieldId: string }} PlaybackEvent
 * @typedef {{ t: number, speaker: string, text: string }} TranscriptLine
 * @typedef {{
 *   key: string,
 *   type: "answered",
 *   fieldId: string,
 *   label?: string,
 *   ev: FieldState,
 * } | {
 *   key: string,
 *   type: "needed",
 *   fieldId: string,
 *   label: string,
 *   followUp: string,
 * }} IntakeNotification
 */

/** @param {{ id: string } | null} session */
export default function useIntakeSession(session) {
  const [elapsed, setElapsed] = useState(0);
  const [answers, setAnswers] = useState(/** @type {AnswerMap} */ ({})); // fieldId -> { status, answer, evidence, t }
  const [events, setEvents] = useState(/** @type {PlaybackEvent[]} */ ([]));
  const [transcript, setTranscript] = useState(/** @type {TranscriptLine[]} */ ([]));
  const [notifications, setNotifications] = useState(/** @type {IntakeNotification[]} */ ([]));
  const [snoozed, setSnoozed] = useState(/** @type {Record<string, boolean>} */ ({})); // fieldId -> true (visual only, not complete)
  const [connection, setConnection] = useState(/** @type {"connected" | "patient_left"} */ ("connected"));
  const [paused, setPaused] = useState(false);
  const firedRef = useRef(/** @type {Set<string>} */ (new Set()));
  const reminderFired = useRef(false);
  const appliedSeqRef = useRef(0);
  const appliedFinalLinesRef = useRef(/** @type {number | null} */ (null));
  const answersRef = useRef(answers);
  const transcriptRef = useRef(transcript);
  answersRef.current = answers;
  transcriptRef.current = transcript;

  useEffect(() => {
    appliedSeqRef.current = 0;
    appliedFinalLinesRef.current = null;
    if (!session) return;
    workspaceApi.getEvents({ sessionId: session.id }).then(setEvents);
    workspaceApi.getTranscript({ sessionId: session.id }).then(setTranscript);
  }, [session]);

  // Clock + synthetic playback
  useEffect(() => {
    if (!session || paused || connection !== "connected") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [session, paused, connection]);

  const playhead = elapsed * PLAYBACK_SPEED;

  useEffect(() => {
    events.forEach((ev) => {
      if (ev.at <= playhead && !firedRef.current.has(ev.fieldId + ev.at)) {
        firedRef.current.add(ev.fieldId + ev.at);
        setAnswers((a) => (a[ev.fieldId]?.status === "confirmed" ? a : { ...a, [ev.fieldId]: ev }));
        const q = allQuestions.find((x) => x.id === ev.fieldId);
        setNotifications((n) => [...n, { key: `ans-${ev.fieldId}-${ev.at}`, type: "answered", fieldId: ev.fieldId, label: q?.label, ev }]);
      }
    });
  }, [playhead, events]);

  const questionState = useCallback(
    /** @param {string} id @returns {FieldState} */
    (id) => answers[id] || { status: "not_answered" },
    [answers]
  );

  const confirmedIds = useMemo(
    () => allQuestions.filter((q) => answers[q.id]?.status === "confirmed").map((q) => q.id),
    [answers]
  );

  // Outstanding required items, safety first, then template order.
  const outstanding = useMemo(() => {
    return allQuestions
      .filter((q) => q.required && answers[q.id]?.status !== "confirmed" && !["draft"].includes(answers[q.id]?.status))
      .sort((a, b) => (b.safety ? 1 : 0) - (a.safety ? 1 : 0));
  }, [answers]);

  // One discreet "additional information needed" cue, not repeated.
  useEffect(() => {
    if (reminderFired.current || playhead < 70) return;
    const next = outstanding[0];
    if (!next) return;
    reminderFired.current = true;
    setNotifications((n) => [...n, { key: `need-${next.id}`, type: "needed", fieldId: next.id, label: next.label, followUp: next.followUp }]);
  }, [playhead, outstanding]);

  /** @param {string} key */
  const dismissNotification = (key) => {
    setNotifications((n) => n.filter((x) => x.key !== key));
  };
  /** @param {string} fieldId */
  const snooze = (fieldId) => setSnoozed((s) => ({ ...s, [fieldId]: true }));

  /**
   * @param {string} fieldId
   * @param {string} [editedAnswer]
   */
  const confirm = async (fieldId, editedAnswer) => {
    if (!session) return;
    const current = answers[fieldId];
    const answer = editedAnswer ?? current?.answer ?? "";
    await workspaceApi.recordClinicianAction({ sessionId: session.id, fieldId, action: editedAnswer != null ? "edit_confirm" : "confirm", answer });
    setAnswers((a) => ({ ...a, [fieldId]: { ...(a[fieldId] || {}), status: "confirmed", answer, clinicianEdited: editedAnswer != null } }));
    setNotifications((n) => n.filter((x) => x.fieldId !== fieldId));
  };

  /**
   * @param {string} fieldId
   * @param {string} text
   */
  const saveEdit = async (fieldId, text) => {
    if (!session) return;
    await workspaceApi.recordClinicianAction({ sessionId: session.id, fieldId, action: "edit", answer: text });
    setAnswers((a) => ({ ...a, [fieldId]: { ...(a[fieldId] || {}), status: "draft", answer: text, clinicianEdited: true } }));
  };

  const appendTranscriptLine = useCallback(/** @param {TranscriptLine} line */ async (line) => {
    if (!session) return;
    setTranscript((rows) => [...rows, line]);
    try {
      const response = await workspaceApi.appendTranscriptLine({ sessionId: session.id, ...line });
      // Compared at apply time so an older response cannot land after a newer one.
      setAnswers((current) => {
        const applied = applyLiveDrafts(current, response, appliedSeqRef.current);
        appliedSeqRef.current = applied.lastSeq;
        return applied.answers;
      });
    } catch {
      // Live STT still shows in the UI if the persist route is unavailable.
    }
  }, [session?.id]);

  const requestFinalPass = useCallback(async () => {
    const lineCount = transcriptRef.current.length;
    const plan = planFinalPass({
      mode: getMode(),
      lineCount,
      lastAppliedLineCount: appliedFinalLinesRef.current,
      answers: answersRef.current,
    });
    if (!plan.call || !session?.id) return;
    const previous = appliedFinalLinesRef.current;
    appliedFinalLinesRef.current = lineCount;
    let response;
    try {
      response = await workspaceApi.drafts({ sessionId: session.id, ...plan.body });
    } catch {
      if (appliedFinalLinesRef.current === lineCount) appliedFinalLinesRef.current = previous;
      return;
    }
    if (transcriptRef.current.length !== lineCount || !response || response.code) {
      if (appliedFinalLinesRef.current === lineCount) appliedFinalLinesRef.current = previous;
      return;
    }
    setAnswers((current) => (
      transcriptRef.current.length === lineCount ? applyFinalPass(current, response) : current
    ));
  }, [session?.id]);

  return {
    elapsed, playhead, answers, questionState, confirmedIds, outstanding, notifications, snoozed, transcript,
    connection, setConnection, paused, setPaused,
    dismissNotification, snooze, confirm, saveEdit, appendTranscriptLine, requestFinalPass,
  };
}