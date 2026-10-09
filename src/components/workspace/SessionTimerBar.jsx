import React from "react";
import { Clock, ListChecks, HelpCircle } from "lucide-react";
import { formatClock } from "./statusStyles";
import { allQuestions } from "@/api/templates/adultIntake";

// Display only. The backend enforces the 45-minute handoff gate; this bar never decides eligibility.
export default function SessionTimerBar({ session, plannedMinutes, mode }) {
  const total = plannedMinutes * 60;
  const remaining = total - session.elapsed;
  const required = allQuestions.filter((q) => q.required);
  const confirmed = required.filter((q) => session.questionState(q.id).status === "confirmed").length;
  const over = remaining < 0;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-white px-4 py-2 text-xs">
      <span className={`flex items-center gap-1.5 font-medium ${over ? "text-red-700" : remaining < 300 ? "text-amber-700" : "text-foreground"}`}>
        <Clock className="h-3.5 w-3.5" />{over ? "Past planned time" : `${formatClock(remaining)} remaining`}
      </span>
      <span className="text-muted-foreground">Elapsed {formatClock(session.elapsed)} of {plannedMinutes}:00</span>
      <span className="flex items-center gap-1.5 text-muted-foreground"><ListChecks className="h-3.5 w-3.5" />{confirmed}/{required.length} required confirmed</span>
      <span className="flex items-center gap-1.5 text-muted-foreground"><HelpCircle className="h-3.5 w-3.5" />{session.outstanding.length} pending</span>
      <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{mode === "live" ? "Live backend" : "Demo · synthetic data"}</span>
    </div>
  );
}