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

// Live mode joins the session's Daily room. The clinician mic also streams to realtime speech-to-text.
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
  const [sttError, setSttError] = useState("");
  const [listening, setListening] = useState(false);
  const [call, setCall] = useState(/** @type {DailyCall | null} */ (null));
  const [roomUrl, setRoomUrl] = useState("");
  const [callError, setCallError] = useState("");
  const [people, setPeople] = useState(/** @type {DailyParticipant[]} */ ([]));
  const [waiting, setWaiting] = useState(/** @type {Array<{ id: string, name: string }>} */ ([]));
  const [copied, setCopied] = useState(false);
  const patient = people.find((p) => !p.local);
  const patientAudio = patient?.tracks.audio.state === "playable" ? patient.tracks.audio.persistentTrack : undefined;
  const stopRef = useRef(/** @type {{ stop: () => void } | null} */ (null));
  const startedAtRef = useRef(sessionInfo?.startedAt || Date.now());
  const leftRef = useRef(onSimulateDisconnect);
  leftRef.current = onSimulateDisconnect;

  useEffect(() => {
    startedAtRef.current = sessionInfo?.startedAt || Date.now();
  }, [sessionInfo?.startedAt]);

  useEffect(() => {
    let cancelled = false;

    const stop = () => {
      stopRef.current?.stop();
      stopRef.current = null;
      setListening(false);
      setPartial("");
    };

    if (!mic || !live || !liveMode || session.paused) {
      stop();
      return undefined;
    }

    (async () => {
      setSttError("");
      try {
        const { wsUrl } = await workspaceApi.getSttToken();
        if (cancelled) return;
        const handle = await startRealtimeStt({
          wsUrl,
          onPartial: (text) => setPartial(text),
          onCommitted: (text) => {
            setPartial("");
            const t = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
            onCommittedTranscript?.({ t, speaker: "Clinician", text });
          },
          onError: (err) => setSttError(err.message),
          onClose: () => {
            if (!cancelled) setListening(false);
          },
        });
        if (cancelled) {
          handle.stop();
          return;
        }
        stopRef.current = handle;
        setListening(true);
      } catch (err) {
        if (!cancelled) {
          setSttError(isErrorShape(err) && err.message ? err.message : "Could not start speech-to-text");
          setListening(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [mic, live, liveMode, session.paused, onCommittedTranscript]);

  // The patient's Daily track, not the laptop mic. The mic button does not start or stop this stream.
  useEffect(() => {
    if (!liveMode || !live || session.paused || !patientAudio) return undefined;
    let cancelled = false;
    /** @type {{ stop: () => void } | null} */
    let handle = null;

    (async () => {
      try {
        const { wsUrl } = await workspaceApi.getSttToken();
        if (cancelled) return;
        handle = await startRealtimeStt({
          wsUrl,
          track: patientAudio,
          onCommitted: (text) => {
            const t = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
            onCommittedTranscript?.({ t, speaker: "Patient", text });
          },
        });
        if (cancelled) handle.stop();
      } catch {
        // The clinician mic stream reports its own failure. This one just stops.
      }
    })();

    return () => {
      cancelled = true;
      handle?.stop();
    };
  }, [liveMode, live, session.paused, patientAudio, onCommittedTranscript]);

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
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2f4a43] to-[#1d2b27]">
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
            {listening ? "Listening" : "AI idle"}
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

        {(partial || sttError) && (
          <div className="absolute bottom-28 left-3 right-3 max-w-md rounded-lg bg-black/55 px-3 py-2 text-xs backdrop-blur">
            {sttError ? <p className="text-red-200">{sttError}</p> : <p className="text-white/85"><span className="text-white/50">Live · </span>{partial}</p>}
          </div>
        )}

        <div className="absolute bottom-3 right-3 flex h-24 w-36 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-[#3a5a52] shadow-lg">
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
