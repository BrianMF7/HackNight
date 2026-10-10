import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import WorkspacePreview from "./WorkspacePreview";

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background" aria-labelledby="mindscribe-hero-title">
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-8 lg:pb-24 lg:pt-24">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div>
            <p className="mb-6 text-sm font-medium text-primary">Clinical intake, thoughtfully assisted.</p>
            <h1 id="mindscribe-hero-title" className="ms-display max-w-[680px] text-[clamp(2.8rem,5.3vw,5.4rem)] leading-[1.055] tracking-[-0.035em] text-foreground">
              The conversation comes first.
            </h1>
            <p className="mt-7 max-w-[530px] text-base leading-8 text-muted-foreground sm:text-lg">
              MindScribe helps mental health clinicians turn natural intake conversations into structured documentation. AI proposes transcript-grounded answers; clinicians review and confirm them.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Button asChild size="lg" className="rounded-md px-6 shadow-none"><Link to="/login">Sign in <ArrowUpRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link></Button>
              <a href="#how" className="inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-medium text-primary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Explore the workflow <ChevronDown aria-hidden="true" className="h-4 w-4" /></a>
            </div>
            <p className="mt-7 max-w-lg text-xs leading-5 text-muted-foreground">Evaluation environment using synthetic information. Not authorized for real patient data or clinical deployment.</p>
          </div>
          <div className="min-w-0"><WorkspacePreview /></div>
        </div>
      </div>
    </section>
  );
}
