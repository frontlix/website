'use client'

import { starFills } from './star-fills'
import styles from './StarRating.module.css'

// Pure ster-vul-math leeft in star-fills.ts (los testbaar in een node-env zonder
// JSX/CSS-module-transform). Hier alleen re-exporten voor backwards-compat.
export { starFills }

const STAR_PATH =
  'M12 2.2l2.9 6.26 6.85.56-5.2 4.52 1.57 6.66L12 16.95 5.88 20.2l1.57-6.66-5.2-4.52 6.85-.56z'

type Props = {
  value: number
  /** Ster-grootte in px. */
  size?: number
  /** Tussenruimte in px. */
  gap?: number
}

/** Google-stijl sterren met fractionele vulling (twee-laags SVG-clip). */
export function StarRating({ value, size = 14, gap = 2 }: Props) {
  const vars = { '--star-size': `${size}px`, '--star-gap': `${gap}px` } as React.CSSProperties
  return (
    <div className={styles.row} style={vars} role="img" aria-label={`${value} van 5 sterren`}>
      {starFills(value).map((pct, i) => (
        <span key={i} className={styles.star} style={{ '--star-fill': `${pct}%` } as React.CSSProperties}>
          <svg className={styles.base} viewBox="0 0 24 24" aria-hidden="true">
            <path d={STAR_PATH} />
          </svg>
          <span className={styles.clip}>
            <svg className={styles.fill} viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR_PATH} />
            </svg>
          </span>
        </span>
      ))}
    </div>
  )
}
