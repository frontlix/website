'use client'

// Rendert een verstuurde-offerte-PDF naar een Blob met hetzelfde client-side
// document als de concept-editor. @react-pdf/renderer en het document worden
// pas bij aanroep dynamisch geimporteerd, zodat ze niet in de dossier-bundel
// terechtkomen.

import type { SentOffertePdfModel } from '@/lib/dashboard/offerte/sent-offerte-pdf-model'

export async function renderOffertePdfBlob(model: SentOffertePdfModel): Promise<Blob> {
  const [{ pdf }, { OffertePdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./OffertePdf'),
  ])
  return pdf(
    <OffertePdfDocument
      data={model.data}
      rules={model.rules}
      totals={model.totals}
      offerteNummer={model.offerteNummer}
      geldigheidDagen={model.geldigheidDagen}
      origin={typeof window !== 'undefined' ? window.location.origin : undefined}
    />,
  ).toBlob()
}

/** Bestandsnaam-slug uit de klantnaam, gelijk aan de concept-download. */
export function offertePdfFileName(naam: string | undefined): string {
  const slug = (naam || 'klant')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `offerte-${slug || 'schoon-straatje'}.pdf`
}
