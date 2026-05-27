'use client'

import { useState } from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import styles from './AiBriefCard.module.css'

type Props = {
  title: string
  summary: string
  primaryCtaLabel?: string
  onPrimaryCta?: () => void
}

/**
 * AiBriefCard — Surface · Samenvatting banner voor mobile Overzicht.
 * Dismissible via interne state (lokaal verbergen tot remount).
 */
export function AiBriefCard({ title, summary, primaryCtaLabel, onPrimaryCta }: Props) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null

  return (
    <section className={styles.card}>
      <div className={styles.row}>
        <span className={styles.iconBox} aria-hidden="true">
          <Sparkles size={20} />
        </span>
        <div className={styles.body}>
          <div className={styles.eyebrow}>SURFACE · SAMENVATTING</div>
          <div className={styles.title}>{title}</div>
          <div className={styles.summary}>{summary}</div>
          <div className={styles.actions}>
            {primaryCtaLabel && onPrimaryCta && (
              <button
                type="button"
                className={styles.primary}
                onClick={onPrimaryCta}
              >
                {primaryCtaLabel}
                <ArrowRight size={16} />
              </button>
            )}
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setHidden(true)}
            >
              Verberg
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
