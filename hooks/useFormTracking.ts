'use client'

import { useEffect, useRef, useCallback } from 'react'

type FormName = 'contact' | 'demo' | 'project' | 'hero_demo'

interface UseFormTrackingOptions {
  formName: FormName
  /** Functie die de huidige veldwaarden retourneert */
  getFieldData: () => Record<string, string>
  /** True wanneer het formulier succesvol is verstuurd */
  isSubmitted: boolean
}

interface UseFormTrackingReturn {
  /** Koppel aan onBlur van elk input-veld */
  trackBlur: () => void
  /** Roep aan na succesvolle submit om status op 'completed' te zetten */
  markCompleted: () => void
}

/**
 * Hook voor het bijhouden van gedeeltelijk ingevulde formulieren (form abandonment tracking).
 * Slaat velddata op bij blur-events en pagina-verlaten, zodat je kunt zien
 * welke bezoekers begonnen zijn maar niet hebben verstuurd.
 */
export function useFormTracking({
  formName,
  getFieldData,
  isSubmitted,
}: UseFormTrackingOptions): UseFormTrackingReturn {
  const sessionIdRef = useRef<string>('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSubmittedRef = useRef(isSubmitted)

  /* Houd isSubmitted bij in een ref zodat event listeners altijd de laatste waarde hebben */
  useEffect(() => {
    isSubmittedRef.current = isSubmitted
  }, [isSubmitted])

  /* Genereer een unieke session ID bij mount */
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID()
  }, [])

  /** Check of minstens één veld een waarde heeft */
  const hasData = useCallback((): boolean => {
    const data = getFieldData()
    return Object.values(data).some((v) => v && v.trim() !== '')
  }, [getFieldData])

  /** Stuur data naar de API */
  const sendTrackingData = useCallback(
    (status: 'active' | 'completed', useBeacon = false) => {
      if (!sessionIdRef.current) return
      if (status === 'active' && !hasData()) return

      const payload = JSON.stringify({
        sessionId: sessionIdRef.current,
        formName,
        fieldData: getFieldData(),
        status,
        pageUrl: typeof window !== 'undefined' ? window.location.pathname : '',
      })

      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        /* Beacon API: fire-and-forget, blokkeert pagina-unload niet */
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/form-tracking', blob)
      } else {
        /* Normale fetch voor blur-events */
        fetch('/api/form-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        }).catch(() => {
          /* Stille fout — tracking mag de UX niet verstoren */
        })
      }
    },
    [formName, getFieldData, hasData]
  )

  /** Debounced save bij blur — wacht 2 seconden na laatste blur */
  const trackBlur = useCallback(() => {
    if (isSubmittedRef.current) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!isSubmittedRef.current) {
        sendTrackingData('active')
      }
    }, 2000)
  }, [sendTrackingData])

  /** Markeer als completed na succesvolle submit */
  const markCompleted = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    sendTrackingData('completed')
  }, [sendTrackingData])

  /* Event listeners voor pagina-verlaten */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isSubmittedRef.current) {
        sendTrackingData('active', true)
      }
    }

    const handleBeforeUnload = () => {
      if (!isSubmittedRef.current) {
        sendTrackingData('active', true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [sendTrackingData])

  return { trackBlur, markCompleted }
}
