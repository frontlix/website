type Size = 'sm' | 'md' | 'lg'

export function Avatar({ name, size = 'md' }: { name: string; size?: Size }) {
  // Pakt eerste 2 woorden, neemt eerste letter van elk — "Familie Bakker" → "FB".
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  const cls = size === 'md' ? 'dash-avatar' : `dash-avatar ${size}`
  return <div className={cls}>{initials || '?'}</div>
}
