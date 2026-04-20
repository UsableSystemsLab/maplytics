import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })

  return {
    title: t("profileTitle"),
  }
}

export default function ProfileLayout({ children }) {
  return children
}
