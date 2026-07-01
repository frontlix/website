import * as Sentry from '@sentry/nextjs'
import { scrubEvent } from './sentry.shared'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Volledig no-op zonder DSN: geen verzending, geen tracing, geen overhead.
  enabled: Boolean(process.env.SENTRY_DSN),
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrubEvent,
})
