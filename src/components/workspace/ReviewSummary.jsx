import React from "react";
import { ShieldAlert, CircleDashed, CheckCircle2, Mail, Activity } from "lucide-react";
import { allQuestions } from "@/api/templates/adultIntake";

// Left rail of the review modal: what still needs the clinician's attention.
/**
 * @typedef {import("../../api/templates/adultIntake").AnswerStatus} AnswerStatus
 * @param {{
 *   session: { questionState: (id: string) => { status: AnswerStatus } },
 *   therapist?: { name?: string, email?: string } | null,
 *   sessionStatus: string,
 * }} props
 */
export default function ReviewSummary({ session, therapist, sessionStatus }) {
  const required = allQuestions.filter((q) => q.required);
  /** @param {string} id */
  const st = (id) => session.questionState(id).status;
  const confirmed = required.filter((q) => st(q.id) === "confirmed");
  const safetyOpen = required.filter((q) => q.safety && st(q.id) !== "confirmed");
  const unresolved = required.filter((q) => st(q.id) !== "confirmed" && !q.safety);

  return (
    <aside className="space-y-5 text-sm">
      <div className="rounded-lg border border-border bg-white p-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Activity className="h-3.5 w-3.5" />Session status</p>
        <p className="mt-1 font-medium">{sessionStatus}</p>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" />{therapist?.name || "No therapist"} · {therapist?.email || "no email"}</p>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-700"><ShieldAlert className="h-3.5 w-3.5" />Safety items needing attention ({safetyOpen.length})</p>
        {safetyOpen.length === 0 ? <p className="text-xs text-muted-foreground">All safety items confirmed.</p> : (
          <ul className="space-y-1.5">
            {safetyOpen.map((q) => (
              <li key={q.id}><button onClick={() => document.getElementById(`rq-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="w-full rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-left text-xs text-red-800 hover:bg-red-100">{q.label}</button></li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700"><CircleDashed className="h-3.5 w-3.5" />Unresolved required ({unresolved.length})</p>
        <ul className="space-y-1">
          {unresolved.map((q) => (
            <li key={q.id}><button onClick={() => document.getElementById(`rq-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-secondary">{q.label}</button></li>
          ))}
          {unresolved.length === 0 && <li className="text-xs text-muted-foreground">None.</li>}
        </ul>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />{confirmed.length} of {required.length} required confirmed</p>
    </aside>
  );
}