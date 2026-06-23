'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, Download } from 'lucide-react'
import { Modal } from '@/components/dashboard/v2/ui'
import { HEROPGEMAAKT_NOTE, type SentOffertePdfModel } from '@/lib/dashboard/offerte/sent-offerte-pdf-model'
import { offertePdfFileName, base64ToPdfBlob } from '@/components/dashboard/offerte/render-offerte-pdf'
import { renderSentOffertePdf } from '@/lib/dashboard/offerte/sent-offerte-pdf-action'
import styles from './OffertesTab.module.css'

/**
 * Inzien (PDF-voorbeeld in een Modal) + download voor een verstuurde versie.
 * De PDF wordt op de server gerenderd met dezelfde Puppeteer-template als de
 * verzonden mail-PDF (inclusief alle keurmerken), dus de opmaak loopt nooit
 * achter. `model` wordt nog gebruikt voor de bestandsnaam + het heropmaak-label.
 */
export function SentOfferteActions({
  model,
  titel,
  leadId,
  versie,
}: {
  model: SentOffertePdfModel
  titel: string
  leadId: string
  versie: number
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const urlRef = useRef<string | null>(null)
  const fileName = offertePdfFileName(model.data.naam)

  const fetchBlob = useCallback(async (): Promise<Blob> => {
    const res = await renderSentOffertePdf(leadId, versie)
    if ('error' in res) throw new Error(res.error)
    return base64ToPdfBlob(res.base64)
  }, [leadId, versie])

  const view = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const blob = await fetchBlob()
      const u = URL.createObjectURL(blob)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = u
      setUrl(u)
      setOpen(true)
    } catch (e) {
      console.error('[SentOfferteActions] PDF-preview mislukt:', e)
      // eslint-disable-next-line no-alert
      alert('PDF maken mislukt, probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }, [busy, fetchBlob])

  const close = useCallback(() => {
    setOpen(false)
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setUrl(null)
  }, [])

  const download = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const blob = await fetchBlob()
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u
      a.download = fileName
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(u), 5000)
    } catch (e) {
      console.error('[SentOfferteActions] PDF-download mislukt:', e)
      // eslint-disable-next-line no-alert
      alert('PDF maken mislukt, probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }, [busy, fetchBlob, fileName])

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  return (
    <>
      <div className={styles.rowActions}>
        {model.reconstructed ? (
          <span className={styles.heropTag} title={HEROPGEMAAKT_NOTE}>heropgemaakt</span>
        ) : null}
        <button type="button" className={styles.actBtn} onClick={view} disabled={busy} aria-label="Offerte inzien" title="Inzien">
          <Eye size={16} strokeWidth={2} />
        </button>
        <button type="button" className={styles.actBtn} onClick={download} disabled={busy} aria-label="Offerte downloaden" title="Download">
          <Download size={16} strokeWidth={2} />
        </button>
      </div>
      <Modal open={open} onClose={close} width={900} label={`Offerte ${titel}`}>
        <div className={styles.pdfModalHead}>{titel}</div>
        {model.reconstructed ? <div className={styles.heropNote}>{HEROPGEMAAKT_NOTE}</div> : null}
        {url ? <iframe src={url} className={styles.pdfFrame} title="Offerte-PDF" /> : null}
        <div className={styles.pdfModalFoot}>
          <button type="button" className={styles.dlBtn} onClick={download} disabled={busy}>
            <Download size={16} strokeWidth={2} /> Download PDF
          </button>
        </div>
      </Modal>
    </>
  )
}
