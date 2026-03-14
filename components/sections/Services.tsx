import { Globe, Search, AppWindow, Paintbrush, Zap, Shield } from 'lucide-react'
import Button from '@/components/ui/Button'
import styles from './Services.module.css'

const services = [
  {
    icon: Globe,
    title: 'Webdevelopment',
    description:
      'Wij bouwen razendsnelle, moderne websites die niet alleen mooi ogen maar ook presteren. Met Next.js, TypeScript en de nieuwste webtechnologieën zorgen we voor een solide fundament.',
    features: [
      'Next.js & React ontwikkeling',
      'Mobiel-eerst design',
      'CMS-integratie',
      'Performance geoptimaliseerd',
    ],
  },
  {
    icon: Search,
    title: 'SEO & Marketing',
    description:
      'Van technische SEO-audits tot een complete content-strategie: wij zorgen dat jouw doelgroep jou vindt. Duurzame organische groei door bewezen methodes.',
    features: [
      'Technische SEO-audit',
      'Content-strategie',
      'Keyword-onderzoek',
      'Lokale SEO',
    ],
  },
  {
    icon: AppWindow,
    title: 'Web Applicaties',
    description:
      'Op maat gemaakte web-applicaties die jouw interne processen stroomlijnen. Van dashboards en portalen tot volledige SaaS-producten — wij bouwen wat jij nodig hebt.',
    features: [
      'Custom dashboards',
      'API-integraties',
      'Authenticatie & autorisatie',
      'Schaalbaarheid',
    ],
  },
  {
    icon: Paintbrush,
    title: 'UI/UX Design',
    description:
      'Gebruikerservaringen die converteren. Wij combineren doordacht ontwerp met gebruikersonderzoek om interfaces te bouwen die intuïtief, aantrekkelijk en effectief zijn.',
    features: [
      'Wireframing & prototyping',
      'Gebruikersonderzoek',
      'Design systemen',
      'Pixel-perfect implementatie',
    ],
  },
  {
    icon: Zap,
    title: 'Prestatie-optimalisatie',
    description:
      'Elke milliseconde telt. Wij analyseren en optimaliseren bestaande websites voor snelheid, Core Web Vitals en laadtijden — met directe impact op rankings en conversies.',
    features: [
      'Core Web Vitals optimalisatie',
      'Afbeeldingsoptimalisatie',
      'Code splitting & lazy loading',
      'Server-side rendering',
    ],
  },
  {
    icon: Shield,
    title: 'Onderhoud & Support',
    description:
      'Geen zorgen meer over updates, beveiliging of downtime. Wij bieden betrouwbaar onderhoud en proactieve support zodat jouw website altijd optimaal functioneert.',
    features: [
      'Maandelijkse updates',
      'Beveiligingsmonitoring',
      'Uptime-garantie',
      'Prioriteitsondersteuning',
    ],
  },
]

const pricingTiers = [
  {
    tier: 'Starter',
    price: '€1.499',
    description: 'Perfecte basis voor starters en kleine ondernemingen die online willen groeien.',
    features: [
      'Tot 5 pagina\'s',
      'Responsief design',
      'Basis SEO-optimalisatie',
      'Contact formulier',
      '1 maand support',
    ],
    featured: false,
  },
  {
    tier: 'Professional',
    price: '€3.999',
    description: 'Voor groeiende bedrijven die een complete digitale aanwezigheid willen.',
    features: [
      'Onbeperkt pagina\'s',
      'CMS-integratie',
      'Uitgebreide SEO-strategie',
      'Analytics & tracking',
      '3 maanden support',
      'Performance garantie',
    ],
    featured: true,
  },
  {
    tier: 'Enterprise',
    price: 'Op maat',
    description: 'Volledig maatwerk voor grote organisaties met complexe eisen.',
    features: [
      'Alles uit Professional',
      'Web applicaties',
      'API-integraties',
      'Dedicated support',
      '12 maanden onderhoud',
      'SLA-garantie',
    ],
    featured: false,
  },
]

export default function Services() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.label}>Wat wij doen</span>
          <h2 className={styles.heading}>Onze Diensten</h2>
          <p className={styles.subtext}>
            Van strategie tot lancering — wij bieden alles wat jouw digitale
            aanwezigheid nodig heeft om te groeien en te presteren.
          </p>
        </div>

        <div className={styles.grid}>
          {services.map((service) => {
            const Icon = service.icon
            return (
              <div key={service.title} className={styles.card}>
                <div className={styles.cardIcon}>
                  <Icon size={26} />
                </div>
                <h3 className={styles.cardTitle}>{service.title}</h3>
                <p className={styles.cardDescription}>{service.description}</p>
                <div className={styles.cardFeatures}>
                  {service.features.map((feature) => (
                    <span key={feature} className={styles.cardFeature}>
                      <span className={styles.checkMark}>✓</span>
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pricing section */}
        <div className={styles.pricingSection}>
          <div className={styles.pricingHeader}>
            <h2 className={styles.pricingHeading}>Transparante prijzen</h2>
            <p className={styles.pricingSubtext}>
              Geen verborgen kosten. Kies het pakket dat bij jou past.
            </p>
          </div>

          <div className={styles.pricingGrid}>
            {pricingTiers.map((tier) => (
              <div
                key={tier.tier}
                className={`${styles.pricingCard} ${tier.featured ? styles.pricingCardFeatured : ''}`}
              >
                {tier.featured && (
                  <span className={styles.featuredBadge}>Meest populair</span>
                )}
                <div>
                  <p className={styles.pricingTier}>{tier.tier}</p>
                  <p className={styles.pricingPrice}>
                    {tier.price}
                    {tier.price !== 'Op maat' && (
                      <span className={styles.pricingPriceSuffix}> /project</span>
                    )}
                  </p>
                </div>
                <p className={styles.pricingDescription}>{tier.description}</p>
                <div className={styles.pricingFeatures}>
                  {tier.features.map((feature) => (
                    <span key={feature} className={styles.pricingFeature}>
                      <span className={styles.pricingCheck}>✓</span>
                      {feature}
                    </span>
                  ))}
                </div>
                <Button
                  href="/contact"
                  variant={tier.featured ? 'primary' : 'secondary'}
                  size="md"
                  fullWidth
                >
                  {tier.tier === 'Enterprise' ? 'Neem contact op' : 'Aan de slag'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
