import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PlayCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Request-access form is demo-only: it does not transmit anything.
export default function DemoAndContact() {
  const [done, setDone] = useState(false);
  const submit = (e) => { e.preventDefault(); setDone(true); };
  return (
    <>
      <section id="demo" className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-semibold">Product demo</h2>
          <p className="mt-3 text-muted-foreground">Walk through a full synthetic intake: live transcript playback, auto-drafted answers, reminders, and final review. No real patient data.</p>
          <Button asChild size="lg" className="mt-6"><Link to="/app/workspace"><PlayCircle className="mr-2 h-5 w-5" />Open interactive demo</Link></Button>
        </div>
      </section>
      <section id="contact" className="border-t border-border bg-white py-20">
        <div className="mx-auto max-w-xl px-4">
          <h2 className="text-center text-3xl font-semibold">Request access</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">Tell us about your organization. Hackathon demo: this form does not send anything.</p>
          {done ? (
            <p className="mt-8 flex items-center justify-center gap-2 text-primary"><CheckCircle2 className="h-5 w-5" />Thanks. Demo form only; nothing was transmitted.</p>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-3">
              <Input required placeholder="Organization name" />
              <Input required type="email" placeholder="Work email" />
              <Textarea placeholder="How would you use ClinicoLink?" rows={4} />
              <Button type="submit" className="w-full">Request Access</Button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}