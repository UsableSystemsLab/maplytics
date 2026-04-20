'use client'
import { useRef } from "react";
import { getTranslations } from "next-intl/server"
import LandingCTA from "../../components/LandingCTA";
import Header from "@/components/Header";
import HeroSection from "../../components/HeroSection";
import FeatureOverview from "../../components/FeatureOverview";
import HowItWorks from "../../components/HowItWorks";
import Footer from "../../components/Footer";


export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })

  return {
    title: t("ogTitle"),
    description: t("description"),
  }
}


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
