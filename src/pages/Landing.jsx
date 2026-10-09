import React from "react";
import SiteNav from "@/components/marketing/SiteNav";
import Hero from "@/components/marketing/Hero";
import FeatureSections from "@/components/marketing/FeatureSections";
import ZoomSection from "@/components/marketing/ZoomSection";
import DemoAndContact from "@/components/marketing/DemoAndContact";
import SiteFooter from "@/components/marketing/SiteFooter";

export default function Landing() {
  return (
    <div className="scroll-smooth bg-background">
      <SiteNav />
      <Hero />
      <FeatureSections />
      <ZoomSection />
      <DemoAndContact />
      <SiteFooter />
    </div>
  );
}