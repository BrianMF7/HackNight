import React from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/brand/Logo";

export default function SiteFooter() {
  return (
    <footer className="bg-foreground py-12 text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-3 max-w-sm text-sm text-white/60">AI-assisted clinical intake documentation. The clinician always reviews and approves.</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-medium text-white">Product</p>
          <ul className="space-y-1.5 text-white/60">
            <li><a href="#how">How it works</a></li><li><a href="#zoom">Zoom Companion</a></li><li><a href="#demo">Demo</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-medium text-white">Organization</p>
          <ul className="space-y-1.5 text-white/60">
            <li><Link to="/login">Sign in</Link></li><li><a href="#contact">Request access</a></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl border-t border-white/10 px-4 pt-6 text-xs text-white/50">
        Hackathon demonstration using synthetic data only. Not a HIPAA-compliant production deployment. Not a diagnostic tool; clinicians remain responsible for all clinical judgment.
      </p>
    </footer>
  );
}