"use client";

import { useRef } from "react";
import { Target, Eye, MapPin, Lightbulb, Sparkles, Rocket } from "lucide-react";
import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import HeroMapBackground, { RIYADH_POINTS } from "@/components/landing/HeroMapBackground";
import FeatureOverview from "@/components/landing/FeatureOverview";
import StatsStrip from "@/components/landing/StatsStrip";
import HowItWorks from "@/components/landing/HowItWorks";
import LandingCTA from "@/components/landing/LandingCTA";
import Footer from "@/components/landing/Footer";

const ABOUT_HERO_RICH_TAGS = {
  line1: (chunks) => <div className="whitespace-nowrap">{chunks}</div>,
  line2: (chunks) => <div className="whitespace-nowrap">{chunks}</div>,
  geo: (chunks) => <span className="bg-earthy-green px-1">{chunks}</span>,
  maps: (chunks) => <span className="bg-[#2C3580] px-1">{chunks}</span>,
};

const RIYADH_CENTER = [24.8, 46.7];
const RIYADH_ONLY = [RIYADH_POINTS];

export default function AboutPage() {
  const missionRef = useRef(null);

  const scrollToMission = () => {
    missionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <Header variant="dark" />
      <HeroSection
        namespace="about.hero"
        richTags={ABOUT_HERO_RICH_TAGS}
        background={
          <HeroMapBackground
            center={RIYADH_CENTER}
            zoom={8}
            mobileZoom={7}
            polygons={RIYADH_ONLY}
            mobilePolygons={RIYADH_ONLY}
          />
        }
        onScrollDown={scrollToMission}
        showScrollIndicator
        heightClass="h-[75vh] min-h-[520px]"
      />
      <FeatureOverview
        ref={missionRef}
        namespace="about.mission"
        icons={[Target, Eye, MapPin]}
        showBrandBanner={false}
      />
      <StatsStrip namespace="about.stats" />
      <HowItWorks
        namespace="about.story"
        icons={[Lightbulb, Sparkles, Rocket]}
        stairs={false}
      />
      <LandingCTA
        namespace="about.cta"
        primaryHref="/dashboard"
        secondaryHref="/datasets"
      />
      <Footer />
    </div>
  );
}
