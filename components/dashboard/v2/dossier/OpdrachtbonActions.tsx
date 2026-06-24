'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Printer, Download } from 'lucide-react'
import { Modal } from '@/components/dashboard/v2/ui'
import type { OpdrachtbonModel } from '@/lib/dashboard/offerte/opdrachtbon-model'
import {
  renderOpdrachtbonPdfBlob,
  opdrachtbonPdfFileName,
} from '@/components/dashboard/offerte/render-opdrachtbon-pdf'
import styles from './OffertesTab.module.css'

/** Opdrachtbon-knop in de dossier-bovenbalk: opent een voorbeeld-modal met
 *  Printen + Download. Werkt met of zonder verstuurde offerte (het model komt
 *  voorgebouwd binnen). */
export function OpdrachtbonActions({
  model,
  klantNaam,
  triggerClassName,
}: {
  model: OpdrachtbonModel
  klantNaam: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const urlRef = useRef<string | null>(null)
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const fileName = opdrachtbonPdfFileName(klantNaam)

  const view = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const blob = await renderOpdrachtbonPdfBlob(model)
      const u = URL.createObjectURL(blob)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = u
      setUrl(u)
      setOpen(true)
    } catch (e) {
      console.error('[OpdrachtbonActions] PDF-preview mislukt:', e)
      // eslint-disable-next-line no-alert
      alert('Opdrachtbon maken mislukt, probeer het opnieuw.')
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
      const blob = await renderOpdrachtbonPdfBlob(model)
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
      console.error('[OpdrachtbonActions] PDF-download mislukt:', e)
      // eslint-disable-next-line no-alert
      alert('Opdrachtbon maken mislukt, probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }, [busy, model, fileName])

  // Printen vanaf het iframe; faalt dat (embedded PDF-viewer), open dan de PDF
  // in een nieuw tabblad zodat de native viewer alsnog kan printen.
  const print = useCallback(() => {
    const frame = frameRef.current
    try {
      frame?.contentWindow?.focus()
      frame?.contentWindow?.print()
    } catch {
      if (urlRef.current) window.open(urlRef.current, '_blank', 'noopener')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={view}
        disabled={busy}
        title="Opdrachtbon printen"
      >
        <Printer size={15} strokeWidth={2.1} />
        Opdrachtbon
      </button>
      <Modal open={open} onClose={close} width={900} label="Opdrachtbon">
        <div className={styles.pdfModalHead}>Opdrachtbon {model.bonnummer}</div>
        {url ? (
          <iframe ref={frameRef} src={url} className={styles.pdfFrame} title="Opdrachtbon-PDF" />
        ) : null}
        <div className={styles.pdfModalFoot}>
          <button type="button" className={styles.dlBtn} onClick={print} disabled={busy}>
            <Printer size={16} strokeWidth={2} /> Printen
          </button>
          <button type="button" className={styles.dlBtn} onClick={download} disabled={busy}>
            <Download size={16} strokeWidth={2} /> Download PDF
          </button>
        </div>
      </Modal>
    </>
  )
}
