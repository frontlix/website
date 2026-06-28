'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, Download } from 'lucide-react'
import { Modal } from '@/components/dashboard/v2/ui'
import type { SentOffertePdfModel } from '@/lib/dashboard/offerte/sent-offerte-pdf-model'
import { renderOffertePdfBlob, offertePdfFileName } from '@/components/dashboard/offerte/render-offerte-pdf'
import styles from './OffertesTab.module.css'

/**
 * Inzien (PDF-voorbeeld in een Modal) + download voor een verstuurde versie.
 *
 * Bron-PDF: bij voorkeur de ÉCHT opgeslagen PDF (`pdfUrl` = exact het bestand
 * dat naar de klant gemaild is, publieke storage-URL). Dat garandeert dat de
 * preview/download identiek is aan de mail (opmerkingen op de juiste plek,
 * juiste totalen). Alleen als er geen pdfUrl is (oude rij zonder bestand)
 * vallen we terug op de client-side reconstructie via `model`.
 */
export function SentOfferteActions({
  model,
  pdfUrl,
  titel,
}: {
  model?: SentOffertePdfModel | null
  pdfUrl?: string | null
  titel: string
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Alleen blob-URLs die we zélf maken (de reconstructie) moeten we weer
  // revoken; een directe pdfUrl niet.
  const blobRef = useRef<string | null>(null)
  const fileName = offertePdfFileName(model?.data.naam ?? titel)

  const view = useCallback(async () => {
    if (busy) return
    // Échte opgeslagen PDF: direct in de iframe laden, geen reconstructie nodig.
    if (pdfUrl) {
      setUrl(pdfUrl)
      setOpen(true)
      return
    }
    if (!model) return
    setBusy(true)
    try {
      const blob = await renderOffertePdfBlob(model)
      const u = URL.createObjectURL(blob)
      if (blobRef.current) URL.revokeObjectURL(blobRef.current)
      blobRef.current = u
      setUrl(u)
      setOpen(true)
    } catch (e) {
      console.error('[SentOfferteActions] PDF-preview mislukt:', e)
      // eslint-disable-next-line no-alert
      alert('PDF maken mislukt, probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }, [busy, model, pdfUrl])

  const close = useCallback(() => {
    setOpen(false)
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current)
      blobRef.current = null
    }
    setUrl(null)
  }, [])

  const download = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      // Bron-blob: de opgeslagen PDF ophalen (publieke URL) of, als fallback,
      // de reconstructie renderen.
      let blob: Blob
      if (pdfUrl) {
        const res = await fetch(pdfUrl)
        if (!res.ok) throw new Error(`PDF ophalen faalde (${res.status})`)
        blob = await res.blob()
      } else if (model) {
        blob = await renderOffertePdfBlob(model)
      } else {
        return
      }
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
      // Fallback: open de opgeslagen PDF in een nieuw tabblad zodat de gebruiker
      // 'm daar alsnog kan opslaan (bv. als een cross-origin fetch faalt).
      if (pdfUrl) {
        window.open(pdfUrl, '_blank', 'noopener')
      } else {
        // eslint-disable-next-line no-alert
        alert('PDF maken mislukt, probeer het opnieuw.')
      }
    } finally {
      setBusy(false)
    }
  }, [busy, model, pdfUrl, fileName])

  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current)
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
        <div className={styles.pdfModalBody}>
          <div className={styles.pdfModalHead}>{titel}</div>
          {url ? <iframe src={url} className={styles.pdfFrame} title="Offerte-PDF" /> : null}
          <div className={styles.pdfModalFoot}>
            <button type="button" className={styles.dlBtn} onClick={download} disabled={busy}>
              <Download size={16} strokeWidth={2} /> Download PDF
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
