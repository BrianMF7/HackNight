import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Sparkles, User, UserRound, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workspaceApi } from "@/api";
import { getMode } from "@/api/config";
import { isErrorShape } from "@/api/ApiError";
import { startRealtimeStt } from "@/lib/realtimeStt";
import { formatClock } from "./statusStyles";
import { chatEntry, chatMessage } from "./dailyChat";
import ChatPanel from "./ChatPanel";

/**
 * @typedef {{ t: number, speaker: string, text: string }} TranscriptLine
 * @typedef {{ from: string, text: string }} ChatLine
 * @typedef {import("@daily-co/daily-js").DailyCall} DailyCall
 * @typedef {import("@daily-co/daily-js").DailyParticipant} DailyParticipant
 */

/** @param {DailyParticipant | undefined} p */
const playableVideo = (p) => (p?.tracks.video.state === "playable" ? p.tracks.video.persistentTrack : undefined);

/** @param {{ video?: MediaStreamTrack, audio?: MediaStreamTrack, className: string }} props */
function CallVideo({ video, audio, className }) {
  const ref = useRef(/** @type {HTMLVideoElement | null} */ (null));
  useEffect(() => {
    const tracks = [video, audio].filter((t) => t !== undefined);
    if (ref.current) ref.current.srcObject = tracks.length ? new MediaStream(tracks) : null;
  }, [video, audio]);
  return <video ref={ref} autoPlay playsInline muted={!audio} className={className} />;
}

// Patient speech is captioned for the clinician. The host mic is transcribed only to detect
// which intake question was asked, and those lines stay off the caption.
const STT_RETRY_MS = 1000;

/**
 * One speech-to-text socket while `active`. A close mints a new token and keeps the audio graph.
 * @param {{
 *   active: boolean,
 *   track?: MediaStreamTrack,
 *   onPartial?: (text: string) => void,
 *   onCommitted?: (text: string) => void,
 *   onListening?: (on: boolean) => void,
 *   onError?: (err: unknown) => void,
 * }} opts
 */
function useLiveStt({ active, track, onPartial, onCommitted, onListening, onError }) {
  const cb = useRef({ onPartial, onCommitted, onListening, onError });
  cb.current = { onPartial, onCommitted, onListening, onError };
  useEffect(() => {
    if (!active) {
      cb.current.onListening?.(false);
      cb.current.onPartial?.("");
      return undefined;
    }
    let cancelled = false;
    /** @type {{ stop: () => void } | null} */
    let handle = null;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let retry;
    /** @type {(value?: unknown) => void} */
    let finishRetry = () => {};

    const start = async () => {
      while (!cancelled) {
        try {
          const { wsUrl } = await workspaceApi.getSttToken();
          if (cancelled) return;
          handle = await startRealtimeStt({
            wsUrl,
            ...(track ? { track } : {}),
            nextWsUrl: async () => (await workspaceApi.getSttToken()).wsUrl,
            onPartial: (text) => cb.current.onPartial?.(text),
            onCommitted: (text) => cb.current.onCommitted?.(text),
            onError: (err) => cb.current.onError?.(err),
          });
          if (cancelled) {
            handle.stop();
            return;
          }
          cb.current.onListening?.(true);
          return;
        } catch (err) {
          if (cancelled) return;
          handle = null;
          cb.current.onListening?.(false);
          cb.current.onError?.(err);
          await new Promise((resolve) => {
            finishRetry = resolve;
            retry = setTimeout(resolve, STT_RETRY_MS);
          });
        }
      }
    };
    void start();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      finishRetry();
      handle?.stop();
      cb.current.onListening?.(false);
    };
  }, [active, track]);
}
/**
 * @param {{
 *   session: { connection: "connected" | "patient_left", paused: boolean, elapsed: number },
 *   sessionInfo?: { id?: string, startedAt?: number, therapist?: { name?: string } } | null,
 *   patientLabel: string,
 *   onEnd: () => void,
 *   onSimulateDisconnect: () => void,
 *   onCommittedTranscript?: (line: TranscriptLine) => void | Promise<void>,
 * }} props
 */
