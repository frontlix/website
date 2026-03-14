import Hero from '@/components/sections/Hero'
import BenefitsSection from '@/components/sections/BenefitsSection'
import StepsSection from '@/components/sections/StepsSection'
import WorkflowDemo from '@/components/sections/WorkflowDemo'
import ProfilesSection from '@/components/sections/ProfilesSection'
import FeaturesSection from '@/components/sections/FeaturesSection'
import TestimonialSection from '@/components/sections/TestimonialSection'
import StatsSection from '@/components/sections/StatsSection'
import CtaSection from '@/components/sections/CtaSection'

export default function HomePage() {
  return (
    <>
      <Hero />
      <BenefitsSection />
      <StepsSection />
      <WorkflowDemo />
      <ProfilesSection />
      <FeaturesSection />
      <TestimonialSection />
      <StatsSection />
      <CtaSection />
    </>
  )
}
