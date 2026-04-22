'use client'
import { useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import HeroSection from "@/components/landing/HeroSection";
import HeroMapBackground from "@/components/landing/HeroMapBackground";
import FeatureOverview from "@/components/landing/FeatureOverview";
import HowItWorks from "@/components/landing/HowItWorks";
import Footer from "@/components/landing/Footer";
import LandingCTA from "@/components/landing/LandingCTA";
import Header from "@/components/landing/Header";

const HERO_RICH_TAGS = {
  line1: (chunks) => <div className="whitespace-nowrap">{chunks}</div>,
  line2: (chunks) => <div className="whitespace-nowrap">{chunks}</div>,
  geo: (chunks) => <span className="bg-earthy-green px-1">{chunks}</span>,
  maps: (chunks) => <span className="bg-[#2C3580] px-1">{chunks}</span>,
};

export default function Home() {
  const moreRef = useRef(null);
  const t = useTranslations("landing.hero");

  const scrollToMore = () => {
    moreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <Header variant="dark" />
      <HeroSection
        richTags={HERO_RICH_TAGS}
        background={<HeroMapBackground />}
        onScrollDown={scrollToMore}
        showScrollIndicator
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mx-auto md:max-w-md">
          <Link href="/dashboard" className="w-full">
            <Button
              size="lg"
              className="w-full bg-primary text-white text-base sm:text-lg py-6 sm:py-8 rounded-md shadow-xl hover:bg-primary/90 transition-all"
            >
              {t('tryNow')}
            </Button>
          </Link>
          <Button
            onClick={scrollToMore}
            variant="secondary"
            className="w-full text-base sm:text-lg py-6 sm:py-8 rounded-md"
          >
            {t('exploreMore')}
          </Button>
        </div>
      </HeroSection>
      <FeatureOverview ref={moreRef} />
      <HowItWorks />
      <LandingCTA />
      <Footer />
    </div>
  );
}
