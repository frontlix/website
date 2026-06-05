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

  // y-positie (viewBox-coördinaat) voor een waarde, zelfde schaal als de lijn.
  const yFor = (count: number) =>
    VIEW_H - PAD_Y - (count / max) * (VIEW_H - PAD_Y * 2)

  // Y-as ticks: max bovenaan, midden, 0 onderaan. Set dedupliceert bij lage max.
  const ticks = [...new Set([max, Math.ceil(max / 2), 0])]

  // Bouw "M x,y L x,y L x,y …" path
  const d = points
    .map((p, i) => {
      const x = PAD_X + i * stepX
      const y = yFor(p.count)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  // Highlight de laatste dag (vandaag) met een dot
  const last = points[points.length - 1]
  const lastX = PAD_X + (points.length - 1) * stepX
  const lastY = yFor(last.count)

  const total = points.reduce((a, b) => a + b.count, 0)

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.totalLabel}>{total} totaal</span>
      </div>
      <div className={styles.chartRow}>
        {/* Y-as cijfers als HTML, zodat ze niet uitrekken met de viewBox */}
        <div className={styles.yAxis}>
          {ticks.map((t) => (
            <span
              key={t}
              className={styles.yLabel}
              style={{ top: `${(yFor(t) / VIEW_H) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Trend: ${total} leads over laatste ${points.length} dagen`}
        >
          {/* Horizontale gridlines op de tick-hoogtes */}
          {ticks.map((t) => (
            <line
              key={t}
              x1={0}
              x2={VIEW_W}
              y1={yFor(t)}
              y2={yFor(t)}
              className={styles.grid}
            />
          ))}
          <path d={d} className={styles.line} fill="none" />
          <circle cx={lastX} cy={lastY} r="3" className={styles.dot} />
        </svg>
      </div>
      <div className={styles.axis}>
        <span>{points[0].date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  )
}
