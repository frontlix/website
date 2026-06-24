'use client'

// Rendert de OPDRACHTBON-PDF client-side naar een Blob. @react-pdf/renderer en
// het document worden pas bij aanroep dynamisch geimporteerd, zodat ze niet in
// de dossier-bundel terechtkomen (gelijk aan render-offerte-pdf.tsx).

import type { OpdrachtbonModel } from '@/lib/dashboard/offerte/opdrachtbon-model'

export async function renderOpdrachtbonPdfBlob(model: OpdrachtbonModel): Promise<Blob> {
  const [{ pdf }, { OpdrachtbonPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./OpdrachtbonPdf'),
  ])
  return pdf(
    <OpdrachtbonPdfDocument
      model={model}
      origin={typeof window !== 'undefined' ? window.location.origin : undefined}
    />,
  ).toBlob()
}

/** Bestandsnaam-slug uit de klantnaam (gelijk aan offertePdfFileName). */
export function opdrachtbonPdfFileName(naam: string | undefined): string {
  const slug = (naam || 'klant')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `opdrachtbon-${slug || 'schoon-straatje'}.pdf`
}
