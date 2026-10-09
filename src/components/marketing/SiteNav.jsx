import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/brand/Logo";

const links = [
  ["How it works", "#how"],
  ["Documentation", "#documentation"],
  ["Oversight", "#oversight"],
  ["Zoom", "#zoom"],
  ["Demo", "#demo"],
  ["Contact", "#contact"],
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/"><Logo /></Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map(([l, h]) => <a key={h} href={h} className="text-sm text-muted-foreground transition hover:text-foreground">{l}</a>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost"><Link to="/login">Organization Sign In</Link></Button>
          <Button asChild><Link to="/app">Launch Platform</Link></Button>
        </div>
        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <div className="space-y-1 border-t border-border bg-background px-4 py-3 md:hidden">
          {links.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)} className="block py-2 text-sm">{l}</a>)}
          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" className="flex-1"><Link to="/login">Sign In</Link></Button>
            <Button asChild className="flex-1"><Link to="/app">Launch Platform</Link></Button>
          </div>
        </div>
      )}
    </header>
  );
}