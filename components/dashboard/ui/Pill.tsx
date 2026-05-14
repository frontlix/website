import type { ReactNode } from 'react'

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'wa'

export function Pill({
  tone = 'gray',
  dot = false,
  sm = false,
  children,
}: {
  tone?: Tone
  dot?: boolean
  /** Compactere variant — gebruikt op pipeline-cards en in-table. */
  sm?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={`dash-pill dash-pill-${tone}`}
      style={sm ? { fontSize: 10, padding: '2px 7px' } : undefined}
    >
      {dot && <span className="dash-pill-dot" />}
      {children}
    </span>
  )
}
