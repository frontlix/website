'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Columns3, Table, LayoutGrid } from 'lucide-react'
import styles from './LeadsViewSwitcher.module.css'

export type LeadsView = 'pipeline' | 'tabel' | 'kaarten'

const OPTS: ReadonlyArray<{ k: LeadsView; l: string; Icon: typeof Table }> = [
  { k: 'pipeline', l: 'Pipeline', Icon: Columns3 },
  { k: 'tabel',    l: 'Tabel',    Icon: Table },
  { k: 'kaarten',  l: 'Kaarten',  Icon: LayoutGrid },
]

// Cookie-naam + max-age constanten. Wordt door de server-page gelezen als
// fallback wanneer er geen `?view=` in de URL staat.
const COOKIE_NAME = 'leads_view'
const ONE_YEAR_SEC = 60 * 60 * 24 * 365

function readCookieView(): LeadsView | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )leads_view=([^;]*)/)
  const v = match?.[1]
  return v === 'pipeline' || v === 'tabel' || v === 'kaarten' ? v : null
}

/**
 * Segmented-control voor de drie leads-views. Render alleen op `/leads`.
 *
 * Active-state komt uit (in volgorde): `?view=` URL-param → cookie → default
 * 'pipeline'. Page-component leest dezelfde cookie en rendert de juiste
 * view direct, dus geen full-page flash bij terugnavigatie. Zonder URL-
 * param zou de switcher initieel 'pipeline' tonen totdat de useEffect de
 * cookie leest — een mini-correctie alleen op de highlight, niet op content.
 */
export function LeadsViewSwitcher() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlView = searchParams.get('view') as LeadsView | null
  const [active, setActive] = useState<LeadsView>(urlView ?? 'pipeline')

  useEffect(() => {
    if (urlView) {
      setActive(urlView)
      return
    }
    // Geen URL-param → fallback op cookie. Server doet hetzelfde dus de
    // content is al correct gerenderd; deze sync zorgt enkel dat de
    // highlight matcht.
    const cookieView = readCookieView()
    setActive(cookieView ?? 'pipeline')
  }, [urlView])

  // Toon alleen op de leads-list, niet op /leads/[id].
  if (pathname !== '/leads') return null

  const hrefFor = (k: LeadsView) => {
    const params = new URLSearchParams(searchParams.toString())
    if (k === 'pipeline') params.delete('view')
    else params.set('view', k)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const persistChoice = (k: LeadsView) => {
    // Cookie schrijven gebeurt vóórdat Link de navigation triggert.
    // De volgende /leads-load (server) leest 'm en herstelt de view.
    document.cookie = `${COOKIE_NAME}=${k}; path=/; max-age=${ONE_YEAR_SEC}; samesite=lax`
  }

  return (
    <div className={styles.bar} role="tablist">
      {OPTS.map(({ k, l, Icon }) => (
        <Link
          key={k}
          href={hrefFor(k)}
          onClick={() => persistChoice(k)}
          className={`${styles.btn} ${active === k ? styles.active : ''}`}
          role="tab"
          aria-selected={active === k}
          scroll={false}
        >
          <Icon size={14} />
          <span>{l}</span>
        </Link>
      ))}
    </div>
  )
}
