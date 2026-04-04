import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/tokens.css'
import '@/styles/globals.css'
import Navbar from '@/components/sections/Navbar'
import Footer from '@/components/sections/Footer'
import PostHogProvider from '@/components/providers/PostHogProvider'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

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
        url: '/open graph frontlix.png',
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
    images: ['/open graph frontlix.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Frontlix',
  url: 'https://frontlix.com',
  logo: 'https://frontlix.com/logo_frontlix_trans.png',
  description:
    'Frontlix automatiseert leadopvolging via WhatsApp. Binnen 60 seconden een persoonlijke reactie en kant-en-klare offerte.',
  foundingDate: '2024',
  areaServed: {
    '@type': 'Country',
    name: 'Nederland',
  },
  inLanguage: 'nl',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+31-6-24752476',
    contactType: 'sales',
    availableLanguage: 'Dutch',
  },
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
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <PostHogProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </PostHogProvider>
      </body>
    </html>
  )
}
