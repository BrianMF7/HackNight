import React from "react";
import { Outlet, Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/brand/Logo";
import ConnectionSettings from "./ConnectionSettings";
import useApiMode from "./useApiMode";

// Private clinical workspace shell. Old patient-registration pages are no longer part of the product.
export default function AppLayout() {
  const { mode } = useApiMode();
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/app"><Logo /></Link>
          <div className="flex items-center gap-2">
            <Badge variant={mode === "live" ? "default" : "secondary"}>{mode === "live" ? "Live backend" : "Demo mode"}</Badge>
            <ConnectionSettings />
            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => logout()}><LogOut /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
    </div>
  );
}