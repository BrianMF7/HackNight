import React from "react";
import { adultIntake } from "@/api/templates/adultIntake";
import QuestionRow from "./QuestionRow";

// Renders the FIXED template as a paged, PDF-like document. Structure never changes per patient.
/**
 * @param {{
 *   session: {
 *     questionState: (id: string) => import("./applyLiveDrafts").FieldState,
 *     snoozed: { [fieldId: string]: boolean | undefined },
 *     confirm: (fieldId: string, editedAnswer?: string) => void | Promise<void>,
 *     saveEdit: (fieldId: string, text: string) => void | Promise<void>,
 *   },
 *   highlightId: string | null,
 *   readOnly?: boolean,
 *   onPlay: (fieldId: string) => void | Promise<void>,
 *   pageFilter?: number,
 * }} props
 */
export default function ClinicalDocument({ session, highlightId, readOnly, onPlay, pageFilter }) {
  const pages = pageFilter ? adultIntake.pages.filter((p) => p.page === pageFilter) : adultIntake.pages;
  return (
    <div className="space-y-6">
      {pages.map((p) => (
        <article key={p.page} id={`page-${p.page}`} className="mx-auto max-w-3xl rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-5 flex items-end justify-between border-b border-border pb-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Standardized form</p>
              <h3 className="text-base font-semibold text-foreground">{adultIntake.title}</h3>
            </div>
            <span className="text-xs text-muted-foreground">Page {p.page} of {adultIntake.pages.length}</span>
          </header>
          <div className="space-y-7">
            {p.sections.map((s) => (
              <section key={s.id} id={s.id}>
                <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-primary">{s.title}</h4>
                {s.note && <p className="mb-3 text-xs text-muted-foreground">{s.note}</p>}
                <div className="space-y-3">
                  {s.questions.map((q) => (
                    <QuestionRow
                      key={q.id}
                      q={q}
                      state={session.questionState(q.id)}
                      highlighted={highlightId === q.id}
                      snoozed={session.snoozed[q.id]}
                      onConfirm={session.confirm}
                      onSaveEdit={session.saveEdit}
                      onPlay={onPlay}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}