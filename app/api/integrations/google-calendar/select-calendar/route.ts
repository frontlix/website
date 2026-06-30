// app/api/integrations/google-calendar/select-calendar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { updateCalendarId } from '@/lib/dashboard/calendar-connection-queries'

export async function POST(request: NextRequest) {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  if (!profile.tenant_id) {
    return NextResponse.json({ error: 'Geen bedrijf gekoppeld' }, { status: 403 })
  }
  const tenantId = profile.tenant_id

  let calendarId: unknown
  try {
    const body = (await request.json()) as { calendarId?: unknown }
    calendarId = body.calendarId
  } catch {
    return NextResponse.json({ error: 'Ongeldige body' }, { status: 400 })
  }

  if (typeof calendarId !== 'string' || calendarId.trim() === '') {
    return NextResponse.json({ error: 'calendarId is verplicht' }, { status: 400 })
  }

  try {
    await updateCalendarId(tenantId, calendarId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[gcal-select-calendar]', e)
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
  }
}
