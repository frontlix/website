'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

/**
 * Search-input voor /leads. Synct met ?q= search-param na 250ms
 * debounce zodat we niet bij elke toets een navigation triggeren.
 */
export function LeadsSearchBar({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  useEffect(() => {
    // Debounce — wacht 250ms na laatste keystroke voordat we navigeren.
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) params.set('q', value.trim())
      else params.delete('q')
      const qs = params.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="dash-search-inline">
      <Search size={14} style={{ color: 'var(--fg-muted)' }} />
      <input
        type="text"
        placeholder="Zoek naam, adres…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}
