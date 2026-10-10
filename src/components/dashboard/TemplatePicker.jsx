import React, { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { workspaceApi } from "@/api";
import { isErrorShape } from "@/api/ApiError";

/**
 * @typedef {{ id: string, title: string, pages: number, available: boolean, note: string }} TemplateCard
 */

// Template selection. Forms are kept separate (never merged). Only the Adult Intake is loaded for the demo.
export default function TemplatePicker() {
  const [templates, setTemplates] = useState(/** @type {TemplateCard[] | null} */ (null));
  const [error, setError] = useState(/** @type {import("@/api/ApiError").ErrorShape | null} */ (null));
  useEffect(() => {
    workspaceApi.getTemplates().then(setTemplates).catch((/** @type {unknown} */ reason) => {
      setError(isErrorShape(reason) ? reason : { message: "Could not load templates." });
    });
  }, []);

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <h3 className="font-semibold">Intake templates</h3>
      <p className="mb-3 text-xs text-muted-foreground">Standardized forms. Structure is fixed and identical for every patient.</p>
      {error && <p className="text-xs text-destructive">{error.message}</p>}
      {!templates && !error && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      <ul className="space-y-2">
        {templates?.map((t) => (
          <li key={t.id} className={`flex items-center justify-between rounded-lg border p-3 ${t.available ? "border-primary/40 bg-secondary/40" : "border-border opacity-70"}`}>
            <span className="flex items-center gap-3 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span>{t.title}<span className="block text-xs text-muted-foreground">{t.pages} pages · {t.note}</span></span>
            </span>
            <Badge variant={t.available ? "default" : "outline"}>{t.available ? "Selected" : "Reference"}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}