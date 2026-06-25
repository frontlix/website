'use client'

import { useState, useRef, useEffect } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import styles from './DossNotities.module.css'

/** Eén team-notitie zoals het mobiele dossier 'm toont. */
export type DossNote = {
  id: string
  wie: string
  tijd: string
  tekst: string
  /** Vinkje: toon op de afspraak-print. Default true. */
  opAfspraak: boolean
  /** Vinkje: toon op de opdrachtbon. Default true. */
  opOpdrachtbon: boolean
}

interface DossNotitiesProps {
  notities: DossNote[]
  onAdd: (tekst: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, tekst: string) => void
  /** Zet de vinkjes (afspraak-print / opdrachtbon) van een notitie. */
  onSetTargets: (id: string, targets: { opAfspraak: boolean; opOpdrachtbon: boolean }) => void
}

/**
 * Mobiele Notities-tab: invoerveld + "Toevoegen" en de lijst team-notities
 * (nieuwste bovenaan). Elke notitie is inline te bewerken of te verwijderen.
 * Functioneel gelijk aan de desktop NotitiesTab, maar mobiel gestyled
 * (--color-* tokens, geen muis-hover-afhankelijkheid).
 */
export function DossNotities({ notities, onAdd, onDelete, onUpdate, onSetTargets }: DossNotitiesProps) {
  const [tekst, setTekst] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editTekst, setEditTekst] = useState('')
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editId) editRef.current?.focus()
  }, [editId])

  const voegToe = () => {
    if (!tekst.trim()) return
    onAdd(tekst.trim())
    setTekst('')
  }

  const startBewerken = (n: DossNote) => {
    setEditId(n.id)
    setEditTekst(n.tekst)
  }

  const annuleer = () => {
    setEditId(null)
    setEditTekst('')
  }

  const bewaar = () => {
    const trimmed = editTekst.trim()
    if (!editId || !trimmed) return
    onUpdate(editId, trimmed)
    annuleer()
  }

  const verwijder = (id: string) => {
    if (window.confirm('Deze notitie verwijderen?')) onDelete(id)
  }

  return (
    <div className={styles.root}>
      <div className={styles.inputRow}>
        <textarea
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Typ een notitie, komt standaard op de afspraak en opdrachtbon…"
          className={styles.input}
          rows={2}
        />
        <button type="button" className={styles.addBtn} onClick={voegToe} disabled={!tekst.trim()}>
          Toevoegen
        </button>
      </div>

      {notities.length === 0 ? (
        <p className={styles.empty}>Nog geen notities. Voeg er hierboven een toe.</p>
      ) : (
        <div className={styles.list}>
          {notities.map((n) => (
            <div key={n.id} className={styles.note}>
              {editId === n.id ? (
                <div className={styles.editRow}>
                  <textarea
                    ref={editRef}
                    value={editTekst}
                    onChange={(e) => setEditTekst(e.target.value)}
                    className={styles.editInput}
                    rows={2}
                  />
                  <div className={styles.editActions}>
                    <button type="button" className={styles.iconBtn} onClick={bewaar} aria-label="Opslaan">
                      <Check size={16} strokeWidth={2.4} />
                    </button>
                    <button type="button" className={styles.iconBtn} onClick={annuleer} aria-label="Annuleren">
                      <X size={16} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.noteText}>{n.tekst}</div>
                  <div className={styles.noteFoot}>
                    <span className={styles.noteMeta}>
                      {n.wie} · {n.tijd}
                    </span>
                    <span className={styles.noteActions}>
                      <button type="button" className={styles.iconBtn} onClick={() => startBewerken(n)} aria-label="Notitie bewerken">
                        <Pencil size={15} strokeWidth={2.2} />
                      </button>
                      <button type="button" className={styles.iconBtn} onClick={() => verwijder(n.id)} aria-label="Notitie verwijderen">
                        <Trash2 size={15} strokeWidth={2.2} />
                      </button>
                    </span>
                  </div>
                  <div className={styles.targets}>
                    <span className={styles.targetsLabel}>Tonen op:</span>
                    <label className={styles.targetBox}>
                      <input
                        type="checkbox"
                        checked={n.opAfspraak}
                        onChange={(e) =>
                          onSetTargets(n.id, { opAfspraak: e.target.checked, opOpdrachtbon: n.opOpdrachtbon })
                        }
                      />
                      Afspraak
                    </label>
                    <label className={styles.targetBox}>
                      <input
                        type="checkbox"
                        checked={n.opOpdrachtbon}
                        onChange={(e) =>
                          onSetTargets(n.id, { opAfspraak: n.opAfspraak, opOpdrachtbon: e.target.checked })
                        }
                      />
                      Opdrachtbon
                    </label>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
