import styles from './BarRow.module.css'

type Props = {
  label: string
  /** Rechts-uitgelijnde waarde (count of bedrag). */
  value: string
  /** 0..100 */
  pct: number
  /** Bar color (CSS color of var()). Default primary. */
  color?: string
  /** 10px (funnel) of 8px (diensten). */
  thickness?: number
}

/** Label + waarde-rij met horizontale voortgangsbalk. */
export function BarRow({ label, value, pct, color = 'var(--color-primary)', thickness = 10 }: Props) {
  // Dynamische waarden via CSS custom properties i.p.v. inline-style-theming
  // (conform CLAUDE.md: geen inline styles, wel CSS-variabelen).
  const vars = {
    '--bar-h': `${thickness}px`,
    '--bar-pct': `${Math.max(0, Math.min(100, pct))}%`,
    '--bar-fill': color,
  } as React.CSSProperties
  return (
    <div className={styles.row} style={vars}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} />
      </div>
    </div>
  )
}
