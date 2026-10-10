import React from "react";
import { motion } from "framer-motion";
import { FileCheck2, BellRing, UserCheck, LayoutPanelLeft } from "lucide-react";

const fade = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.5 } };

const steps = [
  { n: "1", title: "Converse", body: "Hold the intake over web video or your existing Zoom meeting." },
  { n: "2", title: "Capture", body: "The backend analyzes the conversation and finds evidence for each standardized question." },
  { n: "3", title: "Review", body: "Drafted answers appear in the fixed clinical form. You edit and confirm each one." },
  { n: "4", title: "Hand off", body: "After explicit approval, the confirmed PDF goes to the assigned therapist." },
];

const features = [
  { id: "documentation", icon: FileCheck2, title: "Real-Time Clinical Documentation", body: "The standardized form fills in as the conversation unfolds. Structure, question order, and formatting stay identical for every patient. Only the responses change." },
  { id: "questions", icon: BellRing, title: "Never Miss a Required Question", body: "Discreet reminders flag unanswered items, safety questions first. Nothing is guessed, and silence is never treated as a denial." },
  { id: "oversight", icon: UserCheck, title: "Built for Clinical Oversight", body: "Every draft cites its evidence. Clinicians edit and confirm, and nothing is sent without deliberate approval and backend checks." },
  { id: "workspace", icon: LayoutPanelLeft, title: "All-in-One Telehealth Workspace", body: "Video and documentation side by side in a resizable layout, with a distraction-free review mode for the final read-through." },
];

export default function FeatureSections() {
  return (
    <>
      <section id="how" className="border-y border-border bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <motion.h2 {...fade} className="text-center text-3xl font-semibold">How it works</motion.h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <motion.div key={s.n} {...fade} className="rounded-xl border border-border bg-background p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{s.n}</span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-2">
          {features.map(({ id, icon: Icon, title, body }) => (
            <motion.div id={id} key={id} {...fade} className="rounded-2xl border border-border bg-white p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><Icon className="h-5 w-5 text-primary" /></span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}