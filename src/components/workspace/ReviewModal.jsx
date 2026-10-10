import React, { useState } from "react";
import { Download, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { workspaceApi } from "@/api";
import { isErrorShape } from "@/api/ApiError";
import ReviewDocument from "./ReviewDocument";
import ReviewSummary from "./ReviewSummary";
import HandoffConfirmDialog from "./HandoffConfirmDialog";
import BlockedHandoffAlert from "./BlockedHandoffAlert";

/**
 * @typedef {{ code: string, message: string }} HandoffReason
 * @typedef {{ to: string }} HandoffSent
 * @typedef {import("./applyLiveDrafts").FieldState} FieldState
 */

// "Review Clinical Intake Documentation". Sending needs explicit approval, and the backend
// has the final say: a refusal is shown as-is and the frontend never retries around it.
/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   session: {
 *     questionState: (id: string) => FieldState,
 *     confirmedIds: string[],
 *     elapsed: number,
 *   },
 *   sessionInfo: {
 *     id: string,
 *     therapist: { name?: string, email?: string },
 *     plannedMinutes: number,
 *   },
 *   sessionStatus: string,
 *   onKeepDraft: () => void | Promise<void>,
 * }} props
 */
export default function ReviewModal({ open, onClose, session, sessionInfo, sessionStatus, onKeepDraft }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(/** @type {HandoffReason[] | null} */ (null));
  const [sent, setSent] = useState(/** @type {HandoffSent | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const send = async () => {
    setBusy(true); setError(null);
    try {
      const res = await workspaceApi.requestHandoff({
        sessionId: sessionInfo.id,
        confirmedIds: session.confirmedIds,
        recipientEmail: sessionInfo.therapist.email,
        elapsedSeconds: session.elapsed,
        plannedMinutes: sessionInfo.plannedMinutes,
      });
      if (res.allowed) setSent(res);
      else if ("reasons" in res) setBlocked(res.reasons);
    } catch (e) {
      setError(isErrorShape(e) && e.message ? e.message : null);
    }
    setConfirming(false);
    setBusy(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="flex h-[94vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4 text-left">
            <DialogTitle className="text-lg">Review Clinical Intake Documentation</DialogTitle>
            <DialogDescription>Scroll through every page. Nothing is sent until you approve it.</DialogDescription>
          </DialogHeader>

          {sent ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold">Handoff complete (demo)</h3>
              <p className="max-w-md text-sm text-muted-foreground">The confirmed PDF was sent to {sent.to}. In demo mode no email or PDF is actually generated.</p>
              <Button onClick={onClose}>Close</Button>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr]">
              <div className="overflow-y-auto border-b border-border bg-secondary/30 p-4 lg:border-b-0 lg:border-r">
                <ReviewSummary session={session} therapist={sessionInfo.therapist} sessionStatus={sessionStatus} />
              </div>
              <div className="overflow-y-auto bg-muted/50 p-4 sm:p-6">
                {blocked && <div className="mx-auto mb-4 max-w-3xl"><BlockedHandoffAlert reasons={blocked} onReturn={() => setBlocked(null)} onKeepDraft={() => { setBlocked(null); onKeepDraft(); }} /></div>}
                {error && <p className="mx-auto mb-4 max-w-3xl rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                <ReviewDocument session={session} />
              </div>
            </div>
          )}

          {!sent && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-white px-6 py-3">
              <Button variant="outline" onClick={onClose}>Return to Review</Button>
              <Button variant="outline" disabled title="Download is permitted only when backend policy allows it"><Download className="mr-2 h-4 w-4" />Download PDF</Button>
              <Button onClick={() => setConfirming(true)}><Send className="mr-2 h-4 w-4" />Confirm and Send to Therapist</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <HandoffConfirmDialog open={confirming} therapist={sessionInfo.therapist} busy={busy} onCancel={() => setConfirming(false)} onSend={send} />
    </>
  );
}