'use client'

import { X, Plus } from 'lucide-react'
import { InstGroupCard, InstGhostBtn } from './InstAtoms'
import { INST_TAGS } from './instellingen-mock'
import styles from './InstTags.module.css'

/** Tags-detailscherm — lijst van tags met tinted pill, lead-count, SYS-badge of X.
 *  --tint injected per tag via CSS custom property (color-mix voor bg).
 *  v1: read-only lijst + knop voor nieuwe tag. */
export function InstTags() {
  return (
    <div className={styles.wrap}>
      <InstGroupCard>
        {INST_TAGS.map((tag, i) => (
          <div
            key={i}
            className={styles.row}
            data-last={i === INST_TAGS.length - 1}
          >
            {/* Tinted pill — --tint injected as CSS custom property */}
            <span
              className={styles.pill}
              style={{ '--tint': tag.c } as React.CSSProperties}
            >
              {tag.l}
            </span>

            <span className={styles.count}>
              {tag.n > 0
                ? `${tag.n} ${tag.n === 1 ? 'lead' : 'leads'}`
                : 'ongebruikt'}
            </span>

            {tag.sys ? (
              /* System tag — not deletable */
              <span className={styles.sysBadge}>SYS</span>
            ) : (
              /* User tag — deletable */
              <button
                type="button"
                className={styles.removeBtn}
                aria-label={`Verwijder tag ${tag.l}`}
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </InstGroupCard>

      <div className={styles.footer}>
        <InstGhostBtn>
          <Plus size={15} aria-hidden="true" />
          Nieuwe tag
        </InstGhostBtn>
      </div>
    </div>
  )
}
