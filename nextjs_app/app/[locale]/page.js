import Image from "next/image";
import Header from "../../components/Header"
import HeroSection from "../../components/HeroSection";
import FeatureOverview from "../../components/FeatureOverview";
import Footer from "../../components/Footer";
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })

  return {
    title: t("ogTitle"),
    description: t("description"),
  }
}

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
