import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { naam, email, onderwerp, bericht } = body

    if (!naam || !email || !onderwerp || !bericht) {
      return NextResponse.json(
        { success: false, message: 'Alle velden zijn verplicht.' },
        { status: 400 }
      )
    }

    // Mail solution is not yet configured
    return NextResponse.json(
      {
        success: false,
        message: 'Mailoplossing nog niet geconfigureerd',
      },
      { status: 501 }
    )
  } catch {
    return NextResponse.json(
      { success: false, message: 'Er is een fout opgetreden.' },
      { status: 500 }
    )
  }
}
