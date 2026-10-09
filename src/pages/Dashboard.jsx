import React from "react";
import { useAuth } from "@/lib/AuthContext";
import StartSessionCard from "@/components/dashboard/StartSessionCard";
import StatsRow from "@/components/dashboard/StatsRow";
import TemplatePicker from "@/components/dashboard/TemplatePicker";
import IntegrationStatus from "@/components/dashboard/IntegrationStatus";

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.full_name?.split(" ")[0] || "there";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {name}</h1>
        <p className="text-sm text-muted-foreground">Your private clinical workspace. Hackathon demo using synthetic data only; not a HIPAA-compliant deployment.</p>
      </div>
      <StartSessionCard />
      <StatsRow />
      <div className="grid gap-4 lg:grid-cols-2">
        <TemplatePicker />
        <IntegrationStatus />
      </div>
    </div>
  );
}