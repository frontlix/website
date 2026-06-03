import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import {
  generateExport,
  EXPORT_TYPES,
  EXPORT_FORMATS,
  EXPORT_PERIODS,
  type ExportType,
  type ExportPeriod,
} from '@/lib/dashboard/export/export-service'
import type { ExportFormat } from '@/lib/dashboard/export/export-builders'

// puppeteer (PDF) + exceljs vereisen de Node-runtime, geen edge.
export const runtime = 'nodejs'
// Export = live DB-query → nooit cachen.
export const dynamic = 'force-dynamic'

/**
 * Generieke data-export. Query-params:
 *  - type:   leads | offertes
 *  - format: csv | xlsx | pdf
 *  - period: 7d | 30d | 90d | all   (ondergrens op `aangemaakt`)
 *
 * Vervangt de oude /export/leads-csv route (die alleen leads+csv deed en
 * de periode negeerde).
 */
export async function GET(request: Request) {
  // Auth, alleen approved users mogen exporteren (redirect't anders).
  await requireApprovedUser()

  const url = new URL(request.url)
  const type = url.searchParams.get('type') ?? 'leads'
  const format = url.searchParams.get('format') ?? 'csv'
  const period = url.searchParams.get('period') ?? '30d'

  if (
    !EXPORT_TYPES.has(type) ||
    !EXPORT_FORMATS.has(format) ||
    !EXPORT_PERIODS.has(period)
  ) {
    return new Response('Ongeldige export-parameters', { status: 400 })
  }

  try {
    const { body, contentType, filename } = await generateExport(
      type as ExportType,
      format as ExportFormat,
      period as ExportPeriod,
    )
    // De TS DOM-lib typeert BodyInit zonder Buffer/Uint8Array, maar undici's
    // Response (Node-runtime) accepteert een Buffer prima. Gedocumenteerde
    // cast om die lib-mismatch te overbruggen.
    return new Response(body as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[export route] failed:', err)
    return new Response('Export mislukt', { status: 500 })
  }
}
