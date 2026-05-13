import type { ReactNode } from 'react'

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'wa'

export function Pill({
  tone = 'gray',
  dot = false,
  children,
}: {
  tone?: Tone
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span className={`dash-pill dash-pill-${tone}`}>
      {dot && <span className="dash-pill-dot" />}
      {children}
    </span>
  )
}
