import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import WorkspacePreview from "./WorkspacePreview";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-eucalyptus/30 blur-3xl" />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-border bg-white px-3 py-1 text-xs text-primary">AI-powered clinical intake assistant</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Better conversations. Less documentation.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            An AI-powered clinical intake assistant that captures conversations, completes standardized documentation, and helps clinicians focus on the people in front of them.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg"><Link to="/app">Launch Platform<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><a href="#zoom"><Video className="mr-2 h-4 w-4" />Explore Zoom Integration</a></Button>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="mx-auto mt-14 max-w-4xl">
          <WorkspacePreview />
        </motion.div>
      </div>
    </section>
  );
}