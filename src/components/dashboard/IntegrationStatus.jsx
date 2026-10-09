import React from "react";
import { Badge } from "@/components/ui/badge";
import { getMode } from "@/api/config";

// Honest status: in demo mode nothing real is connected. Real integrations live in the separate backend.
const items = [
  ["Gemini", "Transcript analysis"],
  ["ElevenLabs", "Spoken question prompts"],
  ["Presage", "Clinician focus reminders"],
  ["Tiger Data", "Session and PDF records"],
  ["Zoom transcripts", "Transcript files / fixtures"],
  ["PDFKit + Nodemailer", "PDF and therapist email"],
];

export default function IntegrationStatus() {
  const live = getMode() === "live";
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <h3 className="font-semibold">Integration status</h3>
      <p className="mb-3 text-xs text-muted-foreground">These run in your separate backend, not in this app.</p>
      <ul className="divide-y divide-border">
        {items.map(([name, desc]) => (
          <li key={name} className="flex items-center justify-between py-2 text-sm">
            <span>{name}<span className="block text-xs text-muted-foreground">{desc}</span></span>
            <Badge variant="secondary">{live ? "Via backend" : "Simulated"}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}