// Pure display-component. Mapt een social_posts.status op een Pill met de
// juiste toon en een Nederlandstalig label. Geen state, geen client-hooks,
// dus bruikbaar in zowel RSC als Client Components.

import { Pill } from '@/components/dashboard/ui/Pill'
import type { SocialStatus } from '@/lib/dashboard/social-types'

type PillTone = 'blue' | 'green' | 'amber' | 'red' | 'gray'

// status -> { label, tone, dot }. Eén bron van waarheid voor de hele module.
const STATUS_META: Record<
  SocialStatus,
  { label: string; tone: PillTone; dot?: boolean }
> = {
  concept:         { label: 'Concept',         tone: 'gray' },
  ter_goedkeuring: { label: 'Wacht op akkoord', tone: 'amber', dot: true },
  goedgekeurd:     { label: 'Goedgekeurd',     tone: 'blue' },
  gepubliceerd:    { label: 'Gepubliceerd',    tone: 'green', dot: true },
  afgewezen:       { label: 'Afgewezen',       tone: 'red' },
  mislukt:         { label: 'Mislukt',         tone: 'red', dot: true },
  ingetrokken:     { label: 'Ingetrokken',     tone: 'gray' },
  verlopen:        { label: 'Verlopen',        tone: 'gray' },
}

export function PostStatusBadge({
  status,
  sm = false,
}: {
  status: SocialStatus
  sm?: boolean
}) {
  // Fallback voor een onbekende status uit de DB: toon de ruwe waarde grijs
  // in plaats van te crashen.
  const meta = STATUS_META[status] ?? { label: status, tone: 'gray' as const }
  return (
    <Pill tone={meta.tone} dot={meta.dot} sm={sm}>
      {meta.label}
    </Pill>
  )
}
