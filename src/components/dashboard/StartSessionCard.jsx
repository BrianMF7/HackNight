import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, LogIn, Video, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

// Retain the existing session-entry behavior; presentation only is changed.
export default function StartSessionCard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join/demo-session-001`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Could not copy invitation", description: "Select the link and copy it manually." });
    }
  };

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <button type="button" onClick={() => setInvite(true)} className="group flex min-h-[180px] flex-col items-start justify-between rounded-xl bg-primary p-6 text-left text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <span className="flex w-full items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 bg-white/10"><Play className="h-5 w-5" aria-hidden="true" /></span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xl font-semibold tracking-tight">Start a new intake</span>
            <span className="mt-1 block text-sm text-primary-foreground/85">Open a guided session and clinician workspace</span>
          </span>
        </button>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <button type="button" onClick={() => setJoinOpen(true)} className="group flex min-h-[82px] items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <LogIn className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Join a session</span><span className="block text-xs text-muted-foreground">Enter an invitation link or code</span></span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => toast({ title: "Zoom Companion is coming soon", description: "A packaged Zoom app does not exist yet. Open the Zoom companion demo view to preview it." })} className="group flex min-h-[82px] items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Video className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Zoom Companion</span><span className="block text-xs text-muted-foreground">Coming soon · Preview available</span></span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Dialog open={invite} onOpenChange={setInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session ready</DialogTitle>
            <DialogDescription>Share this invitation with the patient. Demo link only; no real patient video transport is connected yet.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={link} aria-label="Demo session invitation link" />
            <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link">{copied ? <Check /> : <Copy />}</Button>
          </div>
          <Button onClick={() => navigate("/app/workspace")}>Open Clinical Workspace</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join existing session</DialogTitle>
            <DialogDescription>Paste an invitation link or session code.</DialogDescription>
          </DialogHeader>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Invitation link or code" aria-label="Invitation link or session code" />
          <Button disabled={!code.trim()} onClick={() => navigate("/app/workspace")}>Join (demo)</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
