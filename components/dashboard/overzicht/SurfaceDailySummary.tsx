import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { buildSurfaceSummary, type SurfaceSummaryStats } from '@/lib/dashboard/surface-summary'
import styles from './SurfaceDailySummary.module.css'

export type { SurfaceSummaryStats }

/**
 * "Surface samenvatting" — banner kaartje bovenaan de overzicht-pagina.
 * Template-based body-tekst uit echte stats. Geen AI-call op v1 (kost
 * OpenAI-tokens per pageload); upgrade naar AI-gen kan later.
 */
export function SurfaceDailySummary({
  greeting,
  voornaam,
  chatbotName,
  stats,
}: {
  greeting: string
  voornaam: string
  chatbotName: string
  stats: SurfaceSummaryStats
}) {
  const body = buildSurfaceSummary(stats)

  return (
    <div className={styles.banner}>
      <div className={styles.iconBadge} aria-hidden>
        <Sparkles size={18} strokeWidth={2.25} />
      </div>

      <div className={styles.body}>
        <div className={styles.kicker}>
          <span className={styles.kickerText}>
            {greeting.toUpperCase()}, {voornaam.toUpperCase()} ·{' '}
            {chatbotName.toUpperCase()} SAMENVATTING
          </span>
        </div>
        <h3 className={styles.title}>Dag in cijfers</h3>
        <p className={styles.text}>{body}</p>

        <div className={styles.actions}>
          {/* `scroll: false` zodat Next.js niet naar boven scrollt — drawer
              opent in-place via searchParam state. */}
          <Link href="?dagrapport=1" scroll={false} className={styles.cta}>
            Bekijk dagrapport
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// Tekst-bouw-logica is verhuisd naar `lib/dashboard/surface-summary.ts`
// zodat zowel desktop (deze component) als mobile (AiBriefCard) dezelfde
// builder kunnen importeren zonder cross-component imports.
