import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getLeadsList } from '@/lib/dashboard/lead-queries'
import { parseLeadsFilters } from '@/lib/dashboard/lead-filters'
import {
  formatEuro,
  formatDateTimeNL,
  dashboardStatusLabel,
  gesprekFaseLabel,
} from '@/lib/dashboard/format'

const CSV_HEADERS = [
  'lead_id',
  'naam',
  'telefoon',
  'hoofdcategorie',
  'm2',
  'totaal_prijs',
  'bot_status',
  'gesprek_fase',
  'dashboard_status',
  'aangemaakt',
  'bijgewerkt',
] as const

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(request: Request) {
  // Auth check — alleen approved users mogen exporteren.
  await requireApprovedUser()

  const url = new URL(request.url)
  const filters = parseLeadsFilters(url.searchParams)
  const leads = await getLeadsList(filters)

  const rows: string[] = [CSV_HEADERS.join(',')]
  for (const lead of leads) {
    rows.push(
      [
        csvEscape(lead.lead_id),
        csvEscape(lead.naam),
        csvEscape(lead.telefoon),
        csvEscape(lead.hoofdcategorie),
        csvEscape(lead.m2),
        csvEscape(
          lead.totaal_prijs !== null ? formatEuro(lead.totaal_prijs) : ''
        ),
        csvEscape(lead.status),
        csvEscape(gesprekFaseLabel(lead.gesprek_fase)),
        csvEscape(dashboardStatusLabel(lead.dashboard_status)),
        csvEscape(formatDateTimeNL(lead.aangemaakt)),
        csvEscape(formatDateTimeNL(lead.bijgewerkt)),
      ].join(',')
    )
  }

  const csv = rows.join('\n')
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
