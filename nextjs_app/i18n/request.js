import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"

export default getRequestConfig(async ({ requestLocale }) => {
    // Get locale from the request
    let locale = await requestLocale

    // If no locale from request, check cookies
    if (!locale) {
        const cookieStore = await cookies()
        locale = cookieStore.get("NEXT_LOCALE")?.value
    }

    // Fallback to default locale
    if (!locale || !["en", "ar"].includes(locale)) {
        locale = "en"
    }

    return {
        locale,
        messages: (await import(`@/messages/${locale}.json`)).default,
    }
})