// Visual language for question states. Unanswered must be clearly distinct from answered/confirmed.
export const statusStyles = {
  not_answered: { label: "Not Answered", badge: "bg-muted text-muted-foreground border-border", bar: "bg-border", dot: "bg-muted-foreground/40" },
  partial: { label: "Partially Answered", badge: "bg-warn text-warn-foreground border-amber-200", bar: "bg-amber-400", dot: "bg-amber-400" },
  draft: { label: "AI Draft Available", badge: "bg-teal/15 text-primary border-teal/40", bar: "bg-teal", dot: "bg-teal" },
  clarify: { label: "Needs Clarification", badge: "bg-orange-50 text-orange-800 border-orange-200", bar: "bg-orange-400", dot: "bg-orange-400" },
  confirmed: { label: "Clinician Confirmed", badge: "bg-primary text-primary-foreground border-primary", bar: "bg-primary", dot: "bg-primary" },
};

/** @param {number} sec */
export const formatClock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};