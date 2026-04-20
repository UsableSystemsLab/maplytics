import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })

  return {
    title: t("loginTitle"),
  }
}

export default function LoginLayout({ children }) {
  return children
}
