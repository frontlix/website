'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

/** Search-input voor inbox-conversaties — sync via ?q=. */
export function InboxSearch({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  useEffect(() => {
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
    <div className="dash-search-inline" style={{ width: '100%', maxWidth: '100%' }}>
      <Search size={14} style={{ color: 'var(--fg-muted)' }} />
      <input
        type="text"
        placeholder="Zoek in gesprekken…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}
