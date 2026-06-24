'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import type { OpdrachtbonModel } from '@/lib/dashboard/offerte/opdrachtbon-model'
import {
  renderOpdrachtbonPdfBlob,
  opdrachtbonPdfFileName,
} from '@/components/dashboard/offerte/render-opdrachtbon-pdf'
import { deliverPdfBlob } from '@/components/dashboard/offerte/pdf-download'
import styles from './MobileOpdrachtbonActions.module.css'

/** Mobiele opdrachtbon-knop: rendert de opdrachtbon-PDF (offerte zonder prijzen)
 *  en levert 'm af via het native deel/bewaar-vel (deliverPdfBlob), zodat de
 *  eigenaar 'm kan bewaren, mailen of printen. Werkt met of zonder verstuurde
 *  offerte; het model komt voorgebouwd binnen. */
export function MobileOpdrachtbonActions({
  model,
  klantNaam,
}: {
  model: OpdrachtbonModel
  klantNaam: string
}) {
  const [busy, setBusy] = useState(false)

  const open = async () => {
    if (busy) return
    setBusy(true)
    try {
      const blob = await renderOpdrachtbonPdfBlob(model)
      await deliverPdfBlob(blob, opdrachtbonPdfFileName(klantNaam))
    } catch (e) {
      console.error('[MobileOpdrachtbonActions] opdrachtbon mislukt:', e)
      // eslint-disable-next-line no-alert
      alert('Opdrachtbon maken mislukt, probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.btn} onClick={open} disabled={busy}>
        <Printer size={16} aria-hidden="true" />
        {busy ? 'Bezig…' : 'Opdrachtbon (PDF)'}
      </button>
      <p className={styles.hint}>Offerte zonder prijzen, om uit te printen voor je collega&apos;s.</p>
    </div>
  )
}
