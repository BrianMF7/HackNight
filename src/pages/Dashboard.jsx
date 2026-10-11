import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { ShieldAlert } from "lucide-react";
import StartSessionCard from "@/components/dashboard/StartSessionCard";
import TemplatePicker from "@/components/dashboard/TemplatePicker";

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.full_name?.trim().split(/\s+/)[0];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 pb-12">
      <header className="flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-primary">Clinical workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {name ? `Good to see you, ${name}.` : "Welcome to MindScribe."}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Start an intake, review available questionnaires, and manage your session environment.
          </p>
        </div>
      </header>

      <div role="note" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p><strong>Development environment.</strong> Use synthetic data only. This is not a validated clinical or HIPAA-compliant deployment.</p>
      </div>

      <section aria-labelledby="session-actions-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="session-actions-heading" className="text-xl font-semibold tracking-tight">Your next step</h2>
          <span className="text-xs text-muted-foreground">Session tools</span>
        </div>
        <StartSessionCard />
      </section>

      <section className="max-w-4xl" aria-label="Intake questionnaires">
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Intake questionnaires</h2>
            <p className="mt-1 text-sm text-muted-foreground">Standardized fields, completed in the order information emerges during conversation.</p>
          </div>
          <TemplatePicker />
        </div>
      </section>
    </main>
  );
}
