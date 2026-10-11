import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DemoAndContact() {
  return <section id="get-started" aria-labelledby="get-started-heading" className="scroll-mt-24 bg-background py-20 sm:py-28"><div className="mx-auto grid max-w-7xl items-end gap-8 px-5 sm:px-8 lg:grid-cols-[1fr_auto] lg:gap-16"><div><p className="text-sm font-medium text-primary">Explore MindScribe</p><h2 id="get-started-heading" className="ms-display mt-4 max-w-3xl text-4xl leading-tight tracking-tight sm:text-5xl">Built around better documentation, and the people behind it.</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">Explore the existing workspace with synthetic information only. MindScribe is not yet validated for real patient data or clinical deployment.</p></div><Button asChild size="lg" className="w-fit rounded-md px-7 shadow-none"><Link to="/login">Sign in <ArrowUpRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link></Button></div></section>;
}
