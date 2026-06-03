'use client'

import { fillTemplate, type MobileReview, type ReviewTemplate } from './review-helpers'
import styles from './ReviewReplyComposer.module.css'

type Props = {
  review: MobileReview
  templates: ReviewTemplate[]
  draft: string
  onDraftChange: (text: string) => void
  onCancel: () => void
  onPost: () => void
}

export function ReviewReplyComposer({ review, templates, draft, onDraftChange, onCancel, onPost }: Props) {
  return (
    <div className={styles.composer}>
      <div className={styles.title}>Concept-antwoord (voorbeeld, gaat nog niet live naar Google)</div>
      <div className={styles.chips}>
        {templates.map((tp) => {
          const herstel = tp.k === 'herstel' && Boolean(review.flag)
          return (
            <button
              key={tp.k}
              type="button"
              className={styles.chip}
              data-herstel={herstel}
              onClick={() => onDraftChange(fillTemplate(tp.text, review.naam))}
            >
              {tp.label}
            </button>
          )
        })}
      </div>
      <textarea
        className={styles.textarea}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Schrijf een antwoord…"
      />
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Annuleer
        </button>
        <button type="button" className={styles.post} disabled={!draft.trim()} onClick={onPost}>
          Antwoord opslaan
        </button>
      </div>
    </div>
  )
}
