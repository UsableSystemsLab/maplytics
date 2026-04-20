import { getTranslations } from "next-intl/server"
import HomeClient from "./HomeClient";

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })

  return {
    title: t("ogTitle"),
    description: t("description"),
  }
}

export default function Home() {
  return <HomeClient />;
}
