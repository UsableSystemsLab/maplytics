'use client'
import Header from "../../components/Header"
import HeroSection from "../../components/HeroSection";
import FeatureOverview from "../../components/FeatureOverview";
import Footer from "../../components/Footer";
import { useRef } from "react";
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
      <HeroSection onScrollDown={scrollToMore} />
      <FeatureOverview ref={moreRef} />
      <Footer />
    </div>
  );
}
