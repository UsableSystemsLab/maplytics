'use client'
import { useRef } from "react";
import LandingCTA from "../../components/LandingCTA";
import Header from "@/components/Header";
import HeroSection from "../../components/HeroSection";
import FeatureOverview from "../../components/FeatureOverview";
import HowItWorks from "../../components/HowItWorks";
import Footer from "../../components/Footer";

export default function HomeClient() {
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
