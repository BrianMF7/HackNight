import React from "react";
import { ArrowDownRight, CheckCircle2, FileSearch, ShieldCheck } from "lucide-react";

const stages = [
  { n: "01", title: "Converse", copy: "The clinician follows the person's story, not a rigid questionnaire sequence." },
  { n: "02", title: "Capture", copy: "Authorized transcription preserves the conversation in chronological order." },
  { n: "03", title: "Organize", copy: "Transcript-grounded AI proposes responses to relevant intake fields, regardless of when a topic arises." },
  { n: "04", title: "Review", copy: "Clinicians inspect evidence, edit drafts, and confirm documented answers." },
  { n: "05", title: "Hand off", copy: "Required reviews and server-side checks determine whether documentation can be delivered." },
];

export default function FeatureSections() {
  return <>
    <section id="how" aria-labelledby="how-heading" className="scroll-mt-24 border-b border-border bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div><p className="text-sm font-medium text-primary">How MindScribe works</p><h2 id="how-heading" className="ms-display mt-4 max-w-md text-4xl leading-tight tracking-tight sm:text-5xl">A natural conversation. A structured record.</h2><p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Clinical intake rarely unfolds in neat steps. The documentation can be structured without requiring the discussion to be.</p></div>
          <ol className="divide-y divide-border border-t border-border">{stages.map(step => <li key={step.n} className="grid grid-cols-[42px_1fr] gap-4 py-5 sm:grid-cols-[56px_0.55fr_1fr] sm:gap-6"><span className="text-sm font-medium text-primary">{step.n}</span><h3 className="text-base font-semibold text-foreground">{step.title}</h3><p className="col-start-2 text-sm leading-6 text-muted-foreground sm:col-start-3">{step.copy}</p></li>)}</ol>
        </div>
      </div>
    </section>
    <section id="platform" aria-labelledby="platform-heading" className="scroll-mt-24 border-b border-border bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div className="order-2 border-l-2 border-primary bg-white px-7 py-8 shadow-[0_7px_30px_-25px_rgba(28,49,68,0.32)] lg:order-1">
            <p className="text-xs font-medium text-muted-foreground">A single patient statement</p>
            <blockquote className="ms-display mt-4 text-[clamp(1.45rem,3vw,2.2rem)] leading-snug text-foreground">“I have been feeling overwhelmed since I changed jobs, and now I can barely sleep.”</blockquote>
            <div className="my-7 flex justify-center text-primary"><ArrowDownRight aria-hidden="true" className="h-7 w-7" /></div>
            <p className="mb-3 text-xs font-medium text-muted-foreground">Potential questionnaire destinations</p>
            <div className="space-y-2"><div className="flex items-center justify-between gap-2 border border-border bg-secondary/50 p-3 text-sm"><span>Presenting concerns</span><span className="text-xs font-medium text-primary">AI draft</span></div><div className="flex items-center justify-between gap-2 border border-border bg-secondary/50 p-3 text-sm"><span>Sleep and functioning</span><span className="text-xs font-medium text-primary">AI draft</span></div></div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Illustrative mapping only. Suggestions are not confirmed clinical findings.</p>
          </div>
          <div className="order-1 lg:order-2 lg:self-center"><p className="text-sm font-medium text-primary">Designed for non-linear intake</p><h2 id="platform-heading" className="ms-display mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">The story doesn't have to follow the form.</h2><p className="mt-6 text-base leading-8 text-muted-foreground">A patient may discuss sleep, relationships, and childhood experiences in any sequence. MindScribe helps organize that information into relevant questionnaire topics without dictating how the clinician conducts the conversation.</p><div className="mt-8 flex items-start gap-3 border-t border-border pt-5"><FileSearch className="mt-0.5 h-5 w-5 flex-none text-primary" aria-hidden="true" /><p className="text-sm leading-6 text-foreground">Suggested answers remain reviewable against the source conversation.</p></div></div>
        </div>
      </div>
    </section>
    <section id="documentation" aria-labelledby="documentation-heading" className="scroll-mt-24 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20"><div><p className="text-sm font-medium text-primary">Clinical documentation</p><h2 id="documentation-heading" className="ms-display mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">A clear difference between suggested and confirmed.</h2><p className="mt-6 text-base leading-8 text-muted-foreground">AI assists with organizing information. Clinicians remain responsible for validating the content and deciding when documentation is complete.</p></div><div className="divide-y divide-border border-y border-border"><div className="flex gap-4 py-6"><FileSearch className="mt-1 h-5 w-5 flex-none text-primary" aria-hidden="true"/><div><h3 className="font-semibold">Source-aware drafts</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">A proposed answer is linked to transcript evidence for review.</p></div></div><div className="flex gap-4 py-6"><CheckCircle2 className="mt-1 h-5 w-5 flex-none text-[#26715A]" aria-hidden="true"/><div><h3 className="font-semibold">Explicit clinician confirmation</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">Drafted and approved information have distinguishable states.</p></div></div><div className="flex gap-4 py-6"><ShieldCheck className="mt-1 h-5 w-5 flex-none text-primary" aria-hidden="true"/><div><h3 className="font-semibold">Controlled handoff</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">Session duration, required answers, safety checks, and recipient requirements are validated before delivery.</p></div></div></div></div></div>
    </section>
    <section id="responsible-ai" aria-labelledby="responsible-heading" className="scroll-mt-24 border-y border-border bg-secondary/50 py-20 sm:py-28"><div className="mx-auto grid max-w-7xl gap-9 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20"><div><p className="text-sm font-medium text-primary">Responsible AI</p><h2 id="responsible-heading" className="ms-display mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">Assistance without surrendering judgment.</h2></div><div className="lg:pt-6"><p className="text-lg leading-8 text-foreground">MindScribe is designed to assist with documentation, not to diagnose patients, independently determine clinical risk, or replace a clinician's decisions.</p><p className="mt-5 text-sm leading-7 text-muted-foreground">AI suggestions require review. Missing information is not treated as a denial. Outstanding safety and confirmation requirements restrict handoff. Clinical deployment, privacy controls, and regulatory obligations require separate validation; this evaluation environment is intended for synthetic data only.</p><a href="#get-started" className="mt-8 inline-block border-b border-primary pb-1 text-sm font-semibold text-primary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Explore the platform</a></div></div></section>
  </>;
}
