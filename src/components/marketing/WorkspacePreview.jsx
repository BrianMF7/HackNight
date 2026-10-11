import React from "react";
import { ArrowRight, Check, FileText, MessageSquareText, ShieldAlert } from "lucide-react";

const excerpts = [
  { at: "04:12", speaker: "Patient", text: "I have been feeling anxious for the past few months." },
  { at: "11:38", speaker: "Patient", text: "It became worse after I changed jobs." },
  { at: "23:05", speaker: "Patient", text: "My parents separated when I was young." },
];

export default function WorkspacePreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-[0_14px_45px_-32px_rgba(28,49,68,0.4)]" aria-label="Illustrative conversation-to-documentation workflow with synthetic examples">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><FileText aria-hidden="true" className="h-4 w-4 text-primary"/> Clinical intake</div>
        <span className="text-[11px] text-muted-foreground">Illustrative · Synthetic data</span>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="border-b border-border px-4 py-5 sm:px-5 md:border-b-0 md:border-r">
          <div className="mb-5 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold text-foreground"><MessageSquareText className="h-4 w-4 text-primary" aria-hidden="true" /> Conversation</div><span className="text-xs text-muted-foreground">Chronological</span></div>
          <div className="space-y-0">
            {excerpts.map((line, i) => <div key={line.at} className={`relative border-l-2 py-3 pl-4 ${i === 1 ? 'border-primary bg-secondary/40' : 'border-border'}`}><p className="mb-1 text-[11px] font-medium text-muted-foreground">{line.speaker} · {line.at}</p><p className="text-[13px] leading-6 text-foreground">“{line.text}”</p></div>)}
          </div>
        </div>
        <div className="px-4 py-5 sm:px-5">
          <div className="mb-5 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold text-foreground"><FileText className="h-4 w-4 text-primary" aria-hidden="true"/> Structured intake</div><span className="text-xs text-muted-foreground">By topic</span></div>
          <div className="space-y-0 divide-y divide-border">
            <div className="pb-4"><div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium">Presenting concerns</span><span className="text-[11px] font-medium text-primary">AI draft</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">Recent anxiety and job-related stress.</p><span className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary"><ArrowRight className="h-3 w-3" aria-hidden="true"/> Evidence at 04:12 and 11:38</span></div>
            <div className="py-4"><div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium">Personal history</span><span className="text-[11px] font-medium text-primary">AI draft</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">Family separation in childhood.</p><span className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary"><ArrowRight className="h-3 w-3" aria-hidden="true"/> Evidence at 23:05</span></div>
            <div className="py-4"><div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium">Medical history</span><span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">Unanswered</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">No relevant information documented.</p></div>
            <div className="pt-4"><div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium">Safety review</span><span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#926018]"><ShieldAlert className="h-3 w-3" aria-hidden="true"/> Review required</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">Requires clinician assessment.</p></div>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-[11px] font-medium text-primary"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Clinician confirmation required for drafts</div>
        </div>
      </div>
    </div>
  );
}
