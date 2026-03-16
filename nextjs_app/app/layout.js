import { getTranslations } from "next-intl/server"
import { defaultLocale } from "../i18n"
import "./globals.css";
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

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
      <body suppressHydrationWarning className={montserrat.className}>
        {children}
      </body>
    </html>
  );
}
