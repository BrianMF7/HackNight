import React, { useState } from "react";
import { ChevronDown, ChevronUp, ShieldAlert, Volume2 } from "lucide-react";

// Compact queue of required items without a draft. Safety items sort first.
// "Later" only hides the visual highlight; it never marks a question complete.
export default function OutstandingQueue({ outstanding, snoozed, onJump, onPlay }) {
  const [open, setOpen] = useState(false);
  const safety = outstanding.filter((q) => q.safety).length;
  return (
    <div className="border-b border-border bg-secondary/40 px-4 py-2">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          {outstanding.length} outstanding question{outstanding.length === 1 ? "" : "s"}
          {safety > 0 && <span className="ml-2 inline-flex items-center gap-1 text-red-700"><ShieldAlert className="h-3 w-3" />{safety} safety</span>}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {outstanding.map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-xs">
              <button onClick={() => onJump(q.id)} className="flex-1 truncate text-left hover:text-primary">
                {q.safety && <ShieldAlert className="mr-1 inline h-3 w-3 text-red-600" />}
                {q.label}{snoozed[q.id] ? " (snoozed)" : ""}
              </button>
              <button onClick={() => onPlay(q.id)} aria-label="Play question" className="text-muted-foreground hover:text-primary"><Volume2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}