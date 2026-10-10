import React from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";

// Final deliberate approval. Nothing is transmitted until the clinician clicks Send here.
/**
 * @param {{
 *   open: boolean,
 *   therapist?: { name?: string, email?: string } | null,
 *   busy: boolean,
 *   onCancel: () => void,
 *   onSend: () => void | Promise<void>,
 * }} props
 */
export default function HandoffConfirmDialog({ open, therapist, busy, onCancel, onSend }) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send this PDF to {therapist?.name || "the assigned therapist"}?</AlertDialogTitle>
          <AlertDialogDescription>
            The confirmed PDF will be emailed to <span className="font-medium text-foreground">{therapist?.email || "no recipient assigned"}</span>. You will also receive your own copy. The backend will re-check all requirements before anything is sent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button onClick={onSend} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send to Therapist
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}