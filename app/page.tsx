import Hero from '@/components/sections/Hero'
import BenefitsSection from '@/components/sections/BenefitsSection'
import StepsSection from '@/components/sections/StepsSection'
import ProfilesSection from '@/components/sections/ProfilesSection'
import FaqSection from '@/components/sections/FaqSection'
import { faqs } from '@/lib/faq-data'

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
      <ProfilesSection />
      <FaqSection />
    </>
  )
}
