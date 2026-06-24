'use client'

// Rendert de AFSPRAAK-PDF client-side naar een Blob. @react-pdf/renderer en het
// document worden pas bij aanroep dynamisch geimporteerd, zodat ze niet in de
// dossier-/agenda-bundel terechtkomen (gelijk aan render-opdrachtbon-pdf.tsx).

import type { AfspraakInfo } from '@/lib/dashboard/afspraak-info'

export async function renderAfspraakPdfBlob(info: AfspraakInfo): Promise<Blob> {
  const [{ pdf }, { AfspraakPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./AfspraakPdf'),
  ])
  return pdf(
    <AfspraakPdfDocument
      info={info}
      origin={typeof window !== 'undefined' ? window.location.origin : undefined}
    />,
  ).toBlob()
}

/** Bestandsnaam-slug uit de klantnaam (gelijk aan opdrachtbonPdfFileName). */
export function afspraakPdfFileName(naam: string | undefined): string {
  const slug = (naam || 'klant')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `afspraak-${slug || 'schoon-straatje'}.pdf`
}
