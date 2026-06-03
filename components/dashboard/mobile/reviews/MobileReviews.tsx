'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { ReviewScoreHeader } from './ReviewScoreHeader'
import { ReviewsTabs } from './ReviewsTabs'
import { ReviewCard } from './ReviewCard'
import { reviewCounts, filterReviews, type ReviewTab, type ReviewTextMap } from './review-helpers'
import { REVIEWS_MOCK, REVIEW_TEMPLATES, REVIEW_AGGREGATE } from './reviews-mock'
import styles from './MobileReviews.module.css'

type Props = { bedrijfsnaam?: string }

export function MobileReviews({ bedrijfsnaam = 'je bedrijf' }: Props) {
  const [tab, setTab] = useState<ReviewTab>('nieuw')
  const [openId, setOpenId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<ReviewTextMap>({})
  const [done, setDone] = useState<ReviewTextMap>({})
  const [toast, setToast] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const counts = useMemo(() => reviewCounts(REVIEWS_MOCK, done), [done])
  const list = useMemo(() => filterReviews(REVIEWS_MOCK, tab, done), [tab, done])

  // Ruim de toast-timer op bij unmount, en reset 'm bij elke nieuwe post
  // zodat snel opeenvolgende reacties de toast niet vroegtijdig wegklikken.
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const post = (id: string) => {
    const text = (drafts[id] ?? '').trim()
    if (!text) return
    setDone((d) => ({ ...d, [id]: text }))
    setOpenId(null)
    setToast(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(false), 2600)
  }

  return (
    <div className={styles.root}>
      {/* Eerlijkheids-banner: deze cijfers + reviews zijn voorbeelddata.
          Toon/tekst consistent met de desktop /reviews demo-banner. */}
      <div className={styles.demoBanner} role="note">
        Voorbeeld, reviews-koppeling volgt. Deze score en reviews zijn nog
        geen echte data; zodra Surface na elke klus een review-vraag
        verstuurt verschijnen hier jouw echte Google-reviews.
      </div>
      <ReviewScoreHeader
        score={REVIEW_AGGREGATE.score}
        total={REVIEW_AGGREGATE.total}
        deltaMaand={REVIEW_AGGREGATE.deltaMaand}
        bedrijfsnaam={bedrijfsnaam}
      />

      <ReviewsTabs active={tab} counts={counts} onSelect={(t) => { setTab(t); setOpenId(null) }} />

      <div className={styles.list}>
        {list.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <Check size={26} aria-hidden="true" />
            </div>
            <div className={styles.emptyTitle}>Niets meer te doen</div>
            <div className={styles.emptySub}>Alle reviews in deze lijst zijn afgehandeld.</div>
          </div>
        ) : (
          list.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              bedrijfsnaam={bedrijfsnaam}
              placedReply={done[r.id]}
              isOpen={openId === r.id}
              draft={drafts[r.id] ?? ''}
              templates={REVIEW_TEMPLATES}
              onOpen={() => setOpenId(r.id)}
              onCancel={() => setOpenId(null)}
              onDraftChange={(text) => setDrafts((d) => ({ ...d, [r.id]: text }))}
              onPost={() => post(r.id)}
            />
          ))
        )}
      </div>

      {toast && (
        <div className={styles.toast} role="status">
          <Check size={16} aria-hidden="true" className={styles.toastIcon} />
          <span>Antwoord opgeslagen (voorbeeld, nog niet op Google geplaatst)</span>
        </div>
      )}
    </div>
  )
}
