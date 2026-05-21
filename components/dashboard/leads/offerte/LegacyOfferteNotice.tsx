'use client'

/**
 * LegacyOfferteNotice — banner getoond wanneer een lead WEL een verzonden
 * offerte heeft, maar GEEN prijsregels in de DB.
 *
 * Dit gebeurt vooral bij oude offertes (bot-flow vóór de redesign) die
 * alleen offertes.totaal_incl + PDF opsloegen, niet de losse regels.
 * De banner biedt een knop om de regels alsnog uit lead-data te
 * regenereren via `regenerateAutoRegels()`.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Sparkles } from 'lucide-react'
import { regenerateAutoRegels } from '@/lib/dashboard/offerte-auto-regels'
import styles from './LegacyOfferteNotice.module.css'

type Props = {
  leadId: string
}

export function LegacyOfferteNotice({ leadId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleGenereer() {
    setError(null)
    startTransition(async () => {
      const res = await regenerateAutoRegels(leadId)
      if (res.ok) {
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className={styles.notice}>
      <div className={styles.iconWrap}>
        <AlertCircle size={18} aria-hidden="true" />
      </div>
      <div className={styles.body}>
        <div className={styles.title}>Geen detail-regels voor deze offerte</div>
        <p className={styles.text}>
          De verzonden offerte heeft geen losse regels in de database — alleen
          het totaalbedrag en de PDF. Klik hieronder om automatisch regels te
          genereren uit de huidige lead-data zodat je ze kunt bekijken en
          aanpassen.
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
      <button
        type="button"
        onClick={handleGenereer}
        disabled={pending}
        className={styles.button}
      >
        <Sparkles size={14} aria-hidden="true" />
        <span>{pending ? 'Genereren…' : 'Genereer uit lead-data'}</span>
      </button>
    </div>
  )
}
