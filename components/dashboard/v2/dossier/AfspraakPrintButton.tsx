'use client'

import { useCallback, useState } from 'react'
import { Printer } from 'lucide-react'
import type { AfspraakInfo } from '@/lib/dashboard/afspraak-info'
import {
  renderAfspraakPdfBlob,
  afspraakPdfFileName,
} from '@/components/dashboard/offerte/render-afspraak-pdf'

/**
 * Uitprint-knop voor een afspraak. Genereert client-side een nette A4-PDF en
 * opent direct de browser-printdialoog via een verborgen iframe, dus zonder
 * naar een nieuw tabblad te navigeren. Lukt printen niet (bv. een browser die
 * een blob-PDF niet in een iframe wil printen), dan valt 'ie terug op een
 * download van dezelfde PDF.
 */
export function AfspraakPrintButton({
  info,
  triggerClassName,
  label = 'Afspraak uitprinten',
}: {
  info: AfspraakInfo
  triggerClassName?: string
  /** Knoptekst (modal: "Afspraak uitprinten"; tab: "Uitprinten"). */
  label?: string
}) {
  const [busy, setBusy] = useState(false)

  const download = useCallback((blob: Blob) => {
    const u = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = u
    a.download = afspraakPdfFileName(info.klantNaam)
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(u), 5000)
  }, [info.klantNaam])

  const print = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const blob = await renderAfspraakPdfBlob(info)
      const url = URL.createObjectURL(blob)

      // Verborgen iframe met de PDF; bij load triggeren we de printdialoog.
      const frame = document.createElement('iframe')
      frame.style.position = 'fixed'
      frame.style.right = '0'
      frame.style.bottom = '0'
      frame.style.width = '0'
      frame.style.height = '0'
      frame.style.border = '0'
      frame.setAttribute('aria-hidden', 'true')

      let cleaned = false
      const cleanup = () => {
        if (cleaned) return
        cleaned = true
        URL.revokeObjectURL(url)
        if (frame.parentNode) frame.parentNode.removeChild(frame)
      }

      frame.onload = () => {
        try {
          const win = frame.contentWindow
          if (!win) throw new Error('Geen iframe-venster')
          win.focus()
          win.onafterprint = cleanup
          win.print()
          // Vangnet: ruim het iframe later op als afterprint niet vuurt.
          setTimeout(cleanup, 120000)
        } catch {
          // Printen via iframe lukte niet: val terug op download.
          cleanup()
          download(blob)
        }
      }

      frame.src = url
      document.body.appendChild(frame)
    } catch (e) {
      console.error('[AfspraakPrintButton] PDF maken mislukt:', e)
      // eslint-disable-next-line no-alert
      alert('Afspraak uitprinten mislukt, probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }, [busy, info, download])

  return (
    <button
      type="button"
      className={triggerClassName}
      onClick={print}
      disabled={busy}
      title="Afspraak uitprinten (PDF)"
    >
      <Printer size={15} strokeWidth={2.2} />
      {busy ? 'Bezig…' : label}
    </button>
  )
}
