import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/tokens.css'
import '@/styles/globals.css'
import PostHogProvider from '@/components/providers/PostHogProvider'
import GoogleAnalytics from '@/components/providers/GoogleAnalytics'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1A56FF',
}

export const metadata: Metadata = {
  title: 'Frontlix | Automatische leadopvolging via WhatsApp',
  description:
    'Binnen 60 seconden wordt elke nieuwe lead automatisch opgevolgd via WhatsApp — persoonlijk, automatisch en met een kant-en-klare offerte.',
  keywords: [
    'leadopvolging',
    'WhatsApp automatisering',
    'automatische offerte',
    'lead management',
    'sales automatisering',
    'Nederland',
  ],
  authors: [{ name: 'Frontlix', url: 'https://frontlix.com' }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://frontlix.com'
  ),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Frontlix | Automatische leadopvolging via WhatsApp',
    description:
      'Binnen 60 seconden wordt elke nieuwe lead automatisch opgevolgd via WhatsApp — persoonlijk, automatisch en met een kant-en-klare offerte.',
    url: 'https://frontlix.com',
    siteName: 'Frontlix',
    locale: 'nl_NL',
    type: 'website',
    images: [
      {
        url: '/og-frontlix.png',
        width: 1200,
        height: 630,
        alt: 'Frontlix — Automatische leadopvolging via WhatsApp',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frontlix | Automatische leadopvolging via WhatsApp',
    description:
      'Binnen 60 seconden wordt elke nieuwe lead automatisch opgevolgd via WhatsApp — persoonlijk, automatisch en met een kant-en-klare offerte.',
    images: ['/og-frontlix.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

/* ── Structured Data ─────────────────────────────────── */

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://frontlix.com/#organization',
      name: 'Frontlix',
      url: 'https://frontlix.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://frontlix.com/logo.png',
      },
      description:
        'Frontlix automatiseert leadopvolging via WhatsApp. Binnen 60 seconden een persoonlijke reactie en kant-en-klare offerte.',
      foundingDate: '2024',
      founder: [
        { '@type': 'Person', name: 'Christiaan Tromp' },
        { '@type': 'Person', name: 'Georg Tromp' },
      ],
      areaServed: { '@type': 'Country', name: 'Nederland' },
      inLanguage: 'nl',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+31624965270',
        email: 'info@frontlix.com',
        contactType: 'sales',
        availableLanguage: 'Dutch',
      },
    },
    {
      '@type': 'ProfessionalService',
      '@id': 'https://frontlix.com/#business',
      name: 'Frontlix',
      url: 'https://frontlix.com',
      logo: 'https://frontlix.com/logo.png',
      image: 'https://frontlix.com/og-frontlix.png',
      telephone: '+31624965270',
      email: 'info@frontlix.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Theresiastraat',
        addressLocality: 'Den Haag',
        addressCountry: 'NL',
      },
      areaServed: { '@type': 'Country', name: 'Nederland' },
      priceRange: '$$',
      inLanguage: 'nl',
      description:
        'Automatische leadopvolging via WhatsApp voor MKB-bedrijven in Nederland.',
      foundingDate: '2024',
      taxID: '90193695',
      parentOrganization: { '@id': 'https://frontlix.com/#organization' },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://frontlix.com/#website',
      name: 'Frontlix',
      url: 'https://frontlix.com',
      inLanguage: 'nl',
      publisher: { '@id': 'https://frontlix.com/#organization' },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={inter.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <GoogleAnalytics />
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}
