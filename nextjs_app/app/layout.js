import { Geist, Geist_Mono } from "next/font/google";
import { getTranslations } from "next-intl/server"
import { defaultLocale } from "../i18n"
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#134565",
}

export async function generateMetadata() {
  const t = await getTranslations({ locale: defaultLocale, namespace: "metadata" })

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
