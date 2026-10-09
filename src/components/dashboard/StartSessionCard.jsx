import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle, LogIn, Video, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

// Primary actions: start a web session, join one, or open the Zoom companion (coming soon).
export default function StartSessionCard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join/demo-session-001`;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={() => setInvite(true)} className="group rounded-xl border border-border bg-primary p-5 text-left text-primary-foreground shadow-sm transition hover:shadow-md">
          <PlayCircle className="h-6 w-6" />
          <p className="mt-3 font-semibold">Start New Session</p>
          <p className="text-xs text-primary-foreground/80">Web video + live documentation</p>
        </button>
        <button onClick={() => setJoinOpen(true)} className="rounded-xl border border-border bg-white p-5 text-left shadow-sm transition hover:shadow-md">
          <LogIn className="h-6 w-6 text-primary" />
          <p className="mt-3 font-semibold">Join Existing Session</p>
          <p className="text-xs text-muted-foreground">Enter an invitation link or code</p>
        </button>
        <button onClick={() => toast({ title: "Zoom Companion is coming soon", description: "A packaged Zoom app does not exist yet. Open the Zoom companion demo view to preview it." })} className="rounded-xl border border-border bg-white p-5 text-left shadow-sm transition hover:shadow-md">
          <Video className="h-6 w-6 text-primary" />
          <p className="mt-3 font-semibold">Launch Zoom Companion</p>
          <p className="text-xs text-muted-foreground">Coming soon · demo available</p>
        </button>
      </div>

      <Dialog open={invite} onOpenChange={setInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session ready</DialogTitle>
            <DialogDescription>Share this invitation with the patient. Demo link only; no real patient video transport is connected yet.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={link} />
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
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Invitation link or code" />
          <Button disabled={!code.trim()} onClick={() => navigate("/app/workspace")}>Join (demo)</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}