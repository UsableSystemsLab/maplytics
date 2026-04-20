import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })

  return {
    title: t("visualizeTitle"),
  }
}

export default function VisualizeDatasetLayout({ children }) {
  return children
}
