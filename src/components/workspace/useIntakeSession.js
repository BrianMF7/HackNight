import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { workspaceApi } from "@/api";
import { allQuestions } from "@/api/templates/adultIntake";

// Drives one intake session. In demo mode a synthetic transcript plays back and mock backend
// events arrive over time. The frontend only DISPLAYS backend answers; it never invents them.
// Elapsed time is taken from the session start; the real backend enforces all timing rules.
const PLAYBACK_SPEED = 2; // demo playback runs faster than real time

export default function useIntakeSession(session) {
  const [elapsed, setElapsed] = useState(0);
  const [answers, setAnswers] = useState({}); // fieldId -> { status, answer, evidence, t }
  const [events, setEvents] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [snoozed, setSnoozed] = useState({}); // fieldId -> true (visual only, not complete)
  const [connection, setConnection] = useState("connected"); // connected | patient_left
  const [paused, setPaused] = useState(false);
  const firedRef = useRef(new Set());
  const reminderFired = useRef(false);

  useEffect(() => {
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

  const dismissNotification = (key) => {
    setNotifications((n) => n.filter((x) => x.key !== key));
  };
  const snooze = (fieldId) => setSnoozed((s) => ({ ...s, [fieldId]: true }));

  const confirm = async (fieldId, editedAnswer) => {
    const current = answers[fieldId];
    const answer = editedAnswer ?? current?.answer ?? "";
    await workspaceApi.recordClinicianAction({ sessionId: session.id, fieldId, action: editedAnswer != null ? "edit_confirm" : "confirm", answer });
    setAnswers((a) => ({ ...a, [fieldId]: { ...(a[fieldId] || {}), status: "confirmed", answer, clinicianEdited: editedAnswer != null } }));
    setNotifications((n) => n.filter((x) => x.fieldId !== fieldId));
  };

  const saveEdit = async (fieldId, text) => {
    await workspaceApi.recordClinicianAction({ sessionId: session.id, fieldId, action: "edit", answer: text });
    setAnswers((a) => ({ ...a, [fieldId]: { ...(a[fieldId] || {}), status: "draft", answer: text, clinicianEdited: true } }));
  };

  return {
    elapsed, playhead, answers, questionState, confirmedIds, outstanding, notifications, snoozed, transcript,
    connection, setConnection, paused, setPaused,
    dismissNotification, snooze, confirm, saveEdit,
  };
}