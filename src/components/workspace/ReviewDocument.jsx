import React from "react";
import { adultIntake } from "@/api/templates/adultIntake";
import { statusStyles } from "./statusStyles";

// Read-only full PDF preview used by the end-of-session review. Same fixed template pages.
export default function ReviewDocument({ session }) {
  return (
    <div className="space-y-6">
      {adultIntake.pages.map((p) => (
        <article key={p.page} className="mx-auto max-w-3xl rounded-sm border border-border bg-white p-8 shadow-md">
          <header className="mb-5 flex items-end justify-between border-b-2 border-primary/30 pb-3">
            <h3 className="text-base font-semibold">{adultIntake.title}</h3>
            <span className="text-xs text-muted-foreground">Page {p.page} of {adultIntake.pages.length}</span>
          </header>
          {p.sections.map((s) => (
            <section key={s.id} className="mb-6">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">{s.title}</h4>
              {s.note && <p className="mb-2 text-xs text-muted-foreground">{s.note}</p>}
              <div className="divide-y divide-border">
                {s.questions.map((q) => {
                  const st = session.questionState(q.id);
                  const style = statusStyles[st.status];
                  return (
                    <div key={q.id} id={`rq-${q.id}`} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{q.label}</p>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.badge}`}>{style.label}</span>
                      </div>
                      {st.status === "not_answered"
                        ? <p className="mt-1 text-sm italic text-muted-foreground">Not answered{q.required ? " (required)" : ""}</p>
                        : <p className="mt-1 text-sm">{st.answer}{st.status !== "confirmed" && <span className="ml-2 text-xs text-muted-foreground">(AI draft, not confirmed)</span>}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </article>
      ))}
    </div>
  );
}