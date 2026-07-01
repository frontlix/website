import * as Sentry from '@sentry/nextjs'
import { scrubEvent } from './sentry.shared'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Inert zonder DSN. NEXT_PUBLIC_* wordt at build-time in de bundle geinlined.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  // BEWUST GEEN Session Replay: geen replaysSessionSampleRate /
  // replaysOnErrorSampleRate / Sentry.replayIntegration. Klant-PII mag niet
  // via replay-opnames lekken.
  beforeSend: scrubEvent,
})

// Verplicht in v9+ voor navigatie-tracing in de App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
