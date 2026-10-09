import React from "react";
import { Radio, CheckCircle2, ClipboardCheck } from "lucide-react";

// Synthetic demo counts. In live mode these come from the backend.
const stats = [
  { label: "Active Sessions", value: 1, icon: Radio, note: "Synthetic" },
  { label: "Completed Intakes", value: 12, icon: CheckCircle2, note: "Synthetic" },
  { label: "Pending Clinical Reviews", value: 3, icon: ClipboardCheck, note: "Synthetic" },
];

export default function StatsRow() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map(({ label, value, icon: Icon, note }) => (
        <div key={label} className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <Icon className="h-5 w-5 text-teal" />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{note}</span>
          </div>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}