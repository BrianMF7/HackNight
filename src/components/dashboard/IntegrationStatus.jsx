import React from "react";
import { ChevronDown, PlugZap, Info } from "lucide-react";
import { getMode } from "@/api/config";

// Labels describe the selected mode, not independent service health checks.
const items = [
  ["Gemini", "Transcript analysis"],
  ["ElevenLabs", "Realtime speech-to-text"],
  ["Presage", "Clinician focus reminders"],
  ["Tiger Data", "Session and PDF records"],
  ["Zoom transcripts", "Transcript files / fixtures"],
  ["PDFKit + Nodemailer", "PDF and therapist email"],
];

export default function IntegrationStatus() {
  const live = getMode() === "live";
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><PlugZap className="h-5 w-5" aria-hidden="true" /></div>
        <div>
          <p className="text-sm font-semibold">Integration environment</p>
          <p className="mt-1 text-sm text-muted-foreground">{live ? "Live backend mode selected" : "Demo mode selected"}</p>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/55 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Mode selection does not confirm that external services are connected. Use Connection settings to test your backend.</p>
      </div>
      <details className="group mt-4 border-t border-border pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span>View integration details</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="mt-3 divide-y divide-border">
          {items.map(([name, desc]) => (
            <li key={name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span><span className="font-medium">{name}</span><span className="block text-xs text-muted-foreground">{desc}</span></span>
              <span className="shrink-0 text-xs text-muted-foreground">{live ? "Via backend" : "Simulated"}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
