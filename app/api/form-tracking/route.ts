import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    /* Beacon API stuurt als text/plain, normale fetch als application/json */
    const contentType = request.headers.get('content-type') || ''
    let body: Record<string, unknown>

    if (contentType.includes('text/plain')) {
      const text = await request.text()
      body = JSON.parse(text)
    } else {
      body = await request.json()
    }

    const { sessionId, formName, fieldData, status, pageUrl } = body as {
      sessionId: string
      formName: string
      fieldData: Record<string, string>
      status: 'active' | 'completed'
      pageUrl: string
    }

    if (!sessionId || !formName) {
      return NextResponse.json(
        { success: false, message: 'sessionId en formName zijn verplicht.' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    /* Upsert: update bestaande row op session_id, of insert nieuwe */
    const { error: dbError } = await supabase
      .from('form_abandonment')
      .upsert(
        {
          session_id: sessionId,
          form_name: formName,
          field_data: fieldData || {},
          status: status || 'active',
          page_url: pageUrl || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      )

    if (dbError) {
      console.error('Form tracking upsert error:', dbError)
      return NextResponse.json(
        { success: false, message: 'Opslaan mislukt.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Form tracking error:', err)
    return NextResponse.json(
      { success: false, message: 'Er is een fout opgetreden.' },
      { status: 500 }
    )
  }
}
