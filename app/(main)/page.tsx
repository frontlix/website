import type { Metadata } from 'next'
import Hero from '@/components/sections/Hero'
import BenefitsSection from '@/components/sections/BenefitsSection'
import StepsSection from '@/components/sections/StepsSection'
import LeadCheckTeaser from '@/components/sections/LeadCheckTeaser'
import ProfilesSection from '@/components/sections/ProfilesSection'
import FaqSection from '@/components/sections/FaqSection'
import { faqs } from '@/lib/faq-data'

export const metadata: Metadata = {
  title: 'Frontlix | Automatische leadopvolging via WhatsApp',
  description:
    'Elke nieuwe lead krijgt automatisch een persoonlijk antwoord via WhatsApp en een kant-en-klare offerte. Van aanvraag tot offerte, ook als jij aan het werk bent.',
  alternates: {
    canonical: '/',
    languages: { nl: '/' },
  },
  openGraph: {
    title: 'Frontlix | Automatische leadopvolging via WhatsApp',
    description:
      'Elke nieuwe lead krijgt automatisch een persoonlijk antwoord via WhatsApp en een kant-en-klare offerte. Van aanvraag tot offerte, ook als jij aan het werk bent.',
    url: '/',
    locale: 'nl_NL',
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Hero />
      <BenefitsSection />
      <StepsSection />
      <LeadCheckTeaser />
      <ProfilesSection />
      <FaqSection />
    </>
  )
}
