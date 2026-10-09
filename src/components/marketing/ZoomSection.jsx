import React from "react";
import { Link } from "react-router-dom";
import { Download, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// No installer exists. The download entry is clearly marked coming soon and is not clickable.
export default function ZoomSection() {
  return (
    <section id="zoom" className="bg-primary py-20 text-primary-foreground">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
        <div>
          <Badge className="bg-white/15 text-white hover:bg-white/15">Coming soon</Badge>
          <h2 className="mt-4 text-3xl font-semibold">Zoom Companion Integration</h2>
          <p className="mt-3 text-primary-foreground/85">
            Prefer Zoom? The companion is planned to run alongside your meeting, connect to the same intake backend, show live documentation progress, alert you to missing information, and provide the same final PDF review and handoff.
          </p>
          <p className="mt-3 text-sm text-primary-foreground/70">A packaged Zoom app has not been released. Until then, explore the experience through the interactive demo.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled variant="secondary" className="gap-2"><Download className="h-4 w-4" />Download Zoom Companion · Coming soon</Button>
            <Button asChild variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link to="/app/workspace"><Video className="mr-2 h-4 w-4" />Try the demo</Link></Button>
          </div>
        </div>
        <ul className="space-y-3 text-sm">
          {["Works alongside the Zoom meeting", "Same backend, same standardized form", "Live progress and missing-question alerts", "Final PDF review and handoff"].map((t) => (
            <li key={t} className="rounded-lg bg-white/10 px-4 py-3">{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}