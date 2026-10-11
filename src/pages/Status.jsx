import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import ConnectionSettings from "@/components/clinic/ConnectionSettings";
import IntegrationStatus from "@/components/dashboard/IntegrationStatus";

export default function Status() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 pb-12">
      <header className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-primary">Development</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Status</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Backend mode, connection, and which services this build talks to.
          </p>
        </div>
        <Link to="/app" className="text-sm text-primary underline-offset-4 hover:underline">Back to the demo</Link>
      </header>

      <div role="note" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p><strong>Development environment.</strong> Use synthetic data only. This is not a validated clinical or HIPAA-compliant deployment.</p>
      </div>

      <div className="flex justify-end">
        <ConnectionSettings />
      </div>
      <IntegrationStatus />
    </main>
  );
}
