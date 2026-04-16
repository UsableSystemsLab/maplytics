'use client'
import HeroSection from "@/components/landing/HeroSection";
import FeatureOverview from "@/components/landing/FeatureOverview";
import HowItWorks from "@/components/landing/HowItWorks";
import Footer from "@/components/landing/Footer";
import { useRef } from "react";
import LandingCTA from "@/components/landing/LandingCTA";
import Header from "@/components/landing/Header";

export default function Home() {
  const moreRef = useRef(null);

  const scrollToMore = () => {
    moreRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div>
      <Header variant="dark" />
      <HeroSection onScrollDown={scrollToMore} />
      <FeatureOverview ref={moreRef} />
      <HowItWorks />
      <LandingCTA />
      <Footer />
    </div>
  );
}
