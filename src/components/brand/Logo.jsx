import React from "react";

export default function Logo({ light = false }) {
  return (
    <span className={`flex items-center gap-2 font-semibold tracking-tight ${light ? "text-white" : "text-foreground"}`}>
      <img src="/mindScribeImprove.png" alt="" width={64} height={48} />
      MindScribe
    </span>
  );
}
