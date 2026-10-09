import React from "react";
import { Mic, Video, PhoneOff, Sparkles, UserRound, Check, CircleDashed } from "lucide-react";

// Static illustration of the real-time workspace (video + live question tracking + populated form).
const rows = [
  { q: "What brings you in today?", a: "Feeling overwhelmed and anxious.", state: "draft" },
  { q: "When did these symptoms begin?", a: "Approximately six months.", state: "confirmed" },
  { q: "Sleep difficulties", a: "Lies awake for hours most nights.", state: "draft" },
  { q: "Thoughts of self-harm", a: null, state: "open" },
];

export default function WorkspacePreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-1.5 border-b border-border bg-secondary/50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border" /><span className="h-2.5 w-2.5 rounded-full bg-border" /><span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-3 text-[11px] text-muted-foreground">Clinical workspace · illustrative preview</span>
      </div>
      <div className="grid grid-cols-[45fr_55fr]">
        <div className="relative flex min-h-[300px] flex-col justify-between bg-gradient-to-br from-[#35564e] to-[#1f2d29] p-3 text-white">
          <div className="flex justify-between text-[10px]">
            <span className="rounded-full bg-black/30 px-2 py-0.5">Patient A.</span>
            <span className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5"><Sparkles className="h-2.5 w-2.5 text-eucalyptus" />AI listening</span>
          </div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10"><UserRound className="h-8 w-8 text-white/70" /></div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="rounded-full bg-white/15 p-1.5"><Mic className="h-3 w-3" /></span>
            <span className="rounded-full bg-white/15 p-1.5"><Video className="h-3 w-3" /></span>
            <span className="rounded-full bg-red-500 p-1.5"><PhoneOff className="h-3 w-3" /></span>
          </div>
        </div>
        <div className="space-y-2 bg-muted/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Adult Intake · 62% documented</p>
          {rows.map((r) => (
            <div key={r.q} className={`rounded-md border bg-white p-2 text-[10px] ${r.state === "open" ? "border-dashed border-amber-300" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.q}</span>
                {r.state === "confirmed" ? <Check className="h-3 w-3 text-primary" /> : r.state === "draft" ? <Sparkles className="h-3 w-3 text-teal" /> : <CircleDashed className="h-3 w-3 text-amber-500" />}
              </div>
              <p className="mt-0.5 text-muted-foreground">{r.a || "Additional information needed"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}