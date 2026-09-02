import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PlatformSection } from "@/components/landing/PlatformSection";
import { FeaturesBento } from "@/components/landing/FeaturesBento";
import { AnalyticsSection } from "@/components/landing/AnalyticsSection";
import { CommunitySection } from "@/components/landing/CommunitySection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Volt — One app for the lift and the run",
  description: "Volt unifies strength logging and GPS cardio in one data-dense platform. Built for athletes who refuse to pick a lane.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <HeroSection />
      <TrustStrip />
      <HowItWorks />
      <PlatformSection />
      <FeaturesBento />
      <AnalyticsSection />
      <CommunitySection />
      <CTASection />
      <Footer />
    </div>
  );
}
