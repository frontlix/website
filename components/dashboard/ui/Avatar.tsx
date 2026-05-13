type Size = 'sm' | 'md' | 'lg'

export function Avatar({
  name,
  size = 'md',
  tint,
}: {
  name: string
  size?: Size
  /** Optionele kleur-tint 1-5. Wanneer ongeset: gradient (Frontlix-brand). */
  tint?: 1 | 2 | 3 | 4 | 5
}) {
  // Pakt eerste 2 woorden, neemt eerste letter van elk — "Familie Bakker" → "FB".
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  // Auto-tint via hash op naam wanneer geen expliciete tint is meegegeven
  // — geeft elke klant een eigen herkenbare kleur in lijsten.
  const resolvedTint = tint ?? tintFromName(name)

  const sizeClass = size === 'md' ? '' : size
  const cls = ['dash-avatar', sizeClass, `dash-avatar-tint-${resolvedTint}`]
    .filter(Boolean)
    .join(' ')
  return <div className={cls}>{initials || '?'}</div>
}

function tintFromName(name: string): 1 | 2 | 3 | 4 | 5 {
  if (!name) return 1
  const code = name.charCodeAt(0)
  return ((code % 5) + 1) as 1 | 2 | 3 | 4 | 5
}
