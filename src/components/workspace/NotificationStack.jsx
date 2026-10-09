import React from "react";
import { X, ArrowRight, Volume2, BellOff, MessageCircleQuestion, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Compact, discreet cues along the top-right of the document panel. Max 2 shown at once.
export default function NotificationStack({ notifications, onReview, onDismiss, onSnooze, onPlay }) {
  const visible = notifications.slice(-2);
  if (!visible.length) return null;
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-20 flex w-72 flex-col gap-2">
      {visible.map((n) => (
        <div key={n.key} className="pointer-events-auto animate-in slide-in-from-right-4 fade-in rounded-lg border border-border bg-white p-3 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              {n.type === "answered"
                ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                : <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
              <div className="text-xs">
                {n.type === "answered" ? (
                  <>
                    <p className="font-semibold text-foreground">Question answered: {n.label}</p>
                    <p className="mt-0.5 text-muted-foreground">Draft response: {n.ev.answer}</p>
                    <p className="mt-0.5 text-muted-foreground">Evidence: {n.ev.evidence}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">Additional information needed</p>
                    <p className="mt-0.5 text-muted-foreground">Question: {n.followUp}</p>
                  </>
                )}
              </div>
            </div>
            <button onClick={() => onDismiss(n.key)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
            {n.type === "answered" ? (
              <Button size="sm" className="h-7 text-xs" onClick={() => { onReview(n.fieldId); onDismiss(n.key); }}>Review Answer<ArrowRight className="ml-1 h-3 w-3" /></Button>
            ) : (
              <>
                <Button size="sm" className="h-7 text-xs" onClick={() => { onReview(n.fieldId); onDismiss(n.key); }}>Ask This Question</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onPlay(n.fieldId)}><Volume2 className="mr-1 h-3 w-3" />Play</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { onSnooze(n.fieldId); onDismiss(n.key); }}><BellOff className="mr-1 h-3 w-3" />Later</Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}