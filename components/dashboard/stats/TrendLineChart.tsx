import styles from './TrendLineChart.module.css'

const VIEW_W = 320
const VIEW_H = 100
const PAD_X = 4
const PAD_Y = 8

export function TrendLineChart({
  title,
  points,
}: {
  title: string
  points: Array<{ date: string; count: number }>
}) {
  if (points.length < 2) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.empty}>Te weinig data voor trend.</p>
      </div>
    )
  }

  const max = Math.max(...points.map((p) => p.count), 1)
  const stepX = (VIEW_W - PAD_X * 2) / (points.length - 1)

  // Bouw "M x,y L x,y L x,y …" path
  const d = points
    .map((p, i) => {
      const x = PAD_X + i * stepX
      const y = VIEW_H - PAD_Y - (p.count / max) * (VIEW_H - PAD_Y * 2)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  // Highlight de laatste dag (vandaag) met een dot
  const last = points[points.length - 1]
  const lastX = PAD_X + (points.length - 1) * stepX
  const lastY = VIEW_H - PAD_Y - (last.count / max) * (VIEW_H - PAD_Y * 2)

  const total = points.reduce((a, b) => a + b.count, 0)

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.totalLabel}>{total} totaal</span>
      </div>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Trend: ${total} leads over laatste ${points.length} dagen`}
      >
        <path d={d} className={styles.line} fill="none" />
        <circle
          cx={lastX}
          cy={lastY}
          r="3"
          className={styles.dot}
        />
      </svg>
      <div className={styles.axis}>
        <span>{points[0].date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  )
}
