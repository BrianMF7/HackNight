import React from "react";
import { Activity } from "lucide-react";

export default function Logo({ light = false }) {
  return (
    <span className={`flex items-center gap-2 font-semibold tracking-tight ${light ? "text-white" : "text-foreground"}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Activity className="h-4 w-4" /></span>
      MindScribe
    </span>
  );
}