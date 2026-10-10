import React, { useState } from "react";
import { UserX, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Keeping a draft never sends anything. Discarding needs a second explicit confirmation.
/**
 * @param {{
 *   open: boolean,
 *   canReconnect?: boolean,
 *   onKeep: () => void | Promise<void>,
 *   onDiscard: () => void | Promise<void>,
 *   onReturn: () => void,
 * }} props
 */
export default function PatientLeftModal({ open, canReconnect, onKeep, onDiscard, onReturn }) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  /** @param {() => void | Promise<void>} fn */
  const run = async (fn) => { setBusy(true); await fn(); setBusy(false); setConfirmDiscard(false); };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        {!confirmDiscard ? (
          <>
            <DialogHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><UserX className="h-5 w-5 text-primary" /></div>
              <DialogTitle>The patient has left the session</DialogTitle>
              <DialogDescription>The intake session has ended or been interrupted. Would you like to keep the current documentation draft?</DialogDescription>
            </DialogHeader>
            <p className="rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground">Keeping the draft does not send anything to the therapist. An interrupted session is not treated as a completed intake, and final handoff still requires the backend's required-field and timing checks.</p>
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              <Button disabled={busy} onClick={() => run(onKeep)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Keep Draft for Review</Button>
              {canReconnect && <Button variant="outline" onClick={onReturn}>Return to Session</Button>}
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDiscard(true)}>Discard Draft</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-50"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <DialogTitle>Discard this draft?</DialogTitle>
              <DialogDescription>All drafted answers and clinician confirmations for this session will be lost. This may result in data loss and cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              <Button variant="outline" onClick={() => setConfirmDiscard(false)}>Go Back</Button>
              <Button variant="destructive" disabled={busy} onClick={() => run(onDiscard)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Yes, Discard Draft</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}