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
    'Binnen 60 seconden reageert ons AI-systeem op elke nieuwe lead via WhatsApp — persoonlijk, automatisch en met een kant-en-klare offerte.',
  keywords: [
    'leadopvolging',
    'WhatsApp automatisering',
    'AI leads',
    'automatische offerte',
    'lead management',
    'sales automatisering',
    'Nederland',
  ],
  authors: [{ name: 'Frontlix', url: 'https://frontlix.nl' }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://frontlix.com'
  ),
  openGraph: {
    title: 'Frontlix | Automatische leadopvolging via WhatsApp',
    description:
      'Binnen 60 seconden reageert ons AI-systeem op elke nieuwe lead via WhatsApp — persoonlijk, automatisch en met een kant-en-klare offerte.',
    url: 'https://frontlix.com',
    siteName: 'Frontlix',
    locale: 'nl_NL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frontlix | Automatische leadopvolging via WhatsApp',
    description:
      'Binnen 60 seconden reageert ons AI-systeem op elke nieuwe lead via WhatsApp — persoonlijk, automatisch en met een kant-en-klare offerte.',
  },
  robots: {
    index: true,
    follow: true,
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
        <PostHogProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </PostHogProvider>
      </body>
    </html>
  )
}
