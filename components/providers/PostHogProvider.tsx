'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Tracks page views on client-side navigation (Next.js App Router SPA)
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams?.toString()) {
        url = url + '?' + searchParams.toString()
      }
      posthog.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams])

  return null
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return

    // Alleen data verzamelen op de live site, niet op localhost
    const isLive = window.location.hostname === 'frontlix.com' || window.location.hostname === 'www.frontlix.com'
    if (!isLive) return

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',

      // We handle pageviews manually for SPA navigation
      capture_pageview: false,
      // Track when users leave pages (enables time-on-page calculation)
      capture_pageleave: true,

      // Autocapture: clicks, form submissions, scroll depth, etc. (feeds heatmaps & funnels)
      autocapture: true,

      // Session recording with privacy-safe defaults
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: true,
        },
      },

      // Debug mode in development
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug()
      },
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      {/* Suspense boundary needed because useSearchParams() requires it in App Router */}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
