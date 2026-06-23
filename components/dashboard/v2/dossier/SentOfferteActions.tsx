'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, Download } from 'lucide-react'
import { Modal } from '@/components/dashboard/v2/ui'
import type { SentOffertePdfModel } from '@/lib/dashboard/offerte/sent-offerte-pdf-model'
import { renderOffertePdfBlob, offertePdfFileName } from '@/components/dashboard/offerte/render-offerte-pdf'
import styles from './OffertesTab.module.css'

/** Inzien (PDF-voorbeeld in een Modal) + download voor een verstuurde versie. */
export function SentOfferteActions({ model, titel }: { model: SentOffertePdfModel; titel: string }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const urlRef = useRef<string | null>(null)
  const fileName = offertePdfFileName(model.data.naam)

  const view = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const blob = await renderOffertePdfBlob(model)
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
  }, [busy, model])

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
      const blob = await renderOffertePdfBlob(model)
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
  }, [busy, model, fileName])

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  return (
    <>
      <div className={styles.rowActions}>
        <button type="button" className={styles.actBtn} onClick={view} disabled={busy} aria-label="Offerte inzien" title="Inzien">
          <Eye size={16} strokeWidth={2} />
        </button>
        <button type="button" className={styles.actBtn} onClick={download} disabled={busy} aria-label="Offerte downloaden" title="Download">
          <Download size={16} strokeWidth={2} />
        </button>
      </div>
      <Modal open={open} onClose={close} width={900} label={`Offerte ${titel}`}>
        <div className={styles.pdfModalHead}>{titel}</div>
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
