import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/tokens.css'
import '@/styles/globals.css'
import Navbar from '@/components/sections/Navbar'
import Footer from '@/components/sections/Footer'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Frontlix | Digitale groei voor moderne bedrijven',
  description:
    'Frontlix bouwt websites en digitale oplossingen die converteren, groeien en presteren. Jouw strategische tech-partner voor echte resultaten.',
  keywords: [
    'webdevelopment',
    'Next.js',
    'SEO',
    'web applicaties',
    'UI/UX design',
    'digitale groei',
    'Nederland',
  ],
  authors: [{ name: 'Frontlix', url: 'https://frontlix.nl' }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://frontlix.nl'
  ),
  openGraph: {
    title: 'Frontlix | Digitale groei voor moderne bedrijven',
    description:
      'Wij bouwen websites en digitale oplossingen die niet alleen mooi zijn — maar die converteren, groeien en presteren.',
    url: 'https://frontlix.nl',
    siteName: 'Frontlix',
    locale: 'nl_NL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frontlix | Digitale groei voor moderne bedrijven',
    description:
      'Wij bouwen websites en digitale oplossingen die niet alleen mooi zijn — maar die converteren, groeien en presteren.',
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
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
