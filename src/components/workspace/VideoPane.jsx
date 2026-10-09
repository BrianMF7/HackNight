import React, { useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Sparkles, User, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClock } from "./statusStyles";
import ChatPanel from "./ChatPanel";

// DEMO VIDEO PLACEHOLDER. No real two-person transport is connected yet.
// This pane is modular: swap the <PatientFeed/> block for a real WebRTC/video provider later.
export default function VideoPane({ session, patientLabel, onEnd, onSimulateDisconnect }) {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [chat, setChat] = useState(false);
  const live = session.connection === "connected";

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--foreground))] text-white">
      <div className="relative flex-1 overflow-hidden">
        {/* PatientFeed: demo placeholder */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2f4a43] to-[#1d2b27]">
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/10"><UserRound className="h-12 w-12 text-white/70" /></div>
            <p className="mt-3 text-sm font-medium">{patientLabel}</p>
            <p className="text-xs text-white/60">Demo video placeholder · no live transport connected</p>
          </div>
        </div>

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs backdrop-blur">{patientLabel}</span>
          <span className={`flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs backdrop-blur`}>
            <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-red-400"}`} />{live ? "In session" : "Disconnected"}
          </span>
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-black/40 px-2.5 py-1 font-mono text-xs backdrop-blur">{formatClock(session.elapsed)}</span>
          <span className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs backdrop-blur"><Sparkles className="h-3 w-3 text-eucalyptus" />AI listening</span>
        </div>

        {/* Clinician self view */}
        <div className="absolute bottom-3 right-3 flex h-24 w-36 items-center justify-center rounded-xl border border-white/20 bg-[#3a5a52] shadow-lg">
          {cam ? <div className="text-center"><User className="mx-auto h-7 w-7 text-white/70" /><p className="mt-1 text-[10px] text-white/70">You (demo)</p></div>
            : <VideoOff className="h-6 w-6 text-white/50" />}
        </div>

        {chat && <ChatPanel onClose={() => setChat(false)} />}
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-black/30 px-3 py-3">
        <Button size="icon" variant="secondary" onClick={() => setMic((m) => !m)} aria-label="Toggle microphone" className={mic ? "" : "bg-red-100 text-red-700"}>{mic ? <Mic /> : <MicOff />}</Button>
        <Button size="icon" variant="secondary" onClick={() => setCam((c) => !c)} aria-label="Toggle camera" className={cam ? "" : "bg-red-100 text-red-700"}>{cam ? <Video /> : <VideoOff />}</Button>
        <Button size="icon" variant="secondary" onClick={() => setChat((c) => !c)} aria-label="Toggle chat"><MessageSquare /></Button>
        <Button variant="destructive" onClick={onEnd} className="gap-2"><PhoneOff />End Call</Button>
        <Button size="sm" variant="ghost" className="ml-2 text-[11px] text-white/60 hover:bg-white/10 hover:text-white" onClick={onSimulateDisconnect}>Simulate patient leaving</Button>
      </div>
    </div>
  );
}