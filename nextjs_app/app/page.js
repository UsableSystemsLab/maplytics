import Image from "next/image";
import Header from "../components/Header"
import HeroSection from "../components/HeroSection";
import FeatureOverview from "../components/FeatureOverview";
import Footer from "../components/Footer";
export default function Home() {
  return (
    <div className="overflow-x-hidden">
      <Header />
      <HeroSection />
      <FeatureOverview />
      <Footer />
    </div>
  );
}
