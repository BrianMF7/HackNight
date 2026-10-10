import React, { useEffect, useState } from "react";
import { FileText, Loader2, CheckCircle2, LockKeyhole } from "lucide-react";
import { workspaceApi } from "@/api";
import { isErrorShape } from "@/api/ApiError";

/** @typedef {{ id: string, title: string, pages: number, available: boolean, note: string }} TemplateCard */

export default function TemplatePicker() {
  const [templates, setTemplates] = useState(/** @type {TemplateCard[] | null} */(null));
  const [error, setError] = useState(/** @type {import("@/api/ApiError").ErrorShape | null} */(null));

  useEffect(() => {
    let active = true;
    workspaceApi.getTemplates().then((list) => { if (active) setTemplates(list); }).catch((/** @type {unknown} */ reason) => {
      if (active) setError(isErrorShape(reason) ? reason : { message: "Could not load templates." });
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-semibold">Available forms</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">A standardized questionnaire can be populated non-sequentially as relevant information is discussed.</p>
      </div>
      {error && <p role="alert" className="px-5 py-4 text-sm text-destructive">{error.message}</p>}
      {!templates && !error && <p role="status" className="flex items-center gap-2 px-5 py-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading questionnaires…</p>}
      {templates && templates.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">No questionnaires are currently available.</p>}
      <ul className="divide-y divide-border">
        {templates?.map((t) => (
          <li key={t.id} className={`flex items-center gap-3 px-5 py-4 ${t.available ? "bg-secondary/25" : ""}`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{t.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.pages} pages · {t.note}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${t.available ? "text-primary" : "text-muted-foreground"}`}>
              {t.available ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />}
              {t.available ? "Available" : "Reference only"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
