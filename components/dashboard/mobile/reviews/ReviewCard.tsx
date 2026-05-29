'use client'

import { Flame } from 'lucide-react'
import { StarRating } from '../shared/StarRating'
import { ReviewAvatar } from './ReviewAtoms'
import { ReviewReplyComposer } from './ReviewReplyComposer'
import type { MobileReview, ReviewTemplate } from './review-helpers'
import styles from './ReviewCard.module.css'

type Props = {
  review: MobileReview
  /** Lokaal geplaatste reactie (deze sessie), indien aanwezig. */
  placedReply?: string
  isOpen: boolean
  draft: string
  templates: ReviewTemplate[]
  onOpen: () => void
  onCancel: () => void
  onDraftChange: (text: string) => void
  onPost: () => void
}

export function ReviewCard({
  review, placedReply, isOpen, draft, templates, onOpen, onCancel, onDraftChange, onPost,
}: Props) {
  const replyText = placedReply ?? (review.status === 'beantwoord' ? review.reply : undefined)
  // 'beantwoord' zonder reply-tekst (toekomstige echte data) telt ook als beantwoord,
  // zodat er geen valse "Reageer"-knop verschijnt.
  const replied = Boolean(replyText) || review.status === 'beantwoord'
  const flagged = Boolean(review.flag) && !replied

  return (
    <article className={styles.card} data-flagged={flagged}>
      <div className={styles.head}>
        <ReviewAvatar initial={review.initial} color={review.color} size={38} />
        <div className={styles.who}>
          <div className={styles.naam}>{review.naam}</div>
          <div className={styles.meta}>
            <StarRating value={review.sterren} size={13} gap={1} />
            <span className={styles.datum}>{review.datum}</span>
          </div>
        </div>
        {flagged && <span className={styles.flagPill}>Aandacht</span>}
      </div>

      <p className={styles.text}>{review.text}</p>

      {flagged && !isOpen && (
        <div className={styles.hint}>
          <Flame size={14} aria-hidden="true" />
          Reageer met zorg — een nette reactie herstelt vertrouwen.
        </div>
      )}

      {replied && !isOpen && (
        <div className={styles.reply}>
          <div className={styles.replyAuthor}>Reactie van Schoon Straatje</div>
          <div className={styles.replyText}>{replyText}</div>
        </div>
      )}

      {!replied && !isOpen && (
        <button type="button" className={styles.reageer} onClick={onOpen}>
          Reageer
        </button>
      )}

      {isOpen && (
        <ReviewReplyComposer
          review={review}
          templates={templates}
          draft={draft}
          onDraftChange={onDraftChange}
          onCancel={onCancel}
          onPost={onPost}
        />
      )}
    </article>
  )
}
