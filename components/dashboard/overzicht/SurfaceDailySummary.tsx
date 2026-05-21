import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import styles from './SurfaceDailySummary.module.css'

export type SurfaceSummaryStats = {
  leadsVandaag: number
  offertesWeek: number
  akkoordWeek: number
  omzetMaand: number
  gemTicket: number
}

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
  const body = buildSummary(stats)

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

// ── Tekst-builder ───────────────────────────────────────────────────
//
// Per zin: alleen tonen als er iets te zeggen is. Daarmee voorkomen we
// awkward "0 nieuwe leads vandaag, 0 offertes uit, 0 akkoord."

function buildSummary(s: SurfaceSummaryStats): string {
  const zinnen: string[] = []

  // Zin 1 — vandaag + week
  const today =
    s.leadsVandaag === 0
      ? 'Nog geen nieuwe leads vandaag'
      : `${s.leadsVandaag} ${plural(s.leadsVandaag, 'nieuwe lead', 'nieuwe leads')} vandaag`
  const offertesPart =
    s.offertesWeek > 0
      ? `${s.offertesWeek} ${plural(s.offertesWeek, 'offerte', 'offertes')} uit deze week`
      : null
  const akkoordPart =
    s.akkoordWeek > 0
      ? `${s.akkoordWeek} akkoord`
      : null

  const dayParts = [today, offertesPart, akkoordPart].filter(Boolean) as string[]
  zinnen.push(dayParts.join(', ') + '.')

  // Zin 2 — omzet + ticket
  const omzetTxt =
    s.omzetMaand > 0
      ? `Omzet maand-tot-nu €${formatEuro(s.omzetMaand)}`
      : null
  const ticketTxt =
    s.gemTicket > 0 ? `gem. ticket €${formatEuro(s.gemTicket)}` : null
  const omzetParts = [omzetTxt, ticketTxt].filter(Boolean) as string[]
  if (omzetParts.length > 0) {
    zinnen.push(omzetParts.join(' — ') + '.')
  }

  return zinnen.join(' ')
}

function plural(n: number, een: string, meer: string): string {
  return n === 1 ? een : meer
}

function formatEuro(n: number): string {
  return Math.round(n).toLocaleString('nl-NL')
}
