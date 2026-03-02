import { Geist, Geist_Mono } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import "../globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
})
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
})

const locales = ["en", "ar"]

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params

  if (!locales.includes(locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} >
      <body className={`${geistMono.variable} ${geistSans.variable} antialiased`} >
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}