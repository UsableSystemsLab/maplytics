export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://maplytics.org"

  return [
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      alternates: {
        languages: {
          en: `${baseUrl}/en`,
          ar: `${baseUrl}/ar`,
        },
      },
    },
    {
      url: `${baseUrl}/en/login`,
      lastModified: new Date(),
      alternates: {
        languages: {
          en: `${baseUrl}/en/login`,
          ar: `${baseUrl}/ar/login`,
        },
      },
    },
    {
      url: `${baseUrl}/en/register`,
      lastModified: new Date(),
      alternates: {
        languages: {
          en: `${baseUrl}/en/register`,
          ar: `${baseUrl}/ar/register`,
        },
      },
    },
    {
      url: `${baseUrl}/en/public-dataset`,
      lastModified: new Date(),
      alternates: {
        languages: {
          en: `${baseUrl}/en/public-dataset`,
          ar: `${baseUrl}/ar/public-dataset`,
        },
      },
    },
  ]
}
