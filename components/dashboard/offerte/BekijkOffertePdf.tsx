'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Download } from 'lucide-react'
import { Modal } from '@/components/dashboard/v2/ui'
import type { SentOffertePdfModel } from '@/lib/dashboard/offerte/sent-offerte-pdf-model'
import { renderOffertePdfBlob, offertePdfFileName } from '@/components/dashboard/offerte/render-offerte-pdf'
import styles from './BekijkOffertePdf.module.css'

/** Knop "Bekijk volledige offerte" met een PDF-voorbeeld in een modal. Rendert
 *  client-side uit een (live opgebouwd) SentOffertePdfModel, dus werkt ook zonder
 *  opgeslagen snapshot. Gedeeld tussen het desktop- en mobiele goedkeuringsblok. */
export function BekijkOffertePdf({
  model,
  className,
  label = 'Bekijk volledige offerte',
}: {
  model: SentOffertePdfModel
  className?: string
  label?: string
}) {
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
      console.error('[BekijkOffertePdf] PDF-preview mislukt:', e)
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
      console.error('[BekijkOffertePdf] PDF-download mislukt:', e)
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
      <button type="button" className={className ?? styles.link} onClick={view} disabled={busy}>
        <FileText size={15} strokeWidth={2.1} />
        {busy ? 'Bezig…' : label}
      </button>
      <Modal open={open} onClose={close} width={900} label="Volledige offerte">
        <div className={styles.head}>Volledige offerte</div>
        {url ? <iframe src={url} className={styles.frame} title="Offerte-PDF" /> : null}
        <div className={styles.foot}>
          <button type="button" className={styles.dlBtn} onClick={download} disabled={busy}>
            <Download size={16} strokeWidth={2} /> Download PDF
          </button>
        </div>
      </Modal>
    </>
  )
}
