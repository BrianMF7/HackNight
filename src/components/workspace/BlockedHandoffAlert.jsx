import React from "react";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shows the backend's refusal reasons verbatim. The frontend never overrides them.
/**
 * @param {{
 *   reasons: Array<{ code: string, message: string }>,
 *   onKeepDraft: () => void,
 *   onReturn: () => void,
 * }} props
 */
export default function BlockedHandoffAlert({ reasons, onKeepDraft, onReturn }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-red-800"><ShieldX className="h-4 w-4" />Handoff blocked</p>
      <p className="mt-1 text-xs text-red-800/80">The PDF was not generated or sent. Nothing left this application.</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-red-900">
        {reasons.map((r) => <li key={r.code}>{r.message}</li>)}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onReturn}>Return to Review</Button>
        <Button size="sm" onClick={onKeepDraft}>Keep Incomplete Draft (do not send)</Button>
      </div>
    </div>
  );
}