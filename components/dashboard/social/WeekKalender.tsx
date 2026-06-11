// Week-strip: zeven dagkolommen (maandag tot zondag), per dag de geplande
// posts als kleine chips. Server Component (geen client-hooks nodig), de
// week-navigatie loopt via ?week= links. Structuur geleend van de
// AgendaWeekGrid-aanpak (vaste dag-kolommen, Amsterdamse tijd), maar
// vereenvoudigd tot een dag-strip want social-posts hebben geen uur-grid
// nodig zoals afspraken.

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PostStatusBadge } from './PostStatusBadge'
import type { SocialPostMetVarianten } from '@/lib/dashboard/social-queries'
import type { SocialStatus } from '@/lib/dashboard/social-types'
import styles from './WeekKalender.module.css'

const WEEKDAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] as const

// Levert de maandag (00:00 lokaal) van de week waarin `ref` valt. Werkt in
// UTC-millis maar corrigeert op basis van de lokale weekdag.
function maandagVan(ref: Date): Date {
  const d = new Date(ref)
  d.setHours(0, 0, 0, 0)
  // JS: zondag = 0, maandag = 1. We willen maandag als start.
  const dag = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dag)
  return d
}

// `week` param-formaat: YYYY-MM-DD (een datum in de gewenste week). Leeg = nu.
function parseWeekParam(week?: string): Date {
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    const d = new Date(`${week}T12:00:00`)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ISO-weeknummer, voor het kopje boven de strip.
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const diff = date.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000))
}

function formatTijd(iso: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  }).format(new Date(iso))
}

export function WeekKalender({
  posts,
  weekParam,
}: {
  posts: SocialPostMetVarianten[]
  weekParam?: string
}) {
  const ref = parseWeekParam(weekParam)
  const maandag = maandagVan(ref)

  // Zeven dagen vanaf maandag.
  const dagen = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(maandag)
    d.setDate(maandag.getDate() + i)
    return d
  })

  const vandaagKey = ymd(new Date())

  // Posts per dag-key groeperen. We vergelijken op de Amsterdamse dag van de
  // geplande_datum (UTC in de DB).
  const perDag = new Map<string, SocialPostMetVarianten[]>()
  for (const p of posts) {
    const dagKey = ymdInAmsterdam(p.geplande_datum)
    const lijst = perDag.get(dagKey) ?? []
    lijst.push(p)
    perDag.set(dagKey, lijst)
  }

  // Navigatie-links: een week terug/vooruit op basis van de maandag.
  const vorige = new Date(maandag)
  vorige.setDate(maandag.getDate() - 7)
  const volgende = new Date(maandag)
  volgende.setDate(maandag.getDate() + 7)

  return (
    <div className={`${styles.kaart} dash-card`}>
      <div className={styles.kop}>
        <div className={styles.weekTitel}>
          Week {isoWeek(maandag)} · {maandag.getFullYear()}
        </div>
        <div className={styles.nav}>
          <Link
            className={styles.navBtn}
            href={`/social?week=${ymd(vorige)}`}
            scroll={false}
            aria-label="Vorige week"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link className={styles.navNu} href="/social" scroll={false}>
            Deze week
          </Link>
          <Link
            className={styles.navBtn}
            href={`/social?week=${ymd(volgende)}`}
            scroll={false}
            aria-label="Volgende week"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className={styles.strip}>
        {dagen.map((d, i) => {
          const key = ymd(d)
          const isVandaag = key === vandaagKey
          const dagPosts = perDag.get(key) ?? []
          return (
            <div
              key={key}
              className={`${styles.dag} ${isVandaag ? styles.dagVandaag : ''}`}
            >
              <div className={styles.dagKop}>
                <span className={styles.dagNaam}>{WEEKDAGEN[i]}</span>
                <span className={styles.dagNum}>{d.getDate()}</span>
              </div>
              <div className={styles.dagPosts}>
                {dagPosts.length === 0 ? (
                  <span className={styles.dagLeeg}>-</span>
                ) : (
                  dagPosts.map((p) => (
                    <div key={p.id} className={styles.chip}>
                      <span className={styles.chipTijd}>
                        {formatTijd(p.geplande_datum)}
                      </span>
                      <PostStatusBadge status={p.status as SocialStatus} sm />
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Amsterdamse dag-key (YYYY-MM-DD) voor een UTC-timestamp. en-CA levert
// standaard het ISO-formaat YYYY-MM-DD.
function ymdInAmsterdam(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Amsterdam',
  }).format(new Date(iso))
}
