import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/brand/Logo";

const nav = [["Platform", "#platform"], ["How it works", "#how"], ["Responsible AI", "#responsible-ai"], ["Documentation", "#documentation"]];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" aria-label="MindScribe home"><Logo /></Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">{nav.map(([label, href]) => <a key={href} href={href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{label}</a>)}</nav>
        <div className="hidden items-center gap-3 lg:flex"><Button asChild className="rounded-md shadow-none"><Link to="/login">Sign in</Link></Button></div>
        <button type="button" aria-expanded={open} aria-controls="mindscribe-mobile-nav" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(v => !v)} className="rounded-md border border-border p-2 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && <nav id="mindscribe-mobile-nav" aria-label="Mobile navigation" className="border-t border-border bg-white px-5 pb-5 pt-2 lg:hidden">{nav.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)} className="block border-b border-border py-3 text-sm font-medium text-foreground">{label}</a>)}<div className="mt-4 flex flex-wrap gap-3"><Button asChild><Link to="/login" onClick={() => setOpen(false)}>Sign in</Link></Button></div></nav>}
    </header>
  );
}
