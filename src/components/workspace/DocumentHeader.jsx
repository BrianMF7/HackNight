import React from "react";
import { Maximize2, Minimize2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { adultIntake, allQuestions } from "@/api/templates/adultIntake";

// Title, progress, page + section navigation for the live document.
/**
 * @typedef {import("../../api/templates/adultIntake").AnswerStatus} AnswerStatus
 * @param {{
 *   session: { questionState: (id: string) => { status: AnswerStatus } },
 *   focusMode: boolean,
 *   onToggleFocus: () => void,
 *   onPreview: () => void,
 * }} props
 */
export default function DocumentHeader({ session, focusMode, onToggleFocus, onPreview }) {
  const required = allQuestions.filter((q) => q.required);
  const confirmed = required.filter((q) => session.questionState(q.id).status === "confirmed").length;
  const drafted = required.filter((q) => {
    const status = session.questionState(q.id).status;
    return status === "draft" || status === "partial" || status === "clarify";
  }).length;
  const pct = Math.round((confirmed / required.length) * 100);

  /** @param {string} id */
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const sections = adultIntake.pages.flatMap((p) => p.sections.map((s) => ({ id: s.id, title: s.title, page: p.page })));

  return (
    <div className="border-b border-border bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{adultIntake.title}</h2>
          <p className="text-xs text-muted-foreground">Fixed template · {adultIntake.version}</p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={onPreview}><Eye className="mr-1 h-3.5 w-3.5" />Preview PDF</Button>
          <Button size="sm" variant="outline" onClick={onToggleFocus}>
            {focusMode ? <Minimize2 className="mr-1 h-3.5 w-3.5" /> : <Maximize2 className="mr-1 h-3.5 w-3.5" />}
            {focusMode ? "Exit review mode" : "Review mode"}
          </Button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Progress value={pct} className="h-1.5 flex-1" />
        <span className="whitespace-nowrap text-xs text-muted-foreground">{confirmed}/{required.length} confirmed · {drafted} drafted</span>
      </div>
      <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
        {adultIntake.pages.map((p) => (
          <button key={p.page} onClick={() => jump(`page-${p.page}`)} className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary">P{p.page}</button>
        ))}
        <span className="mx-1 w-px shrink-0 bg-border" />
        {sections.map((s) => (
          <button key={s.id} onClick={() => jump(s.id)} className="shrink-0 rounded-md px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground">{s.title.replace(/ \(.*\)/, "")}</button>
        ))}
      </div>
    </div>
  );
}