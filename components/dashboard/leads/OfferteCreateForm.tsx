'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { createManualOfferte } from '@/lib/dashboard/offerte-actions'
import { formatEuro } from '@/lib/dashboard/format'
import styles from './OfferteCreateForm.module.css'

type Regel = {
  // Lokale id voor React-keys; gaat niet naar de DB.
  uid: string
  omschrijving: string
  aantal: string
  eenheid: string
  stukprijs: string
}

function emptyRegel(): Regel {
  return {
    uid: Math.random().toString(36).slice(2, 9),
    omschrijving: '',
    aantal: '1',
    eenheid: '',
    stukprijs: '',
  }
}

export function OfferteCreateForm({
  leadId,
  onSaved,
  onCancel,
  existingVersie,
}: {
  leadId: string
  onSaved?: () => void
  onCancel?: () => void
  existingVersie?: number  // Bestaat al een offerte? → toon "v{n+1}" hint
}) {
  const [regels, setRegels] = useState<Regel[]>([emptyRegel()])
  const [kortingPct, setKortingPct] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const updateRegel = (uid: string, patch: Partial<Regel>) => {
    setRegels((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)))
  }
  const addRegel = () => setRegels((prev) => [...prev, emptyRegel()])
  const removeRegel = (uid: string) =>
    setRegels((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.uid !== uid)))

  // Live totaal-berekening
  const regelTotalen = regels.map((r) => {
    const aantal = parseFloat(r.aantal.replace(',', '.')) || 0
    const stukprijs = parseFloat(r.stukprijs.replace(',', '.')) || 0
    return aantal * stukprijs
  })
  const subtotaal = regelTotalen.reduce((s, t) => s + t, 0)
  const korting = Math.max(0, Math.min(100, parseFloat(kortingPct.replace(',', '.')) || 0))
  const totaal = subtotaal * (1 - korting / 100)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const payload = regels.map((r) => ({
      omschrijving: r.omschrijving.trim(),
      aantal: r.aantal.trim() === '' ? null : parseFloat(r.aantal.replace(',', '.')) || 0,
      eenheid: r.eenheid.trim() || null,
      stukprijs: parseFloat(r.stukprijs.replace(',', '.')) || 0,
    }))

    startTransition(async () => {
      const result = await createManualOfferte(leadId, payload, korting)
      if (result.ok) {
        onSaved?.()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h4 className={styles.title}>
          {existingVersie ? `Nieuwe versie (v${existingVersie + 1})` : 'Nieuwe offerte'}
        </h4>
        {onCancel && (
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Annuleren
          </button>
        )}
      </div>

      <div className={styles.regelsHead}>
        <span>Omschrijving</span>
        <span className={styles.numericHead}>Aantal</span>
        <span>Eenheid</span>
        <span className={styles.numericHead}>Stukprijs</span>
        <span className={styles.numericHead}>Totaal</span>
        <span aria-hidden />
      </div>

      {regels.map((r, idx) => (
        <div key={r.uid} className={styles.regelRow}>
          <input
            type="text"
            value={r.omschrijving}
            onChange={(e) => updateRegel(r.uid, { omschrijving: e.target.value })}
            placeholder="Bv. Bestrating reinigen"
            className={styles.input}
          />
          <input
            type="text"
            inputMode="decimal"
            value={r.aantal}
            onChange={(e) => updateRegel(r.uid, { aantal: e.target.value })}
            placeholder="1"
            className={`${styles.input} ${styles.numericInput}`}
          />
          <input
            type="text"
            value={r.eenheid}
            onChange={(e) => updateRegel(r.uid, { eenheid: e.target.value })}
            placeholder="m², stuk, uur"
            className={styles.input}
          />
          <input
            type="text"
            inputMode="decimal"
            value={r.stukprijs}
            onChange={(e) => updateRegel(r.uid, { stukprijs: e.target.value })}
            placeholder="0,00"
            className={`${styles.input} ${styles.numericInput}`}
          />
          <span className={styles.regelTotaal}>{formatEuro(regelTotalen[idx])}</span>
          <button
            type="button"
            onClick={() => removeRegel(r.uid)}
            disabled={regels.length === 1}
            className={styles.iconBtn}
            aria-label="Regel verwijderen"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button type="button" onClick={addRegel} className={styles.addBtn}>
        <Plus size={14} />
        Regel toevoegen
      </button>

      <div className={styles.totalsBlock}>
        <div className={styles.totalRow}>
          <span>Subtotaal</span>
          <span>{formatEuro(subtotaal)}</span>
        </div>
        <div className={styles.totalRow}>
          <label htmlFor="korting" className={styles.kortingLabel}>
            Korting (%)
          </label>
          <input
            id="korting"
            type="text"
            inputMode="decimal"
            value={kortingPct}
            onChange={(e) => setKortingPct(e.target.value)}
            className={`${styles.input} ${styles.kortingInput}`}
          />
        </div>
        <div className={`${styles.totalRow} ${styles.totalFinal}`}>
          <span>Totaal incl. BTW</span>
          <span className={styles.totalAmount}>{formatEuro(totaal)}</span>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="submit" disabled={pending} className={styles.saveBtn}>
          <Save size={14} />
          {pending ? 'Opslaan…' : 'Offerte opslaan'}
        </button>
      </div>
    </form>
  )
}
