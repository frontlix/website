import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Gebruik env-var indien gezet; val anders terug op de productie-URL (gedrag identiek)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://frontlix.com'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
