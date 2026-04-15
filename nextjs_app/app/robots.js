export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://maplytics.org"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/profile/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
