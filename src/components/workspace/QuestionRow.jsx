import React, { useState } from "react";
import { Check, Pencil, Sparkles, ShieldAlert, Quote, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { statusStyles } from "./statusStyles";
import { PHQ_CATEGORIES } from "@/api/templates/adultIntake";

// One fixed question in the clinical document. The label never changes; only the response does.
/**
 * @typedef {import("../../api/templates/adultIntake").IntakeQuestion} IntakeQuestion
 * @typedef {import("./applyLiveDrafts").FieldState} FieldState
 * @param {{
 *   q: IntakeQuestion,
 *   state: FieldState,
 *   highlighted?: boolean,
 *   snoozed?: boolean,
 *   onConfirm: (fieldId: string, editedAnswer?: string) => void | Promise<void>,
 *   onSaveEdit: (fieldId: string, text: string) => void | Promise<void>,
 *   onPlay: (fieldId: string) => void | Promise<void>,
 *   readOnly?: boolean,
 * }} props
 */
export default function QuestionRow({ q, state, highlighted, snoozed, onConfirm, onSaveEdit, onPlay, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const st = statusStyles[state.status];
  const answered = state.status !== "not_answered";

  /** @param {() => void | Promise<void>} fn */
  const run = async (fn) => { setBusy(true); await fn(); setBusy(false); };

  return (
    <div
      id={`q-${q.id}`}
      className={`relative rounded-lg border bg-white p-4 transition-shadow ${highlighted ? "ring-2 ring-primary/40 shadow-md" : ""} ${!answered && q.required && !snoozed ? "border-dashed border-amber-300/80 bg-amber-50/30" : "border-border"}`}
    >
      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${st.bar}`} />
      <div className="flex flex-wrap items-start justify-between gap-2 pl-2">
        <div>
          <p className="text-[11px] font-mono text-muted-foreground">{q.id}{q.required ? " · Required" : ""}</p>
          <p className="text-sm font-medium text-foreground">{q.label}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {q.safety && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700"><ShieldAlert className="h-3 w-3" />Safety</span>}
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.badge}`}>{st.label}</span>
        </div>
      </div>

      {q.phq && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 pl-2 sm:grid-cols-4">
          {PHQ_CATEGORIES.map((c) => (
            <div key={c} className={`rounded-md border px-2 py-1.5 text-center text-[11px] ${state.category === c || (state.status === "confirmed" && state.answer === c) ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border text-muted-foreground"}`}>
              {c}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pl-2">
        {editing ? (
          <div className="space-y-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" disabled={busy || !text.trim()} onClick={() => run(async () => { await onSaveEdit(q.id, text.trim()); setEditing(false); })}>Save edit</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : answered ? (
          <div className="space-y-2">
            <p className="flex items-start gap-1.5 text-sm text-foreground">
              {state.status !== "confirmed" && <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-label="AI draft" />}
              <span>{state.answer}</span>
            </p>
            {state.evidence && (
              <p className="flex items-start gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                <Quote className="mt-0.5 h-3 w-3 shrink-0" />
                <span><span className="font-medium">Evidence:</span> {state.evidence}</span>
              </p>
            )}
            {state.clinicianEdited && <p className="text-[11px] text-muted-foreground">Edited by clinician</p>}
            {!readOnly && (
              <div className="flex flex-wrap gap-2 pt-1">
                {state.status !== "confirmed" && (
                  <Button size="sm" disabled={busy} onClick={() => run(() => onConfirm(q.id))}><Check className="mr-1 h-3.5 w-3.5" />Confirm</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setText(state.answer || ""); setEditing(true); }}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm italic text-muted-foreground">No supported answer yet. Left blank.</p>
            {!readOnly && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => onPlay(q.id)} aria-label="Play question"><Volume2 className="mr-1 h-3.5 w-3.5" />Play Question</Button>
                <Button size="sm" variant="outline" onClick={() => { setText(""); setEditing(true); }}><Pencil className="mr-1 h-3.5 w-3.5" />Enter answer</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}