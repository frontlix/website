'use client'

import Script from 'next/script'
import { useEffect, Suspense, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

function GAPageView({ gaId }: { gaId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname || typeof window.gtag !== 'function') return
    const query = searchParams?.toString()
    const path = query ? `${pathname}?${query}` : pathname
    window.gtag('config', gaId, { page_path: path })
  }, [pathname, searchParams, gaId])

  return null
}

export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    // Alleen data verzamelen op de live site, niet op localhost
    const host = window.location.hostname
    setIsLive(host === 'frontlix.com' || host === 'www.frontlix.com')
  }, [])

  if (!gaId || !isLive) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${gaId}', { send_page_view: false });
        `}
      </Script>
      <Suspense fallback={null}>
        <GAPageView gaId={gaId} />
      </Suspense>
    </>
  )
}
