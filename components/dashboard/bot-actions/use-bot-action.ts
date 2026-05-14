'use client'

import { useTransition, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Gedeeld patroon voor alle bot-action buttons:
 *  - POST naar een dashboard-proxy route
 *  - tijdens de request: pending=true
 *  - bij succes: router.refresh() zodat server-componenten verse data lezen
 *  - bij failure: error-string die de caller kan tonen
 *
 * Body is optioneel — voor knoppen zonder payload (approve-quote, delete).
 */
export function useBotAction(path: string) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const run = useCallback(
    (body?: Record<string, unknown>, onDone?: () => void) => {
      setError(null)
      setSuccess(null)
      startTransition(async () => {
        try {
          const res = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok || data?.ok === false) {
            setError(
              typeof data?.error === 'string'
                ? data.error
                : `Verzoek mislukt (HTTP ${res.status}).`,
            )
            return
          }
          setSuccess('Verstuurd naar Surface.')
          router.refresh()
          onDone?.()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Netwerkfout.')
        }
      })
    },
    [path, router],
  )

  return { run, pending, error, success }
}
