import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldAlert, ClipboardList, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/components/ui/use-toast";
import { workspaceApi } from "@/api";
import { isErrorShape } from "@/api/ApiError";
import { getMode } from "@/api/config";
import useIntakeSession from "@/components/workspace/useIntakeSession";
import VideoPane from "@/components/workspace/VideoPane";
import DocumentHeader from "@/components/workspace/DocumentHeader";
import ClinicalDocument from "@/components/workspace/ClinicalDocument";
import NotificationStack from "@/components/workspace/NotificationStack";
import OutstandingQueue from "@/components/workspace/OutstandingQueue";
import SessionTimerBar from "@/components/workspace/SessionTimerBar";
import PatientLeftModal from "@/components/workspace/PatientLeftModal";
import ReviewModal from "@/components/workspace/ReviewModal";
import ClinicalDecisionSupport from "@/components/workspace/ClinicalDecisionSupport";

// The most important screen: video on the left (~45%), the live standardized document on the right (~55%).
/**
 * @typedef {{
 *   id: string,
 *   patientLabel: string,
 *   therapist: { name: string, email: string },
 *   plannedMinutes: number,
 *   startedAt?: number,
 * }} WorkspaceInfo
 */

export default function Workspace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [info, setInfo] = useState(/** @type {WorkspaceInfo | null} */ (null));
  const [error, setError] = useState(/** @type {import("@/api/ApiError").ErrorShape | null} */ (null));
  const [highlightId, setHighlightId] = useState(/** @type {string | null} */ (null));
  const [focusMode, setFocusMode] = useState(false);
  const [clinicianTab, setClinicianTab] = useState("intake");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("In progress");

  useEffect(() => {
    workspaceApi
      .createSession({
        templateId: "adult-intake-v1",
        therapistName: "Dr. Rowan Ellis",
        therapistEmail: "therapist@example.com",
        ...(getMode() === "live" ? { live: true } : {}),
      })
      .then((session) => setInfo({
        ...session,
        patientLabel: session.patientLabel.replaceAll(" (synthetic)", ""),
        therapist: { ...session.therapist, name: session.therapist.name.replaceAll(" (synthetic)", "") },
      }))
      .catch((/** @type {unknown} */ reason) => {
        setError(isErrorShape(reason) ? reason : { message: "Could not start the session." });
      });
  }, []);

  const session = useIntakeSession(info);

  const jumpTo = useCallback((/** @type {string} */ id) => {
    setClinicianTab("intake");
    setHighlightId(id);
    document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 3500);
  }, []);

  const openReview = () => {
    setReviewOpen(true);
    session.requestFinalPass();
  };

  const keepDraft = async () => {
    if (!info) return;
    await workspaceApi.retainDraft({ sessionId: info.id });
    setSessionStatus("Incomplete draft retained for review (not sent)");
    session.setConnection("connected");
    session.setPaused(true);
    setReviewOpen(false);
    toast({ title: "Draft kept for review", description: "Nothing was sent to the therapist." });
  };
  const discardDraft = async () => {
    if (!info) return;
    await workspaceApi.discardDraft({ sessionId: info.id });
    navigate("/app");
  };

  if (error) return <div className="p-8 text-sm text-destructive">{error.message}</div>;
  if (!info) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const clinicianTabs = [
    { id: "risk", title: "Risk Assessment", Icon: ShieldAlert },
    { id: "intake", title: "Intake Form", Icon: ClipboardList },
    { id: "diagnosis", title: "Diagnostic Assessment", Icon: BrainCircuit },
  ];
  const docPanel = (
    <div className="relative flex h-full min-h-0 flex-col bg-muted/40">
      <div className="shrink-0 border-b border-border bg-white px-3 pt-3">
        <div role="tablist" aria-label="Clinician workspace views" className="flex gap-2 overflow-x-auto pb-3">
          {clinicianTabs.map(({ id, title, Icon }) => (
            <Button key={id} size="sm" type="button" role="tab" aria-selected={clinicianTab === id}
              variant={clinicianTab === id ? "default" : "outline"} onClick={() => setClinicianTab(id)}
              className="shrink-0">
              <Icon className="mr-1.5 h-4 w-4" />{title}
            </Button>
          ))}
        </div>
        {getMode() === "mock" && (
          <p role="status" className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
            DEMO PLAYBACK: Answers and notifications are prerecorded synthetic examples, not live patient speech. Switch to Live in Connection settings to test transcription.
          </p>
        )}
      </div>
      <div role="tabpanel" aria-label="Intake Form" hidden={clinicianTab !== "intake"}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${clinicianTab !== "intake" ? "hidden" : ""}`}>
        <DocumentHeader session={session} focusMode={focusMode} onToggleFocus={() => setFocusMode(f => !f)} onPreview={openReview} />
        <OutstandingQueue outstanding={session.outstanding} snoozed={session.snoozed} onJump={jumpTo} />
        <div className="p-4 sm:p-6"><ClinicalDocument session={session} highlightId={highlightId} /></div>
      </div>
      <div role="tabpanel" aria-label="Risk Assessment" hidden={clinicianTab !== "risk"}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${clinicianTab !== "risk" ? "hidden" : ""}`}>
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          <ClinicalDecisionSupport key={`risk-${info.id}`} section="risk" session={session} onJump={jumpTo} />
        </div>
      </div>
      <div role="tabpanel" aria-label="Diagnostic Assessment" hidden={clinicianTab !== "diagnosis"}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${clinicianTab !== "diagnosis" ? "hidden" : ""}`}>
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          <ClinicalDecisionSupport key={`diagnosis-${info.id}`} section="diagnosis" session={session} onJump={jumpTo} />
        </div>
      </div>
      {clinicianTab === "intake" && (
        <NotificationStack notifications={session.notifications} onReview={jumpTo} onDismiss={session.dismissNotification} onSnooze={session.snooze} />
      )}
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app")}><ArrowLeft className="mr-1 h-4 w-4" />Dashboard</Button>
        <p className="text-sm font-medium">{info.patientLabel} · Adult Intake</p>
        <span className="w-24 text-right text-xs text-muted-foreground">{sessionStatus === "In progress" ? "" : "Draft"}</span>
      </div>
      <SessionTimerBar session={session} plannedMinutes={info.plannedMinutes} />

      <div className="min-h-0 flex-1">
        {focusMode ? (
          docPanel
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={45} minSize={25}>
              <VideoPane
                session={session}
                sessionInfo={info}
                patientLabel={info.patientLabel}
                onEnd={openReview}
                onSimulateDisconnect={() => session.setConnection("patient_left")}
                onCommittedTranscript={session.appendTranscriptLine}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={55} minSize={30}>{docPanel}</ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      <PatientLeftModal
        open={session.connection === "patient_left"}
        canReconnect
        onKeep={keepDraft}
        onDiscard={discardDraft}
        onReturn={() => session.setConnection("connected")}
      />
      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        session={session}
        sessionInfo={info}
        sessionStatus={sessionStatus}
        onKeepDraft={keepDraft}
      />
    </div>
  );
}