export default function VideoPane({
  session,
  sessionInfo,
  patientLabel,
  onEnd,
  onSimulateDisconnect,
  onCommittedTranscript,
}) {
  const live = session.connection === "connected";
  const liveMode = getMode() === "live";
  const sessionId = sessionInfo?.id;
  const userName = sessionInfo?.therapist?.name || "Clinician";
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [chat, setChat] = useState(false);
  const [msgs, setMsgs] = useState(/** @type {ChatLine[]} */ ([]));
  const [partial, setPartial] = useState("");
  const [patientLines, setPatientLines] = useState(/** @type {string[]} */ ([]));
  const [sttError, setSttError] = useState("");
  const [listening, setListening] = useState(false);
  const [call, setCall] = useState(/** @type {DailyCall | null} */ (null));
  const [roomUrl, setRoomUrl] = useState("");
  const [callError, setCallError] = useState("");
  const [people, setPeople] = useState(/** @type {DailyParticipant[]} */ ([]));
  const [waiting, setWaiting] = useState(/** @type {Array<{ id: string, name: string }>} */ ([]));
  const [copied, setCopied] = useState(false);
  const patient = people.find((p) => !p.local);
  const localPerson = people.find((p) => p.local);
  const patientAudio = patient?.tracks.audio.state === "playable" ? patient.tracks.audio.persistentTrack : undefined;
  const hostAudio = localPerson?.tracks.audio.state === "playable" ? localPerson.tracks.audio.persistentTrack : undefined;
  const startedAtRef = useRef(sessionInfo?.startedAt || Date.now());
  const leftRef = useRef(onSimulateDisconnect);
  const transcriptRef = useRef(onCommittedTranscript);
  leftRef.current = onSimulateDisconnect;
  transcriptRef.current = onCommittedTranscript;
  const commitAt = () => Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));

  useLiveStt({
    active: liveMode && live && !session.paused && Boolean(patientAudio),
    track: patientAudio,
    onPartial: setPartial,
    onCommitted: (text) => {
      setPartial("");
      setPatientLines((lines) => [...lines, text].slice(-8));
      transcriptRef.current?.({ t: commitAt(), speaker: "Patient", text });
    },
    onListening: (on) => {
      setListening(on);
      if (on) setSttError("");
    },
    onError: (err) => setSttError(err instanceof Error && err.message ? err.message : "Could not transcribe the patient"),
  });
  // Host mic selects the question. It is not the patient and does not enter the caption.
  useLiveStt({
    active: liveMode && live && !session.paused && mic && Boolean(hostAudio || callError),
    track: hostAudio,
    onCommitted: (text) => {
      transcriptRef.current?.({ t: commitAt(), speaker: "Clinician", text });
    },
  });

  useEffect(() => {
    startedAtRef.current = sessionInfo?.startedAt || Date.now();
  }, [sessionInfo?.startedAt]);

  // Any failure here (e.g. no DAILY_API_KEY) leaves mic-only live mode exactly as it was.
  useEffect(() => {
    if (!liveMode || !sessionId) return undefined;
    let cancelled = false;
    /** @type {DailyCall | null} */
    let created = null;

    (async () => {
      try {
        const { roomUrl: url, token } = await workspaceApi.startCall({ sessionId });
        const { default: Daily } = await import("@daily-co/daily-js");
        if (cancelled) return;
        const c = Daily.createCallObject();
        created = c;
        const syncPeople = () => setPeople(Object.values(c.participants()));
        const syncWaiting = () => setWaiting(Object.values(c.waitingParticipants()));
        c.on("participant-joined", syncPeople)
          .on("participant-updated", syncPeople)
          .on("track-started", syncPeople)
          .on("track-stopped", syncPeople)
          .on("participant-left", (ev) => {
            syncPeople();
            if (!ev.participant.local) leftRef.current();
          })
          .on("waiting-participant-added", syncWaiting)
          .on("waiting-participant-updated", syncWaiting)
          .on("waiting-participant-removed", syncWaiting)
          .on("app-message", (ev) => {
            const line = chatEntry(ev.data);
            if (!line) return;
            setMsgs((m) => [...m, line]);
            setChat(true);
          })
          .on("left-meeting", () => {
            setCall(null);
            setRoomUrl("");
            setPeople([]);
            setWaiting([]);
          });
        await c.join({ url, token, userName });
        if (cancelled) return;
        syncPeople();
        setCall(c);
        setRoomUrl(url);
      } catch (err) {
        if (cancelled) return;
        // A failed join can still hold the camera; release it now, not on unmount.
        created?.destroy();
        created = null;
        setCallError(isErrorShape(err) && err.message ? err.message : "Could not start the video call.");
      }
    })();

    return () => {
      cancelled = true;
      created?.destroy();
    };
  }, [liveMode, sessionId]);

  useEffect(() => {
    call?.setLocalAudio(mic).setLocalVideo(cam);
  }, [call, mic, cam]);

  const patientVideo = playableVideo(patient);
  const selfVideo = cam ? playableVideo(people.find((p) => p.local)) : undefined;
  const knocking = waiting[0];
  const feedNote = !liveMode
    ? ""
    : call
      ? patient ? "Patient camera is off" : "Copy the patient link, then admit them when they knock"
      : callError ? `Mic only · ${callError}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  /** @param {string} text */
  const sendChat = (text) => {
    call?.sendAppMessage(chatMessage(text, userName), "*");
    setMsgs((m) => [...m, { from: "You", text }]);
  };

  const endCall = () => {
    call?.leave();
    onEnd();
  };

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--foreground))] text-white">
      <div className="relative flex-1 overflow-hidden">
        {patient && <CallVideo video={patientVideo} audio={patient.tracks.audio.persistentTrack} className="absolute inset-0 h-full w-full object-cover" />}
        {!patientVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1C3144]">
            <div className="text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/10"><UserRound className="h-12 w-12 text-white/70" /></div>
              <p className="mt-3 text-sm font-medium">{patientLabel}</p>
              {feedNote && <p className="text-xs text-white/60">{feedNote}</p>}
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs backdrop-blur">{patientLabel}</span>
          <span className={`flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs backdrop-blur`}>
            <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-red-400"}`} />{live ? "In session" : "Disconnected"}
          </span>
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-black/40 px-2.5 py-1 font-mono text-xs backdrop-blur">{formatClock(session.elapsed)}</span>
          <span className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs backdrop-blur">
            <Sparkles className="h-3 w-3 text-eucalyptus" />
            {listening ? "Patient" : "Waiting for patient"}
          </span>
        </div>

        {/* Right side, so the chat panel on the left never covers the link or the admit button. */}
        <div className="absolute right-3 top-14 flex flex-col items-end gap-2">
          {roomUrl && (
            <button onClick={copyLink} className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs backdrop-blur hover:bg-black/60">
              <Link2 className="h-3 w-3" />{copied ? "Copied" : "Copy patient link"}
            </button>
          )}
          {knocking && (
            <Button size="sm" onClick={() => call?.updateWaitingParticipant(knocking.id, { grantRequestedAccess: true })}>
              Admit {knocking.name || "patient"}
            </Button>
          )}
        </div>

        {(patientLines.length > 0 || partial || sttError) && (
          <div className="absolute bottom-28 left-3 max-w-md rounded-lg bg-black/55 px-3 py-2 text-xs backdrop-blur">
            <p className="text-[10px] uppercase tracking-wide text-white/50">Patient transcript · clinician only</p>
            {patientLines.map((line, index) => (
              <p key={`${index}-${line.slice(0, 24)}`} className="mt-1 text-white/85">{line}</p>
            ))}
            {partial && <p className="mt-1 text-white/60">{partial}</p>}
            {sttError && <p className="mt-1 text-red-200">{sttError}</p>}
          </div>
        )}

        <div className="absolute bottom-3 right-3 flex h-24 w-36 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-[#5F7383] shadow-lg">
          {selfVideo ? <CallVideo video={selfVideo} className="h-full w-full -scale-x-100 object-cover" />
            : cam ? <div className="text-center"><User className="mx-auto h-7 w-7 text-white/70" /><p className="mt-1 text-[10px] text-white/70">You</p></div>
            : <VideoOff className="h-6 w-6 text-white/50" />}
        </div>

        {chat && <ChatPanel messages={msgs} onSend={sendChat} onClose={() => setChat(false)} />}
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-black/30 px-3 py-3">
        <Button size="icon" variant="secondary" onClick={() => setMic((m) => !m)} aria-label="Toggle microphone" className={mic ? "" : "bg-red-100 text-red-700"}>{mic ? <Mic /> : <MicOff />}</Button>
        <Button size="icon" variant="secondary" onClick={() => setCam((c) => !c)} aria-label="Toggle camera" className={cam ? "" : "bg-red-100 text-red-700"}>{cam ? <Video /> : <VideoOff />}</Button>
        <Button size="icon" variant="secondary" onClick={() => setChat((c) => !c)} aria-label="Toggle chat"><MessageSquare /></Button>
        <Button variant="destructive" onClick={endCall} className="gap-2"><PhoneOff />End Call</Button>
      </div>
    </div>
  );
}
